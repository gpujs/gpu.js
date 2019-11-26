const acorn = require('acorn');
const { utils } = require('../utils');
const { FunctionTracer } = require('./function-tracer');

/**
 *
 * @desc Represents a single function, inside JS, webGL, or openGL.
 * <p>This handles all the raw state, converted state, etc. Of a single function.</p>
 */
class FunctionNode {
  /**
   *
   * @param {string|object} source
   * @param {IFunctionSettings} [settings]
   */
  constructor(source, settings) {
    if (!source && !settings.ast) {
      throw new Error('source parameter is missing');
    }
    settings = settings || {};
    this.source = source;
    this.ast = null;
    this.name = typeof source === 'string' ? settings.isRootKernel ?
      'kernel' :
      (settings.name || utils.getFunctionNameFromString(source)) : null;
    this.calledFunctions = [];
    this.constants = {};
    this.constantTypes = {};
    this.constantBitRatios = {};
    this.isRootKernel = false;
    this.isSubKernel = false;
    this.debug = null;
    this.declarations = null;
    this.functions = null;
    this.identifiers = null;
    this.contexts = null;
    this.functionCalls = null;
    this.states = [];
    this.needsArgumentType = null;
    this.assignArgumentType = null;
    this.lookupReturnType = null;
    this.lookupFunctionArgumentTypes = null;
    this.lookupFunctionArgumentBitRatio = null;
    this.triggerImplyArgumentType = null;
    this.triggerImplyArgumentBitRatio = null;
    this.onNestedFunction = null;
    this.onFunctionCall = null;
    this.optimizeFloatMemory = null;
    this.precision = null;
    this.loopMaxIterations = null;
    this.argumentNames = (typeof this.source === 'string' ? utils.getArgumentNamesFromString(this.source) : null);
    this.argumentTypes = [];
    this.argumentSizes = [];
    this.argumentBitRatios = null;
    this.returnType = null;
    this.output = [];
    this.plugins = null;
    this.leadingReturnStatement = null;
    this.followingReturnStatement = null;
    this.dynamicOutput = null;
    this.dynamicArguments = null;
    this.strictTypingChecking = false;
    this.fixIntegerDivisionAccuracy = null;
    this.warnVarUsage = true;
    this.onIstanbulCoverageVariable = null;
    this.removeIstanbulCoverage = false;

    if (settings) {
      for (const p in settings) {
        if (!settings.hasOwnProperty(p)) continue;
        if (!this.hasOwnProperty(p)) continue;
        this[p] = settings[p];
      }
    }

    this.literalTypes = {};

    this.validate();
    this._string = null;
    this._internalVariableNames = {};
  }

  validate() {
    if (typeof this.source !== 'string' && !this.ast) {
      throw new Error('this.source not a string');
    }

    if (!this.ast && !utils.isFunctionString(this.source)) {
      throw new Error('this.source not a function string');
    }

    if (!this.name) {
      throw new Error('this.name could not be set');
    }

    if (this.argumentTypes.length > 0 && this.argumentTypes.length !== this.argumentNames.length) {
      throw new Error(`argumentTypes count of ${ this.argumentTypes.length } exceeds ${ this.argumentNames.length }`);
    }

    if (this.output.length < 1) {
      throw new Error('this.output is not big enough');
    }
  }

  /**
   * @param {String} name
   * @returns {boolean}
   */
  isIdentifierConstant(name) {
    if (!this.constants) return false;
    return this.constants.hasOwnProperty(name);
  }

  isInput(argumentName) {
    return this.argumentTypes[this.argumentNames.indexOf(argumentName)] === 'Input';
  }

  pushState(state) {
    this.states.push(state);
  }

  popState(state) {
    if (this.state !== state) {
      throw new Error(`Cannot popState ${ state } when in ${ this.state }`);
    }
    this.states.pop();
  }

  isState(state) {
    return this.state === state;
  }

  get state() {
    return this.states[this.states.length - 1];
  }

  /**
   * @function
   * @name astMemberExpressionUnroll
   * @desc Parses the abstract syntax tree for binary expression.
   *
   * <p>Utility function for astCallExpression.</p>
   *
   * @param {Object} ast - the AST object to parse
   *
   * @returns {String} the function namespace call, unrolled
   */
  astMemberExpressionUnroll(ast) {
    if (ast.type === 'Identifier') {
      return ast.name;
    } else if (ast.type === 'ThisExpression') {
      return 'this';
    }

    if (ast.type === 'MemberExpression') {
      if (ast.object && ast.property) {
        //babel sniffing
        if (ast.object.hasOwnProperty('name') && ast.object.name[0] === '_') {
          return this.astMemberExpressionUnroll(ast.property);
        }

        return (
          this.astMemberExpressionUnroll(ast.object) +
          '.' +
          this.astMemberExpressionUnroll(ast.property)
        );
      }
    }

    //babel sniffing
    if (ast.hasOwnProperty('expressions')) {
      const firstExpression = ast.expressions[0];
      if (firstExpression.type === 'Literal' && firstExpression.value === 0 && ast.expressions.length === 2) {
        return this.astMemberExpressionUnroll(ast.expressions[1]);
      }
    }

    // Failure, unknown expression
    throw this.astErrorOutput('Unknown astMemberExpressionUnroll', ast);
  }

