const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #335');

function missingZIndexIssue(mode) {
  const gpu = new GPU({ mode });

  const kernel = gpu.createKernel(function(value) {
    return value[this.thread.z][this.thread.y][this.thread.x];
  })
    .setOutput([1, 1, undefined]);

  kernel([[[1]]]);
  gpu.destroy();
}

test('Issue #335 Missing z index issue auto', () => {
  assert.throws(() => {
    missingZIndexIssue('auto');
  });
});

test('Issue #335 Missing z index issue gpu', () => {
  assert.throws(() => {
    missingZIndexIssue('gpu');
  });
});

test('Issue #335 Missing z index issue webgl', () => {
  assert.throws(() => {
    missingZIndexIssue('webgl');
  });
});

test('Issue #335 Missing z index issue webgl2', () => {
  assert.throws(() => {
    missingZIndexIssue('webgl2');
  });
});

test('Issue #335 Missing z index issue cpu', () => {
  assert.throws(() => {
    missingZIndexIssue('cpu');
  });
});
