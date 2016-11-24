
/// Basic MD5 testing
QUnit.test( "MD5: sanity test", function( assert ) {
	assert.equal(md5("hello world"), "5eb63bbbe01eeed093cb22bb8f5acdc3");
	assert.equal(hexMD5("hello world"), "5eb63bbbe01eeed093cb22bb8f5acdc3");
});


/// MD5 short circuting
QUnit.test( "MD5: short circuting in JS", function(assert) {

	// - For refence
	// function hexMD5 (s) {
	// 	return rstr2hex(rawMD5(s))
	// }
	// function rawMD5 (s) {
	// 	return rstrMD5(str2rstrUTF8(s))
	// }
	// function rstrMD5 (s) {
	// 	return binl2rstr(binlMD5(rstr2binl(s), s.length * 8))
	// }

	// function rawHMACMD5 (k, d) {
	// 	return rstrHMACMD5(str2rstrUTF8(k), str2rstrUTF8(d))
	// }
	// function hexHMACMD5 (k, d) {
	// 	return rstr2hex(rawHMACMD5(k, d))
	// }

	var testText = "hello world";
	var testTextBits = testText.length * 8;

	// UTF8 friendly string?
	assert.equal(str2rstrUTF8(testText), "hello world");

	// Convert the string into a numerical array representation - usable in GPU.js
	assert.deepEqual(rstr2binl("hello world"), [ 1819043176, 1870078063, 6581362 ]);
	var testBins = rstr2binl("hello world");

	// Hashes the binary representation
	assert.deepEqual(binlMD5(testBins, testTextBits), [ -1153714594, -789700896, -1155347565, -1009952113 ]);
	var resultBins = binlMD5(testBins, testTextBits);
	
	// With padding?
	assert.deepEqual(binlMD5([ 1819043176, 1870078063, 6581362, 0 ], testTextBits), [ -1153714594, -789700896, -1155347565, -1009952113 ]);
	var resultBins = binlMD5([ 1819043176, 1870078063, 6581362, 0 ], testTextBits);

	// Result to hash conversion
	assert.equal(rstr2hex(binl2rstr(resultBins)), "5eb63bbbe01eeed093cb22bb8f5acdc3");
});

function md5_pocRun(assert, mode) {
	var gpu = new GPU();
	assert.ok(gpu);
	
	// Change default var mode to unsigned long
	gpu._setDefaultVarType("int")
	
	// Binary string support
	gpu.addFunction( safeAdd );
	gpu.addFunction( bitRotateLeft );
	gpu.addFunction( md5cmn );
	gpu.addFunction( md5ff );
	gpu.addFunction( md5gg );
	gpu.addFunction( md5hh );
	gpu.addFunction( md5ii );
	gpu.addFunction( binlMD5_128bit, ["vec4", "vec4", "float"], "void" );
	
	function floatToVec4(a,b,c,d) {
		return [a,b,c,d];
	}
	gpu._addFunctionWebgl(
		"floatToVec4", floatToVec4,
		["float","float","float","float"], "vec4",
		"vec4 floatToVec4(float a, float b, float c, float d) { \n"+
		"	vec4 res; \n"+
		"	res[0] = a; \n"+
		"	res[1] = b; \n"+
		"	res[2] = c; \n"+
		"	res[3] = d; \n"+
		"	return res; \n"+
		"}"
	)
	
	function testMD5bin(inRawBin, inRawBinLen, targetBin) {
		var res = [0,0,0,0];
		binlMD5_128bit(res, inRawBin, inRawBinLen);
		return (
			targetBin[0] == res[0] &&
			targetBin[1] == res[1] &&
			targetBin[2] == res[2] &&
			targetBin[3] == res[3]
		);
	}
	gpu._addFunctionWebgl( 
		"testMD5bin", testMD5bin, 
		["vec4","float","vec4"], "float",
		"highp float testMD5bin(vec4 inRawBin, float inRawBinLen, vec4 targetBin) { \n"+
		"	vec4 res; \n"+
		"	binlMD5_128bit(res, inRawBin, inRawBinLen); \n"+
		"	return float( \n"+
		"		targetBin[0] == res[0] && \n"+
		"		targetBin[1] == res[1] && \n"+
		"		targetBin[2] == res[2] && \n"+
		"		targetBin[3] == res[3] \n"+
		"	); \n"+
		"}\n"
	);
	//console.log("addFunction", gpu.addFunction, gpu);
	
	var func = gpu.createKernel(function( inBin, inBinLen, targetMD5 ) {
		return testMD5bin(
			floatToVec4(inBin[0],inBin[1],inBin[2],inBin[3]), 
			inBinLen, floatToVec4(targetMD5[0],targetMD5[1],targetMD5[2],targetMD5[3]));
	}, {
		dimensions : [1],
		mode : mode
	});

	assert.ok(func);
	assert.equal(func( [ 1819043176, 1870078063, 6581362, 0 ], 88, [ -1153714594, -789700896, -1155347565, -1009952113 ] )[0], true);
	assert.equal(func( [ 1819043176, 1870078063, 0, 0 ], 88, [ -1153714594, -789700896, -1155347565, -1009952113 ] )[0], false);
	assert.equal(func( [ 1819043176, 1870078063, 6581362, 0 ], 88, [ -1153714594, -789700896, -1155347565, 0 ] )[0], false);
}

/// MD5 short circuting
// QUnit.test( "MD5: POC run (auto)", function(assert) {
// 	md5_pocRun(assert,null);
// });
QUnit.test( "MD5: POC run (cpu)", function(assert) {
	md5_pocRun(assert,"cpu");
});
QUnit.test( "MD5: POC run (gpu)", function(assert) {
	md5_pocRun(assert,"gpu");
});
