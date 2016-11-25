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
	
	function bititerationFunctionTemplate(name, addOnOperator) {
		return ""+
			"highp int "+name+"( highp int v1, highp int v2 ) { \n"+
			"	int byteVal = 1; int result = 0; \n"+
			"	for(int i=0; i < 32; i++) { \n"+
			"		bool keepGoing = v1 > 0 || v2 > 0; \n "+
			"		if(keepGoing) {\n"+
			"			bool b1 = integerMod(v1,2) > 0;\n"+
			"			bool b2 = integerMod(v2,2) > 0;\n"+
			"			bool addOn = "+addOnOperator+"; \n"+
			"			if(addOn) { result += byteVal; }\n"+
			"			v1 = (v1 / 2);\n"+
			"			v2 = (v2 / 2);\n"+
			"			byteVal *= 2;\n"+
			"		}\n"+
			"	} \n"+
			"	return result;\n"+
			"}\n"+
			"\n"+
			"highp float "+name+"( highp float v1, highp float v2 ) { \n"+
			"	return float( "+name+"( int(v1), int(v2) ) );\n"+
			"}\n";
	}
	
	function bititerationFunctionHeaderTemplate(name) {
		return ""+
			"highp int "+name+"( highp int v1, highp int v2 ); \n"+
			"highp float "+name+"( highp float v1, highp float v2 ); \n";
	}
	
	// Bitwise AND operator
	function bitwiseAND(v1,v2) { return v1 & v2; }
	var bitwiseAND_webgl = bititerationFunctionTemplate("bitwiseAND", "b1 && b2");
	var bitwiseAND_webglHeader = bititerationFunctionHeaderTemplate("bitwiseAND");
	
	// Bitwise OR operator
	function bitwiseOR(v1,v2) { return v1 | v2; }
	var bitwiseOR_webgl = bititerationFunctionTemplate("bitwiseOR", "b1 || b2");
	var bitwiseOR_webglHeader = bititerationFunctionHeaderTemplate("bitwiseOR");
	
	// Bitwise XOR operator
	function bitwiseXOR(v1,v2) { return v1 ^ v2; }
	var bitwiseXOR_webgl = bititerationFunctionTemplate("bitwiseXOR", "(b1 || b2) && !(b1 && b2)");
	var bitwiseXOR_webglHeader = bititerationFunctionHeaderTemplate("bitwiseXOR");
	
	// Bitwise right shift
	function bitwiseRShift(v1,v2) { return v1 >> v2; }
	var bitwiseRShift_webgl = ""+
	"highp int bitwiseRShift( int v1, int v2 ) { \n"+
	"	return v1 / int(pow(2.0, float(v2)));\n"+
	"}\n"+
	"highp float bitwiseRShift( float v1, float v2 ) { \n"+
	"	return float(bitwiseRShift(int(v1), int(v2)));\n"+
	"}";
	var bitwiseRShift_webglHeader = bititerationFunctionHeaderTemplate("bitwiseRShift");
	
	// Bitwise right shift
	function bitwiseLShift(v1,v2) { return v1 << v2; }
	var bitwiseLShift_webgl = ""+
	"highp int bitwiseLShift( highp int v1, highp int v2 ) { \n"+
	"	return v1 * int(pow(2.0, float(v2)));\n"+
	"}\n"+
	"\n"+
	"highp float bitwiseLShift( highp float v1, highp float v2 ) { \n"+
	"	return float(bitwiseLShift(int(v1), int(v2)));\n"+
	"}";
	var bitwiseLShift_webglHeader = bititerationFunctionHeaderTemplate("bitwiseLShift");
	
	// Bitwise unsigned right shift
	function bitwiseURShift(v1,v2) { return v1 >>> v2; }
	var bitwiseURShift_webgl = ""+
	"highp int bitwiseURShift( highp int v1, highp int v2 ) { \n"+
	"	return v1 / int(pow(2.0, float(v2)));\n"+
	"}\n"+
	"\n"+
	"highp float bitwiseURShift( highp float v1, highp float v2 ) { \n"+
	"	return float(bitwiseURShift(int(v1), int(v2)));\n"+
	"}";
	var bitwiseURShift_webglHeader = bititerationFunctionHeaderTemplate("bitwiseURShift");
	
	// Bitwise NOT
	function bitwiseNOT(v1) { return ~v1; }
	var bitwiseNOT_webgl = ""+
	"highp int bitwiseNOT( highp int v1 ) { \n"+
	"	return -v1 - 1;\n"+
	"} \n"+
	"\n"+
	"highp float bitwiseNOT( highp float v1 ) { \n"+
	"	return float(bitwiseNOT(int(v1)));\n"+
	"}";
	var bitwiseNOT_webglHeader = ""+
	"highp int bitwiseNOT( highp int v1 ); \n"+
	"highp float bitwiseNOT( highp float v1 );\n";

	///
	/// Function: polyfillStandardFunctions
	///
	/// Polyfill in the missing Math funcitons (round)
	///
	function polyfillStandardFunctions() {
		this.addFunction("round", round);
		this.addFunctionNode( 
			new functionNode( this.gpu, "bitwiseAND", bitwiseAND, ["float","float"], "highp float", bitwiseAND_webgl, bitwiseAND_webglHeader ) 
		);
		this.addFunctionNode( 
			new functionNode( this.gpu, "bitwiseOR", bitwiseOR, ["float","float"], "highp float", bitwiseOR_webgl, bitwiseOR_webglHeader ) 
		);
		this.addFunctionNode( 
			new functionNode( this.gpu, "bitwiseXOR", bitwiseXOR, ["float","float"], "highp float", bitwiseXOR_webgl, bitwiseXOR_webglHeader ) 
		);
		this.addFunctionNode( 
			new functionNode( this.gpu, "bitwiseRShift", bitwiseRShift, ["float","float"], "highp float", bitwiseRShift_webgl, bitwiseRShift_webglHeader ) 
		);
		this.addFunctionNode( 
			new functionNode( this.gpu, "bitwiseLShift", bitwiseLShift, ["float","float"], "highp float", bitwiseLShift_webgl, bitwiseLShift_webglHeader ) 
		);
		this.addFunctionNode( 
			new functionNode( this.gpu, "bitwiseURShift", bitwiseURShift, ["float","float"], "highp float", bitwiseURShift_webgl, bitwiseURShift_webglHeader ) 
		);
		this.addFunctionNode( 
			new functionNode( this.gpu, "bitwiseNOT", bitwiseNOT, ["float"], "highp float", bitwiseNOT_webgl, bitwiseNOT_webglHeader ) 
		);
	}
	functionBuilder.prototype.polyfillStandardFunctions = polyfillStandardFunctions;
	
	return functionBuilder;
})();
