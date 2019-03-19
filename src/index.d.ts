export class GPU {
  static isGPUSupported: boolean;
  static isCanvasSupported: boolean;
  static isHeadlessGLSupported: boolean;
  static isWebGLSupported: boolean;
  static isWebGL2Supported: boolean;
  static isKernelMapSupported: boolean;
  static isOffscreenCanvasSupported: boolean;
  static isGPUHTMLImageArraySupported: boolean;
  static isFloatOutputSupported: boolean;
  constructor(settings?: IGPUSettings);
  functions: IGPUFunction[];
  nativeFunctions: IGPUNativeFunction[];
  addFunction(kernel: KernelFunction, settings?: IGPUFunctionSettings): this;
  addNativeFunction(name: string, source: string): this;
  combineKernels(...kernels: Function[]): KernelFunction;
  createKernel(kernel: KernelFunction, settings?: IKernelSettings): IKernelRunShortcut;
  createKernelMap(subKernels: Object | Array<Function>, rootKernel: Function): IKernelRunShortcut;
  destroy(): void;
  Kernel: typeof Kernel;
  mode: string;
  canvas: any;
  context: any;
}

export interface IGPUFunction extends IFunctionSettings {
  source: string;
}

export interface IGPUNativeFunction extends IGPUFunctionSettings {
  name: string;
  source: string;
  settings: object;
}

export interface INativeFunctionList {
  [functionName: string]: string
}

export type GPUMode = 'gpu' | 'cpu' | 'dev';
export type GPUInternalMode = 'webgl' | 'webgl2' | 'headlessgl';

export interface IGPUSettings {
  mode?: GPUMode | GPUInternalMode;
  canvas?: object;
  context?: object;
  functions?: KernelFunction[];
  nativeFunctions?: INativeFunctionList;
}

export type GPUVariableType
  = 'Array'
  | 'Array(2)'
  | 'Array(3)'
  | 'Array(4)'
  | 'HTMLImage'
  | 'HTMLImageArray'
  | 'Number'
  | GPUTextureType;

export type GPUTextureType
  = 'NumberTexture'
  | 'ArrayTexture(4)';

export interface IGPUArgumentTypes {
  [argumentName: string]: GPUVariableType;
}

export interface IGPUFunctionSettings {
  argumentTypes?: IGPUArgumentTypes,
  returnType: GPUVariableType;
}

export class Kernel {
  static isSupported: boolean;
  static isContextMatch(context: any): boolean;
  static nativeFunctionArgumentTypes(source: string): IArgumentTypes;
  static nativeFunctionReturnType(source: string): string;
  static destroyContext(context: any);
  static features: IKernelFeatures;
  source: string | object;
  output: number[];
  debug: boolean;
  graphical: boolean;
  loopMaxIterations: number;
  constants: IConstants;
  canvas: any;
  context: any;
  functions: IFunction[];
  nativeFunctions: INativeFunctionList[];
  subKernels: ISubKernel[];
  skipValidate: boolean;
  wraparound: boolean;
  immutable: boolean;
  pipeline: boolean;
  plugins: IPlugin[];
  build(
    arg1?: KernelVariable,
    arg2?: KernelVariable,
    arg3?: KernelVariable,
    arg4?: KernelVariable,
    arg5?: KernelVariable,
    arg6?: KernelVariable,
    arg7?: KernelVariable,
    arg8?: KernelVariable,
    arg9?: KernelVariable,
    arg10?: KernelVariable,
    arg11?: KernelVariable,
    arg12?: KernelVariable,
    arg13?: KernelVariable,
    arg14?: KernelVariable,
    arg15?: KernelVariable,
    arg16?: KernelVariable,
    arg17?: KernelVariable,
    arg18?: KernelVariable,
    arg19?: KernelVariable,
    arg20?: KernelVariable): void;
  run(
    arg1?: KernelVariable,
    arg2?: KernelVariable,
    arg3?: KernelVariable,
    arg4?: KernelVariable,
    arg5?: KernelVariable,
    arg6?: KernelVariable,
    arg7?: KernelVariable,
    arg8?: KernelVariable,
    arg9?: KernelVariable,
    arg10?: KernelVariable,
    arg11?: KernelVariable,
    arg12?: KernelVariable,
    arg13?: KernelVariable,
    arg14?: KernelVariable,
    arg15?: KernelVariable,
    arg16?: KernelVariable,
    arg17?: KernelVariable,
    arg18?: KernelVariable,
    arg19?: KernelVariable,
    arg20?: KernelVariable
  ): KernelVariable
  toJSON(): object;
  exec(): Promise<KernelOutput>;
  setOutput(flag: any): this;
  setArgumentTypes(flag: any): this;
  setDebug(flag: boolean): this;
  setGraphical(flag: boolean): this;
  setLoopMaxIterations(flag: number): this;
  setConstants(flag: object): this;
  setPipeline(flag: boolean): this;
  setImmutable(flag: boolean): this;
  setCanvas(flag: any): this;
  setContext(flag: any): this;
}

export interface IArgumentTypes {
  names: string[],
  types: string[],
}

export interface IConstants {
  [constantName: string]: KernelVariable;
}

