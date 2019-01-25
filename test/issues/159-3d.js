(function() {
  const GPU = require('../../src/index');
  function threeD(mode) {
    var gpu = new GPU({ mode: mode });

    const kernel = gpu.createKernel(function(grid) {
      return grid[this.thread.y][this.thread.x];
    })
      .setOutput([5, 5]);

    //This would cause the above to fail
    gpu.createKernel(function() { return 0; })
      .setOutput([5, 5, 5])
      .build();

    const result = kernel([
      [0,1,2,3,4],
      [1,2,3,4,5],
      [2,3,4,5,6],
      [3,4,5,6,7],
      [4,5,6,7,8]
    ]);
    QUnit.assert.equal(result.length, 5);
    QUnit.assert.deepEqual(result.map(function(v) { return Array.from(v); }), [
      [0,1,2,3,4],
      [1,2,3,4,5],
      [2,3,4,5,6],
      [3,4,5,6,7],
      [4,5,6,7,8]
    ]);
    gpu.destroy();
  }

  QUnit.test('Issue #159 - for vars (auto)', () => {
    threeD(null);
  });

  QUnit.test('Issue #159 - for vars (gpu)', () => {
    threeD('gpu');
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('Issue #159 - for vars (webgl)', () => {
    threeD('webgl');
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('Issue #159 - for vars (webgl2)', () => {
    threeD('webgl2');
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('Issue #159 - for vars (headlessgl)', () => {
    threeD('headlessgl');
  });

  QUnit.test('Issue #159 - for vars (cpu)', () => {
    threeD('cpu');
  });
})();
