const {
	utils
} = require('../../utils');
const {
	kernelRunShortcut
} = require('../../kernel-run-shortcut');

function removeFnNoise(fn) {
	if (/^function /.test(fn)) {
		fn = fn.substring(9);
	}
	return fn.replace(/[_]typeof/g, 'typeof');
}

function removeNoise(str) {
	return str
		.replace(/^[A-Za-z]+/, 'function')
		.replace(/[_]typeof/g, 'typeof');
}

function cpuKernelString(cpuKernel, name) {
	return `() => {
    ${ kernelRunShortcut.toString() };
    const utils = {
      allPropertiesOf: ${ removeNoise(utils.allPropertiesOf.toString()) },
      clone: ${ removeNoise(utils.clone.toString()) },
    };
    let Input = function() {};
    class ${ name || 'Kernel' } {
      constructor() {        
        this.argumentsLength = 0;
        this.canvas = null;
        this.context = null;
        this.built = false;
        this.program = null;
        this.argumentNames = ${ JSON.stringify(cpuKernel.argumentNames) };
        this.argumentTypes = ${ JSON.stringify(cpuKernel.argumentTypes) };
        this.argumentSizes = ${ JSON.stringify(cpuKernel.argumentSizes) };
        this.output = ${ JSON.stringify(cpuKernel.output) };
        this._kernelString = \`${ cpuKernel._kernelString }\`;
        this.output = ${ JSON.stringify(cpuKernel.output) };
		    this.run = function() {
          this.run = null;
          this.build(arguments);
          return this.run.apply(this, arguments);
        }.bind(this);
        this.thread = {
          x: 0,
          y: 0,
          z: 0
        };
      }
      setCanvas(canvas) { this.canvas = canvas; return this; }
      setContext(context) { this.context = context; return this; }
      setInput(Type) { Input = Type; }
      ${ removeFnNoise(cpuKernel.build.toString()) }
      setupArguments() {}
      ${ removeFnNoise(cpuKernel.setupConstants.toString()) }
      translateSource() {}
      pickRenderStrategy() {}
      run () { ${ cpuKernel.kernelString } }
      getKernelString() { return this._kernelString; }
      ${ removeFnNoise(cpuKernel.validateSettings.toString()) }
      ${ removeFnNoise(cpuKernel.checkOutput.toString()) }
    };
    return kernelRunShortcut(new Kernel());
  };`;
}

module.exports = {
	cpuKernelString
};