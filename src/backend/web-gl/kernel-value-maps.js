const { WebGLKernelValueBoolean } = require('./kernel-value/boolean');
const { WebGLKernelValueFloat } = require('./kernel-value/float');
const { WebGLKernelValueInteger } = require('./kernel-value/integer');

const { WebGLKernelValueHTMLImage } = require('./kernel-value/html-image');
const { WebGLKernelValueDynamicHTMLImage } = require('./kernel-value/dynamic-html-image');

const { WebGLKernelValueSingleInput } = require('./kernel-value/single-input');
const { WebGLKernelValueDynamicSingleInput } = require('./kernel-value/dynamic-single-input');

const { WebGLKernelValueUnsignedInput } = require('./kernel-value/unsigned-input');
const { WebGLKernelValueDynamicUnsignedInput } = require('./kernel-value/dynamic-unsigned-input');

const { WebGLKernelValueMemoryOptimizedNumberTexture } = require('./kernel-value/memory-optimized-number-texture');
const { WebGLKernelValueDynamicMemoryOptimizedNumberTexture } = require('./kernel-value/dynamic-memory-optimized-number-texture');

const { WebGLKernelValueNumberTexture } = require('./kernel-value/number-texture');
const { WebGLKernelValueDynamicNumberTexture } = require('./kernel-value/dynamic-number-texture');

const { WebGLKernelValueSingleArray } = require('./kernel-value/single-array');
const { WebGLKernelValueDynamicSingleArray } = require('./kernel-value/dynamic-single-array');

const { WebGLKernelValueUnsignedArray } = require('./kernel-value/unsigned-array');
const { WebGLKernelValueDynamicUnsignedArray } = require('./kernel-value/dynamic-unsigned-array');

const kernelValueMaps = {
  unsigned: {
    dynamic: {
      'Boolean': WebGLKernelValueBoolean,
      'Interger': WebGLKernelValueInteger,
      'Float': WebGLKernelValueFloat,
      'Array': WebGLKernelValueDynamicUnsignedArray,
      'Input': WebGLKernelValueDynamicUnsignedInput,
      'NumberTexture': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(1)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(2)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(3)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(4)': WebGLKernelValueDynamicNumberTexture,
      'MemoryOptimizedNumberTexture': WebGLKernelValueDynamicMemoryOptimizedNumberTexture,
      'HTMLImage': WebGLKernelValueDynamicHTMLImage,
      'HTMLImageArray': false,
    },
    static: {
      'Boolean': WebGLKernelValueBoolean,
      'Interger': WebGLKernelValueInteger,
      'Float': WebGLKernelValueFloat,
      'Integer': WebGLKernelValueInteger,
      'Array': WebGLKernelValueUnsignedArray,
      'Input': WebGLKernelValueUnsignedInput,
      'NumberTexture': WebGLKernelValueNumberTexture,
      'ArrayTexture(1)': WebGLKernelValueNumberTexture,
      'ArrayTexture(2)': WebGLKernelValueNumberTexture,
      'ArrayTexture(3)': WebGLKernelValueNumberTexture,
      'ArrayTexture(4)': WebGLKernelValueNumberTexture,
      'MemoryOptimizedNumberTexture': WebGLKernelValueDynamicMemoryOptimizedNumberTexture,
      'HTMLImage': WebGLKernelValueHTMLImage,
      'HTMLImageArray': false,
    }
  },
  single: {
    dynamic: {
      'Boolean': WebGLKernelValueBoolean,
      'Interger': WebGLKernelValueInteger,
      'Float': WebGLKernelValueFloat,
      'Array': WebGLKernelValueDynamicSingleArray,
      'Input': WebGLKernelValueDynamicSingleInput,
      'NumberTexture': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(1)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(2)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(3)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(4)': WebGLKernelValueDynamicNumberTexture,
      'MemoryOptimizedNumberTexture': WebGLKernelValueDynamicMemoryOptimizedNumberTexture,
      'HTMLImage': WebGLKernelValueDynamicHTMLImage,
      'HTMLImageArray': false,
    },
    static: {
      'Boolean': WebGLKernelValueBoolean,
      'Interger': WebGLKernelValueInteger,
      'Float': WebGLKernelValueFloat,
      'Integer': WebGLKernelValueInteger,
      'Array': WebGLKernelValueSingleArray,
      'Input': WebGLKernelValueSingleInput,
      'NumberTexture': WebGLKernelValueNumberTexture,
      'ArrayTexture(1)': WebGLKernelValueNumberTexture,
      'ArrayTexture(2)': WebGLKernelValueNumberTexture,
      'ArrayTexture(3)': WebGLKernelValueNumberTexture,
      'ArrayTexture(4)': WebGLKernelValueNumberTexture,
      'MemoryOptimizedNumberTexture': WebGLKernelValueMemoryOptimizedNumberTexture,
      'HTMLImage': WebGLKernelValueHTMLImage,
      'HTMLImageArray': false,
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