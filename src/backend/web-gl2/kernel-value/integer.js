const { utils } = require('../../../utils');
const { WebGLKernelValueInteger } = require('../../web-gl/kernel-value/integer');

class WebGL2KernelValueInteger extends WebGLKernelValueInteger {
  getSource(value) {
    if (this.origin === 'constants') {
      return `const highp int ${this.id} = ${ parseInt(value) };\n`;
    }
    return `uniform highp int ${this.id};\n`;
  }

  updateValue(value) {
    if (this.origin === 'constants') return;
    this.kernel.setUniform1i(this.id, this.uploadValue = value);
  }
}

module.exports = {
  WebGL2KernelValueInteger
};