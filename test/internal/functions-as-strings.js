const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('internal: functions-as-atrings');

function functionsAsStrings(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(`function() {
    let x = frodo(0)
    return x;
  }`, {
    output: [1],
  });
  kernel.addFunction(`function frodo(a){
    return a + 1
  }`)
  const result = kernel();
  console.log('result',result)
  assert.equal(result[0],1);
  gpu.destroy();
}

test('boolean expression false auto', () => {
  functionsAsStrings();
});

test('boolean expression false gpu', () => {
  functionsAsStrings('gpu');
});

(GPU.isWebGLSupported ? test : skip)('boolean expression false webgl', () => {
  functionsAsStrings('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('boolean expression false webgl2', () => {
  functionsAsStrings('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('boolean expression false headlessgl', () => {
  functionsAsStrings('headlessgl');
});

test('boolean expression false cpu', () => {
  functionsAsStrings('cpu');
});
