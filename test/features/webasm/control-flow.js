const { assert, test, module: describe } = require('qunit');
const { GPU } = require('../../../src');

describe('features: webasm control flow');

// Every shape here runs against mode 'cpu' on the same source and inputs —
// the cpu backend is the reference for correctness.
function compare(assert, source, output, settings, args) {
  const webasm = new GPU({ mode: 'webasm' });
  const cpu = new GPU({ mode: 'cpu' });
  const expected = cpu.createKernel(source, Object.assign({ output }, settings)).apply(null, args || []);
  const actual = webasm.createKernel(source, Object.assign({ output }, settings)).apply(null, args || []);
  assert.deepEqual(Array.from(actual), Array.from(expected));
  webasm.destroy();
  cpu.destroy();
}

test('if / else webasm', assert => {
  assert.expect(1);
  compare(assert, function(a) {
    if (a[this.thread.x] > 2) {
      return a[this.thread.x] * 10;
    } else {
      return a[this.thread.x] - 1;
    }
  }, [6], {}, [[1, 2, 3, 4, 5, 6]]);
});

test('ternary webasm', assert => {
  assert.expect(1);
  compare(assert, function(a) {
    return a[this.thread.x] % 2 === 0 ? a[this.thread.x] / 2 : a[this.thread.x] * 3 + 1;
  }, [8], {}, [[1, 2, 3, 4, 5, 6, 7, 8]]);
});

test('fixed-trip for loop webasm', assert => {
  assert.expect(1);
  compare(assert, function(a, b) {
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += a[i] * b[i];
    }
    return sum + this.thread.x;
  }, [4], {}, [[1, 2, 3, 4, 5, 6, 7, 8], [8, 7, 6, 5, 4, 3, 2, 1]]);
});

test('argument-dependent trip count webasm', assert => {
  assert.expect(1);
  compare(assert, function(a) {
    let sum = 0;
    for (let i = 0; i < a[this.thread.x]; i++) {
      sum += i + 1;
    }
    return sum;
  }, [5], {}, [[0, 1, 3, 5, 7]]);
});

test('break and continue webasm', assert => {
  assert.expect(1);
  compare(assert, function(limit) {
    let sum = 0;
    for (let i = 0; i < 32; i++) {
      if (i > limit + this.thread.x) {
        break;
      }
      if (i % 3 === 0) {
        continue;
      }
      sum += i;
    }
    return sum;
  }, [6], {}, [7]);
});

test('early return webasm', assert => {
  assert.expect(1);
  compare(assert, function(a) {
    if (a[this.thread.x] < 0) {
      return -1;
    }
    let value = a[this.thread.x];
    for (let i = 0; i < 3; i++) {
      value = value * 2;
    }
    return value;
  }, [6], {}, [[3, -5, 2, -1, 0, 7]]);
});

test('nested if in loop webasm', assert => {
  assert.expect(1);
  compare(assert, function(a) {
    let count = 0;
    for (let i = 0; i < 16; i++) {
      if (a[i] > 4) {
        if (a[i] < 12) {
          count += 2;
        } else {
          count += 1;
        }
      }
    }
    return count + this.thread.x;
  }, [4], {}, [[1, 5, 13, 7, 2, 11, 15, 4, 9, 3, 14, 6, 8, 10, 12, 0]]);
});

test('while loop webasm', assert => {
  assert.expect(1);
  compare(assert, function(a) {
    let n = a[this.thread.x];
    let steps = 0;
    while (n > 1) {
      n = n / 2;
      steps++;
    }
    return steps;
  }, [4], {}, [[16, 8, 5, 1]]);
});

test('helper function via addFunction webasm', assert => {
  assert.expect(1);
  function square(x) {
    return x * x;
  }
  const webasm = new GPU({ mode: 'webasm' });
  const cpu = new GPU({ mode: 'cpu' });
  webasm.addFunction(square);
  cpu.addFunction(square);
  const source = function(a) {
    return square(a[this.thread.x]) + square(2);
  };
  const expected = cpu.createKernel(source, { output: [4] })([1, 2, 3, 4]);
  const actual = webasm.createKernel(source, { output: [4] })([1, 2, 3, 4]);
  assert.deepEqual(Array.from(actual), Array.from(expected));
  webasm.destroy();
  cpu.destroy();
});

test('modulo stays float like the GL backends webasm', assert => {
  assert.expect(1);
  compare(assert, function(a) {
    return a[this.thread.x] % 2.5;
  }, [4], {}, [[5, 6.25, -3, 7.5]]);
});

// Three shapes where the cpu backend disagrees with plain JavaScript (the
// review caught cpu returning wrong numbers on all three) -- so these compare
// against a per-cell PLAIN JS reference, never against mode: 'cpu'.

test('early return inside a loop matches plain JavaScript', () => {
  const source = function (x) {
    for (let i = 0; i < 20; i++) {
      if (i * i > x) {
        return i * 100 + x;
      }
    }
    return -1;
  };
  const expected = [0, 1, 2, 3, 4, 5].map(x => source(x));
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function () {
    for (let i = 0; i < 20; i++) {
      if (i * i > this.thread.x) {
        return i * 100 + this.thread.x;
      }
    }
    return -1;
  }, { output: [6], loopMaxIterations: 30 });
  assert.deepEqual(Array.from(kernel()), expected);
  gpu.destroy();
});

test('do-while with continue matches plain JavaScript', () => {
  const reference = (() => {
    let i = 0;
    let acc = 0;
    do {
      i++;
      if (i % 3 === 0) continue;
      acc += i;
    } while (i < 12);
    return acc;
  })();
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function () {
    let i = 0;
    let acc = 0;
    do {
      i++;
      if (i % 3 === 0) continue;
      acc += i;
    } while (i < 12);
    return acc;
  }, { output: [4], loopMaxIterations: 30 });
  assert.deepEqual(Array.from(kernel()), [reference, reference, reference, reference]);
  gpu.destroy();
});

test('assigning to a scalar argument stays per-cell, like plain JavaScript', () => {
  const gpu = new GPU({ mode: 'webasm' });
  const kernel = gpu.createKernel(function (base) {
    base = base + this.thread.x;
    return base;
  }, { output: [4] });
  assert.deepEqual(Array.from(kernel(10)), [10, 11, 12, 13], 'a fresh binding per cell');
  gpu.destroy();
});
