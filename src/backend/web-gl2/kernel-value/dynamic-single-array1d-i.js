import { utils } from '../../../utils';
import { WebGL2KernelValueSingleArray1DI } from '../../web-gl2/kernel-value/single-array1d-i';

export class WebGL2KernelValueDynamicSingleArray1DI extends WebGL2KernelValueSingleArray1DI {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${variablePrecision} sampler2D ${this.id}`,
      `uniform ${variablePrecision} ivec2 ${this.sizeId}`,
      `uniform ${variablePrecision} ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(value) {
    this.setShape(value);
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(value);
  }
}
