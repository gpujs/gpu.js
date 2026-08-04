# Compiler optimizations — design contract

Approved. Every decision below is settled; agents build to this, and any
deviation needs a named reason in the final report.

## Scope

Every tier that EMITS code gets every transform APPLICABLE to it. `dev` is
untouched — it executes the user's actual function through gpu-mock, so there
is no emission to optimize.

| transform | cpu | webasm | webgl/webgl2/headlessgl | webgpu |
|---|---|---|---|---|
| **H** loop-invariant hoisting of pure reads | yes | yes | yes | yes |
| **T1** thread/coordinate localization | yes | n/a | n/a | n/a |
| **T2** helper inlining (internal + user) | yes | yes | yes | yes |
| **T3** tiny literal-loop unrolling | yes | yes | yes | yes |

T1 is the only exclusion and it is a fact, not a judgment: wasm keeps thread
ids in mutable globals, GLSL/WGSL in locals/builtins. There is nothing to
localize. On cpu they are properties of a shared mutable object (`_this.thread.x`
per access) and become loop locals.

Measured on a desktop (1M cells, median of 7, identical math both sides;
`scratchpad/xform-value.mjs`):

| transform | cpu | webasm | GL (headless-gl, desktop) |
|---|---|---|---|
| T2 helper in hot loop -> inlined | 1.05x | **2.76x** | 1.17x |
| T3 literal 4-trip loop -> unrolled | **3.27x** | 1.88x | 1.02x |

webasm's T2 number is not call overhead: the SIMD emitter lane-scalarizes
helper calls (thread state and PCG state swap per lane around the call), so a
helper in a hot loop turns a vectorized kernel into four scalar calls per quad.
Inlining RESTORES vectorization. The GL numbers are one desktop driver and do
not generalize — mobile shader compilers are much weaker, which is what the
BrowserStack fleet is for.

## Architecture

`src/backend/optimizer.js` — a backend-agnostic AST pass at the FunctionBuilder
stage, consumed by every function-node subclass.

ORDERING IS LOAD-BEARING:

1. De-minification (existing, base FunctionNode) runs FIRST — the optimizer
   must never see comma-folded expressions or statement-position sequences.
2. Optimizer: **H -> T2 -> T3** (T3 after T2 so inlined loops qualify; H before
   both so hoisted temps are visible to them).
3. GL's `normalizeBlock` / loop normalization / do-while rotation runs LAST —
   unrolling may delete loops it would otherwise rewrite, and the #300 hoisting
   machinery must see final shapes.
4. On webasm the optimizer runs BEFORE variance analysis and SIMD emission —
   that is the entire point, so inlined helper bodies vectorize instead of
   forcing lane-scalarized calls.

## Correctness invariants

- **Bit-identical to `_optimizerDisabled` output, per backend, on that
  backend's own arithmetic** (cpu f64, webasm/GL/WGSL f32). NOT cross-backend;
  those differ by design.
- **Seeded `Math.random` streams preserved exactly.** Sharpest edge: webasm's
  per-cell and per-lane PCG state. A helper that draws random must inline to an
  identical draw sequence. This is a named test case, not an afterthought.
- No FP reassociation. No CSE across float operations.
- **H is restricted to PURE reads** — array element reads whose subscript is
  loop-invariant, and constants. Legal precisely because a kernel cannot write
  its array arguments. A read whose subscript varies, or any expression with a
  call in it, does not hoist.
- Inlined parameters bind as fresh declarations preserving evaluation order
  (one binding per argument, evaluated once, in source order). Helper locals
  rename outside the `user_` namespace (`cellShadow_` precedent).
- **Per-site best effort**: anything unprovable skips THAT SITE, never the
  tier. Un-transformed emission is always valid.

## Control and failure

- `kernel._optimizerDisabled` — internal hook (the `_fusionDisabled`
  precedent). No public setting.
