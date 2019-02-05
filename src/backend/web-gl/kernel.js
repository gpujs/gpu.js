const {
	GLKernel
} = require('../gl-kernel');
const {
	FunctionBuilder
} = require('../function-builder');
const {
	WebGLFunctionNode
} = require('./function-node');
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
const {
	webGLKernelString
} = require('./kernel-string');

let isSupported = null;
let testCanvas = null;
let testContext = null;
let testExtensions = null;
let features = null;

const plugins = [require('../../plugins/random-gold-noise')];
const canvases = [];
const maxTexSizes = {};

/**
 * @desc Kernel Implementation for WebGL.
 * <p>This builds the shaders and runs them on the GPU,
 * the outputs the result back as float(enabled by default) and Texture.</p>
 *
 * @prop {Object} textureCache - webGl Texture cache
 * @prop {Object} threadDim - The thread dimensions, x, y and z
 * @prop {Object} programUniformLocationCache - Location of program variables in memory
 * @prop {Object} framebuffer - Webgl frameBuffer
 * @prop {Object} buffer - WebGL buffer
 * @prop {Object} program - The webGl Program
 * @prop {Object} functionBuilder - Function Builder instance bound to this Kernel
 * @prop {Boolean} pipeline - Set output type to FAST mode (GPU to GPU via Textures), instead of float
 * @prop {String} endianness - Endian information like Little-endian, Big-endian.
 * @prop {Array} argumentTypes - Types of parameters sent to the Kernel
 * @prop {number} argumentsLength - Number of parameters sent to the Kernel
 * @prop {String} compiledFragmentShader - Compiled fragment shader string
 * @prop {String} compiledVertexShader - Compiled Vertical shader string
 */
