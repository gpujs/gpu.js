'use strict';

const WebGLKernel = require('./kernel');
const utils = require('../../core/utils');

/**
 * @class WebGLValidatorKernel
 *
 * @desc Helper class for WebGLKernel to validate texture size and dimensions.
 *
 */
module.exports = class WebGL2ValidatorKernel extends WebGLKernel {

	/** 
	 * @memberOf WebGLValidatorKernel#
	 * @function
	 * @name validateOptions
	 *
	 */
	validateOptions() {
		this._webGl.getExtension('EXT_color_buffer_float');
		this.texSize = utils.dimToTexSize({
			floatTextures: this.floatTextures,
			floatOutput: this.floatOutput
		}, this.output, true);
	}
};