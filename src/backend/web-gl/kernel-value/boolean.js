const { utils } = require('../../../utils');
const { WebGLKernelValue } = require('./index');

class WebGLKernelValueBoolean extends WebGLKernelValue {
  getSource(value) {
    if (this.origin === 'constants') {
      return `const bool ${this.id} = ${value};\n`;
    }
    return `uniform int ${this.id};\n`;
  }

  updateValue(value) {
    if (this.origin === 'constants') return;
    this.kernel.setUniform1i(this.id, value ? 1 : 0);
  }
}

module.exports = {
  WebGLKernelValueBoolean
};