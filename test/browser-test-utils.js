function imageToArray(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  document.body.appendChild(canvas);
  document.body.appendChild(image);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, image.width, image.height);
  document.body.removeChild(canvas);
  document.body.removeChild(image);
  let i = 0;
  const result = [];
  for (let y = 0; y < image.height; y++) {
    const row = [];
    result.unshift(row);
    for (let x = 0; x < image.width; x++) {
      const pixel = new Float32Array([
        data[i++],
        data[i++],
        data[i++],
        data[i++],
      ]);
      row.push(pixel);
    }
  }
  return result;
}

function loadImage(image) {
  return new Promise((resolve) => {
    if (typeof image === 'string') {
      const src = image;
      image = new Image();
      image.src = src;
    }
    image.onload = () => {
      resolve(image);
    };
  });
}

function loadImages(images) {
  return Promise.all(images.map(image => loadImage(image)));
}

// A video can only be sampled once it has decoded a frame for the position we
// want. Waiting a fixed number of milliseconds and hoping is what these tests
// used to do, and it is why they failed intermittently.
function loadVideo(src, currentTime) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.onerror = () => {
      // Say which kind of failure it was: a codec the browser will not play is
      // a fact about the browser, a network error is a fact about the run.
      const code = video.error ? video.error.code : 0;
      const why = code === 4 ? 'format not supported' :
        code === 2 ? 'network error' :
        code === 3 ? 'decode error' : `media error ${code}`;
      const error = new Error(`could not load ${src}: ${why}`);
      error.mediaErrorCode = code;
      reject(error);
    };
    if (currentTime) {
      // seeking needs the duration, which arrives with the metadata; `seeked`
      // then means readyState is back to at least HAVE_CURRENT_DATA
      video.onloadedmetadata = () => { video.currentTime = currentTime; };
      video.onseeked = () => resolve(video);
    } else {
      video.onloadeddata = () => resolve(video);
    }
    video.src = src;
  });
}

// A browser that will not decode the format has nothing to prove here, so let
// that pass; anything else -- a network error, a decode error -- is real and
// should fail. canPlayType cannot be used to decide this ahead of time: Safari
// answers "maybe" for video/webm and then fails to decode it, so the media
// error is the only honest signal.
function assertVideoFailureIsUnsupportedFormat(assert, error) {
  const MEDIA_ERR_SRC_NOT_SUPPORTED = 4;
  assert.ok(error.mediaErrorCode === MEDIA_ERR_SRC_NOT_SUPPORTED, error.message);
}

function check2DImage(result, expected, channel) {
  const height = result.length;
  const width = result[0].length;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (result[y][x] !== expected[y][x][channel]) {
        throw new Error(`result[${y}][${x}] value does not match expected value of ${expected[y][x][channel]}`);
      }
    }
  }
  return true;
}

function greenCanvas(mode, width, height) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    this.color(0, 1, 0, 1);
  }, { output: [width, height], graphical: true });
  kernel();
  const canvas = kernel.canvas;
  gpu.destroy();
  return canvas;
}

const _exports = {
  greenCanvas,
  imageToArray,
  loadImage,
  loadImages,
  loadVideo,
  assertVideoFailureIsUnsupportedFormat,
  check2DImage,
};

if (typeof window !== 'undefined') {
  window.browserTestUtils = _exports;
} else {
  module.exports = _exports;
}

