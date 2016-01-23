var GPU_regex = (function() {
	String.prototype.replaceAll = function (find, replace) {
	    var str = this;
	    return str.replace(new RegExp(find, 'g'), replace);
	};

	webCLGL = new WebCLGL();
	
	function clone(obj) {
	    if(obj === null || typeof(obj) !== 'object' || 'isActiveClone' in obj)
	        return obj;

	    var temp = obj.constructor(); // changed

	    for(var key in obj) {
	        if(Object.prototype.hasOwnProperty.call(obj, key)) {
	            obj['isActiveClone'] = null;
	            temp[key] = clone(obj[key]);
	            delete obj['isActiveClone'];
	        }
	    }

	    return temp;
	}
	
	var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
	var ARGUMENT_NAMES = /([^\s,]+)/g;
	function getParamNames(func) {
		var fnStr = func.toString().replace(STRIP_COMMENTS, '');
		var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
		if(result === null)
			result = [];
		return result;
	}
	
	/// Does simple validation of the provided function string if it is a function
	/// this is a basic sanity testing before Jison conversion
	///
	/// @param funcStr  the input function string
	///
	/// @returns boolean
	function validateStringIsFunction( funcStr ) {
		if( funcStr != null ) {
			return (funcStr.slice(0, "function".length).toLowerCase() == "function")
		}
		return false;;
	}
	
	/// Does the core conversion of a basic Javascript function into a webclgl
	/// and returns a callable function if valid
	///
	/// @param inputFunction   The calling to perform the conversion
	/// @param _threadDim      The thread dim array configuration
	/// @param _blockDim       The block dim array configuration
	/// @param paramObj        The parameter object
	///
	/// @returns callable function if converted, else returns null
	function regex( inputFunction, _threadDim, _blockDim ) {
		var threadDim = clone(_threadDim);
		var blockDim = clone(_blockDim);
		
		while (threadDim.length < 3) {
			threadDim.push(1);
		}
		
		while (blockDim.length < 3) {
			blockDim.push(1);
		}
		
		var globalDim = [
			threadDim[0] * blockDim[0],
			threadDim[1] * blockDim[1],
			threadDim[2] * blockDim[2]
		];
		
		var totalSize = globalDim[0] * globalDim[1] * globalDim[2];
		
		var funcStr = inputFunction.toString();
		var funcBody = funcStr.toString().match(/function[^{]+\{([\s\S]*)\}$/)[1];
		
		funcBody = funcBody.replaceAll('var ', 'float ');
		funcBody = funcBody.replaceAll('this.thread.x', '_x_');
		funcBody = funcBody.replaceAll('return ', 'out_float = ');
		
		var argNames = getParamNames(inputFunction);
		
		var shaderCode = 'void main(';
		for (var i=0; i<argNames.length; i++) {
			shaderCode += 'float* ' + argNames[i];
			if (i!=argNames.length-1) {
				shaderCode += ', \n';
			}
		}
		shaderCode += ') {\n';
		shaderCode += '     vec2 _x_ = get_global_id();';
		shaderCode += funcBody;
		shaderCode += '}';
		console.log(shaderCode);
		
		//var buffer_A = webCLGL.createBuffer(_length, "FLOAT", offset);
		return function() {
			
			var argBuffers = [];
			
			var offset = 0;
			
			var resultBuffer = webCLGL.createBuffer(totalSize, "FLOAT", offset);
			
			var argNorm = [];
			
			for (var i=0; i<argNames.length; i++) {
				argNorm[i] = arguments[i].map(function(x) {
					return x / 65535.0;
				});
			}
			
			for (var i=0; i<argNames.length; i++) {
				argBuffers[i] = webCLGL.createBuffer(argNorm[i].length, "FLOAT", offset);
			}
			for (var i=0; i<argNames.length; i++) {
				webCLGL.enqueueWriteBuffer(argBuffers[i], argNorm[i]);
			}
			var kernel = webCLGL.createKernel(shaderCode);
			for (var i=0; i<argNames.length; i++) {
				kernel.setKernelArg(i, argBuffers[i]);
			}
			webCLGL.enqueueNDRangeKernel(kernel, resultBuffer);
			
			var result = webCLGL.enqueueReadBuffer_Float(resultBuffer);
			result = Array.prototype.slice.call(result[0]);
			result = result.map(function(x) {
				return Math.round(x * 65535.0 * 100000.0) / 100000.0;
			});
			return result;
		};
	}
	
	return regex;
})();
