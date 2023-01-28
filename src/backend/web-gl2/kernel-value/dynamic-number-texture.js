import { utils } from '../../../utils';
import { WebGLKernelValueDynamicNumberTexture } from '../../web-gl/kernel-value/dynamic-number-texture';

export class WebGL2KernelValueDynamicNumberTexture extends WebGLKernelValueDynamicNumberTexture {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2D ${this.id}`,
      `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
      `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
    ]);
  }
}
