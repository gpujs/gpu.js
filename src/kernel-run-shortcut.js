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
        if (kernel.switchingKernels) {
          kernel.switchingKernels = false;
          return kernel.onRequestSwitchKernel(arguments, kernel);
        }
        return kernel.renderKernels();
      };
    } else if (kernel.renderOutput) {
      run = function() {
        kernel.run.apply(kernel, arguments);
        if (kernel.switchingKernels) {
          kernel.switchingKernels = false;
          return kernel.onRequestSwitchKernel(arguments, kernel);
        }
        return kernel.renderOutput();
      };
    } else {
      run = function() {
        return kernel.run.apply(kernel, arguments);
      };
    }
    return run.apply(kernel, arguments);
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
    bindKernelToShortcut(kernel, shortcut);
    shortcut.kernel = kernel;
  };

  bindKernelToShortcut(kernel, shortcut);
  shortcut.kernel = kernel;
  return shortcut;
}

function bindKernelToShortcut(kernel, shortcut) {
  const properties = utils.allPropertiesOf(kernel);
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    if (property[0] === '_' && property[1] === '_') continue;
    if (typeof kernel[property] === 'function') {
      if (property.substring(0, 3) === 'add' || property.substring(0, 3) === 'set') {
        shortcut[property] = function() {
          kernel[property].apply(kernel, arguments);
          return shortcut;
        };
      } else {
        if (property === 'toString') {
          shortcut.toString = function() {
            return kernel.toString.apply(kernel, arguments);
          };
        } else {
          shortcut[property] = kernel[property].bind(kernel);
        }
      }
    } else {
      shortcut.__defineGetter__(property, () => {
        return kernel[property];
      });
      shortcut.__defineSetter__(property, (value) => {
        kernel[property] = value;
      });
    }
  }
}
module.exports = {
  kernelRunShortcut
};