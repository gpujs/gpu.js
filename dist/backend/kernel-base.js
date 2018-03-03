'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var utils = require('../core/utils');

module.exports = function () {

	/**
  * @constructor BaseKernel
  * 
  * @desc Implements the base class for Kernels, and is used as a 
  * parent class for all Kernel implementations.
  *
  * This contains the basic methods needed by all Kernel implementations, 
  * like setDimensions, addSubKernel, etc.
  * 
  * @prop {Array} paramNames - Name of the parameters of the kernel function
  * @prop {String} fnString - Kernel function as a String
  * @prop {Array} dimensions - Dimensions of the kernel function, this.thread.x, etc.
  * @prop {Boolean} debug - Toggle debug mode
  * @prop {String} graphical - Toggle graphical mode
  * @prop {number} loopMaxIterations - Maximum number of loop iterations
  * @prop {Object} constants - Global constants
  * @prop {Array} subKernels - Sub kernels bound to this kernel instance
  * @prop {Object} subKernelProperties - Sub kernels bound to this kernel instance as key/value pairs
  * @prop {Array} subKernelOutputVariableNames - Names of the variables outputted by the subkerls
  *
  */
	function BaseKernel(fnString, settings) {
		_classCallCheck(this, BaseKernel);

		this.paramNames = utils.getParamNamesFromString(fnString);
		this.fnString = fnString;
		this.output = null;
		this.debug = false;
		this.graphical = false;
		this.loopMaxIterations = 0;
		this.constants = null;
		this.wraparound = null;
		this.hardcodeConstants = null;
		this.outputToTexture = null;
		this.outputImmutable = null;
		this.texSize = null;
		this._canvas = null;
		this._webGl = null;
		this.threadDim = null;
		this.floatTextures = null;
		this.floatOutput = null;
		this.floatOutputForce = null;
		this.addFunction = null;
		this.functions = null;
		this.nativeFunctions = null;
		this.subKernels = null;
		this.subKernelProperties = null;
		this.subKernelNames = null;
		this.subKernelOutputVariableNames = null;
		this.functionBuilder = null;
		this.paramTypes = null;

		for (var p in settings) {
			if (!settings.hasOwnProperty(p) || !this.hasOwnProperty(p)) continue;
			this[p] = settings[p];
		}
		if (settings.hasOwnProperty('canvas')) {
			this._canvas = settings.canvas;
		}
		if (settings.hasOwnProperty('output')) {
			this.setOutput(settings.output); // Flatten output object
		}

		if (!this._canvas) this._canvas = utils.initCanvas();
	}

	_createClass(BaseKernel, [{
		key: 'build',
		value: function build() {
			throw new Error('"build" not defined on Base');
		}

		/**
   * @memberOf KernelBase#
   * @function
   * @name setupParams
   *
   * @desc Setup the parameter types for the parameters
   * supplied to the Kernel function
   *
   * @param {Array} args - The actual parameters sent to the Kernel
   *
   */

	}, {
		key: 'setupParams',
		value: function setupParams(args) {
			var paramTypes = this.paramTypes = [];
			for (var i = 0; i < args.length; i++) {
				var param = args[i];
				var paramType = utils.getArgumentType(param);
				paramTypes.push(paramType);
			}
		}
	}, {
		key: 'setAddFunction',
		value: function setAddFunction(cb) {
			this.addFunction = cb;
			return this;
		}
	}, {
		key: 'setFunctions',
		value: function setFunctions(functions) {
			this.functions = functions;
			return this;
		}

		/**
   * @memberOf BaseKernel#
   * @function
   * @name setOutput
   *
   * @desc Set dimensions of the kernel function
   *
   * @param {Array|Object} output - The output array to set the kernel output size to
   *
   */

	}, {
		key: 'setOutput',
		value: function setOutput(output) {
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

		/**
   * @memberOf BaseKernel# 
   * @function
   * @name setDebug
   *
   * @desc Toggle debug mode
   *
   * @param {Boolean} flag - true to enable debug
   *
   */

	}, {
		key: 'setDebug',
		value: function setDebug(flag) {
			this.debug = flag;
			return this;
		}

		/**
   * @memberOf BaseKernel#
   * @function
   * @name setGraphical
   *
   * @desc Toggle graphical output mode
   *
   * @param {Boolean} flag - true to enable graphical output
   *
   */

	}, {
		key: 'setGraphical',
		value: function setGraphical(flag) {
			this.graphical = flag;
			return this;
		}

		/**
   * @memberOf BaseKernel#
   * @function
   * @name setLoopMaxIterations
   *
   * @desc Set the maximum number of loop iterations
   *
   * @param {number} max - iterations count
   *
   */

	}, {
		key: 'setLoopMaxIterations',
		value: function setLoopMaxIterations(max) {
			this.loopMaxIterations = max;
			return this;
		}

		/**
   * @memberOf BaseKernel#
   * @function
   * @name setConstants
   * @desc Set Constants
   */

	}, {
		key: 'setConstants',
		value: function setConstants(constants) {
			this.constants = constants;
			return this;
		}
	}, {
		key: 'setWraparound',
		value: function setWraparound(flag) {
			console.warn('Wraparound mode is not supported and undocumented.');
			this.wraparound = flag;
			return this;
		}
	}, {
		key: 'setHardcodeConstants',
		value: function setHardcodeConstants(flag) {
			this.hardcodeConstants = flag;
			return this;
		}
	}, {
		key: 'setOutputToTexture',
		value: function setOutputToTexture(flag) {
			this.outputToTexture = flag;
			return this;
		}
	}, {
		key: 'setOutputImmutable',
		value: function setOutputImmutable(flag) {
			this.outputImmutable = flag;
			return this;
		}

		/**
   * @memberOf BaseKernel#
   * @function
   * @name setFloatTextures
   *
   * @desc Toggle texture output mode
   *
   * @param {Boolean} flag - true to enable floatTextures
   *
   */

	}, {
		key: 'setFloatTextures',
		value: function setFloatTextures(flag) {
			this.floatTextures = flag;
			return this;
		}

		/**
   * @memberOf BaseKernel#
   * @function
   * @name setFloatOutput
   *
   * @desc Toggle output mode
   *
   * @param {Boolean} flag - true to enable float
   *
   */

	}, {
		key: 'setFloatOutput',
		value: function setFloatOutput(flag) {
			this.floatOutput = flag;
			return this;
		}
	}, {
		key: 'setFloatOutputForce',
		value: function setFloatOutputForce(flag) {
			this.floatOutputForce = flag;
			return this;
		}

		/**
   * @memberOf BaseKernel#
   * @function
   * @name setCanvas
   *
   * @desc Bind the canvas to kernel
   * 
   * @param {Canvas} canvas - Canvas to bind
   *
   */

	}, {
		key: 'setCanvas',
		value: function setCanvas(canvas) {
			this._canvas = canvas;
			return this;
		}

		/**
   * @memberOf BaseKernel#
   * @function
   * @name setCanvas
   *
   * @desc Bind the webGL instance to kernel
   * 
   * @param {Canvas} webGL - webGL instance to bind
   *
   */

	}, {
		key: 'setWebGl',
		value: function setWebGl(webGl) {
			this._webGl = webGl;
			return this;
		}

		/**
   * @memberOf BaseKernel#
   * @function
   * @name getCanvas()
   *
   * @desc Returns the current canvas instance bound to the kernel
   *
   */

	}, {
		key: 'getCanvas',
		value: function getCanvas() {
			return this._canvas;
		}

		/**
   * @memberOf BaseKernel#
   * @function
   * @name getWebGl()
   *
   * @desc Returns the current webGl instance bound to the kernel
   *
   */

	}, {
		key: 'getWebGl',
		value: function getWebGl() {
			return this._webGl;
		}
	}, {
		key: 'validateOptions',
		value: function validateOptions() {
			throw new Error('validateOptions not defined');
		}
	}, {
		key: 'exec',
		value: function exec() {
			return this.execute.apply(this, arguments);
		}
	}, {
		key: 'execute',
		value: function execute() {
			var _this = this;

			//
			// Prepare the required objects
			//
			var args = arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments);

			//
			// Setup and return the promise, and execute the function, in synchronous mode
			//
			return utils.newPromise(function (accept, reject) {
				try {
					accept(_this.run.apply(_this, args));
				} catch (e) {
					//
					// Error : throw rejection
					//
					reject(e);
				}
			});
		}

		/** 
   * @memberOf BaseKernel#
   * @function
   * @name addSubKernel
   *
   * @desc Add a sub kernel to the root kernel instance.
   * This is what `createKernelMap` uses.
   *
   * @param {String} fnString - function (as a String) of the subKernel to add
   *
   */

	}, {
		key: 'addSubKernel',
		value: function addSubKernel(fnString) {
			if (this.subKernels === null) {
				this.subKernels = [];
				this.subKernelNames = [];
			}
			this.subKernels.push(fnString);
			this.subKernelNames.push(utils.getFunctionNameFromString(fnString));
			return this;
		}

		/** 
   * @memberOf BaseKernel#
   * @function
   * @name addSubKernelProperty
   *
   * @desc Add a sub kernel to the root kernel instance, indexed by a property name
   * This is what `createKernelMap` uses.
   *
   * @param {String} property - property key for the subKernel
   * @param {String} fnString - function (as a String) of the subKernel to add
   *
   */

	}, {
		key: 'addSubKernelProperty',
		value: function addSubKernelProperty(property, fnString) {
			if (this.subKernelProperties === null) {
				this.subKernelProperties = {};
				this.subKernelNames = [];
			}
			if (this.subKernelProperties.hasOwnProperty(property)) {
				throw new Error('cannot add sub kernel ' + property + ', already defined');
			}
			this.subKernelProperties[property] = fnString;
			this.subKernelNames.push(utils.getFunctionNameFromString(fnString));
			return this;
		}
	}, {
		key: 'addNativeFunction',
		value: function addNativeFunction(name, source) {
			this.functionBuilder.addNativeFunction(name, source);
		}
	}]);

	return BaseKernel;
}();