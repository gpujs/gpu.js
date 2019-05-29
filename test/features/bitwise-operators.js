const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('feature: bitwise operators');

function testBitwiseAndSinglePrecision(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v1, v2) {
    return v1 & v2;
  })
    .setOutput([1])
    .setPrecision('single');

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      assert.equal(kernel(i, j)[0], i & j);
    }
  }

  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('bitwise AND single precision auto', () => {
  testBitwiseAndSinglePrecision();
});

(GPU.isSinglePrecisionSupported ? test : skip)('bitwise AND single precision gpu', () => {
  testBitwiseAndSinglePrecision('gpu');
});

(GPU.isWebGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('bitwise AND single precision webgl', () => {
  testBitwiseAndSinglePrecision('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('bitwise AND single precision webgl2', () => {
  testBitwiseAndSinglePrecision('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('bitwise AND single precision headlessgl', () => {
  testBitwiseAndSinglePrecision('headlessgl');
});

test('bitwise AND single precision cpu', () => {
  testBitwiseAndSinglePrecision('cpu');
});

function testBitwiseAndUnsignedPrecision(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v1, v2) {
    return v1 & v2;
  })
    .setOutput([1])
    .setPrecision('unsigned');

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      assert.equal(kernel(i, j)[0], i & j);
    }
  }

  gpu.destroy();
}

test('bitwise AND unsigned precision auto', () => {
  testBitwiseAndUnsignedPrecision();
});

test('bitwise AND unsigned precision gpu', () => {
  testBitwiseAndUnsignedPrecision('gpu');
});

(GPU.isWebGLSupported ? test : skip)('bitwise AND unsigned precision webgl', () => {
  testBitwiseAndUnsignedPrecision('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('bitwise AND unsigned precision webgl2', () => {
  testBitwiseAndUnsignedPrecision('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('bitwise AND unsigned precision headlessgl', () => {
  testBitwiseAndUnsignedPrecision('headlessgl');
});

test('bitwise AND unsigned precision cpu', () => {
  testBitwiseAndUnsignedPrecision('cpu');
});

function testBitwiseOrSinglePrecision(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v1, v2) {
    return v1 | v2;
  })
    .setOutput([1])
    .setPrecision('single');

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      assert.equal(kernel(i, j)[0], i | j);
    }
  }

  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('bitwise OR single precision auto', () => {
  testBitwiseOrSinglePrecision();
});

(GPU.isSinglePrecisionSupported ? test : skip)('bitwise OR single precision gpu', () => {
  testBitwiseOrSinglePrecision('gpu');
});

(GPU.isWebGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('bitwise OR single precision webgl', () => {
  testBitwiseOrSinglePrecision('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('bitwise OR single precision webgl2', () => {
  testBitwiseOrSinglePrecision('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isSinglePrecisionSupported? test : skip)('bitwise OR single precision headlessgl', () => {
  testBitwiseOrSinglePrecision('headlessgl');
});

test('bitwise OR single precision cpu', () => {
  testBitwiseOrSinglePrecision('cpu');
});

function testBitwiseOrUnsignedPrecision(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v1, v2) {
    return v1 | v2;
  })
    .setOutput([1])
    .setPrecision('unsigned');

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      assert.equal(kernel(i, j)[0], i | j);
    }
  }

  gpu.destroy();
}

test('bitwise OR unsigned precision auto', () => {
  testBitwiseOrUnsignedPrecision();
});

test('bitwise OR unsigned precision gpu', () => {
  testBitwiseOrUnsignedPrecision('gpu');
});

(GPU.isWebGLSupported ? test : skip)('bitwise OR unsigned precision webgl', () => {
  testBitwiseOrUnsignedPrecision('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('bitwise OR unsigned precision webgl2', () => {
  testBitwiseOrUnsignedPrecision('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('bitwise OR unsigned precision headlessgl', () => {
  testBitwiseOrUnsignedPrecision('headlessgl');
});

test('bitwise OR unsigned precision cpu', () => {
  testBitwiseOrUnsignedPrecision('cpu');
});

function testBitwiseXORSinglePrecision(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v1, v2) {
    return v1 ^ v2;
  })
    .setOutput([1])
    .setPrecision('single');

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      assert.equal(kernel(i, j)[0], i ^ j);
    }
  }

  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('bitwise XOR single precision auto', () => {
  testBitwiseXORSinglePrecision();
});

(GPU.isSinglePrecisionSupported ? test : skip)('bitwise XOR single precision gpu', () => {
  testBitwiseXORSinglePrecision('gpu');
});

(GPU.isWebGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('bitwise XOR single precision webgl', () => {
  testBitwiseXORSinglePrecision('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('bitwise XOR single precision webgl2', () => {
  testBitwiseXORSinglePrecision('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('bitwise XOR single precision headlessgl', () => {
  testBitwiseXORSinglePrecision('headlessgl');
});

test('bitwise XOR single precision cpu', () => {
  testBitwiseXORSinglePrecision('cpu');
});

function testBitwiseXORUnsignedPrecision(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v1, v2) {
    return v1 ^ v2;
  })
    .setOutput([1])
    .setPrecision('unsigned');

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      assert.equal(kernel(i, j)[0], i ^ j);
    }
  }

  gpu.destroy();
}

