'use strict';

const utils = require('../core/utils');
const kernelRunShortcut = require('./kernel-run-shortcut');
const features = {};

/**
 * @desc Represents the 'private/protected' namespace of the GPU class
 * @prop {Object} settings - Settings object used to set Dimensions, etc.
 * @prop {String} kernel - Current kernel instance
 * @prop {Object} canvas - Canvas instance attached to the kernel
 * @prop {Object} webGl - WebGl instance attached to the kernel
 * @prop {Function} fn - Kernel function to run
 * @prop {Object} functionBuilder - FunctionBuilder instance
 * @prop {String} fnString - Kernel function (as a String)
 * @prop {String} endianness - endian information like Little-endian, Big-endian.
 *
 */
class Runner {
	static get isCompatible() {
		return false;
	}
	static isRelatedContext(context) {
		throw new Error('"isRelatedContext" not implemented on Runner');
	}
	constructor(functionBuilder, settings) {
		settings = settings || {};
		this.kernel = settings.kernel;
		this.canvas = settings.canvas;
		this.webGl = settings.webGl;
		this.fn = null;
		this.functionBuilder = functionBuilder;
		this.fnString = null;
		this.endianness = utils.systemEndianness();
	}

	/**
	 * @desc Converts the provided Texture instance to a JavaScript Array
	 * @param {Object} texture - Texture Object
	 */
	textureToArray(texture) {
		const copy = this.createKernel(function(x) {
			return x[this.thread.z][this.thread.y][this.thread.x];
		});

		return copy(texture);
	}

	/**
	 * @name deleteTexture
	 * @desc Deletes the provided Texture instance
	 * @param {Object} texture - Texture Object
	 */
	deleteTexture(texture) {
		this.webGl.deleteTexture(texture.texture);
	}

	/**
	 * @desc Get and returns the ASYNCHRONOUS executor, of a class and kernel
	 * This returns a Promise object from an argument set.
	 * Note that there is no current implementation.
	 */
	buildPromiseKernel() {
		throw new Error('not yet implemented');
	}

	getMode() {
		throw new Error('"mode" not implemented on Runner');
	}

	/**
	 * @desc Get and returns the Synchronous executor, of a class and kernel
	 * Which returns the result directly after passing the arguments.
	 */
	buildKernel(fn, settings) {
		settings = Object.assign({}, settings || {});
		const fnString = fn.toString();
		if (!settings.functionBuilder) {
			settings.functionBuilder = this.functionBuilder;
		}

		if (!settings.features) {
			settings.features = this.features;
		}

		if (!settings.canvas && this.canvas) {
			settings.canvas = this.canvas;
		}

		if (!settings.webGl && this.webGl) {
			settings.webGl = this.webGl;
		}

		return kernelRunShortcut(new this.Kernel(fnString, settings));
	}

	get features() {
		if (!features[this.constructor.name]) {
			features[this.constructor.name] = this.getFeatures();
		}
		return features[this.constructor.name];
	}

	getFeatures() {
		return Object.freeze({});
	}
}

module.exports = Runner;