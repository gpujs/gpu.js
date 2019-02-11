const { assert, skip, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

describe('get canvas');

function getCanvasTest(mode ) {
  const gpu = new GPU();

  assert.ok(gpu.context === null, 'context is initially null');
  assert.ok(gpu.canvas === null, 'canvas is initially null');

  const render = gpu.createKernel(function() {
    this.color(0, 0, 0, 1);
  }, {
    output : [30,30],
    mode : mode
  }).setGraphical(true);

  assert.ok(render !== null, 'function generated test');
  assert.ok(render.canvas, 'testing for canvas after createKernel' );
  assert.ok(render.context, 'testing for context after createKernel' );
  assert.ok(gpu.canvas, 'testing for canvas after createKernel' );
  assert.ok(gpu.context, 'testing for context after createKernel' );

  render();

  assert.ok(render.canvas, 'testing for canvas after render' );
  assert.ok(render.context, 'testing for context after render' );
  assert.ok(gpu.canvas, 'testing for canvas after render' );
  assert.ok(gpu.context, 'testing for context after render' );

  assert.equal(render.canvas, gpu.canvas);
  assert.equal(render.context, gpu.context);

  gpu.destroy();
}

test('auto', () => {
  getCanvasTest(null);
});

test('gpu', () => {
  getCanvasTest('gpu');
});

(GPU.isWebGLSupported ? test : skip)('webgl', () => {
  getCanvasTest('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('webgl2', () => {
  getCanvasTest('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('headlessgl', () => {
  getCanvasTest('headlessgl');
});

test('cpu', () => {
  getCanvasTest('cpu');
});
