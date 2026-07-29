const { utils } = require('./utils');

/**
 * Makes kernels easier for mortals (including me)
 * @param kernel
 * @returns {function()}
 */
function kernelRunShortcut(kernel) {
  function syncRun(args) {
    // build() is guarded on kernel.built across every backend, so calling it
    // per run costs one boolean check and stays correct through replaceKernel
    kernel.build.apply(kernel, args);
    let result = kernel.run.apply(kernel, args);
    if (kernel.switchingKernels) {
      const reasons = kernel.resetSwitchingKernels();
      const newKernel = kernel.onRequestSwitchKernel(reasons, args, kernel);
      shortcut.kernel = kernel = newKernel;
      result = newKernel.run.apply(newKernel, args);
    }
    if (kernel.renderKernels) {
      return kernel.renderKernels();
    } else if (kernel.renderOutput) {
      return kernel.renderOutput();
    } else {
      return result;
    }
  }

  function asyncRun(args) {
    return Promise.resolve().then(() => {
      // mode 'async' upgrade opportunity: the probe for a natively-async
      // backend resolves before anything on the proven kernel is built, and
      // runs at most once. If the upgraded kernel fails its first run, the
      // original kernel is still intact to retry on -- a genuine user error
      // fails there too and propagates from the backend that owns the mode.
      if (kernel.onAsyncModeUpgrade) {
        const upgrade = kernel.onAsyncModeUpgrade;
        const provenKernel = kernel;
        kernel.onAsyncModeUpgrade = null;
        return upgrade(args, kernel).then(upgradedKernel => {
          if (!upgradedKernel) return asyncRun(args);
          shortcut.replaceKernel(upgradedKernel);
          return asyncRun(args).catch(() => {
            shortcut.replaceKernel(provenKernel);
            return asyncRun(args);
          });
        });
      }
      if (kernel.constructor.isAsync === true) {
        kernel.build.apply(kernel, args);
        return kernel.run.apply(kernel, args);
      }
      kernel.build.apply(kernel, args);
      let result = kernel.run.apply(kernel, args);
      if (kernel.switchingKernels) {
        const reasons = kernel.resetSwitchingKernels();
        const newKernel = kernel.onRequestSwitchKernel(reasons, args, kernel);
        shortcut.kernel = kernel = newKernel;
        result = newKernel.run.apply(newKernel, args);
      }
      if (kernel.renderKernels) {
        // no non-blocking path for mapped outputs yet; resolving the
        // synchronous read keeps the contract uniform
        return kernel.renderKernels();
      } else if (kernel.renderOutput) {
        if (kernel.renderOutputAsync) {
          return kernel.renderOutputAsync();
        }
        return kernel.renderOutput();
      } else {
        return result;
      }
    });
  }

  function run() {
    // async backends (webgpu): build() stores its promise on the kernel and
    // run() chains on it, so run's Promise is the entire result channel —
    // none of the sync post-run machinery applies
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