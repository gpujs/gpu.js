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
/** 
* WebCLGLBuffer Object 
* @class
* @constructor
* @property {Float} length
*/
WebCLGLBuffer = function(gl, length, type, offset, linear, mode, splits) {
	this.gl = gl;
	this.length = (length.constructor === Array) ? [length[0],length[1]] : length;
	this.type = type;
	this.offset = offset;
	this.linear = linear;
	this.mode = (mode != undefined) ? mode : "FRAGMENT"; // "FRAGMENT", "VERTEX", "VERTEX_INDEX", "VERTEX_FROM_KERNEL", "VERTEX_AND_FRAGMENT" 
	this.splits = (splits != undefined) ? splits : [this.length];
	
	this.items = [];
	var countArr = this.length;
	currItem = 0;
	if(this.length.constructor !== Array) {		
		while(true) {
			var spl = (currItem == 0) ? this.splits[currItem] : this.splits[currItem]-this.splits[currItem-1];
			if(countArr > spl) {
				this.items[currItem] = new WebCLGLBufferItem(gl, spl, type, offset, linear, mode);	
				countArr -= spl;
			} else {
				this.items[currItem] = new WebCLGLBufferItem(gl, countArr, type, offset, linear, mode);
				countArr -= countArr;
			}
			if(countArr <= 0) break;
			currItem++;
		}
	} else {
		this.items[currItem] = new WebCLGLBufferItem(gl, this.length, type, offset, linear, mode);
	}
};

/**
* Write WebGLTexture buffer
* @param {Array|Float32Array|Uint8Array|WebGLTexture|HTMLImageElement} array
* @param {Bool} [flip=false]
* @type Void
 */
WebCLGLBuffer.prototype.writeWebGLTextureBuffer = function(arr, flip) {  
	var m = (this.type == "FLOAT4") ? 4 : 1;
	for(var i=0; i < this.items.length; i++) {		
		var startItem = (i==0) ? 0 : this.splits[i-1]*m;
		var endItem = startItem+(this.items[i].length*m);
			
		if(this.items.length > 1) 
			this.items[i].writeWebGLTextureBuffer(arr.slice(startItem, endItem), flip);
		else
			this.items[i].writeWebGLTextureBuffer(arr, flip);
	}
};

/**
* Write WebGL buffer
* @param {Array|Float32Array|Uint8Array|WebGLTexture|HTMLImageElement} array
* @param {Bool} [flip=false]
* @type Void
 */
WebCLGLBuffer.prototype.writeWebGLBuffer = function(arr, flip) {
	var m = (this.type == "FLOAT4") ? 4 : 1;
	for(var i=0; i < this.items.length; i++) {
		var startItem = (i==0) ? 0 : this.splits[i-1]*m;
		var endItem = startItem+(this.items[i].length*m);	
		
		if(this.items.length > 1)
			this.items[i].writeWebGLBuffer(arr.slice(startItem, endItem), flip);
		else
			this.items[i].writeWebGLBuffer(arr, flip);
	}
};

/**
* Remove this buffer
* @type Void
 */
WebCLGLBuffer.prototype.remove = function() {
	for(var n=0; n < this.items.length; n++) {
		this.items[n].remove();
	}
};/**
* WebCLGLBuffer Object
* @class
* @constructor
* @property {WebGLTexture} textureData
* @property {Array<Float>} inData Original array
* @property {Int} [offset=0] offset of buffer
*/
WebCLGLBufferItem = function(gl, length, type, offset, linear, mode) {
	this.gl = gl;

	if(length.constructor === Array) {
		this.length = length[0]*length[1];
		this.W = length[0];
		this.H = length[1];
	} else {
		this.length = length;
		this.W = Math.ceil(Math.sqrt(this.length));
		this.H = this.W;
	}
	this.utils = new WebCLGLUtils();

	this.type = (type != undefined) ? type : 'FLOAT';
	this._supportFormat = this.gl.FLOAT;
	//this._supportFormat = this.gl.UNSIGNED_BYTE;

	this.offset = (offset != undefined) ? offset : 0;
	this.linear = (linear != undefined && linear == true) ? true : false;

	this.inData; // enqueueWriteBuffer user data

	this.mode = (mode != undefined) ? mode : "FRAGMENT"; // "FRAGMENT", "VERTEX", "VERTEX_INDEX", "VERTEX_FROM_KERNEL", "VERTEX_AND_FRAGMENT"

	// readPixel arrays
	this.outArray4Uint8ArrayX = new Uint8Array((this.W*this.H)*4);
	this.outArray4Uint8ArrayY = new Uint8Array((this.W*this.H)*4);
	this.outArray4Uint8ArrayZ = new Uint8Array((this.W*this.H)*4);
	this.outArray4Uint8ArrayW = new Uint8Array((this.W*this.H)*4);
	/*this.outArray4x4Uint8Array = new Uint8Array((this.W*this.H)*4*4);*/

	this.Packet4Uint8Array_Float = []; // [this.outArray4Uint8ArrayX]
	this.Float = []; // [unpack(this.outArray4Uint8ArrayX)]
	this.Packet4Uint8Array_Float4 = []; // [this.outArray4Uint8ArrayX, ..Y, ..Z, ..W]
	this.Float4 = []; // [unpack(this.outArray4Uint8ArrayX), unpack(..Y), unpack(..Z), unpack(..W)]


	// Create FrameBuffer & RenderBuffer
	this.rBuffer = this.gl.createRenderbuffer();
	this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.rBuffer);
	this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, this.W, this.H);
	this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);

	this.fBuffer = this.gl.createFramebuffer();
	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fBuffer);
	this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.rBuffer);

	if(this.mode == "FRAGMENT" || this.mode == "VERTEX_FROM_KERNEL" || this.mode == "VERTEX_AND_FRAGMENT") {
		// Create WebGLTexture buffer
		this.textureData = this.createWebGLTextureBuffer();
	}
	if(this.mode == "VERTEX" || this.mode == "VERTEX_INDEX" || this.mode == "VERTEX_FROM_KERNEL" || this.mode == "VERTEX_AND_FRAGMENT") {
		// Create WebGL buffer
		this.vertexData0 = this.createWebGLBuffer();
	}
};

/**
* Create the WebGLTexture buffer
* @type Void
 */
WebCLGLBufferItem.prototype.createWebGLTextureBuffer = function() {
	this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);
	this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

	var textureData = this.gl.createTexture();
	this.gl.bindTexture(this.gl.TEXTURE_2D, textureData);
	if(this.linear != undefined && this.linear == true) {
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.W,this.H, 0, this.gl.RGBA, this._supportFormat, null);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_NEAREST);
		this.gl.generateMipmap(this.gl.TEXTURE_2D);
	} else {
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.W,this.H, 0, this.gl.RGBA, this._supportFormat, null);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
	}

	return textureData;
};

