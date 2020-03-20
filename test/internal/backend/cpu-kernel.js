const sinon = require('sinon');
const { assert, skip, test, module: describe, only } = require('qunit');
const { CPUKernel } = require('../../../src');

describe('internal: CPUKernel');

test('.build() checks if already built, and returns early if true', () => {
  const mockContext = {
    built: true,
    setupConstants: sinon.spy(),
  };
  CPUKernel.prototype.build.apply(mockContext);
  assert.equal(mockContext.setupConstants.callCount, 0);
});