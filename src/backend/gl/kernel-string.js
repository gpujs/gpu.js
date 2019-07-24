const { glWiretap } = require('gl-wiretap');
const { utils } = require('../../utils');

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
  const postResult = [];
  const context = glWiretap(originKernel.context, {
    useTrackablePrimitives: true,
    onReadPixels: (targetName) => {
      if (kernel.subKernels) {
        if (!subKernelsResultVariableSetup) {
          postResult.push(`    const result = { result: ${getRenderString(targetName, kernel)} };`);
          subKernelsResultVariableSetup = true;
        } else {
          const property = kernel.subKernels[subKernelsResultIndex++].property;
          postResult.push(`    result${isNaN(property) ? '.' + property : `[${property}]`} = ${getRenderString(targetName, kernel)};`);
        }
        if (subKernelsResultIndex === kernel.subKernels.length) {
          postResult.push('    return result;');
        }
        return;
      }
      if (targetName) {
        postResult.push(`    return ${getRenderString(targetName, kernel)};`);
      } else {
        postResult.push(`    return null;`);
      }
    },
    onUnrecognizedArgumentLookup: (argument) => {
      for (let i = 0; i < kernel.kernelConstants.length; i++) {
        const value = kernel.kernelConstants[i];
        if (value.type === 'HTMLImageArray') {
          const constant = kernel.constants[value.name];
          const variable = `uploadValue_${value.name}[${constant.indexOf(value.uploadValue)}]`;
          context.insertVariable(variable, kernel.constants);
          return variable;
        } else if (value.uploadValue === argument) {
          const variable = `uploadValue_${value.name}`;
          context.insertVariable(variable, value);
          return variable;
        }
      }
    }
  });
  let subKernelsResultVariableSetup = false;
  let subKernelsResultIndex = 0;
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
    argumentTypes,
    constantTypes,
    kernelArguments,
    kernelConstants,
  } = originKernel;
  const kernel = new Kernel(source, {
    canvas,
    context,
    checkContext: false,
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
    argumentTypes,
    constantTypes,
  });
  let result = [];
  context.setIndent(2);
  kernel.build.apply(kernel, args);
  result.push(context.toString());
  context.reset();
  const upgradedArguments = Array.from(args).map(arg => {
    switch (typeof arg) {
      case 'number':
      case 'boolean':
        return new arg.constructor(arg);
    }
    return arg;
  });
  kernel.kernelArguments.forEach((kernelArgument, i) => {
    switch (kernelArgument.type) {
      // primitives
      case 'Integer':
      case 'Boolean':
      case 'Number':
      case 'Float':
        context.insertVariable(`uploadValue_${kernelArgument.name}`, upgradedArguments[i]);
        break;

        // non-primitives
      case 'Array':
      case 'Array(2)':
      case 'Array(3)':
      case 'Array(4)':
        context.insertVariable(`uploadValue_${kernelArgument.name}`, upgradedArguments[i]);
        break;
      case 'HTMLImage':
        context.insertVariable(`uploadValue_${kernelArgument.name}`, upgradedArguments[i]);
        break;
      case 'HTMLImageArray':
        for (let imageIndex = 0; imageIndex < args[i].length; imageIndex++) {
          const arg = args[i];
          context.insertVariable(`uploadValue_${kernelArgument.name}[${imageIndex}]`, arg[imageIndex]);
        }
        break;
      case 'Input':
        context.insertVariable(`uploadValue_${kernelArgument.name}`, kernelArgument.uploadValue);
        break;
      case 'MemoryOptimizedNumberTexture':
      case 'NumberTexture':
      case 'Array2D(2)':
      case 'Array2D(3)':
      case 'Array2D(4)':
      case 'ArrayTexture(1)':
      case 'ArrayTexture(2)':
      case 'ArrayTexture(3)':
      case 'ArrayTexture(4)':
        context.insertVariable(`uploadValue_${kernelArgument.name}`, upgradedArguments[i].texture);
        break;
      default:
        throw new Error(`unhandled kernelArgumentType insertion for glWiretap of type ${kernelArgument.type}`);
    }
  });
  result.push('/** start of injected functions **/');
  result.push(`function ${toStringWithoutUtils(utils.flattenTo)}`);
  result.push(`function ${toStringWithoutUtils(utils.flatten2dArrayTo)}`);
  result.push(`function ${toStringWithoutUtils(utils.flatten3dArrayTo)}`);
  result.push(`function ${toStringWithoutUtils(utils.isArray)}`);
  if (kernel.renderOutput !== kernel.renderTexture && kernel.formatValues) {
    result.push(
      `  const renderOutput = function ${toStringWithoutUtils(kernel.formatValues)};`
    );
  }
  result.push('/** end of injected functions **/');
  result.push(`  const innerKernel = function (${kernel.kernelArguments.map(kernelArgument => kernelArgument.varName).join(', ')}) {`);
  context.setIndent(4);
  kernel.run.apply(kernel, upgradedArguments);
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
  if (kernel.renderOutput === kernel.renderTexture) {
    context.reset();
    const results = kernel.renderKernels();
    const textureName = context.getContextVariableName(kernel.outputTexture);
    result.push(`    return {
      result: {
        texture: ${ textureName },
        type: '${ results.result.type }',
        toArray: ${ getToArrayString(results.result, textureName) }
      },`);
    const { subKernels, subKernelOutputTextures } = kernel;
    for (let i = 0; i < subKernels.length; i++) {
      const texture = subKernelOutputTextures[i];
      const subKernel = subKernels[i];
      const subKernelResult = results[subKernel.property];
      const subKernelTextureName = context.getContextVariableName(texture);
      result.push(`
      ${subKernel.property}: {
        texture: ${ subKernelTextureName },
        type: '${ subKernelResult.type }',
        toArray: ${ getToArrayString(subKernelResult, subKernelTextureName) }
      },`);
    }
    result.push(`    };`);
  }
  result.push(`    ${destroyContextString ? '\n' + destroyContextString + '    ': ''}`);
  result.push(postResult.join('\n'));
  result.push('  };');
  if (kernel.graphical) {
    result.push(getGetPixelsString(kernel));
    result.push(`innerKernel.getPixels = getPixels;`);
  }
  result.push('  return innerKernel;');

  let constantsUpload = [];
  kernelConstants.forEach((kernelConstant) => {
    constantsUpload.push(`${  kernelConstant.getStringValueHandler()}`);
  });
  return `function kernel(settings) {
  const { context, constants } = settings;
  ${constantsUpload.join('')}
  ${setupContextString ? setupContextString : ''}
${result.join('\n')}
}`;
}

