/// test deep array type detection
QUnit.test("deep type detection - arrays directly vec2", function(assert) {
  var node = new GPU.WebGLFunctionNode(null, function direct() {
    return [0, 0];
  }, { returnType: 'vec2' });
  assert.equal(node.generate(), 'vec2 direct() {\n\
return vec2(0.0, 0.0);\n\
}');
});

QUnit.test("deep type detection - arrays directly vec3", function(assert) {
  var node = new GPU.WebGLFunctionNode(null, function direct() {
    return [0, 0, 0];
  }, { returnType: 'vec3' });
  assert.equal(node.generate(), 'vec3 direct() {\n\
return vec3(0.0, 0.0, 0.0);\n\
}');
});

QUnit.test("deep type detection - arrays directly vec4", function(assert) {
  var node = new GPU.WebGLFunctionNode(null, function direct() {
    return [0, 0, 0, 0];
  }, { returnType: 'vec4' });
  assert.equal(node.generate(), 'vec4 direct() {\n\
return vec4(0.0, 0.0, 0.0, 0.0);\n\
}');
});

QUnit.test("deep type detection - arrays referenced directly vec2", function(assert) {
  var node = new GPU.WebGLFunctionNode(null, function refDirect() {
    const array = [0, 0];
    return array;
  }, { returnType: 'vec2' });
  assert.equal(node.generate(), 'vec2 refDirect() {\n\
vec2 user_array=vec2(0.0, 0.0);\n\
return user_array;\n\
}');
});

QUnit.test("deep type detection - arrays referenced directly vec3", function(assert) {
  var node = new GPU.WebGLFunctionNode(null, function refDirect() {
    const array = [0, 0, 0];
    return array;
  }, { returnType: 'vec3' });
  assert.equal(node.generate(), 'vec3 refDirect() {\n\
vec3 user_array=vec3(0.0, 0.0, 0.0);\n\
return user_array;\n\
}');
});

QUnit.test("deep type detection - arrays referenced directly vec4", function(assert) {
  var node = new GPU.WebGLFunctionNode(null, function refDirect() {
    const array = [0, 0, 0, 0];
    return array;
  }, { returnType: 'vec4' });
  assert.equal(node.generate(), 'vec4 refDirect() {\n\
vec4 user_array=vec4(0.0, 0.0, 0.0, 0.0);\n\
return user_array;\n\
}');
});

QUnit.test("deep type detection - arrays referenced indirectly vec2", function(assert) {
  var node = new GPU.WebGLFunctionNode(null, function indirect() {
    const array = [0, 0];
    const array2 = array;
    return array2;
  }, { returnType: 'vec2' });
  assert.equal(node.generate(), 'vec2 indirect() {\n\
vec2 user_array=vec2(0.0, 0.0);\n\
vec2 user_array2=user_array;\n\
return user_array2;\n\
}');
});

QUnit.test("deep type detection - arrays referenced indirectly vec3", function(assert) {
  var node = new GPU.WebGLFunctionNode(null, function indirect() {
    const array = [0, 0, 0];
    const array2 = array;
    return array2;
  }, { returnType: 'vec3' });
  assert.equal(node.generate(), 'vec3 indirect() {\n\
vec3 user_array=vec3(0.0, 0.0, 0.0);\n\
vec3 user_array2=user_array;\n\
return user_array2;\n\
}');
});

QUnit.test("deep type detection - arrays referenced indirectly vec4", function(assert) {
  var node = new GPU.WebGLFunctionNode(null, function indirect() {
    const array = [0, 0, 0, 0];
    const array2 = array;
    return array2;
  }, { returnType: 'vec4' });
  assert.equal(node.generate(), 'vec4 indirect() {\n\
vec4 user_array=vec4(0.0, 0.0, 0.0, 0.0);\n\
vec4 user_array2=user_array;\n\
return user_array2;\n\
}');
});

QUnit.test("deep type detection - arrays arguments vec2", function(assert) {
  var node = new GPU.WebGLFunctionNode(null, function arguments(array, array2) {
    const array3 = [0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }, { paramTypes: { array: 'vec2', array2: 'vec2' } });
  assert.equal(node.generate(), 'float arguments(vec2 user_array, vec2 user_array2) {\n\
vec2 user_array3=vec2(0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
});

QUnit.test("deep type detection - arrays arguments vec3", function(assert) {
  var node = new GPU.WebGLFunctionNode(null, function arguments(array, array2) {
    const array3 = [0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }, { paramTypes: { array: 'vec3', array2: 'vec3' } });
  assert.equal(node.generate(), 'float arguments(vec3 user_array, vec3 user_array2) {\n\
vec2 user_array3=vec2(0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
});

QUnit.test("deep type detection - arrays arguments vec4", function(assert) {
  var node = new GPU.WebGLFunctionNode(null, function arguments(array, array2) {
    const array3 = [0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }, { paramTypes: { array: 'vec4', array2: 'vec4' } });
  assert.equal(node.generate(), 'float arguments(vec4 user_array, vec4 user_array2) {\n\
vec2 user_array3=vec2(0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
});

QUnit.test("deep type detection - arrays inherited vec2", function(assert) {
  var node = new GPU.WebGLFunctionNode(null, function inherited(array, array2) {
    const array3 = [0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }, { paramTypes: { array: 'vec2', array2: 'vec2' }, returnType: 'vec2' });
  assert.equal(node.generate(), 'vec2 inherited(vec2 user_array, vec2 user_array2) {\n\
vec2 user_array3=vec2(0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
});

QUnit.test("deep type detection - arrays inherited vec3", function(assert) {
  var node = new GPU.WebGLFunctionNode(null, function inherited(array, array2) {
    const array3 = [0, 0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }, { paramTypes: { array: 'vec3', array2: 'vec3' }, returnType: 'vec3' });
  assert.equal(node.generate(), 'vec3 inherited(vec3 user_array, vec3 user_array2) {\n\
vec3 user_array3=vec3(0.0, 0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
});

QUnit.test("deep type detection - arrays inherited vec4", function(assert) {
  var node = new GPU.WebGLFunctionNode(null, function inherited(array, array2) {
    const array3 = [0, 0, 0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }, { paramTypes: { array: 'vec4', array2: 'vec4' }, returnType: 'vec4' });
  assert.equal(node.generate(), 'vec4 inherited(vec4 user_array, vec4 user_array2) {\n\
vec4 user_array3=vec4(0.0, 0.0, 0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
});