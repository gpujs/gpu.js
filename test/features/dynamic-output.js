const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: dynamic output');

function dynamicOutput1DGrows(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return this.output.x + this.thread.x;
  }, { dynamicOutput: true });

  kernel.setOutput([5]);
  let result = kernel();
  assert.equal(result.length, 5);
  assert.deepEqual(Array.from(result), [5,6,7,8,9]);
  assert.deepEqual(Array.from(kernel.output), [5]);

  kernel.setOutput([10]);
  result = kernel();
  assert.equal(result.length, 10);
  assert.deepEqual(Array.from(result), [10,11,12,13,14,15,16,17,18,19]);
  assert.deepEqual(Array.from(kernel.output), [10]);

  gpu.destroy();
}

test('dynamic output 1d grows auto', () => {
  dynamicOutput1DGrows();
});

test('dynamic output 1d grows gpu', () => {
  dynamicOutput1DGrows('gpu');
});

(GPU.isWebGLSupported ? test : skip)('dynamic output 1d grows webgl', () => {
  dynamicOutput1DGrows('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('dynamic output 1d grows webgl2', () => {
  dynamicOutput1DGrows('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('dynamic output 1d grows headlessgl', () => {
  dynamicOutput1DGrows('headlessgl');
});

test('dynamic output 1d grows cpu', () => {
  dynamicOutput1DGrows('cpu');
});


function dynamicOutput1DShrinks(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return this.output.x + this.thread.x;
  }, { dynamicOutput: true });

  kernel.setOutput([10]);
  let result = kernel();
  assert.equal(result.length, 10);
  assert.deepEqual(Array.from(result), [10,11,12,13,14,15,16,17,18,19]);
  assert.deepEqual(Array.from(kernel.output), [10]);

  kernel.setOutput([5]);
  result = kernel();
  assert.equal(result.length, 5);
  assert.deepEqual(Array.from(result), [5,6,7,8,9]);
  assert.deepEqual(Array.from(kernel.output), [5]);

  gpu.destroy();
}

test('dynamic output 1d shrinks auto', () => {
  dynamicOutput1DShrinks();
});

test('dynamic output 1d shrinks gpu', () => {
  dynamicOutput1DShrinks('gpu');
});

