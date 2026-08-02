const { utils } = require('../../utils');
const { FunctionNode } = require('../function-node');

/**
 * @desc [INTERNAL] Takes in a function node, and does all the AST voodoo
 * required to toString its respective WGSL code. Extends the base
 * FunctionNode directly (not the WebGL node): WGSL shares GLSL's numeric
 * strictness — the casting-state discipline is ported — but none of its
 * texture machinery.
 *
 * Names this emitter shares with the kernel assembler (kernel.js):
 * `gid` (root entry's global_invocation_id), `threadGid` (module-private
 * mirror of gid for helper functions), `data_index`, `params`, `result`,
 * `get_user_X`/`get_constants_X` flat accessors, `constants_X` bindings and
 * `LOOP_MAX`.
 */
class WGSLFunctionNode extends FunctionNode {
  get requiresSequenceFreeForInit() {
    return true;
  }

  /**
   * WGSL rejects float literals that overflow f32 (GLSL forgave them), and
   * JS toString of an integral double has no decimal point. Every float
   * literal goes through here so the emitted text is always a committed,
   * in-range WGSL float.
   * @param {number} value
   * @returns {String}
   */
  wgslFloat(value) {
    if (value === Infinity) return '0x1.fffffep+127';
    if (value === -Infinity) return '-0x1.fffffep+127';
    if (value > 3.4028234663852886e38) return '0x1.fffffep+127';
    if (value < -3.4028234663852886e38) return '-0x1.fffffep+127';
    const str = `${ value }`;
    if (str.indexOf('.') !== -1 || str.indexOf('e') !== -1 || str.indexOf('E') !== -1) {
      return str;
    }
    return `${ str }.0`;
  }

  /**
   * @param {number} value
   * @returns {String}
   */
  wgslInt(value) {
    return `${ Math.round(value) }`;
  }

  /**
   * User function names collide with WGSL keywords and builtins where GLSL
   * names did not; mangle rather than reject. Unconditionally: WGSL reserves
   * over sixty words that are legal JavaScript function names (filter, get,
   * set, type, self, ...), and a curated list drifts out of date with the
   * spec -- #861 found 64 missing. The fn_ prefix removes the class the way
   * user_ already does for variables; the registry side (FunctionBuilder,
   * type inference) keys on original names and never sees this.
   * @param {String} name
   * @returns {String}
   */
  mangleFunctionName(name) {
    return `fn_${ utils.sanitizeName(name) }`;
  }

  /**
   * A WebGPUBufferResult argument reads like a flat storage array; the base
   * typeLookupMap does not know the type, so value lookup is resolved here.
   */
  getLookupType(type) {
    if (type === 'WebGPUBuffer') {
      return 'Number';
    }
    return super.getLookupType(type);
  }

  /**
   * WGSL has no ternary. Pure-value case lowers to `select(false, true, cond)`
   * — both sides evaluate eagerly, which is observationally safe in the
   * side-effect-free kernel language. Void (minified) case lowers to if/else.
   */
  astUpdateExpression(uNode, retArr) {
    // WGSL has only the postfix increment/decrement statement form; at the
    // statement and for-update positions -- the only places WGSL allows an
    // increment at all -- prefix and postfix are indistinguishable, so both
    // emit postfix rather than the invalid `++x`
    this.astGeneric(uNode.argument, retArr);
    retArr.push(uNode.operator);
    return retArr;
  }

  getType(ast) {
    // a ternary with an integer consequent but a float alternate emits as
    // f32 (see astConditionalExpression); the type system must agree or the
    // enclosing expression casts the wrong way
    if (ast && ast.type === 'ConditionalExpression') {
      const consequentType = this.getType(ast.consequent);
      if (consequentType === 'Integer' || consequentType === 'LiteralInteger') {
        const alternateType = this.getType(ast.alternate);
        if (alternateType === 'Number' || alternateType === 'Float') {
          return 'Number';
        }
      }
    }
    return super.getType(ast);
  }

