import { utils } from '../../../utils';
import { GLTextureFloat } from './float';

export class GLTextureArray2Float extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(2)';
  }
  toArray() {
    return utils.erectArray2(
      this.renderValues(),
      this.output[0],
      this.output[1]
    );
  }
}
