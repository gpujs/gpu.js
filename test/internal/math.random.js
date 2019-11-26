const { assert, skip, test, module: describe, only } = require('qunit');
const sinon = require('sinon');
const { GPU, plugins: { mathRandom } } = require('../../src');

describe('Math.random() unique');

function mathRandomUnique(mode) {
  const gpu = new GPU({ mode });
  const checkCount = 20;
  let seed1 = Math.random();
  let seed2 = Math.random();
  let stub = sinon.stub(mathRandom, 'onBeforeRun').callsFake((kernel) => {
    kernel.setUniform1f('randomSeed1', seed1);
    kernel.setUniform1f('randomSeed2', seed2);
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
    for (let i = 0; i < checkCount; i++) {
      const result = kernel();
      assert.ok(results.indexOf(result[0]) === -1, `duplication at index ${results.indexOf(result[0])} from new value ${result[0]}.  Values ${JSON.stringify(results)}`);
      results.push(result[0]);
      seed2 = result[0];
      assert.ok(stub.called);
      stub.restore();
      stub.callsFake((kernel) => {
        kernel.setUniform1f('randomSeed1', seed1);
        kernel.setUniform1f('randomSeed2', seed2);
      });
    }
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
