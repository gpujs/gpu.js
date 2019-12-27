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
    if (this.texture._refs > 1) {
      this.cloneTexture();
    }
  }

  cloneTexture() {
    this.texture._refs--;
    const { context: gl, size, texture } = this;
    const existingFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    if (!texture._framebuffer) {
      texture._framebuffer = gl.createFramebuffer();
    }
    texture._framebuffer.width = size[0];
    texture._framebuffer.width = size[1];
    gl.bindFramebuffer(gl.FRAMEBUFFER, texture._framebuffer);
    selectTexture(gl, texture);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const target = gl.createTexture();
    selectTexture(gl, target);
    gl.texImage2D(gl.TEXTURE_2D, 0, this.internalFormat, size[0], size[1], 0, this.textureFormat, this.textureType, null);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, size[0], size[1]);
    target._refs = 1;
    target._framebuffer = texture._framebuffer;
    this.texture = target;
    if (existingFramebuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, existingFramebuffer);
    }
  }

  delete() {
    super.delete();
    if (this.texture._refs === 0 && this.texture._framebuffer) {
      this.context.deleteFramebuffer(this.texture._framebuffer);
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