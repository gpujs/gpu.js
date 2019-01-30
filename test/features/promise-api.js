const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('features: promise api');

function promiseApiFunctionReturn(mode, done) {
  const gpu = new GPU({ mode });

  const kernelFn = function() {
    return 42.0;
  };

  const settings = {
    output : [1]
  };

  // Setup kernel
  const kernel = gpu.createKernel(kernelFn, settings);
  // Get promise object
  const promiseObj = kernel.exec();
  assert.ok(promiseObj !== null, 'Promise object generated test');
  promiseObj
    .then((res) => {
      assert.equal(res[0], 42.0 );
      gpu.destroy();
      done();
    })
    .catch((err) => {
      throw err;
    });
}

test('functionReturn auto', t => {
  promiseApiFunctionReturn(null, t.async());
});

test('functionReturn gpu', t => {
  promiseApiFunctionReturn('gpu', t.async());
});

(GPU.isWebGLSupported ? test : skip)('functionReturn webgl', t => {
  promiseApiFunctionReturn('webgl', t.async());
});

(GPU.isWebGL2Supported ? test : skip)('functionReturn webgl2', t => {
  promiseApiFunctionReturn('webgl2', t.async());
});

(GPU.isHeadlessGLSupported ? test : skip)('functionReturn headlessgl', t => {
  promiseApiFunctionReturn('headlessgl', t.async());
});

test('functionReturn cpu', t => {
  promiseApiFunctionReturn('cpu', t.async());
});
