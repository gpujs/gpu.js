const { utils } = require('../../utils');
const { Input } = require('../../input');
const { WebAssemblyKernel } = require('./kernel');

/**
 * Fused pipeline execution (docs/design/pipeline-compilation.md): every plan
 * step compiles to a wasm module over ONE shared memory laid out
 * `[ pipeline args | literals | constants | plan buffers ]`, with each
 * module's input/output offsets baked against that layout. Steps then run
 * back-to-back synchronously; intermediates never leave wasm memory between
 * passes — per call there is one flattenTo per pipeline argument and one
 * readback per result, however many steps the plan unrolls to.
 */

const SUPPORTED_VALUE_TYPES = ['Array', 'Input', 'Number', 'Float', 'Integer', 'Boolean'];

/**
 * The degradation signal, per the backend's usual contract: the pipeline
 * catches it and runs the generic executor with this reason. `recompilable`
 * marks argument size/type drift a fresh fused compile can absorb.
 */
class FusionFallback extends Error {
  constructor(reason, recompilable) {
    super(reason);
    this.isFusionFallback = true;
    this.recompilable = Boolean(recompilable);
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

class WebAssemblyPipelineExecutor {
  /**
   * @param {Pipeline} pipeline
   * @param {Object} plan - phase-1 plan IR; buffer assignment is reused as-is
   * @param {Array} args - the first call's sampled arguments; their sizes and
   * types bake into the layout, and execute() re-checks them per call
   * @returns {WebAssemblyPipelineExecutor}
   * @throws {FusionFallback} for anything the webasm backend cannot take
   */
  static compile(pipeline, plan, args) {
    for (let i = 0; i < plan.kernels.length; i++) {
      const kernel = plan.kernels[i].clone.kernel;
      if (kernel.constructor.mode !== 'webasm') {
        throw new FusionFallback(`pipeline backend is ${ kernel.constructor.mode }; the fused executor requires webasm`);
      }
    }
    if (plan.steps.length === 0) {
      throw new FusionFallback('plan has no kernel steps to fuse');
    }
    const executor = new WebAssemblyPipelineExecutor(pipeline, plan);
    executor._compile(args);
    return executor;
  }

  constructor(pipeline, plan) {
    this.pipeline = pipeline;
    this.gpu = pipeline.gpu;
    this.plan = plan;
    this.kind = 'fused-sync';
    this.destroyed = false;
    this.memory = null;
    this.f32 = null;
    this.i32 = null;
    this._stepRuns = null;
    this._argArrayRegions = null;
    this._argScalarSlots = null;
    this._resultReads = null;
    /**
     * kernels created for second and later type signatures of one plan
     * kernel (the plan clone carries the first); destroyed with the executor
     */
    this._extraShortcuts = [];
    // representative Float32Arrays for step-output bindings, keyed by flat
    // length; compile-time only, released when _compile returns
    this._scratch = new Map();
  }

  /**
   * A program is a plan kernel prepared for one argument-type signature:
   * type inference and bytecode translation ran, but no module was
   * instantiated — modules are per step-offset assignment, built below.
   */
  _compile(args) {
    const plan = this.plan;
    const programs = new Map();
    const cloneClaimed = new Array(plan.kernels.length).fill(false);
    const stepPrograms = new Array(plan.steps.length);
    const stepReps = new Array(plan.steps.length);
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
          const extra = this.pipeline._cloneKernel(kernelEntry.shortcut);
          this._extraShortcuts.push(extra);
          kernel = extra.kernel;
        }
        this._prepareKernel(kernel, reps);
        program = { id: programs.size, kernel, constantRegions: null };
        programs.set(programKey, program);
      }
      stepPrograms[i] = program;
      stepReps[i] = reps;
    }
    // vec-returning steps pack componentCount values per cell; no supported
    // argument type reads that packing back, so only results may consume them
    for (let i = 0; i < plan.steps.length; i++) {
      const bindings = plan.steps[i].argBindings;
      for (let j = 0; j < bindings.length; j++) {
        const binding = bindings[j];
        if (binding.source === 'step' && stepPrograms[binding.step].kernel.componentCount !== 1) {
          throw new FusionFallback(`a step returning ${ stepPrograms[binding.step].kernel.returnType } cannot feed another step in the fused executor`);
        }
      }
    }

