const { WebGL2KernelValueBoolean } = require('./kernel-value/boolean');
const { WebGL2KernelValueFloat } = require('./kernel-value/float');
const { WebGL2KernelValueInteger } = require('./kernel-value/integer');

const { WebGL2KernelValueHTMLImage } = require('./kernel-value/html-image');
const { WebGL2KernelValueDynamicHTMLImage } = require('./kernel-value/dynamic-html-image');

const { WebGL2KernelValueHTMLImageArray } = require('./kernel-value/html-image-array');
const { WebGL2KernelValueDynamicHTMLImageArray } = require('./kernel-value/dynamic-html-image-array');

const { WebGL2KernelValueHTMLVideo } = require('./kernel-value/html-video');
const { WebGL2KernelValueDynamicHTMLVideo } = require('./kernel-value/dynamic-html-video');

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

const { WebGL2KernelValueSingleArray1DI } = require('./kernel-value/single-array1d-i');
const { WebGL2KernelValueDynamicSingleArray1DI } = require('./kernel-value/dynamic-single-array1d-i');

const { WebGL2KernelValueSingleArray2DI } = require('./kernel-value/single-array2d-i');
const { WebGL2KernelValueDynamicSingleArray2DI } = require('./kernel-value/dynamic-single-array2d-i');

const { WebGL2KernelValueSingleArray3DI } = require('./kernel-value/single-array3d-i');
const { WebGL2KernelValueDynamicSingleArray3DI } = require('./kernel-value/dynamic-single-array3d-i');

const { WebGL2KernelValueSingleArray2 } = require('./kernel-value/single-array2');
const { WebGL2KernelValueSingleArray3 } = require('./kernel-value/single-array3');
const { WebGL2KernelValueSingleArray4 } = require('./kernel-value/single-array4');

const { WebGL2KernelValueUnsignedArray } = require('./kernel-value/unsigned-array');
const { WebGL2KernelValueDynamicUnsignedArray } = require('./kernel-value/dynamic-unsigned-array');

