/**
 * gpu.js
 * https://gpu.rocks/
 *
 * GPU Accelerated JavaScript
 *
 * @version 2.0.5
 * @date Tue Oct 29 2019 10:46:59 GMT-0400 (Eastern Daylight Time)
 *
 * @license MIT
 * The MIT License
 *
 * Copyright (c) 2019 gpu.js Team
 */
var GPU = (function (acorn) {
  'use strict';

  function setupArguments(args) {
    const newArguments = new Array(args.length);
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.toArray) {
        newArguments[i] = arg.toArray();
      } else {
        newArguments[i] = arg;
      }
    }
    return newArguments;
  }
  function mock1D() {
    const args = setupArguments(arguments);
    const row = new Float32Array(this.output.x);
    for (let x = 0; x < this.output.x; x++) {
      this.thread.x = x;
      this.thread.y = 0;
      this.thread.z = 0;
      row[x] = this._fn.apply(this, args);
    }
    return row;
  }
  function mock2D() {
    const args = setupArguments(arguments);
    const matrix = new Array(this.output.y);
    for (let y = 0; y < this.output.y; y++) {
      const row = new Float32Array(this.output.x);
      for (let x = 0; x < this.output.x; x++) {
        this.thread.x = x;
        this.thread.y = y;
        this.thread.z = 0;
        row[x] = this._fn.apply(this, args);
      }
      matrix[y] = row;
    }
    return matrix;
  }
  function mock2DGraphical() {
    const args = setupArguments(arguments);
    for (let y = 0; y < this.output.y; y++) {
      for (let x = 0; x < this.output.x; x++) {
        this.thread.x = x;
        this.thread.y = y;
        this.thread.z = 0;
        this._fn.apply(this, args);
      }
    }
  }
  function mock3D() {
    const args = setupArguments(arguments);
    const cube = new Array(this.output.z);
    for (let z = 0; z < this.output.z; z++) {
      const matrix = new Array(this.output.y);
      for (let y = 0; y < this.output.y; y++) {
        const row = new Float32Array(this.output.x);
        for (let x = 0; x < this.output.x; x++) {
          this.thread.x = x;
          this.thread.y = y;
          this.thread.z = z;
          row[x] = this._fn.apply(this, args);
        }
        matrix[y] = row;
      }
      cube[z] = matrix;
    }
    return cube;
  }
  function apiDecorate(kernel) {
    kernel.setOutput = (output) => {
      kernel.output = setupOutput(output);
      if (kernel.graphical) {
        setupGraphical(kernel);
      }
    };
    kernel.toJSON = () => {
      throw new Error('Not usable with gpuMock');
    };
    kernel.setConstants = (flag) => {
      kernel.constants = flag;
      return kernel;
    };
    kernel.setGraphical = (flag) => {
      kernel.graphical = flag;
      return kernel;
    };
    kernel.setCanvas = (flag) => {
      kernel.canvas = flag;
      return kernel;
    };
    kernel.setContext = (flag) => {
      kernel.context = flag;
      return kernel;
    };
    kernel.exec = function() {
      return new Promise((resolve, reject) => {
        try {
          resolve(kernel.apply(kernel, arguments));
        } catch(e) {
          reject(e);
        }
      });
    };
    kernel.getPixels = (flip) => {
      const {x, y} = kernel.output;
      return flip ? flipPixels(kernel._imageData.data, x, y) : kernel._imageData.data.slice(0);
    };
    kernel.color = function(r, g, b, a) {
      if (typeof a === 'undefined') {
        a = 1;
      }
      r = Math.floor(r * 255);
      g = Math.floor(g * 255);
      b = Math.floor(b * 255);
      a = Math.floor(a * 255);
      const width = kernel.output.x;
      const height = kernel.output.y;
      const x = kernel.thread.x;
      const y = height - kernel.thread.y - 1;
      const index = x + y * width;
      kernel._colorData[index * 4 + 0] = r;
      kernel._colorData[index * 4 + 1] = g;
      kernel._colorData[index * 4 + 2] = b;
      kernel._colorData[index * 4 + 3] = a;
    };
    kernel.setWarnVarUsage = () => {
      return kernel;
    };
    kernel.setOptimizeFloatMemory = () => {
      return kernel;
    };
    kernel.setArgumentTypes = () => {
      return kernel;
    };
    kernel.setDebug = () => {
      return kernel;
    };
    kernel.setLoopMaxIterations = () => {
      return kernel;
    };
    kernel.setPipeline = () => {
      return kernel;
    };
    kernel.setPrecision = () => {
      return kernel;
    };
    kernel.setImmutable = () => {
      return kernel;
    };
    kernel.setFunctions = () => {
      return kernel;
    };
    kernel.addSubKernel = () => {
      return kernel;
    };
    kernel.destroy = () => {};
    kernel.validateSettings = () => {};
    if (kernel.graphical && kernel.output) {
      setupGraphical(kernel);
    }
    return kernel;
  }
  function setupGraphical(kernel) {
    const {x, y} = kernel.output;
    if (kernel.context && kernel.context.createImageData) {
      const data = new Uint8ClampedArray(x * y * 4);
      kernel._imageData = kernel.context.createImageData(x, y);
      kernel._colorData = data;
    } else {
      const data = new Uint8ClampedArray(x * y * 4);
      kernel._imageData = { data };
      kernel._colorData = data;
    }
  }
  function setupOutput(output) {
    let result = null;
    if (output.length) {
      if (output.length === 3) {
        const [x,y,z] = output;
        result = { x, y, z };
      } else if (output.length === 2) {
        const [x,y] = output;
        result = { x, y };
      } else {
        const [x] = output;
        result = { x };
      }
    } else {
      result = output;
    }
    return result;
  }
  function gpuMock(fn, settings = {}) {
    const output = settings.output ? setupOutput(settings.output) : null;
    function kernel() {
      if (kernel.output.z) {
        return mock3D.apply(kernel, arguments);
      } else if (kernel.output.y) {
        if (kernel.graphical) {
          return mock2DGraphical.apply(kernel, arguments);
        }
        return mock2D.apply(kernel, arguments);
      } else {
        return mock1D.apply(kernel, arguments);
      }
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
  var gpuMock_js = {
    gpuMock
  };
  var gpuMock_js_1 = gpuMock_js.gpuMock;

  const ARGUMENT_NAMES = /([^\s,]+)/g;
  const FUNCTION_NAME = /function ([^(]*)/;
  const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
  function isFunction(funcObj) {
    return typeof(funcObj) === 'function';
  }function getFunctionNameFromString(funcStr) {
    return FUNCTION_NAME.exec(funcStr)[1].trim();
  }function functionToIFunction(source, settings) {
    settings = settings || {};
    if (typeof source !== 'string' && typeof source !== 'function') throw new Error('source not a string or function');
    const sourceString = typeof source === 'string' ? source : source.toString();
    let argumentTypes = [];
    if (Array.isArray(settings.argumentTypes)) {
      argumentTypes = settings.argumentTypes;
    } else if (typeof settings.argumentTypes === 'object') {
      argumentTypes = getArgumentNamesFromString(sourceString)
        .map(name => settings.argumentTypes[name]) || [];
    } else {
      argumentTypes = settings.argumentTypes || [];
    }
    return {
      source: sourceString,
      argumentTypes,
      returnType: settings.returnType || null,
    };
  }function warnDeprecated(type, oldName, newName) {
    const msg = newName
      ? `It has been replaced with "${ newName }"`
      : 'It has been removed';
    console.warn(`You are using a deprecated ${ type } "${ oldName }". ${msg}. Fixing, but please upgrade as it will soon be removed.`);
  }function isFunctionString(fn) {
    if (typeof fn === 'string') {
      return (fn
        .slice(0, 'function'.length)
        .toLowerCase() === 'function');
    }
    return false;
  }function getArgumentNamesFromString(fn) {
    const fnStr = fn.replace(STRIP_COMMENTS, '');
    let result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    if (result === null) {
      result = [];
    }
    return result;
  }function isArray(array) {
    return !isNaN(array.length);
  }function erectMemoryOptimized2DFloat(array, width, height) {
    const yResults = new Array(height);
    for (let y = 0; y < height; y++) {
      const offset = y * width;
      yResults[y] = array.subarray(offset, offset + width);
    }
    return yResults;
  }function erectMemoryOptimized3DFloat(array, width, height, depth) {
    const zResults = new Array(depth);
    for (let z = 0; z < depth; z++) {
      const yResults = new Array(height);
      for (let y = 0; y < height; y++) {
        const offset = (z * height * width) + (y * width);
        yResults[y] = array.subarray(offset, offset + width);
      }
      zResults[z] = yResults;
    }
    return zResults;
  }function getAstString(source, ast) {
    const lines = Array.isArray(source) ? source : source.split(/\r?\n/g);
    const start = ast.loc.start;
    const end = ast.loc.end;
    const result = [];
    if (start.line === end.line) {
      result.push(lines[start.line - 1].substring(start.column, end.column));
    } else {
      result.push(lines[start.line - 1].slice(start.column));
      for (let i = start.line; i < end.line; i++) {
        result.push(lines[i]);
      }
      result.push(lines[end.line - 1].slice(0, end.column));
    }
    return result.join('\n');
  }

  var common = /*#__PURE__*/Object.freeze({
    isFunction: isFunction,
    getFunctionNameFromString: getFunctionNameFromString,
    functionToIFunction: functionToIFunction,
    warnDeprecated: warnDeprecated,
    isFunctionString: isFunctionString,
    getArgumentNamesFromString: getArgumentNamesFromString,
    isArray: isArray,
    erectMemoryOptimized2DFloat: erectMemoryOptimized2DFloat,
    erectMemoryOptimized3DFloat: erectMemoryOptimized3DFloat,
    getAstString: getAstString
  });

  class Input {
    constructor(value, size) {
      this.value = value;
      if (Array.isArray(size)) {
        this.size = size;
      } else {
        this.size = new Int32Array(3);
        if (size.z) {
          this.size = new Int32Array([size.x, size.y, size.z]);
        } else if (size.y) {
          this.size = new Int32Array([size.x, size.y]);
        } else {
          this.size = new Int32Array([size.x]);
        }
      }
      const [w, h, d] = this.size;
      if (d) {
        if (this.value.length !== (w * h * d)) {
          throw new Error(`Input size ${this.value.length} does not match ${w} * ${h} * ${d} = ${(h * w * d)}`);
        }
      } else if (h) {
        if (this.value.length !== (w * h)) {
          throw new Error(`Input size ${this.value.length} does not match ${w} * ${h} = ${(h * w)}`);
        }
      } else {
        if (this.value.length !== w) {
          throw new Error(`Input size ${this.value.length} does not match ${w}`);
        }
      }
    }
    toArray() {
      const [ w, h, d ] = this.size;
      if (d) {
        return erectMemoryOptimized3DFloat(this.value.subarray ? this.value : new Float32Array(this.value), w, h, d);
      } else if (h) {
        return erectMemoryOptimized2DFloat(this.value.subarray ? this.value : new Float32Array(this.value), w, h);
      } else {
        return this.value;
      }
    }
  }function input(value, size) {
    return new Input(value, size);
  }

  class Texture {
    constructor(settings) {
      const {
        texture,
        size,
        dimensions,
        output,
        context,
        type = 'NumberTexture',
      } = settings;
      if (!output) throw new Error('settings property "output" required.');
      if (!context) throw new Error('settings property "context" required.');
      this.texture = texture;
      this.size = size;
      this.dimensions = dimensions;
      this.output = output;
      this.context = context;
      this.kernel = null;
      this.type = type;
    }
    toArray() {
      throw new Error(`Not implemented on ${this.constructor.name}`);
    }
    delete() {
      return this.context.deleteTexture(this.texture);
    }
  }

  function getSystemEndianness() {
    const b = new ArrayBuffer(4);
    const a = new Uint32Array(b);
    const c = new Uint8Array(b);
    a[0] = 0xdeadbeef;
    if (c[0] === 0xef) return 'LE';
    if (c[0] === 0xde) return 'BE';
    throw new Error('unknown endianness');
  }const _systemEndianness = getSystemEndianness();
  function systemEndianness() {
    return _systemEndianness;
  }function getVariableType(value, strictIntegers) {
    if (isArray(value)) {
      if (value[0].nodeName === 'IMG') {
        return 'HTMLImageArray';
      }
      return 'Array';
    }
    switch (value.constructor) {
      case Boolean:
        return 'Boolean';
      case Number:
        return strictIntegers && Number.isInteger(value) ? 'Integer' : 'Float';
      case Texture:
        return value.type;
      case Input:
        return 'Input';
    }
    switch (value.nodeName) {
      case 'IMG':
        return 'HTMLImage';
      case 'VIDEO':
        return 'HTMLVideo';
    }
    return value.hasOwnProperty('type') ? value.type : 'Unknown';
  }const utils$1 = {
    systemEndianness,
    getSystemEndianness,
    isFunction,
    isFunctionString,
    getFunctionNameFromString,
    getFunctionBodyFromString(funcStr) {
      return funcStr.substring(funcStr.indexOf('{') + 1, funcStr.lastIndexOf('}'));
    },
    getArgumentNamesFromString,
    clone(obj) {
      if (obj === null || typeof obj !== 'object' || obj.hasOwnProperty('isActiveClone')) return obj;
      const temp = obj.constructor();
      for (let key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          obj.isActiveClone = null;
          temp[key] = utils$1.clone(obj[key]);
          delete obj.isActiveClone;
        }
      }
      return temp;
    },
    isArray,
    getVariableType,
    getKernelTextureSize(settings, dimensions) {
      let [w, h, d] = dimensions;
      let texelCount = (w || 1) * (h || 1) * (d || 1);
      if (settings.optimizeFloatMemory && settings.precision === 'single') {
        w = texelCount = Math.ceil(texelCount / 4);
      }
      if (h > 1 && w * h === texelCount) {
        return new Int32Array([w, h]);
      }
      return utils$1.closestSquareDimensions(texelCount);
    },
    closestSquareDimensions(length) {
      const sqrt = Math.sqrt(length);
      let high = Math.ceil(sqrt);
      let low = Math.floor(sqrt);
      while (high * low < length) {
        high--;
        low = Math.ceil(length / high);
      }
      return new Int32Array([low, Math.ceil(length / low)]);
    },
    getMemoryOptimizedFloatTextureSize(dimensions, bitRatio) {
      const totalArea = utils$1.roundTo((dimensions[0] || 1) * (dimensions[1] || 1) * (dimensions[2] || 1) * (dimensions[3] || 1), 4);
      const texelCount = totalArea / bitRatio;
      return utils$1.closestSquareDimensions(texelCount);
    },
    getMemoryOptimizedPackedTextureSize(dimensions, bitRatio) {
      const [w, h, d] = dimensions;
      const totalArea = utils$1.roundTo((w || 1) * (h || 1) * (d || 1), 4);
      const texelCount = totalArea / (4 / bitRatio);
      return utils$1.closestSquareDimensions(texelCount);
    },
    roundTo(n, d) {
      return Math.floor((n + d - 1) / d) * d;
    },
    getDimensions(x, pad) {
      let ret;
      if (isArray(x)) {
        const dim = [];
        let temp = x;
        while (isArray(temp)) {
          dim.push(temp.length);
          temp = temp[0];
        }
        ret = dim.reverse();
      } else if (x instanceof Texture) {
        ret = x.output;
      } else if (x instanceof Input) {
        ret = x.size;
      } else {
        throw new Error(`Unknown dimensions of ${x}`);
      }
      if (pad) {
        ret = Array.from(ret);
        while (ret.length < 3) {
          ret.push(1);
        }
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
      for (let z = 0; z < array.length; z++) {
        for (let y = 0; y < array[z].length; y++) {
          target.set(array[z][y], offset);
          offset += array[z][y].length;
        }
      }
    },
    flatten4dArrayTo(array, target) {
      let offset = 0;
      for (let l = 0; l < array.length; l++) {
        for (let z = 0; z < array[l].length; z++) {
          for (let y = 0; y < array[l][z].length; y++) {
            target.set(array[l][z][y], offset);
            offset += array[l][z][y].length;
          }
        }
      }
    },
    flattenTo(array, target) {
      if (isArray(array[0])) {
        if (isArray(array[0][0])) {
          if (isArray(array[0][0][0])) {
            utils$1.flatten4dArrayTo(array, target);
          } else {
            utils$1.flatten3dArrayTo(array, target);
          }
        } else {
          utils$1.flatten2dArrayTo(array, target);
        }
      } else {
        target.set(array);
      }
    },
    splitArray(array, part) {
      const result = [];
      for (let i = 0; i < array.length; i += part) {
        result.push(new array.constructor(array.buffer, i * 4 + array.byteOffset, part));
      }
      return result;
    },
    getAstString,
    allPropertiesOf(obj) {
      const props = [];
      do {
        props.push.apply(props, Object.getOwnPropertyNames(obj));
      } while (obj = Object.getPrototypeOf(obj));
      return props;
    },
    linesToString(lines) {
      if (lines.length > 0) {
        return lines.join(';\n') + ';\n';
      } else {
        return '\n';
      }
    },
    warnDeprecated,
    functionToIFunction,
    flipPixels(pixels, width, height) {
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
    erectPackedFloat: (array, width) => {
      return array.subarray(0, width);
    },
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
          const xStart = (z * height * width) + y * width;
          const xEnd = xStart + width;
          yResults[y] = array.subarray(xStart, xEnd);
        }
        zResults[z] = yResults;
      }
      return zResults;
    },
    erectMemoryOptimizedFloat: (array, width) => {
      return array.subarray(0, width);
    },
    erectMemoryOptimized2DFloat,
    erectMemoryOptimized3DFloat,
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
      for (let x = 0; x < xResultsMax; x += 4) {
        xResults[i++] = array.subarray(x, x + 2);
      }
      return xResults;
    },
    erect2DArray2: (array, width, height) => {
      const yResults = new Array(height);
      const XResultsMax = width * 4;
      for (let y = 0; y < height; y++) {
        const xResults = new Array(width);
        const offset = y * XResultsMax;
        let i = 0;
        for (let x = 0; x < XResultsMax; x += 4) {
          xResults[i++] = array.subarray(x + offset, x + offset + 2);
        }
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
          const offset = (z * xResultsMax * height) + (y * xResultsMax);
          let i = 0;
          for (let x = 0; x < xResultsMax; x += 4) {
            xResults[i++] = array.subarray(x + offset, x + offset + 2);
          }
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
      for (let x = 0; x < xResultsMax; x += 4) {
        xResults[i++] = array.subarray(x, x + 3);
      }
      return xResults;
    },
    erect2DArray3: (array, width, height) => {
      const xResultsMax = width * 4;
      const yResults = new Array(height);
      for (let y = 0; y < height; y++) {
        const xResults = new Array(width);
        const offset = y * xResultsMax;
        let i = 0;
        for (let x = 0; x < xResultsMax; x += 4) {
          xResults[i++] = array.subarray(x + offset, x + offset + 3);
        }
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
          const offset = (z * xResultsMax * height) + (y * xResultsMax);
          let i = 0;
          for (let x = 0; x < xResultsMax; x += 4) {
            xResults[i++] = array.subarray(x + offset, x + offset + 3);
          }
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
      for (let x = 0; x < xResultsMax; x += 4) {
        xResults[i++] = array.subarray(x, x + 4);
      }
      return xResults;
    },
    erect2DArray4: (array, width, height) => {
      const xResultsMax = width * 4;
      const yResults = new Array(height);
      for (let y = 0; y < height; y++) {
        const xResults = new Array(width);
        const offset = y * xResultsMax;
        let i = 0;
        for (let x = 0; x < xResultsMax; x += 4) {
          xResults[i++] = array.subarray(x + offset, x + offset + 4);
        }
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
          const offset = (z * xResultsMax * height) + (y * xResultsMax);
          let i = 0;
          for (let x = 0; x < xResultsMax; x += 4) {
            xResults[i++] = array.subarray(x + offset, x + offset + 4);
          }
          yResults[y] = xResults;
        }
        zResults[z] = yResults;
      }
      return zResults;
    },
    flattenFunctionToString: (source, settings) => {
      const { findDependency, thisLookup, doNotDefine } = settings;
      let flattened = settings.flattened;
      if (!flattened) {
        flattened = settings.flattened = {};
      }
      const ast = acorn.parse(source);
      const functionDependencies = [];
      function flatten(ast) {
        if (Array.isArray(ast)) {
          const results = [];
          for (let i = 0; i < ast.length; i++) {
            results.push(flatten(ast[i]));
          }
          return results.join('');
        }
        switch (ast.type) {
          case 'Program':
            return flatten(ast.body);
          case 'FunctionDeclaration':
            return `function ${ast.id.name}(${ast.params.map(flatten).join(', ')}) ${ flatten(ast.body) }`;
          case 'BlockStatement': {
            const result = [];
            for (let i = 0; i < ast.body.length; i++) {
              result.push(flatten(ast.body[i]), ';\n');
            }
            return `{\n${result.join('')}}`;
          }
          case 'VariableDeclaration':
            switch (ast.declarations[0].id.type) {
              case 'ObjectPattern': {
                const source = flatten(ast.declarations[0].init);
                const properties = ast.declarations.map(declaration => declaration.id.properties.map(flatten))[0];
                if (/this/.test(source)) {
                  const result = [];
                  const lookups = properties.map(thisLookup);
                  for (let i = 0; i < lookups.length; i++) {
                    const lookup = lookups[i];
                    if (lookup === null) continue;
                    const property = properties[i];
                    result.push(`${ast.kind} ${ property } = ${ lookup };\n`);
                  }
                  return result.join('');
                }
                return `${ast.kind} { ${properties} } = ${source}`;
              }
              case 'ArrayPattern':
                return `${ast.kind} [ ${ ast.declarations.map(declaration => flatten(declaration.id)).join(', ') } ] = ${flatten(ast.declarations[0].init)}`;
            }
            if (doNotDefine && doNotDefine.indexOf(ast.declarations[0].id.name) !== -1) {
              return '';
            }
            return `${ast.kind} ${ast.declarations[0].id.name} = ${flatten(ast.declarations[0].init)}`;
          case 'CallExpression': {
            if (ast.callee.property.name === 'subarray') {
              return `${flatten(ast.callee.object)}.${flatten(ast.callee.property)}(${ast.arguments.map(value => flatten(value)).join(', ')})`;
            }
            if (ast.callee.object.name === 'gl' || ast.callee.object.name === 'context') {
              return `${flatten(ast.callee.object)}.${flatten(ast.callee.property)}(${ast.arguments.map(value => flatten(value)).join(', ')})`;
            }
            if (ast.callee.object.type === 'ThisExpression') {
              functionDependencies.push(findDependency('this', ast.callee.property.name));
              return `${ast.callee.property.name}(${ast.arguments.map(value => flatten(value)).join(', ')})`;
            } else if (ast.callee.object.name) {
              const foundSource = findDependency(ast.callee.object.name, ast.callee.property.name);
              if (foundSource === null) {
                return `${ast.callee.object.name}.${ast.callee.property.name}(${ast.arguments.map(value => flatten(value)).join(', ')})`;
              } else {
                functionDependencies.push(foundSource);
                return `${ast.callee.property.name}(${ast.arguments.map(value => flatten(value)).join(', ')})`;
              }
            } else if (ast.callee.object.type === 'MemberExpression') {
              return `${flatten(ast.callee.object)}.${ast.callee.property.name}(${ast.arguments.map(value => flatten(value)).join(', ')})`;
            } else {
              throw new Error('unknown ast.callee');
            }
          }
          case 'ReturnStatement':
            return `return ${flatten(ast.argument)}`;
          case 'BinaryExpression':
            return `(${flatten(ast.left)}${ast.operator}${flatten(ast.right)})`;
          case 'UnaryExpression':
            if (ast.prefix) {
              return `${ast.operator} ${flatten(ast.argument)}`;
            } else {
              return `${flatten(ast.argument)} ${ast.operator}`;
            }
            case 'ExpressionStatement':
              return `(${flatten(ast.expression)})`;
            case 'ArrowFunctionExpression':
              return `(${ast.params.map(flatten).join(', ')}) => ${flatten(ast.body)}`;
            case 'Literal':
              return ast.raw;
            case 'Identifier':
              return ast.name;
            case 'MemberExpression':
              if (ast.object.type === 'ThisExpression') {
                return thisLookup(ast.property.name);
              }
              if (ast.computed) {
                return `${flatten(ast.object)}[${flatten(ast.property)}]`;
              }
              return flatten(ast.object) + '.' + flatten(ast.property);
            case 'ThisExpression':
              return 'this';
            case 'NewExpression':
              return `new ${flatten(ast.callee)}(${ast.arguments.map(value => flatten(value)).join(', ')})`;
            case 'ForStatement':
              return `for (${flatten(ast.init)};${flatten(ast.test)};${flatten(ast.update)}) ${flatten(ast.body)}`;
            case 'AssignmentExpression':
              return `${flatten(ast.left)}${ast.operator}${flatten(ast.right)}`;
            case 'UpdateExpression':
              return `${flatten(ast.argument)}${ast.operator}`;
            case 'IfStatement':
              return `if (${flatten(ast.test)}) ${flatten(ast.consequent)}`;
            case 'ThrowStatement':
              return `throw ${flatten(ast.argument)}`;
            case 'ObjectPattern':
              return ast.properties.map(flatten).join(', ');
            case 'ArrayPattern':
              return ast.elements.map(flatten).join(', ');
            case 'DebuggerStatement':
              return 'debugger;';
            case 'ConditionalExpression':
              return `${flatten(ast.test)}?${flatten(ast.consequent)}:${flatten(ast.alternate)}`;
            case 'Property':
              if (ast.kind === 'init') {
                return flatten(ast.key);
              }
        }
        throw new Error(`unhandled ast.type of ${ ast.type }`);
      }
      const result = flatten(ast);
      if (functionDependencies.length > 0) {
        const flattenedFunctionDependencies = [];
        for (let i = 0; i < functionDependencies.length; i++) {
          const functionDependency = functionDependencies[i];
          if (!flattened[functionDependency]) {
            flattened[functionDependency] = true;
          }
          flattenedFunctionDependencies.push(utils$1.flattenFunctionToString(functionDependency, settings) + ';\n');
        }
        return flattenedFunctionDependencies.join('') + result;
      }
      return result;
    },
  };

  class Kernel {
    static get isSupported() {
      throw new Error(`"isSupported" not implemented on ${ this.name }`);
    }
    static isContextMatch(context) {
      throw new Error(`"isContextMatch" not implemented on ${ this.name }`);
    }
    static getFeatures() {
      throw new Error(`"getFeatures" not implemented on ${ this.name }`);
    }
    static destroyContext(context) {
      throw new Error(`"destroyContext" called on ${ this.name }`);
    }
    static nativeFunctionArguments() {
      throw new Error(`"nativeFunctionArguments" called on ${ this.name }`);
    }
    static nativeFunctionReturnType() {
      throw new Error(`"nativeFunctionReturnType" called on ${ this.name }`);
    }
    static combineKernels() {
      throw new Error(`"combineKernels" called on ${ this.name }`);
    }
    constructor(source, settings) {
      if (typeof source !== 'object') {
        if (typeof source !== 'string') {
          throw new Error('source not a string');
        }
        if (!isFunctionString(source)) {
          throw new Error('source not a function string');
        }
      }
      this.useLegacyEncoder = false;
      this.fallbackRequested = false;
      this.onRequestFallback = null;
      this.argumentNames = typeof source === 'string' ? getArgumentNamesFromString(source) : null;
      this.argumentTypes = null;
      this.argumentSizes = null;
      this.argumentBitRatios = null;
      this.kernelArguments = null;
      this.kernelConstants = null;
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
      this.precision = null;
      this.tactic = 'balanced';
      this.plugins = null;
      this.returnType = null;
      this.leadingReturnStatement = null;
      this.followingReturnStatement = null;
      this.optimizeFloatMemory = null;
      this.strictIntegers = false;
      this.fixIntegerDivisionAccuracy = null;
      this.warnVarUsage = true;
    }
    mergeSettings(settings) {
      for (let p in settings) {
        if (!settings.hasOwnProperty(p) || !this.hasOwnProperty(p)) continue;
        switch (p) {
          case 'output':
            if (!Array.isArray(settings.output)) {
              this.setOutput(settings.output);
              continue;
            }
            break;
          case 'functions':
            if (typeof settings.functions[0] === 'function') {
              this.functions = settings.functions.map(source => functionToIFunction(source));
              continue;
            }
            break;
          case 'graphical':
            if (settings[p] && !settings.hasOwnProperty('precision')) {
              this.precision = 'unsigned';
            }
            this[p] = settings[p];
            continue;
        }
        this[p] = settings[p];
      }
      if (!this.canvas) this.canvas = this.initCanvas();
      if (!this.context) this.context = this.initContext();
      if (!this.plugins) this.plugins = this.initPlugins(settings);
    }
    build() {
      throw new Error(`"build" not defined on ${ this.constructor.name }`);
    }
    run() {
      throw new Error(`"run" not defined on ${ this.constructor.name }`)
    }
    initCanvas() {
      throw new Error(`"initCanvas" not defined on ${ this.constructor.name }`);
    }
    initContext() {
      throw new Error(`"initContext" not defined on ${ this.constructor.name }`);
    }
    initPlugins(settings) {
      throw new Error(`"initPlugins" not defined on ${ this.constructor.name }`);
    }
    setupArguments(args) {
      this.kernelArguments = [];
      if (!this.argumentTypes) {
        if (!this.argumentTypes) {
          this.argumentTypes = [];
          for (let i = 0; i < args.length; i++) {
            const argType = getVariableType(args[i], this.strictIntegers);
            const type = argType === 'Integer' ? 'Number' : argType;
            this.argumentTypes.push(type);
            this.kernelArguments.push({
              type
            });
          }
        }
      } else {
        for (let i = 0; i < this.argumentTypes.length; i++) {
          this.kernelArguments.push({
            type: this.argumentTypes[i]
          });
        }
      }
      this.argumentSizes = new Array(args.length);
      this.argumentBitRatios = new Int32Array(args.length);
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        this.argumentSizes[i] = arg.constructor === Input ? arg.size : null;
        this.argumentBitRatios[i] = this.getBitRatio(arg);
      }
      if (this.argumentNames.length !== args.length) {
        throw new Error(`arguments are miss-aligned`);
      }
    }
    setupConstants() {
      this.kernelConstants = [];
      let needsConstantTypes = this.constantTypes === null;
      if (needsConstantTypes) {
        this.constantTypes = {};
      }
      this.constantBitRatios = {};
      if (this.constants) {
        for (let name in this.constants) {
          if (needsConstantTypes) {
            const type = getVariableType(this.constants[name], this.strictIntegers);
            this.constantTypes[name] = type;
            this.kernelConstants.push({
              name,
              type
            });
          } else {
            this.kernelConstants.push({
              name,
              type: this.constantTypes[name]
            });
          }
          this.constantBitRatios[name] = this.getBitRatio(this.constants[name]);
        }
      }
    }
    setOptimizeFloatMemory(flag) {
      this.optimizeFloatMemory = flag;
      return this;
    }
    setOutput(output) {
      if (output.hasOwnProperty('x')) {
        if (output.hasOwnProperty('y')) {
          if (output.hasOwnProperty('z')) {
            this.output = [output.x, output.y, output.z];
          } else {
            this.output = [output.x, output.y];
          }
        } else {
          this.output = [output.x];
        }
      } else {
        this.output = output;
      }
      return this;
    }
    setDebug(flag) {
      this.debug = flag;
      return this;
    }
    setGraphical(flag) {
      this.graphical = flag;
      this.precision = 'unsigned';
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
      if (typeof functions[0] === 'function') {
        this.functions = functions.map(source => functionToIFunction(source));
      } else {
        this.functions = functions;
      }
      return this;
    }
    setNativeFunctions(nativeFunctions) {
      this.nativeFunctions = nativeFunctions;
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
    setPrecision(flag) {
      this.precision = flag;
      return this;
    }
    setOutputToTexture(flag) {
      warnDeprecated('method', 'setOutputToTexture', 'setPipeline');
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
    setHardcodeConstants(flag) {
      warnDeprecated('method', 'setHardcodeConstants');
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
      this.warnVarUsage = flag;
      return this;
    }
    getCanvas() {
      warnDeprecated('method', 'getCanvas');
      return this.canvas;
    }
    getWebGl() {
      warnDeprecated('method', 'getWebGl');
      return this.context;
    }
    setContext(context) {
      this.context = context;
      return this;
    }
    setArgumentTypes(argumentTypes) {
      if (Array.isArray(argumentTypes)) {
        this.argumentTypes = argumentTypes;
      } else {
        this.argumentTypes = [];
        for (const p in argumentTypes) {
          const argumentIndex = this.argumentNames.indexOf(p);
          if (argumentIndex === -1) throw new Error(`unable to find argument ${ p }`);
          this.argumentTypes[argumentIndex] = argumentTypes[p];
        }
      }
      return this;
    }
    setTactic(tactic) {
      this.tactic = tactic;
      return this;
    }
    requestFallback(args) {
      if (!this.onRequestFallback) {
        throw new Error(`"onRequestFallback" not defined on ${ this.constructor.name }`);
      }
      this.fallbackRequested = true;
      return this.onRequestFallback(args);
    }
    validateSettings() {
      throw new Error(`"validateSettings" not defined on ${ this.constructor.name }`);
    }
    addSubKernel(subKernel) {
      if (this.subKernels === null) {
        this.subKernels = [];
      }
      if (!subKernel.source) throw new Error('subKernel missing "source" property');
      if (!subKernel.property && isNaN(subKernel.property)) throw new Error('subKernel missing "property" property');
      if (!subKernel.name) throw new Error('subKernel missing "name" property');
      this.subKernels.push(subKernel);
      return this;
    }
    destroy(removeCanvasReferences) {
      throw new Error(`"destroy" called on ${ this.constructor.name }`);
    }
    getBitRatio(value) {
      if (this.precision === 'single') {
        return 4;
      } else if (Array.isArray(value[0])) {
        return this.getBitRatio(value[0]);
      } else if (value.constructor === Input) {
        return this.getBitRatio(value.value);
      }
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
    getPixels() {
      throw new Error(`"getPixels" called on ${ this.constructor.name }`);
    }
    checkOutput() {
      if (!this.output || !isArray(this.output)) throw new Error('kernel.output not an array');
      if (this.output.length < 1) throw new Error('kernel.output is empty, needs at least 1 value');
      for (let i = 0; i < this.output.length; i++) {
        if (isNaN(this.output[i]) || this.output[i] < 1) {
          throw new Error(`${ this.constructor.name }.output[${ i }] incorrectly defined as \`${ this.output[i] }\`, needs to be numeric, and greater than 0`);
        }
      }
    }
    toJSON() {
      const settings = {
        output: this.output,
        threadDim: this.threadDim,
        pipeline: this.pipeline,
        argumentNames: this.argumentNames,
        argumentsTypes: this.argumentTypes,
        constants: this.constants,
        pluginNames: this.plugins ? this.plugins.map(plugin => plugin.name) : null,
        returnType: this.returnType,
      };
      return {
        settings
      };
    }
  }

  class FunctionBuilder {
    static fromKernel(kernel, FunctionNode, extraNodeOptions) {
      const {
        kernelArguments,
        kernelConstants,
        argumentNames,
        argumentSizes,
        argumentBitRatios,
        constants,
        constantBitRatios,
        debug,
        loopMaxIterations,
        nativeFunctions,
        output,
        optimizeFloatMemory,
        precision,
        plugins,
        source,
        subKernels,
        functions,
        leadingReturnStatement,
        followingReturnStatement,
        dynamicArguments,
        dynamicOutput,
        warnVarUsage,
      } = kernel;
      const argumentTypes = new Array(kernelArguments.length);
      const constantTypes = {};
      for (let i = 0; i < kernelArguments.length; i++) {
        argumentTypes[i] = kernelArguments[i].type;
      }
      for (let i = 0; i < kernelConstants.length; i++) {
        const kernelConstant = kernelConstants[i];
        constantTypes[kernelConstant.name] = kernelConstant.type;
      }
      const needsArgumentType = (functionName, index) => {
        return functionBuilder.needsArgumentType(functionName, index);
      };
      const assignArgumentType = (functionName, index, type) => {
        functionBuilder.assignArgumentType(functionName, index, type);
      };
      const lookupReturnType = (functionName, ast, requestingNode) => {
        return functionBuilder.lookupReturnType(functionName, ast, requestingNode);
      };
      const lookupFunctionArgumentTypes = (functionName) => {
        return functionBuilder.lookupFunctionArgumentTypes(functionName);
      };
      const lookupFunctionArgumentName = (functionName, argumentIndex) => {
        return functionBuilder.lookupFunctionArgumentName(functionName, argumentIndex);
      };
      const lookupFunctionArgumentBitRatio = (functionName, argumentName) => {
        return functionBuilder.lookupFunctionArgumentBitRatio(functionName, argumentName);
      };
      const triggerImplyArgumentType = (functionName, i, argumentType, requestingNode) => {
        functionBuilder.assignArgumentType(functionName, i, argumentType, requestingNode);
      };
      const triggerTrackArgumentSynonym = (functionName, argumentName, calleeFunctionName, argumentIndex) => {
        functionBuilder.trackArgumentSynonym(functionName, argumentName, calleeFunctionName, argumentIndex);
      };
      const lookupArgumentSynonym = (originFunctionName, functionName, argumentName) => {
        return functionBuilder.lookupArgumentSynonym(originFunctionName, functionName, argumentName);
      };
      const onFunctionCall = (functionName, calleeFunctionName, args) => {
        functionBuilder.trackFunctionCall(functionName, calleeFunctionName, args);
      };
      const onNestedFunction = (ast, returnType) => {
        const argumentNames = [];
        for (let i = 0; i < ast.params.length; i++) {
          argumentNames.push(ast.params[i].name);
        }
        const nestedFunction = new FunctionNode(null, Object.assign({}, nodeOptions, {
          returnType: null,
          ast,
          name: ast.id.name,
          argumentNames,
          lookupReturnType,
          lookupFunctionArgumentTypes,
          lookupFunctionArgumentName,
          lookupFunctionArgumentBitRatio,
          needsArgumentType,
          assignArgumentType,
          triggerImplyArgumentType,
          triggerTrackArgumentSynonym,
          lookupArgumentSynonym,
          onFunctionCall,
          warnVarUsage,
        }));
        nestedFunction.traceFunctionAST(ast);
        functionBuilder.addFunctionNode(nestedFunction);
      };
      const nodeOptions = Object.assign({
        isRootKernel: false,
        onNestedFunction,
        lookupReturnType,
        lookupFunctionArgumentTypes,
        lookupFunctionArgumentName,
        lookupFunctionArgumentBitRatio,
        needsArgumentType,
        assignArgumentType,
        triggerImplyArgumentType,
        triggerTrackArgumentSynonym,
        lookupArgumentSynonym,
        onFunctionCall,
        optimizeFloatMemory,
        precision,
        constants,
        constantTypes,
        constantBitRatios,
        debug,
        loopMaxIterations,
        output,
        plugins,
        dynamicArguments,
        dynamicOutput,
      }, extraNodeOptions || {});
      const rootNodeOptions = Object.assign({}, nodeOptions, {
        isRootKernel: true,
        name: 'kernel',
        argumentNames,
        argumentTypes,
        argumentSizes,
        argumentBitRatios,
        leadingReturnStatement,
        followingReturnStatement,
      });
      if (typeof source === 'object' && source.functionNodes) {
        return new FunctionBuilder().fromJSON(source.functionNodes, FunctionNode);
      }
      const rootNode = new FunctionNode(source, rootNodeOptions);
      let functionNodes = null;
      if (functions) {
        functionNodes = functions.map((fn) => new FunctionNode(fn.source, {
          returnType: fn.returnType,
          argumentTypes: fn.argumentTypes,
          output,
          plugins,
          constants,
          constantTypes,
          constantBitRatios,
          optimizeFloatMemory,
          precision,
          lookupReturnType,
          lookupFunctionArgumentTypes,
          lookupFunctionArgumentName,
          lookupFunctionArgumentBitRatio,
          needsArgumentType,
          assignArgumentType,
          triggerImplyArgumentType,
          triggerTrackArgumentSynonym,
          lookupArgumentSynonym,
          onFunctionCall,
        }));
      }
      let subKernelNodes = null;
      if (subKernels) {
        subKernelNodes = subKernels.map((subKernel) => {
          const { name, source } = subKernel;
          return new FunctionNode(source, Object.assign({}, nodeOptions, {
            name,
            isSubKernel: true,
            isRootKernel: false,
          }));
        });
      }
      const functionBuilder = new FunctionBuilder({
        kernel,
        rootNode,
        functionNodes,
        nativeFunctions,
        subKernelNodes
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
      this.argumentChain = [];
      this.functionNodeDependencies = {};
      this.functionCalls = {};
      if (this.rootNode) {
        this.functionMap['kernel'] = this.rootNode;
      }
      if (this.functionNodes) {
        for (let i = 0; i < this.functionNodes.length; i++) {
          this.functionMap[this.functionNodes[i].name] = this.functionNodes[i];
        }
      }
      if (this.subKernelNodes) {
        for (let i = 0; i < this.subKernelNodes.length; i++) {
          this.functionMap[this.subKernelNodes[i].name] = this.subKernelNodes[i];
        }
      }
      if (this.nativeFunctions) {
        for (let i = 0; i < this.nativeFunctions.length; i++) {
          const nativeFunction = this.nativeFunctions[i];
          this.nativeFunctionNames.push(nativeFunction.name);
        }
      }
    }
    addFunctionNode(functionNode) {
      if (!functionNode.name) throw new Error('functionNode.name needs set');
      this.functionMap[functionNode.name] = functionNode;
      if (functionNode.isRootKernel) {
        this.rootNode = functionNode;
      }
    }
    traceFunctionCalls(functionName, retList) {
      functionName = functionName || 'kernel';
      retList = retList || [];
      if (this.nativeFunctionNames.indexOf(functionName) > -1) {
        if (retList.indexOf(functionName) === -1) {
          retList.push(functionName);
        }
        return retList;
      }
      const functionNode = this.functionMap[functionName];
      if (functionNode) {
        const functionIndex = retList.indexOf(functionName);
        if (functionIndex === -1) {
          retList.push(functionName);
          functionNode.toString();
          for (let i = 0; i < functionNode.calledFunctions.length; ++i) {
            this.traceFunctionCalls(functionNode.calledFunctions[i], retList);
          }
        } else {
          const dependantFunctionName = retList.splice(functionIndex, 1)[0];
          retList.push(dependantFunctionName);
        }
      }
      return retList;
    }
    getPrototypeString(functionName) {
      return this.getPrototypes(functionName).join('\n');
    }
    getPrototypes(functionName) {
      if (this.rootNode) {
        this.rootNode.toString();
      }
      if (functionName) {
        return this.getPrototypesFromFunctionNames(this.traceFunctionCalls(functionName, []).reverse());
      }
      return this.getPrototypesFromFunctionNames(Object.keys(this.functionMap));
    }
    getStringFromFunctionNames(functionList) {
      const ret = [];
      for (let i = 0; i < functionList.length; ++i) {
        const node = this.functionMap[functionList[i]];
        if (node) {
          ret.push(this.functionMap[functionList[i]].toString());
        }
      }
      return ret.join('\n');
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
        if (node) {
          ret.push(node.toString());
        }
      }
      return ret;
    }
    toJSON() {
      return this.traceFunctionCalls(this.rootNode.name).reverse().map(name => {
        const nativeIndex = this.nativeFunctions.indexOf(name);
        if (nativeIndex > -1) {
          return {
            name,
            source: this.nativeFunctions[nativeIndex].source
          };
        } else if (this.functionMap[name]) {
          return this.functionMap[name].toJSON();
        } else {
          throw new Error(`function ${ name } not found`);
        }
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
      if (functionName) {
        return this.getStringFromFunctionNames(this.traceFunctionCalls(functionName).reverse());
      }
      return this.getStringFromFunctionNames(Object.keys(this.functionMap));
    }
    lookupReturnType(functionName, ast, requestingNode) {
      if (ast.type !== 'CallExpression') {
        throw new Error(`expected ast type of "CallExpression", but is ${ ast.type }`);
      }
      if (this._isNativeFunction(functionName)) {
        return this._lookupNativeFunctionReturnType(functionName);
      } else if (this._isFunction(functionName)) {
        const node = this._getFunction(functionName);
        if (node.returnType) {
          return node.returnType;
        } else {
          for (let i = 0; i < this.lookupChain.length; i++) {
            if (this.lookupChain[i].ast === ast) {
              if (node.argumentTypes.length === 0 && ast.arguments.length > 0) {
                const args = ast.arguments;
                for (let j = 0; j < args.length; j++) {
                  this.lookupChain.push({
                    name: requestingNode.name,
                    ast: args[i],
                    requestingNode
                  });
                  node.argumentTypes[j] = requestingNode.getType(args[j]);
                  this.lookupChain.pop();
                }
                return node.returnType = node.getType(node.getJsAST());
              }
              throw new Error('circlical logic detected!');
            }
          }
          this.lookupChain.push({
            name: requestingNode.name,
            ast,
            requestingNode
          });
          const type = node.getType(node.getJsAST());
          this.lookupChain.pop();
          return node.returnType = type;
        }
      }
      return null;
    }
    _getFunction(functionName) {
      if (!this._isFunction(functionName)) ;
      return this.functionMap[functionName];
    }
    _isFunction(functionName) {
      return Boolean(this.functionMap[functionName]);
    }
    _getNativeFunction(functionName) {
      for (let i = 0; i < this.nativeFunctions.length; i++) {
        if (this.nativeFunctions[i].name === functionName) return this.nativeFunctions[i];
      }
      return null;
    }
    _isNativeFunction(functionName) {
      return Boolean(this._getNativeFunction(functionName));
    }
    _lookupNativeFunctionReturnType(functionName) {
      let nativeFunction = this._getNativeFunction(functionName);
      if (nativeFunction) {
        return nativeFunction.returnType;
      }
      throw new Error(`Native function ${ functionName } not found`);
    }
    lookupFunctionArgumentTypes(functionName) {
      if (this._isNativeFunction(functionName)) {
        return this._getNativeFunction(functionName).argumentTypes;
      } else if (this._isFunction(functionName)) {
        return this._getFunction(functionName).argumentTypes;
      }
      return null;
    }
    lookupFunctionArgumentName(functionName, argumentIndex) {
      return this._getFunction(functionName).argumentNames[argumentIndex];
    }
    lookupFunctionArgumentBitRatio(functionName, argumentName) {
      if (!this._isFunction(functionName)) {
        throw new Error('function not found');
      }
      if (this.rootNode.name === functionName) {
        const i = this.rootNode.argumentNames.indexOf(argumentName);
        if (i !== -1) {
          return this.rootNode.argumentBitRatios[i];
        } else {
          throw new Error('argument bit ratio not found');
        }
      } else {
        const node = this._getFunction(functionName);
        const argumentSynonym = node.argumentSynonym[node.synonymIndex];
        if (!argumentSynonym) {
          throw new Error('argument synonym not found');
        }
        return this.lookupFunctionArgumentBitRatio(argumentSynonym.functionName, argumentSynonym.argumentName);
      }
    }
    needsArgumentType(functionName, i) {
      if (!this._isFunction(functionName)) return false;
      const fnNode = this._getFunction(functionName);
      return !fnNode.argumentTypes[i];
    }
    assignArgumentType(functionName, i, argumentType, requestingNode) {
      if (!this._isFunction(functionName)) return;
      const fnNode = this._getFunction(functionName);
      if (!fnNode.argumentTypes[i]) {
        fnNode.argumentTypes[i] = argumentType;
      }
    }
    trackArgumentSynonym(functionName, argumentName, calleeFunctionName, argumentIndex) {
      if (!this._isFunction(calleeFunctionName)) return;
      const node = this._getFunction(calleeFunctionName);
      if (!node.argumentSynonym) {
        node.argumentSynonym = {};
      }
      const calleeArgumentName = node.argumentNames[argumentIndex];
      if (!node.argumentSynonym[calleeArgumentName]) {
        node.argumentSynonym[calleeArgumentName] = {};
      }
      node.synonymIndex++;
      node.argumentSynonym[node.synonymIndex] = {
        functionName,
        argumentName,
        calleeArgumentName,
        calleeFunctionName,
      };
    }
    lookupArgumentSynonym(originFunctionName, functionName, argumentName) {
      if (originFunctionName === functionName) return argumentName;
      if (!this._isFunction(functionName)) return null;
      const node = this._getFunction(functionName);
      const argumentSynonym = node.argumentSynonym[node.synonymUseIndex];
      if (!argumentSynonym) return null;
      if (argumentSynonym.calleeArgumentName !== argumentName) return null;
      node.synonymUseIndex++;
      if (originFunctionName !== functionName) {
        return this.lookupArgumentSynonym(originFunctionName, argumentSynonym.functionName, argumentSynonym.argumentName);
      }
      return argumentSynonym.argumentName;
    }
    trackFunctionCall(functionName, calleeFunctionName, args) {
      if (!this.functionNodeDependencies[functionName]) {
        this.functionNodeDependencies[functionName] = new Set();
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
      for (let functionCallIndex = 0; functionCallIndex < this.rootNode.functionCalls.length; functionCallIndex++) {
        const functionCall = this.rootNode.functionCalls[functionCallIndex];
        if (functionCall.ast.callee.name === subKernelNode.name) {
          called = true;
        }
      }
      if (!called) {
        throw new Error(`SubKernel ${ subKernelNode.name } never called by kernel`);
      }
      return subKernelNode.returnType || subKernelNode.getType(subKernelNode.getJsAST());
    }
    getReturnTypes() {
      const result = {
        [this.rootNode.name]: this.rootNode.getType(this.rootNode.ast),
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

  class FunctionTracer {
    constructor(ast) {
      this.runningContexts = [];
      this.contexts = [];
      this.functionCalls = [];
      this.declarations = [];
      this.identifiers = [];
      this.functions = [];
      this.returnStatements = [];
      this.inLoopInit = false;
      this.scan(ast);
    }
    get currentContext() {
      return this.runningContexts.length > 0 ? this.runningContexts[this.runningContexts.length - 1] : null;
    }
    newContext(run) {
      const newContext = Object.assign({}, this.currentContext);
      this.contexts.push(newContext);
      this.runningContexts.push(newContext);
      run();
      this.runningContexts.pop();
    }
    scan(ast) {
      if (Array.isArray(ast)) {
        for (let i = 0; i < ast.length; i++) {
          this.scan(ast[i]);
        }
        return;
      }
      switch (ast.type) {
        case 'Program':
          this.scan(ast.body);
          break;
        case 'BlockStatement':
          this.newContext(() => {
            this.scan(ast.body);
          });
          break;
        case 'AssignmentExpression':
        case 'LogicalExpression':
          this.scan(ast.left);
          this.scan(ast.right);
          break;
        case 'BinaryExpression':
          this.scan(ast.left);
          this.scan(ast.right);
          break;
        case 'UpdateExpression':
        case 'UnaryExpression':
          this.scan(ast.argument);
          break;
        case 'VariableDeclaration':
          this.scan(ast.declarations);
          break;
        case 'VariableDeclarator':
          const { currentContext } = this;
          const declaration = {
            ast: ast,
            context: currentContext,
            name: ast.id.name,
            origin: 'declaration',
            forceInteger: this.inLoopInit,
            assignable: !this.inLoopInit && !currentContext.hasOwnProperty(ast.id.name),
          };
          currentContext[ast.id.name] = declaration;
          this.declarations.push(declaration);
          this.scan(ast.id);
          this.scan(ast.init);
          break;
        case 'FunctionExpression':
        case 'FunctionDeclaration':
          if (this.runningContexts.length === 0) {
            this.scan(ast.body);
          } else {
            this.functions.push(ast);
          }
          break;
        case 'IfStatement':
          this.scan(ast.test);
          this.scan(ast.consequent);
          if (ast.alternate) this.scan(ast.alternate);
          break;
        case 'ForStatement':
          this.newContext(() => {
            this.inLoopInit = true;
            this.scan(ast.init);
            this.inLoopInit = false;
            this.scan(ast.test);
            this.scan(ast.update);
            this.newContext(() => {
              this.scan(ast.body);
            });
          });
          break;
        case 'DoWhileStatement':
        case 'WhileStatement':
          this.newContext(() => {
            this.scan(ast.body);
            this.scan(ast.test);
          });
          break;
        case 'Identifier':
          this.identifiers.push({
            context: this.currentContext,
            ast,
          });
          break;
        case 'ReturnStatement':
          this.returnStatements.push(ast);
          this.scan(ast.argument);
          break;
        case 'MemberExpression':
          this.scan(ast.object);
          this.scan(ast.property);
          break;
        case 'ExpressionStatement':
          this.scan(ast.expression);
          break;
        case 'CallExpression':
          this.functionCalls.push({
            context: this.currentContext,
            ast,
          });
          this.scan(ast.arguments);
          break;
        case 'ArrayExpression':
          this.scan(ast.elements);
          break;
        case 'ConditionalExpression':
          this.scan(ast.test);
          this.scan(ast.alternate);
          this.scan(ast.consequent);
          break;
        case 'SwitchStatement':
          this.scan(ast.discriminant);
          this.scan(ast.cases);
          break;
        case 'SwitchCase':
          this.scan(ast.test);
          this.scan(ast.consequent);
          break;
        case 'ThisExpression':
          this.scan(ast.left);
          this.scan(ast.right);
          break;
        case 'Literal':
        case 'DebuggerStatement':
        case 'EmptyStatement':
        case 'BreakStatement':
        case 'ContinueStatement':
          break;
        default:
          throw new Error(`unhandled type "${ast.type}"`);
      }
    }
  }

  class FunctionNode {
    constructor(source, settings) {
      if (!source && !settings.ast) {
        throw new Error('source parameter is missing');
      }
      settings = settings || {};
      this.source = source;
      this.ast = null;
      this.name = typeof source === 'string' ? settings.isRootKernel ?
        'kernel' :
        (settings.name || getFunctionNameFromString(source)) : null;
      this.calledFunctions = [];
      this.constants = {};
      this.constantTypes = {};
      this.constantBitRatios = {};
      this.isRootKernel = false;
      this.isSubKernel = false;
      this.debug = null;
      this.declarations = null;
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
      this.argumentNames = (typeof this.source === 'string' ? getArgumentNamesFromString(this.source) : null);
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
      this.warnVarUsage = true;
      if (settings) {
        for (const p in settings) {
          if (!settings.hasOwnProperty(p)) continue;
          if (!this.hasOwnProperty(p)) continue;
          this[p] = settings[p];
        }
      }
      this.literalTypes = {};
      this.validate();
      this._string = null;
      this._internalVariableNames = {};
    }
    validate() {
      if (typeof this.source !== 'string' && !this.ast) {
        throw new Error('this.source not a string');
      }
      if (!this.ast && !isFunctionString(this.source)) {
        throw new Error('this.source not a function string');
      }
      if (!this.name) {
        throw new Error('this.name could not be set');
      }
      if (this.argumentTypes.length > 0 && this.argumentTypes.length !== this.argumentNames.length) {
        throw new Error(`argumentTypes count of ${ this.argumentTypes.length } exceeds ${ this.argumentNames.length }`);
      }
      if (this.output.length < 1) {
        throw new Error('this.output is not big enough');
      }
    }
    isIdentifierConstant(name) {
      if (!this.constants) return false;
      return this.constants.hasOwnProperty(name);
    }
    isInput(argumentName) {
      return this.argumentTypes[this.argumentNames.indexOf(argumentName)] === 'Input';
    }
    pushState(state) {
      this.states.push(state);
    }
    popState(state) {
      if (this.state !== state) {
        throw new Error(`Cannot popState ${ state } when in ${ this.state }`);
      }
      this.states.pop();
    }
    isState(state) {
      return this.state === state;
    }
    get state() {
      return this.states[this.states.length - 1];
    }
    astMemberExpressionUnroll(ast) {
      if (ast.type === 'Identifier') {
        return ast.name;
      } else if (ast.type === 'ThisExpression') {
        return 'this';
      }
      if (ast.type === 'MemberExpression') {
        if (ast.object && ast.property) {
          if (ast.object.hasOwnProperty('name') && ast.object.name[0] === '_') {
            return this.astMemberExpressionUnroll(ast.property);
          }
          return (
            this.astMemberExpressionUnroll(ast.object) +
            '.' +
            this.astMemberExpressionUnroll(ast.property)
          );
        }
      }
      if (ast.hasOwnProperty('expressions')) {
        const firstExpression = ast.expressions[0];
        if (firstExpression.type === 'Literal' && firstExpression.value === 0 && ast.expressions.length === 2) {
          return this.astMemberExpressionUnroll(ast.expressions[1]);
        }
      }
      throw this.astErrorOutput('Unknown astMemberExpressionUnroll', ast);
    }
    getJsAST(inParser) {
      if (this.ast) {
        return this.ast;
      }
      if (typeof this.source === 'object') {
        this.traceFunctionAST(this.source);
        return this.ast = this.source;
      }
      const parser = inParser && inParser.hasOwnProperty('parse') ? inParser.parse : acorn.parse;
      if (inParser === null) {
        throw new Error('Missing JS to AST parser');
      }
      const ast = Object.freeze(parser(`const parser_${ this.name } = ${ this.source };`, {
        locations: true
      }));
      const functionAST = ast.body[0].declarations[0].init;
      this.traceFunctionAST(functionAST);
      if (!ast) {
        throw new Error('Failed to parse JS code');
      }
      return this.ast = functionAST;
    }
    traceFunctionAST(ast) {
      const { contexts, declarations, functions, identifiers, functionCalls } = new FunctionTracer(ast);
      this.contexts = contexts;
      this.identifiers = identifiers;
      this.functionCalls = functionCalls;
      this.declarations = [];
      this.functions = functions;
      for (let i = 0; i < declarations.length; i++) {
        const declaration = declarations[i];
        const { ast, context, name, origin, forceInteger, assignable } = declaration;
        const { init } = ast;
        const dependencies = this.getDependencies(init);
        let valueType = null;
        if (forceInteger) {
          valueType = 'Integer';
        } else {
          if (init) {
            const realType = this.getType(init);
            switch (realType) {
              case 'Integer':
              case 'Float':
              case 'Number':
                if (init.type === 'MemberExpression') {
                  valueType = realType;
                } else {
                  valueType = 'Number';
                }
                break;
              case 'LiteralInteger':
                valueType = 'Number';
                break;
              default:
                valueType = realType;
            }
          }
        }
        this.declarations.push({
          valueType,
          dependencies,
          isSafe: this.isSafeDependencies(dependencies),
          ast,
          name,
          context,
          origin,
          assignable,
        });
      }
      for (let i = 0; i < functions.length; i++) {
        this.onNestedFunction(functions[i]);
      }
    }
    getDeclaration(ast) {
      for (let i = 0; i < this.identifiers.length; i++) {
        const identifier = this.identifiers[i];
        if (ast === identifier.ast && identifier.context.hasOwnProperty(ast.name)) {
          for (let j = 0; j < this.declarations.length; j++) {
            const declaration = this.declarations[j];
            if (declaration.name === ast.name && declaration.context[ast.name] === identifier.context[ast.name]) {
              return declaration;
            }
          }
        }
      }
      return null;
    }
    getVariableType(ast) {
      if (ast.type !== 'Identifier') {
        throw new Error(`ast of ${ast.type} not "Identifier"`);
      }
      let type = null;
      const argumentIndex = this.argumentNames.indexOf(ast.name);
      if (argumentIndex === -1) {
        const declaration = this.getDeclaration(ast);
        if (declaration) {
          return declaration.valueType;
        }
      } else {
        const argumentType = this.argumentTypes[argumentIndex];
        if (argumentType) {
          type = argumentType;
        }
      }
      if (!type && this.strictTypingChecking) {
        throw new Error(`Declaration of ${name} not found`);
      }
      return type;
    }
    getLookupType(type) {
      if (!typeLookupMap.hasOwnProperty(type)) {
        throw new Error(`unknown typeLookupMap ${ type }`);
      }
      return typeLookupMap[type];
    }
    getConstantType(constantName) {
      if (this.constantTypes[constantName]) {
        const type = this.constantTypes[constantName];
        if (type === 'Float') {
          return 'Number';
        } else {
          return type;
        }
      }
      throw new Error(`Type for constant "${ constantName }" not declared`);
    }
    toString() {
      if (this._string) return this._string;
      return this._string = this.astGeneric(this.getJsAST(), []).join('').trim();
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
        followingReturnStatement: this.followingReturnStatement,
      };
      return {
        ast: this.ast,
        settings
      };
    }
    getType(ast) {
      if (Array.isArray(ast)) {
        return this.getType(ast[ast.length - 1]);
      }
      switch (ast.type) {
        case 'BlockStatement':
          return this.getType(ast.body);
        case 'ArrayExpression':
          return `Array(${ ast.elements.length })`;
        case 'Literal':
          const literalKey = `${ast.start},${ast.end}`;
          if (this.literalTypes[literalKey]) {
            return this.literalTypes[literalKey];
          }
          if (Number.isInteger(ast.value)) {
            return 'LiteralInteger';
          } else if (ast.value === true || ast.value === false) {
            return 'Boolean';
          } else {
            return 'Number';
          }
          case 'AssignmentExpression':
            return this.getType(ast.left);
          case 'CallExpression':
            if (this.isAstMathFunction(ast)) {
              return 'Number';
            }
            if (!ast.callee || !ast.callee.name) {
              if (ast.callee.type === 'SequenceExpression' && ast.callee.expressions[ast.callee.expressions.length - 1].property.name) {
                const functionName = ast.callee.expressions[ast.callee.expressions.length - 1].property.name;
                this.inferArgumentTypesIfNeeded(functionName, ast.arguments);
                return this.lookupReturnType(functionName, ast, this);
              }
              throw this.astErrorOutput('Unknown call expression', ast);
            }
            if (ast.callee && ast.callee.name) {
              const functionName = ast.callee.name;
              this.inferArgumentTypesIfNeeded(functionName, ast.arguments);
              return this.lookupReturnType(functionName, ast, this);
            }
            throw this.astErrorOutput(`Unhandled getType Type "${ ast.type }"`, ast);
          case 'BinaryExpression':
            switch (ast.operator) {
              case '%':
              case '/':
                if (this.fixIntegerDivisionAccuracy) {
                  return 'Number';
                } else {
                  break;
                }
                case '>':
                case '<':
                  return 'Boolean';
                case '&':
                case '|':
                case '^':
                case '<<':
                case '>>':
                case '>>>':
                  return 'Integer';
            }
            const type = this.getType(ast.left);
            if (this.isState('skip-literal-correction')) return type;
            if (type === 'LiteralInteger') {
              const rightType = this.getType(ast.right);
              if (rightType === 'LiteralInteger') {
                if (ast.left.value % 1 === 0) {
                  return 'Integer';
                } else {
                  return 'Float';
                }
              }
              return rightType;
            }
            return typeLookupMap[type] || type;
          case 'UpdateExpression':
            return this.getType(ast.argument);
          case 'UnaryExpression':
            if (ast.operator === '~') {
              return 'Integer';
            }
            return this.getType(ast.argument);
          case 'VariableDeclaration': {
            const declarations = ast.declarations;
            let lastType;
            for (let i = 0; i < declarations.length; i++) {
              const declaration = declarations[i];
              lastType = this.getType(declaration);
            }
            if (!lastType) {
              throw this.astErrorOutput(`Unable to find type for declaration`, ast);
            }
            return lastType;
          }
          case 'VariableDeclarator':
            const declaration = this.getDeclaration(ast.id);
            if (!declaration) {
              throw this.astErrorOutput(`Unable to find declarator`, ast);
            }
            if (!declaration.valueType) {
              throw this.astErrorOutput(`Unable to find declarator valueType`, ast);
            }
            return declaration.valueType;
          case 'Identifier':
            if (ast.name === 'Infinity') {
              return 'Number';
            }
            if (this.isAstVariable(ast)) {
              const signature = this.getVariableSignature(ast);
              if (signature === 'value') {
                const type = this.getVariableType(ast);
                if (!type) {
                  throw this.astErrorOutput(`Unable to find identifier valueType`, ast);
                }
                return type;
              }
            }
            const origin = this.findIdentifierOrigin(ast);
            if (origin && origin.init) {
              return this.getType(origin.init);
            }
            return null;
          case 'ReturnStatement':
            return this.getType(ast.argument);
          case 'MemberExpression':
            if (this.isAstMathFunction(ast)) {
              switch (ast.property.name) {
                case 'ceil':
                  return 'Integer';
                case 'floor':
                  return 'Integer';
                case 'round':
                  return 'Integer';
              }
              return 'Number';
            }
            if (this.isAstVariable(ast)) {
              const variableSignature = this.getVariableSignature(ast);
              switch (variableSignature) {
                case 'value[]':
                  return this.getLookupType(this.getVariableType(ast.object));
                case 'value[][]':
                  return this.getLookupType(this.getVariableType(ast.object.object));
                case 'value[][][]':
                  return this.getLookupType(this.getVariableType(ast.object.object.object));
                case 'value[][][][]':
                  return this.getLookupType(this.getVariableType(ast.object.object.object.object));
                case 'value.thread.value':
                case 'this.thread.value':
                  return 'Integer';
                case 'this.output.value':
                  return this.dynamicOutput ? 'Integer' : 'LiteralInteger';
                case 'this.constants.value':
                  return this.getConstantType(ast.property.name);
                case 'this.constants.value[]':
                  return this.getLookupType(this.getConstantType(ast.object.property.name));
                case 'this.constants.value[][]':
                  return this.getLookupType(this.getConstantType(ast.object.object.property.name));
                case 'this.constants.value[][][]':
                  return this.getLookupType(this.getConstantType(ast.object.object.object.property.name));
                case 'this.constants.value[][][][]':
                  return this.getLookupType(this.getConstantType(ast.object.object.object.object.property.name));
                case 'fn()[]':
                  return this.getLookupType(this.getType(ast.object));
                case 'fn()[][]':
                  return this.getLookupType(this.getType(ast.object));
                case 'fn()[][][]':
                  return this.getLookupType(this.getType(ast.object));
                case 'value.value':
                  if (this.isAstMathVariable(ast)) {
                    return 'Number';
                  }
                  switch (ast.property.name) {
                    case 'r':
                      return this.getLookupType(this.getVariableType(ast.object));
                    case 'g':
                      return this.getLookupType(this.getVariableType(ast.object));
                    case 'b':
                      return this.getLookupType(this.getVariableType(ast.object));
                    case 'a':
                      return this.getLookupType(this.getVariableType(ast.object));
                  }
                  case '[][]':
                    return 'Number';
              }
              throw this.astErrorOutput('Unhandled getType MemberExpression', ast);
            }
            throw this.astErrorOutput('Unhandled getType MemberExpression', ast);
          case 'ConditionalExpression':
            return this.getType(ast.consequent);
          case 'FunctionDeclaration':
          case 'FunctionExpression':
            const lastReturn = this.findLastReturn(ast.body);
            if (lastReturn) {
              return this.getType(lastReturn);
            }
            return null;
          case 'IfStatement':
            return this.getType(ast.consequent);
          default:
            throw this.astErrorOutput(`Unhandled getType Type "${ ast.type }"`, ast);
      }
    }
    inferArgumentTypesIfNeeded(functionName, args) {
      for (let i = 0; i < args.length; i++) {
        if (!this.needsArgumentType(functionName, i)) continue;
        const type = this.getType(args[i]);
        if (!type) {
          throw this.astErrorOutput(`Unable to infer argument ${i}`, args[i]);
        }
        this.assignArgumentType(functionName, i, type);
      }
    }
    isAstMathVariable(ast) {
      const mathProperties = [
        'E',
        'PI',
        'SQRT2',
        'SQRT1_2',
        'LN2',
        'LN10',
        'LOG2E',
        'LOG10E',
      ];
      return ast.type === 'MemberExpression' &&
        ast.object && ast.object.type === 'Identifier' &&
        ast.object.name === 'Math' &&
        ast.property &&
        ast.property.type === 'Identifier' &&
        mathProperties.indexOf(ast.property.name) > -1;
    }
    isAstMathFunction(ast) {
      const mathFunctions = [
        'abs',
        'acos',
        'asin',
        'atan',
        'atan2',
        'ceil',
        'cos',
        'exp',
        'floor',
        'log',
        'log2',
        'max',
        'min',
        'pow',
        'random',
        'round',
        'sign',
        'sin',
        'sqrt',
        'tan',
      ];
      return ast.type === 'CallExpression' &&
        ast.callee &&
        ast.callee.type === 'MemberExpression' &&
        ast.callee.object &&
        ast.callee.object.type === 'Identifier' &&
        ast.callee.object.name === 'Math' &&
        ast.callee.property &&
        ast.callee.property.type === 'Identifier' &&
        mathFunctions.indexOf(ast.callee.property.name) > -1;
    }
    isAstVariable(ast) {
      return ast.type === 'Identifier' || ast.type === 'MemberExpression';
    }
    isSafe(ast) {
      return this.isSafeDependencies(this.getDependencies(ast));
    }
    isSafeDependencies(dependencies) {
      return dependencies && dependencies.every ? dependencies.every(dependency => dependency.isSafe) : true;
    }
    getDependencies(ast, dependencies, isNotSafe) {
      if (!dependencies) {
        dependencies = [];
      }
      if (!ast) return null;
      if (Array.isArray(ast)) {
        for (let i = 0; i < ast.length; i++) {
          this.getDependencies(ast[i], dependencies, isNotSafe);
        }
        return dependencies;
      }
      switch (ast.type) {
        case 'AssignmentExpression':
          this.getDependencies(ast.left, dependencies, isNotSafe);
          this.getDependencies(ast.right, dependencies, isNotSafe);
          return dependencies;
        case 'ConditionalExpression':
          this.getDependencies(ast.test, dependencies, isNotSafe);
          this.getDependencies(ast.alternate, dependencies, isNotSafe);
          this.getDependencies(ast.consequent, dependencies, isNotSafe);
          return dependencies;
        case 'Literal':
          dependencies.push({
            origin: 'literal',
            value: ast.value,
            isSafe: isNotSafe === true ? false : ast.value > -Infinity && ast.value < Infinity && !isNaN(ast.value)
          });
          break;
        case 'VariableDeclarator':
          return this.getDependencies(ast.init, dependencies, isNotSafe);
        case 'Identifier':
          const declaration = this.getDeclaration(ast);
          if (declaration) {
            dependencies.push({
              name: ast.name,
              origin: 'declaration',
              isSafe: isNotSafe ? false : this.isSafeDependencies(declaration.dependencies),
            });
          } else if (this.argumentNames.indexOf(ast.name) > -1) {
            dependencies.push({
              name: ast.name,
              origin: 'argument',
              isSafe: false,
            });
          } else if (this.strictTypingChecking) {
            throw new Error(`Cannot find identifier origin "${ast.name}"`);
          }
          break;
        case 'FunctionDeclaration':
          return this.getDependencies(ast.body.body[ast.body.body.length - 1], dependencies, isNotSafe);
        case 'ReturnStatement':
          return this.getDependencies(ast.argument, dependencies);
        case 'BinaryExpression':
          isNotSafe = (ast.operator === '/' || ast.operator === '*');
          this.getDependencies(ast.left, dependencies, isNotSafe);
          this.getDependencies(ast.right, dependencies, isNotSafe);
          return dependencies;
        case 'UnaryExpression':
        case 'UpdateExpression':
          return this.getDependencies(ast.argument, dependencies, isNotSafe);
        case 'VariableDeclaration':
          return this.getDependencies(ast.declarations, dependencies, isNotSafe);
        case 'ArrayExpression':
          dependencies.push({
            origin: 'declaration',
            isSafe: true,
          });
          return dependencies;
        case 'CallExpression':
          dependencies.push({
            origin: 'function',
            isSafe: true,
          });
          return dependencies;
        case 'MemberExpression':
          const details = this.getMemberExpressionDetails(ast);
          switch (details.signature) {
            case 'value[]':
              this.getDependencies(ast.object, dependencies, isNotSafe);
              break;
            case 'value[][]':
              this.getDependencies(ast.object.object, dependencies, isNotSafe);
              break;
            case 'value[][][]':
              this.getDependencies(ast.object.object.object, dependencies, isNotSafe);
              break;
            case 'this.output.value':
              if (this.dynamicOutput) {
                dependencies.push({
                  name: details.name,
                  origin: 'output',
                  isSafe: false,
                });
              }
              break;
          }
          if (details) {
            if (details.property) {
              this.getDependencies(details.property, dependencies, isNotSafe);
            }
            if (details.xProperty) {
              this.getDependencies(details.xProperty, dependencies, isNotSafe);
            }
            if (details.yProperty) {
              this.getDependencies(details.yProperty, dependencies, isNotSafe);
            }
            if (details.zProperty) {
              this.getDependencies(details.zProperty, dependencies, isNotSafe);
            }
            return dependencies;
          }
          default:
            throw this.astErrorOutput(`Unhandled type ${ ast.type } in getDependencies`, ast);
      }
      return dependencies;
    }
    getVariableSignature(ast) {
      if (!this.isAstVariable(ast)) {
        throw new Error(`ast of type "${ ast.type }" is not a variable signature`);
      }
      if (ast.type === 'Identifier') {
        return 'value';
      }
      const signature = [];
      while (true) {
        if (!ast) break;
        if (ast.computed) {
          signature.push('[]');
        } else if (ast.type === 'ThisExpression') {
          signature.unshift('this');
        } else if (ast.property && ast.property.name) {
          if (
            ast.property.name === 'x' ||
            ast.property.name === 'y' ||
            ast.property.name === 'z'
          ) {
            signature.unshift('.value');
          } else if (
            ast.property.name === 'constants' ||
            ast.property.name === 'thread' ||
            ast.property.name === 'output'
          ) {
            signature.unshift('.' + ast.property.name);
          } else {
            signature.unshift('.value');
          }
        } else if (ast.name) {
          signature.unshift('value');
        } else if (ast.callee && ast.callee.name) {
          signature.unshift('fn()');
        } else if (ast.elements) {
          signature.unshift('[]');
        } else {
          signature.unshift('unknown');
        }
        ast = ast.object;
      }
      const signatureString = signature.join('');
      const allowedExpressions = [
        'value',
        'value[]',
        'value[][]',
        'value[][][]',
        'value[][][][]',
        'value.value',
        'value.thread.value',
        'this.thread.value',
        'this.output.value',
        'this.constants.value',
        'this.constants.value[]',
        'this.constants.value[][]',
        'this.constants.value[][][]',
        'this.constants.value[][][][]',
        'fn()[]',
        'fn()[][]',
        'fn()[][][]',
        '[][]',
      ];
      if (allowedExpressions.indexOf(signatureString) > -1) {
        return signatureString;
      }
      return null;
    }
    build() {
      return this.toString().length > 0;
    }
    astGeneric(ast, retArr) {
      if (ast === null) {
        throw this.astErrorOutput('NULL ast', ast);
      } else {
        if (Array.isArray(ast)) {
          for (let i = 0; i < ast.length; i++) {
            this.astGeneric(ast[i], retArr);
          }
          return retArr;
        }
        switch (ast.type) {
          case 'FunctionDeclaration':
            return this.astFunctionDeclaration(ast, retArr);
          case 'FunctionExpression':
            return this.astFunctionExpression(ast, retArr);
          case 'ReturnStatement':
            return this.astReturnStatement(ast, retArr);
          case 'Literal':
            return this.astLiteral(ast, retArr);
          case 'BinaryExpression':
            return this.astBinaryExpression(ast, retArr);
          case 'Identifier':
            return this.astIdentifierExpression(ast, retArr);
          case 'AssignmentExpression':
            return this.astAssignmentExpression(ast, retArr);
          case 'ExpressionStatement':
            return this.astExpressionStatement(ast, retArr);
          case 'EmptyStatement':
            return this.astEmptyStatement(ast, retArr);
          case 'BlockStatement':
            return this.astBlockStatement(ast, retArr);
          case 'IfStatement':
            return this.astIfStatement(ast, retArr);
          case 'SwitchStatement':
            return this.astSwitchStatement(ast, retArr);
          case 'BreakStatement':
            return this.astBreakStatement(ast, retArr);
          case 'ContinueStatement':
            return this.astContinueStatement(ast, retArr);
          case 'ForStatement':
            return this.astForStatement(ast, retArr);
          case 'WhileStatement':
            return this.astWhileStatement(ast, retArr);
          case 'DoWhileStatement':
            return this.astDoWhileStatement(ast, retArr);
          case 'VariableDeclaration':
            return this.astVariableDeclaration(ast, retArr);
          case 'VariableDeclarator':
            return this.astVariableDeclarator(ast, retArr);
          case 'ThisExpression':
            return this.astThisExpression(ast, retArr);
          case 'SequenceExpression':
            return this.astSequenceExpression(ast, retArr);
          case 'UnaryExpression':
            return this.astUnaryExpression(ast, retArr);
          case 'UpdateExpression':
            return this.astUpdateExpression(ast, retArr);
          case 'LogicalExpression':
            return this.astLogicalExpression(ast, retArr);
          case 'MemberExpression':
            return this.astMemberExpression(ast, retArr);
          case 'CallExpression':
            return this.astCallExpression(ast, retArr);
          case 'ArrayExpression':
            return this.astArrayExpression(ast, retArr);
          case 'DebuggerStatement':
            return this.astDebuggerStatement(ast, retArr);
          case 'ConditionalExpression':
            return this.astConditionalExpression(ast, retArr);
        }
        throw this.astErrorOutput('Unknown ast type : ' + ast.type, ast);
      }
    }
    astErrorOutput(error, ast) {
      if (typeof this.source !== 'string') {
        return new Error(error);
      }
      const debugString = getAstString(this.source, ast);
      const leadingSource = this.source.substr(ast.start);
      const splitLines = leadingSource.split(/\n/);
      const lineBefore = splitLines.length > 0 ? splitLines[splitLines.length - 1] : 0;
      return new Error(`${error} on line ${ splitLines.length }, position ${ lineBefore.length }:\n ${ debugString }`);
    }
    astDebuggerStatement(arrNode, retArr) {
      return retArr;
    }
    astConditionalExpression(ast, retArr) {
      if (ast.type !== 'ConditionalExpression') {
        throw this.astErrorOutput('Not a conditional expression', ast);
      }
      retArr.push('(');
      this.astGeneric(ast.test, retArr);
      retArr.push('?');
      this.astGeneric(ast.consequent, retArr);
      retArr.push(':');
      this.astGeneric(ast.alternate, retArr);
      retArr.push(')');
      return retArr;
    }
    astFunction(ast, retArr) {
      throw new Error(`"astFunction" not defined on ${ this.constructor.name }`);
    }
    astFunctionDeclaration(ast, retArr) {
      if (this.isChildFunction(ast)) {
        return retArr;
      }
      return this.astFunction(ast, retArr);
    }
    astFunctionExpression(ast, retArr) {
      if (this.isChildFunction(ast)) {
        return retArr;
      }
      return this.astFunction(ast, retArr);
    }
    isChildFunction(ast) {
      for (let i = 0; i < this.functions.length; i++) {
        if (this.functions[i] === ast) {
          return true;
        }
      }
      return false;
    }
    astReturnStatement(ast, retArr) {
      return retArr;
    }
    astLiteral(ast, retArr) {
      this.literalTypes[`${ast.start},${ast.end}`] = 'Number';
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
      this.astGeneric(esNode.expression, retArr);
      retArr.push(';');
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
      retArr.push('break;');
      return retArr;
    }
    astContinueStatement(crNode, retArr) {
      retArr.push('continue;\n');
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
    astVariableDeclaration(varDecNode, retArr) {
      const declarations = varDecNode.declarations;
      if (!declarations || !declarations[0] || !declarations[0].init) {
        throw this.astErrorOutput('Unexpected expression', varDecNode);
      }
      const result = [];
      const firstDeclaration = declarations[0];
      const init = firstDeclaration.init;
      let type = this.isState('in-for-loop-init') ? 'Integer' : this.getType(init);
      if (type === 'LiteralInteger') {
        type = 'Number';
      }
      const markupType = typeMap[type];
      if (!markupType) {
        throw this.astErrorOutput(`Markup type ${ markupType } not handled`, varDecNode);
      }
      let dependencies = this.getDependencies(firstDeclaration.init);
      throw new Error('remove me');
      this.declarations[firstDeclaration.id.name] = Object.freeze({
        type,
        dependencies,
        isSafe: dependencies.every(dependency => dependency.isSafe)
      });
      const initResult = [`${type} user_${firstDeclaration.id.name}=`];
      this.astGeneric(init, initResult);
      result.push(initResult.join(''));
      for (let i = 1; i < declarations.length; i++) {
        const declaration = declarations[i];
        dependencies = this.getDependencies(declaration);
        throw new Error('Remove me');
        this.declarations[declaration.id.name] = Object.freeze({
          type,
          dependencies,
          isSafe: false
        });
        this.astGeneric(declaration, result);
      }
      retArr.push(retArr, result.join(','));
      retArr.push(';');
      return retArr;
    }
    astVariableDeclarator(iVarDecNode, retArr) {
      this.astGeneric(iVarDecNode.id, retArr);
      if (iVarDecNode.init !== null) {
        retArr.push('=');
        this.astGeneric(iVarDecNode.init, retArr);
      }
      return retArr;
    }
    astThisExpression(ast, retArr) {
      return retArr;
    }
    astSequenceExpression(sNode, retArr) {
      for (let i = 0; i < sNode.expressions.length; i++) {
        if (i > 0) {
          retArr.push(',');
        }
        this.astGeneric(sNode.expressions, retArr);
      }
      return retArr;
    }
    astUnaryExpression(uNode, retArr) {
      const unaryResult = this.checkAndUpconvertBitwiseUnary(uNode, retArr);
      if (unaryResult) {
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
      retArr.push('(');
      this.astGeneric(logNode.left, retArr);
      retArr.push(logNode.operator);
      this.astGeneric(logNode.right, retArr);
      retArr.push(')');
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
      if (ast.type !== 'MemberExpression') {
        throw this.astErrorOutput(`Expression ${ ast.type } not a MemberExpression`, ast);
      }
      let name = null;
      let type = null;
      const variableSignature = this.getVariableSignature(ast);
      switch (variableSignature) {
        case 'value':
          return null;
        case 'value.thread.value':
        case 'this.thread.value':
        case 'this.output.value':
          return {
            signature: variableSignature,
              type: 'Integer',
              name: ast.property.name
          };
        case 'value[]':
          if (typeof ast.object.name !== 'string') {
            throw this.astErrorOutput('Unexpected expression', ast);
          }
          name = ast.object.name;
          return {
            name,
            origin: 'user',
              signature: variableSignature,
              type: this.getVariableType(ast.object),
              xProperty: ast.property
          };
        case 'value[][]':
          if (typeof ast.object.object.name !== 'string') {
            throw this.astErrorOutput('Unexpected expression', ast);
          }
          name = ast.object.object.name;
          return {
            name,
            origin: 'user',
              signature: variableSignature,
              type: this.getVariableType(ast.object.object),
              yProperty: ast.object.property,
              xProperty: ast.property,
          };
        case 'value[][][]':
          if (typeof ast.object.object.object.name !== 'string') {
            throw this.astErrorOutput('Unexpected expression', ast);
          }
          name = ast.object.object.object.name;
          return {
            name,
            origin: 'user',
              signature: variableSignature,
              type: this.getVariableType(ast.object.object.object),
              zProperty: ast.object.object.property,
              yProperty: ast.object.property,
              xProperty: ast.property,
          };
        case 'value[][][][]':
          if (typeof ast.object.object.object.object.name !== 'string') {
            throw this.astErrorOutput('Unexpected expression', ast);
          }
          name = ast.object.object.object.object.name;
          return {
            name,
            origin: 'user',
              signature: variableSignature,
              type: this.getVariableType(ast.object.object.object.object),
              zProperty: ast.object.object.property,
              yProperty: ast.object.property,
              xProperty: ast.property,
          };
        case 'value.value':
          if (typeof ast.property.name !== 'string') {
            throw this.astErrorOutput('Unexpected expression', ast);
          }
          if (this.isAstMathVariable(ast)) {
            name = ast.property.name;
            return {
              name,
              origin: 'Math',
              type: 'Number',
              signature: variableSignature,
            };
          }
          switch (ast.property.name) {
            case 'r':
            case 'g':
            case 'b':
            case 'a':
              name = ast.object.name;
              return {
                name,
                property: ast.property.name,
                  origin: 'user',
                  signature: variableSignature,
                  type: 'Number'
              };
            default:
              throw this.astErrorOutput('Unexpected expression', ast);
          }
          case 'this.constants.value':
            if (typeof ast.property.name !== 'string') {
              throw this.astErrorOutput('Unexpected expression', ast);
            }
            name = ast.property.name;
            type = this.getConstantType(name);
            if (!type) {
              throw this.astErrorOutput('Constant has no type', ast);
            }
            return {
              name,
              type,
              origin: 'constants',
                signature: variableSignature,
            };
          case 'this.constants.value[]':
            if (typeof ast.object.property.name !== 'string') {
              throw this.astErrorOutput('Unexpected expression', ast);
            }
            name = ast.object.property.name;
            type = this.getConstantType(name);
            if (!type) {
              throw this.astErrorOutput('Constant has no type', ast);
            }
            return {
              name,
              type,
              origin: 'constants',
                signature: variableSignature,
                xProperty: ast.property,
            };
          case 'this.constants.value[][]': {
            if (typeof ast.object.object.property.name !== 'string') {
              throw this.astErrorOutput('Unexpected expression', ast);
            }
            name = ast.object.object.property.name;
            type = this.getConstantType(name);
            if (!type) {
              throw this.astErrorOutput('Constant has no type', ast);
            }
            return {
              name,
              type,
              origin: 'constants',
              signature: variableSignature,
              yProperty: ast.object.property,
              xProperty: ast.property,
            };
          }
          case 'this.constants.value[][][]': {
            if (typeof ast.object.object.object.property.name !== 'string') {
              throw this.astErrorOutput('Unexpected expression', ast);
            }
            name = ast.object.object.object.property.name;
            type = this.getConstantType(name);
            if (!type) {
              throw this.astErrorOutput('Constant has no type', ast);
            }
            return {
              name,
              type,
              origin: 'constants',
              signature: variableSignature,
              zProperty: ast.object.object.property,
              yProperty: ast.object.property,
              xProperty: ast.property,
            };
          }
          case 'fn()[]':
          case '[][]':
            return {
              signature: variableSignature,
                property: ast.property,
            };
          default:
            throw this.astErrorOutput('Unexpected expression', ast);
      }
    }
    findIdentifierOrigin(astToFind) {
      const stack = [this.ast];
      while (stack.length > 0) {
        const atNode = stack[0];
        if (atNode.type === 'VariableDeclarator' && atNode.id && atNode.id.name && atNode.id.name === astToFind.name) {
          return atNode;
        }
        stack.shift();
        if (atNode.argument) {
          stack.push(atNode.argument);
        } else if (atNode.body) {
          stack.push(atNode.body);
        } else if (atNode.declarations) {
          stack.push(atNode.declarations);
        } else if (Array.isArray(atNode)) {
          for (let i = 0; i < atNode.length; i++) {
            stack.push(atNode[i]);
          }
        }
      }
      return null;
    }
    findLastReturn(ast) {
      const stack = [ast || this.ast];
      while (stack.length > 0) {
        const atNode = stack.pop();
        if (atNode.type === 'ReturnStatement') {
          return atNode;
        }
        if (atNode.type === 'FunctionDeclaration') {
          continue;
        }
        if (atNode.argument) {
          stack.push(atNode.argument);
        } else if (atNode.body) {
          stack.push(atNode.body);
        } else if (atNode.declarations) {
          stack.push(atNode.declarations);
        } else if (Array.isArray(atNode)) {
          for (let i = 0; i < atNode.length; i++) {
            stack.push(atNode[i]);
          }
        } else if (atNode.consequent) {
          stack.push(atNode.consequent);
        } else if (atNode.cases) {
          stack.push(atNode.cases);
        }
      }
      return null;
    }
    getInternalVariableName(name) {
      if (!this._internalVariableNames.hasOwnProperty(name)) {
        this._internalVariableNames[name] = 0;
      }
      this._internalVariableNames[name]++;
      if (this._internalVariableNames[name] === 1) {
        return name;
      }
      return name + this._internalVariableNames[name];
    }
    varWarn() {
      console.warn('var declarations are deprecated, weird things happen when falling back to CPU because var scope differs in javascript than in most languages.  Use const or let');
    }
  }
  const typeLookupMap = {
    'Number': 'Number',
    'Float': 'Float',
    'Integer': 'Integer',
    'Array': 'Number',
    'Array(2)': 'Number',
    'Array(3)': 'Number',
    'Array(4)': 'Number',
    'Array2D': 'Number',
    'Array3D': 'Number',
    'Input': 'Number',
    'HTMLImage': 'Array(4)',
    'HTMLVideo': 'Array(4)',
    'HTMLImageArray': 'Array(4)',
    'NumberTexture': 'Number',
    'MemoryOptimizedNumberTexture': 'Number',
    'Array1D(2)': 'Array(2)',
    'Array1D(3)': 'Array(3)',
    'Array1D(4)': 'Array(4)',
    'Array2D(2)': 'Array(2)',
    'Array2D(3)': 'Array(3)',
    'Array2D(4)': 'Array(4)',
    'Array3D(2)': 'Array(2)',
    'Array3D(3)': 'Array(3)',
    'Array3D(4)': 'Array(4)',
    'ArrayTexture(1)': 'Number',
    'ArrayTexture(2)': 'Array(2)',
    'ArrayTexture(3)': 'Array(3)',
    'ArrayTexture(4)': 'Array(4)',
  };

  class CPUFunctionNode extends FunctionNode {
    astFunction(ast, retArr) {
      if (!this.isRootKernel) {
        retArr.push('function');
        retArr.push(' ');
        retArr.push(this.name);
        retArr.push('(');
        for (let i = 0; i < this.argumentNames.length; ++i) {
          const argumentName = this.argumentNames[i];
          if (i > 0) {
            retArr.push(', ');
          }
          retArr.push('user_');
          retArr.push(argumentName);
        }
        retArr.push(') {\n');
      }
      for (let i = 0; i < ast.body.body.length; ++i) {
        this.astGeneric(ast.body.body[i], retArr);
        retArr.push('\n');
      }
      if (!this.isRootKernel) {
        retArr.push('}\n');
      }
      return retArr;
    }
    astReturnStatement(ast, retArr) {
      const type = this.returnType || this.getType(ast.argument);
      if (!this.returnType) {
        this.returnType = type;
      }
      if (this.isRootKernel) {
        retArr.push(this.leadingReturnStatement);
        this.astGeneric(ast.argument, retArr);
        retArr.push(';\n');
        retArr.push(this.followingReturnStatement);
        retArr.push('continue;\n');
      } else if (this.isSubKernel) {
        retArr.push(`subKernelResult_${ this.name } = `);
        this.astGeneric(ast.argument, retArr);
        retArr.push(';');
        retArr.push(`return subKernelResult_${ this.name };`);
      } else {
        retArr.push('return ');
        this.astGeneric(ast.argument, retArr);
        retArr.push(';');
      }
      return retArr;
    }
    astLiteral(ast, retArr) {
      if (isNaN(ast.value)) {
        throw this.astErrorOutput(
          'Non-numeric literal not supported : ' + ast.value,
          ast
        );
      }
      retArr.push(ast.value);
      return retArr;
    }
    astBinaryExpression(ast, retArr) {
      retArr.push('(');
      this.astGeneric(ast.left, retArr);
      retArr.push(ast.operator);
      this.astGeneric(ast.right, retArr);
      retArr.push(')');
      return retArr;
    }
    astIdentifierExpression(idtNode, retArr) {
      if (idtNode.type !== 'Identifier') {
        throw this.astErrorOutput(
          'IdentifierExpression - not an Identifier',
          idtNode
        );
      }
      switch (idtNode.name) {
        case 'Infinity':
          retArr.push('Infinity');
          break;
        default:
          if (this.constants && this.constants.hasOwnProperty(idtNode.name)) {
            retArr.push('constants_' + idtNode.name);
          } else {
            retArr.push('user_' + idtNode.name);
          }
      }
      return retArr;
    }
    astForStatement(forNode, retArr) {
      if (forNode.type !== 'ForStatement') {
        throw this.astErrorOutput('Invalid for statement', forNode);
      }
      const initArr = [];
      const testArr = [];
      const updateArr = [];
      const bodyArr = [];
      let isSafe = null;
      if (forNode.init) {
        this.pushState('in-for-loop-init');
        this.astGeneric(forNode.init, initArr);
        for (let i = 0; i < initArr.length; i++) {
          if (initArr[i].includes && initArr[i].includes(',')) {
            isSafe = false;
          }
        }
        this.popState('in-for-loop-init');
      } else {
        isSafe = false;
      }
      if (forNode.test) {
        this.astGeneric(forNode.test, testArr);
      } else {
        isSafe = false;
      }
      if (forNode.update) {
        this.astGeneric(forNode.update, updateArr);
      } else {
        isSafe = false;
      }
      if (forNode.body) {
        this.pushState('loop-body');
        this.astGeneric(forNode.body, bodyArr);
        this.popState('loop-body');
      }
      if (isSafe === null) {
        isSafe = this.isSafe(forNode.init) && this.isSafe(forNode.test);
      }
      if (isSafe) {
        retArr.push(`for (${initArr.join('')};${testArr.join('')};${updateArr.join('')}){\n`);
        retArr.push(bodyArr.join(''));
        retArr.push('}\n');
      } else {
        const iVariableName = this.getInternalVariableName('safeI');
        if (initArr.length > 0) {
          retArr.push(initArr.join(''), ';\n');
        }
        retArr.push(`for (let ${iVariableName}=0;${iVariableName}<LOOP_MAX;${iVariableName}++){\n`);
        if (testArr.length > 0) {
          retArr.push(`if (!${testArr.join('')}) break;\n`);
        }
        retArr.push(bodyArr.join(''));
        retArr.push(`\n${updateArr.join('')};`);
        retArr.push('}\n');
      }
      return retArr;
    }
    astWhileStatement(whileNode, retArr) {
      if (whileNode.type !== 'WhileStatement') {
        throw this.astErrorOutput(
          'Invalid while statement',
          whileNode
        );
      }
      retArr.push('for (let i = 0; i < LOOP_MAX; i++) {');
      retArr.push('if (');
      this.astGeneric(whileNode.test, retArr);
      retArr.push(') {\n');
      this.astGeneric(whileNode.body, retArr);
      retArr.push('} else {\n');
      retArr.push('break;\n');
      retArr.push('}\n');
      retArr.push('}\n');
      return retArr;
    }
    astDoWhileStatement(doWhileNode, retArr) {
      if (doWhileNode.type !== 'DoWhileStatement') {
        throw this.astErrorOutput(
          'Invalid while statement',
          doWhileNode
        );
      }
      retArr.push('for (let i = 0; i < LOOP_MAX; i++) {');
      this.astGeneric(doWhileNode.body, retArr);
      retArr.push('if (!');
      this.astGeneric(doWhileNode.test, retArr);
      retArr.push(') {\n');
      retArr.push('break;\n');
      retArr.push('}\n');
      retArr.push('}\n');
      return retArr;
    }
    astAssignmentExpression(assNode, retArr) {
      const declaration = this.getDeclaration(assNode.left);
      if (declaration && !declaration.assignable) {
        throw new this.astErrorOutput(`Variable ${assNode.left.name} is not assignable here`, assNode);
      }
      this.astGeneric(assNode.left, retArr);
      retArr.push(assNode.operator);
      this.astGeneric(assNode.right, retArr);
      return retArr;
    }
    astBlockStatement(bNode, retArr) {
      if (this.isState('loop-body')) {
        this.pushState('block-body');
        for (let i = 0; i < bNode.body.length; i++) {
          this.astGeneric(bNode.body[i], retArr);
        }
        this.popState('block-body');
      } else {
        retArr.push('{\n');
        for (let i = 0; i < bNode.body.length; i++) {
          this.astGeneric(bNode.body[i], retArr);
        }
        retArr.push('}\n');
      }
      return retArr;
    }
    astVariableDeclaration(varDecNode, retArr) {
      if (varDecNode.kind === 'var' && this.warnVarUsage) {
        this.varWarn();
      }
      retArr.push(`${varDecNode.kind} `);
      const { declarations } = varDecNode;
      for (let i = 0; i < declarations.length; i++) {
        if (i > 0) {
          retArr.push(',');
        }
        this.astGeneric(declarations[i], retArr);
      }
      if (!this.isState('in-for-loop-init')) {
        retArr.push(';');
      }
      return retArr;
    }
    astIfStatement(ifNode, retArr) {
      retArr.push('if (');
      this.astGeneric(ifNode.test, retArr);
      retArr.push(')');
      if (ifNode.consequent.type === 'BlockStatement') {
        this.astGeneric(ifNode.consequent, retArr);
      } else {
        retArr.push(' {\n');
        this.astGeneric(ifNode.consequent, retArr);
        retArr.push('\n}\n');
      }
      if (ifNode.alternate) {
        retArr.push('else ');
        if (ifNode.alternate.type === 'BlockStatement') {
          this.astGeneric(ifNode.alternate, retArr);
        } else {
          retArr.push(' {\n');
          this.astGeneric(ifNode.alternate, retArr);
          retArr.push('\n}\n');
        }
      }
      return retArr;
    }
    astSwitchStatement(ast, retArr) {
      const { discriminant, cases } = ast;
      retArr.push('switch (');
      this.astGeneric(discriminant, retArr);
      retArr.push(') {\n');
      for (let i = 0; i < cases.length; i++) {
        if (cases[i].test === null) {
          retArr.push('default:\n');
          this.astGeneric(cases[i].consequent, retArr);
          if (cases[i].consequent && cases[i].consequent.length > 0) {
            retArr.push('break;\n');
          }
          continue;
        }
        retArr.push('case ');
        this.astGeneric(cases[i].test, retArr);
        retArr.push(':\n');
        if (cases[i].consequent && cases[i].consequent.length > 0) {
          this.astGeneric(cases[i].consequent, retArr);
          retArr.push('break;\n');
        }
      }
      retArr.push('\n}');
    }
    astThisExpression(tNode, retArr) {
      retArr.push('_this');
      return retArr;
    }
    astMemberExpression(mNode, retArr) {
      const {
        signature,
        type,
        property,
        xProperty,
        yProperty,
        zProperty,
        name,
        origin
      } = this.getMemberExpressionDetails(mNode);
      switch (signature) {
        case 'this.thread.value':
          retArr.push(`_this.thread.${ name }`);
          return retArr;
        case 'this.output.value':
          switch (name) {
            case 'x':
              retArr.push('outputX');
              break;
            case 'y':
              retArr.push('outputY');
              break;
            case 'z':
              retArr.push('outputZ');
              break;
            default:
              throw this.astErrorOutput('Unexpected expression', mNode);
          }
          return retArr;
        case 'value':
          throw this.astErrorOutput('Unexpected expression', mNode);
        case 'value[]':
        case 'value[][]':
        case 'value[][][]':
        case 'value.value':
          if (origin === 'Math') {
            retArr.push(Math[name]);
            return retArr;
          }
          switch (property) {
            case 'r':
              retArr.push(`user_${ name }[0]`);
              return retArr;
            case 'g':
              retArr.push(`user_${ name }[1]`);
              return retArr;
            case 'b':
              retArr.push(`user_${ name }[2]`);
              return retArr;
            case 'a':
              retArr.push(`user_${ name }[3]`);
              return retArr;
          }
          break;
        case 'this.constants.value':
        case 'this.constants.value[]':
        case 'this.constants.value[][]':
        case 'this.constants.value[][][]':
          break;
        case 'fn()[]':
          this.astGeneric(mNode.object, retArr);
          retArr.push('[');
          this.astGeneric(mNode.property, retArr);
          retArr.push(']');
          return retArr;
        default:
          throw this.astErrorOutput('Unexpected expression', mNode);
      }
      if (!mNode.computed) {
        switch (type) {
          case 'Number':
          case 'Integer':
          case 'Float':
          case 'Boolean':
            retArr.push(`${origin}_${name}`);
            return retArr;
        }
      }
      const markupName = `${origin}_${name}`;
      switch (type) {
        case 'Array(2)':
        case 'Array(3)':
        case 'Array(4)':
        case 'HTMLImageArray':
        case 'ArrayTexture(1)':
        case 'ArrayTexture(2)':
        case 'ArrayTexture(3)':
        case 'ArrayTexture(4)':
        case 'HTMLImage':
        default:
          let size;
          let isInput;
          if (origin === 'constants') {
            const constant = this.constants[name];
            isInput = this.constantTypes[name] === 'Input';
            size = isInput ? constant.size : null;
          } else {
            isInput = this.isInput(name);
            size = isInput ? this.argumentSizes[this.argumentNames.indexOf(name)] : null;
          }
          retArr.push(`${ markupName }`);
          if (zProperty && yProperty) {
            if (isInput) {
              retArr.push('[(');
              this.astGeneric(zProperty, retArr);
              retArr.push(`*${ this.dynamicArguments ? '(outputY * outputX)' : size[1] * size[0] })+(`);
              this.astGeneric(yProperty, retArr);
              retArr.push(`*${ this.dynamicArguments ? 'outputX' : size[0] })+`);
              this.astGeneric(xProperty, retArr);
              retArr.push(']');
            } else {
              retArr.push('[');
              this.astGeneric(zProperty, retArr);
              retArr.push(']');
              retArr.push('[');
              this.astGeneric(yProperty, retArr);
              retArr.push(']');
              retArr.push('[');
              this.astGeneric(xProperty, retArr);
              retArr.push(']');
            }
          } else if (yProperty) {
            if (isInput) {
              retArr.push('[(');
              this.astGeneric(yProperty, retArr);
              retArr.push(`*${ this.dynamicArguments ? 'outputX' : size[0] })+`);
              this.astGeneric(xProperty, retArr);
              retArr.push(']');
            } else {
              retArr.push('[');
              this.astGeneric(yProperty, retArr);
              retArr.push(']');
              retArr.push('[');
              this.astGeneric(xProperty, retArr);
              retArr.push(']');
            }
          } else if (typeof xProperty !== 'undefined') {
            retArr.push('[');
            this.astGeneric(xProperty, retArr);
            retArr.push(']');
          }
      }
      return retArr;
    }
    astCallExpression(ast, retArr) {
      if (ast.type !== 'CallExpression') {
        throw this.astErrorOutput('Unknown CallExpression', ast);
      }
      let functionName = this.astMemberExpressionUnroll(ast.callee);
      if (this.calledFunctions.indexOf(functionName) < 0) {
        this.calledFunctions.push(functionName);
      }
      const isMathFunction = this.isAstMathFunction(ast);
      if (this.onFunctionCall) {
        this.onFunctionCall(this.name, functionName, ast.arguments);
      }
      retArr.push(functionName);
      retArr.push('(');
      const targetTypes = this.lookupFunctionArgumentTypes(functionName) || [];
      for (let i = 0; i < ast.arguments.length; ++i) {
        const argument = ast.arguments[i];
        let argumentType = this.getType(argument);
        if (!targetTypes[i]) {
          this.triggerImplyArgumentType(functionName, i, argumentType, this);
        }
        if (i > 0) {
          retArr.push(', ');
        }
        this.astGeneric(argument, retArr);
      }
      retArr.push(')');
      return retArr;
    }
    astArrayExpression(arrNode, retArr) {
      const arrLen = arrNode.elements.length;
      retArr.push('new Float32Array([');
      for (let i = 0; i < arrLen; ++i) {
        if (i > 0) {
          retArr.push(', ');
        }
        const subNode = arrNode.elements[i];
        this.astGeneric(subNode, retArr);
      }
      retArr.push('])');
      return retArr;
    }
    astDebuggerStatement(arrNode, retArr) {
      retArr.push('debugger;');
      return retArr;
    }
  }

  function constantsToString(constants, types) {
    const results = [];
    for (const name in types) {
      if (!types.hasOwnProperty(name)) continue;
      const type = types[name];
      const constant = constants[name];
      switch (type) {
        case 'Number':
        case 'Integer':
        case 'Float':
        case 'Boolean':
          results.push(`${name}:${constant}`);
          break;
        case 'Array(2)':
        case 'Array(3)':
        case 'Array(4)':
          results.push(`${name}:new ${constant.constructor.name}(${JSON.stringify(Array.from(constant))})`);
          break;
      }
    }
    return `{ ${ results.join() } }`;
  }
  function cpuKernelString(cpuKernel, name) {
    const header = [];
    const thisProperties = [];
    const beforeReturn = [];
    const useFunctionKeyword = !/^function/.test(cpuKernel.color.toString());
    header.push(
      '  const { context, canvas, constants: incomingConstants } = settings;',
      `  const output = new Int32Array(${JSON.stringify(Array.from(cpuKernel.output))});`,
      `  const _constantTypes = ${JSON.stringify(cpuKernel.constantTypes)};`,
      `  const _constants = ${constantsToString(cpuKernel.constants, cpuKernel.constantTypes)};`,
    );
    thisProperties.push(
      '    constants: _constants,',
      '    context,',
      '    output,',
      '    thread: {x: 0, y: 0, z: 0},',
    );
    if (cpuKernel.graphical) {
      header.push(`  const _imageData = context.createImageData(${cpuKernel.output[0]}, ${cpuKernel.output[1]});`);
      header.push(`  const _colorData = new Uint8ClampedArray(${cpuKernel.output[0]} * ${cpuKernel.output[1]} * 4);`);
      const colorFn = utils$1.flattenFunctionToString((useFunctionKeyword ? 'function ' : '') + cpuKernel.color.toString(), {
        thisLookup: (propertyName) => {
          switch (propertyName) {
            case '_colorData':
              return '_colorData';
            case '_imageData':
              return '_imageData';
            case 'output':
              return 'output';
            case 'thread':
              return 'this.thread';
          }
          return JSON.stringify(cpuKernel[propertyName]);
        },
        findDependency: (object, name) => {
          return null;
        }
      });
      const getPixelsFn = utils$1.flattenFunctionToString((useFunctionKeyword ? 'function ' : '') + cpuKernel.getPixels.toString(), {
        thisLookup: (propertyName) => {
          switch (propertyName) {
            case '_colorData':
              return '_colorData';
            case '_imageData':
              return '_imageData';
            case 'output':
              return 'output';
            case 'thread':
              return 'this.thread';
          }
          return JSON.stringify(cpuKernel[propertyName]);
        },
        findDependency: () => {
          return null;
        }
      });
      thisProperties.push(
        '    _imageData,',
        '    _colorData,',
        `    color: ${colorFn},`,
      );
      beforeReturn.push(
        `  kernel.getPixels = ${getPixelsFn};`
      );
    }
    const constantTypes = [];
    const constantKeys = Object.keys(cpuKernel.constantTypes);
    for (let i = 0; i < constantKeys.length; i++) {
      constantTypes.push(cpuKernel.constantTypes[constantKeys]);
    }
    if (cpuKernel.argumentTypes.indexOf('HTMLImageArray') !== -1 || constantTypes.indexOf('HTMLImageArray') !== -1) {
      const flattenedImageTo3DArray = utils$1.flattenFunctionToString((useFunctionKeyword ? 'function ' : '') + cpuKernel._imageTo3DArray.toString(), {
        doNotDefine: ['canvas'],
        findDependency: (object, name) => {
          if (object === 'this') {
            return (useFunctionKeyword ? 'function ' : '') + cpuKernel[name].toString();
          }
          return null;
        },
        thisLookup: (propertyName) => {
          switch (propertyName) {
            case 'canvas':
              return;
            case 'context':
              return 'context';
          }
        }
      });
      beforeReturn.push(flattenedImageTo3DArray);
      thisProperties.push(`    _mediaTo2DArray,`);
      thisProperties.push(`    _imageTo3DArray,`);
    } else if (cpuKernel.argumentTypes.indexOf('HTMLImage') !== -1 || constantTypes.indexOf('HTMLImage') !== -1) {
      const flattenedImageTo2DArray = utils$1.flattenFunctionToString((useFunctionKeyword ? 'function ' : '') + cpuKernel._mediaTo2DArray.toString(), {
        findDependency: (object, name) => {
          return null;
        },
        thisLookup: (propertyName) => {
          switch (propertyName) {
            case 'canvas':
              return 'settings.canvas';
            case 'context':
              return 'settings.context';
          }
          throw new Error('unhandled thisLookup');
        }
      });
      beforeReturn.push(flattenedImageTo2DArray);
      thisProperties.push(`    _mediaTo2DArray,`);
    }
    return `function(settings) {
${ header.join('\n') }
  for (const p in _constantTypes) {
    if (!_constantTypes.hasOwnProperty(p)) continue;
    const type = _constantTypes[p];
    switch (type) {
      case 'Number':
      case 'Integer':
      case 'Float':
      case 'Boolean':
      case 'Array(2)':
      case 'Array(3)':
      case 'Array(4)':
        if (incomingConstants.hasOwnProperty(p)) {
          console.warn('constant ' + p + ' of type ' + type + ' cannot be resigned');
        }
        continue;
    }
    if (!incomingConstants.hasOwnProperty(p)) {
      throw new Error('constant ' + p + ' not found');
    }
    _constants[p] = incomingConstants[p];
  }
  const kernel = (function() {
${cpuKernel._kernelString}
  })
    .apply({ ${thisProperties.join('\n')} });
  ${ beforeReturn.join('\n') }
  return kernel;
}`;
  }

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
    static get mode() {
      return 'cpu';
    }
    static nativeFunctionArguments() {
      return null;
    }
    static nativeFunctionReturnType() {
      return null;
    }
    static combineKernels(combinedKernel) {
      return combinedKernel;
    }
    constructor(source, settings) {
      super(source, settings);
      this.mergeSettings(source.settings || settings);
      this._imageData = null;
      this._colorData = null;
      this._kernelString = null;
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
    validateSettings(args) {
      if (!this.output || this.output.length === 0) {
        if (args.length !== 1) {
          throw new Error('Auto output only supported for kernels with only one input');
        }
        const argType = utils$1.getVariableType(args[0], this.strictIntegers);
        if (argType === 'Array') {
          this.output = utils$1.getDimensions(argType);
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
    build() {
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
    ${ this._processArguments() }
    ${ this.graphical ? this._graphicalKernelBody(kernelThreadString) : this._resultKernelBody(kernelThreadString) }
    ${ translatedSources.length > 0 ? translatedSources.join('\n') : '' }
  };`;
    }
    toString() {
      return cpuKernelString(this);
    }
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
      return flip ? utils$1.flipPixels(this._imageData.data, width, height) : this._imageData.data.slice(0);
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
  }

  class GLTextureFloat extends Texture {
    constructor(settings) {
      super(settings);
      this.type = 'ArrayTexture(1)';
    }
    renderRawOutput() {
      const { context: gl } = this;
      const framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        this.texture,
        0
      );
      const result = new Float32Array(this.size[0] * this.size[1] * 4);
      gl.readPixels(0, 0, this.size[0], this.size[1], gl.RGBA, gl.FLOAT, result);
      return result;
    }
    renderValues() {
      return this.renderRawOutput();
    }
    toArray() {
      return utils$1.erectFloat(this.renderValues(), this.output[0]);
    }
  }

  class GLTextureArray2Float extends GLTextureFloat {
    constructor(settings) {
      super(settings);
      this.type = 'ArrayTexture(2)';
    }
    toArray() {
      return utils$1.erectArray2(this.renderValues(), this.output[0], this.output[1]);
    }
  }

  class GLTextureArray2Float2D extends GLTextureFloat {
    constructor(settings) {
      super(settings);
      this.type = 'ArrayTexture(2)';
    }
    toArray() {
      return utils$1.erect2DArray2(this.renderValues(), this.output[0], this.output[1]);
    }
  }

  class GLTextureArray2Float3D extends GLTextureFloat {
    constructor(settings) {
      super(settings);
      this.type = 'ArrayTexture(2)';
    }
    toArray() {
      return utils$1.erect3DArray2(this.renderValues(), this.output[0], this.output[1], this.output[2]);
    }
  }

  class GLTextureArray3Float extends GLTextureFloat {
    constructor(settings) {
      super(settings);
      this.type = 'ArrayTexture(3)';
    }
    toArray() {
      return utils$1.erectArray3(this.renderValues(), this.output[0]);
    }
  }

  class GLTextureArray3Float2D extends GLTextureFloat {
    constructor(settings) {
      super(settings);
      this.type = 'ArrayTexture(3)';
    }
    toArray() {
      return utils$1.erect2DArray3(this.renderValues(), this.output[0], this.output[1]);
    }
  }

  class GLTextureArray3Float3D extends GLTextureFloat {
    constructor(settings) {
      super(settings);
      this.type = 'ArrayTexture(3)';
    }
    toArray() {
      return utils$1.erect3DArray3(this.renderValues(), this.output[0], this.output[1], this.output[2]);
    }
  }

  class GLTextureArray4Float extends GLTextureFloat {
    constructor(settings) {
      super(settings);
      this.type = 'ArrayTexture(4)';
    }
    toArray() {
      return utils$1.erectArray4(this.renderValues(), this.output[0]);
    }
  }

  class GLTextureArray4Float2D extends GLTextureFloat {
    constructor(settings) {
      super(settings);
      this.type = 'ArrayTexture(4)';
    }
    toArray() {
      return utils$1.erect2DArray4(this.renderValues(), this.output[0], this.output[1]);
    }
  }

  class GLTextureArray4Float3D extends GLTextureFloat {
    constructor(settings) {
      super(settings);
      this.type = 'ArrayTexture(4)';
    }
    toArray() {
      return utils$1.erect3DArray4(this.renderValues(), this.output[0], this.output[1], this.output[2]);
    }
  }

  class GLTextureFloat2D extends GLTextureFloat {
    constructor(settings) {
      super(settings);
      this.type = 'ArrayTexture(1)';
    }
    toArray() {
      return utils$1.erect2DFloat(this.renderValues(), this.output[0], this.output[1]);
    }
  }

  class GLTextureFloat3D extends GLTextureFloat {
    constructor(settings) {
      super(settings);
      this.type = 'ArrayTexture(1)';
    }
    toArray() {
      return utils$1.erect3DFloat(this.renderValues(), this.output[0], this.output[1], this.output[2]);
    }
  }

  class GLTextureMemoryOptimized extends GLTextureFloat {
    constructor(settings) {
      super(settings);
      this.type = 'MemoryOptimizedNumberTexture';
    }
    toArray() {
      return utils$1.erectMemoryOptimizedFloat(this.renderValues(), this.output[0]);
    }
  }

  class GLTextureMemoryOptimized2D extends GLTextureFloat {
    constructor(settings) {
      super(settings);
      this.type = 'MemoryOptimizedNumberTexture';
    }
    toArray() {
      return utils$1.erectMemoryOptimized2DFloat(this.renderValues(), this.output[0], this.output[1]);
    }
  }

  class GLTextureMemoryOptimized3D extends GLTextureFloat {
    constructor(settings) {
      super(settings);
      this.type = 'MemoryOptimizedNumberTexture';
    }
    toArray() {
      return utils$1.erectMemoryOptimized3DFloat(this.renderValues(), this.output[0], this.output[1], this.output[2]);
    }
  }

  class GLTextureUnsigned extends Texture {
    constructor(settings) {
      super(settings);
      this.type = 'NumberTexture';
    }
    renderRawOutput() {
      const { context: gl } = this;
      const framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        this.texture,
        0
      );
      const result = new Uint8Array(this.size[0] * this.size[1] * 4);
      gl.readPixels(0, 0, this.size[0], this.size[1], gl.RGBA, gl.UNSIGNED_BYTE, result);
      return result;
    }
    renderValues() {
      return new Float32Array(this.renderRawOutput().buffer);
    }
    toArray() {
      return utils$1.erectPackedFloat(this.renderValues(), this.output[0]);
    }
  }

  class GLTextureUnsigned2D extends GLTextureUnsigned {
    constructor(settings) {
      super(settings);
      this.type = 'NumberTexture';
    }
    toArray() {
      return utils$1.erect2DPackedFloat(this.renderValues(), this.output[0], this.output[1]);
    }
  }

  class GLTextureUnsigned3D extends GLTextureUnsigned {
    constructor(settings) {
      super(settings);
      this.type = 'NumberTexture';
    }
    toArray() {
      return utils$1.erect3DPackedFloat(this.renderValues(), this.output[0], this.output[1], this.output[2]);
    }
  }

  class GLTextureGraphical extends GLTextureUnsigned {
    constructor(settings) {
      super(settings);
      this.type = 'ArrayTexture(4)';
    }
    toArray() {
      return this.renderValues();
    }
  }

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
      return result[0] === 2 && result[1] === 1511;
    }
    static get testCanvas() {
      throw new Error(`"testCanvas" not defined on ${ this.name }`);
    }
    static get testContext() {
      throw new Error(`"testContext" not defined on ${ this.name }`);
    }
    static get features() {
      throw new Error(`"features" not defined on ${ this.name }`);
    }
    static setupFeatureChecks() {
      throw new Error(`"setupFeatureChecks" not defined on ${ this.name }`);
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
      utils$1.warnDeprecated('method', 'setFloatTextures', 'setOptimizeFloatMemory');
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
        if (state === 'FUNCTION_ARGUMENTS' && char === '/' && nextChar === '*') {
          states.push('MULTI_LINE_COMMENT');
          i += 2;
          continue;
        } else if (state === 'MULTI_LINE_COMMENT' && char === '*' && nextChar === '/') {
          states.pop();
          i += 2;
          continue;
        }
        else if (state === 'FUNCTION_ARGUMENTS' && char === '/' && nextChar === '/') {
          states.push('COMMENT');
          i += 2;
          continue;
        } else if (state === 'COMMENT' && char === '\n') {
          states.pop();
          i++;
          continue;
        }
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
            argumentTypes.push(typeMap$1[argumentType]);
          }
        }
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
      return typeMap$1[source.match(/int|float|vec[2-4]/)[0]];
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
        return utils$1.splitArray(result, lastKernel.output[0]);
      } else if (lastKernel.output.length === 3) {
        const cube = utils$1.splitArray(result, lastKernel.output[0] * lastKernel.output[1]);
        return cube.map(function(x) {
          return utils$1.splitArray(x, lastKernel.output[0]);
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
                this.formatValues = utils$1.erect3DPackedFloat;
                return null;
              } else if (this.output[1] > 0) {
                this.TextureConstructor = GLTextureUnsigned2D;
                this.renderStrategy = renderStrategy.PackedPixelTo2DFloat;
                this.formatValues = utils$1.erect2DPackedFloat;
                return null;
              } else {
                this.TextureConstructor = GLTextureUnsigned;
                this.renderStrategy = renderStrategy.PackedPixelToFloat;
                this.formatValues = utils$1.erectPackedFloat;
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
                this.formatValues = utils$1.erectMemoryOptimized3DFloat;
                return null;
              } else if (this.output[1] > 0) {
                this.TextureConstructor = GLTextureMemoryOptimized2D;
                this.renderStrategy = renderStrategy.MemoryOptimizedFloatPixelToMemoryOptimized2DFloat;
                this.formatValues = utils$1.erectMemoryOptimized2DFloat;
                return null;
              } else {
                this.TextureConstructor = GLTextureMemoryOptimized;
                this.renderStrategy = renderStrategy.MemoryOptimizedFloatPixelToMemoryOptimizedFloat;
                this.formatValues = utils$1.erectMemoryOptimizedFloat;
                return null;
              }
              break;
            case 'Array(2)':
              if (this.output[2] > 0) {
                this.TextureConstructor = GLTextureArray2Float3D;
                this.renderStrategy = renderStrategy.FloatPixelTo3DArray2;
                this.formatValues = utils$1.erect3DArray2;
                return null;
              } else if (this.output[1] > 0) {
                this.TextureConstructor = GLTextureArray2Float2D;
                this.renderStrategy = renderStrategy.FloatPixelTo2DArray2;
                this.formatValues = utils$1.erect2DArray2;
                return null;
              } else {
                this.TextureConstructor = GLTextureArray2Float;
                this.renderStrategy = renderStrategy.FloatPixelToArray2;
                this.formatValues = utils$1.erectArray2;
                return null;
              }
              break;
            case 'Array(3)':
              if (this.output[2] > 0) {
                this.TextureConstructor = GLTextureArray3Float3D;
                this.renderStrategy = renderStrategy.FloatPixelTo3DArray3;
                this.formatValues = utils$1.erect3DArray3;
                return null;
              } else if (this.output[1] > 0) {
                this.TextureConstructor = GLTextureArray3Float2D;
                this.renderStrategy = renderStrategy.FloatPixelTo2DArray3;
                this.formatValues = utils$1.erect2DArray3;
                return null;
              } else {
                this.TextureConstructor = GLTextureArray3Float;
                this.renderStrategy = renderStrategy.FloatPixelToArray3;
                this.formatValues = utils$1.erectArray3;
                return null;
              }
              break;
            case 'Array(4)':
              if (this.output[2] > 0) {
                this.TextureConstructor = GLTextureArray4Float3D;
                this.renderStrategy = renderStrategy.FloatPixelTo3DArray4;
                this.formatValues = utils$1.erect3DArray4;
                return null;
              } else if (this.output[1] > 0) {
                this.TextureConstructor = GLTextureArray4Float2D;
                this.renderStrategy = renderStrategy.FloatPixelTo2DArray4;
                this.formatValues = utils$1.erect2DArray4;
                return null;
              } else {
                this.TextureConstructor = GLTextureArray4Float;
                this.renderStrategy = renderStrategy.FloatPixelToArray4;
                this.formatValues = utils$1.erectArray4;
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
                this.formatValues = utils$1.erect3DFloat;
                return null;
              } else if (this.output[1] > 0) {
                this.TextureConstructor = GLTextureFloat2D;
                this.renderStrategy = renderStrategy.FloatPixelTo2DFloat;
                this.formatValues = utils$1.erect2DFloat;
                return null;
              } else {
                this.TextureConstructor = GLTextureFloat;
                this.renderStrategy = renderStrategy.FloatPixelToFloat;
                this.formatValues = utils$1.erectFloat;
                return null;
              }
              break;
            case 'Array(2)':
              if (this.output[2] > 0) {
                this.TextureConstructor = GLTextureArray2Float3D;
                this.renderStrategy = renderStrategy.FloatPixelTo3DArray2;
                this.formatValues = utils$1.erect3DArray2;
                return null;
              } else if (this.output[1] > 0) {
                this.TextureConstructor = GLTextureArray2Float2D;
                this.renderStrategy = renderStrategy.FloatPixelTo2DArray2;
                this.formatValues = utils$1.erect2DArray2;
                return null;
              } else {
                this.TextureConstructor = GLTextureArray2Float;
                this.renderStrategy = renderStrategy.FloatPixelToArray2;
                this.formatValues = utils$1.erectArray2;
                return null;
              }
              break;
            case 'Array(3)':
              if (this.output[2] > 0) {
                this.TextureConstructor = GLTextureArray3Float3D;
                this.renderStrategy = renderStrategy.FloatPixelTo3DArray3;
                this.formatValues = utils$1.erect3DArray3;
                return null;
              } else if (this.output[1] > 0) {
                this.TextureConstructor = GLTextureArray3Float2D;
                this.renderStrategy = renderStrategy.FloatPixelTo2DArray3;
                this.formatValues = utils$1.erect2DArray3;
                return null;
              } else {
                this.TextureConstructor = GLTextureArray3Float;
                this.renderStrategy = renderStrategy.FloatPixelToArray3;
                this.formatValues = utils$1.erectArray3;
                return null;
              }
              break;
            case 'Array(4)':
              if (this.output[2] > 0) {
                this.TextureConstructor = GLTextureArray4Float3D;
                this.renderStrategy = renderStrategy.FloatPixelTo3DArray4;
                this.formatValues = utils$1.erect3DArray4;
                return null;
              } else if (this.output[1] > 0) {
                this.TextureConstructor = GLTextureArray4Float2D;
                this.renderStrategy = renderStrategy.FloatPixelTo2DArray4;
                this.formatValues = utils$1.erect2DArray4;
                return null;
              } else {
                this.TextureConstructor = GLTextureArray4Float;
                this.renderStrategy = renderStrategy.FloatPixelToArray4;
                this.formatValues = utils$1.erectArray4;
                return null;
              }
          }
        }
      } else {
        throw new Error(`unhandled precision of "${this.precision}"`);
      }
      throw new Error(`unhandled return type "${this.returnType}"`);
    }
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
      return utils$1.linesToString(this.getMainResultKernelNumberTexture()) +
        utils$1.linesToString(this.getMainResultSubKernelNumberTexture());
    }
    getMainResultArray2Texture() {
      return utils$1.linesToString(this.getMainResultKernelArray2Texture()) +
        utils$1.linesToString(this.getMainResultSubKernelArray2Texture());
    }
    getMainResultArray3Texture() {
      return utils$1.linesToString(this.getMainResultKernelArray3Texture()) +
        utils$1.linesToString(this.getMainResultSubKernelArray3Texture());
    }
    getMainResultArray4Texture() {
      return utils$1.linesToString(this.getMainResultKernelArray4Texture()) +
        utils$1.linesToString(this.getMainResultSubKernelArray4Texture());
    }
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
    getPixels(flip) {
      const {
        context: gl,
        output
      } = this;
      const [width, height] = output;
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return new Uint8ClampedArray((flip ? pixels : utils$1.flipPixels(pixels, width, height)).buffer);
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
        this.texSize = utils$1.getKernelTextureSize({
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
  const typeMap$1 = {
    int: 'Integer',
    float: 'Number',
    vec2: 'Array(2)',
    vec3: 'Array(3)',
    vec4: 'Array(4)',
  };

  class WebGLFunctionNode extends FunctionNode {
    constructor(source, settings) {
      super(source, settings);
      if (settings && settings.hasOwnProperty('fixIntegerDivisionAccuracy')) {
        this.fixIntegerDivisionAccuracy = settings.fixIntegerDivisionAccuracy;
      }
    }
    astFunction(ast, retArr) {
      if (this.isRootKernel) {
        retArr.push('void');
      } else {
        if (!this.returnType) {
          const lastReturn = this.findLastReturn();
          if (lastReturn) {
            this.returnType = this.getType(ast.body);
            if (this.returnType === 'LiteralInteger') {
              this.returnType = 'Number';
            }
          }
        }
        const { returnType } = this;
        if (!returnType) {
          retArr.push('void');
        } else {
          const type = typeMap$2[returnType];
          if (!type) {
            throw new Error(`unknown type ${returnType}`);
          }
          retArr.push(type);
        }
      }
      retArr.push(' ');
      retArr.push(this.name);
      retArr.push('(');
      if (!this.isRootKernel) {
        for (let i = 0; i < this.argumentNames.length; ++i) {
          const argumentName = this.argumentNames[i];
          if (i > 0) {
            retArr.push(', ');
          }
          let argumentType = this.argumentTypes[this.argumentNames.indexOf(argumentName)];
          if (!argumentType) {
            throw this.astErrorOutput(`Unknown argument ${argumentName} type`, ast);
          }
          if (argumentType === 'LiteralInteger') {
            this.argumentTypes[i] = argumentType = 'Number';
          }
          const type = typeMap$2[argumentType];
          if (!type) {
            throw this.astErrorOutput('Unexpected expression', ast);
          }
          retArr.push(type);
          retArr.push(' ');
          retArr.push('user_');
          retArr.push(argumentName);
        }
      }
      retArr.push(') {\n');
      for (let i = 0; i < ast.body.body.length; ++i) {
        this.astGeneric(ast.body.body[i], retArr);
        retArr.push('\n');
      }
      retArr.push('}\n');
      return retArr;
    }
    astReturnStatement(ast, retArr) {
      if (!ast.argument) throw this.astErrorOutput('Unexpected return statement', ast);
      this.pushState('skip-literal-correction');
      const type = this.getType(ast.argument);
      this.popState('skip-literal-correction');
      const result = [];
      if (!this.returnType) {
        if (type === 'LiteralInteger' || type === 'Integer') {
          this.returnType = 'Number';
        } else {
          this.returnType = type;
        }
      }
      switch (this.returnType) {
        case 'LiteralInteger':
        case 'Number':
        case 'Float':
          switch (type) {
            case 'Integer':
              result.push('float(');
              this.astGeneric(ast.argument, result);
              result.push(')');
              break;
            case 'LiteralInteger':
              this.castLiteralToFloat(ast.argument, result);
              if (this.getType(ast) === 'Integer') {
                result.unshift('float(');
                result.push(')');
              }
              break;
            default:
              this.astGeneric(ast.argument, result);
          }
          break;
        case 'Integer':
          switch (type) {
            case 'Float':
            case 'Number':
              this.castValueToInteger(ast.argument, result);
              break;
            case 'LiteralInteger':
              this.castLiteralToInteger(ast.argument, result);
              break;
            default:
              this.astGeneric(ast.argument, result);
          }
          break;
        case 'Array(4)':
        case 'Array(3)':
        case 'Array(2)':
        case 'Input':
          this.astGeneric(ast.argument, result);
          break;
        default:
          throw this.astErrorOutput(`unhandled return type ${this.returnType}`, ast);
      }
      if (this.isRootKernel) {
        retArr.push(`kernelResult = ${ result.join('') };`);
        retArr.push('return;');
      } else if (this.isSubKernel) {
        retArr.push(`subKernelResult_${ this.name } = ${ result.join('') };`);
        retArr.push(`return subKernelResult_${ this.name };`);
      } else {
        retArr.push(`return ${ result.join('') };`);
      }
      return retArr;
    }
    astLiteral(ast, retArr) {
      if (isNaN(ast.value)) {
        throw this.astErrorOutput(
          'Non-numeric literal not supported : ' + ast.value,
          ast
        );
      }
      const key = `${ast.start},${ast.end}`;
      if (Number.isInteger(ast.value)) {
        if (this.isState('in-for-loop-init') || this.isState('casting-to-integer') || this.isState('building-integer')) {
          this.literalTypes[key] = 'Integer';
          retArr.push(`${ast.value}`);
        } else if (this.isState('casting-to-float') || this.isState('building-float')) {
          this.literalTypes[key] = 'Number';
          retArr.push(`${ast.value}.0`);
        } else {
          this.literalTypes[key] = 'Number';
          retArr.push(`${ast.value}.0`);
        }
      } else if (this.isState('casting-to-integer') || this.isState('building-integer')) {
        this.literalTypes[key] = 'Integer';
        retArr.push(Math.round(ast.value));
      } else {
        this.literalTypes[key] = 'Number';
        retArr.push(`${ast.value}`);
      }
      return retArr;
    }
    astBinaryExpression(ast, retArr) {
      if (this.checkAndUpconvertOperator(ast, retArr)) {
        return retArr;
      }
      if (this.fixIntegerDivisionAccuracy && ast.operator === '/') {
        retArr.push('div_with_int_check(');
        this.pushState('building-float');
        switch (this.getType(ast.left)) {
          case 'Integer':
            this.castValueToFloat(ast.left, retArr);
            break;
          case 'LiteralInteger':
            this.castLiteralToFloat(ast.left, retArr);
            break;
          default:
            this.astGeneric(ast.left, retArr);
        }
        retArr.push(', ');
        switch (this.getType(ast.right)) {
          case 'Integer':
            this.castValueToFloat(ast.right, retArr);
            break;
          case 'LiteralInteger':
            this.castLiteralToFloat(ast.right, retArr);
            break;
          default:
            this.astGeneric(ast.right, retArr);
        }
        this.popState('building-float');
        retArr.push(')');
        return retArr;
      }
      retArr.push('(');
      const leftType = this.getType(ast.left) || 'Number';
      const rightType = this.getType(ast.right) || 'Number';
      if (!leftType || !rightType) {
        throw this.astErrorOutput(`Unhandled binary expression`, ast);
      }
      const key = leftType + ' & ' + rightType;
      switch (key) {
        case 'Integer & Integer':
          this.pushState('building-integer');
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.astGeneric(ast.right, retArr);
          this.popState('building-integer');
          break;
        case 'Number & Float':
        case 'Float & Number':
        case 'Float & Float':
        case 'Number & Number':
          this.pushState('building-float');
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.astGeneric(ast.right, retArr);
          this.popState('building-float');
          break;
        case 'LiteralInteger & LiteralInteger':
          if (this.isState('casting-to-integer') || this.isState('building-integer')) {
            this.pushState('building-integer');
            this.astGeneric(ast.left, retArr);
            retArr.push(operatorMap[ast.operator] || ast.operator);
            this.astGeneric(ast.right, retArr);
            this.popState('building-integer');
          } else {
            this.pushState('building-float');
            this.castLiteralToFloat(ast.left, retArr);
            retArr.push(operatorMap[ast.operator] || ast.operator);
            this.castLiteralToFloat(ast.right, retArr);
            this.popState('building-float');
          }
          break;
        case 'Integer & Float':
        case 'Integer & Number':
          if (ast.operator === '>' || ast.operator === '<' && ast.right.type === 'Literal') {
            if (!Number.isInteger(ast.right.value)) {
              this.pushState('building-float');
              this.castValueToFloat(ast.left, retArr);
              retArr.push(operatorMap[ast.operator] || ast.operator);
              this.astGeneric(ast.right, retArr);
              this.popState('building-float');
              break;
            }
          }
          this.pushState('building-integer');
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.pushState('casting-to-integer');
          if (ast.right.type === 'Literal') {
            const literalResult = [];
            this.astGeneric(ast.right, literalResult);
            const literalType = this.getType(ast.right);
            if (literalType === 'Integer') {
              retArr.push(literalResult.join(''));
            } else {
              throw this.astErrorOutput(`Unhandled binary expression with literal`, ast);
            }
          } else {
            retArr.push('int(');
            this.astGeneric(ast.right, retArr);
            retArr.push(')');
          }
          this.popState('casting-to-integer');
          this.popState('building-integer');
          break;
        case 'Integer & LiteralInteger':
          this.pushState('building-integer');
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.castLiteralToInteger(ast.right, retArr);
          this.popState('building-integer');
          break;
        case 'Number & Integer':
          this.pushState('building-float');
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.castValueToFloat(ast.right, retArr);
          this.popState('building-float');
          break;
        case 'Float & LiteralInteger':
        case 'Number & LiteralInteger':
          if (this.isState('in-for-loop-test')) {
            this.pushState('building-integer');
            retArr.push('int(');
            this.astGeneric(ast.left, retArr);
            retArr.push(')');
            retArr.push(operatorMap[ast.operator] || ast.operator);
            this.castLiteralToInteger(ast.right, retArr);
            this.popState('building-integer');
          } else {
            this.pushState('building-float');
            this.astGeneric(ast.left, retArr);
            retArr.push(operatorMap[ast.operator] || ast.operator);
            this.castLiteralToFloat(ast.right, retArr);
            this.popState('building-float');
          }
          break;
        case 'LiteralInteger & Float':
        case 'LiteralInteger & Number':
          if (this.isState('in-for-loop-test') || this.isState('in-for-loop-init') || this.isState('casting-to-integer')) {
            this.pushState('building-integer');
            this.castLiteralToInteger(ast.left, retArr);
            retArr.push(operatorMap[ast.operator] || ast.operator);
            this.castValueToInteger(ast.right, retArr);
            this.popState('building-integer');
          } else {
            this.pushState('building-float');
            this.astGeneric(ast.left, retArr);
            retArr.push(operatorMap[ast.operator] || ast.operator);
            this.pushState('casting-to-float');
            this.astGeneric(ast.right, retArr);
            this.popState('casting-to-float');
            this.popState('building-float');
          }
          break;
        case 'LiteralInteger & Integer':
          this.pushState('building-integer');
          this.castLiteralToInteger(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.astGeneric(ast.right, retArr);
          this.popState('building-integer');
          break;
        case 'Boolean & Boolean':
          this.pushState('building-boolean');
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.astGeneric(ast.right, retArr);
          this.popState('building-boolean');
          break;
        case 'Float & Integer':
          this.pushState('building-float');
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.castValueToFloat(ast.right, retArr);
          this.popState('building-float');
          break;
        default:
          throw this.astErrorOutput(`Unhandled binary expression between ${key}`, ast);
      }
      retArr.push(')');
      return retArr;
    }
    checkAndUpconvertOperator(ast, retArr) {
      const bitwiseResult = this.checkAndUpconvertBitwiseOperators(ast, retArr);
      if (bitwiseResult) {
        return bitwiseResult;
      }
      const upconvertableOperators = {
        '%': 'mod',
        '**': 'pow',
      };
      const foundOperator = upconvertableOperators[ast.operator];
      if (!foundOperator) return null;
      retArr.push(foundOperator);
      retArr.push('(');
      switch (this.getType(ast.left)) {
        case 'Integer':
          this.castValueToFloat(ast.left, retArr);
          break;
        case 'LiteralInteger':
          this.castLiteralToFloat(ast.left, retArr);
          break;
        default:
          this.astGeneric(ast.left, retArr);
      }
      retArr.push(',');
      switch (this.getType(ast.right)) {
        case 'Integer':
          this.castValueToFloat(ast.right, retArr);
          break;
        case 'LiteralInteger':
          this.castLiteralToFloat(ast.right, retArr);
          break;
        default:
          this.astGeneric(ast.right, retArr);
      }
      retArr.push(')');
      return retArr;
    }
    checkAndUpconvertBitwiseOperators(ast, retArr) {
      const upconvertableOperators = {
        '&': 'bitwiseAnd',
        '|': 'bitwiseOr',
        '^': 'bitwiseXOR',
        '<<': 'bitwiseZeroFillLeftShift',
        '>>': 'bitwiseSignedRightShift',
        '>>>': 'bitwiseZeroFillRightShift',
      };
      const foundOperator = upconvertableOperators[ast.operator];
      if (!foundOperator) return null;
      retArr.push(foundOperator);
      retArr.push('(');
      const leftType = this.getType(ast.left);
      switch (leftType) {
        case 'Number':
        case 'Float':
          this.castValueToInteger(ast.left, retArr);
          break;
        case 'LiteralInteger':
          this.castLiteralToInteger(ast.left, retArr);
          break;
        default:
          this.astGeneric(ast.left, retArr);
      }
      retArr.push(',');
      const rightType = this.getType(ast.right);
      switch (rightType) {
        case 'Number':
        case 'Float':
          this.castValueToInteger(ast.right, retArr);
          break;
        case 'LiteralInteger':
          this.castLiteralToInteger(ast.right, retArr);
          break;
        default:
          this.astGeneric(ast.right, retArr);
      }
      retArr.push(')');
      return retArr;
    }
    checkAndUpconvertBitwiseUnary(ast, retArr) {
      const upconvertableOperators = {
        '~': 'bitwiseNot',
      };
      const foundOperator = upconvertableOperators[ast.operator];
      if (!foundOperator) return null;
      retArr.push(foundOperator);
      retArr.push('(');
      switch (this.getType(ast.argument)) {
        case 'Number':
        case 'Float':
          this.castValueToInteger(ast.argument, retArr);
          break;
        case 'LiteralInteger':
          this.castLiteralToInteger(ast.argument, retArr);
          break;
        default:
          this.astGeneric(ast.argument, retArr);
      }
      retArr.push(')');
      return retArr;
    }
    castLiteralToInteger(ast, retArr) {
      this.pushState('casting-to-integer');
      this.astGeneric(ast, retArr);
      this.popState('casting-to-integer');
      return retArr;
    }
    castLiteralToFloat(ast, retArr) {
      this.pushState('casting-to-float');
      this.astGeneric(ast, retArr);
      this.popState('casting-to-float');
      return retArr;
    }
    castValueToInteger(ast, retArr) {
      this.pushState('casting-to-integer');
      retArr.push('int(');
      this.astGeneric(ast, retArr);
      retArr.push(')');
      this.popState('casting-to-integer');
      return retArr;
    }
    castValueToFloat(ast, retArr) {
      this.pushState('casting-to-float');
      retArr.push('float(');
      this.astGeneric(ast, retArr);
      retArr.push(')');
      this.popState('casting-to-float');
      return retArr;
    }
    astIdentifierExpression(idtNode, retArr) {
      if (idtNode.type !== 'Identifier') {
        throw this.astErrorOutput('IdentifierExpression - not an Identifier', idtNode);
      }
      const type = this.getType(idtNode);
      if (idtNode.name === 'Infinity') {
        retArr.push('3.402823466e+38');
      } else if (type === 'Boolean') {
        if (this.argumentNames.indexOf(idtNode.name) > -1) {
          retArr.push(`bool(user_${idtNode.name})`);
        } else {
          retArr.push(`user_${idtNode.name}`);
        }
      } else {
        retArr.push(`user_${idtNode.name}`);
      }
      return retArr;
    }
    astForStatement(forNode, retArr) {
      if (forNode.type !== 'ForStatement') {
        throw this.astErrorOutput('Invalid for statement', forNode);
      }
      const initArr = [];
      const testArr = [];
      const updateArr = [];
      const bodyArr = [];
      let isSafe = null;
      if (forNode.init) {
        this.pushState('in-for-loop-init');
        this.astGeneric(forNode.init, initArr);
        const { declarations } = forNode.init;
        for (let i = 0; i < declarations.length; i++) {
          if (declarations[i].init && declarations[i].init.type !== 'Literal') {
            isSafe = false;
          }
        }
        if (isSafe) {
          for (let i = 0; i < initArr.length; i++) {
            if (initArr[i].includes && initArr[i].includes(',')) {
              isSafe = false;
            }
          }
        }
        this.popState('in-for-loop-init');
      } else {
        isSafe = false;
      }
      if (forNode.test) {
        this.pushState('in-for-loop-test');
        this.astGeneric(forNode.test, testArr);
        this.popState('in-for-loop-test');
      } else {
        isSafe = false;
      }
      if (forNode.update) {
        this.astGeneric(forNode.update, updateArr);
      } else {
        isSafe = false;
      }
      if (forNode.body) {
        this.pushState('loop-body');
        this.astGeneric(forNode.body, bodyArr);
        this.popState('loop-body');
      }
      if (isSafe === null) {
        isSafe = this.isSafe(forNode.init) && this.isSafe(forNode.test);
      }
      if (isSafe) {
        retArr.push(`for (${initArr.join('')};${testArr.join('')};${updateArr.join('')}){\n`);
        retArr.push(bodyArr.join(''));
        retArr.push('}\n');
      } else {
        const iVariableName = this.getInternalVariableName('safeI');
        if (initArr.length > 0) {
          retArr.push(initArr.join(''), ';\n');
        }
        retArr.push(`for (int ${iVariableName}=0;${iVariableName}<LOOP_MAX;${iVariableName}++){\n`);
        if (testArr.length > 0) {
          retArr.push(`if (!${testArr.join('')}) break;\n`);
        }
        retArr.push(bodyArr.join(''));
        retArr.push(`\n${updateArr.join('')};`);
        retArr.push('}\n');
      }
      return retArr;
    }
    astWhileStatement(whileNode, retArr) {
      if (whileNode.type !== 'WhileStatement') {
        throw this.astErrorOutput('Invalid while statement', whileNode);
      }
      const iVariableName = this.getInternalVariableName('safeI');
      retArr.push(`for (int ${iVariableName}=0;${iVariableName}<LOOP_MAX;${iVariableName}++){\n`);
      retArr.push('if (!');
      this.astGeneric(whileNode.test, retArr);
      retArr.push(') break;\n');
      this.astGeneric(whileNode.body, retArr);
      retArr.push('}\n');
      return retArr;
    }
    astDoWhileStatement(doWhileNode, retArr) {
      if (doWhileNode.type !== 'DoWhileStatement') {
        throw this.astErrorOutput('Invalid while statement', doWhileNode);
      }
      const iVariableName = this.getInternalVariableName('safeI');
      retArr.push(`for (int ${iVariableName}=0;${iVariableName}<LOOP_MAX;${iVariableName}++){\n`);
      this.astGeneric(doWhileNode.body, retArr);
      retArr.push('if (!');
      this.astGeneric(doWhileNode.test, retArr);
      retArr.push(') break;\n');
      retArr.push('}\n');
      return retArr;
    }
    astAssignmentExpression(assNode, retArr) {
      if (assNode.operator === '%=') {
        this.astGeneric(assNode.left, retArr);
        retArr.push('=');
        retArr.push('mod(');
        this.astGeneric(assNode.left, retArr);
        retArr.push(',');
        this.astGeneric(assNode.right, retArr);
        retArr.push(')');
      } else if (assNode.operator === '**=') {
        this.astGeneric(assNode.left, retArr);
        retArr.push('=');
        retArr.push('pow(');
        this.astGeneric(assNode.left, retArr);
        retArr.push(',');
        this.astGeneric(assNode.right, retArr);
        retArr.push(')');
      } else {
        const leftType = this.getType(assNode.left);
        const rightType = this.getType(assNode.right);
        this.astGeneric(assNode.left, retArr);
        retArr.push(assNode.operator);
        if (leftType !== 'Integer' && rightType === 'Integer') {
          retArr.push('float(');
          this.astGeneric(assNode.right, retArr);
          retArr.push(')');
        } else {
          this.astGeneric(assNode.right, retArr);
        }
        return retArr;
      }
    }
    astBlockStatement(bNode, retArr) {
      if (this.isState('loop-body')) {
        this.pushState('block-body');
        for (let i = 0; i < bNode.body.length; i++) {
          this.astGeneric(bNode.body[i], retArr);
        }
        this.popState('block-body');
      } else {
        retArr.push('{\n');
        for (let i = 0; i < bNode.body.length; i++) {
          this.astGeneric(bNode.body[i], retArr);
        }
        retArr.push('}\n');
      }
      return retArr;
    }
    astVariableDeclaration(varDecNode, retArr) {
      if (varDecNode.kind === 'var' && this.warnVarUsage) {
        this.varWarn();
      }
      const declarations = varDecNode.declarations;
      if (!declarations || !declarations[0] || !declarations[0].init) {
        throw this.astErrorOutput('Unexpected expression', varDecNode);
      }
      const result = [];
      let lastType = null;
      const inForLoopInit = this.isState('in-for-loop-init');
      for (let i = 0; i < declarations.length; i++) {
        const declaration = declarations[i];
        const init = declaration.init;
        const info = this.getDeclaration(declaration.id);
        const valueType = info.valueType;
        const actualType = this.getType(declaration.init);
        let dependencies = info.dependencies;
        let type = inForLoopInit ? 'Integer' : actualType;
        if (type === 'LiteralInteger') {
          type = 'Number';
        }
        const markupType = typeMap$2[type];
        if (!markupType) {
          throw this.astErrorOutput(`Markup type ${ markupType } not handled`, varDecNode);
        }
        const declarationResult = [];
        if (actualType === 'Integer' && type === 'Integer' && !inForLoopInit) {
          info.valueType = 'Number';
          if (i === 0 || lastType === null) {
            declarationResult.push('float ');
          } else if (type !== lastType) {
            throw new Error('Unhandled declaration');
          } else {
            declarationResult.push(',');
          }
          lastType = type;
          declarationResult.push(`user_${declaration.id.name}=`);
          declarationResult.push('float(');
          this.astGeneric(init, declarationResult);
          declarationResult.push(')');
        } else {
          info.valueType = type;
          if (i === 0 || lastType === null) {
            declarationResult.push(`${markupType} `);
          } else if (type !== lastType) {
            result.push(';');
            declarationResult.push(`${markupType} `);
          } else {
            declarationResult.push(',');
          }
          lastType = type;
          declarationResult.push(`user_${declaration.id.name}=`);
          if (actualType === 'Number' && type === 'Integer') {
            if (init.left && init.left.type === 'Literal') {
              this.astGeneric(init, declarationResult);
            } else {
              declarationResult.push('int(');
              this.astGeneric(init, declarationResult);
              declarationResult.push(')');
            }
          } else {
            this.astGeneric(init, declarationResult);
          }
        }
        result.push(declarationResult.join(''));
      }
      retArr.push(result.join(''));
      if (!inForLoopInit) {
        retArr.push(';');
      }
      return retArr;
    }
    astIfStatement(ifNode, retArr) {
      retArr.push('if (');
      this.astGeneric(ifNode.test, retArr);
      retArr.push(')');
      if (ifNode.consequent.type === 'BlockStatement') {
        this.astGeneric(ifNode.consequent, retArr);
      } else {
        retArr.push(' {\n');
        this.astGeneric(ifNode.consequent, retArr);
        retArr.push('\n}\n');
      }
      if (ifNode.alternate) {
        retArr.push('else ');
        if (ifNode.alternate.type === 'BlockStatement') {
          this.astGeneric(ifNode.alternate, retArr);
        } else {
          retArr.push(' {\n');
          this.astGeneric(ifNode.alternate, retArr);
          retArr.push('\n}\n');
        }
      }
      return retArr;
    }
    astSwitchStatement(ast, retArr) {
      if (ast.type !== 'SwitchStatement') {
        throw this.astErrorOutput('Invalid switch statement', ast);
      }
      const { discriminant, cases } = ast;
      const type = this.getType(discriminant);
      const varName = `switchDiscriminant${ast.start}_${ast.end}`;
      switch (type) {
        case 'Float':
        case 'Number':
          retArr.push(`float ${varName} = `);
          this.astGeneric(discriminant, retArr);
          retArr.push(';\n');
          break;
        case 'Integer':
          retArr.push(`int ${varName} = `);
          this.astGeneric(discriminant, retArr);
          retArr.push(';\n');
          break;
      }
      if (cases.length === 1 && !cases[0].test) {
        this.astGeneric(cases[0].consequent, retArr);
        return retArr;
      }
      let fallingThrough = false;
      let defaultResult = [];
      let movingDefaultToEnd = false;
      let pastFirstIf = false;
      for (let i = 0; i < cases.length; i++) {
        if (!cases[i].test) {
          if (cases.length > i + 1) {
            movingDefaultToEnd = true;
            this.astGeneric(cases[i].consequent, defaultResult);
            continue;
          } else {
            retArr.push(' else {\n');
          }
        } else {
          if (i === 0 || !pastFirstIf) {
            pastFirstIf = true;
            retArr.push(`if (${varName} == `);
          } else {
            if (fallingThrough) {
              retArr.push(`${varName} == `);
              fallingThrough = false;
            } else {
              retArr.push(` else if (${varName} == `);
            }
          }
          if (type === 'Integer') {
            const testType = this.getType(cases[i].test);
            switch (testType) {
              case 'Number':
              case 'Float':
                this.castValueToInteger(cases[i].test, retArr);
                break;
              case 'LiteralInteger':
                this.castLiteralToInteger(cases[i].test, retArr);
                break;
            }
          } else if (type === 'Float') {
            const testType = this.getType(cases[i].test);
            switch (testType) {
              case 'LiteralInteger':
                this.castLiteralToFloat(cases[i].test, retArr);
                break;
              case 'Integer':
                this.castValueToFloat(cases[i].test, retArr);
                break;
            }
          } else {
            throw new Error('unhanlded');
          }
          if (!cases[i].consequent || cases[i].consequent.length === 0) {
            fallingThrough = true;
            retArr.push(' || ');
            continue;
          }
          retArr.push(`) {\n`);
        }
        this.astGeneric(cases[i].consequent, retArr);
        retArr.push('\n}');
      }
      if (movingDefaultToEnd) {
        retArr.push(' else {');
        retArr.push(defaultResult.join(''));
        retArr.push('}');
      }
      return retArr;
    }
    astThisExpression(tNode, retArr) {
      retArr.push('this');
      return retArr;
    }
    astMemberExpression(mNode, retArr) {
      const {
        property,
        name,
        signature,
        origin,
        type,
        xProperty,
        yProperty,
        zProperty
      } = this.getMemberExpressionDetails(mNode);
      switch (signature) {
        case 'value.thread.value':
        case 'this.thread.value':
          if (name !== 'x' && name !== 'y' && name !== 'z') {
            throw this.astErrorOutput('Unexpected expression, expected `this.thread.x`, `this.thread.y`, or `this.thread.z`', mNode);
          }
          retArr.push(`threadId.${name}`);
          return retArr;
        case 'this.output.value':
          if (this.dynamicOutput) {
            switch (name) {
              case 'x':
                if (this.isState('casting-to-float')) {
                  retArr.push('float(uOutputDim.x)');
                } else {
                  retArr.push('uOutputDim.x');
                }
                break;
              case 'y':
                if (this.isState('casting-to-float')) {
                  retArr.push('float(uOutputDim.y)');
                } else {
                  retArr.push('uOutputDim.y');
                }
                break;
              case 'z':
                if (this.isState('casting-to-float')) {
                  retArr.push('float(uOutputDim.z)');
                } else {
                  retArr.push('uOutputDim.z');
                }
                break;
              default:
                throw this.astErrorOutput('Unexpected expression', mNode);
            }
          } else {
            switch (name) {
              case 'x':
                if (this.isState('casting-to-integer')) {
                  retArr.push(this.output[0]);
                } else {
                  retArr.push(this.output[0], '.0');
                }
                break;
              case 'y':
                if (this.isState('casting-to-integer')) {
                  retArr.push(this.output[1]);
                } else {
                  retArr.push(this.output[1], '.0');
                }
                break;
              case 'z':
                if (this.isState('casting-to-integer')) {
                  retArr.push(this.output[2]);
                } else {
                  retArr.push(this.output[2], '.0');
                }
                break;
              default:
                throw this.astErrorOutput('Unexpected expression', mNode);
            }
          }
          return retArr;
        case 'value':
          throw this.astErrorOutput('Unexpected expression', mNode);
        case 'value[]':
        case 'value[][]':
        case 'value[][][]':
        case 'value[][][][]':
        case 'value.value':
          if (origin === 'Math') {
            retArr.push(Math[name]);
            return retArr;
          }
          switch (property) {
            case 'r':
              retArr.push(`user_${ name }.r`);
              return retArr;
            case 'g':
              retArr.push(`user_${ name }.g`);
              return retArr;
            case 'b':
              retArr.push(`user_${ name }.b`);
              return retArr;
            case 'a':
              retArr.push(`user_${ name }.a`);
              return retArr;
          }
          break;
        case 'this.constants.value':
          if (typeof xProperty === 'undefined') {
            switch (type) {
              case 'Array(2)':
              case 'Array(3)':
              case 'Array(4)':
                retArr.push(`constants_${ name }`);
                return retArr;
            }
          }
          case 'this.constants.value[]':
          case 'this.constants.value[][]':
          case 'this.constants.value[][][]':
          case 'this.constants.value[][][][]':
            break;
          case 'fn()[]':
            this.astCallExpression(mNode.object, retArr);
            retArr.push('[');
            retArr.push(this.memberExpressionPropertyMarkup(property));
            retArr.push(']');
            return retArr;
          case '[][]':
            this.astArrayExpression(mNode.object, retArr);
            retArr.push('[');
            retArr.push(this.memberExpressionPropertyMarkup(property));
            retArr.push(']');
            return retArr;
          default:
            throw this.astErrorOutput('Unexpected expression', mNode);
      }
      if (mNode.computed === false) {
        switch (type) {
          case 'Number':
          case 'Integer':
          case 'Float':
          case 'Boolean':
            retArr.push(`${origin}_${name}`);
            return retArr;
        }
      }
      const markupName = `${origin}_${name}`;
      switch (type) {
        case 'Array(2)':
        case 'Array(3)':
        case 'Array(4)':
          this.astGeneric(mNode.object, retArr);
          retArr.push('[');
          retArr.push(this.memberExpressionPropertyMarkup(xProperty));
          retArr.push(']');
          break;
        case 'HTMLImageArray':
          retArr.push(`getImage3D(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
          this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
          retArr.push(')');
          break;
        case 'ArrayTexture(1)':
          retArr.push(`getFloatFromSampler2D(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
          this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
          retArr.push(')');
          break;
        case 'Array1D(2)':
        case 'Array2D(2)':
        case 'Array3D(2)':
          retArr.push(`getMemoryOptimizedVec2(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
          this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
          retArr.push(')');
          break;
        case 'ArrayTexture(2)':
          retArr.push(`getVec2FromSampler2D(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
          this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
          retArr.push(')');
          break;
        case 'Array1D(3)':
        case 'Array2D(3)':
        case 'Array3D(3)':
          retArr.push(`getMemoryOptimizedVec3(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
          this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
          retArr.push(')');
          break;
        case 'ArrayTexture(3)':
          retArr.push(`getVec3FromSampler2D(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
          this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
          retArr.push(')');
          break;
        case 'Array1D(4)':
        case 'Array2D(4)':
        case 'Array3D(4)':
          retArr.push(`getMemoryOptimizedVec4(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
          this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
          retArr.push(')');
          break;
        case 'ArrayTexture(4)':
        case 'HTMLImage':
        case 'HTMLVideo':
          retArr.push(`getVec4FromSampler2D(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
          this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
          retArr.push(')');
          break;
        case 'NumberTexture':
        case 'Array':
        case 'Array2D':
        case 'Array3D':
        case 'Array4D':
        case 'Input':
        case 'Number':
        case 'Float':
        case 'Integer':
          if (this.precision === 'single') {
            retArr.push(`getMemoryOptimized32(${markupName}, ${markupName}Size, ${markupName}Dim, `);
            this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
            retArr.push(')');
          } else {
            const bitRatio = (origin === 'user' ?
              this.lookupFunctionArgumentBitRatio(this.name, name) :
              this.constantBitRatios[name]
            );
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
            retArr.push(')');
          }
          break;
        case 'MemoryOptimizedNumberTexture':
          retArr.push(`getMemoryOptimized32(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
          this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
          retArr.push(')');
          break;
        default:
          throw new Error(`unhandled member expression "${ type }"`);
      }
      return retArr;
    }
    astCallExpression(ast, retArr) {
      if (!ast.callee) {
        throw this.astErrorOutput('Unknown CallExpression', ast);
      }
      let functionName = null;
      const isMathFunction = this.isAstMathFunction(ast);
      if (isMathFunction || (ast.callee.object && ast.callee.object.type === 'ThisExpression')) {
        functionName = ast.callee.property.name;
      }
      else if (ast.callee.type === 'SequenceExpression' && ast.callee.expressions[0].type === 'Literal' && !isNaN(ast.callee.expressions[0].raw)) {
        functionName = ast.callee.expressions[1].property.name;
      } else {
        functionName = ast.callee.name;
      }
      if (!functionName) {
        throw this.astErrorOutput(`Unhandled function, couldn't find name`, ast);
      }
      if (functionName === 'atan2') {
        functionName = 'atan';
      }
      if (this.calledFunctions.indexOf(functionName) < 0) {
        this.calledFunctions.push(functionName);
      }
      if (functionName === 'random' && this.plugins && this.plugins.length > 0) {
        for (let i = 0; i < this.plugins.length; i++) {
          const plugin = this.plugins[i];
          if (plugin.functionMatch === 'Math.random()' && plugin.functionReplace) {
            retArr.push(plugin.functionReplace);
            return retArr;
          }
        }
      }
      if (this.onFunctionCall) {
        this.onFunctionCall(this.name, functionName, ast.arguments);
      }
      retArr.push(functionName);
      retArr.push('(');
      if (isMathFunction) {
        for (let i = 0; i < ast.arguments.length; ++i) {
          const argument = ast.arguments[i];
          const argumentType = this.getType(argument);
          if (i > 0) {
            retArr.push(', ');
          }
          switch (argumentType) {
            case 'Integer':
              this.castValueToFloat(argument, retArr);
              break;
            default:
              this.astGeneric(argument, retArr);
              break;
          }
        }
      } else {
        const targetTypes = this.lookupFunctionArgumentTypes(functionName) || [];
        for (let i = 0; i < ast.arguments.length; ++i) {
          const argument = ast.arguments[i];
          let targetType = targetTypes[i];
          if (i > 0) {
            retArr.push(', ');
          }
          const argumentType = this.getType(argument);
          if (!targetType) {
            this.triggerImplyArgumentType(functionName, i, argumentType, this);
            targetType = argumentType;
          }
          switch (argumentType) {
            case 'Number':
            case 'Float':
              if (targetType === 'Integer') {
                retArr.push('int(');
                this.astGeneric(argument, retArr);
                retArr.push(')');
                continue;
              } else if (targetType === 'Number' || targetType === 'Float') {
                this.astGeneric(argument, retArr);
                continue;
              } else if (targetType === 'LiteralInteger') {
                this.castLiteralToFloat(argument, retArr);
                continue;
              }
              break;
            case 'Integer':
              if (targetType === 'Number' || targetType === 'Float') {
                retArr.push('float(');
                this.astGeneric(argument, retArr);
                retArr.push(')');
                continue;
              } else if (targetType === 'Integer') {
                this.astGeneric(argument, retArr);
                continue;
              }
              break;
            case 'LiteralInteger':
              if (targetType === 'Integer') {
                this.castLiteralToInteger(argument, retArr);
                continue;
              } else if (targetType === 'Number' || targetType === 'Float') {
                this.castLiteralToFloat(argument, retArr);
                continue;
              } else if (targetType === 'LiteralInteger') {
                this.astGeneric(argument, retArr);
                continue;
              }
              break;
            case 'Array(2)':
            case 'Array(3)':
            case 'Array(4)':
              if (targetType === argumentType) {
                if (argument.type !== 'Identifier') throw this.astErrorOutput(`Unhandled argument type ${ argument.type }`, ast);
                this.triggerImplyArgumentBitRatio(this.name, argument.name, functionName, i);
                retArr.push(`user_${argument.name}`);
                continue;
              }
              break;
            case 'HTMLImage':
            case 'HTMLImageArray':
            case 'HTMLVideo':
            case 'ArrayTexture(1)':
            case 'ArrayTexture(2)':
            case 'ArrayTexture(3)':
            case 'ArrayTexture(4)':
            case 'Array':
            case 'Input':
              if (targetType === argumentType) {
                if (argument.type !== 'Identifier') throw this.astErrorOutput(`Unhandled argument type ${ argument.type }`, ast);
                this.triggerImplyArgumentBitRatio(this.name, argument.name, functionName, i);
                retArr.push(`user_${argument.name},user_${argument.name}Size,user_${argument.name}Dim`);
                continue;
              }
              break;
          }
          throw this.astErrorOutput(`Unhandled argument combination of ${ argumentType } and ${ targetType } for argument named "${ argument.name }"`, ast);
        }
      }
      retArr.push(')');
      return retArr;
    }
    astArrayExpression(arrNode, retArr) {
      const arrLen = arrNode.elements.length;
      retArr.push('vec' + arrLen + '(');
      for (let i = 0; i < arrLen; ++i) {
        if (i > 0) {
          retArr.push(', ');
        }
        const subNode = arrNode.elements[i];
        this.astGeneric(subNode, retArr);
      }
      retArr.push(')');
      return retArr;
    }
    memberExpressionXYZ(x, y, z, retArr) {
      if (z) {
        retArr.push(this.memberExpressionPropertyMarkup(z), ', ');
      } else {
        retArr.push('0, ');
      }
      if (y) {
        retArr.push(this.memberExpressionPropertyMarkup(y), ', ');
      } else {
        retArr.push('0, ');
      }
      retArr.push(this.memberExpressionPropertyMarkup(x));
      return retArr;
    }
    memberExpressionPropertyMarkup(property) {
      if (!property) {
        throw new Error('Property not set');
      }
      const type = this.getType(property);
      const result = [];
      switch (type) {
        case 'Number':
        case 'Float':
          this.castValueToInteger(property, result);
          break;
        case 'LiteralInteger':
          this.castLiteralToInteger(property, result);
          break;
        default:
          this.astGeneric(property, result);
      }
      return result.join('');
    }
  }
  const typeMap$2 = {
    'Array': 'sampler2D',
    'Array(2)': 'vec2',
    'Array(3)': 'vec3',
    'Array(4)': 'vec4',
    'Array2D': 'sampler2D',
    'Array3D': 'sampler2D',
    'Boolean': 'bool',
    'Float': 'float',
    'Input': 'sampler2D',
    'Integer': 'int',
    'Number': 'float',
    'LiteralInteger': 'float',
    'NumberTexture': 'sampler2D',
    'MemoryOptimizedNumberTexture': 'sampler2D',
    'ArrayTexture(1)': 'sampler2D',
    'ArrayTexture(2)': 'sampler2D',
    'ArrayTexture(3)': 'sampler2D',
    'ArrayTexture(4)': 'sampler2D',
    'HTMLVideo': 'sampler2D',
    'HTMLImage': 'sampler2D',
    'HTMLImageArray': 'sampler2DArray',
  };
  const operatorMap = {
    '===': '==',
    '!==': '!='
  };

  const source = `

uniform highp float triangle_noise_seed;
highp float triangle_noise_shift = 0.000001;

//https://www.shadertoy.com/view/4t2SDh
//note: uniformly distributed, normalized rand, [0;1[
float nrand( vec2 n )
{
  return fract(sin(dot(n.xy, vec2(12.9898, 78.233)))* 43758.5453);
}
//note: remaps v to [0;1] in interval [a;b]
float remap( float a, float b, float v )
{
  return clamp( (v-a) / (b-a), 0.0, 1.0 );
}

float n4rand( vec2 n )
{
  float t = fract( triangle_noise_seed + triangle_noise_shift );
  float nrnd0 = nrand( n + 0.07*t );
  float nrnd1 = nrand( n + 0.11*t );
  float nrnd2 = nrand( n + 0.13*t );
  float nrnd3 = nrand( n + 0.17*t );
  float result = (nrnd0+nrnd1+nrnd2+nrnd3) / 4.0;
  triangle_noise_shift = result + 0.000001;
  return result;
}`;
  const name$1 = 'triangle-noise-noise';
  const functionMatch = 'Math.random()';
  const functionReplace = 'n4rand(vTexCoord)';
  const functionReturnType = 'Number';
  const onBeforeRun = (kernel) => {
    kernel.setUniform1f('triangle_noise_seed', Math.random());
  };
  var triangleNoise = {
    name: name$1,
    onBeforeRun,
    functionMatch,
    functionReplace,
    functionReturnType,
    source
  };

  const fragmentShader = `__HEADER__;
__FLOAT_TACTIC_DECLARATION__;
__INT_TACTIC_DECLARATION__;
__SAMPLER_2D_TACTIC_DECLARATION__;

const int LOOP_MAX = __LOOP_MAX__;

__PLUGINS__;
__CONSTANTS__;

varying vec2 vTexCoord;

vec4 round(vec4 x) {
  return floor(x + 0.5);
}

float round(float x) {
  return floor(x + 0.5);
}

const int BIT_COUNT = 32;
int modi(int x, int y) {
  return x - y * (x / y);
}

int bitwiseOr(int a, int b) {
  int result = 0;
  int n = 1;

  for (int i = 0; i < BIT_COUNT; i++) {
    if ((modi(a, 2) == 1) || (modi(b, 2) == 1)) {
      result += n;
    }
    a = a / 2;
    b = b / 2;
    n = n * 2;
    if(!(a > 0 || b > 0)) {
      break;
    }
  }
  return result;
}
int bitwiseXOR(int a, int b) {
  int result = 0;
  int n = 1;

  for (int i = 0; i < BIT_COUNT; i++) {
    if ((modi(a, 2) == 1) != (modi(b, 2) == 1)) {
      result += n;
    }
    a = a / 2;
    b = b / 2;
    n = n * 2;
    if(!(a > 0 || b > 0)) {
      break;
    }
  }
  return result;
}
int bitwiseAnd(int a, int b) {
  int result = 0;
  int n = 1;
  for (int i = 0; i < BIT_COUNT; i++) {
    if ((modi(a, 2) == 1) && (modi(b, 2) == 1)) {
      result += n;
    }
    a = a / 2;
    b = b / 2;
    n = n * 2;
    if(!(a > 0 && b > 0)) {
      break;
    }
  }
  return result;
}
int bitwiseNot(int a) {
  int result = 0;
  int n = 1;

  for (int i = 0; i < BIT_COUNT; i++) {
    if (modi(a, 2) == 0) {
      result += n;
    }
    a = a / 2;
    n = n * 2;
  }
  return result;
}
int bitwiseZeroFillLeftShift(int n, int shift) {
  int maxBytes = BIT_COUNT;
  for (int i = 0; i < BIT_COUNT; i++) {
    if (maxBytes >= n) {
      break;
    }
    maxBytes *= 2;
  }
  for (int i = 0; i < BIT_COUNT; i++) {
    if (i >= shift) {
      break;
    }
    n *= 2;
  }

  int result = 0;
  int byteVal = 1;
  for (int i = 0; i < BIT_COUNT; i++) {
    if (i >= maxBytes) break;
    if (modi(n, 2) > 0) { result += byteVal; }
    n = int(n / 2);
    byteVal *= 2;
  }
  return result;
}

int bitwiseSignedRightShift(int num, int shifts) {
  return int(floor(float(num) / pow(2.0, float(shifts))));
}

int bitwiseZeroFillRightShift(int n, int shift) {
  int maxBytes = BIT_COUNT;
  for (int i = 0; i < BIT_COUNT; i++) {
    if (maxBytes >= n) {
      break;
    }
    maxBytes *= 2;
  }
  for (int i = 0; i < BIT_COUNT; i++) {
    if (i >= shift) {
      break;
    }
    n /= 2;
  }
  int result = 0;
  int byteVal = 1;
  for (int i = 0; i < BIT_COUNT; i++) {
    if (i >= maxBytes) break;
    if (modi(n, 2) > 0) { result += byteVal; }
    n = int(n / 2);
    byteVal *= 2;
  }
  return result;
}

vec2 integerMod(vec2 x, float y) {
  vec2 res = floor(mod(x, y));
  return res * step(1.0 - floor(y), -res);
}

vec3 integerMod(vec3 x, float y) {
  vec3 res = floor(mod(x, y));
  return res * step(1.0 - floor(y), -res);
}

vec4 integerMod(vec4 x, vec4 y) {
  vec4 res = floor(mod(x, y));
  return res * step(1.0 - floor(y), -res);
}

float integerMod(float x, float y) {
  float res = floor(mod(x, y));
  return res * (res > floor(y) - 1.0 ? 0.0 : 1.0);
}

int integerMod(int x, int y) {
  return x - (y * int(x / y));
}

__DIVIDE_WITH_INTEGER_CHECK__;

// Here be dragons!
// DO NOT OPTIMIZE THIS CODE
// YOU WILL BREAK SOMETHING ON SOMEBODY\'S MACHINE
// LEAVE IT AS IT IS, LEST YOU WASTE YOUR OWN TIME
const vec2 MAGIC_VEC = vec2(1.0, -256.0);
const vec4 SCALE_FACTOR = vec4(1.0, 256.0, 65536.0, 0.0);
const vec4 SCALE_FACTOR_INV = vec4(1.0, 0.00390625, 0.0000152587890625, 0.0); // 1, 1/256, 1/65536
float decode32(vec4 texel) {
  __DECODE32_ENDIANNESS__;
  texel *= 255.0;
  vec2 gte128;
  gte128.x = texel.b >= 128.0 ? 1.0 : 0.0;
  gte128.y = texel.a >= 128.0 ? 1.0 : 0.0;
  float exponent = 2.0 * texel.a - 127.0 + dot(gte128, MAGIC_VEC);
  float res = exp2(round(exponent));
  texel.b = texel.b - 128.0 * gte128.x;
  res = dot(texel, SCALE_FACTOR) * exp2(round(exponent-23.0)) + res;
  res *= gte128.y * -2.0 + 1.0;
  return res;
}

float decode16(vec4 texel, int index) {
  int channel = integerMod(index, 2);
  if (channel == 0) return texel.r * 255.0 + texel.g * 65280.0;
  if (channel == 1) return texel.b * 255.0 + texel.a * 65280.0;
  return 0.0;
}

float decode8(vec4 texel, int index) {
  int channel = integerMod(index, 4);
  if (channel == 0) return texel.r * 255.0;
  if (channel == 1) return texel.g * 255.0;
  if (channel == 2) return texel.b * 255.0;
  if (channel == 3) return texel.a * 255.0;
  return 0.0;
}

vec4 legacyEncode32(float f) {
  float F = abs(f);
  float sign = f < 0.0 ? 1.0 : 0.0;
  float exponent = floor(log2(F));
  float mantissa = (exp2(-exponent) * F);
  // exponent += floor(log2(mantissa));
  vec4 texel = vec4(F * exp2(23.0-exponent)) * SCALE_FACTOR_INV;
  texel.rg = integerMod(texel.rg, 256.0);
  texel.b = integerMod(texel.b, 128.0);
  texel.a = exponent*0.5 + 63.5;
  texel.ba += vec2(integerMod(exponent+127.0, 2.0), sign) * 128.0;
  texel = floor(texel);
  texel *= 0.003921569; // 1/255
  __ENCODE32_ENDIANNESS__;
  return texel;
}

// https://github.com/gpujs/gpu.js/wiki/Encoder-details
vec4 encode32(float value) {
  if (value == 0.0) return vec4(0, 0, 0, 0);

  float exponent;
  float mantissa;
  vec4  result;
  float sgn;

  sgn = step(0.0, -value);
  value = abs(value);

  exponent = floor(log2(value));

  mantissa = value*pow(2.0, -exponent)-1.0;
  exponent = exponent+127.0;
  result   = vec4(0,0,0,0);

  result.a = floor(exponent/2.0);
  exponent = exponent - result.a*2.0;
  result.a = result.a + 128.0*sgn;

  result.b = floor(mantissa * 128.0);
  mantissa = mantissa - result.b / 128.0;
  result.b = result.b + exponent*128.0;

  result.g = floor(mantissa*32768.0);
  mantissa = mantissa - result.g/32768.0;

  result.r = floor(mantissa*8388608.0);
  return result/255.0;
}
// Dragons end here

int index;
ivec3 threadId;

ivec3 indexTo3D(int idx, ivec3 texDim) {
  int z = int(idx / (texDim.x * texDim.y));
  idx -= z * int(texDim.x * texDim.y);
  int y = int(idx / texDim.x);
  int x = int(integerMod(idx, texDim.x));
  return ivec3(x, y, z);
}

float get32(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + texDim.x * (y + texDim.y * z);
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture2D(tex, st / vec2(texSize));
  return decode32(texel);
}

float get16(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + texDim.x * (y + texDim.y * z);
  int w = texSize.x * 2;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture2D(tex, st / vec2(texSize.x * 2, texSize.y));
  return decode16(texel, index);
}

float get8(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + texDim.x * (y + texDim.y * z);
  int w = texSize.x * 4;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture2D(tex, st / vec2(texSize.x * 4, texSize.y));
  return decode8(texel, index);
}

float getMemoryOptimized32(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + texDim.x * (y + texDim.y * z);
  int channel = integerMod(index, 4);
  index = index / 4;
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture2D(tex, st / vec2(texSize));
  if (channel == 0) return texel.r;
  if (channel == 1) return texel.g;
  if (channel == 2) return texel.b;
  if (channel == 3) return texel.a;
  return 0.0;
}

vec4 getImage2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + texDim.x * (y + texDim.y * z);
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  return texture2D(tex, st / vec2(texSize));
}

float getFloatFromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  vec4 result = getImage2D(tex, texSize, texDim, z, y, x);
  return result[0];
}

vec2 getVec2FromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  vec4 result = getImage2D(tex, texSize, texDim, z, y, x);
  return vec2(result[0], result[1]);
}

vec2 getMemoryOptimizedVec2(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + (texDim.x * (y + (texDim.y * z)));
  int channel = integerMod(index, 2);
  index = index / 2;
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture2D(tex, st / vec2(texSize));
  if (channel == 0) return vec2(texel.r, texel.g);
  if (channel == 1) return vec2(texel.b, texel.a);
  return vec2(0.0, 0.0);
}

vec3 getVec3FromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  vec4 result = getImage2D(tex, texSize, texDim, z, y, x);
  return vec3(result[0], result[1], result[2]);
}

vec3 getMemoryOptimizedVec3(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int fieldIndex = 3 * (x + texDim.x * (y + texDim.y * z));
  int vectorIndex = fieldIndex / 4;
  int vectorOffset = fieldIndex - vectorIndex * 4;
  int readY = vectorIndex / texSize.x;
  int readX = vectorIndex - readY * texSize.x;
  vec4 tex1 = texture2D(tex, (vec2(readX, readY) + 0.5) / vec2(texSize));

  if (vectorOffset == 0) {
    return tex1.xyz;
  } else if (vectorOffset == 1) {
    return tex1.yzw;
  } else {
    readX++;
    if (readX >= texSize.x) {
      readX = 0;
      readY++;
    }
    vec4 tex2 = texture2D(tex, vec2(readX, readY) / vec2(texSize));
    if (vectorOffset == 2) {
      return vec3(tex1.z, tex1.w, tex2.x);
    } else {
      return vec3(tex1.w, tex2.x, tex2.y);
    }
  }
}

vec4 getVec4FromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  return getImage2D(tex, texSize, texDim, z, y, x);
}

vec4 getMemoryOptimizedVec4(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + texDim.x * (y + texDim.y * z);
  int channel = integerMod(index, 2);
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture2D(tex, st / vec2(texSize));
  return vec4(texel.r, texel.g, texel.b, texel.a);
}

vec4 actualColor;
void color(float r, float g, float b, float a) {
  actualColor = vec4(r,g,b,a);
}

void color(float r, float g, float b) {
  color(r,g,b,1.0);
}

void color(sampler2D image) {
  actualColor = texture2D(image, vTexCoord);
}

__INJECTED_NATIVE__;
__MAIN_CONSTANTS__;
__MAIN_ARGUMENTS__;
__KERNEL__;

void main(void) {
  index = int(vTexCoord.s * float(uTexSize.x)) + int(vTexCoord.t * float(uTexSize.y)) * uTexSize.x;
  __MAIN_RESULT__;
}`;

  const vertexShader = `__FLOAT_TACTIC_DECLARATION__;
__INT_TACTIC_DECLARATION__;
__SAMPLER_2D_TACTIC_DECLARATION__;

attribute vec2 aPos;
attribute vec2 aTexCoord;

varying vec2 vTexCoord;
uniform vec2 ratio;

void main(void) {
  gl_Position = vec4((aPos + vec2(1)) * ratio + vec2(-1), 0, 1);
  vTexCoord = aTexCoord;
}`;

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  var glWiretap_1 = createCommonjsModule(function (module) {
  function glWiretap(gl, options = {}) {
    const {
      contextName = 'gl',
      throwGetError,
      useTrackablePrimitives,
      readPixelsFile,
      recording = [],
      variables = {},
      onReadPixels,
      onUnrecognizedArgumentLookup,
    } = options;
    const proxy = new Proxy(gl, { get: listen });
    const contextVariables = [];
    const entityNames = {};
    let imageCount = 0;
    let indent = '';
    let readPixelsVariableName;
    return proxy;
    function listen(obj, property) {
      switch (property) {
        case 'addComment': return addComment;
        case 'checkThrowError': return checkThrowError;
        case 'getReadPixelsVariableName': return readPixelsVariableName;
        case 'insertVariable': return insertVariable;
        case 'reset': return reset;
        case 'setIndent': return setIndent;
        case 'toString': return toString;
        case 'getContextVariableName': return getContextVariableName;
      }
      if (typeof gl[property] === 'function') {
        return function() {
          switch (property) {
            case 'getError':
              if (throwGetError) {
                recording.push(`${indent}if (${contextName}.getError() !== ${contextName}.NONE) throw new Error('error');`);
              } else {
                recording.push(`${indent}${contextName}.getError();`);
              }
              return gl.getError();
            case 'getExtension': {
              const variableName = `${contextName}Variables${contextVariables.length}`;
              recording.push(`${indent}const ${variableName} = ${contextName}.getExtension('${arguments[0]}');`);
              const extension = gl.getExtension(arguments[0]);
              if (extension && typeof extension === 'object') {
                const tappedExtension = glExtensionWiretap(extension, {
                  getEntity,
                  useTrackablePrimitives,
                  recording,
                  contextName: variableName,
                  contextVariables,
                  variables,
                  indent,
                  onUnrecognizedArgumentLookup,
                });
                contextVariables.push(tappedExtension);
                return tappedExtension;
              } else {
                contextVariables.push(null);
              }
              return extension;
            }
            case 'readPixels':
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
              } else {
                targetVariableName = `${contextName}Variable${i}`;
              }
              readPixelsVariableName = targetVariableName;
              const argumentAsStrings = [
                arguments[0],
                arguments[1],
                arguments[2],
                arguments[3],
                getEntity(arguments[4]),
                getEntity(arguments[5]),
                targetVariableName
              ];
              recording.push(`${indent}${contextName}.readPixels(${argumentAsStrings.join(', ')});`);
              if (readPixelsFile) {
                writePPM(arguments[2], arguments[3]);
              }
              if (onReadPixels) {
                onReadPixels(targetVariableName, argumentAsStrings);
              }
              return gl.readPixels.apply(gl, arguments);
            case 'drawBuffers':
              recording.push(`${indent}${contextName}.drawBuffers([${argumentsToString(arguments[0], { contextName, contextVariables, getEntity, addVariable, variables, onUnrecognizedArgumentLookup } )}]);`);
              return gl.drawBuffers(arguments[0]);
          }
          let result = gl[property].apply(gl, arguments);
          switch (typeof result) {
            case 'undefined':
              recording.push(`${indent}${methodCallToString(property, arguments)};`);
              return;
            case 'number':
            case 'boolean':
              if (useTrackablePrimitives && contextVariables.indexOf(trackablePrimitive(result)) === -1) {
                recording.push(`${indent}const ${contextName}Variable${contextVariables.length} = ${methodCallToString(property, arguments)};`);
                contextVariables.push(result = trackablePrimitive(result));
                break;
              }
            default:
              if (result === null) {
                recording.push(`${methodCallToString(property, arguments)};`);
              } else {
                recording.push(`${indent}const ${contextName}Variable${contextVariables.length} = ${methodCallToString(property, arguments)};`);
              }
              contextVariables.push(result);
          }
          return result;
        }
      }
      entityNames[gl[property]] = property;
      return gl[property];
    }
    function toString() {
      return recording.join('\n');
    }
    function reset() {
      while (recording.length > 0) {
        recording.pop();
      }
    }
    function insertVariable(name, value) {
      variables[name] = value;
    }
    function getEntity(value) {
      const name = entityNames[value];
      if (name) {
        return contextName + '.' + name;
      }
      return value;
    }
    function setIndent(spaces) {
      indent = ' '.repeat(spaces);
    }
    function addVariable(value, source) {
      const variableName = `${contextName}Variable${contextVariables.length}`;
      recording.push(`${indent}const ${variableName} = ${source};`);
      contextVariables.push(value);
      return variableName;
    }
    function writePPM(width, height) {
      const sourceVariable = `${contextName}Variable${contextVariables.length}`;
      const imageVariable = `imageDatum${imageCount}`;
      recording.push(`${indent}let ${imageVariable} = ["P3\\n# ${readPixelsFile}.ppm\\n", ${width}, ' ', ${height}, "\\n255\\n"].join("");`);
      recording.push(`${indent}for (let i = 0; i < ${imageVariable}.length; i += 4) {`);
      recording.push(`${indent}  ${imageVariable} += ${sourceVariable}[i] + ' ' + ${sourceVariable}[i + 1] + ' ' + ${sourceVariable}[i + 2] + ' ';`);
      recording.push(`${indent}}`);
      recording.push(`${indent}if (typeof require !== "undefined") {`);
      recording.push(`${indent}  require('fs').writeFileSync('./${readPixelsFile}.ppm', ${imageVariable});`);
      recording.push(`${indent}}`);
      imageCount++;
    }
    function addComment(value) {
      recording.push(`${indent}// ${value}`);
    }
    function checkThrowError() {
      recording.push(`${indent}(() => {
${indent}const error = ${contextName}.getError();
${indent}if (error !== ${contextName}.NONE) {
${indent}  const names = Object.getOwnPropertyNames(gl);
${indent}  for (let i = 0; i < names.length; i++) {
${indent}    const name = names[i];
${indent}    if (${contextName}[name] === error) {
${indent}      throw new Error('${contextName} threw ' + name);
${indent}    }
${indent}  }
${indent}}
${indent}})();`);
    }
    function methodCallToString(method, args) {
      return `${contextName}.${method}(${argumentsToString(args, { contextName, contextVariables, getEntity, addVariable, variables, onUnrecognizedArgumentLookup })})`;
    }
    function getVariableName(value) {
      if (variables) {
        for (const name in variables) {
          if (variables[name] === value) {
            return name;
          }
        }
      }
      return null;
    }
    function getContextVariableName(value) {
      const i = contextVariables.indexOf(value);
      if (i !== -1) {
        return `${contextName}Variable${i}`;
      }
      return null;
    }
  }
  function glExtensionWiretap(extension, options) {
    const proxy = new Proxy(extension, { get: listen });
    const extensionEntityNames = {};
    const {
      contextName,
      contextVariables,
      getEntity,
      useTrackablePrimitives,
      recording,
      variables,
      indent,
      onUnrecognizedArgumentLookup,
    } = options;
    return proxy;
    function listen(obj, property) {
      if (typeof obj[property] === 'function') {
        return function() {
          switch (property) {
            case 'drawBuffersWEBGL':
              recording.push(`${indent}${contextName}.drawBuffersWEBGL([${argumentsToString(arguments[0], { contextName, contextVariables, getEntity: getExtensionEntity, addVariable, variables, onUnrecognizedArgumentLookup })}]);`);
              return extension.drawBuffersWEBGL(arguments[0]);
          }
          let result = extension[property].apply(extension, arguments);
          switch (typeof result) {
            case 'undefined':
              recording.push(`${indent}${methodCallToString(property, arguments)};`);
              return;
            case 'number':
            case 'boolean':
              if (useTrackablePrimitives && contextVariables.indexOf(trackablePrimitive(result)) === -1) {
                recording.push(`${indent}const ${contextName}Variable${contextVariables.length} = ${methodCallToString(property, arguments)};`);
                contextVariables.push(result = trackablePrimitive(result));
              } else {
                recording.push(`${indent}const ${contextName}Variable${contextVariables.length} = ${methodCallToString(property, arguments)};`);
                contextVariables.push(result);
              }
              break;
            default:
              if (result === null) {
                recording.push(`${methodCallToString(property, arguments)};`);
              } else {
                recording.push(`${indent}const ${contextName}Variable${contextVariables.length} = ${methodCallToString(property, arguments)};`);
              }
              contextVariables.push(result);
          }
          return result;
        };
      }
      extensionEntityNames[extension[property]] = property;
      return extension[property];
    }
    function getExtensionEntity(value) {
      if (extensionEntityNames.hasOwnProperty(value)) {
        return `${contextName}.${extensionEntityNames[value]}`;
      }
      return getEntity(value);
    }
    function methodCallToString(method, args) {
      return `${contextName}.${method}(${argumentsToString(args, { contextName, contextVariables, getEntity: getExtensionEntity, addVariable, variables, onUnrecognizedArgumentLookup })})`;
    }
    function addVariable(value, source) {
      const variableName = `${contextName}Variable${contextVariables.length}`;
      contextVariables.push(value);
      recording.push(`${indent}const ${variableName} = ${source};`);
      return variableName;
    }
  }
  function argumentsToString(args, options) {
    const { variables, onUnrecognizedArgumentLookup } = options;
    return (Array.from(args).map((arg) => {
      const variableName = getVariableName(arg);
      if (variableName) {
        return variableName;
      }
      return argumentToString(arg, options);
    }).join(', '));
    function getVariableName(value) {
      if (variables) {
        for (const name in variables) {
          if (!variables.hasOwnProperty(name)) continue;
          if (variables[name] === value) {
            return name;
          }
        }
      }
      if (onUnrecognizedArgumentLookup) {
        return onUnrecognizedArgumentLookup(value);
      }
      return null;
    }
  }
  function argumentToString(arg, options) {
    const { contextName, contextVariables, getEntity, addVariable, onUnrecognizedArgumentLookup } = options;
    if (typeof arg === 'undefined') {
      return 'undefined';
    }
    if (arg === null) {
      return 'null';
    }
    const i = contextVariables.indexOf(arg);
    if (i > -1) {
      return `${contextName}Variable${i}`;
    }
    switch (arg.constructor.name) {
      case 'String':
        const hasLines = /\n/.test(arg);
        const hasSingleQuotes = /'/.test(arg);
        const hasDoubleQuotes = /"/.test(arg);
        if (hasLines) {
          return '`' + arg + '`';
        } else if (hasSingleQuotes && !hasDoubleQuotes) {
          return '"' + arg + '"';
        } else if (!hasSingleQuotes && hasDoubleQuotes) {
          return "'" + arg + "'";
        } else {
          return '\'' + arg + '\'';
        }
      case 'Number': return getEntity(arg);
      case 'Boolean': return getEntity(arg);
      case 'Array':
        return addVariable(arg, `new ${arg.constructor.name}([${Array.from(arg).join(',')}])`);
      case 'Float32Array':
      case 'Uint8Array':
      case 'Uint16Array':
      case 'Int32Array':
        return addVariable(arg, `new ${arg.constructor.name}(${JSON.stringify(Array.from(arg))})`);
      default:
        if (onUnrecognizedArgumentLookup) {
          const instantiationString = onUnrecognizedArgumentLookup(arg);
          if (instantiationString) {
            return instantiationString;
          }
        }
        throw new Error(`unrecognized argument type ${arg.constructor.name}`);
    }
  }
  function trackablePrimitive(value) {
    return new value.constructor(value);
  }
  {
    module.exports = { glWiretap, glExtensionWiretap };
  }
  if (typeof window !== 'undefined') {
    glWiretap.glExtensionWiretap = glExtensionWiretap;
    window.glWiretap = glWiretap;
  }
  });
  var glWiretap_2 = glWiretap_1.glWiretap;
  var glWiretap_3 = glWiretap_1.glExtensionWiretap;

  function toStringWithoutUtils(fn) {
    return fn.toString()
      .replace('=>', '')
      .replace(/^function /, '')
      .replace(/utils[.]/g, '/*utils.*/');
  }
  function glKernelString(Kernel, args, originKernel, setupContextString, destroyContextString) {
    args = args ? Array.from(args).map(arg => {
      switch (typeof arg) {
        case 'boolean':
          return new Boolean(arg);
        case 'number':
          return new Number(arg);
        default:
          return arg;
      }
    }) : null;
    const postResult = [];
    const context = glWiretap_2(originKernel.context, {
      useTrackablePrimitives: true,
      onReadPixels: (targetName) => {
        if (kernel.subKernels) {
          if (!subKernelsResultVariableSetup) {
            postResult.push(`    const result = { result: ${getRenderString(targetName, kernel)} };`);
            subKernelsResultVariableSetup = true;
          } else {
            const property = kernel.subKernels[subKernelsResultIndex++].property;
            postResult.push(`    result${isNaN(property) ? '.' + property : `[${property}]`} = ${getRenderString(targetName, kernel)};`);
          }
          if (subKernelsResultIndex === kernel.subKernels.length) {
            postResult.push('    return result;');
          }
          return;
        }
        if (targetName) {
          postResult.push(`    return ${getRenderString(targetName, kernel)};`);
        } else {
          postResult.push(`    return null;`);
        }
      },
      onUnrecognizedArgumentLookup: (argument) => {
        const argumentName = findKernelValue(argument, kernel.kernelArguments, [], context);
        if (argumentName) {
          return argumentName;
        }
        const constantName = findKernelValue(argument, kernel.kernelConstants, constants ? Object.keys(constants).map(key => constants[key]) : [], context);
        if (constantName) {
          return constantName;
        }
        return null;
      }
    });
    let subKernelsResultVariableSetup = false;
    let subKernelsResultIndex = 0;
    const {
      source,
      canvas,
      output,
      pipeline,
      graphical,
      loopMaxIterations,
      constants,
      optimizeFloatMemory,
      precision,
      fixIntegerDivisionAccuracy,
      functions,
      nativeFunctions,
      subKernels,
      immutable,
      argumentTypes,
      constantTypes,
      kernelArguments,
      kernelConstants,
    } = originKernel;
    const kernel = new Kernel(source, {
      canvas,
      context,
      checkContext: false,
      output,
      pipeline,
      graphical,
      loopMaxIterations,
      constants,
      optimizeFloatMemory,
      precision,
      fixIntegerDivisionAccuracy,
      functions,
      nativeFunctions,
      subKernels,
      immutable,
      argumentTypes,
      constantTypes,
    });
    let result = [];
    context.setIndent(2);
    kernel.build.apply(kernel, args);
    result.push(context.toString());
    context.reset();
    kernel.kernelArguments.forEach((kernelArgument, i) => {
      switch (kernelArgument.type) {
        case 'Integer':
        case 'Boolean':
        case 'Number':
        case 'Float':
        case 'Array':
        case 'Array(2)':
        case 'Array(3)':
        case 'Array(4)':
        case 'HTMLImage':
        case 'HTMLVideo':
          context.insertVariable(`uploadValue_${kernelArgument.name}`, kernelArgument.uploadValue);
          break;
        case 'HTMLImageArray':
          for (let imageIndex = 0; imageIndex < args[i].length; imageIndex++) {
            const arg = args[i];
            context.insertVariable(`uploadValue_${kernelArgument.name}[${imageIndex}]`, arg[imageIndex]);
          }
          break;
        case 'Input':
          context.insertVariable(`uploadValue_${kernelArgument.name}`, kernelArgument.uploadValue);
          break;
        case 'MemoryOptimizedNumberTexture':
        case 'NumberTexture':
        case 'Array1D(2)':
        case 'Array1D(3)':
        case 'Array1D(4)':
        case 'Array2D(2)':
        case 'Array2D(3)':
        case 'Array2D(4)':
        case 'Array3D(2)':
        case 'Array3D(3)':
        case 'Array3D(4)':
        case 'ArrayTexture(1)':
        case 'ArrayTexture(2)':
        case 'ArrayTexture(3)':
        case 'ArrayTexture(4)':
          context.insertVariable(`uploadValue_${kernelArgument.name}`, args[i].texture);
          break;
        default:
          throw new Error(`unhandled kernelArgumentType insertion for glWiretap of type ${kernelArgument.type}`);
      }
    });
    result.push('/** start of injected functions **/');
    result.push(`function ${toStringWithoutUtils(utils$1.flattenTo)}`);
    result.push(`function ${toStringWithoutUtils(utils$1.flatten2dArrayTo)}`);
    result.push(`function ${toStringWithoutUtils(utils$1.flatten3dArrayTo)}`);
    result.push(`function ${toStringWithoutUtils(utils$1.flatten4dArrayTo)}`);
    result.push(`function ${toStringWithoutUtils(utils$1.isArray)}`);
    if (kernel.renderOutput !== kernel.renderTexture && kernel.formatValues) {
      result.push(
        `  const renderOutput = function ${toStringWithoutUtils(kernel.formatValues)};`
      );
    }
    result.push('/** end of injected functions **/');
    result.push(`  const innerKernel = function (${kernel.kernelArguments.map(kernelArgument => kernelArgument.varName).join(', ')}) {`);
    context.setIndent(4);
    kernel.run.apply(kernel, args);
    if (kernel.renderKernels) {
      kernel.renderKernels();
    } else if (kernel.renderOutput) {
      kernel.renderOutput();
    }
    result.push('    /** start setup uploads for kernel values **/');
    kernel.kernelArguments.forEach(kernelArgument => {
      result.push('    ' + kernelArgument.getStringValueHandler().split('\n').join('\n    '));
    });
    result.push('    /** end setup uploads for kernel values **/');
    result.push(context.toString());
    if (kernel.renderOutput === kernel.renderTexture) {
      context.reset();
      const results = kernel.renderKernels();
      const textureName = context.getContextVariableName(kernel.outputTexture);
      result.push(`    return {
      result: {
        texture: ${ textureName },
        type: '${ results.result.type }',
        toArray: ${ getToArrayString(results.result, textureName) }
      },`);
      const { subKernels, subKernelOutputTextures } = kernel;
      for (let i = 0; i < subKernels.length; i++) {
        const texture = subKernelOutputTextures[i];
        const subKernel = subKernels[i];
        const subKernelResult = results[subKernel.property];
        const subKernelTextureName = context.getContextVariableName(texture);
        result.push(`
      ${subKernel.property}: {
        texture: ${ subKernelTextureName },
        type: '${ subKernelResult.type }',
        toArray: ${ getToArrayString(subKernelResult, subKernelTextureName) }
      },`);
      }
      result.push(`    };`);
    }
    result.push(`    ${destroyContextString ? '\n' + destroyContextString + '    ': ''}`);
    result.push(postResult.join('\n'));
    result.push('  };');
    if (kernel.graphical) {
      result.push(getGetPixelsString(kernel));
      result.push(`  innerKernel.getPixels = getPixels;`);
    }
    result.push('  return innerKernel;');
    let constantsUpload = [];
    kernelConstants.forEach((kernelConstant) => {
      constantsUpload.push(`${  kernelConstant.getStringValueHandler()}`);
    });
    return `function kernel(settings) {
  const { context, constants } = settings;
  ${constantsUpload.join('')}
  ${setupContextString ? setupContextString : ''}
${result.join('\n')}
}`;
  }
  function getRenderString(targetName, kernel) {
    const readBackValue = kernel.precision === 'single' ? targetName : `new Float32Array(${targetName}.buffer)`;
    if (kernel.output[2]) {
      return `renderOutput(${readBackValue}, ${kernel.output[0]}, ${kernel.output[1]}, ${kernel.output[2]})`;
    }
    if (kernel.output[1]) {
      return `renderOutput(${readBackValue}, ${kernel.output[0]}, ${kernel.output[1]})`;
    }
    return `renderOutput(${readBackValue}, ${kernel.output[0]})`;
  }
  function getGetPixelsString(kernel) {
    const getPixels = kernel.getPixels.toString();
    const useFunctionKeyword = !/^function/.test(getPixels);
    return utils$1.flattenFunctionToString(`${useFunctionKeyword ? 'function ' : ''}${ getPixels }`, {
      findDependency: (object, name) => {
        if (object === 'utils') {
          return `const ${name} = ${utils$1[name].toString()};`;
        }
        return null;
      },
      thisLookup: (property) => {
        if (property === 'context') {
          return null;
        }
        if (kernel.hasOwnProperty(property)) {
          return JSON.stringify(kernel[property]);
        }
        throw new Error(`unhandled thisLookup ${ property }`);
      }
    });
  }
  function getToArrayString(kernelResult, textureName) {
    const toArray = kernelResult.toArray.toString();
    const useFunctionKeyword = !/^function/.test(toArray);
    const flattenedFunctions = utils$1.flattenFunctionToString(`${useFunctionKeyword ? 'function ' : ''}${ toArray }`, {
      findDependency: (object, name) => {
        if (object === 'utils') {
          return `const ${name} = ${utils$1[name].toString()};`;
        } else if (object === 'this') {
          return `${useFunctionKeyword ? 'function ' : ''}${kernelResult[name].toString()}`;
        } else {
          throw new Error('unhandled fromObject');
        }
      },
      thisLookup: (property) => {
        if (property === 'texture') {
          return textureName;
        }
        if (kernelResult.hasOwnProperty(property)) {
          return JSON.stringify(kernelResult[property]);
        }
        throw new Error(`unhandled thisLookup ${ property }`);
      }
    });
    return `() => {
  ${flattenedFunctions}
  return toArray();
  }`;
  }
  function findKernelValue(argument, kernelValues, values, context, uploadedValues) {
    if (argument === null) return null;
    switch (typeof argument) {
      case 'boolean':
      case 'number':
        return null;
    }
    if (
      typeof HTMLImageElement !== 'undefined' &&
      argument instanceof HTMLImageElement
    ) {
      for (let i = 0; i < kernelValues.length; i++) {
        const kernelValue = kernelValues[i];
        if (kernelValue.type !== 'HTMLImageArray') continue;
        if (kernelValue.uploadValue !== argument) continue;
        const variableIndex = values[i].indexOf(argument);
        if (variableIndex === -1) continue;
        const variableName = `uploadValue_${kernelValue.name}[${variableIndex}]`;
        context.insertVariable(variableName, argument);
        return variableName;
      }
      return null;
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

  class KernelValue {
    constructor(value, settings) {
      const {
        name,
        kernel,
        context,
        checkContext,
        onRequestContextHandle,
        onUpdateValueMismatch,
        origin,
        strictIntegers,
        type,
        tactic,
      } = settings;
      if (!name) {
        throw new Error('name not set');
      }
      if (!type) {
        throw new Error('type not set');
      }
      if (!origin) {
        throw new Error('origin not set');
      }
      if (!tactic) {
        throw new Error('tactic not set');
      }
      if (origin !== 'user' && origin !== 'constants') {
        throw new Error(`origin must be "user" or "constants" value is "${ origin }"`);
      }
      if (!onRequestContextHandle) {
        throw new Error('onRequestContextHandle is not set');
      }
      this.name = name;
      this.origin = origin;
      this.tactic = tactic;
      this.id = `${this.origin}_${name}`;
      this.varName = origin === 'constants' ? `constants.${name}` : name;
      this.kernel = kernel;
      this.strictIntegers = strictIntegers;
      this.type = value.type || type;
      this.size = value.size || null;
      this.index = null;
      this.context = context;
      this.checkContext = checkContext !== null && checkContext !== undefined ? checkContext : true;
      this.contextHandle = null;
      this.onRequestContextHandle = onRequestContextHandle;
      this.onUpdateValueMismatch = onUpdateValueMismatch;
      this.forceUploadEachRun = null;
    }
    getSource() {
      throw new Error(`"getSource" not defined on ${ this.constructor.name }`);
    }
    updateValue(value) {
      throw new Error(`"updateValue" not defined on ${ this.constructor.name }`);
    }
  }

  class WebGLKernelValue extends KernelValue {
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
    }
    checkSize(width, height) {
      if (!this.kernel.validate) return;
      const { maxTextureSize } = this.kernel.constructor.features;
      if (width > maxTextureSize || height > maxTextureSize) {
        if (width > height) {
          throw new Error(`Argument width of ${width} larger than maximum size of ${maxTextureSize} for your GPU`);
        } else {
          throw new Error(`Argument height of ${height} larger than maximum size of ${maxTextureSize} for your GPU`);
        }
      }
    }
    requestTexture() {
      this.texture = this.onRequestTexture();
      this.setupTexture();
    }
    setupTexture() {
      this.contextHandle = this.onRequestContextHandle();
      this.index = this.onRequestIndex();
      this.dimensionsId = this.id + 'Dim';
      this.sizeId = this.id + 'Size';
    }
    getTransferArrayType(value) {
      if (Array.isArray(value[0])) {
        return this.getTransferArrayType(value[0]);
      }
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
      console.warn('Unfamiliar constructor type.  Will go ahead and use, but likley this may result in a transfer of zeros');
      return value.constructor;
    }
    formatArrayTransfer(value, length, Type) {
      if (utils$1.isArray(value[0]) || this.optimizeFloatMemory) {
        const valuesFlat = new Float32Array(length);
        utils$1.flattenTo(value, valuesFlat);
        return valuesFlat;
      } else {
        switch (value.constructor) {
          case Uint8ClampedArray:
          case Uint8Array:
          case Int8Array:
          case Uint16Array:
          case Int16Array:
          case Float32Array:
          case Int32Array: {
            const valuesFlat = new(Type || value.constructor)(length);
            utils$1.flattenTo(value, valuesFlat);
            return valuesFlat;
          }
          default: {
            const valuesFlat = new Float32Array(length);
            utils$1.flattenTo(value, valuesFlat);
            return valuesFlat;
          }
        }
      }
    }
    getBitRatio(value) {
      if (Array.isArray(value[0])) {
        return this.getBitRatio(value[0]);
      } else if (value.constructor === Input) {
        return this.getBitRatio(value.value);
      }
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
    getStringValueHandler() {
      throw new Error(`"getStringValueHandler" not implemented on ${this.constructor.name}`);
    }
    getVariablePrecisionString() {
      switch (this.tactic) {
        case 'speed':
          return 'lowp';
        case 'performance':
          return 'highp';
        case 'balanced':
        default:
          return 'mediump';
      }
    }
  }

  class WebGLKernelValueBoolean extends WebGLKernelValue {
    constructor(value, settings) {
      super(value, settings);
      this.uploadValue = value;
    }
    getSource(value) {
      if (this.origin === 'constants') {
        return `const bool ${this.id} = ${value};\n`;
      }
      return `uniform bool ${this.id};\n`;
    }
    getStringValueHandler() {
      return `const uploadValue_${this.name} = ${this.varName};\n`;
    }
    updateValue(value) {
      if (this.origin === 'constants') return;
      this.kernel.setUniform1i(this.id, this.uploadValue = value);
    }
  }

  class WebGLKernelValueFloat extends WebGLKernelValue {
    constructor(value, settings) {
      super(value, settings);
      this.uploadValue = value;
    }
    getStringValueHandler() {
      return `const uploadValue_${this.name} = ${this.varName};\n`;
    }
    getSource(value) {
      if (this.origin === 'constants') {
        if (Number.isInteger(value)) {
          return `const float ${this.id} = ${value}.0;\n`;
        }
        return `const float ${this.id} = ${value};\n`;
      }
      return `uniform float ${this.id};\n`;
    }
    updateValue(value) {
      if (this.origin === 'constants') return;
      this.kernel.setUniform1f(this.id, this.uploadValue = value);
    }
  }

  class WebGLKernelValueInteger extends WebGLKernelValue {
    constructor(value, settings) {
      super(value, settings);
      this.uploadValue = value;
    }
    getStringValueHandler() {
      return `const uploadValue_${this.name} = ${this.varName};\n`;
    }
    getSource(value) {
      if (this.origin === 'constants') {
        return `const int ${this.id} = ${ parseInt(value) };\n`;
      }
      return `uniform int ${this.id};\n`;
    }
    updateValue(value) {
      if (this.origin === 'constants') return;
      this.kernel.setUniform1i(this.id, this.uploadValue = value);
    }
  }

  class WebGLKernelValueHTMLImage extends WebGLKernelValue {
    constructor(value, settings) {
      super(value, settings);
      const { width, height } = value;
      this.checkSize(width, height);
      this.dimensions = [width, height, 1];
      this.requestTexture();
      this.textureSize = [width, height];
      this.uploadValue = value;
    }
    getStringValueHandler() {
      return `const uploadValue_${this.name} = ${this.varName};\n`;
    }
    getSource() {
      return utils$1.linesToString([
        `uniform sampler2D ${this.id}`,
        `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
        `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
      ]);
    }
    updateValue(inputImage) {
      if (inputImage.constructor !== this.initialValueConstructor) {
        this.onUpdateValueMismatch();
        return;
      }
      const { context: gl } = this;
      gl.activeTexture(this.contextHandle);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.uploadValue = inputImage);
      this.kernel.setUniform1i(this.id, this.index);
    }
  }

  class WebGLKernelValueDynamicHTMLImage extends WebGLKernelValueHTMLImage {
    getSource() {
      return utils$1.linesToString([
        `uniform sampler2D ${this.id}`,
        `uniform ivec2 ${this.sizeId}`,
        `uniform ivec3 ${this.dimensionsId}`,
      ]);
    }
    updateValue(value) {
      const { width, height } = value;
      this.checkSize(width, height);
      this.dimensions = [width, height, 1];
      this.textureSize = [width, height];
      this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
      this.kernel.setUniform2iv(this.sizeId, this.textureSize);
      super.updateValue(value);
    }
  }

  class WebGLKernelValueHTMLVideo extends WebGLKernelValueHTMLImage {}

  class WebGLKernelValueDynamicHTMLVideo extends WebGLKernelValueDynamicHTMLImage {}

  class WebGLKernelValueSingleInput extends WebGLKernelValue {
    constructor(value, settings) {
      super(value, settings);
      this.requestTexture();
      this.bitRatio = 4;
      let [w, h, d] = value.size;
      this.dimensions = new Int32Array([w || 1, h || 1, d || 1]);
      this.textureSize = utils$1.getMemoryOptimizedFloatTextureSize(this.dimensions, this.bitRatio);
      this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
      this.checkSize(this.textureSize[0] * this.bitRatio, this.textureSize[1] * this.bitRatio);
      this.uploadValue = new Float32Array(this.uploadArrayLength);
    }
    getStringValueHandler() {
      return utils$1.linesToString([
        `const uploadValue_${this.name} = new Float32Array(${this.uploadArrayLength})`,
        `flattenTo(${this.varName}.value, uploadValue_${this.name})`,
      ]);
    }
    getSource() {
      return utils$1.linesToString([
        `uniform sampler2D ${this.id}`,
        `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
        `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
      ]);
    }
    updateValue(input) {
      if (input.constructor !== this.initialValueConstructor) {
        this.onUpdateValueMismatch();
        return;
      }
      const { context: gl } = this;
      utils$1.flattenTo(input.value, this.uploadValue);
      gl.activeTexture(this.contextHandle);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
      this.kernel.setUniform1i(this.id, this.index);
    }
  }

  class WebGLKernelValueDynamicSingleInput extends WebGLKernelValueSingleInput {
    getSource() {
      return utils$1.linesToString([
        `uniform sampler2D ${this.id}`,
        `uniform ivec2 ${this.sizeId}`,
        `uniform ivec3 ${this.dimensionsId}`,
      ]);
    }
    updateValue(value) {
      let [w, h, d] = value.size;
      this.dimensions = new Int32Array([w || 1, h || 1, d || 1]);
      this.textureSize = utils$1.getMemoryOptimizedFloatTextureSize(this.dimensions, this.bitRatio);
      this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
      this.checkSize(this.textureSize[0] * this.bitRatio, this.textureSize[1] * this.bitRatio);
      this.uploadValue = new Float32Array(this.uploadArrayLength);
      this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
      this.kernel.setUniform2iv(this.sizeId, this.textureSize);
      super.updateValue(value);
    }
  }

  class WebGLKernelValueUnsignedInput extends WebGLKernelValue {
    constructor(value, settings) {
      super(value, settings);
      this.requestTexture();
      this.bitRatio = this.getBitRatio(value);
      const [w, h, d] = value.size;
      this.dimensions = new Int32Array([w || 1, h || 1, d || 1]);
      this.textureSize = utils$1.getMemoryOptimizedPackedTextureSize(this.dimensions, this.bitRatio);
      this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * (4 / this.bitRatio);
      this.checkSize(this.textureSize[0] * (4 / this.bitRatio), this.textureSize[1] * (4 / this.bitRatio));
      this.TranserArrayType = this.getTransferArrayType(value.value);
      this.preUploadValue = new this.TranserArrayType(this.uploadArrayLength);
      this.uploadValue = new Uint8Array(this.preUploadValue.buffer);
    }
    getStringValueHandler() {
      return utils$1.linesToString([
        `const preUploadValue_${this.name} = new ${this.TranserArrayType.name}(${this.uploadArrayLength})`,
        `const uploadValue_${this.name} = new Uint8Array(preUploadValue_${this.name}.buffer)`,
        `flattenTo(${this.varName}.value, preUploadValue_${this.name})`,
      ]);
    }
    getSource() {
      return utils$1.linesToString([
        `uniform sampler2D ${this.id}`,
        `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
        `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
      ]);
    }
    updateValue(input) {
      if (input.constructor !== this.initialValueConstructor) {
        this.onUpdateValueMismatch();
        return;
      }
      const { context: gl } = this;
      utils$1.flattenTo(input.value, this.preUploadValue);
      gl.activeTexture(this.contextHandle);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, this.uploadValue);
      this.kernel.setUniform1i(this.id, this.index);
    }
  }

  class WebGLKernelValueDynamicUnsignedInput extends WebGLKernelValueUnsignedInput {
    getSource() {
      return utils$1.linesToString([
        `uniform sampler2D ${this.id}`,
        `uniform ivec2 ${this.sizeId}`,
        `uniform ivec3 ${this.dimensionsId}`,
      ]);
    }
    updateValue(value) {
      let [w, h, d] = value.size;
      this.dimensions = new Int32Array([w || 1, h || 1, d || 1]);
      this.textureSize = utils$1.getMemoryOptimizedPackedTextureSize(this.dimensions, this.bitRatio);
      this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * (4 / this.bitRatio);
      this.checkSize(this.textureSize[0] * (4 / this.bitRatio), this.textureSize[1] * (4 / this.bitRatio));
      const Type = this.getTransferArrayType(value.value);
      this.preUploadValue = new Type(this.uploadArrayLength);
      this.uploadValue = new Uint8Array(this.preUploadValue.buffer);
      this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
      this.kernel.setUniform2iv(this.sizeId, this.textureSize);
      super.updateValue(value);
    }
  }

  class WebGLKernelValueMemoryOptimizedNumberTexture extends WebGLKernelValue {
    constructor(value, settings) {
      super(value, settings);
      const [width, height] = value.size;
      this.checkSize(width, height);
      this.setupTexture();
      this.dimensions = value.dimensions;
      this.textureSize = value.size;
      this.uploadValue = value.texture;
      this.forceUploadEachRun = true;
    }
    getStringValueHandler() {
      return `const uploadValue_${this.name} = ${this.varName}.texture;\n`;
    }
    getSource() {
      return utils$1.linesToString([
        `uniform sampler2D ${this.id}`,
        `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
        `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
      ]);
    }
    updateValue(inputTexture) {
      if (inputTexture.constructor !== this.initialValueConstructor) {
        this.onUpdateValueMismatch();
        return;
      }
      if (this.checkContext && inputTexture.context !== this.context) {
        throw new Error(`Value ${this.name} (${this.type }) must be from same context`);
      }
      const { context: gl } = this;
      gl.activeTexture(this.contextHandle);
      gl.bindTexture(gl.TEXTURE_2D, this.uploadValue = inputTexture.texture);
      this.kernel.setUniform1i(this.id, this.index);
    }
  }

  class WebGLKernelValueDynamicMemoryOptimizedNumberTexture extends WebGLKernelValueMemoryOptimizedNumberTexture {
    getSource() {
      return utils$1.linesToString([
        `uniform sampler2D ${this.id}`,
        `uniform ivec2 ${this.sizeId}`,
        `uniform ivec3 ${this.dimensionsId}`,
      ]);
    }
    updateValue(inputTexture) {
      this.checkSize(inputTexture.size[0], inputTexture.size[1]);
      this.dimensions = inputTexture.dimensions;
      this.textureSize = inputTexture.size;
      this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
      this.kernel.setUniform2iv(this.sizeId, this.textureSize);
      super.updateValue(inputTexture);
    }
  }

  class WebGLKernelValueNumberTexture extends WebGLKernelValue {
    constructor(value, settings) {
      super(value, settings);
      const [width, height] = value.size;
      this.checkSize(width, height);
      this.setupTexture();
      const { size: textureSize, dimensions } = value;
      this.bitRatio = this.getBitRatio(value);
      this.dimensions = dimensions;
      this.textureSize = textureSize;
      this.uploadValue = value.texture;
      this.forceUploadEachRun = true;
    }
    getStringValueHandler() {
      return `const uploadValue_${this.name} = ${this.varName}.texture;\n`;
    }
    getSource() {
      return utils$1.linesToString([
        `uniform sampler2D ${this.id}`,
        `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
        `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
      ]);
    }
    updateValue(inputTexture) {
      if (inputTexture.constructor !== this.initialValueConstructor) {
        this.onUpdateValueMismatch();
        return;
      }
      if (this.checkContext && inputTexture.context !== this.context) {
        throw new Error(`Value ${this.name} (${this.type}) must be from same context`);
      }
      const { context: gl } = this;
      gl.activeTexture(this.contextHandle);
      gl.bindTexture(gl.TEXTURE_2D, this.uploadValue = inputTexture.texture);
      this.kernel.setUniform1i(this.id, this.index);
    }
  }

  class WebGLKernelValueDynamicNumberTexture extends WebGLKernelValueNumberTexture {
    getSource() {
      return utils$1.linesToString([
        `uniform sampler2D ${this.id}`,
        `uniform ivec2 ${this.sizeId}`,
        `uniform ivec3 ${this.dimensionsId}`,
      ]);
    }
    updateValue(value) {
      this.dimensions = value.dimensions;
      this.checkSize(value.size[0], value.size[1]);
      this.textureSize = value.size;
      this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
      this.kernel.setUniform2iv(this.sizeId, this.textureSize);
      super.updateValue(value);
    }
  }

  class WebGLKernelValueSingleArray extends WebGLKernelValue {
    constructor(value, settings) {
      super(value, settings);
      this.requestTexture();
      this.bitRatio = 4;
      this.dimensions = utils$1.getDimensions(value, true);
      this.textureSize = utils$1.getMemoryOptimizedFloatTextureSize(this.dimensions, this.bitRatio);
      this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
      this.checkSize(this.textureSize[0] * this.bitRatio, this.textureSize[1] * this.bitRatio);
      this.uploadValue = new Float32Array(this.uploadArrayLength);
    }
    getStringValueHandler() {
      return utils$1.linesToString([
        `const uploadValue_${this.name} = new Float32Array(${this.uploadArrayLength})`,
        `flattenTo(${this.varName}, uploadValue_${this.name})`,
      ]);
    }
    getSource() {
      return utils$1.linesToString([
        `uniform sampler2D ${this.id}`,
        `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
        `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
      ]);
    }
    updateValue(value) {
      if (value.constructor !== this.initialValueConstructor) {
        this.onUpdateValueMismatch();
        return;
      }
      const { context: gl } = this;
      utils$1.flattenTo(value, this.uploadValue);
      gl.activeTexture(this.contextHandle);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
      this.kernel.setUniform1i(this.id, this.index);
    }
  }

  class WebGLKernelValueDynamicSingleArray extends WebGLKernelValueSingleArray {
    getSource() {
      return utils$1.linesToString([
        `uniform sampler2D ${this.id}`,
        `uniform ivec2 ${this.sizeId}`,
        `uniform ivec3 ${this.dimensionsId}`,
      ]);
    }
    updateValue(value) {
      this.dimensions = utils$1.getDimensions(value, true);
      this.textureSize = utils$1.getMemoryOptimizedFloatTextureSize(this.dimensions, this.bitRatio);
      this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
      this.checkSize(this.textureSize[0] * this.bitRatio, this.textureSize[1] * this.bitRatio);
      this.uploadValue = new Float32Array(this.uploadArrayLength);
      this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
      this.kernel.setUniform2iv(this.sizeId, this.textureSize);
      super.updateValue(value);
    }
  }

  class WebGLKernelValueSingleArray1DI extends WebGLKernelValue {
    constructor(value, settings) {
      super(value, settings);
      this.requestTexture();
      this.bitRatio = 4;
      this.setShape(value);
    }
    setShape(value) {
      const valueDimensions = utils$1.getDimensions(value, true);
      this.textureSize = utils$1.getMemoryOptimizedFloatTextureSize(valueDimensions, this.bitRatio);
      this.dimensions = new Int32Array([valueDimensions[1], 1, 1]);
      this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
      this.checkSize(this.textureSize[0] * this.bitRatio, this.textureSize[1] * this.bitRatio);
      this.uploadValue = new Float32Array(this.uploadArrayLength);
    }
    getStringValueHandler() {
      return utils$1.linesToString([
        `const uploadValue_${this.name} = new Float32Array(${this.uploadArrayLength})`,
        `flattenTo(${this.varName}, uploadValue_${this.name})`,
      ]);
    }
    getSource() {
      return utils$1.linesToString([
        `uniform sampler2D ${this.id}`,
        `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
        `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
      ]);
    }
    updateValue(value) {
      if (value.constructor !== this.initialValueConstructor) {
        this.onUpdateValueMismatch();
        return;
      }
      const { context: gl } = this;
      utils$1.flatten2dArrayTo(value, this.uploadValue);
      gl.activeTexture(this.contextHandle);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
      this.kernel.setUniform1i(this.id, this.index);
    }
  }

  class WebGLKernelValueDynamicSingleArray1DI extends WebGLKernelValueSingleArray1DI {
    getSource() {
      return utils$1.linesToString([
        `uniform sampler2D ${this.id}`,
        `uniform ivec2 ${this.sizeId}`,
        `uniform ivec3 ${this.dimensionsId}`,
      ]);
    }
    updateValue(value) {
      this.setShape(value);
      this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
      this.kernel.setUniform2iv(this.sizeId, this.textureSize);
      super.updateValue(value);
    }
  }

  class WebGLKernelValueSingleArray2DI extends WebGLKernelValue {
    constructor(value, settings) {
      super(value, settings);
      this.requestTexture();
      this.bitRatio = 4;
      this.setShape(value);
    }
    setShape(value) {
      const valueDimensions = utils$1.getDimensions(value, true);
      this.textureSize = utils$1.getMemoryOptimizedFloatTextureSize(valueDimensions, this.bitRatio);
      this.dimensions = new Int32Array([valueDimensions[1], valueDimensions[2], 1]);
      this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
      this.checkSize(this.textureSize[0] * this.bitRatio, this.textureSize[1] * this.bitRatio);
      this.uploadValue = new Float32Array(this.uploadArrayLength);
    }
    getStringValueHandler() {
      return utils$1.linesToString([
        `const uploadValue_${this.name} = new Float32Array(${this.uploadArrayLength})`,
        `flattenTo(${this.varName}, uploadValue_${this.name})`,
      ]);
    }
    getSource() {
      return utils$1.linesToString([
        `uniform sampler2D ${this.id}`,
        `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
        `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
      ]);
    }
    updateValue(value) {
      if (value.constructor !== this.initialValueConstructor) {
        this.onUpdateValueMismatch();
        return;
      }
      const { context: gl } = this;
      utils$1.flatten3dArrayTo(value, this.uploadValue);
      gl.activeTexture(this.contextHandle);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
      this.kernel.setUniform1i(this.id, this.index);
    }
  }

  class WebGLKernelValueDynamicSingleArray2DI extends WebGLKernelValueSingleArray2DI {
    getSource() {
      return utils$1.linesToString([
        `uniform sampler2D ${this.id}`,
        `uniform ivec2 ${this.sizeId}`,
        `uniform ivec3 ${this.dimensionsId}`,
      ]);
    }
    updateValue(value) {
      this.setShape(value);
      this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
      this.kernel.setUniform2iv(this.sizeId, this.textureSize);
      super.updateValue(value);
    }
  }

  class WebGLKernelValueSingleArray3DI extends WebGLKernelValue {
    constructor(value, settings) {
      super(value, settings);
      this.requestTexture();
      this.bitRatio = 4;
      this.setShape(value);
    }
    setShape(value) {
      const valueDimensions = utils$1.getDimensions(value, true);
      this.textureSize = utils$1.getMemoryOptimizedFloatTextureSize(valueDimensions, this.bitRatio);
      this.dimensions = new Int32Array([valueDimensions[1], valueDimensions[2], valueDimensions[3]]);
      this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
      this.checkSize(this.textureSize[0] * this.bitRatio, this.textureSize[1] * this.bitRatio);
      this.uploadValue = new Float32Array(this.uploadArrayLength);
    }
    getStringValueHandler() {
      return utils$1.linesToString([
        `const uploadValue_${this.name} = new Float32Array(${this.uploadArrayLength})`,
        `flattenTo(${this.varName}, uploadValue_${this.name})`,
      ]);
    }
    getSource() {
      return utils$1.linesToString([
        `uniform sampler2D ${this.id}`,
        `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
        `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
      ]);
    }
    updateValue(value) {
      if (value.constructor !== this.initialValueConstructor) {
        this.onUpdateValueMismatch();
        return;
      }
      const { context: gl } = this;
      utils$1.flatten4dArrayTo(value, this.uploadValue);
      gl.activeTexture(this.contextHandle);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
      this.kernel.setUniform1i(this.id, this.index);
    }
  }

  class WebGLKernelValueDynamicSingleArray3DI extends WebGLKernelValueSingleArray3DI {
    getSource() {
      return utils$1.linesToString([
        `uniform sampler2D ${this.id}`,
        `uniform ivec2 ${this.sizeId}`,
        `uniform ivec3 ${this.dimensionsId}`,
      ]);
    }
    updateValue(value) {
      this.setShape(value);
      this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
      this.kernel.setUniform2iv(this.sizeId, this.textureSize);
      super.updateValue(value);
    }
  }

  class WebGLKernelValueSingleArray2 extends WebGLKernelValue {
    constructor(value, settings) {
      super(value, settings);
      this.uploadValue = value;
    }
    getSource(value) {
      if (this.origin === 'constants') {
        return `const vec2 ${this.id} = vec2(${value[0]},${value[1]});\n`;
      }
      return `uniform vec2 ${this.id};\n`;
    }
    getStringValueHandler() {
      if (this.origin === 'constants') return '';
      return `const uploadValue_${this.name} = ${this.varName};\n`;
    }
    updateValue(value) {
      if (this.origin === 'constants') return;
      this.kernel.setUniform2fv(this.id, this.uploadValue = value);
    }
  }

  class WebGLKernelValueSingleArray3 extends WebGLKernelValue {
    constructor(value, settings) {
      super(value, settings);
      this.uploadValue = value;
    }
    getSource(value) {
      if (this.origin === 'constants') {
        return `const vec3 ${this.id} = vec3(${value[0]},${value[1]},${value[2]});\n`;
      }
      return `uniform vec3 ${this.id};\n`;
    }
    getStringValueHandler() {
      if (this.origin === 'constants') return '';
      return `const uploadValue_${this.name} = ${this.varName};\n`;
    }
    updateValue(value) {
      if (this.origin === 'constants') return;
      this.kernel.setUniform3fv(this.id, this.uploadValue = value);
    }
  }

  class WebGLKernelValueSingleArray4 extends WebGLKernelValue {
    constructor(value, settings) {
      super(value, settings);
      this.uploadValue = value;
    }
    getSource(value) {
      if (this.origin === 'constants') {
        return `const vec4 ${this.id} = vec4(${value[0]},${value[1]},${value[2]},${value[3]});\n`;
      }
      return `uniform vec4 ${this.id};\n`;
    }
    getStringValueHandler() {
      if (this.origin === 'constants') return '';
      return `const uploadValue_${this.name} = ${this.varName};\n`;
    }
    updateValue(value) {
      if (this.origin === 'constants') return;
      this.kernel.setUniform4fv(this.id, this.uploadValue = value);
    }
  }

  class WebGLKernelValueUnsignedArray extends WebGLKernelValue {
    constructor(value, settings) {
      super(value, settings);
      this.requestTexture();
      this.bitRatio = this.getBitRatio(value);
      this.dimensions = utils$1.getDimensions(value, true);
      this.textureSize = utils$1.getMemoryOptimizedPackedTextureSize(this.dimensions, this.bitRatio);
      this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * (4 / this.bitRatio);
      this.checkSize(this.textureSize[0] * (4 / this.bitRatio), this.textureSize[1] * (4 / this.bitRatio));
      this.TranserArrayType = this.getTransferArrayType(value);
      this.preUploadValue = new this.TranserArrayType(this.uploadArrayLength);
      this.uploadValue = new Uint8Array(this.preUploadValue.buffer);
    }
    getStringValueHandler() {
      return utils$1.linesToString([
        `const preUploadValue_${this.name} = new ${this.TranserArrayType.name}(${this.uploadArrayLength})`,
        `const uploadValue_${this.name} = new Uint8Array(preUploadValue_${this.name}.buffer)`,
        `flattenTo(${this.varName}, preUploadValue_${this.name})`,
      ]);
    }
    getSource() {
      return utils$1.linesToString([
        `uniform sampler2D ${this.id}`,
        `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
        `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
      ]);
    }
    updateValue(value) {
      if (value.constructor !== this.initialValueConstructor) {
        this.onUpdateValueMismatch();
        return;
      }
      const { context: gl } = this;
      utils$1.flattenTo(value, this.preUploadValue);
      gl.activeTexture(this.contextHandle);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, this.uploadValue);
      this.kernel.setUniform1i(this.id, this.index);
    }
  }

  class WebGLKernelValueDynamicUnsignedArray extends WebGLKernelValueUnsignedArray {
    getSource() {
      return utils$1.linesToString([
        `uniform sampler2D ${this.id}`,
        `uniform ivec2 ${this.sizeId}`,
        `uniform ivec3 ${this.dimensionsId}`,
      ]);
    }
    updateValue(value) {
      this.dimensions = utils$1.getDimensions(value, true);
      this.textureSize = utils$1.getMemoryOptimizedPackedTextureSize(this.dimensions, this.bitRatio);
      this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * (4 / this.bitRatio);
      this.checkSize(this.textureSize[0] * (4 / this.bitRatio), this.textureSize[1] * (4 / this.bitRatio));
      const Type = this.getTransferArrayType(value);
      this.preUploadValue = new Type(this.uploadArrayLength);
      this.uploadValue = new Uint8Array(this.preUploadValue.buffer);
      this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
      this.kernel.setUniform2iv(this.sizeId, this.textureSize);
      super.updateValue(value);
    }
  }

  const kernelValueMaps = {
    unsigned: {
      dynamic: {
        'Boolean': WebGLKernelValueBoolean,
        'Integer': WebGLKernelValueInteger,
        'Float': WebGLKernelValueFloat,
        'Array': WebGLKernelValueDynamicUnsignedArray,
        'Array(2)': false,
        'Array(3)': false,
        'Array(4)': false,
        'Array1D(2)': false,
        'Array1D(3)': false,
        'Array1D(4)': false,
        'Array2D(2)': false,
        'Array2D(3)': false,
        'Array2D(4)': false,
        'Array3D(2)': false,
        'Array3D(3)': false,
        'Array3D(4)': false,
        'Input': WebGLKernelValueDynamicUnsignedInput,
        'NumberTexture': WebGLKernelValueDynamicNumberTexture,
        'ArrayTexture(1)': WebGLKernelValueDynamicNumberTexture,
        'ArrayTexture(2)': WebGLKernelValueDynamicNumberTexture,
        'ArrayTexture(3)': WebGLKernelValueDynamicNumberTexture,
        'ArrayTexture(4)': WebGLKernelValueDynamicNumberTexture,
        'MemoryOptimizedNumberTexture': WebGLKernelValueMemoryOptimizedNumberTexture,
        'HTMLImage': WebGLKernelValueDynamicHTMLImage,
        'HTMLImageArray': false,
        'HTMLVideo': WebGLKernelValueDynamicHTMLVideo,
      },
      static: {
        'Boolean': WebGLKernelValueBoolean,
        'Float': WebGLKernelValueFloat,
        'Integer': WebGLKernelValueInteger,
        'Array': WebGLKernelValueUnsignedArray,
        'Array(2)': false,
        'Array(3)': false,
        'Array(4)': false,
        'Array1D(2)': false,
        'Array1D(3)': false,
        'Array1D(4)': false,
        'Array2D(2)': false,
        'Array2D(3)': false,
        'Array2D(4)': false,
        'Array3D(2)': false,
        'Array3D(3)': false,
        'Array3D(4)': false,
        'Input': WebGLKernelValueUnsignedInput,
        'NumberTexture': WebGLKernelValueNumberTexture,
        'ArrayTexture(1)': WebGLKernelValueNumberTexture,
        'ArrayTexture(2)': WebGLKernelValueNumberTexture,
        'ArrayTexture(3)': WebGLKernelValueNumberTexture,
        'ArrayTexture(4)': WebGLKernelValueNumberTexture,
        'MemoryOptimizedNumberTexture': WebGLKernelValueDynamicMemoryOptimizedNumberTexture,
        'HTMLImage': WebGLKernelValueHTMLImage,
        'HTMLImageArray': false,
        'HTMLVideo': WebGLKernelValueHTMLVideo,
      }
    },
    single: {
      dynamic: {
        'Boolean': WebGLKernelValueBoolean,
        'Integer': WebGLKernelValueInteger,
        'Float': WebGLKernelValueFloat,
        'Array': WebGLKernelValueDynamicSingleArray,
        'Array(2)': WebGLKernelValueSingleArray2,
        'Array(3)': WebGLKernelValueSingleArray3,
        'Array(4)': WebGLKernelValueSingleArray4,
        'Array1D(2)': WebGLKernelValueDynamicSingleArray1DI,
        'Array1D(3)': WebGLKernelValueDynamicSingleArray1DI,
        'Array1D(4)': WebGLKernelValueDynamicSingleArray1DI,
        'Array2D(2)': WebGLKernelValueDynamicSingleArray2DI,
        'Array2D(3)': WebGLKernelValueDynamicSingleArray2DI,
        'Array2D(4)': WebGLKernelValueDynamicSingleArray2DI,
        'Array3D(2)': WebGLKernelValueDynamicSingleArray3DI,
        'Array3D(3)': WebGLKernelValueDynamicSingleArray3DI,
        'Array3D(4)': WebGLKernelValueDynamicSingleArray3DI,
        'Input': WebGLKernelValueDynamicSingleInput,
        'NumberTexture': WebGLKernelValueDynamicNumberTexture,
        'ArrayTexture(1)': WebGLKernelValueDynamicNumberTexture,
        'ArrayTexture(2)': WebGLKernelValueDynamicNumberTexture,
        'ArrayTexture(3)': WebGLKernelValueDynamicNumberTexture,
        'ArrayTexture(4)': WebGLKernelValueDynamicNumberTexture,
        'MemoryOptimizedNumberTexture': WebGLKernelValueDynamicMemoryOptimizedNumberTexture,
        'HTMLImage': WebGLKernelValueDynamicHTMLImage,
        'HTMLImageArray': false,
        'HTMLVideo': WebGLKernelValueDynamicHTMLVideo,
      },
      static: {
        'Boolean': WebGLKernelValueBoolean,
        'Float': WebGLKernelValueFloat,
        'Integer': WebGLKernelValueInteger,
        'Array': WebGLKernelValueSingleArray,
        'Array(2)': WebGLKernelValueSingleArray2,
        'Array(3)': WebGLKernelValueSingleArray3,
        'Array(4)': WebGLKernelValueSingleArray4,
        'Array1D(2)': WebGLKernelValueSingleArray1DI,
        'Array1D(3)': WebGLKernelValueSingleArray1DI,
        'Array1D(4)': WebGLKernelValueSingleArray1DI,
        'Array2D(2)': WebGLKernelValueSingleArray2DI,
        'Array2D(3)': WebGLKernelValueSingleArray2DI,
        'Array2D(4)': WebGLKernelValueSingleArray2DI,
        'Array3D(2)': WebGLKernelValueSingleArray3DI,
        'Array3D(3)': WebGLKernelValueSingleArray3DI,
        'Array3D(4)': WebGLKernelValueSingleArray3DI,
        'Input': WebGLKernelValueSingleInput,
        'NumberTexture': WebGLKernelValueNumberTexture,
        'ArrayTexture(1)': WebGLKernelValueNumberTexture,
        'ArrayTexture(2)': WebGLKernelValueNumberTexture,
        'ArrayTexture(3)': WebGLKernelValueNumberTexture,
        'ArrayTexture(4)': WebGLKernelValueNumberTexture,
        'MemoryOptimizedNumberTexture': WebGLKernelValueMemoryOptimizedNumberTexture,
        'HTMLImage': WebGLKernelValueHTMLImage,
        'HTMLImageArray': false,
        'HTMLVideo': WebGLKernelValueHTMLVideo,
      }
    },
  };
  function lookupKernelValueType(type, dynamic, precision, value) {
    if (!type) {
      throw new Error('type missing');
    }
    if (!dynamic) {
      throw new Error('dynamic missing');
    }
    if (!precision) {
      throw new Error('precision missing');
    }
    if (value.type) {
      type = value.type;
    }
    const types = kernelValueMaps[precision][dynamic];
    if (types[type] === false) {
      return null;
    } else if (types[type] === undefined) {
      throw new Error(`Could not find a KernelValue for ${ type }`);
    }
    return types[type];
  }

  let isSupported = null;
  let testCanvas = null;
  let testContext = null;
  let testExtensions = null;
  let features = null;
  const plugins = [triangleNoise];
  const canvases = [];
  const maxTexSizes = {};
  class WebGLKernel extends GLKernel {
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
    constructor(source, settings) {
      super(source, settings);
      this.program = null;
      this.pipeline = settings.pipeline;
      this.endianness = utils$1.systemEndianness();
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
      this.maxTexSize = null;
      this.switchingKernels = false;
      this.onRequestSwitchKernel = null;
      this.mergeSettings(source.settings || settings);
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
        if (settings.pluginNames) {
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
    validateSettings(args) {
      if (!this.validate) {
        this.texSize = utils$1.getKernelTextureSize({
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
        const argType = utils$1.getVariableType(args[0], this.strictIntegers);
        if (argType === 'Array') {
          this.output = utils$1.getDimensions(argType);
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
        this.texSize = utils$1.clone(this.output);
        return;
      } else if (this.precision === null && features.isTextureFloat) {
        this.precision = 'single';
      }
      this.texSize = utils$1.getKernelTextureSize({
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
    _oldtranslateSource() {
      const functionBuilder = FunctionBuilder.fromKernel(this, WebGLFunctionNode, {
        fixIntegerDivisionAccuracy: this.fixIntegerDivisionAccuracy
      });
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
      if (needsArgumentTypes) {
        this.argumentTypes = [];
      }
      this.argumentSizes = [];
      this.argumentBitRatios = [];
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
          type = utils$1.getVariableType(value, this.strictIntegers);
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
          type = utils$1.getVariableType(value, this.strictIntegers);
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
    getOutputTexture() {
      return this.outputTexture;
    }
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
      if (this.precision === 'single') {
        if (this.pipeline) {
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
    getTextureCache(name) {
      if (this.textureCache.hasOwnProperty(name)) {
        return this.textureCache[name];
      }
      return this.textureCache[name] = this.context.createTexture();
    }
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
    getUniformLocation(name) {
      if (this.programUniformLocationCache.hasOwnProperty(name)) {
        return this.programUniformLocationCache[name];
      }
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
        SAMPLER_2D_ARRAY_TACTIC_DECLARATION: this.getSampler2DArrayTacticDeclaration(),
      };
    }
    _getVertShaderArtifactMap(args) {
      return {
        FLOAT_TACTIC_DECLARATION: this.getFloatTacticDeclaration(),
        INT_TACTIC_DECLARATION: this.getIntTacticDeclaration(),
        SAMPLER_2D_TACTIC_DECLARATION: this.getSampler2DTacticDeclaration(),
        SAMPLER_2D_ARRAY_TACTIC_DECLARATION: this.getSampler2DArrayTacticDeclaration(),
      };
    }
    _getHeaderString() {
      return (
        this.subKernels !== null ?
        '#extension GL_EXT_draw_buffers : require\n' :
        ''
      );
    }
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
      return utils$1.linesToString(result);
    }
    _getTextureCoordinate() {
      const subKernels = this.subKernels;
      if (subKernels === null || subKernels.length < 1) {
        return 'varying vec2 vTexCoord;\n';
      } else {
        return 'out vec2 vTexCoord;\n';
      }
    }
    _getDecode32EndiannessString() {
      return (
        this.endianness === 'LE' ?
        '' :
        '  texel.rgba = texel.abgr;\n'
      );
    }
    _getEncode32EndiannessString() {
      return (
        this.endianness === 'LE' ?
        '' :
        '  texel.rgba = texel.abgr;\n'
      );
    }
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
      return utils$1.linesToString(result) + this.translatedSource;
    }
    getMainResultGraphical() {
      return utils$1.linesToString([
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
    getMainResultKernelPackedPixels() {
      return utils$1.linesToString([
        '  threadId = indexTo3D(index, uOutputDim)',
        '  kernel()',
        `  gl_FragData[0] = ${this.useLegacyEncoder ? 'legacyEncode32' : 'encode32'}(kernelResult)`
      ]);
    }
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
      return utils$1.linesToString(result);
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
      return utils$1.linesToString(result);
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
    replaceArtifacts(src, map) {
      return src.replace(/[ ]*__([A-Z]+[0-9]*([_]?[A-Z]*[0-9]?)*)__;\n/g, (match, artifact) => {
        if (map.hasOwnProperty(artifact)) {
          return map[artifact];
        }
        throw `unhandled artifact ${artifact}`;
      });
    }
    getFragmentShader(args) {
      if (this.compiledFragmentShader !== null) {
        return this.compiledFragmentShader;
      }
      return this.compiledFragmentShader = this.replaceArtifacts(this.constructor.fragmentShader, this._getFragShaderArtifactMap(args));
    }
    getVertexShader(args) {
      if (this.compiledVertexShader !== null) {
        return this.compiledVertexShader;
      }
      return this.compiledVertexShader = this.replaceArtifacts(this.constructor.vertexShader, this._getVertShaderArtifactMap(args));
    }
    toString() {
      const setupContextString = utils$1.linesToString([
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

  class WebGL2FunctionNode extends WebGLFunctionNode {
    astIdentifierExpression(idtNode, retArr) {
      if (idtNode.type !== 'Identifier') {
        throw this.astErrorOutput(
          'IdentifierExpression - not an Identifier',
          idtNode
        );
      }
      const type = this.getType(idtNode);
      if (idtNode.name === 'Infinity') {
        retArr.push('intBitsToFloat(2139095039)');
      } else if (type === 'Boolean') {
        if (this.argumentNames.indexOf(idtNode.name) > -1) {
          retArr.push(`bool(user_${idtNode.name})`);
        } else {
          retArr.push(`user_${idtNode.name}`);
        }
      } else {
        retArr.push(`user_${idtNode.name}`);
      }
      return retArr;
    }
  }

  const fragmentShader$1 = `#version 300 es
__HEADER__;
__FLOAT_TACTIC_DECLARATION__;
__INT_TACTIC_DECLARATION__;
__SAMPLER_2D_TACTIC_DECLARATION__;
__SAMPLER_2D_ARRAY_TACTIC_DECLARATION__;

const int LOOP_MAX = __LOOP_MAX__;

__PLUGINS__;
__CONSTANTS__;

in vec2 vTexCoord;

const int BIT_COUNT = 32;
int modi(int x, int y) {
  return x - y * (x / y);
}

int bitwiseOr(int a, int b) {
  int result = 0;
  int n = 1;

  for (int i = 0; i < BIT_COUNT; i++) {
    if ((modi(a, 2) == 1) || (modi(b, 2) == 1)) {
      result += n;
    }
    a = a / 2;
    b = b / 2;
    n = n * 2;
    if(!(a > 0 || b > 0)) {
      break;
    }
  }
  return result;
}
int bitwiseXOR(int a, int b) {
  int result = 0;
  int n = 1;

  for (int i = 0; i < BIT_COUNT; i++) {
    if ((modi(a, 2) == 1) != (modi(b, 2) == 1)) {
      result += n;
    }
    a = a / 2;
    b = b / 2;
    n = n * 2;
    if(!(a > 0 || b > 0)) {
      break;
    }
  }
  return result;
}
int bitwiseAnd(int a, int b) {
  int result = 0;
  int n = 1;
  for (int i = 0; i < BIT_COUNT; i++) {
    if ((modi(a, 2) == 1) && (modi(b, 2) == 1)) {
      result += n;
    }
    a = a / 2;
    b = b / 2;
    n = n * 2;
    if(!(a > 0 && b > 0)) {
      break;
    }
  }
  return result;
}
int bitwiseNot(int a) {
  int result = 0;
  int n = 1;

  for (int i = 0; i < BIT_COUNT; i++) {
    if (modi(a, 2) == 0) {
      result += n;
    }
    a = a / 2;
    n = n * 2;
  }
  return result;
}
int bitwiseZeroFillLeftShift(int n, int shift) {
  int maxBytes = BIT_COUNT;
  for (int i = 0; i < BIT_COUNT; i++) {
    if (maxBytes >= n) {
      break;
    }
    maxBytes *= 2;
  }
  for (int i = 0; i < BIT_COUNT; i++) {
    if (i >= shift) {
      break;
    }
    n *= 2;
  }

  int result = 0;
  int byteVal = 1;
  for (int i = 0; i < BIT_COUNT; i++) {
    if (i >= maxBytes) break;
    if (modi(n, 2) > 0) { result += byteVal; }
    n = int(n / 2);
    byteVal *= 2;
  }
  return result;
}

int bitwiseSignedRightShift(int num, int shifts) {
  return int(floor(float(num) / pow(2.0, float(shifts))));
}

int bitwiseZeroFillRightShift(int n, int shift) {
  int maxBytes = BIT_COUNT;
  for (int i = 0; i < BIT_COUNT; i++) {
    if (maxBytes >= n) {
      break;
    }
    maxBytes *= 2;
  }
  for (int i = 0; i < BIT_COUNT; i++) {
    if (i >= shift) {
      break;
    }
    n /= 2;
  }
  int result = 0;
  int byteVal = 1;
  for (int i = 0; i < BIT_COUNT; i++) {
    if (i >= maxBytes) break;
    if (modi(n, 2) > 0) { result += byteVal; }
    n = int(n / 2);
    byteVal *= 2;
  }
  return result;
}

vec2 integerMod(vec2 x, float y) {
  vec2 res = floor(mod(x, y));
  return res * step(1.0 - floor(y), -res);
}

vec3 integerMod(vec3 x, float y) {
  vec3 res = floor(mod(x, y));
  return res * step(1.0 - floor(y), -res);
}

vec4 integerMod(vec4 x, vec4 y) {
  vec4 res = floor(mod(x, y));
  return res * step(1.0 - floor(y), -res);
}

float integerMod(float x, float y) {
  float res = floor(mod(x, y));
  return res * (res > floor(y) - 1.0 ? 0.0 : 1.0);
}

int integerMod(int x, int y) {
  return x - (y * int(x/y));
}

__DIVIDE_WITH_INTEGER_CHECK__;

// Here be dragons!
// DO NOT OPTIMIZE THIS CODE
// YOU WILL BREAK SOMETHING ON SOMEBODY\'S MACHINE
// LEAVE IT AS IT IS, LEST YOU WASTE YOUR OWN TIME
const vec2 MAGIC_VEC = vec2(1.0, -256.0);
const vec4 SCALE_FACTOR = vec4(1.0, 256.0, 65536.0, 0.0);
const vec4 SCALE_FACTOR_INV = vec4(1.0, 0.00390625, 0.0000152587890625, 0.0); // 1, 1/256, 1/65536
float decode32(vec4 texel) {
  __DECODE32_ENDIANNESS__;
  texel *= 255.0;
  vec2 gte128;
  gte128.x = texel.b >= 128.0 ? 1.0 : 0.0;
  gte128.y = texel.a >= 128.0 ? 1.0 : 0.0;
  float exponent = 2.0 * texel.a - 127.0 + dot(gte128, MAGIC_VEC);
  float res = exp2(round(exponent));
  texel.b = texel.b - 128.0 * gte128.x;
  res = dot(texel, SCALE_FACTOR) * exp2(round(exponent-23.0)) + res;
  res *= gte128.y * -2.0 + 1.0;
  return res;
}

float decode16(vec4 texel, int index) {
  int channel = integerMod(index, 2);
  return texel[channel*2] * 255.0 + texel[channel*2 + 1] * 65280.0;
}

float decode8(vec4 texel, int index) {
  int channel = integerMod(index, 4);
  return texel[channel] * 255.0;
}

vec4 legacyEncode32(float f) {
  float F = abs(f);
  float sign = f < 0.0 ? 1.0 : 0.0;
  float exponent = floor(log2(F));
  float mantissa = (exp2(-exponent) * F);
  // exponent += floor(log2(mantissa));
  vec4 texel = vec4(F * exp2(23.0-exponent)) * SCALE_FACTOR_INV;
  texel.rg = integerMod(texel.rg, 256.0);
  texel.b = integerMod(texel.b, 128.0);
  texel.a = exponent*0.5 + 63.5;
  texel.ba += vec2(integerMod(exponent+127.0, 2.0), sign) * 128.0;
  texel = floor(texel);
  texel *= 0.003921569; // 1/255
  __ENCODE32_ENDIANNESS__;
  return texel;
}

// https://github.com/gpujs/gpu.js/wiki/Encoder-details
vec4 encode32(float value) {
  if (value == 0.0) return vec4(0, 0, 0, 0);

  float exponent;
  float mantissa;
  vec4  result;
  float sgn;

  sgn = step(0.0, -value);
  value = abs(value);

  exponent = floor(log2(value));

  mantissa = value*pow(2.0, -exponent)-1.0;
  exponent = exponent+127.0;
  result   = vec4(0,0,0,0);

  result.a = floor(exponent/2.0);
  exponent = exponent - result.a*2.0;
  result.a = result.a + 128.0*sgn;

  result.b = floor(mantissa * 128.0);
  mantissa = mantissa - result.b / 128.0;
  result.b = result.b + exponent*128.0;

  result.g = floor(mantissa*32768.0);
  mantissa = mantissa - result.g/32768.0;

  result.r = floor(mantissa*8388608.0);
  return result/255.0;
}
// Dragons end here

int index;
ivec3 threadId;

ivec3 indexTo3D(int idx, ivec3 texDim) {
  int z = int(idx / (texDim.x * texDim.y));
  idx -= z * int(texDim.x * texDim.y);
  int y = int(idx / texDim.x);
  int x = int(integerMod(idx, texDim.x));
  return ivec3(x, y, z);
}

float get32(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + texDim.x * (y + texDim.y * z);
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture(tex, st / vec2(texSize));
  return decode32(texel);
}

float get16(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + (texDim.x * (y + (texDim.y * z)));
  int w = texSize.x * 2;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture(tex, st / vec2(texSize.x * 2, texSize.y));
  return decode16(texel, index);
}

float get8(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + (texDim.x * (y + (texDim.y * z)));
  int w = texSize.x * 4;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture(tex, st / vec2(texSize.x * 4, texSize.y));
  return decode8(texel, index);
}

float getMemoryOptimized32(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + (texDim.x * (y + (texDim.y * z)));
  int channel = integerMod(index, 4);
  index = index / 4;
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  index = index / 4;
  vec4 texel = texture(tex, st / vec2(texSize));
  return texel[channel];
}

vec4 getImage2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + texDim.x * (y + texDim.y * z);
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  return texture(tex, st / vec2(texSize));
}

vec4 getImage3D(sampler2DArray tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + texDim.x * (y + texDim.y * z);
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  return texture(tex, vec3(st / vec2(texSize), z));
}

float getFloatFromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  vec4 result = getImage2D(tex, texSize, texDim, z, y, x);
  return result[0];
}

vec2 getVec2FromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  vec4 result = getImage2D(tex, texSize, texDim, z, y, x);
  return vec2(result[0], result[1]);
}

vec2 getMemoryOptimizedVec2(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + texDim.x * (y + texDim.y * z);
  int channel = integerMod(index, 2);
  index = index / 2;
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture(tex, st / vec2(texSize));
  if (channel == 0) return vec2(texel.r, texel.g);
  if (channel == 1) return vec2(texel.b, texel.a);
  return vec2(0.0, 0.0);
}

vec3 getVec3FromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  vec4 result = getImage2D(tex, texSize, texDim, z, y, x);
  return vec3(result[0], result[1], result[2]);
}

vec3 getMemoryOptimizedVec3(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int fieldIndex = 3 * (x + texDim.x * (y + texDim.y * z));
  int vectorIndex = fieldIndex / 4;
  int vectorOffset = fieldIndex - vectorIndex * 4;
  int readY = vectorIndex / texSize.x;
  int readX = vectorIndex - readY * texSize.x;
  vec4 tex1 = texture(tex, (vec2(readX, readY) + 0.5) / vec2(texSize));

  if (vectorOffset == 0) {
    return tex1.xyz;
  } else if (vectorOffset == 1) {
    return tex1.yzw;
  } else {
    readX++;
    if (readX >= texSize.x) {
      readX = 0;
      readY++;
    }
    vec4 tex2 = texture(tex, vec2(readX, readY) / vec2(texSize));
    if (vectorOffset == 2) {
      return vec3(tex1.z, tex1.w, tex2.x);
    } else {
      return vec3(tex1.w, tex2.x, tex2.y);
    }
  }
}

vec4 getVec4FromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  return getImage2D(tex, texSize, texDim, z, y, x);
}

vec4 getMemoryOptimizedVec4(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + texDim.x * (y + texDim.y * z);
  int channel = integerMod(index, 2);
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture(tex, st / vec2(texSize));
  return vec4(texel.r, texel.g, texel.b, texel.a);
}

vec4 actualColor;
void color(float r, float g, float b, float a) {
  actualColor = vec4(r,g,b,a);
}

void color(float r, float g, float b) {
  color(r,g,b,1.0);
}

__INJECTED_NATIVE__;
__MAIN_CONSTANTS__;
__MAIN_ARGUMENTS__;
__KERNEL__;

void main(void) {
  index = int(vTexCoord.s * float(uTexSize.x)) + int(vTexCoord.t * float(uTexSize.y)) * uTexSize.x;
  __MAIN_RESULT__;
}`;

  const vertexShader$1 = `#version 300 es
__FLOAT_TACTIC_DECLARATION__;
__INT_TACTIC_DECLARATION__;
__SAMPLER_2D_TACTIC_DECLARATION__;

in vec2 aPos;
in vec2 aTexCoord;

out vec2 vTexCoord;
uniform vec2 ratio;

void main(void) {
  gl_Position = vec4((aPos + vec2(1)) * ratio + vec2(-1), 0, 1);
  vTexCoord = aTexCoord;
}`;

  class WebGL2KernelValueBoolean extends WebGLKernelValueBoolean {}

  class WebGL2KernelValueFloat extends WebGLKernelValueFloat {}

  class WebGL2KernelValueInteger extends WebGLKernelValueInteger {
    getSource(value) {
      const variablePrecision = this.getVariablePrecisionString();
      if (this.origin === 'constants') {
        return `const ${ variablePrecision } int ${this.id} = ${ parseInt(value) };\n`;
      }
      return `uniform ${ variablePrecision } int ${this.id};\n`;
    }
    updateValue(value) {
      if (this.origin === 'constants') return;
      this.kernel.setUniform1i(this.id, this.uploadValue = value);
    }
  }

  class WebGL2KernelValueHTMLImage extends WebGLKernelValueHTMLImage {
    getSource() {
      const variablePrecision = this.getVariablePrecisionString();
      return utils$1.linesToString([
        `uniform ${ variablePrecision } sampler2D ${this.id}`,
        `${ variablePrecision } ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
        `${ variablePrecision } ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
      ]);
    }
  }

  class WebGL2KernelValueDynamicHTMLImage extends WebGLKernelValueDynamicHTMLImage {
    getSource() {
      const variablePrecision = this.getVariablePrecisionString();
      return utils$1.linesToString([
        `uniform ${ variablePrecision } sampler2D ${this.id}`,
        `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
        `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
      ]);
    }
  }

  class WebGL2KernelValueHTMLImageArray extends WebGLKernelValue {
    constructor(value, settings) {
      super(value, settings);
      this.checkSize(value[0].width, value[0].height);
      this.requestTexture();
      this.dimensions = [value[0].width, value[0].height, value.length];
      this.textureSize = [value[0].width, value[0].height];
    }
    getStringValueHandler() {
      return `const uploadValue_${this.name} = ${this.varName};\n`;
    }
    getSource() {
      const variablePrecision = this.getVariablePrecisionString();
      return utils$1.linesToString([
        `uniform ${ variablePrecision } sampler2DArray ${this.id}`,
        `${ variablePrecision } ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
        `${ variablePrecision } ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
      ]);
    }
    updateValue(images) {
      const { context: gl } = this;
      gl.activeTexture(this.contextHandle);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.texture);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage3D(
        gl.TEXTURE_2D_ARRAY,
        0,
        gl.RGBA,
        images[0].width,
        images[0].height,
        images.length,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
      );
      for (let i = 0; i < images.length; i++) {
        const xOffset = 0;
        const yOffset = 0;
        const imageDepth = 1;
        gl.texSubImage3D(
          gl.TEXTURE_2D_ARRAY,
          0,
          xOffset,
          yOffset,
          i,
          images[i].width,
          images[i].height,
          imageDepth,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          this.uploadValue = images[i]
        );
      }
      this.kernel.setUniform1i(this.id, this.index);
    }
  }

  class WebGL2KernelValueDynamicHTMLImageArray extends WebGL2KernelValueHTMLImageArray {
    getSource() {
      const variablePrecision = this.getVariablePrecisionString();
      return utils.linesToString([
        `uniform ${ variablePrecision } sampler2DArray ${this.id}`,
        `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
        `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
      ]);
    }
    updateValue(images) {
      const { width, height } = images[0];
      this.checkSize(width, height);
      this.dimensions = [width, height, images.length];
      this.textureSize = [width, height];
      this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
      this.kernel.setUniform2iv(this.sizeId, this.textureSize);
      super.updateValue(images);
    }
  }

  class WebGL2KernelValueHTMLVideo extends WebGL2KernelValueHTMLImage {}

  class WebGL2KernelValueDynamicHTMLVideo extends WebGL2KernelValueDynamicHTMLImage {}

  class WebGL2KernelValueSingleInput extends WebGLKernelValueSingleInput {
    getSource() {
      const variablePrecision = this.getVariablePrecisionString();
      return utils$1.linesToString([
        `uniform ${ variablePrecision } sampler2D ${this.id}`,
        `${ variablePrecision } ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
        `${ variablePrecision } ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
      ]);
    }
    updateValue(input) {
      const { context: gl } = this;
      utils$1.flattenTo(input.value, this.uploadValue);
      gl.activeTexture(this.contextHandle);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
      this.kernel.setUniform1i(this.id, this.index);
    }
  }

  class WebGL2KernelValueDynamicSingleInput extends WebGL2KernelValueSingleInput {
    getSource() {
      const variablePrecision = this.getVariablePrecisionString();
      return utils$1.linesToString([
        `uniform ${ variablePrecision } sampler2D ${this.id}`,
        `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
        `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
      ]);
    }
    updateValue(value) {
      let [w, h, d] = value.size;
      this.dimensions = new Int32Array([w || 1, h || 1, d || 1]);
      this.textureSize = utils$1.getMemoryOptimizedFloatTextureSize(this.dimensions, this.bitRatio);
      this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
      this.checkSize(this.textureSize[0] * this.bitRatio, this.textureSize[1] * this.bitRatio);
      this.uploadValue = new Float32Array(this.uploadArrayLength);
      this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
      this.kernel.setUniform2iv(this.sizeId, this.textureSize);
      super.updateValue(value);
    }
  }

  class WebGL2KernelValueUnsignedInput extends WebGLKernelValueUnsignedInput {
    getSource() {
      const variablePrecision = this.getVariablePrecisionString();
      return utils$1.linesToString([
        `uniform ${ variablePrecision } sampler2D ${this.id}`,
        `${ variablePrecision } ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
        `${ variablePrecision } ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
      ]);
    }
  }

  class WebGL2KernelValueDynamicUnsignedInput extends WebGLKernelValueDynamicUnsignedInput {
    getSource() {
      const variablePrecision = this.getVariablePrecisionString();
      return utils$1.linesToString([
        `uniform ${ variablePrecision } sampler2D ${this.id}`,
        `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
        `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
      ]);
    }
  }

  class WebGL2KernelValueMemoryOptimizedNumberTexture extends WebGLKernelValueMemoryOptimizedNumberTexture {
    getSource() {
      const { id, sizeId, textureSize, dimensionsId, dimensions } = this;
      const variablePrecision = this.getVariablePrecisionString();
      return utils$1.linesToString([
        `uniform sampler2D ${id}`,
        `${ variablePrecision } ivec2 ${sizeId} = ivec2(${textureSize[0]}, ${textureSize[1]})`,
        `${ variablePrecision } ivec3 ${dimensionsId} = ivec3(${dimensions[0]}, ${dimensions[1]}, ${dimensions[2]})`,
      ]);
    }
  }

  class WebGL2KernelValueDynamicMemoryOptimizedNumberTexture extends WebGLKernelValueDynamicMemoryOptimizedNumberTexture {
    getSource() {
      return utils$1.linesToString([
        `uniform sampler2D ${this.id}`,
        `uniform ivec2 ${this.sizeId}`,
        `uniform ivec3 ${this.dimensionsId}`,
      ]);
    }
  }

  class WebGL2KernelValueNumberTexture extends WebGLKernelValueNumberTexture {
    getSource() {
      const { id, sizeId, textureSize, dimensionsId, dimensions } = this;
      const variablePrecision = this.getVariablePrecisionString();
      return utils$1.linesToString([
        `uniform ${ variablePrecision } sampler2D ${id}`,
        `${ variablePrecision } ivec2 ${sizeId} = ivec2(${textureSize[0]}, ${textureSize[1]})`,
        `${ variablePrecision } ivec3 ${dimensionsId} = ivec3(${dimensions[0]}, ${dimensions[1]}, ${dimensions[2]})`,
      ]);
    }
  }

  class WebGL2KernelValueDynamicNumberTexture extends WebGLKernelValueDynamicNumberTexture {
    getSource() {
      const variablePrecision = this.getVariablePrecisionString();
      return utils$1.linesToString([
        `uniform ${ variablePrecision } sampler2D ${this.id}`,
        `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
        `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
      ]);
    }
  }

  class WebGL2KernelValueSingleArray extends WebGLKernelValueSingleArray {
    getSource() {
      const variablePrecision = this.getVariablePrecisionString();
      return utils$1.linesToString([
        `uniform ${ variablePrecision } sampler2D ${this.id}`,
        `${ variablePrecision } ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
        `${ variablePrecision } ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
      ]);
    }
    updateValue(value) {
      if (value.constructor !== this.initialValueConstructor) {
        this.onUpdateValueMismatch();
        return;
      }
      const { context: gl } = this;
      utils$1.flattenTo(value, this.uploadValue);
      gl.activeTexture(this.contextHandle);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
      this.kernel.setUniform1i(this.id, this.index);
    }
  }

  class WebGL2KernelValueDynamicSingleArray extends WebGL2KernelValueSingleArray {
    getSource() {
      const variablePrecision = this.getVariablePrecisionString();
      return utils$1.linesToString([
        `uniform ${ variablePrecision } sampler2D ${this.id}`,
        `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
        `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
      ]);
    }
    updateValue(value) {
      this.dimensions = utils$1.getDimensions(value, true);
      this.textureSize = utils$1.getMemoryOptimizedFloatTextureSize(this.dimensions, this.bitRatio);
      this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
      this.checkSize(this.textureSize[0] * this.bitRatio, this.textureSize[1] * this.bitRatio);
      this.uploadValue = new Float32Array(this.uploadArrayLength);
      this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
      this.kernel.setUniform2iv(this.sizeId, this.textureSize);
      super.updateValue(value);
    }
  }

  class WebGL2KernelValueSingleArray1DI extends WebGLKernelValueSingleArray1DI {
    updateValue(value) {
      if (value.constructor !== this.initialValueConstructor) {
        this.onUpdateValueMismatch();
        return;
      }
      const { context: gl } = this;
      utils$1.flattenTo(value, this.uploadValue);
      gl.activeTexture(this.contextHandle);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
      this.kernel.setUniform1i(this.id, this.index);
    }
  }

  class WebGL2KernelValueDynamicSingleArray1DI extends WebGL2KernelValueSingleArray1DI {
    getSource() {
      const variablePrecision = this.getVariablePrecisionString();
      return utils$1.linesToString([
        `uniform ${ variablePrecision } sampler2D ${this.id}`,
        `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
        `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
      ]);
    }
    updateValue(value) {
      this.setShape(value);
      this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
      this.kernel.setUniform2iv(this.sizeId, this.textureSize);
      super.updateValue(value);
    }
  }

  class WebGL2KernelValueSingleArray2DI extends WebGLKernelValueSingleArray2DI {
    updateValue(value) {
      if (value.constructor !== this.initialValueConstructor) {
        this.onUpdateValueMismatch();
        return;
      }
      const { context: gl } = this;
      utils$1.flattenTo(value, this.uploadValue);
      gl.activeTexture(this.contextHandle);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
      this.kernel.setUniform1i(this.id, this.index);
    }
  }

  class WebGL2KernelValueDynamicSingleArray2DI extends WebGL2KernelValueSingleArray2DI {
    getSource() {
      const variablePrecision = this.getVariablePrecisionString();
      return utils$1.linesToString([
        `uniform ${ variablePrecision } sampler2D ${this.id}`,
        `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
        `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
      ]);
    }
    updateValue(value) {
      this.setShape(value);
      this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
      this.kernel.setUniform2iv(this.sizeId, this.textureSize);
      super.updateValue(value);
    }
  }

  class WebGL2KernelValueSingleArray3DI extends WebGLKernelValueSingleArray3DI {
    updateValue(value) {
      if (value.constructor !== this.initialValueConstructor) {
        this.onUpdateValueMismatch();
        return;
      }
      const { context: gl } = this;
      utils$1.flattenTo(value, this.uploadValue);
      gl.activeTexture(this.contextHandle);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
      this.kernel.setUniform1i(this.id, this.index);
    }
  }

  class WebGL2KernelValueDynamicSingleArray3DI extends WebGL2KernelValueSingleArray3DI {
    getSource() {
      const variablePrecision = this.getVariablePrecisionString();
      return utils$1.linesToString([
        `uniform ${ variablePrecision } sampler2D ${this.id}`,
        `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
        `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
      ]);
    }
    updateValue(value) {
      this.setShape(value);
      this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
      this.kernel.setUniform2iv(this.sizeId, this.textureSize);
      super.updateValue(value);
    }
  }

  class WebGL2KernelValueSingleArray2 extends WebGLKernelValueSingleArray2 {}

  class WebGL2KernelValueSingleArray3 extends WebGLKernelValueSingleArray3 {}

  class WebGL2KernelValueSingleArray4 extends WebGLKernelValueSingleArray4 {}

  class WebGL2KernelValueUnsignedArray extends WebGLKernelValueUnsignedArray {
    getSource() {
      const variablePrecision = this.getVariablePrecisionString();
      return utils$1.linesToString([
        `uniform ${ variablePrecision } sampler2D ${this.id}`,
        `${ variablePrecision } ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
        `${ variablePrecision } ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
      ]);
    }
  }

  class WebGL2KernelValueDynamicUnsignedArray extends WebGLKernelValueDynamicUnsignedArray {
    getSource() {
      const variablePrecision = this.getVariablePrecisionString();
      return utils$1.linesToString([
        `uniform ${ variablePrecision } sampler2D ${this.id}`,
        `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
        `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
      ]);
    }
  }

  const kernelValueMaps$1 = {
    unsigned: {
      dynamic: {
        'Boolean': WebGL2KernelValueBoolean,
        'Integer': WebGL2KernelValueInteger,
        'Float': WebGL2KernelValueFloat,
        'Array': WebGL2KernelValueDynamicUnsignedArray,
        'Array(2)': false,
        'Array(3)': false,
        'Array(4)': false,
        'Array1D(2)': false,
        'Array1D(3)': false,
        'Array1D(4)': false,
        'Array2D(2)': false,
        'Array2D(3)': false,
        'Array2D(4)': false,
        'Array3D(2)': false,
        'Array3D(3)': false,
        'Array3D(4)': false,
        'Input': WebGL2KernelValueDynamicUnsignedInput,
        'NumberTexture': WebGL2KernelValueDynamicNumberTexture,
        'ArrayTexture(1)': WebGL2KernelValueDynamicNumberTexture,
        'ArrayTexture(2)': WebGL2KernelValueDynamicNumberTexture,
        'ArrayTexture(3)': WebGL2KernelValueDynamicNumberTexture,
        'ArrayTexture(4)': WebGL2KernelValueDynamicNumberTexture,
        'MemoryOptimizedNumberTexture': WebGL2KernelValueDynamicMemoryOptimizedNumberTexture,
        'HTMLImage': WebGL2KernelValueDynamicHTMLImage,
        'HTMLImageArray': WebGL2KernelValueDynamicHTMLImageArray,
        'HTMLVideo': WebGL2KernelValueDynamicHTMLVideo,
      },
      static: {
        'Boolean': WebGL2KernelValueBoolean,
        'Float': WebGL2KernelValueFloat,
        'Integer': WebGL2KernelValueInteger,
        'Array': WebGL2KernelValueUnsignedArray,
        'Array(2)': false,
        'Array(3)': false,
        'Array(4)': false,
        'Array1D(2)': false,
        'Array1D(3)': false,
        'Array1D(4)': false,
        'Array2D(2)': false,
        'Array2D(3)': false,
        'Array2D(4)': false,
        'Array3D(2)': false,
        'Array3D(3)': false,
        'Array3D(4)': false,
        'Input': WebGL2KernelValueUnsignedInput,
        'NumberTexture': WebGL2KernelValueNumberTexture,
        'ArrayTexture(1)': WebGL2KernelValueNumberTexture,
        'ArrayTexture(2)': WebGL2KernelValueNumberTexture,
        'ArrayTexture(3)': WebGL2KernelValueNumberTexture,
        'ArrayTexture(4)': WebGL2KernelValueNumberTexture,
        'MemoryOptimizedNumberTexture': WebGL2KernelValueDynamicMemoryOptimizedNumberTexture,
        'HTMLImage': WebGL2KernelValueHTMLImage,
        'HTMLImageArray': WebGL2KernelValueHTMLImageArray,
        'HTMLVideo': WebGL2KernelValueHTMLVideo,
      }
    },
    single: {
      dynamic: {
        'Boolean': WebGL2KernelValueBoolean,
        'Integer': WebGL2KernelValueInteger,
        'Float': WebGL2KernelValueFloat,
        'Array': WebGL2KernelValueDynamicSingleArray,
        'Array(2)': WebGL2KernelValueSingleArray2,
        'Array(3)': WebGL2KernelValueSingleArray3,
        'Array(4)': WebGL2KernelValueSingleArray4,
        'Array1D(2)': WebGL2KernelValueDynamicSingleArray1DI,
        'Array1D(3)': WebGL2KernelValueDynamicSingleArray1DI,
        'Array1D(4)': WebGL2KernelValueDynamicSingleArray1DI,
        'Array2D(2)': WebGL2KernelValueDynamicSingleArray2DI,
        'Array2D(3)': WebGL2KernelValueDynamicSingleArray2DI,
        'Array2D(4)': WebGL2KernelValueDynamicSingleArray2DI,
        'Array3D(2)': WebGL2KernelValueDynamicSingleArray3DI,
        'Array3D(3)': WebGL2KernelValueDynamicSingleArray3DI,
        'Array3D(4)': WebGL2KernelValueDynamicSingleArray3DI,
        'Input': WebGL2KernelValueDynamicSingleInput,
        'NumberTexture': WebGL2KernelValueDynamicNumberTexture,
        'ArrayTexture(1)': WebGL2KernelValueDynamicNumberTexture,
        'ArrayTexture(2)': WebGL2KernelValueDynamicNumberTexture,
        'ArrayTexture(3)': WebGL2KernelValueDynamicNumberTexture,
        'ArrayTexture(4)': WebGL2KernelValueDynamicNumberTexture,
        'MemoryOptimizedNumberTexture': WebGL2KernelValueDynamicMemoryOptimizedNumberTexture,
        'HTMLImage': WebGL2KernelValueDynamicHTMLImage,
        'HTMLImageArray': WebGL2KernelValueDynamicHTMLImageArray,
        'HTMLVideo': WebGL2KernelValueDynamicHTMLVideo,
      },
      static: {
        'Boolean': WebGL2KernelValueBoolean,
        'Float': WebGL2KernelValueFloat,
        'Integer': WebGL2KernelValueInteger,
        'Array': WebGL2KernelValueSingleArray,
        'Array(2)': WebGL2KernelValueSingleArray2,
        'Array(3)': WebGL2KernelValueSingleArray3,
        'Array(4)': WebGL2KernelValueSingleArray4,
        'Array1D(2)': WebGL2KernelValueSingleArray1DI,
        'Array1D(3)': WebGL2KernelValueSingleArray1DI,
        'Array1D(4)': WebGL2KernelValueSingleArray1DI,
        'Array2D(2)': WebGL2KernelValueSingleArray2DI,
        'Array2D(3)': WebGL2KernelValueSingleArray2DI,
        'Array2D(4)': WebGL2KernelValueSingleArray2DI,
        'Array3D(2)': WebGL2KernelValueSingleArray3DI,
        'Array3D(3)': WebGL2KernelValueSingleArray3DI,
        'Array3D(4)': WebGL2KernelValueSingleArray3DI,
        'Input': WebGL2KernelValueSingleInput,
        'NumberTexture': WebGL2KernelValueNumberTexture,
        'ArrayTexture(1)': WebGL2KernelValueNumberTexture,
        'ArrayTexture(2)': WebGL2KernelValueNumberTexture,
        'ArrayTexture(3)': WebGL2KernelValueNumberTexture,
        'ArrayTexture(4)': WebGL2KernelValueNumberTexture,
        'MemoryOptimizedNumberTexture': WebGL2KernelValueMemoryOptimizedNumberTexture,
        'HTMLImage': WebGL2KernelValueHTMLImage,
        'HTMLImageArray': WebGL2KernelValueHTMLImageArray,
        'HTMLVideo': WebGL2KernelValueHTMLVideo,
      }
    },
  };
  function lookupKernelValueType$1(type, dynamic, precision, value) {
    if (!type) {
      throw new Error('type missing');
    }
    if (!dynamic) {
      throw new Error('dynamic missing');
    }
    if (!precision) {
      throw new Error('precision missing');
    }
    if (value.type) {
      type = value.type;
    }
    const types = kernelValueMaps$1[precision][dynamic];
    if (types[type] === false) {
      return null;
    } else if (types[type] === undefined) {
      throw new Error(`Could not find a KernelValue for ${ type }`);
    }
    return types[type];
  }

  let isSupported$1 = null;
  let testCanvas$1 = null;
  let testContext$1 = null;
  let testExtensions$1 = null;
  let features$1 = null;
  class WebGL2Kernel extends WebGLKernel {
    static get isSupported() {
      if (isSupported$1 !== null) {
        return isSupported$1;
      }
      this.setupFeatureChecks();
      isSupported$1 = this.isContextMatch(testContext$1);
      return isSupported$1;
    }
    static setupFeatureChecks() {
      if (typeof document !== 'undefined') {
        testCanvas$1 = document.createElement('canvas');
      } else if (typeof OffscreenCanvas !== 'undefined') {
        testCanvas$1 = new OffscreenCanvas(0, 0);
      }
      if (!testCanvas$1) return;
      testContext$1 = testCanvas$1.getContext('webgl2');
      if (!testContext$1 || !testContext$1.getExtension) return;
      testExtensions$1 = {
        EXT_color_buffer_float: testContext$1.getExtension('EXT_color_buffer_float'),
        OES_texture_float_linear: testContext$1.getExtension('OES_texture_float_linear'),
      };
      features$1 = this.getFeatures();
    }
    static isContextMatch(context) {
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
        maxTextureSize: this.getMaxTextureSize(),
      });
    }
    static getIsTextureFloat() {
      return true;
    }
    static getIsIntegerDivisionAccurate() {
      return super.getIsIntegerDivisionAccurate();
    }
    static getChannelCount() {
      return testContext$1.getParameter(testContext$1.MAX_DRAW_BUFFERS);
    }
    static getMaxTextureSize() {
      return testContext$1.getParameter(testContext$1.MAX_TEXTURE_SIZE);
    }
    static lookupKernelValueType(type, dynamic, precision, value) {
      return lookupKernelValueType$1(type, dynamic, precision, value);
    }
    static get testCanvas() {
      return testCanvas$1;
    }
    static get testContext() {
      return testContext$1;
    }
    static get features() {
      return features$1;
    }
    static get fragmentShader() {
      return fragmentShader$1;
    }
    static get vertexShader() {
      return vertexShader$1;
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
    validateSettings(args) {
      if (!this.validate) {
        this.texSize = utils$1.getKernelTextureSize({
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
        const argType = utils$1.getVariableType(args[0], this.strictIntegers);
        switch (argType) {
          case 'Array':
            this.output = utils$1.getDimensions(argType);
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
        this.texSize = utils$1.clone(this.output);
        return;
      } else if (!this.graphical && this.precision === null && features.isTextureFloat) {
        this.precision = 'single';
      }
      this.texSize = utils$1.getKernelTextureSize({
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
      const { kernelArguments, texSize, forceUploadKernelConstants } = this;
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
            case 'Array(3)':
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
        if (this.precision === 'single') {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
        } else {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        }
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i + 1, gl.TEXTURE_2D, texture, 0);
      }
    }
    _getHeaderString() {
      return '';
    }
    _getTextureCoordinate() {
      const subKernels = this.subKernels;
      if (subKernels === null || subKernels.length < 1) {
        switch (this.tactic) {
          case 'speed':
            return 'in lowp vec2 vTexCoord;\n';
          case 'performance':
            return 'in highp vec2 vTexCoord;\n';
          case 'balanced':
          default:
            return 'in mediump vec2 vTexCoord;\n';
        }
      } else {
        switch (this.tactic) {
          case 'speed':
            return 'out lowp vec2 vTexCoord;\n';
          case 'performance':
            return 'out highp vec2 vTexCoord;\n';
          case 'balanced':
          default:
            return 'out mediump vec2 vTexCoord;\n';
        }
      }
    }
    _getMainArgumentsString(args) {
      const result = [];
      const argumentNames = this.argumentNames;
      for (let i = 0; i < argumentNames.length; i++) {
        result.push(this.kernelArguments[i].getSource(args[i]));
      }
      return result.join('');
    }
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
      return utils$1.linesToString(result) + this.translatedSource;
    }
    getMainResultGraphical() {
      return utils$1.linesToString([
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
    getMainResultKernelPackedPixels() {
      return utils$1.linesToString([
        '  threadId = indexTo3D(index, uOutputDim)',
        '  kernel()',
        `  data0 = ${this.useLegacyEncoder ? 'legacyEncode32' : 'encode32'}(kernelResult)`
      ]);
    }
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
      return utils$1.linesToString(result);
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
      return utils$1.linesToString(result);
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
    toJSON() {
      const json = super.toJSON();
      json.functionNodes = FunctionBuilder.fromKernel(this, WebGL2FunctionNode).toJSON();
      return json;
    }
  }

  function kernelRunShortcut(kernel) {
    let run = function() {
      kernel.build.apply(kernel, arguments);
      if (kernel.renderKernels) {
        run = function() {
          kernel.run.apply(kernel, arguments);
          if (kernel.switchingKernels) {
            kernel.switchingKernels = false;
            return kernel.onRequestSwitchKernel(arguments, kernel);
          }
          return kernel.renderKernels();
        };
      } else if (kernel.renderOutput) {
        run = function() {
          kernel.run.apply(kernel, arguments);
          if (kernel.switchingKernels) {
            kernel.switchingKernels = false;
            return kernel.onRequestSwitchKernel(arguments, kernel);
          }
          return kernel.renderOutput();
        };
      } else {
        run = function() {
          return kernel.run.apply(kernel, arguments);
        };
      }
      return run.apply(kernel, arguments);
    };
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
      shortcut.kernel = kernel;
    };
    bindKernelToShortcut(kernel, shortcut);
    shortcut.kernel = kernel;
    return shortcut;
  }
  function bindKernelToShortcut(kernel, shortcut) {
    const properties = utils$1.allPropertiesOf(kernel);
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      if (property[0] === '_' && property[1] === '_') continue;
      if (typeof kernel[property] === 'function') {
        if (property.substring(0, 3) === 'add' || property.substring(0, 3) === 'set') {
          shortcut[property] = function() {
            kernel[property].apply(kernel, arguments);
            return shortcut;
          };
        } else {
          if (property === 'toString') {
            shortcut.toString = function() {
              return kernel.toString.apply(kernel, arguments);
            };
          } else {
            shortcut[property] = kernel[property].bind(kernel);
          }
        }
      } else {
        shortcut.__defineGetter__(property, () => {
          return kernel[property];
        });
        shortcut.__defineSetter__(property, (value) => {
          kernel[property] = value;
        });
      }
    }
  }

  const kernelOrder = [ WebGL2Kernel, WebGLKernel ];
  const kernelTypes = [ 'gpu', 'cpu' ];
  const internalKernels = {
    'webgl2': WebGL2Kernel,
    'webgl': WebGLKernel,
  };
  let validate = true;
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
    static get isKernelMapSupported() {
      return kernelOrder.some(Kernel => Kernel.isSupported && Kernel.features.kernelMap);
    }
    static get isOffscreenCanvasSupported() {
      return (typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined') || typeof importScripts !== 'undefined';
    }
    static get isWebGLSupported() {
      return WebGLKernel.isSupported;
    }
    static get isWebGL2Supported() {
      return WebGL2Kernel.isSupported;
    }
    static get isHeadlessGLSupported() {
      return false;
    }
    static get isCanvasSupported() {
      return typeof HTMLCanvasElement !== 'undefined';
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
      this.kernels = [];
      this.functions = [];
      this.nativeFunctions = [];
      this.injectedNative = null;
      if (this.mode === 'dev') return;
      this.chooseKernel();
      if (settings.functions) {
        for (let i = 0; i < settings.functions.length; i++) {
          this.addFunction(settings.functions[i]);
        }
      }
      if (settings.nativeFunctions) {
        for (const p in settings.nativeFunctions) {
          this.addNativeFunction(p, settings.nativeFunctions[p]);
        }
      }
    }
    getValidate() {
      return validate;
    }
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
    createKernel(source, settings) {
      if (typeof source === 'undefined') {
        throw new Error('Missing source parameter');
      }
      if (typeof source !== 'object' && !isFunction(source) && typeof source !== 'string') {
        throw new Error('source parameter not a function');
      }
      if (this.mode === 'dev') {
        const devKernel = gpuMock_js_1(source, upgradeDeprecatedCreateKernelSettings(settings));
        this.kernels.push(devKernel);
        return devKernel;
      }
      source = typeof source === 'function' ? source.toString() : source;
      const switchableKernels = {};
      const settingsCopy = upgradeDeprecatedCreateKernelSettings(settings) || {};
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
                argumentTypes[i] = getVariableType(arg);
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
      if (!this.canvas) {
        this.canvas = kernelRun.canvas;
      }
      if (!this.context) {
        this.context = kernelRun.context;
      }
      this.kernels.push(kernelRun);
      return kernelRun;
    }
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
      if (settings && typeof settings.argumentTypes === 'object') {
        settingsCopy.argumentTypes = Object.keys(settings.argumentTypes).map(argumentName => settings.argumentTypes[argumentName]);
      }
      if (Array.isArray(arguments[0])) {
        settingsCopy.subKernels = [];
        const functions = arguments[0];
        for (let i = 0; i < functions.length; i++) {
          const source = functions[i].toString();
          const name = getFunctionNameFromString(source);
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
          const name = getFunctionNameFromString(source);
          settingsCopy.subKernels.push({
            name: name || p,
            source,
            property: p,
          });
        }
      }
      const kernel = this.createKernel(fn, settingsCopy);
      return kernel;
    }
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
    addFunction(source, settings) {
      this.functions.push(functionToIFunction(source, settings));
      return this;
    }
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
    injectNative(source) {
      this.injectedNative = source;
      return this;
    }
    destroy() {
      if (!this.kernels) return;
      setTimeout(() => {
        for (let i = 0; i < this.kernels.length; i++) {
          this.kernels[i].destroy(true);
        }
        let firstKernel = this.kernels[0];
        if (firstKernel) {
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
      warnDeprecated('setting', 'floatOutput', 'precision');
      upgradedSettings.precision = settings.floatOutput ? 'single' : 'unsigned';
    }
    if (settings.hasOwnProperty('outputToTexture')) {
      warnDeprecated('setting', 'outputToTexture', 'pipeline');
      upgradedSettings.pipeline = Boolean(settings.outputToTexture);
    }
    if (settings.hasOwnProperty('outputImmutable')) {
      warnDeprecated('setting', 'outputImmutable', 'immutable');
      upgradedSettings.immutable = Boolean(settings.outputImmutable);
    }
    if (settings.hasOwnProperty('floatTextures')) {
      warnDeprecated('setting', 'floatTextures', 'optimizeFloatMemory');
      upgradedSettings.optimizeFloatMemory = Boolean(settings.floatTextures);
    }
    return upgradedSettings;
  }

  function alias(name, source) {
    const fnString = source.toString();
    return new Function(`return function ${ name } (${ utils$1.getArgumentNamesFromString(fnString).join(', ') }) {
  ${ utils$1.getFunctionBodyFromString(fnString) }
}`)();
  }

  class HeadlessGLKernel extends WebGLKernel {
    static get isSupported() { return false }
    static isContextMatch() { return false }
    static getIsTextureFloat() { return false }
    static getIsDrawBuffers() { return false }
    static getChannelCount() { return 1 }
    static get testCanvas() { return null }
    static get testContext() { return null }
    static get features() { return null }
    static setupFeatureChecks() {}
    static destroyContext() {}
    initCanvas() { return {} }
    initContext() { return null }
    toString() { return '' }
    initExtensions() {}
    build() {}
    destroyExtensions() {}
    setOutput() {}
    static getFeatures() {
      return Object.freeze({
        isFloatRead: false,
        isIntegerDivisionAccurate: false,
        isTextureFloat: false,
        isDrawBuffers: false,
        kernelMap: false,
        channelCount: 1,
      });
    }
  }const lib = GPU;
  lib.alias = alias;
  lib.CPUFunctionNode = CPUFunctionNode;
  lib.CPUKernel = CPUKernel;
  lib.FunctionBuilder = FunctionBuilder;
  lib.FunctionNode = FunctionNode;
  lib.HeadlessGLKernel = HeadlessGLKernel;
  lib.Input = Input;
  lib.input = input;
  lib.Texture = Texture;
  lib.utils = { ...common, ...utils$1 };
  lib.WebGL2FunctionNode = WebGL2FunctionNode;
  lib.WebGL2Kernel = WebGL2Kernel;
  lib.WebGLFunctionNode = WebGLFunctionNode;
  lib.WebGLKernel = WebGLKernel;
  lib.GLKernel = GLKernel;
  lib.Kernel = Kernel;

  return lib;

}(acorn));
//# sourceMappingURL=gpu-browser-core.js.map