    const align16 = value => Math.ceil(value / 16) * 16;
    let offset = 0;
    const alloc = bytes => {
      const at = offset;
      offset = align16(offset + bytes);
      return at;
    };
    const argArrayRegions = new Map();
    const argScalarSlots = new Map();
    const literalArrayRegions = new Map();
    const uploadArrays = [];
    const uploadScalars = [];
    const bufferPatches = [];
    const stepLayouts = new Array(plan.steps.length);
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const program = stepPrograms[i];
      const local = program.kernel.computeLayout(stepReps[i]);
      const arrays = {};
      for (const name in local.arrays) {
        const record = local.arrays[name];
        const binding = step.argBindings[record.index];
        const relocated = { index: record.index, offset: 0, dims: record.dims, flatLength: record.flatLength };
        if (binding.source === 'pipelineArg') {
          let region = argArrayRegions.get(binding.index);
          if (!region) {
            region = { offset: alloc(record.flatLength * 4), dims: record.dims, flatLength: record.flatLength };
            argArrayRegions.set(binding.index, region);
          }
          relocated.offset = region.offset;
        } else if (binding.source === 'literal') {
          let region = literalArrayRegions.get(binding.value);
          if (!region) {
            region = { offset: alloc(record.flatLength * 4) };
            literalArrayRegions.set(binding.value, region);
            uploadArrays.push({ offset: region.offset, flatLength: record.flatLength, value: binding.value });
          }
          relocated.offset = region.offset;
        } else {
          // buffer regions size after every program is known; patched below
          bufferPatches.push({ record: relocated, buffer: plan.steps[binding.step].outputBuffer });
        }
        arrays[name] = relocated;
      }
      const scalars = {};
      for (const name in local.scalars) {
        const record = local.scalars[name];
        const binding = step.argBindings[record.index];
        if (binding.source === 'pipelineArg') {
          const key = binding.index + ':' + record.type;
          let slot = argScalarSlots.get(key);
          if (!slot) {
            slot = { index: binding.index, offset: alloc(4), type: record.type };
            argScalarSlots.set(key, slot);
          }
          scalars[name] = { index: record.index, offset: slot.offset, type: record.type };
        } else if (binding.source === 'literal') {
          const slotOffset = alloc(4);
          uploadScalars.push({ offset: slotOffset, type: record.type, value: binding.value });
          scalars[name] = { index: record.index, offset: slotOffset, type: record.type };
        } else {
          // unreachable by construction: step-output reps are Inputs, so
          // inference can never type this position scalar
          throw new FusionFallback('a step output cannot bind to a scalar argument');
        }
      }
      if (!program.constantRegions) {
        const regions = {};
        for (const name in local.constantArrays) {
          const record = local.constantArrays[name];
          regions[name] = { offset: alloc(record.flatLength * 4), dims: record.dims, flatLength: record.flatLength };
          const value = program.kernel.constants[name];
          uploadArrays.push({ offset: regions[name].offset, flatLength: record.flatLength, value });
        }
        program.constantRegions = regions;
      }
      stepLayouts[i] = { arrays, scalars };
    }
    const bufferComponents = new Array(plan.buffers.length).fill(1);
    for (let i = 0; i < plan.steps.length; i++) {
      const b = plan.steps[i].outputBuffer;
      bufferComponents[b] = Math.max(bufferComponents[b], stepPrograms[i].kernel.componentCount);
    }
    const bufferRegions = new Array(plan.buffers.length);
    for (let b = 0; b < plan.buffers.length; b++) {
      const dims = plan.buffers[b].output;
      let cells = 1;
      for (let d = 0; d < dims.length; d++) cells *= dims[d];
      bufferRegions[b] = { offset: alloc(cells * bufferComponents[b] * 4), cells };
    }
    for (let i = 0; i < bufferPatches.length; i++) {
      bufferPatches[i].record.offset = bufferRegions[bufferPatches[i].buffer].offset;
    }
    const totalBytes = offset;

    // one module per distinct (program, offset assignment): the ping-pong
    // loop lands on two instances however many steps it unrolled to
    const moduleCache = new Map();
    const stepRuns = new Array(plan.steps.length);
    for (let i = 0; i < plan.steps.length; i++) {
      const program = stepPrograms[i];
      const kernel = program.kernel;
      const stepLayout = stepLayouts[i];
      const outputOffset = bufferRegions[plan.steps[i].outputBuffer].offset;
      const offsets = [];
      for (const name of kernel.argumentNames) {
        const record = stepLayout.arrays[name] || stepLayout.scalars[name];
        offsets.push(record ? record.offset : -1);
      }
      const moduleKey = `${ program.id }:${ offsets.join(',') }>${ outputOffset }`;
      let compiled = moduleCache.get(moduleKey);
      if (!compiled) {
        const layout = {
          arrays: stepLayout.arrays,
          scalars: stepLayout.scalars,
          constantArrays: program.constantRegions,
          outputOffset,
          totalBytes,
        };
        const cells = bufferRegions[plan.steps[i].outputBuffer].cells;
        const assembled = kernel._assembleModule(layout, cells, false);
        if (this.memory === null) {
          this.memory = new WebAssembly.Memory({ initial: assembled.initial, maximum: assembled.maximum });
          this.f32 = new Float32Array(this.memory.buffer);
          this.i32 = new Int32Array(this.memory.buffer);
        }
        const imports = { env: { memory: this.memory } };
        for (const name of kernel.usedMathImports) {
          imports.env['math_' + name] = Math[name];
        }
        const instance = new WebAssembly.Instance(new WebAssembly.Module(assembled.bytes), imports);
        compiled = {
          run: instance.exports.run,
          runSimd: instance.exports.run_simd || null,
        };
        moduleCache.set(moduleKey, compiled);
      }
      stepRuns[i] = {
        run: compiled.run,
        runSimd: compiled.runSimd,
        cells: bufferRegions[plan.steps[i].outputBuffer].cells,
        sizeX: kernel.threadDim[0],
        usesRandom: kernel.usesRandom,
        randomSeed: kernel.randomSeed,
      };
    }
    for (let i = 0; i < uploadArrays.length; i++) {
      const upload = uploadArrays[i];
      utils.flattenTo(
        upload.value instanceof Input ? upload.value.value : upload.value,
        this.f32.subarray(upload.offset / 4, upload.offset / 4 + upload.flatLength)
      );
    }
    for (let i = 0; i < uploadScalars.length; i++) {
      this._writeScalar(uploadScalars[i], uploadScalars[i].value);
    }
    this._resultReads = plan.results.entries.map(entry => {
      const binding = entry.binding;
      if (binding.source === 'step') {
        const stepIndex = binding.step;
        const region = bufferRegions[plan.steps[stepIndex].outputBuffer];
        const kernel = stepPrograms[stepIndex].kernel;
        return {
          kind: 'step',
          base: region.offset / 4,
          count: region.cells * kernel.componentCount,
          output: plan.steps[stepIndex].output,
          componentCount: kernel.componentCount,
          kernel,
        };
      }
      if (binding.source === 'pipelineArg') {
        return { kind: 'arg', index: binding.index };
      }
      return { kind: 'literal', value: binding.value };
    });
    this._stepRuns = stepRuns;
    this._argArrayRegions = argArrayRegions;
    this._argScalarSlots = argScalarSlots;
    this._scratch = null;
  }

  /**
   * Stand-ins with the exact types and dims each binding will have at run
   * time, for setupArguments/computeLayout: sampled values stand for
   * themselves, a step output becomes an Input over its producer's dims.
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
   * The analysis half of WebAssemblyKernel.build() without instantiation:
   * modules are assembled against the shared layout instead. Inference is
   * reset first — on a fused recompile the same kernel must re-infer for the
   * new signature, not keep the old one.
   */
  _prepareKernel(kernel, reps) {
    kernel.argumentTypes = null;
    kernel.setupConstants();
    kernel.setupArguments(reps);
    for (let i = 0; i < kernel.argumentTypes.length; i++) {
      if (SUPPORTED_VALUE_TYPES.indexOf(kernel.argumentTypes[i]) === -1) {
        throw new FusionFallback(`argument "${ kernel.argumentNames[i] }" of type ${ kernel.argumentTypes[i] } is not supported on the webasm backend`);
      }
    }
    for (const name in kernel.constantTypes) {
      if (SUPPORTED_VALUE_TYPES.indexOf(kernel.constantTypes[name]) === -1) {
        throw new FusionFallback(`constant "${ name }" of type ${ kernel.constantTypes[name] } is not supported on the webasm backend`);
      }
    }
    kernel.validateSettings(reps);
    const threadDim = kernel.threadDim = Array.from(kernel.output);
    while (threadDim.length < 3) {
      threadDim.push(1);
    }
    if (!kernel.translateSource()) {
      throw new FusionFallback(`return type ${ kernel.returnType } is not supported on the webasm backend`);
    }
  }

  /**
   * The layout baked argument sizes and scalar types; a call that drifts
   * from them throws recompilable so the pipeline compiles a fresh fused
   * plan for the new signature, the way the kernel itself re-instantiates
   * per size signature.
   */
  _checkArguments(args) {
    for (const [index, region] of this._argArrayRegions) {
      const value = args[index];
      if (!value || typeof value !== 'object') {
        throw new FusionFallback(`pipeline argument ${ index } is no longer an array`, true);
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
  }

  _writeScalar(slot, value) {
    if (slot.type === 'Integer') {
      this.i32[slot.offset / 4] = value | 0;
    } else if (slot.type === 'Boolean') {
      this.i32[slot.offset / 4] = value ? 1 : 0;
    } else {
      this.f32[slot.offset / 4] = value;
    }
  }

  /**
   * @param {Array} args - sampled pipeline arguments
   * @returns {*} results shaped per the plan; synchronous — the pipeline's
   * tail promise provides the async contract
   */
  execute(args) {
    if (this.destroyed) {
      throw new Error('pipeline fused executor has been destroyed');
    }
    this._checkArguments(args);
    const f32 = this.f32;
    for (const [index, region] of this._argArrayRegions) {
      const value = args[index];
      utils.flattenTo(
        value instanceof Input ? value.value : value,
        f32.subarray(region.offset / 4, region.offset / 4 + region.flatLength)
      );
    }
    for (const slot of this._argScalarSlots.values()) {
      this._writeScalar(slot, args[slot.index]);
    }
    const stepRuns = this._stepRuns;
    for (let i = 0; i < stepRuns.length; i++) {
      const stepRun = stepRuns[i];
      let seed = 0;
      if (stepRun.usesRandom) {
        seed = stepRun.randomSeed !== null ?
          (stepRun.randomSeed >>> 0) :
          ((Math.random() * 0x100000000) >>> 0);
      }
      WebAssemblyKernel.dispatchSpans(stepRun.run, stepRun.runSimd, stepRun.cells, stepRun.sizeX, seed | 0);
    }
    // the one readback: slice copies results out of wasm memory only here
    const results = this.plan.results;
    const values = new Array(this._resultReads.length);
    for (let i = 0; i < this._resultReads.length; i++) {
      const read = this._resultReads[i];
      if (read.kind === 'step') {
        const data = f32.slice(read.base, read.base + read.count);
        values[i] = read.kernel._shapeOutput(data, read.output, read.componentCount);
      } else if (read.kind === 'arg') {
        values[i] = args[read.index];
      } else {
        values[i] = read.value;
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
    this._stepRuns = null;
    this._resultReads = null;
    this._argArrayRegions = null;
    this._argScalarSlots = null;
    this.memory = null;
    this.f32 = null;
    this.i32 = null;
  }
}

module.exports = {
  WebAssemblyPipelineExecutor,
  FusionFallback,
};