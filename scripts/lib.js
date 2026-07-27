const fs = require('fs');
const path = require('path');
const lodashTemplate = require('lodash.template');

const ROOT = path.resolve(__dirname, '..');
const pkg = require(path.join(ROOT, 'package.json'));

/**
 * The banner gulp-header used to prepend. It is a lodash template, and it
 * interpolates `new Date()`, so two builds are never byte-identical.
 * gulp-header concatenated with no separator and browser-header.txt has no
 * trailing newline, which is why the banner runs straight into the code.
 */
function banner() {
  const source = fs.readFileSync(path.join(ROOT, 'src', 'browser-header.txt'), 'utf8');
  return lodashTemplate(source)({ pkg });
}

function withBanner(code) {
  return banner() + code;
}

function write(relativePath, contents) {
  const target = path.join(ROOT, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
  const size = Buffer.byteLength(contents);
  console.log(`  ${relativePath} ${(size / 1024).toFixed(1)}kB`);
}

module.exports = { ROOT, pkg, banner, withBanner, write };
