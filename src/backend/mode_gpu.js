(function(GPU) {
	function dimToTexSize(opt, dimensions, output) {
		var numTexels = dimensions[0];
		for (var i=1; i<dimensions.length; i++) {
			numTexels *= dimensions[i];
		}
		
		if (opt.floatTextures && !output) {
			numTexels = Math.ceil(numTexels / 4);
		}

		var w = Math.ceil(Math.sqrt(numTexels));
		return [w, w];
	}

	function getDimensions(x, pad) {
		var ret;
		if (Array.isArray(x)) {
			var dim = [];
			var temp = x;
			while (Array.isArray(temp)) {
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
	
	function pad(arr, padding) {
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

	function flatten(arr, padding) {
		if (Array.isArray(arr[0])) {
			return [].concat.apply([], arr);
		} else {
			return arr;
		}
	}

	function splitArray(array, part) {
		var tmp = [];
		for(var i = 0; i < array.length; i += part) {
			tmp.push(array.slice(i, i + part));
		}
		return tmp;
	}

	function getProgramCacheKey(args, opt, outputDim) {
		var key = '';
		for (var i=0; i<args.length; i++) {
			var argType = GPUUtils.getArgumentType(args[i]);
			key += argType;
			if (opt.hardcodeConstants) {
				var dimensions;
				if (argType == "Array" || argType == "Texture") {
					dimensions = getDimensions(args[i], true);
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

	GPU.prototype._mode_gpu = function(kernel, opt) {
		var gpu = this;
		
		var canvas = gpu.canvas = GPUUtils.init_canvas();
		var gl = gpu.webgl = GPUUtils.init_webgl(canvas);

		var builder = this.functionBuilder;
		var endianness = this.endianness;

		var funcStr = kernel.toString();
		if( !GPUUtils.isFunctionString(funcStr) ) {
			throw "Unable to get body of kernel function";
		}

		var paramNames = GPUUtils.getParamNames_fromString(funcStr);

		var programCache = [];
		var programUniformLocationCache = [];
		
		function ret() {
			if (opt.floatTextures && !gpu.OES_texture_float) {
				throw "Float textures are not supported on this browser";
			}
			
			if (!opt.dimensions || opt.dimensions.length === 0) {
				if (arguments.length != 1) {
					throw "Auto dimensions only supported for kernels with only one input";
				}

				var argType = GPUUtils.getArgumentType(arguments[0]);
				if (argType == "Array") {
					opt.dimensions = getDimensions(argType);
				} else if (argType == "Texture") {
					opt.dimensions = arguments[0].dimensions;
				} else {
					throw "Auto dimensions not supported for input type: " + argType;
				}
			}

			var texSize = dimToTexSize(gpu, opt.dimensions, true);
			
			if (opt.graphical) {
				if (opt.dimensions.length != 2) {
					throw "Output must have 2 dimensions on graphical mode";
				}
				
				texSize = GPUUtils.clone(opt.dimensions);
			}
			
			canvas.width = texSize[0];
			canvas.height = texSize[1];
			gl.viewport(0, 0, texSize[0], texSize[1]);

			var threadDim = GPUUtils.clone(opt.dimensions);
			while (threadDim.length < 3) {
				threadDim.push(1);
			}

			var programCacheKey = getProgramCacheKey(arguments, opt, opt.dimensions);
			var program = programCache[programCacheKey];
			
			function getUniformLocation(name) {
				var location = programUniformLocationCache[programCacheKey][name];
				if (!location) {
					location = gl.getUniformLocation(program, name);
					programUniformLocationCache[programCacheKey][name] = location;
				}
				return location;
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
							var paramDim = getDimensions(arguments[i], true);
							var paramSize = dimToTexSize(gpu, paramDim);

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

				var kernelNode = new functionNode(gpu, "kernel", kernel);
				kernelNode.paramNames = paramNames;
				kernelNode.paramType = paramType;
				kernelNode.isRootKernel = true;
				builder.addFunctionNode(kernelNode);

				var vertShaderSrc = [
					'precision highp float;',
					'precision highp int;',
					'precision highp sampler2D;',
					'',
					'attribute highp vec2 aPos;',
					'attribute highp vec2 aTexCoord;',
					'',
					'varying highp vec2 vTexCoord;',
					'',
					'void main(void) {',
					'   gl_Position = vec4(aPos, 0, 1);',
					'   vTexCoord = aTexCoord;',
					'}'
				].join('\n');

				var fragShaderSrc = [
					'precision highp float;',
					'precision highp int;',
					'precision highp sampler2D;',
					'',
					'#define LOOP_MAX '+ (opt.loopMaxIterations ? parseInt(opt.loopMaxIterations)+'.0' : '100.0'),
					'#define EPSILON 0.0000001',
					'',
					opt.hardcodeConstants ? 'highp vec3 uOutputDim = vec3('+threadDim[0]+','+threadDim[1]+', '+ threadDim[2]+');' : 'uniform highp vec3 uOutputDim;',
					opt.hardcodeConstants ? 'highp vec2 uTexSize = vec2('+texSize[0]+','+texSize[1]+');' : 'uniform highp vec2 uTexSize;',
					'varying highp vec2 vTexCoord;',
					'',
					'highp float integerMod(highp float x, highp float y) {',
					'	highp float res = floor(mod(x, y));',
					'	if (res > floor(y) - 1.0) res = 0.0;',
					'	return res;',
					'}',
					'',
					'highp int integerMod(highp int x, highp int y) {',
					'	return int(integerMod(float(x), float(y)));',
					'}',
					'',
					//'// Here be dragons!',
					//'// DO NOT OPTIMIZE THIS CODE',
					//'// YOU WILL BREAK SOMETHING ON SOMEBODY\'S MACHINE',
					//'// LEAVE IT AS IT IS, LEST YOU WASTE YOUR OWN TIME',
					'highp float decode32(highp vec4 rgba) {',
					(endianness == 'LE' ? '' : '	rgba.rgba = rgba.abgr;'),
					'	rgba *= 255.0;',
					'	int r = int(rgba.r+0.5);',
					'	int g = int(rgba.g+0.5);',
					'	int b = int(rgba.b+0.5);',
					'	int a = int(rgba.a+0.5);',
					'	int sign = a > 127 ? -1 : 1;',
					'	int exponent = 2 * (a > 127 ? a - 128 : a) + (b > 127 ? 1 : 0);',
					'	float res;',
					'	if (exponent == 0) {',
					'		res = float(sign) * 0.0;',
					'	} else {',
					'		exponent -= 127;',
					'		res = exp2(float(exponent));',
					'		res += float(b > 127 ? b - 128 : b) * exp2(float(exponent-7));',
					'		res += float(g) * exp2(float(exponent-15));',
					'		res += float(r) * exp2(float(exponent-23));',
					'		res *= float(sign);',
					'	}',
					'	return res;',
					'}',
					'',
					'highp vec4 encode32(highp float f) {',
					'	if (f == 0.0) return vec4(0.0);',
					'	highp float F = abs(f);',
					'	highp float sign = f < 0.0 ? 1.0 : 0.0;',
					'	highp float log2F = log2(F);',
					'	highp float exponent = floor(log2F);',
					'	highp float mantissa = (exp2(-exponent) * F);',
					'	exponent = floor(log2F) + floor(log2(mantissa));',
					'	highp float mantissa_part1 = integerMod(F * exp2(23.0-exponent), 256.0);',
					'	highp float mantissa_part2 = integerMod(F * exp2(15.0-exponent), 256.0);',
					'	highp float mantissa_part3 = integerMod(F * exp2(7.0-exponent), 128.0);',
					'	exponent += 127.0;',
					'	vec4 rgba;',
					'	rgba.a = 128.0 * sign + exponent/2.0;',
					'	rgba.b = 128.0 * integerMod(exponent, 2.0) + mantissa_part3;',
					'	rgba.g = mantissa_part2;',
					'	rgba.r = mantissa_part1;',
					(endianness == 'LE' ? '' : '	rgba.rgba = rgba.abgr;'),
					'	rgba *= 0.003921569;',
					'	return rgba;',
					'}',
					'// Dragons end here',
					'',
					'highp float index;',
					'highp vec3 threadId;',
					'',
					'highp vec3 indexTo3D(highp float idx, highp vec3 texDim) {',
					'	idx = floor(idx + 0.5);',
					'	highp float z = floor(idx / (texDim.x * texDim.y));',
					'	idx -= z * texDim.x * texDim.y;',
					'	highp float y = floor(idx / texDim.x);',
					'	highp float x = integerMod(idx, texDim.x);',
					'	return vec3(x, y, z);',
					'}',
					'',
					'highp float get(highp sampler2D tex, highp vec2 texSize, highp vec3 texDim, highp float z, highp float y, highp float x) {',
					'	highp vec3 xyz = vec3(floor(x + 0.5), floor(y + 0.5), floor(z + 0.5));',
					(opt.wraparound ? '	xyz = mod(xyz, texDim);' : ''),
					'	highp float index = floor((xyz.z * texDim.x * texDim.y) + (xyz.y * texDim.x) + xyz.x + 0.5);',
					(opt.floatTextures ? '	int channel = int(integerMod(index, 4.0));' : ''),
					(opt.floatTextures ? '	index = float(int(index)/4);' : ''),
					'	highp float w = floor(texSize.x + 0.5);',
					'	highp float s = integerMod(index, w);',
					'	highp float t = float(int(index) / int(w));',
					'	s += 0.5;',
					'	t += 0.5;',
					(opt.floatTextures ? '	index = float(int(index)/4);' : ''),
					'	highp vec4 texel = texture2D(tex, vec2(s / texSize.x, t / texSize.y));',
					(opt.floatTextures ? '	if (channel == 0) return texel.r;' : ''),
					(opt.floatTextures ? '	if (channel == 1) return texel.g;' : ''),
					(opt.floatTextures ? '	if (channel == 2) return texel.b;' : ''),
					(opt.floatTextures ? '	if (channel == 3) return texel.a;' : ''),
					(opt.floatTextures ? '' : '	return decode32(texel);'),
					'}',
					'',
					'highp float get(highp sampler2D tex, highp vec2 texSize, highp vec3 texDim, highp float y, highp float x) {',
					'	return get(tex, texSize, texDim, 0.0, y, x);',
					'}',
					'',
					'highp float get(highp sampler2D tex, highp vec2 texSize, highp vec3 texDim, highp float x) {',
					'	return get(tex, texSize, texDim, 0.0, 0.0, x);',
					'}',
					'',
					'const bool outputToColor = ' + (opt.graphical? 'true' : 'false') + ';',
					'highp vec4 actualColor;',
					'void color(float r, float g, float b, float a) {',
					'	actualColor = vec4(r,g,b,a);',
					'}',
					'',
					'void color(float r, float g, float b) {',
					'	color(r,g,b,1.0);',
					'}',
					'',
					'highp float kernelResult = 0.0;',
					paramStr,
					constantsStr,
					builder.webglString("kernel", opt),
					'',
					'void main(void) {',
					'	index = floor(vTexCoord.s * float(uTexSize.x)) + floor(vTexCoord.t * float(uTexSize.y)) * uTexSize.x;',
					'	threadId = indexTo3D(index, uOutputDim);',
					'	kernel();',
					'	if (outputToColor == true) {',
					'		gl_FragColor = actualColor;',
					'	} else {',
					'		gl_FragColor = encode32(kernelResult);',
					'	}',
					'}'
				].join('\n');

				var vertShader = gl.createShader(gl.VERTEX_SHADER);
				var fragShader = gl.createShader(gl.FRAGMENT_SHADER);

				gl.shaderSource(vertShader, vertShaderSrc);
				gl.shaderSource(fragShader, fragShaderSrc);

				gl.compileShader(vertShader);
				gl.compileShader(fragShader);

				if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
					console.error("An error occurred compiling the shaders: " + gl.getShaderInfoLog(vertShader));
					console.log(vertShaderSrc);
					throw "Error compiling vertex shader";
				}
				if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
					console.error("An error occurred compiling the shaders: " + gl.getShaderInfoLog(fragShader));
					console.log(fragShaderSrc);
					throw "Error compiling fragment shader";
				}

				if (opt.debug) {
					console.log(fragShaderSrc);
				}

				program = gl.createProgram();
				gl.attachShader(program, vertShader);
				gl.attachShader(program, fragShader);
				gl.linkProgram(program);

				programCache[programCacheKey] = program;
				programUniformLocationCache[programCacheKey] = [];
			}

			gl.useProgram(program);

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
			var texCoordOffset = vertices.byteLength;
			var buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			gl.bufferData(gl.ARRAY_BUFFER, vertices.byteLength + texCoords.byteLength, gl.STATIC_DRAW);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
			gl.bufferSubData(gl.ARRAY_BUFFER, texCoordOffset, texCoords);

			var aPosLoc = gl.getAttribLocation(program, "aPos");
			gl.enableVertexAttribArray(aPosLoc);
			gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, gl.FALSE, 0, 0);
			var aTexCoordLoc = gl.getAttribLocation(program, "aTexCoord");
			gl.enableVertexAttribArray(aTexCoordLoc);
			gl.vertexAttribPointer(aTexCoordLoc, 2, gl.FLOAT, gl.FALSE, 0, texCoordOffset);

			if (!opt.hardcodeConstants) {
				var uOutputDimLoc = getUniformLocation("uOutputDim");
				gl.uniform3fv(uOutputDimLoc, threadDim);
				var uTexSizeLoc = getUniformLocation("uTexSize");
				gl.uniform2fv(uTexSizeLoc, texSize);
			}

			var textures = [];
			var textureCount = 0;
			for (textureCount=0; textureCount<paramNames.length; textureCount++) {
				var paramDim, paramSize, texture;
				var argType = GPUUtils.getArgumentType(arguments[textureCount]);
				if (argType == "Array") {
					paramDim = getDimensions(arguments[textureCount], true);
					paramSize = dimToTexSize(gpu, paramDim);

					texture = gl.createTexture();
					gl.activeTexture(gl["TEXTURE"+textureCount]);
					gl.bindTexture(gl.TEXTURE_2D, texture);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

					var paramArray = flatten(arguments[textureCount]);
					var paramLength = paramSize[0] * paramSize[1];
					if (opt.floatTextures) {
						paramLength *= 4;
					}
					while (paramArray.length < paramLength) {
						paramArray.push(0);
					}
					
					var argBuffer;
					if (opt.floatTextures) {
						argBuffer = new Float32Array(paramArray);
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, paramSize[0], paramSize[1], 0, gl.RGBA, gl.FLOAT, argBuffer);
					} else {
						argBuffer = new Uint8Array((new Float32Array(paramArray)).buffer);
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, paramSize[0], paramSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, argBuffer);
					}
					textures[textureCount] = texture;

					var paramLoc = getUniformLocation("user_" + paramNames[textureCount]);
					var paramSizeLoc = getUniformLocation("user_" + paramNames[textureCount] + "Size");
					var paramDimLoc = getUniformLocation("user_" + paramNames[textureCount] + "Dim");

					if (!opt.hardcodeConstants) {
						gl.uniform3fv(paramDimLoc, paramDim);
						gl.uniform2fv(paramSizeLoc, paramSize);
					}
					gl.uniform1i(paramLoc, textureCount);
				} else if (argType == "Number") {
					var argLoc = getUniformLocation("user_"+paramNames[textureCount]);
					gl.uniform1f(argLoc, arguments[textureCount]);
				} else if (argType == "Texture") {
					paramDim = getDimensions(arguments[textureCount], true);
					paramSize = arguments[textureCount].size;
					texture = arguments[textureCount].texture;
					textures[textureCount] = texture;

					gl.activeTexture(gl["TEXTURE"+textureCount]);
					gl.bindTexture(gl.TEXTURE_2D, texture);

					var paramLoc = getUniformLocation("user_" + paramNames[textureCount]);
					var paramSizeLoc = getUniformLocation("user_" + paramNames[textureCount] + "Size");
					var paramDimLoc = getUniformLocation("user_" + paramNames[textureCount] + "Dim");

					gl.uniform3fv(paramDimLoc, paramDim);
					gl.uniform2fv(paramSizeLoc, paramSize);
					gl.uniform1i(paramLoc, textureCount);
				} else {
					throw "Input type not supported (GPU): " + arguments[textureCount];
				}
			}

			if (opt.outputToTexture) {
				var outputTexture = gl.createTexture();
				gl.activeTexture(gl["TEXTURE"+textureCount]);
				gl.bindTexture(gl.TEXTURE_2D, outputTexture);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

				var framebuffer = gl.createFramebuffer();
				framebuffer.width = texSize[0];
				framebuffer.height = texSize[1];
				gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outputTexture, 0);
				gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
				return new GPUTexture(gpu, outputTexture, texSize, opt.dimensions);
			} else {
				gl.bindRenderbuffer(gl.RENDERBUFFER, null);
   				gl.bindFramebuffer(gl.FRAMEBUFFER, null);

				gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

				if (opt.graphical) {
					return;
				}

				var bytes = new Uint8Array(texSize[0]*texSize[1]*4);
				gl.readPixels(0, 0, texSize[0], texSize[1], gl.RGBA, gl.UNSIGNED_BYTE, bytes);
				var result = Array.prototype.slice.call(new Float32Array(bytes.buffer));
				result.length = threadDim[0] * threadDim[1] * threadDim[2];

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
	};

})(GPU);
