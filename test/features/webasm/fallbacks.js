const { assert, skip, test, module: describe } = require('qunit');
const { GPU, input } = require('../../../src');

describe('features: webasm fallbacks');

// webasm sits in the auto chain one step above cpu, so everything it cannot
// take must DEGRADE, not throw -- these tests pin every requestFallback path
// so a reordering in build() cannot silently remove the degradation.

test('kernel maps degrade to cpu', () => {
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernelMap({
    doubled: function d(x) { return x * 2; },
  }, function (a) {
    return d(a[this.thread.x]) + 1;
  }, { output: [4] });
  const { result, doubled } = kernel([1, 2, 3, 4]);
  assert.deepEqual(Array.from(result), [3, 5, 7, 9]);
  assert.deepEqual(Array.from(doubled), [2, 4, 6, 8]);
  assert.equal(kernel.kernel.constructor.name, 'CPUKernel');
  // the degradation is queryable, not just a console line (#868)
  assert.ok(/kernel maps/.test(kernel.kernel.fallbackReason), `names the reason: ${ kernel.kernel.fallbackReason }`);
  gpu.destroy();
});

(GPU.isHeadlessGLSupported ? test : skip)('a texture argument degrades to cpu', () => {
  const glGpu = new GPU({ mode: 'headlessgl' });
  const texture = glGpu.createKernel(function () {
    return this.thread.x * 10;
  }, { output: [4], pipeline: true })();
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function (v) {
    return v[this.thread.x] + 1;
  }, { output: [4] });
  const result = kernel(texture);
  assert.deepEqual(Array.from(result), [1, 11, 21, 31]);
  assert.equal(kernel.kernel.constructor.name, 'CPUKernel');
  assert.ok(/argument "v"/.test(kernel.kernel.fallbackReason), `names the argument: ${ kernel.kernel.fallbackReason }`);
  gpu.destroy();
  glGpu.destroy();
});

(GPU.isCanvasSupported ? skip : test)('graphical without a canvas throws exactly what cpu throws', () => {
  // no DOM: the error is cpu parity, not a webasm invention
  const gpu = new GPU({ mode: 'webasm' });
  assert.throws(() => {
    gpu.createKernel(function () {
      this.color(1, 0, 0, 1);
    }, { output: [4, 4], graphical: true })();
  }, /no canvas available/);
  gpu.destroy();
});

(GPU.isCanvasSupported ? test : skip)('graphical degrades to cpu and keeps its canvas', () => {
  // the webasm kernel creates the canvas element without committing a
  // context, so the cpu fallback renders into that same element -- the one
  // the user may already have appended
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function () {
    this.color(1, 0, 0, 1);
  }, { output: [4, 4], graphical: true });
  const canvasBefore = kernel.canvas;
  assert.ok(canvasBefore, 'canvas exists at creation');
  kernel();
  assert.equal(kernel.kernel.constructor.name, 'CPUKernel', 'degraded to cpu');
  assert.equal(kernel.canvas, canvasBefore, 'same canvas element after the fallback');
  const pixels = kernel.kernel.getPixels();
  assert.deepEqual(Array.from(pixels.slice(0, 4)), [255, 0, 0, 255], 'and it rendered');
  gpu.destroy();
});

test('toString throws its deferral clearly', () => {
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function () {
    return this.thread.x;
  }, { output: [4] });
  kernel();
  assert.throws(() => kernel.toString(), /WebAssembly backend does not yet support/);
  gpu.destroy();
});

(GPU.isHeadlessGLSupported ? test : skip)('a texture argument AFTER a plain-array build switches and degrades', () => {
  // self-typed values pass the base type check (kernel-value machinery
  // handles them elsewhere); this backend has none, so an already-built
  // kernel must flag the switch itself instead of crashing in flattenTo
  const glGpu = new GPU({ mode: 'headlessgl' });
  const texture = glGpu.createKernel(function () {
    return this.thread.x * 10;
  }, { output: [4], pipeline: true })();
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function (v) {
    return v[this.thread.x] + 1;
  }, { output: [4] });
  assert.deepEqual(Array.from(kernel([5, 6, 7, 8])), [6, 7, 8, 9], 'builds on webasm first');
  assert.equal(kernel.kernel.constructor.name, 'WebAssemblyKernel');
  assert.deepEqual(Array.from(kernel(texture)), [1, 11, 21, 31], 'the texture call still computes');
  assert.deepEqual(Array.from(kernel([5, 6, 7, 8])), [6, 7, 8, 9], 'plain arrays still work after');
  gpu.destroy();
  glGpu.destroy();
});

test('the fallback cpu kernel can itself switch on an argument-type change', () => {
  // the kernel constructed by onRequestFallback lives as long as the
  // shortcut; without the switch hooks a later type change threw
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernelMap({
    doubled: function d(x) { return x * 2; },
  }, function (a) {
    return d(a[this.thread.x]) + 1;
  }, { output: [4] });
  assert.deepEqual(Array.from(kernel([1, 2, 3, 4]).result), [3, 5, 7, 9], 'kernel map degrades and runs');
  const viaInput = kernel(input(new Float32Array([5, 6, 7, 8]), [4]));
  assert.deepEqual(Array.from(viaInput.result), [11, 13, 15, 17], 'an Input after an Array switches cleanly');
  gpu.destroy();
});
