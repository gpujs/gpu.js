(function(GPU) {
	function clone(obj) {
		if(obj === null || typeof(obj) !== 'object' || 'isActiveClone' in obj)
			return obj;

		var temp = obj.constructor(); // changed

		for(var key in obj) {
			if(Object.prototype.hasOwnProperty.call(obj, key)) {
				obj.isActiveClone = null;
				temp[key] = clone(obj[key]);
				delete obj.isActiveClone;
			}
		}

		return temp;
	}

	function dimToTexSize(gl, dimensions) {
		if (dimensions.length == 2) {
			return dimensions;
		}

		var numTexels = dimensions[0];
		for (var i=1; i<dimensions.length; i++) {
			numTexels *= dimensions[i];
		}

		// TODO: find out why this is broken in Safari
		/*
		var maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
		if (numTexels < maxSize) {
			return [numTexels, 1];
		} else {
			var height = Math.ceil(numTexels / maxSize);
			return [maxSize, height];
		}
		*/

		var w = Math.ceil(Math.sqrt(numTexels));
		return [w, w];
	}

	function validateStringIsFunction( funcStr ) {
		if( funcStr !== null ) {
			return (funcStr.slice(0, "function".length).toLowerCase() == "function");
		}
		return false;
	}
	var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
	var ARGUMENT_NAMES = /([^\s,]+)/g;
	function getParamNames(func) {
		var fnStr = func.toString().replace(STRIP_COMMENTS, '');
		var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
		if(result === null)
			result = [];
		return result;
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
			ret = clone(ret);
			while (ret.length < 3) {
				ret.push(1);
			}
		}

		return ret;
	}

	function flatten(arr) {
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

	function getArgumentType(arg) {
		if (Array.isArray(arg)) {
			return 'Array';
		} else if (typeof arg == "number") {
			return 'Number';
		} else if (arg instanceof GPUTexture) {
			return 'Texture';
		} else {
			return 'Unknown';
		}
	}

	function getProgramCacheKey(args, opt, outputDim) {
		var key = '';
		for (var i=0; i<args.length; i++) {
			var argType = getArgumentType(args[i]);
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

		if (specialFlags) {
			key = key + '-' + specialFlags;
		}

		return key;
	}

	GPU.prototype._backendGLSL = function(kernel, opt) {
		var gpu = this;
		var gl = this.gl;
		var canvas = this.canvas;

		var builder = this.functionBuilder;
		var endianness = this.endianness;

		var funcStr = kernel.toString();
		if( !validateStringIsFunction(funcStr) ) {
			throw "Unable to get body of kernel function";
		}

		var paramNames = getParamNames(funcStr);

		var programCache = [];

		function ret() {
			if (!opt.dimensions || opt.dimensions.length === 0) {
				if (arguments.length != 1) {
					throw "Auto dimensions only supported for kernels with only one input";
				}

				var argType = getArgumentType(arguments[0]);
				if (argType == "Array") {
					opt.dimensions = getDimensions(argType);
				} else if (argType == "Texture") {
					opt.dimensions = arguments[0].dimensions;
				} else {
					throw "Auto dimensions not supported for input type: " + argType;
				}
			}

			var texSize = dimToTexSize(gl, opt.dimensions);
			canvas.width = texSize[0];
			canvas.height = texSize[1];
			gl.viewport(0, 0, texSize[0], texSize[1]);

			var threadDim = clone(opt.dimensions);
			while (threadDim.length < 3) {
				threadDim.push(1);
			}

			var programCacheKey = getProgramCacheKey(arguments, opt, opt.dimensions);
			var program = programCache[programCacheKey];

			if (program === undefined) {
				var paramStr = '';

				var paramType = [];
				for (var i=0; i<paramNames.length; i++) {
					var argType = getArgumentType(arguments[i]);
					paramType.push(argType);
					if (opt.hardcodeConstants) {
						if (argType == "Array" || argType == "Texture") {
							var paramDim = getDimensions(arguments[i], true);
							var paramSize = dimToTexSize(gl, paramDim);

							paramStr += 'uniform sampler2D user_' + paramNames[i] + ';\n';
							paramStr += 'vec2 user_' + paramNames[i] + 'Size = vec2(' + paramSize[0] + ',' + paramSize[1] + ');\n';
							paramStr += 'vec3 user_' + paramNames[i] + 'Dim = vec3(' + paramDim[0] + ', ' + paramDim[1] + ', ' + paramDim[2] + ');\n';
						} else if (argType == "Number") {
							paramStr += 'float user_' + paramNames[i] + ' = ' + arguments[i] + ';\n';
						}
					} else {
						if (argType == "Array" || argType == "Texture") {
							paramStr += 'uniform sampler2D user_' + paramNames[i] + ';\n';
							paramStr += 'uniform vec2 user_' + paramNames[i] + 'Size;\n';
							paramStr += 'uniform vec3 user_' + paramNames[i] + 'Dim;\n';
						} else if (argType == "Number") {
							paramStr += 'uniform float user_' + paramNames[i] + ';\n';
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
					'',
					'attribute vec2 aPos;',
					'attribute vec2 aTexCoord;',
					'',
					'varying vec2 vTexCoord;',
					'',
					'void main(void) {',
					'   gl_Position = vec4(aPos, 0, 1);',
					'   vTexCoord = aTexCoord;',
					'}'
				].join('\n');

				var fragShaderSrc = [
					'precision highp float;',
					'precision highp int;',
					'',
					'#define LOOP_MAX '+ (opt.loopMaxIterations ? parseInt(opt.loopMaxIterations)+'.0' : '100.0'),
					'',
					opt.hardcodeConstants ? 'vec3 uOutputDim = vec3('+threadDim[0]+','+threadDim[1]+', '+ threadDim[2]+');' : 'uniform vec3 uOutputDim;',
					opt.hardcodeConstants ? 'vec2 uTexSize = vec2('+texSize[0]+','+texSize[1]+');' : 'uniform vec2 uTexSize;',
					'varying vec2 vTexCoord;',
					'',
					'/* Begin: http://stackoverflow.com/questions/7059962/how-do-i-convert-a-vec4-rgba-value-to-a-float */',
					'highp vec4 encode32(highp float f) {',
					'	highp float e =5.0;',
					'	highp float F = abs(f); ',
					'	highp float sign = step(0.0,-f);',
					'	highp float exponent = floor(log2(F)); ',
					'	highp float mantissa = (exp2(- exponent) * F);',
					'	exponent = floor(log2(F) + 127.0) + floor(log2(mantissa));',
					'	highp vec4 rgba;',
					'	rgba.a = 128.0 * sign + floor(exponent*exp2(-1.0));',
					'	rgba.b = 128.0 * mod(exponent,2.0) + mod(floor(mantissa*128.0),128.0);',
					'	rgba.g = floor(mod(floor(mantissa*exp2(23.0 -8.0)),exp2(8.0)));',
					'	rgba.r = floor(exp2(23.0)*mod(mantissa,exp2(-15.0)));',
					(endianness == 'LE' ? '' : '	rgba.rgba = rgba.abgr;'),
					'	return rgba / 255.0;',
					'}',
					'',
					'highp float decode32(highp vec4 rgba) {',
					(endianness == 'LE' ? '' : '	rgba.rgba = rgba.abgr;'),
					'	rgba *= 255.0;',
					'	highp float sign = 1.0 - step(128.0,rgba.a)*2.0;',
					'	highp float exponent = 2.0 * mod(rgba.a,128.0) + step(128.0,rgba.b) - 127.0; ',
					'	highp float mantissa = mod(rgba.b,128.0)*65536.0 + rgba.g*256.0 +rgba.r + float(0x800000);',
					'	highp float result =  sign * exp2(exponent) * (mantissa * exp2(-23.0 )); ',
					'	return result;',
					'}',
					'/* End: http://stackoverflow.com/questions/7059962/how-do-i-convert-a-vec4-rgba-value-to-a-float */',
					'',
					'float index;',
					'vec3 threadId;',
					'',
					'vec3 indexTo3D(float idx, vec3 texDim) {',
					'	float z = floor(idx / (texDim.x * texDim.y));',
					'	idx -= z * texDim.x * texDim.y;',
					'	float y = floor(idx / texDim.x);',
					'	float x = mod(idx, texDim.x);',
					'	return vec3(x, y, z);',
					'}',
					'',
					'float get(sampler2D tex, vec2 texSize, vec3 texDim, float z, float y, float x) {',
					'	vec3 xyz = vec3(x, y, z);',
					(opt.wraparound ? '	xyz = mod(xyz, texDim);' : ''),
					'	float index = (xyz.z * texDim.x * texDim.y) + (xyz.y * texDim.x) + xyz.x;',
					'	float t = (floor(index / texSize.x) + 0.5) / texSize.y;',
					'	float s = (mod(index, texSize.x) + 0.5) / texSize.x;',
					'	return decode32(texture2D(tex, vec2(s, t)));',
					'}',
					'',
					'float get(sampler2D tex, vec2 texSize, vec3 texDim, float y, float x) {',
					'	return get(tex, texSize, texDim, 0.0, y, x);',
					'}',
					'',
					'float get(sampler2D tex, vec2 texSize, vec3 texDim, float x) {',
					'	return get(tex, texSize, texDim, 0.0, 0.0, x);',
					'}',
					'',
					'const bool outputToColor = ' + (opt.graphical? 'true' : 'false') + ';',
					'vec4 actualColor;',
					'void color(float r, float g, float b, float a) {',
					'	actualColor = vec4(r,g,b,a);',
					'}',
					'',
					'void color(float r, float g, float b) {',
					'	color(r,g,b,1.0);',
					'}',
					'',
					paramStr,
					builder.webglString("kernel", opt),
					'',
					'void main(void) {',
					'	index = floor(vTexCoord.s * float(uTexSize.x)) + floor(vTexCoord.t * float(uTexSize.y)) * uTexSize[0];',
					'	threadId = indexTo3D(index, uOutputDim);',
					'	vec4 outputColor = encode32(kernel());',
					'	if (outputToColor == true) {',
					'		gl_FragColor = actualColor;',
					'	} else {',
					'		gl_FragColor = outputColor;',
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
				var uOutputDimLoc = gl.getUniformLocation(program, "uOutputDim");
				gl.uniform3fv(uOutputDimLoc, threadDim);
				var uTexSizeLoc = gl.getUniformLocation(program, "uTexSize");
				gl.uniform2fv(uTexSizeLoc, texSize);
			}

			var textures = [];
			var textureCount = 0;
			for (textureCount=0; textureCount<paramNames.length; textureCount++) {
				var paramDim, paramSize, texture;
				if (Array.isArray(arguments[textureCount])) {
					paramDim = getDimensions(arguments[textureCount], true);
					paramSize = dimToTexSize(gl, paramDim);

					texture = gl.createTexture();
					gl.activeTexture(gl["TEXTURE"+textureCount]);
					gl.bindTexture(gl.TEXTURE_2D, texture);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

					var paramArray = flatten(arguments[textureCount]);
					while (paramArray.length < paramSize[0] * paramSize[1]) {
						paramArray.push(0);
					}
					var argBuffer = new Uint8Array((new Float32Array(paramArray)).buffer);
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, paramSize[0], paramSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, argBuffer);

					textures[textureCount] = texture;

					var paramLoc = gl.getUniformLocation(program, "user_" + paramNames[textureCount]);
					var paramSizeLoc = gl.getUniformLocation(program, "user_" + paramNames[textureCount] + "Size");
					var paramDimLoc = gl.getUniformLocation(program, "user_" + paramNames[textureCount] + "Dim");

					if (!opt.hardcodeConstants) {
						gl.uniform3fv(paramDimLoc, paramDim);
						gl.uniform2fv(paramSizeLoc, paramSize);
					}
					gl.uniform1i(paramLoc, textureCount);
				} else if (typeof arguments[textureCount] == "number") {
					var argLoc = gl.getUniformLocation(program, "user_"+paramNames[textureCount]);
					gl.uniform1f(argLoc, arguments[textureCount]);
				} else if (arguments[textureCount] instanceof GPUTexture) {
					paramDim = getDimensions(arguments[textureCount]);
					paramSize = arguments[textureCount].size;
					texture = arguments[textureCount].texture;
					textures[textureCount] = texture;

					gl.activeTexture(gl["TEXTURE"+textureCount]);
					gl.bindTexture(gl.TEXTURE_2D, texture);

					var paramLoc = gl.getUniformLocation(program, "user_" + paramNames[textureCount]);
					var paramSizeLoc = gl.getUniformLocation(program, "user_" + paramNames[textureCount] + "Size");
					var paramDimLoc = gl.getUniformLocation(program, "user_" + paramNames[textureCount] + "Dim");

					gl.uniform3fv(paramDimLoc, paramDim);
					gl.uniform2fv(paramSizeLoc, paramSize);
					gl.uniform1i(paramLoc, textureCount);
				} else {
					throw "Input type not supported: " + arguments[textureCount];
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

		ret.dimensions = function(dim) {
			opt.dimensions = dim;
			return ret;
		};

		ret.debug = function(flag) {
			opt.debug = flag;
			return ret;
		};

		ret.graphical = function(flag) {
			opt.graphical = flag;
			return ret;
		};
		
		ret.loopMaxIterations = function(max) {
			opt.loopMaxIterations = max;
			return ret;
		};

		ret.wraparound = function(flag) {
			opt.wraparound = flag;
			return ret;
		};

		ret.hardcodeConstants = function(flag) {
			opt.hardcodeConstants = flag;
			return ret;
		};

		ret.outputToTexture = function(outputToTexture) {
			opt.outputToTexture = outputToTexture;
			return ret;
		};

		ret.mode = function(mode) {
			opt.mode = mode;
			return gpu.createKernel(kernel, opt);
		};

		ret.getCanvas = function() {
			return gpu.getCanvas();
		};

		return ret;
	};

})(GPU);
