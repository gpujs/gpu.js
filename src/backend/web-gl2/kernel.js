const {
	WebGLKernel
} = require('../web-gl/kernel');
const {
	WebGL2FunctionNode
} = require('./function-node');
const {
	FunctionBuilder
} = require('../function-builder');
const {
	utils
} = require('../../utils');
const {
	Texture
} = require('../../texture');
const {
	fragmentShader
} = require('./fragment-shader');
const {
	vertexShader
} = require('./vertex-shader');

let isSupported = null;
let testCanvas = null;
let testContext = null;
let testExtensions = null;
let features = null;

class WebGL2Kernel extends WebGLKernel {
	static get isSupported() {
		if (isSupported !== null) {
			return isSupported;
		}
		this.setupFeatureChecks();
		isSupported = this.isContextMatch(testContext);
		return isSupported;
	}

	static setupFeatureChecks() {
		if (typeof document !== 'undefined') {
			testCanvas = document.createElement('canvas');
		} else if (typeof OffscreenCanvas !== 'undefined') {
			testCanvas = new OffscreenCanvas(0, 0);
		}
		if (!testCanvas) return;
		testContext = testCanvas.getContext('webgl2');
		if (!testContext || !testContext.getExtension) return;
		testExtensions = {
			EXT_color_buffer_float: testContext.getExtension('EXT_color_buffer_float'),
			OES_texture_float_linear: testContext.getExtension('OES_texture_float_linear'),
		};
		features = this.getFeatures();
	}

	static isContextMatch(context) {
		// from global
		if (typeof WebGL2RenderingContext !== 'undefined') {
			return context instanceof WebGL2RenderingContext;
		}
		return false;
	}

	static getFeatures() {
		return Object.freeze({
			isFloatRead: this.getIsFloatRead(),
			isIntegerDivisionAccurate: this.getIsIntegerDivisionAccurate(),
			kernelMap: true,
			isTextureFloat: true,
		});
	}

	static getIsTextureFloat() {
		return true;
	}

	static getIsIntegerDivisionAccurate() {
		return super.getIsIntegerDivisionAccurate();
	}

	static get testCanvas() {
		return testCanvas;
	}

	static get testContext() {
		return testContext;
	}

	static get features() {
		return features;
	}

	static get fragmentShader() {
		return fragmentShader;
	}
	static get vertexShader() {
		return vertexShader;
	}

	initContext() {
		const settings = {
			alpha: false,
			depth: false,
			antialias: false
		};
		const context = this.canvas.getContext('webgl2', settings);
		return context;
	}

	initExtensions() {
		this.extensions = {
			EXT_color_buffer_float: this.context.getExtension('EXT_color_buffer_float'),
			OES_texture_float_linear: this.context.getExtension('OES_texture_float_linear'),
		};
	}

	validateSettings() {
		if (!this.validate) {
			this.texSize = utils.dimToTexSize({
				floatTextures: this.optimizeFloatMemory,
				floatOutput: this.precision === 'single',
			}, this.output, true);
			return;
		}

		const features = this.constructor.features;
		if (this.precision === 'single' && this.floatOutputForce !== true && !features.isFloatRead) {
			throw new Error('Float texture outputs are not supported');
		} else if (!this.graphical && this.precision === null) {
			this.precision = features.isFloatRead ? 'single' : 'unsigned';
		}

		if (this.fixIntegerDivisionAccuracy === null) {
			this.fixIntegerDivisionAccuracy = !features.isIntegerDivisionAccurate;
		} else if (this.fixIntegerDivisionAccuracy && features.isIntegerDivisionAccurate) {
			this.fixIntegerDivisionAccuracy = false;
		}

		this.checkOutput();

		if (!this.output || this.output.length === 0) {
			if (arguments.length !== 1) {
				throw new Error('Auto output only supported for kernels with only one input');
			}

			const argType = utils.getVariableType(arguments[0]);
			switch (argType) {
				case 'Array':
					this.output = utils.getDimensions(argType);
					break;
				case 'NumberTexture':
				case 'MemoryOptimizedNumberTexture':
				case 'ArrayTexture(1)':
				case 'ArrayTexture(2)':
				case 'ArrayTexture(3)':
				case 'ArrayTexture(4)':
					this.output = arguments[0].output;
					break;
				default:
					throw new Error('Auto output not supported for input type: ' + argType);
			}
		}

		if (this.graphical) {
			if (this.output.length !== 2) {
				throw new Error('Output must have 2 dimensions on graphical mode');
			}

			if (this.precision === 'single') {
				console.warn('Cannot use graphical mode and single precision at the same time');
				this.precision = 'unsigned';
			}

			this.texSize = utils.clone(this.output);
			return;
		} else if (!this.graphical && this.precision === null && features.isTextureFloat) {
			this.precision = 'single';
		}

		this.texSize = utils.dimToTexSize({
			floatTextures: !this.optimizeFloatMemory,
			floatOutput: this.precision === 'single',
		}, this.output, true);

		if (this.precision === 'single' || this.floatOutputForce) {
			this.context.getExtension('EXT_color_buffer_float');
		}
	}

