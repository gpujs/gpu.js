const FunctionBuilderBase = require('../function-builder-base');
const CPUFunctionNode = require('./function-node');

///
/// Class: CPUFunctionBuilder
///
/// Extends: FunctionBuilderBase
///
/// Builds functions to execute on CPU from JavaScript function Strings
///

module.exports = class CPUFunctionBuilder extends FunctionBuilderBase {
	addFunction(functionName, jsFunction, paramTypes, returnType) {
		this.addFunctionNode(
			new CPUFunctionNode(functionName, jsFunction, paramTypes, returnType)
			.setAddFunction(this.addFunction.bind(this))
		);
	}

	///
	/// Function: getPrototypeString
	///
	/// Return the JS Function String optimized for cpu.
	///
	/// Parameters:
	/// 	functionName  - {String} Function name to trace from. If null, it returns the WHOLE builder stack
	///
	/// Returns:
	/// 	{String} Function String
	///
	getPrototypeString() {
		let ret = '';
		for (let p in this.nodeMap) {
			if (!this.nodeMap.hasOwnProperty(p)) continue;
			const node = this.nodeMap[p];
			if (node.isSubKernel) {
				ret += `var ${ node.functionName } = ` + node.jsFunctionString.replace('return', `return ${ node.functionName }Result[this.thread.z][this.thread.y][this.thread.x] =`) + '.bind(this);\n';
			} else {
				ret += `var ${ node.functionName } = ${ node.jsFunctionString };\n`;
			}
		}
		return ret;
	}

	///
	/// Function: addSubKernel
	///
	/// Add a new sub-kernel to the current kernel instance
	///
	/// Parameters:
	///		jsFunction 	- {Function} Sub-kernel function (JavaScript)
	///		paramNames  - {Array} Parameters of the sub-kernel
	///		returnType  - {Array} Return type of the subKernel
	///
	addSubKernel(jsFunction, paramTypes, returnType) {
		const node = new CPUFunctionNode(null, jsFunction, paramTypes, returnType)
			.setAddFunction(this.addFunction.bind(this));
		node.isSubKernel = true;
		this.addFunctionNode(node);
	}
};