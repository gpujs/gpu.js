const { assert, test, module: describe, only, skip } = require('qunit');
const { GPU } = require('../../src');

describe('features: output');

function outputArray(mode) {
  const gpu = new GPU({ mode });
  const input = [1,2,3,4,5];
  const kernel = gpu.createKernel(function(input) {
    return input[this.thread.x];
  }, { output: [5] });
  const result = kernel(input);
  assert.deepEqual(Array.from(result), input);
  gpu.destroy();
}

test('output array auto', () => {
  outputArray();
});

test('output array gpu', () => {
  outputArray('gpu');
});

(GPU.isWebGLSupported ? test : skip)('output array webgl', () => {
  outputArray('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('output array webgl2', () => {
  outputArray('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('output array headlessgl', () => {
  outputArray('headlessgl');
});

test('output array cpu', () => {
  outputArray('cpu');
});

function outputMatrix(mode) {
  const gpu = new GPU({ mode });
  const input = [
    [1,2,3,4,5],
    [1,2,3,4,5],
    [1,2,3,4,5],
    [1,2,3,4,5],
    [1,2,3,4,5],
  ];
  const kernel = gpu.createKernel(function(input) {
    return input[this.thread.y][this.thread.x];
  }, { output: [5, 5] });
  const result = kernel(input);
  assert.deepEqual(result.map(array => Array.from(array)), input);
  gpu.destroy();
}

test('output matrix auto', () => {
  outputMatrix();
});

test('output matrix gpu', () => {
  outputMatrix('gpu');
});

(GPU.isWebGLSupported ? test : skip)('output matrix webgl', () => {
  outputMatrix('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('output matrix webgl2', () => {
  outputMatrix('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('output matrix headlessgl', () => {
  outputMatrix('headlessgl');
});

test('output matrix cpu', () => {
  outputMatrix('cpu');
});

function outputCube(mode) {
  const gpu = new GPU({ mode });
  const input = [
    [
      [1,2,3,4,5],
      [1,2,3,4,5],
      [1,2,3,4,5],
      [1,2,3,4,5],
      [1,2,3,4,5],
    ],
    [
      [1,2,3,4,5],
      [1,2,3,4,5],
      [1,2,3,4,5],
      [1,2,3,4,5],
      [1,2,3,4,5],
    ],
    [
      [1,2,3,4,5],
      [1,2,3,4,5],
      [1,2,3,4,5],
      [1,2,3,4,5],
      [1,2,3,4,5],
    ],
    [
      [1,2,3,4,5],
      [1,2,3,4,5],
      [1,2,3,4,5],
      [1,2,3,4,5],
      [1,2,3,4,5],
    ],
    [
      [1,2,3,4,5],
      [1,2,3,4,5],
      [1,2,3,4,5],
      [1,2,3,4,5],
      [1,2,3,4,5],
    ]
  ];
  const kernel = gpu.createKernel(function(input) {
    return input[this.thread.z][this.thread.y][this.thread.x];
  }, { output: [5, 5, 5] });
  const result = kernel(input);
  assert.deepEqual(result.map(matrix => matrix.map(array => Array.from(array))), input);
  gpu.destroy();
}

test('output cube auto', () => {
  outputCube();
});

test('output cube gpu', () => {
  outputCube('gpu');
});

(GPU.isWebGLSupported ? test : skip)('output cube webgl', () => {
  outputCube('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('output cube webgl2', () => {
  outputCube('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('output cube headlessgl', () => {
  outputCube('headlessgl');
});

test('output cube cpu', () => {
  outputCube('cpu');
});

function outputGraphicalArray(mode) {
  const gpu = new GPU({ mode });
  const mockContext = {
    getExtension: () => {}
  };
  const mockCanvas = {
    getContext: () => mockContext,
  };
  assert.throws(() => {
    const kernel = gpu.createKernel(function(input) {
      return input[this.thread.x];
    }, {
      canvas: mockCanvas,
      output: [5],
      graphical: true
    });
    kernel([1]);
  }, new Error('Output must have 2 dimensions on graphical mode'));
  gpu.destroy();
}

test('graphical output array auto', () => {
  outputGraphicalArray();
});

test('graphical output array gpu', () => {
  outputGraphicalArray('gpu');
});

(GPU.isWebGLSupported ? test : skip)('graphical output array webgl', () => {
  outputGraphicalArray('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('graphical output array webgl2', () => {
  outputGraphicalArray('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('graphical output array headlessgl', () => {
  outputGraphicalArray('headlessgl');
});

test('graphical output array cpu', () => {
  outputGraphicalArray('cpu');
});

function outputGraphicalMatrix(mode, canvas, context) {
  const gpu = new GPU({ mode });
  const input = [
    [0.25,.50],
    [.75,1],
  ];
  const kernel = gpu.createKernel(function(input) {
    const color = input[this.thread.y][this.thread.x];
    this.color(color, color, color, color);
  }, {
    context,
    canvas,
    output: [2, 2],
    graphical: true
  });
  const result = kernel(input);
  assert.equal(result, undefined);
  const pixels = Array.from(kernel.getPixels());
  gpu.destroy();
  return pixels;
}

(GPU.isWebGLSupported ? test : skip)('graphical output matrix webgl', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl', { premultipliedAlpha: false });
  const pixels = outputGraphicalMatrix('webgl', canvas, context);
  assert.deepEqual(pixels, [
    191,
    191,
    191,
    191,
    255,
    255,
    255,
    255,
    64,
    64,
    64,
    64,
    128,
    128,
    128,
    128
  ]);
});

(GPU.isWebGL2Supported ? test : skip)('graphical output matrix webgl2', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2', { premultipliedAlpha: false });
  const pixels = outputGraphicalMatrix('webgl2', canvas, context);
  assert.deepEqual(pixels, [
    191,
    191,
    191,
    191,
    255,
    255,
    255,
    255,
    64,
    64,
    64,
    64,
    128,
    128,
    128,
    128
  ]);
});

(GPU.isHeadlessGLSupported ? test : skip)('graphical output matrix headlessgl', () => {
  const pixels = outputGraphicalMatrix('headlessgl');
  assert.deepEqual(pixels, [
    191,
    191,
    191,
    191,
    255,
    255,
    255,
    255,
    64,
    64,
    64,
    64,
    128,
    128,
    128,
    128
  ]);
});

(GPU.isCanvasSupported ? test : skip)('graphical output matrix cpu with real canvas', () => {
  const pixels = outputGraphicalMatrix('cpu');
  assert.deepEqual(pixels, [
    191,
    191,
    191,
    191,
    255,
    255,
    255,
    255,
    63,
    63,
    63,
    63,
    127,
    127,
    127,
    127
  ]);
});

test('graphical output matrix cpu with mocked canvas', () => {
  // allow tests on node or browser
  let outputImageData = null;
  const mockContext = {
    createImageData: () => {
      return { data: new Uint8ClampedArray(2 * 2 * 4) };
    },
    putImageData: (_outputImageData) => {
      outputImageData = _outputImageData;
    },
    getImageData: () => {
      return outputImageData;
    },
    getExtension: () => {
      return null;
    }
  };
  const mockCanvas = {
    getContext: () => mockContext,
  };
  const pixels = outputGraphicalMatrix('cpu', mockCanvas, mockContext);
  assert.deepEqual(pixels, [
    191,
    191,
    191,
    191,
    255,
    255,
    255,
    255,
    63,
    63,
    63,
    63,
    127,
    127,
    127,
    127
  ]);
});

function outputGraphicalCube(mode) {
  const gpu = new GPU({ mode });
  const mockContext = {
    getExtension: () => {}
  };
  const mockCanvas = {
    getContext: () => mockContext
  };
  assert.throws(() => {
    const kernel = gpu.createKernel(function(input) {
      return input[this.thread.x];
    }, {
      canvas: mockCanvas,
      output: [5,5,5],
      graphical: true
    });
    kernel([1]);
  }, new Error('Output must have 2 dimensions on graphical mode'));
  gpu.destroy();
}

test('graphical output array auto', () => {
  outputGraphicalCube();
});

test('graphical output array gpu', () => {
  outputGraphicalCube('gpu');
});

(GPU.isWebGLSupported ? test : skip)('graphical output array webgl', () => {
  outputGraphicalCube('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('graphical output array webgl2', () => {
  outputGraphicalCube('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('graphical output array headlessgl', () => {
  outputGraphicalCube('headlessgl');
});

test('graphical output array cpu', () => {
  outputGraphicalCube('cpu');
});
