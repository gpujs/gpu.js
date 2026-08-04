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
  // H then T2 then T3, as separate walks. Hoisting has to see loops while they
  // are still loops and calls while they are still calls; inlining then
  // exposes helper bodies to the unroller, which runs last so that a tiny
  // loop an inlined body brought with it unrolls like any other.
  processBlock(context, ast.body);
  inlineBlock(context, ast.body);
  unrollBlock(context, ast.body);
  return ast;
}

class OptimizerContext {
  constructor(functionNode, ast, settings) {
    this.functionNode = functionNode;
    this.ast = ast;
    this.loopUnrollLimit = typeof settings.loopUnrollLimit === 'number' ? settings.loopUnrollLimit : 8;
    this.lookupInlineTarget = settings.lookupInlineTarget || null;
    this.inlineTargets = new Map();
    this.inlineCount = 0;
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
   * @param {String} suffix - the helper's own spelling, kept so an emitted
   * shader still reads like the source it came from
   * @returns {String} a name for an inlined binding. The emitters own the
   * `user_` prefix -- nothing at AST level can land outside it -- so
   * collision-freedom comes from the same used-name check `freshName` uses,
   * not from a reserved namespace.
   */
  freshInlineName(suffix) {
    let name;
    do {
      name = `optIn${ this.inlineCount++ }_${ suffix }`;
    } while (this.usedNames.has(name));
    this.usedNames.add(name);
    return name;
  }

  /**
   * @param {String} name
   * @returns {Object|null} the call graph's verdict for a callee, cached per
   * function so one build asks the builder once per name
   */
  inlineTarget(name) {
    if (!this.lookupInlineTarget) return null;
    if (this.inlineTargets.has(name)) return this.inlineTargets.get(name);
    let entry = null;
    try {
      entry = this.lookupInlineTarget(name) || null;
    } catch (e) {
      entry = null;
    }
    this.inlineTargets.set(name, entry);
    return entry;
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

/**
 * `walk` that stops at a function boundary. A nested function is its own
 * emitted function and its own plan entry, so the enclosing one must not
 * count what happens inside it as its own.
 */
function walkOwn(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) walkOwn(node[i], visit);
    return;
  }
  if (typeof node.type !== 'string') return;
  if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression') return;
  visit(node);
  for (const key in node) {
    if (key === 'loc' || key === 'range' || key === 'parent') continue;
    const child = node[key];
    if (child && typeof child === 'object') walkOwn(child, visit);
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
    if (!context.functionNode.readsFaultAtOneLevel && (signature.match(/\[\]/g) || []).length < 2) return;
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

// ----------------------------------------------------------- T2: inlining

/**
 * T2 -- helper inlining. A call to a user helper is replaced by the helper's
 * body: its parameters bound as fresh declarations in source order, its locals
 * renamed, and the expression it returned left where the call was.
 *
 * The win is largest on webasm and it is not call overhead. The SIMD emitter
 * has no vector form for a helper call, so it lane-scalarizes one: thread
 * state and PCG state swap per lane, the arguments are extracted lane by lane
 * and the scalar function runs four times per quad. A helper in a hot loop
 * therefore un-vectorizes the loop that contains it. Inlining restores the
 * vector form, which is why this transform is worth its correctness surface.
 *
 * THE DECISION IS GLOBAL, not per site. A helper left with some call sites
 * inlined and others not still gets emitted, and gpu.js fixes a helper's
 * parameter types from whichever call site the emitter reaches FIRST --
 * removing a site can change which one that is, and with it what the surviving
 * sites coerce their arguments to. `buildInlinePlan` therefore decides
 * inlinability for the whole call graph before any function node is optimized,
 * all-or-nothing per helper; a site this pass cannot hoist disqualifies its
 * helper everywhere rather than leaving a mixed build.
 */

// a single helper's expanded body, and the total a single function may gain.
// The first keeps one bad helper from dominating a shader; the second keeps a
// deep call graph from producing a megafunction (V8 stops inlining and
// eventually deoptimizes; mobile shader compilers get slower superlinearly)
const INLINE_MAX_HELPER_NODES = 320;
const INLINE_MAX_ADDED_NODES = 6000;

// unrolling nests multiplicatively -- depth d costs limit^d copies -- so the
// per-loop trip count is not a bound on the emitted size. The cumulative cap
// is T2's, for the same reason: past it, cpu deoptimizes and GL shader
// compilation grows superlinearly (#8 of the build review).
const UNROLL_MAX_ADDED_NODES = 6000;

// an expansion is bounded by the plan's budgets, so a walk that keeps finding
// work past this has a bug in it rather than a big kernel; the #868 contract
// turns the throw into an un-optimized build
const INLINE_MAX_STATEMENTS = 20000;

function inlineBlock(context, block) {
  if (!context.lookupInlineTarget) return;
  block.body = inlineList(context, block.body);
}

/**
 * Rewrites one statement list. An expansion is pushed back onto the pending
 * queue rather than straight to the output, so a helper that calls a helper
 * expands one level per pass until nothing inlinable is left -- the leaf-first
 * order the plan already computed its budgets in.
 */
function inlineList(context, list) {
  const out = [];
  const pending = list.slice();
  let guard = 0;
  while (pending.length > 0) {
    if (++guard > INLINE_MAX_STATEMENTS) {
      throw new Error('optimizer: inlining did not converge');
    }
    const statement = pending.shift();
    const prefix = [];
    const expansion = inlineStatementOwn(context, statement, prefix);
    if (expansion.expanded > 0) {
      // re-queued rather than emitted: an expansion whose arguments were all
      // atoms adds no statements at all, and its own calls still have to be
      // seen
      const replacement = expansion.consumed ?
        stampSynthetic({ type: 'EmptyStatement' }, statement) : statement;
      pending.unshift(...prefix, replacement);
      continue;
    }
    inlineStatementChildren(context, statement);
    out.push(statement);
  }
  return out;
}

function inlineStatementChildren(context, statement) {
  switch (statement.type) {
    case 'BlockStatement':
      inlineBlock(context, statement);
      return;
    case 'IfStatement':
      statement.consequent = inlineBranch(context, statement.consequent);
      if (statement.alternate) statement.alternate = inlineBranch(context, statement.alternate);
      return;
    case 'ForStatement':
    case 'WhileStatement':
    case 'DoWhileStatement':
      statement.body = inlineBranch(context, statement.body);
      return;
    case 'SwitchStatement':
      for (let i = 0; i < statement.cases.length; i++) {
        statement.cases[i].consequent = inlineList(context, statement.cases[i].consequent);
      }
      return;
  }
}

/**
 * A single-statement position that gains the statements of an expansion needs
 * a block around them.
 */
function inlineBranch(context, branch) {
  if (!branch) return branch;
  if (branch.type === 'BlockStatement') {
    inlineBlock(context, branch);
    return branch;
  }
  const replacement = inlineList(context, [branch]);
  if (replacement.length === 1 && replacement[0] === branch) return branch;
  return stampSynthetic({ type: 'BlockStatement', body: replacement }, branch);
}

/**
 * Expands every hoistable call in one statement's own expressions.
 * @returns {{expanded: Number, consumed: Boolean}} how many calls were
 * expanded, and whether the statement itself is now redundant -- a call that
 * WAS the statement leaves its value in a declaration instead
 */
function inlineStatementOwn(context, statement, prefix) {
  const sites = collectStatementSites(context, statement);
  let consumed = false;
  for (let i = 0; i < sites.length; i++) {
    if (expandCall(context, sites[i], prefix)) consumed = true;
  }
  return { expanded: sites.length, consumed };
}

/**
 * The call sites in one statement this pass may hoist, in evaluation order.
 * Shared with the plan, which is what makes the plan's verdict and this walk
 * agree about which sites exist.
 */
function collectStatementSites(context, statement) {
  const scan = { candidates: name => context.inlineTarget(name), sites: [], clean: true };
  const roots = statementValueRoots(statement);
  for (let i = 0; i < roots.length; i++) {
    scanValue(roots[i].parent, roots[i].key, scan, Boolean(roots[i].statementPosition));
  }
  return scan.sites;
}

/**
 * The expression positions of a statement that run exactly once, in order.
 * A loop's test and update run per iteration and a do-while's test runs after
 * the body, so neither can be prefixed by anything; calls there keep their
 * call.
 */
function statementValueRoots(statement) {
  switch (statement.type) {
    case 'ExpressionStatement':
      return [{ parent: statement, key: 'expression', statementPosition: true }];
    case 'ReturnStatement':
      return statement.argument ? [{ parent: statement, key: 'argument' }] : [];
    case 'IfStatement':
      return [{ parent: statement, key: 'test' }];
    case 'SwitchStatement':
      return [{ parent: statement, key: 'discriminant' }];
    case 'VariableDeclaration':
      return declarationRoots(statement);
    case 'ForStatement':
      if (!statement.init) return [];
      if (statement.init.type === 'VariableDeclaration') return declarationRoots(statement.init);
      return [{ parent: statement, key: 'init' }];
    default:
      return [];
  }
}

function declarationRoots(declaration) {
  const roots = [];
  for (let i = 0; i < declaration.declarations.length; i++) {
    if (declaration.declarations[i].init) {
      roots.push({ parent: declaration.declarations[i], key: 'init' });
    }
  }
  return roots;
}

/**
 * Walks an expression in EVALUATION order looking for calls to hoist. A call
 * may only move to a statement before this one when everything the statement
 * evaluates first has no effect of its own: hoisting past an assignment, an
 * update or another call would reorder them, and a helper that draws
 * Math.random reorders the seeded stream by moving at all.
 *
 * Conditionally evaluated operands -- a ternary's branches, a short circuit's
 * right side -- are never descended into: a call there does not run every
 * time, and there is nowhere unconditional to hoist it to.
 */
function scanValue(parent, key, scan, statementPosition, objectPosition) {
  const node = parent[key];
  if (!node || typeof node !== 'object' || typeof node.type !== 'string') return;
  switch (node.type) {
    case 'Literal':
    case 'Identifier':
    case 'ThisExpression':
      return;
    case 'MemberExpression':
      // `fn()[...]` is a signature of its own on every backend -- an emitted
      // helper does the indexing, because GLSL ES 1.00 will not subscript a
      // matrix with a non-constant expression. Replacing the call with a
      // binding takes a different path through the emitter, so the site is
      // left alone.
      scanValue(node, 'object', scan, false, node.object && node.object.type === 'CallExpression');
      if (node.computed) scanValue(node, 'property', scan, false);
      return;
    case 'UnaryExpression':
      scanValue(node, 'argument', scan, false);
      return;
    case 'BinaryExpression':
      scanValue(node, 'left', scan, false);
      scanValue(node, 'right', scan, false);
      return;
    case 'LogicalExpression':
      scanValue(node, 'left', scan, false);
      scanConditional(node.right, scan);
      return;
    case 'ConditionalExpression':
      scanValue(node, 'test', scan, false);
      scanConditional(node.consequent, scan);
      scanConditional(node.alternate, scan);
      return;
    case 'ArrayExpression':
      for (let i = 0; i < node.elements.length; i++) scanValue(node.elements, i, scan, false);
      return;
    case 'SequenceExpression':
      for (let i = 0; i < node.expressions.length; i++) scanValue(node.expressions, i, scan, false);
      return;
    case 'AssignmentExpression':
      // the target's own subscripts evaluate before the value; the write
      // itself happens after
      if (node.left.type === 'MemberExpression') scanValue(node, 'left', scan, false);
      scanValue(node, 'right', scan, false);
      scan.clean = false;
      return;
    case 'UpdateExpression':
      scan.clean = false;
      return;
    case 'CallExpression': {
      for (let i = 0; i < node.arguments.length; i++) scanValue(node.arguments, i, scan, false);
      const name = inlineCalleeName(node);
      const entry = name ? scan.candidates(name) : null;
      if (entry && !objectPosition) {
        // a helper that returns nothing has no value to leave behind, so it
        // only inlines where the call WAS the statement
        if (scan.clean && (entry.returnsValue || statementPosition)) {
          scan.sites.push({ parent, key, node, entry, statementPosition });
          // expanding a site lifts its body into the shared prefix ahead of
          // the statement, so a SECOND site in the same statement runs its
          // body before this site's returned expression is used. Harmless for
          // a pure helper (bindings and an expression, reordered invisibly),
          // but for one that DRAWS RANDOM it permutes the seeded stream --
          // and for one that assigns outward it reorders the writes (#6).
          if (entry.hasEffects) scan.clean = false;
          return;
        }
        scan.clean = false;
        return;
      }
      if (!isPureMathCall(node)) scan.clean = false;
      return;
    }
    default:
      // an unrecognized expression is opaque: nothing after it hoists
      scan.clean = false;
  }
}

/**
 * A conditionally evaluated operand. Nothing inside it can hoist, and if it
 * can do anything at all then nothing after it can hoist either.
 */
function scanConditional(node, scan) {
  walk(node, child => {
    if (child.type === 'CallExpression') {
      if (!isPureMathCall(child)) scan.clean = false;
      return;
    }
    if (child.type === 'AssignmentExpression' || child.type === 'UpdateExpression') scan.clean = false;
  });
}

/**
 * @returns {String|null} the helper name a call names directly. `Math.x()`,
 * `this.x()` and a sub-kernel reached through a member expression all have a
 * callee this pass does not inline.
 */
function inlineCalleeName(ast) {
  return ast.callee && ast.callee.type === 'Identifier' ? ast.callee.name : null;
}

/**
 * @returns {Boolean} whether a call is one of the Math functions that compute
 * from their arguments alone. `Math.random` is the exception that matters: it
 * carries generator state, so its position in the statement is observable.
 */
function isPureMathCall(ast) {
  const { callee } = ast;
  return Boolean(callee) && callee.type === 'MemberExpression' && !callee.computed &&
    callee.object && callee.object.type === 'Identifier' && callee.object.name === 'Math' &&
    callee.property && callee.property.name !== 'random';
}

/**
 * Replaces one call with the helper's body.
 * @returns {Boolean} whether the statement holding the call is now redundant
 */
function expandCall(context, site, prefix) {
  const { node, entry, parent, key } = site;
  const bindings = new Map();
  // parameters bind in SOURCE ORDER, one binding per argument, each evaluated
  // exactly once -- the order and the count a call would have had
  for (let i = 0; i < entry.params.length; i++) {
    const param = entry.params[i];
    const argument = node.arguments[i];
    if (!entry.assignedParams.has(param) && isInlineAtom(context, argument)) {
      // an atom has no effect and cannot change while the body runs, so the
      // body may read it in place as many times as it names the parameter
      bindings.set(param, { atom: argument, name: null });
      continue;
    }
    const name = context.freshInlineName(param);
    prefix.push(inlineDeclaration(entry.assignedParams.has(param) ? 'let' : 'const', name, argument));
    bindings.set(param, { atom: null, name });
  }
  // an argument the helper has no parameter for is still evaluated by a call
  for (let i = entry.params.length; i < node.arguments.length; i++) {
    prefix.push(inlineDeclaration('const', context.freshInlineName('arg'), node.arguments[i]));
  }

  const renames = new Map();
  entry.localNames.forEach(local => {
    renames.set(local, context.freshInlineName(local));
  });

  const body = cloneInlineNodes(context, entry.body, bindings, renames);
  const reduced = reduceReturns(body);
  if (!reduced) throw new Error(`optimizer: helper body no longer reduces`);
  for (let i = 0; i < reduced.statements.length; i++) prefix.push(reduced.statements[i]);

  if (site.statementPosition) {
    // the value is discarded, but a call evaluated it -- keeping the
    // declaration keeps every read and draw inside it happening
    if (reduced.value !== null) {
      prefix.push(inlineDeclaration('const', context.freshInlineName('ret'), reduced.value));
    }
    return true;
  }
  parent[key] = reduced.value;
  return false;
}

function inlineDeclaration(kind, name, init) {
  return stampSynthetic({
    type: 'VariableDeclaration',
    kind,
    declarations: [stampSynthetic({
      type: 'VariableDeclarator',
      id: stampSynthetic({ type: 'Identifier', name }, init),
      init,
    }, init)],
  }, init);
}

/**
 * @returns {Boolean} whether an argument can simply be written wherever the
 * body names its parameter: no effect to run twice, no value that can change
 * while the body runs, and nothing that can fault.
 */
function isInlineAtom(context, ast) {
  if (!ast || typeof ast !== 'object') return false;
  switch (ast.type) {
    case 'Literal':
      return true;
    case 'Identifier':
      // a helper cannot see the caller's locals, so nothing the body does can
      // change what this identifier reads
      return true;
    case 'UnaryExpression':
      return (ast.operator === '-' || ast.operator === '+') && ast.argument.type === 'Literal';
    case 'MemberExpression':
      try {
        switch (context.functionNode.getVariableSignature(ast)) {
          case 'this.thread.value':
          case 'this.output.value':
            return true;
          case 'this.constants.value':
            return !context.mutatedNames.has(thisWrite);
          case 'value.value':
            return context.functionNode.isAstMathVariable(ast);
          default:
            return false;
        }
      } catch (e) {
        return false;
      }
    default:
      return false;
  }
}

/**
 * A deep copy of a helper body with its parameters bound and its locals
 * renamed. Every node is stamped a fresh position: astKey and the literal-type
 * cache are keyed by start/end, so two expansions of one helper sharing a
 * position would share a type decision made for one of them.
 */
function cloneInlineNodes(context, nodes, bindings, renames) {
  const result = new Array(nodes.length);
  for (let i = 0; i < nodes.length; i++) result[i] = cloneInlineNode(context, nodes[i], bindings, renames);
  return result;
}

function cloneInlineNode(context, node, bindings, renames) {
  if (!node || typeof node !== 'object') return node;
  if (Array.isArray(node)) return cloneInlineNodes(context, node, bindings, renames);
  if (typeof node.type !== 'string') return node;
  if (node.type === 'Identifier') {
    const bound = bindings.get(node.name);
    if (bound) {
      return bound.atom ?
        cloneNode(context, bound.atom, null, 0) :
        stampSynthetic({ type: 'Identifier', name: bound.name }, node);
    }
    const renamed = renames.get(node.name);
    return stampSynthetic({ type: 'Identifier', name: renamed || node.name }, node);
  }
  const copy = {};
  // a non-computed member's property is a field name, not a variable
  const verbatimProperty = node.type === 'MemberExpression' && !node.computed;
  for (const key in node) {
    if (key === 'start' || key === 'end') continue;
    if (key === 'loc' || key === 'range' || key === 'parent') {
      copy[key] = node[key];
      continue;
    }
    copy[key] = verbatimProperty && key === 'property' ?
      cloneNode(context, node[key], null, 0) :
      cloneInlineNode(context, node[key], bindings, renames);
  }
  return stampSynthetic(copy, node);
}

/**
 * Reduces a helper body to statements plus the one expression it returns.
 *
 * A body whose only return is its last statement needs nothing: the statements
 * run, and the return's expression is what the call site gets. An EARLY return
 * is folded instead of flagged -- `if (c) return A; return B;` becomes the
 * conditional `c ? A : B`, which evaluates exactly the branch the function
 * would have. The labeled-block idiom the cpu backend uses for the kernel body
 * is deliberately not used here: GLSL has no labeled break, so it does not
 * port to three of the four emitting tiers, and a result temp would have to
 * declare a type this pass has no way to ask for (the optimizer runs before
 * the tracer, so nothing is typed yet).
 *
 * @returns {{statements: Array, value: Object|null}|null} null when the body
 * returns from somewhere this cannot fold
 */
function reduceReturns(statements) {
  let first = -1;
  for (let i = 0; i < statements.length; i++) {
    if (containsReturn(statements[i])) {
      first = i;
      break;
    }
  }
  if (first === -1) return { statements, value: null };
  const value = tailExpression(statements, first);
  if (value === null) return null;
  return { statements: statements.slice(0, first), value };
}

function tailExpression(list, i) {
  if (i >= list.length) return null;
  const statement = list[i];
  if (statement.type === 'ReturnStatement') {
    // anything after a return is unreachable; rather than reason about what
    // may be dropped, this shape is left alone
    if (i !== list.length - 1 || !statement.argument) return null;
    return statement.argument;
  }
  if (statement.type !== 'IfStatement') return null;
  const consequent = branchExpression(statement.consequent);
  if (consequent === null) return null;
  let alternate;
  if (statement.alternate) {
    if (i !== list.length - 1) return null;
    alternate = branchExpression(statement.alternate);
  } else {
    alternate = tailExpression(list, i + 1);
  }
  if (alternate === null) return null;
  // the folded branches become operands of a conditional, and the webasm SIMD
  // emitter evaluates both sides of one for every lane before selecting. A
  // call in a branch would therefore run where the function never ran it --
  // and for Math.random that is a different stream.
  if (!isBranchSafe(consequent) || !isBranchSafe(alternate)) return null;
  // GLSL has no implicit int/float conversion, so a fold whose branches
  // resolve to different types emits `cond ? int : float` and fails to
  // compile (#3 of the build review). The types are not known until tracing,
  // so the conservative proxy is literal shape: an integer literal on one
  // side and a fractional one on the other is exactly the failing case.
  const consequentKind = branchLiteralKind(consequent);
  const alternateKind = branchLiteralKind(alternate);
  if (consequentKind !== 'unknown' && alternateKind !== 'unknown' &&
    consequentKind !== alternateKind) return null;
  return stampSynthetic({
    type: 'ConditionalExpression',
    test: statement.test,
    consequent,
    alternate,
  }, statement);
}

/**
 * @returns {String} 'int' | 'float' | 'unknown' -- the literal shape a folded
 * branch would carry into a ternary. Only a definite disagreement blocks the
 * fold; 'unknown' matches anything, since the emitter resolves those itself.
 */
function branchLiteralKind(ast) {
  if (!ast) return 'unknown';
  if (ast.type === 'Literal' && typeof ast.value === 'number') {
    return Number.isInteger(ast.value) ? 'int' : 'float';
  }
  if (ast.type === 'BinaryExpression' && '+-*/'.indexOf(ast.operator) > -1) {
    const left = branchLiteralKind(ast.left);
    const right = branchLiteralKind(ast.right);
    if (left === 'float' || right === 'float') return 'float';
    if (left === 'unknown' || right === 'unknown') return 'unknown';
    return ast.operator === '/' ? 'unknown' : 'int';
  }
  return 'unknown';
}

function branchExpression(branch) {
  if (!branch) return null;
  return tailExpression(branch.type === 'BlockStatement' ? branch.body : [branch], 0);
}

function containsReturn(ast) {
  let found = false;
  walk(ast, node => {
    if (node.type === 'ReturnStatement') found = true;
  });
  return found;
}

function isBranchSafe(ast) {
  let safe = true;
  walk(ast, node => {
    if (node.type === 'CallExpression' && !isPureMathCall(node)) safe = false;
  });
  return safe;
}

// --------------------------------------------------------- T2: the call graph

/**
 * Decides, for a whole FunctionBuilder at once, which helpers T2 may inline.
 * Called once per build, before any function node is optimized.
 *
 * Everything here reads RAW ASTs -- parsed and de-minified, never optimized or
 * traced. Tracing a helper early would resolve its argument types from a
 * caller the un-optimized build resolves them from second, which is exactly
 * the difference this pass exists not to make.
 *
 * @param {FunctionBuilder} builder
 * @returns {Map<String, Object>} name -> plan entry, only for helpers every
 * one of whose call sites will be inlined
 */
function buildInlinePlan(builder) {
  const entries = new Map();
  const kernel = builder.kernel || {};
  const allowedFree = new Set(['Math', 'Infinity']);
  if (kernel.constants) {
    for (const name in kernel.constants) allowedFree.add(name);
  }
  for (let i = 0; i < builder.nativeFunctionNames.length; i++) {
    allowedFree.add(builder.nativeFunctionNames[i]);
  }

  for (const name in builder.functionMap) {
    const node = builder.functionMap[name];
    if (!node) continue;
    let ast = null;
    try {
      ast = node.getRawAST();
    } catch (e) {
      // a helper whose source will not parse fails loudly at emission, where
      // the error names the function; it must not fail here instead
      ast = null;
    }
    if (!ast || !ast.body || ast.body.type !== 'BlockStatement') continue;
    // a native function of the same name WINS at emission, deliberately, so
    // the JavaScript body registered under that name is not what the call
    // site runs and must never be what it inlines
    const shadowed = builder.nativeFunctionNames.indexOf(name) > -1;
    // addFunction's declared returnType/argumentTypes are coercions the
    // emitter applies at the call boundary; inlining deletes the boundary and
    // with it the coercion, so a declared helper keeps its call
    const declaredTypes = Boolean(node.hasDeclaredTypes);
    const kind = node.isRootKernel ? 'root' :
      (node.isSubKernel || shadowed || declaredTypes ? 'subKernel' : 'helper');
    registerPlanEntry(entries, name, ast, kind, allowedFree);
  }

  // gpu.js fixes a helper's parameter types from the FIRST call site the
  // emitter reaches, and every later site is coerced into them. Inlining
  // gives each site its own types, so a helper called with `Integer` at one
  // site and `Number` at another computes differently once inlined (#2 of
  // the build review). Multi-site helpers therefore keep their calls unless
  // every site passes arguments of the same shape -- which the plan cannot
  // know before tracing, so the conservative rule is: one site inlines.
  for (const entry of entries.values()) allowedFree.add(entry.name);
  for (const entry of entries.values()) analyzePlanEntry(entry, allowedFree);
  // effects propagate along the call graph: a pure-looking helper that calls
  // a drawing one is effectful at ITS call sites too
  let effectsChanged = true;
  while (effectsChanged) {
    effectsChanged = false;
    for (const entry of entries.values()) {
      if (entry.hasEffects) continue;
      for (let i = 0; i < entry.calls.length; i++) {
        const callee = entries.get(entry.calls[i]);
        if (callee && callee.hasEffects) {
          entry.hasEffects = true;
          effectsChanged = true;
          break;
        }
      }
    }
  }
  markRecursive(entries);

  // the site scan classifies a call by whether its callee is still a
  // candidate, so disqualifying one can change how another site reads; the
  // scan repeats until the candidate set stops shrinking
  let changed = true;
  while (changed) {
    changed = false;
    for (const entry of entries.values()) entry.sites = [];
    const blocked = new Set();
    for (const entry of entries.values()) scanPlanEntry(entries, entry, blocked);
    for (const name of blocked) {
      const entry = entries.get(name);
      if (entry && entry.inlinable) {
        entry.inlinable = false;
        changed = true;
      }
    }
    // a helper the budget sheds keeps its call sites, and a surviving call is
    // an effect the scan has to see -- so the budget runs inside the fixed
    // point, not after it
    if (!changed && applyInlineBudget(entries)) changed = true;
  }

  const plan = new Map();
  for (const entry of entries.values()) {
    if (!entry.inlinable) continue;
    plan.set(entry.name, {
      params: entry.params,
      body: entry.body,
      assignedParams: entry.assignedParams,
      localNames: entry.localNames,
      returnsValue: entry.returnsValue,
    });
  }
  // multi-site helpers keep their calls: the emitter's first-site parameter
  // type fixing is a coercion inlining would delete (#2)
  for (const entry of entries.values()) {
    if (entry.inlinable && entry.sites.length > 1) {
      entry.inlinable = false;
      entry.sites = [];
    }
  }

  return plan;
}

function registerPlanEntry(entries, name, ast, kind, allowedFree) {
  if (!entries.has(name)) {
    entries.set(name, {
      name,
      ast,
      kind,
      params: (ast.params || []).map(param => (param.type === 'Identifier' ? param.name : null)),
      body: ast.body.body,
      assignedParams: new Set(),
      localNames: new Set(),
      returnsValue: false,
      inlinable: kind === 'helper',
      recursive: false,
      calls: [],
      sites: [],
      selfSize: 0,
      expandedSize: 0,
    });
  }
  // a function declared inside another is its own emitted function; register
  // it so its calls are graph edges, and refuse to inline the one that
  // declares it (nested functions are registered by AST identity, so a clone
  // would register the same helper twice)
  const nested = [];
  walk(ast.body, node => {
    if (node.type === 'FunctionDeclaration' && node.id && node.id.name) nested.push(node);
  });
  for (let i = 0; i < nested.length; i++) {
    registerPlanEntry(entries, nested[i].id.name, nested[i], 'helper', allowedFree);
  }
}

/**
 * The structural verdict on one helper, independent of its call sites.
 */
function analyzePlanEntry(entry, allowedFree) {
  entry.selfSize = nodeCount(entry.body);
  const declared = new Set();
  const assigned = new Set();
  const free = new Set();
  let rejected = false;
  // a draw advances a seeded stream, so its POSITION is observable
  let hasEffects = false;
  walk(entry.body, node => {
    if (node.type === 'CallExpression' && node.callee &&
      node.callee.type === 'MemberExpression' && node.callee.object &&
      node.callee.object.name === 'Math' && node.callee.property &&
      node.callee.property.name === 'random') {
      hasEffects = true;
    }
  });

  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) visit(node[i]);
      return;
    }
    if (typeof node.type !== 'string') return;
    switch (node.type) {
      case 'LabeledStatement':
        rejected = true;
        return;
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        rejected = true;
        return;
      case 'VariableDeclarator':
        if (node.id && node.id.type === 'Identifier') declared.add(node.id.name);
        break;
      case 'AssignmentExpression':
        if (node.left.type === 'Identifier') assigned.add(node.left.name);
        break;
      case 'UpdateExpression':
        if (node.argument.type === 'Identifier') assigned.add(node.argument.name);
        break;
      case 'Identifier':
        free.add(node.name);
        break;
      case 'MemberExpression':
        visit(node.object);
        if (node.computed) visit(node.property);
        return;
    }
    for (const key in node) {
      if (key === 'loc' || key === 'range' || key === 'parent') continue;
      const child = node[key];
      if (child && typeof child === 'object') visit(child);
    }
  };
  visit(entry.body);

