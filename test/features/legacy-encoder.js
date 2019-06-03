const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU, HeadlessGLKernel, WebGLKernel, WebGL2Kernel } = require('../../src');

describe('features: legacy encoder');

function testLegacyEncoderOff(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return 1;
  }, { output: [1], precision: 'unsigned' });
  assert.equal(kernel()[0], 1);
  gpu.destroy();
}

test('off auto', () => {
  testLegacyEncoderOff();
});

(GPU.isWebGLSupported ? test : skip)('off webgl', () => {
  testLegacyEncoderOff('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('off webgl2', () => {
  testLegacyEncoderOff('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('off headlessgl', () => {
  testLegacyEncoderOff('headlessgl');
});

test('off cpu', () => {
  testLegacyEncoderOff('cpu');
});

function testLegacyEncoderOn(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function() {
    return 1;
  }, {
    output: [1],
    precision: 'unsigned',
    useLegacyEncoder: true,
  });
  assert.equal(kernel()[0], 1);
  gpu.destroy();
}

test('on auto', () => {
  testLegacyEncoderOn();
});

(GPU.isWebGLSupported ? test : skip)('on webgl', () => {
  testLegacyEncoderOn('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('on webgl2', () => {
  testLegacyEncoderOn('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('on headlessgl', () => {
  testLegacyEncoderOn('headlessgl');
});

test('on cpu', () => {
  testLegacyEncoderOn('cpu');
});

function testSubKernelsLegacyEncoderOff(mode) {
  const gpu = new GPU({ mode });
  function addOne(value) {
    return value + 1;
  }
  const kernel = gpu.createKernelMap([
    addOne,
  ], function() {
    const result = addOne(1);
    return result + 1;
  }, { output: [1], precision: 'unsigned' });
  assert.equal(kernel()[0][0], 2);
  assert.equal(kernel().result[0], 3);
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('subKernels off auto', () => {
  testSubKernelsLegacyEncoderOff();
});

(GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('subKernels off webgl', () => {
  testSubKernelsLegacyEncoderOff('webgl');
});

(GPU.isWebGL2Supported && GPU.isKernelMapSupported ? test : skip)('subKernels off webgl2', () => {
  testSubKernelsLegacyEncoderOff('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('subKernels off headlessgl', () => {
  testSubKernelsLegacyEncoderOff('headlessgl');
});

test('subKernels off cpu', () => {
  testSubKernelsLegacyEncoderOff('cpu');
});

function testSubKernelsLegacyEncoderOn(mode) {
  const gpu = new GPU({ mode });
  function addOne(value) {
    return value + 1;
  }
  const kernel = gpu.createKernelMap([
    addOne,
  ], function() {
    const value = addOne(1);
    return value + 1;
  }, {
    output: [1],
    precision: 'unsigned',
    useLegacyEncoder: true,
  });
  assert.equal(kernel()[0][0], 2);
  assert.equal(kernel().result[0], 3);
  gpu.destroy();
}

(GPU.isKernelMapSupported ? test : skip)('subKernels on auto', () => {
  testSubKernelsLegacyEncoderOn();
});

(GPU.isWebGLSupported && GPU.isKernelMapSupported ? test : skip)('subKernels on webgl', () => {
  testSubKernelsLegacyEncoderOn('webgl');
});

(GPU.isWebGL2Supported && GPU.isKernelMapSupported ? test : skip)('subKernels on webgl2', () => {
  testSubKernelsLegacyEncoderOn('webgl2');
});

(GPU.isHeadlessGLSupported && GPU.isKernelMapSupported ? test : skip)('subKernels on headlessgl', () => {
  testSubKernelsLegacyEncoderOn('headlessgl');
});

test('subKernels on cpu', () => {
  testSubKernelsLegacyEncoderOn('cpu');
});

test('HeadlessGLKernel.getMainResultKernelPackedPixels useLegacyEncoder = false', () => {
  const result = HeadlessGLKernel.prototype.getMainResultKernelPackedPixels.apply({
    useLegacyEncoder: false
  });
  assert.equal(result, `  threadId = indexTo3D(index, uOutputDim);
  kernel();
  gl_FragData[0] = encode32(kernelResult);
`);
});

test('WebGLKernel.getMainResultKernelPackedPixels useLegacyEncoder = false', () => {
  const result = WebGLKernel.prototype.getMainResultKernelPackedPixels.apply({
    useLegacyEncoder: false
  });
  assert.equal(result, `  threadId = indexTo3D(index, uOutputDim);
  kernel();
  gl_FragData[0] = encode32(kernelResult);
`);
});

test('WebGL2Kernel.getMainResultKernelPackedPixels useLegacyEncoder = false', () => {
  const result = WebGL2Kernel.prototype.getMainResultKernelPackedPixels.apply({
    useLegacyEncoder: false
  });
  assert.equal(result, `  threadId = indexTo3D(index, uOutputDim);
  kernel();
  data0 = encode32(kernelResult);
`);
});

test('HeadlessGLKernel.getMainResultKernelPackedPixels useLegacyEncoder = true', () => {
  const result = HeadlessGLKernel.prototype.getMainResultKernelPackedPixels.apply({
    useLegacyEncoder: true
  });
  assert.equal(result, `  threadId = indexTo3D(index, uOutputDim);
  kernel();
  gl_FragData[0] = legacyEncode32(kernelResult);
`);
});

test('WebGLKernel.getMainResultKernelPackedPixels useLegacyEncoder = true', () => {
  const result = WebGLKernel.prototype.getMainResultKernelPackedPixels.apply({
    useLegacyEncoder: true
  });
  assert.equal(result, `  threadId = indexTo3D(index, uOutputDim);
  kernel();
  gl_FragData[0] = legacyEncode32(kernelResult);
`);
});

test('WebGL2Kernel.getMainResultKernelPackedPixels useLegacyEncoder = true', () => {
  const result = WebGL2Kernel.prototype.getMainResultKernelPackedPixels.apply({
    useLegacyEncoder: true
  });
  assert.equal(result, `  threadId = indexTo3D(index, uOutputDim);
  kernel();
  data0 = legacyEncode32(kernelResult);
`);
});

test('HeadlessGLKernel.getMainResultSubKernelPackedPixels useLegacyEncoder = false', () => {
  const result = HeadlessGLKernel.prototype.getMainResultSubKernelPackedPixels.apply({
    useLegacyEncoder: false,
    subKernels: [{
      name: 'subKernel1'
    }]
  });
  assert.equal(result, `  gl_FragData[1] = encode32(subKernelResult_subKernel1);
`);
});

test('WebGLKernel.getMainResultSubKernelPackedPixels useLegacyEncoder = false', () => {
  const result = WebGLKernel.prototype.getMainResultSubKernelPackedPixels.apply({
    useLegacyEncoder: false,
    subKernels: [{
      name: 'subKernel1'
    }]
  });
  assert.equal(result, `  gl_FragData[1] = encode32(subKernelResult_subKernel1);
`);
});

test('WebGL2Kernel.getMainResultSubKernelPackedPixels useLegacyEncoder = false', () => {
  const result = WebGL2Kernel.prototype.getMainResultSubKernelPackedPixels.apply({
    useLegacyEncoder: false,
    subKernels: [{
      name: 'subKernel1'
    }]
  });
  assert.equal(result, `  data1 = encode32(subKernelResult_subKernel1);
`);
});

test('HeadlessGLKernel.getMainResultSubKernelPackedPixels useLegacyEncoder = true', () => {
  const result = HeadlessGLKernel.prototype.getMainResultSubKernelPackedPixels.apply({
    useLegacyEncoder: true,
    subKernels: [{
      name: 'subKernel1'
    }]
  });
  assert.equal(result, `  gl_FragData[1] = legacyEncode32(subKernelResult_subKernel1);
`);
});

test('WebGLKernel.getMainResultSubKernelPackedPixels useLegacyEncoder = true', () => {
  const result = WebGLKernel.prototype.getMainResultSubKernelPackedPixels.apply({
    useLegacyEncoder: true,
    subKernels: [{
      name: 'subKernel1'
    }]
  });
  assert.equal(result, `  gl_FragData[1] = legacyEncode32(subKernelResult_subKernel1);
`);
});

test('WebGL2Kernel.getMainResultSubKernelPackedPixels useLegacyEncoder = true', () => {
  const result = WebGL2Kernel.prototype.getMainResultSubKernelPackedPixels.apply({
    useLegacyEncoder: true,
    subKernels: [{
      name: 'subKernel1'
    }]
  });
  assert.equal(result, `  data1 = legacyEncode32(subKernelResult_subKernel1);
`);
});
