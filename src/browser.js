const lib = require('./index');
const GPU = lib.GPU;
for (const p in lib) {
  if (!lib.hasOwnProperty(p)) continue;
  if (p === 'GPU') continue; //prevent recursive reference
  GPU[p] = lib[p];
}

if (typeof window !== 'undefined') {
  bindTo(window);
}
if (typeof self !== 'undefined') {
  bindTo(self);
}

function bindTo(target) {
  if (target.GPU) return;
  Object.defineProperty(target, 'GPU', {
    get() {
      return GPU;
    }
  });
}

module.exports = lib;