  for (let i = 0; i < entry.params.length; i++) {
    if (entry.params[i] === null) rejected = true;
  }
  if (rejected) {
    entry.inlinable = false;
    return;
  }
  for (const name of free) {
    if (declared.has(name) || entry.params.indexOf(name) > -1 || allowedFree.has(name)) continue;
    // an identifier the helper does not declare would bind to whatever the
    // caller happens to have named that -- capture, not inlining
    entry.inlinable = false;
    return;
  }
  entry.localNames = declared;
  for (let i = 0; i < entry.params.length; i++) {
    if (assigned.has(entry.params[i])) entry.assignedParams.add(entry.params[i]);
  }
  // a write to anything the helper did not declare itself escapes the
  // expansion, so its position relative to a sibling site is observable
  for (const name of assigned) {
    if (!declared.has(name) && entry.params.indexOf(name) === -1) hasEffects = true;
  }
  entry.hasEffects = hasEffects;
  const reduced = reduceReturns(entry.body);
  if (!reduced) {
    entry.inlinable = false;
    return;
  }
  entry.returnsValue = reduced.value !== null;
  if (entry.selfSize > INLINE_MAX_HELPER_NODES) entry.inlinable = false;
}

/**
 * Records the graph edges out of one function and blocks any callee whose call
 * site this pass cannot hoist.
 */
