'use strict';

const utils = require('./utils');
const WebGLRunner = require('../backend/web-gl/runner');
const CPURunner = require('../backend/cpu/runner');
const WebGLValidatorKernel = require('../backend/web-gl/validator-kernel');
const GPUCoreBase = require("./gpu-core-base");

/**
 * Initialises the GPU.js library class which manages the webGlContext for the created functions.
 * @class
 * @extends GPUCore
 */
class GPU extends GPUCore {
	/**
	 * Creates an instance of GPU.
	 * @param {any} settings - Settings to set mode, andother properties. See #GPUCore
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
			case 'webgl':
				this._runner = new WebGLRunner(runnerSettings);
				break;

			// private explicit options for internal
			case 'webgl-validator':
				this._runner = new WebGLRunner(runnerSettings);
				this._runner.Kernel = WebGLValidatorKernel;
				break;
			default:
				throw new Error(`"${ mode }" mode is not defined`);
		}
	}
};

// This ensure static methods are "inherited"
// See: https://stackoverflow.com/questions/5441508/how-to-inherit-static-methods-from-base-class-in-javascript
Object.assign(GPU, GPUCoreBase);

module.exports = GPU;
