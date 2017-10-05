function demo(mode) {
  var matrixSize = 512;
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
    for (var i = 0; i < 512; i++) {
      sum += a[this.thread.y][i] * b[i][this.thread.x];
    }
    return sum;
  })
    .setOutput([512, 512]);

	QUnit.assert.ok( multiplyMatrix !== null, "function generated test");
	QUnit.assert.equal(multiplyMatrix(a, b).length, 512, "basic return function test");
}

// QUnit.test( "demo (auto)", function() {
//   demo(null);
// });
//
// QUnit.test( "demo (WebGL)", function() {
//   demo("webgl");
// });

QUnit.test( "demo (CPU)", function() {
  demo("cpu");
});
