/**
 * @desc [INTERNAL] Assembles a complete WebAssembly binary (Uint8Array)
 * from typed builder calls. No AST knowledge lives here — the function-node
 * drives one emitter method per wasm opcode. Hand-rolled because the
 * browser bundle cannot carry a wasm toolchain: the encoder is just
 * sections + LEB128, and the scalar/SIMD subset this backend needs is
 * fixed.
 *
 * Index spaces: function imports occupy indices [0, imports.length) and
 * defined functions follow. Call sites therefore reference targets by NAME
 * and are patched at toBytes(), so imports and functions may be declared in
 * any order. The patch slot is a 5-byte non-minimal ULEB128 — legal for u32
 * (ceil(32/7) bytes, zero spare bits in the last byte).
 */

const VAL_TYPES = {
  i32: 0x7f,
  i64: 0x7e,
  f32: 0x7d,
  f64: 0x7c,
  v128: 0x7b,
};

const SECTION_TYPE = 1;
const SECTION_IMPORT = 2;
const SECTION_FUNCTION = 3;
const SECTION_GLOBAL = 6;
const SECTION_EXPORT = 7;
const SECTION_CODE = 10;

// shared scratch for f32 <-> bytes; wasm is little-endian by spec
const f32Scratch = new DataView(new ArrayBuffer(16));

/**
 * Unsigned LEB128. Values are coerced through >>> so i32 bit patterns
 * passed as negative JS numbers encode as their u32 counterpart.
 */
function uleb(value, out) {
  let v = value >>> 0;
  do {
    let byte = v & 0x7f;
    v >>>= 7;
    if (v !== 0) byte |= 0x80;
    out.push(byte);
  } while (v !== 0);
}

/**
 * Signed LEB128 for i32 immediates. The |0 coercion pins the value into
 * i32 range so constants supplied as u32 bit patterns (0x9E3779B9-style
 * hash multipliers) encode to the same 32 bits.
 */
function sleb(value, out) {
  let v = value | 0;
  for (;;) {
    const byte = v & 0x7f;
    v >>= 7;
    if ((v === 0 && (byte & 0x40) === 0) || (v === -1 && (byte & 0x40) !== 0)) {
      out.push(byte);
      return;
    }
    out.push(byte | 0x80);
  }
}

/**
 * Fixed-width 5-byte ULEB128, written into an existing buffer. Used for
 * call-target patch slots whose value is unknown when the body is emitted.
 */
function uleb5At(value, bytes, at) {
  let v = value >>> 0;
  for (let i = 0; i < 4; i++) {
    bytes[at + i] = (v & 0x7f) | 0x80;
    v >>>= 7;
  }
  bytes[at + 4] = v & 0x7f;
}

/**
 * Minimal UTF-8 encoder so the builder stays dependency-free in both Node
 * and the browser bundle (no Buffer, no assumed TextEncoder).
 */
function utf8(str, out) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.codePointAt(i);
    if (code > 0xffff) i++;
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  uleb(bytes.length, out);
  for (let i = 0; i < bytes.length; i++) out.push(bytes[i]);
}

function valType(type) {
  const byte = VAL_TYPES[type];
  if (byte === undefined) {
    throw new Error(`WasmModuleBuilder: unknown value type "${ type }"`);
  }
  return byte;
}

// blocktype immediate: 0x40 for empty, else the single result's valtype
function blockType(type) {
  if (type === undefined || type === null || type === 'void') return 0x40;
  return valType(type);
}

/**
 * @desc Per-function body emitter. One method per opcode, each pushing the
 * exact encoding and returning `this` for chaining. Stack discipline is the
 * caller's job — anything malformed is caught by WebAssembly.validate, and
 * this backend never ships a module that has not been validated.
 *
 * The function-terminating `end` is appended by the builder at assembly
 * time; `end()` here closes blocks/loops/ifs only. This removes the
 * easiest way to build an imbalanced body.
 */
class WasmFunctionEmitter {
  constructor(builder, name, params, results, locals) {
    this.builder = builder;
    this.name = name;
    this.params = params;
    this.results = results;
    this.locals = locals.slice();
    this.bytes = [];
    this.callFixups = [];
  }

  /**
   * @returns {number} local index (params occupy the leading indices)
   */
  addLocal(type) {
    valType(type);
    this.locals.push(type);
    return this.params.length + this.locals.length - 1;
  }

  // control flow -----------------------------------------------------------

  block(type) {
    this.bytes.push(0x02, blockType(type));
    return this;
  }

