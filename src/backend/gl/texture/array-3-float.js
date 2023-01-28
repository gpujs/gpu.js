import { utils } from '../../../utils';
import { GLTextureFloat } from './float';

export class GLTextureArray3Float extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(3)';
  }
  toArray() {
    return utils.erectArray3(this.renderValues(), this.output[0]);
  }
}