/**
* Create the WebGL buffer
* @type Void
 */
WebCLGLBufferItem.prototype.createWebGLBuffer = function() {
	var vertexData = this.gl.createBuffer();

	return vertexData;
};

/**
* Write WebGLTexture buffer
* @param {Array|Float32Array|Uint8Array|WebGLTexture|HTMLImageElement} array
* @param {Bool} [flip=false]
* @type Void
 */
WebCLGLBufferItem.prototype.writeWebGLTextureBuffer = function(arr, flip) {
	this.inData = arr;

	if(arr instanceof WebGLTexture) this.textureData = arr;
	else {
		if(flip == false || flip == undefined)
			this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);
		else
			this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
		this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.textureData);
		if(arr instanceof HTMLImageElement)  {
			this.inData = this.utils.getUint8ArrayFromHTMLImageElement(arr);
			//texImage2D(			target, 			level, 	internalformat, 	format, 		type, 			TexImageSource);
			if(this.type == 'FLOAT4') {
				this.gl.texImage2D(	this.gl.TEXTURE_2D, 0, 		this.gl.RGBA, 		this.gl.RGBA, 	this.gl.FLOAT, 	arr);
			}/* else if(this.type == 'INT4') {
				this.gl.texImage2D(	this.gl.TEXTURE_2D, 0, 		this.gl.RGBA, 		this.gl.RGBA, 	this.gl.UNSIGNED_BYTE, 	arr);
			}*/
		} else {
			//console.log("Write arr with length of "+arr.length+" in Buffer "+this.type+" with length of "+this.length+" (W: "+this.W+"; H: "+this.H+")");

			if(this.type == 'FLOAT4') {
				var arrt = new Float32Array((this.W*this.H)*4);
				for(var n=0; n < arr.length; n++) arrt[n] = arr[n];
				//texImage2D(			target, 			level, 	internalformat, 	width, height, border, 	format, 		type, 			pixels);
				if(arr instanceof Uint8Array) {
					this.gl.texImage2D(	this.gl.TEXTURE_2D, 0, 		this.gl.RGBA, 		this.W, this.H, 0, 	this.gl.RGBA, 	this.gl.FLOAT, 	arrt);
				} else if(arr instanceof Float32Array) {
					this.gl.texImage2D(this.gl.TEXTURE_2D, 	0, 		this.gl.RGBA, 		this.W, this.H, 0, 	this.gl.RGBA, 	this.gl.FLOAT, 	arrt);
				} else {
					this.gl.texImage2D(this.gl.TEXTURE_2D, 	0, 		this.gl.RGBA, 		this.W, this.H, 0, 	this.gl.RGBA, 	this.gl.FLOAT, 	arrt);
				}
			} else if(this.type == 'FLOAT') {
				var arrayTemp = new Float32Array(this.W*this.H*4);

				for(var n = 0, f = this.W*this.H; n < f; n++) {
					var idd = n*4;
					arrayTemp[idd] = arr[n];
					arrayTemp[idd+1] = 0.0;
					arrayTemp[idd+2] = 0.0;
					arrayTemp[idd+3] = 0.0;
				}
				arr = arrayTemp;
				this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.W, this.H, 0, this.gl.RGBA, this.gl.FLOAT, arr);
			}
		}
	}
	if(this.linear) this.gl.generateMipmap(this.gl.TEXTURE_2D);
};

/**
* Write WebGL buffer
* @param {Array|Float32Array|Uint8Array|WebGLTexture|HTMLImageElement} array
* @param {Bool} [flip=false]
* @type Void
 */
WebCLGLBufferItem.prototype.writeWebGLBuffer = function(arr, flip) {
	this.inData = arr;
	if(this.mode == "VERTEX_INDEX") { // "VERTEX_INDEX" ELEMENT_ARRAY_BUFFER
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.vertexData0);
		this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(arr), this.gl.DYNAMIC_DRAW);
	} else { // "VERTEX" || "VERTEX_AND_FRAGMENT" ARRAY_BUFFER
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexData0);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(arr), this.gl.DYNAMIC_DRAW);
	}
};

/**
* Remove this buffer
* @type Void
 */
WebCLGLBufferItem.prototype.remove = function() {
	this.gl.deleteRenderbuffer(this.rBuffer);
	this.gl.deleteFramebuffer(this.fBuffer);

	if(this.mode == "FRAGMENT" || this.mode == "VERTEX_FROM_KERNEL" || this.mode == "VERTEX_AND_FRAGMENT")
		this.gl.deleteTexture(this.textureData);

	if(this.mode == "VERTEX" || this.mode == "VERTEX_INDEX" || this.mode == "VERTEX_FROM_KERNEL" || this.mode == "VERTEX_AND_FRAGMENT")
		this.gl.deleteBuffer(this.vertexData0);
};
/**
* WebCLGLKernel Object
* @class
* @constructor
*/
WebCLGLKernel = function(gl, source, header) {
	this.gl = gl;
	var highPrecisionSupport = this.gl.getShaderPrecisionFormat(this.gl.FRAGMENT_SHADER, this.gl.HIGH_FLOAT);
	this.precision = (highPrecisionSupport.precision != 0) ? 'precision highp float;\n\nprecision highp int;\n\n' : 'precision lowp float;\n\nprecision lowp int;\n\n';

	this.utils = new WebCLGLUtils();

	this.in_values = [];

	if(source != undefined) this.setKernelSource(source, header);
};

