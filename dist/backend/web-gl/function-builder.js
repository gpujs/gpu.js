'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var FunctionBuilder = require('../function-builder');
var WebGLFunctionNode = require('./function-node');

/**
 * @desc Builds webGl functions (shaders) from JavaScript function Strings
 */

var WebGLFunctionBuilder = function (_FunctionBuilder) {
	_inherits(WebGLFunctionBuilder, _FunctionBuilder);

	function WebGLFunctionBuilder() {
		_classCallCheck(this, WebGLFunctionBuilder);

		var _this = _possibleConstructorReturn(this, (WebGLFunctionBuilder.__proto__ || Object.getPrototypeOf(WebGLFunctionBuilder)).call(this));

		_this.Node = WebGLFunctionNode;
		return _this;
	}

	return WebGLFunctionBuilder;
}(FunctionBuilder);

module.exports = WebGLFunctionBuilder;