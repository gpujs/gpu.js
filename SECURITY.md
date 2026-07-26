# Security Policy

## Reporting a vulnerability

**Please report security issues privately, not as a public issue.**

Use GitHub's private vulnerability reporting:
[**Report a vulnerability**](https://github.com/gpujs/gpu.js/security/advisories/new).
This opens a private thread visible only to you and the maintainers, and lets us
credit you and publish an advisory when a fix ships.

If that form is unavailable to you for any reason, open a public issue saying
only that you have a security report and would like a private channel — no
details — and a maintainer will arrange one.

gpu.js is maintained by volunteers, so please allow up to **30 days** for a
substantive response. If a report is urgent, or that window passes without a
reply, say so on the thread.

The same applies to the other packages this project publishes, each of which
accepts private reports on its own repository:
[gpu-mock.js](https://github.com/gpujs/gpu-mock.js/security/advisories/new),
[@gpujs/benchmark](https://github.com/gpujs/benchmark/security/advisories/new)
and [gpu.rocks](https://github.com/gpujs/gpu.rocks/security/advisories/new).

## Supported versions

| Version | Supported |
| ------- | --------- |
| 2.x (latest) | Yes |
| 2.x (older minors) | Fixes land in the next release rather than being backported |
| 1.x | No |

## What counts as a vulnerability

gpu.js compiles JavaScript you give it into shader or CPU code and runs it. That
makes the boundary between *code* and *data* the thing worth being precise about.

**Kernel source is code.** `createKernel()` accepts a function *or a string* and
executes it; `addFunction()` and `addNativeFunction()` do the same, the latter
injecting raw GLSL. Passing attacker-controlled text to any of these is
equivalent to calling `eval` on it, and is not a vulnerability in gpu.js any more
than `eval` is a vulnerability in JavaScript. Do not build kernels out of
untrusted input.

**Kernel arguments are data.** Numbers, arrays, typed arrays, `Input`, textures,
images and video passed *to* a kernel are values, not code. These are safe to
accept from untrusted sources, and a way to make them execute something, read
memory they should not, or escape the kernel *is* a vulnerability — please
report it.

Also in scope: anything that lets one kernel read another's data when it should
not, memory disclosure through textures or pipelines, and flaws in the code
gpu.js generates rather than in the code you handed it.

Generally out of scope: dynamic code generation itself (`new Function` is how a
transpiler works); crashes or hangs caused by kernels you wrote; and bugs in
browsers, GPU drivers or WebGL implementations, which belong upstream.

## Notes for automated scanners

Static analysis flags a few things in this project. These are known and
explained, so you can triage them quickly:

- **`new Function` / dynamic code generation.** Inherent to a transpiler. gpu.js
  evaluates the kernel source *the developer wrote*, never remote input.
- **Dependencies that only run at install or build time.** `gl` builds a native
  module via `node-gyp`, which brings tools such as `tar` and `glob`. Advisories
  against those describe extracting untrusted archives or globbing untrusted
  patterns; gpu.js does neither, and none of it ships in the browser bundles. We
  still update them whenever a compatible patch exists.
- **A filesystem write in the browser bundle**, reported against 2.19.4 and
  earlier. This came from the vendored recording library used by
  `kernel.toString()`, which *generated* — never executed — a line of text
  containing `require('fs').writeFileSync(...)` for a debug feature gpu.js never
  enabled. The dead code was removed in 2.19.6; see the header of
  [`src/vendor/gl-wiretap.js`](src/vendor/gl-wiretap.js) for the full history.

If you believe one of these is more than it appears, please report it privately
rather than filing a public issue — we would rather read the argument than
dismiss it.
