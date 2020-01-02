const { assert, skip, test, module: describe, only } = require('qunit');
const { utils } = require('../../src');

describe('internal: utils');

test('systemEndianness not null', () => {
  assert.ok(utils.systemEndianness() !== null, 'not null check');
  assert.ok(utils.systemEndianness() === 'LE' ||  utils.systemEndianness() === 'BE', 'value = ' + utils.systemEndianness());
});

test('isFunction', () => {
  assert.ok(utils.isFunction(function() { }));
  assert.notOk(utils.isFunction({}));
});

test('isFunctionString', () => {
  assert.ok(utils.isFunctionString('function() { }'));
  assert.notOk(utils.isFunctionString({}));
});

test('getFunctionName_fromString', () => {
  assert.equal('test', utils.getFunctionNameFromString('function test() { }'));
});

test('getParamNames_fromString', () => {
  assert.deepEqual(['a','b','c'], utils.getArgumentNamesFromString('function test(a,b,c) { }'));
});

test('closestSquareDimensions 2', () => {
  assert.deepEqual(Array.from(utils.closestSquareDimensions(2)), [1,2]);
});

test('closestSquareDimensions 5', () => {
  assert.deepEqual(Array.from(utils.closestSquareDimensions(5)), [2,3]);
});

test('closestSquareDimensions 6', () => {
  assert.deepEqual(Array.from(utils.closestSquareDimensions(6)), [2,3]);
});

test('closestSquareDimensions 7', () => {
  assert.deepEqual(Array.from(utils.closestSquareDimensions(7)), [4,2]);
});

test('getDimensions Array of 6, padded', () => {
  assert.deepEqual(Array.from(utils.getDimensions(new Array(6).fill(1), true)), [6,1,1]);
});

test('getDimensions Array of 6,1,1, padded', () => {
  assert.deepEqual(Array.from(utils.getDimensions([[[1,1,1,1,1,1]]], true)), [6,1,1]);
});

test('getDimensions Array of 1,6,1, padded', () => {
  assert.deepEqual(Array.from(utils.getDimensions([[[1],[1],[1],[1],[1],[1]]], true)), [1,6,1]);
});

test('getDimensions Array of 1,1,6, padded', () => {
  assert.deepEqual(Array.from(utils.getDimensions([[[1]],[[1]],[[1]],[[1]],[[1]],[[1]]], true)), [1,1,6]);
});

test('getMemoryOptimizedFloatTextureSize [6,1,1], bitRatio 4', () => {
  assert.deepEqual(Array.from(utils.getMemoryOptimizedFloatTextureSize([6, 1, 1], 4)), [1, 2]);
});

test('getMemoryOptimizedFloatTextureSize [1,6,1], bitRatio 4', () => {
  assert.deepEqual(Array.from(utils.getMemoryOptimizedFloatTextureSize([1, 6, 1], 4)), [1, 2]);
});

test('getMemoryOptimizedFloatTextureSize [1,1,6], bitRatio 4', () => {
  assert.deepEqual(Array.from(utils.getMemoryOptimizedFloatTextureSize([1, 1, 6], 4)), [1, 2]);
});

test('getMemoryOptimizedFloatTextureSize [6,1,1], bitRatio 2', () => {
  assert.deepEqual(Array.from(utils.getMemoryOptimizedFloatTextureSize([6, 1, 1], 2)), [2, 2]);
});

test('getMemoryOptimizedFloatTextureSize [1,6,1], bitRatio 2', () => {
  assert.deepEqual(Array.from(utils.getMemoryOptimizedFloatTextureSize([1, 6, 1], 2)), [2, 2]);
});

test('getMemoryOptimizedFloatTextureSize [1,1,6], bitRatio 2', () => {
  assert.deepEqual(Array.from(utils.getMemoryOptimizedFloatTextureSize([1, 1, 6], 2)), [2, 2]);
});

test('getMemoryOptimizedFloatTextureSize [6,1,1], bitRatio 1', () => {
  assert.deepEqual(Array.from(utils.getMemoryOptimizedFloatTextureSize([6, 1, 1], 1)), [4, 2]);
});

test('getMemoryOptimizedFloatTextureSize [1,6,1], bitRatio 1', () => {
  assert.deepEqual(Array.from(utils.getMemoryOptimizedFloatTextureSize([1, 6, 1], 1)), [4, 2]);
});

