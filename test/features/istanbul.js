const sinon = require('sinon');
const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: onIstanbulCoverageVariable');

const g = typeof window === 'undefined' ? global : window;

function testOnIstanbulCoverageVariable(mode) {
  const onIstanbulCoverageVariableSpy = sinon.stub().returns('');
  const gpu = new GPU({
    mode,
    onIstanbulCoverageVariable: onIstanbulCoverageVariableSpy
  });
  try {
    const kernel = gpu.createKernel(`function() {
    mockGlobalValue.f[100]++;
    mockGlobalValue.f[101][100]++;
    return 1;
  }`, {output: [1]});

    kernel();
    assert.equal(onIstanbulCoverageVariableSpy.args[0][0], 'mockGlobalValue');
    assert.equal(onIstanbulCoverageVariableSpy.args[0][1], kernel.kernel);
    assert.equal(g.mockGlobalValue.f[100], 1);
    assert.equal(g.mockGlobalValue.f[101][100], 1);
    gpu.destroy();
  }
  catch(e) {
    gpu.destroy();
    throw e;
  }
}

function beforeEach() {
  g.mockGlobalValue = {
    f: {
      100: 0,
      101: {
        100: 0
      }
    }
  };
}
function afterEach() {
  delete g.mockGlobalValue;
}

test('gpu', () => {
  beforeEach();
  assert.throws(() => {
    testOnIstanbulCoverageVariable('gpu');
  }, new Error('Unexpected expression on line 4, position 3:\n mockGlobalValue.f[100]'));
  afterEach();
});
test('cpu', () => {
  beforeEach();
  testOnIstanbulCoverageVariable('cpu');
  afterEach();
});


describe('features: removeIstanbulCoverage');

function testRemoveIstanbulCoverage(mode) {
  const gpu = new GPU({
    mode,
    removeIstanbulCoverage: true
  });
  const kernel = gpu.createKernel(`function() {
    mockGlobalValue.f[100]++;
    mockGlobalValue.f[101][100]++;
    return 1;
  }`, { output: [1] });
  assert.deepEqual(kernel(), new Float32Array([1]));
}

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  testRemoveIstanbulCoverage('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  testRemoveIstanbulCoverage('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testRemoveIstanbulCoverage('headlessgl');
});

test('cpu', () => {
  testRemoveIstanbulCoverage('cpu');
});

describe('features: removeIstanbulCoverage sequence');

function testRemoveIstanbulCoverageSequence(mode) {
  const gpu = new GPU({
    mode,
    removeIstanbulCoverage: true
  });
  const kernel = gpu.createKernel(`function() {
    return (mockGlobalValue.f[100]++, 1);
  }`, { output: [1] });
  assert.deepEqual(kernel(), new Float32Array([1]));
}

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  testRemoveIstanbulCoverageSequence('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  testRemoveIstanbulCoverageSequence('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  testRemoveIstanbulCoverageSequence('headlessgl');
});

test('cpu', () => {
  testRemoveIstanbulCoverageSequence('cpu');
});

describe('features: istanbul function prepend');

function testFunctionPrepend(mode) {
  const gpu = new GPU({
    mode,
    onIstanbulCoverageVariable: (name, kernel) => {
      const string1 = 'const mockGlobalValue = {f:{100:0}};\n';
      if (!kernel.hasPrependString(string1)) {
        kernel.prependString(string1);
      }

      const string2 = '__coverage__();\n';
      if (!kernel.hasPrependString(string2)) {
        kernel.prependString(string2);
      }
    }
  });
  const kernel = gpu.createKernel(`function() {
    mockGlobalValue.f[100]++;
    return (mockGlobalValue.f[100]++, 1);
  }`, { output: [1] });
  assert.deepEqual(kernel(), new Float32Array([1]));
  assert.throws(() => {
    kernel.prependString('null');
  }, new Error('Kernel already built'));
  gpu.destroy();
}

test('cpu', () => {
  g.__coverage__ = sinon.spy();
  testFunctionPrepend('cpu');
  assert.equal(g.__coverage__.callCount, 1);
  delete g.__coverage__;
});