  loop(type) {
    this.bytes.push(0x03, blockType(type));
    return this;
  }

  if_(type) {
    this.bytes.push(0x04, blockType(type));
    return this;
  }

  br(depth) {
    this.bytes.push(0x0c);
    uleb(depth, this.bytes);
    return this;
  }

  brIf(depth) {
    this.bytes.push(0x0d);
    uleb(depth, this.bytes);
    return this;
  }

  /**
   * Target is a NAME (import or defined function); the index is patched in
   * at toBytes() so declaration order never matters.
   */
  call(name) {
    this.bytes.push(0x10);
    this.callFixups.push({ at: this.bytes.length, name });
    this.bytes.push(0, 0, 0, 0, 0);
    return this;
  }

  // variables --------------------------------------------------------------

  localGet(index) {
    this.bytes.push(0x20);
    uleb(index, this.bytes);
    return this;
  }

  localSet(index) {
    this.bytes.push(0x21);
    uleb(index, this.bytes);
    return this;
  }

  localTee(index) {
    this.bytes.push(0x22);
    uleb(index, this.bytes);
    return this;
  }

  globalGet(index) {
    this.bytes.push(0x23);
    uleb(index, this.bytes);
    return this;
  }

  globalSet(index) {
    this.bytes.push(0x24);
    uleb(index, this.bytes);
    return this;
  }

  // constants --------------------------------------------------------------

  i32Const(value) {
    this.bytes.push(0x41);
    sleb(value, this.bytes);
    return this;
  }

  f32Const(value) {
    this.bytes.push(0x43);
    f32Scratch.setFloat32(0, value, true);
    for (let i = 0; i < 4; i++) this.bytes.push(f32Scratch.getUint8(i));
    return this;
  }

  /**
   * @param {ArrayLike<number>} lanes 16 bytes, little-endian lane order
   */
  v128Const(lanes) {
    if (lanes.length !== 16) {
      throw new Error('WasmModuleBuilder: v128.const requires exactly 16 bytes');
    }
    this.bytes.push(0xfd, 0x0c);
    for (let i = 0; i < 16; i++) this.bytes.push(lanes[i] & 0xff);
    return this;
  }

  v128ConstI32x4(a, b, c, d) {
    f32Scratch.setInt32(0, a, true);
    f32Scratch.setInt32(4, b, true);
    f32Scratch.setInt32(8, c, true);
    f32Scratch.setInt32(12, d, true);
    this.bytes.push(0xfd, 0x0c);
    for (let i = 0; i < 16; i++) this.bytes.push(f32Scratch.getUint8(i));
    return this;
  }

  v128ConstF32x4(a, b, c, d) {
    f32Scratch.setFloat32(0, a, true);
    f32Scratch.setFloat32(4, b, true);
    f32Scratch.setFloat32(8, c, true);
    f32Scratch.setFloat32(12, d, true);
    this.bytes.push(0xfd, 0x0c);
    for (let i = 0; i < 16; i++) this.bytes.push(f32Scratch.getUint8(i));
    return this;
  }

  // memory (memarg encodes align exponent then offset) ---------------------

  i32Load(offset = 0, align = 2) {
    this.bytes.push(0x28);
    uleb(align, this.bytes);
    uleb(offset, this.bytes);
    return this;
  }

  f32Load(offset = 0, align = 2) {
    this.bytes.push(0x2a);
    uleb(align, this.bytes);
    uleb(offset, this.bytes);
    return this;
  }

  i32Store(offset = 0, align = 2) {
    this.bytes.push(0x36);
    uleb(align, this.bytes);
    uleb(offset, this.bytes);
    return this;
  }

  f32Store(offset = 0, align = 2) {
    this.bytes.push(0x38);
    uleb(align, this.bytes);
    uleb(offset, this.bytes);
    return this;
  }

  v128Load(offset = 0, align = 4) {
    this.bytes.push(0xfd, 0x00);
    uleb(align, this.bytes);
    uleb(offset, this.bytes);
    return this;
  }

  v128Store(offset = 0, align = 4) {
    this.bytes.push(0xfd, 0x0b);
    uleb(align, this.bytes);
    uleb(offset, this.bytes);
    return this;
  }

  // SIMD lane accessors ----------------------------------------------------

  i32x4ExtractLane(lane) {
    return this._lane(0x1b, lane);
  }

  i32x4ReplaceLane(lane) {
    return this._lane(0x1c, lane);
  }

  f32x4ExtractLane(lane) {
    return this._lane(0x1f, lane);
  }

