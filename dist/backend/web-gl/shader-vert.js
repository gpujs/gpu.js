"use strict";

module.exports = "#version 300 es\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\n\nin highp vec2 aPos;\nin highp vec2 aTexCoord;\n\nout highp vec2 vTexCoord;\nuniform vec2 ratio;\n\nvoid main(void) {\n  gl_Position = vec4((aPos + vec2(1)) * ratio + vec2(-1), 0, 1);\n  vTexCoord = aTexCoord;\n}";