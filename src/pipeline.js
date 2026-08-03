const { Input } = require('./input');
const { utils } = require('./utils');

/**
 * Pipeline compilation (docs/design/pipeline-compilation.md): the
 * orchestration function runs ONCE, at build time, against opaque handles;
 * every kernel call made while the trace is open is recorded into a static
 * plan, and later pipeline calls execute the plan without re-entering user
 * code. JS loops in the orchestration therefore unroll at trace time, and
 * closure-captured plain values freeze into the plan the same way constants
 * do.
 */

const MSG_HANDLE_READ = 'pipeline intermediate results cannot be read during orchestration';
const MSG_HANDLE_PRIMITIVE = 'pipeline intermediate results cannot be used in arithmetic or conditions during orchestration';
const MSG_MATH_RANDOM = 'Math.random() is not allowed during pipeline orchestration; orchestration must be deterministic';
const MSG_FOREIGN_KERNEL = 'pipelines can only call kernels created by the same GPU instance';
const MSG_GRAPHICAL = 'graphical kernels are not supported inside pipelines';
const MSG_KERNEL_MAP = 'kernel maps are not supported inside pipelines';
const MSG_RETURN_SHAPE = 'a pipeline must return a handle, or an Array or plain object of handles';
const MSG_FIXED_OUTPUT = 'kernels called inside a pipeline must have a fixed output size';
const MSG_DESTROYED = 'pipeline has been destroyed';
const MSG_ASYNC_ORCHESTRATION = 'the orchestration function must be synchronous; async functions and generators cannot be traced';
const MSG_STALE_HANDLE = 'this handle belongs to a different trace; handles do not survive re-trace or cross pipelines';

/**
 * The class exists for instanceof and for its name in errors; all state
 * lives in the trace's WeakMap so the frozen instance has no own properties
 * for the Proxy get trap to conflict with.
 */
class PipelineHandle {}

/**
 * Consulted by kernelRunShortcut on every call; non-null only while an
 * orchestration function is being traced, which is always synchronous, so a
 * module-level slot cannot see two traces at once.
 */
let activeTrace = null;

function getActiveTrace() {
  return activeTrace;
}

/**
 * Trace-time state: records kernel calls as plan steps and mints the opaque
 * handles that stand in for values the orchestration never gets to see.
 */
class PipelineTrace {
  constructor(gpu) {
    this.gpu = gpu;
    this.steps = [];
    /**
     * distinct kernel run-shortcuts, in first-use order; steps refer to them
     * by index so the ping-pong loop shape compiles to ONE kernel entry
     */
    this.kernels = [];
    this.kernelIndexes = new Map();
    this.handleMeta = new WeakMap();
    // texture snapshots cloned during this trace; released with the plan
    this.held = [];
  }

  /**
   * @param {Object} meta - {source: 'pipelineArg', index} | {source: 'step', step}
   * @returns {Proxy<PipelineHandle>}
   */
  createHandle(meta) {
    const trace = this;
    // the target is frozen and own-property-free, so the get trap may throw
    // for every key without violating a Proxy invariant
    const target = Object.freeze(new PipelineHandle());
    const handle = new Proxy(target, {
      get(_, property) {
        if (property === Symbol.toPrimitive || property === 'valueOf' || property === 'toString') {
          return () => {
            throw new Error(MSG_HANDLE_PRIMITIVE);
          };
        }
        throw new Error(MSG_HANDLE_READ);
      },
      set() {
        throw new Error(MSG_HANDLE_READ);
      },
      // object spread and key enumeration consult these traps and never the
      // get trap; without them `{ ...handle }` silently reads as empty
      ownKeys() {
        throw new Error(MSG_HANDLE_READ);
      },
      has() {
        throw new Error(MSG_HANDLE_READ);
      },
      getOwnPropertyDescriptor() {
        throw new Error(MSG_HANDLE_READ);
      },
    });
    trace.handleMeta.set(handle, meta);
    return handle;
  }

