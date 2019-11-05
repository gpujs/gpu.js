const { assert, skip, test, module: describe } = require('qunit');
const { GPU, WebGLKernel } = require('../../src');
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


function testTexturesAreDestroyed(done, mode) {
  const mockTexture1 = {};
  const mockTexture2 = {};
  const mockTexture3 = {};
  const deleteTextureMock = sinon.spy();
  const mockContext = {
    deleteTexture: deleteTextureMock,
  };
  const mockKernelInstance = {
    textureCache: [mockTexture1, mockTexture2, mockTexture3],
    context: mockContext,
    destroyExtensions: () => {},
  };
  mockKernelInstance.destroy = WebGLKernel.prototype.destroy.bind(mockKernelInstance);
  GPU.prototype.destroy.call({ kernels: [mockKernelInstance] });
  setTimeout(() => {
    assert.equal(deleteTextureMock.callCount, 3);
    assert.ok(true);
    done();
  }, 2);
}

test('textures are destroyed', (t) => {
  const done = t.async();
  testTexturesAreDestroyed(done);
});
