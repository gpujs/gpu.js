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
	 * @desc Return TRUE, on a valid DOM canvas or OffscreenCanvas object
	 * Note: This does just a VERY simply sanity check. And may give false positives.
	 *
	 * @param {HTMLCanvasElement} canvas - Object to validate
	 * @returns {Boolean} TRUE if the object is a DOM canvas or OffscreenCanvas
	 */
	static isCanvas(canvas) {
		return (
			canvas !== null &&
			canvas.getContext
		);
	}

	/**
	 * @desc Return TRUE, if browser supports canvas
	 * @returns {Boolean} TRUE if browser supports canvas
	 */
	static isCanvasSupported() {
		return _isCanvasSupported;
	}

	/**
	 * @desc Initiate and returns a canvas, for usage in init_webgl.
	 * Returns only if canvas is supported by browser.
	 *
	 * @returns {HTMLCanvasElement} if supported by browser, else null
	 */
	static initCanvas() {
		// Fail fast if previously detected no support
		if (!_isCanvasSupported) {
			return null;
		}

		if (_isNativeCanvasSupport) {
			return {
				getContext: () => {
					return null;
				}
			};
		}

		// Create a new canvas DOM
		const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : new OffscreenCanvas(0, 0);

		// Default width and height, to fix webgl issue in safari
		canvas.width = 2;
		canvas.height = 2;

		// Returns the canvas
		return canvas;
	}

	/**
	 *
	 * @desc Return TRUE, on a valid webGlContext object
	 * Note: This does just a VERY simply sanity check. And may give false positives.
	 *
	 * @param {webGlContext} webGlObj - Object to validate
	 * @returns {Boolean} TRUE if the object is a webGlContext object
	 */
	static isWebGl(webGlObj) {
		return webGlObj && typeof webGlObj.getExtension === 'function';
	}

	/**
	 *
	 * @desc Return TRUE, on a valid webGl2Context object
	 * Note: This does just a VERY simply sanity check. And may give false positives.
	 *
	 * @param {webGlContext} webGl2Obj - Object to validate
	 * @returns {Boolean} TRUE if the object is a webGl2Context object
	 */
	static isWebGl2(webGl2Obj) {
		return webGl2Obj && typeof WebGL2RenderingContext !== 'undefined' &&
			webGl2Obj instanceof WebGL2RenderingContext;
	}

	/**
	 * @desc Return TRUE, if browser supports webgl
	 * @returns {Boolean} TRUE if browser supports webgl
	 */
	static isWebGlSupported() {
		return _isWebGlSupported;
	}

	/**
	 * @desc Return TRUE, if browser supports webgl2
	 * @returns {Boolean} TRUE if browser supports webgl2
	 */
	static isWebGl2Supported() {
		return _isWebGl2Supported;
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
	 * @desc Initiate and returns a webGl, from a canvas object
	 * Returns only if webGl is supported by browser.
	 *
	 * @param {HTMLCanvasElement} canvas - Object to validate
	 * @returns {WebGLRenderingContext} if supported by browser, else null
	 */
	static initWebGl(canvas) {
		let webGl = null;

		// First time setup, does the browser support check memorizer
		if (typeof _isCanvasSupported !== 'undefined' || canvas === null) {
			if (!_isCanvasSupported) {
				return null;
			}
		}

		// Fail fast for invalid canvas object
		if (!UtilsCore.isCanvas(canvas)) {
			throw new Error('Invalid canvas object - ' + canvas);
		}

		// Create a new canvas DOM
		const defaultOptions = UtilsCore.initWebGlDefaultOptions();
		try {
			webGl = canvas.getContext('experimental-webgl', defaultOptions);
		} catch (e) {
			// 'experimental-webgl' is not a supported context type
			// fallback to 'webgl2' or 'webgl' below
		}

		if (webGl === null) {
			webGl = (
				canvas.getContext('webgl2', defaultOptions) ||
				canvas.getContext('webgl', defaultOptions)
			);
		}

		if (webGl) {
			// Get the extension that is needed
			webGl.OES_texture_float = webGl.getExtension('OES_texture_float');
			webGl.OES_texture_float_linear = webGl.getExtension('OES_texture_float_linear');
			webGl.OES_element_index_uint = webGl.getExtension('OES_element_index_uint');
		}

		return webGl;
	}

	/**
	 * @desc Initiate and returns a webGl, from a canvas object
	 * Returns only if webGl is supported by browser.
	 *
	 * @param {HTMLCanvasElement} canvas - Object to validate
	 * @returns {WebGL2RenderingContext} HTMLCanvasElement if supported by browser, else null
	 */
	static initWebGl2(canvas) {

		// First time setup, does the browser support check memorizer
		if (typeof _isCanvasSupported !== 'undefined' || canvas === null) {
			if (!_isCanvasSupported) {
				return null;
			}
		}

		// Fail fast for invalid canvas object
		if (!UtilsCore.isCanvas(canvas)) {
			throw new Error('Invalid canvas object - ' + canvas);
		}

		// Create a new canvas DOM
		return canvas.getContext('webgl2', UtilsCore.initWebGlDefaultOptions());
	}

	/**
	 * @param {number[]} output
	 * @throws if not correctly defined
	 */
	static checkOutput(output) {
		if (!output || !Array.isArray(output)) throw new Error('kernel.output not an array');
		for (let i = 0; i < output.length; i++) {
			if (isNaN(output[i]) || output[i] < 1) {
				throw new Error(`kernel.output[${ i }] incorrectly defined as \`${ output[i] }\`, needs to be numeric, and greater than 0`);
			}
		}
	}
}

let _isNativeCanvasSupport = false;
try {
	const nativeCanvas = require('canvas');
	_isNativeCanvasSupport = nativeCanvas.hasOwnProperty('createCanvas');
} catch (e) {}

const _isCanvasSupported = _isNativeCanvasSupport || (typeof document !== 'undefined' ? UtilsCore.isCanvas(document.createElement('canvas')) : typeof OffscreenCanvas !== 'undefined');
const _testingWebGl = UtilsCore.initWebGl(UtilsCore.initCanvas());
const _testingWebGl2 = UtilsCore.initWebGl2(UtilsCore.initCanvas());
const _isWebGlSupported = UtilsCore.isWebGl(_testingWebGl);
const _isWebGl2Supported = UtilsCore.isWebGl2(_testingWebGl2);
const _isWebGlDrawBuffersSupported = _isWebGlSupported && _testingWebGl && Boolean(_testingWebGl.getExtension('WEBGL_draw_buffers'));

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