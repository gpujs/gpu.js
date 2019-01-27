(function() {
  const GPU = require('../../src/index');
  function createPropertyKernels(gpu, output) {
    function divide(v1, v2) {
      return v1 / v2;
    }
    const adder = GPU.alias('adder', function add(v1, v2) {
      return v1 + v2;
    });
    return gpu.createKernelMap({
      addResult: adder,
      divideResult: divide
    }, function (a, b, c) {
      return divide(adder(a[this.thread.x], b[this.thread.x]), c[this.thread.x]);
    }).setOutput(output);
  }

  function createArrayKernels(gpu, output) {
    function add(v1, v2) {
      return v1 + v2;
    }
    function divide(v1, v2) {
      return v1 / v2;
    }
    return gpu.createKernelMap([
      add, divide
    ], function (a, b, c) {
      return divide(add(a[this.thread.x], b[this.thread.x]), c[this.thread.x]);
    }).setOutput(output)
  }


  function createKernel(gpu, output) {
    return gpu.createKernel(function (a) {
      return a[this.thread.x];
    }).setOutput(output);
  }

  QUnit.test('createKernelMap object 1 dimension 1 length (auto)', () => {
    const gpu = new GPU({mode: null});
    const superKernel = createPropertyKernels(gpu, [1]);
    const kernel = createKernel(gpu, [1]);
    const output = superKernel([2], [2], [0.5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], kernel(output.addResult));
    const divideResult = QUnit.extend([], kernel(output.divideResult));
    QUnit.assert.deepEqual(result, [8]);
    QUnit.assert.deepEqual(addResult, [4]);
    QUnit.assert.deepEqual(divideResult, [8]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap object 1 dimension 1 length (gpu)', () => {
    const gpu = new GPU({mode: 'gpu'});
    const superKernel = createPropertyKernels(gpu, [1]);
    const kernel = createKernel(gpu, [1]);
    const output = superKernel([2], [2], [0.5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], kernel(output.addResult));
    const divideResult = QUnit.extend([], kernel(output.divideResult));
    QUnit.assert.deepEqual(result, [8]);
    QUnit.assert.deepEqual(addResult, [4]);
    QUnit.assert.deepEqual(divideResult, [8]);
    gpu.destroy();
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('createKernelMap object 1 dimension 1 length (webgl)', function () {
    const gpu = new GPU({mode: 'webgl'});
    const superKernel = createPropertyKernels(gpu, [1]);
    const kernel = createKernel(gpu, [1]);
    const output = superKernel([2], [2], [0.5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], kernel(output.addResult));
    const divideResult = QUnit.extend([], kernel(output.divideResult));
    QUnit.assert.deepEqual(result, [8]);
    QUnit.assert.deepEqual(addResult, [4]);
    QUnit.assert.deepEqual(divideResult, [8]);
    gpu.destroy();
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('createKernelMap object 1 dimension 1 length (webgl2)', function () {
    const gpu = new GPU({mode: 'webgl2'});
    const superKernel = createPropertyKernels(gpu, [1]);
    const kernel = createKernel(gpu, [1]);
    const output = superKernel([2], [2], [0.5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], kernel(output.addResult));
    const divideResult = QUnit.extend([], kernel(output.divideResult));
    QUnit.assert.deepEqual(result, [8]);
    QUnit.assert.deepEqual(addResult, [4]);
    QUnit.assert.deepEqual(divideResult, [8]);
    gpu.destroy();
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('createKernelMap object 1 dimension 1 length (headlessgl)', function () {
    const gpu = new GPU({mode: 'headlessgl'});
    const superKernel = createPropertyKernels(gpu, [1]);
    const kernel = createKernel(gpu, [1]);
    const output = superKernel([2], [2], [0.5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], kernel(output.addResult));
    const divideResult = QUnit.extend([], kernel(output.divideResult));
    QUnit.assert.deepEqual(result, [8]);
    QUnit.assert.deepEqual(addResult, [4]);
    QUnit.assert.deepEqual(divideResult, [8]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap object 1 dimension 1 length (cpu)', () => {
    const gpu = new GPU({mode: 'cpu'});
    const superKernel = createPropertyKernels(gpu, [1]);
    const kernel = createKernel(gpu, [1]);
    const output = superKernel([2], [2], [0.5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], kernel(output.addResult));
    const divideResult = QUnit.extend([], kernel(output.divideResult));
    QUnit.assert.deepEqual(result, [8]);
    QUnit.assert.deepEqual(addResult, [4]);
    QUnit.assert.deepEqual(divideResult, [8]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap array 1 dimension 1 length (auto)', () => {
    const gpu = new GPU({mode: null});
    const superKernel = createArrayKernels(gpu, [1]);
    const kernel = createKernel(gpu, [1]);
    const output = superKernel([2], [2], [0.5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], kernel(output[0]));
    const divideResult = QUnit.extend([], kernel(output[1]));
    QUnit.assert.deepEqual(result, [8]);
    QUnit.assert.deepEqual(addResult, [4]);
    QUnit.assert.deepEqual(divideResult, [8]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap array 1 dimension 1 length (gpu)', () => {
    const gpu = new GPU({mode: 'gpu'});
    const superKernel = createArrayKernels(gpu, [1]);
    const kernel = createKernel(gpu, [1]);
    const output = superKernel([2], [2], [0.5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], kernel(output[0]));
    const divideResult = QUnit.extend([], kernel(output[1]));
    QUnit.assert.deepEqual(result, [8]);
    QUnit.assert.deepEqual(addResult, [4]);
    QUnit.assert.deepEqual(divideResult, [8]);
    gpu.destroy();
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('createKernelMap array 1 dimension 1 length (webgl)', function () {
    const gpu = new GPU({mode: 'webgl'});
    const superKernel = createArrayKernels(gpu, [1]);
    const kernel = createKernel(gpu, [1]);
    const output = superKernel([2], [2], [0.5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], kernel(output[0]));
    const divideResult = QUnit.extend([], kernel(output[1]));
    QUnit.assert.deepEqual(result, [8]);
    QUnit.assert.deepEqual(addResult, [4]);
    QUnit.assert.deepEqual(divideResult, [8]);
    gpu.destroy();
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('createKernelMap array 1 dimension 1 length (webgl2)', function () {
    const gpu = new GPU({mode: 'webgl2'});
    const superKernel = createArrayKernels(gpu, [1]);
    const kernel = createKernel(gpu, [1]);
    const output = superKernel([2], [2], [0.5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], kernel(output[0]));
    const divideResult = QUnit.extend([], kernel(output[1]));
    QUnit.assert.deepEqual(result, [8]);
    QUnit.assert.deepEqual(addResult, [4]);
    QUnit.assert.deepEqual(divideResult, [8]);
    gpu.destroy();
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('createKernelMap array 1 dimension 1 length (headlessgl)', function () {
    const gpu = new GPU({mode: 'headlessgl'});
    const superKernel = createArrayKernels(gpu, [1]);
    const kernel = createKernel(gpu, [1]);
    const output = superKernel([2], [2], [0.5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], kernel(output[0]));
    const divideResult = QUnit.extend([], kernel(output[1]));
    QUnit.assert.deepEqual(result, [8]);
    QUnit.assert.deepEqual(addResult, [4]);
    QUnit.assert.deepEqual(divideResult, [8]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap array 1 dimension 1 length (cpu)', () => {
    const gpu = new GPU({mode: 'cpu'});
    const superKernel = createArrayKernels(gpu, [1]);
    const output = superKernel([2], [2], [0.5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], output[0]);
    const divideResult = QUnit.extend([], output[1]);
    QUnit.assert.deepEqual(result, [8]);
    QUnit.assert.deepEqual(addResult, [4]);
    QUnit.assert.deepEqual(divideResult, [8]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap object 1 dimension 5 length (auto)', () => {
    const gpu = new GPU({mode: null});
    const superKernel = createPropertyKernels(gpu, [5]);
    const kernel = createKernel(gpu, [5]);
    const output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], kernel(output.addResult));
    const divideResult = QUnit.extend([], kernel(output.divideResult));
    QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
    QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap object 1 dimension 5 length (gpu)', () => {
    const gpu = new GPU({mode: 'gpu'});
    const superKernel = createPropertyKernels(gpu, [5]);
    const kernel = createKernel(gpu, [5]);
    const output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], kernel(output.addResult));
    const divideResult = QUnit.extend([], kernel(output.divideResult));
    QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
    QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
    gpu.destroy();
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('createKernelMap object 1 dimension 5 length (webgl)', function () {
    const gpu = new GPU({mode: 'webgl'});
    const superKernel = createPropertyKernels(gpu, [5]);
    const kernel = createKernel(gpu, [5]);
    const output = superKernel([1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], kernel(output.addResult));
    const divideResult = QUnit.extend([], kernel(output.divideResult));
    QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
    QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
    gpu.destroy();
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('createKernelMap object 1 dimension 5 length (webgl2)', function () {
    const gpu = new GPU({mode: 'webgl2'});
    const superKernel = createPropertyKernels(gpu, [5]);
    const kernel = createKernel(gpu, [5]);
    const output = superKernel([1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], kernel(output.addResult));
    const divideResult = QUnit.extend([], kernel(output.divideResult));
    QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
    QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
    gpu.destroy();
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('createKernelMap object 1 dimension 5 length (headlessgl)', function () {
    const gpu = new GPU({mode: 'headlessgl'});
    const superKernel = createPropertyKernels(gpu, [5]);
    const kernel = createKernel(gpu, [5]);
    const output = superKernel([1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], kernel(output.addResult));
    const divideResult = QUnit.extend([], kernel(output.divideResult));
    QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
    QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap object 1 dimension 5 length (cpu)', () => {
    const gpu = new GPU({mode: 'cpu'});
    const superKernel = createPropertyKernels(gpu, [5]);
    const kernel = createKernel(gpu, [5]);
    const output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], kernel(output.addResult));
    const divideResult = QUnit.extend([], kernel(output.divideResult));
    QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
    QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap array (auto)', () => {
    const gpu = new GPU({mode: null});
    const superKernel = createArrayKernels(gpu, [5]);
    const kernel = createKernel(gpu, [5]);
    const output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], kernel(output[0]));
    const divideResult = QUnit.extend([], kernel(output[1]));
    QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
    QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap array (gpu)', () => {
    const gpu = new GPU({mode: 'gpu'});
    const superKernel = createArrayKernels(gpu, [5]);
    const kernel = createKernel(gpu, [5]);
    const output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], kernel(output[0]));
    const divideResult = QUnit.extend([], kernel(output[1]));
    QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
    QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
    gpu.destroy();
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('createKernelMap array (webgl)', function () {
    const gpu = new GPU({mode: 'webgl'});
    const superKernel = createArrayKernels(gpu, [5]);
    const kernel = createKernel(gpu, [5]);
    const output = superKernel([1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], kernel(output[0]));
    const divideResult = QUnit.extend([], kernel(output[1]));
    QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
    QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
    gpu.destroy();
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('createKernelMap array (webgl2)', function () {
    const gpu = new GPU({mode: 'webgl2'});
    const superKernel = createArrayKernels(gpu, [5]);
    const kernel = createKernel(gpu, [5]);
    const output = superKernel([1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], kernel(output[0]));
    const divideResult = QUnit.extend([], kernel(output[1]));
    QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
    QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
    gpu.destroy();
  });

  (GPU.isHeadlessGLSupported ? QUnit.test : QUnit.skip)('createKernelMap array (headlessgl)', function () {
    const gpu = new GPU({mode: 'headlessgl'});
    const superKernel = createArrayKernels(gpu, [5]);
    const kernel = createKernel(gpu, [5]);
    const output = superKernel([1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], kernel(output[0]));
    const divideResult = QUnit.extend([], kernel(output[1]));
    QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
    QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap array (cpu)', () => {
    const gpu = new GPU({mode: 'cpu'});
    const superKernel = createArrayKernels(gpu, [5]);
    const output = superKernel([1,2,3,4,5], [1,2,3,4,5], [1,2,3,4,5]);
    const result = QUnit.extend([], output.result);
    const addResult = QUnit.extend([], output[0]);
    const divideResult = QUnit.extend([], output[1]);
    QUnit.assert.deepEqual(result, [2, 2, 2, 2, 2]);
    QUnit.assert.deepEqual(addResult, [2, 4, 6, 8, 10]);
    QUnit.assert.deepEqual(divideResult, [2, 2, 2, 2, 2]);
    gpu.destroy();
  });

  QUnit.test('createKernelMap 3d (auto)', () => {
    const gpu = new GPU();
    function saveTarget(value) {
      return value;
    }
    const kernel = gpu.createKernelMap({
      target: saveTarget
    }, function(value) {
      return saveTarget(value);
    }).setOutput([3,3,3]);
    const result = kernel(1);
    const target = createKernel(gpu, [3,3,3])(result.target);
    QUnit.assert.equal(result.result.length, 3);
    QUnit.assert.equal(result.result[0].length, 3);
    QUnit.assert.equal(result.result[0][0].length, 3);

    QUnit.assert.equal(target.length, 3);
    QUnit.assert.equal(target[0].length, 3);
    QUnit.assert.equal(target[0][0].length, 3);
    gpu.destroy();
  });

  QUnit.test('createKernelMap 3d (gpu)', () => {
    const gpu = new GPU({ mode: 'gpu' });
    function saveTarget(value) {
      return value;
    }
    const kernel = gpu.createKernelMap({
      target: saveTarget
    }, function(value) {
      return saveTarget(value);
    }).setOutput([3,3,3]);
    const result = kernel(1);
    const target = createKernel(gpu, [3,3,3])(result.target);
    QUnit.assert.equal(result.result.length, 3);
    QUnit.assert.equal(result.result[0].length, 3);
    QUnit.assert.equal(result.result[0][0].length, 3);

    QUnit.assert.equal(target.length, 3);
    QUnit.assert.equal(target[0].length, 3);
    QUnit.assert.equal(target[0][0].length, 3);
    gpu.destroy();
  });

  (GPU.isWebGLSupported ? QUnit.test : QUnit.skip)('createKernelMap 3d (webgl)', function () {
    const gpu = new GPU({mode: 'webgl'});
    function saveTarget(value) {
      return value;
    }
    const kernel = gpu.createKernelMap({
      target: saveTarget
    }, function (value) {
      return saveTarget(value);
    }).setOutput([3, 3, 3]);
    const result = kernel(1);
    const target = createKernel(gpu, [3, 3, 3])(result.target);
    QUnit.assert.equal(result.result.length, 3);
    QUnit.assert.equal(result.result[0].length, 3);
    QUnit.assert.equal(result.result[0][0].length, 3);

    QUnit.assert.equal(target.length, 3);
    QUnit.assert.equal(target[0].length, 3);
    QUnit.assert.equal(target[0][0].length, 3);
    gpu.destroy();
  });

  (GPU.isWebGL2Supported ? QUnit.test : QUnit.skip)('createKernelMap 3d (webgl2)', function () {
    const gpu = new GPU({mode: 'webgl2'});
    function saveTarget(value) {
      return value;
    }
    const kernel = gpu.createKernelMap({
      target: saveTarget
    }, function (value) {
      return saveTarget(value);
    }).setOutput([3, 3, 3]);
    const result = kernel(1);
    const target = createKernel(gpu, [3, 3, 3])(result.target);
    QUnit.assert.equal(result.result.length, 3);
    QUnit.assert.equal(result.result[0].length, 3);
    QUnit.assert.equal(result.result[0][0].length, 3);

    QUnit.assert.equal(target.length, 3);
    QUnit.assert.equal(target[0].length, 3);
    QUnit.assert.equal(target[0][0].length, 3);
    gpu.destroy();
  });

  (GPU.isHeadlessGLSupported && GPU.HeadlessGLKernel.features.kernelMap ? QUnit.test : QUnit.skip)('createKernelMap 3d (headlessgl)', function () {
    const gpu = new GPU({mode: 'headlessgl'});
    function saveTarget(value) {
      return value;
    }
    const kernel = gpu.createKernelMap({
      target: saveTarget
    }, function (value) {
      return saveTarget(value);
    }).setOutput([3, 3, 3]);
    const result = kernel(1);
    const target = createKernel(gpu, [3, 3, 3])(result.target);
    QUnit.assert.equal(result.result.length, 3);
    QUnit.assert.equal(result.result[0].length, 3);
    QUnit.assert.equal(result.result[0][0].length, 3);

    QUnit.assert.equal(target.length, 3);
    QUnit.assert.equal(target[0].length, 3);
    QUnit.assert.equal(target[0][0].length, 3);
    gpu.destroy();
  });

  QUnit.test('createKernelMap 3d (cpu)', () => {
    const gpu = new GPU({ mode: 'cpu' });
    function saveTarget(value) {
      return value;
    }
    const kernel = gpu.createKernelMap({
      target: saveTarget
    }, function(value) {
      return saveTarget(value);
    }).setOutput([3,3,3]);
    const result = kernel(1);
    QUnit.assert.equal(result.result.length, 3);
    QUnit.assert.equal(result.result[0].length, 3);
    QUnit.assert.equal(result.result[0][0].length, 3);

    QUnit.assert.equal(result.target.length, 3);
    QUnit.assert.equal(result.target[0].length, 3);
    QUnit.assert.equal(result.target[0][0].length, 3);
    gpu.destroy();
  });
})();
