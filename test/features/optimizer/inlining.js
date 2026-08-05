const { assert, skip, test, module: describe } = require('qunit');
const { GPU, FunctionBuilder, FunctionNode } = require('../../../src');

describe('features: optimizer inlining');

// T2's emission tests, both directions. Parity proves inlining changes no
// answer; these prove it changes the emitted program, and that every shape the
// plan refuses to inline emits EXACTLY what the un-optimized build emits --
// character for character, so a "bail" that quietly rewrote something still
// fails here.

const GL_MODE = GPU.isHeadlessGLSupported ? 'headlessgl' : (GPU.isWebGLSupported ? 'webgl' : null);

// the unroller is off throughout: an inlined body full of tiny loops is T3's
// subject, and with it on this file would be asserting T3's behavior under
// T2's name
const T2_ONLY = { output: [4], loopUnrollLimit: 0 };

function build(mode, kernelSource, settings, args, extra) {
  const gpu = new GPU({ mode });
  try {
    const kernel = gpu.createKernel(kernelSource,
      Object.assign({}, T2_ONLY, settings, extra || {}));
    kernel.apply(null, args || [[1, 2, 3, 4]]);
    const inner = kernel.kernel;
    return {
      source: mode === 'cpu' ? inner.kernelString : inner.translatedSource,
      optimized: !inner._optimizerDisabled,
      reason: inner.fallbackReason,
    };
  } finally {
    gpu.destroy();
  }
}

// cpu ships with T2 off (V8 inlines small helpers better than we do), but
// the inliner's MECHANICS -- parameter binding, renaming, early-return
// folding, evaluation order -- are backend-independent and far easiest to
// read in emitted JavaScript, so these rows opt back in
function cpuSource(kernelSource, settings, args) {
  return build('cpu', kernelSource, Object.assign({ _inliningDisabled: false }, settings), args).source;
}

/**
 * A shape T2 must leave alone emits the same text either way. The optimized
 * build is also asserted to have STAYED optimized: a build-time throw degrades
 * to the un-optimized text (#868), which would otherwise read as a clean skip.
 */
function assertUntouched(mode, label, kernelSource, settings, args) {
  const optimized = build(mode, kernelSource, settings, args);
  // compared against inlining OFF rather than the whole pass off: these
  // kernels have reads for H to hoist too, and only T2's share is on trial
  const disabled = build(mode, kernelSource, settings, args, { _inliningDisabled: true });
  assert.ok(optimized.optimized, `${ label }: the build stayed optimized (${ optimized.reason || 'no fallback' })`);
  assert.equal(optimized.source, disabled.source, `${ label }: emission is untouched`);
}

function poly(x) {
  return x * x * 0.5 + x * 0.25 - 0.125;
}

function scale(x, by) {
  return poly(x) * by;
}

function outer(x) {
  return scale(x, 2) + 1;
}

// --------------------------------------------------------------- it inlines

test('cpu: the helper definition and its call site both go', () => {
  const source = cpuSource(function (a) {
    return poly(a[this.thread.x]);
  }, { functions: [poly] });
  assert.notOk(/function poly\(/.test(source), 'no definition emitted');
  assert.notOk(/[^_]poly\(/.test(source), 'no call site emitted');
  assert.ok(/user_optIn0_x/.test(source), 'the parameter became a binding');
});

test('cpu: a chain three deep expands to arithmetic', () => {
  const source = cpuSource(function (a) {
    return outer(a[this.thread.x]);
  }, { functions: [poly, scale, outer] });
  for (const name of ['poly', 'scale', 'outer']) {
    assert.notOk(new RegExp(`function ${ name }\\(`).test(source), `${ name } definition gone`);
  }
  assert.ok(/\*2\)\+1\)/.test(source.replace(/\s/g, '')),
    'the outermost helper\'s arithmetic is inline');
});

test('cpu: an argument evaluated once, in source order, per parameter', () => {
  const source = cpuSource(function (a) {
    return twoArg(a[this.thread.x] + 1, a[this.thread.x] + 2);
  }, {
    functions: [function twoArg(p, q) {
      return p * q + p * 2 + q * 3;
    }],
  });
  const bindings = source.match(/const user_optIn\d+_[pq]=/g) || [];
  assert.equal(bindings.length, 2, 'one binding per parameter');
  assert.ok(source.indexOf('_p=') < source.indexOf('_q='), 'bound in source order');
  assert.equal((source.match(/\+1\)/g) || []).length, 1, 'the first argument is evaluated once');
});

