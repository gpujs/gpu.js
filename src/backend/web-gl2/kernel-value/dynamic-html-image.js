import { utils } from '../../../utils';
import { WebGLKernelValueDynamicHTMLImage } from '../../web-gl/kernel-value/dynamic-html-image';

export class WebGL2KernelValueDynamicHTMLImage extends WebGLKernelValueDynamicHTMLImage {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${variablePrecision} sampler2D ${this.id}`,
      `uniform ${variablePrecision} ivec2 ${this.sizeId}`,
      `uniform ${variablePrecision} ivec3 ${this.dimensionsId}`,
    ]);
  }
}
