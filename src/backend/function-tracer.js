const { utils } = require('../utils');

function last(array) {
  return array.length > 0 ? array[array.length - 1] : null;
}

const states = {
  trackIdentifiers: 'trackIdentifiers',
  memberExpression: 'memberExpression',
  inForLoopInit: 'inForLoopInit'
};

class FunctionTracer {
  constructor(ast) {
    this.runningContexts = [];
    this.functionContexts = [];
    this.contexts = [];
    this.functionCalls = [];
    /**
     *
     * @type {IDeclaration[]}
     */
    this.declarations = [];
    this.identifiers = [];
    this.functions = [];
    this.returnStatements = [];
    this.trackedIdentifiers = null;
    this.states = [];
    this.newFunctionContext();
    this.scan(ast);
  }

  isState(state) {
    return this.states[this.states.length - 1] === state;
  }

  hasState(state) {
    return this.states.indexOf(state) > -1;
  }

  pushState(state) {
    this.states.push(state);
  }

  popState(state) {
    if (this.isState(state)) {
      this.states.pop();
    } else {
      throw new Error(`Cannot pop the non-active state "${state}"`);
    }
  }

  get currentFunctionContext() {
    return last(this.functionContexts);
  }

  get currentContext() {
    return last(this.runningContexts);
  }

  newFunctionContext() {
    const newContext = { '@contextType': 'function' };
    this.contexts.push(newContext);
    this.functionContexts.push(newContext);
  }

  newContext(run) {
    const newContext = Object.assign({ '@contextType': 'const/let' }, this.currentContext);
    this.contexts.push(newContext);
    this.runningContexts.push(newContext);
    run();
    const { currentFunctionContext } = this;
    for (const p in currentFunctionContext) {
      if (!currentFunctionContext.hasOwnProperty(p) || newContext.hasOwnProperty(p)) continue;
      newContext[p] = currentFunctionContext[p];
    }
    this.runningContexts.pop();
    return newContext;
  }

  useFunctionContext(run) {
    const functionContext = last(this.functionContexts);
    this.runningContexts.push(functionContext);
    run();
    this.runningContexts.pop();
  }

  getIdentifiers(run) {
    const trackedIdentifiers = this.trackedIdentifiers = [];
    this.pushState(states.trackIdentifiers);
    run();
    this.trackedIdentifiers = null;
    this.popState(states.trackIdentifiers);
    return trackedIdentifiers;
  }

  /**
   * @param {string} name
   * @returns {IDeclaration}
   */
  getDeclaration(name) {
    const { currentContext, currentFunctionContext, runningContexts } = this;
    const declaration = currentContext[name] || currentFunctionContext[name] || null;

    if (
      !declaration &&
      currentContext === currentFunctionContext &&
      runningContexts.length > 0
    ) {
      const previousRunningContext = runningContexts[runningContexts.length - 2];
      if (previousRunningContext[name]) {
        return previousRunningContext[name];
      }
    }

    return declaration;
  }

