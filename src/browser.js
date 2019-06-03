const lib = require('./index');
const GPU = lib.GPU;
for (const p in lib) {
  if (!lib.hasOwnProperty(p)) continue;
  if (p === 'GPU') continue; //prevent recursive reference
  GPU[p] = lib[p];
}
if (typeof module !== 'undefined') {
  module.exports = GPU;
}
if (typeof window !== 'undefined') {
  window.GPU = GPU;
}
if (typeof self !== 'undefined') {
  self.GPU = GPU;
}