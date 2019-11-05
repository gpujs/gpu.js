const getContext = require('gl');
const { WebGLKernel } = require('../web-gl/kernel');
const { glKernelString } = require('../gl/kernel-string');

let isSupported = null;
let testCanvas = null;
let testContext = null;
let testExtensions = null;
let features = null;

class HeadlessGLKernel extends WebGLKernel {
  static get isSupported() {
    if (isSupported !== null) return isSupported;
    this.setupFeatureChecks();
    isSupported = testContext !== null;
    return isSupported;
  }

  static setupFeatureChecks() {
    testCanvas = null;
    testExtensions = null;
    if (typeof getContext !== 'function') return;
    try { // just in case, edge cases
      testContext = getContext(2, 2, {
        preserveDrawingBuffer: true
      });
      if (!testContext || !testContext.getExtension) return;
      testExtensions = {
        STACKGL_resize_drawingbuffer: testContext.getExtension('STACKGL_resize_drawingbuffer'),
        STACKGL_destroy_context: testContext.getExtension('STACKGL_destroy_context'),
        OES_texture_float: testContext.getExtension('OES_texture_float'),
        OES_texture_float_linear: testContext.getExtension('OES_texture_float_linear'),
        OES_element_index_uint: testContext.getExtension('OES_element_index_uint'),
        WEBGL_draw_buffers: testContext.getExtension('WEBGL_draw_buffers'),
      };
      features = this.getFeatures();
    } catch (e) {
      console.warn(e);
    }
  }

  static isContextMatch(context) {
    try {
      return context.getParameter(context.RENDERER) === 'ANGLE';
    } catch (e) {
      return false;
    }
  }

  static getFeatures() {
    const isDrawBuffers = this.getIsDrawBuffers();
    return Object.freeze({
      isFloatRead: this.getIsFloatRead(),
      isIntegerDivisionAccurate: this.getIsIntegerDivisionAccurate(),
      isTextureFloat: this.getIsTextureFloat(),
      isDrawBuffers,
      kernelMap: isDrawBuffers,
      channelCount: this.getChannelCount(),
      maxTextureSize: this.getMaxTextureSize(),
    });
  }

  static getIsTextureFloat() {
    return Boolean(testExtensions.OES_texture_float);
  }

  static getIsDrawBuffers() {
    return Boolean(testExtensions.WEBGL_draw_buffers);
  }

  static getChannelCount() {
    return testExtensions.WEBGL_draw_buffers ?
      testContext.getParameter(testExtensions.WEBGL_draw_buffers.MAX_DRAW_BUFFERS_WEBGL) :
      1;
  }

  static getMaxTextureSize() {
    return testContext.getParameter(testContext.MAX_TEXTURE_SIZE);
  }

  static get testCanvas() {
    return testCanvas;
  }

  static get testContext() {
    return testContext;
  }

  static get features() {
    return features;
  }

  initCanvas() {
    return {};
  }

  initContext() {
    return getContext(2, 2, {
      preserveDrawingBuffer: true
    });
  }

  initExtensions() {
    this.extensions = {
      STACKGL_resize_drawingbuffer: this.context.getExtension('STACKGL_resize_drawingbuffer'),
      STACKGL_destroy_context: this.context.getExtension('STACKGL_destroy_context'),
      OES_texture_float: this.context.getExtension('OES_texture_float'),
      OES_texture_float_linear: this.context.getExtension('OES_texture_float_linear'),
      OES_element_index_uint: this.context.getExtension('OES_element_index_uint'),
      WEBGL_draw_buffers: this.context.getExtension('WEBGL_draw_buffers'),
    };
  }

  build() {
    super.build.apply(this, arguments);
    if (!this.fallbackRequested) {
      this.extensions.STACKGL_resize_drawingbuffer.resize(this.maxTexSize[0], this.maxTexSize[1]);
    }
  }

  destroyExtensions() {
    this.extensions.STACKGL_resize_drawingbuffer = null;
    this.extensions.STACKGL_destroy_context = null;
    this.extensions.OES_texture_float = null;
    this.extensions.OES_texture_float_linear = null;
    this.extensions.OES_element_index_uint = null;
    this.extensions.WEBGL_draw_buffers = null;
  }

  static destroyContext(context) {
    const extension = context.getExtension('STACKGL_destroy_context');
    if (extension && extension.destroy) {
      extension.destroy();
    }
  }

  /**
   * @desc Returns the *pre-compiled* Kernel as a JS Object String, that can be reused.
   */
  toString() {
    const setupContextString = `const gl = context || require('gl')(1, 1);\n`;
    const destroyContextString = `    if (!context) { gl.getExtension('STACKGL_destroy_context').destroy(); }\n`;
    return glKernelString(this.constructor, arguments, this, setupContextString, destroyContextString);
  }

  setOutput(output) {
    super.setOutput(output);
    if (this.graphical && this.extensions.STACKGL_resize_drawingbuffer) {
      this.extensions.STACKGL_resize_drawingbuffer.resize(this.maxTexSize[0], this.maxTexSize[1]);
    }
    return this;
  }
}

module.exports = {
  HeadlessGLKernel
};