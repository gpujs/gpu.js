const UtilsCore = require("./utils-core");

/**
 * Class: GPUCore
 *
 * This is a minimalistic version of GPU.js used 
 * To run precompiled GPU.JS code
 *
 * This intentionally excludes the JS AST compiller : which is 400kb alone
 *
 */
module.exports = class GPUCore {

	/**
	 * Function: loadKernelObj
	 *
	 * Loads the precompilled kernel object. For GPUCore this is the ONLY way to create the kernel.
	 * To generate the kernelObj use <Kernel.exportKernelObj>
	 *
	 * Note that this function calls <validateKernelObj> internally, and throws an exception if it fails.
	 *
	 * See Also:
	 * 	<GPUCore.validateKernelObj>,
	 * 	<Kernel.exportKernelObj>
	 *
	 * Parameters: 
	 * 	kernelObj - <Object> The precompilled kernel object
	 * 	inOpt     - <Object> [Optional] the option overrides to use
	 *
	 * Returns:  
	 * 	<Function> The kernel function
	 * 
	 */
	static loadKernelObj(kernelObj, inOpt) {

		// Validates the kernelObj, throws an exception if it fails
		// kernelObj = validateKernelObj(kernelObj);

		
	}
}