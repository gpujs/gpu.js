/*
The MIT License (MIT)

Copyright (c) <2013> <Roberto Gonzalez. http://stormcolour.appspot.com/>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
 */
/**
* Class for parallelization of calculations using the WebGL context similarly to webcl. This library use floating point texture capabilities (OES_texture_float)
* @class
* @constructor
* @param {WebGLRenderingContext} [webglcontext=undefined] your WebGLRenderingContext
*/
WebCLGL = function(webglcontext) {
	this.utils = new WebCLGLUtils();

	// WEBGL CONTEXT
	this.e = undefined;
	if(webglcontext == undefined) {
		this.e = document.createElement('canvas');
		this.e.width = 32;
		this.e.height = 32;
		this.gl = this.utils.getWebGLContextFromCanvas(this.e, {antialias: false});
	} else this.gl = webglcontext;

	this.gl.getExtension('OES_texture_float');
	this.gl.getExtension('OES_texture_float_linear');
	this.gl.getExtension('OES_element_index_uint');

	var highPrecisionSupport = this.gl.getShaderPrecisionFormat(this.gl.FRAGMENT_SHADER, this.gl.HIGH_FLOAT);
	this.precision = (highPrecisionSupport.precision != 0) ? 'precision highp float;\n\nprecision highp int;\n\n' : 'precision lowp float;\n\nprecision lowp int;\n\n';



	// QUAD
	var mesh = this.utils.loadQuad(undefined,1.0,1.0);
	this.vertexBuffer_QUAD = this.gl.createBuffer();
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer_QUAD);
	this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(mesh.vertexArray), this.gl.STATIC_DRAW);
	this.textureBuffer_QUAD = this.gl.createBuffer();
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureBuffer_QUAD);
	this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(mesh.textureArray), this.gl.STATIC_DRAW);
	this.indexBuffer_QUAD = this.gl.createBuffer();
	this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer_QUAD);
	this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indexArray), this.gl.STATIC_DRAW);



	// SHADER READPIXELS
	var sourceVertex = 	this.precision+
			'attribute vec3 aVertexPosition;\n'+
			'attribute vec2 aTextureCoord;\n'+

			'varying vec2 vTextureCoord;\n'+

			'void main(void) {\n'+
				'gl_Position = vec4(aVertexPosition, 1.0);\n'+
				'vTextureCoord = aTextureCoord;\n'+
			'}\n';
	var sourceFragment = this.precision+
			'uniform sampler2D sampler_buffer;\n'+

			'uniform int u_vectorValue;\n'+
			'uniform int u_offset;\n'+

			'varying vec2 vTextureCoord;\n'+

			this.utils.packGLSLFunctionString()+

			'void main(void) {\n'+
				'vec4 tex = texture2D(sampler_buffer, vTextureCoord);'+
				'if(u_offset > 0) {'+
					'float offset = float(u_offset);'+
					'if(u_vectorValue == 0) gl_FragColor = pack((tex.r+offset)/(offset*2.0));\n'+
					'if(u_vectorValue == 1) gl_FragColor = pack((tex.g+offset)/(offset*2.0));\n'+
					'if(u_vectorValue == 2) gl_FragColor = pack((tex.b+offset)/(offset*2.0));\n'+
					'if(u_vectorValue == 3) gl_FragColor = pack((tex.a+offset)/(offset*2.0));\n'+
				'} else {'+
					'if(u_vectorValue == 0) gl_FragColor = pack(tex.r);\n'+
					'if(u_vectorValue == 1) gl_FragColor = pack(tex.g);\n'+
					'if(u_vectorValue == 2) gl_FragColor = pack(tex.b);\n'+
					'if(u_vectorValue == 3) gl_FragColor = pack(tex.a);\n'+
				'}'+
			'}\n';

	this.shader_readpixels = this.gl.createProgram();
	this.utils.createShader(this.gl, "CLGLREADPIXELS", sourceVertex, sourceFragment, this.shader_readpixels);

	this.u_offset = this.gl.getUniformLocation(this.shader_readpixels, "u_offset");
	this.u_vectorValue = this.gl.getUniformLocation(this.shader_readpixels, "u_vectorValue");

	this.sampler_buffer = this.gl.getUniformLocation(this.shader_readpixels, "sampler_buffer");

	this.attr_VertexPos = this.gl.getAttribLocation(this.shader_readpixels, "aVertexPosition");
	this.attr_TextureCoord = this.gl.getAttribLocation(this.shader_readpixels, "aTextureCoord");



	// SHADER COPYTEXTURE
	var sourceVertex = 	this.precision+
		'attribute vec3 aVertexPosition;\n'+
		'attribute vec2 aTextureCoord;\n'+

		'varying vec2 vTextureCoord;\n'+

		'void main(void) {\n'+
			'gl_Position = vec4(aVertexPosition, 1.0);\n'+
			'vTextureCoord = aTextureCoord;\n'+
		'}';
	var sourceFragment = this.precision+

		'uniform sampler2D sampler_toSave;\n'+

		'varying vec2 vTextureCoord;\n'+

		'void main(void) {\n'+
			'vec4 texture = texture2D(sampler_toSave, vTextureCoord);\n'+
			'gl_FragColor = texture;'+
		'}';
	this.shader_copyTexture = this.gl.createProgram();
	this.utils.createShader(this.gl, "CLGLCOPYTEXTURE", sourceVertex, sourceFragment, this.shader_copyTexture);

	this.attr_copyTexture_pos = this.gl.getAttribLocation(this.shader_copyTexture, "aVertexPosition");
	this.attr_copyTexture_tex = this.gl.getAttribLocation(this.shader_copyTexture, "aTextureCoord");

	this.sampler_copyTexture_toSave = this.gl.getUniformLocation(this.shader_copyTexture, "sampler_toSave");
};

