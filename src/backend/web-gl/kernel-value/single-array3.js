const { utils } = require('../../../utils');
const { WebGLKernelValue } = require('./index');

class WebGLKernelValueSingleArray3 extends WebGLKernelValue {
  constructor(value, settings) {
    super(value, settings);
    this.uploadValue = value;
  }
  getSource(value) {
    if (this.origin === 'constants') {
      return `const vec3 ${this.id} = vec3(${value[0]},${value[1]},${value[2]});\n`;
    }
    return `uniform vec3 ${this.id};\n`;
  }

  getStringValueHandler() {
    return `const uploadValue_${this.name} = ${this.varName};\n`;
  }

  updateValue(value) {
    if (this.origin === 'constants') return;
    this.kernel.setUniform3fv(this.id, this.uploadValue = value);
  }
}

module.exports = {
  WebGLKernelValueSingleArray3
};