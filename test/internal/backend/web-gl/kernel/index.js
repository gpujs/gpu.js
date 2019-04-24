const { assert, skip, test, module: describe, only } = require('qunit');
const { WebGLKernel } = require('../../../../../src');

describe('internal: WebGLKernel');

(typeof global !== 'undefined' ? test : skip)('.setupFeatureChecks() if context is available, but .getExtension() is falsey', () => {
  const mockContext = {
    getExtension: null // this is important
  };
  const mockElement = {
    getContext: () => mockContext,
  };
  const mockDocument = {
    createElement: () => {
      return mockElement;
    }
  };
  global.document = mockDocument;

  WebGLKernel.setupFeatureChecks();
  assert.ok(true);

  delete global.document;
});
