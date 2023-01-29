import { WebGLKernelValueBoolean } from './kernel-value/boolean';
import { WebGLKernelValueFloat } from './kernel-value/float';
import { WebGLKernelValueInteger } from './kernel-value/integer';

import { WebGLKernelValueHTMLImage } from './kernel-value/html-image';
import { WebGLKernelValueDynamicHTMLImage } from './kernel-value/dynamic-html-image';

import { WebGLKernelValueHTMLVideo } from './kernel-value/html-video';
import { WebGLKernelValueDynamicHTMLVideo } from './kernel-value/dynamic-html-video';

import { WebGLKernelValueSingleInput } from './kernel-value/single-input';
import { WebGLKernelValueDynamicSingleInput } from './kernel-value/dynamic-single-input';

import { WebGLKernelValueUnsignedInput } from './kernel-value/unsigned-input';
import { WebGLKernelValueDynamicUnsignedInput } from './kernel-value/dynamic-unsigned-input';

import { WebGLKernelValueMemoryOptimizedNumberTexture } from './kernel-value/memory-optimized-number-texture';
import { WebGLKernelValueDynamicMemoryOptimizedNumberTexture } from './kernel-value/dynamic-memory-optimized-number-texture';

import { WebGLKernelValueNumberTexture } from './kernel-value/number-texture';
import { WebGLKernelValueDynamicNumberTexture } from './kernel-value/dynamic-number-texture';

import { WebGLKernelValueSingleArray } from './kernel-value/single-array';
import { WebGLKernelValueDynamicSingleArray } from './kernel-value/dynamic-single-array';

import { WebGLKernelValueSingleArray1DI } from './kernel-value/single-array1d-i';
import { WebGLKernelValueDynamicSingleArray1DI } from './kernel-value/dynamic-single-array1d-i';

import { WebGLKernelValueSingleArray2DI } from './kernel-value/single-array2d-i';
import { WebGLKernelValueDynamicSingleArray2DI } from './kernel-value/dynamic-single-array2d-i';

import { WebGLKernelValueSingleArray3DI } from './kernel-value/single-array3d-i';
import { WebGLKernelValueDynamicSingleArray3DI } from './kernel-value/dynamic-single-array3d-i';

import { WebGLKernelValueArray2 } from './kernel-value/array2';
import { WebGLKernelValueArray3 } from './kernel-value/array3';
import { WebGLKernelValueArray4 } from './kernel-value/array4';

import { WebGLKernelValueUnsignedArray } from './kernel-value/unsigned-array';
import { WebGLKernelValueDynamicUnsignedArray } from './kernel-value/dynamic-unsigned-array';

export const kernelValueMaps = {
  unsigned: {
    dynamic: {
      Boolean: WebGLKernelValueBoolean,
      Integer: WebGLKernelValueInteger,
      Float: WebGLKernelValueFloat,
      Array: WebGLKernelValueDynamicUnsignedArray,
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
      Input: WebGLKernelValueDynamicUnsignedInput,
      NumberTexture: WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(1)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(2)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(3)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(4)': WebGLKernelValueDynamicNumberTexture,
      MemoryOptimizedNumberTexture: WebGLKernelValueDynamicMemoryOptimizedNumberTexture,
      HTMLCanvas: WebGLKernelValueDynamicHTMLImage,
      OffscreenCanvas: WebGLKernelValueDynamicHTMLImage,
      HTMLImage: WebGLKernelValueDynamicHTMLImage,
      ImageBitmap: WebGLKernelValueDynamicHTMLImage,
      ImageData: WebGLKernelValueDynamicHTMLImage,
      HTMLImageArray: false,
      HTMLVideo: WebGLKernelValueDynamicHTMLVideo,
    },
    static: {
      Boolean: WebGLKernelValueBoolean,
      Float: WebGLKernelValueFloat,
      Integer: WebGLKernelValueInteger,
      Array: WebGLKernelValueUnsignedArray,
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
      Input: WebGLKernelValueUnsignedInput,
      NumberTexture: WebGLKernelValueNumberTexture,
      'ArrayTexture(1)': WebGLKernelValueNumberTexture,
      'ArrayTexture(2)': WebGLKernelValueNumberTexture,
      'ArrayTexture(3)': WebGLKernelValueNumberTexture,
      'ArrayTexture(4)': WebGLKernelValueNumberTexture,
      MemoryOptimizedNumberTexture: WebGLKernelValueMemoryOptimizedNumberTexture,
      HTMLCanvas: WebGLKernelValueHTMLImage,
      OffscreenCanvas: WebGLKernelValueHTMLImage,
      HTMLImage: WebGLKernelValueHTMLImage,
      ImageBitmap: WebGLKernelValueHTMLImage,
      ImageData: WebGLKernelValueHTMLImage,
      HTMLImageArray: false,
      HTMLVideo: WebGLKernelValueHTMLVideo,
    },
  },
  single: {
    dynamic: {
      Boolean: WebGLKernelValueBoolean,
      Integer: WebGLKernelValueInteger,
      Float: WebGLKernelValueFloat,
      Array: WebGLKernelValueDynamicSingleArray,
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
      Input: WebGLKernelValueDynamicSingleInput,
      NumberTexture: WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(1)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(2)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(3)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(4)': WebGLKernelValueDynamicNumberTexture,
      MemoryOptimizedNumberTexture: WebGLKernelValueDynamicMemoryOptimizedNumberTexture,
      HTMLCanvas: WebGLKernelValueDynamicHTMLImage,
      OffscreenCanvas: WebGLKernelValueDynamicHTMLImage,
      HTMLImage: WebGLKernelValueDynamicHTMLImage,
      ImageBitmap: WebGLKernelValueDynamicHTMLImage,
      ImageData: WebGLKernelValueDynamicHTMLImage,
      HTMLImageArray: false,
      HTMLVideo: WebGLKernelValueDynamicHTMLVideo,
    },
    static: {
      Boolean: WebGLKernelValueBoolean,
      Float: WebGLKernelValueFloat,
      Integer: WebGLKernelValueInteger,
      Array: WebGLKernelValueSingleArray,
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
      Input: WebGLKernelValueSingleInput,
      NumberTexture: WebGLKernelValueNumberTexture,
      'ArrayTexture(1)': WebGLKernelValueNumberTexture,
      'ArrayTexture(2)': WebGLKernelValueNumberTexture,
      'ArrayTexture(3)': WebGLKernelValueNumberTexture,
      'ArrayTexture(4)': WebGLKernelValueNumberTexture,
      MemoryOptimizedNumberTexture: WebGLKernelValueMemoryOptimizedNumberTexture,
      HTMLCanvas: WebGLKernelValueHTMLImage,
      OffscreenCanvas: WebGLKernelValueHTMLImage,
      HTMLImage: WebGLKernelValueHTMLImage,
      ImageBitmap: WebGLKernelValueHTMLImage,
      ImageData: WebGLKernelValueHTMLImage,
      HTMLImageArray: false,
      HTMLVideo: WebGLKernelValueHTMLVideo,
    },
  },
};

export function lookupKernelValueType(type, dynamic, precision, value) {
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
    throw new Error(`Could not find a KernelValue for ${type}`);
  }
  return types[type];
}
