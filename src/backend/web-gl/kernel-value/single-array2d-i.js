const { utils } = require('../../../utils');
const { WebGLKernelValue } = require('./index');

class WebGLKernelValueSingleArray2DI extends WebGLKernelValue {
  constructor(value, settings) {
    super(value, settings);
    this.requestTexture();
    this.bitRatio = 4;
    this.setShape(value);
  }

  setShape(value) {
    const valueDimensions = utils.getDimensions(value, true);
    this.textureSize = utils.getMemoryOptimizedFloatTextureSize(valueDimensions, this.bitRatio);
    this.dimensions = new Int32Array([valueDimensions[1], valueDimensions[2], 1]);
    this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
    this.checkSize(this.textureSize[0] * this.bitRatio, this.textureSize[1] * this.bitRatio);
    this.uploadValue = new Float32Array(this.uploadArrayLength);
  }

  getStringValueHandler() {
    return utils.linesToString([
      `const uploadValue_${this.name} = new Float32Array(${this.uploadArrayLength})`,
      `flattenTo(${this.varName}, uploadValue_${this.name})`,
    ]);
  }

  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }

  updateValue(value) {
    if (value.constructor !== this.initialValueConstructor) {
      this.onUpdateValueMismatch();
      return;
    }
    const { context: gl } = this;
    utils.flatten3dArrayTo(value, this.uploadValue);
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGLKernelValueSingleArray2DI
};