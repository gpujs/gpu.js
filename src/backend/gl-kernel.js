const {
	Kernel
} = require('./kernel');

class GLKernel extends Kernel {
	static get mode() {
		return 'gpu';
	}

	static getIsFloatRead() {
		function kernelFunction() {
			return 1;
		}
		const kernel = new this(kernelFunction.toString(), {
			context: this.testContext,
			canvas: this.testCanvas,
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
		const kernel = new this(kernelFunction.toString(), {
			context: this.testContext,
			canvas: this.testCanvas,
			skipValidateSettings: true,
			output: [2]
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

	static get features() {
		throw new Error(`"features" not defined on ${ this.name }`);
	}

	static setupFeatureChecks() {
		throw new Error(`"setupFeatureChecks" not defined on ${ this.name }`);
	}

	constructor(fnString, settings) {
		super(fnString, settings);
		this.floatTextures = null;
		this.floatOutput = null;
		this.floatOutputForce = null;
		this.fixIntegerDivisionAccuracy = null;
	}
}

module.exports = {
	GLKernel
};