  /**
   * @desc Parses the class function JS, and returns its Abstract Syntax Tree object.
   * This is used internally to convert to shader code
   *
   * @param {Object} [inParser] - Parser to use, assumes in scope 'parser' if null or undefined
   *
   * @returns {Object} The function AST Object, note that result is cached under this.ast;
   */
  getJsAST(inParser) {
    if (this.ast) {
      return this.ast;
    }
    if (typeof this.source === 'object') {
      this.traceFunctionAST(this.source);
      return this.ast = this.source;
    }

    inParser = inParser || acorn;
    if (inParser === null) {
      throw new Error('Missing JS to AST parser');
    }

    const ast = Object.freeze(inParser.parse(`const parser_${ this.name } = ${ this.source };`, {
      locations: true
    }));
    // take out the function object, outside the var declarations
    const functionAST = ast.body[0].declarations[0].init;
    this.traceFunctionAST(functionAST);

    if (!ast) {
      throw new Error('Failed to parse JS code');
    }

    return this.ast = functionAST;
  }

  traceFunctionAST(ast) {
    const { contexts, declarations, functions, identifiers, functionCalls } = new FunctionTracer(ast);
    this.contexts = contexts;
    this.identifiers = identifiers;
    this.functionCalls = functionCalls;
    this.declarations = [];
    this.functions = functions;
    for (let i = 0; i < declarations.length; i++) {
      const declaration = declarations[i];
      const { ast, context, name, origin, forceInteger, assignable } = declaration;
      const { init } = ast;
      const dependencies = this.getDependencies(init);
      let valueType = null;

      if (forceInteger) {
        valueType = 'Integer';
      } else {
        if (init) {
          const realType = this.getType(init);
          switch (realType) {
            case 'Integer':
            case 'Float':
            case 'Number':
              if (init.type === 'MemberExpression') {
                valueType = realType;
              } else {
                valueType = 'Number';
              }
              break;
            case 'LiteralInteger':
              valueType = 'Number';
              break;
            default:
              valueType = realType;
          }
        }
      }
      this.declarations.push({
        valueType,
        dependencies,
        isSafe: this.isSafeDependencies(dependencies),
        ast,
        name,
        context,
        origin,
        assignable,
      });
    }

    for (let i = 0; i < functions.length; i++) {
      this.onNestedFunction(functions[i]);
    }
  }

  getDeclaration(ast) {
    for (let i = 0; i < this.identifiers.length; i++) {
      const identifier = this.identifiers[i];
      if (ast === identifier.ast && identifier.context.hasOwnProperty(ast.name)) {
        for (let j = 0; j < this.declarations.length; j++) {
          const declaration = this.declarations[j];
          if (declaration.name === ast.name && declaration.context[ast.name] === identifier.context[ast.name]) {
            return declaration;
          }
        }
      }
    }
    return null;
  }

  /**
   * @desc Return the type of parameter sent to subKernel/Kernel.
   * @param {Object} ast - Identifier
   * @returns {String} Type of the parameter
   */
  getVariableType(ast) {
    if (ast.type !== 'Identifier') {
      throw new Error(`ast of ${ast.type} not "Identifier"`);
    }
    let type = null;
    const argumentIndex = this.argumentNames.indexOf(ast.name);
    if (argumentIndex === -1) {
      const declaration = this.getDeclaration(ast);
      if (declaration) {
        return declaration.valueType;
      }
    } else {
      const argumentType = this.argumentTypes[argumentIndex];
      if (argumentType) {
        type = argumentType;
      }
    }
    if (!type && this.strictTypingChecking) {
      throw new Error(`Declaration of ${name} not found`);
    }
    return type;
  }

  /**
   * Generally used to lookup the value type returned from a member expressions
   * @param {String} type
   * @return {String}
   */
  getLookupType(type) {
    if (!typeLookupMap.hasOwnProperty(type)) {
      throw new Error(`unknown typeLookupMap ${ type }`);
    }
    return typeLookupMap[type];
  }

  getConstantType(constantName) {
    if (this.constantTypes[constantName]) {
      const type = this.constantTypes[constantName];
      if (type === 'Float') {
        return 'Number';
      } else {
        return type;
      }
    }
    throw new Error(`Type for constant "${ constantName }" not declared`);
  }

  toString() {
    if (this._string) return this._string;
    return this._string = this.astGeneric(this.getJsAST(), []).join('').trim();
  }

  toJSON() {
    const settings = {
      source: this.source,
      name: this.name,
      constants: this.constants,
      constantTypes: this.constantTypes,
      isRootKernel: this.isRootKernel,
      isSubKernel: this.isSubKernel,
      debug: this.debug,
      output: this.output,
      loopMaxIterations: this.loopMaxIterations,
      argumentNames: this.argumentNames,
      argumentTypes: this.argumentTypes,
      argumentSizes: this.argumentSizes,
      returnType: this.returnType,
      leadingReturnStatement: this.leadingReturnStatement,
      followingReturnStatement: this.followingReturnStatement,
    };

    return {
      ast: this.ast,
      settings
    };
  }

