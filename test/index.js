const { expect } = require('chai');

const GPU = require('../src/index.js');


describe('Test Node GPU', () => {
  it('should find gpu', () => {
    const gpu = new GPU({ mode: 'webgl' });

    const myFunc = gpu.createKernel(function compute() {
      const i = this.thread.x;
      const j = 0.89;
      return i + j;
    }).setOutput([512, 512]);

    const iff = myFunc()

    console.log(iff);

    expect(typeof GPU).to.equal('function');
    expect(typeof gpu).to.equal('object');
  });
});
