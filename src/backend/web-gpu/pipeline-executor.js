const { utils } = require('../../utils');
const { Input } = require('../../input');
const { FusionFallback } = require('../web-assembly/pipeline-executor');

/**
 * Fused pipeline execution for webgpu (docs/design/pipeline-compilation.md):
 * every plan step builds through the kernel's own WGSL machinery and then
 * runs against persistent storage buffers — plan buffers allocated once on
 * the shared device, ping-pong steps landing on static alternating bind
 * groups, per-step params uniforms created at compile. A call writes the
 * pipeline arguments and any per-call params (scalar arguments, unpinned
 * random seeds), records EVERY step as a compute pass into ONE command
 * encoder, copies the result buffers into a single staging buffer inside
 * that same encoder, submits once, and resolves through one mapAsync
 * readback.
 */

// GPUBufferUsage/GPUMapMode are globals only where WebGPU exists; the
// numeric values are pinned by the spec (same convention as kernel.js)
const USAGE_UNIFORM = 0x0040;
const USAGE_STORAGE = 0x0080;
const USAGE_COPY_SRC = 0x0004;
const USAGE_COPY_DST = 0x0008;
const USAGE_MAP_READ = 0x0001;
const MAP_MODE_READ = 0x0001;

// the generic executor reads back any result value exposing toArray() (an
// Input resolves to its erected rows, not the Input instance); the fused
// executors must resolve identical shapes. Resident handles never reach
// this -- the compile and per-call guards degrade them first.
function unwrapResultValue(value) {
  if (value && typeof value.toArray === 'function') {
    return value.toArray();
  }
  return value;
}

function checkStorageSize(device, byteLength, what) {
  const limits = device.limits;
  const max = Math.min(limits.maxStorageBufferBindingSize, limits.maxBufferSize);
  if (byteLength > max) {
    // degrade rather than throw the kernel's error: the generic executor
    // routes through the kernel's own path, which reports it loudly
    throw new FusionFallback(`${ what } needs ${ byteLength } bytes but this device allows ${ max } per storage buffer`);
  }
}

function valueDimensions(value) {
  const dims = value instanceof Input ?
    Array.from(value.size) :
    Array.from(utils.getDimensions(value));
  while (dims.length < 3) {
    dims.push(1);
  }
  return dims;
}

function scalarMatches(type, value) {
  switch (type) {
    case 'Integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'Boolean':
      return typeof value === 'boolean';
    default:
      return typeof value === 'number';
  }
}

// Input also has a toArray(); only texture/buffer handles are resident
function isResidentHandle(value) {
  return Boolean(value) && typeof value === 'object' && !(value instanceof Input) &&
    (typeof value.toArray === 'function' || typeof value.delete === 'function');
}

function align16(value) {
  return Math.ceil(value / 16) * 16;
}

class WebGPUPipelineExecutor {
  /**
   * @param {Pipeline} pipeline
   * @param {Object} plan - the plan IR; buffer assignment is reused as-is
   * @param {Array} args - the first call's sampled arguments; their sizes and
   * types bake into the layout, and execute() re-checks them per call
   * @returns {Promise<WebGPUPipelineExecutor>}
   * @throws {FusionFallback} for anything the encoder cannot take statically
   */
  static async compile(pipeline, plan, args) {
    for (let i = 0; i < plan.kernels.length; i++) {
      const kernel = plan.kernels[i].clone.kernel;
      if (kernel.constructor.mode !== 'webgpu') {
        throw new FusionFallback(`pipeline backend is ${ kernel.constructor.mode }; the fused encoder requires webgpu`);
      }
    }
    if (plan.steps.length === 0) {
      throw new FusionFallback('plan has no kernel steps to fuse');
    }
    const executor = new WebGPUPipelineExecutor(pipeline, plan);
    try {
      await executor._compile(args);
    } catch (e) {
      executor.destroy();
      throw e;
    }
    return executor;
  }

