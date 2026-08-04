const { assert, skip, test, module: describe } = require('qunit');
const { GPU, FunctionNode } = require('../../../src');

describe('features: optimizer hoisting');

// Parity proves the optimizer changes no answer. These prove it changes the
// EMISSION -- in both directions, because a pass that quietly does nothing
// also passes every parity row. Each shape is asserted against the text the
// backend actually compiles: the cpu backend's generated JavaScript and the
// GL backends' generated GLSL.

const GL_MODE = GPU.isHeadlessGLSupported ? 'headlessgl' : (GPU.isWebGLSupported ? 'webgl' : null);

// Every shape here is about hoisting, so the unroller is off throughout: with
// it on, the loops these kernels hoist out of are gone by the time the text is
// read, and the file would be asserting T3's behavior under H's name.
const H_ONLY = { output: [4], loopUnrollLimit: 0 };

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
    const kernel = gpu.createKernel(kernelSource, Object.assign({}, H_ONLY, settings));
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
    const kernel = gpu.createKernel(kernelSource, Object.assign({}, H_ONLY, settings));
    kernel.apply(null, args || [[1, 2, 3, 4]]);
    return kernel.kernel.translatedSource;
  } finally {
    gpu.destroy();
  }
}

// The user's own loop, not the cell loop the cpu backend wraps every kernel
// in: its counter carries the emitters' user namespace.
const userLoop = /for \((let|int) user_/;

function afterFirstLoop(source) {
  const at = source.search(userLoop);
  return at === -1 ? '' : source.slice(at);
}

function beforeFirstLoop(source) {
  const at = source.search(userLoop);
  return at === -1 ? source : source.slice(0, at);
}

const HOT_LOOP = function (a) {
  let s = 0;
  for (let i = 0; i < 4; i++) s += a[this.thread.x] * (i + 1);
  return s;
};

test('cpu: an invariant read leaves the loop body', () => {
  const optimized = cpuSource(HOT_LOOP);
  const disabled = cpuSource(HOT_LOOP, { _optimizerDisabled: true });

  assert.ok(/const user_optHoist0\s*=\s*user_a\[x\]/.test(beforeFirstLoop(optimized)),
    'optimized: the read is a const ahead of the loop');
  assert.notOk(/user_a\[/.test(afterFirstLoop(optimized)),
    'optimized: no array read is left inside the loop');

  assert.notOk(/optHoist/.test(disabled), 'disabled: nothing is hoisted');
  assert.ok(/user_a\[_this\.thread\.x\]/.test(afterFirstLoop(disabled)),
    'disabled: the read stays inside the loop');
});

(GL_MODE ? test : skip)('gl: an invariant read leaves the loop body', () => {
  const optimized = glSource(HOT_LOOP);
  const disabled = glSource(HOT_LOOP, { _optimizerDisabled: true });

  assert.ok(/float user_optHoist0=get/.test(beforeFirstLoop(optimized)),
    'optimized: the texture read is a float ahead of the loop');
  assert.notOk(/get\w*\(user_a/.test(afterFirstLoop(optimized)),
    'optimized: no texture read is left inside the loop');
  assert.ok(/get\w*\(user_a/.test(afterFirstLoop(disabled)),
    'disabled: the texture read stays inside the loop');
});

test('cpu: two spellings of the same read share one const', () => {
  const source = cpuSource(function (a) {
    let s = 0;
    for (let i = 0; i < 4; i++) {
      s += a[this.thread.x] * (i + 1);
      s += a[this.thread.x] * 2;
    }
    return s;
  });
  assert.equal((source.match(/const user_optHoist/g) || []).length, 1,
    'one hoisted const for both reads');
  assert.equal((source.match(/user_optHoist0/g) || []).length, 3,
    'declared once, referenced twice');
});

test('cpu: a read invariant to a whole nest leaves both loops', () => {
  const source = cpuSource(function (a) {
    let s = 0;
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        s += a[1][2] + y * 0.5 + x * 0.25;
      }
    }
    return s;
  }, {}, [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]]);
  assert.ok(/const user_optHoist0\s*=\s*user_a\[1\]\[2\]/.test(beforeFirstLoop(source)),
    'the read sits ahead of the OUTER loop');
  assert.equal((source.match(/user_a\[1\]\[2\]/g) || []).length, 1,
    'and appears exactly once in the whole kernel');
});

// Every bail below asserts the strongest thing available: the optimized text
// is the un-optimized text, character for character. A bail rule that stops
// working shows up here as a diff, wherever in the pass it broke.
//
// None of them reads `this.thread`, and that is deliberate rather than
// incidental: coordinate localization (T1) rewrites those reads on cpu, so a
// kernel containing one cannot be compared character for character against a
// build with the whole optimizer off. Subscripts come from an argument
// instead, which hoists on exactly the same terms.
const BAILS = [
  {
    name: 'a read under a conditional',
    kernel: function (a, n) {
      let s = 0;
      for (let i = 0; i < 8; i++) {
        if (i > n) s += a[n];
      }
      return s;
    },
    args: [[1, 2, 3, 4], 2],
  },
  {
    name: 'a subscript assigned in the body',
    kernel: function (a) {
      let k = 0;
      let s = 0;
      for (let i = 0; i < 4; i++) {
        s += a[k];
        k = (k + 1) % 4;
      }
      return s;
    },
  },
  {
    name: 'a subscript containing a call',
    kernel: function (a, n) {
      let s = 0;
      for (let i = 0; i < 4; i++) s += a[Math.round(n * 0.5)];
      return s;
    },
    args: [[1, 2, 3, 4], 2],
  },
  {
    name: 'a reassigned array argument',
    kernel: function (b, a, n) {
      a = b;
      let s = 0;
      for (let i = 0; i < 4; i++) s += a[n];
      return s;
    },
    args: [[1, 2, 3, 4], [4, 3, 2, 1], 2],
  },
  {
    name: 'a read after a conditional break',
    kernel: function (a, n) {
      let s = 0;
      for (let i = 0; i < 8; i++) {
        if (i > n) break;
        s += a[n];
      }
      return s;
    },
    args: [[1, 2, 3, 4], 2],
  },
  {
    name: 'a read after a conditional return',
    kernel: function (a, n) {
      let s = 0;
      for (let i = 0; i < 8; i++) {
        if (i > 6) return s;
        s += a[n];
      }
      return s;
    },
    args: [[1, 2, 3, 4], 2],
  },
  {
    name: 'a local array, which the kernel may write',
    kernel: function (a) {
      const v = [a[0], a[1], a[2]];
      let s = 0;
      for (let i = 0; i < 4; i++) s += v[1];
      return s;
    },
  },
];

for (let i = 0; i < BAILS.length; i++) {
  const bail = BAILS[i];
  test(`cpu bail: ${ bail.name }`, () => {
    const settings = { loopMaxIterations: 20 };
    const built = cpuBuild(bail.kernel, settings, bail.args);
    const disabled = cpuSource(bail.kernel, Object.assign({ _optimizerDisabled: true }, settings), bail.args);
    assert.ok(built.optimized, `${ bail.name }: the optimized build stayed optimized`);
    assert.notOk(/optHoist/.test(built.source), `${ bail.name }: nothing hoisted`);
    assert.equal(built.source, disabled, `${ bail.name }: emission is unchanged`);
  });
}

// The #868 contract: a build-time throw from the optimizer degrades to an
// un-optimized build rather than taking the kernel down with it.
test('a throw from the optimizer rebuilds with it off', () => {
  const original = FunctionNode.prototype.optimizeAST;
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = message => warnings.push(String(message));
  // throws only while optimizing, so the rebuild -- which runs with
  // optimizerDisabled set -- gets through
  FunctionNode.prototype.optimizeAST = function (ast) {
    if (!this.optimizerDisabled) throw new Error('deliberate optimizer failure');
    return ast;
  };
  const gpu = new GPU({ mode: 'cpu' });
  try {
    const kernel = gpu.createKernel(HOT_LOOP, { output: [4] });
    assert.deepEqual(Array.from(kernel([1, 2, 3, 4])), [10, 20, 30, 40],
      'the kernel still computes');
    assert.ok(kernel.kernel._optimizerDisabled, 'the rebuild turned the optimizer off');
    assert.ok(/deliberate optimizer failure/.test(kernel.kernel.fallbackReason || ''),
      `fallbackReason names the cause: ${ kernel.kernel.fallbackReason }`);
    assert.ok(warnings.some(message => /compiler optimizations/.test(message)),
      'the degradation is warned about');
  } finally {
    console.warn = originalWarn;
    FunctionNode.prototype.optimizeAST = original;
    gpu.destroy();
  }
});
