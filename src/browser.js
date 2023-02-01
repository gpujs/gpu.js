import * as lib from './index';
const GPU = lib.GPU;

for (const p in lib) {
  if (!Object.prototype.hasOwnProperty.call(lib, p)) {
    continue;
  }
  if (p === 'GPU') {
    //prevent recursive reference
    continue;
  }
  GPU[p] = lib[p];
}

export default lib;
