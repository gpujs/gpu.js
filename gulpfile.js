const fs = require('fs');
const gulp = require('gulp');
const rename = require('gulp-rename');
const replace = require('gulp-replace');
const path = require('path');
const { readDirDeepSync } = require('read-dir-deep');

gulp.task('build-tests', () => {
  const folder = 'test';
  const testFile = 'all.html';
  try {
    fs.unlinkSync(`${folder}/${testFile}`);
  } catch (e) {}
  const rootPath = path.resolve(process.cwd(), folder);
  const warning = '<!-- the following list of javascript files is built automatically -->\n';
  const files = readDirDeepSync(rootPath, {
      patterns: [
        '**/*.js'
      ],
      ignore: [
        '*.js'
      ]
    })
    .map(file => file.replace(/^test\//, ''));
  return gulp.src(`${folder}/all-template.html`)
    .pipe(replace('{{test-files}}', warning + files.map(file => `<script type="module" src="${file}"></script>`).join('\n')))
    .pipe(rename(testFile))
    .pipe(gulp.dest(folder));
});