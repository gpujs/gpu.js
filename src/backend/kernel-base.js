'use strict';

const utils = require('../core/utils');

module.exports = class BaseKernel {

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
	constructor(fnString, settings) {
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
    this.events = {};
		for (let p in settings) {
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

	build() {
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
	setupParams(args) {
		const paramTypes = this.paramTypes = [];
		for (let i = 0; i < args.length; i++) {
			const param = args[i];
			const paramType = utils.getArgumentType(param);
			paramTypes.push(paramType);
		}
	}

	setAddFunction(cb) {
		this.addFunction = cb;
		return this;
	}

	setFunctions(functions) {
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
	setOutput(output) {
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
	setDebug(flag) {
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
	setGraphical(flag) {
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
	setLoopMaxIterations(max) {
		this.loopMaxIterations = max;
		return this;
	}

	/**
	 * @memberOf BaseKernel#
	 * @function
	 * @name setConstants
	 * @desc Set Constants
	 */
	setConstants(constants) {
		this.constants = constants;
		return this;
	}

	setWraparound(flag) {
		console.warn('Wraparound mode is not supported and undocumented.');
		this.wraparound = flag;
		return this;
	}

	setHardcodeConstants(flag) {
		this.hardcodeConstants = flag;
		return this;
	}

	setOutputToTexture(flag) {
		this.outputToTexture = flag;
		return this;
	}

	setOutputImmutable(flag) {
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
	setFloatTextures(flag) {
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
	setFloatOutput(flag) {
		this.floatOutput = flag;
		return this;
	}

	setFloatOutputForce(flag) {
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
	setCanvas(canvas) {
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
	setWebGl(webGl) {
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
	getCanvas() {
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
	getWebGl() {
		return this._webGl;
	}

	validateOptions() {
		throw new Error('validateOptions not defined');
	}

	exec() {
		return this.execute.apply(this, arguments);
	}

	execute() {
		//
		// Prepare the required objects
		//
		const args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments));

		//
		// Setup and return the promise, and execute the function, in synchronous mode
		//
		return utils.newPromise((accept, reject) => {
			try {
				accept(this.run.apply(this, args));
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
	addSubKernel(fnString) {
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
	addSubKernelProperty(property, fnString) {
		if (this.subKernelProperties === null) {
			this.subKernelProperties = {};
			this.subKernelNames = [];
		}
		if (this.subKernelProperties.hasOwnProperty(property)) {
			throw new Error(`cannot add sub kernel ${ property }, already defined`);
		}
		this.subKernelProperties[property] = fnString;
		this.subKernelNames.push(utils.getFunctionNameFromString(fnString));
		return this;
	}

	addNativeFunction(name, source) {
		this.functionBuilder.addNativeFunction(name, source);
	}

  addNativeVariable(name, variable) {
	  this.functionBuilder.addNativeVariable(name, variable);
  }

	on(eventName, fn) {
    if (!this.events.hasOwnProperty(eventName)) {
      this.events[eventName] = [];
    }
	  this.events[eventName].push(fn);
  }

  off(eventName, fn) {
    if (!this.events.hasOwnProperty(eventName)) return;
	  if (!fn) {
	    delete this.events[eventName];
    } else {
      const events = this.events[eventName];
	    const index = events.indexOf(fn);
	    if (index > -1) {
	      events.splice(index, 1);
      }
    }
  }

	trigger(eventName) {
	  if (!this.events.hasOwnProperty(eventName)) return;
    const events = this.events[eventName];
    for (let i = 0; i < events.length; i++) {
      events[i]();
    }
  }
};