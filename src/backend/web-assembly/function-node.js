const { utils } = require('../../utils');
const { FunctionNode } = require('../function-node');
const { WasmFunctionEmitter } = require('./wasm-builder');

/**
 * @desc [INTERNAL] Walks the traced AST and drives the WasmModuleBuilder to
 * emit one wasm function per kernel/helper function. Extends the base
 * FunctionNode: the type discipline (Integer/Number/LiteralInteger and the
 * numeric-promotion rules) is the WGSL node's, replicated as SEMANTICS —
 * every value is f32 unless the type system says Integer (i32) or Boolean
 * (i32 0/1). `/` and `%` are always f32; bitwise operators are real i32 ops.
 *
 * The walk runs twice per function. toString() is the ANALYSIS pass over a
 * NoopEmitter: it resolves types (return types, helper argument inference),
 * records calledFunctions for FunctionBuilder's trace, and collects which
 * math imports / Math.random the function uses — all before any module
 * exists. emitFunction() is the BYTECODE pass over a real emitter; it can
 * run more than once (the kernel rebuilds per size signature, offsets are
 * baked) and every walk resets its own locals/depth state.
 *
 * Thread-dependence (for the SIMD phase's lane-divergence qualification) is
 * tracked during analysis: `this.thread.x` is the lane axis, so a value is
 * thread-dependent when its expression reads thread.x, draws Math.random
 * (per-cell stream), calls a user function (conservative — helpers may read
 * thread state internally), or reads a local previously assigned from a
 * thread-dependent expression (linear-order taint, never cleared). Every
 * if/ternary/loop/switch condition is recorded in `this.uniformity` with
 * its thread-dependence.
 */

// silently swallows every opcode so the analysis pass shares the emission
// walk verbatim; local indices still advance so shapes stay plausible
class NoopEmitter {
  constructor() {
    this.localCount = 0;
  }
  addLocal() {
    return this.localCount++;
  }
}
for (const name of Object.getOwnPropertyNames(WasmFunctionEmitter.prototype)) {
  if (name === 'constructor' || name === 'addLocal') continue;
  if (typeof WasmFunctionEmitter.prototype[name] !== 'function') continue;
  NoopEmitter.prototype[name] = function() {
    return this;
  };
}

// Math.* with no native wasm opcode, imported as env.math_<name>; the JS
// function computes in f64 and the (f32)->f32 import signature demotes the
// result, matching the fround(<f64 result>) precision of the GL backends
const MATH_IMPORT_ARITY = {
  sin: 1,
  cos: 1,
  tan: 1,
  asin: 1,
  acos: 1,
  atan: 1,
  atan2: 2,
  sinh: 1,
  cosh: 1,
  tanh: 1,
  asinh: 1,
  acosh: 1,
  atanh: 1,
  exp: 1,
  expm1: 1,
  log: 1,
  log2: 1,
  log10: 1,
  log1p: 1,
  cbrt: 1,
  pow: 2,
  sign: 1,
};

// Math.* with a native f32 opcode
const MATH_NATIVE_OPS = {
  abs: 'f32Abs',
  floor: 'f32Floor',
  ceil: 'f32Ceil',
  sqrt: 'f32Sqrt',
  trunc: 'f32Trunc',
};

const F32_ARITH = {
  '+': 'f32Add',
  '-': 'f32Sub',
  '*': 'f32Mul',
};
const I32_ARITH = {
  '+': 'i32Add',
  '-': 'i32Sub',
  '*': 'i32Mul',
};
const F32_COMPARE = {
  '==': 'f32Eq',
  '===': 'f32Eq',
  '!=': 'f32Ne',
  '!==': 'f32Ne',
  '<': 'f32Lt',
  '>': 'f32Gt',
  '<=': 'f32Le',
  '>=': 'f32Ge',
};
const I32_COMPARE = {
  '==': 'i32Eq',
  '===': 'i32Eq',
  '!=': 'i32Ne',
  '!==': 'i32Ne',
  '<': 'i32LtS',
  '>': 'i32GtS',
  '<=': 'i32LeS',
  '>=': 'i32GeS',
};
const BITWISE_OPS = {
  '&': 'i32And',
  '|': 'i32Or',
  '^': 'i32Xor',
  '<<': 'i32Shl',
  '>>': 'i32ShrS',
  '>>>': 'i32ShrU',
};

// f32x4/i32x4 lane ops are IEEE/two's-complement identical to their scalar
// counterparts, which is what makes run() and run_simd() bit-identical
const VF32_ARITH = {
  '+': 'f32x4Add',
  '-': 'f32x4Sub',
  '*': 'f32x4Mul',
};
const VI32_ARITH = {
  '+': 'i32x4Add',
  '-': 'i32x4Sub',
  '*': 'i32x4Mul',
};
const VF32_COMPARE = {
  '==': 'f32x4Eq',
  '===': 'f32x4Eq',
  '!=': 'f32x4Ne',
  '!==': 'f32x4Ne',
  '<': 'f32x4Lt',
  '>': 'f32x4Gt',
  '<=': 'f32x4Le',
  '>=': 'f32x4Ge',
};
const VI32_COMPARE = {
  '==': 'i32x4Eq',
  '===': 'i32x4Eq',
  '!=': 'i32x4Ne',
  '!==': 'i32x4Ne',
  '<': 'i32x4LtS',
  '>': 'i32x4GtS',
  '<=': 'i32x4LeS',
  '>=': 'i32x4GeS',
};
const VECTOR_SHIFT_OPS = {
  '<<': 'i32x4Shl',
  '>>': 'i32x4ShrS',
  '>>>': 'i32x4ShrU',
};
const VECTOR_MATH_NATIVE_OPS = {
  abs: 'f32x4Abs',
  floor: 'f32x4Floor',
  ceil: 'f32x4Ceil',
  sqrt: 'f32x4Sqrt',
  trunc: 'f32x4Trunc',
};

function scalarWasmType(type) {
  switch (type) {
    case 'Number':
    case 'Float':
    case 'LiteralInteger':
      return 'f32';
    case 'Integer':
    case 'Boolean':
      return 'i32';
    default:
      throw new Error(`WebAssembly backend does not yet support ${ type } arguments to helper functions`);
  }
}

class WebAssemblyFunctionNode extends FunctionNode {
  constructor(source, settings) {
    super(source, settings);
    this.assembler = null;
    this.em = null;
    this.locals = null;
    this.depth = 0;
    this.loopStack = null;
    this.usedMathImports = new Set();
    this.usesRandom = false;
    this.readsThread = false;
    this.taintedLocals = null;
    this.uniformity = [];
    this._analysisDone = false;
    this._analysisPass = false;
    // SIMD (f32x4) emission state; vec is false for every scalar walk
    this.vec = false;
    this.vMaskDepth = 0;
    this.vCur = -1;
    this.vRetMask = -1;
    this.vTerminated = false;
    this.vInfo = null;
    this._vBaseX = -1;
  }

  // wasm function names live in their own namespace but the fn_ prefix keeps
  // user names clear of 'kernel', 'run', 'pcg_random' and the math_ imports
  mangleFunctionName(name) {
    return `fn_${ utils.sanitizeName(name) }`;
  }

