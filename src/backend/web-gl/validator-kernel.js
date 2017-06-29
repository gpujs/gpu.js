const WebGLKernel = require('./kernel');
const utils = require('../../utils');

///
/// Class: WebGLValidatorKernel
///
/// Helper class for WebGLKernel to validate texture size and dimensions.
///

module.exports = class WebGLValidatorKernel extends WebGLKernel {
	
	/// 
	/// Function: validateOptions
	///

	validateOptions() {
		this.texSize = utils.dimToTexSize({
			floatTextures: this.floatTextures,
			floatOutput: this.floatOutput
		}, this.dimensions, true);
	}
};