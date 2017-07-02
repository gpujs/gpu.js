const utils = require('../core/utils');

///
/// Class: BaseKernel
///
/// Implements the base class for Kernels, and is used as a 
/// parent class for all Kernel implementations.
///
/// This contains the basic methods needed by all Kernel implementations, 
/// like setDimensions, addSubKernel, etc.
///
/// Properties:
///		paramNames 						- {Array}      Name of the parameters of the kernel function
///		fnString   						- {String} 	   Kernel function as a String
///		dimensions 						- {Array} 	   Dimensions of the kernel function, this.thread.x, etc.
///		debug   						- {Boolean}    Toggle debug mode
///		graphical   					- {String} 	   Toggle graphical mode
///		loopMaxIterations  				- {Number} 	   Maximum number of loop iterations
///		constants   					- {Object} 	   Global constants
///		subKernels   					- {Array} 	   Sub kernels bound to this kernel instance
///		subKernelProperties 			- {Object} 	   Sub kernels bound to this kernel instance as key/value pairs
///		subKernelOutputVariableNames   	- {Array} 	   Names of the variables outputted by the subkerls
///
module.exports = class BaseKernel {

	///
	/// Function: BaseKernel
	///
	/// [Constructor] Blank constructor, which initializes the properties
	///
	constructor(fnString, settings) {
		this.paramNames = utils.getParamNamesFromString(fnString);
		this.fnString = fnString;
		this.dimensions = [];
		this.debug = false;
		this.graphical = false;
		this.loopMaxIterations = 0;
		this.constants = null;
		this.wraparound = null;
		this.hardcodeConstants = null;
		this.outputToTexture = null;
		this.texSize = null;
		this._canvas = null;
		this._webGl = null;
		this.threadDim = null;
		this.floatTextures = null;
		this.floatOutput = null;
		this.floatOutputForce = null;
		this.addFunction = null;
		this.copyData = true;
		this.subKernels = null;
		this.subKernelProperties = null;
		this.subKernelNames = null;
		this.subKernelOutputVariableNames = null;

		for (let p in settings) {
			if (!settings.hasOwnProperty(p) || !this.hasOwnProperty(p)) continue;
			this[p] = settings[p];
		}
		if (settings.hasOwnProperty('canvas')) {
			this._canvas = settings.canvas;
		}

		if (!this._canvas) this._canvas = utils.initCanvas();
	}

	build() {
		throw new Error('"build" not defined on Base');
	}

	setAddFunction(cb) {
		this.addFunction = cb;
		return this;
	}

	///
	/// Function: setDimensions
	///
	/// Set dimensions of the kernel function
	///
	/// Parameters:
	/// 	dimensions      - {Array}       The dimensions array set the dimensions to
	///
	setDimensions(dimensions) {
		this.dimensions = dimensions;
		return this;
	}

	///
	/// Function: setDebug
	///
	/// Toggle debug mode
	///
	/// Parameters:
	/// 	flag      - {Boolean}       true to enable debug
	///
	setDebug(flag) {
		this.debug = flag;
		return this;
	}

	///
	/// Function: setGraphical
	///
	/// Toggle graphical output mode
	///
	/// Parameters:
	/// 	flag      - {Boolean}       true to enable graphical output
	///
	setGraphical(flag) {
		this.graphical = flag;
		return this;
	}

	///
	/// Function: setLoopMaxIterations
	///
	/// Set the maximum number of loop iterations
	///
	/// Parameters:
	/// 	max      - {Number}       iterations count
	///
	setLoopMaxIterations(max) {
		this.loopMaxIterations = max;
		return this;
	}

	///
	/// Function: setConstants
	///
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

	///
	/// Function: setFloatTextures
	///
	/// Toggle texture output mode
	///
	/// Parameters:
	/// 	flag      - {Boolean}       true to enable floatTextures
	///
	setFloatTextures(flag) {
		this.floatTextures = flag;
		return this;
	}

	///
	/// Function: setFloatOutput
	///
	/// Toggle output mode
	///
	/// Parameters:
	/// 	flag      - {Boolean}       true to enable float
	///
	setFloatOutput(flag) {
		this.floatOutput = flag;
		return this;
	}

	setFloatOutputForce(flag) {
		this.floatOutputForce = flag;
		return this;
	}

	///
	/// Function: setCanvas
	///
	/// Bind the canvas to kernel
	/// 
	/// Parameters:
	/// 	canvas     - {Canvas}        Canvas to bind
	///
	setCanvas(canvas) {
		this._canvas = canvas;
		return this;
	}

	///
	/// Function: setCanvas
	///
	/// Bind the webGL instance to kernel
	/// 
	/// Parameters:
	/// 	webGL     - {Canvas}        webGL instance to bind
	///
	setWebGl(webGl) {
		this._webGl = webGl;
		return this;
	}

	setCopyData(copyData) {
		this.copyData = copyData;
		return this;
	}

	///
	/// Function: getCanvas()
	///
	/// Returns the current canvas instance bound to the kernel
	///
	getCanvas() {
		return this._canvas;
	}

	///
	/// Function: getWebGl()
	///
	/// Returns the current webGl instance bound to the kernel
	///
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

	/// Function: addSubKernel
	///
	/// Add a sub kernel to the root kernel instance.
	/// This is what `createKernels` uses.
	///
	/// Parameters:
	/// 	fnString      - {String}       function (as a String) of the subKernel to add
	///
	addSubKernel(fnString) {
		if (this.subKernels === null) {
			this.subKernels = [];
			this.subKernelNames = [];
		}
		this.subKernels.push(fnString);
		this.subKernelNames.push(utils.getFunctionNameFromString(fnString));
		return this;
	}

	/// Function: addSubKernelProperty
	///
	/// Add a sub kernel to the root kernel instance, indexed by a property name
	/// This is what `createKernels` uses.
	///
	/// Parameters:
	/// 	property      - {String}       property key for the subKernel
	/// 	fnString      - {String}       function (as a String) of the subKernel to add
	///
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
};