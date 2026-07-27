// Reformats src/ in place. Replaces gulp's `beautify`.
const fs = require('fs');
const path = require('path');
const { js: beautify } = require('js-beautify');
const { ROOT } = require('./lib');

const options = {
  indent_size: 2,
  indent_char: ' ',
  indent_with_tabs: false,
  eol: '\n',
  brace_style: 'preserve-inline',
};

function* jsFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* jsFiles(full);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      yield full;
    }
  }
}

function run() {
  let changed = 0;
  let total = 0;
  for (const file of jsFiles(path.join(ROOT, 'src'))) {
    total++;
    const before = fs.readFileSync(file, 'utf8');
    const after = beautify(before, options);
    if (after !== before) {
      fs.writeFileSync(file, after);
      changed++;
    }
  }
  console.log(`  beautified ${changed} of ${total} files in src/`);
}

if (require.main === module) run();

module.exports = { beautify: run };
