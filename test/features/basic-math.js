const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: basic math');

function sumABTest(mode) {
  const gpu = new GPU({ mode });
  const f = gpu.createKernel(function(a, b) {
    return (a[this.thread.x] + b[this.thread.x]);
  }, {
    output : [6],
    mode : mode,
  });

  assert.ok( f !== null, 'function generated test');

  const a = [1, 2, 3, 5, 6, 7];
  const b = [4, 5, 6, 1, 2, 3];

  const res = f(a,b);
  const exp = [5, 7, 9, 6, 8, 10];

  for(let i = 0; i < exp.length; ++i) {
    assert.equal(res[i], exp[i], 'Result arr idx: '+i);
  }
  gpu.destroy();
}

test('sumAB auto', () => {
  sumABTest(null);
});

test('sumAB gpu', () => {
  sumABTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('sumAB webgl', () => {
  sumABTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('sumAB webgl2', () => {
  sumABTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('sumAB headlessgl', () => {
  sumABTest('headlessgl');
});

test('sumAB cpu', () => {
  sumABTest('cpu');
});


function multABTest(mode) {
  const gpu = new GPU({ mode });
  const f = gpu.createKernel(function(a, b) {
    let sum = 0;
    sum += a[this.thread.y][0] * b[0][this.thread.x];
    sum += a[this.thread.y][1] * b[1][this.thread.x];
    sum += a[this.thread.y][2] * b[2][this.thread.x];
    return sum;
  }, {
    output : [3, 3]
  });

  assert.ok(f !== null, 'function generated test');
  assert.deepEqual(f(
    [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9]
    ],
    [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9]
    ]).map((object) => { return Array.from(object); }),
    [
      [30, 36, 42],
      [66, 81, 96],
      [102, 126, 150]
    ],
    'basic mult function test'
  );
  gpu.destroy();
}

test('multAB auto', () => {
  multABTest(null);
});
test('multAB gpu', () => {
  multABTest('gpu');
});
(GPU.isWebGLSupported ? test : skip)('multAB webgl', () => {
  multABTest('webgl');
});
(GPU.isWebGL2Supported ? test : skip)('multAB webgl2', () => {
  multABTest('webgl2');
});
(GPU.isHeadlessGLSupported ? test : skip)('multAB headlessgl', () => {
  multABTest('headlessgl');
});
test('multAB cpu', () => {
  multABTest('cpu');
});

