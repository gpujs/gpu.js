var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

gulp.task('default', function() {
    return gulp.src([
			'src/parser.js', 
			'src/gpu.js', 
			'src/backend/functionNode_webgl.js', 
			'src/backend/functionNode.js'
			'src/backend/functionBuilder.js'
			'src/backend/fallback.js', 
			'src/backend/glsl.js'
		])
        .pipe(concat('gpu.js'))
        .pipe(uglify())
        .pipe(gulp.dest('bin'));
});
