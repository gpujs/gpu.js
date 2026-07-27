const { utils } = require('../../../utils');
const { WebGLKernelArray } = require('./array');

// A <video> reports its presentational width/height attributes here, and those
// are 0 unless the page set them -- the frame's own size is videoWidth and
// videoHeight. The CPU backend has always fallen back this way in
// _mediaTo2DArray, so the two disagreed about the size of every video: this one
// baked ivec2(0, 0) into the shader, and getImage2D then divided by zero and
// sampled arbitrary texels. Constant indices happened to survive it; anything
// computed did not.
function mediaSize(value) {
  return {
    width: value.width > 0 ? value.width : value.videoWidth,
    height: value.height > 0 ? value.height : value.videoHeight,
  };
}

class WebGLKernelValueHTMLImage extends WebGLKernelArray {
  constructor(value, settings) {
    super(value, settings);
    const { width, height } = mediaSize(value);
    this.checkSize(width, height);
    this.dimensions = [width, height, 1];
    this.textureSize = [width, height];
    this.uploadValue = value;
  }

  getStringValueHandler() {
    return `const uploadValue_${this.name} = ${this.varName};\n`;
  }

  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }

  updateValue(inputImage) {
    if (inputImage.constructor !== this.initialValueConstructor) {
      this.onUpdateValueMismatch(inputImage.constructor);
      return;
    }
    const { context: gl } = this;
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.uploadValue = inputImage);
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGLKernelValueHTMLImage,
  mediaSize
};