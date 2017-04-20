const BaseFunctionNode = require('../base-function-node');

///
/// Class: functionNode
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
/// 	paramType            - {[String,...]}  Shader land parameter type assumption
/// 	isRootKernel         - {Boolean}       Special indicator, for kernel function
/// 	webglFunctionString  - {String}        webgl converted function string
/// 	openglFunctionString - {String}        opengl converted function string
/// 	calledFunctions      - {[String,...]}  List of all the functions called
/// 	initVariables        - {[String,...]}  List of variables initialized in the function
/// 	readVariables        - {[String,...]}  List of variables read operations occur
/// 	writeVariables       - {[String,...]}  List of variables write operations occur
///
export default class CPUFunctionNode extends BaseFunctionNode {

}
