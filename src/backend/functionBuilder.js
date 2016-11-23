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
	function functionBuilder(gpu) {
		this.nodeMap = {};
		this.gpu = gpu;
	}
	
	///
	/// Function: addFunction
	///
	/// Creates the functionNode, and add it to the nodeMap
	///
	/// Parameters:
	/// 	gpu             - {GPU}          The GPU instance
	/// 	functionName    - {String}       Function name to assume, if its null, it attempts to extract from the function
	/// 	jsFunction      - {JS Function}  JS Function to do conversion
	/// 	paramTypeArray  - {[String,...]} Parameter type array, assumes all parameters are "float" if null
	/// 	returnType      - {String}       The return type, assumes "float" if null
	///
	function addFunction( functionName, jsFunction, paramTypeArray, returnType ) {
		this.addFunctionNode( new functionNode( this.gpu, functionName, jsFunction, paramTypeArray, returnType ) );
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
	function traceFunctionCalls( functionName, retList, opt ) {
		functionName = functionName || "kernel";
		retList = retList || [];
		
		var fNode = this.nodeMap[functionName];
		if( fNode ) {
			// Check if function already exists
			if( retList.indexOf(functionName) >= 0 ) {
				// Does nothing if already traced
			} else {
				retList.push(functionName);
				
				fNode.getWebglFunctionString(opt); //ensure JS trace is done
				for(var i=0; i<fNode.calledFunctions.length; ++i) {
					this.traceFunctionCalls( fNode.calledFunctions[i], retList, opt );
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
	function webglString_fromFunctionNames(functionList, opt) {
		var ret = [];
		for(var i=0; i<functionList.length; ++i) {
			var node = this.nodeMap[functionList[i]];
			if(node) {
				ret.push( this.nodeMap[functionList[i]].getWebglFunctionString(opt) );
			}
		}
		return ret.join("\n");
	}
	functionBuilder.prototype.webglString_fromFunctionNames = webglString_fromFunctionNames;
	
	function webglPrototypeString_fromFunctionNames(functionList, opt) {
		var ret = [];
		for(var i=0; i<functionList.length; ++i) {
			var node = this.nodeMap[functionList[i]];
			if(node) {
				ret.push( this.nodeMap[functionList[i]].getWebglFunctionPrototypeString(opt) );
			}
		}
		return ret.join("\n");
	}
	functionBuilder.prototype.webglPrototypeString_fromFunctionNames = webglPrototypeString_fromFunctionNames;
	
	///
	/// Function: webglString
	///
	/// Parameters:
	/// 	functionName  - {String} Function name to trace from. If null, it returns the WHOLE builder stack
	///
	/// Returns:
	/// 	{String} The full webgl string, of all the various functions. Trace optimized if functionName given
	///
	function webglString(functionName, opt) {
		if (opt == undefined) {
			opt = {};
		}
		
		if(functionName) {
			return this.webglString_fromFunctionNames( this.traceFunctionCalls(functionName, [], opt).reverse(), opt );
		}
		return this.webglString_fromFunctionNames( Object.keys(this.nodeMap), opt );
	}
	functionBuilder.prototype.webglString = webglString;
	
	///
	/// Function: webglPrototypeString
	///
	/// Parameters:
	/// 	functionName  - {String} Function name to trace from. If null, it returns the WHOLE builder stack
	///
	/// Returns:
	/// 	{String} The full webgl string, of all the various functions. Trace optimized if functionName given
	///
	function webglPrototypeString(functionName, opt) {
		if (opt == undefined) {
			opt = {};
		}
		
		if(functionName) {
			return this.webglPrototypeString_fromFunctionNames( this.traceFunctionCalls(functionName, [], opt).reverse(), opt );
		}
		return this.webglPrototypeString_fromFunctionNames( Object.keys(this.nodeMap), opt );
	}
	functionBuilder.prototype.webglPrototypeString = webglPrototypeString;
	
	//---------------------------------------------------------
	//
	//  Polyfill Math stuff
	//
	//---------------------------------------------------------
	
	// Round function used in polyfill
	function round(a) { return Math.floor( a + 0.5 ); }
	
	//---------------------------------------------------------
	//
	//  Polyfill bitwise operations
	//
	//---------------------------------------------------------
	
	// Webgl bitwise hack. int bit iteration - function prefix template
	//
	// @TODO Support negative numbers
	var bitwiseWebglFunction_prefix = ""+
	"	int byteVal = 1; int result = 0; \n"+
	"	for(int i=0; i < 32; i++) { \n"+
	"		bool keepGoing = v1 > 0.0 || v2 > 0.0; \n "+
	"		if(keepGoing) {\n"+
	"			bool b1 = mod(v1,2.0) > 0.0;\n"+
	"			bool b2 = mod(v2,2.0) > 0.0;\n"+
	"			";
	
	// Webgl bitwise hack. int bit iteration - function suffix template
	//
	// @TODO Support negative numbers
	var bitwiseWebglFunction_suffix = ""+
	"			if(addOn) { result += byteVal; }\n"+
	"			v1 = floor(v1 / 2.0);\n"+
	"			v2 = floor(v2 / 2.0);\n"+
	"			byteVal *= 2;\n"+
	"		}\n"+
	"	} \n"+
	"	return float(result);\n"+
	"}\n";
	
	// Bitwise AND operator
	function bitwiseAND(a,b) { return a & b; }
	var bitwiseAND_webgl = "highp float bitwiseAND( float v1, float v2 ) { \n"+
		bitwiseWebglFunction_prefix +
		"bool addOn = b1 && b2;\n"+
		bitwiseWebglFunction_suffix;
		
	// Bitwise OR operator
	function bitwiseOR(a,b) { return a & b; }
	var bitwiseOR_webgl = "highp float bitwiseOR( float v1, float v2 ) { \n"+
		bitwiseWebglFunction_prefix +
		"bool addOn = b1 || b2;\n"+
		bitwiseWebglFunction_suffix;
		
	// Bitwise XOR operator
	function bitwiseXOR(a,b) { return a & b; }
	var bitwiseXOR_webgl = "highp float bitwiseXOR( float v1, float v2 ) { \n"+
		bitwiseWebglFunction_prefix +
		"bool addOn = (b1 || b2) && !(b1 && b2);\n"+
		bitwiseWebglFunction_suffix;
		
	// Bitwise right shift
	function bitwiseRShift(a,b) { return a >> b; }
	var bitwiseRShift_webgl = "highp float bitwiseRShift( float a, float b ) { \n"+
	"	return float(floor(a / pow(2.0,b)));\n"+
	"}";
	
	// Bitwise right shift
	function bitwiseLShift(a,b) { return a << b; }
	var bitwiseLShift_webgl = "highp float bitwiseLShift( float a, float b ) { \n"+
	"	return float(floor(a * pow(2.0,b)));\n"+
	"}";
	
	// Bitwise unsigned right shift
	function bitwiseURShift(a,b) { return a >>> b; }
	var bitwiseURShift_webgl = "highp float bitwiseURShift( float a, float b ) { \n"+
	"	return float(floor(a / pow(2.0,b)));\n"+
	"}";

	///
	/// Function: polyfillStandardFunctions
	///
	/// Polyfill in the missing Math funcitons (round)
	///
	function polyfillStandardFunctions() {
		this.addFunction("round", round);
		this.addFunctionNode( 
			new functionNode( this.gpu, "bitwiseAND", bitwiseAND, ["float","float"], "highp float", bitwiseAND_webgl ) 
		);
		this.addFunctionNode( 
			new functionNode( this.gpu, "bitwiseOR", bitwiseOR, ["float","float"], "highp float", bitwiseOR_webgl ) 
		);
		this.addFunctionNode( 
			new functionNode( this.gpu, "bitwiseXOR", bitwiseXOR, ["float","float"], "highp float", bitwiseXOR_webgl ) 
		);
		this.addFunctionNode( 
			new functionNode( this.gpu, "bitwiseRShift", bitwiseRShift, ["float","float"], "highp float", bitwiseRShift_webgl ) 
		);
		this.addFunctionNode( 
			new functionNode( this.gpu, "bitwiseLShift", bitwiseLShift, ["float","float"], "highp float", bitwiseLShift_webgl ) 
		);
		this.addFunctionNode( 
			new functionNode( this.gpu, "bitwiseURShift", bitwiseURShift, ["float","float"], "highp float", bitwiseURShift_webgl ) 
		);
	}
	functionBuilder.prototype.polyfillStandardFunctions = polyfillStandardFunctions;
	
	return functionBuilder;
})();
