const { assert, test, module: describe, skip } = require('qunit');
const sinon = require('sinon');
const { GPU } = require('../../src');

describe('internal: kernelRunShortcut');

function testImmutableSavesSwitchedKernel(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    return value[0] + 1;
  }, {
    output: [1],
    pipeline: true,
    immutable: true,
  });
  const one = kernel(new Float32Array([0]));
  const arrayKernel = kernel.kernel;
  const arrayKernelSpy = sinon.spy(arrayKernel, 'onRequestSwitchKernel');

  // recompile kernel
  const two = kernel(one);
  assert.equal(arrayKernelSpy.callCount, 1);
  const textureKernel = kernel.kernel;
  const textureKernelSpy = sinon.spy(textureKernel, 'onRequestSwitchKernel');
  assert.ok(kernel.kernel !== arrayKernel);
  assert.ok(kernel.kernel === textureKernel);

  // reuse existing kernel a few times, ensure no overwriting
  const three = kernel(two);
  assert.equal(arrayKernelSpy.callCount, 1);
  assert.equal(textureKernelSpy.callCount, 0);
  assert.ok(kernel.kernel === textureKernel);
  const four = kernel(three);
  assert.equal(arrayKernelSpy.callCount, 1);
  assert.equal(textureKernelSpy.callCount, 0);
  assert.ok(kernel.kernel === textureKernel);
  const five = kernel(four);
  assert.equal(arrayKernelSpy.callCount, 1);
  assert.equal(textureKernelSpy.callCount, 0);
  assert.ok(kernel.kernel === textureKernel);
  const six = kernel(five);
  assert.equal(arrayKernelSpy.callCount, 1);
  assert.equal(textureKernelSpy.callCount, 0);
  assert.ok(kernel.kernel === textureKernel);

  // switch back to original kernel, don't recompile
  assert.deepEqual(six.toArray(), new Float32Array([6]));
  const seven = kernel(six.toArray());
  assert.ok(kernel.kernel === arrayKernel);
  assert.equal(arrayKernelSpy.callCount, 1);
  assert.equal(textureKernelSpy.callCount, 1);

  // ensure output has been correct all along
  assert.deepEqual(one.toArray(), new Float32Array([1]));
  assert.deepEqual(two.toArray(), new Float32Array([2]));
  assert.deepEqual(three.toArray(), new Float32Array([3]));
  assert.deepEqual(four.toArray(), new Float32Array([4]));
  assert.deepEqual(five.toArray(), new Float32Array([5]));
  assert.deepEqual(six.toArray(), new Float32Array([6]));
  assert.deepEqual(seven.toArray(), new Float32Array([7]));
  gpu.destroy();
}

test('immutable saves switched kernel auto', () => {
  testImmutableSavesSwitchedKernel();
});

test('immutable saves switched kernel gpu', () => {
  testImmutableSavesSwitchedKernel('gpu');
});

(GPU.isWebGLSupported ? test : skip)('immutable saves switched kernel webgl', () => {
  testImmutableSavesSwitchedKernel('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('immutable saves switched kernel webgl2', () => {
  testImmutableSavesSwitchedKernel('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('immutable saves switched kernel headlessgl', () => {
  testImmutableSavesSwitchedKernel('headlessgl');
});