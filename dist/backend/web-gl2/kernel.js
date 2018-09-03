'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var WebGLKernel = require('../web-gl/kernel');
var utils = require('../../core/utils');
var Texture = require('../../core/texture');
var fragShaderString = require('./shader-frag');
var vertShaderString = require('./shader-vert');

module.exports = function (_WebGLKernel) {
	_inherits(WebGL2Kernel, _WebGLKernel);

	function WebGL2Kernel() {
		_classCallCheck(this, WebGL2Kernel);

		return _possibleConstructorReturn(this, (WebGL2Kernel.__proto__ || Object.getPrototypeOf(WebGL2Kernel)).apply(this, arguments));
	}

	_createClass(WebGL2Kernel, [{
		key: 'initWebGl',
		value: function initWebGl() {
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

	}, {
		key: 'validateOptions',
		value: function validateOptions() {
			var isFloatReadPixel = utils.isFloatReadPixelsSupportedWebGL2();
			if (this.floatOutput === true && this.floatOutputForce !== true && !isFloatReadPixel) {
				throw new Error('Float texture outputs are not supported on this browser');
			} else if (this.floatTextures === undefined) {
				this.floatTextures = true;
				this.floatOutput = isFloatReadPixel;
			}

			var hasIntegerDivisionBug = utils.hasIntegerDivisionAccuracyBug();
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
				this.setUniform3iv('uOutputDim', new Int32Array(this.threadDim));
				this.setUniform2iv('uTexSize', texSize);
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
				gl.drawBuffers(this.drawBuffersMap);
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
   * @memberOf WebGL2Kernel#
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
   * @memberOf WebGL2Kernel#
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
			gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.paramNames.length);
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
				gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.paramNames.length + i);
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
						gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.argumentsLength);
						gl.bindTexture(gl.TEXTURE_2D, argumentTexture);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

						var length = size[0] * size[1];

						var _formatArrayTransfer = this._formatArrayTransfer(value, length),
						    valuesFlat = _formatArrayTransfer.valuesFlat,
						    bitRatio = _formatArrayTransfer.bitRatio;

						var buffer = void 0;
						if (this.floatTextures) {
							gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size[0], size[1], 0, gl.RGBA, gl.FLOAT, valuesFlat);
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

						var _formatArrayTransfer2 = this._formatArrayTransfer(value.value, _length),
						    _valuesFlat = _formatArrayTransfer2.valuesFlat,
						    _bitRatio = _formatArrayTransfer2.bitRatio;

						if (this.floatTextures) {
							gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, _size[0], _size[1], 0, gl.RGBA, gl.FLOAT, inputArray);
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
				case 'HTMLImageArray':
					{
						var inputImages = value;
						var _dim3 = [inputImages[0].width, inputImages[0].height, inputImages.length];
						var _size3 = [inputImages[0].width, inputImages[0].height];

						gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.argumentsLength);
						gl.bindTexture(gl.TEXTURE_2D_ARRAY, argumentTexture);
						gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
						gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
						// Upload the images into the texture.
						var _mipLevel = 0; // the largest mip
						var _internalFormat = gl.RGBA; // format we want in the texture
						var width = inputImages[0].width;
						var height = inputImages[0].height;
						var textureDepth = inputImages.length;
						var border = 0;
						var _srcFormat = gl.RGBA; // format of data we are supplying
						var _srcType = gl.UNSIGNED_BYTE; // type of data we are supplying
						gl.texImage3D(gl.TEXTURE_2D_ARRAY, _mipLevel, _internalFormat, width, height, textureDepth, border, _srcFormat, _srcType, null);
						for (var i = 0; i < inputImages.length; i++) {
							var xOffset = 0;
							var yOffset = 0;
							var imageDepth = 1;
							gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, _mipLevel, xOffset, yOffset, i, inputImages[i].width, inputImages[i].height, imageDepth, _srcFormat, _srcType, inputImages[i]);
						}
						this.setUniform3iv('user_' + name + 'Dim', _dim3);
						this.setUniform2iv('user_' + name + 'Size', _size3);
						this.setUniform1i('user_' + name, this.argumentsLength);
						break;
					}
				case 'Texture':
					{
						var inputTexture = value;
						var _dim4 = inputTexture.dimensions;
						var _size4 = inputTexture.size;

						gl.activeTexture(gl.TEXTURE0 + this.constantsLength + this.argumentsLength);
						gl.bindTexture(gl.TEXTURE_2D, inputTexture.texture);

						this.setUniform3iv('user_' + name + 'Dim', _dim4);
						this.setUniform2iv('user_' + name + 'Size', _size4);
						this.setUniform1i('user_' + name + 'BitRatio', 1); // always float32
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
					var value = this.constants[name];
					var type = utils.getArgumentType(value);
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
							result.push('uniform highp sampler2D constants_' + name, 'uniform highp ivec2 constants_' + name + 'Size', 'uniform highp ivec3 constants_' + name + 'Dim', 'uniform highp int constants_' + name + 'BitRatio');
							break;
						case 'HTMLImageArray':
							result.push('uniform highp sampler2DArray constants_' + name, 'uniform highp ivec2 constants_' + name + 'Size', 'uniform highp ivec3 constants_' + name + 'Dim', 'uniform highp int constants_' + name + 'BitRatio');
							break;

						default:
							throw new Error('Unsupported constant ' + name + ' type ' + type);
					}
				}
			}
			return this._linesToString(result);
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

	}, {
		key: '_addConstant',
		value: function _addConstant(value, type, name) {
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
						gl.activeTexture(gl.TEXTURE0 + this.constantsLength);
						gl.bindTexture(gl.TEXTURE_2D, argumentTexture);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

						var length = size[0] * size[1];

						var _formatArrayTransfer3 = this._formatArrayTransfer(value, length),
						    valuesFlat = _formatArrayTransfer3.valuesFlat,
						    bitRatio = _formatArrayTransfer3.bitRatio;

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
				case 'Integer':
				case 'Float':
					{
						this.setUniform1f('constants_' + name, value);
						break;
					}
				case 'Input':
					{
						var input = value;
						var _dim5 = input.size;
						var _size5 = utils.dimToTexSize({
							floatTextures: this.floatTextures,
							floatOutput: this.floatOutput
						}, _dim5);
						gl.activeTexture(gl.TEXTURE0 + this.constantsLength);
						gl.bindTexture(gl.TEXTURE_2D, argumentTexture);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

						var _length2 = _size5[0] * _size5[1];

						var _formatArrayTransfer4 = this._formatArrayTransfer(value.value, _length2),
						    _valuesFlat2 = _formatArrayTransfer4.valuesFlat,
						    _bitRatio2 = _formatArrayTransfer4.bitRatio;

						if (this.floatTextures) {
							gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, _size5[0], _size5[1], 0, gl.RGBA, gl.FLOAT, inputArray);
						} else {
							var _buffer2 = new Uint8Array(_valuesFlat2.buffer);
							gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, _size5[0] / _bitRatio2, _size5[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, _buffer2);
						}

						if (!this.hardcodeConstants) {
							this.setUniform3iv('constants_' + name + 'Dim', _dim5);
							this.setUniform2iv('constants_' + name + 'Size', _size5);
						}
						this.setUniform1i('constants_' + name + 'BitRatio', _bitRatio2);
						this.setUniform1i('constants_' + name, this.constantsLength);
						break;
					}
				case 'HTMLImage':
					{
						var inputImage = value;
						var _dim6 = [inputImage.width, inputImage.height, 1];
						var _size6 = [inputImage.width, inputImage.height];

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
						this.setUniform3iv('constants_' + name + 'Dim', _dim6);
						this.setUniform2iv('constants_' + name + 'Size', _size6);
						this.setUniform1i('constants_' + name, this.constantsLength);
						break;
					}
				case 'HTMLImageArray':
					{
						var inputImages = value;
						var _dim7 = [inputImages[0].width, inputImages[0].height, inputImages.length];
						var _size7 = [inputImages[0].width, inputImages[0].height];

						gl.activeTexture(gl.TEXTURE0 + this.constantsLength);
						gl.bindTexture(gl.TEXTURE_2D_ARRAY, argumentTexture);
						gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
						gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
						// Upload the images into the texture.
						var _mipLevel2 = 0; // the largest mip
						var _internalFormat2 = gl.RGBA; // format we want in the texture
						var width = inputImages[0].width;
						var height = inputImages[0].height;
						var textureDepth = inputImages.length;
						var border = 0;
						var _srcFormat2 = gl.RGBA; // format of data we are supplying
						var _srcType2 = gl.UNSIGNED_BYTE; // type of data we are supplying
						gl.texImage3D(gl.TEXTURE_2D_ARRAY, _mipLevel2, _internalFormat2, width, height, textureDepth, border, _srcFormat2, _srcType2, null);
						for (var i = 0; i < inputImages.length; i++) {
							var xOffset = 0;
							var yOffset = 0;
							var imageDepth = 1;
							gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, _mipLevel2, xOffset, yOffset, i, inputImages[i].width, inputImages[i].height, imageDepth, _srcFormat2, _srcType2, inputImages[i]);
						}
						this.setUniform3iv('constants_' + name + 'Dim', _dim7);
						this.setUniform2iv('constants_' + name + 'Size', _size7);
						this.setUniform1i('constants_' + name, this.constantsLength);
						break;
					}
				case 'Texture':
					{
						var inputTexture = value;
						var _dim8 = inputTexture.dimensions;
						var _size8 = inputTexture.size;

						gl.activeTexture(gl.TEXTURE0 + this.constantsLength);
						gl.bindTexture(gl.TEXTURE_2D, inputTexture.texture);

						this.setUniform3iv('constants_' + name + 'Dim', _dim8);
						this.setUniform2iv('constants_' + name + 'Size', _size8);
						this.setUniform1i('constants_' + name + 'BitRatio', 1); // aways float32
						this.setUniform1i('constants_' + name, this.constantsLength);
						break;
					}
				default:
					throw new Error('Input type not supported (WebGL): ' + value);
			}
		}

		/**
   * @memberOf WebGL2Kernel#
   * @function
   * @name _getGetResultString
   *
   */

	}, {
		key: '_getGetResultString',
		value: function _getGetResultString() {
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

	}, {
		key: '_getHeaderString',
		value: function _getHeaderString() {
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

	}, {
		key: '_getTextureCoordinate',
		value: function _getTextureCoordinate() {
			var names = this.subKernelOutputVariableNames;
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

						result.push('uniform highp sampler2D user_' + paramName, 'highp ivec2 user_' + paramName + 'Size = ivec2(' + paramSize[0] + ', ' + paramSize[1] + ')', 'highp ivec3 user_' + paramName + 'Dim = ivec3(' + paramDim[0] + ', ' + paramDim[1] + ', ' + paramDim[2] + ')', 'uniform highp int user_' + paramName + 'BitRatio');

						if (paramType === 'Array') {
							result.push('uniform highp int user_' + paramName + 'BitRatio');
						}
					} else if (paramType === 'Integer') {
						result.push('highp float user_' + paramName + ' = ' + param + '.0');
					} else if (paramType === 'Float') {
						result.push('highp float user_' + paramName + ' = ' + param);
					}
				} else {
					if (paramType === 'Array' || paramType === 'Texture' || paramType === 'Input' || paramType === 'HTMLImage') {
						result.push('uniform highp sampler2D user_' + paramName, 'uniform highp ivec2 user_' + paramName + 'Size', 'uniform highp ivec3 user_' + paramName + 'Dim');
						if (paramType !== 'HTMLImage') {
							result.push('uniform highp int user_' + paramName + 'BitRatio');
						}
					} else if (paramType === 'HTMLImageArray') {
						result.push('uniform highp sampler2DArray user_' + paramName, 'uniform highp ivec2 user_' + paramName + 'Size', 'uniform highp ivec3 user_' + paramName + 'Dim');
					} else if (paramType === 'Integer' || paramType === 'Float') {
						result.push('uniform float user_' + paramName);
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

	}, {
		key: '_getKernelString',
		value: function _getKernelString() {
			var result = [];
			var names = this.subKernelOutputVariableNames;
			if (names !== null) {
				result.push('float kernelResult = 0.0');
				result.push('layout(location = 0) out vec4 data0');
				for (var i = 0; i < names.length; i++) {
					result.push('float ' + names[i] + ' = 0.0', 'layout(location = ' + (i + 1) + ') out vec4 data' + (i + 1));
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

	}, {
		key: '_getMainResultString',
		value: function _getMainResultString() {
			var names = this.subKernelOutputVariableNames;
			var result = [];

			if (this.floatOutput) {
				result.push('  index *= 4');
			}

			if (this.graphical) {
				result.push('  threadId = indexTo3D(index, uOutputDim)', '  kernel()', '  data0 = actualColor');
			} else if (this.floatOutput) {
				var channels = ['r', 'g', 'b', 'a'];

				for (var i = 0; i < channels.length; ++i) {
					result.push('  threadId = indexTo3D(index, uOutputDim)');
					result.push('  kernel()');

					if (names) {
						result.push('  data0.' + channels[i] + ' = kernelResult');

						for (var j = 0; j < names.length; ++j) {
							result.push('  data' + (j + 1) + '.' + channels[i] + ' = ' + names[j]);
						}
					} else {
						result.push('  data0.' + channels[i] + ' = kernelResult');
					}

					if (i < channels.length - 1) {
						result.push('  index += 1');
					}
				}
			} else if (names !== null) {
				result.push('  threadId = indexTo3D(index, uOutputDim)');
				result.push('  kernel()');
				result.push('  data0 = encode32(kernelResult)');
				for (var _i2 = 0; _i2 < names.length; _i2++) {
					result.push('  data' + (_i2 + 1) + ' = encode32(' + names[_i2] + ')');
				}
			} else {
				result.push('  threadId = indexTo3D(index, uOutputDim)', '  kernel()', '  data0 = encode32(kernelResult)');
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
				loopMaxIterations: this.loopMaxIterations,
				paramNames: this.paramNames,
				paramTypes: this.paramTypes,
				constantTypes: this.constantTypes,
				fixIntegerDivisionAccuracy: this.fixIntegerDivisionAccuracy
			});

			if (this.subKernels !== null) {
				this.subKernelOutputTextures = [];
				this.subKernelOutputVariableNames = [];
				this.subKernels.forEach(function (subKernel) {
					return _this2._addSubKernel(subKernel);
				});
			} else if (this.subKernelProperties !== null) {
				this.subKernelOutputTextures = [];
				this.subKernelOutputVariableNames = [];
				Object.keys(this.subKernelProperties).forEach(function (property) {
					return _this2._addSubKernel(_this2.subKernelProperties[property]);
				});
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

	}, {
		key: '_getFragShaderString',
		value: function _getFragShaderString(args) {
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

	}, {
		key: '_getVertShaderString',
		value: function _getVertShaderString(args) {
			if (this.compiledVertShaderString !== null) {
				return this.compiledVertShaderString;
			}
			return this.compiledVertShaderString = this.constructor.vertShaderString;
		}
	}], [{
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

	return WebGL2Kernel;
}(WebGLKernel);