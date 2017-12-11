import Base from './base';

export default class WebGlFloat extends Base {
  getLocation() {
    return this.kernel.getUniformLocation(this.name);
  }

  setNativeValue(value) {
    return this.kernel.uniform1f(this.name, this._value);
  }
}