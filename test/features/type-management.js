var GPU = require('../../src/index');

(function() {
  QUnit.test('type management - arrays directly - Array(2) webgl', function(assert) {
    const node = new GPU.WebGLFunctionNode((function direct() {
      return [0, 0];
    }).toString(), { returnType: 'Array(2)' });
    assert.equal(node.toString(), 'vec2 direct() {\n\
return vec2(0.0, 0.0);\n\
}');
});
  QUnit.test('type management - arrays directly - Array(2) webgl2', function(assert) {
    const node = new GPU.WebGL2FunctionNode((function direct() {
      return [0, 0];
    }).toString(), { returnType: 'Array(2)' });
    assert.equal(node.toString(), 'vec2 direct() {\n\
return vec2(0.0, 0.0);\n\
}');
  });

  QUnit.test('type management - arrays directly - Array(2) cpu', function(assert) {
    const node = new GPU.CPUFunctionNode((function direct() {
      return [0, 0];
    }).toString(), { returnType: 'Array(2)' });
    assert.equal(node.toString(), 'function direct() {\n\
return [0, 0];\n\
}');
  });
})();

(function() {
  QUnit.test('type management - arrays directly - Array(3) webgl', function(assert) {
    const node = new GPU.WebGLFunctionNode((function direct() {
      return [0, 0, 0];
    }).toString(), { returnType: 'Array(3)' });
    assert.equal(node.toString(), 'vec3 direct() {\n\
return vec3(0.0, 0.0, 0.0);\n\
}');
  });
  QUnit.test('type management - arrays directly - Array(3) webgl2', function(assert) {
    const node = new GPU.WebGL2FunctionNode((function direct() {
      return [0, 0, 0];
    }).toString(), { returnType: 'Array(3)' });
    assert.equal(node.toString(), 'vec3 direct() {\n\
return vec3(0.0, 0.0, 0.0);\n\
}');
  });
  QUnit.test('type management - arrays directly - Array(3) cpu', function(assert) {
    const node = new GPU.CPUFunctionNode((function direct() {
      return [0, 0, 0];
    }).toString(), { returnType: 'Array(3)' });
    assert.equal(node.toString(), 'function direct() {\n\
return [0, 0, 0];\n\
}');
  });
})();

(function() {
  QUnit.test('type management - arrays directly - Array(4) webgl', function(assert) {
    const node = new GPU.WebGLFunctionNode((function direct() {
      return [0, 0, 0, 0];
    }).toString(), { returnType: 'Array(4)' });
    assert.equal(node.toString(), 'vec4 direct() {\n\
return vec4(0.0, 0.0, 0.0, 0.0);\n\
}');
  });
  QUnit.test('type management - arrays directly - Array(4) webgl2', function(assert) {
    const node = new GPU.WebGL2FunctionNode((function direct() {
      return [0, 0, 0, 0];
    }).toString(), { returnType: 'Array(4)' });
    assert.equal(node.toString(), 'vec4 direct() {\n\
return vec4(0.0, 0.0, 0.0, 0.0);\n\
}');
  });
  QUnit.test("type management - arrays directly - Array(4) cpu", function(assert) {
    const node = new GPU.CPUFunctionNode((function direct() {
      return [0, 0, 0, 0];
    }).toString(), { returnType: 'Array(4)' });
    assert.equal(node.toString(), 'function direct() {\n\
return [0, 0, 0, 0];\n\
}');
  });
})();
(function() {
  QUnit.test('type management - arrays referenced directly - Array(2) webgl', function(assert) {
    const node = new GPU.WebGLFunctionNode((function refDirect() {
      const array = [0, 0];
      return array;
    }).toString(), { returnType: 'Array(2)' });
    assert.equal(node.toString(), 'vec2 refDirect() {\n\
vec2 user_array=vec2(0.0, 0.0);\n\
return user_array;\n\
}');
  });
  QUnit.test('type management - arrays referenced directly - Array(2) webgl2', function(assert) {
    const node = new GPU.WebGL2FunctionNode((function refDirect() {
      const array = [0, 0];
      return array;
    }).toString(), { returnType: 'Array(2)' });
    assert.equal(node.toString(), 'vec2 refDirect() {\n\
vec2 user_array=vec2(0.0, 0.0);\n\
return user_array;\n\
}');
  });
  QUnit.test('type management - arrays referenced directly - Array(2) cpu', function(assert) {
    const node = new GPU.CPUFunctionNode((function refDirect() {
      const array = [0, 0];
      return array;
    }).toString(), { returnType: 'Array(2)' });
    assert.equal(node.toString(), 'function refDirect() {\n\
const user_array=[0, 0];\n\
return user_array;\n\
}');
  });
})();

