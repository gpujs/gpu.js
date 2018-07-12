module.exports = `__HEADER__;
precision highp float;
precision highp int;
precision highp sampler2D;

const float LOOP_MAX = __LOOP_MAX__;
#define EPSILON 0.0000001;

__CONSTANTS__;

varying highp vec2 vTexCoord;

vec4 round(vec4 x) {
  return floor(x + 0.5);
}

highp float round(highp float x) {
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

highp float integerMod(highp float x, highp float y) {
  highp float res = floor(mod(x, y));
  return res * (res > floor(y) - 1.0 ? 0.0 : 1.0);
}

highp int integerMod(highp int x, highp int y) {
  return x - (y * int(x/y));
}

// Here be dragons!
// DO NOT OPTIMIZE THIS CODE
// YOU WILL BREAK SOMETHING ON SOMEBODY\'S MACHINE
// LEAVE IT AS IT IS, LEST YOU WASTE YOUR OWN TIME
const vec2 MAGIC_VEC = vec2(1.0, -256.0);
const vec4 SCALE_FACTOR = vec4(1.0, 256.0, 65536.0, 0.0);
const vec4 SCALE_FACTOR_INV = vec4(1.0, 0.00390625, 0.0000152587890625, 0.0); // 1, 1/256, 1/65536
highp float decode32(highp vec4 rgba) {
  __DECODE32_ENDIANNESS__;
  rgba *= 255.0;
  vec2 gte128;
  gte128.x = rgba.b >= 128.0 ? 1.0 : 0.0;
  gte128.y = rgba.a >= 128.0 ? 1.0 : 0.0;
  float exponent = 2.0 * rgba.a - 127.0 + dot(gte128, MAGIC_VEC);
  float res = exp2(round(exponent));
  rgba.b = rgba.b - 128.0 * gte128.x;
  res = dot(rgba, SCALE_FACTOR) * exp2(round(exponent-23.0)) + res;
  res *= gte128.y * -2.0 + 1.0;
  return res;
}

highp vec4 encode32(highp float f) {
  highp float F = abs(f);
  highp float sign = f < 0.0 ? 1.0 : 0.0;
  highp float exponent = floor(log2(F));
  highp float mantissa = (exp2(-exponent) * F);
  // exponent += floor(log2(mantissa));
  vec4 rgba = vec4(F * exp2(23.0-exponent)) * SCALE_FACTOR_INV;
  rgba.rg = integerMod(rgba.rg, 256.0);
  rgba.b = integerMod(rgba.b, 128.0);
  rgba.a = exponent*0.5 + 63.5;
  rgba.ba += vec2(integerMod(exponent+127.0, 2.0), sign) * 128.0;
  rgba = floor(rgba);
  rgba *= 0.003921569; // 1/255
  __ENCODE32_ENDIANNESS__;
  return rgba;
}
// Dragons end here

highp int index;
highp ivec3 threadId;

highp ivec3 indexTo3D(highp int idx, highp ivec3 texDim) {
  highp int z = int(idx / (texDim.x * texDim.y));
  idx -= z * int(texDim.x * texDim.y);
  highp int y = int(idx / texDim.x);
  highp int x = int(integerMod(idx, texDim.x));
  return ivec3(x, y, z);
}

highp float get(highp sampler2D tex, highp ivec2 texSize, highp ivec3 texDim, highp int z, highp int y, highp int x) {
  highp ivec3 xyz = ivec3(x, y, z);
  __GET_WRAPAROUND__;
  highp int index = xyz.x + texDim.x * (xyz.y + texDim.y * xyz.z);
  __GET_TEXTURE_CHANNEL__;
  highp int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  __GET_TEXTURE_INDEX__;
  highp vec4 texel = texture2D(tex, st / vec2(texSize));
  __GET_RESULT__;
  
}

highp vec4 getImage2D(highp sampler2D tex, highp ivec2 texSize, highp ivec3 texDim, highp int z, highp int y, highp int x) {
  highp ivec3 xyz = ivec3(x, y, z);
  __GET_WRAPAROUND__;
  highp int index = xyz.x + texDim.x * (xyz.y + texDim.y * xyz.z);
  __GET_TEXTURE_CHANNEL__;
  highp int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  __GET_TEXTURE_INDEX__;
  return texture2D(tex, st / vec2(texSize));
}

highp float get(highp sampler2D tex, highp ivec2 texSize, highp ivec3 texDim, highp int y, highp int x) {
  return get(tex, texSize, texDim, int(0), y, x);
}

highp vec4 getImage2D(highp sampler2D tex, highp ivec2 texSize, highp ivec3 texDim, highp int y, highp int x) {
  return getImage2D(tex, texSize, texDim, int(0), y, x);
}

highp float get(highp sampler2D tex, highp ivec2 texSize, highp ivec3 texDim, highp int x) {
  return get(tex, texSize, texDim, int(0), int(0), x);
}

highp vec4 getImage2D(highp sampler2D tex, highp ivec2 texSize, highp ivec3 texDim, highp int x) {
  return getImage2D(tex, texSize, texDim, int(0), int(0), x);
}


highp vec4 actualColor;
void color(float r, float g, float b, float a) {
  actualColor = vec4(r,g,b,a);
}

void color(float r, float g, float b) {
  color(r,g,b,1.0);
}

void color(sampler2D image) {
  actualColor = texture2D(image, vTexCoord);
}

__MAIN_PARAMS__;
__MAIN_CONSTANTS__;
__KERNEL__;

void main(void) {
  index = int(vTexCoord.s * float(uTexSize.x)) + int(vTexCoord.t * float(uTexSize.y)) * uTexSize.x;
  __MAIN_RESULT__;
}`;