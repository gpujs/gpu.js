const { assert, skip, test, module: describe } = require('qunit');
const { GPU, WebGLKernel, WebGL2Kernel, HeadlessGLKernel, CPUKernel } = require('../../src');

describe('internal: modes');

test('modes no settings auto', () => {
  const gpu = new GPU();
  if (GPU.isHeadlessGLSupported) {
    assert.equal(gpu.Kernel, HeadlessGLKernel);
  } else if (GPU.isWebGL2Supported) {
    assert.equal(gpu.Kernel, WebGL2Kernel);
  } else if (GPU.isWebGLSupported) {
    assert.equal(gpu.Kernel, WebGLKernel);
  }
});
test('modes null settings auto', () => {
  const gpu = new GPU(null);
  if (GPU.isHeadlessGLSupported) {
    assert.equal(gpu.Kernel, HeadlessGLKernel);
  } else if (GPU.isWebGL2Supported) {
    assert.equal(gpu.Kernel, WebGL2Kernel);
  } else if (GPU.isWebGLSupported) {
    assert.equal(gpu.Kernel, WebGLKernel);
  }
});
test('modes empty object auto', () => {
  const gpu = new GPU({});
  if (GPU.isHeadlessGLSupported) {
    assert.equal(gpu.Kernel, HeadlessGLKernel);
  } else if (GPU.isWebGL2Supported) {
    assert.equal(gpu.Kernel, WebGL2Kernel);
  } else if (GPU.isWebGLSupported) {
    assert.equal(gpu.Kernel, WebGLKernel);
  }
});
test('modes gpu', () => {
  const gpu = new GPU({ mode: 'gpu' });
  if (GPU.isHeadlessGLSupported) {
    assert.equal(gpu.Kernel, HeadlessGLKernel);
  } else if (GPU.isWebGL2Supported) {
    assert.equal(gpu.Kernel, WebGL2Kernel);
  } else if (GPU.isWebGLSupported) {
    assert.equal(gpu.Kernel, WebGLKernel);
  }
});
test('modes cpu', () => {
  const gpu = new GPU({ mode: 'cpu' });
  assert.equal(gpu.Kernel, CPUKernel);
});
(GPU.isWebGLSupported ? test : skip)('modes webgl', () => {
  const gpu = new GPU({ mode: 'webgl' });
  assert.equal(gpu.Kernel, WebGLKernel);
});
(GPU.isWebGL2Supported ? test : skip)('modes webgl2', () => {
  const gpu = new GPU({ mode: 'webgl2' });
  assert.equal(gpu.Kernel, WebGL2Kernel);
});
(GPU.isHeadlessGLSupported ? test : skip)('modes headlessgl', () => {
  const gpu = new GPU({ mode: 'headlessgl' });
  assert.equal(gpu.Kernel, HeadlessGLKernel
  );
});
