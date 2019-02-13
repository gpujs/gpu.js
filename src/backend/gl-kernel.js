const {
	Kernel
} = require('./kernel');

/**
 * @abstract
 */
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
			skipValidate: true,
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
			skipValidate: true,
			output: [2]
		});
		const result = kernel.run([6, 6030401], [3, 3991]);
		kernel.destroy(true);
		// have we not got whole numbers for 6/3 or 6030401/3991
		// add more here if others see this problem
		return result[0] === 2 && result[1] === 1511;
	}

	/**
	 * @abstract
	 */
	static get testCanvas() {
		throw new Error(`"testCanvas" not defined on ${ this.name }`);
	}

	/**
	 * @abstract
	 */
	static get testContext() {
		throw new Error(`"testContext" not defined on ${ this.name }`);
	}

	/**
	 * @abstract
	 */
	static get features() {
		throw new Error(`"features" not defined on ${ this.name }`);
	}

	/**
	 * @abstract
	 */
	static setupFeatureChecks() {
		throw new Error(`"setupFeatureChecks" not defined on ${ this.name }`);
	}

	/**
	 * @desc Fix division by factor of 3 FP accuracy bug
	 * @param {Boolean} fix - should fix
	 */
	setFixIntegerDivisionAccuracy(fix) {
		this.fixIntegerDivisionAccuracy = fix;
		return this;
	}

	/**
	 * @desc Toggle output mode
	 * @param {Boolean} flag - true to enable float
	 */
	setFloatOutput(flag) {
		this.floatOutput = flag;
		return this;
	}

	setFloatOutputForce(flag) {
		this.floatOutputForce = flag;
		return this;
	}

	/**
	 * @desc Toggle texture output mode
	 * @param {Boolean} flag - true to enable floatTextures
	 */
	setFloatTextures(flag) {
		this.floatTextures = flag;
		return this;
	}

	constructor(source, settings) {
		super(source, settings);
		this.texSize = null;
		this.floatTextures = null;
		this.floatOutput = null;
		this.floatOutputForce = null;
		this.fixIntegerDivisionAccuracy = null;
	}
}

module.exports = {
	GLKernel
};