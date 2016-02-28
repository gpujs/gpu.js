[![Logo](http://gpu.rocks/img/ogimage.png)](http://gpu.rocks/)

gpu.js is a single-file JavaScript library for GPGPU in the browser. gpu.js will automatically compile specially written JavaScript functions into shader language and run them on the GPU using the WebGL API. In the case where WebGL is not available, the functions will still run in regular JavaScript.

# Example

Matrix multiplication written in gpu.js:

```js
var gpu = new GPU();

// Create the GPU accelerated function from a kernel
// function that computes a single element in the
// 512 x 512 matrix (2D array). The kernel function
// is run in a parallel manner in the GPU resulting
// in very fast computations! (...sometimes)
var mat_mult = gpu.createKernel(function(A, B) {
    var sum = 0;
    for (var i=0; i<512; i++) {
        sum += A[this.thread.y][i] * B[i][this.thread.x];
    }
    return sum;
}).dimensions([512, 512]);

// Perform matrix multiplication on 2 matrices of size 512 x 512
var C = mat_mult(A, B);
```

You can run a benchmark of this [here](http://gpu.rocks). Typically, it will run at 1-15x speedup depending on your hardware.

# Getting Started

## Installation
Download the latest version of gpu.js and include the file in your HTML page using the following tags:

```html
<script src="/path/to/js/gpu.min.js"></script>
```

In JavaScript, initialise the library:

```js
var gpu = new GPU();
```

### Creating and Running Functions
Depnding on your output type, specify the intended dimensions of your output. You cannot have a accelerated function that does not specify any dimensions.

Dimensions of Output	|	How to specify dimensions
----------------------- |-------------------------------
1D			            |	`[length]`
2D		            	|	`[width, height]`
3D		            	|	`[width, height, depth]`

```js
var opt = {
    dimensions: [100]
};
```

Create the function you want to run on the GPU. The first input parameter to `createKernel` is a kernel function which will compute a single number in the output. The thread identifiers, `this.thread.x`, `this.thread.y` or `this.thread.z` will allow you to specify the appropriate behavior of the kernel function at specific positions of the output.

```js
var myFunc = gpu.createKernel(function() {
    return this.thread.x;
}, opt);
```

The created function is a regular JavaScript function, you can use it like regular functions.

```js
myFunc();
// Result: [0, 1, 2, 3, ... 99]
```

Note: Instead of creating an object, you can use the chainable shortcut methods as a neater way of specificying options.

```js
var myFunc = gpu.createKernel(function() {
    return this.thread.x;
}).dimensions([100]);
    
myFunc();
// Result: [0, 1, 2, 3, ... 99]
```
### Accepting Input

Kernel functions may accept numbers, or 1D, 2D or 3D array of numbers as input. To define an argument, simply add it to the kernel function like regular JavaScript.

```js
var myFunc = gpu.createKernel(function(x) {
    return x;
}).dimensions([100]);
    
myFunc(42);
// Result: [42, 42, 42, 42, ... 42]
```

Similarly, with array inputs:

```js
var myFunc = gpu.createKernel(function(X) {
    return X[this.thread.x % 3];
}).dimensions([100]);
    
myFunc([1, 2, 3]);
// Result: [1, 2, 3, 1, ... 1 ]
```

### Graphical Output

Sometimes, you want to produce a `canvas` image instead of doing numeric computations. To achieve this, set the `graphical` flag to `true` and the output dimensions to `[width, height]`. The thread identifiers will now refer to the `x` and `y` coordinate of the pixel you are producing. Inside your kernel function, use `this.color(r,g,b)` or `this.color(r,g,b,a)` to specify the color of the pixel.

For performance reasons, the return value for your function will no longer be anything useful. Instead, to add the image input your page, retrieve the `canvas` DOM node and insert it into your page.

```js
var render = gpu.createKernel(function(X) {
    this.color(0, 0, 0, 1);
}).dimensions([20, 20]).graphical(true);
    
render();

var canvas = render.getCanvas();
document.getElementsByTagName('body')[0].appendChild(canvas);
```

Note: To animate the rendering, use requestAnimationFrame instead of setTimeout for optimal performance. For more information, see [this link](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame).

# Full API Reference

You can find a [complete API reference here](http://gpu.rocks/api/).

# Automatically-built Documentation

Documentation of the codebase is [automatically built](https://github.com/gpujs/gpu.js/wiki/Automatic-Documentation).

# License 

The MIT License

Copyright (c) 2016 Fazli Sapuan, Matthew Saw, Eugene Cheah and Julia Low

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
