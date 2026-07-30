// Minifies the built bundles. Replaces gulp's `minify`.
const fs = require('fs');
const path = require('path');
const { minify: terserMinify } = require('terser');
const { ROOT, write } = require('./lib');

// ascii_only escapes non-ASCII to \uXXXX. acorn's unicode identifier tables
// are the only source of it here, and leaving those bytes raw broke the bundle
// for anyone serving it without a matching charset (#743, #744).
const options = {
  output: {
    ascii_only: true,
    // Keep licence comments, and say so rather than leaning on terser's
    // default. The bundle's own banner is one of them: it carries `@license`,
    // so it survives minification in place and must not be prepended a second
    // time — which is how the minified files ended up with two banners, a
    // second apart, for anyone who opened them on a CDN.
    comments: /@license|@preserve/,
  },
};

const targets = [
  ['dist/gpu-browser.js', 'dist/gpu-browser.min.js'],
  ['dist/gpu-browser-core.js', 'dist/gpu-browser-core.min.js'],
];

async function minify() {
  for (const [from, to] of targets) {
    const source = fs.readFileSync(path.join(ROOT, from), 'utf8');
    // the banner comes through from the unminified bundle, so the minified
    // file carries the same one -- same version, same timestamp
    const result = await terserMinify({ [path.basename(from)]: source }, options);
    if (result.error) throw result.error;
    write(to, result.code);
  }
}

if (require.main === module) {
  minify().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { minify };
