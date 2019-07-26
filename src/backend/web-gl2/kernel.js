const { WebGLKernel } = require('../web-gl/kernel');
const { WebGL2FunctionNode } = require('./function-node');
const { FunctionBuilder } = require('../function-builder');
const { utils } = require('../../utils');
const { fragmentShader } = require('./fragment-shader');
const { vertexShader } = require('./vertex-shader');
const { lookupKernelValueType } = require('./kernel-value-maps');

let isSupported = null;
let testCanvas = null;
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

  static getFeatures() {
    return Object.freeze({
      isFloatRead: this.getIsFloatRead(),
      isIntegerDivisionAccurate: this.getIsIntegerDivisionAccurate(),
      kernelMap: true,
      isTextureFloat: true,
      channelCount: this.getChannelCount(),
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

  initContext() {
    const settings = {
      alpha: false,
      depth: false,
      antialias: false
    };
    const context = this.canvas.getContext('webgl2', settings);
    return context;
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

    const features = this.constructor.features;
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
  }

  translateSource() {
    const functionBuilder = FunctionBuilder.fromKernel(this, WebGL2FunctionNode, {
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
    const { kernelArguments, texSize } = this;
    const gl = this.context;

    gl.useProgram(this.program);
    gl.scissor(0, 0, texSize[0], texSize[1]);

    if (this.dynamicOutput) {
      this.setUniform3iv('uOutputDim', new Int32Array(this.threadDim));
      this.setUniform2iv('uTexSize', texSize);
    }

    this.setUniform2f('ratio', texSize[0] / this.maxTexSize[0], texSize[1] / this.maxTexSize[1]);

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
          context: this.context
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
      gl.drawBuffers(this.drawBuffersMap);
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  drawBuffers() {
    this.context.drawBuffers(this.drawBuffersMap);
  }

  getOutputTexture() {
    return this.outputTexture;
  }

  _setupOutputTexture() {
    const { texSize } = this;
    const gl = this.context;
    const texture = this.outputTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + this.constantTextureCount + this.argumentTextureCount);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    if (this.precision === 'single') {
      if (this.pipeline) {
        switch (this.returnType) {
          case 'Number':
          case 'Float':
          case 'Integer':
            if (this.optimizeFloatMemory) {
              gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, texSize[0], texSize[1]);
            } else {
              gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R32F, texSize[0], texSize[1]);
            }
            break;
          case 'Array(2)':
            gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RG32F, texSize[0], texSize[1]);
            break;
          case 'Array(3)': // there is _no_ 3 channel format which is guaranteed to be color-renderable
          case 'Array(4)':
            gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, texSize[0], texSize[1]);
            break;
          default:
            throw new Error('Unhandled return type');
        }
      } else {
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, texSize[0], texSize[1]);
      }
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  }

  _setupSubOutputTextures() {
    const { texSize } = this;
    const gl = this.context;
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
      // TODO: upgrade this
      if (this.precision === 'single') {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i + 1, gl.TEXTURE_2D, texture, 0);
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
    if (subKernels === null || subKernels.length < 1) {
      return 'in highp vec2 vTexCoord;\n';
    } else {
      return 'out highp vec2 vTexCoord;\n';
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
        kernelResultDeclaration,
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
        kernelResultDeclaration
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
   * @param {Array} args - The actual parameters sent to the Kernel
   * @returns {string} Vertical Shader string
   *
   */
  getVertexShader(args) {
    if (this.compiledVertexShader !== null) {
      return this.compiledVertexShader;
    }
    return this.compiledVertexShader = this.constructor.vertexShader;
  }

  destroyExtensions() {
    this.extensions.EXT_color_buffer_float = null;
    this.extensions.OES_texture_float_linear = null;
  }

  toJSON() {
    const json = super.toJSON();
    json.functionNodes = FunctionBuilder.fromKernel(this, WebGL2FunctionNode).toJSON();
    return json;
  }
}

module.exports = {
  WebGL2Kernel
};