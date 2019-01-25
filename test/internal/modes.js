var GPU = require('../../src/index');

QUnit.test('modes no settings (auto)', function() {
  const gpu = new GPU();
  if (GPU.isHeadlessGLSupported) {
    QUnit.assert.equal(gpu.runner.constructor, GPU.HeadlessGLRunner);
  } else if (GPU.isWebGL2Supported) {
    QUnit.assert.equal(gpu.runner.constructor, GPU.WebGL2Runner);
  } else if (GPU.isWebGLSupported) {
    QUnit.assert.equal(gpu.runner.constructor, GPU.WebGLRunner);
  }
});
QUnit.test('modes null settings (auto)', function() {
  const gpu = new GPU(null);
  if (GPU.isHeadlessGLSupported) {
    QUnit.assert.equal(gpu.runner.constructor, GPU.HeadlessGLRunner);
  } else if (GPU.isWebGL2Supported) {
    QUnit.assert.equal(gpu.runner.constructor, GPU.WebGL2Runner);
  } else if (GPU.isWebGLSupported) {
    QUnit.assert.equal(gpu.runner.constructor, GPU.WebGLRunner);
  }
});
QUnit.test('modes empty object (auto)', function() {
  const gpu = new GPU({});
  if (GPU.isHeadlessGLSupported) {
    QUnit.assert.equal(gpu.runner.constructor, GPU.HeadlessGLRunner);
  } else if (GPU.isWebGL2Supported) {
    QUnit.assert.equal(gpu.runner.constructor, GPU.WebGL2Runner);
  } else if (GPU.isWebGLSupported) {
    QUnit.assert.equal(gpu.runner.constructor, GPU.WebGLRunner);
  }
});
QUnit.test('modes (gpu)', function() {
  const gpu = new GPU({ mode: 'gpu' });
  if (GPU.isHeadlessGLSupported) {
    QUnit.assert.equal(gpu.runner.constructor, GPU.HeadlessGLRunner);
  } else if (GPU.isWebGL2Supported) {
    QUnit.assert.equal(gpu.runner.constructor, GPU.WebGL2Runner);
  } else if (GPU.isWebGLSupported) {
    QUnit.assert.equal(gpu.runner.constructor, GPU.WebGLRunner);
  }
});
QUnit.test('modes (cpu)', function() {
  const gpu = new GPU({ mode: 'cpu' });
  QUnit.assert.equal(gpu.runner.constructor, GPU.CPURunner);
});
QUnit.test('modes (webgl)', function() {
  const gpu = new GPU({ mode: 'webgl' });
  QUnit.assert.equal(gpu.runner.constructor, GPU.WebGLRunner);
});
QUnit.test('modes (webgl2)', function() {
  const gpu = new GPU({ mode: 'webgl2' });
  QUnit.assert.equal(gpu.runner.constructor, GPU.WebGL2Runner);
});
QUnit.test('modes (headlessgl)', function() {
  const gpu = new GPU({ mode: 'headlessgl' });
  QUnit.assert.equal(gpu.runner.constructor, GPU.HeadlessGLRunner);
});
