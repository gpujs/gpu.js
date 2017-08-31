'use strict';

var utils = require('./utils');
module.exports = function alias(name, fn) {
	var fnString = fn.toString();
	return new Function('return function ' + name + ' (' + utils.getParamNamesFromString(fnString).join(', ') + ') {' + utils.getFunctionBodyFromString(fnString) + '}')();
};