/**
* Update the kernel source
* @type Void
* @param {String} source
* @param {String} header Additional functions
*/
WebCLGLKernel.prototype.setKernelSource = function(source, header) {
	this.head =(header!=undefined)?header:'';
	this.in_values = [];//{value,type,name,idPointer}
	// value: argument value
	// type: 'buffer_float4'(RGBA channels), 'buffer_float'(Red channel)
	// name: argument name
	// idPointer to: this.samplers or this.uniforms (according to type)

	var argumentsSource = source.split(')')[0].split('(')[1].split(','); // "float* A", "float* B", "float C", "float4* D"
	//console.log(argumentsSource);
	for(var n = 0, f = argumentsSource.length; n < f; n++) {
		if(argumentsSource[n].match(/\*/gm) != null) {
			if(argumentsSource[n].match(/float4/gm) != null) {
				this.in_values[n] = {	value:undefined,
										type:'buffer_float4',
										name:argumentsSource[n].split('*')[1].trim()};
			} else if(argumentsSource[n].match(/float/gm) != null) {
				this.in_values[n] = {	value:undefined,
										type:'buffer_float',
										name:argumentsSource[n].split('*')[1].trim()};
			}
		} else {
			if(argumentsSource[n].match(/float4/gm) != null) {
				this.in_values[n] = {	value:undefined,
										type:'float4',
										name:argumentsSource[n].split(' ')[1].trim()};
			} else if(argumentsSource[n].match(/float/gm) != null) {
				this.in_values[n] = {	value:undefined,
										type:'float',
										name:argumentsSource[n].split(' ')[1].trim()};
			} else if(argumentsSource[n].match(/mat4/gm) != null) {
				this.in_values[n] = {	value:undefined,
										type:'mat4',
										name:argumentsSource[n].split(' ')[1].trim()};
			}
		}
	}
	//console.log(this.in_values);

	//console.log('original source: '+source);
	this.source = source.replace(/\r\n/gi, '').replace(/\r/gi, '').replace(/\n/gi, '');
	this.source = this.source.replace(/^\w* \w*\([\w\s\*,]*\) {/gi, '').replace(/}(\s|\t)*$/gi, '');
	//console.log('minified source: '+this.source);

	this.source = this.parse(this.source);
	this.compile();
};
/**
* @private
*/
WebCLGLKernel.prototype.parse = function(source) {
	//console.log(source);
	for(var n = 0, f = this.in_values.length; n < f; n++) { // for each in_values (in argument)
		var regexp = new RegExp(this.in_values[n].name+'\\[\\w*\\]',"gm");
		var varMatches = source.match(regexp);// "Search current "in_values.name[xxx]" in source and store in array varMatches
		//console.log(varMatches);
		if(varMatches != null) {
			for(var nB = 0, fB = varMatches.length; nB < fB; nB++) { // for each varMatches ("A[x]", "A[x]")
				var regexpNativeGL = new RegExp('```(\s|\t)*gl.*'+varMatches[nB]+'.*```[^```(\s|\t)*gl]',"gm");
				var regexpNativeGLMatches = source.match(regexpNativeGL);
				if(regexpNativeGLMatches == null) {
					var name = varMatches[nB].split('[')[0];
					var vari = varMatches[nB].split('[')[1].split(']')[0];
					var regexp = new RegExp(name+'\\['+vari.trim()+'\\]',"gm");

					if(this.in_values[n].type == 'buffer_float4')
						source = source.replace(regexp, 'buffer_float4_data('+name+','+vari+')');
					if(this.in_values[n].type == 'buffer_float')
						source = source.replace(regexp, 'buffer_float_data('+name+','+vari+')');
				}
			}
		}
	}
	source = source.replace(/```(\s|\t)*gl/gi, "").replace(/```/gi, "").replace(/;/gi, ";\n").replace(/}/gi, "}\n").replace(/{/gi, "{\n");
	//console.log('%c translated source:'+source, "background-color:#000;color:#FFF");
	return source;
};
/**
* @private
*/
WebCLGLKernel.prototype.compile = function() {
	lines_attrs = (function() {
		str = '';
		for(var n = 0, f = this.in_values.length; n < f; n++) {
			if(this.in_values[n].type == 'buffer_float4' || this.in_values[n].type == 'buffer_float') {
				str += 'uniform sampler2D '+this.in_values[n].name+';\n';
			} else if(this.in_values[n].type == 'float') {
				str += 'uniform float '+this.in_values[n].name+';\n';
			} else if(this.in_values[n].type == 'float4') {
				str += 'uniform vec4 '+this.in_values[n].name+';\n';
			} else if(this.in_values[n].type == 'mat4') {
				str += 'uniform mat4 '+this.in_values[n].name+';\n';
			}
		}
		return str;
	}).bind(this);

	var sourceVertex = 	this.precision+
		'attribute vec3 aVertexPosition;\n'+
		'attribute vec2 aTextureCoord;\n'+

		'varying vec2 global_id;\n'+

		'void main(void) {\n'+
			'gl_Position = vec4(aVertexPosition, 1.0);\n'+
			'global_id = aTextureCoord;\n'+
		'}\n';
	var sourceFragment = this.precision+

		lines_attrs()+

		//this.utils.unpackGLSLFunctionString()+

		'varying vec2 global_id;\n'+
		'uniform float uBufferWidth;'+
		'uniform float uGeometryLength;'+

		'vec4 buffer_float4_data(sampler2D arg, vec2 coord) {\n'+
			'vec4 textureColor = texture2D(arg, coord);\n'+
			'return textureColor;\n'+
		'}\n'+
		'float buffer_float_data(sampler2D arg, vec2 coord) {\n'+
			'vec4 textureColor = texture2D(arg, coord);\n'+
			'return textureColor.x;\n'+
		'}\n'+

		'vec2 get_global_id() {\n'+
			'return global_id;\n'+
		'}\n'+

		'vec2 get_global_id(float id) {\n'+
			'float num = (id*uGeometryLength)/uBufferWidth;'+
			'float column = fract(num)*uBufferWidth;'+
			'float row = floor(num);'+

			'float ts = 1.0/(uBufferWidth-1.0);'+
			'float xx = column*ts;'+
			'float yy = row*ts;'+

			'return vec2(xx, yy);'+
		'}\n'+

		this.head+

		'void main(void) {\n'+
			'float out_float = -999.99989;\n'+
			'vec4 out_float4;\n'+

			this.source;



	var sourceFrag = sourceFragment+
		'if(out_float != -999.99989) gl_FragColor = vec4(out_float,0.0,0.0,1.0);\n'+
		'else gl_FragColor = out_float4;\n'+
	'}\n';

	this.kernelPrograms = [	new WebCLGLKernelProgram(this.gl, sourceVertex, sourceFrag, this.in_values) ];

	return true;
};