test('getMemoryOptimizedFloatTextureSize [1,1,6], bitRatio 1', () => {
  assert.deepEqual(Array.from(utils.getMemoryOptimizedFloatTextureSize([1, 1, 6], 1)), [4, 2]);
});

test('getMemoryOptimizedPackedTextureSize [6,1,1], bitRatio 4', () => {
  assert.deepEqual(Array.from(utils.getMemoryOptimizedPackedTextureSize([6, 1, 1], 4)), [4, 2]);
});

test('getMemoryOptimizedPackedTextureSize [1,6,1], bitRatio 4', () => {
  assert.deepEqual(Array.from(utils.getMemoryOptimizedPackedTextureSize([1, 6, 1], 4)), [4, 2]);
});

test('getMemoryOptimizedPackedTextureSize [1,1,6], bitRatio 4', () => {
  assert.deepEqual(Array.from(utils.getMemoryOptimizedPackedTextureSize([1, 1, 6], 4)), [4, 2]);
});

test('getMemoryOptimizedPackedTextureSize [6,1,1], bitRatio 2', () => {
  assert.deepEqual(Array.from(utils.getMemoryOptimizedPackedTextureSize([6, 1, 1], 2)), [2, 2]);
});

test('getMemoryOptimizedPackedTextureSize [1,6,1], bitRatio 2', () => {
  assert.deepEqual(Array.from(utils.getMemoryOptimizedPackedTextureSize([1, 6, 1], 2)), [2, 2]);
});

test('getMemoryOptimizedPackedTextureSize [1,1,6], bitRatio 2', () => {
  assert.deepEqual(Array.from(utils.getMemoryOptimizedPackedTextureSize([1, 1, 6], 2)), [2, 2]);
});
test('getMemoryOptimizedPackedTextureSize [6,1,1], bitRatio 1', () => {
  assert.deepEqual(Array.from(utils.getMemoryOptimizedPackedTextureSize([6, 1, 1], 1)), [1, 2]);
});

test('getMemoryOptimizedPackedTextureSize [1,6,1], bitRatio 1', () => {
  assert.deepEqual(Array.from(utils.getMemoryOptimizedPackedTextureSize([1, 6, 1], 1)), [1, 2]);
});

test('getMemoryOptimizedPackedTextureSize [1,1,6], bitRatio 1', () => {
  assert.deepEqual(Array.from(utils.getMemoryOptimizedPackedTextureSize([1, 1, 6], 1)), [1, 2]);
});

test('functionToIFunction with function', () => {
  const fn = function() {};
  const result = utils.functionToIFunction(fn);
  assert.deepEqual(result, { source: fn.toString(), argumentTypes: [], returnType: null });
});

test('functionToIFunction with function and argumentTypes array', () => {
  const fn = function(a, b) {};
  const argumentTypes = ['number','string'];
  const result = utils.functionToIFunction(fn, { argumentTypes });
  assert.deepEqual(result, {
    source: fn.toString(),
    argumentTypes: ['number', 'string'],
    returnType: null,
  });
});

test('functionToIFunction with function and argumentTypes object', () => {
  const fn = function(a, b) {};
  const argumentTypes = { a: 'number', b: 'string' };
  const result = utils.functionToIFunction(fn, { argumentTypes });
  assert.deepEqual(result, {
    source: fn.toString(),
    argumentTypes: ['number', 'string'],
    returnType: null,
  });
});

test('functionToIFunction with function and returnType', () => {
  const fn = function(a, b) {};
  const result = utils.functionToIFunction(fn, { returnType: 'string' });
  assert.deepEqual(result, {
    source: fn.toString(),
    argumentTypes: [],
    returnType: 'string',
  });
});

test('getKernelTextureSize for [1,2] output, optimizeFloatMemory = true, and precision = "unsigned"', () => {
  const textureSize = utils.getKernelTextureSize({
    optimizeFloatMemory: true,
    precision: 'unsigned',
  }, [1,2]);
  assert.deepEqual(textureSize, new Int32Array([1,2]));
});

test('getKernelTextureSize for [2,3] output, optimizeFloatMemory = true, and precision = "unsigned"', () => {
  const textureSize = utils.getKernelTextureSize({
    optimizeFloatMemory: true,
    precision: 'unsigned',
  }, [2,3]);
  assert.deepEqual(textureSize, new Int32Array([2,3]));
});

test('getKernelTextureSize for [4,2] output, optimizeFloatMemory = true, and precision = "unsigned"', () => {
  const textureSize = utils.getKernelTextureSize({
    optimizeFloatMemory: true,
    precision: 'unsigned',
  }, [4,2]);
  assert.deepEqual(textureSize, new Int32Array([4,2]));
});

