const lib = require('./index');
const GPU = lib.GPU;
for (const p in lib) {
  if (!lib.hasOwnProperty(p)) continue;
  if (p === 'GPU') continue; //prevent recursive reference
  GPU[p] = lib[p];
}
// self-reference so `new GPU.GPU()`, a widely used workaround for #844, keeps working
GPU.GPU = GPU;

if (typeof window !== 'undefined') {
  bindTo(window);
}
if (typeof self !== 'undefined') {
  bindTo(self);
}

function bindTo(target) {
  // an existing target.GPU can be the native WebGPU interface (Chrome 113+),
  // which must not stop this library from claiming the global name (#844, #820);
  // only an already-loaded gpu.js is left in place
  if (target.GPU && target.GPU.prototype && target.GPU.prototype.createKernel) return;
  Object.defineProperty(target, 'GPU', {
    configurable: true,
    get() {
      return GPU;
    },
    set() {
      // swallow writes instead of leaving a getter-only property: the UMD
      // wrapper assigns its export right after this binding, which throws a
      // TypeError in strict-mode (ES module) loads when no setter exists (#639)
    }
  });
}

// export the class itself, not a namespace, so the UMD global is constructable
module.exports = GPU;