/**
* Bind float or a WebCLGLBuffer to a kernel argument
* @type Void
* @param {Int|String} argument Id of argument or name of this
* @param {Float|Int|Array<Float4>|Array<Mat4>|WebCLGLBuffer} data
*/
WebCLGLKernel.prototype.setKernelArg = function(argument, data) {
	if(data == undefined) alert("Error in setKernelArg("+argument+", data) (this data is undefined)");

	var numArg;
	if(typeof argument != "string") {
		numArg = argument;
	} else {
		for(var n=0, fn = this.in_values.length; n < fn; n++) {
			if(this.in_values[n].name == argument) {
				numArg = n;
				break;
			}
		}
	}

	if(this.in_values[numArg] == undefined) {
		console.log("argument "+argument+" not exist in this kernel");
		return;
	}
	this.in_values[numArg].value = data;

	for(var n=0, fn = this.kernelPrograms.length; n < fn; n++) {
		var kp = this.kernelPrograms[n];

		if(this.in_values[numArg].type == 'buffer_float4' || this.in_values[numArg].type == 'buffer_float') {
			kp.samplers[this.in_values[numArg].idPointer].value = this.in_values[numArg].value;
		} else if(this.in_values[numArg].type == 'float' || this.in_values[numArg].type == 'float4' || this.in_values[numArg].type == 'mat4') {
			kp.uniforms[this.in_values[numArg].idPointer].value = this.in_values[numArg].value;
		}
	}
};
/** 
* WebCLGLKernelProgram Object
* @class
* @constructor
*/
WebCLGLKernelProgram = function(gl, sv, sf, in_values) { 
	this.gl = gl;
	this.utils = new WebCLGLUtils();
	
	this.kernel = this.gl.createProgram();
	this.utils.createShader(this.gl, "WEBCLGL", sv, sf, this.kernel);
	//console.log(sourceF);	
	
	this.samplers = []; // {location,value}
	this.uniforms = []; // {location,value}
	this.attr_VertexPos = this.gl.getAttribLocation(this.kernel, "aVertexPosition");
	this.attr_TextureCoord = this.gl.getAttribLocation(this.kernel, "aTextureCoord");	

	this.uBufferWidth = this.gl.getUniformLocation(this.kernel, "uBufferWidth");
	this.uGeometryLength = this.gl.getUniformLocation(this.kernel, "uGeometryLength");
	
	for(var n = 0, f = in_values.length; n < f; n++) {
		if(in_values[n].type == 'buffer_float4' || in_values[n].type == 'buffer_float') {
			this.samplers.push({	location: [this.gl.getUniformLocation(this.kernel, in_values[n].name)],
									value:in_values[n].value,
									type: in_values[n].type,
									name: in_values[n].name});
			
			in_values[n].idPointer = this.samplers.length-1;
		} else if(in_values[n].type == 'float' || in_values[n].type == 'float4' || in_values[n].type == 'mat4') {
			this.uniforms.push({	location: [this.gl.getUniformLocation(this.kernel, in_values[n].name)],
									value:in_values[n].value,
									type: in_values[n].type,
									name: in_values[n].name});
			
			in_values[n].idPointer = this.uniforms.length-1;
		}
	}
};/** 
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
/**
* WebCLGLVertexFragmentProgram Object
* @class
* @constructor
*/
WebCLGLVertexFragmentProgram = function(gl, vertexSource, vertexHeader, fragmentSource, fragmentHeader) {
	this.gl = gl;
	var highPrecisionSupport = this.gl.getShaderPrecisionFormat(this.gl.FRAGMENT_SHADER, this.gl.HIGH_FLOAT);
	this.precision = (highPrecisionSupport.precision != 0) ? 'precision highp float;\n\nprecision highp int;\n\n' : 'precision lowp float;\n\nprecision lowp int;\n\n';

	this.utils = new WebCLGLUtils();

	this.vertexSource;
	this.fragmentSource;
	this.in_vertex_values = [];
	this.in_fragment_values = [];

	this.vertexAttributes = []; // {location,value}
	this.vertexUniforms = []; // {location,value}
	this.fragmentSamplers = []; // {location,value}
	this.fragmentUniforms = []; // {location,value}

	if(vertexSource != undefined) this.setVertexSource(vertexSource, vertexHeader);
	if(fragmentSource != undefined) this.setFragmentSource(fragmentSource, fragmentHeader);
};

