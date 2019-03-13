const { assert, test, module: describe, only } = require('qunit');
const { GLKernel } = require(process.cwd() + '/src');

describe('GLKernel');

test('nativeFunctionArgumentTypes() parse simple function', () => {
  const result = GLKernel.nativeFunctionArgumentTypes(`vec2 myFunction(vec2 longName) {
    return vec2(1, 1);
  }`);

  assert.deepEqual(result, {
    names: ['longName'],
    types: ['Array(2)']
  });
});

test('nativeFunctionArgumentTypes() parse simple function with argument that has number', () => {
  const result = GLKernel.nativeFunctionArgumentTypes(`vec2 myFunction(vec2 longName123) {
    return vec2(1, 1);
  }`);

  assert.deepEqual(result, {
    names: ['longName123'],
    types: ['Array(2)']
  });
});

test('nativeFunctionArgumentTypes() parse simple function, multiple arguments', () => {
  const result = GLKernel.nativeFunctionArgumentTypes(`vec2 myFunction(vec3 a,vec3 b,float c) {
    return vec2(1, 1);
  }`);

  assert.deepEqual(result, {
    names: ['a', 'b', 'c'],
    types: ['Array(3)', 'Array(3)', 'Number']
  });
});

test('nativeFunctionArgumentTypes() parse simple function, multiple arguments', () => {
  const result = GLKernel.nativeFunctionArgumentTypes(`vec2 myFunction(vec3 a /* vec4 b */,vec2 c, /* vec4 d */ float e) {
    return vec2(1, 1);
  }`);

  assert.deepEqual(result, {
    names: ['a', 'c', 'e'],
    types: ['Array(3)', 'Array(2)', 'Number']
  });
});

test('nativeFunctionArgumentTypes() parse simple function, multiple arguments on multi line with spaces', () => {
  const result = GLKernel.nativeFunctionArgumentTypes(`vec2 myFunction(
    vec4  a,
    vec3  b,
    float  c
  ) {
    vec3 delta = a - b;
  }`);

  assert.deepEqual(result, {
    names: ['a', 'b', 'c'],
    types: ['Array(4)', 'Array(3)', 'Number']
  });
});

test('nativeFunctionArgumentTypes() parse simple function, multiple arguments on multi line with spaces and multi-line-comments', () => {
  const result = GLKernel.nativeFunctionArgumentTypes(`vec2 myFunction(
    vec2  a,
    /* test 1 */
    vec3  b,
    /* test 2 */
    float  c
    /* test 3 */
  ) {
    vec3 delta = a - b;
  }`);

  assert.deepEqual(result, {
    names: ['a', 'b', 'c'],
    types: ['Array(2)', 'Array(3)', 'Number']
  });
});

test('nativeFunctionArgumentTypes() parse simple function, multiple arguments on multi line with spaces and in-line-comments', () => {
  const result = GLKernel.nativeFunctionArgumentTypes(`vec2 myFunction(
    vec2  a, // test 1
    vec4  b, // test 2
    int  c // test 3
  ) {
    vec3 delta = a - b;
  }`);

  assert.deepEqual(result, {
    names: ['a', 'b', 'c'],
    types: ['Array(2)', 'Array(4)', 'Integer']
  });
});

test('nativeFunctionArgumentTypes() parse simple function that is cut short', () => {
  const result = GLKernel.nativeFunctionArgumentTypes(`vec2 myFunction(
    vec2  a,
    vec3  b,
    float  c
  )`);

  assert.deepEqual(result, {
    names: ['a', 'b', 'c'],
    types: ['Array(2)', 'Array(3)', 'Number']
  });
});
