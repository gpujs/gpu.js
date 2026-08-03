const { utils } = require('./utils');
const { Input } = require('./input');
const { getActiveTrace } = require('./pipeline');

/**
 * Makes kernels easier for mortals (including me)
 * @param kernel
 * @returns {function()}
 */
function kernelRunShortcut(kernel) {
  // A switch can legitimately cascade (an argument type change that also
  // changes the output precision), but it must terminate: a kernel that keeps
  // asking to switch would otherwise fall through with no result at all, and
  // the GL backends answer that with whatever is still in the framebuffer --
  // silently, the previous call's values.
  const MAX_SWITCHES = 4;

  function syncBody(args) {
    // build() is guarded on kernel.built across every backend, so calling it
    // per run costs one boolean check and stays correct through replaceKernel
    kernel.build.apply(kernel, args);
    kernel.checkArgumentTypes(args);
    let result = kernel.switchingKernels ? undefined : kernel.run.apply(kernel, args);
    for (let i = 0; kernel.switchingKernels; i++) {
      if (i >= MAX_SWITCHES) {
        const reasons = kernel.resetSwitchingKernels();
        throw new Error(
          `this kernel cannot run the arguments it was given (${ describeReasons(reasons) }); ` +
          `it did not settle on a kernel for them after ${ MAX_SWITCHES } attempts. ` +
          `Create a separate kernel for this call's argument types.`);
      }
      const reasons = kernel.resetSwitchingKernels();
      const newKernel = kernel.onRequestSwitchKernel(reasons, args, kernel);
      shortcut.kernel = kernel = newKernel;
      newKernel.checkArgumentTypes(args);
      result = newKernel.switchingKernels ? undefined : newKernel.run.apply(newKernel, args);
      if (newKernel.fallbackRequested) {
        // the switched kernel degraded at build: the fallback already
        // replaced the shortcut's kernel (the closure variable), but this
        // loop ran the pre-replacement kernel, whose run() reports null on
        // fallback -- the replacement holds the real result path
        result = kernel.run.apply(kernel, args);
      }
    }
    return result;
  }

  function describeReasons(reasons) {
    if (!reasons || !reasons.length) return 'unknown reason';
    return reasons.map(reason => {
      if (reason.type === 'argumentTypeMismatch') {
        return `argument ${ reason.index } is now ${ reason.needed }`;
      }
      return reason.type;
    }).join(', ');
  }

  function syncRun(args) {
    const result = syncBody(args);
    if (kernel.renderKernels) {
      return kernel.renderKernels();
    } else if (kernel.renderOutput) {
      return kernel.renderOutput();
    } else {
      return result;
    }
  }

  // The async contract must not change WHEN arguments are read: every path
  // below either executes synchronously at call time (deferring only the
  // readback) or snapshots mutable arguments before its first await, so
  // `const p = k(buf); buf[0] = 9;` still computes on the value buf held at
  // the call, exactly like the sync contract.
  function asyncRun(args) {
    // mode 'async' upgrade opportunity, consumed exactly once: the adapter
    // probe and the webgpu kernel's full async build resolve before anything
    // on the proven kernel is built. Arguments are snapshotted across the
    // probe. The hook only ever returns a kernel whose build succeeded, so
    // there is no failed-first-run fallback to mask errors with; a declined
    // upgrade logs its reason under debug inside the hook.
    if (kernel.onAsyncModeUpgrade) {
      const upgrade = kernel.onAsyncModeUpgrade;
      kernel.onAsyncModeUpgrade = null;
      const snapped = snapshotArguments(args);
      return upgrade(snapped, kernel).then(upgradedKernel => {
        if (upgradedKernel) {
          shortcut.replaceKernel(upgradedKernel);
        }
        return asyncRun(snapped);
      });
    }
    try {
      if (kernel.constructor.isAsync === true) {
        // natively async: run() snapshots its arguments synchronously before
        // any internal await
        kernel.build.apply(kernel, args);
        return Promise.resolve(kernel.run.apply(kernel, args));
      }
      // a webgpu pipeline handle can reach a GL/CPU kernel under mode
      // 'async' when the producer upgraded and this kernel declined; the
      // async contract already owns this call, so read the handle back and
      // feed the values through
      for (let i = 0; i < args.length; i++) {
        if (isWebGPUHandle(args[i])) {
          return resolveHandles(args).then(resolved => asyncRun(resolved));
        }
      }
      const result = syncBody(args);
      if (kernel.renderKernels) {
        // no non-blocking path for mapped outputs yet; resolving the
        // synchronous read keeps the contract uniform
        return Promise.resolve(kernel.renderKernels());
      } else if (kernel.renderOutput) {
        if (kernel.renderOutputAsync) {
          return kernel.renderOutputAsync();
        }
        return Promise.resolve(kernel.renderOutput());
      } else {
        return Promise.resolve(result);
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }

  function isWebGPUHandle(value) {
    return Boolean(value) && value.type === 'WebGPUBuffer';
  }

  function resolveHandles(args) {
    // the handle readback forces an await, so mutable arguments are
    // snapshotted first to keep call-time sampling
    const snapped = snapshotArguments(args);
    const pending = [];
    for (let i = 0; i < snapped.length; i++) {
      if (isWebGPUHandle(snapped[i])) {
        const index = i;
        pending.push(Promise.resolve(snapped[index].toArray()).then(value => {
          snapped[index] = value;
        }));
      }
    }
    return Promise.all(pending).then(() => snapped);
  }

  function snapshotArguments(args) {
    const copy = new Array(args.length);
    for (let i = 0; i < args.length; i++) {
      copy[i] = snapshotValue(args[i]);
    }
    return copy;
  }

  function snapshotValue(value) {
    if (!value || typeof value !== 'object') return value;
    // GPU-resident values cannot be mutated from JS between now and the run
    if (isWebGPUHandle(value) || typeof value.delete === 'function') return value;
    if (ArrayBuffer.isView(value)) return value.slice(0);
    if (Array.isArray(value)) return value.map(snapshotValue);
    if (value instanceof Input) return new Input(snapshotValue(value.value), value.size);
    // canvases, images, videos: sampled when uploaded, nothing to copy
    return value;
  }

  function run() {
    // an open pipeline trace owns every kernel call made under it: the call
    // is recorded into the plan and answered with a handle instead of
    // executing (src/pipeline.js); traces are synchronous, so no user run
    // can be misrecorded
    const trace = getActiveTrace();
    if (trace) {
      return trace.recordKernelCall(shortcut, arguments);
    }
    if (kernel.constructor.isAsync === true || kernel.asyncMode === true) {
      return asyncRun(arguments);
    }
    return syncRun(arguments);
  }
  const shortcut = function() {
    return run.apply(kernel, arguments);
  };
  /**
   * Run kernel in async mode
   * @returns {Promise<KernelOutput>}
   */
  shortcut.exec = function() {
    return new Promise((accept, reject) => {
      try {
        accept(run.apply(this, arguments));
      } catch (e) {
        reject(e);
      }
    });
  };
  shortcut.replaceKernel = function(replacementKernel) {
    kernel = replacementKernel;
    bindKernelToShortcut(kernel, shortcut);
  };

  bindKernelToShortcut(kernel, shortcut);
  return shortcut;
}

function bindKernelToShortcut(kernel, shortcut) {
  if (shortcut.kernel) {
    shortcut.kernel = kernel;
    return;
  }
  const properties = utils.allPropertiesOf(kernel);
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    if (property[0] === '_' && property[1] === '_') continue;
    if (typeof kernel[property] === 'function') {
      if (property.substring(0, 3) === 'add' || property.substring(0, 3) === 'set') {
        shortcut[property] = function() {
          shortcut.kernel[property].apply(shortcut.kernel, arguments);
          return shortcut;
        };
      } else {
        shortcut[property] = function() {
          return shortcut.kernel[property].apply(shortcut.kernel, arguments);
        };
      }
    } else {
      shortcut.__defineGetter__(property, () => shortcut.kernel[property]);
      shortcut.__defineSetter__(property, (value) => {
        shortcut.kernel[property] = value;
      });
    }
  }
  shortcut.kernel = kernel;
}
module.exports = {
  kernelRunShortcut
};