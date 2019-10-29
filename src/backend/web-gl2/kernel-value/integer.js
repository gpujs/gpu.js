import { WebGLKernelValueInteger } from '../../web-gl/kernel-value/integer';

export class WebGL2KernelValueInteger extends WebGLKernelValueInteger {
  getSource(value) {
    const variablePrecision = this.getVariablePrecisionString();
    if (this.origin === 'constants') {
      return `const ${ variablePrecision } int ${this.id} = ${ parseInt(value) };\n`;
    }
    return `uniform ${ variablePrecision } int ${this.id};\n`;
  }

  updateValue(value) {
    if (this.origin === 'constants') return;
    this.kernel.setUniform1i(this.id, this.uploadValue = value);
  }
}
