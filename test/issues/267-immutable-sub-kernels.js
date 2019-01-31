const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #267 kernel');

function immutableKernel(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (v) {
    return v[this.thread.x] + 1;
  }, {
    output: [1],
    immutable: true,
    pipeline: true
  });

  // start with a value on CPU
  const output1 = kernel([1]);
  const result1 = output1.toArray(gpu)[0];

  // reuse that output, simulating that this value will be monitored, and updated via the same kernel
  // this is often used in neural networks
  const output2 = kernel(output1);
  const result2 = output2.toArray(gpu)[0];

  const output3 = kernel(output2);
  const result3 = output3.toArray(gpu)[0];

  assert.equal(result1, 2);
  assert.equal(result2, 3);
  assert.equal(result3, 4);
  gpu.destroy();
}

test('Issue #267 immutable kernel output - auto', () => {
  immutableKernel();
});

test('Issue #267 immutable kernel output - gpu', () => {
  immutableKernel('gpu');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #267 immutable kernel output - webgl', () => {
  immutableKernel('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #267 immutable kernel output - webgl2', () => {
  immutableKernel('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #267 immutable kernel output - headlessgl', () => {
  immutableKernel('headlessgl');
});



describe('issue #267 sub kernel');

function immutableSubKernels(mode) {
  function value1(value) {
    return value + 1;
  }

  function value2(value) {
    return value + 1;
  }

  const gpu = new GPU({ mode });
  const kernel = gpu.createKernelMap(
    {
      valueOutput1: value1,
      valueOutput2: value2
    },
    function (a, b) {
      value1(a[this.thread.x]);
      return value2(b[this.thread.x]);
    },
    {
      output: [1],
      immutable: true,
      pipeline: true
    }
  );

  // start with a value on CPU
  const output1 = kernel([1], [2]);
  const result1 = output1.valueOutput1.toArray(gpu)[0];

  // reuse that output, simulating that this value will be monitored, and updated via the same kernel
  // this is often used in neural networks
  const output2 = kernel(output1.valueOutput1, output1.valueOutput2);
  const result2 = output2.valueOutput1.toArray(gpu)[0];

  const output3 = kernel(output2.valueOutput1, output2.valueOutput2);
  const result3 = output3.valueOutput1.toArray(gpu)[0];

  assert.equal(result1, 2);
  assert.equal(result2, 3);
  assert.equal(result3, 4);
  gpu.destroy();
}
(GPU.isKernelMapSupported ? test : skip)('Issue #267 immutable sub-kernel output - auto', () => {
  immutableSubKernels();
});

(GPU.isKernelMapSupported ? test : skip)('Issue #267 immutable sub-kernel output - gpu', () => {
  immutableSubKernels('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Issue #267 immutable sub-kernel output - webgl', () => {
  immutableSubKernels('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #267 immutable sub-kernel output - webgl2', () => {
  immutableSubKernels('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('Issue #267 immutable sub-kernel output - headlessgl', () => {
  immutableSubKernels('headlessgl');
});



describe('issue #267 sub kernels mixed');
function immutableKernelsMixed(mode) {
  function value1(value) {
    return value + 1;
  }

  function value2(value) {
    return value + 1;
  }

  const gpu = new GPU({ mode });
  const kernel = gpu.createKernelMap(
    {
      valueOutput1: value1,
      valueOutput2: value2
    },
    function (a, b) {
      value1(a[this.thread.x]);
      return value2(b[this.thread.x]) + 1;
    },
    {
      output: [1],
      immutable: true,
      pipeline: true
    }
  );

  // start with a value on CPU
  const output1 = kernel([1], [2]);
  const result1 = output1.result.toArray(gpu)[0];

  // reuse that output, simulating that this value will be monitored, and updated via the same kernel
  // this is often used in neural networks
  const output2 = kernel(output1.result, output1.valueOutput2);
  const result2 = output2.result.toArray(gpu)[0];

  const output3 = kernel(output2.result, output2.valueOutput2);
  const result3 = output3.result.toArray(gpu)[0];

  assert.equal(result1, 4);
  assert.equal(result2, 5);
  assert.equal(result3, 6);
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('Issue #267 immutable kernel & sub-kernel output - auto', () => {
  immutableKernelsMixed();
});

(GPU.isKernelMapSupported ? test : skip)('Issue #267 immutable kernel & sub-kernel output - gpu', () => {
  immutableKernelsMixed('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Issue #267 immutable kernel & sub-kernel output - webgl', () => {
  immutableKernelsMixed('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #267 immutable kernel & sub-kernel output - webgl2', () => {
  immutableKernelsMixed('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('Issue #267 immutable kernel & sub-kernel output - headlessgl', () => {
  immutableKernelsMixed('headlessgl');
});