function getRenderString(targetName, kernel) {
  const readBackValue = kernel.precision === 'single' ? targetName : `new Float32Array(${targetName}.buffer)`;
  if (kernel.output[2]) {
    return `renderOutput(${readBackValue}, ${kernel.output[0]}, ${kernel.output[1]}, ${kernel.output[2]})`;
  }
  if (kernel.output[1]) {
    return `renderOutput(${readBackValue}, ${kernel.output[0]}, ${kernel.output[1]})`;
  }

  return `renderOutput(${readBackValue}, ${kernel.output[0]})`;
}

function getGetPixelsString(kernel) {
  const getPixels = kernel.getPixels.toString();
  const useFunctionKeyword = !/^function/.test(getPixels);
  return utils.flattenFunctionToString(`${useFunctionKeyword ? 'function ' : ''}${ getPixels }`, {
    findDependency: (object, name) => {
      if (object === 'utils') {
        return `const ${name} = ${utils[name].toString()};`;
      }
      return null;
    },
    thisLookup: (property) => {
      if (property === 'context') {
        return null;
      }
      if (kernel.hasOwnProperty(property)) {
        return JSON.stringify(kernel[property]);
      }
      throw new Error(`unhandled thisLookup ${ property }`);
    }
  });
}

function getToArrayString(kernelResult, textureName) {
  const toArray = kernelResult.toArray.toString();
  const useFunctionKeyword = !/^function/.test(toArray);
  const flattenedFunctions = utils.flattenFunctionToString(`${useFunctionKeyword ? 'function ' : ''}${ toArray }`, {
    findDependency: (object, name) => {
      if (object === 'utils') {
        return `const ${name} = ${utils[name].toString()};`;
      } else if (object === 'this') {
        return `${useFunctionKeyword ? 'function ' : ''}${kernelResult[name].toString()}`;
      } else {
        throw new Error('unhandled fromObject');
      }
    },
    thisLookup: (property) => {
      if (property === 'texture') {
        return textureName;
      }
      if (kernelResult.hasOwnProperty(property)) {
        return JSON.stringify(kernelResult[property]);
      }
      throw new Error(`unhandled thisLookup ${ property }`);
    }
  });
  return `() => {
  ${flattenedFunctions}
  return toArray();
  }`;
}
module.exports = {
  glKernelString
};