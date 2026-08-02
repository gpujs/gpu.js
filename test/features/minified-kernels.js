const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('features: minified kernels');

// Kernels as esbuild 0.28 minifies them (fixtures generated with
// `esbuild --minify`, hard-coded so the suite does not depend on esbuild).
// The minifier folds statements into comma sequences and rewrites guarded
// statements as `cond && (effect)` / `cond || (effect)`; the transpiler
// linearizes those back into statements before translation, so what worked
// unminified works minified.

const FIXTURES = [
  {
    name: 'guarded assignment (&&)',
    source: 'function(e){let t=0;return e[this.thread.x]>2&&(t=10),t}',
    args: [[1, 2, 3, 4]],
    expected: [0, 0, 10, 10],
  },
  {
    name: 'guarded if/else (ternary assignments in a return sequence)',
    source: 'function(t){let e=0;return t[this.thread.x]>2?e=10:e=5,e}',
    args: [[1, 2, 3, 4]],
    expected: [5, 5, 10, 10],
  },
  {
    name: 'two guards chained through one return sequence',
    source: 'function(o){let t=0;const e=o[this.thread.x];return e>1&&(t+=1),e>2&&(t+=2),t}',
    args: [[0, 1.5, 2.5, 9]],
    expected: [0, 1, 3, 3],
  },
  {
    name: 'while loop rewritten to for(;cond;) with a comma body',
    source: 'function(l){let e=0,t=0;for(;e<4;)t+=l[e],e++;return t}',
    args: [[1, 2, 3, 4]],
    expected: [10, 10, 10, 10],
  },
  {
    name: 'or-guard in statement position',
    source: 'function(t){let e=0;for(let n=0;n<8;n++)t[n]>9||(e+=t[n]);return e}',
    args: [[1, 2, 3, 4, 10, 10, 10, 10]],
    expected: [10, 10, 10, 10],
  },
  {
    name: 'break folded into the loop condition',
    source: 'function(r){let t=0;for(let e=0;e<8&&!(r[e]>9);e++)t+=r[e];return t}',
    args: [[1, 2, 3, 10, 1, 1, 1, 1]],
    expected: [6, 6, 6, 6],
  },
  {
    name: 'else-if chain as ternary over a guard',
    source: 'function(i){const e=i[this.thread.x];let t=0;return e>3?t=3:e>1&&(t=1),t}',
    args: [[0.5, 1.5, 3.5, 9]],
    expected: [0, 1, 3, 3],
  },
  {
    name: 'guard whose effect calls Math',
    source: 'function(t){let h=0;return t[this.thread.x]>0&&(h=Math.abs(t[this.thread.x])),h}',
    args: [[-1, 0, 2, 5]],
    expected: [0, 0, 2, 5],
  },
  {
    name: 'guard over a comma sequence of assignments',
    source: 'function(n){let t=0,e=0;return n[this.thread.x]>1&&(t=2,e=3),t+e}',
    args: [[0, 1, 2, 3]],
    expected: [0, 0, 5, 5],
  },
  {
    name: 'comma in the for-update clause',
    source: 'function(a){let s=0;for(let i=0,j=0;i<4;i++,j++)s+=a[j];return s}',
    args: [[1, 2, 3, 4, 5]],
    expected: [10, 10, 10, 10],
  },
];

const LOOP_FIXTURES = [
  {
    name: 'comma in the for-update clause moves into the body',
    source: 'function(a){let s=0;let j=0;for(let i=0;i<4;i++,j+=2)s+=a[j];return s}',
    args: [[1, 2, 3, 4, 5, 6, 7, 8]],
    expected: [16, 16, 16, 16],
  },
  {
    name: 'comma update still runs on the continue path',
    source: 'function(a){let s=0;for(let i=0,j=0;i<6;i++,j++){if(a[j]>3)continue;s+=a[j];}return s}',
    args: [[1, 2, 9, 3, 9, 1]],
    expected: [7, 7, 7, 7],
  },
];
FIXTURES.push(...LOOP_FIXTURES);

const MODES = [
  ['cpu', true],
  ['webgl', GPU.isWebGLSupported],
  ['webgl2', GPU.isWebGL2Supported],
  ['headlessgl', GPU.isHeadlessGLSupported],
];

for (const [mode, supported] of MODES) {
  for (const fixture of FIXTURES) {
    (supported ? test : skip)(`${ fixture.name } ${ mode }`, assert => {
      const gpu = new GPU({ mode });
      const kernel = gpu.createKernel(fixture.source, {
        output: [fixture.expected.length],
        loopMaxIterations: 20,
      });
      assert.deepEqual(
        Array.from(kernel.apply(null, fixture.args)),
        fixture.expected);
      gpu.destroy();
    });
  }
}
