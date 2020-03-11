/**
 * This is an arbitrary example (overly complex with types for overly simplified kernel) to show type inheritance
 * throughout the kernel's usage.
 *
 * The whole idea here is that you can define custom:
 * - `constants`
 * - `this` context
 * - mapped kernels
 * - arguments
 * - kernel output
 */

import { GPU, Texture, IKernelFunctionThis, IConstantsThis } from '../src';

const gpu = new GPU();

interface IConstants extends IConstantsThis {
  rotation: number,
}

interface IThis extends IKernelFunctionThis {
  constants: IConstants,
}

function kernelFunction(this: IThis, degrees: number, divisors: [number, number]): [number, number] {
  const bounds = subKernel(this.constants.rotation * degrees);
  return [bounds[0] / divisors[0], bounds[1] / divisors[1]];
}

function subKernel(value: number): [number, number] {
  return [-value, value];
}

const kernelMap = gpu.createKernelMap<typeof kernelFunction>({
  test: subKernel,
}, kernelFunction)
  .setConstants<IConstants>({
    rotation: 45,
  })
  .setOutput([1])
  .setPrecision('single')
  .setPipeline(true)
  .setImmutable(true);

const { test, result } = kernelMap(360, [256, 512]);
const testTexture = test as Texture;
const resultTexture = result as Texture;

console.log(testTexture.toArray() as [number, number][]);
console.log(resultTexture.toArray() as [number, number][]);

testTexture.delete();
resultTexture.delete();

kernelMap.destroy();