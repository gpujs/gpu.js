module.exports = `precision highp float;
precision highp int;
precision highp sampler2D;

attribute highp vec2 aPos;
attribute highp vec2 aTexCoord;

varying highp vec2 vTexCoord;

void main(void) {
  gl_Position = vec4(aPos, 0, 1);
  vTexCoord = aTexCoord;
}`;