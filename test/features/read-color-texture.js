const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: read color texture');

function colorSyntaxTest(mode) {
  const gpu = new GPU({ mode });
  const createTexture = gpu.createKernel(
    function(value) {
      this.color(
        value[this.thread.y][this.thread.x],
        value[this.thread.y][this.thread.x],
        value[this.thread.y][this.thread.x],
        value[this.thread.y][this.thread.x]
      );
    }
  )
    .setOutput([4, 4])
    .setGraphical(true)
    .setPipeline(true);

  const readRTexture = gpu.createKernel(
    function(texture) {
      const pixel = texture[this.thread.y][this.thread.x];
      return pixel.r;
    }
  )
    .setOutput([4, 4]);

  const readGTexture = gpu.createKernel(
    function(texture) {
      const pixel = texture[this.thread.y][this.thread.x];
      return pixel.g;
    }
  )
    .setOutput([4, 4]);

  const readBTexture = gpu.createKernel(
    function(texture) {
      const pixel = texture[this.thread.y][this.thread.x];
      return pixel.b;
    }
  )
    .setOutput([4, 4]);

  const readATexture = gpu.createKernel(
    function(texture) {
      const pixel = texture[this.thread.y][this.thread.x];
      return pixel.a;
    }
  )
    .setOutput([4, 4]);

  const texture = createTexture([
    [.01,.02,.03,.04],
    [.05,.06,.07,.08],
    [.09,.10,.11,.12],
    [.13,.14,.15,.16]
  ]);
  const resultR = readRTexture(texture);
  const resultG = readGTexture(texture);
  const resultB = readBTexture(texture);
  const resultA = readATexture(texture);

  assert.equal(texture.constructor.name, 'GLTextureGraphical');

  // R
  assert.equal(resultR[0][0].toFixed(2), '0.01');
  assert.equal(resultR[0][1].toFixed(2), '0.02');
  assert.equal(resultR[0][2].toFixed(2), '0.03');
  assert.equal(resultR[0][3].toFixed(2), '0.04');

  assert.equal(resultR[1][0].toFixed(2), '0.05');
  assert.equal(resultR[1][1].toFixed(2), '0.06');
  assert.equal(resultR[1][2].toFixed(2), '0.07');
  assert.equal(resultR[1][3].toFixed(2), '0.08');

  assert.equal(resultR[2][0].toFixed(2), '0.09');
  assert.equal(resultR[2][1].toFixed(2), '0.10');
  assert.equal(resultR[2][2].toFixed(2), '0.11');
  assert.equal(resultR[2][3].toFixed(2), '0.12');

  assert.equal(resultR[3][0].toFixed(2), '0.13');
  assert.equal(resultR[3][1].toFixed(2), '0.14');
  assert.equal(resultR[3][2].toFixed(2), '0.15');
  assert.equal(resultR[3][3].toFixed(2), '0.16');

  // G
  assert.equal(resultG[0][0].toFixed(2), '0.01');
  assert.equal(resultG[0][1].toFixed(2), '0.02');
  assert.equal(resultG[0][2].toFixed(2), '0.03');
  assert.equal(resultG[0][3].toFixed(2), '0.04');

  assert.equal(resultG[1][0].toFixed(2), '0.05');
  assert.equal(resultG[1][1].toFixed(2), '0.06');
  assert.equal(resultG[1][2].toFixed(2), '0.07');
  assert.equal(resultG[1][3].toFixed(2), '0.08');

  assert.equal(resultG[2][0].toFixed(2), '0.09');
  assert.equal(resultG[2][1].toFixed(2), '0.10');
  assert.equal(resultG[2][2].toFixed(2), '0.11');
  assert.equal(resultG[2][3].toFixed(2), '0.12');

  assert.equal(resultG[3][0].toFixed(2), '0.13');
  assert.equal(resultG[3][1].toFixed(2), '0.14');
  assert.equal(resultG[3][2].toFixed(2), '0.15');
  assert.equal(resultG[3][3].toFixed(2), '0.16');

  // B
  assert.equal(resultB[0][0].toFixed(2), '0.01');
  assert.equal(resultB[0][1].toFixed(2), '0.02');
  assert.equal(resultB[0][2].toFixed(2), '0.03');
  assert.equal(resultB[0][3].toFixed(2), '0.04');

  assert.equal(resultB[1][0].toFixed(2), '0.05');
  assert.equal(resultB[1][1].toFixed(2), '0.06');
  assert.equal(resultB[1][2].toFixed(2), '0.07');
  assert.equal(resultB[1][3].toFixed(2), '0.08');

  assert.equal(resultB[2][0].toFixed(2), '0.09');
  assert.equal(resultB[2][1].toFixed(2), '0.10');
  assert.equal(resultB[2][2].toFixed(2), '0.11');
  assert.equal(resultB[2][3].toFixed(2), '0.12');

  assert.equal(resultB[3][0].toFixed(2), '0.13');
  assert.equal(resultB[3][1].toFixed(2), '0.14');
  assert.equal(resultB[3][2].toFixed(2), '0.15');
  assert.equal(resultB[3][3].toFixed(2), '0.16');

  // A
  assert.equal(resultA[0][0].toFixed(2), '0.01');
  assert.equal(resultA[0][1].toFixed(2), '0.02');
  assert.equal(resultA[0][2].toFixed(2), '0.03');
  assert.equal(resultA[0][3].toFixed(2), '0.04');

  assert.equal(resultA[1][0].toFixed(2), '0.05');
  assert.equal(resultA[1][1].toFixed(2), '0.06');
  assert.equal(resultA[1][2].toFixed(2), '0.07');
  assert.equal(resultA[1][3].toFixed(2), '0.08');

  assert.equal(resultA[2][0].toFixed(2), '0.09');
  assert.equal(resultA[2][1].toFixed(2), '0.10');
  assert.equal(resultA[2][2].toFixed(2), '0.11');
  assert.equal(resultA[2][3].toFixed(2), '0.12');

  assert.equal(resultA[3][0].toFixed(2), '0.13');
  assert.equal(resultA[3][1].toFixed(2), '0.14');
  assert.equal(resultA[3][2].toFixed(2), '0.15');
  assert.equal(resultA[3][3].toFixed(2), '0.16');
  gpu.destroy();
}

test('colorSyntaxTest auto', () => {
  colorSyntaxTest(null);
});

test('colorSyntaxTest gpu', () => {
  colorSyntaxTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('colorSyntaxTest webgl', () => {
  colorSyntaxTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('colorSyntaxTest webgl2', () => {
  colorSyntaxTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('colorSyntaxTest headlessgl', () => {
  colorSyntaxTest('headlessgl');
});

test('colorSyntaxTest (cpu) throws', () => {
  assert.throws(() => {
    colorSyntaxTest('cpu');
  });
});
