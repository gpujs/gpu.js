const { utils } = require('../../../utils');
const { GLTextureFloat } = require('./float');

class GLTextureArray2Float2D extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(2)';
  }
  toArray() {
    return utils.erect2DArray2(this.renderValues(), this.output[0], this.output[1]);
  }
}

module.exports = {
  GLTextureArray2Float2D
};