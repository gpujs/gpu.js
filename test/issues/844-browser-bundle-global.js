const { assert, test, skip, module: describe } = require('qunit');

// This reads dist/ off disk, so it is a Node-only test. all.html lists every
// test file, and the browser require shim throws for 'fs' — which killed the
// page before any test ran.
const isNode = typeof window === 'undefined' || typeof process !== 'undefined' && !!(process.versions || {}).node;
const fs = isNode ? require('fs') : null;
const path = isNode ? require('path') : null;

describe('issue #844 - browser bundle global GPU');

function loadBundle(file, window, strict) {
  let code = fs.readFileSync(path.join(__dirname, '../../dist', file), 'utf8');
  // an ES module load evaluates the bundle in strict mode (#639)
  if (strict) code = '"use strict";' + code;
  // shadow the CommonJS/AMD/global bindings so the UMD wrapper takes the
  // same branch it takes in a real browser
  new Function('window', 'self', 'exports', 'module', 'define', 'global', code)(window, window);
  return window;
}

function nativeWebGPUStub() {
  // Chrome 113+ defines window.GPU as the (non-callable) WebGPU interface
  const window = {};
  Object.defineProperty(window, 'GPU', {
    value: function GPU() {
      throw new TypeError('Illegal constructor');
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
  return window;
}

['gpu-browser.js', 'gpu-browser.min.js'].forEach(file => {
  (isNode ? test : skip)(`new GPU() works with native WebGPU present (Chrome/Edge) - ${file}`, () => {
    const window = loadBundle(file, nativeWebGPUStub());
    assert.equal(typeof window.GPU, 'function');
    assert.equal(typeof window.GPU.prototype.createKernel, 'function');
    const gpu = new window.GPU({ mode: 'cpu' });
    assert.ok(gpu instanceof window.GPU);
  });

  (isNode ? test : skip)(`new GPU() works without native WebGPU (Firefox) - ${file}`, () => {
    const window = loadBundle(file, {});
    assert.equal(typeof window.GPU, 'function');
    const gpu = new window.GPU({ mode: 'cpu' });
    assert.ok(gpu instanceof window.GPU);
  });

  (isNode ? test : skip)(`new GPU.GPU() workaround still works - ${file}`, () => {
    const window = loadBundle(file, nativeWebGPUStub());
    assert.strictEqual(window.GPU.GPU, window.GPU);
    const gpu = new window.GPU.GPU({ mode: 'cpu' });
    assert.ok(gpu instanceof window.GPU);
  });

  (isNode ? test : skip)(`namespace exports remain attached to GPU - ${file}`, () => {
    const window = loadBundle(file, {});
    assert.equal(typeof window.GPU.Texture, 'function');
    assert.equal(typeof window.GPU.Input, 'function');
    assert.equal(typeof window.GPU.input, 'function');
    assert.equal(typeof window.GPU.utils, 'object');
  });

  (isNode ? test : skip)(`an already loaded gpu.js is left in place - ${file}`, () => {
    const window = loadBundle(file, {});
    const first = window.GPU;
    loadBundle(file, window);
    assert.strictEqual(window.GPU, first);
  });

  // issue #639: a strict-mode (ES module) load must not throw
  // "Cannot set property GPU of #<Window> which has only a getter"
  (isNode ? test : skip)(`strict-mode load works without native WebGPU - ${file}`, () => {
    const window = loadBundle(file, {}, true);
    const gpu = new window.GPU({ mode: 'cpu' });
    assert.ok(gpu instanceof window.GPU);
  });

  (isNode ? test : skip)(`strict-mode load works with native WebGPU present - ${file}`, () => {
    const window = loadBundle(file, nativeWebGPUStub(), true);
    const gpu = new window.GPU({ mode: 'cpu' });
    assert.ok(gpu instanceof window.GPU);
  });
});
