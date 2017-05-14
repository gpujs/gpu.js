const utils = require('../utils');
const parser = require('../parser').parser;

///
/// Class: CPUFunctionNode
///
/// [INTERNAL] Represents a single function, inside JS, webGL, or openGL.
///
/// This handles all the raw state, converted state, etc. Of a single function.
///
/// Properties:
/// 	functionName         - {String}        Name of the function
/// 	jsFunction           - {JS Function}   The JS Function the node represents
/// 	jsFunctionString     - {String}        jsFunction.toString()
/// 	paramNames           - {[String,...]}  Parameter names of the function
/// 	paramType            - {[String,...]}  Shader land parameter type assumption
/// 	isRootKernel         - {Boolean}       Special indicator, for kernel function
/// 	webglFunctionString  - {String}        webgl converted function string
/// 	openglFunctionString - {String}        opengl converted function string
/// 	calledFunctions      - {[String,...]}  List of all the functions called
/// 	initVariables        - {[String,...]}  List of variables initialized in the function
/// 	readVariables        - {[String,...]}  List of variables read operations occur
/// 	writeVariables       - {[String,...]}  List of variables write operations occur
///
module.exports = class BaseFunctionNode {

	//
	// Constructor
	//----------------------------------------------------------------------------------------------------

	///
	/// Function: functionNode
	///
	/// [Constructor] Builds the function with the given JS function, and argument type array.
	///
	/// Parameters:
	/// 	gpu             - {GPU}                   The GPU instance
	/// 	functionName    - {String}                Function name to assume, if its null, it attempts to extract from the function
	/// 	jsFunction      - {JS Function / String}  JS Function to do conversion
	/// 	paramTypeArray  - {[String,...]}          Parameter type array, assumes all parameters are 'float' if null
	/// 	returnType      - {String}                The return type, assumes 'float' if null
	///
	constructor(functionName, jsFunction, paramTypeArray, returnType) {
		//
		// Internal vars setup
		//
		this.calledFunctions = [];
		this.initVariables = [];
		this.readVariables = [];
		this.writeVariables = [];
		this.addFunction = null;

		//
		// Missing jsFunction object exception
		//
		if (!jsFunction) {
			throw 'jsFunction, parameter is missing';
		}

		//
		// Setup jsFunction and its string property + validate them
		//
		this.jsFunctionString = jsFunction.toString();
		if (!utils.isFunctionString(this.jsFunctionString)) {
			console.error('jsFunction, to string conversion check failed: not a function?', this.jsFunctionString);
			throw 'jsFunction, to string conversion check failed: not a function?';
		}

		if (!utils.isFunction(jsFunction)) {
			//throw 'jsFunction, is not a valid JS Function';
			this.jsFunction = null;
		} else {
			this.jsFunction = jsFunction;
		}

		//
		// Setup the function name property
		//
		this.functionName = functionName ||
			(jsFunction && jsFunction.name) ||
			utils.getFunctionNameFromString(this.jsFunctionString);

		if (!(this.functionName)) {
			throw 'jsFunction, missing name argument or value';
		}

		//
		// Extract parameter name, and its argument types
		//
		this.paramNames = utils.getParamNamesFromString(this.jsFunctionString);
		if (paramTypeArray) {
			if (paramTypeArray.length !== this.paramNames.length) {
				throw 'Invalid argument type array length, against function length -> (' +
					paramTypeArray.length + ',' +
					this.paramNames.length +
					')';
			}
			this.paramType = paramTypeArray;
		} else {
			this.paramType = [];
			for (let a = 0; a < this.paramNames.length; ++a) {
				this.paramType.push('float');
			}
		}

		//
		// Return type handling
		//
		this.returnType = returnType || 'float';
	}

	setAddFunction(fn) {
		this.addFunction = fn;
		return this;
	}

	//
	// Core function
	//----------------------------------------------------------------------------------------------------

	///
	/// Function: getJSFunction
	///
	/// Gets and return the stored JS Function.
	/// Note: that this internally eval the function, if only the string was provided on construction
	///
	/// Returns:
	/// 	{JS Function} The function object
	///
	getJsFunction() {
		if (this.jsFunction) {
			return this.jsFunction;
		}

		if (this.jsFunctionString) {
			this.jsFunction = eval(this.jsFunctionString);
			return this.jsFunction;
		}

		throw 'Missing jsFunction, and jsFunctionString parameter';
	}

	///
	/// Function: getJS_AST
	///
	/// Parses the class function JS, and returns its Abstract Syntax Tree object.
	///
	/// This is used internally to convert to shader code
	///
	/// Parameters:
	/// 	inParser - {JISON Parser}  Parser to use, assumes in scope 'parser' if null
	///
	/// Returns:
	/// 	{AST Object} The function AST Object, note that result is cached under this.jsFunctionAST;
	///
	getJsAST(inParser) {
		if (this.jsFunctionAST) {
			return this.jsFunctionAST;
		}

		inParser = inParser || parser;
		if (inParser === null) {
			throw 'Missing JS to AST parser';
		}

		const prasedObj = parser.parse('var ' + this.functionName + ' = ' + this.jsFunctionString + ';');
		if (prasedObj === null) {
			throw 'Failed to parse JS code via JISON';
		}

		// take out the function object, outside the var declarations
		const funcAST = prasedObj.body[0].declarations[0].init;
		this.jsFunctionAST = funcAST;

		return funcAST;
	}


	///
	/// Function: getFunctionString
	///
	/// Returns the converted webgl shader function equivalent of the JS function
	///
	/// Returns:
	/// 	{String} webgl function string, result is cached under this.webGlFunctionString
	///
	getFunctionString() {
		this.generate();
		return this.functionString;
	}

	///
	/// Function: setFunctionString
	///
	/// Set the functionString value, overwriting it
	///
	/// Parameters:
	/// 	functionString - {String}  Shader code string, representing the function
	///
	setFunctionString(functionString) {
		this.functionString = functionString;
	}

	generate(options) {
		throw new Error('generate not defined on BaseFunctionNode');
	}
};