  astConditionalExpression(ast, retArr) {
    if (ast.type !== 'ConditionalExpression') {
      throw this.astErrorOutput('Not a conditional expression', ast);
    }
    const consequentType = this.getType(ast.consequent);
    const alternateType = this.getType(ast.alternate);
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
    // the consequent's type wins, matching getType's ConditionalExpression rule
    let targetType = consequentType === 'LiteralInteger' ? 'Number' : consequentType;
    // mixed int/float branches promote to float: coercing the float branch to
    // integer would silently round it away from JS semantics. getType's
    // ConditionalExpression override reports the same promotion.
    if (targetType === 'Integer' && (alternateType === 'Number' || alternateType === 'Float')) {
      targetType = 'Number';
    }
    const emitBranch = (branch) => {
      const branchType = this.getType(branch);
      switch (targetType) {
        case 'Number':
        case 'Float':
          if (branchType === 'Integer') {
            this.castValueToFloat(branch, retArr);
          } else if (branchType === 'LiteralInteger') {
            this.castLiteralToFloat(branch, retArr);
          } else {
            this.astGeneric(branch, retArr);
          }
          break;
        case 'Integer':
          if (branchType === 'Number' || branchType === 'Float') {
            this.castValueToInteger(branch, retArr);
          } else if (branchType === 'LiteralInteger') {
            this.castLiteralToInteger(branch, retArr);
          } else {
            this.astGeneric(branch, retArr);
          }
          break;
        default:
          this.astGeneric(branch, retArr);
      }
    };
    // select(falseValue, trueValue, condition)
    retArr.push('select(');
    emitBranch(ast.alternate);
    retArr.push(', ');
    emitBranch(ast.consequent);
    retArr.push(', ');
    this.astGeneric(ast.test, retArr);
    retArr.push(')');
    return retArr;
  }

  /**
   * Root kernel: emits only body statements — the kernel class assembles the
   * `@compute` entry, guard and `data_index` around them. Non-root: a full
   * `fn name(args) -> type { ... }` declaration.
   */
  astFunction(ast, retArr) {
    if (this.isRootKernel) {
      for (let i = 0; i < ast.body.body.length; ++i) {
        this.astGeneric(ast.body.body[i], retArr);
        retArr.push('\n');
      }
      return retArr;
    }

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
    let type = null;
    if (returnType) {
      type = typeMap[returnType];
      if (!type) {
        throw this.astErrorOutput(`unknown return type ${ returnType }`, ast);
      }
    }

    retArr.push(`fn ${ this.mangleFunctionName(this.name) }(`);
    for (let i = 0; i < this.argumentNames.length; ++i) {
      const argumentName = this.argumentNames[i];
      if (i > 0) {
        retArr.push(', ');
      }
      let argumentType = this.argumentTypes[this.argumentNames.indexOf(argumentName)];
      if (!argumentType) {
        throw this.astErrorOutput(`Unknown argument ${ argumentName } type`, ast);
      }
      if (argumentType === 'LiteralInteger') {
        this.argumentTypes[i] = argumentType = 'Number';
      }
      const wgslType = typeMap[argumentType];
      if (!wgslType) {
        throw this.astErrorOutput(`WebGPU backend does not yet support ${ argumentType } arguments to helper functions`, ast);
      }
      retArr.push(`user_${ utils.sanitizeName(argumentName) } : ${ wgslType }`);
    }
    retArr.push(')');
    if (type) {
      retArr.push(` -> ${ type }`);
    }
    retArr.push(' {\n');
    for (let i = 0; i < ast.body.body.length; ++i) {
      this.astGeneric(ast.body.body[i], retArr);
      retArr.push('\n');
    }
    retArr.push('}\n');
    return retArr;
  }

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
            result.push('f32(');
            this.astGeneric(ast.argument, result);
            result.push(')');
            break;
          case 'LiteralInteger':
            this.castLiteralToFloat(ast.argument, result);
            // if constraints forced the literal to pick integer anyway, cast it
            if (this.getType(ast.argument) === 'Integer') {
              result.unshift('f32(');
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
      case 'Boolean':
      case 'Array(4)':
      case 'Array(3)':
      case 'Array(2)':
        this.astGeneric(ast.argument, result);
        break;
      default:
        throw this.astErrorOutput(`unhandled return type ${ this.returnType }`, ast);
    }

