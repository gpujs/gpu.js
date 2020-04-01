const { utils } = require('../utils');
const { Input } = require('../input');

class Kernel {
  /**
   * @type {Boolean}
   */
  static get isSupported() {
    throw new Error(`"isSupported" not implemented on ${ this.name }`);
  }

  /**
   * @abstract
   * @returns {Boolean}
   */
  static isContextMatch(context) {
    throw new Error(`"isContextMatch" not implemented on ${ this.name }`);
  }

  /**
   * @type {IKernelFeatures}
   * Used internally to populate the kernel.feature, which is a getter for the output of this value
   */
  static getFeatures() {
    throw new Error(`"getFeatures" not implemented on ${ this.name }`);
  }

  static destroyContext(context) {
    throw new Error(`"destroyContext" called on ${ this.name }`);
  }

  static nativeFunctionArguments() {
    throw new Error(`"nativeFunctionArguments" called on ${ this.name }`);
  }

  static nativeFunctionReturnType() {
    throw new Error(`"nativeFunctionReturnType" called on ${ this.name }`);
  }

  static combineKernels() {
    throw new Error(`"combineKernels" called on ${ this.name }`);
  }

  /**
   *
   * @param {string|IKernelJSON} source
   * @param [settings]
   */
  constructor(source, settings) {
    if (typeof source !== 'object') {
      if (typeof source !== 'string') {
        throw new Error('source not a string');
      }
      if (!utils.isFunctionString(source)) {
        throw new Error('source not a function string');
      }
    }
    this.useLegacyEncoder = false;
    this.fallbackRequested = false;
    this.onRequestFallback = null;

    /**
     * Name of the arguments found from parsing source argument
     * @type {String[]}
     */
    this.argumentNames = typeof source === 'string' ? utils.getArgumentNamesFromString(source) : null;
    this.argumentTypes = null;
    this.argumentSizes = null;
    this.argumentBitRatios = null;
    this.kernelArguments = null;
    this.kernelConstants = null;
    this.forceUploadKernelConstants = null;


    /**
     * The function source
     * @type {String|IKernelJSON}
     */
    this.source = source;

    /**
     * The size of the kernel's output
     * @type {Number[]}
     */
    this.output = null;

    /**
     * Debug mode
     * @type {Boolean}
     */
    this.debug = false;

    /**
     * Graphical mode
     * @type {Boolean}
     */
    this.graphical = false;

    /**
     * Maximum loops when using argument values to prevent infinity
     * @type {Number}
     */
    this.loopMaxIterations = 0;

    /**
     * Constants used in kernel via `this.constants`
     * @type {Object}
     */
    this.constants = null;

    /**
     *
     * @type {Object.<string, string>}
     */
    this.constantTypes = null;

    /**
     *
     * @type {Object.<string, number>}
     */
    this.constantBitRatios = null;

    /**
     *
     * @type {boolean}
     */
    this.dynamicArguments = false;

    /**
     *
     * @type {boolean}
     */
    this.dynamicOutput = false;

    /**
     *
     * @type {Object}
     */
    this.canvas = null;

    /**
     *
     * @type {Object}
     */
    this.context = null;

    /**
     *
     * @type {Boolean}
     */
    this.checkContext = null;

    /**
     *
     * @type {GPU}
     */
    this.gpu = null;

    /**
     *
     * @type {IGPUFunction[]}
     */
    this.functions = null;

    /**
     *
     * @type {IGPUNativeFunction[]}
     */
    this.nativeFunctions = null;

    /**
     *
     * @type {String}
     */
    this.injectedNative = null;

    /**
     *
     * @type {ISubKernel[]}
     */
    this.subKernels = null;

    /**
     *
     * @type {Boolean}
     */
    this.validate = true;

    /**
     * Enforces kernel to write to a new array or texture on run
     * @type {Boolean}
     */
    this.immutable = false;

    /**
     * Enforces kernel to write to a texture on run
     * @type {Boolean}
     */
    this.pipeline = false;

    /**
     * Make GPU use single precision or unsigned.  Acceptable values: 'single' or 'unsigned'
     * @type {String|null}
     * @enum 'single' | 'unsigned'
     */
    this.precision = null;

    /**
     *
     * @type {String|null}
     * @enum 'speed' | 'balanced' | 'precision'
     */
    this.tactic = null;

    this.plugins = null;

    this.returnType = null;
    this.leadingReturnStatement = null;
    this.followingReturnStatement = null;
    this.optimizeFloatMemory = null;
    this.strictIntegers = false;
    this.fixIntegerDivisionAccuracy = null;
    this.onIstanbulCoverageVariable = null;
    this.removeIstanbulCoverage = false;
    this.built = false;
    this.signature = null;
  }

