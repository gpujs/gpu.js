'use strict';

// Initialize data on the host side:
var n = 1000;
var bytes = n * double.size;

var h_a = new Buffer(n * double.size);
var h_b = new Buffer(n * double.size);
var h_c = new Buffer(n * double.size);

// Initialize vectors on host
for (var i = 0; i < n; i++) {
  var offset = i * double.size;
  double.set(h_a, offset, 0.1 + 0.2);
  double.set(h_b, offset, 0);
}

// Create device memory buffers
var d_a = new CLBuffer(context, defs.CL_MEM_READ_ONLY, bytes);
var d_b = new CLBuffer(context, defs.CL_MEM_READ_ONLY, bytes);
var d_c = new CLBuffer(context, defs.CL_MEM_WRITE_ONLY, bytes);

// Copy memory buffers
// Notice: the is no synchronous operations in NOOOCL,
// so there is no blocking_write parameter there.
// All writes and reads are asynchronous.
queue.enqueueWriteBuffer(d_a, 0, bytes, h_a);
queue.enqueueWriteBuffer(d_b, 0, bytes, h_b);

// It's time to build the program.
var kernelSourceCode = `
#pragma OPENCL EXTENSION cl_khr_fp64 : enable
__kernel void vecAdd(  __global double *a,
                       __global double *b,
                       __global double *c,
                       const unsigned int n)
{
    //Get our global thread ID
    int id = get_global_id(0);

    //Make sure we do not go out of bounds
    if (id < n)
        c[id] = a[id] + b[id];
}
`;
var program = context.createProgram(kernelSourceCode);

console.log('Building ...');
// Building is always asynchronous in NOOOCL!
nooocl.scope(function () {
  return program.build('-cl-fast-relaxed-math')
    .then(function () {
      var buildStatus = program.getBuildStatus(device);
      var buildLog = program.getBuildLog(device);
      console.log(buildLog);
      if (buildStatus < 0) {
        throw new CLError(buildStatus, 'Build failed.');
      }
      console.log('Build completed.');

      // Kernel stuff:
      var kernel = program.createKernel('vecAdd');

      kernel.setArg(0, d_a);
      kernel.setArg(1, d_b);
      kernel.setArg(2, d_c);
      // Notice: in NOOOCL you have specify type of value arguments,
      // because there is no C compatible type system exists in JavaScript.
      kernel.setArg(3, n, 'uint');

      // Ranges:
      // Number of work items in each local work group
      var localSize = new NDRange(64);
      // Number of total work items - localSize must be devisor
      var globalSize = new NDRange(Math.ceil(n / 64) * 64);

      console.log('Launching the kernel.');

      // Enqueue the kernel asynchronously
      queue.enqueueNDRangeKernel(kernel, globalSize, localSize);

      // Then copy back the result from the device to the host asynchronously,
      // when the queue ends.
      // We should query a waitable queue which returns an event for each enqueue operations,
      // and the event's promise can be used for continuation of the control flow on the host side.
      console.log('Waiting for result.');
      return queue.waitable().enqueueReadBuffer(d_c, 0, bytes, h_c).promise
        .then(function() {
          // Data gets back to host, we're done:

          var sum = 0;
          for (var i = 0; i < n; i++) {
            var offset = i * double.size;
            sum += double.get(h_c, offset);
          }

          console.log('Final result: ' + sum / n);
        });
    });
});

console.log('(Everything after this point is asynchronous.)');