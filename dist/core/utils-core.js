'use strict';

/**
 *
 * @desc Reduced subset of Utils, used exclusively in gpu-core.js
 * Various utility functions / snippets of code that GPU.JS uses internally.\
 * This covers various snippets of code that is not entirely gpu.js specific (ie. may find uses elsewhere)
 *
 * Note that all methods in this class is 'static' by nature `UtilsCore.functionName()`
 *
 * @class UtilsCore
 *
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var UtilsCore = function () {
	function UtilsCore() {
		_classCallCheck(this, UtilsCore);
	}

	_createClass(UtilsCore, null, [{
		key: 'isCanvas',


		/**
   * @typedef {Object} webGlContext
   */

		/**
   * @typedef {Object} CanvasDOMObject
   */

		//-----------------------------------------------------------------------------
		//
		//  Canvas validation and support
		//
		//-----------------------------------------------------------------------------

		/**
   * @name isCanvas
   * @static
   * @function
   * @memberOf UtilsCore
   *
   *
   * @desc Return TRUE, on a valid DOM canvas object
   *
   * Note: This does just a VERY simply sanity check. And may give false positives.
   *
   * @param {CanvasDOMObject} canvasObj - Object to validate
   *
   * @returns {Boolean} TRUE if the object is a DOM canvas
   *
   */
		value: function isCanvas(canvasObj) {
			return canvasObj !== null && canvasObj.nodeName && canvasObj.getContext && canvasObj.nodeName.toUpperCase() === 'CANVAS';
		}

		/**
   * @name isCanvasSupported
   * @function
   * @static
   * @memberOf UtilsCore
   *
   * @desc Return TRUE, if browser supports canvas
   *
   * @returns {Boolean} TRUE if browser supports canvas
   *
   */

	}, {
		key: 'isCanvasSupported',
		value: function isCanvasSupported() {
			return _isCanvasSupported;
		}

		/**
   * @name initCanvas
   * @function
   * @static
   * @memberOf UtilsCore
   *
   * @desc Initiate and returns a canvas, for usage in init_webgl.
   * Returns only if canvas is supported by browser.
   *
   * @returns {CanvasDOMObject} CanvasDOMObject if supported by browser, else null
   *
   */

	}, {
		key: 'initCanvas',
		value: function initCanvas() {
			// Fail fast if browser previously detected no support
			if (!_isCanvasSupported) {
				return null;
			}

			// Create a new canvas DOM
			var canvas = document.createElement('canvas');

			// Default width and height, to fix webgl issue in safari
			canvas.width = 2;
			canvas.height = 2;

			// Returns the canvas
			return canvas;
		}

		//-----------------------------------------------------------------------------
		//
		//  Webgl validation and support
		//
		//-----------------------------------------------------------------------------


		/**
   *
   * @name isWebGl
   * @function
   * @static
   * @memberOf UtilsCore
   *
   * @desc Return TRUE, on a valid webGlContext object
   *
   * Note: This does just a VERY simply sanity check. And may give false positives.
   *
   * @param {webGlContext} webGlObj - Object to validate
   *
   * @returns {Boolean} TRUE if the object is a webGlContext object
   *
   */

	}, {
		key: 'isWebGl',
		value: function isWebGl(webGlObj) {
			return webGlObj && typeof webGlObj.getExtension === 'function';
		}

		/**
   * @name isWebGlSupported
   * @function
   * @static
   * @memberOf UtilsCore
   *
   * @desc Return TRUE, if browser supports webgl
   *
   * @returns {Boolean} TRUE if browser supports webgl
   *
   */

	}, {
		key: 'isWebGlSupported',
		value: function isWebGlSupported() {
			return _isWebGlSupported;
		}
	}, {
		key: 'isWebGlDrawBuffersSupported',
		value: function isWebGlDrawBuffersSupported() {
			return _isWebGlDrawBuffersSupported;
		}

		// Default webgl options to use

	}, {
		key: 'initWebGlDefaultOptions',
		value: function initWebGlDefaultOptions() {
			return {
				alpha: false,
				depth: false,
				antialias: false
			};
		}

		/**
   * @name initWebGl
   * @function
   * @static
   * @memberOf UtilsCore
   *
   * @desc Initiate and returns a webGl, from a canvas object
   * Returns only if webGl is supported by browser.
   *
   * @param {CanvasDOMObject} canvasObj - Object to validate
   *
   * @returns {CanvasDOMObject} CanvasDOMObject if supported by browser, else null
   *
   */

	}, {
		key: 'initWebGl',
		value: function initWebGl(canvasObj) {

			// First time setup, does the browser support check memorizer
			if (typeof _isCanvasSupported !== 'undefined' || canvasObj === null) {
				if (!_isCanvasSupported) {
					return null;
				}
			}

			// Fail fast for invalid canvas object
			if (!UtilsCore.isCanvas(canvasObj)) {
				throw new Error('Invalid canvas object - ' + canvasObj);
			}

			// Create a new canvas DOM
			var webGl = canvasObj.getContext('experimental-webgl', UtilsCore.initWebGlDefaultOptions()) || canvasObj.getContext('webgl', UtilsCore.initWebGlDefaultOptions());

			if (webGl) {
				// Get the extension that is needed
				webGl.OES_texture_float = webGl.getExtension('OES_texture_float');
				webGl.OES_texture_float_linear = webGl.getExtension('OES_texture_float_linear');
				webGl.OES_element_index_uint = webGl.getExtension('OES_element_index_uint');
			}

			// Returns the canvas
			return webGl;
		}

		/**
   * @name initWebGl2
   * @function
   * @static
   * @memberOf UtilsCore
   *
   * @desc Initiate and returns a webGl, from a canvas object
   * Returns only if webGl is supported by browser.
   *
   * @param {CanvasDOMObject} canvasObj - Object to validate
   *
   * @returns {CanvasDOMObject} CanvasDOMObject if supported by browser, else null
   *
   */

	}, {
		key: 'initWebGl2',
		value: function initWebGl2(canvasObj) {

			// First time setup, does the browser support check memorizer
			if (typeof _isCanvasSupported !== 'undefined' || canvasObj === null) {
				if (!_isCanvasSupported) {
					return null;
				}
			}

			// Fail fast for invalid canvas object
			if (!UtilsCore.isCanvas(canvasObj)) {
				throw new Error('Invalid canvas object - ' + canvasObj);
			}

			// Create a new canvas DOM
			return canvasObj.getContext('webgl2', UtilsCore.initWebGlDefaultOptions());
		}

		/**
   * @function
   * @static
   * @memberOf UtilsCore
   * @param {number[]} output
   * @throws if not correctly defined
   */

	}, {
		key: 'checkOutput',
		value: function checkOutput(output) {
			for (var i = 0; i < output.length; i++) {
				if (isNaN(output[i]) || output[i] < 1) {
					throw new Error('kernel.output[' + i + '] incorrectly defined as `' + output[i] + '`, needs to be numeric, and greater than 0');
				}
			}
		}
	}]);

	return UtilsCore;
}();

//-----------------------------------------------------------------------------
//
//  Canvas & Webgl validation and support constants
//
//-----------------------------------------------------------------------------

var _isCanvasSupported = typeof document !== 'undefined' ? UtilsCore.isCanvas(document.createElement('canvas')) : false;
var _testingWebGl = UtilsCore.initWebGl(UtilsCore.initCanvas());
var _isWebGlSupported = UtilsCore.isWebGl(_testingWebGl);
var _isWebGlDrawBuffersSupported = _isWebGlSupported && Boolean(_testingWebGl.getExtension('WEBGL_draw_buffers'));

if (_isWebGlSupported) {
	UtilsCore.OES_texture_float = _testingWebGl.OES_texture_float;
	UtilsCore.OES_texture_float_linear = _testingWebGl.OES_texture_float_linear;
	UtilsCore.OES_element_index_uint = _testingWebGl.OES_element_index_uint;
} else {
	UtilsCore.OES_texture_float = false;
	UtilsCore.OES_texture_float_linear = false;
	UtilsCore.OES_element_index_uint = false;
}

module.exports = UtilsCore;