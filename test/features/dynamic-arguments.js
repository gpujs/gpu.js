const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU, input } = require('../../src');

describe('features: dynamic arguments');

function testHTMLImage(done, mode) {
  const image1 = new Image();
  const image2 = new Image();
  image1.src = 'jellyfish.jpeg';
  image2.src = 'jellyfish-1.jpeg';
  let loadedCount = 0;
  image1.onload = image2.onload = () => {
    loadedCount++;
    if (loadedCount === 2) loaded();
  };

  function loaded() {
    const gpu = new GPU({ mode });
    const kernel = gpu.createKernel(function(image) {
      const pixel = image[this.thread.y][this.thread.x];
      return (pixel[0] + pixel[1] + pixel[2]) / 3;
    })
      .setDynamicArguments(true)
      .setDynamicOutput(true)
      .setOutput([276, 183]);

    const pixels1 = kernel(image1);
    kernel.setOutput([138, 91]);
    const pixels2 = kernel(image2);

    assert.ok(pixels1[0][0] > .43);
    assert.ok(pixels1[0][0] < .45);
    assert.equal(pixels1.length, image1.height);
    assert.equal(pixels1[0].length, image1.width);
    assert.ok(pixels2[0][0] > .82);
    assert.ok(pixels2[0][0] < .83);
    assert.equal(pixels2.length, image2.height);
    assert.equal(pixels2[0].length, image2.width);

    gpu.destroy();
    done();
  }
}

(typeof Image !== 'undefined' ? test : skip)('HTML Image auto', t => {
  testHTMLImage(t.async());
});

(typeof Image !== 'undefined' && GPU.isWebGLSupported ? test : skip)('HTML Image webgl', t => {
  testHTMLImage(t.async(), 'webgl');
});

(typeof Image !== 'undefined' && GPU.isWebGL2Supported ? test : skip)('HTML Image webgl2', t => {
  testHTMLImage(t.async(), 'webgl2');
});

(typeof Image !== 'undefined' ? test : skip)('HTML Image cpu', t => {
  testHTMLImage(t.async(), 'cpu');
});

