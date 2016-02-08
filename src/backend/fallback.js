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

	/// JS fallback transformation, basically pure JS
	///
	/// @param inputFunction   The calling to perform the conversion
	/// @param _threadDim      The thread dim array configuration
	/// @param _blockDim       The block dim array configuration
	/// @param paramObj        The parameter object
	///
	/// @returns callable function if converted, else returns null
	GPU.prototype._backendFallback = function(kernel, paramObj) {
		var threadDim = clone(paramObj.dimensions);
		
		while (threadDim.length < 3) {
			threadDim.push(1);
		}
		
		return function() {
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
				}
			};
			
			for (ctx.thread.z=0; ctx.thread.z<threadDim[2]; ctx.thread.z++) {
				for (ctx.thread.y=0; ctx.thread.y<threadDim[1]; ctx.thread.y++) {
					for (ctx.thread.x=0; ctx.thread.x<threadDim[0]; ctx.thread.x++) {
						ret[ctx.thread.z][ctx.thread.y][ctx.thread.x] = kernel.apply(ctx, arguments);
					}
				}
			}
					
			if (paramObj.dimensions.length == 1) {
				ret = ret[0][0];
			} else if (paramObj.dimensions.length == 2) {
				ret = ret[0];
			}
			
			return ret;
		};
	};
})(GPU);
