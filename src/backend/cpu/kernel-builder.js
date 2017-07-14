const UtilsCore = require("../../core/utils-core");

/**
 * Class: CPUKernelBuilder
 * 
 * Core static class which does the kernel object construction. For the CPU.
 * This class forces a seperation of runner from builder
 */
class CPUKernelBuilder {

	/**
	 * Function: build
	 * 
	 * Takes a functionBuilder, and pump out its compiled kernelObj
	 * 
	 * Parmeters:
	 *    fBuilder      - {FunctionBuilder}  The current kernel JS kernel representation
	 *    config        - {Object}  Configuration object for the function panel to assume
	 * 
	 * config Format:
	 *    graphical     - {Boolean} indicator if output should be to a graphical canvas
	 *    dimensions    - {Array}   dimensions settings, also known as threadDim
	 *    constants     - {Object}  constant values to use
	 * 
	 * Return:
	 *    {kernelObj}, format (see CPUKernelRunner)
	 */
	static build(fBuilder, config) {

		// The return object 
		let kernelObj = {};

		// Get the function node map
		let fNodeMap = fBuilder.nodeMap;

		// Get the kernel function param names
		
		// Start a kernel trace (for relevent function)

		// Get the depenent functions (headerStr)

		// The returned kernel format
		return kernelObj;
	} 
}