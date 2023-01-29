import { utils } from '../../../utils';
import { GLTextureFloat } from './float';

export class GLTextureMemoryOptimized extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'MemoryOptimizedNumberTexture';
  }
  toArray() {
    return utils.erectMemoryOptimizedFloat(this.renderValues(), this.output[0]);
  }
}
