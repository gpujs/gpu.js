const path = require('path');
const { expect } = require('chai');

const GPU = require('../src/index.js');


describe('Test Node GPU', () => {
  it('should find gpu', () => {
    const gpu = new GPU();

    const myFunc = gpu.createKernel(function compute() {
      const i = this.thread.x;
      const j = 0.89;
      return i + j;
    }).setOutput([100]);

    console.log(myFunc());

    expect(typeof GPU).to.equal('function');
    expect(typeof gpu).to.equal('object');
  });
});
