'use strict';

const utils = require('../../core/utils');
const kernelRunShortcut = require('../kernel-run-shortcut');

module.exports = function(gpuKernel, name) {
	return `() => {
    ${ kernelRunShortcut.toString() };
    const utils = {
      allPropertiesOf: function ${ utils.allPropertiesOf.toString() },
      clone: function ${ utils.clone.toString() },
      splitArray: function ${ utils.splitArray.toString() },
      getArgumentType: function ${ utils.getArgumentType.toString() },
      getDimensions: function ${ utils.getDimensions.toString() },
      dimToTexSize: function ${ utils.dimToTexSize.toString() },
      copyFlatten: function ${ utils.copyFlatten.toString() },
      flatten: function ${ utils.flatten.toString() },
      systemEndianness: '${ utils.systemEndianness() }',
      initWebGl: function ${ utils.initWebGl.toString() },
      isArray: function ${ utils.isArray.toString() }
    };
    class ${ name || 'Kernel' } {
      constructor() {
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
      }
      ${ gpuKernel._getFragShaderString.toString() }
      ${ gpuKernel._getVertShaderString.toString() }
      validateOptions() {}
      setupParams() {}
      setCanvas(canvas) { this._canvas = canvas; return this; }
      setWebGl(webGl) { this._webGl = webGl; return this; }
      ${ gpuKernel.getUniformLocation.toString() }
      ${ gpuKernel.setupParams.toString() }
      ${ gpuKernel.build.toString() }
		  ${ gpuKernel.run.toString() }
		  ${ gpuKernel._addArgument.toString() }
		  ${ gpuKernel.getArgumentTexture.toString() }
		  ${ gpuKernel.getTextureCache.toString() }
		  ${ gpuKernel.getOutputTexture.toString() }
		  ${ gpuKernel.renderOutput.toString() }
    };
    return kernelRunShortcut(new Kernel());
  };`;
};