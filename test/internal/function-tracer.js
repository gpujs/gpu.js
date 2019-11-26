const { assert, test, skip, module: describe, only } = require('qunit');
const { FunctionTracer } = require('../../src');

describe('internal: FunctionTracer');

test('works with Program', () => {
  const mockBody = {};
  let called = false;
  let calledBody = null;
  const mockInstance = {
    scan: (body) => {
      called = true;
      calledBody = body;
    }
  };
  FunctionTracer.prototype.scan.call(mockInstance, { type: 'Program', body: mockBody });
  assert.ok(called);
  assert.equal(calledBody, mockBody);
});

test('works with BlockStatement', () => {
  const mockBody = {};
  let called = false;
  let calledBody = null;
  const mockInstance = {
    contexts: [],
    runningContexts: [],
    newContext: FunctionTracer.prototype.newContext,
    scan: (body) => {
      called = true;
      calledBody = body;
    }
  };
  FunctionTracer.prototype.scan.call(mockInstance, { type: 'BlockStatement', body: mockBody });
  assert.ok(called);
  assert.equal(calledBody, mockBody);
  assert.equal(mockInstance.contexts.length, 1);
});

test('works with AssignmentExpression', () => {
  const mockLeft = {};
  const mockRight = {};
  let called = false;
  let calledSides = [];
  const mockInstance = {
    scan: (side) => {
      called = true;
      calledSides.push(side);
    }
  };
  FunctionTracer.prototype.scan.call(mockInstance, { type: 'AssignmentExpression', left: mockLeft, right: mockRight });
  assert.ok(called);
  assert.deepEqual(calledSides, [mockLeft, mockRight]);
});

test('works with LogicalExpression', () => {
  const mockLeft = {};
  const mockRight = {};
  let called = false;
  let calledSides = [];
  const mockInstance = {
    scan: (side) => {
      called = true;
      calledSides.push(side);
    }
  };
  FunctionTracer.prototype.scan.call(mockInstance, { type: 'LogicalExpression', left: mockLeft, right: mockRight });
  assert.ok(called);
  assert.deepEqual(calledSides, [mockLeft, mockRight]);
});

test('works with BinaryExpression', () => {
  const mockLeft = {};
  const mockRight = {};
  let called = false;
  let calledSides = [];
  const mockInstance = {
    scan: (side) => {
      called = true;
      calledSides.push(side);
    }
  };
  FunctionTracer.prototype.scan.call(mockInstance, { type: 'BinaryExpression', left: mockLeft, right: mockRight });
  assert.ok(called);
  assert.deepEqual(calledSides, [mockLeft, mockRight]);
});

test('works with UpdateExpression', () => {
  const mockArgument = {};
  let called = false;
  let calledBody = null;
  const mockInstance = {
    scan: (argument) => {
      called = true;
      calledBody = argument;
    }
  };
  FunctionTracer.prototype.scan.call(mockInstance, { type: 'UpdateExpression', argument: mockArgument });
  assert.ok(called);
  assert.equal(calledBody, mockArgument);
});

test('works with UnaryExpression', () => {
  const mockArgument = {};
  let called = false;
  let calledArgument = null;
  const mockInstance = {
    scan: (argument) => {
      called = true;
      calledArgument = argument;
    }
  };
  FunctionTracer.prototype.scan.call(mockInstance, { type: 'UpdateExpression', argument: mockArgument });
  assert.ok(called);
  assert.equal(calledArgument, mockArgument);
});

test('works with VariableDeclaration', () => {
  const mockDeclarations = [];
  let called = false;
  let calledDeclarations = null;
  const mockInstance = {
    scan: (declarations) => {
      called = true;
      calledDeclarations = declarations;
    }
  };
  FunctionTracer.prototype.scan.call(mockInstance, { type: 'VariableDeclaration', declarations: mockDeclarations });
  assert.ok(called);
  assert.deepEqual(calledDeclarations, mockDeclarations);
});

