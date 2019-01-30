const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('math object');

function sqrtABTest(mode) {
  const gpu = new GPU({ mode });
  const f = gpu.createKernel(function(a, b) {
    return Math.sqrt(a[ this.thread.x ] * b[ this.thread.x ]);
  }, {
    output : [6]
  });

  assert.ok(f !== null, 'function generated test');

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
