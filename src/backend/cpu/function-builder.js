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
			const node = this.nodeMap[p];
			if (node.isSubKernel) {
			  ret += `var ${ node.functionName } = ` + node.jsFunctionString.replace('return', `return ${ node.functionName }Result[this.thread.z][this.thread.y][this.thread.x] =`) + '.bind(this);\n';
      } else {
        ret += node.jsFunctionString + ';\n';
      }
		}
		return ret;
	}

  addSubKernel(jsFunction, paramTypes, returnType) {
    const node = new CPUFunctionNode(null, jsFunction, paramTypes, returnType)
      .setAddFunction(this.addFunction.bind(this));
    node.isSubKernel = true;
    this.addFunctionNode(node);
  }
};