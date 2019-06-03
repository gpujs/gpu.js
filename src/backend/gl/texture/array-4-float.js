const { utils } = require('../../../utils');
const { GLTextureFloat } = require('./float');

class GLTextureArray4Float extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(4)';
  }
  toArray() {
    return utils.erectArray4(this.renderValues(), this.output[0]);
  }
}

module.exports = {
  GLTextureArray4Float
};