  /**
   * A ternary with an integer consequent but a float alternate promotes to
   * float (the WGSL node's rule); the type system must agree with what
   * exprConditional emits or the enclosing expression converts wrongly.
   */
  getType(ast) {
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

  /**
   * FunctionBuilder drives tracing through toString(); for this backend that
   * is the analysis pass — no text exists, the return value is always ''.
   */
  toString() {
    if (!this._analysisDone) {
      this._analysisDone = true;
      this._analysisPass = true;
      this.walkFunction(new NoopEmitter());
      this._analysisPass = false;
    }
    return '';
  }

  /**
   * Bytecode pass. `assembler` carries the module builder, the kernel's
   * baked memory layout and the shared global indices; it changes per size
   * signature, so this may run repeatedly on one node.
   * @param {Object} assembler
   */
  emitFunction(assembler) {
    this.assembler = assembler;
    const { module } = assembler;
    let em;
    if (this.isRootKernel) {
      em = module.addFunction('kernel', { params: [], results: [] });
    } else {
      const params = this.argumentTypes.map(type => scalarWasmType(type === 'LiteralInteger' ? 'Number' : type));
      const results = [];
      if (this.returnType) {
        switch (this.returnType) {
          case 'Integer':
          case 'Boolean':
            results.push('i32');
            break;
          case 'Number':
          case 'Float':
          case 'LiteralInteger':
            results.push('f32');
            break;
          default:
            throw new Error(`WebAssembly backend does not yet support helper functions returning ${ this.returnType }`);
        }
      }
      em = module.addFunction(this.mangleFunctionName(this.name), { params, results });
    }
    this.walkFunction(em);
    if (!this.isRootKernel && this.returnType) {
      // a fall-off path in a result-typed function cannot validate; in JS it
      // would return undefined, which no kernel contract allows either
      em.unreachable();
    }
    return em;
  }

  walkFunction(em) {
    this.em = em;
    this.locals = new Map();
    this.depth = 0;
    this.loopStack = [];
    this.taintedLocals = new Set();
    const ast = this.getJsAST();
    if (this.isRootKernel) {
      // a scalar argument the kernel assigns to gets a local copy per cell:
      // JS (and the cpu backend) give every cell a fresh binding, so writing
      // the shared memory slot would leak the mutation into later cells
      for (const name of this.collectAssignedArgumentNames(ast)) {
        const argumentIndex = this.argumentNames.indexOf(name);
        const gtype = this.argumentTypes[argumentIndex];
        if (gtype !== 'Number' && gtype !== 'Float' && gtype !== 'Integer' && gtype !== 'Boolean') continue;
        const slot = this.assembler ? this.assembler.layout.scalars[name] : null;
        const offset = slot ? slot.offset : 0;
        const wtype = gtype === 'Integer' || gtype === 'Boolean' ? 'i32' : 'f32';
        const index = em.addLocal(wtype);
        em.i32Const(0);
        if (wtype === 'i32') em.i32Load(offset);
        else em.f32Load(offset);
        em.localSet(index);
        this.locals.set(name, { kind: 'scalar', index, wtype, gtype });
      }
    }
    if (!this.isRootKernel) {
      for (let i = 0; i < this.argumentNames.length; i++) {
        const name = this.argumentNames[i];
        let argumentType = this.argumentTypes[i];
        if (!argumentType) {
          throw this.astErrorOutput(`Unknown argument ${ name } type`, ast);
        }
        if (argumentType === 'LiteralInteger') {
          this.argumentTypes[i] = argumentType = 'Number';
        }
        this.locals.set(name, {
          kind: 'scalar',
          index: i,
          wtype: scalarWasmType(argumentType),
          gtype: argumentType,
        });
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
    }
    const body = ast.body.body;
    for (let i = 0; i < body.length; i++) {
      this.statement(body[i]);
    }
  }

  collectAssignedArgumentNames(ast) {
    const names = new Set();
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(walk);
      if (node.type === 'FunctionDeclaration' && node !== ast) return;
      if (node.type === 'AssignmentExpression' && node.left.type === 'Identifier' &&
        this.argumentNames.indexOf(node.left.name) !== -1) {
        names.add(node.left.name);
      }
      if (node.type === 'UpdateExpression' && node.argument.type === 'Identifier' &&
        this.argumentNames.indexOf(node.argument.name) !== -1) {
        names.add(node.argument.name);
      }
      for (const key in node) {
        if (key === 'loc' || key === 'start' || key === 'end' || key === 'parent') continue;
        const child = node[key];
        if (child && typeof child === 'object') walk(child);
      }
    };
    walk(ast.body);
    return names;
  }

  // block-depth bookkeeping: br targets are recorded as the depth right
  // after their construct opened, so a branch is always depth - level
  enterBlock(type) {
    this.em.block(type);
    this.depth++;
  }
  enterLoop(type) {
    this.em.loop(type);
    this.depth++;
  }
  enterIf(type) {
    this.em.if_(type);
    this.depth++;
  }
  exit() {
    this.em.end();
    this.depth--;
  }
  brTo(level) {
    this.em.br(this.depth - level);
  }
  brIfTo(level) {
    this.em.brIf(this.depth - level);
  }

  get loopMax() {
    return parseInt(this.loopMaxIterations, 10) || 1000;
  }

  // ------------------------------------------------------------------ types

  /**
   * Converts the wasm value on the stack top between categories. bool is an
   * i32 constrained to 0/1, so bool→i32 is free and i32→bool renormalizes.
   */
  coerce(from, to) {
    if (from === to) return to;
    if (from === 'void') {
      throw new Error('cannot use a void expression as a value');
    }
    switch (to) {
      case 'f32':
        this.em.f32ConvertI32S();
        return 'f32';
      case 'i32':
        if (from === 'f32') this.em.i32TruncSatF32S();
        return 'i32';
      case 'bool':
        if (from === 'f32') {
          this.em.f32Const(0).f32Ne();
        } else {
          this.em.i32Eqz().i32Eqz();
        }
        return 'bool';
      default:
        throw new Error(`unknown wasm value category ${ to }`);
    }
  }

  castLiteralToInteger(ast) {
    this.pushState('casting-to-integer');
    const type = this.expression(ast);
    this.popState('casting-to-integer');
    this.coerce(type, 'i32');
    return 'i32';
  }

  castLiteralToFloat(ast) {
    this.pushState('casting-to-float');
    const type = this.expression(ast);
    this.popState('casting-to-float');
    this.coerce(type, 'f32');
    return 'f32';
  }

  castValueToInteger(ast) {
    this.pushState('casting-to-integer');
    const type = this.expression(ast);
    this.popState('casting-to-integer');
    this.coerce(type, 'i32');
    return 'i32';
  }

  castValueToFloat(ast) {
    this.pushState('casting-to-float');
    const type = this.expression(ast);
    this.popState('casting-to-float');
    this.coerce(type, 'f32');
    return 'f32';
  }

  /**
   * Emits `ast` guaranteed to leave `want` on the stack, choosing the cast
   * path by the type system's verdict, like the WGSL node's per-case
   * castValue/castLiteral dispatches.
   */
  emitByType(ast, want) {
    const type = this.getType(ast);
    if (want === 'f32') {
      if (type === 'Integer') return this.castValueToFloat(ast);
      if (type === 'LiteralInteger') return this.castLiteralToFloat(ast);
      this.coerce(this.expression(ast), 'f32');
      return 'f32';
    }
    if (type === 'Number' || type === 'Float') return this.castValueToInteger(ast);
    if (type === 'LiteralInteger') return this.castLiteralToInteger(ast);
    this.coerce(this.expression(ast), 'i32');
    return 'i32';
  }

  /**
   * JS truthiness for conditions: comparisons pass through, numbers test
   * against zero. Guards short-circuit code from ever seeing a raw f32.
   */
  emitCondition(ast) {
    const type = this.expression(ast);
    if (type === 'bool') return;
    if (type === 'i32') {
      this.em.i32Eqz().i32Eqz();
      return;
    }
    if (type === 'f32') {
      this.em.f32Const(0).f32Ne();
      return;
    }
    throw this.astErrorOutput('cannot use a void expression as a condition', ast);
  }

  // ------------------------------------------------------------- statements

  statement(ast) {
    switch (ast.type) {
      case 'VariableDeclaration':
        return this.stmtVariableDeclaration(ast);
      case 'ExpressionStatement':
        return this.statementExpression(ast.expression);
      case 'ReturnStatement':
        return this.stmtReturn(ast);
      case 'IfStatement':
        return this.stmtIf(ast);
      case 'ForStatement':
        return this.stmtFor(ast);
      case 'WhileStatement':
        return this.stmtWhile(ast);
      case 'DoWhileStatement':
        return this.stmtDoWhile(ast);
      case 'BlockStatement': {
        for (let i = 0; i < ast.body.length; i++) {
          this.statement(ast.body[i]);
        }
        return;
      }
      case 'BreakStatement':
        return this.stmtBreak(ast);
      case 'ContinueStatement':
        return this.stmtContinue(ast);
      case 'SwitchStatement':
        return this.stmtSwitch(ast);
      case 'FunctionDeclaration':
        // nested helpers are separate function nodes via onNestedFunction
        if (this.isChildFunction(ast)) return;
        throw this.astErrorOutput('unexpected function declaration', ast);
      case 'EmptyStatement':
      case 'DebuggerStatement':
        return;
      default:
        throw this.astErrorOutput(`Unknown statement type ${ ast.type }`, ast);
    }
  }

  statementExpression(expression) {
    switch (expression.type) {
      case 'AssignmentExpression':
        return this.emitAssignment(expression);
      case 'UpdateExpression':
        this.emitUpdate(expression, true);
        return;
      case 'SequenceExpression': {
        for (let i = 0; i < expression.expressions.length; i++) {
          this.statementExpression(expression.expressions[i]);
        }
        return;
      }
      case 'Identifier':
      case 'Literal':
        return; // a discarded value is a no-op
      default: {
        const type = this.expression(expression);
        if (type !== 'void') this.em.drop();
      }
    }
  }

  stmtVariableDeclaration(varDecNode) {
    const declarations = varDecNode.declarations;
    if (!declarations || !declarations[0] || !declarations[0].init) {
      throw this.astErrorOutput('Unexpected expression', varDecNode);
    }
    for (let i = 0; i < declarations.length; i++) {
      const declaration = declarations[i];
      const init = declaration.init;
      const info = this.getDeclaration(declaration.id);
      const actualType = this.getType(init);
      const name = declaration.id.name;

      if (actualType === 'Array(2)' || actualType === 'Array(3)' || actualType === 'Array(4)') {
        this.declareVecLocal(name, actualType, init, info, varDecNode);
        if (this.isThreadDependent(init)) this.taintedLocals.add(name);
        continue;
      }

      let type = actualType;
      if (type === 'LiteralInteger') {
        type = info.suggestedType === 'Integer' ? 'Integer' : 'Number';
      }
      if (actualType === 'Integer' && type === 'Integer') {
        // int-typed initializers decay to float declarations (the WebGL
        // backend's long-standing behavior; tests depend on the decay)
        info.valueType = 'Number';
        this.setScalarLocal(name, 'f32', 'Number', () => this.castValueToFloat(init));
      } else {
        info.valueType = type;
        switch (type) {
          case 'Number':
          case 'Float':
            this.setScalarLocal(name, 'f32', type, () => {
              if (actualType === 'LiteralInteger') this.castLiteralToFloat(init);
              else if (actualType === 'Integer') this.castValueToFloat(init);
              else this.coerce(this.expression(init), 'f32');
            });
            break;
          case 'Integer':
            this.setScalarLocal(name, 'i32', 'Integer', () => {
              if (actualType === 'LiteralInteger') this.castLiteralToInteger(init);
              else if (actualType === 'Number' || actualType === 'Float') this.castValueToInteger(init);
              else this.coerce(this.expression(init), 'i32');
            });
            break;
          case 'Boolean':
            this.setScalarLocal(name, 'i32', 'Boolean', () => this.emitCondition(init));
            break;
          default:
            throw this.astErrorOutput(`WebAssembly backend does not yet support declaring type ${ type }`, varDecNode);
        }
      }
      if (this.isThreadDependent(init)) this.taintedLocals.add(name);
    }
  }

  setScalarLocal(name, wtype, gtype, emitInit) {
    let local = this.locals.get(name);
    if (!local || local.kind !== 'scalar' || local.wtype !== wtype) {
      local = {
        kind: 'scalar',
        index: this.em.addLocal(wtype),
        wtype,
        gtype
      };
      this.locals.set(name, local);
    } else {
      local.gtype = gtype;
    }
    emitInit();
    this.em.localSet(local.index);
  }

  /**
   * Array(n) locals live as n consecutive f32 locals — wasm has no aggregate
   * values outside memory, and these never escape the function.
   */
  declareVecLocal(name, type, init, info, varDecNode) {
    const n = parseInt(type.substring(6), 10);
    info.valueType = type;
    let local = this.locals.get(name);
    if (!local || local.kind !== 'vec' || local.n !== n) {
      const indices = [];
      for (let c = 0; c < n; c++) indices.push(this.em.addLocal('f32'));
      local = {
        kind: 'vec',
        indices,
        n,
        gtype: type
      };
      this.locals.set(name, local);
    }
    if (init.type === 'ArrayExpression') {
      for (let c = 0; c < n; c++) {
        this.emitArrayElement(init.elements[c]);
        this.em.localSet(local.indices[c]);
      }
      return;
    }
    if (init.type === 'Identifier') {
      const source = this.locals.get(init.name);
      if (source && source.kind === 'vec' && source.n === n) {
        for (let c = 0; c < n; c++) {
          this.em.localGet(source.indices[c]).localSet(local.indices[c]);
        }
        return;
      }
    }
    throw this.astErrorOutput(`WebAssembly backend does not yet support ${ type } initializer of type ${ init.type }`, varDecNode);
  }

  emitArrayElement(element) {
    switch (this.getType(element)) {
      case 'Integer':
        this.castValueToFloat(element);
        break;
      case 'LiteralInteger':
        this.castLiteralToFloat(element);
        break;
      default:
        this.coerce(this.expression(element), 'f32');
    }
  }

  emitAssignment(assNode) {
    if (assNode.left.type !== 'Identifier') {
      throw this.astErrorOutput(`WebAssembly backend does not yet support assignment to ${ assNode.left.type }`, assNode);
    }
    const name = assNode.left.name;
    const local = this.locals.get(name);
    let wtype = null;
    let store = null;
    if (local && local.kind === 'scalar') {
      wtype = local.wtype;
      store = () => this.em.localSet(local.index);
    } else if (!local && this.isRootKernel && this.argumentNames.indexOf(name) !== -1) {
      // scalar kernel arguments live in memory; JS allows assigning to them
      const gtype = this.argumentTypes[this.argumentNames.indexOf(name)];
      const slot = this.assembler ? this.assembler.layout.scalars[name] : null;
      // an array-typed argument has no scalar slot; defaulting its offset
      // would emit a store into the args region's base -- a silent clobber
      // of the first argument's first element
      if (this.assembler && !slot) {
        throw this.astErrorOutput(
          `WebAssembly backend does not yet support assigning to the array argument "${ name }"`, assNode);
      }
      const offset = slot ? slot.offset : 0;
      wtype = gtype === 'Integer' || gtype === 'Boolean' ? 'i32' : 'f32';
      this.em.i32Const(0); // store address before the value
      store = () => (wtype === 'i32' ? this.em.i32Store(offset) : this.em.f32Store(offset));
    } else {
      throw this.astErrorOutput(`cannot assign to "${ name }"`, assNode);
    }

    if (assNode.operator === '=') {
      const leftType = this.getType(assNode.left);
      const rightType = this.getType(assNode.right);
      if (leftType !== 'Integer' && rightType === 'Integer') {
        this.castValueToFloat(assNode.right);
        this.coerce('f32', wtype);
      } else if (leftType !== 'Integer' && rightType === 'LiteralInteger') {
        this.castLiteralToFloat(assNode.right);
        this.coerce('f32', wtype);
      } else if (leftType === 'Integer' && rightType === 'LiteralInteger') {
        this.castLiteralToInteger(assNode.right);
        this.coerce('i32', wtype);
      } else if (leftType === 'Integer' && (rightType === 'Number' || rightType === 'Float')) {
        this.castValueToInteger(assNode.right);
        this.coerce('i32', wtype);
      } else {
        this.coerce(this.expression(assNode.right), wtype);
      }
    } else {
      // `x op= y` lowers through the binary machinery as `x op y`; the
      // synthetic node has no positions and the type walk never keys on it
      const synthetic = {
        type: 'BinaryExpression',
        operator: assNode.operator.slice(0, -1),
        left: assNode.left,
        right: assNode.right,
      };
      this.coerce(this.exprBinary(synthetic), wtype);
    }
    store();
    if (this.isThreadDependent(assNode.right) || (assNode.operator !== '=' && this.taintedLocals.has(name))) {
      this.taintedLocals.add(name);
    }
  }

  emitUpdate(uNode, isStatement) {
    if (uNode.argument.type !== 'Identifier') {
      throw this.astErrorOutput('update expression needs a variable', uNode);
    }
    const local = this.locals.get(uNode.argument.name);
    if (!local || local.kind !== 'scalar') {
      throw this.astErrorOutput(`cannot update "${ uNode.argument.name }"`, uNode);
    }
    const isInt = local.wtype === 'i32';
    const one = () => (isInt ? this.em.i32Const(1) : this.em.f32Const(1));
    const op = uNode.operator === '++' ? (isInt ? 'i32Add' : 'f32Add') : (isInt ? 'i32Sub' : 'f32Sub');
    if (isStatement) {
      this.em.localGet(local.index);
      one();
      this.em[op]().localSet(local.index);
      return 'void';
    }
    if (uNode.prefix) {
      this.em.localGet(local.index);
      one();
      this.em[op]().localTee(local.index);
    } else {
      this.em.localGet(local.index).localGet(local.index);
      one();
      this.em[op]().localSet(local.index);
    }
    return local.wtype;
  }

  stmtReturn(ast) {
    if (!ast.argument) {
      if (this.isRootKernel) {
        this.em.return_();
        return;
      }
      throw this.astErrorOutput('Unexpected return statement', ast);
    }
    this.pushState('skip-literal-correction');
    const type = this.getType(ast.argument);
    this.popState('skip-literal-correction');
    if (!this.returnType) {
      this.returnType = type === 'LiteralInteger' || type === 'Integer' ? 'Number' : type;
    }
    if (this.isRootKernel) {
      return this.stmtRootReturn(ast, type);
    }
    if (this.isSubKernel) {
      throw this.astErrorOutput('WebAssembly backend does not yet support createKernelMap', ast);
    }
    switch (this.returnType) {
      case 'LiteralInteger':
      case 'Number':
      case 'Float':
        if (type === 'Integer') this.castValueToFloat(ast.argument);
        else if (type === 'LiteralInteger') this.castLiteralToFloat(ast.argument);
        else this.coerce(this.expression(ast.argument), 'f32');
        break;
      case 'Integer':
        if (type === 'Float' || type === 'Number') this.castValueToInteger(ast.argument);
        else if (type === 'LiteralInteger') this.castLiteralToInteger(ast.argument);
        else this.coerce(this.expression(ast.argument), 'i32');
        break;
      case 'Boolean':
        this.emitCondition(ast.argument);
        break;
      default:
        throw this.astErrorOutput(`unhandled return type ${ this.returnType }`, ast);
    }
    this.em.return_();
  }

  /**
   * The root kernel stores into the output region at data_index (a shared
   * global the run loop advances) and returns — the wasm-level return makes
   * JS early returns exact at any nesting depth.
   */
  stmtRootReturn(ast, type) {
    const globals = this.assembler ? this.assembler.globals : { dataIndex: 0 };
    const outputOffset = this.assembler ? this.assembler.layout.outputOffset : 0;
    switch (this.returnType) {
      case 'Array(2)':
      case 'Array(3)':
      case 'Array(4)': {
        const n = parseInt(this.returnType.substring(6), 10);
        const argument = ast.argument;
        if (argument.type === 'ArrayExpression') {
          if (argument.elements.length !== n) {
            throw this.astErrorOutput(`expected ${ n } array elements to match return type ${ this.returnType }`, ast);
          }
          for (let c = 0; c < n; c++) {
            this.emitComponentAddress(globals.dataIndex, n, c);
            this.emitArrayElement(argument.elements[c]);
            this.em.f32Store(outputOffset);
          }
        } else if (argument.type === 'Identifier') {
          const local = this.locals.get(argument.name);
          if (!local || local.kind !== 'vec' || local.n !== n) {
            throw this.astErrorOutput(`"${ argument.name }" is not an Array(${ n }) variable`, ast);
          }
          for (let c = 0; c < n; c++) {
            this.emitComponentAddress(globals.dataIndex, n, c);
            this.em.localGet(local.indices[c]);
            this.em.f32Store(outputOffset);
          }
        } else {
          throw this.astErrorOutput(`WebAssembly backend does not yet support returning ${ this.returnType } from a ${ argument.type }`, ast);
        }
        this.em.return_();
        return;
      }
      default: {
        this.emitComponentAddress(globals.dataIndex, 1, 0);
        switch (this.returnType) {
          case 'Integer':
            // result[data_index] = f32(i32(value)) — the WGSL node's exact
            // double conversion, truncation included
            if (type === 'Float' || type === 'Number') this.castValueToInteger(ast.argument);
            else if (type === 'LiteralInteger') this.castLiteralToInteger(ast.argument);
            else this.coerce(this.expression(ast.argument), 'i32');
            this.em.f32ConvertI32S();
            break;
          case 'LiteralInteger':
          case 'Number':
          case 'Float':
            if (type === 'Integer') this.castValueToFloat(ast.argument);
            else if (type === 'LiteralInteger') this.castLiteralToFloat(ast.argument);
            else this.coerce(this.expression(ast.argument), 'f32');
            break;
          case 'Boolean':
            this.emitCondition(ast.argument);
            this.em.f32ConvertI32S();
            break;
          default:
            throw this.astErrorOutput(`WebAssembly backend does not yet support returning ${ this.returnType }`, ast);
        }
        this.em.f32Store(outputOffset);
        this.em.return_();
      }
    }
  }

  emitComponentAddress(dataIndexGlobal, componentCount, component) {
    this.em.globalGet(dataIndexGlobal);
    if (componentCount !== 1) {
      this.em.i32Const(componentCount).i32Mul();
      if (component !== 0) this.em.i32Const(component).i32Add();
    }
    this.em.i32Const(2).i32Shl();
  }

  stmtIf(ifNode) {
    this.recordUniformity('if', ifNode.test);
    this.emitCondition(ifNode.test);
    this.enterIf();
    this.statement(ifNode.consequent);
    if (ifNode.alternate) {
      this.em.else_();
      this.statement(ifNode.alternate);
    }
    this.exit();
  }

  /**
   * Safe loops (literal-init counter, safe test — the WGSL node's exact
   * criteria) run unbounded; everything else is capped at loopMaxIterations
   * like the GL backends' LOOP_MAX. The continue target sits BEFORE the
   * update clause, so `continue` still advances the counter.
   */
  /**
   * The WGSL node's exact safe-loop criteria: literal-init single declarator,
   * safe test and init, both test and update present. Shared with the SIMD
   * walk so the LOOP_MAX cap fires identically on both paths.
   */
  forLoopIsSafe(forNode) {
    let isSafe = null;
    if (forNode.init) {
      const declarations = forNode.init.declarations;
      if (declarations) {
        if (declarations.length > 1) isSafe = false;
        for (let i = 0; i < declarations.length; i++) {
          if (declarations[i].init && declarations[i].init.type !== 'Literal') isSafe = false;
        }
      } else {
        isSafe = false;
      }
    } else {
      isSafe = false;
    }
    if (!forNode.test || !forNode.update) isSafe = false;
    if (isSafe === null) {
      isSafe = this.isSafe(forNode.init) && this.isSafe(forNode.test);
    }
    return isSafe;
  }

  stmtFor(forNode) {
    if (forNode.type !== 'ForStatement') {
      throw this.astErrorOutput('Invalid for statement', forNode);
    }
    const isSafe = this.forLoopIsSafe(forNode);
    this.recordUniformity('for', forNode.test || null);

    if (forNode.init) {
      if (forNode.init.type === 'VariableDeclaration') this.stmtVariableDeclaration(forNode.init);
      else this.statementExpression(forNode.init);
    }
    let safeI = -1;
    if (!isSafe) {
      safeI = this.em.addLocal('i32');
      this.em.i32Const(0).localSet(safeI);
    }
    this.enterBlock();
    const breakLevel = this.depth;
    this.enterLoop();
    const loopLevel = this.depth;
    if (!isSafe) {
      this.em.localGet(safeI).i32Const(this.loopMax).i32GeS();
      this.brIfTo(breakLevel);
    }
    if (forNode.test) {
      this.emitCondition(forNode.test);
      this.em.i32Eqz();
      this.brIfTo(breakLevel);
    }
    this.enterBlock();
    const continueLevel = this.depth;
    this.loopStack.push({ breakLevel, continueLevel });
    if (forNode.body) this.statement(forNode.body);
    this.loopStack.pop();
    this.exit();
    if (forNode.update) this.statementExpression(forNode.update);
    if (!isSafe) {
      this.em.localGet(safeI).i32Const(1).i32Add().localSet(safeI);
    }
    this.brTo(loopLevel);
    this.exit();
    this.exit();
  }

  stmtWhile(whileNode) {
    if (whileNode.type !== 'WhileStatement') {
      throw this.astErrorOutput('Invalid while statement', whileNode);
    }
    this.recordUniformity('while', whileNode.test);
    const safeI = this.em.addLocal('i32');
    this.em.i32Const(0).localSet(safeI);
    this.enterBlock();
    const breakLevel = this.depth;
    this.enterLoop();
    const loopLevel = this.depth;
    this.em.localGet(safeI).i32Const(this.loopMax).i32GeS();
    this.brIfTo(breakLevel);
    this.emitCondition(whileNode.test);
    this.em.i32Eqz();
    this.brIfTo(breakLevel);
    this.enterBlock();
    const continueLevel = this.depth;
    this.loopStack.push({ breakLevel, continueLevel });
    this.statement(whileNode.body);
    this.loopStack.pop();
    this.exit();
    this.em.localGet(safeI).i32Const(1).i32Add().localSet(safeI);
    this.brTo(loopLevel);
    this.exit();
    this.exit();
  }

  stmtDoWhile(doWhileNode) {
    if (doWhileNode.type !== 'DoWhileStatement') {
      throw this.astErrorOutput('Invalid while statement', doWhileNode);
    }
    this.recordUniformity('do-while', doWhileNode.test);
    const safeI = this.em.addLocal('i32');
    this.em.i32Const(0).localSet(safeI);
    this.enterBlock();
    const breakLevel = this.depth;
    this.enterLoop();
    const loopLevel = this.depth;
    this.em.localGet(safeI).i32Const(this.loopMax).i32GeS();
    this.brIfTo(breakLevel);
    this.enterBlock();
    // JS continue in do-while jumps to the test, which sits after the body
    const continueLevel = this.depth;
    this.loopStack.push({ breakLevel, continueLevel });
    this.statement(doWhileNode.body);
    this.loopStack.pop();
    this.exit();
    this.em.localGet(safeI).i32Const(1).i32Add().localSet(safeI);
    this.emitCondition(doWhileNode.test);
    this.brIfTo(loopLevel);
    this.exit();
    this.exit();
  }

  stmtBreak(brNode) {
    const target = this.loopStack[this.loopStack.length - 1];
    if (!target) {
      throw this.astErrorOutput('break used outside of a loop', brNode);
    }
    this.brTo(target.breakLevel);
  }

  stmtContinue(crNode) {
    const target = this.loopStack[this.loopStack.length - 1];
    if (!target) {
      throw this.astErrorOutput('continue used outside of a loop', crNode);
    }
    this.brTo(target.continueLevel);
  }

  /**
   * The switch lowers to an if/else chain on a discriminant local, exactly
   * like the WGSL node: a case-terminating break is consumed, empty cases
   * fall through by OR-ing their tests into the next case, a non-final
   * default moves to the chain's end.
   */
  stmtSwitch(ast) {
    if (ast.type !== 'SwitchStatement') {
      throw this.astErrorOutput('Invalid switch statement', ast);
    }
    const { discriminant, cases } = ast;
    const type = this.getType(discriminant);
    this.recordUniformity('switch', discriminant);
    let dLocal;
    let dIsInt;
    switch (type) {
      case 'Float':
      case 'Number':
        dIsInt = false;
        dLocal = this.em.addLocal('f32');
        this.coerce(this.expression(discriminant), 'f32');
        this.em.localSet(dLocal);
        break;
      case 'Integer':
        dIsInt = true;
        dLocal = this.em.addLocal('i32');
        this.coerce(this.expression(discriminant), 'i32');
        this.em.localSet(dLocal);
        break;
      default:
        throw this.astErrorOutput(`Unhandled switch discriminant type "${ type }"`, ast);
    }
    if (cases.length === 1 && !cases[0].test) {
      this.emitSwitchConsequent(cases[0].consequent);
      return;
    }
    const { groups, defaultConsequent } = this.collectSwitchGroups(cases);
    const emitChain = (index) => {
      if (index === groups.length) {
        if (defaultConsequent) this.emitSwitchConsequent(defaultConsequent);
        return false;
      }
      const { tests, consequent } = groups[index];
      for (let i = 0; i < tests.length; i++) {
        this.em.localGet(dLocal);
        this.emitSwitchTest(tests[i], dIsInt);
        if (dIsInt) this.em.i32Eq();
        else this.em.f32Eq();
        if (i > 0) this.em.i32Or();
      }
      this.enterIf();
      this.emitSwitchConsequent(consequent);
      const hasMore = index + 1 < groups.length || defaultConsequent;
      if (hasMore) {
        this.em.else_();
        emitChain(index + 1);
      }
      this.exit();
      return true;
    };
    emitChain(0);
  }

  emitSwitchTest(test, dIsInt) {
    const testType = this.getType(test);
    if (dIsInt) {
      if (testType === 'Number' || testType === 'Float') this.castValueToInteger(test);
      else if (testType === 'LiteralInteger') this.castLiteralToInteger(test);
      else this.coerce(this.expression(test), 'i32');
    } else {
      if (testType === 'LiteralInteger') this.castLiteralToFloat(test);
      else if (testType === 'Integer') this.castValueToFloat(test);
      else this.coerce(this.expression(test), 'f32');
    }
  }

  /**
   * Fallthrough-empty-case grouping shared between the scalar and SIMD
   * lowering: empty cases OR their tests into the next non-empty case, a
   * non-final default moves to the chain's end.
   */
  collectSwitchGroups(cases) {
    let defaultConsequent = null;
    const groups = [];
    let pendingTests = [];
    for (let i = 0; i < cases.length; i++) {
      if (!cases[i].test) {
        defaultConsequent = cases[i].consequent;
        continue;
      }
      pendingTests.push(cases[i].test);
      if (cases[i].consequent && cases[i].consequent.length > 0) {
        groups.push({ tests: pendingTests, consequent: cases[i].consequent });
        pendingTests = [];
      }
    }
    return { groups, defaultConsequent };
  }

  collectSwitchCaseStatements(consequent) {
    const statements = [];
    for (let i = 0; i < consequent.length; i++) {
      if (consequent[i].type === 'BreakStatement') break;
      statements.push(consequent[i]);
    }
    // a break deeper inside a case would emit as a loop break; same guard as
    // the WGSL and GL backends
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
    for (let i = 0; i < statements.length; i++) {
      if (containsBreak(statements[i])) {
        throw this.astErrorOutput('break inside a switch case is only supported as the case terminator', statements[i]);
      }
    }
    return statements;
  }

  emitSwitchConsequent(consequent) {
    const statements = this.collectSwitchCaseStatements(consequent);
    for (let i = 0; i < statements.length; i++) {
      this.statement(statements[i]);
    }
  }

  // ------------------------------------------------------------ expressions

  /**
   * Emits `ast`, leaving exactly one value on the stack; returns its wasm
   * category: 'f32' | 'i32' | 'bool' (i32 0/1) | 'void'.
   */
  expression(ast) {
    switch (ast.type) {
      case 'Literal':
        return this.exprLiteral(ast);
      case 'Identifier':
        return this.exprIdentifier(ast);
      case 'BinaryExpression':
        return this.exprBinary(ast);
      case 'LogicalExpression':
        return this.exprLogical(ast);
      case 'UnaryExpression':
        return this.exprUnary(ast);
      case 'UpdateExpression':
        return this.emitUpdate(ast, false);
      case 'ConditionalExpression':
        return this.exprConditional(ast);
      case 'CallExpression':
        return this.exprCall(ast);
      case 'MemberExpression':
        return this.exprMember(ast);
      case 'ThisExpression':
        throw this.astErrorOutput('unexpected bare `this`', ast);
      case 'SequenceExpression': {
        if (ast.expressions.length === 1) return this.expression(ast.expressions[0]);
        throw this.astErrorOutput('WebAssembly backend does not yet support the comma operator', ast);
      }
      case 'AssignmentExpression':
        throw this.astErrorOutput('WebAssembly backend does not yet support assignment used as an expression', ast);
      case 'ArrayExpression':
        throw this.astErrorOutput('array literals are only supported as variable initializers and kernel returns', ast);
      default:
        throw this.astErrorOutput(`Unknown expression type ${ ast.type }`, ast);
    }
  }

  exprLiteral(ast) {
    if (ast.value === true || ast.value === false) {
      this.em.i32Const(ast.value ? 1 : 0);
      return 'bool';
    }
    if (isNaN(ast.value)) {
      throw this.astErrorOutput('Non-numeric literal not supported : ' + ast.value, ast);
    }
    const key = this.astKey(ast);
    if (this.isState('casting-to-integer') || this.isState('building-integer')) {
      // the vector walk re-visits every literal after the scalar walk froze
      // its type; recording again could flip a type between the two walks
      // and break scalar/SIMD bit-identity on the next rebuild
      if (!this.vec) this.literalTypes[key] = 'Integer';
      this.em.i32Const(Math.round(ast.value));
      return 'i32';
    }
    if (!this.vec) this.literalTypes[key] = 'Number';
    this.em.f32Const(ast.value);
    return 'f32';
  }

  exprIdentifier(idtNode) {
    if (idtNode.type !== 'Identifier') {
      throw this.astErrorOutput('IdentifierExpression - not an Identifier', idtNode);
    }
    if (idtNode.name === 'Infinity') {
      this.em.f32Const(Infinity);
      return 'f32';
    }
    const local = this.locals.get(idtNode.name);
    if (local) {
      if (local.kind === 'vec') {
        throw this.astErrorOutput(`array-valued variable "${ idtNode.name }" can only be indexed or returned`, idtNode);
      }
      this.em.localGet(local.index);
      return local.gtype === 'Boolean' ? 'bool' : local.wtype;
    }
    const argumentIndex = this.argumentNames.indexOf(idtNode.name);
    if (argumentIndex !== -1 && this.isRootKernel) {
      const type = this.argumentTypes[argumentIndex];
      const slot = this.assembler ? this.assembler.layout.scalars[idtNode.name] : null;
      const offset = slot ? slot.offset : 0;
      this.em.i32Const(0);
      switch (type) {
        case 'Integer':
          this.em.i32Load(offset);
          return 'i32';
        case 'Boolean':
          this.em.i32Load(offset);
          return 'bool';
        case 'Number':
        case 'Float':
          this.em.f32Load(offset);
          return 'f32';
        default:
          throw this.astErrorOutput(`argument "${ idtNode.name }" of type ${ type } cannot be read as a scalar`, idtNode);
      }
    }
    throw this.astErrorOutput(`Unhandled identifier "${ idtNode.name }"`, idtNode);
  }

  exprBinary(ast) {
    const operator = ast.operator;

    if (operator === '**') {
      // JS Math.pow semantics exactly (pow(x, 0) === 1 for all x)
      this.emitByType(ast.left, 'f32');
      this.emitByType(ast.right, 'f32');
      this.usedMathImports.add('pow');
      this.em.call('math_pow');
      return 'f32';
    }

    if (BITWISE_OPS[operator]) {
      this.emitAsIntegerOperand(ast.left);
      this.emitAsIntegerOperand(ast.right);
      this.em[BITWISE_OPS[operator]]();
      return 'i32';
    }

    // `/` and `%` are always fractional in JavaScript, whatever the operand
    // types (base getType agrees); `%` is JS-truncated: a - trunc(a/b)*b
    if (operator === '/' || operator === '%') {
      if (operator === '/') {
        this.emitByType(ast.left, 'f32');
        this.emitByType(ast.right, 'f32');
        this.em.f32Div();
        return 'f32';
      }
      const a = this.em.addLocal('f32');
      const b = this.em.addLocal('f32');
      this.emitByType(ast.left, 'f32');
      this.em.localSet(a);
      this.emitByType(ast.right, 'f32');
      this.em.localSet(b);
      this.em.localGet(a).localGet(a).localGet(b).f32Div().f32Trunc().localGet(b).f32Mul().f32Sub();
      return 'f32';
    }

    const leftType = this.getType(ast.left) || 'Number';
    const rightType = this.getType(ast.right) || 'Number';
    const key = leftType + ' & ' + rightType;
    let category;
    switch (key) {
      case 'Integer & Integer':
        this.pushState('building-integer');
        this.coerce(this.expression(ast.left), 'i32');
        this.coerce(this.expression(ast.right), 'i32');
        this.popState('building-integer');
        category = 'i32';
        break;
      case 'Number & Float':
      case 'Float & Number':
      case 'Float & Float':
      case 'Number & Number':
        this.pushState('building-float');
        this.coerce(this.expression(ast.left), 'f32');
        this.coerce(this.expression(ast.right), 'f32');
        this.popState('building-float');
        category = 'f32';
        break;
      case 'LiteralInteger & LiteralInteger':
        if (this.isState('casting-to-integer') || this.isState('building-integer')) {
          this.pushState('building-integer');
          this.coerce(this.expression(ast.left), 'i32');
          this.coerce(this.expression(ast.right), 'i32');
          this.popState('building-integer');
          category = 'i32';
        } else {
          this.pushState('building-float');
          this.castLiteralToFloat(ast.left);
          this.castLiteralToFloat(ast.right);
          this.popState('building-float');
          category = 'f32';
        }
        break;
      case 'Integer & Float':
      case 'Integer & Number':
        // JavaScript promotes an integer combined with a fractional value to
        // fractional, whichever side the integer is on — `x * 0.5` must
        // agree with `0.5 * x`
        this.pushState('building-float');
        this.castValueToFloat(ast.left);
        this.coerce(this.expression(ast.right), 'f32');
        this.popState('building-float');
        category = 'f32';
        break;
      case 'Integer & LiteralInteger':
        this.pushState('building-integer');
        this.coerce(this.expression(ast.left), 'i32');
        this.castLiteralToInteger(ast.right);
        this.popState('building-integer');
        category = 'i32';
        break;
      case 'Number & Integer':
      case 'Float & Integer':
        this.pushState('building-float');
        this.coerce(this.expression(ast.left), 'f32');
        this.castValueToFloat(ast.right);
        this.popState('building-float');
        category = 'f32';
        break;
      case 'Float & LiteralInteger':
      case 'Number & LiteralInteger':
        this.pushState('building-float');
        this.coerce(this.expression(ast.left), 'f32');
        this.castLiteralToFloat(ast.right);
        this.popState('building-float');
        category = 'f32';
        break;
      case 'LiteralInteger & Float':
      case 'LiteralInteger & Number':
        if (this.isState('casting-to-integer')) {
          this.pushState('building-integer');
          this.castLiteralToInteger(ast.left);
          this.castValueToInteger(ast.right);
          this.popState('building-integer');
          category = 'i32';
        } else {
          this.pushState('building-float');
          this.castLiteralToFloat(ast.left);
          this.pushState('casting-to-float');
          this.coerce(this.expression(ast.right), 'f32');
          this.popState('casting-to-float');
          this.popState('building-float');
          category = 'f32';
        }
        break;
      case 'LiteralInteger & Integer':
        this.pushState('building-integer');
        this.castLiteralToInteger(ast.left);
        this.coerce(this.expression(ast.right), 'i32');
        this.popState('building-integer');
        category = 'i32';
        break;
      case 'Boolean & Boolean':
        this.coerce(this.expression(ast.left), 'i32');
        this.coerce(this.expression(ast.right), 'i32');
        category = 'i32';
        break;
      default:
        throw this.astErrorOutput(`Unhandled binary expression between ${ key }`, ast);
    }

    const compareOp = category === 'i32' ? I32_COMPARE[operator] : F32_COMPARE[operator];
    if (compareOp) {
      this.em[compareOp]();
      return 'bool';
    }
    const arithOp = category === 'i32' ? I32_ARITH[operator] : F32_ARITH[operator];
    if (!arithOp) {
      throw this.astErrorOutput(`Unhandled operator ${ operator }`, ast);
    }
    this.em[arithOp]();
    return category;
  }

  emitAsIntegerOperand(side) {
    switch (this.getType(side)) {
      case 'Number':
      case 'Float':
        this.castValueToInteger(side);
        break;
      case 'LiteralInteger':
        this.castLiteralToInteger(side);
        break;
      default: {
        this.pushState('building-integer');
        const type = this.expression(side);
        this.popState('building-integer');
        this.coerce(type, 'i32');
      }
    }
  }

  /**
   * Short-circuit is load-bearing, not an optimization: the right side may
   * guard an out-of-range memory read (`x > 0 && a[x - 1] > 0`).
   */
  exprLogical(logNode) {
    this.emitCondition(logNode.left);
    this.enterIf('i32');
    if (logNode.operator === '&&') {
      this.emitCondition(logNode.right);
      this.em.else_();
      this.em.i32Const(0);
    } else if (logNode.operator === '||') {
      this.em.i32Const(1);
      this.em.else_();
      this.emitCondition(logNode.right);
    } else {
      throw this.astErrorOutput(`Unhandled logical operator ${ logNode.operator }`, logNode);
    }
    this.exit();
    return 'bool';
  }

  exprUnary(uNode) {
    switch (uNode.operator) {
      case '~':
        this.emitAsIntegerOperand(uNode.argument);
        this.em.i32Const(-1).i32Xor();
        return 'i32';
      case '!':
        this.emitCondition(uNode.argument);
        this.em.i32Eqz();
        return 'bool';
      case '+':
        return this.expression(uNode.argument);
      case '-': {
        const type = this.getType(uNode.argument);
        const wantsInteger = type === 'Integer' ||
          (type === 'LiteralInteger' && (this.isState('casting-to-integer') || this.isState('building-integer')));
        if (wantsInteger) {
          this.em.i32Const(0);
          this.emitByType(uNode.argument, 'i32');
          this.em.i32Sub();
          return 'i32';
        }
        this.emitByType(uNode.argument, 'f32');
        this.em.f32Neg();
        return 'f32';
      }
      default:
        throw this.astErrorOutput(`Unhandled unary operator ${ uNode.operator }`, uNode);
    }
  }

  exprConditional(ast) {
    if (ast.type !== 'ConditionalExpression') {
      throw this.astErrorOutput('Not a conditional expression', ast);
    }
    const consequentType = this.getType(ast.consequent);
    const alternateType = this.getType(ast.alternate);
    this.recordUniformity('ternary', ast.test);
    if (consequentType === null && alternateType === null) {
      this.emitCondition(ast.test);
      this.enterIf();
      this.statementExpression(ast.consequent);
      this.em.else_();
      this.statementExpression(ast.alternate);
      this.exit();
      return 'void';
    }
    // the consequent's type wins; mixed int/float branches promote to float
    // — getType's ConditionalExpression override reports the same promotion
    let targetType = consequentType === 'LiteralInteger' ? 'Number' : consequentType;
    if (targetType === 'Integer' && (alternateType === 'Number' || alternateType === 'Float')) {
      targetType = 'Number';
    }
    const wtype = targetType === 'Integer' || targetType === 'Boolean' ? 'i32' : 'f32';
    const emitBranch = (branch) => {
      const branchType = this.getType(branch);
      switch (targetType) {
        case 'Number':
        case 'Float':
          if (branchType === 'Integer') this.castValueToFloat(branch);
          else if (branchType === 'LiteralInteger') this.castLiteralToFloat(branch);
          else this.coerce(this.expression(branch), 'f32');
          break;
        case 'Integer':
          if (branchType === 'Number' || branchType === 'Float') this.castValueToInteger(branch);
          else if (branchType === 'LiteralInteger') this.castLiteralToInteger(branch);
          else this.coerce(this.expression(branch), 'i32');
          break;
        case 'Boolean':
          this.emitCondition(branch);
          break;
        default:
          throw this.astErrorOutput(`WebAssembly backend does not yet support a ternary of type ${ targetType }`, ast);
      }
    };
    this.emitCondition(ast.test);
    this.enterIf(wtype);
    emitBranch(ast.consequent);
    this.em.else_();
    emitBranch(ast.alternate);
    this.exit();
    return targetType === 'Boolean' ? 'bool' : wtype;
  }

  exprCall(ast) {
    if (!ast.callee) {
      throw this.astErrorOutput('Unknown CallExpression', ast);
    }
    if (ast.callee.type === 'MemberExpression' && this.getVariableSignature(ast.callee, true) === 'this.color') {
      throw this.astErrorOutput('WebAssembly backend does not yet support graphical mode (this.color)', ast);
    }

    let functionName = null;
    const isMathFunction = this.isAstMathFunction(ast);
    if (isMathFunction || (ast.callee.object && ast.callee.object.type === 'ThisExpression')) {
      functionName = ast.callee.property.name;
    } else if (
      ast.callee.type === 'SequenceExpression' &&
      ast.callee.expressions[0].type === 'Literal' &&
      !isNaN(ast.callee.expressions[0].raw)
    ) {
      functionName = ast.callee.expressions[1].property.name;
    } else {
      functionName = ast.callee.name;
    }
    if (!functionName) {
      throw this.astErrorOutput(`Unhandled function, couldn't find name`, ast);
    }

    if (this.calledFunctions.indexOf(functionName) < 0) {
      this.calledFunctions.push(functionName);
    }
    if (this.onFunctionCall) {
      this.onFunctionCall(this.name, functionName, ast.arguments);
    }

    if (isMathFunction) {
      return this.emitMathCall(functionName, ast);
    }

    // resolves (and caches) the callee's return type; also runs argument
    // type inference so lookupFunctionArgumentTypes below is populated
    const returnType = this.getType(ast);

    const targetTypes = this.lookupFunctionArgumentTypes(functionName) || [];
    for (let i = 0; i < ast.arguments.length; ++i) {
      const argument = ast.arguments[i];
      let targetType = targetTypes[i];
      const argumentType = this.getType(argument);
      if (!targetType) {
        this.triggerImplyArgumentType(functionName, i, argumentType, this);
        targetType = argumentType;
      }
      switch (argumentType) {
        case 'Boolean':
          this.coerce(this.expression(argument), 'i32');
          continue;
        case 'Number':
        case 'Float':
          if (targetType === 'Integer') {
            this.castValueToInteger(argument);
            continue;
          } else if (targetType === 'Number' || targetType === 'Float' || targetType === 'LiteralInteger') {
            this.coerce(this.expression(argument), 'f32');
            continue;
          }
          break;
        case 'Integer':
          if (targetType === 'Number' || targetType === 'Float') {
            this.castValueToFloat(argument);
            continue;
          } else if (targetType === 'Integer') {
            this.coerce(this.expression(argument), 'i32');
            continue;
          }
          break;
        case 'LiteralInteger':
          if (targetType === 'Integer') {
            this.castLiteralToInteger(argument);
            continue;
          } else if (targetType === 'Number' || targetType === 'Float' || targetType === 'LiteralInteger') {
            this.castLiteralToFloat(argument);
            continue;
          }
          break;
        case 'Array(2)':
        case 'Array(3)':
        case 'Array(4)':
        case 'Array':
        case 'Array2D':
        case 'Array3D':
        case 'Input':
          throw this.astErrorOutput('WebAssembly backend does not yet support array arguments to helper functions', ast);
      }
      throw this.astErrorOutput(`Unhandled argument combination of ${ argumentType } and ${ targetType } for argument named "${ argument.name }"`, ast);
    }
    this.em.call(this.mangleFunctionName(functionName));
    switch (returnType) {
      case null:
      case undefined:
        return 'void';
      case 'Integer':
        return 'i32';
      case 'Boolean':
        return 'bool';
      default:
        return 'f32';
    }
  }

  /**
   * Math.* calls compute in f32; native wasm opcodes where they exist,
   * imports only for what the module actually uses (the kernel scans
   * usedMathImports after analysis). All arguments go through the float
   * ladder, matching the WGSL node's math-call casting.
   */
  emitMathCall(functionName, ast) {
    if (functionName === 'random') {
      this.usesRandom = true;
      this.em.call('pcg_random');
      return 'f32';
    }
    const emitMathArg = (argument) => {
      switch (this.getType(argument)) {
        case 'Integer':
          this.castValueToFloat(argument);
          break;
        case 'LiteralInteger':
          this.castLiteralToFloat(argument);
          break;
        default:
          this.coerce(this.expression(argument), 'f32');
      }
    };
    const nativeOp = MATH_NATIVE_OPS[functionName];
    if (nativeOp) {
      emitMathArg(ast.arguments[0]);
      this.em[nativeOp]();
      return 'f32';
    }
    switch (functionName) {
      case 'round':
        // JS rounds half UP; f32.nearest rounds half to even
        emitMathArg(ast.arguments[0]);
        this.em.f32Const(0.5).f32Add().f32Floor();
        return 'f32';
      case 'fround':
        // everything here is already f32
        emitMathArg(ast.arguments[0]);
        return 'f32';
      case 'min':
      case 'max': {
        const op = functionName === 'min' ? 'f32Min' : 'f32Max';
        emitMathArg(ast.arguments[0]);
        for (let i = 1; i < ast.arguments.length; i++) {
          emitMathArg(ast.arguments[i]);
          this.em[op]();
        }
        return 'f32';
      }
      case 'imul':
        emitMathArg(ast.arguments[0]);
        this.em.i32TruncSatF32S();
        emitMathArg(ast.arguments[1]);
        this.em.i32TruncSatF32S();
        this.em.i32Mul().f32ConvertI32S();
        return 'f32';
      case 'clz32':
        emitMathArg(ast.arguments[0]);
        this.em.i32TruncSatF32U().i32Clz().f32ConvertI32S();
        return 'f32';
      default: {
        const arity = MATH_IMPORT_ARITY[functionName];
        if (!arity) {
          throw this.astErrorOutput(`WebAssembly backend does not yet support Math.${ functionName }`, ast);
        }
        for (let i = 0; i < arity; i++) {
          emitMathArg(ast.arguments[i]);
        }
        this.usedMathImports.add(functionName);
        this.em.call('math_' + functionName);
        return 'f32';
      }
    }
  }

  exprMember(mNode) {
    const details = this.getMemberExpressionDetails(mNode);
    if (!details) {
      throw this.astErrorOutput('Unexpected expression', mNode);
    }
    const { signature, name, origin, type, property, xProperty, yProperty, zProperty } = details;
    switch (signature) {
      case 'value.thread.value':
      case 'this.thread.value': {
        if (name !== 'x' && name !== 'y' && name !== 'z') {
          throw this.astErrorOutput('Unexpected expression, expected `this.thread.x`, `this.thread.y`, or `this.thread.z`', mNode);
        }
        this.readsThread = true;
        const globals = this.assembler ? this.assembler.globals : null;
        this.em.globalGet(globals ? globals['thread' + name.toUpperCase()] : 0);
        return 'i32';
      }
      case 'this.output.value': {
        const axisIndex = { x: 0, y: 1, z: 2 } [name];
        if (axisIndex === undefined) {
          throw this.astErrorOutput('Unexpected expression', mNode);
        }
        // output dims bake in even with dynamicOutput: the kernel rebuilds
        // the module per size signature
        const value = this.output[axisIndex];
        if (this.isState('casting-to-float')) {
          this.em.f32Const(value);
          return 'f32';
        }
        this.em.i32Const(value);
        return 'i32';
      }
      case 'value.value': {
        if (origin === 'Math') {
          this.em.f32Const(Math[name]);
          return 'f32';
        }
        const component = { r: 0, g: 1, b: 2, a: 3 } [property];
        if (component !== undefined) {
          const local = this.locals.get(name);
          if (local && local.kind === 'vec' && component < local.n) {
            this.em.localGet(local.indices[component]);
            return 'f32';
          }
        }
        throw this.astErrorOutput('Unexpected expression', mNode);
      }
      case 'this.constants.value': {
        // constants are fixed at build; scalars bake straight into the code
        const value = this.constants[name];
        switch (type) {
          case 'Integer':
            if (this.isState('casting-to-float')) {
              this.em.f32Const(value);
              return 'f32';
            }
            this.em.i32Const(Math.round(value));
            return 'i32';
          case 'Number':
          case 'Float':
            if (this.isState('casting-to-integer')) {
              this.em.i32Const(Math.round(value));
              return 'i32';
            }
            this.em.f32Const(value);
            return 'f32';
          case 'Boolean':
            this.em.i32Const(value ? 1 : 0);
            return 'bool';
          default:
            throw this.astErrorOutput(`WebAssembly backend does not yet support constant type ${ type }`, mNode);
        }
      }
      case 'value[]':
      case 'value[][]':
      case 'value[][][]':
      case 'value[][][][]': {
        const local = this.locals.get(name);
        if (local && local.kind === 'vec') {
          if (signature !== 'value[]') {
            throw this.astErrorOutput('Unexpected expression', mNode);
          }
          return this.emitVecIndex(local, xProperty);
        }
        return this.emitFlatLoad('arrays', name, xProperty, yProperty, zProperty, mNode);
      }
      case 'this.constants.value[]':
      case 'this.constants.value[][]':
      case 'this.constants.value[][][]':
      case 'this.constants.value[][][][]':
        return this.emitFlatLoad('constantArrays', name, xProperty, yProperty, zProperty, mNode);
      case 'fn()[]':
        throw this.astErrorOutput('WebAssembly backend does not yet support indexing a function call result', mNode);
      default:
        throw this.astErrorOutput(`WebAssembly backend does not yet support expression signature "${ signature }"`, mNode);
    }
  }

  /**
   * Flat row-major load, index = x + sizeX * (y + sizeY * z) — the same
   * formula as the GL path's get32 and web-gpu's get_user_X, with missing
   * y/z as zero. Dims and the region offset are baked; the kernel rebuilds
   * per size signature.
   */
  emitFlatLoad(table, name, xProperty, yProperty, zProperty, mNode) {
    let layout;
    if (this.assembler) {
      layout = this.assembler.layout[table][name];
      if (!layout) {
        throw this.astErrorOutput(`no memory layout for "${ name }" — arrays are only readable as kernel arguments or constants`, mNode);
      }
    } else {
      layout = { offset: 0, dims: [1, 1, 1] };
    }
    this.emitIndex(xProperty);
    if (yProperty) {
      this.emitIndex(yProperty);
      this.em.i32Const(layout.dims[0]).i32Mul().i32Add();
    }
    if (zProperty) {
      this.emitIndex(zProperty);
      this.em.i32Const(layout.dims[0] * layout.dims[1]).i32Mul().i32Add();
    }
    if (this.vec && this.vMaskDepth > 0) {
      // predicated SIMD code evaluates both sides of a divergent branch, so
      // a uniform index that the branch condition was guarding can be wild
      // for the not-taken lanes; clamping keeps the load from trapping while
      // leaving every in-bounds (contract-conforming) index untouched
      this.emitClampScalarIndex(layout.dims[0] * layout.dims[1] * layout.dims[2] - 1);
    }
    this.em.i32Const(2).i32Shl();
    this.em.f32Load(layout.offset);
    return 'f32';
  }

  /**
   * Clamps the i32 index on the stack top into [0, max]. i32 has no native
   * min/max, so two selects.
   */
  emitClampScalarIndex(max) {
    const t = this.em.addLocal('i32');
    this.em.localSet(t);
    this.em.localGet(t).i32Const(0).localGet(t).i32Const(0).i32GeS().select();
    this.em.localSet(t);
    this.em.localGet(t).i32Const(max).localGet(t).i32Const(max).i32LeS().select();
  }

  emitVecIndex(local, xProperty) {
    if (xProperty.type === 'Literal' && Number.isInteger(xProperty.value)) {
      if (xProperty.value < 0 || xProperty.value >= local.n) {
        throw this.astErrorOutput(`index ${ xProperty.value } out of range for Array(${ local.n })`, xProperty);
      }
      this.em.localGet(local.indices[xProperty.value]);
      return 'f32';
    }
    // no dynamic indexing into locals in wasm: a select chain, keyed off a
    // scratch copy of the index
    const idx = this.em.addLocal('i32');
    this.emitIndex(xProperty);
    this.em.localSet(idx);
    this.em.localGet(local.indices[0]);
    for (let k = 1; k < local.n; k++) {
      this.em.localGet(local.indices[k]);
      this.em.localGet(idx).i32Const(k).i32Ne();
      this.em.select();
    }
    return 'f32';
  }

  emitIndex(property) {
    if (!property) {
      throw new Error('Property not set');
    }
    const type = this.getType(property);
    switch (type) {
      case 'Number':
      case 'Float':
        this.castValueToInteger(property);
        return;
      case 'LiteralInteger':
        this.castLiteralToInteger(property);
        return;
      case 'Integer': {
        // Integer-typed expressions can still land as f32 (Math.floor is
        // 'Integer' to the type system but computes in f32); always coerce
        this.pushState('building-integer');
        const emitted = this.expression(property);
        this.popState('building-integer');
        this.coerce(emitted, 'i32');
        return;
      }
      default:
        this.coerce(this.expression(property), 'i32');
    }
  }

  // -------------------------------------------------- SIMD (f32x4) emission
  //
  // The vector walk emits `kernel_simd`, one call = 4 consecutive x cells
  // (thread.x = base + [0,1,2,3]; y/z uniform per quad — the run_simd caller
  // never lets a quad cross an x-row). Divergent control flow VECTORIZES via
  // mask predication:
  //  - values are uniform (one scalar wasm value shared by all lanes, emitted
  //    by the untouched scalar walk) or varying (one v128); vAnalyze decides
  //    per local before emission, so no mid-function repromotion exists
  //  - a varying if evaluates BOTH branches; every store while a branch mask
  //    is live goes through v128.bitselect, which blends exact bit patterns —
  //    predication cannot perturb IEEE results
  //  - varying-trip loops run while v128.any_true(live); break ORs the
  //    current mask into a per-loop retire mask, continue into a per-
  //    iteration one, early return into a function-level one plus a masked
  //    output store; masks are monotone accumulators, so `saved & ~each`
  //    reconstructs the live mask after any construct
  //  - transcendentals, variable-count shifts, clz and user helper calls
  //    lane-scalarize through the exact scalar opcodes/imports; helpers stay
  //    scalar functions, with thread.x and PCG state swapped per lane
  // No masking bailout shapes were needed: every construct of the supported
  // kernel language lowers through the model above.

  /**
   * Bytecode pass for `kernel_simd`. Root kernel only; may run once per size
   * signature like emitFunction.
   */
  emitVectorFunction(assembler) {
    if (!this.isRootKernel) {
      throw new Error('only the root kernel is vectorized; helpers are lane-scalarized at call sites');
    }
    this.assembler = assembler;
    const em = assembler.module.addFunction('kernel_simd', { params: [], results: [] });
    this.em = em;
    this.vec = true;
    try {
      this.locals = new Map();
      this.depth = 0;
      this.loopStack = [];
      this.vLoopStack = [];
      this.taintedLocals = new Set();
      const ast = this.getJsAST();
      if (!this.vInfo) this.vInfo = this.vAnalyze(ast);
      this.vMaskDepth = 0;
      this.vTerminated = false;
      this.vCur = em.addLocal('v128');
      em.v128ConstI32x4(-1, -1, -1, -1).localSet(this.vCur);
      this.vRetMask = this.vInfo.varyingReturn ? em.addLocal('v128') : -1; // locals zero-init
      this._vBaseX = -1;
      if (assembler.helperInfo) {
        this._vBaseX = em.addLocal('i32');
        em.globalGet(assembler.globals.threadX).localSet(this._vBaseX);
      }
      // a scalar kernel argument the kernel assigns to lives in ONE memory
      // slot shared by the quad; per-lane writes need a per-lane home, so
      // assigned arguments get a varying shadow local seeded from the slot
      for (const name of this.vInfo.assignedArgs) {
        const argumentIndex = this.argumentNames.indexOf(name);
        const gtype = this.argumentTypes[argumentIndex];
        const slot = assembler.layout.scalars[name];
        if (!slot) {
          throw this.astErrorOutput(
            `WebAssembly backend does not yet support assigning to the array argument "${ name }"`,
            this.getJsAST());
        }
        const isInt = gtype === 'Integer' || gtype === 'Boolean';
        const index = em.addLocal('v128');
        em.i32Const(0);
        if (isInt) em.i32Load(slot.offset).i32x4Splat();
        else em.f32Load(slot.offset).f32x4Splat();
        em.localSet(index);
        this.locals.set(name, { kind: 'vscalar', index, wtype: isInt ? 'vi32' : 'vf32', gtype });
      }
      const body = ast.body.body;
      for (let i = 0; i < body.length; i++) {
        this.vstatement(body[i]);
        if (this.vTerminated) break;
      }
    } finally {
      this.vec = false;
      this.vMaskDepth = 0;
    }
    return em;
  }

  /**
   * Emission-time variance analysis, run once per node and cached. Fixpoint
   * over the local set: a local is varying when it is ever assigned a
   * lane-varying value OR assigned at all under lane-varying control
   * (divergent branch, varying-trip loop, ternary branch, short-circuit
   * right side). A loop is varying-controlled when its test is varying or a
   * break/continue reaches it from under a varying condition.
   */
  vAnalyze(ast) {
    const varying = new Set();
    const assignedArgs = new Set();
    let varyingReturn = false;
    let changed = true;
    const self = this;

    const exprVarying = (node) => {
      if (!node || typeof node !== 'object') return false;
      switch (node.type) {
        case 'Literal':
        case 'ThisExpression':
          return false;
        case 'Identifier':
          return varying.has(node.name);
        case 'MemberExpression':
          if (
            !node.computed &&
            node.object.type === 'MemberExpression' &&
            !node.object.computed &&
            node.object.property &&
            node.object.property.name === 'thread'
          ) {
            return node.property.name === 'x';
          }
          if (node.computed) {
            return exprVarying(node.object) || exprVarying(node.property);
          }
          return exprVarying(node.object);
        case 'BinaryExpression':
        case 'LogicalExpression':
          return exprVarying(node.left) || exprVarying(node.right);
        case 'UnaryExpression':
        case 'UpdateExpression':
          return exprVarying(node.argument);
        case 'ConditionalExpression':
          return exprVarying(node.test) || exprVarying(node.consequent) || exprVarying(node.alternate);
        case 'CallExpression':
          if (self.isAstMathFunction(node)) {
            if (node.callee.property.name === 'random') return true;
            return node.arguments.some(exprVarying);
          }
          // user helpers may read this.thread.x or draw Math.random inside
          return true;
        case 'SequenceExpression':
          return node.expressions.some(exprVarying);
        case 'ArrayExpression':
          return node.elements.some(exprVarying);
        case 'AssignmentExpression':
          return exprVarying(node.right) || (node.left.type === 'Identifier' && varying.has(node.left.name));
        default:
          return true;
      }
    };

    const taint = (name) => {
      if (name && !varying.has(name)) {
        varying.add(name);
        changed = true;
      }
    };

    // update/assignment expressions buried under a varying condition inside
    // a larger expression (ternary branch, short-circuit RHS) mutate per lane
    const scanExprTaints = (node, cv) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(sub => scanExprTaints(sub, cv));
      switch (node.type) {
        case 'UpdateExpression':
          if (node.argument.type === 'Identifier') {
            // an argument updated in EXPRESSION position (`let y = a++`)
            // needs the same shadow-local membership the statement walk
            // records, or the vector emitter rejects the update outright
            if (self.argumentNames.indexOf(node.argument.name) !== -1) {
              if (!assignedArgs.has(node.argument.name)) {
                assignedArgs.add(node.argument.name);
                changed = true;
              }
              taint(node.argument.name);
            }
            if (cv) taint(node.argument.name);
          }
          return scanExprTaints(node.argument, cv);
        case 'AssignmentExpression':
          if (node.left.type === 'Identifier') {
            if (self.argumentNames.indexOf(node.left.name) !== -1) {
              if (!assignedArgs.has(node.left.name)) {
                assignedArgs.add(node.left.name);
                changed = true;
              }
              taint(node.left.name);
            }
            if (cv) taint(node.left.name);
          }
          scanExprTaints(node.left, cv);
          return scanExprTaints(node.right, cv);
        case 'ConditionalExpression': {
          scanExprTaints(node.test, cv);
          const branchCv = cv || exprVarying(node.test);
          scanExprTaints(node.consequent, branchCv);
          return scanExprTaints(node.alternate, branchCv);
        }
        case 'LogicalExpression': {
          scanExprTaints(node.left, cv);
          // the RHS of && / || is conditionally executed no matter whether
          // the left operand varies per lane -- with a lane-uniform left the
          // vector emitter still evaluates the RHS for all lanes under the
          // combined mask, so an untainted (scalar) update target there would
          // write unmasked and run when JS short-circuiting skips it. Taint
          // unconditionally; the blend machinery does the rest.
          return scanExprTaints(node.right, true);
        }
        default: {
          for (const key in node) {
            if (key === 'loc' || key === 'start' || key === 'end' || key === 'parent') continue;
            const child = node[key];
            if (child && typeof child === 'object') scanExprTaints(child, cv);
          }
        }
      }
    };

    const collectAssigned = (node, out) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(sub => collectAssigned(sub, out));
      switch (node.type) {
        case 'VariableDeclarator':
          if (node.id && node.id.type === 'Identifier') out.push(node.id.name);
          break;
        case 'AssignmentExpression':
          if (node.left.type === 'Identifier') out.push(node.left.name);
          break;
        case 'UpdateExpression':
          if (node.argument.type === 'Identifier') out.push(node.argument.name);
          break;
        case 'FunctionDeclaration':
          return;
      }
      for (const key in node) {
        if (key === 'loc' || key === 'start' || key === 'end' || key === 'parent') continue;
        const child = node[key];
        if (child && typeof child === 'object') collectAssigned(child, out);
      }
    };

