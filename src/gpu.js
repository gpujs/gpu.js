const { gpuMock } = require('gpu-mock.js');
const { utils } = require('./utils');
const { CPUKernel } = require('./backend/cpu/kernel');
const { HeadlessGLKernel } = require('./backend/headless-gl/kernel');
const { WebGL2Kernel } = require('./backend/web-gl2/kernel');
const { WebGLKernel } = require('./backend/web-gl/kernel');
const { kernelRunShortcut } = require('./kernel-run-shortcut');


/**
 *
 * @type {Kernel[]}
 */
const kernelOrder = [HeadlessGLKernel, WebGL2Kernel, WebGLKernel];

/**
 *
 * @type {string[]}
 */
const kernelTypes = ['gpu', 'cpu'];

const internalKernels = {
  'headlessgl': HeadlessGLKernel,
  'webgl2': WebGL2Kernel,
  'webgl': WebGLKernel,
};

let validate = true;

/**
 * The GPU.js library class which manages the GPU context for the creating kernels
 */
class GPU {
  static disableValidation() {
    validate = false;
  }

  static enableValidation() {
    validate = true;
  }

  static get isGPUSupported() {
    return kernelOrder.some(Kernel => Kernel.isSupported);
  }

  /**
   *
   * @returns {boolean}
   */
  static get isKernelMapSupported() {
    return kernelOrder.some(Kernel => Kernel.isSupported && Kernel.features.kernelMap);
  }