  /**
   * Recursively looks up type for ast expression until it's found
   * @param ast
   * @returns {String|null}
   */
  getType(ast) {
    if (Array.isArray(ast)) {
      return this.getType(ast[ast.length - 1]);
    }
    switch (ast.type) {
      case 'BlockStatement':
        return this.getType(ast.body);
      case 'ArrayExpression':
        return `Array(${ ast.elements.length })`;
      case 'Literal':
        const literalKey = this.astKey(ast);
        if (this.literalTypes[literalKey]) {
          return this.literalTypes[literalKey];
        }
        if (Number.isInteger(ast.value)) {
          return 'LiteralInteger';
        } else if (ast.value === true || ast.value === false) {
          return 'Boolean';
        } else {
          return 'Number';
        }
        case 'AssignmentExpression':
          return this.getType(ast.left);
        case 'CallExpression':
          if (this.isAstMathFunction(ast)) {
            return 'Number';
          }
          if (!ast.callee || !ast.callee.name) {
            if (ast.callee.type === 'SequenceExpression' && ast.callee.expressions[ast.callee.expressions.length - 1].property.name) {
              const functionName = ast.callee.expressions[ast.callee.expressions.length - 1].property.name;
              this.inferArgumentTypesIfNeeded(functionName, ast.arguments);
              return this.lookupReturnType(functionName, ast, this);
            }
            throw this.astErrorOutput('Unknown call expression', ast);
          }
          if (ast.callee && ast.callee.name) {
            const functionName = ast.callee.name;
            this.inferArgumentTypesIfNeeded(functionName, ast.arguments);
            return this.lookupReturnType(functionName, ast, this);
          }
          throw this.astErrorOutput(`Unhandled getType Type "${ ast.type }"`, ast);
        case 'BinaryExpression':
          // modulos is Number
          switch (ast.operator) {
            case '%':
            case '/':
              if (this.fixIntegerDivisionAccuracy) {
                return 'Number';
              } else {
                break;
              }
              case '>':
              case '<':
                return 'Boolean';
              case '&':
              case '|':
              case '^':
              case '<<':
              case '>>':
              case '>>>':
                return 'Integer';
          }
          const type = this.getType(ast.left);
          if (this.isState('skip-literal-correction')) return type;
          if (type === 'LiteralInteger') {
            const rightType = this.getType(ast.right);
            if (rightType === 'LiteralInteger') {
              if (ast.left.value % 1 === 0) {
                return 'Integer';
              } else {
                return 'Float';
              }
            }
            return rightType;
          }
          return typeLookupMap[type] || type;
        case 'UpdateExpression':
          return this.getType(ast.argument);
        case 'UnaryExpression':
          if (ast.operator === '~') {
            return 'Integer';
          }
          return this.getType(ast.argument);
        case 'VariableDeclaration': {
          const declarations = ast.declarations;
          let lastType;
          for (let i = 0; i < declarations.length; i++) {
            const declaration = declarations[i];
            lastType = this.getType(declaration);
          }
          if (!lastType) {
            throw this.astErrorOutput(`Unable to find type for declaration`, ast);
          }
          return lastType;
        }
        case 'VariableDeclarator':
          const declaration = this.getDeclaration(ast.id);
          if (!declaration) {
            throw this.astErrorOutput(`Unable to find declarator`, ast);
          }

          if (!declaration.valueType) {
            throw this.astErrorOutput(`Unable to find declarator valueType`, ast);
          }

          return declaration.valueType;
        case 'Identifier':
          if (ast.name === 'Infinity') {
            return 'Number';
          }
          if (this.isAstVariable(ast)) {
            const signature = this.getVariableSignature(ast);
            if (signature === 'value') {
              const type = this.getVariableType(ast);
              if (!type) {
                throw this.astErrorOutput(`Unable to find identifier valueType`, ast);
              }
              return type;
            }
          }
          const origin = this.findIdentifierOrigin(ast);
          if (origin && origin.init) {
            return this.getType(origin.init);
          }
          return null;
        case 'ReturnStatement':
          return this.getType(ast.argument);
        case 'MemberExpression':
          if (this.isAstMathFunction(ast)) {
            switch (ast.property.name) {
              case 'ceil':
                return 'Integer';
              case 'floor':
                return 'Integer';
              case 'round':
                return 'Integer';
            }
            return 'Number';
          }
          if (this.isAstVariable(ast)) {
            const variableSignature = this.getVariableSignature(ast);
            switch (variableSignature) {
              case 'value[]':
                return this.getLookupType(this.getVariableType(ast.object));
              case 'value[][]':
                return this.getLookupType(this.getVariableType(ast.object.object));
              case 'value[][][]':
                return this.getLookupType(this.getVariableType(ast.object.object.object));
              case 'value[][][][]':
                return this.getLookupType(this.getVariableType(ast.object.object.object.object));
              case 'value.thread.value':
              case 'this.thread.value':
                return 'Integer';
              case 'this.output.value':
                return this.dynamicOutput ? 'Integer' : 'LiteralInteger';
              case 'this.constants.value':
                return this.getConstantType(ast.property.name);
              case 'this.constants.value[]':
                return this.getLookupType(this.getConstantType(ast.object.property.name));
              case 'this.constants.value[][]':
                return this.getLookupType(this.getConstantType(ast.object.object.property.name));
              case 'this.constants.value[][][]':
                return this.getLookupType(this.getConstantType(ast.object.object.object.property.name));
              case 'this.constants.value[][][][]':
                return this.getLookupType(this.getConstantType(ast.object.object.object.object.property.name));
              case 'fn()[]':
                return this.getLookupType(this.getType(ast.object));
              case 'fn()[][]':
                return this.getLookupType(this.getType(ast.object));
              case 'fn()[][][]':
                return this.getLookupType(this.getType(ast.object));
              case 'value.value':
                if (this.isAstMathVariable(ast)) {
                  return 'Number';
                }
                switch (ast.property.name) {
                  case 'r':
                    return this.getLookupType(this.getVariableType(ast.object));
                  case 'g':
                    return this.getLookupType(this.getVariableType(ast.object));
                  case 'b':
                    return this.getLookupType(this.getVariableType(ast.object));
                  case 'a':
                    return this.getLookupType(this.getVariableType(ast.object));
                }
                case '[][]':
                  return 'Number';
            }
            throw this.astErrorOutput('Unhandled getType MemberExpression', ast);
          }
          throw this.astErrorOutput('Unhandled getType MemberExpression', ast);
        case 'ConditionalExpression':
          return this.getType(ast.consequent);
        case 'FunctionDeclaration':
        case 'FunctionExpression':
          const lastReturn = this.findLastReturn(ast.body);
          if (lastReturn) {
            return this.getType(lastReturn);
          }
          return null;
        case 'IfStatement':
          return this.getType(ast.consequent);
        case 'SequenceExpression':
          return this.getType(ast.expressions[ast.expressions.length - 1]);
        default:
          throw this.astErrorOutput(`Unhandled getType Type "${ ast.type }"`, ast);
    }
  }

