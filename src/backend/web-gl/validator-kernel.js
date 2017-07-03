const WebGLKernel = require('./kernel');
const utils = require('../../core/utils');

/**
 * @class WebGLValidatorKernel
 *
 * Helper class for WebGLKernel to validate texture size and dimensions.
 *
 */
module.exports = class WebGLValidatorKernel extends WebGLKernel {
	
	/** 
	 * @name validateOptions
	 * @function
	 *
	 */
	validateOptions() {
		this.texSize = utils.dimToTexSize({
			floatTextures: this.floatTextures,
			floatOutput: this.floatOutput
		}, this.dimensions, true);
	}
};