const { assert, test, module: describe, only, skip } = require('qunit');
const { GPU, WebGLFunctionNode, WebGL2FunctionNode, CPUFunctionNode } = require('../../src');

describe('features: type management');

test('arrays directly - Array(2) webgl', () => {
  const node = new WebGLFunctionNode((function direct() {
    return [0, 0];
  }).toString(), { returnType: 'Array(2)', output: [1] });
  assert.equal(node.toString(), 'vec2 direct() {\n\
return vec2(0.0, 0.0);\n\
}');
});
test('arrays directly - Array(2) webgl2', () => {
  const node = new WebGL2FunctionNode((function direct() {
    return [0, 0];
  }).toString(), { returnType: 'Array(2)', output: [1] });
  assert.equal(node.toString(), 'vec2 direct() {\n\
return vec2(0.0, 0.0);\n\
}');
});

test('arrays directly - Array(2) cpu', () => {
  const node = new CPUFunctionNode((function direct() {
    return [0, 0];
  }).toString(), { returnType: 'Array(2)', output: [1] });
  assert.equal(node.toString(), 'function direct() {\n\
return new Float32Array([0, 0]);\n\
}');
});

test('arrays directly - Array(3) webgl', () => {
  const node = new WebGLFunctionNode((function direct() {
    return [0, 0, 0];
  }).toString(), { returnType: 'Array(3)', output: [1] });
  assert.equal(node.toString(), 'vec3 direct() {\n\
return vec3(0.0, 0.0, 0.0);\n\
}');
});
test('arrays directly - Array(3) webgl2', () => {
  const node = new WebGL2FunctionNode((function direct() {
    return [0, 0, 0];
  }).toString(), { returnType: 'Array(3)', output: [1] });
  assert.equal(node.toString(), 'vec3 direct() {\n\
return vec3(0.0, 0.0, 0.0);\n\
}');
});
test('arrays directly - Array(3) cpu', () => {
  const node = new CPUFunctionNode((function direct() {
    return [0, 0, 0];
  }).toString(), { returnType: 'Array(3)', output: [1] });
  assert.equal(node.toString(), 'function direct() {\n\
return new Float32Array([0, 0, 0]);\n\
}');
});


test('arrays directly - Array(4) webgl', () => {
  const node = new WebGLFunctionNode((function direct() {
    return [0, 0, 0, 0];
  }).toString(), { returnType: 'Array(4)', output: [1] });
  assert.equal(node.toString(), 'vec4 direct() {\n\
return vec4(0.0, 0.0, 0.0, 0.0);\n\
}');
});
test('arrays directly - Array(4) webgl2', () => {
  const node = new WebGL2FunctionNode((function direct() {
    return [0, 0, 0, 0];
  }).toString(), { returnType: 'Array(4)', output: [1] });
  assert.equal(node.toString(), 'vec4 direct() {\n\
return vec4(0.0, 0.0, 0.0, 0.0);\n\
}');
});
test("arrays directly - Array(4) cpu", function(assert) {
  const node = new CPUFunctionNode((function direct() {
    return [0, 0, 0, 0];
  }).toString(), { returnType: 'Array(4)', output: [1] });
  assert.equal(node.toString(), 'function direct() {\n\
return new Float32Array([0, 0, 0, 0]);\n\
}');
});


test('arrays referenced directly - Array(2) webgl', () => {
  const node = new WebGLFunctionNode((function refDirect() {
    const array = [0, 0];
    return array;
  }).toString(), { returnType: 'Array(2)', output: [1] });
  assert.equal(node.toString(), 'vec2 refDirect() {\n\
vec2 user_array=vec2(0.0, 0.0);\n\
return user_array;\n\
}');
});
test('arrays referenced directly - Array(2) webgl2', () => {
  const node = new WebGL2FunctionNode((function refDirect() {
    const array = [0, 0];
    return array;
  }).toString(), { returnType: 'Array(2)', output: [1] });
  assert.equal(node.toString(), 'vec2 refDirect() {\n\
vec2 user_array=vec2(0.0, 0.0);\n\
return user_array;\n\
}');
});
test('arrays referenced directly - Array(2) cpu', () => {
  const node = new CPUFunctionNode((function refDirect() {
    const array = [0, 0];
    return array;
  }).toString(), { returnType: 'Array(2)', output: [1] });
  assert.equal(node.toString(), 'function refDirect() {\n\
const user_array=new Float32Array([0, 0]);\n\
return user_array;\n\
}');
});


