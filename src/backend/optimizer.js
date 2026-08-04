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
  processBlock(context, ast.body);
  return ast;
}

class OptimizerContext {
  constructor(functionNode, ast, settings) {
    this.functionNode = functionNode;
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

module.exports = {
  optimize
};