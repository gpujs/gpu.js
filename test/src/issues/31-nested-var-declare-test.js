(function() {
  //
  // See: https://github.com/gpujs/gpu.js/issues/31
  //
  function nestedVarDeclareFunction() {
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

  function nestedVarDeclareTest( mode ) {
    var gpu = new GPU({ mode: mode });
    var f = gpu.createKernel(nestedVarDeclareFunction, {
      output : [1]
    });

    QUnit.assert.ok( f !== null, 'function generated test');
    QUnit.assert.close(f(), (mode === null || mode === 'webgl' ? 200 : 20), 0.00, 'basic return function test');
  }

  QUnit.test( 'Issue #31 - nestedVarDeclare (auto)', function() {
    QUnit.assert.throws(function() {
      nestedVarDeclareTest(null);
    });
  });

  QUnit.test( 'Issue #31 - nestedVarDeclare (gpu)', function() {
    QUnit.assert.throws(function() {
      nestedVarDeclareTest('gpu');
    });
  });

  QUnit.test( 'Issue #31 - nestedVarDeclare (webgl)', function() {
    QUnit.assert.throws(function() {
      nestedVarDeclareTest('webgl');
    });
  });

  QUnit.test( 'Issue #31 - nestedVarDeclare (webgl2)', function() {
    QUnit.assert.throws(function() {
      nestedVarDeclareTest('webgl2');
    });
  });

  QUnit.test( 'Issue #31 - nestedVarDeclare (cpu)', function() {
    nestedVarDeclareTest('cpu');
  });

  QUnit.test( 'Issue #31 - nestedVarDeclare : AST handling', function() {
    var builder = new GPU.WebGLFunctionBuilder();
    QUnit.assert.throws(function() {
      builder.addFunction(null, nestedVarDeclareFunction);

      QUnit.assert.equal(
        builder.getStringFromFunctionNames(['nestedVarDeclareFunction']).replace(new RegExp('\n', 'g'), ''),
        'float nestedVarDeclareFunction() {'+
          'float user_result=0.0;'+
          ''+
          'for (float user_i=0.0;(user_i<10.0);++user_i){'+
            'for (float user_i=0.0;(user_i<20.0);++user_i){'+ //<-- Note: don't do this in real life!
              'user_result+=1.0;'+
            '}'+
          '}'+
          ''+
          'return user_result;'+
        '}'
      );
    });
  });
})();