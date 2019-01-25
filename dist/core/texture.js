'use strict';

/**
 * @desc WebGl Texture implementation in JS
 * @param {Object} texture
 * @param {Array} size
 * @param {Object|Array} dimensions
 * @param {Array} output
 * @param {Object} context
 * @param {String} [type]
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Texture = function () {
	function Texture(texture, size, dimensions, output, context) {
		var type = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 'NumberTexture';

		_classCallCheck(this, Texture);

		this.texture = texture;
		this.size = size;
		this.dimensions = dimensions;
		this.output = output;
		this.context = context;
		this.kernel = null;
		this.type = type;
	}

	/**
  * @desc Converts the Texture into a JavaScript Array.
  * @param {GPU} gpu Object
  */


	_createClass(Texture, [{
		key: 'toArray',
		value: function toArray(gpu) {
			if (!gpu) throw new Error('You need to pass the GPU object for toArray to work.');
			if (this.kernel) return this.kernel(this);

			this.kernel = gpu.createKernel(function (x) {
				return x[this.thread.z][this.thread.y][this.thread.x];
			}).setOutput(this.output);

			return this.kernel(this);
		}

		/**
   * @desc Deletes the Texture
   */

	}, {
		key: 'delete',
		value: function _delete() {
			return this.context.deleteTexture(this.texture);
		}
	}]);

	return Texture;
}();

module.exports = Texture;