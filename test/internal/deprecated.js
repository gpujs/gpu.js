const { assert, test, module: describe, only, skip } = require('qunit');
const { GPU, Kernel } = require('../../src');

describe('internal: deprecated');

test('GPU.createKernel settings floatOutput true', () => {
  const gpu = new GPU();
  const kernel = gpu.createKernel(function() {}, { floatOutput: true });
  assert.equal(kernel.precision, 'single');
  assert.notOk(kernel.kernel.hasOwnProperty('floatOutput'));
  gpu.destroy();
});

test('GPU.createKernel settings floatOutput false', () => {
  const gpu = new GPU();
  const kernel = gpu.createKernel(function() {}, { floatOutput: false });
  assert.equal(kernel.precision, 'unsigned');
  assert.notOk(kernel.kernel.hasOwnProperty('floatOutput'));
  gpu.destroy();
});

test('GPU.createKernel settings outputToTexture true', () => {
  const gpu = new GPU();
  const kernel = gpu.createKernel(function() {}, { outputToTexture: true });
  assert.equal(kernel.pipeline, true);
  assert.notOk(kernel.kernel.hasOwnProperty('outputToTexture'));
  gpu.destroy();
});

test('GPU.createKernel settings outputToTexture false', () => {
  const gpu = new GPU();
  const kernel = gpu.createKernel(function() {}, { outputToTexture: false });
  assert.equal(kernel.pipeline, false);
  assert.notOk(kernel.kernel.hasOwnProperty('outputToTexture'));
  gpu.destroy();
});

test('GPU.createKernel settings outputImmutable true', () => {
  const gpu = new GPU();
  const kernel = gpu.createKernel(function() {}, { outputImmutable: true });
  assert.equal(kernel.immutable, true);
  assert.notOk(kernel.kernel.hasOwnProperty('outputImmutable'));
  gpu.destroy();
});

test('GPU.createKernel settings outputImmutable false', () => {
  const gpu = new GPU();
  const kernel = gpu.createKernel(function() {}, { outputImmutable: false });
  assert.equal(kernel.immutable, false);
  assert.notOk(kernel.kernel.hasOwnProperty('outputImmutable'));
  gpu.destroy();
});

test('GPU.createKernel settings floatTextures true', () => {
  const gpu = new GPU();
  const kernel = gpu.createKernel(function() {}, { floatTextures: true });
  assert.equal(kernel.optimizeFloatMemory, true);
  assert.notOk(kernel.kernel.hasOwnProperty('floatTextures'));
  gpu.destroy();
});

test('GPU.createKernel settings floatTextures false', () => {
  const gpu = new GPU();
  const kernel = gpu.createKernel(function() {}, { floatTextures: false });
  assert.equal(kernel.optimizeFloatMemory, false);
  assert.notOk(kernel.kernel.hasOwnProperty('floatTextures'));
  gpu.destroy();
});

test('Kernel.getCanvas', () => {
  const canvas = {};
  const kernel = new Kernel(`function() {}`);
  kernel.initContext = () => {};
  kernel.initPlugins = () => {};
  kernel.mergeSettings({
    canvas
  });
  assert.equal(kernel.getCanvas(), canvas);
});

test('Kernel.getWebGl', () => {
  const canvas = {};
  const context = {};
  const kernel = new Kernel(`function() {}`);
  kernel.initContext = () => {};
  kernel.initPlugins = () => {};
  kernel.mergeSettings({
    canvas,
    context
  });
  assert.equal(kernel.getWebGl(), context);
});

test('Kernel.setOutputToTexture', () => {
  const kernel = new Kernel(`function() {}`);
  kernel.setOutputToTexture(true);
  assert.equal(kernel.pipeline, true);
});
