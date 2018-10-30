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

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var UtilsCore = require("./utils-core");
var Input = require('./input');
var Texture = require('./texture');
// FUNCTION_NAME regex
var FUNCTION_NAME = /function ([^(]*)/;

// STRIP COMMENTS regex
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

// ARGUMENT NAMES regex
var ARGUMENT_NAMES = /([^\s,]+)/g;

var _systemEndianness = function () {
	var b = new ArrayBuffer(4);
	var a = new Uint32Array(b);
	var c = new Uint8Array(b);
	a[0] = 0xdeadbeef;
	if (c[0] === 0xef) return 'LE';
	if (c[0] === 0xde) return 'BE';
	throw new Error('unknown endianness');
}();

var _isFloatReadPixelsSupported = null;
var _isFloatReadPixelsSupportedWebGL2 = null;

var _isMixedIdentifiersSupported = function () {
	try {
		new Function('let i = 1; const j = 1;')();
		return true;
	} catch (e) {
		return false;
	}
}();

var _hasIntegerDivisionAccuracyBug = null;

/**
 * @class
 * @extends UtilsCore
 */

var Utils = function (_UtilsCore) {
	_inherits(Utils, _UtilsCore);

	function Utils() {
		_classCallCheck(this, Utils);

		return _possibleConstructorReturn(this, (Utils.__proto__ || Object.getPrototypeOf(Utils)).apply(this, arguments));
	}

	_createClass(Utils, null, [{
		key: 'systemEndianness',


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
		value: function systemEndianness() {
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

	}, {
		key: 'isFunction',
		value: function isFunction(funcObj) {
			return typeof funcObj === 'function';
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

	}, {
		key: 'isFunctionString',
		value: function isFunctionString(funcStr) {
			if (funcStr !== null) {
				return funcStr.toString().slice(0, 'function'.length).toLowerCase() === 'function';
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

	}, {
		key: 'getFunctionNameFromString',
		value: function getFunctionNameFromString(funcStr) {
			return FUNCTION_NAME.exec(funcStr)[1];
		}
	}, {
		key: 'getFunctionBodyFromString',
		value: function getFunctionBodyFromString(funcStr) {
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

	}, {
		key: 'getParamNamesFromString',
		value: function getParamNamesFromString(func) {
			var fnStr = func.toString().replace(STRIP_COMMENTS, '');
			var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
			if (result === null) result = [];
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

	}, {
		key: 'clone',
		value: function clone(obj) {
			if (obj === null || (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) !== 'object' || obj.hasOwnProperty('isActiveClone')) return obj;

			var temp = obj.constructor(); // changed

			for (var key in obj) {
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

	}, {
		key: 'newPromise',
		value: function newPromise(executor) {
			var simple = Promise || small_promise;
			if (simple === null) {
				throw TypeError('Browser is missing Promise implementation. Consider adding small_promise.js polyfill');
			}
			return new simple(executor);
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

	}, {
		key: 'functionBinder',
		value: function functionBinder(inFunc, thisObj) {
			if (inFunc.bind) {
				return inFunc.bind(thisObj);
			}

			return function () {
				var args = arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments);
				return inFunc.apply(thisObj, args);
			};
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

	}, {
		key: 'isArray',
		value: function isArray(array) {
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

	}, {
		key: 'getArgumentType',
		value: function getArgumentType(arg) {
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
				return arg.type;
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

	}, {
		key: 'isFloatReadPixelsSupported',
		value: function isFloatReadPixelsSupported() {
			if (_isFloatReadPixelsSupported !== null) {
				return _isFloatReadPixelsSupported;
			}

			var GPU = require('../index');
			var gpu = new GPU({
				mode: 'webgl-validator'
			});
			var x = gpu.createKernel(function () {
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

	}, {
		key: 'isFloatReadPixelsSupportedWebGL2',
		value: function isFloatReadPixelsSupportedWebGL2() {
			if (_isFloatReadPixelsSupportedWebGL2 !== null) {
				return _isFloatReadPixelsSupportedWebGL2;
			}

			var GPU = require('../index');
			var gpu = new GPU({
				mode: 'webgl2-validator'
			});
			var x = gpu.createKernel(function () {
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

	}, {
		key: 'hasIntegerDivisionAccuracyBug',
		value: function hasIntegerDivisionAccuracyBug() {
			if (_hasIntegerDivisionAccuracyBug !== null) {
				return _hasIntegerDivisionAccuracyBug;
			}

			var GPU = require('../index');
			var gpu = new GPU({
				mode: 'webgl-validator'
			});
			var x = gpu.createKernel(function (v1, v2) {
				return v1[this.thread.x] / v2[this.thread.x];
			}, {
				output: [1]
			})([6, 6030401], [3, 3991]);

			// have we not got whole numbers for 6/3 or 6030401/3991
			// add more here if others see this problem
			_hasIntegerDivisionAccuracyBug = x[0] !== 2 || x[1] !== 1511;
			gpu.destroy();
			return _hasIntegerDivisionAccuracyBug;
		}
	}, {
		key: 'isMixedIdentifiersSupported',
		value: function isMixedIdentifiersSupported() {
			return _isMixedIdentifiersSupported;
		}
	}, {
		key: 'dimToTexSize',
		value: function dimToTexSize(opt, dimensions, output) {
			var numTexels = dimensions[0];
			var w = dimensions[0];
			var h = dimensions[1];
			for (var i = 1; i < dimensions.length; i++) {
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
			var sqrt = Math.sqrt(numTexels);
			var high = Math.ceil(sqrt);
			var low = Math.floor(sqrt);
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

	}, {
		key: 'getDimensions',
		value: function getDimensions(x, pad) {
			var ret = void 0;
			if (Utils.isArray(x)) {
				var dim = [];
				var temp = x;
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

	}, {
		key: 'pad',
		value: function pad(arr, padding) {
			function zeros(n) {
				return Array.apply(null, new Array(n)).map(Number.prototype.valueOf, 0);
			}

			var len = arr.length + padding * 2;

			var ret = arr.map(function (x) {
				return [].concat(zeros(padding), x, zeros(padding));
			});

			for (var i = 0; i < padding; i++) {
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

	}, {
		key: 'flatten2dArrayTo',
		value: function flatten2dArrayTo(array, target) {
			var offset = 0;
			for (var y = 0; y < array.length; y++) {
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

	}, {
		key: 'flatten3dArrayTo',
		value: function flatten3dArrayTo(array, target) {
			var offset = 0;
			for (var z = 0; z < array.length; z++) {
				for (var y = 0; y < array[z].length; y++) {
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

	}, {
		key: 'flattenTo',
		value: function flattenTo(array, target) {
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

	}, {
		key: 'splitArray',
		value: function splitArray(array, part) {
			var result = [];
			for (var i = 0; i < array.length; i += part) {
				result.push(new array.constructor(array.buffer, i * 4 + array.byteOffset, part));
			}
			return result;
		}
	}, {
		key: 'getAstString',
		value: function getAstString(source, ast) {
			var lines = Array.isArray(source) ? source : source.split(/\r?\n/g);
			var start = ast.loc.start;
			var end = ast.loc.end;
			var result = [];
			result.push(lines[start.line - 1].slice(start.column));
			for (var i = start.line; i < end.line - 1; i++) {
				result.push(lines[i]);
			}
			result.push(lines[end.line - 1].slice(0, end.column));
			return result.join('\n');
		}
	}, {
		key: 'allPropertiesOf',
		value: function allPropertiesOf(obj) {
			var props = [];

			do {
				props.push.apply(props, Object.getOwnPropertyNames(obj));
			} while (obj = Object.getPrototypeOf(obj));

			return props;
		}
	}]);

	return Utils;
}(UtilsCore);

// This ensure static methods are "inherited"
// See: https://stackoverflow.com/questions/5441508/how-to-inherit-static-methods-from-base-class-in-javascript


Object.assign(Utils, UtilsCore);

module.exports = Utils;