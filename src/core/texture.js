'use strict';

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
		this.kernel = null;
	}

	/**
	 * @name toArray
	 * @function
	 * @memberOf Texture#
	 *
	 * @desc Converts the Texture into a JavaScript Array.
	 * 
	 * @param {Object} The `gpu` Object
	 *
	 */
	toArray(gpu) {
		if (!gpu) throw new Error('You need to pass the GPU object for toArray to work.');
		if(this.kernel) return this.kernel(this);

		this.kernel = gpu.createKernel(function(x) {
			return x[this.thread.z][this.thread.y][this.thread.x];
		}).setDimensions(this.dimensions);

		return this.kernel(this);
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