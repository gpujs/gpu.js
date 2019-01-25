var GPU = require('../../src/index');

QUnit.test('loop max output (webgl)', function(assert) {
  var functionNode = new GPU.WebGLFunctionNode('kernel', function(a, b) {
    var sum = 0;
    for (var i = 0; i < a; i++) {
      sum += b[this.thread.x][i];
    }
    return sum;
  }, { isRootKernel: true });

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

QUnit.test('loop max output (webgl2)', function(assert) {
  var functionNode = new GPU.WebGL2FunctionNode('kernel', function(a, b) {
    var sum = 0;
    for (var i = 0; i < a; i++) {
      sum += b[this.thread.x][i];
    }
    return sum;
  }, { isRootKernel: true });

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

QUnit.test('loop max output (headlessgl)', function(assert) {
  var functionNode = new GPU.HeadlessGLFunctionNode('kernel', function(a, b) {
    var sum = 0;
    for (var i = 0; i < a; i++) {
      sum += b[this.thread.x][i];
    }
    return sum;
  }, { isRootKernel: true });

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

(GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('loop max (webgl)', function(assert) {
  var gpu = new GPU({mode: 'webgl'});
  var add = gpu.createKernel(function(a, b) {
    var sum = 0;
    for (var i = 0; i < a; i++) {
      sum += b[this.thread.x][i];
    }
    return sum;
  }).setOutput([1]);

  var output = add(1, [[1]]);
  assert.equal(
    output[0],
    1
  );
  gpu.destroy();
});

(GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('loop max (webgl2)', function(assert) {
  var gpu = new GPU({mode: 'webgl2'});
  var add = gpu.createKernel(function(a, b) {
    var sum = 0;
    for (var i = 0; i < a; i++) {
      sum += b[this.thread.x][i];
    }
    return sum;
  }).setOutput([1]);

  var output = add(1, [[1]]);
  assert.equal(
    output[0],
    1
  );
  gpu.destroy();
});

(GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('loop max (headlessgl)', function(assert) {
  var gpu = new GPU({mode: 'headlessgl'});
  var add = gpu.createKernel(function(a, b) {
    var sum = 0;
    for (var i = 0; i < a; i++) {
      sum += b[this.thread.x][i];
    }
    return sum;
  }).setOutput([1]);

  var output = add(1, [[1]]);
  assert.equal(
    output[0],
    1
  );
  gpu.destroy();
});

