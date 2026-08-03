const { Kernel } = require('../kernel');
const { FunctionBuilder } = require('../function-builder');
const { WebAssemblyFunctionNode } = require('./function-node');
const { WasmModuleBuilder } = require('./wasm-builder');
const { WebAssemblyWorkerPool } = require('./worker-pool');
const { utils } = require('../../utils');
const { Input } = require('../../input');

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

const PAGE_BYTES = 65536;

let simdSupported = null;
let threadsSupported = null;
// worker-side instance caches key on this, so it must be unique across every
// kernel and size signature in the process, not per kernel
let nextEntryId = 1;

/**
 * @desc Kernel implementation over a generated WebAssembly module. run() is
 * fully synchronous: the module exports `run(start, end, seed)` which loops
 * cells [start, end) in wasm, calling the compiled kernel body per cell with
 * thread ids and data_index in mutable globals.
 *
 * Memory is one imported env.memory laid out `[ args | constants | output ]`
 * (regions 16-byte aligned); every offset and dimension bakes into the
 * bytecode as i32 consts, so a size change (dynamicArguments/dynamicOutput)
 * rebuilds the module — compiles are fast at these sizes and instances are
 * cached by size signature like signature-switched kernels.
 *
 * Math.random is PCG (RXS-M-XS on u32 state), the web-gpu kernel's exact
 * stream: per-cell state seeds from (seed + cellIndex * 0x9E3779B9) then one
 * LCG advance, so draws are independent of any future work split; unseeded
 * runs reseed from the host per run, `randomSeed` pins the stream bit-exact.
 */
