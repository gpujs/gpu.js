const Runner = require('./runner');

class GLRunner extends Runner {
	getFeatures() {
		return Object.freeze({
			isFloatRead: this.getIsFloatRead(),
			isIntegerDivisionAccurate: this.getIsIntegerDivisionAccurate()
		});
	}

	getIsFloatRead() {
		function kernelFunction() {
			return 1;
		}
		const kernel = new this.Kernel(kernelFunction, {
			webGl: this._webGl,
			canvas: this._canvas,
			skipValidateOptions: true,
			functionBuilder: this.functionBuilder,
			output: [2],
			floatTextures: true,
			floatOutput: true,
			floatOutputForce: true
		});
		const result = kernel.run();
		this._checkInherits(kernel);
		kernel.destroy(true);
		debugger;
		return result[0] === 1;
	}

	getIsIntegerDivisionAccurate() {
		function kernelFunction(v1, v2) {
			return v1[this.thread.x] / v2[this.thread.x];
		}
		const kernel = new this.Kernel(kernelFunction, {
			webGl: this._webGl,
			canvas: this._canvas,
			skipValidateOptions: true,
			output: [2],
			functionBuilder: this.functionBuilder
		});
		const result = kernel.run([6, 6030401], [3, 3991]);
		this._checkInherits(kernel);
		kernel.destroy(true);
		// have we not got whole numbers for 6/3 or 6030401/3991
		// add more here if others see this problem
		return result[0] === 2 && result[1] === 1511;
	}

	_checkInherits(kernel) {
		if (!this._webGl) {
			this._webGl = kernel.getWebGl();
		}
		if (!this._canvas) {
			this._canvas = kernel.getCanvas();
		}
	}
}

module.exports = GLRunner;