function basic_sum_AB_test( assert, mode ) {
	var f = GPU(function(a, b) {
		return (a[this.thread.x] + b[this.thread.x]);
	}, {
		thread : [6],
		block : [1],
		mode : mode
	});
	
	assert.ok( f !== null, "function generated test");
	
	var a = [1, 2, 3, 5, 6, 7];
	var b = [4, 5, 6, 1, 2, 3];
	
	var res = f(a,b);
	var exp = [5, 7, 9, 6, 8, 10];
	
	for(var i = 0; i < exp.length; ++i) {
		QUnit.close(exp[i], res[i], 0.1, "Result arr idx: "+i);
	}
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

function basic_sqrt_AB_test( assert, mode ) {
	var f = GPU(function(a, b) {
		return Math.sqrt(a[ this.thread.x ] * b[ this.thread.x ]);
	}, {
		thread : [8],
		block : [1],
		mode : mode
	});
	
	assert.ok( f !== null, "function generated test");
	
	var a = [3, 4, 5, 6, 7, 8];
	var b = [3, 4, 5, 6, 7, 8];
	
	var res = f(a,b);
	var exp = [3, 4, 5, 6, 7, 8];
	
	for(var i = 0; i < exp.length; ++i) {
		QUnit.close(exp[i], res[i], 0.1, "Result arr idx: "+i);
	}
}

QUnit.test( "basic_sqrt_AB (auto)", function( assert ) {
	basic_sqrt_AB_test(assert, null);
});

QUnit.test( "basic_sqrt_AB (GPU)", function( assert ) {
	basic_sqrt_AB_test(assert, "gpu");
});

QUnit.test( "basic_sqrt_AB (CPU)", function( assert ) {
	basic_sqrt_AB_test(assert, "cpu");
});

function basic_forlp_AB_test( assert, mode ) {
	var f = GPU(function(a, b) {
		for (var i = 0; i < 100; i++) {
			return Math.sqrt(a[ this.thread.x ] * b[ this.thread.x ]) * i;
		}
	}, {
		thread : [8],
		block : [1],
		mode : mode
	});
	
	assert.ok( f !== null, "function generated test");
	
	var a = [3, 4, 5, 6, 7, 8];
	var b = [3, 4, 5, 6, 7, 8];
	
	var res = f(a,b);
	var exp = [3, 4, 5, 6, 7, 8];
	
	for(var i = 0; i < exp.length; ++i) {
		QUnit.close(exp[i], res[i], 0.1, "Result arr idx: "+i);
	}
}

QUnit.test( "basic_forlp_AB (auto)", function( assert ) {
	basic_forlp_AB_test(assert, null);
});

QUnit.test( "basic_forlp_AB (GPU)", function( assert ) {
	basic_forlp_AB_test(assert, "gpu");
});

QUnit.test( "basic_forlp_AB (CPU)", function( assert ) {
	basic_forlp_AB_test(assert, "cpu");
});