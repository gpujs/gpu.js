/**
 * @desc Backend-agnostic AST optimization pass, run at the FunctionBuilder
 * stage by every function node that EMITS code. `dev` never reaches here --
 * gpu-mock runs the user's own function, so there is no emission to optimize.
 *
 * ORDERING IS LOAD-BEARING and owned by FunctionNode.getJsAST: de-minification
 * unfolds statements FIRST (the pass must never see a comma-folded expression
 * or a statement-position sequence), this runs second, and every per-backend
 * normalization -- webgl's linearization and do-while rotation, webasm's
 * variance analysis and SIMD emission -- sees the shapes this pass leaves
 * behind.
 *
 * Every transform is PER-SITE best effort: whatever cannot be proven safe
 * skips THAT site, never the tier. Un-transformed emission is always valid,
 * which is what makes a bail cheap.
 *
 * The bar the output is held to is bitwise parity with the same kernel built
 * with `_optimizerDisabled`, on that backend's own arithmetic. Nothing here
 * reassociates floating point, changes how many times an operation runs, or
 * moves a call -- so a seeded Math.random stream draws in exactly the same
 * order either way.
 */

/**
 * Synthetic node positions. astKey and the literal-type cache are keyed by
 * start/end, so every node this pass creates needs a unique pair. The
 * 0x60000000 base is disjoint from real acorn offsets, from de-minification's
 * 0x20000000 and from the webgl hoisting machinery's 0x40000000.
 */
let syntheticNodeId = 0x60000000;

function stampSynthetic(node, source) {
  node.start = syntheticNodeId++;
  node.end = syntheticNodeId++;
  if (source && source.loc) node.loc = source.loc;
  return node;
}

const scalarTypes = ['Number', 'Float', 'Integer'];

const thisWrite = '@this';

const indexedReadSignatures = [
  'value[]',
  'value[][]',
  'value[][][]',
  'value[][][][]',
  'this.constants.value[]',
  'this.constants.value[][]',
  'this.constants.value[][][]',
  'this.constants.value[][][][]',
];

/**
 * @param {FunctionNode} functionNode
 * @param {Object} ast - the function node's AST, already de-minified
 * @param {IOptimizerSettings} [settings]
 * @returns {Object} the same ast, transformed in place
 */
function optimize(functionNode, ast, settings) {
  if (!ast || !ast.body || ast.body.type !== 'BlockStatement') return ast;
  const context = new OptimizerContext(functionNode, ast, settings || {});
  // H before T3, as separate walks: hoisting has to see loops while they are
  // still loops, and the temps it leaves behind are what the unroller then
  // clones per iteration rather than re-deriving
  processBlock(context, ast.body);
  unrollBlock(context, ast.body);
  return ast;
}

class OptimizerContext {
  constructor(functionNode, ast, settings) {
    this.functionNode = functionNode;
    this.ast = ast;
    this.loopUnrollLimit = typeof settings.loopUnrollLimit === 'number' ? settings.loopUnrollLimit : 8;
    // a name assigned, updated, declared or bound as a nested function's
    // parameter ANYWHERE in this function stops counting as immutable,
    // wherever the write sits relative to the read. The BODY only: this
    // function's own parameters are the arrays the pass exists to read, and
    // binding one is not a write to it
    this.mutatedNames = collectMutatedNames(ast.body);
    this.usedNames = collectUsedNames(ast);
    this.hoistCount = 0;
  }

  /**
   * @returns {String} an identifier no source in this function uses. The
   * emitters prefix it into their own namespace (`user_` on cpu and GL), so
   * only a collision with a user identifier of the same spelling matters.
   */
  freshName() {
    let name;
    do {
      name = `optHoist${ this.hoistCount++ }`;
    } while (this.usedNames.has(name));
    this.usedNames.add(name);
    return name;
  }

  /**
   * @param {String} name
   * @returns {Boolean} whether `name` is an array this function reads but can
   * never write -- a kernel argument or constant that nothing assigns to and
   * no local shadows.
   */
  isImmutableArrayRoot(name) {
    if (this.mutatedNames.has(name)) return false;
    const { argumentNames } = this.functionNode;
    return Boolean(argumentNames) && argumentNames.indexOf(name) > -1;
  }

  /**
   * The element type of a read, resolved without the tracer -- this pass runs
   * before it. Mirrors FunctionNode.getType's one application of the lookup
   * map to the ROOT's type, whatever the subscript depth.
   * @param {Object} ast - a MemberExpression
   * @param {String} signature
   * @returns {String|null} null when the type is not yet known
   */
  readElementType(ast, signature) {
    const rootType = this.readRootType(ast, signature);
    if (!rootType) return null;
    try {
      return this.functionNode.getLookupType(rootType);
    } catch (e) {
      // a type the lookup map does not know is a type this pass has no
      // business guessing at
      return null;
    }
  }

