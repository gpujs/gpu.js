'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var KernelBase = require('../kernel-base');
var utils = require('../../core/utils');
var Texture = require('../../core/texture');
var fragShaderString = require('./shader-frag');
var vertShaderString = require('./shader-vert');
var kernelString = require('./kernel-string');
var canvases = [];
var maxTexSizes = {};

module.exports = function (_KernelBase) {
	_inherits(WebGLKernel, _KernelBase);

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
		_this.subKernelOutputTextures = null;
		_this.subKernelOutputVariableNames = null;
		_this.argumentsLength = 0;
		_this.compiledFragShaderString = null;
		_this.compiledVertShaderString = null;
		_this.drawBuffersMap = null;
		_this.outputTexture = null;
		_this.maxTexSize = null;
		_this.uniform1fCache = {};
		_this.uniform1iCache = {};
		_this.uniform2fCache = {};
		_this.uniform2fvCache = {};
		_this.uniform3fvCache = {};
		if (!_this._webGl) _this._webGl = _this.initWebGl();
		return _this;
	}

	_createClass(WebGLKernel, [{
		key: 'initWebGl',
		value: function initWebGl() {
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

	}, {
		key: 'validateOptions',
		value: function validateOptions() {
			var isFloatReadPixel = utils.isFloatReadPixelsSupported();
			if (this.floatTextures === true && !utils.OES_texture_float) {
				throw new Error('Float textures are not supported on this browser');
			} else if (this.floatOutput === true && this.floatOutputForce !== true && !isFloatReadPixel) {
				throw new Error('Float texture outputs are not supported on this browser');
			} else if (this.floatTextures === undefined && utils.OES_texture_float) {
				this.floatTextures = true;
				this.floatOutput = isFloatReadPixel;
			}

			if (!this.output || this.output.length === 0) {
				if (arguments.length !== 1) {
					throw new Error('Auto output only supported for kernels with only one input');
				}

				var argType = utils.getArgumentType(arguments[0]);
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
	}, {
		key: 'updateMaxTexSize',
		value: function updateMaxTexSize() {
			var texSize = this.texSize;
			var canvas = this._canvas;
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
   * @memberOf WebGLKernel#
   * @function
   * @name build
   *
   * @desc Builds the Kernel, by compiling Fragment and Vertical Shaders,
   * and instantiates the program.
   *
   */

	}, {
		key: 'build',
		value: function build() {
			this.validateOptions();
			this.setupParams(arguments);
			this.updateMaxTexSize();
			var texSize = this.texSize;
			var gl = this._webGl;
			var canvas = this._canvas;
			gl.enable(gl.SCISSOR_TEST);
			gl.viewport(0, 0, this.maxTexSize[0], this.maxTexSize[1]);
			canvas.width = this.maxTexSize[0];
			canvas.height = this.maxTexSize[1];
			var threadDim = this.threadDim = utils.clone(this.output);
			while (threadDim.length < 3) {
				threadDim.push(1);
			}

			if (this.functionBuilder) this._addKernels();

			var compiledVertShaderString = this._getVertShaderString(arguments);
			var vertShader = gl.createShader(gl.VERTEX_SHADER);
			gl.shaderSource(vertShader, compiledVertShaderString);
			gl.compileShader(vertShader);

			var compiledFragShaderString = this._getFragShaderString(arguments);
			var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
			gl.shaderSource(fragShader, compiledFragShaderString);
			gl.compileShader(fragShader);

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
			gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, gl.FALSE, 0, 0);
			var aTexCoordLoc = gl.getAttribLocation(this.program, 'aTexCoord');
			gl.enableVertexAttribArray(aTexCoordLoc);
			gl.vertexAttribPointer(aTexCoordLoc, 2, gl.FLOAT, gl.FALSE, 0, texCoordOffset);
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);

			if (!this.outputImmutable) {
				this._setupOutputTexture();
				if (this.subKernelOutputVariableNames !== null && this.subKernelOutputVariableNames.length > 0) {
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

	}, {
		key: 'run',
		value: function run() {
			if (this.program === null) {
				this.build.apply(this, arguments);
			}
			var paramNames = this.paramNames;
			var paramTypes = this.paramTypes;
			var texSize = this.texSize;
			var gl = this._webGl;

			gl.useProgram(this.program);
			gl.scissor(0, 0, texSize[0], texSize[1]);

			if (!this.hardcodeConstants) {
				this.setUniform3fv('uOutputDim', this.threadDim);
				this.setUniform2fv('uTexSize', texSize);
			}

			this.setUniform2f('ratio', texSize[0] / this.maxTexSize[0], texSize[1] / this.maxTexSize[1]);

			this.argumentsLength = 0;
			for (var texIndex = 0; texIndex < paramNames.length; texIndex++) {
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
			var outputTexture = this.outputTexture;

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
					var output = [];
					output.result = this.renderOutput(outputTexture);
					for (var i = 0; i < this.subKernels.length; i++) {
						output.push(new Texture(this.subKernelOutputTextures[i], texSize, this.threadDim, this.output, this._webGl));
					}
					return output;
				} else if (this.subKernelProperties !== null) {
					var _output = {
						result: this.renderOutput(outputTexture)
					};
					var _i = 0;
					for (var p in this.subKernelProperties) {
						if (!this.subKernelProperties.hasOwnProperty(p)) continue;
						_output[p] = new Texture(this.subKernelOutputTextures[_i], texSize, this.threadDim, this.output, this._webGl);
						_i++;
					}
					return _output;
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

	}, {
		key: 'renderOutput',
		value: function renderOutput(outputTexture) {
			var texSize = this.texSize;
			var gl = this._webGl;
			var threadDim = this.threadDim;
			var output = this.output;
			if (this.outputToTexture) {
				return new Texture(outputTexture, texSize, this.threadDim, output, this._webGl);
			} else {
				var result = void 0;
				if (this.floatOutput) {
					result = new Float32Array(texSize[0] * texSize[1] * 4);
					gl.readPixels(0, 0, texSize[0], texSize[1], gl.RGBA, gl.FLOAT, result);
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
   * @memberOf WebGLKernel#
   * @function
   * @name getOutputTexture
   *
   * @desc This return defined outputTexture, which is setup in .build(), or if immutable, is defined in .run()
   *
   * @returns {Object} Output Texture Cache
   *
   */

	}, {
		key: 'getOutputTexture',
		value: function getOutputTexture() {
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

	}, {
		key: '_setupOutputTexture',
		value: function _setupOutputTexture() {
			var gl = this._webGl;
			var texSize = this.texSize;
			var texture = this.outputTexture = this._webGl.createTexture();
			gl.activeTexture(gl.TEXTURE0 + this.paramNames.length);
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

	}, {
		key: '_setupSubOutputTextures',
		value: function _setupSubOutputTextures(length) {
			var gl = this._webGl;
			var texSize = this.texSize;
			var drawBuffersMap = this.drawBuffersMap = [gl.COLOR_ATTACHMENT0];
			var textures = this.subKernelOutputTextures = [];
			for (var i = 0; i < length; i++) {
				var texture = this._webGl.createTexture();
				textures.push(texture);
				drawBuffersMap.push(gl.COLOR_ATTACHMENT0 + i + 1);
				gl.activeTexture(gl.TEXTURE0 + this.paramNames.length + i);
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

	}, {
		key: 'getArgumentTexture',
		value: function getArgumentTexture(name) {
			return this.getTextureCache('ARGUMENT_' + name);
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

	}, {
		key: 'getTextureCache',
		value: function getTextureCache(name) {
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
			this._webGl.uniform1f(loc, value);
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
			this._webGl.uniform1i(loc, value);
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
			this._webGl.uniform2f(loc, value1, value2);
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
			this._webGl.uniform2fv(loc, value);
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
			this._webGl.uniform3fv(loc, value);
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

	}, {
		key: 'getUniformLocation',
		value: function getUniformLocation(name) {
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

	}, {
		key: '_getFragShaderArtifactMap',
		value: function _getFragShaderArtifactMap(args) {
			return {
				HEADER: this._getHeaderString(),
				LOOP_MAX: this._getLoopMaxString(),
				CONSTANTS: this._getConstantsString(),
				DECODE32_ENDIANNESS: this._getDecode32EndiannessString(),
				ENCODE32_ENDIANNESS: this._getEncode32EndiannessString(),
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

	}, {
		key: '_addArgument',
		value: function _addArgument(value, type, name) {
			var gl = this._webGl;
			var argumentTexture = this.getArgumentTexture(name);
			if (value instanceof Texture) {
				type = 'Texture';
			}
			switch (type) {
				case 'Array':
					{
						var dim = utils.getDimensions(value, true);
						var size = utils.dimToTexSize({
							floatTextures: this.floatTextures,
							floatOutput: this.floatOutput
						}, dim);
						gl.activeTexture(gl.TEXTURE0 + this.argumentsLength);
						gl.bindTexture(gl.TEXTURE_2D, argumentTexture);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

						var length = size[0] * size[1];
						if (this.floatTextures) {
							length *= 4;
						}

						var valuesFlat = new Float32Array(length);
						utils.flattenTo(value, valuesFlat);

						var buffer = void 0;
						if (this.floatTextures) {
							gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size[0], size[1], 0, gl.RGBA, gl.FLOAT, valuesFlat);
						} else {
							buffer = new Uint8Array(valuesFlat.buffer);
							gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size[0], size[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
						}

						if (!this.hardcodeConstants) {
							this.setUniform3fv('user_' + name + 'Dim', dim);
							this.setUniform2fv('user_' + name + 'Size', size);
						}
						this.setUniform1i('user_' + name, this.argumentsLength);
						break;
					}
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
						gl.activeTexture(gl.TEXTURE0 + this.argumentsLength);
						gl.bindTexture(gl.TEXTURE_2D, argumentTexture);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

						var _length = _size[0] * _size[1];
						var inputArray = void 0;
						if (this.floatTextures) {
							_length *= 4;
							inputArray = new Float32Array(_length);
							inputArray.set(input.value);
						} else {
							inputArray = input.value;
						}

						if (this.floatTextures) {
							gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, _size[0], _size[1], 0, gl.RGBA, gl.FLOAT, inputArray);
						} else {
							var _buffer = new Uint8Array(inputArray.buffer);
							gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, _size[0], _size[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, _buffer);
						}

						if (!this.hardcodeConstants) {
							this.setUniform3fv('user_' + name + 'Dim', _dim);
							this.setUniform2fv('user_' + name + 'Size', _size);
						}
						this.setUniform1i('user_' + name, this.argumentsLength);
						break;
					}
				case 'Texture':
					{
						var inputTexture = value;
						var _dim2 = inputTexture.dimensions;
						var _size2 = inputTexture.size;

						gl.activeTexture(gl.TEXTURE0 + this.argumentsLength);
						gl.bindTexture(gl.TEXTURE_2D, inputTexture.texture);

						this.setUniform3fv('user_' + name + 'Dim', _dim2);
						this.setUniform2fv('user_' + name + 'Size', _size2);
						this.setUniform1i('user_' + name, this.argumentsLength);
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
   * @name _getHeaderString
   *
   * @desc Get the header string for the program.
   * This returns an empty string if no sub-kernels are defined.
   *
   * @returns {String} result
   *
   */

	}, {
		key: '_getHeaderString',
		value: function _getHeaderString() {
			return this.subKernels !== null || this.subKernelProperties !== null ?
			//webgl2 '#version 300 es\n' :
			'#extension GL_EXT_draw_buffers : require\n' : '';
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

	}, {
		key: '_getLoopMaxString',
		value: function _getLoopMaxString() {
			return this.loopMaxIterations ? ' ' + parseInt(this.loopMaxIterations) + '.0;\n' : ' 1000.0;\n';
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

	}, {
		key: '_getConstantsString',
		value: function _getConstantsString() {
			var result = [];
			var threadDim = this.threadDim;
			var texSize = this.texSize;
			if (this.hardcodeConstants) {
				result.push('highp vec3 uOutputDim = vec3(' + threadDim[0] + ',' + threadDim[1] + ', ' + threadDim[2] + ')', 'highp vec2 uTexSize = vec2(' + texSize[0] + ', ' + texSize[1] + ')');
			} else {
				result.push('uniform highp vec3 uOutputDim', 'uniform highp vec2 uTexSize');
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

	}, {
		key: '_getTextureCoordinate',
		value: function _getTextureCoordinate() {
			var names = this.subKernelOutputVariableNames;
			if (names === null || names.length < 1) {
				return 'varying highp vec2 vTexCoord;\n';
			} else {
				return 'out highp vec2 vTexCoord;\n';
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

	}, {
		key: '_getDecode32EndiannessString',
		value: function _getDecode32EndiannessString() {
			return this.endianness === 'LE' ? '' : '  rgba.rgba = rgba.abgr;\n';
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

	}, {
		key: '_getEncode32EndiannessString',
		value: function _getEncode32EndiannessString() {
			return this.endianness === 'LE' ? '' : '  rgba.rgba = rgba.abgr;\n';
		}

		/**
   * @function
   * @memberOf WebGLKernel#
   * @name _getGetWraparoundString
   *
   * @returns {String} wraparound string
   */

	}, {
		key: '_getGetWraparoundString',
		value: function _getGetWraparoundString() {
			return this.wraparound ? '  xyz = mod(xyz, texDim);\n' : '';
		}

		/**
   * @memberOf WebGLKernel#
   * @function
   * @name _getGetTextureChannelString
   *
   */

	}, {
		key: '_getGetTextureChannelString',
		value: function _getGetTextureChannelString() {
			if (!this.floatTextures) return '';

			return this._linesToString(['  int channel = int(integerMod(index, 4.0))', '  index = float(int(index) / 4)']);
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

	}, {
		key: '_getGetTextureIndexString',
		value: function _getGetTextureIndexString() {
			return this.floatTextures ? '  index = float(int(index)/4);\n' : '';
		}

		/**
   * @memberOf WebGLKernel#
   * @function
   * @name _getGetResultString
   *
   */

	}, {
		key: '_getGetResultString',
		value: function _getGetResultString() {
			if (!this.floatTextures) return '  return decode32(texel);\n';
			return this._linesToString(['  if (channel == 0) return texel.r', '  if (channel == 1) return texel.g', '  if (channel == 2) return texel.b', '  if (channel == 3) return texel.a']);
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

	}, {
		key: '_getMainParamsString',
		value: function _getMainParamsString(args) {
			var result = [];
			var paramTypes = this.paramTypes;
			var paramNames = this.paramNames;
			for (var i = 0; i < paramNames.length; i++) {
				var param = args[i];
				var paramName = paramNames[i];
				var paramType = paramTypes[i];
				if (this.hardcodeConstants) {
					if (paramType === 'Array' || paramType === 'Texture') {
						var paramDim = utils.getDimensions(param, true);
						var paramSize = utils.dimToTexSize({
							floatTextures: this.floatTextures,
							floatOutput: this.floatOutput
						}, paramDim);

						result.push('uniform highp sampler2D user_' + paramName, 'highp vec2 user_' + paramName + 'Size = vec2(' + paramSize[0] + '.0, ' + paramSize[1] + '.0)', 'highp vec3 user_' + paramName + 'Dim = vec3(' + paramDim[0] + '.0, ' + paramDim[1] + '.0, ' + paramDim[2] + '.0)');
					} else if (paramType === 'Number' && Number.isInteger(param)) {
						result.push('highp float user_' + paramName + ' = ' + param + '.0');
					} else if (paramType === 'Number') {
						result.push('highp float user_' + paramName + ' = ' + param);
					}
				} else {
					if (paramType === 'Array' || paramType === 'Texture' || paramType === 'Input') {
						result.push('uniform highp sampler2D user_' + paramName, 'uniform highp vec2 user_' + paramName + 'Size', 'uniform highp vec3 user_' + paramName + 'Dim');
					} else if (paramType === 'Number') {
						result.push('uniform highp float user_' + paramName);
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

	}, {
		key: '_getMainConstantsString',
		value: function _getMainConstantsString() {
			var result = [];
			if (this.constants) {
				for (var name in this.constants) {
					if (!this.constants.hasOwnProperty(name)) continue;
					var value = parseFloat(this.constants[name]);

					if (Number.isInteger(value)) {
						result.push('const float constants_' + name + ' = ' + parseInt(value) + '.0');
					} else {
						result.push('const float constants_' + name + ' = ' + parseFloat(value));
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

	}, {
		key: '_getKernelString',
		value: function _getKernelString() {
			var result = [];
			var names = this.subKernelOutputVariableNames;
			if (names !== null) {
				result.push('highp float kernelResult = 0.0');
				for (var i = 0; i < names.length; i++) {
					result.push('highp float ' + names[i] + ' = 0.0');
				}

				/* this is v2 prep
       result.push('highp float kernelResult = 0.0');
    result.push('layout(location = 0) out highp float fradData0 = 0.0');
    for (let i = 0; i < names.length; i++) {
    	result.push(
           `highp float ${ names[i] } = 0.0`,
    	  `layout(location = ${ i + 1 }) out highp float fragData${ i + 1 } = 0.0`
         );
    }*/
			} else {
				result.push('highp float kernelResult = 0.0');
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

	}, {
		key: '_getMainResultString',
		value: function _getMainResultString() {
			var names = this.subKernelOutputVariableNames;
			var result = [];

			if (this.floatOutput) {
				result.push('  index *= 4.0');
			}

			if (this.graphical) {
				result.push('  threadId = indexTo3D(index, uOutputDim)', '  kernel()', '  gl_FragColor = actualColor');
			} else if (this.floatOutput) {
				var channels = ['r', 'g', 'b', 'a'];

				for (var i = 0; i < channels.length; ++i) {
					result.push('  threadId = indexTo3D(index, uOutputDim)');
					result.push('  kernel()');

					if (names) {
						result.push('  gl_FragData[0].' + channels[i] + ' = kernelResult');

						for (var j = 0; j < names.length; ++j) {
							result.push('  gl_FragData[' + (j + 1) + '].' + channels[i] + ' = ' + names[j]);
						}
					} else {
						result.push('  gl_FragColor.' + channels[i] + ' = kernelResult');
					}

					if (i < channels.length - 1) {
						result.push('  index += 1.0');
					}
				}
			} else if (names !== null) {
				result.push('  threadId = indexTo3D(index, uOutputDim)');
				result.push('  kernel()');
				result.push('  gl_FragData[0] = encode32(kernelResult)');
				for (var _i2 = 0; _i2 < names.length; _i2++) {
					result.push('  gl_FragData[' + (_i2 + 1) + '] = encode32(' + names[_i2] + ')');
				}
			} else {
				result.push('  threadId = indexTo3D(index, uOutputDim)', '  kernel()', '  gl_FragColor = encode32(kernelResult)');
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
   * @memberOf WebGLKernel#
   * @function
   * @name _replaceArtifacts
   *
   * @param {String} src - Shader string
   * @param {Array} map - Variables/Constants associated with shader
   *
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
   * @memberOf WebGLKernel#
   * @function
   * @name _addKernels
   *
   * @desc Adds all the sub-kernels supplied with this Kernel instance.
   *
   */

	}, {
		key: '_addKernels',
		value: function _addKernels() {
			var _this2 = this;

			var builder = this.functionBuilder;
			var gl = this._webGl;

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
				loopMaxIterations: this.loopMaxIterations
			}, this.paramNames, this.paramTypes);

			if (this.subKernels !== null) {
				var drawBuffers = this.drawBuffers = gl.getExtension('WEBGL_draw_buffers');
				if (!drawBuffers) throw new Error('could not instantiate draw buffers extension');
				this.subKernelOutputVariableNames = [];
				this.subKernels.forEach(function (subKernel) {
					return _this2._addSubKernel(subKernel);
				});
			} else if (this.subKernelProperties !== null) {
				var _drawBuffers = this.drawBuffers = gl.getExtension('WEBGL_draw_buffers');
				if (!_drawBuffers) throw new Error('could not instantiate draw buffers extension');
				this.subKernelOutputVariableNames = [];
				Object.keys(this.subKernelProperties).forEach(function (property) {
					return _this2._addSubKernel(_this2.subKernelProperties[property]);
				});
			}
		}
	}, {
		key: '_addSubKernel',
		value: function _addSubKernel(subKernel) {
			this.functionBuilder.addSubKernel(subKernel, {
				prototypeOnly: false,
				constants: this.constants,
				output: this.output,
				debug: this.debug,
				loopMaxIterations: this.loopMaxIterations
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
   * @returns {String} Fragment Shader string
   *
   */

	}, {
		key: '_getFragShaderString',
		value: function _getFragShaderString(args) {
			if (this.compiledFragShaderString !== null) {
				return this.compiledFragShaderString;
			}
			return this.compiledFragShaderString = this._replaceArtifacts(fragShaderString, this._getFragShaderArtifactMap(args));
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
   * @returns {String} Vertical Shader string
   *
   */

	}, {
		key: '_getVertShaderString',
		value: function _getVertShaderString(args) {
			if (this.compiledVertShaderString !== null) {
				return this.compiledVertShaderString;
			}
			//TODO: webgl2 compile like frag shader
			return this.compiledVertShaderString = vertShaderString;
		}

		/**
   * @memberOf WebGLKernel#
   * @function
   * @name toString
   *
   * @desc Returns the *pre-compiled* Kernel as a JS Object String, that can be reused.
   *
   */

	}, {
		key: 'toString',
		value: function toString() {
			return kernelString(this);
		}
	}, {
		key: 'addFunction',
		value: function addFunction(fn) {
			this.functionBuilder.addFunction(null, fn);
		}
	}]);

	return WebGLKernel;
}(KernelBase);