/**
 * @desc This handles all the raw state, converted state, etc. of a single function.
 * [INTERNAL] A collection of functionNodes.
 * @class
 */
class FunctionBuilder {
  /**
   *
   * @param {Kernel} kernel
   * @param {FunctionNode} FunctionNode
   * @param {object} [extraNodeOptions]
   * @returns {FunctionBuilder}
   * @static
   */
  static fromKernel(kernel, FunctionNode, extraNodeOptions) {
    const {
      kernelArguments,
      kernelConstants,
      argumentNames,
      argumentSizes,
      argumentBitRatios,
      constants,
      constantBitRatios,
      debug,
      loopMaxIterations,
      nativeFunctions,
      output,
      optimizeFloatMemory,
      precision,
      plugins,
      source,
      subKernels,
      functions,
      leadingReturnStatement,
      followingReturnStatement,
      dynamicArguments,
      dynamicOutput,
      warnVarUsage,
    } = kernel;

    const argumentTypes = new Array(kernelArguments.length);
    const constantTypes = {};

    for (let i = 0; i < kernelArguments.length; i++) {
      argumentTypes[i] = kernelArguments[i].type;
    }

    for (let i = 0; i < kernelConstants.length; i++) {
      const kernelConstant = kernelConstants[i];
      constantTypes[kernelConstant.name] = kernelConstant.type;
    }

    const needsArgumentType = (functionName, index) => {
      return functionBuilder.needsArgumentType(functionName, index);
    };

    const assignArgumentType = (functionName, index, type) => {
      functionBuilder.assignArgumentType(functionName, index, type);
    };

    const lookupReturnType = (functionName, ast, requestingNode) => {
      return functionBuilder.lookupReturnType(functionName, ast, requestingNode);
    };

    const lookupFunctionArgumentTypes = (functionName) => {
      return functionBuilder.lookupFunctionArgumentTypes(functionName);
    };

    const lookupFunctionArgumentName = (functionName, argumentIndex) => {
      return functionBuilder.lookupFunctionArgumentName(functionName, argumentIndex);
    };

    const lookupFunctionArgumentBitRatio = (functionName, argumentName) => {
      return functionBuilder.lookupFunctionArgumentBitRatio(functionName, argumentName);
    };

    const triggerImplyArgumentType = (functionName, i, argumentType, requestingNode) => {
      functionBuilder.assignArgumentType(functionName, i, argumentType, requestingNode);
    };

    const triggerImplyArgumentBitRatio = (functionName, argumentName, calleeFunctionName, argumentIndex) => {
      functionBuilder.assignArgumentBitRatio(functionName, argumentName, calleeFunctionName, argumentIndex);
    };

    const onFunctionCall = (functionName, calleeFunctionName, args) => {
      functionBuilder.trackFunctionCall(functionName, calleeFunctionName, args);
    };

    const onNestedFunction = (ast, returnType) => {
      const argumentNames = [];
      for (let i = 0; i < ast.params.length; i++) {
        argumentNames.push(ast.params[i].name);
      }
      const nestedFunction = new FunctionNode(null, Object.assign({}, nodeOptions, {
        returnType: null,
        ast,
        name: ast.id.name,
        argumentNames,
        lookupReturnType,
        lookupFunctionArgumentTypes,
        lookupFunctionArgumentName,
        lookupFunctionArgumentBitRatio,
        needsArgumentType,
        assignArgumentType,
        triggerImplyArgumentType,
        triggerImplyArgumentBitRatio,
        onFunctionCall,
        warnVarUsage,
      }));
      nestedFunction.traceFunctionAST(ast);
      functionBuilder.addFunctionNode(nestedFunction);
    };

    const nodeOptions = Object.assign({
      isRootKernel: false,
      onNestedFunction,
      lookupReturnType,
      lookupFunctionArgumentTypes,
      lookupFunctionArgumentName,
      lookupFunctionArgumentBitRatio,
      needsArgumentType,
      assignArgumentType,
      triggerImplyArgumentType,
      triggerImplyArgumentBitRatio,
      onFunctionCall,
      optimizeFloatMemory,
      precision,
      constants,
      constantTypes,
      constantBitRatios,
      debug,
      loopMaxIterations,
      output,
      plugins,
      dynamicArguments,
      dynamicOutput,
    }, extraNodeOptions || {});

    const rootNodeOptions = Object.assign({}, nodeOptions, {
      isRootKernel: true,
      name: 'kernel',
      argumentNames,
      argumentTypes,
      argumentSizes,
      argumentBitRatios,
      leadingReturnStatement,
      followingReturnStatement,
    });

    if (typeof source === 'object' && source.functionNodes) {
      return new FunctionBuilder().fromJSON(source.functionNodes, FunctionNode);
    }

    const rootNode = new FunctionNode(source, rootNodeOptions);

    let functionNodes = null;
    if (functions) {
      functionNodes = functions.map((fn) => new FunctionNode(fn.source, {
        returnType: fn.returnType,
        argumentTypes: fn.argumentTypes,
        output,
        plugins,
        constants,
        constantTypes,
        constantBitRatios,
        optimizeFloatMemory,
        precision,
        lookupReturnType,
        lookupFunctionArgumentTypes,
        lookupFunctionArgumentName,
        lookupFunctionArgumentBitRatio,
        needsArgumentType,
        assignArgumentType,
        triggerImplyArgumentType,
        triggerImplyArgumentBitRatio,
        onFunctionCall,
      }));
    }

    let subKernelNodes = null;
    if (subKernels) {
      subKernelNodes = subKernels.map((subKernel) => {
        const { name, source } = subKernel;
        return new FunctionNode(source, Object.assign({}, nodeOptions, {
          name,
          isSubKernel: true,
          isRootKernel: false,
        }));
      });
    }

    const functionBuilder = new FunctionBuilder({
      kernel,
      rootNode,
      functionNodes,
      nativeFunctions,
      subKernelNodes
    });

    return functionBuilder;
  }

