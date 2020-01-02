const acorn = require('acorn');
const { Input } = require('./input');
const { Texture } = require('./texture');

const FUNCTION_NAME = /function ([^(]*)/;
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;

/**
 *
 * @desc Various utility functions / snippets of code that GPU.JS uses internally.
 * @type {utils}
 * This covers various snippets of code that is not entirely gpu.js specific (ie. may find uses elsewhere)
 */
const utils = {
  /**
   *
   * @desc Gets the system endianness, and cache it
   * @returns {String} 'LE' or 'BE' depending on system architecture
   * Credit: https://gist.github.com/TooTallNate/4750953
   */
  systemEndianness() {
    return _systemEndianness;
  },
  getSystemEndianness() {
    const b = new ArrayBuffer(4);
    const a = new Uint32Array(b);
    const c = new Uint8Array(b);
    a[0] = 0xdeadbeef;
    if (c[0] === 0xef) return 'LE';
    if (c[0] === 0xde) return 'BE';
    throw new Error('unknown endianness');
  },

  /**
   * @descReturn TRUE, on a JS function
   * @param {Function} funcObj - Object to validate if its a function
   * @returns  {Boolean} TRUE if the object is a JS function
   */
  isFunction(funcObj) {
    return typeof(funcObj) === 'function';
  },

  /**
   * @desc Return TRUE, on a valid JS function string
   * Note: This does just a VERY simply sanity check. And may give false positives.
   *
   * @param {String} fn - String of JS function to validate
   * @returns {Boolean} TRUE if the string passes basic validation
   */
  isFunctionString(fn) {
    if (typeof fn === 'string') {
      return (fn
        .slice(0, 'function'.length)
        .toLowerCase() === 'function');
    }
    return false;
  },

  /**
   * @desc Return the function name from a JS function string
   * @param {String} funcStr - String of JS function to validate
   * @returns {String} Function name string (if found)
   */
  getFunctionNameFromString(funcStr) {
    return FUNCTION_NAME.exec(funcStr)[1].trim();
  },

  getFunctionBodyFromString(funcStr) {
    return funcStr.substring(funcStr.indexOf('{') + 1, funcStr.lastIndexOf('}'));
  },

  /**
   * @desc Return list of argument names extracted from a javascript function
   * @param {String} fn - String of JS function to validate
   * @returns {String[]}  Array representing all the parameter names
   */
  getArgumentNamesFromString(fn) {
    const fnStr = fn.replace(STRIP_COMMENTS, '');
    let result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    if (result === null) {
      result = [];
    }
    return result;
  },

  /**
   * @desc Returns a clone
   * @param {Object} obj - Object to clone
   * @returns {Object|Array} Cloned object
   */
  clone(obj) {
    if (obj === null || typeof obj !== 'object' || obj.hasOwnProperty('isActiveClone')) return obj;

    const temp = obj.constructor(); // changed

    for (let key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        obj.isActiveClone = null;
        temp[key] = utils.clone(obj[key]);
        delete obj.isActiveClone;
      }
    }

    return temp;
  },

  /**
   * @desc Checks if is an array or Array-like object
   * @param {Object} array - The argument object to check if is array
   * @returns {Boolean}  true if is array or Array-like object
   */
  isArray(array) {
    return !isNaN(array.length);
  },

  /**
   * @desc Evaluate the argument type, to apply respective logic for it
   * @param {Object} value - The argument object to evaluate type
   * @returns {String}  Argument type Array/Number/Float/Texture/Unknown
   */
  getVariableType(value, strictIntegers) {
    if (utils.isArray(value)) {
      if (value.length > 0 && value[0].nodeName === 'IMG') {
        return 'HTMLImageArray';
      }
      return 'Array';
    }

    switch (value.constructor) {
      case Boolean:
        return 'Boolean';
      case Number:
        if (strictIntegers && Number.isInteger(value)) {
          return 'Integer';
        }
        return 'Float';
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
    if (value.hasOwnProperty('type')) {
      return value.type;
    }
    return 'Unknown';
  },

  getKernelTextureSize(settings, dimensions) {
    let [w, h, d] = dimensions;
    let texelCount = (w || 1) * (h || 1) * (d || 1);

    if (settings.optimizeFloatMemory && settings.precision === 'single') {
      w = texelCount = Math.ceil(texelCount / 4);
    }
    // if given dimensions == a 2d image
    if (h > 1 && w * h === texelCount) {
      return new Int32Array([w, h]);
    }
    return utils.closestSquareDimensions(texelCount);
  },

  /**
   *
   * @param {Number} length
   * @returns {TextureDimensions}
   */
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

  /**
   * A texture takes up four
   * @param {OutputDimensions} dimensions
   * @param {Number} bitRatio
   * @returns {TextureDimensions}
   */
  getMemoryOptimizedFloatTextureSize(dimensions, bitRatio) {
    const totalArea = utils.roundTo((dimensions[0] || 1) * (dimensions[1] || 1) * (dimensions[2] || 1) * (dimensions[3] || 1), 4);
    const texelCount = totalArea / bitRatio;
    return utils.closestSquareDimensions(texelCount);
  },

  /**
   *
   * @param dimensions
   * @param bitRatio
   * @returns {*|TextureDimensions}
   */
  getMemoryOptimizedPackedTextureSize(dimensions, bitRatio) {
    const [w, h, d] = dimensions;
    const totalArea = utils.roundTo((w || 1) * (h || 1) * (d || 1), 4);
    const texelCount = totalArea / (4 / bitRatio);
    return utils.closestSquareDimensions(texelCount);
  },

  roundTo(n, d) {
    return Math.floor((n + d - 1) / d) * d;
  },
  /**
   * @desc Return the dimension of an array.
   * @param {Array|String|Texture|Input} x - The array
   * @param {Boolean} [pad] - To include padding in the dimension calculation
   * @returns {OutputDimensions}
   */
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

  /**
   * Puts a nested 2d array into a one-dimensional target array
   * @param {Array|*} array
   * @param {Float32Array|Float64Array} target
   */
  flatten2dArrayTo(array, target) {
    let offset = 0;
    for (let y = 0; y < array.length; y++) {
      target.set(array[y], offset);
      offset += array[y].length;
    }
  },

  /**
   * Puts a nested 3d array into a one-dimensional target array
   * @param {Array|*} array
   * @param {Float32Array|Float64Array} target
   */
  flatten3dArrayTo(array, target) {
    let offset = 0;
    for (let z = 0; z < array.length; z++) {
      for (let y = 0; y < array[z].length; y++) {
        target.set(array[z][y], offset);
        offset += array[z][y].length;
      }
    }
  },

  /**
   * Puts a nested 4d array into a one-dimensional target array
   * @param {Array|*} array
   * @param {Float32Array|Float64Array} target
   */
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

  /**
   * Puts a nested 1d, 2d, or 3d array into a one-dimensional target array
   * @param {Float32Array|Uint16Array|Uint8Array} array
   * @param {Float32Array} target
   */
  flattenTo(array, target) {
    if (utils.isArray(array[0])) {
      if (utils.isArray(array[0][0])) {
        if (utils.isArray(array[0][0][0])) {
          utils.flatten4dArrayTo(array, target);
        } else {
          utils.flatten3dArrayTo(array, target);
        }
      } else {
        utils.flatten2dArrayTo(array, target);
      }
    } else {
      target.set(array);
    }
  },

  /**
   *
   * @desc Splits an array into smaller arrays.
   * Number of elements in one small chunk is given by `part`
   *
   * @param {Number[]} array - The array to split into chunks
   * @param {Number} part - elements in one chunk
   *
   * @returns {Number[]} An array of smaller chunks
   */
  splitArray(array, part) {
    const result = [];
    for (let i = 0; i < array.length; i += part) {
      result.push(new array.constructor(array.buffer, i * 4 + array.byteOffset, part));
    }
    return result;
  },

  getAstString(source, ast) {
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
  },

  allPropertiesOf(obj) {
    const props = [];

    do {
      props.push.apply(props, Object.getOwnPropertyNames(obj));
    } while (obj = Object.getPrototypeOf(obj));

    return props;
  },

  /**
   * @param {Array} lines - An Array of strings
   * @returns {String} Single combined String, separated by *\n*
   */
  linesToString(lines) {
    if (lines.length > 0) {
      return lines.join(';\n') + ';\n';
    } else {
      return '\n';
    }
  },
  warnDeprecated(type, oldName, newName) {
    if (newName) {
      console.warn(`You are using a deprecated ${ type } "${ oldName }". It has been replaced with "${ newName }". Fixing, but please upgrade as it will soon be removed.`);
    } else {
      console.warn(`You are using a deprecated ${ type } "${ oldName }". It has been removed. Fixing, but please upgrade as it will soon be removed.`);
    }
  },
  /**
   *
   * @param {String|Function} source
   * @param {IFunctionSettings} [settings]
   * @returns {IFunction}
   */
  functionToIFunction(source, settings) {
    settings = settings || {};
    if (typeof source !== 'string' && typeof source !== 'function') throw new Error('source not a string or function');
    const sourceString = typeof source === 'string' ? source : source.toString();

    let argumentTypes = [];

    if (Array.isArray(settings.argumentTypes)) {
      argumentTypes = settings.argumentTypes;
    } else if (typeof settings.argumentTypes === 'object') {
      argumentTypes = utils.getArgumentNamesFromString(sourceString)
        .map(name => settings.argumentTypes[name]) || [];
    } else {
      argumentTypes = settings.argumentTypes || [];
    }

    return {
      source: sourceString,
      argumentTypes,
      returnType: settings.returnType || null,
    };
  },
  flipPixels: (pixels, width, height) => {
    // https://stackoverflow.com/a/41973289/1324039
    const halfHeight = height / 2 | 0; // the | 0 keeps the result an int
    const bytesPerRow = width * 4;
    // make a temp buffer to hold one row
    const temp = new Uint8ClampedArray(width * 4);
    const result = pixels.slice(0);
    for (let y = 0; y < halfHeight; ++y) {
      const topOffset = y * bytesPerRow;
      const bottomOffset = (height - y - 1) * bytesPerRow;

      // make copy of a row on the top half
      temp.set(result.subarray(topOffset, topOffset + bytesPerRow));

      // copy a row from the bottom half to the top
      result.copyWithin(topOffset, bottomOffset, bottomOffset + bytesPerRow);

      // copy the copy of the top half row to the bottom half
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
        const offset = (z * height * width) + (y * width);
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

  /**
   *
   * @param {String} source
   * @param {Object} settings
   * @return {String}
   */
  flattenFunctionToString: (source, settings) => {
    const { findDependency, thisLookup, doNotDefine } = settings;
    let flattened = settings.flattened;
    if (!flattened) {
      flattened = settings.flattened = {};
    }
    const ast = acorn.parse(source);
    const functionDependencies = [];
    let indent = 0;

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
          return flatten(ast.body) + (ast.body[0].type === 'VariableDeclaration' ? ';' : '');
        case 'FunctionDeclaration':
          return `function ${ast.id.name}(${ast.params.map(flatten).join(', ')}) ${ flatten(ast.body) }`;
        case 'BlockStatement': {
          const result = [];
          indent += 2;
          for (let i = 0; i < ast.body.length; i++) {
            const flat = flatten(ast.body[i]);
            if (flat) {
              result.push(' '.repeat(indent) + flat, ';\n');
            }
          }
          indent -= 2;
          return `{\n${result.join('')}}`;
        }
        case 'VariableDeclaration':
          const declarations = utils.normalizeDeclarations(ast)
            .map(flatten)
            .filter(r => r !== null);
          if (declarations.length < 1) {
            return '';
          } else {
            return `${ast.kind} ${declarations.join(',')}`;
          }
          case 'VariableDeclarator':
            if (ast.init.object && ast.init.object.type === 'ThisExpression') {
              const lookup = thisLookup(ast.init.property.name);
              if (lookup) {
                return `${ast.id.name} = ${flatten(ast.init)}`;
              } else {
                return null;
              }
            } else {
              return `${ast.id.name} = ${flatten(ast.init)}`;
            }
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
                  // we're not flattening it
                  return `${ast.callee.object.name}.${ast.callee.property.name}(${ast.arguments.map(value => flatten(value)).join(', ')})`;
                } else {
                  functionDependencies.push(foundSource);
                  // we're flattening it
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
                return `${flatten(ast.expression)}`;
              case 'SequenceExpression':
                return `(${flatten(ast.expressions)})`;
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
        flattenedFunctionDependencies.push(utils.flattenFunctionToString(functionDependency, settings) + '\n');
      }
      return flattenedFunctionDependencies.join('') + result;
    }
    return result;
  },

  normalizeDeclarations: (ast) => {
    if (ast.type !== 'VariableDeclaration') throw new Error('Ast is not of type "VariableDeclaration"');
    const normalizedDeclarations = [];
    for (let declarationIndex = 0; declarationIndex < ast.declarations.length; declarationIndex++) {
      const declaration = ast.declarations[declarationIndex];
      if (declaration.id && declaration.id.type === 'ObjectPattern' && declaration.id.properties) {
        const { properties } = declaration.id;
        for (let propertyIndex = 0; propertyIndex < properties.length; propertyIndex++) {
          const property = properties[propertyIndex];
          if (property.value.type === 'ObjectPattern' && property.value.properties) {
            for (let subPropertyIndex = 0; subPropertyIndex < property.value.properties.length; subPropertyIndex++) {
              const subProperty = property.value.properties[subPropertyIndex];
              if (subProperty.type === 'Property') {
                normalizedDeclarations.push({
                  type: 'VariableDeclarator',
                  id: {
                    type: 'Identifier',
                    name: subProperty.key.name
                  },
                  init: {
                    type: 'MemberExpression',
                    object: {
                      type: 'MemberExpression',
                      object: declaration.init,
                      property: {
                        type: 'Identifier',
                        name: property.key.name
                      },
                      computed: false
                    },
                    property: {
                      type: 'Identifier',
                      name: subProperty.key.name
                    },
                    computed: false
                  }
                });
              } else {
                throw new Error('unexpected state');
              }
            }
          } else if (property.value.type === 'Identifier') {
            normalizedDeclarations.push({
              type: 'VariableDeclarator',
              id: {
                type: 'Identifier',
                name: property.value && property.value.name ? property.value.name : property.key.name
              },
              init: {
                type: 'MemberExpression',
                object: declaration.init,
                property: {
                  type: 'Identifier',
                  name: property.key.name
                },
                computed: false
              }
            });
          } else {
            throw new Error('unexpected state');
          }
        }
      } else if (declaration.id && declaration.id.type === 'ArrayPattern' && declaration.id.elements) {
        const { elements } = declaration.id;
        for (let elementIndex = 0; elementIndex < elements.length; elementIndex++) {
          const element = elements[elementIndex];
          if (element.type === 'Identifier') {
            normalizedDeclarations.push({
              type: 'VariableDeclarator',
              id: {
                type: 'Identifier',
                name: element.name
              },
              init: {
                type: 'MemberExpression',
                object: declaration.init,
                property: {
                  type: 'Literal',
                  value: elementIndex,
                  raw: elementIndex.toString(),
                  start: element.start,
                  end: element.end
                },
                computed: true
              }
            });
          } else {
            throw new Error('unexpected state');
          }
        }
      } else {
        normalizedDeclarations.push(declaration);
      }
    }
    return normalizedDeclarations;
  },

  /**
   *
   * @param {GPU} gpu
   * @param image
   * @return {Array}
   */
  splitHTMLImageToRGB: (gpu, image) => {
    const rKernel = gpu.createKernel(function(a) {
      const pixel = a[this.thread.y][this.thread.x];
      return pixel.r * 255;
    }, {
      output: [image.width, image.height],
      precision: 'unsigned',
      argumentTypes: { a: 'HTMLImage' },
    });
    const gKernel = gpu.createKernel(function(a) {
      const pixel = a[this.thread.y][this.thread.x];
      return pixel.g * 255;
    }, {
      output: [image.width, image.height],
      precision: 'unsigned',
      argumentTypes: { a: 'HTMLImage' },
    });
    const bKernel = gpu.createKernel(function(a) {
      const pixel = a[this.thread.y][this.thread.x];
      return pixel.b * 255;
    }, {
      output: [image.width, image.height],
      precision: 'unsigned',
      argumentTypes: { a: 'HTMLImage' },
    });
    const aKernel = gpu.createKernel(function(a) {
      const pixel = a[this.thread.y][this.thread.x];
      return pixel.a * 255;
    }, {
      output: [image.width, image.height],
      precision: 'unsigned',
      argumentTypes: { a: 'HTMLImage' },
    });
    const result = [
      rKernel(image),
      gKernel(image),
      bKernel(image),
      aKernel(image),
    ];
    result.rKernel = rKernel;
    result.gKernel = gKernel;
    result.bKernel = bKernel;
    result.aKernel = aKernel;
    result.gpu = gpu;
    return result;
  },

  /**
   * A visual debug utility
   * @param {GPU} gpu
   * @param rgba
   * @param width
   * @param height
   * @return {Object[]}
   */
  splitRGBAToCanvases: (gpu, rgba, width, height) => {
    const visualKernelR = gpu.createKernel(function(v) {
      const pixel = v[this.thread.y][this.thread.x];
      this.color(pixel.r / 255, 0, 0, 255);
    }, {
      output: [width, height],
      graphical: true,
      argumentTypes: { v: 'Array2D(4)' }
    });
    visualKernelR(rgba);

    const visualKernelG = gpu.createKernel(function(v) {
      const pixel = v[this.thread.y][this.thread.x];
      this.color(0, pixel.g / 255, 0, 255);
    }, {
      output: [width, height],
      graphical: true,
      argumentTypes: { v: 'Array2D(4)' }
    });
    visualKernelG(rgba);

    const visualKernelB = gpu.createKernel(function(v) {
      const pixel = v[this.thread.y][this.thread.x];
      this.color(0, 0, pixel.b / 255, 255);
    }, {
      output: [width, height],
      graphical: true,
      argumentTypes: { v: 'Array2D(4)' }
    });
    visualKernelB(rgba);

    const visualKernelA = gpu.createKernel(function(v) {
      const pixel = v[this.thread.y][this.thread.x];
      this.color(255, 255, 255, pixel.a / 255);
    }, {
      output: [width, height],
      graphical: true,
      argumentTypes: { v: 'Array2D(4)' }
    });
    visualKernelA(rgba);
    return [
      visualKernelR.canvas,
      visualKernelG.canvas,
      visualKernelB.canvas,
      visualKernelA.canvas,
    ];
  },

  getMinifySafeName: (fn) => {
    try {
      const ast = acorn.parse(`const value = ${fn.toString()}`);
      const { init } = ast.body[0].declarations[0];
      return init.body.name || init.body.body[0].argument.name;
    } catch (e) {
      throw new Error('Unrecognized function type.  Please use `() => yourFunctionVariableHere` or function() { return yourFunctionVariableHere; }');
    }
  }
};

const _systemEndianness = utils.getSystemEndianness();

module.exports = {
  utils
};