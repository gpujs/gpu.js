var GPU = require('../../src/index');

QUnit.test('loop int constant output (webgl)', function(assert) {
  function kernel(a) {
    var sum = 0;
    for (var i = 0; i < this.constants.max; i++) {
      sum += a[this.thread.x][i];
    }
    return sum;
  }
  var functionNode = new GPU.WebGLFunctionNode('kernel', kernel, { isRootKernel: true });
  assert.equal(
    functionNode.getFunctionString(),
    'void kernel() {' +
    '\nfloat user_sum=0.0;' +
    '\nfor (int user_i=0;(user_i<constants_max);user_i++){' +
    '\nuser_sum+=get(user_a, user_aSize, user_aDim, user_aBitRatio, threadId.x, user_i);}' +
    '\n' +
    '\nkernelResult = user_sum;return;' +
    '\n}');
});

QUnit.test('loop int constant (webgl)', function(assert) {
  function kernel(a) {
    var sum = 0;
    for (var i = 0; i < this.constants.max; i++) {
      sum += a[this.thread.x][i];
    }
    return sum;
  }
  var gpu = new GPU({ mode: 'webgl' });
  var output = gpu.createKernel(kernel, {
    constants: { max: 3 },
    output: [1]
  })([[1,2,3]]);

  assert.equal(
    output,
    6
  );
  gpu.destroy();
});

QUnit.test('loop int constant output (webgl2)', function(assert) {
  function kernel(a) {
    var sum = 0;
    for (var i = 0; i < this.constants.max; i++) {
      sum += a[this.thread.x][i];
    }
    return sum;
  }
  var functionNode = new GPU.WebGL2FunctionNode('kernel', kernel, { isRootKernel: true });
  assert.equal(
    functionNode.getFunctionString(),
    'void kernel() {' +
    '\nfloat user_sum=0.0;' +
    '\nfor (int user_i=0;(user_i<constants_max);user_i++){' +
    '\nuser_sum+=get(user_a, user_aSize, user_aDim, user_aBitRatio, threadId.x, user_i);}' +
    '\n' +
    '\nkernelResult = user_sum;return;' +
    '\n}');
});

QUnit.test('loop int constant (webgl2)', function(assert) {
  function kernel(a) {
    var sum = 0;
    for (var i = 0; i < this.constants.max; i++) {
      sum += a[this.thread.x][i];
    }
    return sum;
  }
  var gpu = new GPU({ mode: 'webgl2' });
  var output = gpu.createKernel(kernel, {
    constants: { max: 3 },
    output: [1]
  })([[1,2,3]]);

  assert.equal(
    output,
    6
  );
  gpu.destroy();
});

QUnit.test('loop int literal output (webgl)', function(assert) {
  function kernel(a) {
    var sum = 0;
    for (var i = 0; i < 10; i++) {
      sum += a[this.thread.x][i];
    }
    return sum;
  }
  var functionNode = new GPU.WebGLFunctionNode('kernel', kernel, { isRootKernel: true });
  assert.equal(
    functionNode.getFunctionString(),
    'void kernel() {' +
    '\nfloat user_sum=0.0;' +
    '\nfor (int user_i=0;(user_i<10);user_i++){' +
    '\nuser_sum+=get(user_a, user_aSize, user_aDim, user_aBitRatio, threadId.x, user_i);}' +
    '\n' +
    '\nkernelResult = user_sum;return;' +
    '\n}');
});

QUnit.test('loop int literal (webgl)', function(assert) {
  function kernel(a) {
    var sum = 0;
    for (var i = 0; i < 3; i++) {
      sum += a[this.thread.x][i];
    }
    return sum;
  }
  var gpu = new GPU({ mode: 'webgl' });
  var output = gpu.createKernel(kernel, { output: [1] })([[1,2,3]]);
  assert.equal(
    output,
    6
  );
  gpu.destroy();
});