  /**
   *
   * @param {IDirectKernelSettings|IJSONSettings} settings
   */
  mergeSettings(settings) {
    for (let p in settings) {
      if (!settings.hasOwnProperty(p) || !this.hasOwnProperty(p)) continue;
      switch (p) {
        case 'output':
          if (!Array.isArray(settings.output)) {
            this.setOutput(settings.output); // Flatten output object
            continue;
          }
          break;
        case 'functions':
          this.functions = [];
          for (let i = 0; i < settings.functions.length; i++) {
            this.addFunction(settings.functions[i]);
          }
          continue;
        case 'graphical':
          if (settings[p] && !settings.hasOwnProperty('precision')) {
            this.precision = 'unsigned';
          }
          this[p] = settings[p];
          continue;
        case 'removeIstanbulCoverage':
          if (settings[p] !== null) {
            this[p] = settings[p];
          }
          continue;
        case 'nativeFunctions':
          if (!settings.nativeFunctions) continue;
          this.nativeFunctions = [];
          for (let i = 0; i < settings.nativeFunctions.length; i++) {
            const s = settings.nativeFunctions[i];
            const { name, source } = s;
            this.addNativeFunction(name, source, s);
          }
          continue;
      }
      this[p] = settings[p];
    }

    if (!this.canvas) this.canvas = this.initCanvas();
    if (!this.context) this.context = this.initContext();
    if (!this.plugins) this.plugins = this.initPlugins(settings);
  }
  /**
   * @desc Builds the Kernel, by compiling Fragment and Vertical Shaders,
   * and instantiates the program.
   * @abstract
   */
  build() {
    throw new Error(`"build" not defined on ${ this.constructor.name }`);
  }

  /**
   * @desc Run the kernel program, and send the output to renderOutput
   * <p> This method calls a helper method *renderOutput* to return the result. </p>
   * @returns {Float32Array|Float32Array[]|Float32Array[][]|void} Result The final output of the program, as float, and as Textures for reuse.
   * @abstract
   */
  run() {
    throw new Error(`"run" not defined on ${ this.constructor.name }`)
  }

  /**
   * @abstract
   * @return {Object}
   */
  initCanvas() {
    throw new Error(`"initCanvas" not defined on ${ this.constructor.name }`);
  }

  /**
   * @abstract
   * @return {Object}
   */
  initContext() {
    throw new Error(`"initContext" not defined on ${ this.constructor.name }`);
  }

  /**
   * @param {IDirectKernelSettings} settings
   * @return {string[]};
   * @abstract
   */
  initPlugins(settings) {
    throw new Error(`"initPlugins" not defined on ${ this.constructor.name }`);
  }

  /**
   *
   * @param {KernelFunction|string|IGPUFunction} source
   * @param {IFunctionSettings} [settings]
   * @return {Kernel}
   */
  addFunction(source, settings = {}) {
    if (source.name && source.source && source.argumentTypes && 'returnType' in source) {
      this.functions.push(source);
    } else if ('settings' in source && 'source' in source) {
      this.functions.push(this.functionToIGPUFunction(source.source, source.settings));
    } else if (typeof source === 'string' || typeof source === 'function') {
      this.functions.push(this.functionToIGPUFunction(source, settings));
    } else {
      throw new Error(`function not properly defined`);
    }
    return this;
  }

  /**
   *
   * @param {string} name
   * @param {string} source
   * @param {IGPUFunctionSettings} [settings]
   */
  addNativeFunction(name, source, settings = {}) {
    const { argumentTypes, argumentNames } = settings.argumentTypes ?
      splitArgumentTypes(settings.argumentTypes) :
      this.constructor.nativeFunctionArguments(source) || {};
    this.nativeFunctions.push({
      name,
      source,
      settings,
      argumentTypes,
      argumentNames,
      returnType: settings.returnType || this.constructor.nativeFunctionReturnType(source)
    });
    return this;
  }

