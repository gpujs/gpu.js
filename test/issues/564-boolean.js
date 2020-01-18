const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('issue #564 - boolean handled');

function testBooleanHandled(fft, mode) {
  const gpu = new GPU({ mode });
  gpu.addNativeFunction('fft', fft, { returnType: 'Array(4)' });
  const kernel = gpu.createKernel(
    function(){
      let s = true;
      return fft(s);
    },{
      output:[1],
    }
  );
  assert.deepEqual(Array.from(kernel()[0]), [1,1,1,1]);

  gpu.destroy();
}

const fft = `vec4 fft (bool horizontal){
  return vec4(1,1,horizontal?1:0,1);
}`;
test('auto', () => {
  testBooleanHandled(fft);
});

test('gpu', () => {
  testBooleanHandled(fft, 'gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  testBooleanHandled(fft, 'webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  testBooleanHandled(fft, 'webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testBooleanHandled(fft, 'headlessgl');
});

test('cpu', () => {
  testBooleanHandled(`function fft(horizontal){
  return [1,1,horizontal?1:0,1];
}`, 'cpu');
});