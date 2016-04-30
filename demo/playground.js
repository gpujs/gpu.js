$(function() {
	
	//-------------------------------------------
	//
	// Common UI elements setup
	//
	//-------------------------------------------
	
	/// Setup the various input +/- buttons increments
	function setupInputNumbers() {
		//plugin bootstrap minus and plus
		//http://jsfiddle.net/laelitenetwork/puJ6G/
		$('.btn-number').click(function(e){
			e.preventDefault();
			
			fieldName = $(this).attr('data-field');
			type	  = $(this).attr('data-type');
			var input = $("input[name='"+fieldName+"']");
			var currentVal = parseInt(input.val());
			if (!isNaN(currentVal)) {
				if(type == 'minus') {
					
					if(currentVal > input.attr('min')) {
						input.val(currentVal - 1).change();
					} 
					if(parseInt(input.val()) == input.attr('min')) {
						$(this).attr('disabled', true);
					}
					
				} else if(type == 'plus') {
					
					if(currentVal < input.attr('max')) {
						input.val(currentVal + 1).change();
					}
					if(parseInt(input.val()) == input.attr('max')) {
						$(this).attr('disabled', true);
					}
					
				}
			} else {
				input.val(0);
			}
		});
		$('.input-number').focusin(function(){
			$(this).data('oldValue', $(this).val());
		});
		$('.input-number').change(function() {
			
			minValue =  parseInt($(this).attr('min'));
			maxValue =  parseInt($(this).attr('max'));
			valueCurrent = parseInt($(this).val());
			
			name = $(this).attr('name');
			if(valueCurrent >= minValue) {
				$(".btn-number[data-type='minus'][data-field='"+name+"']").removeAttr('disabled')
			} else {
				alert('Sorry, the minimum value was reached');
				$(this).val($(this).data('oldValue'));
			}
			if(valueCurrent <= maxValue) {
				$(".btn-number[data-type='plus'][data-field='"+name+"']").removeAttr('disabled')
			} else {
				alert('Sorry, the maximum value was reached');
				$(this).val($(this).data('oldValue'));
			}
			
			
		});
		$(".input-number").keydown(function (e) {
			// Allow: backspace, delete, tab, escape, enter and .
			if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 190]) !== -1 ||
			// Allow: Ctrl+A
			(e.keyCode == 65 && e.ctrlKey === true) || 
			// Allow: home, end, left, right
			(e.keyCode >= 35 && e.keyCode <= 39)) {
				// let it happen, don't do anything
				return;
			}
			// Ensure that it is a number and stop the keypress
			if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
				e.preventDefault();
			}
		});
	}
	
	//-------------------------------------------
	//
	// Parameter setup
	//
	//-------------------------------------------
	
	/// @TODO setup and normalize the parameter list
	function updateParamsList() {
		
	}
	
	//-------------------------------------------
	//
	// Code mirror kernel setup
	//
	//-------------------------------------------
	
	/// Kernel code mirror object
	var CM_kernel = null;
	
	/// One time setup of the kernel editor
	function setupKernelEditor() {
		
		// Setup the kernel code mirror
		var kernel_textArea = document.getElementById("kernel_function");
		CM_kernel = CodeMirror.fromTextArea(kernel_textArea, {
			lineNumbers: true,
			mode: {name: "javascript", json: true},
			indentUnit: 3,
			tabSize: 3
		});
		
		// Reset the value if needed
		var val = CM_kernel.getValue().trim();
		if(val.length <= 0) {
			
// The default kernel value
function kernel(A,B) {
	var sum = 0;
	for (var i=0; i<512; i++) {
		sum = (sum*A[this.thread.x] + i)/B[this.thread.x];
	}
	return sum;
}
			
			CM_kernel.setValue(kernel.toString())
		}
		
		// Block edits for first and last line
		CM_kernel.on('beforeChange', function(cm,change) {
			if( change.from.line <= 0 || cm.lineCount() - 1 <= change.to.line) {
				change.cancel();
			}
		});
		
		// Setup the kernel sample click call
		$("#kernel_sample_btn").click(updateKernelSampleDisplay);
	}
	
	//-------------------------------------------
	//
	// Kernel arguments / sample preperation
	//
	//-------------------------------------------
	
	/// Get single argument sample
	function getOneKernelArgument(idx, sampleSize) {
		var pf = (function(s) {
			var ret = [];
			for(var a=0; a<s; ++a) {
				ret[a] = a;
			}
			return ret;
		})
		return pf(sampleSize);
	}
	
	/// Get the argument array, with given sample size
	function getKernelArguments(sampleSize) {
		var ret = [ getOneKernelArgument(0,sampleSize), getOneKernelArgument(1,sampleSize) ];
		//console.log(ret);
		return ret;
	}
	
	/// Get the kernel raw JS function
	function getKernelRawFunction() {
		eval("var ret = "+CM_kernel.getValue());
		return ret;
	}
	
	/// Get the kerenel configured dimensions
	function getKernelDimensions(sampleSize) {
		return [sampleSize];
	}
	
	/// Generate the kernel sample result
	function getKernelSampleResult(sampleSize) {
		var raw = getKernelRawFunction();
		var gpu = new GPU();
		var ker = gpu.createKernel(raw,{
			dimensions : getKernelDimensions(sampleSize)
		});
		
		var args = getKernelArguments(sampleSize);
		return ker.apply(ker, args);
	}
	
	/// Update the kernel sample results
	function updateKernelSampleDisplay() {
		// Fixed sample size @TODO implmentation
		var res = getKernelSampleResult(10);
		console.log("Kernel code sample result : ", res);
		$("#kernel_sample").html( JSON.stringify(res) );
	}
	
	//-------------------------------------------
	//
	// Bench marking logic code
	//
	//-------------------------------------------
	
	/// Run a single benchmark, for the sample size, in a single mode
	function singleBenchmark(sampleSize, mode) {
		var rawFunction = getKernelRawFunction();
		var gpu = new GPU();
		var kernel = gpu.createKernel(rawFunction,{
			dimensions : getKernelDimensions(sampleSize),
			mode : mode
		});
		
		var args = getKernelArguments(sampleSize);
		var warmup_size = parseInt( $("#warmup_size").val() );
		var bench_size = parseInt( $("#bench_size").val() );
		
		// Warmup iteration used to "ignore" optimizers?
		for(var w=0; w<warmup_size; ++w) {
			kernel.apply(kernel, args);
		}
		
		// Benchmark it
		var prefObj = window.performance || Date;
		var start = prefObj.now();
		for(var b=0; b<bench_size; ++b) {
			kernel.apply(kernel, args);
		}
		var end = prefObj.now();
		var time = end - start;
		return time / parseFloat(bench_size);
	}
	
	/// The benchmark charting data, resets on new run
	var bench_time_dataSet = {};
	var bench_gain_dataSet = {};
	
	/// The various dataset specific arrays
	var bench_labels = [];
	var bench_gpu_time = [];
	var bench_cpu_time = [];
	var bench_gain_dif = [];
	
	/// The benchmark charting config,
	/// Prettymuch never changing
	var bench_time_config = {
		referenceValue : 0
	}
	var bench_gain_config = {
		referenceValue : 0
	}
	
	/// The chartist object
	var bench_time_chartist = null;
	var bench_gain_chartist = null;
	
	/// Does a full reset of the benchmark
	function resetBenchmarkDataset() {
		bench_labels = [];
		bench_gpu_time = [];
		bench_cpu_time = [];
		bench_gain_dif = [];
		
		bench_time_dataSet = {
			labels: bench_labels,
			series: [
				bench_cpu_time,
				bench_gpu_time
			]
		}
		bench_gain_dataSet = {
			labels: bench_labels,
			series: [bench_gain_dif]
		}
	}
	
	/// Does a dataupdate for the chartist display
	function updateBenchmarkDisplay() {
		bench_time_chartist.update(bench_time_dataSet);
		bench_gain_chartist.update(bench_gain_dataSet);
	}
	
	function runCompleteBenchmark() {
		var lower_bound = parseInt($("#bench_lower").val());
		var upper_bound = parseInt($("#bench_upper").val());
		var increment = parseInt($("#bench_increment").val());
		
		var prefObj = window.performance || Date;
		var start = prefObj.now();
		
		console.log("Benchmark started! (Lower, Upper, Incre) : ", lower_bound, upper_bound, increment);
		resetBenchmarkDataset();
		updateBenchmarkDisplay();
		
		function doOneSampleBenchmark(sampleSize, completeCallback) {
			var cpu_time = singleBenchmark(sampleSize, "cpu");
			var gpu_time = singleBenchmark(sampleSize, "gpu");
			var gain_per = 0;
			
			if( cpu_time == gpu_time ) {
				gain_per = 0;
			} else if( gpu_time < cpu_time ) {
				gain_per = cpu_time / gpu_time * 100.0;
			} else {
				gain_per = -(gpu_time / cpu_time * 100.0);
			}
			
			bench_labels.push( sampleSize );
			bench_cpu_time.push( cpu_time );
			bench_gpu_time.push( gpu_time );
			bench_gain_dif.push( gain_per );
			
			bench_time_dataSet.labels = bench_labels;
			bench_gain_dataSet.labels = bench_labels;
			
			//console.log( bench_time_dataSet, bench_gain_dataSet );
			updateBenchmarkDisplay();
			
			if(completeCallback) {
				completeCallback();
			}
		}
		
		var sampleSize = lower_bound;
		
		function sampleSizeLooper() {
			sampleSize += increment;
			if(sampleSize < upper_bound) {
				// Call after UI update
				setTimeout(function(){
					doOneSampleBenchmark(sampleSize, sampleSizeLooper);
				}, 0);
			} else {
				updateBenchmarkDisplay();
				$("#bench_btn").prop('disabled', false);
				
				var end = prefObj.now();
				var time = end - start;
				console.log("Benchmark ended! (total time)", time);
				console.log("Iteration labels : ", bench_labels);
				console.log("Final result for CPU : ", bench_cpu_time);
				console.log("Final result for GPU : ", bench_gpu_time);
				console.log("Final result for performance gain : ", bench_gain_dif);
				
				window.bench_totalTime = time;
				window.bench_labels = bench_labels;
				window.bench_cpu_time = bench_cpu_time;
				window.bench_gpu_time = bench_gpu_time;
				window.bench_gain_dif = bench_gain_dif;
				window.bench_time_dataSet = bench_time_dataSet;
				window.bench_gain_dataSet = bench_gain_dataSet;
			}
		}
		
		$("#bench_btn").prop('disabled', true);
		doOneSampleBenchmark(sampleSize, sampleSizeLooper);
		//updateBenchmarkDisplay();
	}
	
	function setupBenchmarking() {
		bench_time_chartist = new Chartist.Line('#chart_time', bench_time_dataSet, bench_time_config);
		bench_gain_chartist = new Chartist.Line('#chart_gain', bench_gain_dataSet, bench_gain_config);
		$("#bench_btn").click(function() {
			runCompleteBenchmark();
		});
	}
	
	//-------------------------------------------
	//
	// Time to actually do setup calls
	//
	//-------------------------------------------
	
	// The various setup actual call
	setupInputNumbers();
	setupKernelEditor();
	setupBenchmarking();
	
	window.CM_kernel = CM_kernel;
	window.updateKernelSampleDisplay = updateKernelSampleDisplay;
	window.singleBenchmark = singleBenchmark;
	window.updateBenchmarkDisplay = updateBenchmarkDisplay;
	
	window.bench_time_chartist = bench_time_chartist;
	window.bench_gain_chartist = bench_gain_chartist;
});