  inferArgumentTypesIfNeeded(functionName, args) {
    // ensure arguments are filled in, so when we lookup return type, we already can infer it
    for (let i = 0; i < args.length; i++) {
      if (!this.needsArgumentType(functionName, i)) continue;
      const type = this.getType(args[i]);
      if (!type) {
        throw this.astErrorOutput(`Unable to infer argument ${i}`, args[i]);
      }
      this.assignArgumentType(functionName, i, type);
    }
  }

  isAstMathVariable(ast) {
    const mathProperties = [
      'E',
      'PI',
      'SQRT2',
      'SQRT1_2',
      'LN2',
      'LN10',
      'LOG2E',
      'LOG10E',
    ];
    return ast.type === 'MemberExpression' &&
      ast.object && ast.object.type === 'Identifier' &&
      ast.object.name === 'Math' &&
      ast.property &&
      ast.property.type === 'Identifier' &&
      mathProperties.indexOf(ast.property.name) > -1;
  }

  isAstMathFunction(ast) {
    const mathFunctions = [
      'abs',
      'acos',
      'asin',
      'atan',
      'atan2',
      'ceil',
      'cos',
      'exp',
      'floor',
      'log',
      'log2',
      'max',
      'min',
      'pow',
      'random',
      'round',
      'sign',
      'sin',
      'sqrt',
      'tan',
    ];
    return ast.type === 'CallExpression' &&
      ast.callee &&
      ast.callee.type === 'MemberExpression' &&
      ast.callee.object &&
      ast.callee.object.type === 'Identifier' &&
      ast.callee.object.name === 'Math' &&
      ast.callee.property &&
      ast.callee.property.type === 'Identifier' &&
      mathFunctions.indexOf(ast.callee.property.name) > -1;
  }

  isAstVariable(ast) {
    return ast.type === 'Identifier' || ast.type === 'MemberExpression';
  }

  isSafe(ast) {
    return this.isSafeDependencies(this.getDependencies(ast));
  }

  isSafeDependencies(dependencies) {
    return dependencies && dependencies.every ? dependencies.every(dependency => dependency.isSafe) : true;
  }

  /**
   *
   * @param ast
   * @param dependencies
   * @param isNotSafe
   * @return {Array}
   */
  getDependencies(ast, dependencies, isNotSafe) {
    if (!dependencies) {
      dependencies = [];
    }
    if (!ast) return null;
    if (Array.isArray(ast)) {
      for (let i = 0; i < ast.length; i++) {
        this.getDependencies(ast[i], dependencies, isNotSafe);
      }
      return dependencies;
    }
    switch (ast.type) {
      case 'AssignmentExpression':
        this.getDependencies(ast.left, dependencies, isNotSafe);
        this.getDependencies(ast.right, dependencies, isNotSafe);
        return dependencies;
      case 'ConditionalExpression':
        this.getDependencies(ast.test, dependencies, isNotSafe);
        this.getDependencies(ast.alternate, dependencies, isNotSafe);
        this.getDependencies(ast.consequent, dependencies, isNotSafe);
        return dependencies;
      case 'Literal':
        dependencies.push({
          origin: 'literal',
          value: ast.value,
          isSafe: isNotSafe === true ? false : ast.value > -Infinity && ast.value < Infinity && !isNaN(ast.value)
        });
        break;
      case 'VariableDeclarator':
        return this.getDependencies(ast.init, dependencies, isNotSafe);
      case 'Identifier':
        const declaration = this.getDeclaration(ast);
        if (declaration) {
          dependencies.push({
            name: ast.name,
            origin: 'declaration',
            isSafe: isNotSafe ? false : this.isSafeDependencies(declaration.dependencies),
          });
        } else if (this.argumentNames.indexOf(ast.name) > -1) {
          dependencies.push({
            name: ast.name,
            origin: 'argument',
            isSafe: false,
          });
        } else if (this.strictTypingChecking) {
          throw new Error(`Cannot find identifier origin "${ast.name}"`);
        }
        break;
      case 'FunctionDeclaration':
        return this.getDependencies(ast.body.body[ast.body.body.length - 1], dependencies, isNotSafe);
      case 'ReturnStatement':
        return this.getDependencies(ast.argument, dependencies);
      case 'BinaryExpression':
        isNotSafe = (ast.operator === '/' || ast.operator === '*');
        this.getDependencies(ast.left, dependencies, isNotSafe);
        this.getDependencies(ast.right, dependencies, isNotSafe);
        return dependencies;
      case 'UnaryExpression':
      case 'UpdateExpression':
        return this.getDependencies(ast.argument, dependencies, isNotSafe);
      case 'VariableDeclaration':
        return this.getDependencies(ast.declarations, dependencies, isNotSafe);
      case 'ArrayExpression':
        dependencies.push({
          origin: 'declaration',
          isSafe: true,
        });
        return dependencies;
      case 'CallExpression':
        dependencies.push({
          origin: 'function',
          isSafe: true,
        });
        return dependencies;
      case 'MemberExpression':
        const details = this.getMemberExpressionDetails(ast);
        switch (details.signature) {
          case 'value[]':
            this.getDependencies(ast.object, dependencies, isNotSafe);
            break;
          case 'value[][]':
            this.getDependencies(ast.object.object, dependencies, isNotSafe);
            break;
          case 'value[][][]':
            this.getDependencies(ast.object.object.object, dependencies, isNotSafe);
            break;
          case 'this.output.value':
            if (this.dynamicOutput) {
              dependencies.push({
                name: details.name,
                origin: 'output',
                isSafe: false,
              });
            }
            break;
        }
        if (details) {
          if (details.property) {
            this.getDependencies(details.property, dependencies, isNotSafe);
          }
          if (details.xProperty) {
            this.getDependencies(details.xProperty, dependencies, isNotSafe);
          }
          if (details.yProperty) {
            this.getDependencies(details.yProperty, dependencies, isNotSafe);
          }
          if (details.zProperty) {
            this.getDependencies(details.zProperty, dependencies, isNotSafe);
          }
          return dependencies;
        }
        case 'SequenceExpression':
          return this.getDependencies(ast.expressions, dependencies, isNotSafe);
        default:
          throw this.astErrorOutput(`Unhandled type ${ ast.type } in getDependencies`, ast);
    }
    return dependencies;
  }

