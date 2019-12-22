const { WebGLKernel } = require('../web-gl/kernel');
const { WebGL2FunctionNode } = require('./function-node');
const { FunctionBuilder } = require('../function-builder');
const { utils } = require('../../utils');
const { fragmentShader } = require('./fragment-shader');
const { vertexShader } = require('./vertex-shader');
const { lookupKernelValueType } = require('./kernel-value-maps');

let isSupported = null;
/**
 *
 * @type {HTMLCanvasElement|OffscreenCanvas}
 */
let testCanvas = null;
/**
 *
 * @type {WebGLRenderingContext}
 */
let testContext = null;
let testExtensions = null;

/**
 *
 * @type {IKernelFeatures}
 */
let features = null;

/**
 * @extends WebGLKernel
 */
class WebGL2Kernel extends WebGLKernel {
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
    testContext = testCanvas.getContext('webgl2');
    if (!testContext || !testContext.getExtension) return;
    testExtensions = {
      EXT_color_buffer_float: testContext.getExtension('EXT_color_buffer_float'),
      OES_texture_float_linear: testContext.getExtension('OES_texture_float_linear'),
    };
    features = this.getFeatures();
  }

  static isContextMatch(context) {
    // from global
    if (typeof WebGL2RenderingContext !== 'undefined') {
      return context instanceof WebGL2RenderingContext;
    }
    return false;
  }

  /**
   *
   * @return {IKernelFeatures}
   */
  static getFeatures() {
    const gl = this.testContext;
    return Object.freeze({
      isFloatRead: this.getIsFloatRead(),
      isIntegerDivisionAccurate: this.getIsIntegerDivisionAccurate(),
      kernelMap: true,
      isTextureFloat: true,
      isDrawBuffers: true,
      channelCount: this.getChannelCount(),
      maxTextureSize: this.getMaxTextureSize(),
      lowIntPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.LOW_INT),
      lowFloatPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.LOW_FLOAT),
      mediumIntPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_INT),
      mediumFloatPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT),
      highIntPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_INT),
      highFloatPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT),
    });
  }

  static getIsTextureFloat() {
    return true;
  }

  static getIsIntegerDivisionAccurate() {
    return super.getIsIntegerDivisionAccurate();
  }

  static getChannelCount() {
    return testContext.getParameter(testContext.MAX_DRAW_BUFFERS);
  }

  static getMaxTextureSize() {
    return testContext.getParameter(testContext.MAX_TEXTURE_SIZE);
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

  /**
   *
   * @returns {{isFloatRead: Boolean, isIntegerDivisionAccurate: Boolean, kernelMap: Boolean, isTextureFloat: Boolean}}
   */
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
   * @return {WebGLRenderingContext|WebGL2RenderingContext}
   */
  initContext() {
    const settings = {
      alpha: false,
      depth: false,
      antialias: false
    };
    return this.canvas.getContext('webgl2', settings);
  }

  initExtensions() {
    this.extensions = {
      EXT_color_buffer_float: this.context.getExtension('EXT_color_buffer_float'),
      OES_texture_float_linear: this.context.getExtension('OES_texture_float_linear'),
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
    if (this.precision === 'single' && !features.isFloatRead) {
      throw new Error('Float texture outputs are not supported');
    } else if (!this.graphical && this.precision === null) {
      this.precision = features.isFloatRead ? 'single' : 'unsigned';
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
      switch (argType) {
        case 'Array':
          this.output = utils.getDimensions(argType);
          break;
        case 'NumberTexture':
        case 'MemoryOptimizedNumberTexture':
        case 'ArrayTexture(1)':
        case 'ArrayTexture(2)':
        case 'ArrayTexture(3)':
        case 'ArrayTexture(4)':
          this.output = args[0].output;
          break;
        default:
          throw new Error('Auto output not supported for input type: ' + argType);
      }
    }

    if (this.graphical) {
      if (this.output.length !== 2) {
        throw new Error('Output must have 2 dimensions on graphical mode');
      }

      if (this.precision === 'single') {
        console.warn('Cannot use graphical mode and single precision at the same time');
        this.precision = 'unsigned';
      }

      this.texSize = utils.clone(this.output);
      return;
    } else if (!this.graphical && this.precision === null && features.isTextureFloat) {
      this.precision = 'single';
    }

    this.texSize = utils.getKernelTextureSize({
      optimizeFloatMemory: this.optimizeFloatMemory,
      precision: this.precision,
    }, this.output);

    this.checkTextureSize();
  }

  translateSource() {
    const functionBuilder = FunctionBuilder.fromKernel(this, WebGL2FunctionNode, {
      fixIntegerDivisionAccuracy: this.fixIntegerDivisionAccuracy
    });
    this.translatedSource = functionBuilder.getPrototypeString('kernel');
    this.setupReturnTypes(functionBuilder);
  }

  drawBuffers() {
    this.context.drawBuffers(this.drawBuffersMap);
  }

  getTextureFormat() {
    const { context: gl } = this;
    switch (this.getInternalFormat()) {
      case gl.R32F:
        return gl.RED;
      case gl.RG32F:
        return gl.RG;
      case gl.RGBA32F:
        return gl.RGBA;
      case gl.RGBA:
        return gl.RGBA;
      default:
        throw new Error('Unknown internal format');
    }
  }
  getInternalFormat() {
    const { context: gl, optimizeFloatMemory, pipeline, precision } = this;

    if (this.precision === 'single') {
      if (this.pipeline) {
        switch (this.returnType) {
          case 'Number':
          case 'Float':
          case 'Integer':
            if (this.optimizeFloatMemory) {
              return gl.RGBA32F;
            } else {
              return gl.R32F;
            }
            case 'Array(2)':
              return gl.RG32F;
            case 'Array(3)': // there is _no_ 3 channel format which is guaranteed to be color-renderable
            case 'Array(4)':
              return gl.RGBA32F;
            default:
              throw new Error('Unhandled return type');
        }
      }
      return gl.RGBA32F;
    }
    return gl.RGBA;
  }

  _setupOutputTexture() {
    const { context: gl } = this;
    if (this.texture) {
      this.texture.beforeMutate();
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture.texture, 0);
      return;
    }
    const texture = this.outputTexture = gl.createTexture();
    const { texSize } = this;
    gl.activeTexture(gl.TEXTURE0 + this.constantTextureCount + this.argumentTextureCount);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    const format = this.getInternalFormat();
    if (this.precision === 'single') {
      gl.texStorage2D(gl.TEXTURE_2D, 1, format, texSize[0], texSize[1]);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, format, texSize[0], texSize[1], 0, format, gl.UNSIGNED_BYTE, null);
    }
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    this.texture = new this.TextureConstructor({
      texture,
      size: texSize,
      dimensions: this.threadDim,
      output: this.output,
      context: this.context,
      internalFormat: this.getInternalFormat(),
      textureFormat: this.getTextureFormat(),
      kernel: this,
    });
  }

  _setupSubOutputTextures() {
    const { context: gl } = this;
    if (this.mappedTextures && this.mappedTextures.length > 0) {
      for (let i = 0; i < this.mappedTextures.length; i++) {
        const mappedTexture = this.mappedTextures[i];
        mappedTexture.beforeMutate();
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i + 1, gl.TEXTURE_2D, mappedTexture.texture, 0);
      }
      return;
    }
    const { texSize } = this;
    this.drawBuffersMap = [gl.COLOR_ATTACHMENT0];
    this.mappedTextures = [];
    this.prevMappedInputs = {};
    for (let i = 0; i < this.subKernels.length; i++) {
      const texture = this.createTexture();
      this.drawBuffersMap.push(gl.COLOR_ATTACHMENT0 + i + 1);
      gl.activeTexture(gl.TEXTURE0 + this.constantTextureCount + this.argumentTextureCount + i);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      // TODO: upgrade this
      const format = this.getInternalFormat();
      if (this.precision === 'single') {
        gl.texStorage2D(gl.TEXTURE_2D, 1, format, texSize[0], texSize[1]);
        // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i + 1, gl.TEXTURE_2D, texture, 0);

      this.mappedTextures.push(new this.TextureConstructor({
        texture,
        size: texSize,
        dimensions: this.threadDim,
        output: this.output,
        context: this.context,
        internalFormat: this.getInternalFormat(),
        textureFormat: this.getTextureFormat(),
        kernel: this,
      }));
    }
  }

  /**
   *
   * @desc Get the header string for the program.
   * This returns an empty string if no sub-kernels are defined.
   *
   * @returns {String} result
   */
  _getHeaderString() {
    return '';
  }

  /**
   * @desc Get texture coordinate string for the program
   * @returns {String} result
   */
  _getTextureCoordinate() {
    const subKernels = this.subKernels;
    const variablePrecision = this.getVariablePrecisionString(this.texSize, this.tactic);
    if (subKernels === null || subKernels.length < 1) {
      return `in ${ variablePrecision } vec2 vTexCoord;\n`;
    } else {
      return `out ${ variablePrecision } vec2 vTexCoord;\n`;
    }
  }

  /**
   * @desc Generate transpiled glsl Strings for user-defined parameters sent to a kernel
   * @param {Array} args - The actual parameters sent to the Kernel
   * @returns {String} result
   */
  _getMainArgumentsString(args) {
    const result = [];
    const argumentNames = this.argumentNames;
    for (let i = 0; i < argumentNames.length; i++) {
      result.push(this.kernelArguments[i].getSource(args[i]));
    }
    return result.join('');
  }

  /**
   * @desc Get Kernel program string (in *glsl*) for a kernel.
   * @returns {String} result
   */
  getKernelString() {
    const result = [];
    const subKernels = this.subKernels;
    if (subKernels !== null) {
      result.push(
        this.getKernelResultDeclaration(),
        'layout(location = 0) out vec4 data0'
      );
      for (let i = 0; i < subKernels.length; i++) {
        const subKernel = subKernels[i];
        result.push(
          subKernel.returnType === 'Integer' ?
          `int subKernelResult_${ subKernel.name } = 0` :
          `float subKernelResult_${ subKernel.name } = 0.0`,
          `layout(location = ${ i + 1 }) out vec4 data${ i + 1 }`
        );
      }
    } else {
      result.push(
        'out vec4 data0',
        this.getKernelResultDeclaration()
      );
    }

    return utils.linesToString(result) + this.translatedSource;
  }

  getMainResultGraphical() {
    return utils.linesToString([
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      '  data0 = actualColor',
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
      `  data0 = ${this.useLegacyEncoder ? 'legacyEncode32' : 'encode32'}(kernelResult)`
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
          `  data${i + 1} = ${this.useLegacyEncoder ? 'legacyEncode32' : 'encode32'}(float(subKernelResult_${this.subKernels[i].name}))`
        );
      } else {
        result.push(
          `  data${i + 1} = ${this.useLegacyEncoder ? 'legacyEncode32' : 'encode32'}(subKernelResult_${this.subKernels[i].name})`
        );
      }
    }
    return utils.linesToString(result);
  }

  getMainResultKernelMemoryOptimizedFloats(result, channel) {
    result.push(
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      `  data0.${channel} = kernelResult`,
    );
  }

  getMainResultSubKernelMemoryOptimizedFloats(result, channel) {
    if (!this.subKernels) return result;
    for (let i = 0; i < this.subKernels.length; i++) {
      const subKernel = this.subKernels[i];
      if (subKernel.returnType === 'Integer') {
        result.push(
          `  data${i + 1}.${channel} = float(subKernelResult_${subKernel.name})`,
        );
      } else {
        result.push(
          `  data${i + 1}.${channel} = subKernelResult_${subKernel.name}`,
        );
      }
    }
  }

  getMainResultKernelNumberTexture() {
    return [
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      '  data0[0] = kernelResult',
    ];
  }

  getMainResultSubKernelNumberTexture() {
    const result = [];
    if (!this.subKernels) return result;
    for (let i = 0; i < this.subKernels.length; ++i) {
      const subKernel = this.subKernels[i];
      if (subKernel.returnType === 'Integer') {
        result.push(
          `  data${i + 1}[0] = float(subKernelResult_${subKernel.name})`,
        );
      } else {
        result.push(
          `  data${i + 1}[0] = subKernelResult_${subKernel.name}`,
        );
      }
    }
    return result;
  }

  getMainResultKernelArray2Texture() {
    return [
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      '  data0[0] = kernelResult[0]',
      '  data0[1] = kernelResult[1]',
    ];
  }

  getMainResultSubKernelArray2Texture() {
    const result = [];
    if (!this.subKernels) return result;
    for (let i = 0; i < this.subKernels.length; ++i) {
      const subKernel = this.subKernels[i];
      result.push(
        `  data${i + 1}[0] = subKernelResult_${subKernel.name}[0]`,
        `  data${i + 1}[1] = subKernelResult_${subKernel.name}[1]`,
      );
    }
    return result;
  }

  getMainResultKernelArray3Texture() {
    return [
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      '  data0[0] = kernelResult[0]',
      '  data0[1] = kernelResult[1]',
      '  data0[2] = kernelResult[2]',
    ];
  }

  getMainResultSubKernelArray3Texture() {
    const result = [];
    if (!this.subKernels) return result;
    for (let i = 0; i < this.subKernels.length; ++i) {
      const subKernel = this.subKernels[i];
      result.push(
        `  data${i + 1}[0] = subKernelResult_${subKernel.name}[0]`,
        `  data${i + 1}[1] = subKernelResult_${subKernel.name}[1]`,
        `  data${i + 1}[2] = subKernelResult_${subKernel.name}[2]`,
      );
    }
    return result;
  }

  getMainResultKernelArray4Texture() {
    return [
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      '  data0 = kernelResult',
    ];
  }

  getMainResultSubKernelArray4Texture() {
    const result = [];
    if (!this.subKernels) return result;
    for (let i = 0; i < this.subKernels.length; ++i) {
      result.push(
        `  data${i + 1} = subKernelResult_${this.subKernels[i].name}`,
      );
    }
    return result;
  }

  destroyExtensions() {
    this.extensions.EXT_color_buffer_float = null;
    this.extensions.OES_texture_float_linear = null;
  }

  /**
   * @return {IJSON}
   */
  toJSON() {
    const json = super.toJSON();
    json.functionNodes = FunctionBuilder.fromKernel(this, WebGL2FunctionNode).toJSON();
    json.settings.threadDim = this.threadDim;
    return json;
  }
}

module.exports = {
  WebGL2Kernel
};