test('cpu: an atom argument is written in place rather than bound', () => {
  const source = cpuSource(function (a) {
    return poly(a[this.thread.x]) + shift(this.thread.x);
  }, {
    functions: [poly, function shift(k) {
      return k * 2 + k * 3;
    }],
  });
  assert.notOk(/optIn\d+_k/.test(source), 'no binding for a coordinate argument');
  assert.ok(/\((?:x|_this\.thread\.x)\*2\)\+\((?:x|_this\.thread\.x)\*3\)/.test(source.replace(/\s/g, '')), 'the coordinate is read in place');
});

test('cpu: a helper local is renamed out of the way of a kernel local', () => {
  const source = cpuSource(function (a) {
    const t = a[this.thread.x];
    return shadowy(t) + t;
  }, {
    functions: [function shadowy(v) {
      const t = v * 3;
      return t * t;
    }],
  });
  assert.ok(/const user_optIn\d+_t=/.test(source), 'the helper local took a fresh name');
  assert.ok(/constuser_t=user_a\[(?:x|_this\.thread\.x)\]/.test(source.replace(/\s/g, '')), "the kernel's own `t` kept its name");
});

test('cpu: a reassigned parameter binds mutably', () => {
  const source = cpuSource(function (a) {
    return bump(a[this.thread.x]);
  }, {
    functions: [function bump(v) {
      v = v + 1;
      return v * v;
    }],
  });
  assert.ok(/let user_optIn\d+_v=/.test(source), 'bound with let, not const');
  assert.notOk(/const user_optIn\d+_v=/.test(source), 'and not both');
});

test('cpu: an early return folds to a conditional, not a call', () => {
  const source = cpuSource(function (a) {
    return clampish(a[this.thread.x]);
  }, {
    functions: [function clampish(v) {
      if (v < 0) return 0;
      return v * 2;
    }],
  });
  assert.notOk(/function clampish/.test(source), 'the helper is gone');
  assert.ok(/\?0:/.test(source.replace(/\s/g, '')), 'the early return became a conditional');
});

test('cpu: a void helper leaves its statements and no call', () => {
  const source = cpuSource(function (a) {
    record(a[this.thread.x]);
    return a[this.thread.x] * 2;
  }, {
    functions: [function record(v) {
      const unused = v * 2;
    }],
  });
  assert.notOk(/function record/.test(source), 'the helper is gone');
  assert.ok(/const user_optIn\d+_unused=/.test(source), 'its statements stayed');
});

