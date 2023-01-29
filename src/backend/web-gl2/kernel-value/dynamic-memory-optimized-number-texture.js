import { utils } from '../../../utils';
import { WebGLKernelValueDynamicMemoryOptimizedNumberTexture } from '../../web-gl/kernel-value/dynamic-memory-optimized-number-texture';

export class WebGL2KernelValueDynamicMemoryOptimizedNumberTexture extends WebGLKernelValueDynamicMemoryOptimizedNumberTexture {
  getSource() {
    return utils.linesToString([`uniform sampler2D ${this.id}`, `uniform ivec2 ${this.sizeId}`, `uniform ivec3 ${this.dimensionsId}`]);
  }
}
