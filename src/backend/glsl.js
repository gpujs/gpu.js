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
		var numTexels = dimensions[0];
		for (var i=1; i<dimensions.length; i++) {
			numTexels *= dimensions[i];
		}
		
		var maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
		if (numTexels < maxSize) {
			return [numTexels, 1];
		} else {
			var height = Math.ceil(numTexels / maxSize);
			return [maxSize, height];
		}
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

	function getDimensions(x) {
		var dim = [];
		var temp = x;
		while (Array.isArray(temp)) {
			dim.push(temp.length);
			temp = temp[0];
		}
		return dim.reverse();
	}

	function flatten(arrays) {
		return [].concat.apply([], arrays);
	}

	function splitArray(array, part) {
		var tmp = [];
		for(var i = 0; i < array.length; i += part) {
			tmp.push(array.slice(i, i + part));
		}
		return tmp;
	}

	GPU.prototype._backendGLSL = function(kernel, opt) {
		var gl = this.gl;
		var canvas = this.canvas;
		var compileToGlsl = this._compileToGlsl;
		var programCache = this.programCache;
		
		var funcStr = kernel.toString();
		if( !validateStringIsFunction(funcStr) ) {
			return null;
		}
		
		paramNames = getParamNames(funcStr);
		
		var program = programCache[this];
		
		if (program === undefined) {
			var paramStr = '';
			
			for (var i=0; i<paramNames.length; i++) {
				paramStr += 'uniform sampler2D user_' + paramNames[i] + ';\n';
				paramStr += 'uniform vec2 user_' + paramNames[i] + 'Size;\n';
				paramStr += 'uniform vec3 user_' + paramNames[i] + 'Dim;\n';
			}
			
			funcStr = funcStr.replace(new RegExp('this.thread.x', 'g'), 'gpu_threadX');
			funcStr = funcStr.replace(new RegExp('this.thread.y', 'g'), 'gpu_threadY');
			funcStr = funcStr.replace(new RegExp('this.thread.z', 'g'), 'gpu_threadZ');
			funcStr = funcStr.replace(new RegExp('Math.', 'g'), 'gpu_math_');
			
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
				'uniform vec3 uOutputDim;',
				'uniform vec2 uTexSize;',
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
				'	return rgba / 255.0;',
				'}',
				'',
				'highp float decode32(highp vec4 rgba) {',
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
				'	float index = (z * texDim.x * texDim.y) + (y * texDim.x) + x;',
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
				paramStr,
				compileToGlsl(funcStr, {}),
				'',
				'void main(void) {',
				'	index = floor(vTexCoord.s * float(uTexSize.x)) + floor(vTexCoord.t * float(uTexSize.y)) * uTexSize[0];',
				'	threadId = indexTo3D(index, uOutputDim);',
				'	gl_FragColor = kernel();',
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
				return null;
			}
			if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
				console.error("An error occurred compiling the shaders: " + gl.getShaderInfoLog(fragShader));
				return null;
			}
			
			program = gl.createProgram();
			gl.attachShader(program, vertShader);
			gl.attachShader(program, fragShader);
			gl.linkProgram(program);
			
			programCache[this] = program;
		}
		
		return function() {
			gl.useProgram(program);
			
			var texSize = dimToTexSize(gl, opt.dimensions);
			canvas.width = texSize[0];
			canvas.height = texSize[1];
			gl.viewport(0, 0, texSize[0], texSize[1]);
			
			var threadDim = clone(opt.dimensions);
			while (threadDim.length < 3) {
				threadDim.push(1);
			}
			
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
			
			var uOutputDimLoc = gl.getUniformLocation(program, "uOutputDim");
			gl.uniform3fv(uOutputDimLoc, threadDim);
			var uTexSizeLoc = gl.getUniformLocation(program, "uTexSize");
			gl.uniform2fv(uTexSizeLoc, texSize);
			
			var textures = [];
			for (var i=0; i<paramNames.length; i++) {
				var paramDim = getDimensions(arguments[i]);
				while (paramDim.length < 3) {
					paramDim.push(1);
				}
				var paramSize = dimToTexSize(gl, paramDim);
				
				var texture = gl.createTexture();
				gl.activeTexture(gl["TEXTURE"+i]);
				gl.bindTexture(gl.TEXTURE_2D, texture);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, paramSize[0], paramSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array((new Float32Array(flatten(arguments[i]))).buffer));
				textures.push(texture);
				
				var paramLoc = gl.getUniformLocation(program, "user_" + paramNames[i]);
				var paramSizeLoc = gl.getUniformLocation(program, "user_" + paramNames[i] + "Size");
				var paramDimLoc = gl.getUniformLocation(program, "user_" + paramNames[i] + "Dim");
				
				gl.uniform3fv(paramDimLoc, paramDim);
				gl.uniform2fv(paramSizeLoc, paramSize);
				gl.uniform1i(paramLoc, i);
			}
			
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			var bytes = new Uint8Array(texSize[0]*texSize[1]*4);
			gl.readPixels(0, 0, texSize[0], texSize[1], gl.RGBA, gl.UNSIGNED_BYTE, bytes);
			
			var result = Array.prototype.slice.call(new Float32Array(bytes.buffer));
			
			if (opt.dimensions.length == 1) {
				return result;
			} else if (opt.dimensions.length == 2) {
				return splitArray(result, opt.dimensions[0]);
			} else if (opt.dimensions.length == 3) {
				var cube = splitArray(result, opt.dimensions[0] * opt.dimensions[1]);
				cube.map(function(x) {
					return splitArray(x, opt.dimensions[0]);
				});
				return cube;
			}
		};
	};

	GPU.prototype._compileToGlsl = (function() {
		
		/// @returns always a literal float
		function ensureFloat(f) {
			if( Number.isInteger(f) ) {
				return f + ".0";
			}
			return f;
		}
		
		/// @returns  the default state paramater set, used across the parser
		function jison_defaultStateParam(funcStr, inParamObj, inArgStateObj) {
			return {
				// The source code rows array
				src : funcStr,
				srcArr : funcStr.split(" "),
				
				// The compiler parameter options
				paramObj : inParamObj,
				
				// The argument state object
				argStateObj : inArgStateObj,
				
				// Original main function naming
				customMainFunctionName : null,
				
				// Reserved namespace used for GPU.js code
				reservedNamespace : "gpu_",
				
				// Current function state, being processed
				currentFunctionNamespace : null,
				
				// Annoymous function number tracking
				annoymousFunctionNumber : 0
			};
		}
		
		/// Parses the source code string
		///
		/// @param  funcStr      the input function string
		/// @param  stateParam   the compiled state tracking
		///
		/// @returns the parsed json obj
		function jison_parseFuncStr( funcStr, stateParam ) {
			var mainObj = parser.parse( "var main = "+funcStr+";" );
			if( mainObj === null ) {
				throw "Failed to parse JS code via JISON";
			}
			
			// take out the function object, outside the main var declarations
			var mainAst = mainObj.body[0].declarations[0].init;
			
			// Capture the original statment code
			stateParam.customMainFunctionName = mainAst.id;
			mainAst.id = "main";
			
			return mainAst;
		}
		
		/// the AST error, with its location. To throw (@TODO add location support)
		///
		/// @param error        the error message output
		/// @param ast          the AST object where the error is
		/// @param stateParam   the compiled state tracking
		function ast_errorOutput(error, ast, stateParam) {
			console.error(error, ast, stateParam);
			return error;
		}
		
		/// Prases the abstract syntax tree, genericially to its respective function
		///
		/// @param ast          the AST object to parse
		/// @param retArr       return array string
		/// @param stateParam   the compiled state tracking
		///
		/// @returns  the prased openclgl string array
		function ast_generic(ast, retArr, stateParam) {
			if(ast === null) {
				throw ast_errorOutput("NULL ast", ast, stateParam);
			} else {
				if (Array.isArray(ast)) {
					for (var i=0; i<ast.length; i++) {
						ast_generic(ast[i], retArr, stateParam);
					}
					return retArr;
				}
				
				switch(ast.type) {
					case "FunctionExpression":
						return ast_FunctionExpression(ast, retArr, stateParam);
					case "ReturnStatement":
						return ast_ReturnStatement(ast, retArr, stateParam);
					case "Literal":
						return ast_Literal(ast, retArr,  stateParam);
					case "BinaryExpression":
						return ast_BinaryExpression(ast, retArr,  stateParam);
					case "Identifier":
						return ast_IdentifierExpression(ast, retArr, stateParam);
					case "AssignmentExpression":
						return ast_AssignmentExpression(ast, retArr, stateParam);
					case "ExpressionStatement":
						return ast_ExpressionStatement(ast, retArr, stateParam);
					case "EmptyStatement":
						return ast_EmptyStatement(ast, retArr, stateParam);
					case "BlockStatement":
						return ast_BlockStatement(ast, retArr, stateParam);
					case "IfStatement":
						return ast_IfStatement(ast, retArr, stateParam);
					case "BreakStatement":
						return ast_BreakStatement(ast, retArr, stateParam);
					case "ContinueStatement":
						return ast_ContinueStatement(ast, retArr, stateParam);
					case "ForStatement":
						return ast_ForStatement(ast, retArr, stateParam);
					case "VariableDeclaration":
						return ast_VariableDeclaration(ast, retArr, stateParam);
					case "VariableDeclarator":
						return ast_VariableDeclarator(ast, retArr, stateParam);
					case "ThisExpression":
						return ast_ThisExpression(ast, retArr, stateParam);
					case "SequenceExpression":
						return ast_SequenceExpression(ast, retArr, stateParam);
					case "UnaryExpression":
						return ast_UnaryExpression(ast, retArr, stateParam);
					case "UpdateExpression":
						return ast_UpdateExpression(ast, retArr, stateParam);
					case "LogicalExpression":
						return ast_LogicalExpression(ast, retArr, stateParam);
					case "MemberExpression":
						return ast_MemberExpression(ast, retArr, stateParam);
					case "CallExpression":
						return ast_CallExpression(ast, retArr, stateParam);
				}
				
				throw ast_errorOutput("Unknown ast type : "+ast.type, ast, stateParam);
			}
		}
		
		/// Prases the abstract syntax tree, to its named function
		///
		/// @param ast   the AST object to parse
		/// @param retArr       return array string
		/// @param stateParam   the compiled state tracking
		///
		/// @returns  the appened retArr
		function ast_FunctionExpression(ast, retArr, stateParam) {
			
			stateParam.currentFunctionNamespace = ast.id;
			
			// Handle parameters tokens
			var paramsNode = ast.params;
			retArr.push("vec4 kernel() {\n");
			
			// Body statement iteration
			for(var i=0; i<ast.body.length; ++i) {
				ast_generic(ast.body[i], retArr, stateParam);
	            retArr.push("\n");
			}
			
			// Function closing
			retArr.push("\n}");
			return retArr;
		}
		
		/// Prases the abstract syntax tree, to return function
		///
		/// @param ast          the AST object to parse
		/// @param retArr       return array string
		/// @param stateParam   the compiled state tracking
		///
		/// @returns  the appened retArr
		function ast_ReturnStatement(ast, retArr, stateParam) {
			if( stateParam.currentFunctionNamespace == "main" ) {
				retArr.push("return encode32(");
				ast_generic(ast.argument, retArr, stateParam);
				retArr.push("); ");
			} else {
				throw ast_errorOutput(
					"Non main function return, is not supported : "+stateParam.currentFunctionNamespace,
					ast, stateParam
				);
			}
			
			return retArr;
		}
		
		/// Prases the abstract syntax tree, literal value
		///
		/// @param ast          the AST object to parse
		/// @param retArr       return array string
		/// @param stateParam   the compiled state tracking
		///
		/// @returns  the appened retArr
		function ast_Literal(ast, retArr, stateParam) {
			
			// Reject non numeric literals
			if( isNaN(ast.value) ) {
				throw ast_errorOutput(
					"Non-numeric literal not supported : "+ast.value,
					ast, stateParam
				);
			}
			
			// Push the literal value as a float/int
			retArr.push( ast.value );
			
			// If it was an int, node made a float
			if( Number.isInteger(ast.value) ) {
				retArr.push(".0");
			}
			
			return retArr;
		}
		
		/// Prases the abstract syntax tree, binary expression
		///
		/// @param ast          the AST object to parse
		/// @param retArr       return array string
		/// @param stateParam   the compiled state tracking
		///
		/// @returns  the appened retArr
		function ast_BinaryExpression(ast, retArr, stateParam) {
			if (ast.operator == "%") {
				retArr.push("mod(");
				ast_generic(ast.left, retArr, stateParam);
				retArr.push(",");
				ast_generic(ast.right, retArr, stateParam);
				retArr.push(")");
			} else {
				ast_generic(ast.left, retArr, stateParam);
				retArr.push(ast.operator);
				ast_generic(ast.right, retArr, stateParam);
			}

			return retArr;
		}
		
		/// Prases the abstract syntax tree, identifier expression
		///
		/// @param ast          the AST object to parse
		/// @param retArr       return array string
		/// @param stateParam   the compiled state tracking
		///
		/// @returns  the appened retArr
		function ast_IdentifierExpression(idtNode, retArr, stateParam) {
			if (idtNode.type != "Identifier") {
				throw ast_errorOutput(
					"IdentifierExpression - not an Identifier",
					ast, stateParam
				);
			}
			
			if (idtNode.name == "gpu_threadX") {
	            retArr.push('threadId.x');
	        } else if (idtNode.name == "gpu_threadY") {
	            retArr.push('threadId.y');
	        } else if (idtNode.name == "gpu_threadZ") {
	            retArr.push('threadId.z');
	        } else {
				retArr.push('user_' + idtNode.name);
			}

			return retArr;
		}
		
		/// Prases the abstract syntax tree, genericially to its respective function
		///
		/// @param ast   the AST object to parse
		///
		/// @returns  the prased openclgl string
		function ast_ForStatement(forNode, retArr, stateParam) {
			if (forNode.type != "ForStatement") {
				throw "error";
			}
			retArr.push("for (float ");
			ast_generic(forNode.init, retArr, stateParam);
			retArr.push(";");
			ast_generic(forNode.test, retArr, stateParam);
			retArr.push(";");
			ast_generic(forNode.update, retArr, stateParam);
			retArr.push(")");
			ast_generic(forNode.body, retArr, stateParam);
			return retArr;
		}

		function ast_AssignmentExpression(assNode, retArr, stateParam) {
			if(assNode.operator == "%=") {
				ast_generic(assNode.left, retArr, stateParam);
				retArr.push("=");
				retArr.push("mod(");
				ast_generic(assNode.left, retArr, stateParam);
				retArr.push(",");
				ast_generic(assNode.right, retArr, stateParam);
				retArr.push(")");
			} else {
				ast_generic(assNode.left, retArr, stateParam);
				retArr.push(assNode.operator);
				ast_generic(assNode.right, retArr, stateParam);
				return retArr;
			}
		}

		function ast_EmptyStatement(eNode, retArr, stateParam) {
			retArr.push(";\n");
			return retArr;
		}

		function ast_BlockStatement(bNode, retArr, stateParam) {
			retArr.push("{\n");
			for (var i = 0; i < bNode.body.length; i++) {
				ast_generic(bNode.body[i], retArr, stateParam);
			}
			retArr.push("}\n");
			return retArr;
		}

		function ast_ExpressionStatement(esNode, retArr, stateParam) {
			ast_generic(esNode.expression, retArr, stateParam);
			retArr.push(";\n");
			return retArr;
		}

		function ast_VariableDeclaration(vardecNode, retArr, stateParam) {
			retArr.push("float ");
			for (var i = 0; i < vardecNode.declarations.length; i++) {
				if (i > 0) {
					retArr.push(",");
				}
				ast_generic(vardecNode.declarations[i], retArr, stateParam);
			}
			retArr.push(";");
			return retArr;
		}

		function ast_VariableDeclarator(ivardecNode, retArr, stateParam) {
			
			ast_generic(ivardecNode.id, retArr, stateParam);
			if (ivardecNode.init !== null) {
				retArr.push("=");
				ast_generic(ivardecNode.init, retArr, stateParam);
			}
			return retArr;
		}

		function ast_IfStatement(ifNode, retArr, stateParam) {
			retArr.push("if(");
			ast_generic(ifNode.test, retArr, stateParam);
			retArr.push(")");
			ast_generic(ifNode.consequent, retArr, stateParam);
			retArr.push("else");
			ast_generic(ifNode.alternate, retArr, stateParam);
			return retArr;

		}

		function ast_Break(brNode, retArr, stateParam) {
			retArr.push("break;\n");
			return retArr;
		}

		function ast_Continue(crNode, retArr, stateParam) {
			retArr.push("continue;\n");
			return retArr;
		}

		function ast_LogicalExpression(logNode, retArr, stateParam) {
			ast_generic(logNode.left, retArr, stateParam);
			ast_generic(logNode.operator, retArr, stateParam);
			ast_generic(logNode.right, retArr, stateParam);
			return retArr;
		}

		function ast_UpdateExpression(uNode, retArr, stateParam) {
			if(uNode.prefix) {
				retArr.push(uNode.operator);
				ast_generic(uNode.argument, retArr, stateParam);
			} else {
				ast_generic(uNode.argument, retArr, stateParam);
				retArr.push(uNode.operator);
			}

			return retArr;
		}

		function ast_UnaryExpression(uNode, retArr, stateParam) {
			if(uNode.prefix) {
				retArr.push(uNode.operator);
				ast_generic(uNode.argument, retArr, stateParam);
			} else {
				ast_generic(uNode.argument, retArr, stateParam);
				retArr.push(uNode.operator);
			}

			return retArr;
		}

		function ast_ThisExpression(tNode, retArr, stateParam) {
			retArr.push("this");

			return retArr;
		}

		function ast_MemberExpression(mNode, retArr, stateParam) {
			if(mNode.computed) {
				if (mNode.object.type == "Identifier") {
	                retArr.push("get(");
	                ast_generic(mNode.object, retArr, stateParam);
	                retArr.push(", vec2(");
	                ast_generic(mNode.object, retArr, stateParam);
	                retArr.push("Size[0],");
	                ast_generic(mNode.object, retArr, stateParam);
	                retArr.push("Size[1]), vec3(");
	                ast_generic(mNode.object, retArr, stateParam);
	                retArr.push("Dim[0],");
	                ast_generic(mNode.object, retArr, stateParam);
	                retArr.push("Dim[1],");
	                ast_generic(mNode.object, retArr, stateParam);
	                retArr.push("Dim[2]");
	                retArr.push("), ");
	            } else {
	                ast_generic(mNode.object, retArr, stateParam);
	                var last = retArr.pop();
	                retArr.push(",");
	            }
	            ast_generic(mNode.property, retArr, stateParam);
				retArr.push(")");
			} else {
				ast_generic(mNode.object, retArr, stateParam);
				retArr.push(".");
				ast_generic(mNode.property, retArr, stateParam);
			}
			return retArr;
		}

		function ast_SequenceExpression(sNode, retArr, stateParam) {
			for (var i = 0; i < sNode.expressions.length; i++) {
				if (i > 0) {
					retArr.push(",");
				}
				ast_generic(sNode.expressions, retArr, stateParam);
			}
			return retArr;
		}
		
		/// Prases the abstract syntax tree, binary expression
		///
		/// @param ast          the AST object to parse
		/// @param retArr       return array string
		/// @param stateParam   the compiled state tracking
		///
		/// @returns  the appened retArr
		function ast_CallExpression(ast, retArr, stateParam) {
			var mathPrefix = "gpu_math_";
			var mathPrefixLen = mathPrefix.length;
			
			var fName = ast.callee.name;
			if( fName.slice(0,mathPrefixLen) == mathPrefix ) {
				var mathSuffix = fName.slice(mathPrefixLen);
				
				retArr.push(mathSuffix);
				retArr.push("(");
				
				if(ast.arguments) {
					var aLen = ast.arguments.length;
					for( var i = 0; i < aLen; ++i ) {
						ast_generic(ast.arguments[i], retArr, stateParam);
						
						if( i+1 < aLen ) {
							retArr.push(", ");
						}
					}
				}
				
				retArr.push(")");
			} else {
				throw ast_errorOutput(
					"Unknown CallExpression : "+mathPrefix,
					ast, stateParam
				);
			}
			
			return retArr;
		}
		
		
		/// The function string to webCLGL code generator
		///
		/// @param   funcStr       original function string
		/// @param   paramObj      prarameter state object
		/// @param   _threadDim    thread dimension config
		/// @param   _blockDim     block dimension config
		/// @param   argStateObj   calling argument state object
		///
		/// @returns webCLGL competible function string
		function compileToGlsl( funcStr, paramObj, argStateObj ) {
	        var stateObj = jison_defaultStateParam(funcStr, paramObj, argStateObj);
			var astOutputObj = jison_parseFuncStr(funcStr, stateObj);
			var retArr = [];
			
			ast_generic( astOutputObj, retArr, stateObj );
			var outputStr = retArr.join("");
			
			return outputStr;
		}
		
		return compileToGlsl;
	})();
})(GPU);
