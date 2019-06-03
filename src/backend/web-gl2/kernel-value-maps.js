const { WebGL2KernelValueBoolean } = require('./kernel-value/boolean');
const { WebGL2KernelValueFloat } = require('./kernel-value/float');
const { WebGL2KernelValueInteger } = require('./kernel-value/integer');

const { WebGL2KernelValueHTMLImage } = require('./kernel-value/html-image');
const { WebGL2KernelValueDynamicHTMLImage } = require('./kernel-value/dynamic-html-image');

const { WebGL2KernelValueHtmlImageArray } = require('./kernel-value/html-image-array');
const { WebGL2KernelValueDynamicHtmlImageArray } = require('./kernel-value/dynamic-html-image-array');

const { WebGL2KernelValueSingleInput } = require('./kernel-value/single-input');
const { WebGL2KernelValueDynamicSingleInput } = require('./kernel-value/dynamic-single-input');

const { WebGL2KernelValueUnsignedInput } = require('./kernel-value/unsigned-input');
const { WebGL2KernelValueDynamicUnsignedInput } = require('./kernel-value/dynamic-unsigned-input');

const { WebGL2KernelValueMemoryOptimizedNumberTexture } = require('./kernel-value/memory-optimized-number-texture');
const { WebGL2KernelValueDynamicMemoryOptimizedNumberTexture } = require('./kernel-value/dynamic-memory-optimized-number-texture');

const { WebGL2KernelValueNumberTexture } = require('./kernel-value/number-texture');
const { WebGL2KernelValueDynamicNumberTexture } = require('./kernel-value/dynamic-number-texture');

const { WebGL2KernelValueSingleArray } = require('./kernel-value/single-array');
const { WebGL2KernelValueDynamicSingleArray } = require('./kernel-value/dynamic-single-array');

const { WebGL2KernelValueUnsignedArray } = require('./kernel-value/unsigned-array');
const { WebGL2KernelValueDynamicUnsignedArray } = require('./kernel-value/dynamic-unsigned-array');

const kernelValueMaps = {
  unsigned: {
    dynamic: {
      'Boolean': WebGL2KernelValueBoolean,
      'Interger': WebGL2KernelValueInteger,
      'Float': WebGL2KernelValueFloat,
      'Array': WebGL2KernelValueDynamicUnsignedArray,
      'Input': WebGL2KernelValueDynamicUnsignedInput,
      'NumberTexture': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(1)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(2)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(3)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(4)': WebGL2KernelValueDynamicNumberTexture,
      'MemoryOptimizedNumberTexture': WebGL2KernelValueDynamicMemoryOptimizedNumberTexture,
      'HTMLImage': WebGL2KernelValueDynamicHTMLImage,
      'HTMLImageArray': WebGL2KernelValueDynamicHtmlImageArray,
    },
    static: {
      'Boolean': WebGL2KernelValueBoolean,
      'Interger': WebGL2KernelValueInteger,
      'Float': WebGL2KernelValueFloat,
      'Integer': WebGL2KernelValueInteger,
      'Array': WebGL2KernelValueUnsignedArray,
      'Input': WebGL2KernelValueUnsignedInput,
      'NumberTexture': WebGL2KernelValueNumberTexture,
      'ArrayTexture(1)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(2)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(3)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(4)': WebGL2KernelValueNumberTexture,
      'MemoryOptimizedNumberTexture': WebGL2KernelValueDynamicMemoryOptimizedNumberTexture,
      'HTMLImage': WebGL2KernelValueHTMLImage,
      'HTMLImageArray': WebGL2KernelValueHtmlImageArray,
    }
  },
  single: {
    dynamic: {
      'Boolean': WebGL2KernelValueBoolean,
      'Interger': WebGL2KernelValueInteger,
      'Float': WebGL2KernelValueFloat,
      'Array': WebGL2KernelValueDynamicSingleArray,
      'Input': WebGL2KernelValueDynamicSingleInput,
      'NumberTexture': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(1)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(2)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(3)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(4)': WebGL2KernelValueDynamicNumberTexture,
      'MemoryOptimizedNumberTexture': WebGL2KernelValueDynamicMemoryOptimizedNumberTexture,
      'HTMLImage': WebGL2KernelValueDynamicHTMLImage,
      'HTMLImageArray': WebGL2KernelValueDynamicHtmlImageArray,
    },
    static: {
      'Boolean': WebGL2KernelValueBoolean,
      'Interger': WebGL2KernelValueInteger,
      'Float': WebGL2KernelValueFloat,
      'Integer': WebGL2KernelValueInteger,
      'Array': WebGL2KernelValueSingleArray,
      'Input': WebGL2KernelValueSingleInput,
      'NumberTexture': WebGL2KernelValueNumberTexture,
      'ArrayTexture(1)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(2)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(3)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(4)': WebGL2KernelValueNumberTexture,
      'MemoryOptimizedNumberTexture': WebGL2KernelValueMemoryOptimizedNumberTexture,
      'HTMLImage': WebGL2KernelValueHTMLImage,
      'HTMLImageArray': WebGL2KernelValueHtmlImageArray,
    }
  },
};

function lookupKernelValueType(type, dynamic, precision) {
  if (!type) {
    throw new Error('type missing');
  }
  if (!dynamic) {
    throw new Error('dynamic missing');
  }
  if (!precision) {
    throw new Error('precision missing');
  }
  const types = kernelValueMaps[precision][dynamic];
  if (types[type] === false) {
    return null;
  } else if (types[type] === undefined) {
    throw new Error(`Could not find a KernelValue for ${ type }`);
  }
  return types[type];
}

module.exports = {
  lookupKernelValueType
};