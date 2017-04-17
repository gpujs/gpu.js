const FunctionNode = require('function-node');
///
/// Class: functionBuilder
///
/// [INTERNAL] A collection of functionNodes.
///
/// This handles all the raw state, converted state, etc. Of a single function.
///
/// Properties:
/// 	nodeMap - {Object} Object map, where nodeMap[function] = new FunctionNode;
///
export default class FunctionBuilder {
	
	///
	/// Function: functionBuilder
	///
	/// [Constructor] Blank constructor, which initializes the properties
	///
	constructor(gpu) {
		this.nodeMap = {};
		this.gpu = gpu;
	}
	
	///
	/// Function: addFunction
	///
	/// Instantiates a FunctionNode, and add it to the nodeMap
	///
	/// Parameters:
	/// 	gpu             - {GPU}          The GPU instance
	/// 	functionName    - {String}       Function name to assume, if its null, it attempts to extract from the function
	/// 	jsFunction      - {JS Function}  JS Function to do conversion
	/// 	paramTypeArray  - {[String,...]} Parameter type array, assumes all parameters are "float" if null
	/// 	returnType      - {String}       The return type, assumes "float" if null
	///
	addFunction(functionName, jsFunction, paramTypeArray, returnType) {
		this.addFunctionNode(new FunctionNode(this.gpu, functionName, jsFunction, paramTypeArray, returnType));
	}
	
	///
	/// Function: addFunctionNode
	///
	/// Add the funciton node directly
	///
	/// Parameters:
	/// 	inNode    - {functionNode}       functionNode to add
	///
	addFunctionNode(inNode) {
		this.nodeMap[ inNode.functionName ] = inNode;
	}

	///
	/// Function: traceFunctionCalls
	///
	/// Trace all the depending functions being called, from a single function
	///
	/// This allow for "uneeded" functions to be automatically optimized out.
	/// Note that the 0-index, is the starting function trace.
	///
	/// Parameters:
	/// 	functionName  - {String}        Function name to trace from, default to "kernel"
	/// 	retList       - {[String,...]}  Returning list of function names that is traced. Including itself.
	///
	/// Returns:
	/// 	{[String,...]}  Returning list of function names that is traced. Including itself.
  traceFunctionCalls(functionName, retList, opt) {
		functionName = functionName || 'kernel';
		retList = retList || [];
		
		const fNode = this.nodeMap[functionName];
		if(fNode) {
			// Check if function already exists
			if(retList.indexOf(functionName) >= 0) {
				// Does nothing if already traced
			} else {
				retList.push(functionName);
				
				fNode.getWebGlFunctionString(opt); //ensure JS trace is done
				for(let i = 0; i < fNode.calledFunctions.length; ++i) {
					this.traceFunctionCalls(fNode.calledFunctions[i], retList, opt);
				}
			}
		}
		
		return retList;
	}
	
	///
	/// Function: webGlStringFromFunctionNames
	///
	/// Parameters:
	/// 	functionList  - {[String,...]} List of function to build the webgl string.
	///
	/// Returns:
	/// 	{String} The full webgl string, of all the various functions. Trace optimized if functionName given
	///
  webGlStringFromFunctionNames(functionList, opt) {
		const ret = [];
		for(let i = 0; i < functionList.length; ++i) {
			const node = this.nodeMap[functionList[i]];
			if(node) {
				ret.push(this.nodeMap[functionList[i]].getWebGlFunctionString(opt));
			}
		}
		return ret.join("\n");
	}
	
  webGlPrototypeStringFromFunctionNames(functionList, opt) {
		const ret = [];
		for(let i = 0; i < functionList.length; ++i) {
			const node = this.nodeMap[functionList[i]];
			if(node) {
				ret.push(this.nodeMap[functionList[i]].getWebGlFunctionPrototypeString(opt));
			}
		}
		return ret.join("\n");
	}
	
	///
	/// Function: webGlString
	///
	/// Parameters:
	/// 	functionName  - {String} Function name to trace from. If null, it returns the WHOLE builder stack
	///
	/// Returns:
	/// 	{String} The full webgl string, of all the various functions. Trace optimized if functionName given
	///
  webGlString(functionName, opt) {
		if (opt == undefined) {
			opt = {};
		}
		
		if(functionName) {
			return this.webGlStringFromFunctionNames(this.traceFunctionCalls(functionName, [], opt).reverse(), opt);
		}
		return this.webGlStringFromFunctionNames(Object.keys(this.nodeMap), opt);
	}
	
	///
	/// Function: webGlPrototypeString
	///
	/// Parameters:
	/// 	functionName  - {String} Function name to trace from. If null, it returns the WHOLE builder stack
	///
	/// Returns:
	/// 	{String} The full webgl string, of all the various functions. Trace optimized if functionName given
	///
  webGlPrototypeString(functionName, opt) {
		if (opt == undefined) {
			opt = {};
		}
		
		if(functionName) {
			return this.webGlPrototypeStringFromFunctionNames(this.traceFunctionCalls(functionName, [], opt).reverse(), opt);
		}
		return this.webGlPrototypeStringFromFunctionNames(Object.keys(this.nodeMap), opt);
	}
	
	//---------------------------------------------------------
	//
	//  Polyfill stuff
	//
	//---------------------------------------------------------
	
	// Round function used in polyfill
  round(a) { return Math.floor(a + 0.5); }
	
	///
	/// Function: polyfillStandardFunctions
	///
	/// Polyfill in the missing Math funcitons (round)
	///
  polyfillStandardFunctions() {
		this.addFunction(null, round);
	}
}
