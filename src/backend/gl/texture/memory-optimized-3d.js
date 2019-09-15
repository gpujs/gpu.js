import { utils } from '../../../utils';
import { GLTextureFloat } from './float';

export class GLTextureMemoryOptimized3D extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'MemoryOptimizedNumberTexture';
  }
  toArray() {
    return utils.erectMemoryOptimized3DFloat(this.renderValues(), this.output[0], this.output[1], this.output[2]);
  }
}
