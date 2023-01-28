import { utils } from '../../../utils';
import { GLTextureFloat } from './float';

export class GLTextureArray4Float extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(4)';
  }
  toArray() {
    return utils.erectArray4(this.renderValues(), this.output[0]);
  }
}
