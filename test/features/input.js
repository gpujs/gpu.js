(function() {
  function input(mode) {
    const gpu = new GPU({ mode: mode });
    const input = GPU.input;
    const kernel = gpu.createKernel(function(a, b) {
      return a[this.thread.y][this.thread.x] + b[this.thread.y][this.thread.x];
    })
      .setOutput([9]);

    const a = new Float32Array(9);
    a.set([1,2,3,4,5,6,7,8,9]);

    const b = new Float32Array(9);
    b.set([1,2,3,4,5,6,7,8,9]);

    const result = kernel(input(a, [3, 3]), input(b, [3, 3]));
    QUnit.assert.deepEqual(QUnit.extend([], result), [2,4,6,8,10,12,14,16,18]);
  }

  QUnit.test( "input (WebGL Only) (auto)", function() {
    input();
  });

  QUnit.test( "input (WebGL Only) (gpu)", function() {
    input('gpu');
  });

  QUnit.test( "input (WebGL Only) (webgl)", function() {
    input('webgl');
  });

  QUnit.test( "input (WebGL Only) (webgl2)", function() {
    input('webgl2');
  });
})();