  f32x4ReplaceLane(lane) {
    return this._lane(0x20, lane);
  }

  _lane(op, lane) {
    if (!Number.isInteger(lane) || lane < 0 || lane > 3) {
      throw new Error(`WasmModuleBuilder: lane index ${ lane } out of range for 4-lane shape`);
    }
    this.bytes.push(0xfd, op, lane);
    return this;
  }

  _push(bytes) {
    for (let i = 0; i < bytes.length; i++) this.bytes.push(bytes[i]);
    return this;
  }
}

// All immediate-free opcodes, generated onto the prototype from encoding
// tables so a typo is a missing method (loud) rather than a wrong byte
// (silent until validation).
const PLAIN_OPS = {
  unreachable: [0x00],
  nop: [0x01],
  else_: [0x05],
  end: [0x0b],
  return_: [0x0f],
  drop: [0x1a],
  select: [0x1b],
  i32Eqz: [0x45],
  i32Eq: [0x46],
  i32Ne: [0x47],
  i32LtS: [0x48],
  i32LtU: [0x49],
  i32GtS: [0x4a],
  i32GtU: [0x4b],
  i32LeS: [0x4c],
  i32LeU: [0x4d],
  i32GeS: [0x4e],
  i32GeU: [0x4f],
  f32Eq: [0x5b],
  f32Ne: [0x5c],
  f32Lt: [0x5d],
  f32Gt: [0x5e],
  f32Le: [0x5f],
  f32Ge: [0x60],
  i32Clz: [0x67],
  i32Ctz: [0x68],
  i32Popcnt: [0x69],
  i32Add: [0x6a],
  i32Sub: [0x6b],
  i32Mul: [0x6c],
  i32DivS: [0x6d],
  i32DivU: [0x6e],
  i32RemS: [0x6f],
  i32RemU: [0x70],
  i32And: [0x71],
  i32Or: [0x72],
  i32Xor: [0x73],
  i32Shl: [0x74],
  i32ShrS: [0x75],
  i32ShrU: [0x76],
  i32Rotl: [0x77],
  i32Rotr: [0x78],
  f32Abs: [0x8b],
  f32Neg: [0x8c],
  f32Ceil: [0x8d],
  f32Floor: [0x8e],
  f32Trunc: [0x8f],
  f32Nearest: [0x90],
  f32Sqrt: [0x91],
  f32Add: [0x92],
  f32Sub: [0x93],
  f32Mul: [0x94],
  f32Div: [0x95],
  f32Min: [0x96],
  f32Max: [0x97],
  f32Copysign: [0x98],
  i32TruncF32S: [0xa8],
  i32TruncF32U: [0xa9],
  f32ConvertI32S: [0xb2],
  f32ConvertI32U: [0xb3],
  i32ReinterpretF32: [0xbc],
  f32ReinterpretI32: [0xbe],
  // 0xFC-prefixed saturating truncation (never traps on NaN/overflow)
  i32TruncSatF32S: [0xfc, 0x00],
  i32TruncSatF32U: [0xfc, 0x01],
};

// SIMD opcodes: 0xFD prefix + opcode as ULEB128 (>= 0x80 encodes to 2 bytes)
const SIMD_OPS = {
  i32x4Splat: 0x11,
  f32x4Splat: 0x13,
  i32x4Eq: 0x37,
  i32x4Ne: 0x38,
  i32x4LtS: 0x39,
  i32x4GtS: 0x3b,
  i32x4LeS: 0x3d,
  i32x4GeS: 0x3f,
  f32x4Eq: 0x41,
  f32x4Ne: 0x42,
  f32x4Lt: 0x43,
  f32x4Gt: 0x44,
  f32x4Le: 0x45,
  f32x4Ge: 0x46,
  v128Not: 0x4d,
  v128And: 0x4e,
  v128Andnot: 0x4f,
  v128Or: 0x50,
  v128Xor: 0x51,
  v128Bitselect: 0x52,
  v128AnyTrue: 0x53,
  f32x4Ceil: 0x67,
  f32x4Floor: 0x68,
  f32x4Trunc: 0x69,
  f32x4Nearest: 0x6a,
  i32x4Abs: 0xa0,
  i32x4Neg: 0xa1,
  i32x4AllTrue: 0xa3,
  i32x4Bitmask: 0xa4,
  i32x4Shl: 0xab,
  i32x4ShrS: 0xac,
  i32x4ShrU: 0xad,
  i32x4Add: 0xae,
  i32x4Sub: 0xb1,
  i32x4Mul: 0xb5,
  i32x4MinS: 0xb6,
  i32x4MinU: 0xb7,
  i32x4MaxS: 0xb8,
  i32x4MaxU: 0xb9,
  f32x4Abs: 0xe0,
  f32x4Neg: 0xe1,
  f32x4Sqrt: 0xe3,
  f32x4Add: 0xe4,
  f32x4Sub: 0xe5,
  f32x4Mul: 0xe6,
  f32x4Div: 0xe7,
  f32x4Min: 0xe8,
  f32x4Max: 0xe9,
  f32x4Pmin: 0xea,
  f32x4Pmax: 0xeb,
  i32x4TruncSatF32x4S: 0xf8,
  i32x4TruncSatF32x4U: 0xf9,
  f32x4ConvertI32x4S: 0xfa,
  f32x4ConvertI32x4U: 0xfb,
};