    if (this.isRootKernel) {
      switch (this.returnType) {
        case 'Array(4)':
        case 'Array(3)':
        case 'Array(2)': {
          const n = parseInt(this.returnType.substring(6), 10);
          const temp = this.getInternalVariableName('kernelResultVec');
          retArr.push(`let ${ temp } : ${ typeMap[this.returnType] } = ${ result.join('') };\n`);
          for (let c = 0; c < n; c++) {
            retArr.push(`result[data_index * ${ n } + ${ c }] = ${ temp }.${ vectorComponents[c] };\n`);
          }
          retArr.push('return;');
          break;
        }
        case 'Integer':
          retArr.push(`result[data_index] = f32(${ result.join('') });`);
          retArr.push('return;');
          break;
        default:
          retArr.push(`result[data_index] = ${ result.join('') };`);
          retArr.push('return;');
      }
    } else if (this.isSubKernel) {
      throw this.astErrorOutput('WebGPU backend does not yet support createKernelMap', ast);
    } else {
      retArr.push(`return ${ result.join('') };`);
    }
    return retArr;
  }

  astLiteral(ast, retArr) {
    if (ast.value === true || ast.value === false) {
      retArr.push(ast.value ? 'true' : 'false');
      return retArr;
    }
    if (isNaN(ast.value)) {
      throw this.astErrorOutput('Non-numeric literal not supported : ' + ast.value, ast);
    }

    const key = this.astKey(ast);
    if (Number.isInteger(ast.value)) {
      if (this.isState('casting-to-integer') || this.isState('building-integer')) {
        this.literalTypes[key] = 'Integer';
        retArr.push(this.wgslInt(ast.value));
      } else {
        this.literalTypes[key] = 'Number';
        retArr.push(this.wgslFloat(ast.value));
      }
    } else if (this.isState('casting-to-integer') || this.isState('building-integer')) {
      this.literalTypes[key] = 'Integer';
      retArr.push(this.wgslInt(ast.value));
    } else {
      this.literalTypes[key] = 'Number';
      retArr.push(this.wgslFloat(ast.value));
    }
    return retArr;
  }

  astBinaryExpression(ast, retArr) {
    if (this.checkAndUpconvertOperator(ast, retArr)) {
      return retArr;
    }

    // `/` and `%` are always fractional in JavaScript; WGSL i32/i32 truncates
    // exactly like GLSL, so both operands go to float whatever their own
    // types are. WGSL's `%` is truncated for f32 and i32 alike — identical to
    // JS — so unlike GLSL no helper function is needed, just the same casts.
    if (ast.operator === '/' || ast.operator === '%') {
      retArr.push('(');
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
      retArr.push(ast.operator);
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
      case 'Integer & Number':
        // JavaScript promotes an integer combined with a fractional value to
        // fractional, whichever side the integer is on. Casting the float
        // operand down to an integer instead rounded it away -- `x * 0.5`
        // emitted `x * 1` and disagreed with `0.5 * x`.
        this.pushState('building-float');
        this.castValueToFloat(ast.left, retArr);
        retArr.push(operatorMap[ast.operator] || ast.operator);
        this.astGeneric(ast.right, retArr);
        this.popState('building-float');
        break;
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
          this.castLiteralToFloat(ast.left, retArr);
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
        throw this.astErrorOutput(`Unhandled binary expression between ${ key }`, ast);
    }
    retArr.push(')');
    return retArr;
  }

  /**
   * `**` upconverts to pow(f32, f32); bitwise operators are native in WGSL
   * (GLSL ES 1.00 needed helper functions) and need only operand casts.
   */
  checkAndUpconvertOperator(ast, retArr) {
    if (this.checkAndUpconvertBitwiseOperators(ast, retArr)) {
      return retArr;
    }
    if (ast.operator !== '**') return null;
    retArr.push('_pow');
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
    const bitwiseOperators = {
      '&': true,
      '|': true,
      '^': true,
      '<<': true,
      '>>': true,
      '>>>': true,
    };
    if (!bitwiseOperators[ast.operator]) return null;
    const emitAsInteger = (side) => {
      switch (this.getType(side)) {
        case 'Number':
        case 'Float':
          this.castValueToInteger(side, retArr);
          break;
        case 'LiteralInteger':
          this.castLiteralToInteger(side, retArr);
          break;
        default:
          this.pushState('building-integer');
          this.astGeneric(side, retArr);
          this.popState('building-integer');
      }
    };
    retArr.push('(');
    if (ast.operator === '>>>') {
      // JS >>> through the i32 pipe: shift as u32, bitcast back
      retArr.push('bitcast<i32>(bitcast<u32>(');
      emitAsInteger(ast.left);
      retArr.push(') >> u32(');
      emitAsInteger(ast.right);
      retArr.push('))');
    } else if (ast.operator === '<<' || ast.operator === '>>') {
      // WGSL requires the shift amount to be u32; >> on i32 is arithmetic = JS
      emitAsInteger(ast.left);
      retArr.push(` ${ ast.operator } u32(`);
      emitAsInteger(ast.right);
      retArr.push(')');
    } else {
      emitAsInteger(ast.left);
      retArr.push(` ${ ast.operator } `);
      emitAsInteger(ast.right);
    }
    retArr.push(')');
    return retArr;
  }

  checkAndUpconvertBitwiseUnary(ast, retArr) {
    if (ast.operator !== '~') return null;
    retArr.push('~(');
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

  astUnaryExpression(uNode, retArr) {
    const unaryResult = this.checkAndUpconvertBitwiseUnary(uNode, retArr);
    if (unaryResult) {
      return retArr;
    }
    // WGSL has no unary `+`
    if (uNode.operator === '+') {
      this.astGeneric(uNode.argument, retArr);
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

  castLiteralToInteger(ast, retArr) {
    this.pushState('casting-to-integer');
    this.astGeneric(ast, retArr);
    this.popState('casting-to-integer');
    return retArr;
  }

  castLiteralToFloat(ast, retArr) {
    this.pushState('casting-to-float');
    this.astGeneric(ast, retArr);
    this.popState('casting-to-float');
    return retArr;
  }

  castValueToInteger(ast, retArr) {
    this.pushState('casting-to-integer');
    retArr.push('i32(');
    this.astGeneric(ast, retArr);
    retArr.push(')');
    this.popState('casting-to-integer');
    return retArr;
  }

  castValueToFloat(ast, retArr) {
    this.pushState('casting-to-float');
    retArr.push('f32(');
    this.astGeneric(ast, retArr);
    retArr.push(')');
    this.popState('casting-to-float');
    return retArr;
  }

  astIdentifierExpression(idtNode, retArr) {
    if (idtNode.type !== 'Identifier') {
      throw this.astErrorOutput('IdentifierExpression - not an Identifier', idtNode);
    }

    const type = this.getType(idtNode);
    const name = utils.sanitizeName(idtNode.name);
    if (idtNode.name === 'Infinity') {
      retArr.push('0x1.fffffep+127');
      return retArr;
    }

    // scalar kernel arguments live in the uniform Params struct; everything
    // else (locals, helper-function parameters) is a plain user_ variable
    const isRootScalarArgument = this.isRootKernel &&
      this.argumentNames.indexOf(idtNode.name) !== -1 &&
      (type === 'Number' || type === 'Float' || type === 'Integer' || type === 'Boolean');
    if (isRootScalarArgument) {
      if (type === 'Boolean') {
        // booleans are not host-shareable; they arrive as u32 and rehydrate
        retArr.push(`bool(params.user_${ name })`);
      } else {
        retArr.push(`params.user_${ name }`);
      }
      return retArr;
    }
    retArr.push(`user_${ name }`);
    return retArr;
  }

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

    if (isSafe === null) {
      isSafe = this.isSafe(forNode.init) && this.isSafe(forNode.test);
    }

    if (isSafe) {
      const initString = initArr.join('');
      const initNeedsSemiColon = initString[initString.length - 1] !== ';';
      retArr.push(`for (${ initString }${ initNeedsSemiColon ? ';' : '' }${ testArr.join('') };${ updateArr.join('') }){\n`);
      retArr.push(bodyArr.join(''));
      retArr.push('}\n');
    } else {
      const iVariableName = this.getInternalVariableName('safeI');
      if (initArr.length > 0) {
        retArr.push(initArr.join(''), '\n');
      }
      retArr.push(`for (var ${ iVariableName } : i32 = 0;${ iVariableName }<LOOP_MAX;${ iVariableName }++){\n`);
      if (testArr.length > 0) {
        // WGSL requires braces on every if
        retArr.push(`if (!(${ testArr.join('') })) { break; }\n`);
      }
      retArr.push(bodyArr.join(''));
      retArr.push(`\n${ updateArr.join('') };`);
      retArr.push('}\n');
    }
    return retArr;
  }

  astWhileStatement(whileNode, retArr) {
    if (whileNode.type !== 'WhileStatement') {
      throw this.astErrorOutput('Invalid while statement', whileNode);
    }
    const iVariableName = this.getInternalVariableName('safeI');
    retArr.push(`for (var ${ iVariableName } : i32 = 0;${ iVariableName }<LOOP_MAX;${ iVariableName }++){\n`);
    retArr.push('if (!(');
    this.astGeneric(whileNode.test, retArr);
    retArr.push(')) { break; }\n');
    this.astGeneric(whileNode.body, retArr);
    retArr.push('}\n');
    return retArr;
  }

  astDoWhileStatement(doWhileNode, retArr) {
    if (doWhileNode.type !== 'DoWhileStatement') {
      throw this.astErrorOutput('Invalid while statement', doWhileNode);
    }
    const iVariableName = this.getInternalVariableName('safeI');
    retArr.push(`for (var ${ iVariableName } : i32 = 0;${ iVariableName }<LOOP_MAX;${ iVariableName }++){\n`);
    this.astGeneric(doWhileNode.body, retArr);
    retArr.push('if (!(');
    this.astGeneric(doWhileNode.test, retArr);
    retArr.push(')) { break; }\n');
    retArr.push('}\n');
    return retArr;
  }

  astAssignmentExpression(assNode, retArr) {
    // in WGSL an assignment is only legal as a statement; the marker pushed
    // by astExpressionStatement (#854) must therefore always be present
    const isStatement = this.isState('assignment-as-statement');
    if (isStatement) {
      this.popState('assignment-as-statement');
    } else {
      throw this.astErrorOutput('WebGPU backend does not yet support assignment used as an expression', assNode);
    }
    if (assNode.operator === '%=') {
      // WGSL's % matches JS (truncated), but mixed-type %= does not exist;
      // rewrite through the float path like `/`
      this.astGeneric(assNode.left, retArr);
      retArr.push('=(');
      this.astGeneric(assNode.left, retArr);
      retArr.push('%');
      const rightType = this.getType(assNode.right);
      if (rightType === 'Integer') {
        this.castValueToFloat(assNode.right, retArr);
      } else if (rightType === 'LiteralInteger') {
        this.castLiteralToFloat(assNode.right, retArr);
      } else {
        this.astGeneric(assNode.right, retArr);
      }
      retArr.push(')');
    } else if (assNode.operator === '**=') {
      this.astGeneric(assNode.left, retArr);
      retArr.push('=');
      retArr.push('_pow(');
      this.astGeneric(assNode.left, retArr);
      retArr.push(',');
      const rightType = this.getType(assNode.right);
      if (rightType === 'Integer') {
        this.castValueToFloat(assNode.right, retArr);
      } else if (rightType === 'LiteralInteger') {
        this.castLiteralToFloat(assNode.right, retArr);
      } else {
        this.astGeneric(assNode.right, retArr);
      }
      retArr.push(')');
    } else {
      const leftType = this.getType(assNode.left);
      const rightType = this.getType(assNode.right);
      this.astGeneric(assNode.left, retArr);
      retArr.push(assNode.operator);
      if (leftType !== 'Integer' && rightType === 'Integer') {
        retArr.push('f32(');
        this.astGeneric(assNode.right, retArr);
        retArr.push(')');
      } else if (leftType !== 'Integer' && rightType === 'LiteralInteger') {
        this.castLiteralToFloat(assNode.right, retArr);
      } else if (leftType === 'Integer' && rightType === 'LiteralInteger') {
        this.castLiteralToInteger(assNode.right, retArr);
      } else if (leftType === 'Integer' && (rightType === 'Number' || rightType === 'Float')) {
        retArr.push('i32(');
        this.astGeneric(assNode.right, retArr);
        retArr.push(')');
      } else {
        this.astGeneric(assNode.right, retArr);
      }
    }
    return retArr;
  }

  astBlockStatement(bNode, retArr) {
    if (this.isState('loop-body')) {
      this.pushState('block-body'); // prevents recursive removal of braces
      for (let i = 0; i < bNode.body.length; i++) {
        this.astGeneric(bNode.body[i], retArr);
      }
      this.popState('block-body');
    } else {
      retArr.push('{\n');
      for (let i = 0; i < bNode.body.length; i++) {
        this.astGeneric(bNode.body[i], retArr);
      }
      retArr.push('}\n');
    }
    return retArr;
  }

  astVariableDeclaration(varDecNode, retArr) {
    const declarations = varDecNode.declarations;
    if (!declarations || !declarations[0] || !declarations[0].init) {
      throw this.astErrorOutput('Unexpected expression', varDecNode);
    }
    // one `var` per declarator — WGSL has no comma-separated declarations
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
          type = 'Number';
        }
      }
      const name = utils.sanitizeName(declaration.id.name);
      if (actualType === 'Integer' && type === 'Integer') {
        // int-typed initializers decay to float declarations (the WebGL
        // backend's long-standing behavior; tests depend on the decay)
        info.valueType = 'Number';
        retArr.push(`var user_${ name } : f32 = `);
        retArr.push('f32(');
        this.astGeneric(init, retArr);
        retArr.push(')');
      } else {
        const markupType = typeMap[type];
        if (!markupType) {
          throw this.astErrorOutput(`Markup type ${ type } not handled`, varDecNode);
        }
        info.valueType = type;
        retArr.push(`var user_${ name } : ${ markupType } = `);
        if (actualType === 'Number' && type === 'Integer') {
          retArr.push('i32(');
          this.astGeneric(init, retArr);
          retArr.push(')');
        } else if (actualType === 'LiteralInteger' && type === 'Integer') {
          this.castLiteralToInteger(init, retArr);
        } else if (actualType === 'LiteralInteger' && type === 'Number') {
          this.castLiteralToFloat(init, retArr);
        } else if (actualType === 'Integer' && type === 'Number') {
          this.castValueToFloat(init, retArr);
        } else {
          this.astGeneric(init, retArr);
        }
      }
      retArr.push(';');
    }
    return retArr;
  }

  astIfStatement(ifNode, retArr) {
    // WGSL requires braces on if/else; every branch gets them
    retArr.push('if (');
    this.astGeneric(ifNode.test, retArr);
    retArr.push(')');
    if (ifNode.consequent.type === 'BlockStatement') {
      this.pushState('if-body'); // defeat loop-body brace elision for branches
      this.astGeneric(ifNode.consequent, retArr);
      this.popState('if-body');
    } else {
      retArr.push(' {\n');
      this.astGeneric(ifNode.consequent, retArr);
      retArr.push('\n}\n');
    }

    if (ifNode.alternate) {
      retArr.push('else ');
      if (ifNode.alternate.type === 'IfStatement') {
        this.astGeneric(ifNode.alternate, retArr);
      } else if (ifNode.alternate.type === 'BlockStatement') {
        this.pushState('if-body');
        this.astGeneric(ifNode.alternate, retArr);
        this.popState('if-body');
      } else {
        retArr.push(' {\n');
        this.astGeneric(ifNode.alternate, retArr);
        retArr.push('\n}\n');
      }
    }
    return retArr;
  }

  astSwitchCaseConsequent(consequent, retArr) {
    // the switch lowers to an if chain, so a case-terminating break is
    // consumed rather than emitted (WGSL rejects break outside loops too)
    const statements = [];
    for (let i = 0; i < consequent.length; i++) {
      if (consequent[i].type === 'BreakStatement') break;
      statements.push(consequent[i]);
    }
    // a break anywhere deeper -- behind an if, inside a block -- would be
    // emitted into the if chain, where WGSL reads it as breaking the
    // enclosing loop (or rejects the shader outside one); same guard as the
    // GL backends
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
    for (let i = 0; i < statements.length; i++) {
      this.astGeneric(statements[i], retArr);
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
    const varName = `switchDiscriminant${ this.astKey(ast, '_') }`;
    switch (type) {
      case 'Float':
      case 'Number':
        retArr.push(`var ${ varName } : f32 = `);
        this.astGeneric(discriminant, retArr);
        retArr.push(';\n');
        break;
      case 'Integer':
        retArr.push(`var ${ varName } : i32 = `);
        this.astGeneric(discriminant, retArr);
        retArr.push(';\n');
        break;
      default:
        throw this.astErrorOutput(`Unhandled switch discriminant type "${ type }"`, ast);
    }
    if (cases.length === 1 && !cases[0].test) {
      this.astSwitchCaseConsequent(cases[0].consequent, retArr);
      return retArr;
    }

    let fallingThrough = false;
    let defaultResult = [];
    let movingDefaultToEnd = false;
    let pastFirstIf = false;
    for (let i = 0; i < cases.length; i++) {
      if (!cases[i].test) {
        if (cases.length > i + 1) {
          movingDefaultToEnd = true;
          this.astSwitchCaseConsequent(cases[i].consequent, defaultResult);
          continue;
        } else {
          retArr.push(' else {\n');
        }
      } else {
        if (i === 0 || !pastFirstIf) {
          pastFirstIf = true;
          retArr.push(`if (${ varName } == `);
        } else {
          if (fallingThrough) {
            retArr.push(`${ varName } == `);
            fallingThrough = false;
          } else {
            retArr.push(` else if (${ varName } == `);
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
        } else {
          const testType = this.getType(cases[i].test);
          switch (testType) {
            case 'LiteralInteger':
              this.castLiteralToFloat(cases[i].test, retArr);
              break;
            case 'Integer':
              this.castValueToFloat(cases[i].test, retArr);
              break;
            default:
              this.astGeneric(cases[i].test, retArr);
          }
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
    retArr.push('\n');
    return retArr;
  }

  astThisExpression(tNode, retArr) {
    retArr.push('this');
    return retArr;
  }

  astSequenceExpression(sNode, retArr) {
    // WGSL has no comma operator; only single-expression sequences (and the
    // babel `(0, fn)(...)` pattern, which astCallExpression consumes before
    // reaching here) can be emitted
    const { expressions } = sNode;
    if (expressions.length === 1) {
      this.astGeneric(expressions[0], retArr);
      return retArr;
    }
    throw this.astErrorOutput('WebGPU backend does not yet support the comma operator', sNode);
  }

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
        // gid only exists in the entry function; helpers read the private mirror
        // always through threadGid: main derives it from the folded flat
        // index for large 1D dispatches, so raw gid is wrong there
        retArr.push(`i32(threadGid.${ name })`);
        return retArr;
      case 'this.output.value': {
        const axisIndex = { x: 0, y: 1, z: 2 } [name];
        if (axisIndex === undefined) {
          throw this.astErrorOutput('Unexpected expression', mNode);
        }
        if (this.dynamicOutput) {
          const member = `params.output${ name.toUpperCase() }`;
          if (this.isState('casting-to-float')) {
            retArr.push(`f32(${ member })`);
          } else {
            retArr.push(`i32(${ member })`);
          }
        } else {
          if (this.isState('casting-to-integer')) {
            retArr.push(`${ this.output[axisIndex] }`);
          } else {
            retArr.push(`${ this.output[axisIndex] }.0`);
          }
        }
        return retArr;
      }
      case 'value':
        throw this.astErrorOutput('Unexpected expression', mNode);
      case 'value[]':
      case 'value[][]':
      case 'value[][][]':
      case 'value[][][][]':
      case 'value.value':
        if (origin === 'Math') {
          retArr.push(this.wgslFloat(Math[name]));
          return retArr;
        }
        switch (property) {
          // WGSL vectors accept rgba swizzles too, but xyzw reads clearer
          case 'r':
            retArr.push(`user_${ utils.sanitizeName(name) }.x`);
            return retArr;
          case 'g':
            retArr.push(`user_${ utils.sanitizeName(name) }.y`);
            return retArr;
          case 'b':
            retArr.push(`user_${ utils.sanitizeName(name) }.z`);
            return retArr;
          case 'a':
            retArr.push(`user_${ utils.sanitizeName(name) }.w`);
            return retArr;
        }
        break;
      case 'this.constants.value': {
        // constants are fixed at build; scalars bake straight into the source
        const value = this.constants[name];
        switch (type) {
          case 'Integer':
            if (this.isState('casting-to-float')) {
              retArr.push(this.wgslFloat(value));
            } else {
              retArr.push(this.wgslInt(value));
            }
            return retArr;
          case 'Number':
          case 'Float':
            if (this.isState('casting-to-integer')) {
              retArr.push(this.wgslInt(value));
            } else {
              retArr.push(this.wgslFloat(value));
            }
            return retArr;
          case 'Boolean':
            retArr.push(value ? 'true' : 'false');
            return retArr;
          case 'Array(2)':
          case 'Array(3)':
          case 'Array(4)': {
            const n = parseInt(type.substring(6), 10);
            const parts = [];
            for (let i = 0; i < n; i++) {
              parts.push(this.wgslFloat(value[i]));
            }
            retArr.push(`${ typeMap[type] }(${ parts.join(', ') })`);
            return retArr;
          }
          default:
            throw this.astErrorOutput(`WebGPU backend does not yet support constant type ${ type }`, mNode);
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
      default:
        throw this.astErrorOutput(`WebGPU backend does not yet support expression signature "${ signature }"`, mNode);
    }

    const markupName = `${ origin }_${ utils.sanitizeName(name) }`;

    switch (type) {
      case 'Array(2)':
      case 'Array(3)':
      case 'Array(4)':
        // local vector with dynamic index
        this.astGeneric(mNode.object, retArr);
        retArr.push('[');
        retArr.push(this.memberExpressionPropertyMarkup(xProperty));
        retArr.push(']');
        break;
      case 'Array':
      case 'Array2D':
      case 'Array3D':
      case 'Input':
      case 'WebGPUBuffer':
      case 'Number':
      case 'Float':
      case 'Integer':
        // monomorphized flat accessor per buffer; z,y,x order with zero-fill
        retArr.push(`get_${ markupName }(`);
        this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
        retArr.push(')');
        break;
      case 'Matrix(2)':
      case 'Matrix(3)':
      case 'Matrix(4)':
        throw this.astErrorOutput('WebGPU backend does not yet support Matrix types', mNode);
      default:
        throw this.astErrorOutput(`WebGPU backend does not yet support member expression type "${ type }"`, mNode);
    }
    return retArr;
  }

  astCallExpression(ast, retArr) {
    if (!ast.callee) {
      throw this.astErrorOutput('Unknown CallExpression', ast);
    }

    if (ast.callee.type === 'MemberExpression' && this.getVariableSignature(ast.callee, true) === 'this.color') {
      // lowers to the kernelColor helper the assembler injects for graphical
      // kernels; data_index only exists in the entry function's scope
      if (!this.isRootKernel) {
        throw this.astErrorOutput('this.color is only usable in the kernel function on the webgpu backend', ast);
      }
      if (ast.arguments.length < 3 || ast.arguments.length > 4) {
        throw this.astErrorOutput('this.color takes (r, g, b) or (r, g, b, a)', ast);
      }
      retArr.push('kernelColor(data_index');
      for (let i = 0; i < ast.arguments.length; i++) {
        retArr.push(', ');
        const argument = ast.arguments[i];
        switch (this.getType(argument)) {
          case 'Integer':
            this.castValueToFloat(argument, retArr);
            break;
          case 'LiteralInteger':
            this.castLiteralToFloat(argument, retArr);
            break;
          default:
            this.astGeneric(argument, retArr);
        }
      }
      if (ast.arguments.length === 3) {
        retArr.push(', 1.0');
      }
      retArr.push(')');
      return retArr;
    }

    let functionName = null;
    const isMathFunction = this.isAstMathFunction(ast);

    if (isMathFunction || (ast.callee.object && ast.callee.object.type === 'ThisExpression')) {
      functionName = ast.callee.property.name;
    } else if (ast.callee.type === 'SequenceExpression' && ast.callee.expressions[0].type === 'Literal' && !isNaN(ast.callee.expressions[0].raw)) {
      functionName = ast.callee.expressions[1].property.name;
    } else {
      functionName = ast.callee.name;
    }

    if (!functionName) {
      throw this.astErrorOutput(`Unhandled function, couldn't find name`, ast);
    }

    // FunctionBuilder's functionMap and the type-inference tables are keyed
    // by the ORIGINAL function name; only the emitted WGSL uses the mangled
    // one. Mangling before the registry traffic would silently drop the
    // helper's definition from the assembled shader.
    let emitName = functionName;
    if (isMathFunction) {
      if (functionName === 'random') {
        // PCG, injected by the assembler; per-thread state seeded from the
        // params seed slot, so draws advance per call within a thread
        retArr.push('pcg_random()');
        return retArr;
      }
      if (mathFunctionRenames[functionName]) {
        functionName = mathFunctionRenames[functionName];
      }
      emitName = functionName;
    } else {
      emitName = this.mangleFunctionName(functionName);
    }

    if (this.calledFunctions.indexOf(functionName) < 0) {
      this.calledFunctions.push(functionName);
    }

    if (this.onFunctionCall) {
      this.onFunctionCall(this.name, functionName, ast.arguments);
    }

    // the WGSL result of floor/ceil/round is f32, but the type system calls
    // it Integer; a call consumed while building an integer expression needs
    // the cast the type system believes is already there
    const needsIntegerWrap = isMathFunction &&
      integerResultMathFunctions[functionName] &&
      this.isState('building-integer');
    if (needsIntegerWrap) {
      retArr.push('i32(');
    }

    retArr.push(emitName);
    retArr.push('(');

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
          case 'LiteralInteger':
            this.castLiteralToFloat(argument, retArr);
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
              retArr.push('i32(');
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
              retArr.push('f32(');
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
                retArr.push(`user_${ utils.sanitizeName(argument.name) }`);
              } else {
                this.astGeneric(argument, retArr);
              }
              continue;
            }
            break;
          case 'Array':
          case 'Array2D':
          case 'Array3D':
          case 'Input':
          case 'WebGPUBuffer':
            throw this.astErrorOutput('WebGPU backend does not yet support array arguments to helper functions', ast);
        }
        throw this.astErrorOutput(`Unhandled argument combination of ${ argumentType } and ${ targetType } for argument named "${ argument.name }"`, ast);
      }
    }
    retArr.push(')');
    if (needsIntegerWrap) {
      retArr.push(')');
    }
    return retArr;
  }

  astArrayExpression(arrNode, retArr) {
    const returnType = this.getType(arrNode);
    switch (returnType) {
      case 'Matrix(2)':
      case 'Matrix(3)':
      case 'Matrix(4)':
        throw this.astErrorOutput('WebGPU backend does not yet support Matrix types', arrNode);
    }
    const arrLen = arrNode.elements.length;
    retArr.push(`vec${ arrLen }<f32>(`);
    for (let i = 0; i < arrLen; ++i) {
      if (i > 0) {
        retArr.push(', ');
      }
      const subNode = arrNode.elements[i];
      // WGSL will not implicitly convert an i32 element; force the float ladder
      switch (this.getType(subNode)) {
        case 'Integer':
          this.castValueToFloat(subNode, retArr);
          break;
        case 'LiteralInteger':
          this.castLiteralToFloat(subNode, retArr);
          break;
        default:
          this.astGeneric(subNode, retArr);
      }
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
      case 'Integer':
        // Integer-typed expressions can still carry f32 spellings (Math.floor
        // emits WGSL's f32 floor); i32() of an i32 is free, so always wrap
        this.pushState('building-integer');
        result.push('i32(');
        this.astGeneric(property, result);
        result.push(')');
        this.popState('building-integer');
        break;
      default:
        this.astGeneric(property, result);
    }
    return result.join('');
  }
}

const typeMap = {
  'Number': 'f32',
  'Float': 'f32',
  'Integer': 'i32',
  'LiteralInteger': 'f32',
  'Boolean': 'bool',
  'Array(2)': 'vec2<f32>',
  'Array(3)': 'vec3<f32>',
  'Array(4)': 'vec4<f32>',
};

const operatorMap = {
  '===': '==',
  '!==': '!='
};

const vectorComponents = ['x', 'y', 'z', 'w'];

// JS Math.* whose WGSL spelling differs; everything else maps by name
const mathFunctionRenames = {
  'pow': '_pow', // pow(x, 0) must be 1 for all x, like JS
  'round': '_round', // WGSL round is half-to-even; JS is half-up
};

// inference types these as Integer (function-node.js getType), but their
// WGSL builtins return f32
const integerResultMathFunctions = {
  'ceil': true,
  'floor': true,
  '_round': true,
};

// WGSL keywords, reserved words and the builtin/helper names this backend
// emits; user function names colliding with these are prefixed
module.exports = {
  WGSLFunctionNode
};