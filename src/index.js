export { GPU } from './gpu';
export { alias } from './alias';
export { utils } from './utils';
export { Input, input } from './input';
export { Texture } from './texture';
export { FunctionBuilder } from './backend/function-builder';
export { FunctionNode } from './backend/function-node';
export { CPUFunctionNode } from './backend/cpu/function-node';
export { CPUKernel } from './backend/cpu/kernel';

export { HeadlessGLKernel } from './backend/headless-gl/kernel';

export { WebGLFunctionNode } from './backend/web-gl/function-node';
export { WebGLKernel } from './backend/web-gl/kernel';
export { kernelValueMaps as webGLKernelValueMaps } from './backend/web-gl/kernel-value-maps';

export { WebGL2FunctionNode } from './backend/web-gl2/function-node';
export { WebGL2Kernel } from './backend/web-gl2/kernel';
export { kernelValueMaps as webGL2KernelValueMaps } from './backend/web-gl2/kernel-value-maps';

export { GLKernel } from './backend/gl/kernel';

export { Kernel } from './backend/kernel';

export { FunctionTracer } from './backend/function-tracer';

import mathRandom from './plugins/math-random-uniformly-distributed';

export const plugins = {
  mathRandom,
};

import { setupNode } from './gpu';
import { HeadlessGLKernel } from './backend/headless-gl/kernel';

setupNode(HeadlessGLKernel);
