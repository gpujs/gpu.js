const { assert, skip, test, module: describe, only } = require('qunit');
const { WebGLKernel, input } = require('../../../../../src');

describe('internal WebGLKernel.setupArguments Array');
const gl = {
  TEXTURE0: 0,
  TEXTURE_2D: 'TEXTURE_2D',
  RGBA: 'RGBA',
  UNSIGNED_BYTE: 'UNSIGNED_BYTE',
  FLOAT: 'FLOAT',
  TEXTURE_WRAP_S: 'TEXTURE_WRAP_S',
  CLAMP_TO_EDGE: 'CLAMP_TO_EDGE',
  TEXTURE_WRAP_T: 'TEXTURE_WRAP_T',
  TEXTURE_MIN_FILTER: 'TEXTURE_MIN_FILTER',
  TEXTURE_MAG_FILTER: 'TEXTURE_MAG_FILTER',
  NEAREST: 'NEAREST',
  UNPACK_FLIP_Y_WEBGL: 'UNPACK_FLIP_Y_WEBGL',
};
function setupArgumentsTestSuite(testSuiteSettings) {
  const {
    gpuSettings,
    argument,
    expectedPixels,
    expectedBitRatio,
    expectedDim,
    expectedSize,
    expectedType,
    expectedArgumentTextureCount,
    expectedPixelStorei,
  } = testSuiteSettings;
  let texImage2DCalled = false;
  let activeTextureCalled = false;
  let bindTextureCalled = false;
  let texParameteriCalls = 0;
  let getUniformLocationCalls = 0;
  let uniform3ivCalled = false;
  let uniform2ivCalled = false;
  let uniform1iCalled = false;
  const mockContext = Object.assign({
    activeTexture: (index) => {
      assert.equal(index, 0);
      activeTextureCalled = true;
    },
    bindTexture: (target, texture) => {
      assert.equal(target, 'TEXTURE_2D');
      assert.equal(texture, 'TEXTURE');
      bindTextureCalled = true;
    },
    texParameteri: (target, pname, param) => {
      switch (texParameteriCalls) {
        case 0:
          assert.equal(target, 'TEXTURE_2D');
          assert.equal(pname, 'TEXTURE_WRAP_S');
          assert.equal(param, 'CLAMP_TO_EDGE');
          texParameteriCalls++;
          break;
        case 1:
          assert.equal(target, 'TEXTURE_2D');
          assert.equal(pname, 'TEXTURE_WRAP_T');
          assert.equal(param, 'CLAMP_TO_EDGE');
          texParameteriCalls++;
          break;
        case 2:
          assert.equal(target, 'TEXTURE_2D');
          assert.equal(pname, 'TEXTURE_MIN_FILTER');
          assert.equal(param, 'NEAREST');
          texParameteriCalls++;
          break;
        case 3:
          assert.equal(target, 'TEXTURE_2D');
          assert.equal(pname, 'TEXTURE_MAG_FILTER');
          assert.equal(param, 'NEAREST');
          texParameteriCalls++;
          break;
        default:
          throw new Error('called too many times');
      }
    },
    pixelStorei: (pname, param) => {
      assert.equal(pname, 'UNPACK_FLIP_Y_WEBGL');
      assert.equal(param, expectedPixelStorei);
    },
    createTexture: () => 'TEXTURE',
    getUniformLocation: (program, name) => {
      assert.equal(program, 'program');
      if (getUniformLocationCalls > 3) {
        throw new Error('called too many times');
      }
      getUniformLocationCalls++;
      return {
        user_vDim: 'user_vDimLocation',
        user_vSize: 'user_vSizeLocation',
        user_v: 'user_vLocation',
      }[name];
    },
    uniform3iv: (location, value) => {
      assert.equal(location, 'user_vDimLocation');
      assert.deepEqual(value, expectedDim);
      uniform3ivCalled = true;
    },
    uniform2iv: (location, value) => {
      assert.equal(location, 'user_vSizeLocation');
      assert.deepEqual(value, expectedSize);
      uniform2ivCalled = true;
    },
    uniform1i: (location, value) => {
      assert.equal(location, 'user_vLocation');
      assert.equal(value, 0);
      uniform1iCalled = true;
    },
    texImage2D: (target, level, internalFormat, width, height, border, format, type, pixels) => {
      assert.equal(target, gl.TEXTURE_2D);
      assert.equal(level, 0);
      assert.equal(internalFormat, gl.RGBA);
      assert.equal(width, expectedSize[0]);
      assert.equal(height, expectedSize[1]);
      assert.equal(border, 0);
      assert.equal(format, gl.RGBA);
      assert.equal(type, expectedType);
      assert.equal(pixels.length, expectedPixels.length);
      assert.deepEqual(pixels, expectedPixels);
      texImage2DCalled = true;
    }
  }, gl);
  const source = `function(v) { return v[this.thread.x]; }`;
  const settings = {
    context: mockContext,
  };
  const kernel = new WebGLKernel(source, Object.assign({}, settings, gpuSettings));
  kernel.constructor = {
    lookupKernelValueType: WebGLKernel.lookupKernelValueType,
    features: {
      maxTextureSize: 9999
    }
  };
  const args = [argument];
  kernel.program = 'program';
  assert.equal(kernel.argumentTextureCount, 0);
  kernel.setupArguments(args);
  assert.equal(kernel.argumentBitRatios[0], expectedBitRatio);
  assert.equal(kernel.kernelArguments.length, 1);
  kernel.kernelArguments[0].updateValue(argument);
  assert.equal(kernel.argumentTextureCount, expectedArgumentTextureCount);
  assert.ok(texImage2DCalled);
  assert.ok(activeTextureCalled);
  assert.ok(bindTextureCalled);
  assert.equal(texParameteriCalls, 4);
  assert.equal(getUniformLocationCalls, 1);
  assert.notOk(uniform3ivCalled);
  assert.notOk(uniform2ivCalled);
  assert.ok(uniform1iCalled);
}

