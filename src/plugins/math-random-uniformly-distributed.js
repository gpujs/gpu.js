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
 * mulberry32, a fast counter-based PRNG with good distribution
 * @param {Number} seed
 * @returns {Function}
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 *
 * @param {Kernel} kernel
 */
const onBeforeRun = (kernel) => {
  if (kernel.randomSeed === null || kernel.randomSeed === undefined) {
    kernel.setUniform1f('randomSeed1', Math.random());
    kernel.setUniform1f('randomSeed2', Math.random());
    return;
  }
  // a set randomSeed makes runs reproducible: the seed starts a deterministic
  // stream, and each run draws the next two values from it
  if (!kernel._mathRandomGenerator || kernel._mathRandomGeneratorSeed !== kernel.randomSeed) {
    kernel._mathRandomGenerator = mulberry32(kernel.randomSeed);
    kernel._mathRandomGeneratorSeed = kernel.randomSeed;
  }
  kernel.setUniform1f('randomSeed1', kernel._mathRandomGenerator());
  kernel.setUniform1f('randomSeed2', kernel._mathRandomGenerator());
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