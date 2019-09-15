import { utils } from '../../../utils';
import { WebGLKernelValueSingleArray2DI } from '../../web-gl/kernel-value/single-array2d-i';

export class WebGL2KernelValueSingleArray2DI extends WebGLKernelValueSingleArray2DI {
  updateValue(value) {
    if (value.constructor !== this.initialValueConstructor) {
      this.onUpdateValueMismatch();
      return;
    }
    const { context: gl } = this;
    utils.flattenTo(value, this.uploadValue);
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
    this.kernel.setUniform1i(this.id, this.index);
  }
}