/**
* Update the vertex source
* @type Void
* @param {String} vertexSource
* @param {String} vertexHeader
*/
WebCLGLVertexFragmentProgram.prototype.setVertexSource = function(vertexSource, vertexHeader) {
	this.vertexHead =(vertexHeader!=undefined)?vertexHeader:'';
	this.in_vertex_values = [];//{value,type,name,idPointer}
	// value: argument value
	// type: 'buffer_float4_fromKernel'(4 packet pointer4), 'buffer_float_fromKernel'(1 packet pointer4), 'buffer_float4'(1 pointer4), 'buffer_float'(1 pointer1)
	// name: argument name
	// idPointer to: this.vertexAttributes or this.vertexUniforms (according to type)

	var argumentsSource = vertexSource.split(')')[0].split('(')[1].split(','); // "float* A", "float* B", "float C", "float4* D"
	//console.log(argumentsSource);
	for(var n = 0, f = argumentsSource.length; n < f; n++) {
		if(argumentsSource[n].match(/\*kernel/gm) != null) {
			if(argumentsSource[n].match(/float4/gm) != null) {
				this.in_vertex_values[n] = {	value:undefined,
												type:'buffer_float4_fromKernel',
												name:argumentsSource[n].split('*kernel')[1].trim()};
			} else if(argumentsSource[n].match(/float/gm) != null) {
				this.in_vertex_values[n] = {	value:undefined,
												type:'buffer_float_fromKernel',
												name:argumentsSource[n].split('*kernel')[1].trim()};
			}
		} else if(argumentsSource[n].match(/\*/gm) != null) {
			if(argumentsSource[n].match(/float4/gm) != null) {
				this.in_vertex_values[n] = {	value:undefined,
												type:'buffer_float4',
												name:argumentsSource[n].split('*')[1].trim()};
			} else if(argumentsSource[n].match(/float/gm) != null) {
				this.in_vertex_values[n] = {	value:undefined,
												type:'buffer_float',
												name:argumentsSource[n].split('*')[1].trim()};
			}
		} else {
			if(argumentsSource[n].match(/float4/gm) != null) {
				this.in_vertex_values[n] = {	value:undefined,
												type:'float4',
												name:argumentsSource[n].split(' ')[1].trim()};
			} else if(argumentsSource[n].match(/float/gm) != null) {
				this.in_vertex_values[n] = {	value:undefined,
												type:'float',
												name:argumentsSource[n].split(' ')[1].trim()};
			} else if(argumentsSource[n].match(/mat4/gm) != null) {
				this.in_vertex_values[n] = {	value:undefined,
												type:'mat4',
												name:argumentsSource[n].split(' ')[1].trim()};
			}
		}
	}
	//console.log(this.in_vertex_values);

	//console.log('original source: '+vertexSource);
	this.vertexSource = vertexSource.replace(/\r\n/gi, '').replace(/\r/gi, '').replace(/\n/gi, '');
	this.vertexSource = this.vertexSource.replace(/^\w* \w*\([\w\s\*,]*\) {/gi, '').replace(/}(\s|\t)*$/gi, '');
	//console.log('minified source: '+this.vertexSource);

	this.vertexSource = this.parseVertexSource(this.vertexSource);

	if(this.fragmentSource != undefined) this.compileVertexFragmentSource();
};
/** @private **/
WebCLGLVertexFragmentProgram.prototype.parseVertexSource = function(source) {
	//console.log(source);
	for(var n = 0, f = this.in_vertex_values.length; n < f; n++) { // for each in_vertex_values (in argument)
		var regexp = new RegExp(this.in_vertex_values[n].name+'\\[\\w*\\]',"gm");
		var varMatches = source.match(regexp);// "Search current "in_vertex_values.name[xxx]" in source and store in array varMatches
		//console.log(varMatches);
		if(varMatches != null) {
			for(var nB = 0, fB = varMatches.length; nB < fB; nB++) { // for each varMatches ("A[x]", "A[x]")
				var regexpNativeGL = new RegExp('```(\s|\t)*gl.*'+varMatches[nB]+'.*```[^```(\s|\t)*gl]',"gm");
				var regexpNativeGLMatches = source.match(regexpNativeGL);
				if(regexpNativeGLMatches == null) {
					var name = varMatches[nB].split('[')[0];
					var vari = varMatches[nB].split('[')[1].split(']')[0];
					var regexp = new RegExp(name+'\\['+vari.trim()+'\\]',"gm");

					if(this.in_vertex_values[n].type == 'buffer_float4_fromKernel')
						source = source.replace(regexp, 'buffer_float4_fromKernel_data('+name+','+vari+')');
					if(this.in_vertex_values[n].type == 'buffer_float_fromKernel')
						source = source.replace(regexp, 'buffer_float_fromKernel_data('+name+','+vari+')');
					if(this.in_vertex_values[n].type == 'buffer_float4')
						source = source.replace(regexp, name);
					if(this.in_vertex_values[n].type == 'buffer_float')
						source = source.replace(regexp, name);
				}
			}
		}
	}
	source = source.replace(/```(\s|\t)*gl/gi, "").replace(/```/gi, "").replace(/;/gi, ";\n").replace(/}/gi, "}\n").replace(/{/gi, "{\n");
	//console.log('%c translated source:'+source, "background-color:#000;color:#FFF");
	return source;
};
/**
* Update the fragment source
* @type Void
* @param {String} fragmentSource
* @param {String} fragmentHeader
*/
WebCLGLVertexFragmentProgram.prototype.setFragmentSource = function(fragmentSource, fragmentHeader) {
	this.fragmentHead =(fragmentHeader!=undefined)?fragmentHeader:'';
	this.in_fragment_values = [];//{value,type,name,idPointer}
	// value: argument value
	// type: 'buffer_float4'(RGBA channels), 'buffer_float'(Red channel)
	// name: argument name
	// idPointer to: this.fragmentSamplers or this.fragmentUniforms (according to type)

	var argumentsSource = fragmentSource.split(')')[0].split('(')[1].split(','); // "float* A", "float* B", "float C", "float4* D"
	//console.log(argumentsSource);
	for(var n = 0, f = argumentsSource.length; n < f; n++) {
		if(argumentsSource[n].match(/\*/gm) != null) {
			if(argumentsSource[n].match(/float4/gm) != null) {
				this.in_fragment_values[n] = {	value:undefined,
												type:'buffer_float4',
												name:argumentsSource[n].split('*')[1].trim()};
			} else if(argumentsSource[n].match(/float/gm) != null) {
				this.in_fragment_values[n] = {	value:undefined,
												type:'buffer_float',
												name:argumentsSource[n].split('*')[1].trim()};
			}
		} else {
			if(argumentsSource[n].match(/float4/gm) != null) {
				this.in_fragment_values[n] = {	value:undefined,
												type:'float4',
												name:argumentsSource[n].split(' ')[1].trim()};
			} else if(argumentsSource[n].match(/float/gm) != null) {
				this.in_fragment_values[n] = {	value:undefined,
												type:'float',
												name:argumentsSource[n].split(' ')[1].trim()};
			} else if(argumentsSource[n].match(/mat4/gm) != null) {
				this.in_fragment_values[n] = {	value:undefined,
												type:'mat4',
												name:argumentsSource[n].split(' ')[1].trim()};
			}
		}
	}
	//console.log(this.in_fragment_values);

	//console.log('original source: '+source);
	this.fragmentSource = fragmentSource.replace(/\r\n/gi, '').replace(/\r/gi, '').replace(/\n/gi, '');
	this.fragmentSource = this.fragmentSource.replace(/^\w* \w*\([\w\s\*,]*\) {/gi, '').replace(/}(\s|\t)*$/gi, '');
	//console.log('minified source: '+this.fragmentSource);

	this.fragmentSource = this.parseFragmentSource(this.fragmentSource);

	if(this.vertexSource != undefined) this.compileVertexFragmentSource();
};
/** @private **/
WebCLGLVertexFragmentProgram.prototype.parseFragmentSource = function(source) {
	//console.log(source);
	for(var n = 0, f = this.in_fragment_values.length; n < f; n++) { // for each in_fragment_values (in argument)
		var regexp = new RegExp(this.in_fragment_values[n].name+'\\[\\w*\\]',"gm");
		var varMatches = source.match(regexp);// "Search current "in_fragment_values.name[xxx]" in source and store in array varMatches
		//console.log(varMatches);
		if(varMatches != null) {
			for(var nB = 0, fB = varMatches.length; nB < fB; nB++) { // for each varMatches ("A[x]", "A[x]")
				var regexpNativeGL = new RegExp('```(\s|\t)*gl.*'+varMatches[nB]+'.*```[^```(\s|\t)*gl]',"gm");
				var regexpNativeGLMatches = source.match(regexpNativeGL);
				if(regexpNativeGLMatches == null) {
					var name = varMatches[nB].split('[')[0];
					var vari = varMatches[nB].split('[')[1].split(']')[0];
					var regexp = new RegExp(name+'\\['+vari.trim()+'\\]',"gm");

					if(this.in_fragment_values[n].type == 'buffer_float4')
						source = source.replace(regexp, 'buffer_float4_data('+name+','+vari+')');
					if(this.in_fragment_values[n].type == 'buffer_float')
						source = source.replace(regexp, 'buffer_float_data('+name+','+vari+')');
				}
			}
		}
	}
	source = source.replace(/```(\s|\t)*gl/gi, "").replace(/```/gi, "").replace(/;/gi, ";\n").replace(/}/gi, "}\n").replace(/{/gi, "{\n");
	//console.log('%c translated source:'+source, "background-color:#000;color:#FFF");
	return source;
};














