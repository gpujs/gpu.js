const { WebGLKernelValueBoolean } = require('./kernel-value/boolean');
const { WebGLKernelValueFloat } = require('./kernel-value/float');
const { WebGLKernelValueInteger } = require('./kernel-value/integer');

const { WebGLKernelValueHTMLImage } = require('./kernel-value/html-image');
const { WebGLKernelValueDynamicHTMLImage } = require('./kernel-value/dynamic-html-image');

const { WebGLKernelValueHTMLVideo } = require('./kernel-value/html-video');
const { WebGLKernelValueDynamicHTMLVideo } = require('./kernel-value/dynamic-html-video');

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

const { WebGLKernelValueSingleArray1DI } = require('./kernel-value/single-array1d-i');
const { WebGLKernelValueDynamicSingleArray1DI } = require('./kernel-value/dynamic-single-array1d-i');

const { WebGLKernelValueSingleArray2DI } = require('./kernel-value/single-array2d-i');
const { WebGLKernelValueDynamicSingleArray2DI } = require('./kernel-value/dynamic-single-array2d-i');

const { WebGLKernelValueSingleArray3DI } = require('./kernel-value/single-array3d-i');
const { WebGLKernelValueDynamicSingleArray3DI } = require('./kernel-value/dynamic-single-array3d-i');

const { WebGLKernelValueArray2 } = require('./kernel-value/array2');
const { WebGLKernelValueArray3 } = require('./kernel-value/array3');
const { WebGLKernelValueArray4 } = require('./kernel-value/array4');

const { WebGLKernelValueUnsignedArray } = require('./kernel-value/unsigned-array');
const { WebGLKernelValueDynamicUnsignedArray } = require('./kernel-value/dynamic-unsigned-array');

