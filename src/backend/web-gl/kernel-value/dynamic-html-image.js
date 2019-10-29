import { utils } from '../../../utils';
import { WebGLKernelValueHTMLImage } from './html-image';

export class WebGLKernelValueDynamicHTMLImage extends WebGLKernelValueHTMLImage {
  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `uniform ivec2 ${this.sizeId}`,
      `uniform ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(value) {
    const { width, height } = value;
    this.checkSize(width, height);
    this.dimensions = [width, height, 1];
    this.textureSize = [width, height];
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(value);
  }
}
