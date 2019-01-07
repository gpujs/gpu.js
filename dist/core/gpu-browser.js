'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var utils = require('./utils');
var WebGLRunner = require('../backend/web-gl/runner');
var WebGL2Runner = require('../backend/web-gl2/runner');
var CPURunner = require('../backend/cpu/runner');
var WebGLValidatorKernel = require('../backend/web-gl/validator-kernel');
var WebGL2ValidatorKernel = require('../backend/web-gl2/validator-kernel');
var GPUCoreBase = require("./gpu-core-base");

/**
 * Initialises the GPU.js library class which manages the webGlContext for the created functions.
 * @class
 * @extends GPUCore
 */

var GPU = function (_GPUCore) {
	_inherits(GPU, _GPUCore);

	/**
  * Creates an instance of GPU.
  * @param {any} settings - Settings to set mode, andother properties. See #GPUCore
  * @memberOf GPU#
  */
	function GPU(settings) {
		_classCallCheck(this, GPU);

		var _this = _possibleConstructorReturn(this, (GPU.__proto__ || Object.getPrototypeOf(GPU)).call(this, settings));

		settings = settings || {};
		_this._canvas = settings.canvas || null;
		_this._webGl = settings.webGl || null;
		var mode = settings.mode;
		var detectedMode = void 0;
		if (!utils.isWebGlSupported()) {
			if (mode && mode !== 'cpu') {
				throw new Error('A requested mode of "' + mode + '" and is not supported');
			} else {
				console.warn('Warning: gpu not supported, falling back to cpu support');
				detectedMode = 'cpu';
			}
		} else {
			if (_this._webGl) {
				if (typeof WebGL2RenderingContext !== 'undefined' && _this._webGl.constructor === WebGL2RenderingContext) {
					detectedMode = 'webgl2';
				} else if (typeof WebGLRenderingContext !== 'undefined' && _this._webGl.constructor === WebGLRenderingContext) {
					detectedMode = 'webgl';
				} else {
					throw new Error('unknown WebGL Context');
				}
			} else {
				detectedMode = mode || 'gpu';
			}
		}
		_this.kernels = [];

		var runnerSettings = {
			canvas: _this._canvas,
			webGl: _this._webGl
		};

		switch (detectedMode) {
			// public options
			case 'cpu':
				_this._runner = new CPURunner(runnerSettings);
				break;
			case 'gpu':
				var Runner = _this.getGPURunner();
				_this._runner = new Runner(runnerSettings);
				break;

			// private explicit options for testing
			case 'webgl2':
				_this._runner = new WebGL2Runner(runnerSettings);
				break;
			case 'webgl':
				_this._runner = new WebGLRunner(runnerSettings);
				break;

			// private explicit options for internal
			case 'webgl2-validator':
				_this._runner = new WebGL2Runner(runnerSettings);
				_this._runner.Kernel = WebGL2ValidatorKernel;
				break;
			case 'webgl-validator':
				_this._runner = new WebGLRunner(runnerSettings);
				_this._runner.Kernel = WebGLValidatorKernel;
				break;
			default:
				throw new Error('"' + mode + '" mode is not defined');
		}
		return _this;
	}

	_createClass(GPU, [{
		key: 'getGPURunner',
		value: function getGPURunner() {
			if (typeof WebGL2RenderingContext !== 'undefined' && utils.isWebGl2Supported()) return WebGL2Runner;
			if (typeof WebGLRenderingContext !== 'undefined') return WebGLRunner;
		}
	}]);

	return GPU;
}(GPUCore);

;

// This ensure static methods are "inherited"
// See: https://stackoverflow.com/questions/5441508/how-to-inherit-static-methods-from-base-class-in-javascript
Object.assign(GPU, GPUCoreBase);

module.exports = GPU;