'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var utils = require('../core/utils');
var kernelRunShortcut = require('./kernel-run-shortcut');

module.exports = function () {

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

	function BaseRunner(functionBuilder, settings) {
		_classCallCheck(this, BaseRunner);

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


	_createClass(BaseRunner, [{
		key: 'textureToArray',
		value: function textureToArray(texture) {
			var copy = this.createKernel(function (x) {
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

	}, {
		key: 'deleteTexture',
		value: function deleteTexture(texture) {
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

	}, {
		key: 'buildPromiseKernel',
		value: function buildPromiseKernel() {
			throw new Error('not yet implemented');
		}
	}, {
		key: 'getMode',
		value: function getMode() {
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

	}, {
		key: 'buildKernel',
		value: function buildKernel(fn, settings) {
			settings = Object.assign({}, settings || {});
			var fnString = fn.toString();
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
	}]);

	return BaseRunner;
}();