test('works with VariableDeclarator', () => {
  const mockDeclarations = {};
  const mockCurrentContext = {};
  let called = false;
  let calledDeclarators = [];
  const mockInstance = {
    inLoopInit: false,
    declarations: [],
    currentContext: mockCurrentContext,
    scan: (declarator) => {
      called = true;
      calledDeclarators.push(declarator);
    }
  };
  const mockId =  {
    name: 'bob'
  };
  const mockInit = {};
  const mockAst = {
    type: 'VariableDeclarator',
    declarations: mockDeclarations,
    id: mockId,
    init: mockInit
  };
  FunctionTracer.prototype.scan.call(mockInstance, mockAst);
  assert.ok(called);
  assert.deepEqual(calledDeclarators, [mockId, mockInit]);
  const expecting = {
    ast: mockAst,
    context: mockCurrentContext,
    name: 'bob',
    origin: 'declaration',
    forceInteger: false,
    assignable: true,
  };
  assert.deepEqual(mockCurrentContext.bob, expecting);
  assert.deepEqual(mockInstance.declarations[0], expecting);
});

test('works with FunctionExpression when runningContexts.length = 0', () => {
  const mockBody = {};
  let called = false;
  let calledBody = null;
  const mockInstance = {
    runningContexts: [],
    functions: [],
    scan: (body) => {
      called = true;
      calledBody = body;
    }
  };
  FunctionTracer.prototype.scan.call(mockInstance, { type: 'FunctionExpression', body: mockBody });
  assert.ok(called);
  assert.equal(calledBody, mockBody);
  assert.equal(mockInstance.functions.length, 0);
});

test('works with FunctionDeclaration when runningContexts.length = 0', () => {
  const mockBody = {};
  let called = false;
  let calledBody = null;
  const mockInstance = {
    runningContexts: [],
    functions: [],
    scan: (body) => {
      called = true;
      calledBody = body;
    }
  };
  FunctionTracer.prototype.scan.call(mockInstance, { type: 'FunctionDeclaration', body: mockBody });
  assert.ok(called);
  assert.equal(calledBody, mockBody);
  assert.equal(mockInstance.functions.length, 0);
});

test('works with FunctionExpression when runningContexts.length > 0', () => {
  const mockBody = {};
  const mockInstance = {
    functions: [],
    runningContexts: [null],
    scan: () => {
      throw new Error('should not be called');
    }
  };
  const mockAst = { type: 'FunctionExpression', body: mockBody };
  FunctionTracer.prototype.scan.call(mockInstance, mockAst);
  assert.equal(mockInstance.functions.length, 1);
  assert.equal(mockInstance.functions[0], mockAst);
});

test('works with FunctionDeclaration when runningContexts.length > 0', () => {
  const mockBody = {};
  const mockInstance = {
    functions: [],
    runningContexts: [null],
    scan: () => {
      throw new Error('should not be called');
    }
  };
  const mockAst = { type: 'FunctionDeclaration', body: mockBody };
  FunctionTracer.prototype.scan.call(mockInstance, mockAst);
  assert.equal(mockInstance.functions.length, 1);
  assert.equal(mockInstance.functions[0], mockAst);
});


test('works with IfStatement', () => {
  const mockTest = {};
  const mockConsequent = {};
  const mockAlternate = {};
  let called = false;
  let calledArgs = [];
  const mockInstance = {
    scan: (arg) => {
      called = true;
      calledArgs.push(arg);
    }
  };
  FunctionTracer.prototype.scan.call(mockInstance, {
    type: 'IfStatement',
    test: mockTest,
    consequent: mockConsequent,
    alternate: mockAlternate,
  });
  assert.ok(called);
  assert.deepEqual(calledArgs, [mockTest, mockConsequent, mockAlternate]);
});

