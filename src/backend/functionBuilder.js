///
/// Class: functionBuilder
///
/// [INTERNAL] A collection of functionNodes.
///
/// This handles all the raw state, converted state, etc. Of a single function.
///
/// Properties:
/// 	nodeMap - {Object} Object map, where nodeMap[function] = functionNode;
///
var functionBuilder = (function() {
	
	///
	/// Function: functionBuilder
	///
	/// [Constructor] Blank constructor, which initializes the properties
	///
	function functionBuilder() {
		this.nodeMap = {};
	}
	
	///
	/// Function: addFunction
	///
	/// Creates the functionNode, and add it to the nodeMap
	///
	/// Parameters: 
	/// 	functionName    - {String}       Function name to assume, if its null, it attempts to extract from the function
	/// 	jsFunction      - {JS Function}  JS Function to do conversion   
	/// 	paramTypeArray  - {[String,...]} Parameter type array, assumes all parameters are "float" if null
	/// 	returnType      - {String}       The return type, assumes "float" if null
	///
	function addFunction( functionName, jsFunction, paramTypeArray, returnType ) {
		this.addFunctionNode( new functionNode( functionName, jsFunction, paramTypeArray, returnType ) );
	}
	functionBuilder.prototype.addFunction = addFunction;
	
	///
	/// Function: addFunctionNode
	///
	/// Add the funciton node directly
	///
	/// Parameters: 
	/// 	inNode    - {functionNode}       functionNode to add
	///
	function addFunctionNode( inNode ) {
		this.nodeMap[ inNode.functionName ] = inNode;
	}
	functionBuilder.prototype.addFunctionNode = addFunctionNode;
	
	///
	/// Function: traceFunctionCalls
	///
	/// Trace all the depending functions being called, from a single function
	///
	/// This allow for "uneeded" functions to be automatically optimized out.
	///
	/// Parameters: 
	/// 	functionName  - {String}        Function name to trace from, default to "kernel"
	/// 	retList       - {[String,...]}  Returning list of function names that is traced. Including itself.
	///
	/// Returns:
	/// 	{[String,...]}  Returning list of function names that is traced. Including itself.
	function traceFunctionCalls( functionName, retList ) {
		functionName = functionName || "kernel";
		retList = retList || [];
		
		var fNode = this.nodeMap[functionName];
		if( fNode ) {
			// Check if function already exists
			if( retList.indexOf(functionName) >= 0 ) {
				// Does nothing if already traced
			} else {
				retList.push(functionName);
				
				fNode.getWebglFunctionString(); //ensure JS trace is done
				for(var i=0; i<fNode.calledFunctions.length; ++i) {
					this.traceFunctionCalls( fNode.calledFunctions[i], retList );
				}
			}
		}
		
		return retList;
	}
	functionBuilder.prototype.traceFunctionCalls = traceFunctionCalls;
	
	return functionBuilder;
})();
