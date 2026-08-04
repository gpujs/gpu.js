const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../../src');

describe('features: optimizer unrolling and thread localization');

// Parity proves T3 and T1 change no answer. These prove they change the
// EMISSION -- in both directions, because a transform that quietly does
// nothing also passes every parity row. Each shape is asserted against the
// text the backend actually compiles: the cpu backend's generated JavaScript
// and the GL backends' generated GLSL.

const GL_MODE = GPU.isHeadlessGLSupported ? 'headlessgl' : (GPU.isWebGLSupported ? 'webgl' : null);

/**
 * The emitted source, plus whether the build stayed optimized. A bail row
 * asserts that the optimized text equals the un-optimized text, and a
 * build-time throw degrades to exactly that text (#868) -- so without the
 * second half, a bail that broke badly enough to crash the pass would still
 * read as a clean skip.
 */
function cpuBuild(kernelSource, settings, args) {
  const gpu = new GPU({ mode: 'cpu' });
  try {
    const kernel = gpu.createKernel(kernelSource, Object.assign({ output: [4] }, settings));
    kernel.apply(null, args || [[1, 2, 3, 4]]);
    return { source: kernel.kernel.kernelString, optimized: !kernel.kernel._optimizerDisabled };
  } finally {
    gpu.destroy();
  }
}

function cpuSource(kernelSource, settings, args) {
  return cpuBuild(kernelSource, settings, args).source;
}

function glSource(kernelSource, settings, args) {
  const gpu = new GPU({ mode: GL_MODE });
  try {
    const kernel = gpu.createKernel(kernelSource, Object.assign({ output: [4] }, settings));
    kernel.apply(null, args || [[1, 2, 3, 4]]);
    return kernel.kernel.translatedSource;
  } finally {
    gpu.destroy();
  }
}

// Any loop that is not one of the three the cpu backend generates to sweep
// the cells. Matching the user's loop by its counter instead would miss the
// forms whose header the emitter rewrote -- the LOOP_MAX safe wrapping, a
// `var` counter, an assigned rather than declared one -- which are exactly
// the headers the bails below produce.
const cpuLoop = /for \((?!let [xyz] = 0; [xyz] < output)/g;
const glLoop = /for \(/g;

function count(source, pattern) {
  return (source.match(pattern) || []).length;
}

// ------------------------------------------------------------- T3 unrolling

const THREE_TRIP = function (a) {
  let s = 0;
  for (let i = 0; i < 3; i++) {
    s += a[i] * 2;
  }
  return s;
};

test('cpu: a literal 3-trip loop becomes three copies of its body', () => {
  const optimized = cpuSource(THREE_TRIP);
  const disabled = cpuSource(THREE_TRIP, { _optimizerDisabled: true });

  assert.equal(count(optimized, cpuLoop), 0, 'optimized: no loop is left');
  assert.equal(count(optimized, /user_s\+=/g), 3, 'optimized: the body appears once per iteration');
  assert.notOk(/user_i/.test(optimized), 'optimized: the counter is gone with it');
  assert.ok(/user_a\[0\]/.test(optimized) && /user_a\[1\]/.test(optimized) && /user_a\[2\]/.test(optimized),
    'optimized: each copy reads its own subscript');

  assert.equal(count(disabled, cpuLoop), 1, 'disabled: the loop is still a loop');
  assert.equal(count(disabled, /user_s\+=/g), 1, 'disabled: one copy of the body');
  assert.ok(/user_a\[user_i\]/.test(disabled), 'disabled: the counter is still a variable');
});

(GL_MODE ? test : skip)('gl: a literal 3-trip loop becomes three copies of its body', () => {
  const optimized = glSource(THREE_TRIP);
  const disabled = glSource(THREE_TRIP, { _optimizerDisabled: true });

  assert.equal(count(optimized, glLoop), 0, 'optimized: no loop is left');
  assert.equal(count(optimized, /user_s\+=/g), 3, 'optimized: the body appears once per iteration');
  assert.equal(count(disabled, glLoop), 1, 'disabled: the loop is still a loop');
  assert.equal(count(disabled, /user_s\+=/g), 1, 'disabled: one copy of the body');
});

test('cpu: nested literal loops both go, and multiply out', () => {
  const source = cpuSource(function (a) {
    let s = 0;
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 3; x++) {
        s += a[y][x];
      }
    }
    return s;
  }, {}, [[[1, 2, 3], [4, 5, 6]]]);

  assert.equal(count(source, cpuLoop), 0, 'neither loop is left');
  assert.equal(count(source, /user_s\+=/g), 6, '2 x 3 copies of the body');
  assert.ok(/user_a\[1\]\[2\]/.test(source), 'the last iteration reads a[1][2]');
});

