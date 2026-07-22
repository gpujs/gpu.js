const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: random seed');

function buildKernel(gpu, settings) {
  return gpu.createKernel(function() {
    return Math.random();
  }, Object.assign({ output: [64] }, settings));
}

function testSameSeedSameResults(mode) {
  const gpu = new GPU({ mode });
  const kernel1 = buildKernel(gpu).setRandomSeed(42);
  const kernel2 = buildKernel(gpu).setRandomSeed(42);
  const result1 = Array.from(kernel1());
  const result2 = Array.from(kernel2());
  assert.deepEqual(result1, result2);
  gpu.destroy();
}

function testDifferentSeedDifferentResults(mode) {
  const gpu = new GPU({ mode });
  const kernel1 = buildKernel(gpu).setRandomSeed(42);
  const kernel2 = buildKernel(gpu).setRandomSeed(43);
  const result1 = Array.from(kernel1());
  const result2 = Array.from(kernel2());
  assert.notDeepEqual(result1, result2);
  gpu.destroy();
}

function testSeededSequenceIsReproducible(mode) {
  const gpu = new GPU({ mode });
  const kernel1 = buildKernel(gpu).setRandomSeed(123);
  const firstRun1 = Array.from(kernel1());
  const secondRun1 = Array.from(kernel1());
  // the stream advances between runs
  assert.notDeepEqual(firstRun1, secondRun1);
  // but a fresh kernel with the same seed replays the same sequence
  const kernel2 = buildKernel(gpu).setRandomSeed(123);
  assert.deepEqual(Array.from(kernel2()), firstRun1);
  assert.deepEqual(Array.from(kernel2()), secondRun1);
  gpu.destroy();
}

function testSeedAsSetting(mode) {
  const gpu = new GPU({ mode });
  const kernel1 = buildKernel(gpu, { randomSeed: 7 });
  const kernel2 = buildKernel(gpu).setRandomSeed(7);
  assert.deepEqual(Array.from(kernel1()), Array.from(kernel2()));
  gpu.destroy();
}

function testResettingSeedRestartsStream(mode) {
  const gpu = new GPU({ mode });
  const kernel = buildKernel(gpu).setRandomSeed(99);
  const firstRun = Array.from(kernel());
  kernel.setRandomSeed(99);
  assert.deepEqual(Array.from(kernel()), firstRun);
  gpu.destroy();
}

function testUnseededStillRandom(mode) {
  const gpu = new GPU({ mode });
  const kernel1 = buildKernel(gpu);
  const kernel2 = buildKernel(gpu);
  assert.notDeepEqual(Array.from(kernel1()), Array.from(kernel2()));
  gpu.destroy();
}

function testValuesInRange(mode) {
  const gpu = new GPU({ mode });
  const kernel = buildKernel(gpu).setRandomSeed(1);
  const result = kernel();
  for (let i = 0; i < result.length; i++) {
    assert.ok(result[i] >= 0 && result[i] < 1);
  }
  gpu.destroy();
}

(GPU.isGPUSupported ? test : skip)('same seed same results auto', () => {
  testSameSeedSameResults();
});

(GPU.isGPUSupported ? test : skip)('same seed same results gpu', () => {
  testSameSeedSameResults('gpu');
});

(GPU.isWebGLSupported ? test : skip)('same seed same results webgl', () => {
  testSameSeedSameResults('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('same seed same results webgl2', () => {
  testSameSeedSameResults('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('same seed same results headlessgl', () => {
  testSameSeedSameResults('headlessgl');
});

(GPU.isGPUSupported ? test : skip)('different seed different results gpu', () => {
  testDifferentSeedDifferentResults('gpu');
});

(GPU.isWebGLSupported ? test : skip)('different seed different results webgl', () => {
  testDifferentSeedDifferentResults('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('different seed different results webgl2', () => {
  testDifferentSeedDifferentResults('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('different seed different results headlessgl', () => {
  testDifferentSeedDifferentResults('headlessgl');
});

(GPU.isGPUSupported ? test : skip)('seeded sequence is reproducible gpu', () => {
  testSeededSequenceIsReproducible('gpu');
});

(GPU.isHeadlessGLSupported ? test : skip)('seeded sequence is reproducible headlessgl', () => {
  testSeededSequenceIsReproducible('headlessgl');
});

(GPU.isGPUSupported ? test : skip)('seed as createKernel setting gpu', () => {
  testSeedAsSetting('gpu');
});

(GPU.isHeadlessGLSupported ? test : skip)('seed as createKernel setting headlessgl', () => {
  testSeedAsSetting('headlessgl');
});

(GPU.isGPUSupported ? test : skip)('resetting seed restarts stream gpu', () => {
  testResettingSeedRestartsStream('gpu');
});

(GPU.isGPUSupported ? test : skip)('unseeded still random gpu', () => {
  testUnseededStillRandom('gpu');
});

(GPU.isGPUSupported ? test : skip)('seeded values in [0,1) gpu', () => {
  testValuesInRange('gpu');
});
