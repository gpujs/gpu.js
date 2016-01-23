/** 
* Utilities
* @class
* @constructor
*/
WebCLGLUtils = function() { 
	
};

/** @private  */
WebCLGLUtils.prototype.isPowerOfTwo = function(x) {
    return (x & (x - 1)) == 0;
};
/** @private  */
WebCLGLUtils.prototype.nextHighestPowerOfTwo = function(x) {
    --x;
    for (var i = 1; i < 32; i <<= 1) {
        x = x | x >> i;
    }
    return x + 1;
};

/**
* @private 
*/
WebCLGLUtils.prototype.loadQuad = function(node, length, height) {
	var l=(length==undefined)?0.5:length;
	var h=(height==undefined)?0.5:height;
	this.vertexArray = [-l, -h, 0.0,
	                     l, -h, 0.0,
	                     l,  h, 0.0,
	                    -l,  h, 0.0];
	
	this.textureArray = [0.0, 0.0, 0.0,
	                     1.0, 0.0, 0.0,
	                     1.0, 1.0, 0.0,
	                     0.0, 1.0, 0.0];
	
	this.indexArray = [0, 1, 2,      0, 2, 3];
	
	var meshObject = new Object;
	meshObject.vertexArray = this.vertexArray;
	meshObject.vertexItemSize = this.vertexItemSize;
	meshObject.vertexNumItems = this.vertexNumItems;
	
	meshObject.textureArray = this.textureArray;
	meshObject.textureItemSize = this.textureItemSize;
	meshObject.textureNumItems = this.textureNumItems;
	
	meshObject.indexArray = this.indexArray;
	meshObject.indexItemSize = this.indexItemSize;
	meshObject.indexNumItems = this.indexNumItems;
	
	return meshObject;
};
/** @private **/
WebCLGLUtils.prototype.getWebGLContextFromCanvas = function(canvas, ctxOpt) {
	var gl;
	try {
		if(ctxOpt == undefined) gl = canvas.getContext("webgl");
		else gl = canvas.getContext("webgl", ctxOpt);
	} catch(e) {
		gl = null;
    }
	if(gl == null) {
		try {
			if(ctxOpt == undefined) gl = canvas.getContext("experimental-webgl");
			else gl = canvas.getContext("experimental-webgl", ctxOpt);
		} catch(e) {
			gl = null;
		}
	}
	if(gl == null) gl = false;
	return gl;
};
/**
 * @private 
 */
WebCLGLUtils.prototype.createShader = function(gl, name, sourceVertex, sourceFragment, shaderProgram) {
	var _sv = false, _sf = false;
	
	var makeDebug = (function(infoLog, shader) {
		console.log(infoLog);
		
		var arrErrors = [];
		var errors = infoLog.split("\n");
		for(var n = 0, f = errors.length; n < f; n++) {
			if(errors[n].match(/^ERROR/gim) != null) {
				var expl = errors[n].split(':');
				var line = parseInt(expl[2]);
				arrErrors.push([line,errors[n]]);
			}
		}
		var sour = gl.getShaderSource(shader).split("\n");
		sour.unshift("");
		for(var n = 0, f = sour.length; n < f; n++) {
			var lineWithError = false;
			var errorStr = '';
			for(var e = 0, fe = arrErrors.length; e < fe; e++) {
				if(n == arrErrors[e][0]) {
					lineWithError = true;
					errorStr = arrErrors[e][1];
					break;
				}
			}
			if(lineWithError == false) {
				console.log("%c"+n+' %c'+sour[n], "color:black", "color:blue");
			} else {
				console.log('%c►►%c'+n+' %c'+sour[n]+'\n%c'+errorStr, "color:red", "color:black", "color:blue", "color:red");
			}
		}
	}).bind(this);
	
	
	var shaderVertex = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(shaderVertex, sourceVertex);
	gl.compileShader(shaderVertex);
	if (!gl.getShaderParameter(shaderVertex, gl.COMPILE_STATUS)) {
		alert(name+' ERROR (vertex program). See console.');
		
		var infoLog = gl.getShaderInfoLog(shaderVertex);
		console.log("%c"+name+' ERROR (vertex program)', "color:red");
		
		if(infoLog != undefined)
			makeDebug(infoLog, shaderVertex);
	} else  {
		gl.attachShader(shaderProgram, shaderVertex);
		_sv = true;
	}
	
	var shaderFragment = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(shaderFragment, sourceFragment);
	gl.compileShader(shaderFragment);
	if (!gl.getShaderParameter(shaderFragment, gl.COMPILE_STATUS)) {
		alert(name+' ERROR (fragment program). See console.');
		
		var infoLog = gl.getShaderInfoLog(shaderFragment);
		console.log("%c"+name+' ERROR (fragment program)', "color:red");
		
		if(infoLog != undefined)
			makeDebug(infoLog, shaderFragment);
	} else {
		gl.attachShader(shaderProgram, shaderFragment);	
		_sf = true;
	}
	
	if(_sv == true && _sf == true) {
		gl.linkProgram(shaderProgram);
		if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
			alert('Error in shader '+name);
			console.log('Error shader program '+name+':\n ');
			if(gl.getProgramInfoLog(shaderProgram) != undefined) {
				console.log(gl.getProgramInfoLog(shaderProgram));
			} 
			return false;
		} else {
			return true;
		}
	} else {
		return false;
	}
};