test('cpu: a body local is redeclared per iteration, in its own scope', () => {
  const source = cpuSource(function (a) {
    let s = 0;
    for (let i = 0; i < 3; i++) {
      const v = a[i] * 2;
      s += v;
    }
    return s;
  });
  assert.equal(count(source, cpuLoop), 0, 'the loop is gone');
  assert.equal(count(source, /const user_v=/g), 3, 'one declaration per iteration');
  assert.equal(count(source, /\{\nconst user_v=/g), 3, 'each one opening a block of its own');
});

// The LOOP_MAX cap only wraps a loop the emitter cannot prove canonical. A
// negative literal init is one such loop on GL -- WebGL1's grammar wants a
// plain literal there -- so the stencil shape every kernel of that family
// uses is emitted as a counted loop with a break. Unrolling deletes the whole
// apparatus, which is the part of T3 that costs the most to give up.
const NEGATIVE_INIT = function (a) {
  let s = 0;
  for (let dy = -1; dy <= 1; dy++) {
    s += a[this.thread.x] * dy;
  }
  return s;
};

(GL_MODE ? test : skip)('gl: an unrolled loop sheds the LOOP_MAX safe wrapping', () => {
  const optimized = glSource(NEGATIVE_INIT);
  const disabled = glSource(NEGATIVE_INIT, { _optimizerDisabled: true });

  assert.notOk(/LOOP_MAX/.test(optimized), 'optimized: no iteration cap is emitted');
  assert.notOk(/safeI/.test(optimized), 'optimized: no counter to cap');
  assert.ok(/LOOP_MAX/.test(disabled), 'disabled: the loop is capped');
  assert.ok(/safeI/.test(disabled), 'disabled: with a synthetic counter');
});

// ------------------------------------------------------- the unroll limit

const NINE_TRIP = function (a) {
  let s = 0;
  for (let i = 0; i < 9; i++) {
    s += a[i % 4];
  }
  return s;
};

const EIGHT_TRIP = function (a) {
  let s = 0;
  for (let i = 0; i < 8; i++) {
    s += a[i % 4];
  }
  return s;
};

test('cpu: the limit is inclusive — 8 trips unroll, 9 do not', () => {
  const eight = cpuSource(EIGHT_TRIP);
  const nine = cpuSource(NINE_TRIP);
  assert.equal(count(eight, cpuLoop), 0, 'exactly at the default limit: unrolled');
  assert.equal(count(eight, /user_s\+=/g), 8, 'eight copies');
  assert.equal(count(nine, cpuLoop), 1, 'one past it: left as a loop');
  assert.equal(count(nine, /user_s\+=/g), 1, 'one copy');
});

test('cpu: loopUnrollLimit is the knob', () => {
  const raised = cpuSource(NINE_TRIP, { loopUnrollLimit: 16 });
  assert.equal(count(raised, cpuLoop), 0, 'raised past 9: the same loop unrolls');
  assert.equal(count(raised, /user_s\+=/g), 9, 'nine copies');

  const off = cpuSource(THREE_TRIP, { loopUnrollLimit: 0 });
  assert.equal(count(off, cpuLoop), 1, '0 turns unrolling off');
  assert.equal(count(off, /user_s\+=/g), 1, 'one copy');
});

test('setLoopUnrollLimit reaches the kernel', () => {
  const gpu = new GPU({ mode: 'cpu' });
  try {
    const kernel = gpu.createKernel(THREE_TRIP, { output: [4] });
    kernel.setLoopUnrollLimit(0);
    assert.deepEqual(Array.from(kernel([1, 2, 3, 4])), [12, 12, 12, 12], 'and still computes');
    assert.equal(count(kernel.kernel.kernelString, cpuLoop), 1, 'the loop survived');
  } finally {
    gpu.destroy();
  }
});

// Every bail asserts the strongest thing available: the optimized text is the
// un-optimized text, character for character. None reads `this.thread` and
// every subscript varies with the counter, so neither of the other two
// transforms can fire and a diff here can only be the unroller.
const BAILS = [
  {
    name: 'a break out of the loop',
    kernel: function (a, n) {
      let s = 0;
      for (let i = 0; i < 4; i++) {
        if (i > n) break;
        s += a[i];
      }
      return s;
    },
  },
  {
    name: 'a continue',
    kernel: function (a, n) {
      let s = 0;
      for (let i = 0; i < 4; i++) {
        if (i === n) continue;
        s += a[i];
      }
      return s;
    },
  },
  {
    name: 'a body that assigns the counter',
    kernel: function (a, n) {
      let s = 0;
      for (let i = 0; i < 4; i++) {
        s += a[i];
        i += n;
      }
      return s;
    },
  },
  {
    // the inner block's `i` is a different variable; substituting the
    // counter's value through it would rewrite reads of that one
    name: 'a nested block that shadows the counter',
    kernel: function (a, n) {
      let s = 0;
      for (let i = 0; i < 4; i++) {
        {
          const i = n;
          s += a[i % 4];
        }
      }
      return s;
    },
  },
  {
    // the generator carries state between draws, and the GL lowering of it is
    // chaotic enough that a compiler reassociating one operand by a ULP is a
    // different number
    name: 'a Math.random draw in the body',
    kernel: function (a, n) {
      let s = 0;
      for (let i = 0; i < 3; i++) {
        s += Math.random() * a[i] * n;
      }
      return s;
    },
  },
  {
    name: 'a non-literal bound',
    kernel: function (a, n) {
      let s = 0;
      for (let i = 0; i < n; i++) {
        s += a[i % 4];
      }
      return s;
    },
  },
  {
    name: 'a fractional step',
    kernel: function (a, n) {
      let s = 0;
      for (let t = 0; t < 1; t += 0.25) {
        s += a[Math.round(t * 3)] * n;
      }
      return s;
    },
  },
  {
    name: 'a counter assigned rather than declared in the header',
    kernel: 'function(a, n){let s=0;let i=0;for(i=0;i<4;i++){s+=a[i];}return s+i+n;}',
  },
  {
    name: 'a function-scoped counter read after the loop',
    kernel: 'function(a, n){var s=0;var i=0;for(var i=0;i<4;i++){s+=a[i];}return s+i+n;}',
  },
];

for (let b = 0; b < BAILS.length; b++) {
  const bail = BAILS[b];
  test(`cpu bail: ${ bail.name }`, () => {
    const args = [[1, 2, 3, 4], 2];
    const built = cpuBuild(bail.kernel, { loopMaxIterations: 20 }, args);
    const disabled = cpuSource(bail.kernel, { loopMaxIterations: 20, _optimizerDisabled: true }, args);
    assert.ok(built.optimized, `${ bail.name }: the optimized build stayed optimized`);
    assert.equal(count(built.source, cpuLoop), 1, `${ bail.name }: the loop survived`);
    assert.equal(built.source, disabled, `${ bail.name }: emission is unchanged`);
  });
}

// A name shadowed by an inner scope is the case substitution would get wrong,
// and the two halves of it come out differently -- deliberately. The pass
// unrolls innermost-first, so by the time the outer loop is considered an
// inner loop that unrolled has taken its own counter with it and there is
// nothing left to shadow. One that did NOT unroll still declares the name,
// and the outer loop skips.
test('cpu: an unrollable inner loop takes the shadowing with it', () => {
  const source = cpuSource(function (a, n) {
    let s = 0;
    for (let i = 0; i < 3; i++) {
      for (let i = 0; i < 2; i++) {
        s += a[i] * n;
      }
    }
    return s;
  }, {}, [[1, 2, 3, 4], 2]);
  assert.equal(count(source, cpuLoop), 0, 'both loops unroll');
  assert.equal(count(source, /user_a\[0\]/g), 3, 'the inner counter kept its own values');
  assert.equal(count(source, /user_a\[1\]/g), 3, 'both of them, three times over');
  assert.notOk(/user_a\[2\]/.test(source), 'and never took the outer loop\'s');
});

test('cpu bail: an inner loop that keeps the shadowing counter', () => {
  const kernel = function (a, n) {
    let s = 0;
    for (let i = 0; i < 3; i++) {
      for (let i = 0; i < n; i++) {
        s += a[i % 4];
      }
    }
    return s;
  };
  const built = cpuBuild(kernel, { loopMaxIterations: 20 }, [[1, 2, 3, 4], 2]);
  const disabled = cpuSource(kernel, { loopMaxIterations: 20, _optimizerDisabled: true }, [[1, 2, 3, 4], 2]);
  assert.ok(built.optimized, 'the optimized build stayed optimized');
  assert.equal(count(built.source, cpuLoop), 2, 'neither loop unrolls');
  assert.equal(built.source, disabled, 'emission is unchanged');
});

test('cpu: a negative counter substitutes as a signed literal, parenthesized', () => {
  const built = cpuBuild(function (a) {
    let s = 0;
    for (let i = -2; i < 2; i++) {
      s += a[i + 2] * i + a[1 - i] * 0.5;
    }
    return s;
  });
  assert.ok(built.optimized, 'the optimized build stayed optimized');
  assert.equal(count(built.source, cpuLoop), 0, 'the loop unrolled');
  // `1 - -2` written bare is `1--2`, a decrement
  assert.ok(/user_a\[\(1-\(-2\)\)\]/.test(built.source), 'the sign carries its own parentheses');
  assert.notOk(/--/.test(built.source), 'nothing reads as a decrement');
});

// A counter named for a coordinate is the shape that catches a substitution
// walking into a non-computed member's property: `this.thread.x` names `x`
// there as a FIELD, and rewriting it produces `this.thread.0`.
test('cpu: a counter named x leaves this.thread.x alone', () => {
  const built = cpuBuild(function (a) {
    let s = 0;
    for (let x = 0; x < 3; x++) {
      s += a[x] * this.thread.x;
    }
    return s;
  });
  assert.ok(built.optimized, 'the optimized build stayed optimized');
  assert.equal(count(built.source, cpuLoop), 0, 'the loop unrolled');
  assert.equal(count(built.source, /user_a\[0\]\*x\)/g), 1, 'a[0] times the coordinate');
  assert.equal(count(built.source, /user_a\[2\]\*x\)/g), 1, 'a[2] times the coordinate');
});

