import { GLKernel } from '../gl/kernel';
import { FunctionBuilder } from '../function-builder';
import { WebGLFunctionNode } from './function-node';
import { utils } from '../../utils';
import triangleNoise from '../../plugins/triangle-noise';
import { fragmentShader } from './fragment-shader';
import { vertexShader } from './vertex-shader';
import { glKernelString } from '../gl/kernel-string';
import { lookupKernelValueType } from './kernel-value-maps';

let isSupported = null;
let testCanvas = null;
let testContext = null;
let testExtensions = null;
let features = null;

const plugins = [triangleNoise];
const canvases = [];
const maxTexSizes = {};

/**
 * @desc Kernel Implementation for WebGL.
 *
 * This builds the shaders and runs them on the GPU, then outputs the result
 * back as float (enabled by default) and Texture.
 *
 * @prop {Object} textureCache - webGl Texture cache
 * @prop {Object} programUniformLocationCache - Location of program variables in memory
 * @prop {Object} framebuffer - Webgl frameBuffer
 * @prop {Object} buffer - WebGL buffer
 * @prop {Object} program - The webGl Program
 * @prop {Object} functionBuilder - Function Builder instance bound to this Kernel
 * @prop {Boolean} pipeline - Set output type to FAST mode (GPU to GPU via Textures), instead of float
 * @prop {String} endianness - Endian information like Little-endian, Big-endian.
 * @prop {Array} argumentTypes - Types of parameters sent to the Kernel
 * @prop {String} compiledFragmentShader - Compiled fragment shader string
 * @prop {String} compiledVertexShader - Compiled Vertical shader string
 * @extends GLKernel
 */
export class WebGLKernel extends GLKernel {
  static get isSupported() {
    if (isSupported !== null) {
      return isSupported;
    }
    this.setupFeatureChecks();
    isSupported = this.isContextMatch(testContext);
    return isSupported;
  }

  static setupFeatureChecks() {
    if (typeof document !== 'undefined') {
      testCanvas = document.createElement('canvas');
    } else if (typeof OffscreenCanvas !== 'undefined') {
      testCanvas = new OffscreenCanvas(0, 0);
    }
    if (!testCanvas) return;
    testContext = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    if (!testContext || !testContext.getExtension) return;
    testExtensions = {
      OES_texture_float: testContext.getExtension('OES_texture_float'),
      OES_texture_float_linear: testContext.getExtension('OES_texture_float_linear'),
      OES_element_index_uint: testContext.getExtension('OES_element_index_uint'),
      WEBGL_draw_buffers: testContext.getExtension('WEBGL_draw_buffers'),
    };
    features = this.getFeatures();
  }

  static isContextMatch(context) {
    if (typeof WebGLRenderingContext !== 'undefined') {
      return context instanceof WebGLRenderingContext;
    }
    return false;
  }

  static getFeatures() {
    const isDrawBuffers = this.getIsDrawBuffers();
    return Object.freeze({
      isFloatRead: this.getIsFloatRead(),
      isIntegerDivisionAccurate: this.getIsIntegerDivisionAccurate(),
      isTextureFloat: this.getIsTextureFloat(),
      isDrawBuffers,
      kernelMap: isDrawBuffers,
      channelCount: this.getChannelCount(),
    });
  }

  static getIsTextureFloat() {
    return Boolean(testExtensions.OES_texture_float);
  }

  static getIsDrawBuffers() {
    return Boolean(testExtensions.WEBGL_draw_buffers);
  }

  static getChannelCount() {
    return testExtensions.WEBGL_draw_buffers ?
      testContext.getParameter(testExtensions.WEBGL_draw_buffers.MAX_DRAW_BUFFERS_WEBGL) :
      1;
  }

  static lookupKernelValueType(type, dynamic, precision, value) {
    return lookupKernelValueType(type, dynamic, precision, value);
  }

  static get testCanvas() {
    return testCanvas;
  }

  static get testContext() {
    return testContext;
  }

  static get features() {
    return features;
  }

  static get fragmentShader() {
    return fragmentShader;
  }

  static get vertexShader() {
    return vertexShader;
  }

  /**
   *
   * @param {String} source
   * @param {IKernelSettings} settings
   */
  constructor(source, settings) {
    super(source, settings);
    this.program = null;
    this.pipeline = settings.pipeline;
    this.endianness = utils.systemEndianness();
    this.extensions = {};
    this.subKernelOutputTextures = null;
    this.kernelArguments = null;
    this.argumentTextureCount = 0;
    this.constantTextureCount = 0;
    this.compiledFragmentShader = null;
    this.compiledVertexShader = null;
    this.fragShader = null;
    this.vertShader = null;
    this.drawBuffersMap = null;
    this.outputTexture = null;

    /**
     *
     * @type {Int32Array|null}
     */
    this.maxTexSize = null;
    this.switchingKernels = false;
    this.onRequestSwitchKernel = null;

    this.mergeSettings(source.settings || settings);

    /**
     * The thread dimensions, x, y and z
     * @type {Array|null}
     */
    this.threadDim = null;
    this.framebuffer = null;
    this.buffer = null;
    this.textureCache = {};
    this.programUniformLocationCache = {};
    this.uniform1fCache = {};
    this.uniform1iCache = {};
    this.uniform2fCache = {};
    this.uniform2fvCache = {};
    this.uniform2ivCache = {};
    this.uniform3fvCache = {};
    this.uniform3ivCache = {};
    this.uniform4fvCache = {};
    this.uniform4ivCache = {};
  }

