const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('internal: boolean');

function booleanLiteral(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    const v = true === true;
    if (v) {
      return 1;
    }
    return 0;
  }, {
    output: [1],
  });
  const result = kernel();
  assert.ok(result[0]);
  gpu.destroy();
}

test('boolean literal auto', () => {
  booleanLiteral();
});

test('boolean literal gpu', () => {
  booleanLiteral('gpu');
});

(GPU.isWebGLSupported ? test : skip)('boolean literal webgl', () => {
  booleanLiteral('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('boolean literal webgl2', () => {
  booleanLiteral('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('boolean literal headlessgl', () => {
  booleanLiteral('headlessgl');
});

test('boolean literal cpu', () => {
  booleanLiteral('cpu');
});


function booleanArgumentTrue(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v) {
    if (v) {
      return 1;
    }
    return 0;
  }, {
    output: [1],
  });
  const result = kernel(true);
  assert.ok(result[0]);
  gpu.destroy();
}

test('boolean argument true auto', () => {
  booleanArgumentTrue();
});

test('boolean argument true gpu', () => {
  booleanArgumentTrue('gpu');
});

(GPU.isWebGLSupported ? test : skip)('boolean argument true webgl', () => {
  booleanArgumentTrue('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('boolean argument true webgl2', () => {
  booleanArgumentTrue('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('boolean argument true headlessgl', () => {
  booleanArgumentTrue('headlessgl');
});

test('boolean argument true cpu', () => {
  booleanArgumentTrue('cpu');
});


function booleanArgumentFalse(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v) {
    if (v) {
      return 1;
    }
    return 0;
  }, {
    output: [1],
  });
  const result = kernel(false);
  assert.notOk(result[0]);
  gpu.destroy();
}

test('boolean argument false auto', () => {
  booleanArgumentFalse();
});

test('boolean argument false gpu', () => {
  booleanArgumentFalse('gpu');
});

(GPU.isWebGLSupported ? test : skip)('boolean argument false webgl', () => {
  booleanArgumentFalse('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('boolean argument false webgl2', () => {
  booleanArgumentFalse('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('boolean argument false headlessgl', () => {
  booleanArgumentFalse('headlessgl');
});

test('boolean argument false cpu', () => {
  booleanArgumentFalse('cpu');
});


function booleanVariableTrue(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    const v = true;
    if (v) {
      return 1;
    }
    return 0;
  }, {
    output: [1],
  });
  const result = kernel();
  assert.ok(result[0]);
  gpu.destroy();
}

test('boolean variable true auto', () => {
  booleanVariableTrue();
});

test('boolean variable true gpu', () => {
  booleanVariableTrue('gpu');
});

(GPU.isWebGLSupported ? test : skip)('boolean variable true webgl', () => {
  booleanVariableTrue('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('boolean variable true webgl2', () => {
  booleanVariableTrue('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('boolean variable true headlessgl', () => {
  booleanVariableTrue('headlessgl');
});

test('boolean variable true cpu', () => {
  booleanVariableTrue('cpu');
});

function booleanVariableFalse(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    const v = false;
    if (v) {
      return 1;
    }
    return 0;
  }, {
    output: [1],
  });
  const result = kernel();
  assert.notOk(result[0]);
  gpu.destroy();
}

test('boolean variable false auto', () => {
  booleanVariableFalse();
});

test('boolean variable false gpu', () => {
  booleanVariableFalse('gpu');
});

(GPU.isWebGLSupported ? test : skip)('boolean variable false webgl', () => {
  booleanVariableFalse('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('boolean variable false webgl2', () => {
  booleanVariableFalse('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('boolean variable false headlessgl', () => {
  booleanVariableFalse('headlessgl');
});

test('boolean variable false cpu', () => {
  booleanVariableFalse('cpu');
});

function booleanExpressionTrue(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    const v = 1 > 0;
    if (v) {
      return 1;
    }
    return 0;
  }, {
    output: [1],
  });
  const result = kernel();
  assert.ok(result[0]);
  gpu.destroy();
}

test('boolean expression true auto', () => {
  booleanExpressionTrue();
});

test('boolean expression true gpu', () => {
  booleanExpressionTrue('gpu');
});

(GPU.isWebGLSupported ? test : skip)('boolean expression true webgl', () => {
  booleanExpressionTrue('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('boolean expression true webgl2', () => {
  booleanExpressionTrue('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('boolean expression true headlessgl', () => {
  booleanExpressionTrue('headlessgl');
});

test('boolean expression true cpu', () => {
  booleanExpressionTrue('cpu');
});


function booleanExpressionFalse(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    const v = 1 < 0;
    if (v) {
      return 1;
    }
    return 0;
  }, {
    output: [1],
  });
  const result = kernel();
  assert.notOk(result[0]);
  gpu.destroy();
}

test('boolean expression false auto', () => {
  booleanExpressionFalse();
});

test('boolean expression false gpu', () => {
  booleanExpressionFalse('gpu');
});

(GPU.isWebGLSupported ? test : skip)('boolean expression false webgl', () => {
  booleanExpressionFalse('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('boolean expression false webgl2', () => {
  booleanExpressionFalse('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('boolean expression false headlessgl', () => {
  booleanExpressionFalse('headlessgl');
});

test('boolean expression false cpu', () => {
  booleanExpressionFalse('cpu');
});
