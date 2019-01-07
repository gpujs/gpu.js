'use strict';

const utils = require('./utils');
const WebGLRunner = require('../backend/web-gl/runner');
const CPURunner = require('../backend/cpu/runner');
const WebGLValidatorKernel = require('../backend/web-gl/validator-kernel');
const GPUCoreBase = require('./gpu-core-base');

const createWebGLContext = require('gl');
const {
	createCanvas
} = require('canvas');

/**
 * Initialises the GPU.js library class which manages the webGlContext for the created functions.
 * @class
 * @extends GPUCoreBase
 */
class GPUHeadless extends GPUCoreBase {
	/**
	 * Creates an instance of GPUHeadless.
	 * @param {any} settings - Settings to set mode, andother properties. See #GPUCoreBase
	 * @memberOf GPU#
	 */
	constructor(settings) {
		super(settings);

		settings = settings || {};
		this._canvas = settings.canvas || null;
		this._webGl = settings.webGl || null;

		let mode = settings.mode;
		let detectedMode;

		if (mode === 'cpu') {
			detectedMode = 'cpu';
		} else {
			if (mode === 'gpu') {
				detectedMode = 'webgl';
			} else {
				detectedMode = mode;
			}

			const context = createWebGLContext(2, 2);
			const canvas = createCanvas(2, 2);

			this._webGl = context;
			this._canvas = canvas;
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
Object.assign(GPUHeadless, GPUCoreBase);

module.exports = GPUHeadless;