- `loopUnrollLimit` — public setting, default 8, `0` disables T3. A threshold,
  and the knob a user tunes when shader size matters.
- A synchronous BUILD-TIME throw from the optimizer is caught: rebuild with the
  optimizer disabled, warn loudly, set `fallbackReason` (#868 contract).
  Runtime throws are never caught — they are the user's bug or ours, and
  masking them helps nobody.

## Transform detail

**H — loop-invariant hoisting.** Within a loop body, an array read whose object
and subscript are both loop-invariant (no dependence on the induction variable
or on anything assigned in the body) hoists to a fresh const before the loop.
Bails on: any assignment to the array name in scope, subscripts containing
calls, loops whose body assigns the object.

**T1 — coordinate localization (cpu).** `this.thread.x/y/z` reads become the
generated cell loop's own locals. `this.constants.*` and `this.output.*` are
already hoisted; verify and extend where they are not.

**T2 — helper inlining.** Leaf-first over the FunctionBuilder call graph;
recursion bails (leave the call). Statement-position calls inline as blocks;
expression-position calls hoist to temps using the EXISTING linearization
machinery from the de-minification work. Multi-return helpers use the labeled
block + result temp idiom (`kernelBody:` precedent). Internal emitted helpers
(`divWithIntCheck` under `fixIntegerDivisionAccuracy`, and whatever the phase-0
audit finds) inline or specialize the same way. An emitted-size budget guards
against megafunctions (V8 deopt on cpu, shader compile time on mobile GL).

**T3 — tiny-loop unrolling.** Criteria: literal init/test/update, trip count
<= `loopUnrollLimit`, no `break`/`continue`, induction variable never assigned
in the body. Clone the body per iteration substituting the induction variable
as a literal; stamp fresh synthetic positions (`stampSyntheticNodes`
precedent). Unrolled loops shed the LOOP_MAX safe-wrapping entirely.

## Verification bar

- **Parity harness, per backend**: spec shapes x sub-kernels x strictIntegers x
  fixIntegerDivisionAccuracy x seeded random x the #865/#867 control-flow
  shapes, optimized vs `_optimizerDisabled`, compared through Int32 views.
  Zero tolerance. webgpu parity runs in the headed browser.
- **Discriminating emission tests both directions**, mutation-checked with cp
  backups (never `git checkout`): optimized emission contains no helper call
  site and no `for` for a literal 3-trip loop; disabled emission contains both.
- Edge list each transform must pass or provably skip: helper-calls-helper
  depth, parameter reassignment inside a helper, array argument aliasing, name
  shadowing, early returns, recursion, `Math.random` inside a helper, the #865
  argument shadows, `Input` arguments, dynamic output/arguments.
- Full gates: `npm test`, headed browser suite, SwiftShader failure-set diff
  against the 131-entry baseline, and **BrowserStack on real devices** — the
  only honest answer to the mobile-GL question.

## Benchmarks — SELF-CONTAINED

`scripts/benchmark-optimizer.mjs` in the house style
(`scripts/benchmark-webasm.mjs` is the model): optimized vs `_optimizerDisabled`
across cpu / webasm / headlessgl, on workloads that live IN THE SCRIPT —
helper-heavy, tiny-loop-heavy, stencil, and a control with neither. Cross-check
results before timing. Do NOT touch or depend on the gpu.rocks gauntlet; that
suite's maintainer verifies independently.

Phase 1 must also SEPARATE H from T3's measured cpu 3.27x: the hand-unrolled
probe that produced it also hoisted an array read, so the attribution between
the two transforms is still unknown.

## Files

- `src/backend/optimizer.js` — the pass.
- `src/backend/function-node.js` — invocation point + `_optimizerDisabled`.
- per-backend function nodes — ordering hookups only.
- `scripts/benchmark-optimizer.mjs`
- `test/features/optimizer/*.js`
- README section + `src/index.d.ts` (`loopUnrollLimit`).
