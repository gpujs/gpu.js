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
};