const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('internal: mixed memory optimize');

function getOffKernel(gpu) {
  return gpu.createKernel(function(value) {
    return value[this.thread.x];
  }) // getFloatFromSampler2D
    .setPrecision('single')
    .setOutput([10])
    .setPipeline(true)
    .setOptimizeFloatMemory(false);
}

function getOnKernel(gpu) {
  return gpu.createKernel(function(value) {
    return value[this.thread.x];
  }) // getMemoryOptimized32
    .setPrecision('single')
    .setOutput([10])
    .setPipeline(true)
    .setOptimizeFloatMemory(true);
}

function offOnOff(mode) {
  const gpu = new GPU({ mode });
  const offKernel = getOffKernel(gpu);
  const onKernel = getOnKernel(gpu);
  const value = [1,2,3,4,5,6,7,8,9,10];
  const textureResult = offKernel(value);
  assert.deepEqual(Array.from(textureResult.toArray()), value);
  assert.deepEqual(Array.from(onKernel(offKernel(value)).toArray()), value);
  const result = offKernel(onKernel(offKernel(value))).toArray();
  assert.deepEqual(Array.from(result), value);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('off on off auto', () => {
  offOnOff();
});

(GPU.isGPUSupported && GPU.isSinglePrecisionSupported ? test : skip)('off on off gpu', () => {
  offOnOff('gpu');
});

(GPU.isWebGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('off on off webgl', () => {
  offOnOff('webgl');
});

(GPU.isWebGL2Supported && GPU.isSinglePrecisionSupported ? test : skip)('off on off webgl2', () => {
  offOnOff('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('off on off headlessgl', () => {
  offOnOff('headlessgl');
});

test('off on off cpu', () => {
  assert.throws(() => {
    offOnOff('cpu');
  });
});


function onOffOn(mode) {
  const gpu = new GPU({ mode });
  const onKernel = getOnKernel(gpu);
  const offKernel = getOffKernel(gpu);
  const value = [1,2,3,4,5,6,7,8,9,10];

  const textureResult1 = onKernel(value);
  const textureResult2 = offKernel(onKernel(value));
  const textureResult3 = onKernel(offKernel(onKernel(value)));

  const result1 = Array.from(textureResult1.toArray());
  const result2 = Array.from(textureResult2.toArray());
  const result3 = Array.from(textureResult3.toArray());

  assert.deepEqual(Array.from(result1), value);
  assert.deepEqual(Array.from(result2), value);
  assert.deepEqual(Array.from(result3), value);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('on off on auto', () => {
  onOffOn();
});

(GPU.isGPUSupported && GPU.isSinglePrecisionSupported ? test : skip)('on off on gpu', () => {
  onOffOn('gpu');
});

(GPU.isWebGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('on off on webgl', () => {
  onOffOn('webgl');
});

(GPU.isWebGL2Supported && GPU.isSinglePrecisionSupported ? test : skip)('on off on webgl2', () => {
  onOffOn('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('on off on headlessgl', () => {
  onOffOn('headlessgl');
});

test('on off on cpu', () => {
  assert.throws(() => {
    onOffOn('cpu');
  });
});
