///
/// Class: gpu_utils
///
/// Various utility functions / snippets of code that GPU.JS uses internally.
///
/// Note that all moethods in this class is "static" by nature `gpu_utils.functionName()`
///
var gpu_utils = (function() {

	function gpu_utils() {
		throw new Error("This is a utility class - do not construct it");
	}

	// system_endianness closure based memoizer
	var system_endianness_memoizer = null;

	///
	/// Function: system_endianness
	///
	/// Gets the system endianness, and cache it
	///
	/// Credit: https://gist.github.com/TooTallNate/4750953
	function system_endianness() {
		if( system_endianness_memoizer !== null ) {
			return system_endianness_memoizer;
		}

		var b = new ArrayBuffer(4);
		var a = new Uint32Array(b);
		var c = new Uint8Array(b);
		a[0] = 0xdeadbeef;
		if (c[0] == 0xef) return system_endianness_memoizer = 'LE';
		if (c[0] == 0xde) return system_endianness_memoizer = 'BE';
		throw new Error('unknown endianness');
	}

	gpu_utils.system_endianness = system_endianness;

	return gpu_utils;
})();
