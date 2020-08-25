const { utils } = require('../../../utils');
const { GLTexture } = require('./index');

class GLTextureUnsigned extends GLTexture {
  get textureType() {
    return this.context.UNSIGNED_BYTE;
  }
  constructor(settings) {
    super(settings);
    this.type = 'NumberTexture';
  }
  renderRawOutput() {
    const { context: gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer());
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.texture,
      0
    );
    const result = new Uint8Array(this.size[0] * this.size[1] * 4);
    gl.readPixels(0, 0, this.size[0], this.size[1], gl.RGBA, gl.UNSIGNED_BYTE, result);
    return result;
  }
  renderValues() {
    if (this._deleted) return null;
    return new Float32Array(this.renderRawOutput().buffer);
  }
  toArray() {
    return utils.erectPackedFloat(this.renderValues(), this.output[0]);
  }
}

module.exports = {
  GLTextureUnsigned
};