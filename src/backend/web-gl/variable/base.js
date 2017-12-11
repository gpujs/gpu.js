export default class Base {
  constructor(kernel, name) {
    this.kernel = kernel;
    this.location = null;
    this.name = name;
    this._value = null;
  }

  get value() {
    return this._value;
  }

  set value(value) {
    this._value = value;
    this.setNativeValue(value);
  }

  getDeclarationString() {
    throw new Error('getDeclarationString not defined on base variable');
  }

  getLocation() {
    throw new Error('getLocation not defined on base variable');
  }

  setNativeValue(value) {
    throw new Error('setNativeValue not defined on base variable');
  }
}