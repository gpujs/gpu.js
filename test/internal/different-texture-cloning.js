const { assert, test, module: describe, only, skip } = require('qunit');
const { GPU } = require('../../src');

describe('internal: different texture cloning');

function testArrayThenArray1D4(mode) {
  const gpu = new GPU({ mode });
  function createTextureOf(value, type) {
    return (gpu.createKernel(function(value) {
      return value[this.thread.x];
    }, {
      output: [1],
      pipeline: true,
      argumentTypes: { value: type }
    }))(value);
  }
  const arrayTexture = createTextureOf([1], 'Array');
  const arrayTextureClone = arrayTexture.clone();
  const array4Texture = createTextureOf([[1,2,3,4]], 'Array1D(4)');
  const array4TextureClone = array4Texture.clone();
  assert.notEqual(arrayTextureClone, array4TextureClone);
  assert.deepEqual(arrayTextureClone.toArray(), new Float32Array([1]));
  assert.deepEqual(array4TextureClone.toArray(), [new Float32Array([1,2,3,4])]);
  gpu.destroy();
}

test('Array then Array1D(4) auto', () => {
  testArrayThenArray1D4();
});

(GPU.isWebGLSupported ? test : skip)('Array then Array1D(4) webgl', () => {
  testArrayThenArray1D4('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Array then Array1D(4) webgl2', () => {
  testArrayThenArray1D4('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Array then Array1D(4) headlessgl', () => {
  testArrayThenArray1D4('headlessgl');
});

function testArray1D4ThenArray(mode) {
  const gpu = new GPU({ mode });
  function createTextureOf(value, type) {
    return (gpu.createKernel(function(value) {
      return value[this.thread.x];
    }, {
      output: [1],
      pipeline: true,
      argumentTypes: { value: type }
    }))(value);
  }
  const array4Texture = createTextureOf([[1,2,3,4]], 'Array1D(4)');
  const array4TextureClone = array4Texture.clone();
  const arrayTexture = createTextureOf([1], 'Array');
  const arrayTextureClone = arrayTexture.clone();
  assert.notEqual(array4TextureClone, arrayTextureClone);
  assert.deepEqual(array4TextureClone.toArray(), [new Float32Array([1,2,3,4])]);
  assert.deepEqual(arrayTextureClone.toArray(), new Float32Array([1]));
  gpu.destroy();
}

test('Array1D(4) then Array auto', () => {
  testArray1D4ThenArray();
});

(GPU.isWebGLSupported ? test : skip)('Array1D(4) then Array webgl', () => {
  testArray1D4ThenArray('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Array1D(4) then Array webgl2', () => {
  testArray1D4ThenArray('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Array1D(4) then Array headlessgl', () => {
  testArray1D4ThenArray('headlessgl');
});
