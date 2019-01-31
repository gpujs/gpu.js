const source = `
// Gold Noise ©2015 dcerisano@standard3d.com 
//  - based on the Golden Ratio, PI and Square Root of Two
//  - superior distribution
//  - fastest noise generator function
//  - works with all chipsets (including low precision)

// precision lowp    float;

uniform lowp float seed;
lowp float gold_noise_PHI = 1.61803398874989484820459 * 00000.1; // Golden Ratio   
lowp float gold_noise_PI  = 3.14159265358979323846264 * 00000.1; // PI
lowp float gold_noise_SQ2 = 1.41421356237309504880169 * 10000.0; // Square Root of Two

float gold_noise_index = 0.0;
float gold_noise(in vec2 coordinate, in lowp float seed){
  gold_noise_index += .0001;
  return fract(tan(distance(coordinate*((seed + gold_noise_index)+gold_noise_PHI), vec2(gold_noise_PHI, gold_noise_PI)))*gold_noise_SQ2);
}`;

const name = 'random-gold-noise';

const functionMatch = 'Math.random()';

const functionReplace = 'gold_noise(vTexCoord, seed)';

const functionReturnType = 'Number';

const onBeforeRun = (kernel) => {
	kernel.setUniform1f('seed', Math.random());
};

module.exports = {
	name,
	onBeforeRun,
	functionMatch,
	functionReplace,
	functionReturnType,
	source
};