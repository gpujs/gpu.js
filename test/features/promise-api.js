var GPU = require('../../src/index');

(function() {
  function promiseApiFunctionReturn( assert, mode ) {
    const gpu = new GPU({ mode: mode });

    const kernelFn = function() {
      return 42.0;
    };

    const paramObj = {
      output : [1]
    };

    // Start of async test
    const done = assert.async();
    let promiseObj;

    // Setup kernel
    const kernel = gpu.createKernel(kernelFn, paramObj);
    // Get promise object
    promiseObj = kernel.execute();
    assert.ok( promiseObj !== null, 'Promise object generated test');
    promiseObj
      .then((res) => {
        assert.equal( res[0], 42.0 );
        gpu.destroy();
        done();
      })
      .catch((err) => {
        throw err;
      });
  }

  QUnit.test('Promise API : functionReturn (auto)', function(assert) {
    promiseApiFunctionReturn(assert, null);
  });

  QUnit.test('Promise API : functionReturn (gpu)', function(assert) {
    promiseApiFunctionReturn(assert, 'gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('Promise API : functionReturn (webgl)', function (assert) {
    promiseApiFunctionReturn(assert, 'webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('Promise API : functionReturn (webgl2)', function (assert) {
    promiseApiFunctionReturn(assert, 'webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('Promise API : functionReturn (headlessgl)', function (assert) {
    promiseApiFunctionReturn(assert, 'headlessgl');
  });

  QUnit.test('Promise API : functionReturn (cpu)', function(assert) {
    promiseApiFunctionReturn(assert, 'cpu');
  });
})();
