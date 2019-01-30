const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('features: demo');

function demo(mode) {
  const matrixSize = 6;
  let a = new Array(matrixSize * matrixSize);
  let b = new Array(matrixSize * matrixSize);
  a = splitArray(fillArrayRandom(a), matrixSize);
  b = splitArray(fillArrayRandom(b), matrixSize);
  function fillArrayRandom(array) {
    for(let i = 0; i < array.length; i++) {
      array[i] = Math.random();
    }
    return array;
  }

  function splitArray(array, part) {
    const result = [];
    for(let i = 0; i < array.length; i += part) {
      result.push(array.slice(i, i + part));
    }
    return result;
  }
  const gpu = new GPU({ mode });
  const multiplyMatrix = gpu.createKernel(function(a, b) {
    let sum = 0;
    for (let i = 0; i < 6; i++) {
      sum += a[this.thread.y][i] * b[i][this.thread.x];
    }
    return sum;
  })
    .setOutput([6, 6]);

  assert.ok( multiplyMatrix !== null, "function generated test");
  assert.equal(multiplyMatrix(a, b).length, 6, "basic return function test");
  gpu.destroy();
}

test("auto", () => {
  demo();
});

test("gpu", () => {
  demo('gpu');
});

(GPU.isWebGLSupported ? test : skip)("webgl", function () {
  demo('webgl');
});

(GPU.isWebGL2Supported ? test : skip)("webgl2", function () {
  demo('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)("headlessgl", function () {
  demo('headlessgl');
});

test("cpu", () => {
  demo('cpu');
});