  /**
   * The declared type of the array a read indexes into, or null when it is
   * not yet known -- argument types resolve as the caller emits, so a helper
   * consulted too early simply skips its sites.
   * @param {Object} ast - a MemberExpression
   * @param {String} signature
   * @returns {String|null}
   */
  readRootType(ast, signature) {
    const { functionNode } = this;
    if (signature.indexOf('this.constants.') === 0) {
      if (this.mutatedNames.has(thisWrite)) return null;
      const name = constantReadName(ast, signature);
      if (!name) return null;
      const type = functionNode.constantTypes ? functionNode.constantTypes[name] : null;
      return type === 'Float' ? 'Number' : type || null;
    }
    const root = memberRoot(ast);
    if (!root || root.type !== 'Identifier') return null;
    if (!this.isImmutableArrayRoot(root.name)) return null;
    const index = functionNode.argumentNames.indexOf(root.name);
    return (functionNode.argumentTypes ? functionNode.argumentTypes[index] : null) || null;
  }
}

// --------------------------------------------------------------- traversal

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) walk(node[i], visit);
    return;
  }
  if (typeof node.type !== 'string') return;
  visit(node);
  for (const key in node) {
    if (key === 'loc' || key === 'range' || key === 'parent') continue;
    const child = node[key];
    if (child && typeof child === 'object') walk(child, visit);
  }
}

function collectMutatedNames(ast) {
  const names = new Set();
  const addTarget = target => {
    let node = target;
    while (node && node.type === 'MemberExpression') node = node.object;
    if (node && node.type === 'Identifier') names.add(node.name);
    // a write through `this` (`this.constants.a[0] = x`, which the cpu
    // backend really does perform) names no identifier to blame, so every
    // constant stops counting as immutable
    if (node && node.type === 'ThisExpression') names.add(thisWrite);
  };
  walk(ast, node => {
    switch (node.type) {
      case 'AssignmentExpression':
        addTarget(node.left);
        break;
      case 'UpdateExpression':
        addTarget(node.argument);
        break;
      case 'VariableDeclarator':
        if (node.id && node.id.type === 'Identifier') names.add(node.id.name);
        break;
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        // a nested function's parameters rebind the name for its body; from
        // out here that is indistinguishable from a write
        if (node.id && node.id.name) names.add(node.id.name);
        for (let i = 0; i < node.params.length; i++) {
          if (node.params[i].type === 'Identifier') names.add(node.params[i].name);
        }
        break;
    }
  });
  return names;
}

function collectUsedNames(ast) {
  const names = new Set();
  walk(ast, node => {
    if (node.type === 'Identifier') names.add(node.name);
  });
  return names;
}

function memberRoot(ast) {
  let node = ast;
  while (node && node.type === 'MemberExpression') node = node.object;
  return node;
}

/**
 * @param {Object} ast - a MemberExpression with a `this.constants.` signature
 * @param {String} signature
 * @returns {String|null} the constant's name
 */
function constantReadName(ast, signature) {
  let depth = (signature.match(/\[\]/g) || []).length;
  let node = ast;
  while (depth-- > 0) {
    if (!node || node.type !== 'MemberExpression') return null;
    node = node.object;
  }
  return node && node.property && node.property.name ? node.property.name : null;
}

/**
 * Walks a block, transforming inner scopes before their enclosing loop, so a
 * read invariant to a whole loop nest ends up outside all of it.
 */
function processBlock(context, block) {
  const body = block.body;
  for (let i = 0; i < body.length; i++) {
    const prefix = processStatement(context, body[i]);
    if (prefix && prefix.length > 0) {
      body.splice(i, 0, ...prefix);
      i += prefix.length;
    }
  }
}

/**
 * @returns {Array|null} statements to place immediately before `statement`
 */
function processStatement(context, statement) {
  switch (statement.type) {
    case 'BlockStatement':
      processBlock(context, statement);
      return null;
    case 'IfStatement':
      processBranch(context, statement, 'consequent');
      processBranch(context, statement, 'alternate');
      return null;
    case 'SwitchStatement':
      for (let i = 0; i < statement.cases.length; i++) {
        const block = { type: 'BlockStatement', body: statement.cases[i].consequent };
        processBlock(context, block);
        statement.cases[i].consequent = block.body;
      }
      return null;
    case 'ForStatement':
    case 'WhileStatement':
    case 'DoWhileStatement':
      processBranch(context, statement, 'body');
      return hoistFromLoop(context, statement);
    default:
      return null;
  }
}

/**
 * A single-statement position (an unbraced loop body or if branch) that gains
 * hoisted declarations needs a block around them.
 */
function processBranch(context, statement, key) {
  const branch = statement[key];
  if (!branch) return;
  if (branch.type === 'BlockStatement') {
    processBlock(context, branch);
    return;
  }
  const prefix = processStatement(context, branch);
  if (prefix && prefix.length > 0) {
    statement[key] = stampSynthetic({ type: 'BlockStatement', body: prefix.concat([branch]) }, branch);
  }
}