(function(){
  QUnit.test('type management - arrays referenced directly - Array(3) webgl', function(assert) {
    const node = new GPU.WebGLFunctionNode((function refDirect() {
      const array = [0, 0, 0];
      return array;
    }).toString(), { returnType: 'Array(3)' });
    assert.equal(node.toString(), 'vec3 refDirect() {\n\
vec3 user_array=vec3(0.0, 0.0, 0.0);\n\
return user_array;\n\
}');
  });
  QUnit.test('type management - arrays referenced directly - Array(3) webgl2', function(assert) {
    const node = new GPU.WebGL2FunctionNode((function refDirect() {
      const array = [0, 0, 0];
      return array;
    }).toString(), { returnType: 'Array(3)' });
    assert.equal(node.toString(), 'vec3 refDirect() {\n\
vec3 user_array=vec3(0.0, 0.0, 0.0);\n\
return user_array;\n\
}');
  });
  QUnit.test('type management - arrays referenced directly - Array(3) cpu', function(assert) {
    const node = new GPU.CPUFunctionNode((function refDirect() {
      const array = [0, 0, 0];
      return array;
    }).toString(), { returnType: 'Array(3)' });
    assert.equal(node.toString(), 'function refDirect() {\n\
const user_array=[0, 0, 0];\n\
return user_array;\n\
}');
  });
})();

(function(){
  QUnit.test('type management - arrays referenced directly - Array(4) webgl', function(assert) {
    const node = new GPU.WebGLFunctionNode((function refDirect() {
      const array = [0, 0, 0, 0];
      return array;
    }).toString(), { returnType: 'Array(4)' });
    assert.equal(node.toString(), 'vec4 refDirect() {\n\
vec4 user_array=vec4(0.0, 0.0, 0.0, 0.0);\n\
return user_array;\n\
}');
  });
  QUnit.test('type management - arrays referenced directly - Array(4) webgl2', function(assert) {
    const node = new GPU.WebGL2FunctionNode((function refDirect() {
      const array = [0, 0, 0, 0];
      return array;
    }).toString(), { returnType: 'Array(4)' });
    assert.equal(node.toString(), 'vec4 refDirect() {\n\
vec4 user_array=vec4(0.0, 0.0, 0.0, 0.0);\n\
return user_array;\n\
}');
  });
  QUnit.test('type management - arrays referenced directly - Array(4) cpu', function(assert) {
    const node = new GPU.CPUFunctionNode((function refDirect() {
      const array = [0, 0, 0, 0];
      return array;
    }).toString(), { returnType: 'Array(4)' });
    assert.equal(node.toString(), 'function refDirect() {\n\
const user_array=[0, 0, 0, 0];\n\
return user_array;\n\
}');
  });
})();

(function() {
  QUnit.test('type management - arrays referenced indirectly - Array(2) webgl', function(assert) {
    const node = new GPU.WebGLFunctionNode((function indirect() {
      const array = [0, 0];
      const array2 = array;
      return array2;
    }).toString(), { returnType: 'Array(2)' });
    assert.equal(node.toString(), 'vec2 indirect() {\n\
vec2 user_array=vec2(0.0, 0.0);\n\
vec2 user_array2=user_array;\n\
return user_array2;\n\
}');
  });
  QUnit.test('type management - arrays referenced indirectly - Array(2) webgl2', function(assert) {
    const node = new GPU.WebGL2FunctionNode((function indirect() {
      const array = [0, 0];
      const array2 = array;
      return array2;
    }).toString(), { returnType: 'Array(2)' });
    assert.equal(node.toString(), 'vec2 indirect() {\n\
vec2 user_array=vec2(0.0, 0.0);\n\
vec2 user_array2=user_array;\n\
return user_array2;\n\
}');
  });
  QUnit.test('type management - arrays referenced indirectly - Array(2) cpu', function(assert) {
    const node = new GPU.CPUFunctionNode((function indirect() {
      const array = [0, 0];
      const array2 = array;
      return array2;
    }).toString(), { returnType: 'Array(2)' });
    assert.equal(node.toString(), 'function indirect() {\n\
const user_array=[0, 0];\n\
const user_array2=user_array;\n\
return user_array2;\n\
}');
  });
})();

