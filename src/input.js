class Input {
  constructor(value, size) {
    this.value = value;
    this.size = new Int32Array(3);
    if (Array.isArray(size)) {
      for (let i = 0; i < this.size.length; i++) {
        this.size[i] = size[i] || 1;
      }
    } else {
      if (size.z) {
        this.size = new Int32Array([size.x, size.y, size.z]);
      } else if (size.y) {
        this.size = new Int32Array([size.x, size.y, 1]);
      } else {
        this.size = new Int32Array([size.x, 1, 1]);
      }
    }

    const [h, w, d] = this.size;
    if (this.value.length !== (h * w * d)) {
      throw new Error(`Input size ${this.value.length} does not match ${w} * ${h} * ${d} = ${(h * w * d)}`);
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