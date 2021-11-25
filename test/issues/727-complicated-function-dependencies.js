const { assert, skip, test, module: describe } = require("qunit");
const { GPU } = require("../../src");

describe("issue #727");

function a() {
  b();
  c();
  d();
  e();
  f();
  return 1;
}
function b() {
  g();
}
function c() {
  g();
  return 1;
}
function d() {
  g();
  return 1;
}
function e() {
  g();
  return 1;
}
function f() {
  i();
  m();
  return 1;
}
function g() {
  i();
  j();
  k();
  return 1;
}
function h() {
  o();
  return 1;
}
function i() {
  return 1;
}
function j() {
  m();
  n();
  return 1;
}
function k() {
  return 1;
}
function l() {
  o();
  p();
  return 1;
}
function m() {
  return 1;
}
function n() {
  return 1;
}
function o() {
  return 1;
}
function p() {
  b();
  return 1;
}

function complicatedFunctionDependecies(mode) {
  const gpu = new GPU({ mode });
  gpu.setFunctions([a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p]);
  const kernel = gpu
    .createKernel(function () {
      a();
      return 1;
    })
    .setOutput([1]);

  assert.deepEqual(kernel(), new Float32Array([1]));
}

test("auto", () => {
  complicatedFunctionDependecies();
});

test("gpu", () => {
  complicatedFunctionDependecies("gpu");
});

(GPU.isWebGLSupported ? test : skip)("webgl", () => {
  complicatedFunctionDependecies("webgl");
});

(GPU.isWebGL2Supported ? test : skip)("webgl2", () => {
  complicatedFunctionDependecies("webgl2");
});

(GPU.isHeadlessGLSupported ? test : skip)("headlessgl", () => {
  complicatedFunctionDependecies("headlessgl");
});

test("cpu", () => {
  complicatedFunctionDependecies("cpu");
});
