const KernelBase = require('../kernel-base');
const utils = require('../../utils');
const Texture = require('../../texture');
const WebGLFunctionNode = require('./function-node');

module.exports = class WebGLKernel extends KernelBase {
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
		if (!this.webGl) this.webGl = utils.initWebGl(this.canvas);
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
		const paramNames = this.paramNames;
		const builder = this.functionBuilder;
		const endianness = this.endianness;
		const texSize = this.texSize;
		const gl = this.webGl;
		this.canvas.width = texSize[0];
		this.canvas.height = texSize[1];
		gl.viewport(0, 0, texSize[0], texSize[1]);

		const threadDim = this.threadDim = utils.clone(this.dimensions);
		while (threadDim.length < 3) {
			threadDim.push(1);
		}

		let constantsStr = '';
		if (this.constants) {
			for (let name in this.constants) {
				if (!this.constants.hasOwnProperty(name)) continue;
				let value = parseFloat(this.constants[name]);

				if (Number.isInteger(value)) {
					constantsStr += 'const float constants_' + name + '=' + parseInt(value) + '.0;\n';
				} else {
					constantsStr += 'const float constants_' + name + '=' + parseFloat(value) + ';\n';
				}
			}
		}

		let paramStr = '';

		const paramType = [];
		for (let i = 0; i < paramNames.length; i++) {
      const argument = arguments[i];
      const paramName = paramNames[i];
		  const argType = utils.getArgumentType(argument);
			paramType.push(argType);
			if (this.hardcodeConstants) {
				if (argType === 'Array' || argType === 'Texture') {
					const paramDim = utils.getDimensions(argument, true);
					const paramSize = utils.dimToTexSize(paramDim);

					paramStr += `
  uniform highp sampler2D user_${ paramName };
  highp vec2 user_${ paramName }Size = vec2(${ paramSize[0] }.0, ${ paramSize[1] }.0);
  highp vec3 user_${ paramName }Dim = vec3(${ paramDim[0] }.0, ${ paramDim[1]}.0, ${ paramDim[2] }.0);
`
				} else if (argType === 'Number' && Number.isInteger(argument)) {
					paramStr += 'highp float user_' + paramName + ' = ' + argument + '.0;\n';
				} else if (argType === 'Number') {
					paramStr += 'highp float user_' + paramName + ' = ' + argument + ';\n';
				}
			} else {
				if (argType === 'Array' || argType === 'Texture') {
					paramStr += `
  uniform highp sampler2D user_${ paramName };
  uniform highp vec2 user_${ paramName }Size;
  uniform highp vec3 user_${ paramName }Dim;
`;
				} else if (argType === 'Number') {
					paramStr += `uniform highp float user_${ paramName };\n`;
				}
			}
		}

		const kernelNode = new WebGLFunctionNode('kernel', this.fnString);
		kernelNode.setAddFunction(builder.addFunction.bind(builder));
		kernelNode.paramNames = paramNames;
		kernelNode.paramType = paramType;
		kernelNode.isRootKernel = true;
		builder.addFunctionNode(kernelNode);

		const vertShaderSrc = `
precision highp float;
precision highp int;
precision highp sampler2D;

attribute highp vec2 aPos;
attribute highp vec2 aTexCoord;

varying highp vec2 vTexCoord;

void main(void) {
  gl_Position = vec4(aPos, 0, 1);
  vTexCoord = aTexCoord;
}
`;

		const vertShader = gl.createShader(gl.VERTEX_SHADER);

		const fragShaderSrc = `
precision highp float;
precision highp int;
precision highp sampler2D;

const float LOOP_MAX = ${ (this.loopMaxIterations ? parseInt(this.loopMaxIterations) + '.0' : '100.0') };
#define EPSILON 0.0000001;

${ this.hardcodeConstants
  ? `highp vec3 uOutputDim = vec3(${ threadDim[0] },${ threadDim[1] }, ${ threadDim[2] });`
  : 'uniform highp vec3 uOutputDim;'
}
${ this.hardcodeConstants
  ? `highp vec2 uTexSize = vec2(${ texSize[0] }, ${ texSize[1] });`
  : 'uniform highp vec2 uTexSize;'
}

varying highp vec2 vTexCoord;

vec4 round(vec4 x) {
  return floor(x + 0.5);
}

highp float round(highp float x) {
  return floor(x + 0.5);
}

vec2 integerMod(vec2 x, float y) {
  vec2 res = floor(mod(x, y));
  return res * step(1.0 - floor(y), -res);
}

vec3 integerMod(vec3 x, float y) {
  vec3 res = floor(mod(x, y));
  return res * step(1.0 - floor(y), -res);
}

vec4 integerMod(vec4 x, vec4 y) {
  vec4 res = floor(mod(x, y));
  return res * step(1.0 - floor(y), -res);
}

highp float integerMod(highp float x, highp float y) {
  highp float res = floor(mod(x, y));
  return res * (res > floor(y) - 1.0 ? 0.0 : 1.0);
}

highp int integerMod(highp int x, highp int y) {
  return int(integerMod(float(x), float(y)));
}

// Here be dragons!
// DO NOT OPTIMIZE THIS CODE
// YOU WILL BREAK SOMETHING ON SOMEBODY\'S MACHINE
// LEAVE IT AS IT IS, LEST YOU WASTE YOUR OWN TIME
const vec2 MAGIC_VEC = vec2(1.0, -256.0);
const vec4 SCALE_FACTOR = vec4(1.0, 256.0, 65536.0, 0.0);
const vec4 SCALE_FACTOR_INV = vec4(1.0, 0.00390625, 0.0000152587890625, 0.0); // 1, 1/256, 1/65536
highp float decode32(highp vec4 rgba) {
  ${ endianness === 'LE'
    ? ''
    : 'rgba.rgba = rgba.abgr;'
  }
  rgba *= 255.0;
  vec2 gte128;
  gte128.x = rgba.b >= 128.0 ? 1.0 : 0.0;
  gte128.y = rgba.a >= 128.0 ? 1.0 : 0.0;
  float exponent = 2.0 * rgba.a - 127.0 + dot(gte128, MAGIC_VEC);
  float res = exp2(round(exponent));
  rgba.b = rgba.b - 128.0 * gte128.x;
  res = dot(rgba, SCALE_FACTOR) * exp2(round(exponent-23.0)) + res;
  res *= gte128.y * -2.0 + 1.0;
  return res;
}

highp vec4 encode32(highp float f) {
  highp float F = abs(f);
  highp float sign = f < 0.0 ? 1.0 : 0.0;
  highp float exponent = floor(log2(F));
  highp float mantissa = (exp2(-exponent) * F);
  // exponent += floor(log2(mantissa));
  vec4 rgba = vec4(F * exp2(23.0-exponent)) * SCALE_FACTOR_INV;
  rgba.rg = integerMod(rgba.rg, 256.0);
  rgba.b = integerMod(rgba.b, 128.0);
  rgba.a = exponent*0.5 + 63.5;
  rgba.ba += vec2(integerMod(exponent+127.0, 2.0), sign) * 128.0;
  rgba = floor(rgba);
  rgba *= 0.003921569; // 1/255
  ${ endianness === 'LE'
    ? ''
    : 'rgba.rgba = rgba.abgr;'
  }
  return rgba;
}
// Dragons end here

highp float index;
highp vec3 threadId;

highp vec3 indexTo3D(highp float idx, highp vec3 texDim) {
  highp float z = floor(idx / (texDim.x * texDim.y));
  idx -= z * texDim.x * texDim.y;
  highp float y = floor(idx / texDim.x);
  highp float x = integerMod(idx, texDim.x);
  return vec3(x, y, z);
}

highp float get(highp sampler2D tex, highp vec2 texSize, highp vec3 texDim, highp float z, highp float y, highp float x) {
  highp vec3 xyz = vec3(x, y, z);
  xyz = floor(xyz + 0.5);
  ${ this.wraparound
    ? 'xyz = mod(xyz, texDim);'
    : ''
  }
  highp float index = round(xyz.x + texDim.x * (xyz.y + texDim.y * xyz.z));
  ${ this.floatTextures
    ? `
  int channel = int(integerMod(index, 4.0));
  index = float(int(index)/4);
`
    : ''
  }
  highp float w = round(texSize.x);
  vec2 st = vec2(integerMod(index, w), float(int(index) / int(w))) + 0.5;
  ${ this.floatTextures
    ? 'index = float(int(index)/4);'
    : ''
  }
  highp vec4 texel = texture2D(tex, st / texSize);
  ${ this.floatTextures
    ? `
  if (channel == 0) return texel.r;
  if (channel == 1) return texel.g;
  if (channel == 2) return texel.b;
  if (channel == 3) return texel.a;
`   : 'return decode32(texel);'
  }
}

highp float get(highp sampler2D tex, highp vec2 texSize, highp vec3 texDim, highp float y, highp float x) {
  return get(tex, texSize, texDim, 0.0, y, x);
}

highp float get(highp sampler2D tex, highp vec2 texSize, highp vec3 texDim, highp float x) {
  return get(tex, texSize, texDim, 0.0, 0.0, x);
}

const bool outputToColor = ${ this.graphical ? 'true' : 'false' };
highp vec4 actualColor;
void color(float r, float g, float b, float a) {
  actualColor = vec4(r,g,b,a);
}

void color(float r, float g, float b) {
  color(r,g,b,1.0);
}

highp float kernelResult = 0.0;
${ paramStr }
${ constantsStr }
${ builder.getPrototypeString('kernel') }

void main(void) {
  index = floor(vTexCoord.s * float(uTexSize.x)) + floor(vTexCoord.t * float(uTexSize.y)) * uTexSize.x;
  ${ this.floatOutput ? 'index *= 4.0;' : '' }
  threadId = indexTo3D(index, uOutputDim);
  kernel();
  if (outputToColor == true) {
    gl_FragColor = actualColor;
  } else {
    ${ this.floatOutput
      ? `
    gl_FragColor.r = kernelResult;
    index += 1.0; threadId = indexTo3D(index, uOutputDim); kernel();
    gl_FragColor.g = kernelResult;
    index += 1.0; threadId = indexTo3D(index, uOutputDim); kernel();
    gl_FragColor.b = kernelResult;
    index += 1.0; threadId = indexTo3D(index, uOutputDim); kernel();
    gl_FragColor.a = kernelResult;`
      : `gl_FragColor = encode32(kernelResult);`
    }
  }
}`;
		const fragShader = gl.createShader(gl.FRAGMENT_SHADER);

		gl.shaderSource(vertShader, vertShaderSrc);
		gl.shaderSource(fragShader, fragShaderSrc);

		gl.compileShader(vertShader);
		gl.compileShader(fragShader);

		if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
			console.log(vertShaderSrc);
			console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(vertShader));
			throw 'Error compiling vertex shader';
		}
		if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
			console.log(fragShaderSrc);
			console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(fragShader));
			throw 'Error compiling fragment shader';
		}

		if (this.debug) {
			console.log('Options:');
			console.dir(this);
			console.log('GLSL Shader Output:');
			console.log(fragShaderSrc, vertShaderSrc);
		}

		const program = this.program = gl.createProgram();
		gl.attachShader(program, vertShader);
		gl.attachShader(program, fragShader);
		gl.linkProgram(program);
		this.framebuffer = gl.createFramebuffer();
	}

	run() {
		if (this.program === null) {
			this.build.apply(this, arguments);
		}
		const paramNames = this.paramNames;
		const textureCache = this.textureCache;
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

		for (let textureCount = 0; textureCount < paramNames.length; textureCount++) {
			let paramDim, paramSize, texture;
			const argument = arguments[textureCount];
			const paramName = paramNames[textureCount];
			const argType = utils.getArgumentType(argument);
			if (argType === 'Array') {
				paramDim = utils.getDimensions(argument, true);
				paramSize = utils.dimToTexSize(this, paramDim);

				if (textureCache[textureCount]) {
					texture = textureCache[textureCount];
				} else {
					texture = gl.createTexture();
					textureCache[textureCount] = texture;
				}

				gl.activeTexture(gl['TEXTURE' + textureCount]);
				gl.bindTexture(gl.TEXTURE_2D, texture);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

				let paramLength = paramSize[0] * paramSize[1];
				if (this.floatTextures) {
					paramLength *= 4;
				}

				const paramArray = new Float32Array(paramLength);
				paramArray.set(utils.flatten(argument));

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
				gl.uniform1i(paramLoc, textureCount);
			} else if (argType === 'Number') {
				const argLoc = this.getUniformLocation('user_' + paramName);
				gl.uniform1f(argLoc, argument);
			} else if (argType === 'Texture') {
				paramDim = utils.getDimensions(argument, true);
				paramSize = argument.size;
				texture = argument.texture;

				gl.activeTexture(gl['TEXTURE' + textureCount]);
				gl.bindTexture(gl.TEXTURE_2D, texture);

				const paramLoc = this.getUniformLocation('user_' + paramName);
				const paramSizeLoc = this.getUniformLocation('user_' + paramName + 'Size');
				const paramDimLoc = this.getUniformLocation('user_' + paramName + 'Dim');

				gl.uniform3fv(paramDimLoc, paramDim);
				gl.uniform2fv(paramSizeLoc, paramSize);
				gl.uniform1i(paramLoc, textureCount);
			} else {
				throw 'Input type not supported (WebGL): ' + argument;
			}
		}
		let textureCount = paramNames.length;
		let outputTexture = textureCache[textureCount];
		if (!outputTexture) {
			outputTexture = gl.createTexture();
			textureCache[textureCount] = outputTexture;
		}
		gl.activeTexture(gl['TEXTURE' + textureCount]);
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

		framebuffer.width = texSize[0];
		framebuffer.height = texSize[1];
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outputTexture, 0);

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		if (this.outputToTexture) {
			// Don't retain a handle on the output texture, we might need to render on the same texture later
			delete textureCache[textureCount];
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

	getUniformLocation(name) {
		let location = this.programUniformLocationCache[name];
		if (!location) {
			location = this.webGl.getUniformLocation(this.program, name);
			this.programUniformLocationCache[name] = location;
		}
		return location;
	}
};