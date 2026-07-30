/**
 * @desc The pipeline-mode handle: wraps the kernel's GPU-resident output
 * buffer the way Texture wraps a GL texture. Refcounted on the raw buffer
 * (texture.js's `_refs` model) so clones and the owning kernel can each
 * release independently; the buffer dies at zero.
 */
class WebGPUBufferResult {
  /**
   * @param {Object} settings
   * @param {GPUBuffer} settings.buffer
   * @param {number[]} settings.output logical dims, e.g. [512, 512]
   * @param {number} [settings.componentCount] 1 for scalar returns, 2/3/4 for Array(n)
   * @param {Object} settings.context the `{adapter, device}` pair from WebGPUContext
   * @param {Object} settings.kernel owning WebGPUKernel, used for readback + shaping
   */
  constructor(settings) {
    this.buffer = settings.buffer;
    this.output = settings.output;
    this.componentCount = settings.componentCount || 1;
    this.context = settings.context;
    this.kernel = settings.kernel;
    this.type = 'WebGPUBuffer';
    this._deleted = false;
    if (this.buffer._refs) {
      this.buffer._refs++;
    } else {
      this.buffer._refs = 1;
    }
  }

  /**
   * @returns {Promise<Float32Array|Array>} values shaped exactly as a
   * non-pipeline run of the producing kernel would resolve them
   */
  toArray() {
    if (this._deleted) {
      return Promise.reject(new Error('WebGPUBufferResult has been deleted'));
    }
    return this.kernel.readBufferResult(this);
  }

  delete() {
    if (this._deleted) return;
    this._deleted = true;
    if (--this.buffer._refs === 0) {
      this.buffer.destroy();
    }
  }

  clone() {
    return new WebGPUBufferResult(this);
  }
}

module.exports = {
  WebGPUBufferResult
};