// -------------------------------------------------- H: invariant read hoist

/**
 * H -- loop-invariant hoisting of pure reads. An array element read whose
 * object and every subscript are loop-invariant moves to a fresh const before
 * the loop. Legal precisely because a kernel cannot write its array
 * arguments, so the value cannot change across iterations.
 *
 * Restricted to reads the body is GUARANTEED to reach: lifting a read the
 * body might skip -- or that a loop running zero times never performs -- would
 * evaluate it where the un-optimized build does not, and on cpu a multi-level
 * read of an out-of-range index throws instead of yielding a number. That is a
 * per-site skip, not a tier-wide one.
 *
 * @returns {Array} declarations to place immediately before the loop
 */
function hoistFromLoop(context, loop) {
  const varying = collectMutatedNames(loop);
  const entries = [];
  collectReachable(loop.body, entries);
  if (entries.length === 0) return [];

  // together with the reachability scan this is the whole safety argument: a
  // read that the first iteration performs, in a loop that has a first
  // iteration, is a read the un-optimized build performs too, so moving it
  // ahead of the loop cannot introduce an evaluation -- or a fault -- that
  // was not already there
  const faultable = context.functionNode.readsCanFault && !loopIsAlwaysEntered(loop);

  const hoisted = [];
  const relocated = new Set();
  const cache = new Map();
  for (let i = 0; i < entries.length; i++) {
    const { statement } = entries[i];
    // a declaration this pass already made for an inner loop moves outward
    // whole rather than being copied through a second temp
    if (statement.optimizerHoist && isInvariant(context, statement.declarations[0].init, varying) &&
      !(faultable && canFault(context, statement.declarations[0].init))) {
      const key = expressionKey(statement.declarations[0].init);
      hoisted.push(statement);
      relocated.add(statement);
      if (key) cache.set(key, statement.declarations[0].id.name);
      continue;
    }
    replaceInvariantReads(context, statement, varying, faultable, cache, hoisted);
  }

  if (relocated.size > 0) {
    for (let i = 0; i < entries.length; i++) {
      const { list } = entries[i];
      if (!list.some(statement => relocated.has(statement))) continue;
      const kept = list.filter(statement => !relocated.has(statement));
      list.length = 0;
      for (let j = 0; j < kept.length; j++) list.push(kept[j]);
    }
  }
  return hoisted;
}

/**
 * The statements a loop body reaches unconditionally on entry, each with the
 * list it lives in so a relocated declaration can be spliced out.
 * @returns {Boolean} whether control falls out of `list`'s end
 */
function collectReachableList(list, entries) {
  for (let i = 0; i < list.length; i++) {
    const statement = list[i];
    switch (statement.type) {
      case 'ExpressionStatement':
      case 'VariableDeclaration':
        entries.push({ list, statement });
        break;
      case 'EmptyStatement':
      case 'DebuggerStatement':
        break;
      case 'BlockStatement':
        if (!collectReachableList(statement.body, entries)) return false;
        break;
      case 'IfStatement':
      case 'SwitchStatement':
      case 'ForStatement':
      case 'WhileStatement':
      case 'DoWhileStatement':
        // a construct that can transfer control out of the body ends the
        // guaranteed region; one that cannot is simply stepped over
        if (containsExit(statement)) return false;
        break;
      default:
        return false;
    }
  }
  return true;
}

function collectReachable(body, entries) {
  if (!body) return false;
  if (body.type === 'BlockStatement') return collectReachableList(body.body, entries);
  return collectReachableList([body], entries);
}

/**
 * @returns {Boolean} whether executing `statement` can transfer control past
 * its own end -- a return anywhere, or a break/continue that binds to an
 * enclosing loop rather than to something inside `statement`.
 */
function containsExit(statement) {
  let found = false;
  const visit = (node, inBreakable, inContinuable) => {
    if (!node || typeof node !== 'object' || found) return;
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) visit(node[i], inBreakable, inContinuable);
      return;
    }
    if (typeof node.type !== 'string') return;
    switch (node.type) {
      case 'ReturnStatement':
      case 'ThrowStatement':
        found = true;
        return;
      case 'BreakStatement':
        if (node.label || !inBreakable) found = true;
        return;
      case 'ContinueStatement':
        if (node.label || !inContinuable) found = true;
        return;
      case 'ForStatement':
      case 'WhileStatement':
      case 'DoWhileStatement':
        visit(node.init, true, true);
        visit(node.test, true, true);
        visit(node.update, true, true);
        visit(node.body, true, true);
        return;
      case 'SwitchStatement':
        visit(node.discriminant, inBreakable, inContinuable);
        visit(node.cases, true, inContinuable);
        return;
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        return;
    }
    for (const key in node) {
      if (key === 'loc' || key === 'range' || key === 'parent') continue;
      const child = node[key];
      if (child && typeof child === 'object') visit(child, inBreakable, inContinuable);
    }
  };
  visit(statement, false, false);
  return found;
}

