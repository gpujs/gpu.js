'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var BaseFunctionNode = require('../function-node-base');

/**
 * @class CPUFunctionNode
 * 
 * @extends BaseFunctionNode
 *
 * @desc [INTERNAL] Represents a single function, inside JS, webGL, or openGL.
 *
 * <p>This handles all the raw state, converted state, etc. Of a single function.</p>
 *
 * @prop functionName         - {String}        Name of the function
 * @prop jsFunction           - {Function}   The JS Function the node represents
 * @prop jsFunctionString     - {String}        jsFunction.toString()
 * @prop paramNames           - {String[]}  Parameter names of the function
 * @prop paramTypes           - {String[]}  Shader land parameters type assumption
 * @prop isRootKernel         - {Boolean}       Special indicator, for kernel function
 * @prop webglFunctionString  - {String}        webgl converted function string
 * @prop openglFunctionString - {String}        opengl converted function string
 * @prop calledFunctions      - {String[]}  List of all the functions called
 * @prop initVariables        - {String[]}  List of variables initialized in the function
 * @prop readVariables        - {String[]}  List of variables read operations occur
 * @prop writeVariables       - {String[]}  List of variables write operations occur
 *
 */
module.exports = function (_BaseFunctionNode) {
  _inherits(CPUFunctionNode, _BaseFunctionNode);

  function CPUFunctionNode() {
    _classCallCheck(this, CPUFunctionNode);

    return _possibleConstructorReturn(this, (CPUFunctionNode.__proto__ || Object.getPrototypeOf(CPUFunctionNode)).apply(this, arguments));
  }

  _createClass(CPUFunctionNode, [{
    key: 'generate',
    value: function generate(options) {
      this.functionString = this.jsFunctionString;
    }

    /**
     * @memberOf CPUFunctionNode#
     * @function
     * @name getFunctionPrototypeString
     *
     * @desc Returns the converted webgl shader function equivalent of the JS function
     *
     * @returns {String} webgl function string, result is cached under this.getFunctionPrototypeString
     *
     */

  }, {
    key: 'getFunctionPrototypeString',
    value: function getFunctionPrototypeString(options) {
      return this.functionString;
    }
  }]);

  return CPUFunctionNode;
}(BaseFunctionNode);