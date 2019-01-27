var GPU = require('../../src/index');

QUnit.test('modes no settings (auto)', function() {
  const gpu = new GPU();
  if (GPU.isHeadlessGLSupported) {
    QUnit.assert.equal(gpu.Kernel, GPU.HeadlessGLKernel);
  } else if (GPU.isWebGL2Supported) {
    QUnit.assert.equal(gpu.Kernel, GPU.WebGL2Kernel);
  } else if (GPU.isWebGLSupported) {
    QUnit.assert.equal(gpu.Kernel, GPU.WebGLKernel);
  }
});
QUnit.test('modes null settings (auto)', function() {
  const gpu = new GPU(null);
  if (GPU.isHeadlessGLSupported) {
    QUnit.assert.equal(gpu.Kernel, GPU.HeadlessGLKernel);
  } else if (GPU.isWebGL2Supported) {
    QUnit.assert.equal(gpu.Kernel, GPU.WebGL2Kernel);
  } else if (GPU.isWebGLSupported) {
    QUnit.assert.equal(gpu.Kernel, GPU.WebGLKernel);
  }
});
QUnit.test('modes empty object (auto)', function() {
  const gpu = new GPU({});
  if (GPU.isHeadlessGLSupported) {
    QUnit.assert.equal(gpu.Kernel, GPU.HeadlessGLKernel);
  } else if (GPU.isWebGL2Supported) {
    QUnit.assert.equal(gpu.Kernel, GPU.WebGL2Kernel);
  } else if (GPU.isWebGLSupported) {
    QUnit.assert.equal(gpu.Kernel, GPU.WebGLKernel);
  }
});
QUnit.test('modes (gpu)', function() {
  const gpu = new GPU({ mode: 'gpu' });
  if (GPU.isHeadlessGLSupported) {
    QUnit.assert.equal(gpu.Kernel, GPU.HeadlessGLKernel);
  } else if (GPU.isWebGL2Supported) {
    QUnit.assert.equal(gpu.Kernel, GPU.WebGL2Kernel);
  } else if (GPU.isWebGLSupported) {
    QUnit.assert.equal(gpu.Kernel, GPU.WebGLKernel);
  }
});
QUnit.test('modes (cpu)', function() {
  const gpu = new GPU({ mode: 'cpu' });
  QUnit.assert.equal(gpu.Kernel, GPU.CPUKernel);
});
QUnit.test('modes (webgl)', function() {
  const gpu = new GPU({ mode: 'webgl' });
  QUnit.assert.equal(gpu.Kernel, GPU.WebGLKernel);
});
QUnit.test('modes (webgl2)', function() {
  const gpu = new GPU({ mode: 'webgl2' });
  QUnit.assert.equal(gpu.Kernel, GPU.WebGL2Kernel);
});
QUnit.test('modes (headlessgl)', function() {
  const gpu = new GPU({ mode: 'headlessgl' });
  QUnit.assert.equal(gpu.Kernel, GPU.HeadlessGLKernel
  );
});