test('arrays referenced directly - Array(3) webgl', () => {
  const node = new WebGLFunctionNode((function refDirect() {
    const array = [0, 0, 0];
    return array;
  }).toString(), { returnType: 'Array(3)', output: [1] });
  assert.equal(node.toString(), 'vec3 refDirect() {\n\
vec3 user_array=vec3(0.0, 0.0, 0.0);\n\
return user_array;\n\
}');
});
test('arrays referenced directly - Array(3) webgl2', () => {
  const node = new WebGL2FunctionNode((function refDirect() {
    const array = [0, 0, 0];
    return array;
  }).toString(), { returnType: 'Array(3)', output: [1] });
  assert.equal(node.toString(), 'vec3 refDirect() {\n\
vec3 user_array=vec3(0.0, 0.0, 0.0);\n\
return user_array;\n\
}');
});
test('arrays referenced directly - Array(3) cpu', () => {
  const node = new CPUFunctionNode((function refDirect() {
    const array = [0, 0, 0];
    return array;
  }).toString(), { returnType: 'Array(3)', output: [1] });
  assert.equal(node.toString(), 'function refDirect() {\n\
const user_array=new Float32Array([0, 0, 0]);\n\
return user_array;\n\
}');
});


test('arrays referenced directly - Array(4) webgl', () => {
  const node = new WebGLFunctionNode((function refDirect() {
    const array = [0, 0, 0, 0];
    return array;
  }).toString(), { returnType: 'Array(4)', output: [1] });
  assert.equal(node.toString(), 'vec4 refDirect() {\n\
vec4 user_array=vec4(0.0, 0.0, 0.0, 0.0);\n\
return user_array;\n\
}');
});
test('arrays referenced directly - Array(4) webgl2', () => {
  const node = new WebGL2FunctionNode((function refDirect() {
    const array = [0, 0, 0, 0];
    return array;
  }).toString(), { returnType: 'Array(4)', output: [1] });
  assert.equal(node.toString(), 'vec4 refDirect() {\n\
vec4 user_array=vec4(0.0, 0.0, 0.0, 0.0);\n\
return user_array;\n\
}');
});
test('arrays referenced directly - Array(4) cpu', () => {
  const node = new CPUFunctionNode((function refDirect() {
    const array = [0, 0, 0, 0];
    return array;
  }).toString(), { returnType: 'Array(4)', output: [1] });
  assert.equal(node.toString(), 'function refDirect() {\n\
const user_array=new Float32Array([0, 0, 0, 0]);\n\
return user_array;\n\
}');
});


test('arrays referenced indirectly - Array(2) webgl', () => {
  const node = new WebGLFunctionNode((function indirect() {
    const array = [0, 0];
    const array2 = array;
    return array2;
  }).toString(), { returnType: 'Array(2)', output: [1] });
  assert.equal(node.toString(), 'vec2 indirect() {\n\
vec2 user_array=vec2(0.0, 0.0);\n\
vec2 user_array2=user_array;\n\
return user_array2;\n\
}');
});
test('arrays referenced indirectly - Array(2) webgl2', () => {
  const node = new WebGL2FunctionNode((function indirect() {
    const array = [0, 0];
    const array2 = array;
    return array2;
  }).toString(), { returnType: 'Array(2)', output: [1] });
  assert.equal(node.toString(), 'vec2 indirect() {\n\
vec2 user_array=vec2(0.0, 0.0);\n\
vec2 user_array2=user_array;\n\
return user_array2;\n\
}');
});
test('arrays referenced indirectly - Array(2) cpu', () => {
  const node = new CPUFunctionNode((function indirect() {
    const array = [0, 0];
    const array2 = array;
    return array2;
  }).toString(), { returnType: 'Array(2)', output: [1] });
  assert.equal(node.toString(), 'function indirect() {\n\
const user_array=new Float32Array([0, 0]);\n\
const user_array2=user_array;\n\
return user_array2;\n\
}');
});