  /**
   *
   * @param {IFunctionBuilderSettings} [settings]
   */
  constructor(settings) {
    settings = settings || {};
    this.kernel = settings.kernel;
    this.rootNode = settings.rootNode;
    this.functionNodes = settings.functionNodes || [];
    this.subKernelNodes = settings.subKernelNodes || [];
    this.nativeFunctions = settings.nativeFunctions || [];
    this.functionMap = {};
    this.nativeFunctionNames = [];
    this.lookupChain = [];
    this.argumentChain = [];
    this.functionNodeDependencies = {};
    this.functionCalls = {};

    if (this.rootNode) {
      this.functionMap['kernel'] = this.rootNode;
    }

    if (this.functionNodes) {
      for (let i = 0; i < this.functionNodes.length; i++) {
        this.functionMap[this.functionNodes[i].name] = this.functionNodes[i];
      }
    }

    if (this.subKernelNodes) {
      for (let i = 0; i < this.subKernelNodes.length; i++) {
        this.functionMap[this.subKernelNodes[i].name] = this.subKernelNodes[i];
      }
    }

    if (this.nativeFunctions) {
      for (let i = 0; i < this.nativeFunctions.length; i++) {
        const nativeFunction = this.nativeFunctions[i];
        this.nativeFunctionNames.push(nativeFunction.name);
      }
    }
  }

  /**
   * @desc Add the function node directly
   *
   * @param {FunctionNode} functionNode - functionNode to add
   *
   */
  addFunctionNode(functionNode) {
    if (!functionNode.name) throw new Error('functionNode.name needs set');
    this.functionMap[functionNode.name] = functionNode;
    if (functionNode.isRootKernel) {
      this.rootNode = functionNode;
    }
  }

