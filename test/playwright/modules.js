// QUnit module names, discovered from the test sources so the Playwright run
// reports one test per module without having to load a browser first.
//
// A module listed here that does not run shows up as skipped rather than
// silently passing, which is what makes a browser dropping a whole backend
// visible.
const fs = require('fs');
const path = require('path');

const TEST_ROOT = path.join(__dirname, '..');
const SEARCHED = ['features', 'internal', 'issues'];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && entry.name.endsWith('.js') ? [full] : [];
  });
}

const names = new Set();
for (const folder of SEARCHED) {
  for (const file of walk(path.join(TEST_ROOT, folder))) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/^\s*describe\(\s*(['"`])([^'"`]+)\1/gm)) {
      names.add(match[2]);
    }
  }
}

module.exports = { MODULES: [...names].sort() };