test('arrays referenced indirectly - Array(3) webgl', () => {
  const node = new WebGLFunctionNode((function indirect() {
    const array = [0, 0, 0];
    const array2 = array;
    return array2;
  }).toString(), { returnType: 'Array(3)', output: [1] });
  assert.equal(node.toString(), 'vec3 indirect() {\n\
vec3 user_array=vec3(0.0, 0.0, 0.0);\n\
vec3 user_array2=user_array;\n\
return user_array2;\n\
}');
});
test('arrays referenced indirectly - Array(3) webgl2', () => {
  const node = new WebGL2FunctionNode((function indirect() {
    const array = [0, 0, 0];
    const array2 = array;
    return array2;
  }).toString(), { returnType: 'Array(3)', output: [1] });
  assert.equal(node.toString(), 'vec3 indirect() {\n\
vec3 user_array=vec3(0.0, 0.0, 0.0);\n\
vec3 user_array2=user_array;\n\
return user_array2;\n\
}');
});
test('arrays referenced indirectly - Array(3) cpu', () => {
  const node = new CPUFunctionNode((function indirect() {
    const array = [0, 0, 0];
    const array2 = array;
    return array2;
  }).toString(), { returnType: 'Array(3)', output: [1] });
  assert.equal(node.toString(), 'function indirect() {\n\
const user_array=new Float32Array([0, 0, 0]);\n\
const user_array2=user_array;\n\
return user_array2;\n\
}');
});


test('arrays referenced indirectly - Array(4) webgl', () => {
  const node = new WebGLFunctionNode((function indirect() {
    const array = [0, 0, 0, 0];
    const array2 = array;
    return array2;
  }).toString(), { returnType: 'Array(4)', output: [1] });
  assert.equal(node.toString(), 'vec4 indirect() {\n\
vec4 user_array=vec4(0.0, 0.0, 0.0, 0.0);\n\
vec4 user_array2=user_array;\n\
return user_array2;\n\
}');
});
test('arrays referenced indirectly - Array(4) webgl2', () => {
  const node = new WebGL2FunctionNode((function indirect() {
    const array = [0, 0, 0, 0];
    const array2 = array;
    return array2;
  }).toString(), { returnType: 'Array(4)', output: [1] });
  assert.equal(node.toString(), 'vec4 indirect() {\n\
vec4 user_array=vec4(0.0, 0.0, 0.0, 0.0);\n\
vec4 user_array2=user_array;\n\
return user_array2;\n\
}');
});
test('arrays referenced indirectly - Array(4) cpu', () => {
  const node = new CPUFunctionNode((function indirect() {
    const array = [0, 0, 0, 0];
    const array2 = array;
    return array2;
  }).toString(), { returnType: 'Array(4)', output: [1] });
  assert.equal(node.toString(), 'function indirect() {\n\
const user_array=new Float32Array([0, 0, 0, 0]);\n\
const user_array2=user_array;\n\
return user_array2;\n\
}');
});


