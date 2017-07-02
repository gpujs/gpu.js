/**
 * Class: Utils
 *
 * Various utility functions / snippets of code that GPU.JS uses internally.\
 * This covers various snippets of code that is not entirely gpu.js specific (ie. may find uses elsewhere)
 *
 * Note that all methods in this class is 'static' by nature `Utils.functionName()`
 *
 */
const UtilsCore = require("./utils-core");
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

class Utils extends UtilsCore {

	//-----------------------------------------------------------------------------
	//
	//  System values support (currently only endianness)
	//
	//-----------------------------------------------------------------------------

	/**
	 * Function: systemEndianness
	 *
	 * Gets the system endianness, and cache it
	 *
	 * Returns:
	 *	{String} 'LE' or 'BE' depending on system architecture
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
	 * Function: isFunction
	 *
	 * Return TRUE, on a JS function
	 *
	 * Parameters:
	 * 	funcObj - {JS Function} Object to validate if its a function
	 *
	 * Returns:
	 * 	{Boolean} TRUE if the object is a JS function
	 *
	 */
	static isFunction(funcObj) {
		return typeof(funcObj) === 'function';
	}

	/**
	 * Function: isFunctionString
	 *
	 * Return TRUE, on a valid JS function string
	 *
	 * Note: This does just a VERY simply sanity check. And may give false positives.
	 *
	 * Parameters:
	 * 	funcStr - {String}  String of JS function to validate
	 *
	 * Returns:
	 * 	{Boolean} TRUE if the string passes basic validation
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
	 * Function: getFunctionName_fromString
	 *
	 * Return the function name from a JS function string
	 *
	 * Parameters:
	 * 	funcStr - {String}  String of JS function to validate
	 *
	 * Returns:
	 * 	{String} Function name string (if found)
	 *
	 */
	static getFunctionNameFromString(funcStr) {
		return FUNCTION_NAME.exec(funcStr)[1];
	}

	static getFunctionBodyFromString(funcStr) {
		return funcStr.substring(funcStr.indexOf('{') + 1, funcStr.lastIndexOf('}'));
	}

	/**
	 * Function: getParamNames_fromString
	 *
	 * Return list of parameter names extracted from the JS function string
	 *
	 * Parameters:
	 * 	funcStr - {String}  String of JS function to validate
	 *
	 * Returns:
	 * 	{[String, ...]}  Array representing all the parameter names
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
	 * Function: newPromise
	 *
	 * Returns a `new Promise` object based on the underlying implmentation
	 *
	 * Parameters:
	 * 	executor - {function(resolve,reject)}  Promise builder function
	 *
	 * Returns:
	 * 	{Promise}  Promise object
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
	 * Function: functionBinder
	 *
	 * Limited implementation of Function.bind, with fallback
	 *
	 * Parameters:
	 * 	inFunc   - {JS Function}  to setup bind on
	 * 	thisObj  - {Object} The this parameter to assume inside the binded function
	 *
	 * Returns:
	 * 	{JS Function}  The binded function
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
	 * Function: isArray
	 *
	 * Checks if is an array or Array-like object
	 *
	 * Parameters:
	 * 	arg   - {Object} The argument object to check if is array
	 *
	 * Returns:
	 * 	{Boolean}  true if is array or Array-like object
	 *
	 */
	static isArray(arr) {
		const tag = Object.prototype.toString.call(arr);
		return tag.indexOf('Array]', tag.length - 6) !== -1;
	}

	/**
	 * Function: getArgumentType
	 *
	 * Evaluate the argument type, to apply respective logic for it
	 *
	 * Parameters:
	 * 	arg   - {Object} The argument object to evaluate type
	 *
	 * Returns:
	 * 	{String}  Argument type Array/Number/Texture/Unknown
	 *
	 */
	static getArgumentType(arg) {
		if (Utils.isArray(arg)) {
			return 'Array';
		} else if (typeof arg === 'number') {
			return 'Number';
		} else if (arg instanceof Texture) {
			return 'Texture';
		} else {
			return 'Unknown';
		}
	}

