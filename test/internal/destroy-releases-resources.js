const { assert, skip, test, module: describe } = require('qunit');
const { GPU, HeadlessGLKernel } = require('../../src');

describe('internal: destroy releases resources');

// kernel.destroy() splices itself out of gpu.kernels, and GPU.destroy() was
// indexing that same array while it shrank. Two consequences:
//
//   * every other kernel was skipped, so half of them were never destroyed
//   * this.kernels[0] was read after the loop had emptied the list, so a GPU
//     with a single kernel never reached destroyContext and leaked its WebGL
//     context — real browsers then hit "Too many active WebGL contexts" and
//     started evicting live ones
//
// The wrapper is installed once and never removed: GPU.destroy() is async, so
// destroys started by other test files can resolve partway through these tests.
// Recording the contexts and matching on our own keeps that from mattering.
const destroyed = [];
const originalDestroyContext = HeadlessGLKernel.destroyContext;
HeadlessGLKernel.destroyContext = function (context) {
  destroyed.push(context);
  return originalDestroyContext ? originalDestroyContext.call(this, context) : undefined;
};

function testDestroy(kernelCount) {
  const gpu = new GPU({ mode: 'headlessgl' });
  for (let i = 0; i < kernelCount; i++) {
    const kernel = gpu.createKernel(function (a) {
      return a[this.thread.x] + 1;
    }, { output: [2] });
    kernel([1, 2]);
  }
  assert.equal(gpu.kernels.length, kernelCount, `expected ${kernelCount} kernels before destroy`);

  // destroy() clears this off the kernels, so hold on to it first
  const first = gpu.kernels[0];
  const context = (first.kernel || first).context;
  assert.ok(context, 'kernel should have a context before destroy');

  return gpu.destroy().then(() => {
    assert.equal(gpu.kernels.length, 0,
      `every kernel should be destroyed, ${gpu.kernels.length} left with ${kernelCount}`);
    const releases = destroyed.filter(c => c === context).length;
    assert.equal(releases, 1,
      `context should be released exactly once with ${kernelCount} kernel(s), saw ${releases}`);
  });
}

[1, 2, 3, 4, 5].forEach(count => {
  (GPU.isHeadlessGLSupported ? test : skip)(`destroy releases every kernel and the context with ${count} kernel(s)`, () => {
    return testDestroy(count);
  });
});
