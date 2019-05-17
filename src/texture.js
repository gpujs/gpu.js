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

    // TODO: Break up textures into their individual types and handle their specific render there
    // const { context: gl } = this;
    // const framebuffer = gl.createFramebuffer();
    // gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    // gl.framebufferTexture2D(
    //   gl.FRAMEBUFFER,
    //   gl.COLOR_ATTACHMENT0,
    //   gl.TEXTURE_2D,
    //   this.texture,
    //   0
    // );
    // const result = new Uint8Array(this.size[0] * this.size[1] * 4);
    // const canRead = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    // if (!canRead) {
    //   throw new Error('cannot read texture');
    // }
    // gl.readPixels(0, 0, this.size[0], this.size[1], gl.RGBA, gl.UNSIGNED_BYTE, result);
    //
    // console.log(result);
    // // Unbind the framebuffer
    // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // return new Float32Array(result.buffer);
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