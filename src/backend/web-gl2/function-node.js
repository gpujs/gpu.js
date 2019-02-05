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

		// do we need to cast addressing vales to float?
		const castFloat = !this.isState('in-get-call-parameters');

		switch (idtNode.name) {
			case 'gpu_threadX':
				if (castFloat) {
					retArr.push('float(threadId.x)');
				} else {
					retArr.push('threadId.x');
				}
				break;
			case 'gpu_threadY':
				if (castFloat) {
					retArr.push('float(threadId.y)');
				} else {
					retArr.push('threadId.y');
				}
				break;
			case 'gpu_threadZ':
				if (castFloat) {
					retArr.push('float(threadId.z)');
				} else {
					retArr.push('threadId.z');
				}
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
				const userArgumentName = this.getUserArgumentName(idtNode.name);
				if (userArgumentName !== null) {
					this.pushParameter(retArr, userArgumentName);
				} else {
					this.pushParameter(retArr, idtNode.name);
				}
		}

		return retArr;
	}
}

module.exports = {
	WebGL2FunctionNode
};