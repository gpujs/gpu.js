const BaseRunner = require('../base-runner');
const utils = require('../../utils');
const GPUKernel = require('./gpu-kernel');
const GPUFunctionBuilder = require('./gpu-function-builder');

module.exports = class GPURunner extends BaseRunner {
  constructor(opt) {
    super(new GPUFunctionBuilder());
    this.programUniformLocationCache = {};
    this.programCacheKey = this.getProgramCacheKey(arguments, opt, opt.dimensions);
    this.programCache = {};
    this.bufferCache = {};
    this.textureCache = {};
    this.framebufferCache = {};

    this.Kernel = GPUKernel;
    this.kernel = null;
  }

  getProgramCacheKey(args, opt, outputDim) {
		let key = '';
		for (let i = 0; i < args.length; i++) {
			const argType = utils.getArgumentType(args[i]);
			key += argType;
			if (opt.hardcodeConstants) {
				if (argType === 'Array' || argType === 'Texture') {
					const dimensions = this.getDimensions(args[i], true);
					key += '['+dimensions[0]+','+dimensions[1]+','+dimensions[2]+']';
				}
			}
		}

		let specialFlags = '';
		if (opt.wraparound) {
			specialFlags += 'Wraparound';
		}

		if (opt.hardcodeConstants) {
			specialFlags += 'Hardcode';
			specialFlags += '['+outputDim[0]+','+outputDim[1]+','+outputDim[2]+']';
		}

		if (opt.constants) {
			specialFlags += 'Constants';
			specialFlags += JSON.stringify(opt.constants);
		}

		if (specialFlags) {
			key = key + '-' + specialFlags;
		}

		return key;
	}

  getUniformLocation(name) {
    let location = this.programUniformLocationCache[this.programCacheKey][name];
    if (!location) {
      location = gl.getUniformLocation(program, name);
      this.programUniformLocationCache[this.programCacheKey][name] = location;
    }
    return location;
  }

	get mode() {
    return 'gpu';
  }
};