(function() {
  QUnit.test('type management - arrays referenced indirectly - Array(3) webgl', function(assert) {
    const node = new GPU.WebGLFunctionNode((function indirect() {
      const array = [0, 0, 0];
      const array2 = array;
      return array2;
    }).toString(), { returnType: 'Array(3)' });
    assert.equal(node.toString(), 'vec3 indirect() {\n\
vec3 user_array=vec3(0.0, 0.0, 0.0);\n\
vec3 user_array2=user_array;\n\
return user_array2;\n\
}');
  });
  QUnit.test('type management - arrays referenced indirectly - Array(3) webgl2', function(assert) {
    const node = new GPU.WebGL2FunctionNode((function indirect() {
      const array = [0, 0, 0];
      const array2 = array;
      return array2;
    }).toString(), { returnType: 'Array(3)' });
    assert.equal(node.toString(), 'vec3 indirect() {\n\
vec3 user_array=vec3(0.0, 0.0, 0.0);\n\
vec3 user_array2=user_array;\n\
return user_array2;\n\
}');
  });
  QUnit.test('type management - arrays referenced indirectly - Array(3) cpu', function(assert) {
    const node = new GPU.CPUFunctionNode((function indirect() {
      const array = [0, 0, 0];
      const array2 = array;
      return array2;
    }).toString(), { returnType: 'Array(3)' });
    assert.equal(node.toString(), 'function indirect() {\n\
const user_array=[0, 0, 0];\n\
const user_array2=user_array;\n\
return user_array2;\n\
}');
  });
})();

(function() {
  QUnit.test('type management - arrays referenced indirectly - Array(4) webgl', function(assert) {
    const node = new GPU.WebGLFunctionNode((function indirect() {
      const array = [0, 0, 0, 0];
      const array2 = array;
      return array2;
    }).toString(), { returnType: 'Array(4)' });
    assert.equal(node.toString(), 'vec4 indirect() {\n\
vec4 user_array=vec4(0.0, 0.0, 0.0, 0.0);\n\
vec4 user_array2=user_array;\n\
return user_array2;\n\
}');
  });
  QUnit.test('type management - arrays referenced indirectly - Array(4) webgl2', function(assert) {
    const node = new GPU.WebGL2FunctionNode((function indirect() {
      const array = [0, 0, 0, 0];
      const array2 = array;
      return array2;
    }).toString(), { returnType: 'Array(4)' });
    assert.equal(node.toString(), 'vec4 indirect() {\n\
vec4 user_array=vec4(0.0, 0.0, 0.0, 0.0);\n\
vec4 user_array2=user_array;\n\
return user_array2;\n\
}');
  });
  QUnit.test('type management - arrays referenced indirectly - Array(4) cpu', function(assert) {
    const node = new GPU.CPUFunctionNode((function indirect() {
      const array = [0, 0, 0, 0];
      const array2 = array;
      return array2;
    }).toString(), { returnType: 'Array(4)' });
    assert.equal(node.toString(), 'function indirect() {\n\
const user_array=[0, 0, 0, 0];\n\
const user_array2=user_array;\n\
return user_array2;\n\
}');
  });
})();

