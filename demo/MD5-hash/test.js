
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

	// Result to hash conversion
	assert.equal(rstr2hex(binl2rstr(resultBins)), "5eb63bbbe01eeed093cb22bb8f5acdc3");
});

/// MD5 short circuting
QUnit.test( "MD5: via GPU", function(assert) {
	var gpu = new GPU();
	assert.ok(gpu);

	gpu.addFunction( binlMD5, ["float", "float"], "float" );

	var func = gpu.createKernel(function( inBin, inBinLen, targetBin ) {
		var binHash = binlMD5(inBin, inBinLen);
		return 1;
	}).dimensions([1]);

	assert.ok(func);
	assert.equal(func( [ 1819043176, 1870078063, 6581362 ], 88, [ -1153714594, -789700896, -1155347565, -1009952113 ] ), 1);
});
