function addCustomFunction_sumAB( assert, mode ) {
	var gpu = new GPU();
	
	function custom_adder(a,b) {
		return a+b;
	}
	gpu.addFunction(custom_adder);
	
	var f = gpu.createKernel(function(a, b) {
		return custom_adder(a[this.thread.x], b[this.thread.x]);
	}, {
		dimensions : [6],
		mode : mode
	});
	
	assert.ok( f !== null, "function generated test");
	
	var a = [1, 2, 3, 5, 6, 7];
	var b = [4, 5, 6, 1, 2, 3];
	
	var res = f(a,b);
	var exp = [5, 7, 9, 6, 8, 10];
	
	for(var i = 0; i < exp.length; ++i) {
		QUnit.close(res[i], exp[i], 0.1, "Result arr idx: "+i);
	}
}

QUnit.test( "addCustomFunction_sumAB (auto)", function( assert ) {
	addCustomFunction_sumAB(assert, null);
});

QUnit.test( "addCustomFunction_sumAB (WebGL)", function( assert ) {
	addCustomFunction_sumAB(assert, "webgl");
});

QUnit.test( "addCustomFunction_sumAB (CPU)", function( assert ) {
	addCustomFunction_sumAB(assert, "cpu");
});