// ------------------------------------------------ T1 coordinate localization

const THREAD_READER = function (a) {
  return a[this.thread.x] + this.thread.y + this.thread.z;
};

test('cpu: thread coordinates become the cell loop\'s own locals', () => {
  const optimized = cpuSource(THREAD_READER);
  const disabled = cpuSource(THREAD_READER, { _optimizerDisabled: true });

  assert.notOk(/_this\.thread\./.test(afterCellLoop(optimized)),
    'optimized: no thread property is read in the kernel body');
  assert.ok(/user_a\[x\]/.test(optimized), 'optimized: x is the loop counter');
  assert.ok(/_this\.thread\.x/.test(disabled), 'disabled: the property read stays');
});

// everything before the innermost `this.thread.x = x` is the generated
// preamble, which assigns the thread object and must keep doing so: the
// coordinate is still what `color()` and every helper reads.
function afterCellLoop(source) {
  const at = source.lastIndexOf('this.thread.x = x;');
  return at === -1 ? source : source.slice(at + 'this.thread.x = x;'.length);
}

test('cpu: a rank the output does not have localizes to 0', () => {
  const oneD = cpuSource(THREAD_READER);
  assert.ok(/\+0\)\+0\)/.test(oneD.replace(/\s/g, '')),
    `1D: y and z are literal 0 (${ afterCellLoop(oneD).trim().split('\n')[0] })`);

  const threeD = cpuSource(THREAD_READER, { output: [2, 2, 2] }, [[1, 2]]);
  const body = afterCellLoop(threeD);
  assert.ok(/user_a\[x\]/.test(body), '3D: x is a counter');
  assert.ok(/\+y\)/.test(body.replace(/\s/g, '')), '3D: so is y');
  assert.ok(/\+z\)/.test(body.replace(/\s/g, '')), '3D: so is z');
});

