const fs = require('fs');
const gulp = require('gulp');
const concat = require('gulp-concat');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const gutil = require('gulp-util');
const header = require('gulp-header');
const browserSync = require('browser-sync');

const pkg = require('./package.json');

/// Build the scripts
gulp.task('build', function() {
	return gulp.src([
			'src/parser.js',
			'src/utils.js',
			'src/texture.js',
			'src/backend/gpu-core.js',
			'src/gpu.js',
			'src/backend/function-node-web-gl.js',
			'src/backend/function-node.js',
			'src/backend/function-builder.js',
			'src/backend/mode-cpu.js',
			'src/backend/mode-gpu.js',
			'src/wrapper/suffix.js'
		])
		.pipe(concat('gpu.js'))
		.pipe(header(fs.readFileSync('src/wrapper/prefix.js', 'utf8'), { pkg : pkg } ))
		.pipe(gulp.dest('bin'));
});

/// Minify the build script, after building it
gulp.task('minify', ['build'], function() {
	return gulp.src(['bin/gpu.js'])
		.pipe(rename('gpu.min.js'))
		.pipe(uglify({
			mangle: false,
			preserveComments: "license"
		}).on('error', gutil.log))
		.pipe(gulp.dest('bin'));
});

/// The browser sync prototyping
gulp.task("bsync", function(){
	// Syncs browser
	browserSync.init({
		server: {
			baseDir: "./"
		},
		open: true
	});

	// Detect change -> rebuild TS
	gulp.watch(["src/**.js"], ["minify"]);
});

/// Auto rebuild and host
gulp.task('default', ['bsync']);