/**
* Copy one WebCLGLBuffer|WebGLTexture to another WebCLGLBuffer|WebGLTexture.
* @param {WebCLGLBuffer|WebGLTexture} valueToRead The buffer to read.
* @param {WebCLGLBuffer|WebGLTexture} valueToWrite The buffer to write.
* @example
* // This is useful if you need to write about a buffer and also want to read it by passing it as an argument in main().
* // If this is the case, you have to create a temporary buffer for the writing and take the original buffer for the reading:
* kernelA.setKernelArg (x, ORIGINALbuffer);
* webCLGL.enqueueNDRangeKernel (kernelA, TMPbuffer);
* kernelB.setKernelArg (x, ORIGINALbuffer);
* webCLGL.enqueueNDRangeKernel (kernelB, anotherBuffer);
* // Then overwrite the original with the temporary:
* webCLGL.copyTexture (TMPbuffer, ORIGINALbuffer);
*/
WebCLGL.prototype.copy = function(valuesToRead, valuesToWrite) {
	if(valuesToRead instanceof WebCLGLBuffer) {
		for(var i=0; i < valuesToRead.items.length; i++) {
			valueToRead = valuesToRead.items[i];
			valueToWrite = valuesToWrite.items[i];

			this.copyItem(valueToRead, valueToWrite);
		}
	} else if(valuesToRead instanceof WebGLTexture) // WebGLTexture
		this.copyItem(valuesToRead, valuesToWrite);
};
WebCLGL.prototype.copyItem = function(valueToRead, valueToWrite) {
	if(valueToRead instanceof WebCLGLBufferItem) {
		this.gl.viewport(0, 0, valueToWrite.W, valueToWrite.H);
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, valueToWrite.fBuffer);
		this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, valueToWrite.textureData, 0);
	} else if(valueToRead instanceof WebGLTexture)
		this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, valueToWrite, 0);


	this.gl.useProgram(this.shader_copyTexture);

	this.gl.activeTexture(this.gl.TEXTURE0);
	var toRead = (valueToRead instanceof WebGLTexture) ? valueToRead : valueToRead.textureData;
	this.gl.bindTexture(this.gl.TEXTURE_2D, toRead);
	this.gl.uniform1i(this.sampler_copyTexture_toSave, 0);


	this.gl.enableVertexAttribArray(this.attr_copyTexture_pos);
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer_QUAD);
	this.gl.vertexAttribPointer(this.attr_copyTexture_pos, 3, this.gl.FLOAT, false, 0, 0);

	this.gl.enableVertexAttribArray(this.attr_copyTexture_tex);
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureBuffer_QUAD);
	this.gl.vertexAttribPointer(this.attr_copyTexture_tex, 3, this.gl.FLOAT, false, 0, 0);

	this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer_QUAD);
	this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
};

