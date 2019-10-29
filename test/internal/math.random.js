const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('Math.random() unique');

function mathRandomUnique(mode) {
  const gpu = new GPU({ mode });
  const checkCount = 20;
  const checkSource = [];

  for (let i = 0; i < checkCount; i++) {
    checkSource.push(`const check${ i } = Math.random();`);
  }

  for (let i = 0; i < checkCount; i++) {
    for (let j = 0; j < checkCount; j++) {
      if (i === j) continue;
      checkSource.push(`if (check${i} === check${j}) return ${j};`);
    }
  }

  const kernel = gpu.createKernel(`function() {
    ${checkSource.join('\n')}
    return 0;
  }`, { output: [1] });

  const result = kernel();
  assert.ok(result.every(value => value === 0));
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

test('unique every time cpu', () => {
  mathRandomUnique('cpu');
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
