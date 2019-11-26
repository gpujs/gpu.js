const { assert, test, module: describe, only, skip } = require('qunit');
const sinon = require('sinon');
const { GLKernel, GPU } = require(process.cwd() + '/src');

describe('GLKernel');

test('nativeFunctionArguments() parse simple function', () => {
  const result = GLKernel.nativeFunctionArguments(`vec2 myFunction(vec2 longName) {
    return vec2(1, 1);
  }`);

  assert.deepEqual(result, {
    argumentNames: ['longName'],
    argumentTypes: ['Array(2)']
  });
});

test('nativeFunctionArguments() parse simple function with argument that has number', () => {
  const result = GLKernel.nativeFunctionArguments(`vec2 myFunction(vec2 longName123) {
    return vec2(1, 1);
  }`);

  assert.deepEqual(result, {
    argumentNames: ['longName123'],
    argumentTypes: ['Array(2)']
  });
});

test('nativeFunctionArguments() parse simple function, multiple arguments', () => {
  const result = GLKernel.nativeFunctionArguments(`vec2 myFunction(vec3 a,vec3 b,float c) {
    return vec2(1, 1);
  }`);

  assert.deepEqual(result, {
    argumentNames: ['a', 'b', 'c'],
    argumentTypes: ['Array(3)', 'Array(3)', 'Number']
  });
});

test('nativeFunctionArguments() parse simple function, multiple arguments with comments', () => {
  const result = GLKernel.nativeFunctionArguments(`vec2 myFunction(vec3 a /* vec4 b */,vec2 c, /* vec4 d */ float e) {
    return vec2(1, 1);
  }`);

  assert.deepEqual(result, {
    argumentNames: ['a', 'c', 'e'],
    argumentTypes: ['Array(3)', 'Array(2)', 'Number']
  });
});

test('nativeFunctionArguments() parse simple function, multiple arguments on multi line with spaces', () => {
  const result = GLKernel.nativeFunctionArguments(`vec2 myFunction(
    vec4  a,
    vec3  b,
    float  c
  ) {
    vec3 delta = a - b;
  }`);

  assert.deepEqual(result, {
    argumentNames: ['a', 'b', 'c'],
    argumentTypes: ['Array(4)', 'Array(3)', 'Number']
  });
});

test('nativeFunctionArguments() parse simple function, multiple arguments on multi line with spaces and multi-line-comments', () => {
  const result = GLKernel.nativeFunctionArguments(`vec2 myFunction(
    vec2  a,
    /* test 1 */
    vec3  b,
    /* test 2 */
    float  c
    /* test 3 */
  ) {
    vec3 delta = a - b;
  }`);

  assert.deepEqual(result, {
    argumentNames: ['a', 'b', 'c'],
    argumentTypes: ['Array(2)', 'Array(3)', 'Number']
  });
});

test('nativeFunctionArguments() parse simple function, multiple arguments on multi line with spaces and in-line-comments', () => {
  const result = GLKernel.nativeFunctionArguments(`vec2 myFunction(
    vec2  a, // test 1
    vec4  b, // test 2
    int  c // test 3
  ) {
    vec3 delta = a - b;
  }`);

  assert.deepEqual(result, {
    argumentNames: ['a', 'b', 'c'],
    argumentTypes: ['Array(2)', 'Array(4)', 'Integer']
  });
});

test('nativeFunctionArguments() parse simple function that is cut short', () => {
  const result = GLKernel.nativeFunctionArguments(`vec2 myFunction(
    vec2  a,
    vec3  b,
    float  c
  )`);

  assert.deepEqual(result, {
    argumentNames: ['a', 'b', 'c'],
    argumentTypes: ['Array(2)', 'Array(3)', 'Number']
  });
});

test('getVariablePrecisionString() when tactic is set to "speed" returns "lowp"', () => {
  assert.equal(GLKernel.prototype.getVariablePrecisionString.call({ tactic: 'speed' }), 'lowp');
});

test('getVariablePrecisionString() when tactic is set to "balanced" returns "mediump"', () => {
  assert.equal(GLKernel.prototype.getVariablePrecisionString.call({ tactic: 'balanced' }), 'mediump');
});

test('getVariablePrecisionString() when tactic is set to "precision" returns "highp"', () => {
  assert.equal(GLKernel.prototype.getVariablePrecisionString.call({ tactic: 'precision' }), 'highp');
});

