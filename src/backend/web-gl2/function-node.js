'use strict';

const WebGLFunctionNode = require('../web-gl/function-node');

// Closure capture for the ast function, prevent collision with existing AST functions
// The prefixes to use
const constantsPrefix = 'this.constants.';

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
			return WebGL2FunctionNode.astFunctionPrototype(this.getJsAST(), [], this).join('').trim();
		} else {
			this.functionStringArray = this.astGeneric(this.getJsAST(), [], this);
		}
		this.functionString = webGlRegexOptimize(
			this.functionStringArray.join('').trim()
		);
		return this.functionString;
	}


	/**
	 * @memberOf WebGL2FunctionNode#
	 * @function
	 * @name astFunctionExpression
	 *
	 * @desc Parses the abstract syntax tree for to its *named function*
	 *
	 * @param {Object} ast - the AST object to parse
	 * @param {Array} retArr - return array string
	 * @param {Function} funcParam - FunctionNode, that tracks compilation state
	 *
	 * @returns {Array} the append retArr
	 */
	astFunctionExpression(ast, retArr, funcParam) {

		// Setup function return type and name
		if (funcParam.isRootKernel) {
			retArr.push('void');
			funcParam.kernalAst = ast;
		} else {
			retArr.push(funcParam.returnType);
		}
		retArr.push(' ');
		retArr.push(funcParam.functionName);
		retArr.push('(');

		if (!funcParam.isRootKernel) {
			// Arguments handling
			for (let i = 0; i < funcParam.paramNames.length; ++i) {
				const paramName = funcParam.paramNames[i];

				if (i > 0) {
					retArr.push(', ');
				}
				const type = funcParam.getParamType(paramName);
				switch (type) {
					case 'Texture':
					case 'Input':
					case 'Array':
					case 'HTMLImage':
						retArr.push('sampler2D');
						break;
					default:
						retArr.push('float');
				}

				retArr.push(' ');
				retArr.push('user_');
				retArr.push(paramName);
			}
		}

		// Function opening
		retArr.push(') {\n');

		// Body statement iteration
		for (let i = 0; i < ast.body.body.length; ++i) {
			this.astGeneric(ast.body.body[i], retArr, funcParam);
			retArr.push('\n');
		}

		// Function closing
		retArr.push('}\n');
		return retArr;
	}

	/**
	 * @memberOf WebGL2FunctionNode#
	 * @function
	 * @name astVariableDeclaration
	 *
	 * @desc Parses the abstract syntax tree for *Variable Declaration*
	 *
	 * @param {Object} vardecNode - An ast Node
	 * @param {Array} retArr - return array string
	 * @param {Function} funcParam - FunctionNode, that tracks compilation state
	 *
	 * @returns {Array} the append retArr
	 */
	astVariableDeclaration(vardecNode, retArr, funcParam) {
		for (let i = 0; i < vardecNode.declarations.length; i++) {
			const declaration = vardecNode.declarations[i];
			if (i > 0) {
				retArr.push(',');
			}
			const retDeclaration = [];
			this.astGeneric(declaration, retDeclaration, funcParam);
			if (i === 0) {
				if (
					retDeclaration[0] === 'get(' &&
					funcParam.getParamType(retDeclaration[1]) === 'HTMLImage' &&
					retDeclaration.length === 18
				) {
					retArr.push('sampler2D ');
				} else {
					retArr.push('float ');
				}
			}
			retArr.push.apply(retArr, retDeclaration);
		}
		retArr.push(';');
		return retArr;
	}

	/**
	 * @memberOf WebGL2FunctionNode#
	 * @function
	 * @name astMemberExpression
	 *
	 * @desc Parses the abstract syntax tree for *Member* Expression
	 *
	 * @param {Object} mNode - An ast Node
	 * @param {Array} retArr - return array string
	 * @param {Function} funcParam - FunctionNode, that tracks compilation state
	 *
	 * @returns {Array} the append retArr
	 */
	astMemberExpression(mNode, retArr, funcParam) {
		if (mNode.computed) {
			if (mNode.object.type === 'Identifier') {
				// Working logger
				const reqName = mNode.object.name;
				const funcName = funcParam.functionName || 'kernel';
				let assumeNotTexture = false;

				// Possibly an array request - handle it as such
				if (funcParam.paramNames) {
					const idx = funcParam.paramNames.indexOf(reqName);
					if (idx >= 0 && funcParam.paramTypes[idx] === 'float') {
						assumeNotTexture = true;
					}
				}

				if (assumeNotTexture) {
					// Get from array
					this.astGeneric(mNode.object, retArr, funcParam);
					retArr.push('[int(');
					this.astGeneric(mNode.property, retArr, funcParam);
					retArr.push(')]');
				} else {
					// Get from texture
					// This normally refers to the global read only input vars
					retArr.push('get(');
					this.astGeneric(mNode.object, retArr, funcParam);
					retArr.push(', vec2(');
					this.astGeneric(mNode.object, retArr, funcParam);
					retArr.push('Size[0],');
					this.astGeneric(mNode.object, retArr, funcParam);
					retArr.push('Size[1]), vec3(');
					this.astGeneric(mNode.object, retArr, funcParam);
					retArr.push('Dim[0],');
					this.astGeneric(mNode.object, retArr, funcParam);
					retArr.push('Dim[1],');
					this.astGeneric(mNode.object, retArr, funcParam);
					retArr.push('Dim[2]');
					retArr.push('), ');
					this.astGeneric(mNode.property, retArr, funcParam);
					retArr.push(')');
				}
			} else {
				this.astGeneric(mNode.object, retArr, funcParam);
				const last = retArr.pop();
				retArr.push(',');
				this.astGeneric(mNode.property, retArr, funcParam);
				retArr.push(last);
			}
		} else {

			// Unroll the member expression
			let unrolled = this.astMemberExpressionUnroll(mNode);
			let unrolled_lc = unrolled.toLowerCase();

			// Its a constant, remove this.constants.
			if (unrolled.indexOf(constantsPrefix) === 0) {
				unrolled = 'constants_' + unrolled.slice(constantsPrefix.length);
			}

			switch (unrolled_lc) {
				case 'this.thread.x':
					retArr.push('threadId.x');
					break;
				case 'this.thread.y':
					retArr.push('threadId.y');
					break;
				case 'this.thread.z':
					retArr.push('threadId.z');
					break;
				case 'this.output.x':
					retArr.push(this.output[0] + '.0');
					break;
				case 'this.output.y':
					retArr.push(this.output[1] + '.0');
					break;
				case 'this.output.z':
					retArr.push(this.output[2] + '.0');
					break;
				default:
					retArr.push(unrolled);
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