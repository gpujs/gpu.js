(function() {
  function sumAB(mode) {
    var gpu = new GPU({mode: mode});

    function customAdder(a, b) {
      return a + b;
    }

    var kernel = gpu.createKernel(function (a, b) {
      return customAdder(a[this.thread.x], b[this.thread.x]);
    }, {
      functions: [customAdder],
      output: [6]
    });

    QUnit.assert.ok(kernel !== null, 'function generated test');

    var a = [1, 2, 3, 5, 6, 7];
    var b = [4, 5, 6, 1, 2, 3];

    var result = kernel(a, b);
    var expected = [5, 7, 9, 6, 8, 10];

    QUnit.assert.equal(result.length, expected.length);
    for (var i = 0; i < expected.length; ++i) {
      QUnit.assert.close(result[i], expected[i], 0.1, 'Result array index: ' + i);
    }
    gpu.destroy();
  }

  QUnit.test('add custom function sumAB (auto)', function () {
    sumAB(null);
  });

  QUnit.test('add custom function sumAB (gpu)', function () {
    sumAB('gpu');
  });

  QUnit.test('add custom function sumAB (webgl)', function () {
    sumAB('webgl');
  });

  QUnit.test('add custom function sumAB (webgl2)', function () {
    sumAB('webgl2');
  });

  QUnit.test('add custom function sumAB (cpu)', function () {
    sumAB('cpu');
  });

})();
(function() {
  function constantsWidth(mode) {
    var gpu = new GPU({mode: mode});

    function customAdder(a, b) {
      var sum = 0;
      for (var i = 0; i < this.constants.width; i++) {
        sum += (a[this.thread.x] + b[this.thread.x]);
      }
      return sum;
    }

    var kernel = gpu.createKernel(function (a, b) {
      return customAdder(a, b);
    }, {
      functions: [customAdder],
      output: [6],
      constants: {width: 6}
    });

    QUnit.assert.ok(kernel !== null, 'function generated test');

    var a = [1, 2, 3, 5, 6, 7];
    var b = [1, 1, 1, 1, 1, 1];

    var result = kernel(a, b);
    var expected = [12, 18, 24, 36, 42, 48];

    QUnit.assert.equal(result.length, expected.length);
    for (var i = 0; i < expected.length; ++i) {
      QUnit.assert.close(result[i], expected[i], 0.1, 'Result array index: ' + i);

    }
    gpu.destroy();
  }

  QUnit.test('add custom function constantsWidth (auto)', function () {
    constantsWidth(null);
  });

  QUnit.test('add custom function constantsWidth (gpu)', function () {
    constantsWidth('gpu');
  });

  QUnit.test('add custom function constantsWidth (webgl)', function () {
    constantsWidth('webgl');
  });

  QUnit.test('add custom function constantsWidth (webgl2)', function () {
    constantsWidth('webgl2');
  });

  QUnit.test('add custom function constantsWidth (cpu)', function () {
    constantsWidth('cpu');
  });

})();
(function() {
  function thisOutputX(mode) {
    var gpu = new GPU({ mode: mode });

    function customAdder(a, b) {
      var sum = 0;
      for (var i = 0; i < this.output.x; i++) {
        sum += (a[this.thread.x] + b[this.thread.x]);
      }
      return sum;
    }

    var kernel = gpu.createKernel(function(a, b) {
      return customAdder(a, b);
    }, {
      functions: [customAdder],
      output : [6]
    });

    QUnit.assert.ok(kernel !== null, 'function generated test');

    var a = [1, 2, 3, 5, 6, 7];
    var b = [1, 1, 1, 1, 1, 1];

    var result = kernel(a,b);
    var expected = [12, 18, 24, 36, 42, 48];

    QUnit.assert.equal(result.length, expected.length);
    for(var i = 0; i < expected.length; ++i) {
      QUnit.assert.close(result[i], expected[i], 0.1, 'Result array index: '+i);
    }
    gpu.destroy();
  }

  QUnit.test('add custom function thisOutputX (auto)', function() {
    thisOutputX(null);
  });

  QUnit.test('add custom function thisOutputX (gpu)', function() {
    thisOutputX('gpu');
  });

  QUnit.test('add custom function thisOutputX (webgl)', function() {
    thisOutputX('webgl');
  });

  QUnit.test('add custom function thisOutputX (webgl2)', function() {
    thisOutputX('webgl2');
  });

  QUnit.test('add custom function thisOutputX (cpu)', function() {
    thisOutputX('cpu');
  });
})();