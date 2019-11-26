[![Logo](http://gpu.rocks/img/ogimage.png)](http://gpu.rocks/)


# GPU.js
GPU.js is a JavaScript Acceleration library for GPGPU (General purpose computing on GPUs) in JavaScript for Web and Node.
GPU.js automatically transpiles simple JavaScript functions into shader language and compiles them so they run on your GPU.
In case a GPU is not available, the functions will still run in regular JavaScript.
For some more quick concepts, see [Quick Concepts](https://github.com/gpujs/gpu.js/wiki/Quick-Concepts) on the wiki.


[![Join the chat at https://gitter.im/gpujs/gpu.js](https://badges.gitter.im/gpujs/gpu.js.svg)](https://gitter.im/gpujs/gpu.js?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Slack](https://slack.bri.im/badge.svg)](https://slack.bri.im)

# What is this sorcery?

Creates a GPU accelerated kernel transpiled from a javascript function that computes a single element in the 512 x 512 matrix (2D array).
The kernel functions are ran in tandem on the GPU often resulting in very fast computations!
You can run a benchmark of this [here](http://gpu.rocks). Typically, it will run 1-15x faster depending on your hardware.
You can experiment around with the [kernel playground here](http://gpu.rocks/playground)
Matrix multiplication (perform matrix multiplication on 2 matrices of size 512 x 512) written in GPU.js:

## Browser
```html
<script src="dist/gpu-browser.min.js"></script>
<script>
    // GPU is a constructor and namespace for browser
    const gpu = new GPU();
    const multiplyMatrix = gpu.createKernel(function(a, b) {
        let sum = 0;
        for (let i = 0; i < 512; i++) {
            sum += a[this.thread.y][i] * b[i][this.thread.x];
        }
        return sum;
    }).setOutput([512, 512]);

    const c = multiplyMatrix(a, b);
</script>
```

## Node
```js
const { GPU } = require('gpu.js');
const gpu = new GPU();
const multiplyMatrix = gpu.createKernel(function(a, b) {
    let sum = 0;
    for (let i = 0; i < 512; i++) {
        sum += a[this.thread.y][i] * b[i][this.thread.x];
    }
    return sum;
}).setOutput([512, 512]);

const c = multiplyMatrix(a, b);
```

## Typescript
```typescript
import { GPU } from 'gpu.js';
const gpu = new GPU();
const multiplyMatrix = gpu.createKernel(function(a: number[][], b: number[][]) {
  let sum = 0;
  for (let i = 0; i < 512; i++) {
    sum += a[this.thread.y][i] * b[i][this.thread.x];
  }
  return sum;
}).setOutput([512, 512]);

const c = multiplyMatrix(a, b) as number[][];
```

# Table of Contents

NOTE: documentation is slightly out of date for the upcoming release of v2.  We will fix it!  In the mean time, if you'd like to assist (PLEASE) let us know.

* [Installation](#installation)
* [`GPU` Settings](#gpu-settings)
* [`gpu.createKernel` Settings](#gpucreatekernel-settings)
* [Creating and Running Functions](#creating-and-running-functions)
* [Debugging](#debugging)
* [Accepting Input](#accepting-input)
* [Graphical Output](#graphical-output)
* [Combining Kernels](#combining-kernels)
* [Create Kernel Map](#create-kernel-map)
* [Adding Custom Functions](#adding-custom-functions)
* [Adding Custom Functions Directly to Kernel](#adding-custom-functions-directly-to-kernel)
* [Types](#types)
* [Loops](#loops)
* [Pipelining](#pipelining)
  * [Cloning Textures](#cloning-textures-new-in-v2)
* [Offscreen Canvas](#offscreen-canvas)
* [Cleanup](#cleanup)
* [Flattened typed array support](#flattened-typed-array-support)
* [Precompiled and Lighter Weight Kernels](#precompiled-and-lighter-weight-kernels)
  * [using JSON](#using-json)
  * [Exporting kernel](#exporting-kernel)
* [Supported Math functions](#supported-math-functions)
* [How to check what is supported](#how-to-check-what-is-supported)
* [Typescript Typings](#typescript-typings)
* [Destructured Assignments](#destructured-assignments-new-in-v2)
* [Dealing With Transpilation](#dealing-with-transpilation)
* [Full API reference](#full-api-reference)
* [How possible in node](#how-possible-in-node)
* [Testing](#testing)
* [Building](#building)
* [Contributors](#contributors)
* [Contributing](#contributing)
* [Terms Explained](#terms-explained)
* [License](#license)

## Installation
On Linux, ensure you have the correct header files installed: `sudo apt install mesa-common-dev libxi-dev` (adjust for your distribution)

### npm

```bash
npm install gpu.js --save
```

### yarn

```bash
yarn add gpu.js
```

[npm package](https://www.npmjs.com/package/gpu.js)
### Node
```js
const { GPU } = require('gpu.js');
const gpu = new GPU();
```

### Node Typescript **New in V2!**
```js
import { GPU } from 'gpu.js';
const gpu = new GPU();
```

### Browser

Download the latest version of GPU.js and include the files in your HTML page using the following tags:

```html
<script src="dist/gpu-browser.min.js"></script>
<script>
    const gpu = new GPU();
</script>
```

## `GPU` Settings
Settings are an object used to create an instance of `GPU`.  Example: `new GPU(settings)`
* `canvas`: `HTMLCanvasElement`.  Optional.  For sharing canvas.  Example: use THREE.js and GPU.js on same canvas.
* `context`: `WebGL2RenderingContext` or `WebGLRenderingContext`.  For sharing rendering context.  Example: use THREE.js and GPU.js on same rendering context.
* `mode`: Defaults to 'gpu', other values generally for debugging:
  * 'dev' **New in V2!**: VERY IMPORTANT!  Use this so you can breakpoint and debug your kernel!  This wraps your javascript in loops but DOES NOT transpile your code, so debugging is much easier.
  * 'webgl': Use the `WebGLKernel` for transpiling a kernel
  * 'webgl2': Use the `WebGL2Kernel` for transpiling a kernel
  * 'headlessgl' **New in V2!**: Use the `HeadlessGLKernel` for transpiling a kernel
  * 'cpu': Use the `CPUKernel` for transpiling a kernel
* `onIstanbulCoverageVariable`: For testing. Used for when coverage is inject into function values, and is desired to be preserved (`cpu` mode ONLY).
  Use like this:
  ```js
  const { getFileCoverageDataByName } = require('istanbul-spy');
  const gpu = new GPU({
    mode: 'cpu',
    onIstanbulCoverageVariable: (name, kernel) => {
      const data = getFileCoverageDataByName(name);
      if (!data) {
        throw new Error(`Could not find istanbul identifier ${name}`);
      }
      const { path } = getFileCoverageDataByName(name);
      const variable = `const ${name} = __coverage__['${path}'];\n`;
      if (!kernel.hasPrependString(variable)) {
        kernel.prependString(variable);
      }
    }
  });
  ```
* `removeIstanbulCoverage`: Boolean. For testing and code coverage. Removes istanbul artifacts that were injected at testing runtime.

## `gpu.createKernel` Settings
Settings are an object used to create a `kernel` or `kernelMap`.  Example: `gpu.createKernel(settings)`
* `output` or `kernel.setOutput(output)`: `array` or `object` that describes the output of kernel.  When using `kernel.setOutput()` you _can_ call it after the kernel has compiled if `kernel.dynamicOutput` is `true`, to resize your output.  Example:
  * as array: `[width]`, `[width, height]`, or `[width, height, depth]`
  * as object: `{ x: width, y: height, z: depth }`
* `pipeline` or `kernel.setPipeline(true)` **New in V2!**: boolean, default = `false`
  * Causes `kernel()` calls to output a `Texture`.  To get array's from a `Texture`, use:
  ```js
  const result = kernel();
  result.toArray();
  ```
  * Can be passed _directly_ into kernels, and is preferred:
  ```js
  kernel(texture);
  ```
* `graphical` or `kernel.setGraphical(boolean)`: boolean, default = `false`
* `loopMaxIterations` or `kernel.setLoopMaxIterations(number)`: number, default = 1000
* `constants` or `kernel.setConstants(object)`: object, default = null
* `dynamicOutput` or `kernel.setDynamicOutput(boolean)`: boolean, default = false - turns dynamic output on or off
* `dynamicArguments` or `kernel.setDynamicArguments(boolean)`: boolean, default = false - turns dynamic arguments (use different size arrays and textures) on or off
* `optimizeFloatMemory` or `kernel.setOptimizeFloatMemory(boolean)` **New in V2!**: boolean - causes a float32 texture to use all 4 channels rather than 1, using less memory, but consuming more GPU.
* `precision` or `kernel.setPrecision('unsigned' | 'single')` **New in V2!**: 'single' or 'unsigned' - if 'single' output texture uses float32 for each colour channel rather than 8
* `fixIntegerDivisionAccuracy` or `kernel.setFixIntegerDivisionAccuracy(boolean)` : boolean - some cards have accuracy issues dividing by factors of three and some other primes (most apple kit?). Default on for affected cards, disable if accuracy not required.
* `functions` or `kernel.setFunctions(object)`: array, array of functions to be used inside kernel.  If undefined, inherits from `GPU` instance.
* `nativeFunctions` or `kernel.setNativeFunctions(object)`: object, defined as: `{ name: string, source: string, settings: object }`.  This is generally set via using GPU.addNativeFunction()
  * VERY IMPORTANT! - Use this to add special native functions to your environment when you need specific functionality is needed.
* `injectedNative` or `kernel.setInjectedNative(string)` **New in V2!**: string, defined as: `{ functionName: functionSource }`.  This is for injecting native code before translated kernel functions.
* `subKernels` or `kernel.setSubKernels(array)`: array, generally inherited from `GPU` instance.
* `immutable` or `kernel.setImmutable(boolean)`: boolean, default = `false`
* `strictIntegers` or `kernel.setStrictIntegers(boolean)`: boolean, default = `false` - allows undefined argumentTypes and function return values to use strict integer declarations.
* `useLegacyEncoder` or `kernel.setUseLegacyEncoder(boolean)`: boolean, default `false` - more info [here](https://github.com/gpujs/gpu.js/wiki/Encoder-details).
* `warnVarUsage` or `kernel.setWarnVarUsage(boolean)`: turn off var usage warnings, they can be irritating, and in transpiled environments, there is nothing we can do about it.
* `tactic` or `kernel.setTactic('speed' | 'balanced' | 'precision')` **New in V2!**: Set the kernel's tactic for compilation.  Allows for compilation to better fit how GPU.js is being used (internally uses `lowp` for 'speed', `mediump` for 'balanced', and `highp` for 'precision').  Default is lowest resolution supported for output.


## Creating and Running Functions
Depending on your output type, specify the intended size of your output.
You cannot have an accelerated function that does not specify any output size.

Output size   |  How to specify output size   |  How to reference in kernel
--------------|-------------------------------|--------------------------------
 1D           | `[length]`                    |  `value[this.thread.x]`
 2D           | `[width, height]`             |  `value[this.thread.y][this.thread.x]`
 3D           | `[width, height, depth]`      |  `value[this.thread.z][this.thread.y][this.thread.x]`

```js
const settings = {
    output: [100]
};
```

or

```js
// You can also use x, y, and z
const settings = {
    output: { x: 100 }
};
```

Create the function you want to run on the GPU. The first input parameter to `createKernel` is a kernel function which will compute a single number in the output. The thread identifiers, `this.thread.x`, `this.thread.y` or `this.thread.z` will allow you to specify the appropriate behavior of the kernel function at specific positions of the output.

```js
const kernel = gpu.createKernel(function() {
    return this.thread.x;
}, settings);
```

The created function is a regular JavaScript function, and you can use it like one.

```js
kernel();
// Result: Float32Array[0, 1, 2, 3, ... 99]
```

Note: Instead of creating an object, you can use the chainable shortcut methods as a neater way of specifying settings.

```js
const kernel = gpu.createKernel(function() {
    return this.thread.x;
}).setOutput([100]);

kernel();
// Result: Float32Array[0, 1, 2, 3, ... 99]
```

### Declaring variables

GPU.js makes variable declaration inside kernel functions easy.  Variable types supported are:
Numbers
Array(2)
Array(3)
Array(4)

Numbers example:
```js
 const kernel = gpu.createKernel(function() {
     const i = 1;
     const j = 0.89;
     return i + j;
 }).setOutput([100]);
```

Array(2) examples:
Using declaration
```js
 const kernel = gpu.createKernel(function() {
     const array2 = [0.08, 2];
     return array2;
 }).setOutput([100]);
```

Directly returned
```js
 const kernel = gpu.createKernel(function() {
     return [0.08, 2];
 }).setOutput([100]);
```

Array(3) example:
Using declaration
```js
 const kernel = gpu.createKernel(function() {
     const array2 = [0.08, 2, 0.1];
     return array2;
 }).setOutput([100]);
```

Directly returned
```js
 const kernel = gpu.createKernel(function() {
     return [0.08, 2, 0.1];
 }).setOutput([100]);
```

Array(4) example:
Using declaration
```js
 const kernel = gpu.createKernel(function() {
     const array2 = [0.08, 2, 0.1, 3];
     return array2;
 }).setOutput([100]);
```

Directly returned
```js
 const kernel = gpu.createKernel(function() {
     return [0.08, 2, 0.1, 3];
 }).setOutput([100]);
```
## Debugging
Debugging can be done in a variety of ways, and there are different levels of debugging.
* Debugging kernels with breakpoints can be done with `new GPU({ mode: 'dev' })`
  * This puts `GPU.js` into development mode.  Here you can insert breakpoints, and be somewhat liberal in how your kernel is developed.
  * This mode _does not_ actually "compile" (parse, and eval) a kernel, it simply iterates on your code.
  * You can break a lot of rules here, because your kernel's function still has context of the state it came from.
  * PLEASE NOTE: Mapped kernels are not supported in this mode.  They simply cannot work because of context.
  * Example:
    ```js
    const gpu = new GPU({ mode: 'dev' });
    const kernel = gpu.createKernel(function(arg1, time) {
        // put a breakpoint on the next line, and watch it get hit
        const v = arg1[this.thread.y][this.thread.x * time];
        return v;
    }, { output: [100, 100] });
    ```
* Debugging actual kernels on CPU with `debugger`:
  * This will cause "breakpoint" like behaviour, but in an actual CPU kernel.  You'll peer into the compiled kernel here, for a CPU.
  * Example:
    ```js
    const gpu = new GPU({ mode: 'cpu' });
    const kernel = gpu.createKernel(function(arg1, time) {
        debugger; // <--NOTICE THIS, IMPORTANT!
        const v = arg1[this.thread.y][this.thread.x * time];
        return v;
    }, { output: [100, 100] });
    ```
* Debugging an actual GPU kernel:
  * There are no breakpoints available on the GPU, period.  By providing the same level of abstraction and logic, the above methods should give you enough insight to debug, but sometimes we just need to see what is on the GPU.
  * Be VERY specific and deliberate, and use the kernel to your advantage, rather than just getting frustrated or giving up.
  * Example:
    ```js
    const gpu = new GPU({ mode: 'cpu' });
    const kernel = gpu.createKernel(function(arg1, time) {
      const x = this.thread.x * time;
      return x; // <--NOTICE THIS, IMPORTANT!
      const v = arg1[this.thread.y][x];
      return v;
    }, { output: [100, 100] });
    ```
    In this example, we return early the value of x, to see exactly what it is.  The rest of the logic is ignored, but now you can see the value that is calculated from `x`, and debug it.
    This is an overly simplified problem.
  * Sometimes you need to solve graphical problems, that can be done similarly.
  * Example:
    ```js
    const gpu = new GPU({ mode: 'cpu' });
    const kernel = gpu.createKernel(function(arg1, time) {
      const x = this.thread.x * time;
      if (x < 4 || x > 2) {
        // RED
        this.color(1, 0, 0); // <--NOTICE THIS, IMPORTANT!
        return;
      }
      if (x > 6 && x < 12) {
        // GREEN
        this.color(0, 1, 0); // <--NOTICE THIS, IMPORTANT!
        return;
      }
      const v = arg1[this.thread.y][x];
      return v;
    }, { output: [100, 100], graphical: true });
    ```
    Here we are making the canvas red or green depending on the value of `x`.

## Accepting Input
### Supported Input Types
* Numbers
* 1d,2d, or 3d Array of numbers
  * Arrays of `Array`, `Float32Array`, `Int16Array`, `Int8Array`, `Uint16Array`, `uInt8Array`
* Pre-flattened 2d or 3d Arrays using 'Input', for faster upload of arrays
  * Example:
  ```js
  const { input } = require('gpu.js');
  const value = input(flattenedArray, [width, height, depth]);
  ```
* HTML Image
* Array of HTML Images
* Video Element **New in V2!**
To define an argument, simply add it to the kernel function like regular JavaScript.

### Input Examples
```js
const kernel = gpu.createKernel(function(x) {
    return x;
}).setOutput([100]);

kernel(42);
// Result: Float32Array[42, 42, 42, 42, ... 42]
```

Similarly, with array inputs:

```js
const kernel = gpu.createKernel(function(x) {
    return x[this.thread.x % 3];
}).setOutput([100]);

kernel([1, 2, 3]);
// Result: Float32Array[1, 2, 3, 1, ... 1 ]
```

An HTML Image:

```js
const kernel = gpu.createKernel(function(image) {
    const pixel = image[this.thread.y][this.thread.x];
    this.color(pixel[0], pixel[1], pixel[2], pixel[3]);
})
  .setGraphical(true)
  .setOutput([100, 100]);

const image = new document.createElement('img');
image.src = 'my/image/source.png';
image.onload = () => {
  kernel(image);
  // Result: colorful image
};
```

An Array of HTML Images:

```js
const kernel = gpu.createKernel(function(image) {
    const pixel = image[this.thread.z][this.thread.y][this.thread.x];
    this.color(pixel[0], pixel[1], pixel[2], pixel[3]);
})
  .setGraphical(true)
  .setOutput([100, 100]);

const image1 = new document.createElement('img');
image1.src = 'my/image/source1.png';
image1.onload = onload;
const image2 = new document.createElement('img');
image2.src = 'my/image/source2.png';
image2.onload = onload;
const image3 = new document.createElement('img');
image3.src = 'my/image/source3.png';
image3.onload = onload;
const totalImages = 3;
let loadedImages = 0;
function onload() {
  loadedImages++;
  if (loadedImages === totalImages) {
    kernel([image1, image2, image3]);
    // Result: colorful image composed of many images
  }
};
```

An HTML Video: **New in V2!**

```js
const kernel = gpu.createKernel(function(videoFrame) {
    const pixel = videoFrame[this.thread.y][this.thread.x];
    this.color(pixel[0], pixel[1], pixel[2], pixel[3]);
})
  .setGraphical(true)
  .setOutput([100, 100]);

const video = new document.createElement('video');
video.src = 'my/video/source.webm';
kernel(image); //note, try and use requestAnimationFrame, and the video should be ready or playing
// Result: video frame
```

## Graphical Output

Sometimes, you want to produce a `canvas` image instead of doing numeric computations. To achieve this, set the `graphical` flag to `true` and the output dimensions to `[width, height]`. The thread identifiers will now refer to the `x` and `y` coordinate of the pixel you are producing. Inside your kernel function, use `this.color(r,g,b)` or `this.color(r,g,b,a)` to specify the color of the pixel.

For performance reasons, the return value of your function will no longer be anything useful. Instead, to display the image, retrieve the `canvas` DOM node and insert it into your page.

```js
const render = gpu.createKernel(function() {
    this.color(0, 0, 0, 1);
})
  .setOutput([20, 20])
  .setGraphical(true);

render();

const canvas = render.canvas;
document.getElementsByTagName('body')[0].appendChild(canvas);
```

Note: To animate the rendering, use `requestAnimationFrame` instead of `setTimeout` for optimal performance. For more information, see [this](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame).


### .getPixels() **New in V2!**
To make it easier to get pixels from a context, use `kernel.getPixels()`, which returns a flat array similar to what you get from WebGL's `readPixels` method.
A note on why: webgl's `readPixels` returns an array ordered differently from javascript's `getImageData`.
This makes them behave similarly.
While the values may be somewhat different, because of graphical precision available in the kernel, and alpha, this allows us to easily get pixel data in unified way.

Example:
```js
const render = gpu.createKernel(function() {
    this.color(0, 0, 0, 1);
})
  .setOutput([20, 20])
  .setGraphical(true);

render();
const pixels = render.getPixels();
// [r,g,b,a, r,g,b,a...
```

### Alpha

Currently, if you need alpha do something like enabling `premultipliedAlpha` with your own gl context:
```js
const canvas = DOM.canvas(500, 500);
const gl = canvas.getContext('webgl2', { premultipliedAlpha: false });

const gpu = new GPU({
  canvas,
  context: gl
});
const krender = gpu.createKernel(function(x) {
  this.color(this.thread.x / 500, this.thread.y / 500, x[0], x[1]);
})
  .setOutput([500, 500])
  .setGraphical(true);
 ```

## Combining kernels

Sometimes you want to do multiple math operations on the gpu without the round trip penalty of data transfer from cpu to gpu to cpu to gpu, etc.  To aid this there is the `combineKernels` method.
_**Note:**_ Kernels can have different output sizes.
```js
const add = gpu.createKernel(function(a, b) {
  return a[this.thread.x] + b[this.thread.x];
}).setOutput([20]);

const multiply = gpu.createKernel(function(a, b) {
  return a[this.thread.x] * b[this.thread.x];
}).setOutput([20]);

const superKernel = gpu.combineKernels(add, multiply, function(a, b, c) {
  return multiply(add(a, b), c);
});

superKernel(a, b, c);
```
This gives you the flexibility of using multiple transformations but without the performance penalty, resulting in a much much MUCH faster operation.

## Create Kernel Map

Sometimes you want to do multiple math operations in one kernel, and save the output of each of those operations. An example is **Machine Learning** where the previous output is required for back propagation. To aid this there is the `createKernelMap` method.

### object outputs
```js
const megaKernel = gpu.createKernelMap({
  addResult: function add(a, b) {
    return a + b;
  },
  multiplyResult: function multiply(a, b) {
    return a * b;
  },
}, function(a, b, c) {
  return multiply(add(a[this.thread.x], b[this.thread.x]), c[this.thread.x]);
}, { output: [10] });

megaKernel(a, b, c);
// Result: { addResult: Float32Array, multiplyResult: Float32Array, result: Float32Array }
```
### array outputs
```js
const megaKernel = gpu.createKernelMap([
  function add(a, b) {
    return a + b;
  },
  function multiply(a, b) {
    return a * b;
  }
], function(a, b, c) {
  return multiply(add(a[this.thread.x], b[this.thread.x]), c[this.thread.x]);
}, { output: [10] });

megaKernel(a, b, c);
// Result: { 0: Float32Array, 1: Float32Array, result: Float32Array }
```
This gives you the flexibility of using parts of a single transformation without the performance penalty, resulting in much much _MUCH_ faster operation.

## Adding custom functions
use `gpu.addFunction(function() {}, settings)` for adding custom functions.  Example:


```js
gpu.addFunction(function mySuperFunction(a, b) {
  return a - b;
});
function anotherFunction(value) {
  return value + 1;
}
gpu.addFunction(anotherFunction);
const kernel = gpu.createKernel(function(a, b) {
  return anotherFunction(mySuperFunction(a[this.thread.x], b[this.thread.x]));
}).setOutput([20]);
```

### Adding strongly typed functions

To manually strongly type a function you may use settings.
By setting this value, it makes the build step of the kernel less resource intensive.
Settings take an optional hash values:
* `returnType`: optional, defaults to inference from `FunctionBuilder`, the value you'd like to return from the function.
* `argumentTypes`: optional, defaults to inference from `FunctionBuilder` for each param, a hash of param names with values of the return types.

Example:
```js
gpu.addFunction(function mySuperFunction(a, b) {
  return [a - b[1], b[0] - a];
}, { argumentTypes: { a: 'Number', b: 'Array(2)'}, returnType: 'Array(2)' });
```


## Adding custom functions directly to kernel
```js
function mySuperFunction(a, b) {
  return a - b;
}
const kernel = gpu.createKernel(function(a, b) {
  return mySuperFunction(a[this.thread.x], b[this.thread.x]);
})
  .setOutput([20])
  .setFunctions([mySuperFunction]);

```


## Types
GPU.js does type inference when types are not defined, so even if you code weak type, you are typing strongly typed.
This is needed because c++, which glsl is a subset of, is, of course, strongly typed.
Types that can be used with GPU.js are as follows:

### Argument Types
* 'Array'
* 'Array(2)' **New in V2!**
* 'Array(3)' **New in V2!**
* 'Array(4)' **New in V2!**
* 'Array1D(2)' **New in V2!**
* 'Array1D(3)' **New in V2!**
* 'Array1D(4)' **New in V2!**
* 'Array2D(2)' **New in V2!**
* 'Array2D(3)' **New in V2!**
* 'Array2D(4)' **New in V2!**
* 'Array3D(2)' **New in V2!**
* 'Array3D(3)' **New in V2!**
* 'Array3D(4)' **New in V2!**
* 'HTMLImage'
* 'HTMLImageArray'
* 'HTMLVideo' **New in V2!**
* 'Number'
* 'Float'
* 'Integer'
* 'Boolean' **New in V2!**

### Return Types
NOTE: These refer the the return type of the kernel function, the actual result will always be a collection in the size of the defined `output`
* 'Array(2)'
* 'Array(3)'
* 'Array(4)'
* 'Number'
* 'Float'
* 'Integer'

### Internal Types
Types generally used in the `Texture` class, for #pipelining or for advanced usage.
* 'ArrayTexture(1)' **New in V2!**
* 'ArrayTexture(2)' **New in V2!**
* 'ArrayTexture(3)' **New in V2!**
* 'ArrayTexture(4)' **New in V2!**
* 'NumberTexture'
* 'MemoryOptimizedNumberTexture' **New in V2!**

## Loops
* Any loops defined inside the kernel must have a maximum iteration count defined by the loopMaxIterations setting.
* Other than defining the iterations by a constant or fixed value as shown [Dynamic sized via constants](dynamic-sized-via-constants), you can also simply pass the number of iterations as a variable to the kernel

### Dynamic sized via constants
```js
const matMult = gpu.createKernel(function(a, b) {
    var sum = 0;
    for (var i = 0; i < this.constants.size; i++) {
        sum += a[this.thread.y][i] * b[i][this.thread.x];
    }
    return sum;
}, {
  constants: { size: 512 },
  output: [512, 512],
});
```

### Fixed sized
```js
const matMult = gpu.createKernel(function(a, b) {
    var sum = 0;
    for (var i = 0; i < 512; i++) {
        sum += a[this.thread.y][i] * b[i][this.thread.x];
    }
    return sum;
}).setOutput([512, 512]);
```

## Pipelining
[Pipeline](https://en.wikipedia.org/wiki/Pipeline_(computing)) is a feature where values are sent directly from kernel to kernel via a texture.
This results in extremely fast computing.  This is achieved with the kernel setting `pipeline: boolean` or by calling `kernel.setPipeline(true)`

### Cloning Textures **New in V2!**
When using pipeline mode the outputs from kernels can be cloned using `texture.clone()`.

```js
const kernel1 = gpu.createKernel(function(v) {
    return v[this.thread.x];
})
  .setPipeline(true)
  .setOutput([100]);

const kernel2 = gpu.createKernel(function(v) {
    return v[this.thread.x];
})
  .setOutput([100]);

const result1 = kernel1(array);
// Result: Texture
console.log(result1.toArray());
// Result: Float32Array[0, 1, 2, 3, ... 99]

const result2 = kernel2(result1);
// Result: Float32Array[0, 1, 2, 3, ... 99]
```

## Offscreen Canvas
GPU.js supports offscreen canvas where available.  Here is an example of how to use it with two files, `gpu-worker.js`, and `index.js`:

file: `gpu-worker.js`
```js
importScripts('path/to/gpu.js');
onmessage = function() {
  // define gpu instance
  const gpu = new GPU();

  // input values
  const a = [1,2,3];
  const b = [3,2,1];

  // setup kernel
  const kernel = gpu.createKernel(function(a, b) {
    return a[this.thread.x] - b[this.thread.x];
  })
    .setOutput([3]);

  // output some results!
  postMessage(kernel(a, b));
};
```

file: `index.js`
```js
var worker = new Worker('gpu-worker.js');
worker.onmessage = function(e) {
  var result = e.data;
  console.log(result);
};
```

## Cleanup
* for instances of `GPU` use the `destroy` method.  Example: `gpu.destroy()`
* for instances of `Kernel` use the `destroy` method.  Example: `kernel.destroy()`

## Flattened typed array support
To use the useful `x`, `y`, `z` `thread` lookup api inside of GPU.js, and yet use flattened arrays, there is the `Input` type.
This is generally much faster for when sending values to the gpu, especially with larger data sets.  Usage example:
```js
const { GPU, input, Input } = require('gpu.js');
const gpu = new GPU();
const kernel = gpu.createKernel(function(a, b) {
  return a[this.thread.y][this.thread.x] + b[this.thread.y][this.thread.x];
}).setOutput([3,3]);


kernel(
  input(
    new Float32Array([1,2,3,4,5,6,7,8,9]),
    [3, 3]
  ),
  input(
    new Float32Array([1,2,3,4,5,6,7,8,9]),
    [3, 3]
  )
);
```

Note: `input(value, size)` is a simple pointer for `new Input(value, size)`

## Precompiled and Lighter Weight Kernels

### using JSON
GPU.js packs a lot of functionality into a single file, such as a complete javascript parse, which may not be needed in some cases.
To aid in keeping your kernels lightweight, the `kernel.toJSON()` method was added.
This allows you to reuse a previously built kernel, without the need to re-parse the javascript.
Here is an example:

```js
const gpu = new GPU();
const kernel = gpu.createKernel(function() {
  return [1,2,3,4];
}, { output: [1] });
console.log(kernel()); // [Float32Array([1,2,3,4])];
const json = kernel.toJSON();
const newKernelFromJson = gpu.createKernel(json);
console.log(newKernelFromJSON()); // [Float32Array([1,2,3,4])];
```

NOTE: There is lighter weight, pre-built, version of GPU.js to assist with serializing from to and from json in the dist folder of the project, which include:
* [dist/gpu-browser-core.js](dist/gpu-browser-core.js)
* [dist/gpu-browser-core.min.js](dist/gpu-browser-core.min.js)

### Exporting kernel
GPU.js supports seeing exactly how it is interacting with the graphics processor by means of the `kernel.toString(...)` method.
This method, when called, creates a kernel that executes _exactly the instruction set given to the GPU (or CPU)_ *as a
very tiny reusable function* that instantiates a kernel.

NOTE: When exporting a kernel and using `constants` the following constants are *not changeable*:
* `Array(2)`
* `Array(3)`
* `Array(4)`
* `Integer`
* `Number`
* `Float`
* `Boolean`

Here is an example used to/from file:
```js
import { GPU } from 'gpu.js';
import * as fs from 'fs';
const gpu = new GPU();
const kernel = gpu.createKernel(function(v) {
  return this.thread.x + v + this.constants.v1;
}, { output: [10], constants: { v1: 100 } });
const result = kernel(1);
const kernelString = kernel.toString(1);
fs.writeFileSync('./my-exported-kernel.js', 'module.exports = ' + kernelString);
import * as MyExportedKernel from './my-exported-kernel';
import gl from 'gl';
const myExportedKernel = MyExportedKernel({ context: gl(1,1), constants: { v1: 100 } });
```


Here is an example for just-in-time function creation:

```js
const gpu = new GPU();
const kernel = gpu.createKernel(function(a) {
  let sum = 0;
  for (let i = 0; i < 6; i++) {
    sum += a[this.thread.x][i];
  }
  return sum;
  }, { output: [6] });
kernel(input(a, [6, 6]));
const kernelString = kernel.toString(input(a, [6, 6]));
const newKernel = new Function('return ' + kernelString)()({ context });
newKernel(input(a, [6, 6]));
```

#### using constants with `kernel.toString(...args)`
You can assign _some_ new constants when using the function output from `.toString()`,

## Supported Math functions

Since the code running in the kernel is actually compiled to GLSL code, not all functions from the JavaScript Math module are supported.

This is a list of the supported ones:

* `Math.abs()`
* `Math.acos()`
* `Math.asin()`
* `Math.atan()`
* `Math.atan2()`
* `Math.ceil()`
* `Math.cos()`
* `Math.exp()`
* `Math.floor()`
* `Math.log()`
* `Math.log2()`
* `Math.max()`
* `Math.min()`
* `Math.pow()`
* `Math.random()`
  * A note on random.  We use [a plugin](src/plugins/math-random-uniformly-distributed.js) to generate random.
  Random seeded _and_ generated, _both from the GPU_, is not as good as random from the CPU as there are more things that the CPU can seed random from.
  However, we seed random on the GPU, _from a random value in the CPU_.
  We then seed the subsequent randoms from the previous random value.
  So we seed from CPU, and generate from GPU.
  Which is still not as good as CPU, but closer.
  While this isn't perfect, it should suffice in most scenarios.
  In any case, we must give thanks to [RandomPower](https://www.randompower.eu/), and this [issue](https://github.com/gpujs/gpu.js/issues/498), for assisting in improving our implementation of random.
* `Math.round()`
* `Math.sign()`
* `Math.sin()`
* `Math.sqrt()`
* `Math.tan()`

## How to check what is supported

To assist with mostly unit tests, but perhaps in scenarios outside of GPU.js, there are the following logical checks to determine what support level the system executing a GPU.js kernel may have:
* `GPU.disableValidation()` - turn off all kernel validation
* `GPU.enableValidation()` - turn on all kernel validation
* `GPU.isGPUSupported`: `boolean` - checks if GPU is in-fact supported
* `GPU.isKernelMapSupported`: `boolean` - checks if kernel maps are supported
* `GPU.isOffscreenCanvasSupported`: `boolean` - checks if offscreen canvas is supported
* `GOU.isWebGLSupported`: `boolean` - checks if WebGL v1 is supported
* `GOU.isWebGL2Supported`: `boolean` - checks if WebGL v2 is supported
* `GPU.isHeadlessGLSupported`: `boolean` - checks if headlessgl is supported
* `GPU.isCanvasSupported`: `boolean` - checks if canvas is supported
* `GPU.isGPUHTMLImageArraySupported`: `boolean` - checks if the platform supports HTMLImageArray's
* `GPU.isSinglePrecisionSupported`: `boolean` - checks if the system supports single precision float 32 values

## Typescript Typings
Typescript is supported!  Typings can be found [here](src/index.d.ts)!

## Destructured Assignments **New in V2!**
Destructured Objects and Arrays work in GPU.js.
* Object destructuring
  ```js
  const gpu = new GPU();
  const kernel = gpu.createKernel(function() {
    const { thread: {x, y} } = this;
    return x + y;
  }, { output: [2] });
  console.log(kernel());
  ```
* Array destructuring
  ```js
  const gpu = new GPU();
  const kernel = gpu.createKernel(function(array) {
    const [first, second] = array;
    return first + second; 
  }, {
    output: [2],
    argumentTypes: { array: 'Array(2)' }
  });
  console.log(kernel([1, 2]));
  ```

## Dealing With Transpilation
Transpilation doesn't do the best job of keeping code beautiful.  To aid in this endeavor GPU.js can handle some scenarios to still aid you harnessing the GPU in less than ideal circumstances.
Here is a list of a few things that GPU.js does to fix transpilation:

* When a transpiler such as [Babel](https://babeljs.io/) changes `myCall()` to `(0, _myCall.myCall)`, it is gracefully handled.
* Using `var` will have a lot of warnings by default, this can be irritating because sometimes there is nothing we can do about this in transpiled environment.
  To aid in the irritation, there is an option to alleviate the irritation.
  When `const` and `let` are converted to `var`, and you'r prefer not to see it, use the following:
  ```js
  const kernel = gpu.createKernel(myKernelFunction)
    .setWarnVarUsage(false);
  ```
  or:
  ```js
  const kernel = gpu.createKernel(myKernelFunction, { output: [1], warnVarUsage: false });
  ```

## Full API Reference

You can find a [complete API reference here](https://doxdox.org/gpujs/gpu.js/).

## How possible in node?
GPU.js uses [HeadlessGL](https://github.com/stackgl/headless-gl) in node for GPU acceleration.
GPU.js is written in such a way, you can introduce your own backend.  Have a suggestion?  We'd love to hear it!

## Terms Explained
* Kernel - A function that is tightly coupled to program that runs on the Graphic Processor
* Texture - A graphical artifact that is packed with data, in the case of GPU.js, bit shifted parts of a 32 bit floating point decimal

## Testing
Testing is done (right now) manually, (help wanted (here)[https://github.com/gpujs/gpu.js/issues/515] if you can!), using the following:
* For browser, setup a webserver on the root of the gpu.js project and visit htt://url/test/all.html
* For node, run either of the 3 commands:
  * `yarn test test/features`
  * `yarn test test/internal`
  * `yarn test test/issues`

## Building
Building isn't required on node, but is for browser.  To build the browser's files, run: `yarn make`

# Get Involved!

## Contributing

Contributors are welcome! Create a merge request to the `develop` branch and we
will gladly review it. If you wish to get write access to the repository,
please email us and we will review your application and grant you access to
the `develop` branch.

We promise never to pass off your code as ours.

### Issues

If you have an issue, either a bug or a feature you think would benefit your project let us know and we will do our best.

Create issues [here](https://github.com/gpujs/gpu.js/issues) and follow the template.

### Contributors

This project exists thanks to all the people who contribute. [[Contribute](CONTRIBUTING.md)].
<a href="https://github.com/gpujs/gpu.js/graphs/contributors"><img src="https://opencollective.com/gpujs/contributors.svg?width=890&button=false" /></a>


### Backers

Thank you to all our backers! 🙏 [[Become a backer](https://opencollective.com/gpujs#backer)]

<a href="https://opencollective.com/gpujs#backers" target="_blank"><img src="https://opencollective.com/gpujs/backers.svg?width=890"></a>


### Sponsors

Support this project by becoming a sponsor. Your logo will show up here with a link to your website. [[Become a sponsor](https://opencollective.com/gpujs#sponsor)]

![](https://www.leadergpu.com/assets/main/logo_leadergpu-a8cacac0c90d204b7f7f6c8420c6a149e71ebe53f3f28f3fc94a01cd05c0bd93.png)
Sponsored NodeJS GPU environment from [LeaderGPU](https://www.leadergpu.com) - These guys rock!

![](https://3fxtqy18kygf3on3bu39kh93-wpengine.netdna-ssl.com/wp-content/themes/browserstack/img/browserstack-logo.svg)
Sponsored Browser GPU environment's from [BrowserStack](https://browserstack.com) - Second to none!

<a href="https://opencollective.com/gpujs/sponsor/0/website" target="_blank"><img src="https://opencollective.com/gpujs/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/gpujs/sponsor/1/website" target="_blank"><img src="https://opencollective.com/gpujs/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/gpujs/sponsor/2/website" target="_blank"><img src="https://opencollective.com/gpujs/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/gpujs/sponsor/3/website" target="_blank"><img src="https://opencollective.com/gpujs/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/gpujs/sponsor/4/website" target="_blank"><img src="https://opencollective.com/gpujs/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/gpujs/sponsor/5/website" target="_blank"><img src="https://opencollective.com/gpujs/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/gpujs/sponsor/6/website" target="_blank"><img src="https://opencollective.com/gpujs/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/gpujs/sponsor/7/website" target="_blank"><img src="https://opencollective.com/gpujs/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/gpujs/sponsor/8/website" target="_blank"><img src="https://opencollective.com/gpujs/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/gpujs/sponsor/9/website" target="_blank"><img src="https://opencollective.com/gpujs/sponsor/9/avatar.svg"></a>

## [License](LICENSE)
