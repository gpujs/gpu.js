'use strict';

const WebGLKernel = require('../web-gl/kernel');
const utils = require('../../core/utils');
const Texture = require('../../core/texture');
const fragShaderString = require('./shader-frag');
const vertShaderString = require('./shader-vert');

module.exports = class WebGL2Kernel extends WebGLKernel {
	static get fragShaderString() {
		return fragShaderString;
	}
	static get vertShaderString() {
		return vertShaderString;
	}
	initWebGl() {
		return utils.initWebGl2(this.getCanvas());
	}
	/**
	 * @memberOf WebGL2Kernel#
	 * @function
	 * @name validateOptions
	 *
	 * @desc Validate options related to Kernel, such as
	 * floatOutputs and Textures, texSize, output,
	 * graphical output.
	 *
	 */
	validateOptions() {
		const isFloatReadPixel = utils.isFloatReadPixelsSupportedWebGL2();
		if (this.floatOutput === true && this.floatOutputForce !== true && !isFloatReadPixel) {
			throw new Error('Float texture outputs are not supported on this browser');
		} else if (this.floatTextures === undefined) {
			this.floatTextures = true;
			this.floatOutput = isFloatReadPixel;
		}

		const hasIntegerDivisionBug = utils.hasIntegerDivisionAccuracyBug();
		if (this.fixIntegerDivisionAccuracy == null) {
			this.fixIntegerDivisionAccuracy = hasIntegerDivisionBug;
		} else if (this.fixIntegerDivisionAccuracy && !hasIntegerDivisionBug) {
			this.fixIntegerDivisionAccuracy = false;
		}

		utils.checkOutput(this.output);

		if (!this.output || this.output.length === 0) {
			if (arguments.length !== 1) {
				throw new Error('Auto output only supported for kernels with only one input');
			}

			const argType = utils.getArgumentType(arguments[0]);
			if (argType === 'Array') {
				this.output = utils.getDimensions(argType);
			} else if (argType === 'Texture') {
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
			this._webGl.getExtension('EXT_color_buffer_float');
		}
	}

	/**
	 * @memberOf WebGL2Kernel#
	 * @function
	 * @name run
	 *
	 * @desc Run the kernel program, and send the output to renderOutput
	 *
	 * <p> This method calls a helper method *renderOutput* to return the result. </p>
	 *
	 * @returns {Object|Undefined} Result The final output of the program, as float, and as Textures for reuse.
	 *
	 *
	 */
	run() {
		if (this.program === null) {
			this.build.apply(this, arguments);
		}
		const paramNames = this.paramNames;
		const paramTypes = this.paramTypes;
		const texSize = this.texSize;
		const gl = this._webGl;

		gl.useProgram(this.program);
		gl.scissor(0, 0, texSize[0], texSize[1]);

		if (!this.hardcodeConstants) {
			this.setUniform3iv('uOutputDim', new Int32Array(this.threadDim));
			this.setUniform2iv('uTexSize', texSize);
		}

		this.setUniform2f('ratio', texSize[0] / this.maxTexSize[0], texSize[1] / this.maxTexSize[1]);

		this.argumentsLength = 0;
		for (let texIndex = 0; texIndex < paramNames.length; texIndex++) {
			this._addArgument(arguments[texIndex], paramTypes[texIndex], paramNames[texIndex]);
		}

		if (this.graphical) {
			gl.bindRenderbuffer(gl.RENDERBUFFER, null);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			return;
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
		if (this.outputImmutable) {
			this._setupOutputTexture();
		}
		const outputTexture = this.outputTexture;

		if (this.subKernelOutputVariableNames !== null) {
			if (this.outputImmutable) {
				this.subKernelOutputTextures = [];
				this._setupSubOutputTextures(this.subKernelOutputVariableNames.length);
			}
			gl.drawBuffers(this.drawBuffersMap);
		}

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		if (this.subKernelOutputTextures !== null) {
			if (this.subKernels !== null) {
				const output = [];
				output.result = this.renderOutput(outputTexture);
				for (let i = 0; i < this.subKernels.length; i++) {
					output.push(new Texture(this.subKernelOutputTextures[i], texSize, this.threadDim, this.output, this._webGl));
				}
				return output;
			} else if (this.subKernelProperties !== null) {
				const output = {
					result: this.renderOutput(outputTexture)
				};
				let i = 0;
				for (let p in this.subKernelProperties) {
					if (!this.subKernelProperties.hasOwnProperty(p)) continue;
					output[p] = new Texture(this.subKernelOutputTextures[i], texSize, this.threadDim, this.output, this._webGl);
					i++;
				}
				return output;
			}
		}

		return this.renderOutput(outputTexture);
	}



	/**
	 * @memberOf WebGL2Kernel#
	 * @function
	 * @name getOutputTexture
	 *
	 * @desc This return defined outputTexture, which is setup in .build(), or if immutable, is defined in .run()
	 *
	 * @returns {Object} Output Texture Cache
	 *
	 */
	getOutputTexture() {
		return this.outputTexture;
	}

	/**
	 * @memberOf WebGL2Kernel#
	 * @function
	 * @name _setupOutputTexture
	 * @private
	 *
	 * @desc Setup and replace output texture
	 */
	_setupOutputTexture() {
		const gl = this._webGl;
		const texSize = this.texSize;
		const texture = this.outputTexture = this._webGl.createTexture();
		gl.activeTexture(gl.TEXTURE0 + this.paramNames.length);
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

	/**
	 * @memberOf WebGL2Kernel#
	 * @param length
	 * @private
	 *
	 * @desc Setup and replace sub-output textures
	 */
	_setupSubOutputTextures(length) {
		const gl = this._webGl;
		const texSize = this.texSize;
		const drawBuffersMap = this.drawBuffersMap = [gl.COLOR_ATTACHMENT0];
		const textures = this.subKernelOutputTextures = [];
		for (let i = 0; i < length; i++) {
			const texture = this._webGl.createTexture();
			textures.push(texture);
			drawBuffersMap.push(gl.COLOR_ATTACHMENT0 + i + 1);
			gl.activeTexture(gl.TEXTURE0 + this.paramNames.length + i);
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
	 * @memberOf WebGL2Kernel#
	 * @function
	 * @name _addArgument
	 *
	 * @desc Adds kernel parameters to the Argument Texture,
	 * binding it to the webGl instance, etc.
	 *
	 * @param {Array|Texture|Number} value - The actual argument supplied to the kernel
	 * @param {String} type - Type of the argument
	 * @param {String} name - Name of the argument
	 *
	 */
	_addArgument(value, type, name) {
		const gl = this._webGl;
		const argumentTexture = this.getArgumentTexture(name);
		if (value instanceof Texture) {
			type = 'Texture';
		}
		switch (type) {
			case 'Array':
				{
					const dim = utils.getDimensions(value, true);
					const size = utils.dimToTexSize({
						floatTextures: this.floatTextures,
						floatOutput: this.floatOutput
					}, dim);
					gl.activeTexture(gl.TEXTURE0 + this.argumentsLength);
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
					gl.activeTexture(gl.TEXTURE0 + this.argumentsLength);
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

					gl.activeTexture(gl.TEXTURE0 + this.argumentsLength);
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

					gl.activeTexture(gl.TEXTURE0 + this.argumentsLength);
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
			case 'Texture':
				{
					const inputTexture = value;
					const dim = inputTexture.dimensions;
					const size = inputTexture.size;

					gl.activeTexture(gl.TEXTURE0 + this.argumentsLength);
					gl.bindTexture(gl.TEXTURE_2D, inputTexture.texture);

					this.setUniform3iv(`user_${name}Dim`, dim);
					this.setUniform2iv(`user_${name}Size`, size);
					this.setUniform1i(`user_${name}BitRatio`, 1); // always float32
					this.setUniform1i(`user_${name}`, this.argumentsLength);
					break;
				}
			default:
				throw new Error('Input type not supported (WebGL): ' + value);
		}
		this.argumentsLength++;
	}

	/**
	 * @memberOf WebGL2Kernel#
	 * @function
	 * @name _getGetResultString
	 *
	 */
	_getGetResultString() {
		if (!this.floatTextures) {
			return '  return decode(texel, x, bitRatio);';
		}
		return '  return texel[channel];';
	}

	/**
	 * @memberOf WebGL2Kernel#
	 * @function
	 * @name _getHeaderString
	 *
	 * @desc Get the header string for the program.
	 * This returns an empty string if no sub-kernels are defined.
	 *
	 * @returns {String} result
	 *
	 */
	_getHeaderString() {
		return '';
	}

	/**
	 * @memberOf WebGL2Kernel#
	 * @function
	 * @name _getTextureCoordinate
	 *
	 * @desc Get texture coordinate string for the program
	 *
	 * @returns {String} result
	 *
	 */
	_getTextureCoordinate() {
		const names = this.subKernelOutputVariableNames;
		if (names === null || names.length < 1) {
			return 'in highp vec2 vTexCoord;\n';
		} else {
			return 'out highp vec2 vTexCoord;\n';
		}
	}

	/**
	 * @memberOf WebGL2Kernel#
	 * @function
	 * @name _getMainParamsString
	 *
	 * @desc Generate transpiled glsl Strings for user-defined parameters sent to a kernel
	 *
	 * @param {Array} args - The actual parameters sent to the Kernel
	 *
	 * @returns {String} result
	 *
	 */
	_getMainParamsString(args) {
		const result = [];
		const paramTypes = this.paramTypes;
		const paramNames = this.paramNames;
		for (let i = 0; i < paramNames.length; i++) {
			const param = args[i];
			const paramName = paramNames[i];
			const paramType = paramTypes[i];
			if (this.hardcodeConstants) {
				if (paramType === 'Array' || paramType === 'Texture') {
					const paramDim = utils.getDimensions(param, true);
					const paramSize = utils.dimToTexSize({
						floatTextures: this.floatTextures,
						floatOutput: this.floatOutput
					}, paramDim);

					result.push(
						`uniform highp sampler2D user_${ paramName }`,
						`highp ivec2 user_${ paramName }Size = ivec2(${ paramSize[0] }, ${ paramSize[1] })`,
						`highp ivec3 user_${ paramName }Dim = ivec3(${ paramDim[0] }, ${ paramDim[1]}, ${ paramDim[2] })`,
						`uniform highp int user_${ paramName }BitRatio`
					);

					if (paramType === 'Array') {
						result.push(`uniform highp int user_${ paramName }BitRatio`)
					}
				} else if (paramType === 'Integer') {
					result.push(`highp float user_${ paramName } = ${ param }.0`);
				} else if (paramType === 'Float') {
					result.push(`highp float user_${ paramName } = ${ param }`);
				}
			} else {
				if (paramType === 'Array' || paramType === 'Texture' || paramType === 'Input' || paramType === 'HTMLImage') {
					result.push(
						`uniform highp sampler2D user_${ paramName }`,
						`uniform highp ivec2 user_${ paramName }Size`,
						`uniform highp ivec3 user_${ paramName }Dim`
					);
					if (paramType !== 'HTMLImage') {
						result.push(`uniform highp int user_${ paramName }BitRatio`)
					}
				} else if (paramType === 'HTMLImageArray') {
					result.push(
						`uniform highp sampler2DArray user_${ paramName }`,
						`uniform highp ivec2 user_${ paramName }Size`,
						`uniform highp ivec3 user_${ paramName }Dim`
					);
				} else if (paramType === 'Integer' || paramType === 'Float') {
					result.push(`uniform float user_${ paramName }`);
				}
			}
		}
		return this._linesToString(result);
	}

	/**
	 * @memberOf WebGL2Kernel#
	 * @function
	 * @name _getKernelString
	 *
	 * @desc Get Kernel program string (in *glsl*) for a kernel.
	 *
	 * @returns {String} result
	 *
	 */
	_getKernelString() {
		const result = [];
		const names = this.subKernelOutputVariableNames;
		if (names !== null) {
			result.push('float kernelResult = 0.0');
			result.push('layout(location = 0) out vec4 data0');
			for (let i = 0; i < names.length; i++) {
				result.push(
					`float ${ names[i] } = 0.0`,
					`layout(location = ${ i + 1 }) out vec4 data${ i + 1 }`
				);
			}
		} else {
			result.push('out vec4 data0');
			result.push('float kernelResult = 0.0');
		}

		return this._linesToString(result) + this.functionBuilder.getPrototypeString('kernel');
	}

	/**
	 *
	 * @memberOf WebGL2Kernel#
	 * @function
	 * @name _getMainResultString
	 *
	 * @desc Get main result string with checks for floatOutput, graphical, subKernelsOutputs, etc.
	 *
	 * @returns {String} result
	 *
	 */
	_getMainResultString() {
		const names = this.subKernelOutputVariableNames;
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

				if (names) {
					result.push(`  data0.${channels[i]} = kernelResult`);

					for (let j = 0; j < names.length; ++j) {
						result.push(`  data${ j + 1 }.${channels[i]} = ${ names[j] }`);
					}
				} else {
					result.push(`  data0.${channels[i]} = kernelResult`);
				}

				if (i < channels.length - 1) {
					result.push('  index += 1');
				}
			}
		} else if (names !== null) {
			result.push('  threadId = indexTo3D(index, uOutputDim)');
			result.push('  kernel()');
			result.push('  data0 = encode32(kernelResult)');
			for (let i = 0; i < names.length; i++) {
				result.push(`  data${ i + 1 } = encode32(${ names[i] })`);
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
	 * @memberOf WebGL2Kernel#
	 * @function
	 * @name _addKernels
	 *
	 * @desc Adds all the sub-kernels supplied with this Kernel instance.
	 *
	 */
	_addKernels() {
		const builder = this.functionBuilder;
		const gl = this._webGl;

		builder.addFunctions(this.functions, {
			constants: this.constants,
			output: this.output
		});
		builder.addNativeFunctions(this.nativeFunctions);

		builder.addKernel(this.fnString, {
			prototypeOnly: false,
			constants: this.constants,
			output: this.output,
			debug: this.debug,
			loopMaxIterations: this.loopMaxIterations,
			paramNames: this.paramNames,
			paramTypes: this.paramTypes,
			fixIntegerDivisionAccuracy: this.fixIntegerDivisionAccuracy
		});

		if (this.subKernels !== null) {
			this.subKernelOutputTextures = [];
			this.subKernelOutputVariableNames = [];
			this.subKernels.forEach(subKernel => this._addSubKernel(subKernel));
		} else if (this.subKernelProperties !== null) {
			this.subKernelOutputTextures = [];
			this.subKernelOutputVariableNames = [];
			Object.keys(this.subKernelProperties).forEach(property => this._addSubKernel(this.subKernelProperties[property]));
		}
	}

	/**
	 * @memberOf WebGL2Kernel#
	 * @function
	 * @name _getFragShaderString
	 *
	 * @desc Get the fragment shader String.
	 * If the String hasn't been compiled yet,
	 * then this method compiles it as well
	 *
	 * @param {Array} args - The actual parameters sent to the Kernel
	 *
	 * @returns {string} Fragment Shader string
	 *
	 */
	_getFragShaderString(args) {
		if (this.compiledFragShaderString !== null) {
			return this.compiledFragShaderString;
		}
		return this.compiledFragShaderString = this._replaceArtifacts(this.constructor.fragShaderString, this._getFragShaderArtifactMap(args));
	}

	/**
	 * @memberOf WebGL2Kernel#
	 * @function
	 * @name _getVertShaderString
	 *
	 * @desc Get the vertical shader String
	 *
	 * @param {Array} args - The actual parameters sent to the Kernel
	 *
	 * @returns {string} Vertical Shader string
	 *
	 */
	_getVertShaderString(args) {
		if (this.compiledVertShaderString !== null) {
			return this.compiledVertShaderString;
		}
		return this.compiledVertShaderString = this.constructor.vertShaderString;
	}
};