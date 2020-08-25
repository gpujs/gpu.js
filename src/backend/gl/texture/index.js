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

  /**
   * @returns {Boolean}
   */
  beforeMutate() {
    if (this.texture._refs > 1) {
      this.newTexture();
      return true;
    }
    return false;
  }

  /**
   * @private
   */
  cloneTexture() {
    this.texture._refs--;
    const { context: gl, size, texture, kernel } = this;
    if (kernel.debug) {
      console.warn('cloning internal texture');
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer());
    selectTexture(gl, texture);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const target = gl.createTexture();
    selectTexture(gl, target);
    gl.texImage2D(gl.TEXTURE_2D, 0, this.internalFormat, size[0], size[1], 0, this.textureFormat, this.textureType, null);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, size[0], size[1]);
    target._refs = 1;
    this.texture = target;
  }

  /**
   * @private
   */
  newTexture() {
    this.texture._refs--;
    const gl = this.context;
    const size = this.size;
    const kernel = this.kernel;
    if (kernel.debug) {
      console.warn('new internal texture');
    }
    const target = gl.createTexture();
    selectTexture(gl, target);
    gl.texImage2D(gl.TEXTURE_2D, 0, this.internalFormat, size[0], size[1], 0, this.textureFormat, this.textureType, null);
    target._refs = 1;
    this.texture = target;
  }

  clear() {
    if (this.texture._refs) {
      this.texture._refs--;
      const gl = this.context;
      const target = this.texture = gl.createTexture();
      selectTexture(gl, target);
      const size = this.size;
      target._refs = 1;
      gl.texImage2D(gl.TEXTURE_2D, 0, this.internalFormat, size[0], size[1], 0, this.textureFormat, this.textureType, null);
    }
    const { context: gl, texture } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer());
    gl.bindTexture(gl.TEXTURE_2D, texture);
    selectTexture(gl, texture);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  delete() {
    if (this._deleted) return;
    this._deleted = true;
    if (this.texture._refs) {
      this.texture._refs--;
      if (this.texture._refs) return;
    }
    this.context.deleteTexture(this.texture);
    // TODO: Remove me
    // if (this.texture._refs === 0 && this._framebuffer) {
    //   this.context.deleteFramebuffer(this._framebuffer);
    //   this._framebuffer = null;
    // }
  }

  framebuffer() {
    if (!this._framebuffer) {
      this._framebuffer = this.kernel.getRawValueFramebuffer(this.size[0], this.size[1]);
    }
    return this._framebuffer;
  }
}

function selectTexture(gl, texture) {
  /* Maximum a texture can be, so that collision is highly unlikely
   * basically gl.TEXTURE15 + gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
   * Was gl.TEXTURE31, but safari didn't like it
   * */
  gl.activeTexture(gl.TEXTURE15);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

module.exports = { GLTexture };