  getVariableSignature(ast) {
    if (!this.isAstVariable(ast)) {
      throw new Error(`ast of type "${ ast.type }" is not a variable signature`);
    }
    if (ast.type === 'Identifier') {
      return 'value';
    }
    const signature = [];
    while (true) {
      if (!ast) break;
      if (ast.computed) {
        signature.push('[]');
      } else if (ast.type === 'ThisExpression') {
        signature.unshift('this');
      } else if (ast.property && ast.property.name) {
        if (
          ast.property.name === 'x' ||
          ast.property.name === 'y' ||
          ast.property.name === 'z'
        ) {
          signature.unshift('.value');
        } else if (
          ast.property.name === 'constants' ||
          ast.property.name === 'thread' ||
          ast.property.name === 'output'
        ) {
          signature.unshift('.' + ast.property.name);
        } else {
          signature.unshift('.value');
        }
      } else if (ast.name) {
        signature.unshift('value');
      } else if (ast.callee && ast.callee.name) {
        signature.unshift('fn()');
      } else if (ast.elements) {
        signature.unshift('[]');
      } else {
        signature.unshift('unknown');
      }
      ast = ast.object;
    }

    const signatureString = signature.join('');
    const allowedExpressions = [
      'value',
      'value[]',
      'value[][]',
      'value[][][]',
      'value[][][][]',
      'value.value',
      'value.value[]', // istanbul coverage
      'value.value[][]', // istanbul coverage
      'value.thread.value',
      'this.thread.value',
      'this.output.value',
      'this.constants.value',
      'this.constants.value[]',
      'this.constants.value[][]',
      'this.constants.value[][][]',
      'this.constants.value[][][][]',
      'fn()[]',
      'fn()[][]',
      'fn()[][][]',
      '[][]',
    ];
    if (allowedExpressions.indexOf(signatureString) > -1) {
      return signatureString;
    }
    return null;
  }

  build() {
    return this.toString().length > 0;
  }

  /**
   * @desc Parses the abstract syntax tree for generically to its respective function
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   * @returns {Array} the parsed string array
   */
  astGeneric(ast, retArr) {
    if (ast === null) {
      throw this.astErrorOutput('NULL ast', ast);
    } else {
      if (Array.isArray(ast)) {
        for (let i = 0; i < ast.length; i++) {
          this.astGeneric(ast[i], retArr);
        }
        return retArr;
      }

      switch (ast.type) {
        case 'FunctionDeclaration':
          return this.astFunctionDeclaration(ast, retArr);
        case 'FunctionExpression':
          return this.astFunctionExpression(ast, retArr);
        case 'ReturnStatement':
          return this.astReturnStatement(ast, retArr);
        case 'Literal':
          return this.astLiteral(ast, retArr);
        case 'BinaryExpression':
          return this.astBinaryExpression(ast, retArr);
        case 'Identifier':
          return this.astIdentifierExpression(ast, retArr);
        case 'AssignmentExpression':
          return this.astAssignmentExpression(ast, retArr);
        case 'ExpressionStatement':
          return this.astExpressionStatement(ast, retArr);
        case 'EmptyStatement':
          return this.astEmptyStatement(ast, retArr);
        case 'BlockStatement':
          return this.astBlockStatement(ast, retArr);
        case 'IfStatement':
          return this.astIfStatement(ast, retArr);
        case 'SwitchStatement':
          return this.astSwitchStatement(ast, retArr);
        case 'BreakStatement':
          return this.astBreakStatement(ast, retArr);
        case 'ContinueStatement':
          return this.astContinueStatement(ast, retArr);
        case 'ForStatement':
          return this.astForStatement(ast, retArr);
        case 'WhileStatement':
          return this.astWhileStatement(ast, retArr);
        case 'DoWhileStatement':
          return this.astDoWhileStatement(ast, retArr);
        case 'VariableDeclaration':
          return this.astVariableDeclaration(ast, retArr);
        case 'VariableDeclarator':
          return this.astVariableDeclarator(ast, retArr);
        case 'ThisExpression':
          return this.astThisExpression(ast, retArr);
        case 'SequenceExpression':
          return this.astSequenceExpression(ast, retArr);
        case 'UnaryExpression':
          return this.astUnaryExpression(ast, retArr);
        case 'UpdateExpression':
          return this.astUpdateExpression(ast, retArr);
        case 'LogicalExpression':
          return this.astLogicalExpression(ast, retArr);
        case 'MemberExpression':
          return this.astMemberExpression(ast, retArr);
        case 'CallExpression':
          return this.astCallExpression(ast, retArr);
        case 'ArrayExpression':
          return this.astArrayExpression(ast, retArr);
        case 'DebuggerStatement':
          return this.astDebuggerStatement(ast, retArr);
        case 'ConditionalExpression':
          return this.astConditionalExpression(ast, retArr);
      }

      throw this.astErrorOutput('Unknown ast type : ' + ast.type, ast);
    }
  }
  /**
   * @desc To throw the AST error, with its location.
   * @param {string} error - the error message output
   * @param {Object} ast - the AST object where the error is
   */
  astErrorOutput(error, ast) {
    if (typeof this.source !== 'string') {
      return new Error(error);
    }

    const debugString = utils.getAstString(this.source, ast);
    const leadingSource = this.source.substr(ast.start);
    const splitLines = leadingSource.split(/\n/);
    const lineBefore = splitLines.length > 0 ? splitLines[splitLines.length - 1] : 0;
    return new Error(`${error} on line ${ splitLines.length }, position ${ lineBefore.length }:\n ${ debugString }`);
  }

