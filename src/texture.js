/**
 * @desc WebGl Texture implementation in JS
 * @param {IGPUTextureSettings} settings
 */
class Texture {
  constructor(settings) {
    const {
      texture,
      size,
      dimensions,
      output,
      context,
      type = 'NumberTexture',
      kernel,
      internalFormat,
      textureFormat
    } = settings;
    if (!output) throw new Error('settings property "output" required.');
    if (!context) throw new Error('settings property "context" required.');
    this.texture = texture;
    if (texture.refs) {
      texture.refs++;
    } else {
      texture.refs = 1;
    }
    this.size = size;
    this.dimensions = dimensions;
    this.output = output;
    this.context = context;
    /**
     * @type {Kernel}
     */
    this.kernel = kernel;
    this.type = type;
    this._deleted = false;
    this.internalFormat = internalFormat;
    this.textureFormat = textureFormat;
  }

  /**
   * @desc Converts the Texture into a JavaScript Array
   * @returns {TextureArrayOutput}
   */
  toArray() {
    throw new Error(`Not implemented on ${this.constructor.name}`);
  }

  /**
   * @desc Clones the Texture
   * @returns {Texture}
   */
  clone() {
    throw new Error(`Not implemented on ${this.constructor.name}`);
  }

  /**
   * @desc Deletes the Texture
   */
  delete() {
    if (this._deleted) return;
    this._deleted = true;
    if (this.texture.refs) {
      this.texture.refs--;
      if (this.texture.refs) return;
    }
    return this.context.deleteTexture(this.texture);
  }
}

module.exports = {
  Texture
};