/**
 * Rewrites every hoistable read inside one unconditionally reached statement.
 * Does not descend into the parts of an expression that evaluate
 * conditionally -- a ternary's branches, a short circuit's right operand --
 * for the same reason a read under an `if` does not hoist.
 */
function replaceInvariantReads(context, statement, varying, faultable, cache, hoisted) {
  const visit = (node, key) => {
    const child = node[key];
    if (!child || typeof child !== 'object') return;
    if (Array.isArray(child)) {
      for (let i = 0; i < child.length; i++) visit(child, i);
      return;
    }
    if (typeof child.type !== 'string') return;
    switch (child.type) {
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        return;
      case 'ConditionalExpression':
        visit(child, 'test');
        return;
      case 'LogicalExpression':
        visit(child, 'left');
        return;
      case 'MemberExpression':
        if (isHoistableRead(context, child, varying) && !(faultable && canFault(context, child))) {
          node[key] = referenceFor(context, child, cache, hoisted);
          return;
        }
        // only the OUTERMOST member of an index chain is ever a candidate:
        // gpu.js types a partial index (`a[y]` of an Array2D) as a Number
        // like the full one, but no backend can hold a row in a float
        if (child.computed) visit(child, 'property');
        if (child.object && child.object.type !== 'MemberExpression') visit(child, 'object');
        return;
    }
    for (const childKey in child) {
      if (childKey === 'loc' || childKey === 'range' || childKey === 'parent') continue;
      const grandChild = child[childKey];
      if (grandChild && typeof grandChild === 'object') visit(child, childKey);
    }
  };
  const holder = { statement };
  visit(holder, 'statement');
}

function referenceFor(context, read, cache, hoisted) {
  const key = expressionKey(read);
  if (key && cache.has(key)) {
    return stampSynthetic({ type: 'Identifier', name: cache.get(key) }, read);
  }
  const name = context.freshName();
  const declaration = stampSynthetic({
    type: 'VariableDeclaration',
    kind: 'const',
    declarations: [stampSynthetic({
      type: 'VariableDeclarator',
      id: stampSynthetic({ type: 'Identifier', name }, read),
      init: read,
    }, read)],
  }, read);
  declaration.optimizerHoist = true;
  hoisted.push(declaration);
  if (key) cache.set(key, name);
  return stampSynthetic({ type: 'Identifier', name }, read);
}

/**
 * @returns {Boolean} whether any read inside `ast` could throw where an
 * un-optimized build would not have evaluated it at all. Only a chain of two
 * or more real subscripts can: `a[y]` past the end of `a` is `undefined`,
 * `a[y][x]` past the end throws. An `Input` argument is one flat buffer
 * however many subscripts index it, so it is always the one-level case.
 */
function canFault(context, ast) {
  let found = false;
  walk(ast, node => {
    if (found || node.type !== 'MemberExpression') return;
    const signature = context.functionNode.getVariableSignature(node);
    if (!signature || indexedReadSignatures.indexOf(signature) === -1) return;
    if ((signature.match(/\[\]/g) || []).length < 2) return;
    if (context.readRootType(node, signature) === 'Input') return;
    found = true;
  });
  return found;
}

/**
 * @returns {Boolean} whether the loop provably runs its body at least once.
 * Only literal bounds count -- the same criterion the unroller needs, so the
 * two share it.
 */
function loopIsAlwaysEntered(loop) {
  if (loop.type === 'DoWhileStatement') return true;
  if (loop.type !== 'ForStatement') return false;
  if (!loop.test) return true;
  const { test } = loop;
  if (test.type !== 'BinaryExpression' || test.left.type !== 'Identifier') return false;
  const limit = literalNumber(test.right);
  if (limit === null) return false;
  const start = initialNumber(loop.init, test.left.name);
  if (start === null) return false;
  switch (test.operator) {
    case '<':
      return start < limit;
    case '<=':
      return start <= limit;
    case '>':
      return start > limit;
    case '>=':
      return start >= limit;
    case '!==':
    case '!=':
      return start !== limit;
    default:
      return false;
  }
}

function literalNumber(ast) {
  if (!ast) return null;
  if (ast.type === 'Literal' && typeof ast.value === 'number') return ast.value;
  if (ast.type === 'UnaryExpression' && ast.operator === '-') {
    const value = literalNumber(ast.argument);
    return value === null ? null : -value;
  }
  return null;
}

function initialNumber(init, name) {
  if (!init) return null;
  if (init.type === 'VariableDeclaration') {
    for (let i = 0; i < init.declarations.length; i++) {
      const declaration = init.declarations[i];
      if (declaration.id.type === 'Identifier' && declaration.id.name === name) {
        return literalNumber(declaration.init);
      }
    }
    return null;
  }
  if (init.type === 'AssignmentExpression' && init.operator === '=' &&
    init.left.type === 'Identifier' && init.left.name === name) {
    return literalNumber(init.right);
  }
  return null;
}

