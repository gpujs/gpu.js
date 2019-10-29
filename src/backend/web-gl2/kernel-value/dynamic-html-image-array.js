import { WebGL2KernelValueHTMLImageArray } from './html-image-array';

export class WebGL2KernelValueDynamicHTMLImageArray extends WebGL2KernelValueHTMLImageArray {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2DArray ${this.id}`,
      `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
      `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(images) {
    const { width, height } = images[0];
    this.checkSize(width, height);
    this.dimensions = [width, height, images.length];
    this.textureSize = [width, height];
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(images);
  }
}
