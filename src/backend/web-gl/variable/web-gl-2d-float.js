import Base from './base';

export default class WebGl2DFloat extends Base {
  getLocation() {
    return this.kernel.getUniformLocation(this.name);
  }

  setNativeValue(value) {
    return this.kernel.uniform2fv(this.name, this._value);
  }
}