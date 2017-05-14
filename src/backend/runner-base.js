const utils = require('../utils');
const kernelRunShortcut = require('./kernel-run-shortcut');

///
/// Class: Base
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
module.exports = class BaseRunner {
	constructor(functionBuilder, settings) {
		settings = settings || {};
		this.kernel = settings.kernel;
		this.canvas = settings.canvas;
		this.webGl = settings.webGl;
		this.fn = null;
		this.functionBuilder = functionBuilder;
		this.fnString = null;
		this.endianness = utils.systemEndianness;
		this.functionBuilder.polyfillStandardFunctions();
	}

	textureToArray(texture) {
		const copy = this.createKernel(function(x) {
			return x[this.thread.z][this.thread.y][this.thread.x];
		});

		return copy(texture);
	}

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

	get mode() {
		throw new Error('"mode" not implemented on BaseRunner');
	}

	///
	/// Get and returns the Synchronous executor, of a class and kernel
	/// Which returns the result directly after passing the arguments.
	///
	buildKernel(fn, settings) {
		settings = Object.assign({}, settings || {});
		const fnString = fn.toString();
		if (!utils.isFunctionString(fnString)) {
			throw 'Unable to get body of kernel function';
		}

		if (!settings.functionBuilder) {
			settings.functionBuilder = this.functionBuilder;
		}

		if (!settings.canvas) {
			settings.canvas = this.canvas;
		}

		if (!settings.webGl) {
			settings.webGl = this.webGl;
		}

		return kernelRunShortcut(new this.Kernel(fnString, settings));
	}
};