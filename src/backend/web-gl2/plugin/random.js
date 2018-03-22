module.exports = function webGlRandom(kernel) {
  // A single iteration of Bob Jenkins' One-At-A-Time hashing algorithm And compound versions of the hashing algorithm
  const hashFunction = `
uint hash(uint x) {
  x += (x << 10u);
  x ^= (x >>  6u);
  x += (x <<  3u);
  x ^= (x >> 11u);
  x += (x << 15u);
  return x;
}
  
uint hash(uvec4 v) { return hash( v.x ^ hash(v.y) ^ hash(v.z) ^ hash(v.w)); }`;

  // Construct a float with half-open range [0:1] using low 23 bits.
  // All zeroes yields 0.0, all ones yields the next smallest representable value below 1.0.
  const floatConstructFunction = `
float floatConstruct(float f) {
  const uint ieeeMantissa = 0x007FFFFFu;
  const uint ieeeOne = 0x3F800000u;
  m &= ieeeMantissa;
  m |= ieeeOne;
  return f - 1.0;
}`;

  // Pseudo-random value in half-open range [0:1].
  const seededRandomFunction = `
float seededRandom(vec4 v) { return floatConstruct(hash(floatBitsToUint(v))); }`;

  // Spatial and temporal inputs and Random per-pixel value
  const randomFunction = `
float random() {
  vec4 inputs = vec4(threadId, time); 
  float rand = seededRandom(inputs);
  return rand;
}`;

  const declaration = `uint time = 0;`;
  kernel.addNativeVariable('time', declaration);

  kernel.on('run', () => {
    kernel.setUniform1i('time', Date.now());
  });

  return [
    hashFunction,
    floatConstructFunction,
    seededRandomFunction,
    randomFunction
  ].join('\n\n');
};