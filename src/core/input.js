module.exports = class Input {
	constructor(value, size) {
		this.value = value;
		if (Array.isArray(size)) {
			this.size = [];
			for (let i = 0; i < size.length; i++) {
				this.size[i] = size[i];
			}
			while (this.size.length < 3) {
				this.size.push(1);
			}
		} else {
			if (size.z) {
				this.size = [size.x, size.y, size.z];
			} else if (size.y) {
				this.size = [size.x, size.y, 1];
			} else {
				this.size = [size.x, 1, 1];
			}
		}
	}
};