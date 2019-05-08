const { utils } = require('../utils');

/**
 * @class KernelValue
 */
class KernelValue {
  /**
   *
   * @param {IKernelArgumentSettings} settings
   */
  constructor(value, settings) {
    const {
      name,
      index,
      kernel,
      context,
      contextHandle,
      origin,
    } = settings;
    if (!name) {
      throw new Error('name not set');
    }
    if (!origin) {
      throw new Error('origin not set');
    }
    if (origin !== 'user' && origin !== 'constants') {
      throw new Error(`origin must be "user" or "constants" value is "${ origin }"`);
    }
    this.name = name;
    this.origin = origin;
    this.id = `${this.origin}_${name}`;
    this.kernel = kernel;
    this.type = utils.getVariableType(value);
    this.size = value.size || null;
    this.index = index;
    this.context = context;
    this.contextHandle = contextHandle;
  }

  getSource() {
    throw new Error(`"getSource" not defined on ${ this.constructor.name }`);
  }

  updateValue(value) {
    throw new Error(`"updateValue" not defined on ${ this.constructor.name }`);
  }
}

module.exports = {
  KernelValue
};