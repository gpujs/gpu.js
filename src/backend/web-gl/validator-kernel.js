const WebGLKernel = require('./kernel');
const utils = require('../../utils');

module.exports = class WebGLValidatorKernel extends WebGLKernel {
	validateOptions() {
		this.texSize = utils.dimToTexSize({
			floatTextures: this.floatTextures,
			floatOutput: this.floatOutput
		}, this.dimensions, true);
	}
};