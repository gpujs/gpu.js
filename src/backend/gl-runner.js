const Runner = require('./runner');

class GLRunner extends Runner {
	static getFeatures() {
		return Object.freeze({
			isFloatRead: this.getIsFloatRead(),
			isIntegerDivisionAccurate: this.getIsIntegerDivisionAccurate(),
			kernelMap: false
		});
	}

	static getIsFloatRead() {
		function kernelFunction() {
			return 1;
		}
		const kernel = new this.Kernel(kernelFunction, {
			context: this.testContext,
			canvas: this.testCanvas,
			functionBuilder: this.testFunctionBuilder,
			skipValidateSettings: true,
			output: [2],
			floatTextures: true,
			floatOutput: true,
			floatOutputForce: true
		});
		const result = kernel.run();
		kernel.destroy(true);
		return result[0] === 1;
	}

	static getIsIntegerDivisionAccurate() {
		function kernelFunction(v1, v2) {
			return v1[this.thread.x] / v2[this.thread.x];
		}
		const kernel = new this.Kernel(kernelFunction, {
			context: this.testContext,
			canvas: this.testCanvas,
			skipValidateSettings: true,
			output: [2],
			functionBuilder: this.testFunctionBuilder
		});
		const result = kernel.run([6, 6030401], [3, 3991]);
		kernel.destroy(true);
		// have we not got whole numbers for 6/3 or 6030401/3991
		// add more here if others see this problem
		return result[0] === 2 && result[1] === 1511;
	}

	static get testCanvas() {
		throw new Error(`"testCanvas" not defined on ${ this.name }`);
	}

	static get testContext() {
		throw new Error(`"testContext" not defined on ${ this.name }`);
	}

	static setupFeatureChecks() {
		throw new Error(`"setupFeatureChecks" not defined on ${ this.name }`);
	}
}

module.exports = GLRunner;