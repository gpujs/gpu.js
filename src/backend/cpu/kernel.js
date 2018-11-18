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
			} else if (argType === 'NumberTexture' || argType === 'ArrayTexture(4)') {
				this.output = arguments[0].output;
			} else {
				throw 'Auto dimensions not supported for input type: ' + argType;
			}
		}

		utils.checkOutput(this.output);
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
		this.setupConstants();
		this.setupParams(arguments);
		this.validateOptions();
		const canvas = this._canvas;
		if (canvas) {
			// if node or canvas is not found, don't die
			this._canvasCtx = canvas.getContext('2d');
		}
		const threadDim = this.threadDim = utils.clone(this.output);

		while (threadDim.length < 3) {
			threadDim.push(1);
		}

		if (this.graphical) {
			const canvas = this._canvas;
			if (!canvas) {
				throw new Error('no canvas available for using graphical output');
			}
			canvas.width = threadDim[0];
			canvas.height = threadDim[1];
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
			output: threadDim,
			debug: this.debug,
			loopMaxIterations: this.loopMaxIterations,
			paramNames: this.paramNames,
			paramTypes: this.paramTypes,
			paramSizes: this.paramSizes,
			constantTypes: this.constantTypes
		});

		builder.addFunctions(this.functions, {
			constants: this.constants,
			output: threadDim
		});

		builder.addNativeFunctions(this.nativeFunctions);

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

		let prototypes = builder.getPrototypes('kernel');
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
		var LOOP_MAX = ${ this._getLoopMaxString() }
		var constants = this.constants;
		var _this = this;
    return function (${ this.paramNames.map(paramName => 'user_' + paramName).join(', ') }) {
      ${ this._processConstants() }
      ${ this._processParams() }
      ${ this._kernelLoop(kernel) }
      if (this.graphical) {
        this._imageData.data.set(this._colorData);
        this._canvasCtx.putImageData(this._imageData, 0, 0);
        return;
      }
      ${ this._kernelOutput() }
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

	_processConstants() {
		if (!this.constants) return '';

		const result = [];
		for (let p in this.constants) {
			const type = this.constantTypes[p];
			switch (type) {
				case 'HTMLImage':
					result.push(`  var constants_${p} = this._imageTo2DArray(this.constants.${p})`);
					break;
				case 'HTMLImageArray':
					result.push(`  var constants_${p} = this._imageTo3DArray(this.constants.${p})`);
					break;
				case 'Input':
					result.push(`  var constants_${p} = this.constants.${p}.value`);
					break;
				default:
					result.push(`  var constants_${p} = this.constants.${p}`);
			}
		}
		return result.join('\n');
	}

	_processParams() {
		const result = [];
		for (let i = 0; i < this.paramTypes.length; i++) {
			switch (this.paramTypes[i]) {
				case 'HTMLImage':
					result.push(`  user_${this.paramNames[i]} = this._imageTo2DArray(user_${this.paramNames[i]})`);
					break;
				case 'HTMLImageArray':
					result.push(`  user_${this.paramNames[i]} = this._imageTo3DArray(user_${this.paramNames[i]})`);
					break;
				case 'Input':
					result.push(`  user_${this.paramNames[i]} = user_${this.paramNames[i]}.value`);
					break;
			}
		}
		return result.join(';\n');
	}

	_imageTo2DArray(image) {
		const canvas = this._canvas;
		if (canvas.width < image.width) {
			canvas.width = image.width;
		}
		if (canvas.height < image.height) {
			canvas.height = image.height;
		}
		const ctx = this._canvasCtx;
		ctx.drawImage(image, 0, 0, image.width, image.height);
		const pixelsData = ctx.getImageData(0, 0, image.width, image.height).data;
		const imageArray = new Array(image.height);
		let index = 0;
		for (let y = image.height - 1; y >= 0; y--) {
			imageArray[y] = new Array(image.width);
			for (let x = 0; x < image.width; x++) {
				const r = pixelsData[index++] / 255;
				const g = pixelsData[index++] / 255;
				const b = pixelsData[index++] / 255;
				const a = pixelsData[index++] / 255;
				const result = [r, g, b, a];
				result.r = r;
				result.g = g;
				result.b = b;
				result.a = a;
				imageArray[y][x] = result;
			}
		}
		return imageArray;
	}

	_imageTo3DArray(images) {
		const imagesArray = new Array(images.length);
		for (let i = 0; i < images.length; i++) {
			imagesArray[i] = this._imageTo2DArray(images[i]);
		}
		return imagesArray;
	}

	_kernelLoop(kernelString) {
		switch (this.output.length) {
			case 1:
				return this._kernel1DLoop(kernelString);
			case 2:
				return this._kernel2DLoop(kernelString);
			case 3:
				return this._kernel3DLoop(kernelString);
			default:
				throw new Error('unsupported size kernel');
		}
	}

	_kernel1DLoop(kernelString) {
		const threadDim = this.threadDim;
		return `
    var result = new Float32Array(${ threadDim[0] });
    ${ this._mapSubKernels(name => `var result_${ name } = new Float32Array(${ threadDim[0] });\n`).join('') }
    for (var x = 0; x < ${ threadDim[0] }; x++) {
      this.thread.x = x;
      this.thread.y = 0;
      this.thread.z = 0;
      var kernelResult;
      ${ kernelString }
      result[x] = kernelResult;
      ${ this._mapSubKernels(name => `result_${ name }[x] = ${ name };\n`).join('') }
    }`;
	}

	_kernel2DLoop(kernelString) {
		const threadDim = this.threadDim;
		return `
    var result = new Array(${ threadDim[1] });
    ${ this._mapSubKernels(name => `var result_${ name } = new Array(${ threadDim[1] });\n`).join('') }
    for (var y = 0; y < ${ threadDim[1] }; y++) {
      this.thread.z = 0;
      this.thread.y = y;
      var resultX = result[y] = new Float32Array(${ threadDim[0] });
      ${ this._mapSubKernels(name => `var result_${ name }X = result_${name}[y] = new Float32Array(${ threadDim[0] });\n`).join('') }
      for (var x = 0; x < ${ threadDim[0] }; x++) {
      	this.thread.x = x;
        var kernelResult;
        ${ kernelString }
        resultX[x] = kernelResult;
        ${ this._mapSubKernels(name => `result_${ name }X[x] = ${ name };\n`).join('') }
      }
    }`;
	}

	_kernel3DLoop(kernelString) {
		const threadDim = this.threadDim;
		return `
    var result = new Array(${ threadDim[2] });
    ${ this._mapSubKernels(name => `var result_${ name } = new Array(${ threadDim[2] });\n`).join('') }
    for (var z = 0; z < ${ threadDim[2] }; z++) {
      this.thread.z = z;
      var resultY = result[z] = new Array(${ threadDim[1] });
      ${ this._mapSubKernels(name => `var result_${ name }Y = result_${name}[z] = new Array(${ threadDim[1] });\n`).join('') }
      for (var y = 0; y < ${ threadDim[1] }; y++) {
        this.thread.y = y;
        var resultX = resultY[y] = new Float32Array(${ threadDim[0] });
        ${ this._mapSubKernels(name => `var result_${ name }X = result_${name}Y[y] = new Float32Array(${ threadDim[0] });\n`).join('') }
        for (var x = 0; x < ${ threadDim[0] }; x++) {
        	this.thread.x = x;
          var kernelResult;
          ${ kernelString }
          resultX[x] = kernelResult;
          ${ this._mapSubKernels(name => `result_${ name }X[x] = ${ name };\n`).join('') }
        }
      }
    }`;
	}

	_kernelOutput() {
		if (!this.subKernelOutputVariableNames) {
			return 'return result;';
		}
		return `return {
      result: result,
      ${ Object.keys(this.subKernelProperties || this.subKernelOutputVariableNames).map((name, i) => `${ name }: result_${ this.subKernelOutputVariableNames[i] }`).join(',\n') }
    };`;
	}

	_mapSubKernels(fn) {
		return this.subKernelOutputVariableNames === null ? [''] :
			this.subKernelOutputVariableNames.map(fn);
	}
};