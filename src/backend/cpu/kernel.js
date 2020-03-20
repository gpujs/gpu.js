const { Kernel } = require('../kernel');
const { FunctionBuilder } = require('../function-builder');
const { CPUFunctionNode } = require('./function-node');
const { utils } = require('../../utils');
const { cpuKernelString } = require('./kernel-string');

/**
 * @desc Kernel Implementation for CPU.
 * <p>Instantiates properties to the CPU Kernel.</p>
 */
class CPUKernel extends Kernel {
  static getFeatures() {
    return this.features;
  }
  static get features() {
    return Object.freeze({
      kernelMap: true,
      isIntegerDivisionAccurate: true
    });
  }
  static get isSupported() {
    return true;
  }
  static isContextMatch(context) {
    return false;
  }
  /**
   * @desc The current mode in which gpu.js is executing.
   */
  static get mode() {
    return 'cpu';
  }

  static nativeFunctionArguments() {
    return null;
  }

  static nativeFunctionReturnType() {
    throw new Error(`Looking up native function return type not supported on ${this.name}`);
  }

  static combineKernels(combinedKernel) {
    return combinedKernel;
  }

  static getSignature(kernel, argumentTypes) {
    return 'cpu' + (argumentTypes.length > 0 ? ':' + argumentTypes.join(',') : '');
  }

  constructor(source, settings) {
    super(source, settings);
    this.mergeSettings(source.settings || settings);

    this._imageData = null;
    this._colorData = null;
    this._kernelString = null;
    this._prependedString = [];
    this.thread = {
      x: 0,
      y: 0,
      z: 0
    };
    this.translatedSources = null;
  }

  initCanvas() {
    if (typeof document !== 'undefined') {
      return document.createElement('canvas');
    } else if (typeof OffscreenCanvas !== 'undefined') {
      return new OffscreenCanvas(0, 0);
    }
  }

  initContext() {
    if (!this.canvas) return null;
    return this.canvas.getContext('2d');
  }

  initPlugins(settings) {
    return [];
  }

  /**
   * @desc Validate settings related to Kernel, such as dimensions size, and auto output support.
   * @param {IArguments} args
   */
  validateSettings(args) {
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
    }

