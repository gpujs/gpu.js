import { utils } from '../../../utils';
import { GLTextureFloat } from './float';

export class GLTextureArray4Float2D extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(4)';
  }
  toArray() {
    return utils.erect2DArray4(this.renderValues(), this.output[0], this.output[1]);
  }
}