  astDebuggerStatement(arrNode, retArr) {
    return retArr;
  }

  astConditionalExpression(ast, retArr) {
    if (ast.type !== 'ConditionalExpression') {
      throw this.astErrorOutput('Not a conditional expression', ast);
    }
    retArr.push('(');
    this.astGeneric(ast.test, retArr);
    retArr.push('?');
    this.astGeneric(ast.consequent, retArr);
    retArr.push(':');
    this.astGeneric(ast.alternate, retArr);
    retArr.push(')');
    return retArr;
  }

  /**
   * @abstract
   * @param {Object} ast
   * @param {String[]} retArr
   * @returns {String[]}
   */
  astFunction(ast, retArr) {
    throw new Error(`"astFunction" not defined on ${ this.constructor.name }`);
  }

  /**
   * @desc Parses the abstract syntax tree for to its *named function declaration*
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astFunctionDeclaration(ast, retArr) {
    if (this.isChildFunction(ast)) {
      return retArr;
    }
    return this.astFunction(ast, retArr);
  }
  astFunctionExpression(ast, retArr) {
    if (this.isChildFunction(ast)) {
      return retArr;
    }
    return this.astFunction(ast, retArr);
  }
  isChildFunction(ast) {
    for (let i = 0; i < this.functions.length; i++) {
      if (this.functions[i] === ast) {
        return true;
      }
    }
    return false;
  }
  astReturnStatement(ast, retArr) {
    return retArr;
  }
  astLiteral(ast, retArr) {
    this.literalTypes[this.astKey(ast)] = 'Number';
    return retArr;
  }
  astBinaryExpression(ast, retArr) {
    return retArr;
  }
  astIdentifierExpression(ast, retArr) {
    return retArr;
  }
  astAssignmentExpression(ast, retArr) {
    return retArr;
  }
  /**
   * @desc Parses the abstract syntax tree for *generic expression* statement
   * @param {Object} esNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astExpressionStatement(esNode, retArr) {
    this.astGeneric(esNode.expression, retArr);
    retArr.push(';');
    return retArr;
  }
  /**
   * @desc Parses the abstract syntax tree for an *Empty* Statement
   * @param {Object} eNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astEmptyStatement(eNode, retArr) {
    return retArr;
  }
  astBlockStatement(ast, retArr) {
    return retArr;
  }
  astIfStatement(ast, retArr) {
    return retArr;
  }
  astSwitchStatement(ast, retArr) {
    return retArr;
  }
  /**
   * @desc Parses the abstract syntax tree for *Break* Statement
   * @param {Object} brNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astBreakStatement(brNode, retArr) {
    retArr.push('break;');
    return retArr;
  }
  /**
   * @desc Parses the abstract syntax tree for *Continue* Statement
   * @param {Object} crNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astContinueStatement(crNode, retArr) {
    retArr.push('continue;\n');
    return retArr;
  }
  astForStatement(ast, retArr) {
    return retArr;
  }
  astWhileStatement(ast, retArr) {
    return retArr;
  }
  astDoWhileStatement(ast, retArr) {
    return retArr;
  }
  /**
   * @desc Parses the abstract syntax tree for *Variable Declaration*
   * @param {Object} varDecNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astVariableDeclaration(varDecNode, retArr) {
    const declarations = varDecNode.declarations;
    if (!declarations || !declarations[0] || !declarations[0].init) {
      throw this.astErrorOutput('Unexpected expression', varDecNode);
    }
    const result = [];
    const firstDeclaration = declarations[0];
    const init = firstDeclaration.init;
    let type = this.isState('in-for-loop-init') ? 'Integer' : this.getType(init);
    if (type === 'LiteralInteger') {
      // We had the choice to go either float or int, choosing float
      type = 'Number';
    }
    const markupType = typeMap[type];
    if (!markupType) {
      throw this.astErrorOutput(`Markup type ${ markupType } not handled`, varDecNode);
    }
    let dependencies = this.getDependencies(firstDeclaration.init);
    throw new Error('remove me');
    this.declarations[firstDeclaration.id.name] = Object.freeze({
      type,
      dependencies,
      isSafe: dependencies.every(dependency => dependency.isSafe)
    });
    const initResult = [`${type} user_${firstDeclaration.id.name}=`];
    this.astGeneric(init, initResult);
    result.push(initResult.join(''));

    // first declaration is done, now any added ones setup
    for (let i = 1; i < declarations.length; i++) {
      const declaration = declarations[i];
      dependencies = this.getDependencies(declaration);
      throw new Error('Remove me');
      this.declarations[declaration.id.name] = Object.freeze({
        type,
        dependencies,
        isSafe: false
      });
      this.astGeneric(declaration, result);
    }

    retArr.push(retArr, result.join(','));
    retArr.push(';');
    return retArr;
  }
  /**
   * @desc Parses the abstract syntax tree for *Variable Declarator*
   * @param {Object} iVarDecNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astVariableDeclarator(iVarDecNode, retArr) {
    this.astGeneric(iVarDecNode.id, retArr);
    if (iVarDecNode.init !== null) {
      retArr.push('=');
      this.astGeneric(iVarDecNode.init, retArr);
    }
    return retArr;
  }
  astThisExpression(ast, retArr) {
    return retArr;
  }
  isIstanbulAST(ast) {
    const variableSignature = this.getVariableSignature(ast);
    return variableSignature === 'value.value[]' || variableSignature === 'value.value[][]';
  }
  astSequenceExpression(sNode, retArr) {
    const { expressions } = sNode;
    const sequenceResult = [];
    for (let i = 0; i < expressions.length; i++) {
      const expression = expressions[i];
      if (this.removeIstanbulCoverage) {
        if (expression.type === 'UpdateExpression' && this.isIstanbulAST(expression.argument)) {
          continue;
        }
      }
      const expressionResult = [];
      this.astGeneric(expression, expressionResult);
      sequenceResult.push(expressionResult.join(''));
    }
    if (sequenceResult.length > 1) {
      retArr.push('(', sequenceResult.join(','), ')');
    } else {
      retArr.push(sequenceResult[0]);
    }
    return retArr;
  }
  /**
   * @desc Parses the abstract syntax tree for *Unary* Expression
   * @param {Object} uNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astUnaryExpression(uNode, retArr) {
    const unaryResult = this.checkAndUpconvertBitwiseUnary(uNode, retArr);
    if (unaryResult) {
      return retArr;
    }

    if (uNode.prefix) {
      retArr.push(uNode.operator);
      this.astGeneric(uNode.argument, retArr);
    } else {
      this.astGeneric(uNode.argument, retArr);
      retArr.push(uNode.operator);
    }

    return retArr;
  }

  checkAndUpconvertBitwiseUnary(uNode, retArr) {}

  /**
   * @desc Parses the abstract syntax tree for *Update* Expression
   * @param {Object} uNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astUpdateExpression(uNode, retArr) {
    if (this.removeIstanbulCoverage) {
      const signature = this.getVariableSignature(uNode.argument);
      if (this.isIstanbulAST(uNode.argument)) {
        return retArr;
      }
    }
    if (uNode.prefix) {
      retArr.push(uNode.operator);
      this.astGeneric(uNode.argument, retArr);
    } else {
      this.astGeneric(uNode.argument, retArr);
      retArr.push(uNode.operator);
    }

    return retArr;
  }
  /**
   * @desc Parses the abstract syntax tree for *Logical* Expression
   * @param {Object} logNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astLogicalExpression(logNode, retArr) {
    retArr.push('(');
    this.astGeneric(logNode.left, retArr);
    retArr.push(logNode.operator);
    this.astGeneric(logNode.right, retArr);
    retArr.push(')');
    return retArr;
  }
  astMemberExpression(ast, retArr) {
    return retArr;
  }
  astCallExpression(ast, retArr) {
    return retArr;
  }
  astArrayExpression(ast, retArr) {
    return retArr;
  }

  /**
   *
   * @param ast
   * @return {IFunctionNodeMemberExpressionDetails}
   */
  getMemberExpressionDetails(ast) {
    if (ast.type !== 'MemberExpression') {
      throw this.astErrorOutput(`Expression ${ ast.type } not a MemberExpression`, ast);
    }
    let name = null;
    let type = null;
    const variableSignature = this.getVariableSignature(ast);
    switch (variableSignature) {
      case 'value':
        return null;
      case 'value.thread.value':
      case 'this.thread.value':
      case 'this.output.value':
        return {
          signature: variableSignature,
            type: 'Integer',
            name: ast.property.name
        };
      case 'value[]':
        if (typeof ast.object.name !== 'string') {
          throw this.astErrorOutput('Unexpected expression', ast);
        }
        name = ast.object.name;
        return {
          name,
          origin: 'user',
            signature: variableSignature,
            type: this.getVariableType(ast.object),
            xProperty: ast.property
        };
      case 'value[][]':
        if (typeof ast.object.object.name !== 'string') {
          throw this.astErrorOutput('Unexpected expression', ast);
        }
        name = ast.object.object.name;
        return {
          name,
          origin: 'user',
            signature: variableSignature,
            type: this.getVariableType(ast.object.object),
            yProperty: ast.object.property,
            xProperty: ast.property,
        };
      case 'value[][][]':
        if (typeof ast.object.object.object.name !== 'string') {
          throw this.astErrorOutput('Unexpected expression', ast);
        }
        name = ast.object.object.object.name;
        return {
          name,
          origin: 'user',
            signature: variableSignature,
            type: this.getVariableType(ast.object.object.object),
            zProperty: ast.object.object.property,
            yProperty: ast.object.property,
            xProperty: ast.property,
        };
      case 'value[][][][]':
        if (typeof ast.object.object.object.object.name !== 'string') {
          throw this.astErrorOutput('Unexpected expression', ast);
        }
        name = ast.object.object.object.object.name;
        return {
          name,
          origin: 'user',
            signature: variableSignature,
            type: this.getVariableType(ast.object.object.object.object),
            zProperty: ast.object.object.property,
            yProperty: ast.object.property,
            xProperty: ast.property,
        };
      case 'value.value':
        if (typeof ast.property.name !== 'string') {
          throw this.astErrorOutput('Unexpected expression', ast);
        }
        if (this.isAstMathVariable(ast)) {
          name = ast.property.name;
          return {
            name,
            origin: 'Math',
            type: 'Number',
            signature: variableSignature,
          };
        }
        switch (ast.property.name) {
          case 'r':
          case 'g':
          case 'b':
          case 'a':
            name = ast.object.name;
            return {
              name,
              property: ast.property.name,
                origin: 'user',
                signature: variableSignature,
                type: 'Number'
            };
          default:
            throw this.astErrorOutput('Unexpected expression', ast);
        }
        case 'this.constants.value':
          if (typeof ast.property.name !== 'string') {
            throw this.astErrorOutput('Unexpected expression', ast);
          }
          name = ast.property.name;
          type = this.getConstantType(name);
          if (!type) {
            throw this.astErrorOutput('Constant has no type', ast);
          }
          return {
            name,
            type,
            origin: 'constants',
              signature: variableSignature,
          };
        case 'this.constants.value[]':
          if (typeof ast.object.property.name !== 'string') {
            throw this.astErrorOutput('Unexpected expression', ast);
          }
          name = ast.object.property.name;
          type = this.getConstantType(name);
          if (!type) {
            throw this.astErrorOutput('Constant has no type', ast);
          }
          return {
            name,
            type,
            origin: 'constants',
              signature: variableSignature,
              xProperty: ast.property,
          };
        case 'this.constants.value[][]': {
          if (typeof ast.object.object.property.name !== 'string') {
            throw this.astErrorOutput('Unexpected expression', ast);
          }
          name = ast.object.object.property.name;
          type = this.getConstantType(name);
          if (!type) {
            throw this.astErrorOutput('Constant has no type', ast);
          }
          return {
            name,
            type,
            origin: 'constants',
            signature: variableSignature,
            yProperty: ast.object.property,
            xProperty: ast.property,
          };
        }
        case 'this.constants.value[][][]': {
          if (typeof ast.object.object.object.property.name !== 'string') {
            throw this.astErrorOutput('Unexpected expression', ast);
          }
          name = ast.object.object.object.property.name;
          type = this.getConstantType(name);
          if (!type) {
            throw this.astErrorOutput('Constant has no type', ast);
          }
          return {
            name,
            type,
            origin: 'constants',
            signature: variableSignature,
            zProperty: ast.object.object.property,
            yProperty: ast.object.property,
            xProperty: ast.property,
          };
        }
        case 'fn()[]':
        case '[][]':
          return {
            signature: variableSignature,
              property: ast.property,
          };
        case 'value.value[]': // istanbul coverage
          if (this.removeIstanbulCoverage) {
            return { signature: variableSignature };
          }
          if (this.onIstanbulCoverageVariable) {
            this.onIstanbulCoverageVariable(ast.object.object.name);
            return {
              signature: variableSignature
            };
          }
          case 'value.value[][]': // istanbul coverage
            if (this.removeIstanbulCoverage) {
              return { signature: variableSignature };
            }
            if (this.onIstanbulCoverageVariable) {
              this.onIstanbulCoverageVariable(ast.object.object.object.name);
              return {
                signature: variableSignature
              };
            }
            default:
              throw this.astErrorOutput('Unexpected expression', ast);
    }
  }

