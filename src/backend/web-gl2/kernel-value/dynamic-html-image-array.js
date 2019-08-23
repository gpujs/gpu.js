const { WebGL2KernelValueHtmlImageArray } = require('./html-image-array');

class WebGL2KernelValueDynamicHtmlImageArray extends WebGL2KernelValueHtmlImageArray {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2DArray ${this.id}`,
      `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
      `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
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