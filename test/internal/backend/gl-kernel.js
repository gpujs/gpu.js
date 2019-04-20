const { assert, test, module: describe, only } = require('qunit');
const { GLKernel } = require(process.cwd() + '/src');

describe('GLKernel');

test('nativeFunctionArguments() parse simple function', () => {
  const result = GLKernel.nativeFunctionArguments(`vec2 myFunction(vec2 longName) {
    return vec2(1, 1);
  }`);

  assert.deepEqual(result, {
    argumentNames: ['longName'],
    argumentTypes: ['Array(2)']
  });
});

test('nativeFunctionArguments() parse simple function with argument that has number', () => {
  const result = GLKernel.nativeFunctionArguments(`vec2 myFunction(vec2 longName123) {
    return vec2(1, 1);
  }`);

  assert.deepEqual(result, {
    argumentNames: ['longName123'],
    argumentTypes: ['Array(2)']
  });
});

test('nativeFunctionArguments() parse simple function, multiple arguments', () => {
  const result = GLKernel.nativeFunctionArguments(`vec2 myFunction(vec3 a,vec3 b,float c) {
    return vec2(1, 1);
  }`);

  assert.deepEqual(result, {
    argumentNames: ['a', 'b', 'c'],
    argumentTypes: ['Array(3)', 'Array(3)', 'Number']
  });
});

test('nativeFunctionArguments() parse simple function, multiple arguments with comments', () => {
  const result = GLKernel.nativeFunctionArguments(`vec2 myFunction(vec3 a /* vec4 b */,vec2 c, /* vec4 d */ float e) {
    return vec2(1, 1);
  }`);

  assert.deepEqual(result, {
    argumentNames: ['a', 'c', 'e'],
    argumentTypes: ['Array(3)', 'Array(2)', 'Number']
  });
});

test('nativeFunctionArguments() parse simple function, multiple arguments on multi line with spaces', () => {
  const result = GLKernel.nativeFunctionArguments(`vec2 myFunction(
    vec4  a,
    vec3  b,
    float  c
  ) {
    vec3 delta = a - b;
  }`);

  assert.deepEqual(result, {
    argumentNames: ['a', 'b', 'c'],
    argumentTypes: ['Array(4)', 'Array(3)', 'Number']
  });
});

test('nativeFunctionArguments() parse simple function, multiple arguments on multi line with spaces and multi-line-comments', () => {
  const result = GLKernel.nativeFunctionArguments(`vec2 myFunction(
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
    argumentNames: ['a', 'b', 'c'],
    argumentTypes: ['Array(2)', 'Array(3)', 'Number']
  });
});

test('nativeFunctionArguments() parse simple function, multiple arguments on multi line with spaces and in-line-comments', () => {
  const result = GLKernel.nativeFunctionArguments(`vec2 myFunction(
    vec2  a, // test 1
    vec4  b, // test 2
    int  c // test 3
  ) {
    vec3 delta = a - b;
  }`);

  assert.deepEqual(result, {
    argumentNames: ['a', 'b', 'c'],
    argumentTypes: ['Array(2)', 'Array(4)', 'Integer']
  });
});

test('nativeFunctionArguments() parse simple function that is cut short', () => {
  const result = GLKernel.nativeFunctionArguments(`vec2 myFunction(
    vec2  a,
    vec3  b,
    float  c
  )`);

  assert.deepEqual(result, {
    argumentNames: ['a', 'b', 'c'],
    argumentTypes: ['Array(2)', 'Array(3)', 'Number']
  });
});