/**
 * @returns {Boolean} whether `ast` is a scalar element read of an array this
 * function cannot write, indexed entirely by loop-invariant expressions.
 */
function isHoistableRead(context, ast, varying) {
  const signature = context.functionNode.getVariableSignature(ast);
  if (!signature || indexedReadSignatures.indexOf(signature) === -1) return false;
  // a vec-valued read (`Array1D(4)` and friends) declares through a different
  // path on every backend; phase 1 leaves those where they are
  const elementType = context.readElementType(ast, signature);
  if (!elementType || scalarTypes.indexOf(elementType) === -1) return false;
  return isInvariant(context, ast, varying);
}

/**
 * @returns {Boolean} whether an expression evaluates to the same value on
 * every iteration AND has no side effects. Anything with a call in it is not
 * invariant here even if it looks pure: a helper may draw Math.random, and
 * moving a draw would rewrite the seeded stream.
 */
function isInvariant(context, ast, varying) {
  if (!ast || typeof ast !== 'object') return false;
  switch (ast.type) {
    case 'Literal':
      return true;
    case 'ThisExpression':
      return true;
    case 'Identifier':
      return !varying.has(ast.name);
    case 'UnaryExpression':
      return ast.operator !== 'delete' &&
        ast.operator !== 'typeof' &&
        isInvariant(context, ast.argument, varying);
    case 'BinaryExpression':
    case 'LogicalExpression':
      return isInvariant(context, ast.left, varying) && isInvariant(context, ast.right, varying);
    case 'ConditionalExpression':
      return isInvariant(context, ast.test, varying) &&
        isInvariant(context, ast.consequent, varying) &&
        isInvariant(context, ast.alternate, varying);
    case 'MemberExpression':
      return isInvariantMember(context, ast, varying);
    default:
      return false;
  }
}

function isInvariantMember(context, ast, varying) {
  const signature = context.functionNode.getVariableSignature(ast);
  if (!signature) return false;
  switch (signature) {
    case 'this.thread.value':
    case 'this.output.value':
      // fixed for the whole invocation
      return true;
    case 'this.constants.value':
      return !context.mutatedNames.has(thisWrite);
    case 'value.value':
      // Math.PI and friends; a user value's `.r`/`.g`/`.b`/`.a` reads a local
      // vec, which this pass does not track
      return context.functionNode.isAstMathVariable(ast);
    case 'value[]':
    case 'value[][]':
    case 'value[][][]':
    case 'value[][][][]': {
      const root = memberRoot(ast);
      if (!root || root.type !== 'Identifier' || !context.isImmutableArrayRoot(root.name)) return false;
      return everySubscriptInvariant(context, ast, varying);
    }
    case 'this.constants.value[]':
    case 'this.constants.value[][]':
    case 'this.constants.value[][][]':
    case 'this.constants.value[][][][]':
      if (context.mutatedNames.has(thisWrite)) return false;
      return everySubscriptInvariant(context, ast, varying);
    default:
      return false;
  }
}

function everySubscriptInvariant(context, ast, varying) {
  let node = ast;
  while (node && node.type === 'MemberExpression') {
    if (node.computed && !isInvariant(context, node.property, varying)) return false;
    node = node.object;
  }
  return true;
}

/**
 * A structural key so two spellings of the same read share one hoisted const.
 * Only reads collected from the same guaranteed region are ever compared, so
 * this is common subexpression elimination over pure reads, not across float
 * arithmetic. Returns null for anything it cannot canonicalize.
 */
function expressionKey(ast) {
  if (!ast || typeof ast !== 'object') return null;
  switch (ast.type) {
    case 'Literal':
      return `L${ typeof ast.value }:${ ast.value }`;
    case 'ThisExpression':
      return 'this';
    case 'Identifier':
      return `#${ ast.name }`;
    case 'MemberExpression': {
      const object = expressionKey(ast.object);
      const property = expressionKey(ast.property);
      if (object === null || property === null) return null;
      return `M${ ast.computed ? '[' : '.' }(${ object },${ property })`;
    }
    case 'UnaryExpression': {
      const argument = expressionKey(ast.argument);
      return argument === null ? null : `U${ ast.operator }(${ argument })`;
    }
    case 'BinaryExpression':
    case 'LogicalExpression': {
      const left = expressionKey(ast.left);
      const right = expressionKey(ast.right);
      if (left === null || right === null) return null;
      return `B${ ast.operator }(${ left },${ right })`;
    }
    default:
      return null;
  }
}

// ------------------------------------------------------- T3: literal unroll

