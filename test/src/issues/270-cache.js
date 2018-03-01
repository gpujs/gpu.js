QUnit.test('Issue #270 WebGlKernel getUniformLocation caches falsey - gpu', () => {
  const kernel = new GPU.WebGLKernel('', {});
  kernel.programUniformLocationCache.test = false;
  kernel._webGl = {};
  kernel._webGl.getUniformLocation = () => {
    throw new Error('tried to get getUniformLocation when falsey');
  };
  QUnit.assert.equal(kernel.getUniformLocation('test'), false);
});