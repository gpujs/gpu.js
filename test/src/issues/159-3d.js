(function() {
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

    var result = kernel([
      [0,1,2,3,4],
      [1,2,3,4,5],
      [2,3,4,5,6],
      [3,4,5,6,7],
      [4,5,6,7,8]
    ]);
    QUnit.assert.equal(result.length, 5);
    QUnit.assert.deepEqual(result, [
      [0,1,2,3,4],
      [1,2,3,4,5],
      [2,3,4,5,6],
      [3,4,5,6,7],
      [4,5,6,7,8]
    ]);
  }

  QUnit.test('Issue #159 - for vars (cpu)', function() {
    threeD('cpu');
  });

  QUnit.test('Issue #159 - for vars (auto)', function() {
    threeD(null);
  });

  QUnit.test('Issue #159 - for vars (gpu)', function() {
    threeD('gpu');
  });

  QUnit.test('Issue #159 - for vars (webgl)', function() {
    threeD('webgl');
  });

  QUnit.test('Issue #159 - for vars (webgl2)', function() {
    threeD('webgl2');
  });
})();