'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var KernelBase = require('../kernel-base');
var utils = require('../../core/utils');
var kernelString = require('./kernel-string');

module.exports = function (_KernelBase) {
	_inherits(CPUKernel, _KernelBase);

	/**
  * @constructor CPUKernel
  *
  * @desc Kernel Implementation for CPU.
  * 
  * <p>Instantiates properties to the CPU Kernel.</p>
  *
  * @extends KernelBase
  *
  * @prop {Object} thread - The thread dimensions, x, y and z
  * @prop {Object} output - The canvas dimensions
  * @prop {Object} functionBuilder - Function Builder instance bound to this Kernel
  * @prop {Function} run - Method to run the kernel
  *
  */
	function CPUKernel(fnString, settings) {
		_classCallCheck(this, CPUKernel);

		var _this = _possibleConstructorReturn(this, (CPUKernel.__proto__ || Object.getPrototypeOf(CPUKernel)).call(this, fnString, settings));

		_this._fnBody = utils.getFunctionBodyFromString(fnString);
		_this._fn = null;
		_this.run = null;
		_this._canvasCtx = null;
		_this._imageData = null;
		_this._colorData = null;
		_this._kernelString = null;
		_this.thread = {
			x: 0,
			y: 0,
			z: 0
		};

		_this.run = function () {
			this.run = null;
			this.build.apply(this, arguments);
			return this.run.apply(this, arguments);
		}.bind(_this);
		return _this;
	}

	/**
  * @memberOf CPUKernel#
  * @function
  * @name validateOptions
  *
  * @desc Validate options related to CPU Kernel, such as 
  * dimensions size, and auto dimension support.
  *
  */


	_createClass(CPUKernel, [{
		key: 'validateOptions',
		value: function validateOptions() {
			if (!this.output || this.output.length === 0) {
				if (arguments.length !== 1) {
					throw 'Auto dimensions only supported for kernels with only one input';
				}

				var argType = utils.getArgumentType(arguments[0]);
				if (argType === 'Array') {
					this.output = utils.getDimensions(argType);
				} else if (argType === 'Texture') {
					this.output = arguments[0].output;
				} else {
					throw 'Auto dimensions not supported for input type: ' + argType;
				}
			}
		}

		/**
   * @memberOf CPUKernel#
   * @function
   * @name build
   *
   * @desc Builds the Kernel, by generating the kernel 
   * string using thread dimensions, and arguments 
   * supplied to the kernel.
   *
   * <p>If the graphical flag is enabled, canvas is used.</p>
   *
   */

	}, {
		key: 'build',
		value: function build() {
			this.setupParams(arguments);
			var threadDim = this.threadDim = utils.clone(this.output);

			while (threadDim.length < 3) {
				threadDim.push(1);
			}

			if (this.graphical) {
				var canvas = this.getCanvas();
				canvas.width = threadDim[0];
				canvas.height = threadDim[1];
				this._canvasCtx = canvas.getContext('2d');
				this._imageData = this._canvasCtx.createImageData(threadDim[0], threadDim[1]);
				this._colorData = new Uint8ClampedArray(threadDim[0] * threadDim[1] * 4);
			}

			var kernelString = this.getKernelString();

			if (this.debug) {
				console.log('Options:');
				console.dir(this);
				console.log('Function output:');
				console.log(kernelString);
			}

			this.kernelString = kernelString;
			this.run = new Function([], kernelString).bind(this)();
		}
	}, {
		key: 'color',
		value: function color(r, g, b, a) {
			if (typeof a === 'undefined') {
				a = 1;
			}

			r = Math.floor(r * 255);
			g = Math.floor(g * 255);
			b = Math.floor(b * 255);
			a = Math.floor(a * 255);

			var width = this.output[0];
			var height = this.output[1];

			var x = this.thread.x;
			var y = height - this.thread.y - 1;

			var index = x + y * width;

			this._colorData[index * 4 + 0] = r;
			this._colorData[index * 4 + 1] = g;
			this._colorData[index * 4 + 2] = b;
			this._colorData[index * 4 + 3] = a;
		}

		/**
   * @memberOf CPUKernel#
   * @function
   * @name getKernelString
   *
   * @desc Generates kernel string for this kernel program.
   * 
   * <p>If sub-kernels are supplied, they are also factored in.
   * This string can be saved by calling the `toString` method
   * and then can be reused later.</p>
   *
   * @returns {String} result
   *
   */

	}, {
		key: 'getKernelString',
		value: function getKernelString() {
			var _this2 = this;

			if (this._kernelString !== null) return this._kernelString;

			var builder = this.functionBuilder;

			// Thread dim fix (to make compilable)
			var threadDim = this.threadDim || (this.threadDim = utils.clone(this.output));
			while (threadDim.length < 3) {
				threadDim.push(1);
			}

			builder.addKernel(this.fnString, {
				prototypeOnly: false,
				constants: this.constants,
				output: this.output,
				debug: this.debug,
				loopMaxIterations: this.loopMaxIterations
			}, this.paramNames, this.paramTypes);

			builder.addFunctions(this.functions, {
				constants: this.constants,
				output: this.output
			});

			if (this.subKernels !== null) {
				this.subKernelOutputTextures = [];
				this.subKernelOutputVariableNames = [];
				for (var i = 0; i < this.subKernels.length; i++) {
					var subKernel = this.subKernels[i];
					builder.addSubKernel(subKernel, {
						prototypeOnly: false,
						constants: this.constants,
						output: this.output,
						debug: this.debug,
						loopMaxIterations: this.loopMaxIterations
					});
					this.subKernelOutputVariableNames.push(subKernel.name + 'Result');
				}
			} else if (this.subKernelProperties !== null) {
				this.subKernelOutputVariableNames = [];
				var _i = 0;
				for (var p in this.subKernelProperties) {
					if (!this.subKernelProperties.hasOwnProperty(p)) continue;
					var _subKernel = this.subKernelProperties[p];
					builder.addSubKernel(_subKernel);
					this.subKernelOutputVariableNames.push(_subKernel.name + 'Result');
					_i++;
				}
			}

			var prototypes = builder.getPrototypes();
			var kernel = null;
			if (prototypes.length > 1) {
				prototypes = prototypes.filter(function (fn) {
					if (/^function/.test(fn)) return fn;
					kernel = fn;
					return false;
				});
			} else {
				kernel = prototypes.shift();
			}
			var kernelString = this._kernelString = '\n\t\tvar LOOP_MAX = ' + this._getLoopMaxString() + ';\n\t\tvar _this = this;\n  ' + (this.subKernelOutputVariableNames === null ? '' : this.subKernelOutputVariableNames.map(function (name) {
				return '  var ' + name + ' = null;\n';
			}).join('')) + '\n    return function (' + this.paramNames.map(function (paramName) {
				return 'user_' + paramName;
			}).join(', ') + ') {\n    var ret = new Array(' + threadDim[2] + ');\n  ' + (this.subKernelOutputVariableNames === null ? '' : this.subKernelOutputVariableNames.map(function (name) {
				return '  ' + name + 'Z = new Array(' + threadDim[2] + ');\n';
			}).join('')) + '\n    for (this.thread.z = 0; this.thread.z < ' + threadDim[2] + '; this.thread.z++) {\n      ret[this.thread.z] = new Array(' + threadDim[1] + ');\n  ' + (this.subKernelOutputVariableNames === null ? '' : this.subKernelOutputVariableNames.map(function (name) {
				return '    ' + name + 'Z[this.thread.z] = new Array(' + threadDim[1] + ');\n';
			}).join('')) + '\n      for (this.thread.y = 0; this.thread.y < ' + threadDim[1] + '; this.thread.y++) {\n        ret[this.thread.z][this.thread.y] = new Array(' + threadDim[0] + ');\n  ' + (this.subKernelOutputVariableNames === null ? '' : this.subKernelOutputVariableNames.map(function (name) {
				return '      ' + name + 'Z[this.thread.z][this.thread.y] = new Array(' + threadDim[0] + ');\n';
			}).join('')) + '\n        for (this.thread.x = 0; this.thread.x < ' + threadDim[0] + '; this.thread.x++) {\n          var kernelResult;\n          ' + kernel + '\n          ret[this.thread.z][this.thread.y][this.thread.x] = kernelResult;\n' + (this.subKernelOutputVariableNames === null ? '' : this.subKernelOutputVariableNames.map(function (name) {
				return '        ' + name + 'Z[this.thread.z][this.thread.y][this.thread.x] = ' + name + ';\n';
			}).join('')) + '\n          }\n        }\n      }\n      \n      if (this.graphical) {\n        this._imageData.data.set(this._colorData);\n        this._canvasCtx.putImageData(this._imageData, 0, 0);\n        return;\n      }\n      \n      if (this.output.length === 1) {\n        ret = ret[0][0];\n' + (this.subKernelOutputVariableNames === null ? '' : this.subKernelOutputVariableNames.map(function (name) {
				return '    ' + name + ' = ' + name + 'Z[0][0];\n';
			}).join('')) + '\n      \n    } else if (this.output.length === 2) {\n      ret = ret[0];\n      ' + (this.subKernelOutputVariableNames === null ? '' : this.subKernelOutputVariableNames.map(function (name) {
				return '    ' + name + ' = ' + name + 'Z[0];\n';
			}).join('')) + '\n    }\n    \n    ' + (this.subKernelOutputVariableNames === null ? 'return ret;\n' : this.subKernels !== null ? 'var result = [\n        ' + this.subKernelOutputVariableNames.map(function (name) {
				return '' + name;
			}).join(',\n') + '\n      ];\n      result.result = ret;\n      return result;\n' : 'return {\n        result: ret,\n        ' + Object.keys(this.subKernelProperties).map(function (name, i) {
				return name + ': ' + _this2.subKernelOutputVariableNames[i];
			}).join(',\n') + '\n      };') + '\n    ' + (prototypes.length > 0 ? prototypes.join('\n') : '') + '\n    }.bind(this);';
			return kernelString;
		}

		/**
   * @memberOf CPUKernel#
   * @function
   * @name toString
   *
   * @desc Returns the *pre-compiled* Kernel as a JS Object String, that can be reused.
   *
   */

	}, {
		key: 'toString',
		value: function toString() {
			return kernelString(this);
		}

		/**
   * @memberOf CPUKernel#
   * @function
   * @name precompileKernelObj
   *
   * @desc Precompile the kernel into a single object, 
   * that can be used for building the execution kernel subsequently.
   *
   * @param {Array} argTypes - Array of argument types
   *     
   * Return:
   *     Compiled kernel {Object}
   *
   */

	}, {
		key: 'precompileKernelObj',
		value: function precompileKernelObj(argTypes) {

			var threadDim = this.threadDim || (this.threadDim = utils.clone(this.output));

			return {
				threadDim: threadDim
			};
		}

		/**
   * @memberOf CPUKernel
   * @function
   * @name compileKernel
   * @static
   *
   * @desc Takes a previously precompiled kernel object,
   * and complete compilation into a full kernel
   * 
   * @returns {Function} Compiled kernel
   *
   */

	}, {
		key: '_getLoopMaxString',


		/**
   * @memberOf WebGLKernel#
   * @function
   * @name _getLoopMaxString
   *
   * @desc Get the maximum loop size String.
   *
   * @returns {String} result
   *
   */
		value: function _getLoopMaxString() {
			return this.loopMaxIterations ? ' ' + parseInt(this.loopMaxIterations) + ';\n' : ' 1000;\n';
		}
	}], [{
		key: 'compileKernel',
		value: function compileKernel(precompileObj) {

			// Extract values from precompiled obj
			var threadDim = precompileObj.threadDim;

			// Normalize certain values : For actual build
			while (threadDim.length < 3) {
				threadDim.push(1);
			}
		}
	}]);

	return CPUKernel;
}(KernelBase);