  /**
   * Entry point from kernelRunShortcut while a trace is open: validate the
   * kernel, bind the arguments, and answer with a fresh step-output handle
   * instead of running anything.
   * @param {IKernelRunShortcut} shortcut
   * @param {IArguments} args
   * @returns {Proxy<PipelineHandle>}
   */
  recordKernelCall(shortcut, args) {
    const kernel = shortcut.kernel;
    if (kernel.gpu !== this.gpu) {
      throw new Error(MSG_FOREIGN_KERNEL);
    }
    if (kernel.graphical) {
      throw new Error(MSG_GRAPHICAL);
    }
    if (kernel.subKernels && kernel.subKernels.length > 0) {
      throw new Error(MSG_KERNEL_MAP);
    }
    if (!kernel.output) {
      throw new Error(MSG_FIXED_OUTPUT);
    }
    let kernelIndex = this.kernelIndexes.get(shortcut);
    if (kernelIndex === undefined) {
      kernelIndex = this.kernels.length;
      this.kernels.push(shortcut);
      this.kernelIndexes.set(shortcut, kernelIndex);
    }
    const argBindings = new Array(args.length);
    for (let i = 0; i < args.length; i++) {
      argBindings[i] = this.bindValue(args[i]);
    }
    const stepIndex = this.steps.length;
    this.steps.push({
      kernel: kernelIndex,
      argBindings,
      output: Array.from(kernel.output),
      outputBuffer: -1,
    });
    return this.createHandle({ source: 'step', step: stepIndex });
  }

  /**
   * @returns {Object} argBinding per the plan IR; non-handles snapshot here,
   * which is the moment closure-captured mutables freeze
   */
  bindValue(value) {
    const meta = this.handleMeta.get(value);
    if (meta) return meta;
    // instanceof resolves through the untrapped getPrototypeOf, so a handle
    // from a previous trace (or another pipeline) is detected without
    // tripping its own traps
    if (value instanceof PipelineHandle) {
      throw new Error(MSG_STALE_HANDLE);
    }
    return { source: 'literal', value: snapshotValue(value, this.held) };
  }
}

/**
 * Call-time sampling: mutable JS values copy before the call promise can
 * yield, so `const p = pipeline(buf); buf[0] = 9;` computes on the value buf
 * held at the call. Handles never reach this function -- bindValue checks
 * the WeakMap first -- so property access here cannot trip a handle trap.
 */
function snapshotValue(value, held) {
  if (!value || typeof value !== 'object') return value;
  // before the texture duck-type check: Input also has a toArray()
  if (value instanceof Input) return new Input(snapshotValue(value.value, held), value.size);
  if (typeof value.delete === 'function' || typeof value.toArray === 'function') {
    // a mutable (immutable: false) texture is re-rendered IN PLACE by its
    // kernel's next call, so passing it through uncopied would sample the
    // contents at execution, not at the call; clone now and release the
    // clone once the holder is done with it
    if (typeof value.clone === 'function' && held) {
      const cloned = value.clone();
      held.push(cloned);
      return cloned;
    }
    return value;
  }
  if (ArrayBuffer.isView(value)) return value.slice(0);
  if (Array.isArray(value)) return value.map(v => snapshotValue(v, held));
  return value;
}

function releaseSnapshots(held) {
  for (let i = 0; i < held.length; i++) {
    try {
      held[i].delete();
    } catch (e) {}
  }
  held.length = 0;
}

/**
 * Static liveness over the unrolled DAG, then greedy slot reuse: a step may
 * write a buffer only when the previous occupant's last reader ran strictly
 * earlier -- a reader AT the writing step still needs the old contents while
 * the new ones are produced, which is exactly what forces `u = sweep(u, q)`
 * in a loop onto two alternating buffers. Slots are only shared between
 * steps of identical output shape so the fused executor can lay them out as
 * fixed regions.
 * @param {Array} steps - mutated: outputBuffer assigned per step
 * @param {Array} resultBindings
 * @returns {Array} buffers
 */
