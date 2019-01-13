var GPU = require('../../src/index');

(function() {
  QUnit.test('Issue #390 - thread assignment (webgl)', function(assert) {
    var node = new GPU.WebGLFunctionNode(null, function assignThreadToVar() {
      const x = this.thread.x;
      const y = this.thread.y;
      const sum = x + y;
      return sum;
    });
    assert.equal(node.generate(), 'float assignThreadToVar() {\n\
float user_x=float(threadId.x);\n\
float user_y=float(threadId.y);\n\
float user_sum=(user_x+user_y);\n\
return user_sum;\n\
}');
    assert.equal(node.declarations.x, 'Float');
    assert.equal(node.declarations.y, 'Float');
    assert.equal(node.declarations.sum, 'Number');
  });

  QUnit.test('Issue #390 - thread assignment (webgl2)', function(assert) {
    var node = new GPU.WebGL2FunctionNode(null, function assignThreadToVar() {
      const x = this.thread.x;
      const y = this.thread.y;
      const sum = x + y;
      return sum;
    });
    assert.equal(node.generate(), 'float assignThreadToVar() {\n\
float user_x=float(threadId.x);\n\
float user_y=float(threadId.y);\n\
float user_sum=(user_x+user_y);\n\
return user_sum;\n\
}');
    assert.equal(node.declarations.x, 'Float');
    assert.equal(node.declarations.y, 'Float');
    assert.equal(node.declarations.sum, 'Number');
  });

  QUnit.test('Issue #390 - thread assignment (cpu)', function(assert) {
    var node = new GPU.CPUFunctionNode(null, function assignThreadToVar() {
      const x = this.thread.x;
      const y = this.thread.y;
      const sum = x + y;
      return sum;
    });
    assert.equal(node.generate(), 'function assignThreadToVar() {\n\
var user_x=_this.thread.x;\n\
var user_y=_this.thread.y;\n\
var user_sum=(user_x+user_y);\n\
return user_sum;\n\
}');
    assert.equal(node.declarations.x, 'var');
    assert.equal(node.declarations.y, 'var');
    assert.equal(node.declarations.sum, 'var');
  });
})();

(function() {
  QUnit.test('Issue #390 (related) - output assignment (webgl)', function(assert) {
    var node = new GPU.WebGLFunctionNode(null, function assignThreadToVar() {
      const x = this.output.x;
      const y = this.output.y;
      const z = this.output.z;
      const sum = x + y + z;
      return sum;
    });
    node.output = [1,2,3];
    assert.equal(node.generate(), 'float assignThreadToVar() {\n\
float user_x=1.0;\n\
float user_y=2.0;\n\
float user_z=3.0;\n\
float user_sum=((user_x+user_y)+user_z);\n\
return user_sum;\n\
}');
    assert.equal(node.declarations.x, 'Float');
    assert.equal(node.declarations.y, 'Float');
    assert.equal(node.declarations.z, 'Float');
    assert.equal(node.declarations.sum, 'Number');
  });

  QUnit.test('Issue #390 (related) - output assignment (webgl2)', function(assert) {
    var node = new GPU.WebGL2FunctionNode(null, function assignThreadToVar() {
      const x = this.output.x;
      const y = this.output.y;
      const z = this.output.z;
      const sum = x + y + z;
      return sum;
    });
    node.output = [1,2,3];
    assert.equal(node.generate(), 'float assignThreadToVar() {\n\
float user_x=1.0;\n\
float user_y=2.0;\n\
float user_z=3.0;\n\
float user_sum=((user_x+user_y)+user_z);\n\
return user_sum;\n\
}');
    assert.equal(node.declarations.x, 'Float');
    assert.equal(node.declarations.y, 'Float');
    assert.equal(node.declarations.z, 'Float');
    assert.equal(node.declarations.sum, 'Number');
  });

  QUnit.test('Issue #390 (related) - output assignment (cpu)', function(assert) {
    var node = new GPU.CPUFunctionNode(null, function assignThreadToVar() {
      const x = this.output.x;
      const y = this.output.y;
      const z = this.output.z;
      const sum = x + y + z;
      return sum;
    });
    node.output = [1,2,3];
    assert.equal(node.generate(), 'function assignThreadToVar() {\n\
var user_x=1;\n\
var user_y=2;\n\
var user_z=3;\n\
var user_sum=((user_x+user_y)+user_z);\n\
return user_sum;\n\
}');
    assert.equal(node.declarations.x, 'var');
    assert.equal(node.declarations.y, 'var');
    assert.equal(node.declarations.z, 'var');
    assert.equal(node.declarations.sum, 'var');
  });
})();
