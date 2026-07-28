/**
 * @desc Module-level WebGPU device singleton. One GPUDevice serves every
 * GPU instance in webgpu mode, the way all GL kernels share one context.
 * `acquire()` is idempotent and caches the in-flight promise; a failed
 * acquisition clears the cache so a later call can retry.
 */
let contextPromise = null;

class WebGPUContext {
  /**
   * Sync, optimistic: the API surface exists. `navigator.gpu` can be present
   * while `requestAdapter()` resolves null (headless Chromium does exactly
   * this), so a true here does not promise a kernel will run — that is what
   * `GPU.isWebGPUAvailable()` answers.
   * @returns {boolean}
   */
  static get isSupported() {
    return typeof navigator !== 'undefined' && !!navigator.gpu;
  }

  /**
   * @returns {Promise<{adapter: GPUAdapter, device: GPUDevice}>} cached and shared
   */
  static acquire() {
    if (contextPromise) return contextPromise;
    const promise = (async () => {
      if (!WebGPUContext.isSupported) {
        throw new Error('WebGPU is not supported on this platform (navigator.gpu is missing)');
      }
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        throw new Error(
          'WebGPU is present (navigator.gpu) but no adapter is available. ' +
          'On headless Chromium there is no adapter; run headed. ' +
          'Use `await GPU.isWebGPUAvailable()` to feature-detect.');
      }
      const device = await adapter.requestDevice();
      device.lost.then(info => {
        if (info.reason !== 'destroyed') {
          console.error(`gpu.js [webgpu]: device lost: ${ info.message }`);
        }
        if (contextPromise === promise) {
          contextPromise = null;
        }
      });
      device.onuncapturederror = e => {
        console.error(`gpu.js [webgpu]: ${ e.error.message }`);
      };
      return { adapter, device };
    })();
    promise.catch(() => {
      if (contextPromise === promise) {
        contextPromise = null;
      }
    });
    return contextPromise = promise;
  }

  /**
   * Destroys the shared device. `gpu.destroy()` does NOT call this — the
   * device outlives any one GPU instance; this is the page-level teardown.
   * @returns {Promise<void>}
   */
  static destroy() {
    if (!contextPromise) return Promise.resolve();
    const promise = contextPromise;
    contextPromise = null;
    return promise.then(({ device }) => {
      device.destroy();
    }, () => {});
  }
}

module.exports = {
  WebGPUContext
};