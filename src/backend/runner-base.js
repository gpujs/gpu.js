const utils = require('../core/utils');
const kernelRunShortcut = require('./kernel-run-shortcut');

///
/// Class: BaseRunner
///
/// Represents the 'private/protected' namespace of the GPU class
///
/// *base.js* internal functions namespace
/// *gpu.js* PUBLIC function namespace
///
/// I know @private makes more sense, but since the documentation engine state is undetirmined.
/// (See https://github.com/gpujs/gpu.js/issues/19 regarding documentation engine issue)
/// File isolation is currently the best way to go
///
///
/// Properties:
///		settings 				- {Object}      		Settings object used to set Dimensions, etc.
///		kernel   				- {String} 	   			Current kernel instance
///		canvas 					- {Object} 	   			Canvas instance attached to the kernel
///		webGl   				- {Object}     			WebGl instance attached to the kernel
///		fn   					- {Function} 			Kernel function to run
///		functionBuilder  		- {Object} 				FunctionBuilder instance
///		fnString   				- {String} 	   			Kernel function (as a String)
///		endianness   			- {String} 	   			endian information like Little-endian, Big-endian.
///

module.exports = class BaseRunner {

	///
	/// Function: BaseRunner
	///
	/// [Constructor] Blank constructor, which initializes the properties related to runner
	///
	constructor(functionBuilder, settings) {
		settings = settings || {};
		this.kernel = settings.kernel;
		this.canvas = settings.canvas;
		this.webGl = settings.webGl;
		this.fn = null;
		this.functionBuilder = functionBuilder;
		this.fnString = null;
		this.endianness = utils.systemEndianness();
		this.functionBuilder.polyfillStandardFunctions();
	}

	///
	/// Function: textureToArray
	///
	/// Converts the provided Texture instance to a JavaScript Array 
	///	
	/// Parameters: 
	/// 	texture      - {Object}
	///
	textureToArray(texture) {
		const copy = this.createKernel(function(x) {
			return x[this.thread.z][this.thread.y][this.thread.x];
		});

		return copy(texture);
	}

	///
	/// Function: deleteTexture
	///
	/// Deletes the provided Texture instance 
	///
	/// Parameters: 
	/// 	texture      - {Object}
	deleteTexture(texture) {
		this.webGl.deleteTexture(texture.texture);
	}

	///
	/// Get and returns the ASYNCHRONOUS executor, of a class and kernel
	/// This returns a Promise object from an argument set.
	///
	/// Note that there is no current implementation.
	///
	buildPromiseKernel() {
		throw new Error('not yet implemented');
	}

	getMode() {
		throw new Error('"mode" not implemented on BaseRunner');
	}

	///
	/// Get and returns the Synchronous executor, of a class and kernel
	/// Which returns the result directly after passing the arguments.
	///
	buildKernel(fn, settings) {
		settings = Object.assign({}, settings || {});
		const fnString = fn.toString();
		if (!settings.functionBuilder) {
			settings.functionBuilder = this.functionBuilder;
		}

		if (!settings.canvas) {
			settings.canvas = this.canvas;
		}

		if (!settings.webGl) {
			settings.webGl = this.webgl;
		}

		return kernelRunShortcut(new this.Kernel(fnString, settings));
	}
};