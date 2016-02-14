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
	/// Note that the 0-index, is the starting function trace.
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
	
	///
	/// Function: webglString_fromFunctionNames
	///
	/// Parameters: 
	/// 	functionList  - {[String,...]} List of function to build the webgl string.
	///
	/// Returns:
	/// 	{String} The full webgl string, of all the various functions. Trace optimized if functionName given
	///
	function webglString_fromFunctionNames(functionList) {
		var ret = [];
		for(var i=0; i<functionList.length; ++i) {
			var node = this.nodeMap[functionList[i]];
			if(node) {
				ret.push( this.nodeMap[functionList[i]].getWebglFunctionString() );
			}
		}
		return ret.join("\n");
	}
	functionBuilder.prototype.webglString_fromFunctionNames = webglString_fromFunctionNames;
	
	///
	/// Function: webglString
	///
	/// Parameters: 
	/// 	functionName  - {String} Function name to trace from. If null, it returns the WHOLE builder stack
	///
	/// Returns:
	/// 	{String} The full webgl string, of all the various functions. Trace optimized if functionName given
	///
	function webglString(functionName) {
		if(functionName) {
			return this.webglString_fromFunctionNames( this.traceFunctionCalls(functionName, []).reverse() );
		} 
		return this.webglString_fromFunctionNames(Object.keys(this.nodeMap));
	}
	functionBuilder.prototype.webglString = webglString;
	
	//---------------------------------------------------------
	//
	//  Polyfill stuff
	//
	//---------------------------------------------------------
	
	// Round function used in polyfill
	function round(a) { return Math.floor( a + 0.5 ); }
	
	///
	/// Function: polyfillStandardFunctions
	///
	/// Polyfill in the missing Math funcitons (round)
	///
	function polyfillStandardFunctions() {
		this.addFunction(null, round);
	}
	functionBuilder.prototype.polyfillStandardFunctions = polyfillStandardFunctions;
	
	return functionBuilder;
})();
