const BaseFunctionNode = require('../function-node-base');

///
/// Class: CPUFunctionNode
///
/// [INTERNAL] Represents a single function, inside JS, webGL, or openGL.
///
/// This handles all the raw state, converted state, etc. Of a single function.
///
/// Properties:
/// 	functionName         - {String}        Name of the function
/// 	jsFunction           - {JS Function}   The JS Function the node represents
/// 	jsFunctionString     - {String}        jsFunction.toString()
/// 	paramNames           - {[String,...]}  Parameter names of the function
/// 	paramTypes           - {[String,...]}  Shader land parameters type assumption
/// 	isRootKernel         - {Boolean}       Special indicator, for kernel function
/// 	webglFunctionString  - {String}        webgl converted function string
/// 	openglFunctionString - {String}        opengl converted function string
/// 	calledFunctions      - {[String,...]}  List of all the functions called
/// 	initVariables        - {[String,...]}  List of variables initialized in the function
/// 	readVariables        - {[String,...]}  List of variables read operations occur
/// 	writeVariables       - {[String,...]}  List of variables write operations occur
///
module.exports = class CPUFunctionNode extends BaseFunctionNode {
	generate(options) {
		this.functionString = this.jsFunctionString;
	}

	///
	/// Function: getFunctionPrototypeString
	///
	/// Returns the converted webgl shader function equivalent of the JS function
	///
	/// Returns:
	/// 	{String} webgl function string, result is cached under this.getFunctionPrototypeString
	///
	getFunctionPrototypeString(options) {
		return this.functionString;
	}
};