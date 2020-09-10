export class GPU<ArgTypes extends ThreadKernelVariable[] = ThreadKernelVariable[]> {
  static isGPUSupported: boolean;
  static isCanvasSupported: boolean;
  static isHeadlessGLSupported: boolean;
  static isWebGLSupported: boolean;
  static isWebGL2Supported: boolean;
  static isKernelMapSupported: boolean;
  static isOffscreenCanvasSupported: boolean;
  static isGPUHTMLImageArraySupported: boolean;
  static isSinglePrecisionSupported: boolean;
  constructor(settings?: IGPUSettings);
  functions: GPUFunction<ArgTypes>[];
  nativeFunctions: IGPUNativeFunction[];
  setFunctions(flag: any): this;
  setNativeFunctions(flag: IGPUNativeFunction[]): this;
  addFunction(kernel: GPUFunction<ArgTypes>, settings?: IGPUFunctionSettings): this;
  addNativeFunction(name: string, source: string, settings?: IGPUFunctionSettings): this;
  combineKernels(...kernels: KernelFunction[]): IKernelRunShortcut;
  combineKernels<KF extends KernelFunction>(...kernels: KF[]):
    ((...args: Parameters<KF>) =>
      ReturnType<KF>[]
      | ReturnType<KF>[][]
      | ReturnType<KF>[][][]
      | Texture
      | void
    )
    & IKernelRunShortcutBase;
  createKernel<MethodArgTypes extends ArgTypes>(kernel: KernelFunction<MethodArgTypes>, settings?: IGPUKernelSettings): IKernelRunShortcut;
  createKernel<KF extends KernelFunction>(kernel: KF, settings?: IGPUKernelSettings):
    ((...args: Parameters<KF>) =>
      ReturnType<KF>[]
      | ReturnType<KF>[][]
      | ReturnType<KF>[][][]
      | Texture
      | void
    )
    & IKernelRunShortcutBase;
  createKernelMap(
    subKernels: {
      [targetLocation: string]: KernelFunction
    }
    | KernelFunction[],
    rootKernel: KernelFunction,
    settings?: IGPUKernelSettings): ((() => IMappedKernelResult) & IKernelRunShortcut);
  // this needs further refined
  createKernelMap<KF extends KernelFunction>(
    subKernels: {
        [targetLocation: string]: KF
      }
      | KF[],
    rootKernel: KF,
    settings?: IGPUKernelSettings
  ):
    ((...args: Parameters<KF>) => {
      result?:
        ReturnType<KF>[]
        | ReturnType<KF>[][]
        | ReturnType<KF>[][][]
        | Texture
        | void;
      [targetLocation: string]:
        ReturnType<KF>[]
        | ReturnType<KF>[][]
        | ReturnType<KF>[][][]
        | Texture
        | void
      }
    )
    & IKernelRunShortcutBase;
  destroy(): Promise<void>;
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
}

export interface IMappedKernelResult {
  result?: KernelVariable;
  [targetLocation: string]: KernelVariable
}

export interface INativeFunction extends IGPUFunctionSettings {
  name: string;
  source: string;
}

export interface IInternalNativeFunction extends IArgumentTypes {
  name: string;
  source: string;
}

export interface INativeFunctionList {
  [name: string]: INativeFunction
}

export type GPUMode = 'gpu' | 'cpu' | 'dev';
export type GPUInternalMode = 'webgl' | 'webgl2' | 'headlessgl';

export interface IGPUSettings {
  mode?: GPUMode | GPUInternalMode;
  canvas?: object;
  context?: object;
  functions?: KernelFunction[];
  nativeFunctions?: IInternalNativeFunction[];
  onIstanbulCoverageVariable?: (value: string, kernel: Kernel) => void;
  removeIstanbulCoverage?: boolean;
  // format: 'Float32Array' | 'Float16Array' | 'Float' // WE WANT THIS!
}

