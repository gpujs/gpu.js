const { utils } = require('../../utils');
const { Input } = require('../../input');

function constantsToString(constants) {
  const results = [];
  for (const p in constants) {
    const constant = constants[p];
    switch (typeof constant) {
      case 'number':
      case 'boolean':
        results.push(`${p}:${constant}`);
    }
  }
  return `{ ${ results.join() } }`;
}

function cpuKernelString(cpuKernel, name) {
  const header = [];
  const thisProperties = [];
  const beforeReturn = [];

  const useFunctionKeyword = !/^function/.test(cpuKernel.color.toString());

  header.push(
    '  const { context, canvas, constants } = settings;',
    `  const output = new Int32Array(${JSON.stringify(Array.from(cpuKernel.output))});`,
    `  const _constants = ${constantsToString(cpuKernel.constants)};`,
  );

  thisProperties.push(
    '    constants: _constants,',
    '    context,',
    '    output,',
    '    thread: {x: 0, y: 0, z: 0},',
  );

  if (cpuKernel.graphical) {
    header.push(`  const _imageData = context.createImageData(${cpuKernel.output[0]}, ${cpuKernel.output[1]});`);
    header.push(`  const _colorData = new Uint8ClampedArray(${cpuKernel.output[0]} * ${cpuKernel.output[1]} * 4);`);

    const colorFn = utils.flattenFunctionToString((useFunctionKeyword ? 'function ' : '') + cpuKernel.color.toString(), {
      thisLookup: (propertyName) => {
        switch (propertyName) {
          case '_colorData':
            return '_colorData';
          case '_imageData':
            return '_imageData';
          case 'output':
            return 'output';
          case 'thread':
            return 'this.thread';
        }
        return JSON.stringify(cpuKernel[propertyName]);
      },
      findDependency: (object, name) => {
        return null;
      }
    });

    const getPixelsFn = utils.flattenFunctionToString((useFunctionKeyword ? 'function ' : '') + cpuKernel.getPixels.toString(), {
      thisLookup: (propertyName) => {
        switch (propertyName) {
          case '_colorData':
            return '_colorData';
          case '_imageData':
            return '_imageData';
          case 'output':
            return 'output';
          case 'thread':
            return 'this.thread';
        }
        return JSON.stringify(cpuKernel[propertyName]);
      },
      findDependency: () => {
        return null;
      }
    });

    thisProperties.push(
      '    _imageData,',
      '    _colorData,',
      `    color: ${colorFn},`,
    );

    beforeReturn.push(
      `  kernel.getPixels = ${getPixelsFn};`
    );
  }

  const constantTypes = [];
  const constantKeys = Object.keys(cpuKernel.constantTypes);
  for (let i = 0; i < constantKeys.length; i++) {
    constantTypes.push(cpuKernel.constantTypes[constantKeys]);
  }
  if (cpuKernel.argumentTypes.indexOf('HTMLImageArray') !== -1 || constantTypes.indexOf('HTMLImageArray') !== -1) {
    const flattenedImageTo3DArray = utils.flattenFunctionToString((useFunctionKeyword ? 'function ' : '') + cpuKernel._imageTo3DArray.toString(), {
      doNotDefine: ['canvas'],
      findDependency: (object, name) => {
        if (object === 'this') {
          return (useFunctionKeyword ? 'function ' : '') + cpuKernel[name].toString();
        }
        return null;
      },
      thisLookup: (propertyName) => {
        switch (propertyName) {
          case 'canvas':
            return;
          case 'context':
            return 'context';
        }
      }
    })
    beforeReturn.push(flattenedImageTo3DArray);
    thisProperties.push(`    _mediaTo2DArray,`);
    thisProperties.push(`    _imageTo3DArray,`);
  } else if (cpuKernel.argumentTypes.indexOf('HTMLImage') !== -1 || constantTypes.indexOf('HTMLImage') !== -1) {
    const flattenedImageTo2DArray = utils.flattenFunctionToString((useFunctionKeyword ? 'function ' : '') + cpuKernel._mediaTo2DArray.toString(), {
      findDependency: (object, name) => {
        return null;
      },
      thisLookup: (propertyName) => {
        switch (propertyName) {
          case 'canvas':
            return 'settings.canvas';
          case 'context':
            return 'settings.context';
        }
        throw new Error('unhandled thisLookup');
      }
    });
    beforeReturn.push(flattenedImageTo2DArray);
    thisProperties.push(`    _mediaTo2DArray,`);
  }

  return `function(settings) {
${ header.join('\n') }
  for (const p in constants) {
    const constant = constants[p];
    switch (typeof constant) {
      case 'number':
      case 'boolean':
        continue;
    }
    _constants[p] = constant;
  }
  const kernel = (function() {
${cpuKernel._kernelString}
  })
    .apply({ ${thisProperties.join('\n')} });
  ${ beforeReturn.join('\n') }
  return kernel;
}`;
}

module.exports = {
  cpuKernelString
};