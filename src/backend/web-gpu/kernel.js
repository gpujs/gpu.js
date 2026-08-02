const { Kernel } = require('../kernel');
const { FunctionBuilder } = require('../function-builder');
const { WGSLFunctionNode } = require('./function-node');
const { WebGPUContext } = require('./context');
const { WebGPUBufferResult } = require('./buffer-result');
const { utils } = require('../../utils');
const { Input } = require('../../input');

// GPUBufferUsage/GPUMapMode are globals only where WebGPU exists; the
// numeric values are pinned by the spec, so carrying them keeps this module
// loadable (and the deferred-feature errors reachable) everywhere else
const USAGE_UNIFORM = 0x0040;
const USAGE_STORAGE = 0x0080;
const USAGE_COPY_SRC = 0x0004;
const USAGE_COPY_DST = 0x0008;
const USAGE_MAP_READ = 0x0001;
const MAP_MODE_READ = 0x0001;

const features = Object.freeze({
  kernelMap: false,
  isIntegerDivisionAccurate: true,
  isSpeedTacticSupported: false,
  isTextureFloat: true,
  isDrawBuffers: false,
  kernelMapSize: 0,
  channelCount: 1,
  maxTextureSize: Infinity,
  isFloatRead: true,
});

// module-scope fn helpers, injected only when the translated source calls them
const wgslHelpers = {
  '_pow': 'fn _pow(v1 : f32, v2 : f32) -> f32 {\n  if (v2 == 0.0) { return 1.0; }\n  return pow(v1, v2);\n}',
  '_round': 'fn _round(x : f32) -> f32 {\n  return floor(x + 0.5);\n}',
  'cbrt': 'fn cbrt(x : f32) -> f32 {\n  return sign(x) * pow(abs(x), 1.0 / 3.0);\n}',
  'expm1': 'fn expm1(x : f32) -> f32 {\n  return exp(x) - 1.0;\n}',
  'fround': 'fn fround(x : f32) -> f32 {\n  return x;\n}',
  'imul': 'fn imul(a : f32, b : f32) -> f32 {\n  return f32(i32(a) * i32(b));\n}',
  'log10': `fn log10(x : f32) -> f32 {\n  return log2(x) * ${ 1 / Math.log2(10) };\n}`,
  'log1p': 'fn log1p(x : f32) -> f32 {\n  return log(1.0 + x);\n}',
  'clz32': 'fn clz32(x : f32) -> f32 {\n  return f32(countLeadingZeros(u32(x)));\n}',
};

/**
 * @desc Kernel implementation for WebGPU compute shaders over storage
 * buffers. `run()` returns a Promise — readback requires `mapAsync` and
 * there is no honest synchronous alternative — which `kernelRunShortcut`
 * passes through untouched (keyed on `isAsync`).
 */
class WebGPUKernel extends Kernel {
  static get isSupported() {
    return WebGPUContext.isSupported;
  }

  /**
   * Marks run() as Promise-returning for kernelRunShortcut.
   */
  static get isAsync() {
    return true;
  }

  static isContextMatch(context) {
    return Boolean(context && typeof context.createShaderModule === 'function' && typeof context.createComputePipeline === 'function');
  }

  static getFeatures() {
    return features;
  }

  static get features() {
    return features;
  }

  static get mode() {
    return 'webgpu';
  }

  static getSignature(kernel, argumentTypes) {
    return 'webgpu' + (argumentTypes.length > 0 ? ':' + argumentTypes.join(',') : '');
  }

  /**
   * The shared device is a module singleton that outlives any one GPU
   * instance; page-level teardown goes through WebGPUContext.destroy().
   */
  static destroyContext(context) {}

  static nativeFunctionArguments() {
    throw new Error('WebGPU backend does not yet support native functions');
  }

  static nativeFunctionReturnType() {
    throw new Error('WebGPU backend does not yet support native functions');
  }

  static combineKernels() {
    throw new Error('WebGPU backend does not yet support combineKernels; chain kernels with `await` and pipeline mode instead');
  }

  constructor(source, settings) {
    super(source, settings);
    if (settings) {
      if (settings.precision === 'unsigned' && !settings.graphical) {
        throw new Error(`WebGPU backend does not yet support precision: 'unsigned'; it is single precision only`);
      }
      if (settings.subKernels) {
        throw new Error('WebGPU backend does not yet support createKernelMap');
      }
    }
    this.mergeSettings(source.settings || settings);
    if (this.precision === null || this.graphical) {
      // graphical too: the base graphical default of 'unsigned' describes the
      // GL RGBA8 render target; here colors are f32s in a storage buffer and
      // only the presented canvas is 8-bit
      this.precision = 'single';
    }
    // natively async: every run returns a Promise regardless of the setting
    this.asyncMode = true;

    this.threadDim = null;
    this.componentCount = 1;
    this.compiledSource = null;
    this.translatedBody = null;
    this.translatedFunctions = null;
    this.paramsLayout = null;

    this._buildPromise = null;
    this._device = null;
    this.computePipeline = null;
    this.bindGroupLayout = null;
    this.bindGroup = null;
    this.bindGroupDirty = true;
    this.paramsBuffer = null;
    this.paramsMirror = null;
    this.outputBuffer = null;
    this.argumentBuffers = null;
    this.constantBuffers = null;
    this.stagingPool = [];
    this._canvasContext = null;
    this._blitPipeline = null;
    this._blitParamsBuffer = null;
    this._blitBindGroup = null;
    this._blitBoundOutputBuffer = null;
  }

  initCanvas() {
    if (this.graphical && typeof document !== 'undefined') {
      return document.createElement('canvas');
    }
    return null;
  }

  initContext() {
    // the device is acquired asynchronously on first run; nothing synchronous
    // to hand the base class here
    return null;
  }

  initPlugins(settings) {
    return [];
  }

