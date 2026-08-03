# Pipeline compilation — design contract (v1)

Approved API shape. Every implementation decision below is settled; agents
build to this, deviations require a named reason in the final report.

## API

```js
const sweep = gpu.createKernel(function (u, src) { ... }, { constants: { hi }, output: [1024, 1024] });

const solve = gpu.createPipeline(function (u, q) {
  for (let s = 0; s < this.constants.sweeps; s++) {
    u = sweep(u, q);
  }
  return u;
}, { constants: { sweeps: 512 } });

const result = await solve(u0, q);   // one launch, fences inside, one readback
```

- `gpu.createPipeline(fn, settings?)`; `settings.constants` only in v1.
- The orchestration function runs ONCE, at build time (first call), with
  opaque handles for arguments; kernel calls are recorded; JS loops unroll
  into a static plan. Later calls execute the compiled plan.
- Calling the pipeline ALWAYS returns a Promise (the async contract).
- Return value: a handle, or an Array/plain object of handles — the call
  resolves to the same shape holding plain results.
- Inner kernels do NOT need `pipeline: true`; intermediate residency is the
  pipeline's business. Kernels may be shared between pipelines and direct use.
- `this.constants` inside the orchestration fn are trace-time facts. Changing
  them = `pipeline.setConstants({...})`, which invalidates the plan and
  re-traces on next call (kernels already treat settings this way).

## Trace-time rules (violations throw AT BUILD, naming the violation)

- Reading an element / property of a handle → throw
  ("pipeline intermediate results cannot be read during orchestration").
- Using a handle in arithmetic / conditions (valueOf/Symbol.toPrimitive) → throw.
- `Math.random()` during trace → throw (orchestration must be deterministic).
- Only recorded operations: calling gpu.js kernels created by the same GPU
  instance with handle/plain-JS-value arguments. Calling anything else that
  consumes a handle → throw when the handle escapes detection (best effort:
  handles are frozen class instances; document limits).
- Non-handle arguments (numbers, arrays uploaded per call) are legal kernel
  args inside the plan; arrays passed to the PIPELINE are uploaded once per
  pipeline call; plain values captured during trace are frozen into the plan
  (document this: closure-captured mutables freeze at trace, like constants).

## Plan IR

`{ steps: [ { kernel, argBindings[], outputBuffer } ], buffers: [...], results }`
- argBinding: `{ source: 'pipelineArg', index }` | `{ source: 'step', step }` |
  `{ source: 'literal', value }`.
- Buffer assignment: a step whose kernel instance would overwrite a buffer a
  later (or the same) step still reads gets automatic double-buffering
  (ping-pong). The classic case — `u = sweep(u, q)` in a loop — must compile
  to two alternating buffers with ONE kernel. Liveness is static (plan is a
  DAG after unrolling).

## Execution

- Generic executor (every backend, correctness reference): execute steps
  sequentially through the existing kernel machinery with `pipeline: true`
  forced on inner kernel INSTANCES cloned/configured for pipeline use (do not
  mutate the user's kernel settings observably); final results read back once.
  On GL this is textures end-to-end; on cpu plain arrays; on webgpu buffer
  handles. This executor ships for cpu/webgl/webgl2/headlessgl/webgpu in v1.
- webasm fused executor (the point of the feature): all steps compile over
  ONE wasm memory laid out `[pipeline args | plan buffers]`; passes run
  back-to-back with intermediates never leaving wasm memory (no slice /
  flattenTo between steps). Sync path first. Threaded path: workers execute
  the whole plan with Atomics-based barriers between steps over the shared
  memory (generation counter; no main-thread round trip per pass); falls back
  to sync-fused when threads are unavailable, and to the generic executor for
  anything the webasm backend cannot take (its usual degradation contract,
  with fallbackReason).
- Pipeline call semantics: arguments sampled at call time; concurrent calls
  to the same pipeline serialize on a tail like threaded kernels do.
- `pipeline.destroy()` releases plan buffers/instances; gpu.destroy() reaches
  pipelines like kernels.

- webgpu fused executor ('fused-encoder', added after v1's generic-only
  lowering): every plan step compiles against persistent STORAGE buffers on
  the kernel's device — ping-pong as static alternating bind groups, per-step
  params uniforms created at compile. Per call: pipeline arguments and
  per-call seeds/scalars via queue.writeBuffer, EVERY step recorded as a
  compute pass into ONE command encoder, result buffers copied to MAP_READ
  staging in the same encoder, one queue.submit, one mapAsync readback.
  Math.random keeps the direct-call seeding contract (seed uniform per call).
  Anything unfusable (GPU-resident handle arguments, vec intermediates,
  argument drift the layout cannot absorb) degrades to the generic executor
  with a named fallbackReason.

## v1 exclusions (documented, not silently missing)

- No `this.check` / mid-plan readback (reserved; design in README as future).
- No graphical kernels inside pipelines (throw with message).
- No kernel maps inside pipelines in v1 (throw with message).
- `toString()` deferred.

## Files

- `src/pipeline.js` — tracer, handle, plan IR, generic executor, Pipeline class.
- `src/gpu.js` — `createPipeline` wiring; pipeline registry for destroy.
- `src/backend/web-assembly/pipeline-executor.js` — fused sync + threaded
  barrier lowering (worker-pool changes as needed).
- `src/backend/web-gpu/pipeline-executor.js` — the fused-encoder lowering.
- `test/features/pipeline/*.js` — see testing section.
- README section + `src/index.d.ts` declarations.

## Testing bar

- Trace violations: each banned operation throws at build with its named message.
- Correctness vs plain-JS references on every available backend: jacobi-like
  ping-pong (ONE kernel), multi-kernel chain, multi-output object return,
  literal/closure-captured args, pipeline arg reused by several steps.
- Double-buffering: a 3-step chain where step 3 reads step 1's output (not
  just the previous step) — liveness must keep it alive.
- setConstants re-trace; destroy; concurrent calls; webasm degradation path.
- The discriminating-test discipline: every behavioral test must fail on a
  tree with the feature stubbed out (trivially true) AND the fused executor's
  tests must fail if fusion silently falls back to the generic executor
  (assert on an executor-identity probe, e.g. `pipeline.executorKind`).

## Benchmark acceptance

gauntlet jacobi/heat rewritten via createPipeline must beat their current
per-pass webasm numbers materially (target: ≥1.5× on heat threaded) and match
checksums; numbers reported in the PR.