function scanPlanEntry(entries, entry, blocked) {
  const candidates = name => {
    const target = entries.get(name);
    return target && target.inlinable && !target.recursive ? target : null;
  };
  const hoisted = new Set();
  const scan = { candidates, sites: [], clean: true };
  const walkStatements = list => {
    for (let i = 0; i < list.length; i++) walkStatement(list[i]);
  };
  const walkStatement = statement => {
    if (!statement || typeof statement.type !== 'string') return;
    if (statement.type === 'FunctionDeclaration') return;
    scan.clean = true;
    scan.sites = [];
    const roots = statementValueRoots(statement);
    for (let i = 0; i < roots.length; i++) {
      scanValue(roots[i].parent, roots[i].key, scan, Boolean(roots[i].statementPosition));
    }
    for (let i = 0; i < scan.sites.length; i++) {
      hoisted.add(scan.sites[i].node);
      entry.sites.push(scan.sites[i]);
    }
    switch (statement.type) {
      case 'BlockStatement':
        walkStatements(statement.body);
        return;
      case 'IfStatement':
        walkStatement(statement.consequent);
        if (statement.alternate) walkStatement(statement.alternate);
        return;
      case 'ForStatement':
      case 'WhileStatement':
      case 'DoWhileStatement':
        walkStatement(statement.body);
        return;
      case 'SwitchStatement':
        for (let i = 0; i < statement.cases.length; i++) walkStatements(statement.cases[i].consequent);
        return;
    }
  };
  walkStatements(entry.body);

  // EVERY call this walk did not claim -- in a conditional operand, behind an
  // effect, in a loop test, inside a helper's own unreachable corner -- keeps
  // its call, and a helper with one surviving call site is a helper the
  // emitter still types from whichever site it reaches first. That is what
  // makes inlining all-or-nothing rather than per site.
  walkOwn(entry.body, node => {
    if (node.type !== 'CallExpression' || hoisted.has(node)) return;
    const name = inlineCalleeName(node);
    if (name && entries.has(name)) blocked.add(name);
  });
  for (let i = 0; i < entry.sites.length; i++) {
    const site = entry.sites[i];
    if (site.node.arguments.length < site.entry.params.length) blocked.add(site.entry.name);
    for (let j = 0; j < site.node.arguments.length; j++) {
      if (site.node.arguments[j].type === 'SpreadElement') blocked.add(site.entry.name);
    }
  }
}

