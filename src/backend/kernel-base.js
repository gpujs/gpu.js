const utils = require('../utils');
const WebGLFunctionNode = require('./web-gl/function-node');
const WebGLFunctionBuilder = require('./web-gl/function-builder');

module.exports = class BaseKernel {
	constructor(fnString, settings) {
		this.paramNames = utils.getParamNamesFromString(fnString);
		this.fnString = fnString;
		this.dimensions = [];
		this.debug = false;
		this.graphical = false;
		this.loopMaxIterations = 0;
		this.constants = 0;
		this.wraparound = null;
		this.hardcodeConstants = null;
		this.outputToTexture = null;
		this.texSize = null;
		this.canvas = null;
		this.webGl = null;
		this.threadDim = null;
		this.floatTextures = null;
		this.floatOutput = null;
		this.floatOutputForce = null;
		this.addFunction = null;

		for (let p in settings) {
			if (!settings.hasOwnProperty(p) || !this.hasOwnProperty(p)) continue;
			this[p] = settings[p];
		}

		if (!this.canvas) this.canvas = utils.initCanvas();
	}

	build() {
		throw new Error('"build" not defined on Base');
	}

	setAddFunction(cb) {
		this.addFunction = cb;
		return this;
	}

	setDimensions(dimensions) {
		this.dimensions = dimensions;
		return this;
	}

	setDebug(flag) {
		this.debug = flag;
		return this;
	}

	setGraphical(flag) {
		this.graphical = flag;
		return this;
	}

	setLoopMaxIterations(max) {
		this.loopMaxIterations = max;
		return this;
	}

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

	setFloatTextures(flag) {
		this.floatTextures = flag;
		return this;
	}

	setFloatOutput(flag) {
		this.floatOutput = flag;
		return this;
	}

	setFloatOutputForce(flag) {
		this.floatOutputForce = flag;
		return this;
	}

	getCanvas() {
		return this.canvas;
	}

	getWebgl() {
		return this.webGl;
	}

	validateOptions() {
		throw new Error('validateOptions not defined');
	}

	///
	/// Function: precompileKernelObj
	///
	/// Precompiles the kernel object, this is used by GPUCore
	///
	/// @param   Input types to support as an array
	///          With the following types "Array", "Texture", "Number"
	///
	/// @return  The precompiled kernel object
	///
	exportKernelObj(paramType) {

		// Currently this relies on WebGLFunctionBuilder
		// Eventually this will be generalised into the base function-builder
		if(this.functionBuilder == null) {
			this.functionBuilder = new WebGLFunctionBuilder();
		}

		// Setup return object with basic options, jsFunction and param types
		var ret = {};
		ret.opt = this.opt;

		// Get the JS kernel string, and parameter types
		ret.jsKernel = this.fnString;
		ret.paramNames = utils.getParamNamesFromString(this.fnString);
		ret.paramType = paramType;

		// Setup the kernel node to run
		const builder = this.functionBuilder;
		const kernelNode = new WebGLFunctionNode('kernel', this.fnString);
		kernelNode.setAddFunction(builder.addFunction.bind(builder));
		kernelNode.paramNames = this.paramNames;
		//kernelNode.paramType = paramType;
		kernelNode.isRootKernel = true;
		builder.addFunctionNode(kernelNode);

		// Lets spit out those processed webgl headers and codes
		ret.glHeaders = builder.getPrototypeString("kernel", ret.opt);
		ret.glKernel = builder.getString("kernel", ret.opt);

		// Returns the result set
		return ret;
	}
};