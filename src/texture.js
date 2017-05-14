let gpu = null;
module.exports = class Texture {
	constructor(texture, size, dimensions, webGl) {
		this.texture = texture;
		this.size = size;
		this.dimensions = dimensions;
		this.webGl = webGl;
	}

	toArray() {
		if (gpu === null) {
			gpu = new GPU({
				mode: 'webgl'
			});
		}
		const copy = gpu.createKernel(function(x) {
			return x[this.thread.z][this.thread.y][this.thread.x];
		});

		return copy(this.texture);
	}

	delete() {
		return this.webGl.deleteTexture(this.texture);
	}
};