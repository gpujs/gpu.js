const KernelBase = require('../kernel-base');
const utils = require('../../utils');

module.exports = class CPUKernel extends KernelBase {
	constructor(fnString, settings) {
		super(fnString, settings);
		this._fnBody = utils.getFunctionBodyFromString(fnString);
		this._fn = null;
		this.run = null;
		this._canvasCtx = null;
		this._imageData = null;
		this._colorData = null;
		this.thread = {
			x: 0,
			y: 0,
			z: 0
		};
		this.runDimensions = {
			x: null,
			y: null,
			z: null
		};

		this.run = function() {
			this.run = null;
			this.build();
			return this.run.apply(this, arguments);
		}.bind(this);
	}

	validateOptions() {
		if (!this.dimensions || this.dimensions.length === 0) {
			if (arguments.length !== 1) {
				throw 'Auto dimensions only supported for kernels with only one input';
			}

			const argType = utils.getArgumentType(arguments[0]);
			if (argType === 'Array') {
				this.dimensions = utils.getDimensions(argType);
			} else if (argType === 'Texture') {
				this.dimensions = arguments[0].dimensions;
			} else {
				throw 'Auto dimensions not supported for input type: ' + argType;
			}
		}
	}

	build() {
		const kernelArgs = [];
		for (let i = 0; i < arguments.length; i++) {
			const argType = utils.getArgumentType(arguments[i]);
			if (argType === 'Array' || argType === 'Number') {
				kernelArgs[i] = arguments[i];
			} else if (argType === 'Texture') {
				kernelArgs[i] = arguments[i].toArray();
			} else {
				throw 'Input type not supported (CPU): ' + arguments[i];
			}
		}

		const threadDim = this.threadDim = utils.clone(this.dimensions);

		while (threadDim.length < 3) {
			threadDim.push(1);
		}

		this._fn = new Function(this.paramNames, this._fnBody);
		if (this.debug) {
			console.log('Options:');
			console.dir(this);
		}
		this.run = function() {
			if (this.graphical) {
				this._imageData = this._canvasCtx.createImageData(threadDim[0], threadDim[1]);
				this._colorData = new Uint8ClampedArray(threadDim[0] * threadDim[1] * 4);
			}

			let ret = new Array(threadDim[2]);
			for (this.thread.z = 0; this.thread.z < threadDim[2]; this.thread.z++) {
				ret[this.thread.z] = new Array(threadDim[1]);
				for (this.thread.y = 0; this.thread.y < threadDim[1]; this.thread.y++) {
					ret[this.thread.z][this.thread.y] = new Array(threadDim[0]);
					for (this.thread.x = 0; this.thread.x < threadDim[0]; this.thread.x++) {
						ret[this.thread.z][this.thread.y][this.thread.x] = this._fn.apply(this, arguments);
					}
				}
			}

			if (this.graphical) {
				this._imageData.data.set(this._colorData);
				this._canvasCtx.putImageData(this._imageData, 0, 0);
			}

			if (this.dimensions.length === 1) {
				ret = ret[0][0];
			} else if (this.dimensions.length === 2) {
				ret = ret[0];
			}

			return ret;
		}.bind(this);


		if (this.graphical) {
			const canvas = this.canvas;
			this.runDimensions.x = canvas.width = threadDim[0];
			this.runDimensions.y = canvas.height = threadDim[1];
			this._canvasCtx = canvas.getContext('2d');
		}
	}

	color(r, g, b, a) {
		if (typeof a === 'undefined') {
			a = 1;
		}

		r = Math.floor(r * 255);
		g = Math.floor(g * 255);
		b = Math.floor(b * 255);
		a = Math.floor(a * 255);

		const width = this.runDimensions.x;
		const height = this.runDimensions.y;

		const x = this.thread.x;
		const y = height - this.thread.y - 1;

		const index = x + y * width;

		this._colorData[index * 4 + 0] = r;
		this._colorData[index * 4 + 1] = g;
		this._colorData[index * 4 + 2] = b;
		this._colorData[index * 4 + 3] = a;
	}
};