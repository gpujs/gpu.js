'use strict';

const utils = require('./utils');

function alias(name, fn) {
	const fnString = fn.toString();
	return new Function(`return function ${ name } (${ utils.getParamNamesFromString(fnString).join(', ') }) {${ utils.getFunctionBodyFromString(fnString) }}`)();
}

module.exports = alias;