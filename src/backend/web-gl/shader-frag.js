module.exports = `__HEADER__;
precision highp float;
precision highp int;
precision highp sampler2D;

const float LOOP_MAX = __LOOP_MAX__;

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
float decode32(vec4 rgba) {
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

vec4 encode32(float f) {
  float F = abs(f);
  float sign = f < 0.0 ? 1.0 : 0.0;
  float exponent = floor(log2(F));
  float mantissa = (exp2(-exponent) * F);
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

float decode(vec4 rgba, int x, int bitRatio) {
  if (bitRatio == 1) {
    return decode32(rgba);
  }
  __DECODE32_ENDIANNESS__;
  int channel = integerMod(x, bitRatio);
  if (bitRatio == 4) {
    if (channel == 0) return rgba.r * 255.0;
    if (channel == 1) return rgba.g * 255.0;
    if (channel == 2) return rgba.b * 255.0;
    if (channel == 3) return rgba.a * 255.0;
  }
  else {
    if (channel == 0) return rgba.r * 255.0 + rgba.g * 65280.0;
    if (channel == 1) return rgba.b * 255.0 + rgba.a * 65280.0;
  }
}

int index;
ivec3 threadId;

ivec3 indexTo3D(int idx, ivec3 texDim) {
  int z = int(idx / (texDim.x * texDim.y));
  idx -= z * int(texDim.x * texDim.y);
  int y = int(idx / texDim.x);
  int x = int(integerMod(idx, texDim.x));
  return ivec3(x, y, z);
}

float get(sampler2D tex, ivec2 texSize, ivec3 texDim, int bitRatio,  int z, int y, int x) {
  ivec3 xyz = ivec3(x, y, z);
  __GET_WRAPAROUND__;
  int index = xyz.x + texDim.x * (xyz.y + texDim.y * xyz.z);
  __GET_TEXTURE_CHANNEL__;
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  __GET_TEXTURE_INDEX__;
  vec4 texel = texture2D(tex, st / vec2(texSize));
  __GET_RESULT__;
  
}

vec4 getImage2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  ivec3 xyz = ivec3(x, y, z);
  __GET_WRAPAROUND__;
  int index = xyz.x + texDim.x * (xyz.y + texDim.y * xyz.z);
  __GET_TEXTURE_CHANNEL__;
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  __GET_TEXTURE_INDEX__;
  return texture2D(tex, st / vec2(texSize));
}

float get(sampler2D tex, ivec2 texSize, ivec3 texDim, int bitRatio, int y, int x) {
  return get(tex, texSize, texDim, bitRatio, int(0), y, x);
}

vec4 getImage2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int y, int x) {
  return getImage2D(tex, texSize, texDim, int(0), y, x);
}

float get(sampler2D tex, ivec2 texSize, ivec3 texDim, int bitRatio, int x) {
  return get(tex, texSize, texDim, bitRatio, int(0), int(0), x);
}

vec4 getImage2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int x) {
  return getImage2D(tex, texSize, texDim, int(0), int(0), x);
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

__MAIN_PARAMS__;
__MAIN_CONSTANTS__;
__KERNEL__;

void main(void) {
  index = int(vTexCoord.s * float(uTexSize.x)) + int(vTexCoord.t * float(uTexSize.y)) * uTexSize.x;
  __MAIN_RESULT__;
}`;