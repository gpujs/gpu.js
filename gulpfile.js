'use strict';

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
const del = require('del');
const merge = require('merge-stream');

/// Build the scripts
gulp.task('babelify', function () {
	return gulp.src(['./src/**'])
		.pipe(babel())
		.pipe(gulp.dest('dist'));
});

gulp.task('build', ['babelify'], function() {

	const gpu = browserify('./dist/index.js')
		.bundle()
		.pipe(source('gpu.js'))
		.pipe(buffer())
		.pipe(stripComments())
			.pipe(header(fs.readFileSync('./dist/wrapper/header.js', 'utf8'), { pkg : pkg }))
			.pipe(gulp.dest('bin'));

	const gpuCore = browserify('./dist/index-core.js')
		.bundle()
		.pipe(source('gpu-core.js'))
		.pipe(buffer())
		.pipe(stripComments())
			.pipe(header(fs.readFileSync('./dist/wrapper/header.js', 'utf8'), { pkg : pkg }))
			.pipe(gulp.dest('bin'));
	
	return merge(gpu, gpuCore);
});

/// Minify the build script, after building it
gulp.task('minify', function() {
	const gpu = gulp.src('bin/gpu.js')
		.pipe(rename('gpu.min.js'))
		.pipe(
			uglify({preserveComments: 'license'})
			.on('error', gutil.log)
		)
		.pipe(gulp.dest('bin'));

	const gpuCore = gulp.src('bin/gpu-core.js')
		.pipe(rename('gpu-core.min.js'))
		.pipe(
			uglify({preserveComments: 'license'})
			.on('error', gutil.log)
		)
		.pipe(gulp.dest('bin'));

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
gulp.task('beautify', function() {
	gulp.src(['src/**/*.js'])
		.pipe(jsprettify({
			indent_size: 3,
			indent_char: ' ',
			indent_with_tabs: true
		}))
		.pipe(gulp.dest('src'));
});

gulp.task('injectCSS', function(){
	let signatureColor = '#ff75cf';
	let linkColor = '#4c7fbd';
	let themeColor = '#186384';

	// !important is used because the original rule is using it.
	let cssRules = `
	.signature, a {
		color: ${signatureColor};
	}

	h4.name {
		background: ${themeColor};
	}

	nav > ul > li > a, nav a:hover, nav > h2 > a {
		color: ${linkColor} !important;
	}

	span.param-type, .params td .param-type {
	color: ${themeColor};
	}
	`;
	fs.appendFile('./doc/styles/jsdoc.css', cssRules, (err)=>{
		if(err){
			throw new Error(err);
		}
		
		console.log('CSS Injected');
	});
});