for (const name of Object.keys(PLAIN_OPS)) {
  const bytes = PLAIN_OPS[name];
  WasmFunctionEmitter.prototype[name] = function() {
    return this._push(bytes);
  };
}

for (const name of Object.keys(SIMD_OPS)) {
  const bytes = [0xfd];
  uleb(SIMD_OPS[name], bytes);
  WasmFunctionEmitter.prototype[name] = function() {
    return this._push(bytes);
  };
}

/**
 * @desc Whole-module assembler. Declare imports, globals and functions in
 * any order, then toBytes() lays out sections in the mandatory order
 * (type, import, function, global, export, code) and patches call targets.
 */
class WasmModuleBuilder {
  constructor() {
    this.types = [];
    this.typeIndexByKey = {};
    this.memoryImport = null;
    this.funcImports = [];
    this.funcImportIndexByName = {};
    this.functions = [];
    this.functionIndexByName = {};
    this.globals = [];
    this.exports = [];
  }

  _typeIndex(params, results) {
    const key = `${ params.join(',') }=>${ results.join(',') }`;
    if (key in this.typeIndexByKey) return this.typeIndexByKey[key];
    const index = this.types.length;
    this.types.push({ params, results });
    this.typeIndexByKey[key] = index;
    return index;
  }

  /**
   * One imported memory (env.memory) so a single compiled module can bind
   * either a plain or a shared WebAssembly.Memory. Shared memories require
   * a maximum by spec.
   */
  addMemoryImport(initial, maximum, shared = false) {
    if (shared && (maximum === undefined || maximum === null)) {
      throw new Error('WasmModuleBuilder: shared memory import requires a maximum');
    }
    this.memoryImport = { initial, maximum, shared };
    return this;
  }

  /**
   * @returns {number} function index (imports lead the index space)
   */
  addFuncImport(name, params, results, module = 'env') {
    if (name in this.funcImportIndexByName || name in this.functionIndexByName) {
      throw new Error(`WasmModuleBuilder: duplicate function name "${ name }"`);
    }
    const index = this.funcImports.length;
    this.funcImports.push({
      name,
      module,
      typeIndex: this._typeIndex(params, results)
    });
    this.funcImportIndexByName[name] = index;
    return index;
  }

  /**
   * @returns {number} global index
   */
  addGlobal(type, mutable, initialValue) {
    valType(type);
    this.globals.push({ type, mutable, initialValue });
    return this.globals.length - 1;
  }

  /**
   * @param {String} name
   * @param {Object} signature
   * @param {String[]} [signature.params]
   * @param {String[]} [signature.results]
   * @param {String[]} [signature.locals]
   * @returns {WasmFunctionEmitter} body emitter; more locals via addLocal()
   */
  addFunction(name, { params = [], results = [], locals = [] } = {}) {
    if (name in this.funcImportIndexByName || name in this.functionIndexByName) {
      throw new Error(`WasmModuleBuilder: duplicate function name "${ name }"`);
    }
    params.forEach(valType);
    results.forEach(valType);
    locals.forEach(valType);
    const emitter = new WasmFunctionEmitter(this, name, params, results, locals);
    this.functionIndexByName[name] = this.functions.length;
    this.functions.push({
      name,
      emitter,
      typeIndex: this._typeIndex(params, results)
    });
    return emitter;
  }

  exportFunction(name, exportName = name) {
    this.exports.push({ name, exportName });
    return this;
  }

