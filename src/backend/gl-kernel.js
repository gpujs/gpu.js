const {
	Kernel
} = require('./kernel');

const {
	Texture
} = require('../texture');

const {
	utils
} = require('../utils');

/**
 * @abstract
 */
class GLKernel extends Kernel {
	static get mode() {
		return 'gpu';
	}

	static getIsFloatRead() {
		const kernelString = `function kernelFunction() {
			return 1;
		}`;
		const kernel = new this(kernelString, {
			context: this.testContext,
			canvas: this.testCanvas,
			validate: false,
			output: [1],
			precision: 'single',
			//TODO: not sure how to handle?
			floatOutputForce: true,
			returnType: 'Number'
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
			validate: false,
			output: [2],
			returnType: 'Number',
			precision: 'unsigned',
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
	 * @param {String} flag - 'single' or 'unsigned'
	 */
	setPrecision(flag) {
		this.precision = flag;
		return this;
	}

	// TODO: not sure how to handle
	setFloatOutputForce(flag) {
		this.floatOutputForce = flag;
		return this;
	}

	/**
	 * @desc Toggle texture output mode
	 * @param {Boolean} flag - true to enable floatTextures
	 */
	setFloatTextures(flag) {
		utils.warnDeprecated('method', 'setFloatTextures', 'setOptimizeFloatMemory');
		this.floatTextures = flag;
		return this;
	}

	setOptimizeFloatMemory(flag) {
		this.optimizeFloatMemory = flag;
		return this;
	}

	/**
	 * A highly readable very forgiving micro-parser for a glsl function that gets argument types
	 * @param {String} source
	 * @returns {{argumentTypes: String[], argumentNames: String[]}}
	 */
	static nativeFunctionArguments(source) {
		const argumentTypes = [];
		const argumentNames = [];
		const states = [];
		const isStartingVariableName = /^[a-zA-Z_]/;
		const isVariableChar = /[a-zA-Z_0-9]/;
		let i = 0;
		let argumentName = null;
		let argumentType = null;
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
					argumentType = 'float';
					argumentName = '';
					i += 6;
					continue;
				} else if (char === 'i' && nextChar === 'n' && source[i + 2] === 't' && source[i + 3] === ' ') {
					states.push('DECLARE_VARIABLE');
					argumentType = 'int';
					argumentName = '';
					i += 4;
					continue;
				} else if (char === 'v' && nextChar === 'e' && source[i + 2] === 'c' && source[i + 3] === '2' && source[i + 4] === ' ') {
					states.push('DECLARE_VARIABLE');
					argumentType = 'vec2';
					argumentName = '';
					i += 5;
					continue;
				} else if (char === 'v' && nextChar === 'e' && source[i + 2] === 'c' && source[i + 3] === '3' && source[i + 4] === ' ') {
					states.push('DECLARE_VARIABLE');
					argumentType = 'vec3';
					argumentName = '';
					i += 5;
					continue;
				} else if (char === 'v' && nextChar === 'e' && source[i + 2] === 'c' && source[i + 3] === '4' && source[i + 4] === ' ') {
					states.push('DECLARE_VARIABLE');
					argumentType = 'vec4';
					argumentName = '';
					i += 5;
					continue;
				}
			}
			// end FUNCTION_ARGUMENTS handling

			// begin DECLARE_VARIABLE handling
			else if (state === 'DECLARE_VARIABLE') {
				if (argumentName === '') {
					if (char === ' ') {
						i++;
						continue;
					}
					if (!isStartingVariableName.test(char)) {
						throw new Error('variable name is not expected string');
					}
				}
				argumentName += char;
				if (!isVariableChar.test(nextChar)) {
					states.pop();
					argumentNames.push(argumentName);
					argumentTypes.push(typeMap[argumentType]);
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
			argumentNames,
			argumentTypes,
		};
	}

	static nativeFunctionReturnType(source) {
		return typeMap[source.match(/int|float|vec[2-4]/)[0]];
	}

	static combineKernels(combinedKernel, lastKernel) {
		combinedKernel.apply(null, arguments);
		const {
			texSize,
			context,
			threadDim
		} = lastKernel.texSize;
		let result;
		if (lastKernel.precision === 'single') {
			const w = texSize[0];
			const h = Math.ceil(texSize[1] / 4);
			result = new Float32Array(w * h * 4 * 4);
			context.readPixels(0, 0, w, h * 4, context.RGBA, context.FLOAT, result);
		} else {
			const bytes = new Uint8Array(texSize[0] * texSize[1] * 4);
			context.readPixels(0, 0, texSize[0], texSize[1], context.RGBA, context.UNSIGNED_BYTE, bytes);
			result = new Float32Array(bytes.buffer);
		}

		result = result.subarray(0, threadDim[0] * threadDim[1] * threadDim[2]);

		if (lastKernel.output.length === 1) {
			return result;
		} else if (lastKernel.output.length === 2) {
			return utils.splitArray(result, lastKernel.output[0]);
		} else if (lastKernel.output.length === 3) {
			const cube = utils.splitArray(result, lastKernel.output[0] * lastKernel.output[1]);
			return cube.map(function(x) {
				return utils.splitArray(x, lastKernel.output[0]);
			});
		}
	}

	constructor(source, settings) {
		super(source, settings);
		this.texSize = null;
		// TODO: not sure how to handle
		this.floatOutputForce = null;
		this.fixIntegerDivisionAccuracy = null;
		this.translatedSource = null;
		this.renderStrategy = null;
		this.compiledFragmentShader = null;
		this.compiledVertexShader = null;

		this.optimizeFloatMemory = null;
	}

	translateSource() {
		throw new Error(`"translateSource" not defined on ${this.constructor.name}`);
	}

	pickRenderStrategy(args) {
		// TODO: replace boolean returns with setting a state that belongs on this that represents the need for fallback
		if (this.graphical) return;
		if (this.precision === 'unsigned') {
			switch (this.returnType) {
				case 'LiteralInteger':
				case 'Float':
				case 'Number':
				case 'Integer':
					if (this.pipeline) {
						this.renderStrategy = renderStrategy.PackedTexture;
						this.renderOutput = this.renderTexture;
					} else if (this.output[2] > 0) {
						this.renderStrategy = renderStrategy.PackedPixelTo3DFloat;
						this.renderOutput = this.render3DPackedFloat;
					} else if (this.output[1] > 0) {
						this.renderStrategy = renderStrategy.PackedPixelTo2DFloat;
						this.renderOutput = this.render2DPackedFloat;
					} else {
						this.renderStrategy = renderStrategy.PackedPixelToFloat;
						this.renderOutput = this.renderPackedFloat;
					}
					return true;
				case 'Array(2)':
				case 'Array(3)':
				case 'Array(4)':
					this.onRequestFallback(args);
					return false;
			}
		} else if (this.precision === 'single') {
			if (this.pipeline) {
				this.renderStrategy = renderStrategy.FloatTexture;
				this.renderOutput = this.renderTexture;
				return true;
			}
			switch (this.returnType) {
				case 'LiteralInteger':
				case 'Float':
				case 'Number':
				case 'Integer':
					if (this.output[2] > 0) {
						if (this.optimizeFloatMemory) {
							this.renderStrategy = renderStrategy.MemoryOptimizedFloatPixelToMemoryOptimized3DFloat;
							this.renderOutput = this.renderMemoryOptimized3DFloat;
						} else {
							this.renderStrategy = renderStrategy.FloatPixelTo3DFloat;
							this.renderOutput = this.render3DFloat;
						}
					} else if (this.output[1] > 0) {
						if (this.optimizeFloatMemory) {
							this.renderStrategy = renderStrategy.MemoryOptimizedFloatPixelToMemoryOptimized2DFloat;
							this.renderOutput = this.renderMemoryOptimized2DFloat;
						} else {
							this.renderStrategy = renderStrategy.FloatPixelTo2DFloat;
							this.renderOutput = this.render2DFloat;
						}
					} else {
						if (this.optimizeFloatMemory) {
							this.renderStrategy = renderStrategy.MemoryOptimizedFloatPixelToMemoryOptimizedFloat;
							this.renderOutput = this.renderMemoryOptimizedFloat;
						} else {
							this.renderStrategy = renderStrategy.FloatPixelToFloat;
							this.renderOutput = this.renderFloat;
						}
					}
					return true;
				case 'Array(2)':
					if (this.output[2] > 0) {
						this.renderStrategy = renderStrategy.FloatPixelTo3DArray2;
						this.renderOutput = this.render3DArray2;
					} else if (this.output[1] > 0) {
						this.renderStrategy = renderStrategy.FloatPixelTo2DArray2;
						this.renderOutput = this.render2DArray2;
					} else {
						this.renderStrategy = renderStrategy.FloatPixelToArray2;
						this.renderOutput = this.renderArray2;
					}
					return true;
				case 'Array(3)':
					if (this.output[2] > 0) {
						this.renderStrategy = renderStrategy.FloatPixelTo3DArray3;
						this.renderOutput = this.render3DArray3;
					} else if (this.output[1] > 0) {
						this.renderStrategy = renderStrategy.FloatPixelTo2DArray3;
						this.renderOutput = this.render2DArray3;
					} else {
						this.renderStrategy = renderStrategy.FloatPixelToArray3;
						this.renderOutput = this.renderArray3;
					}
					return true;
				case 'Array(4)':
					if (this.output[2] > 0) {
						this.renderStrategy = renderStrategy.FloatPixelTo3DArray4;
						this.renderOutput = this.render3DArray4;
					} else if (this.output[1] > 0) {
						this.renderStrategy = renderStrategy.FloatPixelTo2DArray4;
						this.renderOutput = this.render2DArray4;
					} else {
						this.renderStrategy = renderStrategy.FloatPixelToArray4;
						this.renderOutput = this.renderArray4;
					}
					return true;
			}
		} else {
			throw new Error(`unhandled precision of "${this.precision}"`);
		}

		throw new Error(`unhandled return type "${this.returnType}"`);
	}

	/**
	 * @abstract
	 * @returns String
	 */
	getKernelString() {
		throw new Error(`abstract method call`);
	}

	getMainResultTexture() {
		switch (this.returnType) {
			case 'LiteralInteger':
			case 'Float':
			case 'Integer':
			case 'Number':
				return this.getMainResultNumberTexture();
			case 'Array(2)':
				return this.getMainResultArray2Texture();
			case 'Array(3)':
				return this.getMainResultArray3Texture();
			case 'Array(4)':
				return this.getMainResultArray4Texture();
			default:
				throw new Error(`unhandled returnType type ${ this.returnType }`);
		}
	}

	/**
	 * @abstract
	 * @returns String[]
	 */
	getMainResultKernelNumberTexture() {
		throw new Error(`abstract method call`);
	}
	/**
	 * @abstract
	 * @returns String[]
	 */
	getMainResultSubKernelNumberTexture() {
		throw new Error(`abstract method call`);
	}
	/**
	 * @abstract
	 * @returns String[]
	 */
	getMainResultKernelArray2Texture() {
		throw new Error(`abstract method call`);
	}
	/**
	 * @abstract
	 * @returns String[]
	 */
	getMainResultSubKernelArray2Texture() {
		throw new Error(`abstract method call`);
	}
	/**
	 * @abstract
	 * @returns String[]
	 */
	getMainResultKernelArray3Texture() {
		throw new Error(`abstract method call`);
	}
	/**
	 * @abstract
	 * @returns String[]
	 */
	getMainResultSubKernelArray3Texture() {
		throw new Error(`abstract method call`);
	}
	/**
	 * @abstract
	 * @returns String[]
	 */
	getMainResultKernelArray4Texture() {
		throw new Error(`abstract method call`);
	}
	/**
	 * @abstract
	 * @returns String[]
	 */
	getMainResultSubKernelArray4Texture() {
		throw new Error(`abstract method call`);
	}
	/**
	 * @abstract
	 * @returns String[]
	 */
	getMainResultGraphical() {
		throw new Error(`abstract method call`);
	}
	/**
	 * @abstract
	 * @returns String[]
	 */
	getMainResultMemoryOptimizedFloats() {
		throw new Error(`abstract method call`);
	}
	/**
	 * @abstract
	 * @returns String[]
	 */
	getMainResultPackedPixels() {
		throw new Error(`abstract method call`);
	}

	getMainResultString() {
		if (this.graphical) {
			return this.getMainResultGraphical();
		} else if (this.precision === 'single') {
			if (this.optimizeFloatMemory) {
				return this.getMainResultMemoryOptimizedFloats();
			}
			return this.getMainResultTexture();
		} else {
			return this.getMainResultPackedPixels();
		}
	}

	getMainResultNumberTexture() {
		return utils.linesToString(this.getMainResultKernelNumberTexture()) +
			utils.linesToString(this.getMainResultSubKernelNumberTexture());
	}

	getMainResultArray2Texture() {
		return utils.linesToString(this.getMainResultKernelArray2Texture()) +
			utils.linesToString(this.getMainResultSubKernelArray2Texture());
	}

	getMainResultArray3Texture() {
		return utils.linesToString(this.getMainResultKernelArray3Texture()) +
			utils.linesToString(this.getMainResultSubKernelArray3Texture());
	}

	getMainResultArray4Texture() {
		return utils.linesToString(this.getMainResultKernelArray4Texture()) +
			utils.linesToString(this.getMainResultSubKernelArray4Texture());
	}

	getReturnTextureType() {
		if (this.graphical) {
			return 'ArrayTexture(4)';
		}
		if (this.precision === 'single') {
			switch (this.returnType) {
				case 'Float':
				case 'Number':
				case 'Integer':
					if (this.optimizeFloatMemory) {
						return 'MemoryOptimizedNumberTexture';
					} else {
						return 'ArrayTexture(1)';
					}
				case 'Array(2)':
					return 'ArrayTexture(2)';
				case 'Array(3)':
					return 'ArrayTexture(3)';
				case 'Array(4)':
					return 'ArrayTexture(4)';
				default:
					throw new Error(`unsupported returnType ${this.returnType}`);
			}
		} else {
			switch (this.returnType) {
				case 'Float':
				case 'Number':
				case 'Integer':
					return 'NumberTexture';
				case 'Array(2)':
				case 'Array(3)':
				case 'Array(4)':
				default:
					throw new Error(`unsupported returnType ${ this.returnType }`);
			}
		}
	}

	renderTexture() {
		return new Texture({
			texture: this.outputTexture,
			size: this.texSize,
			dimensions: this.threadDim,
			output: this.output,
			context: this.context,
			gpu: this.gpu,
			type: this.getReturnTextureType(),
		});
	}
	readPackedPixelsToUint8Array() {
		if (this.precision !== 'unsigned') throw new Error('Requires this.precision to be "unsigned"');
		const {
			texSize,
			context: gl
		} = this;
		const result = new Uint8Array(texSize[0] * texSize[1] * 4);
		gl.readPixels(0, 0, texSize[0], texSize[1], gl.RGBA, gl.UNSIGNED_BYTE, result);
		return result;
	}
	readPackedPixelsToFloat32Array() {
		return new Float32Array(this.readPackedPixelsToUint8Array().buffer);
	}
	readFloatPixelsToFloat32Array() {
		if (this.precision !== 'single') throw new Error('Requires this.precision to be "single"');
		const {
			texSize,
			context: gl
		} = this;
		const w = texSize[0];
		const h = texSize[1];
		const result = new Float32Array(w * h * 4);
		gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, result);
		return result;
	}
	readMemoryOptimizedFloatPixelsToFloat32Array() {
		if (this.precision !== 'single') throw new Error('Requires this.precision to be "single"');
		const {
			texSize,
			context: gl
		} = this;
		const w = texSize[0];
		const h = texSize[1];
		const result = new Float32Array(w * h * 4);
		gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, result);
		return result;
	}
	renderPackedFloat() {
		const [xMax] = this.output;
		return this.readPackedPixelsToFloat32Array().subarray(0, xMax);
	}
	render2DPackedFloat() {
		const pixels = this.readPackedPixelsToFloat32Array();
		const [xMax, yMax] = this.output;
		const yResults = new Array(yMax);
		for (let y = 0; y < yMax; y++) {
			const xStart = y * xMax;
			const xEnd = xStart + xMax;
			yResults[y] = pixels.subarray(xStart, xEnd);
		}
		return yResults;
	}
	render3DPackedFloat() {
		const pixels = this.readPackedPixelsToFloat32Array();
		const [xMax, yMax, zMax] = this.output;
		const zResults = new Array(zMax);
		for (let z = 0; z < zMax; z++) {
			const yResults = new Array(yMax);
			for (let y = 0; y < yMax; y++) {
				const xStart = (z * yMax * xMax) + y * xMax;
				const xEnd = xStart + xMax;
				yResults[y] = pixels.subarray(xStart, xEnd);
			}
			zResults[z] = yResults;
		}
		return zResults;
	}
	renderFloat() {
		const pixels = this.readFloatPixelsToFloat32Array();
		const [xMax] = this.output;
		const xResults = new Float32Array(xMax);
		let i = 0;
		for (let x = 0; x < xMax; x++) {
			xResults[x] = pixels[i];
			i += 4;
		}
		return xResults;
	}
	renderMemoryOptimizedFloat() {
		const pixels = this.readMemoryOptimizedFloatPixelsToFloat32Array();
		const [xMax] = this.output;
		return pixels.subarray(0, xMax);
	}
	render2DFloat() {
		const pixels = this.readFloatPixelsToFloat32Array();
		const [xMax, yMax] = this.output;
		const yResults = new Array(yMax);
		let i = 0;
		for (let y = 0; y < yMax; y++) {
			const xResults = new Float32Array(xMax);
			for (let x = 0; x < xMax; x++) {
				xResults[x] = pixels[i];
				i += 4;
			}
			yResults[y] = xResults;
		}
		return yResults;
	}
	renderMemoryOptimized2DFloat() {
		const pixels = this.readFloatPixelsToFloat32Array();
		const [xMax, yMax] = this.output;
		const yResults = new Array(yMax);
		for (let y = 0; y < yMax; y++) {
			const offset = y * xMax;
			yResults[y] = pixels.subarray(offset, offset + xMax);
		}
		return yResults;
	}
	render3DFloat() {
		const pixels = this.readFloatPixelsToFloat32Array();
		const [xMax, yMax, zMax] = this.output;
		const zResults = new Array(zMax);
		let i = 0;
		for (let z = 0; z < zMax; z++) {
			const yResults = new Array(yMax);
			for (let y = 0; y < yMax; y++) {
				const xResults = new Float32Array(xMax);
				for (let x = 0; x < xMax; x++) {
					xResults[x] = pixels[i];
					i += 4;
				}
				yResults[y] = xResults;
			}
			zResults[z] = yResults;
		}
		return zResults;
	}
	renderMemoryOptimized3DFloat() {
		const pixels = this.readFloatPixelsToFloat32Array();
		const [xMax, yMax, zMax] = this.output;
		const zResults = new Array(zMax);
		for (let z = 0; z < zMax; z++) {
			const yResults = new Array(yMax);
			for (let y = 0; y < yMax; y++) {
				const offset = (z * yMax * xMax) + (y * xMax);
				yResults[y] = pixels.subarray(offset, offset + xMax);
			}
			zResults[z] = yResults;
		}
		return zResults;
	}
	renderArray2() {
		const pixels = this.readFloatPixelsToFloat32Array();
		const [xMax] = this.output;
		const xResults = new Array(xMax);
		const xResultsMax = xMax * 4;
		let i = 0;
		for (let x = 0; x < xResultsMax; x += 4) {
			xResults[i++] = pixels.subarray(x, x + 2);
		}
		return xResults;
	}
	render2DArray2() {
		const pixels = this.readFloatPixelsToFloat32Array();
		const [xMax, yMax] = this.output;
		const yResults = new Array(yMax);
		const XResultsMax = xMax * 4;
		for (let y = 0; y < yMax; y++) {
			const xResults = new Array(xMax);
			const offset = y * XResultsMax;
			let i = 0;
			for (let x = 0; x < XResultsMax; x += 4) {
				xResults[i++] = pixels.subarray(x + offset, x + offset + 2);
			}
			yResults[y] = xResults;
		}
		return yResults;
	}
	render3DArray2() {
		const pixels = this.readFloatPixelsToFloat32Array();
		const [xMax, yMax, zMax] = this.output;
		const xResultsMax = xMax * 4;
		const zResults = new Array(zMax);
		for (let z = 0; z < zMax; z++) {
			const yResults = new Array(yMax);
			for (let y = 0; y < yMax; y++) {
				const xResults = new Array(xMax);
				const offset = (z * xResultsMax * yMax) + (y * xResultsMax);
				let i = 0;
				for (let x = 0; x < xResultsMax; x += 4) {
					xResults[i++] = pixels.subarray(x + offset, x + offset + 2);
				}
				yResults[y] = xResults;
			}
			zResults[z] = yResults;
		}
		return zResults;
	}
	renderArray3() {
		const pixels = this.readFloatPixelsToFloat32Array();
		const [xMax] = this.output;
		const xResults = new Array(xMax);
		const xResultsMax = xMax * 4;
		let i = 0;
		for (let x = 0; x < xResultsMax; x += 4) {
			xResults[i++] = pixels.subarray(x, x + 3);
		}
		return xResults;
	}
	render2DArray3() {
		const pixels = this.readFloatPixelsToFloat32Array();
		const [xMax, yMax] = this.output;
		const xResultsMax = xMax * 4;
		const yResults = new Array(yMax);
		for (let y = 0; y < yMax; y++) {
			const xResults = new Array(xMax);
			const offset = y * xResultsMax;
			let i = 0;
			for (let x = 0; x < xResultsMax; x += 4) {
				xResults[i++] = pixels.subarray(x + offset, x + offset + 3);
			}
			yResults[y] = xResults;
		}
		return yResults;
	}
	render3DArray3() {
		const pixels = this.readFloatPixelsToFloat32Array();
		const [xMax, yMax, zMax] = this.output;
		const xResultsMax = xMax * 4;
		const zResults = new Array(zMax);
		for (let z = 0; z < zMax; z++) {
			const yResults = new Array(yMax);
			for (let y = 0; y < yMax; y++) {
				const xResults = new Array(xMax);
				const offset = (z * xResultsMax * yMax) + (y * xResultsMax);
				let i = 0;
				for (let x = 0; x < xResultsMax; x += 4) {
					xResults[i++] = pixels.subarray(x + offset, x + offset + 3);
				}
				yResults[y] = xResults;
			}
			zResults[z] = yResults;
		}
		return zResults;
	}
	renderArray4() {
		const pixels = this.readFloatPixelsToFloat32Array();
		const [xMax] = this.output;
		const xResults = new Array(xMax);
		const xResultsMax = xMax * 4;
		let i = 0;
		for (let x = 0; x < xResultsMax; x += 4) {
			xResults[i++] = pixels.subarray(x, x + 4);
		}
		return xResults;
	}
	render2DArray4() {
		const pixels = this.readFloatPixelsToFloat32Array();
		const [xMax, yMax] = this.output;
		const xResultsMax = xMax * 4;
		const yResults = new Array(yMax);
		for (let y = 0; y < yMax; y++) {
			const xResults = new Array(xMax);
			const offset = y * xResultsMax;
			let i = 0;
			for (let x = 0; x < xResultsMax; x += 4) {
				xResults[i++] = pixels.subarray(x + offset, x + offset + 4);
			}
			yResults[y] = xResults;
		}
		return yResults;
	}
	render3DArray4() {
		const pixels = this.readFloatPixelsToFloat32Array();
		const [xMax, yMax, zMax] = this.output;
		const xResultsMax = xMax * 4;
		const zResults = new Array(zMax);
		for (let z = 0; z < zMax; z++) {
			const yResults = new Array(yMax);
			for (let y = 0; y < yMax; y++) {
				const xResults = new Array(xMax);
				const offset = (z * xResultsMax * yMax) + (y * xResultsMax);
				let i = 0;
				for (let x = 0; x < xResultsMax; x += 4) {
					xResults[i++] = pixels.subarray(x + offset, x + offset + 4);
				}
				yResults[y] = xResults;
			}
			zResults[z] = yResults;
		}
		return zResults;
	}
	getPixels() {
		const {
			context: gl,
			output
		} = this;
		const [width, height] = output;
		const pixels = new Uint8Array(width * height * 4);
		gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
		return pixels;
	}
}

