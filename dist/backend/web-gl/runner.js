'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var RunnerBase = require('../runner-base');
var WebGLKernel = require('./kernel');
var WebGLFunctionBuilder = require('./function-builder');

module.exports = function (_RunnerBase) {
	_inherits(WebGLRunner, _RunnerBase);

	/**
  * @constructor WebGLRunner
  *
 	 * @extends RunnerBase
  	 * @desc Instantiates a Runner instance for the kernel.
  * 
  * @param {Object} settings - Settings to instantiate properties in RunnerBase, with given values
  *
  */
	function WebGLRunner(settings) {
		_classCallCheck(this, WebGLRunner);

		var _this = _possibleConstructorReturn(this, (WebGLRunner.__proto__ || Object.getPrototypeOf(WebGLRunner)).call(this, new WebGLFunctionBuilder(), settings));

		_this.Kernel = WebGLKernel;
		_this.kernel = null;
		return _this;
	}

	/**
  * @memberOf WebGLRunner#
  * @function
  * @name getMode
  *
  * @desc Return the current mode in which gpu.js is executing.
  * 
  * @returns {String} The current mode; "cpu".
  *
  */


	_createClass(WebGLRunner, [{
		key: 'getMode',
		value: function getMode() {
			return 'gpu';
		}
	}]);

	return WebGLRunner;
}(RunnerBase);