// NOTE: Take special note of how the `argument` and `expectedPixels` are formatted

// requires at least 5 entire pixels
test('Array with unsigned precision 5 length', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'unsigned',
      output: [4]
    },
    argument: [
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1, 2, 3, 4,
      5
    ],
    expectedBitRatio: 4,
    expectedPixels: new Uint8Array(new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1,2,3,4,
      5,0,0,0
    ]).buffer),
    expectedDim: new Int32Array([5,1,1]),
    expectedSize: new Int32Array([4,2]), // 4 * 2 = 8
    expectedType: gl.UNSIGNED_BYTE,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});
test('Float32Array with unsigned precision 5 length', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'unsigned',
      output: [4]
    },
    argument: new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1, 2, 3, 4,
      5
    ]),
    expectedBitRatio: 4,
    expectedPixels: new Uint8Array(
      new Float32Array([
        // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
        1,2,3,4,
        5,0,0,0
      ]).buffer
    ),
    expectedDim: new Int32Array([5,1,1]),
    expectedSize: new Int32Array([4,2]), // 4 * 2 * 1 = 8
    expectedType: gl.UNSIGNED_BYTE,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});
test('Uint16Array with unsigned precision 5 length', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'unsigned',
      output: [4]
    },
    argument: new Uint16Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1, 2, 3, 4,
      5
    ]),
    expectedBitRatio: 2,
    expectedPixels: new Uint8Array(
      new Uint16Array([
        // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
        1,2,3,4,
        5,0,0,0
      ]).buffer
    ),
    expectedDim: new Int32Array([5,1,1]),
    expectedSize: new Int32Array([2,2]), // 2 * 2 * 2 = 8
    expectedType: gl.UNSIGNED_BYTE,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});
test('Uint8Array with unsigned precision 5 length', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'unsigned',
      output: [5]
    },
    argument: new Uint8Array([
      1, 2, 3, 4,
      5
    ]),
    expectedBitRatio: 1,
    expectedPixels: new Uint8Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1,2,3,4,
      5,0,0,0
    ]),
    expectedDim: new Int32Array([5,1,1]),
    expectedSize: new Int32Array([1,2]), // 1 * 2 * 4 = 8
    expectedType: gl.UNSIGNED_BYTE,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});

