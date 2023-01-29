import { utils } from '../../../utils';
import { WebGLKernelValueMemoryOptimizedNumberTexture } from './memory-optimized-number-texture';

export class WebGLKernelValueDynamicMemoryOptimizedNumberTexture extends WebGLKernelValueMemoryOptimizedNumberTexture {
  getSource() {
    return utils.linesToString([`uniform sampler2D ${this.id}`, `uniform ivec2 ${this.sizeId}`, `uniform ivec3 ${this.dimensionsId}`]);
  }

  updateValue(inputTexture) {
    this.dimensions = inputTexture.dimensions;
    this.checkSize(inputTexture.size[0], inputTexture.size[1]);
    this.textureSize = inputTexture.size;
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(inputTexture);
  }
}
