var GPU = require('../../src/index');
require('qunit-assert-close');

(function() {
  //
  // See: https://github.com/gpujs/gpu.js/issues/31
  //

  // nested redeclare
  function nestedVarRedeclareFunction() {
    var result = 0.0;

    // outer loop limit is effectively skipped in CPU
    for(var i=0; i<10; ++i) {
      // inner loop limit should be higher, to avoid infinite loops
      for(i=0; i<20; ++i) {
        result += 1;
      }
    }

    return result;
  }

  function nestedVarRedeclareTest(mode ) {
    var gpu = new GPU({ mode: mode });
    var f = gpu.createKernel(nestedVarRedeclareFunction, {
      output : [1]
    });
    QUnit.assert.throws(function() {
      f();
    });
    gpu.destroy();
  }

  QUnit.test('Issue #31 - nestedVarRedeclare (auto)', function() {
    nestedVarRedeclareTest(null);
  });

  QUnit.test('Issue #31 - nestedVarRedeclare (gpu)', function() {
    nestedVarRedeclareTest('gpu');
  });

  (GPU.isWebGlSupported() ? QUnit.test : QUnit.skip)('Issue #31 - nestedVarRedeclare (webgl)', function() {
    nestedVarRedeclareTest('webgl');
  });

  (GPU.isWebGl2Supported() ? QUnit.test : QUnit.skip)('Issue #31 - nestedVarRedeclare (webgl2)', function() {
    nestedVarRedeclareTest('webgl2');
  });

  (GPU.isHeadlessGlSupported() ? QUnit.test : QUnit.skip)('Issue #31 - nestedVarRedeclare (headlessgl)', function() {
    nestedVarRedeclareTest('headlessgl');
  });

  QUnit.test('Issue #31 - nestedVarRedeclare (cpu)', function() {
    nestedVarRedeclareTest('cpu');
  });

  QUnit.test('Issue #31 - nestedVarRedeclare : AST handling (webgl)', function() {
    var builder = new GPU.WebGLFunctionBuilder();
    QUnit.assert.throws(function() {
      builder.addFunction(null, nestedVarRedeclareFunction);
      builder.getStringFromFunctionNames(['nestedVarRedeclareFunction']);
    });
  });

  QUnit.test('Issue #31 - nestedVarRedeclare : AST handling (webgl2)', function() {
    var builder = new GPU.WebGL2FunctionBuilder();
    QUnit.assert.throws(function() {
      builder.addFunction(null, nestedVarRedeclareFunction);
      builder.getStringFromFunctionNames(['nestedVarRedeclareFunction']);
    });
  });

  QUnit.test('Issue #31 - nestedVarRedeclare : AST handling (headlessgl)', function() {
    var builder = new GPU.HeadlessGLFunctionBuilder();
    QUnit.assert.throws(function() {
      builder.addFunction(null, nestedVarRedeclareFunction);
      builder.getStringFromFunctionNames(['nestedVarRedeclareFunction']);
    });
  });

  QUnit.test('Issue #31 - nestedVarRedeclare : AST handling (cpu)', function() {
    var builder = new GPU.CPUFunctionBuilder();
    QUnit.assert.throws(function() {
      builder.addFunction(null, nestedVarRedeclareFunction);
      builder.getStringFromFunctionNames(['nestedVarRedeclareFunction'])
    });
  });



  // nested declare
  function nestedVarDeclareFunction() {
    var result = 0.0;

    // outer loop limit is effectively skipped in CPU
    for(var i=0; i<10; ++i) {
      // inner loop limit should be higher, to avoid infinite loops
      for(var i=0; i<20; ++i) {
        result += 1;
      }
    }

    return result;
  }

  function nestedVarDeclareTest(mode ) {
    var gpu = new GPU({ mode: mode });
    var f = gpu.createKernel(nestedVarDeclareFunction, {
      output : [1]
    });

    QUnit.assert.equal(f(), 200, 0, 'basic return function test');
    gpu.destroy();
  }

  QUnit.test('Issue #31 - nestedVarDeclare (auto)', function() {
    nestedVarDeclareTest(null);
  });

  QUnit.test('Issue #31 - nestedVarDeclare (gpu)', function() {
    nestedVarDeclareTest('gpu');
  });

  (GPU.isWebGlSupported() ? QUnit.test : QUnit.skip)('Issue #31 - nestedVarDeclare (webgl)', function() {
    nestedVarDeclareTest('webgl');
  });

  (GPU.isWebGl2Supported() ? QUnit.test : QUnit.skip)('Issue #31 - nestedVarDeclare (webgl2)', function() {
    nestedVarDeclareTest('webgl2');
  });

  (GPU.isHeadlessGlSupported() ? QUnit.test : QUnit.skip)('Issue #31 - nestedVarDeclare (headlessgl)', function() {
    nestedVarDeclareTest('headlessgl');
  });

  QUnit.test('Issue #31 - nestedVarDeclare (cpu)', function() {
    nestedVarDeclareTest('cpu');
  });

  QUnit.test('Issue #31 - nestedVarDeclare : AST handling (webgl)', function() {
    var builder = new GPU.WebGLFunctionBuilder();
    builder.addFunction(null, nestedVarDeclareFunction);

    QUnit.assert.equal(
      builder.getStringFromFunctionNames(['nestedVarDeclareFunction']),
      'float nestedVarDeclareFunction() {'
      + '\nfloat user_result=0.0;'
      + '\nfor (int user_i=0;(user_i<10);++user_i){'
      + '\nfor (int user_i=0;(user_i<20);++user_i){' //<-- Note: don't do this in real life!
      + '\nuser_result+=1.0;}'
      + '\n}'
      + '\n'
      + '\nreturn user_result;'
      + '\n}'
    );
  });

  QUnit.test('Issue #31 - nestedVarDeclare : AST handling (webgl2)', function() {
    var builder = new GPU.WebGL2FunctionBuilder();
    builder.addFunction(null, nestedVarDeclareFunction);

    QUnit.assert.equal(
      builder.getStringFromFunctionNames(['nestedVarDeclareFunction']),
      'float nestedVarDeclareFunction() {'
      + '\nfloat user_result=0.0;'
      + '\nfor (int user_i=0;(user_i<10);++user_i){'
      + '\nfor (int user_i=0;(user_i<20);++user_i){' //<-- Note: don't do this in real life!
      + '\nuser_result+=1.0;}'
      + '\n}'
      + '\n'
      + '\nreturn user_result;'
      + '\n}'
    );
  });

  QUnit.test('Issue #31 - nestedVarDeclare : AST handling (headlessgl)', function() {
    var builder = new GPU.HeadlessGLFunctionBuilder();
    builder.addFunction(null, nestedVarDeclareFunction);

    QUnit.assert.equal(
      builder.getStringFromFunctionNames(['nestedVarDeclareFunction']),
      'float nestedVarDeclareFunction() {'
      + '\nfloat user_result=0.0;'
      + '\nfor (int user_i=0;(user_i<10);++user_i){'
      + '\nfor (int user_i=0;(user_i<20);++user_i){' //<-- Note: don't do this in real life!
      + '\nuser_result+=1.0;}'
      + '\n}'
      + '\n'
      + '\nreturn user_result;'
      + '\n}'
    );
  });

  QUnit.test('Issue #31 - nestedVarDeclare : AST handling (cpu)', function() {
    var builder = new GPU.CPUFunctionBuilder();
    builder.addFunction(null, nestedVarDeclareFunction);

    QUnit.assert.equal(
      builder.getStringFromFunctionNames(['nestedVarDeclareFunction']),
      'function nestedVarDeclareFunction() {'
      + '\nlet user_result=0;'
      + '\nfor (let user_i=0;(user_i<10);++user_i){'
      + '\nfor (let user_i=0;(user_i<20);++user_i){'
      + '\nuser_result+=1;}'
      + '\n}'
      + '\n'
      + '\nreturn user_result;'
      + '\n}'
    );
  });
})();