  initCanvas() {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      // Default width and height, to fix webgl issue in safari
      canvas.width = 2;
      canvas.height = 2;
      return canvas;
    } else if (typeof OffscreenCanvas !== 'undefined') {
      return new OffscreenCanvas(0, 0);
    }
  }

  initContext() {
    const settings = {
      alpha: false,
      depth: false,
      antialias: false
    };
    return this.canvas.getContext('webgl', settings) || this.canvas.getContext('experimental-webgl', settings);
  }

  initPlugins(settings) {
    // default plugins
    const pluginsToUse = [];
    const { source } = this;
    if (typeof source === 'string') {
      for (let i = 0; i < plugins.length; i++) {
        const plugin = plugins[i];
        if (source.match(plugin.functionMatch)) {
          pluginsToUse.push(plugin);
        }
      }
    } else if (typeof source === 'object') {
      // `source` is from object, json
      if (settings.pluginNames) { //TODO: in context of JSON support, pluginNames may not exist here
        for (let i = 0; i < plugins.length; i++) {
          const plugin = plugins[i];
          const usePlugin = settings.pluginNames.some(pluginName => pluginName === plugin.name);
          if (usePlugin) {
            pluginsToUse.push(plugin);
          }
        }
      }
    }
    return pluginsToUse;
  }

  initExtensions() {
    this.extensions = {
      OES_texture_float: this.context.getExtension('OES_texture_float'),
      OES_texture_float_linear: this.context.getExtension('OES_texture_float_linear'),
      OES_element_index_uint: this.context.getExtension('OES_element_index_uint'),
      WEBGL_draw_buffers: this.context.getExtension('WEBGL_draw_buffers'),
      WEBGL_color_buffer_float: this.context.getExtension('WEBGL_color_buffer_float'),
    };
  }

  /**
   * @desc Validate settings related to Kernel, such as dimensions size, and auto output support.
   * @param {IArguments} args
   */
  validateSettings(args) {
    if (!this.validate) {
      this.texSize = utils.getKernelTextureSize({
        optimizeFloatMemory: this.optimizeFloatMemory,
        precision: this.precision,
      }, this.output);
      return;
    }

    const { features } = this.constructor;
    if (this.optimizeFloatMemory === true && !features.isTextureFloat) {
      throw new Error('Float textures are not supported');
    } else if (this.precision === 'single' && !features.isFloatRead) {
      throw new Error('Single precision not supported');
    } else if (!this.graphical && this.precision === null && features.isTextureFloat) {
      this.precision = features.isFloatRead ? 'single' : 'unsigned';
    }

    if (this.subKernels && this.subKernels.length > 0 && !this.extensions.WEBGL_draw_buffers) {
      throw new Error('could not instantiate draw buffers extension');
    }

    if (this.fixIntegerDivisionAccuracy === null) {
      this.fixIntegerDivisionAccuracy = !features.isIntegerDivisionAccurate;
    } else if (this.fixIntegerDivisionAccuracy && features.isIntegerDivisionAccurate) {
      this.fixIntegerDivisionAccuracy = false;
    }

    this.checkOutput();

    if (!this.output || this.output.length === 0) {
      if (args.length !== 1) {
        throw new Error('Auto output only supported for kernels with only one input');
      }

      const argType = utils.getVariableType(args[0], this.strictIntegers);
      if (argType === 'Array') {
        this.output = utils.getDimensions(argType);
      } else if (argType === 'NumberTexture' || argType === 'ArrayTexture(4)') {
        this.output = args[0].output;
      } else {
        throw new Error('Auto output not supported for input type: ' + argType);
      }
    }

    if (this.graphical) {
      if (this.output.length !== 2) {
        throw new Error('Output must have 2 dimensions on graphical mode');
      }

      if (this.precision === 'precision') {
        this.precision = 'unsigned';
        console.warn('Cannot use graphical mode and single precision at the same time');
      }

      this.texSize = utils.clone(this.output);
      return;
    } else if (this.precision === null && features.isTextureFloat) {
      this.precision = 'single';
    }

    this.texSize = utils.getKernelTextureSize({
      optimizeFloatMemory: this.optimizeFloatMemory,
      precision: this.precision,
    }, this.output);

    this.checkTextureSize();
  }

  updateMaxTexSize() {
    const { texSize, canvas } = this;
    if (this.maxTexSize === null) {
      let canvasIndex = canvases.indexOf(canvas);
      if (canvasIndex === -1) {
        canvasIndex = canvases.length;
        canvases.push(canvas);
        maxTexSizes[canvasIndex] = [texSize[0], texSize[1]];
      }
      this.maxTexSize = maxTexSizes[canvasIndex];
    }
    if (this.maxTexSize[0] < texSize[0]) {
      this.maxTexSize[0] = texSize[0];
    }
    if (this.maxTexSize[1] < texSize[1]) {
      this.maxTexSize[1] = texSize[1];
    }
  }

  // TODO: move channel checks to new place
  _oldtranslateSource() {
    const functionBuilder = FunctionBuilder.fromKernel(this, WebGLFunctionNode, {
      fixIntegerDivisionAccuracy: this.fixIntegerDivisionAccuracy
    });

    // need this line to automatically get returnType
    const translatedSource = functionBuilder.getPrototypeString('kernel');

    if (!this.returnType) {
      this.returnType = functionBuilder.getKernelResultType();
    }

    let requiredChannels = 0;
    const returnTypes = functionBuilder.getReturnTypes();
    for (let i = 0; i < returnTypes.length; i++) {
      switch (returnTypes[i]) {
        case 'Float':
        case 'Number':
        case 'Integer':
          requiredChannels++;
          break;
        case 'Array(2)':
          requiredChannels += 2;
          break;
        case 'Array(3)':
          requiredChannels += 3;
          break;
        case 'Array(4)':
          requiredChannels += 4;
          break;
      }
    }

    if (features && requiredChannels > features.channelCount) {
      throw new Error('Too many channels!');
    }

    return this.translatedSource = translatedSource;
  }

  setupArguments(args) {
    this.kernelArguments = [];
    this.argumentTextureCount = 0;
    const needsArgumentTypes = this.argumentTypes === null;
    // TODO: remove
    if (needsArgumentTypes) {
      this.argumentTypes = [];
    }
    this.argumentSizes = [];
    this.argumentBitRatios = [];
    // TODO: end remove

    if (args.length < this.argumentNames.length) {
      throw new Error('not enough arguments for kernel');
    } else if (args.length > this.argumentNames.length) {
      throw new Error('too many arguments for kernel');
    }

    const { context: gl } = this;
    let textureIndexes = 0;
    for (let index = 0; index < args.length; index++) {
      const value = args[index];
      const name = this.argumentNames[index];
      let type;
      if (needsArgumentTypes) {
        type = utils.getVariableType(value, this.strictIntegers);
        this.argumentTypes.push(type);
      } else {
        type = this.argumentTypes[index];
      }
      const KernelValue = this.constructor.lookupKernelValueType(type, this.dynamicArguments ? 'dynamic' : 'static', this.precision, args[index]);
      if (KernelValue === null) {
        return this.requestFallback(args);
      }
      const kernelArgument = new KernelValue(value, {
        name,
        type,
        tactic: this.tactic,
        origin: 'user',
        context: gl,
        checkContext: this.checkContext,
        kernel: this,
        strictIntegers: this.strictIntegers,
        onRequestTexture: () => {
          return this.context.createTexture();
        },
        onRequestIndex: () => {
          return textureIndexes++;
        },
        onUpdateValueMismatch: () => {
          this.switchingKernels = true;
        },
        onRequestContextHandle: () => {
          return gl.TEXTURE0 + this.constantTextureCount + this.argumentTextureCount++;
        }
      });
      this.kernelArguments.push(kernelArgument);
      this.argumentSizes.push(kernelArgument.textureSize);
      this.argumentBitRatios[index] = kernelArgument.bitRatio;
    }
  }

  setupConstants(args) {
    const { context: gl } = this;
    this.kernelConstants = [];
    this.forceUploadKernelConstants = [];
    let needsConstantTypes = this.constantTypes === null;
    if (needsConstantTypes) {
      this.constantTypes = {};
    }
    this.constantBitRatios = {};
    let textureIndexes = 0;
    for (const name in this.constants) {
      const value = this.constants[name];
      let type;
      if (needsConstantTypes) {
        type = utils.getVariableType(value, this.strictIntegers);
        this.constantTypes[name] = type;
      } else {
        type = this.constantTypes[name];
      }
      const KernelValue = this.constructor.lookupKernelValueType(type, 'static', this.precision, value);
      if (KernelValue === null) {
        return this.requestFallback(args);
      }
      const kernelValue = new KernelValue(value, {
        name,
        type,
        tactic: this.tactic,
        origin: 'constants',
        context: this.context,
        checkContext: this.checkContext,
        kernel: this,
        strictIntegers: this.strictIntegers,
        onRequestTexture: () => {
          return this.context.createTexture();
        },
        onRequestIndex: () => {
          return textureIndexes++;
        },
        onRequestContextHandle: () => {
          return gl.TEXTURE0 + this.constantTextureCount++;
        }
      });
      this.constantBitRatios[name] = kernelValue.bitRatio;
      this.kernelConstants.push(kernelValue);
      if (kernelValue.forceUploadEachRun) {
        this.forceUploadKernelConstants.push(kernelValue);
      }
    }
  }

  build() {
    this.initExtensions();
    this.validateSettings(arguments);
    this.setupConstants(arguments);
    if (this.fallbackRequested) return;
    this.setupArguments(arguments);
    if (this.fallbackRequested) return;
    this.updateMaxTexSize();
    this.translateSource();
    const failureResult = this.pickRenderStrategy(arguments);
    if (failureResult) {
      return failureResult;
    }
    const { texSize, context: gl, canvas } = this;
    gl.enable(gl.SCISSOR_TEST);
    if (this.pipeline && this.precision === 'single') {
      gl.viewport(0, 0, this.maxTexSize[0], this.maxTexSize[1]);
      canvas.width = this.maxTexSize[0];
      canvas.height = this.maxTexSize[1];
    } else {
      gl.viewport(0, 0, this.maxTexSize[0], this.maxTexSize[1]);
      canvas.width = this.maxTexSize[0];
      canvas.height = this.maxTexSize[1];
    }
    const threadDim = this.threadDim = Array.from(this.output);
    while (threadDim.length < 3) {
      threadDim.push(1);
    }

    const compiledVertexShader = this.getVertexShader(arguments);
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, compiledVertexShader);
    gl.compileShader(vertShader);
    this.vertShader = vertShader;

    const compiledFragmentShader = this.getFragmentShader(arguments);
    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, compiledFragmentShader);
    gl.compileShader(fragShader);
    this.fragShader = fragShader;

    if (this.debug) {
      console.log('GLSL Shader Output:');
      console.log(compiledFragmentShader);
    }

    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
      throw new Error('Error compiling vertex shader: ' + gl.getShaderInfoLog(vertShader));
    }
    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
      throw new Error('Error compiling fragment shader: ' + gl.getShaderInfoLog(fragShader));
    }

    const program = this.program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    this.framebuffer = gl.createFramebuffer();
    this.framebuffer.width = texSize[0];
    this.framebuffer.height = texSize[1];

    const vertices = new Float32Array([-1, -1,
      1, -1, -1, 1,
      1, 1
    ]);
    const texCoords = new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      1, 1
    ]);

    const texCoordOffset = vertices.byteLength;

    let buffer = this.buffer;
    if (!buffer) {
      buffer = this.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices.byteLength + texCoords.byteLength, gl.STATIC_DRAW);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    }

    gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
    gl.bufferSubData(gl.ARRAY_BUFFER, texCoordOffset, texCoords);

    const aPosLoc = gl.getAttribLocation(this.program, 'aPos');
    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);
    const aTexCoordLoc = gl.getAttribLocation(this.program, 'aTexCoord');
    gl.enableVertexAttribArray(aTexCoordLoc);
    gl.vertexAttribPointer(aTexCoordLoc, 2, gl.FLOAT, false, 0, texCoordOffset);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);

    let i = 0;
    gl.useProgram(this.program);
    for (let p in this.constants) {
      this.kernelConstants[i++].updateValue(this.constants[p]);
    }

    if (!this.immutable) {
      this._setupOutputTexture();
      if (
        this.subKernels !== null &&
        this.subKernels.length > 0
      ) {
        this._setupSubOutputTextures();
      }
    }
  }

  translateSource() {
    const functionBuilder = FunctionBuilder.fromKernel(this, WebGLFunctionNode, {
      fixIntegerDivisionAccuracy: this.fixIntegerDivisionAccuracy
    });
    this.translatedSource = functionBuilder.getPrototypeString('kernel');
    if (!this.graphical && !this.returnType) {
      this.returnType = functionBuilder.getKernelResultType();
    }

    if (this.subKernels && this.subKernels.length > 0) {
      for (let i = 0; i < this.subKernels.length; i++) {
        const subKernel = this.subKernels[i];
        if (!subKernel.returnType) {
          subKernel.returnType = functionBuilder.getSubKernelResultType(i);
        }
      }
    }
  }

  run() {
    const { kernelArguments, forceUploadKernelConstants } = this;
    const texSize = this.texSize;
    const gl = this.context;

    gl.useProgram(this.program);
    gl.scissor(0, 0, texSize[0], texSize[1]);

    if (this.dynamicOutput) {
      this.setUniform3iv('uOutputDim', new Int32Array(this.threadDim));
      this.setUniform2iv('uTexSize', texSize);
    }

    this.setUniform2f('ratio', texSize[0] / this.maxTexSize[0], texSize[1] / this.maxTexSize[1]);

    this.switchingKernels = false;
    for (let i = 0; i < forceUploadKernelConstants.length; i++) {
      const constant = forceUploadKernelConstants[i];
      constant.updateValue(this.constants[constant.name]);
      if (this.switchingKernels) return;
    }
    for (let i = 0; i < kernelArguments.length; i++) {
      kernelArguments[i].updateValue(arguments[i]);
      if (this.switchingKernels) return;
    }

    if (this.plugins) {
      for (let i = 0; i < this.plugins.length; i++) {
        const plugin = this.plugins[i];
        if (plugin.onBeforeRun) {
          plugin.onBeforeRun(this);
        }
      }
    }

    if (this.graphical) {
      if (this.pipeline) {
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        if (!this.outputTexture || this.immutable) {
          this._setupOutputTexture();
        }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        return new this.TextureConstructor({
          texture: this.outputTexture,
          size: texSize,
          dimensions: this.threadDim,
          output: this.output,
          context: this.context,
        });
      }
      gl.bindRenderbuffer(gl.RENDERBUFFER, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    if (this.immutable) {
      this._setupOutputTexture();
    }

    if (this.subKernels !== null) {
      if (this.immutable) {
        this._setupSubOutputTextures();
      }
      this.extensions.WEBGL_draw_buffers.drawBuffersWEBGL(this.drawBuffersMap);
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * @desc This return defined outputTexture, which is setup in .build(), or if immutable, is defined in .run()
   * @returns {Object} Output Texture Cache
   */
  getOutputTexture() {
    return this.outputTexture;
  }

  /**
   * @desc Setup and replace output texture
   */
  _setupOutputTexture() {
    const gl = this.context;
    const texSize = this.texSize;
    const texture = this.outputTexture = this.context.createTexture();
    gl.activeTexture(gl.TEXTURE0 + this.constantTextureCount + this.argumentTextureCount);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    // if (this.precision === 'single') {
    //   gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
    // } else {
    //   gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    // }
    if (this.precision === 'single') {
      if (this.pipeline) {
        // TODO: investigate if webgl1 can handle gl.RED usage in gl.texImage2D, otherwise, simplify the below
        switch (this.returnType) {
          case 'Number':
          case 'Float':
          case 'Integer':
            if (this.optimizeFloatMemory) {
              gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
            } else {
              gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
            }
            break;
          case 'Array(2)':
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
            break;
          case 'Array(3)':
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
            break;
          case 'Array(4)':
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
            break;
          default:
            if (!this.graphical) {
              throw new Error('Unhandled return type');
            }
        }
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
      }
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  }

  /**
   * @desc Setup and replace sub-output textures
   */
  _setupSubOutputTextures() {
    const gl = this.context;
    const texSize = this.texSize;
    this.drawBuffersMap = [gl.COLOR_ATTACHMENT0];
    this.subKernelOutputTextures = [];
    for (let i = 0; i < this.subKernels.length; i++) {
      const texture = this.context.createTexture();
      this.subKernelOutputTextures.push(texture);
      this.drawBuffersMap.push(gl.COLOR_ATTACHMENT0 + i + 1);
      gl.activeTexture(gl.TEXTURE0 + this.constantTextureCount + this.argumentTextureCount + i);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      if (this.precision === 'single') {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i + 1, gl.TEXTURE_2D, texture, 0);
    }
  }

  /**
   * @desc Returns the Texture Cache of the supplied parameter (can be kernel, sub-kernel or argument)
   * @param {String} name - Name of the subkernel, argument, or kernel.
   * @returns {Object} Texture cache
   */
  getTextureCache(name) {
    if (this.textureCache.hasOwnProperty(name)) {
      return this.textureCache[name];
    }
    return this.textureCache[name] = this.context.createTexture();
  }

  /**
   * @desc removes a texture from the kernel's cache
   * @param {String} name - Name of texture
   */
  detachTextureCache(name) {
    delete this.textureCache[name];
  }

  setUniform1f(name, value) {
    if (this.uniform1fCache.hasOwnProperty(name)) {
      const cache = this.uniform1fCache[name];
      if (value === cache) {
        return;
      }
    }
    this.uniform1fCache[name] = value;
    const loc = this.getUniformLocation(name);
    this.context.uniform1f(loc, value);
  }

  setUniform1i(name, value) {
    if (this.uniform1iCache.hasOwnProperty(name)) {
      const cache = this.uniform1iCache[name];
      if (value === cache) {
        return;
      }
    }
    this.uniform1iCache[name] = value;
    const loc = this.getUniformLocation(name);
    this.context.uniform1i(loc, value);
  }

  setUniform2f(name, value1, value2) {
    if (this.uniform2fCache.hasOwnProperty(name)) {
      const cache = this.uniform2fCache[name];
      if (
        value1 === cache[0] &&
        value2 === cache[1]
      ) {
        return;
      }
    }
    this.uniform2fCache[name] = [value1, value2];
    const loc = this.getUniformLocation(name);
    this.context.uniform2f(loc, value1, value2);
  }

  setUniform2fv(name, value) {
    if (this.uniform2fvCache.hasOwnProperty(name)) {
      const cache = this.uniform2fvCache[name];
      if (
        value[0] === cache[0] &&
        value[1] === cache[1]
      ) {
        return;
      }
    }
    this.uniform2fvCache[name] = value;
    const loc = this.getUniformLocation(name);
    this.context.uniform2fv(loc, value);
  }

  setUniform2iv(name, value) {
    if (this.uniform2ivCache.hasOwnProperty(name)) {
      const cache = this.uniform2ivCache[name];
      if (
        value[0] === cache[0] &&
        value[1] === cache[1]
      ) {
        return;
      }
    }
    this.uniform2ivCache[name] = value;
    const loc = this.getUniformLocation(name);
    this.context.uniform2iv(loc, value);
  }

  setUniform3fv(name, value) {
    if (this.uniform3fvCache.hasOwnProperty(name)) {
      const cache = this.uniform3fvCache[name];
      if (
        value[0] === cache[0] &&
        value[1] === cache[1] &&
        value[2] === cache[2]
      ) {
        return;
      }
    }
    this.uniform3fvCache[name] = value;
    const loc = this.getUniformLocation(name);
    this.context.uniform3fv(loc, value);
  }

  setUniform3iv(name, value) {
    if (this.uniform3ivCache.hasOwnProperty(name)) {
      const cache = this.uniform3ivCache[name];
      if (
        value[0] === cache[0] &&
        value[1] === cache[1] &&
        value[2] === cache[2]
      ) {
        return;
      }
    }
    this.uniform3ivCache[name] = value;
    const loc = this.getUniformLocation(name);
    this.context.uniform3iv(loc, value);
  }

  setUniform3fv(name, value) {
    if (this.uniform3fvCache.hasOwnProperty(name)) {
      const cache = this.uniform3fvCache[name];
      if (
        value[0] === cache[0] &&
        value[1] === cache[1] &&
        value[2] === cache[2]
      ) {
        return;
      }
    }
    this.uniform3fvCache[name] = value;
    const loc = this.getUniformLocation(name);
    this.context.uniform3fv(loc, value);
  }

  setUniform4iv(name, value) {
    if (this.uniform4ivCache.hasOwnProperty(name)) {
      const cache = this.uniform4ivCache[name];
      if (
        value[0] === cache[0] &&
        value[1] === cache[1] &&
        value[2] === cache[2] &&
        value[3] === cache[3]
      ) {
        return;
      }
    }
    this.uniform4ivCache[name] = value;
    const loc = this.getUniformLocation(name);
    this.context.uniform4iv(loc, value);
  }

  setUniform4fv(name, value) {
    if (this.uniform4fvCache.hasOwnProperty(name)) {
      const cache = this.uniform4fvCache[name];
      if (
        value[0] === cache[0] &&
        value[1] === cache[1] &&
        value[2] === cache[2] &&
        value[3] === cache[3]
      ) {
        return;
      }
    }
    this.uniform4fvCache[name] = value;
    const loc = this.getUniformLocation(name);
    this.context.uniform4fv(loc, value);
  }

  /**
   * @desc Return WebGlUniformLocation for various variables
   * related to webGl program, such as user-defined variables,
   * as well as, dimension sizes, etc.
   */
  getUniformLocation(name) {
    if (this.programUniformLocationCache.hasOwnProperty(name)) {
      return this.programUniformLocationCache[name];
    }
    return this.programUniformLocationCache[name] = this.context.getUniformLocation(this.program, name);
  }

  /**
   * @desc Generate Shader artifacts for the kernel program.
   * The final object contains HEADER, KERNEL, MAIN_RESULT, and others.
   *
   * @param {Array} args - The actual parameters sent to the Kernel
   * @returns {Object} An object containing the Shader Artifacts(CONSTANTS, HEADER, KERNEL, etc.)
   */
  _getFragShaderArtifactMap(args) {
    return {
      HEADER: this._getHeaderString(),
      LOOP_MAX: this._getLoopMaxString(),
      PLUGINS: this._getPluginsString(),
      CONSTANTS: this._getConstantsString(),
      DECODE32_ENDIANNESS: this._getDecode32EndiannessString(),
      ENCODE32_ENDIANNESS: this._getEncode32EndiannessString(),
      DIVIDE_WITH_INTEGER_CHECK: this._getDivideWithIntegerCheckString(),
      INJECTED_NATIVE: this._getInjectedNative(),
      MAIN_CONSTANTS: this._getMainConstantsString(),
      MAIN_ARGUMENTS: this._getMainArgumentsString(args),
      KERNEL: this.getKernelString(),
      MAIN_RESULT: this.getMainResultString(),
      FLOAT_TACTIC_DECLARATION: this.getFloatTacticDeclaration(),
      INT_TACTIC_DECLARATION: this.getIntTacticDeclaration(),
      SAMPLER_2D_TACTIC_DECLARATION: this.getSampler2DTacticDeclaration(),
      SAMPLER_2D_ARRAY_TACTIC_DECLARATION: this.getSampler2DArrayTacticDeclaration(),
    };
  }

  /**
   * @desc Generate Shader artifacts for the kernel program.
   * The final object contains HEADER, KERNEL, MAIN_RESULT, and others.
   *
   * @param {Array} args - The actual parameters sent to the Kernel
   * @returns {Object} An object containing the Shader Artifacts(CONSTANTS, HEADER, KERNEL, etc.)
   */
  _getVertShaderArtifactMap(args) {
    return {
      FLOAT_TACTIC_DECLARATION: this.getFloatTacticDeclaration(),
      INT_TACTIC_DECLARATION: this.getIntTacticDeclaration(),
      SAMPLER_2D_TACTIC_DECLARATION: this.getSampler2DTacticDeclaration(),
      SAMPLER_2D_ARRAY_TACTIC_DECLARATION: this.getSampler2DArrayTacticDeclaration(),
    };
  }

  /**
   * @desc Get the header string for the program.
   * This returns an empty string if no sub-kernels are defined.
   *
   * @returns {String} result
   */
  _getHeaderString() {
    return (
      this.subKernels !== null ?
      '#extension GL_EXT_draw_buffers : require\n' :
      ''
    );
  }

  /**
   * @desc Get the maximum loop size String.
   * @returns {String} result
   */
  _getLoopMaxString() {
    return (
      this.loopMaxIterations ?
      ` ${parseInt(this.loopMaxIterations)};\n` :
      ' 1000;\n'
    );
  }

  _getPluginsString() {
    if (!this.plugins) return '\n';
    return this.plugins.map(plugin => plugin.source && this.source.match(plugin.functionMatch) ? plugin.source : '').join('\n');
  }

  /**
   * @desc Generate transpiled glsl Strings for constant parameters sent to a kernel
   * @returns {String} result
   */
  _getConstantsString() {
    const result = [];
    const { threadDim, texSize } = this;
    if (this.dynamicOutput) {
      result.push(
        'uniform ivec3 uOutputDim',
        'uniform ivec2 uTexSize'
      );
    } else {
      result.push(
        `ivec3 uOutputDim = ivec3(${threadDim[0]}, ${threadDim[1]}, ${threadDim[2]})`,
        `ivec2 uTexSize = ivec2(${texSize[0]}, ${texSize[1]})`
      );
    }
    return utils.linesToString(result);
  }

  /**
   * @desc Get texture coordinate string for the program
   * @returns {String} result
   */
  _getTextureCoordinate() {
    const subKernels = this.subKernels;
    if (subKernels === null || subKernels.length < 1) {
      return 'varying vec2 vTexCoord;\n';
    } else {
      return 'out vec2 vTexCoord;\n';
    }
  }

  /**
   * @desc Get Decode32 endianness string for little-endian and big-endian
   * @returns {String} result
   */
  _getDecode32EndiannessString() {
    return (
      this.endianness === 'LE' ?
      '' :
      '  texel.rgba = texel.abgr;\n'
    );
  }

  /**
   * @desc Get Encode32 endianness string for little-endian and big-endian
   * @returns {String} result
   */
  _getEncode32EndiannessString() {
    return (
      this.endianness === 'LE' ?
      '' :
      '  texel.rgba = texel.abgr;\n'
    );
  }

  /**
   * @desc if fixIntegerDivisionAccuracy provide method to replace /
   * @returns {String} result
   */
  _getDivideWithIntegerCheckString() {
    return this.fixIntegerDivisionAccuracy ?
      `float div_with_int_check(float x, float y) {
  if (floor(x) == x && floor(y) == y && integerMod(x, y) == 0.0) {
    return float(int(x)/int(y));
  }
  return x / y;
}` :
      '';
  }

  /**
   * @desc Generate transpiled glsl Strings for user-defined parameters sent to a kernel
   * @param {Array} args - The actual parameters sent to the Kernel
   * @returns {String} result
   */
  _getMainArgumentsString(args) {
    const results = [];
    const { argumentNames } = this;
    for (let i = 0; i < argumentNames.length; i++) {
      results.push(this.kernelArguments[i].getSource(args[i]));
    }
    return results.join('');
  }

  _getInjectedNative() {
    return this.injectedNative || '';
  }

  _getMainConstantsString() {
    const result = [];
    const { constants } = this;
    if (constants) {
      let i = 0;
      for (const name in constants) {
        result.push(this.kernelConstants[i++].getSource(this.constants[name]));
      }
    }
    return result.join('');
  }

  /**
   * @desc Get Kernel program string (in *glsl*) for a kernel.
   * @returns {String} result
   */
  getKernelString() {
    let kernelResultDeclaration;
    switch (this.returnType) {
      case 'Array(2)':
        kernelResultDeclaration = 'vec2 kernelResult';
        break;
      case 'Array(3)':
        kernelResultDeclaration = 'vec3 kernelResult';
        break;
      case 'Array(4)':
        kernelResultDeclaration = 'vec4 kernelResult';
        break;
      case 'LiteralInteger':
      case 'Float':
      case 'Number':
      case 'Integer':
        kernelResultDeclaration = 'float kernelResult';
        break;
      default:
        if (this.graphical) {
          kernelResultDeclaration = 'float kernelResult';
        } else {
          throw new Error(`unrecognized output type "${ this.returnType }"`);
        }
    }

    const result = [];
    const subKernels = this.subKernels;
    if (subKernels !== null) {
      result.push(
        kernelResultDeclaration
      );
      switch (this.returnType) {
        case 'Number':
        case 'Float':
        case 'Integer':
          for (let i = 0; i < subKernels.length; i++) {
            const subKernel = subKernels[i];
            result.push(
              subKernel.returnType === 'Integer' ?
              `int subKernelResult_${ subKernel.name } = 0` :
              `float subKernelResult_${ subKernel.name } = 0.0`
            );
          }
          break;
        case 'Array(2)':
          for (let i = 0; i < subKernels.length; i++) {
            result.push(
              `vec2 subKernelResult_${ subKernels[i].name }`
            );
          }
          break;
        case 'Array(3)':
          for (let i = 0; i < subKernels.length; i++) {
            result.push(
              `vec3 subKernelResult_${ subKernels[i].name }`
            );
          }
          break;
        case 'Array(4)':
          for (let i = 0; i < subKernels.length; i++) {
            result.push(
              `vec4 subKernelResult_${ subKernels[i].name }`
            );
          }
          break;
      }
    } else {
      result.push(
        kernelResultDeclaration
      );
    }

    return utils.linesToString(result) + this.translatedSource;
  }

  getMainResultGraphical() {
    return utils.linesToString([
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      '  gl_FragColor = actualColor',
    ]);
  }

  getMainResultPackedPixels() {
    switch (this.returnType) {
      case 'LiteralInteger':
      case 'Number':
      case 'Integer':
      case 'Float':
        return this.getMainResultKernelPackedPixels() +
          this.getMainResultSubKernelPackedPixels();
      default:
        throw new Error(`packed output only usable with Numbers, "${this.returnType}" specified`);
    }
  }

  /**
   * @return {String}
   */
  getMainResultKernelPackedPixels() {
    return utils.linesToString([
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      `  gl_FragData[0] = ${this.useLegacyEncoder ? 'legacyEncode32' : 'encode32'}(kernelResult)`
    ]);
  }

  /**
   * @return {String}
   */
  getMainResultSubKernelPackedPixels() {
    const result = [];
    if (!this.subKernels) return '';
    for (let i = 0; i < this.subKernels.length; i++) {
      const subKernel = this.subKernels[i];
      if (subKernel.returnType === 'Integer') {
        result.push(
          `  gl_FragData[${i + 1}] = ${this.useLegacyEncoder ? 'legacyEncode32' : 'encode32'}(float(subKernelResult_${this.subKernels[i].name}))`
        );
      } else {
        result.push(
          `  gl_FragData[${i + 1}] = ${this.useLegacyEncoder ? 'legacyEncode32' : 'encode32'}(subKernelResult_${this.subKernels[i].name})`
        );
      }
    }
    return utils.linesToString(result);
  }

  getMainResultMemoryOptimizedFloats() {
    const result = [
      '  index *= 4',
    ];

    switch (this.returnType) {
      case 'Number':
      case 'Integer':
      case 'Float':
        const channels = ['r', 'g', 'b', 'a'];
        for (let i = 0; i < channels.length; i++) {
          const channel = channels[i];
          this.getMainResultKernelMemoryOptimizedFloats(result, channel);
          this.getMainResultSubKernelMemoryOptimizedFloats(result, channel);
          if (i + 1 < channels.length) {
            result.push('  index += 1');
          }
        }
        break;
      default:
        throw new Error(`optimized output only usable with Numbers, ${this.returnType} specified`);
    }

    return utils.linesToString(result);
  }

  getMainResultKernelMemoryOptimizedFloats(result, channel) {
    result.push(
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      `  gl_FragData[0].${channel} = kernelResult`,
    );
  }

  getMainResultSubKernelMemoryOptimizedFloats(result, channel) {
    if (!this.subKernels) return result;
    for (let i = 0; i < this.subKernels.length; i++) {
      const subKernel = this.subKernels[i];
      if (subKernel.returnType === 'Integer') {
        result.push(
          `  gl_FragData[${i + 1}].${channel} = float(subKernelResult_${this.subKernels[i].name})`,
        );
      } else {
        result.push(
          `  gl_FragData[${i + 1}].${channel} = subKernelResult_${this.subKernels[i].name}`,
        );
      }
    }
  }

  getMainResultKernelNumberTexture() {
    return [
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      '  gl_FragData[0][0] = kernelResult',
    ];
  }

  getMainResultSubKernelNumberTexture() {
    const result = [];
    if (!this.subKernels) return result;
    for (let i = 0; i < this.subKernels.length; ++i) {
      const subKernel = this.subKernels[i];
      if (subKernel.returnType === 'Integer') {
        result.push(
          `  gl_FragData[${i + 1}][0] = float(subKernelResult_${subKernel.name})`,
        );
      } else {
        result.push(
          `  gl_FragData[${i + 1}][0] = subKernelResult_${subKernel.name}`,
        );
      }
    }
    return result;
  }

  getMainResultKernelArray2Texture() {
    return [
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      '  gl_FragData[0][0] = kernelResult[0]',
      '  gl_FragData[0][1] = kernelResult[1]',
    ];
  }

  getMainResultSubKernelArray2Texture() {
    const result = [];
    if (!this.subKernels) return result;
    for (let i = 0; i < this.subKernels.length; ++i) {
      result.push(
        `  gl_FragData[${i + 1}][0] = subKernelResult_${this.subKernels[i].name}[0]`,
        `  gl_FragData[${i + 1}][1] = subKernelResult_${this.subKernels[i].name}[1]`,
      );
    }
    return result;
  }

  getMainResultKernelArray3Texture() {
    return [
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      '  gl_FragData[0][0] = kernelResult[0]',
      '  gl_FragData[0][1] = kernelResult[1]',
      '  gl_FragData[0][2] = kernelResult[2]',
    ];
  }

  getMainResultSubKernelArray3Texture() {
    const result = [];
    if (!this.subKernels) return result;
    for (let i = 0; i < this.subKernels.length; ++i) {
      result.push(
        `  gl_FragData[${i + 1}][0] = subKernelResult_${this.subKernels[i].name}[0]`,
        `  gl_FragData[${i + 1}][1] = subKernelResult_${this.subKernels[i].name}[1]`,
        `  gl_FragData[${i + 1}][2] = subKernelResult_${this.subKernels[i].name}[2]`,
      );
    }
    return result;
  }

  getMainResultKernelArray4Texture() {
    return [
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      '  gl_FragData[0] = kernelResult',
    ];
  }

  getMainResultSubKernelArray4Texture() {
    const result = [];
    if (!this.subKernels) return result;
    switch (this.returnType) {
      case 'Number':
      case 'Float':
      case 'Integer':
        for (let i = 0; i < this.subKernels.length; ++i) {
          const subKernel = this.subKernels[i];
          if (subKernel.returnType === 'Integer') {
            result.push(
              `  gl_FragData[${i + 1}] = float(subKernelResult_${this.subKernels[i].name})`,
            );
          } else {
            result.push(
              `  gl_FragData[${i + 1}] = subKernelResult_${this.subKernels[i].name}`,
            );
          }
        }
        break;
      case 'Array(2)':
        for (let i = 0; i < this.subKernels.length; ++i) {
          result.push(
            `  gl_FragData[${i + 1}][0] = subKernelResult_${this.subKernels[i].name}[0]`,
            `  gl_FragData[${i + 1}][1] = subKernelResult_${this.subKernels[i].name}[1]`,
          );
        }
        break;
      case 'Array(3)':
        for (let i = 0; i < this.subKernels.length; ++i) {
          result.push(
            `  gl_FragData[${i + 1}][0] = subKernelResult_${this.subKernels[i].name}[0]`,
            `  gl_FragData[${i + 1}][1] = subKernelResult_${this.subKernels[i].name}[1]`,
            `  gl_FragData[${i + 1}][2] = subKernelResult_${this.subKernels[i].name}[2]`,
          );
        }
        break;
      case 'Array(4)':
        for (let i = 0; i < this.subKernels.length; ++i) {
          result.push(
            `  gl_FragData[${i + 1}][0] = subKernelResult_${this.subKernels[i].name}[0]`,
            `  gl_FragData[${i + 1}][1] = subKernelResult_${this.subKernels[i].name}[1]`,
            `  gl_FragData[${i + 1}][2] = subKernelResult_${this.subKernels[i].name}[2]`,
            `  gl_FragData[${i + 1}][3] = subKernelResult_${this.subKernels[i].name}[3]`,
          );
        }
        break;
    }

    return result;
  }

  /**
   * @param {String} src - Shader string
   * @param {Object} map - Variables/Constants associated with shader
   */
  replaceArtifacts(src, map) {
    return src.replace(/[ ]*__([A-Z]+[0-9]*([_]?[A-Z]*[0-9]?)*)__;\n/g, (match, artifact) => {
      if (map.hasOwnProperty(artifact)) {
        return map[artifact];
      }
      throw `unhandled artifact ${artifact}`;
    });
  }

  /**
   * @desc Get the fragment shader String.
   * If the String hasn't been compiled yet,
   * then this method compiles it as well
   *
   * @param {Array} args - The actual parameters sent to the Kernel
   * @returns {string} Fragment Shader string
   */
  getFragmentShader(args) {
    if (this.compiledFragmentShader !== null) {
      return this.compiledFragmentShader;
    }
    return this.compiledFragmentShader = this.replaceArtifacts(this.constructor.fragmentShader, this._getFragShaderArtifactMap(args));
  }

  /**
   * @desc Get the vertical shader String
   * @param {Array|IArguments} args - The actual parameters sent to the Kernel
   * @returns {string} Vertical Shader string
   */
  getVertexShader(args) {
    if (this.compiledVertexShader !== null) {
      return this.compiledVertexShader;
    }
    return this.compiledVertexShader = this.replaceArtifacts(this.constructor.vertexShader, this._getVertShaderArtifactMap(args));
  }

  /**
   * @desc Returns the *pre-compiled* Kernel as a JS Object String, that can be reused.
   */
  toString() {
    const setupContextString = utils.linesToString([
      `const gl = context`,
    ]);
    return glKernelString(this.constructor, arguments, this, setupContextString);
  }

  destroy(removeCanvasReferences) {
    if (this.outputTexture) {
      this.context.deleteTexture(this.outputTexture);
    }
    if (this.buffer) {
      this.context.deleteBuffer(this.buffer);
    }
    if (this.framebuffer) {
      this.context.deleteFramebuffer(this.framebuffer);
    }
    if (this.vertShader) {
      this.context.deleteShader(this.vertShader);
    }
    if (this.fragShader) {
      this.context.deleteShader(this.fragShader);
    }
    if (this.program) {
      this.context.deleteProgram(this.program);
    }

    const keys = Object.keys(this.textureCache);

    for (let i = 0; i < keys.length; i++) {
      const name = keys[i];
      this.context.deleteTexture(this.textureCache[name]);
    }

    if (this.subKernelOutputTextures) {
      for (let i = 0; i < this.subKernelOutputTextures.length; i++) {
        this.context.deleteTexture(this.subKernelOutputTextures[i]);
      }
    }
    if (removeCanvasReferences) {
      const idx = canvases.indexOf(this.canvas);
      if (idx >= 0) {
        canvases[idx] = null;
        maxTexSizes[idx] = null;
      }
    }
    this.destroyExtensions();
    delete this.context;
    delete this.canvas;
  }

  destroyExtensions() {
    this.extensions.OES_texture_float = null;
    this.extensions.OES_texture_float_linear = null;
    this.extensions.OES_element_index_uint = null;
    this.extensions.WEBGL_draw_buffers = null;
  }

  static destroyContext(context) {
    const extension = context.getExtension('WEBGL_lose_context');
    if (extension) {
      extension.loseContext();
    }
  }

  toJSON() {
    const json = super.toJSON();
    json.functionNodes = FunctionBuilder.fromKernel(this, WebGLFunctionNode).toJSON();
    return json;
  }
}