export type GPUVariableType
  = 'Array'
  | 'Array(2)'
  | 'Array(3)'
  | 'Array(4)'
  | 'Array1D(2)'
  | 'Array2D(2)'
  | 'Array3D(2)'
  | 'Array1D(3)'
  | 'Array2D(3)'
  | 'Array3D(3)'
  | 'Array1D(4)'
  | 'Array2D(4)'
  | 'Array3D(4)'
  | 'Boolean'
  | 'HTMLCanvas'
  | 'HTMLImage'
  | 'HTMLImageArray'
  | 'Number'
  | 'Float'
  | 'Integer'
  | GPUTextureType;

export type GPUTextureType
  = 'NumberTexture'
  | 'ArrayTexture(4)';

export interface IGPUArgumentTypes {
  [argumentName: string]: GPUVariableType;
}

export interface IGPUFunctionSettings {
  argumentTypes?: IGPUArgumentTypes | string[],
  returnType?: GPUVariableType;
}

export class Kernel {
  static isSupported: boolean;
  static isContextMatch(context: any): boolean;
  static disableValidation(): void;
  static enableValidation(): void;
  static nativeFunctionArguments(source: string): IArgumentTypes;
  static nativeFunctionReturnType(source: string): string;
  static destroyContext(context: any): void;
  static features: IKernelFeatures;
  static getFeatures(): IKernelFeatures;
  static mode: GPUMode | GPUInternalMode;
  source: string | IKernelJSON;
  Kernel: Kernel;
  output: number[];
  debug: boolean;
  graphical: boolean;
  loopMaxIterations: number;
  constants: IConstants;
  canvas: any;
  context: WebGLRenderingContext | any;
  functions: IFunction[];
  nativeFunctions: IInternalNativeFunction[];
  subKernels: ISubKernel[];
  validate: boolean;
  immutable: boolean;
  pipeline: boolean;
  plugins: IPlugin[];
  useLegacyEncoder: boolean;
  tactic: Tactic;
  built: boolean;
  texSize: [number, number];
  texture: Texture;
  mappedTextures?: Texture[];
  TextureConstructor: typeof Texture;
  getPixels(flip?: boolean): Uint8ClampedArray[];
  getVariablePrecisionString(textureSize?: number[], tactic?: Tactic, isInt?: boolean): string;
  prependString(value: string): void;
  hasPrependString(value: string): boolean;
  constructor(kernel: KernelFunction|IKernelJSON|string, settings?: IDirectKernelSettings);
  onRequestSwitchKernel?: Kernel;
  onActivate(previousKernel: Kernel): void;
  build(...args: KernelVariable[]): void;
  run(...args: KernelVariable[]): KernelVariable;
  toString(...args: KernelVariable[]): string;
  toJSON(): IKernelJSON;
  setOutput(flag: number[]): this;
  setWarnVarUsage(flag: boolean): this;
  setOptimizeFloatMemory(flag: boolean): this;
  setArgumentTypes(flag: IKernelValueTypes): this;
  setDebug(flag: boolean): this;
  setGraphical(flag: boolean): this;
  setLoopMaxIterations(flag: number): this;
  setConstants(flag: IConstants): this;
  setConstants<T>(flag: T & IConstants): this;
  setConstantTypes(flag: IKernelValueTypes): this;
  setDynamicOutput(flag: boolean): this;
  setDynamicArguments(flag: boolean): this;
  setPipeline(flag: boolean): this;
  setPrecision(flag: Precision): this;
  setImmutable(flag: boolean): this;
  setCanvas(flag: any): this;
  setContext(flag: any): this;
  addFunction<MethodArgTypes extends ThreadKernelVariable[]>(flag: GPUFunction<MethodArgTypes>, settings?: IFunctionSettings): this;
  setFunctions(flag: any): this;
  setNativeFunctions(flag: IGPUNativeFunction[]): this;
  setStrictIntegers(flag: boolean): this;
  setTactic(flag: Tactic): this;
  setUseLegacyEncoder(flag: boolean): this;
  addSubKernel(subKernel: ISubKernel): this;
  destroy(removeCanvasReferences?: boolean): void;
  validateSettings(args: IArguments): void;