/**
* Create a empty WebCLGLBuffer
* @param {Int|Array<Float>} length Length of buffer or Array with width and height values if is for a WebGLTexture
* @param {String} [type="FLOAT"] type FLOAT4 OR FLOAT
* @param {Int} [offset=0] If 0 the range is from 0.0 to 1.0 else if >0 then the range is from -offset.0 to offset.0
* @param {Bool} [linear=false] linear texParameteri type for the WebGLTexture
* @param {String} [mode="FRAGMENT"] Mode for this buffer. "FRAGMENT", "VERTEX", "VERTEX_INDEX", "VERTEX_FROM_KERNEL", "VERTEX_AND_FRAGMENT"
* @param {Array} [splits=[length]] Splits length for this buffer.
* @returns {WebCLGLBuffer}
*/
WebCLGL.prototype.createBuffer = function(length, type, offset, linear, mode, splits) {
	return new WebCLGLBuffer(this.gl, length, type, offset, linear, mode, splits);
};

/**
* Create a kernel
* @returns {WebCLGLKernel}
* @param {String} [source=undefined]
* @param {String} [header=undefined] Additional functions
*/
WebCLGL.prototype.createKernel = function(source, header) {
	var webclglKernel = new WebCLGLKernel(this.gl, source, header);
	return webclglKernel;
};

/**
* Create a vertex and fragment programs for a WebGL graphical representation after some enqueueNDRangeKernel
* @returns {WebCLGLVertexFragmentProgram}
* @param {String} [vertexSource=undefined]
* @param {String} [vertexHeader=undefined]
* @param {String} [fragmentSource=undefined]
* @param {String} [fragmentHeader=undefined]
*/
WebCLGL.prototype.createVertexFragmentProgram = function(vertexSource, vertexHeader, fragmentSource, fragmentHeader) {
	var webclglVertexFragmentProgram = new WebCLGLVertexFragmentProgram(this.gl, vertexSource, vertexHeader, fragmentSource, fragmentHeader);
	return webclglVertexFragmentProgram;
};

/**
* Create work
* @returns {WebCLGLWork}
*/
WebCLGL.prototype.createWork = function(offset) {
	var webclglWork = new WebCLGLWork(this, offset);
	return webclglWork;
};

/**
* Write on buffer
* @type Void
* @param {WebCLGLBuffer} buffer
* @param {Array|Float32Array|Uint8Array|WebGLTexture|HTMLImageElement} array
* @param {Bool} [flip=false]
*/
WebCLGL.prototype.enqueueWriteBuffer = function(buffer, arr, flip) {
	if(buffer.mode == "FRAGMENT" || buffer.mode == "VERTEX_FROM_KERNEL" || buffer.mode == "VERTEX_AND_FRAGMENT") {
		buffer.writeWebGLTextureBuffer(arr, flip);
	}
	if(buffer.mode == "VERTEX" || buffer.mode == "VERTEX_INDEX" || buffer.mode == "VERTEX_FROM_KERNEL" || buffer.mode == "VERTEX_AND_FRAGMENT") {
		buffer.writeWebGLBuffer(arr, flip);
	}
};

