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

class UtilsCore {

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
	static isCanvas(canvasObj) {
		return (
			canvasObj !== null &&
			canvasObj.nodeName &&
			canvasObj.getContext &&
			canvasObj.nodeName.toUpperCase() === 'CANVAS'
		);
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
	static isCanvasSupported() {
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
	static initCanvas() {
		// Fail fast if browser previously detected no support
		if (!_isCanvasSupported) {
			return null;
		}

		// Create a new canvas DOM
		const canvas = document.createElement('canvas');

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
	static isWebGl(webGlObj) {
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
	static isWebGlSupported() {
		return _isWebGlSupported;
	}

	static isWebGlDrawBuffersSupported() {
		return _isWebGlDrawBuffersSupported;
	}

	// Default webgl options to use
	static initWebGlDefaultOptions() {
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
	static initWebGl(canvasObj) {

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
		const webGl = (
			canvasObj.getContext('experimental-webgl', UtilsCore.initWebGlDefaultOptions()) ||
			canvasObj.getContext('webgl', UtilsCore.initWebGlDefaultOptions())
		);

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
	static initWebGl2(canvasObj) {

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
}

//-----------------------------------------------------------------------------
//
//  Canvas & Webgl validation and support constants
//
//-----------------------------------------------------------------------------

const _isCanvasSupported = typeof document !== 'undefined' ? UtilsCore.isCanvas(document.createElement('canvas')) : false;
const _testingWebGl = UtilsCore.initWebGl(UtilsCore.initCanvas());
const _isWebGlSupported = UtilsCore.isWebGl(_testingWebGl);
const _isWebGlDrawBuffersSupported = _isWebGlSupported && Boolean(_testingWebGl.getExtension('WEBGL_draw_buffers'));

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