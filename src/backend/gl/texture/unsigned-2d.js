import { utils } from '../../../utils';
import { GLTextureUnsigned } from './unsigned';

export class GLTextureUnsigned2D extends GLTextureUnsigned {
  constructor(settings) {
    super(settings);
    this.type = 'NumberTexture';
  }
  toArray() {
    return utils.erect2DPackedFloat(this.renderValues(), this.output[0], this.output[1]);
  }
}