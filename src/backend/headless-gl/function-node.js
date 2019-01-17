'use strict';

const WebGLFunctionNode = require('../web-gl/function-node');

/**
 * @class HeadlessGLFunctionNode
 *
 * @desc [INTERNAL] Takes in a function node, and does all the AST voodoo required to generate its respective webGL code.
 *
 * @extends WebGLFunctionNode
 *
 * @returns the converted webGL function string
 *
 */
class HeadlessGLFunctionNode extends WebGLFunctionNode {}


module.exports = HeadlessGLFunctionNode;