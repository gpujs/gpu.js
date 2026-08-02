const { WebGLKernelValue } = require('./index');
const { Input } = require('../../../input');

/**
 * @abstract
 */
class WebGLKernelArray extends WebGLKernelValue {
  /**
   *
   * @param {number} width
   * @param {number} height
   */
  /**
   * Puts this value's texture back on its unit. Texture units are context
   * state shared by every kernel, and each kernel numbers its own from zero,
   * so between runs another kernel's textures sit on them (#862). The data
   * in this texture is intact -- only the binding needs to come back.
   */
  rebind() {
    if (!this.texture || this.contextHandle === undefined || this.contextHandle === null) return;
    const { context: gl } = this;
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
  }

  checkSize(width, height) {
    if (!this.kernel.validate) return;
    const { maxTextureSize } = this.kernel.constructor.features;
    if (width > maxTextureSize || height > maxTextureSize) {
      if (width > height) {
        throw new Error(`Argument texture width of ${width} larger than maximum size of ${maxTextureSize} for your GPU`);
      } else if (width < height) {
        throw new Error(`Argument texture height of ${height} larger than maximum size of ${maxTextureSize} for your GPU`);
      } else {
        throw new Error(`Argument texture height and width of ${height} larger than maximum size of ${maxTextureSize} for your GPU`);
      }
    }
  }

  setup() {
    this.requestTexture();
    this.setupTexture();
    this.defineTexture();
  }

  requestTexture() {
    this.texture = this.onRequestTexture();
  }

  defineTexture() {
    const { context: gl } = this;
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }

  setupTexture() {
    this.contextHandle = this.onRequestContextHandle();
    this.index = this.onRequestIndex();
    this.dimensionsId = this.id + 'Dim';
    this.sizeId = this.id + 'Size';
  }

  /**
   * bit storage ratio of source to target 'buffer', i.e. if 8bit array -> 32bit tex = 4
   * @param value
   * @returns {number}
   */
  getBitRatio(value) {
    if (Array.isArray(value[0])) {
      return this.getBitRatio(value[0]);
    } else if (value.constructor === Input) {
      return this.getBitRatio(value.value);
    }
    switch (value.constructor) {
      case Uint8ClampedArray:
      case Uint8Array:
        return 1;
      case Uint16Array:
        return 2;
        // signed arrays transfer as Float32Array (see getTransferArrayType),
        // since the unsigned decode cannot represent negative values, so they
        // occupy 4 bytes per element like Float32Array (#701)
      case Int8Array:
      case Int16Array:
      case Float32Array:
      case Int32Array:
      default:
        return 4;
    }
  }

  destroy() {
    if (this.prevArg) {
      this.prevArg.delete();
    }
    this.context.deleteTexture(this.texture);
  }
}

module.exports = {
  WebGLKernelArray
};