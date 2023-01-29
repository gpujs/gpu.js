import { utils } from '../../../utils';
import { GLTextureFloat } from './float';

export class GLTextureMemoryOptimized2D extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'MemoryOptimizedNumberTexture';
  }
  toArray() {
    return utils.erectMemoryOptimized2DFloat(
      this.renderValues(),
      this.output[0],
      this.output[1]
    );
  }
}
