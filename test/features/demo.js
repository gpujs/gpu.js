(function() {
  function demo(mode) {
    var matrixSize = 6;
    var a = new Array(matrixSize * matrixSize);
    var b = new Array(matrixSize * matrixSize);
    a = splitArray(fillArrayRandom(a), matrixSize);
    b = splitArray(fillArrayRandom(b), matrixSize);
    function fillArrayRandom(array) {
      for(var i = 0; i < array.length; i++) {
        array[i] = Math.random();
      }
      return array;
    }

    function splitArray(array, part) {
      var result = [];
      for(var i = 0; i < array.length; i += part) {
        result.push(array.slice(i, i + part));
      }
      return result;
    }
    const gpu = new GPU({ mode: mode });
    const multiplyMatrix = gpu.createKernel(function(a, b) {
      var sum = 0;
      for (var i = 0; i < 6; i++) {
        sum += a[this.thread.y][i] * b[i][this.thread.x];
      }
      return sum;
    })
      .setOutput([6, 6]);

    QUnit.assert.ok( multiplyMatrix !== null, "function generated test");
    QUnit.assert.equal(multiplyMatrix(a, b).length, 6, "basic return function test");
  }

  QUnit.test( "demo (auto)", function() {
    demo();
  });

  QUnit.test( "demo (gpu)", function() {
    demo('gpu');
  });

  QUnit.test( "demo (webgl)", function() {
    demo('webgl');
  });

  QUnit.test( "demo (webgl2)", function() {
    demo('webgl2');
  });

  QUnit.test( "demo (cpu)", function() {
    demo('cpu');
  });
})();