/**
* Perform calculation and save the result on a WebCLGLBuffer
* @param {WebCLGLKernel} webCLGLKernel
* @param {WebCLGLBuffer} [webCLGLBuffer=undefined]
* @param {Int} [geometryLength=1] - Length of geometry (1 for points, 3 for triangles...)
*/
WebCLGL.prototype.enqueueNDRangeKernel = function(webCLGLKernel, webCLGLBuffers, geometryLength) {
	if(webCLGLBuffers != undefined) {
		for(var i=0; i < webCLGLBuffers.items.length; i++) {
			webCLGLBuffer = webCLGLBuffers.items[i];

			this.gl.viewport(0, 0, webCLGLBuffer.W, webCLGLBuffer.H);
			this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, webCLGLBuffer.fBuffer);
			this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, webCLGLBuffer.textureData, 0);

			this.enqueueNDRangeKernelNow(webCLGLKernel, i, geometryLength);
		}
	} else {
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

		this.enqueueNDRangeKernelNow(webCLGLKernel, 0, geometryLength);
	}
};

/**
 * @private
 * @param {WebCLGLKernel} webCLGLKernel
 * @param {Int} item
 * @param {Int} [geometryLength=1] - Length of geometry (1 for points, 3 for triangles...)
 */
WebCLGL.prototype.enqueueNDRangeKernelNow = function(webCLGLKernel, i, geometryLength) {
	var kp = webCLGLKernel.kernelPrograms[0];
	this.gl.useProgram(kp.kernel);

	var _geometryLength = (geometryLength != undefined) ? geometryLength : 1;
	this.gl.uniform1f(kp.uGeometryLength, _geometryLength);
	
	var currentTextureUnit = 0;
	for(var n = 0, f = kp.samplers.length; n < f; n++) {
		var ks = kp.samplers[n];

		if(currentTextureUnit < 16)
			this.gl.activeTexture(this.gl["TEXTURE"+currentTextureUnit]);
		else
			this.gl.activeTexture(this.gl["TEXTURE16"]);

		if(ks.value != undefined) {
			var item = (ks.value.items[i] != undefined) ? ks.value.items[i] : ks.value.items[0];
			this.gl.uniform1f(kp.uBufferWidth, item.W);

			this.gl.bindTexture(this.gl.TEXTURE_2D, item.textureData);
			this.gl.uniform1i(ks.location[0], currentTextureUnit);
		} else {
			this.gl.bindTexture(this.gl.TEXTURE_2D, null);
		}
		currentTextureUnit++;
	}
	for(var n = 0, f = kp.uniforms.length; n < f; n++) {
		var ku = kp.uniforms[n];
		if(ku.value != undefined)
			if(ku.type == 'float')
				this.gl.uniform1f(ku.location[0], ku.value);
			else if(ku.type == 'float4')
				this.gl.uniform4f(ku.location[0], ku.value[0], ku.value[1], ku.value[2], ku.value[3]);
			else if(ku.type == 'mat4')
				this.gl.uniformMatrix4fv(ku.location[0], false, ku.value);
	}


	this.gl.enableVertexAttribArray(kp.attr_VertexPos);
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer_QUAD);
	this.gl.vertexAttribPointer(kp.attr_VertexPos, 3, this.gl.FLOAT, false, 0, 0);

	this.gl.enableVertexAttribArray(kp.attr_TextureCoord);
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureBuffer_QUAD);
	this.gl.vertexAttribPointer(kp.attr_TextureCoord, 3, this.gl.FLOAT, false, 0, 0);

	this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer_QUAD);
	this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
};

