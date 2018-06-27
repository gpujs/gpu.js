(function() {
  function inputX(mode) {
    const gpu = new GPU({ mode: mode });
    const input = GPU.input;
    const kernel = gpu.createKernel(function(a, b) {
      return a[this.thread.x] + b[this.thread.x];
    })
      .setDebug(true)
      .setOutput([9]);

    const a = new Float32Array(9);
    a.set([1,2,3,4,5,6,7,8,9]);

    const b = new Float32Array(9);
    b.set([1,2,3,4,5,6,7,8,9]);

    const result = kernel(input(a, [3, 3]), input(b, [3, 3]));
    QUnit.assert.deepEqual(QUnit.extend([], result), [2,4,6,8,10,12,14,16,18]);
  }

  QUnit.test( "inputX (auto)", function() {
    inputX();
  });

  QUnit.test( "inputX (gpu)", function() {
    inputX('gpu');
  });

  QUnit.test( "inputX (webgl)", function() {
    inputX('webgl');
  });

  QUnit.test( "inputX (webgl2)", function() {
    inputX('webgl2');
  });

  QUnit.test( "inputX (cpu)", function() {
    inputX('cpu');
  });

  function inputXY(mode) {
    const gpu = new GPU({ mode: mode });
    const input = GPU.input;
    const kernel = gpu.createKernel(function(a, b) {
      debugger;
      return a[this.thread.y][this.thread.x] + b[this.thread.y][this.thread.x];
    })
      .setDebug(true)
      .setOutput([9]);

    const a = new Float32Array(9);
    a.set([1,2,3,4,5,6,7,8,9]);

    const b = new Float32Array(9);
    b.set([1,2,3,4,5,6,7,8,9]);

    const result = kernel(input(a, [3, 3]), input(b, [3, 3]));
    QUnit.assert.deepEqual(QUnit.extend([], result), [2,4,6,8,10,12,14,16,18]);
  }

  QUnit.test( "inputXY (auto)", function() {
    inputXY();
  });

  QUnit.test( "inputXY (gpu)", function() {
    inputXY('gpu');
  });

  QUnit.test( "inputXY (webgl)", function() {
    inputXY('webgl');
  });

  QUnit.test( "inputXY (webgl2)", function() {
    inputXY('webgl2');
  });

  QUnit.test( "inputXY (cpu)", function() {
    inputXY('cpu');
  });

  function inputYX(mode) {
    const gpu = new GPU({ mode: mode });
    const input = GPU.input;
    const kernel = gpu.createKernel(function(a, b) {
      return a[this.thread.y][this.thread.x] + b[this.thread.y][this.thread.x];
    })
      .setDebug(true)
      .setOutput([3, 3]);

    const a = new Float32Array(9);
    a.set([1,2,3,4,5,6,7,8,9]);

    const b = new Float32Array(9);
    b.set([1,2,3,4,5,6,7,8,9]);

    const result = kernel(input(a, [3, 3]), input(b, [3, 3]));
    QUnit.assert.deepEqual(QUnit.extend([], result), [[2,4,6],[8,10,12],[14,16,18]]);
  }

  QUnit.test( "inputYX (auto)", function() {
    inputYX();
  });

  QUnit.test( "inputYX (gpu)", function() {
    inputYX('gpu');
  });

  QUnit.test( "inputYX (webgl)", function() {
    inputYX('webgl');
  });

  QUnit.test( "inputYX (webgl2)", function() {
    inputYX('webgl2');
  });

  QUnit.test( "inputYX (cpu)", function() {
    inputYX('cpu');
  });

  function inputYXOffset(mode) {
    const gpu = new GPU({ mode: mode });
    const input = GPU.input;
    const kernel = gpu.createKernel(function(a, b) {
      debugger;
      return a[this.thread.x][this.thread.y] + b[this.thread.x][this.thread.y];
    })
      .setDebug(true)
      .setOutput([2, 8]);

    const a = new Float32Array(16);
    a.set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);

    const b = new Float32Array(16);
    b.set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);

    const result = kernel(input(a, [2, 8]), input(b, [2, 8]));
    QUnit.assert.deepEqual(QUnit.extend([], result), [[2,6],[4,8],[6,10],[8,12],[10,14],[12,16],[14,18],[16,20]]);
  }

  QUnit.test( "inputYXOffset (auto)", function() {
    inputYXOffset();
  });

  QUnit.test( "inputYXOffset (gpu)", function() {
    inputYXOffset('gpu');
  });

  QUnit.test( "inputYXOffset (webgl)", function() {
    inputYXOffset('webgl');
  });

  QUnit.test( "inputYXOffset (webgl2)", function() {
    inputYXOffset('webgl2');
  });

  QUnit.test( "inputYXOffset (cpu)", function() {
    inputYXOffset('cpu');
  });

  function inputYXOffsetPlus1(mode) {
    const gpu = new GPU({ mode: mode });
    const input = GPU.input;
    const kernel = gpu.createKernel(function(a, b) {
      return a[this.thread.x + 1][this.thread.y] + b[this.thread.x + 1][this.thread.y];
    })
      .setDebug(true)
      .setOutput([2, 8]);

    const a = new Float32Array(16);
    a.set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);

    const b = new Float32Array(16);
    b.set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);

    const result = kernel(input(a, [2, 8]), input(b, [2, 8]));
    QUnit.assert.deepEqual(QUnit.extend([], result), [[6,10],[8,12],[10,14],[12,16],[14,18],[16,20],[18,22],[20,24]]);
  }

  QUnit.test( "inputYXOffsetPlus1 (auto)", function() {
    inputYXOffsetPlus1();
  });

  QUnit.test( "inputYXOffsetPlus1 (gpu)", function() {
    inputYXOffsetPlus1('gpu');
  });

  QUnit.test( "inputYXOffsetPlus1 (webgl)", function() {
    inputYXOffsetPlus1('webgl');
  });

  QUnit.test( "inputYXOffsetPlus1 (webgl2)", function() {
    inputYXOffsetPlus1('webgl2');
  });

  QUnit.test( "inputYXOffsetPlus1 (cpu)", function() {
    inputYXOffsetPlus1('cpu');
  });

  function inputZYX(mode) {
    const gpu = new GPU({ mode: mode });
    const input = GPU.input;
    const kernel = gpu.createKernel(function(a, b) {
      return a[this.thread.z][this.thread.y][this.thread.x] + b[this.thread.z][this.thread.y][this.thread.x];
    })
      .setDebug(true)
      .setOutput([2, 4, 4]);

    const a = new Float32Array(64);
    a.set([
      1,2,
      3,4,
      5,6,
      7,8,

      9,10,
      11,12,
      13,14,
      15,16,

      17,18,
      19,20,
      21,22,
      23,24,

      25,26,
      27,28,
      29,30,
      31,32
    ]);

    const b = new Float32Array(64);
    b.set([
      32,31,
      30,29,
      28,27,
      26,25,

      24,23,
      22,21,
      20,19,
      18,17,

      16,15,
      14,13,
      12,11,
      10,9,

      8,7,
      6,5,
      4,3,
      2,1
    ]);

    const result = kernel(input(a, [2, 4, 4]), input(b, [2, 4, 4]));
    QUnit.assert.deepEqual(QUnit.extend([], result), [[[33,33],[33,33],[33,33],[33,33]],[[33,33],[33,33],[33,33],[33,33]],[[33,33],[33,33],[33,33],[33,33]],[[33,33],[33,33],[33,33],[33,33]]]);
  }

  QUnit.test( "inputZYX (auto)", function() {
    inputZYX();
  });

  QUnit.test( "inputZYX (gpu)", function() {
    inputZYX('gpu');
  });

  QUnit.test( "inputZYX (webgl)", function() {
    inputZYX('webgl');
  });

  QUnit.test( "inputZYX (webgl2)", function() {
    inputZYX('webgl2');
  });

  QUnit.test( "inputZYX (cpu)", function() {
    inputZYX('cpu');
  });
})();