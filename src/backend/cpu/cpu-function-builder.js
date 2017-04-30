const BaseFunctionBuilder = require('../base-function-builder');
const CPUFunctionNode = require('./cpu-function-node');

module.exports = class CPUFunctionBuilder extends BaseFunctionBuilder {
  addFunction(functionName, jsFunction, paramTypeArray, returnType) {
    this.addFunctionNode(new CPUFunctionNode(functionName, jsFunction, paramTypeArray, returnType));
  }
};