/**
* Perform WebGL graphical representation
* @param {WebCLGLVertexFragmentProgram} webCLGLVertexFragmentProgram
* @param {WebCLGLBuffer} buffer Buffer to draw type (type indices or vertex)
* @param {Int} [drawMode=4] 0=POINTS, 3=LINE_STRIP, 2=LINE_LOOP, 1=LINES, 5=TRIANGLE_STRIP, 6=TRIANGLE_FAN and 4=TRIANGLES
* @param {Int} [geometryLength=1] - Length of geometry (1 for points, 3 for triangles...)
*/
WebCLGL.prototype.enqueueVertexFragmentProgram = function(webCLGLVertexFragmentProgram, buffer, drawMode, geometryLength) {
	var Dmode = (drawMode != undefined) ? drawMode : 4;
	var _geometryLength = (geometryLength != undefined) ? geometryLength : 1;

	this.gl.useProgram(webCLGLVertexFragmentProgram.vertexFragmentProgram);

	if(webCLGLVertexFragmentProgram.vertexAttributes[0].value != undefined) {
		for(var i=0; i < webCLGLVertexFragmentProgram.vertexAttributes[0].value.items.length; i++) {
			var bufferItem = webCLGLVertexFragmentProgram.vertexAttributes[0].value.items[i];

			this.gl.uniform1f(webCLGLVertexFragmentProgram.uOffset, bufferItem.offset);
			this.gl.uniform1f(webCLGLVertexFragmentProgram.uGeometryLength, _geometryLength);

			var currentTextureUnit = 0;
			for(var n = 0, f = webCLGLVertexFragmentProgram.vertexAttributes.length; n < f; n++) {
				var va = webCLGLVertexFragmentProgram.vertexAttributes[n];
				if(va.value != undefined) {
					var item = (va.value.items[i] != undefined) ? va.value.items[i] : va.value.items[0];


					if(va.type == 'buffer_float4_fromKernel' || va.type == 'buffer_float_fromKernel') {
						if(currentTextureUnit < 16)
							this.gl.activeTexture(this.gl["TEXTURE"+currentTextureUnit]);
						else
							this.gl.activeTexture(this.gl["TEXTURE16"]);

						this.gl.bindTexture(this.gl.TEXTURE_2D, item.textureData);
						this.gl.uniform1i(va.location[0], currentTextureUnit);

						this.gl.uniform1f(webCLGLVertexFragmentProgram.uBufferWidth, item.W);

						currentTextureUnit++;
					} else if(va.type == 'buffer_float4') {
						this.gl.enableVertexAttribArray(va.location[0]);
						this.gl.bindBuffer(this.gl.ARRAY_BUFFER, item.vertexData0);
						this.gl.vertexAttribPointer(va.location[0], 4, this.gl.FLOAT, false, 0, 0);
					} else if(va.type == 'buffer_float') {
						this.gl.enableVertexAttribArray(va.location[0]);
						this.gl.bindBuffer(this.gl.ARRAY_BUFFER, item.vertexData0);
						this.gl.vertexAttribPointer(va.location[0], 1, this.gl.FLOAT, false, 0, 0);
					}
				} else {
					if(va.type == 'buffer_float4_fromKernel' || va.type == 'buffer_float_fromKernel') {
						if(currentTextureUnit < 16)
							this.gl.activeTexture(this.gl["TEXTURE"+currentTextureUnit]);
						else
							this.gl.activeTexture(this.gl["TEXTURE16"]);

						this.gl.bindTexture(this.gl.TEXTURE_2D, null);

						currentTextureUnit++;
					} else if(va.type == 'buffer_float4') {
						this.gl.disableVertexAttribArray(va.location[0]);
					} else if(va.type == 'buffer_float') {
						this.gl.disableVertexAttribArray(va.location[0]);
					}
				}
			}
			//var currentTextureUnit = 0;
			for(var n = 0, f = webCLGLVertexFragmentProgram.fragmentSamplers.length; n < f; n++) {
				var fs = webCLGLVertexFragmentProgram.fragmentSamplers[n];

				if(currentTextureUnit < 16)
					this.gl.activeTexture(this.gl["TEXTURE"+currentTextureUnit]);
				else
					this.gl.activeTexture(this.gl["TEXTURE16"]);

				if(fs.value != undefined) {
					var item = (fs.value.items[i] != undefined) ? fs.value.items[i] : fs.value.items[0];

					this.gl.bindTexture(this.gl.TEXTURE_2D, item.textureData);
					this.gl.uniform1i(fs.location[0], currentTextureUnit);
				} else {
					this.gl.bindTexture(this.gl.TEXTURE_2D, null);
				}
				currentTextureUnit++;
			}

			for(var n = 0, f = webCLGLVertexFragmentProgram.vertexUniforms.length; n < f; n++) {
				var vu = webCLGLVertexFragmentProgram.vertexUniforms[n];
				if(vu.value != undefined) {
					if(vu.type == 'float')
						this.gl.uniform1f(vu.location[0], vu.value);
					else if(vu.type == 'float4')
						this.gl.uniform4f(vu.location[0], vu.value[0], vu.value[1], vu.value[2], vu.value[3]);
					else if(vu.type == 'mat4')
						this.gl.uniformMatrix4fv(vu.location[0], false, vu.value);
				}
			}

			for(var n = 0, f = webCLGLVertexFragmentProgram.fragmentUniforms.length; n < f; n++) {
				var fu = webCLGLVertexFragmentProgram.fragmentUniforms[n];
				if(fu.value != undefined) {
					if(fu.type == 'float')
						this.gl.uniform1f(fu.location[0], fu.value);
					else if(fu.type == 'float4')
						this.gl.uniform4f(fu.location[0], fu.value[0], fu.value[1], fu.value[2], fu.value[3]);
					else if(fu.type == 'mat4')
						this.gl.uniformMatrix4fv(fu.location[0], false, fu.value);
				}
			}

			if(buffer.mode == "VERTEX_INDEX") {
				this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer.items[i].vertexData0);
				this.gl.drawElements(Dmode, buffer.items[i].length, this.gl.UNSIGNED_SHORT, 0);
			} else {
				this.gl.drawArrays(Dmode, 0, buffer.items[i].length);
			}
		}
	}
};

