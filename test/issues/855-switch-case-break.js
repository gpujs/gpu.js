const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #855 - switch cases with break');

// The switch emitter lowers to an if chain and used to emit the case's
// terminating `break` into it, which GLSL rejects. It is consumed now, a
// Number discriminant (an array read) is accepted, and a break anywhere
// deeper in a case is rejected up front with a real message.
function testBreak(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (mode, input, lookup) {
    let out = -1.0;
    let i = this.thread.x;
    switch (mode) {
      case 1:
        out = lookup[input[i++]] + i;
        break;
      default:
        out = 0.0;
    }
    return out;
  }).setOutput([1]);
  assert.equal(kernel(1, [2], [7, 13, 19, 23])[0], 20);
  assert.equal(kernel(9, [2], [7, 13, 19, 23])[0], 0);
  gpu.destroy();
}

function testNumberDiscriminant(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function (input, lookup) {
    let out = -1.0;
    switch (lookup[input[this.thread.x]]) {
      case 19:
        out = 5.0;
        break;
      default:
        out = 1.0;
    }
    return out;
  }).setOutput([1]);
  assert.equal(kernel([2], [7, 13, 19, 23])[0], 5);
  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('terminating break - webgl', () => {
  testBreak('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('terminating break - webgl2', () => {
  testBreak('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('terminating break - headlessgl', () => {
  testBreak('headlessgl');
});

(GPU.isHeadlessGLSupported ? test : skip)('Number discriminant - headlessgl', () => {
  testNumberDiscriminant('headlessgl');
});

(GPU.isHeadlessGLSupported ? test : skip)('statements after break are unreachable and dropped - headlessgl', () => {
  const gpu = new GPU({ mode: 'headlessgl' });
  const kernel = gpu.createKernel(function (mode) {
    let out = 0.0;
    switch (mode) {
      case 1:
        out = 5.0;
        break;
        out = 99.0;
      default:
        out = 1.0;
    }
    return out;
  }).setOutput([1]);
  assert.equal(kernel(1)[0], 5);
  gpu.destroy();
});

(GPU.isHeadlessGLSupported ? test : skip)('a default-only switch with break - headlessgl', () => {
  const gpu = new GPU({ mode: 'headlessgl' });
  const kernel = gpu.createKernel(function (mode) {
    let out = 0.0;
    switch (mode) {
      default:
        out = 7.0;
        break;
    }
    return out;
  }).setOutput([1]);
  assert.equal(kernel(1)[0], 7);
  gpu.destroy();
});

(GPU.isHeadlessGLSupported ? test : skip)('mid-case break is rejected clearly - headlessgl', () => {
  const gpu = new GPU({ mode: 'headlessgl' });
  assert.throws(() => {
    gpu.createKernel(function (mode) {
      let out = 0.0;
      switch (mode) {
        case 1:
          if (out == 0.0) { break; }
          out = 2.0;
          break;
        default:
          out = 1.0;
      }
      return out;
    }).setOutput([1])(1);
  }, /only supported as the case terminator/);
  gpu.destroy();
});
