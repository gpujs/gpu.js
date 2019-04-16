const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('issue #279');

// TODO: handle without optimizeFloatMemory = true
const WIDTH = 600;
const HEIGHT = 	400;
function wrongCanvasSize(mode) {
	const gpu = new GPU({ mode });

	const initMatrix = gpu.createKernel(function(value) {
		return value;
	})
		.setOptimizeFloatMemory(true)
		.setOutput([WIDTH, HEIGHT]);

	const render = gpu.createKernel(function(matrix) {
		const i = matrix[this.thread.y][this.thread.x];
		this.color(i, i, i, 1);
	})
		.setOutput([WIDTH, HEIGHT])
		.setGraphical(true);

	const matrix = initMatrix(0.5);
	render(matrix);
	const canvas = render.canvas;
	assert.equal(canvas.width, WIDTH);
	assert.equal(canvas.height, HEIGHT);
	gpu.destroy();
}

(GPU.isCanvasSupported ? test : skip)('Issue #279 wrong canvas size - cpu', () => {
	wrongCanvasSize('cpu');
});

test('Issue #279 wrong canvas size - gpu', () => {
	wrongCanvasSize('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Issue #279 wrong canvas size - webgl', () => {
	wrongCanvasSize('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Issue #279 wrong canvas size - webgl2', () => {
	wrongCanvasSize('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Issue #279 wrong canvas size - headlessgl', () => {
	wrongCanvasSize('headlessgl');
});