test('Array with single precision', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'single',
      output: [4]
    },
    argument: [
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1,2,3,4,
      5
    ],
    expectedBitRatio: 4,
    expectedPixels: new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1,2,3,4,
      5,0,0,0
    ]),
    expectedDim: new Int32Array([5,1,1]),
    expectedSize: new Int32Array([1,2]),
    expectedType: gl.FLOAT,
    expectedTextureWidth: 1,
    expectedTextureHeight: 2,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});
test('Float32Array with single precision', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'single',
      output: [4]
    },
    argument: new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1,2,3,4,
      5
    ]),
    expectedBitRatio: 4,
    expectedPixels: new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1,2,3,4,
      5,0,0,0
    ]),
    expectedDim: new Int32Array([5,1,1]),
    expectedSize: new Int32Array([1,2]),
    expectedType: gl.FLOAT,
    expectedTextureWidth: 1,
    expectedTextureHeight: 2,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});
test('Uint16Array with single precision', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'single',
      output: [4]
    },
    argument: new Uint16Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1,2,3,4,
      5
    ]),
    // upconverted from 2
    expectedBitRatio: 4,
    expectedPixels: new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1,2,3,4,
      5,0,0,0
    ]),
    expectedDim: new Int32Array([5,1,1]),
    expectedSize: new Int32Array([1,2]),
    expectedType: gl.FLOAT,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});
test('Uint8Array with single precision', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'single',
      output: [4]
    },
    argument: new Uint8Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1,2,3,4,
      5
    ]),
    // upconverted from 1
    expectedBitRatio: 4,
    expectedPixels: new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1,2,3,4,
      5,0,0,0
    ]),
    expectedDim: new Int32Array([5,1,1]),
    expectedSize: new Int32Array([1,2]),
    expectedType: gl.FLOAT,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});

test('Array with unsigned precision length 33', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'unsigned',
      output: [5]
    },
    argument: [
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 1 per RGBA, so only 1 of the 4 channels is used
      // NOTE: 6x6
      1,    2,   3,  4,   5,   6,
      7,    8,   9,  10,  11,  12,
      13,  14,  15,  16,  17,  18,
      19,  20,  21,  22,  23,  24,
      25,  26,  27,  28,  29,  30,
      31,  32,  33
    ],
    expectedBitRatio: 4,
    expectedPixels: new Uint8Array(
      new Float32Array([
        // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
        // NOTE: Packing is 1 per RGBA, so only 1 of the 4 channels is used
        // NOTE: 6x6
        1,    2,   3,  4,   5,   6,
        7,    8,   9,  10,  11,  12,
        13,  14,  15,  16,  17,  18,
        19,  20,  21,  22,  23,  24,
        25,  26,  27,  28,  29,  30,
        31,  32,  33,  0,   0,   0
      ]).buffer
    ),
    expectedDim: new Int32Array([33,1,1]),
    expectedSize: new Int32Array([6,6]), // 3 * 3 = 9 * 4 = 34
    expectedType: gl.UNSIGNED_BYTE,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});

test('Float32Array with unsigned precision length 33', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'unsigned',
      output: [5]
    },
    argument: new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 1 per RGBA, so only 1 of the 4 channels is used
      // NOTE: 6x6
      1,    2,   3,  4,   5,   6,
      7,    8,   9,  10,  11,  12,
      13,  14,  15,  16,  17,  18,
      19,  20,  21,  22,  23,  24,
      25,  26,  27,  28,  29,  30,
      31,  32,  33
    ]),
    expectedBitRatio: 4,
    expectedPixels: new Uint8Array(
      new Float32Array([
        // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
        // NOTE: Packing is 1 per RGBA, so only 1 of the 4 channels is used
        // NOTE: 6x6
        1,    2,   3,  4,   5,   6,
        7,    8,   9,  10,  11,  12,
        13,  14,  15,  16,  17,  18,
        19,  20,  21,  22,  23,  24,
        25,  26,  27,  28,  29,  30,
        31,  32,  33,  0,   0,   0,
      ]).buffer
    ),
    expectedDim: new Int32Array([33,1,1]),
    expectedSize: new Int32Array([6,6]), // 3 * 3 = 9 * 4 = 34
    expectedType: gl.UNSIGNED_BYTE,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});

