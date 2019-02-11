const { expect } = require('chai');

const GPU = require('../src/index.js');

describe('Test Node GPU', () => {
  describe('gpu mode', () => {
    it('should find and use gpu runner', () => {
      const gpu = new GPU({ mode: 'gpu' });

      const kernel = gpu.createKernel(function() {
        return 1;
      }).setOutput([1]);

      const result = kernel();

      expect(gpu.runner.constructor).to.equal(GPU.HeadlessGLRunner);
      expect(result[0]).to.equal(1);
    });

    it('supports 2x2 size', () => {
      const gpu = new GPU({ mode: 'gpu' });

      const kernel = gpu.createKernel(function() {
        return this.thread.x * this.thread.y;
      }).setOutput([2, 2]);

      const result = kernel();

      expect(gpu.runner.constructor).to.equal(GPU.HeadlessGLRunner);
      expect(result).to.deep.equal(
        [
          Float32Array.from([0,0]),
          Float32Array.from([0,1])
        ]
      );
    });
  });

  describe('cpu mode', () => {
    it('should find and use gpu runner', () => {
      const gpu = new GPU({ mode: 'cpu' });

      const kernel = gpu.createKernel(function() {
        return 1;
      }).setOutput([1]);

      const result = kernel();

      expect(gpu.runner.constructor).to.equal(GPU.CPURunner);
      expect(result[0]).to.equal(1);
    });

    it('supports 2x2 size', () => {
      const gpu = new GPU({ mode: 'cpu' });

      const kernel = gpu.createKernel(function() {
        return this.thread.x * this.thread.y;
      }).setOutput([2, 2]);

      const result = kernel();

      expect(gpu.runner.constructor).to.equal(GPU.CPURunner);
      expect(result).to.deep.equal(
        [
          Float32Array.from([0,0]),
          Float32Array.from([0,1])
        ]
      );
    });
  });
});

