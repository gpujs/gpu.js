///
/// Class: GPUUtils
///
/// Various utility functions / snippets of code that GPU.JS uses internally.\
/// This covers various snippets of code that is not entirely gpu.js specific (ie. may find uses elsewhere)
///
/// Note that all moethods in this class is "static" by nature `GPUUtils.functionName()`
///
var GPUUtils = (function() {

	var GPUUtils = {};

	//-----------------------------------------------------------------------------
	//
	//  System values support (currently only endianness)
	//
	//-----------------------------------------------------------------------------
	
	// systemEndianness closure based memoizer
	var endianness = null;

	///
	/// Function: systemEndianness
	///
	/// Gets the system endianness, and cache it
	///
	/// Returns:
	///	{String} "LE" or "BE" depending on system architecture
	///
	/// Credit: https://gist.github.com/TooTallNate/4750953
	function systemEndianness() {
		if( endianness !== null ) {
			return endianness;
		}

		var b = new ArrayBuffer(4);
		var a = new Uint32Array(b);
		var c = new Uint8Array(b);
		a[0] = 0xdeadbeef;
		if (c[0] == 0xef) return endianness = 'LE';
		if (c[0] == 0xde) return endianness = 'BE';
		throw new Error('unknown endianness');
	}
	GPUUtils.systemEndianness = systemEndianness;

	//-----------------------------------------------------------------------------
	//
	//  Function and function string validations
	//
	//-----------------------------------------------------------------------------

	///
	/// Function: isFunction
	///
	/// Return TRUE, on a JS function
	///
	/// Parameters:
	/// 	funcObj - {JS Function} Object to validate if its a function
	///
	/// Returns:
	/// 	{Boolean} TRUE if the object is a JS function
	///
	function isFunction( funcObj ) {
		return typeof(funcObj) === 'function';
	}
	GPUUtils.isFunction = isFunction;

	///
	/// Function: isFunctionString
	///
	/// Return TRUE, on a valid JS function string
	///
	/// Note: This does just a VERY simply sanity check. And may give false positives.
	///
	/// Parameters:
	/// 	funcStr - {String}  String of JS function to validate
	///
	/// Returns:
	/// 	{Boolean} TRUE if the string passes basic validation
	///
	function isFunctionString( funcStr ) {
		if( funcStr !== null ) {
			return (funcStr.toString().slice(0, "function".length).toLowerCase() == "function");
		}
		return false;
	}
	GPUUtils.isFunctionString = isFunctionString;

	// FUNCTION_NAME regex
	var FUNCTION_NAME = /function ([^(]*)/;

	///
	/// Function: getFunctionName_fromString
	///
	/// Return the function name from a JS function string
	///
	/// Parameters:
	/// 	funcStr - {String}  String of JS function to validate
	///
	/// Returns:
	/// 	{String} Function name string (if found)
	///
	function getFunctionName_fromString( funcStr ) {
		return FUNCTION_NAME.exec(funcStr)[1];
	}
	GPUUtils.getFunctionName_fromString = getFunctionName_fromString;

	// STRIP COMMENTS regex
	var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

	// ARGUMENT NAMES regex
	var ARGUMENT_NAMES = /([^\s,]+)/g;

	///
	/// Function: getParamNames_fromString
	///
	/// Return list of parameter names extracted from the JS function string
	///
	/// Parameters:
	/// 	funcStr - {String}  String of JS function to validate
	///
	/// Returns:
	/// 	{[String, ...]}  Array representing all the parameter names
	///
	function getParamNames_fromString(func) {
		var fnStr = func.toString().replace(STRIP_COMMENTS, '');
		var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
		if(result === null)
			result = [];
		return result;
	}
	GPUUtils.getParamNames_fromString = getParamNames_fromString;
	
	//-----------------------------------------------------------------------------
	//
	//  Object cloning and manipulation
	//
	//-----------------------------------------------------------------------------

	///
	/// Function: clone
	///
	/// Returns a clone
	///
	/// Parameters:
	/// 	obj - {Object}  Object to clone
	///
	/// Returns:
	/// 	{Object}  Cloned object
	///
	function clone(obj) {
		if(obj === null || typeof(obj) !== 'object' || 'isActiveClone' in obj)
			return obj;

		var temp = obj.constructor(); // changed

		for(var key in obj) {
			if(Object.prototype.hasOwnProperty.call(obj, key)) {
				obj.isActiveClone = null;
				temp[key] = clone(obj[key]);
				delete obj.isActiveClone;
			}
		}

		return temp;
	}
	GPUUtils.clone = clone;

	//-----------------------------------------------------------------------------
	//
	//  Canvas validation and support
	//
	//-----------------------------------------------------------------------------

	///
	/// Function: isCanvas
	///
	/// Return TRUE, on a valid DOM canvas object
	///
	/// Note: This does just a VERY simply sanity check. And may give false positives.
	///
	/// Parameters:
	/// 	canvasObj - {Canvas DOM object} Object to validate
	///
	/// Returns:
	/// 	{Boolean} TRUE if the object is a DOM canvas
	///
	function isCanvas( canvasObj ) {
		return ( 
			canvasObj != null &&
			canvasObj.nodeName &&
			canvasObj.getContext &&
			canvasObj.nodeName.toUpperCase() === "CANVAS"
		);
	}
	GPUUtils.isCanvas = isCanvas;
	
	// browserSupport_canvas closure based memoizer
	var browserSupport_canvas_memoizer = null;
	///
	/// Function: browserSupport_canvas
	///
	/// Return TRUE, if browser supports canvas
	///
	/// Returns:
	/// 	{Boolean} TRUE if browser supports canvas
	///
	function browserSupport_canvas() {
		if( browserSupport_canvas_memoizer !== null ) {
			return browserSupport_canvas_memoizer;
		}
		return browserSupport_canvas_memoizer = isCanvas(document.createElement('canvas'));
	}
	GPUUtils.browserSupport_canvas = browserSupport_canvas;
	
	///
	/// Function: init_canvas
	///
	/// Initiate and returns a canvas, for usage in init_webgl.
	/// Returns only if canvas is supported by browser.
	///
	/// Returns:
	/// 	{Canvas DOM object} Canvas dom object if supported by browser, else null
	///
	function init_canvas() {
		// Fail fast if browser previously detected no support
		if( browserSupport_canvas_memoizer === false ) {
			return null;
		}
		
		// Create a new canvas DOM
		var canvas = document.createElement('canvas');
		
		// First time setup, does the browser support check memoizer
		if( browserSupport_canvas_memoizer === null ) {
			browserSupport_canvas_memoizer = isCanvas(canvas);
			if( browserSupport_canvas_memoizer === false ) {
				return null;
			}
		}
		
		// Default width and height, to fix webgl issue in safari
		canvas.width = 2;
		canvas.height = 2;
		
		// Returns the canvas
		return canvas;
	}
	GPUUtils.init_canvas = init_canvas;
	
	//-----------------------------------------------------------------------------
	//
	//  Webgl validation and support
	//
	//-----------------------------------------------------------------------------

	///
	/// Function: isWebgl
	///
	/// Return TRUE, on a valid webgl context object
	///
	/// Note: This does just a VERY simply sanity check. And may give false positives.
	///
	/// Parameters:
	/// 	webglObj - {webgl context} Object to validate
	///
	/// Returns:
	/// 	{Boolean} TRUE if the object is a webgl context object
	///
	function isWebgl( webglObj ) {
		return ( 
			webglObj != null &&
			webglObj.getExtension
		);
	}
	GPUUtils.isWebgl = isWebgl;
	
	// browserSupport_canvas closure based memoizer
	var browserSupport_webgl_memoizer = null;
	///
	/// Function: browserSupport_webgl
	///
	/// Return TRUE, if browser supports webgl
	///
	/// Returns:
	/// 	{Boolean} TRUE if browser supports webgl
	///
	function browserSupport_webgl() {
		if( browserSupport_webgl_memoizer !== null ) {
			return browserSupport_webgl_memoizer;
		}
		return browserSupport_webgl_memoizer = isWebgl(init_webgl(init_canvas()));
	}
	GPUUtils.browserSupport_webgl = browserSupport_webgl;
	
	// Default webgl options to use
	var init_webgl_defaultOptions = {
		depth: false,
		antialias: false
	}
	
	///
	/// Function: init_webgl
	///
	/// Initiate and returns a webgl, from a canvas object
	/// Returns only if webgl is supported by browser.
	///
	/// Parameters:
	/// 	canvasObj - {Canvas DOM object} Object to validate
	///
	/// Returns:
	/// 	{Canvas DOM object} Canvas dom object if supported by browser, else null
	///
	function init_webgl(canvasObj) {
		
		// Fail fast for invalid canvas object
		if( !isCanvas(canvasObj) ) {
			throw new Error("Invalid canvas object - "+canvasObj);
		}
		
		// Fail fast if browser previously detected no support
		if( browserSupport_canvas_memoizer === false || browserSupport_webgl_memoizer === false ) {
			return null;
		}
		
		// Create a new canvas DOM
		var webgl = (
			canvasObj.getContext("experimental-webgl", init_webgl_defaultOptions) || 
			canvasObj.getContext("webgl", init_webgl_defaultOptions)
		);
		
		// First time setup, does the browser support check memoizer
		if( browserSupport_webgl_memoizer === null ) {
			browserSupport_webgl_memoizer = isWebgl(webgl);
			if( browserSupport_webgl_memoizer === false ) {
				return null;
			}
		}
		
		// Get the extension that is needed
		webgl.getExtension('OES_texture_float');
		webgl.getExtension('OES_texture_float_linear');
		webgl.getExtension('OES_element_index_uint');

		// Returns the canvas
		return webgl;
	}
	GPUUtils.init_webgl = init_webgl;
	
	return GPUUtils;
})();