    this.checkOutput();
  }

  translateSource() {
    this.leadingReturnStatement = this.output.length > 1 ? 'resultX[x] = ' : 'result[x] = ';
    if (this.subKernels) {
      const followingReturnStatement = [];
      for (let i = 0; i < this.subKernels.length; i++) {
        const {
          name
        } = this.subKernels[i];
        followingReturnStatement.push(this.output.length > 1 ? `resultX_${ name }[x] = subKernelResult_${ name };\n` : `result_${ name }[x] = subKernelResult_${ name };\n`);
      }
      this.followingReturnStatement = followingReturnStatement.join('');
    }
    const functionBuilder = FunctionBuilder.fromKernel(this, CPUFunctionNode);
    this.translatedSources = functionBuilder.getPrototypes('kernel');
    if (!this.graphical && !this.returnType) {
      this.returnType = functionBuilder.getKernelResultType();
    }
  }

  /**
   * @desc Builds the Kernel, by generating the kernel
   * string using thread dimensions, and arguments
   * supplied to the kernel.
   *
   * <p>If the graphical flag is enabled, canvas is used.</p>
   */
  build() {
    if (this.built) return;
    this.setupConstants();
    this.setupArguments(arguments);
    this.validateSettings(arguments);
    this.translateSource();

    if (this.graphical) {
      const {
        canvas,
        output
      } = this;
      if (!canvas) {
        throw new Error('no canvas available for using graphical output');
      }
      const width = output[0];
      const height = output[1] || 1;
      canvas.width = width;
      canvas.height = height;
      this._imageData = this.context.createImageData(width, height);
      this._colorData = new Uint8ClampedArray(width * height * 4);
    }

    const kernelString = this.getKernelString();
    this.kernelString = kernelString;

    if (this.debug) {
      console.log('Function output:');
      console.log(kernelString);
    }

    try {
      this.run = new Function([], kernelString).bind(this)();
    } catch (e) {
      console.error('An error occurred compiling the javascript: ', e);
    }
    this.buildSignature(arguments);
    this.built = true;
  }

  color(r, g, b, a) {
    if (typeof a === 'undefined') {
      a = 1;
    }

    r = Math.floor(r * 255);
    g = Math.floor(g * 255);
    b = Math.floor(b * 255);
    a = Math.floor(a * 255);

    const width = this.output[0];
    const height = this.output[1];

    const x = this.thread.x;
    const y = height - this.thread.y - 1;

    const index = x + y * width;

    this._colorData[index * 4 + 0] = r;
    this._colorData[index * 4 + 1] = g;
    this._colorData[index * 4 + 2] = b;
    this._colorData[index * 4 + 3] = a;
  }

  /**
   * @desc Generates kernel string for this kernel program.
   *
   * <p>If sub-kernels are supplied, they are also factored in.
   * This string can be saved by calling the `toString` method
   * and then can be reused later.</p>
   *
   * @returns {String} result
   *
   */
  getKernelString() {
    if (this._kernelString !== null) return this._kernelString;

    let kernelThreadString = null;
    let {
      translatedSources
    } = this;
    if (translatedSources.length > 1) {
      translatedSources = translatedSources.filter(fn => {
        if (/^function/.test(fn)) return fn;
        kernelThreadString = fn;
        return false;
      });
    } else {
      kernelThreadString = translatedSources.shift();
    }
    return this._kernelString = `  const LOOP_MAX = ${ this._getLoopMaxString() };
  ${ this.injectedNative || '' }
  const _this = this;
  ${ this._processConstants() }
  return (${ this.argumentNames.map(argumentName => 'user_' + argumentName).join(', ') }) => {
    ${ this._prependedString.join('') }
    ${ this._processArguments() }
    ${ this.graphical ? this._graphicalKernelBody(kernelThreadString) : this._resultKernelBody(kernelThreadString) }
    ${ translatedSources.length > 0 ? translatedSources.join('\n') : '' }
  };`;
  }

  /**
   * @desc Returns the *pre-compiled* Kernel as a JS Object String, that can be reused.
   */
  toString() {
    return cpuKernelString(this);
  }

  /**
   * @desc Get the maximum loop size String.
   * @returns {String} result
   */
  _getLoopMaxString() {
    return (
      this.loopMaxIterations ?
      ` ${ parseInt(this.loopMaxIterations) };` :
      ' 1000;'
    );
  }

  _processConstants() {
    if (!this.constants) return '';

    const result = [];
    for (let p in this.constants) {
      const type = this.constantTypes[p];
      switch (type) {
        case 'HTMLCanvas':
        case 'HTMLImage':
        case 'HTMLVideo':
          result.push(`    const constants_${p} = this._mediaTo2DArray(this.constants.${p});\n`);
          break;
        case 'HTMLImageArray':
          result.push(`    const constants_${p} = this._imageTo3DArray(this.constants.${p});\n`);
          break;
        case 'Input':
          result.push(`    const constants_${p} = this.constants.${p}.value;\n`);
          break;
        default:
          result.push(`    const constants_${p} = this.constants.${p};\n`);
      }
    }
    return result.join('');
  }

  _processArguments() {
    const result = [];
    for (let i = 0; i < this.argumentTypes.length; i++) {
      const variableName = `user_${this.argumentNames[i]}`;
      switch (this.argumentTypes[i]) {
        case 'HTMLCanvas':
        case 'HTMLImage':
        case 'HTMLVideo':
          result.push(`    ${variableName} = this._mediaTo2DArray(${variableName});\n`);
          break;
        case 'HTMLImageArray':
          result.push(`    ${variableName} = this._imageTo3DArray(${variableName});\n`);
          break;
        case 'Input':
          result.push(`    ${variableName} = ${variableName}.value;\n`);
          break;
        case 'ArrayTexture(1)':
        case 'ArrayTexture(2)':
        case 'ArrayTexture(3)':
        case 'ArrayTexture(4)':
        case 'NumberTexture':
        case 'MemoryOptimizedNumberTexture':
          result.push(`
    if (${variableName}.toArray) {
      if (!_this.textureCache) {
        _this.textureCache = [];
        _this.arrayCache = [];
      }
      const textureIndex = _this.textureCache.indexOf(${variableName});
      if (textureIndex !== -1) {
        ${variableName} = _this.arrayCache[textureIndex];
      } else {
        _this.textureCache.push(${variableName});
        ${variableName} = ${variableName}.toArray();
        _this.arrayCache.push(${variableName});
      }
    }`);
          break;
      }
    }
    return result.join('');
  }

  _mediaTo2DArray(media) {
    const canvas = this.canvas;
    const width = media.width > 0 ? media.width : media.videoWidth;
    const height = media.height > 0 ? media.height : media.videoHeight;
    if (canvas.width < width) {
      canvas.width = width;
    }
    if (canvas.height < height) {
      canvas.height = height;
    }
    const ctx = this.context;
    ctx.drawImage(media, 0, 0, width, height);
    const pixelsData = ctx.getImageData(0, 0, width, height).data;
    const imageArray = new Array(height);
    let index = 0;
    for (let y = height - 1; y >= 0; y--) {
      const row = imageArray[y] = new Array(width);
      for (let x = 0; x < width; x++) {
        const pixel = new Float32Array(4);
        pixel[0] = pixelsData[index++] / 255; // r
        pixel[1] = pixelsData[index++] / 255; // g
        pixel[2] = pixelsData[index++] / 255; // b
        pixel[3] = pixelsData[index++] / 255; // a
        row[x] = pixel;
      }
    }
    return imageArray;
  }

  /**
   *
   * @param flip
   * @return {Uint8ClampedArray}
   */
  getPixels(flip) {
    const [width, height] = this.output;
    // cpu is not flipped by default
    return flip ? utils.flipPixels(this._imageData.data, width, height) : this._imageData.data.slice(0);
  }

  _imageTo3DArray(images) {
    const imagesArray = new Array(images.length);
    for (let i = 0; i < images.length; i++) {
      imagesArray[i] = this._mediaTo2DArray(images[i]);
    }
    return imagesArray;
  }

  _resultKernelBody(kernelString) {
    switch (this.output.length) {
      case 1:
        return this._resultKernel1DLoop(kernelString) + this._kernelOutput();
      case 2:
        return this._resultKernel2DLoop(kernelString) + this._kernelOutput();
      case 3:
        return this._resultKernel3DLoop(kernelString) + this._kernelOutput();
      default:
        throw new Error('unsupported size kernel');
    }
  }

  _graphicalKernelBody(kernelThreadString) {
    switch (this.output.length) {
      case 2:
        return this._graphicalKernel2DLoop(kernelThreadString) + this._graphicalOutput();
      default:
        throw new Error('unsupported size kernel');
    }
  }

  _graphicalOutput() {
    return `
    this._imageData.data.set(this._colorData);
    this.context.putImageData(this._imageData, 0, 0);
    return;`
  }

  _getKernelResultTypeConstructorString() {
    switch (this.returnType) {
      case 'LiteralInteger':
      case 'Number':
      case 'Integer':
      case 'Float':
        return 'Float32Array';
      case 'Array(2)':
      case 'Array(3)':
      case 'Array(4)':
        return 'Array';
      default:
        if (this.graphical) {
          return 'Float32Array';
        }
        throw new Error(`unhandled returnType ${ this.returnType }`);
    }
  }

  _resultKernel1DLoop(kernelString) {
    const constructorString = this._getKernelResultTypeConstructorString();
    return `  const outputX = _this.output[0];
    const result = new ${constructorString}(outputX);
    ${ this._mapSubKernels(subKernel => `const result_${ subKernel.name } = new ${constructorString}(outputX);\n`).join('    ') }
    ${ this._mapSubKernels(subKernel => `let subKernelResult_${ subKernel.name };\n`).join('    ') }
    for (let x = 0; x < outputX; x++) {
      this.thread.x = x;
      this.thread.y = 0;
      this.thread.z = 0;
      ${ kernelString }
    }`;
  }

  _resultKernel2DLoop(kernelString) {
    const constructorString = this._getKernelResultTypeConstructorString();
    return `  const outputX = _this.output[0];
    const outputY = _this.output[1];
    const result = new Array(outputY);
    ${ this._mapSubKernels(subKernel => `const result_${ subKernel.name } = new Array(outputY);\n`).join('    ') }
    ${ this._mapSubKernels(subKernel => `let subKernelResult_${ subKernel.name };\n`).join('    ') }
    for (let y = 0; y < outputY; y++) {
      this.thread.z = 0;
      this.thread.y = y;
      const resultX = result[y] = new ${constructorString}(outputX);
      ${ this._mapSubKernels(subKernel => `const resultX_${ subKernel.name } = result_${subKernel.name}[y] = new ${constructorString}(outputX);\n`).join('') }
      for (let x = 0; x < outputX; x++) {
        this.thread.x = x;
        ${ kernelString }
      }
    }`;
  }

  _graphicalKernel2DLoop(kernelString) {
    const constructorString = this._getKernelResultTypeConstructorString();
    return `  const outputX = _this.output[0];
    const outputY = _this.output[1];
    ${ this._mapSubKernels(subKernel => `const result_${ subKernel.name } = new Array(outputY);\n`).join('    ') }
    ${ this._mapSubKernels(subKernel => `let subKernelResult_${ subKernel.name };\n`).join('    ') }
    for (let y = 0; y < outputY; y++) {
      this.thread.z = 0;
      this.thread.y = y;
      ${ this._mapSubKernels(subKernel => `const resultX_${ subKernel.name } = result_${subKernel.name}[y] = new ${constructorString}(outputX);\n`).join('') }
      for (let x = 0; x < outputX; x++) {
        this.thread.x = x;
        ${ kernelString }
      }
    }`;
  }

  _resultKernel3DLoop(kernelString) {
    const constructorString = this._getKernelResultTypeConstructorString();
    return `  const outputX = _this.output[0];
    const outputY = _this.output[1];
    const outputZ = _this.output[2];
    const result = new Array(outputZ);
    ${ this._mapSubKernels(subKernel => `const result_${ subKernel.name } = new Array(outputZ);\n`).join('    ') }
    ${ this._mapSubKernels(subKernel => `let subKernelResult_${ subKernel.name };\n`).join('    ') }
    for (let z = 0; z < outputZ; z++) {
      this.thread.z = z;
      const resultY = result[z] = new Array(outputY);
      ${ this._mapSubKernels(subKernel => `const resultY_${ subKernel.name } = result_${subKernel.name}[z] = new Array(outputY);\n`).join('      ') }
      for (let y = 0; y < outputY; y++) {
        this.thread.y = y;
        const resultX = resultY[y] = new ${constructorString}(outputX);
        ${ this._mapSubKernels(subKernel => `const resultX_${ subKernel.name } = resultY_${subKernel.name}[y] = new ${constructorString}(outputX);\n`).join('        ') }
        for (let x = 0; x < outputX; x++) {
          this.thread.x = x;
          ${ kernelString }
        }
      }
    }`;
  }

  _kernelOutput() {
    if (!this.subKernels) {
      return '\n    return result;';
    }
    return `\n    return {
      result: result,
      ${ this.subKernels.map(subKernel => `${ subKernel.property }: result_${ subKernel.name }`).join(',\n      ') }
    };`;
  }

  _mapSubKernels(fn) {
    return this.subKernels === null ? [''] :
      this.subKernels.map(fn);
  }

  destroy(removeCanvasReference) {
    if (removeCanvasReference) {
      delete this.canvas;
    }
  }

  static destroyContext(context) {}

  toJSON() {
    const json = super.toJSON();
    json.functionNodes = FunctionBuilder.fromKernel(this, CPUFunctionNode).toJSON();
    return json;
  }

  setOutput(output) {
    super.setOutput(output);
    const [width, height] = this.output;
    if (this.graphical) {
      this._imageData = this.context.createImageData(width, height);
      this._colorData = new Uint8ClampedArray(width * height * 4);
    }
  }

  prependString(value) {
    if (this._kernelString) throw new Error('Kernel already built');
    this._prependedString.push(value);
  }

  hasPrependString(value) {
    return this._prependedString.indexOf(value) > -1;
  }
}

module.exports = {
  CPUKernel
};