function assignBuffers(steps, resultBindings) {
  const lastRead = new Array(steps.length).fill(-1);
  for (let i = 0; i < steps.length; i++) {
    const bindings = steps[i].argBindings;
    for (let j = 0; j < bindings.length; j++) {
      const binding = bindings[j];
      if (binding.source === 'step') {
        lastRead[binding.step] = Math.max(lastRead[binding.step], i);
      }
    }
  }
  for (let i = 0; i < resultBindings.length; i++) {
    const binding = resultBindings[i];
    if (binding.source === 'step') {
      lastRead[binding.step] = steps.length;
    }
  }
  const buffers = [];
  const occupantLastRead = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    let assigned = -1;
    for (let b = 0; b < buffers.length; b++) {
      if (occupantLastRead[b] < i && sameShape(buffers[b].output, step.output)) {
        assigned = b;
        break;
      }
    }
    if (assigned === -1) {
      assigned = buffers.length;
      buffers.push({ output: step.output.slice() });
      occupantLastRead.push(-1);
    }
    step.outputBuffer = assigned;
    occupantLastRead[assigned] = lastRead[i];
  }
  return buffers;
}

function sameShape(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * @param {PipelineTrace} trace
 * @param {*} returned - the orchestration function's return value
 * @returns {Object} results descriptor {kind, entries: [{key?, binding}]}
 */
function bindResults(trace, returned) {
  if (returned === null || returned === undefined) {
    throw new Error(MSG_RETURN_SHAPE);
  }
  if (trace.handleMeta.has(returned)) {
    return { kind: 'single', entries: [{ binding: trace.bindValue(returned) }] };
  }
  if (Array.isArray(returned)) {
    return {
      kind: 'array',
      entries: returned.map((value, i) => ({ key: i, binding: trace.bindValue(value) })),
    };
  }
  if (returned instanceof PipelineHandle) {
    // a handle the current trace does not know: cached from a previous
    // trace or leaked from another pipeline
    throw new Error(MSG_STALE_HANDLE);
  }
  if (typeof returned === 'object' && !ArrayBuffer.isView(returned)) {
    if (typeof returned.then === 'function') {
      throw new Error(MSG_ASYNC_ORCHESTRATION);
    }
    const proto = Object.getPrototypeOf(returned);
    if (proto !== Object.prototype && proto !== null) {
      // generator objects, class instances: not a plain bag of handles
      throw new Error(MSG_RETURN_SHAPE);
    }
    const entries = [];
    for (const key in returned) {
      if (!returned.hasOwnProperty(key)) continue;
      entries.push({ key, binding: trace.bindValue(returned[key]) });
    }
    if (entries.length === 0) {
      // `{ ...handle }` and friends arrive here as an empty object; an
      // empty result set is never what the caller meant
      throw new Error(MSG_RETURN_SHAPE);
    }
    return { kind: 'object', entries };
  }
  throw new Error(MSG_RETURN_SHAPE);
}

class Pipeline {
  /**
   * @param {GPU} gpu
   * @param {Function} fn - orchestration function, run once per (re)trace
   * @param {IPipelineSettings} [settings]
   */
  constructor(gpu, fn, settings) {
    settings = settings || {};
    this.gpu = gpu;
    this.fn = fn;
    this.argumentCount = fn.length;
    this.constants = Object.assign({}, settings.constants || {});
    // threads: false pins the webasm lowering to its sync path -- a
    // benchmark comparing single-threaded columns needs the plan's win
    // without the pool's (the fused-encoder and generic paths are
    // unaffected; they were never threaded)
    this._threadsDisabled = settings.threads === false;
    // calls queued or executing on the tail; zero means the plan's upload
    // textures are quiescent and an eager synchronous upload is safe
    this._inFlight = 0;
    this.plan = null;
    /**
     * executor identity probe for tests and later phases: 'generic' executes
     * step-by-step through the normal kernel machinery on every backend;
     * 'fused-sync' is the webasm executor running every step over one shared
     * wasm memory; 'fused-threaded' is that executor with pool workers
     * walking the whole plan on an Atomics barrier; 'fused-encoder' is the
     * webgpu executor recording every step into one command encoder over
     * persistent storage buffers
     * @type {String}
     */
    this.executorKind = 'generic';
    /**
     * why the fused executor declined this plan; null while fused (or before
     * the first call decides)
     * @type {String|null}
     */
    this.fallbackReason = null;
    /**
     * undefined: not yet attempted for this plan; false: attempted and
     * declined (generic runs); otherwise the compiled fused executor
     */
    this._executor = undefined;
    /** test/benchmark hook: forces the generic executor when true */
    this._fusionDisabled = false;
    /** test/benchmark hook: keeps a fused executor off the worker pool */
    this.destroyed = false;
    /**
     * concurrent calls to one pipeline serialize on this tail, the same
     * contract as threaded webasm kernels
     */
    this._tail = Promise.resolve();
  }

  /**
   * @desc Always a Promise; arguments sample now, execution queues behind
   * any call already in flight.
   * @param {IArguments|Array} args
   * @returns {Promise<*>}
   */
  call(args) {
    if (this.destroyed) return Promise.reject(new Error(MSG_DESTROYED));
    const sampled = new Array(args.length);
    const held = [];
    // quiescent fast path: with no call in flight, a GL upload runs
    // synchronously RIGHT NOW, so the upload texture IS the call-time
    // snapshot and the deep copy is skipped -- copying was a fixed ~30 ms
    // per call on image-sized arguments, which dominated short plans
    let preUploaded = null;
    // _executor === false is the settled has-degraded-to-generic sentinel
    // (null was never it -- the first cut of this test made the fast path
    // dead code on exactly the GL rows it was built for)
    if (this._inFlight === 0 && this.plan && this._executor === false && this._genericEagerUploadsPay(this.plan)) {
      preUploaded = this._eagerUploads(this.plan, args);
    }
    for (let i = 0; i < args.length; i++) {
      if (preUploaded && preUploaded[i]) {
        sampled[i] = args[i];
      } else {
        sampled[i] = snapshotValue(args[i], held);
      }
    }
    this._inFlight++;
    const promise = this._tail.then(async () => {
      if (this.destroyed) throw new Error(MSG_DESTROYED);
      if (!this.plan) {
        this.plan = this._buildPlan();
        this._executor = undefined;
      }
      if (this._executor === undefined) {
        // synchronous for webasm; a promise for the webgpu encoder, whose
        // compile awaits the device
        await this._prepareExecutor(sampled);
      }
      if (this._executor) {
        try {
          return await this._guardAsync(this._executor.execute(sampled));
        } catch (e) {
          if (!e || !e.isFusionFallback) throw e;
          this._dropExecutor();
          if (e.recompilable) {
            // argument sizes/types drifted: recompile fused for the new
            // signature, like the kernel's own per-size-signature rebuild
            await this._prepareExecutor(sampled);
            if (this._executor) {
              try {
                return await this._guardAsync(this._executor.execute(sampled));
              } catch (e2) {
                if (!e2 || !e2.isFusionFallback) throw e2;
                this._dropExecutor();
                this._degrade(e2.message);
              }
            }
          } else {
            this._degrade(e.message);
          }
        }
      }
      return this._executeGeneric(this.plan, sampled, preUploaded);
    });
    const settle = () => {
      this._inFlight--;
      if (held.length > 0) releaseSnapshots(held);
    };
    promise.then(settle, settle);
    this._tail = promise.then(noop, noop);
    return promise;
  }

  /**
   * The threaded executor rejects asynchronously (worker death, stalled
   * barrier, destroy mid-run); any such failure leaves its barrier state
   * unusable, so the executor is dropped and the next call compiles a
   * fresh one. Fallback decisions stay synchronous — the signature check
   * throws before dispatch — so a FusionFallback can never surface here.
   * @param {*} result - executor.execute's return: a value (sync) or a
   * Promise (threaded)
   */
  _guardAsync(result) {
    if (result && typeof result.then === 'function') {
      return result.then(null, error => {
        this._dropExecutor();
        throw error;
      });
    }
    return result;
  }

  /**
   * @desc Trace-time constants change: the plan is invalid, the next call
   * re-traces. The release queues behind in-flight calls so their buffers
   * are not ripped out from under them.
   * @param {Object} constants
   * @returns {Pipeline}
   */
  setConstants(constants) {
    this.constants = Object.assign({}, constants || {});
    const release = () => {
      this._releasePlan();
    };
    this._tail = this._tail.then(release, release);
    return this;
  }

  /**
   * @desc Releases plan buffers and cloned kernel instances. Queued calls
   * reject; the release itself waits for the call in flight.
   * @returns {Promise}
   */
  destroy() {
    this.destroyed = true;
    if (this.gpu && this.gpu.pipelines) {
      const index = this.gpu.pipelines.indexOf(this);
      if (index !== -1) {
        this.gpu.pipelines.splice(index, 1);
      }
    }
    // a threaded run in flight must reject now, not finish first: its
    // workers hold the shared memory, and a barrier mid-plan could outlive
    // any deadline the caller has. The rejection settles the tail, which is
    // what lets the queued release below run at all.
    if (this._executor && typeof this._executor.abortRuns === 'function') {
      this._executor.abortRuns(new Error(MSG_DESTROYED));
    }
    const release = () => {
      this._releasePlan();
    };
    const tail = this._tail.then(release, release);
    this._tail = tail;
    return tail;
  }

  /**
   * Runs the orchestration function once with handles for arguments; the
   * recorded steps become the plan. Math.random is barred for the duration
   * because a trace-time draw would freeze into every later call.
   * @returns {Object} plan IR
   */
  _buildPlan() {
    const trace = new PipelineTrace(this.gpu);
    const argHandles = new Array(this.argumentCount);
    for (let i = 0; i < this.argumentCount; i++) {
      argHandles[i] = trace.createHandle({ source: 'pipelineArg', index: i });
    }
    const originalRandom = Math.random;
    Math.random = function pipelineTraceRandom() {
      throw new Error(MSG_MATH_RANDOM);
    };
    activeTrace = trace;
    let returned;
    try {
      const ctorName = this.fn.constructor && this.fn.constructor.name;
      if (ctorName === 'AsyncFunction' || ctorName === 'GeneratorFunction' || ctorName === 'AsyncGeneratorFunction') {
        throw new Error(MSG_ASYNC_ORCHESTRATION);
      }
      returned = this.fn.apply({ constants: Object.assign({}, this.constants) }, argHandles);
    } finally {
      activeTrace = null;
      Math.random = originalRandom;
    }
    const results = bindResults(trace, returned);
    const buffers = assignBuffers(trace.steps, results.entries.map(entry => entry.binding));
    const kernels = trace.kernels.map(shortcut => ({
      shortcut,
      clone: this._cloneKernel(shortcut),
    }));
    return {
      steps: trace.steps,
      buffers,
      results,
      kernels,
      held: trace.held,
      // the generic executor's mutable per-(kernel, output-slot) clones,
      // created lazily on first generic run; see _genericClone
      genericClones: new Map(),
    };
  }

  /**
   * The generic executor's writer for one (kernel, seat signature, output
   * slot) triple. One MUTABLE, STATICALLY-TYPED clone per triple reproduces
   * the hand-rolled two-kernel ping-pong mechanically: each clone owns one
   * output texture/array for the life of the plan (steady state allocates
   * nothing per step) and sees one argument-type signature (no per-call
   * dynamicArguments re-typing -- the forced re-typing was most of a 7x
   * loss even after the texture churn was gone). Static liveness
   * (assignBuffers) is what makes mutability safe: no step ever reads a
   * slot while that slot's writer renders. Argument drift across CALLS is
   * the clones' own switch machinery's business, as for any kernel.
   * @param {Object} plan
   * @param {Object} step
   * @returns {IKernelRunShortcut}
   */
  _genericClone(plan, step) {
    // seat sources are plan-static: a step-fed seat is a pipeline handle,
    // a pipelineArg seat types with that argument, a literal is frozen
    const signature = step.argBindings.map(binding =>
      binding.source === 'step' ? 'T' :
      binding.source === 'pipelineArg' ? 'a' + binding.index :
      'l').join(',');
    const key = step.kernel + ':' + step.outputBuffer + ':' + signature;
    let clone = plan.genericClones.get(key);
    if (!clone) {
      clone = this._cloneKernel(plan.kernels[step.kernel].clone, { immutable: false, dynamicArguments: false });
      plan.genericClones.set(key, clone);
    }
    return clone;
  }

  /**
   * Attempts the backend's fused executor for the current plan against this
   * call's sampled arguments: the single-encoder lowering on webgpu (async —
   * kernel builds await the device), the wasm-memory lowering everywhere
   * else. Anything the fused compile cannot take degrades to the generic
   * executor with the reason recorded, its usual degradation contract.
   * @param {Array} args - sampled pipeline arguments; sizes/types bake into
   * the fused layout
   * @returns {Promise|undefined}
   */
  _prepareExecutor(args) {
    if (this._fusionDisabled) {
      this._executor = false;
      return;
    }
    const kernels = this.plan.kernels;
    if (kernels.length > 0 && kernels[0].clone.kernel.constructor.mode === 'webgpu') {
      const { WebGPUPipelineExecutor } = require('./backend/web-gpu/pipeline-executor');
      return WebGPUPipelineExecutor.compile(this, this.plan, args).then(executor => {
        this._executor = executor;
        this.executorKind = executor.kind;
        this.fallbackReason = null;
      }, e => {
        this._degrade((e && e.message) || 'fused executor unavailable');
      });
    }
    try {
      const { WebAssemblyPipelineExecutor } = require('./backend/web-assembly/pipeline-executor');
      this._executor = WebAssemblyPipelineExecutor.compile(this, this.plan, args);
      this.executorKind = this._executor.kind;
      this.fallbackReason = null;
    } catch (e) {
      this._degrade((e && e.message) || 'fused executor unavailable');
    }
  }

  _dropExecutor() {
    if (this._executor) {
      this._executor.destroy();
    }
    this._executor = undefined;
  }

  _degrade(reason) {
    this._executor = false;
    this.executorKind = 'generic';
    this.fallbackReason = reason;
  }

  /**
   * The plan runs on private instances configured for pipeline use --
   * `pipeline: true, immutable: true` -- so intermediates stay resident
   * (textures on GL, fresh arrays on cpu) and the user's kernel settings
   * are never observably touched. Kernels stay shared between pipelines and
   * direct use through their own shortcuts.
   * @param {IKernelRunShortcut} shortcut - the user's kernel
   * @returns {IKernelRunShortcut} private clone
   */
  _cloneKernel(shortcut, overrides) {
    const kernel = shortcut.kernel;
    const settings = Object.assign({
      output: Array.from(kernel.output),
      pipeline: true,
      immutable: true,
      // argument types can differ between plan positions of one kernel
      // (texture in the ping-pong seat, plain array from a pipeline arg)
      dynamicArguments: true,
    }, overrides || {});
    const optional = ['constants', 'constantTypes', 'precision', 'loopMaxIterations', 'strictIntegers', 'fixIntegerDivisionAccuracy', 'optimizeFloatMemory', 'tactic', 'functions', 'nativeFunctions', 'injectedNative', 'debug', 'randomSeed', 'returnType'];
    // types the USER declared pin the clone exactly as they pin the kernel;
    // types inferred by a build must not -- the clone re-infers per plan
    // seat (texture in the ping-pong seat, plain array from a pipeline arg)
    if (kernel.declaredArgumentTypes) {
      settings.argumentTypes = kernel.declaredArgumentTypes.slice();
    }
    for (let i = 0; i < optional.length; i++) {
      const name = optional[i];
      if (kernel[name] !== null && kernel[name] !== undefined) {
        settings[name] = kernel[name];
      }
    }
    return this.gpu.createKernel(kernel.source, settings);
  }

  /**
   * The correctness-reference executor: steps run sequentially through the
   * cloned kernels, step outputs park in their assigned buffer slot, and
   * the final results read back exactly once. Works on every backend; async
   * backends are absorbed by awaiting whatever run and readback return.
   * @param {Object} plan
   * @param {Array} args - sampled pipeline arguments
   * @returns {Promise<*>}
   */
  /**
   * Array pipeline arguments upload ONCE per call on backends where an
   * upload costs (GL textures, webgpu buffers): a lazy per-arg identity
   * kernel parks the value device-side and every consuming step binds the
   * handle -- feeding the raw array to a 200-step plan re-uploaded it 200
   * times, which was most of the remaining gap to hand-rolled ping-pong.
   * cpu/webasm consume arrays natively, so there the raw value is optimal.
   */
  _uploadArg(plan, index, value) {
    const key = 'up:' + index;
    let upload = plan.genericClones.get(key);
    if (!upload) {
      const dims = argDimensions(value);
      const source = dims[2] > 1 ?
        'function (v) { return v[this.thread.z][this.thread.y][this.thread.x]; }' :
        dims[1] > 1 ?
        'function (v) { return v[this.thread.y][this.thread.x]; }' :
        'function (v) { return v[this.thread.x]; }';
      const output = dims[2] > 1 ? [dims[0], dims[1], dims[2]] : dims[1] > 1 ? [dims[0], dims[1]] : [dims[0]];
      upload = this.gpu.createKernel(source, { output, pipeline: true, immutable: false });
      plan.genericClones.set(key, upload);
    }
    return upload(value);
  }

  /**
   * Eager uploads are only sound where the upload call is SYNCHRONOUS (the
   * GL family): the texture materializes before user code can run again.
   * webgpu uploads return promises, so its generic path keeps copies.
   */
  _genericEagerUploadsPay(plan) {
    if (plan.kernels.length === 0) return false;
    return plan.kernels[0].clone.kernel.constructor.mode === 'gpu';
  }

  _eagerUploads(plan, args) {
    const uploaded = new Array(args.length).fill(null);
    for (let i = 0; i < plan.steps.length; i++) {
      const bindings = plan.steps[i].argBindings;
      for (let j = 0; j < bindings.length; j++) {
        const binding = bindings[j];
        if (binding.source !== 'pipelineArg' || uploaded[binding.index]) continue;
        const value = args[binding.index];
        if (!value || typeof value !== 'object') continue;
        if (typeof value.toArray === 'function' && !(value instanceof Input)) continue;
        // size drift rebuilds the clones in the tail; an eager upload into
        // the OLD upload kernel would write out of bounds -- decline and
        // let the copy path carry this call
        if (plan.genericArgDims) {
          const known = plan.genericArgDims.get(binding.index);
          if (known !== undefined && known !== argDimensions(value).join('x')) {
            return null;
          }
        }
        const handle = this._uploadArg(plan, binding.index, value);
        if (handle && typeof handle.then === 'function') {
          // not synchronous after all: abandon the fast path for this call
          return null;
        }
        uploaded[binding.index] = handle;
      }
    }
    return uploaded;
  }

  async _executeGeneric(plan, args, preUploaded) {
    const slots = new Array(plan.buffers.length).fill(null);
    // the clones are statically typed and the uploads statically shaped, so
    // argument size drift rebuilds them (the fused executors' recompile
    // contract); sizes re-derive from the current values on next use
    if (!plan.genericArgDims) plan.genericArgDims = new Map();
    for (let i = 0; i < args.length; i++) {
      const value = args[i];
      if (!value || typeof value !== 'object') continue;
      // resident handles (textures, buffer results) size where they bind;
      // only plain arrays and Inputs shape the clones and uploads
      if (typeof value.toArray === 'function' && !(value instanceof Input)) continue;
      const dims = argDimensions(value).join('x');
      const known = plan.genericArgDims.get(i);
      if (known === undefined) {
        plan.genericArgDims.set(i, dims);
      } else if (known !== dims) {
        const gpuKernels = this.gpu && this.gpu.kernels;
        for (const clone of plan.genericClones.values()) {
          if (!gpuKernels || gpuKernels.indexOf(clone.kernel) !== -1) clone.destroy();
        }
        plan.genericClones.clear();
        plan.genericArgDims = new Map([
          [i, dims]
        ]);
        break;
      }
    }
    const backendMode = plan.kernels.length > 0 ? plan.kernels[0].clone.kernel.constructor.mode : null;
    const uploadsPay = backendMode === 'gpu' || backendMode === 'webgpu';
    const uploaded = preUploaded || new Array(args.length).fill(null);
    if (uploadsPay && !preUploaded) {
      for (let i = 0; i < plan.steps.length; i++) {
        const bindings = plan.steps[i].argBindings;
        for (let j = 0; j < bindings.length; j++) {
          const binding = bindings[j];
          if (binding.source !== 'pipelineArg' || uploaded[binding.index]) continue;
          const value = args[binding.index];
          if (!value || typeof value !== 'object') continue;
          if (typeof value.toArray === 'function' && !(value instanceof Input)) continue; // already resident
          let handle = this._uploadArg(plan, binding.index, value);
          if (handle && typeof handle.then === 'function') handle = await handle;
          uploaded[binding.index] = handle;
        }
      }
    }
    try {
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        const bindings = step.argBindings;
        const resolved = new Array(bindings.length);
        for (let j = 0; j < bindings.length; j++) {
          const binding = bindings[j];
          if (binding.source === 'pipelineArg') {
            resolved[j] = uploaded[binding.index] || args[binding.index];
          } else if (binding.source === 'step') {
            resolved[j] = slots[plan.steps[binding.step].outputBuffer];
          } else {
            resolved[j] = binding.value;
          }
        }
        let output = this._genericClone(plan, step).apply(null, resolved);
        if (output && typeof output.then === 'function') {
          output = await output;
        }
        // no release: the mutable clone OWNS its output for the plan's life
        // and re-renders it in place next parity -- the previous occupant is
        // past its last read (assignBuffers guarantees it), and per-step
        // texture churn was a 29x loss on GL ping-pong plans
        slots[step.outputBuffer] = output;
      }
      const results = plan.results;
      const values = new Array(results.entries.length);
      for (let i = 0; i < results.entries.length; i++) {
        const binding = results.entries[i].binding;
        let value;
        if (binding.source === 'pipelineArg') {
          value = args[binding.index];
        } else if (binding.source === 'step') {
          value = slots[plan.steps[binding.step].outputBuffer];
        } else {
          value = binding.value;
        }
        if (value && typeof value.toArray === 'function') {
          value = value.toArray();
          if (value && typeof value.then === 'function') {
            value = await value;
          }
        } else if (binding.source === 'step') {
          // a cpu clone's mutable result is re-rendered in place by the next
          // call; the caller's copy must be theirs to keep
          value = copyPlainResult(value);
        }
        values[i] = value;
      }
      if (results.kind === 'single') return values[0];
      if (results.kind === 'array') return values;
      const shaped = {};
      for (let i = 0; i < results.entries.length; i++) {
        shaped[results.entries[i].key] = values[i];
      }
      return shaped;
    } finally {
      // slot occupants are clone-owned; they die with the plan, not the call
      slots.length = 0;
    }
  }

  _releasePlan() {
    if (this._executor) {
      this._executor.destroy();
    }
    this._executor = undefined;
    this.executorKind = 'generic';
    this.fallbackReason = null;
    if (!this.plan) return;
    const kernels = this.plan.kernels;
    const gpuKernels = this.gpu && this.gpu.kernels;
    for (let i = 0; i < kernels.length; i++) {
      const clone = kernels[i].clone;
      // gpu.destroy() may have reached the clone through gpu.kernels before
      // this queued release runs; the GL destroy is not re-entrant (its
      // splice would eat an unrelated kernel on indexOf -1), so only clones
      // still registered are destroyed here
      if (!gpuKernels || gpuKernels.indexOf(clone.kernel) !== -1) {
        clone.destroy();
      }
    }
    for (const clone of this.plan.genericClones.values()) {
      if (!gpuKernels || gpuKernels.indexOf(clone.kernel) !== -1) {
        clone.destroy();
      }
    }
    this.plan.genericClones.clear();
    if (this.plan.held) {
      releaseSnapshots(this.plan.held);
    }
    this.plan = null;
  }
}

function argDimensions(value) {
  const dims = value instanceof Input ? Array.from(value.size) : Array.from(utils.getDimensions(value));
  while (dims.length < 3) {
    dims.push(1);
  }
  return dims;
}

function copyPlainResult(value) {
  if (ArrayBuffer.isView(value)) return value.slice(0);
  if (Array.isArray(value)) return value.map(copyPlainResult);
  return value;
}

function releaseValue(value) {
  if (value && typeof value.delete === 'function') {
    value.delete();
  }
}

function noop() {}

module.exports = {
  Pipeline,
  PipelineHandle,
  getActiveTrace,
};