const GPUCore = require('gpu-core');
const GPUUtils = require('../gpu-utils');
const GPUTexture = require('../gpu-texture');

export default class ModeGPU extends GPUCore {
  constructor(opt) {
    this.programUniformLocationCache = {};
    this.programCacheKey = this.getProgramCacheKey(arguments, opt, opt.dimensions);
    var program = programCache[this.programCacheKey];
    this.programCache = {};
    this.bufferCache = {};
    this.textureCache = {};
    this.framebufferCache = {};
  }

  dimToTexSize(opt, dimensions, output) {
		let numTexels = dimensions[0];
		for (let i = 1; i < dimensions.length; i++) {
			numTexels *= dimensions[i];
		}

		if (opt.floatTextures && (!output || opt.floatOutput)) {
			numTexels = Math.ceil(numTexels / 4);
		}

		var w = Math.ceil(Math.sqrt(numTexels));
		return [w, w];
	}

  getDimensions(x, pad) {
		var ret;
		if (GPUUtils.isArray(x)) {
			var dim = [];
			var temp = x;
			while (GPUUtils.isArray(temp)) {
				dim.push(temp.length);
				temp = temp[0];
			}
			ret = dim.reverse();
		} else if (x instanceof GPUTexture) {
			ret = x.dimensions;
		} else {
			throw "Unknown dimensions of " + x;
		}

		if (pad) {
			ret = GPUUtils.clone(ret);
			while (ret.length < 3) {
				ret.push(1);
			}
		}

		return ret;
	}

  pad(arr, padding) {
		function zeros(n) {
			return Array.apply(null, Array(n)).map(Number.prototype.valueOf,0);
		}

		var len = arr.length + padding * 2;

		var ret = arr.map(function(x) {
			return [].concat(zeros(padding), x, zeros(padding));
		});

		for (var i=0; i<padding; i++) {
			ret = [].concat([zeros(len)], ret, [zeros(len)]);
		}

		return ret;
	}

  flatten(arr) {
		if (GPUUtils.isArray(arr[0])) {
			if (GPUUtils.isArray(arr[0][0])) {
				// Annoyingly typed arrays do not have concat so we turn them into arrays first
				if (!Array.isArray(arr[0][0])) {
					return [].concat.apply([], [].concat.apply([], arr).map(function(x) {
						return Array.prototype.slice.call(x);
					}));
				}

				return [].concat.apply([], [].concat.apply([], arr));
			} else {
				return [].concat.apply([], arr);
			}
		} else {
			return arr;
		}
	}

  splitArray(array, part) {
		var tmp = [];
		for(var i = 0; i < array.length; i += part) {
			tmp.push(array.slice(i, i + part));
		}
		return tmp;
	}

  getProgramCacheKey(args, opt, outputDim) {
		var key = '';
		for (var i=0; i<args.length; i++) {
			var argType = GPUUtils.getArgumentType(args[i]);
			key += argType;
			if (opt.hardcodeConstants) {
				var dimensions;
				if (argType == "Array" || argType == "Texture") {
					dimensions = this.getDimensions(args[i], true);
					key += '['+dimensions[0]+','+dimensions[1]+','+dimensions[2]+']';
				}
			}
		}

		var specialFlags = '';
		if (opt.wraparound) {
			specialFlags += "Wraparound";
		}

		if (opt.hardcodeConstants) {
			specialFlags += "Hardcode";
			specialFlags += '['+outputDim[0]+','+outputDim[1]+','+outputDim[2]+']';
		}

		if (opt.constants) {
			specialFlags += "Constants";
			specialFlags += JSON.stringify(opt.constants);
		}

		if (specialFlags) {
			key = key + '-' + specialFlags;
		}

		return key;
	}

  getUniformLocation(name) {
    var location = this.programUniformLocationCache[this.programCacheKey][name];
    if (!location) {
      location = gl.getUniformLocation(program, name);
      this.programUniformLocationCache[this.programCacheKey][name] = location;
    }
    return location;
  }