export interface IConstantTypes {
  [constantType: string]: string;
}

export interface IConstantsThis {
  [constantName: string]: ThreadKernelVariable;
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
  graphical?: boolean;
}

export interface IKernelRunShortcut extends Kernel {
  kernel: Kernel;
  (
    arg1?: KernelVariable,
    arg2?: KernelVariable,
    arg3?: KernelVariable,
    arg4?: KernelVariable,
    arg5?: KernelVariable,
    arg6?: KernelVariable,
    arg7?: KernelVariable,
    arg8?: KernelVariable,
    arg9?: KernelVariable,
    arg10?: KernelVariable,
    arg11?: KernelVariable,
    arg12?: KernelVariable,
    arg13?: KernelVariable,
    arg14?: KernelVariable,
    arg15?: KernelVariable,
    arg16?: KernelVariable,
    arg17?: KernelVariable,
    arg18?: KernelVariable,
    arg19?: KernelVariable,
    arg20?: KernelVariable
  ): KernelOutput
}

export interface IKernelFeatures {
  kernelMap: boolean;
  isIntegerDivisionAccurate: boolean;
}

export interface IKernelFunctionThis {
  output: IKernelXYZ;
  thread: IKernelXYZ;
  constants: IConstantsThis;
}

export type KernelVariable = number | number[] | number[][] | number[][][] | Texture | HTMLImageElement | HTMLImageElement[];

export type ThreadKernelVariable = number | number[] | number[][] | number[][][];
export type KernelFunction = ((
  this: IKernelFunctionThis,
  arg1?: ThreadKernelVariable,
  arg2?: ThreadKernelVariable,
  arg3?: ThreadKernelVariable,
  arg4?: ThreadKernelVariable,
  arg5?: ThreadKernelVariable,
  arg6?: ThreadKernelVariable,
  arg7?: ThreadKernelVariable,
  arg8?: ThreadKernelVariable,
  arg9?: ThreadKernelVariable,
  arg10?: ThreadKernelVariable,
  arg11?: ThreadKernelVariable,
  arg12?: ThreadKernelVariable,
  arg13?: ThreadKernelVariable,
  arg14?: ThreadKernelVariable,
  arg15?: ThreadKernelVariable,
  arg16?: ThreadKernelVariable,
  arg17?: ThreadKernelVariable,
  arg18?: ThreadKernelVariable,
  arg19?: ThreadKernelVariable,
  arg20?: ThreadKernelVariable,
) => KernelOutput) | object | string;

export type KernelOutput = void | KernelVariable;

export interface IFunction {
  source: string;
  settings: IFunctionSettings;
}

export interface IFunctionSettings {
  name?: string;
  debug?: boolean;
  argumentNames?: string[];
  argumentTypes?: string[];
  argumentSizes?: number[];

  constants?: IConstants;
  constantTypes?: IConstantTypes;

  output?: number[];
  loopMaxIterations?: number;
  returnType?: string;
  isRootKernel?: boolean;
  isSubKernel?: boolean;
  onNestedFunction?(source: string, returnType: string): void;
  lookupReturnType?(functionName: string, ast: any, node: FunctionNode): void;
  nativeFunctionReturnTypes?: string[],
  nativeFunctionArgumentTypes?: IGPUArgumentTypes[],
  plugins?: any[];
  pluginNames?: string[];
  parent?: FunctionNode
}

export interface ISubKernel {
  name: string;
  source: string;
  property: string | number;
}


export class FunctionBuilder {
  fromKernel(kernel: IKernelSettings, FunctionNode: FunctionNode, extraNodeOptions?: any): FunctionBuilder;
  constructor(settings: IFunctionBuilderSettings);
  addFunctionNode(functionNode: FunctionNode): void;
  traceFunctionCalls(functionName: string): string[];
  getStringFromFunctionNames(functionName?: string[]): string;
  getPrototypesFromFunctionNames(functionName?: string[]): string[];
  getString(functionName: string): string;
}


export interface IFunctionBuilderSettings {
  rootNode: FunctionNode;
  functionNodes?: FunctionNode[];
  subKernelNodes?: FunctionNode[];
  nativeFunctions?: INativeFunctionList;
}

// These are mostly internal
export class FunctionNode implements IFunctionSettings {
  constructor(source: string, settings?: IFunctionSettings);
}

export class WebGLFunctionNode extends FunctionNode {}
export class WebGL2FunctionNode extends WebGLFunctionNode {}
export class CPUFunctionNode extends FunctionNode {}

export interface IGPUTextureSettings {
  texture: WebGLTexture;
  size: number[];
  dimensions: number[];
  output: number[];
  context: WebGLRenderingContext;
  gpu?: GPU;
  type?: GPUTextureType;
}

export class Texture {
  constructor(settings: IGPUTextureSettings)
  toArray(gpu?: GPU): TextureArrayOutput
  delete(): void;
}

export type TextureArrayOutput = number[] | number[][] | number[][][];

export interface IPlugin {
  source: string;
  name: string;
  functionMatch: string;
  functionReplace: string;
  functionReturnType: GPUVariableType;
  onBeforeRun: (kernel: Kernel) => void;
}
