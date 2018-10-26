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
    gpu.destroy();
  }

  QUnit.test( 'add typed functions - vec2 - (auto)', function() {
    vec2Test(null);
  });
  QUnit.test( 'add typed functions - vec2 - (webgl2)', function() {
    vec2Test('webgl2');
  });
  QUnit.test( 'add typed functions - vec2 - (webgl)', function() {
    vec2Test('webgl');
  });
})();

(function() {
  function vec3Test(mode) {
    var gpu = new GPU({ mode: mode });
    function typedFunction() {
      return [1, 2, 3];
    }
    gpu.addFunction(typedFunction, {
      returnType: 'vec3'
    });
    var kernel = gpu.createKernel(function() {
      var result = typedFunction();
      return result[0] + result[1] + result[2];
    })
      .setOutput([1]);
    var result = kernel();
    QUnit.assert.equal(result[0], 6);
    gpu.destroy();
  }

  QUnit.test( 'add typed functions - vec3 - (auto)', function() {
    vec3Test(null);
  });
  QUnit.test( 'add typed functions - vec3 - (webgl2)', function() {
    vec3Test('webgl2');
  });
  QUnit.test( 'add typed functions - vec3 - (webgl)', function() {
    vec3Test('webgl');
  });
})();

(function() {
  function vec4Test(mode) {
    var gpu = new GPU({ mode: mode });
    function typedFunction() {
      return [1, 2, 3, 4];
    }
    gpu.addFunction(typedFunction, {
      returnType: 'vec4'
    });
    var kernel = gpu.createKernel(function() {
      var result = typedFunction();
      return result[0] + result[1] + result[2] + result[3];
    })
      .setOutput([1]);
    var result = kernel();
    QUnit.assert.equal(result[0], 10);
    gpu.destroy();
  }

  QUnit.test( 'add typed functions - vec4 - (auto)', function() {
    vec4Test(null);
  });
  QUnit.test( 'add typed functions - vec4 - (webgl2)', function() {
    vec4Test('webgl2');
  });
  QUnit.test( 'add typed functions - vec4 - (webgl)', function() {
    vec4Test('webgl');
  });
})();