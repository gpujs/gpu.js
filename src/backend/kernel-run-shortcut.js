module.exports = function kernelRunShortcut(kernel) {
	const shortcut = function() {
		return this.run.apply(this, arguments);
	}.bind(kernel);

	allPropertiesOf(kernel).forEach((key) => {
		if (key[0] === '_' && key[1] === '_') return;
		if (typeof kernel[key] === 'function') {
			if (key.substring(0, 3) === 'set') {
				shortcut[key] = function() {
					kernel[key].apply(kernel, arguments);
					return shortcut;
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

	return shortcut;
};

function allPropertiesOf(obj) {
	const props = [];

	do {
		props.push.apply(props, Object.getOwnPropertyNames(obj));
	} while (obj = Object.getPrototypeOf(obj));

	return props;
}