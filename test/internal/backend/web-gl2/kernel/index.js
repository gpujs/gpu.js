const { assert, skip, test, module: describe, only } = require('qunit');
const { WebGL2Kernel } = require('../../../../../src');

describe('internal: WebGL2Kernel');

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

  WebGL2Kernel.setupFeatureChecks();
  assert.ok(true);

  delete global.document;
});
