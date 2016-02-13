(function (GPU) {
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
	
	function getArgumentType(arg) {
		if (Array.isArray(arg)) {
			return 'Array';
		} else if (typeof arg == "number") {
			return 'Number';
		} else if (arg instanceof GPUTexture) {
			return 'Texture';
		} else {
			return 'Unknown';
		}
	}

	/// JS fallback transformation, basically pure JS
	///
	/// @param inputFunction   The calling to perform the conversion
	/// @param opt             The parameter object
	///
	/// @returns callable function if converted, else returns null
	GPU.prototype._backendFallback = function(kernel, opt) {
		var gpu = this;
		
		function ret() {
			if (!opt.dimensions || opt.dimensions.length === 0) {
				if (arguments.length != 1) {
					throw "Auto dimensions only supported for kernels with only one input";
				}
				
				var argType = getArgumentType(arguments[0]);
				if (argType == "Array") {
					opt.dimensions = getDimensions(argType);
				} else if (argType == "Texture") {
					opt.dimensions = arguments[0].dimensions;
				} else {
					throw "Auto dimensions not supported for input type: " + argType;
				}
			}
			
			var kernelArgs = [];
			for (var i=0; i<arguments.length; i++) {
				var argType = getArgumentType(arguments[i]);
				if (argType == "Array" || argType == "Number") {
					kernelArgs[i] = arguments[i];
				} else if (argType == "Texture") {
					kernelArgs[i] = arguments[i].toArray();
				} else {
					throw "Input type not supported: " + arguments[i];
				}
			}
			
			var threadDim = clone(opt.dimensions);
			
			while (threadDim.length < 3) {
				threadDim.push(1);
			}
			
			var ret = new Array(threadDim[2]);
			for (var i=0; i<threadDim[2]; i++) {
				ret[i] = new Array(threadDim[1]);
				for (var j=0; j<threadDim[1]; j++) {
					ret[i][j] = new Array(threadDim[0]);
				}
			}
			
			var ctx = {
				thread: {
					x: 0,
					y: 0,
					z: 0
				},
				dimensions: threadDim
			};
			
			for (ctx.thread.z=0; ctx.thread.z<threadDim[2]; ctx.thread.z++) {
				for (ctx.thread.y=0; ctx.thread.y<threadDim[1]; ctx.thread.y++) {
					for (ctx.thread.x=0; ctx.thread.x<threadDim[0]; ctx.thread.x++) {
						ret[ctx.thread.z][ctx.thread.y][ctx.thread.x] = kernel.apply(ctx, kernelArgs);
					}
				}
			}
					
			if (opt.dimensions.length == 1) {
				ret = ret[0][0];
			} else if (opt.dimensions.length == 2) {
				ret = ret[0];
			}
			
			return ret;
		}
		
		ret.dimensions = function(dim) {
			opt.dimensions = dim;
			return ret;
		};
		
		ret.wraparound = function() {
			opt.wraparound = false;
			return ret;
		};
		
		ret.outputToTexture = function() {
			opt.outputToTexture = false;
			return ret;
		};
		
		ret.mode = function(mode) {
			opt.mode = mode;
			return gpu.createKernel(kernel, opt);
		};
		
		return ret;
	};
})(GPU);
