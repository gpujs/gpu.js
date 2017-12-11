import Base from './base';

export default class WebGl3DFloat extends Base {
  getLocation() {
    return this.kernel.getUniformLocation(this.name);
  }

  setNativeValue(value) {
    return this.kernel.uniform3fv(this.name, this._value);
  }
}