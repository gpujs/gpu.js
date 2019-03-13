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

	/**
	 * A highly readable very forgiving micro-parser for a glsl function that gets argument types
	 * @param {String} source
	 * @returns {{types: String[], names: String[]}}
	 */
	static nativeFunctionArgumentTypes(source) {
		const types = [];
		const names = [];
		const states = [];
		const isStartingVariableName = /^[a-zA-Z_]/;
		const isVariableChar = /[a-zA-Z_0-9]/;
		let i = 0;
		let name = null;
		let type = null;
		while (i < source.length) {
			const char = source[i];
			const nextChar = source[i + 1];
			const state = states.length > 0 ? states[states.length - 1] : null;

			// begin MULTI_LINE_COMMENT handling
			if (state === 'FUNCTION_ARGUMENTS' && char === '/' && nextChar === '*') {
				states.push('MULTI_LINE_COMMENT');
				i += 2;
				continue;
			} else if (state === 'MULTI_LINE_COMMENT' && char === '*' && nextChar === '/') {
				states.pop();
				i += 2;
				continue;
			}
			// end MULTI_LINE_COMMENT handling

			// begin COMMENT handling
			else if (state === 'FUNCTION_ARGUMENTS' && char === '/' && nextChar === '/') {
				states.push('COMMENT');
				i += 2;
				continue;
			} else if (state === 'COMMENT' && char === '\n') {
				states.pop();
				i++;
				continue;
			}
			// end COMMENT handling

			// being FUNCTION_ARGUMENTS handling
			else if (state === null && char === '(') {
				states.push('FUNCTION_ARGUMENTS');
				i++;
				continue;
			} else if (state === 'FUNCTION_ARGUMENTS') {
				if (char === ')') {
					states.pop();
					break;
				}
				if (char === 'f' && nextChar === 'l' && source[i + 2] === 'o' && source[i + 3] === 'a' && source[i + 4] === 't' && source[i + 5] === ' ') {
					states.push('DECLARE_VARIABLE');
					type = 'float';
					name = '';
					i += 6;
					continue;
				} else if (char === 'i' && nextChar === 'n' && source[i + 2] === 't' && source[i + 3] === ' ') {
					states.push('DECLARE_VARIABLE');
					type = 'int';
					name = '';
					i += 4;
					continue;
				} else if (char === 'v' && nextChar === 'e' && source[i + 2] === 'c' && source[i + 3] === '2' && source[i + 4] === ' ') {
					states.push('DECLARE_VARIABLE');
					type = 'vec2';
					name = '';
					i += 5;
					continue;
				} else if (char === 'v' && nextChar === 'e' && source[i + 2] === 'c' && source[i + 3] === '3' && source[i + 4] === ' ') {
					states.push('DECLARE_VARIABLE');
					type = 'vec3';
					name = '';
					i += 5;
					continue;
				} else if (char === 'v' && nextChar === 'e' && source[i + 2] === 'c' && source[i + 3] === '4' && source[i + 4] === ' ') {
					states.push('DECLARE_VARIABLE');
					type = 'vec4';
					name = '';
					i += 5;
					continue;
				}
			}
			// end FUNCTION_ARGUMENTS handling

			// begin DECLARE_VARIABLE handling
			else if (state === 'DECLARE_VARIABLE') {
				if (name === '') {
					if (char === ' ') {
						i++;
						continue;
					}
					if (!isStartingVariableName.test(char)) {
						throw new Error('variable name is not expected string');
					}
				}
				name += char;
				if (!isVariableChar.test(nextChar)) {
					states.pop();
					names.push(name);
					types.push(typeMap[type]);
				}
			}
			// end DECLARE_VARIABLE handling

			// Progress to next character
			i++;
		}
		if (states.length > 0) {
			throw new Error('GLSL function was not parsable');
		}
		return {
			names,
			types
		};
	}

	static nativeFunctionReturnType(source) {
		return typeMap[source.match(/int|float|vec[2-4]/)[0]];
	}
}

const typeMap = {
	int: 'Integer',
	float: 'Number',
	vec2: 'Array(2)',
	vec3: 'Array(3)',
	vec4: 'Array(4)',
};

module.exports = {
	GLKernel
};