module.exports = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

in highp vec2 aPos;
in highp vec2 aTexCoord;

out highp vec2 vTexCoord;
uniform vec2 ratio;

void main(void) {
  gl_Position = vec4((aPos + vec2(1)) * ratio + vec2(-1), 0, 1);
  vTexCoord = aTexCoord;
}`;