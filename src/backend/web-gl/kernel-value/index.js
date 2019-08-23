const { utils } = require('../../../utils');
const { Input } = require('../../../input');
const { KernelValue } = require('../../kernel-value');

class WebGLKernelValue extends KernelValue {
  /**
   *
   * @param {IWebGLKernerlValueSettings} settings
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
  }

  requestTexture() {
    this.texture = this.onRequestTexture();
    this.setupTexture();
  }

  setupTexture() {
    this.contextHandle = this.onRequestContextHandle();
    this.index = this.onRequestIndex();
    this.dimensionsId = this.id + 'Dim';
    this.sizeId = this.id + 'Size';
  }

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
   * @desc Adds kernel parameters to the Value Texture,
   * binding it to the context, etc.
   *
   * @param {Array|Float32Array|Uint16Array} value - The actual Value supplied to the kernel
   * @param {Number} length - the expected total length of the output array
   * @param {Object} [Type]
   * @returns {Float32Array|Uint16Array|Uint8Array} flattened array to transfer
   */
  formatArrayTransfer(value, length, Type) {
    if (utils.isArray(value[0]) || this.optimizeFloatMemory) {
      // not already flat
      const valuesFlat = new Float32Array(length);
      utils.flattenTo(value, valuesFlat);
      return valuesFlat;
    } else {
      switch (value.constructor) {
        case Uint8ClampedArray:
        case Uint8Array:
        case Int8Array:
        case Uint16Array:
        case Int16Array:
        case Float32Array:
        case Int32Array: {
          const valuesFlat = new(Type || value.constructor)(length);
          utils.flattenTo(value, valuesFlat);
          return valuesFlat;
        }
        default: {
          const valuesFlat = new Float32Array(length);
          utils.flattenTo(value, valuesFlat);
          return valuesFlat;
        }
      }
    }
  }

  /**
   * bit storage ratio of source to target 'buffer', i.e. if 8bit array -> 32bit tex = 4
   * @param value
   * @returns {number}
   */
  getBitRatio(value) {
    if (Array.isArray(value[0])) {
      return this.getBitRatio(value[0]);
    } else if (value.constructor === Input) {
      return this.getBitRatio(value.value);
    }
    switch (value.constructor) {
      case Uint8ClampedArray:
      case Uint8Array:
      case Int8Array:
        return 1;
      case Uint16Array:
      case Int16Array:
        return 2;
      case Float32Array:
      case Int32Array:
      default:
        return 4;
    }
  }

  /**
   * Used for when we want a string output of our kernel, so we can still input values to the kernel
   */
  getStringValueHandler() {
    throw new Error(`"getStringValueHandler" not implemented on ${this.constructor.name}`);
  }

  getVariablePrecisionString() {
    switch (this.tactic) {
      case 'speed':
        return 'lowp';
      case 'performance':
        return 'highp';
      case 'balanced':
      default:
        return 'mediump';
    }
  }
}

module.exports = {
  WebGLKernelValue
};