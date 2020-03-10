const { utils } = require('../../../utils');
const { KernelValue } = require('../../kernel-value');

class WebGLKernelValue extends KernelValue {
  /**
   * @param {KernelVariable} value
   * @param {IWebGLKernelValueSettings} settings
   */
  constructor(value, settings) {
    super(value, settings);
    this.dimensionsId = null;
    this.sizeId = null;
    this.initialValueConstructor = value.constructor;
    this.onRequestTexture = settings.onRequestTexture;
    this.onRequestIndex = settings.onRequestIndex;
    this.uploadValue = null;
    this.textureSize = null;
    this.bitRatio = null;
    this.prevArg = null;
  }

  get id() {
    return `${this.origin}_${utils.sanitizeName(this.name)}`;
  }

  setup() {}

  getTransferArrayType(value) {
    if (Array.isArray(value[0])) {
      return this.getTransferArrayType(value[0]);
    }
    switch (value.constructor) {
      case Array:
      case Int32Array:
      case Int16Array:
      case Int8Array:
        return Float32Array;
      case Uint8ClampedArray:
      case Uint8Array:
      case Uint16Array:
      case Uint32Array:
      case Float32Array:
      case Float64Array:
        return value.constructor;
    }
    console.warn('Unfamiliar constructor type.  Will go ahead and use, but likley this may result in a transfer of zeros');
    return value.constructor;
  }

  /**
   * Used for when we want a string output of our kernel, so we can still input values to the kernel
   */
  getStringValueHandler() {
    throw new Error(`"getStringValueHandler" not implemented on ${this.constructor.name}`);
  }

  getVariablePrecisionString() {
    return this.kernel.getVariablePrecisionString(this.textureSize || undefined, this.tactic || undefined);
  }

  destroy() {}
}

module.exports = {
  WebGLKernelValue
};