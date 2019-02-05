const source = `
// Gold Noise ©2015 dcerisano@standard3d.com 
//  - based on the Golden Ratio, PI and Square Root of Two
//  - superior distribution
//  - fastest noise generator function
//  - works with all chipsets (including low precision)

// precision lowp    float;

uniform highp float gold_noise_seed;
highp float gold_noise_PHI = 1.61803398874989484820459 * 00000.1; // Golden Ratio   
highp float gold_noise_PI  = 3.14159265358979323846264 * 00000.1; // PI
highp float gold_noise_SQ2 = 1.41421356237309504880169 * 10000.0; // Square Root of Two

float gold_noise_index = 0.0;
float gold_noise(vec2 coordinate){
  float result = fract(tan(distance(coordinate*((gold_noise_seed + gold_noise_index)+gold_noise_PHI), vec2(gold_noise_PHI, gold_noise_PI)))*gold_noise_SQ2);
  gold_noise_index = result * 10000.0;
  return result;
}`;

const name = 'random-gold-noise';

const functionMatch = 'Math.random()';

const functionReplace = 'gold_noise(vTexCoord)';

const functionReturnType = 'Number';

const onBeforeRun = (kernel) => {
	kernel.setUniform1f('gold_noise_seed', Math.random() * 10000);
};

module.exports = {
	name,
	onBeforeRun,
	functionMatch,
	functionReplace,
	functionReturnType,
	source
};
