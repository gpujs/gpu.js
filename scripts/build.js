// Bundles src/browser.js into the two browser builds. Replaces gulp's `build`.
const path = require('path');
const { rolldown } = require('rolldown');
const decomment = require('decomment');
const { minify } = require('terser');
const { ROOT, withBanner, write } = require('./lib');

const EMPTY_MODULE = path.join(__dirname, 'empty-module.js');

/**
 * `format: 'umd'` + `name` is what browserify's `standalone` produced: the UMD
 * wrapper and the GPU global that src/browser.js then binds over.
 *
 * Aliasing to an empty module is browserify's `.ignore()`, and it has to be an
 * alias rather than `external`: external would leave a live require() in the
 * bundle, which throws in a browser. `gl` is a native node addon that cannot
 * exist there, and the core build additionally drops acorn.
 *
 * mainFields pins resolution to the CommonJS entry of each dependency, which is
 * what browserify used. Left alone rolldown prefers the ESM entry, and gl's
 * package.json also carries a browser field that browserField:false told
 * browserify to ignore.
 */
async function bundle(ignore) {
  const build = await rolldown({
    input: path.join(ROOT, 'src', 'browser.js'),
    platform: 'browser',
    resolve: {
      alias: Object.fromEntries(ignore.map(name => [name, EMPTY_MODULE])),
      mainFields: ['main'],
    },
  });
  const { output } = await build.generate({
    format: 'umd',
    name: 'GPU',
  });
  await build.close();
  return output[0].code;
}

/**
 * Re-emits the bundle with every non-ASCII character escaped, leaving it
 * otherwise intact — no compression, no mangling.
 *
 * acorn ships its unicode identifier tables already escaped (‌‍\xb7…)
 * and browserify passed those through verbatim, but rolldown decodes string
 * literals and prints the characters, putting ~68k raw UTF-8 bytes in the
 * bundle. Anything serving dist/ without a matching charset then corrupts them,
 * which is #743 and #744 all over again.
 *
 * terser is used rather than a regex sweep because it parses the code and so
 * only escapes where an escape is actually equivalent.
 */
async function toAscii(code, name) {
  const result = await minify({ [name]: code }, {
    compress: false,
    mangle: false,
    format: { ascii_only: true, beautify: true, comments: false, indent_level: 2 },
  });
  if (result.error) throw result.error;
  return result.code;
}

async function build() {
  // worker_threads and os are the wasm worker pool's Node half; in the
  // browser it detects `Worker` first and never touches them
  const full = await bundle(['gl', 'worker_threads', 'os']);
  write('dist/gpu-browser.js', withBanner(await toAscii(decomment(full), 'gpu-browser.js')));

  const core = await bundle(['gl', 'acorn', 'worker_threads', 'os']);
  write('dist/gpu-browser-core.js', withBanner(await toAscii(decomment(core), 'gpu-browser-core.js')));
}

if (require.main === module) {
  build().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { build };