(GPU.isWebGLSupported ? test : skip)('dynamic output 1d shrinks webgl', () => {
  dynamicOutput1DShrinks('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('dynamic output 1d shrinks webgl2', () => {
  dynamicOutput1DShrinks('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('dynamic output 1d shrinks headlessgl', () => {
  dynamicOutput1DShrinks('headlessgl');
});

test('dynamic output 1d shrinks cpu', () => {
  dynamicOutput1DShrinks('cpu');
});

function dynamicOutput1DKernelMapGrows(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernelMap({
    result2: function map(v) {
      return v;
    }
  }, function() {
    return map(this.output.x + this.thread.x);
  }, { dynamicOutput: true });

  kernel.setOutput([5]);
  let result = kernel();
  assert.equal(result.result.length, 5);
  assert.equal(result.result2.length, 5);
  assert.deepEqual(Array.from(result.result), [5,6,7,8,9]);
  assert.deepEqual(Array.from(result.result2), [5,6,7,8,9]);
  assert.deepEqual(Array.from(kernel.output), [5]);

  kernel.setOutput([10]);
  result = kernel();
  assert.equal(result.result.length, 10);
  assert.equal(result.result2.length, 10);
  assert.deepEqual(Array.from(result.result), [10,11,12,13,14,15,16,17,18,19]);
  assert.deepEqual(Array.from(result.result2), [10,11,12,13,14,15,16,17,18,19]);
  assert.deepEqual(Array.from(kernel.output), [10]);

  gpu.destroy();
}

test('dynamic output 1d kernel map grows auto', () => {
  dynamicOutput1DKernelMapGrows();
});

test('dynamic output 1d kernel map grows gpu', () => {
  dynamicOutput1DKernelMapGrows('gpu');
});

(GPU.isWebGLSupported ? test : skip)('dynamic output 1d kernel map grows webgl', () => {
  dynamicOutput1DKernelMapGrows('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('dynamic output 1d kernel map grows webgl2', () => {
  dynamicOutput1DKernelMapGrows('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('dynamic output 1d kernel map grows headlessgl', () => {
  dynamicOutput1DKernelMapGrows('headlessgl');
});

test('dynamic output 1d kernel map grows cpu', () => {
  dynamicOutput1DKernelMapGrows('cpu');
});


function dynamicOutput1DKernelMapShrinks(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernelMap({
    result2: function map(v) {
      return v;
    }
  }, function() {
    return map(this.output.x + this.thread.x);
  }, { dynamicOutput: true });

  kernel.setOutput([10]);
  let result = kernel();
  assert.equal(result.result.length, 10);
  assert.equal(result.result2.length, 10);
  assert.deepEqual(Array.from(result.result), [10,11,12,13,14,15,16,17,18,19]);
  assert.deepEqual(Array.from(result.result2), [10,11,12,13,14,15,16,17,18,19]);
  assert.deepEqual(Array.from(kernel.output), [10]);

  kernel.setOutput([5]);
  result = kernel();
  assert.equal(result.result.length, 5);
  assert.equal(result.result2.length, 5);
  assert.deepEqual(Array.from(result.result), [5,6,7,8,9]);
  assert.deepEqual(Array.from(result.result2), [5,6,7,8,9]);
  assert.deepEqual(Array.from(kernel.output), [5]);

  gpu.destroy();
}

test('dynamic output 1d kernel map shrinks auto', () => {
  dynamicOutput1DKernelMapShrinks();
});

test('dynamic output 1d kernel map shrinks gpu', () => {
  dynamicOutput1DKernelMapShrinks('gpu');
});

(GPU.isWebGLSupported ? test : skip)('dynamic output 1d kernel map shrinks webgl', () => {
  dynamicOutput1DKernelMapShrinks('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('dynamic output 1d kernel map shrinks webgl2', () => {
  dynamicOutput1DKernelMapShrinks('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('dynamic output 1d kernel map shrinks headlessgl', () => {
  dynamicOutput1DKernelMapShrinks('headlessgl');
});

test('dynamic output 1d kernel map shrinks cpu', () => {
  dynamicOutput1DKernelMapShrinks('cpu');
});

function dynamicOutput2DGrows(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return this.output.x + this.output.y + this.thread.x + this.thread.y;
  }, { dynamicOutput: true });

  kernel.setOutput([2,2]);
  let result = kernel();
  assert.equal(result.length, 2);
  assert.deepEqual(result.map(row => Array.from(row)), [[4,5],[5,6]]);
  assert.deepEqual(Array.from(kernel.output), [2,2]);

  kernel.setOutput([3,3]);
  result = kernel();
  assert.equal(result.length, 3);
  assert.deepEqual(result.map(row => Array.from(row)), [[6,7,8],[7,8,9],[8,9,10]]);
  assert.deepEqual(Array.from(kernel.output), [3,3]);

  gpu.destroy();
}

test('dynamic output 2d grows auto', () => {
  dynamicOutput2DGrows();
});

test('dynamic output 2d grows gpu', () => {
  dynamicOutput2DGrows('gpu');
});

(GPU.isWebGLSupported ? test : skip)('dynamic output 2d grows webgl', () => {
  dynamicOutput2DGrows('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('dynamic output 2d grows webgl2', () => {
  dynamicOutput2DGrows('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('dynamic output 2d grows headlessgl', () => {
  dynamicOutput2DGrows('headlessgl');
});

test('dynamic output 2d grows cpu', () => {
  dynamicOutput2DGrows('cpu');
});


function dynamicOutput2DShrinks(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return this.output.x + this.output.y + this.thread.x + this.thread.y;
  }, { dynamicOutput: true });

  kernel.setOutput([3,3]);
  let result = kernel();
  assert.equal(result.length, 3);
  assert.deepEqual(result.map(row => Array.from(row)), [[6,7,8],[7,8,9],[8,9,10]]);
  assert.deepEqual(Array.from(kernel.output), [3,3]);

  kernel.setOutput([2,2]);
  result = kernel();
  assert.equal(result.length, 2);
  assert.deepEqual(result.map(row => Array.from(row)), [[4,5],[5,6]]);
  assert.deepEqual(Array.from(kernel.output), [2,2]);

  gpu.destroy();
}

test('dynamic output 2d shrinks auto', () => {
  dynamicOutput2DShrinks();
});

test('dynamic output 2d shrinks gpu', () => {
  dynamicOutput2DShrinks('gpu');
});

(GPU.isWebGLSupported ? test : skip)('dynamic output 2d shrinks webgl', () => {
  dynamicOutput2DShrinks('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('dynamic output 2d shrinks webgl2', () => {
  dynamicOutput2DShrinks('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('dynamic output 2d shrinks headlessgl', () => {
  dynamicOutput2DShrinks('headlessgl');
});

test('dynamic output 2d shrinks cpu', () => {
  dynamicOutput2DShrinks('cpu');
});

function dynamicOutput2DKernelMapGrows(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernelMap({
    result1: function map(v) {
      return v;
    }
  }, function() {
    return map(this.output.x + this.output.y + this.thread.x + this.thread.y);
  }, { dynamicOutput: true });

  kernel.setOutput([2,2]);
  let result = kernel();
  assert.equal(result.result.length, 2);
  assert.equal(result.result1.length, 2);
  assert.deepEqual(result.result.map(row => Array.from(row)), [[4,5],[5,6]]);
  assert.deepEqual(result.result1.map(row => Array.from(row)), [[4,5],[5,6]]);
  assert.deepEqual(Array.from(kernel.output), [2,2]);

  kernel.setOutput([3,3]);
  result = kernel();
  assert.equal(result.result.length, 3);
  assert.equal(result.result1.length, 3);
  assert.deepEqual(result.result.map(row => Array.from(row)), [[6,7,8],[7,8,9],[8,9,10]]);
  assert.deepEqual(result.result1.map(row => Array.from(row)), [[6,7,8],[7,8,9],[8,9,10]]);
  assert.deepEqual(Array.from(kernel.output), [3,3]);

  gpu.destroy();
}

test('dynamic output 2d kernel map grows auto', () => {
  dynamicOutput2DKernelMapGrows();
});

test('dynamic output 2d kernel map grows gpu', () => {
  dynamicOutput2DKernelMapGrows('gpu');
});

(GPU.isWebGLSupported ? test : skip)('dynamic output 2d kernel map grows webgl', () => {
  dynamicOutput2DKernelMapGrows('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('dynamic output 2d kernel map grows webgl2', () => {
  dynamicOutput2DKernelMapGrows('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('dynamic output 2d kernel map grows headlessgl', () => {
  dynamicOutput2DKernelMapGrows('headlessgl');
});

test('dynamic output 2d kernel map grows cpu', () => {
  dynamicOutput2DKernelMapGrows('cpu');
});


function dynamicOutput2DKernelMapShrinks(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernelMap({
    result1: function map(v) {
      return v;
    }
  }, function() {
    return map(this.output.x + this.output.y + this.thread.x + this.thread.y);
  }, { dynamicOutput: true });

  kernel.setOutput([3,3]);
  let result = kernel();
  assert.equal(result.result.length, 3);
  assert.equal(result.result1.length, 3);
  assert.deepEqual(result.result.map(row => Array.from(row)), [[6,7,8],[7,8,9],[8,9,10]]);
  assert.deepEqual(result.result1.map(row => Array.from(row)), [[6,7,8],[7,8,9],[8,9,10]]);
  assert.deepEqual(Array.from(kernel.output), [3,3]);

  kernel.setOutput([2,2]);
  result = kernel();
  assert.equal(result.result.length, 2);
  assert.equal(result.result1.length, 2);
  assert.deepEqual(result.result.map(row => Array.from(row)), [[4,5],[5,6]]);
  assert.deepEqual(result.result1.map(row => Array.from(row)), [[4,5],[5,6]]);
  assert.deepEqual(Array.from(kernel.output), [2,2]);

  gpu.destroy();
}

test('dynamic output 2d shrinks auto', () => {
  dynamicOutput2DShrinks();
});

test('dynamic output 2d shrinks gpu', () => {
  dynamicOutput2DShrinks('gpu');
});

(GPU.isWebGLSupported ? test : skip)('dynamic output 2d shrinks webgl', () => {
  dynamicOutput2DShrinks('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('dynamic output 2d shrinks webgl2', () => {
  dynamicOutput2DShrinks('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('dynamic output 2d shrinks headlessgl', () => {
  dynamicOutput2DShrinks('headlessgl');
});

test('dynamic output 2d shrinks cpu', () => {
  dynamicOutput2DShrinks('cpu');
});
//TODO:

function dynamicOutput2DGraphicalGrows(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    this.color(1,1,1,1);
  }, { graphical: true, dynamicOutput: true });

  kernel.setOutput([2,2]);
  kernel();
  let result = kernel.getPixels();
  assert.equal(result.length, 2 * 2 * 4);
  assert.deepEqual(Array.from(result), [
    255, 255, 255, 255,
    255, 255, 255, 255,
    255, 255, 255, 255,
    255, 255, 255, 255
  ]);
  assert.deepEqual(Array.from(kernel.output), [2,2]);

  kernel.setOutput([3,3]);
  kernel();
  result = kernel.getPixels();
  assert.equal(result.length, 3 * 3 * 4);
  assert.deepEqual(Array.from(result), [
    255, 255, 255, 255,
    255, 255, 255, 255,
    255, 255, 255, 255,
    255, 255, 255, 255,
    255, 255, 255, 255,
    255, 255, 255, 255,
    255, 255, 255, 255,
    255, 255, 255, 255,
    255, 255, 255, 255,
  ]);
  assert.deepEqual(Array.from(kernel.output), [3,3]);

  gpu.destroy();
}

test('dynamic output 2d graphical grows auto', () => {
  dynamicOutput2DGraphicalGrows();
});

test('dynamic output 2d graphical grows gpu', () => {
  dynamicOutput2DGraphicalGrows('gpu');
});

(GPU.isWebGLSupported ? test : skip)('dynamic output 2d graphical grows webgl', () => {
  dynamicOutput2DGraphicalGrows('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('dynamic output 2d graphical grows webgl2', () => {
  dynamicOutput2DGraphicalGrows('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('dynamic output 2d graphical grows headlessgl', () => {
  dynamicOutput2DGraphicalGrows('headlessgl');
});

(GPU.isCanvasSupported ? test : skip)('dynamic output 2d graphical grows cpu', () => {
  dynamicOutput2DGraphicalGrows('cpu');
});


function dynamicOutput2DGraphicalShrinks(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    this.color(1,1,1,1);
  }, { graphical: true, dynamicOutput: true });

  kernel.setOutput([3,3]);
  kernel();
  let result = kernel.getPixels();
  assert.equal(result.length, 3 * 3 * 4);
  assert.deepEqual(Array.from(result), [
    255, 255, 255, 255,
    255, 255, 255, 255,
    255, 255, 255, 255,
    255, 255, 255, 255,
    255, 255, 255, 255,
    255, 255, 255, 255,
    255, 255, 255, 255,
    255, 255, 255, 255,
    255, 255, 255, 255,
  ]);
  assert.deepEqual(Array.from(kernel.output), [3,3]);

  kernel.setOutput([2,2]);
  kernel();
  result = kernel.getPixels();
  assert.equal(result.length, 2 * 2 * 4);
  assert.deepEqual(Array.from(result), [
    255, 255, 255, 255,
    255, 255, 255, 255,
    255, 255, 255, 255,
    255, 255, 255, 255
  ]);
  assert.deepEqual(Array.from(kernel.output), [2,2]);

  gpu.destroy();
}

test('dynamic output 2d graphical shrinks auto', () => {
  dynamicOutput2DGraphicalShrinks();
});

test('dynamic output 2d graphical shrinks gpu', () => {
  dynamicOutput2DGraphicalShrinks('gpu');
});

(GPU.isWebGLSupported ? test : skip)('dynamic output 2d graphical shrinks webgl', () => {
  dynamicOutput2DGraphicalShrinks('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('dynamic output 2d graphical shrinks webgl2', () => {
  dynamicOutput2DGraphicalShrinks('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('dynamic output 2d graphical shrinks headlessgl', () => {
  dynamicOutput2DGraphicalShrinks('headlessgl');
});

(GPU.isCanvasSupported ? test : skip)('dynamic output 2d graphical  shrinks cpu', () => {
  dynamicOutput2DGraphicalShrinks('cpu');
});

function dynamicOutput3DGrows(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return this.output.x + this.output.y + this.thread.z + this.thread.x + this.thread.y + this.thread.z;
  }, { dynamicOutput: true });

  kernel.setOutput([2,2,2]);
  let result = kernel();
  assert.equal(result.length, 2);
  assert.deepEqual(result.map(matrix => matrix.map(row => Array.from(row))), [[[4,5],[5,6]],[[6,7],[7,8]]]);
  assert.deepEqual(Array.from(kernel.output), [2,2,2]);

  kernel.setOutput([3,3,3]);
  result = kernel();
  assert.equal(result.length, 3);
  assert.deepEqual(result.map(matrix => matrix.map(row => Array.from(row))), [
    [
      [6,7,8],
      [7,8,9],
      [8,9,10]
    ],
    [
      [8,9,10],
      [9,10,11],
      [10,11,12]
    ],
    [
      [10,11,12],
      [11,12,13],
      [12,13,14]
    ]
  ]);
  assert.deepEqual(Array.from(kernel.output), [3,3,3]);

  gpu.destroy();
}

test('dynamic output 3d grows auto', () => {
  dynamicOutput3DGrows();
});

test('dynamic output 3d grows gpu', () => {
  dynamicOutput3DGrows('gpu');
});

(GPU.isWebGLSupported ? test : skip)('dynamic output 3d grows webgl', () => {
  dynamicOutput3DGrows('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('dynamic output 3d grows webgl2', () => {
  dynamicOutput3DGrows('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('dynamic output 3d grows headlessgl', () => {
  dynamicOutput3DGrows('headlessgl');
});

test('dynamic output 3d grows cpu', () => {
  dynamicOutput3DGrows('cpu');
});


function dynamicOutput3DShrinks(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return this.output.x + this.output.y + this.thread.z + this.thread.x + this.thread.y + this.thread.z;
  }, { dynamicOutput: true });

  kernel.setOutput([3,3,3]);
  let result = kernel();
  assert.equal(result.length, 3);
  assert.deepEqual(result.map(matrix => matrix.map(row => Array.from(row))), [
    [
      [6,7,8],
      [7,8,9],
      [8,9,10]
    ],
    [
      [8,9,10],
      [9,10,11],
      [10,11,12]
    ],
    [
      [10,11,12],
      [11,12,13],
      [12,13,14]
    ]
  ]);
  assert.deepEqual(Array.from(kernel.output), [3,3,3]);

  kernel.setOutput([2,2,2]);
  result = kernel();
  assert.equal(result.length, 2);
  assert.deepEqual(result.map(matrix => matrix.map(row => Array.from(row))), [[[4,5],[5,6]],[[6,7],[7,8]]]);
  assert.deepEqual(Array.from(kernel.output), [2,2,2]);

  gpu.destroy();
}

test('dynamic output 3d shrinks auto', () => {
  dynamicOutput3DShrinks();
});

test('dynamic output 3d shrinks gpu', () => {
  dynamicOutput3DShrinks('gpu');
});

(GPU.isWebGLSupported ? test : skip)('dynamic output 3d shrinks webgl', () => {
  dynamicOutput3DShrinks('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('dynamic output 3d shrinks webgl2', () => {
  dynamicOutput3DShrinks('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('dynamic output 3d shrinks headlessgl', () => {
  dynamicOutput3DShrinks('headlessgl');
});

test('dynamic output 3d shrinks cpu', () => {
  dynamicOutput3DShrinks('cpu');
});

function dynamicOutput3DKernelMapGrows(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernelMap({
    result1: function map(v) {
      return v;
    }
  }, function() {
    return map(this.output.x + this.output.y + this.thread.z + this.thread.x + this.thread.y + this.thread.z);
  }, { dynamicOutput: true });

  kernel.setOutput([2,2,2]);
  let result = kernel();
  assert.equal(result.result.length, 2);
  assert.equal(result.result1.length, 2);
  assert.deepEqual(result.result.map(matrix => matrix.map(row => Array.from(row))), [[[4,5],[5,6]],[[6,7],[7,8]]]);
  assert.deepEqual(result.result1.map(matrix => matrix.map(row => Array.from(row))), [[[4,5],[5,6]],[[6,7],[7,8]]]);
  assert.deepEqual(Array.from(kernel.output), [2,2,2]);

  kernel.setOutput([3,3,3]);
  result = kernel();
  assert.equal(result.result.length, 3);
  assert.equal(result.result1.length, 3);
  assert.deepEqual(result.result.map(matrix => matrix.map(row => Array.from(row))), [
    [
      [6,7,8],
      [7,8,9],
      [8,9,10]
    ],
    [
      [8,9,10],
      [9,10,11],
      [10,11,12]
    ],
    [
      [10,11,12],
      [11,12,13],
      [12,13,14]
    ]
  ]);
  assert.deepEqual(result.result1.map(matrix => matrix.map(row => Array.from(row))), [
    [
      [6,7,8],
      [7,8,9],
      [8,9,10]
    ],
    [
      [8,9,10],
      [9,10,11],
      [10,11,12]
    ],
    [
      [10,11,12],
      [11,12,13],
      [12,13,14]
    ]
  ]);
  assert.deepEqual(Array.from(kernel.output), [3,3,3]);

  gpu.destroy();
}

test('dynamic output 3d kernel map grows auto', () => {
  dynamicOutput3DKernelMapGrows();
});

test('dynamic output 3d kernel map grows gpu', () => {
  dynamicOutput3DKernelMapGrows('gpu');
});

(GPU.isWebGLSupported ? test : skip)('dynamic output 3d kernel map grows webgl', () => {
  dynamicOutput3DKernelMapGrows('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('dynamic output 3d kernel map grows webgl2', () => {
  dynamicOutput3DKernelMapGrows('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('dynamic output 3d kernel map grows headlessgl', () => {
  dynamicOutput3DKernelMapGrows('headlessgl');
});

test('dynamic output 3d kernel map grows cpu', () => {
  dynamicOutput3DKernelMapGrows('cpu');
});


function dynamicOutput3DKernelMapShrinks(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernelMap({
    result1: function map(v) {
      return v;
    }
  }, function() {
    return map(this.output.x + this.output.y + this.thread.z + this.thread.x + this.thread.y + this.thread.z);
  }, { dynamicOutput: true });

  kernel.setOutput([3,3,3]);
  let result = kernel();
  assert.equal(result.result.length, 3);
  assert.equal(result.result1.length, 3);
  assert.deepEqual(result.result.map(matrix => matrix.map(row => Array.from(row))), [
    [
      [6,7,8],
      [7,8,9],
      [8,9,10]
    ],
    [
      [8,9,10],
      [9,10,11],
      [10,11,12]
    ],
    [
      [10,11,12],
      [11,12,13],
      [12,13,14]
    ]
  ]);
  assert.deepEqual(result.result1.map(matrix => matrix.map(row => Array.from(row))), [
    [
      [6,7,8],
      [7,8,9],
      [8,9,10]
    ],
    [
      [8,9,10],
      [9,10,11],
      [10,11,12]
    ],
    [
      [10,11,12],
      [11,12,13],
      [12,13,14]
    ]
  ]);
  assert.deepEqual(Array.from(kernel.output), [3,3,3]);

  kernel.setOutput([2,2,2]);
  result = kernel();
  assert.equal(result.result.length, 2);
  assert.equal(result.result1.length, 2);
  assert.deepEqual(result.result.map(matrix => matrix.map(row => Array.from(row))), [[[4,5],[5,6]],[[6,7],[7,8]]]);
  assert.deepEqual(result.result1.map(matrix => matrix.map(row => Array.from(row))), [[[4,5],[5,6]],[[6,7],[7,8]]]);
  assert.deepEqual(Array.from(kernel.output), [2,2,2]);

  gpu.destroy();
}

test('dynamic output 3d kernel map shrinks auto', () => {
  dynamicOutput3DKernelMapShrinks();
});

test('dynamic output 3d kernel map shrinks gpu', () => {
  dynamicOutput3DKernelMapShrinks('gpu');
});

(GPU.isWebGLSupported ? test : skip)('dynamic output 3d kernel map shrinks webgl', () => {
  dynamicOutput3DKernelMapShrinks('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('dynamic output 3d kernel map shrinks webgl2', () => {
  dynamicOutput3DKernelMapShrinks('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('dynamic output 3d kernel map shrinks headlessgl', () => {
  dynamicOutput3DKernelMapShrinks('headlessgl');
});

test('dynamic output 3d kernel map shrinks cpu', () => {
  dynamicOutput3DKernelMapShrinks('cpu');
});
