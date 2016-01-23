QUnit.test( "basic_sum_AB (auto)", function( assert ) {
	var f = GPU(function(a, b) {
		var sum = 0;
		for (var k=0; k<3; k++) {
			sum += a[this.thread.y][k] * b[k][this.thread.x];
		}
		return sum;
	}, {
		thread : [3, 3],
		block : [1, 1]
	});
	
	assert.ok( f !== null, "function generated test");
	assert.deepEqual(f(
		[[1, 2, 3],
	     [4, 5, 6],
	 	 [7, 8, 9]],
		[[1, 2, 3],
 	     [4, 5, 6],
 	 	 [7, 8, 9]]),
		[[30, 36, 42],
  	     [66, 81, 96],
  	 	 [102, 126, 150]], "basic mult function test");
});
