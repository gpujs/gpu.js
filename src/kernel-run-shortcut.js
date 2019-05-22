const { utils } = require('./utils');

/**
 * Makes kernels easier for mortals (including me)
 * @param kernel
 * @returns {function()}
 */
function kernelRunShortcut(kernel) {
  let run = function() {
    kernel.build.apply(kernel, arguments);
    if (kernel.renderKernels) {
      run = function() {
        kernel.run.apply(kernel, arguments);
        kernel.run.apply(kernel, arguments);
        if (kernel.switchingKernels) {
          kernel.switchingKernels = false;
          return kernel.onRequestSwitchKernel(arguments, kernel);
        }
        return kernel.renderKernels();
      };
      kernel.run.apply(kernel, arguments);
      return kernel.renderKernels();
    } else if (kernel.renderOutput) {
      run = function() {
        kernel.run.apply(kernel, arguments);
        if (kernel.switchingKernels) {
          kernel.switchingKernels = false;
          return kernel.onRequestSwitchKernel(arguments, kernel);
        }
        return kernel.renderOutput();
      };
      kernel.run.apply(kernel, arguments);
      return kernel.renderOutput();
    } else {
      run = function() {
        return kernel.run.apply(kernel, arguments);
      };
      return kernel.run.apply(kernel, arguments);
    }
  };
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
  };

  utils
    .allPropertiesOf(kernel)
    .forEach((key) => {
      if (key[0] === '_' && key[1] === '_') return;
      if (typeof kernel[key] === 'function') {
        if (key.substring(0, 3) === 'add' || key.substring(0, 3) === 'set') {
          shortcut[key] = function() {
            kernel[key].apply(kernel, arguments);
            return shortcut;
          };
        } else if (key === 'requestFallback') {
          const requestFallback = kernel[key].bind(kernel);
          shortcut[key] = () => {
            kernel = requestFallback();
          };
        } else {
          shortcut[key] = kernel[key].bind(kernel);
        }
      } else {
        shortcut.__defineGetter__(key, () => {
          return kernel[key];
        });
        shortcut.__defineSetter__(key, (value) => {
          kernel[key] = value;
        });
      }
    });

  shortcut.kernel = kernel;

  return shortcut;
}

module.exports = {
  kernelRunShortcut
};