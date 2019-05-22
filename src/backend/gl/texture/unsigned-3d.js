const { utils } = require('../../../utils');
const { GLTextureUnsigned } = require('./unsigned');

class GLTextureUnsigned3D extends GLTextureUnsigned {
  constructor(settings) {
    super(settings);
    this.type = 'NumberTexture';
  }
  toArray() {
    return utils.erect3DPackedFloat(this.renderValues(), this.output[0], this.output[1], this.output[2]);
  }
}

module.exports = {
  GLTextureUnsigned3D
};