/**
* Get the internally WebGLTexture (type FLOAT), if the WebGLRenderingContext was given.
* @returns {WebGLTexture}
*/
WebCLGL.prototype.enqueueReadBuffer_WebGLTexture = function(buffer) {
	return buffer.items[0].textureData;
};

/**
* Get RGBAUint8Array array from a WebCLGLBuffer <br>
* Read buffer in a specifics WebGL 32bit channel and return the data in one array of packets RGBA_Uint8Array <br>
* @param {WebCLGLBuffer} buffer
* @param {Int} channel Channel to read
* @returns {Uint8Array}
**/
WebCLGL.prototype.enqueueReadBuffer = function(buffer, item) {
	this.gl.uniform1i(this.u_vectorValue, item);

	this.gl.uniform1i(this.u_offset, buffer.offset);

	this.gl.activeTexture(this.gl.TEXTURE0);
	this.gl.bindTexture(this.gl.TEXTURE_2D, buffer.textureData);
	this.gl.uniform1i(this.sampler_buffer, 0);


	this.gl.enableVertexAttribArray(this.attr_VertexPos);
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer_QUAD);
	this.gl.vertexAttribPointer(this.attr_VertexPos, 3, buffer._supportFormat, false, 0, 0);

	this.gl.enableVertexAttribArray(this.attr_TextureCoord);
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureBuffer_QUAD);
	this.gl.vertexAttribPointer(this.attr_TextureCoord, 3, buffer._supportFormat, false, 0, 0);

	this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer_QUAD);
	this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);

	var arrLength = buffer.length*4;
	if(item == 0) {
		this.gl.readPixels(0, 0, buffer.W, buffer.H, this.gl.RGBA, this.gl.UNSIGNED_BYTE, buffer.outArray4Uint8ArrayX);
		return buffer.outArray4Uint8ArrayX.slice(0, arrLength);
	} else if(item == 1) {
		this.gl.readPixels(0, 0, buffer.W, buffer.H, this.gl.RGBA, this.gl.UNSIGNED_BYTE, buffer.outArray4Uint8ArrayY);
		return buffer.outArray4Uint8ArrayY.slice(0, arrLength);
	} else if(item == 2) {
		this.gl.readPixels(0, 0, buffer.W, buffer.H, this.gl.RGBA, this.gl.UNSIGNED_BYTE, buffer.outArray4Uint8ArrayZ);
		return buffer.outArray4Uint8ArrayZ.slice(0, arrLength);
	} else if(item == 3) {
		this.gl.readPixels(0, 0, buffer.W, buffer.H, this.gl.RGBA, this.gl.UNSIGNED_BYTE, buffer.outArray4Uint8ArrayW);
		return buffer.outArray4Uint8ArrayW.slice(0, arrLength);
	}
};

