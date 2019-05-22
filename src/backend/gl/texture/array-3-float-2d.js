const { utils } = require('../../../utils');
const { GLTextureFloat } = require('./float');

class GLTextureArray3Float2D extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(3)';
  }
  toArray() {
    return utils.erect2DArray3(this.renderValues(), this.output[0], this.output[1]);
  }
}

module.exports = {
  GLTextureArray3Float2D
};