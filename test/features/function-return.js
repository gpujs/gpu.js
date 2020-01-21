const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('features: function return');

function functionReturnFloat( mode ) {
  const gpu = new GPU({ mode });
  const f = gpu.createKernel(function() {
    return 42;
  }, {
    output : [1]
  });
  assert.equal(f()[0], 42);
  gpu.destroy();
}

test('float auto', () => {
  functionReturnFloat(null);
});

test('float gpu', () => {
  functionReturnFloat('gpu');
});

(GPU.isWebGLSupported ? test : skip)('float webgl', () => {
  functionReturnFloat('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('float webgl2', () => {
  functionReturnFloat('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('float headlessgl', () => {
  functionReturnFloat('headlessgl');
});

test('float cpu', () => {
  functionReturnFloat('cpu');
});


function functionReturnArray2( mode ) {
  const gpu = new GPU({ mode });
  const f = gpu.createKernel(function() {
    return [42, 43];
  }, {
    output : [1]
  });
  const result = f();
  assert.equal(result[0].constructor, Float32Array);
  assert.equal(result[0][0], 42);
  assert.equal(result[0][1], 43);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('Array(2) auto', () => {
  functionReturnArray2(null);
});

(GPU.isSinglePrecisionSupported ? test : skip)('Array(2) gpu', () => {
  functionReturnArray2('gpu');
});

(GPU.isWebGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('Array(2) webgl', () => {
  functionReturnArray2('webgl');
});

(GPU.isWebGL2Supported && GPU.isSinglePrecisionSupported ? test : skip)('Array(2) webgl2', () => {
  functionReturnArray2('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('Array(2) headlessgl', () => {
  functionReturnArray2('headlessgl');
});

test('Array(2) cpu', () => {
  functionReturnArray2('cpu');
});

function functionReturnArray3( mode ) {
  const gpu = new GPU({ mode });
  const f = gpu.createKernel(function() {
    return [42, 43, 44];
  }, {
    output : [1]
  });
  const result = f();
  assert.equal(result[0].constructor, Float32Array);
  assert.equal(result[0][0], 42);
  assert.equal(result[0][1], 43);
  assert.equal(result[0][2], 44);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('Array(3) auto', () => {
  functionReturnArray3(null);
});

(GPU.isSinglePrecisionSupported ? test : skip)('Array(3) gpu', () => {
  functionReturnArray3('gpu');
});

(GPU.isWebGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('Array(3) webgl', () => {
  functionReturnArray3('webgl');
});

(GPU.isWebGL2Supported && GPU.isSinglePrecisionSupported ? test : skip)('Array(3) webgl2', () => {
  functionReturnArray3('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('Array(3) headlessgl', () => {
  functionReturnArray3('headlessgl');
});

test('Array(3) cpu', () => {
  functionReturnArray3('cpu');
});


function functionReturnArray4( mode ) {
  const gpu = new GPU({ mode });
  const f = gpu.createKernel(function() {
    return [42, 43, 44, 45];
  }, {
    output : [1]
  });

  const result = f();
  assert.equal(result[0].constructor, Float32Array);
  assert.equal(result[0][0], 42);
  assert.equal(result[0][1], 43);
  assert.equal(result[0][2], 44);
  assert.equal(result[0][3], 45);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('Array(4) auto', () => {
  functionReturnArray4(null);
});

(GPU.isSinglePrecisionSupported ? test : skip)('Array(4) gpu', () => {
  functionReturnArray4('gpu');
});

(GPU.isWebGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('Array(4) webgl', () => {
  functionReturnArray4('webgl');
});

(GPU.isWebGL2Supported && GPU.isSinglePrecisionSupported ? test : skip)('Array(4) webgl2', () => {
  functionReturnArray4('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isSinglePrecisionSupported ? test : skip)('Array(4) headlessgl', () => {
  functionReturnArray4('headlessgl');
});

test('Array(4) cpu', () => {
  functionReturnArray4('cpu');
});

function functionReturnArray4MemberExpression(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(value) {
    let pixel = toIntArray4(value[this.thread.y][this.thread.x]);
    return pixel;
    function toIntArray4(pixel) {
      return [pixel[0] * 255, pixel[1] * 255, pixel[2] * 255, pixel[3] * 255];
    }
  }, {
    output: [1, 1],
    argumentTypes: { value: 'Array2D(4)' },
  });
  const result = kernel([[[1,1,1,1]]]);
  assert.deepEqual(Array.from(result[0][0]), [255,255,255,255]);
  gpu.destroy();
}

test('auto', () => {
  functionReturnArray4MemberExpression();
});

test('gpu', () => {
  functionReturnArray4MemberExpression('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  functionReturnArray4MemberExpression('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  functionReturnArray4MemberExpression('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  functionReturnArray4MemberExpression('headlessgl');
});

test('cpu', () => {
  functionReturnArray4MemberExpression('cpu');
});