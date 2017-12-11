import Base from './base';

export default class WebGl4DFloat extends Base {
  getLocation() {
    return this.kernel.getUniformLocation(this.name);
  }

  setNativeValue(value) {
    return this.kernel.uniform4fv(this.name, this._value);
  }
}