  constructor(pipeline, plan) {
    this.pipeline = pipeline;
    this.gpu = pipeline.gpu;
    this.plan = plan;
    this.kind = 'fused-encoder';
    this.destroyed = false;
    this.context = null;
    this._device = null;
    this._planBuffers = null;
    this._argRegions = new Map();
    this._argScalarSlots = new Map();
    this._literalBuffers = new Map();
    this._paramsRecords = [];
    this._passes = null;
    this._resultReads = null;
    this._staging = null;
    /**
     * kernels created for second and later type signatures of one plan
     * kernel (the plan clone carries the first); destroyed with the executor
     */
    this._extraShortcuts = [];
    // representative Float32Arrays for step-output bindings, keyed by flat
    // length; compile-time only, released when _compile returns
    this._scratch = new Map();
  }

  async _compile(args) {
    const plan = this.plan;
    // a GPU-resident handle argument cannot bind statically — a different
    // buffer arrives every call; the generic executor takes handles natively
    for (let i = 0; i < plan.steps.length; i++) {
      const bindings = plan.steps[i].argBindings;
      for (let j = 0; j < bindings.length; j++) {
        const binding = bindings[j];
        if (binding.source === 'pipelineArg' && isResidentHandle(args[binding.index])) {
          throw new FusionFallback(`pipeline argument ${ binding.index } is a GPU-resident handle; the fused encoder takes plain arrays`);
        }
      }
    }
    // an argument bound ONLY in the results never gets an arg region, so the
    // per-call checks below would miss it -- remember its seats and screen
    // them exactly like step-bound ones
    this._resultArgIndexes = [];
    for (let i = 0; i < plan.results.entries.length; i++) {
      const binding = plan.results.entries[i].binding;
      if (binding.source !== 'pipelineArg') continue;
      if (isResidentHandle(args[binding.index])) {
        throw new FusionFallback(`pipeline argument ${ binding.index } is a GPU-resident handle; the fused encoder takes plain arrays`);
      }
      this._resultArgIndexes.push(binding.index);
    }
    // a program is a plan kernel built for one argument-type signature: the
    // kernel's own build() ran (WGSL, compute pipeline, constant buffers),
    // but its run() never will — the executor encodes the passes itself
    const programs = new Map();
    const cloneClaimed = new Array(plan.kernels.length).fill(false);
    const stepPrograms = new Array(plan.steps.length);
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const kernelEntry = plan.kernels[step.kernel];
      const reps = this._representativeArgs(step, args);
      const strict = kernelEntry.clone.kernel.strictIntegers;
      const programKey = step.kernel + ':' + reps.map(value => utils.getVariableType(value, strict)).join(',');
      let program = programs.get(programKey);
      if (!program) {
        let kernel;
        if (!cloneClaimed[step.kernel]) {
          cloneClaimed[step.kernel] = true;
          kernel = kernelEntry.clone.kernel;
        } else {
          // from the plan's frozen clone, NOT the live user kernel: a
          // setOutput between trace and recompile must not bake the user's
          // current shape over the plan's trace-time one
          const extra = this.pipeline._cloneKernel(kernelEntry.clone);
          this._extraShortcuts.push(extra);
          kernel = extra.kernel;
        }
        await this._prepareKernel(kernel, reps);
        program = { id: programs.size, kernel };
        programs.set(programKey, program);
      }
      stepPrograms[i] = program;
    }
    this._scratch = null;
    // vec-returning steps pack componentCount values per cell; the flat
    // array accessors read stride 1, so only results may consume them
    for (let i = 0; i < plan.steps.length; i++) {
      const bindings = plan.steps[i].argBindings;
      for (let j = 0; j < bindings.length; j++) {
        const binding = bindings[j];
        if (binding.source === 'step' && stepPrograms[binding.step].kernel.componentCount !== 1) {
          throw new FusionFallback(`a step returning ${ stepPrograms[binding.step].kernel.returnType } cannot feed another step in the fused encoder`);
        }
      }
    }

    const device = this._device = stepPrograms[0].kernel._device;
    this.context = stepPrograms[0].kernel.context;
    const queue = device.queue;

    const bufferComponents = new Array(plan.buffers.length).fill(1);
    for (let i = 0; i < plan.steps.length; i++) {
      const b = plan.steps[i].outputBuffer;
      bufferComponents[b] = Math.max(bufferComponents[b], stepPrograms[i].kernel.componentCount);
    }
    this._planBuffers = plan.buffers.map((record, b) => {
      const dims = record.output;
      let cells = 1;
      for (let d = 0; d < dims.length; d++) cells *= dims[d];
      return {
        cells,
        buffer: device.createBuffer({
          size: cells * bufferComponents[b] * 4,
          usage: USAGE_STORAGE | USAGE_COPY_SRC,
        }),
      };
    });

