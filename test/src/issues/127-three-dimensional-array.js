QUnit.test( "Issue #127: Three dimensional Arrays", function() {
const A = [ 
    [1], 
    [ [1, 1], [1, 1], [1, 1] ], 
    [ [1, 1, 1] ] 
];
const B = [ 
    [1], 
    [ [1, 1], [1, 1], [1, 1] ], 
    [ [1, 1, 1] ] 
];

const gpu = new GPU();

function add(m, n, y, x) {
    return m[y][x] + n[y][x];
}

const kernel1 = gpu.createKernelMap({
multiplyResult: add
}, function (a, b) {
return add(b, a, this.thread.y, this.thread.x);
})
.setDimensions([A[1].length - 1, B[1].length]);

const kernel2 = gpu.createKernel(
function (a, b) {
return a[this.thread.y][this.thread.x] + b[this.thread.y][this.thread.x];
})
.setDimensions([A[2][0].length, B[2].length]);

const result1 = kernel1(A[1], B[1]).result;
  QUnit.assert.deepEqual(QUnit.extend([], result1[0]), [2,2]);
  QUnit.assert.deepEqual(QUnit.extend([], result1[1]), [2,2]);
  QUnit.assert.deepEqual(QUnit.extend([], result1[2]), [2,2]);

  const result2 = kernel2(A[2], B[2]);
  QUnit.assert.deepEqual(QUnit.extend([], result2), [2,2,2]);
});