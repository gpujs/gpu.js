const { Kernel } = require('../kernel');
const { utils } = require('../../utils');
const { GLTextureArray2Float } = require('./texture/array-2-float');
const { GLTextureArray2Float2D } = require('./texture/array-2-float-2d');
const { GLTextureArray2Float3D } = require('./texture/array-2-float-3d');
const { GLTextureArray3Float } = require('./texture/array-3-float');
const { GLTextureArray3Float2D } = require('./texture/array-3-float-2d');
const { GLTextureArray3Float3D } = require('./texture/array-3-float-3d');
const { GLTextureArray4Float } = require('./texture/array-4-float');
const { GLTextureArray4Float2D } = require('./texture/array-4-float-2d');
const { GLTextureArray4Float3D } = require('./texture/array-4-float-3d');
const { GLTextureFloat } = require('./texture/float');
const { GLTextureFloat2D } = require('./texture/float-2d');
const { GLTextureFloat3D } = require('./texture/float-3d');
const { GLTextureMemoryOptimized } = require('./texture/memory-optimized');
const { GLTextureMemoryOptimized2D } = require('./texture/memory-optimized-2d');
const { GLTextureMemoryOptimized3D } = require('./texture/memory-optimized-3d');
const { GLTextureUnsigned } = require('./texture/unsigned');
const { GLTextureUnsigned2D } = require('./texture/unsigned-2d');
const { GLTextureUnsigned3D } = require('./texture/unsigned-3d');
const { GLTextureGraphical } = require('./texture/graphical');

/**
 * @abstract
 * @extends Kernel
 */
class GLKernel extends Kernel {
  static get mode() {
    return 'gpu';
  }

  static getIsFloatRead() {
    const kernelString = `function kernelFunction() {
      return 1;
    }`;
    const kernel = new this(kernelString, {
      context: this.testContext,
      canvas: this.testCanvas,
      validate: false,
      output: [1],
      precision: 'single',
      returnType: 'Number',
      tactic: 'speed',
    });
    kernel.build();
    kernel.run();
    const result = kernel.renderOutput();
    kernel.destroy(true);
    return result[0] === 1;
  }

  static getIsIntegerDivisionAccurate() {
    function kernelFunction(v1, v2) {
      return v1[this.thread.x] / v2[this.thread.x];
    }
    const kernel = new this(kernelFunction.toString(), {
      context: this.testContext,
      canvas: this.testCanvas,
      validate: false,
      output: [2],
      returnType: 'Number',
      precision: 'unsigned',
      tactic: 'speed',
    });
    const args = [
      [6, 6030401],
      [3, 3991]
    ];
    kernel.build.apply(kernel, args);
    kernel.run.apply(kernel, args);
    const result = kernel.renderOutput();
    kernel.destroy(true);
    // have we not got whole numbers for 6/3 or 6030401/3991
    // add more here if others see this problem
    return result[0] === 2 && result[1] === 1511;
  }

  static getIsSpeedTacticSupported() {
    function kernelFunction(value) {
      return value[this.thread.x];
    }
    const kernel = new this(kernelFunction.toString(), {
      context: this.testContext,
      canvas: this.testCanvas,
      validate: false,
      output: [4],
      returnType: 'Number',
      precision: 'unsigned',
      tactic: 'speed',
    });
    const args = [
      [0, 1, 2, 3]
    ];
    kernel.build.apply(kernel, args);
    kernel.run.apply(kernel, args);
    const result = kernel.renderOutput();
    kernel.destroy(true);
    return Math.round(result[0]) === 0 && Math.round(result[1]) === 1 && Math.round(result[2]) === 2 && Math.round(result[3]) === 3;
  }

  /**
   * @abstract
   */
  static get testCanvas() {
    throw new Error(`"testCanvas" not defined on ${ this.name }`);
  }

  /**
   * @abstract
   */
  static get testContext() {
    throw new Error(`"testContext" not defined on ${ this.name }`);
  }

