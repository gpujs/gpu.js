const { glWiretap } = require('gl-wiretap');
const { utils } = require('../../utils');
const { Texture } = require('../../texture');

function toStringWithoutUtils(fn) {
  return fn.toString()
    .replace(/^function /, '')
    .replace(/utils[.]/g, '/*utils.*/');
}

/**
 *
 * @param {Kernel} Kernel
 * @param {KernelVariable[]} args
 * @param {IKernel} originKernel
 * @param {string} [setupContextString]
 * @param {string} [destroyContextString]
 * @returns {string}
 */
function glKernelString(Kernel, args, originKernel, setupContextString, destroyContextString) {
  const context = glWiretap(originKernel.context, {
    useTrackablePrimitives: true
  });
  const {
    source,
    canvas,
    output,
    pipeline,
    graphical,
    loopMaxIterations,
    constants,
    optimizeFloatMemory,
    precision,
    fixIntegerDivisionAccuracy,
    functions,
    nativeFunctions,
    subKernels,
    immutable,
  } = originKernel;
  const kernel = new Kernel(source, {
    canvas,
    context,
    output,
    pipeline,
    graphical,
    loopMaxIterations,
    constants,
    optimizeFloatMemory,
    precision,
    fixIntegerDivisionAccuracy,
    functions,
    nativeFunctions,
    subKernels,
    immutable,
  });
  let result = [];
  context.setIndent(2);
  kernel.build.apply(kernel, args);
  result.push(context.toString());
  context.reset();
  kernel.kernelArguments.forEach(kernelArgument => {
    context.insertVariable(`uploadValue_${kernelArgument.name}`, kernelArgument.uploadValue);
  });
  result.push('/** start of injected functions **/');
  result.push(`function ${toStringWithoutUtils(utils.flattenTo)}`);
  result.push(`function ${toStringWithoutUtils(utils.flatten2dArrayTo)}`);
  result.push(`function ${toStringWithoutUtils(utils.flatten3dArrayTo)}`);
  result.push(`function ${toStringWithoutUtils(utils.isArray)}`);
  if (kernel.renderOutput === kernel.renderTexture) {
    result.push(Texture.toString());
    result.push(
      `  const renderOutput = function ${
        toStringWithoutUtils(kernel.renderOutput.toString())
          .replace(`this.outputTexture`, 'null')
          .replace('this.texSize', `new Int32Array(${JSON.stringify(Array.from(kernel.texSize))})`)
          .replace('this.threadDim', `new Int32Array(${JSON.stringify(Array.from(kernel.threadDim))})`)
          .replace('this.output', `new Int32Array(${JSON.stringify(this.output)})`)
          .replace('this.context', 'gl')
          .replace('this.gpu', 'null')
          .replace('this.getReturnTextureType()', `'${kernel.getReturnTextureType()}'`)
      };`
    );
  } else {
    result.push(
      `  const renderOutput = function ${toStringWithoutUtils(kernel.renderOutput.toString())
        .replace('() {', '(pixels) {')
        .replace('    const pixels = this.readFloatPixelsToFloat32Array();\n', '')
        .replace('this.readPackedPixelsToFloat32Array()', 'new Float32Array(pixels.buffer)')
        .replace('this.output;', JSON.stringify(kernel.output) + ';')
        };`
    );
  }
  kernel.kernelArguments.forEach(kernelArgument => {
    kernelArgument.context = originKernel.context;
  });
  result.push('/** end of injected functions **/');
  result.push(`  return function (${kernel.kernelArguments.map(kernelArgument => kernelArgument.name).join(', ')}) {`);
  context.setIndent(4);
  kernel.run.apply(kernel, args);
  if (kernel.renderKernels) {
    kernel.renderKernels();
  } else if (kernel.renderOutput) {
    kernel.renderOutput();
  }
  result.push('/** start setup uploads for kernel values **/');
  kernel.kernelArguments.forEach(kernelArgument => {
    result.push(kernelArgument.getStringValueHandler());
  });
  result.push('/** end setup uploads for kernel values **/');
  result.push(context.toString());
  result.push(`    ${destroyContextString ? '\n' + destroyContextString + '    ': ''}return renderOutput(${context.getReadPixelsVariableName});`);
  result.push('  };');
  return `function kernel(context = null) {
  ${setupContextString ? setupContextString : ''}${result.join('\n')} }`;
}

module.exports = {
  glKernelString
};