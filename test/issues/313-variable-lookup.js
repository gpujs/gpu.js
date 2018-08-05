(function() {
  function test(mode) {
    var gpu = new GPU({ mode: mode });

    function mult2(scale) {
      return 2*scale;
    }

    var render1 = gpu.createKernel(function(input) {
      return (mult2(input) + mult2(input*2) + mult2(input*1))	// RIGHT
    })
      .setOutput([1])
      .setFunctions([mult2]);

    var render2 = gpu.createKernel(function(input) {
      return (mult2(input) + mult2(input*2) + mult2(input)); // WRONG
    })
      .setOutput([1])
      .setFunctions([mult2]);

    QUnit.assert.equal(render1(1)[0], 8, 'render1 equals 8');
    QUnit.assert.equal(render2(1)[0], 8, 'render2 equals 8');
    gpu.destroy();
  }
  QUnit.test('Issue #313 Mismatch argument lookup - auto', () => {
    test();
  });
  QUnit.test('Issue #313 Mismatch argument lookup - gpu', () => {
    test('gpu');
  });
  QUnit.test('Issue #313 Mismatch argument lookup - webgl', () => {
    test('webgl');
  });
  QUnit.test('Issue #313 Mismatch argument lookup - webgl2', () => {
    test('webgl2');
  });
  QUnit.test('Issue #313 Mismatch argument lookup - cpu', () => {
    test('cpu');
  });
})();