'use strict';

/**
 *
 * @desc Reduced subset of Utils, used exclusively in gpu-core.js
 * Various utility functions / snippets of code that GPU.JS uses internally.\
 * This covers various snippets of code that is not entirely gpu.js specific (ie. may find uses elsewhere)
 *
 * Note that all methods in this class is 'static' by nature `UtilsCore.functionName()`
 *
 * @class UtilsCore
 *
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var UtilsCore = function () {
	function UtilsCore() {
		_classCallCheck(this, UtilsCore);
	}

	_createClass(UtilsCore, null, [{
		key: 'initWebGlDefaultSettings',

		// Default webgl settings to use
		value: function initWebGlDefaultSettings() {
			return {
				alpha: false,
				depth: false,
				antialias: false
			};
		}

		/**
   * @param {number[]} output
   * @throws if not correctly defined
   */

	}, {
		key: 'checkOutput',
		value: function checkOutput(output) {
			if (!output || !Array.isArray(output)) throw new Error('kernel.output not an array');
			for (var i = 0; i < output.length; i++) {
				if (isNaN(output[i]) || output[i] < 1) {
					throw new Error('kernel.output[' + i + '] incorrectly defined as `' + output[i] + '`, needs to be numeric, and greater than 0');
				}
			}
		}
	}]);

	return UtilsCore;
}();

module.exports = UtilsCore;