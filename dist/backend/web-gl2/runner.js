'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var RunnerBase = require('../runner-base');
var WebGL2FunctionBuilder = require('./function-builder');
var WebGL2Kernel = require('./kernel');

module.exports = function (_RunnerBase) {
	_inherits(WebGL2Runner, _RunnerBase);

	/**
  * @constructor WebGL2Runner
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

	/**
  * @memberOf WebGL2Runner#
  * @function
  * @name getMode
  *
  * @desc Return the current mode in which gpu.js is executing.
  *
  * @returns {String} The current mode; "gpu".
  *
  */


	_createClass(WebGL2Runner, [{
		key: 'getMode',
		value: function getMode() {
			return 'gpu';
		}
	}]);

	return WebGL2Runner;
}(RunnerBase);