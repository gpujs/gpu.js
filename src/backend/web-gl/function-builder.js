'use strict';

const FunctionBuilder = require('../function-builder');
const WebGLFunctionNode = require('./function-node');

/**
 * @desc Builds webGl functions (shaders) from JavaScript function Strings
 */
class WebGLFunctionBuilder extends FunctionBuilder {
	constructor() {
		super();
		this.Node = WebGLFunctionNode;
	}
}

module.exports = WebGLFunctionBuilder;