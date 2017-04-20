const BaseKernel = require('../base-kernel');
const GPUUtils = require('../../gpu-utils');

export default class CPUKernel extends BaseKernel {
  validateOptions() {
    if (!this._dimensions || this._dimensions.length === 0) {
      if (arguments.length != 1) {
        throw 'Auto dimensions only supported for kernels with only one input';
      }

      const argType = GPUUtils.getArgumentType(arguments[0]);
      if (argType == 'Array') {
        this._dimensions = GPUUtils.getDimensions(argType);
      } else if (argType == 'Texture') {
        this._dimensions = arguments[0].dimensions;
      } else {
        throw 'Auto dimensions not supported for input type: ' + argType;
      }
    }
  }

  build() {
    const kernelArgs = [];
    for (let i = 0; i < arguments.length; i++) {
      const argType = GPUUtils.getArgumentType(arguments[i]);
      if (argType == 'Array' || argType == 'Number') {
        kernelArgs[i] = arguments[i];
      } else if (argType == 'Texture') {
        kernelArgs[i] = arguments[i].toArray();
      } else {
        throw 'Input type not supported (CPU): ' + arguments[i];
      }
    }

    const threadDim = GPUUtils.clone(this._dimensions);

    while (threadDim.length < 3) {
      threadDim.push(1);
    }

    let ret = new Array(threadDim[2]);
    for (let i = 0; i < threadDim[2]; i++) {
      ret[i] = new Array(threadDim[1]);
      for (let j = 0; j < threadDim[1]; j++) {
        ret[i][j] = new Array(threadDim[0]);
      }
    }

    const ctx = {
      thread: {
        x: 0,
        y: 0,
        z: 0
      },
      dimensions: {
        x: threadDim[0],
        y: threadDim[1],
        z: threadDim[2]
      },
      constants: this._constants
    };

    let canvasCtx;
    let imageData;
    let data;
    if (this._graphical) {
      canvas.width = threadDim[0];
      canvas.height = threadDim[1];

      canvasCtx = canvas.getContext('2d');
      imageData = canvasCtx.createImageData(threadDim[0], threadDim[1]);
      data = new Uint8ClampedArray(threadDim[0] * threadDim[1] * 4);

      ctx.color = function (r, g, b, a) {
        if (a == undefined) {
          a = 1.0;
        }

        r = Math.floor(r * 255);
        g = Math.floor(g * 255);
        b = Math.floor(b * 255);
        a = Math.floor(a * 255);

        const width = ctx.dimensions.x;
        const height = ctx.dimensions.y;

        const x = ctx.thread.x;
        const y = height - ctx.thread.y - 1;

        const index = x + y * width;

        data[index * 4 + 0] = r;
        data[index * 4 + 1] = g;
        data[index * 4 + 2] = b;
        data[index * 4 + 3] = a;
      };
    }

    for (ctx.thread.z = 0; ctx.thread.z < threadDim[2]; ctx.thread.z++) {
      for (ctx.thread.y = 0; ctx.thread.y < threadDim[1]; ctx.thread.y++) {
        for (ctx.thread.x = 0; ctx.thread.x < threadDim[0]; ctx.thread.x++) {
          ret[ctx.thread.z][ctx.thread.y][ctx.thread.x] = kernel.apply(ctx, kernelArgs);
        }
      }
    }

    if (this._graphical) {
      imageData.data.set(data);
      canvasCtx.putImageData(imageData, 0, 0);
    }

    if (this._dimensions.length == 1) {
      ret = ret[0][0];
    } else if (this._dimensions.length == 2) {
      ret = ret[0];
    }

    return ret;
  }
}