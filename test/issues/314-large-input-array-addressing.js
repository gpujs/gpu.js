(function() {
	// max size of ok addressing = 8388608, 8388609 is shifted by 1 so index seems to be 8388610
	// after this fix max addressing is 2^24 which is the max a float32 can handle
	// question is, why cant we use int32? so 2^32 addressing...
	var DATA_MAX = 8388800;
	var divisor = 100;
	var data = new Uint8Array(DATA_MAX);
	
	for (var i = 0; i < DATA_MAX/divisor; i++) {
		for (var j = 0; j < divisor; j++) {
			data[i*divisor + j] = j;
		}
	}

	function buildLargeArrayAddressKernel(mode) {
		var gpu = new GPU({ mode });
		var largeArrayAddressKernel = gpu.createKernel(function(data1) {
			return data1[this.thread.x];
			// return this.thread.x;
		})
			.setOutput([DATA_MAX]);
		return largeArrayAddressKernel(data);
	}
	
	QUnit.test('Issue #314 Large array addressing - auto', () => {
		QUnit.assert.equal(buildLargeArrayAddressKernel()[DATA_MAX-1], data[DATA_MAX-1]);
	});

	QUnit.test('Issue #314 Large array addressing - gpu', () => {
		QUnit.assert.equal(buildLargeArrayAddressKernel('gpu')[DATA_MAX-1], data[DATA_MAX-1]);
	});

	QUnit.test('Issue #314 Large array addressing - webgl', () => {
		QUnit.assert.equal(buildLargeArrayAddressKernel('webgl')[DATA_MAX-1], data[DATA_MAX-1]);
	});

	QUnit.test('Issue #314 Large array addressing - webgl2', () => {
		var result = buildLargeArrayAddressKernel('webgl2')
		var same = true;
		for (var i = 0; i < DATA_MAX; i++) {
			if (!result[i] == data[i]) {
				same = false;
				break;
			}
		}
		QUnit.assert.ok(same, "not all elements are the same, failed on index:" + i);
	});
	
  })();