test('bitwise XOR unsigned precision auto', () => {
  testBitwiseXORUnsignedPrecision();
});

test('bitwise XOR unsigned precision gpu', () => {
  testBitwiseXORUnsignedPrecision('gpu');
});

(GPU.isWebGLSupported ? test : skip)('bitwise XOR unsigned precision webgl', () => {
  testBitwiseXORUnsignedPrecision('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('bitwise XOR unsigned precision webgl2', () => {
  testBitwiseXORUnsignedPrecision('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('bitwise XOR unsigned precision headlessgl', () => {
  testBitwiseXORUnsignedPrecision('headlessgl');
});

test('bitwise XOR unsigned precision cpu', () => {
  testBitwiseXORUnsignedPrecision('cpu');
});

function testBitwiseNotSinglePrecision(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v1) {
    return ~v1;
  })
    .setOutput([1])
    .setPrecision('single');

  for (let i = 0; i < 10; i++) {
    assert.equal(kernel(i)[0], ~i);
  }

  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('bitwise NOT single precision auto', () => {
  testBitwiseNotSinglePrecision();
});

(GPU.isSinglePrecisionSupported ? test : skip)('bitwise NOT single precision gpu', () => {
  testBitwiseNotSinglePrecision('gpu');
});

(GPU.isWebGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('bitwise NOT single precision webgl', () => {
  testBitwiseNotSinglePrecision('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('bitwise NOT single precision webgl2', () => {
  testBitwiseNotSinglePrecision('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('bitwise NOT single precision headlessgl', () => {
  testBitwiseNotSinglePrecision('headlessgl');
});

test('bitwise NOT single precision cpu', () => {
  testBitwiseNotSinglePrecision('cpu');
});

function testBitwiseNotUnsignedPrecision(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v1) {
    return ~v1;
  })
    .setOutput([1])
    .setPrecision('unsigned');

  for (let i = 0; i < 10; i++) {
    assert.equal(kernel(i)[0], ~i);
  }

  gpu.destroy();
}

test('bitwise NOT unsigned precision auto', () => {
  testBitwiseNotUnsignedPrecision();
});

test('bitwise NOT unsigned precision gpu', () => {
  testBitwiseNotUnsignedPrecision('gpu');
});

(GPU.isWebGLSupported ? test : skip)('bitwise NOT unsigned precision webgl', () => {
  testBitwiseNotUnsignedPrecision('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('bitwise NOT unsigned precision webgl2', () => {
  testBitwiseNotUnsignedPrecision('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('bitwise NOT unsigned precision headlessgl', () => {
  testBitwiseNotUnsignedPrecision('headlessgl');
});

test('bitwise NOT unsigned precision cpu', () => {
  testBitwiseNotUnsignedPrecision('cpu');
});

function testBitwiseZeroFillLeftShiftSinglePrecision(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v1, v2) {
    return v1 << v2;
  })
    .setOutput([1])
    .setPrecision('single');

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      assert.equal(kernel(i, j)[0], i << j);
    }
  }

  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('bitwise zero fill left shift single precision auto', () => {
  testBitwiseZeroFillLeftShiftSinglePrecision();
});

(GPU.isSinglePrecisionSupported ? test : skip)('bitwise zero fill left shift single precision gpu', () => {
  testBitwiseZeroFillLeftShiftSinglePrecision('gpu');
});

(GPU.isWebGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('bitwise zero fill left shift single precision webgl', () => {
  testBitwiseZeroFillLeftShiftSinglePrecision('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('bitwise zero fill left shift single precision webgl2', () => {
  testBitwiseZeroFillLeftShiftSinglePrecision('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('bitwise zero fill left shift single precision headlessgl', () => {
  testBitwiseZeroFillLeftShiftSinglePrecision('headlessgl');
});

test('bitwise zero fill left shift single precision cpu', () => {
  testBitwiseZeroFillLeftShiftSinglePrecision('cpu');
});

function testBitwiseZeroFillLeftShiftUnsignedPrecision(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v1, v2) {
    return v1 << v2;
  })
    .setOutput([1])
    .setPrecision('unsigned');

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      assert.equal(kernel(i, j)[0], i << j);
    }
  }

  gpu.destroy();
}

test('bitwise zero fill left shift unsigned precision auto', () => {
  testBitwiseZeroFillLeftShiftUnsignedPrecision();
});

test('bitwise zero fill left shift unsigned precision gpu', () => {
  testBitwiseZeroFillLeftShiftUnsignedPrecision('gpu');
});

