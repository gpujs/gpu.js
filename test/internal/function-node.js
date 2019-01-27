(() => {
	const GPU = require('../../src/index');

	///
	/// Test the various basic functionality of functionNode
	///

	/// Test the creation of a hello_world function
	QUnit.test("hello_world: just return magic 42 (cpu)", function(assert) {
		// Create a function hello node
		const node = new GPU.CPUFunctionNode(
			(function() {
				return 42;
			}).toString(), { name: 'hello_world' }
		);

		assert.notEqual(node.getJsAST(), null, "AST fetch check");

		assert.equal(
			node.toString().replace(/\s+/g,' '),
			"function hello_world() { return 42; }",
			"function conversion check"
		);
	});

	QUnit.test("hello_world: just return magic 42 (webgl)", function(assert) {
		// Create a function hello node
		const node = new GPU.WebGLFunctionNode(
			(function() {
				return 42;
			}).toString(), { name: 'hello_world' }
		);

		assert.notEqual(node.getJsAST(), null, "AST fetch check");

		assert.equal(
			node.toString().replace(/\s+/g,' '),
			"float hello_world() { return 42.0; }",
			"function conversion check"
		);
	});

	QUnit.test("hello_world: just return magic 42 (webgl2)", function(assert) {
		// Create a function hello node
		const node = new GPU.WebGL2FunctionNode(
			(function() {
				return 42;
			}).toString(), { name: 'hello_world' }
		);

		assert.notEqual(node.getJsAST(), null, "AST fetch check");

		assert.equal(
			node.toString().replace(/\s+/g,' '),
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
			(function() {
				return inner();
			}).toString(), { name: 'hello_inner' }
		);

		assert.notEqual(node.getJsAST(), null, "AST fetch check");

		assert.equal(
			node.toString().replace(/\s+/g,' '),
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
		const node = new GPU.WebGLFunctionNode(
			(function() {
				return inner();
			}).toString(), { name: 'hello_inner' }
		);

		assert.notEqual(node.getJsAST(), null, "AST fetch check");

		assert.equal(
			node.toString().replace(/\s+/g,' '),
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
		const node = new GPU.WebGL2FunctionNode(
			(function() {
				return inner();
			}).toString(), { name: 'hello_inner' }
		);

		assert.notEqual(node.getJsAST(), null, "AST fetch check");

		assert.equal(
			node.toString().replace(/\s+/g,' '),
			"float hello_inner() { return inner(); }",
			"function conversion check"
		);

		assert.deepEqual(node.calledFunctions, ["inner"] );
	});

	/// Test creation of function, that calls another function, with ARGS
	QUnit.test("Math.round implementation: A function with arguments (cpu)", function(assert) {
		// Math.round node
		const node = new GPU.CPUFunctionNode(
			(function(a) {
				return Math.floor(a + 0.5 );
			}).toString(), { name: 'foo' }
		);

		assert.notEqual(node.getJsAST(), null, "AST fetch check");

		assert.equal(
			node.toString().replace(/\s+/g,' ').replace(/user_/g,''),
			"function foo(a) { return Math.floor((a+0.5)); }",
			"function conversion check"
		);

		assert.deepEqual(node.calledFunctions, ["Math.floor"]);
	});

	QUnit.test("Math.round implementation: A function with arguments (webgl)", function(assert) {
		// Math.round node
		const node = new GPU.WebGLFunctionNode(
			(function(a) {
				return Math.floor(a + 0.5 );
			}).toString(), { name: 'foo' }
		);

		assert.notEqual(node.getJsAST(), null, "AST fetch check");

		assert.equal(
			node.toString().replace(/\s+/g,' ').replace(/user_/g,''),
			"float foo(float a) { return floor((a+0.5)); }",
			"function conversion check"
		);

		assert.deepEqual(node.calledFunctions, ["floor"] );
	});

	QUnit.test("Math.round implementation: A function with arguments (webgl2)", function(assert) {
		// Math.round node
		const node = new GPU.WebGL2FunctionNode(
			(function(a) {
				return Math.floor(a + 0.5 );
			}).toString(), { name: 'foo' }
		);

		assert.notEqual(node.getJsAST(), null, "AST fetch check");

		assert.equal(
			node.toString().replace(/\s+/g,' ').replace(/user_/g,''),
			"float foo(float a) { return floor((a+0.5)); }",
			"function conversion check"
		);

		assert.deepEqual(node.calledFunctions, ["floor"] );
	});

	/// Test creation of function, that calls another function, with ARGS
	QUnit.test("Two arguments test (webgl)", function(assert){
		const node = new GPU.WebGLFunctionNode(
			(function(a,b) {
				return a+b;
			}).toString(), { name: 'add_together' }
		);

		assert.notEqual(node.getJsAST(), null, "AST fetch check");

		assert.equal(
			node.toString().replace(/\s+/g,' ').replace(/user_/g,''),
			"float add_together(float a, float b) { return (a+b); }",
			"function conversion check"
		);
	});

	QUnit.test("Two arguments test (webgl2)", function(assert){
		const node = new GPU.WebGL2FunctionNode(
			(function(a,b) {
				return a+b;
			}).toString(), { name: 'add_together' }
		);

		assert.notEqual(node.getJsAST(), null, "AST fetch check");

		assert.equal(
			node.toString().replace(/\s+/g,' ').replace(/user_/g,''),
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
		const node = new GPU.CPUFunctionNode(hello_world.toString());
		assert.notEqual(node, null, "class creation check");
		assert.equal(node.name, "hello_world");
	});

	QUnit.test("Automatic naming support (webgl)", function(assert) {
		function hello_world() {
			return 42;
		}
		// Create a function hello node
		const node = new GPU.WebGLFunctionNode(hello_world.toString());
		assert.notEqual(node, null, "class creation check");
		assert.equal(node.name, "hello_world");
	});

	QUnit.test("Automatic naming support (webgl2)", function(assert) {
		function hello_world() {
			return 42;
		}
		// Create a function hello node
		const node = new GPU.WebGL2FunctionNode(hello_world.toString());
		assert.notEqual(node, null, "class creation check");
		assert.equal(node.name, "hello_world");
	});
})();
