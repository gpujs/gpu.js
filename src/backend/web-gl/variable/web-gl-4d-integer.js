import Base from './base';

export default class WebGlNumber extends Base {
  getLocation() {
    return this.kernel.getUniformLocation(this.name);
  }

  setNativeValue(value) {
    return this.kernel.uniform4i(this.name, this._value[0], this._value[1], this._value[2], this._value[3]);
  }
}