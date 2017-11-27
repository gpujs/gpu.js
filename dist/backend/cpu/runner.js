'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var utils = require('../../core/utils');
var RunnerBase = require('../runner-base');
var CPUKernel = require('./kernel');
var CPUFunctionBuilder = require('./function-builder');

module.exports = function (_RunnerBase) {
	_inherits(CPURunner, _RunnerBase);

	/**
  * @constructor CPURunner
  *
  * @desc Instantiates a Runner instance for the kernel.
  * 
  * @extends RunnerBase
  *
  * @param {Object} settings - Settings to instantiate properties in RunnerBase, with given values
  *
  */

	function CPURunner(settings) {
		_classCallCheck(this, CPURunner);

		var _this = _possibleConstructorReturn(this, (CPURunner.__proto__ || Object.getPrototypeOf(CPURunner)).call(this, new CPUFunctionBuilder(), settings));

		_this.Kernel = CPUKernel;
		_this.kernel = null;
		return _this;
	}

	/**
  * @memberOf CPURunner#
  * @function
  * @name getMode()
  *
  * Return the current mode in which gpu.js is executing.
  * 
  * @returns {String} The current mode; "cpu".
  *
  */


	_createClass(CPURunner, [{
		key: 'getMode',
		value: function getMode() {
			return 'cpu';
		}
	}]);

	return CPURunner;
}(RunnerBase);