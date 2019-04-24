const { assert, test, module: describe, only } = require('qunit');

describe('internal: HeadlessGLKernel');

test('.setupFeatureChecks() should not blow up, even if global WebGLRenderingContext is available', () => {
  global.WebGLRenderingContext = {};
  global.document = {
    createElement: () => {
      return {};
    }
  };
  const { HeadlessGLKernel } = require('../../../../src');
  HeadlessGLKernel.setupFeatureChecks();
  assert.ok(true);
  delete global.document;
  delete global.WebGLRenderingContext;
});
