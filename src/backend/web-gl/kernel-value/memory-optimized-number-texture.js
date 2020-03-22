const { utils } = require('../../../utils');
const { WebGLKernelArray } = require('./array');

const sameError = `Source and destination textures are the same.  Use immutable = true and manually cleanup kernel output texture memory with texture.delete()`;

class WebGLKernelValueMemoryOptimizedNumberTexture extends WebGLKernelArray {
  constructor(value, settings) {
    super(value, settings);
    const [width, height] = value.size;
    this.checkSize(width, height);
    this.dimensions = value.dimensions;
    this.textureSize = value.size;
    this.uploadValue = value.texture;
    this.forceUploadEachRun = true;
  }

  setup() {
    this.setupTexture();
  }

  getStringValueHandler() {
    return `const uploadValue_${this.name} = ${this.varName}.texture;\n`;
  }

  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }

  /**
   * @param {GLTextureMemoryOptimized} inputTexture
   */
  updateValue(inputTexture) {
    if (inputTexture.constructor !== this.initialValueConstructor) {
      this.onUpdateValueMismatch(inputTexture.constructor);
      return;
    }
    if (this.checkContext && inputTexture.context !== this.context) {
      throw new Error(`Value ${this.name} (${this.type}) must be from same context`);
    }

    const { kernel, context: gl } = this;
    if (kernel.pipeline) {
      if (kernel.immutable) {
        kernel.updateTextureArgumentRefs(this, inputTexture);
      } else {
        if (kernel.texture.texture === inputTexture.texture) {
          throw new Error(sameError);
        } else if (kernel.mappedTextures) {
          const { mappedTextures } = kernel;
          for (let i = 0; i < mappedTextures.length; i++) {
            if (mappedTextures[i].texture === inputTexture.texture) {
              throw new Error(sameError);
            }
          }
        }
      }
    }

    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.uploadValue = inputTexture.texture);
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGLKernelValueMemoryOptimizedNumberTexture,
  sameError
};