  setUniform1f(name: string, value: number): void;
  setUniform2f(name: string, value1: number, value2: number): void;
  setUniform3f(name: string, value1: number, value2: number, value3: number): void;
  setUniform4f(name: string, value1: number, value2: number, value3: number, value4: number): void;

  setUniform2fv(name: string, value: [number, number]): void;
  setUniform3fv(name: string, value: [number, number, number]): void;
  setUniform4fv(name: string, value: [number, number, number, number]): void;

  setUniform1i(name: string, value: number): void;
  setUniform2i(name: string, value1: number, value2: number): void;
  setUniform3i(name: string, value1: number, value2: number, value3: number): void;
  setUniform4i(name: string, value1: number, value2: number, value3: number, value4: number): void;

  setUniform2iv(name: string, value: [number, number]): void;
  setUniform3iv(name: string, value: [number, number, number]): void;
  setUniform4iv(name: string, value: [number, number, number, number]): void;
}


export type GPUFunction<ArgTypes extends ThreadKernelVariable[]>
  = ThreadFunction<ArgTypes>
  | IFunction
  | IGPUFunction
  |  string[];

export type ThreadFunction<ArgTypes extends ThreadKernelVariable[] = ThreadKernelVariable[]> =
    ((...args: ArgTypes) => ThreadFunctionResult);

export type Precision = 'single' | 'unsigned';

export class CPUKernel extends Kernel {

}
export class GLKernel extends Kernel {

}
export class WebGLKernel extends GLKernel {

}
export class WebGL2Kernel extends WebGLKernel {

}
export class HeadlessGLKernel extends WebGLKernel {

}

export interface IArgumentTypes {
  argumentTypes: GPUVariableType[],
  argumentNames: string[],
}

export interface IConstants {
  [constantName: string]: KernelVariable;
}

export interface IKernelValueTypes {
  [constantType: string]: GPUVariableType;
}

export interface IWebGLKernelValueSettings extends IKernelValueSettings {
  onRequestTexture: () => object;
  onRequestIndex: () => number;
  onRequestContextHandle: () => number;
  texture: any;
}

export interface IKernelValueSettings {
  name: string;
  kernel: Kernel;
  context: WebGLRenderingContext;
  contextHandle?: number;
  checkContext?: boolean;
  onRequestContextHandle: () => number;
  onUpdateValueMismatch: (constructor: object) => void;
  origin: 'user' | 'constants';
  strictIntegers?: boolean;
  type: GPUVariableType;
  tactic?: Tactic;
  size: number[];
  index?: number;
}

export type Tactic = 'speed' | 'balanced' | 'precision';

export interface IConstantsThis {
  [constantName: string]: ThreadKernelVariable;
}

export interface IKernelXYZ {
  x: number;
  y?: number;
  z?: number;
}

export interface FunctionList {
  [functionName: string]: Function
}

export interface IGPUKernelSettings extends IKernelSettings {
  argumentTypes?: ITypesList;
  functions?: Function[]|FunctionList;
  tactic?: Tactic;
  onRequestSwitchKernel?: Kernel;
}

export interface IKernelSettings {
  pluginNames?: string[];
  output?: number[] | IKernelXYZ;
  precision?: Precision;
  constants?: object;
  context?: any;
  canvas?: any;
  pipeline?: boolean;
  immutable?: boolean;
  graphical?: boolean;
  onRequestFallback?: () => Kernel;
  optimizeFloatMemory?: boolean;
  dynamicOutput?: boolean;
  dynamicArguments?: boolean;
  constantTypes?: ITypesList;
  useLegacyEncoder?: boolean;
  nativeFunctions?: IGPUNativeFunction[],
  strictIntegers?: boolean;
}

