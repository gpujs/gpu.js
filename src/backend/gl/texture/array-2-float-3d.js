const { utils } = require('../../../utils');
const { GLTextureFloat } = require('./float');

class GLTextureArray2Float3D extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(2)';
  }
  toArray() {
    return utils.erect3DArray2(this.renderValues(), this.output[0], this.output[1], this.output[2]);
  }
}

module.exports = {
  GLTextureArray2Float3D
};