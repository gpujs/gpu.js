const fs = require('fs');
const path = require('path');
const { readDirDeepSync } = require('read-dir-deep');

const folder = 'test';
const testFile = 'all.html';

try {
  fs.unlinkSync(`${folder}/${testFile}`);
} catch (e) {}

const rootPath = path.resolve(process.cwd(), folder);
const warning = '<!-- the following list of javascript files is built automatically -->\n  ';
const tags = readDirDeepSync(rootPath, {
  patterns: ['**/*.js'],
  ignore: ['*.js'],
})
  .map(file => './' + file.replace(/^test\//, ''))
  .map(file => `<script type="module" src="${file}"></script>`)
  .join('\n  ');

const template = fs.readFileSync(`${folder}/all-template.html`, 'utf-8');
const text = template.replace('{{test-files}}', warning + tags);

fs.writeFileSync(`${folder}/${testFile}`, text, 'utf-8');
