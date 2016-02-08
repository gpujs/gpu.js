var gpu = new GPU();

/**
 * Figure out how long it takes for a method to execute.
 *
 * @param {Function} method to test
 * @param {number} iterations number of executions.
 * @param {Array} args to pass in.
 * @param {T} context the context to call the method in.
 * @return {number} the time it took, in milliseconds to execute.
 */
var bench = function (method, iterations, args, context) {

	var time = 0;
	var timer = function (action) {
		var d = Date.now();
		if (time < 1 || action === 'start') {
			time = d;
			return 0;
		} else if (action === 'stop') {
			var t = d - time;
			time = 0;
			return t;
		} else {
			return d - time;
		}
	};

	var result = [];
	var i = 0;
	timer('start');
	while (i < iterations) {
		result.push(method.apply(context, args));
		i++;
	}

	var execTime = timer('stop');

	if ( typeof console === "object") {
		console.log("Mean execution time was: ", execTime / iterations);
		console.log("Sum execution time was: ", execTime);
		console.log("Result of the method call was:", result[0]);
	}

	return execTime / iterations;
};

//
// Startup code
//
var _length = 2048;
var set_a = [];
var set_b = [];
for(var n = 0; n < _length; n++) {
	var randA = Math.random()*100.0;
	var randB = Math.random()*100.0;
	set_a.push(randA);
	set_b.push(randB);
}
console.log("startup code", [set_a, set_b]);

//
// GPU.JS setup code
//
function benchmarkCode(mode) {
	var runFunction = gpu.createKernel(function(a, b) {
		var res = 0.0;
		
		for(var i = 0.0; i < 500000; i++) {
			res += Math.sqrt( a[this.thread.x] * b[this.thread.x] );
		}
		 
		return res;
	}, {
		dimensions : [2048],
		mode : mode
	});
	 
	c = runFunction(set_a, set_b);
}

function runBenchmark() {
	$('.run_btn').prop('disabled', true);
	
	$(".cpu_result_ovl").removeClass("alert-success").addClass("alert-warning").html("Percentage Gain: Running ...");
	$(".cpu_result_gpu").removeClass("alert-success").addClass("alert-warning").html("GPU: Running ... ");
	var gpuTime = bench(function(){
		benchmarkCode('gpu');
	}, 10, [], this);
	$(".cpu_result_gpu").removeClass("alert-warning").addClass("alert-success").html("GPU: "+gpuTime+" ms");
	
	$(".cpu_result_cpu").removeClass("alert-success").addClass("alert-warning").html("CPU: Running ... ");
	cpuTime = bench(function(){
		benchmarkCode('cpu');
	}, 10, [], this);
	$(".cpu_result_cpu").removeClass("alert-warning").addClass("alert-success").html("CPU: "+cpuTime+" ms");
	
	$(".cpu_result_ovl").removeClass("alert-warning").addClass("alert-success").html("Percentage Gain: "+Math.round(cpuTime/gpuTime*100)+"%");
	$('.run_btn').prop('disabled', false);
}

/*
bench(function(){
	setupBenchCode('gpu');
}, 100, [], this);

bench(function(){
	setupBenchCode('cpu');
}, 100, [], this);
*/
