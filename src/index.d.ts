export class GPU {
  static isGPUSupported: boolean;
  static isCanvasSupported: boolean;
  static isHeadlessGLSupported: boolean;
  static isWebGLSupported: boolean;
  static isWebGL2Supported: boolean;
  static isKernelMapSupported: boolean;
  static isOffscreenCanvasSupported: boolean;
  static isGPUHTMLImageArraySupported: boolean;
  static isSinglePrecisionSupported: boolean;
  /** WebGPU API surface exists (navigator.gpu); an adapter may still be absent — await isWebGPUAvailable() for the authoritative answer */
  static isWebGPUSupported: boolean;
  static isWebGPUAvailable(): Promise<boolean>;
  static isWebAssemblySupported: boolean;
  constructor(settings?: IGPUSettings);
  functions: GPUFunction<ThreadKernelVariable[]>[];
  nativeFunctions: IGPUNativeFunction[];
  setFunctions(flag: any): this;
  setNativeFunctions(flag: IGPUNativeFunction[]): this;
  addFunction<ArgTypes extends ThreadKernelVariable[] = ThreadKernelVariable[], ConstantsType = {}>(kernel: GPUFunction<ArgTypes, ConstantsType>, settings?: IGPUFunctionSettings): this;
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
  /**
   * A kernel may also be given as source text. This is the only form available
   * where the engine does not retain function source — React Native's Hermes,
   * for instance, returns "function name(a0, a1) { [bytecode] }" from
   * Function.prototype.toString().
   */
  createKernel(kernel: string, settings?: IGPUKernelSettings): IKernelRunShortcut;
  createKernel<ArgTypes extends ThreadKernelVariable[], ConstantsT extends IConstantsThis>(kernel: KernelFunction<ArgTypes, ConstantsT>, settings?: IGPUKernelSettings): IKernelRunShortcut;
  createKernel<KernelType extends KernelFunction>(kernel: KernelType, settings?: IGPUKernelSettings):
    ((...args: Parameters<KernelType>) =>
      ReturnType<KernelType>[]
      | ReturnType<KernelType>[][]
      | ReturnType<KernelType>[][][]
      | Texture
      | void
      )
    & IKernelRunShortcutBase;
  createKernelMap<
    ArgTypes extends ThreadKernelVariable[],
    ConstantsType = null,
    >(
    subKernels: ISubKernelObject,
    rootKernel: ThreadFunction<ArgTypes, ConstantsType>,
    settings?: IGPUKernelSettings): (((this: IKernelFunctionThis<ConstantsType>, ...args: ArgTypes) => IMappedKernelResult) & IKernelMapRunShortcut<typeof subKernels>);
  /**
   * Compile a whole multi-kernel computation into one callable plan. The
   * orchestration function runs once, at build time (first call), with
   * opaque handles for arguments; the kernel calls it makes are recorded
   * and replayed on later calls with intermediates kept resident. Calling
   * the pipeline always returns a Promise.
   */
  createPipeline(fn: PipelineFunction, settings?: IPipelineSettings): IPipelineRunShortcut;
  destroy(): Promise<void>;
  Kernel: typeof Kernel;
  mode: string;
  canvas: any;
  context: any;
}

export interface ISubKernelObject {
  [targetLocation: string]:
    ((...args: ThreadKernelVariable[]) => ThreadFunctionResult)
    | ((...args: any[]) => ThreadFunctionResult);
}

export interface ISubKernelArray {
  [index: number]:
    ((...args: ThreadKernelVariable[]) => ThreadFunctionResult)
    | ((...args: any[]) => ThreadFunctionResult);
}

