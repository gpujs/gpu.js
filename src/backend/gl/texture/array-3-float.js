const { utils } = require('../../../utils');
const { GLTextureFloat } = require('./float');

class GLTextureArray3Float extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(3)';
  }
  toArray() {
    return utils.erectArray3(this.renderValues(), this.output[0]);
  }
}

module.exports = {
  GLTextureArray3Float
};