[![Logo](http://gpu.rocks/img/ogimage.png)](http://gpu.rocks/)


# GPU.js
GPU.js is a JavaScript Acceleration library for GPGPU (General purpose computing on GPUs) in JavaScript. GPU.js will automatically compile simple JavaScript functions into shader language and run them on the GPU. In case a GPU is not available, the functions will still run in regular JavaScript.


[![Join the chat at https://gitter.im/gpujs/gpu.js](https://badges.gitter.im/gpujs/gpu.js.svg)](https://gitter.im/gpujs/gpu.js?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Slack](https://slack.bri.im/badge.svg)](https://slack.bri.im)

# What is this sorcery?

Matrix multiplication written in GPU.js:

```js
const gpu = new GPU();

// Create the GPU accelerated function from a kernel
// function that computes a single element in the
// 512 x 512 matrix (2D array). The kernel function
// is run in a parallel manner in the GPU resulting
// in very fast computations! (...sometimes)
const matMult = gpu.createKernel(function(a, b) {
    var sum = 0;
    for (var i = 0; i < 512; i++) {
        sum += a[this.thread.y][i] * b[i][this.thread.x];
    }
    return sum;
}).setOutput([512, 512]);

// Perform matrix multiplication on 2 matrices of size 512 x 512
const c = matMult(a, b);
```

You can run a benchmark of this [here](http://gpu.rocks). Typically, it will run 1-15x faster depending on your hardware.

Or alternatively you can experiment around with the [kernel playground here](http://gpu.rocks/playground)

# Table of Contents

* [Installation](#installation)
* [`GPU` Options](#gpu-options)
* [`gpu.createKernel` Options](#gpu-createkernel-options)
* [Creating and Running Functions](#creating-and-running-functions)
* [Accepting Input](#accepting-input)
* [Graphical Output](#graphical-output)
* [Combining Kernels](#combining-kernels)
* [Create Kernel Map](#create-kernel-map)
* [Adding Custom Functions](#adding-custom-functions)
* [Adding Custom Functions Directly to Kernel](#adding-custom-functions-directly-to-kernel)
* [Loops](#loops)
* [Pipelining](#pipelining)
* [Offscreen Canvas](#offscreen-canvas)
* [Cleanup](#cleanup)
* [Flattened typed array support](#flattened-typed-array-support)
* [Supported Math functions](#supported-math-functions)
* [Full API reference](#full-api-reference)
* [Automatically-built Documentation](#automatically-built-documentation)
* [Contributors](#contributors)
* [Contributing](#contributing)
* [Terms Explained](#terms-explained)
* [License](#license)

## Installation

### npm

```bash
npm install gpu.js --save
```

### yarn

```bash
yarn add gpu.js
```

[npm package](https://www.npmjs.com/package/gpu.js)

### Browser

Download the latest version of GPU.js and include the files in your HTML page using the following tags:

```html
<script src="/path/to/js/gpu.min.js"></script>
```

In JavaScript, initialize the library:

```js
const gpu = new GPU();
```

## `GPU` Options
Options are an object used to create an instance of `GPU`.  Example: `new GPU(options)`
* `canvas`: `HTMLCanvasElement`.  Optional.  For sharing canvas.  Example: use THREE.js and GPU.js on same canvas.
* `webGl`: `WebGL2RenderingContext` or `WebGLRenderingContext`.  For sharing rendering context.  Example: use THREE.js and GPU.js on same rendering context.

## `gpu.createKernel` Options
Options are an object used to create a `kernel` or `kernelMap`.  Example: `gpu.createKernel(options)`
* `output`: array or object that describes the output of kernel.
  * as array: `[width]`, `[width, height]`, or `[width, height, depth]`
  * as object: `{ x: width, y: height, z: depth }`
* outputToTexture: boolean
* graphical: boolean
* loopMaxIterations: number
* constants: object
* wraparound: boolean
* hardcodeConstants: boolean
* floatTextures: boolean - input/working textures use float32 for each colour channel
* floatOutput: boolean - output texture uses float32 for each  colour channel
* fixIntegerDivisionAccuracy: boolean - some cards have accuracy issues dividing by factors of three and some other primes (most apple kit?). Default on for affected cards, disable if accuracy not required.
* functions: array or boolean
* nativeFunctions: object
* subKernels: array
* outputImmutable: boolean
  * default to `false`
  


## Creating and Running Functions
Depending on your output type, specify the intended size of your output. You cannot have an accelerated function that does not specify any output size.

Output size         	 |	How to specify output size   |	How to reference in kernel
-----------------------|-------------------------------|--------------------------------
1D			               |	`[length]`                   |	`myVar[this.thread.x]`
2D		            	   |	`[width, height]`            |	`myVar[this.thread.y][this.thread.x]`
3D		            	   |	`[width, height, depth]`     |	`myVar[this.thread.z][this.thread.y][this.thread.x]`

```js
const opt = {
    output: [100]
};
```

or

```js
// You can also use x, y, and z
const opt = {
    output: { x: 100 }
};
```

Create the function you want to run on the GPU. The first input parameter to `createKernel` is a kernel function which will compute a single number in the output. The thread identifiers, `this.thread.x`, `this.thread.y` or `this.thread.z` will allow you to specify the appropriate behavior of the kernel function at specific positions of the output.

```js
const myFunc = gpu.createKernel(function() {
    return this.thread.x;
}, opt);
```

The created function is a regular JavaScript function, and you can use it like one.

```js
myFunc();
// Result: [0, 1, 2, 3, ... 99]
```

Note: Instead of creating an object, you can use the chainable shortcut methods as a neater way of specifying options.

```js
const myFunc = gpu.createKernel(function() {
    return this.thread.x;
}).setOutput([100]);
    
myFunc();
// Result: [0, 1, 2, 3, ... 99]
```

### Declaring variables

GPU.js makes variable declaration inside kernel functions easy.  Variable types supported are:
Numbers
Array(2)
Array(3)
Array(4)

Numbers example:
```js
 const myFunc = gpu.createKernel(function() {
     const i = 1;
     const j = 0.89;
     return i + j;
 }).setOutput([100]);
```

Array(2) examples:
Using declaration 
```js
 const myFunc = gpu.createKernel(function() {
     const array2 = [0.08, 2];
     return array2;
 }).setOutput([100]);
```

Directly returned
```js
 const myFunc = gpu.createKernel(function() {
     return [0.08, 2];
 }).setOutput([100]);
```

Array(3) example:
Using declaration 
```js
 const myFunc = gpu.createKernel(function() {
     const array2 = [0.08, 2, 0.1];
     return array2;
 }).setOutput([100]);
```

Directly returned
```js
 const myFunc = gpu.createKernel(function() {
     return [0.08, 2, 0.1];
 }).setOutput([100]);
```

Array(4) example:
Using declaration 
```js
 const myFunc = gpu.createKernel(function() {
     const array2 = [0.08, 2, 0.1, 3];
     return array2;
 }).setOutput([100]);
```

Directly returned
```js
 const myFunc = gpu.createKernel(function() {
     return [0.08, 2, 0.1, 3];
 }).setOutput([100]);
```

## Accepting Input
### Supported Input Types
* Numbers
* 1d Array
* 2d Array
* 3d Array
* HTML Image
* Array of HTML Images
To define an argument, simply add it to the kernel function like regular JavaScript.

### Input Examples
```js
const myFunc = gpu.createKernel(function(x) {
    return x;
}).setOutput([100]);
    
myFunc(42);
// Result: [42, 42, 42, 42, ... 42]
```

Similarly, with array inputs:

```js
const myFunc = gpu.createKernel(function(x) {
    return x[this.thread.x % 3];
}).setOutput([100]);
    
myFunc([1, 2, 3]);
// Result: [1, 2, 3, 1, ... 1 ]
```

An HTML Image:

```js
const myFunc = gpu.createKernel(function(image) {
    const pixel = image[this.thread.y][this.thread.x];
    this.color(pixel[0], pixel[1], pixel[2], pixel[3]);
})
  .setGraphical(true)
  .setOutput([100]);

const image = new document.createElement('img');
image.src = 'my/image/source.png';
image.onload = () => {
  myFunc(image);
  // Result: colorful image
};
```

An Array of HTML Images:

```js
const myFunc = gpu.createKernel(function(image) {
    const pixel = image[this.thread.z][this.thread.y][this.thread.x];
    this.color(pixel[0], pixel[1], pixel[2], pixel[3]);
})
  .setGraphical(true)
  .setOutput([100]);

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
    myFunc([image1, image2, image3]);
    // Result: colorful image composed of many images
  }
};
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

const canvas = render.getCanvas();
document.getElementsByTagName('body')[0].appendChild(canvas);
```

Note: To animate the rendering, use `requestAnimationFrame` instead of `setTimeout` for optimal performance. For more information, see [this](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame).


### Alpha

Currently, if you need alpha do something like enabling `premultipliedAlpha` with your own gl context:
```js
const canvas = DOM.canvas(500, 500);
const gl = canvas.getContext('webgl2', { premultipliedAlpha: false });

const gpu = new GPU({
  canvas,
  webGl: gl
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
	return a + b;
}).setOutput([20]);

const multiply = gpu.createKernel(function(a, b) {
	return a * b;
}).setOutput([20]);

const superKernel = gpu.combineKernels(add, multiply, function(a, b, c) {
	return multiply(add(a[this.thread.x], b[this.thread.x]), c[this.thread.x]);
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
});

megaKernel(a, b, c);
// Result: { addResult: [], multiplyResult: [], result: [] }
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
});

megaKernel(a, b, c);
// Result: [ [], [] ].result []
```
This gives you the flexibility of using parts of a single transformation without the performance penalty, resulting in much much _MUCH_ faster operation.

## Adding custom functions
use `gpu.addFunction(function() {}, options)` for adding custom functions.  Example:


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

To strongly type a function you may use options.  Options take an optional hash values:
`returnType`: optional, defaults to float, the value you'd like to return from the function
`paramTypes`: optional, defaults to float for each param, a hash of param names with values of the return types

Types: that may be used for `returnType` or for each property of `paramTypes`:
* 'Array'
* 'Array(2)'
* 'Array(3)'
* 'Array(4)'
* 'HTMLImage'
* 'HTMLImageArray'
* 'Number'
* 'NumberTexture'
* 'ArrayTexture(4)'

Example:
```js
gpu.addFunction(function mySuperFunction(a, b) {
	return [a - b[1], b[0] - a];
}, { paramTypes: { a: 'Number', b: 'Array(2)'}, returnType: 'Array(2)' });
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

## Loops
* Any loops defined inside the kernel must have a maximum iteration count defined by the loopMaxIterations option.
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
This results in extremely fast computing.  This is achieved with the kernel option `outputToTexture: boolean` option or by calling `kernel.setOutputToTexture(true)`

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
import GPU, { input } from 'gpu.js';
const gpu = new GPU();
const kernel = gpu.createKernel(function(a, b) {
  return a[this.thread.y][this.thread.x] + b[this.thread.y][this.thread.x];
}).setOutput([3,3]);


kernel(input(new Float32Array([1,2,3,4,5,6,7,8,9]), [3, 3]), input(new Float32Array([1,2,3,4,5,6,7,8,9]), [3, 3]));
```

Note: `GPU.input(value, size)` is a simple pointer for `new GPU.Input(value, size)`

## Supported Math functions

Since the code running in the kernel is actually compiled to GLSL code, not all functions from the JavaScript Math module are supported.

This is a list of the supported ones:

```
abs
acos
asin
atan
atan2
ceil
cos
exp
floor
log
log2
max
min
round
sign 
sin
sqrt
tan
```


## Full API Reference

You can find a [complete API reference here](https://doxdox.org/gpujs/gpu.js/1.2.0).

## Automatically-built Documentation

Documentation of the codebase is [automatically built](https://github.com/gpujs/gpu.js/wiki/Automatic-Documentation).

## Contributors
 
* Fazli Sapuan
* Eugene Cheah
* Matthew Saw
* Robert Plummer
* Abhishek Soni
* Juan Cazala
* Daniel X Moore
* Mark Theng
* Varun Patro
 
## Contributing
 
Contributors are welcome! Create a merge request to the `develop` branch and we
will gladly review it. If you wish to get write access to the repository,
please email us and we will review your application and grant you access to
the `develop` branch.
 
We promise never to pass off your code as ours.

## Terms Explained
* Kernel - A function that is tightly coupled to program that runs on the Graphic Processor
* Texture - A graphical artifact that is packed with data, in the case of GPU.js, bit shifted parts of a 32 bit floating point decimal

## License 

The MIT License

Copyright (c) 2018 GPU.js Team
 
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
