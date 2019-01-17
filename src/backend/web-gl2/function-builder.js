'use strict';

const FunctionBuilder = require('../function-builder');
const WebGL2FunctionNode = require('./function-node');

/**
 * @desc Builds webGl functions (shaders) from JavaScript function Strings
 */
class WebGL2FunctionBuilder extends FunctionBuilder {
	constructor() {
		super();
		this.Node = WebGL2FunctionNode;
	}
}

module.exports = WebGL2FunctionBuilder;