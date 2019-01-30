const { assert, skip, test, module: describe } = require('qunit');
const { WebGLKernel } = require('../../src');

describe('issue # 270');

test('Issue #270 WebGlKernel getUniformLocation caches falsey - gpu', () => {
  const canvas = {};
  const context = {
    getUniformLocation() {
      throw new Error('tried to get getUniformLocation when falsey');
    }
  };
  const kernel = new WebGLKernel('function() {}', { canvas, context });
  kernel.programUniformLocationCache.test = false;
  assert.equal(kernel.getUniformLocation('test'), false);
});
