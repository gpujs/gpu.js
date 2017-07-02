///
/// File: kernel-obj-format
///
/// Class: KernelObjFormat
///
/// The kernelObj is a standard JS object that matches the following format.
///
/// This is generated via <exportKernelObj>
///
/// |---------------|---------------|---------------------------------------------------------------------------|
/// | Name          | Value Type    | Description                                                               |
/// |---------------|---------------|---------------------------------------------------------------------------|
/// | isKernelObj   | <Boolean>     | Boolean true flag, that is compulsory in the kernel obj validation        |
/// | optObj        | <Object>      | { option object }                                                         |
/// | jsFunctions   | <String>      | String representation of the JS functions                                 |
/// | jsKernel      | <String>      | String representation of the JS kernel                                    |
/// | glHeaders     | <String>      | Precompiled webgl prototype function headers                              |
/// | glKernel      | <String>      | Precompiled webgl kernel functions                                        |
/// | paramNames    | <Array>       | Array of strings, containing the kernel parameter names                   |
/// | paramType     | <Array>       | Array of strings, containing the kernel parameter types, can only be      |
/// |               |               | either "Array", "Int", "Float"                                            |
/// |---------------|---------------|---------------------------------------------------------------------------|
///