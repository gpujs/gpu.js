import { utils } from '../../../utils';
import { WebGLKernelValueSingleArray3DI } from './single-array3d-i';

export class WebGLKernelValueDynamicSingleArray3DI extends WebGLKernelValueSingleArray3DI {
  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `uniform ivec2 ${this.sizeId}`,
      `uniform ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(value) {
    this.setShape(value);
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(value);
  }
}
