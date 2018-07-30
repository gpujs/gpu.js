(function() {
  function promiseApiFunctionReturn( assert, mode ) {
    var gpu = new GPU({ mode: mode });
    
    var kernelFn = function() {
      return 42.0;
    };
    
    var paramObj = {
      output : [1]
    };
    
    // Start of async test
    var done = assert.async();
    var promiseObj;
    
    // Setup kernel
    var kernel = gpu.createKernel(kernelFn, paramObj);
    // Get promise objet
    promiseObj = kernel.execute();
    assert.ok( promiseObj !== null, 'Promise object generated test');
    promiseObj.then(function(res) {
      assert.equal( res[0], 42.0 );
      gpu.destroy();
      done();
    }, function(err) {
      throw err;
    });
  }
  
  QUnit.test( 'Promise API : functionReturn (auto)', function(assert) {
    promiseApiFunctionReturn(assert, null);
  });
  
  QUnit.test( 'Promise API : functionReturn (gpu)', function(assert) {
    promiseApiFunctionReturn(assert, 'gpu');
  });

  QUnit.test( 'Promise API : functionReturn (webgl)', function(assert) {
    promiseApiFunctionReturn(assert, 'webgl');
  });

  QUnit.test( 'Promise API : functionReturn (webgl2)', function(assert) {
    promiseApiFunctionReturn(assert, 'webgl2');
  });
  
  QUnit.test( 'Promise API : functionReturn (cpu)', function(assert) {
    promiseApiFunctionReturn(assert, 'cpu');
  });
})();