'use strict';

const utils = require('./utils');
const WebGLRunner = require('../backend/web-gl/runner');
const WebGL2Runner = require('../backend/web-gl2/runner');
const CPURunner = require('../backend/cpu/runner');
const WebGLValidatorKernel = require('../backend/web-gl/validator-kernel');
const WebGL2ValidatorKernel = require('../backend/web-gl2/validator-kernel');
const GPUCoreBase = require("./gpu-core-base");

/**
 * Initialises the GPU.js library class which manages the webGlContext for the created functions.
 * @class
 * @extends GPUCoreBase
 */
class GPUBrowser extends GPUCoreBase {
	/**
	 * Creates an instance of GPUBrowser.
	 * @param {any} settings - Settings to set mode, and other properties. See #GPUCoreBase
	 * @memberOf GPU#
	 */
	constructor(settings) {
		super(settings);

		settings = settings || {};
		this._canvas = settings.canvas || null;
		this._webGl = settings.webGl || null;
		let mode = settings.mode;
		let detectedMode;
		if (!utils.isWebGlSupported()) {
			if (mode && mode !== 'cpu') {
				throw new Error(`A requested mode of "${ mode }" and is not supported`);
			} else {
				console.warn('Warning: gpu not supported, falling back to cpu support');
				detectedMode = 'cpu';
			}
		} else {
			if (this._webGl) {
				if (typeof WebGL2RenderingContext !== 'undefined' && this._webGl.constructor === WebGL2RenderingContext) {
					detectedMode = 'webgl2';
				} else if (typeof WebGLRenderingContext !== 'undefined' && this._webGl.constructor === WebGLRenderingContext) {
					detectedMode = 'webgl';
				} else {
					throw new Error('unknown WebGL Context');
				}
			} else {
				detectedMode = mode || 'gpu';
			}
		}
		this.kernels = [];

		const runnerSettings = {
			canvas: this._canvas,
			webGl: this._webGl
		};

		switch (detectedMode) {
			// public options
			case 'cpu':
				this._runner = new CPURunner(runnerSettings);
				break;
			case 'gpu':
				const Runner = this.getGPURunner();
				this._runner = new Runner(runnerSettings);
				break;

				// private explicit options for testing
			case 'webgl2':
				this._runner = new WebGL2Runner(runnerSettings);
				break;
			case 'webgl':
				this._runner = new WebGLRunner(runnerSettings);
				break;

				// private explicit options for internal
			case 'webgl2-validator':
				this._runner = new WebGL2Runner(runnerSettings);
				this._runner.Kernel = WebGL2ValidatorKernel;
				break;
			case 'webgl-validator':
				this._runner = new WebGLRunner(runnerSettings);
				this._runner.Kernel = WebGLValidatorKernel;
				break;
			default:
				throw new Error(`"${ mode }" mode is not defined`);
		}
	}

	getGPURunner() {
		if (typeof WebGL2RenderingContext !== 'undefined' && utils.isWebGl2Supported()) return WebGL2Runner;
		if (typeof WebGLRenderingContext !== 'undefined') return WebGLRunner;
	}
};

// This ensure static methods are "inherited"
// See: https://stackoverflow.com/questions/5441508/how-to-inherit-static-methods-from-base-class-in-javascript
Object.assign(GPUBrowser, GPUCoreBase);

module.exports = GPUBrowser;
