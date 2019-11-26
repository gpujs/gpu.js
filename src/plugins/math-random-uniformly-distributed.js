// language=GLSL
const source = `// https://www.shadertoy.com/view/4t2SDh
//note: uniformly distributed, normalized rand, [0,1]
highp float randomSeedShift = 1.0;
highp float slide = 1.0;
uniform highp float randomSeed1;
uniform highp float randomSeed2;

highp float nrand(highp vec2 n) {
  highp float result = fract(sin(dot((n.xy + 1.0) * vec2(randomSeed1 * slide, randomSeed2 * randomSeedShift), vec2(12.9898, 78.233))) * 43758.5453);
  randomSeedShift = result;
  if (randomSeedShift > 0.5) {
    slide += 0.00009; 
  } else {
    slide += 0.0009;
  }
  return result;
}`;

const name = 'math-random-uniformly-distributed';

// language=JavaScript
const functionMatch = `Math.random()`;

const functionReplace = `nrand(vTexCoord)`;

const functionReturnType = 'Number';
/**
 *
 * @param {Kernel} kernel
 */
const onBeforeRun = (kernel) => {
  kernel.setUniform1f('randomSeed1', Math.random());
  kernel.setUniform1f('randomSeed2', Math.random());
};

/**
 *
 * @type IPlugin
 */
const plugin = {
  name,
  onBeforeRun,
  functionMatch,
  functionReplace,
  functionReturnType,
  source
};

module.exports = plugin;