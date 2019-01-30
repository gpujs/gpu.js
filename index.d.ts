export class GPU {
  static isCanvasSupported: boolean;
  static isHeadlessGLSupported: boolean;
  static isWebGLSupported: boolean;
  static isWebGL2Supported: boolean;
  constructor(settings?: IGPUSettings);
  functions: IFunction[];
  nativeFunctions: INativeFunction[];
  addFunction(kernel: KernelFunction, settings?: IGPUFunctionSettings);
  addNativeFunction(name: string, source: string);
  chooseKernel();
  combineKernels(): Function;
  createKernel(kernel: KernelFunction, settings?: IKernelSettings): IKernel;
  createKernelMap(): IKernel;
  destroy();
  Kernel: IKernel;
  mode: string;
  canvas: any;
  context: any;
}

export interface INativeFunction {
  [functionName: string]: string
}

export type IGPUMode = 'gpu' | 'cpu' | 'webgl' | 'webgl2' | 'headlessgl';

export interface IGPUSettings {
  mode?: IGPUMode;
  canvas?: object;
  context?: object;
  functions?: Function[];
  nativeFunctions?: INativeFunction;
}

export type ValueType
  = 'Array'
  | 'Array(2)'
  | 'Array(3)'
  | 'Array(4)'
  | 'HTMLImage'
  | 'HTMLImageArray'
  | 'Number'
  | 'NumberTexture'
  | 'ArrayTexture(4)';

export interface IGPUArgumentTypes {
  [argumentName: string]: ValueType;
}

export interface IGPUFunctionSettings {
  argumentTypes: IGPUArgumentTypes,
  returnType: ValueType;
}

export class Kernel {
  source: string;
  output: number[];
  debug: boolean;
  graphical: boolean;
  loopMaxIterations: number;
  constantDefinitions: IVariableDefinition[];
  constants: IConstants; //TODO: remove
  constantTypes: string[]; //TODO: remove
  hardcodeConstants: boolean;
  canvas: any;
  context: any;
  functions: IFunction[];
  nativeFunctions: INativeFunction[];
  subKernels: ISubKernel[];
  skipValidateSettings: boolean;
  wraparound: boolean;
  outputImmutable: boolean;
  outputToTexture: boolean;
  texSize: boolean;
}

export interface IConstants {
  [constantName: string]: any
}

export interface IKernelXYZ {
  x: number;
  y?: number;
  z?: number;
}

export interface IKernelSettings {
  output: number[] | IKernelXYZ;
  constants?: object;
  context?: any;
  canvas?: any;
  pipeline?: boolean;
  immutable?: boolean;
}

export interface IKernel {
  isCompatible: boolean;
  features: IKernelFeatures;
  mode: string;
  isContextMatch(context: any): boolean;
  (arg1?: KernelFunctionArgument,
   arg2?: KernelFunctionArgument,
   arg3?: KernelFunctionArgument,
   arg4?: KernelFunctionArgument,
   arg5?: KernelFunctionArgument,
   arg6?: KernelFunctionArgument,
   arg7?: KernelFunctionArgument,
   arg8?: KernelFunctionArgument,
   arg9?: KernelFunctionArgument,
   arg10?: KernelFunctionArgument,
   arg11?: KernelFunctionArgument,
   arg12?: KernelFunctionArgument,
   arg13?: KernelFunctionArgument,
   arg14?: KernelFunctionArgument,
   arg15?: KernelFunctionArgument,
   arg16?: KernelFunctionArgument,
   arg17?: KernelFunctionArgument,
   arg18?: KernelFunctionArgument,
   arg19?: KernelFunctionArgument,
   arg20?: KernelFunctionArgument): KernelOutput
}

export interface IKernelFeatures {
  kernelMap: boolean;
  isIntegerDivisionAccurate: boolean;
}

export interface IKernelFunctionThis {
  output: IKernelXYZ;
  thread: IKernelXYZ;
  constants: object;
}

export type KernelFunctionArgument = number | number[] | number[][] | number[][][];

export type KernelFunction = (
  this: IKernelFunctionThis,
  arg1?: KernelFunctionArgument,
  arg2?: KernelFunctionArgument,
  arg3?: KernelFunctionArgument,
  arg4?: KernelFunctionArgument,
  arg5?: KernelFunctionArgument,
  arg6?: KernelFunctionArgument,
  arg7?: KernelFunctionArgument,
  arg8?: KernelFunctionArgument,
  arg9?: KernelFunctionArgument,
  arg10?: KernelFunctionArgument,
  arg11?: KernelFunctionArgument,
  arg12?: KernelFunctionArgument,
  arg13?: KernelFunctionArgument,
  arg14?: KernelFunctionArgument,
  arg15?: KernelFunctionArgument,
  arg16?: KernelFunctionArgument,
  arg17?: KernelFunctionArgument,
  arg18?: KernelFunctionArgument,
  arg19?: KernelFunctionArgument,
  arg20?: KernelFunctionArgument,
) => KernelOutput;

export type KernelOutput = void | number | number[] | number[][] | number[][][];

export interface IFunction {
  source: string;
  settings: IFunctionSettings;
}

export interface IFunctionSettings {
  name?: string;
  debug?: boolean;
  prototypeOnly?: boolean;
  argumentNames: string[];
  argumentTypes: string[];
  argumentSizes: number[];

  constantDefinitions: IVariableDefinition[];
  constants?: IConstants; //TODO remove
  constantTypes?: string[]; //TODO remove

  output?: number[];
  loopMaxIterations?: number;
  returnType?: string;
  isRootKernel?: boolean;
  isSubKernel?: boolean;
  onNestedFunction?: Function;
  lookupReturnType?: Function;
}

export interface IVariableDefinition {
  name: string;
  type?: ValueType;
  size?: number;
}

export interface ISubKernel {
  name: string;
  source: string;
  property: string | number;
}


export class FunctionBuilder {
  constructor(settings: IFunctionSettings);
  addFunctionNode(functionNode: FunctionNode);
  traceFunctionCalls(functionName: string): string[];
  getStringFromFunctionNames(functionName?: string): string;
  getPrototypesFromFunctionNames(functionName?: string): string[];
}


export interface IFunctionBuilderSettings {
  rootNode: FunctionNode;
  functionNodes?: FunctionNode[];
  subKernelNodes?: FunctionNode[];
  nativeFunctions?: INativeFunction[];
}

export class FunctionNode {

}
