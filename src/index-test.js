/**
 * File: index-test.js
 * 
 * Exports all the GPU.js hidden classes (that is configured here), 
 * for testing via unit-test. 
 */

let componentsMap = {
	// Core components
	Utils : require("./core/utils"),
	UtilsCore : require("./core/utils-core"),

	// CPU components
	CPUKernelRunner : require("./backend/cpu/kernel-runner")
}

// Server land of modules
if (typeof module !== 'undefined') {
	module.exports = componentsMap;
}

// Browser land : window=global
if (typeof window !== 'undefined') {
	// Iterate all keys, and export to window
	for(let key in componentsMap) {
		// Skip inherited keys
		if (!componentsMap.hasOwnProperty(key)) continue;
		// Deploy to global
		window[key] = componentsMap[key];
	}
}