  setOutput(output) {
    const newOutput = this.toKernelOutput(output);
    if (this.built) {
      if (!this.dynamicOutput) {
        throw new Error('Resizing a kernel with dynamicOutput: false is not possible');
      }
      if (newOutput.length !== this.output.length) {
        throw new Error('WebGPU backend does not yet support changing the output rank of a built kernel; the workgroup shape is fixed at build');
      }
    }
    this.output = newOutput;
    return this;
  }

  toString() {
    throw new Error('WebGPU backend does not yet support toString');
  }

  validateSettings(args) {
    if (this.graphical) {
      if (!this.output || this.output.length !== 2) {
        throw new Error('Output must have 2 dimensions on graphical mode');
      }
      if (this.pipeline) {
        throw new Error('graphical mode and pipeline mode are mutually exclusive');
      }
      if (!this.canvas) {
        throw new Error('graphical mode requires a canvas (none could be created; pass one in settings)');
      }
    }
    if (this.precision === 'unsigned') {
      throw new Error(`WebGPU backend does not yet support precision: 'unsigned'; it is single precision only`);
    }
    this.precision = 'single';
    if (this.subKernels && this.subKernels.length > 0) {
      throw new Error('WebGPU backend does not yet support createKernelMap');
    }

    if (!this.output || this.output.length === 0) {
      if (args.length !== 1) {
        throw new Error('Auto output only supported for kernels with only one input');
      }
      const argType = utils.getVariableType(args[0], this.strictIntegers);
      if (argType === 'Array') {
        this.output = Array.from(utils.getDimensions(args[0]));
      } else if (argType === 'WebGPUBuffer') {
        this.output = Array.from(args[0].output);
      } else {
        throw new Error('Auto output not supported for input type: ' + argType);
      }
    }
    this.checkOutput();
  }

  setupArguments(args) {
    super.setupArguments(args);
    for (let i = 0; i < this.argumentTypes.length; i++) {
      switch (this.argumentTypes[i]) {
        case 'Array':
        case 'Input':
        case 'WebGPUBuffer':
        case 'Number':
        case 'Float':
        case 'Integer':
        case 'Boolean':
          continue;
        default:
          throw new Error(`WebGPU backend does not yet support argument type ${ this.argumentTypes[i] } (argument "${ this.argumentNames[i] }")`);
      }
    }
  }

  setupConstants() {
    super.setupConstants();
    for (const name in this.constantTypes) {
      switch (this.constantTypes[name]) {
        case 'Array':
        case 'Input':
        case 'Number':
        case 'Float':
        case 'Integer':
        case 'Boolean':
        case 'Array(2)':
        case 'Array(3)':
        case 'Array(4)':
          continue;
        default:
          throw new Error(`WebGPU backend does not yet support constant type ${ this.constantTypes[name] } (constant "${ name }")`);
      }
    }
  }

  /**
   * Everything device-independent — validation, JS→WGSL translation, module
   * assembly — happens synchronously here, so unsupported constructs throw at
   * the first call rather than rejecting; the device round trip continues in
   * _buildAsync and run() chains on its promise.
   */
  build() {
    if (this.built) return Promise.resolve();
    if (this._buildPromise) return this._buildPromise;
    this.setupConstants();
    this.setupArguments(arguments);
    this.validateSettings(arguments);
    const threadDim = this.threadDim = Array.from(this.output);
    while (threadDim.length < 3) {
      threadDim.push(1);
    }
    this.translateSource();
    this.paramsLayout = this.computeParamsLayout();
    this.compiledSource = this.assembleWGSL();
    if (this.debug) {
      console.log('WGSL Shader Output:');
      console.log(this.compiledSource);
    }
    this.buildSignature(arguments);
    return this._buildPromise = this._buildAsync();
  }

  translateSource() {
    const functionBuilder = FunctionBuilder.fromKernel(this, WGSLFunctionNode);
    // dependencies first, the root kernel's bare body statements last
    const prototypes = functionBuilder.getPrototypes('kernel');
    this.translatedBody = prototypes[prototypes.length - 1];
    this.translatedFunctions = prototypes.slice(0, -1).join('\n');
    if (this.graphical) {
      // no return value: this.color() writes four components per pixel
      this.componentCount = 4;
      return;
    }
    if (!this.returnType) {
      this.returnType = functionBuilder.getKernelResultType();
    }
    switch (this.returnType) {
      case 'Number':
      case 'Float':
      case 'Integer':
      case 'LiteralInteger':
        this.componentCount = 1;
        break;
      case 'Array(2)':
        this.componentCount = 2;
        break;
      case 'Array(3)':
        this.componentCount = 3;
        break;
      case 'Array(4)':
        this.componentCount = 4;
        break;
      default:
        throw new Error(`WebGPU backend does not yet support returning ${ this.returnType }`);
    }
  }

