(function() {
	// these 2 should be erquivilent
	createNestedKernel = function(mode) {
		var gpu = new GPU({ mode });

		var broken = gpu.createKernel(function(input, lookup) {
			return lookup[input[this.thread.x]];
		}).setOutput([1]);
		return broken;
	}

	createTempVarKernel = function(mode) {
		var gpu = new GPU({ mode });
		var working = gpu.createKernel(function(input, lookup) {
			var idx = input[this.thread.x];
			return lookup[idx];
		}).setOutput([1]);
		return working;
	}
	
	QUnit.test('Issue #300 nested array index - auto', () => {
		QUnit.assert.equal(createNestedKernel()([2], [7, 13, 19, 23])[0], 19);
		QUnit.assert.equal(createTempVarKernel()([2], [7, 13, 19, 23])[0], 19);
	});

	QUnit.test('Issue #300 nested array index - gpu', () => {
		QUnit.assert.equal(createNestedKernel('gpu')([2], [7, 13, 19, 23])[0], 19);
		QUnit.assert.equal(createTempVarKernel('gpu')([2], [7, 13, 19, 23])[0], 19);
	});

	QUnit.test('Issue #300 nested array index - webgl', () => {
		QUnit.assert.equal(createNestedKernel('webgl')([2], [7, 13, 19, 23])[0], 19);
		QUnit.assert.equal(createTempVarKernel('webgl')([2], [7, 13, 19, 23])[0], 19);
	});

	QUnit.test('Issue #300 nested array index - webgl2', () => {
		QUnit.assert.equal(createNestedKernel('webgl2')([2], [7, 13, 19, 23])[0], 19);
		QUnit.assert.equal(createTempVarKernel('webgl2')([2], [7, 13, 19, 23])[0], 19);
	});
	
  })();