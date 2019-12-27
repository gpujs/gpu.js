const lib = require('./index');
const GPU = lib.GPU;
for (const p in lib) {
  if (!lib.hasOwnProperty(p)) continue;
  if (p === 'GPU') continue; //prevent recursive reference
  GPU[p] = lib[p];
}
Object.defineProperty(window, 'GPU', {
  get() {
    return GPU;
  }
});
module.exports = lib;