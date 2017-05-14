const RunnerBase = require('../runner-base');
const WebGLKernel = require('./kernel');
const utils = require('../../utils');
const WebGLFunctionBuilder = require('./function-builder');

module.exports = class WebGLRunner extends RunnerBase {
	constructor(settings) {
		super(new WebGLFunctionBuilder(), settings);
		this.Kernel = WebGLKernel;
		this.kernel = null;
	}

	get mode() {
		return 'gpu';
	}
};