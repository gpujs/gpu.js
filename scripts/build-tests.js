// Regenerates test/all.html from all-template.html. Replaces gulp's
// `build-tests`. The script tags are built from the suites under test/, minus
// the files sitting directly in it, which are helpers rather than tests, and
// minus the directories that hold Node-side tooling — those use require('http')
// and module.exports, which throw in the browser and stop the page before a
// single test runs.
const fs = require('fs');
const path = require('path');
const { readDirDeepSync } = require('read-dir-deep');
const { ROOT } = require('./lib');

function run() {
  const folder = path.join(ROOT, 'test');
  const template = fs.readFileSync(path.join(folder, 'all-template.html'), 'utf8');

  const files = readDirDeepSync(folder, {
    patterns: ['**/*.js'],
    ignore: ['*.js', 'browserstack/**', 'playwright/**'],
  }).map(file => file.replace(/^test\//, ''));

  const warning = '<!-- the following list of javascript files is built automatically -->\n';
  const tags = files.map(file => `<script type="module" src="${file}"></script>`).join('\n');

  fs.writeFileSync(path.join(folder, 'all.html'), template.replace('{{test-files}}', warning + tags));
  console.log(`  test/all.html (${files.length} test files)`);
}

if (require.main === module) run();

module.exports = { buildTests: run };