export interface IDirectKernelSettings extends IKernelSettings {
  argumentTypes?: string[];
  functions?: string[]|IFunction;
}

export interface ITypesList {
  [typeName: string]: GPUVariableType
}

export interface IKernelRunShortcutBase extends Kernel {
  kernel: Kernel;
  exec(): Promise<KernelOutput>;
}

export interface IKernelRunShortcut extends IKernelRunShortcutBase {
  kernel: Kernel;
  (...args: KernelVariable[]): KernelOutput;
  exec(): Promise<KernelOutput>;
}

export interface IKernelFeatures {
  isFloatRead: boolean;
  kernelMap: boolean;
  isIntegerDivisionAccurate: boolean;
  isSpeedTacticSupported: boolean;
  isTextureFloat: boolean;
  isDrawBuffers: boolean;
  channelCount: number;
  maxTextureSize: number;
  lowIntPrecision: { rangeMax: number };
  mediumIntPrecision: { rangeMax: number };
  highIntPrecision: { rangeMax: number };
  lowFloatPrecision: { rangeMax: number };
  mediumFloatPrecision: { rangeMax: number };
  highFloatPrecision: { rangeMax: number };
}

export interface IKernelFunctionThis {
  output: IKernelXYZ;
  thread: IKernelXYZ;
  constants: IConstantsThis;
  color(r: number): void,
  color(r: number, g: number): void,
  color(r: number, g: number, b: number): void,
  color(r: number, g: number, b: number, a: number): void,
}

export type KernelVariable =
  boolean
  | number
  | Texture
  | Input
  | HTMLImageElement
  | HTMLVideoElement
  | HTMLImageElement[]
  | Float32Array
  | Uint8Array
  | Uint16Array
  | Uint32Array
  | Uint8ClampedArray
  | KernelOutput;

export type ThreadFunctionResult
  = number
  | [number, number]
  | [number, number, number]
  | [number, number, number, number]
  | Pixel
  | Boolean;

export type ThreadKernelVariable
  = boolean
  | number
  | number[]
  | number[][]
  | number[][][]

  | Float32Array
  | Float32Array[]
  | Float32Array[][]

  | Pixel
  | Pixel[][]

  | [number, number]
  | [number, number][]
  | [number, number][][]
  | [number, number][][][]

  | [number, number, number]
  | [number, number, number][]
  | [number, number, number][][]
  | [number, number, number][][][]

  | [number, number, number, number]
  | [number, number, number, number][]
  | [number, number, number, number][][]
  | [number, number, number, number][][][]
  ;

export type Pixel = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type KernelFunction<ArgT extends ThreadKernelVariable[] = ThreadKernelVariable[]> = ((
  this: IKernelFunctionThis,
  ...args: ArgT
) => KernelOutput);

export type KernelOutput = void
  | number
  | number[]
  | number[][]
  | number[][][]

  | Float32Array
  | Float32Array[]
  | Float32Array[][]

  | [number, number][]
  | [number, number, number][]
  | [number, number, number, number][]

  | [number, number][][]
  | [number, number, number][][]
  | [number, number, number, number][][]

  | [number, number][][][]
  | [number, number, number][][][]
  | [number, number, number, number][][][]

  | Texture;

export interface IFunction {
  source: string;
  settings: IFunctionSettings;
}

export interface IFunctionSettings {
  name?: string;
  debug?: boolean;
  argumentNames?: string[];
  argumentTypes?: string[] | { [argumentName: string]: string };
  argumentSizes?: number[];

  constants?: IConstants;
  constantTypes?: IKernelValueTypes;

  output?: number[];
  loopMaxIterations?: number;
  returnType?: string;
  isRootKernel?: boolean;
  isSubKernel?: boolean;
  onNestedFunction?(source: string, returnType: string): void;
  lookupReturnType?(functionName: string, ast: any, node: FunctionNode): void;
  plugins?: any[];

