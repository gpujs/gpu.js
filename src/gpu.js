import { GPU as BaseGPU } from './base-gpu';
import { HeadlessGLKernel } from './backend/headless-gl/kernel';
import { CPUKernel } from './backend/cpu/kernel';

/**
 * Extends the BaseGPU class to cover HeadlessGL instead of WebGL.
 */
export class GPU extends BaseGPU {
  static get isGPUSupported() {
    return HeadlessGLKernel.isSupported;
  }

  static get isKernelMapSupported() {
    return HeadlessGLKernel.isSupported && HeadlessGLKernel.features.kernelMap;
  }

  static get isSinglePrecisionSupported() {
    return HeadlessGLKernel.isSupported
      && HeadlessGLKernel.features.isFloatRead
      && HeadlessGLKernel.features.isTextureFloat;
  }

  static get isWebGLSupported() {
    return false;
  }

  static get isWebGL2Supported() {
    return false;
  }

  static get isHeadlessGLSupported() {
    return HeadlessGLKernel.isSupported;
  }

  static get isGPUHTMLImageArraySupported() {
    return false;
  }

  chooseKernel() {
    if (this.Kernel) return;

    let Kernel = null;

    if (this.context) {
      if (HeadlessGLKernel.isContextMatch(this.context)) {
        if (!HeadlessGLKernel.isSupported) {
          throw new Error(`Kernel type ${HeadlessGLKernel.name} not supported`);
        }
        Kernel = HeadlessGLKernel;
      }
      if (Kernel === null) {
        throw new Error('unknown Context');
      }
    } else if (this.mode) {
      if (this.mode === 'headlessgl') {
        if (!this.getValidate() || HeadlessGLKernel.isSupported) {
          Kernel = HeadlessGLKernel;
        }
      } else if (this.mode === 'gpu') {
        if (HeadlessGLKernel.isSupported) {
          Kernel = HeadlessGLKernel;
        }
      } else if (this.mode === 'cpu') {
        Kernel = CPUKernel;
      }

      if (!Kernel) {
        throw new Error(`A requested mode of "${this.mode}" and is not supported`);
      }
    } else {
      Kernel = HeadlessGLKernel.isSupported ? HeadlessGLKernel : CPUKernel;
    }

    if (!this.mode) {
      this.mode = Kernel.mode;
    }
    this.Kernel = Kernel;
  }


};
