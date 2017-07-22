'use strict';

const OpenCLKernel = require('./kernel');
const utils = require('../../core/utils');

/**
 * @class WebGLValidatorKernel
 *
 * @desc Helper class for WebGLKernel to validate texture size and dimensions.
 *
 */
module.exports = class OpenCLValidatorKernel extends OpenCLKernel {

	/** 
	 * @memberOf OpenCLValidatorKernel#
	 * @function
	 * @name validateOptions
	 *
	 */
	validateOptions() {
		this.texSize = utils.dimToTexSize({
			floatTextures: this.floatTextures,
			floatOutput: this.floatOutput
		}, this.dimensions, true);
	}
};