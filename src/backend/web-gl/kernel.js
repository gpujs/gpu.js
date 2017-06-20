const fs = require('fs');
const KernelBase = require('../kernel-base');
const utils = require('../../utils');
const Texture = require('../../texture');
const fragShaderString = require('./shader-frag');
const vertShaderString = require('./shader-vert');

module.exports = class WebGLKernel extends KernelBase {
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
		this.subKernelOutputTextureNames = null;
		this.subKernelOutputVariableNames = null;
		this.paramTypes = null;
		if (!this._webGl) this._webGl = utils.initWebGl(this.canvas);
	}

	validateOptions() {
		const isReadPixel = utils.isFloatReadPixelsSupported;
		if (this.floatTextures === true && !utils.OES_texture_float) {
			throw 'Float textures are not supported on this browser';
		} else if (this.floatOutput === true && this.floatOutputForce !== true && !isReadPixel) {
			throw 'Float texture outputs are not supported on this browser';
		} else if (this.floatTextures === undefined && utils.OES_texture_float) {
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

	build() {
		this.validateOptions();
		this.setupParams(arguments);
		const paramNames = this.paramNames;
		const builder = this.functionBuilder;
		const texSize = this.texSize;
		const gl = this._webGl;
		this.canvas.width = texSize[0];
		this.canvas.height = texSize[1];
		gl.viewport(0, 0, texSize[0], texSize[1]);

		const threadDim = this.threadDim = utils.clone(this.dimensions);
		while (threadDim.length < 3) {
			threadDim.push(1);
		}

		builder.addKernel(this.fnString, this.paramNames, this.paramTypes);

		if (this.subKernels !== null) {
			const ext = gl.getExtension('WEBGL_draw_buffers');
			if (!ext) throw new Error('could not instantiate draw buffers extension');
			this.subKernelOutputTextures = [];
			for (let i = 0; i < this.subKernels.length; i++) {
				builder.addSubKernel(this.subKernels[i], this.paramTypes);
				const subKernelOutputVariableName = this.subKernelProperties[i].name + 'Result';
				this.subKernelOutputTextures.push(this.getSubKernelTexture(i));
				this.subKernelOutputVariableNames.push(subKernelOutputVariableName);
			}

		} else if (this.subKernelProperties !== null) {
			const ext = gl.getExtension('WEBGL_draw_buffers');
			if (!ext) throw new Error('could not instantiate draw buffers extension');
			this.subKernelOutputTextures = [];
			this.subKernelOutputVariableNames = [];
			this.subKernelOutputTextureNames = [];
			let i = 0;
			for (let p in this.subKernelProperties) {
				if (!this.subKernelProperties.hasOwnProperty(p)) continue;
				builder.addSubKernel(this.subKernelProperties[p], this.paramTypes);
				const subKernelOutputVariableName = this.subKernelProperties[p].name + 'Result';
				this.subKernelOutputTextureNames.push(p);
				this.subKernelOutputTextures.push(this.getSubKernelTexture(p));
				this.subKernelOutputVariableNames.push(subKernelOutputVariableName);
				i++;
			}
		}

		const vertShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertShader, vertShaderString);
		gl.compileShader(vertShader);

		const compiledFragShaderString = this._replaceArtifacts(fragShaderString, this._getFragShaderArtifactMap(arguments));
		const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragShader, compiledFragShaderString);
		gl.compileShader(fragShader);

		if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
			console.log(vertShaderString);
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
		this.framebuffer = this._webGl.createFramebuffer();
		this.framebuffer.width = this.texSize[0];
		this.framebuffer.height = this.texSize[1];
		return this;
	}

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
		const gl = this.webGl;
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
			let paramDim, paramSize;
			const argumentTexture = this.getArgumentTexture(texIndex);
			const argument = arguments[texIndex];
			const paramName = paramNames[texIndex];
			const paramType = paramTypes[texIndex];
			if (paramType === 'Array') {
				paramDim = utils.getDimensions(argument, true);
				paramSize = utils.dimToTexSize({
					floatTextures: this.floatTextures,
					floatOutput: this.floatOutput
				}, paramDim);

				gl.activeTexture(gl.TEXTURE0 + texIndex);
				gl.bindTexture(gl.TEXTURE_2D, argumentTexture);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

				let paramLength = paramSize[0] * paramSize[1];
				if (this.floatTextures) {
					paramLength *= 4;
				}

				const paramArray = new Float32Array(paramLength);
				if (this.copyData) {
					paramArray.set(utils.copyFlatten(argument));
				} else {
					paramArray.set(utils.flatten(argument));
				}

				let argBuffer;
				if (this.floatTextures) {
					argBuffer = new Float32Array(paramArray);
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, paramSize[0], paramSize[1], 0, gl.RGBA, gl.FLOAT, argBuffer);
				} else {
					argBuffer = new Uint8Array((new Float32Array(paramArray)).buffer);
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, paramSize[0], paramSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, argBuffer);
				}

				const paramLoc = this.getUniformLocation('user_' + paramName);
				const paramSizeLoc = this.getUniformLocation('user_' + paramName + 'Size');
				const paramDimLoc = this.getUniformLocation('user_' + paramName + 'Dim');

				if (!this.hardcodeConstants) {
					gl.uniform3fv(paramDimLoc, paramDim);
					gl.uniform2fv(paramSizeLoc, paramSize);
				}
				gl.uniform1i(paramLoc, texIndex);
			} else if (paramType === 'Number') {
				const argLoc = this.getUniformLocation('user_' + paramName);
				gl.uniform1f(argLoc, argument);
			} else if (paramType === 'Texture') {
				const inputTexture = argument;
				paramDim = utils.getDimensions(inputTexture.dimensions, true);
				paramSize = inputTexture.size;

				gl.activeTexture(gl.TEXTURE0 + texIndex);
				gl.bindTexture(gl.TEXTURE_2D, inputTexture.texture);

				const paramLoc = this.getUniformLocation('user_' + paramName);
				const paramSizeLoc = this.getUniformLocation('user_' + paramName + 'Size');
				const paramDimLoc = this.getUniformLocation('user_' + paramName + 'Dim');

				gl.uniform3fv(paramDimLoc, paramDim);
				gl.uniform2fv(paramSizeLoc, paramSize);
				gl.uniform1i(paramLoc, texIndex);
			} else {
				throw 'Input type not supported (WebGL): ' + argument;
			}
		}
		let outputTexture = this.getOutputTexture();
		gl.activeTexture(gl.TEXTURE0 + paramNames.length);
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
			const ext = gl.getExtension('WEBGL_draw_buffers');
			if (!ext) throw new Error('could not instantiate draw buffers extension');
			const extDrawBuffers = [gl.COLOR_ATTACHMENT0];
			for (let i = 0; i < this.subKernelOutputTextures.length; i++) {
				const subKernelOutputTexture = this.subKernelOutputTextures[i];
				extDrawBuffers.push(gl.COLOR_ATTACHMENT0 + i + 1);
				gl.activeTexture(gl.TEXTURE0 + paramNames.length + i + 1);
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
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i + 1, gl.TEXTURE_2D, this.subKernelOutputTextures[i], 0);
			}
			ext.drawBuffersWEBGL(extDrawBuffers);
		}

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		if (this.subKernelOutputTextures !== null) {
			if (this.subKernels !== null) {
				const output = [];
				output.result = this.renderOutput(outputTexture);
				for (let i = 0; i < this.subKernels; i++) {
					output.push(new Texture(this.subKernelOutputTextures[i], texSize, this.dimensions, this.webGl));
				}
				return output;
			} else if (this.subKernelProperties !== null) {
				const output = {
					result: this.renderOutput(outputTexture)
				};
				let i = 0;
				for (let p in this.subKernelProperties) {
					if (!this.subKernelProperties.hasOwnProperty(p)) continue;
					output[p] = new Texture(this.subKernelOutputTextures[i], texSize, this.dimensions, this.webGl);
					i++;
				}
				return output;
			}
		}

		return this.renderOutput(outputTexture);
	}

	renderOutput(outputTexture) {
		const texSize = this.texSize;
		const gl = this._webGl;
		const threadDim = this.threadDim;

		if (this.outputToTexture) {
			return new Texture(outputTexture, texSize, this.dimensions, this.webGl);
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

	getOutputTexture() {
		return this.getTextureCache('OUTPUT');
	}

	getArgumentTexture(name) {
		return this.getTextureCache(`ARGUMENT_${ name }`);
	}

	getSubKernelTexture(name) {
		return this.getTextureCache(`SUB_KERNEL_${ name }`);
	}

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

	setupParams(args) {
		const paramTypes = this.paramTypes = [];
		for (let i = 0; i < args.length; i++) {
			const param = args[i];
			const paramType = utils.getArgumentType(param);
			paramTypes.push(paramType);
		}
	}

	getUniformLocation(name) {
		let location = this.programUniformLocationCache[name];
		if (!location) {
			location = this.webGl.getUniformLocation(this.program, name);
			this.programUniformLocationCache[name] = location;
		}
		return location;
	}

	_getHeaderString() {
		return (
			this.subKernelOutputVariableNames !== null ?
			//webgl2 '#version 300 es\n' :
			'#extension GL_EXT_draw_buffers : require\n' :
			''
		);
	}

	_getLoopMaxString() {
		return (
			this.loopMaxIterations ?
			` ${ parseInt(this.loopMaxIterations) }.0;\n` :
			' 100.0;\n'
		);
	}

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

	_getTextureCoordinate() {
		const names = this.subKernelOutputVariableNames;
		if (names === null || names.length < 1) {
			return 'varying highp vec2 vTexCoord;\n';
		} else {
			return 'out highp vec2 vTexCoord;\n';
		}
	}

	_getDecode32EndiannessString() {
		return (
			this.endianness === 'LE' ?
			'' :
			'  rgba.rgba = rgba.abgr;\n'
		);
	}

	_getEncode32EndiannessString() {
		return (
			this.endianness === 'LE' ?
			'' :
			'  rgba.rgba = rgba.abgr;\n'
		);
	}

	_getGetWraparoundString() {
		return (
			this.wraparound ?
			'  xyz = mod(xyz, texDim);' :
			''
		);
	}

	_getGetTextureChannelString() {
		if (!this.floatTextures) return '';

		return this._linesToString([
			'  int channel = int(integerMod(index, 4.0))',
			'  index = float(int(index) / 4)'
		]);
	}

	_getGetTextureIndexString() {
		return (
			this.floatTextures ?
			'  index = float(int(index)/4);\n' :
			''
		);
	}

	_getGetResultString() {
		if (!this.floatTextures) return '  return decode32(texel);\n';
		return this._linesToString([
			'  if (channel == 0) return texel.r',
			'  if (channel == 1) return texel.g',
			'  if (channel == 2) return texel.b',
			'  if (channel == 3) return texel.a'
		]);
	}

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

	_linesToString(lines) {
		if (lines.length > 0) {
			return lines.join(';\n') + ';\n';
		} else {
			return '\n';
		}
	}

	_replaceArtifacts(src, map) {
		return src.replace(/[ ]*__([A-Z]+[0-9]*([_]?[A-Z])*)__;\n/g, (match, artifact) => {
			if (map.hasOwnProperty(artifact)) {
				return map[artifact];
			}
			throw `unhandled artifact ${ artifact }`;
		});
	}
};