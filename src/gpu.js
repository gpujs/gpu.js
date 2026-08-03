const { gpuMock } = require('gpu-mock.js');
const { utils } = require('./utils');
const { Kernel } = require('./backend/kernel');
const { CPUKernel } = require('./backend/cpu/kernel');
const { HeadlessGLKernel } = require('./backend/headless-gl/kernel');
const { WebGL2Kernel } = require('./backend/web-gl2/kernel');
const { WebGLKernel } = require('./backend/web-gl/kernel');
const { WebGPUKernel } = require('./backend/web-gpu/kernel');
const { WebAssemblyKernel } = require('./backend/web-assembly/kernel');
const { kernelRunShortcut } = require('./kernel-run-shortcut');
const { Pipeline } = require('./pipeline');


/**
 * webasm sits last, one step above the cpu fallback: any working GL backend
 * outranks it, so auto modes only reach it where no GL context exists
 * @type {Array.<Kernel>}
 */
const kernelOrder = [HeadlessGLKernel, WebGL2Kernel, WebGLKernel, WebAssemblyKernel];

/**
 *
 * @type {string[]}
 */
const kernelTypes = ['gpu', 'cpu'];

const internalKernels = {
  'headlessgl': HeadlessGLKernel,
  'webgl2': WebGL2Kernel,
  'webgl': WebGLKernel,
  // deliberately NOT in kernelOrder: the sync isSupported check
  // (navigator.gpu presence) does not prove an adapter exists, so webgpu is
  // explicit opt-in via `new GPU({ mode: 'webgpu' })` only
  'webgpu': WebGPUKernel,
  'webasm': WebAssemblyKernel,
};

let validate = true;

