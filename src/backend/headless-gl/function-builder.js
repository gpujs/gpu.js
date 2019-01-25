'use strict';

const FunctionBuilder = require('../function-builder');
const HeadlessGLFunctionNode = require('./function-node');

/**
 * @desc Builds webGl functions (shaders) from JavaScript function Strings
 */
class HeadlessGLFunctionBuilder extends FunctionBuilder {
	static get FunctionNode() {
		return HeadlessGLFunctionNode;
	}
}

module.exports = HeadlessGLFunctionBuilder;