  /**
   * @desc Trace all the depending functions being called, from a single function
   *
   * This allow for 'unneeded' functions to be automatically optimized out.
   * Note that the 0-index, is the starting function trace.
   *
   * @param {String} functionName - Function name to trace from, default to 'kernel'
   * @param {String[]} [retList] - Returning list of function names that is traced. Including itself.
   *
   * @returns {String[]}  Returning list of function names that is traced. Including itself.
   */
  traceFunctionCalls(functionName, retList) {
    functionName = functionName || 'kernel';
    retList = retList || [];

    if (this.nativeFunctionNames.indexOf(functionName) > -1) {
      if (retList.indexOf(functionName) === -1) {
        retList.push(functionName);
      }
      return retList;
    }

    const functionNode = this.functionMap[functionName];
    if (functionNode) {
      // Check if function already exists
      const functionIndex = retList.indexOf(functionName);
      if (functionIndex === -1) {
        retList.push(functionName);
        functionNode.toString(); //ensure JS trace is done
        for (let i = 0; i < functionNode.calledFunctions.length; ++i) {
          this.traceFunctionCalls(functionNode.calledFunctions[i], retList);
        }
      } else {
        /**
         * https://github.com/gpujs/gpu.js/issues/207
         * if dependent function is already in the list, because a function depends on it, and because it has
         * already been traced, we know that we must move the dependent function to the end of the the retList.
         * */
        const dependantFunctionName = retList.splice(functionIndex, 1)[0];
        retList.push(dependantFunctionName);
      }
    }

    return retList;
  }

  /**
   * @desc Return the string for a function
   * @param {String} functionName - Function name to trace from. If null, it returns the WHOLE builder stack
   * @returns {String} The full string, of all the various functions. Trace optimized if functionName given
   */
  getPrototypeString(functionName) {
    return this.getPrototypes(functionName).join('\n');
  }

  /**
   * @desc Return the string for a function
   * @param {String} [functionName] - Function name to trace from. If null, it returns the WHOLE builder stack
   * @returns {Array} The full string, of all the various functions. Trace optimized if functionName given
   */
  getPrototypes(functionName) {
    if (this.rootNode) {
      this.rootNode.toString();
    }
    if (functionName) {
      return this.getPrototypesFromFunctionNames(this.traceFunctionCalls(functionName, []).reverse());
    }
    return this.getPrototypesFromFunctionNames(Object.keys(this.functionMap));
  }

  /**
   * @desc Get string from function names
   * @param {String[]} functionList - List of function to build string
   * @returns {String} The string, of all the various functions. Trace optimized if functionName given
   */
  getStringFromFunctionNames(functionList) {
    const ret = [];
    for (let i = 0; i < functionList.length; ++i) {
      const node = this.functionMap[functionList[i]];
      if (node) {
        ret.push(this.functionMap[functionList[i]].toString());
      }
    }
    return ret.join('\n');
  }

  /**
   * @desc Return string of all functions converted
   * @param {String[]} functionList - List of function names to build the string.
   * @returns {Array} Prototypes of all functions converted
   */
  getPrototypesFromFunctionNames(functionList) {
    const ret = [];
    for (let i = 0; i < functionList.length; ++i) {
      const functionName = functionList[i];
      const functionIndex = this.nativeFunctionNames.indexOf(functionName);
      if (functionIndex > -1) {
        ret.push(this.nativeFunctions[functionIndex].source);
        continue;
      }
      const node = this.functionMap[functionName];
      if (node) {
        ret.push(node.toString());
      }
    }
    return ret;
  }

  toJSON() {
    return this.traceFunctionCalls(this.rootNode.name).reverse().map(name => {
      const nativeIndex = this.nativeFunctions.indexOf(name);
      if (nativeIndex > -1) {
        return {
          name,
          source: this.nativeFunctions[nativeIndex].source
        };
      } else if (this.functionMap[name]) {
        return this.functionMap[name].toJSON();
      } else {
        throw new Error(`function ${ name } not found`);
      }
    });
  }

