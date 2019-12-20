const { utils } = require('../../../utils');
const { WebGLKernelValue } = require('./index');

class WebGLKernelValueNumberTexture extends WebGLKernelValue {
  constructor(value, settings) {
    super(value, settings);
    const [width, height] = value.size;
    this.checkSize(width, height);
    this.setupTexture();
    const { size: textureSize, dimensions } = value;
    this.bitRatio = this.getBitRatio(value);
    this.dimensions = dimensions;
    this.textureSize = textureSize;
    this.uploadValue = value.texture;
    this.forceUploadEachRun = true;
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

  updateValue(inputTexture) {
    const { kernel, context: gl } = this;
    if (inputTexture.constructor !== this.initialValueConstructor) {
      this.onUpdateValueMismatch(inputTexture.constructor);
      return;
    }
    if (this.checkContext && inputTexture.context !== this.context) {
      throw new Error(`Value ${this.name} (${this.type}) must be from same context`);
    }

    if (kernel.pipeline) {
      if (kernel.texture.texture === inputTexture.texture) {
        const { prevInput } = kernel;
        if (prevInput) {
          if (prevInput.texture.refs === 1) {
            if (kernel.texture) {
              kernel.texture.delete();
              kernel.texture = prevInput.clone();
            }
          }
          prevInput.delete();
        }
        kernel.prevInput = inputTexture.clone();
      } else if (kernel.mappedTextures && kernel.mappedTextures.length > 0) {
        const { mappedTextures, prevMappedInputs } = kernel;
        for (let i = 0; i < mappedTextures.length; i++) {
          const mappedTexture = mappedTextures[i];
          if (mappedTexture.texture === inputTexture.texture) {
            const prevMappedInput = prevMappedInputs[i];
            if (prevMappedInput) {
              if (prevMappedInput.texture.refs === 1) {
                if (mappedTexture) {
                  mappedTexture.delete();
                  mappedTextures[i] = prevMappedInput.clone();
                }
              }
              prevMappedInput.delete();
            }
            debugger;
            prevMappedInputs[i] = inputTexture.clone();
            break;
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
  WebGLKernelValueNumberTexture
};