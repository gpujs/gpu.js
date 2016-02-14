var GPUTexture = (function() {
    function GPUTexture(gpu, texture, size, dimensions) {
        this.gpu = gpu;
        this.texture = texture;
        this.size = size;
        this.dimensions = dimensions;
    }
    
    GPUTexture.prototype.toArray = function() {
        return this.gpu.textureToArray(this);
    };
    
    return GPUTexture;
})();
