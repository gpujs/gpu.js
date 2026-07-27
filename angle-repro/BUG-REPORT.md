# Draft ANGLE bug report

File at https://issues.angleproject.org (component: ANGLE, translator/HLSL),
attaching `nested-sampler-call.html` from this directory.

---

**Title:** D3D11: wrong sampler used when a sampler-taking user function is
called nested inside a call to the same function

**Summary**

In a WebGL 1 fragment shader, if a user-defined function with a `sampler2D`
parameter is called with sampler B, and its argument list contains a nested
call to *the same function* with sampler A, the outer call samples A instead
of B on the D3D11 backend:

```glsl
float readTex(sampler2D tex, float x) {
  return texture2D(tex, vec2(x, 0.5)).r;
}
// broken: samples texA twice on D3D11
gl_FragColor = vec4(readTex(texB, readTex(texA, 0.5)), 0.0, 0.0, 1.0);
```

The same data flow through a temporary is correct, and so is a nested call to
a *different* function with an identical body, which points at the per-sampler
function specialization the HLSL translator performs:

```glsl
float t = readTex(texA, 0.5);            // correct
gl_FragColor = vec4(readTex(texB, t), ...);

gl_FragColor = vec4(readTex(texB, readTexA(texA, 0.5)), ...);  // correct
```

**Steps to reproduce**

Open the attached `nested-sampler-call.html` on a Windows machine (any D3D11
renderer, including WARP). It renders four one-pixel cases and prints
expected/got for each; texA is a 1x1 texture holding 160 and texB is a 4x1
ramp where the correct lookup lands on 40.

**Observed** (Windows 11, Chrome 150.0.0.0 and Edge 150.0.0.0, renderer
`ANGLE (Microsoft, Microsoft Basic Render Driver (0x0000008C) Direct3D11 vs_5_0 ps_5_0, D3D11)`):

```
BUG  nested call to the SAME function  expected 40, got 160   <- texA's value
ok   same data flow via a temporary    expected 40, got 40
ok   nested call, distinct function    expected 40, got 40
ok   nested texture2D builtin          expected 40, got 40
```

Firefox 152 on the same Windows 11 image shows the same wrong result, so it
is not specific to Chromium's ANGLE revision.

**Not reproducible on** ANGLE Metal (macOS 14, Apple M1) or ANGLE
Vulkan/SwiftShader, where all four cases print 40.

**Why it matters**

Found via gpu.js (~15k GitHub stars), which compiles user kernels to exactly
this shape: its generated texture-read helper takes a sampler parameter, and
`lookup[input[x]]` produces one call nested in another. Every gpu.js kernel
indexing one array by another returns wrong values on Windows
(gpujs/gpu.js#300, open since 2018 and only now diagnosed). gpu.js now works
around it by hoisting the inner call into a temporary.

---

Once filed, link the issue number from gpujs/gpu.js#300 and delete this
directory if you don't want the repro in-tree.
