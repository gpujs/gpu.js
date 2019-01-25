(function() {
	const GPU = require('../../src/index');
	const WIDTH = 600;
	const HEIGHT = 400;
	function test(mode) {
		const gpu = new GPU({ mode });

		const initMatrix = gpu.createKernel(function(value) {
			return value;
		})
			.setOutput([WIDTH, HEIGHT]);

		const render = gpu.createKernel(function(matrix) {
			const i = matrix[this.thread.y][this.thread.x];
			this.color(i, i, i, 1);
		})
			.setOutput([WIDTH, HEIGHT])
			.setGraphical(true);

		const matrix = initMatrix(0.5);
		render(matrix);
		const canvas = render.getCanvas();
		QUnit.assert.equal(canvas.width, WIDTH);
		QUnit.assert.equal(canvas.height, HEIGHT);
		gpu.destroy();
	}

	QUnit.test('Issue #279 wrong canvas size - cpu', () => {
		test('cpu');
	});

	QUnit.test('Issue #279 wrong canvas size - gpu', () => {
		test('gpu');
	});

	(GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('Issue #279 wrong canvas size - webgl', () => {
		test('webgl');
	});

	(GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('Issue #279 wrong canvas size - webgl2', () => {
		test('webgl2');
	});

	(GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('Issue #279 wrong canvas size - headlessgl', () => {
		test('headlessgl');
	});
})();
