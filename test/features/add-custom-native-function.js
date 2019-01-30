const { assert, skip, test, module: describe } = require('qunit');
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

  gpu.addNativeFunction('divide', fn);

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

  assert.ok(kernel !== null, 'function generated test');

  const a = [1, 4, 3, 5, 6, 3];
  const b = [4, 2, 6, 1, 2, 3];

  const res = kernel(a,b);
  const exp = [5, 6, 9, 6, 8, 6];

  assert.deepEqual(Array.from(res), exp);
  gpu.destroy();
}

test('divideFallback (GPU only) auto', () => {
  divideOverride(null);
});

test('divideFallback (GPU only) gpu', () => {
  divideOverride('gpu');
});

(GPU.isWebGLSupported ? test : skip)('divideFallback (GPU only) webgl', () => {
  divideOverride('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('divideFallback (GPU only) webgl2', () => {
  divideOverride('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('divideFallback (GPU only) headlessgl', () => {
  divideOverride('headlessgl');
});
