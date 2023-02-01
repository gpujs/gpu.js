import { utils } from '../../../utils';
import { GLTexture } from './index';

export class GLTextureFloat extends GLTexture {
  get textureType() {
    return this.context.FLOAT;
  }
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(1)';
  }
  renderRawOutput() {
    const gl = this.context;
    const size = this.size;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer());
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.texture,
      0
    );
    const result = new Float32Array(size[0] * size[1] * 4);
    gl.readPixels(0, 0, size[0], size[1], gl.RGBA, gl.FLOAT, result);
    return result;
  }
  renderValues() {
    if (this._deleted) return null;
    return this.renderRawOutput();
  }
  toArray() {
    return utils.erectFloat(this.renderValues(), this.output[0]);
  }
}
