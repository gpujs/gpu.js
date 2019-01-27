'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var GLKernel = require('../gl-kernel');
var FunctionBuilder = require('../function-builder');
var WebGLFunctionNode = require('./function-node');
var utils = require('../../utils');
var Texture = require('../../texture');
var fragShaderString = require('./shader-frag');
var vertShaderString = require('./shader-vert');
var kernelString = require('./kernel-string');

var isSupported = null;
var testCanvas = null;
var testContext = null;
var testExtensions = null;
var features = null;

var canvases = [];
var maxTexSizes = {};

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
 * @prop {Boolean} outputToTexture - Set output type to Texture, instead of float
 * @prop {String} endianness - Endian information like Little-endian, Big-endian.
 * @prop {Array} argumentTypes - Types of parameters sent to the Kernel
 * @prop {number} argumentsLength - Number of parameters sent to the Kernel
 * @prop {String} compiledFragShaderString - Compiled fragment shader string
 * @prop {String} compiledVertShaderString - Compiled Vertical shader string
 */

var WebGLKernel = function (_GLKernel) {
	_inherits(WebGLKernel, _GLKernel);

	_createClass(WebGLKernel, null, [{
		key: 'setupFeatureChecks',
		value: function setupFeatureChecks() {
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
					WEBGL_draw_buffers: testContext.getExtension('WEBGL_draw_buffers')
				};
				features = this.getFeatures();
			}
		}
	}, {
		key: 'isContextMatch',
		value: function isContextMatch(context) {
			if (typeof WebGLRenderingContext !== 'undefined') {
				return context instanceof WebGLRenderingContext;
			}
			return false;
		}
	}, {
		key: 'getFeatures',
		value: function getFeatures() {
			var isDrawBuffers = this.getIsDrawBuffers();
			return Object.freeze({
				isFloatRead: this.getIsFloatRead(),
				isIntegerDivisionAccurate: this.getIsIntegerDivisionAccurate(),
				isTextureFloat: this.getIsTextureFloat(),
				isDrawBuffers: isDrawBuffers,
				kernelMap: isDrawBuffers
			});
		}
	}, {
		key: 'getIsTextureFloat',
		value: function getIsTextureFloat() {
			return Boolean(testExtensions.OES_texture_float);
		}
	}, {
		key: 'getIsDrawBuffers',
		value: function getIsDrawBuffers() {
			return Boolean(testExtensions.WEBGL_draw_buffers);
		}
	}, {
		key: 'getMode',


		/**
   * @desc Return the current mode in which gpu.js is executing.
   * @returns {String} The current mode; "gpu".
   */
		value: function getMode() {
			return 'gpu';
		}
	}, {
		key: 'isSupported',
		get: function get() {
			if (isSupported !== null) {
				return isSupported;
			}
			this.setupFeatureChecks();
			isSupported = this.isContextMatch(testContext);
			return isSupported;
		}
	}, {
		key: 'testCanvas',
		get: function get() {
			return testCanvas;
		}
	}, {
		key: 'testContext',
		get: function get() {
			return testContext;
		}
	}, {
		key: 'features',
		get: function get() {
			return features;
		}
	}, {
		key: 'fragShaderString',
		get: function get() {
			return fragShaderString;
		}
	}, {
		key: 'vertShaderString',
		get: function get() {
			return vertShaderString;
		}
	}]);

	function WebGLKernel(fnString, settings) {
		_classCallCheck(this, WebGLKernel);

		var _this = _possibleConstructorReturn(this, (WebGLKernel.__proto__ || Object.getPrototypeOf(WebGLKernel)).call(this, fnString, settings));

		_this.textureCache = {};
		_this.threadDim = {};
		_this.programUniformLocationCache = {};
		_this.framebuffer = null;

		_this.buffer = null;
		_this.program = null;
		_this.outputToTexture = settings.outputToTexture;
		_this.endianness = utils.systemEndianness();
		_this.extensions = {};
		_this.subKernelOutputTextures = null;
		_this.argumentsLength = 0;
		_this.constantsLength = 0;
		_this.compiledFragShaderString = null;
		_this.compiledVertShaderString = null;
		_this.fragShader = null;
		_this.vertShader = null;
		_this.drawBuffersMap = null;
		_this.outputTexture = null;
		_this.maxTexSize = null;
		_this.uniform1fCache = {};
		_this.uniform1iCache = {};
		_this.uniform2fCache = {};
		_this.uniform2fvCache = {};
		_this.uniform2ivCache = {};
		_this.uniform3fvCache = {};
		_this.uniform3ivCache = {};
		if (settings.context) {
			_this.context = settings.context;
		} else {
			_this.context = _this.initContext();
		}
		return _this;
	}

	_createClass(WebGLKernel, [{
		key: 'initCanvas',
		value: function initCanvas() {
			if (typeof document !== 'undefined') {
				var canvas = document.createElement('canvas');
				// Default width and height, to fix webgl issue in safari
				canvas.width = 2;
				canvas.height = 2;
				return canvas;
			} else if (typeof OffscreenCanvas !== 'undefined') {
				return new OffscreenCanvas(0, 0);
			}
		}
	}, {
		key: 'initContext',
		value: function initContext() {
			var settings = {
				alpha: false,
				depth: false,
				antialias: false
			};
			var context = this.canvas.getContext('webgl', settings) || this.canvas.getContext('experimental-webgl', settings);
			return context;
		}
	}, {
		key: 'initExtensions',
		value: function initExtensions() {
			this.extensions = {
				OES_texture_float: this.context.getExtension('OES_texture_float'),
				OES_texture_float_linear: this.context.getExtension('OES_texture_float_linear'),
				OES_element_index_uint: this.context.getExtension('OES_element_index_uint'),
				WEBGL_draw_buffers: this.context.getExtension('WEBGL_draw_buffers')
			};
		}

		/**
   * @desc Validate settings related to Kernel, such as
   * floatOutputs and Textures, texSize, output,
   * graphical output.
   */

	}, {
		key: 'validateSettings',
		value: function validateSettings() {
			if (this.skipValidateSettings) {
				this.texSize = utils.dimToTexSize({
					floatTextures: this.floatTextures,
					floatOutput: this.floatOutput
				}, this.output, true);
				return;
			}

			var features = this.constructor.features;
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

				var argType = utils.getVariableType(arguments[0]);
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
	}, {
		key: 'updateMaxTexSize',
		value: function updateMaxTexSize() {
			var texSize = this.texSize;
			var canvas = this.canvas;
			if (this.maxTexSize === null) {
				var canvasIndex = canvases.indexOf(canvas);
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
   * @desc Builds the Kernel, by compiling Fragment and Vertical Shaders,
   * and instantiates the program.
   */

	}, {
		key: 'build',
		value: function build() {
			this.initExtensions();
			this.validateSettings();
			this.setupConstants();
			this.setupArguments(arguments);
			this.updateMaxTexSize();
			var texSize = this.texSize;
			var gl = this.context;
			var canvas = this.canvas;
			gl.enable(gl.SCISSOR_TEST);
			gl.viewport(0, 0, this.maxTexSize[0], this.maxTexSize[1]);
			canvas.width = this.maxTexSize[0];
			canvas.height = this.maxTexSize[1];
			var threadDim = this.threadDim = utils.clone(this.output);
			while (threadDim.length < 3) {
				threadDim.push(1);
			}

			var compiledVertShaderString = this._getVertShaderString(arguments);
			var vertShader = gl.createShader(gl.VERTEX_SHADER);
			gl.shaderSource(vertShader, compiledVertShaderString);
			gl.compileShader(vertShader);
			this.vertShader = vertShader;

			var compiledFragShaderString = this._getFragShaderString(arguments);
			var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
			gl.shaderSource(fragShader, compiledFragShaderString);
			gl.compileShader(fragShader);
			this.fragShader = fragShader;

			if (this.debug) {
				console.log('GLSL Shader Output:');
				console.log(compiledFragShaderString);
			}

			if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
				throw new Error('Error compiling vertex shader: ' + gl.getShaderInfoLog(vertShader));
			}
			if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
				throw new Error('Error compiling fragment shader: ' + gl.getShaderInfoLog(fragShader));
			}

			var program = this.program = gl.createProgram();
			gl.attachShader(program, vertShader);
			gl.attachShader(program, fragShader);
			gl.linkProgram(program);
			this.framebuffer = gl.createFramebuffer();
			this.framebuffer.width = texSize[0];
			this.framebuffer.height = texSize[1];

			var vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
			var texCoords = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);

			var texCoordOffset = vertices.byteLength;

			var buffer = this.buffer;
			if (!buffer) {
				buffer = this.buffer = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
				gl.bufferData(gl.ARRAY_BUFFER, vertices.byteLength + texCoords.byteLength, gl.STATIC_DRAW);
			} else {
				gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			}

			gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
			gl.bufferSubData(gl.ARRAY_BUFFER, texCoordOffset, texCoords);

			var aPosLoc = gl.getAttribLocation(this.program, 'aPos');
			gl.enableVertexAttribArray(aPosLoc);
			gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);
			var aTexCoordLoc = gl.getAttribLocation(this.program, 'aTexCoord');
			gl.enableVertexAttribArray(aTexCoordLoc);
			gl.vertexAttribPointer(aTexCoordLoc, 2, gl.FLOAT, false, 0, texCoordOffset);
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);

			for (var p in this.constants) {
				var value = this.constants[p];
				var type = utils.getVariableType(value, true);
				if (type === 'Float' || type === 'Integer') {
					continue;
				}
				gl.useProgram(this.program);
				this._addConstant(this.constants[p], type, p);
			}

			if (!this.outputImmutable) {
				this._setupOutputTexture();
				if (this.subKernels !== null && this.subKernels.length > 0) {
					this._setupSubOutputTextures(this.subKernels.length);
				}
			}
		}

		/**
   * @desc Run the kernel program, and send the output to renderOutput
   * <p> This method calls a helper method *renderOutput* to return the result. </p>
   *
   * @returns {Object|Undefined} Result The final output of the program, as float, and as Textures for reuse.
   */

	}, {
		key: 'run',
		value: function run() {
			if (this.program === null) {
				this.build.apply(this, arguments);
			}
			var argumentNames = this.argumentNames;
			var argumentTypes = this.argumentTypes;
			var texSize = this.texSize;
			var gl = this.context;

			gl.useProgram(this.program);
			gl.scissor(0, 0, texSize[0], texSize[1]);

			if (!this.hardcodeConstants) {
				this.setUniform3iv('uOutputDim', this.threadDim);
				this.setUniform2iv('uTexSize', texSize);
			}

			this.setUniform2f('ratio', texSize[0] / this.maxTexSize[0], texSize[1] / this.maxTexSize[1]);

			this.argumentsLength = 0;
			for (var texIndex = 0; texIndex < argumentNames.length; texIndex++) {
				this._addArgument(arguments[texIndex], argumentTypes[texIndex], argumentNames[texIndex]);
			}

			if (this.graphical) {
				if (this.outputToTexture) {
					gl.bindRenderbuffer(gl.RENDERBUFFER, null);
					gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
					if (!this.outputTexture || this.outputImmutable) {
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
			if (this.outputImmutable) {
				this._setupOutputTexture();
			}
			var outputTexture = this.outputTexture;

			if (this.subKernels !== null) {
				if (this.outputImmutable) {
					this.subKernelOutputTextures = [];
					this._setupSubOutputTextures(this.subKernels.length);
				}
				this.extensions.WEBGL_draw_buffers.drawBuffersWEBGL(this.drawBuffersMap);
			}

			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

			if (this.subKernelOutputTextures !== null) {
				if (this.subKernels !== null) {
					var output = {
						result: this.renderOutput(outputTexture)
					};
					for (var i = 0; i < this.subKernels.length; i++) {
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
   * @param {Object} outputTexture - Output Texture returned by webGl program
   * @returns {Object|Array} result
   */

	}, {
		key: 'renderOutput',
		value: function renderOutput(outputTexture) {
			var texSize = this.texSize;
			var gl = this.context;
			var threadDim = this.threadDim;
			var output = this.output;
			if (this.outputToTexture) {
				return new Texture(outputTexture, texSize, this.threadDim, output, this.context);
			} else {
				var result = void 0;
				if (this.floatOutput) {
					var w = texSize[0];
					var h = Math.ceil(texSize[1] / 4);
					result = new Float32Array(w * h * 4);
					gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, result);
				} else {
					var bytes = new Uint8Array(texSize[0] * texSize[1] * 4);
					gl.readPixels(0, 0, texSize[0], texSize[1], gl.RGBA, gl.UNSIGNED_BYTE, bytes);
					result = new Float32Array(bytes.buffer);
				}
				result = result.subarray(0, threadDim[0] * threadDim[1] * threadDim[2]);

				if (output.length === 1) {
					return result;
				} else if (output.length === 2) {
					return utils.splitArray(result, output[0]);
				} else if (output.length === 3) {
					var cube = utils.splitArray(result, output[0] * output[1]);
					return cube.map(function (x) {
						return utils.splitArray(x, output[0]);
					});
				}
			}
		}

		/**
   * @desc This return defined outputTexture, which is setup in .build(), or if immutable, is defined in .run()
   * @returns {Object} Output Texture Cache
   */

	}, {
		key: 'getOutputTexture',
		value: function getOutputTexture() {
			return this.outputTexture;
		}

		/**
   * @desc Setup and replace output texture
   */

	}, {
		key: '_setupOutputTexture',
		value: function _setupOutputTexture() {
			var gl = this.context;
			var texSize = this.texSize;
			var texture = this.outputTexture = this.context.createTexture();
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

	}, {
		key: '_setupSubOutputTextures',
		value: function _setupSubOutputTextures(length) {
			var gl = this.context;
			var texSize = this.texSize;
			var drawBuffersMap = this.drawBuffersMap = [gl.COLOR_ATTACHMENT0];
			var textures = this.subKernelOutputTextures = [];
			for (var i = 0; i < length; i++) {
				var texture = this.context.createTexture();
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

	}, {
		key: 'getArgumentTexture',
		value: function getArgumentTexture(name) {
			return this.getTextureCache('ARGUMENT_' + name);
		}

		/**
   * @desc Returns the Texture Cache of the supplied parameter (can be kernel, sub-kernel or argument)
   * @param {String} name - Name of the subkernel, argument, or kernel.
   * @returns {Object} Texture cache
   */

	}, {
		key: 'getTextureCache',
		value: function getTextureCache(name) {
			if (this.textureCache.hasOwnProperty(name)) {
				return this.textureCache[name];
			}
			return this.textureCache[name] = this.context.createTexture();
		}

		/**
   * @desc removes a texture from the kernel's cache
   * @param {String} name - Name of texture
   */

	}, {
		key: 'detachTextureCache',
		value: function detachTextureCache(name) {
			delete this.textureCache[name];
		}
	}, {
		key: 'setUniform1f',
		value: function setUniform1f(name, value) {
			if (this.uniform1fCache.hasOwnProperty(name)) {
				var cache = this.uniform1fCache[name];
				if (value === cache) {
					return;
				}
			}
			this.uniform1fCache[name] = value;
			var loc = this.getUniformLocation(name);
			this.context.uniform1f(loc, value);
		}
	}, {
		key: 'setUniform1i',
		value: function setUniform1i(name, value) {
			if (this.uniform1iCache.hasOwnProperty(name)) {
				var cache = this.uniform1iCache[name];
				if (value === cache) {
					return;
				}
			}
			this.uniform1iCache[name] = value;
			var loc = this.getUniformLocation(name);
			this.context.uniform1i(loc, value);
		}
	}, {
		key: 'setUniform2f',
		value: function setUniform2f(name, value1, value2) {
			if (this.uniform2fCache.hasOwnProperty(name)) {
				var cache = this.uniform2fCache[name];
				if (value1 === cache[0] && value2 === cache[1]) {
					return;
				}
			}
			this.uniform2fCache[name] = [value1, value2];
			var loc = this.getUniformLocation(name);
			this.context.uniform2f(loc, value1, value2);
		}
	}, {
		key: 'setUniform2fv',
		value: function setUniform2fv(name, value) {
			if (this.uniform2fvCache.hasOwnProperty(name)) {
				var cache = this.uniform2fvCache[name];
				if (value[0] === cache[0] && value[1] === cache[1]) {
					return;
				}
			}
			this.uniform2fvCache[name] = value;
			var loc = this.getUniformLocation(name);
			this.context.uniform2fv(loc, value);
		}
	}, {
		key: 'setUniform2iv',
		value: function setUniform2iv(name, value) {
			if (this.uniform2ivCache.hasOwnProperty(name)) {
				var cache = this.uniform2ivCache[name];
				if (value[0] === cache[0] && value[1] === cache[1]) {
					return;
				}
			}
			this.uniform2ivCache[name] = value;
			var loc = this.getUniformLocation(name);
			this.context.uniform2iv(loc, value);
		}
	}, {
		key: 'setUniform3fv',
		value: function setUniform3fv(name, value) {
			if (this.uniform3fvCache.hasOwnProperty(name)) {
				var cache = this.uniform3fvCache[name];
				if (value[0] === cache[0] && value[1] === cache[1] && value[2] === cache[2]) {
					return;
				}
			}
			this.uniform3fvCache[name] = value;
			var loc = this.getUniformLocation(name);
			this.context.uniform3fv(loc, value);
		}
	}, {
		key: 'setUniform3iv',
		value: function setUniform3iv(name, value) {
			if (this.uniform3ivCache.hasOwnProperty(name)) {
				var cache = this.uniform3ivCache[name];
				if (value[0] === cache[0] && value[1] === cache[1] && value[2] === cache[2]) {
					return;
				}
			}
			this.uniform3ivCache[name] = value;
			var loc = this.getUniformLocation(name);
			this.context.uniform3iv(loc, value);
		}

		/**
   * @desc Return WebGlUniformLocation for various variables
   * related to webGl program, such as user-defined variables,
   * as well as, dimension sizes, etc.
   */

	}, {
		key: 'getUniformLocation',
		value: function getUniformLocation(name) {
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

	}, {
		key: '_getFragShaderArtifactMap',
		value: function _getFragShaderArtifactMap(args) {
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
				MAIN_ARGUMENTS: this._getMainArgumentsString(args),
				MAIN_CONSTANTS: this._getMainConstantsString(),
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

	}, {
		key: '_addArgument',
		value: function _addArgument(value, type, name) {
			var gl = this.context;
			var argumentTexture = this.getArgumentTexture(name);
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
						var dim = utils.getDimensions(value, true);
						var size = utils.dimToTexSize({
							floatTextures: this.floatTextures,
							floatOutput: this.floatOutput
						}, dim);
						gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.argumentsLength);
						gl.bindTexture(gl.TEXTURE_2D, argumentTexture);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

						var length = size[0] * size[1];

						var _formatArrayTransfer2 = this._formatArrayTransfer(value, length),
						    valuesFlat = _formatArrayTransfer2.valuesFlat,
						    bitRatio = _formatArrayTransfer2.bitRatio;

						var buffer = void 0;
						if (this.floatTextures) {
							gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size[0], size[1], 0, gl.RGBA, gl.FLOAT, valuesFlat);
						} else {
							buffer = new Uint8Array(valuesFlat.buffer);
							gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size[0] / bitRatio, size[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
						}

						if (!this.hardcodeConstants) {
							this.setUniform3iv('user_' + name + 'Dim', dim);
							this.setUniform2iv('user_' + name + 'Size', size);
						}
						this.setUniform1i('user_' + name + 'BitRatio', bitRatio);
						this.setUniform1i('user_' + name, this.argumentsLength);
						break;
					}
				case 'Integer':
				case 'Float':
				case 'Number':
					{
						this.setUniform1f('user_' + name, value);
						break;
					}
				case 'Input':
					{
						var input = value;
						var _dim = input.size;
						var _size = utils.dimToTexSize({
							floatTextures: this.floatTextures,
							floatOutput: this.floatOutput
						}, _dim);
						gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.argumentsLength);
						gl.bindTexture(gl.TEXTURE_2D, argumentTexture);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

						var _length = _size[0] * _size[1];

						var _formatArrayTransfer3 = this._formatArrayTransfer(value.value, _length),
						    _valuesFlat = _formatArrayTransfer3.valuesFlat,
						    _bitRatio = _formatArrayTransfer3.bitRatio;

						if (this.floatTextures) {
							gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, _size[0], _size[1], 0, gl.RGBA, gl.FLOAT, input);
						} else {
							var _buffer = new Uint8Array(_valuesFlat.buffer);
							gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, _size[0] / _bitRatio, _size[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, _buffer);
						}

						if (!this.hardcodeConstants) {
							this.setUniform3iv('user_' + name + 'Dim', _dim);
							this.setUniform2iv('user_' + name + 'Size', _size);
						}
						this.setUniform1i('user_' + name + 'BitRatio', _bitRatio);
						this.setUniform1i('user_' + name, this.argumentsLength);
						break;
					}
				case 'HTMLImage':
					{
						var inputImage = value;
						var _dim2 = [inputImage.width, inputImage.height, 1];
						var _size2 = [inputImage.width, inputImage.height];

						gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.argumentsLength);
						gl.bindTexture(gl.TEXTURE_2D, argumentTexture);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
						gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
						// Upload the image into the texture.
						var mipLevel = 0; // the largest mip
						var internalFormat = gl.RGBA; // format we want in the texture
						var srcFormat = gl.RGBA; // format of data we are supplying
						var srcType = gl.UNSIGNED_BYTE; // type of data we are supplying
						gl.texImage2D(gl.TEXTURE_2D, mipLevel, internalFormat, srcFormat, srcType, inputImage);
						this.setUniform3iv('user_' + name + 'Dim', _dim2);
						this.setUniform2iv('user_' + name + 'Size', _size2);
						this.setUniform1i('user_' + name, this.argumentsLength);
						break;
					}
				case 'ArrayTexture(4)':
				case 'NumberTexture':
					{
						var inputTexture = value;
						if (inputTexture.context !== this.context) {
							throw new Error('argument ' + name + ' (' + type + ') must be from same context');
						}
						var _dim3 = inputTexture.dimensions;
						var _size3 = inputTexture.size;

						gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.argumentsLength);
						gl.bindTexture(gl.TEXTURE_2D, inputTexture.texture);

						this.setUniform3iv('user_' + name + 'Dim', _dim3);
						this.setUniform2iv('user_' + name + 'Size', _size3);
						this.setUniform1i('user_' + name + 'BitRatio', 1); // aways float32
						this.setUniform1i('user_' + name, this.argumentsLength);
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

	}, {
		key: '_addConstant',
		value: function _addConstant(value, type, name) {
			var gl = this.context;
			var argumentTexture = this.getArgumentTexture(name);
			if (value instanceof Texture) {
				type = value.type;
			}
			switch (type) {
				case 'Array':
					{
						var dim = utils.getDimensions(value, true);
						var size = utils.dimToTexSize({
							floatTextures: this.floatTextures,
							floatOutput: this.floatOutput
						}, dim);
						gl.activeTexture(gl.TEXTURE0 + this.constantsLength);
						gl.bindTexture(gl.TEXTURE_2D, argumentTexture);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

						var length = size[0] * size[1];

						var _formatArrayTransfer4 = this._formatArrayTransfer(value, length),
						    valuesFlat = _formatArrayTransfer4.valuesFlat,
						    bitRatio = _formatArrayTransfer4.bitRatio;

						var buffer = void 0;
						if (this.floatTextures) {
							gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size[0], size[1], 0, gl.RGBA, gl.FLOAT, valuesFlat);
						} else {
							buffer = new Uint8Array(valuesFlat.buffer);
							gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size[0] / bitRatio, size[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
						}

						if (!this.hardcodeConstants) {
							this.setUniform3iv('constants_' + name + 'Dim', dim);
							this.setUniform2iv('constants_' + name + 'Size', size);
						}
						this.setUniform1i('constants_' + name + 'BitRatio', bitRatio);
						this.setUniform1i('constants_' + name, this.constantsLength);
						break;
					}
				case 'Input':
					{
						var input = value;
						var _dim4 = input.size;
						var _size4 = utils.dimToTexSize({
							floatTextures: this.floatTextures,
							floatOutput: this.floatOutput
						}, _dim4);
						gl.activeTexture(gl.TEXTURE0 + this.constantsLength);
						gl.bindTexture(gl.TEXTURE_2D, argumentTexture);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

						var _length2 = _size4[0] * _size4[1];

						var _formatArrayTransfer5 = this._formatArrayTransfer(value.value, _length2),
						    _valuesFlat2 = _formatArrayTransfer5.valuesFlat,
						    _bitRatio2 = _formatArrayTransfer5.bitRatio;

						if (this.floatTextures) {
							gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, _size4[0], _size4[1], 0, gl.RGBA, gl.FLOAT, inputArray);
						} else {
							var _buffer2 = new Uint8Array(_valuesFlat2.buffer);
							gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, _size4[0] / _bitRatio2, _size4[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, _buffer2);
						}

						if (!this.hardcodeConstants) {
							this.setUniform3iv('constants_' + name + 'Dim', _dim4);
							this.setUniform2iv('constants_' + name + 'Size', _size4);
						}
						this.setUniform1i('constants_' + name + 'BitRatio', _bitRatio2);
						this.setUniform1i('constants_' + name, this.constantsLength);
						break;
					}
				case 'HTMLImage':
					{
						var inputImage = value;
						var _dim5 = [inputImage.width, inputImage.height, 1];
						var _size5 = [inputImage.width, inputImage.height];

						gl.activeTexture(gl.TEXTURE0 + this.constantsLength);
						gl.bindTexture(gl.TEXTURE_2D, argumentTexture);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
						gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
						// Upload the image into the texture.
						var mipLevel = 0; // the largest mip
						var internalFormat = gl.RGBA; // format we want in the texture
						var srcFormat = gl.RGBA; // format of data we are supplying
						var srcType = gl.UNSIGNED_BYTE; // type of data we are supplying
						gl.texImage2D(gl.TEXTURE_2D, mipLevel, internalFormat, srcFormat, srcType, inputImage);
						this.setUniform3iv('constants_' + name + 'Dim', _dim5);
						this.setUniform2iv('constants_' + name + 'Size', _size5);
						this.setUniform1i('constants_' + name, this.constantsLength);
						break;
					}
				case 'ArrayTexture(4)':
				case 'NumberTexture':
					{
						var inputTexture = value;
						if (inputTexture.context !== this.context) {
							throw new Error('argument ' + name + ' (' + type + ') must be from same context');
						}
						var _dim6 = inputTexture.dimensions;
						var _size6 = inputTexture.size;

						gl.activeTexture(gl.TEXTURE0 + this.constantsLength);
						gl.bindTexture(gl.TEXTURE_2D, inputTexture.texture);
						this.setUniform3iv('constants_' + name + 'Dim', _dim6);
						this.setUniform2iv('constants_' + name + 'Size', _size6);
						this.setUniform1i('constants_' + name + 'BitRatio', 1); // aways float32
						this.setUniform1i('constants_' + name, this.constantsLength);
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

	}, {
		key: '_formatArrayTransfer',
		value: function _formatArrayTransfer(value, length) {
			var bitRatio = 1; // bit storage ratio of source to target 'buffer', i.e. if 8bit array -> 32bit tex = 4
			var valuesFlat = value;
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
				bitRatio: bitRatio,
				valuesFlat: valuesFlat
			};
		}

		/**
   * @desc Get the header string for the program.
   * This returns an empty string if no sub-kernels are defined.
   *
   * @returns {String} result
   */

	}, {
		key: '_getHeaderString',
		value: function _getHeaderString() {
			return this.subKernels !== null ? '#extension GL_EXT_draw_buffers : require\n' : '';
		}

		/**
   * @desc Get the maximum loop size String.
   * @returns {String} result
   */

	}, {
		key: '_getLoopMaxString',
		value: function _getLoopMaxString() {
			return this.loopMaxIterations ? ' ' + parseInt(this.loopMaxIterations) + ';\n' : ' 1000;\n';
		}

		/**
   * @desc Generate transpiled glsl Strings for constant parameters sent to a kernel
   * They can be defined by *hardcodeConstants*
   *
   * @returns {String} result
   */

	}, {
		key: '_getConstantsString',
		value: function _getConstantsString() {
			var result = [];
			var threadDim = this.threadDim;
			var texSize = this.texSize;
			if (this.hardcodeConstants) {
				result.push('ivec3 uOutputDim = ivec3(' + threadDim[0] + ', ' + threadDim[1] + ', ' + threadDim[2] + ')', 'ivec2 uTexSize = ivec2(' + texSize[0] + ', ' + texSize[1] + ')');
			} else {
				result.push('uniform ivec3 uOutputDim', 'uniform ivec2 uTexSize');
			}

			return this._linesToString(result);
		}

		/**
   * @desc Get texture coordinate string for the program
   * @returns {String} result
   */

	}, {
		key: '_getTextureCoordinate',
		value: function _getTextureCoordinate() {
			var subKernels = this.subKernels;
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

	}, {
		key: '_getDecode32EndiannessString',
		value: function _getDecode32EndiannessString() {
			return this.endianness === 'LE' ? '' : '  rgba.rgba = rgba.abgr;\n';
		}

		/**
   * @desc Get Encode32 endianness string for little-endian and big-endian
   * @returns {String} result
   */

	}, {
		key: '_getEncode32EndiannessString',
		value: function _getEncode32EndiannessString() {
			return this.endianness === 'LE' ? '' : '  rgba.rgba = rgba.abgr;\n';
		}

		/**
   * @desc if fixIntegerDivisionAccuracy provide method to replace /
   * @returns {String} result
   */

	}, {
		key: '_getDivideWithIntegerCheckString',
		value: function _getDivideWithIntegerCheckString() {
			return this.fixIntegerDivisionAccuracy ? 'float div_with_int_check(float x, float y) {\n  if (floor(x) == x && floor(y) == y && integerMod(x, y) == 0.0) {\n    return float(int(x)/int(y));\n  }\n  return x / y;\n}' : '';
		}

		/**
   * @returns {String} wraparound string
   */

	}, {
		key: '_getGetWraparoundString',
		value: function _getGetWraparoundString() {
			return this.wraparound ? '  xyz = mod(xyz, texDim);\n' : '';
		}
	}, {
		key: '_getGetTextureChannelString',
		value: function _getGetTextureChannelString() {
			if (!this.floatTextures) return '';

			return this._linesToString(['  int channel = integerMod(index, 4)', '  index = index / 4']);
		}

		/**
   * @desc Get generic texture index string, if floatTextures flag is true.
   * @example
   * '  index = float(int(index)/4);\n'
   *
   */

	}, {
		key: '_getGetTextureIndexString',
		value: function _getGetTextureIndexString() {
			return this.floatTextures ? '  index = index / 4;\n' : '';
		}
	}, {
		key: '_getGetResultString',
		value: function _getGetResultString() {
			if (!this.floatTextures) {
				return '  return decode(texel, x, bitRatio);';
			}
			return this._linesToString(['  if (channel == 0) return texel.r', '  if (channel == 1) return texel.g', '  if (channel == 2) return texel.b', '  if (channel == 3) return texel.a']);
		}

		/**
   * @desc Generate transpiled glsl Strings for user-defined parameters sent to a kernel
   * @param {Array} args - The actual parameters sent to the Kernel
   * @returns {String} result
   */

	}, {
		key: '_getMainArgumentsString',
		value: function _getMainArgumentsString(args) {
			var result = [];
			var argumentTypes = this.argumentTypes;
			var argumentNames = this.argumentNames;
			for (var i = 0; i < argumentNames.length; i++) {
				var value = args[i];
				var name = argumentNames[i];
				var type = argumentTypes[i];
				if (this.hardcodeConstants) {
					if (type === 'Array' || type === 'NumberTexture' || type === 'ArrayTexture(4)') {
						var dim = utils.getDimensions(value, true);
						var size = utils.dimToTexSize({
							floatTextures: this.floatTextures,
							floatOutput: this.floatOutput
						}, dim);

						result.push('uniform sampler2D user_' + name, 'ivec2 user_' + name + 'Size = ivec2(' + size[0] + ', ' + size[1] + ')', 'ivec3 user_' + name + 'Dim = ivec3(' + dim[0] + ', ' + dim[1] + ', ' + dim[2] + ')', 'uniform int user_' + name + 'BitRatio');
					} else if (type === 'Integer') {
						result.push('float user_' + name + ' = ' + value + '.0');
					} else if (type === 'Float') {
						result.push('float user_' + name + ' = ' + value);
					}
				} else {
					if (type === 'Array' || type === 'NumberTexture' || type === 'ArrayTexture(4)' || type === 'Input' || type === 'HTMLImage') {
						result.push('uniform sampler2D user_' + name, 'uniform ivec2 user_' + name + 'Size', 'uniform ivec3 user_' + name + 'Dim');
						if (type !== 'HTMLImage') {
							result.push('uniform int user_' + name + 'BitRatio');
						}
					} else if (type === 'Integer' || type === 'Float') {
						result.push('uniform float user_' + name);
					} else {
						throw new Error('Param type ' + name + ' not supported in WebGL, only WebGL2');
					}
				}
			}
			return this._linesToString(result);
		}
	}, {
		key: '_getMainConstantsString',
		value: function _getMainConstantsString() {
			var result = [];
			if (this.constants) {
				for (var name in this.constants) {
					if (!this.constants.hasOwnProperty(name)) continue;
					var value = this.constants[name];
					var type = utils.getVariableType(value, true);
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
							result.push('uniform sampler2D constants_' + name, 'uniform ivec2 constants_' + name + 'Size', 'uniform ivec3 constants_' + name + 'Dim', 'uniform int constants_' + name + 'BitRatio');
							break;
						default:
							throw new Error('Unsupported constant ' + name + ' type ' + type);
					}
				}
			}
			return this._linesToString(result);
		}

		/**
   * @desc Get Kernel program string (in *glsl*) for a kernel.
   * @returns {String} result
   */

	}, {
		key: '_getKernelString',
		value: function _getKernelString() {
			var result = [];
			var subKernels = this.subKernels;
			if (subKernels !== null) {
				result.push('float kernelResult = 0.0');
				for (var i = 0; i < subKernels.length; i++) {
					result.push('float subKernelResult_' + subKernels[i].name + ' = 0.0');
				}
			} else {
				result.push('float kernelResult = 0.0');
			}

			var functionBuilder = FunctionBuilder.fromKernel(this, WebGLFunctionNode, {
				fixIntegerDivisionAccuracy: this.fixIntegerDivisionAccuracy
			});

			return this._linesToString(result) + functionBuilder.getPrototypeString('kernel');
		}

		/**
   * @desc Get main result string with checks for floatOutput, graphical, subKernelsResults, etc.
   * @returns {String} result
   */

	}, {
		key: '_getMainResultString',
		value: function _getMainResultString() {
			var subKernels = this.subKernels;
			var result = [];

			if (this.floatOutput) {
				result.push('  index *= 4');
			}

			if (this.graphical) {
				result.push('  threadId = indexTo3D(index, uOutputDim)', '  kernel()', '  gl_FragColor = actualColor');
			} else if (this.floatOutput) {
				var channels = ['r', 'g', 'b', 'a'];

				for (var i = 0; i < channels.length; ++i) {
					result.push('  threadId = indexTo3D(index, uOutputDim)');
					result.push('  kernel()');

					if (subKernels) {
						result.push('  gl_FragData[0].' + channels[i] + ' = kernelResult');

						for (var j = 0; j < subKernels.length; ++j) {
							result.push('  gl_FragData[' + (j + 1) + '].' + channels[i] + ' = subKernelResult_' + subKernels[j].name);
						}
					} else {
						result.push('  gl_FragColor.' + channels[i] + ' = kernelResult');
					}

					if (i < channels.length - 1) {
						result.push('  index += 1');
					}
				}
			} else if (subKernels !== null) {
				result.push('  threadId = indexTo3D(index, uOutputDim)');
				result.push('  kernel()');
				result.push('  gl_FragData[0] = encode32(kernelResult)');
				for (var _i = 0; _i < subKernels.length; _i++) {
					result.push('  gl_FragData[' + (_i + 1) + '] = encode32(subKernelResult_' + subKernels[_i].name + ')');
				}
			} else {
				result.push('  threadId = indexTo3D(index, uOutputDim)', '  kernel()', '  gl_FragColor = encode32(kernelResult)');
			}

			return this._linesToString(result);
		}

		/**
   * @param {Array} lines - An Array of strings
   * @returns {String} Single combined String, seperated by *\n*
   */

	}, {
		key: '_linesToString',
		value: function _linesToString(lines) {
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

	}, {
		key: '_replaceArtifacts',
		value: function _replaceArtifacts(src, map) {
			return src.replace(/[ ]*__([A-Z]+[0-9]*([_]?[A-Z])*)__;\n/g, function (match, artifact) {
				if (map.hasOwnProperty(artifact)) {
					return map[artifact];
				}
				throw 'unhandled artifact ' + artifact;
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

	}, {
		key: '_getFragShaderString',
		value: function _getFragShaderString(args) {
			if (this.compiledFragShaderString !== null) {
				return this.compiledFragShaderString;
			}
			return this.compiledFragShaderString = this._replaceArtifacts(this.constructor.fragShaderString, this._getFragShaderArtifactMap(args));
		}

		/**
   * @desc Get the vertical shader String
   * @param {Array} args - The actual parameters sent to the Kernel
   * @returns {string} Vertical Shader string
   */

	}, {
		key: '_getVertShaderString',
		value: function _getVertShaderString(args) {
			if (this.compiledVertShaderString !== null) {
				return this.compiledVertShaderString;
			}
			return this.compiledVertShaderString = this.constructor.vertShaderString;
		}

		/**
   * @desc Returns the *pre-compiled* Kernel as a JS Object String, that can be reused.
   */

	}, {
		key: 'toString',
		value: function toString() {
			return kernelString(this);
		}

		/**
   *
   * @param {Boolean} removeCanvasReferences
   */

	}, {
		key: 'destroy',
		value: function destroy(removeCanvasReferences) {
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

			var keys = Object.keys(this.textureCache);

			for (var i = 0; i < keys.length; i++) {
				var name = keys[i];
				this.context.deleteTexture(this.textureCache[name]);
			}

			if (this.subKernelOutputTextures) {
				for (var _i2 = 0; _i2 < this.subKernelOutputTextures.length; _i2++) {
					this.context.deleteTexture(this.subKernelOutputTextures[_i2]);
				}
			}
			if (removeCanvasReferences) {
				var idx = canvases.indexOf(this.canvas);
				if (idx >= 0) {
					canvases[idx] = null;
					maxTexSizes[idx] = null;
				}
			}
			this.destroyExtensions();
			delete this.context;
			delete this.canvas;
		}
	}, {
		key: 'destroyExtensions',
		value: function destroyExtensions() {
			this.extensions.OES_texture_float = null;
			this.extensions.OES_texture_float_linear = null;
			this.extensions.OES_element_index_uint = null;
		}
	}], [{
		key: 'destroyContext',
		value: function destroyContext(context) {
			var extension = context.getExtension('WEBGL_lose_context');
			if (extension) {
				extension.loseContext();
			}
		}
	}]);

	return WebGLKernel;
}(GLKernel);

module.exports = WebGLKernel;