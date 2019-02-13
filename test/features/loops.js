const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('loops - for');
function forLoopTest(mode) {
  const gpu = new GPU({ mode });
  const f = gpu.createKernel(function(a, b) {
    let x = 0;
    for (let i = 0; i < 10; i++) {
      x = x + 1;
    }

    return (a[this.thread.x] + b[this.thread.x] + x);
  }, {
    output : [6]
  });

  assert.ok( f !== null, 'function generated test');

  const a = [1, 2, 3, 5, 6, 7];
  const b = [4, 5, 6, 1, 2, 3];

  const res = f(a,b);
  const exp = [15, 17, 19, 16, 18, 20];

  assert.deepEqual(Array.from(res), exp);
  gpu.destroy();
}

test('auto', () => {
  forLoopTest(null);
});

test('gpu', () => {
  forLoopTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  forLoopTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  forLoopTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  forLoopTest('headlessgl');
});

test('cpu', () => {
  forLoopTest('cpu');
});


describe('loops - for with constant');
function forWithConstantTest(mode) {
  const gpu = new GPU({ mode });
  const f = gpu.createKernel(function(a, b) {
    let x = 0;
    for(let i = 0; i < this.constants.max; i++) {
      x = x + 1;
    }

    return (a[this.thread.x] + b[this.thread.x] + x);
  }, {
    output : [6],
    constants: {
      max: 10
    }
  });

  assert.ok( f !== null, 'function generated test');

  const a = [1, 2, 3, 5, 6, 7];
  const b = [4, 5, 6, 1, 2, 3];

  const res = f(a,b);
  const exp = [15, 17, 19, 16, 18, 20];

  assert.deepEqual(Array.from(res), exp);

  gpu.destroy();
}

test('forConstantLoopTest auto', () => {
  forWithConstantTest(null);
});

