import { GLTextureUnsigned } from './unsigned';

export class GLTextureGraphical extends GLTextureUnsigned {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(4)';
  }
  toArray() {
    return this.renderValues();
  }
}
