const fs = require('fs');
const gulp = require('gulp');
const rename = require('gulp-rename');
const header = require('gulp-header');
const browserSync = require('browser-sync');
const browserify = require('browserify');
const replace = require('gulp-replace');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const path = require('path');
const pkg = require('./package.json');
const jsprettify = require('gulp-jsbeautifier');
const stripComments = require('gulp-strip-comments');
const merge = require('merge-stream');
const { readDirDeepSync } = require('read-dir-deep');

gulp.task('build', () => {
  const gpu = browserify('./src/browser.js', {standalone: 'GPU'})
    .ignore('gl')
    .bundle()
    .pipe(source('gpu-browser.js'))
    .pipe(buffer())
    .pipe(stripComments())
    .pipe(header(fs.readFileSync('./src/browser-header.txt', 'utf8'), { pkg : pkg }))
    .pipe(gulp.dest('dist'))
    .on('error', console.error);

  const gpuCore = browserify('./src/browser.js', {standalone: 'GPU'})
    .ignore('gl')
    .ignore('acorn')
    .bundle()
    .pipe(source('gpu-browser-core.js'))
    .pipe(buffer())
    .pipe(stripComments())
    .pipe(header(fs.readFileSync('./src/browser-header.txt', 'utf8'), { pkg : pkg }))
    .pipe(gulp.dest('dist'))
    .on('error', console.error);

  return merge(gpu, gpuCore);
});

/// Minify the build script, after building it
gulp.task('minify', () => {
  const gpu = gulp.src('dist/gpu-browser.js')
    .pipe(rename('gpu-browser.min.js'))
    .pipe(header(fs.readFileSync('./src/browser-header.txt', 'utf8'), { pkg : pkg }))
    .pipe(gulp.dest('dist'))
    .on('error', console.error);

  const gpuCore = gulp.src('dist/gpu-browser-core.js')
    .pipe(rename('gpu-browser-core.min.js'))
    .pipe(header(fs.readFileSync('./src/browser-header.txt', 'utf8'), { pkg : pkg }))
    .pipe(gulp.dest('dist'))
    .on('error', console.error);

  return merge(gpu, gpuCore);
});


/// The browser sync prototyping
gulp.task('bsync', () => {
  // Syncs browser
  browserSync.init({
    server: {
      baseDir: './'
    },
    open: true,
    startPath: "./test/html/test-all.html",
    // Makes it easier to test on external mobile devices
    host: "0.0.0.0",
    tunnel: true
  });

  // Detect change -> rebuild TS
  gulp.watch(['src/**.js'], ['minify']);
});

/// Auto rebuild and host
gulp.task('default', gulp.series('minify','bsync'));

/// Beautify source code
/// Use before merge request
gulp.task('beautify', () => {
  return gulp.src(['src/**/*.js'])
    .pipe(jsprettify({
      indent_size: 2,
      indent_char: ' ',
      indent_with_tabs: false,
      eol: '\n',
      brace_style: 'preserve-inline'
    }))
    .pipe(gulp.dest('src'));
});

gulp.task('build-tests', () => {
  const folder = 'test';
  const testFile = 'all.html';
  try {
    fs.unlinkSync(`${folder}/${testFile}`);
  } catch (e) {}
  const rootPath = path.resolve(process.cwd(), folder);
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
    .pipe(replace('{{test-files}}', files.map(file => `<script type="module" src="${file}"></script>`).join('\n')))
    .pipe(rename(testFile))
    .pipe(gulp.dest(folder));
});

gulp.task('make', gulp.series('build', 'beautify', 'minify', 'build-tests'));

