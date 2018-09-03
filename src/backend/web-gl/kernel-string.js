'use strict';

const utils = require('../../core/utils');
const kernelRunShortcut = require('../kernel-run-shortcut');

function removeFnNoise(fn) {
	if (/^function /.test(fn)) {
		fn = fn.substring(9);
	}
	return fn.replace(/[_]typeof/g, 'typeof');
}

function removeNoise(str) {
	return str.replace(/[_]typeof/g, 'typeof');
}

module.exports = function(gpuKernel, name) {
	return `() => {
    ${ kernelRunShortcut.toString() };
    const utils = {
      allPropertiesOf: ${ removeNoise(utils.allPropertiesOf.toString()) },
      clone: ${ removeNoise(utils.clone.toString()) },
      splitArray: ${ removeNoise(utils.splitArray.toString()) },
      getArgumentType: ${ removeNoise(utils.getArgumentType.toString()) },
      getDimensions: ${ removeNoise(utils.getDimensions.toString()) },
      dimToTexSize: ${ removeNoise(utils.dimToTexSize.toString()) },
      flattenTo: ${ removeNoise(utils.flattenTo.toString()) },
      flatten2dArrayTo: ${ removeNoise(utils.flatten2dArrayTo.toString()) },
      flatten3dArrayTo: ${ removeNoise(utils.flatten3dArrayTo.toString()) },
      systemEndianness: '${ removeNoise(utils.systemEndianness()) }',
      initWebGl: ${ removeNoise(utils.initWebGl.toString()) },
      isArray: ${ removeNoise(utils.isArray.toString()) },
      checkOutput: ${ removeNoise(utils.checkOutput.toString()) }
    };
    const Utils = utils;
    const canvases = [];
    const maxTexSizes = {};
    class ${ name || 'Kernel' } {
      constructor() {
        this.maxTexSize = null;
        this.argumentsLength = 0;
        this._canvas = null;
        this._webGl = null;
        this.built = false;
        this.program = null;
        this.paramNames = ${ JSON.stringify(gpuKernel.paramNames) };
        this.paramTypes = ${ JSON.stringify(gpuKernel.paramTypes) };
        this.texSize = ${ JSON.stringify(gpuKernel.texSize) };
        this.output = ${ JSON.stringify(gpuKernel.output) };
        this.compiledFragShaderString = \`${ gpuKernel.compiledFragShaderString }\`;
		    this.compiledVertShaderString = \`${ gpuKernel.compiledVertShaderString }\`;
		    this.programUniformLocationCache = {};
		    this.textureCache = {};
		    this.subKernelOutputTextures = null;
		    this.subKernelOutputVariableNames = null;
		    this.uniform1fCache = {};
		    this.uniform1iCache = {};
		    this.uniform2fCache = {};
		    this.uniform2fvCache = {};
		    this.uniform2ivCache = {};
		    this.uniform3fvCache = {};
		    this.uniform3ivCache = {};
      }
      ${ removeFnNoise(gpuKernel._getFragShaderString.toString()) }
      ${ removeFnNoise(gpuKernel._getVertShaderString.toString()) }
      validateOptions() {}
      setupParams() {}
      setupConstants() {}
      setCanvas(canvas) { this._canvas = canvas; return this; }
      setWebGl(webGl) { this._webGl = webGl; return this; }
      ${ removeFnNoise(gpuKernel.getUniformLocation.toString()) }
      ${ removeFnNoise(gpuKernel.setupParams.toString()) }
      ${ removeFnNoise(gpuKernel.setupConstants.toString()) }
      ${ removeFnNoise(gpuKernel.build.toString()) }
		  ${ removeFnNoise(gpuKernel.run.toString()) }
		  ${ removeFnNoise(gpuKernel._addArgument.toString()) }
		  ${ removeFnNoise(gpuKernel.getArgumentTexture.toString()) }
		  ${ removeFnNoise(gpuKernel.getTextureCache.toString()) }
		  ${ removeFnNoise(gpuKernel.getOutputTexture.toString()) }
		  ${ removeFnNoise(gpuKernel.renderOutput.toString()) }
		  ${ removeFnNoise(gpuKernel.updateMaxTexSize.toString()) }
		  ${ removeFnNoise(gpuKernel._setupOutputTexture.toString()) }
		  ${ removeFnNoise(gpuKernel.detachTextureCache.toString()) }
		  ${ removeFnNoise(gpuKernel.setUniform1f.toString()) }
		  ${ removeFnNoise(gpuKernel.setUniform1i.toString()) }
		  ${ removeFnNoise(gpuKernel.setUniform2f.toString()) }
		  ${ removeFnNoise(gpuKernel.setUniform2fv.toString()) }
		  ${ removeFnNoise(gpuKernel.setUniform2iv.toString()) }
		  ${ removeFnNoise(gpuKernel.setUniform3fv.toString()) } 
		  ${ removeFnNoise(gpuKernel.setUniform3iv.toString()) } 
    };
    return kernelRunShortcut(new Kernel());
  };`;
};