'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var utils = require('./utils');
var WebGLRunner = require('../backend/web-gl/runner');
var WebGL2Runner = require('../backend/web-gl2/runner');
var CPURunner = require('../backend/cpu/runner');
var WebGLValidatorKernel = require('../backend/web-gl/validator-kernel');
var WebGL2ValidatorKernel = require('../backend/web-gl2/validator-kernel');
var GPUCore = require("./gpu-core");

/**
 * Initialises the GPU.js library class which manages the webGlContext for the created functions.
 * @class
 * @extends GPUCore
 */

var GPU = function (_GPUCore) {
	_inherits(GPU, _GPUCore);

	/**
  * Creates an instance of GPU.
  * @param {any} settings - Settings to set mode, andother properties. See #GPUCore
  * @memberOf GPU#
  */
	function GPU(settings) {
		_classCallCheck(this, GPU);

		var _this = _possibleConstructorReturn(this, (GPU.__proto__ || Object.getPrototypeOf(GPU)).call(this, settings));

		settings = settings || {};
		_this._canvas = settings.canvas || null;
		_this._webGl = settings.webGl || null;
		var mode = settings.mode;
		var detectedMode = void 0;
		if (!utils.isWebGlSupported()) {
			if (mode && mode !== 'cpu') {
				throw new Error('A requested mode of "' + mode + '" and is not supported');
			} else {
				console.warn('Warning: gpu not supported, falling back to cpu support');
				detectedMode = 'cpu';
			}
		} else {
			if (_this._webGl) {
				if (typeof WebGL2RenderingContext !== 'undefined' && _this._webGl.constructor === WebGL2RenderingContext) {
					detectedMode = 'webgl2';
				} else if (typeof WebGLRenderingContext !== 'undefined' && _this._webGl.constructor === WebGLRenderingContext) {
					detectedMode = 'webgl';
				} else {
					throw new Error('unknown WebGL Context');
				}
			} else {
				detectedMode = mode || 'gpu';
			}
		}
		_this.kernels = [];

		var runnerSettings = {
			canvas: _this._canvas,
			webGl: _this._webGl
		};

		switch (detectedMode) {
			// public options
			case 'cpu':
				_this._runner = new CPURunner(runnerSettings);
				break;
			case 'gpu':
				var Runner = _this.getGPURunner();
				_this._runner = new Runner(runnerSettings);
				break;

			// private explicit options for testing
			case 'webgl2':
				_this._runner = new WebGL2Runner(runnerSettings);
				break;
			case 'webgl':
				_this._runner = new WebGLRunner(runnerSettings);
				break;

			// private explicit options for internal
			case 'webgl2-validator':
				_this._runner = new WebGL2Runner(runnerSettings);
				_this._runner.Kernel = WebGL2ValidatorKernel;
				break;
			case 'webgl-validator':
				_this._runner = new WebGLRunner(runnerSettings);
				_this._runner.Kernel = WebGLValidatorKernel;
				break;
			default:
				throw new Error('"' + mode + '" mode is not defined');
		}
		return _this;
	}
	/**
  *
  * This creates a callable function object to call the kernel function with the argument parameter set
  *
  * @name createKernel
  * @function
  * @memberOf GPU##
  *
  * @param {Function} fn - The calling to perform the conversion
  * @param {Object} [settings] - The parameter configuration object
  * @property {String} settings.dimensions - Thread dimension array (Defaults to [1024])
  * @property {String} settings.mode - CPU / GPU configuration mode (Defaults to null)
  *
  * The following modes are supported
  * *'falsey'* : Attempts to build GPU mode, else fallbacks
  * *'gpu'* : Attempts to build GPU mode, else fallbacks
  * *'cpu'* : Forces JS fallback mode only
  *
  *
  * @returns {Function} callable function to run
  *
  */


	_createClass(GPU, [{
		key: 'createKernel',
		value: function createKernel(fn, settings) {
			//
			// basic parameters safety checks
			//
			if (typeof fn === 'undefined') {
				throw 'Missing fn parameter';
			}
			if (!utils.isFunction(fn) && typeof fn !== 'string') {
				throw 'fn parameter not a function';
			}

			var mergedSettings = Object.assign({
				webGl: this._webGl,
				canvas: this._canvas
			}, settings || {});

			var kernel = this._runner.buildKernel(fn, mergedSettings);

			//if canvas didn't come from this, propagate from kernel
			if (!this._canvas) {
				this._canvas = kernel.getCanvas();
			}
			if (!this._runner.canvas) {
				this._runner.canvas = kernel.getCanvas();
			}

			this.kernels.push(kernel);

			return kernel;
		}

		/**
   *
   * Create a super kernel which executes sub kernels
   * and saves their output to be used with the next sub kernel.
   * This can be useful if we want to save the output on one kernel,
   * and then use it as an input to another kernel. *Machine Learning*
   *
   * @name createKernelMap
   * @function
   * @memberOf GPU#
   *
   * @param {Object|Array} subKernels - Sub kernels for this kernel
   * @param {Function} rootKernel - Root kernel
   *
   * @returns {Function} callable kernel function
   *
   * @example
   * const megaKernel = gpu.createKernelMap({
   *   addResult: function add(a, b) {
   *     return a[this.thread.x] + b[this.thread.x];
   *   },
   *   multiplyResult: function multiply(a, b) {
   *     return a[this.thread.x] * b[this.thread.x];
   *   },
   *  }, function(a, b, c) {
   *       return multiply(add(a, b), c);
   * });
   *
   * megaKernel(a, b, c);
   *
   * Note: You can also define subKernels as an array of functions.
   * > [add, multiply]
   *
   */

	}, {
		key: 'createKernelMap',
		value: function createKernelMap() {
			var fn = void 0;
			var settings = void 0;
			if (typeof arguments[arguments.length - 2] === 'function') {
				fn = arguments[arguments.length - 2];
				settings = arguments[arguments.length - 1];
			} else {
				fn = arguments[arguments.length - 1];
			}

			if (!utils.isWebGlDrawBuffersSupported()) {
				this._runner = new CPURunner(settings);
			}

			var kernel = this.createKernel(fn, settings);
			if (Array.isArray(arguments[0])) {
				var functions = arguments[0];
				for (var i = 0; i < functions.length; i++) {
					kernel.addSubKernel(functions[i]);
				}
			} else {
				var _functions = arguments[0];
				for (var p in _functions) {
					if (!_functions.hasOwnProperty(p)) continue;
					kernel.addSubKernelProperty(p, _functions[p]);
				}
			}

			return kernel;
		}

		/**
   *
   * Combine different kernels into one super Kernel,
   * useful to perform multiple operations inside one
   * kernel without the penalty of data transfer between
   * cpu and gpu.
   *
   * The number of kernel functions sent to this method can be variable.
   * You can send in one, two, etc.
   *
   * @name combineKernels
   * @function
   * @memberOf GPU#
   *
   * @param {Function} subKernels - Kernel function(s) to combine.
   * @param {Function} rootKernel - Root kernel to combine kernels into
   *
   * @example
   * 	combineKernels(add, multiply, function(a,b,c){
   *	 	return add(multiply(a,b), c)
   *	})
   *
   * @returns {Function} Callable kernel function
   *
   */

	}, {
		key: 'combineKernels',
		value: function combineKernels() {
			var lastKernel = arguments[arguments.length - 2];
			var combinedKernel = arguments[arguments.length - 1];
			if (this.getMode() === 'cpu') return combinedKernel;

			var canvas = arguments[0].getCanvas();
			var webGl = arguments[0].getWebGl();

			for (var i = 0; i < arguments.length - 1; i++) {
				arguments[i].setCanvas(canvas).setWebGl(webGl).setOutputToTexture(true);
			}

			return function () {
				combinedKernel.apply(null, arguments);
				var texSize = lastKernel.texSize;
				var gl = lastKernel.getWebGl();
				var threadDim = lastKernel.threadDim;
				var result = void 0;
				if (lastKernel.floatOutput) {
					var w = texSize[0];
					var h = Math.ceil(texSize[1] / 4);
					result = new Float32Array(w * h * 4);
					gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, result);
				} else {
					var bytes = new Uint8Array(texSize[0] * texSize[1] * 4);
					gl.readPixels(0, 0, texSize[0], texSize[1], gl.RGBA, gl.UNSIGNED_BYTE, bytes);
					result = new Float32Array(bytes.buffer);
				}

				result = result.subarray(0, threadDim[0] * threadDim[1] * threadDim[2]);

				if (lastKernel.output.length === 1) {
					return result;
				} else if (lastKernel.output.length === 2) {
					return utils.splitArray(result, lastKernel.output[0]);
				} else if (lastKernel.output.length === 3) {
					var cube = utils.splitArray(result, lastKernel.output[0] * lastKernel.output[1]);
					return cube.map(function (x) {
						return utils.splitArray(x, lastKernel.output[0]);
					});
				}
			};
		}
	}, {
		key: 'getGPURunner',
		value: function getGPURunner() {
			if (typeof WebGL2RenderingContext !== 'undefined' && utils.isWebGl2Supported()) return WebGL2Runner;
			if (typeof WebGLRenderingContext !== 'undefined') return WebGLRunner;
		}

		/**
   *
   * Adds additional functions, that the kernel may call.
   *
   * @name addFunction
   * @function
   * @memberOf GPU#
   *
   * @param {Function|String} fn - JS Function to do conversion
   * @param {Object} options
   *
   * @returns {GPU} returns itself
   *
   */

	}, {
		key: 'addFunction',
		value: function addFunction(fn, options) {
			this._runner.functionBuilder.addFunction(null, fn, options);
			return this;
		}

		/**
   *
   * Adds additional native functions, that the kernel may call.
   *
   * @name addNativeFunction
   * @function
   * @memberOf GPU#
   *
   * @param {String} name - native function name, used for reverse lookup
   * @param {String} nativeFunction - the native function implementation, as it would be defined in it's entirety
   *
   * @returns {GPU} returns itself
   *
   */

	}, {
		key: 'addNativeFunction',
		value: function addNativeFunction(name, nativeFunction) {
			this._runner.functionBuilder.addNativeFunction(name, nativeFunction);
			return this;
		}

		/**
   *
   * Return the current mode in which gpu.js is executing.
   * @name getMode
   * @function
   * @memberOf GPU#
   *
   * @returns {String} The current mode, "cpu", "webgl", etc.
   *
   */

	}, {
		key: 'getMode',
		value: function getMode() {
			return this._runner.getMode();
		}

		/**
   *
   * Return TRUE, if browser supports WebGl AND Canvas
   *
   * @name get isWebGlSupported
   * @function
   * @memberOf GPU#
   *
   * Note: This function can also be called directly `GPU.isWebGlSupported()`
   *
   * @returns {Boolean} TRUE if browser supports webGl
   *
   */

	}, {
		key: 'isWebGlSupported',
		value: function isWebGlSupported() {
			return utils.isWebGlSupported();
		}

		/**
   *
   * Return TRUE, if system has integer division accuracy issue
   *
   * @name get hasIntegerDivisionAccuracyBug
   * @function
   * @memberOf GPU#
   *
   * Note: This function can also be called directly `GPU.hasIntegerDivisionAccuracyBug()`
   *
   * @returns {Boolean} TRUE if system has integer division accuracy issue
   *
   *
   */

	}, {
		key: 'hasIntegerDivisionAccuracyBug',
		value: function hasIntegerDivisionAccuracyBug() {
			return utils.hasIntegerDivisionAccuracyBug();
		}

		/**
   *
   * Return the canvas object bound to this gpu instance.
   *
   * @name getCanvas
   * @function
   * @memberOf GPU#
   *
   * @returns {Object} Canvas object if present
   *
   */

	}, {
		key: 'getCanvas',
		value: function getCanvas() {
			return this._canvas;
		}

		/**
   *
   * Return the webGl object bound to this gpu instance.
   *
   * @name getWebGl
   * @function
   * @memberOf GPU#
   *
   * @returns {Object} WebGl object if present
   *
   */

	}, {
		key: 'getWebGl',
		value: function getWebGl() {
			return this._webGl;
		}

		/**
   *
   * Destroys all memory associated with gpu.js & the webGl if we created it
   *
   * @name destroy
   * @function
   * @memberOf GPU#
   *
   *
   */

	}, {
		key: 'destroy',
		value: function destroy() {
			var _this2 = this;

			// perform on next runloop - for some reason we dont get lose context events 
			// if webGl is created and destroyed in the same run loop.
			setTimeout(function () {
				var kernels = _this2.kernels;

				var destroyWebGl = !_this2._webGl && kernels.length && kernels[0]._webGl;
				for (var i = 0; i < _this2.kernels.length; i++) {
					_this2.kernels[i].destroy(true); // remove canvas if exists
				}

				if (destroyWebGl) {
					destroyWebGl.OES_texture_float = null;
					destroyWebGl.OES_texture_float_linear = null;
					destroyWebGl.OES_element_index_uint = null;
					var loseContextExt = destroyWebGl.getExtension('WEBGL_lose_context');
					if (loseContextExt) {
						loseContextExt.loseContext();
					}
				}
			}, 0);
		}
	}]);

	return GPU;
}(GPUCore);

;

// This ensure static methods are "inherited"
// See: https://stackoverflow.com/questions/5441508/how-to-inherit-static-methods-from-base-class-in-javascript
Object.assign(GPU, GPUCore);

module.exports = GPU;