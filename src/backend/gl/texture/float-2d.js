const { utils } = require('../../../utils');
const { GLTextureFloat } = require('./float');

class GLTextureFloat2D extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(1)';
  }
  toArray() {
    return utils.erect2DFloat(this.renderValues(), this.output[0], this.output[1]);
  }
}

module.exports = {
  GLTextureFloat2D
};