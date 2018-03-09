'use strict';

const KernelBase = require('../kernel-base');
const utils = require('../../core/utils');
const kernelString = require('./kernel-string');

module.exports = class CPUKernel extends KernelBase {

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
	constructor(fnString, settings) {
		super(fnString, settings);
		this._fnBody = utils.getFunctionBodyFromString(fnString);
		this._fn = null;
		this.run = null;
		this._canvasCtx = null;
		this._imageData = null;
		this._colorData = null;
		this._kernelString = null;
		this.thread = {
			x: 0,
			y: 0,
			z: 0
		};

		this.run = function() {
			this.run = null;
			this.build.apply(this, arguments);
			return this.run.apply(this, arguments);
		}.bind(this);
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
	validateOptions() {
		if (!this.output || this.output.length === 0) {
			if (arguments.length !== 1) {
				throw 'Auto dimensions only supported for kernels with only one input';
			}

			const argType = utils.getArgumentType(arguments[0]);
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
	build() {
		this.setupParams(arguments);
		const threadDim = this.threadDim = utils.clone(this.output);

		while (threadDim.length < 3) {
			threadDim.push(1);
		}

		if (this.graphical) {
			const canvas = this.getCanvas();
			canvas.width = threadDim[0];
			canvas.height = threadDim[1];
			this._canvasCtx = canvas.getContext('2d');
			this._imageData = this._canvasCtx.createImageData(threadDim[0], threadDim[1]);
			this._colorData = new Uint8ClampedArray(threadDim[0] * threadDim[1] * 4);
		}

		const kernelString = this.getKernelString();

		if (this.debug) {
			console.log('Options:');
			console.dir(this);
			console.log('Function output:');
			console.log(kernelString);
		}

		this.kernelString = kernelString;
		this.run = new Function([], kernelString).bind(this)();
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
	getKernelString() {
		if (this._kernelString !== null) return this._kernelString;

		const builder = this.functionBuilder;

		// Thread dim fix (to make compilable)
		const threadDim = this.threadDim || (this.threadDim = utils.clone(this.output));
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
			for (let i = 0; i < this.subKernels.length; i++) {
				const subKernel = this.subKernels[i];
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
			let i = 0;
			for (let p in this.subKernelProperties) {
				if (!this.subKernelProperties.hasOwnProperty(p)) continue;
				const subKernel = this.subKernelProperties[p];
				builder.addSubKernel(subKernel);
				this.subKernelOutputVariableNames.push(subKernel.name + 'Result');
				i++;
			}
		}

		let prototypes = builder.getPrototypes();
		let kernel = null;
		if (prototypes.length > 1) {
			prototypes = prototypes.filter(fn => {
				if (/^function/.test(fn)) return fn;
				kernel = fn;
				return false;
			})
		} else {
			kernel = prototypes.shift();
		}
		const kernelString = this._kernelString = `
		var LOOP_MAX = ${ this._getLoopMaxString() };
		var _this = this;
  ${ this.subKernelOutputVariableNames === null
        ? ''
        : this.subKernelOutputVariableNames.map((name) => `  var ${ name } = null;\n`).join('')
        }
    return function (${ this.paramNames.map(paramName => 'user_' + paramName).join(', ') }) {
    var ret = new Array(${ threadDim[2] });
  ${ this.subKernelOutputVariableNames === null
        ? ''
        : this.subKernelOutputVariableNames.map((name) => `  ${ name }Z = new Array(${ threadDim[2] });\n`).join('')
        }
    for (this.thread.z = 0; this.thread.z < ${ threadDim[2] }; this.thread.z++) {
      ret[this.thread.z] = new Array(${ threadDim[1] });
  ${ this.subKernelOutputVariableNames === null
        ? ''
        : this.subKernelOutputVariableNames.map((name) => `    ${ name }Z[this.thread.z] = new Array(${ threadDim[1] });\n`).join('')
        }
      for (this.thread.y = 0; this.thread.y < ${ threadDim[1] }; this.thread.y++) {
        ret[this.thread.z][this.thread.y] = new Array(${ threadDim[0] });
  ${ this.subKernelOutputVariableNames === null
        ? ''
        : this.subKernelOutputVariableNames.map((name) => `      ${ name }Z[this.thread.z][this.thread.y] = new Array(${ threadDim[0] });\n`).join('')
        }
        for (this.thread.x = 0; this.thread.x < ${ threadDim[0] }; this.thread.x++) {
          var kernelResult;
          ${ kernel }
          ret[this.thread.z][this.thread.y][this.thread.x] = kernelResult;
${ this.subKernelOutputVariableNames === null
      ? ''
      : this.subKernelOutputVariableNames.map((name) => `        ${ name }Z[this.thread.z][this.thread.y][this.thread.x] = ${ name };\n`).join('') }
          }
        }
      }
      
      if (this.graphical) {
        this._imageData.data.set(this._colorData);
        this._canvasCtx.putImageData(this._imageData, 0, 0);
        return;
      }
      
      if (this.output.length === 1) {
        ret = ret[0][0];
${ this.subKernelOutputVariableNames === null
        ? ''
        : this.subKernelOutputVariableNames.map((name) => `    ${ name } = ${ name }Z[0][0];\n`).join('')
        }
      
    } else if (this.output.length === 2) {
      ret = ret[0];
      ${ this.subKernelOutputVariableNames === null
        ? ''
        : this.subKernelOutputVariableNames.map((name) => `    ${ name } = ${ name }Z[0];\n`).join('')
        }
    }
    
    ${ this.subKernelOutputVariableNames === null
        ? 'return ret;\n'
        : this.subKernels !== null
          ? `var result = [
        ${ this.subKernelOutputVariableNames.map((name) => `${ name }`).join(',\n') }
      ];
      result.result = ret;
      return result;\n`
          : `return {
        result: ret,
        ${ Object.keys(this.subKernelProperties).map((name, i) => `${ name }: ${ this.subKernelOutputVariableNames[i] }`).join(',\n') }
      };`
        }
    ${ prototypes.length > 0 ? prototypes.join('\n') : '' }
    }.bind(this);`;
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
	toString() {
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
	precompileKernelObj(argTypes) {

		const threadDim = this.threadDim || (this.threadDim = utils.clone(this.output));


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
	static compileKernel(precompileObj) {

		// Extract values from precompiled obj
		const threadDim = precompileObj.threadDim;

		// Normalize certain values : For actual build
		while (threadDim.length < 3) {
			threadDim.push(1);
		}
	}

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
	_getLoopMaxString() {
		return (
			this.loopMaxIterations ?
			` ${ parseInt(this.loopMaxIterations) };\n` :
			' 1000;\n'
		);
	}
};