test('getVariablePrecisionString() when tactic is not set and texSize is within lowFloatPrecision', () => {
  const mockInstance = {
    tactic: null,
    constructor: {
      features: {
        lowFloatPrecision: { rangeMax: Math.log2(3 * 3) },
        mediumFloatPrecision: { rangeMax: Math.log2(4 * 4) },
        highFloatPrecision: { rangeMax: Math.log2(5 * 5) },
      }
    }
  };
  const textureSize = [2, 2];
  assert.equal(GLKernel.prototype.getVariablePrecisionString.call(mockInstance, textureSize), 'lowp');
});

test('getVariablePrecisionString() when tactic is not set and texSize is within mediumFloatPrecision', () => {
  const mockInstance = {
    tactic: null,
    constructor: {
      features: {
        lowFloatPrecision: { rangeMax: Math.log2(3 * 3) },
        mediumFloatPrecision: { rangeMax: Math.log2(4 * 4) },
        highFloatPrecision: { rangeMax: Math.log2(5 * 5) },
      }
    }
  };
  const textureSize = [4, 4];
  assert.equal(GLKernel.prototype.getVariablePrecisionString.call(mockInstance, textureSize), 'mediump');
});

test('getVariablePrecisionString() when tactic is not set and texSize is within highFloatPrecision', () => {
  const mockInstance = {
    tactic: null,
    constructor: {
      features: {
        lowFloatPrecision: { rangeMax: Math.log2(3 * 3) },
        mediumFloatPrecision: { rangeMax: Math.log2(4 * 4) },
        highFloatPrecision: { rangeMax: Math.log2(5 * 5) },
      }
    }
  };
  const textureSize = [5, 5];
  assert.equal(GLKernel.prototype.getVariablePrecisionString.call(mockInstance, textureSize), 'highp');
});

test('getVariablePrecisionString() when tactic is not set and texSize is outside highFloatPrecision', () => {
  const mockInstance = {
    tactic: null,
    constructor: {
      features: {
        lowFloatPrecision: { rangeMax: Math.log2(3 * 3) },
        mediumFloatPrecision: { rangeMax: Math.log2(4 * 4) },
        highFloatPrecision: { rangeMax: Math.log2(5 * 5) },
      }
    }
  };
  const textureSize = [6, 6];
  assert.throws(() => GLKernel.prototype.getVariablePrecisionString.call(mockInstance, textureSize));
});

test('getVariablePrecisionString() when tactic is not set and texSize is within lowIntPrecision', () => {
  const mockInstance = {
    tactic: null,
    constructor: {
      features: {
        lowIntPrecision: { rangeMax: Math.log2(3 * 3) },
        mediumIntPrecision: { rangeMax: Math.log2(4 * 4) },
        highIntPrecision: { rangeMax: Math.log2(5 * 5) },
      }
    }
  };
  const textureSize = [2, 2];
  assert.equal(GLKernel.prototype.getVariablePrecisionString.call(mockInstance, textureSize, null, true), 'lowp');
});

test('getVariablePrecisionString() when tactic is not set and texSize is within mediumIntPrecision', () => {
  const mockInstance = {
    tactic: null,
    constructor: {
      features: {
        lowIntPrecision: { rangeMax: Math.log2(3 * 3) },
        mediumIntPrecision: { rangeMax: Math.log2(4 * 4) },
        highIntPrecision: { rangeMax: Math.log2(5 * 5) },
      }
    }
  };
  const textureSize = [4, 4];
  assert.equal(GLKernel.prototype.getVariablePrecisionString.call(mockInstance, textureSize, null, true), 'mediump');
});

test('getVariablePrecisionString() when tactic is not set and texSize is within highIntPrecision', () => {
  const mockInstance = {
    tactic: null,
    constructor: {
      features: {
        lowIntPrecision: { rangeMax: Math.log2(3 * 3) },
        mediumIntPrecision: { rangeMax: Math.log2(4 * 4) },
        highIntPrecision: { rangeMax: Math.log2(5 * 5) },
      }
    }
  };
  const textureSize = [5, 5];
  assert.equal(GLKernel.prototype.getVariablePrecisionString.call(mockInstance, textureSize, null, true), 'highp');
});

test('getVariablePrecisionString() when tactic is not set and texSize is outside highIntPrecision', () => {
  const mockInstance = {
    tactic: null,
    constructor: {
      features: {
        lowIntPrecision: { rangeMax: Math.log2(3 * 3) },
        mediumIntPrecision: { rangeMax: Math.log2(4 * 4) },
        highIntPrecision: { rangeMax: Math.log2(5 * 5) },
      }
    }
  };
  const textureSize = [6, 6];
  assert.throws(() => GLKernel.prototype.getVariablePrecisionString.call(mockInstance, textureSize, null, true));
});