/** @private **/
WebCLGLVertexFragmentProgram.prototype.compileVertexFragmentSource = function() {
	lines_vertex_attrs = (function() {
		str = '';
		for(var n = 0, f = this.in_vertex_values.length; n < f; n++) {
			if(this.in_vertex_values[n].type == 'buffer_float4_fromKernel' || this.in_vertex_values[n].type == 'buffer_float_fromKernel') {
				str += 'uniform sampler2D '+this.in_vertex_values[n].name+';\n';
			} else if(this.in_vertex_values[n].type == 'buffer_float4') {
				str += 'attribute vec4 '+this.in_vertex_values[n].name+';\n';
			} else if(this.in_vertex_values[n].type == 'buffer_float') {
				str += 'attribute float '+this.in_vertex_values[n].name+';\n';
			} else if(this.in_vertex_values[n].type == 'float') {
				str += 'uniform float '+this.in_vertex_values[n].name+';\n';
			} else if(this.in_vertex_values[n].type == 'float4') {
				str += 'uniform vec4 '+this.in_vertex_values[n].name+';\n';
			} else if(this.in_vertex_values[n].type == 'mat4') {
				str += 'uniform mat4 '+this.in_vertex_values[n].name+';\n';
			}
		}
		return str;
	}).bind(this);

	lines_fragment_attrs = (function() {
		str = '';
		for(var n = 0, f = this.in_fragment_values.length; n < f; n++) {
			if(this.in_fragment_values[n].type == 'buffer_float4' || this.in_fragment_values[n].type == 'buffer_float') {
				str += 'uniform sampler2D '+this.in_fragment_values[n].name+';\n';
			} else if(this.in_fragment_values[n].type == 'float') {
				str += 'uniform float '+this.in_fragment_values[n].name+';\n';
			} else if(this.in_fragment_values[n].type == 'float4') {
				str += 'uniform vec4 '+this.in_fragment_values[n].name+';\n';
			} else if(this.in_fragment_values[n].type == 'mat4') {
				str += 'uniform mat4 '+this.in_fragment_values[n].name+';\n';
			}
		}
		return str;
	}).bind(this);


	var sourceVertex = 	this.precision+
		'uniform float uOffset;\n'+
		'uniform float uBufferWidth;'+
		'uniform float uGeometryLength;'+

		lines_vertex_attrs()+

		this.utils.unpackGLSLFunctionString()+

		'vec4 buffer_float4_fromKernel_data(sampler2D arg, vec2 coord) {\n'+
			'vec4 textureColor = texture2D(arg, coord);\n'+
			'return textureColor;\n'+
		'}\n'+
		'float buffer_float_fromKernel_data(sampler2D arg, vec2 coord) {\n'+
			'vec4 textureColor = texture2D(arg, coord);\n'+
			'return textureColor.x;\n'+
		'}\n'+

		'vec2 get_global_id() {\n'+
			'return vec2(0.0, 0.0);\n'+
		'}\n'+

		'vec2 get_global_id(float id) {\n'+
			'float num = (id*uGeometryLength)/uBufferWidth;'+
			'float column = fract(num)*uBufferWidth;'+
			'float row = floor(num);'+

			'float ts = 1.0/(uBufferWidth-1.0);'+
			'float xx = column*ts;'+
			'float yy = row*ts;'+

			'return vec2(xx, yy);'+
		'}\n'+

		this.vertexHead+

		'void main(void) {\n'+

			this.vertexSource+

		'}\n';
	//console.log(sourceVertex);
	var sourceFragment = this.precision+

		lines_fragment_attrs()+

		'vec4 buffer_float4_data(sampler2D arg, vec2 coord) {\n'+
			'vec4 textureColor = texture2D(arg, coord);\n'+
			'return textureColor;\n'+
		'}\n'+
		'float buffer_float_data(sampler2D arg, vec2 coord) {\n'+
			'vec4 textureColor = texture2D(arg, coord);\n'+
			'return textureColor.x;\n'+
		'}\n'+

		'vec2 get_global_id() {\n'+
			'return vec2(0.0, 0.0);\n'+
		'}\n'+

		this.fragmentHead+

		'void main(void) {\n'+

			this.fragmentSource+

		'}\n';
	//console.log(sourceFragment);

	this.vertexFragmentProgram = this.gl.createProgram();
	this.utils.createShader(this.gl, "WEBCLGL VERTEX FRAGMENT PROGRAM", sourceVertex, sourceFragment, this.vertexFragmentProgram);


	this.vertexAttributes = []; // {location,value}
	this.vertexUniforms = []; // {location,value}
	this.fragmentSamplers = []; // {location,value}
	this.fragmentUniforms = []; // {location,value}

	this.uOffset = this.gl.getUniformLocation(this.vertexFragmentProgram, "uOffset");
	this.uBufferWidth = this.gl.getUniformLocation(this.vertexFragmentProgram, "uBufferWidth");
	this.uGeometryLength = this.gl.getUniformLocation(this.vertexFragmentProgram, "uGeometryLength");

	// vertexAttributes & vertexUniforms
	for(var n = 0, f = this.in_vertex_values.length; n < f; n++) {
		if(this.in_vertex_values[n].type == 'buffer_float_fromKernel' || this.in_vertex_values[n].type == 'buffer_float4_fromKernel') {
			this.vertexAttributes.push({	location: [this.gl.getUniformLocation(this.vertexFragmentProgram, this.in_vertex_values[n].name)],
											value: this.in_vertex_values[n].value,
											type: this.in_vertex_values[n].type,
											name: this.in_vertex_values[n].name});

			this.in_vertex_values[n].idPointer = this.vertexAttributes.length-1;
		} else if(this.in_vertex_values[n].type == 'buffer_float4' || this.in_vertex_values[n].type == 'buffer_float') {
			this.vertexAttributes.push({	location: [this.gl.getAttribLocation(this.vertexFragmentProgram, this.in_vertex_values[n].name)],
											value: this.in_vertex_values[n].value,
											type: this.in_vertex_values[n].type,
											name: this.in_vertex_values[n].name});

			this.in_vertex_values[n].idPointer = this.vertexAttributes.length-1;
		} else if(this.in_vertex_values[n].type == 'float' || this.in_vertex_values[n].type == 'float4' || this.in_vertex_values[n].type == 'mat4') {
			this.vertexUniforms.push({	location: [this.gl.getUniformLocation(this.vertexFragmentProgram, this.in_vertex_values[n].name)],
										value: this.in_vertex_values[n].value,
										type: this.in_vertex_values[n].type,
										name: this.in_vertex_values[n].name});

			this.in_vertex_values[n].idPointer = this.vertexUniforms.length-1;
		}
	}

	// fragmentSamplers & fragmentUniforms
	for(var n = 0, f = this.in_fragment_values.length; n < f; n++) {
		if(this.in_fragment_values[n].type == 'buffer_float4' || this.in_fragment_values[n].type == 'buffer_float') {
			this.fragmentSamplers.push({	location: [this.gl.getUniformLocation(this.vertexFragmentProgram, this.in_fragment_values[n].name)],
											value: this.in_fragment_values[n].value,
											type: this.in_fragment_values[n].type,
											name: this.in_fragment_values[n].name});

			this.in_fragment_values[n].idPointer = this.fragmentSamplers.length-1;
		} else if(this.in_fragment_values[n].type == 'float' || this.in_fragment_values[n].type == 'float4' || this.in_fragment_values[n].type == 'mat4') {
			this.fragmentUniforms.push({	location: [this.gl.getUniformLocation(this.vertexFragmentProgram, this.in_fragment_values[n].name)],
											value: this.in_fragment_values[n].value,
											type: this.in_fragment_values[n].type,
											name: this.in_fragment_values[n].name});

			this.in_fragment_values[n].idPointer = this.fragmentUniforms.length-1;
		}
	}


	return true;
};