  fromJSON(jsonFunctionNodes, FunctionNode) {
    this.functionMap = {};
    for (let i = 0; i < jsonFunctionNodes.length; i++) {
      const jsonFunctionNode = jsonFunctionNodes[i];
      this.functionMap[jsonFunctionNode.settings.name] = new FunctionNode(jsonFunctionNode.ast, jsonFunctionNode.settings);
    }
    return this;
  }

  /**
   * @desc Get string for a particular function name
   * @param {String} functionName - Function name to trace from. If null, it returns the WHOLE builder stack
   * @returns {String} settings - The string, of all the various functions. Trace optimized if functionName given
   */
  getString(functionName) {
    if (functionName) {
      return this.getStringFromFunctionNames(this.traceFunctionCalls(functionName).reverse());
    }
    return this.getStringFromFunctionNames(Object.keys(this.functionMap));
  }

  lookupReturnType(functionName, ast, requestingNode) {
    if (ast.type !== 'CallExpression') {
      throw new Error(`expected ast type of "CallExpression", but is ${ ast.type }`);
    }
    if (this._isNativeFunction(functionName)) {
      return this._lookupNativeFunctionReturnType(functionName);
    } else if (this._isFunction(functionName)) {
      const node = this._getFunction(functionName);
      if (node.returnType) {
        return node.returnType;
      } else {
        for (let i = 0; i < this.lookupChain.length; i++) {
          // detect circlical logic
          if (this.lookupChain[i].ast === ast) {
            // detect if arguments have not resolved, preventing a return type
            // if so, go ahead and resolve them, so we can resolve the return type
            if (node.argumentTypes.length === 0 && ast.arguments.length > 0) {
              const args = ast.arguments;
              for (let j = 0; j < args.length; j++) {
                this.lookupChain.push({
                  name: requestingNode.name,
                  ast: args[i],
                  requestingNode
                });
                node.argumentTypes[j] = requestingNode.getType(args[j]);
                this.lookupChain.pop();
              }
              return node.returnType = node.getType(node.getJsAST());
            }

            throw new Error('circlical logic detected!');
          }
        }
        // get ready for a ride!
        this.lookupChain.push({
          name: requestingNode.name,
          ast,
          requestingNode
        });
        const type = node.getType(node.getJsAST());
        this.lookupChain.pop();
        return node.returnType = type;
      }
    }

    return null;
  }

  /**
   *
   * @param {String} functionName
   * @return {FunctionNode}
   * @private
   */
  _getFunction(functionName) {
    if (!this._isFunction(functionName)) {
      new Error(`Function ${functionName} not found`);
    }
    return this.functionMap[functionName];
  }

  _isFunction(functionName) {
    return Boolean(this.functionMap[functionName]);
  }

  _getNativeFunction(functionName) {
    for (let i = 0; i < this.nativeFunctions.length; i++) {
      if (this.nativeFunctions[i].name === functionName) return this.nativeFunctions[i];
    }
    return null;
  }

  _isNativeFunction(functionName) {
    return Boolean(this._getNativeFunction(functionName));
  }

  _lookupNativeFunctionReturnType(functionName) {
    let nativeFunction = this._getNativeFunction(functionName);
    if (nativeFunction) {
      return nativeFunction.returnType;
    }
    throw new Error(`Native function ${ functionName } not found`);
  }

  lookupFunctionArgumentTypes(functionName) {
    if (this._isNativeFunction(functionName)) {
      return this._getNativeFunction(functionName).argumentTypes;
    } else if (this._isFunction(functionName)) {
      return this._getFunction(functionName).argumentTypes;
    }
    return null;
  }

  lookupFunctionArgumentName(functionName, argumentIndex) {
    return this._getFunction(functionName).argumentNames[argumentIndex];
  }

