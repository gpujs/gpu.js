const UtilsCore = require("../../core/utils-core");

/**
 * Class: CPUKernelRunner
 * 
 * Core static class which does the actual execution process. For the CPU.
 */
class CPUKernelRunner {
	/**
	 * Function: run
	 * 
	 * Takes in a precompiled CPUKernelObject, along with its settings cache.
	 * 
	 * Parmeters:
	 *    runCache      - {Object}  Represents the common cache object, to store run time results, such as _canvas. 
	 *                              This is commonly the kernel function itself, that was executed.
	 *    kernelObj     - {Object}  Precompiled JS kernel obj (see below)
	 *    args          - {Array}   Array of arguments, to pass as input
	 * 
	 * kernelObj Format:
	 *    headerStr     - {String}  Header kernel strings, containing possibly other sub kernel functions
	 *    kernelStr     - {String}  representation of the core kernel internals function, without the function quotes
	 *    paramNames    - {Array}   of Strings representing the kernelStr parameter names
	 *    graphical     - {Boolean} indicator if output should be to a graphical canvas
	 *    dimensions    - {Array}   dimensions settings, also known as threadDim
	 *    constants     - {Object}  constant values to use
	 * 
	 * runCache Format:
	 *    _cpuCanvas    - {Canvas}    Specifically for the CPU runtime
	 *    _canvas       - {Canvas}    For either the CPU or the GPU, defaults to latest run
	 *    _cpuKernel    - {Function}  The CPU run kernel
	 * 
	 * Return:
	 *    Run result {Array}, in the respective configured dimension, etc.
	 */
	static run(runCache, kernelObj, args) {
		
		// Pre-extract key vars
		let headerStr  = kernelObj.headerStr || "";
		let kernelStr  = kernelObj.kernelStr || "";
		let paramNames = kernelObj.paramNames || [];
		let graphical  = kernelObj.graphical || false;
		let threadDim  = UtilsCore.clone(kernelObj.dimensions);

		// Normalize args as an array
		args = args || [];

		// Normalize thread dim, for CPU mode to be a mimum 3 dimensional computation,
		// Hence the "clone" previously, to not modify the existing configuration.
		while (threadDim.length < 3) {
			threadDim.push(1);
		}

		// Setup the possible return result array
		let ret = new Array(threadDim[2]);
		for (let i=0; i<threadDim[2]; i++) {
			ret[i] = new Array(threadDim[1]);
			for (let j=0; j<threadDim[1]; j++) {
				ret[i][j] = new Array(threadDim[0]);
			}
		}

		// Context setup, for local this.x support, within the function
		let ctx = {
			thread: {
				x: 0,
				y: 0,
				z: 0
			},
			dimensions: {
				x: threadDim[0],
				y: threadDim[1],
				z: threadDim[2]
			},
			constants: kernelObj.constants || {}
		};

		// Canvas and image data (only intialized and used in graphical mode)
		let canvas = runCache._canvasCpu;
		let canvasCtx;
		let imageData;
		let data;
		if (graphical) {
			if (!canvas) {
				// Initialize a canvas object
				canvas = UtilsCore.initCanvas();
				
				// Link up the canvas to the run cache
				runCache._canvasCpu = canvas;
				runCache._canvas = canvas;
			}
			
			canvas.width = threadDim[0];
			canvas.height = threadDim[1];

			canvasCtx = canvas.getContext("2d");
			imageData = canvasCtx.createImageData(threadDim[0], threadDim[1]);
			data = new Uint8ClampedArray(threadDim[0]*threadDim[1]*4);
			
			// Color manipulation function, for the runtime kernel
			ctx.color = function(r, g, b, a) {
				if (a == undefined) {
					a = 1.0;
				}

				r = Math.floor(r * 255);
				g = Math.floor(g * 255);
				b = Math.floor(b * 255);
				a = Math.floor(a * 255);

				let width = ctx.dimensions.x;
				let height = ctx.dimensions.y;

				let x = ctx.thread.x;
				let y = height - ctx.thread.y - 1;

				let index = x + y*width;

				data[index*4+0] = r;
				data[index*4+1] = g;
				data[index*4+2] = b;
				data[index*4+3] = a;
			};
		} else {
			ctx.color = function() {
				throw "color functionality is only valid in graphical mode"
			}
		}

		// The actual runKernel, taken from cache first
		let runKernel = runCache._cpuKernel;

		if( runKernel == null ) {
			// Checks for header string
			if( headerStr != null && headerStr.length > 0) {
				// The header string exists, and is required, eval it!
				runKernel = (function() {
					// The GPU_jsRunKernel to return subsequently
					// this is a reserved key word (as per the GPU_ prefix)
					var GPU_jsRunKernel = null;
					
					// Execute everything in an eval
					eval(
						// Loads the header string, for other possible header functions
						headerStr+
						"\n"+
						// Build the actual kernel
						"GPU_jsRunKernel = function("+paramNames.join(",")+") {\n"+
							kernelStr+
							"\n"+
						"}"
					);

					// Return the kernel
					return GPU_jsRunKernel;
				})();
			} else {
				// Else build it as a "normal" function
				runKernel = new Function(paramNames, kernelStr);
			}

			// Cache the prebuilt _cpuKernel
			runCache._cpuKernel = runKernel;
		}
		
		// Runs and return the kernel result, over each combination
		for (ctx.thread.z=0; ctx.thread.z<threadDim[2]; ctx.thread.z++) {
			for (ctx.thread.y=0; ctx.thread.y<threadDim[1]; ctx.thread.y++) {
				for (ctx.thread.x=0; ctx.thread.x<threadDim[0]; ctx.thread.x++) {
					ret[ctx.thread.z][ctx.thread.y][ctx.thread.x] = runKernel.apply(ctx, args);
				}
			}
		}

		// Update the graphical canvas (for graphical mode)
		if (graphical) {
			imageData.data.set(data);
			canvasCtx.putImageData(imageData, 0, 0);
		}

		// Collapsing and normalizing the results based on original dimensions settings
		if(kernelObj.dimensions.length == 1) {
			ret = ret[0][0];
		} else if(kernelObj.dimensions.length == 2) {
			ret = ret[0];
		}
		
		// Return the result
		return ret;
	}
}
module.exports = CPUKernelRunner;