test('arrays arguments - Array(2) webgl', () => {
  const node = new WebGLFunctionNode((function arrayArguments(array, array2) {
    const array3 = [0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }).toString(), { argumentTypes: ['Array(2)', 'Array(2)'], output: [1] });
  assert.equal(node.toString(), 'vec2 arrayArguments(vec2 user_array, vec2 user_array2) {\n\
vec2 user_array3=vec2(0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
});
test('arrays arguments - Array(2) webgl2', () => {
  const node = new WebGL2FunctionNode((function arrayArguments(array, array2) {
    const array3 = [0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }).toString(), { argumentTypes: ['Array(2)', 'Array(2)'], output: [1] });
  assert.equal(node.toString(), 'vec2 arrayArguments(vec2 user_array, vec2 user_array2) {\n\
vec2 user_array3=vec2(0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
});
test('arrays arguments - Array(2) cpu', () => {
  const node = new CPUFunctionNode((function arrayArguments(array, array2) {
    const array3 = [0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }).toString(), { argumentTypes: ['Array(2)', 'Array(2)'], output: [1] });
  assert.equal(node.toString(), 'function arrayArguments(user_array, user_array2) {\n\
const user_array3=new Float32Array([0, 0]);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
});

test('arrays arguments - Array(3) webgl', () => {
  const node = new WebGLFunctionNode((function arrayArguments(array, array2) {
    const array3 = [0, 0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }).toString(), { argumentTypes: ['Array(3)', 'Array(3)'], output: [1] });
  assert.equal(node.toString(), 'vec3 arrayArguments(vec3 user_array, vec3 user_array2) {\n\
vec3 user_array3=vec3(0.0, 0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
});
test('arrays arguments - Array(3) webgl2', () => {
  const node = new WebGL2FunctionNode((function arrayArguments(array, array2) {
    const array3 = [0, 0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }).toString(), { argumentTypes: ['Array(3)', 'Array(3)'], output: [1] });
  assert.equal(node.toString(), 'vec3 arrayArguments(vec3 user_array, vec3 user_array2) {\n\
vec3 user_array3=vec3(0.0, 0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
});
test('arrays arguments - Array(3) cpu', () => {
  const node = new CPUFunctionNode((function arrayArguments(array, array2) {
    const array3 = [0, 0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }).toString(), { argumentTypes: ['Array(3)', 'Array(3)'], output: [1] });
  assert.equal(node.toString(), 'function arrayArguments(user_array, user_array2) {\n\
const user_array3=new Float32Array([0, 0, 0]);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
});


test('arrays arguments - Array(4) webgl', () => {
  const node = new WebGLFunctionNode((function arrayArguments(array, array2) {
    const array3 = [0, 0, 0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }).toString(), { argumentTypes: ['Array(4)', 'Array(4)'], output: [1] });
  assert.equal(node.toString(), 'vec4 arrayArguments(vec4 user_array, vec4 user_array2) {\n\
vec4 user_array3=vec4(0.0, 0.0, 0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
});
test('arrays arguments - Array(4) webgl2', () => {
  const node = new WebGL2FunctionNode((function arrayArguments(array, array2) {
    const array3 = [0, 0, 0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }).toString(), { argumentTypes: ['Array(4)', 'Array(4)'], output: [1] });
  assert.equal(node.toString(), 'vec4 arrayArguments(vec4 user_array, vec4 user_array2) {\n\
vec4 user_array3=vec4(0.0, 0.0, 0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
});
test('arrays arguments - Array(4) cpu', () => {
  const node = new CPUFunctionNode((function arrayArguments(array, array2) {
    const array3 = [0, 0, 0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }).toString(), { argumentTypes: ['Array(4)', 'Array(4)'], output: [1] });
  assert.equal(node.toString(), 'function arrayArguments(user_array, user_array2) {\n\
const user_array3=new Float32Array([0, 0, 0, 0]);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
});

test('arrays inherited - Array(2) webgl', () => {
  const node = new WebGLFunctionNode((function inherited(array, array2) {
    const array3 = [0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }).toString(), { argumentTypes: ['Array(2)', 'Array(2)'], returnType: 'Array(2)', output: [1] });
  assert.equal(node.toString(), 'vec2 inherited(vec2 user_array, vec2 user_array2) {\n\
vec2 user_array3=vec2(0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
});
test('arrays inherited - Array(2) webgl2', () => {
  const node = new WebGL2FunctionNode((function inherited(array, array2) {
    const array3 = [0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }).toString(), { argumentTypes: ['Array(2)', 'Array(2)'], returnType: 'Array(2)', output: [1] });
  assert.equal(node.toString(), 'vec2 inherited(vec2 user_array, vec2 user_array2) {\n\
vec2 user_array3=vec2(0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
});
test('arrays inherited - Array(2) cpu', () => {
  const node = new CPUFunctionNode((function inherited(array, array2) {
    const array3 = [0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }).toString(), { argumentTypes: ['Array(2)', 'Array(2)'], returnType: 'Array(2)', output: [1] });
  assert.equal(node.toString(), 'function inherited(user_array, user_array2) {\n\
const user_array3=new Float32Array([0, 0]);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
});

test('arrays inherited - Array(3) webgl', () => {
  const node = new WebGLFunctionNode((function inherited(array, array2) {
    const array3 = [0, 0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }).toString(), { argumentTypes: ['Array(3)', 'Array(3)'], returnType: 'Array(3)', output: [1] });
  assert.equal(node.toString(), 'vec3 inherited(vec3 user_array, vec3 user_array2) {\n\
vec3 user_array3=vec3(0.0, 0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
});
test('arrays inherited - Array(3) webgl2', () => {
  const node = new WebGL2FunctionNode((function inherited(array, array2) {
    const array3 = [0, 0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }).toString(), { argumentTypes: ['Array(3)', 'Array(3)'], returnType: 'Array(3)', output: [1] });
  assert.equal(node.toString(), 'vec3 inherited(vec3 user_array, vec3 user_array2) {\n\
vec3 user_array3=vec3(0.0, 0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
});

test('arrays inherited - Array(3) cpu', () => {
  const node = new CPUFunctionNode((function inherited(array, array2) {
    const array3 = [0, 0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }).toString(), { argumentTypes: ['Array(3)', 'Array(3)'], returnType: 'Array(3)', output: [1] });
  assert.equal(node.toString(), 'function inherited(user_array, user_array2) {\n\
const user_array3=new Float32Array([0, 0, 0]);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
});

test('arrays inherited - Array(4) webgl', () => {
  const node = new WebGLFunctionNode((function inherited(array, array2) {
    const array3 = [0, 0, 0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }).toString(), { argumentTypes: ['Array(4)', 'Array(4)'], returnType: 'Array(4)', output: [1] });
  assert.equal(node.toString(), 'vec4 inherited(vec4 user_array, vec4 user_array2) {\n\
vec4 user_array3=vec4(0.0, 0.0, 0.0, 0.0);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
});
test('arrays inherited - Array(4) webgl2', () => {
  const node = new WebGL2FunctionNode((function inherited(array, array2) {
    const array3 = [0, 0, 0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }).toString(), { argumentTypes: ['Array(4)', 'Array(4)'], returnType: 'Array(4)', output: [1] });
  assert.equal(node.toString(), 'vec4 inherited(vec4 user_array, vec4 user_array2) {'
    + '\nvec4 user_array3=vec4(0.0, 0.0, 0.0, 0.0);'
    + '\nuser_array3[0]=user_array[0];'
    + '\nuser_array3[1]=(user_array[1]*user_array2[1]);'
    + '\nreturn user_array3;'
    + '\n}');
});
test('arrays inherited - Array(4) cpu', () => {
  const node = new CPUFunctionNode((function inherited(array, array2) {
    const array3 = [0, 0, 0, 0];
    array3[0] = array[0];
    array3[1] = array[1] * array2[1];
    return array3;
  }).toString(), { argumentTypes: ['Array(4)', 'Array(4)'], returnType: 'Array(4)', output: [1] });
  assert.equal(node.toString(), 'function inherited(user_array, user_array2) {\n\
const user_array3=new Float32Array([0, 0, 0, 0]);\n\
user_array3[0]=user_array[0];\n\
user_array3[1]=(user_array[1]*user_array2[1]);\n\
return user_array3;\n\
}');
});

test('auto detect float, array, array2d, array3d - webgl', () => {
  const node = new WebGLFunctionNode(`function advancedUsed(int, array, array2d, array3d) {
    let allValues = this.constants.float;
    allValues += this.constants.int;
    allValues += this.constants.array[this.thread.x];
    allValues += this.constants.array2d[this.thread.x][this.thread.y];
    allValues += this.constants.array3d[this.thread.x][this.thread.y][this.thread.z];
    allValues += int;
    allValues += array[this.thread.x];
    allValues += array2d[this.thread.x][this.thread.y];
    allValues += array3d[this.thread.x][this.thread.y][this.thread.z];

    return allValues * Math.random();
  }`, {
    returnType: 'Number',
    output: [1],
    argumentTypes: ['Integer', 'Array', 'Array2D', 'Array3D'],
    constants: { float: 1, int: 1, array: [1], array2d: [[1]], array3d: [[[1]]] },
    constantTypes: { float: 'Float', int: 'Integer', array: 'Array', array2d: 'Array2D', array3d: 'Array3D' },
    constantBitRatios: { float: 0, int: 0, array: 4, array2d: 4, array3d: 4 },
    lookupFunctionArgumentBitRatio: () => 4,
  });

  assert.equal(node.toString(), 'float advancedUsed(int user_int, sampler2D user_array,ivec2 user_arraySize,ivec3 user_arrayDim, sampler2D user_array2d,ivec2 user_array2dSize,ivec3 user_array2dDim, sampler2D user_array3d,ivec2 user_array3dSize,ivec3 user_array3dDim) {'
    + '\nfloat user_allValues=constants_float;'
    + '\nuser_allValues+=float(constants_int);'
    + '\nuser_allValues+=get32(constants_array, constants_arraySize, constants_arrayDim, 0, 0, threadId.x);'
    + '\nuser_allValues+=get32(constants_array2d, constants_array2dSize, constants_array2dDim, 0, threadId.x, threadId.y);'
    + '\nuser_allValues+=get32(constants_array3d, constants_array3dSize, constants_array3dDim, threadId.x, threadId.y, threadId.z);'
    + '\nuser_allValues+=float(user_int);'
    + '\nuser_allValues+=get32(user_array, user_arraySize, user_arrayDim, 0, 0, threadId.x);'
    + '\nuser_allValues+=get32(user_array2d, user_array2dSize, user_array2dDim, 0, threadId.x, threadId.y);'
    + '\nuser_allValues+=get32(user_array3d, user_array3dSize, user_array3dDim, threadId.x, threadId.y, threadId.z);'
    + '\nreturn (user_allValues*random());'
    + '\n}');
});


function notDefined(mode) {
  const gpu = new GPU({ mode });
  const kernel1 = gpu.createKernel(function() {
    return result;
  }, { output: [1] });
  assert.throws(() => {
    kernel1();
  }, new Error('Identifier is not defined on line 1, position 0:\n result'));
  const kernel2 = gpu.createKernel(function() {
    return result[0];
  }, { output: [1] });
  assert.throws(() => {
    kernel2();
  }, new Error('Identifier is not defined on line 1, position 0:\n result'));
  const kernel3 = gpu.createKernel(function() {
    return result[0][0];
  }, { output: [1] });
  assert.throws(() => {
    kernel3();
  }, new Error('Identifier is not defined on line 1, position 0:\n result'));
  const kernel4 = gpu.createKernel(function() {
    return result[0][0][0];
  }, { output: [1] });
  assert.throws(() => {
    kernel4();
  }, new Error('Identifier is not defined on line 1, position 0:\n result'));
  const kernel5 = gpu.createKernel(function() {
    return result[0][0][0][0];
  }, { output: [1] });
  assert.throws(() => {
    kernel5();
  }, new Error('Identifier is not defined on line 1, position 1:\n result'));
  gpu.destroy();
}

test('not defined auto', () => {
  notDefined();
});

test('not defined gpu', () => {
  notDefined('gpu');
});

(GPU.isWebGLSupported ? test : skip)('not defined webgl', () => {
  notDefined('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('not defined webgl2', () => {
  notDefined('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('not defined headlessgl', () => {
  notDefined('headlessgl');
});

test('not defined cpu', () => {
  notDefined('cpu');
});