QUnit.test('loop int literal output (webgl2)', function(assert) {
  function kernel(a) {
    var sum = 0;
    for (var i = 0; i < 10; i++) {
      sum += a[this.thread.x][i];
    }
    return sum;
  }
  var functionNode = new GPU.WebGL2FunctionNode('kernel', kernel, { isRootKernel: true });
  assert.equal(
    functionNode.getFunctionString(),
    'void kernel() {' +
    '\nfloat user_sum=0.0;' +
    '\nfor (int user_i=0;(user_i<10);user_i++){' +
    '\nuser_sum+=get(user_a, user_aSize, user_aDim, user_aBitRatio, threadId.x, user_i);}' +
    '\n' +
    '\nkernelResult = user_sum;return;' +
    '\n}');
});

QUnit.test('loop int literal (webgl2)', function(assert) {
  function kernel(a) {
    var sum = 0;
    for (var i = 0; i < 3; i++) {
      sum += a[this.thread.x][i];
    }
    return sum;
  }
  var gpu = new GPU({ mode: 'webgl2' });
  var output = gpu.createKernel(kernel, { output: [1] })([[1,2,3]]);
  assert.equal(
    output,
    6
  );
  gpu.destroy();
});

QUnit.test('loop int parameter output (webgl)', function(assert) {
  function kernel(a, b) {
    var sum = 0;
    for (var i = 0; i < a; i++) {
      sum += b[this.thread.x][i];
    }
    return sum;
  }
  var functionNode = new GPU.WebGLFunctionNode('kernel', kernel, { isRootKernel: true });
  assert.equal(
    functionNode.getFunctionString(),
    'void kernel() {' +
    '\nfloat user_sum=0.0;' +
    '\nfor (int user_i=0;user_i<LOOP_MAX;user_i++){' +
    '\nif (user_i<int(user_a)) {' +
    '\nuser_sum+=get(user_b, user_bSize, user_bDim, user_bBitRatio, threadId.x, user_i);' +
    '\n} else {' +
    '\nbreak;' +
    '\n}' +
    '\n}' +
    '\n' +
    '\nkernelResult = user_sum;return;' +
    '\n}');
});

QUnit.test('loop int parameter (webgl)', function(assert) {
  function kernel(a, b) {
    var sum = 0;
    for (var i = 0; i < a; i++) {
      sum += b[this.thread.x][i];
    }
    return sum;
  }
  var gpu = new GPU({ mode: 'webgl' });
  var output = gpu.createKernel(kernel, { output: [1] })(3, [[1,2,3]]);
  assert.equal(
    output,
    6
  );
  gpu.destroy();
});

QUnit.test('loop int parameter output (webgl2)', function(assert) {
  function kernel(a, b) {
    var sum = 0;
    for (var i = 0; i < a; i++) {
      sum += b[this.thread.x][i];
    }
    return sum;
  }
  var functionNode = new GPU.WebGL2FunctionNode('kernel', kernel, { isRootKernel: true });
  assert.equal(
    functionNode.getFunctionString(),
    'void kernel() {' +
    '\nfloat user_sum=0.0;' +
    '\nfor (int user_i=0;user_i<LOOP_MAX;user_i++){' +
    '\nif (user_i<int(user_a)) {' +
    '\nuser_sum+=get(user_b, user_bSize, user_bDim, user_bBitRatio, threadId.x, user_i);' +
    '\n} else {' +
    '\nbreak;' +
    '\n}' +
    '\n}' +
    '\n' +
    '\nkernelResult = user_sum;return;' +
    '\n}');
});

QUnit.test('loop int parameter (webgl)', function(assert) {
  function kernel(a, b) {
    var sum = 0;
    for (var i = 0; i < a; i++) {
      sum += b[this.thread.x][i];
    }
    return sum;
  }
  var gpu = new GPU({ mode: 'webgl2' });
  var output = gpu.createKernel(kernel, { output: [1] })(3, [[1,2,3]]);
  assert.equal(
    output,
    6
  );
  gpu.destroy();
});
