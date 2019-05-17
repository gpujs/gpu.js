const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #346');

const DATA_MAX = 1024;
const uint8data = new Uint8Array(DATA_MAX);
const uint16data = new Uint16Array(DATA_MAX);

for (let i = 0; i < DATA_MAX; i++) {
  uint8data[i] = Math.random() * 255;
  uint16data[i] = Math.random() * 255 * 255;
}
function buildUintArrayInputKernel(mode, data) {
  const gpu = new GPU({ mode });
  const largeArrayAddressKernel = gpu.createKernel(function(data) {
    return data[this.thread.x];
  }, { precision: 'unsigned' })
    .setOutput([DATA_MAX]);

  const result = largeArrayAddressKernel(data);
  let same = true;
  let i = 0;
  for (; i < DATA_MAX; i++) {
    if (result[i] !== data[i]) {
      same = false;
      break;
    }
  }
  assert.ok(same, "not all elements are the same, failed on index:" + i);
  gpu.destroy();
}

(GPU.isWebGLSupported ? test : skip)('Issue #346 uint8 input array - webgl', () => {
  buildUintArrayInputKernel('webgl', uint8data);
});

(GPU.isWebGL2Supported ? test : skip)('Issue #346 uint8 input array - webgl2', () => {
  buildUintArrayInputKernel('webgl2', uint8data);
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #346 uint8 input array - headlessgl', () => {
  buildUintArrayInputKernel('headlessgl', uint8data);
});

(GPU.isWebGLSupported ? test : skip)('Issue #346 uint16 input array - webgl', () => {
  buildUintArrayInputKernel('webgl', uint16data);
});

(GPU.isWebGL2Supported ? test : skip)('Issue #346 uint16 input array - webgl2', () => {
  buildUintArrayInputKernel('webgl2', uint16data);
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #346 uint16 input array - headlessgl', () => {
  buildUintArrayInputKernel('headlessgl', uint16data);
});
