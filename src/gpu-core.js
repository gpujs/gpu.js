///
/// Class: GPUCore
///
/// This is a minimalistic version of GPU.js used 
/// To run precompiled GPU.JS code
///
/// This intentionally excludes the JS AST compiller : which is 400kb alone
///
module.exports = class GPUCore {

	///
	///
	///

	///
	/// Function: createPrecompiledKernel
	///
	/// Loads the precompilled kernel object. For GPUCore this is the ONLY way to create the kernel.
	/// To generate the kernelObj, see `GPU.precompileKernel`
	///
	/// @param  {Object}  The precompilled kernel object
	/// @param  {Object}  [Optional] the option overrides to use
	///
	/// @return  {Function} The kernel function
	/// 
	createPrecompiledKernel(kernelObj, inOpt) {

	}
}