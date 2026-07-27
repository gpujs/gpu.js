// Bundles src/browser.js into the two browser builds. Replaces gulp's `build`.
const path = require('path');
const browserify = require('browserify');
const decomment = require('decomment');
const { ROOT, withBanner, write } = require('./lib');

// `standalone` produces the UMD wrapper and the GPU global; `browserField:
// false` keeps browserify from following package.json "browser" fields, which
// would otherwise redirect gpu.js itself to dist/. `ignore` replaces a module
// with an empty stub rather than leaving a require() behind: `gl` is a native
// node addon that cannot exist in a browser, and the core build drops acorn.
function bundle(ignore) {
  const b = browserify(path.join(ROOT, 'src', 'browser.js'), {
    standalone: 'GPU',
    browserField: false,
  });
  ignore.forEach(name => b.ignore(name));
  return new Promise((resolve, reject) => {
    b.bundle((err, result) => (err ? reject(err) : resolve(result)));
  });
}

async function build() {
  const full = await bundle(['gl']);
  write('dist/gpu-browser.js', withBanner(decomment(full.toString())));

  const core = await bundle(['gl', 'acorn']);
  write('dist/gpu-browser-core.js', withBanner(decomment(core.toString())));
}

if (require.main === module) {
  build().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { build };
