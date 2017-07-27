module.exports = class WebGLArgument {
	constructor(value, type, name, kernel) {
		this.value = value;
		this.type = type;
		this.name = name;
		this.gl = kernel._webGl;

		this.loc = kernel.getUniformLocation('user_' + name);
		this.locSize = kernel.getUniformLocation('user_' + name + 'Size');
		this.dimLoc = kernel.getUniformLocation('user_' + name + 'Dim');
	}

	addArray(gl) {
		const dim = utils.getDimensions(value, true);
		const size = utils.dimToTexSize({
			floatTextures: this.floatTextures,
			floatOutput: this.floatOutput
		}, dim);

		gl.activeTexture(gl.TEXTURE0 + this.argumentsLength);
		gl.bindTexture(gl.TEXTURE_2D, argumentTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

		let length = size[0] * size[1];
		if (this.floatTextures) {
			length *= 4;
		}

		const valuesFlat = new Float32Array(length);
		utils.flattenTo(value, valuesFlat);

		let buffer;
		if (this.floatTextures) {
			buffer = new Float32Array(valuesFlat);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size[0], size[1], 0, gl.RGBA, gl.FLOAT, buffer);
		} else {
			buffer = new Uint8Array((new Float32Array(valuesFlat)).buffer);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size[0], size[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
		}

		if (!this.hardcodeConstants) {
			gl.uniform3fv(this.dimLoc, dim);
			gl.uniform2fv(this.locSize, size);
		}
		gl.uniform1i(this.loc, offset);
	}

	addNumber() {
		gl.uniform1f(this.loc, this.value);
	}

	addTexture(gl, offset) {
		const texture = this.value;
		const dim = utils.getDimensions(texture.dimensions, true);
		const size = texture.size;
		gl.activeTexture(gl.TEXTURE0 + offset);
		gl.bindTexture(gl.TEXTURE_2D, texture.texture);
		gl.uniform3fv(this.dimLoc, dim);
		gl.uniform2fv(this.locSize, size);
		gl.uniform1i(this.loc, offset);
	}
};