const kernelValueMaps = {
  unsigned: {
    dynamic: {
      'Boolean': WebGLKernelValueBoolean,
      'Integer': WebGLKernelValueInteger,
      'Float': WebGLKernelValueFloat,
      'Array': WebGLKernelValueDynamicUnsignedArray,
      'Array(2)': WebGLKernelValueArray2,
      'Array(3)': WebGLKernelValueArray3,
      'Array(4)': WebGLKernelValueArray4,
      'Array1D(2)': false,
      'Array1D(3)': false,
      'Array1D(4)': false,
      'Array2D(2)': false,
      'Array2D(3)': false,
      'Array2D(4)': false,
      'Array3D(2)': false,
      'Array3D(3)': false,
      'Array3D(4)': false,
      'Input': WebGLKernelValueDynamicUnsignedInput,
      'NumberTexture': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(1)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(2)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(3)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(4)': WebGLKernelValueDynamicNumberTexture,
      'MemoryOptimizedNumberTexture': WebGLKernelValueDynamicMemoryOptimizedNumberTexture,
      'HTMLCanvas': WebGLKernelValueDynamicHTMLImage,
      'OffscreenCanvas': WebGLKernelValueDynamicHTMLImage,
      'HTMLImage': WebGLKernelValueDynamicHTMLImage,
      'ImageBitmap': WebGLKernelValueDynamicHTMLImage,
      'HTMLImageArray': false,
      'HTMLVideo': WebGLKernelValueDynamicHTMLVideo,
    },
    static: {
      'Boolean': WebGLKernelValueBoolean,
      'Float': WebGLKernelValueFloat,
      'Integer': WebGLKernelValueInteger,
      'Array': WebGLKernelValueUnsignedArray,
      'Array(2)': WebGLKernelValueArray2,
      'Array(3)': WebGLKernelValueArray3,
      'Array(4)': WebGLKernelValueArray4,
      'Array1D(2)': false,
      'Array1D(3)': false,
      'Array1D(4)': false,
      'Array2D(2)': false,
      'Array2D(3)': false,
      'Array2D(4)': false,
      'Array3D(2)': false,
      'Array3D(3)': false,
      'Array3D(4)': false,
      'Input': WebGLKernelValueUnsignedInput,
      'NumberTexture': WebGLKernelValueNumberTexture,
      'ArrayTexture(1)': WebGLKernelValueNumberTexture,
      'ArrayTexture(2)': WebGLKernelValueNumberTexture,
      'ArrayTexture(3)': WebGLKernelValueNumberTexture,
      'ArrayTexture(4)': WebGLKernelValueNumberTexture,
      'MemoryOptimizedNumberTexture': WebGLKernelValueMemoryOptimizedNumberTexture,
      'HTMLCanvas': WebGLKernelValueHTMLImage,
      'OffscreenCanvas': WebGLKernelValueHTMLImage,
      'HTMLImage': WebGLKernelValueHTMLImage,
      'ImageBitmap': WebGLKernelValueHTMLImage,
      'HTMLImageArray': false,
      'HTMLVideo': WebGLKernelValueHTMLVideo,
    }
  },
  single: {
    dynamic: {
      'Boolean': WebGLKernelValueBoolean,
      'Integer': WebGLKernelValueInteger,
      'Float': WebGLKernelValueFloat,
      'Array': WebGLKernelValueDynamicSingleArray,
      'Array(2)': WebGLKernelValueArray2,
      'Array(3)': WebGLKernelValueArray3,
      'Array(4)': WebGLKernelValueArray4,
      'Array1D(2)': WebGLKernelValueDynamicSingleArray1DI,
      'Array1D(3)': WebGLKernelValueDynamicSingleArray1DI,
      'Array1D(4)': WebGLKernelValueDynamicSingleArray1DI,
      'Array2D(2)': WebGLKernelValueDynamicSingleArray2DI,
      'Array2D(3)': WebGLKernelValueDynamicSingleArray2DI,
      'Array2D(4)': WebGLKernelValueDynamicSingleArray2DI,
      'Array3D(2)': WebGLKernelValueDynamicSingleArray3DI,
      'Array3D(3)': WebGLKernelValueDynamicSingleArray3DI,
      'Array3D(4)': WebGLKernelValueDynamicSingleArray3DI,
      'Input': WebGLKernelValueDynamicSingleInput,
      'NumberTexture': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(1)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(2)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(3)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(4)': WebGLKernelValueDynamicNumberTexture,
      'MemoryOptimizedNumberTexture': WebGLKernelValueDynamicMemoryOptimizedNumberTexture,
      'HTMLCanvas': WebGLKernelValueDynamicHTMLImage,
      'OffscreenCanvas': WebGLKernelValueDynamicHTMLImage,
      'HTMLImage': WebGLKernelValueDynamicHTMLImage,
      'ImageBitmap': WebGLKernelValueDynamicHTMLImage,
      'HTMLImageArray': false,
      'HTMLVideo': WebGLKernelValueDynamicHTMLVideo,
    },
    static: {
      'Boolean': WebGLKernelValueBoolean,
      'Float': WebGLKernelValueFloat,
      'Integer': WebGLKernelValueInteger,
      'Array': WebGLKernelValueSingleArray,
      'Array(2)': WebGLKernelValueArray2,
      'Array(3)': WebGLKernelValueArray3,
      'Array(4)': WebGLKernelValueArray4,
      'Array1D(2)': WebGLKernelValueSingleArray1DI,
      'Array1D(3)': WebGLKernelValueSingleArray1DI,
      'Array1D(4)': WebGLKernelValueSingleArray1DI,
      'Array2D(2)': WebGLKernelValueSingleArray2DI,
      'Array2D(3)': WebGLKernelValueSingleArray2DI,
      'Array2D(4)': WebGLKernelValueSingleArray2DI,
      'Array3D(2)': WebGLKernelValueSingleArray3DI,
      'Array3D(3)': WebGLKernelValueSingleArray3DI,
      'Array3D(4)': WebGLKernelValueSingleArray3DI,
      'Input': WebGLKernelValueSingleInput,
      'NumberTexture': WebGLKernelValueNumberTexture,
      'ArrayTexture(1)': WebGLKernelValueNumberTexture,
      'ArrayTexture(2)': WebGLKernelValueNumberTexture,
      'ArrayTexture(3)': WebGLKernelValueNumberTexture,
      'ArrayTexture(4)': WebGLKernelValueNumberTexture,
      'MemoryOptimizedNumberTexture': WebGLKernelValueMemoryOptimizedNumberTexture,
      'HTMLCanvas': WebGLKernelValueHTMLImage,
      'OffscreenCanvas': WebGLKernelValueHTMLImage,
      'HTMLImage': WebGLKernelValueHTMLImage,
      'ImageBitmap': WebGLKernelValueHTMLImage,
      'HTMLImageArray': false,
      'HTMLVideo': WebGLKernelValueHTMLVideo,
    }
  },
};

function lookupKernelValueType(type, dynamic, precision, value) {
  if (!type) {
    throw new Error('type missing');
  }
  if (!dynamic) {
    throw new Error('dynamic missing');
  }
  if (!precision) {
    throw new Error('precision missing');
  }
  if (value.type) {
    type = value.type;
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
  lookupKernelValueType,
  kernelValueMaps,
};