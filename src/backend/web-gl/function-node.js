const { utils } = require('../../utils');
const { FunctionNode } = require('../function-node');

/**
 * @desc [INTERNAL] Takes in a function node, and does all the AST voodoo required to toString its respective WebGL code
 */
// An integer compared with a real number rounds the bound instead of the
// integer, which is exact and keeps the integer bare -- see the comparison
// branch of astBinaryExpression.
const INTEGER_COMPARISON_ROUNDING = {
  '<': 'ceil',
  '>=': 'ceil',
  '>': 'floor',
  '<=': 'floor',
};

class WebGLFunctionNode extends FunctionNode {
  constructor(source, settings) {
    super(source, settings);
    if (settings && settings.hasOwnProperty('fixIntegerDivisionAccuracy')) {
      this.fixIntegerDivisionAccuracy = settings.fixIntegerDivisionAccuracy;
    }
  }

  astConditionalExpression(ast, retArr) {
    if (ast.type !== 'ConditionalExpression') {
      throw this.astErrorOutput('Not a conditional expression', ast);
    }
    const consequentType = this.getType(ast.consequent);
    const alternateType = this.getType(ast.alternate);
    // minification handling if void
    if (consequentType === null && alternateType === null) {
      retArr.push('if (');
      this.astGeneric(ast.test, retArr);
      retArr.push(') {');
      this.astGeneric(ast.consequent, retArr);
      retArr.push(';');
      retArr.push('} else {');
      this.astGeneric(ast.alternate, retArr);
      retArr.push(';');
      retArr.push('}');
      return retArr;
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
   * @desc Parses the abstract syntax tree for to its *named function*
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astFunction(ast, retArr) {
    // Setup function return type and name
    if (this.isRootKernel) {
      retArr.push('void');
    } else {
      // looking up return type, this is a little expensive, and can be avoided if returnType is set
      if (!this.returnType) {
        const lastReturn = this.findLastReturn();
        if (lastReturn) {
          this.returnType = this.getType(ast.body);
          if (this.returnType === 'LiteralInteger') {
            this.returnType = 'Number';
          }
        }
      }

      const { returnType } = this;
      if (!returnType) {
        retArr.push('void');
      } else {
        const type = typeMap[returnType];
        if (!type) {
          throw new Error(`unknown type ${returnType}`);
        }
        retArr.push(type);
      }
    }
    retArr.push(' ');
    retArr.push(this.name);
    retArr.push('(');

    if (!this.isRootKernel) {
      // Arguments handling
      for (let i = 0; i < this.argumentNames.length; ++i) {
        const argumentName = this.argumentNames[i];

        if (i > 0) {
          retArr.push(', ');
        }
        let argumentType = this.argumentTypes[this.argumentNames.indexOf(argumentName)];
        // The type is too loose ended, here we decide to solidify a type, lets go with float
        if (!argumentType) {
          throw this.astErrorOutput(`Unknown argument ${argumentName} type`, ast);
        }
        if (argumentType === 'LiteralInteger') {
          this.argumentTypes[i] = argumentType = 'Number';
        }
        const type = typeMap[argumentType];
        if (!type) {
          throw this.astErrorOutput('Unexpected expression', ast);
        }
        const name = utils.sanitizeName(argumentName);
        if (type === 'sampler2D' || type === 'sampler2DArray') {
          // mash needed arguments together, since now we have end to end inference
          retArr.push(`${type} user_${name},ivec2 user_${name}Size,ivec3 user_${name}Dim`);
        } else {
          retArr.push(`${type} user_${name}`);
        }
      }
    }

    // Function opening
    retArr.push(') {\n');

    if (this.isRootKernel) {
      // Scalar arguments are uniforms, and GLSL rejects assignment to a
      // uniform outright. Assigned scalar arguments get a per-invocation
      // shadow local instead, mirroring the cpu backend's `user_X$cell`
      // shadows (#867). The `cellShadow_` namespace cannot collide: every
      // user identifier emits with a `user_` prefix.
      const assignedArguments = this.getAssignedArguments();
      for (let i = 0; i < this.argumentNames.length; ++i) {
        const argumentName = this.argumentNames[i];
        if (!assignedArguments.has(argumentName)) continue;
        const type = typeMap[this.argumentTypes[i]];
        if (type !== 'float' && type !== 'int' && type !== 'bool') continue;
        const name = utils.sanitizeName(argumentName);
        retArr.push(`${type} cellShadow_user_${name}=user_${name};\n`);
      }
    }

    // Body statement iteration
    for (let i = 0; i < ast.body.body.length; ++i) {
      this.astStatementWithHoisting(ast.body.body[i], retArr);
      retArr.push('\n');
    }

    // Function closing
    retArr.push('}\n');
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for to *return* statement
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astReturnStatement(ast, retArr) {
    if (!ast.argument) throw this.astErrorOutput('Unexpected return statement', ast);
    this.pushState('skip-literal-correction');
    const type = this.getType(ast.argument);
    this.popState('skip-literal-correction');

    const result = [];

    if (!this.returnType) {
      if (type === 'LiteralInteger' || type === 'Integer') {
        this.returnType = 'Number';
      } else {
        this.returnType = type;
      }
    }

    switch (this.returnType) {
      case 'LiteralInteger':
      case 'Number':
      case 'Float':
        switch (type) {
          case 'Integer':
            result.push('float(');
            this.astGeneric(ast.argument, result);
            result.push(')');
            break;
          case 'LiteralInteger':
            this.castLiteralToFloat(ast.argument, result);

            // Running astGeneric forces the LiteralInteger to pick a type, and here, if we are returning a float, yet
            // the LiteralInteger has picked to be an integer because of constraints on it we cast it to float.
            if (this.getType(ast) === 'Integer') {
              result.unshift('float(');
              result.push(')');
            }
            break;
          default:
            this.astGeneric(ast.argument, result);
        }
        break;
      case 'Integer':
        switch (type) {
          case 'Float':
          case 'Number':
            this.castValueToInteger(ast.argument, result);
            break;
          case 'LiteralInteger':
            this.castLiteralToInteger(ast.argument, result);
            break;
          default:
            this.astGeneric(ast.argument, result);
        }
        break;
      case 'Array(4)':
      case 'Array(3)':
      case 'Array(2)':
      case 'Matrix(2)':
      case 'Matrix(3)':
      case 'Matrix(4)':
      case 'Input':
        this.astGeneric(ast.argument, result);
        break;
      default:
        throw this.astErrorOutput(`unhandled return type ${this.returnType}`, ast);
    }

    if (this.isRootKernel) {
      retArr.push(`kernelResult = ${ result.join('') };`);
      retArr.push('return;');
    } else if (this.isSubKernel) {
      retArr.push(`subKernelResult_${ this.name } = ${ result.join('') };`);
      retArr.push(`return subKernelResult_${ this.name };`);
    } else {
      retArr.push(`return ${ result.join('') };`);
    }
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *literal value*
   *
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the append retArr
   */
  astLiteral(ast, retArr) {
    // Reject non numeric literals
    if (isNaN(ast.value)) {
      throw this.astErrorOutput(
        'Non-numeric literal not supported : ' + ast.value,
        ast
      );
    }

    const key = this.astKey(ast);
    if (Number.isInteger(ast.value)) {
      if (this.isState('casting-to-integer') || this.isState('building-integer')) {
        this.literalTypes[key] = 'Integer';
        retArr.push(`${ast.value}`);
      } else if (this.isState('casting-to-float') || this.isState('building-float')) {
        this.literalTypes[key] = 'Number';
        retArr.push(utils.glslFloatLiteral(ast.value));
      } else {
        this.literalTypes[key] = 'Number';
        retArr.push(utils.glslFloatLiteral(ast.value));
      }
    } else if (this.isState('casting-to-integer') || this.isState('building-integer')) {
      this.literalTypes[key] = 'Integer';
      retArr.push(Math.round(ast.value));
    } else {
      this.literalTypes[key] = 'Number';
      retArr.push(`${ast.value}`);
    }
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *binary* expression
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astBinaryExpression(ast, retArr) {
    if (this.checkAndUpconvertOperator(ast, retArr)) {
      return retArr;
    }

    // `/` is always fractional in JavaScript, so both operands go to float
    // whatever their own types are — otherwise GLSL emits an integer divide and
    // truncates, and `this.thread.x / 64` comes out 0. Only the accuracy
    // wrapper is conditional; the casting is not.
    if (ast.operator === '/') {
      const wrap = this.fixIntegerDivisionAccuracy;
      retArr.push(wrap ? 'divWithIntCheck(' : '(');
      this.pushState('building-float');
      switch (this.getType(ast.left)) {
        case 'Integer':
          this.castValueToFloat(ast.left, retArr);
          break;
        case 'LiteralInteger':
          this.castLiteralToFloat(ast.left, retArr);
          break;
        default:
          this.astGeneric(ast.left, retArr);
      }
      retArr.push(wrap ? ', ' : '/');
      switch (this.getType(ast.right)) {
        case 'Integer':
          this.castValueToFloat(ast.right, retArr);
          break;
        case 'LiteralInteger':
          this.castLiteralToFloat(ast.right, retArr);
          break;
        default:
          this.astGeneric(ast.right, retArr);
      }
      this.popState('building-float');
      retArr.push(')');
      return retArr;
    }

    retArr.push('(');
    const leftType = this.getType(ast.left) || 'Number';
    const rightType = this.getType(ast.right) || 'Number';
    if (!leftType || !rightType) {
      throw this.astErrorOutput(`Unhandled binary expression`, ast);
    }
    const key = leftType + ' & ' + rightType;
    switch (key) {
      case 'Integer & Integer':
        this.pushState('building-integer');
        this.astGeneric(ast.left, retArr);
        retArr.push(operatorMap[ast.operator] || ast.operator);
        this.astGeneric(ast.right, retArr);
        this.popState('building-integer');
        break;
      case 'Number & Float':
      case 'Float & Number':
      case 'Float & Float':
      case 'Number & Number':
        this.pushState('building-float');
        this.astGeneric(ast.left, retArr);
        retArr.push(operatorMap[ast.operator] || ast.operator);
        this.astGeneric(ast.right, retArr);
        this.popState('building-float');
        break;
      case 'LiteralInteger & LiteralInteger':
        if (this.isState('casting-to-integer') || this.isState('building-integer')) {
          this.pushState('building-integer');
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.astGeneric(ast.right, retArr);
          this.popState('building-integer');
        } else {
          this.pushState('building-float');
          this.castLiteralToFloat(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.castLiteralToFloat(ast.right, retArr);
          this.popState('building-float');
        }
        break;

      case 'Integer & Float':
      case 'Integer & Number': {
        // Comparisons keep the integer bare on the left. GLSL ES 1.00 accepts
        // only `index op bound` as a for condition (Appendix A), so promoting
        // the index to float there is a compile error -- which is why this
        // used to cast the bound down to int, silently truncating it. Rounding
        // the bound the other way is exact for an integer left side:
        // `i < f` is `i < ceil(f)`, `i <= f` is `i <= floor(f)`, and so on.
        const roundToward = INTEGER_COMPARISON_ROUNDING[ast.operator];
        if (roundToward) {
          this.pushState('building-integer');
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          if (ast.right.type === 'Literal' && typeof ast.right.value === 'number') {
            retArr.push(`${ Math[roundToward](ast.right.value) }`);
          } else {
            retArr.push(`int(${ roundToward }(`);
            this.pushState('building-float');
            this.astGeneric(ast.right, retArr);
            this.popState('building-float');
            retArr.push('))');
          }
          this.popState('building-integer');
          break;
        }
        // Arithmetic promotes the way JavaScript does: an integer combined
        // with a fractional value is fractional, whichever side it is on.
        // Casting the fractional operand down to an integer instead rounded
        // it away -- `x * 0.5` emitted `x * 1` and disagreed with `0.5 * x`.
        this.pushState('building-float');
        this.castValueToFloat(ast.left, retArr);
        retArr.push(operatorMap[ast.operator] || ast.operator);
        this.astGeneric(ast.right, retArr);
        this.popState('building-float');
        break;
      }
      case 'Integer & LiteralInteger':
        this.pushState('building-integer');
        this.astGeneric(ast.left, retArr);
        retArr.push(operatorMap[ast.operator] || ast.operator);
        this.castLiteralToInteger(ast.right, retArr);
        this.popState('building-integer');
        break;

      case 'Number & Integer':
        this.pushState('building-float');
        this.astGeneric(ast.left, retArr);
        retArr.push(operatorMap[ast.operator] || ast.operator);
        this.castValueToFloat(ast.right, retArr);
        this.popState('building-float');
        break;
      case 'Float & LiteralInteger':
      case 'Number & LiteralInteger':
        this.pushState('building-float');
        this.astGeneric(ast.left, retArr);
        retArr.push(operatorMap[ast.operator] || ast.operator);
        this.castLiteralToFloat(ast.right, retArr);
        this.popState('building-float');
        break;
      case 'LiteralInteger & Float':
      case 'LiteralInteger & Number':
        if (this.isState('casting-to-integer')) {
          this.pushState('building-integer');
          this.castLiteralToInteger(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.castValueToInteger(ast.right, retArr);
          this.popState('building-integer');
        } else {
          this.pushState('building-float');
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.pushState('casting-to-float');
          this.astGeneric(ast.right, retArr);
          this.popState('casting-to-float');
          this.popState('building-float');
        }
        break;
      case 'LiteralInteger & Integer':
        this.pushState('building-integer');
        this.castLiteralToInteger(ast.left, retArr);
        retArr.push(operatorMap[ast.operator] || ast.operator);
        this.astGeneric(ast.right, retArr);
        this.popState('building-integer');
        break;

      case 'Boolean & Boolean':
        this.pushState('building-boolean');
        this.astGeneric(ast.left, retArr);
        retArr.push(operatorMap[ast.operator] || ast.operator);
        this.astGeneric(ast.right, retArr);
        this.popState('building-boolean');
        break;

      case 'Float & Integer':
        this.pushState('building-float');
        this.astGeneric(ast.left, retArr);
        retArr.push(operatorMap[ast.operator] || ast.operator);
        this.castValueToFloat(ast.right, retArr);
        this.popState('building-float');
        break;

      default:
        throw this.astErrorOutput(`Unhandled binary expression between ${key}`, ast);
    }
    retArr.push(')');

    return retArr;
  }

  checkAndUpconvertOperator(ast, retArr) {
    const bitwiseResult = this.checkAndUpconvertBitwiseOperators(ast, retArr);
    if (bitwiseResult) {
      return bitwiseResult;
    }
    const upconvertableOperators = {
      '%': this.fixIntegerDivisionAccuracy ? 'integerCorrectionModulo' : 'modulo',
      '**': 'pow',
    };
    const foundOperator = upconvertableOperators[ast.operator];
    if (!foundOperator) return null;
    retArr.push(foundOperator);
    retArr.push('(');
    switch (this.getType(ast.left)) {
      case 'Integer':
        this.castValueToFloat(ast.left, retArr);
        break;
      case 'LiteralInteger':
        this.castLiteralToFloat(ast.left, retArr);
        break;
      default:
        this.astGeneric(ast.left, retArr);
    }
    retArr.push(',');
    switch (this.getType(ast.right)) {
      case 'Integer':
        this.castValueToFloat(ast.right, retArr);
        break;
      case 'LiteralInteger':
        this.castLiteralToFloat(ast.right, retArr);
        break;
      default:
        this.astGeneric(ast.right, retArr);
    }
    retArr.push(')');
    return retArr;
  }

  checkAndUpconvertBitwiseOperators(ast, retArr) {
    const upconvertableOperators = {
      '&': 'bitwiseAnd',
      '|': 'bitwiseOr',
      '^': 'bitwiseXOR',
      '<<': 'bitwiseZeroFillLeftShift',
      '>>': 'bitwiseSignedRightShift',
      '>>>': 'bitwiseZeroFillRightShift',
    };
    const foundOperator = upconvertableOperators[ast.operator];
    if (!foundOperator) return null;
    retArr.push(foundOperator);
    retArr.push('(');
    const leftType = this.getType(ast.left);
    switch (leftType) {
      case 'Number':
      case 'Float':
        this.castValueToInteger(ast.left, retArr);
        break;
      case 'LiteralInteger':
        this.castLiteralToInteger(ast.left, retArr);
        break;
      default:
        this.astGeneric(ast.left, retArr);
    }
    retArr.push(',');
    const rightType = this.getType(ast.right);
    switch (rightType) {
      case 'Number':
      case 'Float':
        this.castValueToInteger(ast.right, retArr);
        break;
      case 'LiteralInteger':
        this.castLiteralToInteger(ast.right, retArr);
        break;
      default:
        this.astGeneric(ast.right, retArr);
    }
    retArr.push(')');
    return retArr;
  }

  checkAndUpconvertBitwiseUnary(ast, retArr) {
    const upconvertableOperators = {
      '~': 'bitwiseNot',
    };
    const foundOperator = upconvertableOperators[ast.operator];
    if (!foundOperator) return null;
    retArr.push(foundOperator);
    retArr.push('(');
    switch (this.getType(ast.argument)) {
      case 'Number':
      case 'Float':
        this.castValueToInteger(ast.argument, retArr);
        break;
      case 'LiteralInteger':
        this.castLiteralToInteger(ast.argument, retArr);
        break;
      default:
        this.astGeneric(ast.argument, retArr);
    }
    retArr.push(')');
    return retArr;
  }

  /**
   *
   * @param {Object} ast
   * @param {Array} retArr
   * @return {String[]}
   */
  castLiteralToInteger(ast, retArr) {
    this.pushState('casting-to-integer');
    this.astGeneric(ast, retArr);
    this.popState('casting-to-integer');
    return retArr;
  }

  /**
   *
   * @param {Object} ast
   * @param {Array} retArr
   * @return {String[]}
   */
  castLiteralToFloat(ast, retArr) {
    this.pushState('casting-to-float');
    this.astGeneric(ast, retArr);
    this.popState('casting-to-float');
    return retArr;
  }

  /**
   *
   * @param {Object} ast
   * @param {Array} retArr
   * @return {String[]}
   */
  castValueToInteger(ast, retArr) {
    this.pushState('casting-to-integer');
    retArr.push('int(');
    this.astGeneric(ast, retArr);
    retArr.push(')');
    this.popState('casting-to-integer');
    return retArr;
  }

  /**
   *
   * @param {Object} ast
   * @param {Array} retArr
   * @return {String[]}
   */
  castValueToFloat(ast, retArr) {
    this.pushState('casting-to-float');
    retArr.push('float(');
    this.astGeneric(ast, retArr);
    retArr.push(')');
    this.popState('casting-to-float');
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *identifier* expression
   * @param {Object} idtNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astIdentifierExpression(idtNode, retArr) {
    if (idtNode.type !== 'Identifier') {
      throw this.astErrorOutput('IdentifierExpression - not an Identifier', idtNode);
    }

    const type = this.getType(idtNode);

    const name = utils.sanitizeName(idtNode.name);
    if (idtNode.name === 'Infinity') {
      // https://stackoverflow.com/a/47543127/1324039
      retArr.push('3.402823466e+38');
    } else if (type === 'Boolean') {
      if (this.argumentNames.indexOf(name) > -1) {
        const marked = this.markupUserName(idtNode.name);
        // a shadow local is declared bool already; wrapping it would also
        // break assignment targets (`bool(x) = ...` is not an lvalue)
        retArr.push(marked.startsWith('cellShadow_') ? marked : `bool(${marked})`);
      } else {
        retArr.push(`user_${name}`);
      }
    } else {
      retArr.push(this.markupUserName(idtNode.name));
    }

    return retArr;
  }

  /**
   * @desc Emitted name for a user identifier. Assigned scalar arguments in
   * the root kernel route through their per-invocation `cellShadow_` local
   * (declared in astFunction) because the argument itself is an unassignable
   * uniform (#867).
   */
  markupUserName(name) {
    const sanitized = utils.sanitizeName(name);
    if (this.isRootKernel && this.getAssignedArguments().has(name)) {
      const index = this.argumentNames.indexOf(name);
      const type = index === -1 ? null : typeMap[this.argumentTypes[index]];
      if (type === 'float' || type === 'int' || type === 'bool') {
        return `cellShadow_user_${sanitized}`;
      }
    }
    return `user_${sanitized}`;
  }

  /**
   * @desc Parses the abstract syntax tree for *for-loop* expression
   * @param {Object} forNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the parsed webgl string
   */
  astForStatement(forNode, retArr) {
    if (forNode.type !== 'ForStatement') {
      throw this.astErrorOutput('Invalid for statement', forNode);
    }

    const initArr = [];
    const testArr = [];
    const updateArr = [];
    const bodyArr = [];
    let isSafe = null;

    if (forNode.init) {
      if (forNode.init.type !== 'VariableDeclaration') {
        // an expression init -- `for (i = 0, j = 1; ...)` -- cannot sit in
        // WebGL1's canonical loop header; it hoists in front of the
        // safe-wrapped form below, exactly where a declaration init lands
        // when the loop is otherwise unsafe (#860)
        isSafe = false;
        this.astGeneric(forNode.init, initArr);
        initArr.push(';');
      } else {
        const { declarations } = forNode.init;
        if (declarations.length > 1) {
          isSafe = false;
        }
        this.astGeneric(forNode.init, initArr);
        for (let i = 0; i < declarations.length; i++) {
          if (declarations[i].init && declarations[i].init.type !== 'Literal') {
            isSafe = false;
          }
        }
        // a loop index assigned outside the header (an inner loop reusing
        // the counter, a body assignment) is legal JavaScript but violates
        // WebGL1's canonical-loop grammar; the hoisted safe-wrapped form
        // below runs it with JavaScript's exact semantics (#860)
        if (isSafe !== false && this.loopIndexAssignedInLoop(forNode, declarations)) {
          isSafe = false;
        }
      }
    } else {
      isSafe = false;
    }

    if (forNode.test) {
      this.astGeneric(forNode.test, testArr);
    } else {
      isSafe = false;
    }

    if (forNode.update) {
      if (forNode.update.type === 'AssignmentExpression') {
        this.pushState('assignment-as-statement');
      }
      this.astGeneric(forNode.update, updateArr);
    } else {
      isSafe = false;
    }

    if (forNode.body) {
      this.pushState('loop-body');
      this.astGeneric(forNode.body, bodyArr);
      this.popState('loop-body');
    }

    // have all parts, now make them safe
    if (isSafe === null) {
      isSafe = this.isSafe(forNode.init) && this.isSafe(forNode.test);
    }

    return this.emitForParts({ initArr, testArr, updateArr, bodyArr, isSafe }, retArr);
  }

  /**
   * @desc Whether any variable the for-init declares is assigned or updated
   * inside the loop's own test or body — beyond the header slots the
   * canonical form owns. Resolution goes through the tracer's declaration
   * records, so an inner loop declaring its OWN variable of the same name
   * does not count against the outer loop.
   */
  loopIndexAssignedInLoop(forNode, declarations) {
    const targets = new Set();
    const targetNames = new Set();
    for (let i = 0; i < declarations.length; i++) {
      if (declarations[i].id && declarations[i].id.type === 'Identifier') {
        targetNames.add(declarations[i].id.name);
        const record = this.getDeclaration(declarations[i].id);
        if (record) targets.add(record);
      }
    }
    if (targets.size === 0) return false;
    let found = false;
    const hits = node => {
      const record = this.getDeclaration(node);
      return record !== null && targets.has(record);
    };
    const walk = node => {
      if (!node || typeof node !== 'object' || found) return;
      if (Array.isArray(node)) {
        for (const child of node) walk(child);
        return;
      }
      // a nested for whose init DECLARES a matching name owns that name for
      // its whole subtree (JavaScript's let scoping); the tracer's records
      // blur exactly this case, so the shadow is honored by name
      if (node.type === 'ForStatement' && node.init && node.init.type === 'VariableDeclaration' &&
        node.init.declarations.some(d => d.id && d.id.type === 'Identifier' && targetNames.has(d.id.name))) {
        return;
      }
      if (node.type === 'AssignmentExpression' && node.left.type === 'Identifier' && hits(node.left)) {
        found = true;
        return;
      }
      if (node.type === 'UpdateExpression' && node.argument.type === 'Identifier' && hits(node.argument)) {
        found = true;
        return;
      }
      for (const key in node) {
        if (key === 'loc' || key === 'range' || key === 'parent') continue;
        const child = node[key];
        if (child && typeof child === 'object') walk(child);
      }
    };
    walk(forNode.body);
    if (!found && forNode.test) walk(forNode.test);
    return found;
  }

  emitForParts(parts, retArr) {
    const { initArr, testArr, updateArr, bodyArr, isSafe } = parts;

    if (isSafe) {
      const initString = initArr.join('');
      const initNeedsSemiColon = initString[initString.length - 1] !== ';';
      retArr.push(`for (${initString}${initNeedsSemiColon ? ';' : ''}${testArr.join('')};${updateArr.join('')}){\n`);
      retArr.push(bodyArr.join(''));
      retArr.push('}\n');
    } else {
      const iVariableName = this.getInternalVariableName('safeI');
      if (initArr.length > 0) {
        retArr.push(initArr.join(''), '\n');
      }
      retArr.push(`for (int ${iVariableName}=0;${iVariableName}<LOOP_MAX;${iVariableName}++){\n`);
      if (testArr.length > 0) {
        retArr.push(`if (!${testArr.join('')}) break;\n`);
      }
      retArr.push(bodyArr.join(''));
      retArr.push(`\n${updateArr.join('')};`);
      retArr.push('}\n');
    }
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *while* loop
   * @param {Object} whileNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the parsed webgl string
   */
  astWhileStatement(whileNode, retArr) {
    if (whileNode.type !== 'WhileStatement') {
      throw this.astErrorOutput('Invalid while statement', whileNode);
    }

    const iVariableName = this.getInternalVariableName('safeI');
    retArr.push(`for (int ${iVariableName}=0;${iVariableName}<LOOP_MAX;${iVariableName}++){\n`);
    retArr.push('if (!');
    this.astGeneric(whileNode.test, retArr);
    retArr.push(') break;\n');
    this.astGeneric(whileNode.body, retArr);
    retArr.push('}\n');

    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *do while* loop
   * @param {Object} doWhileNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the parsed webgl string
   */
  /**
   * @desc Parses the abstract syntax tree for *do while* loop. GLSL ES 1.00
   * has no do-while, so the loop is rotated into a for: the exit test sits
   * at the TOP, guarded to skip the first iteration. A `continue` in the
   * body then lands on the test naturally — JavaScript's exact do-while
   * continue semantics (#867) — with no body rewriting, so it holds inside
   * switch lowerings and unbraced bodies alike, and the test is evaluated
   * exactly once per iteration boundary.
   * @param {Object} doWhileNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the parsed webgl string
   */
  astDoWhileStatement(doWhileNode, retArr) {
    if (doWhileNode.type !== 'DoWhileStatement') {
      throw this.astErrorOutput('Invalid while statement', doWhileNode);
    }

    const iVariableName = this.getInternalVariableName('safeI');
    retArr.push(`for (int ${iVariableName}=0;${iVariableName}<LOOP_MAX;${iVariableName}++){\n`);
    retArr.push(`if (${iVariableName}>0){if (!`);
    this.astGeneric(doWhileNode.test, retArr);
    retArr.push(') break;}\n');
    this.astGeneric(doWhileNode.body, retArr);
    retArr.push('}\n');

    return retArr;
  }


  /**
   * @desc Parses the abstract syntax tree for *Assignment* Expression
   * @param {Object} assNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astAssignmentExpression(assNode, retArr) {
    // As a statement (or a for-update) the assignment stands alone; as a
    // subexpression it must be parenthesized, or `(i += 1) * 0.0` re-parses
    // as `i += (1.0 * 0.0)` (#854). The marker is consumed here so that a
    // nested assignment inside this one's right side still gets parens.
    const isStatement = this.isState('assignment-as-statement');
    if (isStatement) {
      this.popState('assignment-as-statement');
    } else {
      retArr.push('(');
    }
    // TODO: casting needs implemented here
    if (assNode.operator === '%=') {
      this.astGeneric(assNode.left, retArr);
      retArr.push('=');
      retArr.push('mod(');
      this.astGeneric(assNode.left, retArr);
      retArr.push(',');
      this.astGeneric(assNode.right, retArr);
      retArr.push(')');
    } else if (assNode.operator === '**=') {
      this.astGeneric(assNode.left, retArr);
      retArr.push('=');
      retArr.push('pow(');
      this.astGeneric(assNode.left, retArr);
      retArr.push(',');
      this.astGeneric(assNode.right, retArr);
      retArr.push(')');
    } else {
      const leftType = this.getType(assNode.left);
      const rightType = this.getType(assNode.right);
      this.astGeneric(assNode.left, retArr);
      retArr.push(assNode.operator);
      if (leftType !== 'Integer' && rightType === 'Integer') {
        retArr.push('float(');
        this.astGeneric(assNode.right, retArr);
        retArr.push(')');
      } else if (leftType === 'Integer' && rightType === 'LiteralInteger') {
        // an int lvalue (an Integer argument's shadow local) with a literal
        // right side: the literal must print as int, GLSL has no implicit
        // float conversion
        this.castLiteralToInteger(assNode.right, retArr);
      } else {
        this.astGeneric(assNode.right, retArr);
      }
    }
    if (!isStatement) {
      retArr.push(')');
    }
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *Block* statement
   * @param {Object} bNode - the AST object to parse
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astBlockStatement(bNode, retArr) {
    if (this.isState('loop-body')) {
      this.pushState('block-body'); // this prevents recursive removal of braces
      for (let i = 0; i < bNode.body.length; i++) {
        this.astStatementWithHoisting(bNode.body[i], retArr);
      }
      this.popState('block-body');
    } else {
      retArr.push('{\n');
      for (let i = 0; i < bNode.body.length; i++) {
        this.astStatementWithHoisting(bNode.body[i], retArr);
      }
      retArr.push('}\n');
    }
    return retArr;
  }

  /**
   * @desc Emits one statement, flushing any indices that had to be hoisted out
   * of it first. A texture read nested inside another texture read's argument
   * list -- lookup[input[this.thread.x]] -- miscompiles on ANGLE's D3D11
   * translation (#300): HLSL cannot pass samplers as function parameters, so
   * ANGLE rewrites sampler-taking functions, and the nested call defeats the
   * rewrite. Assigning the inner read to a variable first is exactly the shape
   * that works everywhere, so that is the shape we generate.
   *
   * Only simple statements buffer. Control flow (for, if, while) is left
   * alone: hoisting out of a loop condition would evaluate a per-iteration
   * read once, and their block bodies come back through here anyway, where
   * each inner statement gets its own buffering at the right scope.
   * @param {Object} ast - the statement node
   * @param {Array} retArr - return array string
   */

  /**
   * @desc Rewrites one statement into several so that its side effects and its
   * texture-read indices each live in a statement of their own, in the
   * original evaluation order. This is what makes the FXC hoist (see
   * astStatementWithHoisting) applicable to statements that mix the nested
   * read pattern with i++, comma sequences, inner assignments, or guards
   * containing them -- the same normalization ANGLE performs with
   * SimplifyLoopConditions, SplitSequenceOperator and UnfoldShortCircuitToIf
   * before its own version of the hoist.
   *
   * The kernel language makes this tractable: function calls cannot mutate
   * anything, logical operators are boolean, and the only side effects are
   * update and assignment expressions.
   * @param {Object} statement - the statement node
   * @returns {Array|null} replacement statements, or null to leave the
   * statement exactly as written
   */
  /**
   * @desc Normalizes the function AST before tracing: every statement that
   * mixes the nested-index-read pattern with side effects is linearized into
   * several clean statements (see linearizeStatement), so the FXC hoist in
   * astStatementWithHoisting applies to them. Runs before FunctionTracer so
   * the rewritten declarations are the ones the tracer registers.
   * @param {Object} ast - the parsed function node
   */
  traceFunctionAST(ast) {
    this.normalizeBlock(ast.body);
    super.traceFunctionAST(ast);
  }

  /**
   * @param {Object} block - a BlockStatement whose body may be rewritten
   */
  normalizeBlock(block) {
    if (!block || block.type !== 'BlockStatement') return;
    const body = block.body;
    for (let i = 0; i < body.length; i++) {
      const statement = body[i];
      switch (statement.type) {
        case 'ExpressionStatement':
        case 'VariableDeclaration':
        case 'ReturnStatement': {
          if (
            (!statementIsSideEffectFreeBesidesTopLevelAssignment(statement) &&
              statementContainsNestedIndexRead(statement)) ||
            containsNestedSameFunctionCall(statement)
          ) {
            const linearized = this.linearizeStatement(statement);
            if (linearized !== null) {
              body.splice(i, 1, ...linearized);
              i += linearized.length - 1;
            }
          }
          break;
        }
        case 'IfStatement': {
          // An if's condition evaluates exactly when the statement runs, so
          // lifting it into a declaration just before the if is
          // timing-identical -- and turns a condition containing the pattern
          // into a plain statement the hoist covers. Conditions were never
          // hoisted before, so this also closes the pure-read case.
          if (statementContainsNestedIndexRead(statement.test) || containsNestedSameFunctionCall(statement.test)) {
            const wrapper = {
              type: 'VariableDeclaration',
              kind: 'const',
              declarations: [{
                type: 'VariableDeclarator',
                id: { type: 'Identifier', name: `hoistSeqIf${this.linearTempId = (this.linearTempId || 0) + 1}` },
                init: statement.test,
              }],
            };
            const linearized = this.linearizeStatement(wrapper);
            if (linearized !== null) {
              const name = wrapper.declarations[0].id.name;
              const reference = { type: 'Identifier', name, start: this.syntheticNodeId, end: this.syntheticNodeId + 1 };
              this.syntheticNodeId += 2;
              statement.test = reference;
              body.splice(i, 0, ...linearized);
              i += linearized.length;
            }
          }
          this.normalizeBranch(statement, 'consequent');
          this.normalizeBranch(statement, 'alternate');
          break;
        }
        case 'ForStatement':
        case 'WhileStatement':
        case 'DoWhileStatement': {
          const rewritten = this.normalizeLoopHeader(statement);
          if (rewritten !== null) {
            body.splice(i, 1, rewritten);
            this.normalizeBlock(rewritten);
            i--;
            break;
          }
          this.normalizeBranch(statement, 'body');
          break;
        }
        case 'SwitchStatement': {
          // a discriminant evaluates exactly when the statement runs, like an
          // if condition, so the same lift applies
          if (statementContainsNestedIndexRead(statement.discriminant)) {
            const wrapper = {
              type: 'VariableDeclaration',
              kind: 'const',
              declarations: [{
                type: 'VariableDeclarator',
                id: { type: 'Identifier', name: `hoistSeqIf${this.linearTempId = (this.linearTempId || 0) + 1}` },
                init: statement.discriminant,
              }],
            };
            const linearized = this.linearizeStatement(wrapper);
            if (linearized !== null) {
              const name = wrapper.declarations[0].id.name;
              statement.discriminant = { type: 'Identifier', name, start: this.syntheticNodeId, end: this.syntheticNodeId + 1 };
              this.syntheticNodeId += 2;
              body.splice(i, 0, ...linearized);
              i += linearized.length;
            }
          }
          for (let c = 0; c < statement.cases.length; c++) {
            const block = { type: 'BlockStatement', body: statement.cases[c].consequent };
            this.normalizeBlock(block);
            statement.cases[c].consequent = block.body;
          }
          break;
        }
        case 'BlockStatement':
          this.normalizeBlock(statement);
          break;
      }
    }
  }

  /**
   * @param {Object} statement - the owning statement
   * @param {String} key - which branch to normalize, braced first if needed
   */
  normalizeBranch(statement, key) {
    const branch = statement[key];
    if (!branch) return;
    if (branch.type === 'BlockStatement') {
      this.normalizeBlock(branch);
      return;
    }
    // An unbraced branch only gains braces when normalization actually has
    // work inside it -- bracing unconditionally would change the emitted
    // text of every kernel with a bare `if (x) break;`.
    if (!statementContainsNestedIndexRead(branch) && !containsNestedSameFunctionCall(branch)) return;
    statement[key] = { type: 'BlockStatement', body: [branch] };
    this.normalizeBlock(statement[key]);
  }

  /**
   * @desc Rewrites a loop whose header contains the nested-index-read pattern
   * into a while(true)-shaped loop whose condition check, body and update are
   * all plain statements -- the same restructuring ANGLE's
   * SimplifyLoopConditions performs -- so linearization and the FXC hoist
   * apply to them with per-iteration timing intact.
   *
   * `continue` keeps its meaning by rewriting: in a for loop each
   * loop-level continue gains a copy of the update in front of it, exactly
   * the order JavaScript runs them; in a do-while it gains a copy of the
   * condition check, which is where continue jumps to.
   * @param {Object} statement - the loop node
   * @returns {Object|null} a replacement BlockStatement, or null when the
   * header is clean and the loop should be left as written
   */
  normalizeLoopHeader(statement) {
    const { type } = statement;
    const init = type === 'ForStatement' ? statement.init : null;
    const test = statement.test || null;
    const update = type === 'ForStatement' ? statement.update : null;
    const headerHasPattern = [init, test, update].some(
      part =>
      part !== null &&
      (statementContainsNestedIndexRead(part) || containsNestedSameFunctionCall(part))
    );
    if (!headerHasPattern) return null;

    const clone = node => JSON.parse(JSON.stringify(node));
    const breakCheck = testExpression => ({
      type: 'IfStatement',
      test: { type: 'UnaryExpression', operator: '!', prefix: true, argument: testExpression },
      consequent: { type: 'BlockStatement', body: [{ type: 'BreakStatement', label: null }] },
      alternate: null,
    });
    const asStatement = expression =>
      expression.type === 'VariableDeclaration' ? expression : { type: 'ExpressionStatement', expression };

    const bodyStatements =
      statement.body.type === 'BlockStatement' ? statement.body.body.slice() : [statement.body];

    // rewrite this loop's own continues; nested loops keep theirs
    const rewriteContinues = (nodes, makePrefix) => {
      const visit = node => {
        if (!node || typeof node !== 'object') return node;
        if (Array.isArray(node)) return node.map(visit);
        switch (node.type) {
          case 'ContinueStatement':
            return { type: 'BlockStatement', body: [...makePrefix(), node] };
          case 'ForStatement':
          case 'WhileStatement':
          case 'DoWhileStatement':
            return node;
          case 'IfStatement':
            return { ...node, consequent: visit(node.consequent), alternate: visit(node.alternate) };
          case 'BlockStatement':
            return { ...node, body: node.body.map(visit) };
          case 'SwitchStatement':
            return { ...node, cases: node.cases.map(c => ({ ...c, consequent: c.consequent.map(visit) })) };
          default:
            return node;
        }
      };
      return nodes.map(visit);
    };

    const loopBody = [];
    if (type === 'DoWhileStatement') {
      loopBody.push(
        ...(test ? rewriteContinues(bodyStatements, () => [breakCheck(clone(test))]) : bodyStatements)
      );
      if (test) loopBody.push(breakCheck(test));
    } else {
      if (test) loopBody.push(breakCheck(test));
      loopBody.push(
        ...(update ? rewriteContinues(bodyStatements, () => [asStatement(clone(update))]) : bodyStatements)
      );
      if (update) loopBody.push(asStatement(update));
    }

    const replacement = {
      type: 'BlockStatement',
      body: [
        ...(init ? [asStatement(init)] : []),
        {
          type: 'WhileStatement',
          test: { type: 'Literal', value: true, raw: 'true' },
          body: { type: 'BlockStatement', body: loopBody },
        },
      ],
    };

    this.stampSyntheticNodes(replacement);

    return replacement;
  }

  /**
   * @desc Synthetic nodes need the unique positions the type cache expects;
   * cloned nodes keep their original positions and are left alone.
   */
  stampSyntheticNodes(root) {
    let syntheticId = this.syntheticNodeId || 0x40000000;
    const stamp = node => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(stamp);
        return;
      }
      if (typeof node.type === 'string' && node.start === undefined) {
        node.start = syntheticId;
        node.end = syntheticId + 1;
        syntheticId += 2;
      }
      for (const key in node) {
        if (key === 'loc' || key === 'range' || key === 'parent') continue;
        stamp(node[key]);
      }
    };
    stamp(root);
    this.syntheticNodeId = syntheticId;
  }

  linearizeStatement(statement) {
    const statements = [];
    let failed = false;
    let tempId = this.linearTempId || 0;

    const identifier = name => ({ type: 'Identifier', name });
    const declare = (kind, name, init) => ({
      type: 'VariableDeclaration',
      kind,
      declarations: [{ type: 'VariableDeclarator', id: identifier(name), init }],
    });
    const capture = (into, expression) => {
      const name = `hoistSeq${tempId++}`;
      into.push(declare('const', name, expression));
      return identifier(name);
    };

    const hasSideEffects = node => !nodeIsSideEffectFree(node);

    // Rewrites `expression`, pushing lifted statements onto `into`, and
    // returns the expression to use in its place.
    const linearize = (node, into) => {
      if (failed || !node || typeof node !== 'object') return node;
      switch (node.type) {
        case 'Identifier':
        case 'Literal':
        case 'ThisExpression':
          return node;
        case 'MemberExpression': {
          const object = linearize(node.object, into);
          const property = node.computed ? linearize(node.property, into) : node.property;
          return { ...node, object, property };
        }
        case 'CallExpression': {
          const args = node.arguments.map(argument => linearize(argument, into));
          if (node.callee.type === 'Identifier') {
            // an argument containing a call to the same function is the FXC
            // nested-call shape; lift the whole argument so the emitted GLSL
            // calls the function with a plain temporary
            for (let i = 0; i < args.length; i++) {
              if (containsCallTo(args[i], node.callee.name)) {
                args[i] = capture(into, args[i]);
              }
            }
          }
          return { ...node, arguments: args };
        }
        case 'BinaryExpression': {
          // evaluation order: left fully before right
          const left = linearize(node.left, into);
          const leftStable = hasSideEffects(node.right) ? capture(into, left) : left;
          return { ...node, left: leftStable, right: linearize(node.right, into) };
        }
        case 'UnaryExpression':
          return { ...node, argument: linearize(node.argument, into) };
        case 'ArrayExpression':
          return { ...node, elements: node.elements.map(element => linearize(element, into)) };
        case 'UpdateExpression': {
          if (node.argument.type !== 'Identifier') { failed = true; return node; }
          if (node.prefix) {
            into.push({ type: 'ExpressionStatement', expression: node });
            return capture(into, node.argument);
          }
          const before = capture(into, node.argument);
          into.push({ type: 'ExpressionStatement', expression: node });
          return before;
        }
        case 'AssignmentExpression': {
          if (node.left.type !== 'Identifier') { failed = true; return node; }
          const value = linearize(node.right, into);
          into.push({ type: 'ExpressionStatement', expression: { ...node, right: value } });
          return capture(into, node.left);
        }
        case 'SequenceExpression': {
          for (let i = 0; i < node.expressions.length - 1; i++) {
            const expression = linearize(node.expressions[i], into);
            // a lifted side effect is already a statement; anything left is
            // a discarded pure value
            if (expression.type === 'UpdateExpression' || expression.type === 'AssignmentExpression') {
              into.push({ type: 'ExpressionStatement', expression });
            }
          }
          return linearize(node.expressions[node.expressions.length - 1], into);
        }
        case 'ConditionalExpression': {
          if (!hasSideEffects(node.consequent) && !hasSideEffects(node.alternate)) {
            // pure branches: reads hoisted past the guard are value-safe
            return { ...node, test: linearize(node.test, into) };
          }
          // a guarded side effect must stay guarded: unfold to an if
          const test = linearize(node.test, into);
          const name = `hoistSeq${tempId++}`;
          into.push(declare('let', name, { type: 'Literal', value: 0, raw: '0' }));
          const consequent = [];
          const alternate = [];
          const consequentValue = linearize(node.consequent, consequent);
          const alternateValue = linearize(node.alternate, alternate);
          const assign = (target, value) => ({
            type: 'ExpressionStatement',
            expression: { type: 'AssignmentExpression', operator: '=', left: identifier(target), right: value },
          });
          consequent.push(assign(name, consequentValue));
          alternate.push(assign(name, alternateValue));
          into.push({
            type: 'IfStatement',
            test,
            consequent: { type: 'BlockStatement', body: consequent },
            alternate: { type: 'BlockStatement', body: alternate },
          });
          return identifier(name);
        }
        case 'LogicalExpression': {
          if (!hasSideEffects(node.right)) {
            return { ...node, left: linearize(node.left, into) };
          }
          const left = linearize(node.left, into);
          const name = `hoistSeq${tempId++}`;
          into.push(declare('let', name, left));
          const branch = [];
          const rightValue = linearize(node.right, branch);
          branch.push({
            type: 'ExpressionStatement',
            expression: { type: 'AssignmentExpression', operator: '=', left: identifier(name), right: rightValue },
          });
          into.push({
            type: 'IfStatement',
            test: node.operator === '&&' ?
              identifier(name) : { type: 'UnaryExpression', operator: '!', prefix: true, argument: identifier(name) },
            consequent: { type: 'BlockStatement', body: branch },
            alternate: null,
          });
          return identifier(name);
        }
        default:
          // an expression kind this rewrite does not understand: bail out and
          // leave the whole statement as written
          failed = true;
          return node;
      }
    };

    switch (statement.type) {
      case 'ExpressionStatement': {
        const expression = statement.expression;
        if (expression.type === 'AssignmentExpression' && expression.left.type === 'Identifier') {
          const value = linearize(expression.right, statements);
          statements.push({ type: 'ExpressionStatement', expression: { ...expression, right: value } });
        } else {
          const value = linearize(expression, statements);
          if (value.type === 'UpdateExpression' || value.type === 'AssignmentExpression') {
            statements.push({ type: 'ExpressionStatement', expression: value });
          }
        }
        break;
      }
      case 'VariableDeclaration': {
        for (let i = 0; i < statement.declarations.length; i++) {
          const declarator = statement.declarations[i];
          const init = linearize(declarator.init, statements);
          statements.push({ ...statement, declarations: [{ ...declarator, init }] });
        }
        break;
      }
      case 'ReturnStatement': {
        const argument = linearize(statement.argument, statements);
        statements.push({ ...statement, argument });
        break;
      }
      default:
        return null;
    }

    if (failed) return null;
    this.linearTempId = tempId;

    // The type system caches by source position (astKey), which synthetic
    // nodes do not have. Give every node we created a unique position far
    // beyond any real source offset; clones made with spread keep their
    // original's position, which is correct since they have its type.
    let syntheticId = this.syntheticNodeId || 0x40000000;
    const stamp = node => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(stamp);
        return;
      }
      if (typeof node.type === 'string' && node.start === undefined) {
        node.start = syntheticId;
        node.end = syntheticId + 1;
        syntheticId += 2;
      }
      for (const key in node) {
        if (key === 'loc' || key === 'range' || key === 'parent') continue;
        stamp(node[key]);
      }
    };
    stamp(statements);
    this.syntheticNodeId = syntheticId;

    return statements;
  }

  astStatementWithHoisting(ast, retArr) {
    switch (ast.type) {
      case 'ExpressionStatement':
      case 'VariableDeclaration':
      case 'ReturnStatement': {
        // Hoisting moves the read to just before the statement, which is only
        // unobservable while nothing else in the statement has side effects: a
        // read hoisted past an i++ or an inner assignment would see the old
        // value, and one hoisted out of a short-circuited operand would run
        // its argument's side effects unconditionally. Reads themselves are
        // pure, so with no side effects in the statement, timing cannot be
        // observed and pure guards (ternary, &&) are safe to hoist past. A
        // statement that does mix them keeps the nested form -- the FXC bug
        // stays for that kernel on Windows, but wrong-order is worse than
        // slow-path.
        // Statements mixing the pattern with side effects were already
        // rewritten by normalizeFunctionAST before tracing, so ordinarily
        // everything arriving here is clean. The check stays as a safety net
        // for anything the normalizer declined to touch.
        if (!statementIsSideEffectFreeBesidesTopLevelAssignment(ast)) {
          return this.astGeneric(ast, retArr);
        }
        const previousHoist = this.hoistedIndexReads;
        const hoisted = this.hoistedIndexReads = [];
        const statement = [];
        this.astGeneric(ast, statement);
        this.hoistedIndexReads = previousHoist;
        retArr.push(...hoisted, ...statement);
        return retArr;
      }
      default:
        return this.astGeneric(ast, retArr);
    }
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
    let lastType = null;
    const declarationSets = [];
    let declarationSet = [];
    for (let i = 0; i < declarations.length; i++) {
      const declaration = declarations[i];
      const init = declaration.init;
      const info = this.getDeclaration(declaration.id);
      const actualType = this.getType(declaration.init);
      let type = actualType;
      if (type === 'LiteralInteger') {
        if (info.suggestedType === 'Integer') {
          type = 'Integer';
        } else {
          // We had the choice to go either float or int, choosing float
          type = 'Number';
        }
      }
      const markupType = typeMap[type];
      if (!markupType) {
        throw this.astErrorOutput(`Markup type ${ type } not handled`, varDecNode);
      }
      const declarationResult = [];
      if (actualType === 'Integer' && type === 'Integer') {
        // Since we are assigning to a float, ensure valueType is reset to that
        info.valueType = 'Number';
        if (i === 0 || lastType === null) {
          declarationResult.push('float ');
        } else if (type !== lastType) {
          throw new Error('Unhandled declaration');
        }
        lastType = type;
        declarationResult.push(`user_${utils.sanitizeName(declaration.id.name)}=`);
        declarationResult.push('float(');
        this.astGeneric(init, declarationResult);
        declarationResult.push(')');
      } else {
        // Since we are assigning to a float, ensure valueType is reset to that
        info.valueType = type;
        if (i === 0 || lastType === null) {
          declarationResult.push(`${markupType} `);
        } else if (type !== lastType) {
          declarationSets.push(declarationSet.join(','));
          declarationSet = [];
          declarationResult.push(`${markupType} `);
        }
        lastType = type;
        declarationResult.push(`user_${utils.sanitizeName(declaration.id.name)}=`);
        if (actualType === 'Number' && type === 'Integer') {
          if (init.left && init.left.type === 'Literal') {
            this.astGeneric(init, declarationResult);
          } else {
            declarationResult.push('int(');
            this.astGeneric(init, declarationResult);
            declarationResult.push(')');
          }
        } else if (actualType === 'LiteralInteger' && type === 'Integer') {
          this.castLiteralToInteger(init, declarationResult);
        } else {
          this.astGeneric(init, declarationResult);
        }
      }
      declarationSet.push(declarationResult.join(''));
    }

    if (declarationSet.length > 0) {
      declarationSets.push(declarationSet.join(','));
    }

    result.push(declarationSets.join(';'));

    retArr.push(result.join(''));
    retArr.push(';');
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *If* Statement
   * @param {Object} ifNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astIfStatement(ifNode, retArr) {
    retArr.push('if (');
    this.astGeneric(ifNode.test, retArr);
    retArr.push(')');
    if (ifNode.consequent.type === 'BlockStatement') {
      this.astGeneric(ifNode.consequent, retArr);
    } else {
      retArr.push(' {\n');
      this.astGeneric(ifNode.consequent, retArr);
      retArr.push('\n}\n');
    }

    if (ifNode.alternate) {
      retArr.push('else ');
      if (ifNode.alternate.type === 'BlockStatement' || ifNode.alternate.type === 'IfStatement') {
        this.astGeneric(ifNode.alternate, retArr);
      } else {
        retArr.push(' {\n');
        this.astGeneric(ifNode.alternate, retArr);
        retArr.push('\n}\n');
      }
    }
    return retArr;
  }

  /**
   * @desc Emits a switch case's statements. The switch lowers to an if chain,
   * so a case-terminating `break` must be consumed rather than emitted --
   * GLSL rejects `break` outside loops (#855). Statements after it are
   * unreachable and dropped; a `break` anywhere deeper in the case has no
   * if-chain equivalent and is rejected up front, instead of surfacing as a
   * shader compile error.
   * @param {Array} consequent - the case's statements
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astSwitchCaseConsequent(consequent, retArr) {
    const statements = [];
    for (let i = 0; i < consequent.length; i++) {
      if (consequent[i].type === 'BreakStatement') break;
      statements.push(consequent[i]);
    }
    for (let i = 0; i < statements.length; i++) {
      const containsBreak = (node) => {
        if (!node || typeof node !== 'object') return false;
        if (Array.isArray(node)) return node.some(containsBreak);
        if (node.type === 'BreakStatement') return true;
        if (
          node.type === 'ForStatement' ||
          node.type === 'WhileStatement' ||
          node.type === 'DoWhileStatement' ||
          node.type === 'SwitchStatement'
        ) {
          return false;
        }
        for (const key in node) {
          if (key === 'loc' || key === 'range' || key === 'parent') continue;
          if (containsBreak(node[key])) return true;
        }
        return false;
      };
      if (containsBreak(statements[i])) {
        throw this.astErrorOutput(
          'break inside a switch case is only supported as the case terminator',
          statements[i]
        );
      }
    }
    // route through the hoisting wrapper: a nested texture read inside a
    // case body needs the FXC hoist like any other statement, and the
    // hoisted temporary belongs inside this branch of the if chain
    for (let i = 0; i < statements.length; i++) {
      this.astStatementWithHoisting(statements[i], retArr);
      retArr.push('\n');
    }
    return retArr;
  }

  astSwitchStatement(ast, retArr) {
    if (ast.type !== 'SwitchStatement') {
      throw this.astErrorOutput('Invalid switch statement', ast);
    }
    const { discriminant, cases } = ast;
    const type = this.getType(discriminant);
    const varName = `switchDiscriminant${this.astKey(ast, '_')}`;
    switch (type) {
      case 'Float':
      case 'Number':
        retArr.push(`float ${varName} = `);
        this.astGeneric(discriminant, retArr);
        retArr.push(';\n');
        break;
      case 'Integer':
        retArr.push(`int ${varName} = `);
        this.astGeneric(discriminant, retArr);
        retArr.push(';\n');
        break;
    }
    // switch with just a default:
    if (cases.length === 1 && !cases[0].test) {
      this.astSwitchCaseConsequent(cases[0].consequent, retArr);
      return retArr;
    }

    // regular switches:
    let fallingThrough = false;
    let defaultResult = [];
    let movingDefaultToEnd = false;
    let pastFirstIf = false;
    for (let i = 0; i < cases.length; i++) {
      // default
      if (!cases[i].test) {
        if (cases.length > i + 1) {
          movingDefaultToEnd = true;
          this.astSwitchCaseConsequent(cases[i].consequent, defaultResult);
          continue;
        } else {
          retArr.push(' else {\n');
        }
      } else {
        // all others
        if (i === 0 || !pastFirstIf) {
          pastFirstIf = true;
          retArr.push(`if (${varName} == `);
        } else {
          if (fallingThrough) {
            retArr.push(`${varName} == `);
            fallingThrough = false;
          } else {
            retArr.push(` else if (${varName} == `);
          }
        }
        if (type === 'Integer') {
          const testType = this.getType(cases[i].test);
          switch (testType) {
            case 'Number':
            case 'Float':
              this.castValueToInteger(cases[i].test, retArr);
              break;
            case 'LiteralInteger':
              this.castLiteralToInteger(cases[i].test, retArr);
              break;
          }
        } else if (type === 'Float' || type === 'Number') {
          const testType = this.getType(cases[i].test);
          switch (testType) {
            case 'LiteralInteger':
              this.castLiteralToFloat(cases[i].test, retArr);
              break;
            case 'Integer':
              this.castValueToFloat(cases[i].test, retArr);
              break;
          }
        } else {
          throw this.astErrorOutput(`Unhandled switch discriminant type "${type}"`, ast);
        }
        if (!cases[i].consequent || cases[i].consequent.length === 0) {
          fallingThrough = true;
          retArr.push(' || ');
          continue;
        }
        retArr.push(`) {\n`);
      }
      this.astSwitchCaseConsequent(cases[i].consequent, retArr);
      retArr.push('\n}');
    }
    if (movingDefaultToEnd) {
      retArr.push(' else {');
      retArr.push(defaultResult.join(''));
      retArr.push('}');
    }
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *This* expression
   * @param {Object} tNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astThisExpression(tNode, retArr) {
    retArr.push('this');
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *Member* Expression
   * @param {Object} mNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astMemberExpression(mNode, retArr) {
    const {
      property,
      name,
      signature,
      origin,
      type,
      xProperty,
      yProperty,
      zProperty
    } = this.getMemberExpressionDetails(mNode);
    switch (signature) {
      case 'value.thread.value':
      case 'this.thread.value':
        if (name !== 'x' && name !== 'y' && name !== 'z') {
          throw this.astErrorOutput('Unexpected expression, expected `this.thread.x`, `this.thread.y`, or `this.thread.z`', mNode);
        }
        retArr.push(`threadId.${name}`);
        return retArr;
      case 'this.output.value':
        if (this.dynamicOutput) {
          switch (name) {
            case 'x':
              if (this.isState('casting-to-float')) {
                retArr.push('float(uOutputDim.x)');
              } else {
                retArr.push('uOutputDim.x');
              }
              break;
            case 'y':
              if (this.isState('casting-to-float')) {
                retArr.push('float(uOutputDim.y)');
              } else {
                retArr.push('uOutputDim.y');
              }
              break;
            case 'z':
              if (this.isState('casting-to-float')) {
                retArr.push('float(uOutputDim.z)');
              } else {
                retArr.push('uOutputDim.z');
              }
              break;
            default:
              throw this.astErrorOutput('Unexpected expression', mNode);
          }
        } else {
          switch (name) {
            case 'x':
              if (this.isState('casting-to-integer')) {
                retArr.push(this.output[0]);
              } else {
                retArr.push(this.output[0], '.0');
              }
              break;
            case 'y':
              if (this.isState('casting-to-integer')) {
                retArr.push(this.output[1]);
              } else {
                retArr.push(this.output[1], '.0');
              }
              break;
            case 'z':
              if (this.isState('casting-to-integer')) {
                retArr.push(this.output[2]);
              } else {
                retArr.push(this.output[2], '.0');
              }
              break;
            default:
              throw this.astErrorOutput('Unexpected expression', mNode);
          }
        }
        return retArr;
      case 'value':
        throw this.astErrorOutput('Unexpected expression', mNode);
      case 'value[]':
      case 'value[][]':
      case 'value[][][]':
      case 'value[][][][]':
      case 'value.value':
        if (origin === 'Math') {
          retArr.push(Math[name]);
          return retArr;
        }
        const cleanName = utils.sanitizeName(name);
        switch (property) {
          case 'r':
            retArr.push(`user_${ cleanName }.r`);
            return retArr;
          case 'g':
            retArr.push(`user_${ cleanName }.g`);
            return retArr;
          case 'b':
            retArr.push(`user_${ cleanName }.b`);
            return retArr;
          case 'a':
            retArr.push(`user_${ cleanName }.a`);
            return retArr;
        }
        break;
      case 'this.constants.value':
        if (typeof xProperty === 'undefined') {
          switch (type) {
            case 'Array(2)':
            case 'Array(3)':
            case 'Array(4)':
              retArr.push(`constants_${ utils.sanitizeName(name) }`);
              return retArr;
          }
        }
      case 'this.constants.value[]':
      case 'this.constants.value[][]':
      case 'this.constants.value[][][]':
      case 'this.constants.value[][][][]':
        break;
      case 'fn()[]':
        this.astCallExpression(mNode.object, retArr);
        retArr.push('[');
        retArr.push(this.memberExpressionPropertyMarkup(property));
        retArr.push(']');
        return retArr;
      case 'fn()[][]': {
        const yProperty = mNode.object.property;
        const xProperty = mNode.property;
        // A matrix indexed by anything but a constant cannot be written
        // m[y][x] in GLSL ES 1.00; getMatrixN walks it with loop counters,
        // which are legal index expressions. Constant indices keep the direct
        // form, which every version accepts and which costs nothing.
        const matrixSize = matrixSizes[this.getType(mNode.object.object)];
        const isConstantIndex = property => this.getType(property) === 'LiteralInteger';
        if (matrixSize && !(isConstantIndex(yProperty) && isConstantIndex(xProperty))) {
          retArr.push(`getMatrix${matrixSize}(`);
          this.astCallExpression(mNode.object.object, retArr);
          retArr.push(', ');
          retArr.push(this.memberExpressionPropertyMarkup(yProperty));
          retArr.push(', ');
          retArr.push(this.memberExpressionPropertyMarkup(xProperty));
          retArr.push(')');
          return retArr;
        }
        this.astCallExpression(mNode.object.object, retArr);
        retArr.push('[');
        retArr.push(this.memberExpressionPropertyMarkup(yProperty));
        retArr.push(']');
        retArr.push('[');
        retArr.push(this.memberExpressionPropertyMarkup(xProperty));
        retArr.push(']');
        return retArr;
      }
      case '[][]':
        this.astArrayExpression(mNode.object, retArr);
        retArr.push('[');
        retArr.push(this.memberExpressionPropertyMarkup(property));
        retArr.push(']');
        return retArr;
      default:
        throw this.astErrorOutput('Unexpected expression', mNode);
    }

    if (mNode.computed === false) {
      // handle simple types
      switch (type) {
        case 'Number':
        case 'Integer':
        case 'Float':
        case 'Boolean':
          retArr.push(`${origin}_${utils.sanitizeName(name)}`);
          return retArr;
      }
    }

    // handle more complex types
    // argument may have come from a parent
    const markupName = `${origin}_${utils.sanitizeName(name)}`;

    switch (type) {
      case 'Array(2)':
      case 'Array(3)':
      case 'Array(4)':
        // Get from local vec4
        this.astGeneric(mNode.object, retArr);
        retArr.push('[');
        retArr.push(this.memberExpressionPropertyMarkup(xProperty));
        retArr.push(']');
        break;
      case 'HTMLImageArray':
        retArr.push(`getImage3D(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
        this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
        retArr.push(')');
        break;
      case 'ArrayTexture(1)':
        retArr.push(`getFloatFromSampler2D(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
        this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
        retArr.push(')');
        break;
      case 'Array1D(2)':
      case 'Array2D(2)':
      case 'Array3D(2)':
        retArr.push(`getMemoryOptimizedVec2(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
        this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
        retArr.push(')');
        break;
      case 'ArrayTexture(2)':
        retArr.push(`getVec2FromSampler2D(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
        this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
        retArr.push(')');
        break;
      case 'Array1D(3)':
      case 'Array2D(3)':
      case 'Array3D(3)':
        retArr.push(`getMemoryOptimizedVec3(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
        this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
        retArr.push(')');
        break;
      case 'ArrayTexture(3)':
        retArr.push(`getVec3FromSampler2D(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
        this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
        retArr.push(')');
        break;
      case 'Array1D(4)':
      case 'Array2D(4)':
      case 'Array3D(4)':
        retArr.push(`getMemoryOptimizedVec4(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
        this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
        retArr.push(')');
        break;
      case 'ArrayTexture(4)':
      case 'HTMLCanvas':
      case 'OffscreenCanvas':
      case 'HTMLImage':
      case 'ImageBitmap':
      case 'ImageData':
      case 'HTMLVideo':
        retArr.push(`getVec4FromSampler2D(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
        this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
        retArr.push(')');
        break;
      case 'NumberTexture':
      case 'Array':
      case 'Array2D':
      case 'Array3D':
      case 'Array4D':
      case 'Input':
      case 'Number':
      case 'Float':
      case 'Integer':
        if (this.precision === 'single') {
          // bitRatio is always 4 here, javascript doesn't yet have 8 or 16 bit support
          // TODO: make 8 or 16 bit work anyway!
          retArr.push(`getMemoryOptimized32(${markupName}, ${markupName}Size, ${markupName}Dim, `);
          this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
          retArr.push(')');
        } else {
          const bitRatio = (origin === 'user' ?
            this.lookupFunctionArgumentBitRatio(this.name, name) :
            this.constantBitRatios[name]
          );
          switch (bitRatio) {
            case 1:
              retArr.push(`get8(${markupName}, ${markupName}Size, ${markupName}Dim, `);
              break;
            case 2:
              retArr.push(`get16(${markupName}, ${markupName}Size, ${markupName}Dim, `);
              break;
            case 4:
            case 0:
              retArr.push(`get32(${markupName}, ${markupName}Size, ${markupName}Dim, `);
              break;
            default:
              throw new Error(`unhandled bit ratio of ${bitRatio}`);
          }
          this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
          retArr.push(')');
        }
        break;
      case 'MemoryOptimizedNumberTexture':
        retArr.push(`getMemoryOptimized32(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
        this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
        retArr.push(')');
        break;
      case 'Matrix(2)':
      case 'Matrix(3)':
      case 'Matrix(4)':
        retArr.push(`${markupName}[${this.memberExpressionPropertyMarkup(yProperty)}]`);
        if (yProperty) {
          retArr.push(`[${this.memberExpressionPropertyMarkup(xProperty)}]`);
        }
        break;
      default:
        throw new Error(`unhandled member expression "${ type }"`);
    }
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *call* expression
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   * @returns  {Array} the append retArr
   */
  astCallExpression(ast, retArr) {
    if (!ast.callee) {
      throw this.astErrorOutput('Unknown CallExpression', ast);
    }

    let functionName = null;
    const isMathFunction = this.isAstMathFunction(ast);

    // Its a math operator or this.something(), remove the prefix
    if (isMathFunction || (ast.callee.object && ast.callee.object.type === 'ThisExpression')) {
      functionName = ast.callee.property.name;
    }
    // Issue #212, BABEL!
    else if (ast.callee.type === 'SequenceExpression' && ast.callee.expressions[0].type === 'Literal' && !isNaN(ast.callee.expressions[0].raw)) {
      functionName = ast.callee.expressions[1].property.name;
    } else {
      functionName = ast.callee.name;
    }

    if (!functionName) {
      throw this.astErrorOutput(`Unhandled function, couldn't find name`, ast);
    }

    // if this if grows to more than one, lets use a switch
    switch (functionName) {
      case 'pow':
        functionName = '_pow';
        break;
      case 'round':
        functionName = '_round';
        break;
    }

    // Register the function into the called registry
    if (this.calledFunctions.indexOf(functionName) < 0) {
      this.calledFunctions.push(functionName);
    }

    if (functionName === 'random' && this.plugins && this.plugins.length > 0) {
      for (let i = 0; i < this.plugins.length; i++) {
        const plugin = this.plugins[i];
        if (plugin.functionMatch === 'Math.random()' && plugin.functionReplace) {
          retArr.push(plugin.functionReplace);
          return retArr;
        }
      }
    }

    // track the function was called
    if (this.onFunctionCall) {
      this.onFunctionCall(this.name, functionName, ast.arguments);
    }

    // Call the function
    retArr.push(functionName);

    // Open arguments space
    retArr.push('(');

    // Add the arguments
    if (isMathFunction) {
      for (let i = 0; i < ast.arguments.length; ++i) {
        const argument = ast.arguments[i];
        const argumentType = this.getType(argument);
        if (i > 0) {
          retArr.push(', ');
        }

        switch (argumentType) {
          case 'Integer':
            this.castValueToFloat(argument, retArr);
            break;
          default:
            this.astGeneric(argument, retArr);
            break;
        }
      }
    } else {
      const targetTypes = this.lookupFunctionArgumentTypes(functionName) || [];
      for (let i = 0; i < ast.arguments.length; ++i) {
        const argument = ast.arguments[i];
        let targetType = targetTypes[i];
        if (i > 0) {
          retArr.push(', ');
        }
        const argumentType = this.getType(argument);
        if (!targetType) {
          this.triggerImplyArgumentType(functionName, i, argumentType, this);
          targetType = argumentType;
        }
        switch (argumentType) {
          case 'Boolean':
            this.astGeneric(argument, retArr);
            continue;
          case 'Number':
          case 'Float':
            if (targetType === 'Integer') {
              retArr.push('int(');
              this.astGeneric(argument, retArr);
              retArr.push(')');
              continue;
            } else if (targetType === 'Number' || targetType === 'Float') {
              this.astGeneric(argument, retArr);
              continue;
            } else if (targetType === 'LiteralInteger') {
              this.castLiteralToFloat(argument, retArr);
              continue;
            }
            break;
          case 'Integer':
            if (targetType === 'Number' || targetType === 'Float') {
              retArr.push('float(');
              this.astGeneric(argument, retArr);
              retArr.push(')');
              continue;
            } else if (targetType === 'Integer') {
              this.astGeneric(argument, retArr);
              continue;
            }
            break;
          case 'LiteralInteger':
            if (targetType === 'Integer') {
              this.castLiteralToInteger(argument, retArr);
              continue;
            } else if (targetType === 'Number' || targetType === 'Float') {
              this.castLiteralToFloat(argument, retArr);
              continue;
            } else if (targetType === 'LiteralInteger') {
              this.astGeneric(argument, retArr);
              continue;
            }
            break;
          case 'Array(2)':
          case 'Array(3)':
          case 'Array(4)':
            if (targetType === argumentType) {
              if (argument.type === 'Identifier') {
                retArr.push(`user_${utils.sanitizeName(argument.name)}`);
              } else if (argument.type === 'ArrayExpression' || argument.type === 'MemberExpression' || argument.type === 'CallExpression') {
                this.astGeneric(argument, retArr);
              } else {
                throw this.astErrorOutput(`Unhandled argument type ${ argument.type }`, ast);
              }
              continue;
            }
            break;
          case 'HTMLCanvas':
          case 'OffscreenCanvas':
          case 'HTMLImage':
          case 'ImageBitmap':
          case 'ImageData':
          case 'HTMLImageArray':
          case 'HTMLVideo':
          case 'ArrayTexture(1)':
          case 'ArrayTexture(2)':
          case 'ArrayTexture(3)':
          case 'ArrayTexture(4)':
          case 'Array':
          case 'Input':
            if (targetType === argumentType) {
              if (argument.type !== 'Identifier') throw this.astErrorOutput(`Unhandled argument type ${ argument.type }`, ast);
              this.triggerImplyArgumentBitRatio(this.name, argument.name, functionName, i);
              const name = utils.sanitizeName(argument.name);
              retArr.push(`user_${name},user_${name}Size,user_${name}Dim`);
              continue;
            }
            break;
        }
        throw this.astErrorOutput(`Unhandled argument combination of ${ argumentType } and ${ targetType } for argument named "${ argument.name }"`, ast);
      }
    }
    // Close arguments space
    retArr.push(')');

    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *Array* Expression
   * @param {Object} arrNode - the AST object to parse
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astArrayExpression(arrNode, retArr) {
    const returnType = this.getType(arrNode);

    const arrLen = arrNode.elements.length;

    switch (returnType) {
      case 'Matrix(2)':
      case 'Matrix(3)':
      case 'Matrix(4)':
        retArr.push(`mat${arrLen}(`);
        break;
      default:
        retArr.push(`vec${arrLen}(`);
    }
    for (let i = 0; i < arrLen; ++i) {
      if (i > 0) {
        retArr.push(', ');
      }
      const subNode = arrNode.elements[i];
      this.astGeneric(subNode, retArr)
    }
    retArr.push(')');

    return retArr;
  }

  memberExpressionXYZ(x, y, z, retArr) {
    if (z) {
      retArr.push(this.memberExpressionPropertyMarkup(z), ', ');
    } else {
      retArr.push('0, ');
    }
    if (y) {
      retArr.push(this.memberExpressionPropertyMarkup(y), ', ');
    } else {
      retArr.push('0, ');
    }
    retArr.push(this.memberExpressionPropertyMarkup(x));
    return retArr;
  }

  memberExpressionPropertyMarkup(property) {
    if (!property) {
      throw new Error('Property not set');
    }
    const type = this.getType(property);
    const result = [];
    switch (type) {
      case 'Number':
      case 'Float':
        this.castValueToInteger(property, result);
        break;
      case 'LiteralInteger':
        this.castLiteralToInteger(property, result);
        break;
      default:
        this.astGeneric(property, result);
    }
    const markup = result.join('');
    // A sampler read used directly as an index gets hoisted into a variable of
    // its own -- see astStatementWithHoisting for why. Every sampler read
    // gpu.js generates passes the texture and its size uniform side by side,
    // which is what this looks for; anything else stays inline, so kernels
    // without the pattern compile to the same string they always have.
    if (this.hoistedIndexReads && /\b\w+\((user_|constants_)\w+, \1\w+Size/.test(markup)) {
      const name = `hoisted_${this.hoistedIndexReads.length}_${utils.sanitizeName(this.name)}`;
      const isInt = markup.startsWith('int(');
      this.hoistedIndexReads.push(`${isInt ? 'int' : 'float'} ${name}=${markup};\n`);
      return name;
    }
    return markup;
  }
}

/**
 * @desc Whether an expression subtree is free of side effects. The kernel
 * language keeps this simple: only update and assignment expressions mutate.
 * @param {Object} node - the expression node
 * @returns {Boolean}
 */
function nodeIsSideEffectFree(node) {
  if (!node || typeof node !== 'object') return true;
  if (Array.isArray(node)) return node.every(nodeIsSideEffectFree);
  // a comma is not itself a side effect, but treating it as one makes a
  // guarded comma unfold with its guard, so its operands get split instead
  // of surviving into emission where the hoist cannot reach them
  if (node.type === 'UpdateExpression' || node.type === 'AssignmentExpression' || node.type === 'SequenceExpression') return false;
  for (const key in node) {
    if (key === 'loc' || key === 'range' || key === 'parent') continue;
    if (!nodeIsSideEffectFree(node[key])) return false;
  }
  return true;
}

/**
 * @desc Whether a statement contains the shape the FXC hoist exists for: a
 * computed member read used inside the computed index of another member read.
 * An AST-level approximation of the sampler test the emitter applies -- a
 * false positive only means a side-effectful statement gets linearized when it
 * had nothing to hoist, which preserves semantics.
 * @param {Object} statement - the statement node
 * @returns {Boolean}
 */
function statementContainsNestedIndexRead(statement) {
  let found = false;

  function containsComputedRead(node) {
    if (!node || typeof node !== 'object' || found) return false;
    if (Array.isArray(node)) return node.some(containsComputedRead);
    if (node.type === 'MemberExpression' && node.computed) return true;
    for (const key in node) {
      if (key === 'loc' || key === 'range' || key === 'parent') continue;
      if (containsComputedRead(node[key])) return true;
    }
    return false;
  }

  function walk(node) {
    if (!node || typeof node !== 'object' || found) return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.type === 'MemberExpression' && node.computed && containsComputedRead(node.property)) {
      found = true;
      return;
    }
    for (const key in node) {
      if (key === 'loc' || key === 'range' || key === 'parent') continue;
      walk(node[key]);
    }
  }
  walk(statement);
  return found;
}

/**
 * @desc Whether the subtree contains a call to the named user function.
 * @param {Object} node - the node to search
 * @param {String} name - the callee name
 * @returns {Boolean}
 */
function containsCallTo(node, name) {
  if (!node || typeof node !== 'object') return false;
  if (Array.isArray(node)) return node.some(child => containsCallTo(child, name));
  if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === name) return true;
  for (const key in node) {
    if (key === 'loc' || key === 'range' || key === 'parent') continue;
    if (containsCallTo(node[key], name)) return true;
  }
  return false;
}

/**
 * @desc Whether the subtree contains a user function called nested inside a
 * call to itself -- f(a, f(b, x)). If f takes an array, both calls become the
 * same sampler-taking GLSL function and FXC miscompiles the nested form just
 * as it does nested texture reads (#300); the linearizer lifts the inner call
 * out. Calls are pure in the kernel language, so lifting one earlier can
 * never change what it computes.
 * @param {Object} statement - the node to search
 * @returns {Boolean}
 */
function containsNestedSameFunctionCall(statement) {
  let found = false;

  function walk(node) {
    if (!node || typeof node !== 'object' || found) return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
      if (node.arguments.some(argument => containsCallTo(argument, node.callee.name))) {
        found = true;
        return;
      }
    }
    for (const key in node) {
      if (key === 'loc' || key === 'range' || key === 'parent') continue;
      walk(node[key]);
    }
  }
  walk(statement);
  return found;
}

/**
 * @desc Whether a statement contains no side effects other than the statement's
 * own top-level assignment, which runs after every subexpression and therefore
 * cannot observe a hoisted read's timing. Update expressions, comma sequences
 * and inner assignments can; kernel function calls cannot, since the kernel
 * language has no mutable shared state for them to touch.
 * @param {Object} statement - the statement node
 * @returns {Boolean}
 */
function statementIsSideEffectFreeBesidesTopLevelAssignment(statement) {
  const topLevelAssignment =
    statement.type === 'ExpressionStatement' && statement.expression.type === 'AssignmentExpression' ?
    statement.expression :
    null;

  function walk(node) {
    if (!node || typeof node !== 'object') return true;
    if (Array.isArray(node)) return node.every(walk);
    if (typeof node.type === 'string') {
      if (node.type === 'UpdateExpression' || node.type === 'SequenceExpression') return false;
      if (node.type === 'AssignmentExpression' && node !== topLevelAssignment) return false;
    }
    for (const key in node) {
      if (key === 'loc' || key === 'range' || key === 'parent') continue;
      if (!walk(node[key])) return false;
    }
    return true;
  }
  return walk(statement);
}

// the square float matrices GLSL has, and their dimension
const matrixSizes = {
  'Matrix(2)': 2,
  'Matrix(3)': 3,
  'Matrix(4)': 4,
};

const typeMap = {
  'Array': 'sampler2D',
  'Array(2)': 'vec2',
  'Array(3)': 'vec3',
  'Array(4)': 'vec4',
  'Matrix(2)': 'mat2',
  'Matrix(3)': 'mat3',
  'Matrix(4)': 'mat4',
  'Array2D': 'sampler2D',
  'Array3D': 'sampler2D',
  'Boolean': 'bool',
  'Float': 'float',
  'Input': 'sampler2D',
  'Integer': 'int',
  'Number': 'float',
  'LiteralInteger': 'float',
  'NumberTexture': 'sampler2D',
  'MemoryOptimizedNumberTexture': 'sampler2D',
  'ArrayTexture(1)': 'sampler2D',
  'ArrayTexture(2)': 'sampler2D',
  'ArrayTexture(3)': 'sampler2D',
  'ArrayTexture(4)': 'sampler2D',
  'HTMLVideo': 'sampler2D',
  'HTMLCanvas': 'sampler2D',
  'OffscreenCanvas': 'sampler2D',
  'HTMLImage': 'sampler2D',
  'ImageBitmap': 'sampler2D',
  'ImageData': 'sampler2D',
  'HTMLImageArray': 'sampler2DArray',
};

const operatorMap = {
  '===': '==',
  '!==': '!='
};

module.exports = {
  WebGLFunctionNode
};