  /**
   * @desc TRUE is platform supports OffscreenCanvas
   */
  static get isOffscreenCanvasSupported() {
    return (typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined') || typeof importScripts !== 'undefined';
  }

  /**
   * @desc TRUE if platform supports WebGL
   */
  static get isWebGLSupported() {
    return WebGLKernel.isSupported;
  }

  /**
   * @desc TRUE if platform supports WebGL2
   */
  static get isWebGL2Supported() {
    return WebGL2Kernel.isSupported;
  }

  /**
   * @desc TRUE if platform supports HeadlessGL
   */
  static get isHeadlessGLSupported() {
    return HeadlessGLKernel.isSupported;
  }

  /**
   *
   * @desc TRUE if platform supports Canvas
   */
  static get isCanvasSupported() {
    return typeof HTMLCanvasElement !== 'undefined';
  }

  /**
   * @desc TRUE if platform supports HTMLImageArray}
   */
  static get isGPUHTMLImageArraySupported() {
    return WebGL2Kernel.isSupported;
  }

  /**
   * @desc TRUE if platform supports single precision}
   * @returns {boolean}
   */
  static get isSinglePrecisionSupported() {
    return kernelOrder.some(Kernel => Kernel.isSupported && Kernel.features.isFloatRead && Kernel.features.isTextureFloat);
  }

  /**
   * Creates an instance of GPU.
   * @param {IGPUSettings} [settings] - Settings to set mode, and other properties
   */
  constructor(settings) {
    settings = settings || {};
    this.canvas = settings.canvas || null;
    this.context = settings.context || null;
    this.mode = settings.mode;
    this.Kernel = null;
    this.kernels = [];
    this.functions = [];
    this.nativeFunctions = [];
    this.injectedNative = null;
    if (this.mode === 'dev') return;
    this.chooseKernel();
    // add functions from settings
    if (settings.functions) {
      for (let i = 0; i < settings.functions.length; i++) {
        this.addFunction(settings.functions[i]);
      }
    }

    // add native functions from settings
    if (settings.nativeFunctions) {
      for (const p in settings.nativeFunctions) {
        if (!settings.nativeFunctions.hasOwnProperty(p)) continue;
        this.addNativeFunction(p, settings.nativeFunctions[p]);
      }
    }
  }

  /**
   * Choose kernel type and save on .Kernel property of GPU
   */
  chooseKernel() {
    if (this.Kernel) return;

    let Kernel = null;

    if (this.context) {
      for (let i = 0; i < kernelOrder.length; i++) {
        const ExternalKernel = kernelOrder[i];
        if (ExternalKernel.isContextMatch(this.context)) {
          if (!ExternalKernel.isSupported) {
            throw new Error(`Kernel type ${ExternalKernel.name} not supported`);
          }
          Kernel = ExternalKernel;
          break;
        }
      }
      if (Kernel === null) {
        throw new Error('unknown Context');
      }
    } else if (this.mode) {
      if (this.mode in internalKernels) {
        if (!validate || internalKernels[this.mode].isSupported) {
          Kernel = internalKernels[this.mode];
        }
      } else if (this.mode === 'gpu') {
        for (let i = 0; i < kernelOrder.length; i++) {
          if (kernelOrder[i].isSupported) {
            Kernel = kernelOrder[i];
            break;
          }
        }
      } else if (this.mode === 'cpu') {
        Kernel = CPUKernel;
      }
      if (!Kernel) {
        throw new Error(`A requested mode of "${this.mode}" and is not supported`);
      }
    } else {
      for (let i = 0; i < kernelOrder.length; i++) {
        if (kernelOrder[i].isSupported) {
          Kernel = kernelOrder[i];
          break;
        }
      }
      if (!Kernel) {
        Kernel = CPUKernel;
      }
    }

    if (!this.mode) {
      this.mode = Kernel.mode;
    }
    this.Kernel = Kernel;
  }

  /**
   * @desc This creates a callable function object to call the kernel function with the argument parameter set
   * @param {Function|String|object} source - The calling to perform the conversion
   * @param {IGPUKernelSettings} [settings] - The parameter configuration object
   * @return {Kernel} callable function to run
   */
  createKernel(source, settings) {
    if (typeof source === 'undefined') {
      throw new Error('Missing source parameter');
    }
    if (typeof source !== 'object' && !utils.isFunction(source) && typeof source !== 'string') {
      throw new Error('source parameter not a function');
    }

    if (this.mode === 'dev') {
      const devKernel = gpuMock(source, upgradeDeprecatedCreateKernelSettings(settings));
      this.kernels.push(devKernel);
      return devKernel;
    }

    source = typeof source === 'function' ? source.toString() : source;
    const switchableKernels = {};
    const settingsCopy = upgradeDeprecatedCreateKernelSettings(settings) || {};
    // handle conversion of argumentTypes
    if (settings && typeof settings.argumentTypes === 'object') {
      settingsCopy.argumentTypes = Object.keys(settings.argumentTypes).map(argumentName => settings.argumentTypes[argumentName]);
    }

    function onRequestFallback(args) {
      const fallbackKernel = new CPUKernel(source, {
        argumentTypes: kernelRun.argumentTypes,
        constantTypes: kernelRun.constantTypes,
        graphical: kernelRun.graphical,
        loopMaxIterations: kernelRun.loopMaxIterations,
        constants: kernelRun.constants,
        dynamicOutput: kernelRun.dynamicOutput,
        dynamicArgument: kernelRun.dynamicArguments,
        output: kernelRun.output,
        precision: kernelRun.precision,
        pipeline: kernelRun.pipeline,
        immutable: kernelRun.immutable,
        optimizeFloatMemory: kernelRun.optimizeFloatMemory,
        fixIntegerDivisionAccuracy: kernelRun.fixIntegerDivisionAccuracy,
        functions: kernelRun.functions,
        nativeFunctions: kernelRun.nativeFunctions,
        injectedNative: kernelRun.injectedNative,
        subKernels: kernelRun.subKernels,
        strictIntegers: kernelRun.strictIntegers,
        debug: kernelRun.debug,
        warnVarUsage: kernelRun.warnVarUsage,
      });
      fallbackKernel.build.apply(fallbackKernel, args);
      const result = fallbackKernel.run.apply(fallbackKernel, args);
      kernelRun.replaceKernel(fallbackKernel);
      return result;
    }

    function onRequestSwitchKernel(args, kernel) {
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
      const signature = argumentTypes.join(',');
      const existingKernel = switchableKernels[signature];
      if (existingKernel) {
        existingKernel.run.apply(existingKernel, args);
        if (existingKernel.renderKernels) {
          return existingKernel.renderKernels();
        } else {
          return existingKernel.renderOutput();
        }
      }

      const newKernel = switchableKernels[signature] = new kernel.constructor(source, {
        argumentTypes,
        constantTypes: kernel.constantTypes,
        graphical: kernel.graphical,
        loopMaxIterations: kernel.loopMaxIterations,
        constants: kernel.constants,
        dynamicOutput: kernel.dynamicOutput,
        dynamicArgument: kernel.dynamicArguments,
        context: kernel.context,
        canvas: kernel.canvas,
        output: kernel.output,
        precision: kernel.precision,
        pipeline: kernel.pipeline,
        immutable: kernel.immutable,
        optimizeFloatMemory: kernel.optimizeFloatMemory,
        fixIntegerDivisionAccuracy: kernel.fixIntegerDivisionAccuracy,
        functions: kernel.functions,
        nativeFunctions: kernel.nativeFunctions,
        injectedNative: kernel.injectedNative,
        subKernels: kernel.subKernels,
        strictIntegers: kernel.strictIntegers,
        debug: kernel.debug,
        gpu: kernel.gpu,
        validate,
        warnVarUsage: kernel.warnVarUsage,
        returnType: kernel.returnType,
        onRequestFallback,
        onRequestSwitchKernel,
      });
      newKernel.build.apply(newKernel, args);
      newKernel.run.apply(newKernel, args);
      kernelRun.replaceKernel(newKernel);
      if (newKernel.renderKernels) {
        return newKernel.renderKernels();
      } else {
        return newKernel.renderOutput();
      }
    }
    const mergedSettings = Object.assign({
      context: this.context,
      canvas: this.canvas,
      functions: this.functions,
      nativeFunctions: this.nativeFunctions,
      injectedNative: this.injectedNative,
      gpu: this,
      validate,
      onRequestFallback,
      onRequestSwitchKernel
    }, settingsCopy);

    const kernelRun = kernelRunShortcut(new this.Kernel(source, mergedSettings));

    //if canvas didn't come from this, propagate from kernel
    if (!this.canvas) {
      this.canvas = kernelRun.canvas;
    }

    //if context didn't come from this, propagate from kernel
    if (!this.context) {
      this.context = kernelRun.context;
    }

    this.kernels.push(kernelRun);

    return kernelRun;
  }

  /**
   *
   * Create a super kernel which executes sub kernels
   * and saves their output to be used with the next sub kernel.
   * This can be useful if we want to save the output on one kernel,
   * and then use it as an input to another kernel. *Machine Learning*
   *
   * @param {Object|Array} subKernels - Sub kernels for this kernel
   * @param {Function} rootKernel - Root kernel
   *
   * @returns {Function} callable kernel function
   *
   * @example
   * const megaKernel = gpu.createKernelMap({
   *   addResult: function add(a, b) {
   *     return a[this.thread.x] + b[this.thread.x];
   *   },
   *   multiplyResult: function multiply(a, b) {
   *     return a[this.thread.x] * b[this.thread.x];
   *   },
   *  }, function(a, b, c) {
   *       return multiply(add(a, b), c);
   * });
   *
   * megaKernel(a, b, c);
   *
   * Note: You can also define subKernels as an array of functions.
   * > [add, multiply]
   *
   */
  createKernelMap() {
    let fn;
    let settings;
    if (typeof arguments[arguments.length - 2] === 'function') {
      fn = arguments[arguments.length - 2];
      settings = arguments[arguments.length - 1];
    } else {
      fn = arguments[arguments.length - 1];
    }

    if (this.mode !== 'dev') {
      if (!this.Kernel.isSupported || !this.Kernel.features.kernelMap) {
        if (this.mode && kernelTypes.indexOf(this.mode) < 0) {
          throw new Error(`kernelMap not supported on ${this.Kernel.name}`);
        }
      }
    }

    const settingsCopy = upgradeDeprecatedCreateKernelSettings(settings);
    // handle conversion of argumentTypes
    if (settings && typeof settings.argumentTypes === 'object') {
      settingsCopy.argumentTypes = Object.keys(settings.argumentTypes).map(argumentName => settings.argumentTypes[argumentName]);
    }

    if (Array.isArray(arguments[0])) {
      settingsCopy.subKernels = [];
      const functions = arguments[0];
      for (let i = 0; i < functions.length; i++) {
        const source = functions[i].toString();
        const name = utils.getFunctionNameFromString(source);
        settingsCopy.subKernels.push({
          name,
          source,
          property: i,
        });
      }
    } else {
      settingsCopy.subKernels = [];
      const functions = arguments[0];
      for (let p in functions) {
        if (!functions.hasOwnProperty(p)) continue;
        const source = functions[p].toString();
        const name = utils.getFunctionNameFromString(source);
        settingsCopy.subKernels.push({
          name: name || p,
          source,
          property: p,
        });
      }
    }
    return this.createKernel(fn, settingsCopy);
  }

  /**
   *
   * Combine different kernels into one super Kernel,
   * useful to perform multiple operations inside one
   * kernel without the penalty of data transfer between
   * cpu and gpu.
   *
   * The number of kernel functions sent to this method can be variable.
   * You can send in one, two, etc.
   *
   * @param {Function} subKernels - Kernel function(s) to combine.
   * @param {Function} rootKernel - Root kernel to combine kernels into
   *
   * @example
   *   combineKernels(add, multiply, function(a,b,c){
   *     return add(multiply(a,b), c)
   *  })
   *
   * @returns {Function} Callable kernel function
   *
   */
  combineKernels() {
    const firstKernel = arguments[0];
    const combinedKernel = arguments[arguments.length - 1];
    if (firstKernel.kernel.constructor.mode === 'cpu') return combinedKernel;
    const canvas = arguments[0].canvas;
    const context = arguments[0].context;
    const max = arguments.length - 1;
    for (let i = 0; i < max; i++) {
      arguments[i]
        .setCanvas(canvas)
        .setContext(context)
        .setPipeline(true);
    }

    return function() {
      const texture = combinedKernel.apply(this, arguments);
      if (texture.toArray) {
        return texture.toArray();
      }
      return texture;
    };
  }

  /**
   * @desc Adds additional functions, that the kernel may call.
   * @param {Function|String} source - Javascript function to convert
   * @param {IFunctionSettings} [settings]
   * @returns {GPU} returns itself
   */
  addFunction(source, settings) {
    this.functions.push(utils.functionToIFunction(source, settings));
    return this;
  }

  /**
   * @desc Adds additional native functions, that the kernel may call.
   * @param {String} name - native function name, used for reverse lookup
   * @param {String} source - the native function implementation, as it would be defined in it's entirety
   * @param {object} [settings]
   * @returns {GPU} returns itself
   */
  addNativeFunction(name, source, settings) {
    if (this.kernels.length > 0) {
      throw new Error('Cannot call "addNativeFunction" after "createKernels" has been called.');
    }
    settings = settings || {};
    const { argumentTypes, argumentNames } = this.Kernel.nativeFunctionArguments(source) || {};
    this.nativeFunctions.push({
      name,
      source,
      settings,
      argumentTypes,
      argumentNames,
      returnType: settings.returnType || this.Kernel.nativeFunctionReturnType(source),
    });
    return this;
  }

  /**
   * Inject a string just before translated kernel functions
   * @param {String} source
   * @return {GPU}
   */
  injectNative(source) {
    this.injectedNative = source;
    return this;
  }

  /**
   * @desc Destroys all memory associated with gpu.js & the webGl if we created it
   */
  destroy() {
    if (!this.kernels) return;
    // perform on next run loop - for some reason we dont get lose context events
    // if webGl is created and destroyed in the same run loop.
    setTimeout(() => {
      for (let i = 0; i < this.kernels.length; i++) {
        this.kernels[i].destroy(true); // remove canvas if exists
      }
      // all kernels are associated with one context, go ahead and take care of it here
      let firstKernel = this.kernels[0];
      if (firstKernel) {
        // if it is shortcut
        if (firstKernel.kernel) {
          firstKernel = firstKernel.kernel;
        }
        if (firstKernel.constructor.destroyContext) {
          firstKernel.constructor.destroyContext(this.context);
        }
      }
    }, 0);
  }
}


function upgradeDeprecatedCreateKernelSettings(settings) {
  if (!settings) {
    return {};
  }
  const upgradedSettings = Object.assign({}, settings);

  if (settings.hasOwnProperty('floatOutput')) {
    utils.warnDeprecated('setting', 'floatOutput', 'precision');
    upgradedSettings.precision = settings.floatOutput ? 'single' : 'unsigned';
  }
  if (settings.hasOwnProperty('outputToTexture')) {
    utils.warnDeprecated('setting', 'outputToTexture', 'pipeline');
    upgradedSettings.pipeline = Boolean(settings.outputToTexture);
  }
  if (settings.hasOwnProperty('outputImmutable')) {
    utils.warnDeprecated('setting', 'outputImmutable', 'immutable');
    upgradedSettings.immutable = Boolean(settings.outputImmutable);
  }
  if (settings.hasOwnProperty('floatTextures')) {
    utils.warnDeprecated('setting', 'floatTextures', 'optimizeFloatMemory');
    upgradedSettings.optimizeFloatMemory = Boolean(settings.floatTextures);
  }
  return upgradedSettings;
}

module.exports = {
  GPU,
  kernelOrder,
  kernelTypes
};