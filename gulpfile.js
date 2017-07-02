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
const jsprettify = require('gulp-jsbeautifier');
const babel = require('gulp-babel');
const stripComments = require('gulp-strip-comments');

/// Build the scripts
gulp.task('build', function() {
	browserify('./src/index.js')
	.bundle()
	.pipe(source('gpu.js'))
	.pipe(buffer())
	.pipe(stripComments())
	.pipe(babel())
		.pipe(header(fs.readFileSync('./src/wrapper/header.js', 'utf8'), { pkg : pkg }))
		.pipe(gulp.dest('bin'));

	browserify('./src/index-core.js')
	.bundle()
	.pipe(source('gpu-core.js'))
	.pipe(buffer())
	.pipe(stripComments())
	.pipe(babel())
		.pipe(header(fs.readFileSync('./src/wrapper/header.js', 'utf8'), { pkg : pkg }))
		.pipe(gulp.dest('bin'));

	browserify('./src/index-test.js')
	.bundle()
	.pipe(source('gpu-test.js'))
	.pipe(buffer())
	.pipe(stripComments())
	.pipe(babel())
		.pipe(header(fs.readFileSync('./src/wrapper/header.js', 'utf8'), { pkg : pkg }))
		.pipe(gulp.dest('bin'));
});

/// Minify the build script, after building it
gulp.task('minify', ['build'], function() {
	return (
		gulp.src('bin/gpu.js')
			.pipe(rename('gpu.min.js'))
			.pipe(
				uglify({preserveComments: 'license'})
				.on('error', gutil.log)
			)
			.pipe(gulp.dest('bin'))
	) && (
		gulp.src('bin/gpu-core.js')
			.pipe(rename('gpu-core.min.js'))
			.pipe(
				uglify({preserveComments: 'license'})
				.on('error', gutil.log)
			)
			.pipe(gulp.dest('bin'))
	);
});

/// The browser sync prototyping
gulp.task('bsync', function(){
	// Syncs browser
	browserSync.init({
		server: {
			baseDir: './'
		},
		open: true,
		startPath: "/test/html/test-all.html",
		// Makes it easier to test on external mobile devices
		host: "0.0.0.0",
		tunnel: true
	});

	// Detect change -> rebuild TS
	gulp.watch(['src/**.js'], ['minify']);
});

/// Auto rebuild and host
gulp.task('default', ['minify','bsync']);


/// Beautify source code
/// Use before merge request
/// Excludes the parser.js that was jison generated
gulp.task('beautify', function() {
	gulp.src(['src/**/*.js', '!src/parser.js'])
		.pipe(jsprettify({
			indent_size: 3,
			indent_char: ' ',
			indent_with_tabs: true
		}))
		.pipe(gulp.dest('src'));
});