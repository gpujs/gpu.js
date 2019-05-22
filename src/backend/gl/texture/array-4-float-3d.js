const { utils } = require('../../../utils');
const { GLTextureFloat } = require('./float');

class GLTextureArray4Float3D extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(4)';
  }
  toArray() {
    return utils.erect3DArray4(this.renderValues(), this.output[0], this.output[1], this.output[2]);
  }
}

module.exports = {
  GLTextureArray4Float3D
};