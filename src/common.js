/**
 * @fileoverview Branch of utils to prevent circular dependencies.
 */

const ARGUMENT_NAMES = /([^\s,]+)/g;
const FUNCTION_NAME = /function ([^(]*)/;
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

/**
 * @descReturn TRUE, on a JS function
 * @param {Function} funcObj - Object to validate if its a function
 * @returns  {Boolean} TRUE if the object is a JS function
 */
export function isFunction(funcObj) {
  return typeof(funcObj) === 'function';
};

/**
 * @desc Return the function name from a JS function string
 * @param {String} funcStr - String of JS function to validate
 * @returns {String} Function name string (if found)
 */
export function getFunctionNameFromString(funcStr) {
  return FUNCTION_NAME.exec(funcStr)[1].trim();
};

/**
 *
 * @param {String|Function} source
 * @param {IFunctionSettings} [settings]
 * @returns {IFunction}
 */
export function functionToIFunction(source, settings) {
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
};

export function warnDeprecated(type, oldName, newName) {
  const msg = newName
    ? `It has been replaced with "${ newName }"`
    : 'It has been removed';
  console.warn(`You are using a deprecated ${ type } "${ oldName }". ${msg}. Fixing, but please upgrade as it will soon be removed.`)
};

/**
 * @desc Return TRUE, on a valid JS function string
 * Note: This does just a VERY simply sanity check. And may give false positives.
 *
 * @param {String} fn - String of JS function to validate
 * @returns {Boolean} TRUE if the string passes basic validation
 */
export function isFunctionString(fn) {
  if (typeof fn === 'string') {
    return (fn
      .slice(0, 'function'.length)
      .toLowerCase() === 'function');
  }
  return false;
};

/**
 * @desc Return list of argument names extracted from a javascript function
 * @param {String} fn - String of JS function to validate
 * @returns {String[]}  Array representing all the parameter names
 */
export function getArgumentNamesFromString(fn) {
  const fnStr = fn.replace(STRIP_COMMENTS, '');
  let result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
  if (result === null) {
    result = [];
  }
  return result;
};

/**
 * @desc Checks if is an array or Array-like object
 * @param {Object} array - The argument object to check if is array
 * @returns {Boolean}  true if is array or Array-like object
 */
export function isArray(array) {
  return !isNaN(array.length);
};

export function erectMemoryOptimized2DFloat(array, width, height) {
  const yResults = new Array(height);
  for (let y = 0; y < height; y++) {
    const offset = y * width;
    yResults[y] = array.subarray(offset, offset + width);
  }
  return yResults;
};

export function erectMemoryOptimized3DFloat(array, width, height, depth) {
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
};

export function getAstString(source, ast) {
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
};