export interface ISubKernelsResults {
  [resultsLocation: string]: KernelOutput;
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

export type GPUMode = 'gpu' | 'cpu' | 'dev' | 'async';
export type GPUInternalMode = 'webgl' | 'webgl2' | 'headlessgl' | 'webgpu' | 'webasm';

export interface IGPUSettings {
  mode?: GPUMode | GPUInternalMode;
  canvas?: object;
  context?: object;
  functions?: KernelFunction[];
  nativeFunctions?: IInternalNativeFunction[];
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
  getPixels(flip?: boolean): Uint8ClampedArray;
  getVariablePrecisionString(textureSize?: number[], tactic?: Tactic, isInt?: boolean): string;
  prependString(value: string): void;
  hasPrependString(value: string): boolean;
  constructor(kernel: KernelFunction|IKernelJSON|string, settings?: IDirectKernelSettings);
  onRequestSwitchKernel?: Kernel;
  /** why this kernel's work was degraded to the cpu backend, when it was (#868) */
  fallbackReason: string | null;
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
  setRandomSeed(seed: number): this;
  setPipeline(flag: boolean): this;
  setPrecision(flag: Precision): this;
  setImmutable(flag: boolean): this;
  setAsyncMode(flag: boolean): this;
  setCanvas(flag: any): this;
  setContext(flag: any): this;
  addFunction<ArgTypes extends ThreadKernelVariable[]>(flag: GPUFunction<ArgTypes>, settings?: IFunctionSettings): this;
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


export type GPUFunction<ArgTypes extends ThreadKernelVariable[] = ThreadKernelVariable[], ConstantsType = {}>
  = ThreadFunction<ArgTypes, ConstantsType>
  | IFunction
  | IGPUFunction
  |  string[];

export type ThreadFunction<ArgTypes extends ThreadKernelVariable[] = ThreadKernelVariable[], ConstantsType = {}> =
  ((this: IKernelFunctionThis<ConstantsType>, ...args: ArgTypes) => ThreadFunctionResult);

export type Precision = 'single' | 'unsigned';

export class CPUKernel extends Kernel {

}
export class WebAssemblyKernel extends Kernel {
  /** LRU bound on cached per-size-signature wasm instantiations (#870) */
  moduleCacheLimit: number;
  /** worker-pool size cap for threaded runs; null lets the pool decide */
  poolSize: number | null;
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
  y: number;
  z: number;
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
  /** every call returns a Promise of the result; non-blocking readback where the backend supports it (webgl2, webgpu) */
  asyncMode?: boolean;
  /** webasm only: caps the worker pool for threaded runs; defaults to hardwareConcurrency (or 4 when unreadable) */
  poolSize?: number;
  onRequestFallback?: () => Kernel;
  optimizeFloatMemory?: boolean;
  dynamicOutput?: boolean;
  dynamicArguments?: boolean;
  constantTypes?: ITypesList;
  useLegacyEncoder?: boolean;
  nativeFunctions?: IGPUNativeFunction[],
  strictIntegers?: boolean;
  randomSeed?: number;
}

export interface IDirectKernelSettings extends IKernelSettings {
  argumentTypes?: string[];
  functions?: string[]|IFunction;
}

export interface ITypesList {
  [typeName: string]: GPUVariableType
}

export interface IKernelRunShortcutBase<T = KernelOutput> extends Kernel {
  kernel: Kernel;
  (...args: KernelVariable[]): T;
  exec(): Promise<T>;
}

export interface IKernelRunShortcut extends IKernelRunShortcutBase {

}

export interface IKernelMapRunShortcut<SubKernelType> extends IKernelRunShortcutBase<
  { result: KernelOutput } & { [key in keyof SubKernelType]: KernelOutput }> {}

/**
 * Opaque stand-in for an intermediate result during pipeline orchestration.
 * Reading elements or properties, or using it in arithmetic or conditions,
 * throws at build time; its only legal uses are as a kernel argument and in
 * the orchestration function's return value.  Typed `any` because the same
 * kernel shortcut that normally returns values returns handles while a trace
 * is open — a distinction the type system cannot express; the trace enforces
 * it at build time with named errors.
 */
export type IPipelineHandle = any;

export type PipelineFunction = (this: { constants: IConstantsThis }, ...args: IPipelineHandle[]) =>
  IPipelineHandle | IPipelineHandle[] | { [key: string]: IPipelineHandle };

export interface IPipelineSettings {
  /** false pins the webasm lowering to its sync path (no worker pool) */
  threads?: boolean;
  /** trace-time facts; change via setConstants, which re-traces on the next call */
  constants?: IConstants;
}

export type PipelineResult = KernelOutput | KernelOutput[] | { [key: string]: KernelOutput };

/** the underlying Pipeline instance behind an IPipelineRunShortcut */
export interface IPipeline {
  constants: IConstants;
  destroyed: boolean;
  executorKind: string;
  fallbackReason: string | null;
  plan: object | null;
  call(args: KernelVariable[] | IArguments): Promise<PipelineResult>;
  setConstants(constants: IConstants): this;
  destroy(): Promise<void>;
}

export interface IPipelineRunShortcut {
  /** the backend mode that actually executes the plan (the clones'), null before the first call */
  readonly backend: string | null;
  (...args: KernelVariable[]): Promise<PipelineResult>;
  pipeline: IPipeline;
  setConstants(constants: IConstants): this;
  destroy(): Promise<void>;
  /**
   * 'generic' runs step-by-step through the normal kernel machinery on every
   * backend; 'fused-sync' runs every step over one shared wasm memory on the
   * webasm backend; 'fused-threaded' has pool workers walk the whole plan
   * over that memory on an Atomics barrier; 'fused-encoder' records every
   * step into one WebGPU command encoder over persistent storage buffers
   */
  readonly executorKind: string;
  /** why the fused executor declined this plan; null while fused */
  readonly fallbackReason: string | null;
  /** the compiled plan IR; null until the first call builds it */
  readonly plan: object | null;
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

export interface IKernelFunctionThis<ConstantsT = {}> {
  output: IKernelXYZ;
  thread: IKernelXYZ;
  constants: ConstantsT;
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
  | HTMLCanvasElement
  | OffscreenCanvas
  | HTMLVideoElement
  | HTMLImageElement
  | HTMLImageElement[]
  | ImageBitmap
  | ImageData
  | Float32Array
  | Uint8Array
  | Uint16Array
  | Uint32Array
  | Uint8ClampedArray
  | KernelOutput;

export type ThreadFunctionResult
  = number
  | number[]
  | number[][]
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

// export type KernelFunction<ArgT extends ThreadKernelVariable[] = ThreadKernelVariable[], ConstantsT extends IConstantsThis = {}> = ((
//   this: IKernelFunctionThis<ConstantsT>,
//   ...args: ArgT
// ) => KernelOutput);

export interface KernelFunction<ArgT extends ThreadKernelVariable[] = ThreadKernelVariable[], ConstantsT = {}> {
  (
    this: IKernelFunctionThis<ConstantsT>,
    ...args: ArgT
  ): KernelOutput;
}

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
  onNestedFunction?(ast: any, source: string): void;
  lookupReturnType?(functionName: string, ast: any, node: FunctionNode): void;
  plugins?: any[];

  useLegacyEncoder?: boolean;
  ast?: any;
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
export class WebAssemblyFunctionNode extends FunctionNode {}

export interface IGPUTextureSettings {
  texture: WebGLTexture;
  size: number[];
  dimensions: number[];
  output: number[];
  context: WebGLRenderingContext;
  kernel: Kernel;
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

export type OutputDimensions = [number] | [number, number] | [number, number, number] | Int32Array;
export type TextureDimensions = [number, number];

export class Input {
  value: number[];
  size: number[];
  constructor(value: number[], size: OutputDimensions);
}

export type input = (value: number[], size: OutputDimensions) => Input;

export function alias<T>(name: string, source: T): T;

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

export declare const utils: {
  getMinifySafeName: <T>(arrowReference: () => T) => string
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
