const FunctionBuilderBase = require('../function-builder-base');
const CPUFunctionNode = require('./function-node');

module.exports = class CPUFunctionBuilder extends FunctionBuilderBase {
	addFunction(functionName, jsFunction, paramTypes, returnType) {
		this.addFunctionNode(
			new CPUFunctionNode(functionName, jsFunction, paramTypes, returnType)
			.setAddFunction(this.addFunction.bind(this))
		);
	}

	getPrototypeString() {
		let ret = '';
		for (let p in this.nodeMap) {
			if (!this.nodeMap.hasOwnProperty(p)) continue;
			ret += this.nodeMap[p].jsFunctionString + ';';
		}
		return ret;
	}
};