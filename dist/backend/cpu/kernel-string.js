'use strict';

var utils = require('../../utils');
var kernelRunShortcut = require('../../kernel-run-shortcut');

function removeFnNoise(fn) {
  if (/^function /.test(fn)) {
    fn = fn.substring(9);
  }
  return fn.replace(/[_]typeof/g, 'typeof');
}

function removeNoise(str) {
  return str.replace(/^[A-Za-z]+/, 'function').replace(/[_]typeof/g, 'typeof');
}

module.exports = function (cpuKernel, name) {
  return '() => {\n    ' + kernelRunShortcut.toString() + ';\n    const utils = {\n      allPropertiesOf: ' + removeNoise(utils.allPropertiesOf.toString()) + ',\n      clone: ' + removeNoise(utils.clone.toString()) + ',\n    };\n    const Utils = utils;\n    let Input = function() {};\n    class ' + (name || 'Kernel') + ' {\n      constructor() {        \n        this.argumentsLength = 0;\n        this.canvas = null;\n        this.context = null;\n        this.built = false;\n        this.program = null;\n        this.argumentNames = ' + JSON.stringify(cpuKernel.argumentNames) + ';\n        this.argumentTypes = ' + JSON.stringify(cpuKernel.argumentTypes) + ';\n        this.texSize = ' + JSON.stringify(cpuKernel.texSize) + ';\n        this.output = ' + JSON.stringify(cpuKernel.output) + ';\n        this._kernelString = `' + cpuKernel._kernelString + '`;\n        this.output = ' + JSON.stringify(cpuKernel.output) + ';\n\t\t    this.run = function() {\n          this.run = null;\n          this.build();\n          return this.run.apply(this, arguments);\n        }.bind(this);\n        this.thread = {\n          x: 0,\n          y: 0,\n          z: 0\n        };\n      }\n      setCanvas(canvas) { this.canvas = canvas; return this; }\n      setContext(context) { this.context = context; return this; }\n      setInput(Type) { Input = Type; }\n      ' + removeFnNoise(cpuKernel.build.toString()) + '\n      ' + removeFnNoise(cpuKernel.setupArguments.toString()) + '\n      ' + removeFnNoise(cpuKernel.setupConstants.toString()) + '\n      run () { ' + cpuKernel.kernelString + ' }\n      getKernelString() { return this._kernelString; }\n      ' + removeFnNoise(cpuKernel.validateSettings.toString()) + '\n      ' + removeFnNoise(cpuKernel.checkOutput.toString()) + '\n    };\n    return kernelRunShortcut(new Kernel());\n  };';
};