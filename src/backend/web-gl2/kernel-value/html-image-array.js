const { utils } = require('../../../utils');
const { WebGLKernelValue } = require('../../web-gl/kernel-value/index');

class WebGL2KernelValueHTMLImageArray extends WebGLKernelValue {
  constructor(value, settings) {
    super(value, settings);
    this.checkSize(value[0].width, value[0].height);
    this.requestTexture();
    this.dimensions = [value[0].width, value[0].height, value.length];
    this.textureSize = [value[0].width, value[0].height];
  }
  getStringValueHandler() {
    return `const uploadValue_${this.name} = ${this.varName};\n`;
  }
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2DArray ${this.id}`,
      `${ variablePrecision } ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `${ variablePrecision } ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }

  updateValue(images) {
    const { context: gl } = this;
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.texture);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    // Upload the images into the texture.
    gl.texImage3D(
      gl.TEXTURE_2D_ARRAY,
      0,
      gl.RGBA,
      images[0].width,
      images[0].height,
      images.length,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    for (let i = 0; i < images.length; i++) {
      const xOffset = 0;
      const yOffset = 0;
      const imageDepth = 1;
      gl.texSubImage3D(
        gl.TEXTURE_2D_ARRAY,
        0,
        xOffset,
        yOffset,
        i,
        images[i].width,
        images[i].height,
        imageDepth,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        this.uploadValue = images[i]
      );
    }
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGL2KernelValueHTMLImageArray
};