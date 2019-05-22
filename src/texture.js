/**
 * @desc WebGl Texture implementation in JS
 * @param {ITextureSettings} settings
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
    } = settings;
    if (!output) throw new Error('settings property "output" required.');
    if (!context) throw new Error('settings property "context" required.');
    this.texture = texture;
    this.size = size;
    this.dimensions = dimensions;
    this.output = output;
    this.context = context;
    this.kernel = null;
    this.type = type;
  }

  /**
   * @desc Converts the Texture into a JavaScript Array
   * @returns {Number[]|Number[][]|Number[][][]}
   */
  toArray() {
    throw new Error(`Not implemented on ${this.constructor.name}`);
  }

  /**
   * @desc Deletes the Texture
   */
  delete() {
    return this.context.deleteTexture(this.texture);
  }
}

module.exports = {
  Texture
};