/**
 * The GPU.js library class which manages the GPU context for the creating kernels
 * @class
 * @return {GPU}
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
   * @desc TRUE if the WebGPU API surface exists (navigator.gpu). Optimistic:
   * an adapter may still be unavailable — use `await GPU.isWebGPUAvailable()`
   * for the authoritative answer.
   */
  static get isWebGPUSupported() {
    return WebGPUKernel.isSupported;
  }

  /**
   * @desc Actually requests an adapter; resolves whether a webgpu kernel
   * could run here.
   * @returns {Promise<boolean>}
   */
  static isWebGPUAvailable() {
    if (!WebGPUKernel.isSupported) return Promise.resolve(false);
    return navigator.gpu.requestAdapter().then(adapter => adapter !== null, () => false);
  }

  /**
   * @desc TRUE if platform supports WebAssembly
   */
  static get isWebAssemblySupported() {
    return WebAssemblyKernel.isSupported;
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
   * @constructor
   */
  constructor(settings) {
    settings = settings || {};
    this.canvas = settings.canvas || null;
    this.context = settings.context || null;
    this.mode = settings.mode;
    this.Kernel = null;
    /**
     * mode 'async' only: the adapter probe's settled answer (true/false), or
     * null while it is in flight. Started at construction so that by kernel
     * creation -- usually at least a task later in real applications -- the
     * backend for a graphical kernel can be decided BEFORE its canvas is
     * exposed, since a canvas is permanently committed to its first context
     * type and can never be swapped between backends afterwards.
     * @type {Boolean|null}
     */
    this._webGPUDecision = null;
    if (settings.mode === 'async') {
      if (WebGPUKernel.isSupported) {
        GPU.isWebGPUAvailable().then(available => {
          this._webGPUDecision = available;
        }, () => {
          this._webGPUDecision = false;
        });
      } else {
        this._webGPUDecision = false;
      }
    }
    this.kernels = [];
    this.pipelines = [];
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
        const s = settings.nativeFunctions[p];
        const { name, source } = s;
        this.addNativeFunction(name, source, s);
      }
    }
  }

  /**
   * Choose kernel type and save on .Kernel property of GPU
   */
  chooseKernel() {
    if (this.Kernel) return;

    /**
     *
     * @type {WebGLKernel|WebGL2Kernel|HeadlessGLKernel|CPUKernel}
     */
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
      } else if (this.mode === 'async') {
        // auto-selection under the Promise contract: pick the best
        // synchronously-provable backend now (its readback runs non-blocking
        // where the platform allows), and let the first kernel call upgrade
        // to webgpu once an adapter has actually answered -- the async
        // contract is exactly what buys the room to probe
        for (let i = 0; i < kernelOrder.length; i++) {
          if (kernelOrder[i].isSupported) {
            Kernel = kernelOrder[i];
            break;
          }
        }
        if (!Kernel) {
          Kernel = CPUKernel;
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
   * @return {IKernelRunShortcut} callable function to run
   */
  createKernel(source, settings) {
    if (typeof source === 'undefined') {
      throw new Error('Missing source parameter');
    }
    if (typeof source !== 'object' && !utils.isFunction(source) && typeof source !== 'string') {
      throw new Error('source parameter not a function');
    }

    const kernels = this.kernels;
    if (this.mode === 'dev') {
      const devKernel = gpuMock(source, upgradeDeprecatedCreateKernelSettings(settings));
      kernels.push(devKernel);
      return devKernel;
    }

    source = typeof source === 'function' ? source.toString() : source;
    const switchableKernels = {};
    const settingsCopy = upgradeDeprecatedCreateKernelSettings(settings) || {};
    // handle conversion of argumentTypes
    if (settings && typeof settings.argumentTypes === 'object') {
      settingsCopy.argumentTypes = Object.keys(settings.argumentTypes).map(argumentName => settings.argumentTypes[argumentName]);
    }

    const gpuInstance = this;

    function onRequestFallback(args) {
      console.warn(`Falling back to CPU${ kernelRun.fallbackReason ? `: ${ kernelRun.fallbackReason }` : '' }`);
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
        randomSeed: kernelRun.randomSeed,
        debug: kernelRun.debug,
        asyncMode: kernelRun.asyncMode,
        // the fallback kernel lives as long as the shortcut: without these
        // hooks a later argument-type change on it throws instead of
        // switching (the run shortcut assumes every kernel carries them)
        onRequestFallback,
        onRequestSwitchKernel,
        // ONLY a graphical fallback whose canvas is still uncommitted (webasm
        // creates the element but never touches a context) inherits it, so
        // the element the user appended keeps rendering. Any canvas that
        // already has a rendering context -- every GL kernel's -- is
        // permanently committed to it and would break the cpu kernel's 2d
        // context instead.
        canvas: kernelRun.graphical && !kernelRun.context ? kernelRun.canvas : null,
      });
      // the requesting kernel is about to be swapped out; the reason stays
      // queryable on the kernel that survives
      fallbackKernel.fallbackReason = kernelRun.fallbackReason;
      fallbackKernel.build.apply(fallbackKernel, args);
      const result = fallbackKernel.run.apply(fallbackKernel, args);
      kernelRun.replaceKernel(fallbackKernel);
      // gpu.canvas was sampled once at createKernel, possibly from a kernel
      // with no canvas; the fallback may be the first to have one
      if (!gpuInstance.canvas && fallbackKernel.canvas) {
        gpuInstance.canvas = fallbackKernel.canvas;
      }
      if (!gpuInstance.context && fallbackKernel.context) {
        gpuInstance.context = fallbackKernel.context;
      }
      return result;
    }

    /**
     *
     * @param {IReason[]} reasons
     * @param {IArguments} args
     * @param {Kernel} _kernel
     * @returns {*}
     */
    function onRequestSwitchKernel(reasons, args, _kernel) {
      if (_kernel.debug) {
        console.warn('Switching kernels');
      }
      let newOutput = null;
      if (_kernel.signature && !switchableKernels[_kernel.signature]) {
        switchableKernels[_kernel.signature] = _kernel;
      }
      if (_kernel.dynamicOutput) {
        for (let i = reasons.length - 1; i >= 0; i--) {
          const reason = reasons[i];
          if (reason.type === 'outputPrecisionMismatch') {
            newOutput = reason.needed;
          }
        }
      }

      const Constructor = _kernel.constructor;
      const argumentTypes = Constructor.getArgumentTypes(_kernel, args);
      const signature = Constructor.getSignature(_kernel, argumentTypes);
      const existingKernel = switchableKernels[signature];
      if (existingKernel) {
        existingKernel.onActivate(_kernel);
        return existingKernel;
      }

      const newKernel = switchableKernels[signature] = new Constructor(source, {
        argumentTypes,
        constantTypes: _kernel.constantTypes,
        graphical: _kernel.graphical,
        loopMaxIterations: _kernel.loopMaxIterations,
        constants: _kernel.constants,
        dynamicOutput: _kernel.dynamicOutput,
        dynamicArgument: _kernel.dynamicArguments,
        context: _kernel.context,
        canvas: _kernel.canvas,
        output: newOutput || _kernel.output,
        precision: _kernel.precision,
        pipeline: _kernel.pipeline,
        immutable: _kernel.immutable,
        optimizeFloatMemory: _kernel.optimizeFloatMemory,
        fixIntegerDivisionAccuracy: _kernel.fixIntegerDivisionAccuracy,
        functions: _kernel.functions,
        nativeFunctions: _kernel.nativeFunctions,
        injectedNative: _kernel.injectedNative,
        subKernels: _kernel.subKernels,
        strictIntegers: _kernel.strictIntegers,
        randomSeed: _kernel.randomSeed,
        debug: _kernel.debug,
        asyncMode: _kernel.asyncMode,
        gpu: _kernel.gpu,
        validate,
        returnType: _kernel.returnType,
        tactic: _kernel.tactic,
        onRequestFallback,
        onRequestSwitchKernel,
        texture: _kernel.texture,
        mappedTextures: _kernel.mappedTextures,
        drawBuffersMap: _kernel.drawBuffersMap,
      });
      newKernel.build.apply(newKernel, args);
      kernelRun.replaceKernel(newKernel);
      kernels.push(newKernel);
      return newKernel;
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
    if (this.mode === 'async') {
      mergedSettings.asyncMode = true;
    }

    let ChosenKernel = this.Kernel;
    if (this.mode === 'async' && settingsCopy.graphical && this._webGPUDecision === true) {
      // graphical kernels bind to their backend at creation: the canvas the
      // user appends must be the final one. The probe settled webgpu-yes, so
      // construct there directly -- no upgrade, no canvas swap, ever. A
      // still-pending probe (kernel created in the same tick as the GPU)
      // stays on the proven backend; `await GPU.isWebGPUAvailable()` before
      // createKernel settles it deterministically.
      ChosenKernel = WebGPUKernel;
      // the GPU instance's shared canvas/context belong to the GL backend;
      // a webgpu kernel must not inherit them
      if (mergedSettings.canvas === this.canvas) mergedSettings.canvas = settingsCopy.canvas || null;
      if (mergedSettings.context === this.context) mergedSettings.context = settingsCopy.context || null;
      mergedSettings.asyncMode = true;
    }
    let kernel;
    try {
      kernel = new ChosenKernel(source, mergedSettings);
    } catch (e) {
      if (ChosenKernel !== this.Kernel) {
        // anything the webgpu backend cannot take falls back to the proven
        // backend at construction, exactly as the upgrade path declines
        kernel = new this.Kernel(source, Object.assign({}, mergedSettings, {
          canvas: this.canvas,
          context: this.context,
        }));
      } else {
        throw e;
      }
    }
    const kernelRun = kernelRunShortcut(kernel);

    if (this.mode === 'async' && WebGPUKernel.isSupported && !(kernel instanceof WebGPUKernel)) {
      const gpu = this;
      // consulted (and cleared) by the shortcut on the first call, before the
      // chosen kernel builds; every setter chained onto the shortcut lands on
      // the kernel instance first, so its settings are harvested here rather
      // than from settingsCopy
      kernel.onAsyncModeUpgrade = function onAsyncModeUpgrade(args, currentKernel) {
        return GPU.isWebGPUAvailable().then(available => {
          if (!available) return null;
          if (currentKernel.graphical) {
            // the webgpu backend can render, but upgrading would swap in a
            // different canvas element -- one the user may already have in
            // the DOM -- so graphical kernels stay where they started
            if (currentKernel.debug) {
              console.warn('webgpu upgrade declined: graphical kernels keep their canvas');
            }
            return null;
          }
          let webGPUKernel;
          try {
            webGPUKernel = new WebGPUKernel(source, {
              // from the kernel instance, not the GPU: per-kernel functions
              // (createKernel settings, addFunction on the shortcut) live
              // only on the kernel, and losing them here would silently
              // decline the upgrade forever
              functions: currentKernel.functions,
              nativeFunctions: currentKernel.nativeFunctions,
              injectedNative: currentKernel.injectedNative,
              gpu,
              validate,
              asyncMode: true,
              output: currentKernel.output,
              pipeline: currentKernel.pipeline,
              immutable: currentKernel.immutable,
              dynamicOutput: currentKernel.dynamicOutput,
              // always dynamic: the GL backends absorb argument-size changes
              // by switching kernels, so a faithful harvest here would make
              // the upgrade stricter than the backend it replaced. The WGSL
              // side reads every array's dimensions from the params buffer
              // regardless, so the leniency costs nothing.
              dynamicArguments: true,
              loopMaxIterations: currentKernel.loopMaxIterations,
              constants: currentKernel.constants,
              constantTypes: currentKernel.constantTypes,
              argumentTypes: currentKernel.argumentTypes,
              precision: currentKernel.precision,
              tactic: currentKernel.tactic,
              strictIntegers: currentKernel.strictIntegers,
              fixIntegerDivisionAccuracy: currentKernel.fixIntegerDivisionAccuracy,
              subKernels: currentKernel.subKernels,
              graphical: currentKernel.graphical,
              debug: currentKernel.debug,
            });
            // deferred features (graphical, kernel maps, unsigned precision,
            // Math.random) throw synchronously here: the proven backend keeps
            // the kernel and nothing was lost but the probe
            webGPUKernel.build.apply(webGPUKernel, args);
          } catch (e) {
            if (currentKernel.debug) {
              console.warn('webgpu upgrade declined: ' + e.message);
            }
            return null;
          }
          // WGSL compilation and pipeline validation reject asynchronously;
          // awaiting the full build here means the kernel only ever swaps to
          // a webgpu kernel that is proven to build, and a declined upgrade
          // keeps the real reason instead of masking it behind a re-run
          return webGPUKernel._buildPromise.then(() => {
            kernels.push(webGPUKernel);
            return webGPUKernel;
          }, (e) => {
            if (currentKernel.debug) {
              console.warn('webgpu upgrade declined: ' + e.message);
            }
            webGPUKernel.destroy();
            return null;
          });
        }, () => null);
      };
    }

    //if canvas didn't come from this, propagate from kernel
    if (!this.canvas) {
      this.canvas = kernel.canvas;
    }

    //if context didn't come from this, propagate from kernel
    if (!this.context) {
      this.context = kernel.context;
    }

    kernels.push(kernel);

    return kernelRun;
  }

  /**
   * @desc Compile a whole multi-kernel computation into one callable plan
   * (docs/design/pipeline-compilation.md). The orchestration function runs
   * once, at build time, with opaque handles for arguments; the kernel calls
   * it makes are recorded and replayed on later calls with intermediates
   * kept resident. Calling the pipeline always returns a Promise.
   * @param {Function} fn - orchestration function; may only call kernels
   * created by this GPU instance
   * @param {IPipelineSettings} [settings] - `constants` only in v1
   * @returns {IPipelineRunShortcut} callable pipeline
   */
  createPipeline(fn, settings) {
    if (typeof fn !== 'function') {
      throw new Error('createPipeline requires an orchestration function');
    }
    if (this.mode === 'dev') {
      throw new Error('createPipeline is not supported in dev mode');
    }
    const pipeline = new Pipeline(this, fn, settings);
    this.pipelines.push(pipeline);
    const shortcut = function() {
      return pipeline.call(arguments);
    };
    shortcut.pipeline = pipeline;
    shortcut.setConstants = function(constants) {
      pipeline.setConstants(constants);
      return shortcut;
    };
    shortcut.destroy = function() {
      return pipeline.destroy();
    };
    Object.defineProperty(shortcut, 'executorKind', {
      get: () => pipeline.executorKind,
    });
    Object.defineProperty(shortcut, 'fallbackReason', {
      get: () => pipeline.fallbackReason,
    });
    Object.defineProperty(shortcut, 'plan', {
      get: () => pipeline.plan,
    });
    // the backend that actually EXECUTES, derived from the executor that
    // ran -- never from plan internals, which reorganize between releases.
    // Under degradation inside the generic executor the writer clones swap
    // to cpu and this says so: the silent-degradation safety net suites
    // probe on kernels (#868), as supported API.
    Object.defineProperty(shortcut, 'backend', {
      get: () => {
        const kind = pipeline.executorKind;
        if (kind === 'fused-sync' || kind === 'fused-threaded') return 'webasm';
        if (kind === 'fused-encoder') return 'webgpu';
        const plan = pipeline.plan;
        if (!plan) return null;
        for (const [key, clone] of plan.genericClones) {
          if (key.indexOf('up:') !== 0) return clone.kernel.constructor.mode;
        }
        // built but no generic run yet: the plan clones' mode is the
        // backend a run WOULD execute on
        return plan.kernels.length > 0 ? plan.kernels[0].clone.kernel.constructor.mode : null;
      },
    });
    return shortcut;
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
    const argument2Type = typeof arguments[arguments.length - 2];
    if (argument2Type === 'function' || argument2Type === 'string') {
      fn = arguments[arguments.length - 2];
      settings = arguments[arguments.length - 1];
    } else {
      fn = arguments[arguments.length - 1];
    }

    if (this.mode !== 'dev') {
      if (!this.Kernel.isSupported || !this.Kernel.features.kernelMap) {
        if (this.Kernel.mode === 'webgpu') {
          throw new Error('WebGPU backend does not yet support createKernelMap');
        }
        // webasm sits in the auto chain one step above cpu; its build()
        // degrades kernel maps to cpu via requestFallback, so throwing here
        // would remove the cpu fallback from exactly the GL-less environments
        // the backend exists for. chooseKernel rewrites this.mode to the
        // chosen backend's name, so the mode check alone cannot tell an
        // explicit request from auto-selection -- let webasm fall through.
        if (this.mode && kernelTypes.indexOf(this.mode) < 0 && this.Kernel.mode !== 'webasm') {
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
    // before the cpu early-return: the cpu arm of mode 'async' is equally
    // Promise-returning, and the combiner would feed those Promises into the
    // next kernel as arguments
    if (this.mode === 'async' || firstKernel.kernel.asyncMode) {
      throw new Error(`mode 'async' does not yet support combineKernels; chain kernels with \`await\` and pipeline mode instead`);
    }
    if (firstKernel.kernel.constructor.mode === 'cpu') return combinedKernel;
    if (firstKernel.kernel.constructor.mode === 'webgpu') {
      throw new Error('WebGPU backend does not yet support combineKernels; chain kernels with `await` and pipeline mode instead');
    }
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

  setFunctions(functions) {
    this.functions = functions;
    return this;
  }

  setNativeFunctions(nativeFunctions) {
    this.nativeFunctions = nativeFunctions;
    return this;
  }

  /**
   * @desc Adds additional functions, that the kernel may call.
   * @param {Function|String} source - Javascript function to convert
   * @param {IFunctionSettings} [settings]
   * @returns {GPU} returns itself
   */
  addFunction(source, settings) {
    this.functions.push({ source, settings });
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
    this.nativeFunctions.push(Object.assign({ name, source }, settings));
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
   * @return {Promise}
   * @resolve {void}
   * @reject {Error}
   */
  destroy() {
    return new Promise((resolve, reject) => {
      if (!this.kernels) {
        resolve();
      }
      // perform on next run loop - for some reason we dont get lose context events
      // if webGl is created and destroyed in the same run loop.
      setTimeout(() => {
        try {
          // pipelines release their cloned kernel instances, which splice
          // themselves out of this.kernels -- so pipelines go first, then
          // the surviving kernels. Their releases queue behind in-flight
          // call tails, so the whole teardown AWAITS them: gpu.destroy()
          // resolving while a threaded executor's workers are still alive
          // is a lie the caller acts on
          let pipelinesDone = Promise.resolve();
          if (this.pipelines) {
            const pipelines = this.pipelines.slice();
            pipelinesDone = Promise.all(pipelines.map(pipeline => Promise.resolve(pipeline.destroy()).catch(() => undefined)));
          }
          // a closure, not a method: destroy() is exercised against bare
          // mock objects via GPU.prototype.destroy.call in the test suite,
          // so `this` cannot be assumed to carry anything beyond data
          const destroyKernels = () => {
            try {
              // kernel.destroy() splices itself out of this.kernels, so walk a copy:
              // mutating the list being indexed skipped every other kernel, and left
              // this.kernels[0] undefined below, which meant a single-kernel GPU
              // never released its WebGL context at all
              const kernels = this.kernels.slice();
              for (let i = 0; i < kernels.length; i++) {
                kernels[i].destroy(true); // remove canvas if exists
              }
              // all kernels are associated with one context, go ahead and take care of it here
              let firstKernel = kernels[0];
              if (firstKernel) {
                // if it is shortcut
                if (firstKernel.kernel) {
                  firstKernel = firstKernel.kernel;
                }
                if (firstKernel.constructor.destroyContext) {
                  firstKernel.constructor.destroyContext(this.context);
                }
              }
            } catch (e) {
              reject(e);
              return;
            }
            resolve();
          };
          pipelinesDone.then(destroyKernels).catch(reject);
        } catch (e) {
          reject(e);
        }
      }, 0);
    });
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