test('Uint16Array with unsigned precision length 33', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'unsigned',
      output: [5]
    },
    argument: new Uint16Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 2 per RGBA, so only 2 of the 4 channels is used
      // NOTE: 4x5
      1,2,    3,4,    5,6,    7,8,
      9,10,   11,12,  13,14,  15,16,
      17,18,  19,20,  21,22,  23,24,
      25,26,  27,28,  29,30,  31,32,
      33,
    ]),
    expectedBitRatio: 2,
    expectedPixels: new Uint8Array(
      new Uint16Array([
        // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
        // NOTE: Packing is 2 per RGBA, so only 2 of the 4 channels is used
        // NOTE: 4x5
        1,2,    3,4,    5,6,    7,8,
        9,10,   11,12,  13,14,  15,16,
        17,18,  19,20,  21,22,  23,24,
        25,26,  27,28,  29,30,  31,32,
        33,0,   0,0,    0,0,    0,0
      ]).buffer
    ),
    expectedDim: new Int32Array([33,1,1]),
    expectedSize: new Int32Array([4,5]), // 3 * 3 = 9 * 4 = 34
    expectedType: gl.UNSIGNED_BYTE,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});

test('Uint8Array with unsigned precision length 33', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'unsigned',
      output: [5]
    },
    argument: new Uint8Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 4 per RGBA, so only 2 of the 4 channels is used
      // NOTE: 3x3
      1,2,3,4,       5,6,7,8,      9,10,11,12,
      13,14,15,16,   17,18,19,20,  21,22,23,24,
      25,26, 27,28,  29,30,31,32,  33
    ]),
    expectedBitRatio: 1,
    expectedPixels: new Uint8Array(
      new Uint8Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 4 per RGBA, so only 2 of the 4 channels is used
      // NOTE: 3x3
      1,2,3,4,       5,6,7,8,      9,10,11,12,
      13,14,15,16,   17,18,19,20,  21,22,23,24,
      25,26, 27,28,  29,30,31,32,  33,0,0,0
    ]).buffer),
    expectedDim: new Int32Array([33,1,1]),
    expectedSize: new Int32Array([3,3]), // 3 * 3 = 9 * 4 = 34
    expectedType: gl.UNSIGNED_BYTE,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});

test('Array with single precision length 33', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'single',
      output: [5]
    },
    argument: [
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 4 per RGBA, so 4 of the 4 channels is used
      // NOTE: 3x3
      1,2,3,4,       5,6,7,8,         9,10,11,12,
      13,14,15,16,   17,18,19,20,     21,22,23,24,
      25,26,27,28,   29,30,31,32,     33
    ],
    expectedBitRatio: 4,
    expectedPixels: new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 4 per RGBA, so 4 of the 4 channels is used
      // NOTE: 3x3
      1,2,3,4,       5,6,7,8,         9,10,11,12,
      13,14,15,16,   17,18,19,20,     21,22,23,24,
      25,26,27,28,   29,30,31,32,     33,0,0,0
    ]),
    expectedDim: new Int32Array([33,1,1]),
    expectedSize: new Int32Array([3,3]), // 3 * 3 = 9 * 4 = 34
    expectedType: gl.FLOAT,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});

