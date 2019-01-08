(function() {
	var WIDTH = 600;
	var HEIGHT = 400;
	var gpu;
	function buildKernel(mode) {
		gpu = new GPU({ mode });

		var initMatrix = gpu.createKernel(function(value) {  
			return value;
		})
			.setOutput([WIDTH, HEIGHT]);

		var render = gpu.createKernel(function(matrix) {
			var i = matrix[this.thread.y][this.thread.x];
			this.color(i, i, i, 1);
		})
			.setOutput([WIDTH, HEIGHT])
			.setGraphical(true);

		var matrix = initMatrix(0.5);
		render(matrix);
		return render;
	}
	
	QUnit.test('Issue #279 wrong canvas size - auto', () => {
		var canvas = buildKernel().getCanvas();
		QUnit.assert.equal(canvas.width, WIDTH);
		QUnit.assert.equal(canvas.height, HEIGHT);
		gpu.destroy();
	});

	QUnit.test('Issue #279 wrong canvas size - cpu', () => {
		var canvas = buildKernel('cpu').getCanvas();
		QUnit.assert.equal(canvas.width, WIDTH);
		QUnit.assert.equal(canvas.height, HEIGHT);
		gpu.destroy();
	});

	QUnit.test('Issue #279 wrong canvas size - gpu', () => {
		var canvas = buildKernel('gpu').getCanvas();
		QUnit.assert.equal(canvas.width, WIDTH);
		QUnit.assert.equal(canvas.height, HEIGHT);
		gpu.destroy();
	});

	QUnit.test('Issue #279 wrong canvas size - webgl', () => {
		var canvas = buildKernel('webgl').getCanvas();
		QUnit.assert.equal(canvas.width, WIDTH);
		QUnit.assert.equal(canvas.height, HEIGHT);
		gpu.destroy();
	});

	QUnit.test('Issue #279 wrong canvas size - webgl2', () => {
		var canvas = buildKernel('webgl2').getCanvas();
		QUnit.assert.equal(canvas.width, WIDTH);
		QUnit.assert.equal(canvas.height, HEIGHT);
		gpu.destroy();
	});
	
  })();