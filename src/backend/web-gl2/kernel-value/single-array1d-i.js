const { utils } = require('../../../utils');
const { WebGLKernelValueSingleArray1DI } = require('../../web-gl/kernel-value/single-array1d-i');

class WebGL2KernelValueSingleArray1DI extends WebGLKernelValueSingleArray1DI {
  updateValue(value) {
    if (value.constructor !== this.initialValueConstructor) {
      this.onUpdateValueMismatch(value.constructor);
      return;
    }
    const { context: gl } = this;
    utils.flattenTo(value, this.uploadValue);
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGL2KernelValueSingleArray1DI
};