test('works with ForStatement', () => {
  const mockInit = {};
  const mockTest = {};
  const mockUpdate = {};
  const mockBody = {};
  let called = false;
  let calledArgs = [];
  const mockInstance = {
    contexts: [],
    runningContexts: [],
    newContext: FunctionTracer.prototype.newContext,
    scan: (arg) => {
      called = true;
      calledArgs.push(arg);
    }
  };
  FunctionTracer.prototype.scan.call(mockInstance, {
    type: 'ForStatement',
    init: mockInit,
    test: mockTest,
    update: mockUpdate,
    body: mockBody,
  });
  assert.ok(called);
  assert.deepEqual(calledArgs, [mockInit, mockTest, mockUpdate, mockBody]);
  assert.equal(mockInstance.contexts.length, 2);
});

test('works with DoWhileStatement', () => {
  const mockBody = {};
  const mockTest = {};
  let called = false;
  let calledArgs = [];
  const mockInstance = {
    contexts: [],
    runningContexts: [],
    newContext: FunctionTracer.prototype.newContext,
    scan: (arg) => {
      called = true;
      calledArgs.push(arg);
    }
  };
  FunctionTracer.prototype.scan.call(mockInstance, { type: 'DoWhileStatement', body: mockBody, test: mockTest });
  assert.ok(called);
  assert.deepEqual(calledArgs, [mockBody, mockTest]);
});

test('works with WhileStatement', () => {
  const mockBody = {};
  const mockTest = {};
  let called = false;
  let calledArgs = [];
  const mockInstance = {
    contexts: [],
    runningContexts: [],
    newContext: FunctionTracer.prototype.newContext,
    scan: (arg) => {
      called = true;
      calledArgs.push(arg);
    }
  };
  FunctionTracer.prototype.scan.call(mockInstance, { type: 'WhileStatement', body: mockBody, test: mockTest });
  assert.ok(called);
  assert.deepEqual(calledArgs, [mockBody, mockTest]);
});

test('works with Identifier', () => {
  const mockCurrentContext = {};
  const mockInstance = {
    identifiers: [],
    currentContext: mockCurrentContext,
  };
  const mockAst = { type: 'Identifier' };
  FunctionTracer.prototype.scan.call(mockInstance, mockAst);
  assert.deepEqual(mockInstance.identifiers, [
    {
      context: mockInstance.currentContext,
      ast: mockAst
    }
  ]);
});

test('works with ReturnStatement', () => {
  const mockArgument = {};
  let called = false;
  let calledArgument = null;
  const mockInstance = {
    returnStatements: [],
    scan: (argument) => {
      called = true;
      calledArgument = argument;
    }
  };
  const mockAst = { type: 'ReturnStatement', argument: mockArgument };
  FunctionTracer.prototype.scan.call(mockInstance, mockAst);
  assert.ok(called);
  assert.equal(calledArgument, mockArgument);
  assert.equal(mockInstance.returnStatements[0], mockAst);
});


test('works with MemberExpression', () => {
  const mockBody = {};
  const mockProperty = {};
  let called = false;
  let calledArgs = [];
  const mockInstance = {
    scan: (arg) => {
      called = true;
      calledArgs.push(arg);
    }
  };
  FunctionTracer.prototype.scan.call(mockInstance, { type: 'MemberExpression', object: mockBody, property: mockProperty });
  assert.ok(called);
  assert.deepEqual(calledArgs, [mockBody, mockProperty]);
});


test('works with ExpressionStatement', () => {
  const mockExpression = {};
  let called = false;
  let calledExpression = null;
  const mockInstance = {
    scan: (body) => {
      called = true;
      calledExpression = body;
    }
  };
  FunctionTracer.prototype.scan.call(mockInstance, { type: 'ExpressionStatement', expression: mockExpression });
  assert.ok(called);
  assert.equal(calledExpression, mockExpression);
});

test('works with SequenceExpression', () => {
  const mockExpression = {};
  const mockExpressions = [mockExpression];
  let called = false;
  let calledExpression = null;
  const mockInstance = {
    scan: (body) => {
      called = true;
      calledExpression = body;
    }
  };
  FunctionTracer.prototype.scan.call(mockInstance, { type: 'SequenceExpression', expressions: mockExpressions });
  assert.ok(called);
  assert.equal(calledExpression, mockExpressions);
});