(function() {
  QUnit.test('type management - arrays arguments - Array(2) webgl', function(assert) {
    const node = new GPU.WebGLFunctionNode((function arrayArguments(array, array2) {
      const array3 = [0, 0];
      array3[0] = array[0];
      array3[1] = array[1] * array2[1];
      return array3;
    }).toString(), { argumentTypes: { array: 'Array(2)', array2: 'Array(2)' } });
    assert.equal(node.toString(), 'float arrayArguments(vec2 user_array, vec2 user_array2) {\n\
vec2 user_array3=vec2(0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
  });
  QUnit.test('type management - arrays arguments - Array(2) webgl2', function(assert) {
    const node = new GPU.WebGL2FunctionNode((function arrayArguments(array, array2) {
      const array3 = [0, 0];
      array3[0] = array[0];
      array3[1] = array[1] * array2[1];
      return array3;
    }).toString(), { argumentTypes: { array: 'Array(2)', array2: 'Array(2)' } });
    assert.equal(node.toString(), 'float arrayArguments(vec2 user_array, vec2 user_array2) {\n\
vec2 user_array3=vec2(0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
  });
  QUnit.test('type management - arrays arguments - Array(2) cpu', function(assert) {
    const node = new GPU.CPUFunctionNode((function arrayArguments(array, array2) {
      const array3 = [0, 0];
      array3[0] = array[0];
      array3[1] = array[1] * array2[1];
      return array3;
    }).toString(), { argumentTypes: { array: 'Array(2)', array2: 'Array(2)' } });
    assert.equal(node.toString(), 'function arrayArguments(user_array, user_array2) {\n\
const user_array3=[0, 0];\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
  });
})();

(function() {
  QUnit.test('type management - arrays arguments - Array(3) webgl', function(assert) {
    const node = new GPU.WebGLFunctionNode((function arrayArguments(array, array2) {
      const array3 = [0, 0];
      array3[0] = array[0];
      array3[1] = array[1] * array2[1];
      return array3;
    }).toString(), { argumentTypes: { array: 'Array(3)', array2: 'Array(3)' } });
    assert.equal(node.toString(), 'float arrayArguments(vec3 user_array, vec3 user_array2) {\n\
vec2 user_array3=vec2(0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
  });
  QUnit.test('type management - arrays arguments - Array(3) webgl2', function(assert) {
    const node = new GPU.WebGL2FunctionNode((function arrayArguments(array, array2) {
      const array3 = [0, 0];
      array3[0] = array[0];
      array3[1] = array[1] * array2[1];
      return array3;
    }).toString(), { argumentTypes: { array: 'Array(3)', array2: 'Array(3)' } });
    assert.equal(node.toString(), 'float arrayArguments(vec3 user_array, vec3 user_array2) {\n\
vec2 user_array3=vec2(0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
  });
  QUnit.test('type management - arrays arguments - Array(3) cpu', function(assert) {
    const node = new GPU.CPUFunctionNode((function arrayArguments(array, array2) {
      const array3 = [0, 0];
      array3[0] = array[0];
      array3[1] = array[1] * array2[1];
      return array3;
    }).toString(), { argumentTypes: { array: 'Array(3)', array2: 'Array(3)' } });
    assert.equal(node.toString(), 'function arrayArguments(user_array, user_array2) {\n\
const user_array3=[0, 0];\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
  });
})();


(function() {
  QUnit.test('type management - arrays arguments - Array(4) webgl', function(assert) {
    const node = new GPU.WebGLFunctionNode((function arrayArguments(array, array2) {
      const array3 = [0, 0];
      array3[0] = array[0];
      array3[1] = array[1] * array2[1];
      return array3;
    }).toString(), { argumentTypes: { array: 'Array(4)', array2: 'Array(4)' } });
    assert.equal(node.toString(), 'float arrayArguments(vec4 user_array, vec4 user_array2) {\n\
vec2 user_array3=vec2(0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
  });
  QUnit.test('type management - arrays arguments - Array(4) webgl2', function(assert) {
    const node = new GPU.WebGL2FunctionNode((function arrayArguments(array, array2) {
      const array3 = [0, 0];
      array3[0] = array[0];
      array3[1] = array[1] * array2[1];
      return array3;
    }).toString(), { argumentTypes: { array: 'Array(4)', array2: 'Array(4)' } });
    assert.equal(node.toString(), 'float arrayArguments(vec4 user_array, vec4 user_array2) {\n\
vec2 user_array3=vec2(0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
  });
  QUnit.test('type management - arrays arguments - Array(4) cpu', function(assert) {
    const node = new GPU.CPUFunctionNode((function arrayArguments(array, array2) {
      const array3 = [0, 0];
      array3[0] = array[0];
      array3[1] = array[1] * array2[1];
      return array3;
    }).toString(), { argumentTypes: { array: 'Array(4)', array2: 'Array(4)' } });
    assert.equal(node.toString(), 'function arrayArguments(user_array, user_array2) {\n\
const user_array3=[0, 0];\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
  });
})();

(function() {
  QUnit.test('type management - arrays inherited - Array(2) webgl', function(assert) {
    const node = new GPU.WebGLFunctionNode((function inherited(array, array2) {
      const array3 = [0, 0];
      array3[0] = array[0];
      array3[1] = array[1] * array2[1];
      return array3;
    }).toString(), { argumentTypes: { array: 'Array(2)', array2: 'Array(2)' }, returnType: 'Array(2)' });
    assert.equal(node.toString(), 'vec2 inherited(vec2 user_array, vec2 user_array2) {\n\
vec2 user_array3=vec2(0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
  });
  QUnit.test('type management - arrays inherited - Array(2) webgl2', function(assert) {
    const node = new GPU.WebGL2FunctionNode((function inherited(array, array2) {
      const array3 = [0, 0];
      array3[0] = array[0];
      array3[1] = array[1] * array2[1];
      return array3;
    }).toString(), { argumentTypes: { array: 'Array(2)', array2: 'Array(2)' }, returnType: 'Array(2)' });
    assert.equal(node.toString(), 'vec2 inherited(vec2 user_array, vec2 user_array2) {\n\
vec2 user_array3=vec2(0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
  });
  QUnit.test('type management - arrays inherited - Array(2) cpu', function(assert) {
    const node = new GPU.CPUFunctionNode((function inherited(array, array2) {
      const array3 = [0, 0];
      array3[0] = array[0];
      array3[1] = array[1] * array2[1];
      return array3;
    }).toString(), { argumentTypes: { array: 'Array(2)', array2: 'Array(2)' }, returnType: 'Array(2)' });
    assert.equal(node.toString(), 'function inherited(user_array, user_array2) {\n\
const user_array3=[0, 0];\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
  });
})();

(function() {
  QUnit.test('type management - arrays inherited - Array(3) webgl', function(assert) {
    const node = new GPU.WebGLFunctionNode((function inherited(array, array2) {
      const array3 = [0, 0, 0];
      array3[0] = array[0];
      array3[1] = array[1] * array2[1];
      return array3;
    }).toString(), { argumentTypes: { array: 'Array(3)', array2: 'Array(3)' }, returnType: 'Array(3)' });
    assert.equal(node.toString(), 'vec3 inherited(vec3 user_array, vec3 user_array2) {\n\
vec3 user_array3=vec3(0.0, 0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
  });
  QUnit.test('type management - arrays inherited - Array(3) webgl2', function(assert) {
    const node = new GPU.WebGL2FunctionNode((function inherited(array, array2) {
      const array3 = [0, 0, 0];
      array3[0] = array[0];
      array3[1] = array[1] * array2[1];
      return array3;
    }).toString(), { argumentTypes: { array: 'Array(3)', array2: 'Array(3)' }, returnType: 'Array(3)' });
    assert.equal(node.toString(), 'vec3 inherited(vec3 user_array, vec3 user_array2) {\n\
vec3 user_array3=vec3(0.0, 0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
  });

  QUnit.test('type management - arrays inherited - Array(3) cpu', function(assert) {
    const node = new GPU.CPUFunctionNode((function inherited(array, array2) {
      const array3 = [0, 0, 0];
      array3[0] = array[0];
      array3[1] = array[1] * array2[1];
      return array3;
    }).toString(), { argumentTypes: { array: 'Array(3)', array2: 'Array(3)' }, returnType: 'Array(3)' });
    assert.equal(node.toString(), 'function inherited(user_array, user_array2) {\n\
const user_array3=[0, 0, 0];\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
  });
})();

(function() {
  QUnit.test('type management - arrays inherited - Array(4) webgl', function(assert) {
    const node = new GPU.WebGLFunctionNode((function inherited(array, array2) {
      const array3 = [0, 0, 0, 0];
      array3[0] = array[0];
      array3[1] = array[1] * array2[1];
      return array3;
    }).toString(), { argumentTypes: { array: 'Array(4)', array2: 'Array(4)' }, returnType: 'Array(4)' });
    assert.equal(node.toString(), 'vec4 inherited(vec4 user_array, vec4 user_array2) {\n\
vec4 user_array3=vec4(0.0, 0.0, 0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
  });
  QUnit.test('type management - arrays inherited - Array(4) webgl2', function(assert) {
    const node = new GPU.WebGL2FunctionNode((function inherited(array, array2) {
      const array3 = [0, 0, 0, 0];
      array3[0] = array[0];
      array3[1] = array[1] * array2[1];
      return array3;
    }).toString(), { argumentTypes: { array: 'Array(4)', array2: 'Array(4)' }, returnType: 'Array(4)' });
    assert.equal(node.toString(), 'vec4 inherited(vec4 user_array, vec4 user_array2) {\n\
vec4 user_array3=vec4(0.0, 0.0, 0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
  });
  QUnit.test('type management - arrays inherited - Array(4) cpu', function(assert) {
    const node = new GPU.CPUFunctionNode((function inherited(array, array2) {
      const array3 = [0, 0, 0, 0];
      array3[0] = array[0];
      array3[1] = array[1] * array2[1];
      return array3;
    }).toString(), { argumentTypes: { array: 'Array(4)', array2: 'Array(4)' }, returnType: 'Array(4)' });
    assert.equal(node.toString(), 'function inherited(user_array, user_array2) {\n\
const user_array3=[0, 0, 0, 0];\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
  });
})();
