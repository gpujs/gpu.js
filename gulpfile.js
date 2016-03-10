var gulp = require('gulp');
var concat = require('gulp-concat');
var rename = require("gulp-rename");
var uglify = require('gulp-uglify');
var gutil = require('gulp-util');

gulp.task('build', function() {
	return gulp.src([
			'src/wrapper/prefix.js',
			'src/parser.js',
			'src/utils.js',
			'src/texture.js',
			'src/backend/gpu_core.js',
			'src/gpu.js',
			'src/backend/functionNode_webgl.js',
			'src/backend/functionNode.js',
			'src/backend/functionBuilder.js',
			'src/backend/mode_cpu.js',
			'src/backend/mode_gpu.js',
			'src/wrapper/suffix.js'
		])
		.pipe(concat('gpu.js'))
		.pipe(gulp.dest('bin'));
});

gulp.task('minify', ['build'], function() {
	return gulp.src(['bin/gpu.js'])
		.pipe(rename('gpu.min.js'))
		.pipe(uglify({
			mangle: false,
			preserveComments: "license"
		}).on('error', gutil.log))
		.pipe(gulp.dest('bin'));
});

gulp.task('default', ['minify']);