  /**
   *
   * @param {string} functionName
   * @param {string} argumentName
   * @return {number}
   */
  lookupFunctionArgumentBitRatio(functionName, argumentName) {
    if (!this._isFunction(functionName)) {
      throw new Error('function not found');
    }
    if (this.rootNode.name === functionName) {
      const i = this.rootNode.argumentNames.indexOf(argumentName);
      if (i !== -1) {
        return this.rootNode.argumentBitRatios[i];
      }
    }
    const node = this._getFunction(functionName);
    const i = node.argumentNames.indexOf(argumentName);
    if (i === -1) {
      throw new Error('argument not found');
    }
    const bitRatio = node.argumentBitRatios[i];
    if (typeof bitRatio !== 'number') {
      throw new Error('argument bit ratio not found');
    }
    return bitRatio;
  }

  needsArgumentType(functionName, i) {
    if (!this._isFunction(functionName)) return false;
    const fnNode = this._getFunction(functionName);
    return !fnNode.argumentTypes[i];
  }

  assignArgumentType(functionName, i, argumentType, requestingNode) {
    if (!this._isFunction(functionName)) return;
    const fnNode = this._getFunction(functionName);
    if (!fnNode.argumentTypes[i]) {
      fnNode.argumentTypes[i] = argumentType;
    }
  }

  /**
   * @param {string} functionName
   * @param {string} argumentName
   * @param {string} calleeFunctionName
   * @param {number} argumentIndex
   * @return {number}
   */
  assignArgumentBitRatio(functionName, argumentName, calleeFunctionName, argumentIndex) {
    const node = this._getFunction(functionName);
    const calleeNode = this._getFunction(calleeFunctionName);
    const i = node.argumentNames.indexOf(argumentName);
    if (i === -1) {
      throw new Error(`Argument ${argumentName} not found in arguments from function ${functionName}`);
    }
    const bitRatio = node.argumentBitRatios[i];
    if (typeof bitRatio !== 'number') {
      throw new Error(`Bit ratio for argument ${argumentName} not found in function ${functionName}`);
    }
    if (!calleeNode.argumentBitRatios) {
      calleeNode.argumentBitRatios = new Array(calleeNode.argumentNames.length);
    }
    const calleeBitRatio = calleeNode.argumentBitRatios[i];
    if (typeof calleeBitRatio === 'number') {
      if (calleeBitRatio !== bitRatio) {
        throw new Error(`Incompatible bit ratio found at function ${functionName} at argument ${argumentName}`);
      }
      return calleeBitRatio;
    }
    calleeNode.argumentBitRatios[i] = bitRatio;
    return bitRatio;
  }

  trackFunctionCall(functionName, calleeFunctionName, args) {
    if (!this.functionNodeDependencies[functionName]) {
      this.functionNodeDependencies[functionName] = new Set();
      this.functionCalls[functionName] = [];
    }
    this.functionNodeDependencies[functionName].add(calleeFunctionName);
    this.functionCalls[functionName].push(args);
  }

  getKernelResultType() {
    return this.rootNode.returnType || this.rootNode.getType(this.rootNode.ast);
  }

  getSubKernelResultType(index) {
    const subKernelNode = this.subKernelNodes[index];
    let called = false;
    for (let functionCallIndex = 0; functionCallIndex < this.rootNode.functionCalls.length; functionCallIndex++) {
      const functionCall = this.rootNode.functionCalls[functionCallIndex];
      if (functionCall.ast.callee.name === subKernelNode.name) {
        called = true;
      }
    }
    if (!called) {
      throw new Error(`SubKernel ${ subKernelNode.name } never called by kernel`);
    }
    return subKernelNode.returnType || subKernelNode.getType(subKernelNode.getJsAST());
  }

  getReturnTypes() {
    const result = {
      [this.rootNode.name]: this.rootNode.getType(this.rootNode.ast),
    };
    const list = this.traceFunctionCalls(this.rootNode.name);
    for (let i = 0; i < list.length; i++) {
      const functionName = list[i];
      const functionNode = this.functionMap[functionName];
      result[functionName] = functionNode.getType(functionNode.ast);
    }
    return result;
  }
}

module.exports = {
  FunctionBuilder
};