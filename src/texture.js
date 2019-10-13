let clone1DKernels = {};
const cloneKernel1DSource = `function(value) {return value[this.thread.x];}`;
let clone2DKernels = {};
const cloneKernel2DSource = `function(value) {return value[this.thread.y][this.thread.x];}`;
let clone3DKernels = {};
const cloneKernel3DSource = `function(value) {return value[this.thread.z][this.thread.y][this.thread.x];}`;

/**
 * @desc WebGl Texture implementation in JS
 * @param {IGPUTextureSettings} settings
 */
class Texture {
  constructor(settings) {
    const {
      texture,
      size,
      dimensions,
      output,
      context,
      type = 'NumberTexture',
      kernel,
    } = settings;
    if (!output) throw new Error('settings property "output" required.');
    if (!context) throw new Error('settings property "context" required.');
    this.texture = texture;
    this.size = size;
    this.dimensions = dimensions;
    this.output = output;
    this.context = context;
    this.kernel = kernel;
    this.type = type;
  }

  /**
   * @desc Converts the Texture into a JavaScript Array
   * @returns {TextureArrayOutput}
   */
  toArray() {
    throw new Error(`Not implemented on ${this.constructor.name}`);
  }

  /**
   * @desc Clones the Texture
   * @returns {Texture}
   */
  clone() {
    const kernel = this._getCloneKernel();
    kernel.run(this);
    return kernel.renderOutput();
  }

  /**
   *
   * @return {IDirectKernelSettings}
   * @private
   */
  _getCloneKernelSettings() {
    const { output, context, kernel } = this;
    return {
      argumentTypes: [this.type],
      dynamicOutput: true,
      dynamicArguments: true,
      pipeline: true,
      precision: kernel.precision,
      tactic: kernel.tactic,
      output,
      context,
    };
  }

  _getCloneKernelKey() {
    const { kernel, type } = this;
    return `${kernel.constructor.name}-${kernel.precision}-${kernel.tactic}-${type}`;
  }

  /**
   * Get clone kernel
   * @return {Kernel}
   * @private
   */
  _getCloneKernel() {
    const { output } = this;
    const key = this._getCloneKernelKey();

    switch (output.length) {
      case 1:
        return clone1DKernels[key] = this._checkBuildCloneKernel(cloneKernel1DSource, clone1DKernels[key]);
      case 2:
        return clone2DKernels[key] = this._checkBuildCloneKernel(cloneKernel2DSource, clone2DKernels[key]);
      case 3:
        return clone3DKernels[key] = this._checkBuildCloneKernel(cloneKernel3DSource, clone3DKernels[key]);
      default:
        throw new Error(`Cannot copy texture with ${output.length} dimensions`);
    }
  }

  /**
   *
   * Return existing or instantiate and build clone kernel
   * @param {string} source
   * @param {Kernel} [cloneKernel]
   * @return {Kernel}
   * @private
   */
  _checkBuildCloneKernel(source, cloneKernel) {
    if (cloneKernel && cloneKernel.context === this.context) {
      return cloneKernel.setOutput(this.output);
    }
    cloneKernel = new this.kernel.constructor(source, this._getCloneKernelSettings());
    cloneKernel.build(this);
    return cloneKernel;
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