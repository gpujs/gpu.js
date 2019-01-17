var GPU = require('../../src/index');

QUnit.test('modes no settings (auto)', function() {
  const gpu = new GPU();
  QUnit.assert.equal(gpu.getRunner().constructor, GPU.WebGL2Runner);
});
QUnit.test('modes null settings (auto)', function() {
  const gpu = new GPU(null);
  QUnit.assert.equal(gpu.getRunner().constructor, GPU.WebGL2Runner);
});
QUnit.test('modes empty object (auto)', function() {
  const gpu = new GPU({});
  QUnit.assert.equal(gpu.getRunner().constructor, GPU.WebGL2Runner);
});
QUnit.test('modes (gpu)', function() {
  const gpu = new GPU({ mode: 'gpu' });
  QUnit.assert.equal(gpu.getRunner().constructor, GPU.WebGL2Runner);
});
QUnit.test('modes (cpu)', function() {
  const gpu = new GPU({ mode: 'cpu' });
  QUnit.assert.equal(gpu.getRunner().constructor, GPU.CPURunner);
});
QUnit.test('modes (webgl)', function() {
  const gpu = new GPU({ mode: 'webgl' });
  QUnit.assert.equal(gpu.getRunner().constructor, GPU.WebGLRunner);
});
QUnit.test('modes (webgl2)', function() {
  const gpu = new GPU({ mode: 'webgl2' });
  QUnit.assert.equal(gpu.getRunner().constructor, GPU.WebGL2Runner);
});
QUnit.test('modes (headlessgl)', function() {
  const gpu = new GPU({ mode: 'headlessgl' });
  QUnit.assert.equal(gpu.getRunner().constructor, GPU.HeadlessGLRunner);
});