    // a break/continue reaching THIS loop from under a lane-varying
    // condition makes the trip count lane-varying even with a uniform test
    const hasVaryingExit = (node, cv) => {
      if (!node || typeof node !== 'object') return false;
      if (Array.isArray(node)) return node.some(sub => hasVaryingExit(sub, cv));
      switch (node.type) {
        case 'BreakStatement':
        case 'ContinueStatement':
          return cv;
        case 'ForStatement':
        case 'WhileStatement':
        case 'DoWhileStatement':
        case 'FunctionDeclaration':
          return false; // their exits are their own
        case 'IfStatement': {
          const branchCv = cv || exprVarying(node.test);
          if (hasVaryingExit(node.consequent, branchCv)) return true;
          return node.alternate ? hasVaryingExit(node.alternate, branchCv) : false;
        }
        case 'ConditionalExpression': {
          const branchCv = cv || exprVarying(node.test);
          return hasVaryingExit(node.consequent, branchCv) || hasVaryingExit(node.alternate, branchCv);
        }
        case 'SwitchStatement': {
          // case-terminator breaks belong to the switch; continue is ours
          const switchCv = cv || exprVarying(node.discriminant) ||
            node.cases.some(c => c.test && exprVarying(c.test));
          return node.cases.some(c => c.consequent.some(stmt =>
            stmt.type === 'BreakStatement' ? false : hasVaryingExit(stmt, switchCv)));
        }
        default: {
          for (const key in node) {
            if (key === 'loc' || key === 'start' || key === 'end' || key === 'parent') continue;
            const child = node[key];
            if (child && typeof child === 'object' && hasVaryingExit(child, cv)) return true;
          }
          return false;
        }
      }
    };

