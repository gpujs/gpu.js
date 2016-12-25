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
	//  Object / function cloning and manipulation
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
	
	///
	/// Function: newPromise
	///
	/// Returns a `new Promise` object based on the underlying implmentation
	///
	/// Parameters:
	/// 	executor - {function(resolve,reject)}  Promise builder function
	///
	/// Returns:
	/// 	{Promise}  Promise object
	///
	function newPromise(executor) {
		var imple = Promise || small_promise;
		if(imple === null) {
			throw TypeError("Browser is missing Promise implmentation. Consider adding small_promise.js polyfill");
		}
		return (new imple(executor));
	}
	GPUUtils.newPromise = newPromise;
	
	///
	/// Function: functionBinder
	///
	/// Limited implmentation of Function.bind, with fallback
	///
	/// Parameters:
	/// 	inFunc   - {JS Function}  to setup bind on
	/// 	thisObj  - {Object} The this parameter to assume inside the binded function
	///
	/// Returns:
	/// 	{JS Function}  The binded function
	///
	function functionBinder( inFunc, thisObj ) {
		if( inFunc.bind ) {
			return inFunc.bind(thisObj);
		}
		
		return function() {
			var args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments));
			return inFunc.apply( thisObj, args );
		}
	}
	GPUUtils.functionBinder = functionBinder;
	
	///
	/// Function: getArgumentType
	///
	/// Evaluate the argument type, to apply respective logic for it
	///
	/// Parameters:
	/// 	arg   - {Object} The argument object to evaluate type
	///
	/// Returns:
	/// 	{String}  Argument type Array/Number/Texture/Unknown
	///
	function getArgumentType(arg) {
		if (Array.isArray(arg)) {
			return 'Array';
		} else if (typeof arg == "number") {
			return 'Number';
		} else if (arg instanceof GPUTexture) {
			return 'Texture';
		} else {
			return 'Unknown';
		}
	}
	GPUUtils.getArgumentType = getArgumentType;
	
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
		alpha: false,
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
		GPUUtils.OES_texture_float = webgl.getExtension('OES_texture_float');
		GPUUtils.OES_texture_float_linear = webgl.getExtension('OES_texture_float_linear');
		GPUUtils.OES_element_index_uint = webgl.getExtension('OES_element_index_uint');

		// Returns the canvas
		return webgl;
	}
	GPUUtils.init_webgl = init_webgl;
	
	// test_readPixels closure based memoizer
	var test_floatReadPixels_memoizer = null;
	///
	/// Function: test_floatReadPixels_memoizer
	///
	/// Checks if the browser supports readPixels with float type
	///
	/// Parameters:
	/// 	gpu - {gpu.js object} the gpu object
	///
	/// Returns:
	/// 	{Boolean} true if browser supports
	///
	function test_floatReadPixels(gpu) {
		if (test_floatReadPixels_memoizer !== null) {
			return test_floatReadPixels_memoizer
		}
		
		var x = gpu.createKernel(function() {
			return 1;
		}, {
			'dimensions': [2],
			'floatTextures': true,
			'floatOutput': true,
			'floatOutputForce': true
		}).dimensions([2])();
		
		return x[0] == 1;
	}
	GPUUtils.test_floatReadPixels = test_floatReadPixels;
	
	return GPUUtils;
})();