test('cpu: a helper keeps the property read, which is all it can reach', () => {
  // the call sits in a ternary branch, which is the one position T2 will not
  // hoist a call out of -- so the helper survives as a function, which is the
  // only way to ask what a helper's coordinate read emits as
  const source = cpuSource(function (a) {
    return (this.thread.x > 0 ? offset(a) : 0) + this.thread.x;
  }, {
    functions: [function offset(a) {
      return a[this.thread.x] * 2;
    }],
  });
  assert.ok(/function offset\(user_a\) \{\nreturn \(user_a\[_this\.thread\.x\]\*2\)/.test(source),
    'the helper reads _this.thread.x — the cell loop\'s counters are not in its scope');
  assert.ok(/offset\(user_a\):0\)\+x\)/.test(source.replace(/\s/g, '')),
    'the root body next to it uses the counter');
});

// T1's other half is a claim about what does NOT need doing.
test('cpu: constants and output are already loop-invariant bindings', () => {
  const source = cpuSource(function (a) {
    return a[this.thread.x] * this.constants.n + this.output.x;
  }, { constants: { n: 3 } });

  assert.ok(/const constants_n = this\.constants\.n;/.test(source),
    'the constant is bound once, above the returned closure');
  assert.ok(/const outputX = _this\.output\[0\];/.test(source),
    'the output size is bound once, above the cell loop');
  const body = afterCellLoop(source);
  assert.notOk(/_this\.constants/.test(body), 'neither is re-read per cell');
  assert.notOk(/_this\.output\[/.test(body), 'neither is re-read per cell');
});
