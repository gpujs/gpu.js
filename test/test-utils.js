
const testUtils = {
  /**
   * A visual debug utility
   * @param {GPU} gpu
   * @param rgba
   * @param width
   * @param height
   * @return {Object[]}
   */
  splitRGBAToCanvases: (gpu, rgba, width, height) => {
    const visualKernelR = gpu.createKernel(function(v) {
      const pixel = v[this.thread.y][this.thread.x];
      this.color(pixel.r / 255, 0, 0, 255);
    }, { output: [width, height], graphical: true, argumentTypes: { v: 'Array2D(4)' } });
    visualKernelR(rgba);

    const visualKernelG = gpu.createKernel(function(v) {
      const pixel = v[this.thread.y][this.thread.x];
      this.color(0, pixel.g / 255, 0, 255);
    }, { output: [width, height], graphical: true, argumentTypes: { v: 'Array2D(4)' } });
    visualKernelG(rgba);

    const visualKernelB = gpu.createKernel(function(v) {
      const pixel = v[this.thread.y][this.thread.x];
      this.color(0, 0, pixel.b / 255, 255);
    }, { output: [width, height], graphical: true, argumentTypes: { v: 'Array2D(4)' } });
    visualKernelB(rgba);

    const visualKernelA = gpu.createKernel(function(v) {
      const pixel = v[this.thread.y][this.thread.x];
      this.color(255, 255, 255, pixel.a / 255);
    }, { output: [width, height], graphical: true, argumentTypes: { v: 'Array2D(4)' } });
    visualKernelA(rgba);

    return [
      visualKernelR.getPixels(),
      visualKernelG.getPixels(),
      visualKernelB.getPixels(),
      visualKernelA.getPixels(),
    ];
  },
};

module.exports = testUtils;
