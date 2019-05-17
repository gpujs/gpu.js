const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #349 divide by 3');

function testDivideByThree(mode) {
  const gpu = new GPU({mode});
  const k = gpu.createKernel(function (v1, v2) {
    return v1 / v2;
  }, {
    output: [1],
    precision: 'single'
  });
  assert.equal(k(6, 3)[0], 2);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('Issue #349 - divide by three auto', () => {
  testDivideByThree();
});

(GPU.isSinglePrecisionSupported ? test : skip)('Issue #349 - divide by three gpu', () => {
  testDivideByThree('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('Issue #349 - divide by three webgl', () => {
  testDivideByThree('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #349 - divide by three webgl2', () => {
  testDivideByThree('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #349 - divide by three headlessgl', () => {
  testDivideByThree('headlessgl');
});

test('Issue #349 - divide by three cpu', () => {
  testDivideByThree('cpu');
});


describe('issue #349 divide by random numbers');
function someRandomWholeNumberDivisions(mode) {
  const DATA_MAX = 1024 * 1024;
  const dividendData = new Float32Array(DATA_MAX);
  const divisorData = new Float32Array(DATA_MAX);
  const expectedResults = new Float32Array(DATA_MAX);
  const maxWholeNumberRepresentation = Math.sqrt(16777217);
  for (let i = 0; i < DATA_MAX; i++) {
    divisorData[i] = parseInt(Math.random() * maxWholeNumberRepresentation + 1, 10);
    expectedResults[i] = parseInt(Math.random() * maxWholeNumberRepresentation + 1, 10);
    dividendData[i] = divisorData[i] * expectedResults[i];
  }
  const gpu = new GPU({mode});
  const k = gpu.createKernel(function (v1, v2) {
    return v1[this.thread.x] / v2[this.thread.x];
  }, {
    output: [DATA_MAX],
    precision: 'single'
  });
  const result = k(dividendData, divisorData);
  let same = true;
  let i = 0;
  for (; i < DATA_MAX; i++) {
    if (result[i] !== expectedResults[i]) {
      same = false;
      break;
    }
  }
  assert.ok(same, same ? "" : "not all elements are the same, failed on index:" + i + " " + dividendData[i] + "/" + divisorData[i]);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('Issue #349 - some random whole number divisions auto', () => {
  someRandomWholeNumberDivisions();
});
(GPU.isSinglePrecisionSupported ? test : skip)('Issue #349 - some random whole number divisions gpu', () => {
  someRandomWholeNumberDivisions('gpu');
});
(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('Issue #349 - some random whole number divisions webgl', () => {
  someRandomWholeNumberDivisions('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('Issue #349 - some random whole number divisions webgl2', () => {
  someRandomWholeNumberDivisions('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('Issue #349 - some random whole number divisions headlessgl', () => {
  someRandomWholeNumberDivisions('headlessgl');
});
test('Issue #349 - some random whole number divisions cpu', () => {
  someRandomWholeNumberDivisions('cpu');
});


describe('issue #349 disable integer division bug');
function testDisableFixIntegerDivisionBug(mode) {
  const gpu = new GPU({mode});
  const idFix = gpu.createKernel(function(v1, v2) {
    return v1 / v2;
  }, { precision: 'single', output: [1] });

  const idDixOff = gpu.createKernel(function(v1, v2) {
    return v1 / v2;
  }, {
    output: [1],
    precision: 'single',
    fixIntegerDivisionAccuracy: false
  });

  if (!gpu.Kernel.features.isIntegerDivisionAccurate) {
    assert.ok(
      (
        idFix(6, 3)[0] === 2
        && idFix(6030401, 3991)[0] === 1511
      ) && (
        idDixOff(6, 3)[0] !== 2
        || idDixOff(6030401, 3991)[0] !== 1511
      ), "when bug is present should show bug!");
  } else {
    assert.ok(idFix(6, 3)[0] === 2 && idDixOff(6, 3)[0] === 2, "when bug isn't present should not show bug!");
  }
  gpu.destroy();
}
(GPU.isSinglePrecisionSupported ? test : skip)('Issue #349 - test disable fix integer division bug auto', () => {
  testDisableFixIntegerDivisionBug();
});

(GPU.isSinglePrecisionSupported ? test : skip)('Issue #349 - test disable fix integer division bug gpu', () => {
  testDisableFixIntegerDivisionBug('gpu');
});

(GPU.isSinglePrecisionSupported  && GPU.isWebGLSupported ? test : skip)('Issue #349 - test disable fix integer division bug webgl', () => {
  testDisableFixIntegerDivisionBug('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #349 - test disable fix integer division bug webgl2', () => {
  testDisableFixIntegerDivisionBug('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #349 - test disable fix integer division bug headlessgl', () => {
  testDisableFixIntegerDivisionBug('headlessgl');
});

test('Issue #349 - test disable fix integer division bug cpu', () => {
  testDisableFixIntegerDivisionBug('cpu');
});