const renderStrategy = Object.freeze({
	PackedPixelToUint8Array: Symbol('PackedPixelToUint8Array'),
	PackedPixelToFloat: Symbol('PackedPixelToFloat'),
	PackedPixelTo2DFloat: Symbol('PackedPixelTo2DFloat'),
	PackedPixelTo3DFloat: Symbol('PackedPixelTo3DFloat'),
	PackedTexture: Symbol('PackedTexture'),
	FloatPixelToFloat32Array: Symbol('FloatPixelToFloat32Array'),
	FloatPixelToFloat: Symbol('FloatPixelToFloat'),
	FloatPixelTo2DFloat: Symbol('FloatPixelTo2DFloat'),
	FloatPixelTo3DFloat: Symbol('FloatPixelTo3DFloat'),
	FloatPixelToArray2: Symbol('FloatPixelToArray2'),
	FloatPixelTo2DArray2: Symbol('FloatPixelTo2DArray2'),
	FloatPixelTo3DArray2: Symbol('FloatPixelTo3DArray2'),
	FloatPixelToArray3: Symbol('FloatPixelToArray3'),
	FloatPixelTo2DArray3: Symbol('FloatPixelTo2DArray3'),
	FloatPixelTo3DArray3: Symbol('FloatPixelTo3DArray3'),
	FloatPixelToArray4: Symbol('FloatPixelToArray4'),
	FloatPixelTo2DArray4: Symbol('FloatPixelTo2DArray4'),
	FloatPixelTo3DArray4: Symbol('FloatPixelTo3DArray4'),
	FloatTexture: Symbol('FloatTexture'),
	MemoryOptimizedFloatPixelToMemoryOptimizedFloat: Symbol('MemoryOptimizedFloatPixelToFloat'),
	MemoryOptimizedFloatPixelToMemoryOptimized2DFloat: Symbol('MemoryOptimizedFloatPixelTo2DFloat'),
	MemoryOptimizedFloatPixelToMemoryOptimized3DFloat: Symbol('MemoryOptimizedFloatPixelTo3DFloat'),
});

const typeMap = {
	int: 'Integer',
	float: 'Number',
	vec2: 'Array(2)',
	vec3: 'Array(3)',
	vec4: 'Array(4)',
};

module.exports = {
	GLKernel,
	renderStrategy
};