function markRecursive(entries) {
  const edges = new Map();
  for (const entry of entries.values()) {
    const out = new Set();
    walkOwn(entry.body, node => {
      if (node.type !== 'CallExpression') return;
      const name = inlineCalleeName(node);
      if (name && entries.has(name)) out.add(name);
    });
    edges.set(entry.name, out);
  }
  const state = new Map();
  const onStack = [];
  const visit = name => {
    if (state.get(name) === 'done') return;
    if (state.get(name) === 'open') {
      // everything from the repeat of `name` on the stack is one cycle
      for (let i = onStack.lastIndexOf(name); i < onStack.length; i++) {
        entries.get(onStack[i]).recursive = true;
        entries.get(onStack[i]).inlinable = false;
      }
      return;
    }
    state.set(name, 'open');
    onStack.push(name);
    for (const next of edges.get(name) || []) visit(next);
    onStack.pop();
    state.set(name, 'done');
  };
  for (const name of entries.keys()) visit(name);
}

/**
 * The emitted-size budget. Expanded sizes are computed leaf-first, then any
 * caller that would gain more than the budget sheds its largest inlinable
 * callee -- globally, since inlining is all-or-nothing per helper. Largest
 * first, ties by name, so the outcome does not depend on map order.
 */
function applyInlineBudget(entries) {
  let bounded = false;
  let shed = false;
  while (!bounded) {
    computeExpandedSizes(entries);
    for (const entry of entries.values()) {
      if (entry.inlinable && entry.expandedSize > INLINE_MAX_HELPER_NODES) {
        entry.inlinable = false;
        shed = true;
      }
    }
    bounded = true;
    let worst = null;
    let worstAdded = INLINE_MAX_ADDED_NODES;
    for (const entry of entries.values()) {
      let added = 0;
      for (let i = 0; i < entry.sites.length; i++) {
        const callee = entries.get(entry.sites[i].entry.name);
        if (callee && callee.inlinable) added += callee.expandedSize;
      }
      if (added > worstAdded) {
        worstAdded = added;
        worst = entry;
      }
    }
    if (!worst) break;
    let victim = null;
    for (let i = 0; i < worst.sites.length; i++) {
      const callee = entries.get(worst.sites[i].entry.name);
      if (!callee || !callee.inlinable) continue;
      if (!victim || callee.expandedSize > victim.expandedSize ||
        (callee.expandedSize === victim.expandedSize && callee.name < victim.name)) {
        victim = callee;
      }
    }
    if (!victim) break;
    victim.inlinable = false;
    shed = true;
    bounded = false;
  }
  return shed;
}

