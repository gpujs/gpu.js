/**
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
