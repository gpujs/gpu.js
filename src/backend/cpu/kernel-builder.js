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
	static build(functionBuilderObj, config) {

		// The return object 
		let kernelObj = {};

		// Setup the kernelObj, with required config values
		kernelObj.dimensions = config.dimensions;
		kernelObj.constants = config.constants || {};
		kernelObj.graphical = config.graphical || false;

		// Get the function node map
		let functionNodeMap = functionBuilderObj.nodeMap;

		// Get the kernel node
		let kernelNode = functionNodeMap['kernel'];
		if( kernelNode == null ) {
			throw "Missing kernel function : unable to transpile"
		}

		// Get the kernel function param names
		let paramNames = kernelNode.paramNames;
		kernelObj.paramNames = paramNames;

		// Start a kernel trace (for relevent function)
		//
		// @TODO : Migrate the function builder / node core functionality to its base
		// @TODO : Migrate webgl transpiler to WebGLKernelBuilder
		// @TODO : Deprecate all cpu/web-gl specific functionBuilder / Node
		// 
		// Till then assume ALL functions are "required"
		let kernelTrace = Object.getOwnPropertyNames(functionNodeMap);

		// Get the dependent functions (headerStr)
		let headerStrArr = [];
		for(let i=0; i<kernelTrace.length; ++i) {
			let funcName = kernelTrace[i];

			// Skip the main kernel function
			if( funcName == "kernel" ) {
				continue;
			}

			// Process all other nodes
			let subNode = functionNodeMap[funcName];
			if( subNode ) {
				headerStrArr.push( subNode.getJsFunctionString() );
			}
		}

		// And build it into kernelObj
		if( headerStrArr.length > 0 ) {
			kernelObj.headerStr = headerStrArr.join("\n");
		}

		// And build it into kernelObj
		if( headerStrArr.length > 0 ) {
			kernelObj.headerStr = headerStrArr.join("\n");
		}

		// Get the kernel function string
		kernelObj.kernelStr = kernelNode.getJsFunctionBody();

		// The returned kernel format
		return kernelObj;
	} 
}

// Actual class export
module.exports = CPUKernelBuilder;