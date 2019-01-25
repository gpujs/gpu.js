var GPU = require('../../src/index');

QUnit.test('Issue #270 WebGlKernel getUniformLocation caches falsey - gpu', () => {
  const canvas = {};
  const context = {
    getUniformLocation() {
      throw new Error('tried to get getUniformLocation when falsey');
    }
  };
  const kernel = new GPU.WebGLKernel('', { canvas, context });
  kernel.programUniformLocationCache.test = false;
  QUnit.assert.equal(kernel.getUniformLocation('test'), false);
});