/**
* Get Uint8Array from HTMLImageElement
* @returns {Uint8Array}
* @param {HTMLImageElement} imageElement
*/
WebCLGLUtils.prototype.getUint8ArrayFromHTMLImageElement = function(imageElement) {
	var e = document.createElement('canvas');
	e.width = imageElement.width;
	e.height = imageElement.height;
	var ctx2D_tex = e.getContext("2d");		
	ctx2D_tex.drawImage(imageElement, 0, 0);
	var arrayTex = ctx2D_tex.getImageData(0, 0, imageElement.width, imageElement.height);

    return arrayTex.data;
};
/**
* Dot product vector4float
* @private 
*/
WebCLGLUtils.prototype.dot4 = function(vector4A,vector4B) {
	return vector4A[0]*vector4B[0] + vector4A[1]*vector4B[1] + vector4A[2]*vector4B[2] + vector4A[3]*vector4B[3];
};
/**
* Compute the fractional part of the argument. fract(pi)=0.14159265...
* @private 
*/
WebCLGLUtils.prototype.fract = function(number) {
	return number - Math.floor(number);
};
/**
* Pack 1float (0.0-1.0) to 4float rgba (0.0-1.0, 0.0-1.0, 0.0-1.0, 0.0-1.0)
* @private 
*/
WebCLGLUtils.prototype.pack = function(v) {
	var bias = [1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0];

	var r = v;
	var g = this.fract(r * 255.0);
	var b = this.fract(g * 255.0);
	var a = this.fract(b * 255.0);
	var colour = [r, g, b, a];
	
	var dd = [colour[1]*bias[0],colour[2]*bias[1],colour[3]*bias[2],colour[3]*bias[3]];
	
	return [colour[0]-dd[0],colour[1]-dd[1],colour[2]-dd[2],colour[3]-dd[3] ];
};
/**
* Unpack 4float rgba (0.0-1.0, 0.0-1.0, 0.0-1.0, 0.0-1.0) to 1float (0.0-1.0)
* @private 
*/
WebCLGLUtils.prototype.unpack = function(colour) {
	var bitShifts = [1.0, 1.0/255.0, 1.0/(255.0*255.0), 1.0/(255.0*255.0*255.0)];
	return this.dot4(colour, bitShifts);
};
/**
* Get pack GLSL function string
* @returns {String}
*/
WebCLGLUtils.prototype.packGLSLFunctionString = function() {
	return 'vec4 pack (float depth) {\n'+
				'const vec4 bias = vec4(1.0 / 255.0,\n'+
							'1.0 / 255.0,\n'+
							'1.0 / 255.0,\n'+
							'0.0);\n'+

				'float r = depth;\n'+
				'float g = fract(r * 255.0);\n'+
				'float b = fract(g * 255.0);\n'+
				'float a = fract(b * 255.0);\n'+
				'vec4 colour = vec4(r, g, b, a);\n'+
				
				'return colour - (colour.yzww * bias);\n'+
			'}\n';
};
/**
* Get unpack GLSL function string
* @returns {String}
*/
WebCLGLUtils.prototype.unpackGLSLFunctionString = function() {
	return 'float unpack (vec4 colour) {\n'+
				'const vec4 bitShifts = vec4(1.0,\n'+
								'1.0 / 255.0,\n'+
								'1.0 / (255.0 * 255.0),\n'+
								'1.0 / (255.0 * 255.0 * 255.0));\n'+
				'return dot(colour, bitShifts);\n'+
			'}\n';
};