/** @private **/
WebCLGL.prototype.prepareViewportForBufferRead = function(buffer) {
	this.gl.viewport(0, 0, buffer.W, buffer.H);
	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
	if(this.e != undefined) {
		this.e.width = buffer.W;
		this.e.height = buffer.H;
	}
};

/**
* Get 4 RGBAUint8Array arrays from a WebCLGLBuffer type FLOAT4 <br>
* Internally performs four calls to enqueueReadBuffer and return the data in one array of four packets RGBA_Uint8Array
* @param {WebCLGLBuffer} buffer
**/
WebCLGL.prototype.enqueueReadBuffer_Packet4Uint8Array_Float4 = function(buffers) {
	if(buffers.items[0].type == "FLOAT4") {
		for(var i=0; i < buffers.items.length; i++) {
			buffer = buffers.items[i];

			this.prepareViewportForBufferRead(buffer);
			this.gl.useProgram(this.shader_readpixels);

			buffer.Packet4Uint8Array_Float4 = [	this.enqueueReadBuffer(buffer, 0),
								              	this.enqueueReadBuffer(buffer, 1),
								              	this.enqueueReadBuffer(buffer, 2),
								              	this.enqueueReadBuffer(buffer, 3)];
		}
	}
};

/**
* Get 4 Float32Array arrays from a WebCLGLBuffer type FLOAT4 <br>
* Internally performs one calls to enqueueReadBuffer and return the data in one array of four Float32Array
* @param {WebCLGLBuffer} buffer
* @returns {Array<Array>}
*/
WebCLGL.prototype.enqueueReadBuffer_Float4 = function(buffers) {
	var Float4_Un = [[],[],[],[]];
	if(buffers.items[0].type == "FLOAT4") {
		for(var i=0; i < buffers.items.length; i++) {
			buffer = buffers.items[i];

			this.prepareViewportForBufferRead(buffer);
			this.gl.useProgram(this.shader_readpixels);

			buffer.Packet4Uint8Array_Float4 = [	this.enqueueReadBuffer(buffer, 0),
								              	this.enqueueReadBuffer(buffer, 1),
								              	this.enqueueReadBuffer(buffer, 2),
								              	this.enqueueReadBuffer(buffer, 3)];
			buffer.Float4 = [];

			for(var n=0, fn= 4; n < fn; n++) {
				var arr = buffer.Packet4Uint8Array_Float4[n];

				var outArrayFloat32Array = new Float32Array((buffer.W*buffer.H));
				for(var nb = 0, fnb = arr.length/4; nb < fnb; nb++) {
					var idd = nb*4;
					if(buffer.offset>0) outArrayFloat32Array[nb] = (this.utils.unpack([arr[idd+0]/255,
																								arr[idd+1]/255,
																								arr[idd+2]/255,
																								arr[idd+3]/255])*(buffer.offset*2))-buffer.offset;
					else outArrayFloat32Array[nb] = (this.utils.unpack([	arr[idd+0]/255,
																				arr[idd+1]/255,
																				arr[idd+2]/255,
																				arr[idd+3]/255]));
					Float4_Un[n].push(outArrayFloat32Array[nb]);
				}

				buffer.Float4.push(outArrayFloat32Array.slice(0, buffer.length));
			}
		}
	}

	return Float4_Un;
};

