import { GPU } from './base-gpu';
import { alias } from './alias';
import { utils } from './utils';
import * as common from './common';
import { Input, input } from './input';
import { Texture } from './texture';
import { FunctionBuilder } from './backend/function-builder';
import { FunctionNode } from './backend/function-node';
import { CPUFunctionNode } from './backend/cpu/function-node';
import { CPUKernel } from './backend/cpu/kernel';
import { WebGLFunctionNode } from './backend/web-gl/function-node';
import { WebGLKernel } from './backend/web-gl/kernel';
import { WebGL2FunctionNode } from './backend/web-gl2/function-node';
import { WebGL2Kernel } from './backend/web-gl2/kernel';
import { GLKernel } from './backend/gl/kernel';
import { Kernel } from './backend/kernel';

/**
 * Stub for HeadlessGL.
 */
class HeadlessGLKernel extends WebGLKernel {
  static get isSupported() { return false }
  static isContextMatch() { return false }
  static getIsTextureFloat() { return false }
  static getIsDrawBuffers() { return false }
  static getChannelCount() { return 1 }
  static get testCanvas() { return null }
  static get testContext() { return null }
  static get features() { return null }
  static setupFeatureChecks() {}
  static destroyContext() {}
  initCanvas() { return {} }
  initContext() { return null }
  toString() { return '' }
  initExtensions() {}
  build() {}
  destroyExtensions() {}
  setOutput() {}

  static getFeatures() {
    return Object.freeze({
      isFloatRead: false,
      isIntegerDivisionAccurate: false,
      isTextureFloat: false,
      isDrawBuffers: false,
      kernelMap: false,
      channelCount: 1,
    });
  }
};

const lib = GPU;
lib.alias = alias;
lib.CPUFunctionNode = CPUFunctionNode;
lib.CPUKernel = CPUKernel;
lib.FunctionBuilder = FunctionBuilder;
lib.FunctionNode = FunctionNode;
lib.HeadlessGLKernel = HeadlessGLKernel;
lib.Input = Input;
lib.input = input;
lib.Texture = Texture;
lib.utils = { ...common, ...utils };
lib.WebGL2FunctionNode = WebGL2FunctionNode;
lib.WebGL2Kernel = WebGL2Kernel;
lib.WebGLFunctionNode = WebGLFunctionNode;
lib.WebGLKernel = WebGLKernel;
lib.GLKernel = GLKernel;
lib.Kernel = Kernel;

export default lib;
