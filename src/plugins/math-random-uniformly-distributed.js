const source = `
// https://www.shadertoy.com/view/4t2SDh
//note: uniformly distributed, normalized rand, [0;1[
mediump float random_seed_shift = 0.00001;
uniform mediump float random_seed1;
uniform mediump float random_seed2;
float nrand(vec2 n) {
  float result = fract(sin(dot(n.xy * vec2(random_seed1, random_seed_shift * random_seed2), vec2(12.9898, 78.233)))* 43758.5453);
  random_seed_shift = result;
  return result;
}`;

const name = 'math-random-uniformly-distributed';

const functionMatch = 'Math.random()';

const functionReplace = 'nrand(vTexCoord)';

const functionReturnType = 'Number';

const onBeforeRun = (kernel) => {
  kernel.setUniform1f('random_seed1', Math.random());
  kernel.setUniform1f('random_seed2', Math.random());
};

/**
 *
 * @type IPlugin
 */
module.exports = {
  name,
  onBeforeRun,
  functionMatch,
  functionReplace,
  functionReturnType,
  source
};