test('getKernelTextureSize for [6,1,1] output, optimizeFloatMemory = true, and precision = "unsigned"', () => {
  const textureSize = utils.getKernelTextureSize({
    optimizeFloatMemory: true,
    precision: 'unsigned',
  }, [6,1,1]);
  assert.deepEqual(textureSize, new Int32Array([2,3]));
});

test('getKernelTextureSize for [1,6,1] output, optimizeFloatMemory = true, and precision = "unsigned"', () => {
  const textureSize = utils.getKernelTextureSize({
    optimizeFloatMemory: true,
    precision: 'unsigned',
  }, [1,6,1]);
  assert.deepEqual(textureSize, new Int32Array([1,6]));
});

test('getKernelTextureSize for [1,1,6] output, optimizeFloatMemory = true, and precision = "unsigned"', () => {
  const textureSize = utils.getKernelTextureSize({
    optimizeFloatMemory: true,
    precision: 'unsigned',
  }, [1,1,6]);
  assert.deepEqual(textureSize, new Int32Array([2,3]));
});

test('getKernelTextureSize for [1,2] output, optimizeFloatMemory = true, and precision = "single"', () => {
  const textureSize = utils.getKernelTextureSize({
    optimizeFloatMemory: true,
    precision: 'single',
  }, [1,2]);
  assert.deepEqual(textureSize, new Int32Array([1,1]));
});

test('getKernelTextureSize for [2,3] output, optimizeFloatMemory = true, and precision = "single"', () => {
  const textureSize = utils.getKernelTextureSize({
    optimizeFloatMemory: true,
    precision: 'single',
  }, [2,3]);
  assert.deepEqual(textureSize, new Int32Array([1,2]));
});

test('getKernelTextureSize for [4,2] output, optimizeFloatMemory = true, and precision = "single"', () => {
  const textureSize = utils.getKernelTextureSize({
    optimizeFloatMemory: true,
    precision: 'single',
  }, [4,2]);
  assert.deepEqual(textureSize, new Int32Array([1,2]));
});

test('getKernelTextureSize for [6,1,1] output, optimizeFloatMemory = true, and precision = "single"', () => {
  const textureSize = utils.getKernelTextureSize({
    optimizeFloatMemory: true,
    precision: 'single',
  }, [6,1,1]);
  assert.deepEqual(textureSize, new Int32Array([1,2]));
});

test('getKernelTextureSize for [1,6,1] output, optimizeFloatMemory = true, and precision = "single"', () => {
  const textureSize = utils.getKernelTextureSize({
    optimizeFloatMemory: true,
    precision: 'single',
  }, [1,6,1]);
  assert.deepEqual(textureSize, new Int32Array([1,2]));
});

test('getKernelTextureSize for [1,1,6] output, optimizeFloatMemory = true, and precision = "single"', () => {
  const textureSize = utils.getKernelTextureSize({
    optimizeFloatMemory: true,
    precision: 'single',
  }, [1,1,6]);
  assert.deepEqual(textureSize, new Int32Array([1,2]));
});

