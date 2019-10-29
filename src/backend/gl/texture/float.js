import { utils } from '../../../utils';
import { Texture } from '../../../texture';

export class GLTextureFloat extends Texture {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(1)';
  }
  renderRawOutput() {
    const { context: gl } = this;
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.texture,
      0
    );
    const result = new Float32Array(this.size[0] * this.size[1] * 4);
    gl.readPixels(0, 0, this.size[0], this.size[1], gl.RGBA, gl.FLOAT, result);
    return result;
  }
  renderValues() {
    return this.renderRawOutput();
  }
  toArray() {
    return utils.erectFloat(this.renderValues(), this.output[0]);
  }
}
