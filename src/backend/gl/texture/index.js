const { Texture } = require('../../../texture');

/**
 * @class
 * @property framebuffer
 * @extends Texture
 */
class GLTexture extends Texture {
  /**
   * @returns {Number}
   * @abstract
   */
  get textureType() {
    throw new Error(`"textureType" not implemented on ${ this.name }`);
  }

  clone() {
    return new this.constructor(this);
  }

  beforeMutate() {
    if (this.texture.refs > 1) {
      this.cloneTexture();
    }
  }

  cloneTexture() {
    this.texture.refs--;
    const { context: gl, size, texture } = this;
    const existingFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    const existingActiveTexture = gl.getParameter(gl.ACTIVE_TEXTURE);
    const existingTexture2DBinding = gl.getParameter(gl.TEXTURE_BINDING_2D);
    if (!this.framebuffer) {
      this.framebuffer = gl.createFramebuffer();
    }
    this.framebuffer.width = size[0];
    this.framebuffer.height = size[1];
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    selectTexture(gl, texture);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const target = gl.createTexture();
    selectTexture(gl, target);
    gl.texImage2D(gl.TEXTURE_2D, 0, this.internalFormat, size[0], size[1], 0, this.textureFormat, this.textureType, null);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, size[0], size[1]);
    target.refs = 1;
    this.texture = target;
    if (existingFramebuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, existingFramebuffer);
    }
    if (existingActiveTexture) {
      gl.activeTexture(existingActiveTexture);
    }
    if (existingTexture2DBinding) {
      gl.bindTexture(gl.TEXTURE_2D, existingTexture2DBinding);
    }
  }

  delete() {
    super.delete();
    if (this.framebuffer) {
      this.context.deleteFramebuffer(this.framebuffer);
    }
  }
}

function selectTexture(gl, texture) {
  gl.activeTexture(gl.TEXTURE31); // Maximum a texture can be, so that collision is highly unlikely
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

module.exports = { GLTexture };