    // one pass record per distinct (program, buffer assignment, baked
    // scalars): the ping-pong loop lands on two records with static bind
    // groups however many steps it unrolled to
    const bufferIds = new Map();
    const idOf = buffer => {
      let id = bufferIds.get(buffer);
      if (id === undefined) {
        id = bufferIds.size;
        bufferIds.set(buffer, id);
      }
      return id;
    };
    const passRecords = new Map();
    this._passes = new Array(plan.steps.length);
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const program = stepPrograms[i];
      const kernel = program.kernel;
      const layout = kernel.paramsLayout;
      const argBuffers = new Array(layout.arrayArgs.length);
      const argDims = new Array(layout.arrayArgs.length);
      for (let j = 0; j < layout.arrayArgs.length; j++) {
        const record = layout.arrayArgs[j];
        const binding = step.argBindings[record.index];
        if (binding.source === 'pipelineArg') {
          let region = this._argRegions.get(binding.index);
          if (!region) {
            const dims = valueDimensions(args[binding.index]);
            const flatLength = dims[0] * dims[1] * dims[2];
            // over the storage-binding limit, createBuffer succeeds but the
            // bind group fails ASYNC validation and every read maps zeros --
            // the direct kernel throws here, so the fused path must too
            checkStorageSize(device, flatLength * 4, `pipeline argument ${ binding.index }`);
            region = {
              dims,
              flatLength,
              scratch: new Float32Array(flatLength),
              buffer: device.createBuffer({
                size: Math.max(flatLength * 4, 4),
                usage: USAGE_STORAGE | USAGE_COPY_DST,
              }),
            };
            this._argRegions.set(binding.index, region);
          }
          argBuffers[j] = region.buffer;
          argDims[j] = region.dims;
        } else if (binding.source === 'literal') {
          let literal = this._literalBuffers.get(binding.value);
          if (!literal) {
            const dims = valueDimensions(binding.value);
            const flatLength = dims[0] * dims[1] * dims[2];
            checkStorageSize(device, flatLength * 4, 'a literal array argument');
            const buffer = device.createBuffer({
              size: Math.max(flatLength * 4, 4),
              usage: USAGE_STORAGE,
              mappedAtCreation: true,
            });
            const mapped = new Float32Array(buffer.getMappedRange());
            utils.flattenTo(binding.value instanceof Input ? binding.value.value : binding.value, mapped.subarray(0, flatLength));
            buffer.unmap();
            literal = { buffer, dims };
            this._literalBuffers.set(binding.value, literal);
          }
          argBuffers[j] = literal.buffer;
          argDims[j] = literal.dims;
        } else {
          const producer = plan.steps[binding.step];
          const dims = Array.from(producer.output);
          while (dims.length < 3) dims.push(1);
          argBuffers[j] = this._planBuffers[producer.outputBuffer].buffer;
          argDims[j] = dims;
        }
      }
      const outputBuffer = this._planBuffers[step.outputBuffer].buffer;
      // baked scalar values are part of the pass identity: two steps can
      // share every buffer yet differ in a literal scalar
      const scalarSignature = layout.scalarArgs.map(record => {
        const binding = step.argBindings[record.index];
        return binding.source === 'literal' ? 'l' + binding.value : 'a' + binding.index;
      }).join(',');
      // an unpinned kernel draws per call AND per step, matching the generic
      // executor's one draw per kernel run; a pinned seed is baked, so
      // ping-pong steps may share their params
      const unpinnedRandom = layout.randomSeedOffset !== null && kernel.randomSeed === null;
      const key = program.id + ':' + argBuffers.map(idOf).join(',') + '>' + idOf(outputBuffer) +
        ':' + scalarSignature + (unpinnedRandom ? '#' + i : '');
      let stepPass = passRecords.get(key);
      if (!stepPass) {
        const mirror = new ArrayBuffer(layout.byteLength);
        const u32 = new Uint32Array(mirror);
        const i32 = new Int32Array(mirror);
        const f32 = new Float32Array(mirror);
        const dispatch = kernel._computeDispatch(kernel.threadDim);
        u32[0] = kernel.threadDim[0];
        u32[1] = kernel.threadDim[1];
        u32[2] = kernel.threadDim[2];
        u32[3] = dispatch.dispatchWidth;
        for (let j = 0; j < layout.arrayArgs.length; j++) {
          const base = layout.arrayArgs[j].dimsOffset / 4;
          u32[base] = argDims[j][0];
          u32[base + 1] = argDims[j][1];
          u32[base + 2] = argDims[j][2];
          u32[base + 3] = argDims[j][0] * argDims[j][1] * argDims[j][2];
        }
        const perCallScalars = [];
        for (let j = 0; j < layout.scalarArgs.length; j++) {
          const record = layout.scalarArgs[j];
          const binding = step.argBindings[record.index];
          if (binding.source === 'literal') {
            this._writeScalar(u32, i32, f32, record, binding.value);
          } else if (binding.source === 'pipelineArg') {
            perCallScalars.push({ index: binding.index, offset: record.offset, type: record.type });
            this._argScalarSlots.set(binding.index + ':' + record.type, { index: binding.index, type: record.type });
          } else {
            // unreachable by construction: step-output reps are Inputs, so
            // inference can never type this position scalar
            throw new FusionFallback('a step output cannot bind to a scalar argument');
          }
        }
        if (layout.randomSeedOffset !== null && kernel.randomSeed !== null) {
          u32[layout.randomSeedOffset / 4] = kernel.randomSeed >>> 0;
        }
        const paramsBuffer = device.createBuffer({
          size: layout.byteLength,
          usage: USAGE_UNIFORM | USAGE_COPY_DST,
        });
        const perCall = perCallScalars.length > 0 || unpinnedRandom;
        if (!perCall) {
          // everything in this params struct is baked; upload exactly once
          queue.writeBuffer(paramsBuffer, 0, mirror);
        }
        const entries = [{ binding: 0, resource: { buffer: paramsBuffer } }];
        for (let j = 0; j < argBuffers.length; j++) {
          entries.push({ binding: 1 + j, resource: { buffer: argBuffers[j] } });
        }
        const outBinding = 1 + argBuffers.length;
        entries.push({ binding: outBinding, resource: { buffer: outputBuffer } });
        for (let j = 0; j < layout.bufferConstants.length; j++) {
          entries.push({ binding: outBinding + 1 + j, resource: { buffer: layout.bufferConstants[j].buffer } });
        }
        stepPass = {
          pipeline: kernel.computePipeline,
          bindGroup: device.createBindGroup({ layout: kernel.bindGroupLayout, entries }),
          groups: dispatch.groups,
          paramsBuffer,
          mirror,
          u32,
          i32,
          f32,
          perCall,
          perCallScalars,
          seedOffset: unpinnedRandom ? layout.randomSeedOffset : null,
        };
        this._paramsRecords.push(stepPass);
        passRecords.set(key, stepPass);
      }
      this._passes[i] = stepPass;
    }

    let stagingBytes = 0;
    this._resultReads = plan.results.entries.map(entry => {
      const binding = entry.binding;
      if (binding.source === 'step') {
        const step = plan.steps[binding.step];
        const planBuffer = this._planBuffers[step.outputBuffer];
        const kernel = stepPrograms[binding.step].kernel;
        const byteLength = planBuffer.cells * kernel.componentCount * 4;
        const read = {
          kind: 'step',
          buffer: planBuffer.buffer,
          offset: stagingBytes,
          byteLength,
          output: step.output,
          componentCount: kernel.componentCount,
          kernel,
        };
        stagingBytes += align16(byteLength);
        return read;
      }
      if (binding.source === 'pipelineArg') {
        return { kind: 'arg', index: binding.index };
      }
      return { kind: 'literal', value: binding.value };
    });
    if (stagingBytes > 0) {
      this._staging = device.createBuffer({
        size: stagingBytes,
        usage: USAGE_MAP_READ | USAGE_COPY_DST,
      });
    }
  }

  /**
   * Stand-ins with the exact types and dims each binding will have at run
   * time, for the kernel build: sampled values stand for themselves, a step
   * output becomes an Input over its producer's dims.
   */
  _representativeArgs(step, args) {
    const reps = new Array(step.argBindings.length);
    for (let j = 0; j < step.argBindings.length; j++) {
      const binding = step.argBindings[j];
      if (binding.source === 'pipelineArg') {
        reps[j] = args[binding.index];
      } else if (binding.source === 'literal') {
        reps[j] = binding.value;
      } else {
        const output = this.plan.steps[binding.step].output;
        let flatLength = 1;
        for (let d = 0; d < output.length; d++) flatLength *= output[d];
        let scratch = this._scratch.get(flatLength);
        if (!scratch) {
          scratch = new Float32Array(flatLength);
          this._scratch.set(flatLength, scratch);
        }
        reps[j] = new Input(scratch, Array.from(output));
      }
    }
    return reps;
  }

  /**
   * The kernel's own build() carries the whole WGSL path — inference,
   * translation, compute-pipeline creation, constant upload; the executor
   * reuses its computePipeline/bindGroupLayout/paramsLayout and never calls
   * run(). On a recompile after argument drift the clone is already built,
   * so the previous device objects are released and inference reset first.
   */
  async _prepareKernel(kernel, reps) {
    if (kernel.built || kernel._buildPromise) {
      // destroy() unregisters the clone; the plan-release guard needs it
      // back in gpu.kernels
      const gpuKernels = kernel.gpu && kernel.gpu.kernels;
      kernel.destroy();
      if (gpuKernels && gpuKernels.indexOf(kernel) === -1) {
        gpuKernels.push(kernel);
      }
      kernel.argumentTypes = kernel.declaredArgumentTypes ? kernel.declaredArgumentTypes.slice() : null;
    }
    await kernel.build.apply(kernel, reps);
    // every step writes a plan buffer; the output buffer the build allocated
    // would only hold memory
    if (kernel.outputBuffer) {
      if (--kernel.outputBuffer._refs === 0) {
        kernel.outputBuffer.destroy();
      }
      kernel.outputBuffer = null;
    }
  }

  /**
   * The layout baked argument sizes and scalar types; a call that drifts
   * from them throws recompilable so the pipeline compiles a fresh fused
   * plan for the new signature, the way the kernel itself rebuilds per size
   * signature.
   */
  _checkArguments(args) {
    for (const [index, region] of this._argRegions) {
      const value = args[index];
      if (!value || typeof value !== 'object') {
        throw new FusionFallback(`pipeline argument ${ index } is no longer an array`, true);
      }
      if (isResidentHandle(value)) {
        // the recompile declines handles with its own named reason and the
        // pipeline degrades to the generic executor from there
        throw new FusionFallback(`pipeline argument ${ index } is now a GPU-resident handle`, true);
      }
      const dims = valueDimensions(value);
      if (dims[0] !== region.dims[0] || dims[1] !== region.dims[1] || dims[2] !== region.dims[2]) {
        throw new FusionFallback(`pipeline argument ${ index } changed size from [${ region.dims.join(', ') }] to [${ dims.join(', ') }]`, true);
      }
    }
    for (const slot of this._argScalarSlots.values()) {
      if (!scalarMatches(slot.type, args[slot.index])) {
        throw new FusionFallback(`pipeline argument ${ slot.index } is no longer of type ${ slot.type }`, true);
      }
    }
    for (let i = 0; i < this._resultArgIndexes.length; i++) {
      const index = this._resultArgIndexes[i];
      if (isResidentHandle(args[index])) {
        throw new FusionFallback(`pipeline argument ${ index } is now a GPU-resident handle`, true);
      }
    }
  }

  _writeScalar(u32, i32, f32, record, value) {
    const slot = record.offset / 4;
    if (record.type === 'Integer') {
      i32[slot] = value | 0;
    } else if (record.type === 'Boolean') {
      u32[slot] = value ? 1 : 0;
    } else {
      f32[slot] = value;
    }
  }

  /**
   * @param {Array} args - sampled pipeline arguments
   * @returns {Promise<*>} results shaped per the plan. Argument drift throws
   * a recompilable FusionFallback synchronously, before anything is encoded;
   * async failures (device loss) reject, which drops the executor via the
   * pipeline's _guardAsync so the next call compiles fresh.
   */
  execute(args) {
    if (this.destroyed) {
      throw new Error('pipeline fused executor has been destroyed');
    }
    if (this.context && this.context.isLost) {
      // reject rather than throw: the rejection path drops this executor,
      // and the recompile re-acquires a fresh device
      return Promise.reject(new Error('WebGPU device was lost; the pipeline will rebuild on a fresh device on its next call'));
    }
    this._checkArguments(args);
    const device = this._device;
    const queue = device.queue;
    for (const [index, region] of this._argRegions) {
      const value = args[index];
      utils.flattenTo(value instanceof Input ? value.value : value, region.scratch);
      queue.writeBuffer(region.buffer, 0, region.scratch);
    }
    for (let i = 0; i < this._paramsRecords.length; i++) {
      const record = this._paramsRecords[i];
      if (!record.perCall) continue;
      for (let j = 0; j < record.perCallScalars.length; j++) {
        const slot = record.perCallScalars[j];
        this._writeScalar(record.u32, record.i32, record.f32, slot, args[slot.index]);
      }
      if (record.seedOffset !== null) {
        record.u32[record.seedOffset / 4] = (Math.random() * 0x100000000) >>> 0;
      }
      queue.writeBuffer(record.paramsBuffer, 0, record.mirror);
    }
    const encoder = device.createCommandEncoder();
    for (let i = 0; i < this._passes.length; i++) {
      const stepPass = this._passes[i];
      const pass = encoder.beginComputePass();
      pass.setPipeline(stepPass.pipeline);
      pass.setBindGroup(0, stepPass.bindGroup);
      pass.dispatchWorkgroups(stepPass.groups[0], stepPass.groups[1], stepPass.groups[2]);
      pass.end();
    }
    for (let i = 0; i < this._resultReads.length; i++) {
      const read = this._resultReads[i];
      if (read.kind === 'step') {
        encoder.copyBufferToBuffer(read.buffer, 0, this._staging, read.offset, read.byteLength);
      }
    }
    queue.submit([encoder.finish()]);
    if (!this._staging) {
      return Promise.resolve(this._shapeResults(args, null));
    }
    // calls serialize on the pipeline tail, so the single staging buffer is
    // never mapped twice at once
    return this._staging.mapAsync(MAP_MODE_READ).then(() => {
      const mapped = this._staging.getMappedRange();
      const values = this._shapeResults(args, mapped);
      this._staging.unmap();
      return values;
    });
  }

  _shapeResults(args, mapped) {
    const results = this.plan.results;
    const values = new Array(this._resultReads.length);
    for (let i = 0; i < this._resultReads.length; i++) {
      const read = this._resultReads[i];
      if (read.kind === 'step') {
        const data = new Float32Array(mapped.slice(read.offset, read.offset + read.byteLength));
        values[i] = read.kernel._shapeOutput(data, read.output, read.componentCount);
      } else if (read.kind === 'arg') {
        values[i] = unwrapResultValue(args[read.index]);
      } else {
        values[i] = unwrapResultValue(read.value);
      }
    }
    if (results.kind === 'single') return values[0];
    if (results.kind === 'array') return values;
    const shaped = {};
    for (let i = 0; i < values.length; i++) {
      shaped[results.entries[i].key] = values[i];
    }
    return shaped;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    // destroying buffers on a lost/destroyed device is legal per spec
    if (this._planBuffers) {
      for (let i = 0; i < this._planBuffers.length; i++) {
        this._planBuffers[i].buffer.destroy();
      }
    }
    for (const region of this._argRegions.values()) {
      region.buffer.destroy();
    }
    for (const literal of this._literalBuffers.values()) {
      literal.buffer.destroy();
    }
    for (let i = 0; i < this._paramsRecords.length; i++) {
      this._paramsRecords[i].paramsBuffer.destroy();
    }
    if (this._staging) {
      this._staging.destroy();
      this._staging = null;
    }
    const gpuKernels = this.gpu && this.gpu.kernels;
    for (let i = 0; i < this._extraShortcuts.length; i++) {
      const shortcut = this._extraShortcuts[i];
      // same guard as Pipeline._releasePlan: gpu.destroy() may already have
      // reached this kernel, and kernel destroy is not re-entrant
      if (!gpuKernels || gpuKernels.indexOf(shortcut.kernel) !== -1) {
        shortcut.destroy();
      }
    }
    this._extraShortcuts = [];
    this._planBuffers = null;
    this._argRegions = new Map();
    this._argScalarSlots = new Map();
    this._literalBuffers = new Map();
    this._paramsRecords = [];
    this._passes = null;
    this._resultReads = null;
  }
}

module.exports = {
  WebGPUPipelineExecutor,
};