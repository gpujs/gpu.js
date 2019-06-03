const { assert, test, module: describe, only, skip } = require('qunit');

describe('internal: HeadlessGLKernel');

(typeof global !== 'undefined' ? test : skip)('.setupFeatureChecks() should not blow up, even if global WebGLRenderingContext is available', () => {
  global.WebGLRenderingContext = {};
  global.document = {
    createElement: () => {
      return {};
    }
  };
  // this is done late on purpose!  Do not change this, as it causes HeadlessGL to initialize with certain values
const { HeadlessGLKernel } = require('../../../../../src');
  HeadlessGLKernel.setupFeatureChecks();
  assert.ok(true);
  delete global.document;
  delete global.WebGLRenderingContext;
});
