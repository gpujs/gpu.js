const { utils } = require('../../../utils');
const { WebGLKernelValue } = require('./index');

class WebGLKernelValueSingleArray2 extends WebGLKernelValue {
  constructor(value, settings) {
    super(value, settings);
    this.uploadValue = value;
  }
  getSource(value) {
    if (this.origin === 'constants') {
      return `const vec2 ${this.id} = vec2(${value[0]},${value[1]});\n`;
    }
    return `uniform vec2 ${this.id};\n`;
  }

  getStringValueHandler() {
    return `const uploadValue_${this.name} = ${this.varName};\n`;
  }

  updateValue(value) {
    if (this.origin === 'constants') return;
    this.kernel.setUniform2fv(this.id, this.uploadValue = value);
  }
}

module.exports = {
  WebGLKernelValueSingleArray2
};