(function() {

	// unfortunately there is a bit of a manual process to check this properly!
	// 1 - check there are no warnings in the log when running ALL tests
	// 2 - check heap snapshots

	// run the following code in the console
	function run() {
		var gpu = new GPU({ mode: 'webgl' });
		var kernel1 = gpu.createKernel(function() {
			return this.thread.y * this.thread.x;
		}, {
			output: [1024, 1024]
		})
		kernel1();
		gpu.destroy();
		gpu = new GPU({ mode: 'webgl2' });
		var kernel2 = gpu.createKernel(function() {
			return this.thread.y * this.thread.x;
		}, {
			output: [1024, 1024]
		})
		kernel2();
		gpu.destroy();
	}
	// then do a heap snapshot
	// then run() in the console
	// do another heap snapshot and compare the differences...
	// 


	var input = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];

	function manyKernels(mode, assert) {
		var done = assert.async();
		var thisIndex = 0;
		
		for (var i = 0; i < 20; i++) {
			setTimeout(function() {
				// breakpoint 1 here
				var gpu = new GPU({ mode });
				var kernel = gpu.createKernel(function(inp) {
					return inp[this.thread.y][this.thread.x];
				}, {
					output: [3, 3]
				});
				var kernel2 = gpu.createKernel(function() {
					return this.thread.y * this.thread.x;
				}, {
					output: [1024, 1024]
				}).setOutputToTexture(true);
				kernel(input);
				kernel2();
				if (kernel._webGl !== kernel2._webGl) {
					assert.ok(false, "webgls should be the same object")
				}
				gpu.destroy();
				thisIndex++;
				if (thisIndex > 19) {
					setTimeout(function() {
						// breakpoint 2 here 
						assert.ok(true)
						done()
					}, 0)
				}
			}, 0);
		}
	}
	
	QUnit.test('Issue #174 - webgl context leak - !!! do manual tests !!! (webgl)', function(assert) {
		manyKernels('webgl', assert);
	});
	
	QUnit.test('Issue #174 - webgl context leak - !!! do manual tests !!! (webgl2)', function(assert) {
		manyKernels('webgl2', assert);
	});
})()