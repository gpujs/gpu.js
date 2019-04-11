const {
	WebGLFunctionNode
} = require('../web-gl/function-node');

/**
 * @class WebGL2FunctionNode
 * @desc [INTERNAL] Takes in a function node, and does all the AST voodoo required to toString its respective webGL code.
 * @extends WebGLFunctionNode
 * @returns the converted webGL function string
 */
class WebGL2FunctionNode extends WebGLFunctionNode {

	/**
	 * @desc Parses the abstract syntax tree for *identifier* expression
	 * @param {Object} idtNode - An ast Node
	 * @param {Array} retArr - return array string
	 * @returns {Array} the append retArr
	 */
	astIdentifierExpression(idtNode, retArr) {
		if (idtNode.type !== 'Identifier') {
			throw this.astErrorOutput(
				'IdentifierExpression - not an Identifier',
				idtNode
			);
		}

		switch (idtNode.name) {
			case 'Infinity':
				retArr.push('intBitsToFloat(2139095039)');
				break;
			default:
				const userArgumentName = this.getKernelArgumentName(idtNode.name);
				if (userArgumentName) {
					retArr.push(`user_${userArgumentName}`);
				} else {
					retArr.push(`user_${idtNode.name}`);
				}
		}

		return retArr;
	}
}

module.exports = {
	WebGL2FunctionNode
};
