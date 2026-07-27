// Minifies the built bundles. Replaces gulp's `minify`.
const fs = require('fs');
const path = require('path');
const { minify: terserMinify } = require('terser');
const { ROOT, withBanner, write } = require('./lib');

// ascii_only escapes non-ASCII to \uXXXX. acorn's unicode identifier tables
// are the only source of it here, and leaving those bytes raw broke the bundle
// for anyone serving it without a matching charset (#743, #744).
const options = {
  output: {
    ascii_only: true,
  },
};

const targets = [
  ['dist/gpu-browser.js', 'dist/gpu-browser.min.js'],
  ['dist/gpu-browser-core.js', 'dist/gpu-browser-core.min.js'],
];

async function minify() {
  for (const [from, to] of targets) {
    const source = fs.readFileSync(path.join(ROOT, from), 'utf8');
    // terser drops the banner along with every other comment, so it is put
    // back afterwards — same as the gulp pipeline did
    const result = await terserMinify({ [path.basename(from)]: source }, options);
    if (result.error) throw result.error;
    write(to, withBanner(result.code));
  }
}

if (require.main === module) {
  minify().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { minify };