/**
 * T3 -- tiny literal-loop unrolling. A `for` whose init, test and update are
 * all integer literals runs a trip count this pass can compute exactly, so the
 * loop becomes that many copies of its body with the induction variable
 * substituted as a literal. The loop is gone, and with it the per-iteration
 * compare, the increment, and -- on every backend that wraps an unprovable
 * loop in the LOOP_MAX counter -- the cap machinery too.
 *
 * Bounds must be INTEGER literals, not merely literal. A fractional counter
 * accumulates differently in f32 (GL, wasm) than in the f64 this pass would
 * simulate it in, so `for (let t = 0; t < 1; t += 0.1)` could unroll to a
 * different trip count than the backend would have run. Integers are exact in
 * every format involved, which makes the simulated sequence the emitted one.
 *
 * Bodies are cloned into a BlockStatement each, so a body that declares a
 * local declares it once per iteration in its own scope, exactly as the loop
 * did.
 */
function unrollBlock(context, block) {
  block.body = unrollList(context, block.body);
}

function unrollList(context, list) {
  const result = [];
  for (let i = 0; i < list.length; i++) {
    const replacement = unrollStatement(context, list[i]);
    if (replacement === null) {
      result.push(list[i]);
      continue;
    }
    for (let j = 0; j < replacement.length; j++) result.push(replacement[j]);
  }
  return result;
}

/**
 * Descends before unrolling, so an inner loop is unrolled ONCE and the outer
 * loop then clones the already-unrolled result -- rather than cloning the
 * inner loop and unrolling every copy.
 * @returns {Array|null} the statements replacing `statement`, or null to keep it
 */
function unrollStatement(context, statement) {
  switch (statement.type) {
    case 'BlockStatement':
      unrollBlock(context, statement);
      return null;
    case 'IfStatement':
      statement.consequent = unrollBranch(context, statement.consequent);
      if (statement.alternate) statement.alternate = unrollBranch(context, statement.alternate);
      return null;
    case 'SwitchStatement':
      for (let i = 0; i < statement.cases.length; i++) {
        statement.cases[i].consequent = unrollList(context, statement.cases[i].consequent);
      }
      return null;
    case 'WhileStatement':
    case 'DoWhileStatement':
      statement.body = unrollBranch(context, statement.body);
      return null;
    case 'ForStatement':
      statement.body = unrollBranch(context, statement.body);
      return unrollLoop(context, statement);
    default:
      return null;
  }
}

function unrollBranch(context, branch) {
  if (!branch) return branch;
  if (branch.type === 'BlockStatement') {
    unrollBlock(context, branch);
    return branch;
  }
  const replacement = unrollStatement(context, branch);
  if (replacement === null) return branch;
  return stampSynthetic({ type: 'BlockStatement', body: replacement }, branch);
}

/**
 * @returns {Array|null} one block per iteration, or null when this loop is not
 * provably a tiny literal loop
 */
function unrollLoop(context, loop) {
  if (!(context.loopUnrollLimit > 0)) return null;
  if (loop.type !== 'ForStatement') return null;
  const induction = inductionVariable(context, loop);
  if (!induction) return null;
  const values = tripValues(loop, induction, context.loopUnrollLimit);
  if (!values) return null;
  const body = loop.body ?
    (loop.body.type === 'BlockStatement' ? loop.body.body : [loop.body]) : [];
  if (!bodyIsUnrollable(body, induction.name)) return null;

  const result = [];
  for (let i = 0; i < values.length; i++) {
    result.push(stampSynthetic({
      type: 'BlockStatement',
      body: cloneNodes(context, body, induction.name, values[i]),
    }, loop));
  }
  return result;
}

/**
 * The counter a `for` header advances, when the header declares it itself.
 * An init that ASSIGNS an existing variable is skipped: the loop leaves its
 * final value behind for whatever follows, and unrolling would delete the
 * variable's last write.
 * @returns {{name: String, start: Number}|null}
 */
function inductionVariable(context, loop) {
  const { init } = loop;
  if (!init || init.type !== 'VariableDeclaration') return null;
  if (init.declarations.length !== 1) return null;
  const declaration = init.declarations[0];
  if (!declaration.id || declaration.id.type !== 'Identifier') return null;
  const start = integerLiteral(declaration.init);
  if (start === null) return null;
  // `let`/`const` are scoped to the loop, so deleting the loop deletes the
  // binding with it. `var` is function-scoped and outlives the loop, so it
  // only unrolls when nothing outside the loop names it.
  if (init.kind === 'var' && nameUsedOutside(context, loop, declaration.id.name)) return null;
  return { name: declaration.id.name, start };
}

const comparators = {
  '<': (value, bound) => value < bound,
  '<=': (value, bound) => value <= bound,
  '>': (value, bound) => value > bound,
  '>=': (value, bound) => value >= bound,
  '!==': (value, bound) => value !== bound,
  '!=': (value, bound) => value !== bound,
};

/**
 * @returns {Array<Number>|null} the induction variable's value on each
 * iteration, or null when the loop does not terminate within the limit
 */
