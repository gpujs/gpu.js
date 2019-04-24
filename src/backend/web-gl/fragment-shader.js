const fragmentShader = `__HEADER__;
precision highp float;
precision highp int;
precision highp sampler2D;

const int LOOP_MAX = __LOOP_MAX__;

__PLUGINS__;
__CONSTANTS__;

varying vec2 vTexCoord;

vec4 round(vec4 x) {
  return floor(x + 0.5);
}

float round(float x) {
  return floor(x + 0.5);
}

vec2 integerMod(vec2 x, float y) {
  vec2 res = floor(mod(x, y));
  return res * step(1.0 - floor(y), -res);
}

vec3 integerMod(vec3 x, float y) {
  vec3 res = floor(mod(x, y));
  return res * step(1.0 - floor(y), -res);
}

vec4 integerMod(vec4 x, vec4 y) {
  vec4 res = floor(mod(x, y));
  return res * step(1.0 - floor(y), -res);
}

float integerMod(float x, float y) {
  float res = floor(mod(x, y));
  return res * (res > floor(y) - 1.0 ? 0.0 : 1.0);
}

int integerMod(int x, int y) {
  return x - (y * int(x / y));
}

__DIVIDE_WITH_INTEGER_CHECK__;

// Here be dragons!
// DO NOT OPTIMIZE THIS CODE
// YOU WILL BREAK SOMETHING ON SOMEBODY\'S MACHINE
// LEAVE IT AS IT IS, LEST YOU WASTE YOUR OWN TIME
const vec2 MAGIC_VEC = vec2(1.0, -256.0);
const vec4 SCALE_FACTOR = vec4(1.0, 256.0, 65536.0, 0.0);
const vec4 SCALE_FACTOR_INV = vec4(1.0, 0.00390625, 0.0000152587890625, 0.0); // 1, 1/256, 1/65536
float decode32(vec4 texel) {
  __DECODE32_ENDIANNESS__;
  texel *= 255.0;
  vec2 gte128;
  gte128.x = texel.b >= 128.0 ? 1.0 : 0.0;
  gte128.y = texel.a >= 128.0 ? 1.0 : 0.0;
  float exponent = 2.0 * texel.a - 127.0 + dot(gte128, MAGIC_VEC);
  float res = exp2(round(exponent));
  texel.b = texel.b - 128.0 * gte128.x;
  res = dot(texel, SCALE_FACTOR) * exp2(round(exponent-23.0)) + res;
  res *= gte128.y * -2.0 + 1.0;
  return res;
}

float decode16(vec4 texel, int index) {
	int channel = integerMod(index, 2);
	if (channel == 0) return texel.r * 255.0 + texel.g * 65280.0;
	if (channel == 1) return texel.b * 255.0 + texel.a * 65280.0;
	return 0.0;
}

float decode8(vec4 texel, int index) {
  int channel = integerMod(index, 4);
  if (channel == 0) return texel.r * 255.0;
  if (channel == 1) return texel.g * 255.0;
  if (channel == 2) return texel.b * 255.0;
  if (channel == 3) return texel.a * 255.0;
  return 0.0;
}

vec4 encode32(float f) {
  float F = abs(f);
  float sign = f < 0.0 ? 1.0 : 0.0;
  float exponent = floor(log2(F));
  float mantissa = (exp2(-exponent) * F);
  // exponent += floor(log2(mantissa));
  vec4 texel = vec4(F * exp2(23.0-exponent)) * SCALE_FACTOR_INV;
  texel.rg = integerMod(texel.rg, 256.0);
  texel.b = integerMod(texel.b, 128.0);
  texel.a = exponent*0.5 + 63.5;
  texel.ba += vec2(integerMod(exponent+127.0, 2.0), sign) * 128.0;
  texel = floor(texel);
  texel *= 0.003921569; // 1/255
  __ENCODE32_ENDIANNESS__;
  return texel;
}
// Dragons end here

int index;
ivec3 threadId;

ivec3 indexTo3D(int idx, ivec3 texDim) {
  int z = int(idx / (texDim.x * texDim.y));
  idx -= z * int(texDim.x * texDim.y);
  int y = int(idx / texDim.x);
  int x = int(integerMod(idx, texDim.x));
  return ivec3(x, y, z);
}

float get32(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  ivec3 xyz = ivec3(x, y, z);
  int index = xyz.x + texDim.x * (xyz.y + texDim.y * xyz.z);
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture2D(tex, st / vec2(texSize));
  return decode32(texel);
}

float get16(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  ivec3 xyz = ivec3(x, y, z);
  int index = xyz.x + texDim.x * (xyz.y + texDim.y * xyz.z);
  int w = texSize.x * 2;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture2D(tex, st / vec2(texSize.x * 2, texSize.y));
  return decode16(texel, index);
}

float get8(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  ivec3 xyz = ivec3(x, y, z);
  int index = xyz.x + texDim.x * (xyz.y + texDim.y * xyz.z);
  int w = texSize.x * 4;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture2D(tex, st / vec2(texSize.x * 4, texSize.y));
  return decode8(texel, index);
}

float getMemoryOptimized32(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  ivec3 xyz = ivec3(x, y, z);
  int index = xyz.x + texDim.x * (xyz.y + texDim.y * xyz.z);
  int channel = integerMod(index, 4);
  index = index / 4;
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture2D(tex, st / vec2(texSize));
  if (channel == 0) return texel.r;
  if (channel == 1) return texel.g;
  if (channel == 2) return texel.b;
  if (channel == 3) return texel.a;
  return 0.0;
}

vec4 getImage2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  ivec3 xyz = ivec3(x, y, z);
  int index = xyz.x + texDim.x * (xyz.y + texDim.y * xyz.z);
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  return texture2D(tex, st / vec2(texSize));
}

float getFloatFromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  vec4 result = getImage2D(tex, texSize, texDim, z, y, x);
  return result[0];
}

vec2 getVec2FromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  vec4 result = getImage2D(tex, texSize, texDim, z, y, x);
  return vec2(result[0], result[1]);
}

vec3 getVec3FromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  vec4 result = getImage2D(tex, texSize, texDim, z, y, x);
  return vec3(result[0], result[1], result[2]);
}

vec4 getVec4FromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  return getImage2D(tex, texSize, texDim, z, y, x);
}

vec4 actualColor;
void color(float r, float g, float b, float a) {
  actualColor = vec4(r,g,b,a);
}

void color(float r, float g, float b) {
  color(r,g,b,1.0);
}

void color(sampler2D image) {
  actualColor = texture2D(image, vTexCoord);
}

__MAIN_CONSTANTS__;
__MAIN_ARGUMENTS__;
__KERNEL__;

void main(void) {
  index = int(vTexCoord.s * float(uTexSize.x)) + int(vTexCoord.t * float(uTexSize.y)) * uTexSize.x;
  __MAIN_RESULT__;
}`;

module.exports = {
	fragmentShader
};