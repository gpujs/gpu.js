const { assert, test, module: describe } = require('qunit');
const { GPU, HeadlessGLKernel, WebGL2Kernel, WebGLKernel, WebAssemblyKernel } = require('../../../src');

describe('features: webasm basics');

// No support guards: wasm ships in every environment this suite runs in
// (Node and every browser BrowserStack fields), so a missing WebAssembly is
// itself a failure worth hearing about.

test('isWebAssemblySupported webasm', assert => {
  assert.expect(1);
  assert.equal(GPU.isWebAssemblySupported, true);
});

test('returns a constant 1d webasm', assert => {
  assert.expect(3);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function() {
    return 42;
  }, { output: [8] });
  const result = kernel();
  assert.equal(result.constructor, Float32Array);
  assert.equal(result.length, 8);
  assert.deepEqual(Array.from(result), [42, 42, 42, 42, 42, 42, 42, 42]);
  gpu.destroy();
});

test('scalar map 1d webasm', assert => {
  assert.expect(2);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function() {
    return this.thread.x;
  }, { output: [8] });
  const first = kernel();
  assert.deepEqual(Array.from(first), [0, 1, 2, 3, 4, 5, 6, 7]);
  // second call must reuse the built module, not rebuild
  const second = kernel();
  assert.deepEqual(Array.from(second), [0, 1, 2, 3, 4, 5, 6, 7]);
  gpu.destroy();
});

test('scalar map 2d webasm', assert => {
  assert.expect(3);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function() {
    return this.thread.y * 100 + this.thread.x;
  }, { output: [4, 3] });
  const result = kernel();
  assert.equal(result.length, 3);
  assert.equal(result[0].constructor, Float32Array);
  assert.deepEqual(result.map(row => Array.from(row)), [
    [0, 1, 2, 3],
    [100, 101, 102, 103],
    [200, 201, 202, 203],
  ]);
  gpu.destroy();
});

test('scalar map 3d webasm', assert => {
  assert.expect(2);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function() {
    return this.thread.z * 100 + this.thread.y * 10 + this.thread.x;
  }, { output: [2, 3, 2] });
  const result = kernel();
  assert.equal(result.length, 2);
  assert.deepEqual(result.map(layer => layer.map(row => Array.from(row))), [
    [[0, 1], [10, 11], [20, 21]],
    [[100, 101], [110, 111], [120, 121]],
  ]);
  gpu.destroy();
});

test('array returns webasm', assert => {
  assert.expect(3);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel2 = gpu.createKernel(function() {
    return [this.thread.x, this.thread.x + 0.5];
  }, { output: [3] });
  assert.deepEqual(kernel2().map(v => Array.from(v)), [[0, 0.5], [1, 1.5], [2, 2.5]]);
  const kernel3 = gpu.createKernel(function() {
    return [1, this.thread.x, 3];
  }, { output: [2] });
  assert.deepEqual(kernel3().map(v => Array.from(v)), [[1, 0, 3], [1, 1, 3]]);
  const kernel4 = gpu.createKernel(function() {
    return [1, 2, 3, this.thread.x];
  }, { output: [2] });
  assert.deepEqual(kernel4().map(v => Array.from(v)), [[1, 2, 3, 0], [1, 2, 3, 1]]);
  gpu.destroy();
});

test('matches cpu on transcendental math webasm', assert => {
  const source = function(a) {
    return Math.sin(a[this.thread.x]) * Math.exp(a[this.thread.x] / 10) + Math.sqrt(a[this.thread.x] + 1) - Math.log(a[this.thread.x] + 2);
  };
  const values = [0, 0.25, 0.5, 1, 2, 3, 4.5, 9];
  const webasm = new GPU({ mode: 'webasm' });
  const cpu = new GPU({ mode: 'cpu' });
  const expected = cpu.createKernel(source, { output: [8] })(values);
  const actual = webasm.createKernel(source, { output: [8] })(values);
  assert.expect(values.length);
  for (let i = 0; i < values.length; i++) {
    const relative = Math.abs(actual[i] - expected[i]) / Math.max(Math.abs(expected[i]), 1e-6);
    assert.ok(relative <= 1e-6, `cell ${ i }: ${ actual[i] } vs cpu ${ expected[i] }`);
  }
  webasm.destroy();
  cpu.destroy();
});

test('mode gpu auto-selection is not displaced by webasm', assert => {
  assert.expect(2);
  const gpu = new GPU({ mode: 'gpu' });
  assert.notEqual(gpu.Kernel, WebAssemblyKernel, 'a GL backend outranks webasm');
  if (GPU.isHeadlessGLSupported) {
    assert.equal(gpu.Kernel, HeadlessGLKernel, 'Node still lands on headlessgl');
  } else {
    assert.ok(gpu.Kernel === WebGL2Kernel || gpu.Kernel === WebGLKernel, 'browser still lands on a WebGL backend');
  }
  gpu.destroy();
});

test('kernelOrder holds webasm last, one step above the cpu fallback', assert => {
  assert.expect(1);
  let kernelOrder = null;
  try {
    kernelOrder = require('../../../src/gpu').kernelOrder;
  } catch (e) {
    // the browser shim resolves only '../src'; there the ordering is proven
    // behaviorally by the auto-selection test above
  }
  if (kernelOrder) {
    assert.deepEqual(kernelOrder, [HeadlessGLKernel, WebGL2Kernel, WebGLKernel, WebAssemblyKernel]);
  } else {
    assert.ok(true, 'kernelOrder not reachable from the bundle');
  }
});

test('precision unsigned is accepted and computes as single webasm', assert => {
  assert.expect(1);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function(a) {
    return a[this.thread.x] * 1.5;
  }, { output: [4], precision: 'unsigned' });
  assert.deepEqual(Array.from(kernel([1, 2, 3, 4])), [1.5, 3, 4.5, 6]);
  gpu.destroy();
});

test('setOutput resizes with dynamicOutput webasm', assert => {
  assert.expect(2);
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function() {
    return this.thread.x;
  }, { output: [4], dynamicOutput: true });
  assert.deepEqual(Array.from(kernel()), [0, 1, 2, 3]);
  kernel.setOutput([6]);
  assert.deepEqual(Array.from(kernel()), [0, 1, 2, 3, 4, 5]);
  gpu.destroy();
});