test('Float32Array with single precision length 33', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'single',
      output: [5]
    },
    argument: new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 4 per RGBA, so 4 of the 4 channels is used
      // NOTE: 3x3
      1,2,3,4,       5,6,7,8,         9,10,11,12,
      13,14,15,16,   17,18,19,20,     21,22,23,24,
      25,26,27,28,   29,30,31,32,     33
    ]),
    expectedBitRatio: 4,
    expectedPixels: new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 4 per RGBA, so 4 of the 4 channels is used
      // NOTE: 3x3
      1,2,3,4,       5,6,7,8,         9,10,11,12,
      13,14,15,16,   17,18,19,20,     21,22,23,24,
      25,26,27,28,   29,30,31,32,     33,0,0,0
    ]),
    expectedDim: new Int32Array([33,1,1]),
    expectedSize: new Int32Array([3,3]), // 3 * 3 = 9 * 4 = 36
    expectedType: gl.FLOAT,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});

test('Uint16Array with single precision length 33', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'single',
      output: [5]
    },
    argument: new Uint16Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 4 per RGBA, so 4 of the 4 channels is used
      // NOTE: 3x3
      1,2,3,4,       5,6,7,8,         9,10,11,12,
      13,14,15,16,   17,18,19,20,     21,22,23,24,
      25,26,27,28,   29,30,31,32,     33
    ]),
    // upconverted from 2
    expectedBitRatio: 4,
    expectedPixels: new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 4 per RGBA, so 4 of the 4 channels is used
      // NOTE: 3x3
      1,2,3,4,       5,6,7,8,         9,10,11,12,
      13,14,15,16,   17,18,19,20,     21,22,23,24,
      25,26,27,28,   29,30,31,32,     33,0,0,0
    ]),
    expectedDim: new Int32Array([33,1,1]),
    expectedSize: new Int32Array([3,3]), // 3 * 3 = 9 * 4 = 36
    expectedType: gl.FLOAT,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});

test('Uint8Array with single precision length 33', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'single',
      output: [5]
    },
    argument: new Uint8Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 4 per RGBA, so 4 of the 4 channels is used
      // NOTE: 3x3
      1,2,3,4,       5,6,7,8,         9,10,11,12,
      13,14,15,16,   17,18,19,20,     21,22,23,24,
      25,26,27,28,   29,30,31,32,     33
    ]),
    // upconverted from 1
    expectedBitRatio: 4,
    expectedPixels: new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 4 per RGBA, so 4 of the 4 channels is used
      // NOTE: 3x3
      1,2,3,4,       5,6,7,8,         9,10,11,12,
      13,14,15,16,   17,18,19,20,     21,22,23,24,
      25,26,27,28,   29,30,31,32,     33,0,0,0
    ]),
    expectedDim: new Int32Array([33,1,1]),
    expectedSize: new Int32Array([3,3]), // 3 * 3 = 9 * 4 = 36
    expectedType: gl.FLOAT,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});

describe('internal WebGLKernel.setupArguments Input');
// requires at least 5 entire pixels
test('Input(Array) with unsigned precision 5 length', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'unsigned',
      output: [4]
    },
    argument: input([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1, 2, 3, 4,
      5, 0
    ], [2,3]),
    expectedBitRatio: 4,
    expectedPixels: new Uint8Array(new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1,2,3,4,
      5,0,0,0
    ]).buffer),
    expectedDim: new Int32Array([2,3,1]),
    expectedSize: new Int32Array([4,2]), // 4 * 2 = 8
    expectedType: gl.UNSIGNED_BYTE,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});
test('Input(Float32Array) with unsigned precision 5 length', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'unsigned',
      output: [4]
    },
    argument: input(new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1, 2, 3, 4,
      5
    ]), [5]),
    expectedBitRatio: 4,
    expectedPixels: new Uint8Array(
      new Float32Array([
        // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
        1,2,3,4,
        5,0,0,0
      ]).buffer
    ),
    expectedDim: new Int32Array([5,1,1]),
    expectedSize: new Int32Array([4,2]), // 4 * 2 * 1 = 8
    expectedType: gl.UNSIGNED_BYTE,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});
