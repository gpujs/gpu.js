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
  return str.replace(/^[A-Za-z23]+/, 'function').replace(/[_]typeof/g, 'typeof');
}

function boolToString(value) {
  if (value) {
    return 'true';
  } else if (value === false) {
    return 'false';
  }
  return 'null';
}

module.exports = function (gpuKernel, name) {
  return '() => {\n    ' + kernelRunShortcut.toString() + ';\n    const utils = {\n      allPropertiesOf: ' + removeNoise(utils.allPropertiesOf.toString()) + ',\n      clone: ' + removeNoise(utils.clone.toString()) + ',\n      splitArray: ' + removeNoise(utils.splitArray.toString()) + ',\n      getVariableType: ' + removeNoise(utils.getVariableType.toString()) + ',\n      getDimensions: ' + removeNoise(utils.getDimensions.toString()) + ',\n      dimToTexSize: ' + removeNoise(utils.dimToTexSize.toString()) + ',\n      flattenTo: ' + removeNoise(utils.flattenTo.toString()) + ',\n      flatten2dArrayTo: ' + removeNoise(utils.flatten2dArrayTo.toString()) + ',\n      flatten3dArrayTo: ' + removeNoise(utils.flatten3dArrayTo.toString()) + ',\n      systemEndianness: ' + removeNoise(utils.getSystemEndianness.toString()) + ',\n      isArray: ' + removeNoise(utils.isArray.toString()) + '\n    };\n    const Utils = utils;\n    const canvases = [];\n    const maxTexSizes = {};\n    let Texture = function() {};\n    let Input = function() {}; \n    class ' + (name || 'Kernel') + ' {\n      constructor() {\n        this.maxTexSize = null;\n        this.argumentsLength = 0;\n        this.constantsLength = 0;\n        this.canvas = null;\n        this.context = null;\n        this.program = null;\n        this.subKernels = null;\n        this.subKernelNames = null;\n        this.wraparound = null;\n        this.drawBuffersMap = ' + (gpuKernel.drawBuffersMap ? JSON.stringify(gpuKernel.drawBuffersMap) : 'null') + ';\n        this.endianness = \'' + gpuKernel.endianness + '\';\n        this.graphical = ' + boolToString(gpuKernel.graphical) + ';\n        this.floatTextures = ' + boolToString(gpuKernel.floatTextures) + ';\n        this.floatOutput = ' + boolToString(gpuKernel.floatOutput) + ';\n        this.floatOutputForce = ' + boolToString(gpuKernel.floatOutputForce) + ';\n        this.hardcodeConstants = ' + boolToString(gpuKernel.hardcodeConstants) + ';\n        this.outputToTexture = ' + boolToString(gpuKernel.outputToTexture) + ';\n        this.argumentNames = ' + JSON.stringify(gpuKernel.argumentNames) + ';\n        this.argumentTypes = ' + JSON.stringify(gpuKernel.argumentTypes) + ';\n        this.texSize = ' + JSON.stringify(gpuKernel.texSize) + ';\n        this.output = ' + JSON.stringify(gpuKernel.output) + ';\n        this.compiledFragShaderString = `' + gpuKernel.compiledFragShaderString + '`;\n\t\t    this.compiledVertShaderString = `' + gpuKernel.compiledVertShaderString + '`;\n\t\t    this.programUniformLocationCache = {};\n\t\t    this.textureCache = {};\n\t\t    this.subKernelOutputTextures = null;\n\t\t    this.extensions = {};\n\t\t    this.uniform1fCache = {};\n\t\t    this.uniform1iCache = {};\n\t\t    this.uniform2fCache = {};\n\t\t    this.uniform2fvCache = {};\n\t\t    this.uniform2ivCache = {};\n\t\t    this.uniform3fvCache = {};\n\t\t    this.uniform3ivCache = {};\n      }\n      _getFragShaderString() { return this.compiledFragShaderString; }\n      _getVertShaderString() { return this.compiledVertShaderString; }\n      validateSettings() {}\n      initExtensions() {}\n      setupArguments() {}\n      setupConstants() {}\n      setCanvas(canvas) { this.canvas = canvas; return this; }\n      setContext(context) { this.context = context; return this; }\n      setTexture(Type) { Texture = Type; }\n      setInput(Type) { Input = Type; }\n      ' + removeFnNoise(gpuKernel.getUniformLocation.toString()) + '\n      ' + removeFnNoise(gpuKernel.build.toString()) + '\n\t\t  ' + removeFnNoise(gpuKernel.run.toString()) + '\n\t\t  ' + removeFnNoise(gpuKernel._addArgument.toString()) + '\n\t\t  ' + removeFnNoise(gpuKernel._formatArrayTransfer.toString()) + '\n\t\t  ' + removeFnNoise(gpuKernel.checkOutput.toString()) + '\n\t\t  ' + removeFnNoise(gpuKernel.getArgumentTexture.toString()) + '\n\t\t  ' + removeFnNoise(gpuKernel.getTextureCache.toString()) + '\n\t\t  ' + removeFnNoise(gpuKernel.getOutputTexture.toString()) + '\n\t\t  ' + removeFnNoise(gpuKernel.renderOutput.toString()) + '\n\t\t  ' + removeFnNoise(gpuKernel.updateMaxTexSize.toString()) + '\n\t\t  ' + removeFnNoise(gpuKernel._setupOutputTexture.toString()) + '\n\t\t  ' + removeFnNoise(gpuKernel.detachTextureCache.toString()) + '\n\t\t  ' + removeFnNoise(gpuKernel.setUniform1f.toString()) + '\n\t\t  ' + removeFnNoise(gpuKernel.setUniform1i.toString()) + '\n\t\t  ' + removeFnNoise(gpuKernel.setUniform2f.toString()) + '\n\t\t  ' + removeFnNoise(gpuKernel.setUniform2fv.toString()) + '\n\t\t  ' + removeFnNoise(gpuKernel.setUniform2iv.toString()) + '\n\t\t  ' + removeFnNoise(gpuKernel.setUniform3fv.toString()) + '\n\t\t  ' + removeFnNoise(gpuKernel.setUniform3iv.toString()) + '\n    };\n    return kernelRunShortcut(new ' + (name || 'Kernel') + '());\n  };';
};