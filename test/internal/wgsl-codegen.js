const { assert, skip, test, module: describe } = require('qunit');
const { WebGPUKernel } = require('../../src');

describe('internal: wgsl codegen');

// The WGSL translation runs entirely in Node -- no device is needed until
// build -- so the generator's JS-to-WGSL semantics are pinned here, where
// every platform's CI can watch them.

function translate(source, settings) {
  settings = settings || {};
  const args = settings.args || [];
  delete settings.args;
  const kernel = new WebGPUKernel(source.toString(), Object.assign({
    output: [4],
    precision: 'single',
    functions: [],
    nativeFunctions: [],
  }, settings));
  // the pre-device slice of build(): argument/constant records feed
  // FunctionBuilder, then translation is pure Node
  kernel.setupConstants();
  kernel.setupArguments(args);
  kernel.translateSource();
  return `${ kernel.translatedFunctions }\n${ kernel.translatedBody }`;
}

test('a break behind an if inside a switch case throws', t => {
  // WGSL would read the emitted break as breaking the enclosing loop --
  // silently wrong results -- so the translator must reject it, exactly as
  // the GL backends do
  t.throws(() => {
    translate(function (v) {
      let s = 0;
      for (let i = 0; i < 4; i++) {
        switch (i) {
          case 0:
            if (v[0] > 0) break;
            s += 100;
            break;
          default:
            s += 1;
        }
      }
      return s;
    }, { argumentTypes: ['Array'], args: [[1, 2, 3, 4]] });
  }, /only supported as the case terminator/);
});

test('a case-terminating break is consumed, not emitted', t => {
  const wgsl = translate(function () {
    let s = 0;
    switch (this.thread.x) {
      case 0:
        s = 5;
        break;
      default:
        s = 1;
    }
    return s;
  });
  t.notOk(/break/.test(wgsl), 'no break survives the if-chain lowering');
});

test('a mixed int/float ternary promotes to float instead of rounding', t => {
  const wgsl = translate(function () {
    return this.thread.x > 2 ? this.thread.x : 0.5;
  });
  t.ok(/select\([^;]*0\.5/.test(wgsl), 'the fractional alternate survives');
  t.notOk(/select\(i32\(1\)/.test(wgsl), 'and is not rounded to an integer');
});

test('a promoted ternary type-checks in its enclosing expression', t => {
  const wgsl = translate(function () {
    const value = (this.thread.x > 2 ? this.thread.x : 0.5) * 2.0;
    return value;
  });
  t.ok(/select\([^;]*0\.5/.test(wgsl), 'promotion holds under an enclosing float product');
});

test('prefix increment emits the postfix statement form', t => {
  const wgsl = translate(function () {
    let s = 0;
    for (let i = 0; i < 10; ++i) {
      s += 1;
    }
    return s;
  });
  t.ok(/user_i\+\+/.test(wgsl), 'postfix form emitted');
  t.notOk(/\+\+user_i/.test(wgsl), 'prefix form (invalid WGSL) not emitted');
});

test('a helper named after a WGSL builtin keeps its definition', t => {
  const wgsl = translate(function (v) {
    return cross(v[this.thread.x], 2);
  }, {
    argumentTypes: ['Array'],
    args: [[1, 2, 3, 4]],
    functions: [function cross(a, b) { return a * b; }],
  });
  t.ok(/fn fn_cross\(/.test(wgsl), 'the mangled definition is present');
  t.ok(/fn_cross\(/.test(wgsl.split('fn fn_cross')[1] || ''), 'and the call site uses it');
});

test('helper argument types still infer through the original name', t => {
  // type inference tables are keyed by the original name; a mangled lookup
  // returns nothing and the argument arrives untyped
  const wgsl = translate(function (v) {
    return cross(v[this.thread.x], 2);
  }, {
    argumentTypes: ['Array'],
    args: [[1, 2, 3, 4]],
    functions: [function cross(a, b) { return a * b; }],
  });
  t.ok(/fn fn_cross\(user_a : f32, user_b : f32\)/.test(wgsl), 'both parameters typed f32');
});

test('a comma for-update moves into the body, continue included', t => {
  // WGSL takes one statement per for clause; the loop simplification moves
  // the comma update to the body's end and copies it ahead of continues
  const wgsl = translate(function (a) {
    let s = 0;
    for (let i = 0, j = 0; i < 6; i++, j++) {
      if (a[j] > 3) continue;
      s += a[j];
    }
    return s;
  }, { argumentTypes: ['Array'], args: [[1, 2, 3, 4, 5, 6]] });
  t.ok(/continue;/.test(wgsl), 'continue survives');
  const beforeContinue = wgsl.split('continue;')[0];
  t.ok(/user_i\+\+/.test(beforeContinue) && /user_j\+\+/.test(beforeContinue),
    'both updates run before the continue');
});

test('a comma for-init hoists to statements ahead of the loop', t => {
  const wgsl = translate(function (a) {
    let s = 0;
    let i = 0;
    let j = 0;
    for (i = 0, j = 1; i < 4; i++) {
      s += a[j];
    }
    return s;
  }, { argumentTypes: ['Array'], args: [[1, 2, 3, 4, 5]] });
  t.ok(/user_i = 0;/.test(wgsl.replace(/\s+/g, ' ')) || /user_i=0;/.test(wgsl.replace(/ /g, '')),
    'init assignments became statements');
  t.notOk(/for \([^;]*,/.test(wgsl), 'no comma survives in a for clause');
});
