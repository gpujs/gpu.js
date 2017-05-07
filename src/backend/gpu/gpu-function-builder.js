const BaseFunctionBuilder = require('../base-function-builder');
const GPUFunctionNode = require('./gpu-function-node');

module.exports = class GPUFunctionBuilder extends BaseFunctionBuilder {
  addFunction(functionName, jsFunction, paramTypeArray, returnType) {
    this.addFunctionNode(
      new GPUFunctionNode(functionName, jsFunction, paramTypeArray, returnType)
        .setAddFunction(this.addFunction.bind(this))
    );
  }
};