  static getFeatures() {
    const gl = this.testContext;
    const isDrawBuffers = this.getIsDrawBuffers();
    return Object.freeze({
      isFloatRead: this.getIsFloatRead(),
      isIntegerDivisionAccurate: this.getIsIntegerDivisionAccurate(),
      isSpeedTacticSupported: this.getIsSpeedTacticSupported(),
      isTextureFloat: this.getIsTextureFloat(),
      isDrawBuffers,
      kernelMap: isDrawBuffers,
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

  /**
   * @abstract
   */
  static setupFeatureChecks() {
    throw new Error(`"setupFeatureChecks" not defined on ${ this.name }`);
  }

  static getSignature(kernel, argumentTypes) {
    return kernel.getVariablePrecisionString() + (argumentTypes.length > 0 ? ':' + argumentTypes.join(',') : '');
  }

  /**
   * @desc Fix division by factor of 3 FP accuracy bug
   * @param {Boolean} fix - should fix
   */
  setFixIntegerDivisionAccuracy(fix) {
    this.fixIntegerDivisionAccuracy = fix;
    return this;
  }

  /**
   * @desc Toggle output mode
   * @param {String} flag - 'single' or 'unsigned'
   */
  setPrecision(flag) {
    this.precision = flag;
    return this;
  }

  /**
   * @desc Toggle texture output mode
   * @param {Boolean} flag - true to enable floatTextures
   * @deprecated
   */
  setFloatTextures(flag) {
    utils.warnDeprecated('method', 'setFloatTextures', 'setOptimizeFloatMemory');
    this.floatTextures = flag;
    return this;
  }

  /**
   * A highly readable very forgiving micro-parser for a glsl function that gets argument types
   * @param {String} source
   * @returns {{argumentTypes: String[], argumentNames: String[]}}
   */
  static nativeFunctionArguments(source) {
    const argumentTypes = [];
    const argumentNames = [];
    const states = [];
    const isStartingVariableName = /^[a-zA-Z_]/;
    const isVariableChar = /[a-zA-Z_0-9]/;
    let i = 0;
    let argumentName = null;
    let argumentType = null;
    while (i < source.length) {
      const char = source[i];
      const nextChar = source[i + 1];
      const state = states.length > 0 ? states[states.length - 1] : null;

      // begin MULTI_LINE_COMMENT handling
      if (state === 'FUNCTION_ARGUMENTS' && char === '/' && nextChar === '*') {
        states.push('MULTI_LINE_COMMENT');
        i += 2;
        continue;
      } else if (state === 'MULTI_LINE_COMMENT' && char === '*' && nextChar === '/') {
        states.pop();
        i += 2;
        continue;
      }
      // end MULTI_LINE_COMMENT handling

      // begin COMMENT handling
      else if (state === 'FUNCTION_ARGUMENTS' && char === '/' && nextChar === '/') {
        states.push('COMMENT');
        i += 2;
        continue;
      } else if (state === 'COMMENT' && char === '\n') {
        states.pop();
        i++;
        continue;
      }
      // end COMMENT handling

      // being FUNCTION_ARGUMENTS handling
      else if (state === null && char === '(') {
        states.push('FUNCTION_ARGUMENTS');
        i++;
        continue;
      } else if (state === 'FUNCTION_ARGUMENTS') {
        if (char === ')') {
          states.pop();
          break;
        }
        if (char === 'f' && nextChar === 'l' && source[i + 2] === 'o' && source[i + 3] === 'a' && source[i + 4] === 't' && source[i + 5] === ' ') {
          states.push('DECLARE_VARIABLE');
          argumentType = 'float';
          argumentName = '';
          i += 6;
          continue;
        } else if (char === 'i' && nextChar === 'n' && source[i + 2] === 't' && source[i + 3] === ' ') {
          states.push('DECLARE_VARIABLE');
          argumentType = 'int';
          argumentName = '';
          i += 4;
          continue;
        } else if (char === 'v' && nextChar === 'e' && source[i + 2] === 'c' && source[i + 3] === '2' && source[i + 4] === ' ') {
          states.push('DECLARE_VARIABLE');
          argumentType = 'vec2';
          argumentName = '';
          i += 5;
          continue;
        } else if (char === 'v' && nextChar === 'e' && source[i + 2] === 'c' && source[i + 3] === '3' && source[i + 4] === ' ') {
          states.push('DECLARE_VARIABLE');
          argumentType = 'vec3';
          argumentName = '';
          i += 5;
          continue;
        } else if (char === 'v' && nextChar === 'e' && source[i + 2] === 'c' && source[i + 3] === '4' && source[i + 4] === ' ') {
          states.push('DECLARE_VARIABLE');
          argumentType = 'vec4';
          argumentName = '';
          i += 5;
          continue;
        }
      }
      // end FUNCTION_ARGUMENTS handling

      // begin DECLARE_VARIABLE handling
      else if (state === 'DECLARE_VARIABLE') {
        if (argumentName === '') {
          if (char === ' ') {
            i++;
            continue;
          }
          if (!isStartingVariableName.test(char)) {
            throw new Error('variable name is not expected string');
          }
        }
        argumentName += char;
        if (!isVariableChar.test(nextChar)) {
          states.pop();
          argumentNames.push(argumentName);
          argumentTypes.push(typeMap[argumentType]);
        }
      }
      // end DECLARE_VARIABLE handling

      // Progress to next character
      i++;
    }
    if (states.length > 0) {
      throw new Error('GLSL function was not parsable');
    }
    return {
      argumentNames,
      argumentTypes,
    };
  }

  static nativeFunctionReturnType(source) {
    return typeMap[source.match(/int|float|vec[2-4]/)[0]];
  }

  static combineKernels(combinedKernel, lastKernel) {
    combinedKernel.apply(null, arguments);
    const {
      texSize,
      context,
      threadDim
    } = lastKernel.texSize;
    let result;
    if (lastKernel.precision === 'single') {
      const w = texSize[0];
      const h = Math.ceil(texSize[1] / 4);
      result = new Float32Array(w * h * 4 * 4);
      context.readPixels(0, 0, w, h * 4, context.RGBA, context.FLOAT, result);
    } else {
      const bytes = new Uint8Array(texSize[0] * texSize[1] * 4);
      context.readPixels(0, 0, texSize[0], texSize[1], context.RGBA, context.UNSIGNED_BYTE, bytes);
      result = new Float32Array(bytes.buffer);
    }

    result = result.subarray(0, threadDim[0] * threadDim[1] * threadDim[2]);

    if (lastKernel.output.length === 1) {
      return result;
    } else if (lastKernel.output.length === 2) {
      return utils.splitArray(result, lastKernel.output[0]);
    } else if (lastKernel.output.length === 3) {
      const cube = utils.splitArray(result, lastKernel.output[0] * lastKernel.output[1]);
      return cube.map(function(x) {
        return utils.splitArray(x, lastKernel.output[0]);
      });
    }
  }

  constructor(source, settings) {
    super(source, settings);
    this.transferValues = null;
    this.formatValues = null;
    /**
     *
     * @type {Texture}
     */
    this.TextureConstructor = null;
    this.renderOutput = null;
    this.renderRawOutput = null;
    this.texSize = null;
    this.translatedSource = null;
    this.compiledFragmentShader = null;
    this.compiledVertexShader = null;
    this.switchingKernels = null;
    this._textureSwitched = null;
    this._mappedTextureSwitched = null;
  }

  checkTextureSize() {
    const { features } = this.constructor;
    if (this.texSize[0] > features.maxTextureSize || this.texSize[1] > features.maxTextureSize) {
      throw new Error(`Texture size [${this.texSize[0]},${this.texSize[1]}] generated by kernel is larger than supported size [${features.maxTextureSize},${features.maxTextureSize}]`);
    }
  }

  translateSource() {
    throw new Error(`"translateSource" not defined on ${this.constructor.name}`);
  }

  /**
   * Picks a render strategy for the now finally parsed kernel
   * @param args
   * @return {null|KernelOutput}
   */
  pickRenderStrategy(args) {
    if (this.graphical) {
      this.renderRawOutput = this.readPackedPixelsToUint8Array;
      this.transferValues = (pixels) => pixels;
      this.TextureConstructor = GLTextureGraphical;
      return null;
    }
    if (this.precision === 'unsigned') {
      this.renderRawOutput = this.readPackedPixelsToUint8Array;
      this.transferValues = this.readPackedPixelsToFloat32Array;
      if (this.pipeline) {
        this.renderOutput = this.renderTexture;
        if (this.subKernels !== null) {
          this.renderKernels = this.renderKernelsToTextures;
        }
        switch (this.returnType) {
          case 'LiteralInteger':
          case 'Float':
          case 'Number':
          case 'Integer':
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureUnsigned3D;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureUnsigned2D;
              return null;
            } else {
              this.TextureConstructor = GLTextureUnsigned;
              return null;
            }
            case 'Array(2)':
            case 'Array(3)':
            case 'Array(4)':
              return this.requestFallback(args);
        }
      } else {
        if (this.subKernels !== null) {
          this.renderKernels = this.renderKernelsToArrays;
        }
        switch (this.returnType) {
          case 'LiteralInteger':
          case 'Float':
          case 'Number':
          case 'Integer':
            this.renderOutput = this.renderValues;
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureUnsigned3D;
              this.formatValues = utils.erect3DPackedFloat;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureUnsigned2D;
              this.formatValues = utils.erect2DPackedFloat;
              return null;
            } else {
              this.TextureConstructor = GLTextureUnsigned;
              this.formatValues = utils.erectPackedFloat;
              return null;
            }
            case 'Array(2)':
            case 'Array(3)':
            case 'Array(4)':
              return this.requestFallback(args);
        }
      }
    } else if (this.precision === 'single') {
      this.renderRawOutput = this.readFloatPixelsToFloat32Array;
      this.transferValues = this.readFloatPixelsToFloat32Array;
      if (this.pipeline) {
        this.renderOutput = this.renderTexture;
        if (this.subKernels !== null) {
          this.renderKernels = this.renderKernelsToTextures;
        }
        switch (this.returnType) {
          case 'LiteralInteger':
          case 'Float':
          case 'Number':
          case 'Integer': {
            if (this.optimizeFloatMemory) {
              if (this.output[2] > 0) {
                this.TextureConstructor = GLTextureMemoryOptimized3D;
                return null;
              } else if (this.output[1] > 0) {
                this.TextureConstructor = GLTextureMemoryOptimized2D;
                return null;
              } else {
                this.TextureConstructor = GLTextureMemoryOptimized;
                return null;
              }
            } else {
              if (this.output[2] > 0) {
                this.TextureConstructor = GLTextureFloat3D;
                return null;
              } else if (this.output[1] > 0) {
                this.TextureConstructor = GLTextureFloat2D;
                return null;
              } else {
                this.TextureConstructor = GLTextureFloat;
                return null;
              }
            }
          }
          case 'Array(2)': {
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray2Float3D;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray2Float2D;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray2Float;
              return null;
            }
          }
          case 'Array(3)': {
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray3Float3D;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray3Float2D;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray3Float;
              return null;
            }
          }
          case 'Array(4)': {
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray4Float3D;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray4Float2D;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray4Float;
              return null;
            }
          }
        }
      }
      this.renderOutput = this.renderValues;
      if (this.subKernels !== null) {
        this.renderKernels = this.renderKernelsToArrays;
      }
      if (this.optimizeFloatMemory) {
        switch (this.returnType) {
          case 'LiteralInteger':
          case 'Float':
          case 'Number':
          case 'Integer': {
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureMemoryOptimized3D;
              this.formatValues = utils.erectMemoryOptimized3DFloat;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureMemoryOptimized2D;
              this.formatValues = utils.erectMemoryOptimized2DFloat;
              return null;
            } else {
              this.TextureConstructor = GLTextureMemoryOptimized;
              this.formatValues = utils.erectMemoryOptimizedFloat;
              return null;
            }
          }
          case 'Array(2)': {
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray2Float3D;
              this.formatValues = utils.erect3DArray2;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray2Float2D;
              this.formatValues = utils.erect2DArray2;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray2Float;
              this.formatValues = utils.erectArray2;
              return null;
            }
          }
          case 'Array(3)': {
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray3Float3D;
              this.formatValues = utils.erect3DArray3;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray3Float2D;
              this.formatValues = utils.erect2DArray3;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray3Float;
              this.formatValues = utils.erectArray3;
              return null;
            }
          }
          case 'Array(4)': {
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray4Float3D;
              this.formatValues = utils.erect3DArray4;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray4Float2D;
              this.formatValues = utils.erect2DArray4;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray4Float;
              this.formatValues = utils.erectArray4;
              return null;
            }
          }
        }
      } else {
        switch (this.returnType) {
          case 'LiteralInteger':
          case 'Float':
          case 'Number':
          case 'Integer': {
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureFloat3D;
              this.formatValues = utils.erect3DFloat;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureFloat2D;
              this.formatValues = utils.erect2DFloat;
              return null;
            } else {
              this.TextureConstructor = GLTextureFloat;
              this.formatValues = utils.erectFloat;
              return null;
            }
          }
          case 'Array(2)': {
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray2Float3D;
              this.formatValues = utils.erect3DArray2;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray2Float2D;
              this.formatValues = utils.erect2DArray2;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray2Float;
              this.formatValues = utils.erectArray2;
              return null;
            }
          }
          case 'Array(3)': {
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray3Float3D;
              this.formatValues = utils.erect3DArray3;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray3Float2D;
              this.formatValues = utils.erect2DArray3;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray3Float;
              this.formatValues = utils.erectArray3;
              return null;
            }
          }
          case 'Array(4)': {
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray4Float3D;
              this.formatValues = utils.erect3DArray4;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray4Float2D;
              this.formatValues = utils.erect2DArray4;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray4Float;
              this.formatValues = utils.erectArray4;
              return null;
            }
          }
        }
      }
    } else {
      throw new Error(`unhandled precision of "${this.precision}"`);
    }

    throw new Error(`unhandled return type "${this.returnType}"`);
  }

  /**
   * @abstract
   * @returns String
   */
  getKernelString() {
    throw new Error(`abstract method call`);
  }

  getMainResultTexture() {
    switch (this.returnType) {
      case 'LiteralInteger':
      case 'Float':
      case 'Integer':
      case 'Number':
        return this.getMainResultNumberTexture();
      case 'Array(2)':
        return this.getMainResultArray2Texture();
      case 'Array(3)':
        return this.getMainResultArray3Texture();
      case 'Array(4)':
        return this.getMainResultArray4Texture();
      default:
        throw new Error(`unhandled returnType type ${ this.returnType }`);
    }
  }

  /**
   * @abstract
   * @returns String[]
   */
  getMainResultKernelNumberTexture() {
    throw new Error(`abstract method call`);
  }
  /**
   * @abstract
   * @returns String[]
   */
  getMainResultSubKernelNumberTexture() {
    throw new Error(`abstract method call`);
  }
  /**
   * @abstract
   * @returns String[]
   */
  getMainResultKernelArray2Texture() {
    throw new Error(`abstract method call`);
  }
  /**
   * @abstract
   * @returns String[]
   */
  getMainResultSubKernelArray2Texture() {
    throw new Error(`abstract method call`);
  }
  /**
   * @abstract
   * @returns String[]
   */
  getMainResultKernelArray3Texture() {
    throw new Error(`abstract method call`);
  }
  /**
   * @abstract
   * @returns String[]
   */
  getMainResultSubKernelArray3Texture() {
    throw new Error(`abstract method call`);
  }
  /**
   * @abstract
   * @returns String[]
   */
  getMainResultKernelArray4Texture() {
    throw new Error(`abstract method call`);
  }
  /**
   * @abstract
   * @returns String[]
   */
  getMainResultSubKernelArray4Texture() {
    throw new Error(`abstract method call`);
  }
  /**
   * @abstract
   * @returns String[]
   */
  getMainResultGraphical() {
    throw new Error(`abstract method call`);
  }
  /**
   * @abstract
   * @returns String[]
   */
  getMainResultMemoryOptimizedFloats() {
    throw new Error(`abstract method call`);
  }
  /**
   * @abstract
   * @returns String[]
   */
  getMainResultPackedPixels() {
    throw new Error(`abstract method call`);
  }

  getMainResultString() {
    if (this.graphical) {
      return this.getMainResultGraphical();
    } else if (this.precision === 'single') {
      if (this.optimizeFloatMemory) {
        return this.getMainResultMemoryOptimizedFloats();
      }
      return this.getMainResultTexture();
    } else {
      return this.getMainResultPackedPixels();
    }
  }

  getMainResultNumberTexture() {
    return utils.linesToString(this.getMainResultKernelNumberTexture()) +
      utils.linesToString(this.getMainResultSubKernelNumberTexture());
  }

  getMainResultArray2Texture() {
    return utils.linesToString(this.getMainResultKernelArray2Texture()) +
      utils.linesToString(this.getMainResultSubKernelArray2Texture());
  }

  getMainResultArray3Texture() {
    return utils.linesToString(this.getMainResultKernelArray3Texture()) +
      utils.linesToString(this.getMainResultSubKernelArray3Texture());
  }

  getMainResultArray4Texture() {
    return utils.linesToString(this.getMainResultKernelArray4Texture()) +
      utils.linesToString(this.getMainResultSubKernelArray4Texture());
  }

  /**
   *
   * @return {string}
   */
  getFloatTacticDeclaration() {
    const variablePrecision = this.getVariablePrecisionString(this.texSize, this.tactic);
    return `precision ${variablePrecision} float;\n`;
  }

  /**
   *
   * @return {string}
   */
  getIntTacticDeclaration() {
    return `precision ${this.getVariablePrecisionString(this.texSize, this.tactic, true)} int;\n`;
  }

  /**
   *
   * @return {string}
   */
  getSampler2DTacticDeclaration() {
    return `precision ${this.getVariablePrecisionString(this.texSize, this.tactic)} sampler2D;\n`;
  }

  getSampler2DArrayTacticDeclaration() {
    return `precision ${this.getVariablePrecisionString(this.texSize, this.tactic)} sampler2DArray;\n`;
  }

  renderTexture() {
    return this.immutable ? this.texture.clone() : this.texture;
  }
  readPackedPixelsToUint8Array() {
    if (this.precision !== 'unsigned') throw new Error('Requires this.precision to be "unsigned"');
    const {
      texSize,
      context: gl
    } = this;
    const result = new Uint8Array(texSize[0] * texSize[1] * 4);
    gl.readPixels(0, 0, texSize[0], texSize[1], gl.RGBA, gl.UNSIGNED_BYTE, result);
    return result;
  }

  readPackedPixelsToFloat32Array() {
    return new Float32Array(this.readPackedPixelsToUint8Array().buffer);
  }

  readFloatPixelsToFloat32Array() {
    if (this.precision !== 'single') throw new Error('Requires this.precision to be "single"');
    const {
      texSize,
      context: gl
    } = this;
    const w = texSize[0];
    const h = texSize[1];
    const result = new Float32Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, result);
    return result;
  }

  /**
   *
   * @param {Boolean} [flip]
   * @return {Uint8ClampedArray}
   */
  getPixels(flip) {
    const {
      context: gl,
      output
    } = this;
    const [width, height] = output;
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    // flipped by default, so invert
    return new Uint8ClampedArray((flip ? pixels : utils.flipPixels(pixels, width, height)).buffer);
  }

  renderKernelsToArrays() {
    const result = {
      result: this.renderOutput(),
    };
    for (let i = 0; i < this.subKernels.length; i++) {
      result[this.subKernels[i].property] = this.mappedTextures[i].toArray();
    }
    return result;
  }

  renderKernelsToTextures() {
    const result = {
      result: this.renderOutput(),
    };
    if (this.immutable) {
      for (let i = 0; i < this.subKernels.length; i++) {
        result[this.subKernels[i].property] = this.mappedTextures[i].clone();
      }
    } else {
      for (let i = 0; i < this.subKernels.length; i++) {
        result[this.subKernels[i].property] = this.mappedTextures[i];
      }
    }
    return result;
  }

  resetSwitchingKernels() {
    const existingValue = this.switchingKernels;
    this.switchingKernels = null;
    return existingValue;
  }

  setOutput(output) {
    const newOutput = this.toKernelOutput(output);
    if (this.program) {
      if (!this.dynamicOutput) {
        throw new Error('Resizing a kernel with dynamicOutput: false is not possible');
      }
      const newThreadDim = [newOutput[0], newOutput[1] || 1, newOutput[2] || 1];
      const newTexSize = utils.getKernelTextureSize({
        optimizeFloatMemory: this.optimizeFloatMemory,
        precision: this.precision,
      }, newThreadDim);
      const oldTexSize = this.texSize;
      if (oldTexSize) {
        const oldPrecision = this.getVariablePrecisionString(oldTexSize, this.tactic);
        const newPrecision = this.getVariablePrecisionString(newTexSize, this.tactic);
        if (oldPrecision !== newPrecision) {
          if (this.debug) {
            console.warn('Precision requirement changed, asking GPU instance to recompile');
          }
          this.switchKernels({
            type: 'outputPrecisionMismatch',
            precision: newPrecision,
            needed: output
          });
          return;
        }
      }
      this.output = newOutput;
      this.threadDim = newThreadDim;
      this.texSize = newTexSize;
      const { context: gl } = this;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      this.updateMaxTexSize();
      this.framebuffer.width = this.texSize[0];
      this.framebuffer.height = this.texSize[1];
      gl.viewport(0, 0, this.maxTexSize[0], this.maxTexSize[1]);
      this.canvas.width = this.maxTexSize[0];
      this.canvas.height = this.maxTexSize[1];
      if (this.texture) {
        this.texture.delete();
      }
      this.texture = null;
      this._setupOutputTexture();
      if (this.mappedTextures && this.mappedTextures.length > 0) {
        for (let i = 0; i < this.mappedTextures.length; i++) {
          this.mappedTextures[i].delete();
        }
        this.mappedTextures = null;
        this._setupSubOutputTextures();
      }
    } else {
      this.output = newOutput;
    }
    return this;
  }
  renderValues() {
    return this.formatValues(
      this.transferValues(),
      this.output[0],
      this.output[1],
      this.output[2]
    );
  }
  switchKernels(reason) {
    if (this.switchingKernels) {
      this.switchingKernels.push(reason);
    } else {
      this.switchingKernels = [reason];
    }
  }
  getVariablePrecisionString(textureSize = this.texSize, tactic = this.tactic, isInt = false) {
    if (!tactic) {
      if (!this.constructor.features.isSpeedTacticSupported) return 'highp';
      const low = this.constructor.features[isInt ? 'lowIntPrecision' : 'lowFloatPrecision'];
      const medium = this.constructor.features[isInt ? 'mediumIntPrecision' : 'mediumFloatPrecision'];
      const high = this.constructor.features[isInt ? 'highIntPrecision' : 'highFloatPrecision'];
      const requiredSize = Math.log2(textureSize[0] * textureSize[1]);
      if (requiredSize <= low.rangeMax) {
        return 'lowp';
      } else if (requiredSize <= medium.rangeMax) {
        return 'mediump';
      } else if (requiredSize <= high.rangeMax) {
        return 'highp';
      } else {
        throw new Error(`The required size exceeds that of the ability of your system`);
      }
    }
    switch (tactic) {
      case 'speed':
        return 'lowp';
      case 'balanced':
        return 'mediump';
      case 'precision':
        return 'highp';
      default:
        throw new Error(`Unknown tactic "${tactic}" use "speed", "balanced", "precision", or empty for auto`);
    }
  }

  /**
   *
   * @param {WebGLKernelValue} kernelValue
   * @param {GLTexture} arg
   */
  updateTextureArgumentRefs(kernelValue, arg) {
    if (!this.immutable) return;
    if (this.texture.texture === arg.texture) {
      const { prevArg } = kernelValue;
      if (prevArg) {
        if (prevArg.texture._refs === 1) {
          this.texture.delete();
          this.texture = prevArg.clone();
          this._textureSwitched = true;
        }
        prevArg.delete();
      }
      kernelValue.prevArg = arg.clone();
    } else if (this.mappedTextures && this.mappedTextures.length > 0) {
      const { mappedTextures } = this;
      for (let i = 0; i < mappedTextures.length; i++) {
        const mappedTexture = mappedTextures[i];
        if (mappedTexture.texture === arg.texture) {
          const { prevArg } = kernelValue;
          if (prevArg) {
            if (prevArg.texture._refs === 1) {
              mappedTexture.delete();
              mappedTextures[i] = prevArg.clone();
              this._mappedTextureSwitched[i] = true;
            }
            prevArg.delete();
          }
          kernelValue.prevArg = arg.clone();
          return;
        }
      }
    }
  }

  onActivate(previousKernel) {
    this._textureSwitched = true;
    this.texture = previousKernel.texture;
    if (this.mappedTextures) {
      for (let i = 0; i < this.mappedTextures.length; i++) {
        this._mappedTextureSwitched[i] = true;
      }
      this.mappedTextures = previousKernel.mappedTextures;
    }
  }

  initCanvas() {}
}

const typeMap = {
  int: 'Integer',
  float: 'Number',
  vec2: 'Array(2)',
  vec3: 'Array(3)',
  vec4: 'Array(4)',
};

module.exports = {
  GLKernel
};