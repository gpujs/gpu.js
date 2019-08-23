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
      kernel,
      context,
      checkContext,
      onRequestContextHandle,
      onUpdateValueMismatch,
      origin,
      strictIntegers,
      type,
      tactic,
    } = settings;
    if (!name) {
      throw new Error('name not set');
    }
    if (!type) {
      throw new Error('type not set');
    }
    if (!origin) {
      throw new Error('origin not set');
    }
    if (!tactic) {
      throw new Error('tactic not set');
    }
    if (origin !== 'user' && origin !== 'constants') {
      throw new Error(`origin must be "user" or "constants" value is "${ origin }"`);
    }
    if (!onRequestContextHandle) {
      throw new Error('onRequestContextHandle is not set');
    }
    this.name = name;
    this.origin = origin;
    this.tactic = tactic;
    this.id = `${this.origin}_${name}`;
    this.varName = origin === 'constants' ? `constants.${name}` : name;
    this.kernel = kernel;
    this.strictIntegers = strictIntegers;
    // handle textures
    this.type = value.type || type;
    this.size = value.size || null;
    this.index = null;
    this.context = context;
    this.checkContext = checkContext !== null && checkContext !== undefined ? checkContext : true;
    this.contextHandle = null;
    this.onRequestContextHandle = onRequestContextHandle;
    this.onUpdateValueMismatch = onUpdateValueMismatch;
  }

  getSource() {
    throw new Error(`"getSource" not defined on ${ this.constructor.name }`);
  }

  updateValue(value) {
    throw new Error(`"updateValue" not defined on ${ this.constructor.name }`);
  }

  getFocusString() {
    throw new Error(`"getFocusString" not defined on ${ this.constructor.name }`);
  }
}

module.exports = {
  KernelValue
};