const utils = require('./utils');

function alias(name, fn) {
	const fnString = fn.toString();
	return new Function(`return function ${ name } (${ utils.getArgumentNamesFromString(fnString).join(', ') }) {${ utils.getFunctionBodyFromString(fnString) }}`)();
}

module.exports = alias;