(GPU.isWebGLSupported ? test : skip)('bitwise zero fill left shift unsigned precision webgl', () => {
  testBitwiseZeroFillLeftShiftUnsignedPrecision('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('bitwise zero fill left shift unsigned precision webgl2', () => {
  testBitwiseZeroFillLeftShiftUnsignedPrecision('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('bitwise zero fill left shift unsigned precision headlessgl', () => {
  testBitwiseZeroFillLeftShiftUnsignedPrecision('headlessgl');
});

test('bitwise zero fill left shift unsigned precision cpu', () => {
  testBitwiseZeroFillLeftShiftUnsignedPrecision('cpu');
});

function testBitwiseSignedRightShiftSinglePrecision(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v1, v2) {
    return v1 >> v2;
  })
    .setOutput([1])
    .setPrecision('single');

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      assert.equal(kernel(i, j)[0], i >> j);
    }
  }

  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('bitwise signed fill right shift single precision auto', () => {
  testBitwiseSignedRightShiftSinglePrecision();
});

(GPU.isSinglePrecisionSupported ? test : skip)('bitwise signed fill right shift single precision gpu', () => {
  testBitwiseSignedRightShiftSinglePrecision('gpu');
});

(GPU.isWebGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('bitwise signed fill right shift single precision webgl', () => {
  testBitwiseSignedRightShiftSinglePrecision('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('bitwise signed fill right shift single precision webgl2', () => {
  testBitwiseSignedRightShiftSinglePrecision('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('bitwise signed fill right shift single precision headlessgl', () => {
  testBitwiseSignedRightShiftSinglePrecision('headlessgl');
});

test('bitwise signed fill right shift single precision cpu', () => {
  testBitwiseSignedRightShiftSinglePrecision('cpu');
});

function testBitwiseSignedRightShiftUnsignedPrecision(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v1, v2) {
    return v1 >> v2;
  })
    .setOutput([1])
    .setPrecision('unsigned');

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      assert.equal(kernel(i, j)[0], i >> j);
    }
  }

  gpu.destroy();
}

test('bitwise signed fill right shift unsigned precision auto', () => {
  testBitwiseSignedRightShiftUnsignedPrecision();
});

test('bitwise signed fill right shift unsigned precision gpu', () => {
  testBitwiseSignedRightShiftUnsignedPrecision('gpu');
});

(GPU.isWebGLSupported ? test : skip)('bitwise signed fill right shift unsigned precision webgl', () => {
  testBitwiseSignedRightShiftUnsignedPrecision('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('bitwise signed fill right shift unsigned precision webgl2', () => {
  testBitwiseSignedRightShiftUnsignedPrecision('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('bitwise signed fill right shift unsigned precision headlessgl', () => {
  testBitwiseSignedRightShiftUnsignedPrecision('headlessgl');
});

test('bitwise signed fill right shift unsigned precision cpu', () => {
  testBitwiseSignedRightShiftUnsignedPrecision('cpu');
});

function testBitwiseZeroFillRightShiftSinglePrecision(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v1, v2) {
    return v1 >>> v2;
  })
    .setOutput([1])
    .setPrecision('single');

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      assert.equal(kernel(i, j)[0], i >>> j);
    }
  }

  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('bitwise zero fill right shift single precision auto', () => {
  testBitwiseZeroFillRightShiftSinglePrecision();
});

(GPU.isSinglePrecisionSupported ? test : skip)('bitwise zero fill right shift single precision gpu', () => {
  testBitwiseZeroFillRightShiftSinglePrecision('gpu');
});

(GPU.isWebGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('bitwise zero fill right shift single precision webgl', () => {
  testBitwiseZeroFillRightShiftSinglePrecision('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('bitwise zero fill right shift single precision webgl2', () => {
  testBitwiseZeroFillRightShiftSinglePrecision('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('bitwise zero fill right shift single precision headlessgl', () => {
  testBitwiseZeroFillRightShiftSinglePrecision('headlessgl');
});

test('bitwise zero fill right shift single precision cpu', () => {
  testBitwiseZeroFillRightShiftSinglePrecision('cpu');
});

function testBitwiseZeroFillRightShiftUnsignedPrecision(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v1, v2) {
    return v1 >>> v2;
  })
    .setOutput([1])
    .setPrecision('unsigned');

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      assert.equal(kernel(i, j)[0], i >>> j);
    }
  }

  gpu.destroy();
}

test('bitwise zero fill right shift unsigned precision auto', () => {
  testBitwiseZeroFillRightShiftUnsignedPrecision();
});

test('bitwise zero fill right shift unsigned precision gpu', () => {
  testBitwiseZeroFillRightShiftUnsignedPrecision('gpu');
});

(GPU.isWebGLSupported ? test : skip)('bitwise zero fill right shift unsigned precision webgl', () => {
  testBitwiseZeroFillRightShiftUnsignedPrecision('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('bitwise zero fill right shift unsigned precision webgl2', () => {
  testBitwiseZeroFillRightShiftUnsignedPrecision('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('bitwise zero fill right shift unsigned precision headlessgl', () => {
  testBitwiseZeroFillRightShiftUnsignedPrecision('headlessgl');
});

test('bitwise zero fill right shift unsigned precision cpu', () => {
  testBitwiseZeroFillRightShiftUnsignedPrecision('cpu');
});
