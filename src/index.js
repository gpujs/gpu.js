const { GPU } = require('./gpu');
const { alias } = require('./alias');
const { utils } = require('./utils');
const { Input, input } = require('./input');
const { Texture } = require('./texture');
const { FunctionBuilder } = require('./backend/function-builder');
const { FunctionNode } = require('./backend/function-node');
const { CPUFunctionNode } = require('./backend/cpu/function-node');
const { CPUKernel } = require('./backend/cpu/kernel');

const { HeadlessGLKernel } = require('./backend/headless-gl/kernel');

const { WebGLFunctionNode } = require('./backend/web-gl/function-node');
const { WebGLKernel } = require('./backend/web-gl/kernel');
const { kernelValueMaps: webGLKernelValueMaps } = require('./backend/web-gl/kernel-value-maps');

const { WebGL2FunctionNode } = require('./backend/web-gl2/function-node');
const { WebGL2Kernel } = require('./backend/web-gl2/kernel');
const { kernelValueMaps: webGL2KernelValueMaps } = require('./backend/web-gl2/kernel-value-maps');

const { GLKernel } = require('./backend/gl/kernel');

const { Kernel } = require('./backend/kernel');

const { FunctionTracer } = require('./backend/function-tracer');

const mathRandom = require('./plugins/math-random-uniformly-distributed');

module.exports = {
  alias,
  CPUFunctionNode,
  CPUKernel,
  GPU,
  FunctionBuilder,
  FunctionNode,
  HeadlessGLKernel,
  Input,
  input,
  Texture,
  utils,

  WebGL2FunctionNode,
  WebGL2Kernel,
  webGL2KernelValueMaps,

  WebGLFunctionNode,
  WebGLKernel,
  webGLKernelValueMaps,

  GLKernel,
  Kernel,
  FunctionTracer,

  plugins: {
    mathRandom
  }
};