test('Input(Uint16Array) with unsigned precision 5 length', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'unsigned',
      output: [4]
    },
    argument: input(new Uint16Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1, 2, 3, 4,
      5, 0,
    ]), [2,3]),
    expectedBitRatio: 2,
    expectedPixels: new Uint8Array(
      new Uint16Array([
        // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
        1,2,3,4,
        5,0,0,0
      ]).buffer
    ),
    expectedDim: new Int32Array([2,3,1]),
    expectedSize: new Int32Array([2,2]), // 2 * 2 * 2 = 8
    expectedType: gl.UNSIGNED_BYTE,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});
test('Input(Uint8Array) with unsigned precision 5 length', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'unsigned',
      output: [5]
    },
    argument: input(new Uint8Array([
      1, 2, 3, 4,
      5,0
    ]),[2, 3]),
    expectedBitRatio: 1,
    expectedPixels: new Uint8Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1,2,3,4,
      5,0,0,0
    ]),
    expectedDim: new Int32Array([2,3,1]),
    expectedSize: new Int32Array([1,2]), // 1 * 2 * 4 = 8
    expectedType: gl.UNSIGNED_BYTE,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});

test('Input(Array) with single precision', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'single',
      output: [4]
    },
    argument: input([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1,2,3,4,
      5,0
    ], [2,3]),
    expectedBitRatio: 4,
    expectedPixels: new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1,2,3,4,
      5,0,0,0
    ]),
    expectedDim: new Int32Array([2,3,1]),
    expectedSize: new Int32Array([1,2]),
    expectedType: gl.FLOAT,
    expectedTextureWidth: 1,
    expectedTextureHeight: 2,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});
test('Input(Float32Array) with single precision', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'single',
      output: [4]
    },
    argument: input(new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1,2,3,4,
      5,0
    ]),[2,3]),
    expectedBitRatio: 4,
    expectedPixels: new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1,2,3,4,
      5,0,0,0
    ]),
    expectedDim: new Int32Array([2,3,1]),
    expectedSize: new Int32Array([1,2]),
    expectedType: gl.FLOAT,
    expectedTextureWidth: 1,
    expectedTextureHeight: 2,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});
test('Input(Uint16Array) with single precision', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'single',
      output: [4]
    },
    argument: input(new Uint16Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1,2,3,4,
      5,0
    ]), [2,3]),
    // upconverted from 2
    expectedBitRatio: 4,
    expectedPixels: new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1,2,3,4,
      5,0,0,0
    ]),
    expectedDim: new Int32Array([2,3,1]),
    expectedSize: new Int32Array([1,2]),
    expectedType: gl.FLOAT,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});
test('Input(Uint8Array) with single precision', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'single',
      output: [4]
    },
    argument: input(new Uint8Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1,2,3,4,
      5,0
    ]), [2,3]),
    // upconverted from 1
    expectedBitRatio: 4,
    expectedPixels: new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      1,2,3,4,
      5,0,0,0
    ]),
    expectedDim: new Int32Array([2,3,1]),
    expectedSize: new Int32Array([1,2]),
    expectedType: gl.FLOAT,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});

test('Input(Array) with unsigned precision length 33', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'unsigned',
      output: [5]
    },
    argument: input([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 1 per RGBA, so only 1 of the 4 channels is used
      // NOTE: 6x6
      1,    2,   3,  4,   5,   6,
      7,    8,   9,  10,  11,  12,
      13,  14,  15,  16,  17,  18,
      19,  20,  21,  22,  23,  24,
      25,  26,  27,  28,  29,  30,
      31,  32,  33
    ], [33]),
    expectedBitRatio: 4,
    expectedPixels: new Uint8Array(
      new Float32Array([
        // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
        // NOTE: Packing is 1 per RGBA, so only 1 of the 4 channels is used
        // NOTE: 6x6
        1,    2,   3,  4,   5,   6,
        7,    8,   9,  10,  11,  12,
        13,  14,  15,  16,  17,  18,
        19,  20,  21,  22,  23,  24,
        25,  26,  27,  28,  29,  30,
        31,  32,  33,  0,   0,   0
      ]).buffer
    ),
    expectedDim: new Int32Array([33,1,1]),
    expectedSize: new Int32Array([6,6]), // 3 * 3 = 9 * 4 = 34
    expectedType: gl.UNSIGNED_BYTE,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});

