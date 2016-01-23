function basic_sum_AB_test( assert, mode ) {
	var f = GPU(function(a, b) {
		var ret = a[this.thread.x] + b[this.thread.x];
		return ret;
	}, {
		thread : [3],
		block : [1],
		mode : mode
	});
	
	assert.ok( f !== null, "function generated test");
	assert.deepEqual(f( [1, 2, 3], [4, 5, 6] ), [5, 7, 9], "basic sum function test");
}

QUnit.test( "basic_sum_AB (auto)", function( assert ) {
	basic_sum_AB_test(assert, null);
});

QUnit.test( "basic_sum_AB (GPU)", function( assert ) {
	basic_sum_AB_test(assert, "gpu");
});

QUnit.test( "basic_sum_AB (CPU)", function( assert ) {
	basic_sum_AB_test(assert, "cpu");
});

/*
// EXAMPLE GLSL
void main(float* a, float* b) {
     vec2 _x_ = get_global_id();
	float ret = a[_x_] + b[_x_];
	out_float = ret;
}
 */