function tripValues(loop, induction, limit) {
  const { test, update } = loop;
  if (!test || test.type !== 'BinaryExpression') return null;
  if (!test.left || test.left.type !== 'Identifier' || test.left.name !== induction.name) return null;
  const bound = integerLiteral(test.right);
  if (bound === null) return null;
  const compare = comparators[test.operator];
  if (!compare) return null;
  const step = inductionStep(update, induction.name);
  if (step === null) return null;

  const values = [];
  let value = induction.start;
  while (compare(value, bound)) {
    if (values.length >= limit) return null;
    values.push(value);
    value += step;
  }
  return values;
}

/**
 * @returns {Number|null} how much one iteration adds to the counter. Null for
 * anything else -- including a zero step, which never terminates.
 */
function inductionStep(update, name) {
  if (!update) return null;
  if (update.type === 'UpdateExpression') {
    if (!update.argument || update.argument.type !== 'Identifier' || update.argument.name !== name) return null;
    return update.operator === '++' ? 1 : (update.operator === '--' ? -1 : null);
  }
  if (update.type !== 'AssignmentExpression') return null;
  if (!update.left || update.left.type !== 'Identifier' || update.left.name !== name) return null;
  switch (update.operator) {
    case '+=': {
      const step = integerLiteral(update.right);
      return step === 0 ? null : step;
    }
    case '-=': {
      const step = integerLiteral(update.right);
      return step === null || step === 0 ? null : -step;
    }
    case '=': {
      const { right } = update;
      if (!right || right.type !== 'BinaryExpression') return null;
      const leftIsCounter = right.left.type === 'Identifier' && right.left.name === name;
      const rightIsCounter = right.right.type === 'Identifier' && right.right.name === name;
      if (right.operator === '+') {
        const step = leftIsCounter ? integerLiteral(right.right) :
          (rightIsCounter ? integerLiteral(right.left) : null);
        return step === 0 ? null : step;
      }
      if (right.operator === '-' && leftIsCounter) {
        const step = integerLiteral(right.right);
        return step === null || step === 0 ? null : -step;
      }
      return null;
    }
    default:
      return null;
  }
}

function integerLiteral(ast) {
  const value = literalNumber(ast);
  return value === null || !Number.isInteger(value) ? null : value;
}

/**
 * @returns {Boolean} whether `name` appears anywhere in the function outside
 * `loop` -- the question a function-scoped `var` counter raises.
 */
function nameUsedOutside(context, loop, name) {
  let found = false;
  const visit = node => {
    if (found || !node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) visit(node[i]);
      return;
    }
    if (typeof node.type !== 'string' || node === loop) return;
    if (node.type === 'Identifier' && node.name === name) {
      found = true;
      return;
    }
    for (const key in node) {
      if (key === 'loc' || key === 'range' || key === 'parent') continue;
      const child = node[key];
      if (child && typeof child === 'object') visit(child);
    }
  };
  visit(context.ast);
  return found;
}

/**
 * @returns {Boolean} whether the body can be replayed with the counter frozen
 * to a literal. Every rejection here is a shape where a copy would not mean
 * what the iteration meant.
 */
function bodyIsUnrollable(body, name) {
  let ok = true;
  const reject = () => {
    ok = false;
  };
  const visit = (node, inBreakable, inContinuable) => {
    if (!ok || !node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) visit(node[i], inBreakable, inContinuable);
      return;
    }
    if (typeof node.type !== 'string') return;
    switch (node.type) {
      case 'AssignmentExpression':
        // a body that moves the counter decides its own trip count
        if (node.left.type === 'Identifier' && node.left.name === name) return reject();
        break;
      case 'UpdateExpression':
        if (node.argument.type === 'Identifier' && node.argument.name === name) return reject();
        break;
      case 'VariableDeclarator':
        // an inner declaration SHADOWS the counter; substituting through it
        // would rewrite reads of a different variable
        if (node.id.type === 'Identifier' && node.id.name === name) return reject();
        break;
      case 'BreakStatement':
        // a break out of THIS loop stops iterations the unrolled form would
        // still run; one bound to an inner loop or switch is untouched
        if (node.label || !inBreakable) return reject();
        return;
      case 'ContinueStatement':
        if (node.label || !inContinuable) return reject();
        return;
      case 'LabeledStatement':
        return reject();
      case 'CallExpression':
        // `Math.random()` is the one call whose VALUE depends on how many
        // times it has already run: every backend lowers it to a generator
        // carrying state between draws. The unrolled form draws exactly as
        // often and in exactly the same order, so the sequence is preserved
        // by construction -- but the GL lowering is
        // `fract(sin(dot(...)) * 43758.5453)`, where a shader compiler
        // reassociating one operand by a single ULP is a completely different
        // number, and straight-line calls give it room a loop does not.
        // Measured 4.5e-4 apart on ANGLE/Metal, so this shape skips.
        if (isMathRandom(node)) return reject();
        break;
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        // nested functions are registered by AST identity, so cloning one
        // would register the same helper under the same name several times
        return reject();
      case 'ForStatement':
      case 'WhileStatement':
      case 'DoWhileStatement':
        visit(node.init, true, true);
        visit(node.test, true, true);
        visit(node.update, true, true);
        visit(node.body, true, true);
        return;
      case 'SwitchStatement':
        visit(node.discriminant, inBreakable, inContinuable);
        visit(node.cases, true, inContinuable);
        return;
      case 'MemberExpression':
        visit(node.object, inBreakable, inContinuable);
        if (node.computed) visit(node.property, inBreakable, inContinuable);
        return;
    }
    for (const key in node) {
      if (key === 'loc' || key === 'range' || key === 'parent') continue;
      const child = node[key];
      if (child && typeof child === 'object') visit(child, inBreakable, inContinuable);
    }
  };
  visit(body, false, false);
  return ok;
}

