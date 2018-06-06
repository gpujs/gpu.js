'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var FunctionBuilderBase = require('../function-builder-base');
var WebGL2FunctionNode = require('./function-node');

/**
 * @class WebGLFunctionBuilder
 *
 * @extends FunctionBuilderBase
 *
 * @desc Builds webGl functions (shaders) from JavaScript function Strings
 *
 */
module.exports = function (_FunctionBuilderBase) {
  _inherits(WebGL2FunctionBuilder, _FunctionBuilderBase);

  function WebGL2FunctionBuilder() {
    _classCallCheck(this, WebGL2FunctionBuilder);

    var _this = _possibleConstructorReturn(this, (WebGL2FunctionBuilder.__proto__ || Object.getPrototypeOf(WebGL2FunctionBuilder)).call(this));

    _this.Node = WebGL2FunctionNode;
    return _this;
  }

  return WebGL2FunctionBuilder;
}(FunctionBuilderBase);