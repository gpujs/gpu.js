const { glWiretap } = require('gl-wiretap');
const { utils } = require('../../utils');
const { Texture } = require('../../texture');

function toStringWithoutUtils(fn) {
  return fn.toString()
    .replace('=>', '')
    .replace(/^function /, '')
    .replace(/utils[.]/g, '/*utils.*/');
}

/**
 *
 * @param {Kernel} Kernel
 * @param {KernelVariable[]} args
 * @param {Kernel} originKernel
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
    if (kernel.TextureConstructor !== Texture) {
      result.push(kernel.TextureConstructor.toString());
    }
  } else {
    result.push(
      `  const renderOutput = function ${toStringWithoutUtils(kernel.formatValues)};`
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
  result.push(`    ${destroyContextString ? '\n' + destroyContextString + '    ': ''}`);
  if (context.getReadPixelsVariableName) {
    result.push(`    return renderOutput(${kernel.precision === 'single' ? context.getReadPixelsVariableName : `new Float32Array(${context.getReadPixelsVariableName}.buffer)`}, ${kernel.output[0]}, ${kernel.output[1]}, ${kernel.output[2]});`);
  } else {
    result.push(`    return null;`);
  }
  result.push('  };');
  return `function kernel(context = null) {
  ${setupContextString ? setupContextString : ''}${result.join('\n')} }`;
}

module.exports = {
  glKernelString
};