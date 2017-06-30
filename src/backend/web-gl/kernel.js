const fs = require('fs');
const KernelBase = require('../kernel-base');
const utils = require('../../utils');
const Texture = require('../../texture');
const fragShaderString = require('./shader-frag');
const vertShaderString = require('./shader-vert');
const kernelString = require('./kernel-string');

///
/// Class: WebGLKernel
///
/// Kernel Implementation for WebGL. 
/// This builds the shaders and runs them on the GPU, 
/// the outputs the result back as float(enabled by default) and Texture.
///
/// Extends:
/// 	KernelBase
///
/// Parameters: 	
///		textureCache 				- {Object} 		webGl Texture cache
///		threadDim 					- {Object} 		The thread dimensions, x, y and z
///		programUniformLocationCache - {Object} 		Location of program variables in memory
///		framebuffer 				- {Object} 		Webgl frameBuffer
///		buffer 						- {Object} 		WebGL buffer
///		program 					- {Object} 		The webGl Program
///		functionBuilder 			- {Object} 		Function Builder instance bound to this Kernel
///		outputToTexture 			- {Boolean} 	Set output type to Texture, instead of float
///		endianness   				- {String} 		Endian information like Little-endian, Big-endian.
///		paramTypes 					- {Array} 		Types of parameters sent to the Kernel
///		argumentsLength 			- {Number} 		Number of parameters sent to the Kernel
///		compiledFragShaderString 	- {String} 		Compiled fragment shader string 
///		compiledVertShaderString 	- {String} 		Compiled Vertical shader string
///
module.exports = class WebGLKernel extends KernelBase {
	
	//
	// [Constructor]
	//
	
	///
	/// Function: WebGLKernel
	///
	/// Instantiates properties to the WebGl Kernel.
	///
	constructor(fnString, settings) {
		super(fnString, settings);
		this.textureCache = {};
		this.threadDim = {};
		this.programUniformLocationCache = {};
		this.framebuffer = null;

		this.buffer = null;
		this.program = null;
		this.functionBuilder = settings.functionBuilder;
		this.outputToTexture = settings.outputToTexture;
		this.endianness = utils.systemEndianness;
		this.subKernelOutputTextures = null;
		this.subKernelOutputVariableNames = null;
		this.paramTypes = null;
		this.argumentsLength = 0;
		this.ext = null;
		this.compiledFragShaderString = null;
		this.compiledVertShaderString = null;
		if (!this._webGl) this._webGl = utils.initWebGl(this.canvas);
	}

	///
	/// Function: validateOptions
	/// 
	/// Validate options related to Kernel, such as 
	/// floatOutputs and Textures, texSize, dimensions, 
	/// graphical output.
	///
	validateOptions() {
		const isReadPixel = utils.isFloatReadPixelsSupported;
		if (this.floatTextures === true && !utils.OES_texture_float) {
			throw 'Float textures are not supported on this browser';
		} else if (this.floatOutput === true && this.floatOutputForce !== true && !isReadPixel) {
			throw 'Float texture outputs are not supported on this browser';
		} else if (this.floatTextures === undefined && utils.OES_texture_float) {
			//NOTE: handle
			this.floatTextures = true;
			this.floatOutput = isReadPixel && !this.graphical;
		}

		if (!this.dimensions || this.dimensions.length === 0) {
			if (arguments.length !== 1) {
				throw 'Auto dimensions only supported for kernels with only one input';
			}

			const argType = utils.getArgumentType(arguments[0]);
			if (argType === 'Array') {
				this.dimensions = utils.getDimensions(argType);
			} else if (argType === 'Texture') {
				this.dimensions = arguments[0].dimensions;
			} else {
				throw 'Auto dimensions not supported for input type: ' + argType;
			}
		}

		this.texSize = utils.dimToTexSize({
			floatTextures: this.floatTextures,
			floatOutput: this.floatOutput
		}, this.dimensions, true);

		if (this.graphical) {
			if (this.dimensions.length !== 2) {
				throw 'Output must have 2 dimensions on graphical mode';
			}

			if (this.floatOutput) {
				throw 'Cannot use graphical mode and float output at the same time';
			}

			this.texSize = utils.clone(this.dimensions);
		} else if (this.floatOutput === undefined && utils.OES_texture_float) {
			this.floatOutput = true;
		}
	}

	///
	/// Function: build
	///
	/// Builds the Kernel, by compiling Fragment and Vertical Shaders,
	/// and instantiates the program.
	///

	build() {
		this.validateOptions();
		this.setupParams(arguments);
		const texSize = this.texSize;
		const gl = this._webGl;
		this._canvas.width = texSize[0];
		this._canvas.height = texSize[1];
		gl.viewport(0, 0, texSize[0], texSize[1]);

		const threadDim = this.threadDim = utils.clone(this.dimensions);
		while (threadDim.length < 3) {
			threadDim.push(1);
		}

		if (this.functionBuilder) this._addKernels();

		const compiledVertShaderString = this._getVertShaderString(arguments);
		const vertShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertShader, compiledVertShaderString);
		gl.compileShader(vertShader);

		const compiledFragShaderString = this._getFragShaderString(arguments);
		const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragShader, compiledFragShaderString);
		gl.compileShader(fragShader);

		if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
			console.log(compiledVertShaderString);
			console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(vertShader));
			throw 'Error compiling vertex shader';
		}
		if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
			console.log(compiledFragShaderString);
			console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(fragShader));
			throw 'Error compiling fragment shader';
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
		this.framebuffer.width = this.texSize[0];
		this.framebuffer.height = this.texSize[1];
		return this;
	}

	///
	/// Function: run
	///
	/// Run the kernel program, and send the output to renderOutput
	///
	/// This method calls a helper method *renderOutput* to return the result.
	/// 
	/// Returns:
	/// 	Result  {Object}     The final output of the program, as float, and as Textures for reuse.
	///
	///

	run() {
		if (this.program === null) {
			this.build.apply(this, arguments);
		}
		const paramNames = this.paramNames;
		const paramTypes = this.paramTypes;
		const texSize = this.texSize;
		const threadDim = this.threadDim;
		const framebuffer = this.framebuffer;
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
		const gl = this._webGl;
		gl.useProgram(this.program);

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

		if (!this.hardcodeConstants) {
			const uOutputDimLoc = this.getUniformLocation('uOutputDim');
			gl.uniform3fv(uOutputDimLoc, threadDim);
			const uTexSizeLoc = this.getUniformLocation('uTexSize');
			gl.uniform2fv(uTexSizeLoc, texSize);
		}

		for (let texIndex = 0; texIndex < paramNames.length; texIndex++) {
			this._addArgument(arguments[texIndex], paramTypes[texIndex], paramNames[texIndex]);
		}

		let outputTexture = this.getOutputTexture();
		gl.activeTexture(gl.TEXTURE0 + this.argumentsLength);
		gl.bindTexture(gl.TEXTURE_2D, outputTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		if (this.floatOutput) {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
		} else {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		}

		if (this.graphical) {
			gl.bindRenderbuffer(gl.RENDERBUFFER, null);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			return;
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outputTexture, 0);

		if (this.subKernelOutputTextures !== null) {
			const extDrawBuffers = [gl.COLOR_ATTACHMENT0];
			for (let i = 0; i < this.subKernelOutputTextures.length; i++) {
				const subKernelOutputTexture = this.subKernelOutputTextures[i];
				extDrawBuffers.push(gl.COLOR_ATTACHMENT0 + i + 1);
				gl.activeTexture(gl.TEXTURE0 + paramNames.length + i);
				gl.bindTexture(gl.TEXTURE_2D, subKernelOutputTexture);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				if (this.floatOutput) {
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
				} else {
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
				}
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i + 1, gl.TEXTURE_2D, subKernelOutputTexture, 0);
			}
			this.ext.drawBuffersWEBGL(extDrawBuffers);
		}

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		if (this.subKernelOutputTextures !== null) {
			if (this.subKernels !== null) {
				const output = [];
				output.result = this.renderOutput(outputTexture);
				for (let i = 0; i < this.subKernels.length; i++) {
					output.push(new Texture(this.subKernelOutputTextures[i], texSize, this.dimensions, this._webGl));
				}
				return output;
			} else if (this.subKernelProperties !== null) {
				const output = {
					result: this.renderOutput(outputTexture)
				};
				let i = 0;
				for (let p in this.subKernelProperties) {
					if (!this.subKernelProperties.hasOwnProperty(p)) continue;
					output[p] = new Texture(this.subKernelOutputTextures[i], texSize, this.dimensions, this._webGl);
					i++;
				}
				return output;
			}
		}

		return this.renderOutput(outputTexture);
	}

	///
	/// Function: renderOutput
	/// 
	/// 
	/// Helper function to return webGl function's output.
	/// Since the program runs on GPU, we need to get the 
	/// output of the program back to CPU and then return them.
	///
	/// *Note*: This should not be called directly.
	/// 
	/// Parameters:
	/// 	outputTexture 			Output Texture returned by webGl program
	///
	/// Returns:
	///		result {Object|Array}
	///
	///
	renderOutput(outputTexture) {
		const texSize = this.texSize;
		const gl = this._webGl;
		const threadDim = this.threadDim;

		if (this.outputToTexture) {
			return new Texture(outputTexture, texSize, this.dimensions, this._webGl);
		} else {
			let result;
			if (this.floatOutput) {
				result = new Float32Array(texSize[0] * texSize[1] * 4);
				gl.readPixels(0, 0, texSize[0], texSize[1], gl.RGBA, gl.FLOAT, result);
			} else {
				const bytes = new Uint8Array(texSize[0] * texSize[1] * 4);
				gl.readPixels(0, 0, texSize[0], texSize[1], gl.RGBA, gl.UNSIGNED_BYTE, bytes);
				result = Float32Array.prototype.slice.call(new Float32Array(bytes.buffer));
			}

			result = result.subarray(0, threadDim[0] * threadDim[1] * threadDim[2]);

			if (this.dimensions.length === 1) {
				return result;
			} else if (this.dimensions.length === 2) {
				return utils.splitArray(result, this.dimensions[0]);
			} else if (this.dimensions.length === 3) {
				const cube = utils.splitArray(result, this.dimensions[0] * this.dimensions[1]);
				return cube.map(function(x) {
					return utils.splitArray(x, this.dimensions[0]);
				});
			}
		}
	}

	///
	/// Function: getOutputTexture
	///	
	/// This uses *getTextureCache* to get the Texture Cache of the Output
	///
	/// Returns: 
	/// 	Ouptut Texture Cache
	///
	getOutputTexture() {
		return this.getTextureCache('OUTPUT');
	}

	///
	/// Function: getArgumentTexture
	///	
	/// This uses *getTextureCache** to get the Texture Cache of the argument supplied
	///	
	/// Parameters:
	///		name 	{String} 	Name of the argument 
	///
	/// Returns: 
	/// 	Texture cache for the supplied argument
	///
	getArgumentTexture(name) {
		return this.getTextureCache(`ARGUMENT_${ name }`);
	}

	///
	/// Function: getSubKernelTexture
	///	
	/// This uses *getTextureCache* to get the Texture Cache of the sub-kernel
	///
	/// Parameters:
	///		name 	{String} 	Name of the subKernel
	///
	/// Returns:
	///		Texture cache for the subKernel
	///
	getSubKernelTexture(name) {
		return this.getTextureCache(`SUB_KERNEL_${ name }`);
	}

	///
	/// Function: getTextureCache
	///
	/// Returns the Texture Cache of the supplied parameter (can be kernel, sub-kernel or argument)
	///
	/// Parameters:
	///		name 	{String} 	Name of the subkernel, argument, or kernel.
	///
	/// Returns:
	///		Texture cache
	///
	getTextureCache(name) {
		if (this.outputToTexture) {
			// Don't retain a handle on the output texture, we might need to render on the same texture later
			return this._webGl.createTexture();
		}
		if (this.textureCache.hasOwnProperty(name)) {
			return this.textureCache[name];
		}
		return this.textureCache[name] = this._webGl.createTexture();
	}

	///
	/// Function: setupParams
	///
	/// Setup the parameter types for the parameters 
	/// supplied to the Kernel function
	///
	/// Parameters:
	///		args 	{Array} 	The actual parameters sent to the Kernel
	///
	setupParams(args) {
		const paramTypes = this.paramTypes = [];
		for (let i = 0; i < args.length; i++) {
			const param = args[i];
			const paramType = utils.getArgumentType(param);
			paramTypes.push(paramType);
		}
	}

	///
	/// Function: getUniformLocation
	///
	/// Return WebGlUniformLocation for various variables 
	/// related to webGl program, such as user-defiend variables,
	/// as well as, dimension sizes, etc.
	///	
	getUniformLocation(name) {
		let location = this.programUniformLocationCache[name];
		if (!location) {
			location = this._webGl.getUniformLocation(this.program, name);
			this.programUniformLocationCache[name] = location;
		}
		return location;
	}

	///
	/// Function: _getFragShaderArtifactMap
	///
	/// Generate Shader artifacts for the kernel program.
	/// The final object contains HEADER, KERNEL, MAIN_RESULT, and others.
	///
	/// Parameters:
	///		args 	{Array} 	The actual parameters sent to the Kernel
	///
	/// Returns:
	///		{Object} An object containing the Shader Artifacts(CONSTANTS, HEADER, KERNEL, etc.)
	///
	_getFragShaderArtifactMap(args) {
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

	///
	/// Function: _addArgument 
	///
	/// Adds kernel parameters to the Argument Texture, 
	/// binding it to the webGl instance, etc.
	///
	/// Parameters: 
	///		value 		{Array|Texture|Number} 	The actual argument supplied to the kernel
	///		type 		{String} 				Type of the argument
	///		name 		{String} 				Name of the argument
	///
	_addArgument(value, type, name) {
		const gl = this._webGl;
		const argumentTexture = this.getArgumentTexture(name);
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
					if (this.floatTextures) {
						length *= 4;
					}

					const valuesFlat = new Float32Array(length);
					if (this.copyData) {
						valuesFlat.set(utils.copyFlatten(value));
					} else {
						valuesFlat.set(utils.flatten(value));
					}

					let buffer;
					if (this.floatTextures) {
						buffer = new Float32Array(valuesFlat);
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size[0], size[1], 0, gl.RGBA, gl.FLOAT, buffer);
					} else {
						buffer = new Uint8Array((new Float32Array(valuesFlat)).buffer);
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size[0], size[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
					}

					const loc = this.getUniformLocation('user_' + name);
					const locSize = this.getUniformLocation('user_' + name + 'Size');
					const dimLoc = this.getUniformLocation('user_' + name + 'Dim');

					if (!this.hardcodeConstants) {
						gl.uniform3fv(dimLoc, dim);
						gl.uniform2fv(locSize, size);
					}
					gl.uniform1i(loc, this.argumentsLength);
					break;
				}
			case 'Number':
				{
					const loc = this.getUniformLocation('user_' + name);
					gl.uniform1f(loc, value);
					break;
				}
			case 'Texture':
				{
					const inputTexture = value;
					const dim = utils.getDimensions(inputTexture.dimensions, true);
					const size = inputTexture.size;

					gl.activeTexture(gl.TEXTURE0 + this.argumentsLength);
					gl.bindTexture(gl.TEXTURE_2D, inputTexture.texture);

					const loc = this.getUniformLocation('user_' + name);
					const locSize = this.getUniformLocation('user_' + name + 'Size');
					const dimLoc = this.getUniformLocation('user_' + name + 'Dim');

					gl.uniform3fv(dimLoc, dim);
					gl.uniform2fv(locSize, size);
					gl.uniform1i(loc, this.argumentsLength);
					break;
				}
			default:
				throw 'Input type not supported (WebGL): ' + value;
		}
		this.argumentsLength++;
	}

	///
	/// Function: _getHeaderString
	///
	/// Get the header string for the program.
	/// This returns an empty string if no sub-kernels are defined.
	///
	/// Returns:
	///		result {String}
	///
	_getHeaderString() {
		return (
			this.subKernels !== null || this.subKernelProperties !== null ?
			//webgl2 '#version 300 es\n' :
			'#extension GL_EXT_draw_buffers : require\n' :
			''
		);
	}

	///
	/// Function: _getLoopMaxString
	///
	/// Get the maximum loop size String.
	///
	/// Returns:
	///		result {String}
	///
	_getLoopMaxString() {
		return (
			this.loopMaxIterations ?
			` ${ parseInt(this.loopMaxIterations) }.0;\n` :
			' 100.0;\n'
		);
	}

	///
	/// Function: _getConstantsString
	///
	/// Generate transpiled glsl Strings for constant parameters sent to a kernel
	///
	/// They can be defined by *hardcodeConstants*
	///
	/// Returns:
	///		result {String}
	///
	_getConstantsString() {
		const result = [];
		const threadDim = this.threadDim;
		const texSize = this.texSize;
		if (this.hardcodeConstants) {
			result.push(
				`highp vec3 uOutputDim = vec3(${ threadDim[0] },${ threadDim[1] }, ${ threadDim[2] })`,
				`highp vec2 uTexSize = vec2(${ texSize[0] }, ${ texSize[1] })`
			);
		} else {
			result.push(
				'uniform highp vec3 uOutputDim',
				'uniform highp vec2 uTexSize'
			);
		}

		return this._linesToString(result);
	}

	///
	/// Function: _getTextureCoordinate
	///
	/// Get texture coordinate string for the program
	///
	/// Returns:
	///		result {String}
	///
	_getTextureCoordinate() {
		const names = this.subKernelOutputVariableNames;
		if (names === null || names.length < 1) {
			return 'varying highp vec2 vTexCoord;\n';
		} else {
			return 'out highp vec2 vTexCoord;\n';
		}
	}

	///
	/// Function: _getDecode32EndiannessString
	///
	/// Get Decode32 endianness string for little-endian and big-endian
	///
	/// Returns:
	///		result {String}
	///
	_getDecode32EndiannessString() {
		return (
			this.endianness === 'LE' ?
			'' :
			'  rgba.rgba = rgba.abgr;\n'
		);
	}

	///
	/// Function: _getEncode32EndiannessString
	///
	/// Get Encode32 endianness string for little-endian and big-endian
	///
	/// Returns:
	///		result {String}
	///
	_getEncode32EndiannessString() {
		return (
			this.endianness === 'LE' ?
			'' :
			'  rgba.rgba = rgba.abgr;\n'
		);
	}

	///
	/// Function: _getGetWraparoundString
	///
	_getGetWraparoundString() {
		return (
			this.wraparound ?
			'  xyz = mod(xyz, texDim);\n' :
			''
		);
	}

	///
	/// Function: _getGetTextureChannelString
	///
	_getGetTextureChannelString() {
		if (!this.floatTextures) return '';

		return this._linesToString([
			'  int channel = int(integerMod(index, 4.0))',
			'  index = float(int(index) / 4)'
		]);
	}

	///
	/// Function: _getGetTextureIndexString
	///
	/// Get generic texture index string, if floatTextures flag is true.
	///
	/// >		'  index = float(int(index)/4);\n'
	///
	_getGetTextureIndexString() {
		return (
			this.floatTextures ?
			'  index = float(int(index)/4);\n' :
			''
		);
	}

	///
	/// Function: _getGetResultString
	///
	_getGetResultString() {
		if (!this.floatTextures) return '  return decode32(texel);\n';
		return this._linesToString([
			'  if (channel == 0) return texel.r',
			'  if (channel == 1) return texel.g',
			'  if (channel == 2) return texel.b',
			'  if (channel == 3) return texel.a'
		]);
	}

	///
	/// Function: _getMainParamsString
	///
	/// Generate transpiled glsl Strings for user-defined parameters sent to a kernel
	///
	/// Parameters:
	///		args 	{Array} 	The actual parameters sent to the Kernel
	///
	/// Returns:
	///		result {String}
	///
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
						`highp vec2 user_${ paramName }Size = vec2(${ paramSize[0] }.0, ${ paramSize[1] }.0)`,
						`highp vec3 user_${ paramName }Dim = vec3(${ paramDim[0] }.0, ${ paramDim[1]}.0, ${ paramDim[2] }.0)`
					);
				} else if (paramType === 'Number' && Number.isInteger(param)) {
					result.push(`highp float user_${ paramName } = ${ param }.0`);
				} else if (paramType === 'Number') {
					result.push(`highp float user_${ paramName } = ${ param }`);
				}
			} else {
				if (paramType === 'Array' || paramType === 'Texture') {
					result.push(
						`uniform highp sampler2D user_${ paramName }`,
						`uniform highp vec2 user_${ paramName }Size`,
						`uniform highp vec3 user_${ paramName }Dim`
					);
				} else if (paramType === 'Number') {
					result.push(`uniform highp float user_${ paramName }`);
				}
			}
		}
		return this._linesToString(result);
	}

	///
	/// Function: _getMainConstantsString
	///
	/// Returns:
	///		Texture cache
	///
	_getMainConstantsString() {
		const result = [];
		if (this.constants) {
			for (let name in this.constants) {
				if (!this.constants.hasOwnProperty(name)) continue;
				let value = parseFloat(this.constants[name]);

				if (Number.isInteger(value)) {
					result.push('const float constants_' + name + ' = ' + parseInt(value) + '.0');
				} else {
					result.push('const float constants_' + name + ' = ' + parseFloat(value));
				}
			}
		}
		return this._linesToString(result);
	}

	///
	/// Function: _getKernelString
	///
	/// Get Kernel program string (in *glsl*) for a kernel. 
	///
	/// Returns:
	///		result {String}
	///
	_getKernelString() {
		const result = [];
		const names = this.subKernelOutputVariableNames;
		if (names !== null) {
			result.push('highp float kernelResult = 0.0');
			for (let i = 0; i < names.length; i++) {
				result.push(
					`highp float ${ names[i] } = 0.0`,
				);
			}

			/** this is v2 prep
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

	///
	/// Function: _getMainResultString
	///
	///	Get main result string with checks for floatOutput, graphical, subKernelsOutputs, etc.
	///
	/// Returns:
	///		result {String}
	///
	_getMainResultString() {
		const names = this.subKernelOutputVariableNames;
		const result = [];
		if (this.floatOutput) {
			result.push('  index *= 4.0');
		}

		if (this.graphical) {
			result.push(
				'  threadId = indexTo3D(index, uOutputDim)',
				'  kernel()',
				'  gl_FragColor = actualColor'
			);
		} else if (this.floatOutput) {
			result.push(
				'  threadId = indexTo3D(index, uOutputDim)',
				'  kernel()',
				'  gl_FragColor.r = kernelResult',
				'  index += 1.0',
				'  threadId = indexTo3D(index, uOutputDim)',
				'  kernel()',
				'  gl_FragColor.g = kernelResult',
				'  index += 1.0',
				'  threadId = indexTo3D(index, uOutputDim)',
				'  kernel()',
				'  gl_FragColor.b = kernelResult',
				'  index += 1.0',
				'  threadId = indexTo3D(index, uOutputDim)',
				'  kernel()',
				'  gl_FragColor.a = kernelResult'
			);
		} else if (names !== null) {
			result.push('  threadId = indexTo3D(index, uOutputDim)');
			result.push('  kernel()');
			result.push('  gl_FragData[0] = encode32(kernelResult)');
			for (let i = 0; i < names.length; i++) {
				result.push(`  gl_FragData[${ i + 1 }] = encode32(${ names[i] })`);
			}
			/** this is v2 prep
       * result.push('  kernel()');
			result.push('  fragData0 = encode32(kernelResult)');
			for (let i = 0; i < names.length; i++) {
				result.push(`  fragData${ i + 1 } = encode32(${ names[i] })`);
			}*/
		} else {
			result.push(
				'  threadId = indexTo3D(index, uOutputDim)',
				'  kernel()',
				'  gl_FragColor = encode32(kernelResult)'
			);
		}

		return this._linesToString(result);
	}

	///
	/// Function: _linesToString
	///
	/// Parameters:
	///		lines 	{Array} 	An Array of strings
	///
	/// Returns:
	///		Single combined String, seperated by *\n*
	///
	_linesToString(lines) {
		if (lines.length > 0) {
			return lines.join(';\n') + ';\n';
		} else {
			return '\n';
		}
	}

	///
	/// Function: _replaceArtifacts
	///
	/// Parameters:
	///		src 	{String} 	Name of the subkernel, argument, or kernel.
	///		map 	{String} 	Name of the subkernel, argument, or kernel.
	///
	/// Returns:
	///		Texture cache
	///
	_replaceArtifacts(src, map) {
		return src.replace(/[ ]*__([A-Z]+[0-9]*([_]?[A-Z])*)__;\n/g, (match, artifact) => {
			if (map.hasOwnProperty(artifact)) {
				return map[artifact];
			}
			throw `unhandled artifact ${ artifact }`;
		});
	}

	///
	/// Function: _addKernels
	///
	/// Adds all the sub-kernels supplied with this Kernel instance.
	///
	_addKernels() {
		const builder = this.functionBuilder;
		const gl = this._webGl;
		builder.addKernel(this.fnString, {
			prototypeOnly: false,
			constants: this.constants,
			debug: this.debug,
			loopMaxIterations: this.loopMaxIterations
		}, this.paramNames, this.paramTypes);

		if (this.subKernels !== null) {
			const ext = this.ext = gl.getExtension('WEBGL_draw_buffers');
			if (!ext) throw new Error('could not instantiate draw buffers extension');
			this.subKernelOutputTextures = [];
			this.subKernelOutputVariableNames = [];
			for (let i = 0; i < this.subKernels.length; i++) {
				const subKernel = this.subKernels[i];
				builder.addSubKernel(subKernel, {
					prototypeOnly: false,
					constants: this.constants,
					debug: this.debug,
					loopMaxIterations: this.loopMaxIterations
				});
				this.subKernelOutputTextures.push(this.getSubKernelTexture(i));
				this.subKernelOutputVariableNames.push(subKernel.name + 'Result');
			}

		} else if (this.subKernelProperties !== null) {
			const ext = this.ext = gl.getExtension('WEBGL_draw_buffers');
			if (!ext) throw new Error('could not instantiate draw buffers extension');
			this.subKernelOutputTextures = [];
			this.subKernelOutputVariableNames = [];
			let i = 0;
			for (let p in this.subKernelProperties) {
				if (!this.subKernelProperties.hasOwnProperty(p)) continue;
				const subKernel = this.subKernelProperties[p];
				builder.addSubKernel(subKernel, {
					prototypeOnly: false,
					constants: this.constants,
					debug: this.debug,
					loopMaxIterations: this.loopMaxIterations
				});
				this.subKernelOutputTextures.push(this.getSubKernelTexture(p));
				this.subKernelOutputVariableNames.push(subKernel.name + 'Result');
				i++;
			}
		}
	}

	///
	/// Function: _getFragShaderString
	///
	/// Get the fragment shader String.
	/// If the String hasn't been compiled yet, 
	///	then this method compiles it as well
	///
	/// Parameters:
	///		args 	{Array} 	The actual parameters sent to the Kernel
	///
	/// Returns:
	///		{String} Fragment Shader string
	///
	_getFragShaderString(args) {
		if (this.compiledFragShaderString !== null) {
			return this.compiledFragShaderString;
		}
		return this.compiledFragShaderString = this._replaceArtifacts(fragShaderString, this._getFragShaderArtifactMap(args));
	}

	///
	/// Function: _getVertShaderString
	///
	/// Get the vertical shader String
	///
	/// Parameters:
	///		args 	{Array} 	The actual parameters sent to the Kernel
	///
	/// Returns:
	///		{String} Vertical Shader string
	///
	_getVertShaderString(args) {
		if (this.compiledVertShaderString !== null) {
			return this.compiledVertShaderString;
		}
		//TODO: webgl2 compile like frag shader
		return this.compiledVertShaderString = vertShaderString;
	}

	///
	/// Function: toString
	///
	/// Returns the *pre-compiled* Kernel as a JS Object String, that can be reused.
	///
	toString() {
		return kernelString(this);
	}
};