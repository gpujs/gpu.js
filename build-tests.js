/**
 * Question: Why are we even using QUnit?
 *
 * We should be migrating to a more modern unit testing framework like Jest or Ava.
 * I hear some people have even gotten WebGL-related testing done with Jest.
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const { readDirDeep } = require('read-dir-deep');

const readFile = util.promisify(fs.readFile)
const unlink = util.promisify(fs.unlink)
const writeFile = util.promisify(fs.writeFile)

const CWD = process.cwd();

async function main () {
  const folder = 'test';
  const output = path.resolve(CWD, folder, 'all.html');
  const template = path.resolve(CWD, folder, 'all-template.html');
  const rootPath = path.resolve(CWD, folder);
  const warning = '<!-- the following list of javascript files is built automatically -->\n';

  await unlink(output).catch(e => {});

  const files = await readDirDeep(rootPath, {
    patterns: [ '**/*.js' ],
    ignore: [ '*.js' ]
  });

  const str = warning + files
    .map(file => file.replace(/^test\//, ''))
    .map(file => `<script type="module" src="${file}"></script>`)
    .join('\n');

  const file = await readFile(template, 'utf8');

  const data = file.replace('{{test-files}}', str);

  await writeFile(output, data);
};

main().catch(err => {
  console.error(err.message)
  process.exit(1)
});
