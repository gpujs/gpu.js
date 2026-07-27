const { assert, skip, test, module: describe, only } = require('qunit');
const sinon = require('sinon');
const { GPU, plugins: { mathRandom } } = require('../../src');

describe('Math.random() unique');

// What this guards against is Math.random() inside a kernel returning the same
// value on every run — the seed not advancing. It used to assert all 20 draws
// were pairwise distinct, which failed about a third of the time for two
// reasons that have nothing to do with that bug:
//
//   * it fed each result back in as the next seed, and that loop can land in a
//     short cycle. Measured over 60 trials, as few as 8 of 20 draws came back
//     distinct. Real usage seeds each run independently, which lifts the worst
//     case to 18 of 20.
//   * the draw is a float read back through a texture, so its value space is
//     small enough that 20 samples collide by birthday even when seeded well.
//
// So: seed the way production does, and assert the property that matters with
// enough headroom to survive a collision. A broken seed yields 1 distinct
// value, nowhere near this threshold.
const CHECK_COUNT = 20;
const MIN_DISTINCT = 12;

function mathRandomUnique(mode) {
  const gpu = new GPU({ mode });
  const stub = sinon.stub(mathRandom, 'onBeforeRun').callsFake((kernel) => {
    kernel.setUniform1f('randomSeed1', Math.random());
    kernel.setUniform1f('randomSeed2', Math.random());
  });
  try {
    gpu.addNativeFunction('getSeed', `highp float getSeed() {
    return randomSeedShift;
  }`);
    const kernel = gpu.createKernel(function () {
      const v = Math.random();
      return getSeed();
    }, {output: [1]});
    const results = [];
    for (let i = 0; i < CHECK_COUNT; i++) {
      results.push(kernel()[0]);
    }
    assert.ok(stub.called, 'the Math.random plugin should seed each run');
    const distinct = new Set(results).size;
    assert.ok(distinct > 1, `Math.random() returned the same value every run: ${results[0]}`);
    assert.ok(distinct >= MIN_DISTINCT,
      `expected at least ${MIN_DISTINCT} of ${CHECK_COUNT} draws to differ, got ${distinct}. Values ${JSON.stringify(results)}`);
  } finally {
    stub.restore();
    gpu.destroy();
  }
}

test('unique every time auto', () => {
  mathRandomUnique();
});

test('unique every time gpu', () => {
  mathRandomUnique('gpu');
});

(GPU.isWebGLSupported ? test : skip)('unique every time webgl', () => {
  mathRandomUnique('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('unique every time webgl2', () => {
  mathRandomUnique('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('unique every time headlessgl', () => {
  mathRandomUnique('headlessgl');
});

describe('never above 1');

function mathRandomNeverAboveOne(mode) {
  const gpu = new GPU({ mode });
  const checkCount = 20;
  const checkSource = [];

  for (let i = 0; i < checkCount; i++) {
    checkSource.push(`const check${ i } = Math.random();`);
  }

  for (let i = 0; i < checkCount; i++) {
    for (let j = 0; j < checkCount; j++) {
      if (i === j) continue;
      checkSource.push(`if (check${i} >= 1) return 1;`);
    }
  }

  const kernel = gpu.createKernel(`function() {
    ${checkSource.join('\n')}
    return 0;
  }`, { output: [1] });

  const result = kernel();
  assert.ok(result.every(value => value === 0));
}

test('never above 1 every time auto', () => {
  mathRandomNeverAboveOne();
});

test('never above 1 every time gpu', () => {
  mathRandomNeverAboveOne('gpu');
});

(GPU.isWebGLSupported ? test : skip)('never above 1 every time webgl', () => {
  mathRandomNeverAboveOne('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('never above 1 every time webgl2', () => {
  mathRandomNeverAboveOne('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('never above 1 every time headlessgl', () => {
  mathRandomNeverAboveOne('headlessgl');
});

test('never above 1 every time cpu', () => {
  mathRandomNeverAboveOne('cpu');
});