	/**
	 * Function: isFloatReadPixelsSupported
	 *
	 * Checks if the browser supports readPixels with float type
	 *
	 * Parameters:
	 * 	gpu - {gpu.js object} the gpu object
	 *
	 * Returns:
	 * 	{Boolean} true if browser supports
	 *
	 */
	static isFloatReadPixelsSupported() {
		if (_isFloatReadPixelsSupported !== null) {
			return _isFloatReadPixelsSupported
		}

		const GPU = require('../index');
		const x = new GPU({
			mode: 'webgl-validator'
		}).createKernel(function() {
			return 1;
		}, {
			dimensions: [2],
			floatTextures: true,
			floatOutput: true,
			floatOutputForce: true
		})();

		_isFloatReadPixelsSupported = x[0] === 1;

		return _isFloatReadPixelsSupported;
	}


	static dimToTexSize(opt, dimensions, output) {
		let numTexels = dimensions[0];
		for (let i = 1; i < dimensions.length; i++) {
			numTexels *= dimensions[i];
		}

		if (opt.floatTextures && (!output || opt.floatOutput)) {
			numTexels = Math.ceil(numTexels / 4);
		}

		const w = Math.ceil(Math.sqrt(numTexels));
		return [w, w];
	}

	/**
	 * Function: getDimensions
	 *
	 * Return the dimension of an array.
	 * 
	 * Parameters:
	 *		x       - {Array} The array
	 *		pad     - {Number} To include padding in the dimension calculation [Optional]
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
			ret = x.dimensions;
		} else {
			throw 'Unknown dimensions of ' + x;
		}

		if (pad) {
			ret = Utils.clone(ret);
			while (ret.length < 3) {
				ret.push(1);
			}
		}

		return ret;
	}

	/**
	 * Function: pad
	 *
	 * Pad an array AND its elements with leading and ending zeros
	 * Parameters:
	 * 	arr 		- {Array} the array to pad zeros to
	 * 	padding 	- {Number} amount of padding
	 *
	 * Returns:
	 * 	{Array} Array with leading and ending zeros, and all the elements padded by zeros.
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
	 * Function: flatten
	 *
	 * Converts a nested array into a one-dimensional array
	 *
	 * Parameters:
	 * 	_arr - {Array} the nested array to flatten
	 *
	 * Returns:
	 * 	{Array} 1D Array
	 *
	 */
	static flatten(_arr) {
		for (let i = 0; i < _arr.length; ++i) {
			if (Array.isArray(_arr[i])) {
				_arr[i].splice(0, 0, i, 1);
				Array.prototype.splice.apply(_arr, _arr[i]);
				--i;
			}
		}

		return _arr;
	}

	static copyFlatten(arr) {
		return Utils.isArray(arr[0]) ?
			Utils.isArray(arr[0][0]) ?
			Array.isArray(arr[0][0]) ? [].concat.apply([], [].concat.apply([], arr)) : [].concat.apply([], [].concat.apply([], arr)
				.map(function(x) {
					return Array.prototype.slice.call(x)
				})) : [].concat.apply([], arr) :
			arr;
	}

	/**
	 * Function: splitArray
	 *
	 * Splits an array into smaller arrays.
	 * Number of elements in one small chunk is given by `part`
	 *
	 * Parameters:
	 * 	array - {Array} The array to split into chunks
	 * 	part  - {Array} elements in one chunk
	 *
	 * Returns:
	 * 	{Array} An array of smaller chunks
	 *
	 */
	static splitArray(array, part) {
		const result = [];
		for (let i = 0; i < array.length; i += part) {
			result.push(array.slice(i, i + part));
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
};

// This ensure static methods are "inherited"
// See: https://stackoverflow.com/questions/5441508/how-to-inherit-static-methods-from-base-class-in-javascript
Object.assign(Utils, UtilsCore);

module.exports = Utils;