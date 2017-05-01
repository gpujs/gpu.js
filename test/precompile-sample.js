// Build the GPU.js kernel
var kFunc = function kernelFunction(A) {
	var res = A[this.thread.x];
	for(var i=1; i < 5000; ++i) {
		res = (res*i)/((res-1)*i);
	}
	return res;
};
var g = new GPU();
var sampleK = g.createKernel(kFunc).dimensions([5000]);

// Get sample args
var sampleArgs = [];
for(var i=0; i<5000; ++i) {
	sampleArgs[i] = i;
}

// Get the sample result
var bCpuResult = g.createKernel(kFunc, { mode : "cpu" }).dimensions([5000])(sampleArgs);
var bGpuResult = g.createKernel(kFunc, { mode : "gpu" }).dimensions([5000])(sampleArgs);

// Precompilled output
var o = sampleK.outputPrecompiledKernel(["Array"]);

// Rebuild CPU mode
var pCpu = PrecompilledGPU(o, { mode : "cpu" });
var pCpuResult = pCpu(sampleArgs);

// Rebuild GPU mode
var pGpu = PrecompilledGPU(o, { mode : "gpu" });
var pGpuResult = pGpu(sampleArgs);