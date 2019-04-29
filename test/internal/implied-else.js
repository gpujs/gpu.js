const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('internal: Implied else');

function neverReachedWhenEarlyReturn(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(check, v1, v2) {
    if (check) {
      return v1;
    }
    return v2;
  }, { output: [1] });
  const result = kernel(true, 123, 321);
  assert.equal(result[0], 123);
  gpu.destroy();
}

test('never reached when early return auto', () => {
  neverReachedWhenEarlyReturn();
});

test('never reached when early return gpu', () => {
  neverReachedWhenEarlyReturn('gpu');
});

(GPU.isWebGLSupported ? test : skip)('never reached when early return webgl', () => {
  neverReachedWhenEarlyReturn('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('never reached when early return webgl2', () => {
  neverReachedWhenEarlyReturn('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('never reached when early return headlessgl', () => {
  neverReachedWhenEarlyReturn('headlessgl');
});

test('never reached when early return cpu', () => {
  neverReachedWhenEarlyReturn('cpu');
});

function handlesImpliedElse(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(check, v1, v2) {
    if (check) {
      return v1;
    }
    return v2;
  }, { output: [1] });
  const result = kernel(true, 123, 321);
  assert.equal(result[0], 123);
  gpu.destroy();
}

test('handles implied else auto', () => {
  handlesImpliedElse();
});

test('handles implied else gpu', () => {
  handlesImpliedElse('gpu');
});

(GPU.isWebGLSupported ? test : skip)('handles implied else webgl', () => {
  handlesImpliedElse('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('handles implied else webgl2', () => {
  handlesImpliedElse('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('handles implied else headlessgl', () => {
  handlesImpliedElse('headlessgl');
});

test('handles implied else cpu', () => {
  handlesImpliedElse('cpu');
});