  /**
   * @desc Setup the parameter types for the parameters
   * supplied to the Kernel function
   *
   * @param {IArguments} args - The actual parameters sent to the Kernel
   */
  setupArguments(args) {
    this.kernelArguments = [];
    if (!this.argumentTypes) {
      if (!this.argumentTypes) {
        this.argumentTypes = [];
        for (let i = 0; i < args.length; i++) {
          const argType = utils.getVariableType(args[i], this.strictIntegers);
          const type = argType === 'Integer' ? 'Number' : argType;
          this.argumentTypes.push(type);
          this.kernelArguments.push({
            type
          });
        }
      }
    } else {
      for (let i = 0; i < this.argumentTypes.length; i++) {
        this.kernelArguments.push({
          type: this.argumentTypes[i]
        });
      }
    }

    // setup sizes
    this.argumentSizes = new Array(args.length);
    this.argumentBitRatios = new Int32Array(args.length);

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      this.argumentSizes[i] = arg.constructor === Input ? arg.size : null;
      this.argumentBitRatios[i] = this.getBitRatio(arg);
    }

    if (this.argumentNames.length !== args.length) {
      throw new Error(`arguments are miss-aligned`);
    }
  }

  /**
   * Setup constants
   */
  setupConstants() {
    this.kernelConstants = [];
    let needsConstantTypes = this.constantTypes === null;
    if (needsConstantTypes) {
      this.constantTypes = {};
    }
    this.constantBitRatios = {};
    if (this.constants) {
      for (let name in this.constants) {
        if (needsConstantTypes) {
          const type = utils.getVariableType(this.constants[name], this.strictIntegers);
          this.constantTypes[name] = type;
          this.kernelConstants.push({
            name,
            type
          });
        } else {
          this.kernelConstants.push({
            name,
            type: this.constantTypes[name]
          });
        }
        this.constantBitRatios[name] = this.getBitRatio(this.constants[name]);
      }
    }
  }

  /**
   *
   * @param flag
   * @return {this}
   */
  setOptimizeFloatMemory(flag) {
    this.optimizeFloatMemory = flag;
    return this;
  }

  /**
   *
   * @param {Array|Object} output
   * @return {number[]}
   */
  toKernelOutput(output) {
    if (output.hasOwnProperty('x')) {
      if (output.hasOwnProperty('y')) {
        if (output.hasOwnProperty('z')) {
          return [output.x, output.y, output.z];
        } else {
          return [output.x, output.y];
        }
      } else {
        return [output.x];
      }
    } else {
      return output;
    }
  }

  /**
   * @desc Set output dimensions of the kernel function
   * @param {Array|Object} output - The output array to set the kernel output size to
   * @return {this}
   */
  setOutput(output) {
    this.output = this.toKernelOutput(output);
    return this;
  }

  /**
   * @desc Toggle debug mode
   * @param {Boolean} flag - true to enable debug
   * @return {this}
   */
  setDebug(flag) {
    this.debug = flag;
    return this;
  }

  /**
   * @desc Toggle graphical output mode
   * @param {Boolean} flag - true to enable graphical output
   * @return {this}
   */
  setGraphical(flag) {
    this.graphical = flag;
    this.precision = 'unsigned';
    return this;
  }

  /**
   * @desc Set the maximum number of loop iterations
   * @param {number} max - iterations count
   * @return {this}
   */
  setLoopMaxIterations(max) {
    this.loopMaxIterations = max;
    return this;
  }

  /**
   * @desc Set Constants
   * @return {this}
   */
  setConstants(constants) {
    this.constants = constants;
    return this;
  }

  /**
   *
   * @param {IKernelValueTypes} constantTypes
   * @return {this}
   */
  setConstantTypes(constantTypes) {
    this.constantTypes = constantTypes;
    return this;
  }

  /**
   *
   * @param {IFunction[]|KernelFunction[]} functions
   * @return {this}
   */
  setFunctions(functions) {
    for (let i = 0; i < functions.length; i++) {
      this.addFunction(functions[i]);
    }
    return this;
  }

  /**
   *
   * @param {IGPUNativeFunction[]} nativeFunctions
   * @return {this}
   */
  setNativeFunctions(nativeFunctions) {
    for (let i = 0; i < nativeFunctions.length; i++) {
      const settings = nativeFunctions[i];
      const { name, source } = settings;
      this.addNativeFunction(name, source, settings);
    }
    return this;
  }

  /**
   *
   * @param {String} injectedNative
   * @return {this}
   */
  setInjectedNative(injectedNative) {
    this.injectedNative = injectedNative;
    return this;
  }

  /**
   * Set writing to texture on/off
   * @param flag
   * @return {this}
   */
  setPipeline(flag) {
    this.pipeline = flag;
    return this;
  }

  /**
   * Set precision to 'unsigned' or 'single'
   * @param {String} flag 'unsigned' or 'single'
   * @return {this}
   */
  setPrecision(flag) {
    this.precision = flag;
    return this;
  }

  /**
   * @param flag
   * @return {Kernel}
   * @deprecated
   */
  setDimensions(flag) {
    utils.warnDeprecated('method', 'setDimensions', 'setOutput');
    this.output = flag;
    return this;
  }

  /**
   * @param flag
   * @return {this}
   * @deprecated
   */
  setOutputToTexture(flag) {
    utils.warnDeprecated('method', 'setOutputToTexture', 'setPipeline');
    this.pipeline = flag;
    return this;
  }

  /**
   * Set to immutable
   * @param flag
   * @return {this}
   */
  setImmutable(flag) {
    this.immutable = flag;
    return this;
  }

  /**
   * @desc Bind the canvas to kernel
   * @param {Object} canvas
   * @return {this}
   */
  setCanvas(canvas) {
    this.canvas = canvas;
    return this;
  }

  /**
   * @param {Boolean} flag
   * @return {this}
   */
  setStrictIntegers(flag) {
    this.strictIntegers = flag;
    return this;
  }

  /**
   *
   * @param flag
   * @return {this}
   */
  setDynamicOutput(flag) {
    this.dynamicOutput = flag;
    return this;
  }

  /**
   * @deprecated
   * @param flag
   * @return {this}
   */
  setHardcodeConstants(flag) {
    utils.warnDeprecated('method', 'setHardcodeConstants');
    this.setDynamicOutput(flag);
    this.setDynamicArguments(flag);
    return this;
  }

  /**
   *
   * @param flag
   * @return {this}
   */
  setDynamicArguments(flag) {
    this.dynamicArguments = flag;
    return this;
  }

  /**
   * @param {Boolean} flag
   * @return {this}
   */
  setUseLegacyEncoder(flag) {
    this.useLegacyEncoder = flag;
    return this;
  }

  /**
   *
   * @param {Boolean} flag
   * @return {this}
   */
  setWarnVarUsage(flag) {
    utils.warnDeprecated('method', 'setWarnVarUsage');
    return this;
  }

  /**
   * @deprecated
   * @returns {Object}
   */
  getCanvas() {
    utils.warnDeprecated('method', 'getCanvas');
    return this.canvas;
  }

  /**
   * @deprecated
   * @returns {Object}
   */
  getWebGl() {
    utils.warnDeprecated('method', 'getWebGl');
    return this.context;
  }

  /**
   * @desc Bind the webGL instance to kernel
   * @param {WebGLRenderingContext} context - webGl instance to bind
   */
  setContext(context) {
    this.context = context;
    return this;
  }

  /**
   *
   * @param {IKernelValueTypes|GPUVariableType[]} argumentTypes
   * @return {this}
   */
  setArgumentTypes(argumentTypes) {
    if (Array.isArray(argumentTypes)) {
      this.argumentTypes = argumentTypes;
    } else {
      this.argumentTypes = [];
      for (const p in argumentTypes) {
        if (!argumentTypes.hasOwnProperty(p)) continue;
        const argumentIndex = this.argumentNames.indexOf(p);
        if (argumentIndex === -1) throw new Error(`unable to find argument ${ p }`);
        this.argumentTypes[argumentIndex] = argumentTypes[p];
      }
    }
    return this;
  }

  /**
   *
   * @param {Tactic} tactic
   * @return {this}
   */
  setTactic(tactic) {
    this.tactic = tactic;
    return this;
  }

  requestFallback(args) {
    if (!this.onRequestFallback) {
      throw new Error(`"onRequestFallback" not defined on ${ this.constructor.name }`);
    }
    this.fallbackRequested = true;
    return this.onRequestFallback(args);
  }

  /**
   * @desc Validate settings
   * @abstract
   */
  validateSettings() {
    throw new Error(`"validateSettings" not defined on ${ this.constructor.name }`);
  }

  /**
   * @desc Add a sub kernel to the root kernel instance.
   * This is what `createKernelMap` uses.
   *
   * @param {ISubKernel} subKernel - function (as a String) of the subKernel to add
   */
  addSubKernel(subKernel) {
    if (this.subKernels === null) {
      this.subKernels = [];
    }
    if (!subKernel.source) throw new Error('subKernel missing "source" property');
    if (!subKernel.property && isNaN(subKernel.property)) throw new Error('subKernel missing "property" property');
    if (!subKernel.name) throw new Error('subKernel missing "name" property');
    this.subKernels.push(subKernel);
    return this;
  }

  /**
   * @desc Destroys all memory associated with this kernel
   * @param {Boolean} [removeCanvasReferences] remove any associated canvas references
   */
  destroy(removeCanvasReferences) {
    throw new Error(`"destroy" called on ${ this.constructor.name }`);
  }

  /**
   * bit storage ratio of source to target 'buffer', i.e. if 8bit array -> 32bit tex = 4
   * @param value
   * @returns {number}
   */
  getBitRatio(value) {
    if (this.precision === 'single') {
      // 8 and 16 are up-converted to float32
      return 4;
    } else if (Array.isArray(value[0])) {
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
   * @param {Boolean} [flip]
   * @returns {Uint8ClampedArray}
   */
  getPixels(flip) {
    throw new Error(`"getPixels" called on ${ this.constructor.name }`);
  }

  checkOutput() {
    if (!this.output || !utils.isArray(this.output)) throw new Error('kernel.output not an array');
    if (this.output.length < 1) throw new Error('kernel.output is empty, needs at least 1 value');
    for (let i = 0; i < this.output.length; i++) {
      if (isNaN(this.output[i]) || this.output[i] < 1) {
        throw new Error(`${ this.constructor.name }.output[${ i }] incorrectly defined as \`${ this.output[i] }\`, needs to be numeric, and greater than 0`);
      }
    }
  }

  /**
   *
   * @param {String} value
   */
  prependString(value) {
    throw new Error(`"prependString" called on ${ this.constructor.name }`);
  }

  /**
   *
   * @param {String} value
   * @return Boolean
   */
  hasPrependString(value) {
    throw new Error(`"hasPrependString" called on ${ this.constructor.name }`);
  }

  /**
   * @return {IKernelJSON}
   */
  toJSON() {
    return {
      settings: {
        output: this.output,
        pipeline: this.pipeline,
        argumentNames: this.argumentNames,
        argumentsTypes: this.argumentTypes,
        constants: this.constants,
        pluginNames: this.plugins ? this.plugins.map(plugin => plugin.name) : null,
        returnType: this.returnType,
      }
    };
  }

  /**
   * @param {IArguments} args
   */
  buildSignature(args) {
    const Constructor = this.constructor;
    this.signature = Constructor.getSignature(this, Constructor.getArgumentTypes(this, args));
  }

  /**
   * @param {Kernel} kernel
   * @param {IArguments} args
   * @returns GPUVariableType[]
   */
  static getArgumentTypes(kernel, args) {
    const argumentTypes = new Array(args.length);
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const type = kernel.argumentTypes[i];
      if (arg.type) {
        argumentTypes[i] = arg.type;
      } else {
        switch (type) {
          case 'Number':
          case 'Integer':
          case 'Float':
          case 'ArrayTexture(1)':
            argumentTypes[i] = utils.getVariableType(arg);
            break;
          default:
            argumentTypes[i] = type;
        }
      }
    }
    return argumentTypes;
  }

  /**
   *
   * @param {Kernel} kernel
   * @param {GPUVariableType[]} argumentTypes
   * @abstract
   */
  static getSignature(kernel, argumentTypes) {
    throw new Error(`"getSignature" not implemented on ${ this.name }`);
  }

  /**
   *
   * @param {String|Function} source
   * @param {IFunctionSettings} [settings]
   * @returns {IGPUFunction}
   */
  functionToIGPUFunction(source, settings = {}) {
    if (typeof source !== 'string' && typeof source !== 'function') throw new Error('source not a string or function');
    const sourceString = typeof source === 'string' ? source : source.toString();
    let argumentTypes = [];

    if (Array.isArray(settings.argumentTypes)) {
      argumentTypes = settings.argumentTypes;
    } else if (typeof settings.argumentTypes === 'object') {
      argumentTypes = utils.getArgumentNamesFromString(sourceString)
        .map(name => settings.argumentTypes[name]) || [];
    } else {
      argumentTypes = settings.argumentTypes || [];
    }

    return {
      name: utils.getFunctionNameFromString(sourceString) || null,
      source: sourceString,
      argumentTypes,
      returnType: settings.returnType || null,
    };
  }

  /**
   *
   * @param {Kernel} previousKernel
   * @abstract
   */
  onActivate(previousKernel) {}
}

function splitArgumentTypes(argumentTypesObject) {
  const argumentNames = Object.keys(argumentTypesObject);
  const argumentTypes = [];
  for (let i = 0; i < argumentNames.length; i++) {
    const argumentName = argumentNames[i];
    argumentTypes.push(argumentTypesObject[argumentName]);
  }
  return { argumentTypes, argumentNames };
}

module.exports = {
  Kernel
};