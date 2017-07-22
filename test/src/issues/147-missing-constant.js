
function typedArrayTest(mode) {
  var gpu = new GPU({ mode: mode });

  const kernel = gpu.createKernel(function() {
    return getPi();
  })
    .setDimensions([1])
    .setConstants({ pi: Math.PI });

  gpu.addFunction(function getPi() {
    return pi;
  });

  console.log(QUnit.assert.equal((kernel()[0]).toFixed(7), Math.PI.toFixed(7)));
}

QUnit.test( "Issue #130 - missing constant cpu", function() {
  typedArrayTest('cpu');
});

QUnit.test( "Issue #130 - missing constant gpu", function() {
  typedArrayTest('gpu');
});