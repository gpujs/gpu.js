const BaseKernel = require('../base-kernel');
const utils = require('../../utils');

module.exports = class CPUKernel extends BaseKernel {
  constructor(fnString, settings) {
    super(fnString, settings);
    this._fnBody = utils.getFunctionBodyFromString(fnString);
    this.run = null;
    this.canvas = utils.initCanvas();
    this.thread = {
      x: 0,
      y: 0,
      z: 0
    };
    this.runDimensions = {
      x: null,
      y: null,
      z: null
    };

    this.run = function() {
      this.run = null;
      this.build();
      return this.run.apply(this, arguments);
    }.bind(this);
  }

  validateOptions() {
    if (!this.dimensions || this.dimensions.length === 0) {
      if (arguments.length !== 1) {
        throw 'Auto dimensions only supported for kernels with only one input';
      }

      const argType = utils.getArgumentType(arguments[0]);
      if (argType === 'Array') {
        this.dimensions = utils.getDimensions(argType);
      } else if (argType === 'Texture') {
        this.dimensions = arguments[0].dimensions;
      } else {
        throw 'Auto dimensions not supported for input type: ' + argType;
      }
    }
  }

  build() {
    const kernelArgs = [];
    for (let i = 0; i < arguments.length; i++) {
      const argType = utils.getArgumentType(arguments[i]);
      if (argType === 'Array' || argType === 'Number') {
        kernelArgs[i] = arguments[i];
      } else if (argType === 'Texture') {
        kernelArgs[i] = arguments[i].toArray();
      } else {
        throw 'Input type not supported (CPU): ' + arguments[i];
      }
    }

    const threadDim = this.threadDim = utils.clone(this.dimensions);

    while (threadDim.length < 3) {
      threadDim.push(1);
    }

    const fnBody = this._fnBody;
    const runBody = [`var ret = new Array(${ threadDim[2] })`];
    for (let z = 0; z < threadDim[2]; z++) {
      runBody.push(
        `ret[${ z }] = new Array(${ threadDim[1] })`,
        `this.thread.z = ${ z }`
      );
      for (let y = 0; y < threadDim[1]; y++) {
        runBody.push(
          `ret[${ z }][${ y }] = new Array(${ threadDim[0] })`,
          `this.thread.y = ${ y }`
        );
        for (let x = 0; x < threadDim[0]; x++) {
          runBody.push(
            `this.thread.x = ${ x }`,
            fnBody.replace(/return[ ]/g, `ret[${ z }][${ y }][${ x }] = `)
          );
        }
      }
    }

    if (this.dimensions.length === 1) {
      runBody.push('ret = ret[0][0]');
    } else if (this.dimensions.length === 2) {
      runBody.push('ret = ret[0]');
    }


    if (this.graphical) {
      const canvas = this.canvas;
      canvas.width = threadDim[0];
      canvas.height = threadDim[1];

      const canvasCtx = canvas.getContext('2d');
      const imageData = canvasCtx.createImageData(threadDim[0], threadDim[1]);
      const data = new Uint8ClampedArray(threadDim[0] * threadDim[1] * 4);

      ctx.color = '';
    }

    if (this.graphical) {
      imageData.data.set(data);
      canvasCtx.putImageData(imageData, 0, 0);
    }

    runBody.push('return ret');

    this.run = new Function(this.paramNames, '  ' + runBody.join(';\n  ') + ';');
  }

  color(r, g, b, a) {
    if (typeof a === 'undefined') {
      a = 1;
    }

    const data = new Uint8ClampedArray(this.threadDim[0] * this.threadDim[1] * 4);

    r = Math.floor(r * 255);
    g = Math.floor(g * 255);
    b = Math.floor(b * 255);
    a = Math.floor(a * 255);

    const width = this.runDimensions.x;
    const height = this.runDimensions.y;

    const x = this.thread.x;
    const y = height - this.thread.y - 1;

    const index = x + y * width;

    data[index * 4 + 0] = r;
    data[index * 4 + 1] = g;
    data[index * 4 + 2] = b;
    data[index * 4 + 3] = a;
  }
};