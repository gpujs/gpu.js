const { Kernel } = require('../kernel');
const { Texture } = require('../../texture');
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

  /**
   * @type {IKernelFeatures}
   */
  static get features() {
    throw new Error(`"features" not defined on ${ this.name }`);
  }

  /**
   * @abstract
   */
  static setupFeatureChecks() {
    throw new Error(`"setupFeatureChecks" not defined on ${ this.name }`);
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
    this.TextureConstructor = null;
    this.renderOutput = null;
    this.renderRawOutput = null;
    this.texSize = null;
    this.translatedSource = null;
    this.renderStrategy = null;
    this.compiledFragmentShader = null;
    this.compiledVertexShader = null;
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
              this.renderStrategy = renderStrategy.PackedPixelTo3DFloat;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureUnsigned2D;
              this.renderStrategy = renderStrategy.PackedPixelTo2DFloat;
              return null;
            } else {
              this.TextureConstructor = GLTextureUnsigned;
              this.renderStrategy = renderStrategy.PackedPixelToFloat;
              return null;
            }
            break;
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
              this.renderStrategy = renderStrategy.PackedPixelTo3DFloat;
              this.formatValues = utils.erect3DPackedFloat;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureUnsigned2D;
              this.renderStrategy = renderStrategy.PackedPixelTo2DFloat;
              this.formatValues = utils.erect2DPackedFloat;
              return null;
            } else {
              this.TextureConstructor = GLTextureUnsigned;
              this.renderStrategy = renderStrategy.PackedPixelToFloat;
              this.formatValues = utils.erectPackedFloat;
              return null;
            }

            break;
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
        this.renderStrategy = renderStrategy.FloatTexture;
        this.renderOutput = this.renderTexture;
        if (this.subKernels !== null) {
          this.renderKernels = this.renderKernelsToTextures;
        }
        switch (this.returnType) {
          case 'LiteralInteger':
          case 'Float':
          case 'Number':
          case 'Integer':
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
            break;
          case 'Array(2)':
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
            break;
          case 'Array(3)':
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
            break;
          case 'Array(4)':
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
      this.renderOutput = this.renderValues;
      if (this.subKernels !== null) {
        this.renderKernels = this.renderKernelsToArrays;
      }
      if (this.optimizeFloatMemory) {
        switch (this.returnType) {
          case 'LiteralInteger':
          case 'Float':
          case 'Number':
          case 'Integer':
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureMemoryOptimized3D;
              this.renderStrategy = renderStrategy.MemoryOptimizedFloatPixelToMemoryOptimized3DFloat;
              this.formatValues = utils.erectMemoryOptimized3DFloat;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureMemoryOptimized2D;
              this.renderStrategy = renderStrategy.MemoryOptimizedFloatPixelToMemoryOptimized2DFloat;
              this.formatValues = utils.erectMemoryOptimized2DFloat;
              return null;
            } else {
              this.TextureConstructor = GLTextureMemoryOptimized;
              this.renderStrategy = renderStrategy.MemoryOptimizedFloatPixelToMemoryOptimizedFloat;
              this.formatValues = utils.erectMemoryOptimizedFloat;
              return null;
            }
            break;
          case 'Array(2)':
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray2Float3D;
              this.renderStrategy = renderStrategy.FloatPixelTo3DArray2;
              this.formatValues = utils.erect3DArray2;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray2Float2D;
              this.renderStrategy = renderStrategy.FloatPixelTo2DArray2;
              this.formatValues = utils.erect2DArray2;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray2Float;
              this.renderStrategy = renderStrategy.FloatPixelToArray2;
              this.formatValues = utils.erectArray2;
              return null;
            }
            break;
          case 'Array(3)':
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray3Float3D;
              this.renderStrategy = renderStrategy.FloatPixelTo3DArray3;
              this.formatValues = utils.erect3DArray3;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray3Float2D;
              this.renderStrategy = renderStrategy.FloatPixelTo2DArray3;
              this.formatValues = utils.erect2DArray3;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray3Float;
              this.renderStrategy = renderStrategy.FloatPixelToArray3;
              this.formatValues = utils.erectArray3;
              return null;
            }
            break;
          case 'Array(4)':
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray4Float3D;
              this.renderStrategy = renderStrategy.FloatPixelTo3DArray4;
              this.formatValues = utils.erect3DArray4;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray4Float2D;
              this.renderStrategy = renderStrategy.FloatPixelTo2DArray4;
              this.formatValues = utils.erect2DArray4;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray4Float;
              this.renderStrategy = renderStrategy.FloatPixelToArray4;
              this.formatValues = utils.erectArray4;
              return null;
            }
        }
      } else {
        switch (this.returnType) {
          case 'LiteralInteger':
          case 'Float':
          case 'Number':
          case 'Integer':
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureFloat3D;
              this.renderStrategy = renderStrategy.FloatPixelTo3DFloat;
              this.formatValues = utils.erect3DFloat;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureFloat2D;
              this.renderStrategy = renderStrategy.FloatPixelTo2DFloat;
              this.formatValues = utils.erect2DFloat;
              return null;
            } else {
              this.TextureConstructor = GLTextureFloat;
              this.renderStrategy = renderStrategy.FloatPixelToFloat;
              this.formatValues = utils.erectFloat;
              return null;
            }
            break;
          case 'Array(2)':
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray2Float3D;
              this.renderStrategy = renderStrategy.FloatPixelTo3DArray2;
              this.formatValues = utils.erect3DArray2;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray2Float2D;
              this.renderStrategy = renderStrategy.FloatPixelTo2DArray2;
              this.formatValues = utils.erect2DArray2;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray2Float;
              this.renderStrategy = renderStrategy.FloatPixelToArray2;
              this.formatValues = utils.erectArray2;
              return null;
            }
            break;
          case 'Array(3)':
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray3Float3D;
              this.renderStrategy = renderStrategy.FloatPixelTo3DArray3;
              this.formatValues = utils.erect3DArray3;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray3Float2D;
              this.renderStrategy = renderStrategy.FloatPixelTo2DArray3;
              this.formatValues = utils.erect2DArray3;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray3Float;
              this.renderStrategy = renderStrategy.FloatPixelToArray3;
              this.formatValues = utils.erectArray3;
              return null;
            }
            break;
          case 'Array(4)':
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray4Float3D;
              this.renderStrategy = renderStrategy.FloatPixelTo3DArray4;
              this.formatValues = utils.erect3DArray4;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray4Float2D;
              this.renderStrategy = renderStrategy.FloatPixelTo2DArray4;
              this.formatValues = utils.erect2DArray4;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray4Float;
              this.renderStrategy = renderStrategy.FloatPixelToArray4;
              this.formatValues = utils.erectArray4;
              return null;
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
    switch (this.tactic) {
      case 'speed':
        return 'precision lowp float;\n';
      case 'performance':
        return 'precision highp float;\n';
      case 'balanced':
      default:
        return 'precision mediump float;\n';
    }
  }

  /**
   *
   * @return {string}
   */
  getIntTacticDeclaration() {
    switch (this.tactic) {
      case 'speed':
        return 'precision lowp int;\n';
      case 'performance':
        return 'precision highp int;\n';
      case 'balanced':
      default:
        return 'precision mediump int;\n';
    }
  }

  /**
   *
   * @return {string}
   */
  getSampler2DTacticDeclaration() {
    switch (this.tactic) {
      case 'speed':
        return 'precision lowp sampler2D;\n';
      case 'performance':
        return 'precision highp sampler2D;\n';
      case 'balanced':
      default:
        return 'precision mediump sampler2D;\n';
    }
  }

  getSampler2DArrayTacticDeclaration() {
    switch (this.tactic) {
      case 'speed':
        return 'precision lowp sampler2DArray;\n';
      case 'performance':
        return 'precision highp sampler2DArray;\n';
      case 'balanced':
      default:
        return 'precision mediump sampler2DArray;\n';
    }
  }

  renderTexture() {
    return new this.TextureConstructor({
      texture: this.outputTexture,
      size: this.texSize,
      dimensions: this.threadDim,
      output: this.output,
      context: this.context,
    });
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

  readMemoryOptimizedFloatPixelsToFloat32Array() {
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
   * @return {Uint8Array}
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
      result[this.subKernels[i].property] = new this.TextureConstructor({
        texture: this.subKernelOutputTextures[i],
        size: this.texSize,
        dimensions: this.threadDim,
        output: this.output,
        context: this.context,
      }).toArray();
    }
    return result;
  }

  renderKernelsToTextures() {
    const result = {
      result: this.renderOutput(),
    };
    for (let i = 0; i < this.subKernels.length; i++) {
      result[this.subKernels[i].property] = new this.TextureConstructor({
        texture: this.subKernelOutputTextures[i],
        size: this.texSize,
        dimensions: this.threadDim,
        output: this.output,
        context: this.context,
      });
    }
    return result;
  }

  setOutput(output) {
    super.setOutput(output);
    if (this.program) {
      this.threadDim = [this.output[0], this.output[1] || 1, this.output[2] || 1];
      this.texSize = utils.getKernelTextureSize({
        optimizeFloatMemory: this.optimizeFloatMemory,
        precision: this.precision,
      }, this.output);
      const { context: gl } = this;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      this.updateMaxTexSize();
      this.framebuffer.width = this.texSize[0];
      this.framebuffer.height = this.texSize[1];
      this.context.viewport(0, 0, this.maxTexSize[0], this.maxTexSize[1]);
      this.canvas.width = this.maxTexSize[0];
      this.canvas.height = this.maxTexSize[1];
      this._setupOutputTexture();
      if (this.subKernels && this.subKernels.length > 0) {
        this._setupSubOutputTextures();
      }
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
}

const renderStrategy = Object.freeze({
  PackedPixelToUint8Array: Symbol('PackedPixelToUint8Array'),
  PackedPixelToFloat: Symbol('PackedPixelToFloat'),
  PackedPixelTo2DFloat: Symbol('PackedPixelTo2DFloat'),
  PackedPixelTo3DFloat: Symbol('PackedPixelTo3DFloat'),
  PackedTexture: Symbol('PackedTexture'),
  FloatPixelToFloat32Array: Symbol('FloatPixelToFloat32Array'),
  FloatPixelToFloat: Symbol('FloatPixelToFloat'),
  FloatPixelTo2DFloat: Symbol('FloatPixelTo2DFloat'),
  FloatPixelTo3DFloat: Symbol('FloatPixelTo3DFloat'),
  FloatPixelToArray2: Symbol('FloatPixelToArray2'),
  FloatPixelTo2DArray2: Symbol('FloatPixelTo2DArray2'),
  FloatPixelTo3DArray2: Symbol('FloatPixelTo3DArray2'),
  FloatPixelToArray3: Symbol('FloatPixelToArray3'),
  FloatPixelTo2DArray3: Symbol('FloatPixelTo2DArray3'),
  FloatPixelTo3DArray3: Symbol('FloatPixelTo3DArray3'),
  FloatPixelToArray4: Symbol('FloatPixelToArray4'),
  FloatPixelTo2DArray4: Symbol('FloatPixelTo2DArray4'),
  FloatPixelTo3DArray4: Symbol('FloatPixelTo3DArray4'),
  FloatTexture: Symbol('FloatTexture'),
  MemoryOptimizedFloatPixelToMemoryOptimizedFloat: Symbol('MemoryOptimizedFloatPixelToFloat'),
  MemoryOptimizedFloatPixelToMemoryOptimized2DFloat: Symbol('MemoryOptimizedFloatPixelTo2DFloat'),
  MemoryOptimizedFloatPixelToMemoryOptimized3DFloat: Symbol('MemoryOptimizedFloatPixelTo3DFloat'),
});

const typeMap = {
  int: 'Integer',
  float: 'Number',
  vec2: 'Array(2)',
  vec3: 'Array(3)',
  vec4: 'Array(4)',
};

module.exports = {
  GLKernel,
  renderStrategy
};