test('Input(Float32Array) with unsigned precision length 33', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'unsigned',
      output: [5]
    },
    argument: input(new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 1 per RGBA, so only 1 of the 4 channels is used
      // NOTE: 6x6
      1,    2,   3,  4,   5,   6,
      7,    8,   9,  10,  11,  12,
      13,  14,  15,  16,  17,  18,
      19,  20,  21,  22,  23,  24,
      25,  26,  27,  28,  29,  30,
      31,  32,  33
    ]), [33]),
    expectedBitRatio: 4,
    expectedPixels: new Uint8Array(
      new Float32Array([
        // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
        // NOTE: Packing is 1 per RGBA, so only 1 of the 4 channels is used
        // NOTE: 6x6
        1,    2,   3,  4,   5,   6,
        7,    8,   9,  10,  11,  12,
        13,  14,  15,  16,  17,  18,
        19,  20,  21,  22,  23,  24,
        25,  26,  27,  28,  29,  30,
        31,  32,  33,  0,   0,   0,
      ]).buffer
    ),
    expectedDim: new Int32Array([33,1,1]),
    expectedSize: new Int32Array([6,6]), // 3 * 3 = 9 * 4 = 34
    expectedType: gl.UNSIGNED_BYTE,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});

test('Input(Uint16Array) with unsigned precision length 33', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'unsigned',
      output: [5]
    },
    argument: input(new Uint16Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 2 per RGBA, so only 2 of the 4 channels is used
      // NOTE: 4x5
      1,2,    3,4,    5,6,    7,8,
      9,10,   11,12,  13,14,  15,16,
      17,18,  19,20,  21,22,  23,24,
      25,26,  27,28,  29,30,  31,32,
      33,
    ]), [33]),
    expectedBitRatio: 2,
    expectedPixels: new Uint8Array(
      new Uint16Array([
        // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
        // NOTE: Packing is 2 per RGBA, so only 2 of the 4 channels is used
        // NOTE: 4x5
        1,2,    3,4,    5,6,    7,8,
        9,10,   11,12,  13,14,  15,16,
        17,18,  19,20,  21,22,  23,24,
        25,26,  27,28,  29,30,  31,32,
        33,0,   0,0,    0,0,    0,0
      ]).buffer
    ),
    expectedDim: new Int32Array([33,1,1]),
    expectedSize: new Int32Array([4,5]), // 3 * 3 = 9 * 4 = 34
    expectedType: gl.UNSIGNED_BYTE,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});

test('Input(Uint8Array) with unsigned precision length 33', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'unsigned',
      output: [5]
    },
    argument: input(new Uint8Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 4 per RGBA, so only 2 of the 4 channels is used
      // NOTE: 3x3
      1,2,3,4,       5,6,7,8,      9,10,11,12,
      13,14,15,16,   17,18,19,20,  21,22,23,24,
      25,26, 27,28,  29,30,31,32,  33
    ]), [33]),
    expectedBitRatio: 1,
    expectedPixels: new Uint8Array(
      new Uint8Array([
        // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
        // NOTE: Packing is 4 per RGBA, so only 2 of the 4 channels is used
        // NOTE: 3x3
        1,2,3,4,       5,6,7,8,      9,10,11,12,
        13,14,15,16,   17,18,19,20,  21,22,23,24,
        25,26, 27,28,  29,30,31,32,  33,0,0,0
      ]).buffer),
    expectedDim: new Int32Array([33,1,1]),
    expectedSize: new Int32Array([3,3]), // 3 * 3 = 9 * 4 = 34
    expectedType: gl.UNSIGNED_BYTE,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});

