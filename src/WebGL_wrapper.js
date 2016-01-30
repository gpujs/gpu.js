///
/// Class used to implmenet webgl support of shadder code
///
/// This is based on work done on webclgl, and as of now just wraps around webclgl for its usage
///
/// @class
/// @constructor
/// @param {WebGLRenderingContext} [webglcontext=undefined] your WebGLRenderingContext
///
var WebGL_wrapper = function WebGL_wrapper() {
	// The existing webCLGL implmentation
	this.webCLGL = new WebCLGL();
}


/**
* Create a empty WebCLGLBuffer
* @param {Int|Array<Float>} length Length of buffer or Array with width and height values if is for a WebGLTexture
* @param {String} [type="FLOAT"] type FLOAT4 OR FLOAT
* @param {Int} [offset=0] If 0 the range is from 65535.0 to 65535.0 else if >0 then the range is from -offset.0 to offset.0
* @param {Bool} [linear=false] linear texParameteri type for the WebGLTexture
* @param {String} [mode="FRAGMENT"] Mode for this buffer. "FRAGMENT", "VERTEX", "VERTEX_INDEX", "VERTEX_FROM_KERNEL", "VERTEX_AND_FRAGMENT"
* @param {Array} [splits=[length]] Splits length for this buffer.
* @returns {WebCLGLBuffer}
*/
WebGL_wrapper.prototype.createBuffer = function createBuffer(length, type, offset, linear, mode, splits) {
	offset = offset || 65535;
	return new WebCLGLBuffer(this.webCLGL.gl, length, type, offset, linear, mode, splits);
};

/**
* Write on buffer
* @type Void
* @param {WebCLGLBuffer} buffer
* @param {Array|Float32Array|Uint8Array|WebGLTexture|HTMLImageElement} array
* @param {Bool} [flip=false]
*/
WebGL_wrapper.prototype.enqueueWriteBuffer = function(buffer, arr, flip) {
	if(buffer.mode == "FRAGMENT" || buffer.mode == "VERTEX_FROM_KERNEL" || buffer.mode == "VERTEX_AND_FRAGMENT") {
		buffer.writeWebGLTextureBuffer(arr, flip);
	}
	if(buffer.mode == "VERTEX" || buffer.mode == "VERTEX_INDEX" || buffer.mode == "VERTEX_FROM_KERNEL" || buffer.mode == "VERTEX_AND_FRAGMENT") {
		buffer.writeWebGLBuffer(arr, flip);
	}
};

/**
* Create a kernel
* @returns {WebCLGLKernel}
* @param {String} [source=undefined]
* @param {String} [header=undefined] Additional functions - IMPORTANT: THIS DOES NOT GET VOODOO-ED!
*/
WebGL_wrapper.prototype.createKernel = function(source, header) {
	var webclglKernel = new WebCLGLKernel(this.webCLGL.gl, source, header);
	return webclglKernel;
};

/**
* Perform calculation and save the result on a WebCLGLBuffer
* @param {WebCLGLKernel} webCLGLKernel
* @param {WebCLGLBuffer} [webCLGLBuffer=undefined]
* @param {Int} [geometryLength=1] - Length of geometry (1 for points, 3 for triangles...)
*/
WebGL_wrapper.prototype.enqueueNDRangeKernel = function(webCLGLKernel, webCLGLBuffers, geometryLength) {
	if(webCLGLBuffers != undefined) {
		for(var i=0; i < webCLGLBuffers.items.length; i++) {
			webCLGLBuffer = webCLGLBuffers.items[i];

			this.webCLGL.gl.viewport(0, 0, webCLGLBuffer.W, webCLGLBuffer.H);
			this.webCLGL.gl.bindFramebuffer(this.webCLGL.gl.FRAMEBUFFER, webCLGLBuffer.fBuffer);
			this.webCLGL.gl.framebufferTexture2D(this.webCLGL.gl.FRAMEBUFFER, this.webCLGL.gl.COLOR_ATTACHMENT0, this.webCLGL.gl.TEXTURE_2D, webCLGLBuffer.textureData, 0);

			this.webCLGL.enqueueNDRangeKernelNow(webCLGLKernel, i, geometryLength);
		}
	} else {
		this.webCLGL.gl.bindFramebuffer(this.webCLGL.gl.FRAMEBUFFER, null);

		this.webCLGL.enqueueNDRangeKernelNow(webCLGLKernel, 0, geometryLength);
	}
};

/**
* Get 1 Float32Array array from a WebCLGLBuffer type FLOAT <br>
* Internally performs one calls to enqueueReadBuffer and return the data in one array of one Float32Array
* @param {WebCLGLBuffer} buffer
* @returns {Array<Array>}
*/
WebGL_wrapper.prototype.enqueueReadBuffer_Float = function(buffers) {
	var Float_Un = [[]];
	if(buffers.items[0].type == "FLOAT") {
		for(var i=0; i < buffers.items.length; i++) {
			buffer = buffers.items[i];

			this.webCLGL.prepareViewportForBufferRead(buffer);
			this.webCLGL.gl.useProgram(this.webCLGL.shader_readpixels);

			buffer.Packet4Uint8Array_Float = [this.webCLGL.enqueueReadBuffer(buffer, 0)];
			buffer.Float = [];

			for(var n=0, fn= 1; n < fn; n++) {
				var arr = buffer.Packet4Uint8Array_Float[n];

				var outArrayFloat32Array = new Float32Array((buffer.W*buffer.H));
				for(var nb = 0, fnb = arr.length/4; nb < fnb; nb++) {
					var idd = nb*4;
					if(buffer.offset>0) outArrayFloat32Array[nb] = (this.webCLGL.utils.unpack([arr[idd+0]/255,
																								arr[idd+1]/255,
																								arr[idd+2]/255,
																								arr[idd+3]/255])*(buffer.offset*2))-buffer.offset;
					else outArrayFloat32Array[nb] = (this.webCLGL.utils.unpack([	arr[idd+0]/255,
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
