'use strict';

const GPUCore = require("./core/gpu-core");
if (typeof module !== 'undefined') {
	module.exports = GPUCore;
}
if (typeof window !== 'undefined') {
	window.GPUCore = GPUCore;
	if (window.GPU === null) {
		window.GPU = GPUCore;
	}
}