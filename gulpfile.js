const fs = require('fs');
const gulp = require('gulp');
const rename = require('gulp-rename');
const header = require('gulp-header');
const browserSync = require('browser-sync');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const pkg = require('./package.json');
const jsprettify = require('gulp-jsbeautifier');
const stripComments = require('gulp-strip-comments');
const merge = require('merge-stream');

gulp.task('build', function() {
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
gulp.task('minify', function() {
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
gulp.task('bsync', function(){
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
gulp.task('beautify', function() {
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

