function combineKernels(mode) {
	var gpu = new GPU({ mode: mode });

	var kernel1 = gpu.createKernel(function(a, b) {
		return a[this.thread.x] + b[this.thread.x];
	}, { output: [5] });

	var kernel2 = gpu.createKernel(function(c, d) {
		return c[this.thread.x] * d[this.thread.x];
	}, { output: [5] });

	return gpu.combineKernels(kernel1, kernel2, function(array1, array2, array3) {
		return kernel2(kernel1(array1, array2), array3);
	});
}

QUnit.test( "combineKernels (auto)", function() {
	var superKernel = combineKernels(null);
	var result = QUnit.extend([], superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]));
	QUnit.assert.deepEqual(result, [2, 8, 18, 32, 50]);
});

QUnit.test( "combineKernels (WebGL)", function() {
	var superKernel = combineKernels('webgl');
	var result = QUnit.extend([], superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]));
	QUnit.assert.deepEqual(result, [2, 8, 18, 32, 50]);
});

QUnit.test( "combineKernels (CPU)", function() {
	var superKernel = combineKernels('cpu');
	var result = QUnit.extend([], superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]));
	QUnit.assert.deepEqual(result, [2, 8, 18, 32, 50]);
});