  /**
   * Recursively scans AST for declarations and functions, and add them to their respective context
   * @param ast
   */
  scan(ast) {
    if (!ast) return;
    if (Array.isArray(ast)) {
      for (let i = 0; i < ast.length; i++) {
        this.scan(ast[i]);
      }
      return;
    }
    switch (ast.type) {
      case 'Program':
        this.useFunctionContext(() => {
          this.scan(ast.body);
        });
        break;
      case 'BlockStatement':
        this.newContext(() => {
          this.scan(ast.body);
        });
        break;
      case 'AssignmentExpression':
      case 'LogicalExpression':
        this.scan(ast.left);
        this.scan(ast.right);
        break;
      case 'BinaryExpression':
        this.scan(ast.left);
        this.scan(ast.right);
        break;
      case 'UpdateExpression':
        if (ast.operator === '++') {
          const declaration = this.getDeclaration(ast.argument.name);
          if (declaration) {
            declaration.suggestedType = 'Integer';
          }
        }
        this.scan(ast.argument);
        break;
      case 'UnaryExpression':
        this.scan(ast.argument);
        break;
      case 'VariableDeclaration':
        if (ast.kind === 'var') {
          this.useFunctionContext(() => {
            ast.declarations = utils.normalizeDeclarations(ast);
            this.scan(ast.declarations);
          });
        } else {
          ast.declarations = utils.normalizeDeclarations(ast);
          this.scan(ast.declarations);
        }
        break;
      case 'VariableDeclarator': {
        const { currentContext } = this;
        const inForLoopInit = this.hasState(states.inForLoopInit);
        const declaration = {
          ast: ast,
          context: currentContext,
          name: ast.id.name,
          origin: 'declaration',
          inForLoopInit,
          inForLoopTest: null,
          assignable: currentContext === this.currentFunctionContext || (!inForLoopInit && !currentContext.hasOwnProperty(ast.id.name)),
          suggestedType: null,
          valueType: null,
          dependencies: null,
          isSafe: null,
        };
        if (!currentContext[ast.id.name]) {
          currentContext[ast.id.name] = declaration;
        }
        this.declarations.push(declaration);
        this.scan(ast.id);
        this.scan(ast.init);
        break;
      }
      case 'FunctionExpression':
      case 'FunctionDeclaration':
        if (this.runningContexts.length === 0) {
          this.scan(ast.body);
        } else {
          this.functions.push(ast);
        }
        break;
      case 'IfStatement':
        this.scan(ast.test);
        this.scan(ast.consequent);
        if (ast.alternate) this.scan(ast.alternate);
        break;
      case 'ForStatement': {
        let testIdentifiers;
        const context = this.newContext(() => {
          this.pushState(states.inForLoopInit);
          this.scan(ast.init);
          this.popState(states.inForLoopInit);

          testIdentifiers = this.getIdentifiers(() => {
            this.scan(ast.test);
          });

          this.scan(ast.update);
          this.newContext(() => {
            this.scan(ast.body);
          });
        });

        if (testIdentifiers) {
          for (const p in context) {
            if (p === '@contextType') continue;
            if (testIdentifiers.indexOf(p) > -1) {
              context[p].inForLoopTest = true;
            }
          }
        }
        break;
      }
      case 'DoWhileStatement':
      case 'WhileStatement':
        this.newContext(() => {
          this.scan(ast.body);
          this.scan(ast.test);
        });
        break;
      case 'Identifier': {
        if (this.isState(states.trackIdentifiers)) {
          this.trackedIdentifiers.push(ast.name);
        }
        this.identifiers.push({
          context: this.currentContext,
          declaration: this.getDeclaration(ast.name),
          ast,
        });
        break;
      }
      case 'ReturnStatement':
        this.returnStatements.push(ast);
        this.scan(ast.argument);
        break;
      case 'MemberExpression':
        this.pushState(states.memberExpression);
        this.scan(ast.object);
        this.scan(ast.property);
        this.popState(states.memberExpression);
        break;
      case 'ExpressionStatement':
        this.scan(ast.expression);
        break;
      case 'SequenceExpression':
        this.scan(ast.expressions);
        break;
      case 'CallExpression':
        this.functionCalls.push({
          context: this.currentContext,
          ast,
        });
        this.scan(ast.arguments);
        break;
      case 'ArrayExpression':
        this.scan(ast.elements);
        break;
      case 'ConditionalExpression':
        this.scan(ast.test);
        this.scan(ast.alternate);
        this.scan(ast.consequent);
        break;
      case 'SwitchStatement':
        this.scan(ast.discriminant);
        this.scan(ast.cases);
        break;
      case 'SwitchCase':
        this.scan(ast.test);
        this.scan(ast.consequent);
        break;

      case 'ThisExpression':
      case 'Literal':
      case 'DebuggerStatement':
      case 'EmptyStatement':
      case 'BreakStatement':
      case 'ContinueStatement':
        break;
      default:
        throw new Error(`unhandled type "${ast.type}"`);
    }
  }
}

module.exports = {
  FunctionTracer,
};