test('erectPackedFloat', () => {
  const array = new Float32Array([0,1,2,3,4,5,0,0]);
  const result = utils.erectPackedFloat(array, 6);
  assert.deepEqual(result, new Float32Array([0,1,2,3,4,5]));
});
test('erect2DPackedFloat', () => {
  const array = new Float32Array([0,1,2,3,4,5,6,7,8,0,0,0,0]);
  const result = utils.erect2DPackedFloat(array, 3, 3);
  assert.deepEqual(result, [
    new Float32Array([0,1,2]),
    new Float32Array([3,4,5]),
    new Float32Array([6,7,8])
  ]);
});
test('erect3DPackedFloat', () => {
  const array = new Float32Array([0,1,2,3,4,5,6,7,0,0,0,0,0]);
  const result = utils.erect3DPackedFloat(array, 2, 2, 2);
  assert.deepEqual(result, [
    [
      new Float32Array([0,1]),
      new Float32Array([2,3]),
    ],[
      new Float32Array([4,5]),
      new Float32Array([6,7]),
    ]
  ]);
});
test('erectMemoryOptimizedFloat', () => {
  const array = new Float32Array([0,1,2,3,4,5,0,0]);
  const result = utils.erectMemoryOptimizedFloat(array, 6);
  assert.deepEqual(result, new Float32Array([0,1,2,3,4,5]));
});
test('erectMemoryOptimized2DFloat', () => {
  const array = new Float32Array([0,1,2,3,4,5,6,7,8,0,0,0,0]);
  const result = utils.erectMemoryOptimized2DFloat(array, 3, 3);
  assert.deepEqual(result, [
    new Float32Array([0,1,2]),
    new Float32Array([3,4,5]),
    new Float32Array([6,7,8])
  ]);
});
test('erectMemoryOptimized3DFloat', () => {
  const array = new Float32Array([0,1,2,3,4,5,6,7,0,0,0,0,0]);
  const result = utils.erectMemoryOptimized3DFloat(array, 2, 2, 2);
  assert.deepEqual(result, [
    [
      new Float32Array([0,1]),
      new Float32Array([2,3]),
    ],[
      new Float32Array([4,5]),
      new Float32Array([6,7]),
    ]
  ]);
});
test('erectFloat', () => {
  const array = new Float32Array([
    0,0,0,0,
    1,0,0,0,
    2,0,0,0,
    3,0,0,0,
    4,0,0,0,
    5,0,0,0
  ]);
  const result = utils.erectFloat(array, 6);
  assert.deepEqual(result, new Float32Array([0,1,2,3,4,5]));
});
test('erect2DFloat', () => {
  const array = new Float32Array([
    0,0,0,0,
    1,0,0,0,
    2,0,0,0,
    3,0,0,0,
    4,0,0,0,
    5,0,0,0,
    6,0,0,0,
    7,0,0,0,
    8,0,0,0,
    0,0,0,0
  ]);
  const result = utils.erect2DFloat(array, 3, 3);
  assert.deepEqual(result, [
    new Float32Array([0,1,2]),
    new Float32Array([3,4,5]),
    new Float32Array([6,7,8])
  ]);
});
test('erect3DFloat', () => {
  const array = new Float32Array([
    0,0,0,0,
    1,0,0,0,
    2,0,0,0,
    3,0,0,0,
    4,0,0,0,
    5,0,0,0,
    6,0,0,0,
    7,0,0,0,
    0,0,0,0
  ]);
  const result = utils.erect3DFloat(array, 2, 2, 2);
  assert.deepEqual(result, [
    [
      new Float32Array([0,1]),
      new Float32Array([2,3]),
    ],[
      new Float32Array([4,5]),
      new Float32Array([6,7]),
    ]
  ]);
});
test('erectArray2', () => {
  const array = new Float32Array([
    0,1,0,0,
    2,3,0,0,
    4,5,0,0,
    6,7,0,0
  ]);
  const result = utils.erectArray2(array, 4);
  assert.deepEqual(result, [
    new Float32Array([0,1]),
    new Float32Array([2,3]),
    new Float32Array([4,5]),
    new Float32Array([6,7]),
  ]);
});
test('erect2DArray2', () => {
  const array = new Float32Array([
    0,1,0,0,
    2,3,0,0,
    4,5,0,0,
    6,7,0,0
  ]);
  const result = utils.erect2DArray2(array, 2, 2);
  assert.deepEqual(result, [
    [
      new Float32Array([0,1]),
      new Float32Array([2,3]),
    ],
    [
      new Float32Array([4,5]),
      new Float32Array([6,7]),
    ]
  ]);
});
test('erect3DArray2', () => {
  const array = new Float32Array([
    0,1,0,0,
    2,3,0,0,
    4,5,0,0,
    6,7,0,0,
    8,9,0,0,
    10,11,0,0,
    12,13,0,0,
    14,15,0,0,
  ]);
  const result = utils.erect3DArray2(array, 2, 2, 2);
  assert.deepEqual(result, [
    [
      [
        new Float32Array([0,1]),
        new Float32Array([2,3]),
      ],
      [
        new Float32Array([4,5]),
        new Float32Array([6,7]),
      ]
    ],
    [
      [
        new Float32Array([8,9]),
        new Float32Array([10,11]),
      ],
      [
        new Float32Array([12,13]),
        new Float32Array([14,15]),
      ]
    ]
  ]);
});
test('erectArray3', () => {
  const array = new Float32Array([
    0,1,2,0,
    3,4,5,0,
    6,7,8,0,
    9,10,11,0
  ]);
  const result = utils.erectArray3(array, 4);
  assert.deepEqual(result, [
    new Float32Array([0,1,2]),
    new Float32Array([3,4,5]),
    new Float32Array([6,7,8]),
    new Float32Array([9,10,11]),
  ]);
});
test('erect2DArray3', () => {
  const array = new Float32Array([
    0,1,2,0,
    3,4,5,0,
    6,7,8,0,
    9,10,11,0,
  ]);
  const result = utils.erect2DArray3(array, 2, 2);
  assert.deepEqual(result, [
    [
      new Float32Array([0,1,2]),
      new Float32Array([3,4,5]),
    ],
    [
      new Float32Array([6,7,8]),
      new Float32Array([9,10,11]),
    ]
  ]);
});
test('erect3DArray3', () => {
  const array = new Float32Array([
    0,1,2,0,
    3,4,5,0,
    6,7,8,0,
    9,10,11,0,
    12,13,14,0,
    15,16,17,0,
    18,19,20,0,
    21,22,23,0,
  ]);
  const result = utils.erect3DArray3(array, 2, 2, 2);
  assert.deepEqual(result, [
    [
      [
        new Float32Array([0,1,2]),
        new Float32Array([3,4,5]),
      ],
      [
        new Float32Array([6,7,8]),
        new Float32Array([9,10,11]),
      ]
    ],
    [
      [
        new Float32Array([12,13,14]),
        new Float32Array([15,16,17]),
      ],
      [
        new Float32Array([18,19,20]),
        new Float32Array([21,22,23]),
      ]
    ]
  ]);
});
test('erectArray4', () => {
  const array = new Float32Array([
    0,1,2,3,
    4,5,6,7,
    8,9,10,11,
    12,13,14,15,
  ]);
  const result = utils.erectArray4(array, 4);
  assert.deepEqual(result, [
    new Float32Array([0,1,2,3]),
    new Float32Array([4,5,6,7]),
    new Float32Array([8,9,10,11]),
    new Float32Array([12,13,14,15]),
  ]);

});
test('erect2DArray4', () => {
  const array = new Float32Array([
    0,1,2,3,
    4,5,6,7,
    8,9,10,11,
    12,13,14,15,
  ]);
  const result = utils.erect2DArray4(array, 2, 2);
  assert.deepEqual(result, [
    [
      new Float32Array([0,1,2,3]),
      new Float32Array([4,5,6,7]),
    ],
    [
      new Float32Array([8,9,10,11]),
      new Float32Array([12,13,14,15]),
    ]
  ]);
});
test('erect3DArray4', () => {
  const array = new Float32Array([
    0,1,2,3,
    4,5,6,7,
    8,9,10,11,
    12,13,14,15,
    16,17,18,19,
    20,21,22,23,
    24,25,26,27,
    28,29,30,31,
  ]);
  const result = utils.erect3DArray4(array, 2, 2, 2);
  assert.deepEqual(result, [
    [
      [
        new Float32Array([0,1,2,3]),
        new Float32Array([4,5,6,7]),
      ],
      [
        new Float32Array([8,9,10,11]),
        new Float32Array([12,13,14,15]),
      ]
    ],
    [
      [
        new Float32Array([16,17,18,19]),
        new Float32Array([20,21,22,23]),
      ],
      [
        new Float32Array([24,25,26,27]),
        new Float32Array([28,29,30,31]),
      ]
    ]
  ]);
});

test('flattenFunctionToString', () => {
  // since we use this internally, currently just testing if parsing simply works
  [
    utils.erectPackedFloat,
    utils.erect2DPackedFloat,
    utils.erect3DPackedFloat,
    utils.erectMemoryOptimizedFloat,
    utils.erectMemoryOptimized2DFloat,
    utils.erectMemoryOptimized3DFloat,
    utils.erectFloat,
    utils.erect2DFloat,
    utils.erect3DFloat,
    utils.erectArray2,
    utils.erect2DArray2,
    utils.erect3DArray2,
    utils.erectArray3,
    utils.erect2DArray3,
    utils.erect3DArray3,
    utils.erectArray4,
    utils.erect2DArray4,
    utils.erect3DArray4
  ].forEach(fn => eval(utils.flattenFunctionToString(fn, {
    findDependency: () => {},
    thisLookup: () => {},
  })));
  assert.ok(true);
});

test('improper getMinifySafeName usage', () => {
  assert.throws(() => {
    utils.getMinifySafeName(() => {});
  });
});

test('proper getMinifySafeName usage', () => {
  function n() {}
  const safeName = utils.getMinifySafeName(() => n);
  assert.equal(safeName, 'n');
});