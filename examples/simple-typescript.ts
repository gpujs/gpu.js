import { GPU, KernelFunction, IKernelRunShortcut } from '../src';

const gpu = new GPU({ mode: 'gpu' });

// Look ma! I can typescript on my GPU!
const kernelFunction: KernelFunction = function(anInt: number, anArray: number[], aNestedArray: number[][]) {
  const x = .25 + anInt + anArray[this.thread.x] + aNestedArray[this.thread.x][this.thread.y];
  return x;
};

const kernel: IKernelRunShortcut = gpu.createKernel(kernelFunction)
  .setOutput([1]);

const result = kernel(1, [.25], [[1.5]]);

console.log(result[0]); // 3
