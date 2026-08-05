/**
 * gpu.js
 * https://gpu.rocks/
 *
 * GPU Accelerated JavaScript
 *
 * @version 2.24.0
 * @date Wed Aug 05 2026 23:37:11 GMT+0800 (Singapore Standard Time)
 *
 * @license MIT
 * The MIT License
 *
 * Copyright (c) 2026 gpu.js Team
 */(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define([], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, 
  global.GPU = factory());
})(this, function() {
  var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = {
    exports: {}
  }).exports, mod), cb = null), mod.exports);
  var require_gpu_mock_js = __commonJSMin((exports, module) => {
    function setupArguments(args) {
      const newArguments = new Array(args.length);
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.toArray) newArguments[i] = arg.toArray(); else newArguments[i] = arg;
      }
      return newArguments;
    }
    function mock1D() {
      const args = setupArguments(arguments);
      let row = null;
      for (let x = 0; x < this.output.x; x++) {
        this.thread.x = x;
        this.thread.y = 0;
        this.thread.z = 0;
        const value = this._fn.apply(this, args);
        if (row === null) row = typeof value === "number" || typeof value === "boolean" ? new Float32Array(this.output.x) : new Array(this.output.x);
        row[x] = typeof value === "object" ? new Float32Array(value) : value;
      }
      return row;
    }
    function mock2D() {
      const args = setupArguments(arguments);
      const matrix = new Array(this.output.y);
      for (let y = 0; y < this.output.y; y++) {
        let row = null;
        for (let x = 0; x < this.output.x; x++) {
          this.thread.x = x;
          this.thread.y = y;
          this.thread.z = 0;
          const value = this._fn.apply(this, args);
          if (row === null) row = typeof value === "number" || typeof value === "boolean" ? new Float32Array(this.output.x) : new Array(this.output.x);
          row[x] = typeof value === "object" ? new Float32Array(value) : value;
        }
        matrix[y] = row;
      }
      return matrix;
    }
    function mock2DGraphical() {
      const args = setupArguments(arguments);
      for (let y = 0; y < this.output.y; y++) for (let x = 0; x < this.output.x; x++) {
        this.thread.x = x;
        this.thread.y = y;
        this.thread.z = 0;
        this._fn.apply(this, args);
      }
    }
    function mock3D() {
      const args = setupArguments(arguments);
      const cube = new Array(this.output.z);
      for (let z = 0; z < this.output.z; z++) {
        const matrix = new Array(this.output.y);
        for (let y = 0; y < this.output.y; y++) {
          let row = null;
          for (let x = 0; x < this.output.x; x++) {
            this.thread.x = x;
            this.thread.y = y;
            this.thread.z = z;
            const value = this._fn.apply(this, args);
            if (row === null) row = typeof value === "number" || typeof value === "boolean" ? new Float32Array(this.output.x) : new Array(this.output.x);
            row[x] = typeof value === "object" ? new Float32Array(value) : value;
          }
          matrix[y] = row;
        }
        cube[z] = matrix;
      }
      return cube;
    }
    function apiDecorate(kernel) {
      kernel.setOutput = output => {
        kernel.output = setupOutput(output);
        if (kernel.graphical) setupGraphical(kernel);
      };
      kernel.toJSON = () => {
        throw new Error("Not usable with gpuMock");
      };
      kernel.setConstants = flag => {
        kernel.constants = flag;
        return kernel;
      };
      kernel.setGraphical = flag => {
        kernel.graphical = flag;
        return kernel;
      };
      kernel.setCanvas = flag => {
        kernel.canvas = flag;
        return kernel;
      };
      kernel.setContext = flag => {
        kernel.context = flag;
        return kernel;
      };
      kernel.destroy = () => {};
      kernel.validateSettings = () => {};
      if (kernel.graphical && kernel.output) setupGraphical(kernel);
      kernel.exec = function() {
        return new Promise((resolve, reject) => {
          try {
            resolve(kernel.apply(kernel, arguments));
          } catch (e) {
            reject(e);
          }
        });
      };
      kernel.getPixels = flip => {
        const {x: x, y: y} = kernel.output;
        return flip ? flipPixels(kernel._imageData.data, x, y) : kernel._imageData.data.slice(0);
      };
      kernel.color = function(r, g, b, a) {
        if (typeof a === "undefined") a = 1;
        r = Math.floor(r * 255);
        g = Math.floor(g * 255);
        b = Math.floor(b * 255);
        a = Math.floor(a * 255);
        const width = kernel.output.x;
        const height = kernel.output.y;
        const index = kernel.thread.x + (height - kernel.thread.y - 1) * width;
        kernel._colorData[index * 4 + 0] = r;
        kernel._colorData[index * 4 + 1] = g;
        kernel._colorData[index * 4 + 2] = b;
        kernel._colorData[index * 4 + 3] = a;
      };
      const mockMethod = () => kernel;
      const methods = [ "setWarnVarUsage", "setArgumentTypes", "setTactic", "setOptimizeFloatMemory", "setDebug", "setLoopMaxIterations", "setConstantTypes", "setFunctions", "setNativeFunctions", "setInjectedNative", "setPipeline", "setPrecision", "setOutputToTexture", "setImmutable", "setStrictIntegers", "setDynamicOutput", "setHardcodeConstants", "setDynamicArguments", "setUseLegacyEncoder", "setWarnVarUsage", "addSubKernel" ];
      for (let i = 0; i < methods.length; i++) kernel[methods[i]] = mockMethod;
      return kernel;
    }
    function setupGraphical(kernel) {
      const {x: x, y: y} = kernel.output;
      if (kernel.context && kernel.context.createImageData) {
        const data = new Uint8ClampedArray(x * y * 4);
        kernel._imageData = kernel.context.createImageData(x, y);
        kernel._colorData = data;
      } else {
        const data = new Uint8ClampedArray(x * y * 4);
        kernel._imageData = {
          data: data
        };
        kernel._colorData = data;
      }
    }
    function setupOutput(output) {
      let result = null;
      if (output.length) if (output.length === 3) {
        const [x, y, z] = output;
        result = {
          x: x,
          y: y,
          z: z
        };
      } else if (output.length === 2) {
        const [x, y] = output;
        result = {
          x: x,
          y: y
        };
      } else {
        const [x] = output;
        result = {
          x: x
        };
      } else result = output;
      return result;
    }
    function gpuMock(fn, settings = {}) {
      const output = settings.output ? setupOutput(settings.output) : null;
      function kernel() {
        if (kernel.output.z) return mock3D.apply(kernel, arguments); else if (kernel.output.y) {
          if (kernel.graphical) return mock2DGraphical.apply(kernel, arguments);
          return mock2D.apply(kernel, arguments);
        } else return mock1D.apply(kernel, arguments);
      }
      kernel._fn = fn;
      kernel.constants = settings.constants || null;
      kernel.context = settings.context || null;
      kernel.canvas = settings.canvas || null;
      kernel.graphical = settings.graphical || false;
      kernel._imageData = null;
      kernel._colorData = null;
      kernel.output = output;
      kernel.thread = {
        x: 0,
        y: 0,
        z: 0
      };
      return apiDecorate(kernel);
    }
    function flipPixels(pixels, width, height) {
      const halfHeight = height / 2 | 0;
      const bytesPerRow = width * 4;
      const temp = new Uint8ClampedArray(width * 4);
      const result = pixels.slice(0);
      for (let y = 0; y < halfHeight; ++y) {
        const topOffset = y * bytesPerRow;
        const bottomOffset = (height - y - 1) * bytesPerRow;
        temp.set(result.subarray(topOffset, topOffset + bytesPerRow));
        result.copyWithin(topOffset, bottomOffset, bottomOffset + bytesPerRow);
        result.set(temp, bottomOffset);
      }
      return result;
    }
    module.exports = {
      gpuMock: gpuMock
    };
  });
  var require_empty_module = __commonJSMin((exports, module) => {
    module.exports = {};
  });
  var require_input = __commonJSMin((exports, module) => {
    var Input = class {
      constructor(value, size) {
        this.value = value;
        if (Array.isArray(size)) this.size = size; else {
          this.size = new Int32Array(3);
          if (size.z) this.size = new Int32Array([ size.x, size.y, size.z ]); else if (size.y) this.size = new Int32Array([ size.x, size.y ]); else this.size = new Int32Array([ size.x ]);
        }
        const [w, h, d] = this.size;
        if (d) {
          if (this.value.length !== w * h * d) throw new Error(`Input size ${this.value.length} does not match ${w} * ${h} * ${d} = ${h * w * d}`);
        } else if (h) {
          if (this.value.length !== w * h) throw new Error(`Input size ${this.value.length} does not match ${w} * ${h} = ${h * w}`);
        } else if (this.value.length !== w) throw new Error(`Input size ${this.value.length} does not match ${w}`);
      }
      toArray() {
        const {utils: utils} = require_utils();
        const [w, h, d] = this.size;
        if (d) return utils.erectMemoryOptimized3DFloat(this.value.subarray ? this.value : new Float32Array(this.value), w, h, d); else if (h) return utils.erectMemoryOptimized2DFloat(this.value.subarray ? this.value : new Float32Array(this.value), w, h); else return this.value;
      }
    };
    function input(value, size) {
      return new Input(value, size);
    }
    module.exports = {
      Input: Input,
      input: input
    };
  });
  var require_texture$1 = __commonJSMin((exports, module) => {
    var Texture = class {
      constructor(settings) {
        const {texture: texture, size: size, dimensions: dimensions, output: output, context: context, type: type = "NumberTexture", kernel: kernel, internalFormat: internalFormat, textureFormat: textureFormat} = settings;
        if (!output) throw new Error('settings property "output" required.');
        if (!context) throw new Error('settings property "context" required.');
        if (!texture) throw new Error('settings property "texture" required.');
        if (!kernel) throw new Error('settings property "kernel" required.');
        this.texture = texture;
        if (texture._refs) texture._refs++; else texture._refs = 1;
        this.size = size;
        this.dimensions = dimensions;
        this.output = output;
        this.context = context;
        this.kernel = kernel;
        this.type = type;
        this._deleted = false;
        this.internalFormat = internalFormat;
        this.textureFormat = textureFormat;
      }
      toArray() {
        throw new Error(`Not implemented on ${this.constructor.name}`);
      }
      clone() {
        throw new Error(`Not implemented on ${this.constructor.name}`);
      }
      delete() {
        throw new Error(`Not implemented on ${this.constructor.name}`);
      }
      clear() {
        throw new Error(`Not implemented on ${this.constructor.name}`);
      }
    };
    module.exports = {
      Texture: Texture
    };
  });
  var require_utils = __commonJSMin((exports, module) => {
    const acorn = require_empty_module();
    const {Input: Input} = require_input();
    const {Texture: Texture} = require_texture$1();
    const FUNCTION_NAME = /function ([^(]*)/;
    const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
    const ARGUMENT_NAMES = /([^\s,]+)/g;
    const utils = {
      systemEndianness() {
        return _systemEndianness;
      },
      getSystemEndianness() {
        const b = new ArrayBuffer(4);
        const a = new Uint32Array(b);
        const c = new Uint8Array(b);
        a[0] = 3735928559;
        if (c[0] === 239) return "LE";
        if (c[0] === 222) return "BE";
        throw new Error("unknown endianness");
      },
      isFunction(funcObj) {
        return typeof funcObj === "function";
      },
      isFunctionString(fn) {
        if (typeof fn === "string") return fn.slice(0, 8).toLowerCase() === "function";
        return false;
      },
      getFunctionNameFromString(funcStr) {
        const result = FUNCTION_NAME.exec(funcStr);
        if (!result || result.length === 0) return null;
        return result[1].trim();
      },
      getFunctionBodyFromString(funcStr) {
        return funcStr.substring(funcStr.indexOf("{") + 1, funcStr.lastIndexOf("}"));
      },
      getArgumentNamesFromString(fn) {
        const fnStr = fn.replace(STRIP_COMMENTS, "");
        let result = fnStr.slice(fnStr.indexOf("(") + 1, fnStr.indexOf(")")).match(ARGUMENT_NAMES);
        if (result === null) result = [];
        return result;
      },
      clone(obj) {
        if (obj === null || typeof obj !== "object" || obj.hasOwnProperty("isActiveClone")) return obj;
        const temp = obj.constructor();
        for (let key in obj) if (Object.prototype.hasOwnProperty.call(obj, key)) {
          obj.isActiveClone = null;
          temp[key] = utils.clone(obj[key]);
          delete obj.isActiveClone;
        }
        return temp;
      },
      isArray(array) {
        return !isNaN(array.length);
      },
      typeFitsValue(type, value) {
        if (typeof type !== "string" || value === null || value === void 0) return true;
        if (value.type) return true;
        switch (type) {
         case "Input":
          return value instanceof Input;

         case "Boolean":
          return typeof value === "boolean";

         case "Number":
         case "Integer":
         case "Float":
          return typeof value === "number";
        }
        if (type.indexOf("Texture") !== -1) return Boolean(value.type);
        if (type.indexOf("Array") === 0) return utils.isArray(value);
        return true;
      },
      getVariableType(value, strictIntegers) {
        if (utils.isArray(value)) {
          if (value.length > 0 && value[0].nodeName === "IMG") return "HTMLImageArray";
          return "Array";
        }
        switch (value.constructor) {
         case Boolean:
          return "Boolean";

         case Number:
          if (strictIntegers && Number.isInteger(value)) return "Integer";
          return "Float";

         case Texture:
          return value.type;

         case Input:
          return "Input";
        }
        if ("nodeName" in value) switch (value.nodeName) {
         case "IMG":
          return "HTMLImage";

         case "CANVAS":
          return "HTMLImage";

         case "VIDEO":
          return "HTMLVideo";
        } else if (value.hasOwnProperty("type")) return value.type; else if (typeof OffscreenCanvas !== "undefined" && value instanceof OffscreenCanvas) return "OffscreenCanvas"; else if (typeof ImageBitmap !== "undefined" && value instanceof ImageBitmap) return "ImageBitmap"; else if (typeof ImageData !== "undefined" && value instanceof ImageData) return "ImageData";
        return "Unknown";
      },
      getKernelTextureSize(settings, dimensions) {
        let [w, h, d] = dimensions;
        let texelCount = (w || 1) * (h || 1) * (d || 1);
        if (settings.optimizeFloatMemory && settings.precision === "single") w = texelCount = Math.ceil(texelCount / 4);
        if (h > 1 && w * h === texelCount) return new Int32Array([ w, h ]);
        return utils.closestSquareDimensions(texelCount);
      },
      closestSquareDimensions(length) {
        const sqrt = Math.sqrt(length);
        let high = Math.ceil(sqrt);
        let low = Math.floor(sqrt);
        while (high * low < length) {
          high--;
          low = Math.ceil(length / high);
        }
        return new Int32Array([ low, Math.ceil(length / low) ]);
      },
      getMemoryOptimizedFloatTextureSize(dimensions, bitRatio) {
        const texelCount = utils.roundTo((dimensions[0] || 1) * (dimensions[1] || 1) * (dimensions[2] || 1) * (dimensions[3] || 1), 4) / bitRatio;
        return utils.closestSquareDimensions(texelCount);
      },
      getMemoryOptimizedPackedTextureSize(dimensions, bitRatio) {
        const [w, h, d] = dimensions;
        const texelCount = utils.roundTo((w || 1) * (h || 1) * (d || 1), 4) / (4 / bitRatio);
        return utils.closestSquareDimensions(texelCount);
      },
      roundTo(n, d) {
        return Math.floor((n + d - 1) / d) * d;
      },
      getDimensions(x, pad) {
        let ret;
        if (utils.isArray(x)) {
          const dim = [];
          let temp = x;
          while (utils.isArray(temp)) {
            dim.push(temp.length);
            temp = temp[0];
          }
          ret = dim.reverse();
        } else if (x instanceof Texture) ret = x.output; else if (x instanceof Input) ret = x.size; else throw new Error(`Unknown dimensions of ${x}`);
        if (pad) {
          ret = Array.from(ret);
          while (ret.length < 3) ret.push(1);
        }
        return new Int32Array(ret);
      },
      flatten2dArrayTo(array, target) {
        let offset = 0;
        for (let y = 0; y < array.length; y++) {
          target.set(array[y], offset);
          offset += array[y].length;
        }
      },
      flatten3dArrayTo(array, target) {
        let offset = 0;
        for (let z = 0; z < array.length; z++) for (let y = 0; y < array[z].length; y++) {
          target.set(array[z][y], offset);
          offset += array[z][y].length;
        }
      },
      flatten4dArrayTo(array, target) {
        let offset = 0;
        for (let l = 0; l < array.length; l++) for (let z = 0; z < array[l].length; z++) for (let y = 0; y < array[l][z].length; y++) {
          target.set(array[l][z][y], offset);
          offset += array[l][z][y].length;
        }
      },
      flattenTo(array, target) {
        if (utils.isArray(array[0])) if (utils.isArray(array[0][0])) if (utils.isArray(array[0][0][0])) utils.flatten4dArrayTo(array, target); else utils.flatten3dArrayTo(array, target); else utils.flatten2dArrayTo(array, target); else target.set(array);
      },
      splitArray(array, part) {
        const result = [];
        for (let i = 0; i < array.length; i += part) result.push(new array.constructor(array.buffer, i * 4 + array.byteOffset, part));
        return result;
      },
      glslFloatLiteral(value) {
        const str = `${value}`;
        return /[.eE]/.test(str) ? str : `${str}.0`;
      },
      getAstString(source, ast) {
        if (!ast.loc) return "[synthetic node]";
        const lines = Array.isArray(source) ? source : source.split(/\r?\n/g);
        const start = ast.loc.start;
        const end = ast.loc.end;
        const result = [];
        if (start.line === end.line) result.push(lines[start.line - 1].substring(start.column, end.column)); else {
          result.push(lines[start.line - 1].slice(start.column));
          for (let i = start.line; i < end.line; i++) result.push(lines[i]);
          result.push(lines[end.line - 1].slice(0, end.column));
        }
        return result.join("\n");
      },
      allPropertiesOf(obj) {
        const props = [];
        do {
          props.push.apply(props, Object.getOwnPropertyNames(obj));
        } while (obj = Object.getPrototypeOf(obj));
        return props;
      },
      linesToString(lines) {
        if (lines.length > 0) return lines.join(";\n") + ";\n"; else return "\n";
      },
      warnDeprecated(type, oldName, newName) {
        if (newName) console.warn(`You are using a deprecated ${type} "${oldName}". It has been replaced with "${newName}". Fixing, but please upgrade as it will soon be removed.`); else console.warn(`You are using a deprecated ${type} "${oldName}". It has been removed. Fixing, but please upgrade as it will soon be removed.`);
      },
      flipPixels: (pixels, width, height) => {
        const halfHeight = height / 2 | 0;
        const bytesPerRow = width * 4;
        const temp = new Uint8ClampedArray(width * 4);
        const result = pixels.slice(0);
        for (let y = 0; y < halfHeight; ++y) {
          const topOffset = y * bytesPerRow;
          const bottomOffset = (height - y - 1) * bytesPerRow;
          temp.set(result.subarray(topOffset, topOffset + bytesPerRow));
          result.copyWithin(topOffset, bottomOffset, bottomOffset + bytesPerRow);
          result.set(temp, bottomOffset);
        }
        return result;
      },
      erectPackedFloat: (array, width) => array.subarray(0, width),
      erect2DPackedFloat: (array, width, height) => {
        const yResults = new Array(height);
        for (let y = 0; y < height; y++) {
          const xStart = y * width;
          const xEnd = xStart + width;
          yResults[y] = array.subarray(xStart, xEnd);
        }
        return yResults;
      },
      erect3DPackedFloat: (array, width, height, depth) => {
        const zResults = new Array(depth);
        for (let z = 0; z < depth; z++) {
          const yResults = new Array(height);
          for (let y = 0; y < height; y++) {
            const xStart = z * height * width + y * width;
            const xEnd = xStart + width;
            yResults[y] = array.subarray(xStart, xEnd);
          }
          zResults[z] = yResults;
        }
        return zResults;
      },
      erectMemoryOptimizedFloat: (array, width) => array.subarray(0, width),
      erectMemoryOptimized2DFloat: (array, width, height) => {
        const yResults = new Array(height);
        for (let y = 0; y < height; y++) {
          const offset = y * width;
          yResults[y] = array.subarray(offset, offset + width);
        }
        return yResults;
      },
      erectMemoryOptimized3DFloat: (array, width, height, depth) => {
        const zResults = new Array(depth);
        for (let z = 0; z < depth; z++) {
          const yResults = new Array(height);
          for (let y = 0; y < height; y++) {
            const offset = z * height * width + y * width;
            yResults[y] = array.subarray(offset, offset + width);
          }
          zResults[z] = yResults;
        }
        return zResults;
      },
      erectFloat: (array, width) => {
        const xResults = new Float32Array(width);
        let i = 0;
        for (let x = 0; x < width; x++) {
          xResults[x] = array[i];
          i += 4;
        }
        return xResults;
      },
      erect2DFloat: (array, width, height) => {
        const yResults = new Array(height);
        let i = 0;
        for (let y = 0; y < height; y++) {
          const xResults = new Float32Array(width);
          for (let x = 0; x < width; x++) {
            xResults[x] = array[i];
            i += 4;
          }
          yResults[y] = xResults;
        }
        return yResults;
      },
      erect3DFloat: (array, width, height, depth) => {
        const zResults = new Array(depth);
        let i = 0;
        for (let z = 0; z < depth; z++) {
          const yResults = new Array(height);
          for (let y = 0; y < height; y++) {
            const xResults = new Float32Array(width);
            for (let x = 0; x < width; x++) {
              xResults[x] = array[i];
              i += 4;
            }
            yResults[y] = xResults;
          }
          zResults[z] = yResults;
        }
        return zResults;
      },
      erectArray2: (array, width) => {
        const xResults = new Array(width);
        const xResultsMax = width * 4;
        let i = 0;
        for (let x = 0; x < xResultsMax; x += 4) xResults[i++] = array.subarray(x, x + 2);
        return xResults;
      },
      erect2DArray2: (array, width, height) => {
        const yResults = new Array(height);
        const XResultsMax = width * 4;
        for (let y = 0; y < height; y++) {
          const xResults = new Array(width);
          const offset = y * XResultsMax;
          let i = 0;
          for (let x = 0; x < XResultsMax; x += 4) xResults[i++] = array.subarray(x + offset, x + offset + 2);
          yResults[y] = xResults;
        }
        return yResults;
      },
      erect3DArray2: (array, width, height, depth) => {
        const xResultsMax = width * 4;
        const zResults = new Array(depth);
        for (let z = 0; z < depth; z++) {
          const yResults = new Array(height);
          for (let y = 0; y < height; y++) {
            const xResults = new Array(width);
            const offset = z * xResultsMax * height + y * xResultsMax;
            let i = 0;
            for (let x = 0; x < xResultsMax; x += 4) xResults[i++] = array.subarray(x + offset, x + offset + 2);
            yResults[y] = xResults;
          }
          zResults[z] = yResults;
        }
        return zResults;
      },
      erectArray3: (array, width) => {
        const xResults = new Array(width);
        const xResultsMax = width * 4;
        let i = 0;
        for (let x = 0; x < xResultsMax; x += 4) xResults[i++] = array.subarray(x, x + 3);
        return xResults;
      },
      erect2DArray3: (array, width, height) => {
        const xResultsMax = width * 4;
        const yResults = new Array(height);
        for (let y = 0; y < height; y++) {
          const xResults = new Array(width);
          const offset = y * xResultsMax;
          let i = 0;
          for (let x = 0; x < xResultsMax; x += 4) xResults[i++] = array.subarray(x + offset, x + offset + 3);
          yResults[y] = xResults;
        }
        return yResults;
      },
      erect3DArray3: (array, width, height, depth) => {
        const xResultsMax = width * 4;
        const zResults = new Array(depth);
        for (let z = 0; z < depth; z++) {
          const yResults = new Array(height);
          for (let y = 0; y < height; y++) {
            const xResults = new Array(width);
            const offset = z * xResultsMax * height + y * xResultsMax;
            let i = 0;
            for (let x = 0; x < xResultsMax; x += 4) xResults[i++] = array.subarray(x + offset, x + offset + 3);
            yResults[y] = xResults;
          }
          zResults[z] = yResults;
        }
        return zResults;
      },
      erectArray4: (array, width) => {
        const xResults = new Array(array);
        const xResultsMax = width * 4;
        let i = 0;
        for (let x = 0; x < xResultsMax; x += 4) xResults[i++] = array.subarray(x, x + 4);
        return xResults;
      },
      erect2DArray4: (array, width, height) => {
        const xResultsMax = width * 4;
        const yResults = new Array(height);
        for (let y = 0; y < height; y++) {
          const xResults = new Array(width);
          const offset = y * xResultsMax;
          let i = 0;
          for (let x = 0; x < xResultsMax; x += 4) xResults[i++] = array.subarray(x + offset, x + offset + 4);
          yResults[y] = xResults;
        }
        return yResults;
      },
      erect3DArray4: (array, width, height, depth) => {
        const xResultsMax = width * 4;
        const zResults = new Array(depth);
        for (let z = 0; z < depth; z++) {
          const yResults = new Array(height);
          for (let y = 0; y < height; y++) {
            const xResults = new Array(width);
            const offset = z * xResultsMax * height + y * xResultsMax;
            let i = 0;
            for (let x = 0; x < xResultsMax; x += 4) xResults[i++] = array.subarray(x + offset, x + offset + 4);
            yResults[y] = xResults;
          }
          zResults[z] = yResults;
        }
        return zResults;
      },
      flattenFunctionToString: (source, settings) => {
        const {findDependency: findDependency, thisLookup: thisLookup, doNotDefine: doNotDefine} = settings;
        let flattened = settings.flattened;
        if (!flattened) flattened = settings.flattened = {};
        const ast = acorn.parse(source, {
          ecmaVersion: 2020
        });
        const functionDependencies = [];
        let indent = 0;
        function flatten(ast) {
          if (Array.isArray(ast)) {
            const results = [];
            for (let i = 0; i < ast.length; i++) results.push(flatten(ast[i]));
            return results.join("");
          }
          switch (ast.type) {
           case "Program":
            return flatten(ast.body) + (ast.body[0].type === "VariableDeclaration" ? ";" : "");

           case "FunctionDeclaration":
            return `function ${ast.id.name}(${ast.params.map(flatten).join(", ")}) ${flatten(ast.body)}`;

           case "BlockStatement":
            {
              const result = [];
              indent += 2;
              for (let i = 0; i < ast.body.length; i++) {
                const flat = flatten(ast.body[i]);
                if (flat) result.push(" ".repeat(indent) + flat, ";\n");
              }
              indent -= 2;
              return `{\n${result.join("")}}`;
            }

           case "VariableDeclaration":
            const declarations = utils.normalizeDeclarations(ast).map(flatten).filter(r => r !== null);
            if (declarations.length < 1) return ""; else return `${ast.kind} ${declarations.join(",")}`;

           case "VariableDeclarator":
            if (!ast.init) return ast.id.name;
            if (ast.init.object && ast.init.object.type === "ThisExpression") if (thisLookup(ast.init.property.name, true)) return `${ast.id.name} = ${flatten(ast.init)}`; else return null; else return `${ast.id.name} = ${flatten(ast.init)}`;

           case "CallExpression":
            if (ast.callee.property.name === "subarray") return `${flatten(ast.callee.object)}.${flatten(ast.callee.property)}(${ast.arguments.map(value => flatten(value)).join(", ")})`;
            if (ast.callee.object.name === "gl" || ast.callee.object.name === "context") return `${flatten(ast.callee.object)}.${flatten(ast.callee.property)}(${ast.arguments.map(value => flatten(value)).join(", ")})`;
            if (ast.callee.object.type === "ThisExpression") {
              functionDependencies.push(findDependency("this", ast.callee.property.name));
              return `${ast.callee.property.name}(${ast.arguments.map(value => flatten(value)).join(", ")})`;
            } else if (ast.callee.object.name) {
              const foundSource = findDependency(ast.callee.object.name, ast.callee.property.name);
              if (foundSource === null) return `${ast.callee.object.name}.${ast.callee.property.name}(${ast.arguments.map(value => flatten(value)).join(", ")})`; else {
                functionDependencies.push(foundSource);
                return `${ast.callee.property.name}(${ast.arguments.map(value => flatten(value)).join(", ")})`;
              }
            } else if (ast.callee.object.type === "MemberExpression") return `${flatten(ast.callee.object)}.${ast.callee.property.name}(${ast.arguments.map(value => flatten(value)).join(", ")})`; else throw new Error("unknown ast.callee");

           case "ReturnStatement":
            return `return ${flatten(ast.argument)}`;

           case "BinaryExpression":
            return `(${flatten(ast.left)}${ast.operator}${flatten(ast.right)})`;

           case "UnaryExpression":
            if (ast.prefix) return `${ast.operator} ${flatten(ast.argument)}`; else return `${flatten(ast.argument)} ${ast.operator}`;

           case "ExpressionStatement":
            return `${flatten(ast.expression)}`;

           case "SequenceExpression":
            return `(${flatten(ast.expressions)})`;

           case "ArrowFunctionExpression":
            return `(${ast.params.map(flatten).join(", ")}) => ${flatten(ast.body)}`;

           case "Literal":
            return ast.raw;

           case "Identifier":
            return ast.name;

           case "MemberExpression":
            if (ast.object.type === "ThisExpression") return thisLookup(ast.property.name);
            if (ast.computed) return `${flatten(ast.object)}[${flatten(ast.property)}]`;
            return flatten(ast.object) + "." + flatten(ast.property);

           case "ThisExpression":
            return "this";

           case "NewExpression":
            return `new ${flatten(ast.callee)}(${ast.arguments.map(value => flatten(value)).join(", ")})`;

           case "ForStatement":
            return `for (${flatten(ast.init)};${flatten(ast.test)};${flatten(ast.update)}) ${flatten(ast.body)}`;

           case "AssignmentExpression":
            return `${flatten(ast.left)}${ast.operator}${flatten(ast.right)}`;

           case "UpdateExpression":
            return `${flatten(ast.argument)}${ast.operator}`;

           case "IfStatement":
            {
              const consequent = flatten(ast.consequent);
              if (!ast.alternate) return `if (${flatten(ast.test)}) ${consequent}`;
              const terminator = ast.consequent.type === "BlockStatement" ? "" : ";";
              return `if (${flatten(ast.test)}) ${consequent}${terminator} else ${flatten(ast.alternate)}`;
            }

           case "ThrowStatement":
            return `throw ${flatten(ast.argument)}`;

           case "ObjectPattern":
            return ast.properties.map(flatten).join(", ");

           case "ArrayPattern":
            return ast.elements.map(flatten).join(", ");

           case "DebuggerStatement":
            return "debugger;";

           case "ConditionalExpression":
            return `${flatten(ast.test)}?${flatten(ast.consequent)}:${flatten(ast.alternate)}`;

           case "Property":
            if (ast.kind === "init") return flatten(ast.key);
          }
          throw new Error(`unhandled ast.type of ${ast.type}`);
        }
        const result = flatten(ast);
        if (functionDependencies.length > 0) {
          const flattenedFunctionDependencies = [];
          for (let i = 0; i < functionDependencies.length; i++) {
            const functionDependency = functionDependencies[i];
            if (!flattened[functionDependency]) flattened[functionDependency] = true;
            functionDependency && flattenedFunctionDependencies.push(utils.flattenFunctionToString(functionDependency, settings) + "\n");
          }
          return flattenedFunctionDependencies.join("") + result;
        }
        return result;
      },
      normalizeDeclarations: ast => {
        if (ast.type !== "VariableDeclaration") throw new Error('Ast is not of type "VariableDeclaration"');
        const normalizedDeclarations = [];
        for (let declarationIndex = 0; declarationIndex < ast.declarations.length; declarationIndex++) {
          const declaration = ast.declarations[declarationIndex];
          if (declaration.id && declaration.id.type === "ObjectPattern" && declaration.id.properties) {
            const {properties: properties} = declaration.id;
            for (let propertyIndex = 0; propertyIndex < properties.length; propertyIndex++) {
              const property = properties[propertyIndex];
              if (property.value.type === "ObjectPattern" && property.value.properties) for (let subPropertyIndex = 0; subPropertyIndex < property.value.properties.length; subPropertyIndex++) {
                const subProperty = property.value.properties[subPropertyIndex];
                if (subProperty.type === "Property") normalizedDeclarations.push({
                  type: "VariableDeclarator",
                  id: {
                    type: "Identifier",
                    name: subProperty.key.name
                  },
                  init: {
                    type: "MemberExpression",
                    object: {
                      type: "MemberExpression",
                      object: declaration.init,
                      property: {
                        type: "Identifier",
                        name: property.key.name
                      },
                      computed: false
                    },
                    property: {
                      type: "Identifier",
                      name: subProperty.key.name
                    },
                    computed: false
                  }
                }); else throw new Error("unexpected state");
              } else if (property.value.type === "Identifier") normalizedDeclarations.push({
                type: "VariableDeclarator",
                id: {
                  type: "Identifier",
                  name: property.value && property.value.name ? property.value.name : property.key.name
                },
                init: {
                  type: "MemberExpression",
                  object: declaration.init,
                  property: {
                    type: "Identifier",
                    name: property.key.name
                  },
                  computed: false
                }
              }); else throw new Error("unexpected state");
            }
          } else if (declaration.id && declaration.id.type === "ArrayPattern" && declaration.id.elements) {
            const {elements: elements} = declaration.id;
            for (let elementIndex = 0; elementIndex < elements.length; elementIndex++) {
              const element = elements[elementIndex];
              if (element.type === "Identifier") normalizedDeclarations.push({
                type: "VariableDeclarator",
                id: {
                  type: "Identifier",
                  name: element.name
                },
                init: {
                  type: "MemberExpression",
                  object: declaration.init,
                  property: {
                    type: "Literal",
                    value: elementIndex,
                    raw: elementIndex.toString(),
                    start: element.start,
                    end: element.end
                  },
                  computed: true
                }
              }); else throw new Error("unexpected state");
            }
          } else normalizedDeclarations.push(declaration);
        }
        return normalizedDeclarations;
      },
      splitHTMLImageToRGB: (gpu, image) => {
        const rKernel = gpu.createKernel(function(a) {
          return a[this.thread.y][this.thread.x].r * 255;
        }, {
          output: [ image.width, image.height ],
          precision: "unsigned",
          argumentTypes: {
            a: "HTMLImage"
          }
        });
        const gKernel = gpu.createKernel(function(a) {
          return a[this.thread.y][this.thread.x].g * 255;
        }, {
          output: [ image.width, image.height ],
          precision: "unsigned",
          argumentTypes: {
            a: "HTMLImage"
          }
        });
        const bKernel = gpu.createKernel(function(a) {
          return a[this.thread.y][this.thread.x].b * 255;
        }, {
          output: [ image.width, image.height ],
          precision: "unsigned",
          argumentTypes: {
            a: "HTMLImage"
          }
        });
        const aKernel = gpu.createKernel(function(a) {
          return a[this.thread.y][this.thread.x].a * 255;
        }, {
          output: [ image.width, image.height ],
          precision: "unsigned",
          argumentTypes: {
            a: "HTMLImage"
          }
        });
        const result = [ rKernel(image), gKernel(image), bKernel(image), aKernel(image) ];
        result.rKernel = rKernel;
        result.gKernel = gKernel;
        result.bKernel = bKernel;
        result.aKernel = aKernel;
        result.gpu = gpu;
        return result;
      },
      splitRGBAToCanvases: (gpu, rgba, width, height) => {
        const visualKernelR = gpu.createKernel(function(v) {
          const pixel = v[this.thread.y][this.thread.x];
          this.color(pixel.r / 255, 0, 0, 255);
        }, {
          output: [ width, height ],
          graphical: true,
          argumentTypes: {
            v: "Array2D(4)"
          }
        });
        visualKernelR(rgba);
        const visualKernelG = gpu.createKernel(function(v) {
          const pixel = v[this.thread.y][this.thread.x];
          this.color(0, pixel.g / 255, 0, 255);
        }, {
          output: [ width, height ],
          graphical: true,
          argumentTypes: {
            v: "Array2D(4)"
          }
        });
        visualKernelG(rgba);
        const visualKernelB = gpu.createKernel(function(v) {
          const pixel = v[this.thread.y][this.thread.x];
          this.color(0, 0, pixel.b / 255, 255);
        }, {
          output: [ width, height ],
          graphical: true,
          argumentTypes: {
            v: "Array2D(4)"
          }
        });
        visualKernelB(rgba);
        const visualKernelA = gpu.createKernel(function(v) {
          const pixel = v[this.thread.y][this.thread.x];
          this.color(255, 255, 255, pixel.a / 255);
        }, {
          output: [ width, height ],
          graphical: true,
          argumentTypes: {
            v: "Array2D(4)"
          }
        });
        visualKernelA(rgba);
        return [ visualKernelR.canvas, visualKernelG.canvas, visualKernelB.canvas, visualKernelA.canvas ];
      },
      getMinifySafeName: fn => {
        try {
          const {init: init} = acorn.parse(`const value = ${fn.toString()}`, {
            ecmaVersion: 2020
          }).body[0].declarations[0];
          return init.body.name || init.body.body[0].argument.name;
        } catch (e) {
          throw new Error("Unrecognized function type.  Please use `() => yourFunctionVariableHere` or function() { return yourFunctionVariableHere; }");
        }
      },
      sanitizeName: function(name) {
        if (dollarSign.test(name)) name = name.replace(dollarSign, "S_S");
        if (doubleUnderscore.test(name)) name = name.replace(doubleUnderscore, "U_U"); else if (singleUnderscore.test(name)) name = name.replace(singleUnderscore, "u_u");
        return name;
      }
    };
    const dollarSign = /\$/;
    const doubleUnderscore = /__/;
    const singleUnderscore = /_/;
    const _systemEndianness = utils.getSystemEndianness();
    module.exports = {
      utils: utils
    };
  });
  var require_kernel$7 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {Input: Input} = require_input();
    var Kernel = class {
      static get isSupported() {
        throw new Error(`"isSupported" not implemented on ${this.name}`);
      }
      static isContextMatch(context) {
        throw new Error(`"isContextMatch" not implemented on ${this.name}`);
      }
      static getFeatures() {
        throw new Error(`"getFeatures" not implemented on ${this.name}`);
      }
      static destroyContext(context) {
        throw new Error(`"destroyContext" called on ${this.name}`);
      }
      static nativeFunctionArguments() {
        throw new Error(`"nativeFunctionArguments" called on ${this.name}`);
      }
      static nativeFunctionReturnType() {
        throw new Error(`"nativeFunctionReturnType" called on ${this.name}`);
      }
      static combineKernels() {
        throw new Error(`"combineKernels" called on ${this.name}`);
      }
      constructor(source, settings) {
        if (typeof source !== "object") {
          if (typeof source !== "string") throw new Error("source not a string");
          if (!utils.isFunctionString(source)) throw new Error("source not a function string");
        }
        this.useLegacyEncoder = false;
        this.fallbackRequested = false;
        this.fallbackReason = null;
        this.onRequestFallback = null;
        this.onRequestSwitchKernel = null;
        this.argumentNames = typeof source === "string" ? utils.getArgumentNamesFromString(source) : null;
        this.argumentTypes = null;
        this.declaredArgumentTypes = null;
        this.argumentSizes = null;
        this.argumentBitRatios = null;
        this.kernelArguments = null;
        this.kernelConstants = null;
        this.forceUploadKernelConstants = null;
        this.source = source;
        this.output = null;
        this.debug = false;
        this.graphical = false;
        this.loopMaxIterations = 0;
        this.constants = null;
        this.constantTypes = null;
        this.constantBitRatios = null;
        this.dynamicArguments = false;
        this.dynamicOutput = false;
        this.canvas = null;
        this.context = null;
        this.checkContext = null;
        this.gpu = null;
        this.functions = null;
        this.nativeFunctions = null;
        this.injectedNative = null;
        this.subKernels = null;
        this.validate = true;
        this.immutable = false;
        this.pipeline = false;
        this.asyncMode = false;
        this.precision = null;
        this.tactic = null;
        this.plugins = null;
        this.returnType = null;
        this.leadingReturnStatement = null;
        this.followingReturnStatement = null;
        this.optimizeFloatMemory = null;
        this.strictIntegers = false;
        this.fixIntegerDivisionAccuracy = null;
        this.randomSeed = null;
        this.built = false;
        this.signature = null;
        this.switchingKernels = null;
      }
      mergeSettings(settings) {
        for (let p in settings) {
          if (!settings.hasOwnProperty(p) || !this.hasOwnProperty(p)) continue;
          switch (p) {
           case "argumentTypes":
            this.argumentTypes = settings[p];
            if (settings[p]) this.declaredArgumentTypes = Array.isArray(settings[p]) ? settings[p].slice() : settings[p];
            continue;

           case "output":
            if (!Array.isArray(settings.output)) {
              this.setOutput(settings.output);
              continue;
            }
            break;

           case "functions":
            this.functions = [];
            for (let i = 0; i < settings.functions.length; i++) this.addFunction(settings.functions[i]);
            continue;

           case "graphical":
            if (settings[p] && !settings.hasOwnProperty("precision")) this.precision = "unsigned";
            this[p] = settings[p];
            continue;

           case "nativeFunctions":
            if (!settings.nativeFunctions) continue;
            this.nativeFunctions = [];
            for (let i = 0; i < settings.nativeFunctions.length; i++) {
              const s = settings.nativeFunctions[i];
              const {name: name, source: source} = s;
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
      build() {
        throw new Error(`"build" not defined on ${this.constructor.name}`);
      }
      run() {
        throw new Error(`"run" not defined on ${this.constructor.name}`);
      }
      initCanvas() {
        throw new Error(`"initCanvas" not defined on ${this.constructor.name}`);
      }
      initContext() {
        throw new Error(`"initContext" not defined on ${this.constructor.name}`);
      }
      initPlugins(settings) {
        throw new Error(`"initPlugins" not defined on ${this.constructor.name}`);
      }
      addFunction(source, settings = {}) {
        if (source.name && source.source && source.argumentTypes && "returnType" in source) this.functions.push(source); else if (typeof source === "string" || typeof source === "function") this.functions.push(this.functionToIGPUFunction(source, settings)); else if ("settings" in source && "source" in source) this.functions.push(this.functionToIGPUFunction(source.source, source.settings)); else throw new Error(`function not properly defined`);
        return this;
      }
      addNativeFunction(name, source, settings = {}) {
        const {argumentTypes: argumentTypes, argumentNames: argumentNames} = settings.argumentTypes ? splitArgumentTypes(settings.argumentTypes) : this.constructor.nativeFunctionArguments(source) || {};
        this.nativeFunctions.push({
          name: name,
          source: source,
          settings: settings,
          argumentTypes: argumentTypes,
          argumentNames: argumentNames,
          returnType: settings.returnType || this.constructor.nativeFunctionReturnType(source)
        });
        return this;
      }
      setupArguments(args) {
        this.kernelArguments = [];
        if (!this.argumentTypes) {
          if (!this.argumentTypes) {
            this.argumentTypes = [];
            for (let i = 0; i < args.length; i++) {
              const argType = utils.getVariableType(args[i], this.strictIntegers);
              const type = argType === "Integer" ? "Number" : argType;
              this.argumentTypes.push(type);
              this.kernelArguments.push({
                type: type
              });
            }
          }
        } else for (let i = 0; i < this.argumentTypes.length; i++) this.kernelArguments.push({
          type: this.argumentTypes[i]
        });
        this.argumentSizes = new Array(args.length);
        this.argumentBitRatios = new Int32Array(args.length);
        for (let i = 0; i < args.length; i++) {
          const arg = args[i];
          this.argumentSizes[i] = arg.constructor === Input ? arg.size : null;
          this.argumentBitRatios[i] = this.getBitRatio(arg);
        }
        if (this.argumentNames.length !== args.length) throw new Error(`arguments are miss-aligned`);
      }
      setupConstants() {
        this.kernelConstants = [];
        let needsConstantTypes = this.constantTypes === null;
        if (needsConstantTypes) this.constantTypes = {};
        this.constantBitRatios = {};
        if (this.constants) for (let name in this.constants) {
          if (needsConstantTypes) {
            const type = utils.getVariableType(this.constants[name], this.strictIntegers);
            this.constantTypes[name] = type;
            this.kernelConstants.push({
              name: name,
              type: type
            });
          } else this.kernelConstants.push({
            name: name,
            type: this.constantTypes[name]
          });
          this.constantBitRatios[name] = this.getBitRatio(this.constants[name]);
        }
      }
      setOptimizeFloatMemory(flag) {
        this.optimizeFloatMemory = flag;
        return this;
      }
      toKernelOutput(output) {
        if (output.hasOwnProperty("x")) if (output.hasOwnProperty("y")) if (output.hasOwnProperty("z")) return [ output.x, output.y, output.z ]; else return [ output.x, output.y ]; else return [ output.x ]; else return output;
      }
      setOutput(output) {
        this.output = this.toKernelOutput(output);
        return this;
      }
      setDebug(flag) {
        this.debug = flag;
        return this;
      }
      setGraphical(flag) {
        this.graphical = flag;
        this.precision = "unsigned";
        return this;
      }
      setLoopMaxIterations(max) {
        this.loopMaxIterations = max;
        return this;
      }
      setConstants(constants) {
        this.constants = constants;
        return this;
      }
      setConstantTypes(constantTypes) {
        this.constantTypes = constantTypes;
        return this;
      }
      setFunctions(functions) {
        for (let i = 0; i < functions.length; i++) this.addFunction(functions[i]);
        return this;
      }
      setNativeFunctions(nativeFunctions) {
        for (let i = 0; i < nativeFunctions.length; i++) {
          const settings = nativeFunctions[i];
          const {name: name, source: source} = settings;
          this.addNativeFunction(name, source, settings);
        }
        return this;
      }
      setInjectedNative(injectedNative) {
        this.injectedNative = injectedNative;
        return this;
      }
      setPipeline(flag) {
        this.pipeline = flag;
        return this;
      }
      setAsyncMode(flag) {
        this.asyncMode = flag;
        return this;
      }
      setPrecision(flag) {
        this.precision = flag;
        return this;
      }
      setDimensions(flag) {
        utils.warnDeprecated("method", "setDimensions", "setOutput");
        this.output = flag;
        return this;
      }
      setOutputToTexture(flag) {
        utils.warnDeprecated("method", "setOutputToTexture", "setPipeline");
        this.pipeline = flag;
        return this;
      }
      setImmutable(flag) {
        this.immutable = flag;
        return this;
      }
      setCanvas(canvas) {
        this.canvas = canvas;
        return this;
      }
      setStrictIntegers(flag) {
        this.strictIntegers = flag;
        return this;
      }
      setDynamicOutput(flag) {
        this.dynamicOutput = flag;
        return this;
      }
      setRandomSeed(seed) {
        this.randomSeed = seed;
        this._mathRandomGenerator = null;
        return this;
      }
      setHardcodeConstants(flag) {
        utils.warnDeprecated("method", "setHardcodeConstants");
        this.setDynamicOutput(flag);
        this.setDynamicArguments(flag);
        return this;
      }
      setDynamicArguments(flag) {
        this.dynamicArguments = flag;
        return this;
      }
      setUseLegacyEncoder(flag) {
        this.useLegacyEncoder = flag;
        return this;
      }
      setWarnVarUsage(flag) {
        utils.warnDeprecated("method", "setWarnVarUsage");
        return this;
      }
      getCanvas() {
        utils.warnDeprecated("method", "getCanvas");
        return this.canvas;
      }
      getWebGl() {
        utils.warnDeprecated("method", "getWebGl");
        return this.context;
      }
      setContext(context) {
        this.context = context;
        return this;
      }
      setArgumentTypes(argumentTypes) {
        this.declaredArgumentTypes = Array.isArray(argumentTypes) ? argumentTypes.slice() : argumentTypes;
        if (Array.isArray(argumentTypes)) this.argumentTypes = argumentTypes; else {
          this.argumentTypes = [];
          for (const p in argumentTypes) {
            if (!argumentTypes.hasOwnProperty(p)) continue;
            const argumentIndex = this.argumentNames.indexOf(p);
            if (argumentIndex === -1) throw new Error(`unable to find argument ${p}`);
            this.argumentTypes[argumentIndex] = argumentTypes[p];
          }
        }
        return this;
      }
      setTactic(tactic) {
        this.tactic = tactic;
        return this;
      }
      requestFallback(args, reason) {
        if (!this.onRequestFallback) throw new Error(`"onRequestFallback" not defined on ${this.constructor.name}`);
        this.fallbackRequested = true;
        this.fallbackReason = reason || null;
        return this.onRequestFallback(args);
      }
      validateSettings() {
        throw new Error(`"validateSettings" not defined on ${this.constructor.name}`);
      }
      addSubKernel(subKernel) {
        if (this.subKernels === null) this.subKernels = [];
        if (!subKernel.source) throw new Error('subKernel missing "source" property');
        if (!subKernel.property && isNaN(subKernel.property)) throw new Error('subKernel missing "property" property');
        if (!subKernel.name) throw new Error('subKernel missing "name" property');
        this.subKernels.push(subKernel);
        return this;
      }
      destroy(removeCanvasReferences) {
        throw new Error(`"destroy" called on ${this.constructor.name}`);
      }
      getBitRatio(value) {
        if (this.precision === "single") return 4; else if (Array.isArray(value[0])) return this.getBitRatio(value[0]); else if (value.constructor === Input) return this.getBitRatio(value.value);
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
      getPixels(flip) {
        throw new Error(`"getPixels" called on ${this.constructor.name}`);
      }
      checkOutput() {
        if (!this.output || !utils.isArray(this.output)) throw new Error("kernel.output not an array");
        if (this.output.length < 1) throw new Error("kernel.output is empty, needs at least 1 value");
        for (let i = 0; i < this.output.length; i++) if (isNaN(this.output[i]) || this.output[i] < 1) throw new Error(`${this.constructor.name}.output[${i}] incorrectly defined as \`${this.output[i]}\`, needs to be numeric, and greater than 0`);
      }
      prependString(value) {
        throw new Error(`"prependString" called on ${this.constructor.name}`);
      }
      hasPrependString(value) {
        throw new Error(`"hasPrependString" called on ${this.constructor.name}`);
      }
      toJSON() {
        return {
          settings: {
            output: this.output,
            pipeline: this.pipeline,
            argumentNames: this.argumentNames,
            argumentsTypes: this.argumentTypes,
            constants: this.constants,
            pluginNames: this.plugins ? this.plugins.map(plugin => plugin.name) : null,
            returnType: this.returnType
          }
        };
      }
      buildSignature(args) {
        const Constructor = this.constructor;
        this.signature = Constructor.getSignature(this, Constructor.getArgumentTypes(this, args));
      }
      static getArgumentTypes(kernel, args) {
        const argumentTypes = new Array(args.length);
        for (let i = 0; i < args.length; i++) {
          const arg = args[i];
          const type = kernel.argumentTypes[i];
          if (arg.type) argumentTypes[i] = arg.type; else switch (type) {
           case "Number":
           case "Integer":
           case "Float":
           case "ArrayTexture(1)":
            argumentTypes[i] = utils.getVariableType(arg, kernel.strictIntegers);
            break;

           default:
            argumentTypes[i] = utils.typeFitsValue(type, arg) ? type : utils.getVariableType(arg, kernel.strictIntegers);
          }
        }
        return argumentTypes;
      }
      static getSignature(kernel, argumentTypes) {
        throw new Error(`"getSignature" not implemented on ${this.name}`);
      }
      functionToIGPUFunction(source, settings = {}) {
        if (typeof source !== "string" && typeof source !== "function") throw new Error("source not a string or function");
        const sourceString = typeof source === "string" ? source : source.toString();
        let argumentTypes = [];
        if (Array.isArray(settings.argumentTypes)) argumentTypes = settings.argumentTypes; else if (typeof settings.argumentTypes === "object") {
          const argumentNames = utils.getArgumentNamesFromString(sourceString);
          argumentTypes = argumentNames.map(name => settings.argumentTypes[name]) || [];
          const keys = Object.keys(settings.argumentTypes);
          if (keys.length > 0 && argumentNames.length > 0 && argumentTypes.every(type => type === void 0)) throw new Error(`argumentTypes keys [${keys.join(", ")}] match none of the function's parameters [${argumentNames.join(", ")}] \u2014 a bundler may have renamed them. Use the array form: argumentTypes: ['${keys.map(k => settings.argumentTypes[k]).join("', '")}']`);
        } else argumentTypes = settings.argumentTypes || [];
        return {
          name: settings.name || utils.getFunctionNameFromString(sourceString) || (typeof source === "function" && source.name ? source.name : null),
          source: sourceString,
          argumentTypes: argumentTypes,
          returnType: settings.returnType || null
        };
      }
      onActivate(previousKernel) {}
      switchKernels(reason) {
        if (this.switchingKernels) this.switchingKernels.push(reason); else this.switchingKernels = [ reason ];
      }
      resetSwitchingKernels() {
        const existingValue = this.switchingKernels;
        this.switchingKernels = null;
        return existingValue;
      }
      checkArgumentTypes(args) {
        if (!this.argumentTypes) return;
        const length = Math.min(args.length, this.argumentTypes.length);
        for (let i = 0; i < length; i++) if (!utils.typeFitsValue(this.argumentTypes[i], args[i])) this.switchKernels({
          type: "argumentTypeMismatch",
          index: i,
          needed: utils.getVariableType(args[i], this.strictIntegers)
        });
      }
    };
    function splitArgumentTypes(argumentTypesObject) {
      const argumentNames = Object.keys(argumentTypesObject);
      const argumentTypes = [];
      for (let i = 0; i < argumentNames.length; i++) {
        const argumentName = argumentNames[i];
        argumentTypes.push(argumentTypesObject[argumentName]);
      }
      return {
        argumentTypes: argumentTypes,
        argumentNames: argumentNames
      };
    }
    module.exports = {
      Kernel: Kernel
    };
  });
  var require_function_builder = __commonJSMin((exports, module) => {
    module.exports = {
      FunctionBuilder: class FunctionBuilder {
        static fromKernel(kernel, FunctionNode, extraNodeOptions) {
          const {kernelArguments: kernelArguments, kernelConstants: kernelConstants, argumentNames: argumentNames, argumentSizes: argumentSizes, argumentBitRatios: argumentBitRatios, constants: constants, constantBitRatios: constantBitRatios, debug: debug, loopMaxIterations: loopMaxIterations, nativeFunctions: nativeFunctions, output: output, optimizeFloatMemory: optimizeFloatMemory, precision: precision, plugins: plugins, source: source, subKernels: subKernels, functions: functions, leadingReturnStatement: leadingReturnStatement, followingReturnStatement: followingReturnStatement, dynamicArguments: dynamicArguments, dynamicOutput: dynamicOutput} = kernel;
          const argumentTypes = new Array(kernelArguments.length);
          const constantTypes = {};
          for (let i = 0; i < kernelArguments.length; i++) argumentTypes[i] = kernelArguments[i].type;
          for (let i = 0; i < kernelConstants.length; i++) {
            const kernelConstant = kernelConstants[i];
            constantTypes[kernelConstant.name] = kernelConstant.type;
          }
          const needsArgumentType = (functionName, index) => functionBuilder.needsArgumentType(functionName, index);
          const assignArgumentType = (functionName, index, type) => {
            functionBuilder.assignArgumentType(functionName, index, type);
          };
          const lookupReturnType = (functionName, ast, requestingNode) => functionBuilder.lookupReturnType(functionName, ast, requestingNode);
          const lookupFunctionArgumentTypes = functionName => functionBuilder.lookupFunctionArgumentTypes(functionName);
          const lookupFunctionArgumentName = (functionName, argumentIndex) => functionBuilder.lookupFunctionArgumentName(functionName, argumentIndex);
          const lookupFunctionArgumentBitRatio = (functionName, argumentName) => functionBuilder.lookupFunctionArgumentBitRatio(functionName, argumentName);
          const triggerImplyArgumentType = (functionName, i, argumentType, requestingNode) => {
            functionBuilder.assignArgumentType(functionName, i, argumentType, requestingNode);
          };
          const triggerImplyArgumentBitRatio = (functionName, argumentName, calleeFunctionName, argumentIndex) => {
            functionBuilder.assignArgumentBitRatio(functionName, argumentName, calleeFunctionName, argumentIndex);
          };
          const onFunctionCall = (functionName, calleeFunctionName, args) => {
            functionBuilder.trackFunctionCall(functionName, calleeFunctionName, args);
          };
          const onNestedFunction = (ast, source) => {
            const argumentNames = [];
            for (let i = 0; i < ast.params.length; i++) argumentNames.push(ast.params[i].name);
            const nestedFunction = new FunctionNode(source, Object.assign({}, nodeOptions, {
              returnType: null,
              ast: ast,
              name: ast.id.name,
              argumentNames: argumentNames,
              lookupReturnType: lookupReturnType,
              lookupFunctionArgumentTypes: lookupFunctionArgumentTypes,
              lookupFunctionArgumentName: lookupFunctionArgumentName,
              lookupFunctionArgumentBitRatio: lookupFunctionArgumentBitRatio,
              needsArgumentType: needsArgumentType,
              assignArgumentType: assignArgumentType,
              triggerImplyArgumentType: triggerImplyArgumentType,
              triggerImplyArgumentBitRatio: triggerImplyArgumentBitRatio,
              onFunctionCall: onFunctionCall
            }));
            nestedFunction.traceFunctionAST(ast);
            functionBuilder.addFunctionNode(nestedFunction);
          };
          const nodeOptions = Object.assign({
            isRootKernel: false,
            onNestedFunction: onNestedFunction,
            lookupReturnType: lookupReturnType,
            lookupFunctionArgumentTypes: lookupFunctionArgumentTypes,
            lookupFunctionArgumentName: lookupFunctionArgumentName,
            lookupFunctionArgumentBitRatio: lookupFunctionArgumentBitRatio,
            needsArgumentType: needsArgumentType,
            assignArgumentType: assignArgumentType,
            triggerImplyArgumentType: triggerImplyArgumentType,
            triggerImplyArgumentBitRatio: triggerImplyArgumentBitRatio,
            onFunctionCall: onFunctionCall,
            optimizeFloatMemory: optimizeFloatMemory,
            precision: precision,
            constants: constants,
            constantTypes: constantTypes,
            constantBitRatios: constantBitRatios,
            debug: debug,
            loopMaxIterations: loopMaxIterations,
            output: output,
            plugins: plugins,
            dynamicArguments: dynamicArguments,
            dynamicOutput: dynamicOutput
          }, extraNodeOptions || {});
          const rootNodeOptions = Object.assign({}, nodeOptions, {
            isRootKernel: true,
            name: "kernel",
            argumentNames: argumentNames,
            argumentTypes: argumentTypes,
            argumentSizes: argumentSizes,
            argumentBitRatios: argumentBitRatios,
            leadingReturnStatement: leadingReturnStatement,
            followingReturnStatement: followingReturnStatement
          });
          if (typeof source === "object" && source.functionNodes) return (new FunctionBuilder).fromJSON(source.functionNodes, FunctionNode);
          const rootNode = new FunctionNode(source, rootNodeOptions);
          let functionNodes = null;
          if (functions) functionNodes = functions.map(fn => new FunctionNode(fn.source, {
            name: fn.name || void 0,
            returnType: fn.returnType,
            argumentTypes: fn.argumentTypes,
            output: output,
            plugins: plugins,
            constants: constants,
            constantTypes: constantTypes,
            constantBitRatios: constantBitRatios,
            optimizeFloatMemory: optimizeFloatMemory,
            precision: precision,
            lookupReturnType: lookupReturnType,
            lookupFunctionArgumentTypes: lookupFunctionArgumentTypes,
            lookupFunctionArgumentName: lookupFunctionArgumentName,
            lookupFunctionArgumentBitRatio: lookupFunctionArgumentBitRatio,
            needsArgumentType: needsArgumentType,
            assignArgumentType: assignArgumentType,
            triggerImplyArgumentType: triggerImplyArgumentType,
            triggerImplyArgumentBitRatio: triggerImplyArgumentBitRatio,
            onFunctionCall: onFunctionCall,
            onNestedFunction: onNestedFunction
          }));
          let subKernelNodes = null;
          if (subKernels) subKernelNodes = subKernels.map(subKernel => {
            const {name: name, source: source} = subKernel;
            return new FunctionNode(source, Object.assign({}, nodeOptions, {
              name: name,
              isSubKernel: true,
              isRootKernel: false
            }));
          });
          const functionBuilder = new FunctionBuilder({
            kernel: kernel,
            rootNode: rootNode,
            functionNodes: functionNodes,
            nativeFunctions: nativeFunctions,
            subKernelNodes: subKernelNodes
          });
          return functionBuilder;
        }
        constructor(settings) {
          settings = settings || {};
          this.kernel = settings.kernel;
          this.rootNode = settings.rootNode;
          this.functionNodes = settings.functionNodes || [];
          this.subKernelNodes = settings.subKernelNodes || [];
          this.nativeFunctions = settings.nativeFunctions || [];
          this.functionMap = {};
          this.nativeFunctionNames = [];
          this.lookupChain = [];
          this.functionNodeDependencies = {};
          this.functionCalls = {};
          if (this.rootNode) this.functionMap["kernel"] = this.rootNode;
          if (this.functionNodes) for (let i = 0; i < this.functionNodes.length; i++) this.functionMap[this.functionNodes[i].name] = this.functionNodes[i];
          if (this.subKernelNodes) for (let i = 0; i < this.subKernelNodes.length; i++) this.functionMap[this.subKernelNodes[i].name] = this.subKernelNodes[i];
          if (this.nativeFunctions) for (let i = 0; i < this.nativeFunctions.length; i++) {
            const nativeFunction = this.nativeFunctions[i];
            this.nativeFunctionNames.push(nativeFunction.name);
          }
        }
        addFunctionNode(functionNode) {
          if (!functionNode.name) throw new Error("functionNode.name needs set");
          this.functionMap[functionNode.name] = functionNode;
          if (functionNode.isRootKernel) this.rootNode = functionNode;
        }
        traceFunctionCalls(functionName, retList) {
          functionName = functionName || "kernel";
          retList = retList || [];
          if (this.nativeFunctionNames.indexOf(functionName) > -1) {
            const nativeFunctionIndex = retList.indexOf(functionName);
            if (nativeFunctionIndex === -1) retList.push(functionName); else {
              const dependantNativeFunctionName = retList.splice(nativeFunctionIndex, 1)[0];
              retList.push(dependantNativeFunctionName);
            }
            return retList;
          }
          const functionNode = this.functionMap[functionName];
          if (functionNode) {
            const functionIndex = retList.indexOf(functionName);
            if (functionIndex === -1) {
              retList.push(functionName);
              functionNode.toString();
              for (let i = 0; i < functionNode.calledFunctions.length; ++i) this.traceFunctionCalls(functionNode.calledFunctions[i], retList);
            } else {
              const dependantFunctionName = retList.splice(functionIndex, 1)[0];
              retList.push(dependantFunctionName);
            }
          }
          return retList;
        }
        getPrototypeString(functionName) {
          return this.getPrototypes(functionName).join("\n");
        }
        getPrototypes(functionName) {
          if (this.rootNode) this.rootNode.toString();
          if (functionName) return this.getPrototypesFromFunctionNames(this.traceFunctionCalls(functionName, []).reverse());
          return this.getPrototypesFromFunctionNames(Object.keys(this.functionMap));
        }
        getStringFromFunctionNames(functionList) {
          const ret = [];
          for (let i = 0; i < functionList.length; ++i) if (this.functionMap[functionList[i]]) ret.push(this.functionMap[functionList[i]].toString());
          return ret.join("\n");
        }
        getPrototypesFromFunctionNames(functionList) {
          const ret = [];
          for (let i = 0; i < functionList.length; ++i) {
            const functionName = functionList[i];
            const functionIndex = this.nativeFunctionNames.indexOf(functionName);
            if (functionIndex > -1) {
              ret.push(this.nativeFunctions[functionIndex].source);
              continue;
            }
            const node = this.functionMap[functionName];
            if (node) ret.push(node.toString());
          }
          return ret;
        }
        toJSON() {
          return this.traceFunctionCalls(this.rootNode.name).reverse().map(name => {
            const nativeIndex = this.nativeFunctions.indexOf(name);
            if (nativeIndex > -1) return {
              name: name,
              source: this.nativeFunctions[nativeIndex].source
            }; else if (this.functionMap[name]) return this.functionMap[name].toJSON(); else throw new Error(`function ${name} not found`);
          });
        }
        fromJSON(jsonFunctionNodes, FunctionNode) {
          this.functionMap = {};
          for (let i = 0; i < jsonFunctionNodes.length; i++) {
            const jsonFunctionNode = jsonFunctionNodes[i];
            this.functionMap[jsonFunctionNode.settings.name] = new FunctionNode(jsonFunctionNode.ast, jsonFunctionNode.settings);
          }
          return this;
        }
        getString(functionName) {
          if (functionName) return this.getStringFromFunctionNames(this.traceFunctionCalls(functionName).reverse());
          return this.getStringFromFunctionNames(Object.keys(this.functionMap));
        }
        lookupReturnType(functionName, ast, requestingNode) {
          if (ast.type !== "CallExpression") throw new Error(`expected ast type of "CallExpression", but is ${ast.type}`);
          if (this._isNativeFunction(functionName)) return this._lookupNativeFunctionReturnType(functionName); else if (this._isFunction(functionName)) {
            const node = this._getFunction(functionName);
            if (node.returnType) return node.returnType; else {
              for (let i = 0; i < this.lookupChain.length; i++) if (this.lookupChain[i].ast === ast) {
                if (node.argumentTypes.length === 0 && ast.arguments.length > 0) {
                  const args = ast.arguments;
                  for (let j = 0; j < args.length; j++) {
                    this.lookupChain.push({
                      name: requestingNode.name,
                      ast: args[i],
                      requestingNode: requestingNode
                    });
                    node.argumentTypes[j] = requestingNode.getType(args[j]);
                    this.lookupChain.pop();
                  }
                  return node.returnType = node.getType(node.getJsAST());
                }
                throw new Error("circlical logic detected!");
              }
              this.lookupChain.push({
                name: requestingNode.name,
                ast: ast,
                requestingNode: requestingNode
              });
              const type = node.getType(node.getJsAST());
              this.lookupChain.pop();
              return node.returnType = type;
            }
          }
          return null;
        }
        _getFunction(functionName) {
          if (!this._isFunction(functionName)) `${functionName}`;
          return this.functionMap[functionName];
        }
        _isFunction(functionName) {
          return Boolean(this.functionMap[functionName]);
        }
        _getNativeFunction(functionName) {
          for (let i = 0; i < this.nativeFunctions.length; i++) if (this.nativeFunctions[i].name === functionName) return this.nativeFunctions[i];
          return null;
        }
        _isNativeFunction(functionName) {
          return Boolean(this._getNativeFunction(functionName));
        }
        _lookupNativeFunctionReturnType(functionName) {
          let nativeFunction = this._getNativeFunction(functionName);
          if (nativeFunction) return nativeFunction.returnType;
          throw new Error(`Native function ${functionName} not found`);
        }
        lookupFunctionArgumentTypes(functionName) {
          if (this._isNativeFunction(functionName)) return this._getNativeFunction(functionName).argumentTypes; else if (this._isFunction(functionName)) return this._getFunction(functionName).argumentTypes;
          return null;
        }
        lookupFunctionArgumentName(functionName, argumentIndex) {
          return this._getFunction(functionName).argumentNames[argumentIndex];
        }
        lookupFunctionArgumentBitRatio(functionName, argumentName) {
          if (!this._isFunction(functionName)) throw new Error("function not found");
          if (this.rootNode.name === functionName) {
            const i = this.rootNode.argumentNames.indexOf(argumentName);
            if (i !== -1) return this.rootNode.argumentBitRatios[i];
          }
          const node = this._getFunction(functionName);
          const i = node.argumentNames.indexOf(argumentName);
          if (i === -1) throw new Error("argument not found");
          const bitRatio = node.argumentBitRatios[i];
          if (typeof bitRatio !== "number") throw new Error("argument bit ratio not found");
          return bitRatio;
        }
        needsArgumentType(functionName, i) {
          if (!this._isFunction(functionName)) return false;
          return !this._getFunction(functionName).argumentTypes[i];
        }
        assignArgumentType(functionName, i, argumentType, requestingNode) {
          if (!this._isFunction(functionName)) return;
          const fnNode = this._getFunction(functionName);
          if (!fnNode.argumentTypes[i]) fnNode.argumentTypes[i] = argumentType;
        }
        assignArgumentBitRatio(functionName, argumentName, calleeFunctionName, argumentIndex) {
          const node = this._getFunction(functionName);
          if (this._isNativeFunction(calleeFunctionName)) return null;
          const calleeNode = this._getFunction(calleeFunctionName);
          const i = node.argumentNames.indexOf(argumentName);
          if (i === -1) throw new Error(`Argument ${argumentName} not found in arguments from function ${functionName}`);
          const bitRatio = node.argumentBitRatios[i];
          if (typeof bitRatio !== "number") throw new Error(`Bit ratio for argument ${argumentName} not found in function ${functionName}`);
          if (!calleeNode.argumentBitRatios) calleeNode.argumentBitRatios = new Array(calleeNode.argumentNames.length);
          const calleeBitRatio = calleeNode.argumentBitRatios[argumentIndex];
          if (typeof calleeBitRatio === "number") {
            if (calleeBitRatio !== bitRatio) throw new Error(`Incompatible bit ratio found at function ${functionName} at argument ${argumentName}`);
            return calleeBitRatio;
          }
          calleeNode.argumentBitRatios[argumentIndex] = bitRatio;
          return bitRatio;
        }
        trackFunctionCall(functionName, calleeFunctionName, args) {
          if (!this.functionNodeDependencies[functionName]) {
            this.functionNodeDependencies[functionName] = new Set;
            this.functionCalls[functionName] = [];
          }
          this.functionNodeDependencies[functionName].add(calleeFunctionName);
          this.functionCalls[functionName].push(args);
        }
        getKernelResultType() {
          return this.rootNode.returnType || this.rootNode.getType(this.rootNode.ast);
        }
        getSubKernelResultType(index) {
          const subKernelNode = this.subKernelNodes[index];
          let called = false;
          for (let functionCallIndex = 0; functionCallIndex < this.rootNode.functionCalls.length; functionCallIndex++) if (this.rootNode.functionCalls[functionCallIndex].ast.callee.name === subKernelNode.name) called = true;
          if (!called) throw new Error(`SubKernel ${subKernelNode.name} never called by kernel`);
          return subKernelNode.returnType || subKernelNode.getType(subKernelNode.getJsAST());
        }
        getReturnTypes() {
          const result = {
            [this.rootNode.name]: this.rootNode.getType(this.rootNode.ast)
          };
          const list = this.traceFunctionCalls(this.rootNode.name);
          for (let i = 0; i < list.length; i++) {
            const functionName = list[i];
            const functionNode = this.functionMap[functionName];
            result[functionName] = functionNode.getType(functionNode.ast);
          }
          return result;
        }
      }
    };
  });
  var require_function_tracer = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    function last(array) {
      return array.length > 0 ? array[array.length - 1] : null;
    }
    const states = {
      trackIdentifiers: "trackIdentifiers",
      memberExpression: "memberExpression",
      inForLoopInit: "inForLoopInit"
    };
    var FunctionTracer = class {
      constructor(ast) {
        this.runningContexts = [];
        this.functionContexts = [];
        this.contexts = [];
        this.functionCalls = [];
        this.declarations = [];
        this.identifiers = [];
        this.functions = [];
        this.returnStatements = [];
        this.trackedIdentifiers = null;
        this.states = [];
        this.newFunctionContext();
        this.scan(ast);
      }
      isState(state) {
        return this.states[this.states.length - 1] === state;
      }
      hasState(state) {
        return this.states.indexOf(state) > -1;
      }
      pushState(state) {
        this.states.push(state);
      }
      popState(state) {
        if (this.isState(state)) this.states.pop(); else throw new Error(`Cannot pop the non-active state "${state}"`);
      }
      get currentFunctionContext() {
        return last(this.functionContexts);
      }
      get currentContext() {
        return last(this.runningContexts);
      }
      newFunctionContext() {
        const newContext = {
          "@contextType": "function"
        };
        this.contexts.push(newContext);
        this.functionContexts.push(newContext);
      }
      newContext(run) {
        const newContext = Object.assign({
          "@contextType": "const/let"
        }, this.currentContext);
        this.contexts.push(newContext);
        this.runningContexts.push(newContext);
        run();
        const {currentFunctionContext: currentFunctionContext} = this;
        for (const p in currentFunctionContext) {
          if (!currentFunctionContext.hasOwnProperty(p) || newContext.hasOwnProperty(p)) continue;
          newContext[p] = currentFunctionContext[p];
        }
        this.runningContexts.pop();
        return newContext;
      }
      useFunctionContext(run) {
        const functionContext = last(this.functionContexts);
        this.runningContexts.push(functionContext);
        run();
        this.runningContexts.pop();
      }
      getIdentifiers(run) {
        const trackedIdentifiers = this.trackedIdentifiers = [];
        this.pushState(states.trackIdentifiers);
        run();
        this.trackedIdentifiers = null;
        this.popState(states.trackIdentifiers);
        return trackedIdentifiers;
      }
      getDeclaration(name) {
        const {currentContext: currentContext, currentFunctionContext: currentFunctionContext, runningContexts: runningContexts} = this;
        const declaration = currentContext[name] || currentFunctionContext[name] || null;
        if (!declaration && currentContext === currentFunctionContext && runningContexts.length > 0) {
          const previousRunningContext = runningContexts[runningContexts.length - 2];
          if (previousRunningContext[name]) return previousRunningContext[name];
        }
        return declaration;
      }
      scan(ast) {
        if (!ast) return;
        if (Array.isArray(ast)) {
          for (let i = 0; i < ast.length; i++) this.scan(ast[i]);
          return;
        }
        switch (ast.type) {
         case "Program":
          this.useFunctionContext(() => {
            this.scan(ast.body);
          });
          break;

         case "BlockStatement":
          this.newContext(() => {
            this.scan(ast.body);
          });
          break;

         case "AssignmentExpression":
         case "LogicalExpression":
          this.scan(ast.left);
          this.scan(ast.right);
          break;

         case "BinaryExpression":
          this.scan(ast.left);
          this.scan(ast.right);
          break;

         case "UpdateExpression":
          if (ast.operator === "++") {
            const declaration = this.getDeclaration(ast.argument.name);
            if (declaration) declaration.suggestedType = "Integer";
          }
          this.scan(ast.argument);
          break;

         case "UnaryExpression":
          this.scan(ast.argument);
          break;

         case "VariableDeclaration":
          if (ast.kind === "var") this.useFunctionContext(() => {
            ast.declarations = utils.normalizeDeclarations(ast);
            this.scan(ast.declarations);
          }); else {
            ast.declarations = utils.normalizeDeclarations(ast);
            this.scan(ast.declarations);
          }
          break;

         case "VariableDeclarator":
          {
            const {currentContext: currentContext} = this;
            const inForLoopInit = this.hasState(states.inForLoopInit);
            const declaration = {
              ast: ast,
              context: currentContext,
              name: ast.id.name,
              origin: "declaration",
              inForLoopInit: inForLoopInit,
              inForLoopTest: null,
              assignable: currentContext === this.currentFunctionContext || !inForLoopInit && !currentContext.hasOwnProperty(ast.id.name),
              suggestedType: null,
              valueType: null,
              dependencies: null,
              isSafe: null
            };
            if (!currentContext[ast.id.name]) currentContext[ast.id.name] = declaration;
            this.declarations.push(declaration);
            this.scan(ast.id);
            this.scan(ast.init);
            break;
          }

         case "FunctionExpression":
         case "FunctionDeclaration":
          if (this.runningContexts.length === 0) this.scan(ast.body); else this.functions.push(ast);
          break;

         case "IfStatement":
          this.scan(ast.test);
          this.scan(ast.consequent);
          if (ast.alternate) this.scan(ast.alternate);
          break;

         case "ForStatement":
          {
            let testIdentifiers;
            const context = this.newContext(() => {
              this.pushState(states.inForLoopInit);
              this.scan(ast.init);
              this.popState(states.inForLoopInit);
              testIdentifiers = this.getIdentifiers(() => {
                this.scan(ast.test);
              });
              this.scan(ast.update);
              this.newContext(() => {
                this.scan(ast.body);
              });
            });
            if (testIdentifiers) for (const p in context) {
              if (p === "@contextType") continue;
              if (testIdentifiers.indexOf(p) > -1) context[p].inForLoopTest = true;
            }
            break;
          }

         case "DoWhileStatement":
         case "WhileStatement":
          this.newContext(() => {
            this.scan(ast.body);
            this.scan(ast.test);
          });
          break;

         case "Identifier":
          if (this.isState(states.trackIdentifiers)) this.trackedIdentifiers.push(ast.name);
          this.identifiers.push({
            context: this.currentContext,
            declaration: this.getDeclaration(ast.name),
            ast: ast
          });
          break;

         case "ReturnStatement":
          this.returnStatements.push(ast);
          this.scan(ast.argument);
          break;

         case "MemberExpression":
          this.pushState(states.memberExpression);
          this.scan(ast.object);
          this.scan(ast.property);
          this.popState(states.memberExpression);
          break;

         case "ExpressionStatement":
          this.scan(ast.expression);
          break;

         case "SequenceExpression":
          this.scan(ast.expressions);
          break;

         case "CallExpression":
          this.functionCalls.push({
            context: this.currentContext,
            ast: ast
          });
          this.scan(ast.arguments);
          break;

         case "ArrayExpression":
          this.scan(ast.elements);
          break;

         case "ConditionalExpression":
          this.scan(ast.test);
          this.scan(ast.alternate);
          this.scan(ast.consequent);
          break;

         case "SwitchStatement":
          this.scan(ast.discriminant);
          this.scan(ast.cases);
          break;

         case "SwitchCase":
          this.scan(ast.test);
          this.scan(ast.consequent);
          break;

         case "ThisExpression":
         case "Literal":
         case "DebuggerStatement":
         case "EmptyStatement":
         case "BreakStatement":
         case "ContinueStatement":
          break;

         default:
          throw new Error(`unhandled type "${ast.type}"`);
        }
      }
    };
    module.exports = {
      FunctionTracer: FunctionTracer
    };
  });
  var require_function_node$5 = __commonJSMin((exports, module) => {
    const acorn = require_empty_module();
    const {utils: utils} = require_utils();
    const {FunctionTracer: FunctionTracer} = require_function_tracer();
    const mathProperties = [ "E", "PI", "SQRT2", "SQRT1_2", "LN2", "LN10", "LOG2E", "LOG10E" ];
    const mathFunctions = [ "abs", "acos", "acosh", "asin", "asinh", "atan", "atan2", "atanh", "cbrt", "ceil", "clz32", "cos", "cosh", "expm1", "exp", "floor", "fround", "imul", "log", "log2", "log10", "log1p", "max", "min", "pow", "random", "round", "sign", "sin", "sinh", "sqrt", "tan", "tanh", "trunc" ];
    const allowedExpressions = [ "value", "value[]", "value[][]", "value[][][]", "value[][][][]", "value.value", "value.thread.value", "this.thread.value", "this.output.value", "this.constants.value", "this.constants.value[]", "this.constants.value[][]", "this.constants.value[][][]", "this.constants.value[][][][]", "fn()[]", "fn()[][]", "fn()[][][]", "[][]" ];
    var FunctionNode = class {
      constructor(source, settings) {
        if (!source && !settings.ast) throw new Error("source parameter is missing");
        settings = settings || {};
        this.source = source;
        this.ast = null;
        this.name = typeof source === "string" ? settings.isRootKernel ? "kernel" : settings.name || utils.getFunctionNameFromString(source) : null;
        this.calledFunctions = [];
        this.constants = {};
        this.constantTypes = {};
        this.constantBitRatios = {};
        this.isRootKernel = false;
        this.isSubKernel = false;
        this.debug = null;
        this.functions = null;
        this.identifiers = null;
        this.contexts = null;
        this.functionCalls = null;
        this.states = [];
        this.needsArgumentType = null;
        this.assignArgumentType = null;
        this.lookupReturnType = null;
        this.lookupFunctionArgumentTypes = null;
        this.lookupFunctionArgumentBitRatio = null;
        this.triggerImplyArgumentType = null;
        this.triggerImplyArgumentBitRatio = null;
        this.onNestedFunction = null;
        this.onFunctionCall = null;
        this.optimizeFloatMemory = null;
        this.precision = null;
        this.loopMaxIterations = null;
        this.argumentNames = typeof this.source === "string" ? utils.getArgumentNamesFromString(this.source) : null;
        this.argumentTypes = [];
        this.argumentSizes = [];
        this.argumentBitRatios = null;
        this.returnType = null;
        this.output = [];
        this.plugins = null;
        this.leadingReturnStatement = null;
        this.followingReturnStatement = null;
        this.dynamicOutput = null;
        this.dynamicArguments = null;
        this.strictTypingChecking = false;
        this.fixIntegerDivisionAccuracy = null;
        if (settings) for (const p in settings) {
          if (!settings.hasOwnProperty(p)) continue;
          if (!this.hasOwnProperty(p)) continue;
          this[p] = settings[p];
        }
        this.literalTypes = {};
        this.validate();
        this._string = null;
        this._internalVariableNames = {};
      }
      validate() {
        if (typeof this.source !== "string" && !this.ast) throw new Error("this.source not a string");
        if (!this.ast && !utils.isFunctionString(this.source)) throw new Error("this.source not a function string");
        if (!this.name) throw new Error("Function name could not be determined: the source has no name (bundlers strip the name off a named function expression) and no { name } setting was given. Pass a function declaration by reference, or add { name: '...' } to the addFunction settings.");
        if (this.argumentTypes.length > 0 && this.argumentTypes.length !== this.argumentNames.length) throw new Error(`argumentTypes count of ${this.argumentTypes.length} exceeds ${this.argumentNames.length}`);
        if (this.output.length < 1) throw new Error("this.output is not big enough");
      }
      isIdentifierConstant(name) {
        if (!this.constants) return false;
        return this.constants.hasOwnProperty(name);
      }
      isInput(argumentName) {
        return this.argumentTypes[this.argumentNames.indexOf(argumentName)] === "Input";
      }
      pushState(state) {
        this.states.push(state);
      }
      popState(state) {
        if (this.state !== state) throw new Error(`Cannot popState ${state} when in ${this.state}`);
        this.states.pop();
      }
      isState(state) {
        return this.state === state;
      }
      get state() {
        return this.states[this.states.length - 1];
      }
      astMemberExpressionUnroll(ast) {
        if (ast.type === "Identifier") return ast.name; else if (ast.type === "ThisExpression") return "this";
        if (ast.type === "MemberExpression") {
          if (ast.object && ast.property) {
            if (ast.object.hasOwnProperty("name") && ast.object.name !== "Math") return this.astMemberExpressionUnroll(ast.property);
            return this.astMemberExpressionUnroll(ast.object) + "." + this.astMemberExpressionUnroll(ast.property);
          }
        }
        if (ast.hasOwnProperty("expressions")) {
          const firstExpression = ast.expressions[0];
          if (firstExpression.type === "Literal" && firstExpression.value === 0 && ast.expressions.length === 2) return this.astMemberExpressionUnroll(ast.expressions[1]);
        }
        throw this.astErrorOutput("Unknown astMemberExpressionUnroll", ast);
      }
      get requiresSequenceFreeForInit() {
        return false;
      }
      getJsAST(inParser) {
        if (this.ast) return this.ast;
        if (typeof this.source === "object") {
          normalizeMinifiedStatements(this.source, this.requiresSequenceFreeForInit);
          this.traceFunctionAST(this.source);
          return this.ast = this.source;
        }
        inParser = inParser || acorn;
        if (inParser === null) throw new Error("Missing JS to AST parser");
        const ast = Object.freeze(inParser.parse(`const parser_${this.name} = ${this.source};`, {
          locations: true,
          ecmaVersion: 2020
        }));
        const functionAST = ast.body[0].declarations[0].init;
        normalizeMinifiedStatements(functionAST, this.requiresSequenceFreeForInit);
        this.traceFunctionAST(functionAST);
        if (!ast) throw new Error("Failed to parse JS code");
        return this.ast = functionAST;
      }
      getAssignedArguments() {
        if (this._assignedArguments) return this._assignedArguments;
        const assigned = new Set;
        const redeclared = new Set;
        const names = this.argumentNames || [];
        const walk = node => {
          if (!node || typeof node !== "object") return;
          if (Array.isArray(node)) {
            for (const child of node) walk(child);
            return;
          }
          if (node.type === "AssignmentExpression" && node.left.type === "Identifier" && names.indexOf(node.left.name) !== -1) assigned.add(node.left.name);
          if (node.type === "UpdateExpression" && node.argument.type === "Identifier" && names.indexOf(node.argument.name) !== -1) assigned.add(node.argument.name);
          if (node.type === "VariableDeclarator" && node.id.type === "Identifier" && names.indexOf(node.id.name) !== -1) redeclared.add(node.id.name);
          for (const key in node) {
            if (key === "loc" || key === "range" || key === "parent") continue;
            const child = node[key];
            if (child && typeof child === "object") walk(child);
          }
        };
        walk(this.getJsAST());
        for (const name of redeclared) assigned.delete(name);
        return this._assignedArguments = assigned;
      }
      traceFunctionAST(ast) {
        const {contexts: contexts, declarations: declarations, functions: functions, identifiers: identifiers, functionCalls: functionCalls} = new FunctionTracer(ast);
        this.contexts = contexts;
        this.identifiers = identifiers;
        this.functionCalls = functionCalls;
        this.functions = functions;
        for (let i = 0; i < declarations.length; i++) {
          const declaration = declarations[i];
          const {ast: ast, inForLoopInit: inForLoopInit, inForLoopTest: inForLoopTest} = declaration;
          const {init: init} = ast;
          const dependencies = this.getDependencies(init);
          let valueType = null;
          if (inForLoopInit && inForLoopTest) valueType = "Integer"; else if (init) {
            const realType = this.getType(init);
            switch (realType) {
             case "Integer":
             case "Float":
             case "Number":
              if (init.type === "MemberExpression") valueType = realType; else valueType = "Number";
              break;

             case "LiteralInteger":
              valueType = "Number";
              break;

             default:
              valueType = realType;
            }
          }
          declaration.valueType = valueType;
          declaration.dependencies = dependencies;
          declaration.isSafe = this.isSafeDependencies(dependencies);
        }
        for (let i = 0; i < functions.length; i++) this.onNestedFunction(functions[i], this.source);
      }
      getDeclaration(ast) {
        for (let i = 0; i < this.identifiers.length; i++) {
          const identifier = this.identifiers[i];
          if (ast === identifier.ast) return identifier.declaration;
        }
        return null;
      }
      getVariableType(ast) {
        if (ast.type !== "Identifier") throw new Error(`ast of ${ast.type} not "Identifier"`);
        let type = null;
        const argumentIndex = this.argumentNames.indexOf(ast.name);
        if (argumentIndex === -1) {
          const declaration = this.getDeclaration(ast);
          if (declaration) return declaration.valueType;
        } else {
          const argumentType = this.argumentTypes[argumentIndex];
          if (argumentType) type = argumentType;
        }
        if (!type && this.strictTypingChecking) throw new Error(`Declaration of ${name} not found`);
        return type;
      }
      getLookupType(type) {
        if (!typeLookupMap.hasOwnProperty(type)) throw new Error(`unknown typeLookupMap ${type}`);
        return typeLookupMap[type];
      }
      getConstantType(constantName) {
        if (this.constantTypes[constantName]) {
          const type = this.constantTypes[constantName];
          if (type === "Float") return "Number"; else return type;
        }
        throw new Error(`Type for constant "${constantName}" not declared`);
      }
      toString() {
        if (this._string) return this._string;
        return this._string = this.astGeneric(this.getJsAST(), []).join("").trim();
      }
      toJSON() {
        const settings = {
          source: this.source,
          name: this.name,
          constants: this.constants,
          constantTypes: this.constantTypes,
          isRootKernel: this.isRootKernel,
          isSubKernel: this.isSubKernel,
          debug: this.debug,
          output: this.output,
          loopMaxIterations: this.loopMaxIterations,
          argumentNames: this.argumentNames,
          argumentTypes: this.argumentTypes,
          argumentSizes: this.argumentSizes,
          returnType: this.returnType,
          leadingReturnStatement: this.leadingReturnStatement,
          followingReturnStatement: this.followingReturnStatement
        };
        return {
          ast: this.ast,
          settings: settings
        };
      }
      getType(ast) {
        if (Array.isArray(ast)) return this.getType(ast[ast.length - 1]);
        switch (ast.type) {
         case "BlockStatement":
          return this.getType(ast.body);

         case "ArrayExpression":
          switch (this.getType(ast.elements[0])) {
           case "Array(2)":
           case "Array(3)":
           case "Array(4)":
            return `Matrix(${ast.elements.length})`;
          }
          return `Array(${ast.elements.length})`;

         case "Literal":
          const literalKey = this.astKey(ast);
          if (this.literalTypes[literalKey]) return this.literalTypes[literalKey];
          if (Number.isInteger(ast.value)) return "LiteralInteger"; else if (ast.value === true || ast.value === false) return "Boolean"; else return "Number";

         case "AssignmentExpression":
          return this.getType(ast.left);

         case "CallExpression":
          if (this.isAstMathFunction(ast)) return "Number";
          if (!ast.callee || !ast.callee.name) {
            if (ast.callee.type === "SequenceExpression" && ast.callee.expressions[ast.callee.expressions.length - 1].property.name) {
              const functionName = ast.callee.expressions[ast.callee.expressions.length - 1].property.name;
              this.inferArgumentTypesIfNeeded(functionName, ast.arguments);
              return this.lookupReturnType(functionName, ast, this);
            }
            if (this.getVariableSignature(ast.callee, true) === "this.color") return null;
            if (ast.callee.type === "MemberExpression" && ast.callee.object && ast.callee.property && ast.callee.property.name && ast.arguments) {
              const functionName = ast.callee.property.name;
              this.inferArgumentTypesIfNeeded(functionName, ast.arguments);
              return this.lookupReturnType(functionName, ast, this);
            }
            throw this.astErrorOutput("Unknown call expression", ast);
          }
          if (ast.callee && ast.callee.name) {
            const functionName = ast.callee.name;
            this.inferArgumentTypesIfNeeded(functionName, ast.arguments);
            return this.lookupReturnType(functionName, ast, this);
          }
          throw this.astErrorOutput(`Unhandled getType Type "${ast.type}"`, ast);

         case "LogicalExpression":
          return "Boolean";

         case "BinaryExpression":
          switch (ast.operator) {
           case "%":
            return "Number";

           case "/":
            return "Number";

           case ">":
           case "<":
            return "Boolean";

           case "&":
           case "|":
           case "^":
           case "<<":
           case ">>":
           case ">>>":
            return "Integer";
          }
          const type = this.getType(ast.left);
          if (this.isState("skip-literal-correction")) return type;
          if (type === "LiteralInteger") {
            const rightType = this.getType(ast.right);
            if (rightType === "LiteralInteger") if (ast.left.value % 1 === 0) return "Integer"; else return "Float";
            return rightType;
          }
          if (type === "Integer") {
            const rightType = this.getType(ast.right);
            if (rightType === "Number" || rightType === "Float") return rightType;
          }
          return typeLookupMap[type] || type;

         case "UpdateExpression":
          return this.getType(ast.argument);

         case "UnaryExpression":
          if (ast.operator === "~") return "Integer";
          return this.getType(ast.argument);

         case "VariableDeclaration":
          {
            const declarations = ast.declarations;
            let lastType;
            for (let i = 0; i < declarations.length; i++) {
              const declaration = declarations[i];
              lastType = this.getType(declaration);
            }
            if (!lastType) throw this.astErrorOutput(`Unable to find type for declaration`, ast);
            return lastType;
          }

         case "VariableDeclarator":
          const declaration = this.getDeclaration(ast.id);
          if (!declaration) throw this.astErrorOutput(`Unable to find declarator`, ast);
          if (!declaration.valueType) throw this.astErrorOutput(`Unable to find declarator valueType`, ast);
          return declaration.valueType;

         case "Identifier":
          if (ast.name === "Infinity") return "Number";
          if (this.isAstVariable(ast)) {
            if (this.getVariableSignature(ast) === "value") return this.getCheckVariableType(ast);
          }
          const origin = this.findIdentifierOrigin(ast);
          if (origin && origin.init) return this.getType(origin.init);
          return null;

         case "ReturnStatement":
          return this.getType(ast.argument);

         case "MemberExpression":
          if (this.isAstMathFunction(ast)) {
            switch (ast.property.name) {
             case "ceil":
              return "Integer";

             case "floor":
              return "Integer";

             case "round":
              return "Integer";
            }
            return "Number";
          }
          if (this.isAstVariable(ast)) {
            switch (this.getVariableSignature(ast)) {
             case "value[]":
              return this.getLookupType(this.getCheckVariableType(ast.object));

             case "value[][]":
              return this.getLookupType(this.getCheckVariableType(ast.object.object));

             case "value[][][]":
              return this.getLookupType(this.getCheckVariableType(ast.object.object.object));

             case "value[][][][]":
              return this.getLookupType(this.getCheckVariableType(ast.object.object.object.object));

             case "value.thread.value":
             case "this.thread.value":
              return "Integer";

             case "this.output.value":
              return this.dynamicOutput ? "Integer" : "LiteralInteger";

             case "this.constants.value":
              return this.getConstantType(ast.property.name);

             case "this.constants.value[]":
              return this.getLookupType(this.getConstantType(ast.object.property.name));

             case "this.constants.value[][]":
              return this.getLookupType(this.getConstantType(ast.object.object.property.name));

             case "this.constants.value[][][]":
              return this.getLookupType(this.getConstantType(ast.object.object.object.property.name));

             case "this.constants.value[][][][]":
              return this.getLookupType(this.getConstantType(ast.object.object.object.object.property.name));

             case "fn()[]":
             case "fn()[][]":
             case "fn()[][][]":
              return this.getLookupType(this.getType(ast.object));

             case "value.value":
              if (this.isAstMathVariable(ast)) return "Number";
              switch (ast.property.name) {
               case "r":
               case "g":
               case "b":
               case "a":
                return this.getLookupType(this.getCheckVariableType(ast.object));
              }

             case "[][]":
              return "Number";
            }
            throw this.astErrorOutput("Unhandled getType MemberExpression", ast);
          }
          throw this.astErrorOutput("Unhandled getType MemberExpression", ast);

         case "ConditionalExpression":
          return this.getType(ast.consequent);

         case "FunctionDeclaration":
         case "FunctionExpression":
          const lastReturn = this.findLastReturn(ast.body);
          if (lastReturn) return this.getType(lastReturn);
          return null;

         case "IfStatement":
          return this.getType(ast.consequent);

         case "SequenceExpression":
          return this.getType(ast.expressions[ast.expressions.length - 1]);

         default:
          throw this.astErrorOutput(`Unhandled getType Type "${ast.type}"`, ast);
        }
      }
      getCheckVariableType(ast) {
        const type = this.getVariableType(ast);
        if (!type) throw this.astErrorOutput(`${ast.type} is not defined`, ast);
        return type;
      }
      inferArgumentTypesIfNeeded(functionName, args) {
        for (let i = 0; i < args.length; i++) {
          if (!this.needsArgumentType(functionName, i)) continue;
          const type = this.getType(args[i]);
          if (!type) throw this.astErrorOutput(`Unable to infer argument ${i}`, args[i]);
          this.assignArgumentType(functionName, i, type);
        }
      }
      isAstMathVariable(ast) {
        return ast.type === "MemberExpression" && ast.object && ast.object.type === "Identifier" && ast.object.name === "Math" && ast.property && ast.property.type === "Identifier" && mathProperties.includes(ast.property.name);
      }
      isAstMathFunction(ast) {
        return ast.type === "CallExpression" && ast.callee && ast.callee.type === "MemberExpression" && ast.callee.object && ast.callee.object.type === "Identifier" && ast.callee.object.name === "Math" && ast.callee.property && ast.callee.property.type === "Identifier" && mathFunctions.includes(ast.callee.property.name);
      }
      isAstVariable(ast) {
        return ast.type === "Identifier" || ast.type === "MemberExpression";
      }
      isSafe(ast) {
        return this.isSafeDependencies(this.getDependencies(ast));
      }
      isSafeDependencies(dependencies) {
        return dependencies && dependencies.every ? dependencies.every(dependency => dependency.isSafe) : true;
      }
      getDependencies(ast, dependencies, isNotSafe) {
        if (!dependencies) dependencies = [];
        if (!ast) return null;
        if (Array.isArray(ast)) {
          for (let i = 0; i < ast.length; i++) this.getDependencies(ast[i], dependencies, isNotSafe);
          return dependencies;
        }
        switch (ast.type) {
         case "AssignmentExpression":
          this.getDependencies(ast.left, dependencies, isNotSafe);
          this.getDependencies(ast.right, dependencies, isNotSafe);
          return dependencies;

         case "ConditionalExpression":
          this.getDependencies(ast.test, dependencies, isNotSafe);
          this.getDependencies(ast.alternate, dependencies, isNotSafe);
          this.getDependencies(ast.consequent, dependencies, isNotSafe);
          return dependencies;

         case "Literal":
          dependencies.push({
            origin: "literal",
            value: ast.value,
            isSafe: isNotSafe === true ? false : ast.value > -Infinity && ast.value < Infinity && !isNaN(ast.value)
          });
          break;

         case "VariableDeclarator":
          return this.getDependencies(ast.init, dependencies, isNotSafe);

         case "Identifier":
          const declaration = this.getDeclaration(ast);
          if (declaration) dependencies.push({
            name: ast.name,
            origin: "declaration",
            isSafe: isNotSafe ? false : this.isSafeDependencies(declaration.dependencies)
          }); else if (this.argumentNames.indexOf(ast.name) > -1) dependencies.push({
            name: ast.name,
            origin: "argument",
            isSafe: false
          }); else if (this.strictTypingChecking) throw new Error(`Cannot find identifier origin "${ast.name}"`);
          break;

         case "FunctionDeclaration":
          return this.getDependencies(ast.body.body[ast.body.body.length - 1], dependencies, isNotSafe);

         case "ReturnStatement":
          return this.getDependencies(ast.argument, dependencies);

         case "BinaryExpression":
         case "LogicalExpression":
          isNotSafe = ast.operator === "/" || ast.operator === "*";
          this.getDependencies(ast.left, dependencies, isNotSafe);
          this.getDependencies(ast.right, dependencies, isNotSafe);
          return dependencies;

         case "UnaryExpression":
         case "UpdateExpression":
          return this.getDependencies(ast.argument, dependencies, isNotSafe);

         case "VariableDeclaration":
          return this.getDependencies(ast.declarations, dependencies, isNotSafe);

         case "ArrayExpression":
          dependencies.push({
            origin: "declaration",
            isSafe: true
          });
          return dependencies;

         case "CallExpression":
          dependencies.push({
            origin: "function",
            isSafe: true
          });
          return dependencies;

         case "MemberExpression":
          const details = this.getMemberExpressionDetails(ast);
          switch (details.signature) {
           case "value[]":
            this.getDependencies(ast.object, dependencies, isNotSafe);
            break;

           case "value[][]":
            this.getDependencies(ast.object.object, dependencies, isNotSafe);
            break;

           case "value[][][]":
            this.getDependencies(ast.object.object.object, dependencies, isNotSafe);
            break;

           case "this.output.value":
            if (this.dynamicOutput) dependencies.push({
              name: details.name,
              origin: "output",
              isSafe: false
            });
            break;
          }
          if (details) {
            if (details.property) this.getDependencies(details.property, dependencies, isNotSafe);
            if (details.xProperty) this.getDependencies(details.xProperty, dependencies, isNotSafe);
            if (details.yProperty) this.getDependencies(details.yProperty, dependencies, isNotSafe);
            if (details.zProperty) this.getDependencies(details.zProperty, dependencies, isNotSafe);
            return dependencies;
          }

         case "SequenceExpression":
          return this.getDependencies(ast.expressions, dependencies, isNotSafe);

         default:
          throw this.astErrorOutput(`Unhandled type ${ast.type} in getDependencies`, ast);
        }
        return dependencies;
      }
      getVariableSignature(ast, returnRawValue) {
        if (!this.isAstVariable(ast)) throw new Error(`ast of type "${ast.type}" is not a variable signature`);
        if (ast.type === "Identifier") return "value";
        const signature = [];
        while (true) {
          if (!ast) break;
          if (ast.computed) signature.push("[]"); else if (ast.type === "ThisExpression") signature.unshift("this"); else if (ast.property && ast.property.name) if (ast.property.name === "x" || ast.property.name === "y" || ast.property.name === "z") signature.unshift(returnRawValue ? "." + ast.property.name : ".value"); else if (ast.property.name === "constants" || ast.property.name === "thread" || ast.property.name === "output") signature.unshift("." + ast.property.name); else signature.unshift(returnRawValue ? "." + ast.property.name : ".value"); else if (ast.name) signature.unshift(returnRawValue ? ast.name : "value"); else if (ast.callee && ast.callee.name) signature.unshift(returnRawValue ? ast.callee.name + "()" : "fn()"); else if (ast.elements) signature.unshift("[]"); else signature.unshift("unknown");
          ast = ast.object;
        }
        const signatureString = signature.join("");
        if (returnRawValue) return signatureString;
        if (allowedExpressions.includes(signatureString)) return signatureString;
        return null;
      }
      build() {
        return this.toString().length > 0;
      }
      astGeneric(ast, retArr) {
        if (ast === null) throw this.astErrorOutput("NULL ast", ast); else {
          if (Array.isArray(ast)) {
            for (let i = 0; i < ast.length; i++) this.astGeneric(ast[i], retArr);
            return retArr;
          }
          switch (ast.type) {
           case "FunctionDeclaration":
            return this.astFunctionDeclaration(ast, retArr);

           case "FunctionExpression":
            return this.astFunctionExpression(ast, retArr);

           case "ReturnStatement":
            return this.astReturnStatement(ast, retArr);

           case "Literal":
            return this.astLiteral(ast, retArr);

           case "BinaryExpression":
            return this.astBinaryExpression(ast, retArr);

           case "Identifier":
            return this.astIdentifierExpression(ast, retArr);

           case "AssignmentExpression":
            return this.astAssignmentExpression(ast, retArr);

           case "ExpressionStatement":
            return this.astExpressionStatement(ast, retArr);

           case "EmptyStatement":
            return this.astEmptyStatement(ast, retArr);

           case "BlockStatement":
            return this.astBlockStatement(ast, retArr);

           case "IfStatement":
            return this.astIfStatement(ast, retArr);

           case "SwitchStatement":
            return this.astSwitchStatement(ast, retArr);

           case "BreakStatement":
            return this.astBreakStatement(ast, retArr);

           case "ContinueStatement":
            return this.astContinueStatement(ast, retArr);

           case "ForStatement":
            return this.astForStatement(ast, retArr);

           case "WhileStatement":
            return this.astWhileStatement(ast, retArr);

           case "DoWhileStatement":
            return this.astDoWhileStatement(ast, retArr);

           case "VariableDeclaration":
            return this.astVariableDeclaration(ast, retArr);

           case "VariableDeclarator":
            return this.astVariableDeclarator(ast, retArr);

           case "ThisExpression":
            return this.astThisExpression(ast, retArr);

           case "SequenceExpression":
            return this.astSequenceExpression(ast, retArr);

           case "UnaryExpression":
            return this.astUnaryExpression(ast, retArr);

           case "UpdateExpression":
            return this.astUpdateExpression(ast, retArr);

           case "LogicalExpression":
            return this.astLogicalExpression(ast, retArr);

           case "MemberExpression":
            return this.astMemberExpression(ast, retArr);

           case "CallExpression":
            return this.astCallExpression(ast, retArr);

           case "ArrayExpression":
            return this.astArrayExpression(ast, retArr);

           case "DebuggerStatement":
            return this.astDebuggerStatement(ast, retArr);

           case "ConditionalExpression":
            return this.astConditionalExpression(ast, retArr);
          }
          throw this.astErrorOutput("Unknown ast type : " + ast.type, ast);
        }
      }
      astErrorOutput(error, ast) {
        if (typeof this.source !== "string") return new Error(error);
        const debugString = utils.getAstString(this.source, ast);
        const splitLines = this.source.slice(ast.start).split(/\n/);
        const lineBefore = splitLines.length > 0 ? splitLines[splitLines.length - 1] : 0;
        return new Error(`${error} on line ${splitLines.length}, position ${lineBefore.length}:\n ${debugString}`);
      }
      astDebuggerStatement(arrNode, retArr) {
        return retArr;
      }
      astConditionalExpression(ast, retArr) {
        if (ast.type !== "ConditionalExpression") throw this.astErrorOutput("Not a conditional expression", ast);
        retArr.push("(");
        this.astGeneric(ast.test, retArr);
        retArr.push("?");
        this.astGeneric(ast.consequent, retArr);
        retArr.push(":");
        this.astGeneric(ast.alternate, retArr);
        retArr.push(")");
        return retArr;
      }
      astFunction(ast, retArr) {
        throw new Error(`"astFunction" not defined on ${this.constructor.name}`);
      }
      astFunctionDeclaration(ast, retArr) {
        if (this.isChildFunction(ast)) return retArr;
        return this.astFunction(ast, retArr);
      }
      astFunctionExpression(ast, retArr) {
        if (this.isChildFunction(ast)) return retArr;
        return this.astFunction(ast, retArr);
      }
      isChildFunction(ast) {
        for (let i = 0; i < this.functions.length; i++) if (this.functions[i] === ast) return true;
        return false;
      }
      astReturnStatement(ast, retArr) {
        return retArr;
      }
      astLiteral(ast, retArr) {
        this.literalTypes[this.astKey(ast)] = "Number";
        return retArr;
      }
      astBinaryExpression(ast, retArr) {
        return retArr;
      }
      astIdentifierExpression(ast, retArr) {
        return retArr;
      }
      astAssignmentExpression(ast, retArr) {
        return retArr;
      }
      astExpressionStatement(esNode, retArr) {
        if (esNode.expression.type === "AssignmentExpression") this.pushState("assignment-as-statement");
        this.astGeneric(esNode.expression, retArr);
        retArr.push(";");
        return retArr;
      }
      astEmptyStatement(eNode, retArr) {
        return retArr;
      }
      astBlockStatement(ast, retArr) {
        return retArr;
      }
      astIfStatement(ast, retArr) {
        return retArr;
      }
      astSwitchStatement(ast, retArr) {
        return retArr;
      }
      astBreakStatement(brNode, retArr) {
        retArr.push("break;");
        return retArr;
      }
      astContinueStatement(crNode, retArr) {
        retArr.push("continue;\n");
        return retArr;
      }
      astForStatement(ast, retArr) {
        return retArr;
      }
      astWhileStatement(ast, retArr) {
        return retArr;
      }
      astDoWhileStatement(ast, retArr) {
        return retArr;
      }
      astVariableDeclarator(iVarDecNode, retArr) {
        this.astGeneric(iVarDecNode.id, retArr);
        if (iVarDecNode.init !== null) {
          retArr.push("=");
          this.astGeneric(iVarDecNode.init, retArr);
        }
        return retArr;
      }
      astThisExpression(ast, retArr) {
        return retArr;
      }
      astSequenceExpression(sNode, retArr) {
        const {expressions: expressions} = sNode;
        const sequenceResult = [];
        for (let i = 0; i < expressions.length; i++) {
          const expression = expressions[i];
          const expressionResult = [];
          this.astGeneric(expression, expressionResult);
          sequenceResult.push(expressionResult.join(""));
        }
        if (sequenceResult.length > 1) retArr.push("(", sequenceResult.join(","), ")"); else retArr.push(sequenceResult[0]);
        return retArr;
      }
      astUnaryExpression(uNode, retArr) {
        if (this.checkAndUpconvertBitwiseUnary(uNode, retArr)) return retArr;
        if (uNode.prefix) {
          retArr.push(uNode.operator);
          this.astGeneric(uNode.argument, retArr);
        } else {
          this.astGeneric(uNode.argument, retArr);
          retArr.push(uNode.operator);
        }
        return retArr;
      }
      checkAndUpconvertBitwiseUnary(uNode, retArr) {}
      astUpdateExpression(uNode, retArr) {
        if (uNode.prefix) {
          retArr.push(uNode.operator);
          this.astGeneric(uNode.argument, retArr);
        } else {
          this.astGeneric(uNode.argument, retArr);
          retArr.push(uNode.operator);
        }
        return retArr;
      }
      astLogicalExpression(logNode, retArr) {
        retArr.push("(");
        this.astGeneric(logNode.left, retArr);
        retArr.push(logNode.operator);
        this.astGeneric(logNode.right, retArr);
        retArr.push(")");
        return retArr;
      }
      astMemberExpression(ast, retArr) {
        return retArr;
      }
      astCallExpression(ast, retArr) {
        return retArr;
      }
      astArrayExpression(ast, retArr) {
        return retArr;
      }
      getMemberExpressionDetails(ast) {
        if (ast.type !== "MemberExpression") throw this.astErrorOutput(`Expression ${ast.type} not a MemberExpression`, ast);
        let name = null;
        let type = null;
        const variableSignature = this.getVariableSignature(ast);
        switch (variableSignature) {
         case "value":
          return null;

         case "value.thread.value":
         case "this.thread.value":
         case "this.output.value":
          return {
            signature: variableSignature,
            type: "Integer",
            name: ast.property.name
          };

         case "value[]":
          if (typeof ast.object.name !== "string") throw this.astErrorOutput("Unexpected expression", ast);
          name = ast.object.name;
          return {
            name: name,
            origin: "user",
            signature: variableSignature,
            type: this.getVariableType(ast.object),
            xProperty: ast.property
          };

         case "value[][]":
          if (typeof ast.object.object.name !== "string") throw this.astErrorOutput("Unexpected expression", ast);
          name = ast.object.object.name;
          return {
            name: name,
            origin: "user",
            signature: variableSignature,
            type: this.getVariableType(ast.object.object),
            yProperty: ast.object.property,
            xProperty: ast.property
          };

         case "value[][][]":
          if (typeof ast.object.object.object.name !== "string") throw this.astErrorOutput("Unexpected expression", ast);
          name = ast.object.object.object.name;
          return {
            name: name,
            origin: "user",
            signature: variableSignature,
            type: this.getVariableType(ast.object.object.object),
            zProperty: ast.object.object.property,
            yProperty: ast.object.property,
            xProperty: ast.property
          };

         case "value[][][][]":
          if (typeof ast.object.object.object.object.name !== "string") throw this.astErrorOutput("Unexpected expression", ast);
          name = ast.object.object.object.object.name;
          return {
            name: name,
            origin: "user",
            signature: variableSignature,
            type: this.getVariableType(ast.object.object.object.object),
            zProperty: ast.object.object.property,
            yProperty: ast.object.property,
            xProperty: ast.property
          };

         case "value.value":
          if (typeof ast.property.name !== "string") throw this.astErrorOutput("Unexpected expression", ast);
          if (this.isAstMathVariable(ast)) {
            name = ast.property.name;
            return {
              name: name,
              origin: "Math",
              type: "Number",
              signature: variableSignature
            };
          }
          switch (ast.property.name) {
           case "r":
           case "g":
           case "b":
           case "a":
            name = ast.object.name;
            return {
              name: name,
              property: ast.property.name,
              origin: "user",
              signature: variableSignature,
              type: "Number"
            };

           default:
            throw this.astErrorOutput("Unexpected expression", ast);
          }

         case "this.constants.value":
          if (typeof ast.property.name !== "string") throw this.astErrorOutput("Unexpected expression", ast);
          name = ast.property.name;
          type = this.getConstantType(name);
          if (!type) throw this.astErrorOutput("Constant has no type", ast);
          return {
            name: name,
            type: type,
            origin: "constants",
            signature: variableSignature
          };

         case "this.constants.value[]":
          if (typeof ast.object.property.name !== "string") throw this.astErrorOutput("Unexpected expression", ast);
          name = ast.object.property.name;
          type = this.getConstantType(name);
          if (!type) throw this.astErrorOutput("Constant has no type", ast);
          return {
            name: name,
            type: type,
            origin: "constants",
            signature: variableSignature,
            xProperty: ast.property
          };

         case "this.constants.value[][]":
          if (typeof ast.object.object.property.name !== "string") throw this.astErrorOutput("Unexpected expression", ast);
          name = ast.object.object.property.name;
          type = this.getConstantType(name);
          if (!type) throw this.astErrorOutput("Constant has no type", ast);
          return {
            name: name,
            type: type,
            origin: "constants",
            signature: variableSignature,
            yProperty: ast.object.property,
            xProperty: ast.property
          };

         case "this.constants.value[][][]":
          if (typeof ast.object.object.object.property.name !== "string") throw this.astErrorOutput("Unexpected expression", ast);
          name = ast.object.object.object.property.name;
          type = this.getConstantType(name);
          if (!type) throw this.astErrorOutput("Constant has no type", ast);
          return {
            name: name,
            type: type,
            origin: "constants",
            signature: variableSignature,
            zProperty: ast.object.object.property,
            yProperty: ast.object.property,
            xProperty: ast.property
          };

         case "fn()[]":
         case "fn()[][]":
         case "[][]":
          return {
            signature: variableSignature,
            property: ast.property
          };

         default:
          throw this.astErrorOutput("Unexpected expression", ast);
        }
      }
      findIdentifierOrigin(astToFind) {
        const stack = [ this.ast ];
        while (stack.length > 0) {
          const atNode = stack[0];
          if (atNode.type === "VariableDeclarator" && atNode.id && atNode.id.name && atNode.id.name === astToFind.name) return atNode;
          stack.shift();
          if (atNode.argument) stack.push(atNode.argument); else if (atNode.body) stack.push(atNode.body); else if (atNode.declarations) stack.push(atNode.declarations); else if (Array.isArray(atNode)) for (let i = 0; i < atNode.length; i++) stack.push(atNode[i]);
        }
        return null;
      }
      findLastReturn(ast) {
        const stack = [ ast || this.ast ];
        while (stack.length > 0) {
          const atNode = stack.pop();
          if (atNode.type === "ReturnStatement") return atNode;
          if (atNode.type === "FunctionDeclaration") continue;
          if (atNode.argument) stack.push(atNode.argument); else if (atNode.body) stack.push(atNode.body); else if (atNode.declarations) stack.push(atNode.declarations); else if (Array.isArray(atNode)) for (let i = 0; i < atNode.length; i++) stack.push(atNode[i]); else if (atNode.consequent) stack.push(atNode.consequent); else if (atNode.cases) stack.push(atNode.cases);
        }
        return null;
      }
      getInternalVariableName(name) {
        if (!this._internalVariableNames.hasOwnProperty(name)) this._internalVariableNames[name] = 0;
        this._internalVariableNames[name]++;
        if (this._internalVariableNames[name] === 1) return name;
        return name + this._internalVariableNames[name];
      }
      astKey(ast, separator = ",") {
        if (!ast.start || !ast.end) throw new Error("AST start and end needed");
        return `${ast.start}${separator}${ast.end}`;
      }
    };
    const typeLookupMap = {
      Number: "Number",
      Float: "Float",
      Integer: "Integer",
      Array: "Number",
      "Array(2)": "Number",
      "Array(3)": "Number",
      "Array(4)": "Number",
      "Matrix(2)": "Number",
      "Matrix(3)": "Number",
      "Matrix(4)": "Number",
      Array2D: "Number",
      Array3D: "Number",
      Input: "Number",
      HTMLCanvas: "Array(4)",
      OffscreenCanvas: "Array(4)",
      HTMLImage: "Array(4)",
      ImageBitmap: "Array(4)",
      ImageData: "Array(4)",
      HTMLVideo: "Array(4)",
      HTMLImageArray: "Array(4)",
      NumberTexture: "Number",
      MemoryOptimizedNumberTexture: "Number",
      "Array1D(2)": "Array(2)",
      "Array1D(3)": "Array(3)",
      "Array1D(4)": "Array(4)",
      "Array2D(2)": "Array(2)",
      "Array2D(3)": "Array(3)",
      "Array2D(4)": "Array(4)",
      "Array3D(2)": "Array(2)",
      "Array3D(3)": "Array(3)",
      "Array3D(4)": "Array(4)",
      "ArrayTexture(1)": "Number",
      "ArrayTexture(2)": "Array(2)",
      "ArrayTexture(3)": "Array(3)",
      "ArrayTexture(4)": "Array(4)"
    };
    let minifiedSyntheticId = 536870912;
    function stampSynthetic(node, source) {
      node.start = minifiedSyntheticId++;
      node.end = minifiedSyntheticId++;
      if (source && source.loc) node.loc = source.loc;
      return node;
    }
    function normalizeMinifiedStatements(functionAST, hoistSequenceForInit) {
      if (!functionAST || !functionAST.body || functionAST.body.type !== "BlockStatement") return functionAST;
      normalizeMinifiedBlock(functionAST.body, hoistSequenceForInit);
      return functionAST;
    }
    function normalizeMinifiedBlock(block, hoistSequenceForInit) {
      block.body = flattenMinified(block.body, hoistSequenceForInit);
    }
    function flattenMinified(statements, hoistSequenceForInit) {
      const result = [];
      for (let i = 0; i < statements.length; i++) {
        const normalized = normalizeMinifiedStatement(statements[i], hoistSequenceForInit);
        for (let j = 0; j < normalized.length; j++) result.push(normalized[j]);
      }
      return result;
    }
    function normalizeMinifiedStatement(statement, hoistSequenceForInit) {
      switch (statement.type) {
       case "ExpressionStatement":
        return unfoldExpressionStatement(statement);

       case "ReturnStatement":
        if (statement.argument && statement.argument.type === "SequenceExpression") {
          const expressions = statement.argument.expressions;
          const result = [];
          for (let i = 0; i < expressions.length - 1; i++) pushAll(result, unfoldExpressionStatement(toExpressionStatement(expressions[i])));
          statement.argument = expressions[expressions.length - 1];
          result.push(statement);
          return result;
        }
        return [ statement ];

       case "BlockStatement":
        normalizeMinifiedBlock(statement, hoistSequenceForInit);
        return [ statement ];

       case "IfStatement":
        statement.consequent = normalizeMinifiedNested(statement.consequent, hoistSequenceForInit);
        if (statement.alternate) statement.alternate = normalizeMinifiedNested(statement.alternate, hoistSequenceForInit);
        return [ statement ];

       case "ForStatement":
        {
          const before = normalizeMinifiedForHeader(statement, hoistSequenceForInit);
          if (statement.body) statement.body = normalizeMinifiedNested(statement.body, hoistSequenceForInit);
          if (before.length > 0) {
            before.push(statement);
            return before;
          }
          return [ statement ];
        }

       case "WhileStatement":
       case "DoWhileStatement":
        if (statement.body) statement.body = normalizeMinifiedNested(statement.body, hoistSequenceForInit);
        return [ statement ];

       case "SwitchStatement":
        for (let i = 0; i < statement.cases.length; i++) statement.cases[i].consequent = flattenMinified(statement.cases[i].consequent, hoistSequenceForInit);
        return [ statement ];

       default:
        return [ statement ];
      }
    }
    function normalizeMinifiedNested(statement, hoistSequenceForInit) {
      const normalized = normalizeMinifiedStatement(statement, hoistSequenceForInit);
      if (normalized.length === 1) return normalized[0];
      return stampSynthetic({
        type: "BlockStatement",
        body: normalized
      }, statement);
    }
    function unfoldExpressionStatement(statement) {
      const expression = statement.expression;
      switch (expression.type) {
       case "SequenceExpression":
        {
          const result = [];
          for (let i = 0; i < expression.expressions.length; i++) {
            const operand = expression.expressions[i];
            if (operand.type === "Identifier" || operand.type === "Literal") continue;
            pushAll(result, unfoldExpressionStatement(toExpressionStatement(operand)));
          }
          return result;
        }

       case "LogicalExpression":
        return [ stampSynthetic({
          type: "IfStatement",
          test: expression.operator === "&&" ? expression.left : stampSynthetic({
            type: "UnaryExpression",
            operator: "!",
            prefix: true,
            argument: expression.left
          }, expression.left),
          consequent: stampSynthetic({
            type: "BlockStatement",
            body: unfoldExpressionStatement(toExpressionStatement(expression.right))
          }, expression.right),
          alternate: null
        }, expression) ];

       case "ConditionalExpression":
        return [ stampSynthetic({
          type: "IfStatement",
          test: expression.test,
          consequent: stampSynthetic({
            type: "BlockStatement",
            body: unfoldExpressionStatement(toExpressionStatement(expression.consequent))
          }, expression.consequent),
          alternate: stampSynthetic({
            type: "BlockStatement",
            body: unfoldExpressionStatement(toExpressionStatement(expression.alternate))
          }, expression.alternate)
        }, expression) ];

       default:
        return [ statement ];
      }
    }
    function toExpressionStatement(expression) {
      return stampSynthetic({
        type: "ExpressionStatement",
        expression: expression
      }, expression);
    }
    function pushAll(target, items) {
      for (let i = 0; i < items.length; i++) target.push(items[i]);
    }
    function normalizeMinifiedForHeader(statement, hoistSequenceForInit) {
      const before = [];
      if (hoistSequenceForInit && statement.init && statement.init.type === "SequenceExpression") {
        const expressions = statement.init.expressions;
        for (let i = 0; i < expressions.length; i++) pushAll(before, unfoldExpressionStatement(toExpressionStatement(expressions[i])));
        statement.init = null;
      }
      if (statement.update && statement.update.type === "SequenceExpression") {
        const updateStatements = [];
        const expressions = statement.update.expressions;
        for (let i = 0; i < expressions.length; i++) pushAll(updateStatements, unfoldExpressionStatement(toExpressionStatement(expressions[i])));
        const rewritten = prependBeforeContinues(statement.body && statement.body.type === "BlockStatement" ? statement.body : stampSynthetic({
          type: "BlockStatement",
          body: statement.body ? [ statement.body ] : []
        }, statement), updateStatements);
        if (rewritten !== null) {
          statement.update = null;
          statement.body = rewritten;
          pushAll(rewritten.body, updateStatements);
        }
      }
      return before;
    }
    function cloneWithSyntheticPositions(node) {
      if (!node || typeof node !== "object") return node;
      if (Array.isArray(node)) return node.map(cloneWithSyntheticPositions);
      const copy = {};
      for (const key in node) {
        if (key === "parent") continue;
        copy[key] = cloneWithSyntheticPositions(node[key]);
      }
      if (typeof copy.start === "number") {
        copy.start = minifiedSyntheticId++;
        copy.end = minifiedSyntheticId++;
      }
      return copy;
    }
    function prependBeforeContinues(block, prefix) {
      let unsafe = false;
      const visit = node => {
        if (!node || typeof node !== "object" || unsafe) return node;
        if (Array.isArray(node)) return node.map(visit);
        switch (node.type) {
         case "ContinueStatement":
          if (node.label) {
            unsafe = true;
            return node;
          }
          return stampSynthetic({
            type: "BlockStatement",
            body: [ ...cloneWithSyntheticPositions(prefix), node ]
          }, node);

         case "ForStatement":
         case "WhileStatement":
         case "DoWhileStatement":
         case "FunctionExpression":
         case "FunctionDeclaration":
         case "ArrowFunctionExpression":
          return node;

         case "IfStatement":
          node.consequent = visit(node.consequent);
          if (node.alternate) node.alternate = visit(node.alternate);
          return node;

         case "BlockStatement":
          node.body = node.body.map(visit);
          return node;

         case "SwitchStatement":
          for (let i = 0; i < node.cases.length; i++) node.cases[i].consequent = node.cases[i].consequent.map(visit);
          return node;

         default:
          return node;
        }
      };
      const body = block.body.map(visit);
      if (unsafe) return null;
      block.body = body;
      return block;
    }
    module.exports = {
      FunctionNode: FunctionNode
    };
  });
  var require_function_node$4 = __commonJSMin((exports, module) => {
    const {FunctionNode: FunctionNode} = require_function_node$5();
    var CPUFunctionNode = class extends FunctionNode {
      markupUserName(name) {
        if (this.isRootKernel && this.getAssignedArguments().has(name)) return `cellShadow_user_${name}`;
        return `user_${name}`;
      }
      astFunction(ast, retArr) {
        if (!this.isRootKernel) {
          retArr.push("function");
          retArr.push(" ");
          retArr.push(this.name);
          retArr.push("(");
          for (let i = 0; i < this.argumentNames.length; ++i) {
            const argumentName = this.argumentNames[i];
            if (i > 0) retArr.push(", ");
            retArr.push("user_");
            retArr.push(argumentName);
          }
          retArr.push(") {\n");
        }
        if (this.isRootKernel) {
          for (const name of this.getAssignedArguments()) retArr.push(`let cellShadow_user_${name} = user_${name};\n`);
          retArr.push("kernelBody: {\n");
        }
        for (let i = 0; i < ast.body.body.length; ++i) {
          this.astGeneric(ast.body.body[i], retArr);
          retArr.push("\n");
        }
        if (this.isRootKernel) retArr.push("}\n");
        if (!this.isRootKernel) retArr.push("}\n");
        return retArr;
      }
      astReturnStatement(ast, retArr) {
        const type = this.returnType || this.getType(ast.argument);
        if (!this.returnType) this.returnType = type;
        if (this.isRootKernel) {
          retArr.push(this.leadingReturnStatement);
          this.astGeneric(ast.argument, retArr);
          retArr.push(";\n");
          retArr.push(this.followingReturnStatement);
          retArr.push("break kernelBody;\n");
        } else if (this.isSubKernel) {
          retArr.push(`subKernelResult_${this.name} = `);
          this.astGeneric(ast.argument, retArr);
          retArr.push(";");
          retArr.push(`return subKernelResult_${this.name};`);
        } else {
          retArr.push("return ");
          this.astGeneric(ast.argument, retArr);
          retArr.push(";");
        }
        return retArr;
      }
      astLiteral(ast, retArr) {
        if (isNaN(ast.value)) throw this.astErrorOutput("Non-numeric literal not supported : " + ast.value, ast);
        retArr.push(ast.value);
        return retArr;
      }
      astBinaryExpression(ast, retArr) {
        retArr.push("(");
        this.astGeneric(ast.left, retArr);
        retArr.push(ast.operator);
        this.astGeneric(ast.right, retArr);
        retArr.push(")");
        return retArr;
      }
      astIdentifierExpression(idtNode, retArr) {
        if (idtNode.type !== "Identifier") throw this.astErrorOutput("IdentifierExpression - not an Identifier", idtNode);
        switch (idtNode.name) {
         case "Infinity":
          retArr.push("Infinity");
          break;

         default:
          if (!this.getDeclaration(idtNode) && this.constants && this.constants.hasOwnProperty(idtNode.name)) retArr.push("constants_" + idtNode.name); else if (!this.getDeclaration(idtNode) && this.isRootKernel && this.getAssignedArguments().has(idtNode.name)) retArr.push(this.markupUserName(idtNode.name)); else retArr.push("user_" + idtNode.name);
        }
        return retArr;
      }
      astForStatement(forNode, retArr) {
        if (forNode.type !== "ForStatement") throw this.astErrorOutput("Invalid for statement", forNode);
        const initArr = [];
        const testArr = [];
        const updateArr = [];
        const bodyArr = [];
        let isSafe = null;
        if (forNode.init) {
          this.pushState("in-for-loop-init");
          this.astGeneric(forNode.init, initArr);
          for (let i = 0; i < initArr.length; i++) if (initArr[i].includes && initArr[i].includes(",")) isSafe = false;
          this.popState("in-for-loop-init");
        } else isSafe = false;
        if (forNode.test) this.astGeneric(forNode.test, testArr); else isSafe = false;
        if (forNode.update) {
          if (forNode.update.type === "AssignmentExpression") this.pushState("assignment-as-statement");
          this.astGeneric(forNode.update, updateArr);
        } else isSafe = false;
        if (forNode.body) {
          this.pushState("loop-body");
          this.astGeneric(forNode.body, bodyArr);
          this.popState("loop-body");
        }
        if (isSafe === null) isSafe = this.isSafe(forNode.init) && this.isSafe(forNode.test);
        if (isSafe) {
          retArr.push(`for (${initArr.join("")};${testArr.join("")};${updateArr.join("")}){\n`);
          retArr.push(bodyArr.join(""));
          retArr.push("}\n");
        } else {
          const iVariableName = this.getInternalVariableName("safeI");
          if (initArr.length > 0) retArr.push(initArr.join(""), ";\n");
          retArr.push(`for (let ${iVariableName}=0;${iVariableName}<LOOP_MAX;${iVariableName}++){\n`);
          if (testArr.length > 0) retArr.push(`if (!${testArr.join("")}) break;\n`);
          retArr.push(bodyArr.join(""));
          retArr.push(`\n${updateArr.join("")};`);
          retArr.push("}\n");
        }
        return retArr;
      }
      astWhileStatement(whileNode, retArr) {
        if (whileNode.type !== "WhileStatement") throw this.astErrorOutput("Invalid while statement", whileNode);
        retArr.push("for (let i = 0; i < LOOP_MAX; i++) {");
        retArr.push("if (");
        this.astGeneric(whileNode.test, retArr);
        retArr.push(") {\n");
        this.astGeneric(whileNode.body, retArr);
        retArr.push("} else {\n");
        retArr.push("break;\n");
        retArr.push("}\n");
        retArr.push("}\n");
        return retArr;
      }
      astDoWhileStatement(doWhileNode, retArr) {
        if (doWhileNode.type !== "DoWhileStatement") throw this.astErrorOutput("Invalid while statement", doWhileNode);
        const safeName = `safeI${this.astKey(doWhileNode, "_")}`;
        retArr.push(`let ${safeName} = 0;\n`);
        retArr.push("do {");
        this.astGeneric(doWhileNode.body, retArr);
        retArr.push("} while ((");
        this.astGeneric(doWhileNode.test, retArr);
        retArr.push(`) && ++${safeName} < LOOP_MAX);\n`);
        return retArr;
      }
      astAssignmentExpression(assNode, retArr) {
        const isStatement = this.isState("assignment-as-statement");
        if (isStatement) this.popState("assignment-as-statement"); else retArr.push("(");
        this.astGeneric(assNode.left, retArr);
        retArr.push(assNode.operator);
        this.astGeneric(assNode.right, retArr);
        if (!isStatement) retArr.push(")");
        return retArr;
      }
      astBlockStatement(bNode, retArr) {
        if (this.isState("loop-body")) {
          this.pushState("block-body");
          for (let i = 0; i < bNode.body.length; i++) this.astGeneric(bNode.body[i], retArr);
          this.popState("block-body");
        } else {
          retArr.push("{\n");
          for (let i = 0; i < bNode.body.length; i++) this.astGeneric(bNode.body[i], retArr);
          retArr.push("}\n");
        }
        return retArr;
      }
      astVariableDeclaration(varDecNode, retArr) {
        retArr.push(`${varDecNode.kind} `);
        const {declarations: declarations} = varDecNode;
        for (let i = 0; i < declarations.length; i++) {
          if (i > 0) retArr.push(",");
          const declaration = declarations[i];
          const info = this.getDeclaration(declaration.id);
          if (!info.valueType) info.valueType = this.getType(declaration.init);
          this.astGeneric(declaration, retArr);
        }
        if (!this.isState("in-for-loop-init")) retArr.push(";");
        return retArr;
      }
      astIfStatement(ifNode, retArr) {
        retArr.push("if (");
        this.astGeneric(ifNode.test, retArr);
        retArr.push(")");
        if (ifNode.consequent.type === "BlockStatement") this.astGeneric(ifNode.consequent, retArr); else {
          retArr.push(" {\n");
          this.astGeneric(ifNode.consequent, retArr);
          retArr.push("\n}\n");
        }
        if (ifNode.alternate) {
          retArr.push("else ");
          if (ifNode.alternate.type === "BlockStatement" || ifNode.alternate.type === "IfStatement") this.astGeneric(ifNode.alternate, retArr); else {
            retArr.push(" {\n");
            this.astGeneric(ifNode.alternate, retArr);
            retArr.push("\n}\n");
          }
        }
        return retArr;
      }
      astSwitchStatement(ast, retArr) {
        const {discriminant: discriminant, cases: cases} = ast;
        retArr.push("switch (");
        this.astGeneric(discriminant, retArr);
        retArr.push(") {\n");
        for (let i = 0; i < cases.length; i++) {
          if (cases[i].test === null) {
            retArr.push("default:\n");
            this.astGeneric(cases[i].consequent, retArr);
            if (cases[i].consequent && cases[i].consequent.length > 0) retArr.push("break;\n");
            continue;
          }
          retArr.push("case ");
          this.astGeneric(cases[i].test, retArr);
          retArr.push(":\n");
          if (cases[i].consequent && cases[i].consequent.length > 0) {
            this.astGeneric(cases[i].consequent, retArr);
            retArr.push("break;\n");
          }
        }
        retArr.push("\n}");
      }
      astThisExpression(tNode, retArr) {
        retArr.push("_this");
        return retArr;
      }
      astMemberExpression(mNode, retArr) {
        const {signature: signature, type: type, property: property, xProperty: xProperty, yProperty: yProperty, zProperty: zProperty, name: name, origin: origin} = this.getMemberExpressionDetails(mNode);
        switch (signature) {
         case "this.thread.value":
          retArr.push(`_this.thread.${name}`);
          return retArr;

         case "this.output.value":
          switch (name) {
           case "x":
            retArr.push("outputX");
            break;

           case "y":
            retArr.push("outputY");
            break;

           case "z":
            retArr.push("outputZ");
            break;

           default:
            throw this.astErrorOutput("Unexpected expression", mNode);
          }
          return retArr;

         case "value":
          throw this.astErrorOutput("Unexpected expression", mNode);

         case "value[]":
         case "value[][]":
         case "value[][][]":
         case "value.value":
          if (origin === "Math") {
            retArr.push(Math[name]);
            return retArr;
          }
          switch (property) {
           case "r":
            retArr.push(`user_${name}[0]`);
            return retArr;

           case "g":
            retArr.push(`user_${name}[1]`);
            return retArr;

           case "b":
            retArr.push(`user_${name}[2]`);
            return retArr;

           case "a":
            retArr.push(`user_${name}[3]`);
            return retArr;
          }
          break;

         case "this.constants.value":
         case "this.constants.value[]":
         case "this.constants.value[][]":
         case "this.constants.value[][][]":
          break;

         case "fn()[]":
          this.astGeneric(mNode.object, retArr);
          retArr.push("[");
          this.astGeneric(mNode.property, retArr);
          retArr.push("]");
          return retArr;

         case "fn()[][]":
          this.astGeneric(mNode.object.object, retArr);
          retArr.push("[");
          this.astGeneric(mNode.object.property, retArr);
          retArr.push("]");
          retArr.push("[");
          this.astGeneric(mNode.property, retArr);
          retArr.push("]");
          return retArr;

         default:
          throw this.astErrorOutput("Unexpected expression", mNode);
        }
        if (!mNode.computed) switch (type) {
         case "Number":
         case "Integer":
         case "Float":
         case "Boolean":
          retArr.push(origin === "user" ? this.markupUserName(name) : `${origin}_${name}`);
          return retArr;
        }
        const markupName = origin === "user" ? this.markupUserName(name) : `${origin}_${name}`;
        switch (type) {
         default:
          let size;
          let isInput;
          if (origin === "constants") {
            const constant = this.constants[name];
            isInput = this.constantTypes[name] === "Input";
            size = isInput ? constant.size : null;
          } else {
            isInput = this.isInput(name);
            size = isInput ? this.argumentSizes[this.argumentNames.indexOf(name)] : null;
          }
          retArr.push(`${markupName}`);
          if (zProperty && yProperty) if (isInput) {
            retArr.push("[(");
            this.astGeneric(zProperty, retArr);
            retArr.push(`*${this.dynamicArguments ? "(outputY * outputX)" : size[1] * size[0]})+(`);
            this.astGeneric(yProperty, retArr);
            retArr.push(`*${this.dynamicArguments ? "outputX" : size[0]})+`);
            this.astGeneric(xProperty, retArr);
            retArr.push("]");
          } else {
            retArr.push("[");
            this.astGeneric(zProperty, retArr);
            retArr.push("]");
            retArr.push("[");
            this.astGeneric(yProperty, retArr);
            retArr.push("]");
            retArr.push("[");
            this.astGeneric(xProperty, retArr);
            retArr.push("]");
          } else if (yProperty) if (isInput) {
            retArr.push("[(");
            this.astGeneric(yProperty, retArr);
            retArr.push(`*${this.dynamicArguments ? "outputX" : size[0]})+`);
            this.astGeneric(xProperty, retArr);
            retArr.push("]");
          } else {
            retArr.push("[");
            this.astGeneric(yProperty, retArr);
            retArr.push("]");
            retArr.push("[");
            this.astGeneric(xProperty, retArr);
            retArr.push("]");
          } else if (typeof xProperty !== "undefined") {
            retArr.push("[");
            this.astGeneric(xProperty, retArr);
            retArr.push("]");
          }
        }
        return retArr;
      }
      astCallExpression(ast, retArr) {
        if (ast.type !== "CallExpression") throw this.astErrorOutput("Unknown CallExpression", ast);
        let functionName = this.astMemberExpressionUnroll(ast.callee);
        if (this.calledFunctions.indexOf(functionName) < 0) this.calledFunctions.push(functionName);
        this.isAstMathFunction(ast);
        if (this.onFunctionCall) this.onFunctionCall(this.name, functionName, ast.arguments);
        retArr.push(functionName);
        retArr.push("(");
        const targetTypes = this.lookupFunctionArgumentTypes(functionName) || [];
        for (let i = 0; i < ast.arguments.length; ++i) {
          const argument = ast.arguments[i];
          let argumentType = this.getType(argument);
          if (!targetTypes[i]) this.triggerImplyArgumentType(functionName, i, argumentType, this);
          if (i > 0) retArr.push(", ");
          this.astGeneric(argument, retArr);
        }
        retArr.push(")");
        return retArr;
      }
      astArrayExpression(arrNode, retArr) {
        const returnType = this.getType(arrNode);
        const arrLen = arrNode.elements.length;
        const elements = [];
        for (let i = 0; i < arrLen; ++i) {
          const element = [];
          this.astGeneric(arrNode.elements[i], element);
          elements.push(element.join(""));
        }
        switch (returnType) {
         case "Matrix(2)":
         case "Matrix(3)":
         case "Matrix(4)":
          retArr.push(`[${elements.join(", ")}]`);
          break;

         default:
          retArr.push(`new Float32Array([${elements.join(", ")}])`);
        }
        return retArr;
      }
      astDebuggerStatement(arrNode, retArr) {
        retArr.push("debugger;");
        return retArr;
      }
    };
    module.exports = {
      CPUFunctionNode: CPUFunctionNode
    };
  });
  var require_kernel_string$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    function constantsToString(constants, types) {
      const results = [];
      for (const name in types) {
        if (!types.hasOwnProperty(name)) continue;
        const type = types[name];
        const constant = constants[name];
        switch (type) {
         case "Number":
         case "Integer":
         case "Float":
         case "Boolean":
          results.push(`${name}:${constant}`);
          break;

         case "Array(2)":
         case "Array(3)":
         case "Array(4)":
         case "Matrix(2)":
         case "Matrix(3)":
         case "Matrix(4)":
          results.push(`${name}:new ${constant.constructor.name}(${JSON.stringify(Array.from(constant))})`);
          break;
        }
      }
      return `{ ${results.join()} }`;
    }
    function cpuKernelString(cpuKernel, name) {
      const header = [];
      const thisProperties = [];
      const beforeReturn = [];
      const useFunctionKeyword = !/^function/.test(cpuKernel.color.toString());
      header.push("  const { context, canvas, constants: incomingConstants } = settings;", `  const output = new Int32Array(${JSON.stringify(Array.from(cpuKernel.output))});`, `  const _constantTypes = ${JSON.stringify(cpuKernel.constantTypes)};`, `  const _constants = ${constantsToString(cpuKernel.constants, cpuKernel.constantTypes)};`);
      thisProperties.push("    constants: _constants,", "    context,", "    output,", "    thread: {x: 0, y: 0, z: 0},");
      if (cpuKernel.graphical) {
        header.push(`  const _imageData = context.createImageData(${cpuKernel.output[0]}, ${cpuKernel.output[1]});`);
        header.push(`  const _colorData = new Uint8ClampedArray(${cpuKernel.output[0]} * ${cpuKernel.output[1]} * 4);`);
        const colorFn = utils.flattenFunctionToString((useFunctionKeyword ? "function " : "") + cpuKernel.color.toString(), {
          thisLookup: propertyName => {
            switch (propertyName) {
             case "_colorData":
              return "_colorData";

             case "_imageData":
              return "_imageData";

             case "output":
              return "output";

             case "thread":
              return "this.thread";
            }
            return JSON.stringify(cpuKernel[propertyName]);
          },
          findDependency: (object, name) => null
        });
        const getPixelsFn = utils.flattenFunctionToString((useFunctionKeyword ? "function " : "") + cpuKernel.getPixels.toString(), {
          thisLookup: propertyName => {
            switch (propertyName) {
             case "_colorData":
              return "_colorData";

             case "_imageData":
              return "_imageData";

             case "output":
              return "output";

             case "thread":
              return "this.thread";
            }
            return JSON.stringify(cpuKernel[propertyName]);
          },
          findDependency: () => null
        });
        thisProperties.push("    _imageData,", "    _colorData,", `    color: ${colorFn},`);
        beforeReturn.push(`  kernel.getPixels = ${getPixelsFn};`);
      }
      const constantTypes = [];
      const constantKeys = Object.keys(cpuKernel.constantTypes);
      for (let i = 0; i < constantKeys.length; i++) constantTypes.push(cpuKernel.constantTypes[constantKeys]);
      if (cpuKernel.argumentTypes.indexOf("HTMLImageArray") !== -1 || constantTypes.indexOf("HTMLImageArray") !== -1) {
        const flattenedImageTo3DArray = utils.flattenFunctionToString((useFunctionKeyword ? "function " : "") + cpuKernel._imageTo3DArray.toString(), {
          doNotDefine: [ "canvas" ],
          findDependency: (object, name) => {
            if (object === "this") return (useFunctionKeyword ? "function " : "") + cpuKernel[name].toString();
            return null;
          },
          thisLookup: propertyName => {
            switch (propertyName) {
             case "canvas":
              return;

             case "context":
              return "context";
            }
          }
        });
        beforeReturn.push(flattenedImageTo3DArray);
        thisProperties.push(`    _mediaTo2DArray,`);
        thisProperties.push(`    _imageTo3DArray,`);
      } else if (cpuKernel.argumentTypes.indexOf("HTMLImage") !== -1 || constantTypes.indexOf("HTMLImage") !== -1) {
        const flattenedImageTo2DArray = utils.flattenFunctionToString((useFunctionKeyword ? "function " : "") + cpuKernel._mediaTo2DArray.toString(), {
          findDependency: (object, name) => null,
          thisLookup: propertyName => {
            switch (propertyName) {
             case "canvas":
              return "settings.canvas";

             case "context":
              return "settings.context";
            }
            throw new Error("unhandled thisLookup");
          }
        });
        beforeReturn.push(flattenedImageTo2DArray);
        thisProperties.push(`    _mediaTo2DArray,`);
      }
      return `function(settings) {\n${header.join("\n")}\n  for (const p in _constantTypes) {\n    if (!_constantTypes.hasOwnProperty(p)) continue;\n    const type = _constantTypes[p];\n    switch (type) {\n      case 'Number':\n      case 'Integer':\n      case 'Float':\n      case 'Boolean':\n      case 'Array(2)':\n      case 'Array(3)':\n      case 'Array(4)':\n      case 'Matrix(2)':\n      case 'Matrix(3)':\n      case 'Matrix(4)':\n        if (incomingConstants.hasOwnProperty(p)) {\n          console.warn('constant ' + p + ' of type ' + type + ' cannot be resigned');\n        }\n        continue;\n    }\n    if (!incomingConstants.hasOwnProperty(p)) {\n      throw new Error('constant ' + p + ' not found');\n    }\n    _constants[p] = incomingConstants[p];\n  }\n  const kernel = (function() {\n${cpuKernel._kernelString}\n  })\n    .apply({ ${thisProperties.join("\n")} });\n  ${beforeReturn.join("\n")}\n  return kernel;\n}`;
    }
    module.exports = {
      cpuKernelString: cpuKernelString
    };
  });
  var require_kernel$6 = __commonJSMin((exports, module) => {
    const {Kernel: Kernel} = require_kernel$7();
    const {FunctionBuilder: FunctionBuilder} = require_function_builder();
    const {CPUFunctionNode: CPUFunctionNode} = require_function_node$4();
    const {utils: utils} = require_utils();
    const {cpuKernelString: cpuKernelString} = require_kernel_string$1();
    var CPUKernel = class extends Kernel {
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
      static get mode() {
        return "cpu";
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
        return "cpu" + (argumentTypes.length > 0 ? ":" + argumentTypes.join(",") : "");
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
        if (typeof document !== "undefined") return document.createElement("canvas"); else if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(0, 0);
      }
      initContext() {
        if (!this.canvas) return null;
        return this.canvas.getContext("2d", {
          willReadFrequently: true
        });
      }
      initPlugins(settings) {
        return [];
      }
      validateSettings(args) {
        if (!this.output || this.output.length === 0) {
          if (args.length !== 1) throw new Error("Auto output only supported for kernels with only one input");
          const argType = utils.getVariableType(args[0], this.strictIntegers);
          if (argType === "Array") this.output = utils.getDimensions(argType); else if (argType === "NumberTexture" || argType === "ArrayTexture(4)") this.output = args[0].output; else throw new Error("Auto output not supported for input type: " + argType);
        }
        if (this.graphical) {
          if (this.output.length !== 2) throw new Error("Output must have 2 dimensions on graphical mode");
        }
        this.checkOutput();
      }
      translateSource() {
        this.leadingReturnStatement = this.output.length > 1 ? "resultX[x] = " : "result[x] = ";
        if (this.subKernels) {
          const followingReturnStatement = [];
          for (let i = 0; i < this.subKernels.length; i++) {
            const {name: name} = this.subKernels[i];
            followingReturnStatement.push(this.output.length > 1 ? `resultX_${name}[x] = subKernelResult_${name};\n` : `result_${name}[x] = subKernelResult_${name};\n`);
          }
          this.followingReturnStatement = followingReturnStatement.join("");
        }
        const functionBuilder = FunctionBuilder.fromKernel(this, CPUFunctionNode);
        this.translatedSources = functionBuilder.getPrototypes("kernel");
        if (!this.graphical && !this.returnType) this.returnType = functionBuilder.getKernelResultType();
      }
      build() {
        if (this.built) return;
        if (this.randomSeed !== null) console.warn("randomSeed is not supported in cpu mode; Math.random() will be unseeded");
        this.setupConstants();
        this.setupArguments(arguments);
        this.validateSettings(arguments);
        this.translateSource();
        if (this.graphical) {
          const {canvas: canvas, output: output} = this;
          if (!canvas) throw new Error("no canvas available for using graphical output");
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
          console.log("Function output:");
          console.log(kernelString);
        }
        try {
          this.run = new Function([], kernelString).bind(this)();
        } catch (e) {
          console.error("An error occurred compiling the javascript: ", e);
        }
        this.buildSignature(arguments);
        this.built = true;
      }
      color(r, g, b, a) {
        if (typeof a === "undefined") a = 1;
        r = Math.floor(r * 255);
        g = Math.floor(g * 255);
        b = Math.floor(b * 255);
        a = Math.floor(a * 255);
        const width = this.output[0];
        const height = this.output[1];
        const index = this.thread.x + (height - this.thread.y - 1) * width;
        this._colorData[index * 4 + 0] = r;
        this._colorData[index * 4 + 1] = g;
        this._colorData[index * 4 + 2] = b;
        this._colorData[index * 4 + 3] = a;
      }
      getKernelString() {
        if (this._kernelString !== null) return this._kernelString;
        let kernelThreadString = null;
        let {translatedSources: translatedSources} = this;
        if (translatedSources.length > 1) translatedSources = translatedSources.filter(fn => {
          if (/^function/.test(fn)) return fn;
          kernelThreadString = fn;
          return false;
        }); else kernelThreadString = translatedSources.shift();
        return this._kernelString = `  const LOOP_MAX = ${this._getLoopMaxString()};\n  ${this.injectedNative || ""}\n  const _this = this;\n  ${this._resultKernelHeader()}\n  ${this._processConstants()}\n  return (${this.argumentNames.map(argumentName => "user_" + argumentName).join(", ")}) => {\n    ${this._prependedString.join("")}\n    ${this._earlyThrows()}\n    ${this._processArguments()}\n    ${this.graphical ? this._graphicalKernelBody(kernelThreadString) : this._resultKernelBody(kernelThreadString)}\n    ${translatedSources.length > 0 ? translatedSources.join("\n") : ""}\n  };`;
      }
      toString() {
        return cpuKernelString(this);
      }
      _getLoopMaxString() {
        return this.loopMaxIterations ? ` ${parseInt(this.loopMaxIterations)};` : " 1000;";
      }
      _processConstants() {
        if (!this.constants) return "";
        const result = [];
        for (let p in this.constants) switch (this.constantTypes[p]) {
         case "HTMLCanvas":
         case "OffscreenCanvas":
         case "HTMLImage":
         case "ImageBitmap":
         case "ImageData":
         case "HTMLVideo":
          result.push(`    const constants_${p} = this._mediaTo2DArray(this.constants.${p});\n`);
          break;

         case "HTMLImageArray":
          result.push(`    const constants_${p} = this._imageTo3DArray(this.constants.${p});\n`);
          break;

         case "Input":
          result.push(`    const constants_${p} = this.constants.${p}.value;\n`);
          break;

         default:
          result.push(`    const constants_${p} = this.constants.${p};\n`);
        }
        return result.join("");
      }
      _earlyThrows() {
        if (this.graphical) return "";
        if (this.immutable) return "";
        if (!this.pipeline) return "";
        const arrayArguments = [];
        for (let i = 0; i < this.argumentTypes.length; i++) if (this.argumentTypes[i] === "Array") arrayArguments.push(this.argumentNames[i]);
        if (arrayArguments.length === 0) return "";
        const checks = [];
        for (let i = 0; i < arrayArguments.length; i++) {
          const argumentName = arrayArguments[i];
          const checkSubKernels = this._mapSubKernels(subKernel => `user_${argumentName} === result_${subKernel.name}`).join(" || ");
          checks.push(`user_${argumentName} === result${checkSubKernels ? ` || ${checkSubKernels}` : ""}`);
        }
        return `if (${checks.join(" || ")}) throw new Error('Source and destination arrays are the same.  Use immutable = true');`;
      }
      _processArguments() {
        const result = [];
        for (let i = 0; i < this.argumentTypes.length; i++) {
          const variableName = `user_${this.argumentNames[i]}`;
          switch (this.argumentTypes[i]) {
           case "HTMLCanvas":
           case "OffscreenCanvas":
           case "HTMLImage":
           case "ImageBitmap":
           case "ImageData":
           case "HTMLVideo":
            result.push(`    ${variableName} = this._mediaTo2DArray(${variableName});\n`);
            break;

           case "HTMLImageArray":
            result.push(`    ${variableName} = this._imageTo3DArray(${variableName});\n`);
            break;

           case "Input":
            result.push(`    ${variableName} = ${variableName}.value;\n`);
            break;

           case "ArrayTexture(1)":
           case "ArrayTexture(2)":
           case "ArrayTexture(3)":
           case "ArrayTexture(4)":
           case "NumberTexture":
           case "MemoryOptimizedNumberTexture":
            result.push(`\n    if (${variableName}.toArray) {\n      if (!_this.textureCache) {\n        _this.textureCache = [];\n        _this.arrayCache = [];\n      }\n      const textureIndex = _this.textureCache.indexOf(${variableName});\n      if (textureIndex !== -1) {\n        ${variableName} = _this.arrayCache[textureIndex];\n      } else {\n        _this.textureCache.push(${variableName});\n        ${variableName} = ${variableName}.toArray();\n        _this.arrayCache.push(${variableName});\n      }\n    }`);
            break;
          }
        }
        return result.join("");
      }
      _mediaTo2DArray(media) {
        const canvas = this.canvas;
        const width = media.width > 0 ? media.width : media.videoWidth;
        const height = media.height > 0 ? media.height : media.videoHeight;
        if (canvas.width < width) canvas.width = width;
        if (canvas.height < height) canvas.height = height;
        const ctx = this.context;
        let pixelsData;
        if (media.constructor === ImageData) pixelsData = media.data; else {
          ctx.drawImage(media, 0, 0, width, height);
          pixelsData = ctx.getImageData(0, 0, width, height).data;
        }
        const imageArray = new Array(height);
        let index = 0;
        for (let y = height - 1; y >= 0; y--) {
          const row = imageArray[y] = new Array(width);
          for (let x = 0; x < width; x++) {
            const pixel = new Float32Array(4);
            pixel[0] = pixelsData[index++] / 255;
            pixel[1] = pixelsData[index++] / 255;
            pixel[2] = pixelsData[index++] / 255;
            pixel[3] = pixelsData[index++] / 255;
            row[x] = pixel;
          }
        }
        return imageArray;
      }
      getPixels(flip) {
        const [width, height] = this.output;
        const result = flip ? utils.flipPixels(this._imageData.data, width, height) : this._imageData.data.slice(0);
        return this.asyncMode ? Promise.resolve(result) : result;
      }
      _imageTo3DArray(images) {
        const imagesArray = new Array(images.length);
        for (let i = 0; i < images.length; i++) imagesArray[i] = this._mediaTo2DArray(images[i]);
        return imagesArray;
      }
      _resultKernelHeader() {
        if (this.graphical) return "";
        if (this.immutable) return "";
        if (!this.pipeline) return "";
        switch (this.output.length) {
         case 1:
          return this._mutableKernel1DResults();

         case 2:
          return this._mutableKernel2DResults();

         case 3:
          return this._mutableKernel3DResults();
        }
      }
      _resultKernelBody(kernelString) {
        switch (this.output.length) {
         case 1:
          return (!this.immutable && this.pipeline ? this._resultMutableKernel1DLoop(kernelString) : this._resultImmutableKernel1DLoop(kernelString)) + this._kernelOutput();

         case 2:
          return (!this.immutable && this.pipeline ? this._resultMutableKernel2DLoop(kernelString) : this._resultImmutableKernel2DLoop(kernelString)) + this._kernelOutput();

         case 3:
          return (!this.immutable && this.pipeline ? this._resultMutableKernel3DLoop(kernelString) : this._resultImmutableKernel3DLoop(kernelString)) + this._kernelOutput();

         default:
          throw new Error("unsupported size kernel");
        }
      }
      _graphicalKernelBody(kernelThreadString) {
        switch (this.output.length) {
         case 2:
          return this._graphicalKernel2DLoop(kernelThreadString) + this._graphicalOutput();

         default:
          throw new Error("unsupported size kernel");
        }
      }
      _graphicalOutput() {
        return `\n    this._imageData.data.set(this._colorData);\n    this.context.putImageData(this._imageData, 0, 0);\n    return;`;
      }
      _getKernelResultTypeConstructorString() {
        switch (this.returnType) {
         case "LiteralInteger":
         case "Number":
         case "Integer":
         case "Float":
          return "Float32Array";

         case "Array(2)":
         case "Array(3)":
         case "Array(4)":
          return "Array";

         default:
          if (this.graphical) return "Float32Array";
          throw new Error(`unhandled returnType ${this.returnType}`);
        }
      }
      _resultImmutableKernel1DLoop(kernelString) {
        const constructorString = this._getKernelResultTypeConstructorString();
        return `  const outputX = _this.output[0];\n    const result = new ${constructorString}(outputX);\n    ${this._mapSubKernels(subKernel => `const result_${subKernel.name} = new ${constructorString}(outputX);\n`).join("    ")}\n    ${this._mapSubKernels(subKernel => `let subKernelResult_${subKernel.name};\n`).join("    ")}\n    for (let x = 0; x < outputX; x++) {\n      this.thread.x = x;\n      this.thread.y = 0;\n      this.thread.z = 0;\n      ${kernelString}\n    }`;
      }
      _mutableKernel1DResults() {
        const constructorString = this._getKernelResultTypeConstructorString();
        return `  const outputX = _this.output[0];\n    const result = new ${constructorString}(outputX);\n    ${this._mapSubKernels(subKernel => `const result_${subKernel.name} = new ${constructorString}(outputX);\n`).join("    ")}\n    ${this._mapSubKernels(subKernel => `let subKernelResult_${subKernel.name};\n`).join("    ")}`;
      }
      _resultMutableKernel1DLoop(kernelString) {
        return `  const outputX = _this.output[0];\n    for (let x = 0; x < outputX; x++) {\n      this.thread.x = x;\n      this.thread.y = 0;\n      this.thread.z = 0;\n      ${kernelString}\n    }`;
      }
      _resultImmutableKernel2DLoop(kernelString) {
        const constructorString = this._getKernelResultTypeConstructorString();
        return `  const outputX = _this.output[0];\n    const outputY = _this.output[1];\n    const result = new Array(outputY);\n    ${this._mapSubKernels(subKernel => `const result_${subKernel.name} = new Array(outputY);\n`).join("    ")}\n    ${this._mapSubKernels(subKernel => `let subKernelResult_${subKernel.name};\n`).join("    ")}\n    for (let y = 0; y < outputY; y++) {\n      this.thread.z = 0;\n      this.thread.y = y;\n      const resultX = result[y] = new ${constructorString}(outputX);\n      ${this._mapSubKernels(subKernel => `const resultX_${subKernel.name} = result_${subKernel.name}[y] = new ${constructorString}(outputX);\n`).join("")}\n      for (let x = 0; x < outputX; x++) {\n        this.thread.x = x;\n        ${kernelString}\n      }\n    }`;
      }
      _mutableKernel2DResults() {
        const constructorString = this._getKernelResultTypeConstructorString();
        return `  const outputX = _this.output[0];\n    const outputY = _this.output[1];\n    const result = new Array(outputY);\n    ${this._mapSubKernels(subKernel => `const result_${subKernel.name} = new Array(outputY);\n`).join("    ")}\n    ${this._mapSubKernels(subKernel => `let subKernelResult_${subKernel.name};\n`).join("    ")}\n    for (let y = 0; y < outputY; y++) {\n      const resultX = result[y] = new ${constructorString}(outputX);\n      ${this._mapSubKernels(subKernel => `const resultX_${subKernel.name} = result_${subKernel.name}[y] = new ${constructorString}(outputX);\n`).join("")}\n    }`;
      }
      _resultMutableKernel2DLoop(kernelString) {
        const constructorString = this._getKernelResultTypeConstructorString();
        return `  const outputX = _this.output[0];\n    const outputY = _this.output[1];\n    for (let y = 0; y < outputY; y++) {\n      this.thread.z = 0;\n      this.thread.y = y;\n      const resultX = result[y];\n      ${this._mapSubKernels(subKernel => `const resultX_${subKernel.name} = result_${subKernel.name}[y] = new ${constructorString}(outputX);\n`).join("")}\n      for (let x = 0; x < outputX; x++) {\n        this.thread.x = x;\n        ${kernelString}\n      }\n    }`;
      }
      _graphicalKernel2DLoop(kernelString) {
        return `  const outputX = _this.output[0];\n    const outputY = _this.output[1];\n    for (let y = 0; y < outputY; y++) {\n      this.thread.z = 0;\n      this.thread.y = y;\n      for (let x = 0; x < outputX; x++) {\n        this.thread.x = x;\n        ${kernelString}\n      }\n    }`;
      }
      _resultImmutableKernel3DLoop(kernelString) {
        const constructorString = this._getKernelResultTypeConstructorString();
        return `  const outputX = _this.output[0];\n    const outputY = _this.output[1];\n    const outputZ = _this.output[2];\n    const result = new Array(outputZ);\n    ${this._mapSubKernels(subKernel => `const result_${subKernel.name} = new Array(outputZ);\n`).join("    ")}\n    ${this._mapSubKernels(subKernel => `let subKernelResult_${subKernel.name};\n`).join("    ")}\n    for (let z = 0; z < outputZ; z++) {\n      this.thread.z = z;\n      const resultY = result[z] = new Array(outputY);\n      ${this._mapSubKernels(subKernel => `const resultY_${subKernel.name} = result_${subKernel.name}[z] = new Array(outputY);\n`).join("      ")}\n      for (let y = 0; y < outputY; y++) {\n        this.thread.y = y;\n        const resultX = resultY[y] = new ${constructorString}(outputX);\n        ${this._mapSubKernels(subKernel => `const resultX_${subKernel.name} = resultY_${subKernel.name}[y] = new ${constructorString}(outputX);\n`).join("        ")}\n        for (let x = 0; x < outputX; x++) {\n          this.thread.x = x;\n          ${kernelString}\n        }\n      }\n    }`;
      }
      _mutableKernel3DResults() {
        const constructorString = this._getKernelResultTypeConstructorString();
        return `  const outputX = _this.output[0];\n    const outputY = _this.output[1];\n    const outputZ = _this.output[2];\n    const result = new Array(outputZ);\n    ${this._mapSubKernels(subKernel => `const result_${subKernel.name} = new Array(outputZ);\n`).join("    ")}\n    ${this._mapSubKernels(subKernel => `let subKernelResult_${subKernel.name};\n`).join("    ")}\n    for (let z = 0; z < outputZ; z++) {\n      const resultY = result[z] = new Array(outputY);\n      ${this._mapSubKernels(subKernel => `const resultY_${subKernel.name} = result_${subKernel.name}[z] = new Array(outputY);\n`).join("      ")}\n      for (let y = 0; y < outputY; y++) {\n        const resultX = resultY[y] = new ${constructorString}(outputX);\n        ${this._mapSubKernels(subKernel => `const resultX_${subKernel.name} = resultY_${subKernel.name}[y] = new ${constructorString}(outputX);\n`).join("        ")}\n      }\n    }`;
      }
      _resultMutableKernel3DLoop(kernelString) {
        return `  const outputX = _this.output[0];\n    const outputY = _this.output[1];\n    const outputZ = _this.output[2];\n    for (let z = 0; z < outputZ; z++) {\n      this.thread.z = z;\n      const resultY = result[z];\n      for (let y = 0; y < outputY; y++) {\n        this.thread.y = y;\n        const resultX = resultY[y];\n        for (let x = 0; x < outputX; x++) {\n          this.thread.x = x;\n          ${kernelString}\n        }\n      }\n    }`;
      }
      _kernelOutput() {
        if (!this.subKernels) return "\n    return result;";
        return `\n    return {\n      result: result,\n      ${this.subKernels.map(subKernel => `${subKernel.property}: result_${subKernel.name}`).join(",\n      ")}\n    };`;
      }
      _mapSubKernels(fn) {
        return this.subKernels === null ? [ "" ] : this.subKernels.map(fn);
      }
      destroy(removeCanvasReference) {
        if (removeCanvasReference) delete this.canvas;
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
        if (this._kernelString) throw new Error("Kernel already built");
        this._prependedString.push(value);
      }
      hasPrependString(value) {
        return this._prependedString.indexOf(value) > -1;
      }
    };
    module.exports = {
      CPUKernel: CPUKernel
    };
  });
  var require_texture = __commonJSMin((exports, module) => {
    const {Texture: Texture} = require_texture$1();
    var GLTexture = class extends Texture {
      get textureType() {
        throw new Error(`"textureType" not implemented on ${this.name}`);
      }
      clone() {
        return new this.constructor(this);
      }
      beforeMutate() {
        if (this.texture._refs > 1) {
          this.newTexture();
          return true;
        }
        return false;
      }
      cloneTexture() {
        this.texture._refs--;
        const {context: gl, size: size, texture: texture, kernel: kernel} = this;
        if (kernel.debug) console.warn("cloning internal texture");
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer());
        selectTexture(gl, texture);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        const target = gl.createTexture();
        selectTexture(gl, target);
        gl.texImage2D(gl.TEXTURE_2D, 0, this.internalFormat, size[0], size[1], 0, this.textureFormat, this.textureType, null);
        gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, size[0], size[1]);
        target._refs = 1;
        this.texture = target;
      }
      newTexture() {
        this.texture._refs--;
        const gl = this.context;
        const size = this.size;
        if (this.kernel.debug) console.warn("new internal texture");
        const target = gl.createTexture();
        selectTexture(gl, target);
        gl.texImage2D(gl.TEXTURE_2D, 0, this.internalFormat, size[0], size[1], 0, this.textureFormat, this.textureType, null);
        target._refs = 1;
        this.texture = target;
      }
      clear() {
        if (this.texture._refs) {
          this.texture._refs--;
          const gl = this.context;
          const target = this.texture = gl.createTexture();
          selectTexture(gl, target);
          const size = this.size;
          target._refs = 1;
          gl.texImage2D(gl.TEXTURE_2D, 0, this.internalFormat, size[0], size[1], 0, this.textureFormat, this.textureType, null);
        }
        const {context: gl, texture: texture} = this;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer());
        gl.bindTexture(gl.TEXTURE_2D, texture);
        selectTexture(gl, texture);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      }
      delete() {
        if (this._deleted) return;
        this._deleted = true;
        if (this.texture._refs) {
          this.texture._refs--;
          if (this.texture._refs) return;
        }
        if (this.kernel && this.kernel.deleteTexture) this.kernel.deleteTexture(this.texture); else this.context.deleteTexture(this.texture);
      }
      framebuffer() {
        if (!this._framebuffer) this._framebuffer = this.kernel.getRawValueFramebuffer(this.size[0], this.size[1]);
        return this._framebuffer;
      }
    };
    function selectTexture(gl, texture) {
      gl.activeTexture(gl.TEXTURE15);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    }
    module.exports = {
      GLTexture: GLTexture
    };
  });
  var require_float$2 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {GLTexture: GLTexture} = require_texture();
    var GLTextureFloat = class extends GLTexture {
      get textureType() {
        return this.context.FLOAT;
      }
      constructor(settings) {
        super(settings);
        this.type = "ArrayTexture(1)";
      }
      renderRawOutput() {
        const gl = this.context;
        const size = this.size;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer());
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
        const result = new Float32Array(size[0] * size[1] * 4);
        gl.readPixels(0, 0, size[0], size[1], gl.RGBA, gl.FLOAT, result);
        return result;
      }
      renderValues() {
        if (this._deleted) return null;
        return this.renderRawOutput();
      }
      toArray() {
        return utils.erectFloat(this.renderValues(), this.output[0]);
      }
    };
    module.exports = {
      GLTextureFloat: GLTextureFloat
    };
  });
  var require_array_2_float = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {GLTextureFloat: GLTextureFloat} = require_float$2();
    var GLTextureArray2Float = class extends GLTextureFloat {
      constructor(settings) {
        super(settings);
        this.type = "ArrayTexture(2)";
      }
      toArray() {
        return utils.erectArray2(this.renderValues(), this.output[0], this.output[1]);
      }
    };
    module.exports = {
      GLTextureArray2Float: GLTextureArray2Float
    };
  });
  var require_array_2_float_2d = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {GLTextureFloat: GLTextureFloat} = require_float$2();
    var GLTextureArray2Float2D = class extends GLTextureFloat {
      constructor(settings) {
        super(settings);
        this.type = "ArrayTexture(2)";
      }
      toArray() {
        return utils.erect2DArray2(this.renderValues(), this.output[0], this.output[1]);
      }
    };
    module.exports = {
      GLTextureArray2Float2D: GLTextureArray2Float2D
    };
  });
  var require_array_2_float_3d = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {GLTextureFloat: GLTextureFloat} = require_float$2();
    var GLTextureArray2Float3D = class extends GLTextureFloat {
      constructor(settings) {
        super(settings);
        this.type = "ArrayTexture(2)";
      }
      toArray() {
        return utils.erect3DArray2(this.renderValues(), this.output[0], this.output[1], this.output[2]);
      }
    };
    module.exports = {
      GLTextureArray2Float3D: GLTextureArray2Float3D
    };
  });
  var require_array_3_float = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {GLTextureFloat: GLTextureFloat} = require_float$2();
    var GLTextureArray3Float = class extends GLTextureFloat {
      constructor(settings) {
        super(settings);
        this.type = "ArrayTexture(3)";
      }
      toArray() {
        return utils.erectArray3(this.renderValues(), this.output[0]);
      }
    };
    module.exports = {
      GLTextureArray3Float: GLTextureArray3Float
    };
  });
  var require_array_3_float_2d = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {GLTextureFloat: GLTextureFloat} = require_float$2();
    var GLTextureArray3Float2D = class extends GLTextureFloat {
      constructor(settings) {
        super(settings);
        this.type = "ArrayTexture(3)";
      }
      toArray() {
        return utils.erect2DArray3(this.renderValues(), this.output[0], this.output[1]);
      }
    };
    module.exports = {
      GLTextureArray3Float2D: GLTextureArray3Float2D
    };
  });
  var require_array_3_float_3d = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {GLTextureFloat: GLTextureFloat} = require_float$2();
    var GLTextureArray3Float3D = class extends GLTextureFloat {
      constructor(settings) {
        super(settings);
        this.type = "ArrayTexture(3)";
      }
      toArray() {
        return utils.erect3DArray3(this.renderValues(), this.output[0], this.output[1], this.output[2]);
      }
    };
    module.exports = {
      GLTextureArray3Float3D: GLTextureArray3Float3D
    };
  });
  var require_array_4_float = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {GLTextureFloat: GLTextureFloat} = require_float$2();
    var GLTextureArray4Float = class extends GLTextureFloat {
      constructor(settings) {
        super(settings);
        this.type = "ArrayTexture(4)";
      }
      toArray() {
        return utils.erectArray4(this.renderValues(), this.output[0]);
      }
    };
    module.exports = {
      GLTextureArray4Float: GLTextureArray4Float
    };
  });
  var require_array_4_float_2d = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {GLTextureFloat: GLTextureFloat} = require_float$2();
    var GLTextureArray4Float2D = class extends GLTextureFloat {
      constructor(settings) {
        super(settings);
        this.type = "ArrayTexture(4)";
      }
      toArray() {
        return utils.erect2DArray4(this.renderValues(), this.output[0], this.output[1]);
      }
    };
    module.exports = {
      GLTextureArray4Float2D: GLTextureArray4Float2D
    };
  });
  var require_array_4_float_3d = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {GLTextureFloat: GLTextureFloat} = require_float$2();
    var GLTextureArray4Float3D = class extends GLTextureFloat {
      constructor(settings) {
        super(settings);
        this.type = "ArrayTexture(4)";
      }
      toArray() {
        return utils.erect3DArray4(this.renderValues(), this.output[0], this.output[1], this.output[2]);
      }
    };
    module.exports = {
      GLTextureArray4Float3D: GLTextureArray4Float3D
    };
  });
  var require_float_2d = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {GLTextureFloat: GLTextureFloat} = require_float$2();
    var GLTextureFloat2D = class extends GLTextureFloat {
      constructor(settings) {
        super(settings);
        this.type = "ArrayTexture(1)";
      }
      toArray() {
        return utils.erect2DFloat(this.renderValues(), this.output[0], this.output[1]);
      }
    };
    module.exports = {
      GLTextureFloat2D: GLTextureFloat2D
    };
  });
  var require_float_3d = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {GLTextureFloat: GLTextureFloat} = require_float$2();
    var GLTextureFloat3D = class extends GLTextureFloat {
      constructor(settings) {
        super(settings);
        this.type = "ArrayTexture(1)";
      }
      toArray() {
        return utils.erect3DFloat(this.renderValues(), this.output[0], this.output[1], this.output[2]);
      }
    };
    module.exports = {
      GLTextureFloat3D: GLTextureFloat3D
    };
  });
  var require_memory_optimized = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {GLTextureFloat: GLTextureFloat} = require_float$2();
    var GLTextureMemoryOptimized = class extends GLTextureFloat {
      constructor(settings) {
        super(settings);
        this.type = "MemoryOptimizedNumberTexture";
      }
      toArray() {
        return utils.erectMemoryOptimizedFloat(this.renderValues(), this.output[0]);
      }
    };
    module.exports = {
      GLTextureMemoryOptimized: GLTextureMemoryOptimized
    };
  });
  var require_memory_optimized_2d = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {GLTextureFloat: GLTextureFloat} = require_float$2();
    var GLTextureMemoryOptimized2D = class extends GLTextureFloat {
      constructor(settings) {
        super(settings);
        this.type = "MemoryOptimizedNumberTexture";
      }
      toArray() {
        return utils.erectMemoryOptimized2DFloat(this.renderValues(), this.output[0], this.output[1]);
      }
    };
    module.exports = {
      GLTextureMemoryOptimized2D: GLTextureMemoryOptimized2D
    };
  });
  var require_memory_optimized_3d = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {GLTextureFloat: GLTextureFloat} = require_float$2();
    var GLTextureMemoryOptimized3D = class extends GLTextureFloat {
      constructor(settings) {
        super(settings);
        this.type = "MemoryOptimizedNumberTexture";
      }
      toArray() {
        return utils.erectMemoryOptimized3DFloat(this.renderValues(), this.output[0], this.output[1], this.output[2]);
      }
    };
    module.exports = {
      GLTextureMemoryOptimized3D: GLTextureMemoryOptimized3D
    };
  });
  var require_unsigned = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {GLTexture: GLTexture} = require_texture();
    var GLTextureUnsigned = class extends GLTexture {
      get textureType() {
        return this.context.UNSIGNED_BYTE;
      }
      constructor(settings) {
        super(settings);
        this.type = "NumberTexture";
      }
      renderRawOutput() {
        const {context: gl} = this;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer());
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
        const result = new Uint8Array(this.size[0] * this.size[1] * 4);
        gl.readPixels(0, 0, this.size[0], this.size[1], gl.RGBA, gl.UNSIGNED_BYTE, result);
        return result;
      }
      renderValues() {
        if (this._deleted) return null;
        return new Float32Array(this.renderRawOutput().buffer);
      }
      toArray() {
        return utils.erectPackedFloat(this.renderValues(), this.output[0]);
      }
    };
    module.exports = {
      GLTextureUnsigned: GLTextureUnsigned
    };
  });
  var require_unsigned_2d = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {GLTextureUnsigned: GLTextureUnsigned} = require_unsigned();
    var GLTextureUnsigned2D = class extends GLTextureUnsigned {
      constructor(settings) {
        super(settings);
        this.type = "NumberTexture";
      }
      toArray() {
        return utils.erect2DPackedFloat(this.renderValues(), this.output[0], this.output[1]);
      }
    };
    module.exports = {
      GLTextureUnsigned2D: GLTextureUnsigned2D
    };
  });
  var require_unsigned_3d = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {GLTextureUnsigned: GLTextureUnsigned} = require_unsigned();
    var GLTextureUnsigned3D = class extends GLTextureUnsigned {
      constructor(settings) {
        super(settings);
        this.type = "NumberTexture";
      }
      toArray() {
        return utils.erect3DPackedFloat(this.renderValues(), this.output[0], this.output[1], this.output[2]);
      }
    };
    module.exports = {
      GLTextureUnsigned3D: GLTextureUnsigned3D
    };
  });
  var require_graphical = __commonJSMin((exports, module) => {
    const {GLTextureUnsigned: GLTextureUnsigned} = require_unsigned();
    var GLTextureGraphical = class extends GLTextureUnsigned {
      constructor(settings) {
        super(settings);
        this.type = "ArrayTexture(4)";
      }
      toArray() {
        return this.renderValues();
      }
    };
    module.exports = {
      GLTextureGraphical: GLTextureGraphical
    };
  });
  var require_kernel$5 = __commonJSMin((exports, module) => {
    const {Kernel: Kernel} = require_kernel$7();
    const {utils: utils} = require_utils();
    const {GLTextureArray2Float: GLTextureArray2Float} = require_array_2_float();
    const {GLTextureArray2Float2D: GLTextureArray2Float2D} = require_array_2_float_2d();
    const {GLTextureArray2Float3D: GLTextureArray2Float3D} = require_array_2_float_3d();
    const {GLTextureArray3Float: GLTextureArray3Float} = require_array_3_float();
    const {GLTextureArray3Float2D: GLTextureArray3Float2D} = require_array_3_float_2d();
    const {GLTextureArray3Float3D: GLTextureArray3Float3D} = require_array_3_float_3d();
    const {GLTextureArray4Float: GLTextureArray4Float} = require_array_4_float();
    const {GLTextureArray4Float2D: GLTextureArray4Float2D} = require_array_4_float_2d();
    const {GLTextureArray4Float3D: GLTextureArray4Float3D} = require_array_4_float_3d();
    const {GLTextureFloat: GLTextureFloat} = require_float$2();
    const {GLTextureFloat2D: GLTextureFloat2D} = require_float_2d();
    const {GLTextureFloat3D: GLTextureFloat3D} = require_float_3d();
    const {GLTextureMemoryOptimized: GLTextureMemoryOptimized} = require_memory_optimized();
    const {GLTextureMemoryOptimized2D: GLTextureMemoryOptimized2D} = require_memory_optimized_2d();
    const {GLTextureMemoryOptimized3D: GLTextureMemoryOptimized3D} = require_memory_optimized_3d();
    const {GLTextureUnsigned: GLTextureUnsigned} = require_unsigned();
    const {GLTextureUnsigned2D: GLTextureUnsigned2D} = require_unsigned_2d();
    const {GLTextureUnsigned3D: GLTextureUnsigned3D} = require_unsigned_3d();
    const {GLTextureGraphical: GLTextureGraphical} = require_graphical();
    var GLKernel = class extends Kernel {
      static get mode() {
        return "gpu";
      }
      static getIsFloatRead() {
        const kernel = new this(`function kernelFunction() {\n      return 1;\n    }`, {
          context: this.testContext,
          canvas: this.testCanvas,
          validate: false,
          output: [ 1 ],
          precision: "single",
          returnType: "Number",
          tactic: "speed"
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
          output: [ 2 ],
          returnType: "Number",
          precision: "unsigned",
          tactic: "speed"
        });
        const args = [ [ 6, 6030401 ], [ 3, 3991 ] ];
        kernel.build.apply(kernel, args);
        kernel.run.apply(kernel, args);
        const result = kernel.renderOutput();
        kernel.destroy(true);
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
          output: [ 4 ],
          returnType: "Number",
          precision: "unsigned",
          tactic: "speed"
        });
        const args = [ [ 0, 1, 2, 3 ] ];
        kernel.build.apply(kernel, args);
        kernel.run.apply(kernel, args);
        const result = kernel.renderOutput();
        kernel.destroy(true);
        return Math.round(result[0]) === 0 && Math.round(result[1]) === 1 && Math.round(result[2]) === 2 && Math.round(result[3]) === 3;
      }
      static get testCanvas() {
        throw new Error(`"testCanvas" not defined on ${this.name}`);
      }
      static get testContext() {
        throw new Error(`"testContext" not defined on ${this.name}`);
      }
      static getFeatures() {
        const gl = this.testContext;
        const isDrawBuffers = this.getIsDrawBuffers();
        return Object.freeze({
          isFloatRead: this.getIsFloatRead(),
          isIntegerDivisionAccurate: this.getIsIntegerDivisionAccurate(),
          isSpeedTacticSupported: this.getIsSpeedTacticSupported(),
          isTextureFloat: this.getIsTextureFloat(),
          isDrawBuffers: isDrawBuffers,
          kernelMap: isDrawBuffers,
          channelCount: this.getChannelCount(),
          maxTextureSize: this.getMaxTextureSize(),
          lowIntPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.LOW_INT),
          lowFloatPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.LOW_FLOAT),
          mediumIntPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_INT),
          mediumFloatPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT),
          highIntPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_INT),
          highFloatPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)
        });
      }
      static setupFeatureChecks() {
        throw new Error(`"setupFeatureChecks" not defined on ${this.name}`);
      }
      static getSignature(kernel, argumentTypes) {
        return kernel.getVariablePrecisionString() + (argumentTypes.length > 0 ? ":" + argumentTypes.join(",") : "");
      }
      setFixIntegerDivisionAccuracy(fix) {
        this.fixIntegerDivisionAccuracy = fix;
        return this;
      }
      setPrecision(flag) {
        this.precision = flag;
        return this;
      }
      setFloatTextures(flag) {
        utils.warnDeprecated("method", "setFloatTextures", "setOptimizeFloatMemory");
        this.floatTextures = flag;
        return this;
      }
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
          if (state === "FUNCTION_ARGUMENTS" && char === "/" && nextChar === "*") {
            states.push("MULTI_LINE_COMMENT");
            i += 2;
            continue;
          } else if (state === "MULTI_LINE_COMMENT" && char === "*" && nextChar === "/") {
            states.pop();
            i += 2;
            continue;
          } else if (state === "FUNCTION_ARGUMENTS" && char === "/" && nextChar === "/") {
            states.push("COMMENT");
            i += 2;
            continue;
          } else if (state === "COMMENT" && char === "\n") {
            states.pop();
            i++;
            continue;
          } else if (state === null && char === "(") {
            states.push("FUNCTION_ARGUMENTS");
            i++;
            continue;
          } else if (state === "FUNCTION_ARGUMENTS") {
            if (char === ")") {
              states.pop();
              break;
            }
            if (char === "f" && nextChar === "l" && source[i + 2] === "o" && source[i + 3] === "a" && source[i + 4] === "t" && source[i + 5] === " ") {
              states.push("DECLARE_VARIABLE");
              argumentType = "float";
              argumentName = "";
              i += 6;
              continue;
            } else if (char === "i" && nextChar === "n" && source[i + 2] === "t" && source[i + 3] === " ") {
              states.push("DECLARE_VARIABLE");
              argumentType = "int";
              argumentName = "";
              i += 4;
              continue;
            } else if (char === "v" && nextChar === "e" && source[i + 2] === "c" && source[i + 3] === "2" && source[i + 4] === " ") {
              states.push("DECLARE_VARIABLE");
              argumentType = "vec2";
              argumentName = "";
              i += 5;
              continue;
            } else if (char === "v" && nextChar === "e" && source[i + 2] === "c" && source[i + 3] === "3" && source[i + 4] === " ") {
              states.push("DECLARE_VARIABLE");
              argumentType = "vec3";
              argumentName = "";
              i += 5;
              continue;
            } else if (char === "v" && nextChar === "e" && source[i + 2] === "c" && source[i + 3] === "4" && source[i + 4] === " ") {
              states.push("DECLARE_VARIABLE");
              argumentType = "vec4";
              argumentName = "";
              i += 5;
              continue;
            }
          } else if (state === "DECLARE_VARIABLE") {
            if (argumentName === "") {
              if (char === " ") {
                i++;
                continue;
              }
              if (!isStartingVariableName.test(char)) throw new Error("variable name is not expected string");
            }
            argumentName += char;
            if (!isVariableChar.test(nextChar)) {
              states.pop();
              argumentNames.push(argumentName);
              argumentTypes.push(typeMap[argumentType]);
            }
          }
          i++;
        }
        if (states.length > 0) throw new Error("GLSL function was not parsable");
        return {
          argumentNames: argumentNames,
          argumentTypes: argumentTypes
        };
      }
      static nativeFunctionReturnType(source) {
        return typeMap[source.match(/int|float|vec[2-4]/)[0]];
      }
      static combineKernels(combinedKernel, lastKernel) {
        combinedKernel.apply(null, arguments);
        const {texSize: texSize, context: context, threadDim: threadDim} = lastKernel.texSize;
        let result;
        if (lastKernel.precision === "single") {
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
        if (lastKernel.output.length === 1) return result; else if (lastKernel.output.length === 2) return utils.splitArray(result, lastKernel.output[0]); else if (lastKernel.output.length === 3) return utils.splitArray(result, lastKernel.output[0] * lastKernel.output[1]).map(function(x) {
          return utils.splitArray(x, lastKernel.output[0]);
        });
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
        this.compiledFragmentShader = null;
        this.compiledVertexShader = null;
        this.switchingKernels = null;
        this._textureSwitched = null;
        this._mappedTextureSwitched = null;
      }
      checkTextureSize() {
        const {features: features} = this.constructor;
        if (this.texSize[0] > features.maxTextureSize || this.texSize[1] > features.maxTextureSize) throw new Error(`Texture size [${this.texSize[0]},${this.texSize[1]}] generated by kernel is larger than supported size [${features.maxTextureSize},${features.maxTextureSize}]`);
      }
      translateSource() {
        throw new Error(`"translateSource" not defined on ${this.constructor.name}`);
      }
      pickRenderStrategy(args) {
        if (this.graphical) {
          this.renderRawOutput = this.readPackedPixelsToUint8Array;
          this.transferValues = pixels => pixels;
          this.TextureConstructor = GLTextureGraphical;
          return null;
        }
        if (this.precision === "unsigned") {
          this.renderRawOutput = this.readPackedPixelsToUint8Array;
          this.transferValues = this.readPackedPixelsToFloat32Array;
          if (this.pipeline) {
            this.renderOutput = this.renderTexture;
            if (this.subKernels !== null) this.renderKernels = this.renderKernelsToTextures;
            switch (this.returnType) {
             case "LiteralInteger":
             case "Float":
             case "Number":
             case "Integer":
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

             case "Array(2)":
             case "Array(3)":
             case "Array(4)":
              return this.requestFallback(args, `${this.returnType} output requires single precision, which this context does not support`);
            }
          } else {
            if (this.subKernels !== null) this.renderKernels = this.renderKernelsToArrays;
            switch (this.returnType) {
             case "LiteralInteger":
             case "Float":
             case "Number":
             case "Integer":
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

             case "Array(2)":
             case "Array(3)":
             case "Array(4)":
              return this.requestFallback(args, `${this.returnType} output requires single precision, which this context does not support`);
            }
          }
        } else if (this.precision === "single") {
          this.renderRawOutput = this.readFloatPixelsToFloat32Array;
          this.transferValues = this.readFloatPixelsToFloat32Array;
          if (this.pipeline) {
            this.renderOutput = this.renderTexture;
            if (this.subKernels !== null) this.renderKernels = this.renderKernelsToTextures;
            switch (this.returnType) {
             case "LiteralInteger":
             case "Float":
             case "Number":
             case "Integer":
              if (this.optimizeFloatMemory) if (this.output[2] > 0) {
                this.TextureConstructor = GLTextureMemoryOptimized3D;
                return null;
              } else if (this.output[1] > 0) {
                this.TextureConstructor = GLTextureMemoryOptimized2D;
                return null;
              } else {
                this.TextureConstructor = GLTextureMemoryOptimized;
                return null;
              } else if (this.output[2] > 0) {
                this.TextureConstructor = GLTextureFloat3D;
                return null;
              } else if (this.output[1] > 0) {
                this.TextureConstructor = GLTextureFloat2D;
                return null;
              } else {
                this.TextureConstructor = GLTextureFloat;
                return null;
              }

             case "Array(2)":
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

             case "Array(3)":
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

             case "Array(4)":
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
          if (this.subKernels !== null) this.renderKernels = this.renderKernelsToArrays;
          if (this.optimizeFloatMemory) switch (this.returnType) {
           case "LiteralInteger":
           case "Float":
           case "Number":
           case "Integer":
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

           case "Array(2)":
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

           case "Array(3)":
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

           case "Array(4)":
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
          } else switch (this.returnType) {
           case "LiteralInteger":
           case "Float":
           case "Number":
           case "Integer":
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

           case "Array(2)":
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

           case "Array(3)":
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

           case "Array(4)":
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
        } else throw new Error(`unhandled precision of "${this.precision}"`);
        throw new Error(`unhandled return type "${this.returnType}"`);
      }
      getKernelString() {
        throw new Error(`abstract method call`);
      }
      getMainResultTexture() {
        switch (this.returnType) {
         case "LiteralInteger":
         case "Float":
         case "Integer":
         case "Number":
          return this.getMainResultNumberTexture();

         case "Array(2)":
          return this.getMainResultArray2Texture();

         case "Array(3)":
          return this.getMainResultArray3Texture();

         case "Array(4)":
          return this.getMainResultArray4Texture();

         default:
          throw new Error(`unhandled returnType type ${this.returnType}`);
        }
      }
      getMainResultKernelNumberTexture() {
        throw new Error(`abstract method call`);
      }
      getMainResultSubKernelNumberTexture() {
        throw new Error(`abstract method call`);
      }
      getMainResultKernelArray2Texture() {
        throw new Error(`abstract method call`);
      }
      getMainResultSubKernelArray2Texture() {
        throw new Error(`abstract method call`);
      }
      getMainResultKernelArray3Texture() {
        throw new Error(`abstract method call`);
      }
      getMainResultSubKernelArray3Texture() {
        throw new Error(`abstract method call`);
      }
      getMainResultKernelArray4Texture() {
        throw new Error(`abstract method call`);
      }
      getMainResultSubKernelArray4Texture() {
        throw new Error(`abstract method call`);
      }
      getMainResultGraphical() {
        throw new Error(`abstract method call`);
      }
      getMainResultMemoryOptimizedFloats() {
        throw new Error(`abstract method call`);
      }
      getMainResultPackedPixels() {
        throw new Error(`abstract method call`);
      }
      getMainResultString() {
        if (this.graphical) return this.getMainResultGraphical(); else if (this.precision === "single") {
          if (this.optimizeFloatMemory) return this.getMainResultMemoryOptimizedFloats();
          return this.getMainResultTexture();
        } else return this.getMainResultPackedPixels();
      }
      getMainResultNumberTexture() {
        return utils.linesToString(this.getMainResultKernelNumberTexture()) + utils.linesToString(this.getMainResultSubKernelNumberTexture());
      }
      getMainResultArray2Texture() {
        return utils.linesToString(this.getMainResultKernelArray2Texture()) + utils.linesToString(this.getMainResultSubKernelArray2Texture());
      }
      getMainResultArray3Texture() {
        return utils.linesToString(this.getMainResultKernelArray3Texture()) + utils.linesToString(this.getMainResultSubKernelArray3Texture());
      }
      getMainResultArray4Texture() {
        return utils.linesToString(this.getMainResultKernelArray4Texture()) + utils.linesToString(this.getMainResultSubKernelArray4Texture());
      }
      getFloatTacticDeclaration() {
        return `precision ${this.getVariablePrecisionString(this.texSize, this.tactic)} float;\n`;
      }
      getIntTacticDeclaration() {
        return `precision ${this.getVariablePrecisionString(this.texSize, this.tactic, true)} int;\n`;
      }
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
        if (this.precision !== "unsigned") throw new Error('Requires this.precision to be "unsigned"');
        const {texSize: texSize, context: gl} = this;
        const result = new Uint8Array(texSize[0] * texSize[1] * 4);
        gl.readPixels(0, 0, texSize[0], texSize[1], gl.RGBA, gl.UNSIGNED_BYTE, result);
        return result;
      }
      readPackedPixelsToFloat32Array() {
        return new Float32Array(this.readPackedPixelsToUint8Array().buffer);
      }
      readFloatPixelsToFloat32Array() {
        if (this.precision !== "single") throw new Error('Requires this.precision to be "single"');
        const {texSize: texSize, context: gl} = this;
        const w = texSize[0];
        const h = texSize[1];
        const result = new Float32Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, result);
        return result;
      }
      getPixels(flip) {
        const {context: gl, output: output} = this;
        const [width, height] = output;
        const pixels = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        const result = new Uint8ClampedArray((flip ? pixels : utils.flipPixels(pixels, width, height)).buffer);
        return this.asyncMode ? Promise.resolve(result) : result;
      }
      renderKernelsToArrays() {
        const result = {
          result: this.renderOutput()
        };
        for (let i = 0; i < this.subKernels.length; i++) result[this.subKernels[i].property] = this.mappedTextures[i].toArray();
        return result;
      }
      renderKernelsToTextures() {
        const result = {
          result: this.renderOutput()
        };
        if (this.immutable) for (let i = 0; i < this.subKernels.length; i++) result[this.subKernels[i].property] = this.mappedTextures[i].clone(); else for (let i = 0; i < this.subKernels.length; i++) result[this.subKernels[i].property] = this.mappedTextures[i];
        return result;
      }
      setOutput(output) {
        const newOutput = this.toKernelOutput(output);
        if (this.program) {
          if (!this.dynamicOutput) throw new Error("Resizing a kernel with dynamicOutput: false is not possible");
          const newThreadDim = [ newOutput[0], newOutput[1] || 1, newOutput[2] || 1 ];
          const newTexSize = utils.getKernelTextureSize({
            optimizeFloatMemory: this.optimizeFloatMemory,
            precision: this.precision
          }, newThreadDim);
          const oldTexSize = this.texSize;
          if (oldTexSize) {
            const oldPrecision = this.getVariablePrecisionString(oldTexSize, this.tactic);
            const newPrecision = this.getVariablePrecisionString(newTexSize, this.tactic);
            if (oldPrecision !== newPrecision) {
              if (this.debug) console.warn("Precision requirement changed, asking GPU instance to recompile");
              this.switchKernels({
                type: "outputPrecisionMismatch",
                precision: newPrecision,
                needed: output
              });
              return;
            }
          }
          this.output = newOutput;
          this.threadDim = newThreadDim;
          this.texSize = newTexSize;
          const {context: gl} = this;
          gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
          this.updateMaxTexSize();
          this.framebuffer.width = this.texSize[0];
          this.framebuffer.height = this.texSize[1];
          gl.viewport(0, 0, this.maxTexSize[0], this.maxTexSize[1]);
          this.canvas.width = this.maxTexSize[0];
          this.canvas.height = this.maxTexSize[1];
          if (this.texture) this.texture.delete();
          this.texture = null;
          this._setupOutputTexture();
          if (this.mappedTextures && this.mappedTextures.length > 0) {
            for (let i = 0; i < this.mappedTextures.length; i++) this.mappedTextures[i].delete();
            this.mappedTextures = null;
            this._setupSubOutputTextures();
          }
        } else this.output = newOutput;
        return this;
      }
      renderValues() {
        return this.formatValues(this.transferValues(), this.output[0], this.output[1], this.output[2]);
      }
      getVariablePrecisionString(textureSize = this.texSize, tactic = this.tactic, isInt = false) {
        if (!tactic) {
          if (!this.constructor.features.isSpeedTacticSupported) return "highp";
          const low = this.constructor.features[isInt ? "lowIntPrecision" : "lowFloatPrecision"];
          const medium = this.constructor.features[isInt ? "mediumIntPrecision" : "mediumFloatPrecision"];
          const high = this.constructor.features[isInt ? "highIntPrecision" : "highFloatPrecision"];
          const requiredSize = Math.log2(textureSize[0] * textureSize[1]);
          if (requiredSize <= low.rangeMax) return "lowp"; else if (requiredSize <= medium.rangeMax) return "mediump"; else if (requiredSize <= high.rangeMax) return "highp"; else throw new Error(`The required size exceeds that of the ability of your system`);
        }
        switch (tactic) {
         case "speed":
          return "lowp";

         case "balanced":
          return "mediump";

         case "precision":
          return "highp";

         default:
          throw new Error(`Unknown tactic "${tactic}" use "speed", "balanced", "precision", or empty for auto`);
        }
      }
      updateTextureArgumentRefs(kernelValue, arg) {
        if (!this.immutable) return;
        if (this.texture.texture === arg.texture) {
          const {prevArg: prevArg} = kernelValue;
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
          const {mappedTextures: mappedTextures} = this;
          for (let i = 0; i < mappedTextures.length; i++) {
            const mappedTexture = mappedTextures[i];
            if (mappedTexture.texture === arg.texture) {
              const {prevArg: prevArg} = kernelValue;
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
          for (let i = 0; i < this.mappedTextures.length; i++) this._mappedTextureSwitched[i] = true;
          this.mappedTextures = previousKernel.mappedTextures;
        }
      }
      initCanvas() {}
    };
    const typeMap = {
      int: "Integer",
      float: "Number",
      vec2: "Array(2)",
      vec3: "Array(3)",
      vec4: "Array(4)"
    };
    module.exports = {
      GLKernel: GLKernel
    };
  });
  var require_function_node$3 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {FunctionNode: FunctionNode} = require_function_node$5();
    const INTEGER_COMPARISON_ROUNDING = {
      "<": "ceil",
      ">=": "ceil",
      ">": "floor",
      "<=": "floor"
    };
    var WebGLFunctionNode = class extends FunctionNode {
      constructor(source, settings) {
        super(source, settings);
        if (settings && settings.hasOwnProperty("fixIntegerDivisionAccuracy")) this.fixIntegerDivisionAccuracy = settings.fixIntegerDivisionAccuracy;
      }
      astConditionalExpression(ast, retArr) {
        if (ast.type !== "ConditionalExpression") throw this.astErrorOutput("Not a conditional expression", ast);
        const consequentType = this.getType(ast.consequent);
        const alternateType = this.getType(ast.alternate);
        if (consequentType === null && alternateType === null) {
          retArr.push("if (");
          this.astGeneric(ast.test, retArr);
          retArr.push(") {");
          this.astGeneric(ast.consequent, retArr);
          retArr.push(";");
          retArr.push("} else {");
          this.astGeneric(ast.alternate, retArr);
          retArr.push(";");
          retArr.push("}");
          return retArr;
        }
        retArr.push("(");
        this.astGeneric(ast.test, retArr);
        retArr.push("?");
        this.astGeneric(ast.consequent, retArr);
        retArr.push(":");
        this.astGeneric(ast.alternate, retArr);
        retArr.push(")");
        return retArr;
      }
      astFunction(ast, retArr) {
        if (this.isRootKernel) retArr.push("void"); else {
          if (!this.returnType) {
            if (this.findLastReturn()) {
              this.returnType = this.getType(ast.body);
              if (this.returnType === "LiteralInteger") this.returnType = "Number";
            }
          }
          const {returnType: returnType} = this;
          if (!returnType) retArr.push("void"); else {
            const type = typeMap[returnType];
            if (!type) throw new Error(`unknown type ${returnType}`);
            retArr.push(type);
          }
        }
        retArr.push(" ");
        retArr.push(this.name);
        retArr.push("(");
        if (!this.isRootKernel) for (let i = 0; i < this.argumentNames.length; ++i) {
          const argumentName = this.argumentNames[i];
          if (i > 0) retArr.push(", ");
          let argumentType = this.argumentTypes[this.argumentNames.indexOf(argumentName)];
          if (!argumentType) throw this.astErrorOutput(`Unknown argument ${argumentName} type`, ast);
          if (argumentType === "LiteralInteger") this.argumentTypes[i] = argumentType = "Number";
          const type = typeMap[argumentType];
          if (!type) throw this.astErrorOutput("Unexpected expression", ast);
          const name = utils.sanitizeName(argumentName);
          if (type === "sampler2D" || type === "sampler2DArray") retArr.push(`${type} user_${name},ivec2 user_${name}Size,ivec3 user_${name}Dim`); else retArr.push(`${type} user_${name}`);
        }
        retArr.push(") {\n");
        if (this.isRootKernel) {
          const assignedArguments = this.getAssignedArguments();
          for (let i = 0; i < this.argumentNames.length; ++i) {
            const argumentName = this.argumentNames[i];
            if (!assignedArguments.has(argumentName)) continue;
            const type = typeMap[this.argumentTypes[i]];
            if (type !== "float" && type !== "int" && type !== "bool") continue;
            const name = utils.sanitizeName(argumentName);
            retArr.push(`${type} cellShadow_user_${name}=user_${name};\n`);
          }
        }
        for (let i = 0; i < ast.body.body.length; ++i) {
          this.astStatementWithHoisting(ast.body.body[i], retArr);
          retArr.push("\n");
        }
        retArr.push("}\n");
        return retArr;
      }
      astReturnStatement(ast, retArr) {
        if (!ast.argument) throw this.astErrorOutput("Unexpected return statement", ast);
        this.pushState("skip-literal-correction");
        const type = this.getType(ast.argument);
        this.popState("skip-literal-correction");
        const result = [];
        if (!this.returnType) if (type === "LiteralInteger" || type === "Integer") this.returnType = "Number"; else this.returnType = type;
        switch (this.returnType) {
         case "LiteralInteger":
         case "Number":
         case "Float":
          switch (type) {
           case "Integer":
            result.push("float(");
            this.astGeneric(ast.argument, result);
            result.push(")");
            break;

           case "LiteralInteger":
            this.castLiteralToFloat(ast.argument, result);
            if (this.getType(ast) === "Integer") {
              result.unshift("float(");
              result.push(")");
            }
            break;

           default:
            this.astGeneric(ast.argument, result);
          }
          break;

         case "Integer":
          switch (type) {
           case "Float":
           case "Number":
            this.castValueToInteger(ast.argument, result);
            break;

           case "LiteralInteger":
            this.castLiteralToInteger(ast.argument, result);
            break;

           default:
            this.astGeneric(ast.argument, result);
          }
          break;

         case "Array(4)":
         case "Array(3)":
         case "Array(2)":
         case "Matrix(2)":
         case "Matrix(3)":
         case "Matrix(4)":
         case "Input":
          this.astGeneric(ast.argument, result);
          break;

         default:
          throw this.astErrorOutput(`unhandled return type ${this.returnType}`, ast);
        }
        if (this.isRootKernel) {
          retArr.push(`kernelResult = ${result.join("")};`);
          retArr.push("return;");
        } else if (this.isSubKernel) {
          retArr.push(`subKernelResult_${this.name} = ${result.join("")};`);
          retArr.push(`return subKernelResult_${this.name};`);
        } else retArr.push(`return ${result.join("")};`);
        return retArr;
      }
      astLiteral(ast, retArr) {
        if (isNaN(ast.value)) throw this.astErrorOutput("Non-numeric literal not supported : " + ast.value, ast);
        const key = this.astKey(ast);
        if (Number.isInteger(ast.value)) if (this.isState("casting-to-integer") || this.isState("building-integer")) {
          this.literalTypes[key] = "Integer";
          retArr.push(`${ast.value}`);
        } else if (this.isState("casting-to-float") || this.isState("building-float")) {
          this.literalTypes[key] = "Number";
          retArr.push(utils.glslFloatLiteral(ast.value));
        } else {
          this.literalTypes[key] = "Number";
          retArr.push(utils.glslFloatLiteral(ast.value));
        } else if (this.isState("casting-to-integer") || this.isState("building-integer")) {
          this.literalTypes[key] = "Integer";
          retArr.push(Math.round(ast.value));
        } else {
          this.literalTypes[key] = "Number";
          retArr.push(`${ast.value}`);
        }
        return retArr;
      }
      astBinaryExpression(ast, retArr) {
        if (this.checkAndUpconvertOperator(ast, retArr)) return retArr;
        if (ast.operator === "/") {
          const wrap = this.fixIntegerDivisionAccuracy;
          retArr.push(wrap ? "divWithIntCheck(" : "(");
          this.pushState("building-float");
          switch (this.getType(ast.left)) {
           case "Integer":
            this.castValueToFloat(ast.left, retArr);
            break;

           case "LiteralInteger":
            this.castLiteralToFloat(ast.left, retArr);
            break;

           default:
            this.astGeneric(ast.left, retArr);
          }
          retArr.push(wrap ? ", " : "/");
          switch (this.getType(ast.right)) {
           case "Integer":
            this.castValueToFloat(ast.right, retArr);
            break;

           case "LiteralInteger":
            this.castLiteralToFloat(ast.right, retArr);
            break;

           default:
            this.astGeneric(ast.right, retArr);
          }
          this.popState("building-float");
          retArr.push(")");
          return retArr;
        }
        retArr.push("(");
        const leftType = this.getType(ast.left) || "Number";
        const rightType = this.getType(ast.right) || "Number";
        if (!leftType || !rightType) throw this.astErrorOutput(`Unhandled binary expression`, ast);
        const key = leftType + " & " + rightType;
        switch (key) {
         case "Integer & Integer":
          this.pushState("building-integer");
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.astGeneric(ast.right, retArr);
          this.popState("building-integer");
          break;

         case "Number & Float":
         case "Float & Number":
         case "Float & Float":
         case "Number & Number":
          this.pushState("building-float");
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.astGeneric(ast.right, retArr);
          this.popState("building-float");
          break;

         case "LiteralInteger & LiteralInteger":
          if (this.isState("casting-to-integer") || this.isState("building-integer")) {
            this.pushState("building-integer");
            this.astGeneric(ast.left, retArr);
            retArr.push(operatorMap[ast.operator] || ast.operator);
            this.astGeneric(ast.right, retArr);
            this.popState("building-integer");
          } else {
            this.pushState("building-float");
            this.castLiteralToFloat(ast.left, retArr);
            retArr.push(operatorMap[ast.operator] || ast.operator);
            this.castLiteralToFloat(ast.right, retArr);
            this.popState("building-float");
          }
          break;

         case "Integer & Float":
         case "Integer & Number":
          {
            const roundToward = INTEGER_COMPARISON_ROUNDING[ast.operator];
            if (roundToward) {
              this.pushState("building-integer");
              this.astGeneric(ast.left, retArr);
              retArr.push(operatorMap[ast.operator] || ast.operator);
              if (ast.right.type === "Literal" && typeof ast.right.value === "number") retArr.push(`${Math[roundToward](ast.right.value)}`); else {
                retArr.push(`int(${roundToward}(`);
                this.pushState("building-float");
                this.astGeneric(ast.right, retArr);
                this.popState("building-float");
                retArr.push("))");
              }
              this.popState("building-integer");
              break;
            }
            this.pushState("building-float");
            this.castValueToFloat(ast.left, retArr);
            retArr.push(operatorMap[ast.operator] || ast.operator);
            this.astGeneric(ast.right, retArr);
            this.popState("building-float");
            break;
          }

         case "Integer & LiteralInteger":
          this.pushState("building-integer");
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.castLiteralToInteger(ast.right, retArr);
          this.popState("building-integer");
          break;

         case "Number & Integer":
          this.pushState("building-float");
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.castValueToFloat(ast.right, retArr);
          this.popState("building-float");
          break;

         case "Float & LiteralInteger":
         case "Number & LiteralInteger":
          this.pushState("building-float");
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.castLiteralToFloat(ast.right, retArr);
          this.popState("building-float");
          break;

         case "LiteralInteger & Float":
         case "LiteralInteger & Number":
          if (this.isState("casting-to-integer")) {
            this.pushState("building-integer");
            this.castLiteralToInteger(ast.left, retArr);
            retArr.push(operatorMap[ast.operator] || ast.operator);
            this.castValueToInteger(ast.right, retArr);
            this.popState("building-integer");
          } else {
            this.pushState("building-float");
            this.astGeneric(ast.left, retArr);
            retArr.push(operatorMap[ast.operator] || ast.operator);
            this.pushState("casting-to-float");
            this.astGeneric(ast.right, retArr);
            this.popState("casting-to-float");
            this.popState("building-float");
          }
          break;

         case "LiteralInteger & Integer":
          this.pushState("building-integer");
          this.castLiteralToInteger(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.astGeneric(ast.right, retArr);
          this.popState("building-integer");
          break;

         case "Boolean & Boolean":
          this.pushState("building-boolean");
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.astGeneric(ast.right, retArr);
          this.popState("building-boolean");
          break;

         case "Float & Integer":
          this.pushState("building-float");
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.castValueToFloat(ast.right, retArr);
          this.popState("building-float");
          break;

         default:
          throw this.astErrorOutput(`Unhandled binary expression between ${key}`, ast);
        }
        retArr.push(")");
        return retArr;
      }
      checkAndUpconvertOperator(ast, retArr) {
        const bitwiseResult = this.checkAndUpconvertBitwiseOperators(ast, retArr);
        if (bitwiseResult) return bitwiseResult;
        const foundOperator = {
          "%": this.fixIntegerDivisionAccuracy ? "integerCorrectionModulo" : "modulo",
          "**": "pow"
        }[ast.operator];
        if (!foundOperator) return null;
        retArr.push(foundOperator);
        retArr.push("(");
        switch (this.getType(ast.left)) {
         case "Integer":
          this.castValueToFloat(ast.left, retArr);
          break;

         case "LiteralInteger":
          this.castLiteralToFloat(ast.left, retArr);
          break;

         default:
          this.astGeneric(ast.left, retArr);
        }
        retArr.push(",");
        switch (this.getType(ast.right)) {
         case "Integer":
          this.castValueToFloat(ast.right, retArr);
          break;

         case "LiteralInteger":
          this.castLiteralToFloat(ast.right, retArr);
          break;

         default:
          this.astGeneric(ast.right, retArr);
        }
        retArr.push(")");
        return retArr;
      }
      checkAndUpconvertBitwiseOperators(ast, retArr) {
        const foundOperator = {
          "&": "bitwiseAnd",
          "|": "bitwiseOr",
          "^": "bitwiseXOR",
          "<<": "bitwiseZeroFillLeftShift",
          ">>": "bitwiseSignedRightShift",
          ">>>": "bitwiseZeroFillRightShift"
        }[ast.operator];
        if (!foundOperator) return null;
        retArr.push(foundOperator);
        retArr.push("(");
        switch (this.getType(ast.left)) {
         case "Number":
         case "Float":
          this.castValueToInteger(ast.left, retArr);
          break;

         case "LiteralInteger":
          this.castLiteralToInteger(ast.left, retArr);
          break;

         default:
          this.astGeneric(ast.left, retArr);
        }
        retArr.push(",");
        switch (this.getType(ast.right)) {
         case "Number":
         case "Float":
          this.castValueToInteger(ast.right, retArr);
          break;

         case "LiteralInteger":
          this.castLiteralToInteger(ast.right, retArr);
          break;

         default:
          this.astGeneric(ast.right, retArr);
        }
        retArr.push(")");
        return retArr;
      }
      checkAndUpconvertBitwiseUnary(ast, retArr) {
        const foundOperator = {
          "~": "bitwiseNot"
        }[ast.operator];
        if (!foundOperator) return null;
        retArr.push(foundOperator);
        retArr.push("(");
        switch (this.getType(ast.argument)) {
         case "Number":
         case "Float":
          this.castValueToInteger(ast.argument, retArr);
          break;

         case "LiteralInteger":
          this.castLiteralToInteger(ast.argument, retArr);
          break;

         default:
          this.astGeneric(ast.argument, retArr);
        }
        retArr.push(")");
        return retArr;
      }
      castLiteralToInteger(ast, retArr) {
        this.pushState("casting-to-integer");
        this.astGeneric(ast, retArr);
        this.popState("casting-to-integer");
        return retArr;
      }
      castLiteralToFloat(ast, retArr) {
        this.pushState("casting-to-float");
        this.astGeneric(ast, retArr);
        this.popState("casting-to-float");
        return retArr;
      }
      castValueToInteger(ast, retArr) {
        this.pushState("casting-to-integer");
        retArr.push("int(");
        this.astGeneric(ast, retArr);
        retArr.push(")");
        this.popState("casting-to-integer");
        return retArr;
      }
      castValueToFloat(ast, retArr) {
        this.pushState("casting-to-float");
        retArr.push("float(");
        this.astGeneric(ast, retArr);
        retArr.push(")");
        this.popState("casting-to-float");
        return retArr;
      }
      astIdentifierExpression(idtNode, retArr) {
        if (idtNode.type !== "Identifier") throw this.astErrorOutput("IdentifierExpression - not an Identifier", idtNode);
        const type = this.getType(idtNode);
        const name = utils.sanitizeName(idtNode.name);
        if (idtNode.name === "Infinity") retArr.push("3.402823466e+38"); else if (type === "Boolean") if (this.argumentNames.indexOf(name) > -1) {
          const marked = this.markupUserName(idtNode.name);
          retArr.push(marked.startsWith("cellShadow_") ? marked : `bool(${marked})`);
        } else retArr.push(`user_${name}`); else retArr.push(this.markupUserName(idtNode.name));
        return retArr;
      }
      markupUserName(name) {
        const sanitized = utils.sanitizeName(name);
        if (this.isRootKernel && this.getAssignedArguments().has(name)) {
          const index = this.argumentNames.indexOf(name);
          const type = index === -1 ? null : typeMap[this.argumentTypes[index]];
          if (type === "float" || type === "int" || type === "bool") return `cellShadow_user_${sanitized}`;
        }
        return `user_${sanitized}`;
      }
      astForStatement(forNode, retArr) {
        if (forNode.type !== "ForStatement") throw this.astErrorOutput("Invalid for statement", forNode);
        const initArr = [];
        const testArr = [];
        const updateArr = [];
        const bodyArr = [];
        let isSafe = null;
        if (forNode.init) if (forNode.init.type !== "VariableDeclaration") {
          isSafe = false;
          this.astGeneric(forNode.init, initArr);
          initArr.push(";");
        } else {
          const {declarations: declarations} = forNode.init;
          if (declarations.length > 1) isSafe = false;
          this.astGeneric(forNode.init, initArr);
          for (let i = 0; i < declarations.length; i++) if (declarations[i].init && declarations[i].init.type !== "Literal") isSafe = false;
          if (isSafe !== false && this.loopIndexAssignedInLoop(forNode, declarations)) isSafe = false;
        } else isSafe = false;
        if (forNode.test) this.astGeneric(forNode.test, testArr); else isSafe = false;
        if (forNode.update) {
          if (forNode.update.type === "AssignmentExpression") this.pushState("assignment-as-statement");
          this.astGeneric(forNode.update, updateArr);
        } else isSafe = false;
        if (forNode.body) {
          this.pushState("loop-body");
          this.astGeneric(forNode.body, bodyArr);
          this.popState("loop-body");
        }
        if (isSafe === null) isSafe = this.isSafe(forNode.init) && this.isSafe(forNode.test);
        return this.emitForParts({
          initArr: initArr,
          testArr: testArr,
          updateArr: updateArr,
          bodyArr: bodyArr,
          isSafe: isSafe
        }, retArr);
      }
      loopIndexAssignedInLoop(forNode, declarations) {
        const targets = new Set;
        const targetNames = new Set;
        for (let i = 0; i < declarations.length; i++) if (declarations[i].id && declarations[i].id.type === "Identifier") {
          targetNames.add(declarations[i].id.name);
          const record = this.getDeclaration(declarations[i].id);
          if (record) targets.add(record);
        }
        if (targets.size === 0) return false;
        let found = false;
        const hits = node => {
          const record = this.getDeclaration(node);
          return record !== null && targets.has(record);
        };
        const walk = node => {
          if (!node || typeof node !== "object" || found) return;
          if (Array.isArray(node)) {
            for (const child of node) walk(child);
            return;
          }
          if (node.type === "ForStatement" && node.init && node.init.type === "VariableDeclaration" && node.init.declarations.some(d => d.id && d.id.type === "Identifier" && targetNames.has(d.id.name))) return;
          if (node.type === "AssignmentExpression" && node.left.type === "Identifier" && hits(node.left)) {
            found = true;
            return;
          }
          if (node.type === "UpdateExpression" && node.argument.type === "Identifier" && hits(node.argument)) {
            found = true;
            return;
          }
          for (const key in node) {
            if (key === "loc" || key === "range" || key === "parent") continue;
            const child = node[key];
            if (child && typeof child === "object") walk(child);
          }
        };
        walk(forNode.body);
        if (!found && forNode.test) walk(forNode.test);
        return found;
      }
      emitForParts(parts, retArr) {
        const {initArr: initArr, testArr: testArr, updateArr: updateArr, bodyArr: bodyArr, isSafe: isSafe} = parts;
        if (isSafe) {
          const initString = initArr.join("");
          const initNeedsSemiColon = initString[initString.length - 1] !== ";";
          retArr.push(`for (${initString}${initNeedsSemiColon ? ";" : ""}${testArr.join("")};${updateArr.join("")}){\n`);
          retArr.push(bodyArr.join(""));
          retArr.push("}\n");
        } else {
          const iVariableName = this.getInternalVariableName("safeI");
          if (initArr.length > 0) retArr.push(initArr.join(""), "\n");
          retArr.push(`for (int ${iVariableName}=0;${iVariableName}<LOOP_MAX;${iVariableName}++){\n`);
          if (testArr.length > 0) retArr.push(`if (!${testArr.join("")}) break;\n`);
          retArr.push(bodyArr.join(""));
          retArr.push(`\n${updateArr.join("")};`);
          retArr.push("}\n");
        }
        return retArr;
      }
      astWhileStatement(whileNode, retArr) {
        if (whileNode.type !== "WhileStatement") throw this.astErrorOutput("Invalid while statement", whileNode);
        const iVariableName = this.getInternalVariableName("safeI");
        retArr.push(`for (int ${iVariableName}=0;${iVariableName}<LOOP_MAX;${iVariableName}++){\n`);
        retArr.push("if (!");
        this.astGeneric(whileNode.test, retArr);
        retArr.push(") break;\n");
        this.astGeneric(whileNode.body, retArr);
        retArr.push("}\n");
        return retArr;
      }
      astDoWhileStatement(doWhileNode, retArr) {
        if (doWhileNode.type !== "DoWhileStatement") throw this.astErrorOutput("Invalid while statement", doWhileNode);
        const iVariableName = this.getInternalVariableName("safeI");
        retArr.push(`for (int ${iVariableName}=0;${iVariableName}<LOOP_MAX;${iVariableName}++){\n`);
        retArr.push(`if (${iVariableName}>0){if (!`);
        this.astGeneric(doWhileNode.test, retArr);
        retArr.push(") break;}\n");
        this.astGeneric(doWhileNode.body, retArr);
        retArr.push("}\n");
        return retArr;
      }
      astAssignmentExpression(assNode, retArr) {
        const isStatement = this.isState("assignment-as-statement");
        if (isStatement) this.popState("assignment-as-statement"); else retArr.push("(");
        if (assNode.operator === "%=") {
          this.astGeneric(assNode.left, retArr);
          retArr.push("=");
          retArr.push("mod(");
          this.astGeneric(assNode.left, retArr);
          retArr.push(",");
          this.astGeneric(assNode.right, retArr);
          retArr.push(")");
        } else if (assNode.operator === "**=") {
          this.astGeneric(assNode.left, retArr);
          retArr.push("=");
          retArr.push("pow(");
          this.astGeneric(assNode.left, retArr);
          retArr.push(",");
          this.astGeneric(assNode.right, retArr);
          retArr.push(")");
        } else {
          const leftType = this.getType(assNode.left);
          const rightType = this.getType(assNode.right);
          this.astGeneric(assNode.left, retArr);
          retArr.push(assNode.operator);
          if (leftType !== "Integer" && rightType === "Integer") {
            retArr.push("float(");
            this.astGeneric(assNode.right, retArr);
            retArr.push(")");
          } else if (leftType === "Integer" && rightType === "LiteralInteger") this.castLiteralToInteger(assNode.right, retArr); else this.astGeneric(assNode.right, retArr);
        }
        if (!isStatement) retArr.push(")");
        return retArr;
      }
      astBlockStatement(bNode, retArr) {
        if (this.isState("loop-body")) {
          this.pushState("block-body");
          for (let i = 0; i < bNode.body.length; i++) this.astStatementWithHoisting(bNode.body[i], retArr);
          this.popState("block-body");
        } else {
          retArr.push("{\n");
          for (let i = 0; i < bNode.body.length; i++) this.astStatementWithHoisting(bNode.body[i], retArr);
          retArr.push("}\n");
        }
        return retArr;
      }
      traceFunctionAST(ast) {
        this.normalizeBlock(ast.body);
        super.traceFunctionAST(ast);
      }
      normalizeBlock(block) {
        if (!block || block.type !== "BlockStatement") return;
        const body = block.body;
        for (let i = 0; i < body.length; i++) {
          const statement = body[i];
          switch (statement.type) {
           case "ExpressionStatement":
           case "VariableDeclaration":
           case "ReturnStatement":
            if (!statementIsSideEffectFreeBesidesTopLevelAssignment(statement) && statementContainsNestedIndexRead(statement) || containsNestedSameFunctionCall(statement)) {
              const linearized = this.linearizeStatement(statement);
              if (linearized !== null) {
                body.splice(i, 1, ...linearized);
                i += linearized.length - 1;
              }
            }
            break;

           case "IfStatement":
            if (statementContainsNestedIndexRead(statement.test) || containsNestedSameFunctionCall(statement.test)) {
              const wrapper = {
                type: "VariableDeclaration",
                kind: "const",
                declarations: [ {
                  type: "VariableDeclarator",
                  id: {
                    type: "Identifier",
                    name: `hoistSeqIf${this.linearTempId = (this.linearTempId || 0) + 1}`
                  },
                  init: statement.test
                } ]
              };
              const linearized = this.linearizeStatement(wrapper);
              if (linearized !== null) {
                const reference = {
                  type: "Identifier",
                  name: wrapper.declarations[0].id.name,
                  start: this.syntheticNodeId,
                  end: this.syntheticNodeId + 1
                };
                this.syntheticNodeId += 2;
                statement.test = reference;
                body.splice(i, 0, ...linearized);
                i += linearized.length;
              }
            }
            this.normalizeBranch(statement, "consequent");
            this.normalizeBranch(statement, "alternate");
            break;

           case "ForStatement":
           case "WhileStatement":
           case "DoWhileStatement":
            {
              const rewritten = this.normalizeLoopHeader(statement);
              if (rewritten !== null) {
                body.splice(i, 1, rewritten);
                this.normalizeBlock(rewritten);
                i--;
                break;
              }
              this.normalizeBranch(statement, "body");
              break;
            }

           case "SwitchStatement":
            if (statementContainsNestedIndexRead(statement.discriminant)) {
              const wrapper = {
                type: "VariableDeclaration",
                kind: "const",
                declarations: [ {
                  type: "VariableDeclarator",
                  id: {
                    type: "Identifier",
                    name: `hoistSeqIf${this.linearTempId = (this.linearTempId || 0) + 1}`
                  },
                  init: statement.discriminant
                } ]
              };
              const linearized = this.linearizeStatement(wrapper);
              if (linearized !== null) {
                statement.discriminant = {
                  type: "Identifier",
                  name: wrapper.declarations[0].id.name,
                  start: this.syntheticNodeId,
                  end: this.syntheticNodeId + 1
                };
                this.syntheticNodeId += 2;
                body.splice(i, 0, ...linearized);
                i += linearized.length;
              }
            }
            for (let c = 0; c < statement.cases.length; c++) {
              const block = {
                type: "BlockStatement",
                body: statement.cases[c].consequent
              };
              this.normalizeBlock(block);
              statement.cases[c].consequent = block.body;
            }
            break;

           case "BlockStatement":
            this.normalizeBlock(statement);
            break;
          }
        }
      }
      normalizeBranch(statement, key) {
        const branch = statement[key];
        if (!branch) return;
        if (branch.type === "BlockStatement") {
          this.normalizeBlock(branch);
          return;
        }
        if (!statementContainsNestedIndexRead(branch) && !containsNestedSameFunctionCall(branch)) return;
        statement[key] = {
          type: "BlockStatement",
          body: [ branch ]
        };
        this.normalizeBlock(statement[key]);
      }
      normalizeLoopHeader(statement) {
        const {type: type} = statement;
        const init = type === "ForStatement" ? statement.init : null;
        const test = statement.test || null;
        const update = type === "ForStatement" ? statement.update : null;
        if (![ init, test, update ].some(part => part !== null && (statementContainsNestedIndexRead(part) || containsNestedSameFunctionCall(part)))) return null;
        const clone = node => JSON.parse(JSON.stringify(node));
        const breakCheck = testExpression => ({
          type: "IfStatement",
          test: {
            type: "UnaryExpression",
            operator: "!",
            prefix: true,
            argument: testExpression
          },
          consequent: {
            type: "BlockStatement",
            body: [ {
              type: "BreakStatement",
              label: null
            } ]
          },
          alternate: null
        });
        const asStatement = expression => expression.type === "VariableDeclaration" ? expression : {
          type: "ExpressionStatement",
          expression: expression
        };
        const bodyStatements = statement.body.type === "BlockStatement" ? statement.body.body.slice() : [ statement.body ];
        const rewriteContinues = (nodes, makePrefix) => {
          const visit = node => {
            if (!node || typeof node !== "object") return node;
            if (Array.isArray(node)) return node.map(visit);
            switch (node.type) {
             case "ContinueStatement":
              return {
                type: "BlockStatement",
                body: [ ...makePrefix(), node ]
              };

             case "ForStatement":
             case "WhileStatement":
             case "DoWhileStatement":
              return node;

             case "IfStatement":
              return {
                ...node,
                consequent: visit(node.consequent),
                alternate: visit(node.alternate)
              };

             case "BlockStatement":
              return {
                ...node,
                body: node.body.map(visit)
              };

             case "SwitchStatement":
              return {
                ...node,
                cases: node.cases.map(c => ({
                  ...c,
                  consequent: c.consequent.map(visit)
                }))
              };

             default:
              return node;
            }
          };
          return nodes.map(visit);
        };
        const loopBody = [];
        if (type === "DoWhileStatement") {
          loopBody.push(...test ? rewriteContinues(bodyStatements, () => [ breakCheck(clone(test)) ]) : bodyStatements);
          if (test) loopBody.push(breakCheck(test));
        } else {
          if (test) loopBody.push(breakCheck(test));
          loopBody.push(...update ? rewriteContinues(bodyStatements, () => [ asStatement(clone(update)) ]) : bodyStatements);
          if (update) loopBody.push(asStatement(update));
        }
        const replacement = {
          type: "BlockStatement",
          body: [ ...init ? [ asStatement(init) ] : [], {
            type: "WhileStatement",
            test: {
              type: "Literal",
              value: true,
              raw: "true"
            },
            body: {
              type: "BlockStatement",
              body: loopBody
            }
          } ]
        };
        this.stampSyntheticNodes(replacement);
        return replacement;
      }
      stampSyntheticNodes(root) {
        let syntheticId = this.syntheticNodeId || 1073741824;
        const stamp = node => {
          if (!node || typeof node !== "object") return;
          if (Array.isArray(node)) {
            node.forEach(stamp);
            return;
          }
          if (typeof node.type === "string" && node.start === void 0) {
            node.start = syntheticId;
            node.end = syntheticId + 1;
            syntheticId += 2;
          }
          for (const key in node) {
            if (key === "loc" || key === "range" || key === "parent") continue;
            stamp(node[key]);
          }
        };
        stamp(root);
        this.syntheticNodeId = syntheticId;
      }
      linearizeStatement(statement) {
        const statements = [];
        let failed = false;
        let tempId = this.linearTempId || 0;
        const identifier = name => ({
          type: "Identifier",
          name: name
        });
        const declare = (kind, name, init) => ({
          type: "VariableDeclaration",
          kind: kind,
          declarations: [ {
            type: "VariableDeclarator",
            id: identifier(name),
            init: init
          } ]
        });
        const capture = (into, expression) => {
          const name = `hoistSeq${tempId++}`;
          into.push(declare("const", name, expression));
          return identifier(name);
        };
        const hasSideEffects = node => !nodeIsSideEffectFree(node);
        const linearize = (node, into) => {
          if (failed || !node || typeof node !== "object") return node;
          switch (node.type) {
           case "Identifier":
           case "Literal":
           case "ThisExpression":
            return node;

           case "MemberExpression":
            {
              const object = linearize(node.object, into);
              const property = node.computed ? linearize(node.property, into) : node.property;
              return {
                ...node,
                object: object,
                property: property
              };
            }

           case "CallExpression":
            {
              const args = node.arguments.map(argument => linearize(argument, into));
              if (node.callee.type === "Identifier") {
                for (let i = 0; i < args.length; i++) if (containsCallTo(args[i], node.callee.name)) args[i] = capture(into, args[i]);
              }
              return {
                ...node,
                arguments: args
              };
            }

           case "BinaryExpression":
            {
              const left = linearize(node.left, into);
              const leftStable = hasSideEffects(node.right) ? capture(into, left) : left;
              return {
                ...node,
                left: leftStable,
                right: linearize(node.right, into)
              };
            }

           case "UnaryExpression":
            return {
              ...node,
              argument: linearize(node.argument, into)
            };

           case "ArrayExpression":
            return {
              ...node,
              elements: node.elements.map(element => linearize(element, into))
            };

           case "UpdateExpression":
            {
              if (node.argument.type !== "Identifier") {
                failed = true;
                return node;
              }
              if (node.prefix) {
                into.push({
                  type: "ExpressionStatement",
                  expression: node
                });
                return capture(into, node.argument);
              }
              const before = capture(into, node.argument);
              into.push({
                type: "ExpressionStatement",
                expression: node
              });
              return before;
            }

           case "AssignmentExpression":
            {
              if (node.left.type !== "Identifier") {
                failed = true;
                return node;
              }
              const value = linearize(node.right, into);
              into.push({
                type: "ExpressionStatement",
                expression: {
                  ...node,
                  right: value
                }
              });
              return capture(into, node.left);
            }

           case "SequenceExpression":
            for (let i = 0; i < node.expressions.length - 1; i++) {
              const expression = linearize(node.expressions[i], into);
              if (expression.type === "UpdateExpression" || expression.type === "AssignmentExpression") into.push({
                type: "ExpressionStatement",
                expression: expression
              });
            }
            return linearize(node.expressions[node.expressions.length - 1], into);

           case "ConditionalExpression":
            {
              if (!hasSideEffects(node.consequent) && !hasSideEffects(node.alternate)) return {
                ...node,
                test: linearize(node.test, into)
              };
              const test = linearize(node.test, into);
              const name = `hoistSeq${tempId++}`;
              into.push(declare("let", name, {
                type: "Literal",
                value: 0,
                raw: "0"
              }));
              const consequent = [];
              const alternate = [];
              const consequentValue = linearize(node.consequent, consequent);
              const alternateValue = linearize(node.alternate, alternate);
              const assign = (target, value) => ({
                type: "ExpressionStatement",
                expression: {
                  type: "AssignmentExpression",
                  operator: "=",
                  left: identifier(target),
                  right: value
                }
              });
              consequent.push(assign(name, consequentValue));
              alternate.push(assign(name, alternateValue));
              into.push({
                type: "IfStatement",
                test: test,
                consequent: {
                  type: "BlockStatement",
                  body: consequent
                },
                alternate: {
                  type: "BlockStatement",
                  body: alternate
                }
              });
              return identifier(name);
            }

           case "LogicalExpression":
            {
              if (!hasSideEffects(node.right)) return {
                ...node,
                left: linearize(node.left, into)
              };
              const left = linearize(node.left, into);
              const name = `hoistSeq${tempId++}`;
              into.push(declare("let", name, left));
              const branch = [];
              const rightValue = linearize(node.right, branch);
              branch.push({
                type: "ExpressionStatement",
                expression: {
                  type: "AssignmentExpression",
                  operator: "=",
                  left: identifier(name),
                  right: rightValue
                }
              });
              into.push({
                type: "IfStatement",
                test: node.operator === "&&" ? identifier(name) : {
                  type: "UnaryExpression",
                  operator: "!",
                  prefix: true,
                  argument: identifier(name)
                },
                consequent: {
                  type: "BlockStatement",
                  body: branch
                },
                alternate: null
              });
              return identifier(name);
            }

           default:
            failed = true;
            return node;
          }
        };
        switch (statement.type) {
         case "ExpressionStatement":
          {
            const expression = statement.expression;
            if (expression.type === "AssignmentExpression" && expression.left.type === "Identifier") {
              const value = linearize(expression.right, statements);
              statements.push({
                type: "ExpressionStatement",
                expression: {
                  ...expression,
                  right: value
                }
              });
            } else {
              const value = linearize(expression, statements);
              if (value.type === "UpdateExpression" || value.type === "AssignmentExpression") statements.push({
                type: "ExpressionStatement",
                expression: value
              });
            }
            break;
          }

         case "VariableDeclaration":
          for (let i = 0; i < statement.declarations.length; i++) {
            const declarator = statement.declarations[i];
            const init = linearize(declarator.init, statements);
            statements.push({
              ...statement,
              declarations: [ {
                ...declarator,
                init: init
              } ]
            });
          }
          break;

         case "ReturnStatement":
          {
            const argument = linearize(statement.argument, statements);
            statements.push({
              ...statement,
              argument: argument
            });
            break;
          }

         default:
          return null;
        }
        if (failed) return null;
        this.linearTempId = tempId;
        let syntheticId = this.syntheticNodeId || 1073741824;
        const stamp = node => {
          if (!node || typeof node !== "object") return;
          if (Array.isArray(node)) {
            node.forEach(stamp);
            return;
          }
          if (typeof node.type === "string" && node.start === void 0) {
            node.start = syntheticId;
            node.end = syntheticId + 1;
            syntheticId += 2;
          }
          for (const key in node) {
            if (key === "loc" || key === "range" || key === "parent") continue;
            stamp(node[key]);
          }
        };
        stamp(statements);
        this.syntheticNodeId = syntheticId;
        return statements;
      }
      astStatementWithHoisting(ast, retArr) {
        switch (ast.type) {
         case "ExpressionStatement":
         case "VariableDeclaration":
         case "ReturnStatement":
          {
            if (!statementIsSideEffectFreeBesidesTopLevelAssignment(ast)) return this.astGeneric(ast, retArr);
            const previousHoist = this.hoistedIndexReads;
            const hoisted = this.hoistedIndexReads = [];
            const statement = [];
            this.astGeneric(ast, statement);
            this.hoistedIndexReads = previousHoist;
            retArr.push(...hoisted, ...statement);
            return retArr;
          }

         default:
          return this.astGeneric(ast, retArr);
        }
      }
      astVariableDeclaration(varDecNode, retArr) {
        const declarations = varDecNode.declarations;
        if (!declarations || !declarations[0] || !declarations[0].init) throw this.astErrorOutput("Unexpected expression", varDecNode);
        const result = [];
        let lastType = null;
        const declarationSets = [];
        let declarationSet = [];
        for (let i = 0; i < declarations.length; i++) {
          const declaration = declarations[i];
          const init = declaration.init;
          const info = this.getDeclaration(declaration.id);
          const actualType = this.getType(declaration.init);
          let type = actualType;
          if (type === "LiteralInteger") if (info.suggestedType === "Integer") type = "Integer"; else type = "Number";
          const markupType = typeMap[type];
          if (!markupType) throw this.astErrorOutput(`Markup type ${type} not handled`, varDecNode);
          const declarationResult = [];
          if (actualType === "Integer" && type === "Integer") {
            info.valueType = "Number";
            if (i === 0 || lastType === null) declarationResult.push("float "); else if (type !== lastType) throw new Error("Unhandled declaration");
            lastType = type;
            declarationResult.push(`user_${utils.sanitizeName(declaration.id.name)}=`);
            declarationResult.push("float(");
            this.astGeneric(init, declarationResult);
            declarationResult.push(")");
          } else {
            info.valueType = type;
            if (i === 0 || lastType === null) declarationResult.push(`${markupType} `); else if (type !== lastType) {
              declarationSets.push(declarationSet.join(","));
              declarationSet = [];
              declarationResult.push(`${markupType} `);
            }
            lastType = type;
            declarationResult.push(`user_${utils.sanitizeName(declaration.id.name)}=`);
            if (actualType === "Number" && type === "Integer") if (init.left && init.left.type === "Literal") this.astGeneric(init, declarationResult); else {
              declarationResult.push("int(");
              this.astGeneric(init, declarationResult);
              declarationResult.push(")");
            } else if (actualType === "LiteralInteger" && type === "Integer") this.castLiteralToInteger(init, declarationResult); else this.astGeneric(init, declarationResult);
          }
          declarationSet.push(declarationResult.join(""));
        }
        if (declarationSet.length > 0) declarationSets.push(declarationSet.join(","));
        result.push(declarationSets.join(";"));
        retArr.push(result.join(""));
        retArr.push(";");
        return retArr;
      }
      astIfStatement(ifNode, retArr) {
        retArr.push("if (");
        this.astGeneric(ifNode.test, retArr);
        retArr.push(")");
        if (ifNode.consequent.type === "BlockStatement") this.astGeneric(ifNode.consequent, retArr); else {
          retArr.push(" {\n");
          this.astGeneric(ifNode.consequent, retArr);
          retArr.push("\n}\n");
        }
        if (ifNode.alternate) {
          retArr.push("else ");
          if (ifNode.alternate.type === "BlockStatement" || ifNode.alternate.type === "IfStatement") this.astGeneric(ifNode.alternate, retArr); else {
            retArr.push(" {\n");
            this.astGeneric(ifNode.alternate, retArr);
            retArr.push("\n}\n");
          }
        }
        return retArr;
      }
      astSwitchCaseConsequent(consequent, retArr) {
        const statements = [];
        for (let i = 0; i < consequent.length; i++) {
          if (consequent[i].type === "BreakStatement") break;
          statements.push(consequent[i]);
        }
        for (let i = 0; i < statements.length; i++) {
          const containsBreak = node => {
            if (!node || typeof node !== "object") return false;
            if (Array.isArray(node)) return node.some(containsBreak);
            if (node.type === "BreakStatement") return true;
            if (node.type === "ForStatement" || node.type === "WhileStatement" || node.type === "DoWhileStatement" || node.type === "SwitchStatement") return false;
            for (const key in node) {
              if (key === "loc" || key === "range" || key === "parent") continue;
              if (containsBreak(node[key])) return true;
            }
            return false;
          };
          if (containsBreak(statements[i])) throw this.astErrorOutput("break inside a switch case is only supported as the case terminator", statements[i]);
        }
        for (let i = 0; i < statements.length; i++) {
          this.astStatementWithHoisting(statements[i], retArr);
          retArr.push("\n");
        }
        return retArr;
      }
      astSwitchStatement(ast, retArr) {
        if (ast.type !== "SwitchStatement") throw this.astErrorOutput("Invalid switch statement", ast);
        const {discriminant: discriminant, cases: cases} = ast;
        const type = this.getType(discriminant);
        const varName = `switchDiscriminant${this.astKey(ast, "_")}`;
        switch (type) {
         case "Float":
         case "Number":
          retArr.push(`float ${varName} = `);
          this.astGeneric(discriminant, retArr);
          retArr.push(";\n");
          break;

         case "Integer":
          retArr.push(`int ${varName} = `);
          this.astGeneric(discriminant, retArr);
          retArr.push(";\n");
          break;
        }
        if (cases.length === 1 && !cases[0].test) {
          this.astSwitchCaseConsequent(cases[0].consequent, retArr);
          return retArr;
        }
        let fallingThrough = false;
        let defaultResult = [];
        let movingDefaultToEnd = false;
        let pastFirstIf = false;
        for (let i = 0; i < cases.length; i++) {
          if (!cases[i].test) if (cases.length > i + 1) {
            movingDefaultToEnd = true;
            this.astSwitchCaseConsequent(cases[i].consequent, defaultResult);
            continue;
          } else retArr.push(" else {\n"); else {
            if (i === 0 || !pastFirstIf) {
              pastFirstIf = true;
              retArr.push(`if (${varName} == `);
            } else if (fallingThrough) {
              retArr.push(`${varName} == `);
              fallingThrough = false;
            } else retArr.push(` else if (${varName} == `);
            if (type === "Integer") switch (this.getType(cases[i].test)) {
             case "Number":
             case "Float":
              this.castValueToInteger(cases[i].test, retArr);
              break;

             case "LiteralInteger":
              this.castLiteralToInteger(cases[i].test, retArr);
              break;
            } else if (type === "Float" || type === "Number") switch (this.getType(cases[i].test)) {
             case "LiteralInteger":
              this.castLiteralToFloat(cases[i].test, retArr);
              break;

             case "Integer":
              this.castValueToFloat(cases[i].test, retArr);
              break;
            } else throw this.astErrorOutput(`Unhandled switch discriminant type "${type}"`, ast);
            if (!cases[i].consequent || cases[i].consequent.length === 0) {
              fallingThrough = true;
              retArr.push(" || ");
              continue;
            }
            retArr.push(`) {\n`);
          }
          this.astSwitchCaseConsequent(cases[i].consequent, retArr);
          retArr.push("\n}");
        }
        if (movingDefaultToEnd) {
          retArr.push(" else {");
          retArr.push(defaultResult.join(""));
          retArr.push("}");
        }
        return retArr;
      }
      astThisExpression(tNode, retArr) {
        retArr.push("this");
        return retArr;
      }
      astMemberExpression(mNode, retArr) {
        const {property: property, name: name, signature: signature, origin: origin, type: type, xProperty: xProperty, yProperty: yProperty, zProperty: zProperty} = this.getMemberExpressionDetails(mNode);
        switch (signature) {
         case "value.thread.value":
         case "this.thread.value":
          if (name !== "x" && name !== "y" && name !== "z") throw this.astErrorOutput("Unexpected expression, expected `this.thread.x`, `this.thread.y`, or `this.thread.z`", mNode);
          retArr.push(`threadId.${name}`);
          return retArr;

         case "this.output.value":
          if (this.dynamicOutput) switch (name) {
           case "x":
            if (this.isState("casting-to-float")) retArr.push("float(uOutputDim.x)"); else retArr.push("uOutputDim.x");
            break;

           case "y":
            if (this.isState("casting-to-float")) retArr.push("float(uOutputDim.y)"); else retArr.push("uOutputDim.y");
            break;

           case "z":
            if (this.isState("casting-to-float")) retArr.push("float(uOutputDim.z)"); else retArr.push("uOutputDim.z");
            break;

           default:
            throw this.astErrorOutput("Unexpected expression", mNode);
          } else switch (name) {
           case "x":
            if (this.isState("casting-to-integer")) retArr.push(this.output[0]); else retArr.push(this.output[0], ".0");
            break;

           case "y":
            if (this.isState("casting-to-integer")) retArr.push(this.output[1]); else retArr.push(this.output[1], ".0");
            break;

           case "z":
            if (this.isState("casting-to-integer")) retArr.push(this.output[2]); else retArr.push(this.output[2], ".0");
            break;

           default:
            throw this.astErrorOutput("Unexpected expression", mNode);
          }
          return retArr;

         case "value":
          throw this.astErrorOutput("Unexpected expression", mNode);

         case "value[]":
         case "value[][]":
         case "value[][][]":
         case "value[][][][]":
         case "value.value":
          if (origin === "Math") {
            retArr.push(Math[name]);
            return retArr;
          }
          const cleanName = utils.sanitizeName(name);
          switch (property) {
           case "r":
            retArr.push(`user_${cleanName}.r`);
            return retArr;

           case "g":
            retArr.push(`user_${cleanName}.g`);
            return retArr;

           case "b":
            retArr.push(`user_${cleanName}.b`);
            return retArr;

           case "a":
            retArr.push(`user_${cleanName}.a`);
            return retArr;
          }
          break;

         case "this.constants.value":
          if (typeof xProperty === "undefined") switch (type) {
           case "Array(2)":
           case "Array(3)":
           case "Array(4)":
            retArr.push(`constants_${utils.sanitizeName(name)}`);
            return retArr;
          }

         case "this.constants.value[]":
         case "this.constants.value[][]":
         case "this.constants.value[][][]":
         case "this.constants.value[][][][]":
          break;

         case "fn()[]":
          this.astCallExpression(mNode.object, retArr);
          retArr.push("[");
          retArr.push(this.memberExpressionPropertyMarkup(property));
          retArr.push("]");
          return retArr;

         case "fn()[][]":
          {
            const yProperty = mNode.object.property;
            const xProperty = mNode.property;
            const matrixSize = matrixSizes[this.getType(mNode.object.object)];
            const isConstantIndex = property => this.getType(property) === "LiteralInteger";
            if (matrixSize && !(isConstantIndex(yProperty) && isConstantIndex(xProperty))) {
              retArr.push(`getMatrix${matrixSize}(`);
              this.astCallExpression(mNode.object.object, retArr);
              retArr.push(", ");
              retArr.push(this.memberExpressionPropertyMarkup(yProperty));
              retArr.push(", ");
              retArr.push(this.memberExpressionPropertyMarkup(xProperty));
              retArr.push(")");
              return retArr;
            }
            this.astCallExpression(mNode.object.object, retArr);
            retArr.push("[");
            retArr.push(this.memberExpressionPropertyMarkup(yProperty));
            retArr.push("]");
            retArr.push("[");
            retArr.push(this.memberExpressionPropertyMarkup(xProperty));
            retArr.push("]");
            return retArr;
          }

         case "[][]":
          this.astArrayExpression(mNode.object, retArr);
          retArr.push("[");
          retArr.push(this.memberExpressionPropertyMarkup(property));
          retArr.push("]");
          return retArr;

         default:
          throw this.astErrorOutput("Unexpected expression", mNode);
        }
        if (mNode.computed === false) switch (type) {
         case "Number":
         case "Integer":
         case "Float":
         case "Boolean":
          retArr.push(`${origin}_${utils.sanitizeName(name)}`);
          return retArr;
        }
        const markupName = `${origin}_${utils.sanitizeName(name)}`;
        switch (type) {
         case "Array(2)":
         case "Array(3)":
         case "Array(4)":
          this.astGeneric(mNode.object, retArr);
          retArr.push("[");
          retArr.push(this.memberExpressionPropertyMarkup(xProperty));
          retArr.push("]");
          break;

         case "HTMLImageArray":
          retArr.push(`getImage3D(${markupName}, ${markupName}Size, ${markupName}Dim, `);
          this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
          retArr.push(")");
          break;

         case "ArrayTexture(1)":
          retArr.push(`getFloatFromSampler2D(${markupName}, ${markupName}Size, ${markupName}Dim, `);
          this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
          retArr.push(")");
          break;

         case "Array1D(2)":
         case "Array2D(2)":
         case "Array3D(2)":
          retArr.push(`getMemoryOptimizedVec2(${markupName}, ${markupName}Size, ${markupName}Dim, `);
          this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
          retArr.push(")");
          break;

         case "ArrayTexture(2)":
          retArr.push(`getVec2FromSampler2D(${markupName}, ${markupName}Size, ${markupName}Dim, `);
          this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
          retArr.push(")");
          break;

         case "Array1D(3)":
         case "Array2D(3)":
         case "Array3D(3)":
          retArr.push(`getMemoryOptimizedVec3(${markupName}, ${markupName}Size, ${markupName}Dim, `);
          this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
          retArr.push(")");
          break;

         case "ArrayTexture(3)":
          retArr.push(`getVec3FromSampler2D(${markupName}, ${markupName}Size, ${markupName}Dim, `);
          this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
          retArr.push(")");
          break;

         case "Array1D(4)":
         case "Array2D(4)":
         case "Array3D(4)":
          retArr.push(`getMemoryOptimizedVec4(${markupName}, ${markupName}Size, ${markupName}Dim, `);
          this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
          retArr.push(")");
          break;

         case "ArrayTexture(4)":
         case "HTMLCanvas":
         case "OffscreenCanvas":
         case "HTMLImage":
         case "ImageBitmap":
         case "ImageData":
         case "HTMLVideo":
          retArr.push(`getVec4FromSampler2D(${markupName}, ${markupName}Size, ${markupName}Dim, `);
          this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
          retArr.push(")");
          break;

         case "NumberTexture":
         case "Array":
         case "Array2D":
         case "Array3D":
         case "Array4D":
         case "Input":
         case "Number":
         case "Float":
         case "Integer":
          if (this.precision === "single") {
            retArr.push(`getMemoryOptimized32(${markupName}, ${markupName}Size, ${markupName}Dim, `);
            this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
            retArr.push(")");
          } else {
            const bitRatio = origin === "user" ? this.lookupFunctionArgumentBitRatio(this.name, name) : this.constantBitRatios[name];
            switch (bitRatio) {
             case 1:
              retArr.push(`get8(${markupName}, ${markupName}Size, ${markupName}Dim, `);
              break;

             case 2:
              retArr.push(`get16(${markupName}, ${markupName}Size, ${markupName}Dim, `);
              break;

             case 4:
             case 0:
              retArr.push(`get32(${markupName}, ${markupName}Size, ${markupName}Dim, `);
              break;

             default:
              throw new Error(`unhandled bit ratio of ${bitRatio}`);
            }
            this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
            retArr.push(")");
          }
          break;

         case "MemoryOptimizedNumberTexture":
          retArr.push(`getMemoryOptimized32(${markupName}, ${markupName}Size, ${markupName}Dim, `);
          this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
          retArr.push(")");
          break;

         case "Matrix(2)":
         case "Matrix(3)":
         case "Matrix(4)":
          retArr.push(`${markupName}[${this.memberExpressionPropertyMarkup(yProperty)}]`);
          if (yProperty) retArr.push(`[${this.memberExpressionPropertyMarkup(xProperty)}]`);
          break;

         default:
          throw new Error(`unhandled member expression "${type}"`);
        }
        return retArr;
      }
      astCallExpression(ast, retArr) {
        if (!ast.callee) throw this.astErrorOutput("Unknown CallExpression", ast);
        let functionName = null;
        const isMathFunction = this.isAstMathFunction(ast);
        if (isMathFunction || ast.callee.object && ast.callee.object.type === "ThisExpression") functionName = ast.callee.property.name; else if (ast.callee.type === "SequenceExpression" && ast.callee.expressions[0].type === "Literal" && !isNaN(ast.callee.expressions[0].raw)) functionName = ast.callee.expressions[1].property.name; else functionName = ast.callee.name;
        if (!functionName) throw this.astErrorOutput(`Unhandled function, couldn't find name`, ast);
        switch (functionName) {
         case "pow":
          functionName = "_pow";
          break;

         case "round":
          functionName = "_round";
          break;
        }
        if (this.calledFunctions.indexOf(functionName) < 0) this.calledFunctions.push(functionName);
        if (functionName === "random" && this.plugins && this.plugins.length > 0) for (let i = 0; i < this.plugins.length; i++) {
          const plugin = this.plugins[i];
          if (plugin.functionMatch === "Math.random()" && plugin.functionReplace) {
            retArr.push(plugin.functionReplace);
            return retArr;
          }
        }
        if (this.onFunctionCall) this.onFunctionCall(this.name, functionName, ast.arguments);
        retArr.push(functionName);
        retArr.push("(");
        if (isMathFunction) for (let i = 0; i < ast.arguments.length; ++i) {
          const argument = ast.arguments[i];
          const argumentType = this.getType(argument);
          if (i > 0) retArr.push(", ");
          switch (argumentType) {
           case "Integer":
            this.castValueToFloat(argument, retArr);
            break;

           default:
            this.astGeneric(argument, retArr);
            break;
          }
        } else {
          const targetTypes = this.lookupFunctionArgumentTypes(functionName) || [];
          for (let i = 0; i < ast.arguments.length; ++i) {
            const argument = ast.arguments[i];
            let targetType = targetTypes[i];
            if (i > 0) retArr.push(", ");
            const argumentType = this.getType(argument);
            if (!targetType) {
              this.triggerImplyArgumentType(functionName, i, argumentType, this);
              targetType = argumentType;
            }
            switch (argumentType) {
             case "Boolean":
              this.astGeneric(argument, retArr);
              continue;

             case "Number":
             case "Float":
              if (targetType === "Integer") {
                retArr.push("int(");
                this.astGeneric(argument, retArr);
                retArr.push(")");
                continue;
              } else if (targetType === "Number" || targetType === "Float") {
                this.astGeneric(argument, retArr);
                continue;
              } else if (targetType === "LiteralInteger") {
                this.castLiteralToFloat(argument, retArr);
                continue;
              }
              break;

             case "Integer":
              if (targetType === "Number" || targetType === "Float") {
                retArr.push("float(");
                this.astGeneric(argument, retArr);
                retArr.push(")");
                continue;
              } else if (targetType === "Integer") {
                this.astGeneric(argument, retArr);
                continue;
              }
              break;

             case "LiteralInteger":
              if (targetType === "Integer") {
                this.castLiteralToInteger(argument, retArr);
                continue;
              } else if (targetType === "Number" || targetType === "Float") {
                this.castLiteralToFloat(argument, retArr);
                continue;
              } else if (targetType === "LiteralInteger") {
                this.astGeneric(argument, retArr);
                continue;
              }
              break;

             case "Array(2)":
             case "Array(3)":
             case "Array(4)":
              if (targetType === argumentType) {
                if (argument.type === "Identifier") retArr.push(`user_${utils.sanitizeName(argument.name)}`); else if (argument.type === "ArrayExpression" || argument.type === "MemberExpression" || argument.type === "CallExpression") this.astGeneric(argument, retArr); else throw this.astErrorOutput(`Unhandled argument type ${argument.type}`, ast);
                continue;
              }
              break;

             case "HTMLCanvas":
             case "OffscreenCanvas":
             case "HTMLImage":
             case "ImageBitmap":
             case "ImageData":
             case "HTMLImageArray":
             case "HTMLVideo":
             case "ArrayTexture(1)":
             case "ArrayTexture(2)":
             case "ArrayTexture(3)":
             case "ArrayTexture(4)":
             case "Array":
             case "Input":
              if (targetType === argumentType) {
                if (argument.type !== "Identifier") throw this.astErrorOutput(`Unhandled argument type ${argument.type}`, ast);
                this.triggerImplyArgumentBitRatio(this.name, argument.name, functionName, i);
                const name = utils.sanitizeName(argument.name);
                retArr.push(`user_${name},user_${name}Size,user_${name}Dim`);
                continue;
              }
              break;
            }
            throw this.astErrorOutput(`Unhandled argument combination of ${argumentType} and ${targetType} for argument named "${argument.name}"`, ast);
          }
        }
        retArr.push(")");
        return retArr;
      }
      astArrayExpression(arrNode, retArr) {
        const returnType = this.getType(arrNode);
        const arrLen = arrNode.elements.length;
        switch (returnType) {
         case "Matrix(2)":
         case "Matrix(3)":
         case "Matrix(4)":
          retArr.push(`mat${arrLen}(`);
          break;

         default:
          retArr.push(`vec${arrLen}(`);
        }
        for (let i = 0; i < arrLen; ++i) {
          if (i > 0) retArr.push(", ");
          const subNode = arrNode.elements[i];
          this.astGeneric(subNode, retArr);
        }
        retArr.push(")");
        return retArr;
      }
      memberExpressionXYZ(x, y, z, retArr) {
        if (z) retArr.push(this.memberExpressionPropertyMarkup(z), ", "); else retArr.push("0, ");
        if (y) retArr.push(this.memberExpressionPropertyMarkup(y), ", "); else retArr.push("0, ");
        retArr.push(this.memberExpressionPropertyMarkup(x));
        return retArr;
      }
      memberExpressionPropertyMarkup(property) {
        if (!property) throw new Error("Property not set");
        const type = this.getType(property);
        const result = [];
        switch (type) {
         case "Number":
         case "Float":
          this.castValueToInteger(property, result);
          break;

         case "LiteralInteger":
          this.castLiteralToInteger(property, result);
          break;

         default:
          this.astGeneric(property, result);
        }
        const markup = result.join("");
        if (this.hoistedIndexReads && /\b\w+\((user_|constants_)\w+, \1\w+Size/.test(markup)) {
          const name = `hoisted_${this.hoistedIndexReads.length}_${utils.sanitizeName(this.name)}`;
          const isInt = markup.startsWith("int(");
          this.hoistedIndexReads.push(`${isInt ? "int" : "float"} ${name}=${markup};\n`);
          return name;
        }
        return markup;
      }
    };
    function nodeIsSideEffectFree(node) {
      if (!node || typeof node !== "object") return true;
      if (Array.isArray(node)) return node.every(nodeIsSideEffectFree);
      if (node.type === "UpdateExpression" || node.type === "AssignmentExpression" || node.type === "SequenceExpression") return false;
      for (const key in node) {
        if (key === "loc" || key === "range" || key === "parent") continue;
        if (!nodeIsSideEffectFree(node[key])) return false;
      }
      return true;
    }
    function statementContainsNestedIndexRead(statement) {
      let found = false;
      function containsComputedRead(node) {
        if (!node || typeof node !== "object" || found) return false;
        if (Array.isArray(node)) return node.some(containsComputedRead);
        if (node.type === "MemberExpression" && node.computed) return true;
        for (const key in node) {
          if (key === "loc" || key === "range" || key === "parent") continue;
          if (containsComputedRead(node[key])) return true;
        }
        return false;
      }
      function walk(node) {
        if (!node || typeof node !== "object" || found) return;
        if (Array.isArray(node)) {
          node.forEach(walk);
          return;
        }
        if (node.type === "MemberExpression" && node.computed && containsComputedRead(node.property)) {
          found = true;
          return;
        }
        for (const key in node) {
          if (key === "loc" || key === "range" || key === "parent") continue;
          walk(node[key]);
        }
      }
      walk(statement);
      return found;
    }
    function containsCallTo(node, name) {
      if (!node || typeof node !== "object") return false;
      if (Array.isArray(node)) return node.some(child => containsCallTo(child, name));
      if (node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === name) return true;
      for (const key in node) {
        if (key === "loc" || key === "range" || key === "parent") continue;
        if (containsCallTo(node[key], name)) return true;
      }
      return false;
    }
    function containsNestedSameFunctionCall(statement) {
      let found = false;
      function walk(node) {
        if (!node || typeof node !== "object" || found) return;
        if (Array.isArray(node)) {
          node.forEach(walk);
          return;
        }
        if (node.type === "CallExpression" && node.callee.type === "Identifier") {
          if (node.arguments.some(argument => containsCallTo(argument, node.callee.name))) {
            found = true;
            return;
          }
        }
        for (const key in node) {
          if (key === "loc" || key === "range" || key === "parent") continue;
          walk(node[key]);
        }
      }
      walk(statement);
      return found;
    }
    function statementIsSideEffectFreeBesidesTopLevelAssignment(statement) {
      const topLevelAssignment = statement.type === "ExpressionStatement" && statement.expression.type === "AssignmentExpression" ? statement.expression : null;
      function walk(node) {
        if (!node || typeof node !== "object") return true;
        if (Array.isArray(node)) return node.every(walk);
        if (typeof node.type === "string") {
          if (node.type === "UpdateExpression" || node.type === "SequenceExpression") return false;
          if (node.type === "AssignmentExpression" && node !== topLevelAssignment) return false;
        }
        for (const key in node) {
          if (key === "loc" || key === "range" || key === "parent") continue;
          if (!walk(node[key])) return false;
        }
        return true;
      }
      return walk(statement);
    }
    const matrixSizes = {
      "Matrix(2)": 2,
      "Matrix(3)": 3,
      "Matrix(4)": 4
    };
    const typeMap = {
      Array: "sampler2D",
      "Array(2)": "vec2",
      "Array(3)": "vec3",
      "Array(4)": "vec4",
      "Matrix(2)": "mat2",
      "Matrix(3)": "mat3",
      "Matrix(4)": "mat4",
      Array2D: "sampler2D",
      Array3D: "sampler2D",
      Boolean: "bool",
      Float: "float",
      Input: "sampler2D",
      Integer: "int",
      Number: "float",
      LiteralInteger: "float",
      NumberTexture: "sampler2D",
      MemoryOptimizedNumberTexture: "sampler2D",
      "ArrayTexture(1)": "sampler2D",
      "ArrayTexture(2)": "sampler2D",
      "ArrayTexture(3)": "sampler2D",
      "ArrayTexture(4)": "sampler2D",
      HTMLVideo: "sampler2D",
      HTMLCanvas: "sampler2D",
      OffscreenCanvas: "sampler2D",
      HTMLImage: "sampler2D",
      ImageBitmap: "sampler2D",
      ImageData: "sampler2D",
      HTMLImageArray: "sampler2DArray"
    };
    const operatorMap = {
      "===": "==",
      "!==": "!="
    };
    module.exports = {
      WebGLFunctionNode: WebGLFunctionNode
    };
  });
  var require_math_random_uniformly_distributed = __commonJSMin((exports, module) => {
    const source = `// https://www.shadertoy.com/view/4t2SDh\n//note: uniformly distributed, normalized rand, [0,1]\nhighp float randomSeedShift = 1.0;\nhighp float slide = 1.0;\nuniform highp float randomSeed1;\nuniform highp float randomSeed2;\n\nhighp float nrand(highp vec2 n) {\n  highp float result = fract(sin(dot((n.xy + 1.0) * vec2(randomSeed1 * slide, randomSeed2 * randomSeedShift), vec2(12.9898, 78.233))) * 43758.5453);\n  randomSeedShift = result;\n  if (randomSeedShift > 0.5) {\n    slide += 0.00009; \n  } else {\n    slide += 0.0009;\n  }\n  return result;\n}`;
    const name = "math-random-uniformly-distributed";
    const functionMatch = `Math.random()`;
    const functionReplace = `nrand(vTexCoord)`;
    const functionReturnType = "Number";
    function mulberry32(seed) {
      let a = seed >>> 0;
      return function() {
        a = a + 1831565813 >>> 0;
        let t = a;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    const onBeforeRun = kernel => {
      if (kernel.randomSeed === null || kernel.randomSeed === void 0) {
        kernel.setUniform1f("randomSeed1", Math.random());
        kernel.setUniform1f("randomSeed2", Math.random());
        return;
      }
      if (!kernel._mathRandomGenerator || kernel._mathRandomGeneratorSeed !== kernel.randomSeed) {
        kernel._mathRandomGenerator = mulberry32(kernel.randomSeed);
        kernel._mathRandomGeneratorSeed = kernel.randomSeed;
      }
      kernel.setUniform1f("randomSeed1", kernel._mathRandomGenerator());
      kernel.setUniform1f("randomSeed2", kernel._mathRandomGenerator());
    };
    module.exports = {
      name: name,
      onBeforeRun: onBeforeRun,
      functionMatch: functionMatch,
      functionReplace: functionReplace,
      functionReturnType: functionReturnType,
      source: source
    };
  });
  var require_fragment_shader$1 = __commonJSMin((exports, module) => {
    module.exports = {
      fragmentShader: `__HEADER__;\n__FLOAT_TACTIC_DECLARATION__;\n__INT_TACTIC_DECLARATION__;\n__SAMPLER_2D_TACTIC_DECLARATION__;\n\nconst int LOOP_MAX = __LOOP_MAX__;\n\n__PLUGINS__;\n__CONSTANTS__;\n\nvarying vec2 vTexCoord;\n\nfloat acosh(float x) {\n  return log(x + sqrt(x * x - 1.0));\n}\n\nfloat sinh(float x) {\n  return (pow(${Math.E}, x) - pow(${Math.E}, -x)) / 2.0;\n}\n\nfloat asinh(float x) {\n  return log(x + sqrt(x * x + 1.0));\n}\n\nfloat atan2(float v1, float v2) {\n  if (v2 == 0.0) {\n    if (v1 == 0.0) return 0.0;\n    if (v1 > 0.0) return 1.5707963267948966;\n    if (v1 < 0.0) return -1.5707963267948966;\n  }\n  return atan(v1, v2);\n}\n\nfloat atanh(float x) {\n  x = (x + 1.0) / (x - 1.0);\n  if (x < 0.0) {\n    return 0.5 * log(-x);\n  }\n  return 0.5 * log(x);\n}\n\nfloat cbrt(float x) {\n  if (x >= 0.0) {\n    return pow(x, 1.0 / 3.0);\n  } else {\n    return -pow(x, 1.0 / 3.0);\n  }\n}\n\nfloat cosh(float x) {\n  return (pow(${Math.E}, x) + pow(${Math.E}, -x)) / 2.0; \n}\n\nfloat expm1(float x) {\n  return pow(${Math.E}, x) - 1.0; \n}\n\nfloat fround(highp float x) {\n  return x;\n}\n\nfloat imul(float v1, float v2) {\n  return float(int(v1) * int(v2));\n}\n\nfloat log10(float x) {\n  return log2(x) * (1.0 / log2(10.0));\n}\n\nfloat log1p(float x) {\n  return log(1.0 + x);\n}\n\nfloat _pow(float v1, float v2) {\n  if (v2 == 0.0) return 1.0;\n  return pow(v1, v2);\n}\n\nfloat tanh(float x) {\n  float e = exp(2.0 * x);\n  return (e - 1.0) / (e + 1.0);\n}\n\nfloat trunc(float x) {\n  if (x >= 0.0) {\n    return floor(x); \n  } else {\n    return ceil(x);\n  }\n}\n\nvec4 _round(vec4 x) {\n  return floor(x + 0.5);\n}\n\nfloat _round(float x) {\n  return floor(x + 0.5);\n}\n\nconst int BIT_COUNT = 32;\nint modi(int x, int y) {\n  return x - y * (x / y);\n}\n\nint bitwiseOr(int a, int b) {\n  int result = 0;\n  int n = 1;\n  \n  for (int i = 0; i < BIT_COUNT; i++) {\n    if ((modi(a, 2) == 1) || (modi(b, 2) == 1)) {\n      result += n;\n    }\n    a = a / 2;\n    b = b / 2;\n    n = n * 2;\n    if(!(a > 0 || b > 0)) {\n      break;\n    }\n  }\n  return result;\n}\nint bitwiseXOR(int a, int b) {\n  int result = 0;\n  int n = 1;\n  \n  for (int i = 0; i < BIT_COUNT; i++) {\n    if ((modi(a, 2) == 1) != (modi(b, 2) == 1)) {\n      result += n;\n    }\n    a = a / 2;\n    b = b / 2;\n    n = n * 2;\n    if(!(a > 0 || b > 0)) {\n      break;\n    }\n  }\n  return result;\n}\nint bitwiseAnd(int a, int b) {\n  int result = 0;\n  int n = 1;\n  for (int i = 0; i < BIT_COUNT; i++) {\n    if ((modi(a, 2) == 1) && (modi(b, 2) == 1)) {\n      result += n;\n    }\n    a = a / 2;\n    b = b / 2;\n    n = n * 2;\n    if(!(a > 0 && b > 0)) {\n      break;\n    }\n  }\n  return result;\n}\nint bitwiseNot(int a) {\n  // ~a is identically -a - 1 in two's complement, for every value including\n  // negatives. The previous bit-by-bit loop only worked for a >= 0, where it\n  // leaned on 32-bit overflow wrapping to reach the negative answer; given a\n  // negative input it computed ~abs(a), so ~(-1) gave -2 and ~~x never\n  // returned x.\n  return -a - 1;\n}\nint bitwiseZeroFillLeftShift(int n, int shift) {\n  int maxBytes = BIT_COUNT;\n  for (int i = 0; i < BIT_COUNT; i++) {\n    if (maxBytes >= n) {\n      break;\n    }\n    maxBytes *= 2;\n  }\n  for (int i = 0; i < BIT_COUNT; i++) {\n    if (i >= shift) {\n      break;\n    }\n    n *= 2;\n  }\n\n  int result = 0;\n  int byteVal = 1;\n  for (int i = 0; i < BIT_COUNT; i++) {\n    if (i >= maxBytes) break;\n    if (modi(n, 2) > 0) { result += byteVal; }\n    n = int(n / 2);\n    byteVal *= 2;\n  }\n  return result;\n}\n\n// _pow2 is defined further down, alongside encode32/decode32\nfloat _pow2(float e);\nint bitwiseSignedRightShift(int num, int shifts) {\n  // pow(2.0, n) is approximate on many GPUs, and landing 1 ulp high makes the\n  // division fall just under a whole number, which floor() then rounds away:\n  // 2 >> 1 came out 0, 8 >> 1 came out 3. Only exact left operands were\n  // affected, odd ones having enough slack to survive. _pow2 is exact.\n  return int(floor(float(num) / _pow2(float(shifts))));\n}\n\nint bitwiseZeroFillRightShift(int n, int shift) {\n  int maxBytes = BIT_COUNT;\n  for (int i = 0; i < BIT_COUNT; i++) {\n    if (maxBytes >= n) {\n      break;\n    }\n    maxBytes *= 2;\n  }\n  for (int i = 0; i < BIT_COUNT; i++) {\n    if (i >= shift) {\n      break;\n    }\n    n /= 2;\n  }\n  int result = 0;\n  int byteVal = 1;\n  for (int i = 0; i < BIT_COUNT; i++) {\n    if (i >= maxBytes) break;\n    if (modi(n, 2) > 0) { result += byteVal; }\n    n = int(n / 2);\n    byteVal *= 2;\n  }\n  return result;\n}\n\nvec2 integerMod(vec2 x, float y) {\n  vec2 res = floor(mod(x, y));\n  return res * step(1.0 - floor(y), -res);\n}\n\nvec3 integerMod(vec3 x, float y) {\n  vec3 res = floor(mod(x, y));\n  return res * step(1.0 - floor(y), -res);\n}\n\nvec4 integerMod(vec4 x, vec4 y) {\n  vec4 res = floor(mod(x, y));\n  return res * step(1.0 - floor(y), -res);\n}\n\nfloat integerMod(float x, float y) {\n  float res = floor(mod(x, y));\n  return res * (res > floor(y) - 1.0 ? 0.0 : 1.0);\n}\n\nint integerMod(int x, int y) {\n  return x - (y * int(x / y));\n}\n\n// GLSL ES 1.00 accepts only a constant or a loop symbol inside an index\n// expression, so m[y][x] does not compile when y and x come from kernel\n// arguments -- the error is "Index expression can only contain const or loop\n// symbols". Loop counters are legal indices, so walk the matrix with them\n// instead. These are 2x2 to 4x4, so it costs at most sixteen comparisons.\nfloat getMatrix2(mat2 m, int y, int x) {\n  float result = 0.0;\n  for (int i = 0; i < 2; i++) {\n    for (int j = 0; j < 2; j++) {\n      if (i == y && j == x) result = m[i][j];\n    }\n  }\n  return result;\n}\n\nfloat getMatrix3(mat3 m, int y, int x) {\n  float result = 0.0;\n  for (int i = 0; i < 3; i++) {\n    for (int j = 0; j < 3; j++) {\n      if (i == y && j == x) result = m[i][j];\n    }\n  }\n  return result;\n}\n\nfloat getMatrix4(mat4 m, int y, int x) {\n  float result = 0.0;\n  for (int i = 0; i < 4; i++) {\n    for (int j = 0; j < 4; j++) {\n      if (i == y && j == x) result = m[i][j];\n    }\n  }\n  return result;\n}\n\n__DIVIDE_WITH_INTEGER_CHECK__;\n\n// Here be dragons!\n// DO NOT OPTIMIZE THIS CODE\n// YOU WILL BREAK SOMETHING ON SOMEBODY'S MACHINE\n// LEAVE IT AS IT IS, LEST YOU WASTE YOUR OWN TIME\n// Exact powers of two built from exact constant multiplies: exp2/log2/pow\n// are approximate on some GPUs (notably Apple silicon), and 1-2 ulp there\n// corrupts the packed bytes (#659)\nfloat _pow2(float e) {\n  float r = 1.0;\n  float a = abs(e);\n  bool n = e < 0.0;\n  if (a >= 64.0) { r *= n ? 5.421010862427522e-20 : 18446744073709551616.0; a -= 64.0; }\n  if (a >= 64.0) { r *= n ? 5.421010862427522e-20 : 18446744073709551616.0; a -= 64.0; }\n  if (a >= 32.0) { r *= n ? 2.3283064365386963e-10 : 4294967296.0; a -= 32.0; }\n  if (a >= 16.0) { r *= n ? 0.0000152587890625 : 65536.0; a -= 16.0; }\n  if (a >= 8.0) { r *= n ? 0.00390625 : 256.0; a -= 8.0; }\n  if (a >= 4.0) { r *= n ? 0.0625 : 16.0; a -= 4.0; }\n  if (a >= 2.0) { r *= n ? 0.25 : 4.0; a -= 2.0; }\n  if (a >= 1.0) { r *= n ? 0.5 : 2.0; }\n  return r;\n}\nconst vec2 MAGIC_VEC = vec2(1.0, -256.0);\nconst vec4 SCALE_FACTOR = vec4(1.0, 256.0, 65536.0, 0.0);\nconst vec4 SCALE_FACTOR_INV = vec4(1.0, 0.00390625, 0.0000152587890625, 0.0); // 1, 1/256, 1/65536\nfloat decode32(vec4 texel) {\n  __DECODE32_ENDIANNESS__;\n  texel *= 255.0;\n  vec2 gte128;\n  gte128.x = texel.b >= 128.0 ? 1.0 : 0.0;\n  gte128.y = texel.a >= 128.0 ? 1.0 : 0.0;\n  float exponent = 2.0 * texel.a - 127.0 + dot(gte128, MAGIC_VEC);\n  float res = _pow2(_round(exponent));\n  texel.b = texel.b - 128.0 * gte128.x;\n  res = dot(texel, SCALE_FACTOR) * _pow2(_round(exponent-23.0)) + res;\n  res *= gte128.y * -2.0 + 1.0;\n  return res;\n}\n\nfloat decode16(vec4 texel, int index) {\n  int channel = integerMod(index, 2);\n  if (channel == 0) return texel.r * 255.0 + texel.g * 65280.0;\n  if (channel == 1) return texel.b * 255.0 + texel.a * 65280.0;\n  return 0.0;\n}\n\nfloat decode8(vec4 texel, int index) {\n  int channel = integerMod(index, 4);\n  if (channel == 0) return texel.r * 255.0;\n  if (channel == 1) return texel.g * 255.0;\n  if (channel == 2) return texel.b * 255.0;\n  if (channel == 3) return texel.a * 255.0;\n  return 0.0;\n}\n\nvec4 legacyEncode32(float f) {\n  float F = abs(f);\n  float sign = f < 0.0 ? 1.0 : 0.0;\n  float exponent = floor(log2(F));\n  float mantissa = (exp2(-exponent) * F);\n  // exponent += floor(log2(mantissa));\n  vec4 texel = vec4(F * exp2(23.0-exponent)) * SCALE_FACTOR_INV;\n  texel.rg = integerMod(texel.rg, 256.0);\n  texel.b = integerMod(texel.b, 128.0);\n  texel.a = exponent*0.5 + 63.5;\n  texel.ba += vec2(integerMod(exponent+127.0, 2.0), sign) * 128.0;\n  texel = floor(texel);\n  texel *= 0.003921569; // 1/255\n  __ENCODE32_ENDIANNESS__;\n  return texel;\n}\n\n// https://github.com/gpujs/gpu.js/wiki/Encoder-details\nvec4 encode32(float value) {\n  if (value == 0.0) return vec4(0, 0, 0, 0);\n\n  float exponent;\n  float mantissa;\n  vec4  result;\n  float sgn;\n\n  sgn = step(0.0, -value);\n  value = abs(value);\n\n  exponent = floor(log2(value));\n  float p2 = _pow2(exponent);\n  // approximate log2 can land one off; correct by direct comparison\n  if (p2 > value) { exponent -= 1.0; p2 *= 0.5; }\n  else if (p2 * 2.0 <= value) { exponent += 1.0; p2 *= 2.0; }\n\n  mantissa = value / p2 - 1.0;\n  exponent = exponent+127.0;\n  result   = vec4(0,0,0,0);\n\n  result.a = floor(exponent/2.0);\n  exponent = exponent - result.a*2.0;\n  result.a = result.a + 128.0*sgn;\n\n  result.b = floor(mantissa * 128.0);\n  mantissa = mantissa - result.b / 128.0;\n  result.b = result.b + exponent*128.0;\n\n  result.g = floor(mantissa*32768.0);\n  mantissa = mantissa - result.g/32768.0;\n\n  result.r = floor(mantissa*8388608.0);\n  return result/255.0;\n}\n// Dragons end here\n\nint index;\nivec3 threadId;\n\nivec3 indexTo3D(int idx, ivec3 texDim) {\n  int z = int(idx / (texDim.x * texDim.y));\n  idx -= z * int(texDim.x * texDim.y);\n  int y = int(idx / texDim.x);\n  int x = int(integerMod(idx, texDim.x));\n  return ivec3(x, y, z);\n}\n\nfloat get32(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  int index = x + texDim.x * (y + texDim.y * z);\n  int w = texSize.x;\n  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;\n  vec4 texel = texture2D(tex, st / vec2(texSize));\n  return decode32(texel);\n}\n\nfloat get16(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  int index = x + texDim.x * (y + texDim.y * z);\n  int w = texSize.x * 2;\n  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;\n  vec4 texel = texture2D(tex, st / vec2(texSize.x * 2, texSize.y));\n  return decode16(texel, index);\n}\n\nfloat get8(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  int index = x + texDim.x * (y + texDim.y * z);\n  int w = texSize.x * 4;\n  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;\n  vec4 texel = texture2D(tex, st / vec2(texSize.x * 4, texSize.y));\n  return decode8(texel, index);\n}\n\nfloat getMemoryOptimized32(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  int index = x + texDim.x * (y + texDim.y * z);\n  int channel = integerMod(index, 4);\n  index = index / 4;\n  int w = texSize.x;\n  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;\n  vec4 texel = texture2D(tex, st / vec2(texSize));\n  if (channel == 0) return texel.r;\n  if (channel == 1) return texel.g;\n  if (channel == 2) return texel.b;\n  if (channel == 3) return texel.a;\n  return 0.0;\n}\n\nvec4 getImage2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  int index = x + texDim.x * (y + texDim.y * z);\n  int w = texSize.x;\n  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;\n  return texture2D(tex, st / vec2(texSize));\n}\n\nfloat getFloatFromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  vec4 result = getImage2D(tex, texSize, texDim, z, y, x);\n  return result[0];\n}\n\nvec2 getVec2FromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  vec4 result = getImage2D(tex, texSize, texDim, z, y, x);\n  return vec2(result[0], result[1]);\n}\n\nvec2 getMemoryOptimizedVec2(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  int index = x + (texDim.x * (y + (texDim.y * z)));\n  int channel = integerMod(index, 2);\n  index = index / 2;\n  int w = texSize.x;\n  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;\n  vec4 texel = texture2D(tex, st / vec2(texSize));\n  if (channel == 0) return vec2(texel.r, texel.g);\n  if (channel == 1) return vec2(texel.b, texel.a);\n  return vec2(0.0, 0.0);\n}\n\nvec3 getVec3FromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  vec4 result = getImage2D(tex, texSize, texDim, z, y, x);\n  return vec3(result[0], result[1], result[2]);\n}\n\nvec3 getMemoryOptimizedVec3(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  int fieldIndex = 3 * (x + texDim.x * (y + texDim.y * z));\n  int vectorIndex = fieldIndex / 4;\n  int vectorOffset = fieldIndex - vectorIndex * 4;\n  int readY = vectorIndex / texSize.x;\n  int readX = vectorIndex - readY * texSize.x;\n  vec4 tex1 = texture2D(tex, (vec2(readX, readY) + 0.5) / vec2(texSize));\n  \n  if (vectorOffset == 0) {\n    return tex1.xyz;\n  } else if (vectorOffset == 1) {\n    return tex1.yzw;\n  } else {\n    readX++;\n    if (readX >= texSize.x) {\n      readX = 0;\n      readY++;\n    }\n    vec4 tex2 = texture2D(tex, vec2(readX, readY) / vec2(texSize));\n    if (vectorOffset == 2) {\n      return vec3(tex1.z, tex1.w, tex2.x);\n    } else {\n      return vec3(tex1.w, tex2.x, tex2.y);\n    }\n  }\n}\n\nvec4 getVec4FromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  return getImage2D(tex, texSize, texDim, z, y, x);\n}\n\nvec4 getMemoryOptimizedVec4(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  int index = x + texDim.x * (y + texDim.y * z);\n  int channel = integerMod(index, 2);\n  int w = texSize.x;\n  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;\n  vec4 texel = texture2D(tex, st / vec2(texSize));\n  return vec4(texel.r, texel.g, texel.b, texel.a);\n}\n\nvec4 actualColor;\nvoid color(float r, float g, float b, float a) {\n  actualColor = vec4(r,g,b,a);\n}\n\nvoid color(float r, float g, float b) {\n  color(r,g,b,1.0);\n}\n\nvoid color(sampler2D image) {\n  actualColor = texture2D(image, vTexCoord);\n}\n\nfloat modulo(float number, float divisor) {\n  if (number < 0.0) {\n    number = abs(number);\n    if (divisor < 0.0) {\n      divisor = abs(divisor);\n    }\n    return -mod(number, divisor);\n  }\n  if (divisor < 0.0) {\n    divisor = abs(divisor);\n  }\n  return mod(number, divisor);\n}\n\n__INJECTED_NATIVE__;\n__MAIN_CONSTANTS__;\n__MAIN_ARGUMENTS__;\n__KERNEL__;\n\nvoid main(void) {\n  index = int(vTexCoord.s * float(uTexSize.x)) + int(vTexCoord.t * float(uTexSize.y)) * uTexSize.x;\n  __MAIN_RESULT__;\n}`
    };
  });
  var require_vertex_shader$1 = __commonJSMin((exports, module) => {
    module.exports = {
      vertexShader: `__FLOAT_TACTIC_DECLARATION__;\n__INT_TACTIC_DECLARATION__;\n__SAMPLER_2D_TACTIC_DECLARATION__;\n\nattribute vec2 aPos;\nattribute vec2 aTexCoord;\n\nvarying vec2 vTexCoord;\nuniform vec2 ratio;\n\nvoid main(void) {\n  gl_Position = vec4((aPos + vec2(1)) * ratio + vec2(-1), 0, 1);\n  vTexCoord = aTexCoord;\n}`
    };
  });
  var require_gl_wiretap = __commonJSMin((exports, module) => {
    function glWiretap(gl, options = {}) {
      const {contextName: contextName = "gl", throwGetError: throwGetError, useTrackablePrimitives: useTrackablePrimitives, recording: recording = [], variables: variables = {}, onReadPixels: onReadPixels, onUnrecognizedArgumentLookup: onUnrecognizedArgumentLookup} = options;
      const proxy = new Proxy(gl, {
        get: listen
      });
      const contextVariables = [];
      const entityNames = {};
      let indent = "";
      let readPixelsVariableName;
      return proxy;
      function listen(obj, property) {
        switch (property) {
         case "addComment":
          return addComment;

         case "checkThrowError":
          return checkThrowError;

         case "getReadPixelsVariableName":
          return readPixelsVariableName;

         case "insertVariable":
          return insertVariable;

         case "reset":
          return reset;

         case "setIndent":
          return setIndent;

         case "toString":
          return toString;

         case "getContextVariableName":
          return getContextVariableName;
        }
        if (typeof gl[property] === "function") return function() {
          switch (property) {
           case "getError":
            if (throwGetError) recording.push(`${indent}if (${contextName}.getError() !== ${contextName}.NONE) throw new Error('error');`); else recording.push(`${indent}${contextName}.getError();`);
            return gl.getError();

           case "getExtension":
            {
              const variableName = `${contextName}Variables${contextVariables.length}`;
              recording.push(`${indent}const ${variableName} = ${contextName}.getExtension('${arguments[0]}');`);
              const extension = gl.getExtension(arguments[0]);
              if (extension && typeof extension === "object") {
                const tappedExtension = glExtensionWiretap(extension, {
                  getEntity: getEntity,
                  useTrackablePrimitives: useTrackablePrimitives,
                  recording: recording,
                  contextName: variableName,
                  contextVariables: contextVariables,
                  variables: variables,
                  indent: indent,
                  onUnrecognizedArgumentLookup: onUnrecognizedArgumentLookup
                });
                contextVariables.push(tappedExtension);
                return tappedExtension;
              } else contextVariables.push(null);
              return extension;
            }

           case "readPixels":
            const i = contextVariables.indexOf(arguments[6]);
            let targetVariableName;
            if (i === -1) {
              const variableName = getVariableName(arguments[6]);
              if (variableName) {
                targetVariableName = variableName;
                recording.push(`${indent}${variableName}`);
              } else {
                targetVariableName = `${contextName}Variable${contextVariables.length}`;
                contextVariables.push(arguments[6]);
                recording.push(`${indent}const ${targetVariableName} = new ${arguments[6].constructor.name}(${arguments[6].length});`);
              }
            } else targetVariableName = `${contextName}Variable${i}`;
            readPixelsVariableName = targetVariableName;
            const argumentAsStrings = [ arguments[0], arguments[1], arguments[2], arguments[3], getEntity(arguments[4]), getEntity(arguments[5]), targetVariableName ];
            recording.push(`${indent}${contextName}.readPixels(${argumentAsStrings.join(", ")});`);
            if (onReadPixels) onReadPixels(targetVariableName, argumentAsStrings);
            return gl.readPixels.apply(gl, arguments);

           case "drawBuffers":
            recording.push(`${indent}${contextName}.drawBuffers([${argumentsToString(arguments[0], {
              contextName: contextName,
              contextVariables: contextVariables,
              getEntity: getEntity,
              addVariable: addVariable,
              variables: variables,
              onUnrecognizedArgumentLookup: onUnrecognizedArgumentLookup
            })}]);`);
            return gl.drawBuffers(arguments[0]);
          }
          let result = gl[property].apply(gl, arguments);
          switch (typeof result) {
           case "undefined":
            recording.push(`${indent}${methodCallToString(property, arguments)};`);
            return;

           case "number":
           case "boolean":
            if (useTrackablePrimitives && contextVariables.indexOf(trackablePrimitive(result)) === -1) {
              recording.push(`${indent}const ${contextName}Variable${contextVariables.length} = ${methodCallToString(property, arguments)};`);
              contextVariables.push(result = trackablePrimitive(result));
              break;
            }

           default:
            if (result === null) recording.push(`${methodCallToString(property, arguments)};`); else recording.push(`${indent}const ${contextName}Variable${contextVariables.length} = ${methodCallToString(property, arguments)};`);
            contextVariables.push(result);
          }
          return result;
        };
        entityNames[gl[property]] = property;
        return gl[property];
      }
      function toString() {
        return recording.join("\n");
      }
      function reset() {
        while (recording.length > 0) recording.pop();
      }
      function insertVariable(name, value) {
        variables[name] = value;
      }
      function getEntity(value) {
        const name = entityNames[value];
        if (name) return contextName + "." + name;
        return value;
      }
      function setIndent(spaces) {
        indent = " ".repeat(spaces);
      }
      function addVariable(value, source) {
        const variableName = `${contextName}Variable${contextVariables.length}`;
        recording.push(`${indent}const ${variableName} = ${source};`);
        contextVariables.push(value);
        return variableName;
      }
      function addComment(value) {
        recording.push(`${indent}// ${value}`);
      }
      function checkThrowError() {
        recording.push(`${indent}(() => {\n${indent}const error = ${contextName}.getError();\n${indent}if (error !== ${contextName}.NONE) {\n${indent}  const names = Object.getOwnPropertyNames(gl);\n${indent}  for (let i = 0; i < names.length; i++) {\n${indent}    const name = names[i];\n${indent}    if (${contextName}[name] === error) {\n${indent}      throw new Error('${contextName} threw ' + name);\n${indent}    }\n${indent}  }\n${indent}}\n${indent}})();`);
      }
      function methodCallToString(method, args) {
        return `${contextName}.${method}(${argumentsToString(args, {
          contextName: contextName,
          contextVariables: contextVariables,
          getEntity: getEntity,
          addVariable: addVariable,
          variables: variables,
          onUnrecognizedArgumentLookup: onUnrecognizedArgumentLookup
        })})`;
      }
      function getVariableName(value) {
        if (variables) {
          for (const name in variables) if (variables[name] === value) return name;
        }
        return null;
      }
      function getContextVariableName(value) {
        const i = contextVariables.indexOf(value);
        if (i !== -1) return `${contextName}Variable${i}`;
        return null;
      }
    }
    function glExtensionWiretap(extension, options) {
      const proxy = new Proxy(extension, {
        get: listen
      });
      const extensionEntityNames = {};
      const {contextName: contextName, contextVariables: contextVariables, getEntity: getEntity, useTrackablePrimitives: useTrackablePrimitives, recording: recording, variables: variables, indent: indent, onUnrecognizedArgumentLookup: onUnrecognizedArgumentLookup} = options;
      return proxy;
      function listen(obj, property) {
        if (typeof obj[property] === "function") return function() {
          switch (property) {
           case "drawBuffersWEBGL":
            recording.push(`${indent}${contextName}.drawBuffersWEBGL([${argumentsToString(arguments[0], {
              contextName: contextName,
              contextVariables: contextVariables,
              getEntity: getExtensionEntity,
              addVariable: addVariable,
              variables: variables,
              onUnrecognizedArgumentLookup: onUnrecognizedArgumentLookup
            })}]);`);
            return extension.drawBuffersWEBGL(arguments[0]);
          }
          let result = extension[property].apply(extension, arguments);
          switch (typeof result) {
           case "undefined":
            recording.push(`${indent}${methodCallToString(property, arguments)};`);
            return;

           case "number":
           case "boolean":
            if (useTrackablePrimitives && contextVariables.indexOf(trackablePrimitive(result)) === -1) {
              recording.push(`${indent}const ${contextName}Variable${contextVariables.length} = ${methodCallToString(property, arguments)};`);
              contextVariables.push(result = trackablePrimitive(result));
            } else {
              recording.push(`${indent}const ${contextName}Variable${contextVariables.length} = ${methodCallToString(property, arguments)};`);
              contextVariables.push(result);
            }
            break;

           default:
            if (result === null) recording.push(`${methodCallToString(property, arguments)};`); else recording.push(`${indent}const ${contextName}Variable${contextVariables.length} = ${methodCallToString(property, arguments)};`);
            contextVariables.push(result);
          }
          return result;
        };
        extensionEntityNames[extension[property]] = property;
        return extension[property];
      }
      function getExtensionEntity(value) {
        if (extensionEntityNames.hasOwnProperty(value)) return `${contextName}.${extensionEntityNames[value]}`;
        return getEntity(value);
      }
      function methodCallToString(method, args) {
        return `${contextName}.${method}(${argumentsToString(args, {
          contextName: contextName,
          contextVariables: contextVariables,
          getEntity: getExtensionEntity,
          addVariable: addVariable,
          variables: variables,
          onUnrecognizedArgumentLookup: onUnrecognizedArgumentLookup
        })})`;
      }
      function addVariable(value, source) {
        const variableName = `${contextName}Variable${contextVariables.length}`;
        contextVariables.push(value);
        recording.push(`${indent}const ${variableName} = ${source};`);
        return variableName;
      }
    }
    function argumentsToString(args, options) {
      const {variables: variables, onUnrecognizedArgumentLookup: onUnrecognizedArgumentLookup} = options;
      return Array.from(args).map(arg => {
        const variableName = getVariableName(arg);
        if (variableName) return variableName;
        return argumentToString(arg, options);
      }).join(", ");
      function getVariableName(value) {
        if (variables) for (const name in variables) {
          if (!variables.hasOwnProperty(name)) continue;
          if (variables[name] === value) return name;
        }
        if (onUnrecognizedArgumentLookup) return onUnrecognizedArgumentLookup(value);
        return null;
      }
    }
    function argumentToString(arg, options) {
      const {contextName: contextName, contextVariables: contextVariables, getEntity: getEntity, addVariable: addVariable, onUnrecognizedArgumentLookup: onUnrecognizedArgumentLookup} = options;
      if (typeof arg === "undefined") return "undefined";
      if (arg === null) return "null";
      const i = contextVariables.indexOf(arg);
      if (i > -1) return `${contextName}Variable${i}`;
      switch (arg.constructor.name) {
       case "String":
        const hasLines = /\n/.test(arg);
        const hasSingleQuotes = /'/.test(arg);
        const hasDoubleQuotes = /"/.test(arg);
        if (hasLines) return "`" + arg + "`"; else if (hasSingleQuotes && !hasDoubleQuotes) return '"' + arg + '"'; else if (!hasSingleQuotes && hasDoubleQuotes) return "'" + arg + "'"; else return "'" + arg + "'";

       case "Number":
        return getEntity(arg);

       case "Boolean":
        return getEntity(arg);

       case "Array":
        return addVariable(arg, `new ${arg.constructor.name}([${Array.from(arg).join(",")}])`);

       case "Float32Array":
       case "Uint8Array":
       case "Uint16Array":
       case "Int32Array":
        return addVariable(arg, `new ${arg.constructor.name}(${JSON.stringify(Array.from(arg))})`);

       default:
        if (onUnrecognizedArgumentLookup) {
          const instantiationString = onUnrecognizedArgumentLookup(arg);
          if (instantiationString) return instantiationString;
        }
        throw new Error(`unrecognized argument type ${arg.constructor.name}`);
      }
    }
    function trackablePrimitive(value) {
      return new value.constructor(value);
    }
    if (typeof module !== "undefined") module.exports = {
      glWiretap: glWiretap,
      glExtensionWiretap: glExtensionWiretap
    };
    if (typeof window !== "undefined") {
      glWiretap.glExtensionWiretap = glExtensionWiretap;
      window.glWiretap = glWiretap;
    }
  });
  var require_kernel_string = __commonJSMin((exports, module) => {
    const {glWiretap: glWiretap} = require_gl_wiretap();
    const {utils: utils} = require_utils();
    function toStringWithoutUtils(fn) {
      let source = fn.toString().replace(/^function /, "");
      const arrow = source.indexOf("=>");
      if (arrow !== -1 && !/[{]|\bfunction\b/.test(source.slice(0, arrow))) {
        const params = source.slice(0, arrow).trim();
        const body = source.slice(arrow + 2).trim();
        source = body.startsWith("{") ? `${params} ${body}` : `${params} { return ${body}; }`;
      }
      return source.replace(/utils[.]/g, "/*utils.*/");
    }
    function glKernelString(Kernel, args, originKernel, setupContextString, destroyContextString) {
      if (!originKernel.built) originKernel.build.apply(originKernel, args);
      args = args ? Array.from(args).map(arg => {
        switch (typeof arg) {
         case "boolean":
          return new Boolean(arg);

         case "number":
          return new Number(arg);

         default:
          return arg;
        }
      }) : null;
      const uploadedValues = [];
      const postResult = [];
      const context = glWiretap(originKernel.context, {
        useTrackablePrimitives: true,
        onReadPixels: targetName => {
          if (kernel.subKernels) {
            if (!subKernelsResultVariableSetup) {
              postResult.push(`    const result = { result: ${getRenderString(targetName, kernel)} };`);
              subKernelsResultVariableSetup = true;
            } else {
              const property = kernel.subKernels[subKernelsResultIndex++].property;
              postResult.push(`    result${isNaN(property) ? "." + property : `[${property}]`} = ${getRenderString(targetName, kernel)};`);
            }
            if (subKernelsResultIndex === kernel.subKernels.length) postResult.push("    return result;");
            return;
          }
          if (targetName) postResult.push(`    return ${getRenderString(targetName, kernel)};`); else postResult.push(`    return null;`);
        },
        onUnrecognizedArgumentLookup: argument => {
          const argumentName = findKernelValue(argument, kernel.kernelArguments, [], context, uploadedValues);
          if (argumentName) return argumentName;
          const constantName = findKernelValue(argument, kernel.kernelConstants, constants ? Object.keys(constants).map(key => constants[key]) : [], context, uploadedValues);
          if (constantName) return constantName;
          return null;
        }
      });
      let subKernelsResultVariableSetup = false;
      let subKernelsResultIndex = 0;
      const {source: source, canvas: canvas, output: output, pipeline: pipeline, graphical: graphical, loopMaxIterations: loopMaxIterations, constants: constants, optimizeFloatMemory: optimizeFloatMemory, precision: precision, fixIntegerDivisionAccuracy: fixIntegerDivisionAccuracy, functions: functions, nativeFunctions: nativeFunctions, subKernels: subKernels, immutable: immutable, argumentTypes: argumentTypes, constantTypes: constantTypes, kernelArguments: kernelArguments, kernelConstants: kernelConstants, tactic: tactic} = originKernel;
      const kernel = new Kernel(source, {
        canvas: canvas,
        context: context,
        checkContext: false,
        output: output,
        pipeline: pipeline,
        graphical: graphical,
        loopMaxIterations: loopMaxIterations,
        constants: constants,
        optimizeFloatMemory: optimizeFloatMemory,
        precision: precision,
        fixIntegerDivisionAccuracy: fixIntegerDivisionAccuracy,
        functions: functions,
        nativeFunctions: nativeFunctions,
        subKernels: subKernels,
        immutable: immutable,
        argumentTypes: argumentTypes,
        constantTypes: constantTypes,
        tactic: tactic
      });
      let result = [];
      context.setIndent(2);
      kernel.build.apply(kernel, args);
      result.push(context.toString());
      context.reset();
      kernel.kernelArguments.forEach((kernelArgument, i) => {
        switch (kernelArgument.type) {
         case "Integer":
         case "Boolean":
         case "Number":
         case "Float":
         case "Array":
         case "Array(2)":
         case "Array(3)":
         case "Array(4)":
         case "HTMLCanvas":
         case "HTMLImage":
         case "HTMLVideo":
          context.insertVariable(`uploadValue_${kernelArgument.name}`, kernelArgument.uploadValue);
          break;

         case "HTMLImageArray":
          for (let imageIndex = 0; imageIndex < args[i].length; imageIndex++) {
            const arg = args[i];
            context.insertVariable(`uploadValue_${kernelArgument.name}[${imageIndex}]`, arg[imageIndex]);
          }
          break;

         case "Input":
          context.insertVariable(`uploadValue_${kernelArgument.name}`, kernelArgument.uploadValue);
          break;

         case "MemoryOptimizedNumberTexture":
         case "NumberTexture":
         case "Array1D(2)":
         case "Array1D(3)":
         case "Array1D(4)":
         case "Array2D(2)":
         case "Array2D(3)":
         case "Array2D(4)":
         case "Array3D(2)":
         case "Array3D(3)":
         case "Array3D(4)":
         case "ArrayTexture(1)":
         case "ArrayTexture(2)":
         case "ArrayTexture(3)":
         case "ArrayTexture(4)":
          context.insertVariable(`uploadValue_${kernelArgument.name}`, args[i].texture);
          break;

         default:
          throw new Error(`unhandled kernelArgumentType insertion for glWiretap of type ${kernelArgument.type}`);
        }
      });
      result.push("/** start of injected functions **/");
      result.push(`function ${toStringWithoutUtils(utils.flattenTo)}`);
      result.push(`function ${toStringWithoutUtils(utils.flatten2dArrayTo)}`);
      result.push(`function ${toStringWithoutUtils(utils.flatten3dArrayTo)}`);
      result.push(`function ${toStringWithoutUtils(utils.flatten4dArrayTo)}`);
      result.push(`function ${toStringWithoutUtils(utils.isArray)}`);
      if (kernel.renderOutput !== kernel.renderTexture && kernel.formatValues) result.push(`  const renderOutput = function ${toStringWithoutUtils(kernel.formatValues)};`);
      result.push(`let readFramebuffer = null;\nfunction getReadFramebuffer() {\n  if (!readFramebuffer) readFramebuffer = gl.createFramebuffer();\n  return readFramebuffer;\n}`);
      result.push("/** end of injected functions **/");
      result.push(`  const innerKernel = function (${kernel.kernelArguments.map(kernelArgument => kernelArgument.varName).join(", ")}) {`);
      context.setIndent(4);
      kernel.run.apply(kernel, args);
      if (kernel.renderKernels) kernel.renderKernels(); else if (kernel.renderOutput) kernel.renderOutput();
      result.push("    /** start setup uploads for kernel values **/");
      kernel.kernelArguments.forEach(kernelArgument => {
        result.push("    " + kernelArgument.getStringValueHandler().split("\n").join("\n    "));
      });
      result.push("    /** end setup uploads for kernel values **/");
      result.push(context.toString());
      if (kernel.renderOutput === kernel.renderTexture) {
        context.reset();
        if (kernel.renderKernels) {
          const results = kernel.renderKernels();
          const textureName = context.getContextVariableName(kernel.texture.texture);
          result.push(`    return {\n      result: {\n        texture: ${textureName},\n        type: '${results.result.type}',\n        toArray: ${getToArrayString(results.result, textureName)}\n      },`);
          const {subKernels: subKernels, mappedTextures: mappedTextures} = kernel;
          for (let i = 0; i < subKernels.length; i++) {
            const texture = mappedTextures[i];
            const subKernel = subKernels[i];
            const subKernelResult = results[subKernel.property];
            const subKernelTextureName = context.getContextVariableName(texture.texture);
            result.push(`\n      ${subKernel.property}: {\n        texture: ${subKernelTextureName},\n        type: '${subKernelResult.type}',\n        toArray: ${getToArrayString(subKernelResult, subKernelTextureName)}\n      },`);
          }
          result.push(`    };`);
        } else {
          const rendered = kernel.renderOutput();
          const textureName = context.getContextVariableName(kernel.texture.texture);
          result.push(`    return {\n        texture: ${textureName},\n        type: '${rendered.type}',\n        toArray: ${getToArrayString(rendered, textureName)}\n      };`);
        }
      }
      result.push(`    ${destroyContextString ? "\n" + destroyContextString + "    " : ""}`);
      result.push(postResult.join("\n"));
      result.push("  };");
      if (kernel.graphical) {
        result.push(getGetPixelsString(kernel));
        result.push(`  innerKernel.getPixels = getPixels;`);
      }
      result.push("  return innerKernel;");
      let constantsUpload = [];
      kernelConstants.forEach(kernelConstant => {
        constantsUpload.push(`${kernelConstant.getStringValueHandler()}`);
      });
      return `function kernel(settings) {\n  const { context, constants } = settings;\n  ${constantsUpload.join("")}\n  ${setupContextString ? setupContextString : ""}\n${result.join("\n")}\n}`;
    }
    function getRenderString(targetName, kernel) {
      const readBackValue = kernel.precision === "single" ? targetName : `new Float32Array(${targetName}.buffer)`;
      if (kernel.output[2]) return `renderOutput(${readBackValue}, ${kernel.output[0]}, ${kernel.output[1]}, ${kernel.output[2]})`;
      if (kernel.output[1]) return `renderOutput(${readBackValue}, ${kernel.output[0]}, ${kernel.output[1]})`;
      return `renderOutput(${readBackValue}, ${kernel.output[0]})`;
    }
    function getGetPixelsString(kernel) {
      const getPixels = kernel.getPixels.toString();
      const useFunctionKeyword = !/^function/.test(getPixels);
      return utils.flattenFunctionToString(`${useFunctionKeyword ? "function " : ""}${getPixels}`, {
        findDependency: (object, name) => {
          if (object === "utils") return `const ${name} = ${utils[name].toString()};`;
          return null;
        },
        thisLookup: property => {
          if (property === "context") return null;
          if (kernel.hasOwnProperty(property)) return JSON.stringify(kernel[property]);
          throw new Error(`unhandled thisLookup ${property}`);
        }
      });
    }
    function getToArrayString(kernelResult, textureName) {
      const toArray = kernelResult.toArray.toString();
      const useFunctionKeyword = !/^function/.test(toArray);
      return `() => {\n  function framebuffer() { return getReadFramebuffer(); };\n  ${utils.flattenFunctionToString(`${useFunctionKeyword ? "function " : ""}${toArray}`, {
        findDependency: (object, name) => {
          if (object === "utils") return `const ${name} = ${utils[name].toString()};`; else if (object === "this") {
            if (name === "framebuffer") return "";
            return `${useFunctionKeyword ? "function " : ""}${kernelResult[name].toString()}`;
          } else throw new Error("unhandled fromObject");
        },
        thisLookup: (property, isDeclaration) => {
          if (property === "texture") return textureName;
          if (property === "context") {
            if (isDeclaration) return null;
            return "gl";
          }
          if (kernelResult.hasOwnProperty(property)) return JSON.stringify(kernelResult[property]);
          throw new Error(`unhandled thisLookup ${property}`);
        }
      })}\n  return toArray();\n  }`;
    }
    function findKernelValue(argument, kernelValues, values, context, uploadedValues) {
      if (argument === null) return null;
      if (kernelValues === null) return null;
      switch (typeof argument) {
       case "boolean":
       case "number":
        return null;
      }
      if (typeof HTMLImageElement !== "undefined" && argument instanceof HTMLImageElement) for (let i = 0; i < kernelValues.length; i++) {
        const kernelValue = kernelValues[i];
        if (kernelValue.type !== "HTMLImageArray" && kernelValue) continue;
        if (kernelValue.uploadValue !== argument) continue;
        const variableIndex = values[i].indexOf(argument);
        if (variableIndex === -1) continue;
        const variableName = `uploadValue_${kernelValue.name}[${variableIndex}]`;
        context.insertVariable(variableName, argument);
        return variableName;
      }
      for (let i = 0; i < kernelValues.length; i++) {
        const kernelValue = kernelValues[i];
        if (argument !== kernelValue.uploadValue) continue;
        const variable = `uploadValue_${kernelValue.name}`;
        context.insertVariable(variable, kernelValue);
        return variable;
      }
      return null;
    }
    module.exports = {
      glKernelString: glKernelString
    };
  });
  var require_kernel_value$1 = __commonJSMin((exports, module) => {
    var KernelValue = class {
      constructor(value, settings) {
        const {name: name, kernel: kernel, context: context, checkContext: checkContext, onRequestContextHandle: onRequestContextHandle, onUpdateValueMismatch: onUpdateValueMismatch, origin: origin, strictIntegers: strictIntegers, type: type, tactic: tactic} = settings;
        if (!name) throw new Error("name not set");
        if (!type) throw new Error("type not set");
        if (!origin) throw new Error("origin not set");
        if (origin !== "user" && origin !== "constants") throw new Error(`origin must be "user" or "constants" value is "${origin}"`);
        if (!onRequestContextHandle) throw new Error("onRequestContextHandle is not set");
        this.name = name;
        this.origin = origin;
        this.tactic = tactic;
        this.varName = origin === "constants" ? `constants.${name}` : name;
        this.kernel = kernel;
        this.strictIntegers = strictIntegers;
        this.type = value.type || type;
        this.size = value.size || null;
        this.index = null;
        this.context = context;
        this.checkContext = checkContext !== null && checkContext !== void 0 ? checkContext : true;
        this.contextHandle = null;
        this.onRequestContextHandle = onRequestContextHandle;
        this.onUpdateValueMismatch = onUpdateValueMismatch;
        this.forceUploadEachRun = null;
      }
      get id() {
        return `${this.origin}_${name}`;
      }
      getSource() {
        throw new Error(`"getSource" not defined on ${this.constructor.name}`);
      }
      updateValue(value) {
        throw new Error(`"updateValue" not defined on ${this.constructor.name}`);
      }
    };
    module.exports = {
      KernelValue: KernelValue
    };
  });
  var require_kernel_value = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {KernelValue: KernelValue} = require_kernel_value$1();
    var WebGLKernelValue = class extends KernelValue {
      constructor(value, settings) {
        super(value, settings);
        this.dimensionsId = null;
        this.sizeId = null;
        this.initialValueConstructor = value.constructor;
        this.onRequestTexture = settings.onRequestTexture;
        this.onRequestIndex = settings.onRequestIndex;
        this.uploadValue = null;
        this.textureSize = null;
        this.bitRatio = null;
        this.prevArg = null;
      }
      get id() {
        return `${this.origin}_${utils.sanitizeName(this.name)}`;
      }
      setup() {}
      rebind() {}
      getTransferArrayType(value) {
        if (Array.isArray(value[0])) return this.getTransferArrayType(value[0]);
        switch (value.constructor) {
         case Array:
         case Int32Array:
         case Int16Array:
         case Int8Array:
          return Float32Array;

         case Uint8ClampedArray:
         case Uint8Array:
         case Uint16Array:
         case Uint32Array:
         case Float32Array:
         case Float64Array:
          return value.constructor;
        }
        console.warn("Unfamiliar constructor type.  Will go ahead and use, but likley this may result in a transfer of zeros");
        return value.constructor;
      }
      getStringValueHandler() {
        throw new Error(`"getStringValueHandler" not implemented on ${this.constructor.name}`);
      }
      getVariablePrecisionString() {
        return this.kernel.getVariablePrecisionString(this.textureSize || void 0, this.tactic || void 0);
      }
      destroy() {}
    };
    module.exports = {
      WebGLKernelValue: WebGLKernelValue
    };
  });
  var require_boolean$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValue: WebGLKernelValue} = require_kernel_value();
    var WebGLKernelValueBoolean = class extends WebGLKernelValue {
      constructor(value, settings) {
        super(value, settings);
        this.uploadValue = value;
      }
      getSource(value) {
        if (this.origin === "constants") return `const bool ${this.id} = ${value};\n`;
        return `uniform bool ${this.id};\n`;
      }
      getStringValueHandler() {
        return `const uploadValue_${this.name} = ${this.varName};\n`;
      }
      updateValue(value) {
        if (this.origin === "constants") return;
        this.kernel.setUniform1i(this.id, this.uploadValue = value);
      }
    };
    module.exports = {
      WebGLKernelValueBoolean: WebGLKernelValueBoolean
    };
  });
  var require_float$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValue: WebGLKernelValue} = require_kernel_value();
    var WebGLKernelValueFloat = class extends WebGLKernelValue {
      constructor(value, settings) {
        super(value, settings);
        this.uploadValue = value;
      }
      getStringValueHandler() {
        return `const uploadValue_${this.name} = ${this.varName};\n`;
      }
      getSource(value) {
        if (this.origin === "constants") {
          if (Number.isInteger(value)) return `const float ${this.id} = ${utils.glslFloatLiteral(value)};\n`;
          return `const float ${this.id} = ${value};\n`;
        }
        return `uniform float ${this.id};\n`;
      }
      updateValue(value) {
        if (this.origin === "constants") return;
        this.kernel.setUniform1f(this.id, this.uploadValue = value);
      }
    };
    module.exports = {
      WebGLKernelValueFloat: WebGLKernelValueFloat
    };
  });
  var require_integer$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValue: WebGLKernelValue} = require_kernel_value();
    var WebGLKernelValueInteger = class extends WebGLKernelValue {
      constructor(value, settings) {
        super(value, settings);
        this.uploadValue = value;
      }
      getStringValueHandler() {
        return `const uploadValue_${this.name} = ${this.varName};\n`;
      }
      getSource(value) {
        if (this.origin === "constants") return `const int ${this.id} = ${parseInt(value)};\n`;
        return `uniform int ${this.id};\n`;
      }
      updateValue(value) {
        if (this.origin === "constants") return;
        this.kernel.setUniform1i(this.id, this.uploadValue = value);
      }
    };
    module.exports = {
      WebGLKernelValueInteger: WebGLKernelValueInteger
    };
  });
  var require_array = __commonJSMin((exports, module) => {
    const {WebGLKernelValue: WebGLKernelValue} = require_kernel_value();
    const {Input: Input} = require_input();
    var WebGLKernelArray = class extends WebGLKernelValue {
      rebind() {
        if (!this.texture || this.contextHandle === void 0 || this.contextHandle === null) return;
        const {context: gl} = this;
        gl.activeTexture(this.contextHandle);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
      }
      checkSize(width, height) {
        if (!this.kernel.validate) return;
        const {maxTextureSize: maxTextureSize} = this.kernel.constructor.features;
        if (width > maxTextureSize || height > maxTextureSize) if (width > height) throw new Error(`Argument texture width of ${width} larger than maximum size of ${maxTextureSize} for your GPU`); else if (width < height) throw new Error(`Argument texture height of ${height} larger than maximum size of ${maxTextureSize} for your GPU`); else throw new Error(`Argument texture height and width of ${height} larger than maximum size of ${maxTextureSize} for your GPU`);
      }
      setup() {
        this.requestTexture();
        this.setupTexture();
        this.defineTexture();
      }
      requestTexture() {
        this.texture = this.onRequestTexture();
      }
      defineTexture() {
        const {context: gl} = this;
        gl.activeTexture(this.contextHandle);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      }
      setupTexture() {
        this.contextHandle = this.onRequestContextHandle();
        this.index = this.onRequestIndex();
        this.dimensionsId = this.id + "Dim";
        this.sizeId = this.id + "Size";
      }
      getBitRatio(value) {
        if (Array.isArray(value[0])) return this.getBitRatio(value[0]); else if (value.constructor === Input) return this.getBitRatio(value.value);
        switch (value.constructor) {
         case Uint8ClampedArray:
         case Uint8Array:
          return 1;

         case Uint16Array:
          return 2;

         case Int8Array:
         case Int16Array:
         case Float32Array:
         case Int32Array:
         default:
          return 4;
        }
      }
      destroy() {
        if (this.prevArg) this.prevArg.delete();
        this.context.deleteTexture(this.texture);
      }
    };
    module.exports = {
      WebGLKernelArray: WebGLKernelArray
    };
  });
  var require_html_image$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelArray: WebGLKernelArray} = require_array();
    function mediaSize(value) {
      return {
        width: value.width > 0 ? value.width : value.videoWidth,
        height: value.height > 0 ? value.height : value.videoHeight
      };
    }
    var WebGLKernelValueHTMLImage = class extends WebGLKernelArray {
      constructor(value, settings) {
        super(value, settings);
        const {width: width, height: height} = mediaSize(value);
        this.checkSize(width, height);
        this.dimensions = [ width, height, 1 ];
        this.textureSize = [ width, height ];
        this.uploadValue = value;
      }
      getStringValueHandler() {
        return `const uploadValue_${this.name} = ${this.varName};\n`;
      }
      getSource() {
        return utils.linesToString([ `uniform sampler2D ${this.id}`, `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`, `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})` ]);
      }
      updateValue(inputImage) {
        if (inputImage.constructor !== this.initialValueConstructor) {
          this.onUpdateValueMismatch(inputImage.constructor);
          return;
        }
        const {context: gl} = this;
        gl.activeTexture(this.contextHandle);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.uploadValue = inputImage);
        this.kernel.setUniform1i(this.id, this.index);
      }
    };
    module.exports = {
      WebGLKernelValueHTMLImage: WebGLKernelValueHTMLImage,
      mediaSize: mediaSize
    };
  });
  var require_dynamic_html_image$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueHTMLImage: WebGLKernelValueHTMLImage, mediaSize: mediaSize} = require_html_image$1();
    var WebGLKernelValueDynamicHTMLImage = class extends WebGLKernelValueHTMLImage {
      getSource() {
        return utils.linesToString([ `uniform sampler2D ${this.id}`, `uniform ivec2 ${this.sizeId}`, `uniform ivec3 ${this.dimensionsId}` ]);
      }
      updateValue(value) {
        const {width: width, height: height} = mediaSize(value);
        this.checkSize(width, height);
        this.dimensions = [ width, height, 1 ];
        this.textureSize = [ width, height ];
        this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
        this.kernel.setUniform2iv(this.sizeId, this.textureSize);
        super.updateValue(value);
      }
    };
    module.exports = {
      WebGLKernelValueDynamicHTMLImage: WebGLKernelValueDynamicHTMLImage
    };
  });
  var require_html_video$1 = __commonJSMin((exports, module) => {
    const {WebGLKernelValueHTMLImage: WebGLKernelValueHTMLImage} = require_html_image$1();
    var WebGLKernelValueHTMLVideo = class extends WebGLKernelValueHTMLImage {};
    module.exports = {
      WebGLKernelValueHTMLVideo: WebGLKernelValueHTMLVideo
    };
  });
  var require_dynamic_html_video$1 = __commonJSMin((exports, module) => {
    const {WebGLKernelValueDynamicHTMLImage: WebGLKernelValueDynamicHTMLImage} = require_dynamic_html_image$1();
    var WebGLKernelValueDynamicHTMLVideo = class extends WebGLKernelValueDynamicHTMLImage {};
    module.exports = {
      WebGLKernelValueDynamicHTMLVideo: WebGLKernelValueDynamicHTMLVideo
    };
  });
  var require_single_input$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelArray: WebGLKernelArray} = require_array();
    var WebGLKernelValueSingleInput = class extends WebGLKernelArray {
      constructor(value, settings) {
        super(value, settings);
        this.bitRatio = 4;
        let [w, h, d] = value.size;
        this.dimensions = new Int32Array([ w || 1, h || 1, d || 1 ]);
        this.textureSize = utils.getMemoryOptimizedFloatTextureSize(this.dimensions, this.bitRatio);
        this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
        this.checkSize(this.textureSize[0], this.textureSize[1]);
        this.uploadValue = new Float32Array(this.uploadArrayLength);
      }
      getStringValueHandler() {
        return utils.linesToString([ `const uploadValue_${this.name} = new Float32Array(${this.uploadArrayLength})`, `flattenTo(${this.varName}.value, uploadValue_${this.name})` ]);
      }
      getSource() {
        return utils.linesToString([ `uniform sampler2D ${this.id}`, `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`, `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})` ]);
      }
      updateValue(input) {
        if (input.constructor !== this.initialValueConstructor) {
          this.onUpdateValueMismatch(input.constructor);
          return;
        }
        const {context: gl} = this;
        utils.flattenTo(input.value, this.uploadValue);
        gl.activeTexture(this.contextHandle);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
        this.kernel.setUniform1i(this.id, this.index);
      }
    };
    module.exports = {
      WebGLKernelValueSingleInput: WebGLKernelValueSingleInput
    };
  });
  var require_dynamic_single_input$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueSingleInput: WebGLKernelValueSingleInput} = require_single_input$1();
    var WebGLKernelValueDynamicSingleInput = class extends WebGLKernelValueSingleInput {
      getSource() {
        return utils.linesToString([ `uniform sampler2D ${this.id}`, `uniform ivec2 ${this.sizeId}`, `uniform ivec3 ${this.dimensionsId}` ]);
      }
      updateValue(value) {
        let [w, h, d] = value.size;
        this.dimensions = new Int32Array([ w || 1, h || 1, d || 1 ]);
        this.textureSize = utils.getMemoryOptimizedFloatTextureSize(this.dimensions, this.bitRatio);
        this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
        this.checkSize(this.textureSize[0], this.textureSize[1]);
        this.uploadValue = new Float32Array(this.uploadArrayLength);
        this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
        this.kernel.setUniform2iv(this.sizeId, this.textureSize);
        super.updateValue(value);
      }
    };
    module.exports = {
      WebGLKernelValueDynamicSingleInput: WebGLKernelValueDynamicSingleInput
    };
  });
  var require_unsigned_input$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelArray: WebGLKernelArray} = require_array();
    var WebGLKernelValueUnsignedInput = class extends WebGLKernelArray {
      constructor(value, settings) {
        super(value, settings);
        this.bitRatio = this.getBitRatio(value);
        const [w, h, d] = value.size;
        this.dimensions = new Int32Array([ w || 1, h || 1, d || 1 ]);
        this.textureSize = utils.getMemoryOptimizedPackedTextureSize(this.dimensions, this.bitRatio);
        this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * (4 / this.bitRatio);
        this.checkSize(this.textureSize[0], this.textureSize[1]);
        this.TranserArrayType = this.getTransferArrayType(value.value);
        this.preUploadValue = new this.TranserArrayType(this.uploadArrayLength);
        this.uploadValue = new Uint8Array(this.preUploadValue.buffer);
      }
      getStringValueHandler() {
        return utils.linesToString([ `const preUploadValue_${this.name} = new ${this.TranserArrayType.name}(${this.uploadArrayLength})`, `const uploadValue_${this.name} = new Uint8Array(preUploadValue_${this.name}.buffer)`, `flattenTo(${this.varName}.value, preUploadValue_${this.name})` ]);
      }
      getSource() {
        return utils.linesToString([ `uniform sampler2D ${this.id}`, `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`, `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})` ]);
      }
      updateValue(input) {
        if (input.constructor !== this.initialValueConstructor) {
          this.onUpdateValueMismatch(value.constructor);
          return;
        }
        const {context: gl} = this;
        utils.flattenTo(input.value, this.preUploadValue);
        gl.activeTexture(this.contextHandle);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, this.uploadValue);
        this.kernel.setUniform1i(this.id, this.index);
      }
    };
    module.exports = {
      WebGLKernelValueUnsignedInput: WebGLKernelValueUnsignedInput
    };
  });
  var require_dynamic_unsigned_input$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueUnsignedInput: WebGLKernelValueUnsignedInput} = require_unsigned_input$1();
    var WebGLKernelValueDynamicUnsignedInput = class extends WebGLKernelValueUnsignedInput {
      getSource() {
        return utils.linesToString([ `uniform sampler2D ${this.id}`, `uniform ivec2 ${this.sizeId}`, `uniform ivec3 ${this.dimensionsId}` ]);
      }
      updateValue(value) {
        let [w, h, d] = value.size;
        this.dimensions = new Int32Array([ w || 1, h || 1, d || 1 ]);
        this.textureSize = utils.getMemoryOptimizedPackedTextureSize(this.dimensions, this.bitRatio);
        this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * (4 / this.bitRatio);
        this.checkSize(this.textureSize[0], this.textureSize[1]);
        const Type = this.getTransferArrayType(value.value);
        this.preUploadValue = new Type(this.uploadArrayLength);
        this.uploadValue = new Uint8Array(this.preUploadValue.buffer);
        this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
        this.kernel.setUniform2iv(this.sizeId, this.textureSize);
        super.updateValue(value);
      }
    };
    module.exports = {
      WebGLKernelValueDynamicUnsignedInput: WebGLKernelValueDynamicUnsignedInput
    };
  });
  var require_memory_optimized_number_texture$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelArray: WebGLKernelArray} = require_array();
    const sameError = `Source and destination textures are the same.  Use immutable = true and manually cleanup kernel output texture memory with texture.delete()`;
    var WebGLKernelValueMemoryOptimizedNumberTexture = class extends WebGLKernelArray {
      constructor(value, settings) {
        super(value, settings);
        const [width, height] = value.size;
        this.checkSize(width, height);
        this.dimensions = value.dimensions;
        this.textureSize = value.size;
        this.uploadValue = value.texture;
        this.forceUploadEachRun = true;
      }
      setup() {
        this.setupTexture();
      }
      getStringValueHandler() {
        return `const uploadValue_${this.name} = ${this.varName}.texture;\n`;
      }
      getSource() {
        return utils.linesToString([ `uniform sampler2D ${this.id}`, `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`, `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})` ]);
      }
      updateValue(inputTexture) {
        if (inputTexture.constructor !== this.initialValueConstructor) {
          this.onUpdateValueMismatch(inputTexture.constructor);
          return;
        }
        if (this.checkContext && inputTexture.context !== this.context) throw new Error(`Value ${this.name} (${this.type}) must be from same context`);
        const {kernel: kernel, context: gl} = this;
        if (kernel.pipeline) {
          if (kernel.immutable) kernel.updateTextureArgumentRefs(this, inputTexture); else if (kernel.texture && kernel.texture.texture === inputTexture.texture) throw new Error(sameError); else if (kernel.mappedTextures) {
            const {mappedTextures: mappedTextures} = kernel;
            for (let i = 0; i < mappedTextures.length; i++) if (mappedTextures[i].texture === inputTexture.texture) throw new Error(sameError);
          }
        }
        gl.activeTexture(this.contextHandle);
        gl.bindTexture(gl.TEXTURE_2D, this.uploadValue = inputTexture.texture);
        this.kernel.setUniform1i(this.id, this.index);
      }
    };
    module.exports = {
      WebGLKernelValueMemoryOptimizedNumberTexture: WebGLKernelValueMemoryOptimizedNumberTexture,
      sameError: sameError
    };
  });
  var require_dynamic_memory_optimized_number_texture$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueMemoryOptimizedNumberTexture: WebGLKernelValueMemoryOptimizedNumberTexture} = require_memory_optimized_number_texture$1();
    var WebGLKernelValueDynamicMemoryOptimizedNumberTexture = class extends WebGLKernelValueMemoryOptimizedNumberTexture {
      getSource() {
        return utils.linesToString([ `uniform sampler2D ${this.id}`, `uniform ivec2 ${this.sizeId}`, `uniform ivec3 ${this.dimensionsId}` ]);
      }
      updateValue(inputTexture) {
        this.dimensions = inputTexture.dimensions;
        this.checkSize(inputTexture.size[0], inputTexture.size[1]);
        this.textureSize = inputTexture.size;
        this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
        this.kernel.setUniform2iv(this.sizeId, this.textureSize);
        super.updateValue(inputTexture);
      }
    };
    module.exports = {
      WebGLKernelValueDynamicMemoryOptimizedNumberTexture: WebGLKernelValueDynamicMemoryOptimizedNumberTexture
    };
  });
  var require_number_texture$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelArray: WebGLKernelArray} = require_array();
    const {sameError: sameError} = require_memory_optimized_number_texture$1();
    var WebGLKernelValueNumberTexture = class extends WebGLKernelArray {
      constructor(value, settings) {
        super(value, settings);
        const [width, height] = value.size;
        this.checkSize(width, height);
        const {size: textureSize, dimensions: dimensions} = value;
        this.bitRatio = this.getBitRatio(value);
        this.dimensions = dimensions;
        this.textureSize = textureSize;
        this.uploadValue = value.texture;
        this.forceUploadEachRun = true;
      }
      setup() {
        this.setupTexture();
      }
      getStringValueHandler() {
        return `const uploadValue_${this.name} = ${this.varName}.texture;\n`;
      }
      getSource() {
        return utils.linesToString([ `uniform sampler2D ${this.id}`, `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`, `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})` ]);
      }
      updateValue(inputTexture) {
        if (inputTexture.constructor !== this.initialValueConstructor) {
          this.onUpdateValueMismatch(inputTexture.constructor);
          return;
        }
        if (this.checkContext && inputTexture.context !== this.context) throw new Error(`Value ${this.name} (${this.type}) must be from same context`);
        const {kernel: kernel, context: gl} = this;
        if (kernel.pipeline) {
          if (kernel.immutable) kernel.updateTextureArgumentRefs(this, inputTexture); else if (kernel.texture && kernel.texture.texture === inputTexture.texture) throw new Error(sameError); else if (kernel.mappedTextures) {
            const {mappedTextures: mappedTextures} = kernel;
            for (let i = 0; i < mappedTextures.length; i++) if (mappedTextures[i].texture === inputTexture.texture) throw new Error(sameError);
          }
        }
        gl.activeTexture(this.contextHandle);
        gl.bindTexture(gl.TEXTURE_2D, this.uploadValue = inputTexture.texture);
        this.kernel.setUniform1i(this.id, this.index);
      }
    };
    module.exports = {
      WebGLKernelValueNumberTexture: WebGLKernelValueNumberTexture
    };
  });
  var require_dynamic_number_texture$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueNumberTexture: WebGLKernelValueNumberTexture} = require_number_texture$1();
    var WebGLKernelValueDynamicNumberTexture = class extends WebGLKernelValueNumberTexture {
      getSource() {
        return utils.linesToString([ `uniform sampler2D ${this.id}`, `uniform ivec2 ${this.sizeId}`, `uniform ivec3 ${this.dimensionsId}` ]);
      }
      updateValue(value) {
        this.dimensions = value.dimensions;
        this.checkSize(value.size[0], value.size[1]);
        this.textureSize = value.size;
        this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
        this.kernel.setUniform2iv(this.sizeId, this.textureSize);
        super.updateValue(value);
      }
    };
    module.exports = {
      WebGLKernelValueDynamicNumberTexture: WebGLKernelValueDynamicNumberTexture
    };
  });
  var require_single_array$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelArray: WebGLKernelArray} = require_array();
    var WebGLKernelValueSingleArray = class extends WebGLKernelArray {
      constructor(value, settings) {
        super(value, settings);
        this.bitRatio = 4;
        this.dimensions = utils.getDimensions(value, true);
        this.textureSize = utils.getMemoryOptimizedFloatTextureSize(this.dimensions, this.bitRatio);
        this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
        this.checkSize(this.textureSize[0], this.textureSize[1]);
        this.uploadValue = new Float32Array(this.uploadArrayLength);
      }
      getStringValueHandler() {
        return utils.linesToString([ `const uploadValue_${this.name} = new Float32Array(${this.uploadArrayLength})`, `flattenTo(${this.varName}, uploadValue_${this.name})` ]);
      }
      getSource() {
        return utils.linesToString([ `uniform sampler2D ${this.id}`, `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`, `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})` ]);
      }
      updateValue(value) {
        if (!utils.isArray(value)) {
          this.onUpdateValueMismatch(value.constructor);
          return;
        }
        const {context: gl} = this;
        utils.flattenTo(value, this.uploadValue);
        gl.activeTexture(this.contextHandle);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
        this.kernel.setUniform1i(this.id, this.index);
      }
    };
    module.exports = {
      WebGLKernelValueSingleArray: WebGLKernelValueSingleArray
    };
  });
  var require_dynamic_single_array$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueSingleArray: WebGLKernelValueSingleArray} = require_single_array$1();
    var WebGLKernelValueDynamicSingleArray = class extends WebGLKernelValueSingleArray {
      getSource() {
        return utils.linesToString([ `uniform sampler2D ${this.id}`, `uniform ivec2 ${this.sizeId}`, `uniform ivec3 ${this.dimensionsId}` ]);
      }
      updateValue(value) {
        this.dimensions = utils.getDimensions(value, true);
        this.textureSize = utils.getMemoryOptimizedFloatTextureSize(this.dimensions, this.bitRatio);
        this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
        this.checkSize(this.textureSize[0], this.textureSize[1]);
        this.uploadValue = new Float32Array(this.uploadArrayLength);
        this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
        this.kernel.setUniform2iv(this.sizeId, this.textureSize);
        super.updateValue(value);
      }
    };
    module.exports = {
      WebGLKernelValueDynamicSingleArray: WebGLKernelValueDynamicSingleArray
    };
  });
  var require_single_array1d_i$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelArray: WebGLKernelArray} = require_array();
    var WebGLKernelValueSingleArray1DI = class extends WebGLKernelArray {
      constructor(value, settings) {
        super(value, settings);
        this.bitRatio = 4;
        this.setShape(value);
      }
      setShape(value) {
        const valueDimensions = utils.getDimensions(value, true);
        this.textureSize = utils.getMemoryOptimizedFloatTextureSize(valueDimensions, this.bitRatio);
        this.dimensions = new Int32Array([ valueDimensions[1], 1, 1 ]);
        this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
        this.checkSize(this.textureSize[0], this.textureSize[1]);
        this.uploadValue = new Float32Array(this.uploadArrayLength);
      }
      getStringValueHandler() {
        return utils.linesToString([ `const uploadValue_${this.name} = new Float32Array(${this.uploadArrayLength})`, `flattenTo(${this.varName}, uploadValue_${this.name})` ]);
      }
      getSource() {
        return utils.linesToString([ `uniform sampler2D ${this.id}`, `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`, `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})` ]);
      }
      updateValue(value) {
        if (value.constructor !== this.initialValueConstructor) {
          this.onUpdateValueMismatch(value.constructor);
          return;
        }
        const {context: gl} = this;
        utils.flatten2dArrayTo(value, this.uploadValue);
        gl.activeTexture(this.contextHandle);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
        this.kernel.setUniform1i(this.id, this.index);
      }
    };
    module.exports = {
      WebGLKernelValueSingleArray1DI: WebGLKernelValueSingleArray1DI
    };
  });
  var require_dynamic_single_array1d_i$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueSingleArray1DI: WebGLKernelValueSingleArray1DI} = require_single_array1d_i$1();
    var WebGLKernelValueDynamicSingleArray1DI = class extends WebGLKernelValueSingleArray1DI {
      getSource() {
        return utils.linesToString([ `uniform sampler2D ${this.id}`, `uniform ivec2 ${this.sizeId}`, `uniform ivec3 ${this.dimensionsId}` ]);
      }
      updateValue(value) {
        this.setShape(value);
        this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
        this.kernel.setUniform2iv(this.sizeId, this.textureSize);
        super.updateValue(value);
      }
    };
    module.exports = {
      WebGLKernelValueDynamicSingleArray1DI: WebGLKernelValueDynamicSingleArray1DI
    };
  });
  var require_single_array2d_i$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelArray: WebGLKernelArray} = require_array();
    var WebGLKernelValueSingleArray2DI = class extends WebGLKernelArray {
      constructor(value, settings) {
        super(value, settings);
        this.bitRatio = 4;
        this.setShape(value);
      }
      setShape(value) {
        const valueDimensions = utils.getDimensions(value, true);
        this.textureSize = utils.getMemoryOptimizedFloatTextureSize(valueDimensions, this.bitRatio);
        this.dimensions = new Int32Array([ valueDimensions[1], valueDimensions[2], 1 ]);
        this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
        this.checkSize(this.textureSize[0], this.textureSize[1]);
        this.uploadValue = new Float32Array(this.uploadArrayLength);
      }
      getStringValueHandler() {
        return utils.linesToString([ `const uploadValue_${this.name} = new Float32Array(${this.uploadArrayLength})`, `flattenTo(${this.varName}, uploadValue_${this.name})` ]);
      }
      getSource() {
        return utils.linesToString([ `uniform sampler2D ${this.id}`, `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`, `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})` ]);
      }
      updateValue(value) {
        if (value.constructor !== this.initialValueConstructor) {
          this.onUpdateValueMismatch(value.constructor);
          return;
        }
        const {context: gl} = this;
        utils.flatten3dArrayTo(value, this.uploadValue);
        gl.activeTexture(this.contextHandle);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
        this.kernel.setUniform1i(this.id, this.index);
      }
    };
    module.exports = {
      WebGLKernelValueSingleArray2DI: WebGLKernelValueSingleArray2DI
    };
  });
  var require_dynamic_single_array2d_i$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueSingleArray2DI: WebGLKernelValueSingleArray2DI} = require_single_array2d_i$1();
    var WebGLKernelValueDynamicSingleArray2DI = class extends WebGLKernelValueSingleArray2DI {
      getSource() {
        return utils.linesToString([ `uniform sampler2D ${this.id}`, `uniform ivec2 ${this.sizeId}`, `uniform ivec3 ${this.dimensionsId}` ]);
      }
      updateValue(value) {
        this.setShape(value);
        this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
        this.kernel.setUniform2iv(this.sizeId, this.textureSize);
        super.updateValue(value);
      }
    };
    module.exports = {
      WebGLKernelValueDynamicSingleArray2DI: WebGLKernelValueDynamicSingleArray2DI
    };
  });
  var require_single_array3d_i$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelArray: WebGLKernelArray} = require_array();
    var WebGLKernelValueSingleArray3DI = class extends WebGLKernelArray {
      constructor(value, settings) {
        super(value, settings);
        this.bitRatio = 4;
        this.setShape(value);
      }
      setShape(value) {
        const valueDimensions = utils.getDimensions(value, true);
        this.textureSize = utils.getMemoryOptimizedFloatTextureSize(valueDimensions, this.bitRatio);
        this.dimensions = new Int32Array([ valueDimensions[1], valueDimensions[2], valueDimensions[3] ]);
        this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
        this.checkSize(this.textureSize[0], this.textureSize[1]);
        this.uploadValue = new Float32Array(this.uploadArrayLength);
      }
      getStringValueHandler() {
        return utils.linesToString([ `const uploadValue_${this.name} = new Float32Array(${this.uploadArrayLength})`, `flattenTo(${this.varName}, uploadValue_${this.name})` ]);
      }
      getSource() {
        return utils.linesToString([ `uniform sampler2D ${this.id}`, `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`, `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})` ]);
      }
      updateValue(value) {
        if (value.constructor !== this.initialValueConstructor) {
          this.onUpdateValueMismatch(value.constructor);
          return;
        }
        const {context: gl} = this;
        utils.flatten4dArrayTo(value, this.uploadValue);
        gl.activeTexture(this.contextHandle);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
        this.kernel.setUniform1i(this.id, this.index);
      }
    };
    module.exports = {
      WebGLKernelValueSingleArray3DI: WebGLKernelValueSingleArray3DI
    };
  });
  var require_dynamic_single_array3d_i$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueSingleArray3DI: WebGLKernelValueSingleArray3DI} = require_single_array3d_i$1();
    var WebGLKernelValueDynamicSingleArray3DI = class extends WebGLKernelValueSingleArray3DI {
      getSource() {
        return utils.linesToString([ `uniform sampler2D ${this.id}`, `uniform ivec2 ${this.sizeId}`, `uniform ivec3 ${this.dimensionsId}` ]);
      }
      updateValue(value) {
        this.setShape(value);
        this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
        this.kernel.setUniform2iv(this.sizeId, this.textureSize);
        super.updateValue(value);
      }
    };
    module.exports = {
      WebGLKernelValueDynamicSingleArray3DI: WebGLKernelValueDynamicSingleArray3DI
    };
  });
  var require_array2$1 = __commonJSMin((exports, module) => {
    const {WebGLKernelValue: WebGLKernelValue} = require_kernel_value();
    var WebGLKernelValueArray2 = class extends WebGLKernelValue {
      constructor(value, settings) {
        super(value, settings);
        this.uploadValue = value;
      }
      getSource(value) {
        if (this.origin === "constants") return `const vec2 ${this.id} = vec2(${value[0]},${value[1]});\n`;
        return `uniform vec2 ${this.id};\n`;
      }
      getStringValueHandler() {
        if (this.origin === "constants") return "";
        return `const uploadValue_${this.name} = ${this.varName};\n`;
      }
      updateValue(value) {
        if (this.origin === "constants") return;
        this.kernel.setUniform2fv(this.id, this.uploadValue = value);
      }
    };
    module.exports = {
      WebGLKernelValueArray2: WebGLKernelValueArray2
    };
  });
  var require_array3$1 = __commonJSMin((exports, module) => {
    const {WebGLKernelValue: WebGLKernelValue} = require_kernel_value();
    var WebGLKernelValueArray3 = class extends WebGLKernelValue {
      constructor(value, settings) {
        super(value, settings);
        this.uploadValue = value;
      }
      getSource(value) {
        if (this.origin === "constants") return `const vec3 ${this.id} = vec3(${value[0]},${value[1]},${value[2]});\n`;
        return `uniform vec3 ${this.id};\n`;
      }
      getStringValueHandler() {
        if (this.origin === "constants") return "";
        return `const uploadValue_${this.name} = ${this.varName};\n`;
      }
      updateValue(value) {
        if (this.origin === "constants") return;
        this.kernel.setUniform3fv(this.id, this.uploadValue = value);
      }
    };
    module.exports = {
      WebGLKernelValueArray3: WebGLKernelValueArray3
    };
  });
  var require_array4$1 = __commonJSMin((exports, module) => {
    const {WebGLKernelValue: WebGLKernelValue} = require_kernel_value();
    var WebGLKernelValueArray4 = class extends WebGLKernelValue {
      constructor(value, settings) {
        super(value, settings);
        this.uploadValue = value;
      }
      getSource(value) {
        if (this.origin === "constants") return `const vec4 ${this.id} = vec4(${value[0]},${value[1]},${value[2]},${value[3]});\n`;
        return `uniform vec4 ${this.id};\n`;
      }
      getStringValueHandler() {
        if (this.origin === "constants") return "";
        return `const uploadValue_${this.name} = ${this.varName};\n`;
      }
      updateValue(value) {
        if (this.origin === "constants") return;
        this.kernel.setUniform4fv(this.id, this.uploadValue = value);
      }
    };
    module.exports = {
      WebGLKernelValueArray4: WebGLKernelValueArray4
    };
  });
  var require_unsigned_array$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelArray: WebGLKernelArray} = require_array();
    var WebGLKernelValueUnsignedArray = class extends WebGLKernelArray {
      constructor(value, settings) {
        super(value, settings);
        this.bitRatio = this.getBitRatio(value);
        this.dimensions = utils.getDimensions(value, true);
        this.textureSize = utils.getMemoryOptimizedPackedTextureSize(this.dimensions, this.bitRatio);
        this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * (4 / this.bitRatio);
        this.checkSize(this.textureSize[0], this.textureSize[1]);
        this.TranserArrayType = this.getTransferArrayType(value);
        this.preUploadValue = new this.TranserArrayType(this.uploadArrayLength);
        this.uploadValue = new Uint8Array(this.preUploadValue.buffer);
      }
      getStringValueHandler() {
        return utils.linesToString([ `const preUploadValue_${this.name} = new ${this.TranserArrayType.name}(${this.uploadArrayLength})`, `const uploadValue_${this.name} = new Uint8Array(preUploadValue_${this.name}.buffer)`, `flattenTo(${this.varName}, preUploadValue_${this.name})` ]);
      }
      getSource() {
        return utils.linesToString([ `uniform sampler2D ${this.id}`, `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`, `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})` ]);
      }
      updateValue(value) {
        if (!utils.isArray(value)) {
          this.onUpdateValueMismatch(value.constructor);
          return;
        }
        const {context: gl} = this;
        utils.flattenTo(value, this.preUploadValue);
        gl.activeTexture(this.contextHandle);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, this.uploadValue);
        this.kernel.setUniform1i(this.id, this.index);
      }
    };
    module.exports = {
      WebGLKernelValueUnsignedArray: WebGLKernelValueUnsignedArray
    };
  });
  var require_dynamic_unsigned_array$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueUnsignedArray: WebGLKernelValueUnsignedArray} = require_unsigned_array$1();
    var WebGLKernelValueDynamicUnsignedArray = class extends WebGLKernelValueUnsignedArray {
      getSource() {
        return utils.linesToString([ `uniform sampler2D ${this.id}`, `uniform ivec2 ${this.sizeId}`, `uniform ivec3 ${this.dimensionsId}` ]);
      }
      updateValue(value) {
        this.dimensions = utils.getDimensions(value, true);
        this.textureSize = utils.getMemoryOptimizedPackedTextureSize(this.dimensions, this.bitRatio);
        this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * (4 / this.bitRatio);
        this.checkSize(this.textureSize[0], this.textureSize[1]);
        const Type = this.getTransferArrayType(value);
        this.preUploadValue = new Type(this.uploadArrayLength);
        this.uploadValue = new Uint8Array(this.preUploadValue.buffer);
        this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
        this.kernel.setUniform2iv(this.sizeId, this.textureSize);
        super.updateValue(value);
      }
    };
    module.exports = {
      WebGLKernelValueDynamicUnsignedArray: WebGLKernelValueDynamicUnsignedArray
    };
  });
  var require_kernel_value_maps$1 = __commonJSMin((exports, module) => {
    const {WebGLKernelValueBoolean: WebGLKernelValueBoolean} = require_boolean$1();
    const {WebGLKernelValueFloat: WebGLKernelValueFloat} = require_float$1();
    const {WebGLKernelValueInteger: WebGLKernelValueInteger} = require_integer$1();
    const {WebGLKernelValueHTMLImage: WebGLKernelValueHTMLImage} = require_html_image$1();
    const {WebGLKernelValueDynamicHTMLImage: WebGLKernelValueDynamicHTMLImage} = require_dynamic_html_image$1();
    const {WebGLKernelValueHTMLVideo: WebGLKernelValueHTMLVideo} = require_html_video$1();
    const {WebGLKernelValueDynamicHTMLVideo: WebGLKernelValueDynamicHTMLVideo} = require_dynamic_html_video$1();
    const {WebGLKernelValueSingleInput: WebGLKernelValueSingleInput} = require_single_input$1();
    const {WebGLKernelValueDynamicSingleInput: WebGLKernelValueDynamicSingleInput} = require_dynamic_single_input$1();
    const {WebGLKernelValueUnsignedInput: WebGLKernelValueUnsignedInput} = require_unsigned_input$1();
    const {WebGLKernelValueDynamicUnsignedInput: WebGLKernelValueDynamicUnsignedInput} = require_dynamic_unsigned_input$1();
    const {WebGLKernelValueMemoryOptimizedNumberTexture: WebGLKernelValueMemoryOptimizedNumberTexture} = require_memory_optimized_number_texture$1();
    const {WebGLKernelValueDynamicMemoryOptimizedNumberTexture: WebGLKernelValueDynamicMemoryOptimizedNumberTexture} = require_dynamic_memory_optimized_number_texture$1();
    const {WebGLKernelValueNumberTexture: WebGLKernelValueNumberTexture} = require_number_texture$1();
    const {WebGLKernelValueDynamicNumberTexture: WebGLKernelValueDynamicNumberTexture} = require_dynamic_number_texture$1();
    const {WebGLKernelValueSingleArray: WebGLKernelValueSingleArray} = require_single_array$1();
    const {WebGLKernelValueDynamicSingleArray: WebGLKernelValueDynamicSingleArray} = require_dynamic_single_array$1();
    const {WebGLKernelValueSingleArray1DI: WebGLKernelValueSingleArray1DI} = require_single_array1d_i$1();
    const {WebGLKernelValueDynamicSingleArray1DI: WebGLKernelValueDynamicSingleArray1DI} = require_dynamic_single_array1d_i$1();
    const {WebGLKernelValueSingleArray2DI: WebGLKernelValueSingleArray2DI} = require_single_array2d_i$1();
    const {WebGLKernelValueDynamicSingleArray2DI: WebGLKernelValueDynamicSingleArray2DI} = require_dynamic_single_array2d_i$1();
    const {WebGLKernelValueSingleArray3DI: WebGLKernelValueSingleArray3DI} = require_single_array3d_i$1();
    const {WebGLKernelValueDynamicSingleArray3DI: WebGLKernelValueDynamicSingleArray3DI} = require_dynamic_single_array3d_i$1();
    const {WebGLKernelValueArray2: WebGLKernelValueArray2} = require_array2$1();
    const {WebGLKernelValueArray3: WebGLKernelValueArray3} = require_array3$1();
    const {WebGLKernelValueArray4: WebGLKernelValueArray4} = require_array4$1();
    const {WebGLKernelValueUnsignedArray: WebGLKernelValueUnsignedArray} = require_unsigned_array$1();
    const {WebGLKernelValueDynamicUnsignedArray: WebGLKernelValueDynamicUnsignedArray} = require_dynamic_unsigned_array$1();
    const kernelValueMaps = {
      unsigned: {
        dynamic: {
          Boolean: WebGLKernelValueBoolean,
          Integer: WebGLKernelValueInteger,
          Float: WebGLKernelValueFloat,
          Array: WebGLKernelValueDynamicUnsignedArray,
          "Array(2)": WebGLKernelValueArray2,
          "Array(3)": WebGLKernelValueArray3,
          "Array(4)": WebGLKernelValueArray4,
          "Array1D(2)": false,
          "Array1D(3)": false,
          "Array1D(4)": false,
          "Array2D(2)": false,
          "Array2D(3)": false,
          "Array2D(4)": false,
          "Array3D(2)": false,
          "Array3D(3)": false,
          "Array3D(4)": false,
          Input: WebGLKernelValueDynamicUnsignedInput,
          NumberTexture: WebGLKernelValueDynamicNumberTexture,
          "ArrayTexture(1)": WebGLKernelValueDynamicNumberTexture,
          "ArrayTexture(2)": WebGLKernelValueDynamicNumberTexture,
          "ArrayTexture(3)": WebGLKernelValueDynamicNumberTexture,
          "ArrayTexture(4)": WebGLKernelValueDynamicNumberTexture,
          MemoryOptimizedNumberTexture: WebGLKernelValueDynamicMemoryOptimizedNumberTexture,
          HTMLCanvas: WebGLKernelValueDynamicHTMLImage,
          OffscreenCanvas: WebGLKernelValueDynamicHTMLImage,
          HTMLImage: WebGLKernelValueDynamicHTMLImage,
          ImageBitmap: WebGLKernelValueDynamicHTMLImage,
          ImageData: WebGLKernelValueDynamicHTMLImage,
          HTMLImageArray: false,
          HTMLVideo: WebGLKernelValueDynamicHTMLVideo
        },
        static: {
          Boolean: WebGLKernelValueBoolean,
          Float: WebGLKernelValueFloat,
          Integer: WebGLKernelValueInteger,
          Array: WebGLKernelValueUnsignedArray,
          "Array(2)": WebGLKernelValueArray2,
          "Array(3)": WebGLKernelValueArray3,
          "Array(4)": WebGLKernelValueArray4,
          "Array1D(2)": false,
          "Array1D(3)": false,
          "Array1D(4)": false,
          "Array2D(2)": false,
          "Array2D(3)": false,
          "Array2D(4)": false,
          "Array3D(2)": false,
          "Array3D(3)": false,
          "Array3D(4)": false,
          Input: WebGLKernelValueUnsignedInput,
          NumberTexture: WebGLKernelValueNumberTexture,
          "ArrayTexture(1)": WebGLKernelValueNumberTexture,
          "ArrayTexture(2)": WebGLKernelValueNumberTexture,
          "ArrayTexture(3)": WebGLKernelValueNumberTexture,
          "ArrayTexture(4)": WebGLKernelValueNumberTexture,
          MemoryOptimizedNumberTexture: WebGLKernelValueMemoryOptimizedNumberTexture,
          HTMLCanvas: WebGLKernelValueHTMLImage,
          OffscreenCanvas: WebGLKernelValueHTMLImage,
          HTMLImage: WebGLKernelValueHTMLImage,
          ImageBitmap: WebGLKernelValueHTMLImage,
          ImageData: WebGLKernelValueHTMLImage,
          HTMLImageArray: false,
          HTMLVideo: WebGLKernelValueHTMLVideo
        }
      },
      single: {
        dynamic: {
          Boolean: WebGLKernelValueBoolean,
          Integer: WebGLKernelValueInteger,
          Float: WebGLKernelValueFloat,
          Array: WebGLKernelValueDynamicSingleArray,
          "Array(2)": WebGLKernelValueArray2,
          "Array(3)": WebGLKernelValueArray3,
          "Array(4)": WebGLKernelValueArray4,
          "Array1D(2)": WebGLKernelValueDynamicSingleArray1DI,
          "Array1D(3)": WebGLKernelValueDynamicSingleArray1DI,
          "Array1D(4)": WebGLKernelValueDynamicSingleArray1DI,
          "Array2D(2)": WebGLKernelValueDynamicSingleArray2DI,
          "Array2D(3)": WebGLKernelValueDynamicSingleArray2DI,
          "Array2D(4)": WebGLKernelValueDynamicSingleArray2DI,
          "Array3D(2)": WebGLKernelValueDynamicSingleArray3DI,
          "Array3D(3)": WebGLKernelValueDynamicSingleArray3DI,
          "Array3D(4)": WebGLKernelValueDynamicSingleArray3DI,
          Input: WebGLKernelValueDynamicSingleInput,
          NumberTexture: WebGLKernelValueDynamicNumberTexture,
          "ArrayTexture(1)": WebGLKernelValueDynamicNumberTexture,
          "ArrayTexture(2)": WebGLKernelValueDynamicNumberTexture,
          "ArrayTexture(3)": WebGLKernelValueDynamicNumberTexture,
          "ArrayTexture(4)": WebGLKernelValueDynamicNumberTexture,
          MemoryOptimizedNumberTexture: WebGLKernelValueDynamicMemoryOptimizedNumberTexture,
          HTMLCanvas: WebGLKernelValueDynamicHTMLImage,
          OffscreenCanvas: WebGLKernelValueDynamicHTMLImage,
          HTMLImage: WebGLKernelValueDynamicHTMLImage,
          ImageBitmap: WebGLKernelValueDynamicHTMLImage,
          ImageData: WebGLKernelValueDynamicHTMLImage,
          HTMLImageArray: false,
          HTMLVideo: WebGLKernelValueDynamicHTMLVideo
        },
        static: {
          Boolean: WebGLKernelValueBoolean,
          Float: WebGLKernelValueFloat,
          Integer: WebGLKernelValueInteger,
          Array: WebGLKernelValueSingleArray,
          "Array(2)": WebGLKernelValueArray2,
          "Array(3)": WebGLKernelValueArray3,
          "Array(4)": WebGLKernelValueArray4,
          "Array1D(2)": WebGLKernelValueSingleArray1DI,
          "Array1D(3)": WebGLKernelValueSingleArray1DI,
          "Array1D(4)": WebGLKernelValueSingleArray1DI,
          "Array2D(2)": WebGLKernelValueSingleArray2DI,
          "Array2D(3)": WebGLKernelValueSingleArray2DI,
          "Array2D(4)": WebGLKernelValueSingleArray2DI,
          "Array3D(2)": WebGLKernelValueSingleArray3DI,
          "Array3D(3)": WebGLKernelValueSingleArray3DI,
          "Array3D(4)": WebGLKernelValueSingleArray3DI,
          Input: WebGLKernelValueSingleInput,
          NumberTexture: WebGLKernelValueNumberTexture,
          "ArrayTexture(1)": WebGLKernelValueNumberTexture,
          "ArrayTexture(2)": WebGLKernelValueNumberTexture,
          "ArrayTexture(3)": WebGLKernelValueNumberTexture,
          "ArrayTexture(4)": WebGLKernelValueNumberTexture,
          MemoryOptimizedNumberTexture: WebGLKernelValueMemoryOptimizedNumberTexture,
          HTMLCanvas: WebGLKernelValueHTMLImage,
          OffscreenCanvas: WebGLKernelValueHTMLImage,
          HTMLImage: WebGLKernelValueHTMLImage,
          ImageBitmap: WebGLKernelValueHTMLImage,
          ImageData: WebGLKernelValueHTMLImage,
          HTMLImageArray: false,
          HTMLVideo: WebGLKernelValueHTMLVideo
        }
      }
    };
    function lookupKernelValueType(type, dynamic, precision, value) {
      if (!type) throw new Error("type missing");
      if (!dynamic) throw new Error("dynamic missing");
      if (!precision) throw new Error("precision missing");
      if (value.type) type = value.type;
      const types = kernelValueMaps[precision][dynamic];
      if (type === "WebGPUBuffer") throw new Error("this kernel runs on WebGL but received a WebGPU pipeline buffer; await handle.toArray() first, or give this kernel the async contract (asyncMode: true / mode: 'async') so the readback happens for you");
      if (types[type] === false) return null; else if (types[type] === void 0) throw new Error(`Could not find a KernelValue for ${type}`);
      return types[type];
    }
    module.exports = {
      lookupKernelValueType: lookupKernelValueType,
      kernelValueMaps: kernelValueMaps
    };
  });
  var require_kernel$4 = __commonJSMin((exports, module) => {
    const {GLKernel: GLKernel} = require_kernel$5();
    const {FunctionBuilder: FunctionBuilder} = require_function_builder();
    const {WebGLFunctionNode: WebGLFunctionNode} = require_function_node$3();
    const {utils: utils} = require_utils();
    const mrud = require_math_random_uniformly_distributed();
    const {fragmentShader: fragmentShader} = require_fragment_shader$1();
    const {vertexShader: vertexShader} = require_vertex_shader$1();
    const {glKernelString: glKernelString} = require_kernel_string();
    const {lookupKernelValueType: lookupKernelValueType} = require_kernel_value_maps$1();
    let isSupported = null;
    let testCanvas = null;
    let testContext = null;
    let testExtensions = null;
    let features = null;
    const plugins = [ mrud ];
    const canvases = [];
    const maxTexSizes = {};
    var WebGLKernel = class extends GLKernel {
      static get isSupported() {
        if (isSupported !== null) return isSupported;
        this.setupFeatureChecks();
        isSupported = this.isContextMatch(testContext);
        return isSupported;
      }
      static setupFeatureChecks() {
        if (typeof document !== "undefined") testCanvas = document.createElement("canvas"); else if (typeof OffscreenCanvas !== "undefined") testCanvas = new OffscreenCanvas(0, 0);
        if (!testCanvas) return;
        testContext = testCanvas.getContext("webgl");
        if (!testContext && !(testCanvas instanceof OffscreenCanvas)) testContext = testCanvas.getContext("experimental-webgl");
        if (!testContext || !testContext.getExtension) return;
        testExtensions = {
          OES_texture_float: testContext.getExtension("OES_texture_float"),
          OES_texture_float_linear: testContext.getExtension("OES_texture_float_linear"),
          OES_element_index_uint: testContext.getExtension("OES_element_index_uint"),
          WEBGL_draw_buffers: testContext.getExtension("WEBGL_draw_buffers")
        };
        features = this.getFeatures();
      }
      static isContextMatch(context) {
        if (typeof WebGLRenderingContext !== "undefined") return context instanceof WebGLRenderingContext;
        return false;
      }
      static getIsTextureFloat() {
        return Boolean(testExtensions.OES_texture_float);
      }
      static getIsDrawBuffers() {
        return Boolean(testExtensions.WEBGL_draw_buffers);
      }
      static getChannelCount() {
        return testExtensions.WEBGL_draw_buffers ? testContext.getParameter(testExtensions.WEBGL_draw_buffers.MAX_DRAW_BUFFERS_WEBGL) : 1;
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
      static get features() {
        return features;
      }
      static get fragmentShader() {
        return fragmentShader;
      }
      static get vertexShader() {
        return vertexShader;
      }
      constructor(source, settings) {
        super(source, settings);
        this.program = null;
        this.pipeline = settings.pipeline;
        this.endianness = utils.systemEndianness();
        this.extensions = {};
        this.argumentTextureCount = 0;
        this.constantTextureCount = 0;
        this.fragShader = null;
        this.vertShader = null;
        this.drawBuffersMap = null;
        this.maxTexSize = null;
        this.onRequestSwitchKernel = null;
        this.texture = null;
        this.mappedTextures = null;
        this.mergeSettings(source.settings || settings);
        this.threadDim = null;
        this.framebuffer = null;
        this.buffer = null;
        this.textureCache = [];
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
        if (typeof document !== "undefined") {
          const canvas = document.createElement("canvas");
          canvas.width = 2;
          canvas.height = 2;
          return canvas;
        } else if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(0, 0);
      }
      initContext() {
        const settings = {
          alpha: false,
          depth: false,
          antialias: false
        };
        return this.canvas.getContext("webgl", settings) || this.canvas.getContext("experimental-webgl", settings);
      }
      initPlugins(settings) {
        const pluginsToUse = [];
        const {source: source} = this;
        if (typeof source === "string") for (let i = 0; i < plugins.length; i++) {
          const plugin = plugins[i];
          if (source.match(plugin.functionMatch)) pluginsToUse.push(plugin);
        } else if (typeof source === "object") {
          if (settings.pluginNames) for (let i = 0; i < plugins.length; i++) {
            const plugin = plugins[i];
            if (settings.pluginNames.some(pluginName => pluginName === plugin.name)) pluginsToUse.push(plugin);
          }
        }
        return pluginsToUse;
      }
      initExtensions() {
        this.extensions = {
          OES_texture_float: this.context.getExtension("OES_texture_float"),
          OES_texture_float_linear: this.context.getExtension("OES_texture_float_linear"),
          OES_element_index_uint: this.context.getExtension("OES_element_index_uint"),
          WEBGL_draw_buffers: this.context.getExtension("WEBGL_draw_buffers"),
          WEBGL_color_buffer_float: this.context.getExtension("WEBGL_color_buffer_float")
        };
      }
      validateSettings(args) {
        if (!this.validate) {
          this.texSize = utils.getKernelTextureSize({
            optimizeFloatMemory: this.optimizeFloatMemory,
            precision: this.precision
          }, this.output);
          return;
        }
        const {features: features} = this.constructor;
        if (this.optimizeFloatMemory === true && !features.isTextureFloat) throw new Error("Float textures are not supported"); else if (this.precision === "single" && !features.isFloatRead) throw new Error("Single precision not supported"); else if (!this.graphical && this.precision === null) this.precision = features.isTextureFloat && features.isFloatRead ? "single" : "unsigned";
        if (this.subKernels && this.subKernels.length > 0 && !this.extensions.WEBGL_draw_buffers) throw new Error("could not instantiate draw buffers extension");
        if (this.fixIntegerDivisionAccuracy === null) this.fixIntegerDivisionAccuracy = !features.isIntegerDivisionAccurate; else if (this.fixIntegerDivisionAccuracy && features.isIntegerDivisionAccurate) this.fixIntegerDivisionAccuracy = false;
        this.checkOutput();
        if (!this.output || this.output.length === 0) {
          if (args.length !== 1) throw new Error("Auto output only supported for kernels with only one input");
          const argType = utils.getVariableType(args[0], this.strictIntegers);
          switch (argType) {
           case "Array":
            this.output = utils.getDimensions(argType);
            break;

           case "NumberTexture":
           case "MemoryOptimizedNumberTexture":
           case "ArrayTexture(1)":
           case "ArrayTexture(2)":
           case "ArrayTexture(3)":
           case "ArrayTexture(4)":
            this.output = args[0].output;
            break;

           default:
            throw new Error("Auto output not supported for input type: " + argType);
          }
        }
        if (this.graphical) {
          if (this.output.length !== 2) throw new Error("Output must have 2 dimensions on graphical mode");
          if (this.precision === "precision") {
            this.precision = "unsigned";
            console.warn("Cannot use graphical mode and single precision at the same time");
          }
          this.texSize = utils.clone(this.output);
          return;
        } else if (this.precision === null && features.isTextureFloat) this.precision = "single";
        this.texSize = utils.getKernelTextureSize({
          optimizeFloatMemory: this.optimizeFloatMemory,
          precision: this.precision
        }, this.output);
        this.checkTextureSize();
      }
      updateMaxTexSize() {
        const {texSize: texSize, canvas: canvas} = this;
        if (this.maxTexSize === null) {
          let canvasIndex = canvases.indexOf(canvas);
          if (canvasIndex === -1) {
            canvasIndex = canvases.length;
            canvases.push(canvas);
            maxTexSizes[canvasIndex] = [ texSize[0], texSize[1] ];
          }
          this.maxTexSize = maxTexSizes[canvasIndex];
        }
        if (this.maxTexSize[0] < texSize[0]) this.maxTexSize[0] = texSize[0];
        if (this.maxTexSize[1] < texSize[1]) this.maxTexSize[1] = texSize[1];
      }
      setupArguments(args) {
        this.kernelArguments = [];
        this.argumentTextureCount = 0;
        const needsArgumentTypes = this.argumentTypes === null;
        if (needsArgumentTypes) this.argumentTypes = [];
        this.argumentSizes = [];
        this.argumentBitRatios = [];
        if (args.length < this.argumentNames.length) throw new Error("not enough arguments for kernel"); else if (args.length > this.argumentNames.length) throw new Error("too many arguments for kernel");
        const {context: gl} = this;
        let textureIndexes = 0;
        const onRequestTexture = () => this.createTexture();
        const onRequestIndex = () => this.constantTextureCount + textureIndexes++;
        const onUpdateValueMismatch = constructor => {
          this.switchKernels({
            type: "argumentMismatch",
            needed: constructor
          });
        };
        const onRequestContextHandle = () => gl.TEXTURE0 + this.constantTextureCount + this.argumentTextureCount++;
        for (let index = 0; index < args.length; index++) {
          const value = args[index];
          const name = this.argumentNames[index];
          let type;
          if (needsArgumentTypes) {
            type = utils.getVariableType(value, this.strictIntegers);
            this.argumentTypes.push(type);
          } else type = this.argumentTypes[index];
          const KernelValue = this.constructor.lookupKernelValueType(type, this.dynamicArguments ? "dynamic" : "static", this.precision, args[index]);
          if (KernelValue === null) return this.requestFallback(args, `argument "${this.argumentNames[index]}" of type ${type} is not supported by ${this.constructor.name}`);
          const kernelArgument = new KernelValue(value, {
            name: name,
            type: type,
            tactic: this.tactic,
            origin: "user",
            context: gl,
            checkContext: this.checkContext,
            kernel: this,
            strictIntegers: this.strictIntegers,
            onRequestTexture: onRequestTexture,
            onRequestIndex: onRequestIndex,
            onUpdateValueMismatch: onUpdateValueMismatch,
            onRequestContextHandle: onRequestContextHandle
          });
          this.kernelArguments.push(kernelArgument);
          kernelArgument.setup();
          this.argumentSizes.push(kernelArgument.textureSize);
          this.argumentBitRatios[index] = kernelArgument.bitRatio;
        }
      }
      createTexture() {
        const texture = this.context.createTexture();
        this.textureCache.push(texture);
        return texture;
      }
      deleteTexture(texture) {
        const index = this.textureCache.indexOf(texture);
        if (index !== -1) this.textureCache.splice(index, 1);
        if (!this.context) return;
        this.context.deleteTexture(texture);
      }
      setupConstants(args) {
        const {context: gl} = this;
        this.kernelConstants = [];
        this.forceUploadKernelConstants = [];
        let needsConstantTypes = this.constantTypes === null;
        if (needsConstantTypes) this.constantTypes = {};
        this.constantBitRatios = {};
        let textureIndexes = 0;
        for (const name in this.constants) {
          const value = this.constants[name];
          let type;
          if (needsConstantTypes) {
            type = utils.getVariableType(value, this.strictIntegers);
            this.constantTypes[name] = type;
          } else type = this.constantTypes[name];
          const KernelValue = this.constructor.lookupKernelValueType(type, "static", this.precision, value);
          if (KernelValue === null) return this.requestFallback(args, `constant "${name}" of type ${type} is not supported by ${this.constructor.name}`);
          const kernelValue = new KernelValue(value, {
            name: name,
            type: type,
            tactic: this.tactic,
            origin: "constants",
            context: this.context,
            checkContext: this.checkContext,
            kernel: this,
            strictIntegers: this.strictIntegers,
            onRequestTexture: () => this.createTexture(),
            onRequestIndex: () => textureIndexes++,
            onRequestContextHandle: () => gl.TEXTURE0 + this.constantTextureCount++
          });
          this.constantBitRatios[name] = kernelValue.bitRatio;
          this.kernelConstants.push(kernelValue);
          kernelValue.setup();
          if (kernelValue.forceUploadEachRun) this.forceUploadKernelConstants.push(kernelValue);
        }
      }
      build() {
        if (this.built) return;
        this.initExtensions();
        this.validateSettings(arguments);
        this.setupConstants(arguments);
        if (this.fallbackRequested) return;
        this.setupArguments(arguments);
        if (this.fallbackRequested) return;
        this.updateMaxTexSize();
        this.translateSource();
        const failureResult = this.pickRenderStrategy(arguments);
        if (failureResult) return failureResult;
        const {texSize: texSize, context: gl, canvas: canvas} = this;
        gl.enable(gl.SCISSOR_TEST);
        if (this.pipeline && this.precision === "single") {
          gl.viewport(0, 0, this.maxTexSize[0], this.maxTexSize[1]);
          canvas.width = this.maxTexSize[0];
          canvas.height = this.maxTexSize[1];
        } else {
          gl.viewport(0, 0, this.maxTexSize[0], this.maxTexSize[1]);
          canvas.width = this.maxTexSize[0];
          canvas.height = this.maxTexSize[1];
        }
        const threadDim = this.threadDim = Array.from(this.output);
        while (threadDim.length < 3) threadDim.push(1);
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
          console.log("GLSL Shader Output:");
          console.log(compiledFragmentShader);
        }
        if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) throw new Error("Error compiling vertex shader: " + gl.getShaderInfoLog(vertShader));
        if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) throw new Error("Error compiling fragment shader: " + gl.getShaderInfoLog(fragShader));
        const program = this.program = gl.createProgram();
        gl.attachShader(program, vertShader);
        gl.attachShader(program, fragShader);
        gl.linkProgram(program);
        this.framebuffer = gl.createFramebuffer();
        this.framebuffer.width = texSize[0];
        this.framebuffer.height = texSize[1];
        this.rawValueFramebuffers = {};
        const vertices = new Float32Array([ -1, -1, 1, -1, -1, 1, 1, 1 ]);
        const texCoords = new Float32Array([ 0, 0, 1, 0, 0, 1, 1, 1 ]);
        const texCoordOffset = vertices.byteLength;
        let buffer = this.buffer;
        if (!buffer) {
          buffer = this.buffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(gl.ARRAY_BUFFER, vertices.byteLength + texCoords.byteLength, gl.STATIC_DRAW);
        } else gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
        gl.bufferSubData(gl.ARRAY_BUFFER, texCoordOffset, texCoords);
        const aPosLoc = gl.getAttribLocation(this.program, "aPos");
        if (aPosLoc !== -1) {
          gl.enableVertexAttribArray(aPosLoc);
          gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);
        }
        const aTexCoordLoc = gl.getAttribLocation(this.program, "aTexCoord");
        if (aTexCoordLoc !== -1) {
          gl.enableVertexAttribArray(aTexCoordLoc);
          gl.vertexAttribPointer(aTexCoordLoc, 2, gl.FLOAT, false, 0, texCoordOffset);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        let i = 0;
        gl.useProgram(this.program);
        for (let p in this.constants) this.kernelConstants[i++].updateValue(this.constants[p]);
        this._setupOutputTexture();
        if (this.subKernels !== null && this.subKernels.length > 0) {
          this._mappedTextureSwitched = {};
          this._setupSubOutputTextures();
        }
        this.buildSignature(arguments);
        this.built = true;
      }
      translateSource() {
        const functionBuilder = FunctionBuilder.fromKernel(this, WebGLFunctionNode, {
          fixIntegerDivisionAccuracy: this.fixIntegerDivisionAccuracy
        });
        this.translatedSource = functionBuilder.getPrototypeString("kernel");
        this.setupReturnTypes(functionBuilder);
      }
      setupReturnTypes(functionBuilder) {
        if (!this.graphical && !this.returnType) this.returnType = functionBuilder.getKernelResultType();
        if (this.subKernels && this.subKernels.length > 0) for (let i = 0; i < this.subKernels.length; i++) {
          const subKernel = this.subKernels[i];
          if (!subKernel.returnType) subKernel.returnType = functionBuilder.getSubKernelResultType(i);
        }
      }
      run() {
        const {kernelArguments: kernelArguments, kernelConstants: kernelConstants, texSize: texSize, forceUploadKernelConstants: forceUploadKernelConstants, context: gl} = this;
        gl.useProgram(this.program);
        gl.scissor(0, 0, texSize[0], texSize[1]);
        if (this.dynamicOutput) {
          this.setUniform3iv("uOutputDim", new Int32Array(this.threadDim));
          this.setUniform2iv("uTexSize", texSize);
        }
        this.setUniform2f("ratio", texSize[0] / this.maxTexSize[0], texSize[1] / this.maxTexSize[1]);
        for (let i = 0; i < kernelConstants.length; i++) kernelConstants[i].rebind();
        for (let i = 0; i < forceUploadKernelConstants.length; i++) {
          const constant = forceUploadKernelConstants[i];
          constant.updateValue(this.constants[constant.name]);
          if (this.switchingKernels) return;
        }
        for (let i = 0; i < kernelArguments.length; i++) {
          kernelArguments[i].updateValue(arguments[i]);
          if (this.switchingKernels) return;
        }
        if (this.plugins) for (let i = 0; i < this.plugins.length; i++) {
          const plugin = this.plugins[i];
          if (plugin.onBeforeRun) plugin.onBeforeRun(this);
        }
        if (this.graphical) {
          if (this.pipeline) {
            gl.bindRenderbuffer(gl.RENDERBUFFER, null);
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
            if (this.immutable) this._replaceOutputTexture();
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            return this.immutable ? this.texture.clone() : this.texture;
          }
          gl.bindRenderbuffer(gl.RENDERBUFFER, null);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          return;
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        this._replaceOutputTexture();
        if (this.subKernels !== null) {
          if (this.immutable) this._replaceSubOutputTextures();
          this.drawBuffers();
        }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      drawBuffers() {
        this.extensions.WEBGL_draw_buffers.drawBuffersWEBGL(this.drawBuffersMap);
      }
      getInternalFormat() {
        return this.context.RGBA;
      }
      getTextureFormat() {
        const {context: gl} = this;
        switch (this.getInternalFormat()) {
         case gl.RGBA:
          return gl.RGBA;

         default:
          throw new Error("Unknown internal format");
        }
      }
      _replaceOutputTexture() {
        if (this.texture.beforeMutate() || this._textureSwitched) {
          const gl = this.context;
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture.texture, 0);
          this._textureSwitched = false;
        }
      }
      _setupOutputTexture() {
        const gl = this.context;
        const texSize = this.texSize;
        if (this.texture) {
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture.texture, 0);
          return;
        }
        const texture = this.createTexture();
        gl.activeTexture(gl.TEXTURE0 + this.constantTextureCount + this.argumentTextureCount);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        const format = this.getInternalFormat();
        if (this.precision === "single") gl.texImage2D(gl.TEXTURE_2D, 0, format, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null); else gl.texImage2D(gl.TEXTURE_2D, 0, format, texSize[0], texSize[1], 0, format, gl.UNSIGNED_BYTE, null);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        this.texture = new this.TextureConstructor({
          texture: texture,
          size: texSize,
          dimensions: this.threadDim,
          output: this.output,
          context: this.context,
          internalFormat: this.getInternalFormat(),
          textureFormat: this.getTextureFormat(),
          kernel: this
        });
      }
      _replaceSubOutputTextures() {
        const gl = this.context;
        for (let i = 0; i < this.mappedTextures.length; i++) {
          const mappedTexture = this.mappedTextures[i];
          if (mappedTexture.beforeMutate() || this._mappedTextureSwitched[i]) {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i + 1, gl.TEXTURE_2D, mappedTexture.texture, 0);
            this._mappedTextureSwitched[i] = false;
          }
        }
      }
      _setupSubOutputTextures() {
        const gl = this.context;
        if (this.mappedTextures) {
          for (let i = 0; i < this.subKernels.length; i++) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i + 1, gl.TEXTURE_2D, this.mappedTextures[i].texture, 0);
          return;
        }
        const texSize = this.texSize;
        this.drawBuffersMap = [ gl.COLOR_ATTACHMENT0 ];
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
          if (this.precision === "single") gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null); else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i + 1, gl.TEXTURE_2D, texture, 0);
          this.mappedTextures.push(new this.TextureConstructor({
            texture: texture,
            size: texSize,
            dimensions: this.threadDim,
            output: this.output,
            context: this.context,
            internalFormat: this.getInternalFormat(),
            textureFormat: this.getTextureFormat(),
            kernel: this
          }));
        }
      }
      setUniform1f(name, value) {
        if (this.uniform1fCache.hasOwnProperty(name)) {
          if (value === this.uniform1fCache[name]) return;
        }
        this.uniform1fCache[name] = value;
        const loc = this.getUniformLocation(name);
        this.context.uniform1f(loc, value);
      }
      setUniform1i(name, value) {
        if (this.uniform1iCache.hasOwnProperty(name)) {
          if (value === this.uniform1iCache[name]) return;
        }
        this.uniform1iCache[name] = value;
        const loc = this.getUniformLocation(name);
        this.context.uniform1i(loc, value);
      }
      setUniform2f(name, value1, value2) {
        if (this.uniform2fCache.hasOwnProperty(name)) {
          const cache = this.uniform2fCache[name];
          if (value1 === cache[0] && value2 === cache[1]) return;
        }
        this.uniform2fCache[name] = [ value1, value2 ];
        const loc = this.getUniformLocation(name);
        this.context.uniform2f(loc, value1, value2);
      }
      setUniform2fv(name, value) {
        if (this.uniform2fvCache.hasOwnProperty(name)) {
          const cache = this.uniform2fvCache[name];
          if (value[0] === cache[0] && value[1] === cache[1]) return;
        }
        this.uniform2fvCache[name] = value;
        const loc = this.getUniformLocation(name);
        this.context.uniform2fv(loc, value);
      }
      setUniform2iv(name, value) {
        if (this.uniform2ivCache.hasOwnProperty(name)) {
          const cache = this.uniform2ivCache[name];
          if (value[0] === cache[0] && value[1] === cache[1]) return;
        }
        this.uniform2ivCache[name] = value;
        const loc = this.getUniformLocation(name);
        this.context.uniform2iv(loc, value);
      }
      setUniform3fv(name, value) {
        if (this.uniform3fvCache.hasOwnProperty(name)) {
          const cache = this.uniform3fvCache[name];
          if (value[0] === cache[0] && value[1] === cache[1] && value[2] === cache[2]) return;
        }
        this.uniform3fvCache[name] = value;
        const loc = this.getUniformLocation(name);
        this.context.uniform3fv(loc, value);
      }
      setUniform3iv(name, value) {
        if (this.uniform3ivCache.hasOwnProperty(name)) {
          const cache = this.uniform3ivCache[name];
          if (value[0] === cache[0] && value[1] === cache[1] && value[2] === cache[2]) return;
        }
        this.uniform3ivCache[name] = value;
        const loc = this.getUniformLocation(name);
        this.context.uniform3iv(loc, value);
      }
      setUniform4fv(name, value) {
        if (this.uniform4fvCache.hasOwnProperty(name)) {
          const cache = this.uniform4fvCache[name];
          if (value[0] === cache[0] && value[1] === cache[1] && value[2] === cache[2] && value[3] === cache[3]) return;
        }
        this.uniform4fvCache[name] = value;
        const loc = this.getUniformLocation(name);
        this.context.uniform4fv(loc, value);
      }
      setUniform4iv(name, value) {
        if (this.uniform4ivCache.hasOwnProperty(name)) {
          const cache = this.uniform4ivCache[name];
          if (value[0] === cache[0] && value[1] === cache[1] && value[2] === cache[2] && value[3] === cache[3]) return;
        }
        this.uniform4ivCache[name] = value;
        const loc = this.getUniformLocation(name);
        this.context.uniform4iv(loc, value);
      }
      getUniformLocation(name) {
        if (this.programUniformLocationCache.hasOwnProperty(name)) return this.programUniformLocationCache[name];
        return this.programUniformLocationCache[name] = this.context.getUniformLocation(this.program, name);
      }
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
          SAMPLER_2D_ARRAY_TACTIC_DECLARATION: this.getSampler2DArrayTacticDeclaration()
        };
      }
      _getVertShaderArtifactMap(args) {
        return {
          FLOAT_TACTIC_DECLARATION: this.getFloatTacticDeclaration(),
          INT_TACTIC_DECLARATION: this.getIntTacticDeclaration(),
          SAMPLER_2D_TACTIC_DECLARATION: this.getSampler2DTacticDeclaration(),
          SAMPLER_2D_ARRAY_TACTIC_DECLARATION: this.getSampler2DArrayTacticDeclaration()
        };
      }
      _getHeaderString() {
        return this.subKernels !== null ? "#extension GL_EXT_draw_buffers : require\n" : "";
      }
      _getLoopMaxString() {
        return this.loopMaxIterations ? ` ${parseInt(this.loopMaxIterations)};\n` : " 1000;\n";
      }
      _getPluginsString() {
        if (!this.plugins) return "\n";
        return this.plugins.map(plugin => plugin.source && this.source.match(plugin.functionMatch) ? plugin.source : "").join("\n");
      }
      _getConstantsString() {
        const result = [];
        const {threadDim: threadDim, texSize: texSize} = this;
        if (this.dynamicOutput) result.push("uniform ivec3 uOutputDim", "uniform ivec2 uTexSize"); else result.push(`ivec3 uOutputDim = ivec3(${threadDim[0]}, ${threadDim[1]}, ${threadDim[2]})`, `ivec2 uTexSize = ivec2(${texSize[0]}, ${texSize[1]})`);
        return utils.linesToString(result);
      }
      _getTextureCoordinate() {
        const subKernels = this.subKernels;
        if (subKernels === null || subKernels.length < 1) return "varying vec2 vTexCoord;\n"; else return "out vec2 vTexCoord;\n";
      }
      _getDecode32EndiannessString() {
        return this.endianness === "LE" ? "" : "  texel.rgba = texel.abgr;\n";
      }
      _getEncode32EndiannessString() {
        return this.endianness === "LE" ? "" : "  texel.rgba = texel.abgr;\n";
      }
      _getDivideWithIntegerCheckString() {
        return this.fixIntegerDivisionAccuracy ? `float divWithIntCheck(float x, float y) {\n  if (floor(x) == x && floor(y) == y) {\n    float q = floor(x / y + 0.5);\n    if (y * q == x) {\n      return q;\n    }\n  }\n  return x / y;\n}\n\nfloat integerCorrectionModulo(float number, float divisor) {\n  if (number < 0.0) {\n    number = abs(number);\n    if (divisor < 0.0) {\n      divisor = abs(divisor);\n    }\n    return -(number - (divisor * floor(divWithIntCheck(number, divisor))));\n  }\n  if (divisor < 0.0) {\n    divisor = abs(divisor);\n  }\n  return number - (divisor * floor(divWithIntCheck(number, divisor)));\n}` : "";
      }
      _getMainArgumentsString(args) {
        const results = [];
        const {argumentNames: argumentNames} = this;
        for (let i = 0; i < argumentNames.length; i++) results.push(this.kernelArguments[i].getSource(args[i]));
        return results.join("");
      }
      _getInjectedNative() {
        return this.injectedNative || "";
      }
      _getMainConstantsString() {
        const result = [];
        const {constants: constants} = this;
        if (constants) {
          let i = 0;
          for (const name in constants) {
            if (!this.constants.hasOwnProperty(name)) continue;
            result.push(this.kernelConstants[i++].getSource(this.constants[name]));
          }
        }
        return result.join("");
      }
      getRawValueFramebuffer(width, height) {
        if (!this.rawValueFramebuffers[width]) this.rawValueFramebuffers[width] = {};
        if (!this.rawValueFramebuffers[width][height]) {
          const framebuffer = this.context.createFramebuffer();
          framebuffer.width = width;
          framebuffer.height = height;
          this.rawValueFramebuffers[width][height] = framebuffer;
        }
        return this.rawValueFramebuffers[width][height];
      }
      getKernelResultDeclaration() {
        switch (this.returnType) {
         case "Array(2)":
          return "vec2 kernelResult";

         case "Array(3)":
          return "vec3 kernelResult";

         case "Array(4)":
          return "vec4 kernelResult";

         case "LiteralInteger":
         case "Float":
         case "Number":
         case "Integer":
          return "float kernelResult";

         default:
          if (this.graphical) return "float kernelResult"; else throw new Error(`unrecognized output type "${this.returnType}"`);
        }
      }
      getKernelString() {
        const result = [ this.getKernelResultDeclaration() ];
        const {subKernels: subKernels} = this;
        if (subKernels !== null) switch (this.returnType) {
         case "Number":
         case "Float":
         case "Integer":
          for (let i = 0; i < subKernels.length; i++) {
            const subKernel = subKernels[i];
            result.push(subKernel.returnType === "Integer" ? `int subKernelResult_${subKernel.name} = 0` : `float subKernelResult_${subKernel.name} = 0.0`);
          }
          break;

         case "Array(2)":
          for (let i = 0; i < subKernels.length; i++) result.push(`vec2 subKernelResult_${subKernels[i].name}`);
          break;

         case "Array(3)":
          for (let i = 0; i < subKernels.length; i++) result.push(`vec3 subKernelResult_${subKernels[i].name}`);
          break;

         case "Array(4)":
          for (let i = 0; i < subKernels.length; i++) result.push(`vec4 subKernelResult_${subKernels[i].name}`);
          break;
        }
        return utils.linesToString(result) + this.translatedSource;
      }
      getMainResultGraphical() {
        return utils.linesToString([ "  threadId = indexTo3D(index, uOutputDim)", "  kernel()", "  gl_FragColor = actualColor" ]);
      }
      getMainResultPackedPixels() {
        switch (this.returnType) {
         case "LiteralInteger":
         case "Number":
         case "Integer":
         case "Float":
          return this.getMainResultKernelPackedPixels() + this.getMainResultSubKernelPackedPixels();

         default:
          throw new Error(`packed output only usable with Numbers, "${this.returnType}" specified`);
        }
      }
      getMainResultKernelPackedPixels() {
        return utils.linesToString([ "  threadId = indexTo3D(index, uOutputDim)", "  kernel()", `  gl_FragData[0] = ${this.useLegacyEncoder ? "legacyEncode32" : "encode32"}(kernelResult)` ]);
      }
      getMainResultSubKernelPackedPixels() {
        const result = [];
        if (!this.subKernels) return "";
        for (let i = 0; i < this.subKernels.length; i++) if (this.subKernels[i].returnType === "Integer") result.push(`  gl_FragData[${i + 1}] = ${this.useLegacyEncoder ? "legacyEncode32" : "encode32"}(float(subKernelResult_${this.subKernels[i].name}))`); else result.push(`  gl_FragData[${i + 1}] = ${this.useLegacyEncoder ? "legacyEncode32" : "encode32"}(subKernelResult_${this.subKernels[i].name})`);
        return utils.linesToString(result);
      }
      getMainResultMemoryOptimizedFloats() {
        const result = [ "  index *= 4" ];
        switch (this.returnType) {
         case "Number":
         case "Integer":
         case "Float":
          const channels = [ "r", "g", "b", "a" ];
          for (let i = 0; i < channels.length; i++) {
            const channel = channels[i];
            this.getMainResultKernelMemoryOptimizedFloats(result, channel);
            this.getMainResultSubKernelMemoryOptimizedFloats(result, channel);
            if (i + 1 < channels.length) result.push("  index += 1");
          }
          break;

         default:
          throw new Error(`optimized output only usable with Numbers, ${this.returnType} specified`);
        }
        return utils.linesToString(result);
      }
      getMainResultKernelMemoryOptimizedFloats(result, channel) {
        result.push("  threadId = indexTo3D(index, uOutputDim)", "  kernel()", `  gl_FragData[0].${channel} = kernelResult`);
      }
      getMainResultSubKernelMemoryOptimizedFloats(result, channel) {
        if (!this.subKernels) return result;
        for (let i = 0; i < this.subKernels.length; i++) if (this.subKernels[i].returnType === "Integer") result.push(`  gl_FragData[${i + 1}].${channel} = float(subKernelResult_${this.subKernels[i].name})`); else result.push(`  gl_FragData[${i + 1}].${channel} = subKernelResult_${this.subKernels[i].name}`);
      }
      getMainResultKernelNumberTexture() {
        return [ "  threadId = indexTo3D(index, uOutputDim)", "  kernel()", "  gl_FragData[0][0] = kernelResult" ];
      }
      getMainResultSubKernelNumberTexture() {
        const result = [];
        if (!this.subKernels) return result;
        for (let i = 0; i < this.subKernels.length; ++i) {
          const subKernel = this.subKernels[i];
          if (subKernel.returnType === "Integer") result.push(`  gl_FragData[${i + 1}][0] = float(subKernelResult_${subKernel.name})`); else result.push(`  gl_FragData[${i + 1}][0] = subKernelResult_${subKernel.name}`);
        }
        return result;
      }
      getMainResultKernelArray2Texture() {
        return [ "  threadId = indexTo3D(index, uOutputDim)", "  kernel()", "  gl_FragData[0][0] = kernelResult[0]", "  gl_FragData[0][1] = kernelResult[1]" ];
      }
      getMainResultSubKernelArray2Texture() {
        const result = [];
        if (!this.subKernels) return result;
        for (let i = 0; i < this.subKernels.length; ++i) result.push(`  gl_FragData[${i + 1}][0] = subKernelResult_${this.subKernels[i].name}[0]`, `  gl_FragData[${i + 1}][1] = subKernelResult_${this.subKernels[i].name}[1]`);
        return result;
      }
      getMainResultKernelArray3Texture() {
        return [ "  threadId = indexTo3D(index, uOutputDim)", "  kernel()", "  gl_FragData[0][0] = kernelResult[0]", "  gl_FragData[0][1] = kernelResult[1]", "  gl_FragData[0][2] = kernelResult[2]" ];
      }
      getMainResultSubKernelArray3Texture() {
        const result = [];
        if (!this.subKernels) return result;
        for (let i = 0; i < this.subKernels.length; ++i) result.push(`  gl_FragData[${i + 1}][0] = subKernelResult_${this.subKernels[i].name}[0]`, `  gl_FragData[${i + 1}][1] = subKernelResult_${this.subKernels[i].name}[1]`, `  gl_FragData[${i + 1}][2] = subKernelResult_${this.subKernels[i].name}[2]`);
        return result;
      }
      getMainResultKernelArray4Texture() {
        return [ "  threadId = indexTo3D(index, uOutputDim)", "  kernel()", "  gl_FragData[0] = kernelResult" ];
      }
      getMainResultSubKernelArray4Texture() {
        const result = [];
        if (!this.subKernels) return result;
        switch (this.returnType) {
         case "Number":
         case "Float":
         case "Integer":
          for (let i = 0; i < this.subKernels.length; ++i) if (this.subKernels[i].returnType === "Integer") result.push(`  gl_FragData[${i + 1}] = float(subKernelResult_${this.subKernels[i].name})`); else result.push(`  gl_FragData[${i + 1}] = subKernelResult_${this.subKernels[i].name}`);
          break;

         case "Array(2)":
          for (let i = 0; i < this.subKernels.length; ++i) result.push(`  gl_FragData[${i + 1}][0] = subKernelResult_${this.subKernels[i].name}[0]`, `  gl_FragData[${i + 1}][1] = subKernelResult_${this.subKernels[i].name}[1]`);
          break;

         case "Array(3)":
          for (let i = 0; i < this.subKernels.length; ++i) result.push(`  gl_FragData[${i + 1}][0] = subKernelResult_${this.subKernels[i].name}[0]`, `  gl_FragData[${i + 1}][1] = subKernelResult_${this.subKernels[i].name}[1]`, `  gl_FragData[${i + 1}][2] = subKernelResult_${this.subKernels[i].name}[2]`);
          break;

         case "Array(4)":
          for (let i = 0; i < this.subKernels.length; ++i) result.push(`  gl_FragData[${i + 1}][0] = subKernelResult_${this.subKernels[i].name}[0]`, `  gl_FragData[${i + 1}][1] = subKernelResult_${this.subKernels[i].name}[1]`, `  gl_FragData[${i + 1}][2] = subKernelResult_${this.subKernels[i].name}[2]`, `  gl_FragData[${i + 1}][3] = subKernelResult_${this.subKernels[i].name}[3]`);
          break;
        }
        return result;
      }
      replaceArtifacts(src, map) {
        return src.replace(/[ ]*__([A-Z]+[0-9]*([_]?[A-Z]*[0-9]?)*)__;\n/g, (match, artifact) => {
          if (map.hasOwnProperty(artifact)) return map[artifact];
          throw `unhandled artifact ${artifact}`;
        });
      }
      getFragmentShader(args) {
        if (this.compiledFragmentShader !== null) return this.compiledFragmentShader;
        return this.compiledFragmentShader = this.replaceArtifacts(this.constructor.fragmentShader, this._getFragShaderArtifactMap(args));
      }
      getVertexShader(args) {
        if (this.compiledVertexShader !== null) return this.compiledVertexShader;
        return this.compiledVertexShader = this.replaceArtifacts(this.constructor.vertexShader, this._getVertShaderArtifactMap(args));
      }
      toString() {
        const setupContextString = utils.linesToString([ `const gl = context` ]);
        return glKernelString(this.constructor, arguments, this, setupContextString);
      }
      destroy(removeCanvasReferences) {
        if (!this.context) return;
        if (this.buffer) this.context.deleteBuffer(this.buffer);
        if (this.framebuffer) this.context.deleteFramebuffer(this.framebuffer);
        for (const width in this.rawValueFramebuffers) {
          for (const height in this.rawValueFramebuffers[width]) {
            this.context.deleteFramebuffer(this.rawValueFramebuffers[width][height]);
            delete this.rawValueFramebuffers[width][height];
          }
          delete this.rawValueFramebuffers[width];
        }
        if (this.vertShader) this.context.deleteShader(this.vertShader);
        if (this.fragShader) this.context.deleteShader(this.fragShader);
        if (this.program) this.context.deleteProgram(this.program);
        if (this.texture) {
          this.texture.delete();
          const textureCacheIndex = this.textureCache.indexOf(this.texture.texture);
          if (textureCacheIndex > -1) this.textureCache.splice(textureCacheIndex, 1);
          this.texture = null;
        }
        if (this.mappedTextures && this.mappedTextures.length) {
          for (let i = 0; i < this.mappedTextures.length; i++) {
            const mappedTexture = this.mappedTextures[i];
            mappedTexture.delete();
            const textureCacheIndex = this.textureCache.indexOf(mappedTexture.texture);
            if (textureCacheIndex > -1) this.textureCache.splice(textureCacheIndex, 1);
          }
          this.mappedTextures = null;
        }
        if (this.kernelArguments) for (let i = 0; i < this.kernelArguments.length; i++) this.kernelArguments[i].destroy();
        if (this.kernelConstants) for (let i = 0; i < this.kernelConstants.length; i++) this.kernelConstants[i].destroy();
        while (this.textureCache.length > 0) {
          const texture = this.textureCache.pop();
          this.context.deleteTexture(texture);
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
        if (!this.gpu) return;
        const i = this.gpu.kernels.indexOf(this);
        if (i === -1) return;
        this.gpu.kernels.splice(i, 1);
      }
      destroyExtensions() {
        this.extensions.OES_texture_float = null;
        this.extensions.OES_texture_float_linear = null;
        this.extensions.OES_element_index_uint = null;
        this.extensions.WEBGL_draw_buffers = null;
      }
      static destroyContext(context) {
        const extension = context.getExtension("WEBGL_lose_context");
        if (extension) extension.loseContext();
      }
      toJSON() {
        const json = super.toJSON();
        json.functionNodes = FunctionBuilder.fromKernel(this, WebGLFunctionNode).toJSON();
        json.settings.threadDim = this.threadDim;
        return json;
      }
    };
    module.exports = {
      WebGLKernel: WebGLKernel
    };
  });
  var require_kernel$3 = __commonJSMin((exports, module) => {
    let getContext = null;
    try {
      getContext = require_empty_module();
    } catch (e) {}
    const {WebGLKernel: WebGLKernel} = require_kernel$4();
    const {glKernelString: glKernelString} = require_kernel_string();
    let isSupported = null;
    let testCanvas = null;
    let testContext = null;
    let testExtensions = null;
    let features = null;
    var HeadlessGLKernel = class extends WebGLKernel {
      static get isSupported() {
        if (isSupported !== null) return isSupported;
        this.setupFeatureChecks();
        isSupported = testContext !== null;
        return isSupported;
      }
      static setupFeatureChecks() {
        testCanvas = null;
        testExtensions = null;
        if (typeof getContext !== "function") return;
        try {
          testContext = getContext(2, 2, {
            preserveDrawingBuffer: true
          });
          if (!testContext || !testContext.getExtension) return;
          testExtensions = {
            STACKGL_resize_drawingbuffer: testContext.getExtension("STACKGL_resize_drawingbuffer"),
            STACKGL_destroy_context: testContext.getExtension("STACKGL_destroy_context"),
            OES_texture_float: testContext.getExtension("OES_texture_float"),
            OES_texture_float_linear: testContext.getExtension("OES_texture_float_linear"),
            OES_element_index_uint: testContext.getExtension("OES_element_index_uint"),
            WEBGL_draw_buffers: testContext.getExtension("WEBGL_draw_buffers"),
            WEBGL_color_buffer_float: testContext.getExtension("WEBGL_color_buffer_float")
          };
          features = this.getFeatures();
        } catch (e) {
          console.warn(e);
        }
      }
      static isContextMatch(context) {
        try {
          return context.getParameter(context.RENDERER) === "ANGLE";
        } catch (e) {
          return false;
        }
      }
      static getIsTextureFloat() {
        return Boolean(testExtensions.OES_texture_float);
      }
      static getIsDrawBuffers() {
        return Boolean(testExtensions.WEBGL_draw_buffers);
      }
      static getChannelCount() {
        return testExtensions.WEBGL_draw_buffers ? testContext.getParameter(testExtensions.WEBGL_draw_buffers.MAX_DRAW_BUFFERS_WEBGL) : 1;
      }
      static getMaxTextureSize() {
        return testContext.getParameter(testContext.MAX_TEXTURE_SIZE);
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
      initCanvas() {
        return {};
      }
      initContext() {
        return getContext(2, 2, {
          preserveDrawingBuffer: true
        });
      }
      initExtensions() {
        this.extensions = {
          STACKGL_resize_drawingbuffer: this.context.getExtension("STACKGL_resize_drawingbuffer"),
          STACKGL_destroy_context: this.context.getExtension("STACKGL_destroy_context"),
          OES_texture_float: this.context.getExtension("OES_texture_float"),
          OES_texture_float_linear: this.context.getExtension("OES_texture_float_linear"),
          OES_element_index_uint: this.context.getExtension("OES_element_index_uint"),
          WEBGL_draw_buffers: this.context.getExtension("WEBGL_draw_buffers")
        };
      }
      build() {
        super.build.apply(this, arguments);
        if (!this.fallbackRequested) this.extensions.STACKGL_resize_drawingbuffer.resize(this.maxTexSize[0], this.maxTexSize[1]);
      }
      destroyExtensions() {
        this.extensions.STACKGL_resize_drawingbuffer = null;
        this.extensions.STACKGL_destroy_context = null;
        this.extensions.OES_texture_float = null;
        this.extensions.OES_texture_float_linear = null;
        this.extensions.OES_element_index_uint = null;
        this.extensions.WEBGL_draw_buffers = null;
      }
      static destroyContext(context) {
        const extension = context.getExtension("STACKGL_destroy_context");
        if (extension && extension.destroy) extension.destroy();
      }
      toString() {
        return glKernelString(this.constructor, arguments, this, `const gl = context || require('gl')(1, 1);\n`, `    if (!context) { gl.getExtension('STACKGL_destroy_context').destroy(); }\n`);
      }
      setOutput(output) {
        super.setOutput(output);
        if (this.graphical && this.extensions.STACKGL_resize_drawingbuffer) this.extensions.STACKGL_resize_drawingbuffer.resize(this.maxTexSize[0], this.maxTexSize[1]);
        return this;
      }
    };
    module.exports = {
      HeadlessGLKernel: HeadlessGLKernel
    };
  });
  var require_function_node$2 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLFunctionNode: WebGLFunctionNode} = require_function_node$3();
    var WebGL2FunctionNode = class extends WebGLFunctionNode {
      astIdentifierExpression(idtNode, retArr) {
        if (idtNode.type !== "Identifier") throw this.astErrorOutput("IdentifierExpression - not an Identifier", idtNode);
        const type = this.getType(idtNode);
        const name = utils.sanitizeName(idtNode.name);
        if (idtNode.name === "Infinity") retArr.push("intBitsToFloat(2139095039)"); else if (type === "Boolean") if (this.argumentNames.indexOf(name) > -1) {
          const marked = this.markupUserName(idtNode.name);
          retArr.push(marked.startsWith("cellShadow_") ? marked : `bool(${marked})`);
        } else retArr.push(`user_${name}`); else retArr.push(this.markupUserName(idtNode.name));
        return retArr;
      }
    };
    module.exports = {
      WebGL2FunctionNode: WebGL2FunctionNode
    };
  });
  var require_fragment_shader = __commonJSMin((exports, module) => {
    module.exports = {
      fragmentShader: `#version 300 es\n__HEADER__;\n__FLOAT_TACTIC_DECLARATION__;\n__INT_TACTIC_DECLARATION__;\n__SAMPLER_2D_TACTIC_DECLARATION__;\n__SAMPLER_2D_ARRAY_TACTIC_DECLARATION__;\n\nconst int LOOP_MAX = __LOOP_MAX__;\n\n__PLUGINS__;\n__CONSTANTS__;\n\nin vec2 vTexCoord;\n\nfloat atan2(float v1, float v2) {\n  if (v2 == 0.0) {\n    if (v1 == 0.0) return 0.0;\n    if (v1 > 0.0) return 1.5707963267948966;\n    if (v1 < 0.0) return -1.5707963267948966;\n  }\n  return atan(v1, v2);\n}\n\nfloat cbrt(float x) {\n  if (x >= 0.0) {\n    return pow(x, 1.0 / 3.0);\n  } else {\n    return -pow(x, 1.0 / 3.0);\n  }\n}\n\nfloat expm1(float x) {\n  return pow(${Math.E}, x) - 1.0; \n}\n\nfloat fround(highp float x) {\n  return x;\n}\n\nfloat imul(float v1, float v2) {\n  return float(int(v1) * int(v2));\n}\n\nfloat log10(float x) {\n  return log2(x) * (1.0 / log2(10.0));\n}\n\nfloat log1p(float x) {\n  return log(1.0 + x);\n}\n\nfloat _pow(float v1, float v2) {\n  if (v2 == 0.0) return 1.0;\n  return pow(v1, v2);\n}\n\nfloat _round(float x) {\n  return floor(x + 0.5);\n}\n\n\nconst int BIT_COUNT = 32;\nint modi(int x, int y) {\n  return x - y * (x / y);\n}\n\nint bitwiseOr(int a, int b) {\n  int result = 0;\n  int n = 1;\n  \n  for (int i = 0; i < BIT_COUNT; i++) {\n    if ((modi(a, 2) == 1) || (modi(b, 2) == 1)) {\n      result += n;\n    }\n    a = a / 2;\n    b = b / 2;\n    n = n * 2;\n    if(!(a > 0 || b > 0)) {\n      break;\n    }\n  }\n  return result;\n}\nint bitwiseXOR(int a, int b) {\n  int result = 0;\n  int n = 1;\n  \n  for (int i = 0; i < BIT_COUNT; i++) {\n    if ((modi(a, 2) == 1) != (modi(b, 2) == 1)) {\n      result += n;\n    }\n    a = a / 2;\n    b = b / 2;\n    n = n * 2;\n    if(!(a > 0 || b > 0)) {\n      break;\n    }\n  }\n  return result;\n}\nint bitwiseAnd(int a, int b) {\n  int result = 0;\n  int n = 1;\n  for (int i = 0; i < BIT_COUNT; i++) {\n    if ((modi(a, 2) == 1) && (modi(b, 2) == 1)) {\n      result += n;\n    }\n    a = a / 2;\n    b = b / 2;\n    n = n * 2;\n    if(!(a > 0 && b > 0)) {\n      break;\n    }\n  }\n  return result;\n}\nint bitwiseNot(int a) {\n  // ~a is identically -a - 1 in two's complement, for every value including\n  // negatives. The previous bit-by-bit loop only worked for a >= 0, where it\n  // leaned on 32-bit overflow wrapping to reach the negative answer; given a\n  // negative input it computed ~abs(a), so ~(-1) gave -2 and ~~x never\n  // returned x.\n  return -a - 1;\n}\nint bitwiseZeroFillLeftShift(int n, int shift) {\n  int maxBytes = BIT_COUNT;\n  for (int i = 0; i < BIT_COUNT; i++) {\n    if (maxBytes >= n) {\n      break;\n    }\n    maxBytes *= 2;\n  }\n  for (int i = 0; i < BIT_COUNT; i++) {\n    if (i >= shift) {\n      break;\n    }\n    n *= 2;\n  }\n\n  int result = 0;\n  int byteVal = 1;\n  for (int i = 0; i < BIT_COUNT; i++) {\n    if (i >= maxBytes) break;\n    if (modi(n, 2) > 0) { result += byteVal; }\n    n = int(n / 2);\n    byteVal *= 2;\n  }\n  return result;\n}\n\n// _pow2 is defined further down, alongside encode32/decode32\nfloat _pow2(float e);\nint bitwiseSignedRightShift(int num, int shifts) {\n  // pow(2.0, n) is approximate on many GPUs, and landing 1 ulp high makes the\n  // division fall just under a whole number, which floor() then rounds away:\n  // 2 >> 1 came out 0, 8 >> 1 came out 3. Only exact left operands were\n  // affected, odd ones having enough slack to survive. _pow2 is exact.\n  return int(floor(float(num) / _pow2(float(shifts))));\n}\n\nint bitwiseZeroFillRightShift(int n, int shift) {\n  int maxBytes = BIT_COUNT;\n  for (int i = 0; i < BIT_COUNT; i++) {\n    if (maxBytes >= n) {\n      break;\n    }\n    maxBytes *= 2;\n  }\n  for (int i = 0; i < BIT_COUNT; i++) {\n    if (i >= shift) {\n      break;\n    }\n    n /= 2;\n  }\n  int result = 0;\n  int byteVal = 1;\n  for (int i = 0; i < BIT_COUNT; i++) {\n    if (i >= maxBytes) break;\n    if (modi(n, 2) > 0) { result += byteVal; }\n    n = int(n / 2);\n    byteVal *= 2;\n  }\n  return result;\n}\n\nvec2 integerMod(vec2 x, float y) {\n  vec2 res = floor(mod(x, y));\n  return res * step(1.0 - floor(y), -res);\n}\n\nvec3 integerMod(vec3 x, float y) {\n  vec3 res = floor(mod(x, y));\n  return res * step(1.0 - floor(y), -res);\n}\n\nvec4 integerMod(vec4 x, vec4 y) {\n  vec4 res = floor(mod(x, y));\n  return res * step(1.0 - floor(y), -res);\n}\n\nfloat integerMod(float x, float y) {\n  float res = floor(mod(x, y));\n  return res * (res > floor(y) - 1.0 ? 0.0 : 1.0);\n}\n\nint integerMod(int x, int y) {\n  return x - (y * int(x/y));\n}\n\n// GLSL ES 1.00 accepts only a constant or a loop symbol inside an index\n// expression, so m[y][x] does not compile when y and x come from kernel\n// arguments -- the error is "Index expression can only contain const or loop\n// symbols". Loop counters are legal indices, so walk the matrix with them\n// instead. These are 2x2 to 4x4, so it costs at most sixteen comparisons.\nfloat getMatrix2(mat2 m, int y, int x) {\n  float result = 0.0;\n  for (int i = 0; i < 2; i++) {\n    for (int j = 0; j < 2; j++) {\n      if (i == y && j == x) result = m[i][j];\n    }\n  }\n  return result;\n}\n\nfloat getMatrix3(mat3 m, int y, int x) {\n  float result = 0.0;\n  for (int i = 0; i < 3; i++) {\n    for (int j = 0; j < 3; j++) {\n      if (i == y && j == x) result = m[i][j];\n    }\n  }\n  return result;\n}\n\nfloat getMatrix4(mat4 m, int y, int x) {\n  float result = 0.0;\n  for (int i = 0; i < 4; i++) {\n    for (int j = 0; j < 4; j++) {\n      if (i == y && j == x) result = m[i][j];\n    }\n  }\n  return result;\n}\n\n__DIVIDE_WITH_INTEGER_CHECK__;\n\n// Here be dragons!\n// DO NOT OPTIMIZE THIS CODE\n// YOU WILL BREAK SOMETHING ON SOMEBODY'S MACHINE\n// LEAVE IT AS IT IS, LEST YOU WASTE YOUR OWN TIME\n// Exact powers of two built from exact constant multiplies: exp2/log2/pow\n// are approximate on some GPUs (notably Apple silicon), and 1-2 ulp there\n// corrupts the packed bytes (#659)\nfloat _pow2(float e) {\n  float r = 1.0;\n  float a = abs(e);\n  bool n = e < 0.0;\n  if (a >= 64.0) { r *= n ? 5.421010862427522e-20 : 18446744073709551616.0; a -= 64.0; }\n  if (a >= 64.0) { r *= n ? 5.421010862427522e-20 : 18446744073709551616.0; a -= 64.0; }\n  if (a >= 32.0) { r *= n ? 2.3283064365386963e-10 : 4294967296.0; a -= 32.0; }\n  if (a >= 16.0) { r *= n ? 0.0000152587890625 : 65536.0; a -= 16.0; }\n  if (a >= 8.0) { r *= n ? 0.00390625 : 256.0; a -= 8.0; }\n  if (a >= 4.0) { r *= n ? 0.0625 : 16.0; a -= 4.0; }\n  if (a >= 2.0) { r *= n ? 0.25 : 4.0; a -= 2.0; }\n  if (a >= 1.0) { r *= n ? 0.5 : 2.0; }\n  return r;\n}\nconst vec2 MAGIC_VEC = vec2(1.0, -256.0);\nconst vec4 SCALE_FACTOR = vec4(1.0, 256.0, 65536.0, 0.0);\nconst vec4 SCALE_FACTOR_INV = vec4(1.0, 0.00390625, 0.0000152587890625, 0.0); // 1, 1/256, 1/65536\nfloat decode32(vec4 texel) {\n  __DECODE32_ENDIANNESS__;\n  texel *= 255.0;\n  vec2 gte128;\n  gte128.x = texel.b >= 128.0 ? 1.0 : 0.0;\n  gte128.y = texel.a >= 128.0 ? 1.0 : 0.0;\n  float exponent = 2.0 * texel.a - 127.0 + dot(gte128, MAGIC_VEC);\n  float res = _pow2(round(exponent));\n  texel.b = texel.b - 128.0 * gte128.x;\n  res = dot(texel, SCALE_FACTOR) * _pow2(round(exponent-23.0)) + res;\n  res *= gte128.y * -2.0 + 1.0;\n  return res;\n}\n\nfloat decode16(vec4 texel, int index) {\n  int channel = integerMod(index, 2);\n  return texel[channel*2] * 255.0 + texel[channel*2 + 1] * 65280.0;\n}\n\nfloat decode8(vec4 texel, int index) {\n  int channel = integerMod(index, 4);\n  return texel[channel] * 255.0;\n}\n\nvec4 legacyEncode32(float f) {\n  float F = abs(f);\n  float sign = f < 0.0 ? 1.0 : 0.0;\n  float exponent = floor(log2(F));\n  float mantissa = (exp2(-exponent) * F);\n  // exponent += floor(log2(mantissa));\n  vec4 texel = vec4(F * exp2(23.0-exponent)) * SCALE_FACTOR_INV;\n  texel.rg = integerMod(texel.rg, 256.0);\n  texel.b = integerMod(texel.b, 128.0);\n  texel.a = exponent*0.5 + 63.5;\n  texel.ba += vec2(integerMod(exponent+127.0, 2.0), sign) * 128.0;\n  texel = floor(texel);\n  texel *= 0.003921569; // 1/255\n  __ENCODE32_ENDIANNESS__;\n  return texel;\n}\n\n// https://github.com/gpujs/gpu.js/wiki/Encoder-details\nvec4 encode32(float value) {\n  if (value == 0.0) return vec4(0, 0, 0, 0);\n\n  float exponent;\n  float mantissa;\n  vec4  result;\n  float sgn;\n\n  sgn = step(0.0, -value);\n  value = abs(value);\n\n  exponent = floor(log2(value));\n  float p2 = _pow2(exponent);\n  // approximate log2 can land one off; correct by direct comparison\n  if (p2 > value) { exponent -= 1.0; p2 *= 0.5; }\n  else if (p2 * 2.0 <= value) { exponent += 1.0; p2 *= 2.0; }\n\n  mantissa = value / p2 - 1.0;\n  exponent = exponent+127.0;\n  result   = vec4(0,0,0,0);\n\n  result.a = floor(exponent/2.0);\n  exponent = exponent - result.a*2.0;\n  result.a = result.a + 128.0*sgn;\n\n  result.b = floor(mantissa * 128.0);\n  mantissa = mantissa - result.b / 128.0;\n  result.b = result.b + exponent*128.0;\n\n  result.g = floor(mantissa*32768.0);\n  mantissa = mantissa - result.g/32768.0;\n\n  result.r = floor(mantissa*8388608.0);\n  return result/255.0;\n}\n// Dragons end here\n\nint index;\nivec3 threadId;\n\nivec3 indexTo3D(int idx, ivec3 texDim) {\n  int z = int(idx / (texDim.x * texDim.y));\n  idx -= z * int(texDim.x * texDim.y);\n  int y = int(idx / texDim.x);\n  int x = int(integerMod(idx, texDim.x));\n  return ivec3(x, y, z);\n}\n\nfloat get32(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  int index = x + texDim.x * (y + texDim.y * z);\n  int w = texSize.x;\n  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;\n  vec4 texel = texture(tex, st / vec2(texSize));\n  return decode32(texel);\n}\n\nfloat get16(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  int index = x + (texDim.x * (y + (texDim.y * z)));\n  int w = texSize.x * 2;\n  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;\n  vec4 texel = texture(tex, st / vec2(texSize.x * 2, texSize.y));\n  return decode16(texel, index);\n}\n\nfloat get8(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  int index = x + (texDim.x * (y + (texDim.y * z)));\n  int w = texSize.x * 4;\n  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;\n  vec4 texel = texture(tex, st / vec2(texSize.x * 4, texSize.y));\n  return decode8(texel, index);\n}\n\nfloat getMemoryOptimized32(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  int index = x + (texDim.x * (y + (texDim.y * z)));\n  int channel = integerMod(index, 4);\n  index = index / 4;\n  int w = texSize.x;\n  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;\n  index = index / 4;\n  vec4 texel = texture(tex, st / vec2(texSize));\n  return texel[channel];\n}\n\nvec4 getImage2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  int index = x + texDim.x * (y + texDim.y * z);\n  int w = texSize.x;\n  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;\n  return texture(tex, st / vec2(texSize));\n}\n\nvec4 getImage3D(sampler2DArray tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  int index = x + texDim.x * (y + texDim.y * z);\n  int w = texSize.x;\n  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;\n  return texture(tex, vec3(st / vec2(texSize), z));\n}\n\nfloat getFloatFromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  vec4 result = getImage2D(tex, texSize, texDim, z, y, x);\n  return result[0];\n}\n\nvec2 getVec2FromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  vec4 result = getImage2D(tex, texSize, texDim, z, y, x);\n  return vec2(result[0], result[1]);\n}\n\nvec2 getMemoryOptimizedVec2(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  int index = x + texDim.x * (y + texDim.y * z);\n  int channel = integerMod(index, 2);\n  index = index / 2;\n  int w = texSize.x;\n  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;\n  vec4 texel = texture(tex, st / vec2(texSize));\n  if (channel == 0) return vec2(texel.r, texel.g);\n  if (channel == 1) return vec2(texel.b, texel.a);\n  return vec2(0.0, 0.0);\n}\n\nvec3 getVec3FromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  vec4 result = getImage2D(tex, texSize, texDim, z, y, x);\n  return vec3(result[0], result[1], result[2]);\n}\n\nvec3 getMemoryOptimizedVec3(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  int fieldIndex = 3 * (x + texDim.x * (y + texDim.y * z));\n  int vectorIndex = fieldIndex / 4;\n  int vectorOffset = fieldIndex - vectorIndex * 4;\n  int readY = vectorIndex / texSize.x;\n  int readX = vectorIndex - readY * texSize.x;\n  vec4 tex1 = texture(tex, (vec2(readX, readY) + 0.5) / vec2(texSize));\n\n  if (vectorOffset == 0) {\n    return tex1.xyz;\n  } else if (vectorOffset == 1) {\n    return tex1.yzw;\n  } else {\n    readX++;\n    if (readX >= texSize.x) {\n      readX = 0;\n      readY++;\n    }\n    vec4 tex2 = texture(tex, vec2(readX, readY) / vec2(texSize));\n    if (vectorOffset == 2) {\n      return vec3(tex1.z, tex1.w, tex2.x);\n    } else {\n      return vec3(tex1.w, tex2.x, tex2.y);\n    }\n  }\n}\n\nvec4 getVec4FromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  return getImage2D(tex, texSize, texDim, z, y, x);\n}\n\nvec4 getMemoryOptimizedVec4(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {\n  int index = x + texDim.x * (y + texDim.y * z);\n  int channel = integerMod(index, 2);\n  int w = texSize.x;\n  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;\n  vec4 texel = texture(tex, st / vec2(texSize));\n  return vec4(texel.r, texel.g, texel.b, texel.a);\n}\n\nvec4 actualColor;\nvoid color(float r, float g, float b, float a) {\n  actualColor = vec4(r,g,b,a);\n}\n\nvoid color(float r, float g, float b) {\n  color(r,g,b,1.0);\n}\n\nfloat modulo(float number, float divisor) {\n  if (number < 0.0) {\n    number = abs(number);\n    if (divisor < 0.0) {\n      divisor = abs(divisor);\n    }\n    return -mod(number, divisor);\n  }\n  if (divisor < 0.0) {\n    divisor = abs(divisor);\n  }\n  return mod(number, divisor);\n}\n\n__INJECTED_NATIVE__;\n__MAIN_CONSTANTS__;\n__MAIN_ARGUMENTS__;\n__KERNEL__;\n\nvoid main(void) {\n  index = int(vTexCoord.s * float(uTexSize.x)) + int(vTexCoord.t * float(uTexSize.y)) * uTexSize.x;\n  __MAIN_RESULT__;\n}`
    };
  });
  var require_vertex_shader = __commonJSMin((exports, module) => {
    module.exports = {
      vertexShader: `#version 300 es\n__FLOAT_TACTIC_DECLARATION__;\n__INT_TACTIC_DECLARATION__;\n__SAMPLER_2D_TACTIC_DECLARATION__;\n\nin vec2 aPos;\nin vec2 aTexCoord;\n\nout vec2 vTexCoord;\nuniform vec2 ratio;\n\nvoid main(void) {\n  gl_Position = vec4((aPos + vec2(1)) * ratio + vec2(-1), 0, 1);\n  vTexCoord = aTexCoord;\n}`
    };
  });
  var require_boolean = __commonJSMin((exports, module) => {
    const {WebGLKernelValueBoolean: WebGLKernelValueBoolean} = require_boolean$1();
    var WebGL2KernelValueBoolean = class extends WebGLKernelValueBoolean {};
    module.exports = {
      WebGL2KernelValueBoolean: WebGL2KernelValueBoolean
    };
  });
  var require_float = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueFloat: WebGLKernelValueFloat} = require_float$1();
    var WebGL2KernelValueFloat = class extends WebGLKernelValueFloat {};
    module.exports = {
      WebGL2KernelValueFloat: WebGL2KernelValueFloat
    };
  });
  var require_integer = __commonJSMin((exports, module) => {
    const {WebGLKernelValueInteger: WebGLKernelValueInteger} = require_integer$1();
    var WebGL2KernelValueInteger = class extends WebGLKernelValueInteger {
      getSource(value) {
        const variablePrecision = this.getVariablePrecisionString();
        if (this.origin === "constants") return `const ${variablePrecision} int ${this.id} = ${parseInt(value)};\n`;
        return `uniform ${variablePrecision} int ${this.id};\n`;
      }
      updateValue(value) {
        if (this.origin === "constants") return;
        this.kernel.setUniform1i(this.id, this.uploadValue = value);
      }
    };
    module.exports = {
      WebGL2KernelValueInteger: WebGL2KernelValueInteger
    };
  });
  var require_html_image = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueHTMLImage: WebGLKernelValueHTMLImage} = require_html_image$1();
    var WebGL2KernelValueHTMLImage = class extends WebGLKernelValueHTMLImage {
      getSource() {
        const variablePrecision = this.getVariablePrecisionString();
        return utils.linesToString([ `uniform ${variablePrecision} sampler2D ${this.id}`, `${variablePrecision} ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`, `${variablePrecision} ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})` ]);
      }
    };
    module.exports = {
      WebGL2KernelValueHTMLImage: WebGL2KernelValueHTMLImage
    };
  });
  var require_dynamic_html_image = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueDynamicHTMLImage: WebGLKernelValueDynamicHTMLImage} = require_dynamic_html_image$1();
    var WebGL2KernelValueDynamicHTMLImage = class extends WebGLKernelValueDynamicHTMLImage {
      getSource() {
        const variablePrecision = this.getVariablePrecisionString();
        return utils.linesToString([ `uniform ${variablePrecision} sampler2D ${this.id}`, `uniform ${variablePrecision} ivec2 ${this.sizeId}`, `uniform ${variablePrecision} ivec3 ${this.dimensionsId}` ]);
      }
    };
    module.exports = {
      WebGL2KernelValueDynamicHTMLImage: WebGL2KernelValueDynamicHTMLImage
    };
  });
  var require_html_image_array = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelArray: WebGLKernelArray} = require_array();
    var WebGL2KernelValueHTMLImageArray = class extends WebGLKernelArray {
      constructor(value, settings) {
        super(value, settings);
        this.checkSize(value[0].width, value[0].height);
        this.dimensions = [ value[0].width, value[0].height, value.length ];
        this.textureSize = [ value[0].width, value[0].height ];
      }
      defineTexture() {
        const {context: gl} = this;
        gl.activeTexture(this.contextHandle);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.texture);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      }
      getStringValueHandler() {
        return `const uploadValue_${this.name} = ${this.varName};\n`;
      }
      getSource() {
        const variablePrecision = this.getVariablePrecisionString();
        return utils.linesToString([ `uniform ${variablePrecision} sampler2DArray ${this.id}`, `${variablePrecision} ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`, `${variablePrecision} ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})` ]);
      }
      updateValue(images) {
        const {context: gl} = this;
        gl.activeTexture(this.contextHandle);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA, images[0].width, images[0].height, images.length, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        for (let i = 0; i < images.length; i++) gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, images[i].width, images[i].height, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.uploadValue = images[i]);
        this.kernel.setUniform1i(this.id, this.index);
      }
    };
    module.exports = {
      WebGL2KernelValueHTMLImageArray: WebGL2KernelValueHTMLImageArray
    };
  });
  var require_dynamic_html_image_array = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGL2KernelValueHTMLImageArray: WebGL2KernelValueHTMLImageArray} = require_html_image_array();
    var WebGL2KernelValueDynamicHTMLImageArray = class extends WebGL2KernelValueHTMLImageArray {
      getSource() {
        const variablePrecision = this.getVariablePrecisionString();
        return utils.linesToString([ `uniform ${variablePrecision} sampler2DArray ${this.id}`, `uniform ${variablePrecision} ivec2 ${this.sizeId}`, `uniform ${variablePrecision} ivec3 ${this.dimensionsId}` ]);
      }
      updateValue(images) {
        const {width: width, height: height} = images[0];
        this.checkSize(width, height);
        this.dimensions = [ width, height, images.length ];
        this.textureSize = [ width, height ];
        this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
        this.kernel.setUniform2iv(this.sizeId, this.textureSize);
        super.updateValue(images);
      }
    };
    module.exports = {
      WebGL2KernelValueDynamicHTMLImageArray: WebGL2KernelValueDynamicHTMLImageArray
    };
  });
  var require_html_video = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGL2KernelValueHTMLImage: WebGL2KernelValueHTMLImage} = require_html_image();
    var WebGL2KernelValueHTMLVideo = class extends WebGL2KernelValueHTMLImage {};
    module.exports = {
      WebGL2KernelValueHTMLVideo: WebGL2KernelValueHTMLVideo
    };
  });
  var require_dynamic_html_video = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGL2KernelValueDynamicHTMLImage: WebGL2KernelValueDynamicHTMLImage} = require_dynamic_html_image();
    var WebGL2KernelValueDynamicHTMLVideo = class extends WebGL2KernelValueDynamicHTMLImage {};
    module.exports = {
      WebGL2KernelValueDynamicHTMLVideo: WebGL2KernelValueDynamicHTMLVideo
    };
  });
  var require_single_input = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueSingleInput: WebGLKernelValueSingleInput} = require_single_input$1();
    var WebGL2KernelValueSingleInput = class extends WebGLKernelValueSingleInput {
      getSource() {
        const variablePrecision = this.getVariablePrecisionString();
        return utils.linesToString([ `uniform ${variablePrecision} sampler2D ${this.id}`, `${variablePrecision} ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`, `${variablePrecision} ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})` ]);
      }
      updateValue(input) {
        const {context: gl} = this;
        utils.flattenTo(input.value, this.uploadValue);
        gl.activeTexture(this.contextHandle);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
        this.kernel.setUniform1i(this.id, this.index);
      }
    };
    module.exports = {
      WebGL2KernelValueSingleInput: WebGL2KernelValueSingleInput
    };
  });
  var require_dynamic_single_input = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGL2KernelValueSingleInput: WebGL2KernelValueSingleInput} = require_single_input();
    var WebGL2KernelValueDynamicSingleInput = class extends WebGL2KernelValueSingleInput {
      getSource() {
        const variablePrecision = this.getVariablePrecisionString();
        return utils.linesToString([ `uniform ${variablePrecision} sampler2D ${this.id}`, `uniform ${variablePrecision} ivec2 ${this.sizeId}`, `uniform ${variablePrecision} ivec3 ${this.dimensionsId}` ]);
      }
      updateValue(value) {
        let [w, h, d] = value.size;
        this.dimensions = new Int32Array([ w || 1, h || 1, d || 1 ]);
        this.textureSize = utils.getMemoryOptimizedFloatTextureSize(this.dimensions, this.bitRatio);
        this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
        this.checkSize(this.textureSize[0], this.textureSize[1]);
        this.uploadValue = new Float32Array(this.uploadArrayLength);
        this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
        this.kernel.setUniform2iv(this.sizeId, this.textureSize);
        super.updateValue(value);
      }
    };
    module.exports = {
      WebGL2KernelValueDynamicSingleInput: WebGL2KernelValueDynamicSingleInput
    };
  });
  var require_unsigned_input = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueUnsignedInput: WebGLKernelValueUnsignedInput} = require_unsigned_input$1();
    var WebGL2KernelValueUnsignedInput = class extends WebGLKernelValueUnsignedInput {
      getSource() {
        const variablePrecision = this.getVariablePrecisionString();
        return utils.linesToString([ `uniform ${variablePrecision} sampler2D ${this.id}`, `${variablePrecision} ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`, `${variablePrecision} ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})` ]);
      }
    };
    module.exports = {
      WebGL2KernelValueUnsignedInput: WebGL2KernelValueUnsignedInput
    };
  });
  var require_dynamic_unsigned_input = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueDynamicUnsignedInput: WebGLKernelValueDynamicUnsignedInput} = require_dynamic_unsigned_input$1();
    var WebGL2KernelValueDynamicUnsignedInput = class extends WebGLKernelValueDynamicUnsignedInput {
      getSource() {
        const variablePrecision = this.getVariablePrecisionString();
        return utils.linesToString([ `uniform ${variablePrecision} sampler2D ${this.id}`, `uniform ${variablePrecision} ivec2 ${this.sizeId}`, `uniform ${variablePrecision} ivec3 ${this.dimensionsId}` ]);
      }
    };
    module.exports = {
      WebGL2KernelValueDynamicUnsignedInput: WebGL2KernelValueDynamicUnsignedInput
    };
  });
  var require_memory_optimized_number_texture = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueMemoryOptimizedNumberTexture: WebGLKernelValueMemoryOptimizedNumberTexture} = require_memory_optimized_number_texture$1();
    var WebGL2KernelValueMemoryOptimizedNumberTexture = class extends WebGLKernelValueMemoryOptimizedNumberTexture {
      getSource() {
        const {id: id, sizeId: sizeId, textureSize: textureSize, dimensionsId: dimensionsId, dimensions: dimensions} = this;
        const variablePrecision = this.getVariablePrecisionString();
        return utils.linesToString([ `uniform sampler2D ${id}`, `${variablePrecision} ivec2 ${sizeId} = ivec2(${textureSize[0]}, ${textureSize[1]})`, `${variablePrecision} ivec3 ${dimensionsId} = ivec3(${dimensions[0]}, ${dimensions[1]}, ${dimensions[2]})` ]);
      }
    };
    module.exports = {
      WebGL2KernelValueMemoryOptimizedNumberTexture: WebGL2KernelValueMemoryOptimizedNumberTexture
    };
  });
  var require_dynamic_memory_optimized_number_texture = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueDynamicMemoryOptimizedNumberTexture: WebGLKernelValueDynamicMemoryOptimizedNumberTexture} = require_dynamic_memory_optimized_number_texture$1();
    var WebGL2KernelValueDynamicMemoryOptimizedNumberTexture = class extends WebGLKernelValueDynamicMemoryOptimizedNumberTexture {
      getSource() {
        return utils.linesToString([ `uniform sampler2D ${this.id}`, `uniform ivec2 ${this.sizeId}`, `uniform ivec3 ${this.dimensionsId}` ]);
      }
    };
    module.exports = {
      WebGL2KernelValueDynamicMemoryOptimizedNumberTexture: WebGL2KernelValueDynamicMemoryOptimizedNumberTexture
    };
  });
  var require_number_texture = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueNumberTexture: WebGLKernelValueNumberTexture} = require_number_texture$1();
    var WebGL2KernelValueNumberTexture = class extends WebGLKernelValueNumberTexture {
      getSource() {
        const {id: id, sizeId: sizeId, textureSize: textureSize, dimensionsId: dimensionsId, dimensions: dimensions} = this;
        const variablePrecision = this.getVariablePrecisionString();
        return utils.linesToString([ `uniform ${variablePrecision} sampler2D ${id}`, `${variablePrecision} ivec2 ${sizeId} = ivec2(${textureSize[0]}, ${textureSize[1]})`, `${variablePrecision} ivec3 ${dimensionsId} = ivec3(${dimensions[0]}, ${dimensions[1]}, ${dimensions[2]})` ]);
      }
    };
    module.exports = {
      WebGL2KernelValueNumberTexture: WebGL2KernelValueNumberTexture
    };
  });
  var require_dynamic_number_texture = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueDynamicNumberTexture: WebGLKernelValueDynamicNumberTexture} = require_dynamic_number_texture$1();
    var WebGL2KernelValueDynamicNumberTexture = class extends WebGLKernelValueDynamicNumberTexture {
      getSource() {
        const variablePrecision = this.getVariablePrecisionString();
        return utils.linesToString([ `uniform ${variablePrecision} sampler2D ${this.id}`, `uniform ${variablePrecision} ivec2 ${this.sizeId}`, `uniform ${variablePrecision} ivec3 ${this.dimensionsId}` ]);
      }
    };
    module.exports = {
      WebGL2KernelValueDynamicNumberTexture: WebGL2KernelValueDynamicNumberTexture
    };
  });
  var require_single_array = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueSingleArray: WebGLKernelValueSingleArray} = require_single_array$1();
    var WebGL2KernelValueSingleArray = class extends WebGLKernelValueSingleArray {
      getSource() {
        const variablePrecision = this.getVariablePrecisionString();
        return utils.linesToString([ `uniform ${variablePrecision} sampler2D ${this.id}`, `${variablePrecision} ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`, `${variablePrecision} ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})` ]);
      }
      updateValue(value) {
        if (!utils.isArray(value)) {
          this.onUpdateValueMismatch(value.constructor);
          return;
        }
        const {context: gl} = this;
        utils.flattenTo(value, this.uploadValue);
        gl.activeTexture(this.contextHandle);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
        this.kernel.setUniform1i(this.id, this.index);
      }
    };
    module.exports = {
      WebGL2KernelValueSingleArray: WebGL2KernelValueSingleArray
    };
  });
  var require_dynamic_single_array = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGL2KernelValueSingleArray: WebGL2KernelValueSingleArray} = require_single_array();
    var WebGL2KernelValueDynamicSingleArray = class extends WebGL2KernelValueSingleArray {
      getSource() {
        const variablePrecision = this.getVariablePrecisionString();
        return utils.linesToString([ `uniform ${variablePrecision} sampler2D ${this.id}`, `uniform ${variablePrecision} ivec2 ${this.sizeId}`, `uniform ${variablePrecision} ivec3 ${this.dimensionsId}` ]);
      }
      updateValue(value) {
        this.dimensions = utils.getDimensions(value, true);
        this.textureSize = utils.getMemoryOptimizedFloatTextureSize(this.dimensions, this.bitRatio);
        this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
        this.checkSize(this.textureSize[0], this.textureSize[1]);
        this.uploadValue = new Float32Array(this.uploadArrayLength);
        this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
        this.kernel.setUniform2iv(this.sizeId, this.textureSize);
        super.updateValue(value);
      }
    };
    module.exports = {
      WebGL2KernelValueDynamicSingleArray: WebGL2KernelValueDynamicSingleArray
    };
  });
  var require_single_array1d_i = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueSingleArray1DI: WebGLKernelValueSingleArray1DI} = require_single_array1d_i$1();
    var WebGL2KernelValueSingleArray1DI = class extends WebGLKernelValueSingleArray1DI {
      updateValue(value) {
        if (value.constructor !== this.initialValueConstructor) {
          this.onUpdateValueMismatch(value.constructor);
          return;
        }
        const {context: gl} = this;
        utils.flattenTo(value, this.uploadValue);
        gl.activeTexture(this.contextHandle);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
        this.kernel.setUniform1i(this.id, this.index);
      }
    };
    module.exports = {
      WebGL2KernelValueSingleArray1DI: WebGL2KernelValueSingleArray1DI
    };
  });
  var require_dynamic_single_array1d_i = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGL2KernelValueSingleArray1DI: WebGL2KernelValueSingleArray1DI} = require_single_array1d_i();
    var WebGL2KernelValueDynamicSingleArray1DI = class extends WebGL2KernelValueSingleArray1DI {
      getSource() {
        const variablePrecision = this.getVariablePrecisionString();
        return utils.linesToString([ `uniform ${variablePrecision} sampler2D ${this.id}`, `uniform ${variablePrecision} ivec2 ${this.sizeId}`, `uniform ${variablePrecision} ivec3 ${this.dimensionsId}` ]);
      }
      updateValue(value) {
        this.setShape(value);
        this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
        this.kernel.setUniform2iv(this.sizeId, this.textureSize);
        super.updateValue(value);
      }
    };
    module.exports = {
      WebGL2KernelValueDynamicSingleArray1DI: WebGL2KernelValueDynamicSingleArray1DI
    };
  });
  var require_single_array2d_i = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueSingleArray2DI: WebGLKernelValueSingleArray2DI} = require_single_array2d_i$1();
    var WebGL2KernelValueSingleArray2DI = class extends WebGLKernelValueSingleArray2DI {
      updateValue(value) {
        if (value.constructor !== this.initialValueConstructor) {
          this.onUpdateValueMismatch(value.constructor);
          return;
        }
        const {context: gl} = this;
        utils.flattenTo(value, this.uploadValue);
        gl.activeTexture(this.contextHandle);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
        this.kernel.setUniform1i(this.id, this.index);
      }
    };
    module.exports = {
      WebGL2KernelValueSingleArray2DI: WebGL2KernelValueSingleArray2DI
    };
  });
  var require_dynamic_single_array2d_i = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGL2KernelValueSingleArray2DI: WebGL2KernelValueSingleArray2DI} = require_single_array2d_i();
    var WebGL2KernelValueDynamicSingleArray2DI = class extends WebGL2KernelValueSingleArray2DI {
      getSource() {
        const variablePrecision = this.getVariablePrecisionString();
        return utils.linesToString([ `uniform ${variablePrecision} sampler2D ${this.id}`, `uniform ${variablePrecision} ivec2 ${this.sizeId}`, `uniform ${variablePrecision} ivec3 ${this.dimensionsId}` ]);
      }
      updateValue(value) {
        this.setShape(value);
        this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
        this.kernel.setUniform2iv(this.sizeId, this.textureSize);
        super.updateValue(value);
      }
    };
    module.exports = {
      WebGL2KernelValueDynamicSingleArray2DI: WebGL2KernelValueDynamicSingleArray2DI
    };
  });
  var require_single_array3d_i = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueSingleArray3DI: WebGLKernelValueSingleArray3DI} = require_single_array3d_i$1();
    var WebGL2KernelValueSingleArray3DI = class extends WebGLKernelValueSingleArray3DI {
      updateValue(value) {
        if (value.constructor !== this.initialValueConstructor) {
          this.onUpdateValueMismatch(value.constructor);
          return;
        }
        const {context: gl} = this;
        utils.flattenTo(value, this.uploadValue);
        gl.activeTexture(this.contextHandle);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
        this.kernel.setUniform1i(this.id, this.index);
      }
    };
    module.exports = {
      WebGL2KernelValueSingleArray3DI: WebGL2KernelValueSingleArray3DI
    };
  });
  var require_dynamic_single_array3d_i = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGL2KernelValueSingleArray3DI: WebGL2KernelValueSingleArray3DI} = require_single_array3d_i();
    var WebGL2KernelValueDynamicSingleArray3DI = class extends WebGL2KernelValueSingleArray3DI {
      getSource() {
        const variablePrecision = this.getVariablePrecisionString();
        return utils.linesToString([ `uniform ${variablePrecision} sampler2D ${this.id}`, `uniform ${variablePrecision} ivec2 ${this.sizeId}`, `uniform ${variablePrecision} ivec3 ${this.dimensionsId}` ]);
      }
      updateValue(value) {
        this.setShape(value);
        this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
        this.kernel.setUniform2iv(this.sizeId, this.textureSize);
        super.updateValue(value);
      }
    };
    module.exports = {
      WebGL2KernelValueDynamicSingleArray3DI: WebGL2KernelValueDynamicSingleArray3DI
    };
  });
  var require_array2 = __commonJSMin((exports, module) => {
    const {WebGLKernelValueArray2: WebGLKernelValueArray2} = require_array2$1();
    var WebGL2KernelValueArray2 = class extends WebGLKernelValueArray2 {};
    module.exports = {
      WebGL2KernelValueArray2: WebGL2KernelValueArray2
    };
  });
  var require_array3 = __commonJSMin((exports, module) => {
    const {WebGLKernelValueArray3: WebGLKernelValueArray3} = require_array3$1();
    var WebGL2KernelValueArray3 = class extends WebGLKernelValueArray3 {};
    module.exports = {
      WebGL2KernelValueArray3: WebGL2KernelValueArray3
    };
  });
  var require_array4 = __commonJSMin((exports, module) => {
    const {WebGLKernelValueArray4: WebGLKernelValueArray4} = require_array4$1();
    var WebGL2KernelValueArray4 = class extends WebGLKernelValueArray4 {};
    module.exports = {
      WebGL2KernelValueArray4: WebGL2KernelValueArray4
    };
  });
  var require_unsigned_array = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueUnsignedArray: WebGLKernelValueUnsignedArray} = require_unsigned_array$1();
    var WebGL2KernelValueUnsignedArray = class extends WebGLKernelValueUnsignedArray {
      getSource() {
        const variablePrecision = this.getVariablePrecisionString();
        return utils.linesToString([ `uniform ${variablePrecision} sampler2D ${this.id}`, `${variablePrecision} ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`, `${variablePrecision} ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})` ]);
      }
    };
    module.exports = {
      WebGL2KernelValueUnsignedArray: WebGL2KernelValueUnsignedArray
    };
  });
  var require_dynamic_unsigned_array = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {WebGLKernelValueDynamicUnsignedArray: WebGLKernelValueDynamicUnsignedArray} = require_dynamic_unsigned_array$1();
    var WebGL2KernelValueDynamicUnsignedArray = class extends WebGLKernelValueDynamicUnsignedArray {
      getSource() {
        const variablePrecision = this.getVariablePrecisionString();
        return utils.linesToString([ `uniform ${variablePrecision} sampler2D ${this.id}`, `uniform ${variablePrecision} ivec2 ${this.sizeId}`, `uniform ${variablePrecision} ivec3 ${this.dimensionsId}` ]);
      }
    };
    module.exports = {
      WebGL2KernelValueDynamicUnsignedArray: WebGL2KernelValueDynamicUnsignedArray
    };
  });
  var require_kernel_value_maps = __commonJSMin((exports, module) => {
    const {WebGL2KernelValueBoolean: WebGL2KernelValueBoolean} = require_boolean();
    const {WebGL2KernelValueFloat: WebGL2KernelValueFloat} = require_float();
    const {WebGL2KernelValueInteger: WebGL2KernelValueInteger} = require_integer();
    const {WebGL2KernelValueHTMLImage: WebGL2KernelValueHTMLImage} = require_html_image();
    const {WebGL2KernelValueDynamicHTMLImage: WebGL2KernelValueDynamicHTMLImage} = require_dynamic_html_image();
    const {WebGL2KernelValueHTMLImageArray: WebGL2KernelValueHTMLImageArray} = require_html_image_array();
    const {WebGL2KernelValueDynamicHTMLImageArray: WebGL2KernelValueDynamicHTMLImageArray} = require_dynamic_html_image_array();
    const {WebGL2KernelValueHTMLVideo: WebGL2KernelValueHTMLVideo} = require_html_video();
    const {WebGL2KernelValueDynamicHTMLVideo: WebGL2KernelValueDynamicHTMLVideo} = require_dynamic_html_video();
    const {WebGL2KernelValueSingleInput: WebGL2KernelValueSingleInput} = require_single_input();
    const {WebGL2KernelValueDynamicSingleInput: WebGL2KernelValueDynamicSingleInput} = require_dynamic_single_input();
    const {WebGL2KernelValueUnsignedInput: WebGL2KernelValueUnsignedInput} = require_unsigned_input();
    const {WebGL2KernelValueDynamicUnsignedInput: WebGL2KernelValueDynamicUnsignedInput} = require_dynamic_unsigned_input();
    const {WebGL2KernelValueMemoryOptimizedNumberTexture: WebGL2KernelValueMemoryOptimizedNumberTexture} = require_memory_optimized_number_texture();
    const {WebGL2KernelValueDynamicMemoryOptimizedNumberTexture: WebGL2KernelValueDynamicMemoryOptimizedNumberTexture} = require_dynamic_memory_optimized_number_texture();
    const {WebGL2KernelValueNumberTexture: WebGL2KernelValueNumberTexture} = require_number_texture();
    const {WebGL2KernelValueDynamicNumberTexture: WebGL2KernelValueDynamicNumberTexture} = require_dynamic_number_texture();
    const {WebGL2KernelValueSingleArray: WebGL2KernelValueSingleArray} = require_single_array();
    const {WebGL2KernelValueDynamicSingleArray: WebGL2KernelValueDynamicSingleArray} = require_dynamic_single_array();
    const {WebGL2KernelValueSingleArray1DI: WebGL2KernelValueSingleArray1DI} = require_single_array1d_i();
    const {WebGL2KernelValueDynamicSingleArray1DI: WebGL2KernelValueDynamicSingleArray1DI} = require_dynamic_single_array1d_i();
    const {WebGL2KernelValueSingleArray2DI: WebGL2KernelValueSingleArray2DI} = require_single_array2d_i();
    const {WebGL2KernelValueDynamicSingleArray2DI: WebGL2KernelValueDynamicSingleArray2DI} = require_dynamic_single_array2d_i();
    const {WebGL2KernelValueSingleArray3DI: WebGL2KernelValueSingleArray3DI} = require_single_array3d_i();
    const {WebGL2KernelValueDynamicSingleArray3DI: WebGL2KernelValueDynamicSingleArray3DI} = require_dynamic_single_array3d_i();
    const {WebGL2KernelValueArray2: WebGL2KernelValueArray2} = require_array2();
    const {WebGL2KernelValueArray3: WebGL2KernelValueArray3} = require_array3();
    const {WebGL2KernelValueArray4: WebGL2KernelValueArray4} = require_array4();
    const {WebGL2KernelValueUnsignedArray: WebGL2KernelValueUnsignedArray} = require_unsigned_array();
    const {WebGL2KernelValueDynamicUnsignedArray: WebGL2KernelValueDynamicUnsignedArray} = require_dynamic_unsigned_array();
    const kernelValueMaps = {
      unsigned: {
        dynamic: {
          Boolean: WebGL2KernelValueBoolean,
          Integer: WebGL2KernelValueInteger,
          Float: WebGL2KernelValueFloat,
          Array: WebGL2KernelValueDynamicUnsignedArray,
          "Array(2)": WebGL2KernelValueArray2,
          "Array(3)": WebGL2KernelValueArray3,
          "Array(4)": WebGL2KernelValueArray4,
          "Array1D(2)": false,
          "Array1D(3)": false,
          "Array1D(4)": false,
          "Array2D(2)": false,
          "Array2D(3)": false,
          "Array2D(4)": false,
          "Array3D(2)": false,
          "Array3D(3)": false,
          "Array3D(4)": false,
          Input: WebGL2KernelValueDynamicUnsignedInput,
          NumberTexture: WebGL2KernelValueDynamicNumberTexture,
          "ArrayTexture(1)": WebGL2KernelValueDynamicNumberTexture,
          "ArrayTexture(2)": WebGL2KernelValueDynamicNumberTexture,
          "ArrayTexture(3)": WebGL2KernelValueDynamicNumberTexture,
          "ArrayTexture(4)": WebGL2KernelValueDynamicNumberTexture,
          MemoryOptimizedNumberTexture: WebGL2KernelValueDynamicMemoryOptimizedNumberTexture,
          HTMLCanvas: WebGL2KernelValueDynamicHTMLImage,
          OffscreenCanvas: WebGL2KernelValueDynamicHTMLImage,
          HTMLImage: WebGL2KernelValueDynamicHTMLImage,
          ImageBitmap: WebGL2KernelValueDynamicHTMLImage,
          ImageData: WebGL2KernelValueDynamicHTMLImage,
          HTMLImageArray: WebGL2KernelValueDynamicHTMLImageArray,
          HTMLVideo: WebGL2KernelValueDynamicHTMLVideo
        },
        static: {
          Boolean: WebGL2KernelValueBoolean,
          Float: WebGL2KernelValueFloat,
          Integer: WebGL2KernelValueInteger,
          Array: WebGL2KernelValueUnsignedArray,
          "Array(2)": WebGL2KernelValueArray2,
          "Array(3)": WebGL2KernelValueArray3,
          "Array(4)": WebGL2KernelValueArray4,
          "Array1D(2)": false,
          "Array1D(3)": false,
          "Array1D(4)": false,
          "Array2D(2)": false,
          "Array2D(3)": false,
          "Array2D(4)": false,
          "Array3D(2)": false,
          "Array3D(3)": false,
          "Array3D(4)": false,
          Input: WebGL2KernelValueUnsignedInput,
          NumberTexture: WebGL2KernelValueNumberTexture,
          "ArrayTexture(1)": WebGL2KernelValueNumberTexture,
          "ArrayTexture(2)": WebGL2KernelValueNumberTexture,
          "ArrayTexture(3)": WebGL2KernelValueNumberTexture,
          "ArrayTexture(4)": WebGL2KernelValueNumberTexture,
          MemoryOptimizedNumberTexture: WebGL2KernelValueDynamicMemoryOptimizedNumberTexture,
          HTMLCanvas: WebGL2KernelValueHTMLImage,
          OffscreenCanvas: WebGL2KernelValueHTMLImage,
          HTMLImage: WebGL2KernelValueHTMLImage,
          ImageBitmap: WebGL2KernelValueHTMLImage,
          ImageData: WebGL2KernelValueHTMLImage,
          HTMLImageArray: WebGL2KernelValueHTMLImageArray,
          HTMLVideo: WebGL2KernelValueHTMLVideo
        }
      },
      single: {
        dynamic: {
          Boolean: WebGL2KernelValueBoolean,
          Integer: WebGL2KernelValueInteger,
          Float: WebGL2KernelValueFloat,
          Array: WebGL2KernelValueDynamicSingleArray,
          "Array(2)": WebGL2KernelValueArray2,
          "Array(3)": WebGL2KernelValueArray3,
          "Array(4)": WebGL2KernelValueArray4,
          "Array1D(2)": WebGL2KernelValueDynamicSingleArray1DI,
          "Array1D(3)": WebGL2KernelValueDynamicSingleArray1DI,
          "Array1D(4)": WebGL2KernelValueDynamicSingleArray1DI,
          "Array2D(2)": WebGL2KernelValueDynamicSingleArray2DI,
          "Array2D(3)": WebGL2KernelValueDynamicSingleArray2DI,
          "Array2D(4)": WebGL2KernelValueDynamicSingleArray2DI,
          "Array3D(2)": WebGL2KernelValueDynamicSingleArray3DI,
          "Array3D(3)": WebGL2KernelValueDynamicSingleArray3DI,
          "Array3D(4)": WebGL2KernelValueDynamicSingleArray3DI,
          Input: WebGL2KernelValueDynamicSingleInput,
          NumberTexture: WebGL2KernelValueDynamicNumberTexture,
          "ArrayTexture(1)": WebGL2KernelValueDynamicNumberTexture,
          "ArrayTexture(2)": WebGL2KernelValueDynamicNumberTexture,
          "ArrayTexture(3)": WebGL2KernelValueDynamicNumberTexture,
          "ArrayTexture(4)": WebGL2KernelValueDynamicNumberTexture,
          MemoryOptimizedNumberTexture: WebGL2KernelValueDynamicMemoryOptimizedNumberTexture,
          HTMLCanvas: WebGL2KernelValueDynamicHTMLImage,
          OffscreenCanvas: WebGL2KernelValueDynamicHTMLImage,
          HTMLImage: WebGL2KernelValueDynamicHTMLImage,
          ImageBitmap: WebGL2KernelValueDynamicHTMLImage,
          ImageData: WebGL2KernelValueDynamicHTMLImage,
          HTMLImageArray: WebGL2KernelValueDynamicHTMLImageArray,
          HTMLVideo: WebGL2KernelValueDynamicHTMLVideo
        },
        static: {
          Boolean: WebGL2KernelValueBoolean,
          Float: WebGL2KernelValueFloat,
          Integer: WebGL2KernelValueInteger,
          Array: WebGL2KernelValueSingleArray,
          "Array(2)": WebGL2KernelValueArray2,
          "Array(3)": WebGL2KernelValueArray3,
          "Array(4)": WebGL2KernelValueArray4,
          "Array1D(2)": WebGL2KernelValueSingleArray1DI,
          "Array1D(3)": WebGL2KernelValueSingleArray1DI,
          "Array1D(4)": WebGL2KernelValueSingleArray1DI,
          "Array2D(2)": WebGL2KernelValueSingleArray2DI,
          "Array2D(3)": WebGL2KernelValueSingleArray2DI,
          "Array2D(4)": WebGL2KernelValueSingleArray2DI,
          "Array3D(2)": WebGL2KernelValueSingleArray3DI,
          "Array3D(3)": WebGL2KernelValueSingleArray3DI,
          "Array3D(4)": WebGL2KernelValueSingleArray3DI,
          Input: WebGL2KernelValueSingleInput,
          NumberTexture: WebGL2KernelValueNumberTexture,
          "ArrayTexture(1)": WebGL2KernelValueNumberTexture,
          "ArrayTexture(2)": WebGL2KernelValueNumberTexture,
          "ArrayTexture(3)": WebGL2KernelValueNumberTexture,
          "ArrayTexture(4)": WebGL2KernelValueNumberTexture,
          MemoryOptimizedNumberTexture: WebGL2KernelValueMemoryOptimizedNumberTexture,
          HTMLCanvas: WebGL2KernelValueHTMLImage,
          OffscreenCanvas: WebGL2KernelValueHTMLImage,
          HTMLImage: WebGL2KernelValueHTMLImage,
          ImageBitmap: WebGL2KernelValueHTMLImage,
          ImageData: WebGL2KernelValueHTMLImage,
          HTMLImageArray: WebGL2KernelValueHTMLImageArray,
          HTMLVideo: WebGL2KernelValueHTMLVideo
        }
      }
    };
    function lookupKernelValueType(type, dynamic, precision, value) {
      if (!type) throw new Error("type missing");
      if (!dynamic) throw new Error("dynamic missing");
      if (!precision) throw new Error("precision missing");
      if (value.type) type = value.type;
      const types = kernelValueMaps[precision][dynamic];
      if (type === "WebGPUBuffer") throw new Error("this kernel runs on WebGL but received a WebGPU pipeline buffer; await handle.toArray() first, or give this kernel the async contract (asyncMode: true / mode: 'async') so the readback happens for you");
      if (types[type] === false) return null; else if (types[type] === void 0) throw new Error(`Could not find a KernelValue for ${type}`);
      return types[type];
    }
    module.exports = {
      kernelValueMaps: kernelValueMaps,
      lookupKernelValueType: lookupKernelValueType
    };
  });
  var require_kernel$2 = __commonJSMin((exports, module) => {
    const {WebGLKernel: WebGLKernel} = require_kernel$4();
    const {WebGL2FunctionNode: WebGL2FunctionNode} = require_function_node$2();
    const {FunctionBuilder: FunctionBuilder} = require_function_builder();
    const {utils: utils} = require_utils();
    const {fragmentShader: fragmentShader} = require_fragment_shader();
    const {vertexShader: vertexShader} = require_vertex_shader();
    const {lookupKernelValueType: lookupKernelValueType} = require_kernel_value_maps();
    let isSupported = null;
    let testCanvas = null;
    let testContext = null;
    let features = null;
    var WebGL2Kernel = class extends WebGLKernel {
      static get isSupported() {
        if (isSupported !== null) return isSupported;
        this.setupFeatureChecks();
        isSupported = this.isContextMatch(testContext);
        return isSupported;
      }
      static setupFeatureChecks() {
        if (typeof document !== "undefined") testCanvas = document.createElement("canvas"); else if (typeof OffscreenCanvas !== "undefined") testCanvas = new OffscreenCanvas(0, 0);
        if (!testCanvas) return;
        testContext = testCanvas.getContext("webgl2");
        if (!testContext || !testContext.getExtension) return;
        testContext.getExtension("EXT_color_buffer_float"), testContext.getExtension("OES_texture_float_linear");
        features = this.getFeatures();
      }
      static isContextMatch(context) {
        if (typeof WebGL2RenderingContext !== "undefined") return context instanceof WebGL2RenderingContext;
        return false;
      }
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
          highFloatPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)
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
        return this.canvas.getContext("webgl2", {
          alpha: false,
          depth: false,
          antialias: false
        });
      }
      initExtensions() {
        this.extensions = {
          EXT_color_buffer_float: this.context.getExtension("EXT_color_buffer_float"),
          OES_texture_float_linear: this.context.getExtension("OES_texture_float_linear")
        };
      }
      validateSettings(args) {
        if (!this.validate) {
          this.texSize = utils.getKernelTextureSize({
            optimizeFloatMemory: this.optimizeFloatMemory,
            precision: this.precision
          }, this.output);
          return;
        }
        const {features: features} = this.constructor;
        if (this.precision === "single" && !features.isFloatRead) throw new Error("Float texture outputs are not supported"); else if (!this.graphical && this.precision === null) this.precision = features.isFloatRead ? "single" : "unsigned";
        if (this.fixIntegerDivisionAccuracy === null) this.fixIntegerDivisionAccuracy = !features.isIntegerDivisionAccurate; else if (this.fixIntegerDivisionAccuracy && features.isIntegerDivisionAccurate) this.fixIntegerDivisionAccuracy = false;
        this.checkOutput();
        if (!this.output || this.output.length === 0) {
          if (args.length !== 1) throw new Error("Auto output only supported for kernels with only one input");
          const argType = utils.getVariableType(args[0], this.strictIntegers);
          switch (argType) {
           case "Array":
            this.output = utils.getDimensions(argType);
            break;

           case "NumberTexture":
           case "MemoryOptimizedNumberTexture":
           case "ArrayTexture(1)":
           case "ArrayTexture(2)":
           case "ArrayTexture(3)":
           case "ArrayTexture(4)":
            this.output = args[0].output;
            break;

           default:
            throw new Error("Auto output not supported for input type: " + argType);
          }
        }
        if (this.graphical) {
          if (this.output.length !== 2) throw new Error("Output must have 2 dimensions on graphical mode");
          if (this.precision === "single") {
            console.warn("Cannot use graphical mode and single precision at the same time");
            this.precision = "unsigned";
          }
          this.texSize = utils.clone(this.output);
          return;
        } else if (!this.graphical && this.precision === null && features.isTextureFloat) this.precision = "single";
        this.texSize = utils.getKernelTextureSize({
          optimizeFloatMemory: this.optimizeFloatMemory,
          precision: this.precision
        }, this.output);
        this.checkTextureSize();
      }
      translateSource() {
        const functionBuilder = FunctionBuilder.fromKernel(this, WebGL2FunctionNode, {
          fixIntegerDivisionAccuracy: this.fixIntegerDivisionAccuracy
        });
        this.translatedSource = functionBuilder.getPrototypeString("kernel");
        this.setupReturnTypes(functionBuilder);
      }
      drawBuffers() {
        this.context.drawBuffers(this.drawBuffersMap);
      }
      getTextureFormat() {
        const {context: gl} = this;
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
          throw new Error("Unknown internal format");
        }
      }
      renderValues() {
        if (this._tightRead === void 0) this._detectTightRead();
        return super.renderValues();
      }
      renderKernelsToArrays() {
        if (this._tightRead === void 0) this._detectTightRead();
        return super.renderKernelsToArrays();
      }
      readFloatPixelsToFloat32Array() {
        if (!this._tightRead) return super.readFloatPixelsToFloat32Array();
        const {texSize: texSize, context: gl} = this;
        const w = texSize[0];
        const h = texSize[1];
        const result = new Float32Array(w * h);
        gl.readPixels(0, 0, w, h, gl.RED, gl.FLOAT, result);
        return result;
      }
      renderOutputAsync() {
        if (this.renderOutput !== this.renderValues) return Promise.resolve(this.renderOutput());
        return this.renderValuesAsync();
      }
      renderValuesAsync() {
        if (this._tightRead === void 0) this._detectTightRead();
        const formatValues = this.formatValues;
        const [x, y, z] = this.output;
        return this.transferValuesAsync().then(pixels => formatValues(pixels, x, y, z));
      }
      transferValuesAsync() {
        const {texSize: texSize, context: gl} = this;
        const w = texSize[0];
        const h = texSize[1];
        let format, type, result;
        if (this.precision === "single") {
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
        gl.flush();
        return this._pollFence(sync).then(() => {
          gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
          gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, result);
          gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
          gl.deleteBuffer(pbo);
          return this.precision === "single" ? result : new Float32Array(result.buffer);
        }, error => {
          gl.deleteBuffer(pbo);
          throw error;
        });
      }
      _pollFence(sync) {
        const gl = this.context;
        return new Promise((resolve, reject) => {
          let schedule;
          let channel = null;
          if (typeof MessageChannel !== "undefined") {
            channel = new MessageChannel;
            channel.port1.onmessage = () => poll();
            schedule = () => channel.port2.postMessage(0);
          } else schedule = () => setTimeout(poll, 0);
          const settle = (fn, value) => {
            gl.deleteSync(sync);
            if (channel) {
              channel.port1.close();
              channel.port2.close();
            }
            fn(value);
          };
          const poll = () => {
            if (gl.isContextLost()) return settle(reject, new Error("WebGL context lost while awaiting kernel result"));
            const status = gl.clientWaitSync(sync, 0, 0);
            if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED) return settle(resolve);
            if (status === gl.WAIT_FAILED) return settle(reject, new Error("clientWaitSync failed while awaiting kernel result"));
            schedule();
          };
          poll();
        });
      }
      _detectTightRead() {
        const gl = this.context;
        this._tightRead = false;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        const scalarReturn = this.returnType === "Number" || this.returnType === "Float" || this.returnType === "Integer" || this.returnType === "LiteralInteger";
        if (this.precision !== "single" || this.optimizeFloatMemory || this.graphical || !scalarReturn) return;
        if (gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT) !== gl.RED || gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE) !== gl.FLOAT) return;
        if (this.formatValues === utils.erectFloat) this.formatValues = utils.erectMemoryOptimizedFloat; else if (this.formatValues === utils.erect2DFloat) this.formatValues = utils.erectMemoryOptimized2DFloat; else if (this.formatValues === utils.erect3DFloat) this.formatValues = utils.erectMemoryOptimized3DFloat; else if (this.formatValues !== utils.erectMemoryOptimizedFloat && this.formatValues !== utils.erectMemoryOptimized2DFloat && this.formatValues !== utils.erectMemoryOptimized3DFloat) return;
        this._tightRead = true;
      }
      getInternalFormat() {
        const {context: gl} = this;
        if (this.precision === "single") switch (this.returnType) {
         case "Number":
         case "Float":
         case "Integer":
          if (this.optimizeFloatMemory) return gl.RGBA32F; else return gl.R32F;

         case "Array(2)":
          return gl.RG32F;

         case "Array(3)":
         case "Array(4)":
          return gl.RGBA32F;

         default:
          throw new Error("Unhandled return type");
        }
        return gl.RGBA;
      }
      _setupOutputTexture() {
        const gl = this.context;
        if (this.texture) {
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture.texture, 0);
          this._tightRead = void 0;
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
        if (this.precision === "single") gl.texStorage2D(gl.TEXTURE_2D, 1, format, texSize[0], texSize[1]); else gl.texImage2D(gl.TEXTURE_2D, 0, format, texSize[0], texSize[1], 0, format, gl.UNSIGNED_BYTE, null);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        this.texture = new this.TextureConstructor({
          texture: texture,
          size: texSize,
          dimensions: this.threadDim,
          output: this.output,
          context: this.context,
          internalFormat: this.getInternalFormat(),
          textureFormat: this.getTextureFormat(),
          kernel: this
        });
        this._tightRead = void 0;
      }
      _setupSubOutputTextures() {
        const gl = this.context;
        if (this.mappedTextures) {
          for (let i = 0; i < this.subKernels.length; i++) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i + 1, gl.TEXTURE_2D, this.mappedTextures[i].texture, 0);
          return;
        }
        const texSize = this.texSize;
        this.drawBuffersMap = [ gl.COLOR_ATTACHMENT0 ];
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
          const format = this.getInternalFormat();
          if (this.precision === "single") gl.texStorage2D(gl.TEXTURE_2D, 1, format, texSize[0], texSize[1]); else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i + 1, gl.TEXTURE_2D, texture, 0);
          this.mappedTextures.push(new this.TextureConstructor({
            texture: texture,
            size: texSize,
            dimensions: this.threadDim,
            output: this.output,
            context: this.context,
            internalFormat: this.getInternalFormat(),
            textureFormat: this.getTextureFormat(),
            kernel: this
          }));
        }
      }
      _getHeaderString() {
        return "";
      }
      _getTextureCoordinate() {
        const subKernels = this.subKernels;
        const variablePrecision = this.getVariablePrecisionString(this.texSize, this.tactic);
        if (subKernels === null || subKernels.length < 1) return `in ${variablePrecision} vec2 vTexCoord;\n`; else return `out ${variablePrecision} vec2 vTexCoord;\n`;
      }
      _getMainArgumentsString(args) {
        const result = [];
        const argumentNames = this.argumentNames;
        for (let i = 0; i < argumentNames.length; i++) result.push(this.kernelArguments[i].getSource(args[i]));
        return result.join("");
      }
      getKernelString() {
        const result = [ this.getKernelResultDeclaration() ];
        const subKernels = this.subKernels;
        if (subKernels !== null) {
          result.push("layout(location = 0) out vec4 data0");
          switch (this.returnType) {
           case "Number":
           case "Float":
           case "Integer":
            for (let i = 0; i < subKernels.length; i++) {
              const subKernel = subKernels[i];
              result.push(subKernel.returnType === "Integer" ? `int subKernelResult_${subKernel.name} = 0` : `float subKernelResult_${subKernel.name} = 0.0`, `layout(location = ${i + 1}) out vec4 data${i + 1}`);
            }
            break;

           case "Array(2)":
            for (let i = 0; i < subKernels.length; i++) result.push(`vec2 subKernelResult_${subKernels[i].name}`, `layout(location = ${i + 1}) out vec4 data${i + 1}`);
            break;

           case "Array(3)":
            for (let i = 0; i < subKernels.length; i++) result.push(`vec3 subKernelResult_${subKernels[i].name}`, `layout(location = ${i + 1}) out vec4 data${i + 1}`);
            break;

           case "Array(4)":
            for (let i = 0; i < subKernels.length; i++) result.push(`vec4 subKernelResult_${subKernels[i].name}`, `layout(location = ${i + 1}) out vec4 data${i + 1}`);
            break;
          }
        } else result.push("out vec4 data0");
        return utils.linesToString(result) + this.translatedSource;
      }
      getMainResultGraphical() {
        return utils.linesToString([ "  threadId = indexTo3D(index, uOutputDim)", "  kernel()", "  data0 = actualColor" ]);
      }
      getMainResultPackedPixels() {
        switch (this.returnType) {
         case "LiteralInteger":
         case "Number":
         case "Integer":
         case "Float":
          return this.getMainResultKernelPackedPixels() + this.getMainResultSubKernelPackedPixels();

         default:
          throw new Error(`packed output only usable with Numbers, "${this.returnType}" specified`);
        }
      }
      getMainResultKernelPackedPixels() {
        return utils.linesToString([ "  threadId = indexTo3D(index, uOutputDim)", "  kernel()", `  data0 = ${this.useLegacyEncoder ? "legacyEncode32" : "encode32"}(kernelResult)` ]);
      }
      getMainResultSubKernelPackedPixels() {
        const result = [];
        if (!this.subKernels) return "";
        for (let i = 0; i < this.subKernels.length; i++) if (this.subKernels[i].returnType === "Integer") result.push(`  data${i + 1} = ${this.useLegacyEncoder ? "legacyEncode32" : "encode32"}(float(subKernelResult_${this.subKernels[i].name}))`); else result.push(`  data${i + 1} = ${this.useLegacyEncoder ? "legacyEncode32" : "encode32"}(subKernelResult_${this.subKernels[i].name})`);
        return utils.linesToString(result);
      }
      getMainResultKernelMemoryOptimizedFloats(result, channel) {
        result.push("  threadId = indexTo3D(index, uOutputDim)", "  kernel()", `  data0.${channel} = kernelResult`);
      }
      getMainResultSubKernelMemoryOptimizedFloats(result, channel) {
        if (!this.subKernels) return result;
        for (let i = 0; i < this.subKernels.length; i++) {
          const subKernel = this.subKernels[i];
          if (subKernel.returnType === "Integer") result.push(`  data${i + 1}.${channel} = float(subKernelResult_${subKernel.name})`); else result.push(`  data${i + 1}.${channel} = subKernelResult_${subKernel.name}`);
        }
      }
      getMainResultKernelNumberTexture() {
        return [ "  threadId = indexTo3D(index, uOutputDim)", "  kernel()", "  data0[0] = kernelResult" ];
      }
      getMainResultSubKernelNumberTexture() {
        const result = [];
        if (!this.subKernels) return result;
        for (let i = 0; i < this.subKernels.length; ++i) {
          const subKernel = this.subKernels[i];
          if (subKernel.returnType === "Integer") result.push(`  data${i + 1}[0] = float(subKernelResult_${subKernel.name})`); else result.push(`  data${i + 1}[0] = subKernelResult_${subKernel.name}`);
        }
        return result;
      }
      getMainResultKernelArray2Texture() {
        return [ "  threadId = indexTo3D(index, uOutputDim)", "  kernel()", "  data0[0] = kernelResult[0]", "  data0[1] = kernelResult[1]" ];
      }
      getMainResultSubKernelArray2Texture() {
        const result = [];
        if (!this.subKernels) return result;
        for (let i = 0; i < this.subKernels.length; ++i) {
          const subKernel = this.subKernels[i];
          result.push(`  data${i + 1}[0] = subKernelResult_${subKernel.name}[0]`, `  data${i + 1}[1] = subKernelResult_${subKernel.name}[1]`);
        }
        return result;
      }
      getMainResultKernelArray3Texture() {
        return [ "  threadId = indexTo3D(index, uOutputDim)", "  kernel()", "  data0[0] = kernelResult[0]", "  data0[1] = kernelResult[1]", "  data0[2] = kernelResult[2]" ];
      }
      getMainResultSubKernelArray3Texture() {
        const result = [];
        if (!this.subKernels) return result;
        for (let i = 0; i < this.subKernels.length; ++i) {
          const subKernel = this.subKernels[i];
          result.push(`  data${i + 1}[0] = subKernelResult_${subKernel.name}[0]`, `  data${i + 1}[1] = subKernelResult_${subKernel.name}[1]`, `  data${i + 1}[2] = subKernelResult_${subKernel.name}[2]`);
        }
        return result;
      }
      getMainResultKernelArray4Texture() {
        return [ "  threadId = indexTo3D(index, uOutputDim)", "  kernel()", "  data0 = kernelResult" ];
      }
      getMainResultSubKernelArray4Texture() {
        const result = [];
        if (!this.subKernels) return result;
        for (let i = 0; i < this.subKernels.length; ++i) result.push(`  data${i + 1} = subKernelResult_${this.subKernels[i].name}`);
        return result;
      }
      destroyExtensions() {
        this.extensions.EXT_color_buffer_float = null;
        this.extensions.OES_texture_float_linear = null;
      }
      toJSON() {
        const json = super.toJSON();
        json.functionNodes = FunctionBuilder.fromKernel(this, WebGL2FunctionNode).toJSON();
        json.settings.threadDim = this.threadDim;
        return json;
      }
    };
    module.exports = {
      WebGL2Kernel: WebGL2Kernel
    };
  });
  var require_function_node$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {FunctionNode: FunctionNode} = require_function_node$5();
    var WGSLFunctionNode = class extends FunctionNode {
      get requiresSequenceFreeForInit() {
        return true;
      }
      wgslFloat(value) {
        if (value === Infinity) return "0x1.fffffep+127";
        if (value === -Infinity) return "-0x1.fffffep+127";
        if (value > 34028234663852886e22) return "0x1.fffffep+127";
        if (value < -34028234663852886e22) return "-0x1.fffffep+127";
        const str = `${value}`;
        if (str.indexOf(".") !== -1 || str.indexOf("e") !== -1 || str.indexOf("E") !== -1) return str;
        return `${str}.0`;
      }
      wgslInt(value) {
        return `${Math.round(value)}`;
      }
      mangleFunctionName(name) {
        return `fn_${utils.sanitizeName(name)}`;
      }
      getLookupType(type) {
        if (type === "WebGPUBuffer") return "Number";
        return super.getLookupType(type);
      }
      astUpdateExpression(uNode, retArr) {
        this.astGeneric(uNode.argument, retArr);
        retArr.push(uNode.operator);
        return retArr;
      }
      getType(ast) {
        if (ast && ast.type === "ConditionalExpression") {
          const consequentType = this.getType(ast.consequent);
          if (consequentType === "Integer" || consequentType === "LiteralInteger") {
            const alternateType = this.getType(ast.alternate);
            if (alternateType === "Number" || alternateType === "Float") return "Number";
          }
        }
        return super.getType(ast);
      }
      astConditionalExpression(ast, retArr) {
        if (ast.type !== "ConditionalExpression") throw this.astErrorOutput("Not a conditional expression", ast);
        const consequentType = this.getType(ast.consequent);
        const alternateType = this.getType(ast.alternate);
        if (consequentType === null && alternateType === null) {
          retArr.push("if (");
          this.astGeneric(ast.test, retArr);
          retArr.push(") {");
          this.astGeneric(ast.consequent, retArr);
          retArr.push(";");
          retArr.push("} else {");
          this.astGeneric(ast.alternate, retArr);
          retArr.push(";");
          retArr.push("}");
          return retArr;
        }
        let targetType = consequentType === "LiteralInteger" ? "Number" : consequentType;
        if (targetType === "Integer" && (alternateType === "Number" || alternateType === "Float")) targetType = "Number";
        const emitBranch = branch => {
          const branchType = this.getType(branch);
          switch (targetType) {
           case "Number":
           case "Float":
            if (branchType === "Integer") this.castValueToFloat(branch, retArr); else if (branchType === "LiteralInteger") this.castLiteralToFloat(branch, retArr); else this.astGeneric(branch, retArr);
            break;

           case "Integer":
            if (branchType === "Number" || branchType === "Float") this.castValueToInteger(branch, retArr); else if (branchType === "LiteralInteger") this.castLiteralToInteger(branch, retArr); else this.astGeneric(branch, retArr);
            break;

           default:
            this.astGeneric(branch, retArr);
          }
        };
        retArr.push("select(");
        emitBranch(ast.alternate);
        retArr.push(", ");
        emitBranch(ast.consequent);
        retArr.push(", ");
        this.astGeneric(ast.test, retArr);
        retArr.push(")");
        return retArr;
      }
      astFunction(ast, retArr) {
        if (this.isRootKernel) {
          for (let i = 0; i < ast.body.body.length; ++i) {
            this.astGeneric(ast.body.body[i], retArr);
            retArr.push("\n");
          }
          return retArr;
        }
        if (!this.returnType) {
          if (this.findLastReturn()) {
            this.returnType = this.getType(ast.body);
            if (this.returnType === "LiteralInteger") this.returnType = "Number";
          }
        }
        const {returnType: returnType} = this;
        let type = null;
        if (returnType) {
          type = typeMap[returnType];
          if (!type) throw this.astErrorOutput(`unknown return type ${returnType}`, ast);
        }
        retArr.push(`fn ${this.mangleFunctionName(this.name)}(`);
        for (let i = 0; i < this.argumentNames.length; ++i) {
          const argumentName = this.argumentNames[i];
          if (i > 0) retArr.push(", ");
          let argumentType = this.argumentTypes[this.argumentNames.indexOf(argumentName)];
          if (!argumentType) throw this.astErrorOutput(`Unknown argument ${argumentName} type`, ast);
          if (argumentType === "LiteralInteger") this.argumentTypes[i] = argumentType = "Number";
          const wgslType = typeMap[argumentType];
          if (!wgslType) throw this.astErrorOutput(`WebGPU backend does not yet support ${argumentType} arguments to helper functions`, ast);
          retArr.push(`user_${utils.sanitizeName(argumentName)} : ${wgslType}`);
        }
        retArr.push(")");
        if (type) retArr.push(` -> ${type}`);
        retArr.push(" {\n");
        for (let i = 0; i < ast.body.body.length; ++i) {
          this.astGeneric(ast.body.body[i], retArr);
          retArr.push("\n");
        }
        retArr.push("}\n");
        return retArr;
      }
      astReturnStatement(ast, retArr) {
        if (!ast.argument) throw this.astErrorOutput("Unexpected return statement", ast);
        this.pushState("skip-literal-correction");
        const type = this.getType(ast.argument);
        this.popState("skip-literal-correction");
        const result = [];
        if (!this.returnType) if (type === "LiteralInteger" || type === "Integer") this.returnType = "Number"; else this.returnType = type;
        switch (this.returnType) {
         case "LiteralInteger":
         case "Number":
         case "Float":
          switch (type) {
           case "Integer":
            result.push("f32(");
            this.astGeneric(ast.argument, result);
            result.push(")");
            break;

           case "LiteralInteger":
            this.castLiteralToFloat(ast.argument, result);
            if (this.getType(ast.argument) === "Integer") {
              result.unshift("f32(");
              result.push(")");
            }
            break;

           default:
            this.astGeneric(ast.argument, result);
          }
          break;

         case "Integer":
          switch (type) {
           case "Float":
           case "Number":
            this.castValueToInteger(ast.argument, result);
            break;

           case "LiteralInteger":
            this.castLiteralToInteger(ast.argument, result);
            break;

           default:
            this.astGeneric(ast.argument, result);
          }
          break;

         case "Boolean":
         case "Array(4)":
         case "Array(3)":
         case "Array(2)":
          this.astGeneric(ast.argument, result);
          break;

         default:
          throw this.astErrorOutput(`unhandled return type ${this.returnType}`, ast);
        }
        if (this.isRootKernel) switch (this.returnType) {
         case "Array(4)":
         case "Array(3)":
         case "Array(2)":
          {
            const n = parseInt(this.returnType.substring(6), 10);
            const temp = this.getInternalVariableName("kernelResultVec");
            retArr.push(`let ${temp} : ${typeMap[this.returnType]} = ${result.join("")};\n`);
            for (let c = 0; c < n; c++) retArr.push(`result[data_index * ${n} + ${c}] = ${temp}.${vectorComponents[c]};\n`);
            retArr.push("return;");
            break;
          }

         case "Integer":
          retArr.push(`result[data_index] = f32(${result.join("")});`);
          retArr.push("return;");
          break;

         default:
          retArr.push(`result[data_index] = ${result.join("")};`);
          retArr.push("return;");
        } else if (this.isSubKernel) throw this.astErrorOutput("WebGPU backend does not yet support createKernelMap", ast); else retArr.push(`return ${result.join("")};`);
        return retArr;
      }
      astLiteral(ast, retArr) {
        if (ast.value === true || ast.value === false) {
          retArr.push(ast.value ? "true" : "false");
          return retArr;
        }
        if (isNaN(ast.value)) throw this.astErrorOutput("Non-numeric literal not supported : " + ast.value, ast);
        const key = this.astKey(ast);
        if (Number.isInteger(ast.value)) if (this.isState("casting-to-integer") || this.isState("building-integer")) {
          this.literalTypes[key] = "Integer";
          retArr.push(this.wgslInt(ast.value));
        } else {
          this.literalTypes[key] = "Number";
          retArr.push(this.wgslFloat(ast.value));
        } else if (this.isState("casting-to-integer") || this.isState("building-integer")) {
          this.literalTypes[key] = "Integer";
          retArr.push(this.wgslInt(ast.value));
        } else {
          this.literalTypes[key] = "Number";
          retArr.push(this.wgslFloat(ast.value));
        }
        return retArr;
      }
      astBinaryExpression(ast, retArr) {
        if (this.checkAndUpconvertOperator(ast, retArr)) return retArr;
        if (ast.operator === "/" || ast.operator === "%") {
          retArr.push("(");
          this.pushState("building-float");
          switch (this.getType(ast.left)) {
           case "Integer":
            this.castValueToFloat(ast.left, retArr);
            break;

           case "LiteralInteger":
            this.castLiteralToFloat(ast.left, retArr);
            break;

           default:
            this.astGeneric(ast.left, retArr);
          }
          retArr.push(ast.operator);
          switch (this.getType(ast.right)) {
           case "Integer":
            this.castValueToFloat(ast.right, retArr);
            break;

           case "LiteralInteger":
            this.castLiteralToFloat(ast.right, retArr);
            break;

           default:
            this.astGeneric(ast.right, retArr);
          }
          this.popState("building-float");
          retArr.push(")");
          return retArr;
        }
        retArr.push("(");
        const leftType = this.getType(ast.left) || "Number";
        const rightType = this.getType(ast.right) || "Number";
        const key = leftType + " & " + rightType;
        switch (key) {
         case "Integer & Integer":
          this.pushState("building-integer");
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.astGeneric(ast.right, retArr);
          this.popState("building-integer");
          break;

         case "Number & Float":
         case "Float & Number":
         case "Float & Float":
         case "Number & Number":
          this.pushState("building-float");
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.astGeneric(ast.right, retArr);
          this.popState("building-float");
          break;

         case "LiteralInteger & LiteralInteger":
          if (this.isState("casting-to-integer") || this.isState("building-integer")) {
            this.pushState("building-integer");
            this.astGeneric(ast.left, retArr);
            retArr.push(operatorMap[ast.operator] || ast.operator);
            this.astGeneric(ast.right, retArr);
            this.popState("building-integer");
          } else {
            this.pushState("building-float");
            this.castLiteralToFloat(ast.left, retArr);
            retArr.push(operatorMap[ast.operator] || ast.operator);
            this.castLiteralToFloat(ast.right, retArr);
            this.popState("building-float");
          }
          break;

         case "Integer & Float":
         case "Integer & Number":
          this.pushState("building-float");
          this.castValueToFloat(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.astGeneric(ast.right, retArr);
          this.popState("building-float");
          break;

         case "Integer & LiteralInteger":
          this.pushState("building-integer");
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.castLiteralToInteger(ast.right, retArr);
          this.popState("building-integer");
          break;

         case "Number & Integer":
          this.pushState("building-float");
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.castValueToFloat(ast.right, retArr);
          this.popState("building-float");
          break;

         case "Float & LiteralInteger":
         case "Number & LiteralInteger":
          this.pushState("building-float");
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.castLiteralToFloat(ast.right, retArr);
          this.popState("building-float");
          break;

         case "LiteralInteger & Float":
         case "LiteralInteger & Number":
          if (this.isState("casting-to-integer")) {
            this.pushState("building-integer");
            this.castLiteralToInteger(ast.left, retArr);
            retArr.push(operatorMap[ast.operator] || ast.operator);
            this.castValueToInteger(ast.right, retArr);
            this.popState("building-integer");
          } else {
            this.pushState("building-float");
            this.castLiteralToFloat(ast.left, retArr);
            retArr.push(operatorMap[ast.operator] || ast.operator);
            this.pushState("casting-to-float");
            this.astGeneric(ast.right, retArr);
            this.popState("casting-to-float");
            this.popState("building-float");
          }
          break;

         case "LiteralInteger & Integer":
          this.pushState("building-integer");
          this.castLiteralToInteger(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.astGeneric(ast.right, retArr);
          this.popState("building-integer");
          break;

         case "Boolean & Boolean":
          this.pushState("building-boolean");
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.astGeneric(ast.right, retArr);
          this.popState("building-boolean");
          break;

         case "Float & Integer":
          this.pushState("building-float");
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.castValueToFloat(ast.right, retArr);
          this.popState("building-float");
          break;

         default:
          throw this.astErrorOutput(`Unhandled binary expression between ${key}`, ast);
        }
        retArr.push(")");
        return retArr;
      }
      checkAndUpconvertOperator(ast, retArr) {
        if (this.checkAndUpconvertBitwiseOperators(ast, retArr)) return retArr;
        if (ast.operator !== "**") return null;
        retArr.push("_pow");
        retArr.push("(");
        switch (this.getType(ast.left)) {
         case "Integer":
          this.castValueToFloat(ast.left, retArr);
          break;

         case "LiteralInteger":
          this.castLiteralToFloat(ast.left, retArr);
          break;

         default:
          this.astGeneric(ast.left, retArr);
        }
        retArr.push(",");
        switch (this.getType(ast.right)) {
         case "Integer":
          this.castValueToFloat(ast.right, retArr);
          break;

         case "LiteralInteger":
          this.castLiteralToFloat(ast.right, retArr);
          break;

         default:
          this.astGeneric(ast.right, retArr);
        }
        retArr.push(")");
        return retArr;
      }
      checkAndUpconvertBitwiseOperators(ast, retArr) {
        if (!{
          "&": true,
          "|": true,
          "^": true,
          "<<": true,
          ">>": true,
          ">>>": true
        }[ast.operator]) return null;
        const emitAsInteger = side => {
          switch (this.getType(side)) {
           case "Number":
           case "Float":
            this.castValueToInteger(side, retArr);
            break;

           case "LiteralInteger":
            this.castLiteralToInteger(side, retArr);
            break;

           default:
            this.pushState("building-integer");
            this.astGeneric(side, retArr);
            this.popState("building-integer");
          }
        };
        retArr.push("(");
        if (ast.operator === ">>>") {
          retArr.push("bitcast<i32>(bitcast<u32>(");
          emitAsInteger(ast.left);
          retArr.push(") >> u32(");
          emitAsInteger(ast.right);
          retArr.push("))");
        } else if (ast.operator === "<<" || ast.operator === ">>") {
          emitAsInteger(ast.left);
          retArr.push(` ${ast.operator} u32(`);
          emitAsInteger(ast.right);
          retArr.push(")");
        } else {
          emitAsInteger(ast.left);
          retArr.push(` ${ast.operator} `);
          emitAsInteger(ast.right);
        }
        retArr.push(")");
        return retArr;
      }
      checkAndUpconvertBitwiseUnary(ast, retArr) {
        if (ast.operator !== "~") return null;
        retArr.push("~(");
        switch (this.getType(ast.argument)) {
         case "Number":
         case "Float":
          this.castValueToInteger(ast.argument, retArr);
          break;

         case "LiteralInteger":
          this.castLiteralToInteger(ast.argument, retArr);
          break;

         default:
          this.astGeneric(ast.argument, retArr);
        }
        retArr.push(")");
        return retArr;
      }
      astUnaryExpression(uNode, retArr) {
        if (this.checkAndUpconvertBitwiseUnary(uNode, retArr)) return retArr;
        if (uNode.operator === "+") {
          this.astGeneric(uNode.argument, retArr);
          return retArr;
        }
        if (uNode.prefix) {
          retArr.push(uNode.operator);
          this.astGeneric(uNode.argument, retArr);
        } else {
          this.astGeneric(uNode.argument, retArr);
          retArr.push(uNode.operator);
        }
        return retArr;
      }
      castLiteralToInteger(ast, retArr) {
        this.pushState("casting-to-integer");
        this.astGeneric(ast, retArr);
        this.popState("casting-to-integer");
        return retArr;
      }
      castLiteralToFloat(ast, retArr) {
        this.pushState("casting-to-float");
        this.astGeneric(ast, retArr);
        this.popState("casting-to-float");
        return retArr;
      }
      castValueToInteger(ast, retArr) {
        this.pushState("casting-to-integer");
        retArr.push("i32(");
        this.astGeneric(ast, retArr);
        retArr.push(")");
        this.popState("casting-to-integer");
        return retArr;
      }
      castValueToFloat(ast, retArr) {
        this.pushState("casting-to-float");
        retArr.push("f32(");
        this.astGeneric(ast, retArr);
        retArr.push(")");
        this.popState("casting-to-float");
        return retArr;
      }
      astIdentifierExpression(idtNode, retArr) {
        if (idtNode.type !== "Identifier") throw this.astErrorOutput("IdentifierExpression - not an Identifier", idtNode);
        const type = this.getType(idtNode);
        const name = utils.sanitizeName(idtNode.name);
        if (idtNode.name === "Infinity") {
          retArr.push("0x1.fffffep+127");
          return retArr;
        }
        if (this.isRootKernel && this.argumentNames.indexOf(idtNode.name) !== -1 && (type === "Number" || type === "Float" || type === "Integer" || type === "Boolean")) {
          if (type === "Boolean") retArr.push(`bool(params.user_${name})`); else retArr.push(`params.user_${name}`);
          return retArr;
        }
        retArr.push(`user_${name}`);
        return retArr;
      }
      astForStatement(forNode, retArr) {
        if (forNode.type !== "ForStatement") throw this.astErrorOutput("Invalid for statement", forNode);
        const initArr = [];
        const testArr = [];
        const updateArr = [];
        const bodyArr = [];
        let isSafe = null;
        if (forNode.init) {
          const {declarations: declarations} = forNode.init;
          if (declarations.length > 1) isSafe = false;
          this.astGeneric(forNode.init, initArr);
          for (let i = 0; i < declarations.length; i++) if (declarations[i].init && declarations[i].init.type !== "Literal") isSafe = false;
        } else isSafe = false;
        if (forNode.test) this.astGeneric(forNode.test, testArr); else isSafe = false;
        if (forNode.update) {
          if (forNode.update.type === "AssignmentExpression") this.pushState("assignment-as-statement");
          this.astGeneric(forNode.update, updateArr);
        } else isSafe = false;
        if (forNode.body) {
          this.pushState("loop-body");
          this.astGeneric(forNode.body, bodyArr);
          this.popState("loop-body");
        }
        if (isSafe === null) isSafe = this.isSafe(forNode.init) && this.isSafe(forNode.test);
        if (isSafe) {
          const initString = initArr.join("");
          const initNeedsSemiColon = initString[initString.length - 1] !== ";";
          retArr.push(`for (${initString}${initNeedsSemiColon ? ";" : ""}${testArr.join("")};${updateArr.join("")}){\n`);
          retArr.push(bodyArr.join(""));
          retArr.push("}\n");
        } else {
          const iVariableName = this.getInternalVariableName("safeI");
          if (initArr.length > 0) retArr.push(initArr.join(""), "\n");
          retArr.push(`for (var ${iVariableName} : i32 = 0;${iVariableName}<LOOP_MAX;${iVariableName}++){\n`);
          if (testArr.length > 0) retArr.push(`if (!(${testArr.join("")})) { break; }\n`);
          retArr.push(bodyArr.join(""));
          retArr.push(`\n${updateArr.join("")};`);
          retArr.push("}\n");
        }
        return retArr;
      }
      astWhileStatement(whileNode, retArr) {
        if (whileNode.type !== "WhileStatement") throw this.astErrorOutput("Invalid while statement", whileNode);
        const iVariableName = this.getInternalVariableName("safeI");
        retArr.push(`for (var ${iVariableName} : i32 = 0;${iVariableName}<LOOP_MAX;${iVariableName}++){\n`);
        retArr.push("if (!(");
        this.astGeneric(whileNode.test, retArr);
        retArr.push(")) { break; }\n");
        this.astGeneric(whileNode.body, retArr);
        retArr.push("}\n");
        return retArr;
      }
      astDoWhileStatement(doWhileNode, retArr) {
        if (doWhileNode.type !== "DoWhileStatement") throw this.astErrorOutput("Invalid while statement", doWhileNode);
        const iVariableName = this.getInternalVariableName("safeI");
        retArr.push(`for (var ${iVariableName} : i32 = 0;${iVariableName}<LOOP_MAX;${iVariableName}++){\n`);
        this.astGeneric(doWhileNode.body, retArr);
        retArr.push("if (!(");
        this.astGeneric(doWhileNode.test, retArr);
        retArr.push(")) { break; }\n");
        retArr.push("}\n");
        return retArr;
      }
      astAssignmentExpression(assNode, retArr) {
        if (this.isState("assignment-as-statement")) this.popState("assignment-as-statement"); else throw this.astErrorOutput("WebGPU backend does not yet support assignment used as an expression", assNode);
        if (assNode.operator === "%=") {
          this.astGeneric(assNode.left, retArr);
          retArr.push("=(");
          this.astGeneric(assNode.left, retArr);
          retArr.push("%");
          const rightType = this.getType(assNode.right);
          if (rightType === "Integer") this.castValueToFloat(assNode.right, retArr); else if (rightType === "LiteralInteger") this.castLiteralToFloat(assNode.right, retArr); else this.astGeneric(assNode.right, retArr);
          retArr.push(")");
        } else if (assNode.operator === "**=") {
          this.astGeneric(assNode.left, retArr);
          retArr.push("=");
          retArr.push("_pow(");
          this.astGeneric(assNode.left, retArr);
          retArr.push(",");
          const rightType = this.getType(assNode.right);
          if (rightType === "Integer") this.castValueToFloat(assNode.right, retArr); else if (rightType === "LiteralInteger") this.castLiteralToFloat(assNode.right, retArr); else this.astGeneric(assNode.right, retArr);
          retArr.push(")");
        } else {
          const leftType = this.getType(assNode.left);
          const rightType = this.getType(assNode.right);
          this.astGeneric(assNode.left, retArr);
          retArr.push(assNode.operator);
          if (leftType !== "Integer" && rightType === "Integer") {
            retArr.push("f32(");
            this.astGeneric(assNode.right, retArr);
            retArr.push(")");
          } else if (leftType !== "Integer" && rightType === "LiteralInteger") this.castLiteralToFloat(assNode.right, retArr); else if (leftType === "Integer" && rightType === "LiteralInteger") this.castLiteralToInteger(assNode.right, retArr); else if (leftType === "Integer" && (rightType === "Number" || rightType === "Float")) {
            retArr.push("i32(");
            this.astGeneric(assNode.right, retArr);
            retArr.push(")");
          } else this.astGeneric(assNode.right, retArr);
        }
        return retArr;
      }
      astBlockStatement(bNode, retArr) {
        if (this.isState("loop-body")) {
          this.pushState("block-body");
          for (let i = 0; i < bNode.body.length; i++) this.astGeneric(bNode.body[i], retArr);
          this.popState("block-body");
        } else {
          retArr.push("{\n");
          for (let i = 0; i < bNode.body.length; i++) this.astGeneric(bNode.body[i], retArr);
          retArr.push("}\n");
        }
        return retArr;
      }
      astVariableDeclaration(varDecNode, retArr) {
        const declarations = varDecNode.declarations;
        if (!declarations || !declarations[0] || !declarations[0].init) throw this.astErrorOutput("Unexpected expression", varDecNode);
        for (let i = 0; i < declarations.length; i++) {
          const declaration = declarations[i];
          const init = declaration.init;
          const info = this.getDeclaration(declaration.id);
          const actualType = this.getType(declaration.init);
          let type = actualType;
          if (type === "LiteralInteger") if (info.suggestedType === "Integer") type = "Integer"; else type = "Number";
          const name = utils.sanitizeName(declaration.id.name);
          if (actualType === "Integer" && type === "Integer") {
            info.valueType = "Number";
            retArr.push(`var user_${name} : f32 = `);
            retArr.push("f32(");
            this.astGeneric(init, retArr);
            retArr.push(")");
          } else {
            const markupType = typeMap[type];
            if (!markupType) throw this.astErrorOutput(`Markup type ${type} not handled`, varDecNode);
            info.valueType = type;
            retArr.push(`var user_${name} : ${markupType} = `);
            if (actualType === "Number" && type === "Integer") {
              retArr.push("i32(");
              this.astGeneric(init, retArr);
              retArr.push(")");
            } else if (actualType === "LiteralInteger" && type === "Integer") this.castLiteralToInteger(init, retArr); else if (actualType === "LiteralInteger" && type === "Number") this.castLiteralToFloat(init, retArr); else if (actualType === "Integer" && type === "Number") this.castValueToFloat(init, retArr); else this.astGeneric(init, retArr);
          }
          retArr.push(";");
        }
        return retArr;
      }
      astIfStatement(ifNode, retArr) {
        retArr.push("if (");
        this.astGeneric(ifNode.test, retArr);
        retArr.push(")");
        if (ifNode.consequent.type === "BlockStatement") {
          this.pushState("if-body");
          this.astGeneric(ifNode.consequent, retArr);
          this.popState("if-body");
        } else {
          retArr.push(" {\n");
          this.astGeneric(ifNode.consequent, retArr);
          retArr.push("\n}\n");
        }
        if (ifNode.alternate) {
          retArr.push("else ");
          if (ifNode.alternate.type === "IfStatement") this.astGeneric(ifNode.alternate, retArr); else if (ifNode.alternate.type === "BlockStatement") {
            this.pushState("if-body");
            this.astGeneric(ifNode.alternate, retArr);
            this.popState("if-body");
          } else {
            retArr.push(" {\n");
            this.astGeneric(ifNode.alternate, retArr);
            retArr.push("\n}\n");
          }
        }
        return retArr;
      }
      astSwitchCaseConsequent(consequent, retArr) {
        const statements = [];
        for (let i = 0; i < consequent.length; i++) {
          if (consequent[i].type === "BreakStatement") break;
          statements.push(consequent[i]);
        }
        for (let i = 0; i < statements.length; i++) {
          const containsBreak = node => {
            if (!node || typeof node !== "object") return false;
            if (Array.isArray(node)) return node.some(containsBreak);
            if (node.type === "BreakStatement") return true;
            if (node.type === "ForStatement" || node.type === "WhileStatement" || node.type === "DoWhileStatement" || node.type === "SwitchStatement") return false;
            for (const key in node) {
              if (key === "loc" || key === "range" || key === "parent") continue;
              if (containsBreak(node[key])) return true;
            }
            return false;
          };
          if (containsBreak(statements[i])) throw this.astErrorOutput("break inside a switch case is only supported as the case terminator", statements[i]);
        }
        for (let i = 0; i < statements.length; i++) {
          this.astGeneric(statements[i], retArr);
          retArr.push("\n");
        }
        return retArr;
      }
      astSwitchStatement(ast, retArr) {
        if (ast.type !== "SwitchStatement") throw this.astErrorOutput("Invalid switch statement", ast);
        const {discriminant: discriminant, cases: cases} = ast;
        const type = this.getType(discriminant);
        const varName = `switchDiscriminant${this.astKey(ast, "_")}`;
        switch (type) {
         case "Float":
         case "Number":
          retArr.push(`var ${varName} : f32 = `);
          this.astGeneric(discriminant, retArr);
          retArr.push(";\n");
          break;

         case "Integer":
          retArr.push(`var ${varName} : i32 = `);
          this.astGeneric(discriminant, retArr);
          retArr.push(";\n");
          break;

         default:
          throw this.astErrorOutput(`Unhandled switch discriminant type "${type}"`, ast);
        }
        if (cases.length === 1 && !cases[0].test) {
          this.astSwitchCaseConsequent(cases[0].consequent, retArr);
          return retArr;
        }
        let fallingThrough = false;
        let defaultResult = [];
        let movingDefaultToEnd = false;
        let pastFirstIf = false;
        for (let i = 0; i < cases.length; i++) {
          if (!cases[i].test) if (cases.length > i + 1) {
            movingDefaultToEnd = true;
            this.astSwitchCaseConsequent(cases[i].consequent, defaultResult);
            continue;
          } else retArr.push(" else {\n"); else {
            if (i === 0 || !pastFirstIf) {
              pastFirstIf = true;
              retArr.push(`if (${varName} == `);
            } else if (fallingThrough) {
              retArr.push(`${varName} == `);
              fallingThrough = false;
            } else retArr.push(` else if (${varName} == `);
            if (type === "Integer") switch (this.getType(cases[i].test)) {
             case "Number":
             case "Float":
              this.castValueToInteger(cases[i].test, retArr);
              break;

             case "LiteralInteger":
              this.castLiteralToInteger(cases[i].test, retArr);
              break;
            } else switch (this.getType(cases[i].test)) {
             case "LiteralInteger":
              this.castLiteralToFloat(cases[i].test, retArr);
              break;

             case "Integer":
              this.castValueToFloat(cases[i].test, retArr);
              break;

             default:
              this.astGeneric(cases[i].test, retArr);
            }
            if (!cases[i].consequent || cases[i].consequent.length === 0) {
              fallingThrough = true;
              retArr.push(" || ");
              continue;
            }
            retArr.push(`) {\n`);
          }
          this.astSwitchCaseConsequent(cases[i].consequent, retArr);
          retArr.push("\n}");
        }
        if (movingDefaultToEnd) {
          retArr.push(" else {");
          retArr.push(defaultResult.join(""));
          retArr.push("}");
        }
        retArr.push("\n");
        return retArr;
      }
      astThisExpression(tNode, retArr) {
        retArr.push("this");
        return retArr;
      }
      astSequenceExpression(sNode, retArr) {
        const {expressions: expressions} = sNode;
        if (expressions.length === 1) {
          this.astGeneric(expressions[0], retArr);
          return retArr;
        }
        throw this.astErrorOutput("WebGPU backend does not yet support the comma operator", sNode);
      }
      astMemberExpression(mNode, retArr) {
        const {property: property, name: name, signature: signature, origin: origin, type: type, xProperty: xProperty, yProperty: yProperty, zProperty: zProperty} = this.getMemberExpressionDetails(mNode);
        switch (signature) {
         case "value.thread.value":
         case "this.thread.value":
          if (name !== "x" && name !== "y" && name !== "z") throw this.astErrorOutput("Unexpected expression, expected `this.thread.x`, `this.thread.y`, or `this.thread.z`", mNode);
          retArr.push(`i32(threadGid.${name})`);
          return retArr;

         case "this.output.value":
          {
            const axisIndex = {
              x: 0,
              y: 1,
              z: 2
            }[name];
            if (axisIndex === void 0) throw this.astErrorOutput("Unexpected expression", mNode);
            if (this.dynamicOutput) {
              const member = `params.output${name.toUpperCase()}`;
              if (this.isState("casting-to-float")) retArr.push(`f32(${member})`); else retArr.push(`i32(${member})`);
            } else if (this.isState("casting-to-integer")) retArr.push(`${this.output[axisIndex]}`); else retArr.push(`${this.output[axisIndex]}.0`);
            return retArr;
          }

         case "value":
          throw this.astErrorOutput("Unexpected expression", mNode);

         case "value[]":
         case "value[][]":
         case "value[][][]":
         case "value[][][][]":
         case "value.value":
          if (origin === "Math") {
            retArr.push(this.wgslFloat(Math[name]));
            return retArr;
          }
          switch (property) {
           case "r":
            retArr.push(`user_${utils.sanitizeName(name)}.x`);
            return retArr;

           case "g":
            retArr.push(`user_${utils.sanitizeName(name)}.y`);
            return retArr;

           case "b":
            retArr.push(`user_${utils.sanitizeName(name)}.z`);
            return retArr;

           case "a":
            retArr.push(`user_${utils.sanitizeName(name)}.w`);
            return retArr;
          }
          break;

         case "this.constants.value":
          {
            const value = this.constants[name];
            switch (type) {
             case "Integer":
              if (this.isState("casting-to-float")) retArr.push(this.wgslFloat(value)); else retArr.push(this.wgslInt(value));
              return retArr;

             case "Number":
             case "Float":
              if (this.isState("casting-to-integer")) retArr.push(this.wgslInt(value)); else retArr.push(this.wgslFloat(value));
              return retArr;

             case "Boolean":
              retArr.push(value ? "true" : "false");
              return retArr;

             case "Array(2)":
             case "Array(3)":
             case "Array(4)":
              {
                const n = parseInt(type.substring(6), 10);
                const parts = [];
                for (let i = 0; i < n; i++) parts.push(this.wgslFloat(value[i]));
                retArr.push(`${typeMap[type]}(${parts.join(", ")})`);
                return retArr;
              }

             default:
              throw this.astErrorOutput(`WebGPU backend does not yet support constant type ${type}`, mNode);
            }
          }

         case "this.constants.value[]":
         case "this.constants.value[][]":
         case "this.constants.value[][][]":
         case "this.constants.value[][][][]":
          break;

         case "fn()[]":
          this.astCallExpression(mNode.object, retArr);
          retArr.push("[");
          retArr.push(this.memberExpressionPropertyMarkup(property));
          retArr.push("]");
          return retArr;

         default:
          throw this.astErrorOutput(`WebGPU backend does not yet support expression signature "${signature}"`, mNode);
        }
        const markupName = `${origin}_${utils.sanitizeName(name)}`;
        switch (type) {
         case "Array(2)":
         case "Array(3)":
         case "Array(4)":
          this.astGeneric(mNode.object, retArr);
          retArr.push("[");
          retArr.push(this.memberExpressionPropertyMarkup(xProperty));
          retArr.push("]");
          break;

         case "Array":
         case "Array2D":
         case "Array3D":
         case "Input":
         case "WebGPUBuffer":
         case "Number":
         case "Float":
         case "Integer":
          retArr.push(`get_${markupName}(`);
          this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
          retArr.push(")");
          break;

         case "Matrix(2)":
         case "Matrix(3)":
         case "Matrix(4)":
          throw this.astErrorOutput("WebGPU backend does not yet support Matrix types", mNode);

         default:
          throw this.astErrorOutput(`WebGPU backend does not yet support member expression type "${type}"`, mNode);
        }
        return retArr;
      }
      astCallExpression(ast, retArr) {
        if (!ast.callee) throw this.astErrorOutput("Unknown CallExpression", ast);
        if (ast.callee.type === "MemberExpression" && this.getVariableSignature(ast.callee, true) === "this.color") {
          if (!this.isRootKernel) throw this.astErrorOutput("this.color is only usable in the kernel function on the webgpu backend", ast);
          if (ast.arguments.length < 3 || ast.arguments.length > 4) throw this.astErrorOutput("this.color takes (r, g, b) or (r, g, b, a)", ast);
          retArr.push("kernelColor(data_index");
          for (let i = 0; i < ast.arguments.length; i++) {
            retArr.push(", ");
            const argument = ast.arguments[i];
            switch (this.getType(argument)) {
             case "Integer":
              this.castValueToFloat(argument, retArr);
              break;

             case "LiteralInteger":
              this.castLiteralToFloat(argument, retArr);
              break;

             default:
              this.astGeneric(argument, retArr);
            }
          }
          if (ast.arguments.length === 3) retArr.push(", 1.0");
          retArr.push(")");
          return retArr;
        }
        let functionName = null;
        const isMathFunction = this.isAstMathFunction(ast);
        if (isMathFunction || ast.callee.object && ast.callee.object.type === "ThisExpression") functionName = ast.callee.property.name; else if (ast.callee.type === "SequenceExpression" && ast.callee.expressions[0].type === "Literal" && !isNaN(ast.callee.expressions[0].raw)) functionName = ast.callee.expressions[1].property.name; else functionName = ast.callee.name;
        if (!functionName) throw this.astErrorOutput(`Unhandled function, couldn't find name`, ast);
        let emitName = functionName;
        if (isMathFunction) {
          if (functionName === "random") {
            retArr.push("pcg_random()");
            return retArr;
          }
          if (mathFunctionRenames[functionName]) functionName = mathFunctionRenames[functionName];
          emitName = functionName;
        } else emitName = this.mangleFunctionName(functionName);
        if (this.calledFunctions.indexOf(functionName) < 0) this.calledFunctions.push(functionName);
        if (this.onFunctionCall) this.onFunctionCall(this.name, functionName, ast.arguments);
        const needsIntegerWrap = isMathFunction && integerResultMathFunctions[functionName] && this.isState("building-integer");
        if (needsIntegerWrap) retArr.push("i32(");
        retArr.push(emitName);
        retArr.push("(");
        if (isMathFunction) for (let i = 0; i < ast.arguments.length; ++i) {
          const argument = ast.arguments[i];
          const argumentType = this.getType(argument);
          if (i > 0) retArr.push(", ");
          switch (argumentType) {
           case "Integer":
            this.castValueToFloat(argument, retArr);
            break;

           case "LiteralInteger":
            this.castLiteralToFloat(argument, retArr);
            break;

           default:
            this.astGeneric(argument, retArr);
            break;
          }
        } else {
          const targetTypes = this.lookupFunctionArgumentTypes(functionName) || [];
          for (let i = 0; i < ast.arguments.length; ++i) {
            const argument = ast.arguments[i];
            let targetType = targetTypes[i];
            if (i > 0) retArr.push(", ");
            const argumentType = this.getType(argument);
            if (!targetType) {
              this.triggerImplyArgumentType(functionName, i, argumentType, this);
              targetType = argumentType;
            }
            switch (argumentType) {
             case "Boolean":
              this.astGeneric(argument, retArr);
              continue;

             case "Number":
             case "Float":
              if (targetType === "Integer") {
                retArr.push("i32(");
                this.astGeneric(argument, retArr);
                retArr.push(")");
                continue;
              } else if (targetType === "Number" || targetType === "Float") {
                this.astGeneric(argument, retArr);
                continue;
              } else if (targetType === "LiteralInteger") {
                this.castLiteralToFloat(argument, retArr);
                continue;
              }
              break;

             case "Integer":
              if (targetType === "Number" || targetType === "Float") {
                retArr.push("f32(");
                this.astGeneric(argument, retArr);
                retArr.push(")");
                continue;
              } else if (targetType === "Integer") {
                this.astGeneric(argument, retArr);
                continue;
              }
              break;

             case "LiteralInteger":
              if (targetType === "Integer") {
                this.castLiteralToInteger(argument, retArr);
                continue;
              } else if (targetType === "Number" || targetType === "Float") {
                this.castLiteralToFloat(argument, retArr);
                continue;
              } else if (targetType === "LiteralInteger") {
                this.astGeneric(argument, retArr);
                continue;
              }
              break;

             case "Array(2)":
             case "Array(3)":
             case "Array(4)":
              if (targetType === argumentType) {
                if (argument.type === "Identifier") retArr.push(`user_${utils.sanitizeName(argument.name)}`); else this.astGeneric(argument, retArr);
                continue;
              }
              break;

             case "Array":
             case "Array2D":
             case "Array3D":
             case "Input":
             case "WebGPUBuffer":
              throw this.astErrorOutput("WebGPU backend does not yet support array arguments to helper functions", ast);
            }
            throw this.astErrorOutput(`Unhandled argument combination of ${argumentType} and ${targetType} for argument named "${argument.name}"`, ast);
          }
        }
        retArr.push(")");
        if (needsIntegerWrap) retArr.push(")");
        return retArr;
      }
      astArrayExpression(arrNode, retArr) {
        switch (this.getType(arrNode)) {
         case "Matrix(2)":
         case "Matrix(3)":
         case "Matrix(4)":
          throw this.astErrorOutput("WebGPU backend does not yet support Matrix types", arrNode);
        }
        const arrLen = arrNode.elements.length;
        retArr.push(`vec${arrLen}<f32>(`);
        for (let i = 0; i < arrLen; ++i) {
          if (i > 0) retArr.push(", ");
          const subNode = arrNode.elements[i];
          switch (this.getType(subNode)) {
           case "Integer":
            this.castValueToFloat(subNode, retArr);
            break;

           case "LiteralInteger":
            this.castLiteralToFloat(subNode, retArr);
            break;

           default:
            this.astGeneric(subNode, retArr);
          }
        }
        retArr.push(")");
        return retArr;
      }
      memberExpressionXYZ(x, y, z, retArr) {
        if (z) retArr.push(this.memberExpressionPropertyMarkup(z), ", "); else retArr.push("0, ");
        if (y) retArr.push(this.memberExpressionPropertyMarkup(y), ", "); else retArr.push("0, ");
        retArr.push(this.memberExpressionPropertyMarkup(x));
        return retArr;
      }
      memberExpressionPropertyMarkup(property) {
        if (!property) throw new Error("Property not set");
        const type = this.getType(property);
        const result = [];
        switch (type) {
         case "Number":
         case "Float":
          this.castValueToInteger(property, result);
          break;

         case "LiteralInteger":
          this.castLiteralToInteger(property, result);
          break;

         case "Integer":
          this.pushState("building-integer");
          result.push("i32(");
          this.astGeneric(property, result);
          result.push(")");
          this.popState("building-integer");
          break;

         default:
          this.astGeneric(property, result);
        }
        return result.join("");
      }
    };
    const typeMap = {
      Number: "f32",
      Float: "f32",
      Integer: "i32",
      LiteralInteger: "f32",
      Boolean: "bool",
      "Array(2)": "vec2<f32>",
      "Array(3)": "vec3<f32>",
      "Array(4)": "vec4<f32>"
    };
    const operatorMap = {
      "===": "==",
      "!==": "!="
    };
    const vectorComponents = [ "x", "y", "z", "w" ];
    const mathFunctionRenames = {
      pow: "_pow",
      round: "_round"
    };
    const integerResultMathFunctions = {
      ceil: true,
      floor: true,
      _round: true
    };
    module.exports = {
      WGSLFunctionNode: WGSLFunctionNode
    };
  });
  var require_context = __commonJSMin((exports, module) => {
    let contextPromise = null;
    module.exports = {
      WebGPUContext: class WebGPUContext {
        static get isSupported() {
          return typeof navigator !== "undefined" && !!navigator.gpu;
        }
        static acquire() {
          if (contextPromise) return contextPromise;
          const promise = (async () => {
            if (!WebGPUContext.isSupported) throw new Error("WebGPU is not supported on this platform (navigator.gpu is missing)");
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) throw new Error("WebGPU is present (navigator.gpu) but no adapter is available. On headless Chromium there is no adapter; run headed. Use `await GPU.isWebGPUAvailable()` to feature-detect.");
            const device = await adapter.requestDevice({
              requiredLimits: {
                maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
                maxBufferSize: adapter.limits.maxBufferSize
              }
            });
            const context = {
              adapter: adapter,
              device: device,
              isLost: false
            };
            device.lost.then(info => {
              context.isLost = true;
              if (info.reason !== "destroyed") console.error(`gpu.js [webgpu]: device lost: ${info.message}`);
              if (contextPromise === promise) contextPromise = null;
            });
            device.onuncapturederror = e => {
              console.error(`gpu.js [webgpu]: ${e.error.message}`);
            };
            return context;
          })();
          promise.catch(() => {
            if (contextPromise === promise) contextPromise = null;
          });
          return contextPromise = promise;
        }
        static destroy() {
          if (!contextPromise) return Promise.resolve();
          const promise = contextPromise;
          contextPromise = null;
          return promise.then(({device: device}) => {
            device.destroy();
          }, () => {});
        }
      }
    };
  });
  var require_buffer_result = __commonJSMin((exports, module) => {
    module.exports = {
      WebGPUBufferResult: class WebGPUBufferResult {
        constructor(settings) {
          this.buffer = settings.buffer;
          this.output = settings.output;
          this.componentCount = settings.componentCount || 1;
          this.context = settings.context;
          this.kernel = settings.kernel;
          this.type = "WebGPUBuffer";
          this._deleted = false;
          if (this.buffer._refs) this.buffer._refs++; else this.buffer._refs = 1;
        }
        toArray() {
          if (this._deleted) return Promise.reject(new Error("WebGPUBufferResult has been deleted"));
          return this.kernel.readBufferResult(this);
        }
        delete() {
          if (this._deleted) return;
          this._deleted = true;
          if (--this.buffer._refs === 0) this.buffer.destroy();
        }
        clone() {
          return new WebGPUBufferResult(this);
        }
      }
    };
  });
  var require_kernel$1 = __commonJSMin((exports, module) => {
    const {Kernel: Kernel} = require_kernel$7();
    const {FunctionBuilder: FunctionBuilder} = require_function_builder();
    const {WGSLFunctionNode: WGSLFunctionNode} = require_function_node$1();
    const {WebGPUContext: WebGPUContext} = require_context();
    const {WebGPUBufferResult: WebGPUBufferResult} = require_buffer_result();
    const {utils: utils} = require_utils();
    const {Input: Input} = require_input();
    const USAGE_STORAGE = 128;
    const MAP_MODE_READ = 1;
    const features = Object.freeze({
      kernelMap: false,
      isIntegerDivisionAccurate: true,
      isSpeedTacticSupported: false,
      isTextureFloat: true,
      isDrawBuffers: false,
      kernelMapSize: 0,
      channelCount: 1,
      maxTextureSize: Infinity,
      isFloatRead: true
    });
    const wgslHelpers = {
      _pow: "fn _pow(v1 : f32, v2 : f32) -> f32 {\n  if (v2 == 0.0) { return 1.0; }\n  return pow(v1, v2);\n}",
      _round: "fn _round(x : f32) -> f32 {\n  return floor(x + 0.5);\n}",
      cbrt: "fn cbrt(x : f32) -> f32 {\n  return sign(x) * pow(abs(x), 1.0 / 3.0);\n}",
      expm1: "fn expm1(x : f32) -> f32 {\n  return exp(x) - 1.0;\n}",
      fround: "fn fround(x : f32) -> f32 {\n  return x;\n}",
      imul: "fn imul(a : f32, b : f32) -> f32 {\n  return f32(i32(a) * i32(b));\n}",
      log10: `fn log10(x : f32) -> f32 {\n  return log2(x) * ${1 / Math.log2(10)};\n}`,
      log1p: "fn log1p(x : f32) -> f32 {\n  return log(1.0 + x);\n}",
      clz32: "fn clz32(x : f32) -> f32 {\n  return f32(countLeadingZeros(u32(x)));\n}"
    };
    var WebGPUKernel = class extends Kernel {
      static get isSupported() {
        return WebGPUContext.isSupported;
      }
      static get isAsync() {
        return true;
      }
      static isContextMatch(context) {
        return Boolean(context && typeof context.createShaderModule === "function" && typeof context.createComputePipeline === "function");
      }
      static getFeatures() {
        return features;
      }
      static get features() {
        return features;
      }
      static get mode() {
        return "webgpu";
      }
      static getSignature(kernel, argumentTypes) {
        return "webgpu" + (argumentTypes.length > 0 ? ":" + argumentTypes.join(",") : "");
      }
      static destroyContext(context) {}
      static nativeFunctionArguments() {
        throw new Error("WebGPU backend does not yet support native functions");
      }
      static nativeFunctionReturnType() {
        throw new Error("WebGPU backend does not yet support native functions");
      }
      static combineKernels() {
        throw new Error("WebGPU backend does not yet support combineKernels; chain kernels with `await` and pipeline mode instead");
      }
      constructor(source, settings) {
        super(source, settings);
        if (settings) {
          if (settings.precision === "unsigned" && !settings.graphical) throw new Error(`WebGPU backend does not yet support precision: 'unsigned'; it is single precision only`);
          if (settings.subKernels) throw new Error("WebGPU backend does not yet support createKernelMap");
        }
        this.mergeSettings(source.settings || settings);
        if (this.precision === null || this.graphical) this.precision = "single";
        this.asyncMode = true;
        this.threadDim = null;
        this.componentCount = 1;
        this.compiledSource = null;
        this.translatedBody = null;
        this.translatedFunctions = null;
        this.paramsLayout = null;
        this._buildPromise = null;
        this._device = null;
        this.computePipeline = null;
        this.bindGroupLayout = null;
        this.bindGroup = null;
        this.bindGroupDirty = true;
        this.paramsBuffer = null;
        this.paramsMirror = null;
        this.outputBuffer = null;
        this.argumentBuffers = null;
        this.constantBuffers = null;
        this.stagingPool = [];
        this._canvasContext = null;
        this._blitPipeline = null;
        this._blitParamsBuffer = null;
        this._blitBindGroup = null;
        this._blitBoundOutputBuffer = null;
      }
      initCanvas() {
        if (this.graphical && typeof document !== "undefined") return document.createElement("canvas");
        return null;
      }
      initContext() {
        return null;
      }
      initPlugins(settings) {
        return [];
      }
      setOutput(output) {
        const newOutput = this.toKernelOutput(output);
        if (this.built) {
          if (!this.dynamicOutput) throw new Error("Resizing a kernel with dynamicOutput: false is not possible");
          if (newOutput.length !== this.output.length) throw new Error("WebGPU backend does not yet support changing the output rank of a built kernel; the workgroup shape is fixed at build");
        }
        this.output = newOutput;
        return this;
      }
      toString() {
        throw new Error("WebGPU backend does not yet support toString");
      }
      validateSettings(args) {
        if (this.graphical) {
          if (!this.output || this.output.length !== 2) throw new Error("Output must have 2 dimensions on graphical mode");
          if (this.pipeline) throw new Error("graphical mode and pipeline mode are mutually exclusive");
          if (!this.canvas) throw new Error("graphical mode requires a canvas (none could be created; pass one in settings)");
        }
        if (this.precision === "unsigned") throw new Error(`WebGPU backend does not yet support precision: 'unsigned'; it is single precision only`);
        this.precision = "single";
        if (this.subKernels && this.subKernels.length > 0) throw new Error("WebGPU backend does not yet support createKernelMap");
        if (!this.output || this.output.length === 0) {
          if (args.length !== 1) throw new Error("Auto output only supported for kernels with only one input");
          const argType = utils.getVariableType(args[0], this.strictIntegers);
          if (argType === "Array") this.output = Array.from(utils.getDimensions(args[0])); else if (argType === "WebGPUBuffer") this.output = Array.from(args[0].output); else throw new Error("Auto output not supported for input type: " + argType);
        }
        this.checkOutput();
      }
      setupArguments(args) {
        super.setupArguments(args);
        for (let i = 0; i < this.argumentTypes.length; i++) switch (this.argumentTypes[i]) {
         case "Array":
         case "Input":
         case "WebGPUBuffer":
         case "Number":
         case "Float":
         case "Integer":
         case "Boolean":
          continue;

         default:
          throw new Error(`WebGPU backend does not yet support argument type ${this.argumentTypes[i]} (argument "${this.argumentNames[i]}")`);
        }
      }
      setupConstants() {
        super.setupConstants();
        for (const name in this.constantTypes) switch (this.constantTypes[name]) {
         case "Array":
         case "Input":
         case "Number":
         case "Float":
         case "Integer":
         case "Boolean":
         case "Array(2)":
         case "Array(3)":
         case "Array(4)":
          continue;

         default:
          throw new Error(`WebGPU backend does not yet support constant type ${this.constantTypes[name]} (constant "${name}")`);
        }
      }
      build() {
        if (this.built) return Promise.resolve();
        if (this._buildPromise) return this._buildPromise;
        this.setupConstants();
        this.setupArguments(arguments);
        this.validateSettings(arguments);
        const threadDim = this.threadDim = Array.from(this.output);
        while (threadDim.length < 3) threadDim.push(1);
        this.translateSource();
        this.paramsLayout = this.computeParamsLayout();
        this.compiledSource = this.assembleWGSL();
        if (this.debug) {
          console.log("WGSL Shader Output:");
          console.log(this.compiledSource);
        }
        this.buildSignature(arguments);
        return this._buildPromise = this._buildAsync();
      }
      translateSource() {
        const functionBuilder = FunctionBuilder.fromKernel(this, WGSLFunctionNode);
        const prototypes = functionBuilder.getPrototypes("kernel");
        this.translatedBody = prototypes[prototypes.length - 1];
        this.translatedFunctions = prototypes.slice(0, -1).join("\n");
        if (this.graphical) {
          this.componentCount = 4;
          return;
        }
        if (!this.returnType) this.returnType = functionBuilder.getKernelResultType();
        switch (this.returnType) {
         case "Number":
         case "Float":
         case "Integer":
         case "LiteralInteger":
          this.componentCount = 1;
          break;

         case "Array(2)":
          this.componentCount = 2;
          break;

         case "Array(3)":
          this.componentCount = 3;
          break;

         case "Array(4)":
          this.componentCount = 4;
          break;

         default:
          throw new Error(`WebGPU backend does not yet support returning ${this.returnType}`);
        }
      }
      computeParamsLayout() {
        const arrayArgs = [];
        const scalarArgs = [];
        let offset = 16;
        for (let i = 0; i < this.argumentTypes.length; i++) {
          const type = this.argumentTypes[i];
          const name = utils.sanitizeName(this.argumentNames[i]);
          if (type === "Array" || type === "Input" || type === "WebGPUBuffer") {
            arrayArgs.push({
              name: name,
              index: i,
              type: type,
              dimsOffset: offset,
              buffer: null,
              boundBuffer: null
            });
            offset += 16;
          } else scalarArgs.push({
            name: name,
            index: i,
            type: type,
            offset: null
          });
        }
        for (let i = 0; i < scalarArgs.length; i++) {
          scalarArgs[i].offset = offset;
          offset += 4;
        }
        let randomSeedOffset = null;
        if (/\bpcg_random\(/.test(`${this.translatedFunctions}\n${this.translatedBody}`)) {
          randomSeedOffset = offset;
          offset += 4;
        }
        const bufferConstants = [];
        if (this.constants) for (const name in this.constants) {
          if (!this.constants.hasOwnProperty(name)) continue;
          const type = this.constantTypes[name];
          if (type === "Array" || type === "Input") bufferConstants.push({
            name: utils.sanitizeName(name),
            constantName: name,
            buffer: null
          });
        }
        return {
          arrayArgs: arrayArgs,
          scalarArgs: scalarArgs,
          bufferConstants: bufferConstants,
          randomSeedOffset: randomSeedOffset,
          byteLength: Math.ceil(offset / 16) * 16
        };
      }
      scalarWGSLType(type) {
        switch (type) {
         case "Integer":
          return "i32";

         case "Boolean":
          return "u32";

         default:
          return "f32";
        }
      }
      assembleWGSL() {
        const {arrayArgs: arrayArgs, scalarArgs: scalarArgs, bufferConstants: bufferConstants} = this.paramsLayout;
        const wgsl = [];
        const structMembers = [ "  outputX : u32,", "  outputY : u32,", "  outputZ : u32,", "  dispatchWidth : u32," ];
        for (let i = 0; i < arrayArgs.length; i++) structMembers.push(`  user_${arrayArgs[i].name}_dims : vec4<u32>,`);
        for (let i = 0; i < scalarArgs.length; i++) structMembers.push(`  user_${scalarArgs[i].name} : ${this.scalarWGSLType(scalarArgs[i].type)},`);
        if (this.paramsLayout.randomSeedOffset !== null) structMembers.push("  randomSeed : u32,");
        wgsl.push("struct Params {", structMembers.join("\n"), "}");
        wgsl.push("@group(0) @binding(0) var<uniform> params : Params;");
        for (let i = 0; i < arrayArgs.length; i++) wgsl.push(`@group(0) @binding(${1 + i}) var<storage, read> user_${arrayArgs[i].name} : array<f32>;`);
        const outBinding = 1 + arrayArgs.length;
        wgsl.push(`@group(0) @binding(${outBinding}) var<storage, read_write> result : array<f32>;`);
        if (this.graphical) wgsl.push("fn kernelColor(index : i32, r : f32, g : f32, b : f32, a : f32) {\n  result[index * 4] = r;\n  result[index * 4 + 1] = g;\n  result[index * 4 + 2] = b;\n  result[index * 4 + 3] = a;\n}");
        for (let i = 0; i < bufferConstants.length; i++) wgsl.push(`@group(0) @binding(${outBinding + 1 + i}) var<storage, read> constants_${bufferConstants[i].name} : array<f32>;`);
        wgsl.push("var<private> threadGid : vec3<u32>;");
        if (this.paramsLayout.randomSeedOffset !== null) wgsl.push("var<private> pcgState : u32;\nfn pcg_random() -> f32 {\n  pcgState = pcgState * 747796405u + 2891336453u;\n  let word = ((pcgState >> ((pcgState >> 28u) + 4u)) ^ pcgState) * 277803737u;\n  let mixed = (word >> 22u) ^ word;\n  return f32(mixed >> 8u) / 16777216.0;\n}");
        const translated = `${this.translatedFunctions}\n${this.translatedBody}`;
        if (/\bLOOP_MAX\b/.test(translated)) wgsl.push(`const LOOP_MAX : i32 = ${parseInt(this.loopMaxIterations, 10) || 1e3};`);
        for (const helperName in wgslHelpers) if (new RegExp(`\\b${helperName}\\(`).test(translated)) wgsl.push(wgslHelpers[helperName]);
        for (let i = 0; i < arrayArgs.length; i++) {
          const name = arrayArgs[i].name;
          wgsl.push(`fn get_user_${name}(z : i32, y : i32, x : i32) -> f32 {\n  return user_${name}[u32(x + i32(params.user_${name}_dims.x) * (y + i32(params.user_${name}_dims.y) * z))];\n}`);
        }
        for (let i = 0; i < bufferConstants.length; i++) {
          const record = bufferConstants[i];
          const value = this.constants[record.constantName];
          const dims = this.constantDimensions(value);
          wgsl.push(`fn get_constants_${record.name}(z : i32, y : i32, x : i32) -> f32 {\n  return constants_${record.name}[u32(x + ${dims[0]} * (y + ${dims[1]} * z))];\n}`);
        }
        if (this.translatedFunctions) wgsl.push(this.translatedFunctions);
        const workgroupSize = this.output.length === 1 ? [ 64, 1, 1 ] : [ 8, 8, 1 ];
        this.workgroupSize = workgroupSize;
        if (this.output.length === 1) wgsl.push(`@compute @workgroup_size(${workgroupSize[0]}, ${workgroupSize[1]}, ${workgroupSize[2]})\nfn main(@builtin(global_invocation_id) gid : vec3<u32>) {\n  let flat_index : u32 = gid.x + gid.y * params.dispatchWidth;\n  threadGid = vec3<u32>(flat_index, 0u, 0u);\n  if (flat_index >= params.outputX) { return; }\n  let data_index : i32 = i32(flat_index);\n${this.paramsLayout.randomSeedOffset !== null ? "  pcgState = (params.randomSeed + u32(data_index) * 2654435769u) * 747796405u + 2891336453u;\n" : ""}${this.translatedBody}\n}`); else wgsl.push(`@compute @workgroup_size(${workgroupSize[0]}, ${workgroupSize[1]}, ${workgroupSize[2]})\nfn main(@builtin(global_invocation_id) gid : vec3<u32>) {\n  threadGid = gid;\n  if (gid.x >= params.outputX || gid.y >= params.outputY || gid.z >= params.outputZ) { return; }\n  let data_index : i32 = i32(gid.x + params.outputX * (gid.y + params.outputY * gid.z));\n${this.paramsLayout.randomSeedOffset !== null ? "  pcgState = (params.randomSeed + u32(data_index) * 2654435769u) * 747796405u + 2891336453u;\n" : ""}${this.translatedBody}\n}`);
        return wgsl.join("\n");
      }
      constantDimensions(value) {
        const dims = value instanceof Input ? Array.from(value.size) : Array.from(utils.getDimensions(value));
        while (dims.length < 3) dims.push(1);
        return dims;
      }
      async _buildAsync() {
        const context = await WebGPUContext.acquire();
        this.context = context;
        const device = this._device = context.device;
        const module$6 = device.createShaderModule({
          code: this.compiledSource
        });
        const errors = (await module$6.getCompilationInfo()).messages.filter(message => message.type === "error");
        if (errors.length > 0) throw new Error("Error compiling WGSL compute shader:\n" + errors.map(message => `  ${message.lineNum}:${message.linePos} ${message.message}`).join("\n") + `\n--- generated WGSL ---\n${this.compiledSource}`);
        const {arrayArgs: arrayArgs, bufferConstants: bufferConstants, byteLength: byteLength} = this.paramsLayout;
        const layoutEntries = [ {
          binding: 0,
          visibility: 4,
          buffer: {
            type: "uniform"
          }
        } ];
        for (let i = 0; i < arrayArgs.length; i++) layoutEntries.push({
          binding: 1 + i,
          visibility: 4,
          buffer: {
            type: "read-only-storage"
          }
        });
        const outBinding = 1 + arrayArgs.length;
        layoutEntries.push({
          binding: outBinding,
          visibility: 4,
          buffer: {
            type: "storage"
          }
        });
        for (let i = 0; i < bufferConstants.length; i++) layoutEntries.push({
          binding: outBinding + 1 + i,
          visibility: 4,
          buffer: {
            type: "read-only-storage"
          }
        });
        this.bindGroupLayout = device.createBindGroupLayout({
          entries: layoutEntries
        });
        device.pushErrorScope("validation");
        this.computePipeline = device.createComputePipeline({
          layout: device.createPipelineLayout({
            bindGroupLayouts: [ this.bindGroupLayout ]
          }),
          compute: {
            module: module$6,
            entryPoint: "main"
          }
        });
        const pipelineError = await device.popErrorScope();
        if (pipelineError) throw new Error(`Error creating WebGPU compute pipeline for kernel: ${pipelineError.message}`);
        if (this.graphical) await this._buildBlitPipeline(device);
        this.paramsBuffer = device.createBuffer({
          size: byteLength,
          usage: 72
        });
        this.paramsMirror = new ArrayBuffer(byteLength);
        this.paramsU32 = new Uint32Array(this.paramsMirror);
        this.paramsI32 = new Int32Array(this.paramsMirror);
        this.paramsF32 = new Float32Array(this.paramsMirror);
        this.constantBuffers = [];
        for (let i = 0; i < bufferConstants.length; i++) {
          const record = bufferConstants[i];
          const value = this.constants[record.constantName];
          const dims = this.constantDimensions(value);
          const flatLength = dims[0] * dims[1] * dims[2];
          this._checkBufferSize(flatLength * 4, `constant "${record.constantName}"`);
          const buffer = device.createBuffer({
            size: Math.max(flatLength * 4, 4),
            usage: USAGE_STORAGE,
            mappedAtCreation: true
          });
          const mapped = new Float32Array(buffer.getMappedRange());
          utils.flattenTo(value instanceof Input ? value.value : value, mapped.subarray(0, flatLength));
          buffer.unmap();
          record.buffer = buffer;
          this.constantBuffers.push(buffer);
        }
        this._ensureOutputBuffer();
        this.bindGroupDirty = true;
        this.built = true;
      }
      _computeDispatch(threadDim) {
        const [wx, wy, wz] = this.workgroupSize;
        const groups = [ Math.ceil(threadDim[0] / wx), Math.ceil(threadDim[1] / wy), Math.ceil(threadDim[2] / wz) ];
        const maxGroups = this._device.limits.maxComputeWorkgroupsPerDimension;
        let dispatchWidth = 0;
        if (this.output.length === 1) {
          if (groups[0] > maxGroups) {
            groups[1] = Math.ceil(groups[0] / maxGroups);
            groups[0] = Math.ceil(groups[0] / groups[1]);
          }
          dispatchWidth = groups[0] * wx;
        }
        for (let i = 0; i < 3; i++) if (groups[i] > maxGroups) throw new Error(`output dimension ${i} needs ${groups[i]} workgroups, over this device's limit of ${maxGroups}`);
        return {
          groups: groups,
          dispatchWidth: dispatchWidth
        };
      }
      async _buildBlitPipeline(device) {
        this.canvas.width = this.output[0];
        this.canvas.height = this.output[1];
        this._canvasContext = this.canvas.getContext("webgpu");
        if (!this._canvasContext) throw new Error("could not get a webgpu context from the canvas");
        const format = navigator.gpu.getPreferredCanvasFormat();
        this._canvasContext.configure({
          device: device,
          format: format,
          alphaMode: "premultiplied"
        });
        const blitModule = device.createShaderModule({
          code: "struct BlitParams { width : u32, height : u32, pad0 : u32, pad1 : u32 }\n@group(0) @binding(0) var<uniform> blit : BlitParams;\n@group(0) @binding(1) var<storage, read> pixels : array<f32>;\n@vertex fn vs(@builtin(vertex_index) vi : u32) -> @builtin(position) vec4<f32> {\n  var pos = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));\n  return vec4<f32>(pos[vi], 0.0, 1.0);\n}\n@fragment fn fs(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {\n  let x = u32(pos.x);\n  let y = u32(pos.y);\n  let row = blit.height - 1u - y;\n  let i = (row * blit.width + x) * 4u;\n  let a = pixels[i + 3u];\n  return vec4<f32>(pixels[i] * a, pixels[i + 1u] * a, pixels[i + 2u] * a, a);\n}"
        });
        const errors = (await blitModule.getCompilationInfo()).messages.filter(message => message.type === "error");
        if (errors.length > 0) throw new Error("Error compiling the graphical blit shader:\n" + errors.map(message => `  ${message.lineNum}:${message.linePos} ${message.message}`).join("\n"));
        this._blitBindGroupLayout = device.createBindGroupLayout({
          entries: [ {
            binding: 0,
            visibility: 2,
            buffer: {
              type: "uniform"
            }
          }, {
            binding: 1,
            visibility: 2,
            buffer: {
              type: "read-only-storage"
            }
          } ]
        });
        this._blitPipeline = device.createRenderPipeline({
          layout: device.createPipelineLayout({
            bindGroupLayouts: [ this._blitBindGroupLayout ]
          }),
          vertex: {
            module: blitModule,
            entryPoint: "vs"
          },
          fragment: {
            module: blitModule,
            entryPoint: "fs",
            targets: [ {
              format: format
            } ]
          },
          primitive: {
            topology: "triangle-list"
          }
        });
        this._blitParamsBuffer = device.createBuffer({
          size: 16,
          usage: 72
        });
      }
      _ensureOutputBuffer() {
        const [tx, ty, tz] = this.threadDim;
        const byteLength = tx * ty * tz * 4 * this.componentCount;
        if (this.immutable && this.pipeline && this.outputBuffer) {
          if (--this.outputBuffer._refs === 0) this.outputBuffer.destroy();
          this.outputBuffer = null;
          this.bindGroupDirty = true;
        }
        if (this.outputBuffer && this.outputBuffer.size >= byteLength) return;
        if (this.outputBuffer) {
          if (--this.outputBuffer._refs === 0) this.outputBuffer.destroy();
        }
        this._checkBufferSize(byteLength, `output [${this.output.join(", ")}]`);
        this.outputBuffer = this._device.createBuffer({
          size: byteLength,
          usage: 132
        });
        this.outputBuffer._refs = 1;
        this.bindGroupDirty = true;
      }
      _checkBufferSize(byteLength, what) {
        const limits = this._device.limits;
        const max = Math.min(limits.maxStorageBufferBindingSize, limits.maxBufferSize);
        if (byteLength > max) throw new Error(`WebGPU backend: ${what} needs ${byteLength} bytes but this device allows ${max} per storage buffer (maxStorageBufferBindingSize/maxBufferSize); reduce the output or split the work across kernels`);
      }
      _snapshotArguments(args) {
        const snapshot = new Array(args.length);
        for (let i = 0; i < args.length; i++) {
          const value = args[i];
          const type = this.argumentTypes[i];
          if (value instanceof WebGPUBufferResult) {
            snapshot[i] = {
              kind: "buffer",
              handle: value
            };
            continue;
          }
          switch (type) {
           case "Array":
            {
              const dims = Array.from(utils.getDimensions(value));
              while (dims.length < 3) dims.push(1);
              const flat = new Float32Array(dims[0] * dims[1] * dims[2]);
              utils.flattenTo(value, flat);
              snapshot[i] = {
                kind: "array",
                dims: dims,
                flat: flat
              };
              break;
            }

           case "Input":
            {
              const dims = Array.from(value.size);
              while (dims.length < 3) dims.push(1);
              const flat = new Float32Array(dims[0] * dims[1] * dims[2]);
              utils.flattenTo(value.value, flat);
              snapshot[i] = {
                kind: "array",
                dims: dims,
                flat: flat
              };
              break;
            }

           case "WebGPUBuffer":
            snapshot[i] = {
              kind: "buffer",
              handle: value
            };
            break;

           case "Boolean":
            snapshot[i] = {
              kind: "scalar",
              value: value ? 1 : 0
            };
            break;

           default:
            snapshot[i] = {
              kind: "scalar",
              value: value
            };
          }
        }
        return snapshot;
      }
      run() {
        if (!this.built && !this._buildPromise) this.build.apply(this, arguments);
        const snapshot = this._snapshotArguments(arguments);
        if (!this.built) return this._buildPromise.then(() => this._runInternal(snapshot));
        return this._runInternal(snapshot);
      }
      _runInternal(snapshot) {
        if (this.context && this.context.isLost) throw new Error("WebGPU device was lost; call kernel.destroy() (or gpu.destroy()) and run again to rebuild on a fresh device");
        const device = this._device;
        const queue = device.queue;
        const {arrayArgs: arrayArgs, scalarArgs: scalarArgs, bufferConstants: bufferConstants} = this.paramsLayout;
        const threadDim = this.threadDim = Array.from(this.output);
        while (threadDim.length < 3) threadDim.push(1);
        this._ensureOutputBuffer();
        if (this.paramsLayout.randomSeedOffset !== null) {
          const seed = this.randomSeed !== null ? this.randomSeed >>> 0 : Math.random() * 4294967296 >>> 0;
          this.paramsU32[this.paramsLayout.randomSeedOffset / 4] = seed;
        }
        this.paramsU32[0] = threadDim[0];
        this.paramsU32[1] = threadDim[1];
        this.paramsU32[2] = threadDim[2];
        this.paramsU32[3] = this._computeDispatch(threadDim).dispatchWidth;
        for (let i = 0; i < arrayArgs.length; i++) {
          const record = arrayArgs[i];
          const snap = snapshot[record.index];
          let dims;
          if (snap.kind === "buffer") {
            const handle = snap.handle;
            if (handle._deleted) throw new Error(`WebGPUBufferResult passed as argument "${this.argumentNames[record.index]}" has been deleted`);
            if (handle.context !== this.context) throw new Error(`WebGPUBufferResult passed as argument "${this.argumentNames[record.index]}" is from a different WebGPU device`);
            if (handle.buffer === this.outputBuffer) throw new Error(`WebGPUBufferResult passed as argument "${this.argumentNames[record.index]}" is this kernel's own output buffer; use a second kernel or clone the result`);
            if (handle.componentCount !== 1) throw new Error(`WebGPU backend does not yet support Array(${handle.componentCount}) pipeline results as kernel arguments`);
            dims = Array.from(handle.output);
            while (dims.length < 3) dims.push(1);
            if (record.boundBuffer !== handle.buffer) {
              record.boundBuffer = handle.buffer;
              this.bindGroupDirty = true;
            }
          } else {
            dims = snap.dims;
            const byteLength = snap.flat.byteLength;
            if (!record.buffer || record.buffer.size < byteLength) {
              if (record.buffer) {
                if (!this.dynamicArguments) throw new Error(`argument "${this.argumentNames[record.index]}" grew from ${record.buffer.size / 4} to ${snap.flat.length} values; use dynamicArguments: true for varying input sizes`);
                record.buffer.destroy();
              }
              this._checkBufferSize(byteLength, `argument "${this.argumentNames[record.index]}"`);
              record.buffer = device.createBuffer({
                size: byteLength,
                usage: 136
              });
              this.bindGroupDirty = true;
            }
            queue.writeBuffer(record.buffer, 0, snap.flat);
            if (record.boundBuffer !== record.buffer) {
              record.boundBuffer = record.buffer;
              this.bindGroupDirty = true;
            }
          }
          const base = record.dimsOffset / 4;
          this.paramsU32[base] = dims[0];
          this.paramsU32[base + 1] = dims[1];
          this.paramsU32[base + 2] = dims[2];
          this.paramsU32[base + 3] = dims[0] * dims[1] * dims[2];
        }
        for (let i = 0; i < scalarArgs.length; i++) {
          const record = scalarArgs[i];
          const slot = record.offset / 4;
          switch (record.type) {
           case "Integer":
            this.paramsI32[slot] = snapshot[record.index].value;
            break;

           case "Boolean":
            this.paramsU32[slot] = snapshot[record.index].value;
            break;

           default:
            this.paramsF32[slot] = snapshot[record.index].value;
          }
        }
        queue.writeBuffer(this.paramsBuffer, 0, this.paramsMirror);
        if (this.bindGroupDirty) {
          const entries = [ {
            binding: 0,
            resource: {
              buffer: this.paramsBuffer
            }
          } ];
          for (let i = 0; i < arrayArgs.length; i++) entries.push({
            binding: 1 + i,
            resource: {
              buffer: arrayArgs[i].boundBuffer
            }
          });
          const outBinding = 1 + arrayArgs.length;
          entries.push({
            binding: outBinding,
            resource: {
              buffer: this.outputBuffer
            }
          });
          for (let i = 0; i < bufferConstants.length; i++) entries.push({
            binding: outBinding + 1 + i,
            resource: {
              buffer: bufferConstants[i].buffer
            }
          });
          this.bindGroup = device.createBindGroup({
            layout: this.bindGroupLayout,
            entries: entries
          });
          this.bindGroupDirty = false;
        }
        const {groups: groups} = this._computeDispatch(threadDim);
        const byteLength = threadDim[0] * threadDim[1] * threadDim[2] * 4 * this.componentCount;
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginComputePass();
        pass.setPipeline(this.computePipeline);
        pass.setBindGroup(0, this.bindGroup);
        pass.dispatchWorkgroups(groups[0], groups[1], groups[2]);
        pass.end();
        if (this.graphical) {
          if (this.canvas.width !== this.output[0] || this.canvas.height !== this.output[1]) {
            this.canvas.width = this.output[0];
            this.canvas.height = this.output[1];
          }
          queue.writeBuffer(this._blitParamsBuffer, 0, new Uint32Array([ this.output[0], this.output[1], 0, 0 ]));
          if (this._blitBoundOutputBuffer !== this.outputBuffer) {
            this._blitBindGroup = device.createBindGroup({
              layout: this._blitBindGroupLayout,
              entries: [ {
                binding: 0,
                resource: {
                  buffer: this._blitParamsBuffer
                }
              }, {
                binding: 1,
                resource: {
                  buffer: this.outputBuffer
                }
              } ]
            });
            this._blitBoundOutputBuffer = this.outputBuffer;
          }
          const renderPass = encoder.beginRenderPass({
            colorAttachments: [ {
              view: this._canvasContext.getCurrentTexture().createView(),
              loadOp: "clear",
              storeOp: "store",
              clearValue: {
                r: 0,
                g: 0,
                b: 0,
                a: 0
              }
            } ]
          });
          renderPass.setPipeline(this._blitPipeline);
          renderPass.setBindGroup(0, this._blitBindGroup);
          renderPass.draw(3);
          renderPass.end();
          queue.submit([ encoder.finish() ]);
          return Promise.resolve();
        }
        if (this.pipeline) {
          queue.submit([ encoder.finish() ]);
          return Promise.resolve(new WebGPUBufferResult({
            buffer: this.outputBuffer,
            output: Array.from(this.output),
            componentCount: this.componentCount,
            context: this.context,
            kernel: this
          }));
        }
        const staging = this._acquireStaging(byteLength);
        encoder.copyBufferToBuffer(this.outputBuffer, 0, staging.buffer, 0, byteLength);
        queue.submit([ encoder.finish() ]);
        const output = Array.from(this.output);
        return staging.buffer.mapAsync(MAP_MODE_READ, 0, byteLength).then(() => {
          const data = new Float32Array(staging.buffer.getMappedRange(0, byteLength).slice(0));
          staging.buffer.unmap();
          this._releaseStaging(staging);
          return this._shapeOutput(data, output, this.componentCount);
        }, error => {
          this._releaseStaging(staging);
          throw error;
        });
      }
      _acquireStaging(byteLength) {
        for (let i = 0; i < this.stagingPool.length; i++) {
          const entry = this.stagingPool[i];
          if (!entry.busy && entry.size >= byteLength) {
            entry.busy = true;
            return entry;
          }
        }
        const entry = {
          buffer: this._device.createBuffer({
            size: byteLength,
            usage: 9
          }),
          size: byteLength,
          busy: true,
          pooled: this.stagingPool.length < 3
        };
        if (entry.pooled) this.stagingPool.push(entry);
        return entry;
      }
      _releaseStaging(entry) {
        if (entry.pooled) entry.busy = false; else entry.buffer.destroy();
      }
      _shapeOutput(data, output, componentCount) {
        const [width, height, depth] = [ output[0], output[1] || 1, output[2] || 1 ];
        if (componentCount === 1) switch (output.length) {
         case 1:
          return utils.erectMemoryOptimizedFloat(data, width);

         case 2:
          return utils.erectMemoryOptimized2DFloat(data, width, height);

         default:
          return utils.erectMemoryOptimized3DFloat(data, width, height, depth);
        }
        const n = componentCount;
        const erectRow = offset => {
          const row = new Array(width);
          for (let x = 0; x < width; x++) row[x] = data.subarray(offset + x * n, offset + x * n + n);
          return row;
        };
        switch (output.length) {
         case 1:
          return erectRow(0);

         case 2:
          {
            const rows = new Array(height);
            for (let y = 0; y < height; y++) rows[y] = erectRow(y * width * n);
            return rows;
          }

         default:
          {
            const layers = new Array(depth);
            for (let z = 0; z < depth; z++) {
              const rows = new Array(height);
              for (let y = 0; y < height; y++) rows[y] = erectRow((z * height + y) * width * n);
              layers[z] = rows;
            }
            return layers;
          }
        }
      }
      readBufferResult(handle) {
        const device = this._device || handle.context && handle.context.device;
        if (!device) return Promise.reject(new Error("no WebGPU device available to read this buffer"));
        if (handle.context && handle.context.isLost) return Promise.reject(new Error("WebGPU device was lost; this buffer no longer holds data \u2014 rebuild the producing kernel and run again"));
        const output = Array.from(handle.output);
        const dims = Array.from(output);
        while (dims.length < 3) dims.push(1);
        const byteLength = dims[0] * dims[1] * dims[2] * 4 * handle.componentCount;
        const staging = this._acquireStaging(byteLength);
        const encoder = device.createCommandEncoder();
        encoder.copyBufferToBuffer(handle.buffer, 0, staging.buffer, 0, byteLength);
        device.queue.submit([ encoder.finish() ]);
        return staging.buffer.mapAsync(MAP_MODE_READ, 0, byteLength).then(() => {
          const data = new Float32Array(staging.buffer.getMappedRange(0, byteLength).slice(0));
          staging.buffer.unmap();
          this._releaseStaging(staging);
          return this._shapeOutput(data, output, handle.componentCount);
        }, error => {
          this._releaseStaging(staging);
          throw error;
        });
      }
      getPixels(flip) {
        if (!this.graphical) return Promise.reject(new Error("getPixels only works on a graphical kernel"));
        if (!this.outputBuffer) return Promise.reject(new Error("run the kernel before reading its pixels"));
        const [width, height] = this.output;
        const byteLength = width * height * 4 * 4;
        const staging = this._acquireStaging(byteLength);
        const encoder = this._device.createCommandEncoder();
        encoder.copyBufferToBuffer(this.outputBuffer, 0, staging.buffer, 0, byteLength);
        this._device.queue.submit([ encoder.finish() ]);
        return staging.buffer.mapAsync(MAP_MODE_READ, 0, byteLength).then(() => {
          const floats = new Float32Array(staging.buffer.getMappedRange(0, byteLength).slice(0));
          staging.buffer.unmap();
          this._releaseStaging(staging);
          const pixels = new Uint8ClampedArray(width * height * 4);
          for (let y = 0; y < height; y++) {
            const sourceRow = flip ? y : height - 1 - y;
            for (let x = 0; x < width; x++) {
              const from = (sourceRow * width + x) * 4;
              const to = (y * width + x) * 4;
              pixels[to] = floats[from] * 255;
              pixels[to + 1] = floats[from + 1] * 255;
              pixels[to + 2] = floats[from + 2] * 255;
              pixels[to + 3] = floats[from + 3] * 255;
            }
          }
          return pixels;
        }, error => {
          this._releaseStaging(staging);
          throw error;
        });
      }
      destroy(removeCanvasReferences) {
        if (this._blitParamsBuffer) {
          this._blitParamsBuffer.destroy();
          this._blitParamsBuffer = null;
        }
        if (this._canvasContext) {
          this._canvasContext.unconfigure();
          this._canvasContext = null;
        }
        this._blitPipeline = null;
        this._blitBindGroup = null;
        this._blitBoundOutputBuffer = null;
        if (this.paramsBuffer) {
          this.paramsBuffer.destroy();
          this.paramsBuffer = null;
        }
        if (this.paramsLayout) for (let i = 0; i < this.paramsLayout.arrayArgs.length; i++) {
          const record = this.paramsLayout.arrayArgs[i];
          if (record.buffer) {
            record.buffer.destroy();
            record.buffer = null;
          }
          record.boundBuffer = null;
        }
        if (this.constantBuffers) {
          for (let i = 0; i < this.constantBuffers.length; i++) this.constantBuffers[i].destroy();
          this.constantBuffers = null;
        }
        for (let i = 0; i < this.stagingPool.length; i++) this.stagingPool[i].buffer.destroy();
        this.stagingPool = [];
        if (this.outputBuffer) {
          if (--this.outputBuffer._refs === 0) this.outputBuffer.destroy();
          this.outputBuffer = null;
        }
        this.bindGroup = null;
        this.bindGroupLayout = null;
        this.computePipeline = null;
        this.built = false;
        this._buildPromise = null;
        if (this.gpu && this.gpu.kernels) {
          const index = this.gpu.kernels.indexOf(this);
          if (index !== -1) this.gpu.kernels.splice(index, 1);
        }
      }
    };
    module.exports = {
      WebGPUKernel: WebGPUKernel
    };
  });
  var require_wasm_builder = __commonJSMin((exports, module) => {
    const VAL_TYPES = {
      i32: 127,
      i64: 126,
      f32: 125,
      f64: 124,
      v128: 123
    };
    const SECTION_TYPE = 1;
    const SECTION_IMPORT = 2;
    const SECTION_FUNCTION = 3;
    const SECTION_GLOBAL = 6;
    const SECTION_EXPORT = 7;
    const SECTION_CODE = 10;
    const f32Scratch = new DataView(new ArrayBuffer(16));
    function uleb(value, out) {
      let v = value >>> 0;
      do {
        let byte = v & 127;
        v >>>= 7;
        if (v !== 0) byte |= 128;
        out.push(byte);
      } while (v !== 0);
    }
    function sleb(value, out) {
      let v = value | 0;
      for (;;) {
        const byte = v & 127;
        v >>= 7;
        if (v === 0 && (byte & 64) === 0 || v === -1 && (byte & 64) !== 0) {
          out.push(byte);
          return;
        }
        out.push(byte | 128);
      }
    }
    function uleb5At(value, bytes, at) {
      let v = value >>> 0;
      for (let i = 0; i < 4; i++) {
        bytes[at + i] = v & 127 | 128;
        v >>>= 7;
      }
      bytes[at + 4] = v & 127;
    }
    function utf8(str, out) {
      const bytes = [];
      for (let i = 0; i < str.length; i++) {
        let code = str.codePointAt(i);
        if (code > 65535) i++;
        if (code < 128) bytes.push(code); else if (code < 2048) bytes.push(192 | code >> 6, 128 | code & 63); else if (code < 65536) bytes.push(224 | code >> 12, 128 | code >> 6 & 63, 128 | code & 63); else bytes.push(240 | code >> 18, 128 | code >> 12 & 63, 128 | code >> 6 & 63, 128 | code & 63);
      }
      uleb(bytes.length, out);
      for (let i = 0; i < bytes.length; i++) out.push(bytes[i]);
    }
    function valType(type) {
      const byte = VAL_TYPES[type];
      if (byte === void 0) throw new Error(`WasmModuleBuilder: unknown value type "${type}"`);
      return byte;
    }
    function blockType(type) {
      if (type === void 0 || type === null || type === "void") return 64;
      return valType(type);
    }
    var WasmFunctionEmitter = class {
      constructor(builder, name, params, results, locals) {
        this.builder = builder;
        this.name = name;
        this.params = params;
        this.results = results;
        this.locals = locals.slice();
        this.bytes = [];
        this.callFixups = [];
      }
      addLocal(type) {
        valType(type);
        this.locals.push(type);
        return this.params.length + this.locals.length - 1;
      }
      block(type) {
        this.bytes.push(2, blockType(type));
        return this;
      }
      loop(type) {
        this.bytes.push(3, blockType(type));
        return this;
      }
      if_(type) {
        this.bytes.push(4, blockType(type));
        return this;
      }
      br(depth) {
        this.bytes.push(12);
        uleb(depth, this.bytes);
        return this;
      }
      brIf(depth) {
        this.bytes.push(13);
        uleb(depth, this.bytes);
        return this;
      }
      call(name) {
        this.bytes.push(16);
        this.callFixups.push({
          at: this.bytes.length,
          name: name
        });
        this.bytes.push(0, 0, 0, 0, 0);
        return this;
      }
      localGet(index) {
        this.bytes.push(32);
        uleb(index, this.bytes);
        return this;
      }
      localSet(index) {
        this.bytes.push(33);
        uleb(index, this.bytes);
        return this;
      }
      localTee(index) {
        this.bytes.push(34);
        uleb(index, this.bytes);
        return this;
      }
      globalGet(index) {
        this.bytes.push(35);
        uleb(index, this.bytes);
        return this;
      }
      globalSet(index) {
        this.bytes.push(36);
        uleb(index, this.bytes);
        return this;
      }
      i32Const(value) {
        this.bytes.push(65);
        sleb(value, this.bytes);
        return this;
      }
      f32Const(value) {
        this.bytes.push(67);
        f32Scratch.setFloat32(0, value, true);
        for (let i = 0; i < 4; i++) this.bytes.push(f32Scratch.getUint8(i));
        return this;
      }
      v128Const(lanes) {
        if (lanes.length !== 16) throw new Error("WasmModuleBuilder: v128.const requires exactly 16 bytes");
        this.bytes.push(253, 12);
        for (let i = 0; i < 16; i++) this.bytes.push(lanes[i] & 255);
        return this;
      }
      v128ConstI32x4(a, b, c, d) {
        f32Scratch.setInt32(0, a, true);
        f32Scratch.setInt32(4, b, true);
        f32Scratch.setInt32(8, c, true);
        f32Scratch.setInt32(12, d, true);
        this.bytes.push(253, 12);
        for (let i = 0; i < 16; i++) this.bytes.push(f32Scratch.getUint8(i));
        return this;
      }
      v128ConstF32x4(a, b, c, d) {
        f32Scratch.setFloat32(0, a, true);
        f32Scratch.setFloat32(4, b, true);
        f32Scratch.setFloat32(8, c, true);
        f32Scratch.setFloat32(12, d, true);
        this.bytes.push(253, 12);
        for (let i = 0; i < 16; i++) this.bytes.push(f32Scratch.getUint8(i));
        return this;
      }
      i32Load(offset = 0, align = 2) {
        this.bytes.push(40);
        uleb(align, this.bytes);
        uleb(offset, this.bytes);
        return this;
      }
      f32Load(offset = 0, align = 2) {
        this.bytes.push(42);
        uleb(align, this.bytes);
        uleb(offset, this.bytes);
        return this;
      }
      i32Store(offset = 0, align = 2) {
        this.bytes.push(54);
        uleb(align, this.bytes);
        uleb(offset, this.bytes);
        return this;
      }
      f32Store(offset = 0, align = 2) {
        this.bytes.push(56);
        uleb(align, this.bytes);
        uleb(offset, this.bytes);
        return this;
      }
      v128Load(offset = 0, align = 4) {
        this.bytes.push(253, 0);
        uleb(align, this.bytes);
        uleb(offset, this.bytes);
        return this;
      }
      v128Store(offset = 0, align = 4) {
        this.bytes.push(253, 11);
        uleb(align, this.bytes);
        uleb(offset, this.bytes);
        return this;
      }
      i32x4ExtractLane(lane) {
        return this._lane(27, lane);
      }
      i32x4ReplaceLane(lane) {
        return this._lane(28, lane);
      }
      f32x4ExtractLane(lane) {
        return this._lane(31, lane);
      }
      f32x4ReplaceLane(lane) {
        return this._lane(32, lane);
      }
      _lane(op, lane) {
        if (!Number.isInteger(lane) || lane < 0 || lane > 3) throw new Error(`WasmModuleBuilder: lane index ${lane} out of range for 4-lane shape`);
        this.bytes.push(253, op, lane);
        return this;
      }
      _push(bytes) {
        for (let i = 0; i < bytes.length; i++) this.bytes.push(bytes[i]);
        return this;
      }
    };
    const PLAIN_OPS = {
      unreachable: [ 0 ],
      nop: [ 1 ],
      else_: [ 5 ],
      end: [ 11 ],
      return_: [ 15 ],
      drop: [ 26 ],
      select: [ 27 ],
      i32Eqz: [ 69 ],
      i32Eq: [ 70 ],
      i32Ne: [ 71 ],
      i32LtS: [ 72 ],
      i32LtU: [ 73 ],
      i32GtS: [ 74 ],
      i32GtU: [ 75 ],
      i32LeS: [ 76 ],
      i32LeU: [ 77 ],
      i32GeS: [ 78 ],
      i32GeU: [ 79 ],
      f32Eq: [ 91 ],
      f32Ne: [ 92 ],
      f32Lt: [ 93 ],
      f32Gt: [ 94 ],
      f32Le: [ 95 ],
      f32Ge: [ 96 ],
      i32Clz: [ 103 ],
      i32Ctz: [ 104 ],
      i32Popcnt: [ 105 ],
      i32Add: [ 106 ],
      i32Sub: [ 107 ],
      i32Mul: [ 108 ],
      i32DivS: [ 109 ],
      i32DivU: [ 110 ],
      i32RemS: [ 111 ],
      i32RemU: [ 112 ],
      i32And: [ 113 ],
      i32Or: [ 114 ],
      i32Xor: [ 115 ],
      i32Shl: [ 116 ],
      i32ShrS: [ 117 ],
      i32ShrU: [ 118 ],
      i32Rotl: [ 119 ],
      i32Rotr: [ 120 ],
      f32Abs: [ 139 ],
      f32Neg: [ 140 ],
      f32Ceil: [ 141 ],
      f32Floor: [ 142 ],
      f32Trunc: [ 143 ],
      f32Nearest: [ 144 ],
      f32Sqrt: [ 145 ],
      f32Add: [ 146 ],
      f32Sub: [ 147 ],
      f32Mul: [ 148 ],
      f32Div: [ 149 ],
      f32Min: [ 150 ],
      f32Max: [ 151 ],
      f32Copysign: [ 152 ],
      i32TruncF32S: [ 168 ],
      i32TruncF32U: [ 169 ],
      f32ConvertI32S: [ 178 ],
      f32ConvertI32U: [ 179 ],
      i32ReinterpretF32: [ 188 ],
      f32ReinterpretI32: [ 190 ],
      i32TruncSatF32S: [ 252, 0 ],
      i32TruncSatF32U: [ 252, 1 ]
    };
    const SIMD_OPS = {
      i32x4Splat: 17,
      f32x4Splat: 19,
      i32x4Eq: 55,
      i32x4Ne: 56,
      i32x4LtS: 57,
      i32x4GtS: 59,
      i32x4LeS: 61,
      i32x4GeS: 63,
      f32x4Eq: 65,
      f32x4Ne: 66,
      f32x4Lt: 67,
      f32x4Gt: 68,
      f32x4Le: 69,
      f32x4Ge: 70,
      v128Not: 77,
      v128And: 78,
      v128Andnot: 79,
      v128Or: 80,
      v128Xor: 81,
      v128Bitselect: 82,
      v128AnyTrue: 83,
      f32x4Ceil: 103,
      f32x4Floor: 104,
      f32x4Trunc: 105,
      f32x4Nearest: 106,
      i32x4Abs: 160,
      i32x4Neg: 161,
      i32x4AllTrue: 163,
      i32x4Bitmask: 164,
      i32x4Shl: 171,
      i32x4ShrS: 172,
      i32x4ShrU: 173,
      i32x4Add: 174,
      i32x4Sub: 177,
      i32x4Mul: 181,
      i32x4MinS: 182,
      i32x4MinU: 183,
      i32x4MaxS: 184,
      i32x4MaxU: 185,
      f32x4Abs: 224,
      f32x4Neg: 225,
      f32x4Sqrt: 227,
      f32x4Add: 228,
      f32x4Sub: 229,
      f32x4Mul: 230,
      f32x4Div: 231,
      f32x4Min: 232,
      f32x4Max: 233,
      f32x4Pmin: 234,
      f32x4Pmax: 235,
      i32x4TruncSatF32x4S: 248,
      i32x4TruncSatF32x4U: 249,
      f32x4ConvertI32x4S: 250,
      f32x4ConvertI32x4U: 251
    };
    for (const name of Object.keys(PLAIN_OPS)) {
      const bytes = PLAIN_OPS[name];
      WasmFunctionEmitter.prototype[name] = function() {
        return this._push(bytes);
      };
    }
    for (const name of Object.keys(SIMD_OPS)) {
      const bytes = [ 253 ];
      uleb(SIMD_OPS[name], bytes);
      WasmFunctionEmitter.prototype[name] = function() {
        return this._push(bytes);
      };
    }
    var WasmModuleBuilder = class {
      constructor() {
        this.types = [];
        this.typeIndexByKey = {};
        this.memoryImport = null;
        this.funcImports = [];
        this.funcImportIndexByName = {};
        this.functions = [];
        this.functionIndexByName = {};
        this.globals = [];
        this.exports = [];
      }
      _typeIndex(params, results) {
        const key = `${params.join(",")}=>${results.join(",")}`;
        if (key in this.typeIndexByKey) return this.typeIndexByKey[key];
        const index = this.types.length;
        this.types.push({
          params: params,
          results: results
        });
        this.typeIndexByKey[key] = index;
        return index;
      }
      addMemoryImport(initial, maximum, shared = false) {
        if (shared && (maximum === void 0 || maximum === null)) throw new Error("WasmModuleBuilder: shared memory import requires a maximum");
        this.memoryImport = {
          initial: initial,
          maximum: maximum,
          shared: shared
        };
        return this;
      }
      addFuncImport(name, params, results, module$4 = "env") {
        if (name in this.funcImportIndexByName || name in this.functionIndexByName) throw new Error(`WasmModuleBuilder: duplicate function name "${name}"`);
        const index = this.funcImports.length;
        this.funcImports.push({
          name: name,
          module: module$4,
          typeIndex: this._typeIndex(params, results)
        });
        this.funcImportIndexByName[name] = index;
        return index;
      }
      addGlobal(type, mutable, initialValue) {
        valType(type);
        this.globals.push({
          type: type,
          mutable: mutable,
          initialValue: initialValue
        });
        return this.globals.length - 1;
      }
      addFunction(name, {params: params = [], results: results = [], locals: locals = []} = {}) {
        if (name in this.funcImportIndexByName || name in this.functionIndexByName) throw new Error(`WasmModuleBuilder: duplicate function name "${name}"`);
        params.forEach(valType);
        results.forEach(valType);
        locals.forEach(valType);
        const emitter = new WasmFunctionEmitter(this, name, params, results, locals);
        this.functionIndexByName[name] = this.functions.length;
        this.functions.push({
          name: name,
          emitter: emitter,
          typeIndex: this._typeIndex(params, results)
        });
        return emitter;
      }
      exportFunction(name, exportName = name) {
        this.exports.push({
          name: name,
          exportName: exportName
        });
        return this;
      }
      _resolveFuncIndex(name) {
        if (name in this.funcImportIndexByName) return this.funcImportIndexByName[name];
        if (name in this.functionIndexByName) return this.funcImports.length + this.functionIndexByName[name];
        throw new Error(`WasmModuleBuilder: call target "${name}" is not an import or a defined function`);
      }
      _section(id, payload, out) {
        out.push(id);
        uleb(payload.length, out);
        for (let i = 0; i < payload.length; i++) out.push(payload[i]);
      }
      toBytes() {
        const out = [ 0, 97, 115, 109, 1, 0, 0, 0 ];
        if (this.types.length > 0) {
          const payload = [];
          uleb(this.types.length, payload);
          for (const {params: params, results: results} of this.types) {
            payload.push(96);
            uleb(params.length, payload);
            for (const p of params) payload.push(valType(p));
            uleb(results.length, payload);
            for (const r of results) payload.push(valType(r));
          }
          this._section(SECTION_TYPE, payload, out);
        }
        if (this.memoryImport !== null || this.funcImports.length > 0) {
          const payload = [];
          uleb((this.memoryImport !== null ? 1 : 0) + this.funcImports.length, payload);
          if (this.memoryImport !== null) {
            const {initial: initial, maximum: maximum, shared: shared} = this.memoryImport;
            utf8("env", payload);
            utf8("memory", payload);
            payload.push(2);
            const hasMax = maximum !== void 0 && maximum !== null;
            payload.push(shared ? 3 : hasMax ? 1 : 0);
            uleb(initial, payload);
            if (hasMax) uleb(maximum, payload);
          }
          for (const {name: name, module: module$5, typeIndex: typeIndex} of this.funcImports) {
            utf8(module$5, payload);
            utf8(name, payload);
            payload.push(0);
            uleb(typeIndex, payload);
          }
          this._section(SECTION_IMPORT, payload, out);
        }
        if (this.functions.length > 0) {
          const payload = [];
          uleb(this.functions.length, payload);
          for (const {typeIndex: typeIndex} of this.functions) uleb(typeIndex, payload);
          this._section(SECTION_FUNCTION, payload, out);
        }
        if (this.globals.length > 0) {
          const payload = [];
          uleb(this.globals.length, payload);
          for (const {type: type, mutable: mutable, initialValue: initialValue} of this.globals) {
            payload.push(valType(type), mutable ? 1 : 0);
            if (type === "i32") {
              payload.push(65);
              sleb(initialValue, payload);
            } else if (type === "f32") {
              payload.push(67);
              f32Scratch.setFloat32(0, initialValue, true);
              for (let i = 0; i < 4; i++) payload.push(f32Scratch.getUint8(i));
            } else if (type === "v128") {
              payload.push(253, 12);
              for (let i = 0; i < 16; i++) payload.push(0);
            } else throw new Error(`WasmModuleBuilder: no initializer encoding for global type "${type}"`);
            payload.push(11);
          }
          this._section(SECTION_GLOBAL, payload, out);
        }
        if (this.exports.length > 0) {
          const payload = [];
          uleb(this.exports.length, payload);
          for (const {name: name, exportName: exportName} of this.exports) {
            utf8(exportName, payload);
            payload.push(0);
            uleb(this._resolveFuncIndex(name), payload);
          }
          this._section(SECTION_EXPORT, payload, out);
        }
        if (this.functions.length > 0) {
          const payload = [];
          uleb(this.functions.length, payload);
          for (const {emitter: emitter} of this.functions) {
            const body = emitter.bytes.slice();
            for (const {at: at, name: name} of emitter.callFixups) uleb5At(this._resolveFuncIndex(name), body, at);
            const entry = [];
            const runs = [];
            for (const local of emitter.locals) {
              const type = valType(local);
              if (runs.length > 0 && runs[runs.length - 1].type === type) runs[runs.length - 1].count++; else runs.push({
                type: type,
                count: 1
              });
            }
            uleb(runs.length, entry);
            for (const {type: type, count: count} of runs) {
              uleb(count, entry);
              entry.push(type);
            }
            for (let i = 0; i < body.length; i++) entry.push(body[i]);
            entry.push(11);
            uleb(entry.length, payload);
            for (let i = 0; i < entry.length; i++) payload.push(entry[i]);
          }
          this._section(SECTION_CODE, payload, out);
        }
        return Uint8Array.from(out);
      }
    };
    module.exports = {
      WasmModuleBuilder: WasmModuleBuilder,
      WasmFunctionEmitter: WasmFunctionEmitter
    };
  });
  var require_function_node = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {FunctionNode: FunctionNode} = require_function_node$5();
    const {WasmFunctionEmitter: WasmFunctionEmitter} = require_wasm_builder();
    var NoopEmitter = class {
      constructor() {
        this.localCount = 0;
      }
      addLocal() {
        return this.localCount++;
      }
    };
    for (const name of Object.getOwnPropertyNames(WasmFunctionEmitter.prototype)) {
      if (name === "constructor" || name === "addLocal") continue;
      if (typeof WasmFunctionEmitter.prototype[name] !== "function") continue;
      NoopEmitter.prototype[name] = function() {
        return this;
      };
    }
    const MATH_IMPORT_ARITY = {
      sin: 1,
      cos: 1,
      tan: 1,
      asin: 1,
      acos: 1,
      atan: 1,
      atan2: 2,
      sinh: 1,
      cosh: 1,
      tanh: 1,
      asinh: 1,
      acosh: 1,
      atanh: 1,
      exp: 1,
      expm1: 1,
      log: 1,
      log2: 1,
      log10: 1,
      log1p: 1,
      cbrt: 1,
      pow: 2,
      sign: 1
    };
    const MATH_NATIVE_OPS = {
      abs: "f32Abs",
      floor: "f32Floor",
      ceil: "f32Ceil",
      sqrt: "f32Sqrt",
      trunc: "f32Trunc"
    };
    const F32_ARITH = {
      "+": "f32Add",
      "-": "f32Sub",
      "*": "f32Mul"
    };
    const I32_ARITH = {
      "+": "i32Add",
      "-": "i32Sub",
      "*": "i32Mul"
    };
    const F32_COMPARE = {
      "==": "f32Eq",
      "===": "f32Eq",
      "!=": "f32Ne",
      "!==": "f32Ne",
      "<": "f32Lt",
      ">": "f32Gt",
      "<=": "f32Le",
      ">=": "f32Ge"
    };
    const I32_COMPARE = {
      "==": "i32Eq",
      "===": "i32Eq",
      "!=": "i32Ne",
      "!==": "i32Ne",
      "<": "i32LtS",
      ">": "i32GtS",
      "<=": "i32LeS",
      ">=": "i32GeS"
    };
    const BITWISE_OPS = {
      "&": "i32And",
      "|": "i32Or",
      "^": "i32Xor",
      "<<": "i32Shl",
      ">>": "i32ShrS",
      ">>>": "i32ShrU"
    };
    const VF32_ARITH = {
      "+": "f32x4Add",
      "-": "f32x4Sub",
      "*": "f32x4Mul"
    };
    const VI32_ARITH = {
      "+": "i32x4Add",
      "-": "i32x4Sub",
      "*": "i32x4Mul"
    };
    const VF32_COMPARE = {
      "==": "f32x4Eq",
      "===": "f32x4Eq",
      "!=": "f32x4Ne",
      "!==": "f32x4Ne",
      "<": "f32x4Lt",
      ">": "f32x4Gt",
      "<=": "f32x4Le",
      ">=": "f32x4Ge"
    };
    const VI32_COMPARE = {
      "==": "i32x4Eq",
      "===": "i32x4Eq",
      "!=": "i32x4Ne",
      "!==": "i32x4Ne",
      "<": "i32x4LtS",
      ">": "i32x4GtS",
      "<=": "i32x4LeS",
      ">=": "i32x4GeS"
    };
    const VECTOR_SHIFT_OPS = {
      "<<": "i32x4Shl",
      ">>": "i32x4ShrS",
      ">>>": "i32x4ShrU"
    };
    const VECTOR_MATH_NATIVE_OPS = {
      abs: "f32x4Abs",
      floor: "f32x4Floor",
      ceil: "f32x4Ceil",
      sqrt: "f32x4Sqrt",
      trunc: "f32x4Trunc"
    };
    function scalarWasmType(type) {
      switch (type) {
       case "Number":
       case "Float":
       case "LiteralInteger":
        return "f32";

       case "Integer":
       case "Boolean":
        return "i32";

       default:
        throw new Error(`WebAssembly backend does not yet support ${type} arguments to helper functions`);
      }
    }
    var WebAssemblyFunctionNode = class extends FunctionNode {
      constructor(source, settings) {
        super(source, settings);
        this.assembler = null;
        this.em = null;
        this.locals = null;
        this.depth = 0;
        this.loopStack = null;
        this.usedMathImports = new Set;
        this.usesRandom = false;
        this.readsThread = false;
        this.taintedLocals = null;
        this.uniformity = [];
        this._analysisDone = false;
        this._analysisPass = false;
        this.vec = false;
        this.vMaskDepth = 0;
        this.vCur = -1;
        this.vRetMask = -1;
        this.vTerminated = false;
        this.vInfo = null;
        this._vBaseX = -1;
      }
      mangleFunctionName(name) {
        return `fn_${utils.sanitizeName(name)}`;
      }
      getType(ast) {
        if (ast && ast.type === "ConditionalExpression") {
          const consequentType = this.getType(ast.consequent);
          if (consequentType === "Integer" || consequentType === "LiteralInteger") {
            const alternateType = this.getType(ast.alternate);
            if (alternateType === "Number" || alternateType === "Float") return "Number";
          }
        }
        return super.getType(ast);
      }
      toString() {
        if (!this._analysisDone) {
          this._analysisDone = true;
          this._analysisPass = true;
          this.walkFunction(new NoopEmitter);
          this._analysisPass = false;
        }
        return "";
      }
      emitFunction(assembler) {
        this.assembler = assembler;
        const {module: module$3} = assembler;
        let em;
        if (this.isRootKernel) em = module$3.addFunction("kernel", {
          params: [],
          results: []
        }); else {
          const params = this.argumentTypes.map(type => scalarWasmType(type === "LiteralInteger" ? "Number" : type));
          const results = [];
          if (this.returnType) switch (this.returnType) {
           case "Integer":
           case "Boolean":
            results.push("i32");
            break;

           case "Number":
           case "Float":
           case "LiteralInteger":
            results.push("f32");
            break;

           default:
            throw new Error(`WebAssembly backend does not yet support helper functions returning ${this.returnType}`);
          }
          em = module$3.addFunction(this.mangleFunctionName(this.name), {
            params: params,
            results: results
          });
        }
        this.walkFunction(em);
        if (!this.isRootKernel && this.returnType) em.unreachable();
        return em;
      }
      walkFunction(em) {
        this.em = em;
        this.locals = new Map;
        this.depth = 0;
        this.loopStack = [];
        this.taintedLocals = new Set;
        const ast = this.getJsAST();
        if (this.isRootKernel) for (const name of this.collectAssignedArgumentNames(ast)) {
          const argumentIndex = this.argumentNames.indexOf(name);
          const gtype = this.argumentTypes[argumentIndex];
          if (gtype !== "Number" && gtype !== "Float" && gtype !== "Integer" && gtype !== "Boolean") continue;
          const slot = this.assembler ? this.assembler.layout.scalars[name] : null;
          const offset = slot ? slot.offset : 0;
          const wtype = gtype === "Integer" || gtype === "Boolean" ? "i32" : "f32";
          const index = em.addLocal(wtype);
          em.i32Const(0);
          if (wtype === "i32") em.i32Load(offset); else em.f32Load(offset);
          em.localSet(index);
          this.locals.set(name, {
            kind: "scalar",
            index: index,
            wtype: wtype,
            gtype: gtype
          });
        }
        if (!this.isRootKernel) {
          for (let i = 0; i < this.argumentNames.length; i++) {
            const name = this.argumentNames[i];
            let argumentType = this.argumentTypes[i];
            if (!argumentType) throw this.astErrorOutput(`Unknown argument ${name} type`, ast);
            if (argumentType === "LiteralInteger") this.argumentTypes[i] = argumentType = "Number";
            this.locals.set(name, {
              kind: "scalar",
              index: i,
              wtype: scalarWasmType(argumentType),
              gtype: argumentType
            });
          }
          if (!this.returnType) {
            if (this.findLastReturn()) {
              this.returnType = this.getType(ast.body);
              if (this.returnType === "LiteralInteger") this.returnType = "Number";
            }
          }
        }
        const body = ast.body.body;
        for (let i = 0; i < body.length; i++) this.statement(body[i]);
      }
      collectAssignedArgumentNames(ast) {
        const names = new Set;
        const walk = node => {
          if (!node || typeof node !== "object") return;
          if (Array.isArray(node)) return node.forEach(walk);
          if (node.type === "FunctionDeclaration" && node !== ast) return;
          if (node.type === "AssignmentExpression" && node.left.type === "Identifier" && this.argumentNames.indexOf(node.left.name) !== -1) names.add(node.left.name);
          if (node.type === "UpdateExpression" && node.argument.type === "Identifier" && this.argumentNames.indexOf(node.argument.name) !== -1) names.add(node.argument.name);
          for (const key in node) {
            if (key === "loc" || key === "start" || key === "end" || key === "parent") continue;
            const child = node[key];
            if (child && typeof child === "object") walk(child);
          }
        };
        walk(ast.body);
        return names;
      }
      enterBlock(type) {
        this.em.block(type);
        this.depth++;
      }
      enterLoop(type) {
        this.em.loop(type);
        this.depth++;
      }
      enterIf(type) {
        this.em.if_(type);
        this.depth++;
      }
      exit() {
        this.em.end();
        this.depth--;
      }
      brTo(level) {
        this.em.br(this.depth - level);
      }
      brIfTo(level) {
        this.em.brIf(this.depth - level);
      }
      get loopMax() {
        return parseInt(this.loopMaxIterations, 10) || 1e3;
      }
      coerce(from, to) {
        if (from === to) return to;
        if (from === "void") throw new Error("cannot use a void expression as a value");
        switch (to) {
         case "f32":
          this.em.f32ConvertI32S();
          return "f32";

         case "i32":
          if (from === "f32") this.em.i32TruncSatF32S();
          return "i32";

         case "bool":
          if (from === "f32") this.em.f32Const(0).f32Ne(); else this.em.i32Eqz().i32Eqz();
          return "bool";

         default:
          throw new Error(`unknown wasm value category ${to}`);
        }
      }
      castLiteralToInteger(ast) {
        this.pushState("casting-to-integer");
        const type = this.expression(ast);
        this.popState("casting-to-integer");
        this.coerce(type, "i32");
        return "i32";
      }
      castLiteralToFloat(ast) {
        this.pushState("casting-to-float");
        const type = this.expression(ast);
        this.popState("casting-to-float");
        this.coerce(type, "f32");
        return "f32";
      }
      castValueToInteger(ast) {
        this.pushState("casting-to-integer");
        const type = this.expression(ast);
        this.popState("casting-to-integer");
        this.coerce(type, "i32");
        return "i32";
      }
      castValueToFloat(ast) {
        this.pushState("casting-to-float");
        const type = this.expression(ast);
        this.popState("casting-to-float");
        this.coerce(type, "f32");
        return "f32";
      }
      emitByType(ast, want) {
        const type = this.getType(ast);
        if (want === "f32") {
          if (type === "Integer") return this.castValueToFloat(ast);
          if (type === "LiteralInteger") return this.castLiteralToFloat(ast);
          this.coerce(this.expression(ast), "f32");
          return "f32";
        }
        if (type === "Number" || type === "Float") return this.castValueToInteger(ast);
        if (type === "LiteralInteger") return this.castLiteralToInteger(ast);
        this.coerce(this.expression(ast), "i32");
        return "i32";
      }
      emitCondition(ast) {
        const type = this.expression(ast);
        if (type === "bool") return;
        if (type === "i32") {
          this.em.i32Eqz().i32Eqz();
          return;
        }
        if (type === "f32") {
          this.em.f32Const(0).f32Ne();
          return;
        }
        throw this.astErrorOutput("cannot use a void expression as a condition", ast);
      }
      statement(ast) {
        switch (ast.type) {
         case "VariableDeclaration":
          return this.stmtVariableDeclaration(ast);

         case "ExpressionStatement":
          return this.statementExpression(ast.expression);

         case "ReturnStatement":
          return this.stmtReturn(ast);

         case "IfStatement":
          return this.stmtIf(ast);

         case "ForStatement":
          return this.stmtFor(ast);

         case "WhileStatement":
          return this.stmtWhile(ast);

         case "DoWhileStatement":
          return this.stmtDoWhile(ast);

         case "BlockStatement":
          for (let i = 0; i < ast.body.length; i++) this.statement(ast.body[i]);
          return;

         case "BreakStatement":
          return this.stmtBreak(ast);

         case "ContinueStatement":
          return this.stmtContinue(ast);

         case "SwitchStatement":
          return this.stmtSwitch(ast);

         case "FunctionDeclaration":
          if (this.isChildFunction(ast)) return;
          throw this.astErrorOutput("unexpected function declaration", ast);

         case "EmptyStatement":
         case "DebuggerStatement":
          return;

         default:
          throw this.astErrorOutput(`Unknown statement type ${ast.type}`, ast);
        }
      }
      statementExpression(expression) {
        switch (expression.type) {
         case "AssignmentExpression":
          return this.emitAssignment(expression);

         case "UpdateExpression":
          this.emitUpdate(expression, true);
          return;

         case "SequenceExpression":
          for (let i = 0; i < expression.expressions.length; i++) this.statementExpression(expression.expressions[i]);
          return;

         case "Identifier":
         case "Literal":
          return;

         default:
          if (this.expression(expression) !== "void") this.em.drop();
        }
      }
      stmtVariableDeclaration(varDecNode) {
        const declarations = varDecNode.declarations;
        if (!declarations || !declarations[0] || !declarations[0].init) throw this.astErrorOutput("Unexpected expression", varDecNode);
        for (let i = 0; i < declarations.length; i++) {
          const declaration = declarations[i];
          const init = declaration.init;
          const info = this.getDeclaration(declaration.id);
          const actualType = this.getType(init);
          const name = declaration.id.name;
          if (actualType === "Array(2)" || actualType === "Array(3)" || actualType === "Array(4)") {
            this.declareVecLocal(name, actualType, init, info, varDecNode);
            if (this.isThreadDependent(init)) this.taintedLocals.add(name);
            continue;
          }
          let type = actualType;
          if (type === "LiteralInteger") type = info.suggestedType === "Integer" ? "Integer" : "Number";
          if (actualType === "Integer" && type === "Integer") {
            info.valueType = "Number";
            this.setScalarLocal(name, "f32", "Number", () => this.castValueToFloat(init));
          } else {
            info.valueType = type;
            switch (type) {
             case "Number":
             case "Float":
              this.setScalarLocal(name, "f32", type, () => {
                if (actualType === "LiteralInteger") this.castLiteralToFloat(init); else if (actualType === "Integer") this.castValueToFloat(init); else this.coerce(this.expression(init), "f32");
              });
              break;

             case "Integer":
              this.setScalarLocal(name, "i32", "Integer", () => {
                if (actualType === "LiteralInteger") this.castLiteralToInteger(init); else if (actualType === "Number" || actualType === "Float") this.castValueToInteger(init); else this.coerce(this.expression(init), "i32");
              });
              break;

             case "Boolean":
              this.setScalarLocal(name, "i32", "Boolean", () => this.emitCondition(init));
              break;

             default:
              throw this.astErrorOutput(`WebAssembly backend does not yet support declaring type ${type}`, varDecNode);
            }
          }
          if (this.isThreadDependent(init)) this.taintedLocals.add(name);
        }
      }
      setScalarLocal(name, wtype, gtype, emitInit) {
        let local = this.locals.get(name);
        if (!local || local.kind !== "scalar" || local.wtype !== wtype) {
          local = {
            kind: "scalar",
            index: this.em.addLocal(wtype),
            wtype: wtype,
            gtype: gtype
          };
          this.locals.set(name, local);
        } else local.gtype = gtype;
        emitInit();
        this.em.localSet(local.index);
      }
      declareVecLocal(name, type, init, info, varDecNode) {
        const n = parseInt(type.substring(6), 10);
        info.valueType = type;
        let local = this.locals.get(name);
        if (!local || local.kind !== "vec" || local.n !== n) {
          const indices = [];
          for (let c = 0; c < n; c++) indices.push(this.em.addLocal("f32"));
          local = {
            kind: "vec",
            indices: indices,
            n: n,
            gtype: type
          };
          this.locals.set(name, local);
        }
        if (init.type === "ArrayExpression") {
          for (let c = 0; c < n; c++) {
            this.emitArrayElement(init.elements[c]);
            this.em.localSet(local.indices[c]);
          }
          return;
        }
        if (init.type === "Identifier") {
          const source = this.locals.get(init.name);
          if (source && source.kind === "vec" && source.n === n) {
            for (let c = 0; c < n; c++) this.em.localGet(source.indices[c]).localSet(local.indices[c]);
            return;
          }
        }
        throw this.astErrorOutput(`WebAssembly backend does not yet support ${type} initializer of type ${init.type}`, varDecNode);
      }
      emitArrayElement(element) {
        switch (this.getType(element)) {
         case "Integer":
          this.castValueToFloat(element);
          break;

         case "LiteralInteger":
          this.castLiteralToFloat(element);
          break;

         default:
          this.coerce(this.expression(element), "f32");
        }
      }
      emitAssignment(assNode) {
        if (assNode.left.type !== "Identifier") throw this.astErrorOutput(`WebAssembly backend does not yet support assignment to ${assNode.left.type}`, assNode);
        const name = assNode.left.name;
        const local = this.locals.get(name);
        let wtype = null;
        let store = null;
        if (local && local.kind === "scalar") {
          wtype = local.wtype;
          store = () => this.em.localSet(local.index);
        } else if (!local && this.isRootKernel && this.argumentNames.indexOf(name) !== -1) {
          const gtype = this.argumentTypes[this.argumentNames.indexOf(name)];
          const slot = this.assembler ? this.assembler.layout.scalars[name] : null;
          if (this.assembler && !slot) throw this.astErrorOutput(`WebAssembly backend does not yet support assigning to the array argument "${name}"`, assNode);
          const offset = slot ? slot.offset : 0;
          wtype = gtype === "Integer" || gtype === "Boolean" ? "i32" : "f32";
          this.em.i32Const(0);
          store = () => wtype === "i32" ? this.em.i32Store(offset) : this.em.f32Store(offset);
        } else throw this.astErrorOutput(`cannot assign to "${name}"`, assNode);
        if (assNode.operator === "=") {
          const leftType = this.getType(assNode.left);
          const rightType = this.getType(assNode.right);
          if (leftType !== "Integer" && rightType === "Integer") {
            this.castValueToFloat(assNode.right);
            this.coerce("f32", wtype);
          } else if (leftType !== "Integer" && rightType === "LiteralInteger") {
            this.castLiteralToFloat(assNode.right);
            this.coerce("f32", wtype);
          } else if (leftType === "Integer" && rightType === "LiteralInteger") {
            this.castLiteralToInteger(assNode.right);
            this.coerce("i32", wtype);
          } else if (leftType === "Integer" && (rightType === "Number" || rightType === "Float")) {
            this.castValueToInteger(assNode.right);
            this.coerce("i32", wtype);
          } else this.coerce(this.expression(assNode.right), wtype);
        } else {
          const synthetic = {
            type: "BinaryExpression",
            operator: assNode.operator.slice(0, -1),
            left: assNode.left,
            right: assNode.right
          };
          this.coerce(this.exprBinary(synthetic), wtype);
        }
        store();
        if (this.isThreadDependent(assNode.right) || assNode.operator !== "=" && this.taintedLocals.has(name)) this.taintedLocals.add(name);
      }
      emitUpdate(uNode, isStatement) {
        if (uNode.argument.type !== "Identifier") throw this.astErrorOutput("update expression needs a variable", uNode);
        const local = this.locals.get(uNode.argument.name);
        if (!local || local.kind !== "scalar") throw this.astErrorOutput(`cannot update "${uNode.argument.name}"`, uNode);
        const isInt = local.wtype === "i32";
        const one = () => isInt ? this.em.i32Const(1) : this.em.f32Const(1);
        const op = uNode.operator === "++" ? isInt ? "i32Add" : "f32Add" : isInt ? "i32Sub" : "f32Sub";
        if (isStatement) {
          this.em.localGet(local.index);
          one();
          this.em[op]().localSet(local.index);
          return "void";
        }
        if (uNode.prefix) {
          this.em.localGet(local.index);
          one();
          this.em[op]().localTee(local.index);
        } else {
          this.em.localGet(local.index).localGet(local.index);
          one();
          this.em[op]().localSet(local.index);
        }
        return local.wtype;
      }
      stmtReturn(ast) {
        if (!ast.argument) {
          if (this.isRootKernel) {
            this.em.return_();
            return;
          }
          throw this.astErrorOutput("Unexpected return statement", ast);
        }
        this.pushState("skip-literal-correction");
        const type = this.getType(ast.argument);
        this.popState("skip-literal-correction");
        if (!this.returnType) this.returnType = type === "LiteralInteger" || type === "Integer" ? "Number" : type;
        if (this.isRootKernel) return this.stmtRootReturn(ast, type);
        if (this.isSubKernel) throw this.astErrorOutput("WebAssembly backend does not yet support createKernelMap", ast);
        switch (this.returnType) {
         case "LiteralInteger":
         case "Number":
         case "Float":
          if (type === "Integer") this.castValueToFloat(ast.argument); else if (type === "LiteralInteger") this.castLiteralToFloat(ast.argument); else this.coerce(this.expression(ast.argument), "f32");
          break;

         case "Integer":
          if (type === "Float" || type === "Number") this.castValueToInteger(ast.argument); else if (type === "LiteralInteger") this.castLiteralToInteger(ast.argument); else this.coerce(this.expression(ast.argument), "i32");
          break;

         case "Boolean":
          this.emitCondition(ast.argument);
          break;

         default:
          throw this.astErrorOutput(`unhandled return type ${this.returnType}`, ast);
        }
        this.em.return_();
      }
      stmtRootReturn(ast, type) {
        const globals = this.assembler ? this.assembler.globals : {
          dataIndex: 0
        };
        const outputOffset = this.assembler ? this.assembler.layout.outputOffset : 0;
        switch (this.returnType) {
         case "Array(2)":
         case "Array(3)":
         case "Array(4)":
          {
            const n = parseInt(this.returnType.substring(6), 10);
            const argument = ast.argument;
            if (argument.type === "ArrayExpression") {
              if (argument.elements.length !== n) throw this.astErrorOutput(`expected ${n} array elements to match return type ${this.returnType}`, ast);
              for (let c = 0; c < n; c++) {
                this.emitComponentAddress(globals.dataIndex, n, c);
                this.emitArrayElement(argument.elements[c]);
                this.em.f32Store(outputOffset);
              }
            } else if (argument.type === "Identifier") {
              const local = this.locals.get(argument.name);
              if (!local || local.kind !== "vec" || local.n !== n) throw this.astErrorOutput(`"${argument.name}" is not an Array(${n}) variable`, ast);
              for (let c = 0; c < n; c++) {
                this.emitComponentAddress(globals.dataIndex, n, c);
                this.em.localGet(local.indices[c]);
                this.em.f32Store(outputOffset);
              }
            } else throw this.astErrorOutput(`WebAssembly backend does not yet support returning ${this.returnType} from a ${argument.type}`, ast);
            this.em.return_();
            return;
          }

         default:
          this.emitComponentAddress(globals.dataIndex, 1, 0);
          switch (this.returnType) {
           case "Integer":
            if (type === "Float" || type === "Number") this.castValueToInteger(ast.argument); else if (type === "LiteralInteger") this.castLiteralToInteger(ast.argument); else this.coerce(this.expression(ast.argument), "i32");
            this.em.f32ConvertI32S();
            break;

           case "LiteralInteger":
           case "Number":
           case "Float":
            if (type === "Integer") this.castValueToFloat(ast.argument); else if (type === "LiteralInteger") this.castLiteralToFloat(ast.argument); else this.coerce(this.expression(ast.argument), "f32");
            break;

           case "Boolean":
            this.emitCondition(ast.argument);
            this.em.f32ConvertI32S();
            break;

           default:
            throw this.astErrorOutput(`WebAssembly backend does not yet support returning ${this.returnType}`, ast);
          }
          this.em.f32Store(outputOffset);
          this.em.return_();
        }
      }
      emitComponentAddress(dataIndexGlobal, componentCount, component) {
        this.em.globalGet(dataIndexGlobal);
        if (componentCount !== 1) {
          this.em.i32Const(componentCount).i32Mul();
          if (component !== 0) this.em.i32Const(component).i32Add();
        }
        this.em.i32Const(2).i32Shl();
      }
      stmtIf(ifNode) {
        this.recordUniformity("if", ifNode.test);
        this.emitCondition(ifNode.test);
        this.enterIf();
        this.statement(ifNode.consequent);
        if (ifNode.alternate) {
          this.em.else_();
          this.statement(ifNode.alternate);
        }
        this.exit();
      }
      forLoopIsSafe(forNode) {
        let isSafe = null;
        if (forNode.init) {
          const declarations = forNode.init.declarations;
          if (declarations) {
            if (declarations.length > 1) isSafe = false;
            for (let i = 0; i < declarations.length; i++) if (declarations[i].init && declarations[i].init.type !== "Literal") isSafe = false;
          } else isSafe = false;
        } else isSafe = false;
        if (!forNode.test || !forNode.update) isSafe = false;
        if (isSafe === null) isSafe = this.isSafe(forNode.init) && this.isSafe(forNode.test);
        return isSafe;
      }
      stmtFor(forNode) {
        if (forNode.type !== "ForStatement") throw this.astErrorOutput("Invalid for statement", forNode);
        const isSafe = this.forLoopIsSafe(forNode);
        this.recordUniformity("for", forNode.test || null);
        if (forNode.init) if (forNode.init.type === "VariableDeclaration") this.stmtVariableDeclaration(forNode.init); else this.statementExpression(forNode.init);
        let safeI = -1;
        if (!isSafe) {
          safeI = this.em.addLocal("i32");
          this.em.i32Const(0).localSet(safeI);
        }
        this.enterBlock();
        const breakLevel = this.depth;
        this.enterLoop();
        const loopLevel = this.depth;
        if (!isSafe) {
          this.em.localGet(safeI).i32Const(this.loopMax).i32GeS();
          this.brIfTo(breakLevel);
        }
        if (forNode.test) {
          this.emitCondition(forNode.test);
          this.em.i32Eqz();
          this.brIfTo(breakLevel);
        }
        this.enterBlock();
        const continueLevel = this.depth;
        this.loopStack.push({
          breakLevel: breakLevel,
          continueLevel: continueLevel
        });
        if (forNode.body) this.statement(forNode.body);
        this.loopStack.pop();
        this.exit();
        if (forNode.update) this.statementExpression(forNode.update);
        if (!isSafe) this.em.localGet(safeI).i32Const(1).i32Add().localSet(safeI);
        this.brTo(loopLevel);
        this.exit();
        this.exit();
      }
      stmtWhile(whileNode) {
        if (whileNode.type !== "WhileStatement") throw this.astErrorOutput("Invalid while statement", whileNode);
        this.recordUniformity("while", whileNode.test);
        const safeI = this.em.addLocal("i32");
        this.em.i32Const(0).localSet(safeI);
        this.enterBlock();
        const breakLevel = this.depth;
        this.enterLoop();
        const loopLevel = this.depth;
        this.em.localGet(safeI).i32Const(this.loopMax).i32GeS();
        this.brIfTo(breakLevel);
        this.emitCondition(whileNode.test);
        this.em.i32Eqz();
        this.brIfTo(breakLevel);
        this.enterBlock();
        const continueLevel = this.depth;
        this.loopStack.push({
          breakLevel: breakLevel,
          continueLevel: continueLevel
        });
        this.statement(whileNode.body);
        this.loopStack.pop();
        this.exit();
        this.em.localGet(safeI).i32Const(1).i32Add().localSet(safeI);
        this.brTo(loopLevel);
        this.exit();
        this.exit();
      }
      stmtDoWhile(doWhileNode) {
        if (doWhileNode.type !== "DoWhileStatement") throw this.astErrorOutput("Invalid while statement", doWhileNode);
        this.recordUniformity("do-while", doWhileNode.test);
        const safeI = this.em.addLocal("i32");
        this.em.i32Const(0).localSet(safeI);
        this.enterBlock();
        const breakLevel = this.depth;
        this.enterLoop();
        const loopLevel = this.depth;
        this.em.localGet(safeI).i32Const(this.loopMax).i32GeS();
        this.brIfTo(breakLevel);
        this.enterBlock();
        const continueLevel = this.depth;
        this.loopStack.push({
          breakLevel: breakLevel,
          continueLevel: continueLevel
        });
        this.statement(doWhileNode.body);
        this.loopStack.pop();
        this.exit();
        this.em.localGet(safeI).i32Const(1).i32Add().localSet(safeI);
        this.emitCondition(doWhileNode.test);
        this.brIfTo(loopLevel);
        this.exit();
        this.exit();
      }
      stmtBreak(brNode) {
        const target = this.loopStack[this.loopStack.length - 1];
        if (!target) throw this.astErrorOutput("break used outside of a loop", brNode);
        this.brTo(target.breakLevel);
      }
      stmtContinue(crNode) {
        const target = this.loopStack[this.loopStack.length - 1];
        if (!target) throw this.astErrorOutput("continue used outside of a loop", crNode);
        this.brTo(target.continueLevel);
      }
      stmtSwitch(ast) {
        if (ast.type !== "SwitchStatement") throw this.astErrorOutput("Invalid switch statement", ast);
        const {discriminant: discriminant, cases: cases} = ast;
        const type = this.getType(discriminant);
        this.recordUniformity("switch", discriminant);
        let dLocal;
        let dIsInt;
        switch (type) {
         case "Float":
         case "Number":
          dIsInt = false;
          dLocal = this.em.addLocal("f32");
          this.coerce(this.expression(discriminant), "f32");
          this.em.localSet(dLocal);
          break;

         case "Integer":
          dIsInt = true;
          dLocal = this.em.addLocal("i32");
          this.coerce(this.expression(discriminant), "i32");
          this.em.localSet(dLocal);
          break;

         default:
          throw this.astErrorOutput(`Unhandled switch discriminant type "${type}"`, ast);
        }
        if (cases.length === 1 && !cases[0].test) {
          this.emitSwitchConsequent(cases[0].consequent);
          return;
        }
        const {groups: groups, defaultConsequent: defaultConsequent} = this.collectSwitchGroups(cases);
        const emitChain = index => {
          if (index === groups.length) {
            if (defaultConsequent) this.emitSwitchConsequent(defaultConsequent);
            return false;
          }
          const {tests: tests, consequent: consequent} = groups[index];
          for (let i = 0; i < tests.length; i++) {
            this.em.localGet(dLocal);
            this.emitSwitchTest(tests[i], dIsInt);
            if (dIsInt) this.em.i32Eq(); else this.em.f32Eq();
            if (i > 0) this.em.i32Or();
          }
          this.enterIf();
          this.emitSwitchConsequent(consequent);
          if (index + 1 < groups.length || defaultConsequent) {
            this.em.else_();
            emitChain(index + 1);
          }
          this.exit();
          return true;
        };
        emitChain(0);
      }
      emitSwitchTest(test, dIsInt) {
        const testType = this.getType(test);
        if (dIsInt) if (testType === "Number" || testType === "Float") this.castValueToInteger(test); else if (testType === "LiteralInteger") this.castLiteralToInteger(test); else this.coerce(this.expression(test), "i32"); else if (testType === "LiteralInteger") this.castLiteralToFloat(test); else if (testType === "Integer") this.castValueToFloat(test); else this.coerce(this.expression(test), "f32");
      }
      collectSwitchGroups(cases) {
        let defaultConsequent = null;
        const groups = [];
        let pendingTests = [];
        for (let i = 0; i < cases.length; i++) {
          if (!cases[i].test) {
            defaultConsequent = cases[i].consequent;
            continue;
          }
          pendingTests.push(cases[i].test);
          if (cases[i].consequent && cases[i].consequent.length > 0) {
            groups.push({
              tests: pendingTests,
              consequent: cases[i].consequent
            });
            pendingTests = [];
          }
        }
        return {
          groups: groups,
          defaultConsequent: defaultConsequent
        };
      }
      collectSwitchCaseStatements(consequent) {
        const statements = [];
        for (let i = 0; i < consequent.length; i++) {
          if (consequent[i].type === "BreakStatement") break;
          statements.push(consequent[i]);
        }
        const containsBreak = node => {
          if (!node || typeof node !== "object") return false;
          if (Array.isArray(node)) return node.some(containsBreak);
          if (node.type === "BreakStatement") return true;
          if (node.type === "ForStatement" || node.type === "WhileStatement" || node.type === "DoWhileStatement" || node.type === "SwitchStatement") return false;
          for (const key in node) {
            if (key === "loc" || key === "range" || key === "parent") continue;
            if (containsBreak(node[key])) return true;
          }
          return false;
        };
        for (let i = 0; i < statements.length; i++) if (containsBreak(statements[i])) throw this.astErrorOutput("break inside a switch case is only supported as the case terminator", statements[i]);
        return statements;
      }
      emitSwitchConsequent(consequent) {
        const statements = this.collectSwitchCaseStatements(consequent);
        for (let i = 0; i < statements.length; i++) this.statement(statements[i]);
      }
      expression(ast) {
        switch (ast.type) {
         case "Literal":
          return this.exprLiteral(ast);

         case "Identifier":
          return this.exprIdentifier(ast);

         case "BinaryExpression":
          return this.exprBinary(ast);

         case "LogicalExpression":
          return this.exprLogical(ast);

         case "UnaryExpression":
          return this.exprUnary(ast);

         case "UpdateExpression":
          return this.emitUpdate(ast, false);

         case "ConditionalExpression":
          return this.exprConditional(ast);

         case "CallExpression":
          return this.exprCall(ast);

         case "MemberExpression":
          return this.exprMember(ast);

         case "ThisExpression":
          throw this.astErrorOutput("unexpected bare `this`", ast);

         case "SequenceExpression":
          if (ast.expressions.length === 1) return this.expression(ast.expressions[0]);
          throw this.astErrorOutput("WebAssembly backend does not yet support the comma operator", ast);

         case "AssignmentExpression":
          throw this.astErrorOutput("WebAssembly backend does not yet support assignment used as an expression", ast);

         case "ArrayExpression":
          throw this.astErrorOutput("array literals are only supported as variable initializers and kernel returns", ast);

         default:
          throw this.astErrorOutput(`Unknown expression type ${ast.type}`, ast);
        }
      }
      exprLiteral(ast) {
        if (ast.value === true || ast.value === false) {
          this.em.i32Const(ast.value ? 1 : 0);
          return "bool";
        }
        if (isNaN(ast.value)) throw this.astErrorOutput("Non-numeric literal not supported : " + ast.value, ast);
        const key = this.astKey(ast);
        if (this.isState("casting-to-integer") || this.isState("building-integer")) {
          if (!this.vec) this.literalTypes[key] = "Integer";
          this.em.i32Const(Math.round(ast.value));
          return "i32";
        }
        if (!this.vec) this.literalTypes[key] = "Number";
        this.em.f32Const(ast.value);
        return "f32";
      }
      exprIdentifier(idtNode) {
        if (idtNode.type !== "Identifier") throw this.astErrorOutput("IdentifierExpression - not an Identifier", idtNode);
        if (idtNode.name === "Infinity") {
          this.em.f32Const(Infinity);
          return "f32";
        }
        const local = this.locals.get(idtNode.name);
        if (local) {
          if (local.kind === "vec") throw this.astErrorOutput(`array-valued variable "${idtNode.name}" can only be indexed or returned`, idtNode);
          this.em.localGet(local.index);
          return local.gtype === "Boolean" ? "bool" : local.wtype;
        }
        const argumentIndex = this.argumentNames.indexOf(idtNode.name);
        if (argumentIndex !== -1 && this.isRootKernel) {
          const type = this.argumentTypes[argumentIndex];
          const slot = this.assembler ? this.assembler.layout.scalars[idtNode.name] : null;
          const offset = slot ? slot.offset : 0;
          this.em.i32Const(0);
          switch (type) {
           case "Integer":
            this.em.i32Load(offset);
            return "i32";

           case "Boolean":
            this.em.i32Load(offset);
            return "bool";

           case "Number":
           case "Float":
            this.em.f32Load(offset);
            return "f32";

           default:
            throw this.astErrorOutput(`argument "${idtNode.name}" of type ${type} cannot be read as a scalar`, idtNode);
          }
        }
        throw this.astErrorOutput(`Unhandled identifier "${idtNode.name}"`, idtNode);
      }
      exprBinary(ast) {
        const operator = ast.operator;
        if (operator === "**") {
          this.emitByType(ast.left, "f32");
          this.emitByType(ast.right, "f32");
          this.usedMathImports.add("pow");
          this.em.call("math_pow");
          return "f32";
        }
        if (BITWISE_OPS[operator]) {
          this.emitAsIntegerOperand(ast.left);
          this.emitAsIntegerOperand(ast.right);
          this.em[BITWISE_OPS[operator]]();
          return "i32";
        }
        if (operator === "/" || operator === "%") {
          if (operator === "/") {
            this.emitByType(ast.left, "f32");
            this.emitByType(ast.right, "f32");
            this.em.f32Div();
            return "f32";
          }
          const a = this.em.addLocal("f32");
          const b = this.em.addLocal("f32");
          this.emitByType(ast.left, "f32");
          this.em.localSet(a);
          this.emitByType(ast.right, "f32");
          this.em.localSet(b);
          this.em.localGet(a).localGet(a).localGet(b).f32Div().f32Trunc().localGet(b).f32Mul().f32Sub();
          return "f32";
        }
        const leftType = this.getType(ast.left) || "Number";
        const rightType = this.getType(ast.right) || "Number";
        const key = leftType + " & " + rightType;
        let category;
        switch (key) {
         case "Integer & Integer":
          this.pushState("building-integer");
          this.coerce(this.expression(ast.left), "i32");
          this.coerce(this.expression(ast.right), "i32");
          this.popState("building-integer");
          category = "i32";
          break;

         case "Number & Float":
         case "Float & Number":
         case "Float & Float":
         case "Number & Number":
          this.pushState("building-float");
          this.coerce(this.expression(ast.left), "f32");
          this.coerce(this.expression(ast.right), "f32");
          this.popState("building-float");
          category = "f32";
          break;

         case "LiteralInteger & LiteralInteger":
          if (this.isState("casting-to-integer") || this.isState("building-integer")) {
            this.pushState("building-integer");
            this.coerce(this.expression(ast.left), "i32");
            this.coerce(this.expression(ast.right), "i32");
            this.popState("building-integer");
            category = "i32";
          } else {
            this.pushState("building-float");
            this.castLiteralToFloat(ast.left);
            this.castLiteralToFloat(ast.right);
            this.popState("building-float");
            category = "f32";
          }
          break;

         case "Integer & Float":
         case "Integer & Number":
          this.pushState("building-float");
          this.castValueToFloat(ast.left);
          this.coerce(this.expression(ast.right), "f32");
          this.popState("building-float");
          category = "f32";
          break;

         case "Integer & LiteralInteger":
          this.pushState("building-integer");
          this.coerce(this.expression(ast.left), "i32");
          this.castLiteralToInteger(ast.right);
          this.popState("building-integer");
          category = "i32";
          break;

         case "Number & Integer":
         case "Float & Integer":
          this.pushState("building-float");
          this.coerce(this.expression(ast.left), "f32");
          this.castValueToFloat(ast.right);
          this.popState("building-float");
          category = "f32";
          break;

         case "Float & LiteralInteger":
         case "Number & LiteralInteger":
          this.pushState("building-float");
          this.coerce(this.expression(ast.left), "f32");
          this.castLiteralToFloat(ast.right);
          this.popState("building-float");
          category = "f32";
          break;

         case "LiteralInteger & Float":
         case "LiteralInteger & Number":
          if (this.isState("casting-to-integer")) {
            this.pushState("building-integer");
            this.castLiteralToInteger(ast.left);
            this.castValueToInteger(ast.right);
            this.popState("building-integer");
            category = "i32";
          } else {
            this.pushState("building-float");
            this.castLiteralToFloat(ast.left);
            this.pushState("casting-to-float");
            this.coerce(this.expression(ast.right), "f32");
            this.popState("casting-to-float");
            this.popState("building-float");
            category = "f32";
          }
          break;

         case "LiteralInteger & Integer":
          this.pushState("building-integer");
          this.castLiteralToInteger(ast.left);
          this.coerce(this.expression(ast.right), "i32");
          this.popState("building-integer");
          category = "i32";
          break;

         case "Boolean & Boolean":
          this.coerce(this.expression(ast.left), "i32");
          this.coerce(this.expression(ast.right), "i32");
          category = "i32";
          break;

         default:
          throw this.astErrorOutput(`Unhandled binary expression between ${key}`, ast);
        }
        const compareOp = category === "i32" ? I32_COMPARE[operator] : F32_COMPARE[operator];
        if (compareOp) {
          this.em[compareOp]();
          return "bool";
        }
        const arithOp = category === "i32" ? I32_ARITH[operator] : F32_ARITH[operator];
        if (!arithOp) throw this.astErrorOutput(`Unhandled operator ${operator}`, ast);
        this.em[arithOp]();
        return category;
      }
      emitAsIntegerOperand(side) {
        switch (this.getType(side)) {
         case "Number":
         case "Float":
          this.castValueToInteger(side);
          break;

         case "LiteralInteger":
          this.castLiteralToInteger(side);
          break;

         default:
          {
            this.pushState("building-integer");
            const type = this.expression(side);
            this.popState("building-integer");
            this.coerce(type, "i32");
          }
        }
      }
      exprLogical(logNode) {
        this.emitCondition(logNode.left);
        this.enterIf("i32");
        if (logNode.operator === "&&") {
          this.emitCondition(logNode.right);
          this.em.else_();
          this.em.i32Const(0);
        } else if (logNode.operator === "||") {
          this.em.i32Const(1);
          this.em.else_();
          this.emitCondition(logNode.right);
        } else throw this.astErrorOutput(`Unhandled logical operator ${logNode.operator}`, logNode);
        this.exit();
        return "bool";
      }
      exprUnary(uNode) {
        switch (uNode.operator) {
         case "~":
          this.emitAsIntegerOperand(uNode.argument);
          this.em.i32Const(-1).i32Xor();
          return "i32";

         case "!":
          this.emitCondition(uNode.argument);
          this.em.i32Eqz();
          return "bool";

         case "+":
          return this.expression(uNode.argument);

         case "-":
          {
            const type = this.getType(uNode.argument);
            if (type === "Integer" || type === "LiteralInteger" && (this.isState("casting-to-integer") || this.isState("building-integer"))) {
              this.em.i32Const(0);
              this.emitByType(uNode.argument, "i32");
              this.em.i32Sub();
              return "i32";
            }
            this.emitByType(uNode.argument, "f32");
            this.em.f32Neg();
            return "f32";
          }

         default:
          throw this.astErrorOutput(`Unhandled unary operator ${uNode.operator}`, uNode);
        }
      }
      exprConditional(ast) {
        if (ast.type !== "ConditionalExpression") throw this.astErrorOutput("Not a conditional expression", ast);
        const consequentType = this.getType(ast.consequent);
        const alternateType = this.getType(ast.alternate);
        this.recordUniformity("ternary", ast.test);
        if (consequentType === null && alternateType === null) {
          this.emitCondition(ast.test);
          this.enterIf();
          this.statementExpression(ast.consequent);
          this.em.else_();
          this.statementExpression(ast.alternate);
          this.exit();
          return "void";
        }
        let targetType = consequentType === "LiteralInteger" ? "Number" : consequentType;
        if (targetType === "Integer" && (alternateType === "Number" || alternateType === "Float")) targetType = "Number";
        const wtype = targetType === "Integer" || targetType === "Boolean" ? "i32" : "f32";
        const emitBranch = branch => {
          const branchType = this.getType(branch);
          switch (targetType) {
           case "Number":
           case "Float":
            if (branchType === "Integer") this.castValueToFloat(branch); else if (branchType === "LiteralInteger") this.castLiteralToFloat(branch); else this.coerce(this.expression(branch), "f32");
            break;

           case "Integer":
            if (branchType === "Number" || branchType === "Float") this.castValueToInteger(branch); else if (branchType === "LiteralInteger") this.castLiteralToInteger(branch); else this.coerce(this.expression(branch), "i32");
            break;

           case "Boolean":
            this.emitCondition(branch);
            break;

           default:
            throw this.astErrorOutput(`WebAssembly backend does not yet support a ternary of type ${targetType}`, ast);
          }
        };
        this.emitCondition(ast.test);
        this.enterIf(wtype);
        emitBranch(ast.consequent);
        this.em.else_();
        emitBranch(ast.alternate);
        this.exit();
        return targetType === "Boolean" ? "bool" : wtype;
      }
      exprCall(ast) {
        if (!ast.callee) throw this.astErrorOutput("Unknown CallExpression", ast);
        if (ast.callee.type === "MemberExpression" && this.getVariableSignature(ast.callee, true) === "this.color") throw this.astErrorOutput("WebAssembly backend does not yet support graphical mode (this.color)", ast);
        let functionName = null;
        const isMathFunction = this.isAstMathFunction(ast);
        if (isMathFunction || ast.callee.object && ast.callee.object.type === "ThisExpression") functionName = ast.callee.property.name; else if (ast.callee.type === "SequenceExpression" && ast.callee.expressions[0].type === "Literal" && !isNaN(ast.callee.expressions[0].raw)) functionName = ast.callee.expressions[1].property.name; else functionName = ast.callee.name;
        if (!functionName) throw this.astErrorOutput(`Unhandled function, couldn't find name`, ast);
        if (this.calledFunctions.indexOf(functionName) < 0) this.calledFunctions.push(functionName);
        if (this.onFunctionCall) this.onFunctionCall(this.name, functionName, ast.arguments);
        if (isMathFunction) return this.emitMathCall(functionName, ast);
        const returnType = this.getType(ast);
        const targetTypes = this.lookupFunctionArgumentTypes(functionName) || [];
        for (let i = 0; i < ast.arguments.length; ++i) {
          const argument = ast.arguments[i];
          let targetType = targetTypes[i];
          const argumentType = this.getType(argument);
          if (!targetType) {
            this.triggerImplyArgumentType(functionName, i, argumentType, this);
            targetType = argumentType;
          }
          switch (argumentType) {
           case "Boolean":
            this.coerce(this.expression(argument), "i32");
            continue;

           case "Number":
           case "Float":
            if (targetType === "Integer") {
              this.castValueToInteger(argument);
              continue;
            } else if (targetType === "Number" || targetType === "Float" || targetType === "LiteralInteger") {
              this.coerce(this.expression(argument), "f32");
              continue;
            }
            break;

           case "Integer":
            if (targetType === "Number" || targetType === "Float") {
              this.castValueToFloat(argument);
              continue;
            } else if (targetType === "Integer") {
              this.coerce(this.expression(argument), "i32");
              continue;
            }
            break;

           case "LiteralInteger":
            if (targetType === "Integer") {
              this.castLiteralToInteger(argument);
              continue;
            } else if (targetType === "Number" || targetType === "Float" || targetType === "LiteralInteger") {
              this.castLiteralToFloat(argument);
              continue;
            }
            break;

           case "Array(2)":
           case "Array(3)":
           case "Array(4)":
           case "Array":
           case "Array2D":
           case "Array3D":
           case "Input":
            throw this.astErrorOutput("WebAssembly backend does not yet support array arguments to helper functions", ast);
          }
          throw this.astErrorOutput(`Unhandled argument combination of ${argumentType} and ${targetType} for argument named "${argument.name}"`, ast);
        }
        this.em.call(this.mangleFunctionName(functionName));
        switch (returnType) {
         case null:
         case void 0:
          return "void";

         case "Integer":
          return "i32";

         case "Boolean":
          return "bool";

         default:
          return "f32";
        }
      }
      emitMathCall(functionName, ast) {
        if (functionName === "random") {
          this.usesRandom = true;
          this.em.call("pcg_random");
          return "f32";
        }
        const emitMathArg = argument => {
          switch (this.getType(argument)) {
           case "Integer":
            this.castValueToFloat(argument);
            break;

           case "LiteralInteger":
            this.castLiteralToFloat(argument);
            break;

           default:
            this.coerce(this.expression(argument), "f32");
          }
        };
        const nativeOp = MATH_NATIVE_OPS[functionName];
        if (nativeOp) {
          emitMathArg(ast.arguments[0]);
          this.em[nativeOp]();
          return "f32";
        }
        switch (functionName) {
         case "round":
          emitMathArg(ast.arguments[0]);
          this.em.f32Const(.5).f32Add().f32Floor();
          return "f32";

         case "fround":
          emitMathArg(ast.arguments[0]);
          return "f32";

         case "min":
         case "max":
          {
            const op = functionName === "min" ? "f32Min" : "f32Max";
            emitMathArg(ast.arguments[0]);
            for (let i = 1; i < ast.arguments.length; i++) {
              emitMathArg(ast.arguments[i]);
              this.em[op]();
            }
            return "f32";
          }

         case "imul":
          emitMathArg(ast.arguments[0]);
          this.em.i32TruncSatF32S();
          emitMathArg(ast.arguments[1]);
          this.em.i32TruncSatF32S();
          this.em.i32Mul().f32ConvertI32S();
          return "f32";

         case "clz32":
          emitMathArg(ast.arguments[0]);
          this.em.i32TruncSatF32U().i32Clz().f32ConvertI32S();
          return "f32";

         default:
          {
            const arity = MATH_IMPORT_ARITY[functionName];
            if (!arity) throw this.astErrorOutput(`WebAssembly backend does not yet support Math.${functionName}`, ast);
            for (let i = 0; i < arity; i++) emitMathArg(ast.arguments[i]);
            this.usedMathImports.add(functionName);
            this.em.call("math_" + functionName);
            return "f32";
          }
        }
      }
      exprMember(mNode) {
        const details = this.getMemberExpressionDetails(mNode);
        if (!details) throw this.astErrorOutput("Unexpected expression", mNode);
        const {signature: signature, name: name, origin: origin, type: type, property: property, xProperty: xProperty, yProperty: yProperty, zProperty: zProperty} = details;
        switch (signature) {
         case "value.thread.value":
         case "this.thread.value":
          {
            if (name !== "x" && name !== "y" && name !== "z") throw this.astErrorOutput("Unexpected expression, expected `this.thread.x`, `this.thread.y`, or `this.thread.z`", mNode);
            this.readsThread = true;
            const globals = this.assembler ? this.assembler.globals : null;
            this.em.globalGet(globals ? globals["thread" + name.toUpperCase()] : 0);
            return "i32";
          }

         case "this.output.value":
          {
            const axisIndex = {
              x: 0,
              y: 1,
              z: 2
            }[name];
            if (axisIndex === void 0) throw this.astErrorOutput("Unexpected expression", mNode);
            const value = this.output[axisIndex];
            if (this.isState("casting-to-float")) {
              this.em.f32Const(value);
              return "f32";
            }
            this.em.i32Const(value);
            return "i32";
          }

         case "value.value":
          {
            if (origin === "Math") {
              this.em.f32Const(Math[name]);
              return "f32";
            }
            const component = {
              r: 0,
              g: 1,
              b: 2,
              a: 3
            }[property];
            if (component !== void 0) {
              const local = this.locals.get(name);
              if (local && local.kind === "vec" && component < local.n) {
                this.em.localGet(local.indices[component]);
                return "f32";
              }
            }
            throw this.astErrorOutput("Unexpected expression", mNode);
          }

         case "this.constants.value":
          {
            const value = this.constants[name];
            switch (type) {
             case "Integer":
              if (this.isState("casting-to-float")) {
                this.em.f32Const(value);
                return "f32";
              }
              this.em.i32Const(Math.round(value));
              return "i32";

             case "Number":
             case "Float":
              if (this.isState("casting-to-integer")) {
                this.em.i32Const(Math.round(value));
                return "i32";
              }
              this.em.f32Const(value);
              return "f32";

             case "Boolean":
              this.em.i32Const(value ? 1 : 0);
              return "bool";

             default:
              throw this.astErrorOutput(`WebAssembly backend does not yet support constant type ${type}`, mNode);
            }
          }

         case "value[]":
         case "value[][]":
         case "value[][][]":
         case "value[][][][]":
          {
            const local = this.locals.get(name);
            if (local && local.kind === "vec") {
              if (signature !== "value[]") throw this.astErrorOutput("Unexpected expression", mNode);
              return this.emitVecIndex(local, xProperty);
            }
            return this.emitFlatLoad("arrays", name, xProperty, yProperty, zProperty, mNode);
          }

         case "this.constants.value[]":
         case "this.constants.value[][]":
         case "this.constants.value[][][]":
         case "this.constants.value[][][][]":
          return this.emitFlatLoad("constantArrays", name, xProperty, yProperty, zProperty, mNode);

         case "fn()[]":
          throw this.astErrorOutput("WebAssembly backend does not yet support indexing a function call result", mNode);

         default:
          throw this.astErrorOutput(`WebAssembly backend does not yet support expression signature "${signature}"`, mNode);
        }
      }
      emitFlatLoad(table, name, xProperty, yProperty, zProperty, mNode) {
        let layout;
        if (this.assembler) {
          layout = this.assembler.layout[table][name];
          if (!layout) throw this.astErrorOutput(`no memory layout for "${name}" \u2014 arrays are only readable as kernel arguments or constants`, mNode);
        } else layout = {
          offset: 0,
          dims: [ 1, 1, 1 ]
        };
        this.emitIndex(xProperty);
        if (yProperty) {
          this.emitIndex(yProperty);
          this.em.i32Const(layout.dims[0]).i32Mul().i32Add();
        }
        if (zProperty) {
          this.emitIndex(zProperty);
          this.em.i32Const(layout.dims[0] * layout.dims[1]).i32Mul().i32Add();
        }
        if (this.vec && this.vMaskDepth > 0) this.emitClampScalarIndex(layout.dims[0] * layout.dims[1] * layout.dims[2] - 1);
        this.em.i32Const(2).i32Shl();
        this.em.f32Load(layout.offset);
        return "f32";
      }
      emitClampScalarIndex(max) {
        const t = this.em.addLocal("i32");
        this.em.localSet(t);
        this.em.localGet(t).i32Const(0).localGet(t).i32Const(0).i32GeS().select();
        this.em.localSet(t);
        this.em.localGet(t).i32Const(max).localGet(t).i32Const(max).i32LeS().select();
      }
      emitVecIndex(local, xProperty) {
        if (xProperty.type === "Literal" && Number.isInteger(xProperty.value)) {
          if (xProperty.value < 0 || xProperty.value >= local.n) throw this.astErrorOutput(`index ${xProperty.value} out of range for Array(${local.n})`, xProperty);
          this.em.localGet(local.indices[xProperty.value]);
          return "f32";
        }
        const idx = this.em.addLocal("i32");
        this.emitIndex(xProperty);
        this.em.localSet(idx);
        this.em.localGet(local.indices[0]);
        for (let k = 1; k < local.n; k++) {
          this.em.localGet(local.indices[k]);
          this.em.localGet(idx).i32Const(k).i32Ne();
          this.em.select();
        }
        return "f32";
      }
      emitIndex(property) {
        if (!property) throw new Error("Property not set");
        switch (this.getType(property)) {
         case "Number":
         case "Float":
          this.castValueToInteger(property);
          return;

         case "LiteralInteger":
          this.castLiteralToInteger(property);
          return;

         case "Integer":
          {
            this.pushState("building-integer");
            const emitted = this.expression(property);
            this.popState("building-integer");
            this.coerce(emitted, "i32");
            return;
          }

         default:
          this.coerce(this.expression(property), "i32");
        }
      }
      emitVectorFunction(assembler) {
        if (!this.isRootKernel) throw new Error("only the root kernel is vectorized; helpers are lane-scalarized at call sites");
        this.assembler = assembler;
        const em = assembler.module.addFunction("kernel_simd", {
          params: [],
          results: []
        });
        this.em = em;
        this.vec = true;
        try {
          this.locals = new Map;
          this.depth = 0;
          this.loopStack = [];
          this.vLoopStack = [];
          this.taintedLocals = new Set;
          const ast = this.getJsAST();
          if (!this.vInfo) this.vInfo = this.vAnalyze(ast);
          this.vMaskDepth = 0;
          this.vTerminated = false;
          this.vCur = em.addLocal("v128");
          em.v128ConstI32x4(-1, -1, -1, -1).localSet(this.vCur);
          this.vRetMask = this.vInfo.varyingReturn ? em.addLocal("v128") : -1;
          this._vBaseX = -1;
          if (assembler.helperInfo) {
            this._vBaseX = em.addLocal("i32");
            em.globalGet(assembler.globals.threadX).localSet(this._vBaseX);
          }
          for (const name of this.vInfo.assignedArgs) {
            const argumentIndex = this.argumentNames.indexOf(name);
            const gtype = this.argumentTypes[argumentIndex];
            const slot = assembler.layout.scalars[name];
            if (!slot) throw this.astErrorOutput(`WebAssembly backend does not yet support assigning to the array argument "${name}"`, this.getJsAST());
            const isInt = gtype === "Integer" || gtype === "Boolean";
            const index = em.addLocal("v128");
            em.i32Const(0);
            if (isInt) em.i32Load(slot.offset).i32x4Splat(); else em.f32Load(slot.offset).f32x4Splat();
            em.localSet(index);
            this.locals.set(name, {
              kind: "vscalar",
              index: index,
              wtype: isInt ? "vi32" : "vf32",
              gtype: gtype
            });
          }
          const body = ast.body.body;
          for (let i = 0; i < body.length; i++) {
            this.vstatement(body[i]);
            if (this.vTerminated) break;
          }
        } finally {
          this.vec = false;
          this.vMaskDepth = 0;
        }
        return em;
      }
      vAnalyze(ast) {
        const varying = new Set;
        const assignedArgs = new Set;
        let varyingReturn = false;
        let changed = true;
        const self = this;
        const exprVarying = node => {
          if (!node || typeof node !== "object") return false;
          switch (node.type) {
           case "Literal":
           case "ThisExpression":
            return false;

           case "Identifier":
            return varying.has(node.name);

           case "MemberExpression":
            if (!node.computed && node.object.type === "MemberExpression" && !node.object.computed && node.object.property && node.object.property.name === "thread") return node.property.name === "x";
            if (node.computed) return exprVarying(node.object) || exprVarying(node.property);
            return exprVarying(node.object);

           case "BinaryExpression":
           case "LogicalExpression":
            return exprVarying(node.left) || exprVarying(node.right);

           case "UnaryExpression":
           case "UpdateExpression":
            return exprVarying(node.argument);

           case "ConditionalExpression":
            return exprVarying(node.test) || exprVarying(node.consequent) || exprVarying(node.alternate);

           case "CallExpression":
            if (self.isAstMathFunction(node)) {
              if (node.callee.property.name === "random") return true;
              return node.arguments.some(exprVarying);
            }
            return true;

           case "SequenceExpression":
            return node.expressions.some(exprVarying);

           case "ArrayExpression":
            return node.elements.some(exprVarying);

           case "AssignmentExpression":
            return exprVarying(node.right) || node.left.type === "Identifier" && varying.has(node.left.name);

           default:
            return true;
          }
        };
        const taint = name => {
          if (name && !varying.has(name)) {
            varying.add(name);
            changed = true;
          }
        };
        const scanExprTaints = (node, cv) => {
          if (!node || typeof node !== "object") return;
          if (Array.isArray(node)) return node.forEach(sub => scanExprTaints(sub, cv));
          switch (node.type) {
           case "UpdateExpression":
            if (node.argument.type === "Identifier") {
              if (self.argumentNames.indexOf(node.argument.name) !== -1) {
                if (!assignedArgs.has(node.argument.name)) {
                  assignedArgs.add(node.argument.name);
                  changed = true;
                }
                taint(node.argument.name);
              }
              if (cv) taint(node.argument.name);
            }
            return scanExprTaints(node.argument, cv);

           case "AssignmentExpression":
            if (node.left.type === "Identifier") {
              if (self.argumentNames.indexOf(node.left.name) !== -1) {
                if (!assignedArgs.has(node.left.name)) {
                  assignedArgs.add(node.left.name);
                  changed = true;
                }
                taint(node.left.name);
              }
              if (cv) taint(node.left.name);
            }
            scanExprTaints(node.left, cv);
            return scanExprTaints(node.right, cv);

           case "ConditionalExpression":
            {
              scanExprTaints(node.test, cv);
              const branchCv = cv || exprVarying(node.test);
              scanExprTaints(node.consequent, branchCv);
              return scanExprTaints(node.alternate, branchCv);
            }

           case "LogicalExpression":
            scanExprTaints(node.left, cv);
            return scanExprTaints(node.right, true);

           default:
            for (const key in node) {
              if (key === "loc" || key === "start" || key === "end" || key === "parent") continue;
              const child = node[key];
              if (child && typeof child === "object") scanExprTaints(child, cv);
            }
          }
        };
        const collectAssigned = (node, out) => {
          if (!node || typeof node !== "object") return;
          if (Array.isArray(node)) return node.forEach(sub => collectAssigned(sub, out));
          switch (node.type) {
           case "VariableDeclarator":
            if (node.id && node.id.type === "Identifier") out.push(node.id.name);
            break;

           case "AssignmentExpression":
            if (node.left.type === "Identifier") out.push(node.left.name);
            break;

           case "UpdateExpression":
            if (node.argument.type === "Identifier") out.push(node.argument.name);
            break;

           case "FunctionDeclaration":
            return;
          }
          for (const key in node) {
            if (key === "loc" || key === "start" || key === "end" || key === "parent") continue;
            const child = node[key];
            if (child && typeof child === "object") collectAssigned(child, out);
          }
        };
        const hasVaryingExit = (node, cv) => {
          if (!node || typeof node !== "object") return false;
          if (Array.isArray(node)) return node.some(sub => hasVaryingExit(sub, cv));
          switch (node.type) {
           case "BreakStatement":
           case "ContinueStatement":
            return cv;

           case "ForStatement":
           case "WhileStatement":
           case "DoWhileStatement":
           case "FunctionDeclaration":
            return false;

           case "IfStatement":
            {
              const branchCv = cv || exprVarying(node.test);
              if (hasVaryingExit(node.consequent, branchCv)) return true;
              return node.alternate ? hasVaryingExit(node.alternate, branchCv) : false;
            }

           case "ConditionalExpression":
            {
              const branchCv = cv || exprVarying(node.test);
              return hasVaryingExit(node.consequent, branchCv) || hasVaryingExit(node.alternate, branchCv);
            }

           case "SwitchStatement":
            {
              const switchCv = cv || exprVarying(node.discriminant) || node.cases.some(c => c.test && exprVarying(c.test));
              return node.cases.some(c => c.consequent.some(stmt => stmt.type === "BreakStatement" ? false : hasVaryingExit(stmt, switchCv)));
            }

           default:
            for (const key in node) {
              if (key === "loc" || key === "start" || key === "end" || key === "parent") continue;
              const child = node[key];
              if (child && typeof child === "object" && hasVaryingExit(child, cv)) return true;
            }
            return false;
          }
        };
        const walkExprStatement = (node, cv) => {
          switch (node.type) {
           case "AssignmentExpression":
            if (node.left.type === "Identifier") {
              const name = node.left.name;
              if (self.argumentNames.indexOf(name) !== -1) {
                if (!assignedArgs.has(name)) {
                  assignedArgs.add(name);
                  changed = true;
                }
                taint(name);
              }
              if (cv || exprVarying(node.right) || node.operator !== "=" && varying.has(name)) taint(name);
            }
            return scanExprTaints(node.right, cv);

           case "UpdateExpression":
            if (node.argument.type === "Identifier") {
              const name = node.argument.name;
              if (self.argumentNames.indexOf(name) !== -1) {
                if (!assignedArgs.has(name)) {
                  assignedArgs.add(name);
                  changed = true;
                }
                taint(name);
              }
              if (cv) taint(name);
            }
            return;

           case "SequenceExpression":
            return node.expressions.forEach(e => walkExprStatement(e, cv));

           default:
            return scanExprTaints(node, cv);
          }
        };
        const walkStatement = (node, cv) => {
          if (!node) return;
          switch (node.type) {
           case "VariableDeclaration":
            for (const declaration of node.declarations) {
              if (!declaration.init) continue;
              if (cv || exprVarying(declaration.init)) taint(declaration.id.name);
              scanExprTaints(declaration.init, cv);
            }
            return;

           case "ExpressionStatement":
            return walkExprStatement(node.expression, cv);

           case "ReturnStatement":
            if (cv) varyingReturn = true;
            if (node.argument) scanExprTaints(node.argument, cv);
            return;

           case "IfStatement":
            {
              scanExprTaints(node.test, cv);
              const branchCv = cv || exprVarying(node.test);
              walkStatement(node.consequent, branchCv);
              if (node.alternate) walkStatement(node.alternate, branchCv);
              return;
            }

           case "ForStatement":
           case "WhileStatement":
           case "DoWhileStatement":
            {
              const loopVarying = cv || (node.test ? exprVarying(node.test) : false) || hasVaryingExit(node.body, false);
              if (loopVarying) {
                const assigned = [];
                if (node.init) collectAssigned(node.init, assigned);
                collectAssigned(node.body, assigned);
                if (node.update) collectAssigned(node.update, assigned);
                assigned.forEach(taint);
              }
              if (node.init) if (node.init.type === "VariableDeclaration") walkStatement(node.init, cv); else walkExprStatement(node.init, cv);
              walkStatement(node.body, loopVarying);
              if (node.update) walkExprStatement(node.update, loopVarying);
              if (node.test) scanExprTaints(node.test, loopVarying);
              return;
            }

           case "SwitchStatement":
            {
              const switchCv = cv || exprVarying(node.discriminant) || node.cases.some(c => c.test && exprVarying(c.test));
              for (const switchCase of node.cases) for (const stmt of switchCase.consequent) walkStatement(stmt, switchCv);
              return;
            }

           case "BlockStatement":
            return node.body.forEach(stmt => walkStatement(stmt, cv));

           default:
            return;
          }
        };
        while (changed) {
          changed = false;
          walkStatement(ast.body, false);
        }
        return {
          varying: varying,
          varyingReturn: varyingReturn,
          assignedArgs: assignedArgs,
          exprVarying: exprVarying,
          hasVaryingExit: hasVaryingExit
        };
      }
      vZero() {
        this.em.v128ConstI32x4(0, 0, 0, 0);
        return this;
      }
      vInnermostVaryingLoop() {
        const top = this.vLoopStack[this.vLoopStack.length - 1];
        return top && top.varying ? top : null;
      }
      vRecomputeCur(savedIndex) {
        const em = this.em;
        em.localGet(savedIndex);
        if (this.vRetMask !== -1) em.localGet(this.vRetMask).v128Andnot();
        const loop = this.vInnermostVaryingLoop();
        if (loop) {
          if (loop.vBrk !== -1) em.localGet(loop.vBrk).v128Andnot();
          if (loop.vCnt !== -1) em.localGet(loop.vCnt).v128Andnot();
        }
        em.localSet(this.vCur);
      }
      vLoopBodyExits(body) {
        let hasBreak = false;
        let hasContinue = false;
        const walk = node => {
          if (!node || typeof node !== "object" || hasBreak && hasContinue) return;
          if (Array.isArray(node)) return node.forEach(walk);
          switch (node.type) {
           case "BreakStatement":
            hasBreak = true;
            return;

           case "ContinueStatement":
            hasContinue = true;
            return;

           case "ForStatement":
           case "WhileStatement":
           case "DoWhileStatement":
           case "FunctionDeclaration":
            return;

           case "SwitchStatement":
            for (const switchCase of node.cases) for (const stmt of switchCase.consequent) if (stmt.type !== "BreakStatement") walk(stmt);
            return;
          }
          for (const key in node) {
            if (key === "loc" || key === "start" || key === "end" || key === "parent") continue;
            const child = node[key];
            if (child && typeof child === "object") walk(child);
          }
        };
        walk(body);
        return {
          hasBreak: hasBreak,
          hasContinue: hasContinue
        };
      }
      vSetLocal(index) {
        const em = this.em;
        if (this.vMaskDepth > 0) em.localGet(index).localGet(this.vCur).v128Bitselect();
        em.localSet(index);
      }
      vCoerce(from, to) {
        if (from === to) return to;
        const em = this.em;
        switch (from) {
         case "f32":
         case "i32":
         case "bool":
          if (to === "vf32") {
            this.coerce(from, "f32");
            em.f32x4Splat();
            return to;
          }
          if (to === "vi32") {
            this.coerce(from, "i32");
            em.i32x4Splat();
            return to;
          }
          if (to === "vbool") {
            this.coerce(from, "i32");
            em.i32x4Splat();
            this.vZero();
            em.i32x4Ne();
            return to;
          }
          break;

         case "vf32":
          if (to === "vi32") {
            em.i32x4TruncSatF32x4S();
            return to;
          }
          if (to === "vbool") {
            em.v128ConstF32x4(0, 0, 0, 0).f32x4Ne();
            return to;
          }
          break;

         case "vi32":
          if (to === "vf32") {
            em.f32x4ConvertI32x4S();
            return to;
          }
          if (to === "vbool") {
            this.vZero();
            em.i32x4Ne();
            return to;
          }
          break;

         case "vbool":
          if (to === "vi32") {
            em.v128ConstI32x4(1, 1, 1, 1).v128And();
            return to;
          }
          if (to === "vf32") {
            em.v128ConstI32x4(1, 1, 1, 1).v128And().f32x4ConvertI32x4S();
            return to;
          }
          break;
        }
        throw new Error(`cannot convert ${from} to ${to}`);
      }
      vCastLiteralToInteger(ast) {
        this.pushState("casting-to-integer");
        const type = this.vexpr(ast);
        this.popState("casting-to-integer");
        this.vCoerce(type, "vi32");
        return "vi32";
      }
      vCastLiteralToFloat(ast) {
        this.pushState("casting-to-float");
        const type = this.vexpr(ast);
        this.popState("casting-to-float");
        this.vCoerce(type, "vf32");
        return "vf32";
      }
      vCastValueToInteger(ast) {
        this.pushState("casting-to-integer");
        const type = this.vexpr(ast);
        this.popState("casting-to-integer");
        this.vCoerce(type, "vi32");
        return "vi32";
      }
      vCastValueToFloat(ast) {
        this.pushState("casting-to-float");
        const type = this.vexpr(ast);
        this.popState("casting-to-float");
        this.vCoerce(type, "vf32");
        return "vf32";
      }
      vEmitByType(ast, want) {
        const type = this.getType(ast);
        if (want === "vf32") {
          if (type === "Integer") return this.vCastValueToFloat(ast);
          if (type === "LiteralInteger") return this.vCastLiteralToFloat(ast);
          this.vCoerce(this.vexpr(ast), "vf32");
          return "vf32";
        }
        if (type === "Number" || type === "Float") return this.vCastValueToInteger(ast);
        if (type === "LiteralInteger") return this.vCastLiteralToInteger(ast);
        this.vCoerce(this.vexpr(ast), "vi32");
        return "vi32";
      }
      vexprMask(ast) {
        const type = this.vexpr(ast);
        if (type === "vbool") return;
        if (type === "vi32") {
          this.vZero();
          this.em.i32x4Ne();
          return;
        }
        if (type === "vf32") {
          this.em.v128ConstF32x4(0, 0, 0, 0).f32x4Ne();
          return;
        }
        this.coerce(type, "bool");
        this.em.i32x4Splat();
        this.vZero();
        this.em.i32x4Ne();
      }
      vstatement(ast) {
        switch (ast.type) {
         case "VariableDeclaration":
          return this.vstmtVariableDeclaration(ast);

         case "ExpressionStatement":
          return this.vstatementExpression(ast.expression);

         case "ReturnStatement":
          return this.vstmtReturn(ast);

         case "IfStatement":
          return this.vstmtIf(ast);

         case "ForStatement":
          return this.vstmtFor(ast);

         case "WhileStatement":
          return this.vstmtWhile(ast);

         case "DoWhileStatement":
          return this.vstmtDoWhile(ast);

         case "BlockStatement":
          for (let i = 0; i < ast.body.length; i++) {
            this.vstatement(ast.body[i]);
            if (this.vTerminated) break;
          }
          return;

         case "BreakStatement":
          return this.vstmtBreak(ast);

         case "ContinueStatement":
          return this.vstmtContinue(ast);

         case "SwitchStatement":
          return this.vstmtSwitch(ast);

         case "FunctionDeclaration":
          if (this.isChildFunction(ast)) return;
          throw this.astErrorOutput("unexpected function declaration", ast);

         case "EmptyStatement":
         case "DebuggerStatement":
          return;

         default:
          throw this.astErrorOutput(`Unknown statement type ${ast.type}`, ast);
        }
      }
      vstatementBody(node) {
        if (!node) return;
        const previous = this.vTerminated;
        this.vTerminated = false;
        this.vstatement(node);
        this.vTerminated = previous;
      }
      vstatementExpression(expression) {
        switch (expression.type) {
         case "AssignmentExpression":
          return this.vAssign(expression);

         case "UpdateExpression":
          this.vUpdate(expression, true);
          return;

         case "SequenceExpression":
          for (let i = 0; i < expression.expressions.length; i++) this.vstatementExpression(expression.expressions[i]);
          return;

         case "Identifier":
         case "Literal":
          return;

         default:
          if (this.vexpr(expression) !== "void") this.em.drop();
        }
      }
      vstmtVariableDeclaration(varDecNode) {
        const declarations = varDecNode.declarations;
        if (!declarations || !declarations[0] || !declarations[0].init) throw this.astErrorOutput("Unexpected expression", varDecNode);
        for (let i = 0; i < declarations.length; i++) {
          const declaration = declarations[i];
          if (!this.vInfo.varying.has(declaration.id.name)) {
            this.stmtVariableDeclaration(Object.assign({}, varDecNode, {
              declarations: [ declaration ]
            }));
            continue;
          }
          this.vDeclareVarying(declaration, varDecNode);
        }
      }
      vDeclareVarying(declaration, varDecNode) {
        const em = this.em;
        const init = declaration.init;
        const name = declaration.id.name;
        const info = this.getDeclaration(declaration.id);
        const actualType = this.getType(init);
        if (actualType === "Array(2)" || actualType === "Array(3)" || actualType === "Array(4)") {
          const n = parseInt(actualType.substring(6), 10);
          info.valueType = actualType;
          let local = this.locals.get(name);
          if (!local || local.kind !== "vvec" || local.n !== n) {
            const indices = [];
            for (let c = 0; c < n; c++) indices.push(em.addLocal("v128"));
            local = {
              kind: "vvec",
              indices: indices,
              n: n,
              gtype: actualType
            };
            this.locals.set(name, local);
          }
          if (init.type === "ArrayExpression") {
            for (let c = 0; c < n; c++) {
              this.vEmitArrayElement(init.elements[c]);
              this.vSetLocal(local.indices[c]);
            }
            return;
          }
          if (init.type === "Identifier") {
            const source = this.locals.get(init.name);
            if (source && source.kind === "vvec" && source.n === n) {
              for (let c = 0; c < n; c++) {
                em.localGet(source.indices[c]);
                this.vSetLocal(local.indices[c]);
              }
              return;
            }
            if (source && source.kind === "vec" && source.n === n) {
              for (let c = 0; c < n; c++) {
                em.localGet(source.indices[c]).f32x4Splat();
                this.vSetLocal(local.indices[c]);
              }
              return;
            }
          }
          throw this.astErrorOutput(`WebAssembly backend does not yet support ${actualType} initializer of type ${init.type}`, varDecNode);
        }
        let type = actualType;
        if (type === "LiteralInteger") type = info.suggestedType === "Integer" ? "Integer" : "Number";
        if (actualType === "Integer" && type === "Integer") {
          info.valueType = "Number";
          this.vSetVaryingScalar(name, "vf32", "Number", () => this.vCastValueToFloat(init));
          return;
        }
        info.valueType = type;
        switch (type) {
         case "Number":
         case "Float":
          this.vSetVaryingScalar(name, "vf32", type, () => {
            if (actualType === "LiteralInteger") this.vCastLiteralToFloat(init); else if (actualType === "Integer") this.vCastValueToFloat(init); else this.vCoerce(this.vexpr(init), "vf32");
          });
          break;

         case "Integer":
          this.vSetVaryingScalar(name, "vi32", "Integer", () => {
            if (actualType === "LiteralInteger") this.vCastLiteralToInteger(init); else if (actualType === "Number" || actualType === "Float") this.vCastValueToInteger(init); else this.vCoerce(this.vexpr(init), "vi32");
          });
          break;

         case "Boolean":
          this.vSetVaryingScalar(name, "vi32", "Boolean", () => {
            this.vexprMask(init);
            this.em.v128ConstI32x4(1, 1, 1, 1).v128And();
          });
          break;

         default:
          throw this.astErrorOutput(`WebAssembly backend does not yet support declaring type ${type}`, varDecNode);
        }
      }
      vSetVaryingScalar(name, wtype, gtype, emitInit) {
        let local = this.locals.get(name);
        if (!local || local.kind !== "vscalar" || local.wtype !== wtype) {
          local = {
            kind: "vscalar",
            index: this.em.addLocal("v128"),
            wtype: wtype,
            gtype: gtype
          };
          this.locals.set(name, local);
        } else local.gtype = gtype;
        emitInit();
        this.vSetLocal(local.index);
      }
      vEmitArrayElement(element) {
        switch (this.getType(element)) {
         case "Integer":
          this.vCastValueToFloat(element);
          break;

         case "LiteralInteger":
          this.vCastLiteralToFloat(element);
          break;

         default:
          this.vCoerce(this.vexpr(element), "vf32");
        }
      }
      vAssign(assNode) {
        if (assNode.left.type !== "Identifier") throw this.astErrorOutput(`WebAssembly backend does not yet support assignment to ${assNode.left.type}`, assNode);
        const name = assNode.left.name;
        const local = this.locals.get(name);
        if (local && local.kind === "scalar") return this.emitAssignment(assNode);
        if (!local || local.kind !== "vscalar") throw this.astErrorOutput(`cannot assign to "${name}"`, assNode);
        const wtype = local.wtype;
        if (assNode.operator === "=") {
          const leftType = this.getType(assNode.left);
          const rightType = this.getType(assNode.right);
          if (leftType !== "Integer" && rightType === "Integer") {
            this.vCastValueToFloat(assNode.right);
            this.vCoerce("vf32", wtype);
          } else if (leftType !== "Integer" && rightType === "LiteralInteger") {
            this.vCastLiteralToFloat(assNode.right);
            this.vCoerce("vf32", wtype);
          } else if (leftType === "Integer" && rightType === "LiteralInteger") {
            this.vCastLiteralToInteger(assNode.right);
            this.vCoerce("vi32", wtype);
          } else if (leftType === "Integer" && (rightType === "Number" || rightType === "Float")) {
            this.vCastValueToInteger(assNode.right);
            this.vCoerce("vi32", wtype);
          } else this.vCoerce(this.vexpr(assNode.right), wtype);
        } else {
          const synthetic = {
            type: "BinaryExpression",
            operator: assNode.operator.slice(0, -1),
            left: assNode.left,
            right: assNode.right
          };
          this.vCoerce(this.vexprBinary(synthetic), wtype);
        }
        this.vSetLocal(local.index);
      }
      vUpdate(uNode, isStatement) {
        if (uNode.argument.type !== "Identifier") throw this.astErrorOutput("update expression needs a variable", uNode);
        const local = this.locals.get(uNode.argument.name);
        if (local && local.kind === "scalar") return this.emitUpdate(uNode, isStatement);
        if (!local || local.kind !== "vscalar") throw this.astErrorOutput(`cannot update "${uNode.argument.name}"`, uNode);
        const em = this.em;
        const isInt = local.wtype === "vi32";
        const one = () => isInt ? em.v128ConstI32x4(1, 1, 1, 1) : em.v128ConstF32x4(1, 1, 1, 1);
        const op = uNode.operator === "++" ? isInt ? "i32x4Add" : "f32x4Add" : isInt ? "i32x4Sub" : "f32x4Sub";
        if (isStatement) {
          em.localGet(local.index);
          one();
          em[op]();
          this.vSetLocal(local.index);
          return "void";
        }
        if (uNode.prefix) {
          em.localGet(local.index);
          one();
          em[op]();
          this.vSetLocal(local.index);
          em.localGet(local.index);
        } else {
          const old = em.addLocal("v128");
          em.localGet(local.index).localSet(old);
          em.localGet(local.index);
          one();
          em[op]();
          this.vSetLocal(local.index);
          em.localGet(old);
        }
        return local.wtype;
      }
      vstmtIf(ifNode) {
        const em = this.em;
        if (!this.vInfo.exprVarying(ifNode.test)) {
          this.emitCondition(ifNode.test);
          this.enterIf();
          this.vstatementBody(ifNode.consequent);
          if (ifNode.alternate) {
            em.else_();
            this.vstatementBody(ifNode.alternate);
          }
          this.exit();
          return;
        }
        const m = em.addLocal("v128");
        this.vexprMask(ifNode.test);
        em.localSet(m);
        const saved = em.addLocal("v128");
        em.localGet(this.vCur).localSet(saved);
        em.localGet(saved).localGet(m).v128And().localSet(this.vCur);
        em.localGet(this.vCur).v128AnyTrue();
        this.enterIf();
        this.vMaskDepth++;
        this.vstatementBody(ifNode.consequent);
        this.vMaskDepth--;
        this.exit();
        if (ifNode.alternate) {
          em.localGet(saved).localGet(m).v128Andnot().localSet(this.vCur);
          em.localGet(this.vCur).v128AnyTrue();
          this.enterIf();
          this.vMaskDepth++;
          this.vstatementBody(ifNode.alternate);
          this.vMaskDepth--;
          this.exit();
        }
        this.vRecomputeCur(saved);
      }
      vstmtReturn(ast) {
        const em = this.em;
        if (!ast.argument) {
          this.vRetireOrReturn();
          return;
        }
        this.pushState("skip-literal-correction");
        const type = this.getType(ast.argument);
        this.popState("skip-literal-correction");
        switch (this.returnType) {
         case "Array(2)":
         case "Array(3)":
         case "Array(4)":
          {
            const n = parseInt(this.returnType.substring(6), 10);
            const argument = ast.argument;
            const comps = [];
            if (argument.type === "ArrayExpression") {
              if (argument.elements.length !== n) throw this.astErrorOutput(`expected ${n} array elements to match return type ${this.returnType}`, ast);
              for (let c = 0; c < n; c++) {
                const t = em.addLocal("v128");
                this.vEmitArrayElement(argument.elements[c]);
                em.localSet(t);
                comps.push(t);
              }
            } else if (argument.type === "Identifier") {
              const local = this.locals.get(argument.name);
              if (local && local.kind === "vvec" && local.n === n) for (let c = 0; c < n; c++) comps.push(local.indices[c]); else if (local && local.kind === "vec" && local.n === n) for (let c = 0; c < n; c++) {
                const t = em.addLocal("v128");
                em.localGet(local.indices[c]).f32x4Splat().localSet(t);
                comps.push(t);
              } else throw this.astErrorOutput(`"${argument.name}" is not an Array(${n}) variable`, ast);
            } else throw this.astErrorOutput(`WebAssembly backend does not yet support returning ${this.returnType} from a ${argument.type}`, ast);
            this.vStoreOutput(comps);
            this.vRetireOrReturn();
            return;
          }

         default:
          {
            const t = em.addLocal("v128");
            switch (this.returnType) {
             case "Integer":
              if (type === "Float" || type === "Number") this.vCastValueToInteger(ast.argument); else if (type === "LiteralInteger") this.vCastLiteralToInteger(ast.argument); else this.vCoerce(this.vexpr(ast.argument), "vi32");
              em.f32x4ConvertI32x4S();
              break;

             case "LiteralInteger":
             case "Number":
             case "Float":
              if (type === "Integer") this.vCastValueToFloat(ast.argument); else if (type === "LiteralInteger") this.vCastLiteralToFloat(ast.argument); else this.vCoerce(this.vexpr(ast.argument), "vf32");
              break;

             case "Boolean":
              this.vexprMask(ast.argument);
              em.v128ConstI32x4(1, 1, 1, 1).v128And().f32x4ConvertI32x4S();
              break;

             default:
              throw this.astErrorOutput(`WebAssembly backend does not yet support returning ${this.returnType}`, ast);
            }
            em.localSet(t);
            this.vStoreOutput([ t ]);
            this.vRetireOrReturn();
          }
        }
      }
      vStoreOutput(comps) {
        const em = this.em;
        const globals = this.assembler.globals;
        const outputOffset = this.assembler.layout.outputOffset;
        const n = comps.length;
        let maskLocal = -1;
        if (this.vMaskDepth > 0) maskLocal = this.vCur; else if (this.vRetMask !== -1) {
          maskLocal = em.addLocal("v128");
          em.localGet(this.vRetMask).v128Not().localSet(maskLocal);
        }
        const addr = em.addLocal("i32");
        if (n === 1) {
          em.globalGet(globals.dataIndex).i32Const(2).i32Shl().localSet(addr);
          if (maskLocal === -1) em.localGet(addr).localGet(comps[0]).v128Store(outputOffset, 2); else {
            em.localGet(addr);
            em.localGet(comps[0]);
            em.localGet(addr).v128Load(outputOffset, 2);
            em.localGet(maskLocal).v128Bitselect();
            em.v128Store(outputOffset, 2);
          }
          return;
        }
        em.globalGet(globals.dataIndex).i32Const(n).i32Mul().i32Const(2).i32Shl().localSet(addr);
        for (let lane = 0; lane < 4; lane++) for (let c = 0; c < n; c++) {
          const offset = outputOffset + (lane * n + c) * 4;
          em.localGet(addr);
          em.localGet(comps[c]).f32x4ExtractLane(lane);
          if (maskLocal !== -1) {
            em.localGet(addr).f32Load(offset);
            em.localGet(maskLocal).i32x4ExtractLane(lane);
            em.select();
          }
          em.f32Store(offset);
        }
      }
      vRetireOrReturn() {
        const em = this.em;
        if (this.vMaskDepth === 0) {
          em.return_();
          this.vTerminated = true;
          return;
        }
        em.localGet(this.vRetMask).localGet(this.vCur).v128Or().localSet(this.vRetMask);
        this.vZero();
        em.localSet(this.vCur);
        this.vTerminated = true;
      }
      vstmtBreak(brNode) {
        const target = this.vLoopStack[this.vLoopStack.length - 1];
        if (!target) throw this.astErrorOutput("break used outside of a loop", brNode);
        if (!target.varying) {
          this.brTo(target.breakLevel);
          this.vTerminated = true;
          return;
        }
        if (target.vBrk === -1) throw this.astErrorOutput("internal: loop exit scan missed a break", brNode);
        const em = this.em;
        em.localGet(target.vBrk).localGet(this.vCur).v128Or().localSet(target.vBrk);
        this.vZero();
        em.localSet(this.vCur);
        this.vTerminated = true;
      }
      vstmtContinue(crNode) {
        const target = this.vLoopStack[this.vLoopStack.length - 1];
        if (!target) throw this.astErrorOutput("continue used outside of a loop", crNode);
        if (!target.varying) {
          this.brTo(target.continueLevel);
          this.vTerminated = true;
          return;
        }
        if (target.vCnt === -1) throw this.astErrorOutput("internal: loop exit scan missed a continue", crNode);
        const em = this.em;
        em.localGet(target.vCnt).localGet(this.vCur).v128Or().localSet(target.vCnt);
        this.vZero();
        em.localSet(this.vCur);
        this.vTerminated = true;
      }
      vstmtFor(forNode) {
        if (forNode.type !== "ForStatement") throw this.astErrorOutput("Invalid for statement", forNode);
        const em = this.em;
        const varying = (forNode.test ? this.vInfo.exprVarying(forNode.test) : false) || this.vInfo.hasVaryingExit(forNode.body, false);
        const isSafe = this.forLoopIsSafe(forNode);
        if (forNode.init) if (forNode.init.type === "VariableDeclaration") this.vstmtVariableDeclaration(forNode.init); else this.vstatementExpression(forNode.init);
        if (!varying) {
          let safeI = -1;
          if (!isSafe) {
            safeI = em.addLocal("i32");
            em.i32Const(0).localSet(safeI);
          }
          this.enterBlock();
          const breakLevel = this.depth;
          this.enterLoop();
          const loopLevel = this.depth;
          if (!isSafe) {
            em.localGet(safeI).i32Const(this.loopMax).i32GeS();
            this.brIfTo(breakLevel);
          }
          if (forNode.test) {
            this.emitCondition(forNode.test);
            em.i32Eqz();
            this.brIfTo(breakLevel);
          }
          this.enterBlock();
          const continueLevel = this.depth;
          this.vLoopStack.push({
            varying: false,
            breakLevel: breakLevel,
            continueLevel: continueLevel
          });
          if (forNode.body) this.vstatementBody(forNode.body);
          this.vLoopStack.pop();
          this.exit();
          if (forNode.update) this.vstatementExpression(forNode.update);
          if (!isSafe) em.localGet(safeI).i32Const(1).i32Add().localSet(safeI);
          this.brTo(loopLevel);
          this.exit();
          this.exit();
          return;
        }
        const saved = em.addLocal("v128");
        em.localGet(this.vCur).localSet(saved);
        const vLive = em.addLocal("v128");
        em.localGet(this.vCur).localSet(vLive);
        const exits = this.vLoopBodyExits(forNode.body);
        let vBrk = -1;
        if (exits.hasBreak) {
          vBrk = em.addLocal("v128");
          this.vZero();
          em.localSet(vBrk);
        }
        const vCnt = exits.hasContinue ? em.addLocal("v128") : -1;
        let safeI = -1;
        if (!isSafe) {
          safeI = em.addLocal("i32");
          em.i32Const(0).localSet(safeI);
        }
        this.enterBlock();
        const breakLevel = this.depth;
        this.enterLoop();
        const loopLevel = this.depth;
        if (!isSafe) {
          em.localGet(safeI).i32Const(this.loopMax).i32GeS();
          this.brIfTo(breakLevel);
        }
        if (vBrk !== -1 || this.vRetMask !== -1) {
          em.localGet(vLive);
          if (vBrk !== -1) em.localGet(vBrk).v128Andnot();
          if (this.vRetMask !== -1) em.localGet(this.vRetMask).v128Andnot();
          em.localSet(vLive);
        }
        if (vCnt !== -1) {
          this.vZero();
          em.localSet(vCnt);
        }
        this.vMaskDepth++;
        em.localGet(vLive).localSet(this.vCur);
        if (forNode.test) {
          em.localGet(vLive);
          this.vexprMask(forNode.test);
          em.v128And().localSet(vLive);
        }
        em.localGet(vLive).v128AnyTrue().i32Eqz();
        this.brIfTo(breakLevel);
        em.localGet(vLive).localSet(this.vCur);
        this.vLoopStack.push({
          varying: true,
          vLive: vLive,
          vBrk: vBrk,
          vCnt: vCnt,
          breakLevel: breakLevel,
          loopLevel: loopLevel
        });
        if (forNode.body) this.vstatementBody(forNode.body);
        this.vLoopStack.pop();
        em.localGet(vLive);
        if (vBrk !== -1) em.localGet(vBrk).v128Andnot();
        if (this.vRetMask !== -1) em.localGet(this.vRetMask).v128Andnot();
        em.localSet(this.vCur);
        if (forNode.update) this.vstatementExpression(forNode.update);
        this.vMaskDepth--;
        if (!isSafe) em.localGet(safeI).i32Const(1).i32Add().localSet(safeI);
        this.brTo(loopLevel);
        this.exit();
        this.exit();
        this.vRecomputeCur(saved);
      }
      vstmtWhile(whileNode) {
        if (whileNode.type !== "WhileStatement") throw this.astErrorOutput("Invalid while statement", whileNode);
        const em = this.em;
        const varying = this.vInfo.exprVarying(whileNode.test) || this.vInfo.hasVaryingExit(whileNode.body, false);
        const safeI = em.addLocal("i32");
        em.i32Const(0).localSet(safeI);
        if (!varying) {
          this.enterBlock();
          const breakLevel = this.depth;
          this.enterLoop();
          const loopLevel = this.depth;
          em.localGet(safeI).i32Const(this.loopMax).i32GeS();
          this.brIfTo(breakLevel);
          this.emitCondition(whileNode.test);
          em.i32Eqz();
          this.brIfTo(breakLevel);
          this.enterBlock();
          const continueLevel = this.depth;
          this.vLoopStack.push({
            varying: false,
            breakLevel: breakLevel,
            continueLevel: continueLevel
          });
          this.vstatementBody(whileNode.body);
          this.vLoopStack.pop();
          this.exit();
          em.localGet(safeI).i32Const(1).i32Add().localSet(safeI);
          this.brTo(loopLevel);
          this.exit();
          this.exit();
          return;
        }
        const saved = em.addLocal("v128");
        em.localGet(this.vCur).localSet(saved);
        const vLive = em.addLocal("v128");
        em.localGet(this.vCur).localSet(vLive);
        const exits = this.vLoopBodyExits(whileNode.body);
        let vBrk = -1;
        if (exits.hasBreak) {
          vBrk = em.addLocal("v128");
          this.vZero();
          em.localSet(vBrk);
        }
        const vCnt = exits.hasContinue ? em.addLocal("v128") : -1;
        this.enterBlock();
        const breakLevel = this.depth;
        this.enterLoop();
        const loopLevel = this.depth;
        em.localGet(safeI).i32Const(this.loopMax).i32GeS();
        this.brIfTo(breakLevel);
        if (vBrk !== -1 || this.vRetMask !== -1) {
          em.localGet(vLive);
          if (vBrk !== -1) em.localGet(vBrk).v128Andnot();
          if (this.vRetMask !== -1) em.localGet(this.vRetMask).v128Andnot();
          em.localSet(vLive);
        }
        if (vCnt !== -1) {
          this.vZero();
          em.localSet(vCnt);
        }
        this.vMaskDepth++;
        em.localGet(vLive).localSet(this.vCur);
        em.localGet(vLive);
        this.vexprMask(whileNode.test);
        em.v128And().localSet(vLive);
        em.localGet(vLive).v128AnyTrue().i32Eqz();
        this.brIfTo(breakLevel);
        em.localGet(vLive).localSet(this.vCur);
        this.vLoopStack.push({
          varying: true,
          vLive: vLive,
          vBrk: vBrk,
          vCnt: vCnt,
          breakLevel: breakLevel,
          loopLevel: loopLevel
        });
        this.vstatementBody(whileNode.body);
        this.vLoopStack.pop();
        this.vMaskDepth--;
        em.localGet(safeI).i32Const(1).i32Add().localSet(safeI);
        this.brTo(loopLevel);
        this.exit();
        this.exit();
        this.vRecomputeCur(saved);
      }
      vstmtDoWhile(doWhileNode) {
        if (doWhileNode.type !== "DoWhileStatement") throw this.astErrorOutput("Invalid while statement", doWhileNode);
        const em = this.em;
        const varying = this.vInfo.exprVarying(doWhileNode.test) || this.vInfo.hasVaryingExit(doWhileNode.body, false);
        const safeI = em.addLocal("i32");
        em.i32Const(0).localSet(safeI);
        if (!varying) {
          this.enterBlock();
          const breakLevel = this.depth;
          this.enterLoop();
          const loopLevel = this.depth;
          em.localGet(safeI).i32Const(this.loopMax).i32GeS();
          this.brIfTo(breakLevel);
          this.enterBlock();
          const continueLevel = this.depth;
          this.vLoopStack.push({
            varying: false,
            breakLevel: breakLevel,
            continueLevel: continueLevel
          });
          this.vstatementBody(doWhileNode.body);
          this.vLoopStack.pop();
          this.exit();
          em.localGet(safeI).i32Const(1).i32Add().localSet(safeI);
          this.emitCondition(doWhileNode.test);
          this.brIfTo(loopLevel);
          this.exit();
          this.exit();
          return;
        }
        const saved = em.addLocal("v128");
        em.localGet(this.vCur).localSet(saved);
        const vLive = em.addLocal("v128");
        em.localGet(this.vCur).localSet(vLive);
        const exits = this.vLoopBodyExits(doWhileNode.body);
        let vBrk = -1;
        if (exits.hasBreak) {
          vBrk = em.addLocal("v128");
          this.vZero();
          em.localSet(vBrk);
        }
        const vCnt = exits.hasContinue ? em.addLocal("v128") : -1;
        this.enterBlock();
        const breakLevel = this.depth;
        this.enterLoop();
        const loopLevel = this.depth;
        em.localGet(safeI).i32Const(this.loopMax).i32GeS();
        this.brIfTo(breakLevel);
        if (vBrk !== -1 || this.vRetMask !== -1) {
          em.localGet(vLive);
          if (vBrk !== -1) em.localGet(vBrk).v128Andnot();
          if (this.vRetMask !== -1) em.localGet(this.vRetMask).v128Andnot();
          em.localSet(vLive);
        }
        if (vCnt !== -1) {
          this.vZero();
          em.localSet(vCnt);
        }
        this.vMaskDepth++;
        em.localGet(vLive).localSet(this.vCur);
        this.vLoopStack.push({
          varying: true,
          vLive: vLive,
          vBrk: vBrk,
          vCnt: vCnt,
          breakLevel: breakLevel,
          loopLevel: loopLevel
        });
        this.vstatementBody(doWhileNode.body);
        this.vLoopStack.pop();
        if (vBrk !== -1 || this.vRetMask !== -1) {
          em.localGet(vLive);
          if (vBrk !== -1) em.localGet(vBrk).v128Andnot();
          if (this.vRetMask !== -1) em.localGet(this.vRetMask).v128Andnot();
          em.localSet(vLive);
        }
        em.localGet(vLive).localSet(this.vCur);
        em.localGet(vLive);
        this.vexprMask(doWhileNode.test);
        em.v128And().localSet(vLive);
        this.vMaskDepth--;
        em.localGet(safeI).i32Const(1).i32Add().localSet(safeI);
        em.localGet(vLive).v128AnyTrue();
        this.brIfTo(loopLevel);
        this.exit();
        this.exit();
        this.vRecomputeCur(saved);
      }
      vstmtSwitch(ast) {
        if (ast.type !== "SwitchStatement") throw this.astErrorOutput("Invalid switch statement", ast);
        const {discriminant: discriminant, cases: cases} = ast;
        const em = this.em;
        const varying = this.vInfo.exprVarying(discriminant) || cases.some(c => c.test && this.vInfo.exprVarying(c.test));
        const type = this.getType(discriminant);
        if (!varying) {
          let dLocal;
          let dIsInt;
          switch (type) {
           case "Float":
           case "Number":
            dIsInt = false;
            dLocal = em.addLocal("f32");
            this.coerce(this.expression(discriminant), "f32");
            em.localSet(dLocal);
            break;

           case "Integer":
            dIsInt = true;
            dLocal = em.addLocal("i32");
            this.coerce(this.expression(discriminant), "i32");
            em.localSet(dLocal);
            break;

           default:
            throw this.astErrorOutput(`Unhandled switch discriminant type "${type}"`, ast);
          }
          if (cases.length === 1 && !cases[0].test) {
            this.vEmitSwitchConsequent(cases[0].consequent);
            return;
          }
          const {groups: groups, defaultConsequent: defaultConsequent} = this.collectSwitchGroups(cases);
          const emitChain = index => {
            if (index === groups.length) {
              if (defaultConsequent) this.vEmitSwitchConsequent(defaultConsequent);
              return;
            }
            const {tests: tests, consequent: consequent} = groups[index];
            for (let i = 0; i < tests.length; i++) {
              em.localGet(dLocal);
              this.emitSwitchTest(tests[i], dIsInt);
              if (dIsInt) em.i32Eq(); else em.f32Eq();
              if (i > 0) em.i32Or();
            }
            this.enterIf();
            this.vEmitSwitchConsequent(consequent);
            if (index + 1 < groups.length || defaultConsequent) {
              em.else_();
              emitChain(index + 1);
            }
            this.exit();
          };
          emitChain(0);
          return;
        }
        let dLocal;
        let dIsInt;
        switch (type) {
         case "Float":
         case "Number":
          dIsInt = false;
          dLocal = em.addLocal("v128");
          this.vCoerce(this.vexpr(discriminant), "vf32");
          em.localSet(dLocal);
          break;

         case "Integer":
          dIsInt = true;
          dLocal = em.addLocal("v128");
          this.vCoerce(this.vexpr(discriminant), "vi32");
          em.localSet(dLocal);
          break;

         default:
          throw this.astErrorOutput(`Unhandled switch discriminant type "${type}"`, ast);
        }
        if (cases.length === 1 && !cases[0].test) {
          this.vEmitSwitchConsequent(cases[0].consequent);
          return;
        }
        const {groups: groups, defaultConsequent: defaultConsequent} = this.collectSwitchGroups(cases);
        const saved = em.addLocal("v128");
        em.localGet(this.vCur).localSet(saved);
        const prior = em.addLocal("v128");
        this.vZero();
        em.localSet(prior);
        const gm = em.addLocal("v128");
        this.vMaskDepth++;
        for (let g = 0; g < groups.length; g++) {
          const {tests: tests, consequent: consequent} = groups[g];
          for (let i = 0; i < tests.length; i++) {
            em.localGet(dLocal);
            this.vEmitSwitchTest(tests[i], dIsInt);
            if (dIsInt) em.i32x4Eq(); else em.f32x4Eq();
            if (i > 0) em.v128Or();
          }
          em.localSet(gm);
          this.vRecomputeCur(saved);
          em.localGet(this.vCur).localGet(gm).v128And().localGet(prior).v128Andnot().localSet(this.vCur);
          em.localGet(prior).localGet(gm).v128Or().localSet(prior);
          em.localGet(this.vCur).v128AnyTrue();
          this.enterIf();
          this.vEmitSwitchConsequent(consequent);
          this.exit();
        }
        if (defaultConsequent) {
          this.vRecomputeCur(saved);
          em.localGet(this.vCur).localGet(prior).v128Andnot().localSet(this.vCur);
          em.localGet(this.vCur).v128AnyTrue();
          this.enterIf();
          this.vEmitSwitchConsequent(defaultConsequent);
          this.exit();
        }
        this.vMaskDepth--;
        this.vRecomputeCur(saved);
      }
      vEmitSwitchTest(test, dIsInt) {
        const testType = this.getType(test);
        if (dIsInt) if (testType === "Number" || testType === "Float") this.vCastValueToInteger(test); else if (testType === "LiteralInteger") this.vCastLiteralToInteger(test); else this.vCoerce(this.vexpr(test), "vi32"); else if (testType === "LiteralInteger") this.vCastLiteralToFloat(test); else if (testType === "Integer") this.vCastValueToFloat(test); else this.vCoerce(this.vexpr(test), "vf32");
      }
      vEmitSwitchConsequent(consequent) {
        const statements = this.collectSwitchCaseStatements(consequent);
        const previous = this.vTerminated;
        this.vTerminated = false;
        for (let i = 0; i < statements.length; i++) {
          this.vstatement(statements[i]);
          if (this.vTerminated) break;
        }
        this.vTerminated = previous;
      }
      vexpr(ast) {
        if (!this.vInfo.exprVarying(ast)) return this.expression(ast);
        switch (ast.type) {
         case "Identifier":
          return this.vexprIdentifier(ast);

         case "BinaryExpression":
          return this.vexprBinary(ast);

         case "LogicalExpression":
          return this.vexprLogical(ast);

         case "UnaryExpression":
          return this.vexprUnary(ast);

         case "UpdateExpression":
          return this.vUpdate(ast, false);

         case "ConditionalExpression":
          return this.vexprConditional(ast);

         case "CallExpression":
          return this.vexprCall(ast);

         case "MemberExpression":
          return this.vexprMember(ast);

         case "SequenceExpression":
          if (ast.expressions.length === 1) return this.vexpr(ast.expressions[0]);
          throw this.astErrorOutput("WebAssembly backend does not yet support the comma operator", ast);

         case "AssignmentExpression":
          throw this.astErrorOutput("WebAssembly backend does not yet support assignment used as an expression", ast);

         default:
          throw this.astErrorOutput(`Unknown expression type ${ast.type}`, ast);
        }
      }
      vexprIdentifier(ast) {
        const local = this.locals.get(ast.name);
        if (!local) throw this.astErrorOutput(`Unhandled varying identifier "${ast.name}"`, ast);
        if (local.kind === "vvec") throw this.astErrorOutput(`array-valued variable "${ast.name}" can only be indexed or returned`, ast);
        if (local.kind !== "vscalar") throw this.astErrorOutput(`internal: varying read of uniform local "${ast.name}"`, ast);
        this.em.localGet(local.index);
        return local.wtype;
      }
      vexprBinary(ast) {
        const operator = ast.operator;
        const em = this.em;
        if (operator === "**") {
          const a = em.addLocal("v128");
          const b = em.addLocal("v128");
          this.vEmitByType(ast.left, "vf32");
          em.localSet(a);
          this.vEmitByType(ast.right, "vf32");
          em.localSet(b);
          this.usedMathImports.add("pow");
          this.vLaneCall2("math_pow", a, b);
          return "vf32";
        }
        if (BITWISE_OPS[operator]) {
          if (VECTOR_SHIFT_OPS[operator]) return this.vexprShift(ast);
          this.vEmitAsIntegerOperand(ast.left);
          this.vEmitAsIntegerOperand(ast.right);
          em[{
            "&": "v128And",
            "|": "v128Or",
            "^": "v128Xor"
          }[operator]]();
          return "vi32";
        }
        if (operator === "/" || operator === "%") {
          if (operator === "/") {
            this.vEmitByType(ast.left, "vf32");
            this.vEmitByType(ast.right, "vf32");
            em.f32x4Div();
            return "vf32";
          }
          const a = em.addLocal("v128");
          const b = em.addLocal("v128");
          this.vEmitByType(ast.left, "vf32");
          em.localSet(a);
          this.vEmitByType(ast.right, "vf32");
          em.localSet(b);
          em.localGet(a).localGet(a).localGet(b).f32x4Div().f32x4Trunc().localGet(b).f32x4Mul().f32x4Sub();
          return "vf32";
        }
        const leftType = this.getType(ast.left) || "Number";
        const rightType = this.getType(ast.right) || "Number";
        const key = leftType + " & " + rightType;
        let category;
        switch (key) {
         case "Integer & Integer":
          this.pushState("building-integer");
          this.vCoerce(this.vexpr(ast.left), "vi32");
          this.vCoerce(this.vexpr(ast.right), "vi32");
          this.popState("building-integer");
          category = "vi32";
          break;

         case "Number & Float":
         case "Float & Number":
         case "Float & Float":
         case "Number & Number":
          this.pushState("building-float");
          this.vCoerce(this.vexpr(ast.left), "vf32");
          this.vCoerce(this.vexpr(ast.right), "vf32");
          this.popState("building-float");
          category = "vf32";
          break;

         case "LiteralInteger & LiteralInteger":
          if (this.isState("casting-to-integer") || this.isState("building-integer")) {
            this.pushState("building-integer");
            this.vCoerce(this.vexpr(ast.left), "vi32");
            this.vCoerce(this.vexpr(ast.right), "vi32");
            this.popState("building-integer");
            category = "vi32";
          } else {
            this.pushState("building-float");
            this.vCastLiteralToFloat(ast.left);
            this.vCastLiteralToFloat(ast.right);
            this.popState("building-float");
            category = "vf32";
          }
          break;

         case "Integer & Float":
         case "Integer & Number":
          this.pushState("building-float");
          this.vCastValueToFloat(ast.left);
          this.vCoerce(this.vexpr(ast.right), "vf32");
          this.popState("building-float");
          category = "vf32";
          break;

         case "Integer & LiteralInteger":
          this.pushState("building-integer");
          this.vCoerce(this.vexpr(ast.left), "vi32");
          this.vCastLiteralToInteger(ast.right);
          this.popState("building-integer");
          category = "vi32";
          break;

         case "Number & Integer":
         case "Float & Integer":
          this.pushState("building-float");
          this.vCoerce(this.vexpr(ast.left), "vf32");
          this.vCastValueToFloat(ast.right);
          this.popState("building-float");
          category = "vf32";
          break;

         case "Float & LiteralInteger":
         case "Number & LiteralInteger":
          this.pushState("building-float");
          this.vCoerce(this.vexpr(ast.left), "vf32");
          this.vCastLiteralToFloat(ast.right);
          this.popState("building-float");
          category = "vf32";
          break;

         case "LiteralInteger & Float":
         case "LiteralInteger & Number":
          if (this.isState("casting-to-integer")) {
            this.pushState("building-integer");
            this.vCastLiteralToInteger(ast.left);
            this.vCastValueToInteger(ast.right);
            this.popState("building-integer");
            category = "vi32";
          } else {
            this.pushState("building-float");
            this.vCastLiteralToFloat(ast.left);
            this.pushState("casting-to-float");
            this.vCoerce(this.vexpr(ast.right), "vf32");
            this.popState("casting-to-float");
            this.popState("building-float");
            category = "vf32";
          }
          break;

         case "LiteralInteger & Integer":
          this.pushState("building-integer");
          this.vCastLiteralToInteger(ast.left);
          this.vCoerce(this.vexpr(ast.right), "vi32");
          this.popState("building-integer");
          category = "vi32";
          break;

         case "Boolean & Boolean":
          this.vCoerce(this.vexpr(ast.left), "vi32");
          this.vCoerce(this.vexpr(ast.right), "vi32");
          category = "vi32";
          break;

         default:
          throw this.astErrorOutput(`Unhandled binary expression between ${key}`, ast);
        }
        const compareOp = category === "vi32" ? VI32_COMPARE[operator] : VF32_COMPARE[operator];
        if (compareOp) {
          em[compareOp]();
          return "vbool";
        }
        const arithOp = category === "vi32" ? VI32_ARITH[operator] : VF32_ARITH[operator];
        if (!arithOp) throw this.astErrorOutput(`Unhandled operator ${operator}`, ast);
        em[arithOp]();
        return category;
      }
      vexprShift(ast) {
        const em = this.em;
        this.vEmitAsIntegerOperand(ast.left);
        if (!this.vInfo.exprVarying(ast.right)) {
          this.emitAsIntegerOperand(ast.right);
          em[VECTOR_SHIFT_OPS[ast.operator]]();
          return "vi32";
        }
        const a = em.addLocal("v128");
        const b = em.addLocal("v128");
        em.localSet(a);
        this.vEmitAsIntegerOperand(ast.right);
        em.localSet(b);
        const op = BITWISE_OPS[ast.operator];
        for (let lane = 0; lane < 4; lane++) {
          em.localGet(a).i32x4ExtractLane(lane);
          em.localGet(b).i32x4ExtractLane(lane);
          em[op]();
          if (lane === 0) em.i32x4Splat(); else em.i32x4ReplaceLane(lane);
        }
        return "vi32";
      }
      vEmitAsIntegerOperand(side) {
        switch (this.getType(side)) {
         case "Number":
         case "Float":
          this.vCastValueToInteger(side);
          break;

         case "LiteralInteger":
          this.vCastLiteralToInteger(side);
          break;

         default:
          {
            this.pushState("building-integer");
            const type = this.vexpr(side);
            this.popState("building-integer");
            this.vCoerce(type, "vi32");
          }
        }
      }
      vexprLogical(ast) {
        const em = this.em;
        const mLeft = em.addLocal("v128");
        this.vexprMask(ast.left);
        em.localSet(mLeft);
        const saved = em.addLocal("v128");
        em.localGet(this.vCur).localSet(saved);
        em.localGet(this.vCur).localGet(mLeft);
        if (ast.operator === "&&") em.v128And(); else if (ast.operator === "||") em.v128Andnot(); else throw this.astErrorOutput(`Unhandled logical operator ${ast.operator}`, ast);
        em.localSet(this.vCur);
        this.vMaskDepth++;
        this.vexprMask(ast.right);
        this.vMaskDepth--;
        em.localGet(saved).localSet(this.vCur);
        em.localGet(mLeft);
        if (ast.operator === "&&") em.v128And(); else em.v128Or();
        return "vbool";
      }
      vexprUnary(ast) {
        const em = this.em;
        switch (ast.operator) {
         case "~":
          this.vEmitAsIntegerOperand(ast.argument);
          em.v128ConstI32x4(-1, -1, -1, -1).v128Xor();
          return "vi32";

         case "!":
          this.vexprMask(ast.argument);
          em.v128Not();
          return "vbool";

         case "+":
          return this.vexpr(ast.argument);

         case "-":
          {
            const type = this.getType(ast.argument);
            if (type === "Integer" || type === "LiteralInteger" && (this.isState("casting-to-integer") || this.isState("building-integer"))) {
              this.vZero();
              this.vEmitByType(ast.argument, "vi32");
              em.i32x4Sub();
              return "vi32";
            }
            this.vEmitByType(ast.argument, "vf32");
            em.f32x4Neg();
            return "vf32";
          }

         default:
          throw this.astErrorOutput(`Unhandled unary operator ${ast.operator}`, ast);
        }
      }
      vexprConditional(ast) {
        const em = this.em;
        const consequentType = this.getType(ast.consequent);
        const alternateType = this.getType(ast.alternate);
        if (consequentType === null && alternateType === null) {
          this.vTernaryStatement(ast);
          return "void";
        }
        let targetType = consequentType === "LiteralInteger" ? "Number" : consequentType;
        if (targetType === "Integer" && (alternateType === "Number" || alternateType === "Float")) targetType = "Number";
        const emitBranch = branch => {
          const branchType = this.getType(branch);
          switch (targetType) {
           case "Number":
           case "Float":
            if (branchType === "Integer") this.vCastValueToFloat(branch); else if (branchType === "LiteralInteger") this.vCastLiteralToFloat(branch); else this.vCoerce(this.vexpr(branch), "vf32");
            break;

           case "Integer":
            if (branchType === "Number" || branchType === "Float") this.vCastValueToInteger(branch); else if (branchType === "LiteralInteger") this.vCastLiteralToInteger(branch); else this.vCoerce(this.vexpr(branch), "vi32");
            break;

           case "Boolean":
            this.vexprMask(branch);
            break;

           default:
            throw this.astErrorOutput(`WebAssembly backend does not yet support a ternary of type ${targetType}`, ast);
          }
        };
        const resultCategory = targetType === "Integer" ? "vi32" : targetType === "Boolean" ? "vbool" : "vf32";
        if (!this.vInfo.exprVarying(ast.test)) {
          this.emitCondition(ast.test);
          this.enterIf("v128");
          emitBranch(ast.consequent);
          em.else_();
          emitBranch(ast.alternate);
          this.exit();
          return resultCategory;
        }
        const m = em.addLocal("v128");
        this.vexprMask(ast.test);
        em.localSet(m);
        const saved = em.addLocal("v128");
        em.localGet(this.vCur).localSet(saved);
        const v1 = em.addLocal("v128");
        const v2 = em.addLocal("v128");
        em.localGet(saved).localGet(m).v128And().localSet(this.vCur);
        this.vMaskDepth++;
        emitBranch(ast.consequent);
        em.localSet(v1);
        em.localGet(saved).localGet(m).v128Andnot().localSet(this.vCur);
        emitBranch(ast.alternate);
        em.localSet(v2);
        this.vMaskDepth--;
        em.localGet(saved).localSet(this.vCur);
        em.localGet(v1).localGet(v2).localGet(m).v128Bitselect();
        return resultCategory;
      }
      vTernaryStatement(ast) {
        const em = this.em;
        if (!this.vInfo.exprVarying(ast.test)) {
          this.emitCondition(ast.test);
          this.enterIf();
          this.vstatementExpression(ast.consequent);
          em.else_();
          this.vstatementExpression(ast.alternate);
          this.exit();
          return;
        }
        const m = em.addLocal("v128");
        this.vexprMask(ast.test);
        em.localSet(m);
        const saved = em.addLocal("v128");
        em.localGet(this.vCur).localSet(saved);
        em.localGet(saved).localGet(m).v128And().localSet(this.vCur);
        this.vMaskDepth++;
        this.vstatementExpression(ast.consequent);
        em.localGet(saved).localGet(m).v128Andnot().localSet(this.vCur);
        this.vstatementExpression(ast.alternate);
        this.vMaskDepth--;
        em.localGet(saved).localSet(this.vCur);
      }
      vexprCall(ast) {
        if (!ast.callee) throw this.astErrorOutput("Unknown CallExpression", ast);
        if (ast.callee.type === "MemberExpression" && this.getVariableSignature(ast.callee, true) === "this.color") throw this.astErrorOutput("WebAssembly backend does not yet support graphical mode (this.color)", ast);
        let functionName = null;
        const isMathFunction = this.isAstMathFunction(ast);
        if (isMathFunction || ast.callee.object && ast.callee.object.type === "ThisExpression") functionName = ast.callee.property.name; else if (ast.callee.type === "SequenceExpression" && ast.callee.expressions[0].type === "Literal" && !isNaN(ast.callee.expressions[0].raw)) functionName = ast.callee.expressions[1].property.name; else functionName = ast.callee.name;
        if (!functionName) throw this.astErrorOutput(`Unhandled function, couldn't find name`, ast);
        if (isMathFunction) return this.vMathCall(functionName, ast);
        return this.vUserCall(functionName, ast);
      }
      vUserCall(functionName, ast) {
        const em = this.em;
        const info = this.assembler.helperInfo || {
          readsThread: false,
          usesRandom: false
        };
        const globals = this.assembler.globals;
        const returnType = this.getType(ast);
        const targetTypes = this.lookupFunctionArgumentTypes(functionName) || [];
        const argLocals = [];
        for (let i = 0; i < ast.arguments.length; ++i) {
          const argument = ast.arguments[i];
          let targetType = targetTypes[i];
          const argumentType = this.getType(argument);
          if (!targetType) {
            this.triggerImplyArgumentType(functionName, i, argumentType, this);
            targetType = argumentType;
          }
          let wtype;
          switch (argumentType) {
           case "Boolean":
            this.vCoerce(this.vexpr(argument), "vi32");
            wtype = "vi32";
            break;

           case "Number":
           case "Float":
            if (targetType === "Integer") {
              this.vCastValueToInteger(argument);
              wtype = "vi32";
            } else {
              this.vCoerce(this.vexpr(argument), "vf32");
              wtype = "vf32";
            }
            break;

           case "Integer":
            if (targetType === "Number" || targetType === "Float") {
              this.vCastValueToFloat(argument);
              wtype = "vf32";
            } else {
              this.vCoerce(this.vexpr(argument), "vi32");
              wtype = "vi32";
            }
            break;

           case "LiteralInteger":
            if (targetType === "Integer") {
              this.vCastLiteralToInteger(argument);
              wtype = "vi32";
            } else {
              this.vCastLiteralToFloat(argument);
              wtype = "vf32";
            }
            break;

           default:
            throw this.astErrorOutput("WebAssembly backend does not yet support array arguments to helper functions", ast);
          }
          const index = em.addLocal("v128");
          em.localSet(index);
          argLocals.push({
            index: index,
            wtype: wtype
          });
        }
        const resultKind = returnType === null || returnType === void 0 ? "void" : returnType === "Integer" || returnType === "Boolean" ? "i32" : "f32";
        const resultTmp = resultKind === "void" ? -1 : em.addLocal(resultKind);
        const resultVec = resultKind === "void" ? -1 : em.addLocal("v128");
        let stateTmp = -1;
        if (info.usesRandom) {
          stateTmp = em.addLocal("v128");
          em.globalGet(globals.pcgStateV).localSet(stateTmp);
        }
        for (let lane = 0; lane < 4; lane++) {
          if (info.readsThread) {
            em.localGet(this._vBaseX);
            if (lane > 0) em.i32Const(lane).i32Add();
            em.globalSet(globals.threadX);
          }
          if (info.usesRandom) em.localGet(stateTmp).i32x4ExtractLane(lane).globalSet(globals.pcgState);
          for (const arg of argLocals) {
            em.localGet(arg.index);
            if (arg.wtype === "vi32") em.i32x4ExtractLane(lane); else em.f32x4ExtractLane(lane);
          }
          em.call(this.mangleFunctionName(functionName));
          if (resultKind !== "void") em.localSet(resultTmp);
          if (info.usesRandom) em.localGet(stateTmp).globalGet(globals.pcgState).i32x4ReplaceLane(lane).localSet(stateTmp);
          if (resultKind !== "void") if (lane === 0) {
            em.localGet(resultTmp);
            if (resultKind === "i32") em.i32x4Splat(); else em.f32x4Splat();
            em.localSet(resultVec);
          } else {
            em.localGet(resultVec).localGet(resultTmp);
            if (resultKind === "i32") em.i32x4ReplaceLane(lane); else em.f32x4ReplaceLane(lane);
            em.localSet(resultVec);
          }
        }
        if (info.readsThread) em.localGet(this._vBaseX).globalSet(globals.threadX);
        if (info.usesRandom) {
          em.localGet(stateTmp).globalGet(globals.pcgStateV);
          if (this.vMaskDepth > 0) em.localGet(this.vCur); else em.v128ConstI32x4(-1, -1, -1, -1);
          em.v128Bitselect().globalSet(globals.pcgStateV);
        }
        if (resultKind === "void") return "void";
        em.localGet(resultVec);
        return resultKind === "i32" ? "vi32" : "vf32";
      }
      vMathCall(functionName, ast) {
        const em = this.em;
        if (functionName === "random") {
          this.usesRandom = true;
          if (this.vMaskDepth > 0) em.localGet(this.vCur); else em.v128ConstI32x4(-1, -1, -1, -1);
          em.call("pcg_random_v");
          return "vf32";
        }
        const emitArg = argument => {
          switch (this.getType(argument)) {
           case "Integer":
            this.vCastValueToFloat(argument);
            break;

           case "LiteralInteger":
            this.vCastLiteralToFloat(argument);
            break;

           default:
            this.vCoerce(this.vexpr(argument), "vf32");
          }
        };
        const nativeOp = VECTOR_MATH_NATIVE_OPS[functionName];
        if (nativeOp) {
          emitArg(ast.arguments[0]);
          em[nativeOp]();
          return "vf32";
        }
        switch (functionName) {
         case "round":
          emitArg(ast.arguments[0]);
          em.v128ConstF32x4(.5, .5, .5, .5).f32x4Add().f32x4Floor();
          return "vf32";

         case "fround":
          emitArg(ast.arguments[0]);
          return "vf32";

         case "min":
         case "max":
          {
            const op = functionName === "min" ? "f32x4Min" : "f32x4Max";
            emitArg(ast.arguments[0]);
            for (let i = 1; i < ast.arguments.length; i++) {
              emitArg(ast.arguments[i]);
              em[op]();
            }
            return "vf32";
          }

         case "imul":
          emitArg(ast.arguments[0]);
          em.i32x4TruncSatF32x4S();
          emitArg(ast.arguments[1]);
          em.i32x4TruncSatF32x4S();
          em.i32x4Mul().f32x4ConvertI32x4S();
          return "vf32";

         case "clz32":
          {
            emitArg(ast.arguments[0]);
            em.i32x4TruncSatF32x4U();
            const t = em.addLocal("v128");
            em.localSet(t);
            em.localGet(t).i32x4ExtractLane(0).i32Clz().i32x4Splat();
            for (let lane = 1; lane < 4; lane++) em.localGet(t).i32x4ExtractLane(lane).i32Clz().i32x4ReplaceLane(lane);
            em.f32x4ConvertI32x4S();
            return "vf32";
          }

         default:
          {
            const arity = MATH_IMPORT_ARITY[functionName];
            if (!arity) throw this.astErrorOutput(`WebAssembly backend does not yet support Math.${functionName}`, ast);
            this.usedMathImports.add(functionName);
            if (arity === 1) {
              emitArg(ast.arguments[0]);
              const t = em.addLocal("v128");
              em.localSet(t);
              this.vLaneCall1("math_" + functionName, t);
            } else {
              const a = em.addLocal("v128");
              const b = em.addLocal("v128");
              emitArg(ast.arguments[0]);
              em.localSet(a);
              emitArg(ast.arguments[1]);
              em.localSet(b);
              this.vLaneCall2("math_" + functionName, a, b);
            }
            return "vf32";
          }
        }
      }
      vLaneCall1(name, argLocal) {
        const em = this.em;
        em.localGet(argLocal).f32x4ExtractLane(0).call(name).f32x4Splat();
        for (let lane = 1; lane < 4; lane++) em.localGet(argLocal).f32x4ExtractLane(lane).call(name).f32x4ReplaceLane(lane);
      }
      vLaneCall2(name, aLocal, bLocal) {
        const em = this.em;
        em.localGet(aLocal).f32x4ExtractLane(0).localGet(bLocal).f32x4ExtractLane(0).call(name).f32x4Splat();
        for (let lane = 1; lane < 4; lane++) em.localGet(aLocal).f32x4ExtractLane(lane).localGet(bLocal).f32x4ExtractLane(lane).call(name).f32x4ReplaceLane(lane);
      }
      vexprMember(mNode) {
        const details = this.getMemberExpressionDetails(mNode);
        if (!details) throw this.astErrorOutput("Unexpected expression", mNode);
        const {signature: signature, name: name, property: property, xProperty: xProperty, yProperty: yProperty, zProperty: zProperty} = details;
        const em = this.em;
        switch (signature) {
         case "value.thread.value":
         case "this.thread.value":
          if (name !== "x") throw this.astErrorOutput(`internal: thread.${name} is uniform along the lane axis`, mNode);
          this.readsThread = true;
          em.globalGet(this.assembler.globals.threadX).i32x4Splat();
          em.v128ConstI32x4(0, 1, 2, 3).i32x4Add();
          return "vi32";

         case "value.value":
          {
            const component = {
              r: 0,
              g: 1,
              b: 2,
              a: 3
            }[property];
            if (component !== void 0) {
              const local = this.locals.get(name);
              if (local && local.kind === "vvec" && component < local.n) {
                em.localGet(local.indices[component]);
                return "vf32";
              }
            }
            throw this.astErrorOutput("Unexpected expression", mNode);
          }

         case "value[]":
         case "value[][]":
         case "value[][][]":
         case "value[][][][]":
          {
            const local = this.locals.get(name);
            if (local && (local.kind === "vec" || local.kind === "vvec")) {
              if (signature !== "value[]") throw this.astErrorOutput("Unexpected expression", mNode);
              return this.vVecIndex(local, xProperty);
            }
            return this.vGather("arrays", name, xProperty, yProperty, zProperty, mNode);
          }

         case "this.constants.value[]":
         case "this.constants.value[][]":
         case "this.constants.value[][][]":
         case "this.constants.value[][][][]":
          return this.vGather("constantArrays", name, xProperty, yProperty, zProperty, mNode);

         case "fn()[]":
          throw this.astErrorOutput("WebAssembly backend does not yet support indexing a function call result", mNode);

         default:
          throw this.astErrorOutput(`WebAssembly backend does not yet support expression signature "${signature}"`, mNode);
        }
      }
      vVecIndex(local, xProperty) {
        const em = this.em;
        const getComponent = k => {
          em.localGet(local.indices[k]);
          if (local.kind === "vec") em.f32x4Splat();
        };
        if (xProperty.type === "Literal" && Number.isInteger(xProperty.value)) {
          if (xProperty.value < 0 || xProperty.value >= local.n) throw this.astErrorOutput(`index ${xProperty.value} out of range for Array(${local.n})`, xProperty);
          getComponent(xProperty.value);
          return "vf32";
        }
        const idx = em.addLocal("v128");
        this.vEmitIndex(xProperty);
        em.localSet(idx);
        const acc = em.addLocal("v128");
        getComponent(0);
        em.localSet(acc);
        for (let k = 1; k < local.n; k++) {
          getComponent(k);
          em.localGet(acc);
          em.localGet(idx).v128ConstI32x4(k, k, k, k).i32x4Eq();
          em.v128Bitselect();
          em.localSet(acc);
        }
        em.localGet(acc);
        return "vf32";
      }
      vEmitIndex(property) {
        if (!property) throw new Error("Property not set");
        switch (this.getType(property)) {
         case "Number":
         case "Float":
          this.vCastValueToInteger(property);
          return;

         case "LiteralInteger":
          this.vCastLiteralToInteger(property);
          return;

         case "Integer":
          {
            this.pushState("building-integer");
            const emitted = this.vexpr(property);
            this.popState("building-integer");
            this.vCoerce(emitted, "vi32");
            return;
          }

         default:
          this.vCoerce(this.vexpr(property), "vi32");
        }
      }
      vGather(table, name, xProperty, yProperty, zProperty, mNode) {
        const em = this.em;
        const layout = this.assembler.layout[table][name];
        if (!layout) throw this.astErrorOutput(`no memory layout for "${name}" \u2014 arrays are only readable as kernel arguments or constants`, mNode);
        this.vEmitIndex(xProperty);
        if (yProperty) {
          this.vEmitIndex(yProperty);
          const d = layout.dims[0];
          em.v128ConstI32x4(d, d, d, d).i32x4Mul().i32x4Add();
        }
        if (zProperty) {
          this.vEmitIndex(zProperty);
          const d = layout.dims[0] * layout.dims[1];
          em.v128ConstI32x4(d, d, d, d).i32x4Mul().i32x4Add();
        }
        this.vZero();
        em.i32x4MaxS();
        const max = layout.flatLength - 1;
        em.v128ConstI32x4(max, max, max, max).i32x4MinS();
        const idx = em.addLocal("v128");
        em.localSet(idx);
        em.localGet(idx).i32x4ExtractLane(0).i32Const(2).i32Shl().f32Load(layout.offset).f32x4Splat();
        for (let lane = 1; lane < 4; lane++) em.localGet(idx).i32x4ExtractLane(lane).i32Const(2).i32Shl().f32Load(layout.offset).f32x4ReplaceLane(lane);
        return "vf32";
      }
      isThreadDependent(ast) {
        if (!ast || typeof ast !== "object") return false;
        if (Array.isArray(ast)) return ast.some(node => this.isThreadDependent(node));
        switch (ast.type) {
         case "MemberExpression":
          {
            const signature = this.getVariableSignature(ast);
            if (signature === "this.thread.value" || signature === "value.thread.value") return ast.property.name === "x";
            break;
          }

         case "CallExpression":
          if (this.isAstMathFunction(ast)) {
            if (ast.callee.property.name === "random") return true;
            break;
          }
          return true;

         case "Identifier":
          return this.taintedLocals ? this.taintedLocals.has(ast.name) : false;

         case "ThisExpression":
          return false;
        }
        for (const key in ast) {
          if (key === "loc" || key === "start" || key === "end" || key === "parent") continue;
          const child = ast[key];
          if (child && typeof child === "object" && this.isThreadDependent(child)) return true;
        }
        return false;
      }
      recordUniformity(kind, testAst) {
        if (!this._analysisPass) return;
        this.uniformity.push({
          kind: kind,
          threadDependent: testAst ? this.isThreadDependent(testAst) : true
        });
      }
    };
    module.exports = {
      WebAssemblyFunctionNode: WebAssemblyFunctionNode
    };
  });
  var require_worker_pool = __commonJSMin((exports, module) => {
    let os = null;
    try {
      os = require_empty_module();
    } catch (e) {}
    const IS_BROWSER_WORKER = typeof Worker === "function";
    function defaultConcurrency() {
      if (typeof navigator !== "undefined" && navigator.hardwareConcurrency) return navigator.hardwareConcurrency;
      if (os && typeof os.cpus === "function") {
        const count = os.cpus().length;
        if (count) return count;
      }
      return 4;
    }
    const WORKER_SOURCE = `\nvar entries = {};\nvar pipelines = {};\nfunction handleMessage(message, post) {\n  if (message.type === 'setup') {\n    var imports = { env: { memory: message.memory } };\n    for (var i = 0; i < message.mathImports.length; i++) {\n      imports.env['math_' + message.mathImports[i]] = Math[message.mathImports[i]];\n    }\n    var instance = new WebAssembly.Instance(message.module, imports);\n    entries[message.id] = {\n      run: instance.exports.run,\n      runSimd: instance.exports.run_simd || null,\n      sizeX: message.sizeX\n    };\n    post({ type: 'ready', id: message.id });\n  } else if (message.type === 'pipelineSetup') {\n    var instances = [];\n    for (var i = 0; i < message.modules.length; i++) {\n      var imports = { env: { memory: message.memory } };\n      var math = message.moduleMathImports[i];\n      for (var j = 0; j < math.length; j++) {\n        imports.env['math_' + math[j]] = Math[math[j]];\n      }\n      instances.push(new WebAssembly.Instance(message.modules[i], imports));\n    }\n    var steps = [];\n    for (var i = 0; i < message.steps.length; i++) {\n      var exported = instances[message.steps[i].module].exports;\n      steps.push({\n        run: exported.run,\n        runSimd: exported.run_simd || null,\n        sizeX: message.steps[i].sizeX\n      });\n    }\n    pipelines[message.id] = {\n      steps: steps,\n      i32: new Int32Array(message.memory.buffer),\n      countIndex: message.countIndex,\n      genIndex: message.genIndex,\n      abortIndex: message.abortIndex\n    };\n    post({ type: 'ready', id: message.id });\n  } else if (message.type === 'release') {\n    delete entries[message.id];\n    delete pipelines[message.id];\n  } else if (message.type === 'run') {\n    var entry = entries[message.id];\n    var start = message.start;\n    var end = message.end;\n    var seed = message.seed;\n    if (entry.runSimd && (entry.sizeX & 3) === 0 && (start & 3) === 0) {\n      var quadEnd = end - ((end - start) & 3);\n      if (quadEnd > start) entry.runSimd(start, quadEnd, seed);\n      if (quadEnd < end) entry.run(quadEnd, end, seed);\n    } else {\n      entry.run(start, end, seed);\n    }\n    post({ type: 'done', taskId: message.taskId });\n  } else if (message.type === 'pipelineRun') {\n    var pipeline = pipelines[message.id];\n    var i32 = pipeline.i32;\n    var gen = message.baseGen;\n    var aborted = false;\n    for (var s = 0; s < pipeline.steps.length && !aborted; s++) {\n      if (Atomics.load(i32, pipeline.abortIndex)) {\n        aborted = true;\n        break;\n      }\n      var step = pipeline.steps[s];\n      var start = message.ranges[s * 2];\n      var end = message.ranges[s * 2 + 1];\n      var seed = message.seeds[s];\n      if (end > start) {\n        if (step.runSimd && (step.sizeX & 3) === 0 && (start & 3) === 0) {\n          var quadEnd = end - ((end - start) & 3);\n          if (quadEnd > start) step.runSimd(start, quadEnd, seed);\n          if (quadEnd < end) step.run(quadEnd, end, seed);\n        } else {\n          step.run(start, end, seed);\n        }\n      }\n      gen++;\n      if (Atomics.add(i32, pipeline.countIndex, 1) + 1 === message.workerCount) {\n        Atomics.store(i32, pipeline.countIndex, 0);\n        Atomics.store(i32, pipeline.genIndex, gen);\n        Atomics.notify(i32, pipeline.genIndex);\n      } else {\n        for (;;) {\n          if (Atomics.load(i32, pipeline.genIndex) >= gen) break;\n          if (Atomics.load(i32, pipeline.abortIndex)) {\n            aborted = true;\n            break;\n          }\n          Atomics.wait(i32, pipeline.genIndex, gen - 1, 100);\n        }\n      }\n    }\n    post({ type: 'done', taskId: message.taskId, aborted: aborted });\n  }\n}\nif (typeof self !== 'undefined' && typeof postMessage === 'function') {\n  self.onmessage = function(event) {\n    handleMessage(event.data, function(message) { postMessage(message); });\n  };\n} else {\n  var parentPort = require('worker_threads').parentPort;\n  parentPort.on('message', function(message) {\n    handleMessage(message, function(reply) { parentPort.postMessage(reply); });\n  });\n}\n`;
    var WebAssemblyWorkerPool = class {
      constructor(size) {
        this.size = size || defaultConcurrency();
        this.workers = [];
        this.destroyed = false;
        this.dispatchCount = 0;
        this.lastDispatch = null;
        this._taskId = 0;
      }
      get liveWorkerCount() {
        let count = 0;
        for (const worker of this.workers) if (!worker.dead) count++;
        return count;
      }
      _spawn() {
        const worker = {
          handle: null,
          dead: false,
          state: {
            setup: new Set,
            settingUp: new Map,
            pending: new Map
          },
          fail: null,
          die: null
        };
        const state = worker.state;
        worker.fail = error => {
          for (const wait of state.settingUp.values()) wait.reject(error);
          state.settingUp.clear();
          for (const task of state.pending.values()) task.reject(error);
          state.pending.clear();
        };
        worker.die = error => {
          if (worker.dead) return;
          worker.dead = true;
          worker.fail(error);
          if (worker.handle && typeof worker.handle.terminate === "function") try {
            worker.handle.terminate();
          } catch (e) {}
        };
        const onMessage = message => {
          if (message.type === "ready") {
            const wait = state.settingUp.get(message.id);
            if (wait) {
              state.settingUp.delete(message.id);
              state.setup.add(message.id);
              this._updateRef(worker);
              wait.resolve();
            }
          } else if (message.type === "done") {
            const task = state.pending.get(message.taskId);
            if (task) {
              state.pending.delete(message.taskId);
              this._updateRef(worker);
              task.resolve();
            }
          }
        };
        let handle;
        if (IS_BROWSER_WORKER) {
          const url = URL.createObjectURL(new Blob([ WORKER_SOURCE ], {
            type: "text/javascript"
          }));
          handle = new Worker(url);
          URL.revokeObjectURL(url);
          handle.onmessage = event => onMessage(event.data);
          handle.onerror = event => worker.die(new Error(event.message || "WebAssembly worker error"));
        } else {
          const {Worker: NodeWorker} = require_empty_module();
          handle = new NodeWorker(WORKER_SOURCE, {
            eval: true
          });
          handle.on("message", onMessage);
          handle.on("error", error => worker.die(error));
          handle.on("exit", code => {
            worker.die(new Error(`WebAssembly worker exited with code ${code}`));
          });
          handle.unref();
        }
        worker.handle = handle;
        return worker;
      }
      _worker(index) {
        while (this.workers.length <= index) this.workers.push(this._spawn());
        if (this.workers[index].dead) this.workers[index] = this._spawn();
        return this.workers[index];
      }
      _updateRef(worker) {
        if (worker.dead || !worker.handle || typeof worker.handle.ref !== "function") return;
        if (worker.state.settingUp.size + worker.state.pending.size > 0) worker.handle.ref(); else worker.handle.unref();
      }
      _ensureSetup(worker, entry) {
        if (worker.state.setup.has(entry.id)) return Promise.resolve();
        let wait = worker.state.settingUp.get(entry.id);
        if (!wait) {
          wait = {};
          wait.promise = new Promise((resolve, reject) => {
            wait.resolve = resolve;
            wait.reject = reject;
          });
          worker.state.settingUp.set(entry.id, wait);
          this._updateRef(worker);
          worker.handle.postMessage(entry.pipeline ? {
            type: "pipelineSetup",
            id: entry.id,
            memory: entry.memory,
            modules: entry.modules,
            moduleMathImports: entry.moduleMathImports,
            steps: entry.steps,
            countIndex: entry.countIndex,
            genIndex: entry.genIndex,
            abortIndex: entry.abortIndex
          } : {
            type: "setup",
            id: entry.id,
            module: entry.module,
            memory: entry.memory,
            mathImports: entry.mathImports,
            sizeX: entry.sizeX
          });
        }
        return wait.promise;
      }
      dispatch(entry, tasks) {
        if (this.destroyed) return Promise.reject(new Error("WebAssembly worker pool has been destroyed"));
        this.dispatchCount++;
        this.lastDispatch = {
          workerCount: tasks.length,
          ranges: tasks.map(task => [ task.start, task.end ])
        };
        const runs = tasks.map((task, index) => {
          const worker = this._worker(index);
          return this._ensureSetup(worker, entry).then(() => new Promise((resolve, reject) => {
            if (worker.dead) {
              reject(new Error("WebAssembly worker died before the task could run"));
              return;
            }
            const taskId = ++this._taskId;
            worker.state.pending.set(taskId, {
              resolve: resolve,
              reject: reject
            });
            this._updateRef(worker);
            worker.handle.postMessage({
              type: "run",
              id: entry.id,
              taskId: taskId,
              start: task.start,
              end: task.end,
              seed: task.seed
            });
          }));
        });
        return Promise.all(runs).then(() => void 0);
      }
      dispatchPipeline(entry, run) {
        if (this.destroyed) return Promise.reject(new Error("WebAssembly worker pool has been destroyed"));
        this.dispatchCount++;
        this.lastDispatch = {
          workerCount: entry.workerCount,
          ranges: entry.workerRanges.map(ranges => ranges.slice())
        };
        const runs = [];
        for (let index = 0; index < entry.workerCount; index++) {
          const worker = this._worker(index);
          runs.push(this._ensureSetup(worker, entry).then(() => new Promise((resolve, reject) => {
            if (worker.dead) {
              reject(new Error("WebAssembly worker died before the task could run"));
              return;
            }
            const taskId = ++this._taskId;
            worker.state.pending.set(taskId, {
              resolve: resolve,
              reject: reject
            });
            this._updateRef(worker);
            worker.handle.postMessage({
              type: "pipelineRun",
              id: entry.id,
              taskId: taskId,
              ranges: entry.workerRanges[index],
              seeds: run.seeds,
              baseGen: run.baseGen,
              workerCount: entry.workerCount
            });
          })));
        }
        return Promise.all(runs).then(() => void 0);
      }
      release(entryId) {
        if (this.destroyed) return;
        for (const worker of this.workers) {
          if (worker.dead) continue;
          worker.state.setup.delete(entryId);
          const wait = worker.state.settingUp.get(entryId);
          if (wait) {
            worker.state.settingUp.delete(entryId);
            wait.reject(new Error("WebAssembly kernel entry released during setup"));
            this._updateRef(worker);
          }
          worker.handle.postMessage({
            type: "release",
            id: entryId
          });
        }
      }
      destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        const error = new Error("WebAssembly worker pool has been destroyed");
        for (const worker of this.workers) {
          worker.dead = true;
          worker.fail(error);
          worker.handle.terminate();
        }
        this.workers = [];
      }
    };
    module.exports = {
      WebAssemblyWorkerPool: WebAssemblyWorkerPool
    };
  });
  var require_kernel = __commonJSMin((exports, module) => {
    const {Kernel: Kernel} = require_kernel$7();
    const {FunctionBuilder: FunctionBuilder} = require_function_builder();
    const {WebAssemblyFunctionNode: WebAssemblyFunctionNode} = require_function_node();
    const {WasmModuleBuilder: WasmModuleBuilder} = require_wasm_builder();
    const {WebAssemblyWorkerPool: WebAssemblyWorkerPool} = require_worker_pool();
    const {utils: utils} = require_utils();
    const {Input: Input} = require_input();
    const features = Object.freeze({
      kernelMap: false,
      isIntegerDivisionAccurate: true,
      isSpeedTacticSupported: false,
      isTextureFloat: true,
      isDrawBuffers: false,
      kernelMapSize: 0,
      channelCount: 1,
      maxTextureSize: Infinity,
      isFloatRead: true
    });
    const PAGE_BYTES = 65536;
    let simdSupported = null;
    let threadsSupported = null;
    let nextEntryId = 1;
    module.exports = {
      WebAssemblyKernel: class WebAssemblyKernel extends Kernel {
        static get isSupported() {
          if (typeof WebAssembly !== "object" || WebAssembly === null) return false;
          return WebAssembly.validate(new Uint8Array([ 0, 97, 115, 109, 1, 0, 0, 0 ]));
        }
        static get isSIMDSupported() {
          if (simdSupported === null) try {
            const builder = new WasmModuleBuilder;
            builder.addFunction("t", {
              params: [],
              results: []
            }).v128ConstI32x4(0, 0, 0, 0).drop();
            simdSupported = WebAssembly.validate(builder.toBytes());
          } catch (e) {
            simdSupported = false;
          }
          return simdSupported;
        }
        static get isThreadsSupported() {
          if (threadsSupported === null) try {
            if (typeof SharedArrayBuffer === "undefined") threadsSupported = false; else {
              const builder = new WasmModuleBuilder;
              builder.addMemoryImport(1, 1, true);
              const memory = new WebAssembly.Memory({
                initial: 1,
                maximum: 1,
                shared: true
              });
              new WebAssembly.Instance(new WebAssembly.Module(builder.toBytes()), {
                env: {
                  memory: memory
                }
              });
              threadsSupported = true;
            }
          } catch (e) {
            threadsSupported = false;
          }
          return threadsSupported;
        }
        static isContextMatch(context) {
          return false;
        }
        static getFeatures() {
          return features;
        }
        static get features() {
          return features;
        }
        static get mode() {
          return "webasm";
        }
        static getSignature(kernel, argumentTypes) {
          return "webasm" + (argumentTypes.length > 0 ? ":" + argumentTypes.join(",") : "");
        }
        static destroyContext(context) {}
        static dispatchSpans(run, runSimd, cells, sizeX, seed) {
          if (!runSimd || cells === 0) {
            run(0, cells, seed);
            return "scalar";
          }
          if ((sizeX & 3) === 0) {
            runSimd(0, cells, seed);
            return "simd";
          }
          const quadSpan = sizeX & -4;
          const rows = cells / sizeX;
          for (let row = 0; row < rows; row++) {
            const base = row * sizeX;
            if (quadSpan > 0) runSimd(base, base + quadSpan, seed);
            run(base + quadSpan, base + sizeX, seed);
          }
          return quadSpan > 0 ? "simd+scalar-tail" : "scalar";
        }
        static nativeFunctionArguments() {
          throw new Error("WebAssembly backend does not yet support native functions");
        }
        static nativeFunctionReturnType() {
          throw new Error("WebAssembly backend does not yet support native functions");
        }
        static combineKernels() {
          throw new Error("WebAssembly backend does not yet support combineKernels");
        }
        constructor(source, settings) {
          super(source, settings);
          this.poolSize = null;
          this.mergeSettings(source.settings || settings);
          if (this.precision === null) this.precision = "single";
          this.threadDim = null;
          this.componentCount = 1;
          this.moduleCacheLimit = 8;
          this.functionBuilder = null;
          this.tracedFunctions = null;
          this.usesRandom = false;
          this.usedMathImports = null;
          this._moduleCache = new Map;
          this._active = null;
          this._lastRunPath = null;
          this._pool = null;
          this._threadedTail = Promise.resolve();
          this._threadedBusy = 0;
          this._threadedEpoch = 0;
        }
        initCanvas() {
          if (this.graphical && typeof document !== "undefined") return document.createElement("canvas");
          return null;
        }
        initContext() {
          return null;
        }
        initPlugins(settings) {
          return [];
        }
        setOutput(output) {
          const newOutput = this.toKernelOutput(output);
          if (this.built && !this.dynamicOutput) throw new Error("Resizing a kernel with dynamicOutput: false is not possible");
          this.output = newOutput;
          return this;
        }
        toString() {
          throw new Error("WebAssembly backend does not yet support toString");
        }
        build() {
          if (this.built) return;
          if (this.gpu && this.gpu.kernels && this.gpu.kernels.indexOf(this) === -1) this.gpu.kernels.push(this);
          if (this.graphical) return this.requestFallback(arguments, "graphical mode is not supported on the webasm backend");
          if (this.subKernels && this.subKernels.length > 0) return this.requestFallback(arguments, "kernel maps are not supported on the webasm backend");
          this.setupConstants();
          this.setupArguments(arguments);
          for (let i = 0; i < this.argumentTypes.length; i++) switch (this.argumentTypes[i]) {
           case "Array":
           case "Input":
           case "Number":
           case "Float":
           case "Integer":
           case "Boolean":
            continue;

           default:
            return this.requestFallback(arguments, `argument "${this.argumentNames[i]}" of type ${this.argumentTypes[i]} is not supported on the webasm backend`);
          }
          for (const name in this.constantTypes) switch (this.constantTypes[name]) {
           case "Array":
           case "Input":
           case "Number":
           case "Float":
           case "Integer":
           case "Boolean":
            continue;

           default:
            return this.requestFallback(arguments, `constant "${name}" of type ${this.constantTypes[name]} is not supported on the webasm backend`);
          }
          this.validateSettings(arguments);
          const threadDim = this.threadDim = Array.from(this.output);
          while (threadDim.length < 3) threadDim.push(1);
          if (!this.translateSource()) return this.requestFallback(arguments, `return type ${this.returnType} is not supported on the webasm backend`);
          this.buildSignature(arguments);
          this._instantiate(this._entryKey(arguments), arguments);
          this.built = true;
        }
        validateSettings(args) {
          if (!this.output || this.output.length === 0) {
            if (args.length !== 1) throw new Error("Auto output only supported for kernels with only one input");
            const argType = utils.getVariableType(args[0], this.strictIntegers);
            if (argType === "Array") this.output = Array.from(utils.getDimensions(args[0])); else throw new Error("Auto output not supported for input type: " + argType);
          }
          this.checkOutput();
        }
        translateSource() {
          const functionBuilder = this.functionBuilder = FunctionBuilder.fromKernel(this, WebAssemblyFunctionNode);
          this.tracedFunctions = functionBuilder.traceFunctionCalls("kernel", []);
          if (!this.returnType) this.returnType = functionBuilder.getKernelResultType();
          switch (this.returnType) {
           case "Number":
           case "Float":
           case "Integer":
           case "LiteralInteger":
            this.componentCount = 1;
            break;

           case "Array(2)":
            this.componentCount = 2;
            break;

           case "Array(3)":
            this.componentCount = 3;
            break;

           case "Array(4)":
            this.componentCount = 4;
            break;

           default:
            return false;
          }
          this.usesRandom = false;
          this.usedMathImports = new Set;
          for (const name of this.tracedFunctions) {
            const node = functionBuilder.functionMap[name];
            if (!node) continue;
            if (node.usesRandom) this.usesRandom = true;
            for (const importName of node.usedMathImports) this.usedMathImports.add(importName);
          }
          return true;
        }
        computeLayout(args) {
          const align16 = value => Math.ceil(value / 16) * 16;
          let offset = 0;
          const arrays = {};
          const scalars = {};
          for (let i = 0; i < this.argumentTypes.length; i++) {
            const name = this.argumentNames[i];
            const type = this.argumentTypes[i];
            if (type === "Array" || type === "Input") {
              const dims = this.valueDimensions(args[i]);
              const flatLength = dims[0] * dims[1] * dims[2];
              arrays[name] = {
                index: i,
                offset: offset,
                dims: dims,
                flatLength: flatLength
              };
              offset = align16(offset + flatLength * 4);
            } else {
              scalars[name] = {
                index: i,
                offset: offset,
                type: type
              };
              offset = align16(offset + 4);
            }
          }
          const constantArrays = {};
          if (this.constants) for (const name in this.constants) {
            if (!this.constants.hasOwnProperty(name)) continue;
            const type = this.constantTypes[name];
            if (type === "Array" || type === "Input") {
              const dims = this.valueDimensions(this.constants[name]);
              const flatLength = dims[0] * dims[1] * dims[2];
              constantArrays[name] = {
                offset: offset,
                dims: dims,
                flatLength: flatLength
              };
              offset = align16(offset + flatLength * 4);
            }
          }
          return {
            arrays: arrays,
            scalars: scalars,
            constantArrays: constantArrays,
            outputOffset: offset
          };
        }
        valueDimensions(value) {
          const dims = value instanceof Input ? Array.from(value.size) : Array.from(utils.getDimensions(value));
          while (dims.length < 3) dims.push(1);
          return dims;
        }
        _computeSizeSignature(args) {
          const parts = [ this.output.join("x") ];
          for (let i = 0; i < this.argumentTypes.length; i++) {
            const type = this.argumentTypes[i];
            if (type === "Array" || type === "Input") parts.push(this.valueDimensions(args[i]).join("x"));
          }
          return parts.join("|");
        }
        _threadable() {
          if (this.asyncMode !== true || !WebAssemblyKernel.isThreadsSupported) return false;
          const [tx, ty, tz] = this.threadDim;
          return tx * ty * tz >= 4096;
        }
        _entryKey(args) {
          return this._computeSizeSignature(args) + (this._threadable() ? "|shared" : "");
        }
        _assembleModule(layout, cells, shared) {
          const builder = new WasmModuleBuilder;
          const totalBytes = layout.totalBytes || layout.outputOffset + cells * this.componentCount * 4;
          const initial = Math.ceil(totalBytes / PAGE_BYTES) + 16;
          const maximum = Math.max(initial, 4096);
          builder.addMemoryImport(initial, maximum, shared);
          const mathImports = Array.from(this.usedMathImports).sort();
          for (const name of mathImports) {
            const params = name === "pow" || name === "atan2" ? [ "f32", "f32" ] : [ "f32" ];
            builder.addFuncImport("math_" + name, params, [ "f32" ]);
          }
          const globals = {
            threadX: builder.addGlobal("i32", true, 0),
            threadY: builder.addGlobal("i32", true, 0),
            threadZ: builder.addGlobal("i32", true, 0),
            dataIndex: builder.addGlobal("i32", true, 0)
          };
          if (this.usesRandom) {
            globals.pcgState = builder.addGlobal("i32", true, 0);
            this._emitPcgRandom(builder, globals.pcgState);
          }
          const assembler = {
            module: builder,
            layout: layout,
            globals: globals
          };
          for (let i = this.tracedFunctions.length - 1; i >= 0; i--) {
            const name = this.tracedFunctions[i];
            if (name === "kernel") continue;
            const node = this.functionBuilder.functionMap[name];
            if (!node) continue;
            node.output = this.output;
            node.emitFunction(assembler);
          }
          this.functionBuilder.functionMap["kernel"].output = this.output;
          this.functionBuilder.functionMap["kernel"].emitFunction(assembler);
          const [sizeX, sizeY] = this.threadDim;
          const run = builder.addFunction("run", {
            params: [ "i32", "i32", "i32" ],
            locals: [ "i32" ]
          });
          const cell = 3;
          run.localGet(0).localSet(cell);
          if (this.output.length === 1) {
            run.i32Const(0).globalSet(globals.threadY);
            run.i32Const(0).globalSet(globals.threadZ);
          } else if (this.output.length === 2) run.i32Const(0).globalSet(globals.threadZ);
          run.block();
          run.localGet(cell).localGet(1).i32GeS().brIf(0);
          run.loop();
          run.localGet(cell).globalSet(globals.dataIndex);
          if (this.output.length === 1) run.localGet(cell).globalSet(globals.threadX); else if (this.output.length === 2) {
            run.localGet(cell).i32Const(sizeX).i32RemU().globalSet(globals.threadX);
            run.localGet(cell).i32Const(sizeX).i32DivU().globalSet(globals.threadY);
          } else {
            run.localGet(cell).i32Const(sizeX).i32RemU().globalSet(globals.threadX);
            run.localGet(cell).i32Const(sizeX).i32DivU().i32Const(sizeY).i32RemU().globalSet(globals.threadY);
            run.localGet(cell).i32Const(sizeX * sizeY).i32DivU().globalSet(globals.threadZ);
          }
          if (this.usesRandom) run.localGet(2).localGet(cell).i32Const(-1640531527).i32Mul().i32Add().i32Const(747796405).i32Mul().i32Const(-1403630843).i32Add().globalSet(globals.pcgState);
          run.call("kernel");
          run.localGet(cell).i32Const(1).i32Add().localSet(cell);
          run.localGet(cell).localGet(1).i32LtS().brIf(0);
          run.end();
          run.end();
          builder.exportFunction("run");
          if (WebAssemblyKernel.isSIMDSupported) {
            if (this.usesRandom) {
              globals.pcgStateV = builder.addGlobal("v128", true, 0);
              this._emitPcgRandomVector(builder, globals.pcgStateV);
            }
            let helperInfo = null;
            for (const name of this.tracedFunctions) {
              if (name === "kernel") continue;
              const node = this.functionBuilder.functionMap[name];
              if (!node) continue;
              if (!helperInfo) helperInfo = {
                readsThread: false,
                usesRandom: false
              };
              if (node.readsThread) helperInfo.readsThread = true;
              if (node.usesRandom) helperInfo.usesRandom = true;
            }
            assembler.helperInfo = helperInfo;
            this.functionBuilder.functionMap["kernel"].emitVectorFunction(assembler);
            this._emitRunSimd(builder, globals);
            builder.exportFunction("run_simd");
          }
          return {
            bytes: builder.toBytes(),
            initial: initial,
            maximum: maximum
          };
        }
        _emitRunSimd(builder, globals) {
          const [sizeX, sizeY] = this.threadDim;
          const run = builder.addFunction("run_simd", {
            params: [ "i32", "i32", "i32" ],
            locals: [ "i32" ]
          });
          const cell = 3;
          run.localGet(0).localSet(cell);
          if (this.output.length === 1) {
            run.i32Const(0).globalSet(globals.threadY);
            run.i32Const(0).globalSet(globals.threadZ);
          } else if (this.output.length === 2) run.i32Const(0).globalSet(globals.threadZ);
          run.block();
          run.localGet(cell).localGet(1).i32GeS().brIf(0);
          run.loop();
          run.localGet(cell).globalSet(globals.dataIndex);
          if (this.output.length === 1) run.localGet(cell).globalSet(globals.threadX); else if (this.output.length === 2) {
            run.localGet(cell).i32Const(sizeX).i32RemU().globalSet(globals.threadX);
            run.localGet(cell).i32Const(sizeX).i32DivU().globalSet(globals.threadY);
          } else {
            run.localGet(cell).i32Const(sizeX).i32RemU().globalSet(globals.threadX);
            run.localGet(cell).i32Const(sizeX).i32DivU().i32Const(sizeY).i32RemU().globalSet(globals.threadY);
            run.localGet(cell).i32Const(sizeX * sizeY).i32DivU().globalSet(globals.threadZ);
          }
          if (this.usesRandom) {
            run.localGet(cell).i32x4Splat().v128ConstI32x4(0, 1, 2, 3).i32x4Add();
            run.v128ConstI32x4(-1640531527, -1640531527, -1640531527, -1640531527).i32x4Mul();
            run.localGet(2).i32x4Splat().i32x4Add();
            run.v128ConstI32x4(747796405, 747796405, 747796405, 747796405).i32x4Mul();
            run.v128ConstI32x4(-1403630843, -1403630843, -1403630843, -1403630843).i32x4Add();
            run.globalSet(globals.pcgStateV);
          }
          run.call("kernel_simd");
          run.localGet(cell).i32Const(4).i32Add().localSet(cell);
          run.localGet(cell).localGet(1).i32LtS().brIf(0);
          run.end();
          run.end();
        }
        _emitPcgRandomVector(builder, stateGlobal) {
          const em = builder.addFunction("pcg_random_v", {
            params: [ "v128" ],
            results: [ "v128" ]
          });
          const s = em.addLocal("v128");
          const w = em.addLocal("i32");
          em.globalGet(stateGlobal).v128ConstI32x4(747796405, 747796405, 747796405, 747796405).i32x4Mul().v128ConstI32x4(-1403630843, -1403630843, -1403630843, -1403630843).i32x4Add().globalGet(stateGlobal).localGet(0).v128Bitselect().globalSet(stateGlobal);
          em.globalGet(stateGlobal).localSet(s);
          em.localGet(s).i32x4ExtractLane(0).localSet(w);
          em.localGet(w).localGet(w).i32Const(28).i32ShrU().i32Const(4).i32Add().i32ShrU().i32x4Splat();
          for (let lane = 1; lane < 4; lane++) {
            em.localGet(s).i32x4ExtractLane(lane).localSet(w);
            em.localGet(w).localGet(w).i32Const(28).i32ShrU().i32Const(4).i32Add().i32ShrU().i32x4ReplaceLane(lane);
          }
          em.localGet(s).v128Xor();
          em.v128ConstI32x4(277803737, 277803737, 277803737, 277803737).i32x4Mul();
          const wv = em.addLocal("v128");
          em.localTee(wv);
          em.i32Const(22).i32x4ShrU().localGet(wv).v128Xor();
          em.i32Const(8).i32x4ShrU();
          em.f32x4ConvertI32x4U();
          em.v128ConstF32x4(16777216, 16777216, 16777216, 16777216).f32x4Div();
        }
        _emitPcgRandom(builder, stateGlobal) {
          const em = builder.addFunction("pcg_random", {
            params: [],
            results: [ "f32" ]
          });
          const word = em.addLocal("i32");
          em.globalGet(stateGlobal).i32Const(747796405).i32Mul().i32Const(-1403630843).i32Add().globalSet(stateGlobal);
          em.globalGet(stateGlobal).globalGet(stateGlobal).i32Const(28).i32ShrU().i32Const(4).i32Add().i32ShrU().globalGet(stateGlobal).i32Xor().i32Const(277803737).i32Mul().localTee(word);
          em.i32Const(22).i32ShrU().localGet(word).i32Xor().i32Const(8).i32ShrU().f32ConvertI32U().f32Const(16777216).f32Div();
        }
        _releaseEntry(entry) {
          const scrub = () => {
            entry.instance = null;
            entry.module = null;
            entry.memory = null;
            entry.run = null;
            entry.runSimd = null;
            entry.f32 = null;
            entry.i32 = null;
            entry.bytes = null;
          };
          if (entry.shared && this._pool) {
            const pool = this._pool;
            this._threadedTail.then(() => {
              pool.release(entry.id);
              scrub();
            }, scrub);
          } else scrub();
        }
        _instantiate(entryKey, args) {
          let entry = this._moduleCache.get(entryKey);
          if (entry) {
            this._moduleCache.delete(entryKey);
            this._moduleCache.set(entryKey, entry);
          }
          if (!entry) {
            const shared = this._threadable();
            const layout = this.computeLayout(args);
            const [tx, ty, tz] = this.threadDim;
            const cells = tx * ty * tz;
            const {bytes: bytes, initial: initial, maximum: maximum} = this._assembleModule(layout, cells, shared);
            if (!WebAssembly.validate(bytes)) throw new Error("WebAssembly backend: generated module failed validation (internal error)");
            const memory = shared ? new WebAssembly.Memory({
              initial: initial,
              maximum: maximum,
              shared: true
            }) : new WebAssembly.Memory({
              initial: initial,
              maximum: maximum
            });
            const imports = {
              env: {
                memory: memory
              }
            };
            for (const name of this.usedMathImports) imports.env["math_" + name] = Math[name];
            const module$2 = new WebAssembly.Module(bytes);
            const instance = new WebAssembly.Instance(module$2, imports);
            entry = {
              id: nextEntryId++,
              sizeSignature: entryKey,
              shared: shared,
              layout: layout,
              cells: cells,
              bytes: bytes,
              module: module$2,
              memory: memory,
              mathImports: Array.from(this.usedMathImports).sort(),
              sizeX: tx,
              instance: instance,
              run: instance.exports.run,
              runSimd: instance.exports.run_simd || null,
              f32: new Float32Array(memory.buffer),
              i32: new Int32Array(memory.buffer)
            };
            for (const name in layout.constantArrays) {
              const record = layout.constantArrays[name];
              const value = this.constants[name];
              utils.flattenTo(value instanceof Input ? value.value : value, entry.f32.subarray(record.offset / 4, record.offset / 4 + record.flatLength));
            }
            this._moduleCache.set(entryKey, entry);
            while (this._moduleCache.size > Math.max(this.moduleCacheLimit, 1)) {
              const oldestKey = this._moduleCache.keys().next().value;
              const oldest = this._moduleCache.get(oldestKey);
              this._moduleCache.delete(oldestKey);
              this._releaseEntry(oldest);
            }
          }
          this._active = entry;
        }
        checkArgumentTypes(args) {
          super.checkArgumentTypes(args);
          if (!this.argumentTypes) return;
          const length = Math.min(args.length, this.argumentTypes.length);
          for (let i = 0; i < length; i++) {
            const value = args[i];
            if (!value || !value.type) continue;
            switch (this.argumentTypes[i]) {
             case "Array":
             case "Input":
             case "Number":
             case "Float":
             case "Integer":
             case "Boolean":
              this.switchKernels({
                type: "argumentTypeMismatch",
                index: i,
                needed: utils.getVariableType(value, this.strictIntegers)
              });
              break;
            }
          }
        }
        run() {
          if (!this.built) {
            this.build.apply(this, arguments);
            if (this.fallbackRequested) return null;
          }
          const threadDim = this.threadDim = Array.from(this.output);
          while (threadDim.length < 3) threadDim.push(1);
          const entryKey = this._entryKey(arguments);
          if (!this._active || this._active.sizeSignature !== entryKey) {
            const previous = this._active ? this._active.layout.arrays : {};
            for (const name in previous) {
              const record = previous[name];
              const dims = this.valueDimensions(arguments[record.index]);
              if (!this.dynamicArguments && (dims[0] !== record.dims[0] || dims[1] !== record.dims[1] || dims[2] !== record.dims[2])) throw new Error(`argument "${name}" changed size from [${record.dims.join(", ")}] to [${dims.join(", ")}]; use dynamicArguments: true for varying input sizes`);
            }
            this._instantiate(entryKey, arguments);
          }
          if (this._active.shared && this._threadable()) return this._runThreaded(arguments);
          const {layout: layout, cells: cells, f32: f32, i32: i32, run: run, runSimd: runSimd} = this._active;
          for (const name in layout.arrays) {
            const record = layout.arrays[name];
            const value = arguments[record.index];
            utils.flattenTo(value instanceof Input ? value.value : value, f32.subarray(record.offset / 4, record.offset / 4 + record.flatLength));
          }
          for (const name in layout.scalars) {
            const record = layout.scalars[name];
            const value = arguments[record.index];
            if (record.type === "Integer") i32[record.offset / 4] = value | 0; else if (record.type === "Boolean") i32[record.offset / 4] = value ? 1 : 0; else f32[record.offset / 4] = value;
          }
          let seed = 0;
          if (this.usesRandom) seed = this.randomSeed !== null ? this.randomSeed >>> 0 : Math.random() * 4294967296 >>> 0;
          seed = seed | 0;
          this._lastRunPath = WebAssemblyKernel.dispatchSpans(run, runSimd, cells, threadDim[0], seed);
          const base = layout.outputOffset / 4;
          const data = f32.slice(base, base + cells * this.componentCount);
          return this._shapeOutput(data, Array.from(this.output), this.componentCount);
        }
        _runThreaded(args) {
          const entry = this._active;
          const {layout: layout, cells: cells} = entry;
          const direct = this._threadedBusy === 0;
          let staged = null;
          let scalarValues = null;
          if (direct) {
            for (const name in layout.arrays) {
              const record = layout.arrays[name];
              const value = args[record.index];
              utils.flattenTo(value instanceof Input ? value.value : value, entry.f32.subarray(record.offset / 4, record.offset / 4 + record.flatLength));
            }
            for (const name in layout.scalars) {
              const record = layout.scalars[name];
              const value = args[record.index];
              if (record.type === "Integer") entry.i32[record.offset / 4] = value | 0; else if (record.type === "Boolean") entry.i32[record.offset / 4] = value ? 1 : 0; else entry.f32[record.offset / 4] = value;
            }
          } else {
            staged = [];
            for (const name in layout.arrays) {
              const record = layout.arrays[name];
              const value = args[record.index];
              const flat = new Float32Array(record.flatLength);
              utils.flattenTo(value instanceof Input ? value.value : value, flat);
              staged.push({
                record: record,
                flat: flat
              });
            }
            scalarValues = [];
            for (const name in layout.scalars) {
              const record = layout.scalars[name];
              scalarValues.push({
                record: record,
                value: args[record.index]
              });
            }
          }
          let seed = 0;
          if (this.usesRandom) seed = this.randomSeed !== null ? this.randomSeed >>> 0 : Math.random() * 4294967296 >>> 0;
          seed = seed | 0;
          if (!this._pool) this._pool = new WebAssemblyWorkerPool(this.poolSize || void 0);
          const pool = this._pool;
          const componentCount = this.componentCount;
          const output = Array.from(this.output);
          this._threadedBusy++;
          const result = this._threadedTail.then(() => {
            if (!entry.f32) throw new Error("WebAssembly kernel was destroyed");
            if (staged) {
              for (let i = 0; i < staged.length; i++) entry.f32.set(staged[i].flat, staged[i].record.offset / 4);
              for (let i = 0; i < scalarValues.length; i++) {
                const {record: record, value: value} = scalarValues[i];
                if (record.type === "Integer") entry.i32[record.offset / 4] = value | 0; else if (record.type === "Boolean") entry.i32[record.offset / 4] = value ? 1 : 0; else entry.f32[record.offset / 4] = value;
              }
            }
            const workerCount = Math.min(pool.size, Math.ceil(cells / 4096));
            let chunk = Math.ceil(cells / workerCount) & -4;
            if (chunk < 4) chunk = 4;
            const tasks = [];
            for (let i = 0; i < workerCount; i++) {
              const start = i * chunk;
              if (start >= cells) break;
              tasks.push({
                start: start,
                end: i === workerCount - 1 ? cells : Math.min(start + chunk, cells),
                seed: seed
              });
            }
            this._lastRunPath = "threaded";
            return pool.dispatch(entry, tasks).then(() => {
              if (!entry.f32) throw new Error("WebAssembly kernel was destroyed");
              const base = layout.outputOffset / 4;
              const data = entry.f32.slice(base, base + cells * componentCount);
              return this._shapeOutput(data, output, componentCount);
            });
          });
          const epoch = this._threadedEpoch;
          const settle = () => {
            if (this._threadedEpoch === epoch) this._threadedBusy--;
          };
          this._threadedTail = result.then(settle, settle);
          return result;
        }
        _shapeOutput(data, output, componentCount) {
          const [width, height, depth] = [ output[0], output[1] || 1, output[2] || 1 ];
          if (componentCount === 1) switch (output.length) {
           case 1:
            return utils.erectMemoryOptimizedFloat(data, width);

           case 2:
            return utils.erectMemoryOptimized2DFloat(data, width, height);

           default:
            return utils.erectMemoryOptimized3DFloat(data, width, height, depth);
          }
          const n = componentCount;
          const erectRow = offset => {
            const row = new Array(width);
            for (let x = 0; x < width; x++) row[x] = data.subarray(offset + x * n, offset + x * n + n);
            return row;
          };
          switch (output.length) {
           case 1:
            return erectRow(0);

           case 2:
            {
              const rows = new Array(height);
              for (let y = 0; y < height; y++) rows[y] = erectRow(y * width * n);
              return rows;
            }

           default:
            {
              const layers = new Array(depth);
              for (let z = 0; z < depth; z++) {
                const rows = new Array(height);
                for (let y = 0; y < height; y++) rows[y] = erectRow((z * height + y) * width * n);
                layers[z] = rows;
              }
              return layers;
            }
          }
        }
        destroy(removeCanvasReferences) {
          if (this._pool) {
            this._pool.destroy();
            this._pool = null;
          }
          this._threadedTail = Promise.resolve();
          this._threadedBusy = 0;
          this._threadedEpoch++;
          for (const entry of this._moduleCache.values()) {
            entry.shared = false;
            this._releaseEntry(entry);
          }
          this._moduleCache = new Map;
          this._active = null;
          this.built = false;
          if (this.gpu && this.gpu.kernels) {
            const index = this.gpu.kernels.indexOf(this);
            if (index !== -1) this.gpu.kernels.splice(index, 1);
          }
        }
      }
    };
  });
  var require_pipeline_executor$1 = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {Input: Input} = require_input();
    const {WebAssemblyKernel: WebAssemblyKernel} = require_kernel();
    const {WebAssemblyWorkerPool: WebAssemblyWorkerPool} = require_worker_pool();
    const SUPPORTED_VALUE_TYPES = [ "Array", "Input", "Number", "Float", "Integer", "Boolean" ];
    const THREAD_MIN_CELLS = 4096;
    let nextPipelineEntryId = 1;
    var FusionFallback = class extends Error {
      constructor(reason, recompilable) {
        super(reason);
        this.isFusionFallback = true;
        this.recompilable = Boolean(recompilable);
      }
    };
    function unwrapResultValue(value) {
      if (value && typeof value.toArray === "function") return value.toArray();
      return value;
    }
    function valueDimensions(value) {
      const dims = value instanceof Input ? Array.from(value.size) : Array.from(utils.getDimensions(value));
      while (dims.length < 3) dims.push(1);
      return dims;
    }
    function scalarMatches(type, value) {
      switch (type) {
       case "Integer":
        return typeof value === "number" && Number.isInteger(value);

       case "Boolean":
        return typeof value === "boolean";

       default:
        return typeof value === "number";
      }
    }
    module.exports = {
      WebAssemblyPipelineExecutor: class WebAssemblyPipelineExecutor {
        static compile(pipeline, plan, args) {
          for (let i = 0; i < plan.kernels.length; i++) {
            const kernel = plan.kernels[i].clone.kernel;
            if (kernel.constructor.mode !== "webasm") throw new FusionFallback(`pipeline backend is ${kernel.constructor.mode}; the fused executor requires webasm`);
          }
          if (plan.steps.length === 0) throw new FusionFallback("plan has no kernel steps to fuse");
          const executor = new WebAssemblyPipelineExecutor(pipeline, plan);
          executor._compile(args);
          return executor;
        }
        constructor(pipeline, plan) {
          this.pipeline = pipeline;
          this.gpu = pipeline.gpu;
          this.plan = plan;
          this.kind = "fused-sync";
          this.threaded = false;
          this.destroyed = false;
          this.memory = null;
          this.f32 = null;
          this.i32 = null;
          this.pool = null;
          this.sanityTimeoutMs = 6e4;
          this._entry = null;
          this._abortError = null;
          this._stepRuns = null;
          this._argArrayRegions = null;
          this._argScalarSlots = null;
          this._resultReads = null;
          this._extraShortcuts = [];
          this._scratch = new Map;
        }
        _compile(args) {
          const plan = this.plan;
          const programs = new Map;
          const cloneClaimed = new Array(plan.kernels.length).fill(false);
          const stepPrograms = new Array(plan.steps.length);
          const stepReps = new Array(plan.steps.length);
          for (let i = 0; i < plan.steps.length; i++) {
            const step = plan.steps[i];
            const kernelEntry = plan.kernels[step.kernel];
            const reps = this._representativeArgs(step, args);
            const strict = kernelEntry.clone.kernel.strictIntegers;
            const programKey = step.kernel + ":" + reps.map(value => utils.getVariableType(value, strict)).join(",");
            let program = programs.get(programKey);
            if (!program) {
              let kernel;
              if (!cloneClaimed[step.kernel]) {
                cloneClaimed[step.kernel] = true;
                kernel = kernelEntry.clone.kernel;
              } else {
                const extra = this.pipeline._cloneKernel(kernelEntry.clone);
                this._extraShortcuts.push(extra);
                kernel = extra.kernel;
              }
              this._prepareKernel(kernel, reps);
              program = {
                id: programs.size,
                kernel: kernel,
                constantRegions: null
              };
              programs.set(programKey, program);
            }
            stepPrograms[i] = program;
            stepReps[i] = reps;
          }
          for (let i = 0; i < plan.steps.length; i++) {
            const bindings = plan.steps[i].argBindings;
            for (let j = 0; j < bindings.length; j++) {
              const binding = bindings[j];
              if (binding.source === "step" && stepPrograms[binding.step].kernel.componentCount !== 1) throw new FusionFallback(`a step returning ${stepPrograms[binding.step].kernel.returnType} cannot feed another step in the fused executor`);
            }
          }
          const align16 = value => Math.ceil(value / 16) * 16;
          let offset = 0;
          const alloc = bytes => {
            const at = offset;
            offset = align16(offset + bytes);
            return at;
          };
          let threadWorkerCount = 0;
          let controlOffset = -1;
          if (!this.pipeline._threadsDisabled && WebAssemblyKernel.isThreadsSupported) {
            let maxCells = 0;
            for (let i = 0; i < plan.steps.length; i++) {
              const output = plan.steps[i].output;
              let cells = 1;
              for (let d = 0; d < output.length; d++) cells *= output[d];
              if (cells > maxCells) maxCells = cells;
            }
            const pool = new WebAssemblyWorkerPool;
            threadWorkerCount = Math.min(pool.size, Math.ceil(maxCells / THREAD_MIN_CELLS));
            if (threadWorkerCount > 1) {
              this.threaded = true;
              this.kind = "fused-threaded";
              this.pool = pool;
              controlOffset = alloc(12);
            } else pool.destroy();
          }
          const argArrayRegions = new Map;
          const argScalarSlots = new Map;
          const literalArrayRegions = new Map;
          const uploadArrays = [];
          const uploadScalars = [];
          const bufferPatches = [];
          const stepLayouts = new Array(plan.steps.length);
          for (let i = 0; i < plan.steps.length; i++) {
            const step = plan.steps[i];
            const program = stepPrograms[i];
            const local = program.kernel.computeLayout(stepReps[i]);
            const arrays = {};
            for (const name in local.arrays) {
              const record = local.arrays[name];
              const binding = step.argBindings[record.index];
              const relocated = {
                index: record.index,
                offset: 0,
                dims: record.dims,
                flatLength: record.flatLength
              };
              if (binding.source === "pipelineArg") {
                let region = argArrayRegions.get(binding.index);
                if (!region) {
                  region = {
                    offset: alloc(record.flatLength * 4),
                    dims: record.dims,
                    flatLength: record.flatLength
                  };
                  argArrayRegions.set(binding.index, region);
                }
                relocated.offset = region.offset;
              } else if (binding.source === "literal") {
                let region = literalArrayRegions.get(binding.value);
                if (!region) {
                  region = {
                    offset: alloc(record.flatLength * 4)
                  };
                  literalArrayRegions.set(binding.value, region);
                  uploadArrays.push({
                    offset: region.offset,
                    flatLength: record.flatLength,
                    value: binding.value
                  });
                }
                relocated.offset = region.offset;
              } else bufferPatches.push({
                record: relocated,
                buffer: plan.steps[binding.step].outputBuffer
              });
              arrays[name] = relocated;
            }
            const scalars = {};
            for (const name in local.scalars) {
              const record = local.scalars[name];
              const binding = step.argBindings[record.index];
              if (binding.source === "pipelineArg") {
                const key = binding.index + ":" + record.type;
                let slot = argScalarSlots.get(key);
                if (!slot) {
                  slot = {
                    index: binding.index,
                    offset: alloc(4),
                    type: record.type
                  };
                  argScalarSlots.set(key, slot);
                }
                scalars[name] = {
                  index: record.index,
                  offset: slot.offset,
                  type: record.type
                };
              } else if (binding.source === "literal") {
                const slotOffset = alloc(4);
                uploadScalars.push({
                  offset: slotOffset,
                  type: record.type,
                  value: binding.value
                });
                scalars[name] = {
                  index: record.index,
                  offset: slotOffset,
                  type: record.type
                };
              } else throw new FusionFallback("a step output cannot bind to a scalar argument");
            }
            if (!program.constantRegions) {
              const regions = {};
              for (const name in local.constantArrays) {
                const record = local.constantArrays[name];
                regions[name] = {
                  offset: alloc(record.flatLength * 4),
                  dims: record.dims,
                  flatLength: record.flatLength
                };
                const value = program.kernel.constants[name];
                uploadArrays.push({
                  offset: regions[name].offset,
                  flatLength: record.flatLength,
                  value: value
                });
              }
              program.constantRegions = regions;
            }
            stepLayouts[i] = {
              arrays: arrays,
              scalars: scalars
            };
          }
          const bufferComponents = new Array(plan.buffers.length).fill(1);
          for (let i = 0; i < plan.steps.length; i++) {
            const b = plan.steps[i].outputBuffer;
            bufferComponents[b] = Math.max(bufferComponents[b], stepPrograms[i].kernel.componentCount);
          }
          const bufferRegions = new Array(plan.buffers.length);
          for (let b = 0; b < plan.buffers.length; b++) {
            const dims = plan.buffers[b].output;
            let cells = 1;
            for (let d = 0; d < dims.length; d++) cells *= dims[d];
            bufferRegions[b] = {
              offset: alloc(cells * bufferComponents[b] * 4),
              cells: cells
            };
          }
          for (let i = 0; i < bufferPatches.length; i++) bufferPatches[i].record.offset = bufferRegions[bufferPatches[i].buffer].offset;
          const totalBytes = offset;
          const moduleCache = new Map;
          const stepRuns = new Array(plan.steps.length);
          const threadModules = [];
          const threadModuleImports = [];
          for (let i = 0; i < plan.steps.length; i++) {
            const program = stepPrograms[i];
            const kernel = program.kernel;
            const stepLayout = stepLayouts[i];
            const outputOffset = bufferRegions[plan.steps[i].outputBuffer].offset;
            const offsets = [];
            for (const name of kernel.argumentNames) {
              const record = stepLayout.arrays[name] || stepLayout.scalars[name];
              offsets.push(record ? record.offset : -1);
            }
            const moduleKey = `${program.id}:${offsets.join(",")}>${outputOffset}`;
            let compiled = moduleCache.get(moduleKey);
            if (!compiled) {
              const layout = {
                arrays: stepLayout.arrays,
                scalars: stepLayout.scalars,
                constantArrays: program.constantRegions,
                outputOffset: outputOffset,
                totalBytes: totalBytes
              };
              const cells = bufferRegions[plan.steps[i].outputBuffer].cells;
              const assembled = kernel._assembleModule(layout, cells, this.threaded);
              if (this.memory === null) {
                this.memory = this.threaded ? new WebAssembly.Memory({
                  initial: assembled.initial,
                  maximum: assembled.maximum,
                  shared: true
                }) : new WebAssembly.Memory({
                  initial: assembled.initial,
                  maximum: assembled.maximum
                });
                this.f32 = new Float32Array(this.memory.buffer);
                this.i32 = new Int32Array(this.memory.buffer);
              }
              const imports = {
                env: {
                  memory: this.memory
                }
              };
              for (const name of kernel.usedMathImports) imports.env["math_" + name] = Math[name];
              const module$1 = new WebAssembly.Module(assembled.bytes);
              const instance = new WebAssembly.Instance(module$1, imports);
              compiled = {
                run: instance.exports.run,
                runSimd: instance.exports.run_simd || null,
                moduleIndex: threadModules.length
              };
              threadModules.push(module$1);
              threadModuleImports.push(Array.from(kernel.usedMathImports).sort());
              moduleCache.set(moduleKey, compiled);
            }
            stepRuns[i] = {
              run: compiled.run,
              runSimd: compiled.runSimd,
              moduleIndex: compiled.moduleIndex,
              cells: bufferRegions[plan.steps[i].outputBuffer].cells,
              sizeX: kernel.threadDim[0],
              usesRandom: kernel.usesRandom,
              randomSeed: kernel.randomSeed
            };
          }
          if (this.threaded) {
            const workerRanges = [];
            for (let w = 0; w < threadWorkerCount; w++) {
              const ranges = new Array(plan.steps.length * 2);
              for (let i = 0; i < plan.steps.length; i++) {
                const cells = stepRuns[i].cells;
                let chunk = Math.ceil(cells / threadWorkerCount) & -4;
                if (chunk < 4) chunk = 4;
                const start = w * chunk;
                if (start >= cells) {
                  ranges[i * 2] = 0;
                  ranges[i * 2 + 1] = 0;
                } else {
                  ranges[i * 2] = start;
                  ranges[i * 2 + 1] = w === threadWorkerCount - 1 ? cells : Math.min(start + chunk, cells);
                }
              }
              workerRanges.push(ranges);
            }
            this._entry = {
              id: "pipeline:" + nextPipelineEntryId++,
              pipeline: true,
              memory: this.memory,
              modules: threadModules,
              moduleMathImports: threadModuleImports,
              steps: stepRuns.map(stepRun => ({
                module: stepRun.moduleIndex,
                sizeX: stepRun.sizeX
              })),
              countIndex: controlOffset / 4,
              genIndex: controlOffset / 4 + 1,
              abortIndex: controlOffset / 4 + 2,
              workerCount: threadWorkerCount,
              workerRanges: workerRanges
            };
          }
          for (let i = 0; i < uploadArrays.length; i++) {
            const upload = uploadArrays[i];
            utils.flattenTo(upload.value instanceof Input ? upload.value.value : upload.value, this.f32.subarray(upload.offset / 4, upload.offset / 4 + upload.flatLength));
          }
          for (let i = 0; i < uploadScalars.length; i++) this._writeScalar(uploadScalars[i], uploadScalars[i].value);
          this._resultReads = plan.results.entries.map(entry => {
            const binding = entry.binding;
            if (binding.source === "step") {
              const stepIndex = binding.step;
              const region = bufferRegions[plan.steps[stepIndex].outputBuffer];
              const kernel = stepPrograms[stepIndex].kernel;
              return {
                kind: "step",
                base: region.offset / 4,
                count: region.cells * kernel.componentCount,
                output: plan.steps[stepIndex].output,
                componentCount: kernel.componentCount,
                kernel: kernel
              };
            }
            if (binding.source === "pipelineArg") return {
              kind: "arg",
              index: binding.index
            };
            return {
              kind: "literal",
              value: binding.value
            };
          });
          this._stepRuns = stepRuns;
          this._argArrayRegions = argArrayRegions;
          this._argScalarSlots = argScalarSlots;
          this._scratch = null;
        }
        _representativeArgs(step, args) {
          const reps = new Array(step.argBindings.length);
          for (let j = 0; j < step.argBindings.length; j++) {
            const binding = step.argBindings[j];
            if (binding.source === "pipelineArg") reps[j] = args[binding.index]; else if (binding.source === "literal") reps[j] = binding.value; else {
              const output = this.plan.steps[binding.step].output;
              let flatLength = 1;
              for (let d = 0; d < output.length; d++) flatLength *= output[d];
              let scratch = this._scratch.get(flatLength);
              if (!scratch) {
                scratch = new Float32Array(flatLength);
                this._scratch.set(flatLength, scratch);
              }
              reps[j] = new Input(scratch, Array.from(output));
            }
          }
          return reps;
        }
        _prepareKernel(kernel, reps) {
          kernel.argumentTypes = kernel.declaredArgumentTypes ? kernel.declaredArgumentTypes.slice() : null;
          kernel.setupConstants();
          kernel.setupArguments(reps);
          for (let i = 0; i < kernel.argumentTypes.length; i++) if (SUPPORTED_VALUE_TYPES.indexOf(kernel.argumentTypes[i]) === -1) throw new FusionFallback(`argument "${kernel.argumentNames[i]}" of type ${kernel.argumentTypes[i]} is not supported on the webasm backend`);
          for (const name in kernel.constantTypes) if (SUPPORTED_VALUE_TYPES.indexOf(kernel.constantTypes[name]) === -1) throw new FusionFallback(`constant "${name}" of type ${kernel.constantTypes[name]} is not supported on the webasm backend`);
          kernel.validateSettings(reps);
          const threadDim = kernel.threadDim = Array.from(kernel.output);
          while (threadDim.length < 3) threadDim.push(1);
          if (!kernel.translateSource()) throw new FusionFallback(`return type ${kernel.returnType} is not supported on the webasm backend`);
        }
        _checkArguments(args) {
          for (const [index, region] of this._argArrayRegions) {
            const value = args[index];
            if (!value || typeof value !== "object") throw new FusionFallback(`pipeline argument ${index} is no longer an array`, true);
            if (typeof value.toArray === "function" && !(value instanceof Input)) throw new FusionFallback(`pipeline argument ${index} is now a GPU-resident handle`, true);
            const dims = valueDimensions(value);
            if (dims[0] !== region.dims[0] || dims[1] !== region.dims[1] || dims[2] !== region.dims[2]) throw new FusionFallback(`pipeline argument ${index} changed size from [${region.dims.join(", ")}] to [${dims.join(", ")}]`, true);
          }
          for (const slot of this._argScalarSlots.values()) if (!scalarMatches(slot.type, args[slot.index])) throw new FusionFallback(`pipeline argument ${slot.index} is no longer of type ${slot.type}`, true);
        }
        _writeScalar(slot, value) {
          if (slot.type === "Integer") this.i32[slot.offset / 4] = value | 0; else if (slot.type === "Boolean") this.i32[slot.offset / 4] = value ? 1 : 0; else this.f32[slot.offset / 4] = value;
        }
        execute(args) {
          if (this.destroyed) throw new Error("pipeline fused executor has been destroyed");
          if (this._abortError) throw this._abortError;
          this._checkArguments(args);
          const f32 = this.f32;
          for (const [index, region] of this._argArrayRegions) {
            const value = args[index];
            utils.flattenTo(value instanceof Input ? value.value : value, f32.subarray(region.offset / 4, region.offset / 4 + region.flatLength));
          }
          for (const slot of this._argScalarSlots.values()) this._writeScalar(slot, args[slot.index]);
          if (this.threaded) return this._executeThreaded(args);
          const stepRuns = this._stepRuns;
          for (let i = 0; i < stepRuns.length; i++) {
            const stepRun = stepRuns[i];
            WebAssemblyKernel.dispatchSpans(stepRun.run, stepRun.runSimd, stepRun.cells, stepRun.sizeX, this._drawSeed(stepRun));
          }
          return this._readResults(args);
        }
        _drawSeed(stepRun) {
          if (!stepRun.usesRandom) return 0;
          return (stepRun.randomSeed !== null ? stepRun.randomSeed >>> 0 : Math.random() * 4294967296 >>> 0) | 0;
        }
        _executeThreaded(args) {
          const entry = this._entry;
          const i32 = this.i32;
          const seeds = this._stepRuns.map(stepRun => this._drawSeed(stepRun));
          if (this._lastRunAborted) {
            Atomics.store(i32, entry.countIndex, 0);
            Atomics.store(i32, entry.abortIndex, 0);
            this._lastRunAborted = false;
            this._abortError = null;
          }
          const baseGen = Atomics.load(i32, entry.genIndex);
          const finalGen = baseGen + this._stepRuns.length;
          this.pool.dispatchPipeline(entry, {
            baseGen: baseGen,
            seeds: seeds
          }).then(null, error => this._abort(error));
          return this._waitForGeneration(finalGen).then(() => this._readResults(args));
        }
        _waitForGeneration(target) {
          const i32 = this.i32;
          const genIndex = this._entry.genIndex;
          const waitAsync = typeof Atomics.waitAsync === "function" ? Atomics.waitAsync : null;
          return new Promise((resolve, reject) => {
            const keepAlive = typeof setInterval === "function" ? setInterval(() => {}, 200) : null;
            const settle = (fn, value) => {
              if (keepAlive !== null) clearInterval(keepAlive);
              fn(value);
            };
            const countIndex = this._entry.countIndex;
            let lastSeen = Atomics.load(i32, genIndex);
            let lastCount = Atomics.load(i32, countIndex);
            let lastProgress = Date.now();
            const check = () => {
              if (this._abortError) {
                settle(reject, this._abortError);
                return;
              }
              const gen = Atomics.load(i32, genIndex);
              if (gen >= target) {
                settle(resolve);
                return;
              }
              const count = Atomics.load(i32, countIndex);
              if (gen !== lastSeen || count !== lastCount) {
                lastSeen = gen;
                lastCount = count;
                lastProgress = Date.now();
              } else if (Date.now() - lastProgress >= this.sanityTimeoutMs) {
                const error = new Error(`pipeline threaded barrier stalled at generation ${gen} of ${target} for ${this.sanityTimeoutMs}ms`);
                this._abort(error);
                settle(reject, error);
                return;
              }
              if (waitAsync) {
                const slice = Math.max(1, Math.min(200, this.sanityTimeoutMs));
                const wait = waitAsync(i32, genIndex, gen, slice);
                if (wait.async) wait.value.then(check); else Promise.resolve().then(check);
              } else setTimeout(check, 1);
            };
            check();
          });
        }
        _abort(error) {
          if (this._abortError) return;
          this._abortError = error || new Error("pipeline threaded run aborted");
          this._lastRunAborted = true;
          if (this.i32 && this._entry) {
            Atomics.store(this.i32, this._entry.abortIndex, 1);
            Atomics.notify(this.i32, this._entry.genIndex);
          }
          if (this.pool && this.pool.workers) {
            for (const worker of this.pool.workers) if (!worker.dead && worker.state.pending.size > 0) worker.die(this._abortError);
          }
        }
        abortRuns(error) {
          if (this.threaded) this._abort(error);
        }
        _readResults(args) {
          const f32 = this.f32;
          const results = this.plan.results;
          const values = new Array(this._resultReads.length);
          for (let i = 0; i < this._resultReads.length; i++) {
            const read = this._resultReads[i];
            if (read.kind === "step") {
              const data = f32.slice(read.base, read.base + read.count);
              values[i] = read.kernel._shapeOutput(data, read.output, read.componentCount);
            } else if (read.kind === "arg") values[i] = unwrapResultValue(args[read.index]); else values[i] = unwrapResultValue(read.value);
          }
          if (results.kind === "single") return values[0];
          if (results.kind === "array") return values;
          const shaped = {};
          for (let i = 0; i < values.length; i++) shaped[results.entries[i].key] = values[i];
          return shaped;
        }
        destroy() {
          if (this.destroyed) return;
          this.destroyed = true;
          if (this.pool) {
            this._abort(new Error("pipeline fused executor has been destroyed"));
            this.pool.destroy();
            this.pool = null;
          }
          const gpuKernels = this.gpu && this.gpu.kernels;
          for (let i = 0; i < this._extraShortcuts.length; i++) {
            const shortcut = this._extraShortcuts[i];
            if (!gpuKernels || gpuKernels.indexOf(shortcut.kernel) !== -1) shortcut.destroy();
          }
          this._extraShortcuts = [];
          this._entry = null;
          this._stepRuns = null;
          this._resultReads = null;
          this._argArrayRegions = null;
          this._argScalarSlots = null;
          this.memory = null;
          this.f32 = null;
          this.i32 = null;
        }
      },
      FusionFallback: FusionFallback
    };
  });
  var require_pipeline_executor = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {Input: Input} = require_input();
    const {FusionFallback: FusionFallback} = require_pipeline_executor$1();
    const USAGE_STORAGE = 128;
    const MAP_MODE_READ = 1;
    function unwrapResultValue(value) {
      if (value && typeof value.toArray === "function") return value.toArray();
      return value;
    }
    function checkStorageSize(device, byteLength, what) {
      const limits = device.limits;
      const max = Math.min(limits.maxStorageBufferBindingSize, limits.maxBufferSize);
      if (byteLength > max) throw new FusionFallback(`${what} needs ${byteLength} bytes but this device allows ${max} per storage buffer`);
    }
    function valueDimensions(value) {
      const dims = value instanceof Input ? Array.from(value.size) : Array.from(utils.getDimensions(value));
      while (dims.length < 3) dims.push(1);
      return dims;
    }
    function scalarMatches(type, value) {
      switch (type) {
       case "Integer":
        return typeof value === "number" && Number.isInteger(value);

       case "Boolean":
        return typeof value === "boolean";

       default:
        return typeof value === "number";
      }
    }
    function isResidentHandle(value) {
      return Boolean(value) && typeof value === "object" && !(value instanceof Input) && (typeof value.toArray === "function" || typeof value.delete === "function");
    }
    function align16(value) {
      return Math.ceil(value / 16) * 16;
    }
    module.exports = {
      WebGPUPipelineExecutor: class WebGPUPipelineExecutor {
        static async compile(pipeline, plan, args) {
          for (let i = 0; i < plan.kernels.length; i++) {
            const kernel = plan.kernels[i].clone.kernel;
            if (kernel.constructor.mode !== "webgpu") throw new FusionFallback(`pipeline backend is ${kernel.constructor.mode}; the fused encoder requires webgpu`);
          }
          if (plan.steps.length === 0) throw new FusionFallback("plan has no kernel steps to fuse");
          const executor = new WebGPUPipelineExecutor(pipeline, plan);
          try {
            await executor._compile(args);
          } catch (e) {
            executor.destroy();
            throw e;
          }
          return executor;
        }
        constructor(pipeline, plan) {
          this.pipeline = pipeline;
          this.gpu = pipeline.gpu;
          this.plan = plan;
          this.kind = "fused-encoder";
          this.destroyed = false;
          this.context = null;
          this._device = null;
          this._planBuffers = null;
          this._argRegions = new Map;
          this._argScalarSlots = new Map;
          this._literalBuffers = new Map;
          this._paramsRecords = [];
          this._passes = null;
          this._resultReads = null;
          this._staging = null;
          this._extraShortcuts = [];
          this._scratch = new Map;
        }
        async _compile(args) {
          const plan = this.plan;
          for (let i = 0; i < plan.steps.length; i++) {
            const bindings = plan.steps[i].argBindings;
            for (let j = 0; j < bindings.length; j++) {
              const binding = bindings[j];
              if (binding.source === "pipelineArg" && isResidentHandle(args[binding.index])) throw new FusionFallback(`pipeline argument ${binding.index} is a GPU-resident handle; the fused encoder takes plain arrays`);
            }
          }
          this._resultArgIndexes = [];
          for (let i = 0; i < plan.results.entries.length; i++) {
            const binding = plan.results.entries[i].binding;
            if (binding.source !== "pipelineArg") continue;
            if (isResidentHandle(args[binding.index])) throw new FusionFallback(`pipeline argument ${binding.index} is a GPU-resident handle; the fused encoder takes plain arrays`);
            this._resultArgIndexes.push(binding.index);
          }
          const programs = new Map;
          const cloneClaimed = new Array(plan.kernels.length).fill(false);
          const stepPrograms = new Array(plan.steps.length);
          for (let i = 0; i < plan.steps.length; i++) {
            const step = plan.steps[i];
            const kernelEntry = plan.kernels[step.kernel];
            const reps = this._representativeArgs(step, args);
            const strict = kernelEntry.clone.kernel.strictIntegers;
            const programKey = step.kernel + ":" + reps.map(value => utils.getVariableType(value, strict)).join(",");
            let program = programs.get(programKey);
            if (!program) {
              let kernel;
              if (!cloneClaimed[step.kernel]) {
                cloneClaimed[step.kernel] = true;
                kernel = kernelEntry.clone.kernel;
              } else {
                const extra = this.pipeline._cloneKernel(kernelEntry.clone);
                this._extraShortcuts.push(extra);
                kernel = extra.kernel;
              }
              await this._prepareKernel(kernel, reps);
              program = {
                id: programs.size,
                kernel: kernel
              };
              programs.set(programKey, program);
            }
            stepPrograms[i] = program;
          }
          this._scratch = null;
          for (let i = 0; i < plan.steps.length; i++) {
            const bindings = plan.steps[i].argBindings;
            for (let j = 0; j < bindings.length; j++) {
              const binding = bindings[j];
              if (binding.source === "step" && stepPrograms[binding.step].kernel.componentCount !== 1) throw new FusionFallback(`a step returning ${stepPrograms[binding.step].kernel.returnType} cannot feed another step in the fused encoder`);
            }
          }
          const device = this._device = stepPrograms[0].kernel._device;
          this.context = stepPrograms[0].kernel.context;
          const queue = device.queue;
          const bufferComponents = new Array(plan.buffers.length).fill(1);
          for (let i = 0; i < plan.steps.length; i++) {
            const b = plan.steps[i].outputBuffer;
            bufferComponents[b] = Math.max(bufferComponents[b], stepPrograms[i].kernel.componentCount);
          }
          this._planBuffers = plan.buffers.map((record, b) => {
            const dims = record.output;
            let cells = 1;
            for (let d = 0; d < dims.length; d++) cells *= dims[d];
            return {
              cells: cells,
              buffer: device.createBuffer({
                size: cells * bufferComponents[b] * 4,
                usage: 132
              })
            };
          });
          const bufferIds = new Map;
          const idOf = buffer => {
            let id = bufferIds.get(buffer);
            if (id === void 0) {
              id = bufferIds.size;
              bufferIds.set(buffer, id);
            }
            return id;
          };
          const passRecords = new Map;
          this._passes = new Array(plan.steps.length);
          for (let i = 0; i < plan.steps.length; i++) {
            const step = plan.steps[i];
            const program = stepPrograms[i];
            const kernel = program.kernel;
            const layout = kernel.paramsLayout;
            const argBuffers = new Array(layout.arrayArgs.length);
            const argDims = new Array(layout.arrayArgs.length);
            for (let j = 0; j < layout.arrayArgs.length; j++) {
              const record = layout.arrayArgs[j];
              const binding = step.argBindings[record.index];
              if (binding.source === "pipelineArg") {
                let region = this._argRegions.get(binding.index);
                if (!region) {
                  const dims = valueDimensions(args[binding.index]);
                  const flatLength = dims[0] * dims[1] * dims[2];
                  checkStorageSize(device, flatLength * 4, `pipeline argument ${binding.index}`);
                  region = {
                    dims: dims,
                    flatLength: flatLength,
                    scratch: new Float32Array(flatLength),
                    buffer: device.createBuffer({
                      size: Math.max(flatLength * 4, 4),
                      usage: 136
                    })
                  };
                  this._argRegions.set(binding.index, region);
                }
                argBuffers[j] = region.buffer;
                argDims[j] = region.dims;
              } else if (binding.source === "literal") {
                let literal = this._literalBuffers.get(binding.value);
                if (!literal) {
                  const dims = valueDimensions(binding.value);
                  const flatLength = dims[0] * dims[1] * dims[2];
                  checkStorageSize(device, flatLength * 4, "a literal array argument");
                  const buffer = device.createBuffer({
                    size: Math.max(flatLength * 4, 4),
                    usage: USAGE_STORAGE,
                    mappedAtCreation: true
                  });
                  const mapped = new Float32Array(buffer.getMappedRange());
                  utils.flattenTo(binding.value instanceof Input ? binding.value.value : binding.value, mapped.subarray(0, flatLength));
                  buffer.unmap();
                  literal = {
                    buffer: buffer,
                    dims: dims
                  };
                  this._literalBuffers.set(binding.value, literal);
                }
                argBuffers[j] = literal.buffer;
                argDims[j] = literal.dims;
              } else {
                const producer = plan.steps[binding.step];
                const dims = Array.from(producer.output);
                while (dims.length < 3) dims.push(1);
                argBuffers[j] = this._planBuffers[producer.outputBuffer].buffer;
                argDims[j] = dims;
              }
            }
            const outputBuffer = this._planBuffers[step.outputBuffer].buffer;
            const scalarSignature = layout.scalarArgs.map(record => {
              const binding = step.argBindings[record.index];
              return binding.source === "literal" ? "l" + binding.value : "a" + binding.index;
            }).join(",");
            const unpinnedRandom = layout.randomSeedOffset !== null && kernel.randomSeed === null;
            const key = program.id + ":" + argBuffers.map(idOf).join(",") + ">" + idOf(outputBuffer) + ":" + scalarSignature + (unpinnedRandom ? "#" + i : "");
            let stepPass = passRecords.get(key);
            if (!stepPass) {
              const mirror = new ArrayBuffer(layout.byteLength);
              const u32 = new Uint32Array(mirror);
              const i32 = new Int32Array(mirror);
              const f32 = new Float32Array(mirror);
              const dispatch = kernel._computeDispatch(kernel.threadDim);
              u32[0] = kernel.threadDim[0];
              u32[1] = kernel.threadDim[1];
              u32[2] = kernel.threadDim[2];
              u32[3] = dispatch.dispatchWidth;
              for (let j = 0; j < layout.arrayArgs.length; j++) {
                const base = layout.arrayArgs[j].dimsOffset / 4;
                u32[base] = argDims[j][0];
                u32[base + 1] = argDims[j][1];
                u32[base + 2] = argDims[j][2];
                u32[base + 3] = argDims[j][0] * argDims[j][1] * argDims[j][2];
              }
              const perCallScalars = [];
              for (let j = 0; j < layout.scalarArgs.length; j++) {
                const record = layout.scalarArgs[j];
                const binding = step.argBindings[record.index];
                if (binding.source === "literal") this._writeScalar(u32, i32, f32, record, binding.value); else if (binding.source === "pipelineArg") {
                  perCallScalars.push({
                    index: binding.index,
                    offset: record.offset,
                    type: record.type
                  });
                  this._argScalarSlots.set(binding.index + ":" + record.type, {
                    index: binding.index,
                    type: record.type
                  });
                } else throw new FusionFallback("a step output cannot bind to a scalar argument");
              }
              if (layout.randomSeedOffset !== null && kernel.randomSeed !== null) u32[layout.randomSeedOffset / 4] = kernel.randomSeed >>> 0;
              const paramsBuffer = device.createBuffer({
                size: layout.byteLength,
                usage: 72
              });
              const perCall = perCallScalars.length > 0 || unpinnedRandom;
              if (!perCall) queue.writeBuffer(paramsBuffer, 0, mirror);
              const entries = [ {
                binding: 0,
                resource: {
                  buffer: paramsBuffer
                }
              } ];
              for (let j = 0; j < argBuffers.length; j++) entries.push({
                binding: 1 + j,
                resource: {
                  buffer: argBuffers[j]
                }
              });
              const outBinding = 1 + argBuffers.length;
              entries.push({
                binding: outBinding,
                resource: {
                  buffer: outputBuffer
                }
              });
              for (let j = 0; j < layout.bufferConstants.length; j++) entries.push({
                binding: outBinding + 1 + j,
                resource: {
                  buffer: layout.bufferConstants[j].buffer
                }
              });
              stepPass = {
                pipeline: kernel.computePipeline,
                bindGroup: device.createBindGroup({
                  layout: kernel.bindGroupLayout,
                  entries: entries
                }),
                groups: dispatch.groups,
                paramsBuffer: paramsBuffer,
                mirror: mirror,
                u32: u32,
                i32: i32,
                f32: f32,
                perCall: perCall,
                perCallScalars: perCallScalars,
                seedOffset: unpinnedRandom ? layout.randomSeedOffset : null
              };
              this._paramsRecords.push(stepPass);
              passRecords.set(key, stepPass);
            }
            this._passes[i] = stepPass;
          }
          let stagingBytes = 0;
          this._resultReads = plan.results.entries.map(entry => {
            const binding = entry.binding;
            if (binding.source === "step") {
              const step = plan.steps[binding.step];
              const planBuffer = this._planBuffers[step.outputBuffer];
              const kernel = stepPrograms[binding.step].kernel;
              const byteLength = planBuffer.cells * kernel.componentCount * 4;
              const read = {
                kind: "step",
                buffer: planBuffer.buffer,
                offset: stagingBytes,
                byteLength: byteLength,
                output: step.output,
                componentCount: kernel.componentCount,
                kernel: kernel
              };
              stagingBytes += align16(byteLength);
              return read;
            }
            if (binding.source === "pipelineArg") return {
              kind: "arg",
              index: binding.index
            };
            return {
              kind: "literal",
              value: binding.value
            };
          });
          if (stagingBytes > 0) this._staging = device.createBuffer({
            size: stagingBytes,
            usage: 9
          });
        }
        _representativeArgs(step, args) {
          const reps = new Array(step.argBindings.length);
          for (let j = 0; j < step.argBindings.length; j++) {
            const binding = step.argBindings[j];
            if (binding.source === "pipelineArg") reps[j] = args[binding.index]; else if (binding.source === "literal") reps[j] = binding.value; else {
              const output = this.plan.steps[binding.step].output;
              let flatLength = 1;
              for (let d = 0; d < output.length; d++) flatLength *= output[d];
              let scratch = this._scratch.get(flatLength);
              if (!scratch) {
                scratch = new Float32Array(flatLength);
                this._scratch.set(flatLength, scratch);
              }
              reps[j] = new Input(scratch, Array.from(output));
            }
          }
          return reps;
        }
        async _prepareKernel(kernel, reps) {
          if (kernel.built || kernel._buildPromise) {
            const gpuKernels = kernel.gpu && kernel.gpu.kernels;
            kernel.destroy();
            if (gpuKernels && gpuKernels.indexOf(kernel) === -1) gpuKernels.push(kernel);
            kernel.argumentTypes = kernel.declaredArgumentTypes ? kernel.declaredArgumentTypes.slice() : null;
          }
          await kernel.build.apply(kernel, reps);
          if (kernel.outputBuffer) {
            if (--kernel.outputBuffer._refs === 0) kernel.outputBuffer.destroy();
            kernel.outputBuffer = null;
          }
        }
        _checkArguments(args) {
          for (const [index, region] of this._argRegions) {
            const value = args[index];
            if (!value || typeof value !== "object") throw new FusionFallback(`pipeline argument ${index} is no longer an array`, true);
            if (isResidentHandle(value)) throw new FusionFallback(`pipeline argument ${index} is now a GPU-resident handle`, true);
            const dims = valueDimensions(value);
            if (dims[0] !== region.dims[0] || dims[1] !== region.dims[1] || dims[2] !== region.dims[2]) throw new FusionFallback(`pipeline argument ${index} changed size from [${region.dims.join(", ")}] to [${dims.join(", ")}]`, true);
          }
          for (const slot of this._argScalarSlots.values()) if (!scalarMatches(slot.type, args[slot.index])) throw new FusionFallback(`pipeline argument ${slot.index} is no longer of type ${slot.type}`, true);
          for (let i = 0; i < this._resultArgIndexes.length; i++) {
            const index = this._resultArgIndexes[i];
            if (isResidentHandle(args[index])) throw new FusionFallback(`pipeline argument ${index} is now a GPU-resident handle`, true);
          }
        }
        _writeScalar(u32, i32, f32, record, value) {
          const slot = record.offset / 4;
          if (record.type === "Integer") i32[slot] = value | 0; else if (record.type === "Boolean") u32[slot] = value ? 1 : 0; else f32[slot] = value;
        }
        execute(args) {
          if (this.destroyed) throw new Error("pipeline fused executor has been destroyed");
          if (this.context && this.context.isLost) return Promise.reject(new Error("WebGPU device was lost; the pipeline will rebuild on a fresh device on its next call"));
          this._checkArguments(args);
          const device = this._device;
          const queue = device.queue;
          for (const [index, region] of this._argRegions) {
            const value = args[index];
            utils.flattenTo(value instanceof Input ? value.value : value, region.scratch);
            queue.writeBuffer(region.buffer, 0, region.scratch);
          }
          for (let i = 0; i < this._paramsRecords.length; i++) {
            const record = this._paramsRecords[i];
            if (!record.perCall) continue;
            for (let j = 0; j < record.perCallScalars.length; j++) {
              const slot = record.perCallScalars[j];
              this._writeScalar(record.u32, record.i32, record.f32, slot, args[slot.index]);
            }
            if (record.seedOffset !== null) record.u32[record.seedOffset / 4] = Math.random() * 4294967296 >>> 0;
            queue.writeBuffer(record.paramsBuffer, 0, record.mirror);
          }
          const encoder = device.createCommandEncoder();
          for (let i = 0; i < this._passes.length; i++) {
            const stepPass = this._passes[i];
            const pass = encoder.beginComputePass();
            pass.setPipeline(stepPass.pipeline);
            pass.setBindGroup(0, stepPass.bindGroup);
            pass.dispatchWorkgroups(stepPass.groups[0], stepPass.groups[1], stepPass.groups[2]);
            pass.end();
          }
          for (let i = 0; i < this._resultReads.length; i++) {
            const read = this._resultReads[i];
            if (read.kind === "step") encoder.copyBufferToBuffer(read.buffer, 0, this._staging, read.offset, read.byteLength);
          }
          queue.submit([ encoder.finish() ]);
          if (!this._staging) return Promise.resolve(this._shapeResults(args, null));
          return this._staging.mapAsync(MAP_MODE_READ).then(() => {
            const mapped = this._staging.getMappedRange();
            const values = this._shapeResults(args, mapped);
            this._staging.unmap();
            return values;
          });
        }
        _shapeResults(args, mapped) {
          const results = this.plan.results;
          const values = new Array(this._resultReads.length);
          for (let i = 0; i < this._resultReads.length; i++) {
            const read = this._resultReads[i];
            if (read.kind === "step") {
              const data = new Float32Array(mapped.slice(read.offset, read.offset + read.byteLength));
              values[i] = read.kernel._shapeOutput(data, read.output, read.componentCount);
            } else if (read.kind === "arg") values[i] = unwrapResultValue(args[read.index]); else values[i] = unwrapResultValue(read.value);
          }
          if (results.kind === "single") return values[0];
          if (results.kind === "array") return values;
          const shaped = {};
          for (let i = 0; i < values.length; i++) shaped[results.entries[i].key] = values[i];
          return shaped;
        }
        destroy() {
          if (this.destroyed) return;
          this.destroyed = true;
          if (this._planBuffers) for (let i = 0; i < this._planBuffers.length; i++) this._planBuffers[i].buffer.destroy();
          for (const region of this._argRegions.values()) region.buffer.destroy();
          for (const literal of this._literalBuffers.values()) literal.buffer.destroy();
          for (let i = 0; i < this._paramsRecords.length; i++) this._paramsRecords[i].paramsBuffer.destroy();
          if (this._staging) {
            this._staging.destroy();
            this._staging = null;
          }
          const gpuKernels = this.gpu && this.gpu.kernels;
          for (let i = 0; i < this._extraShortcuts.length; i++) {
            const shortcut = this._extraShortcuts[i];
            if (!gpuKernels || gpuKernels.indexOf(shortcut.kernel) !== -1) shortcut.destroy();
          }
          this._extraShortcuts = [];
          this._planBuffers = null;
          this._argRegions = new Map;
          this._argScalarSlots = new Map;
          this._literalBuffers = new Map;
          this._paramsRecords = [];
          this._passes = null;
          this._resultReads = null;
        }
      }
    };
  });
  var require_pipeline = __commonJSMin((exports, module) => {
    const {Input: Input} = require_input();
    const {utils: utils} = require_utils();
    const MSG_HANDLE_READ = "pipeline intermediate results cannot be read during orchestration";
    const MSG_HANDLE_PRIMITIVE = "pipeline intermediate results cannot be used in arithmetic or conditions during orchestration";
    const MSG_MATH_RANDOM = "Math.random() is not allowed during pipeline orchestration; orchestration must be deterministic";
    const MSG_FOREIGN_KERNEL = "pipelines can only call kernels created by the same GPU instance";
    const MSG_GRAPHICAL = "graphical kernels are not supported inside pipelines";
    const MSG_KERNEL_MAP = "kernel maps are not supported inside pipelines";
    const MSG_RETURN_SHAPE = "a pipeline must return a handle, or an Array or plain object of handles";
    const MSG_FIXED_OUTPUT = "kernels called inside a pipeline must have a fixed output size";
    const MSG_DESTROYED = "pipeline has been destroyed";
    const MSG_ASYNC_ORCHESTRATION = "the orchestration function must be synchronous; async functions and generators cannot be traced";
    const MSG_STALE_HANDLE = "this handle belongs to a different trace; handles do not survive re-trace or cross pipelines";
    var PipelineHandle = class {};
    let activeTrace = null;
    function getActiveTrace() {
      return activeTrace;
    }
    var PipelineTrace = class {
      constructor(gpu) {
        this.gpu = gpu;
        this.steps = [];
        this.kernels = [];
        this.kernelIndexes = new Map;
        this.handleMeta = new WeakMap;
        this.held = [];
      }
      createHandle(meta) {
        const trace = this;
        const target = Object.freeze(new PipelineHandle);
        const handle = new Proxy(target, {
          get(_, property) {
            if (property === Symbol.toPrimitive || property === "valueOf" || property === "toString") return () => {
              throw new Error(MSG_HANDLE_PRIMITIVE);
            };
            throw new Error(MSG_HANDLE_READ);
          },
          set() {
            throw new Error(MSG_HANDLE_READ);
          },
          ownKeys() {
            throw new Error(MSG_HANDLE_READ);
          },
          has() {
            throw new Error(MSG_HANDLE_READ);
          },
          getOwnPropertyDescriptor() {
            throw new Error(MSG_HANDLE_READ);
          }
        });
        trace.handleMeta.set(handle, meta);
        return handle;
      }
      recordKernelCall(shortcut, args) {
        const kernel = shortcut.kernel;
        if (kernel.gpu !== this.gpu) throw new Error(MSG_FOREIGN_KERNEL);
        if (kernel.graphical) throw new Error(MSG_GRAPHICAL);
        if (kernel.subKernels && kernel.subKernels.length > 0) throw new Error(MSG_KERNEL_MAP);
        if (!kernel.output) throw new Error(MSG_FIXED_OUTPUT);
        let kernelIndex = this.kernelIndexes.get(shortcut);
        if (kernelIndex === void 0) {
          kernelIndex = this.kernels.length;
          this.kernels.push(shortcut);
          this.kernelIndexes.set(shortcut, kernelIndex);
        }
        const argBindings = new Array(args.length);
        for (let i = 0; i < args.length; i++) argBindings[i] = this.bindValue(args[i]);
        const stepIndex = this.steps.length;
        this.steps.push({
          kernel: kernelIndex,
          argBindings: argBindings,
          output: Array.from(kernel.output),
          outputBuffer: -1
        });
        return this.createHandle({
          source: "step",
          step: stepIndex
        });
      }
      bindValue(value) {
        const meta = this.handleMeta.get(value);
        if (meta) return meta;
        if (value instanceof PipelineHandle) throw new Error(MSG_STALE_HANDLE);
        return {
          source: "literal",
          value: snapshotValue(value, this.held)
        };
      }
    };
    function snapshotValue(value, held) {
      if (!value || typeof value !== "object") return value;
      if (value instanceof Input) return new Input(snapshotValue(value.value, held), value.size);
      if (typeof value.delete === "function" || typeof value.toArray === "function") {
        if (typeof value.clone === "function" && held) {
          const cloned = value.clone();
          held.push(cloned);
          return cloned;
        }
        return value;
      }
      if (ArrayBuffer.isView(value)) return value.slice(0);
      if (Array.isArray(value)) return value.map(v => snapshotValue(v, held));
      return value;
    }
    function releaseSnapshots(held) {
      for (let i = 0; i < held.length; i++) try {
        held[i].delete();
      } catch (e) {}
      held.length = 0;
    }
    function assignBuffers(steps, resultBindings) {
      const lastRead = new Array(steps.length).fill(-1);
      for (let i = 0; i < steps.length; i++) {
        const bindings = steps[i].argBindings;
        for (let j = 0; j < bindings.length; j++) {
          const binding = bindings[j];
          if (binding.source === "step") lastRead[binding.step] = Math.max(lastRead[binding.step], i);
        }
      }
      for (let i = 0; i < resultBindings.length; i++) {
        const binding = resultBindings[i];
        if (binding.source === "step") lastRead[binding.step] = steps.length;
      }
      const buffers = [];
      const occupantLastRead = [];
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        let assigned = -1;
        for (let b = 0; b < buffers.length; b++) if (occupantLastRead[b] < i && sameShape(buffers[b].output, step.output)) {
          assigned = b;
          break;
        }
        if (assigned === -1) {
          assigned = buffers.length;
          buffers.push({
            output: step.output.slice()
          });
          occupantLastRead.push(-1);
        }
        step.outputBuffer = assigned;
        occupantLastRead[assigned] = lastRead[i];
      }
      return buffers;
    }
    function sameShape(a, b) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
      return true;
    }
    function bindResults(trace, returned) {
      if (returned === null || returned === void 0) throw new Error(MSG_RETURN_SHAPE);
      if (trace.handleMeta.has(returned)) return {
        kind: "single",
        entries: [ {
          binding: trace.bindValue(returned)
        } ]
      };
      if (Array.isArray(returned)) return {
        kind: "array",
        entries: returned.map((value, i) => ({
          key: i,
          binding: trace.bindValue(value)
        }))
      };
      if (returned instanceof PipelineHandle) throw new Error(MSG_STALE_HANDLE);
      if (typeof returned === "object" && !ArrayBuffer.isView(returned)) {
        if (typeof returned.then === "function") throw new Error(MSG_ASYNC_ORCHESTRATION);
        const proto = Object.getPrototypeOf(returned);
        if (proto !== Object.prototype && proto !== null) throw new Error(MSG_RETURN_SHAPE);
        const entries = [];
        for (const key in returned) {
          if (!returned.hasOwnProperty(key)) continue;
          entries.push({
            key: key,
            binding: trace.bindValue(returned[key])
          });
        }
        if (entries.length === 0) throw new Error(MSG_RETURN_SHAPE);
        return {
          kind: "object",
          entries: entries
        };
      }
      throw new Error(MSG_RETURN_SHAPE);
    }
    var Pipeline = class {
      constructor(gpu, fn, settings) {
        settings = settings || {};
        this.gpu = gpu;
        this.fn = fn;
        this.argumentCount = fn.length;
        this.constants = Object.assign({}, settings.constants || {});
        this._threadsDisabled = settings.threads === false;
        this._inFlight = 0;
        this.plan = null;
        this.executorKind = "generic";
        this.fallbackReason = null;
        this._executor = void 0;
        this._fusionDisabled = false;
        this.destroyed = false;
        this._tail = Promise.resolve();
      }
      call(args) {
        if (this.destroyed) return Promise.reject(new Error(MSG_DESTROYED));
        const sampled = new Array(args.length);
        const held = [];
        let preUploaded = null;
        if (this._inFlight === 0 && this.plan && this._executor === false && this._genericEagerUploadsPay(this.plan)) preUploaded = this._eagerUploads(this.plan, args);
        for (let i = 0; i < args.length; i++) if (preUploaded && preUploaded[i]) sampled[i] = args[i]; else sampled[i] = snapshotValue(args[i], held);
        this._inFlight++;
        const promise = this._tail.then(async () => {
          if (this.destroyed) throw new Error(MSG_DESTROYED);
          if (!this.plan) {
            this.plan = this._buildPlan();
            this._executor = void 0;
          }
          if (this._executor === void 0) await this._prepareExecutor(sampled);
          if (this._executor) try {
            return await this._guardAsync(this._executor.execute(sampled));
          } catch (e) {
            if (!e || !e.isFusionFallback) throw e;
            this._dropExecutor();
            if (e.recompilable) {
              await this._prepareExecutor(sampled);
              if (this._executor) try {
                return await this._guardAsync(this._executor.execute(sampled));
              } catch (e2) {
                if (!e2 || !e2.isFusionFallback) throw e2;
                this._dropExecutor();
                this._degrade(e2.message);
              }
            } else this._degrade(e.message);
          }
          return this._executeGeneric(this.plan, sampled, preUploaded);
        });
        const settle = () => {
          this._inFlight--;
          if (held.length > 0) releaseSnapshots(held);
        };
        promise.then(settle, settle);
        this._tail = promise.then(noop, noop);
        return promise;
      }
      _guardAsync(result) {
        if (result && typeof result.then === "function") return result.then(null, error => {
          this._dropExecutor();
          throw error;
        });
        return result;
      }
      setConstants(constants) {
        this.constants = Object.assign({}, constants || {});
        const release = () => {
          this._releasePlan();
        };
        this._tail = this._tail.then(release, release);
        return this;
      }
      destroy() {
        this.destroyed = true;
        if (this.gpu && this.gpu.pipelines) {
          const index = this.gpu.pipelines.indexOf(this);
          if (index !== -1) this.gpu.pipelines.splice(index, 1);
        }
        if (this._executor && typeof this._executor.abortRuns === "function") this._executor.abortRuns(new Error(MSG_DESTROYED));
        const release = () => {
          this._releasePlan();
        };
        const tail = this._tail.then(release, release);
        this._tail = tail;
        return tail;
      }
      _buildPlan() {
        const trace = new PipelineTrace(this.gpu);
        const argHandles = new Array(this.argumentCount);
        for (let i = 0; i < this.argumentCount; i++) argHandles[i] = trace.createHandle({
          source: "pipelineArg",
          index: i
        });
        const originalRandom = Math.random;
        Math.random = function pipelineTraceRandom() {
          throw new Error(MSG_MATH_RANDOM);
        };
        activeTrace = trace;
        let returned;
        try {
          const ctorName = this.fn.constructor && this.fn.constructor.name;
          if (ctorName === "AsyncFunction" || ctorName === "GeneratorFunction" || ctorName === "AsyncGeneratorFunction") throw new Error(MSG_ASYNC_ORCHESTRATION);
          returned = this.fn.apply({
            constants: Object.assign({}, this.constants)
          }, argHandles);
        } finally {
          activeTrace = null;
          Math.random = originalRandom;
        }
        const results = bindResults(trace, returned);
        const buffers = assignBuffers(trace.steps, results.entries.map(entry => entry.binding));
        const kernels = trace.kernels.map(shortcut => ({
          shortcut: shortcut,
          clone: this._cloneKernel(shortcut)
        }));
        return {
          steps: trace.steps,
          buffers: buffers,
          results: results,
          kernels: kernels,
          held: trace.held,
          genericClones: new Map
        };
      }
      _genericClone(plan, step) {
        const signature = step.argBindings.map(binding => binding.source === "step" ? "T" : binding.source === "pipelineArg" ? "a" + binding.index : "l").join(",");
        const key = step.kernel + ":" + step.outputBuffer + ":" + signature;
        let clone = plan.genericClones.get(key);
        if (!clone) {
          clone = this._cloneKernel(plan.kernels[step.kernel].clone, {
            immutable: false,
            dynamicArguments: false
          });
          plan.genericClones.set(key, clone);
        }
        return clone;
      }
      _prepareExecutor(args) {
        if (this._fusionDisabled) {
          this._executor = false;
          return;
        }
        const kernels = this.plan.kernels;
        if (kernels.length > 0 && kernels[0].clone.kernel.constructor.mode === "webgpu") {
          const {WebGPUPipelineExecutor: WebGPUPipelineExecutor} = require_pipeline_executor();
          return WebGPUPipelineExecutor.compile(this, this.plan, args).then(executor => {
            this._executor = executor;
            this.executorKind = executor.kind;
            this.fallbackReason = null;
          }, e => {
            this._degrade(e && e.message || "fused executor unavailable");
          });
        }
        try {
          const {WebAssemblyPipelineExecutor: WebAssemblyPipelineExecutor} = require_pipeline_executor$1();
          this._executor = WebAssemblyPipelineExecutor.compile(this, this.plan, args);
          this.executorKind = this._executor.kind;
          this.fallbackReason = null;
        } catch (e) {
          this._degrade(e && e.message || "fused executor unavailable");
        }
      }
      _dropExecutor() {
        if (this._executor) this._executor.destroy();
        this._executor = void 0;
      }
      _degrade(reason) {
        this._executor = false;
        this.executorKind = "generic";
        this.fallbackReason = reason;
      }
      _cloneKernel(shortcut, overrides) {
        const kernel = shortcut.kernel;
        const settings = Object.assign({
          output: Array.from(kernel.output),
          pipeline: true,
          immutable: true,
          dynamicArguments: true
        }, overrides || {});
        const optional = [ "constants", "constantTypes", "precision", "loopMaxIterations", "strictIntegers", "fixIntegerDivisionAccuracy", "optimizeFloatMemory", "tactic", "functions", "nativeFunctions", "injectedNative", "debug", "randomSeed", "returnType" ];
        if (kernel.declaredArgumentTypes) settings.argumentTypes = kernel.declaredArgumentTypes.slice();
        for (let i = 0; i < optional.length; i++) {
          const name = optional[i];
          if (kernel[name] !== null && kernel[name] !== void 0) settings[name] = kernel[name];
        }
        return this.gpu.createKernel(kernel.source, settings);
      }
      _uploadArg(plan, index, value) {
        const key = "up:" + index;
        let upload = plan.genericClones.get(key);
        if (!upload) {
          const dims = argDimensions(value);
          const source = dims[2] > 1 ? "function (v) { return v[this.thread.z][this.thread.y][this.thread.x]; }" : dims[1] > 1 ? "function (v) { return v[this.thread.y][this.thread.x]; }" : "function (v) { return v[this.thread.x]; }";
          const output = dims[2] > 1 ? [ dims[0], dims[1], dims[2] ] : dims[1] > 1 ? [ dims[0], dims[1] ] : [ dims[0] ];
          upload = this.gpu.createKernel(source, {
            output: output,
            pipeline: true,
            immutable: false
          });
          plan.genericClones.set(key, upload);
        }
        return upload(value);
      }
      _genericEagerUploadsPay(plan) {
        if (plan.kernels.length === 0) return false;
        return plan.kernels[0].clone.kernel.constructor.mode === "gpu";
      }
      _eagerUploads(plan, args) {
        const uploaded = new Array(args.length).fill(null);
        for (let i = 0; i < plan.steps.length; i++) {
          const bindings = plan.steps[i].argBindings;
          for (let j = 0; j < bindings.length; j++) {
            const binding = bindings[j];
            if (binding.source !== "pipelineArg" || uploaded[binding.index]) continue;
            const value = args[binding.index];
            if (!value || typeof value !== "object") continue;
            if (typeof value.toArray === "function" && !(value instanceof Input)) continue;
            if (plan.genericArgDims) {
              const known = plan.genericArgDims.get(binding.index);
              if (known !== void 0 && known !== argDimensions(value).join("x")) return null;
            }
            const handle = this._uploadArg(plan, binding.index, value);
            if (handle && typeof handle.then === "function") return null;
            uploaded[binding.index] = handle;
          }
        }
        return uploaded;
      }
      async _executeGeneric(plan, args, preUploaded) {
        const slots = new Array(plan.buffers.length).fill(null);
        if (!plan.genericArgDims) plan.genericArgDims = new Map;
        for (let i = 0; i < args.length; i++) {
          const value = args[i];
          if (!value || typeof value !== "object") continue;
          if (typeof value.toArray === "function" && !(value instanceof Input)) continue;
          const dims = argDimensions(value).join("x");
          const known = plan.genericArgDims.get(i);
          if (known === void 0) plan.genericArgDims.set(i, dims); else if (known !== dims) {
            const gpuKernels = this.gpu && this.gpu.kernels;
            for (const clone of plan.genericClones.values()) if (!gpuKernels || gpuKernels.indexOf(clone.kernel) !== -1) clone.destroy();
            plan.genericClones.clear();
            plan.genericArgDims = new Map([ [ i, dims ] ]);
            break;
          }
        }
        const backendMode = plan.kernels.length > 0 ? plan.kernels[0].clone.kernel.constructor.mode : null;
        const uploadsPay = backendMode === "gpu" || backendMode === "webgpu";
        const uploaded = preUploaded || new Array(args.length).fill(null);
        if (uploadsPay && !preUploaded) for (let i = 0; i < plan.steps.length; i++) {
          const bindings = plan.steps[i].argBindings;
          for (let j = 0; j < bindings.length; j++) {
            const binding = bindings[j];
            if (binding.source !== "pipelineArg" || uploaded[binding.index]) continue;
            const value = args[binding.index];
            if (!value || typeof value !== "object") continue;
            if (typeof value.toArray === "function" && !(value instanceof Input)) continue;
            let handle = this._uploadArg(plan, binding.index, value);
            if (handle && typeof handle.then === "function") handle = await handle;
            uploaded[binding.index] = handle;
          }
        }
        try {
          for (let i = 0; i < plan.steps.length; i++) {
            const step = plan.steps[i];
            const bindings = step.argBindings;
            const resolved = new Array(bindings.length);
            for (let j = 0; j < bindings.length; j++) {
              const binding = bindings[j];
              if (binding.source === "pipelineArg") resolved[j] = uploaded[binding.index] || args[binding.index]; else if (binding.source === "step") resolved[j] = slots[plan.steps[binding.step].outputBuffer]; else resolved[j] = binding.value;
            }
            let output = this._genericClone(plan, step).apply(null, resolved);
            if (output && typeof output.then === "function") output = await output;
            slots[step.outputBuffer] = output;
          }
          const results = plan.results;
          const values = new Array(results.entries.length);
          for (let i = 0; i < results.entries.length; i++) {
            const binding = results.entries[i].binding;
            let value;
            if (binding.source === "pipelineArg") value = args[binding.index]; else if (binding.source === "step") value = slots[plan.steps[binding.step].outputBuffer]; else value = binding.value;
            if (value && typeof value.toArray === "function") {
              value = value.toArray();
              if (value && typeof value.then === "function") value = await value;
            } else if (binding.source === "step") value = copyPlainResult(value);
            values[i] = value;
          }
          if (results.kind === "single") return values[0];
          if (results.kind === "array") return values;
          const shaped = {};
          for (let i = 0; i < results.entries.length; i++) shaped[results.entries[i].key] = values[i];
          return shaped;
        } finally {
          slots.length = 0;
        }
      }
      _releasePlan() {
        if (this._executor) this._executor.destroy();
        this._executor = void 0;
        this.executorKind = "generic";
        this.fallbackReason = null;
        if (!this.plan) return;
        const kernels = this.plan.kernels;
        const gpuKernels = this.gpu && this.gpu.kernels;
        for (let i = 0; i < kernels.length; i++) {
          const clone = kernels[i].clone;
          if (!gpuKernels || gpuKernels.indexOf(clone.kernel) !== -1) clone.destroy();
        }
        for (const clone of this.plan.genericClones.values()) if (!gpuKernels || gpuKernels.indexOf(clone.kernel) !== -1) clone.destroy();
        this.plan.genericClones.clear();
        if (this.plan.held) releaseSnapshots(this.plan.held);
        this.plan = null;
      }
    };
    function argDimensions(value) {
      const dims = value instanceof Input ? Array.from(value.size) : Array.from(utils.getDimensions(value));
      while (dims.length < 3) dims.push(1);
      return dims;
    }
    function copyPlainResult(value) {
      if (ArrayBuffer.isView(value)) return value.slice(0);
      if (Array.isArray(value)) return value.map(copyPlainResult);
      return value;
    }
    function noop() {}
    module.exports = {
      Pipeline: Pipeline,
      PipelineHandle: PipelineHandle,
      getActiveTrace: getActiveTrace
    };
  });
  var require_kernel_run_shortcut = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    const {Input: Input} = require_input();
    const {getActiveTrace: getActiveTrace} = require_pipeline();
    function kernelRunShortcut(kernel) {
      const MAX_SWITCHES = 4;
      function syncBody(args) {
        kernel.build.apply(kernel, args);
        kernel.checkArgumentTypes(args);
        let result = kernel.switchingKernels ? void 0 : kernel.run.apply(kernel, args);
        for (let i = 0; kernel.switchingKernels; i++) {
          if (i >= MAX_SWITCHES) {
            const reasons = kernel.resetSwitchingKernels();
            throw new Error(`this kernel cannot run the arguments it was given (${describeReasons(reasons)}); it did not settle on a kernel for them after ${MAX_SWITCHES} attempts. Create a separate kernel for this call's argument types.`);
          }
          const reasons = kernel.resetSwitchingKernels();
          const newKernel = kernel.onRequestSwitchKernel(reasons, args, kernel);
          shortcut.kernel = kernel = newKernel;
          newKernel.checkArgumentTypes(args);
          result = newKernel.switchingKernels ? void 0 : newKernel.run.apply(newKernel, args);
          if (newKernel.fallbackRequested) result = kernel.run.apply(kernel, args);
        }
        return result;
      }
      function describeReasons(reasons) {
        if (!reasons || !reasons.length) return "unknown reason";
        return reasons.map(reason => {
          if (reason.type === "argumentTypeMismatch") return `argument ${reason.index} is now ${reason.needed}`;
          return reason.type;
        }).join(", ");
      }
      function syncRun(args) {
        const result = syncBody(args);
        if (kernel.renderKernels) return kernel.renderKernels(); else if (kernel.renderOutput) return kernel.renderOutput(); else return result;
      }
      function asyncRun(args) {
        if (kernel.onAsyncModeUpgrade) {
          const upgrade = kernel.onAsyncModeUpgrade;
          kernel.onAsyncModeUpgrade = null;
          const snapped = snapshotArguments(args);
          return upgrade(snapped, kernel).then(upgradedKernel => {
            if (upgradedKernel) shortcut.replaceKernel(upgradedKernel);
            return asyncRun(snapped);
          });
        }
        try {
          if (kernel.constructor.isAsync === true) {
            kernel.build.apply(kernel, args);
            return Promise.resolve(kernel.run.apply(kernel, args));
          }
          for (let i = 0; i < args.length; i++) if (isWebGPUHandle(args[i])) return resolveHandles(args).then(resolved => asyncRun(resolved));
          const result = syncBody(args);
          if (kernel.renderKernels) return Promise.resolve(kernel.renderKernels()); else if (kernel.renderOutput) {
            if (kernel.renderOutputAsync) return kernel.renderOutputAsync();
            return Promise.resolve(kernel.renderOutput());
          } else return Promise.resolve(result);
        } catch (e) {
          return Promise.reject(e);
        }
      }
      function isWebGPUHandle(value) {
        return Boolean(value) && value.type === "WebGPUBuffer";
      }
      function resolveHandles(args) {
        const snapped = snapshotArguments(args);
        const pending = [];
        for (let i = 0; i < snapped.length; i++) if (isWebGPUHandle(snapped[i])) {
          const index = i;
          pending.push(Promise.resolve(snapped[index].toArray()).then(value => {
            snapped[index] = value;
          }));
        }
        return Promise.all(pending).then(() => snapped);
      }
      function snapshotArguments(args) {
        const copy = new Array(args.length);
        for (let i = 0; i < args.length; i++) copy[i] = snapshotValue(args[i]);
        return copy;
      }
      function snapshotValue(value) {
        if (!value || typeof value !== "object") return value;
        if (isWebGPUHandle(value) || typeof value.delete === "function") return value;
        if (ArrayBuffer.isView(value)) return value.slice(0);
        if (Array.isArray(value)) return value.map(snapshotValue);
        if (value instanceof Input) return new Input(snapshotValue(value.value), value.size);
        return value;
      }
      function run() {
        const trace = getActiveTrace();
        if (trace) return trace.recordKernelCall(shortcut, arguments);
        if (kernel.constructor.isAsync === true || kernel.asyncMode === true) return asyncRun(arguments);
        return syncRun(arguments);
      }
      const shortcut = function() {
        return run.apply(kernel, arguments);
      };
      shortcut.exec = function() {
        return new Promise((accept, reject) => {
          try {
            accept(run.apply(this, arguments));
          } catch (e) {
            reject(e);
          }
        });
      };
      shortcut.replaceKernel = function(replacementKernel) {
        kernel = replacementKernel;
        bindKernelToShortcut(kernel, shortcut);
      };
      bindKernelToShortcut(kernel, shortcut);
      return shortcut;
    }
    function bindKernelToShortcut(kernel, shortcut) {
      if (shortcut.kernel) {
        shortcut.kernel = kernel;
        return;
      }
      const properties = utils.allPropertiesOf(kernel);
      for (let i = 0; i < properties.length; i++) {
        const property = properties[i];
        if (property[0] === "_" && property[1] === "_") continue;
        if (typeof kernel[property] === "function") if (property.substring(0, 3) === "add" || property.substring(0, 3) === "set") shortcut[property] = function() {
          shortcut.kernel[property].apply(shortcut.kernel, arguments);
          return shortcut;
        }; else shortcut[property] = function() {
          return shortcut.kernel[property].apply(shortcut.kernel, arguments);
        }; else {
          shortcut.__defineGetter__(property, () => shortcut.kernel[property]);
          shortcut.__defineSetter__(property, value => {
            shortcut.kernel[property] = value;
          });
        }
      }
      shortcut.kernel = kernel;
    }
    module.exports = {
      kernelRunShortcut: kernelRunShortcut
    };
  });
  var require_gpu = __commonJSMin((exports, module) => {
    const {gpuMock: gpuMock} = require_gpu_mock_js();
    const {utils: utils} = require_utils();
    const {Kernel: Kernel} = require_kernel$7();
    const {CPUKernel: CPUKernel} = require_kernel$6();
    const {HeadlessGLKernel: HeadlessGLKernel} = require_kernel$3();
    const {WebGL2Kernel: WebGL2Kernel} = require_kernel$2();
    const {WebGLKernel: WebGLKernel} = require_kernel$4();
    const {WebGPUKernel: WebGPUKernel} = require_kernel$1();
    const {WebAssemblyKernel: WebAssemblyKernel} = require_kernel();
    const {kernelRunShortcut: kernelRunShortcut} = require_kernel_run_shortcut();
    const {Pipeline: Pipeline} = require_pipeline();
    const kernelOrder = [ HeadlessGLKernel, WebGL2Kernel, WebGLKernel, WebAssemblyKernel ];
    const kernelTypes = [ "gpu", "cpu" ];
    const internalKernels = {
      headlessgl: HeadlessGLKernel,
      webgl2: WebGL2Kernel,
      webgl: WebGLKernel,
      webgpu: WebGPUKernel,
      webasm: WebAssemblyKernel
    };
    let validate = true;
    var GPU = class GPU {
      static disableValidation() {
        validate = false;
      }
      static enableValidation() {
        validate = true;
      }
      static get isGPUSupported() {
        return kernelOrder.some(Kernel => Kernel.isSupported);
      }
      static get isKernelMapSupported() {
        return kernelOrder.some(Kernel => Kernel.isSupported && Kernel.features.kernelMap);
      }
      static get isOffscreenCanvasSupported() {
        return typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined" || typeof importScripts !== "undefined";
      }
      static get isWebGLSupported() {
        return WebGLKernel.isSupported;
      }
      static get isWebGL2Supported() {
        return WebGL2Kernel.isSupported;
      }
      static get isHeadlessGLSupported() {
        return HeadlessGLKernel.isSupported;
      }
      static get isWebGPUSupported() {
        return WebGPUKernel.isSupported;
      }
      static isWebGPUAvailable() {
        if (!WebGPUKernel.isSupported) return Promise.resolve(false);
        return navigator.gpu.requestAdapter().then(adapter => adapter !== null, () => false);
      }
      static get isWebAssemblySupported() {
        return WebAssemblyKernel.isSupported;
      }
      static get isCanvasSupported() {
        return typeof HTMLCanvasElement !== "undefined";
      }
      static get isGPUHTMLImageArraySupported() {
        return WebGL2Kernel.isSupported;
      }
      static get isSinglePrecisionSupported() {
        return kernelOrder.some(Kernel => Kernel.isSupported && Kernel.features.isFloatRead && Kernel.features.isTextureFloat);
      }
      constructor(settings) {
        settings = settings || {};
        this.canvas = settings.canvas || null;
        this.context = settings.context || null;
        this.mode = settings.mode;
        this.Kernel = null;
        this._webGPUDecision = null;
        if (settings.mode === "async") if (WebGPUKernel.isSupported) GPU.isWebGPUAvailable().then(available => {
          this._webGPUDecision = available;
        }, () => {
          this._webGPUDecision = false;
        }); else this._webGPUDecision = false;
        this.kernels = [];
        this.pipelines = [];
        this.functions = [];
        this.nativeFunctions = [];
        this.injectedNative = null;
        if (this.mode === "dev") return;
        this.chooseKernel();
        if (settings.functions) for (let i = 0; i < settings.functions.length; i++) this.addFunction(settings.functions[i]);
        if (settings.nativeFunctions) for (const p in settings.nativeFunctions) {
          if (!settings.nativeFunctions.hasOwnProperty(p)) continue;
          const s = settings.nativeFunctions[p];
          const {name: name, source: source} = s;
          this.addNativeFunction(name, source, s);
        }
      }
      chooseKernel() {
        if (this.Kernel) return;
        let Kernel = null;
        if (this.context) {
          for (let i = 0; i < kernelOrder.length; i++) {
            const ExternalKernel = kernelOrder[i];
            if (ExternalKernel.isContextMatch(this.context)) {
              if (!ExternalKernel.isSupported) throw new Error(`Kernel type ${ExternalKernel.name} not supported`);
              Kernel = ExternalKernel;
              break;
            }
          }
          if (Kernel === null) throw new Error("unknown Context");
        } else if (this.mode) {
          if (this.mode in internalKernels) {
            if (!validate || internalKernels[this.mode].isSupported) Kernel = internalKernels[this.mode];
          } else if (this.mode === "gpu") {
            for (let i = 0; i < kernelOrder.length; i++) if (kernelOrder[i].isSupported) {
              Kernel = kernelOrder[i];
              break;
            }
          } else if (this.mode === "async") {
            for (let i = 0; i < kernelOrder.length; i++) if (kernelOrder[i].isSupported) {
              Kernel = kernelOrder[i];
              break;
            }
            if (!Kernel) Kernel = CPUKernel;
          } else if (this.mode === "cpu") Kernel = CPUKernel;
          if (!Kernel) throw new Error(`A requested mode of "${this.mode}" and is not supported`);
        } else {
          for (let i = 0; i < kernelOrder.length; i++) if (kernelOrder[i].isSupported) {
            Kernel = kernelOrder[i];
            break;
          }
          if (!Kernel) Kernel = CPUKernel;
        }
        if (!this.mode) this.mode = Kernel.mode;
        this.Kernel = Kernel;
      }
      createKernel(source, settings) {
        if (typeof source === "undefined") throw new Error("Missing source parameter");
        if (typeof source !== "object" && !utils.isFunction(source) && typeof source !== "string") throw new Error("source parameter not a function");
        const kernels = this.kernels;
        if (this.mode === "dev") {
          const devKernel = gpuMock(source, upgradeDeprecatedCreateKernelSettings(settings));
          kernels.push(devKernel);
          return devKernel;
        }
        source = typeof source === "function" ? source.toString() : source;
        const switchableKernels = {};
        const settingsCopy = upgradeDeprecatedCreateKernelSettings(settings) || {};
        if (settings && typeof settings.argumentTypes === "object") settingsCopy.argumentTypes = Object.keys(settings.argumentTypes).map(argumentName => settings.argumentTypes[argumentName]);
        const gpuInstance = this;
        function onRequestFallback(args) {
          console.warn(`Falling back to CPU${kernelRun.fallbackReason ? `: ${kernelRun.fallbackReason}` : ""}`);
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
            onRequestFallback: onRequestFallback,
            onRequestSwitchKernel: onRequestSwitchKernel,
            canvas: kernelRun.graphical && !kernelRun.context ? kernelRun.canvas : null
          });
          fallbackKernel.fallbackReason = kernelRun.fallbackReason;
          fallbackKernel.build.apply(fallbackKernel, args);
          const result = fallbackKernel.run.apply(fallbackKernel, args);
          kernelRun.replaceKernel(fallbackKernel);
          if (!gpuInstance.canvas && fallbackKernel.canvas) gpuInstance.canvas = fallbackKernel.canvas;
          if (!gpuInstance.context && fallbackKernel.context) gpuInstance.context = fallbackKernel.context;
          return result;
        }
        function onRequestSwitchKernel(reasons, args, _kernel) {
          if (_kernel.debug) console.warn("Switching kernels");
          let newOutput = null;
          if (_kernel.signature && !switchableKernels[_kernel.signature]) switchableKernels[_kernel.signature] = _kernel;
          if (_kernel.dynamicOutput) for (let i = reasons.length - 1; i >= 0; i--) {
            const reason = reasons[i];
            if (reason.type === "outputPrecisionMismatch") newOutput = reason.needed;
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
            argumentTypes: argumentTypes,
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
            validate: validate,
            returnType: _kernel.returnType,
            tactic: _kernel.tactic,
            onRequestFallback: onRequestFallback,
            onRequestSwitchKernel: onRequestSwitchKernel,
            texture: _kernel.texture,
            mappedTextures: _kernel.mappedTextures,
            drawBuffersMap: _kernel.drawBuffersMap
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
          validate: validate,
          onRequestFallback: onRequestFallback,
          onRequestSwitchKernel: onRequestSwitchKernel
        }, settingsCopy);
        if (this.mode === "async") mergedSettings.asyncMode = true;
        let ChosenKernel = this.Kernel;
        if (this.mode === "async" && settingsCopy.graphical && this._webGPUDecision === true) {
          ChosenKernel = WebGPUKernel;
          if (mergedSettings.canvas === this.canvas) mergedSettings.canvas = settingsCopy.canvas || null;
          if (mergedSettings.context === this.context) mergedSettings.context = settingsCopy.context || null;
          mergedSettings.asyncMode = true;
        }
        let kernel;
        try {
          kernel = new ChosenKernel(source, mergedSettings);
        } catch (e) {
          if (ChosenKernel !== this.Kernel) kernel = new this.Kernel(source, Object.assign({}, mergedSettings, {
            canvas: this.canvas,
            context: this.context
          })); else throw e;
        }
        const kernelRun = kernelRunShortcut(kernel);
        if (this.mode === "async" && WebGPUKernel.isSupported && !(kernel instanceof WebGPUKernel)) {
          const gpu = this;
          kernel.onAsyncModeUpgrade = function onAsyncModeUpgrade(args, currentKernel) {
            return GPU.isWebGPUAvailable().then(available => {
              if (!available) return null;
              if (currentKernel.graphical) {
                if (currentKernel.debug) console.warn("webgpu upgrade declined: graphical kernels keep their canvas");
                return null;
              }
              let webGPUKernel;
              try {
                webGPUKernel = new WebGPUKernel(source, {
                  functions: currentKernel.functions,
                  nativeFunctions: currentKernel.nativeFunctions,
                  injectedNative: currentKernel.injectedNative,
                  gpu: gpu,
                  validate: validate,
                  asyncMode: true,
                  output: currentKernel.output,
                  pipeline: currentKernel.pipeline,
                  immutable: currentKernel.immutable,
                  dynamicOutput: currentKernel.dynamicOutput,
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
                  debug: currentKernel.debug
                });
                webGPUKernel.build.apply(webGPUKernel, args);
              } catch (e) {
                if (currentKernel.debug) console.warn("webgpu upgrade declined: " + e.message);
                return null;
              }
              return webGPUKernel._buildPromise.then(() => {
                kernels.push(webGPUKernel);
                return webGPUKernel;
              }, e => {
                if (currentKernel.debug) console.warn("webgpu upgrade declined: " + e.message);
                webGPUKernel.destroy();
                return null;
              });
            }, () => null);
          };
        }
        if (!this.canvas) this.canvas = kernel.canvas;
        if (!this.context) this.context = kernel.context;
        kernels.push(kernel);
        return kernelRun;
      }
      createPipeline(fn, settings) {
        if (typeof fn !== "function") throw new Error("createPipeline requires an orchestration function");
        if (this.mode === "dev") throw new Error("createPipeline is not supported in dev mode");
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
        Object.defineProperty(shortcut, "executorKind", {
          get: () => pipeline.executorKind
        });
        Object.defineProperty(shortcut, "fallbackReason", {
          get: () => pipeline.fallbackReason
        });
        Object.defineProperty(shortcut, "plan", {
          get: () => pipeline.plan
        });
        Object.defineProperty(shortcut, "backend", {
          get: () => {
            const kind = pipeline.executorKind;
            if (kind === "fused-sync" || kind === "fused-threaded") return "webasm";
            if (kind === "fused-encoder") return "webgpu";
            const plan = pipeline.plan;
            if (!plan) return null;
            for (const [key, clone] of plan.genericClones) if (key.indexOf("up:") !== 0) return clone.kernel.constructor.mode;
            return plan.kernels.length > 0 ? plan.kernels[0].clone.kernel.constructor.mode : null;
          }
        });
        return shortcut;
      }
      createKernelMap() {
        let fn;
        let settings;
        const argument2Type = typeof arguments[arguments.length - 2];
        if (argument2Type === "function" || argument2Type === "string") {
          fn = arguments[arguments.length - 2];
          settings = arguments[arguments.length - 1];
        } else fn = arguments[arguments.length - 1];
        if (this.mode !== "dev") {
          if (!this.Kernel.isSupported || !this.Kernel.features.kernelMap) {
            if (this.Kernel.mode === "webgpu") throw new Error("WebGPU backend does not yet support createKernelMap");
            if (this.mode && kernelTypes.indexOf(this.mode) < 0 && this.Kernel.mode !== "webasm") throw new Error(`kernelMap not supported on ${this.Kernel.name}`);
          }
        }
        const settingsCopy = upgradeDeprecatedCreateKernelSettings(settings);
        if (settings && typeof settings.argumentTypes === "object") settingsCopy.argumentTypes = Object.keys(settings.argumentTypes).map(argumentName => settings.argumentTypes[argumentName]);
        if (Array.isArray(arguments[0])) {
          settingsCopy.subKernels = [];
          const functions = arguments[0];
          for (let i = 0; i < functions.length; i++) {
            const source = functions[i].toString();
            const name = utils.getFunctionNameFromString(source);
            settingsCopy.subKernels.push({
              name: name,
              source: source,
              property: i
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
              source: source,
              property: p
            });
          }
        }
        return this.createKernel(fn, settingsCopy);
      }
      combineKernels() {
        const firstKernel = arguments[0];
        const combinedKernel = arguments[arguments.length - 1];
        if (this.mode === "async" || firstKernel.kernel.asyncMode) throw new Error(`mode 'async' does not yet support combineKernels; chain kernels with \`await\` and pipeline mode instead`);
        if (firstKernel.kernel.constructor.mode === "cpu") return combinedKernel;
        if (firstKernel.kernel.constructor.mode === "webgpu") throw new Error("WebGPU backend does not yet support combineKernels; chain kernels with `await` and pipeline mode instead");
        const canvas = arguments[0].canvas;
        const context = arguments[0].context;
        const max = arguments.length - 1;
        for (let i = 0; i < max; i++) arguments[i].setCanvas(canvas).setContext(context).setPipeline(true);
        return function() {
          const texture = combinedKernel.apply(this, arguments);
          if (texture.toArray) return texture.toArray();
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
      addFunction(source, settings) {
        this.functions.push({
          source: source,
          settings: settings
        });
        return this;
      }
      addNativeFunction(name, source, settings) {
        if (this.kernels.length > 0) throw new Error('Cannot call "addNativeFunction" after "createKernels" has been called.');
        this.nativeFunctions.push(Object.assign({
          name: name,
          source: source
        }, settings));
        return this;
      }
      injectNative(source) {
        this.injectedNative = source;
        return this;
      }
      destroy() {
        return new Promise((resolve, reject) => {
          if (!this.kernels) resolve();
          setTimeout(() => {
            try {
              let pipelinesDone = Promise.resolve();
              if (this.pipelines) {
                const pipelines = this.pipelines.slice();
                pipelinesDone = Promise.all(pipelines.map(pipeline => Promise.resolve(pipeline.destroy()).catch(() => void 0)));
              }
              const destroyKernels = () => {
                try {
                  const kernels = this.kernels.slice();
                  for (let i = 0; i < kernels.length; i++) kernels[i].destroy(true);
                  let firstKernel = kernels[0];
                  if (firstKernel) {
                    if (firstKernel.kernel) firstKernel = firstKernel.kernel;
                    if (firstKernel.constructor.destroyContext) firstKernel.constructor.destroyContext(this.context);
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
    };
    function upgradeDeprecatedCreateKernelSettings(settings) {
      if (!settings) return {};
      const upgradedSettings = Object.assign({}, settings);
      if (settings.hasOwnProperty("floatOutput")) {
        utils.warnDeprecated("setting", "floatOutput", "precision");
        upgradedSettings.precision = settings.floatOutput ? "single" : "unsigned";
      }
      if (settings.hasOwnProperty("outputToTexture")) {
        utils.warnDeprecated("setting", "outputToTexture", "pipeline");
        upgradedSettings.pipeline = Boolean(settings.outputToTexture);
      }
      if (settings.hasOwnProperty("outputImmutable")) {
        utils.warnDeprecated("setting", "outputImmutable", "immutable");
        upgradedSettings.immutable = Boolean(settings.outputImmutable);
      }
      if (settings.hasOwnProperty("floatTextures")) {
        utils.warnDeprecated("setting", "floatTextures", "optimizeFloatMemory");
        upgradedSettings.optimizeFloatMemory = Boolean(settings.floatTextures);
      }
      return upgradedSettings;
    }
    module.exports = {
      GPU: GPU,
      kernelOrder: kernelOrder,
      kernelTypes: kernelTypes
    };
  });
  var require_alias = __commonJSMin((exports, module) => {
    const {utils: utils} = require_utils();
    function alias(name, source) {
      const fnString = source.toString();
      return new Function(`return function ${name} (${utils.getArgumentNamesFromString(fnString).join(", ")}) {\n  ${utils.getFunctionBodyFromString(fnString)}\n}`)();
    }
    module.exports = {
      alias: alias
    };
  });
  var require_src = __commonJSMin((exports, module) => {
    const {GPU: GPU} = require_gpu();
    const {alias: alias} = require_alias();
    const {utils: utils} = require_utils();
    const {Input: Input, input: input} = require_input();
    const {Texture: Texture} = require_texture$1();
    const {FunctionBuilder: FunctionBuilder} = require_function_builder();
    const {FunctionNode: FunctionNode} = require_function_node$5();
    const {CPUFunctionNode: CPUFunctionNode} = require_function_node$4();
    const {CPUKernel: CPUKernel} = require_kernel$6();
    const {HeadlessGLKernel: HeadlessGLKernel} = require_kernel$3();
    const {WebGLFunctionNode: WebGLFunctionNode} = require_function_node$3();
    const {WebGLKernel: WebGLKernel} = require_kernel$4();
    const {kernelValueMaps: webGLKernelValueMaps} = require_kernel_value_maps$1();
    const {WebGL2FunctionNode: WebGL2FunctionNode} = require_function_node$2();
    const {WebGL2Kernel: WebGL2Kernel} = require_kernel$2();
    const {kernelValueMaps: webGL2KernelValueMaps} = require_kernel_value_maps();
    const {WGSLFunctionNode: WGSLFunctionNode} = require_function_node$1();
    const {WebGPUKernel: WebGPUKernel} = require_kernel$1();
    const {WebGPUContext: WebGPUContext} = require_context();
    const {WebGPUBufferResult: WebGPUBufferResult} = require_buffer_result();
    const {WebAssemblyFunctionNode: WebAssemblyFunctionNode} = require_function_node();
    const {WebAssemblyKernel: WebAssemblyKernel} = require_kernel();
    const {GLKernel: GLKernel} = require_kernel$5();
    const {Kernel: Kernel} = require_kernel$7();
    const {FunctionTracer: FunctionTracer} = require_function_tracer();
    module.exports = {
      alias: alias,
      CPUFunctionNode: CPUFunctionNode,
      CPUKernel: CPUKernel,
      GPU: GPU,
      FunctionBuilder: FunctionBuilder,
      FunctionNode: FunctionNode,
      HeadlessGLKernel: HeadlessGLKernel,
      Input: Input,
      input: input,
      Texture: Texture,
      utils: utils,
      WebGL2FunctionNode: WebGL2FunctionNode,
      WebGL2Kernel: WebGL2Kernel,
      webGL2KernelValueMaps: webGL2KernelValueMaps,
      WebGLFunctionNode: WebGLFunctionNode,
      WebGLKernel: WebGLKernel,
      webGLKernelValueMaps: webGLKernelValueMaps,
      WGSLFunctionNode: WGSLFunctionNode,
      WebGPUKernel: WebGPUKernel,
      WebGPUContext: WebGPUContext,
      WebGPUBufferResult: WebGPUBufferResult,
      WebAssemblyFunctionNode: WebAssemblyFunctionNode,
      WebAssemblyKernel: WebAssemblyKernel,
      GLKernel: GLKernel,
      Kernel: Kernel,
      FunctionTracer: FunctionTracer,
      plugins: {
        mathRandom: require_math_random_uniformly_distributed()
      }
    };
  });
  return __commonJSMin((exports, module) => {
    const lib = require_src();
    const GPU = lib.GPU;
    for (const p in lib) {
      if (!lib.hasOwnProperty(p)) continue;
      if (p === "GPU") continue;
      GPU[p] = lib[p];
    }
    GPU.GPU = GPU;
    if (typeof window !== "undefined") bindTo(window);
    if (typeof self !== "undefined") bindTo(self);
    function bindTo(target) {
      if (target.GPU && target.GPU.prototype && target.GPU.prototype.createKernel) return;
      Object.defineProperty(target, "GPU", {
        configurable: true,
        get() {
          return GPU;
        },
        set() {}
      });
    }
    module.exports = GPU;
  })();
});