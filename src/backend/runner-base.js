'use strict';

const utils = require('../core/utils');
const kernelRunShortcut = require('./kernel-run-shortcut');

module.exports = class BaseRunner {

	/**
	 * @constructor BaseRunner
	 *
	 * @desc Represents the 'private/protected' namespace of the GPU class
	 *
	 * <p>I know @private makes more sense, but since the documentation engine state is undetirmined.
	 * (See https://github.com/gpujs/gpu.js/issues/19 regarding documentation engine issue)
	 * File isolation is currently the best way to go. </p>
	 *
	 * *base.js* internal functions namespace <br>
	 * *gpu.js* PUBLIC function namespace <br>
	 *
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
	 * @memberOf BaseRunner#
	 * @function
	 * @name textureToArray
	 *
	 * @desc Converts the provided Texture instance to a JavaScript Array
	 *
	 * @param {Object} texture - Texture Object
	 *
	 */
	textureToArray(texture) {
		const copy = this.createKernel(function(x) {
			return x[this.thread.z][this.thread.y][this.thread.x];
		});

		return copy(texture);
	}

	/**
	 * @memberOf BaseRunner#
	 * @function
	 *
	 * @name deleteTexture
	 *
	 * @desc Deletes the provided Texture instance
	 *
	 * @param {Object} texture - Texture Object
	 */
	deleteTexture(texture) {
		this.webGl.deleteTexture(texture.texture);
	}

	/**
	 * @memberOf BaseRunner#
	 * @function
	 * @name buildPromiseKernel
	 *
	 * @desc Get and returns the ASYNCHRONOUS executor, of a class and kernel
	 * This returns a Promise object from an argument set.
	 *
	 * Note that there is no current implementation.
	 *
	 */
	buildPromiseKernel() {
		throw new Error('not yet implemented');
	}

	getMode() {
		throw new Error('"mode" not implemented on BaseRunner');
	}

	/**
	 * @memberOf BaseRunner#
	 * @function
	 *
	 * @name buildKernel
	 *
	 * @desc Get and returns the Synchronous executor, of a class and kernel
	 * Which returns the result directly after passing the arguments.
	 *
	 */
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