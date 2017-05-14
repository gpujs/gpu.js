///
/// Class: utils
///
/// Various utility functions / snippets of code that GPU.JS uses internally.\
/// This covers various snippets of code that is not entirely gpu.js specific (ie. may find uses elsewhere)
///
/// Note that all methods in this class is 'static' by nature `utils.functionName()`
///
const Texture = require('./texture');
// FUNCTION_NAME regex
const FUNCTION_NAME = /function ([^(]*)/;

// STRIP COMMENTS regex
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

// ARGUMENT NAMES regex
const ARGUMENT_NAMES = /([^\s,]+)/g;

const systemEndianness = (() => {
	const b = new ArrayBuffer(4);
	const a = new Uint32Array(b);
	const c = new Uint8Array(b);
	a[0] = 0xdeadbeef;
	if (c[0] === 0xef) return 'LE';
	if (c[0] === 0xde) return 'BE';
	throw new Error('unknown endianness');
})();

let isFloatReadPixelsSupported = null;

const utils = class utils {
	//-----------------------------------------------------------------------------
	//
	//  System values support (currently only endianness)
	//
	//-----------------------------------------------------------------------------

	///
	/// Function: systemEndianness
	///
	/// Gets the system endianness, and cache it
	///
	/// Returns:
	///	{String} 'LE' or 'BE' depending on system architecture
	///
	/// Credit: https://gist.github.com/TooTallNate/4750953
	static get systemEndianness() {
		return systemEndianness;
	}

	//-----------------------------------------------------------------------------
	//
	//  Function and function string validations
	//
	//-----------------------------------------------------------------------------

	///
	/// Function: isFunction
	///
	/// Return TRUE, on a JS function
	///
	/// Parameters:
	/// 	funcObj - {JS Function} Object to validate if its a function
	///
	/// Returns:
	/// 	{Boolean} TRUE if the object is a JS function
	///
	static isFunction(funcObj) {
		return typeof(funcObj) === 'function';
	}

	///
	/// Function: isFunctionString
	///
	/// Return TRUE, on a valid JS function string
	///
	/// Note: This does just a VERY simply sanity check. And may give false positives.
	///
	/// Parameters:
	/// 	funcStr - {String}  String of JS function to validate
	///
	/// Returns:
	/// 	{Boolean} TRUE if the string passes basic validation
	///
	static isFunctionString(funcStr) {
		if (funcStr !== null) {
			return (funcStr.toString()
				.slice(0, 'function'.length)
				.toLowerCase() === 'function');
		}
		return false;
	}

	///
	/// Function: getFunctionName_fromString
	///
	/// Return the function name from a JS function string
	///
	/// Parameters:
	/// 	funcStr - {String}  String of JS function to validate
	///
	/// Returns:
	/// 	{String} Function name string (if found)
	///
	static getFunctionNameFromString(funcStr) {
		return FUNCTION_NAME.exec(funcStr)[1];
	}

	static getFunctionBodyFromString(funcStr) {
		return funcStr.substring(funcStr.indexOf('{') + 1, funcStr.lastIndexOf('}'));
	}

	///
	/// Function: getParamNames_fromString
	///
	/// Return list of parameter names extracted from the JS function string
	///
	/// Parameters:
	/// 	funcStr - {String}  String of JS function to validate
	///
	/// Returns:
	/// 	{[String, ...]}  Array representing all the parameter names
	///
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

	///
	/// Function: clone
	///
	/// Returns a clone
	///
	/// Parameters:
	/// 	obj - {Object}  Object to clone
	///
	/// Returns:
	/// 	{Object}  Cloned object
	///
	static clone(obj) {
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
	}

	///
	/// Function: newPromise
	///
	/// Returns a `new Promise` object based on the underlying implmentation
	///
	/// Parameters:
	/// 	executor - {function(resolve,reject)}  Promise builder function
	///
	/// Returns:
	/// 	{Promise}  Promise object
	///
	static newPromise(executor) {
		const simple = Promise || small_promise;
		if (simple === null) {
			throw TypeError('Browser is missing Promise implementation. Consider adding small_promise.js polyfill');
		}
		return (new simple(executor));
	}

	///
	/// Function: functionBinder
	///
	/// Limited implementation of Function.bind, with fallback
	///
	/// Parameters:
	/// 	inFunc   - {JS Function}  to setup bind on
	/// 	thisObj  - {Object} The this parameter to assume inside the binded function
	///
	/// Returns:
	/// 	{JS Function}  The binded function
	///
	static functionBinder(inFunc, thisObj) {
		if (inFunc.bind) {
			return inFunc.bind(thisObj);
		}

		return function() {
			const args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments));
			return inFunc.apply(thisObj, args);
		}
	}

	///
	/// Function: isArray
	///
	/// Checks if is an array or Array-like object
	///
	/// Parameters:
	/// 	arg   - {Object} The argument object to check if is array
	///
	/// Returns:
	/// 	{Boolean}  true if is array or Array-like object
	///
	static isArray(arr) {
		const tag = Object.prototype.toString.call(arr);
		return tag.indexOf('Array]', tag.length - 6) !== -1;
	}

	///
	/// Function: getArgumentType
	///
	/// Evaluate the argument type, to apply respective logic for it
	///
	/// Parameters:
	/// 	arg   - {Object} The argument object to evaluate type
	///
	/// Returns:
	/// 	{String}  Argument type Array/Number/Texture/Unknown
	///
	static getArgumentType(arg) {
		if (utils.isArray(arg)) {
			return 'Array';
		} else if (typeof arg === 'number') {
			return 'Number';
		} else if (arg instanceof Texture) {
			return 'Texture';
		} else {
			return 'Unknown';
		}
	}

	//-----------------------------------------------------------------------------
	//
	//  Canvas validation and support
	//
	//-----------------------------------------------------------------------------

	///
	/// Function: isCanvas
	///
	/// Return TRUE, on a valid DOM canvas object
	///
	/// Note: This does just a VERY simply sanity check. And may give false positives.
	///
	/// Parameters:
	/// 	canvasObj - {Canvas DOM object} Object to validate
	///
	/// Returns:
	/// 	{Boolean} TRUE if the object is a DOM canvas
	///
	static isCanvas(canvasObj) {
		return (
			canvasObj !== null &&
			canvasObj.nodeName &&
			canvasObj.getContext &&
			canvasObj.nodeName.toUpperCase() === 'CANVAS'
		);
	}

	///
	/// Function: isCanvasSupported
	///
	/// Return TRUE, if browser supports canvas
	///
	/// Returns:
	/// 	{Boolean} TRUE if browser supports canvas
	///
	static get isCanvasSupported() {
		return isCanvasSupported;
	}

	///
	/// Function: initCanvas
	///
	/// Initiate and returns a canvas, for usage in init_webgl.
	/// Returns only if canvas is supported by browser.
	///
	/// Returns:
	/// 	{Canvas DOM object} Canvas dom object if supported by browser, else null
	///
	static initCanvas() {
		// Fail fast if browser previously detected no support
		if (!isCanvasSupported) {
			return null;
		}

		// Default width and height, to fix webgl issue in safari
		// Create a new canvas DOM
		const canvas = document.createElement('canvas');
		canvas.width = 2;
		canvas.height = 2;

		// Returns the canvas
		return canvas;
	}

	//-----------------------------------------------------------------------------
	//
	//  Webgl validation and support
	//
	//-----------------------------------------------------------------------------

	///
	/// Function: isWebGl
	///
	/// Return TRUE, on a valid webGl context object
	///
	/// Note: This does just a VERY simply sanity check. And may give false positives.
	///
	/// Parameters:
	/// 	webGlObj - {webGl context} Object to validate
	///
	/// Returns:
	/// 	{Boolean} TRUE if the object is a webgl context object
	///
	static isWebGl(webGlObj) {
		return (
			webGlObj !== null &&
			(
				(
					webGlObj.__proto__ &&
					webGlObj.__proto__.hasOwnProperty('getExtension')
				) ||
				(
					webGlObj.prototype &&
					webGlObj.prototype.hasOwnProperty('getExtension')
				)
			)
		);
	}

	///
	/// Function: isWebGlSupported
	///
	/// Return TRUE, if browser supports webgl
	///
	/// Returns:
	/// 	{Boolean} TRUE if browser supports webgl
	///
	static get isWebGlSupported() {
		return isWebGlSupported;
	}

	// Default webgl options to use
	static get initWebGlDefaultOptions() {
		return {
			alpha: false,
			depth: false,
			antialias: false
		};
	}

	///
	/// Function: initWebGl
	///
	/// Initiate and returns a webGl, from a canvas object
	/// Returns only if webGl is supported by browser.
	///
	/// Parameters:
	/// 	canvasObj - {Canvas DOM object} Object to validate
	///
	/// Returns:
	/// 	{Canvas DOM object} Canvas dom object if supported by browser, else null
	///
	static initWebGl(canvasObj) {

		// First time setup, does the browser support check memorizer
		if (typeof isCanvasSupported !== 'undefined' && typeof isWebGlSupported !== 'undefined' || canvasObj === null) {
			if (!isCanvasSupported || !isWebGlSupported) {
				return null;
			}
		}

		// Fail fast for invalid canvas object
		if (!utils.isCanvas(canvasObj)) {
			throw new Error('Invalid canvas object - ' + canvasObj);
		}

		// Create a new canvas DOM
		const webGl = (
			canvasObj.getContext('experimental-webgl', utils.initWebGlDefaultOptions) ||
			canvasObj.getContext('webgl', utils.initWebGlDefaultOptions)
		);

		// Get the extension that is needed
		utils.OES_texture_float = webGl.getExtension('OES_texture_float');
		utils.OES_texture_float_linear = webGl.getExtension('OES_texture_float_linear');
		utils.OES_element_index_uint = webGl.getExtension('OES_element_index_uint');

		// Returns the canvas
		return webGl;
	}

	///
	/// Function: isFloatReadPixelsSupported
	///
	/// Checks if the browser supports readPixels with float type
	///
	/// Parameters:
	/// 	gpu - {gpu.js object} the gpu object
	///
	/// Returns:
	/// 	{Boolean} true if browser supports
	///
	static get isFloatReadPixelsSupported() {
		if (isFloatReadPixelsSupported !== null) {
			return isFloatReadPixelsSupported
		}

		const GPU = require('./');
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

		isFloatReadPixelsSupported = x[0] === 1;

		return isFloatReadPixelsSupported;
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

	static getDimensions(x, pad) {
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
			ret = x.dimensions;
		} else {
			throw 'Unknown dimensions of ' + x;
		}

		if (pad) {
			ret = utils.clone(ret);
			while (ret.length < 3) {
				ret.push(1);
			}
		}

		return ret;
	}

	static getProgramCacheKey(args, opt, outputDim) {
		let key = '';
		for (let i = 0; i < args.length; i++) {
			const argType = utils.getArgumentType(args[i]);
			key += argType;
			if (opt.hardcodeConstants) {
				if (argType === 'Array' || argType === 'Texture') {
					const dimensions = utils.getDimensions(args[i], true);
					key += '[' + dimensions[0] + ',' + dimensions[1] + ',' + dimensions[2] + ']';
				}
			}
		}

		let specialFlags = '';
		if (opt.wraparound) {
			specialFlags += 'Wraparound';
		}

		if (opt.hardcodeConstants) {
			specialFlags += 'Hardcode';
			specialFlags += '[' + outputDim[0] + ',' + outputDim[1] + ',' + outputDim[2] + ']';
		}

		if (opt.constants) {
			specialFlags += 'Constants';
			specialFlags += JSON.stringify(opt.constants);
		}

		if (specialFlags) {
			key = key + '-' + specialFlags;
		}

		return key;
	}

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

	static flatten(arr, result) {
		let i = 0;
		result = result || [];
		if (utils.isArray(arr)) {
			if (!utils.isArray(arr[0])) {
				result.push.apply(result, arr);
			} else {
				for (; i < arr.length; i++) {
					if (utils.isArray(arr[i])) {
						utils.flatten(arr[i], result);
					} else {
						result.push(result, arr[i]);
					}
				}
			}
		} else if (typeof arr === 'object') {
			const keys = Object.keys(arr);
			for (; i < keys.length; i++) {
				const objectValue = arr[keys[i]];
				if (utils.isArray(objectValue)) {
					utils.flatten(objectValue, result);
				} else {
					result.push(objectValue);
				}
			}
		}
		return result;
	}

	static splitArray(array, part) {
		const result = [];
		for (let i = 0; i < array.length; i += part) {
			result.push(array.slice(i, i + part));
		}
		return result;
	}
};
let isWebGlSupported;
const isCanvasSupported = typeof document !== 'undefined' ? utils.isCanvas(document.createElement('canvas')) : false;
isWebGlSupported = utils.isWebGl(utils.initWebGl(utils.initCanvas()));

module.exports = utils;