'use strict';

/**
 * 
 * @classdesc Various utility functions / snippets of code that GPU.JS uses internally.\
 * This covers various snippets of code that is not entirely gpu.js specific (ie. may find uses elsewhere)
 *
 * Note that all methods in this class are *static* by nature `Utils.functionName()`
 * 
 * @class Utils
 * @extends UtilsCore
 *
 */

const UtilsCore = require("./utils-core");
const Input = require('./input');
const Texture = require('./texture');
// FUNCTION_NAME regex
const FUNCTION_NAME = /function ([^(]*)/;

// STRIP COMMENTS regex
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

// ARGUMENT NAMES regex
const ARGUMENT_NAMES = /([^\s,]+)/g;

const _systemEndianness = (() => {
	const b = new ArrayBuffer(4);
	const a = new Uint32Array(b);
	const c = new Uint8Array(b);
	a[0] = 0xdeadbeef;
	if (c[0] === 0xef) return 'LE';
	if (c[0] === 0xde) return 'BE';
	throw new Error('unknown endianness');
})();

let _isFloatReadPixelsSupported = null;
let _isFloatReadPixelsSupportedWebGL2 = null;

let _isMixedIdentifiersSupported = (() => {
	try {
		(new Function('let i = 1; const j = 1;'))();
		return true;
	} catch (e) {
		return false;
	}
})();

let _hasIntegerDivisionAccuracyBug = null;

/**
 * @class
 * @extends UtilsCore
 */
class Utils extends UtilsCore {

	//-----------------------------------------------------------------------------
	//
	//  System values support (currently only endianness)
	//
	//-----------------------------------------------------------------------------

	/**
	 * @memberOf Utils
	 * @name systemEndianness
	 * @function
	 * @static
	 *
	 * Gets the system endianness, and cache it
	 *
	 * @returns {String} 'LE' or 'BE' depending on system architecture
	 *
	 * Credit: https://gist.github.com/TooTallNate/4750953
	 */
	static systemEndianness() {
		return _systemEndianness;
	}

	//-----------------------------------------------------------------------------
	//
	//  Function and function string validations
	//
	//-----------------------------------------------------------------------------

	/**
	 * @memberOf Utils
	 * @name isFunction
	 * @function
	 * @static
	 *
	 * Return TRUE, on a JS function
	 *
	 * @param {Function} funcObj - Object to validate if its a function
	 *
	 * @returns	{Boolean} TRUE if the object is a JS function
	 *
	 */
	static isFunction(funcObj) {
		return typeof(funcObj) === 'function';
	}

	/**
	 * @memberOf Utils
	 * @name isFunctionString
	 * @function
	 * @static
	 *
	 * Return TRUE, on a valid JS function string
	 *
	 * Note: This does just a VERY simply sanity check. And may give false positives.
	 *
	 * @param {String} funcStr - String of JS function to validate
	 *
	 * @returns {Boolean} TRUE if the string passes basic validation
	 *
	 */
	static isFunctionString(funcStr) {
		if (funcStr !== null) {
			return (funcStr.toString()
				.slice(0, 'function'.length)
				.toLowerCase() === 'function');
		}
		return false;
	}

	/**
	 * @memberOf Utils
	 * @name getFunctionName_fromString
	 * @function
	 * @static
	 *
	 * Return the function name from a JS function string
	 *
	 * @param {String} funcStr - String of JS function to validate
	 *
	 * @returns {String} Function name string (if found)
	 *
	 */
	static getFunctionNameFromString(funcStr) {
		return FUNCTION_NAME.exec(funcStr)[1];
	}

	static getFunctionBodyFromString(funcStr) {
		return funcStr.substring(funcStr.indexOf('{') + 1, funcStr.lastIndexOf('}'));
	}

	/**
	 * @memberOf Utils
	 * @name getParamNames_fromString
	 * @function
	 * @static
	 *
	 * Return list of parameter names extracted from the JS function string
	 *
	 * @param {String} funcStr - String of JS function to validate
	 *
	 * @returns {String[]}  Array representing all the parameter names
	 *
	 */
	static getParamNamesFromString(func) {
		const fnStr = func.toString().replace(STRIP_COMMENTS, '');
		let result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
		if (result === null)
			result = [];
		return result;
	}

	//-----------------------------------------------------------------------------
	//
	//  Object / function cloning and manipulation
	//
	//-----------------------------------------------------------------------------

	/**
	 * @memberOf Utils
	 * @name clone
	 * @function
	 * @static
	 *
	 * Returns a clone
	 *
	 * @param {Object} obj - Object to clone
	 *
	 * @returns {Object}  Cloned object
	 *
	 */
	static clone(obj) {
		if (obj === null || typeof obj !== 'object' || obj.hasOwnProperty('isActiveClone')) return obj;

		const temp = obj.constructor(); // changed

		for (let key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				obj.isActiveClone = null;
				temp[key] = Utils.clone(obj[key]);
				delete obj.isActiveClone;
			}
		}

		return temp;
	}

	/**
	 * @memberOf Utils
	 * @name newPromise
	 * @function
	 * @static
	 *
	 * Returns a `new Promise` object based on the underlying implmentation
	 *
	 * @param {Function} executor - Promise builder function
	 *
	 * @returns {Promise}  Promise object
	 *
	 */
	static newPromise(executor) {
		const simple = Promise || small_promise;
		if (simple === null) {
			throw TypeError('Browser is missing Promise implementation. Consider adding small_promise.js polyfill');
		}
		return (new simple(executor));
	}

	/**
	 * @memberOf Utils
	 * @name functionBinder
	 * @function
	 * @static
	 *
	 * Limited implementation of Function.bind, with fallback
	 *
	 * @param {Function} inFunc - to setup bind on
	 * @param {Object} thisObj - The this parameter to assume inside the binded function
	 *
	 * @returns {Function}  The binded function
	 *
	 */
	static functionBinder(inFunc, thisObj) {
		if (inFunc.bind) {
			return inFunc.bind(thisObj);
		}

		return function() {
			const args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments));
			return inFunc.apply(thisObj, args);
		}
	}

	/**
	 * @memberOf Utils
	 * @name isArray
	 * @function
	 * @static
	 *
	 * * Checks if is an array or Array-like object
	 *
	 * @param {Object} arg - The argument object to check if is array
	 *
	 * @returns {Boolean}  true if is array or Array-like object
	 *
	 */
	static isArray(array) {
		if (isNaN(array.length)) {
			return false;
		}

		return true;
	}

	/**
	 * @memberOf Utils
	 * @name getArgumentType
	 * @function
	 * @static
	 *
	 * Evaluate the argument type, to apply respective logic for it
	 *
	 * @param {Object} arg - The argument object to evaluate type
	 *
	 * @returns {String}  Argument type Array/Number/Float/Texture/Unknown
	 *
	 */
	static getArgumentType(arg) {
		if (Utils.isArray(arg)) {
			if (arg[0].nodeName === 'IMG') {
				return 'HTMLImageArray';
			}
			return 'Array';
		} else if (typeof arg === 'number') {
			if (Number.isInteger(arg)) {
				return 'Integer';
			}
			return 'Float';
		} else if (arg instanceof Texture) {
			return 'Texture';
		} else if (arg instanceof Input) {
			return 'Input';
		} else if (arg.nodeName === 'IMG') {
			return 'HTMLImage';
		} else {
			return 'Unknown';
		}
	}
	/**
	 * @typedef {Object} gpuJSObject
	 */

	/**
	 * @memberOf Utils
	 * @name isFloatReadPixelsSupported
	 * @function
	 * @static
	 *
	 * Checks if the browser supports readPixels with float type
	 *
	 * @returns {Boolean} true if browser supports
	 *
	 */
	static isFloatReadPixelsSupported() {
		if (_isFloatReadPixelsSupported !== null) {
			return _isFloatReadPixelsSupported
		}

		const GPU = require('../index');
		const gpu = new GPU({
			mode: 'webgl-validator'
		});
		const x = gpu.createKernel(function() {
			return 1;
		}, {
			output: [2],
			floatTextures: true,
			floatOutput: true,
			floatOutputForce: true
		})();

		_isFloatReadPixelsSupported = x[0] === 1;
		gpu.destroy();
		return _isFloatReadPixelsSupported;
	}

	/**
	 * @memberOf Utils
	 * @name isFloatReadPixelsSupportedWebGL2
	 * @function
	 * @static
	 *
	 * Checks if the browser supports readPixels with float type
	 *
	 * @returns {Boolean} true if browser supports
	 *
	 */
	static isFloatReadPixelsSupportedWebGL2() {
		if (_isFloatReadPixelsSupportedWebGL2 !== null) {
			return _isFloatReadPixelsSupportedWebGL2
		}

		const GPU = require('../index');
		const gpu = new GPU({
			mode: 'webgl2-validator'
		});
		const x = gpu.createKernel(function() {
			return 1;
		}, {
			output: [2],
			floatTextures: true,
			floatOutput: true,
			floatOutputForce: true
		})();

		_isFloatReadPixelsSupportedWebGL2 = x[0] === 1;
		gpu.destroy();
		return _isFloatReadPixelsSupportedWebGL2;
	}

	/**
	 * @memberOf Utils
	 * @name hasIntegerDivisionAccuracyBug
	 * @function
	 * @static
	 *
	 * Checks if the system has inaccuracies when dividing integers
	 *
	 * @returns {Boolean} true if bug is exhibited on this system
	 *
	 */
	static hasIntegerDivisionAccuracyBug() {
		if (_hasIntegerDivisionAccuracyBug !== null) {
			return _hasIntegerDivisionAccuracyBug
		}

		const GPU = require('../index');
		const gpu = new GPU({
			mode: 'webgl-validator'
		});
		const x = gpu.createKernel(function(v1, v2) {
			return v1[this.thread.x] / v2[this.thread.x];
		}, {
			output: [1]
		})([6, 6030401], [3, 3991]);

		// have we not got whole numbers for 6/3 or 6030401/3991
		// add more here if others see this problem
		_hasIntegerDivisionAccuracyBug = (x[0] !== 2 || x[1] !== 1511);
		gpu.destroy();
		return _hasIntegerDivisionAccuracyBug;
	}

	static isMixedIdentifiersSupported() {
		return _isMixedIdentifiersSupported;
	}

	static dimToTexSize(opt, dimensions, output) {
		let numTexels = dimensions[0];
		let w = dimensions[0];
		let h = dimensions[1];
		for (let i = 1; i < dimensions.length; i++) {
			numTexels *= dimensions[i];
		}

		if (opt.floatTextures && (!output || opt.floatOutput)) {
			w = numTexels = Math.ceil(numTexels / 4);
		}
		// if given dimensions == a 2d image
		if (h > 1 && w * h === numTexels) {
			return [w, h];
		}
		// find as close to square width, height sizes as possible
		const sqrt = Math.sqrt(numTexels);
		let high = Math.ceil(sqrt);
		let low = Math.floor(sqrt);
		while (high * low > numTexels) {
			high--;
			low = Math.ceil(numTexels / high);
		}
		w = low;
		h = Math.ceil(numTexels / w);
		return [w, h];
	}

	/**
	 * @memberOf Utils
	 * @name getDimensions
	 * @function
	 * @static
	 *
	 * Return the dimension of an array.
	 * 
	 * @param {Array|String} x - The array
	 * @param {number} [pad] - To include padding in the dimension calculation [Optional]
	 *
	 *
	 *
	 */

	static getDimensions(x, pad) {
		let ret;
		if (Utils.isArray(x)) {
			const dim = [];
			let temp = x;
			while (Utils.isArray(temp)) {
				dim.push(temp.length);
				temp = temp[0];
			}
			ret = dim.reverse();
		} else if (x instanceof Texture) {
			ret = x.output;
		} else if (x instanceof Input) {
			ret = x.size;
		} else {
			throw 'Unknown dimensions of ' + x;
		}

		if (pad) {
			ret = Utils.clone(ret);
			while (ret.length < 3) {
				ret.push(1);
			}
		}
		// return ret;
		return new Int32Array(ret);
	}

	/**
	 * @memberOf Utils
	 * @name pad
	 * @function
	 * @static
	 *
	 * Pad an array AND its elements with leading and ending zeros
	 *
	 * @param {Array} arr - the array to pad zeros to
	 * @param {number} padding - amount of padding
	 *
	 * @returns {Array} Array with leading and ending zeros, and all the elements padded by zeros.
	 *
	 */
	static pad(arr, padding) {
		function zeros(n) {
			return Array.apply(null, new Array(n)).map(Number.prototype.valueOf, 0);
		}

		const len = arr.length + padding * 2;

		let ret = arr.map(function(x) {
			return [].concat(zeros(padding), x, zeros(padding));
		});

		for (let i = 0; i < padding; i++) {
			ret = [].concat([zeros(len)], ret, [zeros(len)]);
		}

		return ret;
	}

	/**
	 * @memberOf Utils
	 * @name flatten2dArrayTo
	 * @function
	 * @static
	 *
	 * Puts a nested 2d array into a one-dimensional target array
	 * @param {Array|*} array
	 * @param {Float32Array|Float64Array} target
	 */
	static flatten2dArrayTo(array, target) {
		let offset = 0;
		for (let y = 0; y < array.length; y++) {
			target.set(array[y], offset);
			offset += array[y].length;
		}
	}

	/**
	 * @memberOf Utils
	 * @name flatten3dArrayTo
	 * @function
	 * @static
	 *
	 * Puts a nested 3d array into a one-dimensional target array
	 * @param {Array|*} array
	 * @param {Float32Array|Float64Array} target
	 */
	static flatten3dArrayTo(array, target) {
		let offset = 0;
		for (let z = 0; z < array.length; z++) {
			for (let y = 0; y < array[z].length; y++) {
				target.set(array[z][y], offset);
				offset += array[z][y].length;
			}
		}
	}

	/**
	 * @memberOf Utils
	 * @name flatten3dArrayTo
	 * @function
	 * @static
	 *
	 * Puts a nested 1d, 2d, or 3d array into a one-dimensional target array
	 * @param {Array|*} array
	 * @param {Float32Array|Float64Array} target
	 */
	static flattenTo(array, target) {
		if (Utils.isArray(array[0])) {
			if (Utils.isArray(array[0][0])) {
				Utils.flatten3dArrayTo(array, target);
			} else {
				Utils.flatten2dArrayTo(array, target);
			}
		} else {
			target.set(array);
		}
	}

	/**
	 * @memberOf Utils
	 * @name splitArray
	 * @function
	 * @static
	 *
	 * Splits an array into smaller arrays.
	 * Number of elements in one small chunk is given by `part`
	 *
	 * @param {Array} array - The array to split into chunks
	 * @param {Array} part - elements in one chunk
	 *

	 * @returns {Array} An array of smaller chunks
	 *
	 */
	static splitArray(array, part) {
		const result = [];
		for (let i = 0; i < array.length; i += part) {
			result.push(Array.prototype.slice.call(array, i, i + part));
		}
		return result;
	}

	static getAstString(source, ast) {
		let lines = Array.isArray(source) ? source : source.split(/\r?\n/g);
		const start = ast.loc.start;
		const end = ast.loc.end;
		const result = [];
		result.push(lines[start.line - 1].slice(start.column));
		for (let i = start.line; i < end.line - 1; i++) {
			result.push(lines[i]);
		}
		result.push(lines[end.line - 1].slice(0, end.column));
		return result.join('\n');
	}

	static allPropertiesOf(obj) {
		const props = [];

		do {
			props.push.apply(props, Object.getOwnPropertyNames(obj));
		} while (obj = Object.getPrototypeOf(obj));

		return props;
	}
}

// This ensure static methods are "inherited"
// See: https://stackoverflow.com/questions/5441508/how-to-inherit-static-methods-from-base-class-in-javascript
Object.assign(Utils, UtilsCore);

module.exports = Utils;