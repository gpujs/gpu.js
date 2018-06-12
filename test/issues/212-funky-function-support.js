(function() {
  function funky(mode) {
    var gpu = new GPU({ mode: mode });

    const kernel = gpu.createKernel(`function(v1, v2) {
      return (0, _add.add)(v1[this.thread.y][this.thread.x], v2[this.thread.y][this.thread.x]);
    }`)
      .setFunctions([
        function add(value1, value2) {
          return value1 + value2;
        }
      ])
      .setOutput([2, 2]);

    var result = kernel([
      [0,1],
      [1,2]
    ], [
      [0,1],
      [1,2]
    ]);
    QUnit.assert.deepEqual(result, [
      [0,2],
      [2,4]
    ]);
  }

  QUnit.test('Issue #212 - funky function support cpu', function() {
    funky('cpu');
  });

  QUnit.test('Issue #212 - funky function support (auto)', function() {
    funky('gpu');
  });

  QUnit.test('Issue #212 - funky function support (gpu)', function() {
    funky('gpu');
  });

  QUnit.test('Issue #212 - funky function support (webgl)', function() {
    funky('webgl');
  });

  QUnit.test('Issue #212 - funky function support (webgl2)', function() {
    funky('webgl2');
  });
})();