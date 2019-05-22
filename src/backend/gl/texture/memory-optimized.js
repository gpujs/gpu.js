const { utils } = require('../../../utils');
const { GLTextureFloat } = require('./float');

class GLTextureMemoryOptimized extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'MemoryOptimizedNumberTexture';
  }
  toArray() {
    return utils.erectMemoryOptimizedFloat(this.renderValues(), this.output[0]);
  }
}

module.exports = {
  GLTextureMemoryOptimized
};