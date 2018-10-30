'use strict';

const WebGLFunctionNode = require('../web-gl/function-node');
const DECODE32_ENCODE32 = /decode32\(\s+encode32\(/g;
const ENCODE32_DECODE32 = /encode32\(\s+decode32\(/g;

/** 
 * @class WebGL2FunctionNode
 *
 * @desc [INTERNAL] Takes in a function node, and does all the AST voodoo required to generate its respective webGL code.
 *
 * @extends WebGLFunctionNode
 *
 * @returns the converted webGL function string
 *
 */
module.exports = class WebGL2FunctionNode extends WebGLFunctionNode {
	generate() {
		if (this.debug) {
			console.log(this);
		}
		if (this.prototypeOnly) {
			return this.astFunctionPrototype(this.getJsAST(), []).join('').trim();
		} else {
			this.functionStringArray = this.astGeneric(this.getJsAST(), []);
		}
		this.functionString = webGlRegexOptimize(
			this.functionStringArray.join('').trim()
		);
		return this.functionString;
	}

	/**
	 * @memberOf WebGL2FunctionNode#
	 * @function
	 * @name astIdentifierExpression
	 *
	 * @desc Parses the abstract syntax tree for *identifier* expression
	 *
	 * @param {Object} idtNode - An ast Node
	 * @param {Array} retArr - return array string
	 *
	 * @returns {Array} the append retArr
	 */
	astIdentifierExpression(idtNode, retArr) {
		if (idtNode.type !== 'Identifier') {
			throw this.astErrorOutput(
				'IdentifierExpression - not an Identifier',
				idtNode
			);
		}

		// do we need to cast addressing vales to float?
		const castFloat = !this.isState('in-get-call-parameters');

		switch (idtNode.name) {
			case 'gpu_threadX':
				castFloat && retArr.push('float(');
				retArr.push('threadId.x');
				castFloat && retArr.push(')');
				break;
			case 'gpu_threadY':
				castFloat && retArr.push('float(');
				retArr.push('threadId.y');
				castFloat && retArr.push(')');
				break;
			case 'gpu_threadZ':
				castFloat && retArr.push('float(');
				retArr.push('threadId.z');
				castFloat && retArr.push(')');
				break;
			case 'gpu_outputX':
				retArr.push('uOutputDim.x');
				break;
			case 'gpu_outputY':
				retArr.push('uOutputDim.y');
				break;
			case 'gpu_outputZ':
				retArr.push('uOutputDim.z');
				break;
			case 'Infinity':
				retArr.push('intBitsToFloat(2139095039)');
				break;
			default:
				const userParamName = this.getUserParamName(idtNode.name);
				if (userParamName !== null) {
					this.pushParameter(retArr, 'user_' + userParamName);
				} else {
					this.pushParameter(retArr, 'user_' + idtNode.name);
				}
		}

		return retArr;
	}
};

/**
 * @ignore
 * @function
 * @name webgl_regex_optimize
 *
 * @desc [INTERNAL] Takes the near final webgl function string, and do regex search and replacments.
 * For voodoo optimize out the following: 
 *
 * - decode32(encode32( <br>
 * - encode32(decode32( <br>
 *
 * @param {String} inStr - The webGl function String
 *
 */
function webGlRegexOptimize(inStr) {
	return inStr
		.replace(DECODE32_ENCODE32, '((')
		.replace(ENCODE32_DECODE32, '((');
}