	translateSource() {
		const functionBuilder = FunctionBuilder.fromKernel(this, WebGL2FunctionNode, {
			fixIntegerDivisionAccuracy: this.fixIntegerDivisionAccuracy
		});
		this.translatedSource = functionBuilder.getPrototypeString('kernel');
		if (!this.graphical && !this.returnType) {
			this.returnType = functionBuilder.getKernelResultType();
		}
	}

	run() {
		if (this.program === null) {
			this.build.apply(this, arguments);
		}
		const {
			argumentNames,
			argumentTypes,
			texSize
		} = this;
		const gl = this.context;

		gl.useProgram(this.program);
		gl.scissor(0, 0, texSize[0], texSize[1]);

		if (!this.hardcodeConstants) {
			this.setUniform3iv('uOutputDim', new Int32Array(this.threadDim));
			this.setUniform2iv('uTexSize', texSize);
		}

		this.setUniform2f('ratio', texSize[0] / this.maxTexSize[0], texSize[1] / this.maxTexSize[1]);

		this.argumentsLength = 0;
		for (let texIndex = 0; texIndex < argumentNames.length; texIndex++) {
			this.addArgument(arguments[texIndex], argumentTypes[texIndex], argumentNames[texIndex]);
		}

		if (this.plugins) {
			for (let i = 0; i < this.plugins.length; i++) {
				const plugin = this.plugins[i];
				if (plugin.onBeforeRun) {
					plugin.onBeforeRun(this);
				}
			}
		}

		if (this.graphical) {
			if (this.pipeline) {
				gl.bindRenderbuffer(gl.RENDERBUFFER, null);
				gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
				if (!this.outputTexture || this.immutable) {
					this._setupOutputTexture();
				}
				gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
				return new Texture({
					texture: this.outputTexture,
					size: texSize,
					dimensions: this.threadDim,
					output: this.output,
					context: this.context,
					gpu: this.gpu,
					type: this.getReturnTextureType(),
				});
			}
			gl.bindRenderbuffer(gl.RENDERBUFFER, null);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			return;
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
		if (this.immutable) {
			this._setupOutputTexture();
		}

		if (this.subKernels !== null) {
			if (this.immutable) {
				this.subKernelOutputTextures = [];
				this._setupSubOutputTextures(this.subKernels.length);
			}
			gl.drawBuffers(this.drawBuffersMap);
		}

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		if (this.subKernelOutputTextures !== null) {
			if (this.subKernels !== null) {
				const output = {
					result: this.renderOutput()
				};
				if (this.pipeline) {
					for (let i = 0; i < this.subKernels.length; i++) {
						output[this.subKernels[i].property] = new Texture({
							texture: this.subKernelOutputTextures[i],
							size: texSize,
							dimensions: this.threadDim,
							output: this.output,
							context: this.context,
							gpu: this.gpu,
							type: this.getReturnTextureType(),
						});
					}
				} else {
					for (let i = 0; i < this.subKernels.length; i++) {
						output[this.subKernels[i].property] = new Texture({
							texture: this.subKernelOutputTextures[i],
							size: texSize,
							dimensions: this.threadDim,
							output: this.output,
							context: this.context,
							gpu: this.gpu,
							type: this.getReturnTextureType(),
						}).toArray();
					}
				}
				return output;
			}
		}

		return this.renderOutput();
	}

	drawBuffers() {
		this.context.drawBuffers(this.drawBuffersMap);
	}

	getOutputTexture() {
		return this.outputTexture;
	}

	_setupOutputTexture() {
		const {
			texSize
		} = this;
		const gl = this.context;
		const texture = this.outputTexture = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.argumentNames.length);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		if (this.precision === 'single') {
			if (this.pipeline) {
				switch (this.returnType) {
					case 'Number':
					case 'Float':
					case 'Integer':
						if (this.optimizeFloatMemory) {
							gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
						} else {
							gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, texSize[0], texSize[1], 0, gl.RED, gl.FLOAT, null);
						}
						break;
					case 'Array(2)':
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, texSize[0], texSize[1], 0, gl.RG, gl.FLOAT, null);
						break;
					case 'Array(3)':
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB32F, texSize[0], texSize[1], 0, gl.RGB, gl.FLOAT, null);
						break;
					case 'Array(4)':
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
						break;
					default:
						throw new Error('Unhandled return type');
				}
			} else {
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
			}
		} else {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		}
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
	}

	_setupSubOutputTextures(length) {
		const {
			texSize
		} = this;
		const gl = this.context;
		const drawBuffersMap = this.drawBuffersMap = [gl.COLOR_ATTACHMENT0];
		const textures = this.subKernelOutputTextures = [];
		for (let i = 0; i < length; i++) {
			const texture = this.context.createTexture();
			textures.push(texture);
			drawBuffersMap.push(gl.COLOR_ATTACHMENT0 + i + 1);
			gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.argumentNames.length + i);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			// TODO: upgrade this
			if (this.precision === 'single') {
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
			} else {
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			}
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i + 1, gl.TEXTURE_2D, texture, 0);
		}
	}


	/**
	 * @desc Adds kernel parameters to the Argument Texture,
	 * binding it to the context, etc.
	 *
	 * @param {Array|Texture|Number|Input} value - The actual argument supplied to the kernel
	 * @param {String} type - Type of the argument
	 * @param {String} name - Name of the argument
	 */
	addArgument(value, type, name) {
		const gl = this.context;
		const argumentTexture = this.getArgumentTexture(name);
		if (value instanceof Texture) {
			type = value.type;
		}
		switch (type) {
			case 'Array':
			case 'Array(2)':
			case 'Array(3)':
			case 'Array(4)':
			case 'Array2D':
			case 'Array3D':
				{
					const dim = utils.getDimensions(value, true);
					const bitRatio = this.argumentBitRatios[this.argumentsLength];
					if (this.precision === 'single') {
						const textureSize = utils.getMemoryOptimizedFloatTextureSize(dim, bitRatio);
						gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.argumentsLength);
						gl.bindTexture(gl.TEXTURE_2D, argumentTexture);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
						const length = textureSize[0] * textureSize[1] * bitRatio;
						const valuesFlat = this.formatArrayTransfer(value, length, Float32Array);
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, textureSize[0], textureSize[1], 0, gl.RGBA, gl.FLOAT, valuesFlat);

						if (!this.hardcodeConstants) {
							this.setUniform3iv(`user_${name}Dim`, dim);
							this.setUniform2iv(`user_${name}Size`, textureSize);
						}
						this.setUniform1i(`user_${name}`, this.argumentsLength);
					} else {
						const textureSize = utils.getMemoryOptimizedPackedTextureSize(dim, bitRatio);
						gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.argumentsLength);
						gl.bindTexture(gl.TEXTURE_2D, argumentTexture);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

						const length = textureSize[0] * textureSize[1] * (4 / bitRatio);
						const valuesFlat = this.formatArrayTransfer(value, length);
						const buffer = new Uint8Array(valuesFlat.buffer);
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureSize[0], textureSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, buffer);

						if (!this.hardcodeConstants) {
							this.setUniform3iv(`user_${name}Dim`, dim);
							this.setUniform2iv(`user_${name}Size`, textureSize);
						}
						this.setUniform1i(`user_${name}`, this.argumentsLength);
					}
					break;
				}
			case 'Integer':
			case 'Float':
			case 'Number':
				{
					this.setUniform1f(`user_${name}`, value);
					break;
				}
			case 'Input':
				{
					const input = value;
					const dim = utils.getDimensions(input, true);
					const bitRatio = this.argumentBitRatios[this.argumentsLength];
					if (this.precision === 'single') {
						const textureSize = utils.getMemoryOptimizedFloatTextureSize(dim, bitRatio);
						gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.argumentsLength);
						gl.bindTexture(gl.TEXTURE_2D, argumentTexture);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
						const length = textureSize[0] * textureSize[1] * bitRatio;
						const valuesFlat = this.formatArrayTransfer(input.value, length, Float32Array);
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, textureSize[0], textureSize[1], 0, gl.RGBA, gl.FLOAT, valuesFlat);

						if (!this.hardcodeConstants) {
							this.setUniform3iv(`user_${name}Dim`, dim);
							this.setUniform2iv(`user_${name}Size`, textureSize);
						}
						this.setUniform1i(`user_${name}`, this.argumentsLength);
					} else {
						const textureSize = utils.getMemoryOptimizedPackedTextureSize(dim, bitRatio);
						gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.argumentsLength);
						gl.bindTexture(gl.TEXTURE_2D, argumentTexture);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

						const length = textureSize[0] * textureSize[1] * (4 / bitRatio);
						const valuesFlat = this.formatArrayTransfer(input.value, length);
						const buffer = new Uint8Array(valuesFlat.buffer);
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureSize[0], textureSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, buffer);

						if (!this.hardcodeConstants) {
							this.setUniform3iv(`user_${name}Dim`, dim);
							this.setUniform2iv(`user_${name}Size`, textureSize);
						}
						this.setUniform1i(`user_${name}`, this.argumentsLength);
					}
					break;
				}
			case 'HTMLImage':
				{
					const inputImage = value;
					const dim = [inputImage.width, inputImage.height, 1];
					const size = [inputImage.width, inputImage.height];

					gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.argumentsLength);
					gl.bindTexture(gl.TEXTURE_2D, argumentTexture);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
					gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
					// Upload the image into the texture.
					const mipLevel = 0; // the largest mip
					const internalFormat = gl.RGBA; // format we want in the texture
					const srcFormat = gl.RGBA; // format of data we are supplying
					const srcType = gl.UNSIGNED_BYTE; // type of data we are supplying
					gl.texImage2D(gl.TEXTURE_2D,
						mipLevel,
						internalFormat,
						srcFormat,
						srcType,
						inputImage);
					this.setUniform3iv(`user_${name}Dim`, dim);
					this.setUniform2iv(`user_${name}Size`, size);
					this.setUniform1i(`user_${name}`, this.argumentsLength);
					break;
				}
			case 'HTMLImageArray':
				{
					const inputImages = value;
					const dim = [inputImages[0].width, inputImages[0].height, inputImages.length];
					const size = [inputImages[0].width, inputImages[0].height];

					gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.argumentsLength);
					gl.bindTexture(gl.TEXTURE_2D_ARRAY, argumentTexture);
					gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
					gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
					gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
					// Upload the images into the texture.
					const mipLevel = 0; // the largest mip
					const internalFormat = gl.RGBA; // format we want in the texture
					const width = inputImages[0].width;
					const height = inputImages[0].height;
					const textureDepth = inputImages.length;
					const border = 0;
					const srcFormat = gl.RGBA; // format of data we are supplying
					const srcType = gl.UNSIGNED_BYTE; // type of data we are supplying
					gl.texImage3D(
						gl.TEXTURE_2D_ARRAY,
						mipLevel,
						internalFormat,
						width,
						height,
						textureDepth,
						border,
						srcFormat,
						srcType,
						null
					);
					for (let i = 0; i < inputImages.length; i++) {
						const xOffset = 0;
						const yOffset = 0;
						const imageDepth = 1;
						gl.texSubImage3D(
							gl.TEXTURE_2D_ARRAY,
							mipLevel,
							xOffset,
							yOffset,
							i,
							inputImages[i].width,
							inputImages[i].height,
							imageDepth,
							srcFormat,
							srcType,
							inputImages[i]
						);
					}
					this.setUniform3iv(`user_${name}Dim`, dim);
					this.setUniform2iv(`user_${name}Size`, size);
					this.setUniform1i(`user_${name}`, this.argumentsLength);
					break;
				}
			case 'ArrayTexture(1)':
			case 'ArrayTexture(2)':
			case 'ArrayTexture(3)':
			case 'ArrayTexture(4)':
				{
					const inputTexture = value;
					if (inputTexture.context !== this.context) {
						throw new Error(`argument ${ name} (${ type }) must be from same context`);
					}
					const dim = inputTexture.dimensions;
					const size = inputTexture.size;

					gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.argumentsLength);
					gl.bindTexture(gl.TEXTURE_2D, inputTexture.texture);

					this.setUniform3iv(`user_${name}Dim`, dim);
					this.setUniform2iv(`user_${name}Size`, size);
					this.setUniform1i(`user_${name}`, this.argumentsLength);
					break;
				}
			case 'MemoryOptimizedNumberTexture':
			case 'NumberTexture':
				{
					const inputTexture = value;
					if (inputTexture.context !== this.context) {
						throw new Error(`argument ${ name} (${ type }) must be from same context`);
					}
					const dim = inputTexture.dimensions;
					const size = inputTexture.size;

					gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.argumentsLength);
					gl.bindTexture(gl.TEXTURE_2D, inputTexture.texture);

					this.setUniform3iv(`user_${name}Dim`, dim);
					this.setUniform2iv(`user_${name}Size`, size);
					this.setUniform1i(`user_${name}`, this.argumentsLength);
					break;
				}
			case 'Boolean':
				{
					this.setUniform1i(`user_${name}`, value ? 1 : 0);
					break;
				}
			default:
				throw new Error('Argument type not supported: ' + value);
		}
		this.argumentsLength++;
	}

	_getMainConstantsString() {
		const result = [];
		if (this.constants) {
			for (let name in this.constants) {
				if (!this.constants.hasOwnProperty(name)) continue;
				let value = this.constants[name];
				let type = utils.getVariableType(value);
				switch (type) {
					case 'Integer':
						result.push('const int constants_' + name + ' = ' + parseInt(value));
						break;
					case 'Float':
						result.push('const float constants_' + name + ' = ' + parseFloat(value));
						break;
					case 'Array':
					case 'Input':
					case 'HTMLImage':
					case 'ArrayTexture(1)':
					case 'ArrayTexture(2)':
					case 'ArrayTexture(3)':
					case 'ArrayTexture(4)':
					case 'NumberTexture':
						result.push(
							`uniform highp sampler2D constants_${ name }`,
							`uniform highp ivec2 constants_${ name }Size`,
							`uniform highp ivec3 constants_${ name }Dim`,
						);
						break;
					case 'HTMLImageArray':
						result.push(
							`uniform highp sampler2DArray constants_${ name }`,
							`uniform highp ivec2 constants_${ name }Size`,
							`uniform highp ivec3 constants_${ name }Dim`,
						);
						break;
					case 'Boolean':
						result.push('const bool constants_' + name + ' = ' + (value ? 'true' : 'false'));
						break;
					default:
						throw new Error(`Unsupported constant ${ name } type ${ type }`);
				}
			}
		}
		return utils.linesToString(result);
	}

	/**
	 * @desc Adds kernel parameters to the Argument Texture,
	 * binding it to the context, etc.
	 *
	 * @param {Array|Texture|Number} value - The actual argument supplied to the kernel
	 * @param {String} type - Type of the argument
	 * @param {String} name - Name of the argument
	 */
	addConstant(value, type, name) {
		const gl = this.context;
		const constantTexture = this.getArgumentTexture(name);
		if (value instanceof Texture) {
			type = value.type;
		}
		switch (type) {
			case 'Array':
			case 'Array(2)':
			case 'Array(3)':
			case 'Array(4)':
			case 'Array2D':
			case 'Array3D':
				{
					const dim = utils.getDimensions(value, true);
					const bitRatio = this.constantBitRatios[name];
					if (this.precision === 'single') {
						const textureSize = utils.getMemoryOptimizedFloatTextureSize(dim, bitRatio);
						gl.activeTexture(gl.TEXTURE0 + this.constantsLength);
						gl.bindTexture(gl.TEXTURE_2D, constantTexture);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
						const length = textureSize[0] * textureSize[1] * bitRatio;
						const valuesFlat = this.formatArrayTransfer(value, length, Float32Array);
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, textureSize[0], textureSize[1], 0, gl.RGBA, gl.FLOAT, valuesFlat);

						if (!this.hardcodeConstants) {
							this.setUniform3iv(`constants_${name}Dim`, dim);
							this.setUniform2iv(`constants_${name}Size`, textureSize);
						}
						this.setUniform1i(`constants_${name}`, this.constantsLength);
					} else {
						const textureSize = utils.getMemoryOptimizedPackedTextureSize(dim, bitRatio);
						gl.activeTexture(gl.TEXTURE0 + this.constantsLength);
						gl.bindTexture(gl.TEXTURE_2D, constantTexture);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

						const length = textureSize[0] * textureSize[1] * (4 / bitRatio);
						const valuesFlat = this.formatArrayTransfer(value, length);
						const buffer = new Uint8Array(valuesFlat.buffer);
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureSize[0], textureSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, buffer);

						if (!this.hardcodeConstants) {
							this.setUniform3iv(`constants_${name}Dim`, dim);
							this.setUniform2iv(`constants_${name}Size`, textureSize);
						}
						this.setUniform1i(`constants_${name}`, this.constantsLength);
					}
				}
				break;
			case 'Input':
				{
					const input = value;
					const dim = utils.getDimensions(input, true);
					const bitRatio = this.constantBitRatios[name];
					if (this.precision === 'single') {
						const textureSize = utils.getMemoryOptimizedFloatTextureSize(dim, bitRatio);
						gl.activeTexture(gl.TEXTURE0 + this.constantsLength);
						gl.bindTexture(gl.TEXTURE_2D, constantTexture);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
						const length = textureSize[0] * textureSize[1] * bitRatio;
						// TODO: better handle 16 and 8 bit?
						// const ext = gl.getExtension('OES_texture_half_float');
						const valuesFlat = this.formatArrayTransfer(input.value, length, Float32Array);
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, textureSize[0], textureSize[1], 0, gl.RGBA, gl.FLOAT, valuesFlat);

						if (!this.hardcodeConstants) {
							this.setUniform3iv(`constants_${name}Dim`, dim);
							this.setUniform2iv(`constants_${name}Size`, textureSize);
						}
						this.setUniform1i(`constants_${name}`, this.constantsLength);
					} else {
						const textureSize = utils.getMemoryOptimizedPackedTextureSize(dim, bitRatio);
						gl.activeTexture(gl.TEXTURE0 + this.constantsLength);
						gl.bindTexture(gl.TEXTURE_2D, constantTexture);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

						const length = textureSize[0] * textureSize[1] * (4 / bitRatio);
						const valuesFlat = this.formatArrayTransfer(input.value, length);
						const buffer = new Uint8Array(valuesFlat.buffer);
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureSize[0], textureSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, buffer);

						if (!this.hardcodeConstants) {
							this.setUniform3iv(`constants_${name}Dim`, dim);
							this.setUniform2iv(`constants_${name}Size`, textureSize);
						}
						this.setUniform1i(`constants_${name}`, this.argumentsLength);
					}
					break;
				}
			case 'HTMLImage':
				{
					const inputImage = value;
					const dim = [inputImage.width, inputImage.height, 1];
					const size = [inputImage.width, inputImage.height];

					gl.activeTexture(gl.TEXTURE0 + this.constantsLength);
					gl.bindTexture(gl.TEXTURE_2D, constantTexture);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
					gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
					// Upload the image into the texture.
					const mipLevel = 0; // the largest mip
					const internalFormat = gl.RGBA; // format we want in the texture
					const srcFormat = gl.RGBA; // format of data we are supplying
					const srcType = gl.UNSIGNED_BYTE; // type of data we are supplying
					gl.texImage2D(gl.TEXTURE_2D,
						mipLevel,
						internalFormat,
						srcFormat,
						srcType,
						inputImage);
					this.setUniform3iv(`constants_${name}Dim`, dim);
					this.setUniform2iv(`constants_${name}Size`, size);
					this.setUniform1i(`constants_${name}`, this.constantsLength);
					break;
				}
			case 'HTMLImageArray':
				{
					const inputImages = value;
					const dim = [inputImages[0].width, inputImages[0].height, inputImages.length];
					const size = [inputImages[0].width, inputImages[0].height];

					gl.activeTexture(gl.TEXTURE0 + this.constantsLength);
					gl.bindTexture(gl.TEXTURE_2D_ARRAY, constantTexture);
					gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
					gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
					gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
					// Upload the images into the texture.
					const mipLevel = 0; // the largest mip
					const internalFormat = gl.RGBA; // format we want in the texture
					const width = inputImages[0].width;
					const height = inputImages[0].height;
					const textureDepth = inputImages.length;
					const border = 0;
					const srcFormat = gl.RGBA; // format of data we are supplying
					const srcType = gl.UNSIGNED_BYTE; // type of data we are supplying
					gl.texImage3D(
						gl.TEXTURE_2D_ARRAY,
						mipLevel,
						internalFormat,
						width,
						height,
						textureDepth,
						border,
						srcFormat,
						srcType,
						null
					);
					for (let i = 0; i < inputImages.length; i++) {
						const xOffset = 0;
						const yOffset = 0;
						const imageDepth = 1;
						gl.texSubImage3D(
							gl.TEXTURE_2D_ARRAY,
							mipLevel,
							xOffset,
							yOffset,
							i,
							inputImages[i].width,
							inputImages[i].height,
							imageDepth,
							srcFormat,
							srcType,
							inputImages[i]
						);
					}
					this.setUniform3iv(`constants_${name}Dim`, dim);
					this.setUniform2iv(`constants_${name}Size`, size);
					this.setUniform1i(`constants_${name}`, this.constantsLength);
					break;
				}
			case 'ArrayTexture(1)':
			case 'ArrayTexture(2)':
			case 'ArrayTexture(3)':
			case 'ArrayTexture(4)':
				{
					const inputTexture = value;
					if (inputTexture.context !== this.context) {
						throw new Error(`constant ${ name} (${ type }) must be from same context`);
					}
					const dim = inputTexture.dimensions;
					const size = inputTexture.size;

					gl.activeTexture(gl.TEXTURE0 + this.constantsLength);
					gl.bindTexture(gl.TEXTURE_2D, inputTexture.texture);

					this.setUniform3iv(`constants_${name}Dim`, dim);
					this.setUniform2iv(`constants_${name}Size`, size);
					this.setUniform1i(`constants_${name}`, this.constantsLength);
					break;
				}
			case 'MemoryOptimizedNumberTexture':
			case 'NumberTexture':
				{
					const inputTexture = value;
					if (inputTexture.context !== this.context) {
						throw new Error(`constant ${ name} (${ type }) must be from same context`);
					}
					const dim = inputTexture.dimensions;
					const size = inputTexture.size;

					gl.activeTexture(gl.TEXTURE0 + this.constantsLength);
					gl.bindTexture(gl.TEXTURE_2D, inputTexture.texture);

					this.setUniform3iv(`constants_${name}Dim`, dim);
					this.setUniform2iv(`constants_${name}Size`, size);
					this.setUniform1i(`constants_${name}`, this.constantsLength);
					break;
				}
			case 'Integer':
			case 'Float':
			default:
				throw new Error('constant type not supported: ' + value);
		}
		this.constantsLength++;
	}

	/**
	 *
	 * @desc Get the header string for the program.
	 * This returns an empty string if no sub-kernels are defined.
	 *
	 * @returns {String} result
	 */
	_getHeaderString() {
		return '';
	}

	/**
	 * @desc Get texture coordinate string for the program
	 * @returns {String} result
	 */
	_getTextureCoordinate() {
		const subKernels = this.subKernels;
		if (subKernels === null || subKernels.length < 1) {
			return 'in highp vec2 vTexCoord;\n';
		} else {
			return 'out highp vec2 vTexCoord;\n';
		}
	}

	/**
	 * @desc Generate transpiled glsl Strings for user-defined parameters sent to a kernel
	 * @param {Array} args - The actual parameters sent to the Kernel
	 * @returns {String} result
	 */
	_getMainArgumentsString(args) {
		const result = [];
		const argumentTypes = this.argumentTypes;
		const argumentNames = this.argumentNames;
		for (let i = 0; i < argumentNames.length; i++) {
			const value = args[i];
			const name = argumentNames[i];
			const type = argumentTypes[i];
			if (this.hardcodeConstants) {
				switch (type) {
					case 'Array':
					case 'NumberTexture':
					case 'MemoryOptimizedNumberTexture':
					case 'ArrayTexture(1)':
					case 'ArrayTexture(2)':
					case 'ArrayTexture(3)':
					case 'ArrayTexture(4)':
					case 'Input':
					case 'HTMLImage':
						const dim = utils.getDimensions(value, true);
						const size = utils.dimToTexSize({
							floatTextures: this.optimizeFloatMemory,
							floatOutput: this.precision === 'single'
						}, dim);

						result.push(
							`uniform highp sampler2D user_${ name }`,
							`highp ivec2 user_${ name }Size = ivec2(${ size[0] }, ${ size[1] })`,
							`highp ivec3 user_${ name }Dim = ivec3(${ dim[0] }, ${ dim[1]}, ${ dim[2] })`,
						);
						break;
					case 'Integer':
						result.push(`highp float user_${ name } = ${ value }.0`);
						break;
					case 'Float':
					case 'Number':
						result.push(`highp float user_${ name } = ${ Number.isInteger(value) ? value + '.0' : value }`);
						break;
					case 'Boolean':
						result.push(`uniform int user_${name}`);
						break;
					default:
						throw new Error(`Argument type ${type} not supported in WebGL2`);
				}
			} else {
				switch (type) {
					case 'Array':
					case 'NumberTexture':
					case 'MemoryOptimizedNumberTexture':
					case 'ArrayTexture(1)':
					case 'ArrayTexture(2)':
					case 'ArrayTexture(3)':
					case 'ArrayTexture(4)':
					case 'Input':
					case 'HTMLImage':
						result.push(
							`uniform highp sampler2D user_${ name }`,
							`uniform highp ivec2 user_${ name }Size`,
							`uniform highp ivec3 user_${ name }Dim`
						);
						break;
					case 'HTMLImageArray':
						result.push(
							`uniform highp sampler2DArray user_${ name }`,
							`uniform highp ivec2 user_${ name }Size`,
							`uniform highp ivec3 user_${ name }Dim`
						);
						break;
					case 'Integer':
					case 'Float':
					case 'Number':
						result.push(`uniform float user_${ name }`);
						break;
					case 'Boolean':
						result.push(`uniform int user_${name}`);
						break;
					default:
						throw new Error(`Argument type ${type} not supported in WebGL2`);
				}
			}
		}
		return utils.linesToString(result);
	}

	/**
	 * @desc Get Kernel program string (in *glsl*) for a kernel.
	 * @returns {String} result
	 */
	getKernelString() {
		let kernelResultDeclaration;
		switch (this.returnType) {
			case 'Array(2)':
				kernelResultDeclaration = 'vec2 kernelResult';
				break;
			case 'Array(3)':
				kernelResultDeclaration = 'vec3 kernelResult';
				break;
			case 'Array(4)':
				kernelResultDeclaration = 'vec4 kernelResult';
				break;
			case 'LiteralInteger':
			case 'Float':
			case 'Number':
			case 'Integer':
				kernelResultDeclaration = 'float kernelResult';
				break;
			default:
				if (this.graphical) {
					kernelResultDeclaration = 'float kernelResult';
				} else {
					throw new Error(`unrecognized output type "${ this.returnType }"`);
				}
		}

		const result = [];
		const subKernels = this.subKernels;
		if (subKernels !== null) {
			result.push(
				kernelResultDeclaration,
				'layout(location = 0) out vec4 data0'
			);
			for (let i = 0; i < subKernels.length; i++) {
				result.push(
					`float subKernelResult_${ subKernels[i].name } = 0.0`,
					`layout(location = ${ i + 1 }) out vec4 data${ i + 1 }`
				);
			}
		} else {
			result.push(
				'out vec4 data0',
				kernelResultDeclaration
			);
		}

		return utils.linesToString(result) + this.translatedSource;
	}

	getMainResultGraphical() {
		return utils.linesToString([
			'  threadId = indexTo3D(index, uOutputDim)',
			'  kernel()',
			'  data0 = actualColor',
		]);
	}

	getMainResultPackedPixels() {
		switch (this.returnType) {
			case 'LiteralInteger':
			case 'Number':
			case 'Integer':
			case 'Float':
				return utils.linesToString(this.getMainResultKernelPackedPixels()) +
					utils.linesToString(this.getMainResultSubKernelPackedPixels());
			default:
				throw new Error(`packed output only usable with Numbers, "${this.returnType}" specified`);
		}
	}

	getMainResultKernelPackedPixels() {
		return [
			'  threadId = indexTo3D(index, uOutputDim)',
			'  kernel()',
			'  data0 = encode32(kernelResult)'
		];
	}

	getMainResultSubKernelPackedPixels() {
		const result = [];
		if (!this.subKernels) return result;
		for (let i = 0; i < this.subKernels.length; i++) {
			result.push(
				`  data${i + 1} = encode32(subKernelResult_${this.subKernels[i].name})`
			);
		}
		return result;
	}

	getMainResultMemoryOptimizedFloats() {
		const result = [
			'  index *= 4',
		];

		switch (this.returnType) {
			case 'Number':
			case 'Integer':
			case 'Float':
				const channels = ['r', 'g', 'b', 'a'];
				for (let i = 0; i < channels.length; i++) {
					const channel = channels[i];
					this.getMainResultKernelMemoryOptimizedFloats(result, channel);
					this.getMainResultSubKernelMemoryOptimizedFloats(result, channel);
					if (i + 1 < channels.length) {
						result.push('  index += 1');
					}
				}
				break;
			default:
				throw new Error(`optimized output only usable with Numbers, ${this.returnType} specified`);
		}

		return utils.linesToString(result);
	}

	getMainResultKernelMemoryOptimizedFloats(result, channel) {
		result.push(
			'  threadId = indexTo3D(index, uOutputDim)',
			'  kernel()',
			`  data0.${channel} = kernelResult`,
		);
	}

	getMainResultSubKernelMemoryOptimizedFloats(result, channel) {
		if (!this.subKernels) return result;
		for (let i = 0; i < this.subKernels.length; i++) {
			result.push(
				`  data${i + 1}.${channel} = subKernelResult_${this.subKernels[i].name}`,
			);
		}
	}

	getMainResultKernelNumberTexture() {
		return [
			'  threadId = indexTo3D(index, uOutputDim)',
			'  kernel()',
			'  data0[0] = kernelResult',
		];
	}

	getMainResultSubKernelNumberTexture() {
		const result = [];
		if (!this.subKernels) return result;
		for (let i = 0; i < this.subKernels.length; ++i) {
			result.push(
				`  data${i + 1}[0] = subKernelResult_${this.subKernels[i].name}`,
			);
		}
		return result;
	}

	getMainResultKernelArray2Texture() {
		return [
			'  threadId = indexTo3D(index, uOutputDim)',
			'  kernel()',
			'  data0[0] = kernelResult[0]',
			'  data0[1] = kernelResult[1]',
		];
	}

	getMainResultSubKernelArray2Texture() {
		const result = [];
		if (!this.subKernels) return result;
		for (let i = 0; i < this.subKernels.length; ++i) {
			result.push(
				`  data${i + 1}[0] = subKernelResult_${this.subKernels[i].name}[0]`,
				`  data${i + 1}[1] = subKernelResult_${this.subKernels[i].name}[1]`,
			);
		}
		return result;
	}

	getMainResultKernelArray3Texture() {
		return [
			'  threadId = indexTo3D(index, uOutputDim)',
			'  kernel()',
			'  data0[0] = kernelResult[0]',
			'  data0[1] = kernelResult[1]',
			'  data0[2] = kernelResult[2]',
		];
	}

	getMainResultSubKernelArray3Texture() {
		const result = [];
		if (!this.subKernels) return result;
		for (let i = 0; i < this.subKernels.length; ++i) {
			result.push(
				`  data${i + 1}[0] = subKernelResult_${this.subKernels[i].name}[0]`,
				`  data${i + 1}[1] = subKernelResult_${this.subKernels[i].name}[1]`,
				`  data${i + 1}[2] = subKernelResult_${this.subKernels[i].name}[2]`,
			);
		}
		return result;
	}

	getMainResultKernelArray4Texture() {
		return [
			'  threadId = indexTo3D(index, uOutputDim)',
			'  kernel()',
			'  data0 = kernelResult',
		];
	}

	getMainResultSubKernelArray4Texture() {
		const result = [];
		if (!this.subKernels) return result;
		for (let i = 0; i < this.subKernels.length; ++i) {
			result.push(
				`  data${i + 1} = subKernelResult_${this.subKernels[i].name}`,
			);
		}
		return result;
	}

	/**
	 * @desc Get the fragment shader String.
	 * If the String hasn't been compiled yet,
	 * then this method compiles it as well
	 *
	 * @param {Array} args - The actual parameters sent to the Kernel
	 * @returns {string} Fragment Shader string
	 */
	getFragmentShader(args) {
		if (this.compiledFragmentShader !== null) {
			return this.compiledFragmentShader;
		}
		return this.compiledFragmentShader = this.replaceArtifacts(this.constructor.fragmentShader, this._getFragShaderArtifactMap(args));
	}

	/**
	 * @desc Get the vertical shader String
	 * @param {Array} args - The actual parameters sent to the Kernel
	 * @returns {string} Vertical Shader string
	 *
	 */
	getVertexShader(args) {
		if (this.compiledVertexShader !== null) {
			return this.compiledVertexShader;
		}
		return this.compiledVertexShader = this.constructor.vertexShader;
	}

	destroyExtensions() {
		this.extensions.EXT_color_buffer_float = null;
		this.extensions.OES_texture_float_linear = null;
	}

	toJSON() {
		const json = super.toJSON();
		json.functionNodes = FunctionBuilder.fromKernel(this, WebGL2FunctionNode).toJSON();
		return json;
	}
}

module.exports = {
	WebGL2Kernel
};