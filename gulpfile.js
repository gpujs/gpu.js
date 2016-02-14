var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

gulp.task('default', function() {
    return gulp.src([
			'src/wrapper/prefix.js', 
			'src/parser.js', 
			'src/texture.js',
			'src/gpu.js', 
			'src/backend/functionNode_webgl.js', 
			'src/backend/functionNode.js',
			'src/backend/functionBuilder.js',
			'src/backend/fallback.js', 
			'src/backend/glsl.js',
			'src/wrapper/suffix.js'
		])
        .pipe(concat('gpu.js'))
        .pipe(uglify({ mangle: false }))
        .pipe(gulp.dest('bin'));
});
