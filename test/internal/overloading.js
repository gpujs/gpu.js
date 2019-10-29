const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('internal: overloading');
// TODO: planned for after v2, overload generated functions so as to cut down on casting
// TODO: Complain with incompatible signatures
// TODO: Cast actual return type to addFunction's returnType when they do not match.
// TODO: Look into
test('with Han', () => {
  const gpu = new GPU();
  gpu.addFunction(function dbl(v) {
    return v + v;
  }, { returnType: "Float", argumentTypes: { v: "Float" } });
  try {
    const kernel = gpu.createKernel(function(v) {
      // const output2 = dbl(2);
      let sum = 0;
      for (let i = 0; i < 1; i++) {
        dbl(i);
      }
      // const output1
      dbl(Math.PI);
      return sum;
    }, { output: [1] });
  } finally {
    gpu.destroy();
  }
  assert.ok(1);
});
