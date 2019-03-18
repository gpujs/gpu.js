/**
 * @desc WebGl Texture implementation in JS
 * @param {Object} texture
 * @param {Array} size
 * @param {Object|Array} dimensions
 * @param {Array} output
 * @param {Object} context
 * @param {String} [type]
 */
class Texture {
	constructor(settings) {
		const {
			texture,
			size,
			dimensions,
			output,
			context,
			gpu,
			type = 'NumberTexture'
		} = settings;
		if (!output) throw new Error('settings property "output" required.');
		if (!context) throw new Error('settings property "context" required.');
		this.texture = texture;
		this.size = size;
		this.dimensions = dimensions;
		this.output = output;
		this.context = context;
		this.gpu = gpu;
		this.kernel = null;
		this.type = type;
	}

	/**
	 * @desc Converts the Texture into a JavaScript Array.
	 */
	toArray(gpu) {
		if (this.kernel) return this.kernel(this);
		gpu = gpu || this.gpu;
		if (!gpu) throw new Error('settings property "gpu" or argument required.');
		this.kernel = gpu.createKernel(function(x) {
			return x[this.thread.z][this.thread.y][this.thread.x];
		}).setOutput(this.output);

		return this.kernel(this);
	}

	/**
	 * @desc Deletes the Texture
	 */
	delete() {
		return this.context.deleteTexture(this.texture);
	}
}

module.exports = {
	Texture
};