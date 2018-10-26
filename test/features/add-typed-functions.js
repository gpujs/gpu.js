(function() {
  function vec2Test(mode) {
    var gpu = new GPU({ mode: mode });
    function typedFunction() {
      return [1, 2];
    }
    gpu.addFunction(typedFunction, {
      returnType: 'vec2'
    });
    var kernel = gpu.createKernel(function() {
      var result = typedFunction();
      return result[0] + result[1];
    })
      .setOutput([1]);
    var result = kernel();
    QUnit.assert.equal(result[0], 3);
  }

  QUnit.test( 'add typed functions - vec2 - (auto)', function() {
    vec2Test(null);
  });
})();