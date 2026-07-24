const { assert, skip, test, module: describe } = require('qunit');
const { GPU, input } = require('../../src');

describe('issue #701 - signed typed array inputs');

// signed arrays transfer as Float32Array but were sized/decoded with the
// bit ratio of their original element width, reading float32 bytes as
// int16/int8 pairs
function testSignedRoundTrip(mode, Type) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(a) {
    return a[this.thread.x];
  }, { output: [4], precision: 'unsigned' });
  assert.deepEqual(Array.from(kernel(input(new Type([1, -2, 3, -4]), [4]))), [1, -2, 3, -4], `${Type.name} input`);
  const kernel2 = gpu.createKernel(function(a) {
    return a[this.thread.x];
  }, { output: [4], precision: 'unsigned' });
  assert.deepEqual(Array.from(kernel2(new Type([1, -2, 3, -4]))), [1, -2, 3, -4], `${Type.name} plain`);
  gpu.destroy();
}

function testTypedInputsAgree(mode) {
  const gpu = new GPU({ mode });
  const flat = [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const results = [Float32Array, Int16Array, Uint8Array].map(Type => {
    const kernel = gpu.createKernel(function(a) {
      this.color(a[this.thread.x][this.thread.y][0], a[this.thread.x][this.thread.y][1], a[this.thread.x][this.thread.y][2]);
    }, { output: [2, 2], graphical: true });
    kernel(input(new Type(flat), [3, 2, 2]));
    const pixels = Array.from(kernel.getPixels());
    return pixels;
  });
  assert.deepEqual(results[1], results[0], 'Int16Array matches Float32Array');
  assert.deepEqual(results[2], results[0], 'Uint8Array matches Float32Array');
  // input(flat, [X,Y,Z]) is equivalent to a nested [Z][Y][X] array
  const nestedKernel = gpu.createKernel(function(a) {
    this.color(a[this.thread.x][this.thread.y][0], a[this.thread.x][this.thread.y][1], a[this.thread.x][this.thread.y][2]);
  }, { output: [2, 2], graphical: true });
  nestedKernel([
    [[0, 0, 1], [0, 0, 0]],
    [[0, 0, 0], [0, 0, 0]]
  ]);
  assert.deepEqual(Array.from(nestedKernel.getPixels()), results[0], 'nested [Z][Y][X] matches input(flat, [X,Y,Z])');
  gpu.destroy();
}

(GPU.isGPUSupported ? test : skip)('Int16Array round-trips with negatives gpu', () => {
  testSignedRoundTrip('gpu', Int16Array);
});

(GPU.isGPUSupported ? test : skip)('Int8Array round-trips with negatives gpu', () => {
  testSignedRoundTrip('gpu', Int8Array);
});

(GPU.isWebGLSupported ? test : skip)('Int16Array round-trips with negatives webgl', () => {
  testSignedRoundTrip('webgl', Int16Array);
});

(GPU.isWebGL2Supported ? test : skip)('Int16Array round-trips with negatives webgl2', () => {
  testSignedRoundTrip('webgl2', Int16Array);
});

(GPU.isHeadlessGLSupported ? test : skip)('Int16Array round-trips with negatives headlessgl', () => {
  testSignedRoundTrip('headlessgl', Int16Array);
});

(GPU.isHeadlessGLSupported ? test : skip)('Int8Array round-trips with negatives headlessgl', () => {
  testSignedRoundTrip('headlessgl', Int8Array);
});

(GPU.isGPUSupported ? test : skip)('typed inputs agree with each other and nested arrays gpu', () => {
  testTypedInputsAgree('gpu');
});

(GPU.isHeadlessGLSupported ? test : skip)('typed inputs agree with each other and nested arrays headlessgl', () => {
  testTypedInputsAgree('headlessgl');
});
