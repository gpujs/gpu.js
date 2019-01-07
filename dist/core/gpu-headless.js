'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var utils = require('./utils');
var WebGLRunner = require('../backend/web-gl/runner');
var CPURunner = require('../backend/cpu/runner');
var WebGLValidatorKernel = require('../backend/web-gl/validator-kernel');
var GPUCoreBase = require('./gpu-core-base');

var createWebGLContext = require('gl');

var _require = require('canvas'),
    createCanvas = _require.createCanvas;

/**
 * Initialises the GPU.js library class which manages the webGlContext for the created functions.
 * @class
 * @extends GPUCoreBase
 */


var GPUHeadless = function (_GPUCoreBase) {
	_inherits(GPUHeadless, _GPUCoreBase);

	/**
  * Creates an instance of GPUHeadless.
  * @param {any} settings - Settings to set mode, andother properties. See #GPUCoreBase
  * @memberOf GPU#
  */
	function GPUHeadless(settings) {
		_classCallCheck(this, GPUHeadless);

		var _this = _possibleConstructorReturn(this, (GPUHeadless.__proto__ || Object.getPrototypeOf(GPUHeadless)).call(this, settings));

		settings = settings || {};
		_this._canvas = settings.canvas || null;
		_this._webGl = settings.webGl || null;

		var mode = settings.mode;
		var detectedMode = void 0;

		if (mode === 'cpu') {
			detectedMode = 'cpu';
		} else {
			if (mode === 'gpu') {
				detectedMode = 'webgl';
			} else {
				detectedMode = mode;
			}

			var context = createWebGLContext(2, 2);
			var canvas = createCanvas(2, 2);

			_this._webGl = context;
			_this._canvas = canvas;
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

			// private explicit options for testing
			case 'webgl':
				_this._runner = new WebGLRunner(runnerSettings);
				break;

			// private explicit options for internal
			case 'webgl-validator':
				_this._runner = new WebGLRunner(runnerSettings);
				_this._runner.Kernel = WebGLValidatorKernel;
				break;

			default:
				throw new Error('"' + mode + '" mode is not defined');
		}
		return _this;
	}

	return GPUHeadless;
}(GPUCoreBase);

;

// This ensure static methods are "inherited"
// See: https://stackoverflow.com/questions/5441508/how-to-inherit-static-methods-from-base-class-in-javascript
Object.assign(GPUHeadless, GPUCoreBase);

module.exports = GPUHeadless;