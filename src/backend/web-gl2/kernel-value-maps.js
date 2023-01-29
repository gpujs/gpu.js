import { WebGL2KernelValueBoolean } from './kernel-value/boolean';
import { WebGL2KernelValueFloat } from './kernel-value/float';
import { WebGL2KernelValueInteger } from './kernel-value/integer';

import { WebGL2KernelValueHTMLImage } from './kernel-value/html-image';
import { WebGL2KernelValueDynamicHTMLImage } from './kernel-value/dynamic-html-image';

import { WebGL2KernelValueHTMLImageArray } from './kernel-value/html-image-array';
import { WebGL2KernelValueDynamicHTMLImageArray } from './kernel-value/dynamic-html-image-array';

import { WebGL2KernelValueHTMLVideo } from './kernel-value/html-video';
import { WebGL2KernelValueDynamicHTMLVideo } from './kernel-value/dynamic-html-video';

import { WebGL2KernelValueSingleInput } from './kernel-value/single-input';
import { WebGL2KernelValueDynamicSingleInput } from './kernel-value/dynamic-single-input';

import { WebGL2KernelValueUnsignedInput } from './kernel-value/unsigned-input';
import { WebGL2KernelValueDynamicUnsignedInput } from './kernel-value/dynamic-unsigned-input';

import { WebGL2KernelValueMemoryOptimizedNumberTexture } from './kernel-value/memory-optimized-number-texture';
import { WebGL2KernelValueDynamicMemoryOptimizedNumberTexture } from './kernel-value/dynamic-memory-optimized-number-texture';

import { WebGL2KernelValueNumberTexture } from './kernel-value/number-texture';
import { WebGL2KernelValueDynamicNumberTexture } from './kernel-value/dynamic-number-texture';

import { WebGL2KernelValueSingleArray } from './kernel-value/single-array';
import { WebGL2KernelValueDynamicSingleArray } from './kernel-value/dynamic-single-array';

import { WebGL2KernelValueSingleArray1DI } from './kernel-value/single-array1d-i';
import { WebGL2KernelValueDynamicSingleArray1DI } from './kernel-value/dynamic-single-array1d-i';

import { WebGL2KernelValueSingleArray2DI } from './kernel-value/single-array2d-i';
import { WebGL2KernelValueDynamicSingleArray2DI } from './kernel-value/dynamic-single-array2d-i';

import { WebGL2KernelValueSingleArray3DI } from './kernel-value/single-array3d-i';
import { WebGL2KernelValueDynamicSingleArray3DI } from './kernel-value/dynamic-single-array3d-i';

import { WebGL2KernelValueArray2 } from './kernel-value/array2';
import { WebGL2KernelValueArray3 } from './kernel-value/array3';
import { WebGL2KernelValueArray4 } from './kernel-value/array4';

import { WebGL2KernelValueUnsignedArray } from './kernel-value/unsigned-array';
import { WebGL2KernelValueDynamicUnsignedArray } from './kernel-value/dynamic-unsigned-array';

