let gpu = null;

module.exports = class Texture {
	
	/**
 	 * @desc WebGl Texture implementation in JS
	 * @constructor Texture
	 * @param {Object} texture 
	 * @param {Array} size 
	 * @param {Array} dimensions 
	 * @param {Object} webGl
	 */
	constructor(texture, size, dimensions, webGl) {
		this.texture = texture;
		this.size = size;
		this.dimensions = dimensions;
		this.webGl = webGl;
	}

	/**
	 * @name toArray
	 * @function
	 * @memberOf Texture#
	 *
	 * @desc Converts the Texture into a JavaScript Array.
	 *
	 */
	toArray() {
		if (gpu === null) {
			gpu = new GPU({
				mode: 'webgl'
			});
		}
		const copy = gpu.createKernel(function(x) {
			return x[this.thread.z][this.thread.y][this.thread.x];
		}, {
		  dimensions: this.dimensions
    });

		return copy(this);
	}

	/**
	 * @name delete
	 * @desc Deletes the Texture.
	 * @function
	 * @memberOf Texture#
	 *
	 *
	 */
	delete() {
		return this.webGl.deleteTexture(this.texture);
	}
};