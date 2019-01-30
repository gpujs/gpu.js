const { assert, skip, test, module: describe } = require('qunit');
const { utils } = require('../../src');

describe('internal: utils');

test("utils: systemEndianness not null", () => {
	assert.ok(utils.systemEndianness() !== null, "not null check");
	assert.ok(utils.systemEndianness() === "LE" ||  utils.systemEndianness() === "BE", "value = " + utils.systemEndianness());
});

test("utils: isFunction", () => {
	assert.ok(utils.isFunction(function() { }));
	assert.notOk(utils.isFunction({}));
});

test("utils: isFunctionString", () => {
	assert.ok(utils.isFunctionString("function() { }"));
	assert.notOk(utils.isFunctionString({}));
});

test("utils: getFunctionName_fromString", () => {
	assert.equal("test", utils.getFunctionNameFromString("function test() { }"));
});

test("utils: getParamNames_fromString", () => {
	assert.deepEqual(["a","b","c"], utils.getArgumentNamesFromString("function test(a,b,c) { }"));
});
