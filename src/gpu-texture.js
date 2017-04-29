module.exports = class GPUTexture {
    constructor(gpu, texture, size, dimensions) {
        this.gpu = gpu;
        this.texture = texture;
        this.size = size;
        this.dimensions = dimensions;
    }

    toArray() {
        return this.gpu.textureToArray(this);
    }

    delete() {
        return this.gpu.deleteTexture(this);
    }
}
