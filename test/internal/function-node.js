var GPU = require('../../src/index');

///
/// Test the various basic functionality of functionNode
///

/// Test the creation of a hello_world function
QUnit.test("hello_world: just return magic 42 (cpu)", function(assert) {
	// Create a function hello node
	var node = new GPU.CPUFunctionNode(
		"hello_world",
		function() {
			return 42;
		}
	);

	assert.notEqual(node.getJsAST(), null, "AST fetch check" );

	assert.equal(
		node.getFunctionString().replace(/\s+/g,' '),
		"function hello_world() { return 42; }",
		"function conversion check"
	);
});

QUnit.test("hello_world: just return magic 42 (webgl)", function(assert) {
	// Create a function hello node
	var node = new GPU.WebGLFunctionNode(
		"hello_world",
		function() {
			return 42;
		}
	);

	assert.notEqual(node.getJsAST(), null, "AST fetch check" );

	assert.equal(
		node.getFunctionString().replace(/\s+/g,' '),
		"float hello_world() { return 42.0; }",
		"function conversion check"
	);
});

QUnit.test("hello_world: just return magic 42 (webgl2)", function(assert) {
	// Create a function hello node
	var node = new GPU.WebGL2FunctionNode(
		"hello_world",
		function() {
			return 42;
		}
	);

	assert.notEqual(node.getJsAST(), null, "AST fetch check" );

	assert.equal(
		node.getFunctionString().replace(/\s+/g,' '),
		"float hello_world() { return 42.0; }",
		"function conversion check"
	);
});

QUnit.test("hello_world: just return magic 42 (headlessgl)", function(assert) {
	// Create a function hello node
	var node = new GPU.HeadlessGLFunctionNode(
		"hello_world",
		function() {
			return 42;
		}
	);

	assert.notEqual(node.getJsAST(), null, "AST fetch check" );

	assert.equal(
		node.getFunctionString().replace(/\s+/g,' '),
		"float hello_world() { return 42.0; }",
		"function conversion check"
	);
});

/// Test creation of function, that calls another function
QUnit.test("hello_inner: call a function inside a function (cpu)", function(assert) {
	function inner() {
		return 42;
	}

	// Create a function hello node
	var node = new GPU.CPUFunctionNode(
		"hello_inner",
		function() {
			return inner();
		}
	);

	assert.notEqual(node.getJsAST(), null, "AST fetch check" );

	assert.equal(
		node.getFunctionString().replace(/\s+/g,' '),
		"function hello_inner() { return inner(); }",
		"function conversion check"
	);

	assert.deepEqual(node.calledFunctions, ["inner"] );
});

QUnit.test("hello_inner: call a function inside a function (webgl)", function(assert) {
	function inner() {
		return 42;
	}

	// Create a function hello node
	var node = new GPU.WebGLFunctionNode(
		"hello_inner",
		function() {
			return inner();
		}
	);

	assert.notEqual(node.getJsAST(), null, "AST fetch check" );

	assert.equal(
		node.getFunctionString().replace(/\s+/g,' '),
		"float hello_inner() { return inner(); }",
		"function conversion check"
	);

	assert.deepEqual(node.calledFunctions, ["inner"] );
});

/// Test creation of function, that calls another function
QUnit.test("hello_inner: call a function inside a function (webgl2)", function(assert) {
	function inner() {
		return 42;
	}

	// Create a function hello node
	var node = new GPU.WebGL2FunctionNode(
		"hello_inner",
		function() {
			return inner();
		}
	);

	assert.notEqual(node.getJsAST(), null, "AST fetch check" );

	assert.equal(
		node.getFunctionString().replace(/\s+/g,' '),
		"float hello_inner() { return inner(); }",
		"function conversion check"
	);

	assert.deepEqual(node.calledFunctions, ["inner"] );
});

/// Test creation of function, that calls another function
QUnit.test("hello_inner: call a function inside a function (headlessgl)", function(assert) {
	function inner() {
		return 42;
	}

	// Create a function hello node
	var node = new GPU.HeadlessGLFunctionNode(
		"hello_inner",
		function() {
			return inner();
		}
	);

	assert.notEqual(node.getJsAST(), null, "AST fetch check" );

	assert.equal(
		node.getFunctionString().replace(/\s+/g,' '),
		"float hello_inner() { return inner(); }",
		"function conversion check"
	);

	assert.deepEqual(node.calledFunctions, ["inner"] );
});

/// Test creation of function, that calls another function, with ARGS
QUnit.test("Math.round implementation: A function with arguments (cpu)", function(assert) {
	// Math.round node
	var node = new GPU.CPUFunctionNode(
		"round",
		function(a) {
			return Math.floor(a + 0.5 );
		}
	);

	assert.notEqual(node.getJsAST(), null, "AST fetch check" );

	assert.equal(
		node.getFunctionString().replace(/\s+/g,' ').replace(/user_/g,''),
		"function round(a) { return Math.floor((a+0.5)); }",
		"function conversion check"
	);

	assert.deepEqual(node.calledFunctions, ["Math.floor"]);
});

