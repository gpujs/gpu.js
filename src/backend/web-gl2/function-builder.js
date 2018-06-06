'use strict';

const FunctionBuilderBase = require('../function-builder-base');
const WebGL2FunctionNode = require('./function-node');

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
		this.Node = WebGL2FunctionNode;
	}
};