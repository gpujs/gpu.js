const { assert, test, skip, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('internal: Function return type detection');

function canDetectNumberFromAddedFunction(mode) {
  const gpu = new GPU({ mode });
  function number() {
    return 1;
  }
  gpu.addFunction(number);
  const kernel = gpu.createKernel(function() {
    const values = number();
    return values + values;
  }, { output: [1] });

  const result = kernel();
  assert.equal(result[0], 2);

  gpu.destroy();
}

test('can detect Number auto', () => {
  canDetectNumberFromAddedFunction();
});

test('can detect Number gpu', () => {
  canDetectNumberFromAddedFunction('gpu');
});

(GPU.isWebGLSupported ? test : skip)('can detect Number webgl', () => {
  canDetectNumberFromAddedFunction('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('can detect Number webgl2', () => {
  canDetectNumberFromAddedFunction('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('can detect Number headlessgl', () => {
  canDetectNumberFromAddedFunction('headlessgl');
});

test('can detect Number cpu', () => {
  canDetectNumberFromAddedFunction('cpu');
});

function canDetectArray2FromAddedFunction(mode) {
  const gpu = new GPU({ mode });
  function array2() {
    return [1, 2];
  }
  gpu.addFunction(array2);
  const kernel = gpu.createKernel(function() {
    const values = array2();
    return values[0] + values[1];
  }, { output: [1] });

  const result = kernel();
  assert.equal(result[0], 3);

  gpu.destroy();
}

test('can detect Array(2) auto', () => {
  canDetectArray2FromAddedFunction();
});

test('can detect Array(2) gpu', () => {
  canDetectArray2FromAddedFunction('gpu');
});

(GPU.isWebGLSupported ? test : skip)('can detect Array(2) webgl', () => {
  canDetectArray2FromAddedFunction('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('can detect Array(2) webgl2', () => {
  canDetectArray2FromAddedFunction('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('can detect Array(2) headlessgl', () => {
  canDetectArray2FromAddedFunction('headlessgl');
});

test('can detect Array(2) cpu', () => {
  canDetectArray2FromAddedFunction('cpu');
});


function canDetectArray3FromAddedFunction(mode) {
  const gpu = new GPU({ mode });
  function array2() {
    return [1, 2, 3];
  }
  gpu.addFunction(array2);
  const kernel = gpu.createKernel(function() {
    const values = array2();
    return values[0] + values[1] + values[2];
  }, { output: [1] });

  const result = kernel();
  assert.equal(result[0], 6);

  gpu.destroy();
}

test('can detect Array(3) auto', () => {
  canDetectArray3FromAddedFunction();
});

test('can detect Array(3) gpu', () => {
  canDetectArray3FromAddedFunction('gpu');
});

(GPU.isWebGLSupported ? test : skip)('can detect Array(3) webgl', () => {
  canDetectArray3FromAddedFunction('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('can detect Array(3) webgl2', () => {
  canDetectArray3FromAddedFunction('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('can detect Array(3) headlessgl', () => {
  canDetectArray3FromAddedFunction('headlessgl');
});

test('can detect Array(3) cpu', () => {
  canDetectArray3FromAddedFunction('cpu');
});


function canDetectArray4FromAddedFunction(mode) {
  const gpu = new GPU({ mode });
  function array2() {
    return [1, 2, 3, 4];
  }
  gpu.addFunction(array2);
  const kernel = gpu.createKernel(function() {
    const values = array2();
    return values[0] + values[1] + values[2] + values[3];
  }, { output: [1] });

  const result = kernel();
  assert.equal(result[0], 10);

  gpu.destroy();
}

test('can detect Array(4) auto', () => {
  canDetectArray4FromAddedFunction();
});

test('can detect Array(4) gpu', () => {
  canDetectArray4FromAddedFunction('gpu');
});

(GPU.isWebGLSupported ? test : skip)('can detect Array(4) webgl', () => {
  canDetectArray4FromAddedFunction('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('can detect Array(4) webgl2', () => {
  canDetectArray4FromAddedFunction('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('can detect Array(4) headlessgl', () => {
  canDetectArray4FromAddedFunction('headlessgl');
});

test('can detect Array(4) cpu', () => {
  canDetectArray4FromAddedFunction('cpu');
});
