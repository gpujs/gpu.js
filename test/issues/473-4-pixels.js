const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #473 - only 4 pixels are shown');

function testOnly4PixelsAreShownRGBStaticOutput(mode) {
  const gpu = new GPU({ mode });
  const render = gpu.createKernel(
    function() {
      this.color(1, 1, 1);
    },
    {
      output: [20, 20],
      graphical: true,
    }
  );

  render();

  const pixels = render.getPixels();
  assert.equal(pixels.length, 20 * 20 * 4);
  assert.equal(pixels.filter(v => v === 255).length, 20 * 20 * 4);
  gpu.destroy();
}

test('RGB static output auto', () => {
  testOnly4PixelsAreShownRGBStaticOutput();
});

test('RGB static output gpu', () => {
  testOnly4PixelsAreShownRGBStaticOutput('gpu');
});

(GPU.isWebGLSupported ? test : skip)('RGB static output webgl', () => {
  testOnly4PixelsAreShownRGBStaticOutput('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('RGB static output webgl2', () => {
  testOnly4PixelsAreShownRGBStaticOutput('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('RGB static output headlessgl', () => {
  testOnly4PixelsAreShownRGBStaticOutput('headlessgl');
});

(GPU.isCanvasSupported ? test : skip)('RGB static output cpu', () => {
  testOnly4PixelsAreShownRGBStaticOutput('cpu');
});

function testOnly4PixelsAreShownRGBAStaticOutput(mode) {
  const gpu = new GPU({ mode });
  const render = gpu.createKernel(
    function() {
      this.color(1, 1, 1, 1);
    },
    {
      output: [20, 20],
      graphical: true,
    }
  );

  render();

  const pixels = render.getPixels();
  assert.equal(pixels.length, 20 * 20 * 4);
  assert.equal(pixels.filter(v => v === 255).length, 20 * 20 * 4);
  gpu.destroy();
}

test('RGBA static output auto', () => {
  testOnly4PixelsAreShownRGBAStaticOutput();
});

test('RGBA static output gpu', () => {
  testOnly4PixelsAreShownRGBAStaticOutput('gpu');
});

(GPU.isWebGLSupported ? test : skip)('RGBA static output webgl', () => {
  testOnly4PixelsAreShownRGBAStaticOutput('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('RGBA static output webgl2', () => {
  testOnly4PixelsAreShownRGBAStaticOutput('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('RGBA static output headlessgl', () => {
  testOnly4PixelsAreShownRGBAStaticOutput('headlessgl');
});

(GPU.isCanvasSupported ? test : skip)('RGBA static output cpu', () => {
  testOnly4PixelsAreShownRGBAStaticOutput('cpu');
});

function testOnly4PixelsAreShownRGBDynamicOutput(mode) {
  const gpu = new GPU({ mode });
  const render = gpu.createKernel(
    function() {
      this.color(1, 1, 1);
    },
    {
      output: [20, 20],
      graphical: true,
      dynamicOutput: true,
    }
  );

  render();

  const pixels = render.getPixels();
  assert.equal(pixels.length, 20 * 20 * 4);
  assert.equal(pixels.filter(v => v === 255).length, 20 * 20 * 4);

  render.setOutput([10, 10]);
  render();

  const pixels2 = render.getPixels();
  assert.equal(pixels2.length, 10 * 10 * 4);
  assert.equal(pixels2.filter(v => v === 255).length, 10 * 10 * 4);
  gpu.destroy();
}

test('rgb dynamic output auto', () => {
  testOnly4PixelsAreShownRGBDynamicOutput();
});

test('rgb dynamic output gpu', () => {
  testOnly4PixelsAreShownRGBDynamicOutput('gpu');
});

(GPU.isWebGLSupported ? test : skip)('rgb dynamic output webgl', () => {
  testOnly4PixelsAreShownRGBDynamicOutput('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('rgb dynamic output webgl2', () => {
  testOnly4PixelsAreShownRGBDynamicOutput('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('rgb dynamic output headlessgl', () => {
  testOnly4PixelsAreShownRGBDynamicOutput('headlessgl');
});

(GPU.isCanvasSupported ? test : skip)('rgb dynamic output cpu', () => {
  testOnly4PixelsAreShownRGBDynamicOutput('cpu');
});

function testOnly4PixelsAreShownRGBADynamicOutput(mode) {
  const gpu = new GPU({ mode });
  const render = gpu.createKernel(
    function() {
      this.color(1, 1, 1, 1);
    },
    {
      output: [20, 20],
      graphical: true,
      dynamicOutput: true,
    }
  );

  render();

  const pixels = render.getPixels();
  assert.equal(pixels.length, 20 * 20 * 4);
  assert.equal(pixels.filter(v => v === 255).length, 20 * 20 * 4);

  render.setOutput([10, 10]);
  render();

  const pixels2 = render.getPixels();
  assert.equal(pixels2.length, 10 * 10 * 4);
  assert.equal(pixels2.filter(v => v === 255).length, 10 * 10 * 4);
  gpu.destroy();
}

test('rgba dynamic output auto', () => {
  testOnly4PixelsAreShownRGBADynamicOutput();
});

test('rgba dynamic output gpu', () => {
  testOnly4PixelsAreShownRGBADynamicOutput('gpu');
});

(GPU.isWebGLSupported ? test : skip)('rgba dynamic output webgl', () => {
  testOnly4PixelsAreShownRGBADynamicOutput('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('rgba dynamic output webgl2', () => {
  testOnly4PixelsAreShownRGBADynamicOutput('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('rgba dynamic output headlessgl', () => {
  testOnly4PixelsAreShownRGBADynamicOutput('headlessgl');
});

(GPU.isCanvasSupported ? test : skip)('rgba dynamic output cpu', () => {
  testOnly4PixelsAreShownRGBADynamicOutput('cpu');
});
