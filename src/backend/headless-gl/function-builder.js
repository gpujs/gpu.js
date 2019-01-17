'use strict';

const FunctionBuilder = require('../function-builder');
const HeadlessGLFunctionNode = require('./function-node');

/**
 * @desc Builds webGl functions (shaders) from JavaScript function Strings
 */
class HeadlessGLFunctionBuilder extends FunctionBuilder {
	constructor() {
		super();
		this.Node = HeadlessGLFunctionNode;
	}
}

module.exports = HeadlessGLFunctionBuilder;