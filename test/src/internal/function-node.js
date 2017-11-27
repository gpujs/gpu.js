///
/// Test the various basic functionality of functionNode
///

/// Test the creation of a hello_world function
QUnit.test( "hello_world: just return magic 42", function( assert ) {
	assert.notEqual( GPU.CPUFunctionNode, null, "script include check" );
	
	// Create a function hello node
	var node = new GPU.WebGLFunctionNode(
		"hello_world",
		function() {
			return 42;
		}
	);

	assert.notEqual( node, null, "class creation check" );
	assert.notEqual( node.getJsAST(), null, "AST fetch check" );

	assert.equal(
		node.getFunctionString().replace(/\s+/g,' '),
		"float hello_world() { return 42.0; }",
		"webgl function conversion check"
	);
});

/// Test creation of function, that calls another function
QUnit.test( "hello_inner: call a function inside a function", function( assert ) {
	assert.notEqual( GPU.CPUFunctionNode, null, "script include check" );
	
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

	assert.notEqual( node, null, "class creation check" );
	assert.notEqual( node.getJsAST(), null, "AST fetch check" );

	assert.equal(
		node.getFunctionString().replace(/\s+/g,' '),
		"float hello_inner() { return inner(); }",
		"webgl function conversion check"
	);

	assert.deepEqual( node.calledFunctions, ["inner"] );
});

/// Test creation of function, that calls another function, with ARGS
QUnit.test( "Math.round implementation: A function with arguments", function( assert ) {
	// Math.round node
	var node = new GPU.WebGLFunctionNode(
		"round",
		function(a) {
			return Math.floor( a + 0.5 );
		}
	);

	assert.notEqual( node, null, "class creation check" );
	assert.notEqual( node.getJsAST(), null, "AST fetch check" );

	assert.equal(
		node.getFunctionString().replace(/\s+/g,' ').replace(/user_/g,''),
		"float round(float a) { return floor((a+0.5)); }",
		"webgl function conversion check"
	);

	assert.deepEqual( node.calledFunctions, ["floor"] );
});

/// Test creation of function, that calls another function, with ARGS
QUnit.test( "Two arguments test", function( assert ) {
	
	var node = new GPU.WebGLFunctionNode(
		"add_together",
		function(a,b) {
			return a+b;
		}
	);

	assert.notEqual( node, null, "class creation check" );
	assert.notEqual( node.getJsAST(), null, "AST fetch check" );

	assert.equal(
		node.getFunctionString().replace(/\s+/g,' ').replace(/user_/g,''),
		"float add_together(float a, float b) { return (a+b); }",
		"webgl function conversion check"
	);
});

/// Test the creation of a hello_world function
QUnit.test( "Automatic naming support", function( assert ) {
	assert.notEqual( GPU.CPUFunctionNode, null, "script include check" );
	
	function hello_world() {
		return 42;
	}
	// Create a function hello node
	var node = new GPU.CPUFunctionNode(null, hello_world);
	assert.notEqual( node, null, "class creation check" );
	assert.equal( node.functionName, "hello_world" );
});
