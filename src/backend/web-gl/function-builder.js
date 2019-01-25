'use strict';

const FunctionBuilder = require('../function-builder');
const WebGLFunctionNode = require('./function-node');

/**
 * @desc Builds webGl functions (shaders) from JavaScript function Strings
 */
class WebGLFunctionBuilder extends FunctionBuilder {
	static get FunctionNode() {
		return WebGLFunctionNode;
	}
}

module.exports = WebGLFunctionBuilder;