	mode(kernel, opt) {
		var gpu = this;

		var canvas = this._canvas;
		if (!canvas) {
			canvas = this._canvas = GPUUtils.initCanvas();
		}

		var gl = this._webgl;
		if (!gl) {
			gl = this._webgl = GPUUtils.initWebGl(canvas);
		}

		var builder = this.functionBuilder;
		var endianness = this.endianness;

		var funcStr = kernel.toString();
		if( !GPUUtils.isFunctionString(funcStr) ) {
			throw "Unable to get body of kernel function";
		}

		var paramNames = GPUUtils.getParamNamesFromString(funcStr);

		var vertices = new Float32Array([
			-1, -1,
			1, -1,
			-1, 1,
			1, 1]);
		var texCoords = new Float32Array([
			0.0, 0.0,
			1.0, 0.0,
			0.0, 1.0,
			1.0, 1.0]);

		function ret() {
			if (opt.floatTextures === true && !GPUUtils.OES_texture_float) {
				throw "Float textures are not supported on this browser";
			} else if (opt.floatOutput === true && opt.floatOutputForce !== true && !GPUUtils.test_floatReadPixels(gpu)) {
				throw "Float texture outputs are not supported on this browser";
			} else if (opt.floatTextures === undefined && GPUUtils.OES_texture_float) {
				opt.floatTextures = true;
				opt.floatOutput = GPUUtils.isFloatReadPixelsSupported(gpu) && !opt.graphical;
			}

			if (!opt.dimensions || opt.dimensions.length === 0) {
				if (arguments.length != 1) {
					throw "Auto dimensions only supported for kernels with only one input";
				}

				var argType = GPUUtils.getArgumentType(arguments[0]);
				if (argType == "Array") {
					opt.dimensions = this.getDimensions(argType);
				} else if (argType == "Texture") {
					opt.dimensions = arguments[0].dimensions;
				} else {
					throw "Auto dimensions not supported for input type: " + argType;
				}
			}

			var texSize = this.dimToTexSize(opt, opt.dimensions, true);

			if (opt.graphical) {
				if (opt.dimensions.length != 2) {
					throw "Output must have 2 dimensions on graphical mode";
				}

				if (opt.floatOutput) {
					throw "Cannot use graphical mode and float output at the same time";
				}

				texSize = GPUUtils.clone(opt.dimensions);
			} else if (opt.floatOutput === undefined && GPUUtils.OES_texture_float) {
				opt.floatOutput = true;
			}

			canvas.width = texSize[0];
			canvas.height = texSize[1];
			gl.viewport(0, 0, texSize[0], texSize[1]);

			var threadDim = GPUUtils.clone(opt.dimensions);
			while (threadDim.length < 3) {
				threadDim.push(1);
			}

			if (program === undefined) {
				var constantsStr = '';
				if (opt.constants) {
					for (var name in opt.constants) {
						var value = parseFloat(opt.constants[name]);

						if (Number.isInteger(value)) {
							constantsStr += 'const float constants_' + name + '=' + parseInt(value) + '.0;\n';
						} else {
							constantsStr += 'const float constants_' + name + '=' + parseFloat(value) + ';\n';
						}
					}
				}

				var paramStr = '';

				var paramType = [];
				for (var i=0; i<paramNames.length; i++) {
					var argType = GPUUtils.getArgumentType(arguments[i]);
					paramType.push(argType);
					if (opt.hardcodeConstants) {
						if (argType == "Array" || argType == "Texture") {
							var paramDim = this.getDimensions(arguments[i], true);
							var paramSize = this.dimToTexSize(gpu, paramDim);

							paramStr += 'uniform highp sampler2D user_' + paramNames[i] + ';\n';
							paramStr += 'highp vec2 user_' + paramNames[i] + 'Size = vec2(' + paramSize[0] + '.0, ' + paramSize[1] + '.0);\n';
							paramStr += 'highp vec3 user_' + paramNames[i] + 'Dim = vec3(' + paramDim[0] + '.0, ' + paramDim[1] + '.0, ' + paramDim[2] + '.0);\n';
						} else if (argType == "Number" && Number.isInteger(arguments[i])) {
							paramStr += 'highp float user_' + paramNames[i] + ' = ' + arguments[i] + '.0;\n';
						} else if (argType == "Number") {
							paramStr += 'highp float user_' + paramNames[i] + ' = ' + arguments[i] + ';\n';
						}
					} else {
						if (argType == "Array" || argType == "Texture") {
							paramStr += 'uniform highp sampler2D user_' + paramNames[i] + ';\n';
							paramStr += 'uniform highp vec2 user_' + paramNames[i] + 'Size;\n';
							paramStr += 'uniform highp vec3 user_' + paramNames[i] + 'Dim;\n';
						} else if (argType == "Number") {
							paramStr += 'uniform highp float user_' + paramNames[i] + ';\n';
						}
					}
				}

				var kernelNode = new FunctionNode(gpu, "kernel", kernel);
				kernelNode.paramNames = paramNames;
				kernelNode.paramType = paramType;
				kernelNode.isRootKernel = true;
				builder.addFunctionNode(kernelNode);

				var vertShaderSrc = `
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

				var fragShaderSrc = `
precision highp float;
precision highp int;
precision highp sampler2D;

#define LOOP_MAX ${ (opt.loopMaxIterations ? parseInt(opt.loopMaxIterations)+'.0' : '100.0') };
#define EPSILON 0.0000001;

${ opt.hardcodeConstants
  ? `highp vec3 uOutputDim = vec3(${ threadDim[0] },${ threadDim[1] }, ${ threadDim[2] });`
  : 'uniform highp vec3 uOutputDim};'
}
${ opt.hardcodeConstants
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
  ${ endianness == 'LE'
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
  ${ endianness == 'LE'
    ? ''
    : 'rgba.rgba = rgba.abgr;'
	}
	return rgba;',
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
  ${ opt.wraparound
    ? '	xyz = mod(xyz, texDim);'
    : ''
	}
	highp float index = round(xyz.x + texDim.x * (xyz.y + texDim.y * xyz.z));
  ${ opt.floatTextures ? '	int channel = int(integerMod(index, 4.0));' : '' }
  ${ opt.floatTextures ? '	index = float(int(index)/4);' : ''}
	highp float w = round(texSize.x);
	vec2 st = vec2(integerMod(index, w), float(int(index) / int(w))) + 0.5;
  ${ opt.floatTextures ? '	index = float(int(index)/4);' : ''}
	highp vec4 texel = texture2D(tex, st / texSize);
  ${ opt.floatTextures ? '	if (channel == 0) return texel.r;' : '' }
  ${ opt.floatTextures ? '	if (channel == 1) return texel.g;' : '' }
  ${ opt.floatTextures ? '	if (channel == 2) return texel.b;' : '' }
  ${ opt.floatTextures ? '	if (channel == 3) return texel.a;' : '' }
  ${ opt.floatTextures ? '' : '	return decode32(texel);' }
}

highp float get(highp sampler2D tex, highp vec2 texSize, highp vec3 texDim, highp float y, highp float x) {
	return get(tex, texSize, texDim, 0.0, y, x);
}

highp float get(highp sampler2D tex, highp vec2 texSize, highp vec3 texDim, highp float x) {
	return get(tex, texSize, texDim, 0.0, 0.0, x);
}

const bool outputToColor = ${ opt.graphical? 'true' : 'false' };
highp vec4 actualColor;
void color(float r, float g, float b, float a) {
	actualColor = vec4(r,g,b,a);
}

void color(float r, float g, float b) {
	color(r,g,b,1.0);
}

highp float kernelResult = 0.0;
paramStr
constantsStr
builder.webGlPrototypeString("kernel", opt)
builder.webGlString("kernel", opt)

void main(void) {
	index = floor(vTexCoord.s * float(uTexSize.x)) + floor(vTexCoord.t * float(uTexSize.y)) * uTexSize.x;
  ${ opt.floatOutput ? 'index *= 4.0;' : '' }
	threadId = indexTo3D(index, uOutputDim);
	kernel();
	if (outputToColor == true) {
		gl_FragColor = actualColor;
	} else {
  ${ opt.floatOutput ? '' : 'gl_FragColor = encode32(kernelResult);' }
  ${ opt.floatOutput ? 'gl_FragColor.r = kernelResult;' : '' }
  ${ opt.floatOutput ? 'index += 1.0; threadId = indexTo3D(index, uOutputDim); kernel();' : '' }
  ${ opt.floatOutput ? 'gl_FragColor.g = kernelResult;' : '' }
  ${ opt.floatOutput ? 'index += 1.0; threadId = indexTo3D(index, uOutputDim); kernel();' : '' }
  ${ opt.floatOutput ? 'gl_FragColor.b = kernelResult;' : '' }
  ${ opt.floatOutput ? 'index += 1.0; threadId = indexTo3D(index, uOutputDim); kernel();' : '' }
  ${ opt.floatOutput ? 'gl_FragColor.a = kernelResult;' : '' }
	}
}`;

				const vertShader = gl.createShader(gl.VERTEX_SHADER);
				const fragShader = gl.createShader(gl.FRAGMENT_SHADER);

				gl.shaderSource(vertShader, vertShaderSrc);
				gl.shaderSource(fragShader, fragShaderSrc);

				gl.compileShader(vertShader);
				gl.compileShader(fragShader);

				if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
					console.log(vertShaderSrc);
					console.error("An error occurred compiling the shaders: " + gl.getShaderInfoLog(vertShader));
					throw "Error compiling vertex shader";
				}
				if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
					console.log(fragShaderSrc);
					console.error("An error occurred compiling the shaders: " + gl.getShaderInfoLog(fragShader));
					throw "Error compiling fragment shader";
				}

				if (opt.debug) {
					console.log('Options:');
					console.dir(opt);
					console.log('GLSL Shader Output:');
					console.log(fragShaderSrc);
				}

				const program = this.program = gl.createProgram();
				gl.attachShader(program, vertShader);
				gl.attachShader(program, fragShader);
				gl.linkProgram(program);

				programCache[programCacheKey] = program;
				programUniformLocationCache[programCacheKey] = [];
			}

			gl.useProgram(program);

			const texCoordOffset = vertices.byteLength;
			let buffer = bufferCache[programCacheKey];
			if (!buffer) {
				buffer = gl.createBuffer();
				bufferCache[programCacheKey] = buffer;

				gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
				gl.bufferData(gl.ARRAY_BUFFER, vertices.byteLength + texCoords.byteLength, gl.STATIC_DRAW);
			} else {
				gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			}
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
			gl.bufferSubData(gl.ARRAY_BUFFER, texCoordOffset, texCoords);

			var aPosLoc = gl.getAttribLocation(program, "aPos");
			gl.enableVertexAttribArray(aPosLoc);
			gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, gl.FALSE, 0, 0);
			var aTexCoordLoc = gl.getAttribLocation(program, "aTexCoord");
			gl.enableVertexAttribArray(aTexCoordLoc);
			gl.vertexAttribPointer(aTexCoordLoc, 2, gl.FLOAT, gl.FALSE, 0, texCoordOffset);

			if (!opt.hardcodeConstants) {
				var uOutputDimLoc = this.getUniformLocation("uOutputDim");
				gl.uniform3fv(uOutputDimLoc, threadDim);
				var uTexSizeLoc = this.getUniformLocation("uTexSize");
				gl.uniform2fv(uTexSizeLoc, texSize);
			}

			if (!textureCache[programCacheKey]) {
				textureCache[programCacheKey] = [];
			}
			let textureCount = 0;
			for (textureCount=0; textureCount<paramNames.length; textureCount++) {
				let paramDim, paramSize, texture;
				var argType = GPUUtils.getArgumentType(arguments[textureCount]);
				if (argType == "Array") {
					paramDim = this.getDimensions(arguments[textureCount], true);
					paramSize = this.dimToTexSize(opt, paramDim);

					if (textureCache[programCacheKey][textureCount]) {
						texture = textureCache[programCacheKey][textureCount];
					} else {
						texture = gl.createTexture();
						textureCache[programCacheKey][textureCount] = texture;
					}

					gl.activeTexture(gl["TEXTURE"+textureCount]);
					gl.bindTexture(gl.TEXTURE_2D, texture);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

					var paramLength = paramSize[0] * paramSize[1];
					if (opt.floatTextures) {
						paramLength *= 4;
					}

					var paramArray = new Float32Array(paramLength);
					paramArray.set(flatten(arguments[textureCount]))

					var argBuffer;
					if (opt.floatTextures) {
						argBuffer = new Float32Array(paramArray);
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, paramSize[0], paramSize[1], 0, gl.RGBA, gl.FLOAT, argBuffer);
					} else {
						argBuffer = new Uint8Array((new Float32Array(paramArray)).buffer);
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, paramSize[0], paramSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, argBuffer);
					}

					var paramLoc = this.getUniformLocation("user_" + paramNames[textureCount]);
					var paramSizeLoc = this.getUniformLocation("user_" + paramNames[textureCount] + "Size");
					var paramDimLoc = this.getUniformLocation("user_" + paramNames[textureCount] + "Dim");

					if (!opt.hardcodeConstants) {
						gl.uniform3fv(paramDimLoc, paramDim);
						gl.uniform2fv(paramSizeLoc, paramSize);
					}
					gl.uniform1i(paramLoc, textureCount);
				} else if (argType == "Number") {
					var argLoc = this.getUniformLocation("user_"+paramNames[textureCount]);
					gl.uniform1f(argLoc, arguments[textureCount]);
				} else if (argType == "Texture") {
					paramDim = this.getDimensions(arguments[textureCount], true);
					paramSize = arguments[textureCount].size;
					texture = arguments[textureCount].texture;

					gl.activeTexture(gl["TEXTURE"+textureCount]);
					gl.bindTexture(gl.TEXTURE_2D, texture);

					var paramLoc = this.getUniformLocation("user_" + paramNames[textureCount]);
					var paramSizeLoc = this.getUniformLocation("user_" + paramNames[textureCount] + "Size");
					var paramDimLoc = this.getUniformLocation("user_" + paramNames[textureCount] + "Dim");

					gl.uniform3fv(paramDimLoc, paramDim);
					gl.uniform2fv(paramSizeLoc, paramSize);
					gl.uniform1i(paramLoc, textureCount);
				} else {
					throw "Input type not supported (GPU): " + arguments[textureCount];
				}
			}

			var outputTexture = textureCache[programCacheKey][textureCount];
			if (!outputTexture) {
				outputTexture = gl.createTexture();
				textureCache[programCacheKey][textureCount] = outputTexture;
			}
			gl.activeTexture(gl["TEXTURE"+textureCount]);
			gl.bindTexture(gl.TEXTURE_2D, outputTexture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			if (opt.floatOutput) {
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
			} else {
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			}

			if (opt.graphical) {
				gl.bindRenderbuffer(gl.RENDERBUFFER, null);
   				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
				gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
				return;
			}

			var framebuffer = framebufferCache[programCacheKey];
			if (!framebuffer) {
				framebuffer = gl.createFramebuffer();
				framebufferCache[programCacheKey] = framebuffer;
			}
			framebuffer.width = texSize[0];
			framebuffer.height = texSize[1];
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outputTexture, 0);

			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

			if (opt.outputToTexture) {
				// Don't retain a handle on the output texture, we might need to render on the same texture later
				delete textureCache[programCacheKey][textureCount];

				return new GPUTexture(gpu, outputTexture, texSize, opt.dimensions);
			} else {
				var result;
				if (opt.floatOutput) {
					result = new Float32Array(texSize[0]*texSize[1]*4);
					gl.readPixels(0, 0, texSize[0], texSize[1], gl.RGBA, gl.FLOAT, result);
				} else {
					var bytes = new Uint8Array(texSize[0]*texSize[1]*4);
					gl.readPixels(0, 0, texSize[0], texSize[1], gl.RGBA, gl.UNSIGNED_BYTE, bytes);
					result = Float32Array.prototype.slice.call(new Float32Array(bytes.buffer));
				}

				result = result.subarray(0, threadDim[0] * threadDim[1] * threadDim[2]);

				if (opt.dimensions.length == 1) {
					return result;
				} else if (opt.dimensions.length == 2) {
					return splitArray(result, opt.dimensions[0]);
				} else if (opt.dimensions.length == 3) {
					var cube = splitArray(result, opt.dimensions[0] * opt.dimensions[1]);
					return cube.map(function(x) {
						return splitArray(x, opt.dimensions[0]);
					});
				}
			}
		}

		ret.canvas = canvas;
		ret.webgl = gl;

		return gpu.setupExecutorExtendedFunctions(ret, opt);
	}
}
