'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var GLRunner = require('../gl-runner');
var WebGL2FunctionBuilder = require('./function-builder');
var WebGL2Kernel = require('./kernel');
var isSupported = null;
var testCanvas = null;
var testContext = null;
var testFunctionBuilder = null;
var testExtensions = null;

var WebGL2Runner = function (_GLRunner) {
	_inherits(WebGL2Runner, _GLRunner);

	function WebGL2Runner() {
		_classCallCheck(this, WebGL2Runner);

		return _possibleConstructorReturn(this, (WebGL2Runner.__proto__ || Object.getPrototypeOf(WebGL2Runner)).apply(this, arguments));
	}

	_createClass(WebGL2Runner, [{
		key: 'getMode',


		/**
   * @desc Return the current mode in which gpu.js is executing.
   * @returns {String} The current mode; "gpu".
   */
		value: function getMode() {
			return 'gpu';
		}
	}], [{
		key: 'setupFeatureChecks',
		value: function setupFeatureChecks() {
			if (typeof document !== 'undefined') {
				testCanvas = document.createElement('canvas');
			} else if (typeof OffscreenCanvas !== 'undefined') {
				testCanvas = new OffscreenCanvas(0, 0);
			}

			if (testCanvas) {
				testContext = testCanvas.getContext('webgl2');
				testExtensions = {
					EXT_color_buffer_float: testContext.getExtension('EXT_color_buffer_float'),
					OES_texture_float_linear: testContext.getExtension('OES_texture_float_linear')
				};
				testFunctionBuilder = new this.FunctionBuilder();
			}
		}
	}, {
		key: 'isContextMatch',
		value: function isContextMatch(context) {
			// from global
			if (typeof WebGL2RenderingContext !== 'undefined') {
				return context instanceof WebGL2RenderingContext;
			}
			return false;
		}
	}, {
		key: 'getFeatures',
		value: function getFeatures() {
			return Object.freeze({
				isFloatRead: this.getIsFloatRead(),
				isIntegerDivisionAccurate: this.getIsIntegerDivisionAccurate(),
				kernelMap: true
			});
		}
	}, {
		key: 'getIsIntegerDivisionAccurate',
		value: function getIsIntegerDivisionAccurate() {
			return _get(WebGL2Runner.__proto__ || Object.getPrototypeOf(WebGL2Runner), 'getIsIntegerDivisionAccurate', this).call(this);
		}
	}, {
		key: 'FunctionBuilder',
		get: function get() {
			return WebGL2FunctionBuilder;
		}
	}, {
		key: 'Kernel',
		get: function get() {
			return WebGL2Kernel;
		}
	}, {
		key: 'isSupported',
		get: function get() {
			if (isSupported !== null) {
				return isSupported;
			}
			this.setupFeatureChecks();
			isSupported = this.isContextMatch(testContext);
			return isSupported;
		}
	}, {
		key: 'testCanvas',
		get: function get() {
			return testCanvas;
		}
	}, {
		key: 'testContext',
		get: function get() {
			return testContext;
		}
	}, {
		key: 'testFunctionBuilder',
		get: function get() {
			return testFunctionBuilder;
		}
	}]);

	return WebGL2Runner;
}(GLRunner);

module.exports = WebGL2Runner;