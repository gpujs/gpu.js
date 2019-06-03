const { WebGL2KernelValueHtmlImageArray } = require('./html-image-array');

class WebGL2KernelValueDynamicHtmlImageArray extends WebGL2KernelValueHtmlImageArray {
  getSource() {
    return utils.linesToString([
      `uniform highp sampler2DArray ${this.id}`,
      `uniform highp ivec2 ${this.sizeId}`,
      `uniform highp ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(images) {
    this.dimensions = [images[0].width, images[0].height, images.length];
    this.textureSize = [images[0].width, images[0].height];
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(images);
  }
}

module.exports = {
  WebGL2KernelValueDynamicHtmlImageArray
};