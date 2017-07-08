[![Logo](http://gpu.rocks/img/ogimage.png)](http://gpu.rocks/)

[![Join the chat at https://gitter.im/gpujs/gpu.js](https://badges.gitter.im/gpujs/gpu.js.svg)](https://gitter.im/gpujs/gpu.js?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# gpu.js
gpu.js is a **single-file** JavaScript library for GPGPU (General purpose computing on GPUs) in the browser. gpu.js will automatically compile specially written JavaScript functions into shader language and run them on the GPU using the WebGL API. In case WebGL is not available, the functions will still run in regular JavaScript.

# Example

Matrix multiplication written in gpu.js:

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
}).setDimensions([512, 512]);

// Perform matrix multiplication on 2 matrices of size 512 x 512
const c = matMult(a, b);
```

You can run a benchmark of this [here](http://gpu.rocks). Typically, it will run 1-15x faster depending on your hardware.

Or alternatively you can experiment around with the [kernel playground here](http://gpu.rocks/playground/playground.html)

# Table of Contents

* [Installation](#installation)
* [Creating and Running Functions](#creating-and-running-functions)
* [Accepting Input](#accepting-input)
* [Graphical Output](#graphical-output)
* [Combining Kernels](#combining-kernels)
* [Create Kernels](#create-kernels)
* [Adding Custom Functions](#adding-custom-functions)
* [Full API reference](#full-api-reference)
* [Automatically-built Documentation](#automatically-built-documentation)
* [Contributors](#contributors)
* [Contributing](#contributing)

## Installation
Download the latest version of gpu.js and include the file in your HTML page using the following tags:

```html
<script src="/path/to/js/gpu.min.js"></script>
```

In JavaScript, initialise the library:

```js
const gpu = new GPU();
```

Note that this **requires** the Promise API, if you need to polyfill it, you can give our 'untested polyfill' a try [here](https://github.com/picoded/small_promise.js)

### Creating and Running Functions
Depending on your output type, specify the intended dimensions of your output. You cannot have an accelerated function that does not specify any dimensions.

Dimensions of Output	 |	How to specify dimensions    |	How to reference in kernel
-----------------------|-------------------------------|--------------------------------
1D			               |	`[length]`                   |	`myVar[this.thread.x]`
2D		            	   |	`[width, height]`            |	`myVar[this.thread.y][this.thread.x]`
3D		            	   |	`[width, height, depth]`     |	`myVar[this.thread.z][this.thread.y][this.thread.x]`

```js
const opt = {
    dimensions: [100]
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

Note: Instead of creating an object, you can use the chainable shortcut methods as a neater way of specificying options.

```js
const myFunc = gpu.createKernel(function() {
    return this.thread.x;
}).setDimensions([100]);
    
myFunc();
// Result: [0, 1, 2, 3, ... 99]
```
### Accepting Input

Kernel functions can accept numbers, or 1D, 2D or 3D array of numbers as input. To define an argument, simply add it to the kernel function like regular JavaScript.

```js
const myFunc = gpu.createKernel(function(x) {
    return x;
}).setDimensions([100]);
    
myFunc(42);
// Result: [42, 42, 42, 42, ... 42]
```

Similarly, with array inputs:

```js
const myFunc = gpu.createKernel(function(x) {
    return x[this.thread.x % 3];
}).setDimensions([100]);
    
myFunc([1, 2, 3]);
// Result: [1, 2, 3, 1, ... 1 ]
```

### Graphical Output

Sometimes, you want to produce a `canvas` image instead of doing numeric computations. To achieve this, set the `graphical` flag to `true` and the output dimensions to `[width, height]`. The thread identifiers will now refer to the `x` and `y` coordinate of the pixel you are producing. Inside your kernel function, use `this.color(r,g,b)` or `this.color(r,g,b,a)` to specify the color of the pixel.

For performance reasons, the return value of your function will no longer be anything useful. Instead, to display the image, retrieve the `canvas` DOM node and insert it into your page.

```js
const render = gpu.createKernel(function() {
    this.color(0, 0, 0, 1);
})
  .setDimensions([20, 20])
  .setGraphical(true);
    
render();

const canvas = render.getCanvas();
document.getElementsByTagName('body')[0].appendChild(canvas);
```

Note: To animate the rendering, use `requestAnimationFrame` instead of `setTimeout` for optimal performance. For more information, see [this](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame).

### Combining kernels

Sometimes you want to do multiple math operations on the gpu without the round trip penalty of data transfer from cpu to gpu to cpu to gpu, etc.  To aid this there is the `combineKernels` method.
_**Note:**_ Kernels can have different dimensions.
```js
const add = gpu.createKernel(function(a, b) {
	return a[this.thread.x] + b[this.thread.x];
}).setDimensions([20]);

const multiply = gpu.createKernel(function(a, b) {
	return a[this.thread.x] * b[this.thread.x];
}).setDimensions([20]);

const superKernel = gpu.combineKernels(add, multiply, function(a, b, c) {
	return multiply(add(a, b), c);
});

superKernel(a, b, c);
```
This gives you the flexibility of using multiple transformations but without the performance penalty, resulting in a much much MUCH faster operation.

### Create kernels

Sometimes you want to do multiple math operations in one kernel, and save the output of each of those operations. An example is **Machine Learning** where the previous output is required for back propagation. To aid this there is the `createKernelMap` method.

#### object outputs
```js
const megaKernel = gpu.createKernelMap({
  addResult: function add(a, b) {
    return a[this.thread.x] + b[this.thread.x];
  },
  multiplyResult: function multiply(a, b) {
    return a[this.thread.x] * b[this.thread.x];
  },
}, function(a, b, c) {
	return multiply(add(a, b), c);
});

megaKernel(a, b, c);
//Result: { addResult: [], multiplyResult: [], result: [] }
```
#### array outputs
```js
const megaKernel = gpu.createKernelMap([
  function add(a, b) {
    return a[this.thread.x] + b[this.thread.x];
  },
  function multiply(a, b) {
    return a[this.thread.x] * b[this.thread.x];
  }
], function(a, b, c) {
	return multiply(add(a, b), c);
});

megaKernel(a, b, c);
//Result: [ [], [] ].result []
```
This gives you the flexibility of using parts of a single transformation without the performance penalty, resulting in much much _MUCH_ faster operation.

### Adding custom functions
Do you have a custom function you'd like to use on the gpu? Although limited, you can:
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
}).setDimensions([20]);
```
### Loops
Loops just work
#### Dynamic sized via constants
```js
const matMult = gpu.createKernel(function(a, b) {
    var sum = 0;
    for (var i = 0; i < size; i++) {
        sum += a[this.thread.y][i] * b[i][this.thread.x];
    }
    return sum;
}, {
  constants: { size: 512 },
  dimensions: [512, 512],
});
```
#### Fixed sized
```js
const matMult = gpu.createKernel(function(a, b) {
    var sum = 0;
    for (var i = 0; i < 512; i++) {
        sum += a[this.thread.y][i] * b[i][this.thread.x];
    }
    return sum;
}).setDimensions([512, 512]);
```

# Full API Reference

You can find a [complete API reference here](http://gpu.rocks/api/).

# Automatically-built Documentation

Documentation of the codebase is [automatically built](https://github.com/gpujs/gpu.js/wiki/Automatic-Documentation).

# Contributors
 
* Fazli Sapuan
* Eugene Cheah
* Matthew Saw
* Robert Plummer
* Juan Cazala
* Daniel X Moore
* Mark Theng
* Varun Patro
 
# Contributing
 
Contributors are welcome! Create a merge request to the `develop` branch and we
will gladly review it. If you wish to get write access to the repository,
please email us and we will review your application and grant you access to
the `develop` branch.
 
We promise never to pass off your code as ours.

# License 

The MIT License

Copyright (c) 2017 gpu.js Team
 
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
