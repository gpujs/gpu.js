const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const pkg = require(path.join(ROOT, 'package.json'));

/**
 * The banner gulp-header used to prepend. browser-header.txt is a lodash
 * template, but it only ever interpolates package fields and the date, so the
 * three forms it uses are substituted directly rather than pulling in a
 * template engine — and without `new Function`, which would evaluate whatever
 * the file happens to contain.
 *
 * The date means two builds are never byte-identical. gulp-header concatenated
 * with no separator and browser-header.txt has no trailing newline, which is
 * why the banner runs straight into the code.
 */
function banner() {
  const source = fs.readFileSync(path.join(ROOT, 'src', 'browser-header.txt'), 'utf8');
  // one timestamp for the whole banner, rather than one per interpolation
  const now = new Date();
  return source
    .replace(/<%=\s*new Date\(\)\.getFullYear\(\)\s*%>/g, () => String(now.getFullYear()))
    .replace(/<%=\s*new Date\(\)\s*%>/g, () => String(now))
    .replace(/<%=\s*pkg\.(\w+)\s*%>/g, (_, key) => String(pkg[key]));
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
