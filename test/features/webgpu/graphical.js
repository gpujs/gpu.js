const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../../src');

describe('features: webgpu graphical');

// Graphical mode on webgpu: the kernel is still a compute pass writing RGBA
// floats to the storage buffer; a fixed fullscreen-triangle render pipeline
// presents it to a canvas. Orientation matches the GL backends (thread.y = 0
// is the bottom row); getPixels returns a Promise, since webgpu readback is
// asynchronous.

let adapterPromise = null;
async function webgpuAdapter(assert) {
  if (!adapterPromise) adapterPromise = navigator.gpu.requestAdapter();
  const adapter = await adapterPromise;
  if (!adapter) {
    if (typeof window !== 'undefined') {
      window.__webgpuRuntimeSkips = (window.__webgpuRuntimeSkips || 0) + 1;
    }
    assert.ok(true, 'navigator.gpu present but no adapter (headless/blocklisted) — runtime skip');
  }
  return adapter;
}

(GPU.isWebGPUSupported ? test : skip)('renders and reads back a solid color webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(5);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function () {
    this.color(1, 0.5, 0, 1);
  }, { output: [8, 8], graphical: true });
  const result = await kernel();
  assert.equal(result, undefined, 'a graphical run resolves nothing');
  assert.ok(kernel.canvas instanceof HTMLCanvasElement, 'kernel exposes a canvas');
  assert.equal(kernel.canvas.width, 8, 'canvas width follows output');
  const pixels = await kernel.kernel.getPixels();
  assert.equal(pixels.length, 8 * 8 * 4);
  assert.deepEqual(Array.from(pixels.slice(0, 4)), [255, 128, 0, 255], 'first pixel');
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('row order matches the GL backends webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(3);
  const gpu = new GPU({ mode: 'webgpu' });
  // bottom row (thread.y = 0) red, top row green
  const kernel = gpu.createKernel(function () {
    if (this.thread.y === 0) {
      this.color(1, 0, 0, 1);
    } else {
      this.color(0, 1, 0, 1);
    }
  }, { output: [4, 4], graphical: true });
  await kernel();
  const pixels = await kernel.kernel.getPixels();
  assert.deepEqual(Array.from(pixels.slice(0, 4)), [0, 255, 0, 255], 'default is image order: top row first');
  assert.deepEqual(Array.from(pixels.slice(-4)), [255, 0, 0, 255], 'bottom row (thread.y = 0) last');
  const raw = await kernel.kernel.getPixels(true);
  assert.deepEqual(Array.from(raw.slice(0, 4)), [255, 0, 0, 255], 'flip = true is the raw bottom-up buffer');
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('a gradient computes per pixel webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(2);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function () {
    this.color(this.thread.x / 4, this.thread.y / 4, 0, 1);
  }, { output: [4, 4], graphical: true });
  await kernel();
  const raw = await kernel.kernel.getPixels(true);
  // pixel (x=2, y=1) in raw buffer order
  const at = (1 * 4 + 2) * 4;
  assert.equal(raw[at], 128, 'r follows thread.x');
  assert.equal(raw[at + 1], 64, 'g follows thread.y');
  await gpu.destroy();
});

(GPU.isWebGPUSupported ? test : skip)('three-argument color defaults alpha to 1 webgpu', async assert => {
  if (!(await webgpuAdapter(assert))) return;
  assert.expect(1);
  const gpu = new GPU({ mode: 'webgpu' });
  const kernel = gpu.createKernel(function () {
    this.color(0, 0, 1);
  }, { output: [4, 4], graphical: true });
  await kernel();
  const pixels = await kernel.kernel.getPixels();
  assert.deepEqual(Array.from(pixels.slice(0, 4)), [0, 0, 255, 255]);
  await gpu.destroy();
});

test('mode async binds a graphical kernel to its backend at creation', async assert => {
  // a canvas is permanently committed to its first context type, so the
  // backend must be decided before the canvas is exposed -- with the probe
  // settled, a graphical kernel constructs directly on webgpu and its canvas
  // is the final one from the first read, never swapped
  if (!GPU.isWebGL2Supported && !GPU.isWebGLSupported) {
    assert.ok(true, 'no GL backend here');
    return;
  }
  const adapterAnswered = GPU.isWebGPUSupported ? await GPU.isWebGPUAvailable() : false;
  const gpu = new GPU({ mode: 'async' });
  await GPU.isWebGPUAvailable().catch(() => false); // settle this instance's probe
  const kernel = gpu.createKernel(function () {
    this.color(1, 0, 0, 1);
  }, { output: [4, 4], graphical: true });
  const canvasBefore = kernel.canvas;
  await kernel();
  await kernel();
  assert.equal(kernel.canvas, canvasBefore, 'the canvas never changes identity');
  if (adapterAnswered) {
    assert.equal(kernel.kernel.constructor.name, 'WebGPUKernel', 'bound to webgpu at creation');
  } else {
    assert.notEqual(kernel.kernel.constructor.name, 'WebGPUKernel', 'no adapter: proven backend');
  }
  await gpu.destroy();
});

test('mode async graphical created before the probe settles stays on the proven backend', async assert => {
  if (!GPU.isWebGL2Supported && !GPU.isWebGLSupported) {
    assert.ok(true, 'no GL backend here');
    return;
  }
  // same tick as the GPU: the probe cannot have settled, and a graphical
  // kernel must not gamble on it -- the canvas handed out is final
  const gpu = new GPU({ mode: 'async' });
  const kernel = gpu.createKernel(function () {
    this.color(1, 0, 0, 1);
  }, { output: [4, 4], graphical: true });
  const canvasBefore = kernel.canvas;
  await kernel();
  assert.notEqual(kernel.kernel.constructor.name, 'WebGPUKernel', 'stayed on the proven backend');
  assert.equal(kernel.canvas, canvasBefore, 'canvas identity held across the first call');
  await gpu.destroy();
});
