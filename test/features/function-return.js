(function() {
  function functionReturn( mode ) {
    var gpu = new GPU({ mode: mode });
    var f = gpu.createKernel(function() {
      return 42.0;
    }, {
      output : [1]
    });
    QUnit.assert.ok( f !== null, "function generated test");
    QUnit.assert.close(f()[0], 42.0, 0.01, "basic return function test");
    gpu.destroy();
  }
  
  QUnit.test( "functionReturn (auto)", function() {
    functionReturn(null);
  });

  QUnit.test( "functionReturn (gpu)", function() {
    functionReturn("gpu");
  });

  QUnit.test( "functionReturn (webgl)", function() {
    functionReturn("webgl");
  });
  
  QUnit.test( "functionReturn (webgl2)", function() {
    functionReturn("webgl2");
  });
  
  QUnit.test( "functionReturn (CPU)", function() {
    functionReturn("cpu");
  });
})();