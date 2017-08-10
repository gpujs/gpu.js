
var cns = document.createElement('canvas');
cns.style.width = '100%';
cns.style.height = '100%';
cns.style.position = 'absolute';
cns.style.top = '0';
// document.body.appendChild(cns);
function threeD(mode) {
  var gpu = new GPU({ mode: mode, canvas: cns });

  const kernel = gpu.createKernel(function(grid) {
    return grid[this.thread.y][this.thread.x];
  })
    .setDimensions([5, 5])
    //.setGraphical(true);

  //Comment this out, and it works fine!
  gpu.createKernel(function() { return 0; })
    .setDimensions([5, 5,4]).build();


  var result = kernel([
    [0,1,2,3,4],
    [1,2,3,4,5],
    [2,3,4,5,6],
    [3,4,5,6,7],
    [4,5,6,7,8]
  ]);
  console.log(result);
  QUnit.assert.equal(result.length, 5);
  QUnit.assert.deepEqual(result, [
    [0,1,2,3,4],
    [1,2,3,4,5],
    [2,3,4,5,6],
    [3,4,5,6,7],
    [4,5,6,7,8]
  ]);
}

// QUnit.test('Issue #159 - for vars cpu', function() {
//   threeD('cpu');
// });

QUnit.test('Issue #159 - for vars gpu', function() {
  threeD('gpu');
});