  /**
   * Params struct, matching the WGSL struct member for member:
   * outputX/outputY/outputZ/_pad0, one vec4<u32> [sizeX, sizeY, sizeZ, total]
   * per array argument, then scalar arguments as f32/i32/u32, the whole
   * buffer padded to a 16-byte multiple.
   */
  computeParamsLayout() {
    const arrayArgs = [];
    const scalarArgs = [];
    let offset = 16;
    for (let i = 0; i < this.argumentTypes.length; i++) {
      const type = this.argumentTypes[i];
      const name = utils.sanitizeName(this.argumentNames[i]);
      if (type === 'Array' || type === 'Input' || type === 'WebGPUBuffer') {
        arrayArgs.push({
          name,
          index: i,
          type,
          dimsOffset: offset,
          buffer: null,
          boundBuffer: null,
        });
        offset += 16;
      } else {
        scalarArgs.push({
          name,
          index: i,
          type,
          offset: null, // assigned below; scalars pack after the vec4 rows
        });
      }
    }
    for (let i = 0; i < scalarArgs.length; i++) {
      scalarArgs[i].offset = offset;
      offset += 4;
    }
    // runs after translateSource, so the translated text already says whether
    // this kernel draws randomness; the seed slot only exists when it does
    let randomSeedOffset = null;
    if (/\bpcg_random\(/.test(`${ this.translatedFunctions }\n${ this.translatedBody }`)) {
      randomSeedOffset = offset;
      offset += 4;
    }
    const bufferConstants = [];
    if (this.constants) {
      for (const name in this.constants) {
        if (!this.constants.hasOwnProperty(name)) continue;
        const type = this.constantTypes[name];
        if (type === 'Array' || type === 'Input') {
          bufferConstants.push({
            name: utils.sanitizeName(name),
            constantName: name,
            buffer: null,
          });
        }
      }
    }
    return {
      arrayArgs,
      scalarArgs,
      bufferConstants,
      randomSeedOffset,
      byteLength: Math.ceil(offset / 16) * 16,
    };
  }

  scalarWGSLType(type) {
    switch (type) {
      case 'Integer':
        return 'i32';
      case 'Boolean':
        return 'u32'; // bool is not host-shareable; rehydrated with bool()
      default:
        return 'f32';
    }
  }

  assembleWGSL() {
    const { arrayArgs, scalarArgs, bufferConstants } = this.paramsLayout;
    const wgsl = [];

    const structMembers = [
      '  outputX : u32,',
      '  outputY : u32,',
      '  outputZ : u32,',
      '  dispatchWidth : u32,',
    ];
    for (let i = 0; i < arrayArgs.length; i++) {
      structMembers.push(`  user_${ arrayArgs[i].name }_dims : vec4<u32>,`);
    }
    for (let i = 0; i < scalarArgs.length; i++) {
      structMembers.push(`  user_${ scalarArgs[i].name } : ${ this.scalarWGSLType(scalarArgs[i].type) },`);
    }
    if (this.paramsLayout.randomSeedOffset !== null) {
      structMembers.push('  randomSeed : u32,');
    }
    wgsl.push('struct Params {', structMembers.join('\n'), '}');
    wgsl.push('@group(0) @binding(0) var<uniform> params : Params;');

    for (let i = 0; i < arrayArgs.length; i++) {
      wgsl.push(`@group(0) @binding(${ 1 + i }) var<storage, read> user_${ arrayArgs[i].name } : array<f32>;`);
    }
    const outBinding = 1 + arrayArgs.length;
    wgsl.push(`@group(0) @binding(${ outBinding }) var<storage, read_write> result : array<f32>;`);
    if (this.graphical) {
      // this.color() lowers to this; a helper rather than inline writes so
      // each channel expression is evaluated exactly once
      wgsl.push(
        'fn kernelColor(index : i32, r : f32, g : f32, b : f32, a : f32) {\n' +
        '  result[index * 4] = r;\n' +
        '  result[index * 4 + 1] = g;\n' +
        '  result[index * 4 + 2] = b;\n' +
        '  result[index * 4 + 3] = a;\n' +
        '}');
    }
    for (let i = 0; i < bufferConstants.length; i++) {
      wgsl.push(`@group(0) @binding(${ outBinding + 1 + i }) var<storage, read> constants_${ bufferConstants[i].name } : array<f32>;`);
    }

    // helper functions can read the invocation id through this mirror; the
    // entry parameter itself is scoped to main
    wgsl.push('var<private> threadGid : vec3<u32>;');

    if (this.paramsLayout.randomSeedOffset !== null) {
      // PCG (permuted congruential): u32 state advanced per draw, RXS-M-XS
      // output permutation. Integer arithmetic end to end, so unlike the GL
      // backends' sin-fract hash the stream is bit-exact across drivers; the
      // top 24 bits scale into [0, 1) at full f32 mantissa resolution.
      wgsl.push(
        'var<private> pcgState : u32;\n' +
        'fn pcg_random() -> f32 {\n' +
        '  pcgState = pcgState * 747796405u + 2891336453u;\n' +
        '  let word = ((pcgState >> ((pcgState >> 28u) + 4u)) ^ pcgState) * 277803737u;\n' +
        '  let mixed = (word >> 22u) ^ word;\n' +
        '  return f32(mixed >> 8u) / 16777216.0;\n' +
        '}');
    }

    const translated = `${ this.translatedFunctions }\n${ this.translatedBody }`;
    if (/\bLOOP_MAX\b/.test(translated)) {
      wgsl.push(`const LOOP_MAX : i32 = ${ parseInt(this.loopMaxIterations, 10) || 1000 };`);
    }
    for (const helperName in wgslHelpers) {
      if (new RegExp(`\\b${ helperName }\\(`).test(translated)) {
        wgsl.push(wgslHelpers[helperName]);
      }
    }

    // flat row-major accessors, index = x + sizeX * (y + sizeY * z) — the
    // exact formula the GL path's get32 uses, so layouts agree by construction
    for (let i = 0; i < arrayArgs.length; i++) {
      const name = arrayArgs[i].name;
      wgsl.push(
        `fn get_user_${ name }(z : i32, y : i32, x : i32) -> f32 {\n` +
        `  return user_${ name }[u32(x + i32(params.user_${ name }_dims.x) * (y + i32(params.user_${ name }_dims.y) * z))];\n` +
        `}`);
    }
    for (let i = 0; i < bufferConstants.length; i++) {
      const record = bufferConstants[i];
      const value = this.constants[record.constantName];
      const dims = this.constantDimensions(value);
      // constants never change shape after build; dims bake straight in
      wgsl.push(
        `fn get_constants_${ record.name }(z : i32, y : i32, x : i32) -> f32 {\n` +
        `  return constants_${ record.name }[u32(x + ${ dims[0] } * (y + ${ dims[1] } * z))];\n` +
        `}`);
    }

    if (this.translatedFunctions) {
      wgsl.push(this.translatedFunctions);
    }

    const workgroupSize = this.output.length === 1 ? [64, 1, 1] : [8, 8, 1];
    this.workgroupSize = workgroupSize;
    if (this.output.length === 1) {
      // A 1D dispatch folds across Y once it would exceed the per-dimension
      // workgroup limit (65535 groups of 64 = ~4.19M threads); the flat index
      // is reconstructed from the dispatch width the runtime used.
      wgsl.push(
        `@compute @workgroup_size(${ workgroupSize[0] }, ${ workgroupSize[1] }, ${ workgroupSize[2] })\n` +
        `fn main(@builtin(global_invocation_id) gid : vec3<u32>) {\n` +
        `  let flat_index : u32 = gid.x + gid.y * params.dispatchWidth;\n` +
        `  threadGid = vec3<u32>(flat_index, 0u, 0u);\n` +
        `  if (flat_index >= params.outputX) { return; }\n` +
        `  let data_index : i32 = i32(flat_index);\n` +
        `${ this.paramsLayout.randomSeedOffset !== null ? '  pcgState = (params.randomSeed + u32(data_index) * 2654435769u) * 747796405u + 2891336453u;\n' : '' }` +
        `${ this.translatedBody }\n` +
        `}`);
    } else {
      wgsl.push(
        `@compute @workgroup_size(${ workgroupSize[0] }, ${ workgroupSize[1] }, ${ workgroupSize[2] })\n` +
        `fn main(@builtin(global_invocation_id) gid : vec3<u32>) {\n` +
        `  threadGid = gid;\n` +
        `  if (gid.x >= params.outputX || gid.y >= params.outputY || gid.z >= params.outputZ) { return; }\n` +
        `  let data_index : i32 = i32(gid.x + params.outputX * (gid.y + params.outputY * gid.z));\n` +
        `${ this.paramsLayout.randomSeedOffset !== null ? '  pcgState = (params.randomSeed + u32(data_index) * 2654435769u) * 747796405u + 2891336453u;\n' : '' }` +
        `${ this.translatedBody }\n` +
        `}`);
    }

    return wgsl.join('\n');
  }

  constantDimensions(value) {
    const dims = value instanceof Input ?
      Array.from(value.size) :
      Array.from(utils.getDimensions(value));
    while (dims.length < 3) {
      dims.push(1);
    }
    return dims;
  }

  async _buildAsync() {
    const context = await WebGPUContext.acquire();
    this.context = context;
    const device = this._device = context.device;

    const module = device.createShaderModule({ code: this.compiledSource });
    const info = await module.getCompilationInfo();
    const errors = info.messages.filter(message => message.type === 'error');
    if (errors.length > 0) {
      // same shape as the GL path's shader-info-log throw: the line numbers
      // index into the generated WGSL, which is appended for debugging
      throw new Error(
        'Error compiling WGSL compute shader:\n' +
        errors.map(message => `  ${ message.lineNum }:${ message.linePos } ${ message.message }`).join('\n') +
        `\n--- generated WGSL ---\n${ this.compiledSource }`);
    }

    const { arrayArgs, bufferConstants, byteLength } = this.paramsLayout;
    const layoutEntries = [{
      binding: 0,
      visibility: 4, // GPUShaderStage.COMPUTE
      buffer: { type: 'uniform' },
    }];
    for (let i = 0; i < arrayArgs.length; i++) {
      layoutEntries.push({
        binding: 1 + i,
        visibility: 4,
        buffer: { type: 'read-only-storage' },
      });
    }
    const outBinding = 1 + arrayArgs.length;
    layoutEntries.push({
      binding: outBinding,
      visibility: 4,
      buffer: { type: 'storage' },
    });
    for (let i = 0; i < bufferConstants.length; i++) {
      layoutEntries.push({
        binding: outBinding + 1 + i,
        visibility: 4,
        buffer: { type: 'read-only-storage' },
      });
    }
    this.bindGroupLayout = device.createBindGroupLayout({ entries: layoutEntries });

    device.pushErrorScope('validation');
    this.computePipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.bindGroupLayout] }),
      compute: { module, entryPoint: 'main' },
    });
    const pipelineError = await device.popErrorScope();
    if (pipelineError) {
      throw new Error(`Error creating WebGPU compute pipeline for kernel: ${ pipelineError.message }`);
    }

    if (this.graphical) {
      await this._buildBlitPipeline(device);
    }

    this.paramsBuffer = device.createBuffer({
      size: byteLength,
      usage: USAGE_UNIFORM | USAGE_COPY_DST,
    });
    this.paramsMirror = new ArrayBuffer(byteLength);
    this.paramsU32 = new Uint32Array(this.paramsMirror);
    this.paramsI32 = new Int32Array(this.paramsMirror);
    this.paramsF32 = new Float32Array(this.paramsMirror);

    // array constants upload exactly once — mappedAtCreation avoids the
    // staging hop and there is no lifecycle to manage
    this.constantBuffers = [];
    for (let i = 0; i < bufferConstants.length; i++) {
      const record = bufferConstants[i];
      const value = this.constants[record.constantName];
      const dims = this.constantDimensions(value);
      const flatLength = dims[0] * dims[1] * dims[2];
      this._checkBufferSize(flatLength * 4, `constant "${ record.constantName }"`);
      const buffer = device.createBuffer({
        size: Math.max(flatLength * 4, 4),
        usage: USAGE_STORAGE,
        mappedAtCreation: true,
      });
      const mapped = new Float32Array(buffer.getMappedRange());
      utils.flattenTo(value instanceof Input ? value.value : value, mapped.subarray(0, flatLength));
      buffer.unmap();
      record.buffer = buffer;
      this.constantBuffers.push(buffer);
    }

    this._ensureOutputBuffer();
    this.bindGroupDirty = true;
    this.built = true;
  }

  /**
   * @desc Workgroup counts for the current thread dimensions, folding a 1D
   * dispatch across Y when X alone would exceed the device's per-dimension
   * limit. dispatchWidth is the thread count per dispatch row, which the 1D
   * shader uses to reconstruct the flat index; 0 for 2D/3D shapes.
   * @param {number[]} threadDim
   * @returns {{groups: number[], dispatchWidth: number}}
   */
  _computeDispatch(threadDim) {
    const [wx, wy, wz] = this.workgroupSize;
    const groups = [
      Math.ceil(threadDim[0] / wx),
      Math.ceil(threadDim[1] / wy),
      Math.ceil(threadDim[2] / wz),
    ];
    const maxGroups = this._device.limits.maxComputeWorkgroupsPerDimension;
    let dispatchWidth = 0;
    if (this.output.length === 1) {
      if (groups[0] > maxGroups) {
        groups[1] = Math.ceil(groups[0] / maxGroups);
        groups[0] = Math.ceil(groups[0] / groups[1]);
      }
      dispatchWidth = groups[0] * wx;
    }
    for (let i = 0; i < 3; i++) {
      if (groups[i] > maxGroups) {
        throw new Error(`output dimension ${ i } needs ${ groups[i] } workgroups, over this device's limit of ${ maxGroups }`);
      }
    }
    return { groups, dispatchWidth };
  }

  /**
   * The presentation half of graphical mode: the kernel is still a compute
   * pass writing RGBA floats to the storage buffer; this fixed pipeline draws
   * one fullscreen triangle whose fragment stage indexes that buffer and
   * writes the swapchain. Row 0 of the buffer (thread.y = 0) lands at the
   * BOTTOM of the canvas, exactly as on the GL backends.
   */
  async _buildBlitPipeline(device) {
    this.canvas.width = this.output[0];
    this.canvas.height = this.output[1];
    this._canvasContext = this.canvas.getContext('webgpu');
    if (!this._canvasContext) {
      throw new Error('could not get a webgpu context from the canvas');
    }
    const format = navigator.gpu.getPreferredCanvasFormat();
    this._canvasContext.configure({ device, format, alphaMode: 'premultiplied' });

    const blitSource =
      'struct BlitParams { width : u32, height : u32, pad0 : u32, pad1 : u32 }\n' +
      '@group(0) @binding(0) var<uniform> blit : BlitParams;\n' +
      '@group(0) @binding(1) var<storage, read> pixels : array<f32>;\n' +
      '@vertex fn vs(@builtin(vertex_index) vi : u32) -> @builtin(position) vec4<f32> {\n' +
      '  var pos = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));\n' +
      '  return vec4<f32>(pos[vi], 0.0, 1.0);\n' +
      '}\n' +
      '@fragment fn fs(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {\n' +
      '  let x = u32(pos.x);\n' +
      '  let y = u32(pos.y);\n' +
      '  let row = blit.height - 1u - y;\n' +
      '  let i = (row * blit.width + x) * 4u;\n' +
      '  let a = pixels[i + 3u];\n' +
      '  return vec4<f32>(pixels[i] * a, pixels[i + 1u] * a, pixels[i + 2u] * a, a);\n' +
      '}';
    const blitModule = device.createShaderModule({ code: blitSource });
    const info = await blitModule.getCompilationInfo();
    const errors = info.messages.filter(message => message.type === 'error');
    if (errors.length > 0) {
      throw new Error('Error compiling the graphical blit shader:\n' +
        errors.map(message => `  ${ message.lineNum }:${ message.linePos } ${ message.message }`).join('\n'));
    }
    this._blitBindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: 2, buffer: { type: 'uniform' } }, // FRAGMENT
        { binding: 1, visibility: 2, buffer: { type: 'read-only-storage' } },
      ],
    });
    this._blitPipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [this._blitBindGroupLayout] }),
      vertex: { module: blitModule, entryPoint: 'vs' },
      fragment: { module: blitModule, entryPoint: 'fs', targets: [{ format }] },
      primitive: { topology: 'triangle-list' },
    });
    this._blitParamsBuffer = device.createBuffer({
      size: 16,
      usage: USAGE_UNIFORM | USAGE_COPY_DST,
    });
  }

  _ensureOutputBuffer() {
    const [tx, ty, tz] = this.threadDim;
    const byteLength = tx * ty * tz * 4 * this.componentCount;
    // immutable pipeline kernels hand each result its own buffer -- reusing
    // it would let this call overwrite the previous call's handle, and
    // feeding a kernel its own prior output (the reason immutable exists)
    // would read and write the same buffer in one dispatch
    if (this.immutable && this.pipeline && this.outputBuffer) {
      if (--this.outputBuffer._refs === 0) {
        this.outputBuffer.destroy();
      }
      this.outputBuffer = null;
      this.bindGroupDirty = true;
    }
    if (this.outputBuffer && this.outputBuffer.size >= byteLength) return;
    if (this.outputBuffer) {
      if (--this.outputBuffer._refs === 0) {
        this.outputBuffer.destroy();
      }
    }
    this._checkBufferSize(byteLength, `output [${ this.output.join(', ') }]`);
    this.outputBuffer = this._device.createBuffer({
      size: byteLength,
      usage: USAGE_STORAGE | USAGE_COPY_SRC,
    });
    this.outputBuffer._refs = 1;
    this.bindGroupDirty = true;
  }

  /**
   * Oversized bindings must throw here: past the device limit, bind-group
   * validation fails asynchronously, the submit is dropped, and the zero-
   * initialized staging buffer would resolve a fully-shaped all-zeros
   * result — silent wrong data instead of an error.
   */
  _checkBufferSize(byteLength, what) {
    const limits = this._device.limits;
    const max = Math.min(limits.maxStorageBufferBindingSize, limits.maxBufferSize);
    if (byteLength > max) {
      throw new Error(
        `WebGPU backend: ${ what } needs ${ byteLength } bytes but this device allows ` +
        `${ max } per storage buffer (maxStorageBufferBindingSize/maxBufferSize); ` +
        `reduce the output or split the work across kernels`);
    }
  }

  /**
   * The mutation-sensitive step: array arguments are flattened into fresh
   * Float32Arrays synchronously inside run(), before any await, preserving
   * the GL path's snapshot semantics.
   */
  _snapshotArguments(args) {
    const snapshot = new Array(args.length);
    for (let i = 0; i < args.length; i++) {
      const value = args[i];
      const type = this.argumentTypes[i];
      // a pipeline handle is bindable wherever an array was declared: the
      // storage layout is identical, so no recompilation is involved
      if (value instanceof WebGPUBufferResult) {
        snapshot[i] = { kind: 'buffer', handle: value };
        continue;
      }
      switch (type) {
        case 'Array': {
          const dims = Array.from(utils.getDimensions(value));
          while (dims.length < 3) dims.push(1);
          const flat = new Float32Array(dims[0] * dims[1] * dims[2]);
          utils.flattenTo(value, flat);
          snapshot[i] = { kind: 'array', dims, flat };
          break;
        }
        case 'Input': {
          const dims = Array.from(value.size);
          while (dims.length < 3) dims.push(1);
          const flat = new Float32Array(dims[0] * dims[1] * dims[2]);
          utils.flattenTo(value.value, flat);
          snapshot[i] = { kind: 'array', dims, flat };
          break;
        }
        case 'WebGPUBuffer':
          snapshot[i] = { kind: 'buffer', handle: value };
          break;
        case 'Boolean':
          snapshot[i] = { kind: 'scalar', value: value ? 1 : 0 };
          break;
        default:
          snapshot[i] = { kind: 'scalar', value };
      }
    }
    return snapshot;
  }

  run() {
    if (!this.built && !this._buildPromise) {
      this.build.apply(this, arguments);
    }
    const snapshot = this._snapshotArguments(arguments);
    if (!this.built) {
      return this._buildPromise.then(() => this._runInternal(snapshot));
    }
    return this._runInternal(snapshot);
  }

  /**
   * Steady state is synchronous through queue.submit — writeBuffer copies its
   * data at call time and one queue executes submits in order, so overlapping
   * un-awaited calls cannot race; only the readback awaits, on a staging
   * buffer of its own.
   */
  _runInternal(snapshot) {
    if (this.context && this.context.isLost) {
      // without this check a lost device "succeeds": submits are no-ops and
      // pipeline handles resolve over dead buffers
      throw new Error(
        'WebGPU device was lost; call kernel.destroy() (or gpu.destroy()) and run again to rebuild on a fresh device');
    }
    const device = this._device;
    const queue = device.queue;
    const { arrayArgs, scalarArgs, bufferConstants } = this.paramsLayout;

    const threadDim = this.threadDim = Array.from(this.output);
    while (threadDim.length < 3) {
      threadDim.push(1);
    }
    this._ensureOutputBuffer();

    if (this.paramsLayout.randomSeedOffset !== null) {
      // unseeded kernels draw differently every run, like the GL backends;
      // randomSeed pins the whole stream bit-exactly
      const seed = this.randomSeed !== null ?
        (this.randomSeed >>> 0) :
        ((Math.random() * 0x100000000) >>> 0);
      this.paramsU32[this.paramsLayout.randomSeedOffset / 4] = seed;
    }
    this.paramsU32[0] = threadDim[0];
    this.paramsU32[1] = threadDim[1];
    this.paramsU32[2] = threadDim[2];
    this.paramsU32[3] = this._computeDispatch(threadDim).dispatchWidth;

    for (let i = 0; i < arrayArgs.length; i++) {
      const record = arrayArgs[i];
      const snap = snapshot[record.index];
      let dims;
      if (snap.kind === 'buffer') {
        const handle = snap.handle;
        if (handle._deleted) {
          throw new Error(`WebGPUBufferResult passed as argument "${ this.argumentNames[record.index] }" has been deleted`);
        }
        if (handle.context !== this.context) {
          throw new Error(`WebGPUBufferResult passed as argument "${ this.argumentNames[record.index] }" is from a different WebGPU device`);
        }
        if (handle.buffer === this.outputBuffer) {
          throw new Error(`WebGPUBufferResult passed as argument "${ this.argumentNames[record.index] }" is this kernel's own output buffer; use a second kernel or clone the result`);
        }
        if (handle.componentCount !== 1) {
          throw new Error(`WebGPU backend does not yet support Array(${ handle.componentCount }) pipeline results as kernel arguments`);
        }
        dims = Array.from(handle.output);
        while (dims.length < 3) dims.push(1);
        if (record.boundBuffer !== handle.buffer) {
          record.boundBuffer = handle.buffer;
          this.bindGroupDirty = true;
        }
      } else {
        dims = snap.dims;
        const byteLength = snap.flat.byteLength;
        if (!record.buffer || record.buffer.size < byteLength) {
          if (record.buffer) {
            if (!this.dynamicArguments) {
              throw new Error(`argument "${ this.argumentNames[record.index] }" grew from ${ record.buffer.size / 4 } to ${ snap.flat.length } values; use dynamicArguments: true for varying input sizes`);
            }
            record.buffer.destroy();
          }
          this._checkBufferSize(byteLength, `argument "${ this.argumentNames[record.index] }"`);
          record.buffer = device.createBuffer({
            size: byteLength,
            usage: USAGE_STORAGE | USAGE_COPY_DST,
          });
          this.bindGroupDirty = true;
        }
        queue.writeBuffer(record.buffer, 0, snap.flat);
        if (record.boundBuffer !== record.buffer) {
          record.boundBuffer = record.buffer;
          this.bindGroupDirty = true;
        }
      }
      const base = record.dimsOffset / 4;
      this.paramsU32[base] = dims[0];
      this.paramsU32[base + 1] = dims[1];
      this.paramsU32[base + 2] = dims[2];
      this.paramsU32[base + 3] = dims[0] * dims[1] * dims[2];
    }

    for (let i = 0; i < scalarArgs.length; i++) {
      const record = scalarArgs[i];
      const slot = record.offset / 4;
      switch (record.type) {
        case 'Integer':
          this.paramsI32[slot] = snapshot[record.index].value;
          break;
        case 'Boolean':
          this.paramsU32[slot] = snapshot[record.index].value;
          break;
        default:
          this.paramsF32[slot] = snapshot[record.index].value;
      }
    }

    queue.writeBuffer(this.paramsBuffer, 0, this.paramsMirror);

    if (this.bindGroupDirty) {
      const entries = [{ binding: 0, resource: { buffer: this.paramsBuffer } }];
      for (let i = 0; i < arrayArgs.length; i++) {
        entries.push({ binding: 1 + i, resource: { buffer: arrayArgs[i].boundBuffer } });
      }
      const outBinding = 1 + arrayArgs.length;
      entries.push({ binding: outBinding, resource: { buffer: this.outputBuffer } });
      for (let i = 0; i < bufferConstants.length; i++) {
        entries.push({ binding: outBinding + 1 + i, resource: { buffer: bufferConstants[i].buffer } });
      }
      this.bindGroup = device.createBindGroup({
        layout: this.bindGroupLayout,
        entries,
      });
      this.bindGroupDirty = false;
    }

    const { groups } = this._computeDispatch(threadDim);

    const byteLength = threadDim[0] * threadDim[1] * threadDim[2] * 4 * this.componentCount;
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.computePipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.dispatchWorkgroups(groups[0], groups[1], groups[2]);
    pass.end();

    if (this.graphical) {
      // presentation is fire-and-forget: no readback, so the promise resolves
      // at submit and an un-awaited call per animation frame works
      if (this.canvas.width !== this.output[0] || this.canvas.height !== this.output[1]) {
        this.canvas.width = this.output[0];
        this.canvas.height = this.output[1];
      }
      queue.writeBuffer(this._blitParamsBuffer, 0, new Uint32Array([this.output[0], this.output[1], 0, 0]));
      if (this._blitBoundOutputBuffer !== this.outputBuffer) {
        this._blitBindGroup = device.createBindGroup({
          layout: this._blitBindGroupLayout,
          entries: [
            { binding: 0, resource: { buffer: this._blitParamsBuffer } },
            { binding: 1, resource: { buffer: this.outputBuffer } },
          ],
        });
        this._blitBoundOutputBuffer = this.outputBuffer;
      }
      const renderPass = encoder.beginRenderPass({
        colorAttachments: [{
          view: this._canvasContext.getCurrentTexture().createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
        }],
      });
      renderPass.setPipeline(this._blitPipeline);
      renderPass.setBindGroup(0, this._blitBindGroup);
      renderPass.draw(3);
      renderPass.end();
      queue.submit([encoder.finish()]);
      return Promise.resolve();
    }

    if (this.pipeline) {
      queue.submit([encoder.finish()]);
      return Promise.resolve(new WebGPUBufferResult({
        buffer: this.outputBuffer,
        output: Array.from(this.output),
        componentCount: this.componentCount,
        context: this.context,
        kernel: this,
      }));
    }

    const staging = this._acquireStaging(byteLength);
    encoder.copyBufferToBuffer(this.outputBuffer, 0, staging.buffer, 0, byteLength);
    queue.submit([encoder.finish()]);

    const output = Array.from(this.output);
    return staging.buffer.mapAsync(MAP_MODE_READ, 0, byteLength).then(() => {
      // unmap detaches the range; the copy has to happen first
      const data = new Float32Array(staging.buffer.getMappedRange(0, byteLength).slice(0));
      staging.buffer.unmap();
      this._releaseStaging(staging);
      return this._shapeOutput(data, output, this.componentCount);
    }, (error) => {
      // a rejected map (device loss mid-read) must not strand the pooled
      // staging entry as busy forever
      this._releaseStaging(staging);
      throw error;
    });
  }

  /**
   * A staging buffer is unusable from mapAsync until unmap, so overlapping
   * un-awaited calls each need their own; sequential awaited calls reuse one
   * buffer forever. Capped so a burst cannot ratchet memory.
   */
  _acquireStaging(byteLength) {
    for (let i = 0; i < this.stagingPool.length; i++) {
      const entry = this.stagingPool[i];
      if (!entry.busy && entry.size >= byteLength) {
        entry.busy = true;
        return entry;
      }
    }
    const entry = {
      buffer: this._device.createBuffer({
        size: byteLength,
        usage: USAGE_MAP_READ | USAGE_COPY_DST,
      }),
      size: byteLength,
      busy: true,
      pooled: this.stagingPool.length < 3,
    };
    if (entry.pooled) {
      this.stagingPool.push(entry);
    }
    return entry;
  }

  _releaseStaging(entry) {
    if (entry.pooled) {
      entry.busy = false;
    } else {
      entry.buffer.destroy();
    }
  }

  /**
   * Readback is tightly packed, so scalar returns reuse the
   * memory-optimized erectors; Array(n) returns are stride n (not the GL
   * texel stride 4), shaped locally.
   */
  _shapeOutput(data, output, componentCount) {
    const [width, height, depth] = [output[0], output[1] || 1, output[2] || 1];
    if (componentCount === 1) {
      switch (output.length) {
        case 1:
          return utils.erectMemoryOptimizedFloat(data, width);
        case 2:
          return utils.erectMemoryOptimized2DFloat(data, width, height);
        default:
          return utils.erectMemoryOptimized3DFloat(data, width, height, depth);
      }
    }
    const n = componentCount;
    const erectRow = (offset) => {
      const row = new Array(width);
      for (let x = 0; x < width; x++) {
        row[x] = data.subarray(offset + x * n, offset + x * n + n);
      }
      return row;
    };
    switch (output.length) {
      case 1:
        return erectRow(0);
      case 2: {
        const rows = new Array(height);
        for (let y = 0; y < height; y++) {
          rows[y] = erectRow(y * width * n);
        }
        return rows;
      }
      default: {
        const layers = new Array(depth);
        for (let z = 0; z < depth; z++) {
          const rows = new Array(height);
          for (let y = 0; y < height; y++) {
            rows[y] = erectRow((z * height + y) * width * n);
          }
          layers[z] = rows;
        }
        return layers;
      }
    }
  }

  /**
   * Readback for a pipeline handle: copy → map → shape, same conventions as
   * a non-pipeline run of the producing kernel.
   * @param {WebGPUBufferResult} handle
   * @returns {Promise<Float32Array|Array>}
   */
  readBufferResult(handle) {
    const device = this._device || (handle.context && handle.context.device);
    if (!device) {
      return Promise.reject(new Error('no WebGPU device available to read this buffer'));
    }
    if (handle.context && handle.context.isLost) {
      return Promise.reject(new Error(
        'WebGPU device was lost; this buffer no longer holds data — rebuild the producing kernel and run again'));
    }
    const output = Array.from(handle.output);
    const dims = Array.from(output);
    while (dims.length < 3) dims.push(1);
    const byteLength = dims[0] * dims[1] * dims[2] * 4 * handle.componentCount;
    const staging = this._acquireStaging(byteLength);
    const encoder = device.createCommandEncoder();
    encoder.copyBufferToBuffer(handle.buffer, 0, staging.buffer, 0, byteLength);
    device.queue.submit([encoder.finish()]);
    return staging.buffer.mapAsync(MAP_MODE_READ, 0, byteLength).then(() => {
      const data = new Float32Array(staging.buffer.getMappedRange(0, byteLength).slice(0));
      staging.buffer.unmap();
      this._releaseStaging(staging);
      return this._shapeOutput(data, output, handle.componentCount);
    }, (error) => {
      this._releaseStaging(staging);
      throw error;
    });
  }

  /**
   * @desc Pixels of the last graphical run, as RGBA bytes. Row order matches
   * the GL backends: image order (top row first) by default, the raw
   * bottom-up buffer with flip = true. WebGPU readback is asynchronous, so
   * unlike the GL backends this returns a Promise.
   * @param {Boolean} [flip]
   * @returns {Promise<Uint8ClampedArray>}
   */
  getPixels(flip) {
    if (!this.graphical) {
      return Promise.reject(new Error('getPixels only works on a graphical kernel'));
    }
    if (!this.outputBuffer) {
      return Promise.reject(new Error('run the kernel before reading its pixels'));
    }
    const [width, height] = this.output;
    const byteLength = width * height * 4 * 4;
    const staging = this._acquireStaging(byteLength);
    const encoder = this._device.createCommandEncoder();
    encoder.copyBufferToBuffer(this.outputBuffer, 0, staging.buffer, 0, byteLength);
    this._device.queue.submit([encoder.finish()]);
    return staging.buffer.mapAsync(MAP_MODE_READ, 0, byteLength).then(() => {
      const floats = new Float32Array(staging.buffer.getMappedRange(0, byteLength).slice(0));
      staging.buffer.unmap();
      this._releaseStaging(staging);
      const pixels = new Uint8ClampedArray(width * height * 4);
      for (let y = 0; y < height; y++) {
        // buffer row 0 is the bottom of the canvas; default output is image
        // order, exactly like the GL getPixels
        const sourceRow = flip ? y : height - 1 - y;
        for (let x = 0; x < width; x++) {
          const from = (sourceRow * width + x) * 4;
          const to = (y * width + x) * 4;
          pixels[to] = floats[from] * 255;
          pixels[to + 1] = floats[from + 1] * 255;
          pixels[to + 2] = floats[from + 2] * 255;
          pixels[to + 3] = floats[from + 3] * 255;
        }
      }
      return pixels;
    }, (error) => {
      this._releaseStaging(staging);
      throw error;
    });
  }

  destroy(removeCanvasReferences) {
    if (this._blitParamsBuffer) {
      this._blitParamsBuffer.destroy();
      this._blitParamsBuffer = null;
    }
    if (this._canvasContext) {
      this._canvasContext.unconfigure();
      this._canvasContext = null;
    }
    this._blitPipeline = null;
    this._blitBindGroup = null;
    this._blitBoundOutputBuffer = null;
    // tolerate a kernel that was never built (or is mid-build)
    if (this.paramsBuffer) {
      this.paramsBuffer.destroy();
      this.paramsBuffer = null;
    }
    if (this.paramsLayout) {
      for (let i = 0; i < this.paramsLayout.arrayArgs.length; i++) {
        const record = this.paramsLayout.arrayArgs[i];
        if (record.buffer) {
          record.buffer.destroy();
          record.buffer = null;
        }
        record.boundBuffer = null;
      }
    }
    if (this.constantBuffers) {
      for (let i = 0; i < this.constantBuffers.length; i++) {
        this.constantBuffers[i].destroy();
      }
      this.constantBuffers = null;
    }
    for (let i = 0; i < this.stagingPool.length; i++) {
      // destroying a map-pending buffer is legal; the pending mapAsync rejects
      this.stagingPool[i].buffer.destroy();
    }
    this.stagingPool = [];
    if (this.outputBuffer) {
      // pipeline handles handed to the user share this buffer; it dies at zero
      if (--this.outputBuffer._refs === 0) {
        this.outputBuffer.destroy();
      }
      this.outputBuffer = null;
    }
    this.bindGroup = null;
    this.bindGroupLayout = null;
    this.computePipeline = null;
    this.built = false;
    this._buildPromise = null;
    if (this.gpu && this.gpu.kernels) {
      const index = this.gpu.kernels.indexOf(this);
      if (index !== -1) {
        this.gpu.kernels.splice(index, 1);
      }
    }
  }
}

module.exports = {
  WebGPUKernel
};