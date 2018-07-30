(function() {
	var DATA_MAX = 1024;
	var uint8data = new Uint8Array(DATA_MAX);
	var uint16data = new Uint16Array(DATA_MAX);
	
	for (var i = 0; i < DATA_MAX; i++) {
		uint8data[i] = Math.random() * 255;
		uint16data[i] = Math.random() * 255 * 255;
	}
	var gpu;
	function buildUintArrayInputKernel(mode, data) {
		gpu = new GPU({ mode });
		var largeArrayAddressKernel = gpu.createKernel(function(data) {
			return data[this.thread.x];
		})
			.setOutput([DATA_MAX]);
		return largeArrayAddressKernel(data);
	}
	
	QUnit.test('Issue #346 uint8 input array - webgl', () => {
		var result = buildUintArrayInputKernel('webgl', uint8data)
		var same = true;
		for (var i = 0; i < DATA_MAX; i++) {
			if (result[i] !== uint8data[i]) {
				same = false;
				break;
			}
		}
		QUnit.assert.ok(same, "not all elements are the same, failed on index:" + i);
		gpu.destroy();
	});

	QUnit.test('Issue #346 uint8 input array - webgl2', () => {
		var result = buildUintArrayInputKernel('webgl2', uint8data)
		var same = true;
		for (var i = 0; i < DATA_MAX; i++) {
			if (result[i] !== uint8data[i]) {
				same = false;
				break;
			}
		}
		QUnit.assert.ok(same, "not all elements are the same, failed on index:" + i);
		gpu.destroy();
	});

	QUnit.test('Issue #346 uint16 input array - webgl', () => {
		var result = buildUintArrayInputKernel('webgl', uint16data)
		var same = true;
		for (var i = 0; i < DATA_MAX; i++) {
			if (result[i] !== uint16data[i]) {
				same = false;
				break;
			}
		}
		QUnit.assert.ok(same, "not all elements are the same, failed on index:" + i);
		gpu.destroy();
	});

	QUnit.test('Issue #346 uint16 input array - webgl2', () => {
		var result = buildUintArrayInputKernel('webgl2', uint16data)
		var same = true;
		for (var i = 0; i < DATA_MAX; i++) {
			if (result[i] !== uint16data[i]) {
				same = false;
				break;
			}
		}
		QUnit.assert.ok(same, "not all elements are the same, failed on index:" + i);
		gpu.destroy();
	});
	
  })();