'use strict';

const getContext = require('gl');
const WebGLKernel = require('../web-gl/kernel');

class HeadlessGLKernel extends WebGLKernel {
	initCanvas() {
		return {};
	}

	initContext() {
		const context = getContext(2, 2, {
			preserveDrawingBuffer: true
		});
		return context;
	}

	initExtensions() {
		this.extensions = {
			STACKGL_resize_drawingbuffer: this.context.getExtension('STACKGL_resize_drawingbuffer'),
			STACKGL_destroy_context: this.context.getExtension('STACKGL_destroy_context'),
			OES_texture_float: this.context.getExtension('OES_texture_float'),
			OES_texture_float_linear: this.context.getExtension('OES_texture_float_linear'),
			OES_element_index_uint: this.context.getExtension('OES_element_index_uint'),
		};
	}

	destroyExtensions() {
		this.extensions.STACKGL_resize_drawingbuffer = null;
		this.extensions.STACKGL_destroy_context = null;
		this.extensions.OES_texture_float = null;
		this.extensions.OES_texture_float_linear = null;
		this.extensions.OES_element_index_uint = null;
	}

	static destroyContext(context) {
		const extension = context.getExtension('STACKGL_destroy_context');
		if (extension && extension.destroy) {
			extension.destroy();
		}
	}
}

module.exports = HeadlessGLKernel;