  findIdentifierOrigin(astToFind) {
    const stack = [this.ast];

    while (stack.length > 0) {
      const atNode = stack[0];
      if (atNode.type === 'VariableDeclarator' && atNode.id && atNode.id.name && atNode.id.name === astToFind.name) {
        return atNode;
      }
      stack.shift();
      if (atNode.argument) {
        stack.push(atNode.argument);
      } else if (atNode.body) {
        stack.push(atNode.body);
      } else if (atNode.declarations) {
        stack.push(atNode.declarations);
      } else if (Array.isArray(atNode)) {
        for (let i = 0; i < atNode.length; i++) {
          stack.push(atNode[i]);
        }
      }
    }
    return null;
  }

  findLastReturn(ast) {
    const stack = [ast || this.ast];

    while (stack.length > 0) {
      const atNode = stack.pop();
      if (atNode.type === 'ReturnStatement') {
        return atNode;
      }
      if (atNode.type === 'FunctionDeclaration') {
        continue;
      }
      if (atNode.argument) {
        stack.push(atNode.argument);
      } else if (atNode.body) {
        stack.push(atNode.body);
      } else if (atNode.declarations) {
        stack.push(atNode.declarations);
      } else if (Array.isArray(atNode)) {
        for (let i = 0; i < atNode.length; i++) {
          stack.push(atNode[i]);
        }
      } else if (atNode.consequent) {
        stack.push(atNode.consequent);
      } else if (atNode.cases) {
        stack.push(atNode.cases);
      }
    }
    return null;
  }