test('forConstantLoopTest gpu', () => {
  forWithConstantTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('forConstantLoopTest webgl', () => {
  forWithConstantTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('forConstantLoopTest webgl2', () => {
  forWithConstantTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('forConstantLoopTest headlessgl', () => {
  forWithConstantTest('headlessgl');
});

test('forConstantLoopTest cpu', () => {
  forWithConstantTest('cpu');
});


describe('loops - while');
function whileLoopTest(mode) {
  const gpu = new GPU({ mode });
  const f = gpu.createKernel(function(a, b) {
    let x = 0;
    let i = 0;
    while (i++ < 10) {
      x = x + 1;
    }

    return (a[this.thread.x] + b[this.thread.x] + x);
  }, {
    output : [6]
  });

  const a = [1, 2, 3, 5, 6, 7];
  const b = [4, 5, 6, 1, 2, 3];

  const res = f(a,b);
  const exp = [15, 17, 19, 16, 18, 20];

  assert.deepEqual(Array.from(res), exp);
  gpu.destroy();
}

test('auto', () => {
  whileLoopTest(null);
});

test('gpu', () => {
  whileLoopTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  whileLoopTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  whileLoopTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  whileLoopTest('headlessgl');
});

test('cpu', () => {
  whileLoopTest('cpu');
});



describe('loops - while with constant');
function whileWithConstantTest(mode) {
  const gpu = new GPU({ mode });
  const f = gpu.createKernel(function(a, b) {
    let x = 0;
    let i = 0;
    while (i++ < this.constants.max) {
      x = x + 1;
    }

    return (a[this.thread.x] + b[this.thread.x] + x);
  }, {
    output : [6],
    constants: { max: 10 }
  });

  assert.ok( f !== null, 'function generated test');

  const a = [1, 2, 3, 5, 6, 7];
  const b = [4, 5, 6, 1, 2, 3];

  const res = f(a,b);
  const exp = [15, 17, 19, 16, 18, 20];

  assert.deepEqual(Array.from(res), exp);
  gpu.destroy();
}

test('auto', () => {
  whileWithConstantTest(null);
});

test('gpu', () => {
  whileWithConstantTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  whileWithConstantTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  whileWithConstantTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  whileWithConstantTest('headlessgl');
});

test('cpu', () => {
  whileWithConstantTest('cpu');
});


describe('loops - evil while loop');
function evilWhileLoopTest(mode ) {
  function evilWhileKernelFunction(a, b) {
    let x = 0;
    let i = 0;

    //10000000 or 10 million is the approx upper limit on a chrome + GTX 780
    while(i<100) {
      x = x + 1.0;
      ++i;
    }

    return (a[this.thread.x] + b[this.thread.x] + x);
  }

  const evil_while_a = [1, 2, 3, 5, 6, 7];
  const evil_while_b = [4, 5, 6, 1, 2, 3];
  const evil_while_cpuRef = new GPU({ mode: 'cpu' });
  const evil_while_cpuRef_f =  evil_while_cpuRef.createKernel(evilWhileKernelFunction, {
    output : [6],
    loopMaxIterations: 10000,
  });

  const evil_while_exp = evil_while_cpuRef_f(evil_while_a,evil_while_b);
  const gpu = new GPU({ mode });

  const f = gpu.createKernel(evilWhileKernelFunction, {
    output : [6]
  });

  assert.ok( f !== null, 'function generated test');

  const res = f(evil_while_a,evil_while_b);

  for(let i = 0; i < evil_while_exp.length; ++i) {
    assert.equal(evil_while_exp[i], res[i], 'Result arr idx: '+i);
  }
  evil_while_cpuRef.destroy();
  gpu.destroy();
}

test('auto', () => {
  evilWhileLoopTest(null);
});

test('gpu', () => {
  evilWhileLoopTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  evilWhileLoopTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  evilWhileLoopTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  evilWhileLoopTest('headlessgl');
});

test('cpu', () => {
  evilWhileLoopTest('cpu');
});

describe('loops - do while');
function doWhileLoopTest(mode) {
  const gpu = new GPU({ mode });
  const f = gpu.createKernel(function(a, b) {
    let x = 0;
    let i = 0;
    do {
      x = x + 1;
      i++;
    } while (i < 10);
    return (a[this.thread.x] + b[this.thread.x] + x);
  }, {
    output : [6]
  });

  assert.ok( f !== null, 'function generated test');

  const a = [1, 2, 3, 5, 6, 7];
  const b = [4, 5, 6, 1, 2, 3];

  const res = f(a,b);
  const exp = [15, 17, 19, 16, 18, 20];
  assert.deepEqual(Array.from(res), exp);
  gpu.destroy();
}

test('auto', () => {
  doWhileLoopTest(null);
});

test('gpu', () => {
  doWhileLoopTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  doWhileLoopTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  doWhileLoopTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  doWhileLoopTest('headlessgl');
});

test('cpu', () => {
  doWhileLoopTest('cpu');
});

describe('loops - do while with constant');
function doWhileWithConstantLoop(mode) {
  const gpu = new GPU({ mode });
  const f = gpu.createKernel(function(a, b) {
    let x = 0;
    let i = 0;
    do {
      x = x + 1;
      i++;
    } while (i < this.constants.max);
    return (a[this.thread.x] + b[this.thread.x] + x);
  }, {
    output : [6],
    constants: { max: 10 }
  });

  assert.ok( f !== null, 'function generated test');

  const a = [1, 2, 3, 5, 6, 7];
  const b = [4, 5, 6, 1, 2, 3];

  const res = f(a,b);
  const exp = [15, 17, 19, 16, 18, 20];
  assert.deepEqual(Array.from(res), exp);
  gpu.destroy();
}

test('auto', () => {
  doWhileWithConstantLoop(null);
});

test('gpu', () => {
  doWhileWithConstantLoop('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  doWhileWithConstantLoop('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  doWhileWithConstantLoop('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  doWhileWithConstantLoop('headlessgl');
});

test('cpu', () => {
  doWhileWithConstantLoop('cpu');
});
