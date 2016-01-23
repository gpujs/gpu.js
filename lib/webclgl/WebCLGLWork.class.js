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
