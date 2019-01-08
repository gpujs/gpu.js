(function() {
  function missingZIndexIssue(mode) {
    var gpu = new GPU({ mode: mode });

    var kernel = gpu.createKernel(function(value) {
      return value[this.thread.z][this.thread.y][this.thread.x];
    })
      .setOutput([1, 1, undefined]);

    kernel([[[1]]]);
    gpu.destroy();
  }

  QUnit.test('Issue #335 Missing z index issue (auto)', () => {
    QUnit.assert.throws(function() {
      missingZIndexIssue('auto');
    });
  });

  QUnit.test('Issue #335 Missing z index issue (gpu)', () => {
    QUnit.assert.throws(function() {
      missingZIndexIssue('gpu');
    });
  });

  QUnit.test('Issue #335 Missing z index issue (webgl)', () => {
    QUnit.assert.throws(function() {
      missingZIndexIssue('webgl');
    });
  });

  QUnit.test('Issue #335 Missing z index issue (webgl2)', () => {
    QUnit.assert.throws(function() {
      missingZIndexIssue('webgl2');
    });
  });

  QUnit.test('Issue #335 Missing z index issue (cpu)', () => {
    QUnit.assert.throws(function() {
      missingZIndexIssue('cpu');
    });
  });
})();