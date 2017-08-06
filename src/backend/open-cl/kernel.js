'use strict';

const fs = require('fs');
const nooocl = require('nooocl');
const CLHost = nooocl.CLHost;
const CLContext = nooocl.CLContext;
const CLBuffer = nooocl.CLBuffer;
const CLCommandQueue = nooocl.CLCommandQueue;
const NDRange = nooocl.NDRange;
const CLError = nooocl.CLError;


const fastcall = require('fastcall');
const ref = fastcall.ref;
const double = ref.types.double;

// Initialize OpenCL then we get host, device, context, and a queue
const host = CLHost.createV11();
const defs = host.cl.defs;
const platforms = host.getPlatforms();

const KernelBase = require('../kernel-base');
const utils = require('../../core/utils');
const Texture = require('../../core/texture');
const kernelString = require('./kernel-string');
let device = null;

module.exports = class OpenCLKernel extends KernelBase {

	/**
	 * @constructor OpenCLKernel
	 *
	 * @desc Kernel Implementation for WebGL. 
	 * <p>This builds the shaders and runs them on the GPU, 
	 * the outputs the result back as float(enabled by default) and Texture.</p>
	 *
	 * @extends KernelBase
	 *
	 * @prop {Object} textureCache - webGl Texture cache
	 * @prop {Object} threadDim - The thread dimensions, x, y and z
	 * @prop {Object} programUniformLocationCache - Location of program variables in memory
	 * @prop {Object} framebuffer - Webgl frameBuffer
	 * @prop {Object} buffer - WebGL buffer
	 * @prop {Object} program - The webGl Program
	 * @prop {Object} functionBuilder - Function Builder instance bound to this Kernel
	 * @prop {Boolean} outputToTexture - Set output type to Texture, instead of float
	 * @prop {String} endianness - Endian information like Little-endian, Big-endian.
	 * @prop {Array} paramTypes - Types of parameters sent to the Kernel
	 * @prop {number} argumentsLength - Number of parameters sent to the Kernel
	 * @prop {String} compiledFragShaderString - Compiled fragment shader string
	 * @prop {String} compiledVertShaderString - Compiled Vertical shader string
	 */
	constructor(fnString, settings) {
		super(fnString, settings);
		this.buffer = null;
		this.program = null;
		this.functionBuilder = settings.functionBuilder;
		this.outputToTexture = settings.outputToTexture;
		this.subKernelOutputTextures = null;
		this.subKernelOutputVariableNames = null;
		this.paramTypes = null;
		this.argumentsLength = 0;
		this.compiledFragShaderString = null;
		this.compiledVertShaderString = null;
		this.getDevice();
    const cl = this._openCl = new CLContext(device);
    this.queue = new CLCommandQueue(cl, device);
	}

	/**
	 * @memberOf OpenCLKernel#
	 * @function
	 * @name validateOptions
	 *
	 * @desc Validate options related to Kernel, such as 
	 * floatOutputs and Textures, texSize, dimensions, 
	 * graphical output.
	 *
	 */
	validateOptions() {

	}

	/**
	 * @memberOf OpenCLKernel#
	 * @function
	 * @name build
	 *
	 * @desc Builds the Kernel, by compiling Fragment and Vertical Shaders,
	 * and instantiates the program.
	 *
	 */

	build() {
		this.validateOptions();
		this.setupParams(arguments);

    const compiledKernelString = `#pragma OPENCL EXTENSION cl_khr_fp64 : enable
    ${ this._addKernels() }
    ${ this.functionBuilder.getPrototypeString('kernel') }`;

    if (this.debug) {
			console.log('Options:');
			console.dir(this);
			console.log('OpenCL Shader Output:');
			console.log(compiledKernelString);
		}

		this.program = this._openCl.createProgram(compiledKernelString);
		return this;
	}

	/**
	 * @memberOf OpenCLKernel#
	 * @function
	 * @name run
	 *
	 * @desc Run the kernel program, and send the output to renderOutput
	 *
	 * <p> This method calls a helper method *renderOutput* to return the result. </p>
	 * 
	 * @returns {Object} Result The final output of the program, as float, and as Textures for reuse.
	 *
	 *
	 */
	run() {
		if (this.program === null) {
			this.build.apply(this, arguments);
		}
		const paramNames = this.paramNames;
		const paramTypes = this.paramTypes;
		const texSize = this.texSize;
		const threadDim = this.threadDim;
		const framebuffer = this.framebuffer;
		const vertices = new Float32Array([-1, -1,
			1, -1, -1, 1,
			1, 1
		]);
		const texCoords = new Float32Array([
			0, 0,
			1, 0,
			0, 1,
			1, 1
		]);
		const gl = this._openCl;
		gl.useProgram(this.program);
		gl.scissor(0, 0, texSize[0], texSize[1]);

		const texCoordOffset = vertices.byteLength;
		let buffer = this.buffer;
		if (!buffer) {
			buffer = this.buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			gl.bufferData(gl.ARRAY_BUFFER, vertices.byteLength + texCoords.byteLength, gl.STATIC_DRAW);
		} else {
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		}
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
		gl.bufferSubData(gl.ARRAY_BUFFER, texCoordOffset, texCoords);

		const aPosLoc = gl.getAttribLocation(this.program, 'aPos');
		gl.enableVertexAttribArray(aPosLoc);
		gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, gl.FALSE, 0, 0);
		const aTexCoordLoc = gl.getAttribLocation(this.program, 'aTexCoord');
		gl.enableVertexAttribArray(aTexCoordLoc);
		gl.vertexAttribPointer(aTexCoordLoc, 2, gl.FLOAT, gl.FALSE, 0, texCoordOffset);

		if (!this.hardcodeConstants) {
			const uOutputDimLoc = this.getUniformLocation('uOutputDim');
			gl.uniform3fv(uOutputDimLoc, threadDim);
			const uTexSizeLoc = this.getUniformLocation('uTexSize');
			gl.uniform2fv(uTexSizeLoc, texSize);
		}

		this.argumentsLength = 0;
		for (let texIndex = 0; texIndex < paramNames.length; texIndex++) {
			this._addArgument(arguments[texIndex], paramTypes[texIndex], paramNames[texIndex]);
		}

		let outputTexture = this.getOutputTexture();
		gl.activeTexture(gl.TEXTURE0 + this.argumentsLength);
		gl.bindTexture(gl.TEXTURE_2D, outputTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		if (this.floatOutput) {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
		} else {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		}

		if (this.graphical) {
			gl.bindRenderbuffer(gl.RENDERBUFFER, null);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			return;
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outputTexture, 0);

		if (this.subKernelOutputTextures !== null) {
			const extDrawBuffers = [gl.COLOR_ATTACHMENT0];
			for (let i = 0; i < this.subKernelOutputTextures.length; i++) {
				const subKernelOutputTexture = this.subKernelOutputTextures[i];
				extDrawBuffers.push(gl.COLOR_ATTACHMENT0 + i + 1);
				gl.activeTexture(gl.TEXTURE0 + paramNames.length + i);
				gl.bindTexture(gl.TEXTURE_2D, subKernelOutputTexture);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				if (this.floatOutput) {
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
				} else {
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
				}
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i + 1, gl.TEXTURE_2D, subKernelOutputTexture, 0);
			}
			this.ext.drawBuffersWEBGL(extDrawBuffers);
		}

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		if (this.subKernelOutputTextures !== null) {
			if (this.subKernels !== null) {
				const output = [];
				output.result = this.renderOutput(outputTexture);
				for (let i = 0; i < this.subKernels.length; i++) {
					output.push(new Texture(this.subKernelOutputTextures[i], texSize, this.dimensions, this._openCl));
				}
				return output;
			} else if (this.subKernelProperties !== null) {
				const output = {
					result: this.renderOutput(outputTexture)
				};
				let i = 0;
				for (let p in this.subKernelProperties) {
					if (!this.subKernelProperties.hasOwnProperty(p)) continue;
					output[p] = new Texture(this.subKernelOutputTextures[i], texSize, this.dimensions, this._openCl);
					i++;
				}
				return output;
			}
		}

		return this.renderOutput(outputTexture);
	}

	/**
	 * @memberOf OpenCLKernel#
	 * @function
	 * @name renderOutput
	 *
	 * 
	 * @desc Helper function to return webGl function's output.
	 * Since the program runs on GPU, we need to get the 
	 * output of the program back to CPU and then return them.
	 *
	 * *Note*: This should not be called directly.
	 * 
	 * @param {Object} outputTexture - Output Texture returned by webGl program
	 *
	 * @returns {Object|Array} result
	 *
	 *
	 */
	renderOutput(outputTexture) {
		const texSize = this.texSize;
		const gl = this._openCl;
		const threadDim = this.threadDim;

		if (this.outputToTexture) {
			return new Texture(outputTexture, texSize, this.dimensions, this._openCl);
		} else {
			let result;
			if (this.floatOutput) {
				result = new Float32Array(texSize[0] * texSize[1] * 4);
				gl.readPixels(0, 0, texSize[0], texSize[1], gl.RGBA, gl.FLOAT, result);
			} else {
				const bytes = new Uint8Array(texSize[0] * texSize[1] * 4);
				gl.readPixels(0, 0, texSize[0], texSize[1], gl.RGBA, gl.UNSIGNED_BYTE, bytes);
				result = Float32Array.prototype.slice.call(new Float32Array(bytes.buffer));
			}

			result = result.subarray(0, threadDim[0] * threadDim[1] * threadDim[2]);

			if (this.dimensions.length === 1) {
				return result;
			} else if (this.dimensions.length === 2) {
				return utils.splitArray(result, this.dimensions[0]);
			} else if (this.dimensions.length === 3) {
				const cube = utils.splitArray(result, this.dimensions[0] * this.dimensions[1]);
				return cube.map(function(x) {
					return utils.splitArray(x, this.dimensions[0]);
				});
			}
		}
	}

	/**
	 * @memberOf OpenCLKernel#
	 * @function
	 * @name getOutputTexture
	 *
	 * @desc This uses *getTextureCache* to get the Texture Cache of the Output
	 *
	 * @returns {Object} Ouptut Texture Cache
	 *
	 */
	getOutputTexture() {
		return this.getTextureCache('OUTPUT');
	}

	/**
	 * @memberOf OpenCLKernel#
	 * @function
	 * @name getArgumentTexture
	 *
	 * @desc This uses *getTextureCache** to get the Texture Cache of the argument supplied
	 *	
	 * @param {String} name - Name of the argument
	 *
	 * 	Texture cache for the supplied argument
	 *
	 */
	getArgumentTexture(name) {
		return this.getTextureCache(`ARGUMENT_${ name }`);
	}

	/**
	 * @memberOf OpenCLKernel#
	 * @name getSubKernelTexture
	 * @function
	 *
	 * @desc This uses *getTextureCache* to get the Texture Cache of the sub-kernel
	 *
	 * @param {String} name - Name of the subKernel
	 *
	 * @returns {Object} Texture cache for the subKernel
	 *
	 */
	getSubKernelTexture(name) {
		return this.getTextureCache(`SUB_KERNEL_${ name }`);
	}

	/**
	 * @memberOf OpenCLKernel#
	 * @name getTextureCache
	 * @function
	 *
	 * @desc Returns the Texture Cache of the supplied parameter (can be kernel, sub-kernel or argument)
	 *
	 * @param {String} name - Name of the subkernel, argument, or kernel.
	 *
	 * @returns {Object} Texture cache
	 *
	 */
	getTextureCache(name) {
		if (this.outputToTexture) {
			// Don't retain a handle on the output texture, we might need to render on the same texture later
			return this._openCl.createTexture();
		}
		if (this.textureCache.hasOwnProperty(name)) {
			return this.textureCache[name];
		}
		return this.textureCache[name] = this._openCl.createTexture();
	}

	/**
	 * @memberOf OpenCLKernel#
	 * @function
	 * @name setupParams
	 *
	 * @desc Setup the parameter types for the parameters 
	 * supplied to the Kernel function
	 *
	 * @param {Array} args - The actual parameters sent to the Kernel
	 *
	 */
	setupParams(args) {
		const paramTypes = this.paramTypes = [];
		for (let i = 0; i < args.length; i++) {
			const param = args[i];
			const paramType = utils.getArgumentType(param);
			paramTypes.push(paramType);
		}
	}

	/**
	 * @memberOf OpenCLKernel#
	 * @function
	 * @name getUniformLocation
	 *
	 * @desc Return WebGlUniformLocation for various variables 
	 * related to webGl program, such as user-defiend variables,
	 * as well as, dimension sizes, etc.
	 *	
	 */
	getUniformLocation(name) {
		let location = this.programUniformLocationCache[name];
		if (!location) {
			location = this._openCl.getUniformLocation(this.program, name);
			this.programUniformLocationCache[name] = location;
		}
		return location;
	}

	/**
	 * @memberOf OpenCLKernel#
	 * @function
	 * @name _addArgument 
	 *
	 * @desc Adds kernel parameters to the Argument Texture, 
	 * binding it to the webGl instance, etc.
	 *
	 * @param {Array|Texture|Number} value - The actual argument supplied to the kernel
	 * @param {String} type - Type of the argument
	 * @param {String} name - Name of the argument
	 *
	 */
	_addArgument(value, type, name) {
		const cl = this._openCl;
		const argumentTexture = this.getArgumentTexture(name);
    // Initialize data on the host side:
    const n = 1000;
    const bytes = n * double.size;
    const pointer = new Buffer(n * double.size);

// // Initialize vectors on host
//     for (var i = 0; i < n; i++) {
//       var offset = i * double.size;
//       double.set(h_a, offset, 0.1 + 0.2);
//       double.set(h_b, offset, 0);
//     }

    const buffer = new CLBuffer(cl, defs.CL_MEM_READ_ONLY, bytes);
    this.queue.enqueueWriteBuffer(buffer, 0, bytes, pointer);
    this.kernel.setArg(this.argumentsLength, buffer);
		this.argumentsLength++;
	}

	/**
	 * @memberOf OpenCLKernel#
	 * @function
	 * @name _addKernels
	 *
	 * @desc Adds all the sub-kernels supplied with this Kernel instance.
	 *
	 */
	_addKernels() {
		const builder = this.functionBuilder;
		const gl = this._openCl;
		builder.addKernel(this.fnString, {
			prototypeOnly: false,
			constants: this.constants,
			debug: this.debug,
			loopMaxIterations: this.loopMaxIterations
		}, this.paramNames, this.paramTypes);

		if (this.subKernels !== null) {
			const ext = this.ext = gl.getExtension('WEBGL_draw_buffers');
			if (!ext) throw new Error('could not instantiate draw buffers extension');
			this.subKernelOutputTextures = [];
			this.subKernelOutputVariableNames = [];
			for (let i = 0; i < this.subKernels.length; i++) {
				const subKernel = this.subKernels[i];
				builder.addSubKernel(subKernel, {
					prototypeOnly: false,
					constants: this.constants,
					debug: this.debug,
					loopMaxIterations: this.loopMaxIterations
				});
				this.subKernelOutputTextures.push(this.getSubKernelTexture(i));
				this.subKernelOutputVariableNames.push(subKernel.name + 'Result');
			}

		} else if (this.subKernelProperties !== null) {
			const ext = this.ext = gl.getExtension('WEBGL_draw_buffers');
			if (!ext) throw new Error('could not instantiate draw buffers extension');
			this.subKernelOutputTextures = [];
			this.subKernelOutputVariableNames = [];
			let i = 0;
			for (let p in this.subKernelProperties) {
				if (!this.subKernelProperties.hasOwnProperty(p)) continue;
				const subKernel = this.subKernelProperties[p];
				builder.addSubKernel(subKernel, {
					prototypeOnly: false,
					constants: this.constants,
					debug: this.debug,
					loopMaxIterations: this.loopMaxIterations
				});
				this.subKernelOutputTextures.push(this.getSubKernelTexture(p));
				this.subKernelOutputVariableNames.push(subKernel.name + 'Result');
				i++;
			}
		}
	}

  getDevice() {
	  if (device !== null) return device;
	  const mode = this.mode;
    for (let platformIndex = 0; platformIndex < platforms.length; platformIndex++) {
      const devices = (mode === 'gpu'
        ? platforms[platformIndex].gpuDevices()
        : platforms[platformIndex].cpuDevices());

      for (let deviceIndex = 0; deviceIndex < devices.length; deviceIndex++) {
        // Is double precision supported?
        // See: https://www.khronos.org/registry/cl/sdk/1.1/docs/man/xhtml/clGetDeviceInfo.html
        if (devices[deviceIndex].doubleFpConfig
          & (
            defs.CL_FP_FMA
            | defs.CL_FP_ROUND_TO_NEAREST
            | defs.CL_FP_ROUND_TO_ZERO
            | defs.CL_FP_ROUND_TO_INF
            | defs.CL_FP_INF_NAN
            | defs.CL_FP_DENORM
          )) {
          return device = devices[deviceIndex];
        }
      }

      if (mode === 'auto') {
        console.warn('No GPU device has been found, searching for a CPU fallback.');
        return this.getDevice('cpu');
      }
    }

    throw new Error('no devices found');
  }
	/**
	 * @memberOf OpenCLKernel#
	 * @function
	 * @name toString
	 *
	 * @desc Returns the *pre-compiled* Kernel as a JS Object String, that can be reused.
	 *
	 */
	toString() {
		return kernelString(this);
	}
};