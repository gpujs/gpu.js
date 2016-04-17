$(function() {
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
	
	(function updateParamsList() {
		
	})();
	
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
			CM_kernel.setValue("function kernel(A,B) {\n	return (A[this.thread.x] * B[this.thread.x]);\n}")
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
	
	/// Generate the kernel sample result
	function getKernelSampleResult(sampleSize) {
		var raw = getKernelRawFunction();
		var gpu = new GPU();
		var ker = gpu.createKernel(raw,{
			dimensions : [sampleSize]
		});
		
		var args = getKernelArguments(sampleSize);
		return ker.apply(ker, args);
	}
	
	function updateKernelSampleDisplay() {
		// Fixed sample size @TODO implmentation
		var res = getKernelSampleResult(10);
		console.log("Kernel code sample result : ", res);
		$("#kernel_sample").html( JSON.stringify(res) );
	}
	
	// The various setup actual call
	setupInputNumbers();
	setupKernelEditor();
	
	window.CM_kernel = CM_kernel;
	window.updateKernelSampleDisplay = updateKernelSampleDisplay;
});