(GL_MODE ? test : skip)('gl: the helper definition and its call site both go', () => {
  const source = build(GL_MODE, function (a) {
    return poly(a[this.thread.x]);
  }, { functions: [poly] }).source;
  assert.notOk(/float poly\(/.test(source), 'no GLSL definition emitted');
  assert.notOk(/[^_a-zA-Z]poly\(/.test(source), 'no call site emitted');
});

test('webasm: an array argument to a helper compiles once it is inlined', () => {
  if (!GPU.isWebAssemblySupported) {
    assert.ok(true, 'webasm unsupported here');
    return;
  }
  // the backend rejects array parameters outright; inlining leaves no
  // parameter to reject, which is a shape T2 makes buildable rather than
  // merely faster
  const source = function (a) {
    return element(a, this.thread.x) * 2;
  };
  const settings = {
    output: [4],
    functions: [function element(m, k) {
      return m[k];
    }],
  };
  const gpu = new GPU({ mode: 'webasm' });
  try {
    const optimized = gpu.createKernel(source, settings);
    assert.deepEqual(Array.from(optimized([1, 2, 3, 4])), [2, 4, 6, 8], 'the optimized build runs');
    assert.throws(() => {
      gpu.createKernel(source, Object.assign({ _optimizerDisabled: true }, settings))([1, 2, 3, 4]);
    }, /array arguments to helper functions/, 'the un-optimized build still cannot');
  } finally {
    gpu.destroy();
  }
});

// ---------------------------------------------------------------- it bails

test('cpu bail: a call in a conditional operand', () => {
  assertUntouched('cpu', 'ternary branch', function (a) {
    return this.thread.x > 1 ? poly(a[this.thread.x]) : 0;
  }, { functions: [poly] });
});

test('cpu bail: a call in a loop test', () => {
  assertUntouched('cpu', 'loop test', function (a) {
    let s = 0;
    for (let i = 0; i < poly(a[0]) + 4; i++) s += a[this.thread.x];
    return s;
  }, { functions: [poly] });
});

test('cpu bail: a call after an update in the same statement', () => {
  assertUntouched('cpu', 'update before the call', function (a) {
    let k = 0;
    let s = 0;
    s += a[k++] + poly(a[this.thread.x]);
    return s;
  }, { functions: [poly] });
});

test('cpu bail: a call after Math.random in the same statement', () => {
  assertUntouched('cpu', 'draw before the call', function (a) {
    return Math.random() * 0 + poly(a[this.thread.x]);
  }, { functions: [poly] });
});

test('cpu bail: an unhoistable site blocks its helper everywhere', () => {
  // the first call is in a perfectly hoistable position; the second is not.
  // Inlining only the first would leave the helper emitted with one call site
  // fewer, and gpu.js fixes a helper's parameter types from whichever site the
  // emitter reaches first -- so a partial inline can change what the SURVIVING
  // call coerces its argument to.
  assertUntouched('cpu', 'one clean site, one dirty', function (a) {
    let k = 0;
    const safe = poly(a[this.thread.x]);
    const dirty = a[k++] * poly(a[0]);
    return safe + dirty + k;
  }, { functions: [poly] });
});

test('cpu bail: an early return whose branches draw', () => {
  // folding this to a conditional is safe where `?:` is lazy, but WGSL's
  // `select` evaluates both operands, so the untaken branch would advance that
  // invocation's PCG stream
  assertUntouched('cpu', 'draw in a folded branch', function (a) {
    return maybeDraw(a[this.thread.x]);
  }, {
    randomSeed: 5,
    functions: [function maybeDraw(v) {
      if (v < 0) return Math.random();
      return v * 2;
    }],
  });
});

test('cpu bail: one blocked site blocks the helper everywhere', () => {
  // the helper still gets emitted, so its parameter types are still fixed by
  // whichever call site the emitter reaches first -- which is only the same
  // decision the un-optimized build makes if NO site was removed
  assertUntouched('cpu', 'mixed sites', function (a) {
    const safe = poly(a[this.thread.x]);
    return this.thread.x > 1 ? poly(a[0]) : safe;
  }, { functions: [poly] });
});

test('cpu bail: an early return this pass cannot fold', () => {
  assertUntouched('cpu', 'return inside a loop', function (a) {
    return search(a, this.thread.x);
  }, {
    functions: [function search(m, k) {
      for (let i = 0; i < 4; i++) {
        if (m[i] > k) return i;
      }
      return -1;
    }],
  }, [[1, 2, 3, 4]]);
});

test('cpu bail: a helper that declares a function keeps its call', () => {
  // cloning a nested declaration would register the same helper twice -- the
  // builder keys them by AST identity -- so `wrapper` stays a function. The
  // function it declares is its own plan entry and still inlines INTO it.
  const source = cpuSource(function (a) {
    return wrapper(a[this.thread.x]);
  }, {
    functions: [function wrapper(v) {
      function twice(w) {
        return w * 2;
      }
      return twice(v) + 1;
    }],
  });
  assert.ok(/function wrapper\(/.test(source), 'the declaring helper survives');
  assert.ok(/wrapper\(user_a\[(?:x|_this\.thread\.x)\]\)/.test(source.replace(/\s/g, '')), 'and is still called');
  assert.notOk(/twice\(/.test(source), 'the function it declares inlined into it');
});

test('cpu bail: a native function of the same name wins', () => {
  // natives deliberately override a JavaScript function of the same name at
  // emission, so the body registered under that name is not what runs
  const gl = GL_MODE;
  if (!gl) {
    assert.ok(true, 'no GL backend here');
    return;
  }
  assertUntouched(gl, 'native override', function (a) {
    return divide(a[this.thread.x], 2);
  }, {
    functions: [function divide(p, q) {
      return p / q;
    }],
    nativeFunctions: [{
      name: 'divide',
      source: 'float divide(float a, float b) {\n  return a + b;\n}',
    }],
  });
});

test('cpu bail: a sub-kernel is never a callee', () => {
  const gpu = new GPU({ mode: 'cpu' });
  try {
    const kernel = gpu.createKernelMap({
      doubled: function doubled(v) {
        return v * 2;
      },
    }, function (a) {
      const v = poly(a[this.thread.x]);
      doubled(v);
      return v;
    }, { output: [4], functions: [poly], _inliningDisabled: false });
    kernel([1, 2, 3, 4]);
    const source = kernel.kernel.kernelString;
    assert.notOk(/function poly\(/.test(source), 'the helper inlined');
    assert.ok(/function doubled\(/.test(source), 'the sub-kernel did not');
  } finally {
    gpu.destroy();
  }
});

(GL_MODE ? test : skip)('gl: the division helper is skipped only where it provably does nothing', () => {
  // `divWithIntCheck` recovers an exact quotient when BOTH operands are whole
  // numbers, and returns `x / y` otherwise. A fractional literal settles that
  // statically -- and only statically: the value is the same either way on
  // hardware whose integer divide is already accurate, which is every device
  // this suite can reach, so emission is the only place the difference shows.
  const source = build(GL_MODE, function (a) {
    return a[this.thread.x] / 2 + a[this.thread.x] / 2.5;
  }, { fixIntegerDivisionAccuracy: true }).source;
  assert.ok(/divWithIntCheck\(/.test(source), 'a whole-number divisor keeps the check');
  assert.equal((source.match(/divWithIntCheck\(/g) || []).length, 1,
    'the fractional divisor does not');
  const off = build(GL_MODE, function (a) {
    return a[this.thread.x] / 2 + a[this.thread.x] / 2.5;
  }, { fixIntegerDivisionAccuracy: false }).source;
  assert.notOk(/divWithIntCheck\(/.test(off), 'and nothing is wrapped with the fix off');
});

test('the internal switch turns only inlining off', () => {
  const source = cpuSource(function (a) {
    let s = 0;
    for (let i = 0; i < 4; i++) s += poly(a[this.thread.x]);
    return s;
  }, { functions: [poly], _inliningDisabled: true });
  assert.ok(/function poly\(/.test(source), 'the helper survives');
  assert.ok(/const user_optHoist0=/.test(source), 'and hoisting still ran');
});

// ------------------------------------------------------------- the plan

// The call graph's verdicts, asked directly. Recursion is the reason: gpu.js
// cannot emit a recursive helper at all, so there is no kernel whose emission
// could show that T2 declined to inline one -- the only way to assert the
// skip is to ask the plan.

function planFor(sources) {
  const functionMap = {};
  for (const source of sources) {
    const node = {
      name: source.slice(9, source.indexOf('(')).trim(),
      isRootKernel: false,
      isSubKernel: false,
      source,
      _rawAST: null,
      getRawAST: FunctionNode.prototype.getRawAST,
      requiresSequenceFreeForInit: false,
    };
    functionMap[node.name] = node;
  }
  functionMap.kernel.isRootKernel = true;
  const builder = Object.assign(Object.create(FunctionBuilder.prototype), {
    functionMap,
    nativeFunctionNames: [],
    kernel: { constants: null },
    _inlinePlan: null,
  });
  return {
    has: name => Boolean(builder.lookupInlineTarget(name)),
  };
}

test('plan: a self-recursive helper is never inlined', () => {
  const plan = planFor([
    'function kernel(a) { return fact(3) + a[0]; }',
    'function fact(n) { if (n <= 1) return 1; return n * fact(n - 1); }',
  ]);
  assert.notOk(plan.has('fact'), 'fact is left as a call');
});

test('plan: a mutually recursive pair is never inlined', () => {
  const plan = planFor([
    'function kernel(a) { return ping(a[0]); }',
    'function ping(v) { return pong(v) + 1; }',
    'function pong(v) { return ping(v) * 2; }',
  ]);
  assert.notOk(plan.has('ping'), 'ping is left as a call');
  assert.notOk(plan.has('pong'), 'pong is left as a call');
});

test('plan: an ordinary chain is inlinable at every level', () => {
  const plan = planFor([
    'function kernel(a) { return one(a[0]); }',
    'function one(v) { return two(v) + 1; }',
    'function two(v) { return v * 2; }',
  ]);
  assert.ok(plan.has('one') && plan.has('two'), 'both levels inline');
  assert.notOk(plan.has('kernel'), 'the root is never a callee');
});

test('plan: a helper referencing an identifier it does not declare is not inlined', () => {
  // inlining it would bind `stray` to whatever the caller happens to have
  // named that -- capture, not inlining
  const plan = planFor([
    'function kernel(a) { return leaky(a[0]); }',
    'function leaky(v) { return v + stray; }',
  ]);
  assert.notOk(plan.has('leaky'), 'the free identifier stops it');
});

test('plan: the size budget sheds the largest helper first', () => {
  const big = `function big(v) { return ${ new Array(400).fill('v').join(' + ') }; }`;
  // separate statements: a call this pass will not inline is opaque, so a
  // second call in the SAME statement cannot be hoisted past it either
  const plan = planFor([
    'function kernel(a) { const p = big(a[0]); const q = small(a[1]); return p + q; }',
    big,
    'function small(v) { return v * 2; }',
  ]);
  assert.notOk(plan.has('big'), 'the oversized helper keeps its call');
  assert.ok(plan.has('small'), 'the small one still inlines');
});