export const kernelValueMaps = {
  unsigned: {
    dynamic: {
      Boolean: WebGL2KernelValueBoolean,
      Integer: WebGL2KernelValueInteger,
      Float: WebGL2KernelValueFloat,
      Array: WebGL2KernelValueDynamicUnsignedArray,
      'Array(2)': WebGL2KernelValueArray2,
      'Array(3)': WebGL2KernelValueArray3,
      'Array(4)': WebGL2KernelValueArray4,
      'Array1D(2)': false,
      'Array1D(3)': false,
      'Array1D(4)': false,
      'Array2D(2)': false,
      'Array2D(3)': false,
      'Array2D(4)': false,
      'Array3D(2)': false,
      'Array3D(3)': false,
      'Array3D(4)': false,
      Input: WebGL2KernelValueDynamicUnsignedInput,
      NumberTexture: WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(1)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(2)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(3)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(4)': WebGL2KernelValueDynamicNumberTexture,
      MemoryOptimizedNumberTexture: WebGL2KernelValueDynamicMemoryOptimizedNumberTexture,
      HTMLCanvas: WebGL2KernelValueDynamicHTMLImage,
      OffscreenCanvas: WebGL2KernelValueDynamicHTMLImage,
      HTMLImage: WebGL2KernelValueDynamicHTMLImage,
      ImageBitmap: WebGL2KernelValueDynamicHTMLImage,
      ImageData: WebGL2KernelValueDynamicHTMLImage,
      HTMLImageArray: WebGL2KernelValueDynamicHTMLImageArray,
      HTMLVideo: WebGL2KernelValueDynamicHTMLVideo,
    },
    static: {
      Boolean: WebGL2KernelValueBoolean,
      Float: WebGL2KernelValueFloat,
      Integer: WebGL2KernelValueInteger,
      Array: WebGL2KernelValueUnsignedArray,
      'Array(2)': WebGL2KernelValueArray2,
      'Array(3)': WebGL2KernelValueArray3,
      'Array(4)': WebGL2KernelValueArray4,
      'Array1D(2)': false,
      'Array1D(3)': false,
      'Array1D(4)': false,
      'Array2D(2)': false,
      'Array2D(3)': false,
      'Array2D(4)': false,
      'Array3D(2)': false,
      'Array3D(3)': false,
      'Array3D(4)': false,
      Input: WebGL2KernelValueUnsignedInput,
      NumberTexture: WebGL2KernelValueNumberTexture,
      'ArrayTexture(1)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(2)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(3)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(4)': WebGL2KernelValueNumberTexture,
      MemoryOptimizedNumberTexture: WebGL2KernelValueDynamicMemoryOptimizedNumberTexture,
      HTMLCanvas: WebGL2KernelValueHTMLImage,
      OffscreenCanvas: WebGL2KernelValueHTMLImage,
      HTMLImage: WebGL2KernelValueHTMLImage,
      ImageBitmap: WebGL2KernelValueHTMLImage,
      ImageData: WebGL2KernelValueHTMLImage,
      HTMLImageArray: WebGL2KernelValueHTMLImageArray,
      HTMLVideo: WebGL2KernelValueHTMLVideo,
    },
  },
  single: {
    dynamic: {
      Boolean: WebGL2KernelValueBoolean,
      Integer: WebGL2KernelValueInteger,
      Float: WebGL2KernelValueFloat,
      Array: WebGL2KernelValueDynamicSingleArray,
      'Array(2)': WebGL2KernelValueArray2,
      'Array(3)': WebGL2KernelValueArray3,
      'Array(4)': WebGL2KernelValueArray4,
      'Array1D(2)': WebGL2KernelValueDynamicSingleArray1DI,
      'Array1D(3)': WebGL2KernelValueDynamicSingleArray1DI,
      'Array1D(4)': WebGL2KernelValueDynamicSingleArray1DI,
      'Array2D(2)': WebGL2KernelValueDynamicSingleArray2DI,
      'Array2D(3)': WebGL2KernelValueDynamicSingleArray2DI,
      'Array2D(4)': WebGL2KernelValueDynamicSingleArray2DI,
      'Array3D(2)': WebGL2KernelValueDynamicSingleArray3DI,
      'Array3D(3)': WebGL2KernelValueDynamicSingleArray3DI,
      'Array3D(4)': WebGL2KernelValueDynamicSingleArray3DI,
      Input: WebGL2KernelValueDynamicSingleInput,
      NumberTexture: WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(1)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(2)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(3)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(4)': WebGL2KernelValueDynamicNumberTexture,
      MemoryOptimizedNumberTexture: WebGL2KernelValueDynamicMemoryOptimizedNumberTexture,
      HTMLCanvas: WebGL2KernelValueDynamicHTMLImage,
      OffscreenCanvas: WebGL2KernelValueDynamicHTMLImage,
      HTMLImage: WebGL2KernelValueDynamicHTMLImage,
      ImageBitmap: WebGL2KernelValueDynamicHTMLImage,
      ImageData: WebGL2KernelValueDynamicHTMLImage,
      HTMLImageArray: WebGL2KernelValueDynamicHTMLImageArray,
      HTMLVideo: WebGL2KernelValueDynamicHTMLVideo,
    },
    static: {
      Boolean: WebGL2KernelValueBoolean,
      Float: WebGL2KernelValueFloat,
      Integer: WebGL2KernelValueInteger,
      Array: WebGL2KernelValueSingleArray,
      'Array(2)': WebGL2KernelValueArray2,
      'Array(3)': WebGL2KernelValueArray3,
      'Array(4)': WebGL2KernelValueArray4,
      'Array1D(2)': WebGL2KernelValueSingleArray1DI,
      'Array1D(3)': WebGL2KernelValueSingleArray1DI,
      'Array1D(4)': WebGL2KernelValueSingleArray1DI,
      'Array2D(2)': WebGL2KernelValueSingleArray2DI,
      'Array2D(3)': WebGL2KernelValueSingleArray2DI,
      'Array2D(4)': WebGL2KernelValueSingleArray2DI,
      'Array3D(2)': WebGL2KernelValueSingleArray3DI,
      'Array3D(3)': WebGL2KernelValueSingleArray3DI,
      'Array3D(4)': WebGL2KernelValueSingleArray3DI,
      Input: WebGL2KernelValueSingleInput,
      NumberTexture: WebGL2KernelValueNumberTexture,
      'ArrayTexture(1)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(2)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(3)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(4)': WebGL2KernelValueNumberTexture,
      MemoryOptimizedNumberTexture: WebGL2KernelValueMemoryOptimizedNumberTexture,
      HTMLCanvas: WebGL2KernelValueHTMLImage,
      OffscreenCanvas: WebGL2KernelValueHTMLImage,
      HTMLImage: WebGL2KernelValueHTMLImage,
      ImageBitmap: WebGL2KernelValueHTMLImage,
      ImageData: WebGL2KernelValueHTMLImage,
      HTMLImageArray: WebGL2KernelValueHTMLImageArray,
      HTMLVideo: WebGL2KernelValueHTMLVideo,
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
