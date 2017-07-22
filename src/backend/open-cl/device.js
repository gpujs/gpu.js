const nooocl = require('nooocl');
const CLHost = nooocl.CLHost;
const host = CLHost.createV11();
const defs = host.cl.defs;
const platforms = host.getPlatforms();
let device;

function searchForDevice(hardware) {
  platforms.forEach(function (p) {
    let devices = hardware === 'gpu' ? p.gpuDevices() : p.cpuDevices();
    devices = devices.filter(function (d) {
      // Is double precision supported?
      // See: https://www.khronos.org/registry/cl/sdk/1.1/docs/man/xhtml/clGetDeviceInfo.html
      return d.doubleFpConfig &
        (defs.CL_FP_FMA | defs.CL_FP_ROUND_TO_NEAREST | defs.CL_FP_ROUND_TO_ZERO | defs.CL_FP_ROUND_TO_INF | defs.CL_FP_INF_NAN | defs.CL_FP_DENORM);
    });
    if (devices.length) {
      device = devices[0];
    }
    if (device) {
      return false;
    }
  });
}

module.exports = function() {
  searchForDevice('gpu');
  if (!device) {
    console.warn('No GPU device has been found, searching for a CPU fallback.');
    searchForDevice('cpu');
  }

  if (!device) {
    throw new Error('No capable OpenCL 1.1 device has been found.');
  }
  else {
    console.log('Running on device: ' + device.name + ' - ' + device.platform.name);
  }

  return device;
};