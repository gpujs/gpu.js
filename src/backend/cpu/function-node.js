const BaseFunctionNode = require('../function-node-base');

/**
 * @class CPUFunctionNode
 * 
 * @extends BaseFunctionNode
 *
 * @desc [INTERNAL] Represents a single function, inside JS, webGL, or openGL.
 *
 * <p>This handles all the raw state, converted state, etc. Of a single function.</p>
 *
 * @prop functionName         - {String}        Name of the function
 * @prop jsFunction           - {Function}   The JS Function the node represents
 * @prop jsFunctionString     - {String}        jsFunction.toString()
 * @prop paramNames           - {String[]}  Parameter names of the function
 * @prop paramTypes           - {String[]}  Shader land parameters type assumption
 * @prop isRootKernel         - {Boolean}       Special indicator, for kernel function
 * @prop webglFunctionString  - {String}        webgl converted function string
 * @prop openglFunctionString - {String}        opengl converted function string
 * @prop calledFunctions      - {String[]}  List of all the functions called
 * @prop initVariables        - {String[]}  List of variables initialized in the function
 * @prop readVariables        - {String[]}  List of variables read operations occur
 * @prop writeVariables       - {String[]}  List of variables write operations occur
 *
 */
module.exports = class CPUFunctionNode extends BaseFunctionNode {
	generate(options) {
		this.functionString = this.jsFunctionString;
	}

	/**
	 * @memberOf CPUFunctionNode
	 * @function
	 * @name getFunctionPrototypeString
	 *
	 * @desc Returns the converted webgl shader function equivalent of the JS function
	 *
	 * @returns {String} webgl function string, result is cached under this.getFunctionPrototypeString
	 *
	 */
	getFunctionPrototypeString(options) {
		return this.functionString;
	}
};