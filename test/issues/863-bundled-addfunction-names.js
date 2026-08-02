const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #863');

// Bundlers strip the name off a named function expression -- nothing in JS
// scope references it -- so `addFunction(function dbl(x) {...})` arrives
// anonymous in a minified build. settings.name was ignored for function
// sources, leaving no way to repair it at the call site. The name now flows:
// settings.name first, then the source string's own name, then
// Function.prototype.name (which knows inferred names the string never had).

const MODES = [
  ['cpu', true],
  ['webgl', GPU.isWebGLSupported],
  ['webgl2', GPU.isWebGL2Supported],
  ['headlessgl', GPU.isHeadlessGLSupported],
];

function eachMode(name, run) {
  for (const [mode, supported] of MODES) {
    (supported ? test : skip)(`Issue #863 - ${ name } ${ mode }`, assert => run(assert, mode));
  }
}

eachMode('an anonymous function with a name setting works', (assert, mode) => {
  const gpu = new GPU({ mode });
  gpu.addFunction(function (x) { return x * 2; }, { name: 'dbl' });
  const kernel = gpu.createKernel('function (a) { return dbl(a[this.thread.x]); }').setOutput([2]);
  assert.deepEqual(Array.from(kernel([1, 2])), [2, 4]);
  gpu.destroy();
});

eachMode('an inferred Function.prototype.name is used', (assert, mode) => {
  // `const dblRef = function (x) {...}` -- the string has no name, but JS
  // named the function object at assignment
  const dblRef = function (x) { return x * 2; };
  const gpu = new GPU({ mode });
  gpu.addFunction(dblRef);
  const kernel = gpu.createKernel('function (a) { return dblRef(a[this.thread.x]); }').setOutput([2]);
  assert.deepEqual(Array.from(kernel([1, 2])), [2, 4]);
  gpu.destroy();
});

eachMode('the bundled shape: anonymous definition, surviving call site', (assert, mode) => {
  // as esbuild --minify emits it: the definition lost its name, the call
  // inside the sibling survived as a free identifier; { name } re-links them
  const gpu = new GPU({ mode });
  gpu.addFunction(function (px) { return px + 1; }, { name: 'sdfScene' });
  gpu.addFunction(function (a) { return sdfScene(a) * 2; }, { name: 'helper' });
  const kernel = gpu.createKernel('function (v) { return helper(v[this.thread.x]); }').setOutput([2]);
  assert.deepEqual(Array.from(kernel([1, 2])), [4, 6]);
  gpu.destroy();
});

test('a truly anonymous function fails with an actionable error', assert => {
  const gpu = new GPU({ mode: 'cpu' });
  gpu.addFunction(function (x) { return x * 2; });
  assert.throws(() => {
    gpu.createKernel('function (a) { return a[this.thread.x]; }').setOutput([2])([1, 2]);
  }, /bundlers strip the name|name.*setting/i);
  gpu.destroy();
});

test('createKernel functions setting takes names too', assert => {
  const gpu = new GPU({ mode: 'cpu' });
  const kernel = gpu.createKernel('function (a) { return trip(a[this.thread.x]); }', {
    output: [2],
    functions: [{ source: 'function (x) { return x * 3; }', settings: { name: 'trip' } }],
  });
  assert.deepEqual(Array.from(kernel([1, 2])), [3, 6]);
  gpu.destroy();
});

test('object argumentTypes that match no parameter throw with guidance', assert => {
  // the minifier renames parameters, so object-keyed types silently become
  // untyped -- and untyped inference computes wrong values; a total mismatch
  // now points at the array form instead
  const gpu = new GPU({ mode: 'cpu' });
  assert.throws(() => {
    gpu.addFunction(function (s, r, h) { return s + r + h; }, {
      name: 'f',
      argumentTypes: { px: 'Number', py: 'Number', pz: 'Number' },
    });
    gpu.createKernel('function () { return f(1, 2, 3); }').setOutput([1])();
  }, /match none of the function's parameters|array form/);
  gpu.destroy();
});

test('partially-typed object argumentTypes keep working', assert => {
  const gpu = new GPU({ mode: 'cpu' });
  gpu.addFunction(function (a, b) { return a + b; }, { name: 'g', argumentTypes: { a: 'Number' } });
  assert.deepEqual(Array.from(gpu.createKernel('function () { return g(1, 2); }').setOutput([1])()), [3]);
  gpu.destroy();
});
