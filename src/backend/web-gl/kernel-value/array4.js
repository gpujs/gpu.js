const { WebGLKernelValue } = require('./index');

class WebGLKernelValueArray4 extends WebGLKernelValue {
  constructor(value, settings) {
    super(value, settings);
    this.uploadValue = value;
  }
  getSource(value) {
    if (this.origin === 'constants') {
      return `const vec4 ${this.id} = vec4(${value[0]},${value[1]},${value[2]},${value[3]});\n`;
    }
    return `uniform vec4 ${this.id};\n`;
  }

  getStringValueHandler() {
    // resetting isn't supported for Array(4)
    if (this.origin === 'constants') return '';
    return `const uploadValue_${this.name} = ${this.varName};\n`;
  }

  updateValue(value) {
    if (this.origin === 'constants') return;
    this.kernel.setUniform4fv(this.id, this.uploadValue = value);
  }
}

module.exports = {
  WebGLKernelValueArray4
};