/**
* Bind float, mat4 or a WebCLGLBuffer to a vertex argument
* @param {Int|String} argument Id of argument or name of this
* @param {Float|Int|Array<Float4>|Array<Mat4>|WebCLGLBuffer} data
*/
WebCLGLVertexFragmentProgram.prototype.setVertexArg = function(argument, data) {
	if(data == undefined) alert("Error: setVertexArg("+argument+", undefined)");

	var numArg;
	if(typeof argument != "string") {
		numArg = argument;
	} else {
		for(var n=0, fn = this.in_vertex_values.length; n < fn; n++) {
			if(this.in_vertex_values[n].name == argument) {
				numArg = n;
				break;
			}
		}
	}

	if(this.in_vertex_values[numArg] == undefined) {
		console.log("argument "+argument+" not exist in this vertex program");
		return;
	}
	this.in_vertex_values[numArg].value = data;

	if(	this.in_vertex_values[numArg].type == 'buffer_float4_fromKernel' ||
		this.in_vertex_values[numArg].type == 'buffer_float_fromKernel' ||
		this.in_vertex_values[numArg].type == 'buffer_float4' ||
		this.in_vertex_values[numArg].type == 'buffer_float') {
		this.vertexAttributes[this.in_vertex_values[numArg].idPointer].value = this.in_vertex_values[numArg].value;
	} else if(this.in_vertex_values[numArg].type == 'float' || this.in_vertex_values[numArg].type == 'float4' || this.in_vertex_values[numArg].type == 'mat4') {
		this.vertexUniforms[this.in_vertex_values[numArg].idPointer].value = this.in_vertex_values[numArg].value;
	}
};
/**
* Bind float or a WebCLGLBuffer to a fragment argument
* @param {Int|String} argument Id of argument or name of this
* @param {Float|Int|Array<Float4>|Array<Mat4>|WebCLGLBuffer} data
*/
WebCLGLVertexFragmentProgram.prototype.setFragmentArg = function(argument, data) {
	if(data == undefined) alert("Error: setFragmentArg("+argument+", undefined)");

	var numArg;
	if(typeof argument != "string") {
		numArg = argument;
	} else {
		for(var n=0, fn = this.in_fragment_values.length; n < fn; n++) {
			if(this.in_fragment_values[n].name == argument) {
				numArg = n;
				break;
			}
		}
	}

	if(this.in_fragment_values[numArg] == undefined) {
		console.log("argument "+argument+" not exist in this fragment program");
		return;
	}
	this.in_fragment_values[numArg].value = data;

	if(this.in_fragment_values[numArg].type == 'buffer_float4' || this.in_fragment_values[numArg].type == 'buffer_float') {
		this.fragmentSamplers[this.in_fragment_values[numArg].idPointer].value = this.in_fragment_values[numArg].value;
	} else if(this.in_fragment_values[numArg].type == 'float' || this.in_fragment_values[numArg].type == 'float4' || this.in_fragment_values[numArg].type == 'mat4') {
		this.fragmentUniforms[this.in_fragment_values[numArg].idPointer].value = this.in_fragment_values[numArg].value;
	}
};
/**
* WebCLGLWork Object
* @class
* @constructor
*/
WebCLGLWork = function(webCLGL, offset) {
	this.webCLGL = webCLGL;
	this.offset = (offset != undefined) ? offset : 100.0;

	this.kernels = {};
	this.vertexFragmentPrograms = {};
	this.buffers = {};
	this.buffers_TEMP = {};


	var kernelPr;
	var vPr;
	var fPr;
	var updatedFromKernel;
	var type; // FLOAT or FLOAT4
	var isBuffer;
	var usedInVertex;
	var usedInFragment;
	var mode; // "FRAGMENT", "VERTEX", "VERTEX_INDEX", "VERTEX_FROM_KERNEL", "VERTEX_AND_FRAGMENT"
};

/**
* Add one WebCLGLKernel to the work
* @param {WebCLGLKernel} kernel
* @param {String} name Name for identify this kernel
 */
WebCLGLWork.prototype.addKernel = function(kernel, name) {
	var exists = false;
	for(var key in this.kernels) {
		if(this.kernels[key] == kernel) {
			this.kernels[key] = kernel;
			exists = true;
			break;
		}
	}
	if(exists == false) {
		this.kernels[name] = kernel;
	}
};

/**
* Get one added WebCLGLKernel
* @param {String} name Get assigned kernel for this argument
 */
WebCLGLWork.prototype.getKernel = function(name) {
	for(var key in this.kernels) {
		if(key == name) {
			return this.kernels[key];
		}
	}
};

/**
* Add one WebCLGLVertexFragmentProgram to the work
* @param {WebCLGLVertexFragmentProgram} vertexFragmentProgram
* @param {String} name Name for identify this vertexFragmentProgram
 */
WebCLGLWork.prototype.addVertexFragmentProgram = function(vertexFragmentProgram, name) {
	var exists = false;
	for(var key in this.vertexFragmentPrograms) {
		if(this.vertexFragmentPrograms[key] == vertexFragmentProgram) {
			this.vertexFragmentPrograms[key] = vertexFragmentProgram;
			exists = true;
			break;
		}
	}
	if(exists == false) {
		this.vertexFragmentPrograms[name] = vertexFragmentProgram;
	}
};

/**
* @private
*/
WebCLGLWork.prototype.checkArg = function(argument) {
	kernelPr = [];
	vPr = [];
	fPr = [];
	updatedFromKernel = false;
	isBuffer = false;
	usedInVertex = false;
	usedInFragment = false;

	for(var key in this.kernels) {
		for(var nb=0; nb < this.kernels[key].in_values.length; nb++) {
			var inValues = this.kernels[key].in_values[nb];
			if(inValues.name == argument) {
				if(inValues.type == "buffer_float4") {
					type = "FLOAT4";
					isBuffer = true;
				} else if(inValues.type == "buffer_float") {
					type = "FLOAT";
					isBuffer = true;
				}

				kernelPr.push(this.kernels[key]);
				break;
			}
		}

		if(updatedFromKernel == false)
			updatedFromKernel = true;

	}


	for(var key in this.vertexFragmentPrograms) {
		for(var nb=0; nb < this.vertexFragmentPrograms[key].in_vertex_values.length; nb++) {
			var inValues = this.vertexFragmentPrograms[key].in_vertex_values[nb];
			if(inValues.name == argument) {
				if(inValues.type == "buffer_float4_fromKernel" || inValues.type == "buffer_float4") {
					type = "FLOAT4";
					isBuffer = true;
				} else if(inValues.type == "buffer_float_fromKernel" || inValues.type == "buffer_float") {
					type = "FLOAT";
					isBuffer = true;
				}

				vPr.push(this.vertexFragmentPrograms[key]);
				usedInVertex = true;
				break;
			}
		}

		for(var nb=0; nb < this.vertexFragmentPrograms[key].in_fragment_values.length; nb++) {
			var inValues = this.vertexFragmentPrograms[key].in_fragment_values[nb];
			if(inValues.name == argument) {
				if(inValues.type == "buffer_float4") {
					type = "FLOAT4";
					isBuffer = true;
				} else if(inValues.type == "buffer_float") {
					type = "FLOAT";
					isBuffer = true;
				}

				fPr.push(this.vertexFragmentPrograms[key]);
				usedInFragment = true;
				break;
			}
		}
	}
};

