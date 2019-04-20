/**
 * @desc WebGl Texture implementation in JS
 * @param {ITextureSettings} settings
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
			type = 'NumberTexture',
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
	 * @param {GPU} [gpu]
	 * @returns {Number[]|Number[][]|Number[][][]}
	 */
	toArray(gpu) {
		let {
			kernel
		} = this;
		if (kernel) return kernel(this);
		gpu = gpu || this.gpu;
		if (!gpu) throw new Error('settings property "gpu" or argument required.');
		kernel = gpu.createKernel(function(x) {
			return x[this.thread.z][this.thread.y][this.thread.x];
		}, {
			output: this.output,
			precision: this.getPrecision(),
			optimizeFloatMemory: this.type === 'MemoryOptimizedNumberTexture',
		});

		this.kernel = kernel;
		return kernel(this);
	}

	getPrecision() {
		switch (this.type) {
			case 'NumberTexture':
				return 'unsigned';
			case 'MemoryOptimizedNumberTexture':
			case 'ArrayTexture(1)':
			case 'ArrayTexture(2)':
			case 'ArrayTexture(3)':
			case 'ArrayTexture(4)':
				return 'single';
			default:
				throw new Error('Unknown texture type');
		}
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