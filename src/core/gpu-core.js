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
	 * Function: validateKernelObj
	 *
	 * Validates the KernelObj to comply with the defined format
	 * Note that this does only a limited sanity check, and does not  
	 * gurantee a full working validation.
	 *
	 * For the kernel object format see : <kernelObj-format>
	 *
	 * Parameters:
	 * 	kernelObj     - <Object>/<String> KernelObj used to validate
	 *
	 * Returns:
	 * 	<Object> The validated kernel object, converted from JSON if needed
	 *
	 */
	static validateKernelObj(kernelObj) {

		// NULL validation
		if( kernelObj == null ) {
			throw "KernelObj being validated is NULL";
		}

		// String JSON conversion
		if( typeof kernelObj === "string" ) {
			try {
				kernelObj = JSON.parse(kernelObj);
			} catch(e) {
				console.error(e);
				throw "Failed to convert KernelObj from JSON string";
			}

			// NULL validation
			if( kernelObj == null ) {
				throw "Invalid (NULL) KernelObj JSON string representation";
			}
		}

		// Check for kernel obj flag
		if( kernelObj.isKernelObj != true ) {
			throw "Failed missing isKernelObj flag check";
		}

		// Return the validated kernelObj
		return kernelObj;
	}

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
		kernelObj = validateKernelObj(kernelObj);

		
	}
}