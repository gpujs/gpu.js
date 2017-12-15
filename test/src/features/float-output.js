QUnit.test( "floatOutput (GPU only)", function() {
    var lst = [1, 2, 3, 4, 5, 6, 7];

    var gpu = new GPU({ mode: 'gpu' });

    var kernel = gpu.createKernel(function(lst) {
        return lst[this.thread.x];
    })
        .setFloatOutput(true)
        .setOutput([lst.length]);

    var result = kernel(lst);

    QUnit.assert.deepEqual(QUnit.extend([], result), lst);
});
