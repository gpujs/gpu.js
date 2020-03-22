const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: math object');

function mathProps(mode) {
  const props = ['E','LN10','LN2','LOG10E','LOG2E','PI','SQRT1_2','SQRT2'];
  const gpu = new GPU({ mode });
  for (let i = 0; i < props.length; i++) {
    const prop = props[i];
    const kernel = gpu.createKernel(`function() {
      return Math.${prop};
    }`, { output: [1] });
    assert.equal(kernel()[0].toFixed(6), Math[prop].toFixed(6));
  }
  gpu.destroy();
}

test('All Math properties auto', () => {
  mathProps();
});

test('All Math properties gpu', () => {
  mathProps('gpu');
});

(GPU.isWebGLSupported ? test : skip)('All Math properties webgl', () => {
  mathProps('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('All Math properties webgl2', () => {
  mathProps('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('All Math properties headlessgl', () => {
  mathProps('headlessgl');
});

test('All Math properties cpu', () => {
  mathProps('cpu');
});

function singleArgumentMathMethods(mode) {
  const methods = [
    'abs',
    'acos',
    'acosh',
    'asin',
    'asinh',
    'atan',
    'atanh',
    'cbrt',
    'ceil',
    // 'clz32', // not supported, bits directly are hard
    'cos',
    'cosh',
    'exp',
    'expm1',
    'floor',
    'fround',
    // 'hypot', // not supported, dynamically sized
    'log',
    'log10',
    'log1p',
    'log2',
    'round',
    'sign',
    'sin',
    'sinh',
    'sqrt',
    'tan',
    'tanh',
    'trunc',
  ];

  const gpu = new GPU({ mode });
  for (let i = 0; i < methods.length; i++) {
    const method = methods[i];
    const kernel = gpu.createKernel(`function(value) {
      return Math.${method}(value);
    }`, { output: [1] });
    for (let j = 0; j < 10; j++) {
      assert.equal(kernel(j / 10)[0].toFixed(3), Math[method](j / 10).toFixed(3), `Math.${method}(${j / 10})`);
    }
  }
  gpu.destroy();
}

test('Single argument Math methods auto', () => {
  singleArgumentMathMethods();
});

test('Single argument Math methods gpu', () => {
  singleArgumentMathMethods('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Single argument Math methods webgl', () => {
  singleArgumentMathMethods('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Single argument Math methods webgl2', () => {
  singleArgumentMathMethods('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Single argument Math methods headlessgl', () => {
  singleArgumentMathMethods('headlessgl');
});

test('Single argument Math methods cpu', () => {
  singleArgumentMathMethods('cpu');
});

function twoArgumentMathMethods(mode) {
  const methods = [
    'atan2',
    'imul',
    'max',
    'min',
    'pow',
  ];

  const gpu = new GPU({ mode });
  for (let i = 0; i < methods.length; i++) {
    const method = methods[i];
    const kernel = gpu.createKernel(`function(value1, value2) {
      return Math.${method}(value1, value2);
    }`, { output: [1] });
    for (let j = 0; j < 10; j++) {
      const value1 = j / 10;
      const value2 = value1;
      assert.equal(kernel(value1, value2)[0].toFixed(3), Math[method](value1, value2).toFixed(3), `Math.${method}(${value1}, ${value2})`);
    }
  }
  gpu.destroy();
}

test('Two argument Math methods auto', () => {
  twoArgumentMathMethods();
});

test('Two argument Math methods gpu', () => {
  twoArgumentMathMethods('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Two argument Math methods webgl', () => {
  twoArgumentMathMethods('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Two argument Math methods webgl2', () => {
  twoArgumentMathMethods('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Two argument Math methods headlessgl', () => {
  twoArgumentMathMethods('headlessgl');
});

test('Two argument Math methods cpu', () => {
  twoArgumentMathMethods('cpu');
});

function sqrtABTest(mode) {
  const gpu = new GPU({ mode });
  const f = gpu.createKernel(function(a, b) {
    return Math.sqrt(a[this.thread.x] * b[this.thread.x]);
  }, {
    output : [6]
  });
  const a = [3, 4, 5, 6, 7, 8];
  const b = [3, 4, 5, 6, 7, 8];

  const res = f(a,b);
  const exp = [3, 4, 5, 6, 7, 8];

  assert.deepEqual(Array.from(res), exp);
  gpu.destroy();
}

test('sqrtAB auto', () => {
  sqrtABTest(null);
});

test('sqrtAB gpu', () => {
  sqrtABTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('sqrtAB webgl', () => {
  sqrtABTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('sqrtAB webgl2', () => {
  sqrtABTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('sqrtAB headlessgl', () => {
  sqrtABTest('headlessgl');
});

test('sqrtAB cpu', () => {
  sqrtABTest('cpu');
});


function mathRandom(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return Math.random();
  }, { output: [1] });

  const result = kernel();
  assert.ok(result[0] > 0 && result[0] < 1, `value was expected to be between o and 1, but was ${result[0]}`);
}

test('random auto', () => {
  mathRandom();
});

test('random gpu', () => {
  mathRandom('gpu');
});

(GPU.isWebGLSupported ? test : skip)('random webgl', () => {
  mathRandom('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('random webgl2', () => {
  mathRandom('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('random headlessgl', () => {
  mathRandom('headlessgl');
});

test('random cpu', () => {
  mathRandom('cpu');
});


