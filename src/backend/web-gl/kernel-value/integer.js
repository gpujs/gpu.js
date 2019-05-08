const { utils } = require('../../../utils');
const { WebGLKernelValue } = require('./index');

class WebGLKernelValueInteger extends WebGLKernelValue {
  getSource(value) {
    if (this.origin === 'constants') {
      return `const int ${this.id} = ${ parseInt(value) };\n`;
    }
    return `uniform int ${this.id};\n`;
  }

  updateValue(value) {
    if (this.origin === 'constants') return;
    this.kernel.setUniform1i(this.id, value);
  }
}

module.exports = {
  WebGLKernelValueInteger
};