    const walkExprStatement = (node, cv) => {
      switch (node.type) {
        case 'AssignmentExpression': {
          if (node.left.type === 'Identifier') {
            const name = node.left.name;
            if (self.argumentNames.indexOf(name) !== -1) {
              if (!assignedArgs.has(name)) {
                assignedArgs.add(name);
                changed = true;
              }
              taint(name);
            }
            if (cv || exprVarying(node.right) || (node.operator !== '=' && varying.has(name))) taint(name);
          }
          return scanExprTaints(node.right, cv);
        }
        case 'UpdateExpression': {
          if (node.argument.type === 'Identifier') {
            const name = node.argument.name;
            if (self.argumentNames.indexOf(name) !== -1) {
              if (!assignedArgs.has(name)) {
                assignedArgs.add(name);
                changed = true;
              }
              taint(name);
            }
            if (cv) taint(name);
          }
          return;
        }
        case 'SequenceExpression':
          return node.expressions.forEach(e => walkExprStatement(e, cv));
        default:
          return scanExprTaints(node, cv);
      }
    };

    const walkStatement = (node, cv) => {
      if (!node) return;
      switch (node.type) {
        case 'VariableDeclaration':
          for (const declaration of node.declarations) {
            if (!declaration.init) continue;
            if (cv || exprVarying(declaration.init)) taint(declaration.id.name);
            scanExprTaints(declaration.init, cv);
          }
          return;
        case 'ExpressionStatement':
          return walkExprStatement(node.expression, cv);
        case 'ReturnStatement':
          if (cv) varyingReturn = true;
          if (node.argument) scanExprTaints(node.argument, cv);
          return;
        case 'IfStatement': {
          scanExprTaints(node.test, cv);
          const branchCv = cv || exprVarying(node.test);
          walkStatement(node.consequent, branchCv);
          if (node.alternate) walkStatement(node.alternate, branchCv);
          return;
        }
        case 'ForStatement':
        case 'WhileStatement':
        case 'DoWhileStatement': {
          const loopVarying =
            cv ||
            (node.test ? exprVarying(node.test) : false) ||
            hasVaryingExit(node.body, false);
          if (loopVarying) {
            const assigned = [];
            if (node.init) collectAssigned(node.init, assigned);
            collectAssigned(node.body, assigned);
            if (node.update) collectAssigned(node.update, assigned);
            assigned.forEach(taint);
          }
          if (node.init) {
            if (node.init.type === 'VariableDeclaration') walkStatement(node.init, cv);
            else walkExprStatement(node.init, cv);
          }
          walkStatement(node.body, loopVarying);
          if (node.update) walkExprStatement(node.update, loopVarying);
          if (node.test) scanExprTaints(node.test, loopVarying);
          return;
        }
        case 'SwitchStatement': {
          const switchCv = cv || exprVarying(node.discriminant) ||
            node.cases.some(c => c.test && exprVarying(c.test));
          for (const switchCase of node.cases) {
            for (const stmt of switchCase.consequent) walkStatement(stmt, switchCv);
          }
          return;
        }
        case 'BlockStatement':
          return node.body.forEach(stmt => walkStatement(stmt, cv));
        default:
          return;
      }
    };