/**
* Assign value of a argument for all added Kernels and vertexFragmentPrograms
* @param {String} argument Argument to set
* @param {Array<Float>|Float32Array|Uint8Array|WebGLTexture|HTMLImageElement} value
* @param {Array<Float>} [splits=[value.length]]
* @param {Array<Float2>} [overrideDimensions=new Array(){Math.sqrt(value.length), Math.sqrt(value.length)}]
 */
WebCLGLWork.prototype.setArg = function(argument, value, splits, overrideDimensions) {
	this.checkArg(argument);


	if(isBuffer == true) {
		if(updatedFromKernel == true && usedInVertex == true) {
			mode = "VERTEX_FROM_KERNEL";
		} else if(usedInVertex == true) {
			if(kernelPr.length > 0 || usedInFragment == true) {
				mode = "VERTEX_AND_FRAGMENT";
			} else {
				mode = "VERTEX";
			}
		} else {
			mode = "FRAGMENT";
		}

		var length;
		if(overrideDimensions == undefined) {
			length = (value instanceof HTMLImageElement) ? (value.width*value.height) : ((type == "FLOAT4") ? value.length/4 : value.length);
		} else {
			length = [overrideDimensions[0], overrideDimensions[1]];
		}
		var spl = (splits != undefined) ? splits : [length];

		buff = this.webCLGL.createBuffer(length, type, this.offset, false, mode, spl);
		this.webCLGL.enqueueWriteBuffer(buff, value);
		this.buffers[argument] = buff;
		//if(updatedFromKernel == true) {
			buffTMP = this.webCLGL.createBuffer(length, type, this.offset, false, mode, spl);
			this.webCLGL.enqueueWriteBuffer(buffTMP, value);
			this.buffers_TEMP[argument] = buffTMP;
		//}


		for(var n=0; n < kernelPr.length; n++)
			kernelPr[n].setKernelArg(argument, this.buffers[argument]);

		for(var n=0; n < vPr.length; n++)
			vPr[n].setVertexArg(argument, this.buffers[argument]);

		for(var n=0; n < fPr.length; n++)
			fPr[n].setFragmentArg(argument, this.buffers[argument]);
	} else {
		for(var n=0; n < kernelPr.length; n++)
			kernelPr[n].setKernelArg(argument, value);

		for(var n=0; n < vPr.length; n++)
			vPr[n].setVertexArg(argument, value);

		for(var n=0; n < fPr.length; n++)
			fPr[n].setFragmentArg(argument, value);
	}
};

/**
* Set shared argument from other work
* @param {String} argument Argument to set
* @param {WebCLGLWork} clglWork
*/
WebCLGLWork.prototype.setSharedBufferArg = function(argument, clglWork) {
	this.checkArg(argument);


	this.buffers[argument] = clglWork.buffers[argument];
	this.buffers_TEMP[argument] = clglWork.buffers_TEMP[argument];

	for(var n=0; n < kernelPr.length; n++)
		kernelPr[n].setKernelArg(argument, this.buffers[argument]);

	for(var n=0; n < vPr.length; n++)
		vPr[n].setVertexArg(argument, this.buffers[argument]);

	for(var n=0; n < fPr.length; n++)
		fPr[n].setFragmentArg(argument, this.buffers[argument]);
};

/**
* Get all arguments existing in passed kernels & vertexFragmentPrograms
* @returns {Object}
 */
WebCLGLWork.prototype.getAllArgs = function() {
	var args = {};
	for(var key in this.kernels) {
		for(var nb=0; nb < this.kernels[key].in_values.length; nb++) {
			var inValues = this.kernels[key].in_values[nb];
			args[inValues.name] = inValues;
		}
	}


	for(var key in this.vertexFragmentPrograms) {
		for(var nb=0; nb < this.vertexFragmentPrograms[key].in_vertex_values.length; nb++) {
			var inValues = this.vertexFragmentPrograms[key].in_vertex_values[nb];
			args[inValues.name] = inValues;
		}

		for(var nb=0; nb < this.vertexFragmentPrograms[key].in_fragment_values.length; nb++) {
			var inValues = this.vertexFragmentPrograms[key].in_fragment_values[nb];
			args[inValues.name] = inValues;
		}
	}

	return args;
};

/**
* Set indices for the geometry passed in vertexFragmentProgram
* @param {Array<Float>} array
* @param {Array<Float>} [splits=[array.length]]
 */
WebCLGLWork.prototype.setIndices = function(arr, splits) {
	var spl = (splits != undefined) ? splits : [arr.length];
	this.CLGL_bufferIndices = this.webCLGL.createBuffer(arr.length, "FLOAT", this.offset, false, "VERTEX_INDEX", spl);
	this.webCLGL.enqueueWriteBuffer(this.CLGL_bufferIndices, arr);
};

/**
* Process kernels
* @param {String} kernelName
* @param {WebCLGLBuffer} [webCLGLBuffer=undefined]
* @param {Int} [geometryLength=1] - Length of geometry (1 for points, 3 for triangles...)
 */
WebCLGLWork.prototype.enqueueNDRangeKernel = function(kernelName, argumentToUpdate, geometryLength) {
	this.webCLGL.enqueueNDRangeKernel(this.kernels[kernelName], argumentToUpdate, geometryLength);
};

/**
* Process VertexFragmentProgram
* @param {String} [argument=undefined] Argument for vertices count or undefined if indices exist
* @param {String} Name (vertexFragmentProgramName) of vertexFragmentProgram to execute
* @param {Int} drawMode
* @param {Int} [geometryLength=1] - Length of geometry (1 for points, 3 for triangles...)
 */
WebCLGLWork.prototype.enqueueVertexFragmentProgram = function(argument, vertexFragmentProgramName, drawMode, geometryLength) {
	var buff = (this.CLGL_bufferIndices != undefined) ? this.CLGL_bufferIndices : this.buffers[argument];
	this.webCLGL.enqueueVertexFragmentProgram(this.vertexFragmentPrograms[vertexFragmentProgramName], buff, drawMode, geometryLength);
};
