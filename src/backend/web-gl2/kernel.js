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
      isSpeedTacticSupported: this.getIsSpeedTacticSupported(),
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
  /**
   * @desc Reads the output as tightly as the driver will allow. RGBA/FLOAT is
   * the only combination the spec guarantees for float color buffers, but for
   * the R32F target scalar single-precision kernels render to, most drivers
   * report RED/FLOAT as their implementation combination -- one float per
   * value instead of four, so the readback transfers a quarter of the bytes.
   * The stride-1 erect family already exists for the memory-optimized layout
   * and describes the tight buffer exactly; unsupported drivers keep the
   * guaranteed RGBA path untouched.
   */
  /**
   * @desc Detection must happen at render time: the framebuffer is only
   * guaranteed complete here (setup-time queries return null mid-resize on
   * the dynamic-output path), and it must happen before renderValues resolves
   * its erect function reference, which JavaScript does before evaluating the
   * read call that could otherwise swap it.
   */
  renderValues() {
    if (this._tightRead === undefined) {
      this._detectTightRead();
    }
    return super.renderValues();
  }

  renderKernelsToArrays() {
    if (this._tightRead === undefined) {
      this._detectTightRead();
    }
    return super.renderKernelsToArrays();
  }

  readFloatPixelsToFloat32Array() {
    if (!this._tightRead) {
      return super.readFloatPixelsToFloat32Array();
    }
    const { texSize, context: gl } = this;
    const w = texSize[0];
    const h = texSize[1];
    const result = new Float32Array(w * h);
    gl.readPixels(0, 0, w, h, gl.RED, gl.FLOAT, result);
    return result;
  }

  /**
   * @desc The genuinely non-blocking readback: readPixels into a
   * PIXEL_PACK_BUFFER returns immediately, a fence marks when the GPU has
   * caught up, and getBufferSubData after the fence signals is a plain copy.
   * The read is issued here, synchronously after the draw while the kernel's
   * framebuffer is still bound -- later draws on the shared context cannot
   * affect it, because pack reads are ordered with the commands before them.
   */
  renderOutputAsync() {
    if (this.renderOutput !== this.renderValues) {
      // pipeline textures (and inherited strategies) involve no transfer;
      // resolving the synchronous render keeps the contract uniform
      return Promise.resolve(this.renderOutput());
    }
    return this.renderValuesAsync();
  }

  renderValuesAsync() {
    if (this._tightRead === undefined) {
      this._detectTightRead();
    }
    const formatValues = this.formatValues;
    const [x, y, z] = this.output;
    return this.transferValuesAsync().then(pixels => formatValues(pixels, x, y, z));
  }

  transferValuesAsync() {
    const { texSize, context: gl } = this;
    const w = texSize[0];
    const h = texSize[1];
    let format, type, result;
    if (this.precision === 'single') {
      format = this._tightRead ? gl.RED : gl.RGBA;
      type = gl.FLOAT;
      result = new Float32Array(w * h * (this._tightRead ? 1 : 4));
    } else {
      format = gl.RGBA;
      type = gl.UNSIGNED_BYTE;
      result = new Uint8Array(w * h * 4);
    }
    const pbo = gl.createBuffer();
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
    gl.bufferData(gl.PIXEL_PACK_BUFFER, result.byteLength, gl.STREAM_READ);
    gl.readPixels(0, 0, w, h, format, type, 0);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    // fences are queued, not submitted; without a flush the poll can spin
    // forever waiting on commands the driver never dispatched
    gl.flush();
    return this._pollFence(sync).then(() => {
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
      gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, result);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      gl.deleteBuffer(pbo);
      return this.precision === 'single' ? result : new Float32Array(result.buffer);
    }, (error) => {
      gl.deleteBuffer(pbo);
      throw error;
    });
  }

  _pollFence(sync) {
    const gl = this.context;
    return new Promise((resolve, reject) => {
      // repolling through a MessageChannel task rather than setTimeout: each
      // check is its own event-loop turn (other work interleaves freely) but
      // skips the nested-timeout clamp, which would tax every readback with
      // multiple 4 ms waits after the GPU had already finished
      let schedule;
      let channel = null;
      if (typeof MessageChannel !== 'undefined') {
        channel = new MessageChannel();
        channel.port1.onmessage = () => poll();
        schedule = () => channel.port2.postMessage(0);
      } else {
        schedule = () => setTimeout(poll, 0);
      }
      const settle = (fn, value) => {
        gl.deleteSync(sync);
        if (channel) {
          channel.port1.close();
          channel.port2.close();
        }
        fn(value);
      };
      const poll = () => {
        if (gl.isContextLost()) {
          return settle(reject, new Error('WebGL context lost while awaiting kernel result'));
        }
        // always zero timeout: a wait would block the very thread this exists
        // to keep free
        const status = gl.clientWaitSync(sync, 0, 0);
        if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED) {
          return settle(resolve);
        }
        if (status === gl.WAIT_FAILED) {
          return settle(reject, new Error('clientWaitSync failed while awaiting kernel result'));
        }
        schedule();
      };
      poll();
    });
  }

  _detectTightRead() {
    const gl = this.context;
    this._tightRead = false;
    // the implementation read format is a property of the bound READ
    // framebuffer; callers reach here with varying binding state (the
    // inherit path of _setupOutputTexture never binds), so bind explicitly
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    const scalarReturn =
      this.returnType === 'Number' ||
      this.returnType === 'Float' ||
      this.returnType === 'Integer' ||
      this.returnType === 'LiteralInteger';
    if (this.precision !== 'single' || this.optimizeFloatMemory || this.graphical || !scalarReturn) return;
    if (
      gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT) !== gl.RED ||
      gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE) !== gl.FLOAT
    ) {
      return;
    }
    // The tight buffer is stride 1, which is exactly the layout the
    // memory-optimized erect family describes. Detection re-runs whenever the
    // output texture is set up again (setOutput, kernel switching), so an
    // already-swapped erect function counts as tight-ready -- bailing on it
    // would strand a stride-1 formatter on the stride-4 fallback read.
    if (this.formatValues === utils.erectFloat) {
      this.formatValues = utils.erectMemoryOptimizedFloat;
    } else if (this.formatValues === utils.erect2DFloat) {
      this.formatValues = utils.erectMemoryOptimized2DFloat;
    } else if (this.formatValues === utils.erect3DFloat) {
      this.formatValues = utils.erectMemoryOptimized3DFloat;
    } else if (
      this.formatValues !== utils.erectMemoryOptimizedFloat &&
      this.formatValues !== utils.erectMemoryOptimized2DFloat &&
      this.formatValues !== utils.erectMemoryOptimized3DFloat
    ) {
      return;
    }
    this._tightRead = true;
  }

  getInternalFormat() {
    const { context: gl } = this;

    if (this.precision === 'single') {
      // The same tight formats whether or not the kernel pipelines: a scalar
      // kernel rendering to RGBA32F writes one channel and drags three dead
      // ones through the render target -- a 4x bandwidth tax on memory-bound
      // kernels. Reading back stays RGBA/FLOAT either way, which the spec
      // guarantees for every float color buffer, so only the attachment
      // narrows. optimizeFloatMemory genuinely fills all four channels and
      // keeps RGBA32F.
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
    return gl.RGBA;
  }

  _setupOutputTexture() {
    const gl = this.context;
    if (this.texture) {
      // here we inherit from an already existing kernel, so go ahead and just bind textures to the framebuffer
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture.texture, 0);
      this._tightRead = undefined;
      return;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    const texture = gl.createTexture();
    const texSize = this.texSize;
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
    this._tightRead = undefined;
  }

  _setupSubOutputTextures() {
    const gl = this.context;
    if (this.mappedTextures) {
      // here we inherit from an already existing kernel, so go ahead and just bind textures to the framebuffer
      for (let i = 0; i < this.subKernels.length; i++) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i + 1, gl.TEXTURE_2D, this.mappedTextures[i].texture, 0);
      }
      return;
    }
    const texSize = this.texSize;
    this.drawBuffersMap = [gl.COLOR_ATTACHMENT0];
    this.mappedTextures = [];
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
    const result = [this.getKernelResultDeclaration()];
    const subKernels = this.subKernels;
    if (subKernels !== null) {
      result.push(
        'layout(location = 0) out vec4 data0'
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
              `float subKernelResult_${ subKernel.name } = 0.0`,
              `layout(location = ${ i + 1 }) out vec4 data${ i + 1 }`
            );
          }
          break;
        case 'Array(2)':
          for (let i = 0; i < subKernels.length; i++) {
            result.push(
              `vec2 subKernelResult_${ subKernels[i].name }`,
              `layout(location = ${ i + 1 }) out vec4 data${ i + 1 }`
            );
          }
          break;
        case 'Array(3)':
          for (let i = 0; i < subKernels.length; i++) {
            result.push(
              `vec3 subKernelResult_${ subKernels[i].name }`,
              `layout(location = ${ i + 1 }) out vec4 data${ i + 1 }`
            );
          }
          break;
        case 'Array(4)':
          for (let i = 0; i < subKernels.length; i++) {
            result.push(
              `vec4 subKernelResult_${ subKernels[i].name }`,
              `layout(location = ${ i + 1 }) out vec4 data${ i + 1 }`
            );
          }
          break;
      }
    } else {
      result.push(
        'out vec4 data0'
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
      `  data0.${channel} = kernelResult`
    );
  }

  getMainResultSubKernelMemoryOptimizedFloats(result, channel) {
    if (!this.subKernels) return result;
    for (let i = 0; i < this.subKernels.length; i++) {
      const subKernel = this.subKernels[i];
      if (subKernel.returnType === 'Integer') {
        result.push(
          `  data${i + 1}.${channel} = float(subKernelResult_${subKernel.name})`
        );
      } else {
        result.push(
          `  data${i + 1}.${channel} = subKernelResult_${subKernel.name}`
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
          `  data${i + 1}[0] = float(subKernelResult_${subKernel.name})`
        );
      } else {
        result.push(
          `  data${i + 1}[0] = subKernelResult_${subKernel.name}`
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
        `  data${i + 1}[1] = subKernelResult_${subKernel.name}[1]`
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
        `  data${i + 1}[2] = subKernelResult_${subKernel.name}[2]`
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
        `  data${i + 1} = subKernelResult_${this.subKernels[i].name}`
      );
    }
    return result;
  }

  destroyExtensions() {
    this.extensions.EXT_color_buffer_float = null;
    this.extensions.OES_texture_float_linear = null;
  }

  /**
   * @return {IKernelJSON}
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