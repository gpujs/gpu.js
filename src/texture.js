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
    if (!texture) throw new Error('settings property "texture" required.');
    if (!kernel) throw new Error('settings property "kernel" required.');
    this.texture = texture;
    if (texture._refs) {
      texture._refs++;
    } else {
      texture._refs = 1;
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
    throw new Error(`Not implemented on ${this.constructor.name}`);
  }

  clear() {
    throw new Error(`Not implemented on ${this.constructor.name}`);
  }
}

module.exports = {
  Texture
};