  useLegacyEncoder?: boolean;
  ast?: any;

  onIstanbulCoverageVariable?(name: string): void;
  removeIstanbulCoverage?: boolean;
}

export interface ISubKernel {
  name: string;
  source: string;
  property: string | number;
  returnType: string;
}


export class FunctionBuilder {
  static fromKernel(kernel: Kernel, FunctionNode: FunctionNode, extraNodeOptions?: any): FunctionBuilder;
  constructor(settings: IFunctionBuilderSettings);
  addFunctionNode(functionNode: FunctionNode): void;
  traceFunctionCalls(functionName: string, retList?: string[]): string[];
  getStringFromFunctionNames(functionName: string[]): string;
  getPrototypesFromFunctionNames(functionName: string[]): string[];
  getString(functionName: string): string;
  getPrototypeString(functionName: string): string;
}


export interface IFunctionBuilderSettings {
  kernel: Kernel;
  rootNode: FunctionNode;
  functionNodes?: FunctionNode[];
  nativeFunctions?: INativeFunctionList;
  subKernelNodes?: FunctionNode[];
}

// These are mostly internal
export class FunctionNode implements IFunctionSettings {
  constructor(source: string, settings?: IFunctionNodeSettings);
}

export interface IFunctionNodeSettings extends IFunctionSettings {
  argumentTypes: string[]
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
  toArray(): TextureArrayOutput;
  clone(): Texture;
  delete(): void;
  clear(): void;
  kernel: Kernel;
}

export type TextureArrayOutput
  = number[]
  | number[][]
  | number[][][]

  | Float32Array
  | Float32Array[]
  | Float32Array[][]

  | [number, number][]
  | [number, number][][]
  | [number, number][][][]

  | [number, number, number][]
  | [number, number, number][][]
  | [number, number, number][][][]

  | [number, number, number, number][]
  | [number, number, number, number][][]
  | [number, number, number, number][][][]
  ;

export interface IPlugin {
  source: string;
  name: string;
  functionMatch: string;
  functionReplace: string;
  functionReturnType: GPUVariableType;
  onBeforeRun: (kernel: Kernel) => void;
}

export type OutputDimensions = [number, number, number] | Int32Array;
export type TextureDimensions = [number, number];

export class Input {
  value: number[];
  size: number[];
  constructor(value: number[], size: OutputDimensions);
}

export type input = (value: number[], size: OutputDimensions) => Input;

export function alias(name: string, source: KernelFunction): KernelFunction;

export class KernelValue {
  constructor(value: KernelVariable, settings: IKernelValueSettings);
  getSource(): string;
  setup(): void;
  updateValue(value: KernelVariable): void;
}

export class WebGLKernelValue {
  constructor(value: any, settings: IWebGLKernelValueSettings);
}

export interface IFunctionNodeMemberExpressionDetails {
  xProperty: object;
  yProperty: object;
  zProperty: object;
  property: string;
  type: string;
  origin: 'user' | 'constants';
  signature: string;
}

export interface IKernelJSON {
  settings: IJSONSettings;
  functionNodes?: object;
}

export interface IJSONSettings {
  output: number[];
  argumentsTypes: GPUVariableType;
  returnType: string;
  argumentNames?: string[];
  constants?: IConstants;
  pipeline?: boolean;
  pluginNames?: string[];
  tactic?: Tactic;
  threadDim?: number[];
}

export type utils = {
  getMinifySafeName(arrowReference: () => Function): string;
}

export interface IReason {
  type: 'argumentMismatch' | 'outputPrecisionMismatch';
  needed: any;
}

export interface IDeclaration {
  ast: object;
  context: object;
  name: string;
  origin: 'declaration';
  inForLoopInit: boolean;
  inForLoopTest: boolean;
  assignable: boolean;
  suggestedType: string;
  valueType: string;
  dependencies: any;
  isSafe: boolean;
}
