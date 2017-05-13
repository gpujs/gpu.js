const fs = require('fs');
const gulp = require('gulp');
const concat = require('gulp-concat');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const gutil = require('gulp-util');
const header = require('gulp-header');
const browserSync = require('browser-sync');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const pkg = require('./package.json');

/// Build the scripts
gulp.task('build', function() {
  browserify('./src/index.js')
    .bundle()
    .pipe(source('gpu.js'))
    .pipe(buffer())
		.pipe(header(fs.readFileSync('./src/wrapper/prefix.js', 'utf8'), { pkg : pkg }))
		.pipe(gulp.dest('bin'));
});

/// Minify the build script, after building it
gulp.task('minify', ['build'], function() {
	return gulp.src(['bin/gpu.js'])
		.pipe(rename('gpu.min.js'))
		.pipe(uglify({
			mangle: false,
			preserveComments: 'license'
		}).on('error', gutil.log))
		.pipe(gulp.dest('bin'));
});

/// The browser sync prototyping
gulp.task('bsync', function(){
	// Syncs browser
	browserSync.init({
		server: {
			baseDir: './'
		},
		open: true
	});

	// Detect change -> rebuild TS
	gulp.watch(['src/**.js'], ['minify']);
});

/// Auto rebuild and host
gulp.task('default', ['bsync']);
