QUnit.test( "basic_sum_AB (auto)", function( assert ) {
	var f = GPU(function(a, b) {
		var ret = a[this.thread.x] + b[this.thread.x];
		return ret;
	}, {
		thread : [3],
		block : [1]
	});
	
	assert.ok( f != null, "function generated test");
	assert.equals( f( [1, 2, 3], [4, 5, 6] ), [5, 7, 9], "basic sum function test");
	
	console.log(c);
});
