'use strict';

const FunctionBuilderBase = require('../function-builder-base');
const WebGLFunctionNode = require('./function-node');

/**
 * @class WebGLFunctionBuilder
 *
 * @extends FunctionBuilderBase
 *
 * @desc Builds webGl functions (shaders) from JavaScript function Strings
 *
 */
module.exports = class WebGL2FunctionBuilder extends FunctionBuilderBase {
	constructor() {
		super();
		this.Node = WebGLFunctionNode;
	}
};