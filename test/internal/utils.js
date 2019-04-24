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
