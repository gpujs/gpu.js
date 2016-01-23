var threadDim = [3];
var blockDim = [1];

var f = GPU.makeKernel(function(ctx, a, b) {
    var ret = a[ctx.thread.x] + b[ctx.thread.x];
    return ret;
}, threadDim, blockDim);


var a = [1, 2, 3];
var b = [4, 5, 6];

var c = f(a, b);
// c = [5, 7, 9];