function computeExpandedSizes(entries) {
  const pending = new Set(entries.keys());
  for (const entry of entries.values()) entry.expandedSize = entry.selfSize;
  // acyclic among the inlinable, so a fixed number of relaxations settles it
  for (let round = 0; round < pending.size + 1; round++) {
    let changed = false;
    for (const entry of entries.values()) {
      let size = entry.selfSize;
      for (let i = 0; i < entry.sites.length; i++) {
        const callee = entries.get(entry.sites[i].entry.name);
        if (callee && callee.inlinable) size += callee.expandedSize;
      }
      if (size !== entry.expandedSize) {
        entry.expandedSize = size;
        changed = true;
      }
    }
    if (!changed) break;
  }
}

function nodeCount(ast) {
  let count = 0;
  walk(ast, () => {
    count++;
  });
  return count;
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
  // A non-literal init (`let i = -2` is a UnaryExpression) falls outside the
  // emitters' canonical-loop rule, so they wrap it in the LOOP_MAX safety
  // form. Unrolling deletes that wrapper, which changes results whenever the
  // trip count exceeds the cap (#4 of the build review) -- so unroll such a
  // loop only when every iteration would have run anyway.
  if (loop.init && loop.init.type === 'VariableDeclaration' &&
    loop.init.declarations[0].init.type !== 'Literal') {
    // unset means the emitters' own default, not zero
    const cap = context.functionNode.loopMaxIterations || 1000;
    if (values.length > cap) return null;
  }
  const body = loop.body ?
    (loop.body.type === 'BlockStatement' ? loop.body.body : [loop.body]) : [];
  if (!bodyIsUnrollable(body, induction.name)) return null;

  // the cumulative guard: unrollStatement descends before it unrolls, so an
  // inner loop is unrolled once and then CLONED by every outer iteration.
  // Counting the copies this expansion adds against a running total is what
  // keeps a 3-deep nest from emitting 8^3 bodies (#8).
  const bodyNodes = countNodes(body);
  const added = bodyNodes * (values.length - 1);
  if (context.unrollAdded === undefined) context.unrollAdded = 0;
  if (context.unrollAdded + added > UNROLL_MAX_ADDED_NODES) return null;
  context.unrollAdded += added;

  const result = [];
  for (let i = 0; i < values.length; i++) {
    result.push(stampSynthetic({
      type: 'BlockStatement',
      body: cloneNodes(context, body, induction.name, values[i]),
    }, loop));
  }
  return result;
}

function countNodes(ast) {
  let count = 0;
  walk(ast, () => { count++; });
  return count;
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
  buildInlinePlan,
  threadLocalName
};