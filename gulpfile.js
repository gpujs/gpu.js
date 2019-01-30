const fs = require('fs');
const gulp = require('gulp');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify-es').default;
const gutil = require('gulp-util');
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
	const gpu = browserify('./src/browser.js')
		.ignore('gl')
		.bundle()
		.pipe(source('gpu-browser.js'))
		.pipe(buffer())
		.pipe(stripComments())
		.pipe(header(fs.readFileSync('./src/browser-header.txt', 'utf8'), { pkg : pkg }))
		.pipe(gulp.dest('bin'))
		.on('error', console.error);

	const gpuCore = browserify('./src/browser.js')
    .ignore('gl')
		.ignore('acorn')
		.bundle()
		.pipe(source('gpu-browser-core.js'))
		.pipe(buffer())
		.pipe(stripComments())
		.pipe(header(fs.readFileSync('./src/browser-header.txt', 'utf8'), { pkg : pkg }))
		.pipe(gulp.dest('bin'))
		.on('error', console.error);

	return merge(gpu, gpuCore);
});

/// Minify the build script, after building it
gulp.task('minify', function() {
	const gpu = gulp.src('bin/gpu-browser.js')
		.pipe(rename('gpu-browser.min.js'))
		.pipe(header(fs.readFileSync('./src/browser-header.txt', 'utf8'), { pkg : pkg }))
		.pipe(gulp.dest('bin'))
		.on('error', console.error);

	const gpuCore = gulp.src('bin/gpu-browser-core.js')
		.pipe(rename('gpu-browser-core.min.js'))
		.pipe(header(fs.readFileSync('./src/browser-header.txt', 'utf8'), { pkg : pkg }))
		.pipe(gulp.dest('bin'))
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
		startPath: "/test/html/test-all.html",
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
			indent_size: 3,
			indent_char: ' ',
			indent_with_tabs: true
		}))
		.pipe(gulp.dest('src'));
});

gulp.task('injectCSS', function() {
	const signatureColor = '#ff75cf';
	const linkColor = '#4c7fbd';
	const themeColor = '#186384';

	// !important is used because the original rule is using it.
	const cssRules = `
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
		if (err) {
			throw new Error(err);
		}

		console.log('CSS Injected');
	});
});
