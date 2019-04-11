const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #195');
function makeKernel(gpu) {
  return gpu.createKernel(function(a){
    return a[this.thread.y][this.thread.x];
  })
    .setOutput([matrixSize, matrixSize]);
}

function splitArray(array, part) {
  const result = [];
  for(let i = 0; i < array.length; i += part) {
    result.push(array.slice(i, i + part));
  }
  return result;
}

const matrixSize =  4;
const A = splitArray(Array.apply(null, Array(matrixSize * matrixSize)).map((_, i) => i), matrixSize);

function readFromTexture(mode) {
  const gpu = new GPU({ mode });
  const noTexture = makeKernel(gpu);
  const texture = makeKernel(gpu)
    .setPipeline(true);

  const result = noTexture(A);
  const textureResult = texture(A).toArray(gpu);

  assert.deepEqual(result.map((v) => Array.from(v)), A);
  assert.deepEqual(textureResult.map((v) => Array.from(v)), A);
  assert.deepEqual(textureResult, result);
  gpu.destroy();
}

test("Issue #195 Read from Texture 2D (GPU only) auto", () => {
  readFromTexture();
});

test("Issue #195 Read from Texture 2D (GPU only) gpu", () => {
  readFromTexture('gpu');
});

(GPU.isWebGLSupported ? test : skip)("Issue #195 Read from Texture 2D (GPU only) webgl", () => {
  readFromTexture('webgl');
});

(GPU.isWebGL2Supported ? test : skip)("Issue #195 Read from Texture 2D (GPU Only) webgl2", () => {
  readFromTexture('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)("Issue #195 Read from Texture 2D (GPU Only) headlessgl", () => {
  readFromTexture('headlessgl');
});

