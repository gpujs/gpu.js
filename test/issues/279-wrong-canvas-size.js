(function() {
	var WIDTH = 600;
	var HEIGHT = 400;
	function buildKernel(mode) {
		var gpu = new GPU({ mode });

		
		var body;

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
	
	QUnit.test('Issue #314 Large array addressing - auto', () => {
		
		var canvas = buildKernel().getCanvas();
		QUnit.assert.equal(canvas.width, WIDTH);
		QUnit.assert.equal(canvas.height, HEIGHT);
	});

	// QUnit.test('Issue #314 Large array addressing - gpu', () => {
	// 	QUnit.assert.equal(buildKernel('gpu')[DATA_MAX-1], data[DATA_MAX-1]);
	// });

	// QUnit.test('Issue #314 Large array addressing - webgl', () => {
	// 	QUnit.assert.equal(buildKernel('webgl')[DATA_MAX-1], data[DATA_MAX-1]);
	// });

	// QUnit.test('Issue #314 Large array addressing - webgl2', () => {
	// 	var result = buildKernel('webgl2')
	// 	var same = true;
	// 	for (var i = 0; i < DATA_MAX; i++) {
	// 		if (!result[i] == data[i]) {
	// 			same = false;
	// 			break;
	// 		}
	// 	}
	// 	QUnit.assert.ok(same, "not all elements are the same, failed on index:" + i);
	// });
	
  })();