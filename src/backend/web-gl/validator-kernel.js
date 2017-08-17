'use strict';

const WebGLKernel = require('./kernel');
const utils = require('../../core/utils');

/**
 * @class WebGLValidatorKernel
 *
 * @desc Helper class for WebGLKernel to validate texture size and dimensions.
 *
 */
module.exports = class WebGLValidatorKernel extends WebGLKernel {

	/** 
	 * @memberOf WebGLValidatorKernel#
	 * @function
	 * @name validateOptions
	 *
	 */
	validateOptions() {
		this.texSize = utils.dimToTexSize({
			floatTextures: this.floatTextures,
			floatOutput: this.floatOutput
		}, this.output, true);
	}
};