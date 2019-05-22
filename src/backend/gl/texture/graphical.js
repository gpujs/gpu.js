const { GLTextureUnsigned } = require('./unsigned');

class GLTextureGraphical extends GLTextureUnsigned {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(4)';
  }
  toArray() {
    return this.renderValues();
  }
}

module.exports = {
  GLTextureGraphical
};