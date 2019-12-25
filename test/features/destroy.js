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
  gpu.destroy()
    .then(() => {
      assert.equal(destroyKernel.callCount, 2);
      assert.ok(true);
      done();
    });
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
  gpu.destroy()
    .then(() => {
      assert.equal(destroyKernel.callCount, 2);
      assert.equal(destroyContextSpy.callCount, 2);
      assert.ok(true);
      done();
    });
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
  GPU.prototype.destroy.call({ kernels: [mockKernelInstance] })
    .then(() => {
      assert.equal(deleteTextureMock.callCount, 3);
      assert.ok(true);
      done();
    });
}

test('textures are destroyed', (t) => {
  const done = t.async();
  testTexturesAreDestroyed(done);
});

function testKernelTextureIsDeleted(done) {
  const webGLTexture = {};
  const mockTextureDelete = sinon.spy();
  const kernelTexture = {
    texture: webGLTexture,
    delete: mockTextureDelete,
  };
  const mockContext = {};
  const mockKernelInstance = {
    texture: kernelTexture,
    textureCache: [],
    context: mockContext,
    destroyExtensions: () => {},
  };
  mockKernelInstance.destroy = WebGLKernel.prototype.destroy.bind(mockKernelInstance);
  GPU.prototype.destroy.call({ kernels: [mockKernelInstance] })
    .then(() => {
      assert.equal(mockTextureDelete.callCount, 1);
      assert.ok(true);
      done();
    });
}

test('kernel.texture is deleted', (t) => {
  const done = t.async();
  testKernelTextureIsDeleted(done);
});

function testKernelMappedTexturesAreDeleted(done) {
  const webGLTexture1 = {};
  const mockTextureDelete1 = sinon.spy();
  const kernelTexture1 = {
    texture: webGLTexture1,
    delete: mockTextureDelete1,
  };
  const webGLTexture2 = {};
  const mockTextureDelete2 = sinon.spy();
  const kernelTexture2 = {
    texture: webGLTexture2,
    delete: mockTextureDelete2,
  };
  const mockContext = {};
  const mockKernelInstance = {
    mappedTextures: [kernelTexture1, kernelTexture2],
    textureCache: [],
    context: mockContext,
    destroyExtensions: () => {},
  };
  mockKernelInstance.destroy = WebGLKernel.prototype.destroy.bind(mockKernelInstance);
  GPU.prototype.destroy.call({ kernels: [mockKernelInstance] })
    .then(() => {
      assert.equal(mockTextureDelete1.callCount, 1);
      assert.equal(mockTextureDelete2.callCount, 1);
      assert.ok(true);
      done();
    });
}

test('kernel.mappedTextures are deleted', (t) => {
  const done = t.async();
  testKernelMappedTexturesAreDeleted(done);
});