  _resolveFuncIndex(name) {
    if (name in this.funcImportIndexByName) {
      return this.funcImportIndexByName[name];
    }
    if (name in this.functionIndexByName) {
      return this.funcImports.length + this.functionIndexByName[name];
    }
    throw new Error(`WasmModuleBuilder: call target "${ name }" is not an import or a defined function`);
  }

  _section(id, payload, out) {
    out.push(id);
    uleb(payload.length, out);
    for (let i = 0; i < payload.length; i++) out.push(payload[i]);
  }

  /**
   * @returns {Uint8Array} the complete module binary
   */
  toBytes() {
    const out = [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00];

    if (this.types.length > 0) {
      const payload = [];
      uleb(this.types.length, payload);
      for (const { params, results } of this.types) {
        payload.push(0x60);
        uleb(params.length, payload);
        for (const p of params) payload.push(valType(p));
        uleb(results.length, payload);
        for (const r of results) payload.push(valType(r));
      }
      this._section(SECTION_TYPE, payload, out);
    }

    if (this.memoryImport !== null || this.funcImports.length > 0) {
      const payload = [];
      uleb((this.memoryImport !== null ? 1 : 0) + this.funcImports.length, payload);
      if (this.memoryImport !== null) {
        const { initial, maximum, shared } = this.memoryImport;
        utf8('env', payload);
        utf8('memory', payload);
        payload.push(0x02);
        const hasMax = maximum !== undefined && maximum !== null;
        payload.push(shared ? 0x03 : (hasMax ? 0x01 : 0x00));
        uleb(initial, payload);
        if (hasMax) uleb(maximum, payload);
      }
      for (const { name, module, typeIndex } of this.funcImports) {
        utf8(module, payload);
        utf8(name, payload);
        payload.push(0x00);
        uleb(typeIndex, payload);
      }
      this._section(SECTION_IMPORT, payload, out);
    }

    if (this.functions.length > 0) {
      const payload = [];
      uleb(this.functions.length, payload);
      for (const { typeIndex } of this.functions) uleb(typeIndex, payload);
      this._section(SECTION_FUNCTION, payload, out);
    }

    if (this.globals.length > 0) {
      const payload = [];
      uleb(this.globals.length, payload);
      for (const { type, mutable, initialValue } of this.globals) {
        payload.push(valType(type), mutable ? 0x01 : 0x00);
        if (type === 'i32') {
          payload.push(0x41);
          sleb(initialValue, payload);
        } else if (type === 'f32') {
          payload.push(0x43);
          f32Scratch.setFloat32(0, initialValue, true);
          for (let i = 0; i < 4; i++) payload.push(f32Scratch.getUint8(i));
        } else if (type === 'v128') {
          // always zero-initialized; the only v128 global is PCG state,
          // reseeded per quad before any read
          payload.push(0xfd, 0x0c);
          for (let i = 0; i < 16; i++) payload.push(0);
        } else {
          throw new Error(`WasmModuleBuilder: no initializer encoding for global type "${ type }"`);
        }
        payload.push(0x0b);
      }
      this._section(SECTION_GLOBAL, payload, out);
    }

    if (this.exports.length > 0) {
      const payload = [];
      uleb(this.exports.length, payload);
      for (const { name, exportName } of this.exports) {
        utf8(exportName, payload);
        payload.push(0x00);
        uleb(this._resolveFuncIndex(name), payload);
      }
      this._section(SECTION_EXPORT, payload, out);
    }

    if (this.functions.length > 0) {
      const payload = [];
      uleb(this.functions.length, payload);
      for (const { emitter } of this.functions) {
        const body = emitter.bytes.slice();
        for (const { at, name } of emitter.callFixups) {
          uleb5At(this._resolveFuncIndex(name), body, at);
        }
        const entry = [];
        // locals are RLE-compressed (count, type) runs per spec
        const runs = [];
        for (const local of emitter.locals) {
          const type = valType(local);
          if (runs.length > 0 && runs[runs.length - 1].type === type) {
            runs[runs.length - 1].count++;
          } else {
            runs.push({ type, count: 1 });
          }
        }
        uleb(runs.length, entry);
        for (const { type, count } of runs) {
          uleb(count, entry);
          entry.push(type);
        }
        for (let i = 0; i < body.length; i++) entry.push(body[i]);
        entry.push(0x0b);
        uleb(entry.length, payload);
        for (let i = 0; i < entry.length; i++) payload.push(entry[i]);
      }
      this._section(SECTION_CODE, payload, out);
    }

    return Uint8Array.from(out);
  }
}

module.exports = {
  WasmModuleBuilder,
  WasmFunctionEmitter
};