class WebAssemblyKernel extends Kernel {
  static get isSupported() {
    if (typeof WebAssembly !== 'object' || WebAssembly === null) return false;
    return WebAssembly.validate(new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]));
  }

  static get isSIMDSupported() {
    if (simdSupported === null) {
      try {
        const builder = new WasmModuleBuilder();
        builder.addFunction('t', { params: [], results: [] }).v128ConstI32x4(0, 0, 0, 0).drop();
        simdSupported = WebAssembly.validate(builder.toBytes());
      } catch (e) {
        simdSupported = false;
      }
    }
    return simdSupported;
  }

  static get isThreadsSupported() {
    if (threadsSupported === null) {
      try {
        if (typeof SharedArrayBuffer === 'undefined') {
          threadsSupported = false;
        } else {
          const builder = new WasmModuleBuilder();
          builder.addMemoryImport(1, 1, true);
          const memory = new WebAssembly.Memory({ initial: 1, maximum: 1, shared: true });
          new WebAssembly.Instance(new WebAssembly.Module(builder.toBytes()), { env: { memory } });
          threadsSupported = true;
        }
      } catch (e) {
        threadsSupported = false;
      }
    }
    return threadsSupported;
  }

  static isContextMatch(context) {
    return false;
  }

  static getFeatures() {
    return features;
  }

  static get features() {
    return features;
  }

  static get mode() {
    return 'webasm';
  }

  static getSignature(kernel, argumentTypes) {
    return 'webasm' + (argumentTypes.length > 0 ? ':' + argumentTypes.join(',') : '');
  }

  static destroyContext(context) {}

  /**
   * SIMD quads must not cross an x-row (thread.y/z are uniform per quad):
   * rows a multiple of 4 wide vectorize in one span, otherwise each row gets
   * a vector span plus a scalar epilogue for its remainder cells. Shared with
   * the pipeline executor, which drives per-step instances directly.
   * @returns {String} the path taken, for _lastRunPath
   */
  static dispatchSpans(run, runSimd, cells, sizeX, seed) {
    if (!runSimd || cells === 0) {
      run(0, cells, seed);
      return 'scalar';
    }
    if ((sizeX & 3) === 0) {
      runSimd(0, cells, seed);
      return 'simd';
    }
    const quadSpan = sizeX & ~3;
    const rows = cells / sizeX;
    for (let row = 0; row < rows; row++) {
      const base = row * sizeX;
      if (quadSpan > 0) runSimd(base, base + quadSpan, seed);
      run(base + quadSpan, base + sizeX, seed);
    }
    return quadSpan > 0 ? 'simd+scalar-tail' : 'scalar';
  }

  static nativeFunctionArguments() {
    throw new Error('WebAssembly backend does not yet support native functions');
  }

  static nativeFunctionReturnType() {
    throw new Error('WebAssembly backend does not yet support native functions');
  }

  static combineKernels() {
    throw new Error('WebAssembly backend does not yet support combineKernels');
  }

  constructor(source, settings) {
    super(source, settings);
    // must exist before mergeSettings so `poolSize` can arrive as a setting;
    // null means the pool decides (hardwareConcurrency)
    this.poolSize = null;
    this.mergeSettings(source.settings || settings);
    if (this.precision === null) {
      this.precision = 'single';
    }
    // precision 'unsigned' is accepted and treated as single: wasm has no
    // packed storage, numbers are identical, and this backend sits in the
    // auto chain so it must not reject settings cpu accepts

    this.threadDim = null;
    this.componentCount = 1;
    // wasm memories are near-invisible to JS heap accounting and each one
    // also holds a large virtual guard reservation, so an unbounded
    // per-size-signature cache can pin hundreds of MB the GC feels no
    // pressure to collect (#870); size sweeps evict LRU past this bound
    this.moduleCacheLimit = 8;
    this.functionBuilder = null;
    this.tracedFunctions = null;
    this.usesRandom = false;
    this.usedMathImports = null;
    this._moduleCache = new Map();
    this._active = null;
    this._lastRunPath = null;
    this._pool = null;
    // threaded runs serialize on this chain: they share one wasm memory, so
    // a second call must not overwrite the args region mid-run. It tracks
    // settlement, never failure, so one rejected run cannot wedge the kernel
    this._threadedTail = Promise.resolve();
    // how many threaded runs are queued or in flight on that chain; zero
    // means the shared args region is quiescent and a call may write it
    // directly instead of staging copies. The epoch fences destroy(): a
    // settle from before the reset must not decrement the fresh counter
    this._threadedBusy = 0;
    this._threadedEpoch = 0;
  }

  initCanvas() {
    // graphical kernels degrade to cpu at build, but kernel.canvas must be a
    // real element from creation -- the house contract on every backend, and
    // the fallback renders into this same canvas so its identity never
    // changes. In Node this stays null and the cpu fallback's 'no canvas
    // available' throw is exact parity with mode: 'cpu'.
    if (this.graphical && typeof document !== 'undefined') {
      return document.createElement('canvas');
    }
    return null;
  }

  initContext() {
    return null;
  }

  initPlugins(settings) {
    return [];
  }

  setOutput(output) {
    const newOutput = this.toKernelOutput(output);
    if (this.built && !this.dynamicOutput) {
      throw new Error('Resizing a kernel with dynamicOutput: false is not possible');
    }
    this.output = newOutput;
    return this;
  }

  toString() {
    throw new Error('WebAssembly backend does not yet support toString');
  }

  build() {
    if (this.built) return;
    // a destroyed kernel that gets called again rebuilds -- including a fresh
    // worker pool. gpu.destroy() must be able to reach that pool, so a
    // revived kernel re-registers with the GPU that spliced it out.
    if (this.gpu && this.gpu.kernels && this.gpu.kernels.indexOf(this) === -1) {
      this.gpu.kernels.push(this);
    }
    if (this.graphical) {
      return this.requestFallback(arguments, 'graphical mode is not supported on the webasm backend');
    }
    if (this.subKernels && this.subKernels.length > 0) {
      return this.requestFallback(arguments, 'kernel maps are not supported on the webasm backend');
    }
    // pipeline is accepted the way the cpu backend accepts it: there is no
    // device memory to pipeline into, so the result is the plain typed array
    // the run already produces -- a fresh copy per call, valid as input to
    // any downstream kernel (#868)
    this.setupConstants();
    this.setupArguments(arguments);
    for (let i = 0; i < this.argumentTypes.length; i++) {
      switch (this.argumentTypes[i]) {
        case 'Array':
        case 'Input':
        case 'Number':
        case 'Float':
        case 'Integer':
        case 'Boolean':
          continue;
        default:
          // HTMLImage, textures, pipeline handles: degrade like the GL
          // backends do for unsupported kernel values
          return this.requestFallback(arguments,
            `argument "${ this.argumentNames[i] }" of type ${ this.argumentTypes[i] } is not supported on the webasm backend`);
      }
    }
    for (const name in this.constantTypes) {
      switch (this.constantTypes[name]) {
        case 'Array':
        case 'Input':
        case 'Number':
        case 'Float':
        case 'Integer':
        case 'Boolean':
          continue;
        default:
          return this.requestFallback(arguments,
            `constant "${ name }" of type ${ this.constantTypes[name] } is not supported on the webasm backend`);
      }
    }
    this.validateSettings(arguments);
    const threadDim = this.threadDim = Array.from(this.output);
    while (threadDim.length < 3) {
      threadDim.push(1);
    }
    if (!this.translateSource()) {
      return this.requestFallback(arguments,
        `return type ${ this.returnType } is not supported on the webasm backend`);
    }
    this.buildSignature(arguments);
    this._instantiate(this._entryKey(arguments), arguments);
    this.built = true;
  }

  validateSettings(args) {
    if (!this.output || this.output.length === 0) {
      if (args.length !== 1) {
        throw new Error('Auto output only supported for kernels with only one input');
      }
      const argType = utils.getVariableType(args[0], this.strictIntegers);
      if (argType === 'Array') {
        this.output = Array.from(utils.getDimensions(args[0]));
      } else {
        throw new Error('Auto output not supported for input type: ' + argType);
      }
    }
    this.checkOutput();
  }

  /**
   * The analysis pass: FunctionBuilder's trace runs each node's toString(),
   * which for this backend resolves types and collects math-import/random
   * usage without emitting a byte. Returns false for a return type this
   * backend cannot store, so build() can degrade to cpu.
   */
  translateSource() {
    const functionBuilder = this.functionBuilder = FunctionBuilder.fromKernel(this, WebAssemblyFunctionNode);
    this.tracedFunctions = functionBuilder.traceFunctionCalls('kernel', []);
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
        return false;
    }
    this.usesRandom = false;
    this.usedMathImports = new Set();
    for (const name of this.tracedFunctions) {
      const node = functionBuilder.functionMap[name];
      if (!node) continue;
      if (node.usesRandom) this.usesRandom = true;
      for (const importName of node.usedMathImports) {
        this.usedMathImports.add(importName);
      }
    }
    return true;
  }

  /**
   * `[ args | constants | output ]`, each record 16-byte aligned, flat f32
   * (scalars are one 4-byte slot, Integer/Boolean viewed as i32). Dims come
   * from the actual argument values, so the layout is per size signature.
   */
  computeLayout(args) {
    const align16 = value => Math.ceil(value / 16) * 16;
    let offset = 0;
    const arrays = {};
    const scalars = {};
    for (let i = 0; i < this.argumentTypes.length; i++) {
      const name = this.argumentNames[i];
      const type = this.argumentTypes[i];
      if (type === 'Array' || type === 'Input') {
        const dims = this.valueDimensions(args[i]);
        const flatLength = dims[0] * dims[1] * dims[2];
        arrays[name] = { index: i, offset, dims, flatLength };
        offset = align16(offset + flatLength * 4);
      } else {
        scalars[name] = { index: i, offset, type };
        offset = align16(offset + 4);
      }
    }
    const constantArrays = {};
    if (this.constants) {
      for (const name in this.constants) {
        if (!this.constants.hasOwnProperty(name)) continue;
        const type = this.constantTypes[name];
        if (type === 'Array' || type === 'Input') {
          const dims = this.valueDimensions(this.constants[name]);
          const flatLength = dims[0] * dims[1] * dims[2];
          constantArrays[name] = { offset, dims, flatLength };
          offset = align16(offset + flatLength * 4);
        }
      }
    }
    return {
      arrays,
      scalars,
      constantArrays,
      outputOffset: offset
    };
  }

  valueDimensions(value) {
    const dims = value instanceof Input ?
      Array.from(value.size) :
      Array.from(utils.getDimensions(value));
    while (dims.length < 3) {
      dims.push(1);
    }
    return dims;
  }

  _computeSizeSignature(args) {
    const parts = [this.output.join('x')];
    for (let i = 0; i < this.argumentTypes.length; i++) {
      const type = this.argumentTypes[i];
      if (type === 'Array' || type === 'Input') {
        parts.push(this.valueDimensions(args[i]).join('x'));
      }
    }
    return parts.join('|');
  }

  /**
   * Threaded only under the async contract, only when threads exist, and
   * only when the output is big enough (4096 cells) that splitting beats
   * the postMessage round trip.
   */
  _threadable() {
    if (this.asyncMode !== true || !WebAssemblyKernel.isThreadsSupported) return false;
    const [tx, ty, tz] = this.threadDim;
    return tx * ty * tz >= 4096;
  }

  /**
   * Sharedness is part of the cache key: a wasm memory import declares
   * shared or not at compile time, so the same size signature needs a
   * distinct module when the async contract routes it to the pool.
   */
  _entryKey(args) {
    return this._computeSizeSignature(args) + (this._threadable() ? '|shared' : '');
  }

  /**
   * The bytecode pass plus the run(start, end, seed) driver. The driver
   * derives thread ids from the flat cell index with baked output dims
   * (x fastest: x + sizeX * (y + sizeY * z), the storage order every
   * backend shares) and seeds the PCG state per cell.
   */
  _assembleModule(layout, cells, shared) {
    const builder = new WasmModuleBuilder();
    // the pipeline executor passes layout.totalBytes: its modules run over
    // one shared memory whose extent exceeds this kernel's own regions, and
    // every module of a fused plan must declare identical memory limits
    const totalBytes = layout.totalBytes || (layout.outputOffset + cells * this.componentCount * 4);
    const initial = Math.ceil(totalBytes / PAGE_BYTES) + 16;
    const maximum = Math.max(initial, 4096);
    builder.addMemoryImport(initial, maximum, shared);

    const mathImports = Array.from(this.usedMathImports).sort();
    for (const name of mathImports) {
      const params = name === 'pow' || name === 'atan2' ? ['f32', 'f32'] : ['f32'];
      builder.addFuncImport('math_' + name, params, ['f32']);
    }

    const globals = {
      threadX: builder.addGlobal('i32', true, 0),
      threadY: builder.addGlobal('i32', true, 0),
      threadZ: builder.addGlobal('i32', true, 0),
      dataIndex: builder.addGlobal('i32', true, 0),
    };
    if (this.usesRandom) {
      globals.pcgState = builder.addGlobal('i32', true, 0);
      this._emitPcgRandom(builder, globals.pcgState);
    }

    const assembler = { module: builder, layout, globals };
    for (let i = this.tracedFunctions.length - 1; i >= 0; i--) {
      const name = this.tracedFunctions[i];
      if (name === 'kernel') continue;
      const node = this.functionBuilder.functionMap[name];
      if (!node) continue; // math names in the trace have no node
      // setOutput replaces the kernel's output array; the baked
      // this.output.x/y/z consts must follow it on every re-emission
      node.output = this.output;
      node.emitFunction(assembler);
    }
    this.functionBuilder.functionMap['kernel'].output = this.output;
    this.functionBuilder.functionMap['kernel'].emitFunction(assembler);

    const [sizeX, sizeY] = this.threadDim;
    const run = builder.addFunction('run', {
      params: ['i32', 'i32', 'i32'],
      locals: ['i32']
    });
    const cell = 3;
    run.localGet(0).localSet(cell);
    if (this.output.length === 1) {
      run.i32Const(0).globalSet(globals.threadY);
      run.i32Const(0).globalSet(globals.threadZ);
    } else if (this.output.length === 2) {
      run.i32Const(0).globalSet(globals.threadZ);
    }
    run.block();
    run.localGet(cell).localGet(1).i32GeS().brIf(0);
    run.loop();
    run.localGet(cell).globalSet(globals.dataIndex);
    if (this.output.length === 1) {
      run.localGet(cell).globalSet(globals.threadX);
    } else if (this.output.length === 2) {
      run.localGet(cell).i32Const(sizeX).i32RemU().globalSet(globals.threadX);
      run.localGet(cell).i32Const(sizeX).i32DivU().globalSet(globals.threadY);
    } else {
      run.localGet(cell).i32Const(sizeX).i32RemU().globalSet(globals.threadX);
      run.localGet(cell).i32Const(sizeX).i32DivU().i32Const(sizeY).i32RemU().globalSet(globals.threadY);
      run.localGet(cell).i32Const(sizeX * sizeY).i32DivU().globalSet(globals.threadZ);
    }
    if (this.usesRandom) {
      run.localGet(2).localGet(cell).i32Const(0x9E3779B9 | 0).i32Mul().i32Add()
        .i32Const(747796405).i32Mul().i32Const(2891336453 | 0).i32Add()
        .globalSet(globals.pcgState);
    }
    run.call('kernel');
    run.localGet(cell).i32Const(1).i32Add().localSet(cell);
    run.localGet(cell).localGet(1).i32LtS().brIf(0);
    run.end();
    run.end();
    builder.exportFunction('run');

    if (WebAssemblyKernel.isSIMDSupported) {
      if (this.usesRandom) {
        globals.pcgStateV = builder.addGlobal('v128', true, 0);
        this._emitPcgRandomVector(builder, globals.pcgStateV);
      }
      // coarse info for lane-scalarized helper calls: whether ANY traced
      // helper reads thread state or draws random, so the call site knows
      // to swap thread.x / PCG state per lane
      let helperInfo = null;
      for (const name of this.tracedFunctions) {
        if (name === 'kernel') continue;
        const node = this.functionBuilder.functionMap[name];
        if (!node) continue;
        if (!helperInfo) helperInfo = { readsThread: false, usesRandom: false };
        if (node.readsThread) helperInfo.readsThread = true;
        if (node.usesRandom) helperInfo.usesRandom = true;
      }
      assembler.helperInfo = helperInfo;
      this.functionBuilder.functionMap['kernel'].emitVectorFunction(assembler);
      this._emitRunSimd(builder, globals);
      builder.exportFunction('run_simd');
    }

    return {
      bytes: builder.toBytes(),
      initial,
      maximum
    };
  }

  /**
   * run_simd(start, end, seed): 4 consecutive x cells per step. The caller
   * guarantees (end - start) % 4 == 0 AND that no quad crosses an x-row, so
   * thread.y/z are uniform per quad and thread.x is base + [0,1,2,3].
   */
  _emitRunSimd(builder, globals) {
    const [sizeX, sizeY] = this.threadDim;
    const run = builder.addFunction('run_simd', {
      params: ['i32', 'i32', 'i32'],
      locals: ['i32']
    });
    const cell = 3;
    run.localGet(0).localSet(cell);
    if (this.output.length === 1) {
      run.i32Const(0).globalSet(globals.threadY);
      run.i32Const(0).globalSet(globals.threadZ);
    } else if (this.output.length === 2) {
      run.i32Const(0).globalSet(globals.threadZ);
    }
    run.block();
    run.localGet(cell).localGet(1).i32GeS().brIf(0);
    run.loop();
    run.localGet(cell).globalSet(globals.dataIndex);
    if (this.output.length === 1) {
      run.localGet(cell).globalSet(globals.threadX);
    } else if (this.output.length === 2) {
      run.localGet(cell).i32Const(sizeX).i32RemU().globalSet(globals.threadX);
      run.localGet(cell).i32Const(sizeX).i32DivU().globalSet(globals.threadY);
    } else {
      run.localGet(cell).i32Const(sizeX).i32RemU().globalSet(globals.threadX);
      run.localGet(cell).i32Const(sizeX).i32DivU().i32Const(sizeY).i32RemU().globalSet(globals.threadY);
      run.localGet(cell).i32Const(sizeX * sizeY).i32DivU().globalSet(globals.threadZ);
    }
    if (this.usesRandom) {
      // the scalar per-cell seeding lane-wise, so draws are independent of
      // stride and split: (seed + cell*GOLDEN)*LCG_MUL + LCG_ADD
      run.localGet(cell).i32x4Splat().v128ConstI32x4(0, 1, 2, 3).i32x4Add();
      run.v128ConstI32x4(0x9E3779B9 | 0, 0x9E3779B9 | 0, 0x9E3779B9 | 0, 0x9E3779B9 | 0).i32x4Mul();
      run.localGet(2).i32x4Splat().i32x4Add();
      run.v128ConstI32x4(747796405, 747796405, 747796405, 747796405).i32x4Mul();
      run.v128ConstI32x4(2891336453 | 0, 2891336453 | 0, 2891336453 | 0, 2891336453 | 0).i32x4Add();
      run.globalSet(globals.pcgStateV);
    }
    run.call('kernel_simd');
    run.localGet(cell).i32Const(4).i32Add().localSet(cell);
    run.localGet(cell).localGet(1).i32LtS().brIf(0);
    run.end();
    run.end();
  }

  /**
   * The scalar pcg_random lane-wise on an i32x4 state. Uniform-count shifts
   * vectorize; the RXS shift count is per-lane, so that one step runs
   * through the scalar opcodes per lane. The mask parameter predicates the
   * state advance: a draw evaluated for an inactive lane (the untaken side
   * of a divergent branch) must not advance that lane's stream, or every
   * later draw in reconverged code desynchronizes from the scalar run.
   */
  _emitPcgRandomVector(builder, stateGlobal) {
    const em = builder.addFunction('pcg_random_v', { params: ['v128'], results: ['v128'] });
    const s = em.addLocal('v128');
    const w = em.addLocal('i32');
    em.globalGet(stateGlobal)
      .v128ConstI32x4(747796405, 747796405, 747796405, 747796405).i32x4Mul()
      .v128ConstI32x4(2891336453 | 0, 2891336453 | 0, 2891336453 | 0, 2891336453 | 0).i32x4Add()
      .globalGet(stateGlobal).localGet(0).v128Bitselect()
      .globalSet(stateGlobal);
    em.globalGet(stateGlobal).localSet(s);
    em.localGet(s).i32x4ExtractLane(0).localSet(w);
    em.localGet(w).localGet(w).i32Const(28).i32ShrU().i32Const(4).i32Add().i32ShrU().i32x4Splat();
    for (let lane = 1; lane < 4; lane++) {
      em.localGet(s).i32x4ExtractLane(lane).localSet(w);
      em.localGet(w).localGet(w).i32Const(28).i32ShrU().i32Const(4).i32Add().i32ShrU().i32x4ReplaceLane(lane);
    }
    em.localGet(s).v128Xor();
    em.v128ConstI32x4(277803737, 277803737, 277803737, 277803737).i32x4Mul();
    const wv = em.addLocal('v128');
    em.localTee(wv);
    em.i32Const(22).i32x4ShrU().localGet(wv).v128Xor();
    em.i32Const(8).i32x4ShrU();
    em.f32x4ConvertI32x4U();
    em.v128ConstF32x4(16777216, 16777216, 16777216, 16777216).f32x4Div();
  }

  /**
   * PCG (permuted congruential, RXS-M-XS output) — the web-gpu kernel's
   * pcg_random verbatim in i32 ops: bit-exact across platforms, top 24 bits
   * scale into [0, 1) at full f32 mantissa resolution.
   */
  _emitPcgRandom(builder, stateGlobal) {
    const em = builder.addFunction('pcg_random', { params: [], results: ['f32'] });
    const word = em.addLocal('i32');
    em.globalGet(stateGlobal).i32Const(747796405).i32Mul().i32Const(2891336453 | 0).i32Add().globalSet(stateGlobal);
    em.globalGet(stateGlobal)
      .globalGet(stateGlobal).i32Const(28).i32ShrU().i32Const(4).i32Add().i32ShrU()
      .globalGet(stateGlobal).i32Xor()
      .i32Const(277803737).i32Mul()
      .localTee(word);
    em.i32Const(22).i32ShrU().localGet(word).i32Xor()
      .i32Const(8).i32ShrU()
      .f32ConvertI32U().f32Const(16777216).f32Div();
  }

  /**
   * Frees everything an entry pins. The Memory itself has no explicit
   * free, but dropping every reference (including the workers' — their
   * instantiations hold the shared buffer) is the most a library can do
   * to let it die young (#870). A shared entry defers until the threaded
   * tail settles so an in-flight dispatch keeps what it captured.
   */
  _releaseEntry(entry) {
    const scrub = () => {
      entry.instance = null;
      entry.module = null;
      entry.memory = null;
      entry.run = null;
      entry.runSimd = null;
      entry.f32 = null;
      entry.i32 = null;
      entry.bytes = null;
    };
    if (entry.shared && this._pool) {
      const pool = this._pool;
      this._threadedTail.then(() => {
        pool.release(entry.id);
        scrub();
      }, scrub);
    } else {
      scrub();
    }
  }

  _instantiate(entryKey, args) {
    let entry = this._moduleCache.get(entryKey);
    if (entry) {
      // Map order is the LRU order: refresh on hit
      this._moduleCache.delete(entryKey);
      this._moduleCache.set(entryKey, entry);
    }
    if (!entry) {
      const shared = this._threadable();
      const layout = this.computeLayout(args);
      const [tx, ty, tz] = this.threadDim;
      const cells = tx * ty * tz;
      const { bytes, initial, maximum } = this._assembleModule(layout, cells, shared);
      if (!WebAssembly.validate(bytes)) {
        throw new Error('WebAssembly backend: generated module failed validation (internal error)');
      }
      const memory = shared ?
        new WebAssembly.Memory({ initial, maximum, shared: true }) :
        new WebAssembly.Memory({ initial, maximum });
      const imports = { env: { memory } };
      for (const name of this.usedMathImports) {
        imports.env['math_' + name] = Math[name];
      }
      const module = new WebAssembly.Module(bytes);
      const instance = new WebAssembly.Instance(module, imports);
      entry = {
        // what the worker pool needs to re-instantiate elsewhere: the
        // compiled Module and shared Memory (both structured-cloneable),
        // the import names, and the row width for the SIMD span logic
        id: nextEntryId++,
        sizeSignature: entryKey,
        shared,
        layout,
        cells,
        bytes,
        module,
        memory,
        mathImports: Array.from(this.usedMathImports).sort(),
        sizeX: tx,
        instance,
        run: instance.exports.run,
        runSimd: instance.exports.run_simd || null,
        f32: new Float32Array(memory.buffer),
        i32: new Int32Array(memory.buffer),
      };
      for (const name in layout.constantArrays) {
        const record = layout.constantArrays[name];
        const value = this.constants[name];
        utils.flattenTo(
          value instanceof Input ? value.value : value,
          entry.f32.subarray(record.offset / 4, record.offset / 4 + record.flatLength)
        );
      }
      this._moduleCache.set(entryKey, entry);
      while (this._moduleCache.size > Math.max(this.moduleCacheLimit, 1)) {
        const oldestKey = this._moduleCache.keys().next().value;
        const oldest = this._moduleCache.get(oldestKey);
        this._moduleCache.delete(oldestKey);
        this._releaseEntry(oldest);
      }
    }
    this._active = entry;
  }

  /**
   * @desc Self-typed values (GL textures, pipeline handles) pass the base
   * check on the assumption that a kernel-value lookup will re-map them; this
   * backend has no kernel values, so a texture handed to a kernel built for
   * plain arrays would reach utils.flattenTo and crash. Flag it as a type
   * mismatch instead: the switched kernel builds for the texture type and
   * degrades to cpu through the usual fallback. Guarded on the DECLARED type
   * being one this backend supports, so the switched kernel (declared for
   * the texture type) does not flag the same value again and loop.
   */
  checkArgumentTypes(args) {
    super.checkArgumentTypes(args);
    if (!this.argumentTypes) return;
    const length = Math.min(args.length, this.argumentTypes.length);
    for (let i = 0; i < length; i++) {
      const value = args[i];
      if (!value || !value.type) continue;
      switch (this.argumentTypes[i]) {
        case 'Array':
        case 'Input':
        case 'Number':
        case 'Float':
        case 'Integer':
        case 'Boolean':
          this.switchKernels({
            type: 'argumentTypeMismatch',
            index: i,
            needed: utils.getVariableType(value, this.strictIntegers),
          });
          break;
      }
    }
  }

  run() {
    if (!this.built) {
      this.build.apply(this, arguments);
      if (this.fallbackRequested) return null;
    }
    const threadDim = this.threadDim = Array.from(this.output);
    while (threadDim.length < 3) {
      threadDim.push(1);
    }
    const entryKey = this._entryKey(arguments);
    if (!this._active || this._active.sizeSignature !== entryKey) {
      const previous = this._active ? this._active.layout.arrays : {};
      for (const name in previous) {
        const record = previous[name];
        const dims = this.valueDimensions(arguments[record.index]);
        if (!this.dynamicArguments && (dims[0] !== record.dims[0] || dims[1] !== record.dims[1] || dims[2] !== record.dims[2])) {
          throw new Error(
            `argument "${ name }" changed size from [${ record.dims.join(', ') }] to [${ dims.join(', ') }]; ` +
            `use dynamicArguments: true for varying input sizes`);
        }
      }
      this._instantiate(entryKey, arguments);
    }
    if (this._active.shared && this._threadable()) {
      return this._runThreaded(arguments);
    }
    const { layout, cells, f32, i32, run, runSimd } = this._active;

    for (const name in layout.arrays) {
      const record = layout.arrays[name];
      const value = arguments[record.index];
      utils.flattenTo(
        value instanceof Input ? value.value : value,
        f32.subarray(record.offset / 4, record.offset / 4 + record.flatLength)
      );
    }
    for (const name in layout.scalars) {
      const record = layout.scalars[name];
      const value = arguments[record.index];
      if (record.type === 'Integer') {
        i32[record.offset / 4] = value | 0;
      } else if (record.type === 'Boolean') {
        i32[record.offset / 4] = value ? 1 : 0;
      } else {
        f32[record.offset / 4] = value;
      }
    }

    let seed = 0;
    if (this.usesRandom) {
      seed = this.randomSeed !== null ?
        (this.randomSeed >>> 0) :
        ((Math.random() * 0x100000000) >>> 0);
    }
    seed = seed | 0;
    this._lastRunPath = WebAssemblyKernel.dispatchSpans(run, runSimd, cells, threadDim[0], seed);

    const base = layout.outputOffset / 4;
    const data = f32.slice(base, base + cells * this.componentCount);
    return this._shapeOutput(data, Array.from(this.output), this.componentCount);
  }

  /**
   * The pool path, only ever reached under the async contract. Two timing
   * constraints shape it: arguments must be sampled at CALL time (the sync
   * contract's semantics), but the shared args region may still be feeding
   * an in-flight run — so arguments flatten into staging copies now and are
   * copied into wasm memory only when this run's turn on the memory comes
   * up (`_threadedTail`). The seed is also drawn now so an unseeded kernel
   * reseeds per call, not per settlement order.
   *
   * The split follows the contract: min(pool, ceil(cells/4096)) contiguous
   * ranges, each start aligned down to a multiple of 4 so every worker can
   * enter run_simd; the last worker absorbs the tail.
   */
  _runThreaded(args) {
    const entry = this._active;
    const { layout, cells } = entry;
    // arguments must be sampled at call time either way; when no run is
    // queued or in flight the shared args region is quiescent, so they can
    // flatten straight into wasm memory and skip the staging copy entirely
    const direct = this._threadedBusy === 0;
    let staged = null;
    let scalarValues = null;
    if (direct) {
      for (const name in layout.arrays) {
        const record = layout.arrays[name];
        const value = args[record.index];
        utils.flattenTo(
          value instanceof Input ? value.value : value,
          entry.f32.subarray(record.offset / 4, record.offset / 4 + record.flatLength)
        );
      }
      for (const name in layout.scalars) {
        const record = layout.scalars[name];
        const value = args[record.index];
        if (record.type === 'Integer') {
          entry.i32[record.offset / 4] = value | 0;
        } else if (record.type === 'Boolean') {
          entry.i32[record.offset / 4] = value ? 1 : 0;
        } else {
          entry.f32[record.offset / 4] = value;
        }
      }
    } else {
      staged = [];
      for (const name in layout.arrays) {
        const record = layout.arrays[name];
        const value = args[record.index];
        const flat = new Float32Array(record.flatLength);
        utils.flattenTo(value instanceof Input ? value.value : value, flat);
        staged.push({ record, flat });
      }
      scalarValues = [];
      for (const name in layout.scalars) {
        const record = layout.scalars[name];
        scalarValues.push({ record, value: args[record.index] });
      }
    }
    let seed = 0;
    if (this.usesRandom) {
      seed = this.randomSeed !== null ?
        (this.randomSeed >>> 0) :
        ((Math.random() * 0x100000000) >>> 0);
    }
    seed = seed | 0;
    if (!this._pool) {
      this._pool = new WebAssemblyWorkerPool(this.poolSize || undefined);
    }
    const pool = this._pool;
    const componentCount = this.componentCount;
    const output = Array.from(this.output);
    this._threadedBusy++;
    const result = this._threadedTail.then(() => {
      // destroy() scrubs entries; a run queued behind the tail must reject
      // cleanly rather than dereference the scrubbed views
      if (!entry.f32) {
        throw new Error('WebAssembly kernel was destroyed');
      }
      if (staged) {
        for (let i = 0; i < staged.length; i++) {
          entry.f32.set(staged[i].flat, staged[i].record.offset / 4);
        }
        for (let i = 0; i < scalarValues.length; i++) {
          const { record, value } = scalarValues[i];
          if (record.type === 'Integer') {
            entry.i32[record.offset / 4] = value | 0;
          } else if (record.type === 'Boolean') {
            entry.i32[record.offset / 4] = value ? 1 : 0;
          } else {
            entry.f32[record.offset / 4] = value;
          }
        }
      }
      const workerCount = Math.min(pool.size, Math.ceil(cells / 4096));
      let chunk = Math.ceil(cells / workerCount) & ~3;
      if (chunk < 4) chunk = 4;
      const tasks = [];
      for (let i = 0; i < workerCount; i++) {
        const start = i * chunk;
        if (start >= cells) break;
        tasks.push({
          start,
          end: i === workerCount - 1 ? cells : Math.min(start + chunk, cells),
          seed,
        });
      }
      this._lastRunPath = 'threaded';
      return pool.dispatch(entry, tasks).then(() => {
        if (!entry.f32) {
          throw new Error('WebAssembly kernel was destroyed');
        }
        const base = layout.outputOffset / 4;
        // slice copies out of the SharedArrayBuffer, so the caller's result
        // is ordinary non-shared data
        const data = entry.f32.slice(base, base + cells * componentCount);
        return this._shapeOutput(data, output, componentCount);
      });
    });
    const epoch = this._threadedEpoch;
    const settle = () => {
      if (this._threadedEpoch === epoch) this._threadedBusy--;
    };
    this._threadedTail = result.then(settle, settle);
    return result;
  }

  /**
   * The output region is tightly packed, so scalar returns reuse the
   * memory-optimized erectors; Array(n) returns are stride n, shaped
   * locally — the web-gpu kernel's exact conventions.
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

  destroy(removeCanvasReferences) {
    if (this._pool) {
      this._pool.destroy();
      this._pool = null;
    }
    this._threadedTail = Promise.resolve();
    this._threadedBusy = 0;
    this._threadedEpoch++;
    // scrub entries rather than only dropping the map: anything still
    // holding the kernel (the run shortcut closure, user code) would
    // otherwise keep every cached wasm memory alive with it (#870). The
    // pool is already destroyed, so no dispatch holds an entry.
    for (const entry of this._moduleCache.values()) {
      entry.shared = false;
      this._releaseEntry(entry);
    }
    this._moduleCache = new Map();
    this._active = null;
    this.built = false;
    if (this.gpu && this.gpu.kernels) {
      const index = this.gpu.kernels.indexOf(this);
      if (index !== -1) {
        this.gpu.kernels.splice(index, 1);
      }
    }
  }
}

module.exports = {
  WebAssemblyKernel
};