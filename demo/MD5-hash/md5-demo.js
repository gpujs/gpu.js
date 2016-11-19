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
	// Utility functions
	//
	//-------------------------------------------
	
	// Used to indicate to the CM_blockFirstAndLastLine to ignore cancel step
	var CM_doNotCancelOrigin = "do-not-cancel";
	
	// Blocks the first and last line inside the code mirror from being editted
	function CM_blockFirstAndLastLine(cm,change) {
		
		// If origin is set to "not-cancel" ignore
		if( change.origin == CM_doNotCancelOrigin ) {
			return;
		}
		
		if( change.from.line <= 0 || cm.lineCount() - 1 <= change.to.line) {
			change.cancel();
		}
	}
	
	var CM_defaultConfig = {
		lineNumbers: true,
		mode: {name: "javascript", json: true},
		indentUnit: 3,
		tabSize: 3
	};
	
	//-------------------------------------------
	//
	// Code mirror parameters generator setup
	//
	//-------------------------------------------
	
	/// Default parameter names : alphabectical
	var paramDefaultNames = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
	
	/// Default parameter function
	var paramDefaultFunction = ""+
		"function(size,rand) {\n"+
		"	var ret = [];\n"+
		"	for(var i=0; i<size; ++i){\n"+
		"		ret[i] = parseInt(rand()*100);\n"+
		"	}\n"+
		"	return ret;\n"+
		"}";
	
	/// Parameter code mirror objects
	var CM_parameters = [];
	var paramNameInputs = [];
	var paramSampleOutputs = [];
	
	/// Get the parameter count
	function getParamCount() {
		return parseInt( $("#arg_count").val() );
	}
	
	/// Update the parameter display list, to match the number of parameters
	function updateParamsList() {
		
		// Get the main parameter container to update
		var pContainer = $("#paramGroupContainer");
		var template = pContainer.find("#paramGroupTemplate")
		
		// Hide everything : handle the case for reduced parameters
		pContainer.find(".paramGroup").hide();
		
		// Get desired parameter count
		var pCount = getParamCount();
		
		// Time to iterate, and create/reveal those paramGroups
		for(var p=0; p<pCount; ++p) {
			var pNode = $("#paramGroup_"+p);
			
			if( pNode == null || pNode.length == 0 ) {
				pNode = template.clone();
				
				pNode.attr("id", "#paramGroup_"+p);
				pNode.find(".param_name").val( paramDefaultNames[p] );
				
				// Setup code mirror
				CM_parameters[p] = CodeMirror.fromTextArea(pNode.find(".param_function")[0], CM_defaultConfig);
				
				// Setup default value
				CM_parameters[p].setValue(paramDefaultFunction);
				
				// Block edits for first and last line
				CM_parameters[p].on('beforeChange', CM_blockFirstAndLastLine);
				
				// Add param name, and sample output nodes to array (for easy refence)
				paramNameInputs[p] = pNode.find(".param_name");
				paramSampleOutputs[p] = pNode.find(".param_sample");
				
				pContainer.append(pNode);
			}
			
			pNode.show();
			CM_parameters[p].refresh();
		}
		
		// Update parameter names 
		updateKernelParamNames();
	}
	
	/// Get the configured parameter functions
	function getParameterFunctions() {
		var ret = [];
		var pCount = getParamCount();
		
		for( var p=0; p<pCount; ++p ) {
			try {
				eval("ret[p] = "+CM_parameters[p].getValue());
			} catch(e) {
				paramSampleOutputs[p].html(e.toString());
				console.error("Failed to process parameter "+p, e);
				alert("Failed to process parameter "+p+" : "+e);
				return null;
			}
		}
		
		return ret;
	}
	
	/// The random seed dom
	var rand_seed_jqDom = $("#rand_seed");
	
	/// Get the pesudo random number generator for the sample size / parameter count
	function getRandom(parameterCount, sampleSize, rand_seed) {
		if(rand_seed == null) {
			rand_seed = rand_seed_jqDom.val();
		}
		
		return new xor4096(parameterCount+"-"+rand_seed+"-"+sampleSize);
	}
	
	/// Update the parameter samples
	function updateParameterSamples() {
		// Get the param functions
		var paramFunctions = getParameterFunctions();
		
		// Invalid parameter function
		if(paramFunctions == null) {
			$("#paramGroupContainer .param_sample").html("");
			return;
		}
		
		// Get demo sample size
		var sample_size = parseInt($("#sample_size").val());
		
		// Iterate, execute
		var pCount = paramFunctions.length;
		for(var p=0; p<pCount; ++p) {
			var rand = getRandom(p, sample_size);
			var sample = paramFunctions[p](sample_size, rand);
			
			paramSampleOutputs[p].html( JSON.stringify(sample) );
		}
		
		// Update parameter names 
		updateKernelParamNames();
	}
	
	/// Get the parameter names, after NORMALIZING them (just in case)
	function getParameterNames() {
		var ret = [];
		
		// Get desired parameter count
		var pCount = getParamCount();
		
		// Iterate through
		for( var p = 0; p < pCount; ++p ) {
			var name = paramNameInputs[p].val();
			name = name.replace(/\W/g, '');
			
			if( name == null || name.length <= 0 ) {
				name = paramDefaultNames[p];
			}
			paramNameInputs[p].val(name);
			ret[p] = name;
		}
		
		return ret;
	}
	
	/// Updates the kernel first line, with the parameter names
	function updateKernelParamNames() {
		// Out of order initialzing =(
		if(CM_kernel == null) {
			return;
		}
		
		var paramNames = getParameterNames();
		
		var kernelHeader = "function kernel("+paramNames.toString()+") {";
		var originalHeader = CM_kernel.getLine(0);
		
		if( kernelHeader != originalHeader ) {
			CM_kernel.replaceRange(kernelHeader, CodeMirror.Pos(0,0), CodeMirror.Pos(0, originalHeader.length), CM_doNotCancelOrigin);
			//CM_kernel.refresh();
		}
	}
	
	/// Setup the parameter generators
	function setupParameterGenerator() {
		updateParamsList();
		$("#arg_count").change(updateParamsList);
		$("#paramset_btn").click(updateParameterSamples);
	}
	
	//-------------------------------------------
	//
	// Code mirror dimensions setup
	//
	//-------------------------------------------
	
	/// Default parameter function
	var dimensionsDefaultFunction = ""+
		"function(size) {\n"+
		"	return [size];\n"+
		"}";
		
	/// The dimension generator code mirror
	var CM_dimension = null;
	
	/// Get the configured dim functions
	function getDimensionFunction() {
		var ret = null;
		try {
			eval("ret = "+CM_dimension.getValue());
		} catch(e) {
			$("#dim_sample").html(e.toString());
			console.error("Failed to process dimension function", e);
			alert("Failed to process dimension function : "+e);
			return null;
		}
		return ret;
	}
	
	/// Update the dim sample
	function updateDimensionSample() {
		// Get the dim function
		var dimFunc = getDimensionFunction();
		
		if( dimFunc == null ) {
			return;
		}
		
		// Get demo sample size
		var sample_size = parseInt($("#sample_size").val());
		var res = dimFunc(sample_size);
		
		$("#dim_sample").html(JSON.stringify(res));
	}
	
	/// Setup the dimensions generator
	function setupDimensionGenerator() {
		CM_dimension = CodeMirror.fromTextArea( document.getElementById("dim_function"), CM_defaultConfig);
		
		// Reset the value
		CM_dimension.setValue(dimensionsDefaultFunction);
		
		// Block edits for first and last line
		CM_dimension.on('beforeChange', CM_blockFirstAndLastLine);
		
		// Dimension samples
		$("#paramset_btn").click(updateDimensionSample);
	}
	
	//-------------------------------------------
	//
	// Code mirror kernel setup
	//
	//-------------------------------------------
	
	/// Kernel code mirror object
	var CM_kernel = null;
	
	/// Default parameter function
	var kernelDefaultFunction = ""+
		"function kernel(A,B) {\n"+
		"	var sum = 0;\n"+
		"	for (var i=0; i<512; i++) {\n"+
		"		sum = Math.pow((A[this.thread.x]-sum)/B[this.thread.x],2);\n"+
		"	}\n"+
		"	return sum;\n"+
		"}";
	
	/// One time setup of the kernel editor
	function setupKernelEditor() {
		
		// Setup the kernel code mirror
		var kernel_textArea = document.getElementById("kernel_function");
		CM_kernel = CodeMirror.fromTextArea(kernel_textArea, CM_defaultConfig);
		
		// Reset the value 
		CM_kernel.setValue(kernelDefaultFunction);
		
		// Block edits for first and last line
		CM_kernel.on('beforeChange', CM_blockFirstAndLastLine);
		
		// Setup the kernel sample click call
		$("#kernel_sample_btn").click(updateKernelSampleDisplay);
	}
	
	//-------------------------------------------
	//
	// Kernel arguments / sample preperation
	//
	//-------------------------------------------
	
	/// Get the kernel raw JS function
	function getKernelRawFunction() {
		var ret = null;
		try {
			eval("ret = "+CM_kernel.getValue());
		} catch(e) {
			$("#kernel_sample").html(e.toString());
			console.error("Failed to process kernel function", e);
			alert("Failed to process kernel function : "+e);
			return null;
		}
		return ret;
	}
	
	/// Generate the paramater set
	function getKernelParameters(sampleSize, paramFunctions) {
		if(paramFunctions == null) {
			paramFunctions = getParameterFunctions();
		}
		var ret = [];
		if(paramFunctions == null) {
			return ret;
		}
		
		var rand_seed = rand_seed_jqDom.val();
		var pCount = paramFunctions.length;
		for(var p=0; p<pCount; ++p) {
			ret[p] = paramFunctions[p](sampleSize, getRandom(p, sampleSize, rand_seed));
		}
		
		return ret;
	}
	
	/// Generate the kernel sample result
	function getKernelSampleResult(sampleSize) {
		var rawFunction = getKernelRawFunction();
		var dimFunction = getDimensionFunction();
		var paramFunctions = getParameterFunctions();
		
		var gpu = new GPU();
		var ker = gpu.createKernel(rawFunction,{
			dimensions : dimFunction(sampleSize)
		});
		
		var args = getKernelParameters(sampleSize, paramFunctions);
		return ker.apply(ker, args);
	}
	
	/// Update the kernel sample results
	function updateKernelSampleDisplay() {
		// Forces the paramset button to update the param samples
		$("#paramset_btn").click();
		
		// Get demo sample size
		var sample_size = parseInt($("#sample_size").val());
		
		// Get kernel sample result
		var res = getKernelSampleResult(sample_size);
		//console.log("Kernel code sample result : ", res);
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
		var dimFunction = getDimensionFunction();
		var paramFunctions = getParameterFunctions();
		
		var gpu = new GPU();
		var kernel = gpu.createKernel(rawFunction,{
			dimensions : dimFunction(sampleSize),
			mode : mode
		});
		
		var args = getKernelParameters(sampleSize, paramFunctions);
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
				gain_per = cpu_time / gpu_time * 100.0 - 100.0;
			} else {
				gain_per = -(gpu_time / cpu_time * 100.0) + 100.0;
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
	setupParameterGenerator();
	setupDimensionGenerator();
	setupKernelEditor();
	setupBenchmarking();
	
	window.CM_kernel = CM_kernel;
	window.updateKernelSampleDisplay = updateKernelSampleDisplay;
	window.singleBenchmark = singleBenchmark;
	window.updateBenchmarkDisplay = updateBenchmarkDisplay;
	
	window.bench_time_chartist = bench_time_chartist;
	window.bench_gain_chartist = bench_gain_chartist;
});
