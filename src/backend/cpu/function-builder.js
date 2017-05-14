const FunctionBuilderBase = require('../function-builder-base');
const CPUFunctionNode = require('./function-node');

module.exports = class CPUFunctionBuilder extends FunctionBuilderBase {
	addFunction(functionName, jsFunction, paramTypeArray, returnType) {
		this.addFunctionNode(
			new CPUFunctionNode(functionName, jsFunction, paramTypeArray, returnType)
			.setAddFunction(this.addFunction.bind(this))
		);
	}
};