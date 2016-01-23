GPU = {};

var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
var ARGUMENT_NAMES = /([^\s,]+)/g;
function getParamNames(func) {
    var fnStr = func.toString().replace(STRIP_COMMENTS, '');
    var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    if(result === null)
        result = [];
    return result;
}

GPU.makeKernel = function(kernel, _threadDim, _blockDim) {
    var threadDim = new Array(_threadDim);
    var blockDim = new Array(_blockDim);
    
    while (threadDim.length < 3) {
        threadDim.push(1);
    }
    
    while (blockDim.length < 3) {
        blockDim.push(1);
    }
    
    var globalDim = [
        threadDim[0] * blockDim[0],
        threadDim[1] * blockDim[1],
        threadDim[2] * blockDim[2]
    ];
    
    return function() {
        var ret = new Array(globalDim[2]);
        for (var i=0; i<globalDim[2]; i++) {
            ret[i] = new Array(globalDim[1]);
            for (var j=0; j<globalDim[1]; j++) {
                ret[i][j] = new Array(globalDim[0]);
            }
        }
        
        var ctx = {
            thread: {
                x: 0,
                y: 0,
                z: 0
            },
            block: {
                x: 0,
                y: 0,
                z: 0
            }
        };
        
        var argNames = getParamNames(arguments.callee);
        
        for (ctx.block.z=0; ctx.block.z<blockDim[2]; ctx.block.z++) {
            for (ctx.block.y=0; ctx.block.y<blockDim[1]; ctx.block.y++) {
                for (ctx.block.x=0; ctx.block.x<blockDim[0]; ctx.block.x++) {
                    for (ctx.thread.z=0; ctx.thread.z<threadDim[2]; ctx.thread.z++) {
                        for (ctx.thread.y=0; ctx.thread.y<threadDim[1]; ctx.thread.y++) {
                            for (ctx.thread.x=0; ctx.thread.x<threadDim[0]; ctx.thread.x++) {
                                globalX = ctx.thread.x + ctx.block.x * blockDim[0];
                                globalY = ctx.thread.y + ctx.block.y * blockDim[1];
                                globalZ = ctx.thread.z + ctx.block.z * blockDim[2];
                                
                                ret[globalZ][globalY][globalX] = kernel.apply(ctx, arguments);
                            }
                        }
                    }
                }
            }
        }
        
        if (_threadDim.length == 1) {
            ret = ret[0][0];
        } else if (_threadDim.length == 2) {
            ret = ret[0];
        }
        
        return ret;
    }
};
