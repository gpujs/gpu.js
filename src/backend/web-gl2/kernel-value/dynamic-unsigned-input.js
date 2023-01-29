import { utils } from '../../../utils';
import { WebGLKernelValueDynamicUnsignedInput } from '../../web-gl/kernel-value/dynamic-unsigned-input';

export class WebGL2KernelValueDynamicUnsignedInput extends WebGLKernelValueDynamicUnsignedInput {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([`uniform ${variablePrecision} sampler2D ${this.id}`, `uniform ${variablePrecision} ivec2 ${this.sizeId}`, `uniform ${variablePrecision} ivec3 ${this.dimensionsId}`]);
  }
}
