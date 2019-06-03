const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('issue #267 kernel');

function immutableKernelWithoutFloats(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (v) {
    return v[this.thread.x] + 1;
  }, {
    output: [1],
    immutable: true,
    pipeline: true,
    precision: 'unsigned',
  });

  // start with a value on CPU
  const output1 = kernel([1]);
  const result1 = output1.toArray()[0];

  // reuse that output, simulating that this value will be monitored, and updated via the same kernel
  // this is often used in neural networks
  const output2 = kernel(output1);
  const result2 = output2.toArray()[0];

  const output3 = kernel(output2);
  const result3 = output3.toArray()[0];

  assert.equal(result1, 2);
  assert.equal(result2, 3);
  assert.equal(result3, 4);
  gpu.destroy();
}

test('Issue #267 immutable kernel output without floats - auto', () => {
  immutableKernelWithoutFloats();
});

test('Issue #267 immutable kernel output without floats - gpu', () => {
  immutableKernelWithoutFloats('gpu');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #267 immutable kernel output without floats - webgl', () => {
  immutableKernelWithoutFloats('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #267 immutable kernel output without floats - webgl2', () => {
  immutableKernelWithoutFloats('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #267 immutable kernel output without floats - headlessgl', () => {
  immutableKernelWithoutFloats('headlessgl');
});

function immutableKernelWithFloats(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (v) {
    return v[this.thread.x] + 1;
  }, {
    output: [1],
    immutable: true,
    pipeline: true,
    precision: 'single',
  });

  // start with a value on CPU
  // reuse that output, simulating that this value will be monitored, and updated via the same kernel
  // this is often used in neural networks
  const output1 = kernel([1]);
  const output2 = kernel(output1);
  const output3 = kernel(output2);

  assert.equal(output1.toArray()[0], 2);
  assert.equal(output2.toArray()[0], 3);
  assert.equal(output3.toArray()[0], 4);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('Issue #267 immutable kernel output with floats - auto', () => {
  immutableKernelWithFloats();
});

(GPU.isSinglePrecisionSupported ? test : skip)('Issue #267 immutable kernel output with floats - gpu', () => {
  immutableKernelWithFloats('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('Issue #267 immutable kernel output with floats - webgl', () => {
  immutableKernelWithFloats('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('Issue #267 immutable kernel output with floats - webgl2', () => {
  immutableKernelWithFloats('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('Issue #267 immutable kernel output with floats - headlessgl', () => {
  immutableKernelWithFloats('headlessgl');
});


describe('issue #267 sub kernel');

function immutableSubKernelsWithoutFloats(mode) {
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
      pipeline: true,
      precision: 'unsigned',
    }
  );

  // start with a value on CPU
  const output1 = kernel([1], [2]);
  const result1 = output1.valueOutput1.toArray()[0];

  // reuse that output, simulating that this value will be monitored, and updated via the same kernel
  // this is often used in neural networks
  const output2 = kernel(output1.valueOutput1, output1.valueOutput2);
  const result2 = output2.valueOutput1.toArray()[0];

  const output3 = kernel(output2.valueOutput1, output2.valueOutput2);
  const result3 = output3.valueOutput1.toArray()[0];

  assert.equal(result1, 2);
  assert.equal(result2, 3);
  assert.equal(result3, 4);
  gpu.destroy();
}
(GPU.isKernelMapSupported ? test : skip)('Issue #267 immutable sub-kernel output - auto', () => {
  immutableSubKernelsWithoutFloats();
});

(GPU.isKernelMapSupported ? test : skip)('Issue #267 immutable sub-kernel output - gpu', () => {
  immutableSubKernelsWithoutFloats('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Issue #267 immutable sub-kernel output - webgl', () => {
  immutableSubKernelsWithoutFloats('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #267 immutable sub-kernel output - webgl2', () => {
  immutableSubKernelsWithoutFloats('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('Issue #267 immutable sub-kernel output - headlessgl', () => {
  immutableSubKernelsWithoutFloats('headlessgl');
});



describe('issue #267 sub kernels mixed');
function immutableKernelsMixedWithoutFloats(mode) {
  function value1(value) {
    return value + 10;
  }

  function value2(value) {
    return value + 50;
  }

  const gpu = new GPU({ mode });
  const kernel = gpu.createKernelMap(
    {
      valueOutput1: value1,
      valueOutput2: value2,
    },
    function (a, b) {
      value1(a[this.thread.x]);
      return value2(b[this.thread.x]) + 100;
    },
    {
      output: [1],
      immutable: true,
      pipeline: true,
      precision: 'unsigned',
    }
  );

  // start with a value on CPU
  const output1 = kernel([10], [20]);

  // reuse that output, simulating that this value will be monitored, and updated via the same kernel
  // this is often used in neural networks
  const output2 = kernel(output1.result, output1.valueOutput2);
  const output3 = kernel(output2.result, output2.valueOutput2);

  function toArray(value) {
    return value.toArray ? value.toArray() : value;
  }

  assert.equal(toArray(output1.valueOutput1)[0], 20); // 10 + 10
  assert.equal(toArray(output1.valueOutput2)[0], 70); // 20 + 50
  assert.equal(toArray(output1.result)[0], 170); // (20 + 50) + 100

  assert.equal(toArray(output2.valueOutput1)[0], 180); // 170 + 10
  assert.equal(toArray(output2.valueOutput2)[0], 120); // 70 + 50
  assert.equal(toArray(output2.result)[0], 220); // (70 + 50) + 100

  assert.equal(toArray(output3.valueOutput1)[0], 230); // 220 + 10
  assert.equal(toArray(output3.valueOutput2)[0], 170); // 120 + 50
  assert.equal(toArray(output3.result)[0], 270); // (120 + 50) + 100

  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('Issue #267 immutable kernel & sub-kernel output without floats - auto', () => {
  immutableKernelsMixedWithoutFloats();
});

(GPU.isKernelMapSupported ? test : skip)('Issue #267 immutable kernel & sub-kernel output without floats - gpu', () => {
  immutableKernelsMixedWithoutFloats('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Issue #267 immutable kernel & sub-kernel output without floats - webgl', () => {
  immutableKernelsMixedWithoutFloats('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #267 immutable kernel & sub-kernel output without floats - webgl2', () => {
  immutableKernelsMixedWithoutFloats('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('Issue #267 immutable kernel & sub-kernel output without floats - headlessgl', () => {
  immutableKernelsMixedWithoutFloats('headlessgl');
});

test('Issue #267 immutable kernel & sub-kernel output without floats - cpu', () => {
  immutableKernelsMixedWithoutFloats('cpu');
});