  getInternalVariableName(name) {
    if (!this._internalVariableNames.hasOwnProperty(name)) {
      this._internalVariableNames[name] = 0;
    }
    this._internalVariableNames[name]++;
    if (this._internalVariableNames[name] === 1) {
      return name;
    }
    return name + this._internalVariableNames[name];
  }

  varWarn() {
    console.warn('var declarations are deprecated, weird things happen when falling back to CPU because var scope differs in javascript than in most languages.  Use const or let');
  }

  astKey(ast, separator = ',') {
    if (!ast.start || !ast.end) throw new Error('AST start and end needed');
    return `${ast.start}${separator}${ast.end}`;
  }
}

const typeLookupMap = {
  'Number': 'Number',
  'Float': 'Float',
  'Integer': 'Integer',
  'Array': 'Number',
  'Array(2)': 'Number',
  'Array(3)': 'Number',
  'Array(4)': 'Number',
  'Array2D': 'Number',
  'Array3D': 'Number',
  'Input': 'Number',
  'HTMLImage': 'Array(4)',
  'HTMLVideo': 'Array(4)',
  'HTMLImageArray': 'Array(4)',
  'NumberTexture': 'Number',
  'MemoryOptimizedNumberTexture': 'Number',
  'Array1D(2)': 'Array(2)',
  'Array1D(3)': 'Array(3)',
  'Array1D(4)': 'Array(4)',
  'Array2D(2)': 'Array(2)',
  'Array2D(3)': 'Array(3)',
  'Array2D(4)': 'Array(4)',
  'Array3D(2)': 'Array(2)',
  'Array3D(3)': 'Array(3)',
  'Array3D(4)': 'Array(4)',
  'ArrayTexture(1)': 'Number',
  'ArrayTexture(2)': 'Array(2)',
  'ArrayTexture(3)': 'Array(3)',
  'ArrayTexture(4)': 'Array(4)',
};

module.exports = {
  FunctionNode
};