const {
	utils
} = require('./utils');

function kernelRunShortcut(kernel) {
	const shortcut = function() {
		return kernel.run.apply(kernel, arguments);
	};

	utils
		.allPropertiesOf(kernel)
		.forEach((key) => {
			if (key[0] === '_' && key[1] === '_') return;
			if (typeof kernel[key] === 'function') {
				if (key.substring(0, 3) === 'add' || key.substring(0, 3) === 'set') {
					shortcut[key] = function() {
						kernel[key].apply(kernel, arguments);
						return shortcut;
					};
				} else if (key === 'requestFallback') {
					const requestFallback = kernel[key].bind(kernel);
					shortcut[key] = () => {
						kernel = requestFallback();
					};
				} else {
					shortcut[key] = kernel[key].bind(kernel);
				}
			} else {
				shortcut.__defineGetter__(key, () => {
					return kernel[key];
				});
				shortcut.__defineSetter__(key, (value) => {
					kernel[key] = value;
				});
			}
		});

	shortcut.kernel = kernel;

	return shortcut;
}

module.exports = {
	kernelRunShortcut
};