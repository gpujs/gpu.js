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
module.exports = class WebGLFunctionBuilder extends FunctionBuilderBase {
	constructor() {
		super();
		this.Node = WebGLFunctionNode;
	}

	//---------------------------------------------------------
	//
	//  Polyfill stuff
	//
	//---------------------------------------------------------

	// Round function used in polyfill
	static round(a) {
		return round(a);
	}

	/**
	 * @memberOf FunctionBuilderBase#
	 * @function
	 * @name polyfillStandardFunctions
	 *
	 * @desc Polyfill in the missing Math functions (round)
	 *
	 */
	polyfillStandardFunctions() {
		this.addFunction('round', round);
	}
};

function round(a) {
	return Math.floor(a + 0.5);
}