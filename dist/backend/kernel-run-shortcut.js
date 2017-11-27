'use strict';

var utils = require('../core/utils');

module.exports = function kernelRunShortcut(kernel) {
	var shortcut = function shortcut() {
		return kernel.run.apply(kernel, arguments);
	};

	utils.allPropertiesOf(kernel).forEach(function (key) {
		if (key[0] === '_' && key[1] === '_') return;
		if (typeof kernel[key] === 'function') {
			if (key.substring(0, 3) === 'add' || key.substring(0, 3) === 'set') {
				shortcut[key] = function () {
					kernel[key].apply(kernel, arguments);
					return shortcut;
				};
			} else {
				shortcut[key] = kernel[key].bind(kernel);
			}
		} else {
			shortcut.__defineGetter__(key, function () {
				return kernel[key];
			});
			shortcut.__defineSetter__(key, function (value) {
				kernel[key] = value;
			});
		}
	});

	shortcut.kernel = kernel;

	return shortcut;
};