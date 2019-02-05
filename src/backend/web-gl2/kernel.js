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

		if (testCanvas) {
			testContext = testCanvas.getContext('webgl2');
			testExtensions = {
				EXT_color_buffer_float: testContext.getExtension('EXT_color_buffer_float'),
				OES_texture_float_linear: testContext.getExtension('OES_texture_float_linear'),
			};
			features = this.getFeatures();
		}
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
			kernelMap: true
		});
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
		if (this.skipValidate) {
			this.texSize = utils.dimToTexSize({
				floatTextures: this.floatTextures,
				floatOutput: this.floatOutput
			}, this.output, true);
			return;
		}

		const features = this.constructor.features;
		if (this.floatOutput === true && this.floatOutputForce !== true && !features.isFloatRead) {
			throw new Error('Float texture outputs are not supported');
		} else if (this.floatTextures === undefined) {
			this.floatTextures = true;
			this.floatOutput = features.isFloatRead;
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
			if (argType === 'Array') {
				this.output = utils.getDimensions(argType);
			} else if (argType === 'NumberTexture' || argType === 'ArrayTexture(4)') {
				this.output = arguments[0].output;
			} else {
				throw new Error('Auto output not supported for input type: ' + argType);
			}
		}

		this.texSize = utils.dimToTexSize({
			floatTextures: this.floatTextures,
			floatOutput: this.floatOutput
		}, this.output, true);

		if (this.graphical) {
			if (this.output.length !== 2) {
				throw new Error('Output must have 2 dimensions on graphical mode');
			}

			if (this.floatOutput) {
				this.floatOutput = false;
				console.warn('Cannot use graphical mode and float output at the same time');
			}

			this.texSize = utils.clone(this.output);
		} else if (this.floatOutput === undefined) {
			this.floatOutput = true;
		}

		if (this.floatOutput || this.floatOutputForce) {
			this.context.getExtension('EXT_color_buffer_float');
		}
	}

	run() {
		if (this.program === null) {
			this.build.apply(this, arguments);
		}
		const argumentNames = this.argumentNames;
		const argumentTypes = this.argumentTypes;
		const texSize = this.texSize;
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
			this._addArgument(arguments[texIndex], argumentTypes[texIndex], argumentNames[texIndex]);
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
				return new Texture(this.outputTexture, texSize, this.threadDim, this.output, this.context, 'ArrayTexture(4)');
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
		const outputTexture = this.outputTexture;

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
					result: this.renderOutput(outputTexture)
				};
				for (let i = 0; i < this.subKernels.length; i++) {
					output[this.subKernels[i].property] = new Texture(this.subKernelOutputTextures[i], texSize, this.threadDim, this.output, this.context);
				}
				return output;
			}
		}

		return this.renderOutput(outputTexture);
	}

	drawBuffers() {
		this.context.drawBuffers(this.drawBuffersMap);
	}

	getOutputTexture() {
		return this.outputTexture;
	}

	_setupOutputTexture() {
		const gl = this.context;
		const texSize = this.texSize;
		const texture = this.outputTexture = this.context.createTexture();
		gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.argumentNames.length);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		if (this.floatOutput) {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
		} else {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		}
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
	}

	_setupSubOutputTextures(length) {
		const gl = this.context;
		const texSize = this.texSize;
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
			if (this.floatOutput) {
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
	 * @param {Array|Texture|Number} value - The actual argument supplied to the kernel
	 * @param {String} type - Type of the argument
	 * @param {String} name - Name of the argument
	 */
	_addArgument(value, type, name) {
		const gl = this.context;
		const argumentTexture = this.getArgumentTexture(name);
		if (value instanceof Texture) {
			type = value.type;
		}
		switch (type) {
			case 'Array':
				{
					const dim = utils.getDimensions(value, true);
					const size = utils.dimToTexSize({
						floatTextures: this.floatTextures,
						floatOutput: this.floatOutput
					}, dim);
					gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.argumentsLength);
					gl.bindTexture(gl.TEXTURE_2D, argumentTexture);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

					let length = size[0] * size[1];

					const {
						valuesFlat,
						bitRatio
					} = this._formatArrayTransfer(value, length);

					let buffer;
					if (this.floatTextures) {
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size[0], size[1], 0, gl.RGBA, gl.FLOAT, valuesFlat);
					} else {
						buffer = new Uint8Array(valuesFlat.buffer);
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size[0] / bitRatio, size[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
					}

					if (!this.hardcodeConstants) {
						this.setUniform3iv(`user_${name}Dim`, dim);
						this.setUniform2iv(`user_${name}Size`, size);
					}
					this.setUniform1i(`user_${name}BitRatio`, bitRatio);
					this.setUniform1i(`user_${name}`, this.argumentsLength);
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
					const dim = input.size;
					const size = utils.dimToTexSize({
						floatTextures: this.floatTextures,
						floatOutput: this.floatOutput
					}, dim);
					gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.argumentsLength);
					gl.bindTexture(gl.TEXTURE_2D, argumentTexture);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

					let length = size[0] * size[1];
					const {
						valuesFlat,
						bitRatio
					} = this._formatArrayTransfer(value.value, length);

					if (this.floatTextures) {
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size[0], size[1], 0, gl.RGBA, gl.FLOAT, inputArray);
					} else {
						const buffer = new Uint8Array(valuesFlat.buffer);
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size[0] / bitRatio, size[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
					}

					if (!this.hardcodeConstants) {
						this.setUniform3iv(`user_${name}Dim`, dim);
						this.setUniform2iv(`user_${name}Size`, size);
					}
					this.setUniform1i(`user_${name}BitRatio`, bitRatio);
					this.setUniform1i(`user_${name}`, this.argumentsLength);
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
			case 'ArrayTexture(4)':
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
					this.setUniform1i(`user_${name}BitRatio`, 1); // always float32
					this.setUniform1i(`user_${name}`, this.argumentsLength);
					break;
				}
			default:
				throw new Error('Input type not supported: ' + value);
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
					case 'ArrayTexture(4)':
					case 'NumberTexture':
						result.push(
							`uniform highp sampler2D constants_${ name }`,
							`uniform highp ivec2 constants_${ name }Size`,
							`uniform highp ivec3 constants_${ name }Dim`,
							`uniform highp int constants_${ name }BitRatio`
						);
						break;
					case 'HTMLImageArray':
						result.push(
							`uniform highp sampler2DArray constants_${ name }`,
							`uniform highp ivec2 constants_${ name }Size`,
							`uniform highp ivec3 constants_${ name }Dim`,
							`uniform highp int constants_${ name }BitRatio`
						);
						break;

					default:
						throw new Error(`Unsupported constant ${ name } type ${ type }`);
				}
			}
		}
		return this._linesToString(result);
	}

	/**
	 * @desc Adds kernel parameters to the Argument Texture,
	 * binding it to the context, etc.
	 *
	 * @param {Array|Texture|Number} value - The actual argument supplied to the kernel
	 * @param {String} type - Type of the argument
	 * @param {String} name - Name of the argument
	 */
	_addConstant(value, type, name) {
		const gl = this.context;
		const argumentTexture = this.getArgumentTexture(name);
		if (value instanceof Texture) {
			type = value.type;
		}
		switch (type) {
			case 'Array':
				{
					const dim = utils.getDimensions(value, true);
					const size = utils.dimToTexSize({
						floatTextures: this.floatTextures,
						floatOutput: this.floatOutput
					}, dim);
					gl.activeTexture(gl.TEXTURE0 + this.constantsLength);
					gl.bindTexture(gl.TEXTURE_2D, argumentTexture);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

					let length = size[0] * size[1];

					const {
						valuesFlat,
						bitRatio
					} = this._formatArrayTransfer(value, length);

					let buffer;
					if (this.floatTextures) {
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size[0], size[1], 0, gl.RGBA, gl.FLOAT, valuesFlat);
					} else {
						buffer = new Uint8Array(valuesFlat.buffer);
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size[0] / bitRatio, size[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
					}

					if (!this.hardcodeConstants) {
						this.setUniform3iv(`constants_${name}Dim`, dim);
						this.setUniform2iv(`constants_${name}Size`, size);
					}
					this.setUniform1i(`constants_${name}BitRatio`, bitRatio);
					this.setUniform1i(`constants_${name}`, this.constantsLength);
					break;
				}
			case 'Input':
				{
					const input = value;
					const dim = input.size;
					const size = utils.dimToTexSize({
						floatTextures: this.floatTextures,
						floatOutput: this.floatOutput
					}, dim);
					gl.activeTexture(gl.TEXTURE0 + this.constantsLength);
					gl.bindTexture(gl.TEXTURE_2D, argumentTexture);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

					let length = size[0] * size[1];
					const {
						valuesFlat,
						bitRatio
					} = this._formatArrayTransfer(value.value, length);

					if (this.floatTextures) {
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size[0], size[1], 0, gl.RGBA, gl.FLOAT, inputArray);
					} else {
						const buffer = new Uint8Array(valuesFlat.buffer);
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size[0] / bitRatio, size[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
					}

					if (!this.hardcodeConstants) {
						this.setUniform3iv(`constants_${name}Dim`, dim);
						this.setUniform2iv(`constants_${name}Size`, size);
					}
					this.setUniform1i(`constants_${name}BitRatio`, bitRatio);
					this.setUniform1i(`constants_${name}`, this.constantsLength);
					break;
				}
			case 'HTMLImage':
				{
					const inputImage = value;
					const dim = [inputImage.width, inputImage.height, 1];
					const size = [inputImage.width, inputImage.height];

					gl.activeTexture(gl.TEXTURE0 + this.constantsLength);
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
					this.setUniform3iv(`constants_${name}Dim`, dim);
					this.setUniform2iv(`constants_${name}Size`, size);
					this.setUniform1i(`constants_${name}`, this.constantsLength);
					break;
				}
			case 'ArrayTexture(4)':
			case 'NumberTexture':
				{
					const inputTexture = value;
					if (inputTexture.context !== this.context) {
						throw new Error(`argument ${ name} (${ type }) must be from same context`);
					}
					const dim = inputTexture.dimensions;
					const size = inputTexture.size;

					gl.activeTexture(gl.TEXTURE0 + this.constantsLength);
					gl.bindTexture(gl.TEXTURE_2D, inputTexture.texture);

					this.setUniform3iv(`constants_${name}Dim`, dim);
					this.setUniform2iv(`constants_${name}Size`, size);
					this.setUniform1i(`constants_${name}BitRatio`, 1); // aways float32
					this.setUniform1i(`constants_${name}`, this.constantsLength);
					break;
				}
			case 'Integer':
			case 'Float':
			default:
				throw new Error('Input type not supported: ' + value);
		}
		this.constantsLength++;
	}
	_getGetResultString() {
		if (!this.floatTextures) {
			return '  return decode(texel, x, bitRatio);';
		}
		return '  return texel[channel];';
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
				if (type === 'Array' || type === 'NumberTexture' || type === 'ArrayTexture(4)') {
					const dim = utils.getDimensions(value, true);
					const size = utils.dimToTexSize({
						floatTextures: this.floatTextures,
						floatOutput: this.floatOutput
					}, dim);

					result.push(
						`uniform highp sampler2D user_${ name }`,
						`highp ivec2 user_${ name }Size = ivec2(${ size[0] }, ${ size[1] })`,
						`highp ivec3 user_${ name }Dim = ivec3(${ dim[0] }, ${ dim[1]}, ${ dim[2] })`,
						`uniform highp int user_${ name }BitRatio`
					);
				} else if (type === 'Integer') {
					result.push(`highp float user_${ name } = ${ value }.0`);
				} else if (type === 'Float') {
					result.push(`highp float user_${ name } = ${ value }`);
				}
			} else {
				if (type === 'Array' || type === 'NumberTexture' || type === 'ArrayTexture(4)' || type === 'Input' || type === 'HTMLImage') {
					result.push(
						`uniform highp sampler2D user_${ name }`,
						`uniform highp ivec2 user_${ name }Size`,
						`uniform highp ivec3 user_${ name }Dim`
					);
					if (type !== 'HTMLImage') {
						result.push(`uniform highp int user_${ name }BitRatio`)
					}
				} else if (type === 'HTMLImageArray') {
					result.push(
						`uniform highp sampler2DArray user_${ name }`,
						`uniform highp ivec2 user_${ name }Size`,
						`uniform highp ivec3 user_${ name }Dim`
					);
				} else if (type === 'Integer' || type === 'Float' || type === 'Number') {
					result.push(`uniform float user_${ name }`);
				} else {
					throw new Error(`Param type ${type} not supported in WebGL2`);
				}
			}
		}
		return this._linesToString(result);
	}

	/**
	 * @desc Get Kernel program string (in *glsl*) for a kernel.
	 * @returns {String} result
	 */
	_getKernelString() {
		const result = [];
		const subKernels = this.subKernels;
		if (subKernels !== null) {
			result.push('float kernelResult = 0.0');
			result.push('layout(location = 0) out vec4 data0');
			for (let i = 0; i < subKernels.length; i++) {
				result.push(
					`float subKernelResult_${ subKernels[i].name } = 0.0`,
					`layout(location = ${ i + 1 }) out vec4 data${ i + 1 }`
				);
			}
		} else {
			result.push('out vec4 data0');
			result.push('float kernelResult = 0.0');
		}

		const functionBuilder = FunctionBuilder.fromKernel(this, WebGL2FunctionNode, {
			fixIntegerDivisionAccuracy: this.fixIntegerDivisionAccuracy
		});

		return this._linesToString(result) + functionBuilder.getPrototypeString('kernel');
	}

	/**
	 * @desc Get main result string with checks for floatOutput, graphical, subKernelsOutputs, etc.
	 * @returns {String} result
	 */
	_getMainResultString() {
		const subKernels = this.subKernels;
		const result = [];

		if (this.floatOutput) {
			result.push('  index *= 4');
		}

		if (this.graphical) {
			result.push(
				'  threadId = indexTo3D(index, uOutputDim)',
				'  kernel()',
				'  data0 = actualColor'
			);
		} else if (this.floatOutput) {
			const channels = ['r', 'g', 'b', 'a'];

			for (let i = 0; i < channels.length; ++i) {
				result.push('  threadId = indexTo3D(index, uOutputDim)');
				result.push('  kernel()');

				if (subKernels) {
					result.push(`  data0.${channels[i]} = kernelResult`);

					for (let j = 0; j < subKernels.length; ++j) {
						result.push(`  data${ j + 1 }.${channels[i]} = subKernelResult_${ subKernels[j].name }`);
					}
				} else {
					result.push(`  data0.${channels[i]} = kernelResult`);
				}

				if (i < channels.length - 1) {
					result.push('  index += 1');
				}
			}
		} else if (subKernels !== null) {
			result.push('  threadId = indexTo3D(index, uOutputDim)');
			result.push('  kernel()');
			result.push('  data0 = encode32(kernelResult)');
			for (let i = 0; i < subKernels.length; i++) {
				result.push(`  data${ i + 1 } = encode32(subKernelResult_${ subKernels[i].name })`);
			}
		} else {
			result.push(
				'  threadId = indexTo3D(index, uOutputDim)',
				'  kernel()',
				'  data0 = encode32(kernelResult)'
			);
		}

		return this._linesToString(result);
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