[<img width="100" alt="Logo" src="https://raw.githubusercontent.com/gpujs/gpu.js/develop/assets/jelly.png">](https://gpu.rocks/)
# GPU.js
GPU.js is a JavaScript Acceleration library for GPGPU (General purpose computing on GPUs) in JavaScript for Web and Node.
GPU.js automatically transpiles simple JavaScript functions into shader language and compiles them so they run on your GPU.
In case a GPU is not available, the functions will still run in regular JavaScript.
For some more quick concepts, see [Quick Concepts](https://github.com/gpujs/gpu.js/wiki/Quick-Concepts) on the wiki.

**New to GPU programming?** [**Learn GPGPU in your browser**](https://gpu.rocks/learn) — a free, hands-on course that teaches the subject itself, not just this library. See [Learn GPGPU](#learn-gpgpu) below.


[![CI](https://github.com/gpujs/gpu.js/actions/workflows/ci.yml/badge.svg)](https://github.com/gpujs/gpu.js/actions/workflows/ci.yml)
[![BrowserStack](https://automate.browserstack.com/badge.svg?badge_key=RHFnb0dPTWdmUlZKRFdMb3lZWFdGSDcwU1dEL0tGZC9HT21BVVJPeGZ1az0tLW43V3JMeGtjdjlhWHlpZ2dZRk5ZclE9PQ%3D%3D--a13f87b6ab74da0caa0381873de301faed81c914)](https://automate.browserstack.com/public-build/RHFnb0dPTWdmUlZKRFdMb3lZWFdGSDcwU1dEL0tGZC9HT21BVVJPeGZ1az0tLW43V3JMeGtjdjlhWHlpZ2dZRk5ZclE9PQ%3D%3D--a13f87b6ab74da0caa0381873de301faed81c914)
[![Socket score](https://socket.dev/api/badge/npm/package/gpu.js)](https://socket.dev/npm/package/gpu.js)
[![Join the chat at https://gitter.im/gpujs/gpu.js](https://badges.gitter.im/gpujs/gpu.js.svg)](https://gitter.im/gpujs/gpu.js?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# What is this sorcery?

Creates a GPU accelerated kernel transpiled from a javascript function that computes a single element in the 512 x 512 matrix (2D array).
The kernel functions are ran in tandem on the GPU often resulting in very fast computations!
You can run a benchmark of this [here](https://gpu.rocks/). Typically, it will run 1-15x faster depending on your hardware.
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

## CDN
``` 
https://unpkg.com/gpu.js@latest/dist/gpu-browser.min.js
https://cdn.jsdelivr.net/npm/gpu.js@latest/dist/gpu-browser.min.js
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

[Click here](/examples) for more typescript examples.

## v3 Will Be Async by Default

> [!WARNING]
> **The next major version of GPU.js will make every kernel call return a `Promise`.**  This is a breaking API change: synchronous kernel calls as you write them today will not survive the v3 upgrade unchanged.  Code written against `mode: 'async'` (new in 2.20.0) already conforms and will run on v3 unchanged — the [migration guide](#migrating-a-sync-kernel-to-async) below is six steps.

This breaks the API you are using today, so it warrants both notice and an apology.  We owe you the apology because the original synchronous design was not forward-thinking, and we should have started async in the first place.  A GPU is an asynchronous device: you hand it work, and the results are ready later.  WebGL let this library pretend otherwise — `readPixels` silently freezes the page until the GPU catches up, and we built our API on that pretense because it made the first example look like an ordinary function call.  The cost has been paid by every user since: every kernel readback blocks the main thread for its full duration (measurably ~96% of a readback-heavy loop frozen, in one stall as long as the whole loop), and WebGPU — which has no synchronous readback at all, correctly — cannot be offered under the synchronous contract except as a walled-off special mode.  An async-first API would have cost one `await` in the examples and none of this debt.

v3 corrects the mistake: async everywhere, one contract, every backend.  The WebGL backends keep a synchronous escape hatch (`setAsyncMode(false)`) through the migration; WebGPU can never offer one.

### Why WebGPU is worth breaking the API for

Async-by-default is not an aesthetic preference — it is the price of making WebGPU a first-class backend instead of a walled-off special mode, and WebGPU earns that price twice over.

**Performance.**  Measured on the same kernels, same machine (Apple M1 Max), against our own WebGL2 backend at its best:

* 1024×1024 matrix multiplication including readback: **3× faster** (6.3 ms vs 18.5 ms; 370× vs the CPU).
* A three-kernel pipeline chain, end to end: **4× faster** (9.0 ms vs 36.6 ms) — readback, WebGL's most expensive step, is dramatically cheaper.
* And the readback that remains no longer freezes the page: it happens off the main thread by construction, not as a 100 ms stall the UI must absorb.

**Accuracy.**  This one matters more than the speed.  Every GPU backend before WebGPU computes by pretending a fragment shader is a compute unit, and this library carries years of scar tissue from that pretense — workarounds you may be relying on without knowing it:

* **No more lossy packing.**  In `precision: 'unsigned'` mode, every float in and out of a kernel is encoded into an 8-bit-per-channel RGBA pixel and decoded on the far side — a quantizing round-trip.  WebGPU kernels read and write raw IEEE-754 `f32` storage buffers; there is no encode step to lose bits in.
* **Integer math that is actually integer.**  GLSL fragment shaders forced float emulation of integers — the `fixIntegerDivisionAccuracy` setting exists because some GPUs return `2.999…` for `9/3` and this library has to patch around them card by card.  WGSL has true 32-bit integers with exact division.  No setting, no patch, correct by construction.
* **Exact addressing.**  Fragment-shader kernels locate your data by float texture-coordinate arithmetic, which is where a whole family of large-array off-by-one bugs has historically lived.  A WGSL kernel indexes its buffer with an integer thread id — `data[i]` means element `i`, at any size.
* **A smaller surface for driver bugs.**  GLSL from this library is recompiled by whatever shader stack each machine ships — an eight-year-old wrong-results bug on Windows (#300) traced to Microsoft's `d3dcompiler_47.dll` miscompiling a nested texture read, and it was invisible on every other platform.  WGSL is a smaller, more rigorously specified language with a conformance-tested compilation path; entire categories of that risk simply do not apply to compute shaders reading storage buffers.

The synchronous API is the only thing standing between users and those improvements being the default.  That is why it goes.

### Migrating a sync kernel to async

The v3 contract is available today — opt in with `mode: 'async'` (or `asyncMode: true` per kernel) and your code is already v3-shaped:

```js
// v2 (sync)
const gpu = new GPU();
const kernel = gpu.createKernel(fn).setOutput([512, 512]);
const result = kernel(a, b);

// v3 (async) — works today with { mode: 'async' }
const gpu = new GPU({ mode: 'async' });
const kernel = gpu.createKernel(fn).setOutput([512, 512]);
const result = await kernel(a, b);
```

1. **`await` every kernel call.**  The resolved value has exactly the shape the sync call returned — nothing else about your code changes.  Callers become `async` functions; at the top level, wrap in an async IIFE or use top-level `await`.
2. **Sequential loops just gain the `await`:** `for (…) { total = await step(total); }` — iteration order and semantics are unchanged.
3. **Pipeline results: `await result.toArray()`.**  `await` is harmless on the synchronous backends' textures, so this form is portable across all backends today.
4. **Chains of kernels: keep `pipeline: true` and await only the end.**  Handles pass between kernels without readback, exactly as before; you pay one `await` at the final readback instead of a main-thread stall at every stage.
5. **Graphical kernels: `await kernel.getPixels()`.**  Under the async contract `getPixels()` returns a Promise on every backend — resolved immediately on the GL and cpu backends, genuinely asynchronous on webgpu — so the awaited form is the portable one.  (A graphical kernel call itself stays fire-and-forget: an un-awaited `kernel()` per animation frame is fine.)
6. **Library authors:** return the Promise; don't resolve it on your callers' behalf.  Code written against `mode: 'async'` in v2 will run unchanged on v3.

# Table of Contents

Notice documentation is off?  We do try our hardest, but if you find something,
  [please bring it to our attention](https://github.com/gpujs/gpu.js/issues), or _[become a contributor](#contributors)_!

* [v3 Will Be Async by Default](#v3-will-be-async-by-default)
* [Learn GPGPU](#learn-gpgpu)
* [Supported Backends](#supported-backends)
* [Demos](#demos)
* [Installation](#installation)
* [`GPU` Settings](#gpu-settings)
* [`gpu.createKernel` Settings](#gpucreatekernel-settings)
  * [Declaring variables/functions within kernels](#declaring-variablesfunctions-within-kernels)
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
  * [Cleanup pipeline texture memory](#cleanup-pipeline-texture-memory-new-in-v24)
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
* [WebGPU](#webgpu)
* [WebAssembly](#webassembly)
* [Pipeline Compilation](#pipeline-compilation)
* [Asynchronous Kernels](#asynchronous-kernels)
* [Full API reference](#full-api-reference)
* [How possible in node](#how-possible-in-node)
* [Testing](#testing)
* [Building](#building)
* [Contributors](#contributors)
* [Contributing](#contributing)
* [Terms Explained](#terms-explained)
* [License](#license)

## Learn GPGPU

**[Learn GPGPU in your browser](https://gpu.rocks/learn)** — a free, hands-on course built on GPU.js. Fifteen lessons across three modules, roughly ten hours, with no toolchain to install: you write real kernels in the page and run them on your own GPU, with the results in front of you.

The point worth making is that **it teaches GPGPU, not just this library**. GPU.js is the vehicle, chosen because JavaScript in a browser is the shortest path from "no setup" to "code running on your GPU" — but what you take away is the subject itself, and it transfers:

* **The mental model is universal.** A kernel is one function run across a grid of threads; `this.thread` is CUDA's `threadIdx`/`blockIdx`, WGSL's `global_invocation_id`, and OpenCL's `get_global_id()` wearing different clothes. Once you think in kernels, the syntax is a detail.
* **The hard-won lessons are hardware lessons, not API lessons.** Why moving data usually costs more than computing on it, why keeping intermediate results on the device (pipelining) changes everything, why a parallel reduction is shaped the way it is, why float precision bites, and how to measure a GPU honestly instead of timing an unsynchronized queue — every one of those is as true in CUDA or Metal as it is here.
* **The algorithms are the canonical ones.** Matrix multiply, reductions, convolution, Monte Carlo, N-body, cellular automata, reaction–diffusion, ray marching — the same worked examples you meet in any GPU course, just without a two-hour install first.

| module | lessons |
|---|---|
| **1 — Fundamentals** | Hello, Kernel · Data In, Data Out · Thinking in Parallel · Pipelines & Textures · Measuring Speed Honestly |
| **2 — Real algorithms** | Matrix Multiply · Reductions · Convolution & Filters · Monte Carlo Methods · N-Body Gravity |
| **3 — Graphics** | Pixels from Scratch · Escape-Time Fractals · Cellular Automata · Reaction–Diffusion · Ray-Marched Metaballs |

Start at [Hello, Kernel](https://gpu.rocks/learn/1-1) — if you can write a JavaScript `for` loop, you have the prerequisites.

## Supported Backends

Representative performance factor: 1024×1024 matrix multiplication including readback, versus the CPU backend on the same machine (Apple M1 Max, Chromium; your hardware will vary — run `node scripts/benchmark-webgpu.mjs` for yours).

| Backend | Environment | Technology | Perf factor | Notes |
|---|---|---|---|---|
| `webgpu` **New in 2.20.0!** | Browser | WGSL compute shaders | **~370×** | Async API; opt-in via `mode: 'webgpu'` or automatic via `mode: 'async'` |
| `webgl2` | Browser | GLSL ES 3.00 fragment shaders | ~127× | The default browser backend.  2.20.0 renders scalar single-precision kernels to `R32F` and reads back one float per value where the driver allows |
| `webgl` | Browser | GLSL ES 1.00 fragment shaders | ~87× | Fallback for older browsers |
| `headlessgl` | Node | GLSL ES 1.00 via ANGLE | ~123× | The default Node backend |
| `webasm` **New!** | Anywhere | WebAssembly + f32x4 SIMD + threads | | Auto-selected only where no GL backend works; explicit via `mode: 'webasm'`.  Threads engage under the async contract |
| `cpu` | Anywhere | Plain JavaScript | 1× | Guaranteed fallback; also the reference for correctness |

## Demos
GPU.js in the wild, all around the net.  Add yours here!
* [Temperature interpolation using GPU.js](https://observablehq.com/@rveciana/temperature-interpolation-using-gpu-js)
* [Julia Set Fractal using GPU.js](https://observablehq.com/@ukabuer/julia-set-fractal-using-gpu-js)
* [Hello, gpu.js v2](https://observablehq.com/@fil/hello-gpu-js-v2)
* [Basic gpu.js canvas example](https://observablehq.com/@rveciana/basic-gpu-js-canvas-example)
* [Raster projection with GPU.js](https://observablehq.com/@fil/raster-projection-with-gpu-js)
* [GPU.js Example: Slow Fade](https://observablehq.com/@robertleeplummerjr/gpu-js-example-slow-fade)
* [GPU.JS CA Proof of Concept](https://observablehq.com/@alexlamb/gpu-js-ca-proof-of-concept)
* [Image Convolution using GPU.js](https://observablehq.com/@ukabuer/image-convolution-using-gpu-js)
* [Leaflet + gpu.js canvas](https://observablehq.com/@rveciana/leaflet-gpu-js-canvas)
* [Image to GPU.js](https://observablehq.com/@fil/image-to-gpu)
* [GPU Accelerated Heatmap using gpu.js](https://observablehq.com/@tracyhenry/gpu-accelerated-heatmap-using-gpu-js)
* [Dijkstra’s algorithm in gpu.js](https://observablehq.com/@fil/dijkstras-algorithm-in-gpu-js)
* [Voronoi with gpu.js](https://observablehq.com/@fil/voronoi-with-gpu-js)
* [The gpu.js loop](https://observablehq.com/@fil/the-gpu-js-loop)
* [GPU.js Example: Mandelbrot Set](https://observablehq.com/@robertleeplummerjr/gpu-js-example-mandelbrot-set)
* [GPU.js Example: Mandelbulb](https://observablehq.com/@robertleeplummerjr/gpu-js-example-mandelbulb)
* [Inverse of the distance with gpu.js](https://observablehq.com/@rveciana/inverse-of-the-distance-with-gpu-js)
* [gpu.js laser detection v2](https://observablehq.com/@robertleeplummerjr/gpu-js-laser-detection-v2)
* [GPU.js Canvas](https://observablehq.com/@hubgit/gpu-js-canvas)
* [Video Convolution using GPU.js](https://observablehq.com/@robertleeplummerjr/video-convolution-using-gpu-js)
* [GPU Rock Paper Scissors](https://observablehq.com/@alexlamb/gpu-rock-paper-scissors)
* [Shaded relief with gpujs and d3js](https://observablehq.com/@rveciana/shaded-relief-with-gpujs-and-d3js/2)
* [Caesar Cipher GPU.js Example](https://observablehq.com/@robertleeplummerjr/caesar-cipher-gpu-js-example)
* [Matrix Multiplication GPU.js + Angular Example](https://ng-gpu.surge.sh/)
* [Conway's game of life](https://observablehq.com/@brakdag/conway-game-of-life-gpu-js)
* [Animated parallel raytracer in TypeScript and GPU.js](https://raytracer.crypt.sg)
* [Bilinear interpolation on an image](https://jsfiddle.net/shadowwarriorpro/tndphL1f/)

More examples with screenshots: [gpu.rocks examples gallery](https://gpu.rocks/examples)

### Community projects
Libraries and tools built on GPU.js:
* [gpujs-real-renderer](https://github.com/HarshKhandeparkar/gpujs-real-renderer) — real-time rendering of graphs, drawing boards, and more on the GPU
* [gpujs-hive-compute](https://github.com/HarshKhandeparkar/gpujs-hive-compute) — distribute a GPU.js computation across multiple machines via WebRTC

A note on CodePen: its JavaScript "loop protection" rewrites loops inside kernel functions (injecting `window.CP.shouldStopExecution(...)`), which breaks kernel transpilation. Disable loop protection in the pen's JS settings, or use Observable/JSFiddle instead.
||||||| 6d7dde3

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
  * 'webgpu' **New!**: Use the `WebGPUKernel` — kernels compile to WGSL compute shaders over storage buffers.  Explicit opt-in only, never auto-selected, because every kernel call returns a `Promise` of its result (WebGPU readback is inherently asynchronous).  Check `GPU.isWebGPUSupported` (synchronous, `navigator.gpu` presence) or `await GPU.isWebGPUAvailable()` (requests an actual adapter).
  * 'webasm' **New!**: Use the `WebAssemblyKernel` — kernels compile to WebAssembly bytecode with f32x4 SIMD, and split across a worker pool under the async contract.  Last in the automatic fallback chain, one step above `cpu`.  See [WebAssembly](#webassembly).
  * 'async' **New!**: Auto-selection under the Promise contract.  Picks the best available backend (headlessgl → webgl2 → webgl → webasm → cpu), turns `asyncMode` on for every kernel, and upgrades a kernel to webgpu on its first call if an adapter answers — falling back to the proven backend if the upgraded kernel cannot handle it.  Write `await kernel(...)` once and the same code runs everywhere:
  ```js
  const gpu = new GPU({ mode: 'async' });
  const kernel = gpu.createKernel(function(a) {
    return a[this.thread.x] * 2;
  }).setOutput([64]);
  const result = await kernel(myArray); // webgpu, webgl2 or cpu underneath
  ```
* `onIstanbulCoverageVariable`: Removed in v2.11.0, use v8 coverage
* `removeIstanbulCoverage`: Removed in v2.11.0, use v8 coverage

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
* `asyncMode` or `kernel.setAsyncMode(boolean)` **New!**: boolean, default = `false` - every call to the kernel returns a `Promise` of the usual result.  On `webgl2` the readback goes through a pixel-pack buffer and a fence, so the main thread stays free while the GPU works (a synchronous kernel call blocks it for the whole readback); on `webgpu` kernels are always asynchronous; the other backends resolve their synchronous result so the calling contract is uniform everywhere.  Adds a small per-readback latency on webgl2 (fence completion granularity) in exchange for the unblocked main thread — pipeline intermediate kernels and await only final results where that matters.  See `mode: 'async'` for automatic backend selection under this contract.
* `graphical` or `kernel.setGraphical(boolean)`: boolean, default = `false`
* `loopMaxIterations` or `kernel.setLoopMaxIterations(number)`: number, default = 1000
* `constants` or `kernel.setConstants(object)`: object, default = null
* `dynamicOutput` or `kernel.setDynamicOutput(boolean)`: boolean, default = false - turns dynamic output on or off
* `dynamicArguments` or `kernel.setDynamicArguments(boolean)`: boolean, default = false - turns dynamic arguments (use different size arrays and textures) on or off
* `optimizeFloatMemory` or `kernel.setOptimizeFloatMemory(boolean)` **New in V2!**: boolean - causes a float32 texture to use all 4 channels rather than 1, using less memory, but consuming more GPU.
* `precision` or `kernel.setPrecision('unsigned' | 'single')` **New in V2!**: 'single' or 'unsigned' - if 'single' output texture uses float32 for each colour channel rather than 8
* `fixIntegerDivisionAccuracy` or `kernel.setFixIntegerDivisionAccuracy(boolean)` : boolean - some cards have accuracy issues dividing by factors of three and some other primes (most apple kit?). Default on for affected cards, disable if accuracy not required.
* `functions` or `kernel.setFunctions(array)`: array, array of functions to be used inside kernel.  If undefined, inherits from `GPU` instance. Can also be an array of `{ source: function, argumentTypes: object, returnType: string }`.
* `nativeFunctions` or `kernel.setNativeFunctions(array)`: object, defined as: `{ name: string, source: string, settings: object }`.  This is generally set via using GPU.addNativeFunction()
  * VERY IMPORTANT! - Use this to add special native functions to your environment when you need specific functionality is needed.
* `injectedNative` or `kernel.setInjectedNative(string)` **New in V2!**: string, defined as: `{ functionName: functionSource }`.  This is for injecting native code before translated kernel functions.
* `subKernels` or `kernel.setSubKernels(array)`: array, generally inherited from `GPU` instance.
* `immutable` or `kernel.setImmutable(boolean)`: boolean, default = `false`
  * VERY IMPORTANT! - This was removed in v2.4.0 - v2.7.0, and brought back in v2.8.0 [by popular demand](https://github.com/gpujs/gpu.js/issues/572), please upgrade to get the feature
* `strictIntegers` or `kernel.setStrictIntegers(boolean)`: boolean, default = `false` - allows undefined argumentTypes and function return values to use strict integer declarations.
* `useLegacyEncoder` or `kernel.setUseLegacyEncoder(boolean)`: boolean, default `false` - more info [here](https://github.com/gpujs/gpu.js/wiki/Encoder-details).
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

### Declaring variables/functions within kernels

GPU.js makes variable declaration inside kernel functions easy.  Variable types supported are:
* `Number` (Integer or Number), example: `let value = 1` or `let value = 1.1` 
* `Boolean`, example: `let value = true`
* `Array(2)`, example: `let value = [1, 1]`
* `Array(3)`, example: `let value = [1, 1, 1]`
* `Array(4)`, example: `let value = [1, 1, 1, 1]`
* `private Function`, example: `function myFunction(value) { return value + 1; }`

`Number` kernel example:
```js
const kernel = gpu.createKernel(function() {
 const i = 1;
 const j = 0.89;
 return i + j;
}).setOutput([100]);
```

`Boolean` kernel example:
```js
const kernel = gpu.createKernel(function() {
  const i = true;
  if (i) return 1;
  return 0;
}).setOutput([100]);
```

`Array(2)` kernel examples:
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

`Array(3)` kernel example:
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

`Array(4)` kernel example:
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

`private Function` kernel example:
```js
const kernel = gpu.createKernel(function() {
  function myPrivateFunction() {
    return [0.08, 2, 0.1, 3];
  }
  
  return myPrivateFunction(); // <-- type inherited here
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
  * **Memory layout**: the dimensions are `[x, y, z]` where `x` is the fastest-varying (innermost) index — element `(x, y, z)` lives at `flattenedArray[x + width * (y + height * z)]`. A kernel access `arg[i][j][k]` reads `z = i`, `y = j`, `x = k`, so `input(flat, [X, Y, Z])` is equivalent to a nested array of shape `[Z][Y][X]`:
  ```js
  input(new Float32Array([1,2, 3,4, 5,6, 7,8]), [2, 2, 2])
  // same as: [ [[1,2],[3,4]], [[5,6],[7,8]] ]
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

const image = document.createElement('img');
image.src = 'my/image/source.png';
image.onload = () => {
  kernel(image);
  // Result: colorful image
  
  document.getElementsByTagName('body')[0].appendChild(kernel.canvas);
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

const image1 = document.createElement('img');
image1.src = 'my/image/source1.png';
image1.onload = onload;
const image2 = document.createElement('img');
image2.src = 'my/image/source2.png';
image2.onload = onload;
const image3 = document.createElement('img');
image3.src = 'my/image/source3.png';
image3.onload = onload;
const totalImages = 3;
let loadedImages = 0;
function onload() {
  loadedImages++;
  if (loadedImages === totalImages) {
    kernel([image1, image2, image3]);
    // Result: colorful image composed of many images

     document.getElementsByTagName('body')[0].appendChild(kernel.canvas);
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
### To `GPU` instance
use `gpu.addFunction(function() {}, settings)` for adding custom functions to all kernels.  Needs to be called BEFORE `gpu.createKernel`. Example:


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

### To `Kernel` instance
use `kernel.addFunction(function() {}, settings)` for adding custom functions to all kernels.  Example:


```js
kernel.addFunction(function mySuperFunction(a, b) {
  return a - b;
});
function anotherFunction(value) {
  return value + 1;
}
kernel.addFunction(anotherFunction);
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

Example on `GPU` instance:
```js
gpu.addFunction(function mySuperFunction(a, b) {
  return [a - b[1], b[0] - a];
}, { argumentTypes: { a: 'Number', b: 'Array(2)'}, returnType: 'Array(2)' });
```

Example on `Kernel` instance:
```js
kernel.addFunction(function mySuperFunction(a, b) {
  return [a - b[1], b[0] - a];
}, { argumentTypes: { a: 'Number', b: 'Array(2)'}, returnType: 'Array(2)' });
```

NOTE: GPU.js infers types if they are not defined and is generally able to detect the types you need, however
'Array(2)', 'Array(3)', and 'Array(4)' are exceptions, at least on the kernel level.  Also, it is nice to have power
over the automatic type inference system.

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
* 'HTMLCanvas' **New in V2.6**
* 'OffscreenCanvas' **New in V2.13**
* 'HTMLImage'
* 'ImageBitmap' **New in V2.14**
* 'ImageData' **New in V2.15**
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
In an effort to make the CPU and GPU work similarly, pipeline on CPU and GPU modes causes the kernel result to be reused when `immutable: false` (which is default).
If you'd like to keep kernel results around, use `immutable: true` and ensure you cleanup memory:
* In gpu mode using `texture.delete()` when appropriate.
* In cpu mode allowing values to go out of context

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

### Cleanup pipeline texture memory **New in V2.4!**
When using `kernel.immutable = true` recycling GPU memory is handled internally, but a good practice is to clean up memory you no longer need it.
Cleanup kernel outputs by using `texture.delete()` to keep GPU memory as small as possible.

NOTE: Internally textures will only release from memory if there are no references to them.
When using pipeline mode on a kernel `K` the output for each call will be a newly allocated texture `T`.
If, after getting texture `T` as an output, `T.delete()` is called, the next call to K will reuse `T` as its output texture.

Alternatively, if you'd like to clear out a `texture` and yet keep it in memory, you may use `texture.clear()`, which
will cause the `texture` to persist in memory, but its internal values to become all zeros.

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
* for instances of `Texture` use the `delete` method. Example: `texture.delete()`
* for instances of `Texture` that you might want to reuse/reset to zeros, use the `clear` method. Example: `texture.clear()`

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
* `Math.acosh()`
* `Math.asin()`
* `Math.asinh()`
* `Math.atan()`
* `Math.atanh()`
* `Math.atan2()`
* `Math.cbrt()`
* `Math.ceil()`
* `Math.cos()`
* `Math.cosh()`
* `Math.exp()`
* `Math.expm1()`
* `Math.floor()`
* `Math.fround()`
* `Math.imul()`
* `Math.log()`
* `Math.log10()`
* `Math.log1p()`
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
  * **Seeding random**: for reproducible results, give a kernel your own seed with `kernel.setRandomSeed(seed)` or the `randomSeed` kernel setting:
    ```js
    const kernel = gpu.createKernel(function() {
      return Math.random();
    }, { output: [64], randomSeed: 42 });
    ```
    A seeded kernel draws from a deterministic stream: consecutive runs still produce different values, but recreating the kernel (or calling `setRandomSeed` again) with the same seed replays the exact same sequence of runs.
    Seeding requires a GPU mode (`gpu`, `webgl`, `webgl2`, `headlessgl`); in `cpu` mode `Math.random()` stays unseeded and a warning is logged.
* `Math.round()`
* `Math.sign()`
* `Math.sin()`
* `Math.sinh()`
* `Math.sqrt()`
* `Math.tan()`
* `Math.tanh()`
* `Math.trunc()`

This is a list and reasons of unsupported ones:
*  `Math.clz32` - bits directly are hard
*  `Math.hypot` - dynamically sized

## How to check what is supported

To assist with mostly unit tests, but perhaps in scenarios outside of GPU.js, there are the following logical checks to determine what support level the system executing a GPU.js kernel may have:
* `GPU.disableValidation()` - turn off all kernel validation
* `GPU.enableValidation()` - turn on all kernel validation
* `GPU.isGPUSupported`: `boolean` - checks if GPU is in-fact supported
* `GPU.isKernelMapSupported`: `boolean` - checks if kernel maps are supported
* `GPU.isOffscreenCanvasSupported`: `boolean` - checks if offscreen canvas is supported
* `GPU.isWebGLSupported`: `boolean` - checks if WebGL v1 is supported
* `GPU.isWebGL2Supported`: `boolean` - checks if WebGL v2 is supported
* `GPU.isHeadlessGLSupported`: `boolean` - checks if headlessgl is supported
* `GPU.isCanvasSupported`: `boolean` - checks if canvas is supported
* `GPU.isGPUHTMLImageArraySupported`: `boolean` - checks if the platform supports HTMLImageArray's
* `GPU.isSinglePrecisionSupported`: `boolean` - checks if the system supports single precision float 32 values

## Typescript Typings
Typescript is supported!  Typings can be found [here](src/index.d.ts)!
For strongly typed kernels:
```typescript
import { GPU, IKernelFunctionThis } from 'gpu.js';
const gpu = new GPU();

function kernelFunction(this: IKernelFunctionThis): number {
  return 1 + this.thread.x;
}

const kernelMap = gpu.createKernel<typeof kernelFunction>(kernelFunction)
  .setOutput([3,3,3]);

const result = kernelMap();

console.log(result as number[][][]);
```

For strongly typed mapped kernels:
```typescript
import { GPU, Texture, IKernelFunctionThis } from 'gpu.js';
const gpu = new GPU();

function kernelFunction(this: IKernelFunctionThis): [number, number] {
  return [1, 1];
}

function subKernel(): [number, number] {
  return [1, 1];
}

const kernelMap = gpu.createKernelMap<typeof kernelFunction>({
  test: subKernel,
}, kernelFunction)
  .setOutput([1])
  .setPipeline(true);

const result = kernelMap();

console.log((result.test as Texture).toArray() as [number, number][]);
```

For extending constants:
```typescript
import { GPU, IKernelFunctionThis } from 'gpu.js';
const gpu = new GPU();

interface IConstants {
  screen: [number, number];
}

type This = {
  constants: IConstants
} & IKernelFunctionThis;

function kernelFunction(this: This): number {
  const { screen } = this.constants;
  return 1 + screen[0];
}

const kernelMap = gpu.createKernel<typeof kernelFunction>(kernelFunction)
  .setOutput([3,3,3])
  .setConstants<IConstants>({
    screen: [1, 1]
  });

const result = kernelMap();

console.log(result as number[][][]);
```

[Click here](/examples) for more typescript examples.

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
* When a minifier such as [esbuild](https://esbuild.github.io/) or terser folds statements into expressions — `if (c) { x = 1; }` into `c && (x = 1)`, statement sequences into comma expressions, if/else into a ternary of assignments — the kernel compiles anyway: the statements are unfolded back before translation, on every backend.  So kernels that reach `createKernel` through a minified bundle work the same as in development.

## WebGPU

**New in 2.20.0!**

WebGPU is what this library always wanted underneath: real compute shaders over real buffers.  Every other GPU backend here works by drawing a full-screen quad and abusing a fragment shader as a compute unit — values packed into texture pixels on the way in, unpacked on the way out.  The WebGPU backend compiles your kernel to a WGSL compute shader reading and writing `f32` storage buffers directly, and it shows: on an Apple M1 Max, a 1024×1024 matrix multiplication including readback runs about **3× faster than the WebGL2 backend** and 370× faster than the CPU.

Because WebGPU has no synchronous readback (correctly — see [v3 Will Be Async by Default](#v3-will-be-async-by-default)), kernel calls in this mode return a `Promise` of the usual result:

```js
const gpu = new GPU({ mode: 'webgpu' });
const kernel = gpu.createKernel(function(a, b) {
  let sum = 0;
  for (let i = 0; i < 512; i++) {
    sum += a[this.thread.y][i] * b[i][this.thread.x];
  }
  return sum;
}).setOutput([512, 512]);

const c = await kernel(a, b); // same result shapes as every other backend
```

Feature detection is two-tier, because `navigator.gpu` can exist on a machine with no usable adapter:

```js
GPU.isWebGPUSupported;        // sync: the API surface exists
await GPU.isWebGPUAvailable(); // async: an adapter actually answered
```

`pipeline: true` resolves to a GPU-resident buffer handle that passes straight into downstream kernels with no readback, and `await handle.toArray()` reads it back when you want the values.  Large 1D outputs dispatch past the 65,535-workgroup limit automatically.

The mode is explicit opt-in and is never auto-selected — a synchronous caller handed a Promise would fail in silent, confusing ways.  If you want automatic selection, that is exactly what [`mode: 'async'`](#asynchronous-kernels) is for.  Graphical mode works: the kernel writes `this.color(...)` into a storage buffer and a fixed render pass presents it to the kernel's canvas — with one API difference, `getPixels()` returns a **Promise** (WebGPU readback is asynchronous). Since presentation needs no readback, an un-awaited `kernel()` per animation frame works.  `Math.random()` works, and differently than on the GL backends: it is a PCG generator in integer WGSL, so with `randomSeed` the stream is **bit-exact across runs and drivers** — the GL backends' float-hash generator cannot promise that.  Not yet supported (each throws a clear error): kernel maps, `toString()`, `precision: 'unsigned'`.

## WebAssembly

**New!**

The `webasm` backend compiles your kernel to a WebAssembly module and runs it on the CPU — but not the way the `cpu` backend does.  Three things separate it from transpiled JavaScript:

* **f32x4 SIMD.**  Every kernel also compiles to a vectorized body that computes four cells per step, divergent control flow handled with lane masks the way real SIMD hardware does it.  The scalar and vector paths are bit-identical — same operations, same order, per cell.
* **Threads, under the async contract.**  With `asyncMode: true` (or `mode: 'async'`), a kernel with at least 4096 output cells splits across a lazy worker pool over one shared `WebAssembly.Memory` — `worker_threads` in Node, `Worker` in the browser (which needs the usual [cross-origin isolation headers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer#security_requirements) for `SharedArrayBuffer`).  Results are identical whatever the split, `Math.random()` included.  The main thread never blocks.  Synchronous calls stay synchronous, single-threaded, and still SIMD.
* **f32 semantics for free.**  Wasm arithmetic *is* IEEE-754 `f32`, so results match the GPU backends' float model without the rounding shims the `cpu` backend needs.

`Math.random()` is the same PCG generator as the webgpu backend, in native i32 arithmetic: with `randomSeed` the stream is bit-exact across runs, platforms, and thread counts.

Honesty about where it sits: any working GL backend outranks it.  In auto-selection (`mode: 'gpu'`, default, or `'async'`) it is chosen only where no GL context exists — a Node build without headless-gl, a browser with WebGL disabled — one step above the `cpu` fallback.  Opt in explicitly to benchmark it:

```js
const gpu = new GPU({ mode: 'webasm' });
const kernel = gpu.createKernel(function(a, b) {
  let sum = 0;
  for (let i = 0; i < 512; i++) {
    sum += a[this.thread.y][i] * b[i][this.thread.x];
  }
  return sum;
}).setOutput([512, 512]);

const c = kernel(a, b);        // synchronous, SIMD
```

A kernel is priced by the work it describes.  A scatter algorithm rewritten gather-style so every thread computes its own cell — compaction as a binary search per output slot, a histogram as a per-bin scan — does log-factor or bin-count times the reads of the plain loop it replaces; a GL backend hides that multiplier under thousands of parallel threads, while cpu and webasm execute it serially and pay it in full.  Measured against hand-written JavaScript of the *same* transposed algorithm, the cpu backend is within 2% and webasm within ±1.5× (its SIMD gather is often faster) — the cost is the transposition, not the transpilation.  When cpu or webasm is a likely destination, prefer the direct algorithm over the GPU-shaped rewrite.

`GPU.isWebAssemblySupported` reports the platform answer.  `pipeline: true` is accepted the way the cpu backend accepts it: there is no device memory to pipeline into, so the result is a plain typed array (a fresh copy per call) that passes straight into downstream kernels.  Not yet supported: graphical mode, kernel maps, and texture/image arguments all **degrade to the cpu backend** — in auto modes and under explicit `mode: 'webasm'` alike — the console warning names the reason and `kernel.kernel.fallbackReason` carries it queryably; a graphical fallback renders into the kernel's own canvas; `toString()` throws.  Threaded runs accept a `poolSize` setting to cap the worker pool (defaults to `hardwareConcurrency`, or 4 when it cannot be read).  `precision: 'unsigned'` is accepted and computed as single precision — wasm has no packed storage to be lossy in.

## Pipeline Compilation

**New!**

`gpu.createPipeline` compiles a whole multi-kernel computation — loops included — into one callable plan:

```js
const sweep = gpu.createKernel(function(u, q) {
  const x = this.thread.x, y = this.thread.y;
  if (x === 0 || y === 0 || x === this.constants.hi || y === this.constants.hi) return u[y][x];
  return 0.25 * (u[y][x - 1] + u[y][x + 1] + u[y - 1][x] + u[y + 1][x] + q[y][x]);
}, { constants: { hi: 1023 }, output: [1024, 1024] });

const solve = gpu.createPipeline(function(u, q) {
  for (let s = 0; s < this.constants.sweeps; s++) {
    u = sweep(u, q);
  }
  return u;
}, { constants: { sweeps: 512 } });

const result = await solve(u0, q);   // one launch, fences inside, one readback
```

The orchestration function runs **once**, at build time (the first call), with opaque handles standing in for its arguments.  The kernel calls it makes are recorded — nothing executes — and plain JS control flow simply unrolls: the loop above records 512 steps over ONE kernel and two alternating buffers (a step that would overwrite data a later step still reads gets double-buffering automatically; liveness is static because the unrolled plan is a DAG).  Every later call executes the compiled plan without re-entering your code, intermediates never leave device memory, and you pay one readback at the end.  Return a handle, an Array of handles, or a plain object of handles — the call resolves to the same shape holding plain results.  Not to be confused with [Pipelining](#pipelining): `pipeline: true` keeps one kernel's *output* resident and leaves the orchestration to you per call; `createPipeline` compiles the orchestration itself.  Inner kernels do **not** need `pipeline: true` — intermediate residency is the pipeline's business, and kernels stay shared between pipelines and direct use.

Because orchestration is tracing, not running, these are the rules — each violation throws at build, naming itself:

* **A handle cannot be read.**  Elements, properties, `.toArray()` — anything that would need the value throws `pipeline intermediate results cannot be read during orchestration`.  A handle's only legal destinations are a kernel argument and the return value.
* **A handle cannot be used in arithmetic or a condition.**  `if (u > 0)`, `u + 1`, `` `${u}` `` — anything that coerces throws.  Loop bounds and branches must come from `this.constants`, pipeline settings, or plain captured values.
* **`Math.random()` throws during orchestration.**  A trace-time draw would freeze one number into every later call; orchestration must be deterministic.  `Math.random()` *inside kernels* is untouched — seeds are drawn per call, per step, at execution time.
* **Only kernel calls are recorded, and only kernels created by the same `GPU` instance.**  Anything else a handle escapes into throws where detection is possible — handles are frozen, own-property-free class instances, so nearly any use trips a trap — but a function that merely stores a handle without touching it is beyond detection; what it stored is useless anyway.
* **Non-handle values freeze into the plan at trace time.**  `this.constants` are trace-time facts (`sweeps: 512` above *is* the unroll count) — change them with `pipeline.setConstants({...})`, which invalidates the plan and re-traces on the next call, exactly the settings contract kernels already follow.  Closure-captured values behave the same way: snapshotted when the trace reads them, like constants.  Arguments passed to the *pipeline* are sampled at call time and uploaded once per call.

Calling a pipeline **always returns a Promise** — the [async contract](#asynchronous-kernels) — and concurrent calls to one pipeline serialize in call order, like threaded kernels.  `pipeline.destroy()` releases the plan's buffers and instances, and `gpu.destroy()` reaches pipelines the way it reaches kernels.

Every backend runs pipelines.  The reference path (`executorKind: 'generic'`) walks the plan through the normal kernel machinery — private per-pipeline kernel instances with `pipeline: true` forced on, your kernel's settings never observably touched — so on GL it is textures end-to-end.  On **webasm** the plan *fuses*: every step compiles over one shared `WebAssembly.Memory` laid out `[pipeline args | plan buffers]`, passes run back-to-back with intermediates never copied out between steps (`'fused-sync'`), and where wasm threads are available the worker pool executes the *whole plan* per worker with Atomics-based barriers between steps — one dispatch per pipeline call, no main-thread round trip per pass (`'fused-threaded'`).  Anything the webasm backend cannot take degrades to the generic executor under its usual contract: the reason is queryable at `pipeline.fallbackReason`, and `pipeline.executorKind` tells you which executor actually ran.

### Reading what actually executed

Introspection is **supported API**, not plan internals — it exists precisely so a correctness harness can assert the backend it asked for is the backend that ran (the guard that caught seventeen silent CPU degradations in #868):

* `pipeline.executorKind` — `'fused-threaded'` / `'fused-sync'` (webasm), `'fused-encoder'` (webgpu), or `'generic'` (every backend, and the degradation target of the fused executors).
* `pipeline.backend` — the mode of the kernels that actually execute, derived from the executor that ran; under degradation it says `'cpu'`, exactly like `kernel.kernel.constructor.mode` does for kernels.
* `pipeline.fallbackReason` — why a fused executor declined this plan, `null` while fused.
* `createPipeline(fn, { threads: false })` pins the webasm lowering to its sync path, for callers (benchmarks, mainly) whose comparisons must stay single-threaded.

What the fusion buys, measured on the gauntlet's jacobi and heat benches rewritten via `createPipeline` (checksums identical to the per-pass versions): **5.7× on heat threaded, 5.2× on jacobi** (heat 890 ms vs 5073 ms per-pass, jacobi 387 ms vs 1997 ms — and 2.8×/3.2× over plain JavaScript on rows the webasm backend previously lost), against the same kernels called per pass on webasm.  The per-pass costs it deletes are exactly the ones that dominate short passes — a task round-trip through the worker pool per call, argument re-upload, and a readback per step — leaving the arithmetic, which was already SIMD.

On **webgpu** the same benches run **1.55–1.62×** over per-pass chaining (jacobi 28 ms vs 44, heat 37 vs 60) — a smaller multiplier because webgpu's per-pass baseline already pipelines on the GPU queue; the encoder fusion removes the per-call JS, bind, and submit overhead that remains, and long chains feel it most (a 12,289-pass wavefront ran **10× faster** migrated).  On the **GL backends** the generic executor runs at parity with a hand-rolled two-kernel ping-pong — the pattern it generates for you — so the ergonomic win is the whole win there: one kernel and a plain loop replace duplicate kernels, upload kernels, and manual texture juggling, with identical results and no leaked per-step textures.

Not in v1, stated plainly:

* **No mid-plan readback.**  The plan runs start to finish; you cannot inspect an intermediate and stop early.  The name `this.check` on the orchestration context is **reserved** for this: the future design records `this.check(handle, predicate)` as a checkpoint step where the executor reads back a small reduction every N passes and ends the plan early when the predicate answers converged — residual thresholds in iterative solvers, without surrendering the fused loop.  Nothing you write today should put a `check` on the orchestration `this`.
* **No graphical kernels inside pipelines** — throws at build.
* **No kernel maps inside pipelines** — throws at build.
* **`toString()` is deferred** — a pipeline cannot be exported as source yet.

On webgpu, pipelines compile to the `fused-encoder` executor: every step is recorded as a compute pass into ONE command encoder over persistent storage buffers (ping-pong steps alternate between two static bind groups), one `queue.submit` runs the whole plan, and the results come back through a single `mapAsync` readback.  Anything the encoder cannot take statically — GPU-resident handles as pipeline arguments, vector-returning intermediates — degrades to the generic executor with the reason in `fallbackReason`.

## Asynchronous Kernels

**New in 2.20.0!**

Async is a property any kernel can have, on any backend.  `asyncMode: true` (or `kernel.setAsyncMode(true)`) makes every call return a `Promise` of the usual result:

```js
const kernel = gpu.createKernel(fn, { output: [64], asyncMode: true });
const result = await kernel(myArray);
```

What that buys depends on the backend, but the contract never changes:

* **webgl2** — the readback becomes genuinely non-blocking: results are read through a pixel-pack buffer behind a GPU fence, and the main thread keeps running while the GPU works.  In a readback-heavy loop that froze the page for 105 ms straight, the same loop under `asyncMode` never stalls the main thread longer than 5 ms (measure yours: `node scripts/benchmark-async.mjs`).  The trade is a few milliseconds of added latency per readback, so pipeline intermediate kernels and await only final results where throughput matters.
* **webgpu** — kernels are natively asynchronous; `asyncMode` is always on.
* **cpu, webgl, headlessgl** — the synchronous result is resolved, so the calling contract stays uniform and your code stays portable.

`mode: 'async'` puts the whole `GPU` instance under this contract and picks the backend for you — the best synchronously-provable one immediately (headlessgl → webgl2 → webgl → webasm → cpu), upgraded to WebGPU on a kernel's first call if an adapter actually answers.  On a GL-less platform that means webasm, where the async contract also unlocks its worker-pool threading — see the WebAssembly section for the SharedArrayBuffer caveat.  **Graphical kernels bind at creation instead**: a canvas is permanently committed to its first context type, so the backend is decided before `kernel.canvas` is ever exposed — `await GPU.isWebGPUAvailable()` before `createKernel` to guarantee the probe has settled; a kernel created before it settles stays on the proven backend, and either way the canvas never changes identity.  The Promise contract is exactly what buys the room for that probe.  A kernel the WebGPU backend cannot take yet (a kernel map, say) simply stays on the proven backend:

```js
const gpu = new GPU({ mode: 'async' });
const kernel = gpu.createKernel(function(a) {
  return a[this.thread.x] * 2;
}).setOutput([64]);

const result = await kernel(myArray); // webgpu, webgl2 or cpu underneath — same code
```

## Full API Reference

You can find a [complete API reference here](https://gpu.rocks/api/).

The reference is generated from the source with `npm run docs` and hosted from the [gpu.rocks repository](https://github.com/gpujs/gpu.rocks) (`public/api/`).

## How possible in node?
GPU.js uses [HeadlessGL](https://github.com/stackgl/headless-gl) in node for GPU acceleration.
GPU.js is written in such a way, you can introduce your own backend.  Have a suggestion?  We'd love to hear it!

## Terms Explained
* Kernel - A function that is tightly coupled to program that runs on the Graphic Processor
* Texture - A graphical artifact that is packed with data, in the case of GPU.js, bit shifted parts of a 32 bit floating point decimal

## Testing
* For node, run `npm test`, or narrow it down with one of:
  * `npx qunit test/features`
  * `npx qunit test/internal`
  * `npx qunit test/issues`
* For browser, set up a webserver on the root of the gpu.js project and visit http://url/test/all.html

### Real browsers and devices

Because gpu.js ultimately depends on whatever the GPU driver behind a WebGL
context does, it is also tested on real browsers and real mobile devices on
[BrowserStack](https://www.browserstack.com/).

<a href="https://www.browserstack.com/"><img src="https://d98b8t1nnulk5.cloudfront.net/production/images/layout/logo-header.png?1469004780" alt="BrowserStack" height="40"></a>

**This project is tested with BrowserStack.**

To run it yourself you need a BrowserStack Automate account:

```bash
npm run make                  # the devices test dist/, so build it first
export BROWSERSTACK_USERNAME=...
export BROWSERSTACK_ACCESS_KEY=...
npm run test:browserstack      # smoke suite on real iOS/Android devices
```

The runner serves this checkout over a BrowserStack Local tunnel, so the
devices exercise your working copy rather than a published build. Options:

| Command | What it does |
| --- | --- |
| `npm run test:browserstack` | Smoke suite on the real-device set |
| `npm run test:browserstack:desktop` | Smoke suite on desktop Chrome/Firefox/Edge/Safari |
| `node test/browserstack/run.js --browsers=all` | Both sets |
| `node test/browserstack/run.js --only=iPhone` | Only targets whose name matches |
| `node test/browserstack/run.js --suite=visual` | Visual regression: compares rendered output against each device's own CPU render |
| `node test/browserstack/run.js --suite=qunit` | The full `test/all.html` suite instead of the smoke suite |

The smoke suite (`test/browserstack/smoke.html`) covers kernel compilation and
execution in `cpu`, `webgl` and `webgl2` modes: 1D/2D/3D output, loops and
branching, `Math` built-ins, constants and custom functions, typed-array and
`input()` arguments, dynamic output, texture pipelines, graphical output,
kernel maps, and both precision modes.

The visual suite (`test/browserstack/visual.html`) renders a flat fill, a
gradient and a Mandelbrot in each GPU mode and compares them against the same
device's CPU render, which is bit-identical across hardware. Pixel-exact
comparison between devices does not work — GPUs disagree by a least significant
bit on ordinary rounding — so it asserts against measured tolerances instead.

Targets live in `test/browserstack/browsers.js`. Results are written to
`browserstack-results.json`.

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
<!-- Was opencollective.com/gpujs/contributors.svg, which now returns HTTP 500
     for every collective — their image generator queries a GraphQL field
     ("githubContributors") that their own API no longer has. The backers and
     sponsor images below still work, so only this one moved. -->
<a href="https://github.com/gpujs/gpu.js/graphs/contributors"><img src="https://contrib.rocks/image?repo=gpujs/gpu.js" /></a>


### Backers

Thank you to all our backers! 🙏 [[Become a backer](https://opencollective.com/gpujs#backer)]

<a href="https://opencollective.com/gpujs#backers" target="_blank"><img src="https://opencollective.com/gpujs/backers.svg?width=890"></a>


### Sponsors

Support this project by becoming a sponsor. Your logo will show up here with a link to your website. [[Become a sponsor](https://opencollective.com/gpujs#sponsor)]

![](https://www.leadergpu.com/assets/main/logo_leadergpu-a8cacac0c90d204b7f7f6c8420c6a149e71ebe53f3f28f3fc94a01cd05c0bd93.png)
Sponsored NodeJS GPU environment from [LeaderGPU](https://www.leadergpu.com) - These guys rock!

![](https://d98b8t1nnulk5.cloudfront.net/production/images/layout/logo-header.png)
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
