// this is actually equiv to
// return this.thread.y * 3 + this.thread.x;
const input = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];

function buildToStringKernelResult(mode) {
	const gpu = new GPU({ mode });
	const kernel = gpu.createKernel(function(inp) {
		return inp[this.thread.y][this.thread.x];
	}, {
		output: [3, 3]
	});
	return kernel(input);
  }

  console.log(buildToStringKernelResult());
  
  QUnit.test('Issue #241 small 2d array input output test (auto)', () => {
	QUnit.assert.deepEqual(buildToStringKernelResult(), input);
  });
  
  QUnit.test('Issue #241 small 2d array input output test (gpu)', () => {
	QUnit.assert.deepEqual(buildToStringKernelResult('gpu'), input);
  });
  
  QUnit.test('Issue #241 small 2d array input output test (webgl)', () => {
	QUnit.assert.deepEqual(buildToStringKernelResult('webgl'), input);
  });
  
  QUnit.test('Issue #241 small 2d array input output test (webgl2)', () => {
	QUnit.assert.deepEqual(buildToStringKernelResult('webgl2'), input);
  });
  
  QUnit.test('Issue #241 small 2d array input output test (cpu)', () => {
	const result = buildToStringKernelResult('cpu');
	console.log(result);
	QUnit.assert.deepEqual(result, input);
  });