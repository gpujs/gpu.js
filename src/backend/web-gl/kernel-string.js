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
	return str
		.replace(/^[A-Za-z23]+/, 'function')
		.replace(/[_]typeof/g, 'typeof');
}

function boolToString(value) {
	if (value) {
		return 'true';
	} else if (value === false) {
		return 'false';
	}
	return 'null';
}

module.exports = function(gpuKernel, name) {
	return `() => {
    ${ kernelRunShortcut.toString() };
    const utils = {
      allPropertiesOf: ${ removeNoise(utils.allPropertiesOf.toString()) },
      clone: ${ removeNoise(utils.clone.toString()) },
      splitArray: ${ removeNoise(utils.splitArray.toString()) },
      getVariableType: ${ removeNoise(utils.getVariableType.toString()) },
      getDimensions: ${ removeNoise(utils.getDimensions.toString()) },
      dimToTexSize: ${ removeNoise(utils.dimToTexSize.toString()) },
      flattenTo: ${ removeNoise(utils.flattenTo.toString()) },
      flatten2dArrayTo: ${ removeNoise(utils.flatten2dArrayTo.toString()) },
      flatten3dArrayTo: ${ removeNoise(utils.flatten3dArrayTo.toString()) },
      systemEndianness: ${ removeNoise(utils.getSystemEndianness.toString()) },
      isArray: ${ removeNoise(utils.isArray.toString()) },
      checkOutput: ${ removeNoise(utils.checkOutput.toString()) }
    };
    const Utils = utils;
    const canvases = [];
    const maxTexSizes = {};
    let Texture = function() {};
    let Input = function() {}; 
    class ${ name || 'Kernel' } {
      constructor() {
        this.maxTexSize = null;
        this.argumentsLength = 0;
        this.constantsLength = 0;
        this.canvas = null;
        this.context = null;
        this.program = null;
        this.subKernels = null;
        this.subKernelNames = null;
        this.wraparound = null;
        this.drawBuffersMap = ${ gpuKernel.drawBuffersMap ? JSON.stringify(gpuKernel.drawBuffersMap) : 'null' };
        this.endianness = '${ gpuKernel.endianness }';
        this.graphical = ${ boolToString(gpuKernel.graphical) };
        this.floatTextures = ${ boolToString(gpuKernel.floatTextures) };
        this.floatOutput = ${ boolToString(gpuKernel.floatOutput) };
        this.floatOutputForce = ${ boolToString(gpuKernel.floatOutputForce) };
        this.hardcodeConstants = ${ boolToString(gpuKernel.hardcodeConstants) };
        this.subKernelProperties = null;
        this.outputToTexture = ${ boolToString(gpuKernel.outputToTexture) };
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
		    this.extensions = {};
		    this.uniform1fCache = {};
		    this.uniform1iCache = {};
		    this.uniform2fCache = {};
		    this.uniform2fvCache = {};
		    this.uniform2ivCache = {};
		    this.uniform3fvCache = {};
		    this.uniform3ivCache = {};
      }
      _getFragShaderString() { return this.compiledFragShaderString; }
      _getVertShaderString() { return this.compiledVertShaderString; }
      validateSettings() {}
      setupParams() {}
      setupConstants() {}
      setCanvas(canvas) { this.canvas = canvas; return this; }
      setContext(context) { this.context = context; return this; }
      setTexture(Type) { Texture = Type; }
      setInput(Type) { Input = Type; }
      ${ removeFnNoise(gpuKernel.getUniformLocation.toString()) }
      ${ removeFnNoise(gpuKernel.build.toString()) }
		  ${ removeFnNoise(gpuKernel.run.toString()) }
		  ${ removeFnNoise(gpuKernel._addArgument.toString()) }
		  ${ removeFnNoise(gpuKernel._formatArrayTransfer.toString()) }
		  ${ removeFnNoise(gpuKernel.initExtensions.toString()) }
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