test('Input(Array) with single precision length 33', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'single',
      output: [5]
    },
    argument: input([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 4 per RGBA, so 4 of the 4 channels is used
      // NOTE: 3x3
      1,2,3,4,       5,6,7,8,         9,10,11,12,
      13,14,15,16,   17,18,19,20,     21,22,23,24,
      25,26,27,28,   29,30,31,32,     33
    ], [33]),
    expectedBitRatio: 4,
    expectedPixels: new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 4 per RGBA, so 4 of the 4 channels is used
      // NOTE: 3x3
      1,2,3,4,       5,6,7,8,         9,10,11,12,
      13,14,15,16,   17,18,19,20,     21,22,23,24,
      25,26,27,28,   29,30,31,32,     33,0,0,0
    ]),
    expectedDim: new Int32Array([33,1,1]),
    expectedSize: new Int32Array([3,3]), // 3 * 3 = 9 * 4 = 34
    expectedType: gl.FLOAT,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});

test('Input(Float32Array) with single precision length 33', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'single',
      output: [5]
    },
    argument: input(new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 4 per RGBA, so 4 of the 4 channels is used
      // NOTE: 3x3
      1,2,3,4,       5,6,7,8,         9,10,11,12,
      13,14,15,16,   17,18,19,20,     21,22,23,24,
      25,26,27,28,   29,30,31,32,     33
    ]), [33]),
    expectedBitRatio: 4,
    expectedPixels: new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 4 per RGBA, so 4 of the 4 channels is used
      // NOTE: 3x3
      1,2,3,4,       5,6,7,8,         9,10,11,12,
      13,14,15,16,   17,18,19,20,     21,22,23,24,
      25,26,27,28,   29,30,31,32,     33,0,0,0
    ]),
    expectedDim: new Int32Array([33,1,1]),
    expectedSize: new Int32Array([3,3]), // 3 * 3 = 9 * 4 = 34
    expectedType: gl.FLOAT,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});

test('Input(Uint16Array) with single precision length 33', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'single',
      output: [5]
    },
    argument: input(new Uint16Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 4 per RGBA, so 4 of the 4 channels is used
      // NOTE: 3x3
      1,2,3,4,       5,6,7,8,         9,10,11,12,
      13,14,15,16,   17,18,19,20,     21,22,23,24,
      25,26,27,28,   29,30,31,32,     33
    ]), [33]),
    // upconverted from 2
    expectedBitRatio: 4,
    expectedPixels: new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 4 per RGBA, so 4 of the 4 channels is used
      // NOTE: 3x3
      1,2,3,4,       5,6,7,8,         9,10,11,12,
      13,14,15,16,   17,18,19,20,     21,22,23,24,
      25,26,27,28,   29,30,31,32,     33,0,0,0
    ]),
    expectedDim: new Int32Array([33,1,1]),
    expectedSize: new Int32Array([3,3]), // 3 * 3 = 9 * 4 = 36
    expectedType: gl.FLOAT,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});

test('Input(Uint8Array) with single precision length 33', () => {
  setupArgumentsTestSuite({
    gpuSettings: {
      precision: 'single',
      output: [5]
    },
    argument: input(new Uint8Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 4 per RGBA (8 bit, but upconverted to float32), so only 4 of the 4 channels is used
      // NOTE: 3x3
      1,2,3,4,        5,6,7,8,        9,10,11,12,
      13,14,15,16,    17,18,19,20,    21,22,23,24,
      25,26,27,28,    29,30,31,32,    33
    ]), [33]),
    // upconverted to float32
    expectedBitRatio: 4,
    expectedPixels: new Float32Array([
      // NOTE: formatted like rectangle on purpose, so you can see how the texture should look
      // NOTE: Packing is 4 per RGBA (8 bit, but upconverted to float32), so only 4 of the 4 channels is used
      // NOTE: 3x3
      1,2,3,4,        5,6,7,8,        9,10,11,12,
      13,14,15,16,    17,18,19,20,    21,22,23,24,
      25,26,27,28,    29,30,31,32,    33,0,0,0
    ]),
    expectedDim: new Int32Array([33,1,1]),
    expectedSize: new Int32Array([3,3]), // 3 * 3 = 9 * 4 = 36
    expectedType: gl.FLOAT,
    expectedArgumentTextureCount: 1,
    expectedPixelStorei: false,
  });
});
