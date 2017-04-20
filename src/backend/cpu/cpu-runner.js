const GPUUtils = require('../../gpu-utils');
const BaseRunner = require('../base-runner');

export default class CPURunner extends BaseRunner {
  constructor() {
    super();
    this._canvas = GPUUtils.initCanvas();
    this.Kernel = CPUKernel;
    this.kernel = null;
  }
	/// JS fallback transformation, basically pure JS
	///
	/// @param inputFunction   The calling to perform the conversion
	/// @param opt             The parameter object
	///
	/// @returns callable function if converted, else returns null
  buildKernel(fnString, fn) {
    const kernel = this._kernelFunction;
    const opt = this._kernelParamObj;
		let canvas = gpu._canvasCpu;
		if (!canvas) {
			canvas = gpu._canvasCpu = GPUUtils.initCanvas();
		}
		

		
		ret.canvas = canvas;

		return this.setupExecutorExtendedFunctions(ret, opt);
	}

	get mode() {
    return 'cpu';
  }
}
