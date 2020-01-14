const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('issue #560 - minification madness');

function testMinificationMadness(mode, canvas) {
  const gpu = new GPU({ mode, canvas });
  const kernel = gpu.createKernel(function (t, e, i, n, r) {
    for (
      var o = this.constants.maxIter,
        a = this.constants.canvasWidth,
        s = this.constants.canvasHeight,
        l = i + (n - i) * (this.thread.y / s),
        c = t + (e - t) * (this.thread.x / a),
        p = 0,
        u = 0,
        h = 0,
        d = 0;
      p * p + u * u < 4 && h < o
      ;)
      d = p * p - u * u + c,
        u = 2 * p * u + l,
        p = d,
        h++;
    h === o
      ? this.color(0, 0, 0, 1)
      : this.color(r[3 * h] / 255, r[3 * h + 1] / 255, r[3 * h + 2] / 255, 1);
  }, {
    output: [1, 1],
    constants: {
      maxIter: 1,
      canvasWidth: 1,
      canvasHeight: 1,
    },
    graphical: true,
  });
  kernel(1,2,3,4,[5]);
  console.log(kernel.getPixels());
  assert.ok(kernel.getPixels());
  if (kernel.context && kernel.context.getError)
  assert.ok(kernel.context.getError() === 0);
  gpu.destroy();
}

test('auto', () => {
  testMinificationMadness();
});

test('gpu', () => {
  testMinificationMadness('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  testMinificationMadness('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  testMinificationMadness('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testMinificationMadness('headlessgl');
});

test('cpu', () => {
  const mockData = [];
  const result = true;
  mockData.data = { set: () => {}, slice: () => result };
  const mockPutImageData = () => {};
  const mockContext = {
    createImageData: () => mockData,
    putImageData: mockPutImageData,
  };
  const mockCanvas = {
    getContext: () => mockContext
  };
  testMinificationMadness('cpu', typeof HTMLCanvasElement === 'undefined' ? mockCanvas : null);
});