test('works with CallExpression', () => {
  const mockArguments = {};
  let called = false;
  let calledArguments = null;
  const mockCurrentContext = {};
  const mockInstance = {
    currentContext: mockCurrentContext,
    functionCalls: [],
    scan: (_arguments) => {
      called = true;
      calledArguments = _arguments;
    }
  };
  const mockAst = { type: 'CallExpression', arguments: mockArguments };
  FunctionTracer.prototype.scan.call(mockInstance, mockAst);
  assert.ok(called);
  assert.equal(calledArguments, mockArguments);
  assert.deepEqual(mockInstance.functionCalls, [
    {
      context: mockCurrentContext,
      ast: mockAst
    }
  ]);
});

test('works with ArrayExpression', () => {
  const mockElements = {};
  let called = false;
  let calledElements = null;
  const mockInstance = {
    scan: (elements) => {
      called = true;
      calledElements = elements;
    }
  };
  FunctionTracer.prototype.scan.call(mockInstance, { type: 'ArrayExpression', elements: mockElements });
  assert.ok(called);
  assert.equal(calledElements, mockElements);
});

test('works with ConditionalExpression', () => {
  const mockTest = {};
  const mockAlternate = {};
  const mockConsequent = {};
  let called = false;
  let calledArgs = [];
  const mockInstance = {
    scan: (arg) => {
      called = true;
      calledArgs.push(arg);
    }
  };
  FunctionTracer.prototype.scan.call(mockInstance, { type: 'ConditionalExpression', test: mockTest, alternate: mockAlternate, consequent: mockConsequent });
  assert.ok(called);
  assert.deepEqual(calledArgs, [mockTest, mockConsequent, mockConsequent]);
});

test('works with SwitchStatement', () => {
  const mockDiscriminant = {};
  const mockCases = {};
  let called = false;
  let calledArgs = [];
  const mockInstance = {
    scan: (arg) => {
      called = true;
      calledArgs.push(arg);
    }
  };
  FunctionTracer.prototype.scan.call(mockInstance, { type: 'SwitchStatement', discriminant: mockDiscriminant, cases: mockCases });
  assert.ok(called);
  assert.deepEqual(calledArgs, [mockDiscriminant, mockCases]);
});

test('works with SwitchCase', () => {
  const mockTest = {};
  const mockConsequent = {};
  let called = false;
  let calledArgs = [];
  const mockInstance = {
    scan: (arg) => {
      called = true;
      calledArgs.push(arg);
    }
  };
  FunctionTracer.prototype.scan.call(mockInstance, { type: 'SwitchCase', test: mockTest, consequent: mockConsequent });
  assert.ok(called);
  assert.deepEqual(calledArgs, [mockTest, mockConsequent]);
});

test('does nothing with un-scan-ables', () => {
  let called = false;
  const mockInstance = {
    scan: () => {
      called = true;
    }
  };
  [
    'ThisExpression',
    'Literal',
    'DebuggerStatement',
    'EmptyStatement',
    'BreakStatement',
    'ContinueStatement'
  ].forEach(type => {
    FunctionTracer.prototype.scan.call(mockInstance, { type });
  });
  assert.ok(!called);
});

test('when called with fake type, throws', () => {
  assert.throws(() => {
    FunctionTracer.prototype.scan.call({}, { type: 'Made Up' });
  });
});

test('can handle direct arrays', () => {
  const mockBlockBody = {};
  const mockProgramBody = {};
  const asts = [
    { type: 'BlockStatement' },
    { type: 'Program' },
  ];
  const calledAsts = [];
  const mockInstance = {
    scan: (ast) => {
      calledAsts.push(ast);
    }
  };
  FunctionTracer.prototype.scan.call(mockInstance, asts);
  assert.deepEqual(calledAsts, asts);
});
