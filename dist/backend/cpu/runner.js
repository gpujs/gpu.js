'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Runner = require('../runner');
var CPUKernel = require('./kernel');
var CPUFunctionBuilder = require('./function-builder');

var CPURunner = function (_Runner) {
	_inherits(CPURunner, _Runner);

	function CPURunner() {
		_classCallCheck(this, CPURunner);

		return _possibleConstructorReturn(this, (CPURunner.__proto__ || Object.getPrototypeOf(CPURunner)).apply(this, arguments));
	}

	_createClass(CPURunner, [{
		key: 'getMode',

		/**
   * @name getMode()
   * @desc Return the current mode in which gpu.js is executing.
   * @returns {String} The current mode; "cpu".
   */
		value: function getMode() {
			return 'cpu';
		}
	}], [{
		key: 'getFeatures',
		value: function getFeatures() {
			return Object.freeze({
				kernelMap: true,
				isIntegerDivisionAccurate: true
			});
		}
	}, {
		key: 'isContextMatch',
		value: function isContextMatch(context) {
			return false;
		}
	}, {
		key: 'FunctionBuilder',
		get: function get() {
			return CPUFunctionBuilder;
		}
	}, {
		key: 'Kernel',
		get: function get() {
			return CPUKernel;
		}
	}, {
		key: 'isSupported',
		get: function get() {
			return true;
		}
	}]);

	return CPURunner;
}(Runner);

module.exports = CPURunner;