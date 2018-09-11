(function(factory) {

	// NOTE:
	// All techniques except for the "browser globals" fallback will extend the
	// provided QUnit object but return the isolated API methods
  
	// For AMD: Register as an anonymous AMD module with a named dependency on "qunit".
	if (typeof define === "function" && define.amd) {
	  define(["qunit"], factory);
	}
	// For Node.js
	else if (typeof module !== "undefined" && module && module.exports && typeof require === "function") {
	  module.exports = factory(require("qunitjs"));
	}
	// For CommonJS with `exports`, but without `module.exports`, like Rhino
	else if (typeof exports !== "undefined" && exports && typeof require === "function") {
	  var qunit = require("qunitjs");
	  qunit.extend(exports, factory(qunit));
	}
	// For browser globals
	else {
	  factory(QUnit);
	}
  
  }(function(QUnit) {
  
	// convert typed possibly multidimensional array to untyped 
    function toDeepUntypedArray(a) {
			if (a.constructor == Float32Array) {
				return Array.from(a);
			}
			for (var i=0; i < a.length; i++) { 
				a[i] = toDeepUntypedArray(a[i])
			}
			return a;
	  }

	/**
	 * deep/multidimensional typed/untyped array diff check
	 *
	 * @example assert.deepValueEqual([[1,2,3],[1,2,3]], [new Float32Array([1,2,3]), new Float32Array([1,2,3])]);
	 *
	 * @param Number actual
	 * @param Number expected
	 * @param String message (optional)
	 */
	function deepValueEqual(actual, expected, message) {
		QUnit.assert.deepEqual(toDeepUntypedArray(actual), toDeepUntypedArray(expected), message);
	}
  
	var api = {
		deepValueEqual: deepValueEqual
	};
  
	QUnit.extend(QUnit.assert, api);
  
	return api;
  }));
  