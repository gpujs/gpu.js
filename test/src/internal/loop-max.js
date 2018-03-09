QUnit.test('WebGL Loop Max', function(assert) {
  var gpu = new GPU({mode: 'webgl'});
  var add = gpu.createKernel(function(a, b) {
    var sum = 0;
    for (var i = 0; i < a; i++) {
      sum += b[this.thread.x][i];
    }
  }).setOutput([1]);

  add.build(1, [1]);
  assert.equal(
    add.functionBuilder.getPrototypeString('kernel'),
    'void kernel() {\n' +
    'float user_sum=0.0;\n' +
    'for (float user_i=0.0;user_i<LOOP_MAX;user_i++){\n' +
    'if (user_i<user_a) {\n' +
    'user_sum+=get(user_b, vec2(user_bSize[0],user_bSize[1]), vec3(user_bDim[0],user_bDim[1],user_bDim[2]), threadId.x,user_i);\n' +
    '} else {\n' +
    'break;\n' +
    '}\n' +
    '}\n' +
    '\n' +
    '}');
});

QUnit.test('WebGL2 Loop Max', function(assert) {
  var gpu = new GPU({mode: 'webgl2'});
  var add = gpu.createKernel(function(a, b) {
    var sum = 0;
    for (var i = 0; i < a; i++) {
      sum += b[this.thread.x][i];
    }
  }).setOutput([1]);

  add.build(1, [1]);
  assert.equal(
    add.functionBuilder.getPrototypeString('kernel'),
    'void kernel() {\n' +
    'float user_sum=0.0;\n' +
    'for (float user_i=0.0;user_i<LOOP_MAX;user_i++){\n' +
    'if (user_i<user_a) {\n' +
    'user_sum+=get(user_b, vec2(user_bSize[0],user_bSize[1]), vec3(user_bDim[0],user_bDim[1],user_bDim[2]), threadId.x,user_i);\n' +
    '} else {\n' +
    'break;\n' +
    '}\n' +
    '}\n' +
    '\n' +
    '}');
});