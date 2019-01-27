(function() {
  const GPU = require('../../src/index');
  //
  // See: https://github.com/gpujs/gpu.js/issues/31
  //

  // nested redeclare
  function nestedVarRedeclareFunction() {
    let result = 0;

    // outer loop limit is effectively skipped in CPU
    for(let i=0; i<10; ++i) {
      // inner loop limit should be higher, to avoid infinite loops
      for(i=0; i<20; ++i) {
        result += 1;
      }
    }

    return result;
  }

  function nestedVarRedeclareTest(mode ) {
    const gpu = new GPU({ mode: mode });
    const f = gpu.createKernel(nestedVarRedeclareFunction, {
      output : [1]
    });
    QUnit.assert.throws(() => {
      f();
    });
    gpu.destroy();
  }

  QUnit.test('Issue #31 - nestedVarRedeclare (auto)', () => {
    nestedVarRedeclareTest(null);
  });

  QUnit.test('Issue #31 - nestedVarRedeclare (gpu)', () => {
    nestedVarRedeclareTest('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('Issue #31 - nestedVarRedeclare (webgl)', () => {
    nestedVarRedeclareTest('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('Issue #31 - nestedVarRedeclare (webgl2)', () => {
    nestedVarRedeclareTest('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('Issue #31 - nestedVarRedeclare (headlessgl)', () => {
    nestedVarRedeclareTest('headlessgl');
  });

  QUnit.test('Issue #31 - nestedVarRedeclare (cpu)', () => {
    nestedVarRedeclareTest('cpu');
  });

  QUnit.test('Issue #31 - nestedVarRedeclare : AST handling (webgl)', () => {
    const builder = new GPU.FunctionBuilder({
      functionNodes: [new GPU.WebGLFunctionNode(nestedVarRedeclareFunction.toString())]
    });
    QUnit.assert.throws(() => {
      builder.getStringFromFunctionNames(['nestedVarRedeclareFunction']);
    });
  });

  QUnit.test('Issue #31 - nestedVarRedeclare : AST handling (webgl2)', () => {
    const builder = new GPU.FunctionBuilder({
      functionNodes: [new GPU.WebGL2FunctionNode(nestedVarRedeclareFunction.toString())]
    });
    QUnit.assert.throws(() => {
      builder.getStringFromFunctionNames(['nestedVarRedeclareFunction']);
    });
  });

  QUnit.test('Issue #31 - nestedVarRedeclare : AST handling (cpu)', () => {
    const builder = new GPU.FunctionBuilder({
      functionNodes: [new GPU.CPUFunctionNode(nestedVarRedeclareFunction.toString())]
    });
    QUnit.assert.throws(() => {
      builder.getStringFromFunctionNames(['nestedVarRedeclareFunction'])
    });
  });

  // nested declare
  function nestedVarDeclareFunction() {
    let result = 0.0;

    // outer loop limit is effectively skipped in CPU
    for(let i=0; i<10; ++i) {
      // inner loop limit should be higher, to avoid infinite loops
      for(let i=0; i<20; ++i) {
        result += 1;
      }
    }

    return result;
  }

  function nestedVarDeclareTest(mode ) {
    const gpu = new GPU({ mode: mode });
    var f = gpu.createKernel(nestedVarDeclareFunction, {
      output : [1]
    });

    QUnit.assert.equal(f(), 200, 0, 'basic return function test');
    gpu.destroy();
  }

  QUnit.test('Issue #31 - nestedVarDeclare (auto)', () => {
    nestedVarDeclareTest(null);
  });

  QUnit.test('Issue #31 - nestedVarDeclare (gpu)', () => {
    nestedVarDeclareTest('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('Issue #31 - nestedVarDeclare (webgl)', () => {
    nestedVarDeclareTest('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('Issue #31 - nestedVarDeclare (webgl2)', () => {
    nestedVarDeclareTest('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('Issue #31 - nestedVarDeclare (headlessgl)', () => {
    nestedVarDeclareTest('headlessgl');
  });

  QUnit.test('Issue #31 - nestedVarDeclare (cpu)', () => {
    nestedVarDeclareTest('cpu');
  });

  QUnit.test('Issue #31 - nestedVarDeclare : AST handling (webgl)', () => {
    const builder = new GPU.FunctionBuilder({
      functionNodes: [new GPU.WebGLFunctionNode(nestedVarDeclareFunction.toString())]
    });

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

  QUnit.test('Issue #31 - nestedVarDeclare : AST handling (webgl2)', () => {
    const builder = new GPU.FunctionBuilder({
      functionNodes: [new GPU.WebGL2FunctionNode(nestedVarDeclareFunction.toString())]
    });

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

  QUnit.test('Issue #31 - nestedVarDeclare : AST handling (cpu)', () => {
    const builder = new GPU.FunctionBuilder({
      functionNodes: [new GPU.CPUFunctionNode(nestedVarDeclareFunction.toString())]
    });

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