/**
 * The node acorn would have parsed for this number, which for a negative one
 * is a unary minus over a positive literal rather than a literal holding a
 * negative value. The emitters print a literal's value verbatim, so the
 * negative form turns `2 - i` into `2--2` -- a decrement, and a syntax error
 * in both JavaScript and GLSL. Substituting what the source form parses to
 * keeps the unrolled body indistinguishable from a hand-written one.
 */
function numberNode(value, source) {
  const literal = stampSynthetic({
    type: 'Literal',
    value: Math.abs(value),
    raw: `${ Math.abs(value) }`,
  }, source);
  if (value >= 0) return literal;
  return stampSynthetic({
    type: 'UnaryExpression',
    operator: '-',
    prefix: true,
    argument: literal,
  }, source);
}

function isMathRandom(ast) {
  const { callee } = ast;
  return Boolean(callee) && callee.type === 'MemberExpression' && !callee.computed &&
    callee.object.type === 'Identifier' && callee.object.name === 'Math' &&
    callee.property.name === 'random';
}

function cloneNodes(context, nodes, name, value) {
  const result = new Array(nodes.length);
  for (let i = 0; i < nodes.length; i++) result[i] = cloneNode(context, nodes[i], name, value);
  return result;
}

/**
 * A deep copy with the induction variable replaced by its value for this
 * iteration. Every copied node is stamped a fresh position: astKey and the
 * literal-type cache are keyed by start/end, so two iterations sharing a
 * position would share a type decision made for one of them.
 * @param {String|null} name - the identifier to substitute, or null for a
 * verbatim copy (a non-computed member's property, which is a field name)
 */
function cloneNode(context, node, name, value) {
  if (!node || typeof node !== 'object') return node;
  if (Array.isArray(node)) return cloneNodes(context, node, name, value);
  if (typeof node.type !== 'string') return node;
  if (name !== null && node.type === 'Identifier' && node.name === name) {
    return numberNode(value, node);
  }
  const copy = {};
  const verbatimProperty = node.type === 'MemberExpression' && !node.computed;
  for (const key in node) {
    if (key === 'start' || key === 'end') continue;
    if (key === 'loc' || key === 'range' || key === 'parent') {
      copy[key] = node[key];
      continue;
    }
    copy[key] = cloneNode(context, node[key], verbatimProperty && key === 'property' ? null : name, value);
  }
  return stampSynthetic(copy, node);
}

// -------------------------------------------------- T1: thread localization

/**
 * T1 -- coordinate localization, cpu only. Every other backend already holds
 * the thread id in something local: wasm in mutable globals, GLSL and WGSL in
 * locals seeded from a builtin. On cpu it is a property of a shared mutable
 * object, re-read on every access -- but the generated cell loop that assigns
 * it has the same value in its own counters, so the root kernel body can name
 * those instead.
 *
 * Only the ROOT body is lexically inside that loop. Helpers and sub-kernels
 * are emitted as sibling function declarations, where the counters are not in
 * scope and `_this.thread` is the only way to ask.
 *
 * `this.constants.*` and `this.output.*` need no equivalent: the cpu backend
 * already binds them to `constants_<name>` and `outputX`/`outputY`/`outputZ`,
 * hoisted above the cell loop, and both are in scope in helpers too.
 * @param {FunctionNode} functionNode
 * @param {String} name - 'x', 'y' or 'z'
 * @returns {String|null} the expression to emit, or null to keep the property read
 */
function threadLocalName(functionNode, name) {
  if (functionNode.optimizerDisabled || !functionNode.isRootKernel) return null;
  const { output } = functionNode;
  if (!output || !output.length) return null;
  switch (name) {
    case 'x':
      return 'x';
    case 'y':
      // a rank the output does not have has no counter; the loop preamble
      // pins the coordinate to 0, which is what the literal says
      return output.length > 1 ? 'y' : '0';
    case 'z':
      return output.length > 2 ? 'z' : '0';
    default:
      return null;
  }
}

module.exports = {
  optimize,
  threadLocalName
};