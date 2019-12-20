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
 * @param {GLKernel} Kernel
 * @param {KernelVariable[]} args
 * @param {Kernel} originKernel
 * @param {string} [setupContextString]
 * @param {string} [destroyContextString]
 * @returns {string}
 */
function glKernelString(Kernel, args, originKernel, setupContextString, destroyContextString) {
  if (!originKernel.built) {
    originKernel.build.apply(originKernel, args);
  }
  args = args ? Array.from(args).map(arg => {
    switch (typeof arg) {
      case 'boolean':
        return new Boolean(arg);
      case 'number':
        return new Number(arg);
      default:
        return arg;
    }
  }) : null;
  const uploadedValues = [];
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
      const argumentName = findKernelValue(argument, kernel.kernelArguments, [], context, uploadedValues);
      if (argumentName) {
        return argumentName;
      }
      const constantName = findKernelValue(argument, kernel.kernelConstants, constants ? Object.keys(constants).map(key => constants[key]) : [], context, uploadedValues);
      if (constantName) {
        return constantName;
      }
      return null;
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
    tactic,
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
    tactic,
  });
  let result = [];
  context.setIndent(2);
  kernel.build.apply(kernel, args);
  result.push(context.toString());
  context.reset();

  kernel.kernelArguments.forEach((kernelArgument, i) => {
    switch (kernelArgument.type) {
      // primitives
      case 'Integer':
      case 'Boolean':
      case 'Number':
      case 'Float':
        // non-primitives
      case 'Array':
      case 'Array(2)':
      case 'Array(3)':
      case 'Array(4)':
      case 'HTMLImage':
      case 'HTMLVideo':
        context.insertVariable(`uploadValue_${kernelArgument.name}`, kernelArgument.uploadValue);
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
      case 'Array1D(2)':
      case 'Array1D(3)':
      case 'Array1D(4)':
      case 'Array2D(2)':
      case 'Array2D(3)':
      case 'Array2D(4)':
      case 'Array3D(2)':
      case 'Array3D(3)':
      case 'Array3D(4)':
      case 'ArrayTexture(1)':
      case 'ArrayTexture(2)':
      case 'ArrayTexture(3)':
      case 'ArrayTexture(4)':
        context.insertVariable(`uploadValue_${kernelArgument.name}`, args[i].texture);
        break;
      default:
        throw new Error(`unhandled kernelArgumentType insertion for glWiretap of type ${kernelArgument.type}`);
    }
  });
  result.push('/** start of injected functions **/');
  result.push(`function ${toStringWithoutUtils(utils.flattenTo)}`);
  result.push(`function ${toStringWithoutUtils(utils.flatten2dArrayTo)}`);
  result.push(`function ${toStringWithoutUtils(utils.flatten3dArrayTo)}`);
  result.push(`function ${toStringWithoutUtils(utils.flatten4dArrayTo)}`);
  result.push(`function ${toStringWithoutUtils(utils.isArray)}`);
  if (kernel.renderOutput !== kernel.renderTexture && kernel.formatValues) {
    result.push(
      `  const renderOutput = function ${toStringWithoutUtils(kernel.formatValues)};`
    );
  }
  result.push('/** end of injected functions **/');
  result.push(`  const innerKernel = function (${kernel.kernelArguments.map(kernelArgument => kernelArgument.varName).join(', ')}) {`);
  context.setIndent(4);
  kernel.run.apply(kernel, args);
  if (kernel.renderKernels) {
    kernel.renderKernels();
  } else if (kernel.renderOutput) {
    kernel.renderOutput();
  }
  result.push('    /** start setup uploads for kernel values **/');
  kernel.kernelArguments.forEach(kernelArgument => {
    result.push('    ' + kernelArgument.getStringValueHandler().split('\n').join('\n    '));
  });
  result.push('    /** end setup uploads for kernel values **/');
  result.push(context.toString());
  if (kernel.renderOutput === kernel.renderTexture) {
    context.reset();
    if (kernel.renderKernels) {
      const results = kernel.renderKernels();
      const textureName = context.getContextVariableName(kernel.texture.texture);
      result.push(`    return {
      result: {
        texture: ${ textureName },
        type: '${ results.result.type }',
        toArray: ${ getToArrayString(results.result, textureName) }
      },`);
      const { subKernels, mappedTextures } = kernel;
      for (let i = 0; i < subKernels.length; i++) {
        const texture = mappedTextures[i];
        const subKernel = subKernels[i];
        const subKernelResult = results[subKernel.property];
        const subKernelTextureName = context.getContextVariableName(texture.texture);
        result.push(`
      ${subKernel.property}: {
        texture: ${ subKernelTextureName },
        type: '${ subKernelResult.type }',
        toArray: ${ getToArrayString(subKernelResult, subKernelTextureName) }
      },`);
      }
      result.push(`    };`);
    } else {
      const rendered = kernel.renderOutput();
      const textureName = context.getContextVariableName(kernel.texture.texture);
      result.push(`    return {
        texture: ${ textureName },
        type: '${ rendered.type }',
        toArray: ${ getToArrayString(rendered, textureName) }
      };`);
    }
  }
  result.push(`    ${destroyContextString ? '\n' + destroyContextString + '    ': ''}`);
  result.push(postResult.join('\n'));
  result.push('  };');
  if (kernel.graphical) {
    result.push(getGetPixelsString(kernel));
    result.push(`  innerKernel.getPixels = getPixels;`);
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
      if (property === 'context') {
        return null;
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

/**
 *
 * @param {KernelVariable} argument
 * @param {KernelValue[]} kernelValues
 * @param {KernelVariable[]} values
 * @param context
 * @param {KernelVariable[]} uploadedValues
 * @return {string|null}
 */
function findKernelValue(argument, kernelValues, values, context, uploadedValues) {
  if (argument === null) return null;
  switch (typeof argument) {
    case 'boolean':
    case 'number':
      return null;
  }
  if (
    typeof HTMLImageElement !== 'undefined' &&
    argument instanceof HTMLImageElement
  ) {
    for (let i = 0; i < kernelValues.length; i++) {
      const kernelValue = kernelValues[i];
      if (kernelValue.type !== 'HTMLImageArray') continue;
      if (kernelValue.uploadValue !== argument) continue;
      // TODO: if we send two of the same image, the parser could get confused, and short circuit to the first, handle that here
      const variableIndex = values[i].indexOf(argument);
      if (variableIndex === -1) continue;
      const variableName = `uploadValue_${kernelValue.name}[${variableIndex}]`;
      context.insertVariable(variableName, argument);
      return variableName;
    }
    return null;
  }

  for (let i = 0; i < kernelValues.length; i++) {
    const kernelValue = kernelValues[i];
    if (argument !== kernelValue.uploadValue) continue;
    const variable = `uploadValue_${kernelValue.name}`;
    context.insertVariable(variable, kernelValue);
    return variable;
  }
  return null;
}

module.exports = {
  glKernelString
};