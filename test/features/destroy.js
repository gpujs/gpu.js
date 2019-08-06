const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');
const sinon = require('sinon');

describe('features: destroy');

function testWithoutDestroyContext(done, mode) {
  const gpu = new GPU({ mode });
  const destroyKernel = sinon.spy();
  gpu.kernels.push({
    kernel: {
      constructor: {
        destroyContext: null
      }
    },
    destroy: destroyKernel
  });
  gpu.destroy();
  gpu.destroy();
  setTimeout(() => {
    assert.equal(destroyKernel.callCount, 2);
    assert.ok(true);
    done();
  }, 2);
}

test('without destroy context', (t) => {
  const done = t.async();
  testWithoutDestroyContext(done);
});

function testWithDestroyContext(done, mode) {
  const gpu = new GPU({ mode });
  const destroyKernel = sinon.spy();
  const destroyContextSpy = sinon.spy();
  gpu.kernels.push({
    kernel: {
      constructor: {
        destroyContext: destroyContextSpy
      }
    },
    destroy: destroyKernel
  });
  gpu.destroy();
  gpu.destroy();
  setTimeout(() => {
    assert.equal(destroyKernel.callCount, 2);
    assert.equal(destroyContextSpy.callCount, 2);
    assert.ok(true);
    done();
  }, 2);
}

test('with destroy context', (t) => {
  const done = t.async();
  testWithDestroyContext(done);
});
