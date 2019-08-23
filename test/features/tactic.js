const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('internal: tactic');

function speedTest(mode) {
  const gpu = new GPU({ mode });
  const add = gpu.createKernel(function(a, b) {
    return a + b;
  })
    .setOutput([1])
    .setTactic('speed');
  let addResult = add(0.1, 0.2)[0];
  assert.equal(addResult.toFixed(7), (0.1 + 0.2).toFixed(7));
  gpu.destroy();
}

test('speed auto', () => {
  speedTest();
});

test('speed gpu', () => {
  speedTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('speed webgl', () => {
  speedTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('speed webgl2', () => {
  speedTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('speed headlessgl', () => {
  speedTest('headlessgl');
});

test('speed cpu', () => {
  speedTest('cpu');
});

function balancedTest(mode) {
  const gpu = new GPU({ mode });
  const add = gpu.createKernel(function(a, b) {
    return a + b;
  })
    .setOutput([1])
    .setTactic('balanced');
  let addResult = add(0.1, 0.2)[0];
  assert.equal(addResult.toFixed(7), (0.1 + 0.2).toFixed(7));
  gpu.destroy();
}

test('balanced auto', () => {
  balancedTest();
});

test('balanced gpu', () => {
  balancedTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('balanced webgl', () => {
  balancedTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('balanced webgl2', () => {
  balancedTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('balanced headlessgl', () => {
  balancedTest('headlessgl');
});

test('balanced cpu', () => {
  balancedTest('cpu');
});

function precisionTest(mode) {
  const gpu = new GPU({ mode });
  const add = gpu.createKernel(function(a, b) {
    return a + b;
  })
    .setOutput([1])
    .setTactic('precision');
  let addResult = add(0.1, 0.2)[0];
  assert.equal(addResult.toFixed(7), (0.1 + 0.2).toFixed(7));
  gpu.destroy();
}

test('precision auto', () => {
  precisionTest();
});

test('precision gpu', () => {
  precisionTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('precision webgl', () => {
  precisionTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('precision webgl2', () => {
  precisionTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('precision headlessgl', () => {
  precisionTest('headlessgl');
});

test('precision cpu', () => {
  precisionTest('cpu');
});
