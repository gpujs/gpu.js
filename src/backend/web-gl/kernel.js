'use strict';

const KernelBase = require('../kernel-base');
const utils = require('../../core/utils');
const Texture = require('../../core/texture');
const fragShaderString = require('./shader-frag');
const vertShaderString = require('./shader-vert');
const kernelString = require('./kernel-string');
const canvases = [];
const maxTexSizes = {};

module.exports = class WebGLKernel extends KernelBase {
	static get fragShaderString() {
		return fragShaderString;
	}
	static get vertShaderString() {
		return vertShaderString;
	}
	/**
	 * @constructor WebGLKernel
	 *
	 * @desc Kernel Implementation for WebGL.
	 * <p>This builds the shaders and runs them on the GPU,
	 * the outputs the result back as float(enabled by default) and Texture.</p>
	 *
	 * @extends KernelBase
	 *
	 * @prop {Object} textureCache - webGl Texture cache
	 * @prop {Object} threadDim - The thread dimensions, x, y and z
	 * @prop {Object} programUniformLocationCache - Location of program variables in memory
	 * @prop {Object} framebuffer - Webgl frameBuffer
	 * @prop {Object} buffer - WebGL buffer
	 * @prop {Object} program - The webGl Program
	 * @prop {Object} functionBuilder - Function Builder instance bound to this Kernel
	 * @prop {Boolean} outputToTexture - Set output type to Texture, instead of float
	 * @prop {String} endianness - Endian information like Little-endian, Big-endian.
	 * @prop {Array} paramTypes - Types of parameters sent to the Kernel
	 * @prop {number} argumentsLength - Number of parameters sent to the Kernel
	 * @prop {String} compiledFragShaderString - Compiled fragment shader string
	 * @prop {String} compiledVertShaderString - Compiled Vertical shader string
	 */
	constructor(fnString, settings) {
		super(fnString, settings);
		this.textureCache = {};
		this.threadDim = {};
		this.programUniformLocationCache = {};
		this.framebuffer = null;

		this.buffer = null;
		this.program = null;
		this.outputToTexture = settings.outputToTexture;
		this.endianness = utils.systemEndianness();
		this.subKernelOutputTextures = null;
		this.subKernelOutputVariableNames = null;
		this.argumentsLength = 0;
		this.constantsLength = 0;
		this.compiledFragShaderString = null;
		this.compiledVertShaderString = null;
		this.fragShader = null;
		this.vertShader = null;
		this.drawBuffersMap = null;
		this.outputTexture = null;
		this.maxTexSize = null;
		this.uniform1fCache = {};
		this.uniform1iCache = {};
		this.uniform2fCache = {};
		this.uniform2fvCache = {};
		this.uniform2ivCache = {};
		this.uniform3fvCache = {};
		this.uniform3ivCache = {};
		if (!this._webGl) this._webGl = this.initWebGl();
	}

	initWebGl() {
		return utils.initWebGl(this.getCanvas());
	}

	/**
	 * @memberOf WebGLKernel#
	 * @function
	 * @name validateOptions
	 *
	 * @desc Validate options related to Kernel, such as
	 * floatOutputs and Textures, texSize, output,
	 * graphical output.
	 *
	 */
	validateOptions() {
		const isFloatReadPixel = utils.isFloatReadPixelsSupported();
		if (this.floatTextures === true && !utils.OES_texture_float) {
			throw new Error('Float textures are not supported on this browser');
		} else if (this.floatOutput === true && this.floatOutputForce !== true && !isFloatReadPixel) {
			throw new Error('Float texture outputs are not supported on this browser');
		} else if (this.floatTextures === undefined && utils.OES_texture_float) {
			this.floatTextures = true;
			this.floatOutput = isFloatReadPixel;
		}

		const hasIntegerDivisionBug = utils.hasIntegerDivisionAccuracyBug();
		if (this.fixIntegerDivisionAccuracy === null) {
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
		} else if (this.floatOutput === undefined && utils.OES_texture_float) {
			this.floatOutput = true;
		}
	}

	updateMaxTexSize() {
		const texSize = this.texSize;
		const canvas = this._canvas;
		if (this.maxTexSize === null) {
			let canvasIndex = canvases.indexOf(canvas);
			if (canvasIndex === -1) {
				canvasIndex = canvases.length;
				canvases.push(canvas);
				maxTexSizes[canvasIndex] = [texSize[0], texSize[1]];
			}
			this.maxTexSize = maxTexSizes[canvasIndex];
		}
		if (this.maxTexSize[0] < texSize[0]) {
			this.maxTexSize[0] = texSize[0];
		}
		if (this.maxTexSize[1] < texSize[1]) {
			this.maxTexSize[1] = texSize[1];
		}
	}

	/**
	 * @memberOf WebGLKernel#
	 * @function
	 * @name build
	 *
	 * @desc Builds the Kernel, by compiling Fragment and Vertical Shaders,
	 * and instantiates the program.
	 *
	 */

	build() {
		this.validateOptions();
		this.setupConstants();
		this.setupParams(arguments);
		this.updateMaxTexSize();
		const texSize = this.texSize;
		const gl = this._webGl;
		const canvas = this._canvas;
		gl.enable(gl.SCISSOR_TEST);
		gl.viewport(0, 0, this.maxTexSize[0], this.maxTexSize[1]);
		canvas.width = this.maxTexSize[0];
		canvas.height = this.maxTexSize[1];
		const threadDim = this.threadDim = utils.clone(this.output);
		while (threadDim.length < 3) {
			threadDim.push(1);
		}

		if (this.functionBuilder) this._addKernels();

		const compiledVertShaderString = this._getVertShaderString(arguments);
		const vertShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertShader, compiledVertShaderString);
		gl.compileShader(vertShader);
		if (this.vertShader) {

		}
		this.vertShader = vertShader;

		const compiledFragShaderString = this._getFragShaderString(arguments);
		const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragShader, compiledFragShaderString);
		gl.compileShader(fragShader);
		this.fragShader = fragShader;

		if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
			console.log(compiledVertShaderString);
			console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(vertShader));
			throw new Error('Error compiling vertex shader');
		}
		if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
			console.log(compiledFragShaderString);
			console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(fragShader));
			throw new Error('Error compiling fragment shader');
		}

		if (this.debug) {
			console.log('Options:');
			console.dir(this);
			console.log('GLSL Shader Output:');
			console.log(compiledFragShaderString);
		}

		const program = this.program = gl.createProgram();
		gl.attachShader(program, vertShader);
		gl.attachShader(program, fragShader);
		gl.linkProgram(program);
		this.framebuffer = gl.createFramebuffer();
		this.framebuffer.width = texSize[0];
		this.framebuffer.height = texSize[1];

		const vertices = new Float32Array([-1, -1,
			1, -1, -1, 1,
			1, 1
		]);
		const texCoords = new Float32Array([
			0, 0,
			1, 0,
			0, 1,
			1, 1
		]);

		const texCoordOffset = vertices.byteLength;

		let buffer = this.buffer;
		if (!buffer) {
			buffer = this.buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			gl.bufferData(gl.ARRAY_BUFFER, vertices.byteLength + texCoords.byteLength, gl.STATIC_DRAW);
		} else {
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		}

		gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
		gl.bufferSubData(gl.ARRAY_BUFFER, texCoordOffset, texCoords);

		const aPosLoc = gl.getAttribLocation(this.program, 'aPos');
		gl.enableVertexAttribArray(aPosLoc);
		gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, gl.FALSE, 0, 0);
		const aTexCoordLoc = gl.getAttribLocation(this.program, 'aTexCoord');
		gl.enableVertexAttribArray(aTexCoordLoc);
		gl.vertexAttribPointer(aTexCoordLoc, 2, gl.FLOAT, gl.FALSE, 0, texCoordOffset);
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);

		for (let p in this.constants) {
			const value = this.constants[p]
			const type = utils.getArgumentType(value);
			if (type === 'Decimal' || type === 'Integer') {
				continue;
			}
			gl.useProgram(this.program);
			this._addConstant(this.constants[p], type, p);
			this.constantsLength++;
		}

		if (!this.outputImmutable) {
			this._setupOutputTexture();
			if (
				this.subKernelOutputVariableNames !== null &&
				this.subKernelOutputVariableNames.length > 0
			) {
				this._setupSubOutputTextures(this.subKernelOutputVariableNames.length);
			}
		}
	}

	/**
	 * @memberOf WebGLKernel#
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
			this.setUniform3iv('uOutputDim', this.threadDim);
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
			this.drawBuffers.drawBuffersWEBGL(this.drawBuffersMap);
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
	 * @memberOf WebGLKernel#
	 * @function
	 * @name renderOutput
	 *
	 *
	 * @desc Helper function to return webGl function's output.
	 * Since the program runs on GPU, we need to get the
	 * output of the program back to CPU and then return them.
	 *
	 * *Note*: This should not be called directly.
	 *
	 * @param {Object} outputTexture - Output Texture returned by webGl program
	 *
	 * @returns {Object|Array} result
	 *
	 *
	 */
	renderOutput(outputTexture) {
		const texSize = this.texSize;
		const gl = this._webGl;
		const threadDim = this.threadDim;
		const output = this.output;
		if (this.outputToTexture) {
			return new Texture(outputTexture, texSize, this.threadDim, output, this._webGl);
		} else {
			let result;
			if (this.floatOutput) {
				const w = texSize[0];
				const h = Math.ceil(texSize[1] / 4);
				result = new Float32Array(w * h * 4);
				gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, result);
			} else {
				const bytes = new Uint8Array(texSize[0] * texSize[1] * 4);
				gl.readPixels(0, 0, texSize[0], texSize[1], gl.RGBA, gl.UNSIGNED_BYTE, bytes);
				result = new Float32Array(bytes.buffer);
			}

			result = result.subarray(0, threadDim[0] * threadDim[1] * threadDim[2]);

			if (output.length === 1) {
				return result;
			} else if (output.length === 2) {
				return utils.splitArray(result, output[0]);
			} else if (output.length === 3) {
				const cube = utils.splitArray(result, output[0] * output[1]);
				return cube.map(function(x) {
					return utils.splitArray(x, output[0]);
				});
			}
		}
	}

	/**
	 * @memberOf WebGLKernel#
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
	 * @memberOf WebGLKernel#
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
		gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.paramNames.length);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		if (this.floatOutput) {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
		} else {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		}
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
	}

	/**
	 * @memberOf WebGLKernel#
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
			gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.paramNames.length + i);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			if (this.floatOutput) {
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
			} else {
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			}
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i + 1, gl.TEXTURE_2D, texture, 0);
		}
	}

	/**
	 * @memberOf WebGLKernel#
	 * @function
	 * @name getArgumentTexture
	 *
	 * @desc This uses *getTextureCache** to get the Texture Cache of the argument supplied
	 *
	 * @param {String} name - Name of the argument
	 *
	 * 	Texture cache for the supplied argument
	 *
	 */
	getArgumentTexture(name) {
		return this.getTextureCache(`ARGUMENT_${ name }`);
	}

	/**
	 * @memberOf WebGLKernel#
	 * @name getTextureCache
	 * @function
	 *
	 * @desc Returns the Texture Cache of the supplied parameter (can be kernel, sub-kernel or argument)
	 *
	 * @param {String} name - Name of the subkernel, argument, or kernel.
	 *
	 * @returns {Object} Texture cache
	 *
	 */
	getTextureCache(name) {
		if (this.textureCache.hasOwnProperty(name)) {
			return this.textureCache[name];
		}
		return this.textureCache[name] = this._webGl.createTexture();
	}

	/**
	 * @memberOf WebGLKernel#
	 * @name detachTextureCache
	 * @function
	 * @desc removes a texture from the kernel's cache
	 * @param {String} name - Name of texture
	 */
	detachTextureCache(name) {
		delete this.textureCache[name];
	}

	setUniform1f(name, value) {
		if (this.uniform1fCache.hasOwnProperty(name)) {
			const cache = this.uniform1fCache[name];
			if (value === cache) {
				return;
			}
		}
		this.uniform1fCache[name] = value;
		const loc = this.getUniformLocation(name);
		this._webGl.uniform1f(loc, value);
	}

	setUniform1i(name, value) {
		if (this.uniform1iCache.hasOwnProperty(name)) {
			const cache = this.uniform1iCache[name];
			if (value === cache) {
				return;
			}
		}
		this.uniform1iCache[name] = value;
		const loc = this.getUniformLocation(name);
		this._webGl.uniform1i(loc, value);
	}

	setUniform2f(name, value1, value2) {
		if (this.uniform2fCache.hasOwnProperty(name)) {
			const cache = this.uniform2fCache[name];
			if (
				value1 === cache[0] &&
				value2 === cache[1]
			) {
				return;
			}
		}
		this.uniform2fCache[name] = [value1, value2];
		const loc = this.getUniformLocation(name);
		this._webGl.uniform2f(loc, value1, value2);
	}

	setUniform2fv(name, value) {
		if (this.uniform2fvCache.hasOwnProperty(name)) {
			const cache = this.uniform2fvCache[name];
			if (
				value[0] === cache[0] &&
				value[1] === cache[1]
			) {
				return;
			}
		}
		this.uniform2fvCache[name] = value;
		const loc = this.getUniformLocation(name);
		this._webGl.uniform2fv(loc, value);
	}

	setUniform2iv(name, value) {
		if (this.uniform2ivCache.hasOwnProperty(name)) {
			const cache = this.uniform2ivCache[name];
			if (
				value[0] === cache[0] &&
				value[1] === cache[1]
			) {
				return;
			}
		}
		this.uniform2ivCache[name] = value;
		const loc = this.getUniformLocation(name);
		this._webGl.uniform2iv(loc, value);
	}

	setUniform3fv(name, value) {
		if (this.uniform3fvCache.hasOwnProperty(name)) {
			const cache = this.uniform3fvCache[name];
			if (
				value[0] === cache[0] &&
				value[1] === cache[1] &&
				value[2] === cache[2]
			) {
				return;
			}
		}
		this.uniform3fvCache[name] = value;
		const loc = this.getUniformLocation(name);
		this._webGl.uniform3fv(loc, value);
	}

	setUniform3iv(name, value) {
		if (this.uniform3ivCache.hasOwnProperty(name)) {
			const cache = this.uniform3ivCache[name];
			if (
				value[0] === cache[0] &&
				value[1] === cache[1] &&
				value[2] === cache[2]
			) {
				return;
			}
		}
		this.uniform3ivCache[name] = value;
		const loc = this.getUniformLocation(name);
		this._webGl.uniform3iv(loc, value);
	}

	/**
	 * @memberOf WebGLKernel#
	 * @function
	 * @name getUniformLocation
	 *
	 * @desc Return WebGlUniformLocation for various variables
	 * related to webGl program, such as user-defiend variables,
	 * as well as, dimension sizes, etc.
	 *
	 */
	getUniformLocation(name) {
		if (this.programUniformLocationCache.hasOwnProperty(name)) {
			return this.programUniformLocationCache[name];
		}
		return this.programUniformLocationCache[name] = this._webGl.getUniformLocation(this.program, name);
	}

	/**
	 * @memberOf WebGLKernel#
	 * @function
	 * @name _getFragShaderArtifactMap
	 *
	 * @desc Generate Shader artifacts for the kernel program.
	 * The final object contains HEADER, KERNEL, MAIN_RESULT, and others.
	 *
	 * @param {Array} args - The actual parameters sent to the Kernel
	 *
	 * @returns {Object} An object containing the Shader Artifacts(CONSTANTS, HEADER, KERNEL, etc.)
	 *
	 */
	_getFragShaderArtifactMap(args) {
		return {
			HEADER: this._getHeaderString(),
			LOOP_MAX: this._getLoopMaxString(),
			CONSTANTS: this._getConstantsString(),
			DECODE32_ENDIANNESS: this._getDecode32EndiannessString(),
			ENCODE32_ENDIANNESS: this._getEncode32EndiannessString(),
			DIVIDE_WITH_INTEGER_CHECK: this._getDivideWithIntegerCheckString(),
			GET_WRAPAROUND: this._getGetWraparoundString(),
			GET_TEXTURE_CHANNEL: this._getGetTextureChannelString(),
			GET_TEXTURE_INDEX: this._getGetTextureIndexString(),
			GET_RESULT: this._getGetResultString(),
			MAIN_PARAMS: this._getMainParamsString(args),
			MAIN_CONSTANTS: this._getMainConstantsString(),
			KERNEL: this._getKernelString(),
			MAIN_RESULT: this._getMainResultString()
		};
	}

	/**
	 * @memberOf WebGLKernel#
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
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size[0], size[1], 0, gl.RGBA, gl.FLOAT, valuesFlat);
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
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size[0], size[1], 0, gl.RGBA, gl.FLOAT, inputArray);
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
			case 'Texture':
				{
					const inputTexture = value;
					const dim = inputTexture.dimensions;
					const size = inputTexture.size;

					gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.argumentsLength);
					gl.bindTexture(gl.TEXTURE_2D, inputTexture.texture);

					this.setUniform3iv(`user_${name}Dim`, dim);
					this.setUniform2iv(`user_${name}Size`, size);
					this.setUniform1i(`user_${name}BitRatio`, 1); // aways float32
					this.setUniform1i(`user_${name}`, this.argumentsLength);
					break;
				}
			default:
				throw new Error('Input type not supported (WebGL): ' + value);
		}
		this.argumentsLength++;
	}

	/**
	 * @memberOf WebGLKernel#
	 * @function
	 * @name _addConstant
	 *
	 * @desc Adds kernel parameters to the Argument Texture,
	 * binding it to the webGl instance, etc.
	 *
	 * @param {Array|Texture|Number} value - The actual argument supplied to the kernel
	 * @param {String} type - Type of the argument
	 * @param {String} name - Name of the argument
	 *
	 */
	_addConstant(value, type, name) {
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
			case 'Integer':
			case 'Float':
				{
					this.setUniform1f(`constants_${name}`, value);
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
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size[0], size[1], 0, gl.RGBA, gl.FLOAT, inputArray);
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
			case 'Texture':
				{
					const inputTexture = value;
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
			default:
				throw new Error('Input type not supported (WebGL): ' + value);
		}
	}

	/**
	 * @memberOf WebGLKernel#
	 * @function
	 * @name _formatArrayTransfer
	 *
	 * @desc Adds kernel parameters to the Argument Texture,
	 * binding it to the webGl instance, etc.
	 *
	 * @param {Array} value - The actual argument supplied to the kernel
	 * @param {String} length - the expected total length of the output array
	 *
	 * @returns {Object} bitRatio - bit storage ratio of source to target 'buffer', i.e. if 8bit array -> 32bit tex = 4
	 * 				     valuesFlat - flattened array to transfer
	 */
	_formatArrayTransfer(value, length) {
		let bitRatio = 1; // bit storage ratio of source to target 'buffer', i.e. if 8bit array -> 32bit tex = 4
		let valuesFlat = value;
		if (utils.isArray(value[0]) || this.floatTextures) {
			// not already flat
			valuesFlat = new Float32Array(length);
			utils.flattenTo(value, valuesFlat);
		} else {

			switch (value.constructor) {
				case Uint8Array:
				case Int8Array:
					bitRatio = 4;
					break;
				case Uint16Array:
				case Int16Array:
					bitRatio = 2;
				case Float32Array:
				case Int32Array:
					break;

				default:
					valuesFlat = new Float32Array(length);
					utils.flattenTo(value, valuesFlat);
			}
		}
		return {
			bitRatio,
			valuesFlat
		};
	}

	/**
	 * @memberOf WebGLKernel#
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
		return (
			this.subKernels !== null || this.subKernelProperties !== null ?
			//webgl2 '#version 300 es\n' :
			'#extension GL_EXT_draw_buffers : require\n' :
			''
		);
	}

	/**
	 * @memberOf WebGLKernel#
	 * @function
	 * @name _getLoopMaxString
	 *
	 * @desc Get the maximum loop size String.
	 *
	 * @returns {String} result
	 *
	 */
	_getLoopMaxString() {
		return (
			this.loopMaxIterations ?
			` ${ parseInt(this.loopMaxIterations) }.0;\n` :
			' 1000.0;\n'
		);
	}

	/**
	 * @memberOf WebGLKernel#
	 * @function
	 * @name _getConstantsString
	 *
	 * @desc Generate transpiled glsl Strings for constant parameters sent to a kernel
	 *
	 * They can be defined by *hardcodeConstants*
	 *
	 * @returns {String} result
	 *
	 */
	_getConstantsString() {
		const result = [];
		const threadDim = this.threadDim;
		const texSize = this.texSize;
		if (this.hardcodeConstants) {
			result.push(
				`ivec3 uOutputDim = ivec3(${ threadDim[0] },${ threadDim[1] }, ${ threadDim[2] })`,
				`ivec2 uTexSize = ivec2(${ texSize[0] }, ${ texSize[1] })`
			);
		} else {
			result.push(
				'uniform ivec3 uOutputDim',
				'uniform ivec2 uTexSize'
			);
		}

		return this._linesToString(result);
	}

	/**
	 * @memberOf WebGLKernel#
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
			return 'varying vec2 vTexCoord;\n';
		} else {
			return 'out vec2 vTexCoord;\n';
		}
	}

	/**
	 * @memberOf WebGLKernel#
	 * @function
	 * @name _getDecode32EndiannessString
	 *
	 * @desc Get Decode32 endianness string for little-endian and big-endian
	 *
	 * @returns {String} result
	 *
	 */
	_getDecode32EndiannessString() {
		return (
			this.endianness === 'LE' ?
			'' :
			'  rgba.rgba = rgba.abgr;\n'
		);
	}

	/**
	 * @memberOf WebGLKernel#
	 * @function
	 * @name _getEncode32EndiannessString
	 *
	 * @desc Get Encode32 endianness string for little-endian and big-endian
	 *
	 * @returns {String} result
	 *
	 */
	_getEncode32EndiannessString() {
		return (
			this.endianness === 'LE' ?
			'' :
			'  rgba.rgba = rgba.abgr;\n'
		);
	}

	/**
	 * @memberOf WebGLKernel#
	 * @function
	 * @name _getDivideWithIntegerCheckString
	 *
	 * @desc if fixIntegerDivisionAccuracy provide method to replace /
	 *
	 * @returns {String} result
	 *
	 */
	_getDivideWithIntegerCheckString() {
		return this.fixIntegerDivisionAccuracy ?
			`
			  float div_with_int_check(float x, float y) {
			  if (floor(x) == x && floor(y) == y && integerMod(x, y) == 0.0) {
			    return float(int(x)/int(y));
			  }
			  return x / y;
			}
			` :
			'';
	}

	/**
	 * @function
	 * @memberOf WebGLKernel#
	 * @name _getGetWraparoundString
	 *
	 * @returns {String} wraparound string
	 */
	_getGetWraparoundString() {
		return (
			this.wraparound ?
			'  xyz = mod(xyz, texDim);\n' :
			''
		);
	}

	/**
	 * @memberOf WebGLKernel#
	 * @function
	 * @name _getGetTextureChannelString
	 *
	 */
	_getGetTextureChannelString() {
		if (!this.floatTextures) return '';

		return this._linesToString([
			'  int channel = integerMod(index, 4)',
			'  index = index / 4'
		]);
	}

	/**
	 * @memberOf WebGLKernel#
	 * @function
	 * @name _getGetTextureIndexString
	 *
	 * @desc Get generic texture index string, if floatTextures flag is true.
	 *
	 * @example
	 * '  index = float(int(index)/4);\n'
	 *
	 */
	_getGetTextureIndexString() {
		return (
			this.floatTextures ?
			'  index = index / 4;\n' :
			''
		);
	}

	/**
	 * @memberOf WebGLKernel#
	 * @function
	 * @name _getGetResultString
	 *
	 */
	_getGetResultString() {
		if (!this.floatTextures) {
			return '  return decode(texel, x, bitRatio);';
		}
		return this._linesToString([
			'  if (channel == 0) return texel.r',
			'  if (channel == 1) return texel.g',
			'  if (channel == 2) return texel.b',
			'  if (channel == 3) return texel.a'
		]);
	}

	/**
	 * @memberOf WebGLKernel#
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
						`uniform sampler2D user_${ paramName }`,
						`ivec2 user_${ paramName }Size = vec2(${ paramSize[0] }, ${ paramSize[1] })`,
						`ivec3 user_${ paramName }Dim = vec3(${ paramDim[0] }, ${ paramDim[1]}, ${ paramDim[2] })`,
						`uniform int user_${ paramName }BitRatio`
					);
				} else if (paramType === 'Integer') {
					result.push(`float user_${ paramName } = ${ param }.0`);
				} else if (paramType === 'Float') {
					result.push(`float user_${ paramName } = ${ param }`);
				}
			} else {
				if (paramType === 'Array' || paramType === 'Texture' || paramType === 'Input' || paramType === 'HTMLImage') {
					result.push(
						`uniform sampler2D user_${ paramName }`,
						`uniform ivec2 user_${ paramName }Size`,
						`uniform ivec3 user_${ paramName }Dim`
					);
					if (paramType !== 'HTMLImage') {
						result.push(`uniform int user_${ paramName }BitRatio`)
					}
				} else if (paramType === 'Integer' || paramType === 'Float') {
					result.push(`uniform float user_${ paramName }`);
				} else {
					throw new Error(`Param type ${paramType} not supported in WebGL, only WebGL2`);
				}
			}
		}
		return this._linesToString(result);
	}



	/**
	 * @memberOf WebGLKernel#
	 * @function
	 * @name _getMainConstantsString
	 *
	 */
	_getMainConstantsString() {
		const result = [];
		if (this.constants) {
			for (let name in this.constants) {
				if (!this.constants.hasOwnProperty(name)) continue;
				let value = this.constants[name];
				let type = utils.getArgumentType(value);
				switch (type) {
					case 'Integer':
						result.push('const float constants_' + name + ' = ' + parseInt(value) + '.0');
						break;
					case 'Float':
						result.push('const float constants_' + name + ' = ' + parseFloat(value));
						break;
					case 'Array':
					case 'Input':
					case 'HTMLImage':
					case 'Texture':
						result.push(
							`uniform sampler2D constants_${ name }`,
							`uniform ivec2 constants_${ name }Size`,
							`uniform ivec3 constants_${ name }Dim`,
							`uniform int constants_${ name }BitRatio`
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
	 * @memberOf WebGLKernel#
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
			for (let i = 0; i < names.length; i++) {
				result.push(
					`float ${ names[i] } = 0.0`
				);
			}
		} else {
			result.push('float kernelResult = 0.0');
		}

		return this._linesToString(result) + this.functionBuilder.getPrototypeString('kernel');
	}

	/**
	 *
	 * @memberOf WebGLKernel#
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
				'  gl_FragColor = actualColor'
			);
		} else if (this.floatOutput) {
			const channels = ['r', 'g', 'b', 'a'];

			for (let i = 0; i < channels.length; ++i) {
				result.push('  threadId = indexTo3D(index, uOutputDim)');
				result.push('  kernel()');

				if (names) {
					result.push(`  gl_FragData[0].${channels[i]} = kernelResult`);

					for (let j = 0; j < names.length; ++j) {
						result.push(`  gl_FragData[${ j + 1 }].${channels[i]} = ${ names[j] }`);
					}
				} else {
					result.push(`  gl_FragColor.${channels[i]} = kernelResult`);
				}

				if (i < channels.length - 1) {
					result.push('  index += 1');
				}
			}
		} else if (names !== null) {
			result.push('  threadId = indexTo3D(index, uOutputDim)');
			result.push('  kernel()');
			result.push('  gl_FragData[0] = encode32(kernelResult)');
			for (let i = 0; i < names.length; i++) {
				result.push(`  gl_FragData[${ i + 1 }] = encode32(${ names[i] })`);
			}
		} else {
			result.push(
				'  threadId = indexTo3D(index, uOutputDim)',
				'  kernel()',
				'  gl_FragColor = encode32(kernelResult)'
			);
		}

		return this._linesToString(result);
	}

	/**
	 * @memberOf WebGLKernel#
	 * @function
	 * @name _linesToString
	 *
	 * @param {Array} lines - An Array of strings
	 *
	 * @returns {String} Single combined String, seperated by *\n*
	 *
	 */
	_linesToString(lines) {
		if (lines.length > 0) {
			return lines.join(';\n') + ';\n';
		} else {
			return '\n';
		}
	}

	/**
	 * @memberOf WebGLKernel#
	 * @function
	 * @name _replaceArtifacts
	 *
	 * @param {String} src - Shader string
	 * @param {Array} map - Variables/Constants associated with shader
	 *
	 */
	_replaceArtifacts(src, map) {
		return src.replace(/[ ]*__([A-Z]+[0-9]*([_]?[A-Z])*)__;\n/g, (match, artifact) => {
			if (map.hasOwnProperty(artifact)) {
				return map[artifact];
			}
			throw `unhandled artifact ${ artifact }`;
		});
	}

	/**
	 * @memberOf WebGLKernel#
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
			constantTypes: this.constantTypes,
			fixIntegerDivisionAccuracy: this.fixIntegerDivisionAccuracy
		});

		if (this.subKernels !== null) {
			const drawBuffers = this.drawBuffers = gl.getExtension('WEBGL_draw_buffers');
			if (!drawBuffers) throw new Error('could not instantiate draw buffers extension');
			this.subKernelOutputVariableNames = [];
			this.subKernels.forEach(subKernel => this._addSubKernel(subKernel));
		} else if (this.subKernelProperties !== null) {
			const drawBuffers = this.drawBuffers = gl.getExtension('WEBGL_draw_buffers');
			if (!drawBuffers) throw new Error('could not instantiate draw buffers extension');
			this.subKernelOutputVariableNames = [];
			Object.keys(this.subKernelProperties).forEach(property => this._addSubKernel(this.subKernelProperties[property]));
		}
	}

	_addSubKernel(subKernel) {
		this.functionBuilder.addSubKernel(subKernel, {
			prototypeOnly: false,
			constants: this.constants,
			output: this.output,
			debug: this.debug,
			loopMaxIterations: this.loopMaxIterations,
			fixIntegerDivisionAccuracy: this.fixIntegerDivisionAccuracy
		});
		this.subKernelOutputVariableNames.push(subKernel.name + 'Result');
	}

	/**
	 * @memberOf WebGLKernel#
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
	 * @memberOf WebGLKernel#
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

	/**
	 * @memberOf WebGLKernel#
	 * @function
	 * @name toString
	 *
	 * @desc Returns the *pre-compiled* Kernel as a JS Object String, that can be reused.
	 *
	 */
	toString() {
		return kernelString(this);
	}

	addFunction(fn) {
		this.functionBuilder.addFunction(null, fn);
	}

	destroy(removeCanvasReferences) {
		super.destroy();
		if (this.outputTexture) {
			this._webGl.deleteTexture(this.outputTexture);
		}
		if (this.buffer) {
			this._webGl.deleteBuffer(this.buffer);
		}
		if (this.framebuffer) {
			this._webGl.deleteFramebuffer(this.framebuffer);
		}

		if (this.vertShader) {
			this._webGl.deleteShader(this.vertShader);
		}

		if (this.fragShader) {
			this._webGl.deleteShader(this.fragShader);
		}

		if (this.program) {
			this._webGl.deleteProgram(this.program);
		}

		var keys = Object.keys(this.textureCache);

		for (var i = 0; i < keys.length; i++) {
			const name = keys[i];
			this._webGl.deleteTexture(this.textureCache[name]);
		}

		if (this.subKernelOutputTextures) {
			for (let i = 0; i < this.subKernelOutputTextures.length; i++) {
				this._webGl.deleteTexture(this.subKernelOutputTextures[i]);
			}
		}
		if (removeCanvasReferences) {
			let idx = canvases.indexOf(this._canvas);
			if (idx >= 0) {
				canvases[idx] = null;
				maxTexSizes[idx] = null;
			}
		}
		delete this._webGl;
	}
};