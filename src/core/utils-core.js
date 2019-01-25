'use strict';

/**
 *
 * @desc Reduced subset of Utils, used exclusively in gpu-core.js
 * Various utility functions / snippets of code that GPU.JS uses internally.\
 * This covers various snippets of code that is not entirely gpu.js specific (ie. may find uses elsewhere)
 *
 * Note that all methods in this class is 'static' by nature `UtilsCore.functionName()`
 *
 * @class UtilsCore
 *
 */

class UtilsCore {
	// Default webgl settings to use
	static initWebGlDefaultSettings() {
		return {
			alpha: false,
			depth: false,
			antialias: false
		};
	}

	/**
	 * @param {number[]} output
	 * @throws if not correctly defined
	 */
	static checkOutput(output) {
		if (!output || !Array.isArray(output)) throw new Error('kernel.output not an array');
		for (let i = 0; i < output.length; i++) {
			if (isNaN(output[i]) || output[i] < 1) {
				throw new Error(`kernel.output[${ i }] incorrectly defined as \`${ output[i] }\`, needs to be numeric, and greater than 0`);
			}
		}
	}
}

module.exports = UtilsCore;