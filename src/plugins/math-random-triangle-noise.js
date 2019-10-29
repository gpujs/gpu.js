const source = `
uniform highp float triangle_noise_seed;
highp float triangle_noise_shift = 0.000001;

//https://www.shadertoy.com/view/4t2SDh
//note: uniformly distributed, normalized rand, [0;1[
float nrand( vec2 n )
{
  return fract(sin(dot(n.xy, vec2(12.9898, 78.233)))* 43758.5453);
}
//note: remaps v to [0;1] in interval [a;b]
float remap( float a, float b, float v )
{
  return clamp( (v-a) / (b-a), 0.0, 1.0 );
}

float n4rand( vec2 n )
{
  float t = fract( triangle_noise_seed + triangle_noise_shift );
  float nrnd0 = nrand( n + 0.07*t );
  float nrnd1 = nrand( n + 0.11*t );
  float nrnd2 = nrand( n + 0.13*t );
  float nrnd3 = nrand( n + 0.17*t );
  float result = (nrnd0+nrnd1+nrnd2+nrnd3) / 4.0;
  triangle_noise_shift = result + 0.000001;
  return result;
}`;

const name = 'math-random-triangle-noise-noise';

const functionMatch = 'Math.random()';

const functionReplace = 'nrand(vTexCoord)';

const functionReturnType = 'Number';

const onBeforeRun = (kernel) => {
  kernel.setUniform1f('triangle_noise_seed', Math.random());
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