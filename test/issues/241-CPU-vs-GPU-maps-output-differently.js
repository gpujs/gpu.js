
(function() {
	// this is actually equiv to
	// return this.thread.y * 3 + this.thread.x;
	var input = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
	var gpu;
	function buildIndexTestKernel(mode) {
		gpu = new GPU({ mode });
		var kernel = gpu.createKernel(function(inp) {
			return inp[this.thread.y][this.thread.x];
		}, {
			output: [3, 3]
		});
		return kernel(input);
	}
	
	QUnit.test('Issue #241 small 2d array input output test (auto)', function() {
		QUnit.assert.deepValueEqual(buildIndexTestKernel(), input);
		gpu.destroy();
	});
	
	QUnit.test('Issue #241 small 2d array input output test (gpu)', function() {
		QUnit.assert.deepValueEqual(buildIndexTestKernel('gpu'), input);
		gpu.destroy();
	});
	
	QUnit.test('Issue #241 small 2d array input output test (webgl)', function() {
		QUnit.assert.deepValueEqual(buildIndexTestKernel('webgl'), input);
		gpu.destroy();
	});
	
	QUnit.test('Issue #241 small 2d array input output test (webgl2)', function() {
		QUnit.assert.deepValueEqual(buildIndexTestKernel('webgl2'), input);
		gpu.destroy();
	});
	
	QUnit.test('Issue #241 small 2d array input output test (cpu)', function() {		
		QUnit.assert.deepValueEqual(buildIndexTestKernel('cpu'), input);
		gpu.destroy();
	});
})()