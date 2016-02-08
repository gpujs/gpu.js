QUnit.test( "basic_mult_AB (auto)", function( assert ) {
	var gpu = new GPU();
	var f = gpu.createKernel(function(a, b) {
		var sum = 0;
		sum += a[this.thread.y][0] * b[0][this.thread.x];
		sum += a[this.thread.y][1] * b[1][this.thread.x];
		sum += a[this.thread.y][2] * b[2][this.thread.x];
		return sum;
	}, {
		dimensions : [3, 3],
		mode: 'gpu'
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
