import Base from './base';

export default class WebGlNumber extends Base {
  getDeclarationString() {
    return `uint ${this.name} = 0;`;
  }

  setLocation() {
    debugger;
    this.location = this.kernel.getUniformLocation(this.name);
  }

  setNativeValue(value) {
    return this.kernel.uniform1i(this.name, this._value);
  }
}