function testGetFeatures(canvas, context) {
  const gpu = new GPU({ canvas, context });
  const { Kernel } = gpu;
  Kernel.setupFeatureChecks();
  const features = Kernel.getFeatures();
  assert.ok(typeof features.isFloatRead === 'boolean');
  assert.ok(typeof features.isIntegerDivisionAccurate === 'boolean');
  assert.ok(typeof features.isTextureFloat === 'boolean');
  assert.ok(typeof features.isDrawBuffers === 'boolean');
  assert.ok(typeof features.kernelMap === 'boolean');
  assert.ok(typeof features.channelCount === 'number');
  assert.ok(typeof features.maxTextureSize === 'number');

  assert.ok(typeof features.lowIntPrecision.rangeMax === 'number');
  assert.ok(typeof features.mediumIntPrecision.rangeMax === 'number');
  assert.ok(typeof features.highIntPrecision.rangeMax === 'number');

  assert.ok(typeof features.lowFloatPrecision.rangeMax === 'number');
  assert.ok(typeof features.mediumFloatPrecision.rangeMax === 'number');
  assert.ok(typeof features.highFloatPrecision.rangeMax === 'number');

  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('getFeatures() webgl', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl');
  testGetFeatures(canvas, context);
});

(GPU.isWebGL2Supported ? test : skip)('getFeatures() webgl2', () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2');
  testGetFeatures(canvas, context);
});

(GPU.isHeadlessGLSupported ? test : skip)('getFeatures() headlessgl', () => {
  const canvas = null;
  const context = require('gl')(1, 1);
  testGetFeatures(canvas, context);
});

test('setOutput() throws when not dynamicOutput and already compiled', () => {
  assert.throws(() => {
    GLKernel.prototype.setOutput.call({
      program: {},
      toKernelOutput: () => {},
      dynamicOutput: false
    });
  }, new Error('Resizing a kernel with dynamicOutput: false is not possible'));
});

test('setOutput() when not dynamicOutput and not already compiled', () => {
  const mockInstance = {
    toKernelOutput: () => [100, 100],
    dynamicOutput: false,
    output: null,
  };
  GLKernel.prototype.setOutput.call(mockInstance, [100, 100]);
  assert.deepEqual(mockInstance.output, [100, 100]);
});

test('setOutput() when does not need to trigger recompile', () => {
  const mockContext = {
    bindFramebuffer: sinon.spy(),
    FRAMEBUFFER: 'FRAMEBUFFER',
    viewport: sinon.spy()
  };
  const mockInstance = {
    context: mockContext,
    program: {},
    texSize: [1, 1],
    framebuffer: {
      width: 0,
      height: 0,
    },
    toKernelOutput: GLKernel.prototype.toKernelOutput,
    dynamicOutput: true,
    getVariablePrecisionString: () => {
      return 'lowp';
    },
    switchKernels: sinon.spy(),
    updateMaxTexSize: sinon.spy(),
    maxTexSize: [123, 321],
    canvas: {
      width: 0,
      height: 0,
    },
    _setupOutputTexture: sinon.spy(),
  };
  GLKernel.prototype.setOutput.call(mockInstance, [100, 100]);
  assert.equal(mockContext.bindFramebuffer.callCount, 1);
  assert.equal(mockContext.bindFramebuffer.args[0][0], 'FRAMEBUFFER');
  assert.equal(mockContext.bindFramebuffer.args[0][1], mockInstance.framebuffer);
  assert.equal(mockInstance.updateMaxTexSize.callCount, 1);
  assert.equal(mockInstance.framebuffer.width, 100);
  assert.equal(mockInstance.framebuffer.height, 100);
  assert.equal(mockContext.viewport.callCount, 1);
  assert.equal(mockContext.viewport.args[0][0], 0);
  assert.equal(mockContext.viewport.args[0][1], 0);
  assert.equal(mockContext.viewport.args[0][2], 123);
  assert.equal(mockContext.viewport.args[0][3], 321);
  assert.equal(mockInstance.canvas.width, 123);
  assert.equal(mockInstance.canvas.height, 321);
  assert.equal(mockInstance._setupOutputTexture.callCount, 1);
});

test('setOutput() when needs to trigger recompile', () => {
  const mockInstance = {
    program: {},
    texSize: [1, 1],
    toKernelOutput: GLKernel.prototype.toKernelOutput,
    dynamicOutput: true,
    getVariablePrecisionString: (textureSize) => {
      if (textureSize[0] === 1) return 'lowp';
      return 'highp';
    },
    switchKernels: sinon.spy()
  };
  GLKernel.prototype.setOutput.call(mockInstance, [100, 100]);
  assert.ok(mockInstance.switchKernels.callCount, 1);
});