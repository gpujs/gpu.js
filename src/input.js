class Input {
  constructor(value, size) {
    this.value = value;
    if (Array.isArray(size)) {
      this.size = size;
    } else {
      this.size = new Int32Array(3);
      if (size.z) {
        this.size = new Int32Array([size.x, size.y, size.z]);
      } else if (size.y) {
        this.size = new Int32Array([size.x, size.y]);
      } else {
        this.size = new Int32Array([size.x]);
      }
    }

    const [w, h, d] = this.size;
    if (d) {
      if (this.value.length !== (w * h * d)) {
        throw new Error(`Input size ${this.value.length} does not match ${w} * ${h} * ${d} = ${(h * w * d)}`);
      }
    } else if (h) {
      if (this.value.length !== (w * h)) {
        throw new Error(`Input size ${this.value.length} does not match ${w} * ${h} = ${(h * w)}`);
      }
    } else {
      if (this.value.length !== w) {
        throw new Error(`Input size ${this.value.length} does not match ${w}`);
      }
    }

  }

  toArray() {
    const { utils } = require('./utils');
    const [w, h, d] = this.size;
    if (d) {
      return utils.erectMemoryOptimized3DFloat(this.value.subarray ? this.value : new Float32Array(this.value), w, h, d);
    } else if (h) {
      return utils.erectMemoryOptimized2DFloat(this.value.subarray ? this.value : new Float32Array(this.value), w, h);
    } else {
      return this.value;
    }
  }
}

function input(value, size) {
  return new Input(value, size);
}

module.exports = {
  Input,
  input
};