const kernelValueMaps = {
  unsigned: {
    dynamic: {
      'Boolean': WebGL2KernelValueBoolean,
      'Integer': WebGL2KernelValueInteger,
      'Float': WebGL2KernelValueFloat,
      'Array': WebGL2KernelValueDynamicUnsignedArray,
      'Array(2)': false,
      'Array(3)': false,
      'Array(4)': false,
      'Array1D(2)': false,
      'Array1D(3)': false,
      'Array1D(4)': false,
      'Array2D(2)': false,
      'Array2D(3)': false,
      'Array2D(4)': false,
      'Array3D(2)': false,
      'Array3D(3)': false,
      'Array3D(4)': false,
      'Input': WebGL2KernelValueDynamicUnsignedInput,
      'NumberTexture': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(1)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(2)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(3)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(4)': WebGL2KernelValueDynamicNumberTexture,
      'MemoryOptimizedNumberTexture': WebGL2KernelValueDynamicMemoryOptimizedNumberTexture,
      'HTMLCanvas': WebGL2KernelValueDynamicHTMLImage,
      'HTMLImage': WebGL2KernelValueDynamicHTMLImage,
      'HTMLImageArray': WebGL2KernelValueDynamicHTMLImageArray,
      'HTMLVideo': WebGL2KernelValueDynamicHTMLVideo,
    },
    static: {
      'Boolean': WebGL2KernelValueBoolean,
      'Float': WebGL2KernelValueFloat,
      'Integer': WebGL2KernelValueInteger,
      'Array': WebGL2KernelValueUnsignedArray,
      'Array(2)': false,
      'Array(3)': false,
      'Array(4)': false,
      'Array1D(2)': false,
      'Array1D(3)': false,
      'Array1D(4)': false,
      'Array2D(2)': false,
      'Array2D(3)': false,
      'Array2D(4)': false,
      'Array3D(2)': false,
      'Array3D(3)': false,
      'Array3D(4)': false,
      'Input': WebGL2KernelValueUnsignedInput,
      'NumberTexture': WebGL2KernelValueNumberTexture,
      'ArrayTexture(1)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(2)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(3)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(4)': WebGL2KernelValueNumberTexture,
      'MemoryOptimizedNumberTexture': WebGL2KernelValueDynamicMemoryOptimizedNumberTexture,
      'HTMLCanvas': WebGL2KernelValueHTMLImage,
      'HTMLImage': WebGL2KernelValueHTMLImage,
      'HTMLImageArray': WebGL2KernelValueHTMLImageArray,
      'HTMLVideo': WebGL2KernelValueHTMLVideo,
    }
  },
  single: {
    dynamic: {
      'Boolean': WebGL2KernelValueBoolean,
      'Integer': WebGL2KernelValueInteger,
      'Float': WebGL2KernelValueFloat,
      'Array': WebGL2KernelValueDynamicSingleArray,
      'Array(2)': WebGL2KernelValueSingleArray2,
      'Array(3)': WebGL2KernelValueSingleArray3,
      'Array(4)': WebGL2KernelValueSingleArray4,
      'Array1D(2)': WebGL2KernelValueDynamicSingleArray1DI,
      'Array1D(3)': WebGL2KernelValueDynamicSingleArray1DI,
      'Array1D(4)': WebGL2KernelValueDynamicSingleArray1DI,
      'Array2D(2)': WebGL2KernelValueDynamicSingleArray2DI,
      'Array2D(3)': WebGL2KernelValueDynamicSingleArray2DI,
      'Array2D(4)': WebGL2KernelValueDynamicSingleArray2DI,
      'Array3D(2)': WebGL2KernelValueDynamicSingleArray3DI,
      'Array3D(3)': WebGL2KernelValueDynamicSingleArray3DI,
      'Array3D(4)': WebGL2KernelValueDynamicSingleArray3DI,
      'Input': WebGL2KernelValueDynamicSingleInput,
      'NumberTexture': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(1)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(2)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(3)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(4)': WebGL2KernelValueDynamicNumberTexture,
      'MemoryOptimizedNumberTexture': WebGL2KernelValueDynamicMemoryOptimizedNumberTexture,
      'HTMLCanvas': WebGL2KernelValueDynamicHTMLImage,
      'HTMLImage': WebGL2KernelValueDynamicHTMLImage,
      'HTMLImageArray': WebGL2KernelValueDynamicHTMLImageArray,
      'HTMLVideo': WebGL2KernelValueDynamicHTMLVideo,
    },
    static: {
      'Boolean': WebGL2KernelValueBoolean,
      'Float': WebGL2KernelValueFloat,
      'Integer': WebGL2KernelValueInteger,
      'Array': WebGL2KernelValueSingleArray,
      'Array(2)': WebGL2KernelValueSingleArray2,
      'Array(3)': WebGL2KernelValueSingleArray3,
      'Array(4)': WebGL2KernelValueSingleArray4,
      'Array1D(2)': WebGL2KernelValueSingleArray1DI,
      'Array1D(3)': WebGL2KernelValueSingleArray1DI,
      'Array1D(4)': WebGL2KernelValueSingleArray1DI,
      'Array2D(2)': WebGL2KernelValueSingleArray2DI,
      'Array2D(3)': WebGL2KernelValueSingleArray2DI,
      'Array2D(4)': WebGL2KernelValueSingleArray2DI,
      'Array3D(2)': WebGL2KernelValueSingleArray3DI,
      'Array3D(3)': WebGL2KernelValueSingleArray3DI,
      'Array3D(4)': WebGL2KernelValueSingleArray3DI,
      'Input': WebGL2KernelValueSingleInput,
      'NumberTexture': WebGL2KernelValueNumberTexture,
      'ArrayTexture(1)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(2)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(3)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(4)': WebGL2KernelValueNumberTexture,
      'MemoryOptimizedNumberTexture': WebGL2KernelValueMemoryOptimizedNumberTexture,
      'HTMLCanvas': WebGL2KernelValueHTMLImage,
      'HTMLImage': WebGL2KernelValueHTMLImage,
      'HTMLImageArray': WebGL2KernelValueHTMLImageArray,
      'HTMLVideo': WebGL2KernelValueHTMLVideo,
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
  kernelValueMaps,
  lookupKernelValueType
};