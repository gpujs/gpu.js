  const createContext = require('gl');

  function main () {
    // Create context
    var width = 6;
    var height = 1;
    var gl = createContext(width, height);

    var vertexSrc = `precision highp float;
    precision highp int;
    precision highp sampler2D;
    
    attribute vec2 aPos;
    attribute vec2 aTexCoord;
    
    varying vec2 vTexCoord;
    uniform vec2 ratio;
    
    void main(void) {
      gl_Position = vec4((aPos + vec2(1)) * ratio + vec2(-1), 0, 1);
      vTexCoord = aTexCoord;
    }
  `;


    var fragmentSrc = `
    precision highp float;
    precision highp int;
    precision highp sampler2D;
  
    uniform ivec3 uOutputDim;
    uniform ivec2 uTexSize;
    varying vec2 vTexCoord;
    
    const vec4 SCALE_FACTOR_INV = vec4(1.0, 0.00390625, 0.0000152587890625, 0.0); // 1, 1/256, 1/65536
    vec2 integerMod(vec2 x, float y) {
      vec2 res = floor(mod(x, y));
      return res * step(1.0 - floor(y), -res);
    }
    
    float integerMod(float x, float y) {
      float res = floor(mod(x, y));
      return res * (res > floor(y) - 1.0 ? 0.0 : 1.0);
    }
    
    int integerMod(int x, int y) {
      return x - (y * int(x / y));
    }
    
    vec4 encode32(float f) {
      float F = abs(f);
      float sign = f < 0.0 ? 1.0 : 0.0;
      float exponent = floor(log2(F));
      float mantissa = (exp2(-exponent) * F);
      vec4 rgba = vec4(F * exp2(23.0-exponent)) * SCALE_FACTOR_INV;
      rgba.rg = integerMod(rgba.rg, 256.0);
      rgba.b = integerMod(rgba.b, 128.0);
      rgba.a = exponent*0.5 + 63.5;
      rgba.ba += vec2(integerMod(exponent+127.0, 2.0), sign) * 128.0;
      rgba = floor(rgba);
      rgba *= 0.003921569; // 1/255
      return rgba;
    }
  
    // working
    /*
    const int constants_width = 6;
    float customFn() {
      float user_sum=0.0;
      for (int user_i=0;(user_i<constants_width);user_i++){
        user_sum+=1.0;
      }
  
      return user_sum;
    }
    */
    
    // not working
    const float constants_width = 6.0;
    float customFn() {
      float user_sum = 0.0;
      for (float user_i = 0.0; user_i < constants_width; user_i++) {
        user_sum++;
      }
  
      return user_sum;
    }
    
    void main()
    {
      gl_FragColor = encode32(customFn());
    }
    `;

    // setup a GLSL program
    var program = createProgramFromSources(gl, [vertexSrc, fragmentSrc]);

    if (!program) {
      return;
    }
    gl.useProgram(program);

    const texSize = Int32Array.from([2,3]);
    const threadDim = Int32Array.from([6,1,1]);
    gl.enable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, texSize[0], texSize[1]);

    const framebuffer = gl.createFramebuffer();
    framebuffer.width = texSize[0];
    framebuffer.height = texSize[1];

    const vertices = new Float32Array([-1, -1,
      1, -1, -1, 1,
      1, 1
    ]);
    const texCoords = new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      1, 1
    ]);

    const texCoordOffset = vertices.byteLength;

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    gl.bufferData(gl.ARRAY_BUFFER, vertices.byteLength + texCoords.byteLength, gl.STATIC_DRAW);

    gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
    gl.bufferSubData(gl.ARRAY_BUFFER, texCoordOffset, texCoords);

    // look up where the vertex data needs to go.
    var aPosLoc = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);
    const aTexCoordLoc = gl.getAttribLocation(program, 'aTexCoord');
    gl.enableVertexAttribArray(aTexCoordLoc);
    gl.vertexAttribPointer(aTexCoordLoc, 2, gl.FLOAT, false, 0, vertices.byteLength);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    gl.scissor(0, 0, texSize[0], texSize[1]);

    const uOutputDimLoc = gl.getUniformLocation(program, 'uOutputDim');
    gl.uniform3iv(uOutputDimLoc, threadDim);

    const uTexSizeLoc = gl.getUniformLocation(program, 'uTexSize');
    gl.uniform2iv(uTexSizeLoc, texSize);

    const ratioLocation = gl.getUniformLocation(program, 'ratio');
    gl.uniform2f(ratioLocation, texSize[0] / texSize[0], texSize[1] / texSize[1]);

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    // draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const bytes = new Uint8Array(texSize[0] * texSize[1] * 4);
    gl.readPixels(0, 0, texSize[0], texSize[1], gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    const result = new Float32Array(bytes.buffer);
    console.log(result);

    gl.destroy();
  }

  main();

  function loadShader (gl, shaderSource, shaderType) {
    var shader = gl.createShader(shaderType);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);

    // Check the compile status
    var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
      // Something went wrong during compilation; get the error
      var lastError = gl.getShaderInfoLog(shader);
      console.log("*** Error compiling shader '" + shader + "':" + lastError);
      gl.deleteShader(shader);
      return null
    }

    return shader;
  }

  function createProgram (gl, shaders, optAttribs, optLocations) {
    var program = gl.createProgram();
    shaders.forEach(function (shader) {
      gl.attachShader(program, shader);
    });
    if (optAttribs) {
      optAttribs.forEach(function (attrib, ndx) {
        gl.bindAttribLocation(
          program,
          optLocations ? optLocations[ndx] : ndx,
          attrib);
      });
    }
    gl.linkProgram(program);

    // Check the link status
    var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked) {
      // something went wrong with the link
      var lastError = gl.getProgramInfoLog(program);
      console.log('Error in program linking:' + lastError);

      gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  function createProgramFromSources (gl, shaderSources, optAttribs, optLocations) {
    var defaultShaderType = [
      'VERTEX_SHADER',
      'FRAGMENT_SHADER'
    ];

    var shaders = [];
    for (var ii = 0; ii < shaderSources.length; ++ii) {
      shaders.push(loadShader(gl, shaderSources[ii], gl[defaultShaderType[ii]]));
    }
    return createProgram(gl, shaders, optAttribs, optLocations);
  }
