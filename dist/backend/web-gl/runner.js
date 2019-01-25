'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var GLRunner = require('../gl-runner');
var WebGLKernel = require('./kernel');
var WebGLFunctionBuilder = require('./function-builder');
var isSupported = null;
var testCanvas = null;
var testContext = null;
var testExtensions = null;
var testFunctionBuilder = null;

var WebGLRunner = function (_GLRunner) {
	_inherits(WebGLRunner, _GLRunner);

	function WebGLRunner() {
		_classCallCheck(this, WebGLRunner);

		return _possibleConstructorReturn(this, (WebGLRunner.__proto__ || Object.getPrototypeOf(WebGLRunner)).apply(this, arguments));
	}

	_createClass(WebGLRunner, [{
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
				testContext = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
				testExtensions = {
					OES_texture_float: testContext.getExtension('OES_texture_float'),
					OES_texture_float_linear: testContext.getExtension('OES_texture_float_linear'),
					OES_element_index_uint: testContext.getExtension('OES_element_index_uint'),
					WEBGL_draw_buffers: testContext.getExtension('WEBGL_draw_buffers')
				};
				testFunctionBuilder = new this.FunctionBuilder();
			}
		}
	}, {
		key: 'isContextMatch',
		value: function isContextMatch(context) {
			if (typeof WebGLRenderingContext !== 'undefined') {
				return context instanceof WebGLRenderingContext;
			}
			return false;
		}
	}, {
		key: 'getFeatures',
		value: function getFeatures() {
			this.setupFeatureChecks();
			var isDrawBuffers = this.getIsDrawBuffers();

			return Object.freeze({
				isFloatRead: this.getIsFloatRead(),
				isIntegerDivisionAccurate: this.getIsIntegerDivisionAccurate(),
				isTextureFloat: this.getIsTextureFloat(),
				isDrawBuffers: isDrawBuffers,
				kernelMap: true || isDrawBuffers
			});
		}
	}, {
		key: 'getIsTextureFloat',
		value: function getIsTextureFloat() {
			return Boolean(testExtensions.OES_texture_float);
		}
	}, {
		key: 'getIsDrawBuffers',
		value: function getIsDrawBuffers() {
			return Boolean(testExtensions.WEBGL_draw_buffers);
		}
	}, {
		key: 'FunctionBuilder',
		get: function get() {
			return WebGLFunctionBuilder;
		}
	}, {
		key: 'Kernel',
		get: function get() {
			return WebGLKernel;
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

	return WebGLRunner;
}(GLRunner);

module.exports = WebGLRunner;