    while (changed) {
      changed = false;
      walkStatement(ast.body, false);
    }
    return { varying, varyingReturn, assignedArgs, exprVarying, hasVaryingExit };
  }

  // ------------------------------------------------------- mask bookkeeping

  vZero() {
    this.em.v128ConstI32x4(0, 0, 0, 0);
    return this;
  }

  vInnermostVaryingLoop() {
    const top = this.vLoopStack[this.vLoopStack.length - 1];
    return top && top.varying ? top : null;
  }

  /**
   * Rebuilds vCur from a saved base after a construct. Retire masks are
   * monotone accumulators within their scope, so `base & ~each` is exact at
   * any later point; break/continue always target the innermost loop and the
   * analysis forces any loop with a masked exit to be a varying loop, so
   * only the top varying entry's masks apply.
   */
  vRecomputeCur(savedIndex) {
    const em = this.em;
    em.localGet(savedIndex);
    if (this.vRetMask !== -1) em.localGet(this.vRetMask).v128Andnot();
    const loop = this.vInnermostVaryingLoop();
    if (loop) {
      if (loop.vBrk !== -1) em.localGet(loop.vBrk).v128Andnot();
      if (loop.vCnt !== -1) em.localGet(loop.vCnt).v128Andnot();
    }
    em.localSet(this.vCur);
  }

  // break/continue reaching this loop (per-loop retire masks are emitted
  // only when they can actually accumulate)
  vLoopBodyExits(body) {
    let hasBreak = false;
    let hasContinue = false;
    const walk = (node) => {
      if (!node || typeof node !== 'object' || (hasBreak && hasContinue)) return;
      if (Array.isArray(node)) return node.forEach(walk);
      switch (node.type) {
        case 'BreakStatement':
          hasBreak = true;
          return;
        case 'ContinueStatement':
          hasContinue = true;
          return;
        case 'ForStatement':
        case 'WhileStatement':
        case 'DoWhileStatement':
        case 'FunctionDeclaration':
          return; // their exits are their own
        case 'SwitchStatement':
          // terminator breaks belong to the switch; continue is ours
          for (const switchCase of node.cases) {
            for (const stmt of switchCase.consequent) {
              if (stmt.type !== 'BreakStatement') walk(stmt);
            }
          }
          return;
      }
      for (const key in node) {
        if (key === 'loc' || key === 'start' || key === 'end' || key === 'parent') continue;
        const child = node[key];
        if (child && typeof child === 'object') walk(child);
      }
    };
    walk(body);
    return { hasBreak, hasContinue };
  }

  /**
   * Stores the stack top into a v128 local; under a live branch mask the
   * inactive lanes keep their previous value. bitselect copies exact bit
   * patterns, so predication never perturbs IEEE results.
   */
  vSetLocal(index) {
    const em = this.em;
    if (this.vMaskDepth > 0) {
      em.localGet(index).localGet(this.vCur).v128Bitselect();
    }
    em.localSet(index);
  }

  // ------------------------------------------------------ vector conversion

  vCoerce(from, to) {
    if (from === to) return to;
    const em = this.em;
    switch (from) {
      case 'f32':
      case 'i32':
      case 'bool':
        // uniform value entering a varying context: convert scalar, splat
        if (to === 'vf32') {
          this.coerce(from, 'f32');
          em.f32x4Splat();
          return to;
        }
        if (to === 'vi32') {
          this.coerce(from, 'i32');
          em.i32x4Splat();
          return to;
        }
        if (to === 'vbool') {
          this.coerce(from, 'i32');
          em.i32x4Splat();
          this.vZero();
          em.i32x4Ne();
          return to;
        }
        break;
      case 'vf32':
        if (to === 'vi32') {
          em.i32x4TruncSatF32x4S();
          return to;
        }
        if (to === 'vbool') {
          em.v128ConstF32x4(0, 0, 0, 0).f32x4Ne();
          return to;
        }
        break;
      case 'vi32':
        if (to === 'vf32') {
          em.f32x4ConvertI32x4S();
          return to;
        }
        if (to === 'vbool') {
          this.vZero();
          em.i32x4Ne();
          return to;
        }
        break;
      case 'vbool':
        // masks are all-ones/all-zeros; numeric use is 0/1 like scalar bool
        if (to === 'vi32') {
          em.v128ConstI32x4(1, 1, 1, 1).v128And();
          return to;
        }
        if (to === 'vf32') {
          em.v128ConstI32x4(1, 1, 1, 1).v128And().f32x4ConvertI32x4S();
          return to;
        }
        break;
    }
    throw new Error(`cannot convert ${ from } to ${ to }`);
  }

  vCastLiteralToInteger(ast) {
    this.pushState('casting-to-integer');
    const type = this.vexpr(ast);
    this.popState('casting-to-integer');
    this.vCoerce(type, 'vi32');
    return 'vi32';
  }

  vCastLiteralToFloat(ast) {
    this.pushState('casting-to-float');
    const type = this.vexpr(ast);
    this.popState('casting-to-float');
    this.vCoerce(type, 'vf32');
    return 'vf32';
  }

  vCastValueToInteger(ast) {
    this.pushState('casting-to-integer');
    const type = this.vexpr(ast);
    this.popState('casting-to-integer');
    this.vCoerce(type, 'vi32');
    return 'vi32';
  }

  vCastValueToFloat(ast) {
    this.pushState('casting-to-float');
    const type = this.vexpr(ast);
    this.popState('casting-to-float');
    this.vCoerce(type, 'vf32');
    return 'vf32';
  }

  vEmitByType(ast, want) {
    const type = this.getType(ast);
    if (want === 'vf32') {
      if (type === 'Integer') return this.vCastValueToFloat(ast);
      if (type === 'LiteralInteger') return this.vCastLiteralToFloat(ast);
      this.vCoerce(this.vexpr(ast), 'vf32');
      return 'vf32';
    }
    if (type === 'Number' || type === 'Float') return this.vCastValueToInteger(ast);
    if (type === 'LiteralInteger') return this.vCastLiteralToInteger(ast);
    this.vCoerce(this.vexpr(ast), 'vi32');
    return 'vi32';
  }

  /**
   * Leaves an i32x4 lane mask (all-ones/all-zeros) for `ast` as a condition;
   * lane truth matches the scalar emitCondition exactly.
   */
  vexprMask(ast) {
    const type = this.vexpr(ast);
    if (type === 'vbool') return;
    if (type === 'vi32') {
      this.vZero();
      this.em.i32x4Ne();
      return;
    }
    if (type === 'vf32') {
      this.em.v128ConstF32x4(0, 0, 0, 0).f32x4Ne();
      return;
    }
    // uniform condition entering a varying context
    this.coerce(type, 'bool');
    this.em.i32x4Splat();
    this.vZero();
    this.em.i32x4Ne();
  }

  // ------------------------------------------------------ vector statements

  vstatement(ast) {
    switch (ast.type) {
      case 'VariableDeclaration':
        return this.vstmtVariableDeclaration(ast);
      case 'ExpressionStatement':
        return this.vstatementExpression(ast.expression);
      case 'ReturnStatement':
        return this.vstmtReturn(ast);
      case 'IfStatement':
        return this.vstmtIf(ast);
      case 'ForStatement':
        return this.vstmtFor(ast);
      case 'WhileStatement':
        return this.vstmtWhile(ast);
      case 'DoWhileStatement':
        return this.vstmtDoWhile(ast);
      case 'BlockStatement': {
        for (let i = 0; i < ast.body.length; i++) {
          this.vstatement(ast.body[i]);
          if (this.vTerminated) break;
        }
        return;
      }
      case 'BreakStatement':
        return this.vstmtBreak(ast);
      case 'ContinueStatement':
        return this.vstmtContinue(ast);
      case 'SwitchStatement':
        return this.vstmtSwitch(ast);
      case 'FunctionDeclaration':
        if (this.isChildFunction(ast)) return;
        throw this.astErrorOutput('unexpected function declaration', ast);
      case 'EmptyStatement':
      case 'DebuggerStatement':
        return;
      default:
        throw this.astErrorOutput(`Unknown statement type ${ ast.type }`, ast);
    }
  }

  /**
   * A break/continue/return retires every lane that reached it, so the rest
   * of its block is dead on both paths; the walk stops emitting there, and
   * termination never leaks past the construct boundary.
   */
  vstatementBody(node) {
    if (!node) return;
    const previous = this.vTerminated;
    this.vTerminated = false;
    this.vstatement(node);
    this.vTerminated = previous;
  }

  vstatementExpression(expression) {
    switch (expression.type) {
      case 'AssignmentExpression':
        return this.vAssign(expression);
      case 'UpdateExpression':
        this.vUpdate(expression, true);
        return;
      case 'SequenceExpression': {
        for (let i = 0; i < expression.expressions.length; i++) {
          this.vstatementExpression(expression.expressions[i]);
        }
        return;
      }
      case 'Identifier':
      case 'Literal':
        return;
      default: {
        const type = this.vexpr(expression);
        if (type !== 'void') this.em.drop();
      }
    }
  }

  vstmtVariableDeclaration(varDecNode) {
    const declarations = varDecNode.declarations;
    if (!declarations || !declarations[0] || !declarations[0].init) {
      throw this.astErrorOutput('Unexpected expression', varDecNode);
    }
    for (let i = 0; i < declarations.length; i++) {
      const declaration = declarations[i];
      if (!this.vInfo.varying.has(declaration.id.name)) {
        // never assigned varying data nor under a varying mask: the scalar
        // declaration path is exact, one shared scalar for all lanes
        this.stmtVariableDeclaration(Object.assign({}, varDecNode, { declarations: [declaration] }));
        continue;
      }
      this.vDeclareVarying(declaration, varDecNode);
    }
  }

  vDeclareVarying(declaration, varDecNode) {
    const em = this.em;
    const init = declaration.init;
    const name = declaration.id.name;
    const info = this.getDeclaration(declaration.id);
    const actualType = this.getType(init);

    if (actualType === 'Array(2)' || actualType === 'Array(3)' || actualType === 'Array(4)') {
      const n = parseInt(actualType.substring(6), 10);
      info.valueType = actualType;
      let local = this.locals.get(name);
      if (!local || local.kind !== 'vvec' || local.n !== n) {
        const indices = [];
        for (let c = 0; c < n; c++) indices.push(em.addLocal('v128'));
        local = { kind: 'vvec', indices, n, gtype: actualType };
        this.locals.set(name, local);
      }
      if (init.type === 'ArrayExpression') {
        for (let c = 0; c < n; c++) {
          this.vEmitArrayElement(init.elements[c]);
          this.vSetLocal(local.indices[c]);
        }
        return;
      }
      if (init.type === 'Identifier') {
        const source = this.locals.get(init.name);
        if (source && source.kind === 'vvec' && source.n === n) {
          for (let c = 0; c < n; c++) {
            em.localGet(source.indices[c]);
            this.vSetLocal(local.indices[c]);
          }
          return;
        }
        if (source && source.kind === 'vec' && source.n === n) {
          for (let c = 0; c < n; c++) {
            em.localGet(source.indices[c]).f32x4Splat();
            this.vSetLocal(local.indices[c]);
          }
          return;
        }
      }
      throw this.astErrorOutput(`WebAssembly backend does not yet support ${ actualType } initializer of type ${ init.type }`, varDecNode);
    }

    let type = actualType;
    if (type === 'LiteralInteger') {
      type = info.suggestedType === 'Integer' ? 'Integer' : 'Number';
    }
    if (actualType === 'Integer' && type === 'Integer') {
      // the scalar walk's int-initializer decay, lane-wise
      info.valueType = 'Number';
      this.vSetVaryingScalar(name, 'vf32', 'Number', () => this.vCastValueToFloat(init));
      return;
    }
    info.valueType = type;
    switch (type) {
      case 'Number':
      case 'Float':
        this.vSetVaryingScalar(name, 'vf32', type, () => {
          if (actualType === 'LiteralInteger') this.vCastLiteralToFloat(init);
          else if (actualType === 'Integer') this.vCastValueToFloat(init);
          else this.vCoerce(this.vexpr(init), 'vf32');
        });
        break;
      case 'Integer':
        this.vSetVaryingScalar(name, 'vi32', 'Integer', () => {
          if (actualType === 'LiteralInteger') this.vCastLiteralToInteger(init);
          else if (actualType === 'Number' || actualType === 'Float') this.vCastValueToInteger(init);
          else this.vCoerce(this.vexpr(init), 'vi32');
        });
        break;
      case 'Boolean':
        // varying booleans hold 0/1 like scalar bools; conditions renorm
        this.vSetVaryingScalar(name, 'vi32', 'Boolean', () => {
          this.vexprMask(init);
          this.em.v128ConstI32x4(1, 1, 1, 1).v128And();
        });
        break;
      default:
        throw this.astErrorOutput(`WebAssembly backend does not yet support declaring type ${ type }`, varDecNode);
    }
  }

  vSetVaryingScalar(name, wtype, gtype, emitInit) {
    let local = this.locals.get(name);
    if (!local || local.kind !== 'vscalar' || local.wtype !== wtype) {
      local = {
        kind: 'vscalar',
        index: this.em.addLocal('v128'),
        wtype,
        gtype
      };
      this.locals.set(name, local);
    } else {
      local.gtype = gtype;
    }
    emitInit();
    this.vSetLocal(local.index);
  }

  vEmitArrayElement(element) {
    switch (this.getType(element)) {
      case 'Integer':
        this.vCastValueToFloat(element);
        break;
      case 'LiteralInteger':
        this.vCastLiteralToFloat(element);
        break;
      default:
        this.vCoerce(this.vexpr(element), 'vf32');
    }
  }

  vAssign(assNode) {
    if (assNode.left.type !== 'Identifier') {
      throw this.astErrorOutput(`WebAssembly backend does not yet support assignment to ${ assNode.left.type }`, assNode);
    }
    const name = assNode.left.name;
    const local = this.locals.get(name);
    if (local && local.kind === 'scalar') {
      // uniform target: the analysis guarantees uniform value and control
      return this.emitAssignment(assNode);
    }
    if (!local || local.kind !== 'vscalar') {
      throw this.astErrorOutput(`cannot assign to "${ name }"`, assNode);
    }
    const wtype = local.wtype;
    if (assNode.operator === '=') {
      const leftType = this.getType(assNode.left);
      const rightType = this.getType(assNode.right);
      if (leftType !== 'Integer' && rightType === 'Integer') {
        this.vCastValueToFloat(assNode.right);
        this.vCoerce('vf32', wtype);
      } else if (leftType !== 'Integer' && rightType === 'LiteralInteger') {
        this.vCastLiteralToFloat(assNode.right);
        this.vCoerce('vf32', wtype);
      } else if (leftType === 'Integer' && rightType === 'LiteralInteger') {
        this.vCastLiteralToInteger(assNode.right);
        this.vCoerce('vi32', wtype);
      } else if (leftType === 'Integer' && (rightType === 'Number' || rightType === 'Float')) {
        this.vCastValueToInteger(assNode.right);
        this.vCoerce('vi32', wtype);
      } else {
        this.vCoerce(this.vexpr(assNode.right), wtype);
      }
    } else {
      const synthetic = {
        type: 'BinaryExpression',
        operator: assNode.operator.slice(0, -1),
        left: assNode.left,
        right: assNode.right,
      };
      this.vCoerce(this.vexprBinary(synthetic), wtype);
    }
    this.vSetLocal(local.index);
  }

  vUpdate(uNode, isStatement) {
    if (uNode.argument.type !== 'Identifier') {
      throw this.astErrorOutput('update expression needs a variable', uNode);
    }
    const local = this.locals.get(uNode.argument.name);
    if (local && local.kind === 'scalar') {
      return this.emitUpdate(uNode, isStatement);
    }
    if (!local || local.kind !== 'vscalar') {
      throw this.astErrorOutput(`cannot update "${ uNode.argument.name }"`, uNode);
    }
    const em = this.em;
    const isInt = local.wtype === 'vi32';
    const one = () => (isInt ? em.v128ConstI32x4(1, 1, 1, 1) : em.v128ConstF32x4(1, 1, 1, 1));
    const op = uNode.operator === '++' ? (isInt ? 'i32x4Add' : 'f32x4Add') : (isInt ? 'i32x4Sub' : 'f32x4Sub');
    if (isStatement) {
      em.localGet(local.index);
      one();
      em[op]();
      this.vSetLocal(local.index);
      return 'void';
    }
    if (uNode.prefix) {
      em.localGet(local.index);
      one();
      em[op]();
      this.vSetLocal(local.index);
      em.localGet(local.index);
    } else {
      const old = em.addLocal('v128');
      em.localGet(local.index).localSet(old);
      em.localGet(local.index);
      one();
      em[op]();
      this.vSetLocal(local.index);
      em.localGet(old);
    }
    return local.wtype;
  }

  vstmtIf(ifNode) {
    const em = this.em;
    if (!this.vInfo.exprVarying(ifNode.test)) {
      // uniform condition: every lane agrees, a real branch is exact
      this.emitCondition(ifNode.test);
      this.enterIf();
      this.vstatementBody(ifNode.consequent);
      if (ifNode.alternate) {
        em.else_();
        this.vstatementBody(ifNode.alternate);
      }
      this.exit();
      return;
    }
    const m = em.addLocal('v128');
    this.vexprMask(ifNode.test);
    em.localSet(m);
    const saved = em.addLocal('v128');
    em.localGet(this.vCur).localSet(saved);
    em.localGet(saved).localGet(m).v128And().localSet(this.vCur);
    // any_true guard is speed only — an empty mask already makes the body a
    // no-op through the blends
    em.localGet(this.vCur).v128AnyTrue();
    this.enterIf();
    this.vMaskDepth++;
    this.vstatementBody(ifNode.consequent);
    this.vMaskDepth--;
    this.exit();
    if (ifNode.alternate) {
      em.localGet(saved).localGet(m).v128Andnot().localSet(this.vCur);
      em.localGet(this.vCur).v128AnyTrue();
      this.enterIf();
      this.vMaskDepth++;
      this.vstatementBody(ifNode.alternate);
      this.vMaskDepth--;
      this.exit();
    }
    this.vRecomputeCur(saved);
  }

  vstmtReturn(ast) {
    const em = this.em;
    if (!ast.argument) {
      this.vRetireOrReturn();
      return;
    }
    this.pushState('skip-literal-correction');
    const type = this.getType(ast.argument);
    this.popState('skip-literal-correction');
    switch (this.returnType) {
      case 'Array(2)':
      case 'Array(3)':
      case 'Array(4)': {
        const n = parseInt(this.returnType.substring(6), 10);
        const argument = ast.argument;
        const comps = [];
        if (argument.type === 'ArrayExpression') {
          if (argument.elements.length !== n) {
            throw this.astErrorOutput(`expected ${ n } array elements to match return type ${ this.returnType }`, ast);
          }
          for (let c = 0; c < n; c++) {
            const t = em.addLocal('v128');
            this.vEmitArrayElement(argument.elements[c]);
            em.localSet(t);
            comps.push(t);
          }
        } else if (argument.type === 'Identifier') {
          const local = this.locals.get(argument.name);
          if (local && local.kind === 'vvec' && local.n === n) {
            for (let c = 0; c < n; c++) comps.push(local.indices[c]);
          } else if (local && local.kind === 'vec' && local.n === n) {
            for (let c = 0; c < n; c++) {
              const t = em.addLocal('v128');
              em.localGet(local.indices[c]).f32x4Splat().localSet(t);
              comps.push(t);
            }
          } else {
            throw this.astErrorOutput(`"${ argument.name }" is not an Array(${ n }) variable`, ast);
          }
        } else {
          throw this.astErrorOutput(`WebAssembly backend does not yet support returning ${ this.returnType } from a ${ argument.type }`, ast);
        }
        this.vStoreOutput(comps);
        this.vRetireOrReturn();
        return;
      }
      default: {
        const t = em.addLocal('v128');
        switch (this.returnType) {
          case 'Integer':
            // f32(i32(value)): the scalar path's double conversion lane-wise
            if (type === 'Float' || type === 'Number') this.vCastValueToInteger(ast.argument);
            else if (type === 'LiteralInteger') this.vCastLiteralToInteger(ast.argument);
            else this.vCoerce(this.vexpr(ast.argument), 'vi32');
            em.f32x4ConvertI32x4S();
            break;
          case 'LiteralInteger':
          case 'Number':
          case 'Float':
            if (type === 'Integer') this.vCastValueToFloat(ast.argument);
            else if (type === 'LiteralInteger') this.vCastLiteralToFloat(ast.argument);
            else this.vCoerce(this.vexpr(ast.argument), 'vf32');
            break;
          case 'Boolean':
            this.vexprMask(ast.argument);
            em.v128ConstI32x4(1, 1, 1, 1).v128And().f32x4ConvertI32x4S();
            break;
          default:
            throw this.astErrorOutput(`WebAssembly backend does not yet support returning ${ this.returnType }`, ast);
        }
        em.localSet(t);
        this.vStoreOutput([t]);
        this.vRetireOrReturn();
      }
    }
  }

  /**
   * Stores the quad's output. componentCount 1 is 4 consecutive f32 — one
   * v128 store (load+blend+store when a mask is live). componentCount n is
   * lane-strided, so components store scalar with a per-lane select.
   */
  vStoreOutput(comps) {
    const em = this.em;
    const globals = this.assembler.globals;
    const outputOffset = this.assembler.layout.outputOffset;
    const n = comps.length;
    let maskLocal = -1;
    if (this.vMaskDepth > 0) {
      maskLocal = this.vCur;
    } else if (this.vRetMask !== -1) {
      // depth 0 after a divergent return: live lanes are ~retired
      maskLocal = em.addLocal('v128');
      em.localGet(this.vRetMask).v128Not().localSet(maskLocal);
    }
    const addr = em.addLocal('i32');
    if (n === 1) {
      em.globalGet(globals.dataIndex).i32Const(2).i32Shl().localSet(addr);
      if (maskLocal === -1) {
        em.localGet(addr).localGet(comps[0]).v128Store(outputOffset, 2);
      } else {
        em.localGet(addr);
        em.localGet(comps[0]);
        em.localGet(addr).v128Load(outputOffset, 2);
        em.localGet(maskLocal).v128Bitselect();
        em.v128Store(outputOffset, 2);
      }
      return;
    }
    em.globalGet(globals.dataIndex).i32Const(n).i32Mul().i32Const(2).i32Shl().localSet(addr);
    for (let lane = 0; lane < 4; lane++) {
      for (let c = 0; c < n; c++) {
        const offset = outputOffset + (lane * n + c) * 4;
        em.localGet(addr);
        em.localGet(comps[c]).f32x4ExtractLane(lane);
        if (maskLocal !== -1) {
          em.localGet(addr).f32Load(offset);
          em.localGet(maskLocal).i32x4ExtractLane(lane);
          em.select();
        }
        em.f32Store(offset);
      }
    }
  }

  vRetireOrReturn() {
    const em = this.em;
    if (this.vMaskDepth === 0) {
      em.return_();
      this.vTerminated = true;
      return;
    }
    // divergent return: retire the active lanes, the others keep running
    em.localGet(this.vRetMask).localGet(this.vCur).v128Or().localSet(this.vRetMask);
    this.vZero();
    em.localSet(this.vCur);
    this.vTerminated = true;
  }

  vstmtBreak(brNode) {
    const target = this.vLoopStack[this.vLoopStack.length - 1];
    if (!target) {
      throw this.astErrorOutput('break used outside of a loop', brNode);
    }
    if (!target.varying) {
      this.brTo(target.breakLevel);
      this.vTerminated = true;
      return;
    }
    if (target.vBrk === -1) {
      throw this.astErrorOutput('internal: loop exit scan missed a break', brNode);
    }
    const em = this.em;
    em.localGet(target.vBrk).localGet(this.vCur).v128Or().localSet(target.vBrk);
    this.vZero();
    em.localSet(this.vCur);
    this.vTerminated = true;
  }

  vstmtContinue(crNode) {
    const target = this.vLoopStack[this.vLoopStack.length - 1];
    if (!target) {
      throw this.astErrorOutput('continue used outside of a loop', crNode);
    }
    if (!target.varying) {
      this.brTo(target.continueLevel);
      this.vTerminated = true;
      return;
    }
    if (target.vCnt === -1) {
      throw this.astErrorOutput('internal: loop exit scan missed a continue', crNode);
    }
    const em = this.em;
    em.localGet(target.vCnt).localGet(this.vCur).v128Or().localSet(target.vCnt);
    this.vZero();
    em.localSet(this.vCur);
    this.vTerminated = true;
  }

  vstmtFor(forNode) {
    if (forNode.type !== 'ForStatement') {
      throw this.astErrorOutput('Invalid for statement', forNode);
    }
    const em = this.em;
    const varying = (forNode.test ? this.vInfo.exprVarying(forNode.test) : false) ||
      this.vInfo.hasVaryingExit(forNode.body, false);
    const isSafe = this.forLoopIsSafe(forNode);
    if (forNode.init) {
      if (forNode.init.type === 'VariableDeclaration') this.vstmtVariableDeclaration(forNode.init);
      else this.vstatementExpression(forNode.init);
    }
    if (!varying) {
      // uniform trip count: the scalar loop shape, vector body
      let safeI = -1;
      if (!isSafe) {
        safeI = em.addLocal('i32');
        em.i32Const(0).localSet(safeI);
      }
      this.enterBlock();
      const breakLevel = this.depth;
      this.enterLoop();
      const loopLevel = this.depth;
      if (!isSafe) {
        em.localGet(safeI).i32Const(this.loopMax).i32GeS();
        this.brIfTo(breakLevel);
      }
      if (forNode.test) {
        this.emitCondition(forNode.test);
        em.i32Eqz();
        this.brIfTo(breakLevel);
      }
      this.enterBlock();
      const continueLevel = this.depth;
      this.vLoopStack.push({ varying: false, breakLevel, continueLevel });
      if (forNode.body) this.vstatementBody(forNode.body);
      this.vLoopStack.pop();
      this.exit();
      if (forNode.update) this.vstatementExpression(forNode.update);
      if (!isSafe) {
        em.localGet(safeI).i32Const(1).i32Add().localSet(safeI);
      }
      this.brTo(loopLevel);
      this.exit();
      this.exit();
      return;
    }
    // lane-varying trip count: iterate while any lane is live; per-lane
    // iteration counts match scalar exactly (test masks each lane out at its
    // own boundary, the shared safety counter caps at the same loopMax)
    const saved = em.addLocal('v128');
    em.localGet(this.vCur).localSet(saved);
    const vLive = em.addLocal('v128');
    em.localGet(this.vCur).localSet(vLive);
    const exits = this.vLoopBodyExits(forNode.body);
    let vBrk = -1;
    if (exits.hasBreak) {
      vBrk = em.addLocal('v128');
      this.vZero();
      em.localSet(vBrk);
    }
    const vCnt = exits.hasContinue ? em.addLocal('v128') : -1;
    let safeI = -1;
    if (!isSafe) {
      safeI = em.addLocal('i32');
      em.i32Const(0).localSet(safeI);
    }
    this.enterBlock();
    const breakLevel = this.depth;
    this.enterLoop();
    const loopLevel = this.depth;
    if (!isSafe) {
      em.localGet(safeI).i32Const(this.loopMax).i32GeS();
      this.brIfTo(breakLevel);
    }
    if (vBrk !== -1 || this.vRetMask !== -1) {
      em.localGet(vLive);
      if (vBrk !== -1) em.localGet(vBrk).v128Andnot();
      if (this.vRetMask !== -1) em.localGet(this.vRetMask).v128Andnot();
      em.localSet(vLive);
    }
    if (vCnt !== -1) {
      this.vZero();
      em.localSet(vCnt);
    }
    this.vMaskDepth++;
    em.localGet(vLive).localSet(this.vCur);
    if (forNode.test) {
      em.localGet(vLive);
      this.vexprMask(forNode.test);
      em.v128And().localSet(vLive);
    }
    em.localGet(vLive).v128AnyTrue().i32Eqz();
    this.brIfTo(breakLevel);
    em.localGet(vLive).localSet(this.vCur);
    this.vLoopStack.push({ varying: true, vLive, vBrk, vCnt, breakLevel, loopLevel });
    if (forNode.body) this.vstatementBody(forNode.body);
    this.vLoopStack.pop();
    // continued lanes rejoin for the update clause; broke/returned stay out
    em.localGet(vLive);
    if (vBrk !== -1) em.localGet(vBrk).v128Andnot();
    if (this.vRetMask !== -1) em.localGet(this.vRetMask).v128Andnot();
    em.localSet(this.vCur);
    if (forNode.update) this.vstatementExpression(forNode.update);
    this.vMaskDepth--;
    if (!isSafe) {
      em.localGet(safeI).i32Const(1).i32Add().localSet(safeI);
    }
    this.brTo(loopLevel);
    this.exit();
    this.exit();
    this.vRecomputeCur(saved);
  }

  vstmtWhile(whileNode) {
    if (whileNode.type !== 'WhileStatement') {
      throw this.astErrorOutput('Invalid while statement', whileNode);
    }
    const em = this.em;
    const varying = this.vInfo.exprVarying(whileNode.test) ||
      this.vInfo.hasVaryingExit(whileNode.body, false);
    const safeI = em.addLocal('i32');
    em.i32Const(0).localSet(safeI);
    if (!varying) {
      this.enterBlock();
      const breakLevel = this.depth;
      this.enterLoop();
      const loopLevel = this.depth;
      em.localGet(safeI).i32Const(this.loopMax).i32GeS();
      this.brIfTo(breakLevel);
      this.emitCondition(whileNode.test);
      em.i32Eqz();
      this.brIfTo(breakLevel);
      this.enterBlock();
      const continueLevel = this.depth;
      this.vLoopStack.push({ varying: false, breakLevel, continueLevel });
      this.vstatementBody(whileNode.body);
      this.vLoopStack.pop();
      this.exit();
      em.localGet(safeI).i32Const(1).i32Add().localSet(safeI);
      this.brTo(loopLevel);
      this.exit();
      this.exit();
      return;
    }
    const saved = em.addLocal('v128');
    em.localGet(this.vCur).localSet(saved);
    const vLive = em.addLocal('v128');
    em.localGet(this.vCur).localSet(vLive);
    const exits = this.vLoopBodyExits(whileNode.body);
    let vBrk = -1;
    if (exits.hasBreak) {
      vBrk = em.addLocal('v128');
      this.vZero();
      em.localSet(vBrk);
    }
    const vCnt = exits.hasContinue ? em.addLocal('v128') : -1;
    this.enterBlock();
    const breakLevel = this.depth;
    this.enterLoop();
    const loopLevel = this.depth;
    em.localGet(safeI).i32Const(this.loopMax).i32GeS();
    this.brIfTo(breakLevel);
    if (vBrk !== -1 || this.vRetMask !== -1) {
      em.localGet(vLive);
      if (vBrk !== -1) em.localGet(vBrk).v128Andnot();
      if (this.vRetMask !== -1) em.localGet(this.vRetMask).v128Andnot();
      em.localSet(vLive);
    }
    if (vCnt !== -1) {
      this.vZero();
      em.localSet(vCnt);
    }
    this.vMaskDepth++;
    em.localGet(vLive).localSet(this.vCur);
    em.localGet(vLive);
    this.vexprMask(whileNode.test);
    em.v128And().localSet(vLive);
    em.localGet(vLive).v128AnyTrue().i32Eqz();
    this.brIfTo(breakLevel);
    em.localGet(vLive).localSet(this.vCur);
    this.vLoopStack.push({ varying: true, vLive, vBrk, vCnt, breakLevel, loopLevel });
    this.vstatementBody(whileNode.body);
    this.vLoopStack.pop();
    this.vMaskDepth--;
    em.localGet(safeI).i32Const(1).i32Add().localSet(safeI);
    this.brTo(loopLevel);
    this.exit();
    this.exit();
    this.vRecomputeCur(saved);
  }

  vstmtDoWhile(doWhileNode) {
    if (doWhileNode.type !== 'DoWhileStatement') {
      throw this.astErrorOutput('Invalid while statement', doWhileNode);
    }
    const em = this.em;
    const varying = this.vInfo.exprVarying(doWhileNode.test) ||
      this.vInfo.hasVaryingExit(doWhileNode.body, false);
    const safeI = em.addLocal('i32');
    em.i32Const(0).localSet(safeI);
    if (!varying) {
      this.enterBlock();
      const breakLevel = this.depth;
      this.enterLoop();
      const loopLevel = this.depth;
      em.localGet(safeI).i32Const(this.loopMax).i32GeS();
      this.brIfTo(breakLevel);
      this.enterBlock();
      const continueLevel = this.depth;
      this.vLoopStack.push({ varying: false, breakLevel, continueLevel });
      this.vstatementBody(doWhileNode.body);
      this.vLoopStack.pop();
      this.exit();
      em.localGet(safeI).i32Const(1).i32Add().localSet(safeI);
      this.emitCondition(doWhileNode.test);
      this.brIfTo(loopLevel);
      this.exit();
      this.exit();
      return;
    }
    const saved = em.addLocal('v128');
    em.localGet(this.vCur).localSet(saved);
    const vLive = em.addLocal('v128');
    em.localGet(this.vCur).localSet(vLive);
    const exits = this.vLoopBodyExits(doWhileNode.body);
    let vBrk = -1;
    if (exits.hasBreak) {
      vBrk = em.addLocal('v128');
      this.vZero();
      em.localSet(vBrk);
    }
    const vCnt = exits.hasContinue ? em.addLocal('v128') : -1;
    this.enterBlock();
    const breakLevel = this.depth;
    this.enterLoop();
    const loopLevel = this.depth;
    em.localGet(safeI).i32Const(this.loopMax).i32GeS();
    this.brIfTo(breakLevel);
    if (vBrk !== -1 || this.vRetMask !== -1) {
      em.localGet(vLive);
      if (vBrk !== -1) em.localGet(vBrk).v128Andnot();
      if (this.vRetMask !== -1) em.localGet(this.vRetMask).v128Andnot();
      em.localSet(vLive);
    }
    if (vCnt !== -1) {
      this.vZero();
      em.localSet(vCnt);
    }
    this.vMaskDepth++;
    em.localGet(vLive).localSet(this.vCur);
    this.vLoopStack.push({ varying: true, vLive, vBrk, vCnt, breakLevel, loopLevel });
    this.vstatementBody(doWhileNode.body);
    this.vLoopStack.pop();
    // continued lanes rejoin for the test, broke/returned lanes stay out
    if (vBrk !== -1 || this.vRetMask !== -1) {
      em.localGet(vLive);
      if (vBrk !== -1) em.localGet(vBrk).v128Andnot();
      if (this.vRetMask !== -1) em.localGet(this.vRetMask).v128Andnot();
      em.localSet(vLive);
    }
    em.localGet(vLive).localSet(this.vCur);
    em.localGet(vLive);
    this.vexprMask(doWhileNode.test);
    em.v128And().localSet(vLive);
    this.vMaskDepth--;
    em.localGet(safeI).i32Const(1).i32Add().localSet(safeI);
    em.localGet(vLive).v128AnyTrue();
    this.brIfTo(loopLevel);
    this.exit();
    this.exit();
    this.vRecomputeCur(saved);
  }

  vstmtSwitch(ast) {
    if (ast.type !== 'SwitchStatement') {
      throw this.astErrorOutput('Invalid switch statement', ast);
    }
    const { discriminant, cases } = ast;
    const em = this.em;
    const varying = this.vInfo.exprVarying(discriminant) ||
      cases.some(c => c.test && this.vInfo.exprVarying(c.test));
    const type = this.getType(discriminant);
    if (!varying) {
      let dLocal;
      let dIsInt;
      switch (type) {
        case 'Float':
        case 'Number':
          dIsInt = false;
          dLocal = em.addLocal('f32');
          this.coerce(this.expression(discriminant), 'f32');
          em.localSet(dLocal);
          break;
        case 'Integer':
          dIsInt = true;
          dLocal = em.addLocal('i32');
          this.coerce(this.expression(discriminant), 'i32');
          em.localSet(dLocal);
          break;
        default:
          throw this.astErrorOutput(`Unhandled switch discriminant type "${ type }"`, ast);
      }
      if (cases.length === 1 && !cases[0].test) {
        this.vEmitSwitchConsequent(cases[0].consequent);
        return;
      }
      const { groups, defaultConsequent } = this.collectSwitchGroups(cases);
      const emitChain = (index) => {
        if (index === groups.length) {
          if (defaultConsequent) this.vEmitSwitchConsequent(defaultConsequent);
          return;
        }
        const { tests, consequent } = groups[index];
        for (let i = 0; i < tests.length; i++) {
          em.localGet(dLocal);
          this.emitSwitchTest(tests[i], dIsInt);
          if (dIsInt) em.i32Eq();
          else em.f32Eq();
          if (i > 0) em.i32Or();
        }
        this.enterIf();
        this.vEmitSwitchConsequent(consequent);
        if (index + 1 < groups.length || defaultConsequent) {
          em.else_();
          emitChain(index + 1);
        }
        this.exit();
      };
      emitChain(0);
      return;
    }
    // varying discriminant: per-group masks with earlier matches excluded —
    // the same first-match-wins the scalar if/else chain encodes
    let dLocal;
    let dIsInt;
    switch (type) {
      case 'Float':
      case 'Number':
        dIsInt = false;
        dLocal = em.addLocal('v128');
        this.vCoerce(this.vexpr(discriminant), 'vf32');
        em.localSet(dLocal);
        break;
      case 'Integer':
        dIsInt = true;
        dLocal = em.addLocal('v128');
        this.vCoerce(this.vexpr(discriminant), 'vi32');
        em.localSet(dLocal);
        break;
      default:
        throw this.astErrorOutput(`Unhandled switch discriminant type "${ type }"`, ast);
    }
    if (cases.length === 1 && !cases[0].test) {
      this.vEmitSwitchConsequent(cases[0].consequent);
      return;
    }
    const { groups, defaultConsequent } = this.collectSwitchGroups(cases);
    const saved = em.addLocal('v128');
    em.localGet(this.vCur).localSet(saved);
    const prior = em.addLocal('v128');
    this.vZero();
    em.localSet(prior);
    const gm = em.addLocal('v128');
    this.vMaskDepth++;
    for (let g = 0; g < groups.length; g++) {
      const { tests, consequent } = groups[g];
      for (let i = 0; i < tests.length; i++) {
        em.localGet(dLocal);
        this.vEmitSwitchTest(tests[i], dIsInt);
        if (dIsInt) em.i32x4Eq();
        else em.f32x4Eq();
        if (i > 0) em.v128Or();
      }
      em.localSet(gm);
      this.vRecomputeCur(saved);
      em.localGet(this.vCur).localGet(gm).v128And().localGet(prior).v128Andnot().localSet(this.vCur);
      em.localGet(prior).localGet(gm).v128Or().localSet(prior);
      em.localGet(this.vCur).v128AnyTrue();
      this.enterIf();
      this.vEmitSwitchConsequent(consequent);
      this.exit();
    }
    if (defaultConsequent) {
      this.vRecomputeCur(saved);
      em.localGet(this.vCur).localGet(prior).v128Andnot().localSet(this.vCur);
      em.localGet(this.vCur).v128AnyTrue();
      this.enterIf();
      this.vEmitSwitchConsequent(defaultConsequent);
      this.exit();
    }
    this.vMaskDepth--;
    this.vRecomputeCur(saved);
  }

  vEmitSwitchTest(test, dIsInt) {
    const testType = this.getType(test);
    if (dIsInt) {
      if (testType === 'Number' || testType === 'Float') this.vCastValueToInteger(test);
      else if (testType === 'LiteralInteger') this.vCastLiteralToInteger(test);
      else this.vCoerce(this.vexpr(test), 'vi32');
    } else {
      if (testType === 'LiteralInteger') this.vCastLiteralToFloat(test);
      else if (testType === 'Integer') this.vCastValueToFloat(test);
      else this.vCoerce(this.vexpr(test), 'vf32');
    }
  }

  vEmitSwitchConsequent(consequent) {
    const statements = this.collectSwitchCaseStatements(consequent);
    const previous = this.vTerminated;
    this.vTerminated = false;
    for (let i = 0; i < statements.length; i++) {
      this.vstatement(statements[i]);
      if (this.vTerminated) break;
    }
    this.vTerminated = previous;
  }

  // ----------------------------------------------------- vector expressions

  /**
   * Emits `ast` in the vector walk. Uniform expressions go through the
   * scalar walk untouched (one shared value; splatted only where a varying
   * context needs it) and return scalar categories; varying expressions
   * return 'vf32' | 'vi32' | 'vbool' (i32x4 lane mask) | 'void'.
   */
  vexpr(ast) {
    if (!this.vInfo.exprVarying(ast)) {
      return this.expression(ast);
    }
    switch (ast.type) {
      case 'Identifier':
        return this.vexprIdentifier(ast);
      case 'BinaryExpression':
        return this.vexprBinary(ast);
      case 'LogicalExpression':
        return this.vexprLogical(ast);
      case 'UnaryExpression':
        return this.vexprUnary(ast);
      case 'UpdateExpression':
        return this.vUpdate(ast, false);
      case 'ConditionalExpression':
        return this.vexprConditional(ast);
      case 'CallExpression':
        return this.vexprCall(ast);
      case 'MemberExpression':
        return this.vexprMember(ast);
      case 'SequenceExpression':
        if (ast.expressions.length === 1) return this.vexpr(ast.expressions[0]);
        throw this.astErrorOutput('WebAssembly backend does not yet support the comma operator', ast);
      case 'AssignmentExpression':
        throw this.astErrorOutput('WebAssembly backend does not yet support assignment used as an expression', ast);
      default:
        throw this.astErrorOutput(`Unknown expression type ${ ast.type }`, ast);
    }
  }

  vexprIdentifier(ast) {
    const local = this.locals.get(ast.name);
    if (!local) {
      throw this.astErrorOutput(`Unhandled varying identifier "${ ast.name }"`, ast);
    }
    if (local.kind === 'vvec') {
      throw this.astErrorOutput(`array-valued variable "${ ast.name }" can only be indexed or returned`, ast);
    }
    if (local.kind !== 'vscalar') {
      throw this.astErrorOutput(`internal: varying read of uniform local "${ ast.name }"`, ast);
    }
    this.em.localGet(local.index);
    return local.wtype;
  }

  vexprBinary(ast) {
    const operator = ast.operator;
    const em = this.em;

    if (operator === '**') {
      const a = em.addLocal('v128');
      const b = em.addLocal('v128');
      this.vEmitByType(ast.left, 'vf32');
      em.localSet(a);
      this.vEmitByType(ast.right, 'vf32');
      em.localSet(b);
      this.usedMathImports.add('pow');
      this.vLaneCall2('math_pow', a, b);
      return 'vf32';
    }

    if (BITWISE_OPS[operator]) {
      if (VECTOR_SHIFT_OPS[operator]) return this.vexprShift(ast);
      this.vEmitAsIntegerOperand(ast.left);
      this.vEmitAsIntegerOperand(ast.right);
      em[{ '&': 'v128And', '|': 'v128Or', '^': 'v128Xor' } [operator]]();
      return 'vi32';
    }

    if (operator === '/' || operator === '%') {
      if (operator === '/') {
        this.vEmitByType(ast.left, 'vf32');
        this.vEmitByType(ast.right, 'vf32');
        em.f32x4Div();
        return 'vf32';
      }
      const a = em.addLocal('v128');
      const b = em.addLocal('v128');
      this.vEmitByType(ast.left, 'vf32');
      em.localSet(a);
      this.vEmitByType(ast.right, 'vf32');
      em.localSet(b);
      em.localGet(a).localGet(a).localGet(b).f32x4Div().f32x4Trunc().localGet(b).f32x4Mul().f32x4Sub();
      return 'vf32';
    }

    const leftType = this.getType(ast.left) || 'Number';
    const rightType = this.getType(ast.right) || 'Number';
    const key = leftType + ' & ' + rightType;
    let category;
    switch (key) {
      case 'Integer & Integer':
        this.pushState('building-integer');
        this.vCoerce(this.vexpr(ast.left), 'vi32');
        this.vCoerce(this.vexpr(ast.right), 'vi32');
        this.popState('building-integer');
        category = 'vi32';
        break;
      case 'Number & Float':
      case 'Float & Number':
      case 'Float & Float':
      case 'Number & Number':
        this.pushState('building-float');
        this.vCoerce(this.vexpr(ast.left), 'vf32');
        this.vCoerce(this.vexpr(ast.right), 'vf32');
        this.popState('building-float');
        category = 'vf32';
        break;
      case 'LiteralInteger & LiteralInteger':
        if (this.isState('casting-to-integer') || this.isState('building-integer')) {
          this.pushState('building-integer');
          this.vCoerce(this.vexpr(ast.left), 'vi32');
          this.vCoerce(this.vexpr(ast.right), 'vi32');
          this.popState('building-integer');
          category = 'vi32';
        } else {
          this.pushState('building-float');
          this.vCastLiteralToFloat(ast.left);
          this.vCastLiteralToFloat(ast.right);
          this.popState('building-float');
          category = 'vf32';
        }
        break;
      case 'Integer & Float':
      case 'Integer & Number':
        this.pushState('building-float');
        this.vCastValueToFloat(ast.left);
        this.vCoerce(this.vexpr(ast.right), 'vf32');
        this.popState('building-float');
        category = 'vf32';
        break;
      case 'Integer & LiteralInteger':
        this.pushState('building-integer');
        this.vCoerce(this.vexpr(ast.left), 'vi32');
        this.vCastLiteralToInteger(ast.right);
        this.popState('building-integer');
        category = 'vi32';
        break;
      case 'Number & Integer':
      case 'Float & Integer':
        this.pushState('building-float');
        this.vCoerce(this.vexpr(ast.left), 'vf32');
        this.vCastValueToFloat(ast.right);
        this.popState('building-float');
        category = 'vf32';
        break;
      case 'Float & LiteralInteger':
      case 'Number & LiteralInteger':
        this.pushState('building-float');
        this.vCoerce(this.vexpr(ast.left), 'vf32');
        this.vCastLiteralToFloat(ast.right);
        this.popState('building-float');
        category = 'vf32';
        break;
      case 'LiteralInteger & Float':
      case 'LiteralInteger & Number':
        if (this.isState('casting-to-integer')) {
          this.pushState('building-integer');
          this.vCastLiteralToInteger(ast.left);
          this.vCastValueToInteger(ast.right);
          this.popState('building-integer');
          category = 'vi32';
        } else {
          this.pushState('building-float');
          this.vCastLiteralToFloat(ast.left);
          this.pushState('casting-to-float');
          this.vCoerce(this.vexpr(ast.right), 'vf32');
          this.popState('casting-to-float');
          this.popState('building-float');
          category = 'vf32';
        }
        break;
      case 'LiteralInteger & Integer':
        this.pushState('building-integer');
        this.vCastLiteralToInteger(ast.left);
        this.vCoerce(this.vexpr(ast.right), 'vi32');
        this.popState('building-integer');
        category = 'vi32';
        break;
      case 'Boolean & Boolean':
        this.vCoerce(this.vexpr(ast.left), 'vi32');
        this.vCoerce(this.vexpr(ast.right), 'vi32');
        category = 'vi32';
        break;
      default:
        throw this.astErrorOutput(`Unhandled binary expression between ${ key }`, ast);
    }

    const compareOp = category === 'vi32' ? VI32_COMPARE[operator] : VF32_COMPARE[operator];
    if (compareOp) {
      em[compareOp]();
      return 'vbool';
    }
    const arithOp = category === 'vi32' ? VI32_ARITH[operator] : VF32_ARITH[operator];
    if (!arithOp) {
      throw this.astErrorOutput(`Unhandled operator ${ operator }`, ast);
    }
    em[arithOp]();
    return category;
  }

  /**
   * i32x4 shifts take ONE scalar count for all lanes; a lane-varying count
   * lane-scalarizes through the scalar opcode (same mod-32 masking).
   */
  vexprShift(ast) {
    const em = this.em;
    this.vEmitAsIntegerOperand(ast.left);
    if (!this.vInfo.exprVarying(ast.right)) {
      this.emitAsIntegerOperand(ast.right);
      em[VECTOR_SHIFT_OPS[ast.operator]]();
      return 'vi32';
    }
    const a = em.addLocal('v128');
    const b = em.addLocal('v128');
    em.localSet(a);
    this.vEmitAsIntegerOperand(ast.right);
    em.localSet(b);
    const op = BITWISE_OPS[ast.operator];
    for (let lane = 0; lane < 4; lane++) {
      em.localGet(a).i32x4ExtractLane(lane);
      em.localGet(b).i32x4ExtractLane(lane);
      em[op]();
      if (lane === 0) em.i32x4Splat();
      else em.i32x4ReplaceLane(lane);
    }
    return 'vi32';
  }

  vEmitAsIntegerOperand(side) {
    switch (this.getType(side)) {
      case 'Number':
      case 'Float':
        this.vCastValueToInteger(side);
        break;
      case 'LiteralInteger':
        this.vCastLiteralToInteger(side);
        break;
      default: {
        this.pushState('building-integer');
        const type = this.vexpr(side);
        this.popState('building-integer');
        this.vCoerce(type, 'vi32');
      }
    }
  }

  /**
   * Predicated logic evaluates BOTH operands as masks (per-lane skipping
   * cannot exist); side effects in the right operand still predicate
   * correctly because vCur narrows to the left verdict while it runs, and
   * the gather clamps keep formerly short-circuit-guarded reads from
   * trapping.
   */
  vexprLogical(ast) {
    const em = this.em;
    const mLeft = em.addLocal('v128');
    this.vexprMask(ast.left);
    em.localSet(mLeft);
    const saved = em.addLocal('v128');
    em.localGet(this.vCur).localSet(saved);
    em.localGet(this.vCur).localGet(mLeft);
    if (ast.operator === '&&') em.v128And();
    else if (ast.operator === '||') em.v128Andnot();
    else throw this.astErrorOutput(`Unhandled logical operator ${ ast.operator }`, ast);
    em.localSet(this.vCur);
    this.vMaskDepth++;
    this.vexprMask(ast.right);
    this.vMaskDepth--;
    em.localGet(saved).localSet(this.vCur);
    em.localGet(mLeft);
    if (ast.operator === '&&') em.v128And();
    else em.v128Or();
    return 'vbool';
  }

  vexprUnary(ast) {
    const em = this.em;
    switch (ast.operator) {
      case '~':
        this.vEmitAsIntegerOperand(ast.argument);
        em.v128ConstI32x4(-1, -1, -1, -1).v128Xor();
        return 'vi32';
      case '!':
        this.vexprMask(ast.argument);
        em.v128Not();
        return 'vbool';
      case '+':
        return this.vexpr(ast.argument);
      case '-': {
        const type = this.getType(ast.argument);
        const wantsInteger = type === 'Integer' ||
          (type === 'LiteralInteger' && (this.isState('casting-to-integer') || this.isState('building-integer')));
        if (wantsInteger) {
          this.vZero();
          this.vEmitByType(ast.argument, 'vi32');
          em.i32x4Sub();
          return 'vi32';
        }
        this.vEmitByType(ast.argument, 'vf32');
        em.f32x4Neg();
        return 'vf32';
      }
      default:
        throw this.astErrorOutput(`Unhandled unary operator ${ ast.operator }`, ast);
    }
  }

  vexprConditional(ast) {
    const em = this.em;
    const consequentType = this.getType(ast.consequent);
    const alternateType = this.getType(ast.alternate);
    if (consequentType === null && alternateType === null) {
      this.vTernaryStatement(ast);
      return 'void';
    }
    let targetType = consequentType === 'LiteralInteger' ? 'Number' : consequentType;
    if (targetType === 'Integer' && (alternateType === 'Number' || alternateType === 'Float')) {
      targetType = 'Number';
    }
    const emitBranch = (branch) => {
      const branchType = this.getType(branch);
      switch (targetType) {
        case 'Number':
        case 'Float':
          if (branchType === 'Integer') this.vCastValueToFloat(branch);
          else if (branchType === 'LiteralInteger') this.vCastLiteralToFloat(branch);
          else this.vCoerce(this.vexpr(branch), 'vf32');
          break;
        case 'Integer':
          if (branchType === 'Number' || branchType === 'Float') this.vCastValueToInteger(branch);
          else if (branchType === 'LiteralInteger') this.vCastLiteralToInteger(branch);
          else this.vCoerce(this.vexpr(branch), 'vi32');
          break;
        case 'Boolean':
          this.vexprMask(branch);
          break;
        default:
          throw this.astErrorOutput(`WebAssembly backend does not yet support a ternary of type ${ targetType }`, ast);
      }
    };
    const resultCategory = targetType === 'Integer' ? 'vi32' : targetType === 'Boolean' ? 'vbool' : 'vf32';
    if (!this.vInfo.exprVarying(ast.test)) {
      // uniform test: a real branch evaluates one side, exactly like scalar
      this.emitCondition(ast.test);
      this.enterIf('v128');
      emitBranch(ast.consequent);
      em.else_();
      emitBranch(ast.alternate);
      this.exit();
      return resultCategory;
    }
    const m = em.addLocal('v128');
    this.vexprMask(ast.test);
    em.localSet(m);
    const saved = em.addLocal('v128');
    em.localGet(this.vCur).localSet(saved);
    const v1 = em.addLocal('v128');
    const v2 = em.addLocal('v128');
    em.localGet(saved).localGet(m).v128And().localSet(this.vCur);
    this.vMaskDepth++;
    emitBranch(ast.consequent);
    em.localSet(v1);
    em.localGet(saved).localGet(m).v128Andnot().localSet(this.vCur);
    emitBranch(ast.alternate);
    em.localSet(v2);
    this.vMaskDepth--;
    em.localGet(saved).localSet(this.vCur);
    em.localGet(v1).localGet(v2).localGet(m).v128Bitselect();
    return resultCategory;
  }

  vTernaryStatement(ast) {
    const em = this.em;
    if (!this.vInfo.exprVarying(ast.test)) {
      this.emitCondition(ast.test);
      this.enterIf();
      this.vstatementExpression(ast.consequent);
      em.else_();
      this.vstatementExpression(ast.alternate);
      this.exit();
      return;
    }
    const m = em.addLocal('v128');
    this.vexprMask(ast.test);
    em.localSet(m);
    const saved = em.addLocal('v128');
    em.localGet(this.vCur).localSet(saved);
    em.localGet(saved).localGet(m).v128And().localSet(this.vCur);
    this.vMaskDepth++;
    this.vstatementExpression(ast.consequent);
    em.localGet(saved).localGet(m).v128Andnot().localSet(this.vCur);
    this.vstatementExpression(ast.alternate);
    this.vMaskDepth--;
    em.localGet(saved).localSet(this.vCur);
  }

  vexprCall(ast) {
    if (!ast.callee) {
      throw this.astErrorOutput('Unknown CallExpression', ast);
    }
    if (ast.callee.type === 'MemberExpression' && this.getVariableSignature(ast.callee, true) === 'this.color') {
      throw this.astErrorOutput('WebAssembly backend does not yet support graphical mode (this.color)', ast);
    }
    let functionName = null;
    const isMathFunction = this.isAstMathFunction(ast);
    if (isMathFunction || (ast.callee.object && ast.callee.object.type === 'ThisExpression')) {
      functionName = ast.callee.property.name;
    } else if (
      ast.callee.type === 'SequenceExpression' &&
      ast.callee.expressions[0].type === 'Literal' &&
      !isNaN(ast.callee.expressions[0].raw)
    ) {
      functionName = ast.callee.expressions[1].property.name;
    } else {
      functionName = ast.callee.name;
    }
    if (!functionName) {
      throw this.astErrorOutput(`Unhandled function, couldn't find name`, ast);
    }
    if (isMathFunction) {
      return this.vMathCall(functionName, ast);
    }
    return this.vUserCall(functionName, ast);
  }

  /**
   * Helpers stay scalar; a varying call lane-scalarizes: per lane, set that
   * lane's thread.x and PCG state, extract the lane's arguments, call, and
   * rebuild the result vector. Same function bodies and imports as the
   * scalar path, so every lane is bit-identical to its scalar run.
   */
  vUserCall(functionName, ast) {
    const em = this.em;
    const info = this.assembler.helperInfo || { readsThread: false, usesRandom: false };
    const globals = this.assembler.globals;
    const returnType = this.getType(ast);
    const targetTypes = this.lookupFunctionArgumentTypes(functionName) || [];
    const argLocals = [];
    for (let i = 0; i < ast.arguments.length; ++i) {
      const argument = ast.arguments[i];
      let targetType = targetTypes[i];
      const argumentType = this.getType(argument);
      if (!targetType) {
        this.triggerImplyArgumentType(functionName, i, argumentType, this);
        targetType = argumentType;
      }
      let wtype;
      switch (argumentType) {
        case 'Boolean':
          this.vCoerce(this.vexpr(argument), 'vi32');
          wtype = 'vi32';
          break;
        case 'Number':
        case 'Float':
          if (targetType === 'Integer') {
            this.vCastValueToInteger(argument);
            wtype = 'vi32';
          } else {
            this.vCoerce(this.vexpr(argument), 'vf32');
            wtype = 'vf32';
          }
          break;
        case 'Integer':
          if (targetType === 'Number' || targetType === 'Float') {
            this.vCastValueToFloat(argument);
            wtype = 'vf32';
          } else {
            this.vCoerce(this.vexpr(argument), 'vi32');
            wtype = 'vi32';
          }
          break;
        case 'LiteralInteger':
          if (targetType === 'Integer') {
            this.vCastLiteralToInteger(argument);
            wtype = 'vi32';
          } else {
            this.vCastLiteralToFloat(argument);
            wtype = 'vf32';
          }
          break;
        default:
          throw this.astErrorOutput('WebAssembly backend does not yet support array arguments to helper functions', ast);
      }
      const index = em.addLocal('v128');
      em.localSet(index);
      argLocals.push({ index, wtype });
    }
    const resultKind = returnType === null || returnType === undefined ? 'void' :
      returnType === 'Integer' || returnType === 'Boolean' ? 'i32' : 'f32';
    const resultTmp = resultKind === 'void' ? -1 : em.addLocal(resultKind);
    const resultVec = resultKind === 'void' ? -1 : em.addLocal('v128');
    let stateTmp = -1;
    if (info.usesRandom) {
      // candidate post-call states; blended under the live mask afterwards
      // so a call evaluated for inactive lanes cannot advance their streams
      stateTmp = em.addLocal('v128');
      em.globalGet(globals.pcgStateV).localSet(stateTmp);
    }
    for (let lane = 0; lane < 4; lane++) {
      if (info.readsThread) {
        em.localGet(this._vBaseX);
        if (lane > 0) em.i32Const(lane).i32Add();
        em.globalSet(globals.threadX);
      }
      if (info.usesRandom) {
        em.localGet(stateTmp).i32x4ExtractLane(lane).globalSet(globals.pcgState);
      }
      for (const arg of argLocals) {
        em.localGet(arg.index);
        if (arg.wtype === 'vi32') em.i32x4ExtractLane(lane);
        else em.f32x4ExtractLane(lane);
      }
      em.call(this.mangleFunctionName(functionName));
      if (resultKind !== 'void') em.localSet(resultTmp);
      if (info.usesRandom) {
        em.localGet(stateTmp).globalGet(globals.pcgState).i32x4ReplaceLane(lane).localSet(stateTmp);
      }
      if (resultKind !== 'void') {
        if (lane === 0) {
          em.localGet(resultTmp);
          if (resultKind === 'i32') em.i32x4Splat();
          else em.f32x4Splat();
          em.localSet(resultVec);
        } else {
          em.localGet(resultVec).localGet(resultTmp);
          if (resultKind === 'i32') em.i32x4ReplaceLane(lane);
          else em.f32x4ReplaceLane(lane);
          em.localSet(resultVec);
        }
      }
    }
    if (info.readsThread) {
      em.localGet(this._vBaseX).globalSet(globals.threadX);
    }
    if (info.usesRandom) {
      em.localGet(stateTmp).globalGet(globals.pcgStateV);
      if (this.vMaskDepth > 0) em.localGet(this.vCur);
      else em.v128ConstI32x4(-1, -1, -1, -1);
      em.v128Bitselect().globalSet(globals.pcgStateV);
    }
    if (resultKind === 'void') return 'void';
    em.localGet(resultVec);
    // Boolean results are 0/1 i32 lanes, the scalar convention
    return resultKind === 'i32' ? 'vi32' : 'vf32';
  }

  vMathCall(functionName, ast) {
    const em = this.em;
    if (functionName === 'random') {
      this.usesRandom = true;
      // only the active lanes' states may advance (see _emitPcgRandomVector)
      if (this.vMaskDepth > 0) em.localGet(this.vCur);
      else em.v128ConstI32x4(-1, -1, -1, -1);
      em.call('pcg_random_v');
      return 'vf32';
    }
    const emitArg = (argument) => {
      switch (this.getType(argument)) {
        case 'Integer':
          this.vCastValueToFloat(argument);
          break;
        case 'LiteralInteger':
          this.vCastLiteralToFloat(argument);
          break;
        default:
          this.vCoerce(this.vexpr(argument), 'vf32');
      }
    };
    const nativeOp = VECTOR_MATH_NATIVE_OPS[functionName];
    if (nativeOp) {
      emitArg(ast.arguments[0]);
      em[nativeOp]();
      return 'vf32';
    }
    switch (functionName) {
      case 'round':
        emitArg(ast.arguments[0]);
        em.v128ConstF32x4(0.5, 0.5, 0.5, 0.5).f32x4Add().f32x4Floor();
        return 'vf32';
      case 'fround':
        emitArg(ast.arguments[0]);
        return 'vf32';
      case 'min':
      case 'max': {
        // f32x4.min/max share f32.min/max NaN and -0 semantics
        const op = functionName === 'min' ? 'f32x4Min' : 'f32x4Max';
        emitArg(ast.arguments[0]);
        for (let i = 1; i < ast.arguments.length; i++) {
          emitArg(ast.arguments[i]);
          em[op]();
        }
        return 'vf32';
      }
      case 'imul':
        emitArg(ast.arguments[0]);
        em.i32x4TruncSatF32x4S();
        emitArg(ast.arguments[1]);
        em.i32x4TruncSatF32x4S();
        em.i32x4Mul().f32x4ConvertI32x4S();
        return 'vf32';
      case 'clz32': {
        emitArg(ast.arguments[0]);
        em.i32x4TruncSatF32x4U();
        const t = em.addLocal('v128');
        em.localSet(t);
        // no SIMD clz: lane-scalarized through the same scalar opcode
        em.localGet(t).i32x4ExtractLane(0).i32Clz().i32x4Splat();
        for (let lane = 1; lane < 4; lane++) {
          em.localGet(t).i32x4ExtractLane(lane).i32Clz().i32x4ReplaceLane(lane);
        }
        em.f32x4ConvertI32x4S();
        return 'vf32';
      }
      default: {
        const arity = MATH_IMPORT_ARITY[functionName];
        if (!arity) {
          throw this.astErrorOutput(`WebAssembly backend does not yet support Math.${ functionName }`, ast);
        }
        this.usedMathImports.add(functionName);
        if (arity === 1) {
          emitArg(ast.arguments[0]);
          const t = em.addLocal('v128');
          em.localSet(t);
          this.vLaneCall1('math_' + functionName, t);
        } else {
          const a = em.addLocal('v128');
          const b = em.addLocal('v128');
          emitArg(ast.arguments[0]);
          em.localSet(a);
          emitArg(ast.arguments[1]);
          em.localSet(b);
          this.vLaneCall2('math_' + functionName, a, b);
        }
        return 'vf32';
      }
    }
  }

  // transcendentals have no SIMD form: 4 extracts through the same scalar
  // import keep every lane bit-identical to the scalar path
  vLaneCall1(name, argLocal) {
    const em = this.em;
    em.localGet(argLocal).f32x4ExtractLane(0).call(name).f32x4Splat();
    for (let lane = 1; lane < 4; lane++) {
      em.localGet(argLocal).f32x4ExtractLane(lane).call(name).f32x4ReplaceLane(lane);
    }
  }

  vLaneCall2(name, aLocal, bLocal) {
    const em = this.em;
    em.localGet(aLocal).f32x4ExtractLane(0).localGet(bLocal).f32x4ExtractLane(0).call(name).f32x4Splat();
    for (let lane = 1; lane < 4; lane++) {
      em.localGet(aLocal).f32x4ExtractLane(lane).localGet(bLocal).f32x4ExtractLane(lane).call(name).f32x4ReplaceLane(lane);
    }
  }

  vexprMember(mNode) {
    const details = this.getMemberExpressionDetails(mNode);
    if (!details) {
      throw this.astErrorOutput('Unexpected expression', mNode);
    }
    const { signature, name, property, xProperty, yProperty, zProperty } = details;
    const em = this.em;
    switch (signature) {
      case 'value.thread.value':
      case 'this.thread.value': {
        if (name !== 'x') {
          throw this.astErrorOutput(`internal: thread.${ name } is uniform along the lane axis`, mNode);
        }
        this.readsThread = true;
        em.globalGet(this.assembler.globals.threadX).i32x4Splat();
        em.v128ConstI32x4(0, 1, 2, 3).i32x4Add();
        return 'vi32';
      }
      case 'value.value': {
        const component = { r: 0, g: 1, b: 2, a: 3 } [property];
        if (component !== undefined) {
          const local = this.locals.get(name);
          if (local && local.kind === 'vvec' && component < local.n) {
            em.localGet(local.indices[component]);
            return 'vf32';
          }
        }
        throw this.astErrorOutput('Unexpected expression', mNode);
      }
      case 'value[]':
      case 'value[][]':
      case 'value[][][]':
      case 'value[][][][]': {
        const local = this.locals.get(name);
        if (local && (local.kind === 'vec' || local.kind === 'vvec')) {
          if (signature !== 'value[]') {
            throw this.astErrorOutput('Unexpected expression', mNode);
          }
          return this.vVecIndex(local, xProperty);
        }
        return this.vGather('arrays', name, xProperty, yProperty, zProperty, mNode);
      }
      case 'this.constants.value[]':
      case 'this.constants.value[][]':
      case 'this.constants.value[][][]':
      case 'this.constants.value[][][][]':
        return this.vGather('constantArrays', name, xProperty, yProperty, zProperty, mNode);
      case 'fn()[]':
        throw this.astErrorOutput('WebAssembly backend does not yet support indexing a function call result', mNode);
      default:
        throw this.astErrorOutput(`WebAssembly backend does not yet support expression signature "${ signature }"`, mNode);
    }
  }

  vVecIndex(local, xProperty) {
    const em = this.em;
    const getComponent = (k) => {
      em.localGet(local.indices[k]);
      if (local.kind === 'vec') em.f32x4Splat();
    };
    if (xProperty.type === 'Literal' && Number.isInteger(xProperty.value)) {
      if (xProperty.value < 0 || xProperty.value >= local.n) {
        throw this.astErrorOutput(`index ${ xProperty.value } out of range for Array(${ local.n })`, xProperty);
      }
      getComponent(xProperty.value);
      return 'vf32';
    }
    // per-lane component choice: the scalar select chain as bitselects
    const idx = em.addLocal('v128');
    this.vEmitIndex(xProperty);
    em.localSet(idx);
    const acc = em.addLocal('v128');
    getComponent(0);
    em.localSet(acc);
    for (let k = 1; k < local.n; k++) {
      getComponent(k);
      em.localGet(acc);
      em.localGet(idx).v128ConstI32x4(k, k, k, k).i32x4Eq();
      em.v128Bitselect();
      em.localSet(acc);
    }
    em.localGet(acc);
    return 'vf32';
  }

  vEmitIndex(property) {
    if (!property) {
      throw new Error('Property not set');
    }
    const type = this.getType(property);
    switch (type) {
      case 'Number':
      case 'Float':
        this.vCastValueToInteger(property);
        return;
      case 'LiteralInteger':
        this.vCastLiteralToInteger(property);
        return;
      case 'Integer': {
        this.pushState('building-integer');
        const emitted = this.vexpr(property);
        this.popState('building-integer');
        this.vCoerce(emitted, 'vi32');
        return;
      }
      default:
        this.vCoerce(this.vexpr(property), 'vi32');
    }
  }

  /**
   * Lane-varying gather: flat row-major index in i32x4 (the scalar formula
   * lane-wise), clamped into the region so lanes a divergent branch turned
   * off cannot trap, then 4 scalar loads + lane inserts — v128 has no
   * gather. In-bounds lanes are untouched by the clamp.
   */
  vGather(table, name, xProperty, yProperty, zProperty, mNode) {
    const em = this.em;
    const layout = this.assembler.layout[table][name];
    if (!layout) {
      throw this.astErrorOutput(`no memory layout for "${ name }" — arrays are only readable as kernel arguments or constants`, mNode);
    }
    this.vEmitIndex(xProperty);
    if (yProperty) {
      this.vEmitIndex(yProperty);
      const d = layout.dims[0];
      em.v128ConstI32x4(d, d, d, d).i32x4Mul().i32x4Add();
    }
    if (zProperty) {
      this.vEmitIndex(zProperty);
      const d = layout.dims[0] * layout.dims[1];
      em.v128ConstI32x4(d, d, d, d).i32x4Mul().i32x4Add();
    }
    this.vZero();
    em.i32x4MaxS();
    const max = layout.flatLength - 1;
    em.v128ConstI32x4(max, max, max, max).i32x4MinS();
    const idx = em.addLocal('v128');
    em.localSet(idx);
    em.localGet(idx).i32x4ExtractLane(0).i32Const(2).i32Shl().f32Load(layout.offset).f32x4Splat();
    for (let lane = 1; lane < 4; lane++) {
      em.localGet(idx).i32x4ExtractLane(lane).i32Const(2).i32Shl().f32Load(layout.offset).f32x4ReplaceLane(lane);
    }
    return 'vf32';
  }

  // ---------------------------------------------- SIMD uniformity analysis

  /**
   * Conservative thread-dependence for the SIMD phase: thread.x is the lane
   * axis (thread.y/z are uniform across an x-row), Math.random is per-cell,
   * user helper calls may read thread state internally, tainted locals
   * propagate in walk order and never clear.
   */
  isThreadDependent(ast) {
    if (!ast || typeof ast !== 'object') return false;
    if (Array.isArray(ast)) return ast.some(node => this.isThreadDependent(node));
    switch (ast.type) {
      case 'MemberExpression': {
        const signature = this.getVariableSignature(ast);
        if (signature === 'this.thread.value' || signature === 'value.thread.value') {
          return ast.property.name === 'x';
        }
        break;
      }
      case 'CallExpression':
        if (this.isAstMathFunction(ast)) {
          if (ast.callee.property.name === 'random') return true;
          break;
        }
        return true;
      case 'Identifier':
        return this.taintedLocals ? this.taintedLocals.has(ast.name) : false;
      case 'ThisExpression':
        return false;
    }
    for (const key in ast) {
      if (key === 'loc' || key === 'start' || key === 'end' || key === 'parent') continue;
      const child = ast[key];
      if (child && typeof child === 'object' && this.isThreadDependent(child)) return true;
    }
    return false;
  }

  recordUniformity(kind, testAst) {
    if (!this._analysisPass) return;
    this.uniformity.push({
      kind,
      threadDependent: testAst ? this.isThreadDependent(testAst) : true,
    });
  }
}

module.exports = {
  WebAssemblyFunctionNode
};