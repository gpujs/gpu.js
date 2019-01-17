'use strict';

const WebGLKernel = require('../web-gl/kernel');

class HeadlessGLKernel extends WebGLKernel {
	constructor(fnString, settings) {
		super(fnString, settings);
		this._canvas = {};
	}
	initWebGl() {
		const webGl = require('gl')(2, 2, {
			preserveDrawingBuffer: true
		});
		webGl.getExtension('STACKGL_resize_drawingbuffer');
		webGl.getExtension('STACKGL_destroy_context');
		webGl.OES_texture_float = webGl.getExtension('OES_texture_float');
		webGl.OES_texture_float_linear = webGl.getExtension('OES_texture_float_linear');
		webGl.OES_element_index_uint = webGl.getExtension('OES_element_index_uint');
		return webGl;
	}
}

module.exports = HeadlessGLKernel;