class WebGLKernel extends GLKernel {
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
			testContext = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
			testExtensions = {
				OES_texture_float: testContext.getExtension('OES_texture_float'),
				OES_texture_float_linear: testContext.getExtension('OES_texture_float_linear'),
				OES_element_index_uint: testContext.getExtension('OES_element_index_uint'),
				WEBGL_draw_buffers: testContext.getExtension('WEBGL_draw_buffers'),
			};
			features = this.getFeatures();
		}
	}

	static isContextMatch(context) {
		if (typeof WebGLRenderingContext !== 'undefined') {
			return context instanceof WebGLRenderingContext;
		}
		return false;
	}

	static getFeatures() {
		const isDrawBuffers = this.getIsDrawBuffers();
		return Object.freeze({
			isFloatRead: this.getIsFloatRead(),
			isIntegerDivisionAccurate: this.getIsIntegerDivisionAccurate(),
			isTextureFloat: this.getIsTextureFloat(),
			isDrawBuffers,
			kernelMap: isDrawBuffers
		});
	}

	static getIsTextureFloat() {
		return Boolean(testExtensions.OES_texture_float);
	}

	static getIsDrawBuffers() {
		return Boolean(testExtensions.WEBGL_draw_buffers);
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

	constructor(source, settings) {
		super(source, settings);
		this.textureCache = {};
		this.threadDim = {};
		this.programUniformLocationCache = {};
		this.framebuffer = null;

		this.buffer = null;
		this.program = null;
		this.pipeline = settings.pipeline;
		this.endianness = utils.systemEndianness();
		this.extensions = {};
		this.subKernelOutputTextures = null;
		this.argumentsLength = 0;
		this.constantsLength = 0;
		this.compiledFragmentShader = null;
		this.compiledVertexShader = null;
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

		this.mergeSettings(source.settings || settings);
	}

	initCanvas() {
		if (typeof document !== 'undefined') {
			const canvas = document.createElement('canvas');
			// Default width and height, to fix webgl issue in safari
			canvas.width = 2;
			canvas.height = 2;
			return canvas;
		} else if (typeof OffscreenCanvas !== 'undefined') {
			return new OffscreenCanvas(0, 0);
		}
	}

	initContext() {
		const settings = {
			alpha: false,
			depth: false,
			antialias: false
		};
		const context = this.canvas.getContext('webgl', settings) || this.canvas.getContext('experimental-webgl', settings);
		return context;
	}

	initPlugins(settings) {
		// default plugins
		const pluginsToUse = [];

		if (typeof this.source === 'string') {
			for (let i = 0; i < plugins.length; i++) {
				const plugin = plugins[i];
				if (this.source.match(plugin.functionMatch)) {
					pluginsToUse.push(plugin);
				}
			}
		} else if (typeof this.source === 'object') {
			// this.source is from object, json
			if (settings.pluginNames) {
				for (let i = 0; i < plugins.length; i++) {
					const plugin = plugins[i];
					const usePlugin = settings.pluginNames.some(pluginName => pluginName === plugin.name);
					if (usePlugin) {
						pluginsToUse.push(plugin);
					}
				}
			}
		}
		return pluginsToUse;
	}

	initExtensions() {
		this.extensions = {
			OES_texture_float: this.context.getExtension('OES_texture_float'),
			OES_texture_float_linear: this.context.getExtension('OES_texture_float_linear'),
			OES_element_index_uint: this.context.getExtension('OES_element_index_uint'),
			WEBGL_draw_buffers: this.context.getExtension('WEBGL_draw_buffers'),
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
		if (this.floatTextures === true && !features.isTextureFloat) {
			throw new Error('Float textures are not supported');
		} else if (this.floatOutput === true && this.floatOutputForce !== true && !features.isFloatRead) {
			throw new Error('Float texture outputs are not supported');
		} else if (this.floatTextures === undefined && features.isTextureFloat) {
			this.floatTextures = true;
			this.floatOutput = features.isFloatRead;
		}

		if (this.subKernels && this.subKernels.length > 0 && !this.extensions.WEBGL_draw_buffers) {
			throw new Error('could not instantiate draw buffers extension');
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
		} else if (this.floatOutput === undefined && features.isTextureFloat) {
			this.floatOutput = true;
		}
	}

	updateMaxTexSize() {
		const texSize = this.texSize;
		const canvas = this.canvas;
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

	build() {
		this.initExtensions();
		this.validateSettings();
		this.setupConstants();
		this.setupArguments(arguments);
		this.updateMaxTexSize();
		const texSize = this.texSize;
		const gl = this.context;
		const canvas = this.canvas;
		gl.enable(gl.SCISSOR_TEST);
		gl.viewport(0, 0, this.maxTexSize[0], this.maxTexSize[1]);
		canvas.width = this.maxTexSize[0];
		canvas.height = this.maxTexSize[1];
		const threadDim = this.threadDim = utils.clone(this.output);
		while (threadDim.length < 3) {
			threadDim.push(1);
		}

		const compiledVertexShader = this.getVertexShader(arguments);
		const vertShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertShader, compiledVertexShader);
		gl.compileShader(vertShader);
		this.vertShader = vertShader;

		const compiledFragmentShader = this.getFragmentShader(arguments);
		const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragShader, compiledFragmentShader);
		gl.compileShader(fragShader);
		this.fragShader = fragShader;

		if (this.debug) {
			console.log('GLSL Shader Output:');
			console.log(compiledFragmentShader);
		}

		if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
			throw new Error('Error compiling vertex shader: ' + gl.getShaderInfoLog(vertShader));
		}
		if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
			throw new Error('Error compiling fragment shader: ' + gl.getShaderInfoLog(fragShader));
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
		gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);
		const aTexCoordLoc = gl.getAttribLocation(this.program, 'aTexCoord');
		gl.enableVertexAttribArray(aTexCoordLoc);
		gl.vertexAttribPointer(aTexCoordLoc, 2, gl.FLOAT, false, 0, texCoordOffset);
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);

		for (let p in this.constants) {
			const value = this.constants[p];
			const type = utils.getVariableType(value);
			if (type === 'Float' || type === 'Integer') {
				continue;
			}
			gl.useProgram(this.program);
			this._addConstant(this.constants[p], type, p);
		}

		if (!this.immutable) {
			this._setupOutputTexture();
			if (
				this.subKernels !== null &&
				this.subKernels.length > 0
			) {
				this._setupSubOutputTextures(this.subKernels.length);
			}
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
			this.setUniform3iv('uOutputDim', this.threadDim);
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
			this.extensions.WEBGL_draw_buffers.drawBuffersWEBGL(this.drawBuffersMap);
		}

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		if (this.subKernelOutputTextures !== null) {
			if (this.subKernels !== null) {
				const output = {
					result: this.renderOutput(outputTexture),
				};
				for (let i = 0; i < this.subKernels.length; i++) {
					output[this.subKernels[i].property] = new Texture(this.subKernelOutputTextures[i], texSize, this.threadDim, this.output, this.context);
				}
				return output;
			}
		}

		return this.renderOutput(outputTexture);
	}

	/**
	 * @desc Helper function to return webGl function's output.
	 * Since the program runs on GPU, we need to get the
	 * output of the program back to CPU and then return them.
	 * *Note*: This should not be called directly.
	 *
	 * @param {Texture} outputTexture - Target to write to
	 * @returns {Object|Array} result
	 */
	renderOutput(outputTexture) {
		const texSize = this.texSize;
		const gl = this.context;
		const threadDim = this.threadDim;
		const output = this.output;
		if (this.pipeline) {
			return new Texture(outputTexture, texSize, this.threadDim, output, this.context);
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
	 * @desc This return defined outputTexture, which is setup in .build(), or if immutable, is defined in .run()
	 * @returns {Object} Output Texture Cache
	 */
	getOutputTexture() {
		return this.outputTexture;
	}

	/**
	 * @desc Setup and replace output texture
	 */
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
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
		} else {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		}
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
	}

	/**
	 * @desc Setup and replace sub-output textures
	 */
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
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
			} else {
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			}
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i + 1, gl.TEXTURE_2D, texture, 0);
		}
	}

	/**
	 * @desc This uses *getTextureCache** to get the Texture Cache of the argument supplied
	 * @param {String} name - Name of the argument
	 */
	getArgumentTexture(name) {
		return this.getTextureCache(`ARGUMENT_${name}`);
	}

	/**
	 * @desc Returns the Texture Cache of the supplied parameter (can be kernel, sub-kernel or argument)
	 * @param {String} name - Name of the subkernel, argument, or kernel.
	 * @returns {Object} Texture cache
	 */
	getTextureCache(name) {
		if (this.textureCache.hasOwnProperty(name)) {
			return this.textureCache[name];
		}
		return this.textureCache[name] = this.context.createTexture();
	}

	/**
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
		this.context.uniform1f(loc, value);
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
		this.context.uniform1i(loc, value);
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
		this.context.uniform2f(loc, value1, value2);
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
		this.context.uniform2fv(loc, value);
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
		this.context.uniform2iv(loc, value);
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
		this.context.uniform3fv(loc, value);
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
		this.context.uniform3iv(loc, value);
	}

	/**
	 * @desc Return WebGlUniformLocation for various variables
	 * related to webGl program, such as user-defined variables,
	 * as well as, dimension sizes, etc.
	 */
	getUniformLocation(name) {
		if (this.programUniformLocationCache.hasOwnProperty(name)) {
			return this.programUniformLocationCache[name];
		}
		return this.programUniformLocationCache[name] = this.context.getUniformLocation(this.program, name);
	}

	/**
	 * @desc Generate Shader artifacts for the kernel program.
	 * The final object contains HEADER, KERNEL, MAIN_RESULT, and others.
	 *
	 * @param {Array} args - The actual parameters sent to the Kernel
	 * @returns {Object} An object containing the Shader Artifacts(CONSTANTS, HEADER, KERNEL, etc.)
	 */
	_getFragShaderArtifactMap(args) {
		return {
			HEADER: this._getHeaderString(),
			LOOP_MAX: this._getLoopMaxString(),
			PLUGINS: this._getPluginsString(),
			CONSTANTS: this._getConstantsString(),
			DECODE32_ENDIANNESS: this._getDecode32EndiannessString(),
			ENCODE32_ENDIANNESS: this._getEncode32EndiannessString(),
			DIVIDE_WITH_INTEGER_CHECK: this._getDivideWithIntegerCheckString(),
			GET_WRAPAROUND: this._getGetWraparoundString(),
			GET_TEXTURE_CHANNEL: this._getGetTextureChannelString(),
			GET_TEXTURE_INDEX: this._getGetTextureIndexString(),
			GET_RESULT: this._getGetResultString(),
			MAIN_CONSTANTS: this._getMainConstantsString(),
			MAIN_ARGUMENTS: this._getMainArgumentsString(args),
			KERNEL: this._getKernelString(),
			MAIN_RESULT: this._getMainResultString()
		};
	}

	/**
	 * @desc Adds kernel parameters to the Argument Texture,
	 * binding it to the webGl instance, etc.
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
			case 'Array(2)':
			case 'Array(3)':
			case 'Array(4)':
			case 'Array2D':
			case 'Array3D':
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
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size[0], size[1], 0, gl.RGBA, gl.FLOAT, input);
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
					this.setUniform1i(`user_${name}BitRatio`, 1); // aways float32
					this.setUniform1i(`user_${name}`, this.argumentsLength);
					break;
				}
			default:
				throw new Error('Input type not supported: ' + value);
		}
		this.argumentsLength++;
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

	/**
	 * @desc Adds kernel parameters to the Argument Texture,
	 * binding it to the context, etc.
	 *
	 * @param {Array} value - The actual argument supplied to the kernel
	 * @param {String} length - the expected total length of the output array
	 * @returns {Object} bitRatio - bit storage ratio of source to target 'buffer', i.e. if 8bit array -> 32bit tex = 4
	 *             valuesFlat - flattened array to transfer
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
	 * @desc Get the header string for the program.
	 * This returns an empty string if no sub-kernels are defined.
	 *
	 * @returns {String} result
	 */
	_getHeaderString() {
		return (
			this.subKernels !== null ?
			'#extension GL_EXT_draw_buffers : require\n' :
			''
		);
	}

	/**
	 * @desc Get the maximum loop size String.
	 * @returns {String} result
	 */
	_getLoopMaxString() {
		return (
			this.loopMaxIterations ?
			` ${parseInt(this.loopMaxIterations)};\n` :
			' 1000;\n'
		);
	}

	_getPluginsString() {
		if (!this.plugins) return '\n';
		return this.plugins.map(plugin => plugin.source && this.source.match(plugin.functionMatch) ? plugin.source : '').join('\n');
	}

	/**
	 * @desc Generate transpiled glsl Strings for constant parameters sent to a kernel
	 * They can be defined by *hardcodeConstants*
	 *
	 * @returns {String} result
	 */
	_getConstantsString() {
		const result = [];
		const threadDim = this.threadDim;
		const texSize = this.texSize;
		if (this.hardcodeConstants) {
			result.push(
				`ivec3 uOutputDim = ivec3(${threadDim[0]}, ${threadDim[1]}, ${threadDim[2]})`,
				`ivec2 uTexSize = ivec2(${texSize[0]}, ${texSize[1]})`
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
	 * @desc Get texture coordinate string for the program
	 * @returns {String} result
	 */
	_getTextureCoordinate() {
		const subKernels = this.subKernels;
		if (subKernels === null || subKernels.length < 1) {
			return 'varying vec2 vTexCoord;\n';
		} else {
			return 'out vec2 vTexCoord;\n';
		}
	}

	/**
	 * @desc Get Decode32 endianness string for little-endian and big-endian
	 * @returns {String} result
	 */
	_getDecode32EndiannessString() {
		return (
			this.endianness === 'LE' ?
			'' :
			'  rgba.rgba = rgba.abgr;\n'
		);
	}

	/**
	 * @desc Get Encode32 endianness string for little-endian and big-endian
	 * @returns {String} result
	 */
	_getEncode32EndiannessString() {
		return (
			this.endianness === 'LE' ?
			'' :
			'  rgba.rgba = rgba.abgr;\n'
		);
	}

	/**
	 * @desc if fixIntegerDivisionAccuracy provide method to replace /
	 * @returns {String} result
	 */
	_getDivideWithIntegerCheckString() {
		return this.fixIntegerDivisionAccuracy ?
			`float div_with_int_check(float x, float y) {
  if (floor(x) == x && floor(y) == y && integerMod(x, y) == 0.0) {
    return float(int(x)/int(y));
  }
  return x / y;
}` :
			'';
	}

	/**
	 * @returns {String} wraparound string
	 */
	_getGetWraparoundString() {
		return (
			this.wraparound ?
			'  xyz = mod(xyz, texDim);\n' :
			''
		);
	}

	_getGetTextureChannelString() {
		if (!this.floatTextures) return '';

		return this._linesToString([
			'  int channel = integerMod(index, 4)',
			'  index = index / 4'
		]);
	}

	/**
	 * @desc Get generic texture index string, if floatTextures flag is true.
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
						`uniform sampler2D user_${name}`,
						`ivec2 user_${name}Size = ivec2(${size[0]}, ${size[1]})`,
						`ivec3 user_${name}Dim = ivec3(${dim[0]}, ${dim[1]}, ${dim[2]})`,
						`uniform int user_${name}BitRatio`
					);
				} else if (type === 'Integer') {
					result.push(`float user_${name} = ${value}.0`);
				} else if (type === 'Float') {
					result.push(`float user_${name} = ${value}`);
				}
			} else {
				if (type === 'Array' || type === 'NumberTexture' || type === 'ArrayTexture(4)' || type === 'Input' || type === 'HTMLImage') {
					result.push(
						`uniform sampler2D user_${name}`,
						`uniform ivec2 user_${name}Size`,
						`uniform ivec3 user_${name}Dim`
					);
					if (type !== 'HTMLImage') {
						result.push(`uniform int user_${name}BitRatio`)
					}
				} else if (type === 'Integer' || type === 'Float' || type === 'Number') {
					result.push(`uniform float user_${name}`);
				} else {
					throw new Error(`Param type ${type} not supported in WebGL`);
				}
			}
		}
		return this._linesToString(result);
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
					case 'NumberTexture':
					case 'ArrayTexture(4)':
						result.push(
							`uniform sampler2D constants_${name}`,
							`uniform ivec2 constants_${name}Size`,
							`uniform ivec3 constants_${name}Dim`,
							`uniform int constants_${name}BitRatio`
						);
						break;
					default:
						throw new Error(`Unsupported constant ${name} type ${type}`);
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
			for (let i = 0; i < subKernels.length; i++) {
				result.push(
					`float subKernelResult_${subKernels[i].name} = 0.0`
				);
			}
		} else {
			result.push('float kernelResult = 0.0');
		}

		const functionBuilder = FunctionBuilder.fromKernel(this, WebGLFunctionNode, {
			fixIntegerDivisionAccuracy: this.fixIntegerDivisionAccuracy
		});

		return this._linesToString(result) + functionBuilder.getPrototypeString('kernel');
	}

	/**
	 * @desc Get main result string with checks for floatOutput, graphical, subKernelsResults, etc.
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
				'  gl_FragColor = actualColor'
			);
		} else if (this.floatOutput) {
			const channels = ['r', 'g', 'b', 'a'];

			for (let i = 0; i < channels.length; ++i) {
				result.push('  threadId = indexTo3D(index, uOutputDim)');
				result.push('  kernel()');

				if (subKernels) {
					result.push(`  gl_FragData[0].${channels[i]} = kernelResult`);

					for (let j = 0; j < subKernels.length; ++j) {
						result.push(`  gl_FragData[${j + 1}].${channels[i]} = subKernelResult_${subKernels[j].name}`);
					}
				} else {
					result.push(`  gl_FragColor.${channels[i]} = kernelResult`);
				}

				if (i < channels.length - 1) {
					result.push('  index += 1');
				}
			}
		} else if (subKernels !== null) {
			result.push('  threadId = indexTo3D(index, uOutputDim)');
			result.push('  kernel()');
			result.push('  gl_FragData[0] = encode32(kernelResult)');
			for (let i = 0; i < subKernels.length; i++) {
				result.push(`  gl_FragData[${i + 1}] = encode32(subKernelResult_${subKernels[i].name})`);
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
	 * @param {Array} lines - An Array of strings
	 * @returns {String} Single combined String, seperated by *\n*
	 */
	_linesToString(lines) {
		if (lines.length > 0) {
			return lines.join(';\n') + ';\n';
		} else {
			return '\n';
		}
	}

	/**
	 * @param {String} src - Shader string
	 * @param {Object} map - Variables/Constants associated with shader
	 */
	replaceArtifacts(src, map) {
		return src.replace(/[ ]*__([A-Z]+[0-9]*([_]?[A-Z])*)__;\n/g, (match, artifact) => {
			if (map.hasOwnProperty(artifact)) {
				return map[artifact];
			}
			throw `unhandled artifact ${artifact}`;
		});
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
	 */
	getVertexShader(args) {
		if (this.compiledVertexShader !== null) {
			return this.compiledVertexShader;
		}
		return this.compiledVertexShader = this.constructor.vertexShader;
	}

	/**
	 * @desc Returns the *pre-compiled* Kernel as a JS Object String, that can be reused.
	 */
	toString() {
		return webGLKernelString(this);
	}

	destroy(removeCanvasReferences) {
		if (this.outputTexture) {
			this.context.deleteTexture(this.outputTexture);
		}
		if (this.buffer) {
			this.context.deleteBuffer(this.buffer);
		}
		if (this.framebuffer) {
			this.context.deleteFramebuffer(this.framebuffer);
		}
		if (this.vertShader) {
			this.context.deleteShader(this.vertShader);
		}
		if (this.fragShader) {
			this.context.deleteShader(this.fragShader);
		}
		if (this.program) {
			this.context.deleteProgram(this.program);
		}

		const keys = Object.keys(this.textureCache);

		for (let i = 0; i < keys.length; i++) {
			const name = keys[i];
			this.context.deleteTexture(this.textureCache[name]);
		}

		if (this.subKernelOutputTextures) {
			for (let i = 0; i < this.subKernelOutputTextures.length; i++) {
				this.context.deleteTexture(this.subKernelOutputTextures[i]);
			}
		}
		if (removeCanvasReferences) {
			const idx = canvases.indexOf(this.canvas);
			if (idx >= 0) {
				canvases[idx] = null;
				maxTexSizes[idx] = null;
			}
		}
		this.destroyExtensions();
		delete this.context;
		delete this.canvas;
	}

	destroyExtensions() {
		this.extensions.OES_texture_float = null;
		this.extensions.OES_texture_float_linear = null;
		this.extensions.OES_element_index_uint = null;
	}

	static destroyContext(context) {
		const extension = context.getExtension('WEBGL_lose_context');
		if (extension) {
			extension.loseContext();
		}
	}

	toJSON() {
		const json = super.toJSON();
		json.functionNodes = FunctionBuilder.fromKernel(this, WebGLFunctionNode).toJSON();
		return json;
	}
}

module.exports = {
	WebGLKernel
};