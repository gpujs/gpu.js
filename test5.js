const GPU = require('./src/index');

const fs = require('fs');

function textureConstantTest(mode) {
  var gpu = new GPU({ mode: mode });
  var createTexture = gpu
    .createKernel(function() {
      return 1; // input
    })
    .setOutput([2])
    .setOutputToTexture(true);

  var tryConst = gpu
    .createKernel(function(input) {
      return input[this.thread.x];
    })
    .setOutput([2]);

  var result = tryConst(createTexture());

  fs.writeFileSync('create-texture.js', `'use strict';
const createTexture = ${ createTexture.toString() }
module.exports = createTexture;
`);
  fs.writeFileSync('read-texture.js', `'use strict';
const readTexture = ${ tryConst.toString() }

function isCompatible() {
  try {
    require('gl');
    return true;
  } catch (e) {
    return false;
  }
}
function getGl() {
  const gl = require('gl')(2, 2, { preserveDrawingBuffer: true });
  gl.getExtension('STACKGL_resize_drawingbuffer');
  gl.getExtension('STACKGL_destroy_context');
  
  // Get the extension that is needed
  gl.OES_texture_float = gl.getExtension('OES_texture_float');
  gl.OES_texture_float_linear = gl.getExtension('OES_texture_float_linear');
  gl.OES_element_index_uint = gl.getExtension('OES_element_index_uint');
  return gl;
}

if (!isCompatible()) {
  throw new Error('not compatible');
}

const gl1 = getGl();
const gl2 = getGl();
const Texture = require('./src/index').Texture;
const inputKernel = require('./create-texture.js')();
const outputKernel = readTexture();
  
inputKernel
  .setTexture(Texture)
  .setWebGl(gl1)
  .setCanvas({});

outputKernel
  .setTexture(Texture)
  .setWebGl(gl2)
  .setCanvas({});

console.log(outputKernel(inputKernel()));
`);

  var expected = new Float32Array([1, 1]);
  console.log(result);
  // QUnit.assert.deepEqual(result, expected, 'texture constant passed test');
  gpu.destroy();
}
textureConstantTest('gpu');
