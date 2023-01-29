import { GPU } from './gpu';
import { alias } from './alias';
import { utils } from './utils';
import { Input, input } from './input';
import { Texture } from './texture';
import { FunctionBuilder } from './backend/function-builder';
import { FunctionNode } from './backend/function-node';
import { CPUFunctionNode } from './backend/cpu/function-node';
import { CPUKernel } from './backend/cpu/kernel';

import { WebGLFunctionNode } from './backend/web-gl/function-node';
import { WebGLKernel } from './backend/web-gl/kernel';
import { kernelValueMaps as webGLKernelValueMaps } from './backend/web-gl/kernel-value-maps';

import { WebGL2FunctionNode } from './backend/web-gl2/function-node';
import { WebGL2Kernel } from './backend/web-gl2/kernel';
import { kernelValueMaps as webGL2KernelValueMaps } from './backend/web-gl2/kernel-value-maps';

import { Kernel } from './backend/kernel';

import { FunctionTracer } from './backend/function-tracer';

import mathRandom from './plugins/math-random-uniformly-distributed';

GPU.alias = alias;
GPU.utils = utils;
GPU.Input = Input;
GPU.input = input;
GPU.Texture = Texture;
GPU.FunctionBuilder = FunctionBuilder;
GPU.FunctionNode = FunctionNode;
GPU.CPUFunctionNode = CPUFunctionNode;
GPU.CPUKernel = CPUKernel;

GPU.WebGLFunctionNode = WebGLFunctionNode;
GPU.WebGLKernel = WebGLKernel;
GPU.webGLKernelValueMaps = webGLKernelValueMaps;

GPU.WebGL2FunctionNode = WebGL2FunctionNode;
GPU.WebGL2Kernel = WebGL2Kernel;
GPU.webGL2KernelValueMaps = webGL2KernelValueMaps;

GPU.Kernel = Kernel;
GPU.FunctionTracer = FunctionTracer;

GPU.plugins = {
  mathRandom,
};

Object.defineProperties(GPU, {
  GLKernel: {
    get() {
      console.warn('The browser build does not support GLKernel');
      return CPUKernel;
    },
  },
  HeadlessGLKernel: {
    get() {
      console.warn('The browser build does not support HeadlessGLKernel');
      return CPUKernel;
    },
  },
});

export default GPU;