function testMemoryOptimizedNumberTexture(mode) {
  const gpu = new GPU({ mode });
  const matrix4X4 = [
    [1,2,3,4],
    [5,6,7,8],
    [9,10,11,12],
    [13,14,15,16],
  ];
  const texture4X4 = (
    gpu.createKernel(function(value) {
      return value[this.thread.y][this.thread.x];
    })
      .setOutput([4, 4])
      .setPrecision('single')
      .setOptimizeFloatMemory(true)
      .setPipeline(true)
  )(matrix4X4);

  const matrix3X3 = [
    [1,2,3],
    [4,5,6],
    [7,8,9]
  ];
  const texture3X3 = (
    gpu.createKernel(function(value) {
      return value[this.thread.y][this.thread.x];
    })
      .setOutput([3, 3])
      .setPrecision('single')
      .setOptimizeFloatMemory(true)
      .setPipeline(true)
  )(matrix3X3);

  const matrix2X2 = [
    [1,2],
    [3,4]
  ];
  const texture2X2 = (
    gpu.createKernel(function(value) {
      return value[this.thread.y][this.thread.x];
    })
      .setOutput([2, 2])
      .setPrecision('single')
      .setOptimizeFloatMemory(true)
      .setPipeline(true)
  )(matrix2X2);

  const kernel = gpu.createKernel(function(texture) {
    return texture[this.thread.y][this.thread.x];
  })
    .setDynamicArguments(true)
    .setDynamicOutput(true)
    .setOptimizeFloatMemory(true)
    .setOutput([4,4]);

  assert.deepEqual(kernel(texture4X4), [
    new Float32Array([1,2,3,4]),
    new Float32Array([5,6,7,8]),
    new Float32Array([9,10,11,12]),
    new Float32Array([13,14,15,16]),
  ]);

  kernel.setOutput([3, 3]);
  assert.deepEqual(kernel(texture3X3), [
    new Float32Array([1,2,3]),
    new Float32Array([4,5,6]),
    new Float32Array([7,8,9]),
  ]);

  kernel.setOutput([2, 2]);
  assert.deepEqual(kernel(texture2X2), [
    new Float32Array([1,2]),
    new Float32Array([3,4]),
  ]);

  assert.ok(kernel.kernelArguments[0].constructor.name.match('DynamicMemoryOptimizedNumberTexture'));

  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('MemoryOptimizedNumberTexture (GPU only) auto', () => {
  testMemoryOptimizedNumberTexture();
});

(GPU.isSinglePrecisionSupported ? test : skip)('MemoryOptimizedNumberTexture (GPU only) gpu', () => {
  testMemoryOptimizedNumberTexture('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('MemoryOptimizedNumberTexture (GPU only) webgl', () => {
  testMemoryOptimizedNumberTexture('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('MemoryOptimizedNumberTexture (GPU only) webgl2', () => {
  testMemoryOptimizedNumberTexture('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('MemoryOptimizedNumberTexture (GPU only) headlessgl', () => {
  testMemoryOptimizedNumberTexture('headlessgl');
});

function testNumberTexture(mode) {
  const gpu = new GPU({ mode });
  const matrix4X4 = [
    [1,2,3,4],
    [5,6,7,8],
    [9,10,11,12],
    [13,14,15,16],
  ];
  const texture4X4 = (
    gpu.createKernel(function(value) {
      return value[this.thread.y][this.thread.x];
    })
      .setOutput([4, 4])
      .setPrecision('single')
      .setPipeline(true)
  )(matrix4X4);

  const matrix3X3 = [
    [1,2,3],
    [4,5,6],
    [7,8,9]
  ];
  const texture3X3 = (
    gpu.createKernel(function(value) {
      return value[this.thread.y][this.thread.x];
    })
      .setOutput([3, 3])
      .setPrecision('single')
      .setPipeline(true)
  )(matrix3X3);

  const matrix2X2 = [
    [1,2],
    [3,4]
  ];
  const texture2X2 = (
    gpu.createKernel(function(value) {
      return value[this.thread.y][this.thread.x];
    })
      .setOutput([2, 2])
      .setPrecision('single')
      .setPipeline(true)
  )(matrix2X2);

  const kernel = gpu.createKernel(function(texture) {
    return texture[this.thread.y][this.thread.x];
  })
    .setDynamicArguments(true)
    .setDynamicOutput(true)
    .setOutput([4,4]);

  assert.deepEqual(kernel(texture4X4), [
    new Float32Array([1,2,3,4]),
    new Float32Array([5,6,7,8]),
    new Float32Array([9,10,11,12]),
    new Float32Array([13,14,15,16]),
  ]);

  kernel.setOutput([3, 3]);
  assert.deepEqual(kernel(texture3X3), [
    new Float32Array([1,2,3]),
    new Float32Array([4,5,6]),
    new Float32Array([7,8,9]),
  ]);

  kernel.setOutput([2, 2]);
  assert.deepEqual(kernel(texture2X2), [
    new Float32Array([1,2]),
    new Float32Array([3,4]),
  ]);

  assert.ok(kernel.kernelArguments[0].constructor.name.match('NumberTexture'));

  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('NumberTexture (GPU only) auto', () => {
  testNumberTexture();
});

(GPU.isSinglePrecisionSupported ? test : skip)('NumberTexture (GPU only) gpu', () => {
  testNumberTexture('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('NumberTexture (GPU only) webgl', () => {
  testNumberTexture('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('NumberTexture (GPU only) webgl2', () => {
  testNumberTexture('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('NumberTexture (GPU only) headlessgl', () => {
  testNumberTexture('headlessgl');
});

function testMixedNumberTexture(mode) {
  const gpu = new GPU({ mode });
  const matrix4X4 = [
    [1,2,3,4],
    [5,6,7,8],
    [9,10,11,12],
    [13,14,15,16],
  ];
  const texture4X4 = (
    gpu.createKernel(function(value) {
      return value[this.thread.y][this.thread.x];
    })
      .setOutput([4, 4])
      .setPrecision('single')
      .setOptimizeFloatMemory(true)
      .setPipeline(true)
  )(matrix4X4);

  const matrix3X3 = [
    [1,2,3],
    [4,5,6],
    [7,8,9]
  ];
  const texture3X3 = (
    gpu.createKernel(function(value) {
      return value[this.thread.y][this.thread.x];
    })
      .setOutput([3, 3])
      .setPrecision('single')
      .setOptimizeFloatMemory(true)
      .setPipeline(true)
  )(matrix3X3);

  const matrix2X2 = [
    [1,2],
    [3,4]
  ];
  const texture2X2 = (
    gpu.createKernel(function(value) {
      return value[this.thread.y][this.thread.x];
    })
      .setOutput([2, 2])
      .setPrecision('single')
      .setPipeline(true)
  )(matrix2X2);

  const kernel = gpu.createKernel(function(texture) {
    return texture[this.thread.y][this.thread.x];
  })
    .setDynamicArguments(true)
    .setDynamicOutput(true)
    .setOutput([4,4]);

  assert.deepEqual(kernel(texture4X4), [
    new Float32Array([1,2,3,4]),
    new Float32Array([5,6,7,8]),
    new Float32Array([9,10,11,12]),
    new Float32Array([13,14,15,16]),
  ]);

  kernel.setOutput([3, 3]);
  assert.deepEqual(kernel(texture3X3), [
    new Float32Array([1,2,3]),
    new Float32Array([4,5,6]),
    new Float32Array([7,8,9]),
  ]);

  kernel.setOutput([2, 2]);
  assert.deepEqual(kernel(texture2X2), [
    new Float32Array([1,2]),
    new Float32Array([3,4]),
  ]);

  assert.ok(kernel.kernelArguments[0].constructor.name.match('NumberTexture'));

  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('Mixed NumberTexture (GPU only) auto', () => {
  testMixedNumberTexture();
});

(GPU.isSinglePrecisionSupported ? test : skip)('Mixed NumberTexture (GPU only) gpu', () => {
  testMixedNumberTexture('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('Mixed NumberTexture (GPU only) webgl', () => {
  testMixedNumberTexture('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('Mixed NumberTexture (GPU only) webgl2', () => {
  testMixedNumberTexture('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('Mixed NumberTexture (GPU only) headlessgl', () => {
  testMixedNumberTexture('headlessgl');
});

function testSingleArray1D2(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v) {
    return v[this.thread.x];
  }, {
    argumentTypes: { v: 'Array1D(2)' },
    dynamicArguments: true,
    dynamicOutput: true
  });
  const expected1 = [
    new Float32Array([1,2]),
    new Float32Array([3,4]),
  ];
  kernel.setOutput([expected1.length]);
  assert.deepEqual(kernel(expected1), expected1);
  const expected2 = [
    new Float32Array([1,2]),
    new Float32Array([3,4]),
    new Float32Array([5,6]),
    new Float32Array([7,8]),
  ];
  kernel.setOutput([expected2.length]);
  assert.deepEqual(kernel(expected2), expected2);
  gpu.destroy();
}

test('Single Array1D2 auto', () => {
  testSingleArray1D2();
});

test('Single Array1D2 gpu', () => {
  testSingleArray1D2('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Single Array1D2 webgl', () => {
  testSingleArray1D2('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Single Array1D2 webgl2', () => {
  testSingleArray1D2('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Single Array1D2 headlessgl', () => {
  testSingleArray1D2('headlessgl');
});

test('Single Array1D2 cpu', () => {
  testSingleArray1D2('cpu');
});

function testSingleArray1D3(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v) {
    return v[this.thread.x];
  }, {
    argumentTypes: { v: 'Array1D(3)' },
    dynamicArguments: true,
    dynamicOutput: true
  });
  const expected1 = [
    new Float32Array([1,2,3]),
    new Float32Array([4,5,6]),
  ];
  kernel.setOutput([expected1.length]);
  assert.deepEqual(kernel(expected1), expected1);
  const expected2 = [
    new Float32Array([1,2,3]),
    new Float32Array([4,5,6]),
    new Float32Array([7,8,9]),
    new Float32Array([10,11,12]),
  ];
  kernel.setOutput([expected2.length]);
  assert.deepEqual(kernel(expected2), expected2);
  gpu.destroy();
}

test('Single Array1D3 auto', () => {
  testSingleArray1D3();
});

test('Single Array1D3 gpu', () => {
  testSingleArray1D3('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Single Array1D3 webgl', () => {
  testSingleArray1D3('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Single Array1D3 webgl2', () => {
  testSingleArray1D3('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Single Array1D3 headlessgl', () => {
  testSingleArray1D3('headlessgl');
});

test('Single Array1D3 cpu', () => {
  testSingleArray1D3('cpu');
});

function testSingleArray1D4(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v) {
    return v[this.thread.x];
  }, {
    argumentTypes: { v: 'Array1D(4)' },
    dynamicArguments: true,
    dynamicOutput: true
  });
  const expected1 = [
    new Float32Array([1,2,3,4]),
    new Float32Array([5,6,7,8]),
  ];
  kernel.setOutput([expected1.length]);
  assert.deepEqual(kernel(expected1), expected1);
  const expected2 = [
    new Float32Array([1,2,3,4]),
    new Float32Array([5,6,7,8]),
    new Float32Array([9,10,11,12]),
    new Float32Array([13,14,15,16]),
  ];
  kernel.setOutput([expected2.length]);
  assert.deepEqual(kernel(expected2), expected2);
  gpu.destroy();
}

test('Single Array1D4 auto', () => {
  testSingleArray1D4();
});

test('Single Array1D4 gpu', () => {
  testSingleArray1D4('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Single Array1D4 webgl', () => {
  testSingleArray1D4('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Single Array1D4 webgl2', () => {
  testSingleArray1D4('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Single Array1D4 headlessgl', () => {
  testSingleArray1D4('headlessgl');
});

test('Single Array1D4 cpu', () => {
  testSingleArray1D4('cpu');
});

function testSingleArray2D2(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v) {
    return v[this.thread.y][this.thread.x];
  }, {
    argumentTypes: { v: 'Array2D(2)' },
    dynamicArguments: true,
    dynamicOutput: true
  });
  const expected1 = [
    [
      new Float32Array([1,2]),
      new Float32Array([3,4]),
    ],[
      new Float32Array([5,6]),
      new Float32Array([7,8]),
    ]
  ];
  kernel.setOutput([expected1[0].length, expected1.length]);
  assert.deepEqual(kernel(expected1), expected1);
  const expected2 = [
    [
      new Float32Array([1,2]),
      new Float32Array([3,4]),
      new Float32Array([5,6]),
      new Float32Array([7,8]),
    ],[
      new Float32Array([9,10]),
      new Float32Array([11,12]),
      new Float32Array([13,14]),
      new Float32Array([15,16]),
    ]
  ];
  kernel.setOutput([expected2[0].length, expected2.length]);
  assert.deepEqual(kernel(expected2), expected2);
  gpu.destroy();
}

test('Single Array2D2 auto', () => {
  testSingleArray2D2();
});

test('Single Array2D2 gpu', () => {
  testSingleArray2D2('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Single Array2D2 webgl', () => {
  testSingleArray2D2('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Single Array2D2 webgl2', () => {
  testSingleArray2D2('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Single Array2D2 headlessgl', () => {
  testSingleArray2D2('headlessgl');
});

(GPU.isHeadlessGLSupported ? test : skip)('Single Array2D2 cpu', () => {
  testSingleArray2D2('cpu');
});

function testSingleArray2D3(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v) {
    return v[this.thread.y][this.thread.x];
  }, {
    argumentTypes: { v: 'Array2D(3)' },
    dynamicArguments: true,
    dynamicOutput: true
  });
  const expected1 = [
    [
      new Float32Array([1,2,3]),
      new Float32Array([4,5,6]),
    ],[
      new Float32Array([7,8,9]),
      new Float32Array([10,11,12]),
    ]
  ];
  kernel.setOutput([expected1[0].length, expected1.length]);
  assert.deepEqual(kernel(expected1), expected1);
  const expected2 = [
    [
      new Float32Array([1,2,3]),
      new Float32Array([4,5,6]),
      new Float32Array([7,8,9]),
      new Float32Array([10,11,12]),
    ],[
      new Float32Array([13,14,15]),
      new Float32Array([16,17,18]),
      new Float32Array([19,20,21]),
      new Float32Array([22,23,24]),
    ]
  ];
  kernel.setOutput([expected2[0].length, expected2.length]);
  assert.deepEqual(kernel(expected2), expected2);
  gpu.destroy();
}

test('Single Array2D3 auto', () => {
  testSingleArray2D3();
});

test('Single Array2D3 gpu', () => {
  testSingleArray2D3('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Single Array2D3 webgl', () => {
  testSingleArray2D3('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Single Array2D3 webgl2', () => {
  testSingleArray2D3('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Single Array2D3 headlessgl', () => {
  testSingleArray2D3('headlessgl');
});

test('Single Array2D3 cpu', () => {
  testSingleArray2D3('cpu');
});

function testSingleArray2D4(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v) {
    return v[this.thread.y][this.thread.x];
  }, {
    argumentTypes: { v: 'Array2D(4)' },
    dynamicArguments: true,
    dynamicOutput: true
  });
  const expected1 = [
    [
      new Float32Array([1,2,3,4]),
      new Float32Array([5,6,7,8]),
    ],[
      new Float32Array([9,10,11,12]),
      new Float32Array([13,14,15,16]),
    ]
  ];
  kernel.setOutput([expected1[0].length, expected1.length]);
  assert.deepEqual(kernel(expected1), expected1);
  const expected2 = [
    [
      new Float32Array([1,2,3,4]),
      new Float32Array([5,6,7,8]),
      new Float32Array([9,10,11,12]),
      new Float32Array([13,14,15,16]),
    ],[
      new Float32Array([17,18,19,20]),
      new Float32Array([21,22,23,24]),
      new Float32Array([25,26,27,28]),
      new Float32Array([29,30,31,32]),
    ]
  ];
  kernel.setOutput([expected2[0].length, expected2.length]);
  assert.deepEqual(kernel(expected2), expected2);
  gpu.destroy();
}

test('Single Array2D4 auto', () => {
  testSingleArray2D4();
});

test('Single Array2D4 gpu', () => {
  testSingleArray2D4('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Single Array2D4 webgl', () => {
  testSingleArray2D4('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Single Array2D4 webgl2', () => {
  testSingleArray2D4('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Single Array2D4 headlessgl', () => {
  testSingleArray2D4('headlessgl');
});

test('Single Array2D4 cpu', () => {
  testSingleArray2D4('cpu');
});

function testSingleArray3D2(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v) {
    return v[this.thread.z][this.thread.y][this.thread.x];
  }, {
    argumentTypes: { v: 'Array3D(2)' },
    dynamicArguments: true,
    dynamicOutput: true
  });
  const expected1 = [
    [
      [
        new Float32Array([1,2]),
        new Float32Array([3,4]),
      ],[
        new Float32Array([5,6]),
        new Float32Array([7,8]),
      ]
    ],[
      [
        new Float32Array([9,10]),
        new Float32Array([11,12]),
      ],[
        new Float32Array([13,14]),
        new Float32Array([15,16]),
      ]
    ]
  ];
  kernel.setOutput([expected1[0][0].length, expected1[0].length, expected1.length]);
  assert.deepEqual(kernel(expected1), expected1);
  const expected2 = [
    [
      [
        new Float32Array([1,2]),
        new Float32Array([3,4]),
        new Float32Array([5,6]),
        new Float32Array([7,8]),
      ],[
        new Float32Array([9,10]),
        new Float32Array([11,12]),
        new Float32Array([13,14]),
        new Float32Array([15,16]),
      ]
    ],[
      [
        new Float32Array([17,18]),
        new Float32Array([19,20]),
        new Float32Array([21,22]),
        new Float32Array([23,24]),
      ],[
        new Float32Array([25,26]),
        new Float32Array([27,28]),
        new Float32Array([29,30]),
        new Float32Array([31,32]),
      ]
    ]
  ];
  kernel.setOutput([expected2[0][0].length, expected2[0].length, expected2.length]);
  assert.deepEqual(kernel(expected2), expected2);
  gpu.destroy();
}

test('Single Array3D2 auto', () => {
  testSingleArray3D2();
});

test('Single Array3D2 gpu', () => {
  testSingleArray3D2('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Single Array3D2 webgl', () => {
  testSingleArray3D2('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Single Array3D2 webgl2', () => {
  testSingleArray3D2('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Single Array3D2 headlessgl', () => {
  testSingleArray3D2('headlessgl');
});

test('Single Array3D2 cpu', () => {
  testSingleArray3D2('cpu');
});

function testSingleArray3D3(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v) {
    return v[this.thread.z][this.thread.y][this.thread.x];
  }, {
    argumentTypes: { v: 'Array3D(3)' },
    dynamicArguments: true,
    dynamicOutput: true
  });
  const expected1 = [
    [
      [
        new Float32Array([1,2,3]),
        new Float32Array([4,5,6]),
      ],[
        new Float32Array([7,8,9]),
        new Float32Array([10,11,12]),
      ]
    ],[
      [
        new Float32Array([13,14,15]),
        new Float32Array([16,17,18]),
      ],[
        new Float32Array([19,20,21]),
        new Float32Array([22,23,24]),
      ]
    ]
  ];
  kernel.setOutput([expected1[0][0].length, expected1[0].length, expected1.length]);
  assert.deepEqual(kernel(expected1), expected1);
  const expected2 = [
    [
      [
        new Float32Array([1,2,3]),
        new Float32Array([4,5,6]),
        new Float32Array([7,8,9]),
        new Float32Array([10,11,12]),
      ],[
        new Float32Array([13,14,15]),
        new Float32Array([16,17,18]),
        new Float32Array([19,20,21]),
        new Float32Array([22,23,24]),
      ]
    ],[
      [
        new Float32Array([25,26,27]),
        new Float32Array([28,29,30]),
        new Float32Array([31,32,33]),
        new Float32Array([34,35,36]),
      ],[
        new Float32Array([37,38,39]),
        new Float32Array([40,41,42]),
        new Float32Array([43,44,45]),
        new Float32Array([46,47,48]),
      ]
    ]
  ];
  kernel.setOutput([expected2[0][0].length, expected2[0].length, expected2.length]);
  assert.deepEqual(kernel(expected2), expected2);
  gpu.destroy();
}

test('Single Array3D3 auto', () => {
  testSingleArray3D3();
});

test('Single Array3D3 gpu', () => {
  testSingleArray3D3('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Single Array3D3 webgl', () => {
  testSingleArray3D3('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Single Array3D3 webgl2', () => {
  testSingleArray3D3('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Single Array3D3 headlessgl', () => {
  testSingleArray3D3('headlessgl');
});

test('Single Array3D3 cpu', () => {
  testSingleArray3D3('cpu');
});

function testSingleArray3D4(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(v) {
    return v[this.thread.z][this.thread.y][this.thread.x];
  }, {
    argumentTypes: { v: 'Array3D(4)' },
    dynamicArguments: true,
    dynamicOutput: true
  });
  const expected1 = [
    [
      [
        new Float32Array([1,2,3,4]),
        new Float32Array([5,6,7,8]),
      ],[
        new Float32Array([9,10,11,12]),
        new Float32Array([13,14,15,16]),
      ]
    ],[
      [
        new Float32Array([17,18,19,20]),
        new Float32Array([21,22,23,24]),
      ],[
        new Float32Array([25,26,27,28]),
        new Float32Array([29,30,31,32]),
      ]
    ]
  ];
  kernel.setOutput([expected1[0][0].length, expected1[0].length, expected1.length]);
  assert.deepEqual(kernel(expected1), expected1);
  const expected2 = [
    [
      [
        new Float32Array([1,2,3,4]),
        new Float32Array([5,6,7,8]),
        new Float32Array([9,10,11,12]),
        new Float32Array([13,14,15,16]),
      ],[
        new Float32Array([17,18,19,20]),
        new Float32Array([21,22,23,24]),
        new Float32Array([25,26,27,28]),
        new Float32Array([29,30,31,32]),
      ]
    ],[
      [
        new Float32Array([33,34,35,36]),
        new Float32Array([37,38,39,40]),
        new Float32Array([41,42,43,44]),
        new Float32Array([45,46,47,48]),
      ],[
        new Float32Array([49,50,51,52]),
        new Float32Array([53,54,56,57]),
        new Float32Array([58,59,60,61]),
        new Float32Array([62,63,64,65]),
      ]
    ]
  ];
  kernel.setOutput([expected2[0][0].length, expected2[0].length, expected2.length]);
  assert.deepEqual(kernel(expected2), expected2);
  gpu.destroy();
}

test('Single Array3D4 auto', () => {
  testSingleArray3D4();
});

test('Single Array3D4 gpu', () => {
  testSingleArray3D4('gpu');
});

(GPU.isWebGLSupported ? test : skip)('Single Array3D4 webgl', () => {
  testSingleArray3D4('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('Single Array3D4 webgl2', () => {
  testSingleArray3D4('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('Single Array3D4 headlessgl', () => {
  testSingleArray3D4('headlessgl');
});

test('Single Array3D4 cpu', () => {
  testSingleArray3D4('cpu');
});

function testUnsignedPrecisionArray(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(input) {
    return input[this.thread.x];
  })
    .setPrecision('unsigned')
    .setDynamicArguments(true)
    .setDynamicOutput(true)
    .setOutput([5]);

  assert.deepEqual(kernel([1,2,3,4,5]), new Float32Array([1,2,3,4,5]));
  kernel.setOutput([4]);
  assert.deepEqual(kernel([1,2,3,4]), new Float32Array([1,2,3,4]));
  kernel.setOutput([3]);
  assert.deepEqual(kernel([1,2,3]), new Float32Array([1,2,3]));
  kernel.setOutput([2]);
  assert.deepEqual(kernel([1,2]), new Float32Array([1,2]));
  gpu.destroy();
}

test('unsigned precision Array auto', () => {
  testUnsignedPrecisionArray();
});

test('unsigned precision Array gpu', () => {
  testUnsignedPrecisionArray('gpu');
});

(GPU.isWebGLSupported ? test : skip)('unsigned precision Array webgl', () => {
  testUnsignedPrecisionArray('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('unsigned precision Array webgl2', () => {
  testUnsignedPrecisionArray('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('unsigned precision Array headlessgl', () => {
  testUnsignedPrecisionArray('headlessgl');
});

test('unsigned precision Array cpu', () => {
  testUnsignedPrecisionArray('cpu');
});

function testSinglePrecisionArray(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(input) {
    return input[this.thread.x];
  })
    .setPrecision('single')
    .setDynamicArguments(true)
    .setDynamicOutput(true)
    .setOutput([5]);

  assert.deepEqual(kernel([1,2,3,4,5]), new Float32Array([1,2,3,4,5]));
  kernel.setOutput([4]);
  assert.deepEqual(kernel([1,2,3,4]), new Float32Array([1,2,3,4]));
  kernel.setOutput([3]);
  assert.deepEqual(kernel([1,2,3]), new Float32Array([1,2,3]));
  kernel.setOutput([2]);
  assert.deepEqual(kernel([1,2]), new Float32Array([1,2]));
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array auto', () => {
  testSinglePrecisionArray();
});

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Array gpu', () => {
  testSinglePrecisionArray('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('single precision Array webgl', () => {
  testSinglePrecisionArray('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('single precision Array webgl2', () => {
  testSinglePrecisionArray('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('single precision Array headlessgl', () => {
  testSinglePrecisionArray('headlessgl');
});

test('single precision Array cpu', () => {
  testSinglePrecisionArray('cpu');
});

function testUnsignedPrecisionMatrix(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(input) {
    return input[this.thread.y][this.thread.x];
  })
    .setPrecision('unsigned')
    .setDynamicArguments(true)
    .setDynamicOutput(true)
    .setOutput([4,4]);

  let matrix = [
    [1,2,3,4],
    [5,6,7,8],
    [9,10,11,12],
    [13,14,15,16]
  ];
  assert.deepEqual(kernel(matrix), matrix.map(row => new Float32Array(row)));

  kernel.setOutput([3,3]);
  matrix = [
    [1,2,3],
    [4,5,6],
    [7,8,9]
  ];
  assert.deepEqual(kernel(matrix), matrix.map(row => new Float32Array(row)));

  kernel.setOutput([2,2]);
  matrix = [
    [1,2],
    [3,4]
  ];
  assert.deepEqual(kernel(matrix), matrix.map(row => new Float32Array(row)));
  gpu.destroy();
}

test('unsigned precision Matrix auto', () => {
  testUnsignedPrecisionMatrix();
});

test('unsigned precision Matrix gpu', () => {
  testUnsignedPrecisionMatrix('gpu');
});

(GPU.isWebGLSupported ? test : skip)('unsigned precision Matrix webgl', () => {
  testUnsignedPrecisionMatrix('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('unsigned precision Matrix webgl2', () => {
  testUnsignedPrecisionMatrix('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('unsigned precision Matrix headlessgl', () => {
  testUnsignedPrecisionMatrix('headlessgl');
});

test('unsigned precision Matrix cpu', () => {
  testUnsignedPrecisionMatrix('cpu');
});

function testSinglePrecisionMatrix(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(input) {
    return input[this.thread.y][this.thread.x];
  })
    .setDynamicArguments(true)
    .setDynamicOutput(true)
    .setOutput([4,4]);

  let matrix = [
    [1,2,3,4],
    [5,6,7,8],
    [9,10,11,12],
    [13,14,15,16]
  ];
  assert.deepEqual(kernel(matrix), matrix.map(row => new Float32Array(row)));

  kernel.setOutput([3,3]);
  matrix = [
    [1,2,3],
    [4,5,6],
    [7,8,9]
  ];
  assert.deepEqual(kernel(matrix), matrix.map(row => new Float32Array(row)));

  kernel.setOutput([2,2]);
  matrix = [
    [1,2],
    [3,4]
  ];
  assert.deepEqual(kernel(matrix), matrix.map(row => new Float32Array(row)));
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Matrix auto', () => {
  testSinglePrecisionMatrix();
});

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Matrix gpu', () => {
  testSinglePrecisionMatrix('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('single precision Matrix webgl', () => {
  testSinglePrecisionMatrix('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('single precision Matrix webgl2', () => {
  testSinglePrecisionMatrix('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('single precision Matrix headlessgl', () => {
  testSinglePrecisionMatrix('headlessgl');
});

test('single precision Matrix cpu', () => {
  testSinglePrecisionMatrix('cpu');
});

function testUnsignedPrecisionInputMatrix(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(input) {
    return input[this.thread.y][this.thread.x];
  })
    .setPrecision('unsigned')
    .setDynamicArguments(true)
    .setDynamicOutput(true)
    .setOutput([4,4]);

  let matrix = input([
    1,2,3,4,
    5,6,7,8,
    9,10,11,12,
    13,14,15,16
  ], [4, 4]);
  assert.deepEqual(kernel(matrix), [
    new Float32Array([1,2,3,4]),
    new Float32Array([5,6,7,8]),
    new Float32Array([9,10,11,12]),
    new Float32Array([13,14,15,16]),
  ]);

  kernel.setOutput([3,3]);
  matrix = input([
    1,2,3,
    4,5,6,
    7,8,9
  ], [3,3]);
  assert.deepEqual(kernel(matrix), [
    new Float32Array([1,2,3]),
    new Float32Array([4,5,6]),
    new Float32Array([7,8,9])
  ]);

  kernel.setOutput([2,2]);
  matrix = input([
    1,2,
    3,4
  ], [2,2]);
  assert.deepEqual(kernel(matrix), [
    new Float32Array([1,2]),
    new Float32Array([3,4])
  ]);
  gpu.destroy();
}

test('unsigned precision Input Matrix auto', () => {
  testUnsignedPrecisionInputMatrix();
});

test('unsigned precision Input Matrix gpu', () => {
  testUnsignedPrecisionInputMatrix('gpu');
});

(GPU.isWebGLSupported ? test : skip)('unsigned precision Input Matrix webgl', () => {
  testUnsignedPrecisionInputMatrix('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('unsigned precision Input Matrix webgl2', () => {
  testUnsignedPrecisionInputMatrix('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('unsigned precision Input Matrix headlessgl', () => {
  testUnsignedPrecisionInputMatrix('headlessgl');
});

test('unsigned precision Input Matrix cpu', () => {
  testUnsignedPrecisionInputMatrix('cpu');
});

function testSinglePrecisionInputMatrix(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(function(input) {
    return input[this.thread.y][this.thread.x];
  })
    .setDynamicArguments(true)
    .setDynamicOutput(true)
    .setOutput([4,4]);

  let matrix = input([
    1,2,3,4,
    5,6,7,8,
    9,10,11,12,
    13,14,15,16
  ], [4, 4]);
  assert.deepEqual(kernel(matrix), [
    new Float32Array([1,2,3,4]),
    new Float32Array([5,6,7,8]),
    new Float32Array([9,10,11,12]),
    new Float32Array([13,14,15,16])
  ]);

  kernel.setOutput([3,3]);
  matrix = input([
    1,2,3,
    4,5,6,
    7,8,9
  ], [3, 3]);
  assert.deepEqual(kernel(matrix), [
    new Float32Array([1,2,3]),
    new Float32Array([4,5,6]),
    new Float32Array([7,8,9])
  ]);

  kernel.setOutput([2,2]);
  matrix = input([
    1,2,
    3,4
  ], [2,2]);
  assert.deepEqual(kernel(matrix), [
    new Float32Array([1,2]),
    new Float32Array([3,4])
  ]);
  gpu.destroy();
}

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Input Matrix auto', () => {
  testSinglePrecisionInputMatrix();
});

(GPU.isSinglePrecisionSupported ? test : skip)('single precision Input Matrix gpu', () => {
  testSinglePrecisionInputMatrix('gpu');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGLSupported ? test : skip)('single precision Input Matrix webgl', () => {
  testSinglePrecisionInputMatrix('webgl');
});

(GPU.isSinglePrecisionSupported && GPU.isWebGL2Supported ? test : skip)('single precision Input Matrix webgl2', () => {
  testSinglePrecisionInputMatrix('webgl2');
});

(GPU.isSinglePrecisionSupported && GPU.isHeadlessGLSupported ? test : skip)('single precision Input Matrix headlessgl', () => {
  testSinglePrecisionInputMatrix('headlessgl');
});

test('single precision Input Matrix cpu', () => {
  testSinglePrecisionInputMatrix('cpu');
});