/**
* Get 1 RGBAUint8Array array from a WebCLGLBuffer type FLOAT <br>
* Internally performs one call to enqueueReadBuffer and return the data in one array of one packets RGBA_Uint8Array
* @param {WebCLGLBuffer} buffer
*
* @example
* // Unpack in your shader to float with:
* float unpack (vec4 4Uint8Array) {
*	const vec4 bitShifts = vec4(1.0,1.0 / 255.0, 1.0 / (255.0 * 255.0), 1.0 / (255.0 * 255.0 * 255.0));
* 	return dot(4Uint8Array, bitShifts);
* }
* float offset = "OFFSET OF BUFFER";
* vec4 4Uint8Array = atributeFloatInPacket4Uint8Array; // IF UNPACK IN VERTEX PROGRAM
* vec4 4Uint8Array = texture2D(samplerFloatInPacket4Uint8Array, vTextureScreenCoord); // IF UNPACK IN FRAGMENT PROGRAM
* float value = (offset > 0.0) ? (unpack(4Uint8Array)*(offset*2.0))-offset : unpack(4Uint8Array);
*
* // JAVASCRIPT IF UNPACK IN VERTEX PROGRAM
* attr_FloatInPacket4Uint8Array = gl.getAttribLocation(shaderProgram, "atributeFloatInPacket4Uint8Array");
* gl.bindBuffer(gl.ARRAY_BUFFER, webGLBufferObject);
* gl.bufferSubData(gl.ARRAY_BUFFER, 0, webCLGL.enqueueReadBuffer_Packet4Uint8Array_Float(buffer_XX)[0]);
* gl.vertexAttribPointer(attr_FloatInPacket4Uint8Array, 4, gl.UNSIGNED_BYTE, true, 0, 0); // true for normalize
*
* // JAVASCRIPT IF UNPACK IN FRAGMENT PROGRAM
* sampler_FloatInPacket4Uint8Array = gl.getUniformLocation(shaderProgram, "samplerFloatInPacket4Uint8Array");
* gl.activeTexture(gl.TEXTURE0);
* gl.bindTexture(gl.TEXTURE_2D, webGLTextureObject);
* gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, viewportWidth,viewportHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, webCLGL.enqueueReadBuffer_Packet4Uint8Array_Float(buffer_XX)[0]);
* gl.uniform1i(sampler_FloatInPacket4Uint8Array, 0);
*/
WebCLGL.prototype.enqueueReadBuffer_Packet4Uint8Array_Float = function(buffers) {
	if(buffers.items[0].type == "FLOAT") {
		for(var i=0; i < buffers.items.length; i++) {
			buffer = buffers.items[i];

			this.prepareViewportForBufferRead(buffer);
			this.gl.useProgram(this.shader_readpixels);

			buffer.Packet4Uint8Array_Float = [this.enqueueReadBuffer(buffer, 0)];
		}
	}
};

/**
* Get 1 Float32Array array from a WebCLGLBuffer type FLOAT <br>
* Internally performs one calls to enqueueReadBuffer and return the data in one array of one Float32Array
* @param {WebCLGLBuffer} buffer
* @returns {Array<Array>}
*/
WebCLGL.prototype.enqueueReadBuffer_Float = function(buffers) {
	var Float_Un = [[]];
	if(buffers.items[0].type == "FLOAT") {
		for(var i=0; i < buffers.items.length; i++) {
			buffer = buffers.items[i];

			this.prepareViewportForBufferRead(buffer);
			this.gl.useProgram(this.shader_readpixels);

			buffer.Packet4Uint8Array_Float = [this.enqueueReadBuffer(buffer, 0)];
			buffer.Float = [];

			for(var n=0, fn= 1; n < fn; n++) {
				var arr = buffer.Packet4Uint8Array_Float[n];

				var outArrayFloat32Array = new Float32Array((buffer.W*buffer.H));
				for(var nb = 0, fnb = arr.length/4; nb < fnb; nb++) {
					var idd = nb*4;
					if(buffer.offset>0) outArrayFloat32Array[nb] = (this.utils.unpack([arr[idd+0]/255,
																								arr[idd+1]/255,
																								arr[idd+2]/255,
																								arr[idd+3]/255])*(buffer.offset*2))-buffer.offset;
					else outArrayFloat32Array[nb] = (this.utils.unpack([	arr[idd+0]/255,
																				arr[idd+1]/255,
																				arr[idd+2]/255,
																				arr[idd+3]/255]));
					Float_Un[n].push(outArrayFloat32Array[nb]);
				}

				buffer.Float.push(outArrayFloat32Array.slice(0, buffer.length));
			}
		}
	}

	return Float_Un;
};
