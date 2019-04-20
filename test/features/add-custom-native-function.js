const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: add native');

const glslDivide = `float divide(float a, float b) {
  return a / b;
}`;
const jsDivide = `function divide(a, b) {
  return a / b;
}`;

function nativeDivide(mode, fn) {
  const gpu = new GPU({ mode });

  gpu.addNativeFunction('divide', fn, { returnType: 'Number' });

  const f = gpu.createKernel(function(a, b) {
    return divide(a[this.thread.x], b[this.thread.x]);
  }, {
    output : [6]
  });

  assert.ok(f !== null, 'function generated test');

  const a = [1, 4, 3, 5, 6, 3];
  const b = [4, 2, 6, 1, 2, 3];

  const res = f(a,b);
  const exp = [0.25, 2, 0.5, 5, 3, 1];

  for(let i = 0; i < exp.length; ++i) {
    assert.equal(res[i], exp[i], 'Result arr idx: '+i);
  }
  gpu.destroy();
}

test('nativeDivide auto', () => {
  nativeDivide(null, glslDivide);
});

test('nativeDivide gpu', () => {
  nativeDivide('gpu', glslDivide);
});

(GPU.isWebGLSupported ? test : skip)('nativeDivide webgl', () => {
  nativeDivide('webgl', glslDivide);
});

(GPU.isWebGL2Supported ? test : skip)('nativeDivide webgl2', () => {
  nativeDivide('webgl2', glslDivide);
});

(GPU.isHeadlessGLSupported ? test : skip)('nativeDivide headlessgl', () => {
  nativeDivide('headlessgl', glslDivide);
});

test('nativeDivide cpu', () => {
  nativeDivide('cpu', jsDivide);
});


describe('features: instantiate native and override');

function divideOverride(mode) {
  const gpu = new GPU({
    mode,
    functions: [divide],
    nativeFunctions: {
      // deliberately add, rather than divide, to ensure native functions are treated as more important than regular ones
      divide: `float divide(float a, float b) {
  return a + b;
}`
    }
  });

  function divide(a,b) {
    return a / b;
  }

  const kernel = gpu.createKernel(function(a, b) {
    return divide(a[this.thread.x], b[this.thread.x]);
  }, {
    output : [6]
  });

  const a = [1, 4, 3, 5, 6, 3];
  const b = [4, 2, 6, 1, 2, 3];

  const res = kernel(a,b);
  const exp = [5, 6, 9, 6, 8, 6];

  assert.deepEqual(Array.from(res), exp);
  gpu.destroy();
}

test('divideOverride (GPU only) auto', () => {
  divideOverride(null);
});

test('divideOverride (GPU only) gpu', () => {
  divideOverride('gpu');
});

(GPU.isWebGLSupported ? test : skip)('divideOverride (GPU only) webgl', () => {
  divideOverride('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('divideOverride (GPU only) webgl2', () => {
  divideOverride('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('divideOverride (GPU only) headlessgl', () => {
  divideOverride('headlessgl');
});

describe('features: argument casting');

function argumentCasting(mode) {
  const gpu = new GPU({
    mode,
    functions: [divide],
    nativeFunctions: {
      // deliberately add, rather than divide, to ensure native functions are treated as more important than regular ones
      divide: `float divide(int a, int b) {
  return float(a + b);
}`
    }
  });

  function divide(a,b) {
    return a / b;
  }

  const kernel = gpu.createKernel(function(a, b) {
    return divide(a[this.thread.x], b[this.thread.x]);
  }, {
    output : [6]
  });

  const a = [1, 4, 3, 5, 6, 3];
  const b = [4, 2, 6, 1, 2, 3];

  const res = kernel(a,b);
  const exp = [5, 6, 9, 6, 8, 6];

  assert.deepEqual(Array.from(res), exp);
  gpu.destroy();
}

test('argumentCasting (GPU only) auto', () => {
  argumentCasting(null);
});

test('argumentCasting (GPU only) gpu', () => {
  argumentCasting('gpu');
});

(GPU.isWebGLSupported ? test : skip)('argumentCasting (GPU only) webgl', () => {
  argumentCasting('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('argumentCasting (GPU only) webgl2', () => {
  argumentCasting('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('argumentCasting (GPU only) headlessgl', () => {
  argumentCasting('headlessgl');
});


describe('features: mixed argument casting');

function mixedArgumentCasting(mode) {
  const gpu = new GPU({
    mode,
    functions: [divide],
    nativeFunctions: {
      // deliberately add, rather than divide, to ensure native functions are treated as more important than regular ones
      divide: `float divide(int a, float b) {
  return float(a + int(b));
}`
    }
  });

  function divide(a,b) {
    return a / b;
  }

  const kernel = gpu.createKernel(function(a, b) {
    return divide(a[this.thread.x], b[this.thread.x]);
  }, {
    output : [6]
  });

  const a = [1, 4, 3, 5, 6, 3];
  const b = [4, 2, 6, 1, 2, 3];

  const res = kernel(a,b);
  const exp = [5, 6, 9, 6, 8, 6];

  assert.deepEqual(Array.from(res), exp);
  gpu.destroy();
}

test('mixedArgumentCasting (GPU only) auto', () => {
  mixedArgumentCasting(null);
});

test('mixedArgumentCasting (GPU only) gpu', () => {
  mixedArgumentCasting('gpu');
});

(GPU.isWebGLSupported ? test : skip)('mixedArgumentCasting (GPU only) webgl', () => {
  mixedArgumentCasting('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('mixedArgumentCasting (GPU only) webgl2', () => {
  mixedArgumentCasting('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('mixedArgumentCasting (GPU only) headlessgl', () => {
  mixedArgumentCasting('headlessgl');
});

describe('features: return type casting');

function returnTypeCasting(mode) {
  const gpu = new GPU({
    mode,
    functions: [divide],
    nativeFunctions: {
      // deliberately add, rather than divide, to ensure native functions are treated as more important than regular ones
      divide: `int divide(float a, float b) {
  return int(a + b);
}`
    }
  });

  function divide(a,b) {
    return a / b;
  }

  const kernel = gpu.createKernel(function(a, b) {
    return divide(a[this.thread.x], b[this.thread.x]);
  }, {
    output : [6]
  });

  const a = [1, 4, 3, 5, 6, 3];
  const b = [4, 2, 6, 1, 2, 3];

  const res = kernel(a,b);
  const exp = [5, 6, 9, 6, 8, 6];

  assert.deepEqual(Array.from(res), exp);
  gpu.destroy();
}

test('returnTypeCasting (GPU only) auto', () => {
  returnTypeCasting(null);
});

test('returnTypeCasting (GPU only) gpu', () => {
  returnTypeCasting('gpu');
});

(GPU.isWebGLSupported ? test : skip)('returnTypeCasting (GPU only) webgl', () => {
  returnTypeCasting('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('returnTypeCasting (GPU only) webgl2', () => {
  returnTypeCasting('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('returnTypeCasting (GPU only) headlessgl', () => {
  returnTypeCasting('headlessgl');
});
