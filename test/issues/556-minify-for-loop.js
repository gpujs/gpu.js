const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU, WebGLFunctionNode } = require('../../src');

describe('issue #556 - minify for loop');

const source = 'function w(t,e){for(var r=0,i=0;i<this.constants.size;i++)r+=t[this.thread.y][i]*e[i][this.thread.x];return r}';

function testWebGLFunctionNode() {
  const node = new WebGLFunctionNode(
    source,
    {
      constantTypes: {
        size: 'Number',
      },
      output: [1],
      argumentNames: ['t', 'e'],
      argumentTypes: ['Array', 'Array'],
      lookupFunctionArgumentBitRatio: () => 4,
      returnType: 'Number'
    });

  assert.equal(node.toString(), `float w(sampler2D user_t,ivec2 user_tSize,ivec3 user_tDim, sampler2D user_e,ivec2 user_eSize,ivec3 user_eDim) {
float user_r=0.0,user_i=0.0;
for (int safeI=0;safeI<LOOP_MAX;safeI++){
if (!(user_i<constants_size)) break;
user_r+=(get32(user_t, user_tSize, user_tDim, 0, threadId.y, int(user_i))*get32(user_e, user_eSize, user_eDim, 0, int(user_i), threadId.x));
user_i++;}

return user_r;
}`);
}

test('WebGLFunctionNode', () => {
  testWebGLFunctionNode();
});

function testKernel(mode) {
  const gpu = new GPU({ mode });
  const kernel = gpu.createKernel(source, {
    output: [1, 1],
    constants: {
      size: 1
    }
  });
  const result = kernel([[1]], [[1]]);
  assert.deepEqual(result, [new Float32Array([1])]);

}

test('kernel auto', () => {
  testKernel();
});

test('kernel gpu', () => {
  testKernel('gpu');
});

(GPU.isWebGLSupported ? test : skip)('kernel webgl', () => {
  testKernel('webgl');
});

(GPU.isWebGL2Supported ? test : skip)('kernel webgl2', () => {
  testKernel('webgl2');
});

(GPU.isHeadlessGLSupported ? test : skip)('kernel headlessgl', () => {
  testKernel('headlessgl');
});

test('kernel cpu', () => {
  testKernel('cpu');
});