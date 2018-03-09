'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var WebGLRunner = require('../web-gl/runner');
var WebGL2FunctionBuilder = require('./function-builder');
var WebGL2Kernel = require('./kernel');

module.exports = function (_WebGLRunner) {
	_inherits(WebGL2Runner, _WebGLRunner);

	/**
  * @constructor WebGLRunner
  *
  * @extends RunnerBase
 	 * @desc Instantiates a Runner instance for the kernel.
  *
  * @param {Object} settings - Settings to instantiate properties in RunnerBase, with given values
  *
  */
	function WebGL2Runner(settings) {
		_classCallCheck(this, WebGL2Runner);

		var _this = _possibleConstructorReturn(this, (WebGL2Runner.__proto__ || Object.getPrototypeOf(WebGL2Runner)).call(this, new WebGL2FunctionBuilder(), settings));

		_this.Kernel = WebGL2Kernel;
		_this.kernel = null;
		return _this;
	}

	return WebGL2Runner;
}(WebGLRunner);