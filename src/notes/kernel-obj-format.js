/**
 * File: kernel-obj-format
 *
 * @class KernelObjFormat
 *
 * The kernelObj is a standard JS object that matches the following format.
 *
 * This is generated via <exportKernelObj>
 *
 * |-----------------|---------------|---------------------------------------------------------------------------|
 * | Name            | Value Type    | Description                                                               |
 * |-----------------|---------------|---------------------------------------------------------------------------|
 * | isKernelObj     | <Boolean>     | Boolean true flag, that is compulsory in the kernel obj validation        |
 * | common          | <Object>      | Common object shared across precompiled object                            |
 * | js              | <Object>      | Object representing the precompiled kernel for CPU mode                   |
 * | webgl           | <Object>      | Object representing the precompiled kernel for W mode                     |
 * |-----------------|---------------|---------------------------------------------------------------------------|
 */