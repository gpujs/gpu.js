import { utils } from '../../../utils';
import { WebGLKernelValueDynamicUnsignedArray } from '../../web-gl/kernel-value/dynamic-unsigned-array';

export class WebGL2KernelValueDynamicUnsignedArray extends WebGLKernelValueDynamicUnsignedArray {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([`uniform ${variablePrecision} sampler2D ${this.id}`, `uniform ${variablePrecision} ivec2 ${this.sizeId}`, `uniform ${variablePrecision} ivec3 ${this.dimensionsId}`]);
  }
}
