const {
	Input
} = require('./input');
const {
	Texture
} = require('./texture');

const FUNCTION_NAME = /function ([^(]*)/;
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;

/**
 *
 * @desc Various utility functions / snippets of code that GPU.JS uses internally.
 * This covers various snippets of code that is not entirely gpu.js specific (ie. may find uses elsewhere)
 */
const utils = {
	/**
	 *
	 * @desc Gets the system endianness, and cache it
	 * @returns {String} 'LE' or 'BE' depending on system architecture
	 * Credit: https://gist.github.com/TooTallNate/4750953
	 */
	systemEndianness() {
		return _systemEndianness;
	},
	getSystemEndianness() {
		const b = new ArrayBuffer(4);
		const a = new Uint32Array(b);
		const c = new Uint8Array(b);
		a[0] = 0xdeadbeef;
		if (c[0] === 0xef) return 'LE';
		if (c[0] === 0xde) return 'BE';
		throw new Error('unknown endianness');
	},

	/**
	 * @descReturn TRUE, on a JS function
	 * @param {Function} funcObj - Object to validate if its a function
	 * @returns	{Boolean} TRUE if the object is a JS function
	 */
	isFunction(funcObj) {
		return typeof(funcObj) === 'function';
	},

	/**
	 * @desc Return TRUE, on a valid JS function string
	 * Note: This does just a VERY simply sanity check. And may give false positives.
	 *
	 * @param {String} fn - String of JS function to validate
	 * @returns {Boolean} TRUE if the string passes basic validation
	 */
	isFunctionString(fn) {
		if (typeof fn === 'string') {
			return (fn
				.slice(0, 'function'.length)
				.toLowerCase() === 'function');
		}
		return false;
	},

	/**
	 * @desc Return the function name from a JS function string
	 * @param {String} funcStr - String of JS function to validate
	 * @returns {String} Function name string (if found)
	 */
	getFunctionNameFromString(funcStr) {
		return FUNCTION_NAME.exec(funcStr)[1].trim();
	},

	getFunctionBodyFromString(funcStr) {
		return funcStr.substring(funcStr.indexOf('{') + 1, funcStr.lastIndexOf('}'));
	},

	/**
	 * @desc Return list of argument names extracted from a javascript function
	 * @param {String} fn - String of JS function to validate
	 * @returns {String[]}  Array representing all the parameter names
	 */
	getArgumentNamesFromString(fn) {
		const fnStr = fn.replace(STRIP_COMMENTS, '');
		let result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
		if (result === null) {
			result = [];
		}
		return result;
	},

	/**
	 * @desc Returns a clone
	 * @param {Object} obj - Object to clone
	 * @returns {Object|Array} Cloned object
	 */
	clone(obj) {
		if (obj === null || typeof obj !== 'object' || obj.hasOwnProperty('isActiveClone')) return obj;

		const temp = obj.constructor(); // changed

		for (let key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				obj.isActiveClone = null;
				temp[key] = utils.clone(obj[key]);
				delete obj.isActiveClone;
			}
		}

		return temp;
	},

	/**
	 * @desc Checks if is an array or Array-like object
	 * @param {Object} array - The argument object to check if is array
	 * @returns {Boolean}  true if is array or Array-like object
	 */
	isArray(array) {
		return !isNaN(array.length);
	},

	/**
	 * @desc Evaluate the argument type, to apply respective logic for it
	 * @param {Object} value - The argument object to evaluate type
	 * @returns {String}  Argument type Array/Number/Float/Texture/Unknown
	 */
	getVariableType(value) {
		if (utils.isArray(value)) {
			if (value[0].nodeName === 'IMG') {
				return 'HTMLImageArray';
			}
			return 'Array';
		} else if (typeof value === 'number') {
			if (Number.isInteger(value)) {
				return 'Integer';
			}
			return 'Float';
		} else if (typeof value === 'boolean') {
			return 'Boolean';
		} else if (value instanceof Texture) {
			return value.type;
		} else if (value instanceof Input) {
			return 'Input';
		} else if (value.nodeName === 'IMG') {
			return 'HTMLImage';
		} else {
			return 'Unknown';
		}
	},


	dimToTexSize(opt, dimensions, output) {
		let [w, h, d] = dimensions;
		let texelCount = (w || 1) * (h || 1) * (d || 1);

		if (opt.floatTextures && (!output || opt.precision === 'single')) {
			w = texelCount = Math.ceil(texelCount / 4);
		}
		// if given dimensions == a 2d image
		if (h > 1 && w * h === texelCount) {
			return new Int32Array([w, h]);
		}
		return utils.closestSquareDimensions(texelCount);
	},

	/**
	 *
	 * @param {Number} length
	 * @returns {TextureDimensions}
	 */
	closestSquareDimensions(length) {
		const sqrt = Math.sqrt(length);
		let high = Math.ceil(sqrt);
		let low = Math.floor(sqrt);
		while (high * low < length) {
			high--;
			low = Math.ceil(length / high);
		}
		return new Int32Array([low, Math.ceil(length / low)]);
	},

	/**
	 * A texture takes up four
	 * @param {OutputDimensions} dimensions
	 * @param {Number} bitRatio
	 * @returns {TextureDimensions}
	 */
	getMemoryOptimizedFloatTextureSize(dimensions, bitRatio) {
		const [w, h, d] = dimensions;
		const totalArea = utils.roundTo((w || 1) * (h || 1) * (d || 1), 4);
		const texelCount = totalArea / bitRatio;
		return utils.closestSquareDimensions(texelCount);
	},

	/**
	 *
	 * @param dimensions
	 * @param bitRatio
	 * @returns {*|TextureDimensions}
	 */
	getMemoryOptimizedPackedTextureSize(dimensions, bitRatio) {
		const [w, h, d] = dimensions;
		const totalArea = utils.roundTo((w || 1) * (h || 1) * (d || 1), 4);
		const texelCount = totalArea / (4 / bitRatio);
		return utils.closestSquareDimensions(texelCount);
	},

	roundTo(n, d) {
		return Math.floor((n + d - 1) / d) * d;
	},
	/**
	 * @desc Return the dimension of an array.
	 * @param {Array|String|Texture|Input} x - The array
	 * @param {Boolean} [pad] - To include padding in the dimension calculation
	 * @returns {OutputDimensions}
	 */
	getDimensions(x, pad) {
		let ret;
		if (utils.isArray(x)) {
			const dim = [];
			let temp = x;
			while (utils.isArray(temp)) {
				dim.push(temp.length);
				temp = temp[0];
			}
			ret = dim.reverse();
		} else if (x instanceof Texture) {
			ret = x.output;
		} else if (x instanceof Input) {
			ret = x.size;
		} else {
			throw new Error(`Unknown dimensions of ${x}`);
		}

		if (pad) {
			ret = Array.from(ret);
			while (ret.length < 3) {
				ret.push(1);
			}
		}

		return new Int32Array(ret);
	},

	/**
	 * Puts a nested 2d array into a one-dimensional target array
	 * @param {Array|*} array
	 * @param {Float32Array|Float64Array} target
	 */
	flatten2dArrayTo(array, target) {
		let offset = 0;
		for (let y = 0; y < array.length; y++) {
			target.set(array[y], offset);
			offset += array[y].length;
		}
	},

	/**
	 * Puts a nested 3d array into a one-dimensional target array
	 * @param {Array|*} array
	 * @param {Float32Array|Float64Array} target
	 */
	flatten3dArrayTo(array, target) {
		let offset = 0;
		for (let z = 0; z < array.length; z++) {
			for (let y = 0; y < array[z].length; y++) {
				target.set(array[z][y], offset);
				offset += array[z][y].length;
			}
		}
	},

	/**
	 * Puts a nested 1d, 2d, or 3d array into a one-dimensional target array
	 * @param {Float32Array|Uint16Array|Uint8Array} array
	 * @param {Float32Array} target
	 */
	flattenTo(array, target) {
		if (utils.isArray(array[0])) {
			if (utils.isArray(array[0][0])) {
				utils.flatten3dArrayTo(array, target);
			} else {
				utils.flatten2dArrayTo(array, target);
			}
		} else {
			target.set(array);
		}
	},

	/**
	 *
	 * @desc Splits an array into smaller arrays.
	 * Number of elements in one small chunk is given by `part`
	 *
	 * @param {Number[]} array - The array to split into chunks
	 * @param {Number} part - elements in one chunk
	 *
	 * @returns {Number[]} An array of smaller chunks
	 */
	splitArray(array, part) {
		const result = [];
		for (let i = 0; i < array.length; i += part) {
			result.push(new array.constructor(array.buffer, i * 4 + array.byteOffset, part));
		}
		return result;
	},

	getAstString(source, ast) {
		const lines = Array.isArray(source) ? source : source.split(/\r?\n/g);
		const start = ast.loc.start;
		const end = ast.loc.end;
		const result = [];
		result.push(lines[start.line - 1].slice(start.column));
		for (let i = start.line; i < end.line - 1; i++) {
			result.push(lines[i]);
		}
		result.push(lines[end.line - 1].slice(0, end.column));
		return result.join('\n');
	},

	allPropertiesOf(obj) {
		const props = [];

		do {
			props.push.apply(props, Object.getOwnPropertyNames(obj));
		} while (obj = Object.getPrototypeOf(obj));

		return props;
	},

	/**
	 * @param {Array} lines - An Array of strings
	 * @returns {String} Single combined String, seperated by *\n*
	 */
	linesToString(lines) {
		if (lines.length > 0) {
			return lines.join(';\n') + ';\n';
		} else {
			return '\n';
		}
	},
	warnDeprecated(type, oldName, newName) {
		if (newName) {
			console.warn(`You are using a deprecated ${ type } "${ oldName }". It has been replaced with "${ newName }". Fixing, but please upgrade as it will soon be removed.`);
		} else {
			console.warn(`You are using a deprecated ${ type } "${ oldName }". It has been removed. Fixing, but please upgrade as it will soon be removed.`);
		}
	},
	/**
	 *
	 * @param {String|Function} source
	 * @param {IFunctionSettings} [settings]
	 * @returns {IFunction}
	 */
	functionToIFunction(source, settings) {
		settings = settings || {};
		if (typeof source !== 'string' && typeof source !== 'function') throw new Error('source not a string or function');
		const sourceString = typeof source === 'string' ? source : source.toString();

		let argumentTypes = [];

		if (Array.isArray(settings.argumentTypes)) {
			argumentTypes = settings.argumentTypes;
		} else if (typeof settings.argumentTypes === 'object') {
			argumentTypes = utils.getArgumentNamesFromString(sourceString)
				.map(name => settings.argumentTypes[name]) || [];
		} else {
			argumentTypes = settings.argumentTypes || [];
		}

		return {
			source: sourceString,
			argumentTypes,
			returnType: settings.returnType || null,
		};
	}
};

const _systemEndianness = utils.getSystemEndianness();

module.exports = {
	utils
};