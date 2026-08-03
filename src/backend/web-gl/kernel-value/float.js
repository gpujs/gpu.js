const { utils } = require('../../../utils');
const { WebGLKernelValue } = require('./index');

class WebGLKernelValueFloat extends WebGLKernelValue {
  constructor(value, settings) {
    super(value, settings);
    this.uploadValue = value;
  }
  getStringValueHandler() {
    return `const uploadValue_${this.name} = ${this.varName};\n`;
  }
  getSource(value) {
    if (this.origin === 'constants') {
      if (Number.isInteger(value)) {
        return `const float ${this.id} = ${utils.glslFloatLiteral(value)};\n`;
      }
      return `const float ${this.id} = ${value};\n`;
    }
    return `uniform float ${this.id};\n`;
  }

  updateValue(value) {
    if (this.origin === 'constants') return;
    this.kernel.setUniform1f(this.id, this.uploadValue = value);
  }
}

module.exports = {
  WebGLKernelValueFloat
};