QUnit.test("Math.round implementation: A function with arguments (webgl)", function(assert) {
	// Math.round node
	var node = new GPU.WebGLFunctionNode(
		"round",
		function(a) {
			return Math.floor(a + 0.5 );
		}
	);

	assert.notEqual(node.getJsAST(), null, "AST fetch check" );

	assert.equal(
		node.getFunctionString().replace(/\s+/g,' ').replace(/user_/g,''),
		"float round(float a) { return floor((a+0.5)); }",
		"function conversion check"
	);

	assert.deepEqual(node.calledFunctions, ["floor"] );
});

QUnit.test("Math.round implementation: A function with arguments (webgl2)", function(assert) {
	// Math.round node
	var node = new GPU.WebGL2FunctionNode(
		"round",
		function(a) {
			return Math.floor(a + 0.5 );
		}
	);

	assert.notEqual(node.getJsAST(), null, "AST fetch check" );

	assert.equal(
		node.getFunctionString().replace(/\s+/g,' ').replace(/user_/g,''),
		"float round(float a) { return floor((a+0.5)); }",
		"function conversion check"
	);

	assert.deepEqual(node.calledFunctions, ["floor"] );
});

QUnit.test("Math.round implementation: A function with arguments (headlessgl)", function(assert) {
	// Math.round node
	var node = new GPU.HeadlessGLFunctionNode(
		"round",
		function(a) {
			return Math.floor(a + 0.5 );
		}
	);

	assert.notEqual(node.getJsAST(), null, "AST fetch check" );

	assert.equal(
		node.getFunctionString().replace(/\s+/g,' ').replace(/user_/g,''),
		"float round(float a) { return floor((a+0.5)); }",
		"function conversion check"
	);

	assert.deepEqual(node.calledFunctions, ["floor"] );
});

/// Test creation of function, that calls another function, with ARGS
QUnit.test("Two arguments test (webgl)", function(assert){
	var node = new GPU.WebGLFunctionNode(
		"add_together",
		function(a,b) {
			return a+b;
		}
	);

	assert.notEqual(node.getJsAST(), null, "AST fetch check" );

	assert.equal(
		node.getFunctionString().replace(/\s+/g,' ').replace(/user_/g,''),
		"float add_together(float a, float b) { return (a+b); }",
		"function conversion check"
	);
});

QUnit.test("Two arguments test (webgl2)", function(assert){
	var node = new GPU.WebGL2FunctionNode(
		"add_together",
		function(a,b) {
			return a+b;
		}
	);

	assert.notEqual(node.getJsAST(), null, "AST fetch check" );

	assert.equal(
		node.getFunctionString().replace(/\s+/g,' ').replace(/user_/g,''),
		"float add_together(float a, float b) { return (a+b); }",
		"function conversion check"
	);
});

QUnit.test("Two arguments test (headlessgl)", function(assert){
	var node = new GPU.HeadlessGLFunctionNode(
		"add_together",
		function(a,b) {
			return a+b;
		}
	);

	assert.notEqual(node.getJsAST(), null, "AST fetch check" );

	assert.equal(
		node.getFunctionString().replace(/\s+/g,' ').replace(/user_/g,''),
		"float add_together(float a, float b) { return (a+b); }",
		"function conversion check"
	);
});

/// Test the creation of a hello_world function
QUnit.test("Automatic naming support (cpu)", function(assert) {
	function hello_world() {
		return 42;
	}
	// Create a function hello node
	var node = new GPU.CPUFunctionNode(null, hello_world);
	assert.notEqual(node, null, "class creation check" );
	assert.equal(node.functionName, "hello_world" );
});

QUnit.test("Automatic naming support (webgl)", function(assert) {
	function hello_world() {
		return 42;
	}
	// Create a function hello node
	var node = new GPU.WebGLFunctionNode(null, hello_world);
	assert.notEqual(node, null, "class creation check" );
	assert.equal(node.functionName, "hello_world" );
});

QUnit.test("Automatic naming support (webgl2)", function(assert) {
	function hello_world() {
		return 42;
	}
	// Create a function hello node
	var node = new GPU.WebGL2FunctionNode(null, hello_world);
	assert.notEqual(node, null, "class creation check" );
	assert.equal(node.functionName, "hello_world" );
});

QUnit.test("Automatic naming support (headlessgl)", function(assert) {
	function hello_world() {
		return 42;
	}
	// Create a function hello node
	var node = new GPU.HeadlessGLFunctionNode(null, hello_world);
	assert.notEqual(node, null, "class creation check" );
	assert.equal(node.functionName, "hello_world" );
});
