/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/bindings/bindings.js":
/*!*******************************************!*\
  !*** ./node_modules/bindings/bindings.js ***!
  \*******************************************/
/***/ ((module, exports, __webpack_require__) => {

var __filename = "/index.js";
/**
 * Module dependencies.
 */

var fs = __webpack_require__(/*! fs */ "?34f8"),
  path = __webpack_require__(/*! path */ "?fcd9"),
  fileURLToPath = __webpack_require__(/*! file-uri-to-path */ "./node_modules/file-uri-to-path/index.js"),
  join = path.join,
  dirname = path.dirname,
  exists =
    (fs.accessSync &&
      function(path) {
        try {
          fs.accessSync(path);
        } catch (e) {
          return false;
        }
        return true;
      }) ||
    fs.existsSync ||
    path.existsSync,
  defaults = {
    arrow: process.env.NODE_BINDINGS_ARROW || ' → ',
    compiled: process.env.NODE_BINDINGS_COMPILED_DIR || 'compiled',
    platform: process.platform,
    arch: process.arch,
    nodePreGyp:
      'node-v' +
      process.versions.modules +
      '-' +
      process.platform +
      '-' +
      process.arch,
    version: process.versions.node,
    bindings: 'bindings.node',
    try: [
      // node-gyp's linked version in the "build" dir
      ['module_root', 'build', 'bindings'],
      // node-waf and gyp_addon (a.k.a node-gyp)
      ['module_root', 'build', 'Debug', 'bindings'],
      ['module_root', 'build', 'Release', 'bindings'],
      // Debug files, for development (legacy behavior, remove for node v0.9)
      ['module_root', 'out', 'Debug', 'bindings'],
      ['module_root', 'Debug', 'bindings'],
      // Release files, but manually compiled (legacy behavior, remove for node v0.9)
      ['module_root', 'out', 'Release', 'bindings'],
      ['module_root', 'Release', 'bindings'],
      // Legacy from node-waf, node <= 0.4.x
      ['module_root', 'build', 'default', 'bindings'],
      // Production "Release" buildtype binary (meh...)
      ['module_root', 'compiled', 'version', 'platform', 'arch', 'bindings'],
      // node-qbs builds
      ['module_root', 'addon-build', 'release', 'install-root', 'bindings'],
      ['module_root', 'addon-build', 'debug', 'install-root', 'bindings'],
      ['module_root', 'addon-build', 'default', 'install-root', 'bindings'],
      // node-pre-gyp path ./lib/binding/{node_abi}-{platform}-{arch}
      ['module_root', 'lib', 'binding', 'nodePreGyp', 'bindings']
    ]
  };

/**
 * The main `bindings()` function loads the compiled bindings for a given module.
 * It uses V8's Error API to determine the parent filename that this function is
 * being invoked from, which is then used to find the root directory.
 */

function bindings(opts) {
  // Argument surgery
  if (typeof opts == 'string') {
    opts = { bindings: opts };
  } else if (!opts) {
    opts = {};
  }

  // maps `defaults` onto `opts` object
  Object.keys(defaults).map(function(i) {
    if (!(i in opts)) opts[i] = defaults[i];
  });

  // Get the module root
  if (!opts.module_root) {
    opts.module_root = exports.getRoot(exports.getFileName());
  }

  // Ensure the given bindings name ends with .node
  if (path.extname(opts.bindings) != '.node') {
    opts.bindings += '.node';
  }

  // https://github.com/webpack/webpack/issues/4175#issuecomment-342931035
  var requireFunc =
     true
      ? require
      : 0;

  var tries = [],
    i = 0,
    l = opts.try.length,
    n,
    b,
    err;

  for (; i < l; i++) {
    n = join.apply(
      null,
      opts.try[i].map(function(p) {
        return opts[p] || p;
      })
    );
    tries.push(n);
    try {
      b = opts.path ? requireFunc.resolve(n) : requireFunc(n);
      if (!opts.path) {
        b.path = n;
      }
      return b;
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND' &&
          e.code !== 'QUALIFIED_PATH_RESOLUTION_FAILED' &&
          !/not find/i.test(e.message)) {
        throw e;
      }
    }
  }

  err = new Error(
    'Could not locate the bindings file. Tried:\n' +
      tries
        .map(function(a) {
          return opts.arrow + a;
        })
        .join('\n')
  );
  err.tries = tries;
  throw err;
}
module.exports = exports = bindings;

/**
 * Gets the filename of the JavaScript file that invokes this function.
 * Used to help find the root directory of a module.
 * Optionally accepts an filename argument to skip when searching for the invoking filename
 */

exports.getFileName = function getFileName(calling_file) {
  var origPST = Error.prepareStackTrace,
    origSTL = Error.stackTraceLimit,
    dummy = {},
    fileName;

  Error.stackTraceLimit = 10;

  Error.prepareStackTrace = function(e, st) {
    for (var i = 0, l = st.length; i < l; i++) {
      fileName = st[i].getFileName();
      if (fileName !== __filename) {
        if (calling_file) {
          if (fileName !== calling_file) {
            return;
          }
        } else {
          return;
        }
      }
    }
  };

  // run the 'prepareStackTrace' function above
  Error.captureStackTrace(dummy);
  dummy.stack;

  // cleanup
  Error.prepareStackTrace = origPST;
  Error.stackTraceLimit = origSTL;

  // handle filename that starts with "file://"
  var fileSchema = 'file://';
  if (fileName.indexOf(fileSchema) === 0) {
    fileName = fileURLToPath(fileName);
  }

  return fileName;
};

/**
 * Gets the root directory of a module, given an arbitrary filename
 * somewhere in the module tree. The "root directory" is the directory
 * containing the `package.json` file.
 *
 *   In:  /home/nate/node-native-module/lib/index.js
 *   Out: /home/nate/node-native-module
 */

exports.getRoot = function getRoot(file) {
  var dir = dirname(file),
    prev;
  while (true) {
    if (dir === '.') {
      // Avoids an infinite loop in rare cases, like the REPL
      dir = process.cwd();
    }
    if (
      exists(join(dir, 'package.json')) ||
      exists(join(dir, 'node_modules'))
    ) {
      // Found the 'package.json' file or 'node_modules' dir; we're done
      return dir;
    }
    if (prev === dir) {
      // Got to the top
      throw new Error(
        'Could not find module root given file: "' +
          file +
          '". Do you have a `package.json` file? '
      );
    }
    // Try the parent dir next
    prev = dir;
    dir = join(dir, '..');
  }
};


/***/ }),

/***/ "./node_modules/bit-twiddle/twiddle.js":
/*!*********************************************!*\
  !*** ./node_modules/bit-twiddle/twiddle.js ***!
  \*********************************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";
/**
 * Bit twiddling hacks for JavaScript.
 *
 * Author: Mikola Lysenko
 *
 * Ported from Stanford bit twiddling hack library:
 *    http://graphics.stanford.edu/~seander/bithacks.html
 */

 "use restrict";

//Number of bits in an integer
var INT_BITS = 32;

//Constants
exports.INT_BITS  = INT_BITS;
exports.INT_MAX   =  0x7fffffff;
exports.INT_MIN   = -1<<(INT_BITS-1);

//Returns -1, 0, +1 depending on sign of x
exports.sign = function(v) {
  return (v > 0) - (v < 0);
}

//Computes absolute value of integer
exports.abs = function(v) {
  var mask = v >> (INT_BITS-1);
  return (v ^ mask) - mask;
}

//Computes minimum of integers x and y
exports.min = function(x, y) {
  return y ^ ((x ^ y) & -(x < y));
}

//Computes maximum of integers x and y
exports.max = function(x, y) {
  return x ^ ((x ^ y) & -(x < y));
}

//Checks if a number is a power of two
exports.isPow2 = function(v) {
  return !(v & (v-1)) && (!!v);
}

//Computes log base 2 of v
exports.log2 = function(v) {
  var r, shift;
  r =     (v > 0xFFFF) << 4; v >>>= r;
  shift = (v > 0xFF  ) << 3; v >>>= shift; r |= shift;
  shift = (v > 0xF   ) << 2; v >>>= shift; r |= shift;
  shift = (v > 0x3   ) << 1; v >>>= shift; r |= shift;
  return r | (v >> 1);
}

//Computes log base 10 of v
exports.log10 = function(v) {
  return  (v >= 1000000000) ? 9 : (v >= 100000000) ? 8 : (v >= 10000000) ? 7 :
          (v >= 1000000) ? 6 : (v >= 100000) ? 5 : (v >= 10000) ? 4 :
          (v >= 1000) ? 3 : (v >= 100) ? 2 : (v >= 10) ? 1 : 0;
}

//Counts number of bits
exports.popCount = function(v) {
  v = v - ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return ((v + (v >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24;
}

//Counts number of trailing zeros
function countTrailingZeros(v) {
  var c = 32;
  v &= -v;
  if (v) c--;
  if (v & 0x0000FFFF) c -= 16;
  if (v & 0x00FF00FF) c -= 8;
  if (v & 0x0F0F0F0F) c -= 4;
  if (v & 0x33333333) c -= 2;
  if (v & 0x55555555) c -= 1;
  return c;
}
exports.countTrailingZeros = countTrailingZeros;

//Rounds to next power of 2
exports.nextPow2 = function(v) {
  v += v === 0;
  --v;
  v |= v >>> 1;
  v |= v >>> 2;
  v |= v >>> 4;
  v |= v >>> 8;
  v |= v >>> 16;
  return v + 1;
}

//Rounds down to previous power of 2
exports.prevPow2 = function(v) {
  v |= v >>> 1;
  v |= v >>> 2;
  v |= v >>> 4;
  v |= v >>> 8;
  v |= v >>> 16;
  return v - (v>>>1);
}

//Computes parity of word
exports.parity = function(v) {
  v ^= v >>> 16;
  v ^= v >>> 8;
  v ^= v >>> 4;
  v &= 0xf;
  return (0x6996 >>> v) & 1;
}

var REVERSE_TABLE = new Array(256);

(function(tab) {
  for(var i=0; i<256; ++i) {
    var v = i, r = i, s = 7;
    for (v >>>= 1; v; v >>>= 1) {
      r <<= 1;
      r |= v & 1;
      --s;
    }
    tab[i] = (r << s) & 0xff;
  }
})(REVERSE_TABLE);

//Reverse bits in a 32 bit word
exports.reverse = function(v) {
  return  (REVERSE_TABLE[ v         & 0xff] << 24) |
          (REVERSE_TABLE[(v >>> 8)  & 0xff] << 16) |
          (REVERSE_TABLE[(v >>> 16) & 0xff] << 8)  |
           REVERSE_TABLE[(v >>> 24) & 0xff];
}

//Interleave bits of 2 coordinates with 16 bits.  Useful for fast quadtree codes
exports.interleave2 = function(x, y) {
  x &= 0xFFFF;
  x = (x | (x << 8)) & 0x00FF00FF;
  x = (x | (x << 4)) & 0x0F0F0F0F;
  x = (x | (x << 2)) & 0x33333333;
  x = (x | (x << 1)) & 0x55555555;

  y &= 0xFFFF;
  y = (y | (y << 8)) & 0x00FF00FF;
  y = (y | (y << 4)) & 0x0F0F0F0F;
  y = (y | (y << 2)) & 0x33333333;
  y = (y | (y << 1)) & 0x55555555;

  return x | (y << 1);
}

//Extracts the nth interleaved component
exports.deinterleave2 = function(v, n) {
  v = (v >>> n) & 0x55555555;
  v = (v | (v >>> 1))  & 0x33333333;
  v = (v | (v >>> 2))  & 0x0F0F0F0F;
  v = (v | (v >>> 4))  & 0x00FF00FF;
  v = (v | (v >>> 16)) & 0x000FFFF;
  return (v << 16) >> 16;
}


//Interleave bits of 3 coordinates, each with 10 bits.  Useful for fast octree codes
exports.interleave3 = function(x, y, z) {
  x &= 0x3FF;
  x  = (x | (x<<16)) & 4278190335;
  x  = (x | (x<<8))  & 251719695;
  x  = (x | (x<<4))  & 3272356035;
  x  = (x | (x<<2))  & 1227133513;

  y &= 0x3FF;
  y  = (y | (y<<16)) & 4278190335;
  y  = (y | (y<<8))  & 251719695;
  y  = (y | (y<<4))  & 3272356035;
  y  = (y | (y<<2))  & 1227133513;
  x |= (y << 1);
  
  z &= 0x3FF;
  z  = (z | (z<<16)) & 4278190335;
  z  = (z | (z<<8))  & 251719695;
  z  = (z | (z<<4))  & 3272356035;
  z  = (z | (z<<2))  & 1227133513;
  
  return x | (z << 2);
}

//Extracts nth interleaved component of a 3-tuple
exports.deinterleave3 = function(v, n) {
  v = (v >>> n)       & 1227133513;
  v = (v | (v>>>2))   & 3272356035;
  v = (v | (v>>>4))   & 251719695;
  v = (v | (v>>>8))   & 4278190335;
  v = (v | (v>>>16))  & 0x3FF;
  return (v<<22)>>22;
}

//Computes next combination in colexicographic order (this is mistakenly called nextPermutation on the bit twiddling hacks page)
exports.nextCombination = function(v) {
  var t = v | (v - 1);
  return (t + 1) | (((~t & -~t) - 1) >>> (countTrailingZeros(v) + 1));
}



/***/ }),

/***/ "./node_modules/file-uri-to-path/index.js":
/*!************************************************!*\
  !*** ./node_modules/file-uri-to-path/index.js ***!
  \************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


/**
 * Module dependencies.
 */

var sep = (__webpack_require__(/*! path */ "?bc95").sep) || '/';

/**
 * Module exports.
 */

module.exports = fileUriToPath;

/**
 * File URI to Path function.
 *
 * @param {String} uri
 * @return {String} path
 * @api public
 */

function fileUriToPath (uri) {
  if ('string' != typeof uri ||
      uri.length <= 7 ||
      'file://' != uri.substring(0, 7)) {
    throw new TypeError('must pass in a file:// URI to convert to a file path');
  }

  var rest = decodeURI(uri.substring(7));
  var firstSlash = rest.indexOf('/');
  var host = rest.substring(0, firstSlash);
  var path = rest.substring(firstSlash + 1);

  // 2.  Scheme Definition
  // As a special case, <host> can be the string "localhost" or the empty
  // string; this is interpreted as "the machine from which the URL is
  // being interpreted".
  if ('localhost' == host) host = '';

  if (host) {
    host = sep + sep + host;
  }

  // 3.2  Drives, drive letters, mount points, file system root
  // Drive letters are mapped into the top of a file URI in various ways,
  // depending on the implementation; some applications substitute
  // vertical bar ("|") for the colon after the drive letter, yielding
  // "file:///c|/tmp/test.txt".  In some cases, the colon is left
  // unchanged, as in "file:///c:/tmp/test.txt".  In other cases, the
  // colon is simply omitted, as in "file:///c/tmp/test.txt".
  path = path.replace(/^(.+)\|/, '$1:');

  // for Windows, we need to invert the path separators from what a URI uses
  if (sep == '\\') {
    path = path.replace(/\//g, '\\');
  }

  if (/^.+\:/.test(path)) {
    // has Windows drive at beginning of path
  } else {
    // unix path…
    path = sep + path;
  }

  return host + path;
}


/***/ }),

/***/ "./node_modules/gl-wiretap/index.js":
/*!******************************************!*\
  !*** ./node_modules/gl-wiretap/index.js ***!
  \******************************************/
/***/ ((module) => {

/**
 *
 * @param {WebGLRenderingContext} gl
 * @param {IGLWiretapOptions} [options]
 * @returns {GLWiretapProxy}
 */
function glWiretap(gl, options = {}) {
  const {
    contextName = 'gl',
    throwGetError,
    useTrackablePrimitives,
    readPixelsFile,
    recording = [],
    variables = {},
    onReadPixels,
    onUnrecognizedArgumentLookup,
  } = options;
  const proxy = new Proxy(gl, { get: listen });
  const contextVariables = [];
  const entityNames = {};
  let imageCount = 0;
  let indent = '';
  let readPixelsVariableName;
  return proxy;
  function listen(obj, property) {
    switch (property) {
      case 'addComment': return addComment;
      case 'checkThrowError': return checkThrowError;
      case 'getReadPixelsVariableName': return readPixelsVariableName;
      case 'insertVariable': return insertVariable;
      case 'reset': return reset;
      case 'setIndent': return setIndent;
      case 'toString': return toString;
      case 'getContextVariableName': return getContextVariableName;
    }
    if (typeof gl[property] === 'function') {
      return function() { // need arguments from this, fyi
        switch (property) {
          case 'getError':
            if (throwGetError) {
              recording.push(`${indent}if (${contextName}.getError() !== ${contextName}.NONE) throw new Error('error');`);
            } else {
              recording.push(`${indent}${contextName}.getError();`); // flush out errors
            }
            return gl.getError();
          case 'getExtension': {
            const variableName = `${contextName}Variables${contextVariables.length}`;
            recording.push(`${indent}const ${variableName} = ${contextName}.getExtension('${arguments[0]}');`);
            const extension = gl.getExtension(arguments[0]);
            if (extension && typeof extension === 'object') {
              const tappedExtension = glExtensionWiretap(extension, {
                getEntity,
                useTrackablePrimitives,
                recording,
                contextName: variableName,
                contextVariables,
                variables,
                indent,
                onUnrecognizedArgumentLookup,
              });
              contextVariables.push(tappedExtension);
              return tappedExtension;
            } else {
              contextVariables.push(null);
            }
            return extension;
          }
          case 'readPixels':
            const i = contextVariables.indexOf(arguments[6]);
            let targetVariableName;
            if (i === -1) {
              const variableName = getVariableName(arguments[6]);
              if (variableName) {
                targetVariableName = variableName;
                recording.push(`${indent}${variableName}`);
              } else {
                targetVariableName = `${contextName}Variable${contextVariables.length}`;
                contextVariables.push(arguments[6]);
                recording.push(`${indent}const ${targetVariableName} = new ${arguments[6].constructor.name}(${arguments[6].length});`);
              }
            } else {
              targetVariableName = `${contextName}Variable${i}`;
            }
            readPixelsVariableName = targetVariableName;
            const argumentAsStrings = [
              arguments[0],
              arguments[1],
              arguments[2],
              arguments[3],
              getEntity(arguments[4]),
              getEntity(arguments[5]),
              targetVariableName
            ];
            recording.push(`${indent}${contextName}.readPixels(${argumentAsStrings.join(', ')});`);
            if (readPixelsFile) {
              writePPM(arguments[2], arguments[3]);
            }
            if (onReadPixels) {
              onReadPixels(targetVariableName, argumentAsStrings);
            }
            return gl.readPixels.apply(gl, arguments);
          case 'drawBuffers':
            recording.push(`${indent}${contextName}.drawBuffers([${argumentsToString(arguments[0], { contextName, contextVariables, getEntity, addVariable, variables, onUnrecognizedArgumentLookup } )}]);`);
            return gl.drawBuffers(arguments[0]);
        }
        let result = gl[property].apply(gl, arguments);
        switch (typeof result) {
          case 'undefined':
            recording.push(`${indent}${methodCallToString(property, arguments)};`);
            return;
          case 'number':
          case 'boolean':
            if (useTrackablePrimitives && contextVariables.indexOf(trackablePrimitive(result)) === -1) {
              recording.push(`${indent}const ${contextName}Variable${contextVariables.length} = ${methodCallToString(property, arguments)};`);
              contextVariables.push(result = trackablePrimitive(result));
              break;
            }
          default:
            if (result === null) {
              recording.push(`${methodCallToString(property, arguments)};`);
            } else {
              recording.push(`${indent}const ${contextName}Variable${contextVariables.length} = ${methodCallToString(property, arguments)};`);
            }

            contextVariables.push(result);
        }
        return result;
      }
    }
    entityNames[gl[property]] = property;
    return gl[property];
  }
  function toString() {
    return recording.join('\n');
  }
  function reset() {
    while (recording.length > 0) {
      recording.pop();
    }
  }
  function insertVariable(name, value) {
    variables[name] = value;
  }
  function getEntity(value) {
    const name = entityNames[value];
    if (name) {
      return contextName + '.' + name;
    }
    return value;
  }
  function setIndent(spaces) {
    indent = ' '.repeat(spaces);
  }
  function addVariable(value, source) {
    const variableName = `${contextName}Variable${contextVariables.length}`;
    recording.push(`${indent}const ${variableName} = ${source};`);
    contextVariables.push(value);
    return variableName;
  }
  function writePPM(width, height) {
    const sourceVariable = `${contextName}Variable${contextVariables.length}`;
    const imageVariable = `imageDatum${imageCount}`;
    recording.push(`${indent}let ${imageVariable} = ["P3\\n# ${readPixelsFile}.ppm\\n", ${width}, ' ', ${height}, "\\n255\\n"].join("");`);
    recording.push(`${indent}for (let i = 0; i < ${imageVariable}.length; i += 4) {`);
    recording.push(`${indent}  ${imageVariable} += ${sourceVariable}[i] + ' ' + ${sourceVariable}[i + 1] + ' ' + ${sourceVariable}[i + 2] + ' ';`);
    recording.push(`${indent}}`);
    recording.push(`${indent}if (typeof require !== "undefined") {`);
    recording.push(`${indent}  require('fs').writeFileSync('./${readPixelsFile}.ppm', ${imageVariable});`);
    recording.push(`${indent}}`);
    imageCount++;
  }
  function addComment(value) {
    recording.push(`${indent}// ${value}`);
  }
  function checkThrowError() {
    recording.push(`${indent}(() => {
${indent}const error = ${contextName}.getError();
${indent}if (error !== ${contextName}.NONE) {
${indent}  const names = Object.getOwnPropertyNames(gl);
${indent}  for (let i = 0; i < names.length; i++) {
${indent}    const name = names[i];
${indent}    if (${contextName}[name] === error) {
${indent}      throw new Error('${contextName} threw ' + name);
${indent}    }
${indent}  }
${indent}}
${indent}})();`);
  }
  function methodCallToString(method, args) {
    return `${contextName}.${method}(${argumentsToString(args, { contextName, contextVariables, getEntity, addVariable, variables, onUnrecognizedArgumentLookup })})`;
  }

  function getVariableName(value) {
    if (variables) {
      for (const name in variables) {
        if (variables[name] === value) {
          return name;
        }
      }
    }
    return null;
  }

  function getContextVariableName(value) {
    const i = contextVariables.indexOf(value);
    if (i !== -1) {
      return `${contextName}Variable${i}`;
    }
    return null;
  }
}

/**
 *
 * @param extension
 * @param {IGLExtensionWiretapOptions} options
 * @returns {*}
 */
function glExtensionWiretap(extension, options) {
  const proxy = new Proxy(extension, { get: listen });
  const extensionEntityNames = {};
  const {
    contextName,
    contextVariables,
    getEntity,
    useTrackablePrimitives,
    recording,
    variables,
    indent,
    onUnrecognizedArgumentLookup,
  } = options;
  return proxy;
  function listen(obj, property) {
    if (typeof obj[property] === 'function') {
      return function() {
        switch (property) {
          case 'drawBuffersWEBGL':
            recording.push(`${indent}${contextName}.drawBuffersWEBGL([${argumentsToString(arguments[0], { contextName, contextVariables, getEntity: getExtensionEntity, addVariable, variables, onUnrecognizedArgumentLookup })}]);`);
            return extension.drawBuffersWEBGL(arguments[0]);
        }
        let result = extension[property].apply(extension, arguments);
        switch (typeof result) {
          case 'undefined':
            recording.push(`${indent}${methodCallToString(property, arguments)};`);
            return;
          case 'number':
          case 'boolean':
            if (useTrackablePrimitives && contextVariables.indexOf(trackablePrimitive(result)) === -1) {
              recording.push(`${indent}const ${contextName}Variable${contextVariables.length} = ${methodCallToString(property, arguments)};`);
              contextVariables.push(result = trackablePrimitive(result));
            } else {
              recording.push(`${indent}const ${contextName}Variable${contextVariables.length} = ${methodCallToString(property, arguments)};`);
              contextVariables.push(result);
            }
            break;
          default:
            if (result === null) {
              recording.push(`${methodCallToString(property, arguments)};`);
            } else {
              recording.push(`${indent}const ${contextName}Variable${contextVariables.length} = ${methodCallToString(property, arguments)};`);
            }
            contextVariables.push(result);
        }
        return result;
      };
    }
    extensionEntityNames[extension[property]] = property;
    return extension[property];
  }

  function getExtensionEntity(value) {
    if (extensionEntityNames.hasOwnProperty(value)) {
      return `${contextName}.${extensionEntityNames[value]}`;
    }
    return getEntity(value);
  }

  function methodCallToString(method, args) {
    return `${contextName}.${method}(${argumentsToString(args, { contextName, contextVariables, getEntity: getExtensionEntity, addVariable, variables, onUnrecognizedArgumentLookup })})`;
  }

  function addVariable(value, source) {
    const variableName = `${contextName}Variable${contextVariables.length}`;
    contextVariables.push(value);
    recording.push(`${indent}const ${variableName} = ${source};`);
    return variableName;
  }
}

function argumentsToString(args, options) {
  const { variables, onUnrecognizedArgumentLookup } = options;
  return (Array.from(args).map((arg) => {
    const variableName = getVariableName(arg);
    if (variableName) {
      return variableName;
    }
    return argumentToString(arg, options);
  }).join(', '));

  function getVariableName(value) {
    if (variables) {
      for (const name in variables) {
        if (!variables.hasOwnProperty(name)) continue;
        if (variables[name] === value) {
          return name;
        }
      }
    }
    if (onUnrecognizedArgumentLookup) {
      return onUnrecognizedArgumentLookup(value);
    }
    return null;
  }
}

function argumentToString(arg, options) {
  const { contextName, contextVariables, getEntity, addVariable, onUnrecognizedArgumentLookup } = options;
  if (typeof arg === 'undefined') {
    return 'undefined';
  }
  if (arg === null) {
    return 'null';
  }
  const i = contextVariables.indexOf(arg);
  if (i > -1) {
    return `${contextName}Variable${i}`;
  }
  switch (arg.constructor.name) {
    case 'String':
      const hasLines = /\n/.test(arg);
      const hasSingleQuotes = /'/.test(arg);
      const hasDoubleQuotes = /"/.test(arg);
      if (hasLines) {
        return '`' + arg + '`';
      } else if (hasSingleQuotes && !hasDoubleQuotes) {
        return '"' + arg + '"';
      } else if (!hasSingleQuotes && hasDoubleQuotes) {
        return "'" + arg + "'";
      } else {
        return '\'' + arg + '\'';
      }
    case 'Number': return getEntity(arg);
    case 'Boolean': return getEntity(arg);
    case 'Array':
      return addVariable(arg, `new ${arg.constructor.name}([${Array.from(arg).join(',')}])`);
    case 'Float32Array':
    case 'Uint8Array':
    case 'Uint16Array':
    case 'Int32Array':
      return addVariable(arg, `new ${arg.constructor.name}(${JSON.stringify(Array.from(arg))})`);
    default:
      if (onUnrecognizedArgumentLookup) {
        const instantiationString = onUnrecognizedArgumentLookup(arg);
        if (instantiationString) {
          return instantiationString;
        }
      }
      throw new Error(`unrecognized argument type ${arg.constructor.name}`);
  }
}

function trackablePrimitive(value) {
  // wrapped in object, so track-able
  return new value.constructor(value);
}

if (true) {
  module.exports = { glWiretap, glExtensionWiretap };
}

if (typeof window !== 'undefined') {
  glWiretap.glExtensionWiretap = glExtensionWiretap;
  window.glWiretap = glWiretap;
}


/***/ }),

/***/ "./node_modules/gl/index.js":
/*!**********************************!*\
  !*** ./node_modules/gl/index.js ***!
  \**********************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

if (typeof WebGLRenderingContext !== 'undefined') {
  module.exports = __webpack_require__(/*! ./src/javascript/browser-index */ "./node_modules/gl/src/javascript/browser-index.js")
} else {
  module.exports = __webpack_require__(/*! ./src/javascript/node-index */ "./node_modules/gl/src/javascript/node-index.js")
}
module.exports.WebGLRenderingContext = __webpack_require__(/*! ./src/javascript/webgl-rendering-context */ "./node_modules/gl/src/javascript/webgl-rendering-context.js").WebGLRenderingContext


/***/ }),

/***/ "./node_modules/gl/src/javascript/browser-index.js":
/*!*********************************************************!*\
  !*** ./node_modules/gl/src/javascript/browser-index.js ***!
  \*********************************************************/
/***/ ((module) => {

function createContext (width, height, options) {
  width = width | 0
  height = height | 0
  if (!(width > 0 && height > 0)) {
    return null
  }

  const canvas = document.createElement('canvas')
  if (!canvas) {
    return null
  }

  /**
   * @type WebGLRenderingContext
   */
  let gl
  canvas.width = width
  canvas.height = height

  try {
    gl = canvas.getContext('webgl', options)
  } catch (e) {
    try {
      gl = canvas.getContext('experimental-webgl', options)
    } catch (e) {
      return null
    }
  }

  const _getExtension = gl.getExtension
  const extDestroy = {
    destroy: function () {
      const loseContext = _getExtension.call(gl, 'WEBGL_lose_context')
      if (loseContext) {
        loseContext.loseContext()
      }
    }
  }

  const extResize = {
    resize: function (w, h) {
      canvas.width = w
      canvas.height = h
    }
  }

  const _supportedExtensions = gl.getSupportedExtensions().slice()
  _supportedExtensions.push(
    'STACKGL_destroy_context',
    'STACKGL_resize_drawingbuffer')
  gl.getSupportedExtensions = function () {
    return _supportedExtensions.slice()
  }

  gl.getExtension = function (extName) {
    const name = extName.toLowerCase()
    if (name === 'stackgl_resize_drawingbuffer') {
      return extResize
    }
    if (name === 'stackgl_destroy_context') {
      return extDestroy
    }
    return _getExtension.call(gl, extName)
  }

  return gl || null
}

module.exports = createContext


/***/ }),

/***/ "./node_modules/gl/src/javascript/extensions/angle-instanced-arrays.js":
/*!*****************************************************************************!*\
  !*** ./node_modules/gl/src/javascript/extensions/angle-instanced-arrays.js ***!
  \*****************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { gl } = __webpack_require__(/*! ../native-gl */ "./node_modules/gl/src/javascript/native-gl.js")
const { vertexCount } = __webpack_require__(/*! ../utils */ "./node_modules/gl/src/javascript/utils.js")

class ANGLEInstancedArrays {
  constructor (ctx) {
    this.VERTEX_ATTRIB_ARRAY_DIVISOR_ANGLE = 0x88fe
    this.ctx = ctx

    this._drawArraysInstanced = gl._drawArraysInstanced.bind(ctx)
    this._drawElementsInstanced = gl._drawElementsInstanced.bind(ctx)
    this._vertexAttribDivisor = gl._vertexAttribDivisor.bind(ctx)
  }

  drawArraysInstancedANGLE (mode, first, count, primCount) {
    const { ctx } = this
    mode |= 0
    first |= 0
    count |= 0
    primCount |= 0
    if (first < 0 || count < 0 || primCount < 0) {
      ctx.setError(gl.INVALID_VALUE)
      return
    }
    if (!ctx._checkStencilState()) {
      return
    }
    const reducedCount = vertexCount(mode, count)
    if (reducedCount < 0) {
      ctx.setError(gl.INVALID_ENUM)
      return
    }
    if (!ctx._framebufferOk()) {
      return
    }
    if (count === 0 || primCount === 0) {
      return
    }
    let maxIndex = first
    if (count > 0) {
      maxIndex = (count + first - 1) >>> 0
    }
    if (this.checkInstancedVertexAttribState(maxIndex, primCount)) {
      return this._drawArraysInstanced(mode, first, reducedCount, primCount)
    }
  }

  drawElementsInstancedANGLE (mode, count, type, ioffset, primCount) {
    const { ctx } = this
    mode |= 0
    count |= 0
    type |= 0
    ioffset |= 0
    primCount |= 0

    if (count < 0 || ioffset < 0 || primCount < 0) {
      ctx.setError(gl.INVALID_VALUE)
      return
    }

    if (!ctx._checkStencilState()) {
      return
    }

    const elementBuffer = ctx._vertexObjectState._elementArrayBufferBinding
    if (!elementBuffer) {
      ctx.setError(gl.INVALID_OPERATION)
      return
    }

    // Unpack element data
    let elementData = null
    let offset = ioffset
    if (type === gl.UNSIGNED_SHORT) {
      if (offset % 2) {
        ctx.setError(gl.INVALID_OPERATION)
        return
      }
      offset >>= 1
      elementData = new Uint16Array(elementBuffer._elements.buffer)
    } else if (ctx._extensions.oes_element_index_uint && type === gl.UNSIGNED_INT) {
      if (offset % 4) {
        ctx.setError(gl.INVALID_OPERATION)
        return
      }
      offset >>= 2
      elementData = new Uint32Array(elementBuffer._elements.buffer)
    } else if (type === gl.UNSIGNED_BYTE) {
      elementData = elementBuffer._elements
    } else {
      ctx.setError(gl.INVALID_ENUM)
      return
    }

    let reducedCount = count
    switch (mode) {
      case gl.TRIANGLES:
        if (count % 3) {
          reducedCount -= (count % 3)
        }
        break
      case gl.LINES:
        if (count % 2) {
          reducedCount -= (count % 2)
        }
        break
      case gl.POINTS:
        break
      case gl.LINE_LOOP:
      case gl.LINE_STRIP:
        if (count < 2) {
          ctx.setError(gl.INVALID_OPERATION)
          return
        }
        break
      case gl.TRIANGLE_FAN:
      case gl.TRIANGLE_STRIP:
        if (count < 3) {
          ctx.setError(gl.INVALID_OPERATION)
          return
        }
        break
      default:
        ctx.setError(gl.INVALID_ENUM)
        return
    }

    if (!ctx._framebufferOk()) {
      return
    }

    if (count === 0 || primCount === 0) {
      this.checkInstancedVertexAttribState(0, 0)
      return
    }

    if ((count + offset) >>> 0 > elementData.length) {
      ctx.setError(gl.INVALID_OPERATION)
      return
    }

    // Compute max index
    let maxIndex = -1
    for (let i = offset; i < offset + count; ++i) {
      maxIndex = Math.max(maxIndex, elementData[i])
    }

    if (maxIndex < 0) {
      this.checkInstancedVertexAttribState(0, 0)
      return
    }

    if (this.checkInstancedVertexAttribState(maxIndex, primCount)) {
      if (reducedCount > 0) {
        this._drawElementsInstanced(mode, reducedCount, type, ioffset, primCount)
      }
    }
  }

  vertexAttribDivisorANGLE (index, divisor) {
    const { ctx } = this
    index |= 0
    divisor |= 0
    if (divisor < 0 ||
      index < 0 || index >= ctx._vertexObjectState._attribs.length) {
      ctx.setError(gl.INVALID_VALUE)
      return
    }
    const attrib = ctx._vertexObjectState._attribs[index]
    attrib._divisor = divisor
    this._vertexAttribDivisor(index, divisor)
  }

  checkInstancedVertexAttribState (maxIndex, primCount) {
    const { ctx } = this
    const program = ctx._activeProgram
    if (!program) {
      ctx.setError(gl.INVALID_OPERATION)
      return false
    }

    const attribs = ctx._vertexObjectState._attribs
    let hasZero = false
    for (let i = 0; i < attribs.length; ++i) {
      const attrib = attribs[i]
      if (attrib._isPointer) {
        const buffer = attrib._pointerBuffer
        if (program._attributes.indexOf(i) >= 0) {
          if (!buffer) {
            ctx.setError(gl.INVALID_OPERATION)
            return false
          }
          let maxByte = 0
          if (attrib._divisor === 0) {
            hasZero = true
            maxByte = attrib._pointerStride * maxIndex +
              attrib._pointerSize +
              attrib._pointerOffset
          } else {
            maxByte = attrib._pointerStride * (Math.ceil(primCount / attrib._divisor) - 1) +
              attrib._pointerSize +
              attrib._pointerOffset
          }
          if (maxByte > buffer._size) {
            ctx.setError(gl.INVALID_OPERATION)
            return false
          }
        }
      }
    }

    if (!hasZero) {
      ctx.setError(gl.INVALID_OPERATION)
      return false
    }

    return true
  }
}

function getANGLEInstancedArrays (ctx) {
  return new ANGLEInstancedArrays(ctx)
}

module.exports = { ANGLEInstancedArrays, getANGLEInstancedArrays }


/***/ }),

/***/ "./node_modules/gl/src/javascript/extensions/ext-blend-minmax.js":
/*!***********************************************************************!*\
  !*** ./node_modules/gl/src/javascript/extensions/ext-blend-minmax.js ***!
  \***********************************************************************/
/***/ ((module) => {

class EXTBlendMinMax {
  constructor () {
    this.MIN_EXT = 0x8007
    this.MAX_EXT = 0x8008
  }
}

function getEXTBlendMinMax (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('EXT_blend_minmax') >= 0) {
    result = new EXTBlendMinMax()
  }

  return result
}

module.exports = { getEXTBlendMinMax, EXTBlendMinMax }


/***/ }),

/***/ "./node_modules/gl/src/javascript/extensions/ext-texture-filter-anisotropic.js":
/*!*************************************************************************************!*\
  !*** ./node_modules/gl/src/javascript/extensions/ext-texture-filter-anisotropic.js ***!
  \*************************************************************************************/
/***/ ((module) => {

class EXTTextureFilterAnisotropic {
  constructor () {
    this.TEXTURE_MAX_ANISOTROPY_EXT = 0x84FE
    this.MAX_TEXTURE_MAX_ANISOTROPY_EXT = 0x84FF
  }
}

function getEXTTextureFilterAnisotropic (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('EXT_texture_filter_anisotropic') >= 0) {
    result = new EXTTextureFilterAnisotropic()
  }

  return result
}

module.exports = { getEXTTextureFilterAnisotropic, EXTTextureFilterAnisotropic }


/***/ }),

/***/ "./node_modules/gl/src/javascript/extensions/oes-element-index-unit.js":
/*!*****************************************************************************!*\
  !*** ./node_modules/gl/src/javascript/extensions/oes-element-index-unit.js ***!
  \*****************************************************************************/
/***/ ((module) => {

class OESElementIndexUint {}

function getOESElementIndexUint (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('OES_element_index_uint') >= 0) {
    result = new OESElementIndexUint()
  }

  return result
}

module.exports = { getOESElementIndexUint, OESElementIndexUint }


/***/ }),

/***/ "./node_modules/gl/src/javascript/extensions/oes-standard-derivatives.js":
/*!*******************************************************************************!*\
  !*** ./node_modules/gl/src/javascript/extensions/oes-standard-derivatives.js ***!
  \*******************************************************************************/
/***/ ((module) => {

class OESStandardDerivatives {
  constructor () {
    this.FRAGMENT_SHADER_DERIVATIVE_HINT_OES = 0x8B8B
  }
}

function getOESStandardDerivatives (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('OES_standard_derivatives') >= 0) {
    result = new OESStandardDerivatives()
  }

  return result
}

module.exports = { getOESStandardDerivatives, OESStandardDerivatives }


/***/ }),

/***/ "./node_modules/gl/src/javascript/extensions/oes-texture-float-linear.js":
/*!*******************************************************************************!*\
  !*** ./node_modules/gl/src/javascript/extensions/oes-texture-float-linear.js ***!
  \*******************************************************************************/
/***/ ((module) => {

class OESTextureFloatLinear {}

function getOESTextureFloatLinear (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('OES_texture_float_linear') >= 0) {
    result = new OESTextureFloatLinear()
  }

  return result
}

module.exports = { getOESTextureFloatLinear, OESTextureFloatLinear }


/***/ }),

/***/ "./node_modules/gl/src/javascript/extensions/oes-texture-float.js":
/*!************************************************************************!*\
  !*** ./node_modules/gl/src/javascript/extensions/oes-texture-float.js ***!
  \************************************************************************/
/***/ ((module) => {

class OESTextureFloat {}

function getOESTextureFloat (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('OES_texture_float') >= 0) {
    result = new OESTextureFloat()
  }

  return result
}

module.exports = { getOESTextureFloat, OESTextureFloat }


/***/ }),

/***/ "./node_modules/gl/src/javascript/extensions/oes-vertex-array-object.js":
/*!******************************************************************************!*\
  !*** ./node_modules/gl/src/javascript/extensions/oes-vertex-array-object.js ***!
  \******************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { Linkable } = __webpack_require__(/*! ../linkable */ "./node_modules/gl/src/javascript/linkable.js")
const { gl } = __webpack_require__(/*! ../native-gl */ "./node_modules/gl/src/javascript/native-gl.js")
const { checkObject } = __webpack_require__(/*! ../utils */ "./node_modules/gl/src/javascript/utils.js")
const { WebGLVertexArrayObjectState } = __webpack_require__(/*! ../webgl-vertex-attribute */ "./node_modules/gl/src/javascript/webgl-vertex-attribute.js")

class WebGLVertexArrayObjectOES extends Linkable {
  constructor (_, ctx, ext) {
    super(_)
    this._ctx = ctx
    this._ext = ext
    this._vertexState = new WebGLVertexArrayObjectState(ctx)
  }

  _performDelete () {
    // Clean up the vertex state to release references to buffers.
    this._vertexState.cleanUp()

    delete this._vertexState
    delete this._ext._vaos[this._]
    gl.deleteVertexArrayOES.call(this._ctx, this._ | 0)
  }
}

class OESVertexArrayObject {
  constructor (ctx) {
    this.VERTEX_ARRAY_BINDING_OES = 0x85B5

    this._ctx = ctx
    this._vaos = {}
    this._activeVertexArrayObject = null
  }

  createVertexArrayOES () {
    const { _ctx: ctx } = this
    const arrayId = gl.createVertexArrayOES.call(ctx)
    if (arrayId <= 0) return null
    const array = new WebGLVertexArrayObjectOES(arrayId, ctx, this)
    this._vaos[arrayId] = array
    return array
  }

  deleteVertexArrayOES (array) {
    const { _ctx: ctx } = this
    if (!checkObject(array)) {
      throw new TypeError('deleteVertexArrayOES(WebGLVertexArrayObjectOES)')
    }

    if (!(array instanceof WebGLVertexArrayObjectOES &&
      ctx._checkOwns(array))) {
      ctx.setError(gl.INVALID_OPERATION)
      return
    }

    if (array._pendingDelete) {
      return
    }

    if (this._activeVertexArrayObject === array) {
      this.bindVertexArrayOES(null)
    }

    array._pendingDelete = true
    array._checkDelete()
  }

  bindVertexArrayOES (array) {
    const { _ctx: ctx, _activeVertexArrayObject: activeVertexArrayObject } = this
    if (!checkObject(array)) {
      throw new TypeError('bindVertexArrayOES(WebGLVertexArrayObjectOES)')
    }

    if (!array) {
      array = null
      gl.bindVertexArrayOES.call(ctx, null)
    } else if (array instanceof WebGLVertexArrayObjectOES &&
      array._pendingDelete) {
      ctx.setError(gl.INVALID_OPERATION)
      return
    } else if (ctx._checkWrapper(array, WebGLVertexArrayObjectOES)) {
      gl.bindVertexArrayOES.call(ctx, array._)
    } else {
      return
    }

    if (activeVertexArrayObject !== array) {
      if (activeVertexArrayObject) {
        activeVertexArrayObject._refCount -= 1
        activeVertexArrayObject._checkDelete()
      }
      if (array) {
        array._refCount += 1
      }
    }

    if (array === null) {
      ctx._vertexObjectState = ctx._defaultVertexObjectState
    } else {
      ctx._vertexObjectState = array._vertexState
    }

    // Update the active vertex array object.
    this._activeVertexArrayObject = array
  }

  isVertexArrayOES (object) {
    const { _ctx: ctx } = this
    if (!ctx._isObject(object, 'isVertexArrayOES', WebGLVertexArrayObjectOES)) return false
    return gl.isVertexArrayOES.call(ctx, object._ | 0)
  }
}

function getOESVertexArrayObject (ctx) {
  const exts = ctx.getSupportedExtensions()

  if (exts && exts.indexOf('OES_vertex_array_object') >= 0) {
    return new OESVertexArrayObject(ctx)
  } else {
    return null
  }
}

module.exports = {
  WebGLVertexArrayObjectOES,
  OESVertexArrayObject,
  getOESVertexArrayObject
}


/***/ }),

/***/ "./node_modules/gl/src/javascript/extensions/stackgl-destroy-context.js":
/*!******************************************************************************!*\
  !*** ./node_modules/gl/src/javascript/extensions/stackgl-destroy-context.js ***!
  \******************************************************************************/
/***/ ((module) => {

class STACKGLDestroyContext {
  constructor (ctx) {
    this.destroy = ctx.destroy.bind(ctx)
  }
}

function getSTACKGLDestroyContext (ctx) {
  return new STACKGLDestroyContext(ctx)
}

module.exports = { getSTACKGLDestroyContext, STACKGLDestroyContext }


/***/ }),

/***/ "./node_modules/gl/src/javascript/extensions/stackgl-resize-drawing-buffer.js":
/*!************************************************************************************!*\
  !*** ./node_modules/gl/src/javascript/extensions/stackgl-resize-drawing-buffer.js ***!
  \************************************************************************************/
/***/ ((module) => {

class STACKGLResizeDrawingBuffer {
  constructor (ctx) {
    this.resize = ctx.resize.bind(ctx)
  }
}

function getSTACKGLResizeDrawingBuffer (ctx) {
  return new STACKGLResizeDrawingBuffer(ctx)
}

module.exports = { getSTACKGLResizeDrawingBuffer, STACKGLResizeDrawingBuffer }


/***/ }),

/***/ "./node_modules/gl/src/javascript/extensions/webgl-draw-buffers.js":
/*!*************************************************************************!*\
  !*** ./node_modules/gl/src/javascript/extensions/webgl-draw-buffers.js ***!
  \*************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { gl } = __webpack_require__(/*! ../native-gl */ "./node_modules/gl/src/javascript/native-gl.js")

class WebGLDrawBuffers {
  constructor (ctx) {
    this.ctx = ctx
    const exts = ctx.getSupportedExtensions()

    if (exts && exts.indexOf('WEBGL_draw_buffers') >= 0) {
      Object.assign(this, ctx.extWEBGL_draw_buffers())
      this._buffersState = [ctx.BACK]
      this._maxDrawBuffers = ctx._getParameterDirect(this.MAX_DRAW_BUFFERS_WEBGL)
      this._ALL_ATTACHMENTS = []
      this._ALL_COLOR_ATTACHMENTS = []
      const allColorAttachments = [
        this.COLOR_ATTACHMENT0_WEBGL,
        this.COLOR_ATTACHMENT1_WEBGL,
        this.COLOR_ATTACHMENT2_WEBGL,
        this.COLOR_ATTACHMENT3_WEBGL,
        this.COLOR_ATTACHMENT4_WEBGL,
        this.COLOR_ATTACHMENT5_WEBGL,
        this.COLOR_ATTACHMENT6_WEBGL,
        this.COLOR_ATTACHMENT7_WEBGL,
        this.COLOR_ATTACHMENT8_WEBGL,
        this.COLOR_ATTACHMENT9_WEBGL,
        this.COLOR_ATTACHMENT10_WEBGL,
        this.COLOR_ATTACHMENT11_WEBGL,
        this.COLOR_ATTACHMENT12_WEBGL,
        this.COLOR_ATTACHMENT13_WEBGL,
        this.COLOR_ATTACHMENT14_WEBGL,
        this.COLOR_ATTACHMENT15_WEBGL
      ]
      while (this._ALL_ATTACHMENTS.length < this._maxDrawBuffers) {
        const colorAttachment = allColorAttachments.shift()
        this._ALL_ATTACHMENTS.push(colorAttachment)
        this._ALL_COLOR_ATTACHMENTS.push(colorAttachment)
      }
      this._ALL_ATTACHMENTS.push(
        gl.DEPTH_ATTACHMENT,
        gl.STENCIL_ATTACHMENT,
        gl.DEPTH_STENCIL_ATTACHMENT
      )
    }
  }

  drawBuffersWEBGL (buffers) {
    const { ctx } = this
    if (buffers.length < 1) {
      ctx.setError(gl.INVALID_OPERATION)
      return
    }
    if (buffers.length === 1 && buffers[0] === gl.BACK) {
      this._buffersState = buffers
      ctx.drawBuffersWEBGL([this.COLOR_ATTACHMENT0_WEBGL])
      return
    } else if (!ctx._activeFramebuffer) {
      if (buffers.length > 1) {
        ctx.setError(gl.INVALID_OPERATION)
        return
      }
      for (let i = 0; i < buffers.length; i++) {
        if (buffers[i] > gl.NONE) {
          ctx.setError(gl.INVALID_OPERATION)
          return
        }
      }
    }
    this._buffersState = buffers
    ctx.drawBuffersWEBGL(buffers)
  }
}

function getWebGLDrawBuffers (ctx) {
  const exts = ctx.getSupportedExtensions()

  if (exts && exts.indexOf('WEBGL_draw_buffers') >= 0) {
    return new WebGLDrawBuffers(ctx)
  } else {
    return null
  }
}

module.exports = {
  getWebGLDrawBuffers,
  WebGLDrawBuffers
}


/***/ }),

/***/ "./node_modules/gl/src/javascript/linkable.js":
/*!****************************************************!*\
  !*** ./node_modules/gl/src/javascript/linkable.js ***!
  \****************************************************/
/***/ ((module) => {

class Linkable {
  constructor (_) {
    this._ = _
    this._references = []
    this._refCount = 0
    this._pendingDelete = false
    this._binding = 0
  }

  _link (b) {
    this._references.push(b)
    b._refCount += 1
    return true
  }

  _unlink (b) {
    let idx = this._references.indexOf(b)
    if (idx < 0) {
      return false
    }
    while (idx >= 0) {
      this._references[idx] = this._references[this._references.length - 1]
      this._references.pop()
      b._refCount -= 1
      b._checkDelete()
      idx = this._references.indexOf(b)
    }
    return true
  }

  _linked (b) {
    return this._references.indexOf(b) >= 0
  }

  _checkDelete () {
    if (this._refCount <= 0 &&
      this._pendingDelete &&
      this._ !== 0) {
      while (this._references.length > 0) {
        this._unlink(this._references[0])
      }
      this._performDelete()
      this._ = 0
    }
  }

  _performDelete () {}
}

module.exports = { Linkable }


/***/ }),

/***/ "./node_modules/gl/src/javascript/native-gl.js":
/*!*****************************************************!*\
  !*** ./node_modules/gl/src/javascript/native-gl.js ***!
  \*****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const NativeWebGL = __webpack_require__(/*! bindings */ "./node_modules/bindings/bindings.js")('webgl')
const { WebGLRenderingContext: NativeWebGLRenderingContext } = NativeWebGL
process.on('exit', NativeWebGL.cleanup)

const gl = NativeWebGLRenderingContext.prototype

// from binding.gyp
delete gl['1.0.0']

// from binding.gyp
delete NativeWebGLRenderingContext['1.0.0']

module.exports = { gl, NativeWebGL, NativeWebGLRenderingContext }


/***/ }),

/***/ "./node_modules/gl/src/javascript/node-index.js":
/*!******************************************************!*\
  !*** ./node_modules/gl/src/javascript/node-index.js ***!
  \******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const bits = __webpack_require__(/*! bit-twiddle */ "./node_modules/bit-twiddle/twiddle.js")
const { WebGLContextAttributes } = __webpack_require__(/*! ./webgl-context-attributes */ "./node_modules/gl/src/javascript/webgl-context-attributes.js")
const { WebGLRenderingContext, wrapContext } = __webpack_require__(/*! ./webgl-rendering-context */ "./node_modules/gl/src/javascript/webgl-rendering-context.js")
const { WebGLTextureUnit } = __webpack_require__(/*! ./webgl-texture-unit */ "./node_modules/gl/src/javascript/webgl-texture-unit.js")
const { WebGLVertexArrayObjectState, WebGLVertexArrayGlobalState } = __webpack_require__(/*! ./webgl-vertex-attribute */ "./node_modules/gl/src/javascript/webgl-vertex-attribute.js")

let CONTEXT_COUNTER = 0

function flag (options, name, dflt) {
  if (!options || !(typeof options === 'object') || !(name in options)) {
    return dflt
  }
  return !!options[name]
}

function createContext (width, height, options) {
  width = width | 0
  height = height | 0
  if (!(width > 0 && height > 0)) {
    return null
  }

  const contextAttributes = new WebGLContextAttributes(
    flag(options, 'alpha', true),
    flag(options, 'depth', true),
    flag(options, 'stencil', false),
    false, // flag(options, 'antialias', true),
    flag(options, 'premultipliedAlpha', true),
    flag(options, 'preserveDrawingBuffer', false),
    flag(options, 'preferLowPowerToHighPerformance', false),
    flag(options, 'failIfMajorPerformanceCaveat', false))

  // Can only use premultipliedAlpha if alpha is set
  contextAttributes.premultipliedAlpha =
    contextAttributes.premultipliedAlpha && contextAttributes.alpha

  let ctx
  try {
    ctx = new WebGLRenderingContext(
      1,
      1,
      contextAttributes.alpha,
      contextAttributes.depth,
      contextAttributes.stencil,
      contextAttributes.antialias,
      contextAttributes.premultipliedAlpha,
      contextAttributes.preserveDrawingBuffer,
      contextAttributes.preferLowPowerToHighPerformance,
      contextAttributes.failIfMajorPerformanceCaveat)
  } catch (e) {}
  if (!ctx) {
    return null
  }

  ctx.drawingBufferWidth = width
  ctx.drawingBufferHeight = height

  ctx._ = CONTEXT_COUNTER++

  ctx._contextAttributes = contextAttributes

  ctx._extensions = {}
  ctx._programs = {}
  ctx._shaders = {}
  ctx._buffers = {}
  ctx._textures = {}
  ctx._framebuffers = {}
  ctx._renderbuffers = {}

  ctx._activeProgram = null
  ctx._activeFramebuffer = null
  ctx._activeRenderbuffer = null
  ctx._checkStencil = false
  ctx._stencilState = true

  // Initialize texture units
  const numTextures = ctx.getParameter(ctx.MAX_COMBINED_TEXTURE_IMAGE_UNITS)
  ctx._textureUnits = new Array(numTextures)
  for (let i = 0; i < numTextures; ++i) {
    ctx._textureUnits[i] = new WebGLTextureUnit(i)
  }
  ctx._activeTextureUnit = 0
  ctx.activeTexture(ctx.TEXTURE0)

  ctx._errorStack = []

  // Vertex array attributes that are in vertex array objects.
  ctx._defaultVertexObjectState = new WebGLVertexArrayObjectState(ctx)
  ctx._vertexObjectState = ctx._defaultVertexObjectState

  // Vertex array attibures that are not in vertex array objects.
  ctx._vertexGlobalState = new WebGLVertexArrayGlobalState(ctx)

  // Store limits
  ctx._maxTextureSize = ctx.getParameter(ctx.MAX_TEXTURE_SIZE)
  ctx._maxTextureLevel = bits.log2(bits.nextPow2(ctx._maxTextureSize))
  ctx._maxCubeMapSize = ctx.getParameter(ctx.MAX_CUBE_MAP_TEXTURE_SIZE)
  ctx._maxCubeMapLevel = bits.log2(bits.nextPow2(ctx._maxCubeMapSize))

  // Unpack alignment
  ctx._unpackAlignment = 4
  ctx._packAlignment = 4

  // Allocate framebuffer
  ctx._allocateDrawingBuffer(width, height)

  const attrib0Buffer = ctx.createBuffer()
  ctx._attrib0Buffer = attrib0Buffer

  // Initialize defaults
  ctx.bindBuffer(ctx.ARRAY_BUFFER, null)
  ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, null)
  ctx.bindFramebuffer(ctx.FRAMEBUFFER, null)
  ctx.bindRenderbuffer(ctx.RENDERBUFFER, null)

  // Set viewport and scissor
  ctx.viewport(0, 0, width, height)
  ctx.scissor(0, 0, width, height)

  // Clear buffers
  ctx.clearDepth(1)
  ctx.clearColor(0, 0, 0, 0)
  ctx.clearStencil(0)
  ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT | ctx.STENCIL_BUFFER_BIT)

  return wrapContext(ctx)
}

module.exports = createContext


/***/ }),

/***/ "./node_modules/gl/src/javascript/utils.js":
/*!*************************************************!*\
  !*** ./node_modules/gl/src/javascript/utils.js ***!
  \*************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { gl } = __webpack_require__(/*! ./native-gl */ "./node_modules/gl/src/javascript/native-gl.js")

const { WebGLUniformLocation } = __webpack_require__(/*! ./webgl-uniform-location */ "./node_modules/gl/src/javascript/webgl-uniform-location.js")

function bindPublics (props, wrapper, privateInstance, privateMethods) {
  for (let i = 0; i < props.length; i++) {
    const prop = props[i]
    const value = privateInstance[prop]
    if (typeof value === 'function') {
      if (privateMethods.indexOf(prop) === -1) {
        wrapper[prop] = value.bind(privateInstance)
      }
    } else {
      if (prop[0] === '_' ||
        prop[0] === '0' ||
        prop[0] === '1') {
        continue
      }
      wrapper[prop] = value
    }
  }
}

function checkObject (object) {
  return typeof object === 'object' ||
    (object === undefined)
}

function checkUniform (program, location) {
  return location instanceof WebGLUniformLocation &&
    location._program === program &&
    location._linkCount === program._linkCount
}

function isTypedArray (data) {
  return data instanceof Uint8Array ||
    data instanceof Uint8ClampedArray ||
    data instanceof Int8Array ||
    data instanceof Uint16Array ||
    data instanceof Int16Array ||
    data instanceof Uint32Array ||
    data instanceof Int32Array ||
    data instanceof Float32Array ||
    data instanceof Float64Array
}

// Don't allow: ", $, `, @, \, ', \0
function isValidString (str) {
  // Remove comments first
  const c = str.replace(/(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s;])+\/\/(?:.*)$)/gm, '')
  return !(/["$`@\\'\0]/.test(c))
}

function vertexCount (primitive, count) {
  switch (primitive) {
    case gl.TRIANGLES:
      return count - (count % 3)
    case gl.LINES:
      return count - (count % 2)
    case gl.LINE_LOOP:
    case gl.POINTS:
      return count
    case gl.TRIANGLE_FAN:
    case gl.LINE_STRIP:
      if (count < 2) {
        return 0
      }
      return count
    case gl.TRIANGLE_STRIP:
      if (count < 3) {
        return 0
      }
      return count
    default:
      return -1
  }
}

function typeSize (type) {
  switch (type) {
    case gl.UNSIGNED_BYTE:
    case gl.BYTE:
      return 1
    case gl.UNSIGNED_SHORT:
    case gl.SHORT:
      return 2
    case gl.UNSIGNED_INT:
    case gl.INT:
    case gl.FLOAT:
      return 4
  }
  return 0
}

function uniformTypeSize (type) {
  switch (type) {
    case gl.BOOL_VEC4:
    case gl.INT_VEC4:
    case gl.FLOAT_VEC4:
      return 4

    case gl.BOOL_VEC3:
    case gl.INT_VEC3:
    case gl.FLOAT_VEC3:
      return 3

    case gl.BOOL_VEC2:
    case gl.INT_VEC2:
    case gl.FLOAT_VEC2:
      return 2

    case gl.BOOL:
    case gl.INT:
    case gl.FLOAT:
    case gl.SAMPLER_2D:
    case gl.SAMPLER_CUBE:
      return 1

    default:
      return 0
  }
}

function unpackTypedArray (array) {
  return (new Uint8Array(array.buffer)).subarray(
    array.byteOffset,
    array.byteLength + array.byteOffset)
}

function extractImageData (pixels) {
  if (typeof pixels === 'object' && typeof pixels.width !== 'undefined' && typeof pixels.height !== 'undefined') {
    if (typeof pixels.data !== 'undefined') {
      return pixels
    }

    let context = null

    if (typeof pixels.getContext === 'function') {
      context = pixels.getContext('2d')
    } else if (typeof pixels.src !== 'undefined' && typeof document === 'object' && typeof document.createElement === 'function') {
      const canvas = document.createElement('canvas')

      if (typeof canvas === 'object' && typeof canvas.getContext === 'function') {
        canvas.width = pixels.width
        canvas.height = pixels.height
        context = canvas.getContext('2d')

        if (context !== null) {
          context.drawImage(pixels, 0, 0)
        }
      }
    }

    if (context !== null) {
      return context.getImageData(0, 0, pixels.width, pixels.height)
    }
  }

  return null
}

function formatSize (internalFormat) {
  switch (internalFormat) {
    case gl.ALPHA:
    case gl.LUMINANCE:
      return 1
    case gl.LUMINANCE_ALPHA:
      return 2
    case gl.RGB:
      return 3
    case gl.RGBA:
      return 4
  }
  return 0
}

function convertPixels (pixels) {
  if (typeof pixels === 'object' && pixels !== null) {
    if (pixels instanceof ArrayBuffer) {
      return new Uint8Array(pixels)
    } else if (pixels instanceof Uint8Array ||
      pixels instanceof Uint16Array ||
      pixels instanceof Uint8ClampedArray ||
      pixels instanceof Float32Array) {
      return unpackTypedArray(pixels)
    } else if (pixels instanceof Buffer) {
      return new Uint8Array(pixels)
    }
  }
  return null
}

function checkFormat (format) {
  return (
    format === gl.ALPHA ||
    format === gl.LUMINANCE_ALPHA ||
    format === gl.LUMINANCE ||
    format === gl.RGB ||
    format === gl.RGBA)
}

function validCubeTarget (target) {
  return target === gl.TEXTURE_CUBE_MAP_POSITIVE_X ||
    target === gl.TEXTURE_CUBE_MAP_NEGATIVE_X ||
    target === gl.TEXTURE_CUBE_MAP_POSITIVE_Y ||
    target === gl.TEXTURE_CUBE_MAP_NEGATIVE_Y ||
    target === gl.TEXTURE_CUBE_MAP_POSITIVE_Z ||
    target === gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
}

module.exports = {
  bindPublics,
  checkObject,
  isTypedArray,
  isValidString,
  vertexCount,
  typeSize,
  uniformTypeSize,
  unpackTypedArray,
  extractImageData,
  formatSize,
  checkFormat,
  checkUniform,
  convertPixels,
  validCubeTarget
}


/***/ }),

/***/ "./node_modules/gl/src/javascript/webgl-active-info.js":
/*!*************************************************************!*\
  !*** ./node_modules/gl/src/javascript/webgl-active-info.js ***!
  \*************************************************************/
/***/ ((module) => {

class WebGLActiveInfo {
  constructor (_) {
    this.size = _.size
    this.type = _.type
    this.name = _.name
  }
}
module.exports = { WebGLActiveInfo }


/***/ }),

/***/ "./node_modules/gl/src/javascript/webgl-buffer.js":
/*!********************************************************!*\
  !*** ./node_modules/gl/src/javascript/webgl-buffer.js ***!
  \********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { Linkable } = __webpack_require__(/*! ./linkable */ "./node_modules/gl/src/javascript/linkable.js")
const { gl } = __webpack_require__(/*! ./native-gl */ "./node_modules/gl/src/javascript/native-gl.js")

class WebGLBuffer extends Linkable {
  constructor (_, ctx) {
    super(_)
    this._ctx = ctx
    this._size = 0
    this._elements = new Uint8Array(0)
  }

  _performDelete () {
    const ctx = this._ctx
    delete ctx._buffers[this._ | 0]
    gl.deleteBuffer.call(ctx, this._ | 0)
  }
}

module.exports = { WebGLBuffer }


/***/ }),

/***/ "./node_modules/gl/src/javascript/webgl-context-attributes.js":
/*!********************************************************************!*\
  !*** ./node_modules/gl/src/javascript/webgl-context-attributes.js ***!
  \********************************************************************/
/***/ ((module) => {

class WebGLContextAttributes {
  constructor (
    alpha,
    depth,
    stencil,
    antialias,
    premultipliedAlpha,
    preserveDrawingBuffer,
    preferLowPowerToHighPerformance,
    failIfMajorPerformanceCaveat) {
    this.alpha = alpha
    this.depth = depth
    this.stencil = stencil
    this.antialias = antialias
    this.premultipliedAlpha = premultipliedAlpha
    this.preserveDrawingBuffer = preserveDrawingBuffer
    this.preferLowPowerToHighPerformance = preferLowPowerToHighPerformance
    this.failIfMajorPerformanceCaveat = failIfMajorPerformanceCaveat
  }
}

module.exports = { WebGLContextAttributes }


/***/ }),

/***/ "./node_modules/gl/src/javascript/webgl-drawing-buffer-wrapper.js":
/*!************************************************************************!*\
  !*** ./node_modules/gl/src/javascript/webgl-drawing-buffer-wrapper.js ***!
  \************************************************************************/
/***/ ((module) => {

class WebGLDrawingBufferWrapper {
  constructor (framebuffer, color, depthStencil) {
    this._framebuffer = framebuffer
    this._color = color
    this._depthStencil = depthStencil
  }
}

module.exports = { WebGLDrawingBufferWrapper }


/***/ }),

/***/ "./node_modules/gl/src/javascript/webgl-framebuffer.js":
/*!*************************************************************!*\
  !*** ./node_modules/gl/src/javascript/webgl-framebuffer.js ***!
  \*************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { Linkable } = __webpack_require__(/*! ./linkable */ "./node_modules/gl/src/javascript/linkable.js")
const { gl } = __webpack_require__(/*! ./native-gl */ "./node_modules/gl/src/javascript/native-gl.js")

class WebGLFramebuffer extends Linkable {
  constructor (_, ctx) {
    super(_)
    this._ctx = ctx
    this._binding = 0

    this._width = 0
    this._height = 0
    this._status = null

    this._attachments = {}
    this._attachments[gl.COLOR_ATTACHMENT0] = null
    this._attachments[gl.DEPTH_ATTACHMENT] = null
    this._attachments[gl.STENCIL_ATTACHMENT] = null
    this._attachments[gl.DEPTH_STENCIL_ATTACHMENT] = null

    this._attachmentLevel = {}
    this._attachmentLevel[gl.COLOR_ATTACHMENT0] = 0
    this._attachmentLevel[gl.DEPTH_ATTACHMENT] = 0
    this._attachmentLevel[gl.STENCIL_ATTACHMENT] = 0
    this._attachmentLevel[gl.DEPTH_STENCIL_ATTACHMENT] = 0

    this._attachmentFace = {}
    this._attachmentFace[gl.COLOR_ATTACHMENT0] = 0
    this._attachmentFace[gl.DEPTH_ATTACHMENT] = 0
    this._attachmentFace[gl.STENCIL_ATTACHMENT] = 0
    this._attachmentFace[gl.DEPTH_STENCIL_ATTACHMENT] = 0

    if (ctx._extensions.webgl_draw_buffers) {
      const { webgl_draw_buffers: WebGLDrawBuffers } = ctx._extensions // eslint-disable-line
      this._attachments[WebGLDrawBuffers.COLOR_ATTACHMENT1_WEBGL] = null
      this._attachments[WebGLDrawBuffers.COLOR_ATTACHMENT2_WEBGL] = null
      this._attachments[WebGLDrawBuffers.COLOR_ATTACHMENT3_WEBGL] = null
      this._attachments[WebGLDrawBuffers.COLOR_ATTACHMENT4_WEBGL] = null
      this._attachments[WebGLDrawBuffers.COLOR_ATTACHMENT5_WEBGL] = null
      this._attachments[WebGLDrawBuffers.COLOR_ATTACHMENT6_WEBGL] = null
      this._attachments[WebGLDrawBuffers.COLOR_ATTACHMENT7_WEBGL] = null
      this._attachments[WebGLDrawBuffers.COLOR_ATTACHMENT8_WEBGL] = null
      this._attachments[WebGLDrawBuffers.COLOR_ATTACHMENT9_WEBGL] = null
      this._attachments[WebGLDrawBuffers.COLOR_ATTACHMENT10_WEBGL] = null
      this._attachments[WebGLDrawBuffers.COLOR_ATTACHMENT11_WEBGL] = null
      this._attachments[WebGLDrawBuffers.COLOR_ATTACHMENT12_WEBGL] = null
      this._attachments[WebGLDrawBuffers.COLOR_ATTACHMENT13_WEBGL] = null
      this._attachments[WebGLDrawBuffers.COLOR_ATTACHMENT14_WEBGL] = null
      this._attachments[WebGLDrawBuffers.COLOR_ATTACHMENT15_WEBGL] = null
      this._attachments[gl.NONE] = null
      this._attachments[gl.BACK] = null

      this._attachmentLevel[WebGLDrawBuffers.COLOR_ATTACHMENT1_WEBGL] = 0
      this._attachmentLevel[WebGLDrawBuffers.COLOR_ATTACHMENT2_WEBGL] = 0
      this._attachmentLevel[WebGLDrawBuffers.COLOR_ATTACHMENT3_WEBGL] = 0
      this._attachmentLevel[WebGLDrawBuffers.COLOR_ATTACHMENT4_WEBGL] = 0
      this._attachmentLevel[WebGLDrawBuffers.COLOR_ATTACHMENT5_WEBGL] = 0
      this._attachmentLevel[WebGLDrawBuffers.COLOR_ATTACHMENT6_WEBGL] = 0
      this._attachmentLevel[WebGLDrawBuffers.COLOR_ATTACHMENT7_WEBGL] = 0
      this._attachmentLevel[WebGLDrawBuffers.COLOR_ATTACHMENT8_WEBGL] = 0
      this._attachmentLevel[WebGLDrawBuffers.COLOR_ATTACHMENT9_WEBGL] = 0
      this._attachmentLevel[WebGLDrawBuffers.COLOR_ATTACHMENT10_WEBGL] = 0
      this._attachmentLevel[WebGLDrawBuffers.COLOR_ATTACHMENT11_WEBGL] = 0
      this._attachmentLevel[WebGLDrawBuffers.COLOR_ATTACHMENT12_WEBGL] = 0
      this._attachmentLevel[WebGLDrawBuffers.COLOR_ATTACHMENT13_WEBGL] = 0
      this._attachmentLevel[WebGLDrawBuffers.COLOR_ATTACHMENT14_WEBGL] = 0
      this._attachmentLevel[WebGLDrawBuffers.COLOR_ATTACHMENT15_WEBGL] = 0
      this._attachmentLevel[gl.NONE] = null
      this._attachmentLevel[gl.BACK] = null

      this._attachmentFace[WebGLDrawBuffers.COLOR_ATTACHMENT1_WEBGL] = 0
      this._attachmentFace[WebGLDrawBuffers.COLOR_ATTACHMENT2_WEBGL] = 0
      this._attachmentFace[WebGLDrawBuffers.COLOR_ATTACHMENT3_WEBGL] = 0
      this._attachmentFace[WebGLDrawBuffers.COLOR_ATTACHMENT4_WEBGL] = 0
      this._attachmentFace[WebGLDrawBuffers.COLOR_ATTACHMENT5_WEBGL] = 0
      this._attachmentFace[WebGLDrawBuffers.COLOR_ATTACHMENT6_WEBGL] = 0
      this._attachmentFace[WebGLDrawBuffers.COLOR_ATTACHMENT7_WEBGL] = 0
      this._attachmentFace[WebGLDrawBuffers.COLOR_ATTACHMENT8_WEBGL] = 0
      this._attachmentFace[WebGLDrawBuffers.COLOR_ATTACHMENT9_WEBGL] = 0
      this._attachmentFace[WebGLDrawBuffers.COLOR_ATTACHMENT10_WEBGL] = 0
      this._attachmentFace[WebGLDrawBuffers.COLOR_ATTACHMENT11_WEBGL] = 0
      this._attachmentFace[WebGLDrawBuffers.COLOR_ATTACHMENT12_WEBGL] = 0
      this._attachmentFace[WebGLDrawBuffers.COLOR_ATTACHMENT13_WEBGL] = 0
      this._attachmentFace[WebGLDrawBuffers.COLOR_ATTACHMENT14_WEBGL] = 0
      this._attachmentFace[WebGLDrawBuffers.COLOR_ATTACHMENT15_WEBGL] = 0
      this._attachmentFace[gl.NONE] = null
      this._attachmentFace[gl.BACK] = null
    }
  }

  _clearAttachment (attachment) {
    const object = this._attachments[attachment]
    if (!object) {
      return
    }
    this._attachments[attachment] = null
    this._unlink(object)
  }

  _setAttachment (object, attachment) {
    const prevObject = this._attachments[attachment]
    if (prevObject === object) {
      return
    }

    this._clearAttachment(attachment)
    if (!object) {
      return
    }

    this._attachments[attachment] = object

    this._link(object)
  }

  _performDelete () {
    const ctx = this._ctx
    delete ctx._framebuffers[this._ | 0]
    gl.deleteFramebuffer.call(ctx, this._ | 0)
  }
}

module.exports = { WebGLFramebuffer }


/***/ }),

/***/ "./node_modules/gl/src/javascript/webgl-program.js":
/*!*********************************************************!*\
  !*** ./node_modules/gl/src/javascript/webgl-program.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { Linkable } = __webpack_require__(/*! ./linkable */ "./node_modules/gl/src/javascript/linkable.js")
const { gl } = __webpack_require__(/*! ./native-gl */ "./node_modules/gl/src/javascript/native-gl.js")

class WebGLProgram extends Linkable {
  constructor (_, ctx) {
    super(_)
    this._ctx = ctx
    this._linkCount = 0
    this._linkStatus = false
    this._linkInfoLog = 'not linked'
    this._attributes = []
    this._uniforms = []
  }

  _performDelete () {
    const ctx = this._ctx
    delete ctx._programs[this._ | 0]
    gl.deleteProgram.call(ctx, this._ | 0)
  }
}

module.exports = { WebGLProgram }


/***/ }),

/***/ "./node_modules/gl/src/javascript/webgl-renderbuffer.js":
/*!**************************************************************!*\
  !*** ./node_modules/gl/src/javascript/webgl-renderbuffer.js ***!
  \**************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { Linkable } = __webpack_require__(/*! ./linkable */ "./node_modules/gl/src/javascript/linkable.js")
const { gl } = __webpack_require__(/*! ./native-gl */ "./node_modules/gl/src/javascript/native-gl.js")

class WebGLRenderbuffer extends Linkable {
  constructor (_, ctx) {
    super(_)
    this._ctx = ctx
    this._binding = 0
    this._width = 0
    this._height = 0
    this._format = 0
  }

  _performDelete () {
    const ctx = this._ctx
    delete ctx._renderbuffers[this._ | 0]
    gl.deleteRenderbuffer.call(ctx, this._ | 0)
  }
}

module.exports = { WebGLRenderbuffer }


/***/ }),

/***/ "./node_modules/gl/src/javascript/webgl-rendering-context.js":
/*!*******************************************************************!*\
  !*** ./node_modules/gl/src/javascript/webgl-rendering-context.js ***!
  \*******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const bits = __webpack_require__(/*! bit-twiddle */ "./node_modules/bit-twiddle/twiddle.js")
const tokenize = __webpack_require__(/*! glsl-tokenizer/string */ "./node_modules/glsl-tokenizer/string.js")
const HEADLESS_VERSION = (__webpack_require__(/*! ../../package.json */ "./node_modules/gl/package.json").version)
const { gl, NativeWebGLRenderingContext, NativeWebGL } = __webpack_require__(/*! ./native-gl */ "./node_modules/gl/src/javascript/native-gl.js")
const { getANGLEInstancedArrays } = __webpack_require__(/*! ./extensions/angle-instanced-arrays */ "./node_modules/gl/src/javascript/extensions/angle-instanced-arrays.js")
const { getOESElementIndexUint } = __webpack_require__(/*! ./extensions/oes-element-index-unit */ "./node_modules/gl/src/javascript/extensions/oes-element-index-unit.js")
const { getOESStandardDerivatives } = __webpack_require__(/*! ./extensions/oes-standard-derivatives */ "./node_modules/gl/src/javascript/extensions/oes-standard-derivatives.js")
const { getOESTextureFloat } = __webpack_require__(/*! ./extensions/oes-texture-float */ "./node_modules/gl/src/javascript/extensions/oes-texture-float.js")
const { getOESTextureFloatLinear } = __webpack_require__(/*! ./extensions/oes-texture-float-linear */ "./node_modules/gl/src/javascript/extensions/oes-texture-float-linear.js")
const { getSTACKGLDestroyContext } = __webpack_require__(/*! ./extensions/stackgl-destroy-context */ "./node_modules/gl/src/javascript/extensions/stackgl-destroy-context.js")
const { getSTACKGLResizeDrawingBuffer } = __webpack_require__(/*! ./extensions/stackgl-resize-drawing-buffer */ "./node_modules/gl/src/javascript/extensions/stackgl-resize-drawing-buffer.js")
const { getWebGLDrawBuffers } = __webpack_require__(/*! ./extensions/webgl-draw-buffers */ "./node_modules/gl/src/javascript/extensions/webgl-draw-buffers.js")
const { getEXTBlendMinMax } = __webpack_require__(/*! ./extensions/ext-blend-minmax */ "./node_modules/gl/src/javascript/extensions/ext-blend-minmax.js")
const { getEXTTextureFilterAnisotropic } = __webpack_require__(/*! ./extensions/ext-texture-filter-anisotropic */ "./node_modules/gl/src/javascript/extensions/ext-texture-filter-anisotropic.js")
const { getOESVertexArrayObject } = __webpack_require__(/*! ./extensions/oes-vertex-array-object */ "./node_modules/gl/src/javascript/extensions/oes-vertex-array-object.js")
const {
  bindPublics,
  checkObject,
  checkUniform,
  formatSize,
  isValidString,
  typeSize,
  uniformTypeSize,
  extractImageData,
  vertexCount,
  isTypedArray,
  unpackTypedArray,
  convertPixels,
  checkFormat,
  validCubeTarget
} = __webpack_require__(/*! ./utils */ "./node_modules/gl/src/javascript/utils.js")

const { WebGLActiveInfo } = __webpack_require__(/*! ./webgl-active-info */ "./node_modules/gl/src/javascript/webgl-active-info.js")
const { WebGLFramebuffer } = __webpack_require__(/*! ./webgl-framebuffer */ "./node_modules/gl/src/javascript/webgl-framebuffer.js")
const { WebGLBuffer } = __webpack_require__(/*! ./webgl-buffer */ "./node_modules/gl/src/javascript/webgl-buffer.js")
const { WebGLDrawingBufferWrapper } = __webpack_require__(/*! ./webgl-drawing-buffer-wrapper */ "./node_modules/gl/src/javascript/webgl-drawing-buffer-wrapper.js")
const { WebGLProgram } = __webpack_require__(/*! ./webgl-program */ "./node_modules/gl/src/javascript/webgl-program.js")
const { WebGLRenderbuffer } = __webpack_require__(/*! ./webgl-renderbuffer */ "./node_modules/gl/src/javascript/webgl-renderbuffer.js")
const { WebGLShader } = __webpack_require__(/*! ./webgl-shader */ "./node_modules/gl/src/javascript/webgl-shader.js")
const { WebGLShaderPrecisionFormat } = __webpack_require__(/*! ./webgl-shader-precision-format */ "./node_modules/gl/src/javascript/webgl-shader-precision-format.js")
const { WebGLTexture } = __webpack_require__(/*! ./webgl-texture */ "./node_modules/gl/src/javascript/webgl-texture.js")
const { WebGLUniformLocation } = __webpack_require__(/*! ./webgl-uniform-location */ "./node_modules/gl/src/javascript/webgl-uniform-location.js")

// These are defined by the WebGL spec
const MAX_UNIFORM_LENGTH = 256
const MAX_ATTRIBUTE_LENGTH = 256

const DEFAULT_ATTACHMENTS = [
  gl.COLOR_ATTACHMENT0,
  gl.DEPTH_ATTACHMENT,
  gl.STENCIL_ATTACHMENT,
  gl.DEPTH_STENCIL_ATTACHMENT
]

const DEFAULT_COLOR_ATTACHMENTS = [gl.COLOR_ATTACHMENT0]

const availableExtensions = {
  angle_instanced_arrays: getANGLEInstancedArrays,
  oes_element_index_uint: getOESElementIndexUint,
  oes_texture_float: getOESTextureFloat,
  oes_texture_float_linear: getOESTextureFloatLinear,
  oes_standard_derivatives: getOESStandardDerivatives,
  oes_vertex_array_object: getOESVertexArrayObject,
  stackgl_destroy_context: getSTACKGLDestroyContext,
  stackgl_resize_drawingbuffer: getSTACKGLResizeDrawingBuffer,
  webgl_draw_buffers: getWebGLDrawBuffers,
  ext_blend_minmax: getEXTBlendMinMax,
  ext_texture_filter_anisotropic: getEXTTextureFilterAnisotropic
}

const privateMethods = [
  'resize',
  'destroy'
]

function wrapContext (ctx) {
  const wrapper = new WebGLRenderingContext()
  bindPublics(Object.keys(ctx), wrapper, ctx, privateMethods)
  bindPublics(Object.keys(ctx.constructor.prototype), wrapper, ctx, privateMethods)
  bindPublics(Object.getOwnPropertyNames(ctx), wrapper, ctx, privateMethods)
  bindPublics(Object.getOwnPropertyNames(ctx.constructor.prototype), wrapper, ctx, privateMethods)

  Object.defineProperties(wrapper, {
    drawingBufferWidth: {
      get () { return ctx.drawingBufferWidth },
      set (value) { ctx.drawingBufferWidth = value }
    },
    drawingBufferHeight: {
      get () { return ctx.drawingBufferHeight },
      set (value) { ctx.drawingBufferHeight = value }
    }
  })

  return wrapper
}

// We need to wrap some of the native WebGL functions to handle certain error codes and check input values
class WebGLRenderingContext extends NativeWebGLRenderingContext {
  _checkDimensions (
    target,
    width,
    height,
    level) {
    if (level < 0 ||
      width < 0 ||
      height < 0) {
      this.setError(gl.INVALID_VALUE)
      return false
    }
    if (target === gl.TEXTURE_2D) {
      if (width > this._maxTextureSize ||
        height > this._maxTextureSize ||
        level > this._maxTextureLevel) {
        this.setError(gl.INVALID_VALUE)
        return false
      }
    } else if (this._validCubeTarget(target)) {
      if (width > this._maxCubeMapSize ||
        height > this._maxCubeMapSize ||
        level > this._maxCubeMapLevel) {
        this.setError(gl.INVALID_VALUE)
        return false
      }
    } else {
      this.setError(gl.INVALID_ENUM)
      return false
    }
    return true
  }

  _checkLocation (location) {
    if (!(location instanceof WebGLUniformLocation)) {
      this.setError(gl.INVALID_VALUE)
      return false
    } else if (location._program._ctx !== this ||
      location._linkCount !== location._program._linkCount) {
      this.setError(gl.INVALID_OPERATION)
      return false
    }
    return true
  }

  _checkLocationActive (location) {
    if (!location) {
      return false
    } else if (!this._checkLocation(location)) {
      return false
    } else if (location._program !== this._activeProgram) {
      this.setError(gl.INVALID_OPERATION)
      return false
    }
    return true
  }

  _checkOwns (object) {
    return typeof object === 'object' &&
      object._ctx === this
  }

  _checkShaderSource (shader) {
    const source = shader._source
    const tokens = tokenize(source)

    let errorStatus = false
    const errorLog = []

    for (let i = 0; i < tokens.length; ++i) {
      const tok = tokens[i]
      switch (tok.type) {
        case 'ident':
          if (!this._validGLSLIdentifier(tok.data)) {
            errorStatus = true
            errorLog.push(tok.line + ':' + tok.column +
              ' invalid identifier - ' + tok.data)
          }
          break
        case 'preprocessor': {
          const bodyToks = tokenize(tok.data.match(/^\s*#\s*(.*)$/)[1])
          for (let j = 0; j < bodyToks.length; ++j) {
            const btok = bodyToks[j]
            if (btok.type === 'ident' || btok.type === undefined) {
              if (!this._validGLSLIdentifier(btok.data)) {
                errorStatus = true
                errorLog.push(tok.line + ':' + btok.column +
                  ' invalid identifier - ' + btok.data)
              }
            }
          }
          break
        }
        case 'keyword':
          switch (tok.data) {
            case 'do':
              errorStatus = true
              errorLog.push(tok.line + ':' + tok.column + ' do not supported')
              break
          }
          break
        case 'builtin':
          switch (tok.data) {
            case 'dFdx':
            case 'dFdy':
            case 'fwidth':
              if (!this._extensions.oes_standard_derivatives) {
                errorStatus = true
                errorLog.push(tok.line + ':' + tok.column + ' ' + tok.data + ' not supported')
              }
              break
          }
      }
    }

    if (errorStatus) {
      shader._compileInfo = errorLog.join('\n')
    }
    return !errorStatus
  }

  _checkStencilState () {
    if (!this._checkStencil) {
      return this._stencilState
    }
    this._checkStencil = false
    this._stencilState = true
    if (this.getParameter(gl.STENCIL_WRITEMASK) !==
      this.getParameter(gl.STENCIL_BACK_WRITEMASK) ||
      this.getParameter(gl.STENCIL_VALUE_MASK) !==
      this.getParameter(gl.STENCIL_BACK_VALUE_MASK) ||
      this.getParameter(gl.STENCIL_REF) !==
      this.getParameter(gl.STENCIL_BACK_REF)) {
      this.setError(gl.INVALID_OPERATION)
      this._stencilState = false
    }
    return this._stencilState
  }

  _checkTextureTarget (target) {
    const unit = this._getActiveTextureUnit()
    let tex = null
    if (target === gl.TEXTURE_2D) {
      tex = unit._bind2D
    } else if (target === gl.TEXTURE_CUBE_MAP) {
      tex = unit._bindCube
    } else {
      this.setError(gl.INVALID_ENUM)
      return false
    }
    if (!tex) {
      this.setError(gl.INVALID_OPERATION)
      return false
    }
    return true
  }

  _checkWrapper (object, Wrapper) {
    if (!this._checkValid(object, Wrapper)) {
      this.setError(gl.INVALID_VALUE)
      return false
    } else if (!this._checkOwns(object)) {
      this.setError(gl.INVALID_OPERATION)
      return false
    }
    return true
  }

  _checkValid (object, Type) {
    return object instanceof Type && object._ !== 0
  }

  _checkVertexAttribState (maxIndex) {
    const program = this._activeProgram
    if (!program) {
      this.setError(gl.INVALID_OPERATION)
      return false
    }
    const attribs = this._vertexObjectState._attribs
    for (let i = 0; i < attribs.length; ++i) {
      const attrib = attribs[i]
      if (attrib._isPointer) {
        const buffer = attrib._pointerBuffer
        if (!buffer) {
          this.setError(gl.INVALID_OPERATION)
          return false
        }
        if (program._attributes.indexOf(i) >= 0) {
          let maxByte = 0
          if (attrib._divisor) {
            maxByte = attrib._pointerSize +
              attrib._pointerOffset
          } else {
            maxByte = attrib._pointerStride * maxIndex +
              attrib._pointerSize +
              attrib._pointerOffset
          }
          if (maxByte > buffer._size) {
            this.setError(gl.INVALID_OPERATION)
            return false
          }
        }
      }
    }
    return true
  }

  _checkVertexIndex (index) {
    if (index < 0 || index >= this._vertexObjectState._attribs.length) {
      this.setError(gl.INVALID_VALUE)
      return false
    }
    return true
  }

  _computePixelSize (type, internalFormat) {
    const pixelSize = formatSize(internalFormat)
    if (pixelSize === 0) {
      this.setError(gl.INVALID_ENUM)
      return 0
    }
    switch (type) {
      case gl.UNSIGNED_BYTE:
        return pixelSize
      case gl.UNSIGNED_SHORT_5_6_5:
        if (internalFormat !== gl.RGB) {
          this.setError(gl.INVALID_OPERATION)
          break
        }
        return 2
      case gl.UNSIGNED_SHORT_4_4_4_4:
      case gl.UNSIGNED_SHORT_5_5_5_1:
        if (internalFormat !== gl.RGBA) {
          this.setError(gl.INVALID_OPERATION)
          break
        }
        return 2
      case gl.FLOAT:
        return 1
    }
    this.setError(gl.INVALID_ENUM)
    return 0
  }

  _computeRowStride (width, pixelSize) {
    let rowStride = width * pixelSize
    if (rowStride % this._unpackAlignment) {
      rowStride += this._unpackAlignment - (rowStride % this._unpackAlignment)
    }
    return rowStride
  }

  _fixupLink (program) {
    if (!super.getProgramParameter(program._, gl.LINK_STATUS)) {
      program._linkInfoLog = super.getProgramInfoLog(program)
      return false
    }

    // Record attribute attributeLocations
    const numAttribs = this.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES)
    const names = new Array(numAttribs)
    program._attributes.length = numAttribs
    for (let i = 0; i < numAttribs; ++i) {
      names[i] = this.getActiveAttrib(program, i).name
      program._attributes[i] = this.getAttribLocation(program, names[i]) | 0
    }

    // Check attribute names
    for (let i = 0; i < names.length; ++i) {
      if (names[i].length > MAX_ATTRIBUTE_LENGTH) {
        program._linkInfoLog = 'attribute ' + names[i] + ' is too long'
        return false
      }
    }

    for (let i = 0; i < numAttribs; ++i) {
      super.bindAttribLocation(
        program._ | 0,
        program._attributes[i],
        names[i])
    }

    super.linkProgram(program._ | 0)

    const numUniforms = this.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
    program._uniforms.length = numUniforms
    for (let i = 0; i < numUniforms; ++i) {
      program._uniforms[i] = this.getActiveUniform(program, i)
    }

    // Check attribute and uniform name lengths
    for (let i = 0; i < program._uniforms.length; ++i) {
      if (program._uniforms[i].name.length > MAX_UNIFORM_LENGTH) {
        program._linkInfoLog = 'uniform ' + program._uniforms[i].name + ' is too long'
        return false
      }
    }

    program._linkInfoLog = ''
    return true
  }

  _framebufferOk () {
    const framebuffer = this._activeFramebuffer
    if (framebuffer &&
      this._preCheckFramebufferStatus(framebuffer) !== gl.FRAMEBUFFER_COMPLETE) {
      this.setError(gl.INVALID_FRAMEBUFFER_OPERATION)
      return false
    }
    return true
  }

  _getActiveBuffer (target) {
    if (target === gl.ARRAY_BUFFER) {
      return this._vertexGlobalState._arrayBufferBinding
    } else if (target === gl.ELEMENT_ARRAY_BUFFER) {
      return this._vertexObjectState._elementArrayBufferBinding
    }
    return null
  }

  _getActiveTextureUnit () {
    return this._textureUnits[this._activeTextureUnit]
  }

  _getActiveTexture (target) {
    const activeUnit = this._getActiveTextureUnit()
    if (target === gl.TEXTURE_2D) {
      return activeUnit._bind2D
    } else if (target === gl.TEXTURE_CUBE_MAP) {
      return activeUnit._bindCube
    }
    return null
  }

  _getAttachments () {
    return this._extensions.webgl_draw_buffers ? this._extensions.webgl_draw_buffers._ALL_ATTACHMENTS : DEFAULT_ATTACHMENTS
  }

  _getColorAttachments () {
    return this._extensions.webgl_draw_buffers ? this._extensions.webgl_draw_buffers._ALL_COLOR_ATTACHMENTS : DEFAULT_COLOR_ATTACHMENTS
  }

  _getParameterDirect (pname) {
    return super.getParameter(pname)
  }

  _getTexImage (target) {
    const unit = this._getActiveTextureUnit()
    if (target === gl.TEXTURE_2D) {
      return unit._bind2D
    } else if (validCubeTarget(target)) {
      return unit._bindCube
    }
    this.setError(gl.INVALID_ENUM)
    return null
  }

  _preCheckFramebufferStatus (framebuffer) {
    const attachments = framebuffer._attachments
    const width = []
    const height = []
    const depthAttachment = attachments[gl.DEPTH_ATTACHMENT]
    const depthStencilAttachment = attachments[gl.DEPTH_STENCIL_ATTACHMENT]
    const stencilAttachment = attachments[gl.STENCIL_ATTACHMENT]

    if ((depthStencilAttachment && (stencilAttachment || depthAttachment)) ||
      (stencilAttachment && depthAttachment)) {
      return gl.FRAMEBUFFER_UNSUPPORTED
    }

    const colorAttachments = this._getColorAttachments()
    let colorAttachmentCount = 0
    for (const attachmentEnum in attachments) {
      if (attachments[attachmentEnum] && colorAttachments.indexOf(attachmentEnum * 1) !== -1) {
        colorAttachmentCount++
      }
    }
    if (colorAttachmentCount === 0) {
      return gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT
    }

    if (depthStencilAttachment instanceof WebGLTexture) {
      return gl.FRAMEBUFFER_UNSUPPORTED
    } else if (depthStencilAttachment instanceof WebGLRenderbuffer) {
      if (depthStencilAttachment._format !== gl.DEPTH_STENCIL) {
        return gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT
      }
      width.push(depthStencilAttachment._width)
      height.push(depthStencilAttachment._height)
    }

    if (depthAttachment instanceof WebGLTexture) {
      return gl.FRAMEBUFFER_UNSUPPORTED
    } else if (depthAttachment instanceof WebGLRenderbuffer) {
      if (depthAttachment._format !== gl.DEPTH_COMPONENT16) {
        return gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT
      }
      width.push(depthAttachment._width)
      height.push(depthAttachment._height)
    }

    if (stencilAttachment instanceof WebGLTexture) {
      return gl.FRAMEBUFFER_UNSUPPORTED
    } else if (stencilAttachment instanceof WebGLRenderbuffer) {
      if (stencilAttachment._format !== gl.STENCIL_INDEX8) {
        return gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT
      }
      width.push(stencilAttachment._width)
      height.push(stencilAttachment._height)
    }

    let colorAttached = false
    for (let i = 0; i < colorAttachments.length; ++i) {
      const colorAttachment = attachments[colorAttachments[i]]
      if (colorAttachment instanceof WebGLTexture) {
        if (colorAttachment._format !== gl.RGBA ||
          !(colorAttachment._type === gl.UNSIGNED_BYTE || colorAttachment._type === gl.FLOAT)) {
          return gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT
        }
        colorAttached = true
        const level = framebuffer._attachmentLevel[gl.COLOR_ATTACHMENT0]
        width.push(colorAttachment._levelWidth[level])
        height.push(colorAttachment._levelHeight[level])
      } else if (colorAttachment instanceof WebGLRenderbuffer) {
        const format = colorAttachment._format
        if (format !== gl.RGBA4 &&
          format !== gl.RGB565 &&
          format !== gl.RGB5_A1) {
          return gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT
        }
        colorAttached = true
        width.push(colorAttachment._width)
        height.push(colorAttachment._height)
      }
    }

    if (!colorAttached &&
      !stencilAttachment &&
      !depthAttachment &&
      !depthStencilAttachment) {
      return gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT
    }

    if (width.length <= 0 || height.length <= 0) {
      return gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT
    }

    for (let i = 1; i < width.length; ++i) {
      if (width[i - 1] !== width[i] ||
        height[i - 1] !== height[i]) {
        return gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS
      }
    }

    if (width[0] === 0 || height[0] === 0) {
      return gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT
    }

    framebuffer._width = width[0]
    framebuffer._height = height[0]

    return gl.FRAMEBUFFER_COMPLETE
  }

  _isConstantBlendFunc (factor) {
    return (
      factor === gl.CONSTANT_COLOR ||
      factor === gl.ONE_MINUS_CONSTANT_COLOR ||
      factor === gl.CONSTANT_ALPHA ||
      factor === gl.ONE_MINUS_CONSTANT_ALPHA)
  }

  _isObject (object, method, Wrapper) {
    if (!(object === null || object === undefined) &&
      !(object instanceof Wrapper)) {
      throw new TypeError(method + '(' + Wrapper.name + ')')
    }
    if (this._checkValid(object, Wrapper) && this._checkOwns(object)) {
      return true
    }
    return false
  }

  _resizeDrawingBuffer (width, height) {
    const prevFramebuffer = this._activeFramebuffer
    const prevTexture = this._getActiveTexture(gl.TEXTURE_2D)
    const prevRenderbuffer = this._activeRenderbuffer

    const contextAttributes = this._contextAttributes

    const drawingBuffer = this._drawingBuffer
    super.bindFramebuffer(gl.FRAMEBUFFER, drawingBuffer._framebuffer)
    const attachments = this._getAttachments()
    // Clear all attachments
    for (let i = 0; i < attachments.length; ++i) {
      super.framebufferTexture2D(
        gl.FRAMEBUFFER,
        attachments[i],
        gl.TEXTURE_2D,
        0,
        0)
    }

    // Update color attachment
    super.bindTexture(gl.TEXTURE_2D, drawingBuffer._color)
    const colorFormat = contextAttributes.alpha ? gl.RGBA : gl.RGB
    super.texImage2D(
      gl.TEXTURE_2D,
      0,
      colorFormat,
      width,
      height,
      0,
      colorFormat,
      gl.UNSIGNED_BYTE,
      null)
    super.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    super.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    super.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      drawingBuffer._color,
      0)

    // Update depth-stencil attachments if needed
    let storage = 0
    let attachment = 0
    if (contextAttributes.depth && contextAttributes.stencil) {
      storage = gl.DEPTH_STENCIL
      attachment = gl.DEPTH_STENCIL_ATTACHMENT
    } else if (contextAttributes.depth) {
      storage = 0x81A7
      attachment = gl.DEPTH_ATTACHMENT
    } else if (contextAttributes.stencil) {
      storage = gl.STENCIL_INDEX8
      attachment = gl.STENCIL_ATTACHMENT
    }

    if (storage) {
      super.bindRenderbuffer(
        gl.RENDERBUFFER,
        drawingBuffer._depthStencil)
      super.renderbufferStorage(
        gl.RENDERBUFFER,
        storage,
        width,
        height)
      super.framebufferRenderbuffer(
        gl.FRAMEBUFFER,
        attachment,
        gl.RENDERBUFFER,
        drawingBuffer._depthStencil)
    }

    // Restore previous binding state
    this.bindFramebuffer(gl.FRAMEBUFFER, prevFramebuffer)
    this.bindTexture(gl.TEXTURE_2D, prevTexture)
    this.bindRenderbuffer(gl.RENDERBUFFER, prevRenderbuffer)
  }

  _restoreError (lastError) {
    const topError = this._errorStack.pop()
    if (topError === gl.NO_ERROR) {
      this.setError(lastError)
    } else {
      this.setError(topError)
    }
  }

  _saveError () {
    this._errorStack.push(this.getError())
  }

  _switchActiveProgram (active) {
    if (active) {
      active._refCount -= 1
      active._checkDelete()
    }
  }

  _tryDetachFramebuffer (framebuffer, renderbuffer) {
    // FIXME: Does the texture get unbound from *all* framebuffers, or just the
    // active FBO?
    if (framebuffer && framebuffer._linked(renderbuffer)) {
      const attachments = this._getAttachments()
      const framebufferAttachments = Object.keys(framebuffer._attachments)
      for (let i = 0; i < framebufferAttachments.length; ++i) {
        if (framebuffer._attachments[attachments[i]] === renderbuffer) {
          this.framebufferTexture2D(
            gl.FRAMEBUFFER,
            attachments[i] | 0,
            gl.TEXTURE_2D,
            null)
        }
      }
    }
  }

  _updateFramebufferAttachments (framebuffer) {
    const prevStatus = framebuffer._status
    const attachments = this._getAttachments()
    framebuffer._status = this._preCheckFramebufferStatus(framebuffer)
    if (framebuffer._status !== gl.FRAMEBUFFER_COMPLETE) {
      if (prevStatus === gl.FRAMEBUFFER_COMPLETE) {
        for (let i = 0; i < attachments.length; ++i) {
          const attachmentEnum = attachments[i]
          super.framebufferTexture2D(
            gl.FRAMEBUFFER,
            attachmentEnum,
            framebuffer._attachmentFace[attachmentEnum],
            0,
            framebuffer._attachmentLevel[attachmentEnum])
        }
      }
      return
    }

    for (let i = 0; i < attachments.length; ++i) {
      const attachmentEnum = attachments[i]
      super.framebufferTexture2D(
        gl.FRAMEBUFFER,
        attachmentEnum,
        framebuffer._attachmentFace[attachmentEnum],
        0,
        framebuffer._attachmentLevel[attachmentEnum])
    }

    for (let i = 0; i < attachments.length; ++i) {
      const attachmentEnum = attachments[i]
      const attachment = framebuffer._attachments[attachmentEnum]
      if (attachment instanceof WebGLTexture) {
        super.framebufferTexture2D(
          gl.FRAMEBUFFER,
          attachmentEnum,
          framebuffer._attachmentFace[attachmentEnum],
          attachment._ | 0,
          framebuffer._attachmentLevel[attachmentEnum])
      } else if (attachment instanceof WebGLRenderbuffer) {
        super.framebufferRenderbuffer(
          gl.FRAMEBUFFER,
          attachmentEnum,
          gl.RENDERBUFFER,
          attachment._ | 0)
      }
    }
  }

  _validBlendFunc (factor) {
    return factor === gl.ZERO ||
      factor === gl.ONE ||
      factor === gl.SRC_COLOR ||
      factor === gl.ONE_MINUS_SRC_COLOR ||
      factor === gl.DST_COLOR ||
      factor === gl.ONE_MINUS_DST_COLOR ||
      factor === gl.SRC_ALPHA ||
      factor === gl.ONE_MINUS_SRC_ALPHA ||
      factor === gl.DST_ALPHA ||
      factor === gl.ONE_MINUS_DST_ALPHA ||
      factor === gl.SRC_ALPHA_SATURATE ||
      factor === gl.CONSTANT_COLOR ||
      factor === gl.ONE_MINUS_CONSTANT_COLOR ||
      factor === gl.CONSTANT_ALPHA ||
      factor === gl.ONE_MINUS_CONSTANT_ALPHA
  }

  _validBlendMode (mode) {
    return mode === gl.FUNC_ADD ||
      mode === gl.FUNC_SUBTRACT ||
      mode === gl.FUNC_REVERSE_SUBTRACT ||
      (this._extensions.ext_blend_minmax && (
        mode === this._extensions.ext_blend_minmax.MIN_EXT ||
        mode === this._extensions.ext_blend_minmax.MAX_EXT))
  }

  _validCubeTarget (target) {
    return target === gl.TEXTURE_CUBE_MAP_POSITIVE_X ||
      target === gl.TEXTURE_CUBE_MAP_NEGATIVE_X ||
      target === gl.TEXTURE_CUBE_MAP_POSITIVE_Y ||
      target === gl.TEXTURE_CUBE_MAP_NEGATIVE_Y ||
      target === gl.TEXTURE_CUBE_MAP_POSITIVE_Z ||
      target === gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
  }

  _validFramebufferAttachment (attachment) {
    switch (attachment) {
      case gl.DEPTH_ATTACHMENT:
      case gl.STENCIL_ATTACHMENT:
      case gl.DEPTH_STENCIL_ATTACHMENT:
      case gl.COLOR_ATTACHMENT0:
        return true
    }

    if (this._extensions.webgl_draw_buffers) { // eslint-disable-line
      const { webgl_draw_buffers } = this._extensions; // eslint-disable-line
      return attachment < (webgl_draw_buffers.COLOR_ATTACHMENT0_WEBGL + webgl_draw_buffers._maxDrawBuffers) // eslint-disable-line
    }

    return false
  }

  _validGLSLIdentifier (str) {
    return !(str.indexOf('webgl_') === 0 ||
      str.indexOf('_webgl_') === 0 ||
      str.length > 256)
  }

  _validTextureTarget (target) {
    return target === gl.TEXTURE_2D ||
      target === gl.TEXTURE_CUBE_MAP
  }

  _verifyTextureCompleteness (target, pname, param) {
    const unit = this._getActiveTextureUnit()
    let texture = null
    if (target === gl.TEXTURE_2D) {
      texture = unit._bind2D
    } else if (this._validCubeTarget(target)) {
      texture = unit._bindCube
    }

    // oes_texture_float but not oes_texture_float_linear
    if (this._extensions.oes_texture_float && !this._extensions.oes_texture_float_linear && texture && texture._type === gl.FLOAT && (pname === gl.TEXTURE_MAG_FILTER || pname === gl.TEXTURE_MIN_FILTER) && (param === gl.LINEAR || param === gl.LINEAR_MIPMAP_NEAREST || param === gl.NEAREST_MIPMAP_LINEAR || param === gl.LINEAR_MIPMAP_LINEAR)) {
      texture._complete = false
      this.bindTexture(target, texture)
      return
    }

    if (texture && texture._complete === false) {
      texture._complete = true
      this.bindTexture(target, texture)
    }
  }

  _wrapShader (type, source) { // eslint-disable-line
    // the gl implementation seems to define `GL_OES_standard_derivatives` even when the extension is disabled
    // this behaviour causes one conformance test ('GL_OES_standard_derivatives defined in shaders when extension is disabled') to fail
    // by `undef`ing `GL_OES_standard_derivatives`, this appears to solve the issue
    if (!this._extensions.oes_standard_derivatives && /#ifdef\s+GL_OES_standard_derivatives/.test(source)) {
      source = '#undef GL_OES_standard_derivatives\n' + source
    }

    return this._extensions.webgl_draw_buffers ? source : '#define gl_MaxDrawBuffers 1\n' + source // eslint-disable-line
  }

  _beginAttrib0Hack () {
    super.bindBuffer(gl.ARRAY_BUFFER, this._attrib0Buffer._)
    super.bufferData(
      gl.ARRAY_BUFFER,
      this._vertexGlobalState._attribs[0]._data,
      gl.STREAM_DRAW)
    super.enableVertexAttribArray(0)
    super.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0)
    super._vertexAttribDivisor(0, 1)
  }

  _endAttrib0Hack () {
    const attrib = this._vertexObjectState._attribs[0]
    if (attrib._pointerBuffer) {
      super.bindBuffer(gl.ARRAY_BUFFER, attrib._pointerBuffer._)
    } else {
      super.bindBuffer(gl.ARRAY_BUFFER, 0)
    }
    super.vertexAttribPointer(
      0,
      attrib._inputSize,
      attrib._pointerType,
      attrib._pointerNormal,
      attrib._inputStride,
      attrib._pointerOffset)
    super._vertexAttribDivisor(0, attrib._divisor)
    super.disableVertexAttribArray(0)
    if (this._vertexGlobalState._arrayBufferBinding) {
      super.bindBuffer(gl.ARRAY_BUFFER, this._vertexGlobalState._arrayBufferBinding._)
    } else {
      super.bindBuffer(gl.ARRAY_BUFFER, 0)
    }
  }

  activeTexture (texture) {
    texture |= 0
    const texNum = texture - gl.TEXTURE0
    if (texNum >= 0 && texNum < this._textureUnits.length) {
      this._activeTextureUnit = texNum
      return super.activeTexture(texture)
    }

    this.setError(gl.INVALID_ENUM)
  }

  attachShader (program, shader) {
    if (!checkObject(program) ||
      !checkObject(shader)) {
      throw new TypeError('attachShader(WebGLProgram, WebGLShader)')
    }
    if (!program || !shader) {
      this.setError(gl.INVALID_VALUE)
      return
    } else if (program instanceof WebGLProgram &&
      shader instanceof WebGLShader &&
      this._checkOwns(program) &&
      this._checkOwns(shader)) {
      if (!program._linked(shader)) {
        this._saveError()
        super.attachShader(
          program._ | 0,
          shader._ | 0)
        const error = this.getError()
        this._restoreError(error)
        if (error === gl.NO_ERROR) {
          program._link(shader)
        }
        return
      }
    }
    this.setError(gl.INVALID_OPERATION)
  }

  bindAttribLocation (program, index, name) {
    if (!checkObject(program) ||
      typeof name !== 'string') {
      throw new TypeError('bindAttribLocation(WebGLProgram, GLint, String)')
    }
    name += ''
    if (!isValidString(name) || name.length > MAX_ATTRIBUTE_LENGTH) {
      this.setError(gl.INVALID_VALUE)
    } else if (/^_?webgl_a/.test(name)) {
      this.setError(gl.INVALID_OPERATION)
    } else if (this._checkWrapper(program, WebGLProgram)) {
      return super.bindAttribLocation(
        program._ | 0,
        index | 0,
        name)
    }
  }

  bindFramebuffer (target, framebuffer) {
    if (!checkObject(framebuffer)) {
      throw new TypeError('bindFramebuffer(GLenum, WebGLFramebuffer)')
    }
    if (target !== gl.FRAMEBUFFER) {
      this.setError(gl.INVALID_ENUM)
      return
    }
    if (!framebuffer) {
      super.bindFramebuffer(
        gl.FRAMEBUFFER,
        this._drawingBuffer._framebuffer)
    } else if (framebuffer._pendingDelete) {
      return
    } else if (this._checkWrapper(framebuffer, WebGLFramebuffer)) {
      super.bindFramebuffer(
        gl.FRAMEBUFFER,
        framebuffer._ | 0)
    } else {
      return
    }
    const activeFramebuffer = this._activeFramebuffer
    if (activeFramebuffer !== framebuffer) {
      if (activeFramebuffer) {
        activeFramebuffer._refCount -= 1
        activeFramebuffer._checkDelete()
      }
      if (framebuffer) {
        framebuffer._refCount += 1
      }
    }
    this._activeFramebuffer = framebuffer
    if (framebuffer) {
      this._updateFramebufferAttachments(framebuffer)
    }
  }

  bindBuffer (target, buffer) {
    target |= 0
    if (!checkObject(buffer)) {
      throw new TypeError('bindBuffer(GLenum, WebGLBuffer)')
    }
    if (target !== gl.ARRAY_BUFFER &&
      target !== gl.ELEMENT_ARRAY_BUFFER) {
      this.setError(gl.INVALID_ENUM)
      return
    }

    if (!buffer) {
      buffer = null
      super.bindBuffer(target, 0)
    } else if (buffer._pendingDelete) {
      return
    } else if (this._checkWrapper(buffer, WebGLBuffer)) {
      if (buffer._binding && buffer._binding !== target) {
        this.setError(gl.INVALID_OPERATION)
        return
      }
      buffer._binding = target | 0

      super.bindBuffer(target, buffer._ | 0)
    } else {
      return
    }

    if (target === gl.ARRAY_BUFFER) {
      // Buffers of type ARRAY_BUFFER are bound to the global vertex state.
      this._vertexGlobalState.setArrayBuffer(buffer)
    } else {
      // Buffers of type ELEMENT_ARRAY_BUFFER are bound to vertex array object state.
      this._vertexObjectState.setElementArrayBuffer(buffer)
    }
  }

  bindRenderbuffer (target, object) {
    if (!checkObject(object)) {
      throw new TypeError('bindRenderbuffer(GLenum, WebGLRenderbuffer)')
    }

    if (target !== gl.RENDERBUFFER) {
      this.setError(gl.INVALID_ENUM)
      return
    }

    if (!object) {
      super.bindRenderbuffer(
        target | 0,
        0)
    } else if (object._pendingDelete) {
      return
    } else if (this._checkWrapper(object, WebGLRenderbuffer)) {
      super.bindRenderbuffer(
        target | 0,
        object._ | 0)
    } else {
      return
    }
    const active = this._activeRenderbuffer
    if (active !== object) {
      if (active) {
        active._refCount -= 1
        active._checkDelete()
      }
      if (object) {
        object._refCount += 1
      }
    }
    this._activeRenderbuffer = object
  }

  bindTexture (target, texture) {
    target |= 0

    if (!checkObject(texture)) {
      throw new TypeError('bindTexture(GLenum, WebGLTexture)')
    }

    if (!this._validTextureTarget(target)) {
      this.setError(gl.INVALID_ENUM)
      return
    }

    // Get texture id
    let textureId = 0
    if (!texture) {
      texture = null
    } else if (texture instanceof WebGLTexture &&
      texture._pendingDelete) {
      // Special case: error codes for deleted textures don't get set for some dumb reason
      return
    } else if (this._checkWrapper(texture, WebGLTexture)) {
      // Check binding mode of texture
      if (texture._binding && texture._binding !== target) {
        this.setError(gl.INVALID_OPERATION)
        return
      }
      texture._binding = target

      if (texture._complete) {
        textureId = texture._ | 0
      }
    } else {
      return
    }

    this._saveError()
    super.bindTexture(
      target,
      textureId)
    const error = this.getError()
    this._restoreError(error)

    if (error !== gl.NO_ERROR) {
      return
    }

    const activeUnit = this._getActiveTextureUnit()
    const activeTex = this._getActiveTexture(target)

    // Update references
    if (activeTex !== texture) {
      if (activeTex) {
        activeTex._refCount -= 1
        activeTex._checkDelete()
      }
      if (texture) {
        texture._refCount += 1
      }
    }

    if (target === gl.TEXTURE_2D) {
      activeUnit._bind2D = texture
    } else if (target === gl.TEXTURE_CUBE_MAP) {
      activeUnit._bindCube = texture
    }
  }

  blendColor (red, green, blue, alpha) {
    return super.blendColor(+red, +green, +blue, +alpha)
  }

  blendEquation (mode) {
    mode |= 0
    if (this._validBlendMode(mode)) {
      return super.blendEquation(mode)
    }
    this.setError(gl.INVALID_ENUM)
  }

  blendEquationSeparate (modeRGB, modeAlpha) {
    modeRGB |= 0
    modeAlpha |= 0
    if (this._validBlendMode(modeRGB) && this._validBlendMode(modeAlpha)) {
      return super.blendEquationSeparate(modeRGB, modeAlpha)
    }
    this.setError(gl.INVALID_ENUM)
  }

  createBuffer () {
    const id = super.createBuffer()
    if (id <= 0) return null
    const webGLBuffer = new WebGLBuffer(id, this)
    this._buffers[id] = webGLBuffer
    return webGLBuffer
  }

  createFramebuffer () {
    const id = super.createFramebuffer()
    if (id <= 0) return null
    const webGLFramebuffer = new WebGLFramebuffer(id, this)
    this._framebuffers[id] = webGLFramebuffer
    return webGLFramebuffer
  }

  createProgram () {
    const id = super.createProgram()
    if (id <= 0) return null
    const webGLProgram = new WebGLProgram(id, this)
    this._programs[id] = webGLProgram
    return webGLProgram
  }

  createRenderbuffer () {
    const id = super.createRenderbuffer()
    if (id <= 0) return null
    const webGLRenderbuffer = new WebGLRenderbuffer(id, this)
    this._renderbuffers[id] = webGLRenderbuffer
    return webGLRenderbuffer
  }

  createTexture () {
    const id = super.createTexture()
    if (id <= 0) return null
    const webGlTexture = new WebGLTexture(id, this)
    this._textures[id] = webGlTexture
    return webGlTexture
  }

  getContextAttributes () {
    return this._contextAttributes
  }

  getExtension (name) {
    const str = name.toLowerCase()
    if (str in this._extensions) {
      return this._extensions[str]
    }
    const ext = availableExtensions[str] ? availableExtensions[str](this) : null
    if (ext) {
      this._extensions[str] = ext
    }
    return ext
  }

  getSupportedExtensions () {
    const exts = [
      'ANGLE_instanced_arrays',
      'STACKGL_resize_drawingbuffer',
      'STACKGL_destroy_context'
    ]

    const supportedExts = super.getSupportedExtensions()

    if (supportedExts.indexOf('GL_OES_element_index_uint') >= 0) {
      exts.push('OES_element_index_uint')
    }

    if (supportedExts.indexOf('GL_OES_standard_derivatives') >= 0) {
      exts.push('OES_standard_derivatives')
    }

    if (supportedExts.indexOf('GL_OES_texture_float') >= 0) {
      exts.push('OES_texture_float')
    }

    if (supportedExts.indexOf('GL_OES_texture_float_linear') >= 0) {
      exts.push('OES_texture_float_linear')
    }

    if (supportedExts.indexOf('EXT_draw_buffers') >= 0) {
      exts.push('WEBGL_draw_buffers')
    }

    if (supportedExts.indexOf('EXT_blend_minmax') >= 0) {
      exts.push('EXT_blend_minmax')
    }

    if (supportedExts.indexOf('EXT_texture_filter_anisotropic') >= 0) {
      exts.push('EXT_texture_filter_anisotropic')
    }

    if (supportedExts.indexOf('GL_OES_vertex_array_object') >= 0) {
      exts.push('OES_vertex_array_object')
    }

    return exts
  }

  setError (error) {
    NativeWebGL.setError.call(this, error | 0)
  }

  blendFunc (sfactor, dfactor) {
    sfactor |= 0
    dfactor |= 0
    if (!this._validBlendFunc(sfactor) ||
      !this._validBlendFunc(dfactor)) {
      this.setError(gl.INVALID_ENUM)
      return
    }
    if (this._isConstantBlendFunc(sfactor) && this._isConstantBlendFunc(dfactor)) {
      this.setError(gl.INVALID_OPERATION)
      return
    }
    super.blendFunc(sfactor, dfactor)
  }

  blendFuncSeparate (
    srcRGB,
    dstRGB,
    srcAlpha,
    dstAlpha) {
    srcRGB |= 0
    dstRGB |= 0
    srcAlpha |= 0
    dstAlpha |= 0

    if (!(this._validBlendFunc(srcRGB) &&
      this._validBlendFunc(dstRGB) &&
      this._validBlendFunc(srcAlpha) &&
      this._validBlendFunc(dstAlpha))) {
      this.setError(gl.INVALID_ENUM)
      return
    }

    if ((this._isConstantBlendFunc(srcRGB) && this._isConstantBlendFunc(dstRGB)) ||
      (this._isConstantBlendFunc(srcAlpha) && this._isConstantBlendFunc(dstAlpha))) {
      this.setError(gl.INVALID_OPERATION)
      return
    }

    super.blendFuncSeparate(
      srcRGB,
      dstRGB,
      srcAlpha,
      dstAlpha)
  }

  bufferData (target, data, usage) {
    target |= 0
    usage |= 0
    if (usage !== gl.STREAM_DRAW &&
      usage !== gl.STATIC_DRAW &&
      usage !== gl.DYNAMIC_DRAW) {
      this.setError(gl.INVALID_ENUM)
      return
    }

    if (target !== gl.ARRAY_BUFFER &&
      target !== gl.ELEMENT_ARRAY_BUFFER) {
      this.setError(gl.INVALID_ENUM)
      return
    }

    const active = this._getActiveBuffer(target)
    if (!active) {
      this.setError(gl.INVALID_OPERATION)
      return
    }

    if (typeof data === 'object') {
      let u8Data = null
      if (isTypedArray(data)) {
        u8Data = unpackTypedArray(data)
      } else if (data instanceof ArrayBuffer) {
        u8Data = new Uint8Array(data)
      } else {
        this.setError(gl.INVALID_VALUE)
        return
      }

      this._saveError()
      super.bufferData(
        target,
        u8Data,
        usage)
      const error = this.getError()
      this._restoreError(error)
      if (error !== gl.NO_ERROR) {
        return
      }

      active._size = u8Data.length
      if (target === gl.ELEMENT_ARRAY_BUFFER) {
        active._elements = new Uint8Array(u8Data)
      }
    } else if (typeof data === 'number') {
      const size = data | 0
      if (size < 0) {
        this.setError(gl.INVALID_VALUE)
        return
      }

      this._saveError()
      super.bufferData(
        target,
        size,
        usage)
      const error = this.getError()
      this._restoreError(error)
      if (error !== gl.NO_ERROR) {
        return
      }

      active._size = size
      if (target === gl.ELEMENT_ARRAY_BUFFER) {
        active._elements = new Uint8Array(size)
      }
    } else {
      this.setError(gl.INVALID_VALUE)
    }
  }

  bufferSubData (target, offset, data) {
    target |= 0
    offset |= 0

    if (target !== gl.ARRAY_BUFFER &&
      target !== gl.ELEMENT_ARRAY_BUFFER) {
      this.setError(gl.INVALID_ENUM)
      return
    }

    if (data === null) {
      return
    }

    if (!data || typeof data !== 'object') {
      this.setError(gl.INVALID_VALUE)
      return
    }

    const active = this._getActiveBuffer(target)
    if (!active) {
      this.setError(gl.INVALID_OPERATION)
      return
    }

    if (offset < 0 || offset >= active._size) {
      this.setError(gl.INVALID_VALUE)
      return
    }

    let u8Data = null
    if (isTypedArray(data)) {
      u8Data = unpackTypedArray(data)
    } else if (data instanceof ArrayBuffer) {
      u8Data = new Uint8Array(data)
    } else {
      this.setError(gl.INVALID_VALUE)
      return
    }

    if (offset + u8Data.length > active._size) {
      this.setError(gl.INVALID_VALUE)
      return
    }

    if (target === gl.ELEMENT_ARRAY_BUFFER) {
      active._elements.set(u8Data, offset)
    }

    super.bufferSubData(
      target,
      offset,
      u8Data)
  }

  checkFramebufferStatus (target) {
    if (target !== gl.FRAMEBUFFER) {
      this.setError(gl.INVALID_ENUM)
      return 0
    }

    const framebuffer = this._activeFramebuffer
    if (!framebuffer) {
      return gl.FRAMEBUFFER_COMPLETE
    }

    return this._preCheckFramebufferStatus(framebuffer)
  }

  clear (mask) {
    if (!this._framebufferOk()) {
      return
    }
    return super.clear(mask | 0)
  }

  clearColor (red, green, blue, alpha) {
    return super.clearColor(+red, +green, +blue, +alpha)
  }

  clearDepth (depth) {
    return super.clearDepth(+depth)
  }

  clearStencil (s) {
    this._checkStencil = false
    return super.clearStencil(s | 0)
  }

  colorMask (red, green, blue, alpha) {
    return super.colorMask(!!red, !!green, !!blue, !!alpha)
  }

  compileShader (shader) {
    if (!checkObject(shader)) {
      throw new TypeError('compileShader(WebGLShader)')
    }
    if (this._checkWrapper(shader, WebGLShader) &&
      this._checkShaderSource(shader)) {
      const prevError = this.getError()
      super.compileShader(shader._ | 0)
      const error = this.getError()
      shader._compileStatus = !!super.getShaderParameter(
        shader._ | 0,
        gl.COMPILE_STATUS)
      shader._compileInfo = super.getShaderInfoLog(shader._ | 0)
      this.getError()
      this.setError(prevError || error)
    }
  }

  copyTexImage2D (
    target,
    level,
    internalFormat,
    x, y, width, height,
    border) {
    target |= 0
    level |= 0
    internalFormat |= 0
    x |= 0
    y |= 0
    width |= 0
    height |= 0
    border |= 0

    const texture = this._getTexImage(target)
    if (!texture) {
      this.setError(gl.INVALID_OPERATION)
      return
    }

    if (internalFormat !== gl.RGBA &&
      internalFormat !== gl.RGB &&
      internalFormat !== gl.ALPHA &&
      internalFormat !== gl.LUMINANCE &&
      internalFormat !== gl.LUMINANCE_ALPHA) {
      this.setError(gl.INVALID_ENUM)
      return
    }

    if (level < 0 || width < 0 || height < 0 || border !== 0) {
      this.setError(gl.INVALID_VALUE)
      return
    }

    if (level > 0 && !(bits.isPow2(width) && bits.isPow2(height))) {
      this.setError(gl.INVALID_VALUE)
      return
    }

    this._saveError()
    super.copyTexImage2D(
      target,
      level,
      internalFormat,
      x,
      y,
      width,
      height,
      border)
    const error = this.getError()
    this._restoreError(error)

    if (error === gl.NO_ERROR) {
      texture._levelWidth[level] = width
      texture._levelHeight[level] = height
      texture._format = gl.RGBA
      texture._type = gl.UNSIGNED_BYTE
    }
  }

  copyTexSubImage2D (
    target,
    level,
    xoffset, yoffset,
    x, y, width, height) {
    target |= 0
    level |= 0
    xoffset |= 0
    yoffset |= 0
    x |= 0
    y |= 0
    width |= 0
    height |= 0

    const texture = this._getTexImage(target)
    if (!texture) {
      this.setError(gl.INVALID_OPERATION)
      return
    }

    if (width < 0 || height < 0 || xoffset < 0 || yoffset < 0 || level < 0) {
      this.setError(gl.INVALID_VALUE)
      return
    }

    super.copyTexSubImage2D(
      target,
      level,
      xoffset,
      yoffset,
      x,
      y,
      width,
      height)
  }

  cullFace (mode) {
    return super.cullFace(mode | 0)
  }

  createShader (type) {
    type |= 0
    if (type !== gl.FRAGMENT_SHADER &&
      type !== gl.VERTEX_SHADER) {
      this.setError(gl.INVALID_ENUM)
      return null
    }
    const id = super.createShader(type)
    if (id < 0) {
      return null
    }
    const result = new WebGLShader(id, this, type)
    this._shaders[id] = result
    return result
  }

  deleteProgram (object) {
    return this._deleteLinkable('deleteProgram', object, WebGLProgram)
  }

  deleteShader (object) {
    return this._deleteLinkable('deleteShader', object, WebGLShader)
  }

  _deleteLinkable (name, object, Type) {
    if (!checkObject(object)) {
      throw new TypeError(name + '(' + Type.name + ')')
    }
    if (object instanceof Type &&
      this._checkOwns(object)) {
      object._pendingDelete = true
      object._checkDelete()
      return
    }
    this.setError(gl.INVALID_OPERATION)
  }

  deleteBuffer (buffer) {
    if (!checkObject(buffer) ||
      (buffer !== null && !(buffer instanceof WebGLBuffer))) {
      throw new TypeError('deleteBuffer(WebGLBuffer)')
    }

    if (!(buffer instanceof WebGLBuffer &&
      this._checkOwns(buffer))) {
      this.setError(gl.INVALID_OPERATION)
      return
    }

    if (this._vertexGlobalState._arrayBufferBinding === buffer) {
      this.bindBuffer(gl.ARRAY_BUFFER, null)
    }
    if (this._vertexObjectState._elementArrayBufferBinding === buffer) {
      this.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)
    }

    if (this._vertexObjectState === this._defaultVertexObjectState) {
      // If no vertex array object is bound, release attrib bindings for the
      // array buffer.
      this._vertexObjectState.releaseArrayBuffer(buffer)
    }

    buffer._pendingDelete = true
    buffer._checkDelete()
  }

  deleteFramebuffer (framebuffer) {
    if (!checkObject(framebuffer)) {
      throw new TypeError('deleteFramebuffer(WebGLFramebuffer)')
    }

    if (!(framebuffer instanceof WebGLFramebuffer &&
      this._checkOwns(framebuffer))) {
      this.setError(gl.INVALID_OPERATION)
      return
    }

    if (this._activeFramebuffer === framebuffer) {
      this.bindFramebuffer(gl.FRAMEBUFFER, null)
    }

    framebuffer._pendingDelete = true
    framebuffer._checkDelete()
  }

  // Need to handle textures and render buffers as a special case:
  // When a texture gets deleted, we need to do the following extra steps:
  //  1. Is it bound to the current texture unit?
  //     If so, then unbind it
  //  2. Is it attached to the active fbo?
  //     If so, then detach it
  //
  // For renderbuffers only need to do second step
  //
  // After this, proceed with the usual deletion algorithm
  //
  deleteRenderbuffer (renderbuffer) {
    if (!checkObject(renderbuffer)) {
      throw new TypeError('deleteRenderbuffer(WebGLRenderbuffer)')
    }

    if (!(renderbuffer instanceof WebGLRenderbuffer &&
      this._checkOwns(renderbuffer))) {
      this.setError(gl.INVALID_OPERATION)
      return
    }

    if (this._activeRenderbuffer === renderbuffer) {
      this.bindRenderbuffer(gl.RENDERBUFFER, null)
    }

    const activeFramebuffer = this._activeFramebuffer

    this._tryDetachFramebuffer(activeFramebuffer, renderbuffer)

    renderbuffer._pendingDelete = true
    renderbuffer._checkDelete()
  }

  deleteTexture (texture) {
    if (!checkObject(texture)) {
      throw new TypeError('deleteTexture(WebGLTexture)')
    }

    if (texture instanceof WebGLTexture) {
      if (!this._checkOwns(texture)) {
        this.setError(gl.INVALID_OPERATION)
        return
      }
    } else {
      return
    }

    // Unbind from all texture units
    const curActive = this._activeTextureUnit

    for (let i = 0; i < this._textureUnits.length; ++i) {
      const unit = this._textureUnits[i]
      if (unit._bind2D === texture) {
        this.activeTexture(gl.TEXTURE0 + i)
        this.bindTexture(gl.TEXTURE_2D, null)
      } else if (unit._bindCube === texture) {
        this.activeTexture(gl.TEXTURE0 + i)
        this.bindTexture(gl.TEXTURE_CUBE_MAP, null)
      }
    }
    this.activeTexture(gl.TEXTURE0 + curActive)

    // FIXME: Does the texture get unbound from *all* framebuffers, or just the
    // active FBO?
    const ctx = this
    const activeFramebuffer = this._activeFramebuffer
    function tryDetach (framebuffer) {
      if (framebuffer && framebuffer._linked(texture)) {
        const attachments = ctx._getAttachments()
        for (let i = 0; i < attachments.length; ++i) {
          const attachment = attachments[i]
          if (framebuffer._attachments[attachment] === texture) {
            ctx.framebufferTexture2D(
              gl.FRAMEBUFFER,
              attachment,
              gl.TEXTURE_2D,
              null)
          }
        }
      }
    }

    tryDetach(activeFramebuffer)

    // Mark texture for deletion
    texture._pendingDelete = true
    texture._checkDelete()
  }

  depthFunc (func) {
    func |= 0
    switch (func) {
      case gl.NEVER:
      case gl.LESS:
      case gl.EQUAL:
      case gl.LEQUAL:
      case gl.GREATER:
      case gl.NOTEQUAL:
      case gl.GEQUAL:
      case gl.ALWAYS:
        return super.depthFunc(func)
      default:
        this.setError(gl.INVALID_ENUM)
    }
  }

  depthMask (flag) {
    return super.depthMask(!!flag)
  }

  depthRange (zNear, zFar) {
    zNear = +zNear
    zFar = +zFar
    if (zNear <= zFar) {
      return super.depthRange(zNear, zFar)
    }
    this.setError(gl.INVALID_OPERATION)
  }

  destroy () {
    super.destroy()
  }

  detachShader (program, shader) {
    if (!checkObject(program) ||
      !checkObject(shader)) {
      throw new TypeError('detachShader(WebGLProgram, WebGLShader)')
    }
    if (this._checkWrapper(program, WebGLProgram) &&
      this._checkWrapper(shader, WebGLShader)) {
      if (program._linked(shader)) {
        super.detachShader(program._, shader._)
        program._unlink(shader)
      } else {
        this.setError(gl.INVALID_OPERATION)
      }
    }
  }

  disable (cap) {
    cap |= 0
    super.disable(cap)
    if (cap === gl.TEXTURE_2D ||
      cap === gl.TEXTURE_CUBE_MAP) {
      const active = this._getActiveTextureUnit()
      if (active._mode === cap) {
        active._mode = 0
      }
    }
  }

  disableVertexAttribArray (index) {
    index |= 0
    if (index < 0 || index >= this._vertexObjectState._attribs.length) {
      this.setError(gl.INVALID_VALUE)
      return
    }
    super.disableVertexAttribArray(index)
    this._vertexObjectState._attribs[index]._isPointer = false
  }

  drawArrays (mode, first, count) {
    mode |= 0
    first |= 0
    count |= 0

    if (first < 0 || count < 0) {
      this.setError(gl.INVALID_VALUE)
      return
    }

    if (!this._checkStencilState()) {
      return
    }

    const reducedCount = vertexCount(mode, count)
    if (reducedCount < 0) {
      this.setError(gl.INVALID_ENUM)
      return
    }

    if (!this._framebufferOk()) {
      return
    }

    if (count === 0) {
      return
    }

    let maxIndex = first
    if (count > 0) {
      maxIndex = (count + first - 1) >>> 0
    }
    if (this._checkVertexAttribState(maxIndex)) {
      if (
        this._vertexObjectState._attribs[0]._isPointer || (
          this._extensions.webgl_draw_buffers &&
          this._extensions.webgl_draw_buffers._buffersState &&
          this._extensions.webgl_draw_buffers._buffersState.length > 0
        )
      ) {
        return super.drawArrays(mode, first, reducedCount)
      } else {
        this._beginAttrib0Hack()
        super._drawArraysInstanced(mode, first, reducedCount, 1)
        this._endAttrib0Hack()
      }
    }
  }

  drawElements (mode, count, type, ioffset) {
    mode |= 0
    count |= 0
    type |= 0
    ioffset |= 0

    if (count < 0 || ioffset < 0) {
      this.setError(gl.INVALID_VALUE)
      return
    }

    if (!this._checkStencilState()) {
      return
    }

    const elementBuffer = this._vertexObjectState._elementArrayBufferBinding
    if (!elementBuffer) {
      this.setError(gl.INVALID_OPERATION)
      return
    }

    // Unpack element data
    let elementData = null
    let offset = ioffset
    if (type === gl.UNSIGNED_SHORT) {
      if (offset % 2) {
        this.setError(gl.INVALID_OPERATION)
        return
      }
      offset >>= 1
      elementData = new Uint16Array(elementBuffer._elements.buffer)
    } else if (this._extensions.oes_element_index_uint && type === gl.UNSIGNED_INT) {
      if (offset % 4) {
        this.setError(gl.INVALID_OPERATION)
        return
      }
      offset >>= 2
      elementData = new Uint32Array(elementBuffer._elements.buffer)
    } else if (type === gl.UNSIGNED_BYTE) {
      elementData = elementBuffer._elements
    } else {
      this.setError(gl.INVALID_ENUM)
      return
    }

    let reducedCount = count
    switch (mode) {
      case gl.TRIANGLES:
        if (count % 3) {
          reducedCount -= (count % 3)
        }
        break
      case gl.LINES:
        if (count % 2) {
          reducedCount -= (count % 2)
        }
        break
      case gl.POINTS:
        break
      case gl.LINE_LOOP:
      case gl.LINE_STRIP:
        if (count < 2) {
          this.setError(gl.INVALID_OPERATION)
          return
        }
        break
      case gl.TRIANGLE_FAN:
      case gl.TRIANGLE_STRIP:
        if (count < 3) {
          this.setError(gl.INVALID_OPERATION)
          return
        }
        break
      default:
        this.setError(gl.INVALID_ENUM)
        return
    }

    if (!this._framebufferOk()) {
      return
    }

    if (count === 0) {
      this._checkVertexAttribState(0)
      return
    }

    if ((count + offset) >>> 0 > elementData.length) {
      this.setError(gl.INVALID_OPERATION)
      return
    }

    // Compute max index
    let maxIndex = -1
    for (let i = offset; i < offset + count; ++i) {
      maxIndex = Math.max(maxIndex, elementData[i])
    }

    if (maxIndex < 0) {
      this._checkVertexAttribState(0)
      return
    }

    if (this._checkVertexAttribState(maxIndex)) {
      if (reducedCount > 0) {
        if (this._vertexObjectState._attribs[0]._isPointer) {
          return super.drawElements(mode, reducedCount, type, ioffset)
        } else {
          this._beginAttrib0Hack()
          super._drawElementsInstanced(mode, reducedCount, type, ioffset, 1)
          this._endAttrib0Hack()
        }
      }
    }
  }

  enable (cap) {
    cap |= 0
    super.enable(cap)
  }

  enableVertexAttribArray (index) {
    index |= 0
    if (index < 0 || index >= this._vertexObjectState._attribs.length) {
      this.setError(gl.INVALID_VALUE)
      return
    }

    super.enableVertexAttribArray(index)

    this._vertexObjectState._attribs[index]._isPointer = true
  }

  finish () {
    return super.finish()
  }

  flush () {
    return super.flush()
  }

  framebufferRenderbuffer (
    target,
    attachment,
    renderbufferTarget,
    renderbuffer) {
    target = target | 0
    attachment = attachment | 0
    renderbufferTarget = renderbufferTarget | 0

    if (!checkObject(renderbuffer)) {
      throw new TypeError('framebufferRenderbuffer(GLenum, GLenum, GLenum, WebGLRenderbuffer)')
    }

    if (target !== gl.FRAMEBUFFER ||
      !this._validFramebufferAttachment(attachment) ||
      renderbufferTarget !== gl.RENDERBUFFER) {
      this.setError(gl.INVALID_ENUM)
      return
    }

    const framebuffer = this._activeFramebuffer
    if (!framebuffer) {
      this.setError(gl.INVALID_OPERATION)
      return
    }

    if (renderbuffer && !this._checkWrapper(renderbuffer, WebGLRenderbuffer)) {
      return
    }

    framebuffer._setAttachment(renderbuffer, attachment)
    this._updateFramebufferAttachments(framebuffer)
  }

  framebufferTexture2D (
    target,
    attachment,
    textarget,
    texture,
    level) {
    target |= 0
    attachment |= 0
    textarget |= 0
    level |= 0
    if (!checkObject(texture)) {
      throw new TypeError('framebufferTexture2D(GLenum, GLenum, GLenum, WebGLTexture, GLint)')
    }

    // Check parameters are ok
    if (target !== gl.FRAMEBUFFER ||
      !this._validFramebufferAttachment(attachment)) {
      this.setError(gl.INVALID_ENUM)
      return
    }

    if (level !== 0) {
      this.setError(gl.INVALID_VALUE)
      return
    }

    // Check object ownership
    if (texture && !this._checkWrapper(texture, WebGLTexture)) {
      return
    }

    // Check texture target is ok
    if (textarget === gl.TEXTURE_2D) {
      if (texture && texture._binding !== gl.TEXTURE_2D) {
        this.setError(gl.INVALID_OPERATION)
        return
      }
    } else if (this._validCubeTarget(textarget)) {
      if (texture && texture._binding !== gl.TEXTURE_CUBE_MAP) {
        this.setError(gl.INVALID_OPERATION)
        return
      }
    } else {
      this.setError(gl.INVALID_ENUM)
      return
    }

    // Check a framebuffer is actually bound
    const framebuffer = this._activeFramebuffer
    if (!framebuffer) {
      this.setError(gl.INVALID_OPERATION)
      return
    }

    framebuffer._attachmentLevel[attachment] = level
    framebuffer._attachmentFace[attachment] = textarget
    framebuffer._setAttachment(texture, attachment)
    this._updateFramebufferAttachments(framebuffer)
  }

  frontFace (mode) {
    return super.frontFace(mode | 0)
  }

  generateMipmap (target) {
    return super.generateMipmap(target | 0) | 0
  }

  getActiveAttrib (program, index) {
    if (!checkObject(program)) {
      throw new TypeError('getActiveAttrib(WebGLProgram)')
    } else if (!program) {
      this.setError(gl.INVALID_VALUE)
    } else if (this._checkWrapper(program, WebGLProgram)) {
      const info = super.getActiveAttrib(program._ | 0, index | 0)
      if (info) {
        return new WebGLActiveInfo(info)
      }
    }
    return null
  }

  getActiveUniform (program, index) {
    if (!checkObject(program)) {
      throw new TypeError('getActiveUniform(WebGLProgram, GLint)')
    } else if (!program) {
      this.setError(gl.INVALID_VALUE)
    } else if (this._checkWrapper(program, WebGLProgram)) {
      const info = super.getActiveUniform(program._ | 0, index | 0)
      if (info) {
        return new WebGLActiveInfo(info)
      }
    }
    return null
  }

  getAttachedShaders (program) {
    if (!checkObject(program) ||
      (typeof program === 'object' &&
        program !== null &&
        !(program instanceof WebGLProgram))) {
      throw new TypeError('getAttachedShaders(WebGLProgram)')
    }
    if (!program) {
      this.setError(gl.INVALID_VALUE)
    } else if (this._checkWrapper(program, WebGLProgram)) {
      const shaderArray = super.getAttachedShaders(program._ | 0)
      if (!shaderArray) {
        return null
      }
      const unboxedShaders = new Array(shaderArray.length)
      for (let i = 0; i < shaderArray.length; ++i) {
        unboxedShaders[i] = this._shaders[shaderArray[i]]
      }
      return unboxedShaders
    }
    return null
  }

  getAttribLocation (program, name) {
    if (!checkObject(program)) {
      throw new TypeError('getAttribLocation(WebGLProgram, String)')
    }
    name += ''
    if (!isValidString(name) || name.length > MAX_ATTRIBUTE_LENGTH) {
      this.setError(gl.INVALID_VALUE)
    } else if (this._checkWrapper(program, WebGLProgram)) {
      return super.getAttribLocation(program._ | 0, name + '')
    }
    return -1
  }

  getParameter (pname) {
    pname |= 0
    switch (pname) {
      case gl.ARRAY_BUFFER_BINDING:
        return this._vertexGlobalState._arrayBufferBinding
      case gl.ELEMENT_ARRAY_BUFFER_BINDING:
        return this._vertexObjectState._elementArrayBufferBinding
      case gl.CURRENT_PROGRAM:
        return this._activeProgram
      case gl.FRAMEBUFFER_BINDING:
        return this._activeFramebuffer
      case gl.RENDERBUFFER_BINDING:
        return this._activeRenderbuffer
      case gl.TEXTURE_BINDING_2D:
        return this._getActiveTextureUnit()._bind2D
      case gl.TEXTURE_BINDING_CUBE_MAP:
        return this._getActiveTextureUnit()._bindCube
      case gl.VERSION:
        return 'WebGL 1.0 stack-gl ' + HEADLESS_VERSION
      case gl.VENDOR:
        return 'stack-gl'
      case gl.RENDERER:
        return 'ANGLE'
      case gl.SHADING_LANGUAGE_VERSION:
        return 'WebGL GLSL ES 1.0 stack-gl'

      case gl.COMPRESSED_TEXTURE_FORMATS:
        return new Uint32Array(0)

      // Int arrays
      case gl.MAX_VIEWPORT_DIMS:
      case gl.SCISSOR_BOX:
      case gl.VIEWPORT:
        return new Int32Array(super.getParameter(pname))

      // Float arrays
      case gl.ALIASED_LINE_WIDTH_RANGE:
      case gl.ALIASED_POINT_SIZE_RANGE:
      case gl.DEPTH_RANGE:
      case gl.BLEND_COLOR:
      case gl.COLOR_CLEAR_VALUE:
        return new Float32Array(super.getParameter(pname))

      case gl.COLOR_WRITEMASK:
        return super.getParameter(pname)

      case gl.DEPTH_CLEAR_VALUE:
      case gl.LINE_WIDTH:
      case gl.POLYGON_OFFSET_FACTOR:
      case gl.POLYGON_OFFSET_UNITS:
      case gl.SAMPLE_COVERAGE_VALUE:
        return +super.getParameter(pname)

      case gl.BLEND:
      case gl.CULL_FACE:
      case gl.DEPTH_TEST:
      case gl.DEPTH_WRITEMASK:
      case gl.DITHER:
      case gl.POLYGON_OFFSET_FILL:
      case gl.SAMPLE_COVERAGE_INVERT:
      case gl.SCISSOR_TEST:
      case gl.STENCIL_TEST:
      case gl.UNPACK_FLIP_Y_WEBGL:
      case gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL:
        return !!super.getParameter(pname)

      case gl.ACTIVE_TEXTURE:
      case gl.ALPHA_BITS:
      case gl.BLEND_DST_ALPHA:
      case gl.BLEND_DST_RGB:
      case gl.BLEND_EQUATION_ALPHA:
      case gl.BLEND_EQUATION_RGB:
      case gl.BLEND_SRC_ALPHA:
      case gl.BLEND_SRC_RGB:
      case gl.BLUE_BITS:
      case gl.CULL_FACE_MODE:
      case gl.DEPTH_BITS:
      case gl.DEPTH_FUNC:
      case gl.FRONT_FACE:
      case gl.GENERATE_MIPMAP_HINT:
      case gl.GREEN_BITS:
      case gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS:
      case gl.MAX_CUBE_MAP_TEXTURE_SIZE:
      case gl.MAX_FRAGMENT_UNIFORM_VECTORS:
      case gl.MAX_RENDERBUFFER_SIZE:
      case gl.MAX_TEXTURE_IMAGE_UNITS:
      case gl.MAX_TEXTURE_SIZE:
      case gl.MAX_VARYING_VECTORS:
      case gl.MAX_VERTEX_ATTRIBS:
      case gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS:
      case gl.MAX_VERTEX_UNIFORM_VECTORS:
      case gl.PACK_ALIGNMENT:
      case gl.RED_BITS:
      case gl.SAMPLE_BUFFERS:
      case gl.SAMPLES:
      case gl.STENCIL_BACK_FAIL:
      case gl.STENCIL_BACK_FUNC:
      case gl.STENCIL_BACK_PASS_DEPTH_FAIL:
      case gl.STENCIL_BACK_PASS_DEPTH_PASS:
      case gl.STENCIL_BACK_REF:
      case gl.STENCIL_BACK_VALUE_MASK:
      case gl.STENCIL_BACK_WRITEMASK:
      case gl.STENCIL_BITS:
      case gl.STENCIL_CLEAR_VALUE:
      case gl.STENCIL_FAIL:
      case gl.STENCIL_FUNC:
      case gl.STENCIL_PASS_DEPTH_FAIL:
      case gl.STENCIL_PASS_DEPTH_PASS:
      case gl.STENCIL_REF:
      case gl.STENCIL_VALUE_MASK:
      case gl.STENCIL_WRITEMASK:
      case gl.SUBPIXEL_BITS:
      case gl.UNPACK_ALIGNMENT:
      case gl.UNPACK_COLORSPACE_CONVERSION_WEBGL:
        return super.getParameter(pname) | 0

      case gl.IMPLEMENTATION_COLOR_READ_FORMAT:
      case gl.IMPLEMENTATION_COLOR_READ_TYPE:
        return super.getParameter(pname)

      default:
        if (this._extensions.webgl_draw_buffers) {
          const ext = this._extensions.webgl_draw_buffers
          switch (pname) {
            case ext.DRAW_BUFFER0_WEBGL:
            case ext.DRAW_BUFFER1_WEBGL:
            case ext.DRAW_BUFFER2_WEBGL:
            case ext.DRAW_BUFFER3_WEBGL:
            case ext.DRAW_BUFFER4_WEBGL:
            case ext.DRAW_BUFFER5_WEBGL:
            case ext.DRAW_BUFFER6_WEBGL:
            case ext.DRAW_BUFFER7_WEBGL:
            case ext.DRAW_BUFFER8_WEBGL:
            case ext.DRAW_BUFFER9_WEBGL:
            case ext.DRAW_BUFFER10_WEBGL:
            case ext.DRAW_BUFFER11_WEBGL:
            case ext.DRAW_BUFFER12_WEBGL:
            case ext.DRAW_BUFFER13_WEBGL:
            case ext.DRAW_BUFFER14_WEBGL:
            case ext.DRAW_BUFFER15_WEBGL:
              if (ext._buffersState.length === 1 && ext._buffersState[0] === gl.BACK) {
                return gl.BACK
              }
              return super.getParameter(pname)
            case ext.MAX_DRAW_BUFFERS_WEBGL:
            case ext.MAX_COLOR_ATTACHMENTS_WEBGL:
              return super.getParameter(pname)
          }
        }

        if (this._extensions.oes_standard_derivatives && pname === this._extensions.oes_standard_derivatives.FRAGMENT_SHADER_DERIVATIVE_HINT_OES) {
          return super.getParameter(pname)
        }

        if (this._extensions.ext_texture_filter_anisotropic && pname === this._extensions.ext_texture_filter_anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT) {
          return super.getParameter(pname)
        }

        if (this._extensions.oes_vertex_array_object && pname === this._extensions.oes_vertex_array_object.VERTEX_ARRAY_BINDING_OES) {
          return this._extensions.oes_vertex_array_object._activeVertexArrayObject
        }

        this.setError(gl.INVALID_ENUM)
        return null
    }
  }

  getShaderPrecisionFormat (
    shaderType,
    precisionType) {
    shaderType |= 0
    precisionType |= 0

    if (!(shaderType === gl.FRAGMENT_SHADER ||
      shaderType === gl.VERTEX_SHADER) ||
      !(precisionType === gl.LOW_FLOAT ||
        precisionType === gl.MEDIUM_FLOAT ||
        precisionType === gl.HIGH_FLOAT ||
        precisionType === gl.LOW_INT ||
        precisionType === gl.MEDIUM_INT ||
        precisionType === gl.HIGH_INT)) {
      this.setError(gl.INVALID_ENUM)
      return
    }

    const format = super.getShaderPrecisionFormat(shaderType, precisionType)
    if (!format) {
      return null
    }

    return new WebGLShaderPrecisionFormat(format)
  }

  getBufferParameter (target, pname) {
    target |= 0
    pname |= 0
    if (target !== gl.ARRAY_BUFFER &&
      target !== gl.ELEMENT_ARRAY_BUFFER) {
      this.setError(gl.INVALID_ENUM)
      return null
    }

    switch (pname) {
      case gl.BUFFER_SIZE:
      case gl.BUFFER_USAGE:
        return super.getBufferParameter(target | 0, pname | 0)
      default:
        this.setError(gl.INVALID_ENUM)
        return null
    }
  }

  getError () {
    return super.getError()
  }

  getFramebufferAttachmentParameter (target, attachment, pname) {
    target |= 0
    attachment |= 0
    pname |= 0

    if (target !== gl.FRAMEBUFFER ||
      !this._validFramebufferAttachment(attachment)) {
      this.setError(gl.INVALID_ENUM)
      return null
    }

    const framebuffer = this._activeFramebuffer
    if (!framebuffer) {
      this.setError(gl.INVALID_OPERATION)
      return null
    }

    const object = framebuffer._attachments[attachment]
    if (object === null) {
      if (pname === gl.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE) {
        return gl.NONE
      }
    } else if (object instanceof WebGLTexture) {
      switch (pname) {
        case gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME:
          return object
        case gl.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE:
          return gl.TEXTURE
        case gl.FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL:
          return framebuffer._attachmentLevel[attachment]
        case gl.FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE: {
          const face = framebuffer._attachmentFace[attachment]
          if (face === gl.TEXTURE_2D) {
            return 0
          }
          return face
        }
      }
    } else if (object instanceof WebGLRenderbuffer) {
      switch (pname) {
        case gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME:
          return object
        case gl.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE:
          return gl.RENDERBUFFER
      }
    }

    this.setError(gl.INVALID_ENUM)
    return null
  }

  getProgramParameter (program, pname) {
    pname |= 0
    if (!checkObject(program)) {
      throw new TypeError('getProgramParameter(WebGLProgram, GLenum)')
    } else if (this._checkWrapper(program, WebGLProgram)) {
      switch (pname) {
        case gl.DELETE_STATUS:
          return program._pendingDelete

        case gl.LINK_STATUS:
          return program._linkStatus

        case gl.VALIDATE_STATUS:
          return !!super.getProgramParameter(program._, pname)

        case gl.ATTACHED_SHADERS:
        case gl.ACTIVE_ATTRIBUTES:
        case gl.ACTIVE_UNIFORMS:
          return super.getProgramParameter(program._, pname)
      }
      this.setError(gl.INVALID_ENUM)
    }
    return null
  }

  getProgramInfoLog (program) {
    if (!checkObject(program)) {
      throw new TypeError('getProgramInfoLog(WebGLProgram)')
    } else if (this._checkWrapper(program, WebGLProgram)) {
      return program._linkInfoLog
    }
    return null
  }

  getRenderbufferParameter (target, pname) {
    target |= 0
    pname |= 0
    if (target !== gl.RENDERBUFFER) {
      this.setError(gl.INVALID_ENUM)
      return null
    }
    const renderbuffer = this._activeRenderbuffer
    if (!renderbuffer) {
      this.setError(gl.INVALID_OPERATION)
      return null
    }
    switch (pname) {
      case gl.RENDERBUFFER_INTERNAL_FORMAT:
        return renderbuffer._format
      case gl.RENDERBUFFER_WIDTH:
        return renderbuffer._width
      case gl.RENDERBUFFER_HEIGHT:
        return renderbuffer._height
      case gl.RENDERBUFFER_SIZE:
      case gl.RENDERBUFFER_RED_SIZE:
      case gl.RENDERBUFFER_GREEN_SIZE:
      case gl.RENDERBUFFER_BLUE_SIZE:
      case gl.RENDERBUFFER_ALPHA_SIZE:
      case gl.RENDERBUFFER_DEPTH_SIZE:
      case gl.RENDERBUFFER_STENCIL_SIZE:
        return super.getRenderbufferParameter(target, pname)
    }
    this.setError(gl.INVALID_ENUM)
    return null
  }

  getShaderParameter (shader, pname) {
    pname |= 0
    if (!checkObject(shader)) {
      throw new TypeError('getShaderParameter(WebGLShader, GLenum)')
    } else if (this._checkWrapper(shader, WebGLShader)) {
      switch (pname) {
        case gl.DELETE_STATUS:
          return shader._pendingDelete
        case gl.COMPILE_STATUS:
          return shader._compileStatus
        case gl.SHADER_TYPE:
          return shader._type
      }
      this.setError(gl.INVALID_ENUM)
    }
    return null
  }

  getShaderInfoLog (shader) {
    if (!checkObject(shader)) {
      throw new TypeError('getShaderInfoLog(WebGLShader)')
    } else if (this._checkWrapper(shader, WebGLShader)) {
      return shader._compileInfo
    }
    return null
  }

  getShaderSource (shader) {
    if (!checkObject(shader)) {
      throw new TypeError('Input to getShaderSource must be an object')
    } else if (this._checkWrapper(shader, WebGLShader)) {
      return shader._source
    }
    return null
  }

  getTexParameter (target, pname) {
    target |= 0
    pname |= 0

    if (!this._checkTextureTarget(target)) {
      return null
    }

    const unit = this._getActiveTextureUnit()
    if ((target === gl.TEXTURE_2D && !unit._bind2D) ||
      (target === gl.TEXTURE_CUBE_MAP && !unit._bindCube)) {
      this.setError(gl.INVALID_OPERATION)
      return null
    }

    switch (pname) {
      case gl.TEXTURE_MAG_FILTER:
      case gl.TEXTURE_MIN_FILTER:
      case gl.TEXTURE_WRAP_S:
      case gl.TEXTURE_WRAP_T:
        return super.getTexParameter(target, pname)
    }

    if (this._extensions.ext_texture_filter_anisotropic && pname === this._extensions.ext_texture_filter_anisotropic.TEXTURE_MAX_ANISOTROPY_EXT) {
      return super.getTexParameter(target, pname)
    }

    this.setError(gl.INVALID_ENUM)
    return null
  }

  getUniform (program, location) {
    if (!checkObject(program) ||
      !checkObject(location)) {
      throw new TypeError('getUniform(WebGLProgram, WebGLUniformLocation)')
    } else if (!program) {
      this.setError(gl.INVALID_VALUE)
      return null
    } else if (!location) {
      return null
    } else if (this._checkWrapper(program, WebGLProgram)) {
      if (!checkUniform(program, location)) {
        this.setError(gl.INVALID_OPERATION)
        return null
      }
      const data = super.getUniform(program._ | 0, location._ | 0)
      if (!data) {
        return null
      }
      switch (location._activeInfo.type) {
        case gl.FLOAT:
          return data[0]
        case gl.FLOAT_VEC2:
          return new Float32Array(data.slice(0, 2))
        case gl.FLOAT_VEC3:
          return new Float32Array(data.slice(0, 3))
        case gl.FLOAT_VEC4:
          return new Float32Array(data.slice(0, 4))
        case gl.INT:
          return data[0] | 0
        case gl.INT_VEC2:
          return new Int32Array(data.slice(0, 2))
        case gl.INT_VEC3:
          return new Int32Array(data.slice(0, 3))
        case gl.INT_VEC4:
          return new Int32Array(data.slice(0, 4))
        case gl.BOOL:
          return !!data[0]
        case gl.BOOL_VEC2:
          return [!!data[0], !!data[1]]
        case gl.BOOL_VEC3:
          return [!!data[0], !!data[1], !!data[2]]
        case gl.BOOL_VEC4:
          return [!!data[0], !!data[1], !!data[2], !!data[3]]
        case gl.FLOAT_MAT2:
          return new Float32Array(data.slice(0, 4))
        case gl.FLOAT_MAT3:
          return new Float32Array(data.slice(0, 9))
        case gl.FLOAT_MAT4:
          return new Float32Array(data.slice(0, 16))
        case gl.SAMPLER_2D:
        case gl.SAMPLER_CUBE:
          return data[0] | 0
        default:
          return null
      }
    }
    return null
  }

  getUniformLocation (program, name) {
    if (!checkObject(program)) {
      throw new TypeError('getUniformLocation(WebGLProgram, String)')
    }

    name += ''
    if (!isValidString(name)) {
      this.setError(gl.INVALID_VALUE)
      return
    }

    if (this._checkWrapper(program, WebGLProgram)) {
      const loc = super.getUniformLocation(program._ | 0, name)
      if (loc >= 0) {
        let searchName = name
        if (/\[\d+\]$/.test(name)) {
          searchName = name.replace(/\[\d+\]$/, '[0]')
        }

        let info = null
        for (let i = 0; i < program._uniforms.length; ++i) {
          const infoItem = program._uniforms[i]
          if (infoItem.name === searchName) {
            info = {
              size: infoItem.size,
              type: infoItem.type,
              name: infoItem.name
            }
          }
        }
        if (!info) {
          return null
        }

        const result = new WebGLUniformLocation(
          loc,
          program,
          info)

        // handle array case
        if (/\[0\]$/.test(name)) {
          const baseName = name.replace(/\[0\]$/, '')
          const arrayLocs = []

          // if (offset < 0 || offset >= info.size) {
          //   return null
          // }

          this._saveError()
          for (let i = 0; this.getError() === gl.NO_ERROR; ++i) {
            const xloc = super.getUniformLocation(
              program._ | 0,
              baseName + '[' + i + ']')
            if (this.getError() !== gl.NO_ERROR || xloc < 0) {
              break
            }
            arrayLocs.push(xloc)
          }
          this._restoreError(gl.NO_ERROR)

          result._array = arrayLocs
        } else if (/\[(\d+)\]$/.test(name)) {
          const offset = +(/\[(\d+)\]$/.exec(name))[1]
          if (offset < 0 || offset >= info.size) {
            return null
          }
        }
        return result
      }
    }
    return null
  }

  getVertexAttrib (index, pname) {
    index |= 0
    pname |= 0
    if (index < 0 || index >= this._vertexObjectState._attribs.length) {
      this.setError(gl.INVALID_VALUE)
      return null
    }
    const attrib = this._vertexObjectState._attribs[index]
    const vertexAttribValue = this._vertexGlobalState._attribs[index]._data

    const extInstancing = this._extensions.angle_instanced_arrays
    if (extInstancing) {
      if (pname === extInstancing.VERTEX_ATTRIB_ARRAY_DIVISOR_ANGLE) {
        return attrib._divisor
      }
    }

    switch (pname) {
      case gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING:
        return attrib._pointerBuffer
      case gl.VERTEX_ATTRIB_ARRAY_ENABLED:
        return attrib._isPointer
      case gl.VERTEX_ATTRIB_ARRAY_SIZE:
        return attrib._inputSize
      case gl.VERTEX_ATTRIB_ARRAY_STRIDE:
        return attrib._inputStride
      case gl.VERTEX_ATTRIB_ARRAY_TYPE:
        return attrib._pointerType
      case gl.VERTEX_ATTRIB_ARRAY_NORMALIZED:
        return attrib._pointerNormal
      case gl.CURRENT_VERTEX_ATTRIB:
        return new Float32Array(vertexAttribValue)
      default:
        this.setError(gl.INVALID_ENUM)
        return null
    }
  }

  getVertexAttribOffset (index, pname) {
    index |= 0
    pname |= 0
    if (index < 0 || index >= this._vertexObjectState._attribs.length) {
      this.setError(gl.INVALID_VALUE)
      return null
    }
    if (pname === gl.VERTEX_ATTRIB_ARRAY_POINTER) {
      return this._vertexObjectState._attribs[index]._pointerOffset
    } else {
      this.setError(gl.INVALID_ENUM)
      return null
    }
  }

  hint (target, mode) {
    target |= 0
    mode |= 0

    if (!(
      target === gl.GENERATE_MIPMAP_HINT ||
      (
        this._extensions.oes_standard_derivatives && target === this._extensions.oes_standard_derivatives.FRAGMENT_SHADER_DERIVATIVE_HINT_OES
      )
    )) {
      this.setError(gl.INVALID_ENUM)
      return
    }

    if (mode !== gl.FASTEST &&
      mode !== gl.NICEST &&
      mode !== gl.DONT_CARE) {
      this.setError(gl.INVALID_ENUM)
      return
    }

    return super.hint(target, mode)
  }

  isBuffer (object) {
    if (!this._isObject(object, 'isBuffer', WebGLBuffer)) return false
    return super.isBuffer(object._ | 0)
  }

  isFramebuffer (object) {
    if (!this._isObject(object, 'isFramebuffer', WebGLFramebuffer)) return false
    return super.isFramebuffer(object._ | 0)
  }

  isProgram (object) {
    if (!this._isObject(object, 'isProgram', WebGLProgram)) return false
    return super.isProgram(object._ | 0)
  }

  isRenderbuffer (object) {
    if (!this._isObject(object, 'isRenderbuffer', WebGLRenderbuffer)) return false
    return super.isRenderbuffer(object._ | 0)
  }

  isShader (object) {
    if (!this._isObject(object, 'isShader', WebGLShader)) return false
    return super.isShader(object._ | 0)
  }

  isTexture (object) {
    if (!this._isObject(object, 'isTexture', WebGLTexture)) return false
    return super.isTexture(object._ | 0)
  }

  isEnabled (cap) {
    return super.isEnabled(cap | 0)
  }

  lineWidth (width) {
    if (isNaN(width)) {
      this.setError(gl.INVALID_VALUE)
      return
    }
    return super.lineWidth(+width)
  }

  linkProgram (program) {
    if (!checkObject(program)) {
      throw new TypeError('linkProgram(WebGLProgram)')
    }
    if (this._checkWrapper(program, WebGLProgram)) {
      program._linkCount += 1
      program._attributes = []
      const prevError = this.getError()
      super.linkProgram(program._ | 0)
      const error = this.getError()
      if (error === gl.NO_ERROR) {
        program._linkStatus = this._fixupLink(program)
      }
      this.getError()
      this.setError(prevError || error)
    }
  }

  pixelStorei (pname, param) {
    pname |= 0
    param |= 0
    if (pname === gl.UNPACK_ALIGNMENT) {
      if (param === 1 ||
        param === 2 ||
        param === 4 ||
        param === 8) {
        this._unpackAlignment = param
      } else {
        this.setError(gl.INVALID_VALUE)
        return
      }
    } else if (pname === gl.PACK_ALIGNMENT) {
      if (param === 1 ||
        param === 2 ||
        param === 4 ||
        param === 8) {
        this._packAlignment = param
      } else {
        this.setError(gl.INVALID_VALUE)
        return
      }
    } else if (pname === gl.UNPACK_COLORSPACE_CONVERSION_WEBGL) {
      if (!(param === gl.NONE || param === gl.BROWSER_DEFAULT_WEBGL)) {
        this.setError(gl.INVALID_VALUE)
        return
      }
    }
    return super.pixelStorei(pname, param)
  }

  polygonOffset (factor, units) {
    return super.polygonOffset(+factor, +units)
  }

  readPixels (x, y, width, height, format, type, pixels) {
    x |= 0
    y |= 0
    width |= 0
    height |= 0

    if (!(this._extensions.oes_texture_float && type === gl.FLOAT && format === gl.RGBA)) {
      if (format === gl.RGB ||
        format === gl.ALPHA ||
        type !== gl.UNSIGNED_BYTE) {
        this.setError(gl.INVALID_OPERATION)
        return
      } else if (format !== gl.RGBA) {
        this.setError(gl.INVALID_ENUM)
        return
      } else if (
        width < 0 ||
        height < 0 ||
        !(pixels instanceof Uint8Array)) {
        this.setError(gl.INVALID_VALUE)
        return
      }
    }

    if (!this._framebufferOk()) {
      return
    }

    let rowStride = width * 4
    if (rowStride % this._packAlignment !== 0) {
      rowStride += this._packAlignment - (rowStride % this._packAlignment)
    }

    const imageSize = rowStride * (height - 1) + width * 4
    if (imageSize <= 0) {
      return
    }
    if (pixels.length < imageSize) {
      this.setError(gl.INVALID_VALUE)
      return
    }

    // Handle reading outside the window
    let viewWidth = this.drawingBufferWidth
    let viewHeight = this.drawingBufferHeight

    if (this._activeFramebuffer) {
      viewWidth = this._activeFramebuffer._width
      viewHeight = this._activeFramebuffer._height
    }

    const pixelData = unpackTypedArray(pixels)

    if (x >= viewWidth || x + width <= 0 ||
      y >= viewHeight || y + height <= 0) {
      for (let i = 0; i < pixelData.length; ++i) {
        pixelData[i] = 0
      }
    } else if (x < 0 || x + width > viewWidth ||
      y < 0 || y + height > viewHeight) {
      for (let i = 0; i < pixelData.length; ++i) {
        pixelData[i] = 0
      }

      let nx = x
      let nWidth = width
      if (x < 0) {
        nWidth += x
        nx = 0
      }
      if (nx + width > viewWidth) {
        nWidth = viewWidth - nx
      }
      let ny = y
      let nHeight = height
      if (y < 0) {
        nHeight += y
        ny = 0
      }
      if (ny + height > viewHeight) {
        nHeight = viewHeight - ny
      }

      let nRowStride = nWidth * 4
      if (nRowStride % this._packAlignment !== 0) {
        nRowStride += this._packAlignment - (nRowStride % this._packAlignment)
      }

      if (nWidth > 0 && nHeight > 0) {
        const subPixels = new Uint8Array(nRowStride * nHeight)
        super.readPixels(
          nx,
          ny,
          nWidth,
          nHeight,
          format,
          type,
          subPixels)

        const offset = 4 * (nx - x) + (ny - y) * rowStride
        for (let j = 0; j < nHeight; ++j) {
          for (let i = 0; i < nWidth; ++i) {
            for (let k = 0; k < 4; ++k) {
              pixelData[offset + j * rowStride + 4 * i + k] =
                subPixels[j * nRowStride + 4 * i + k]
            }
          }
        }
      }
    } else {
      super.readPixels(
        x,
        y,
        width,
        height,
        format,
        type,
        pixelData)
    }
  }

  renderbufferStorage (
    target,
    internalFormat,
    width,
    height) {
    target |= 0
    internalFormat |= 0
    width |= 0
    height |= 0

    if (target !== gl.RENDERBUFFER) {
      this.setError(gl.INVALID_ENUM)
      return
    }

    const renderbuffer = this._activeRenderbuffer
    if (!renderbuffer) {
      this.setError(gl.INVALID_OPERATION)
      return
    }

    if (internalFormat !== gl.RGBA4 &&
      internalFormat !== gl.RGB565 &&
      internalFormat !== gl.RGB5_A1 &&
      internalFormat !== gl.DEPTH_COMPONENT16 &&
      internalFormat !== gl.STENCIL_INDEX &&
      internalFormat !== gl.STENCIL_INDEX8 &&
      internalFormat !== gl.DEPTH_STENCIL) {
      this.setError(gl.INVALID_ENUM)
      return
    }

    this._saveError()
    super.renderbufferStorage(
      target,
      internalFormat,
      width,
      height)
    const error = this.getError()
    this._restoreError(error)
    if (error !== gl.NO_ERROR) {
      return
    }

    renderbuffer._width = width
    renderbuffer._height = height
    renderbuffer._format = internalFormat

    const activeFramebuffer = this._activeFramebuffer
    if (activeFramebuffer) {
      let needsUpdate = false
      const attachments = this._getAttachments()
      for (let i = 0; i < attachments.length; ++i) {
        if (activeFramebuffer._attachments[attachments[i]] === renderbuffer) {
          needsUpdate = true
          break
        }
      }
      if (needsUpdate) {
        this._updateFramebufferAttachments(this._activeFramebuffer)
      }
    }
  }

  resize (width, height) {
    width = width | 0
    height = height | 0
    if (!(width > 0 && height > 0)) {
      throw new Error('Invalid surface dimensions')
    } else if (width !== this.drawingBufferWidth ||
      height !== this.drawingBufferHeight) {
      this._resizeDrawingBuffer(width, height)
      this.drawingBufferWidth = width
      this.drawingBufferHeight = height
    }
  }

  sampleCoverage (value, invert) {
    return super.sampleCoverage(+value, !!invert)
  }

  scissor (x, y, width, height) {
    return super.scissor(x | 0, y | 0, width | 0, height | 0)
  }

  shaderSource (shader, source) {
    if (!checkObject(shader)) {
      throw new TypeError('shaderSource(WebGLShader, String)')
    }
    if (!shader || (!source && typeof source !== 'string')) {
      this.setError(gl.INVALID_VALUE)
      return
    }
    source += ''
    if (!isValidString(source)) {
      this.setError(gl.INVALID_VALUE)
    } else if (this._checkWrapper(shader, WebGLShader)) {
      super.shaderSource(shader._ | 0, this._wrapShader(shader._type, source)) // eslint-disable-line
      shader._source = source
    }
  }

  stencilFunc (func, ref, mask) {
    this._checkStencil = true
    return super.stencilFunc(func | 0, ref | 0, mask | 0)
  }

  stencilFuncSeparate (face, func, ref, mask) {
    this._checkStencil = true
    return super.stencilFuncSeparate(face | 0, func | 0, ref | 0, mask | 0)
  }

  stencilMask (mask) {
    this._checkStencil = true
    return super.stencilMask(mask | 0)
  }

  stencilMaskSeparate (face, mask) {
    this._checkStencil = true
    return super.stencilMaskSeparate(face | 0, mask | 0)
  }

  stencilOp (fail, zfail, zpass) {
    this._checkStencil = true
    return super.stencilOp(fail | 0, zfail | 0, zpass | 0)
  }

  stencilOpSeparate (face, fail, zfail, zpass) {
    this._checkStencil = true
    return super.stencilOpSeparate(face | 0, fail | 0, zfail | 0, zpass | 0)
  }

  texImage2D (
    target,
    level,
    internalFormat,
    width,
    height,
    border,
    format,
    type,
    pixels) {
    if (arguments.length === 6) {
      pixels = border
      type = height
      format = width

      pixels = extractImageData(pixels)

      if (pixels == null) {
        throw new TypeError('texImage2D(GLenum, GLint, GLenum, GLint, GLenum, GLenum, ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement)')
      }

      width = pixels.width
      height = pixels.height
      pixels = pixels.data
    }

    target |= 0
    level |= 0
    internalFormat |= 0
    width |= 0
    height |= 0
    border |= 0
    format |= 0
    type |= 0

    if (typeof pixels !== 'object' && pixels !== undefined) {
      throw new TypeError('texImage2D(GLenum, GLint, GLenum, GLint, GLint, GLint, GLenum, GLenum, Uint8Array)')
    }

    if (!checkFormat(format) || !checkFormat(internalFormat)) {
      this.setError(gl.INVALID_ENUM)
      return
    }

    if (type === gl.FLOAT && !this._extensions.oes_texture_float) {
      this.setError(gl.INVALID_ENUM)
      return
    }

    const texture = this._getTexImage(target)
    if (!texture || format !== internalFormat) {
      this.setError(gl.INVALID_OPERATION)
      return
    }

    const pixelSize = this._computePixelSize(type, format)
    if (pixelSize === 0) {
      return
    }

    if (!this._checkDimensions(
      target,
      width,
      height,
      level)) {
      return
    }

    const data = convertPixels(pixels)
    const rowStride = this._computeRowStride(width, pixelSize)
    const imageSize = rowStride * height

    if (data && data.length < imageSize) {
      this.setError(gl.INVALID_OPERATION)
      return
    }

    if (border !== 0 ||
      (validCubeTarget(target) && width !== height)) {
      this.setError(gl.INVALID_VALUE)
      return
    }
    // Need to check for out of memory error
    this._saveError()
    super.texImage2D(
      target,
      level,
      internalFormat,
      width,
      height,
      border,
      format,
      type,
      data)
    const error = this.getError()
    this._restoreError(error)
    if (error !== gl.NO_ERROR) {
      return
    }

    // Save width and height at level
    texture._levelWidth[level] = width
    texture._levelHeight[level] = height
    texture._format = format
    texture._type = type

    const activeFramebuffer = this._activeFramebuffer
    if (activeFramebuffer) {
      let needsUpdate = false
      const attachments = this._getAttachments()
      for (let i = 0; i < attachments.length; ++i) {
        if (activeFramebuffer._attachments[attachments[i]] === texture) {
          needsUpdate = true
          break
        }
      }
      if (needsUpdate) {
        this._updateFramebufferAttachments(this._activeFramebuffer)
      }
    }
  }

  texSubImage2D (
    target,
    level,
    xoffset,
    yoffset,
    width,
    height,
    format,
    type,
    pixels) {
    if (arguments.length === 7) {
      pixels = format
      type = height
      format = width

      pixels = extractImageData(pixels)

      if (pixels == null) {
        throw new TypeError('texSubImage2D(GLenum, GLint, GLint, GLint, GLenum, GLenum, ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement)')
      }

      width = pixels.width
      height = pixels.height
      pixels = pixels.data
    }

    if (typeof pixels !== 'object') {
      throw new TypeError('texSubImage2D(GLenum, GLint, GLint, GLint, GLint, GLint, GLenum, GLenum, Uint8Array)')
    }

    target |= 0
    level |= 0
    xoffset |= 0
    yoffset |= 0
    width |= 0
    height |= 0
    format |= 0
    type |= 0

    const texture = this._getTexImage(target)
    if (!texture) {
      this.setError(gl.INVALID_OPERATION)
      return
    }

    if (type === gl.FLOAT && !this._extensions.oes_texture_float) {
      this.setError(gl.INVALID_ENUM)
      return
    }

    const pixelSize = this._computePixelSize(type, format)
    if (pixelSize === 0) {
      return
    }

    if (!this._checkDimensions(
      target,
      width,
      height,
      level)) {
      return
    }

    if (xoffset < 0 || yoffset < 0) {
      this.setError(gl.INVALID_VALUE)
      return
    }

    const data = convertPixels(pixels)
    const rowStride = this._computeRowStride(width, pixelSize)
    const imageSize = rowStride * height

    if (!data || data.length < imageSize) {
      this.setError(gl.INVALID_OPERATION)
      return
    }

    super.texSubImage2D(
      target,
      level,
      xoffset,
      yoffset,
      width,
      height,
      format,
      type,
      data)
  }

  texParameterf (target, pname, param) {
    target |= 0
    pname |= 0
    param = +param

    if (this._checkTextureTarget(target)) {
      this._verifyTextureCompleteness(target, pname, param)
      switch (pname) {
        case gl.TEXTURE_MIN_FILTER:
        case gl.TEXTURE_MAG_FILTER:
        case gl.TEXTURE_WRAP_S:
        case gl.TEXTURE_WRAP_T:
          return super.texParameterf(target, pname, param)
      }

      if (this._extensions.ext_texture_filter_anisotropic && pname === this._extensions.ext_texture_filter_anisotropic.TEXTURE_MAX_ANISOTROPY_EXT) {
        return super.texParameterf(target, pname, param)
      }

      this.setError(gl.INVALID_ENUM)
    }
  }

  texParameteri (target, pname, param) {
    target |= 0
    pname |= 0
    param |= 0

    if (this._checkTextureTarget(target)) {
      this._verifyTextureCompleteness(target, pname, param)
      switch (pname) {
        case gl.TEXTURE_MIN_FILTER:
        case gl.TEXTURE_MAG_FILTER:
        case gl.TEXTURE_WRAP_S:
        case gl.TEXTURE_WRAP_T:
          return super.texParameteri(target, pname, param)
      }

      if (this._extensions.ext_texture_filter_anisotropic && pname === this._extensions.ext_texture_filter_anisotropic.TEXTURE_MAX_ANISOTROPY_EXT) {
        return super.texParameteri(target, pname, param)
      }

      this.setError(gl.INVALID_ENUM)
    }
  }

  useProgram (program) {
    if (!checkObject(program)) {
      throw new TypeError('useProgram(WebGLProgram)')
    } else if (!program) {
      this._switchActiveProgram(this._activeProgram)
      this._activeProgram = null
      return super.useProgram(0)
    } else if (this._checkWrapper(program, WebGLProgram)) {
      if (this._activeProgram !== program) {
        this._switchActiveProgram(this._activeProgram)
        this._activeProgram = program
        program._refCount += 1
      }
      return super.useProgram(program._ | 0)
    }
  }

  validateProgram (program) {
    if (this._checkWrapper(program, WebGLProgram)) {
      super.validateProgram(program._ | 0)
      const error = this.getError()
      if (error === gl.NO_ERROR) {
        program._linkInfoLog = super.getProgramInfoLog(program._ | 0)
      }
      this.getError()
      this.setError(error)
    }
  }

  vertexAttribPointer (
    index,
    size,
    type,
    normalized,
    stride,
    offset) {
    if (stride < 0 || offset < 0) {
      this.setError(gl.INVALID_VALUE)
      return
    }

    index |= 0
    size |= 0
    type |= 0
    normalized = !!normalized
    stride |= 0
    offset |= 0

    if (stride < 0 ||
      offset < 0 ||
      index < 0 || index >= this._vertexObjectState._attribs.length ||
      !(size === 1 || size === 2 || size === 3 || size === 4)) {
      this.setError(gl.INVALID_VALUE)
      return
    }

    if (this._vertexGlobalState._arrayBufferBinding === null) {
      this.setError(gl.INVALID_OPERATION)
      return
    }

    // fixed, int and unsigned int aren't allowed in WebGL
    const byteSize = typeSize(type)
    if (byteSize === 0 ||
      type === gl.INT ||
      type === gl.UNSIGNED_INT) {
      this.setError(gl.INVALID_ENUM)
      return
    }

    if (stride > 255 || stride < 0) {
      this.setError(gl.INVALID_VALUE)
      return
    }

    // stride and offset must be multiples of size
    if ((stride % byteSize) !== 0 ||
      (offset % byteSize) !== 0) {
      this.setError(gl.INVALID_OPERATION)
      return
    }

    // Call vertex attrib pointer
    super.vertexAttribPointer(index, size, type, normalized, stride, offset)

    // Update the vertex state object and references.
    this._vertexObjectState.setVertexAttribPointer(
      /* buffer */ this._vertexGlobalState._arrayBufferBinding,
      /* index */ index,
      /* pointerSize */ size * byteSize,
      /* pointerOffset */ offset,
      /* pointerStride */ stride || (size * byteSize),
      /* pointerType */ type,
      /* pointerNormal */ normalized,
      /* inputStride */ stride,
      /* inputSize */ size
    )
  }

  viewport (x, y, width, height) {
    return super.viewport(x | 0, y | 0, width | 0, height | 0)
  }

  _allocateDrawingBuffer (width, height) {
    this._drawingBuffer = new WebGLDrawingBufferWrapper(
      super.createFramebuffer(),
      super.createTexture(),
      super.createRenderbuffer())

    this._resizeDrawingBuffer(width, height)
  }

  isContextLost () {
    return false
  }

  compressedTexImage2D () {
    // TODO not yet implemented
  }

  compressedTexSubImage2D () {
    // TODO not yet implemented
  }

  _checkUniformValid (location, v0, name, count, type) {
    if (!checkObject(location)) {
      throw new TypeError(`${name}(WebGLUniformLocation, ...)`)
    } else if (!location) {
      return false
    } else if (this._checkLocationActive(location)) {
      const utype = location._activeInfo.type
      if (utype === gl.SAMPLER_2D || utype === gl.SAMPLER_CUBE) {
        if (count !== 1) {
          this.setError(gl.INVALID_VALUE)
          return
        }
        if (type !== 'i') {
          this.setError(gl.INVALID_OPERATION)
          return
        }
        if (v0 < 0 || v0 >= this._textureUnits.length) {
          this.setError(gl.INVALID_VALUE)
          return false
        }
      }
      if (uniformTypeSize(utype) > count) {
        this.setError(gl.INVALID_OPERATION)
        return false
      }
      return true
    }
    return false
  }

  _checkUniformValueValid (location, value, name, count, type) {
    if (!checkObject(location) ||
      !checkObject(value)) {
      throw new TypeError(`${name}v(WebGLUniformLocation, Array)`)
    } else if (!location) {
      return false
    } else if (!this._checkLocationActive(location)) {
      return false
    } else if (typeof value !== 'object' || !value || typeof value.length !== 'number') {
      throw new TypeError(`Second argument to ${name} must be array`)
    } else if (uniformTypeSize(location._activeInfo.type) > count) {
      this.setError(gl.INVALID_OPERATION)
      return false
    } else if (value.length >= count && value.length % count === 0) {
      if (location._array) {
        return true
      } else if (value.length === count) {
        return true
      } else {
        this.setError(gl.INVALID_OPERATION)
        return false
      }
    }
    this.setError(gl.INVALID_VALUE)
    return false
  }

  uniform1f (location, v0) {
    if (!this._checkUniformValid(location, v0, 'uniform1f', 1, 'f')) return
    super.uniform1f(location._ | 0, v0)
  }

  uniform1fv (location, value) {
    if (!this._checkUniformValueValid(location, value, 'uniform1fv', 1, 'f')) return
    if (location._array) {
      const locs = location._array
      for (let i = 0; i < locs.length && i < value.length; ++i) {
        const loc = locs[i]
        super.uniform1f(loc, value[i])
      }
      return
    }
    super.uniform1f(location._ | 0, value[0])
  }

  uniform1i (location, v0) {
    if (!this._checkUniformValid(location, v0, 'uniform1i', 1, 'i')) return
    super.uniform1i(location._ | 0, v0)
  }

  uniform1iv (location, value) {
    if (!this._checkUniformValueValid(location, value, 'uniform1iv', 1, 'i')) return
    if (location._array) {
      const locs = location._array
      for (let i = 0; i < locs.length && i < value.length; ++i) {
        const loc = locs[i]
        super.uniform1i(loc, value[i])
      }
      return
    }
    this.uniform1i(location, value[0])
  }

  uniform2f (location, v0, v1) {
    if (!this._checkUniformValid(location, v0, 'uniform2f', 2, 'f')) return
    super.uniform2f(location._ | 0, v0, v1)
  }

  uniform2fv (location, value) {
    if (!this._checkUniformValueValid(location, value, 'uniform2fv', 2, 'f')) return
    if (location._array) {
      const locs = location._array
      for (let i = 0; i < locs.length && 2 * i < value.length; ++i) {
        const loc = locs[i]
        super.uniform2f(loc, value[2 * i], value[(2 * i) + 1])
      }
      return
    }
    super.uniform2f(location._ | 0, value[0], value[1])
  }

  uniform2i (location, v0, v1) {
    if (!this._checkUniformValid(location, v0, 'uniform2i', 2, 'i')) return
    super.uniform2i(location._ | 0, v0, v1)
  }

  uniform2iv (location, value) {
    if (!this._checkUniformValueValid(location, value, 'uniform2iv', 2, 'i')) return
    if (location._array) {
      const locs = location._array
      for (let i = 0; i < locs.length && 2 * i < value.length; ++i) {
        const loc = locs[i]
        super.uniform2i(loc, value[2 * i], value[2 * i + 1])
      }
      return
    }
    this.uniform2i(location, value[0], value[1])
  }

  uniform3f (location, v0, v1, v2) {
    if (!this._checkUniformValid(location, v0, 'uniform3f', 3, 'f')) return
    super.uniform3f(location._ | 0, v0, v1, v2)
  }

  uniform3fv (location, value) {
    if (!this._checkUniformValueValid(location, value, 'uniform3fv', 3, 'f')) return
    if (location._array) {
      const locs = location._array
      for (let i = 0; i < locs.length && 3 * i < value.length; ++i) {
        const loc = locs[i]
        super.uniform3f(loc, value[3 * i], value[3 * i + 1], value[3 * i + 2])
      }
      return
    }
    super.uniform3f(location._ | 0, value[0], value[1], value[2])
  }

  uniform3i (location, v0, v1, v2) {
    if (!this._checkUniformValid(location, v0, 'uniform3i', 3, 'i')) return
    super.uniform3i(location._ | 0, v0, v1, v2)
  }

  uniform3iv (location, value) {
    if (!this._checkUniformValueValid(location, value, 'uniform3iv', 3, 'i')) return
    if (location._array) {
      const locs = location._array
      for (let i = 0; i < locs.length && 3 * i < value.length; ++i) {
        const loc = locs[i]
        super.uniform3i(loc, value[3 * i], value[3 * i + 1], value[3 * i + 2])
      }
      return
    }
    this.uniform3i(location, value[0], value[1], value[2])
  }

  uniform4f (location, v0, v1, v2, v3) {
    if (!this._checkUniformValid(location, v0, 'uniform4f', 4, 'f')) return
    super.uniform4f(location._ | 0, v0, v1, v2, v3)
  }

  uniform4fv (location, value) {
    if (!this._checkUniformValueValid(location, value, 'uniform4fv', 4, 'f')) return
    if (location._array) {
      const locs = location._array
      for (let i = 0; i < locs.length && 4 * i < value.length; ++i) {
        const loc = locs[i]
        super.uniform4f(loc, value[4 * i], value[4 * i + 1], value[4 * i + 2], value[4 * i + 3])
      }
      return
    }
    super.uniform4f(location._ | 0, value[0], value[1], value[2], value[3])
  }

  uniform4i (location, v0, v1, v2, v3) {
    if (!this._checkUniformValid(location, v0, 'uniform4i', 4, 'i')) return
    super.uniform4i(location._ | 0, v0, v1, v2, v3)
  }

  uniform4iv (location, value) {
    if (!this._checkUniformValueValid(location, value, 'uniform4iv', 4, 'i')) return
    if (location._array) {
      const locs = location._array
      for (let i = 0; i < locs.length && 4 * i < value.length; ++i) {
        const loc = locs[i]
        super.uniform4i(loc, value[4 * i], value[4 * i + 1], value[4 * i + 2], value[4 * i + 3])
      }
      return
    }
    this.uniform4i(location, value[0], value[1], value[2], value[3])
  }

  _checkUniformMatrix (location, transpose, value, name, count) {
    if (!checkObject(location) ||
      typeof value !== 'object') {
      throw new TypeError(name + '(WebGLUniformLocation, Boolean, Array)')
    } else if (!!transpose ||
      typeof value !== 'object' ||
      value === null ||
      !value.length ||
      value.length % count * count !== 0) {
      this.setError(gl.INVALID_VALUE)
      return false
    }
    if (!location) {
      return false
    }
    if (!this._checkLocationActive(location)) {
      return false
    }

    if (value.length === count * count) {
      return true
    } else if (location._array) {
      return true
    }
    this.setError(gl.INVALID_VALUE)
    return false
  }

  uniformMatrix2fv (location, transpose, value) {
    if (!this._checkUniformMatrix(location, transpose, value, 'uniformMatrix2fv', 2)) return
    const data = new Float32Array(value)
    super.uniformMatrix2fv(
      location._ | 0,
      !!transpose,
      data)
  }

  uniformMatrix3fv (location, transpose, value) {
    if (!this._checkUniformMatrix(location, transpose, value, 'uniformMatrix3fv', 3)) return
    const data = new Float32Array(value)
    super.uniformMatrix3fv(
      location._ | 0,
      !!transpose,
      data)
  }

  uniformMatrix4fv (location, transpose, value) {
    if (!this._checkUniformMatrix(location, transpose, value, 'uniformMatrix4fv', 4)) return
    const data = new Float32Array(value)
    super.uniformMatrix4fv(
      location._ | 0,
      !!transpose,
      data)
  }

  vertexAttrib1f (index, v0) {
    index |= 0
    if (!this._checkVertexIndex(index)) return
    const data = this._vertexGlobalState._attribs[index]._data
    data[3] = 1
    data[1] = data[2] = 0
    data[0] = v0
    return super.vertexAttrib1f(index | 0, +v0)
  }

  vertexAttrib2f (index, v0, v1) {
    index |= 0
    if (!this._checkVertexIndex(index)) return
    const data = this._vertexGlobalState._attribs[index]._data
    data[3] = 1
    data[2] = 0
    data[1] = v1
    data[0] = v0
    return super.vertexAttrib2f(index | 0, +v0, +v1)
  }

  vertexAttrib3f (index, v0, v1, v2) {
    index |= 0
    if (!this._checkVertexIndex(index)) return
    const data = this._vertexGlobalState._attribs[index]._data
    data[3] = 1
    data[2] = v2
    data[1] = v1
    data[0] = v0
    return super.vertexAttrib3f(index | 0, +v0, +v1, +v2)
  }

  vertexAttrib4f (index, v0, v1, v2, v3) {
    index |= 0
    if (!this._checkVertexIndex(index)) return
    const data = this._vertexGlobalState._attribs[index]._data
    data[3] = v3
    data[2] = v2
    data[1] = v1
    data[0] = v0
    return super.vertexAttrib4f(index | 0, +v0, +v1, +v2, +v3)
  }

  vertexAttrib1fv (index, value) {
    if (typeof value !== 'object' || value === null || value.length < 1) {
      this.setError(gl.INVALID_OPERATION)
      return
    }
    const data = this._vertexGlobalState._attribs[index]._data
    data[3] = 1
    data[2] = 0
    data[1] = 0
    data[0] = value[0]
    return super.vertexAttrib1f(index | 0, +value[0])
  }

  vertexAttrib2fv (index, value) {
    if (typeof value !== 'object' || value === null || value.length < 2) {
      this.setError(gl.INVALID_OPERATION)
      return
    }
    const data = this._vertexGlobalState._attribs[index]._data
    data[3] = 1
    data[2] = 0
    data[1] = value[1]
    data[0] = value[0]
    return super.vertexAttrib2f(index | 0, +value[0], +value[1])
  }

  vertexAttrib3fv (index, value) {
    if (typeof value !== 'object' || value === null || value.length < 3) {
      this.setError(gl.INVALID_OPERATION)
      return
    }
    const data = this._vertexGlobalState._attribs[index]._data
    data[3] = 1
    data[2] = value[2]
    data[1] = value[1]
    data[0] = value[0]
    return super.vertexAttrib3f(index | 0, +value[0], +value[1], +value[2])
  }

  vertexAttrib4fv (index, value) {
    if (typeof value !== 'object' || value === null || value.length < 4) {
      this.setError(gl.INVALID_OPERATION)
      return
    }
    const data = this._vertexGlobalState._attribs[index]._data
    data[3] = value[3]
    data[2] = value[2]
    data[1] = value[1]
    data[0] = value[0]
    return super.vertexAttrib4f(index | 0, +value[0], +value[1], +value[2], +value[3])
  }
}

// Make the gl consts available as static properties
for (const [key, value] of Object.entries(gl)) {
  if (typeof value !== 'number') {
    continue
  }
  Object.assign(WebGLRenderingContext, { [key]: value })
}

module.exports = { WebGLRenderingContext, wrapContext }


/***/ }),

/***/ "./node_modules/gl/src/javascript/webgl-shader-precision-format.js":
/*!*************************************************************************!*\
  !*** ./node_modules/gl/src/javascript/webgl-shader-precision-format.js ***!
  \*************************************************************************/
/***/ ((module) => {

class WebGLShaderPrecisionFormat {
  constructor (_) {
    this.rangeMin = _.rangeMin
    this.rangeMax = _.rangeMax
    this.precision = _.precision
  }
}

module.exports = { WebGLShaderPrecisionFormat }


/***/ }),

/***/ "./node_modules/gl/src/javascript/webgl-shader.js":
/*!********************************************************!*\
  !*** ./node_modules/gl/src/javascript/webgl-shader.js ***!
  \********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { gl } = __webpack_require__(/*! ./native-gl */ "./node_modules/gl/src/javascript/native-gl.js")
const { Linkable } = __webpack_require__(/*! ./linkable */ "./node_modules/gl/src/javascript/linkable.js")

class WebGLShader extends Linkable {
  constructor (_, ctx, type) {
    super(_)
    this._type = type
    this._ctx = ctx
    this._source = ''
    this._compileStatus = false
    this._compileInfo = ''
  }

  _performDelete () {
    const ctx = this._ctx
    delete ctx._shaders[this._ | 0]
    gl.deleteShader.call(ctx, this._ | 0)
  }
}

module.exports = { WebGLShader }


/***/ }),

/***/ "./node_modules/gl/src/javascript/webgl-texture-unit.js":
/*!**************************************************************!*\
  !*** ./node_modules/gl/src/javascript/webgl-texture-unit.js ***!
  \**************************************************************/
/***/ ((module) => {

class WebGLTextureUnit {
  constructor (ctx, idx) {
    this._ctx = ctx
    this._idx = idx
    this._mode = 0
    this._bind2D = null
    this._bindCube = null
  }
}

module.exports = { WebGLTextureUnit }


/***/ }),

/***/ "./node_modules/gl/src/javascript/webgl-texture.js":
/*!*********************************************************!*\
  !*** ./node_modules/gl/src/javascript/webgl-texture.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { Linkable } = __webpack_require__(/*! ./linkable */ "./node_modules/gl/src/javascript/linkable.js")
const { gl } = __webpack_require__(/*! ./native-gl */ "./node_modules/gl/src/javascript/native-gl.js")

class WebGLTexture extends Linkable {
  constructor (_, ctx) {
    super(_)
    this._ctx = ctx
    this._binding = 0
    this._levelWidth = new Int32Array(32)
    this._levelHeight = new Int32Array(32)
    this._format = 0
    this._type = 0
    this._complete = true
  }

  _performDelete () {
    const ctx = this._ctx
    delete ctx._textures[this._ | 0]
    gl.deleteTexture.call(ctx, this._ | 0)
  }
}

module.exports = { WebGLTexture }


/***/ }),

/***/ "./node_modules/gl/src/javascript/webgl-uniform-location.js":
/*!******************************************************************!*\
  !*** ./node_modules/gl/src/javascript/webgl-uniform-location.js ***!
  \******************************************************************/
/***/ ((module) => {

class WebGLUniformLocation {
  constructor (_, program, info) {
    this._ = _
    this._program = program
    this._linkCount = program._linkCount
    this._activeInfo = info
    this._array = null
  }
}

module.exports = { WebGLUniformLocation }


/***/ }),

/***/ "./node_modules/gl/src/javascript/webgl-vertex-attribute.js":
/*!******************************************************************!*\
  !*** ./node_modules/gl/src/javascript/webgl-vertex-attribute.js ***!
  \******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { gl } = __webpack_require__(/*! ./native-gl */ "./node_modules/gl/src/javascript/native-gl.js")
const { WebGLBuffer } = __webpack_require__(/*! ./webgl-buffer */ "./node_modules/gl/src/javascript/webgl-buffer.js")

class WebGLVertexArrayObjectAttribute {
  constructor (ctx, idx) {
    this._ctx = ctx
    this._idx = idx
    this._clear()
  }

  _clear () {
    this._isPointer = false
    this._pointerBuffer = null
    this._pointerOffset = 0
    this._pointerSize = 0
    this._pointerStride = 0
    this._pointerType = gl.FLOAT
    this._pointerNormal = false
    this._divisor = 0
    this._inputSize = 4
    this._inputStride = 0
  }
}

class WebGLVertexArrayGlobalAttribute {
  constructor (idx) {
    this._idx = idx
    this._data = new Float32Array([0, 0, 0, 1])
  }
}

class WebGLVertexArrayObjectState {
  constructor (ctx) {
    const numAttribs = ctx.getParameter(ctx.MAX_VERTEX_ATTRIBS)
    this._attribs = new Array(numAttribs)
    for (let i = 0; i < numAttribs; ++i) {
      this._attribs[i] = new WebGLVertexArrayObjectAttribute(ctx, i)
    }
    this._elementArrayBufferBinding = null
  }

  setElementArrayBuffer (buffer) {
    if (buffer !== null && !(buffer instanceof WebGLBuffer)) {
      throw new TypeError('setElementArrayBuffer(WebGLBuffer?)')
    }
    const current = this._elementArrayBufferBinding
    if (current !== buffer) {
      if (current) {
        current._refCount -= 1
        current._checkDelete()
      }
      if (buffer) {
        buffer._refCount += 1
      }
      this._elementArrayBufferBinding = buffer
    }
  }

  cleanUp () {
    const elementArrayBuffer = this._elementArrayBufferBinding
    if (elementArrayBuffer) {
      elementArrayBuffer._refCount -= 1
      elementArrayBuffer._checkDelete()
      this._elementArrayBufferBinding = null
    }

    for (let i = 0; i < this._attribs.length; ++i) {
      const attrib = this._attribs[i]
      if (attrib._pointerBuffer) {
        attrib._pointerBuffer._refCount -= 1
        attrib._pointerBuffer._checkDelete()
      }
      attrib._clear()
    }
  }

  releaseArrayBuffer (buffer) {
    if (!buffer) {
      return
    }
    for (let i = 0; i < this._attribs.length; ++i) {
      const attrib = this._attribs[i]
      if (attrib._pointerBuffer === buffer) {
        attrib._pointerBuffer._refCount -= 1
        attrib._pointerBuffer._checkDelete()
        attrib._clear()
      }
    }
  }

  setVertexAttribPointer (
    buffer,
    index,
    pointerSize,
    pointerOffset,
    pointerStride,
    pointerType,
    pointerNormal,
    inputStride,
    inputSize) {
    const attrib = this._attribs[index]
    if (buffer !== attrib._pointerBuffer) {
      if (attrib._pointerBuffer) {
        attrib._pointerBuffer._refCount -= 1
        attrib._pointerBuffer._checkDelete()
      }
      if (buffer) {
        buffer._refCount += 1
      }
      attrib._pointerBuffer = buffer
    }
    attrib._pointerSize = pointerSize
    attrib._pointerOffset = pointerOffset
    attrib._pointerStride = pointerStride
    attrib._pointerType = pointerType
    attrib._pointerNormal = pointerNormal
    attrib._inputStride = inputStride
    attrib._inputSize = inputSize
  }
}

class WebGLVertexArrayGlobalState {
  constructor (ctx) {
    const numAttribs = ctx.getParameter(ctx.MAX_VERTEX_ATTRIBS)
    this._attribs = new Array(numAttribs)
    for (let i = 0; i < numAttribs; ++i) {
      this._attribs[i] = new WebGLVertexArrayGlobalAttribute(i)
    }
    this._arrayBufferBinding = null
  }

  setArrayBuffer (buffer) {
    if (buffer !== null && !(buffer instanceof WebGLBuffer)) {
      throw new TypeError('setArrayBuffer(WebGLBuffer?)')
    }
    const current = this._arrayBufferBinding
    if (current !== buffer) {
      if (current) {
        current._refCount -= 1
        current._checkDelete()
      }
      if (buffer) {
        buffer._refCount += 1
      }
      this._arrayBufferBinding = buffer
    }
  }
}

module.exports = {
  WebGLVertexArrayObjectAttribute,
  WebGLVertexArrayGlobalAttribute,
  WebGLVertexArrayObjectState,
  WebGLVertexArrayGlobalState
}


/***/ }),

/***/ "./node_modules/glsl-tokenizer/index.js":
/*!**********************************************!*\
  !*** ./node_modules/glsl-tokenizer/index.js ***!
  \**********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = tokenize

var literals100 = __webpack_require__(/*! ./lib/literals */ "./node_modules/glsl-tokenizer/lib/literals.js")
  , operators = __webpack_require__(/*! ./lib/operators */ "./node_modules/glsl-tokenizer/lib/operators.js")
  , builtins100 = __webpack_require__(/*! ./lib/builtins */ "./node_modules/glsl-tokenizer/lib/builtins.js")
  , literals300es = __webpack_require__(/*! ./lib/literals-300es */ "./node_modules/glsl-tokenizer/lib/literals-300es.js")
  , builtins300es = __webpack_require__(/*! ./lib/builtins-300es */ "./node_modules/glsl-tokenizer/lib/builtins-300es.js")

var NORMAL = 999          // <-- never emitted
  , TOKEN = 9999          // <-- never emitted
  , BLOCK_COMMENT = 0
  , LINE_COMMENT = 1
  , PREPROCESSOR = 2
  , OPERATOR = 3
  , INTEGER = 4
  , FLOAT = 5
  , IDENT = 6
  , BUILTIN = 7
  , KEYWORD = 8
  , WHITESPACE = 9
  , EOF = 10
  , HEX = 11

var map = [
    'block-comment'
  , 'line-comment'
  , 'preprocessor'
  , 'operator'
  , 'integer'
  , 'float'
  , 'ident'
  , 'builtin'
  , 'keyword'
  , 'whitespace'
  , 'eof'
  , 'integer'
]

function tokenize(opt) {
  var i = 0
    , total = 0
    , mode = NORMAL
    , c
    , last
    , content = []
    , tokens = []
    , token_idx = 0
    , token_offs = 0
    , line = 1
    , col = 0
    , start = 0
    , isnum = false
    , isoperator = false
    , input = ''
    , len

  opt = opt || {}
  var allBuiltins = builtins100
  var allLiterals = literals100
  if (opt.version === '300 es') {
    allBuiltins = builtins300es
    allLiterals = literals300es
  }

  // cache by name
  var builtinsDict = {}, literalsDict = {}
  for (var i = 0; i < allBuiltins.length; i++) {
    builtinsDict[allBuiltins[i]] = true
  }
  for (var i = 0; i < allLiterals.length; i++) {
    literalsDict[allLiterals[i]] = true
  }

  return function(data) {
    tokens = []
    if (data !== null) return write(data)
    return end()
  }

  function token(data) {
    if (data.length) {
      tokens.push({
        type: map[mode]
      , data: data
      , position: start
      , line: line
      , column: col
      })
    }
  }

  function write(chunk) {
    i = 0

    if (chunk.toString) chunk = chunk.toString()

    input += chunk.replace(/\r\n/g, '\n')
    len = input.length


    var last

    while(c = input[i], i < len) {
      last = i

      switch(mode) {
        case BLOCK_COMMENT: i = block_comment(); break
        case LINE_COMMENT: i = line_comment(); break
        case PREPROCESSOR: i = preprocessor(); break
        case OPERATOR: i = operator(); break
        case INTEGER: i = integer(); break
        case HEX: i = hex(); break
        case FLOAT: i = decimal(); break
        case TOKEN: i = readtoken(); break
        case WHITESPACE: i = whitespace(); break
        case NORMAL: i = normal(); break
      }

      if(last !== i) {
        switch(input[last]) {
          case '\n': col = 0; ++line; break
          default: ++col; break
        }
      }
    }

    total += i
    input = input.slice(i)
    return tokens
  }

  function end(chunk) {
    if(content.length) {
      token(content.join(''))
    }

    mode = EOF
    token('(eof)')
    return tokens
  }

  function normal() {
    content = content.length ? [] : content

    if(last === '/' && c === '*') {
      start = total + i - 1
      mode = BLOCK_COMMENT
      last = c
      return i + 1
    }

    if(last === '/' && c === '/') {
      start = total + i - 1
      mode = LINE_COMMENT
      last = c
      return i + 1
    }

    if(c === '#') {
      mode = PREPROCESSOR
      start = total + i
      return i
    }

    if(/\s/.test(c)) {
      mode = WHITESPACE
      start = total + i
      return i
    }

    isnum = /\d/.test(c)
    isoperator = /[^\w_]/.test(c)

    start = total + i
    mode = isnum ? INTEGER : isoperator ? OPERATOR : TOKEN
    return i
  }

  function whitespace() {
    if(/[^\s]/g.test(c)) {
      token(content.join(''))
      mode = NORMAL
      return i
    }
    content.push(c)
    last = c
    return i + 1
  }

  function preprocessor() {
    if((c === '\r' || c === '\n') && last !== '\\') {
      token(content.join(''))
      mode = NORMAL
      return i
    }
    content.push(c)
    last = c
    return i + 1
  }

  function line_comment() {
    return preprocessor()
  }

  function block_comment() {
    if(c === '/' && last === '*') {
      content.push(c)
      token(content.join(''))
      mode = NORMAL
      return i + 1
    }

    content.push(c)
    last = c
    return i + 1
  }

  function operator() {
    if(last === '.' && /\d/.test(c)) {
      mode = FLOAT
      return i
    }

    if(last === '/' && c === '*') {
      mode = BLOCK_COMMENT
      return i
    }

    if(last === '/' && c === '/') {
      mode = LINE_COMMENT
      return i
    }

    if(c === '.' && content.length) {
      while(determine_operator(content));

      mode = FLOAT
      return i
    }

    if(c === ';' || c === ')' || c === '(') {
      if(content.length) while(determine_operator(content));
      token(c)
      mode = NORMAL
      return i + 1
    }

    var is_composite_operator = content.length === 2 && c !== '='
    if(/[\w_\d\s]/.test(c) || is_composite_operator) {
      while(determine_operator(content));
      mode = NORMAL
      return i
    }

    content.push(c)
    last = c
    return i + 1
  }

  function determine_operator(buf) {
    var j = 0
      , idx
      , res

    do {
      idx = operators.indexOf(buf.slice(0, buf.length + j).join(''))
      res = operators[idx]

      if(idx === -1) {
        if(j-- + buf.length > 0) continue
        res = buf.slice(0, 1).join('')
      }

      token(res)

      start += res.length
      content = content.slice(res.length)
      return content.length
    } while(1)
  }

  function hex() {
    if(/[^a-fA-F0-9]/.test(c)) {
      token(content.join(''))
      mode = NORMAL
      return i
    }

    content.push(c)
    last = c
    return i + 1
  }

  function integer() {
    if(c === '.') {
      content.push(c)
      mode = FLOAT
      last = c
      return i + 1
    }

    if(/[eE]/.test(c)) {
      content.push(c)
      mode = FLOAT
      last = c
      return i + 1
    }

    if(c === 'x' && content.length === 1 && content[0] === '0') {
      mode = HEX
      content.push(c)
      last = c
      return i + 1
    }

    if(/[^\d]/.test(c)) {
      token(content.join(''))
      mode = NORMAL
      return i
    }

    content.push(c)
    last = c
    return i + 1
  }

  function decimal() {
    if(c === 'f') {
      content.push(c)
      last = c
      i += 1
    }

    if(/[eE]/.test(c)) {
      content.push(c)
      last = c
      return i + 1
    }

    if ((c === '-' || c === '+') && /[eE]/.test(last)) {
      content.push(c)
      last = c
      return i + 1
    }

    if(/[^\d]/.test(c)) {
      token(content.join(''))
      mode = NORMAL
      return i
    }

    content.push(c)
    last = c
    return i + 1
  }

  function readtoken() {
    if(/[^\d\w_]/.test(c)) {
      var contentstr = content.join('')
      if(literalsDict[contentstr]) {
        mode = KEYWORD
      } else if(builtinsDict[contentstr]) {
        mode = BUILTIN
      } else {
        mode = IDENT
      }
      token(content.join(''))
      mode = NORMAL
      return i
    }
    content.push(c)
    last = c
    return i + 1
  }
}


/***/ }),

/***/ "./node_modules/glsl-tokenizer/lib/builtins-300es.js":
/*!***********************************************************!*\
  !*** ./node_modules/glsl-tokenizer/lib/builtins-300es.js ***!
  \***********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// 300es builtins/reserved words that were previously valid in v100
var v100 = __webpack_require__(/*! ./builtins */ "./node_modules/glsl-tokenizer/lib/builtins.js")

// The texture2D|Cube functions have been removed
// And the gl_ features are updated
v100 = v100.slice().filter(function (b) {
  return !/^(gl\_|texture)/.test(b)
})

module.exports = v100.concat([
  // the updated gl_ constants
    'gl_VertexID'
  , 'gl_InstanceID'
  , 'gl_Position'
  , 'gl_PointSize'
  , 'gl_FragCoord'
  , 'gl_FrontFacing'
  , 'gl_FragDepth'
  , 'gl_PointCoord'
  , 'gl_MaxVertexAttribs'
  , 'gl_MaxVertexUniformVectors'
  , 'gl_MaxVertexOutputVectors'
  , 'gl_MaxFragmentInputVectors'
  , 'gl_MaxVertexTextureImageUnits'
  , 'gl_MaxCombinedTextureImageUnits'
  , 'gl_MaxTextureImageUnits'
  , 'gl_MaxFragmentUniformVectors'
  , 'gl_MaxDrawBuffers'
  , 'gl_MinProgramTexelOffset'
  , 'gl_MaxProgramTexelOffset'
  , 'gl_DepthRangeParameters'
  , 'gl_DepthRange'

  // other builtins
  , 'trunc'
  , 'round'
  , 'roundEven'
  , 'isnan'
  , 'isinf'
  , 'floatBitsToInt'
  , 'floatBitsToUint'
  , 'intBitsToFloat'
  , 'uintBitsToFloat'
  , 'packSnorm2x16'
  , 'unpackSnorm2x16'
  , 'packUnorm2x16'
  , 'unpackUnorm2x16'
  , 'packHalf2x16'
  , 'unpackHalf2x16'
  , 'outerProduct'
  , 'transpose'
  , 'determinant'
  , 'inverse'
  , 'texture'
  , 'textureSize'
  , 'textureProj'
  , 'textureLod'
  , 'textureOffset'
  , 'texelFetch'
  , 'texelFetchOffset'
  , 'textureProjOffset'
  , 'textureLodOffset'
  , 'textureProjLod'
  , 'textureProjLodOffset'
  , 'textureGrad'
  , 'textureGradOffset'
  , 'textureProjGrad'
  , 'textureProjGradOffset'
])


/***/ }),

/***/ "./node_modules/glsl-tokenizer/lib/builtins.js":
/*!*****************************************************!*\
  !*** ./node_modules/glsl-tokenizer/lib/builtins.js ***!
  \*****************************************************/
/***/ ((module) => {

module.exports = [
  // Keep this list sorted
  'abs'
  , 'acos'
  , 'all'
  , 'any'
  , 'asin'
  , 'atan'
  , 'ceil'
  , 'clamp'
  , 'cos'
  , 'cross'
  , 'dFdx'
  , 'dFdy'
  , 'degrees'
  , 'distance'
  , 'dot'
  , 'equal'
  , 'exp'
  , 'exp2'
  , 'faceforward'
  , 'floor'
  , 'fract'
  , 'gl_BackColor'
  , 'gl_BackLightModelProduct'
  , 'gl_BackLightProduct'
  , 'gl_BackMaterial'
  , 'gl_BackSecondaryColor'
  , 'gl_ClipPlane'
  , 'gl_ClipVertex'
  , 'gl_Color'
  , 'gl_DepthRange'
  , 'gl_DepthRangeParameters'
  , 'gl_EyePlaneQ'
  , 'gl_EyePlaneR'
  , 'gl_EyePlaneS'
  , 'gl_EyePlaneT'
  , 'gl_Fog'
  , 'gl_FogCoord'
  , 'gl_FogFragCoord'
  , 'gl_FogParameters'
  , 'gl_FragColor'
  , 'gl_FragCoord'
  , 'gl_FragData'
  , 'gl_FragDepth'
  , 'gl_FragDepthEXT'
  , 'gl_FrontColor'
  , 'gl_FrontFacing'
  , 'gl_FrontLightModelProduct'
  , 'gl_FrontLightProduct'
  , 'gl_FrontMaterial'
  , 'gl_FrontSecondaryColor'
  , 'gl_LightModel'
  , 'gl_LightModelParameters'
  , 'gl_LightModelProducts'
  , 'gl_LightProducts'
  , 'gl_LightSource'
  , 'gl_LightSourceParameters'
  , 'gl_MaterialParameters'
  , 'gl_MaxClipPlanes'
  , 'gl_MaxCombinedTextureImageUnits'
  , 'gl_MaxDrawBuffers'
  , 'gl_MaxFragmentUniformComponents'
  , 'gl_MaxLights'
  , 'gl_MaxTextureCoords'
  , 'gl_MaxTextureImageUnits'
  , 'gl_MaxTextureUnits'
  , 'gl_MaxVaryingFloats'
  , 'gl_MaxVertexAttribs'
  , 'gl_MaxVertexTextureImageUnits'
  , 'gl_MaxVertexUniformComponents'
  , 'gl_ModelViewMatrix'
  , 'gl_ModelViewMatrixInverse'
  , 'gl_ModelViewMatrixInverseTranspose'
  , 'gl_ModelViewMatrixTranspose'
  , 'gl_ModelViewProjectionMatrix'
  , 'gl_ModelViewProjectionMatrixInverse'
  , 'gl_ModelViewProjectionMatrixInverseTranspose'
  , 'gl_ModelViewProjectionMatrixTranspose'
  , 'gl_MultiTexCoord0'
  , 'gl_MultiTexCoord1'
  , 'gl_MultiTexCoord2'
  , 'gl_MultiTexCoord3'
  , 'gl_MultiTexCoord4'
  , 'gl_MultiTexCoord5'
  , 'gl_MultiTexCoord6'
  , 'gl_MultiTexCoord7'
  , 'gl_Normal'
  , 'gl_NormalMatrix'
  , 'gl_NormalScale'
  , 'gl_ObjectPlaneQ'
  , 'gl_ObjectPlaneR'
  , 'gl_ObjectPlaneS'
  , 'gl_ObjectPlaneT'
  , 'gl_Point'
  , 'gl_PointCoord'
  , 'gl_PointParameters'
  , 'gl_PointSize'
  , 'gl_Position'
  , 'gl_ProjectionMatrix'
  , 'gl_ProjectionMatrixInverse'
  , 'gl_ProjectionMatrixInverseTranspose'
  , 'gl_ProjectionMatrixTranspose'
  , 'gl_SecondaryColor'
  , 'gl_TexCoord'
  , 'gl_TextureEnvColor'
  , 'gl_TextureMatrix'
  , 'gl_TextureMatrixInverse'
  , 'gl_TextureMatrixInverseTranspose'
  , 'gl_TextureMatrixTranspose'
  , 'gl_Vertex'
  , 'greaterThan'
  , 'greaterThanEqual'
  , 'inversesqrt'
  , 'length'
  , 'lessThan'
  , 'lessThanEqual'
  , 'log'
  , 'log2'
  , 'matrixCompMult'
  , 'max'
  , 'min'
  , 'mix'
  , 'mod'
  , 'normalize'
  , 'not'
  , 'notEqual'
  , 'pow'
  , 'radians'
  , 'reflect'
  , 'refract'
  , 'sign'
  , 'sin'
  , 'smoothstep'
  , 'sqrt'
  , 'step'
  , 'tan'
  , 'texture2D'
  , 'texture2DLod'
  , 'texture2DProj'
  , 'texture2DProjLod'
  , 'textureCube'
  , 'textureCubeLod'
  , 'texture2DLodEXT'
  , 'texture2DProjLodEXT'
  , 'textureCubeLodEXT'
  , 'texture2DGradEXT'
  , 'texture2DProjGradEXT'
  , 'textureCubeGradEXT'
]


/***/ }),

/***/ "./node_modules/glsl-tokenizer/lib/literals-300es.js":
/*!***********************************************************!*\
  !*** ./node_modules/glsl-tokenizer/lib/literals-300es.js ***!
  \***********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var v100 = __webpack_require__(/*! ./literals */ "./node_modules/glsl-tokenizer/lib/literals.js")

module.exports = v100.slice().concat([
   'layout'
  , 'centroid'
  , 'smooth'
  , 'case'
  , 'mat2x2'
  , 'mat2x3'
  , 'mat2x4'
  , 'mat3x2'
  , 'mat3x3'
  , 'mat3x4'
  , 'mat4x2'
  , 'mat4x3'
  , 'mat4x4'
  , 'uvec2'
  , 'uvec3'
  , 'uvec4'
  , 'samplerCubeShadow'
  , 'sampler2DArray'
  , 'sampler2DArrayShadow'
  , 'isampler2D'
  , 'isampler3D'
  , 'isamplerCube'
  , 'isampler2DArray'
  , 'usampler2D'
  , 'usampler3D'
  , 'usamplerCube'
  , 'usampler2DArray'
  , 'coherent'
  , 'restrict'
  , 'readonly'
  , 'writeonly'
  , 'resource'
  , 'atomic_uint'
  , 'noperspective'
  , 'patch'
  , 'sample'
  , 'subroutine'
  , 'common'
  , 'partition'
  , 'active'
  , 'filter'
  , 'image1D'
  , 'image2D'
  , 'image3D'
  , 'imageCube'
  , 'iimage1D'
  , 'iimage2D'
  , 'iimage3D'
  , 'iimageCube'
  , 'uimage1D'
  , 'uimage2D'
  , 'uimage3D'
  , 'uimageCube'
  , 'image1DArray'
  , 'image2DArray'
  , 'iimage1DArray'
  , 'iimage2DArray'
  , 'uimage1DArray'
  , 'uimage2DArray'
  , 'image1DShadow'
  , 'image2DShadow'
  , 'image1DArrayShadow'
  , 'image2DArrayShadow'
  , 'imageBuffer'
  , 'iimageBuffer'
  , 'uimageBuffer'
  , 'sampler1DArray'
  , 'sampler1DArrayShadow'
  , 'isampler1D'
  , 'isampler1DArray'
  , 'usampler1D'
  , 'usampler1DArray'
  , 'isampler2DRect'
  , 'usampler2DRect'
  , 'samplerBuffer'
  , 'isamplerBuffer'
  , 'usamplerBuffer'
  , 'sampler2DMS'
  , 'isampler2DMS'
  , 'usampler2DMS'
  , 'sampler2DMSArray'
  , 'isampler2DMSArray'
  , 'usampler2DMSArray'
])


/***/ }),

/***/ "./node_modules/glsl-tokenizer/lib/literals.js":
/*!*****************************************************!*\
  !*** ./node_modules/glsl-tokenizer/lib/literals.js ***!
  \*****************************************************/
/***/ ((module) => {

module.exports = [
  // current
    'precision'
  , 'highp'
  , 'mediump'
  , 'lowp'
  , 'attribute'
  , 'const'
  , 'uniform'
  , 'varying'
  , 'break'
  , 'continue'
  , 'do'
  , 'for'
  , 'while'
  , 'if'
  , 'else'
  , 'in'
  , 'out'
  , 'inout'
  , 'float'
  , 'int'
  , 'uint'
  , 'void'
  , 'bool'
  , 'true'
  , 'false'
  , 'discard'
  , 'return'
  , 'mat2'
  , 'mat3'
  , 'mat4'
  , 'vec2'
  , 'vec3'
  , 'vec4'
  , 'ivec2'
  , 'ivec3'
  , 'ivec4'
  , 'bvec2'
  , 'bvec3'
  , 'bvec4'
  , 'sampler1D'
  , 'sampler2D'
  , 'sampler3D'
  , 'samplerCube'
  , 'sampler1DShadow'
  , 'sampler2DShadow'
  , 'struct'

  // future
  , 'asm'
  , 'class'
  , 'union'
  , 'enum'
  , 'typedef'
  , 'template'
  , 'this'
  , 'packed'
  , 'goto'
  , 'switch'
  , 'default'
  , 'inline'
  , 'noinline'
  , 'volatile'
  , 'public'
  , 'static'
  , 'extern'
  , 'external'
  , 'interface'
  , 'long'
  , 'short'
  , 'double'
  , 'half'
  , 'fixed'
  , 'unsigned'
  , 'input'
  , 'output'
  , 'hvec2'
  , 'hvec3'
  , 'hvec4'
  , 'dvec2'
  , 'dvec3'
  , 'dvec4'
  , 'fvec2'
  , 'fvec3'
  , 'fvec4'
  , 'sampler2DRect'
  , 'sampler3DRect'
  , 'sampler2DRectShadow'
  , 'sizeof'
  , 'cast'
  , 'namespace'
  , 'using'
]


/***/ }),

/***/ "./node_modules/glsl-tokenizer/lib/operators.js":
/*!******************************************************!*\
  !*** ./node_modules/glsl-tokenizer/lib/operators.js ***!
  \******************************************************/
/***/ ((module) => {

module.exports = [
    '<<='
  , '>>='
  , '++'
  , '--'
  , '<<'
  , '>>'
  , '<='
  , '>='
  , '=='
  , '!='
  , '&&'
  , '||'
  , '+='
  , '-='
  , '*='
  , '/='
  , '%='
  , '&='
  , '^^'
  , '^='
  , '|='
  , '('
  , ')'
  , '['
  , ']'
  , '.'
  , '!'
  , '~'
  , '*'
  , '/'
  , '%'
  , '+'
  , '-'
  , '<'
  , '>'
  , '&'
  , '^'
  , '|'
  , '?'
  , ':'
  , '='
  , ','
  , ';'
  , '{'
  , '}'
]


/***/ }),

/***/ "./node_modules/glsl-tokenizer/string.js":
/*!***********************************************!*\
  !*** ./node_modules/glsl-tokenizer/string.js ***!
  \***********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var tokenize = __webpack_require__(/*! ./index */ "./node_modules/glsl-tokenizer/index.js")

module.exports = tokenizeString

function tokenizeString(str, opt) {
  var generator = tokenize(opt)
  var tokens = []

  tokens = tokens.concat(generator(str))
  tokens = tokens.concat(generator(null))

  return tokens
}


/***/ }),

/***/ "./node_modules/gpu-mock.js/index.js":
/*!*******************************************!*\
  !*** ./node_modules/gpu-mock.js/index.js ***!
  \*******************************************/
/***/ ((module) => {

function setupArguments(args) {
  const newArguments = new Array(args.length);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.toArray) {
      newArguments[i] = arg.toArray();
    } else {
      newArguments[i] = arg;
    }
  }
  return newArguments;
}

function mock1D() {
  const args = setupArguments(arguments);
  const row = new Float32Array(this.output.x);
  for (let x = 0; x < this.output.x; x++) {
    this.thread.x = x;
    this.thread.y = 0;
    this.thread.z = 0;
    row[x] = this._fn.apply(this, args);
  }
  return row;
}

function mock2D() {
  const args = setupArguments(arguments);
  const matrix = new Array(this.output.y);
  for (let y = 0; y < this.output.y; y++) {
    const row = new Float32Array(this.output.x);
    for (let x = 0; x < this.output.x; x++) {
      this.thread.x = x;
      this.thread.y = y;
      this.thread.z = 0;
      row[x] = this._fn.apply(this, args);
    }
    matrix[y] = row;
  }
  return matrix;
}

function mock2DGraphical() {
  const args = setupArguments(arguments);
  for (let y = 0; y < this.output.y; y++) {
    for (let x = 0; x < this.output.x; x++) {
      this.thread.x = x;
      this.thread.y = y;
      this.thread.z = 0;
      this._fn.apply(this, args);
    }
  }
}

function mock3D() {
  const args = setupArguments(arguments);
  const cube = new Array(this.output.z);
  for (let z = 0; z < this.output.z; z++) {
    const matrix = new Array(this.output.y);
    for (let y = 0; y < this.output.y; y++) {
      const row = new Float32Array(this.output.x);
      for (let x = 0; x < this.output.x; x++) {
        this.thread.x = x;
        this.thread.y = y;
        this.thread.z = z;
        row[x] = this._fn.apply(this, args);
      }
      matrix[y] = row;
    }
    cube[z] = matrix;
  }
  return cube;
}

function apiDecorate(kernel) {
  kernel.setOutput = (output) => {
    kernel.output = setupOutput(output);
    if (kernel.graphical) {
      setupGraphical(kernel);
    }
  };
  kernel.toJSON = () => {
    throw new Error('Not usable with gpuMock');
  };
  kernel.setConstants = (flag) => {
    kernel.constants = flag;
    return kernel;
  };
  kernel.setGraphical = (flag) => {
    kernel.graphical = flag;
    return kernel;
  };
  kernel.setCanvas = (flag) => {
    kernel.canvas = flag;
    return kernel;
  };
  kernel.setContext = (flag) => {
    kernel.context = flag;
    return kernel;
  };
  kernel.destroy = () => {};
  kernel.validateSettings = () => {};
  if (kernel.graphical && kernel.output) {
    setupGraphical(kernel);
  }
  kernel.exec = function() {
    return new Promise((resolve, reject) => {
      try {
        resolve(kernel.apply(kernel, arguments));
      } catch(e) {
        reject(e);
      }
    });
  };
  kernel.getPixels = (flip) => {
    const {x, y} = kernel.output;
    // cpu is not flipped by default
    return flip ? flipPixels(kernel._imageData.data, x, y) : kernel._imageData.data.slice(0);
  };
  kernel.color = function(r, g, b, a) {
    if (typeof a === 'undefined') {
      a = 1;
    }

    r = Math.floor(r * 255);
    g = Math.floor(g * 255);
    b = Math.floor(b * 255);
    a = Math.floor(a * 255);

    const width = kernel.output.x;
    const height = kernel.output.y;

    const x = kernel.thread.x;
    const y = height - kernel.thread.y - 1;

    const index = x + y * width;

    kernel._colorData[index * 4 + 0] = r;
    kernel._colorData[index * 4 + 1] = g;
    kernel._colorData[index * 4 + 2] = b;
    kernel._colorData[index * 4 + 3] = a;
  };

  // these are added for api compatibility, but have no affect
  const mockMethod = () => kernel;
  const methods = [
    'setWarnVarUsage',
    'setArgumentTypes',
    'setTactic',
    'setOptimizeFloatMemory',
    'setDebug',
    'setLoopMaxIterations',
    'setConstantTypes',
    'setFunctions',
    'setNativeFunctions',
    'setInjectedNative',
    'setPipeline',
    'setPrecision',
    'setOutputToTexture',
    'setImmutable',
    'setStrictIntegers',
    'setDynamicOutput',
    'setHardcodeConstants',
    'setDynamicArguments',
    'setUseLegacyEncoder',
    'setWarnVarUsage',
    'addSubKernel',
  ];
  for (let i = 0; i < methods.length; i++) {
    kernel[methods[i]] = mockMethod;
  }
  return kernel;
}

function setupGraphical(kernel) {
  const {x, y} = kernel.output;
  if (kernel.context && kernel.context.createImageData) {
    const data = new Uint8ClampedArray(x * y * 4);
    kernel._imageData = kernel.context.createImageData(x, y);
    kernel._colorData = data;
  } else {
    const data = new Uint8ClampedArray(x * y * 4);
    kernel._imageData = { data };
    kernel._colorData = data;
  }
}

function setupOutput(output) {
  let result = null;
  if (output.length) {
    if (output.length === 3) {
      const [x,y,z] = output;
      result = { x, y, z };
    } else if (output.length === 2) {
      const [x,y] = output;
      result = { x, y };
    } else {
      const [x] = output;
      result = { x };
    }
  } else {
    result = output;
  }
  return result;
}

function gpuMock(fn, settings = {}) {
  const output = settings.output ? setupOutput(settings.output) : null;
  function kernel() {
    if (kernel.output.z) {
      return mock3D.apply(kernel, arguments);
    } else if (kernel.output.y) {
      if (kernel.graphical) {
        return mock2DGraphical.apply(kernel, arguments);
      }
      return mock2D.apply(kernel, arguments);
    } else {
      return mock1D.apply(kernel, arguments);
    }
  }
  kernel._fn = fn;
  kernel.constants = settings.constants || null;
  kernel.context = settings.context || null;
  kernel.canvas = settings.canvas || null;
  kernel.graphical = settings.graphical || false;
  kernel._imageData = null;
  kernel._colorData = null;
  kernel.output = output;
  kernel.thread = {
    x: 0,
    y: 0,
    z: 0
  };
  return apiDecorate(kernel);
}

function flipPixels(pixels, width, height) {
  // https://stackoverflow.com/a/41973289/1324039
  const halfHeight = height / 2 | 0; // the | 0 keeps the result an int
  const bytesPerRow = width * 4;
  // make a temp buffer to hold one row
  const temp = new Uint8ClampedArray(width * 4);
  const result = pixels.slice(0);
  for (let y = 0; y < halfHeight; ++y) {
    const topOffset = y * bytesPerRow;
    const bottomOffset = (height - y - 1) * bytesPerRow;

    // make copy of a row on the top half
    temp.set(result.subarray(topOffset, topOffset + bytesPerRow));

    // copy a row from the bottom half to the top
    result.copyWithin(topOffset, bottomOffset, bottomOffset + bytesPerRow);

    // copy the copy of the top half row to the bottom half
    result.set(temp, bottomOffset);
  }
  return result;
}

module.exports = {
  gpuMock
};


/***/ }),

/***/ "./src/alias.js":
/*!**********************!*\
  !*** ./src/alias.js ***!
  \**********************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ./utils */ "./src/utils.js");

/**
 *
 * @param name
 * @param source
 * @returns {Function}
 */
function alias(name, source) {
  const fnString = source.toString();
  return new Function(`return function ${ name } (${ utils.getArgumentNamesFromString(fnString).join(', ') }) {
  ${ utils.getFunctionBodyFromString(fnString) }
}`)();
}

module.exports = {
  alias
};

/***/ }),

/***/ "./src/backend/cpu/function-node.js":
/*!******************************************!*\
  !*** ./src/backend/cpu/function-node.js ***!
  \******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { FunctionNode } = __webpack_require__(/*! ../function-node */ "./src/backend/function-node.js");

/**
 * @desc [INTERNAL] Represents a single function, inside JS
 *
 * <p>This handles all the raw state, converted state, etc. Of a single function.</p>
 */
class CPUFunctionNode extends FunctionNode {
  /**
   * @desc Parses the abstract syntax tree for to its *named function*
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astFunction(ast, retArr) {

    // Setup function return type and name
    if (!this.isRootKernel) {
      retArr.push('function');
      retArr.push(' ');
      retArr.push(this.name);
      retArr.push('(');

      // Arguments handling
      for (let i = 0; i < this.argumentNames.length; ++i) {
        const argumentName = this.argumentNames[i];

        if (i > 0) {
          retArr.push(', ');
        }
        retArr.push('user_');
        retArr.push(argumentName);
      }

      // Function opening
      retArr.push(') {\n');
    }

    // Body statement iteration
    for (let i = 0; i < ast.body.body.length; ++i) {
      this.astGeneric(ast.body.body[i], retArr);
      retArr.push('\n');
    }

    if (!this.isRootKernel) {
      // Function closing
      retArr.push('}\n');
    }
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for to *return* statement
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astReturnStatement(ast, retArr) {
    const type = this.returnType || this.getType(ast.argument);

    if (!this.returnType) {
      this.returnType = type;
    }

    if (this.isRootKernel) {
      retArr.push(this.leadingReturnStatement);
      this.astGeneric(ast.argument, retArr);
      retArr.push(';\n');
      retArr.push(this.followingReturnStatement);
      retArr.push('continue;\n');
    } else if (this.isSubKernel) {
      retArr.push(`subKernelResult_${ this.name } = `);
      this.astGeneric(ast.argument, retArr);
      retArr.push(';');
      retArr.push(`return subKernelResult_${ this.name };`);
    } else {
      retArr.push('return ');
      this.astGeneric(ast.argument, retArr);
      retArr.push(';');
    }
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *literal value*
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astLiteral(ast, retArr) {

    // Reject non numeric literals
    if (isNaN(ast.value)) {
      throw this.astErrorOutput(
        'Non-numeric literal not supported : ' + ast.value,
        ast
      );
    }

    retArr.push(ast.value);

    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *binary* expression
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astBinaryExpression(ast, retArr) {
    retArr.push('(');
    this.astGeneric(ast.left, retArr);
    retArr.push(ast.operator);
    this.astGeneric(ast.right, retArr);
    retArr.push(')');
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *identifier* expression
   * @param {Object} idtNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astIdentifierExpression(idtNode, retArr) {
    if (idtNode.type !== 'Identifier') {
      throw this.astErrorOutput(
        'IdentifierExpression - not an Identifier',
        idtNode
      );
    }

    switch (idtNode.name) {
      case 'Infinity':
        retArr.push('Infinity');
        break;
      default:
        if (this.constants && this.constants.hasOwnProperty(idtNode.name)) {
          retArr.push('constants_' + idtNode.name);
        } else {
          retArr.push('user_' + idtNode.name);
        }
    }

    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *for-loop* expression
   * @param {Object} forNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the parsed webgl string
   */
  astForStatement(forNode, retArr) {
    if (forNode.type !== 'ForStatement') {
      throw this.astErrorOutput('Invalid for statement', forNode);
    }

    const initArr = [];
    const testArr = [];
    const updateArr = [];
    const bodyArr = [];
    let isSafe = null;

    if (forNode.init) {
      this.pushState('in-for-loop-init');
      this.astGeneric(forNode.init, initArr);
      for (let i = 0; i < initArr.length; i++) {
        if (initArr[i].includes && initArr[i].includes(',')) {
          isSafe = false;
        }
      }
      this.popState('in-for-loop-init');
    } else {
      isSafe = false;
    }

    if (forNode.test) {
      this.astGeneric(forNode.test, testArr);
    } else {
      isSafe = false;
    }

    if (forNode.update) {
      this.astGeneric(forNode.update, updateArr);
    } else {
      isSafe = false;
    }

    if (forNode.body) {
      this.pushState('loop-body');
      this.astGeneric(forNode.body, bodyArr);
      this.popState('loop-body');
    }

    // have all parts, now make them safe
    if (isSafe === null) {
      isSafe = this.isSafe(forNode.init) && this.isSafe(forNode.test);
    }

    if (isSafe) {
      retArr.push(`for (${initArr.join('')};${testArr.join('')};${updateArr.join('')}){\n`);
      retArr.push(bodyArr.join(''));
      retArr.push('}\n');
    } else {
      const iVariableName = this.getInternalVariableName('safeI');
      if (initArr.length > 0) {
        retArr.push(initArr.join(''), ';\n');
      }
      retArr.push(`for (let ${iVariableName}=0;${iVariableName}<LOOP_MAX;${iVariableName}++){\n`);
      if (testArr.length > 0) {
        retArr.push(`if (!${testArr.join('')}) break;\n`);
      }
      retArr.push(bodyArr.join(''));
      retArr.push(`\n${updateArr.join('')};`);
      retArr.push('}\n');
    }
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *while* loop
   * @param {Object} whileNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the parsed javascript string
   */
  astWhileStatement(whileNode, retArr) {
    if (whileNode.type !== 'WhileStatement') {
      throw this.astErrorOutput(
        'Invalid while statement',
        whileNode
      );
    }

    retArr.push('for (let i = 0; i < LOOP_MAX; i++) {');
    retArr.push('if (');
    this.astGeneric(whileNode.test, retArr);
    retArr.push(') {\n');
    this.astGeneric(whileNode.body, retArr);
    retArr.push('} else {\n');
    retArr.push('break;\n');
    retArr.push('}\n');
    retArr.push('}\n');

    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *do while* loop
   * @param {Object} doWhileNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the parsed webgl string
   */
  astDoWhileStatement(doWhileNode, retArr) {
    if (doWhileNode.type !== 'DoWhileStatement') {
      throw this.astErrorOutput(
        'Invalid while statement',
        doWhileNode
      );
    }

    retArr.push('for (let i = 0; i < LOOP_MAX; i++) {');
    this.astGeneric(doWhileNode.body, retArr);
    retArr.push('if (!');
    this.astGeneric(doWhileNode.test, retArr);
    retArr.push(') {\n');
    retArr.push('break;\n');
    retArr.push('}\n');
    retArr.push('}\n');

    return retArr;

  }

  /**
   * @desc Parses the abstract syntax tree for *Assignment* Expression
   * @param {Object} assNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astAssignmentExpression(assNode, retArr) {
    const declaration = this.getDeclaration(assNode.left);
    if (declaration && !declaration.assignable) {
      throw this.astErrorOutput(`Variable ${assNode.left.name} is not assignable here`, assNode);
    }
    this.astGeneric(assNode.left, retArr);
    retArr.push(assNode.operator);
    this.astGeneric(assNode.right, retArr);
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *Block* statement
   * @param {Object} bNode - the AST object to parse
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astBlockStatement(bNode, retArr) {
    if (this.isState('loop-body')) {
      this.pushState('block-body'); // this prevents recursive removal of braces
      for (let i = 0; i < bNode.body.length; i++) {
        this.astGeneric(bNode.body[i], retArr);
      }
      this.popState('block-body');
    } else {
      retArr.push('{\n');
      for (let i = 0; i < bNode.body.length; i++) {
        this.astGeneric(bNode.body[i], retArr);
      }
      retArr.push('}\n');
    }
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *Variable Declaration*
   * @param {Object} varDecNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astVariableDeclaration(varDecNode, retArr) {
    retArr.push(`${varDecNode.kind} `);
    const { declarations } = varDecNode;
    for (let i = 0; i < declarations.length; i++) {
      if (i > 0) {
        retArr.push(',');
      }
      const declaration = declarations[i];
      const info = this.getDeclaration(declaration.id);
      if (!info.valueType) {
        info.valueType = this.getType(declaration.init);
      }
      this.astGeneric(declaration, retArr);
    }
    if (!this.isState('in-for-loop-init')) {
      retArr.push(';');
    }
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *If* Statement
   * @param {Object} ifNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astIfStatement(ifNode, retArr) {
    retArr.push('if (');
    this.astGeneric(ifNode.test, retArr);
    retArr.push(')');
    if (ifNode.consequent.type === 'BlockStatement') {
      this.astGeneric(ifNode.consequent, retArr);
    } else {
      retArr.push(' {\n');
      this.astGeneric(ifNode.consequent, retArr);
      retArr.push('\n}\n');
    }

    if (ifNode.alternate) {
      retArr.push('else ');
      if (ifNode.alternate.type === 'BlockStatement' || ifNode.alternate.type === 'IfStatement') {
        this.astGeneric(ifNode.alternate, retArr);
      } else {
        retArr.push(' {\n');
        this.astGeneric(ifNode.alternate, retArr);
        retArr.push('\n}\n');
      }
    }
    return retArr;

  }

  astSwitchStatement(ast, retArr) {
    const { discriminant, cases } = ast;
    retArr.push('switch (');
    this.astGeneric(discriminant, retArr);
    retArr.push(') {\n');
    for (let i = 0; i < cases.length; i++) {
      if (cases[i].test === null) {
        retArr.push('default:\n');
        this.astGeneric(cases[i].consequent, retArr);
        if (cases[i].consequent && cases[i].consequent.length > 0) {
          retArr.push('break;\n');
        }
        continue;
      }
      retArr.push('case ');
      this.astGeneric(cases[i].test, retArr);
      retArr.push(':\n');
      if (cases[i].consequent && cases[i].consequent.length > 0) {
        this.astGeneric(cases[i].consequent, retArr);
        retArr.push('break;\n');
      }
    }
    retArr.push('\n}');
  }

  /**
   * @desc Parses the abstract syntax tree for *This* expression
   * @param {Object} tNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astThisExpression(tNode, retArr) {
    retArr.push('_this');
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *Member* Expression
   * @param {Object} mNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astMemberExpression(mNode, retArr) {
    const {
      signature,
      type,
      property,
      xProperty,
      yProperty,
      zProperty,
      name,
      origin
    } = this.getMemberExpressionDetails(mNode);
    switch (signature) {
      case 'this.thread.value':
        retArr.push(`_this.thread.${ name }`);
        return retArr;
      case 'this.output.value':
        switch (name) {
          case 'x':
            retArr.push('outputX');
            break;
          case 'y':
            retArr.push('outputY');
            break;
          case 'z':
            retArr.push('outputZ');
            break;
          default:
            throw this.astErrorOutput('Unexpected expression', mNode);
        }
        return retArr;
      case 'value':
        throw this.astErrorOutput('Unexpected expression', mNode);
      case 'value[]':
      case 'value[][]':
      case 'value[][][]':
      case 'value.value':
        if (origin === 'Math') {
          retArr.push(Math[name]);
          return retArr;
        }
        switch (property) {
          case 'r':
            retArr.push(`user_${ name }[0]`);
            return retArr;
          case 'g':
            retArr.push(`user_${ name }[1]`);
            return retArr;
          case 'b':
            retArr.push(`user_${ name }[2]`);
            return retArr;
          case 'a':
            retArr.push(`user_${ name }[3]`);
            return retArr;
        }
        break;
      case 'this.constants.value':
      case 'this.constants.value[]':
      case 'this.constants.value[][]':
      case 'this.constants.value[][][]':
        break;
      case 'fn()[]':
        this.astGeneric(mNode.object, retArr);
        retArr.push('[');
        this.astGeneric(mNode.property, retArr);
        retArr.push(']');
        return retArr;
      case 'fn()[][]':
        this.astGeneric(mNode.object.object, retArr);
        retArr.push('[');
        this.astGeneric(mNode.object.property, retArr);
        retArr.push(']');
        retArr.push('[');
        this.astGeneric(mNode.property, retArr);
        retArr.push(']');
        return retArr;
      default:
        throw this.astErrorOutput('Unexpected expression', mNode);
    }

    if (!mNode.computed) {
      // handle simple types
      switch (type) {
        case 'Number':
        case 'Integer':
        case 'Float':
        case 'Boolean':
          retArr.push(`${origin}_${name}`);
          return retArr;
      }
    }

    // handle more complex types
    // argument may have come from a parent
    const markupName = `${origin}_${name}`;

    switch (type) {
      case 'Array(2)':
      case 'Array(3)':
      case 'Array(4)':
      case 'Matrix(2)':
      case 'Matrix(3)':
      case 'Matrix(4)':
      case 'HTMLImageArray':
      case 'ArrayTexture(1)':
      case 'ArrayTexture(2)':
      case 'ArrayTexture(3)':
      case 'ArrayTexture(4)':
      case 'HTMLImage':
      default:
        let size;
        let isInput;
        if (origin === 'constants') {
          const constant = this.constants[name];
          isInput = this.constantTypes[name] === 'Input';
          size = isInput ? constant.size : null;
        } else {
          isInput = this.isInput(name);
          size = isInput ? this.argumentSizes[this.argumentNames.indexOf(name)] : null;
        }
        retArr.push(`${ markupName }`);
        if (zProperty && yProperty) {
          if (isInput) {
            retArr.push('[(');
            this.astGeneric(zProperty, retArr);
            retArr.push(`*${ this.dynamicArguments ? '(outputY * outputX)' : size[1] * size[0] })+(`);
            this.astGeneric(yProperty, retArr);
            retArr.push(`*${ this.dynamicArguments ? 'outputX' : size[0] })+`);
            this.astGeneric(xProperty, retArr);
            retArr.push(']');
          } else {
            retArr.push('[');
            this.astGeneric(zProperty, retArr);
            retArr.push(']');
            retArr.push('[');
            this.astGeneric(yProperty, retArr);
            retArr.push(']');
            retArr.push('[');
            this.astGeneric(xProperty, retArr);
            retArr.push(']');
          }
        } else if (yProperty) {
          if (isInput) {
            retArr.push('[(');
            this.astGeneric(yProperty, retArr);
            retArr.push(`*${ this.dynamicArguments ? 'outputX' : size[0] })+`);
            this.astGeneric(xProperty, retArr);
            retArr.push(']');
          } else {
            retArr.push('[');
            this.astGeneric(yProperty, retArr);
            retArr.push(']');
            retArr.push('[');
            this.astGeneric(xProperty, retArr);
            retArr.push(']');
          }
        } else if (typeof xProperty !== 'undefined') {
          retArr.push('[');
          this.astGeneric(xProperty, retArr);
          retArr.push(']');
        }
    }
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *call* expression
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   * @returns  {Array} the append retArr
   */
  astCallExpression(ast, retArr) {
    if (ast.type !== 'CallExpression') {
      // Failure, unknown expression
      throw this.astErrorOutput('Unknown CallExpression', ast);
    }
    // Get the full function call, unrolled
    let functionName = this.astMemberExpressionUnroll(ast.callee);

    // Register the function into the called registry
    if (this.calledFunctions.indexOf(functionName) < 0) {
      this.calledFunctions.push(functionName);
    }

    const isMathFunction = this.isAstMathFunction(ast);

    // track the function was called
    if (this.onFunctionCall) {
      this.onFunctionCall(this.name, functionName, ast.arguments);
    }

    // Call the function
    retArr.push(functionName);

    // Open arguments space
    retArr.push('(');
    const targetTypes = this.lookupFunctionArgumentTypes(functionName) || [];
    // Add the arguments
    for (let i = 0; i < ast.arguments.length; ++i) {
      const argument = ast.arguments[i];

      // in order to track return type, even though this is CPU
      let argumentType = this.getType(argument);
      if (!targetTypes[i]) {
        this.triggerImplyArgumentType(functionName, i, argumentType, this);
      }

      if (i > 0) {
        retArr.push(', ');
      }
      this.astGeneric(argument, retArr);
    }
    // Close arguments space
    retArr.push(')');

    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *Array* Expression
   * @param {Object} arrNode - the AST object to parse
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astArrayExpression(arrNode, retArr) {
    const returnType = this.getType(arrNode);
    const arrLen = arrNode.elements.length;
    const elements = [];
    for (let i = 0; i < arrLen; ++i) {
      const element = [];
      this.astGeneric(arrNode.elements[i], element);
      elements.push(element.join(''));
    }
    switch (returnType) {
      case 'Matrix(2)':
      case 'Matrix(3)':
      case 'Matrix(4)':
        retArr.push(`[${elements.join(', ')}]`);
        break;
      default:
        retArr.push(`new Float32Array([${elements.join(', ')}])`);
    }
    return retArr;
  }

  astDebuggerStatement(arrNode, retArr) {
    retArr.push('debugger;');
    return retArr;
  }
}

module.exports = {
  CPUFunctionNode
};

/***/ }),

/***/ "./src/backend/cpu/kernel-string.js":
/*!******************************************!*\
  !*** ./src/backend/cpu/kernel-string.js ***!
  \******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../utils */ "./src/utils.js");

function constantsToString(constants, types) {
  const results = [];
  for (const name in types) {
    if (!types.hasOwnProperty(name)) continue;
    const type = types[name];
    const constant = constants[name];
    switch (type) {
      case 'Number':
      case 'Integer':
      case 'Float':
      case 'Boolean':
        results.push(`${name}:${constant}`);
        break;
      case 'Array(2)':
      case 'Array(3)':
      case 'Array(4)':
      case 'Matrix(2)':
      case 'Matrix(3)':
      case 'Matrix(4)':
        results.push(`${name}:new ${constant.constructor.name}(${JSON.stringify(Array.from(constant))})`);
        break;
    }
  }
  return `{ ${ results.join() } }`;
}

function cpuKernelString(cpuKernel, name) {
  const header = [];
  const thisProperties = [];
  const beforeReturn = [];

  const useFunctionKeyword = !/^function/.test(cpuKernel.color.toString());

  header.push(
    '  const { context, canvas, constants: incomingConstants } = settings;',
    `  const output = new Int32Array(${JSON.stringify(Array.from(cpuKernel.output))});`,
    `  const _constantTypes = ${JSON.stringify(cpuKernel.constantTypes)};`,
    `  const _constants = ${constantsToString(cpuKernel.constants, cpuKernel.constantTypes)};`
  );

  thisProperties.push(
    '    constants: _constants,',
    '    context,',
    '    output,',
    '    thread: {x: 0, y: 0, z: 0},'
  );

  if (cpuKernel.graphical) {
    header.push(`  const _imageData = context.createImageData(${cpuKernel.output[0]}, ${cpuKernel.output[1]});`);
    header.push(`  const _colorData = new Uint8ClampedArray(${cpuKernel.output[0]} * ${cpuKernel.output[1]} * 4);`);

    const colorFn = utils.flattenFunctionToString((useFunctionKeyword ? 'function ' : '') + cpuKernel.color.toString(), {
      thisLookup: (propertyName) => {
        switch (propertyName) {
          case '_colorData':
            return '_colorData';
          case '_imageData':
            return '_imageData';
          case 'output':
            return 'output';
          case 'thread':
            return 'this.thread';
        }
        return JSON.stringify(cpuKernel[propertyName]);
      },
      findDependency: (object, name) => {
        return null;
      }
    });

    const getPixelsFn = utils.flattenFunctionToString((useFunctionKeyword ? 'function ' : '') + cpuKernel.getPixels.toString(), {
      thisLookup: (propertyName) => {
        switch (propertyName) {
          case '_colorData':
            return '_colorData';
          case '_imageData':
            return '_imageData';
          case 'output':
            return 'output';
          case 'thread':
            return 'this.thread';
        }
        return JSON.stringify(cpuKernel[propertyName]);
      },
      findDependency: () => {
        return null;
      }
    });

    thisProperties.push(
      '    _imageData,',
      '    _colorData,',
      `    color: ${colorFn},`
    );

    beforeReturn.push(
      `  kernel.getPixels = ${getPixelsFn};`
    );
  }

  const constantTypes = [];
  const constantKeys = Object.keys(cpuKernel.constantTypes);
  for (let i = 0; i < constantKeys.length; i++) {
    constantTypes.push(cpuKernel.constantTypes[constantKeys]);
  }
  if (cpuKernel.argumentTypes.indexOf('HTMLImageArray') !== -1 || constantTypes.indexOf('HTMLImageArray') !== -1) {
    const flattenedImageTo3DArray = utils.flattenFunctionToString((useFunctionKeyword ? 'function ' : '') + cpuKernel._imageTo3DArray.toString(), {
      doNotDefine: ['canvas'],
      findDependency: (object, name) => {
        if (object === 'this') {
          return (useFunctionKeyword ? 'function ' : '') + cpuKernel[name].toString();
        }
        return null;
      },
      thisLookup: (propertyName) => {
        switch (propertyName) {
          case 'canvas':
            return;
          case 'context':
            return 'context';
        }
      }
    });
    beforeReturn.push(flattenedImageTo3DArray);
    thisProperties.push(`    _mediaTo2DArray,`);
    thisProperties.push(`    _imageTo3DArray,`);
  } else if (cpuKernel.argumentTypes.indexOf('HTMLImage') !== -1 || constantTypes.indexOf('HTMLImage') !== -1) {
    const flattenedImageTo2DArray = utils.flattenFunctionToString((useFunctionKeyword ? 'function ' : '') + cpuKernel._mediaTo2DArray.toString(), {
      findDependency: (object, name) => {
        return null;
      },
      thisLookup: (propertyName) => {
        switch (propertyName) {
          case 'canvas':
            return 'settings.canvas';
          case 'context':
            return 'settings.context';
        }
        throw new Error('unhandled thisLookup');
      }
    });
    beforeReturn.push(flattenedImageTo2DArray);
    thisProperties.push(`    _mediaTo2DArray,`);
  }

  return `function(settings) {
${ header.join('\n') }
  for (const p in _constantTypes) {
    if (!_constantTypes.hasOwnProperty(p)) continue;
    const type = _constantTypes[p];
    switch (type) {
      case 'Number':
      case 'Integer':
      case 'Float':
      case 'Boolean':
      case 'Array(2)':
      case 'Array(3)':
      case 'Array(4)':
      case 'Matrix(2)':
      case 'Matrix(3)':
      case 'Matrix(4)':
        if (incomingConstants.hasOwnProperty(p)) {
          console.warn('constant ' + p + ' of type ' + type + ' cannot be resigned');
        }
        continue;
    }
    if (!incomingConstants.hasOwnProperty(p)) {
      throw new Error('constant ' + p + ' not found');
    }
    _constants[p] = incomingConstants[p];
  }
  const kernel = (function() {
${cpuKernel._kernelString}
  })
    .apply({ ${thisProperties.join('\n')} });
  ${ beforeReturn.join('\n') }
  return kernel;
}`;
}

module.exports = {
  cpuKernelString
};

/***/ }),

/***/ "./src/backend/cpu/kernel.js":
/*!***********************************!*\
  !*** ./src/backend/cpu/kernel.js ***!
  \***********************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { Kernel } = __webpack_require__(/*! ../kernel */ "./src/backend/kernel.js");
const { FunctionBuilder } = __webpack_require__(/*! ../function-builder */ "./src/backend/function-builder.js");
const { CPUFunctionNode } = __webpack_require__(/*! ./function-node */ "./src/backend/cpu/function-node.js");
const { utils } = __webpack_require__(/*! ../../utils */ "./src/utils.js");
const { cpuKernelString } = __webpack_require__(/*! ./kernel-string */ "./src/backend/cpu/kernel-string.js");

/**
 * @desc Kernel Implementation for CPU.
 * <p>Instantiates properties to the CPU Kernel.</p>
 */
class CPUKernel extends Kernel {
  static getFeatures() {
    return this.features;
  }
  static get features() {
    return Object.freeze({
      kernelMap: true,
      isIntegerDivisionAccurate: true
    });
  }
  static get isSupported() {
    return true;
  }
  static isContextMatch(context) {
    return false;
  }
  /**
   * @desc The current mode in which gpu.js is executing.
   */
  static get mode() {
    return 'cpu';
  }

  static nativeFunctionArguments() {
    return null;
  }

  static nativeFunctionReturnType() {
    throw new Error(`Looking up native function return type not supported on ${this.name}`);
  }

  static combineKernels(combinedKernel) {
    return combinedKernel;
  }

  static getSignature(kernel, argumentTypes) {
    return 'cpu' + (argumentTypes.length > 0 ? ':' + argumentTypes.join(',') : '');
  }

  constructor(source, settings) {
    super(source, settings);
    this.mergeSettings(source.settings || settings);

    this._imageData = null;
    this._colorData = null;
    this._kernelString = null;
    this._prependedString = [];
    this.thread = {
      x: 0,
      y: 0,
      z: 0
    };
    this.translatedSources = null;
  }

  initCanvas() {
    if (typeof document !== 'undefined') {
      return document.createElement('canvas');
    } else if (typeof OffscreenCanvas !== 'undefined') {
      return new OffscreenCanvas(0, 0);
    }
  }

  initContext() {
    if (!this.canvas) return null;
    return this.canvas.getContext('2d');
  }

  initPlugins(settings) {
    return [];
  }

  /**
   * @desc Validate settings related to Kernel, such as dimensions size, and auto output support.
   * @param {IArguments} args
   */
  validateSettings(args) {
    if (!this.output || this.output.length === 0) {
      if (args.length !== 1) {
        throw new Error('Auto output only supported for kernels with only one input');
      }

      const argType = utils.getVariableType(args[0], this.strictIntegers);
      if (argType === 'Array') {
        this.output = utils.getDimensions(argType);
      } else if (argType === 'NumberTexture' || argType === 'ArrayTexture(4)') {
        this.output = args[0].output;
      } else {
        throw new Error('Auto output not supported for input type: ' + argType);
      }
    }

    if (this.graphical) {
      if (this.output.length !== 2) {
        throw new Error('Output must have 2 dimensions on graphical mode');
      }
    }

    this.checkOutput();
  }

  translateSource() {
    this.leadingReturnStatement = this.output.length > 1 ? 'resultX[x] = ' : 'result[x] = ';
    if (this.subKernels) {
      const followingReturnStatement = [];
      for (let i = 0; i < this.subKernels.length; i++) {
        const {
          name
        } = this.subKernels[i];
        followingReturnStatement.push(this.output.length > 1 ? `resultX_${ name }[x] = subKernelResult_${ name };\n` : `result_${ name }[x] = subKernelResult_${ name };\n`);
      }
      this.followingReturnStatement = followingReturnStatement.join('');
    }
    const functionBuilder = FunctionBuilder.fromKernel(this, CPUFunctionNode);
    this.translatedSources = functionBuilder.getPrototypes('kernel');
    if (!this.graphical && !this.returnType) {
      this.returnType = functionBuilder.getKernelResultType();
    }
  }

  /**
   * @desc Builds the Kernel, by generating the kernel
   * string using thread dimensions, and arguments
   * supplied to the kernel.
   *
   * <p>If the graphical flag is enabled, canvas is used.</p>
   */
  build() {
    if (this.built) return;
    this.setupConstants();
    this.setupArguments(arguments);
    this.validateSettings(arguments);
    this.translateSource();

    if (this.graphical) {
      const {
        canvas,
        output
      } = this;
      if (!canvas) {
        throw new Error('no canvas available for using graphical output');
      }
      const width = output[0];
      const height = output[1] || 1;
      canvas.width = width;
      canvas.height = height;
      this._imageData = this.context.createImageData(width, height);
      this._colorData = new Uint8ClampedArray(width * height * 4);
    }

    const kernelString = this.getKernelString();
    this.kernelString = kernelString;

    if (this.debug) {
      console.log('Function output:');
      console.log(kernelString);
    }

    try {
      this.run = new Function([], kernelString).bind(this)();
    } catch (e) {
      console.error('An error occurred compiling the javascript: ', e);
    }
    this.buildSignature(arguments);
    this.built = true;
  }

  color(r, g, b, a) {
    if (typeof a === 'undefined') {
      a = 1;
    }

    r = Math.floor(r * 255);
    g = Math.floor(g * 255);
    b = Math.floor(b * 255);
    a = Math.floor(a * 255);

    const width = this.output[0];
    const height = this.output[1];

    const x = this.thread.x;
    const y = height - this.thread.y - 1;

    const index = x + y * width;

    this._colorData[index * 4 + 0] = r;
    this._colorData[index * 4 + 1] = g;
    this._colorData[index * 4 + 2] = b;
    this._colorData[index * 4 + 3] = a;
  }

  /**
   * @desc Generates kernel string for this kernel program.
   *
   * <p>If sub-kernels are supplied, they are also factored in.
   * This string can be saved by calling the `toString` method
   * and then can be reused later.</p>
   *
   * @returns {String} result
   *
   */
  getKernelString() {
    if (this._kernelString !== null) return this._kernelString;

    let kernelThreadString = null;
    let {
      translatedSources
    } = this;
    if (translatedSources.length > 1) {
      translatedSources = translatedSources.filter(fn => {
        if (/^function/.test(fn)) return fn;
        kernelThreadString = fn;
        return false;
      });
    } else {
      kernelThreadString = translatedSources.shift();
    }
    return this._kernelString = `  const LOOP_MAX = ${ this._getLoopMaxString() };
  ${ this.injectedNative || '' }
  const _this = this;
  ${ this._resultKernelHeader() }
  ${ this._processConstants() }
  return (${ this.argumentNames.map(argumentName => 'user_' + argumentName).join(', ') }) => {
    ${ this._prependedString.join('') }
    ${ this._earlyThrows() }
    ${ this._processArguments() }
    ${ this.graphical ? this._graphicalKernelBody(kernelThreadString) : this._resultKernelBody(kernelThreadString) }
    ${ translatedSources.length > 0 ? translatedSources.join('\n') : '' }
  };`;
  }

  /**
   * @desc Returns the *pre-compiled* Kernel as a JS Object String, that can be reused.
   */
  toString() {
    return cpuKernelString(this);
  }

  /**
   * @desc Get the maximum loop size String.
   * @returns {String} result
   */
  _getLoopMaxString() {
    return (
      this.loopMaxIterations ?
      ` ${ parseInt(this.loopMaxIterations) };` :
      ' 1000;'
    );
  }

  _processConstants() {
    if (!this.constants) return '';

    const result = [];
    for (let p in this.constants) {
      const type = this.constantTypes[p];
      switch (type) {
        case 'HTMLCanvas':
        case 'OffscreenCanvas':
        case 'HTMLImage':
        case 'ImageBitmap':
        case 'ImageData':
        case 'HTMLVideo':
          result.push(`    const constants_${p} = this._mediaTo2DArray(this.constants.${p});\n`);
          break;
        case 'HTMLImageArray':
          result.push(`    const constants_${p} = this._imageTo3DArray(this.constants.${p});\n`);
          break;
        case 'Input':
          result.push(`    const constants_${p} = this.constants.${p}.value;\n`);
          break;
        default:
          result.push(`    const constants_${p} = this.constants.${p};\n`);
      }
    }
    return result.join('');
  }

  _earlyThrows() {
    if (this.graphical) return '';
    if (this.immutable) return '';
    if (!this.pipeline) return '';
    const arrayArguments = [];
    for (let i = 0; i < this.argumentTypes.length; i++) {
      if (this.argumentTypes[i] === 'Array') {
        arrayArguments.push(this.argumentNames[i]);
      }
    }
    if (arrayArguments.length === 0) return '';
    const checks = [];
    for (let i = 0; i < arrayArguments.length; i++) {
      const argumentName = arrayArguments[i];
      const checkSubKernels = this._mapSubKernels(subKernel => `user_${argumentName} === result_${subKernel.name}`).join(' || ');
      checks.push(`user_${argumentName} === result${checkSubKernels ? ` || ${checkSubKernels}` : ''}`);
    }
    return `if (${checks.join(' || ')}) throw new Error('Source and destination arrays are the same.  Use immutable = true');`;
  }

  _processArguments() {
    const result = [];
    for (let i = 0; i < this.argumentTypes.length; i++) {
      const variableName = `user_${this.argumentNames[i]}`;
      switch (this.argumentTypes[i]) {
        case 'HTMLCanvas':
        case 'OffscreenCanvas':
        case 'HTMLImage':
        case 'ImageBitmap':
        case 'ImageData':
        case 'HTMLVideo':
          result.push(`    ${variableName} = this._mediaTo2DArray(${variableName});\n`);
          break;
        case 'HTMLImageArray':
          result.push(`    ${variableName} = this._imageTo3DArray(${variableName});\n`);
          break;
        case 'Input':
          result.push(`    ${variableName} = ${variableName}.value;\n`);
          break;
        case 'ArrayTexture(1)':
        case 'ArrayTexture(2)':
        case 'ArrayTexture(3)':
        case 'ArrayTexture(4)':
        case 'NumberTexture':
        case 'MemoryOptimizedNumberTexture':
          result.push(`
    if (${variableName}.toArray) {
      if (!_this.textureCache) {
        _this.textureCache = [];
        _this.arrayCache = [];
      }
      const textureIndex = _this.textureCache.indexOf(${variableName});
      if (textureIndex !== -1) {
        ${variableName} = _this.arrayCache[textureIndex];
      } else {
        _this.textureCache.push(${variableName});
        ${variableName} = ${variableName}.toArray();
        _this.arrayCache.push(${variableName});
      }
    }`);
          break;
      }
    }
    return result.join('');
  }

  _mediaTo2DArray(media) {
    const canvas = this.canvas;
    const width = media.width > 0 ? media.width : media.videoWidth;
    const height = media.height > 0 ? media.height : media.videoHeight;
    if (canvas.width < width) {
      canvas.width = width;
    }
    if (canvas.height < height) {
      canvas.height = height;
    }
    const ctx = this.context;
    let pixelsData;
    if (media.constructor === ImageData) {
      pixelsData = media.data;
    } else {
      ctx.drawImage(media, 0, 0, width, height);
      pixelsData = ctx.getImageData(0, 0, width, height).data;
    }
    const imageArray = new Array(height);
    let index = 0;
    for (let y = height - 1; y >= 0; y--) {
      const row = imageArray[y] = new Array(width);
      for (let x = 0; x < width; x++) {
        const pixel = new Float32Array(4);
        pixel[0] = pixelsData[index++] / 255; // r
        pixel[1] = pixelsData[index++] / 255; // g
        pixel[2] = pixelsData[index++] / 255; // b
        pixel[3] = pixelsData[index++] / 255; // a
        row[x] = pixel;
      }
    }
    return imageArray;
  }

  /**
   *
   * @param flip
   * @return {Uint8ClampedArray}
   */
  getPixels(flip) {
    const [width, height] = this.output;
    // cpu is not flipped by default
    return flip ? utils.flipPixels(this._imageData.data, width, height) : this._imageData.data.slice(0);
  }

  _imageTo3DArray(images) {
    const imagesArray = new Array(images.length);
    for (let i = 0; i < images.length; i++) {
      imagesArray[i] = this._mediaTo2DArray(images[i]);
    }
    return imagesArray;
  }

  _resultKernelHeader() {
    if (this.graphical) return '';
    if (this.immutable) return '';
    if (!this.pipeline) return '';
    switch (this.output.length) {
      case 1:
        return this._mutableKernel1DResults();
      case 2:
        return this._mutableKernel2DResults();
      case 3:
        return this._mutableKernel3DResults();
    }
  }

  _resultKernelBody(kernelString) {
    switch (this.output.length) {
      case 1:
        return (!this.immutable && this.pipeline ? this._resultMutableKernel1DLoop(kernelString) : this._resultImmutableKernel1DLoop(kernelString)) + this._kernelOutput();
      case 2:
        return (!this.immutable && this.pipeline ? this._resultMutableKernel2DLoop(kernelString) : this._resultImmutableKernel2DLoop(kernelString)) + this._kernelOutput();
      case 3:
        return (!this.immutable && this.pipeline ? this._resultMutableKernel3DLoop(kernelString) : this._resultImmutableKernel3DLoop(kernelString)) + this._kernelOutput();
      default:
        throw new Error('unsupported size kernel');
    }
  }

  _graphicalKernelBody(kernelThreadString) {
    switch (this.output.length) {
      case 2:
        return this._graphicalKernel2DLoop(kernelThreadString) + this._graphicalOutput();
      default:
        throw new Error('unsupported size kernel');
    }
  }

  _graphicalOutput() {
    return `
    this._imageData.data.set(this._colorData);
    this.context.putImageData(this._imageData, 0, 0);
    return;`
  }

  _getKernelResultTypeConstructorString() {
    switch (this.returnType) {
      case 'LiteralInteger':
      case 'Number':
      case 'Integer':
      case 'Float':
        return 'Float32Array';
      case 'Array(2)':
      case 'Array(3)':
      case 'Array(4)':
        return 'Array';
      default:
        if (this.graphical) {
          return 'Float32Array';
        }
        throw new Error(`unhandled returnType ${ this.returnType }`);
    }
  }

  _resultImmutableKernel1DLoop(kernelString) {
    const constructorString = this._getKernelResultTypeConstructorString();
    return `  const outputX = _this.output[0];
    const result = new ${constructorString}(outputX);
    ${ this._mapSubKernels(subKernel => `const result_${ subKernel.name } = new ${constructorString}(outputX);\n`).join('    ') }
    ${ this._mapSubKernels(subKernel => `let subKernelResult_${ subKernel.name };\n`).join('    ') }
    for (let x = 0; x < outputX; x++) {
      this.thread.x = x;
      this.thread.y = 0;
      this.thread.z = 0;
      ${ kernelString }
    }`;
  }

  _mutableKernel1DResults() {
    const constructorString = this._getKernelResultTypeConstructorString();
    return `  const outputX = _this.output[0];
    const result = new ${constructorString}(outputX);
    ${ this._mapSubKernels(subKernel => `const result_${ subKernel.name } = new ${constructorString}(outputX);\n`).join('    ') }
    ${ this._mapSubKernels(subKernel => `let subKernelResult_${ subKernel.name };\n`).join('    ') }`;
  }

  _resultMutableKernel1DLoop(kernelString) {
    return `  const outputX = _this.output[0];
    for (let x = 0; x < outputX; x++) {
      this.thread.x = x;
      this.thread.y = 0;
      this.thread.z = 0;
      ${ kernelString }
    }`;
  }

  _resultImmutableKernel2DLoop(kernelString) {
    const constructorString = this._getKernelResultTypeConstructorString();
    return `  const outputX = _this.output[0];
    const outputY = _this.output[1];
    const result = new Array(outputY);
    ${ this._mapSubKernels(subKernel => `const result_${ subKernel.name } = new Array(outputY);\n`).join('    ') }
    ${ this._mapSubKernels(subKernel => `let subKernelResult_${ subKernel.name };\n`).join('    ') }
    for (let y = 0; y < outputY; y++) {
      this.thread.z = 0;
      this.thread.y = y;
      const resultX = result[y] = new ${constructorString}(outputX);
      ${ this._mapSubKernels(subKernel => `const resultX_${ subKernel.name } = result_${subKernel.name}[y] = new ${constructorString}(outputX);\n`).join('') }
      for (let x = 0; x < outputX; x++) {
        this.thread.x = x;
        ${ kernelString }
      }
    }`;
  }

  _mutableKernel2DResults() {
    const constructorString = this._getKernelResultTypeConstructorString();
    return `  const outputX = _this.output[0];
    const outputY = _this.output[1];
    const result = new Array(outputY);
    ${ this._mapSubKernels(subKernel => `const result_${ subKernel.name } = new Array(outputY);\n`).join('    ') }
    ${ this._mapSubKernels(subKernel => `let subKernelResult_${ subKernel.name };\n`).join('    ') }
    for (let y = 0; y < outputY; y++) {
      const resultX = result[y] = new ${constructorString}(outputX);
      ${ this._mapSubKernels(subKernel => `const resultX_${ subKernel.name } = result_${subKernel.name}[y] = new ${constructorString}(outputX);\n`).join('') }
    }`;
  }

  _resultMutableKernel2DLoop(kernelString) {
    const constructorString = this._getKernelResultTypeConstructorString();
    return `  const outputX = _this.output[0];
    const outputY = _this.output[1];
    for (let y = 0; y < outputY; y++) {
      this.thread.z = 0;
      this.thread.y = y;
      const resultX = result[y];
      ${ this._mapSubKernels(subKernel => `const resultX_${ subKernel.name } = result_${subKernel.name}[y] = new ${constructorString}(outputX);\n`).join('') }
      for (let x = 0; x < outputX; x++) {
        this.thread.x = x;
        ${ kernelString }
      }
    }`;
  }

  _graphicalKernel2DLoop(kernelString) {
    return `  const outputX = _this.output[0];
    const outputY = _this.output[1];
    for (let y = 0; y < outputY; y++) {
      this.thread.z = 0;
      this.thread.y = y;
      for (let x = 0; x < outputX; x++) {
        this.thread.x = x;
        ${ kernelString }
      }
    }`;
  }

  _resultImmutableKernel3DLoop(kernelString) {
    const constructorString = this._getKernelResultTypeConstructorString();
    return `  const outputX = _this.output[0];
    const outputY = _this.output[1];
    const outputZ = _this.output[2];
    const result = new Array(outputZ);
    ${ this._mapSubKernels(subKernel => `const result_${ subKernel.name } = new Array(outputZ);\n`).join('    ') }
    ${ this._mapSubKernels(subKernel => `let subKernelResult_${ subKernel.name };\n`).join('    ') }
    for (let z = 0; z < outputZ; z++) {
      this.thread.z = z;
      const resultY = result[z] = new Array(outputY);
      ${ this._mapSubKernels(subKernel => `const resultY_${ subKernel.name } = result_${subKernel.name}[z] = new Array(outputY);\n`).join('      ') }
      for (let y = 0; y < outputY; y++) {
        this.thread.y = y;
        const resultX = resultY[y] = new ${constructorString}(outputX);
        ${ this._mapSubKernels(subKernel => `const resultX_${ subKernel.name } = resultY_${subKernel.name}[y] = new ${constructorString}(outputX);\n`).join('        ') }
        for (let x = 0; x < outputX; x++) {
          this.thread.x = x;
          ${ kernelString }
        }
      }
    }`;
  }

  _mutableKernel3DResults() {
    const constructorString = this._getKernelResultTypeConstructorString();
    return `  const outputX = _this.output[0];
    const outputY = _this.output[1];
    const outputZ = _this.output[2];
    const result = new Array(outputZ);
    ${ this._mapSubKernels(subKernel => `const result_${ subKernel.name } = new Array(outputZ);\n`).join('    ') }
    ${ this._mapSubKernels(subKernel => `let subKernelResult_${ subKernel.name };\n`).join('    ') }
    for (let z = 0; z < outputZ; z++) {
      const resultY = result[z] = new Array(outputY);
      ${ this._mapSubKernels(subKernel => `const resultY_${ subKernel.name } = result_${subKernel.name}[z] = new Array(outputY);\n`).join('      ') }
      for (let y = 0; y < outputY; y++) {
        const resultX = resultY[y] = new ${constructorString}(outputX);
        ${ this._mapSubKernels(subKernel => `const resultX_${ subKernel.name } = resultY_${subKernel.name}[y] = new ${constructorString}(outputX);\n`).join('        ') }
      }
    }`;
  }

  _resultMutableKernel3DLoop(kernelString) {
    return `  const outputX = _this.output[0];
    const outputY = _this.output[1];
    const outputZ = _this.output[2];
    for (let z = 0; z < outputZ; z++) {
      this.thread.z = z;
      const resultY = result[z];
      for (let y = 0; y < outputY; y++) {
        this.thread.y = y;
        const resultX = resultY[y];
        for (let x = 0; x < outputX; x++) {
          this.thread.x = x;
          ${ kernelString }
        }
      }
    }`;
  }

  _kernelOutput() {
    if (!this.subKernels) {
      return '\n    return result;';
    }
    return `\n    return {
      result: result,
      ${ this.subKernels.map(subKernel => `${ subKernel.property }: result_${ subKernel.name }`).join(',\n      ') }
    };`;
  }

  _mapSubKernels(fn) {
    return this.subKernels === null ? [''] :
      this.subKernels.map(fn);
  }

  destroy(removeCanvasReference) {
    if (removeCanvasReference) {
      delete this.canvas;
    }
  }

  static destroyContext(context) {}

  toJSON() {
    const json = super.toJSON();
    json.functionNodes = FunctionBuilder.fromKernel(this, CPUFunctionNode).toJSON();
    return json;
  }

  setOutput(output) {
    super.setOutput(output);
    const [width, height] = this.output;
    if (this.graphical) {
      this._imageData = this.context.createImageData(width, height);
      this._colorData = new Uint8ClampedArray(width * height * 4);
    }
  }

  prependString(value) {
    if (this._kernelString) throw new Error('Kernel already built');
    this._prependedString.push(value);
  }

  hasPrependString(value) {
    return this._prependedString.indexOf(value) > -1;
  }
}

module.exports = {
  CPUKernel
};

/***/ }),

/***/ "./src/backend/function-builder.js":
/*!*****************************************!*\
  !*** ./src/backend/function-builder.js ***!
  \*****************************************/
/***/ ((module) => {

/**
 * @desc This handles all the raw state, converted state, etc. of a single function.
 * [INTERNAL] A collection of functionNodes.
 * @class
 */
class FunctionBuilder {
  /**
   *
   * @param {Kernel} kernel
   * @param {FunctionNode} FunctionNode
   * @param {object} [extraNodeOptions]
   * @returns {FunctionBuilder}
   * @static
   */
  static fromKernel(kernel, FunctionNode, extraNodeOptions) {
    const {
      kernelArguments,
      kernelConstants,
      argumentNames,
      argumentSizes,
      argumentBitRatios,
      constants,
      constantBitRatios,
      debug,
      loopMaxIterations,
      nativeFunctions,
      output,
      optimizeFloatMemory,
      precision,
      plugins,
      source,
      subKernels,
      functions,
      leadingReturnStatement,
      followingReturnStatement,
      dynamicArguments,
      dynamicOutput,
    } = kernel;

    const argumentTypes = new Array(kernelArguments.length);
    const constantTypes = {};

    for (let i = 0; i < kernelArguments.length; i++) {
      argumentTypes[i] = kernelArguments[i].type;
    }

    for (let i = 0; i < kernelConstants.length; i++) {
      const kernelConstant = kernelConstants[i];
      constantTypes[kernelConstant.name] = kernelConstant.type;
    }

    const needsArgumentType = (functionName, index) => {
      return functionBuilder.needsArgumentType(functionName, index);
    };

    const assignArgumentType = (functionName, index, type) => {
      functionBuilder.assignArgumentType(functionName, index, type);
    };

    const lookupReturnType = (functionName, ast, requestingNode) => {
      return functionBuilder.lookupReturnType(functionName, ast, requestingNode);
    };

    const lookupFunctionArgumentTypes = (functionName) => {
      return functionBuilder.lookupFunctionArgumentTypes(functionName);
    };

    const lookupFunctionArgumentName = (functionName, argumentIndex) => {
      return functionBuilder.lookupFunctionArgumentName(functionName, argumentIndex);
    };

    const lookupFunctionArgumentBitRatio = (functionName, argumentName) => {
      return functionBuilder.lookupFunctionArgumentBitRatio(functionName, argumentName);
    };

    const triggerImplyArgumentType = (functionName, i, argumentType, requestingNode) => {
      functionBuilder.assignArgumentType(functionName, i, argumentType, requestingNode);
    };

    const triggerImplyArgumentBitRatio = (functionName, argumentName, calleeFunctionName, argumentIndex) => {
      functionBuilder.assignArgumentBitRatio(functionName, argumentName, calleeFunctionName, argumentIndex);
    };

    const onFunctionCall = (functionName, calleeFunctionName, args) => {
      functionBuilder.trackFunctionCall(functionName, calleeFunctionName, args);
    };

    const onNestedFunction = (ast, source) => {
      const argumentNames = [];
      for (let i = 0; i < ast.params.length; i++) {
        argumentNames.push(ast.params[i].name);
      }
      const nestedFunction = new FunctionNode(source, Object.assign({}, nodeOptions, {
        returnType: null,
        ast,
        name: ast.id.name,
        argumentNames,
        lookupReturnType,
        lookupFunctionArgumentTypes,
        lookupFunctionArgumentName,
        lookupFunctionArgumentBitRatio,
        needsArgumentType,
        assignArgumentType,
        triggerImplyArgumentType,
        triggerImplyArgumentBitRatio,
        onFunctionCall,
      }));
      nestedFunction.traceFunctionAST(ast);
      functionBuilder.addFunctionNode(nestedFunction);
    };

    const nodeOptions = Object.assign({
      isRootKernel: false,
      onNestedFunction,
      lookupReturnType,
      lookupFunctionArgumentTypes,
      lookupFunctionArgumentName,
      lookupFunctionArgumentBitRatio,
      needsArgumentType,
      assignArgumentType,
      triggerImplyArgumentType,
      triggerImplyArgumentBitRatio,
      onFunctionCall,
      optimizeFloatMemory,
      precision,
      constants,
      constantTypes,
      constantBitRatios,
      debug,
      loopMaxIterations,
      output,
      plugins,
      dynamicArguments,
      dynamicOutput,
    }, extraNodeOptions || {});

    const rootNodeOptions = Object.assign({}, nodeOptions, {
      isRootKernel: true,
      name: 'kernel',
      argumentNames,
      argumentTypes,
      argumentSizes,
      argumentBitRatios,
      leadingReturnStatement,
      followingReturnStatement,
    });

    if (typeof source === 'object' && source.functionNodes) {
      return new FunctionBuilder().fromJSON(source.functionNodes, FunctionNode);
    }

    const rootNode = new FunctionNode(source, rootNodeOptions);

    let functionNodes = null;
    if (functions) {
      functionNodes = functions.map((fn) => new FunctionNode(fn.source, {
        returnType: fn.returnType,
        argumentTypes: fn.argumentTypes,
        output,
        plugins,
        constants,
        constantTypes,
        constantBitRatios,
        optimizeFloatMemory,
        precision,
        lookupReturnType,
        lookupFunctionArgumentTypes,
        lookupFunctionArgumentName,
        lookupFunctionArgumentBitRatio,
        needsArgumentType,
        assignArgumentType,
        triggerImplyArgumentType,
        triggerImplyArgumentBitRatio,
        onFunctionCall,
        onNestedFunction,
      }));
    }

    let subKernelNodes = null;
    if (subKernels) {
      subKernelNodes = subKernels.map((subKernel) => {
        const { name, source } = subKernel;
        return new FunctionNode(source, Object.assign({}, nodeOptions, {
          name,
          isSubKernel: true,
          isRootKernel: false,
        }));
      });
    }

    const functionBuilder = new FunctionBuilder({
      kernel,
      rootNode,
      functionNodes,
      nativeFunctions,
      subKernelNodes
    });

    return functionBuilder;
  }

  /**
   *
   * @param {IFunctionBuilderSettings} [settings]
   */
  constructor(settings) {
    settings = settings || {};
    this.kernel = settings.kernel;
    this.rootNode = settings.rootNode;
    this.functionNodes = settings.functionNodes || [];
    this.subKernelNodes = settings.subKernelNodes || [];
    this.nativeFunctions = settings.nativeFunctions || [];
    this.functionMap = {};
    this.nativeFunctionNames = [];
    this.lookupChain = [];
    this.functionNodeDependencies = {};
    this.functionCalls = {};

    if (this.rootNode) {
      this.functionMap['kernel'] = this.rootNode;
    }

    if (this.functionNodes) {
      for (let i = 0; i < this.functionNodes.length; i++) {
        this.functionMap[this.functionNodes[i].name] = this.functionNodes[i];
      }
    }

    if (this.subKernelNodes) {
      for (let i = 0; i < this.subKernelNodes.length; i++) {
        this.functionMap[this.subKernelNodes[i].name] = this.subKernelNodes[i];
      }
    }

    if (this.nativeFunctions) {
      for (let i = 0; i < this.nativeFunctions.length; i++) {
        const nativeFunction = this.nativeFunctions[i];
        this.nativeFunctionNames.push(nativeFunction.name);
      }
    }
  }

  /**
   * @desc Add the function node directly
   *
   * @param {FunctionNode} functionNode - functionNode to add
   *
   */
  addFunctionNode(functionNode) {
    if (!functionNode.name) throw new Error('functionNode.name needs set');
    this.functionMap[functionNode.name] = functionNode;
    if (functionNode.isRootKernel) {
      this.rootNode = functionNode;
    }
  }

  /**
   * @desc Trace all the depending functions being called, from a single function
   *
   * This allow for 'unneeded' functions to be automatically optimized out.
   * Note that the 0-index, is the starting function trace.
   *
   * @param {String} functionName - Function name to trace from, default to 'kernel'
   * @param {String[]} [retList] - Returning list of function names that is traced. Including itself.
   *
   * @returns {String[]}  Returning list of function names that is traced. Including itself.
   */
  traceFunctionCalls(functionName, retList) {
    functionName = functionName || 'kernel';
    retList = retList || [];

    if (this.nativeFunctionNames.indexOf(functionName) > -1) {
      const nativeFunctionIndex = retList.indexOf(functionName);
      if (nativeFunctionIndex === -1) {
        retList.push(functionName);
      } else {
        /**
         * https://github.com/gpujs/gpu.js/issues/207
         * if dependent function is already in the list, because a function depends on it, and because it has
         * already been traced, we know that we must move the dependent function to the end of the the retList.
         * */
        const dependantNativeFunctionName = retList.splice(nativeFunctionIndex, 1)[0];
        retList.push(dependantNativeFunctionName);
      }
      return retList;
    }

    const functionNode = this.functionMap[functionName];
    if (functionNode) {
      // Check if function already exists
      const functionIndex = retList.indexOf(functionName);
      if (functionIndex === -1) {
        retList.push(functionName);
        functionNode.toString(); //ensure JS trace is done
        for (let i = 0; i < functionNode.calledFunctions.length; ++i) {
          this.traceFunctionCalls(functionNode.calledFunctions[i], retList);
        }
      } else {
        /**
         * https://github.com/gpujs/gpu.js/issues/207
         * if dependent function is already in the list, because a function depends on it, and because it has
         * already been traced, we know that we must move the dependent function to the end of the the retList.
         * */
        const dependantFunctionName = retList.splice(functionIndex, 1)[0];
        retList.push(dependantFunctionName);
      }
    }

    return retList;
  }

  /**
   * @desc Return the string for a function
   * @param {String} functionName - Function name to trace from. If null, it returns the WHOLE builder stack
   * @returns {String} The full string, of all the various functions. Trace optimized if functionName given
   */
  getPrototypeString(functionName) {
    return this.getPrototypes(functionName).join('\n');
  }

  /**
   * @desc Return the string for a function
   * @param {String} [functionName] - Function name to trace from. If null, it returns the WHOLE builder stack
   * @returns {Array} The full string, of all the various functions. Trace optimized if functionName given
   */
  getPrototypes(functionName) {
    if (this.rootNode) {
      this.rootNode.toString();
    }
    if (functionName) {
      return this.getPrototypesFromFunctionNames(this.traceFunctionCalls(functionName, []).reverse());
    }
    return this.getPrototypesFromFunctionNames(Object.keys(this.functionMap));
  }

  /**
   * @desc Get string from function names
   * @param {String[]} functionList - List of function to build string
   * @returns {String} The string, of all the various functions. Trace optimized if functionName given
   */
  getStringFromFunctionNames(functionList) {
    const ret = [];
    for (let i = 0; i < functionList.length; ++i) {
      const node = this.functionMap[functionList[i]];
      if (node) {
        ret.push(this.functionMap[functionList[i]].toString());
      }
    }
    return ret.join('\n');
  }

  /**
   * @desc Return string of all functions converted
   * @param {String[]} functionList - List of function names to build the string.
   * @returns {Array} Prototypes of all functions converted
   */
  getPrototypesFromFunctionNames(functionList) {
    const ret = [];
    for (let i = 0; i < functionList.length; ++i) {
      const functionName = functionList[i];
      const functionIndex = this.nativeFunctionNames.indexOf(functionName);
      if (functionIndex > -1) {
        ret.push(this.nativeFunctions[functionIndex].source);
        continue;
      }
      const node = this.functionMap[functionName];
      if (node) {
        ret.push(node.toString());
      }
    }
    return ret;
  }

  toJSON() {
    return this.traceFunctionCalls(this.rootNode.name).reverse().map(name => {
      const nativeIndex = this.nativeFunctions.indexOf(name);
      if (nativeIndex > -1) {
        return {
          name,
          source: this.nativeFunctions[nativeIndex].source
        };
      } else if (this.functionMap[name]) {
        return this.functionMap[name].toJSON();
      } else {
        throw new Error(`function ${ name } not found`);
      }
    });
  }

  fromJSON(jsonFunctionNodes, FunctionNode) {
    this.functionMap = {};
    for (let i = 0; i < jsonFunctionNodes.length; i++) {
      const jsonFunctionNode = jsonFunctionNodes[i];
      this.functionMap[jsonFunctionNode.settings.name] = new FunctionNode(jsonFunctionNode.ast, jsonFunctionNode.settings);
    }
    return this;
  }

  /**
   * @desc Get string for a particular function name
   * @param {String} functionName - Function name to trace from. If null, it returns the WHOLE builder stack
   * @returns {String} settings - The string, of all the various functions. Trace optimized if functionName given
   */
  getString(functionName) {
    if (functionName) {
      return this.getStringFromFunctionNames(this.traceFunctionCalls(functionName).reverse());
    }
    return this.getStringFromFunctionNames(Object.keys(this.functionMap));
  }

  lookupReturnType(functionName, ast, requestingNode) {
    if (ast.type !== 'CallExpression') {
      throw new Error(`expected ast type of "CallExpression", but is ${ ast.type }`);
    }
    if (this._isNativeFunction(functionName)) {
      return this._lookupNativeFunctionReturnType(functionName);
    } else if (this._isFunction(functionName)) {
      const node = this._getFunction(functionName);
      if (node.returnType) {
        return node.returnType;
      } else {
        for (let i = 0; i < this.lookupChain.length; i++) {
          // detect circlical logic
          if (this.lookupChain[i].ast === ast) {
            // detect if arguments have not resolved, preventing a return type
            // if so, go ahead and resolve them, so we can resolve the return type
            if (node.argumentTypes.length === 0 && ast.arguments.length > 0) {
              const args = ast.arguments;
              for (let j = 0; j < args.length; j++) {
                this.lookupChain.push({
                  name: requestingNode.name,
                  ast: args[i],
                  requestingNode
                });
                node.argumentTypes[j] = requestingNode.getType(args[j]);
                this.lookupChain.pop();
              }
              return node.returnType = node.getType(node.getJsAST());
            }

            throw new Error('circlical logic detected!');
          }
        }
        // get ready for a ride!
        this.lookupChain.push({
          name: requestingNode.name,
          ast,
          requestingNode
        });
        const type = node.getType(node.getJsAST());
        this.lookupChain.pop();
        return node.returnType = type;
      }
    }

    return null;
  }

  /**
   *
   * @param {String} functionName
   * @return {FunctionNode}
   * @private
   */
  _getFunction(functionName) {
    if (!this._isFunction(functionName)) {
      new Error(`Function ${functionName} not found`);
    }
    return this.functionMap[functionName];
  }

  _isFunction(functionName) {
    return Boolean(this.functionMap[functionName]);
  }

  _getNativeFunction(functionName) {
    for (let i = 0; i < this.nativeFunctions.length; i++) {
      if (this.nativeFunctions[i].name === functionName) return this.nativeFunctions[i];
    }
    return null;
  }

  _isNativeFunction(functionName) {
    return Boolean(this._getNativeFunction(functionName));
  }

  _lookupNativeFunctionReturnType(functionName) {
    let nativeFunction = this._getNativeFunction(functionName);
    if (nativeFunction) {
      return nativeFunction.returnType;
    }
    throw new Error(`Native function ${ functionName } not found`);
  }

  lookupFunctionArgumentTypes(functionName) {
    if (this._isNativeFunction(functionName)) {
      return this._getNativeFunction(functionName).argumentTypes;
    } else if (this._isFunction(functionName)) {
      return this._getFunction(functionName).argumentTypes;
    }
    return null;
  }

  lookupFunctionArgumentName(functionName, argumentIndex) {
    return this._getFunction(functionName).argumentNames[argumentIndex];
  }

  /**
   *
   * @param {string} functionName
   * @param {string} argumentName
   * @return {number}
   */
  lookupFunctionArgumentBitRatio(functionName, argumentName) {
    if (!this._isFunction(functionName)) {
      throw new Error('function not found');
    }
    if (this.rootNode.name === functionName) {
      const i = this.rootNode.argumentNames.indexOf(argumentName);
      if (i !== -1) {
        return this.rootNode.argumentBitRatios[i];
      }
    }
    const node = this._getFunction(functionName);
    const i = node.argumentNames.indexOf(argumentName);
    if (i === -1) {
      throw new Error('argument not found');
    }
    const bitRatio = node.argumentBitRatios[i];
    if (typeof bitRatio !== 'number') {
      throw new Error('argument bit ratio not found');
    }
    return bitRatio;
  }

  needsArgumentType(functionName, i) {
    if (!this._isFunction(functionName)) return false;
    const fnNode = this._getFunction(functionName);
    return !fnNode.argumentTypes[i];
  }

  assignArgumentType(functionName, i, argumentType, requestingNode) {
    if (!this._isFunction(functionName)) return;
    const fnNode = this._getFunction(functionName);
    if (!fnNode.argumentTypes[i]) {
      fnNode.argumentTypes[i] = argumentType;
    }
  }

  /**
   * @param {string} functionName
   * @param {string} argumentName
   * @param {string} calleeFunctionName
   * @param {number} argumentIndex
   * @return {number|null}
   */
  assignArgumentBitRatio(functionName, argumentName, calleeFunctionName, argumentIndex) {
    const node = this._getFunction(functionName);
    if (this._isNativeFunction(calleeFunctionName)) return null;
    const calleeNode = this._getFunction(calleeFunctionName);
    const i = node.argumentNames.indexOf(argumentName);
    if (i === -1) {
      throw new Error(`Argument ${argumentName} not found in arguments from function ${functionName}`);
    }
    const bitRatio = node.argumentBitRatios[i];
    if (typeof bitRatio !== 'number') {
      throw new Error(`Bit ratio for argument ${argumentName} not found in function ${functionName}`);
    }
    if (!calleeNode.argumentBitRatios) {
      calleeNode.argumentBitRatios = new Array(calleeNode.argumentNames.length);
    }
    const calleeBitRatio = calleeNode.argumentBitRatios[i];
    if (typeof calleeBitRatio === 'number') {
      if (calleeBitRatio !== bitRatio) {
        throw new Error(`Incompatible bit ratio found at function ${functionName} at argument ${argumentName}`);
      }
      return calleeBitRatio;
    }
    calleeNode.argumentBitRatios[i] = bitRatio;
    return bitRatio;
  }

  trackFunctionCall(functionName, calleeFunctionName, args) {
    if (!this.functionNodeDependencies[functionName]) {
      this.functionNodeDependencies[functionName] = new Set();
      this.functionCalls[functionName] = [];
    }
    this.functionNodeDependencies[functionName].add(calleeFunctionName);
    this.functionCalls[functionName].push(args);
  }

  getKernelResultType() {
    return this.rootNode.returnType || this.rootNode.getType(this.rootNode.ast);
  }

  getSubKernelResultType(index) {
    const subKernelNode = this.subKernelNodes[index];
    let called = false;
    for (let functionCallIndex = 0; functionCallIndex < this.rootNode.functionCalls.length; functionCallIndex++) {
      const functionCall = this.rootNode.functionCalls[functionCallIndex];
      if (functionCall.ast.callee.name === subKernelNode.name) {
        called = true;
      }
    }
    if (!called) {
      throw new Error(`SubKernel ${ subKernelNode.name } never called by kernel`);
    }
    return subKernelNode.returnType || subKernelNode.getType(subKernelNode.getJsAST());
  }

  getReturnTypes() {
    const result = {
      [this.rootNode.name]: this.rootNode.getType(this.rootNode.ast),
    };
    const list = this.traceFunctionCalls(this.rootNode.name);
    for (let i = 0; i < list.length; i++) {
      const functionName = list[i];
      const functionNode = this.functionMap[functionName];
      result[functionName] = functionNode.getType(functionNode.ast);
    }
    return result;
  }
}

module.exports = {
  FunctionBuilder
};

/***/ }),

/***/ "./src/backend/function-node.js":
/*!**************************************!*\
  !*** ./src/backend/function-node.js ***!
  \**************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const acorn = __webpack_require__(/*! acorn */ "./node_modules/acorn/dist/acorn.mjs");
const { utils } = __webpack_require__(/*! ../utils */ "./src/utils.js");
const { FunctionTracer } = __webpack_require__(/*! ./function-tracer */ "./src/backend/function-tracer.js");

/**
 *
 * @desc Represents a single function, inside JS, webGL, or openGL.
 * <p>This handles all the raw state, converted state, etc. Of a single function.</p>
 */
class FunctionNode {
  /**
   *
   * @param {string|object} source
   * @param {IFunctionSettings} [settings]
   */
  constructor(source, settings) {
    if (!source && !settings.ast) {
      throw new Error('source parameter is missing');
    }
    settings = settings || {};
    this.source = source;
    this.ast = null;
    this.name = typeof source === 'string' ? settings.isRootKernel ?
      'kernel' :
      (settings.name || utils.getFunctionNameFromString(source)) : null;
    this.calledFunctions = [];
    this.constants = {};
    this.constantTypes = {};
    this.constantBitRatios = {};
    this.isRootKernel = false;
    this.isSubKernel = false;
    this.debug = null;
    this.functions = null;
    this.identifiers = null;
    this.contexts = null;
    this.functionCalls = null;
    this.states = [];
    this.needsArgumentType = null;
    this.assignArgumentType = null;
    this.lookupReturnType = null;
    this.lookupFunctionArgumentTypes = null;
    this.lookupFunctionArgumentBitRatio = null;
    this.triggerImplyArgumentType = null;
    this.triggerImplyArgumentBitRatio = null;
    this.onNestedFunction = null;
    this.onFunctionCall = null;
    this.optimizeFloatMemory = null;
    this.precision = null;
    this.loopMaxIterations = null;
    this.argumentNames = (typeof this.source === 'string' ? utils.getArgumentNamesFromString(this.source) : null);
    this.argumentTypes = [];
    this.argumentSizes = [];
    this.argumentBitRatios = null;
    this.returnType = null;
    this.output = [];
    this.plugins = null;
    this.leadingReturnStatement = null;
    this.followingReturnStatement = null;
    this.dynamicOutput = null;
    this.dynamicArguments = null;
    this.strictTypingChecking = false;
    this.fixIntegerDivisionAccuracy = null;

    if (settings) {
      for (const p in settings) {
        if (!settings.hasOwnProperty(p)) continue;
        if (!this.hasOwnProperty(p)) continue;
        this[p] = settings[p];
      }
    }

    this.literalTypes = {};

    this.validate();
    this._string = null;
    this._internalVariableNames = {};
  }

  validate() {
    if (typeof this.source !== 'string' && !this.ast) {
      throw new Error('this.source not a string');
    }

    if (!this.ast && !utils.isFunctionString(this.source)) {
      throw new Error('this.source not a function string');
    }

    if (!this.name) {
      throw new Error('this.name could not be set');
    }

    if (this.argumentTypes.length > 0 && this.argumentTypes.length !== this.argumentNames.length) {
      throw new Error(`argumentTypes count of ${ this.argumentTypes.length } exceeds ${ this.argumentNames.length }`);
    }

    if (this.output.length < 1) {
      throw new Error('this.output is not big enough');
    }
  }

  /**
   * @param {String} name
   * @returns {boolean}
   */
  isIdentifierConstant(name) {
    if (!this.constants) return false;
    return this.constants.hasOwnProperty(name);
  }

  isInput(argumentName) {
    return this.argumentTypes[this.argumentNames.indexOf(argumentName)] === 'Input';
  }

  pushState(state) {
    this.states.push(state);
  }

  popState(state) {
    if (this.state !== state) {
      throw new Error(`Cannot popState ${ state } when in ${ this.state }`);
    }
    this.states.pop();
  }

  isState(state) {
    return this.state === state;
  }

  get state() {
    return this.states[this.states.length - 1];
  }

  /**
   * @function
   * @name astMemberExpressionUnroll
   * @desc Parses the abstract syntax tree for binary expression.
   *
   * <p>Utility function for astCallExpression.</p>
   *
   * @param {Object} ast - the AST object to parse
   *
   * @returns {String} the function namespace call, unrolled
   */
  astMemberExpressionUnroll(ast) {
    if (ast.type === 'Identifier') {
      return ast.name;
    } else if (ast.type === 'ThisExpression') {
      return 'this';
    }

    if (ast.type === 'MemberExpression') {
      if (ast.object && ast.property) {
        //babel sniffing
        if (ast.object.hasOwnProperty('name') && ast.object.name !== 'Math') {
          return this.astMemberExpressionUnroll(ast.property);
        }

        return (
          this.astMemberExpressionUnroll(ast.object) +
          '.' +
          this.astMemberExpressionUnroll(ast.property)
        );
      }
    }

    //babel sniffing
    if (ast.hasOwnProperty('expressions')) {
      const firstExpression = ast.expressions[0];
      if (firstExpression.type === 'Literal' && firstExpression.value === 0 && ast.expressions.length === 2) {
        return this.astMemberExpressionUnroll(ast.expressions[1]);
      }
    }

    // Failure, unknown expression
    throw this.astErrorOutput('Unknown astMemberExpressionUnroll', ast);
  }

  /**
   * @desc Parses the class function JS, and returns its Abstract Syntax Tree object.
   * This is used internally to convert to shader code
   *
   * @param {Object} [inParser] - Parser to use, assumes in scope 'parser' if null or undefined
   *
   * @returns {Object} The function AST Object, note that result is cached under this.ast;
   */
  getJsAST(inParser) {
    if (this.ast) {
      return this.ast;
    }
    if (typeof this.source === 'object') {
      this.traceFunctionAST(this.source);
      return this.ast = this.source;
    }

    inParser = inParser || acorn;
    if (inParser === null) {
      throw new Error('Missing JS to AST parser');
    }

    const ast = Object.freeze(inParser.parse(`const parser_${ this.name } = ${ this.source };`, {
      locations: true
    }));
    // take out the function object, outside the var declarations
    const functionAST = ast.body[0].declarations[0].init;
    this.traceFunctionAST(functionAST);

    if (!ast) {
      throw new Error('Failed to parse JS code');
    }

    return this.ast = functionAST;
  }

  traceFunctionAST(ast) {
    const { contexts, declarations, functions, identifiers, functionCalls } = new FunctionTracer(ast);
    this.contexts = contexts;
    this.identifiers = identifiers;
    this.functionCalls = functionCalls;
    this.functions = functions;
    for (let i = 0; i < declarations.length; i++) {
      const declaration = declarations[i];
      const { ast, inForLoopInit, inForLoopTest } = declaration;
      const { init } = ast;
      const dependencies = this.getDependencies(init);
      let valueType = null;

      if (inForLoopInit && inForLoopTest) {
        valueType = 'Integer';
      } else {
        if (init) {
          const realType = this.getType(init);
          switch (realType) {
            case 'Integer':
            case 'Float':
            case 'Number':
              if (init.type === 'MemberExpression') {
                valueType = realType;
              } else {
                valueType = 'Number';
              }
              break;
            case 'LiteralInteger':
              valueType = 'Number';
              break;
            default:
              valueType = realType;
          }
        }
      }
      declaration.valueType = valueType;
      declaration.dependencies = dependencies;
      declaration.isSafe = this.isSafeDependencies(dependencies);
    }

    for (let i = 0; i < functions.length; i++) {
      this.onNestedFunction(functions[i], this.source);
    }
  }

  getDeclaration(ast) {
    for (let i = 0; i < this.identifiers.length; i++) {
      const identifier = this.identifiers[i];
      if (ast === identifier.ast) {
        return identifier.declaration;
      }
    }
    return null;
  }

  /**
   * @desc Return the type of parameter sent to subKernel/Kernel.
   * @param {Object} ast - Identifier
   * @returns {String} Type of the parameter
   */
  getVariableType(ast) {
    if (ast.type !== 'Identifier') {
      throw new Error(`ast of ${ast.type} not "Identifier"`);
    }
    let type = null;
    const argumentIndex = this.argumentNames.indexOf(ast.name);
    if (argumentIndex === -1) {
      const declaration = this.getDeclaration(ast);
      if (declaration) {
        return declaration.valueType;
      }
    } else {
      const argumentType = this.argumentTypes[argumentIndex];
      if (argumentType) {
        type = argumentType;
      }
    }
    if (!type && this.strictTypingChecking) {
      throw new Error(`Declaration of ${name} not found`);
    }
    return type;
  }

  /**
   * Generally used to lookup the value type returned from a member expressions
   * @param {String} type
   * @return {String}
   */
  getLookupType(type) {
    if (!typeLookupMap.hasOwnProperty(type)) {
      throw new Error(`unknown typeLookupMap ${ type }`);
    }
    return typeLookupMap[type];
  }

  getConstantType(constantName) {
    if (this.constantTypes[constantName]) {
      const type = this.constantTypes[constantName];
      if (type === 'Float') {
        return 'Number';
      } else {
        return type;
      }
    }
    throw new Error(`Type for constant "${ constantName }" not declared`);
  }

  toString() {
    if (this._string) return this._string;
    return this._string = this.astGeneric(this.getJsAST(), []).join('').trim();
  }

  toJSON() {
    const settings = {
      source: this.source,
      name: this.name,
      constants: this.constants,
      constantTypes: this.constantTypes,
      isRootKernel: this.isRootKernel,
      isSubKernel: this.isSubKernel,
      debug: this.debug,
      output: this.output,
      loopMaxIterations: this.loopMaxIterations,
      argumentNames: this.argumentNames,
      argumentTypes: this.argumentTypes,
      argumentSizes: this.argumentSizes,
      returnType: this.returnType,
      leadingReturnStatement: this.leadingReturnStatement,
      followingReturnStatement: this.followingReturnStatement,
    };

    return {
      ast: this.ast,
      settings
    };
  }

  /**
   * Recursively looks up type for ast expression until it's found
   * @param ast
   * @returns {String|null}
   */
  getType(ast) {
    if (Array.isArray(ast)) {
      return this.getType(ast[ast.length - 1]);
    }
    switch (ast.type) {
      case 'BlockStatement':
        return this.getType(ast.body);
      case 'ArrayExpression':
        const childType = this.getType(ast.elements[0]);
        switch (childType) {
          case 'Array(2)':
          case 'Array(3)':
          case 'Array(4)':
            return `Matrix(${ast.elements.length})`;
        }
        return `Array(${ ast.elements.length })`;
      case 'Literal':
        const literalKey = this.astKey(ast);
        if (this.literalTypes[literalKey]) {
          return this.literalTypes[literalKey];
        }
        if (Number.isInteger(ast.value)) {
          return 'LiteralInteger';
        } else if (ast.value === true || ast.value === false) {
          return 'Boolean';
        } else {
          return 'Number';
        }
        case 'AssignmentExpression':
          return this.getType(ast.left);
        case 'CallExpression':
          if (this.isAstMathFunction(ast)) {
            return 'Number';
          }
          if (!ast.callee || !ast.callee.name) {
            if (ast.callee.type === 'SequenceExpression' && ast.callee.expressions[ast.callee.expressions.length - 1].property.name) {
              const functionName = ast.callee.expressions[ast.callee.expressions.length - 1].property.name;
              this.inferArgumentTypesIfNeeded(functionName, ast.arguments);
              return this.lookupReturnType(functionName, ast, this);
            }
            if (this.getVariableSignature(ast.callee, true) === 'this.color') {
              return null;
            }
            if (ast.callee.type === 'MemberExpression' && ast.callee.object && ast.callee.property && ast.callee.property.name && ast.arguments) {
              const functionName = ast.callee.property.name;
              this.inferArgumentTypesIfNeeded(functionName, ast.arguments);
              return this.lookupReturnType(functionName, ast, this);
            }
            throw this.astErrorOutput('Unknown call expression', ast);
          }
          if (ast.callee && ast.callee.name) {
            const functionName = ast.callee.name;
            this.inferArgumentTypesIfNeeded(functionName, ast.arguments);
            return this.lookupReturnType(functionName, ast, this);
          }
          throw this.astErrorOutput(`Unhandled getType Type "${ ast.type }"`, ast);
        case 'LogicalExpression':
          return 'Boolean';
        case 'BinaryExpression':
          // modulos is Number
          switch (ast.operator) {
            case '%':
            case '/':
              if (this.fixIntegerDivisionAccuracy) {
                return 'Number';
              } else {
                break;
              }
              case '>':
              case '<':
                return 'Boolean';
              case '&':
              case '|':
              case '^':
              case '<<':
              case '>>':
              case '>>>':
                return 'Integer';
          }
          const type = this.getType(ast.left);
          if (this.isState('skip-literal-correction')) return type;
          if (type === 'LiteralInteger') {
            const rightType = this.getType(ast.right);
            if (rightType === 'LiteralInteger') {
              if (ast.left.value % 1 === 0) {
                return 'Integer';
              } else {
                return 'Float';
              }
            }
            return rightType;
          }
          return typeLookupMap[type] || type;
        case 'UpdateExpression':
          return this.getType(ast.argument);
        case 'UnaryExpression':
          if (ast.operator === '~') {
            return 'Integer';
          }
          return this.getType(ast.argument);
        case 'VariableDeclaration': {
          const declarations = ast.declarations;
          let lastType;
          for (let i = 0; i < declarations.length; i++) {
            const declaration = declarations[i];
            lastType = this.getType(declaration);
          }
          if (!lastType) {
            throw this.astErrorOutput(`Unable to find type for declaration`, ast);
          }
          return lastType;
        }
        case 'VariableDeclarator':
          const declaration = this.getDeclaration(ast.id);
          if (!declaration) {
            throw this.astErrorOutput(`Unable to find declarator`, ast);
          }

          if (!declaration.valueType) {
            throw this.astErrorOutput(`Unable to find declarator valueType`, ast);
          }

          return declaration.valueType;
        case 'Identifier':
          if (ast.name === 'Infinity') {
            return 'Number';
          }
          if (this.isAstVariable(ast)) {
            const signature = this.getVariableSignature(ast);
            if (signature === 'value') {
              return this.getCheckVariableType(ast);
            }
          }
          const origin = this.findIdentifierOrigin(ast);
          if (origin && origin.init) {
            return this.getType(origin.init);
          }
          return null;
        case 'ReturnStatement':
          return this.getType(ast.argument);
        case 'MemberExpression':
          if (this.isAstMathFunction(ast)) {
            switch (ast.property.name) {
              case 'ceil':
                return 'Integer';
              case 'floor':
                return 'Integer';
              case 'round':
                return 'Integer';
            }
            return 'Number';
          }
          if (this.isAstVariable(ast)) {
            const variableSignature = this.getVariableSignature(ast);
            switch (variableSignature) {
              case 'value[]':
                return this.getLookupType(this.getCheckVariableType(ast.object));
              case 'value[][]':
                return this.getLookupType(this.getCheckVariableType(ast.object.object));
              case 'value[][][]':
                return this.getLookupType(this.getCheckVariableType(ast.object.object.object));
              case 'value[][][][]':
                return this.getLookupType(this.getCheckVariableType(ast.object.object.object.object));
              case 'value.thread.value':
              case 'this.thread.value':
                return 'Integer';
              case 'this.output.value':
                return this.dynamicOutput ? 'Integer' : 'LiteralInteger';
              case 'this.constants.value':
                return this.getConstantType(ast.property.name);
              case 'this.constants.value[]':
                return this.getLookupType(this.getConstantType(ast.object.property.name));
              case 'this.constants.value[][]':
                return this.getLookupType(this.getConstantType(ast.object.object.property.name));
              case 'this.constants.value[][][]':
                return this.getLookupType(this.getConstantType(ast.object.object.object.property.name));
              case 'this.constants.value[][][][]':
                return this.getLookupType(this.getConstantType(ast.object.object.object.object.property.name));
              case 'fn()[]':
              case 'fn()[][]':
              case 'fn()[][][]':
                return this.getLookupType(this.getType(ast.object));
              case 'value.value':
                if (this.isAstMathVariable(ast)) {
                  return 'Number';
                }
                switch (ast.property.name) {
                  case 'r':
                  case 'g':
                  case 'b':
                  case 'a':
                    return this.getLookupType(this.getCheckVariableType(ast.object));
                }
                case '[][]':
                  return 'Number';
            }
            throw this.astErrorOutput('Unhandled getType MemberExpression', ast);
          }
          throw this.astErrorOutput('Unhandled getType MemberExpression', ast);
        case 'ConditionalExpression':
          return this.getType(ast.consequent);
        case 'FunctionDeclaration':
        case 'FunctionExpression':
          const lastReturn = this.findLastReturn(ast.body);
          if (lastReturn) {
            return this.getType(lastReturn);
          }
          return null;
        case 'IfStatement':
          return this.getType(ast.consequent);
        case 'SequenceExpression':
          return this.getType(ast.expressions[ast.expressions.length - 1]);
        default:
          throw this.astErrorOutput(`Unhandled getType Type "${ ast.type }"`, ast);
    }
  }

  getCheckVariableType(ast) {
    const type = this.getVariableType(ast);
    if (!type) {
      throw this.astErrorOutput(`${ast.type} is not defined`, ast);
    }
    return type;
  }

  inferArgumentTypesIfNeeded(functionName, args) {
    // ensure arguments are filled in, so when we lookup return type, we already can infer it
    for (let i = 0; i < args.length; i++) {
      if (!this.needsArgumentType(functionName, i)) continue;
      const type = this.getType(args[i]);
      if (!type) {
        throw this.astErrorOutput(`Unable to infer argument ${i}`, args[i]);
      }
      this.assignArgumentType(functionName, i, type);
    }
  }

  isAstMathVariable(ast) {
    const mathProperties = [
      'E',
      'PI',
      'SQRT2',
      'SQRT1_2',
      'LN2',
      'LN10',
      'LOG2E',
      'LOG10E',
    ];
    return ast.type === 'MemberExpression' &&
      ast.object && ast.object.type === 'Identifier' &&
      ast.object.name === 'Math' &&
      ast.property &&
      ast.property.type === 'Identifier' &&
      mathProperties.indexOf(ast.property.name) > -1;
  }

  isAstMathFunction(ast) {
    const mathFunctions = [
      'abs',
      'acos',
      'acosh',
      'asin',
      'asinh',
      'atan',
      'atan2',
      'atanh',
      'cbrt',
      'ceil',
      'clz32',
      'cos',
      'cosh',
      'expm1',
      'exp',
      'floor',
      'fround',
      'imul',
      'log',
      'log2',
      'log10',
      'log1p',
      'max',
      'min',
      'pow',
      'random',
      'round',
      'sign',
      'sin',
      'sinh',
      'sqrt',
      'tan',
      'tanh',
      'trunc',
    ];
    return ast.type === 'CallExpression' &&
      ast.callee &&
      ast.callee.type === 'MemberExpression' &&
      ast.callee.object &&
      ast.callee.object.type === 'Identifier' &&
      ast.callee.object.name === 'Math' &&
      ast.callee.property &&
      ast.callee.property.type === 'Identifier' &&
      mathFunctions.indexOf(ast.callee.property.name) > -1;
  }

  isAstVariable(ast) {
    return ast.type === 'Identifier' || ast.type === 'MemberExpression';
  }

  isSafe(ast) {
    return this.isSafeDependencies(this.getDependencies(ast));
  }

  isSafeDependencies(dependencies) {
    return dependencies && dependencies.every ? dependencies.every(dependency => dependency.isSafe) : true;
  }

  /**
   *
   * @param ast
   * @param dependencies
   * @param isNotSafe
   * @return {Array}
   */
  getDependencies(ast, dependencies, isNotSafe) {
    if (!dependencies) {
      dependencies = [];
    }
    if (!ast) return null;
    if (Array.isArray(ast)) {
      for (let i = 0; i < ast.length; i++) {
        this.getDependencies(ast[i], dependencies, isNotSafe);
      }
      return dependencies;
    }
    switch (ast.type) {
      case 'AssignmentExpression':
        this.getDependencies(ast.left, dependencies, isNotSafe);
        this.getDependencies(ast.right, dependencies, isNotSafe);
        return dependencies;
      case 'ConditionalExpression':
        this.getDependencies(ast.test, dependencies, isNotSafe);
        this.getDependencies(ast.alternate, dependencies, isNotSafe);
        this.getDependencies(ast.consequent, dependencies, isNotSafe);
        return dependencies;
      case 'Literal':
        dependencies.push({
          origin: 'literal',
          value: ast.value,
          isSafe: isNotSafe === true ? false : ast.value > -Infinity && ast.value < Infinity && !isNaN(ast.value)
        });
        break;
      case 'VariableDeclarator':
        return this.getDependencies(ast.init, dependencies, isNotSafe);
      case 'Identifier':
        const declaration = this.getDeclaration(ast);
        if (declaration) {
          dependencies.push({
            name: ast.name,
            origin: 'declaration',
            isSafe: isNotSafe ? false : this.isSafeDependencies(declaration.dependencies),
          });
        } else if (this.argumentNames.indexOf(ast.name) > -1) {
          dependencies.push({
            name: ast.name,
            origin: 'argument',
            isSafe: false,
          });
        } else if (this.strictTypingChecking) {
          throw new Error(`Cannot find identifier origin "${ast.name}"`);
        }
        break;
      case 'FunctionDeclaration':
        return this.getDependencies(ast.body.body[ast.body.body.length - 1], dependencies, isNotSafe);
      case 'ReturnStatement':
        return this.getDependencies(ast.argument, dependencies);
      case 'BinaryExpression':
      case 'LogicalExpression':
        isNotSafe = (ast.operator === '/' || ast.operator === '*');
        this.getDependencies(ast.left, dependencies, isNotSafe);
        this.getDependencies(ast.right, dependencies, isNotSafe);
        return dependencies;
      case 'UnaryExpression':
      case 'UpdateExpression':
        return this.getDependencies(ast.argument, dependencies, isNotSafe);
      case 'VariableDeclaration':
        return this.getDependencies(ast.declarations, dependencies, isNotSafe);
      case 'ArrayExpression':
        dependencies.push({
          origin: 'declaration',
          isSafe: true,
        });
        return dependencies;
      case 'CallExpression':
        dependencies.push({
          origin: 'function',
          isSafe: true,
        });
        return dependencies;
      case 'MemberExpression':
        const details = this.getMemberExpressionDetails(ast);
        switch (details.signature) {
          case 'value[]':
            this.getDependencies(ast.object, dependencies, isNotSafe);
            break;
          case 'value[][]':
            this.getDependencies(ast.object.object, dependencies, isNotSafe);
            break;
          case 'value[][][]':
            this.getDependencies(ast.object.object.object, dependencies, isNotSafe);
            break;
          case 'this.output.value':
            if (this.dynamicOutput) {
              dependencies.push({
                name: details.name,
                origin: 'output',
                isSafe: false,
              });
            }
            break;
        }
        if (details) {
          if (details.property) {
            this.getDependencies(details.property, dependencies, isNotSafe);
          }
          if (details.xProperty) {
            this.getDependencies(details.xProperty, dependencies, isNotSafe);
          }
          if (details.yProperty) {
            this.getDependencies(details.yProperty, dependencies, isNotSafe);
          }
          if (details.zProperty) {
            this.getDependencies(details.zProperty, dependencies, isNotSafe);
          }
          return dependencies;
        }
        case 'SequenceExpression':
          return this.getDependencies(ast.expressions, dependencies, isNotSafe);
        default:
          throw this.astErrorOutput(`Unhandled type ${ ast.type } in getDependencies`, ast);
    }
    return dependencies;
  }

  getVariableSignature(ast, returnRawValue) {
    if (!this.isAstVariable(ast)) {
      throw new Error(`ast of type "${ ast.type }" is not a variable signature`);
    }
    if (ast.type === 'Identifier') {
      return 'value';
    }
    const signature = [];
    while (true) {
      if (!ast) break;
      if (ast.computed) {
        signature.push('[]');
      } else if (ast.type === 'ThisExpression') {
        signature.unshift('this');
      } else if (ast.property && ast.property.name) {
        if (
          ast.property.name === 'x' ||
          ast.property.name === 'y' ||
          ast.property.name === 'z'
        ) {
          signature.unshift(returnRawValue ? '.' + ast.property.name : '.value');
        } else if (
          ast.property.name === 'constants' ||
          ast.property.name === 'thread' ||
          ast.property.name === 'output'
        ) {
          signature.unshift('.' + ast.property.name);
        } else {
          signature.unshift(returnRawValue ? '.' + ast.property.name : '.value');
        }
      } else if (ast.name) {
        signature.unshift(returnRawValue ? ast.name : 'value');
      } else if (ast.callee && ast.callee.name) {
        signature.unshift(returnRawValue ? ast.callee.name + '()' : 'fn()');
      } else if (ast.elements) {
        signature.unshift('[]');
      } else {
        signature.unshift('unknown');
      }
      ast = ast.object;
    }

    const signatureString = signature.join('');
    if (returnRawValue) {
      return signatureString;
    }

    const allowedExpressions = [
      'value',
      'value[]',
      'value[][]',
      'value[][][]',
      'value[][][][]',
      'value.value',
      'value.thread.value',
      'this.thread.value',
      'this.output.value',
      'this.constants.value',
      'this.constants.value[]',
      'this.constants.value[][]',
      'this.constants.value[][][]',
      'this.constants.value[][][][]',
      'fn()[]',
      'fn()[][]',
      'fn()[][][]',
      '[][]',
    ];
    if (allowedExpressions.indexOf(signatureString) > -1) {
      return signatureString;
    }
    return null;
  }

  build() {
    return this.toString().length > 0;
  }

  /**
   * @desc Parses the abstract syntax tree for generically to its respective function
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   * @returns {Array} the parsed string array
   */
  astGeneric(ast, retArr) {
    if (ast === null) {
      throw this.astErrorOutput('NULL ast', ast);
    } else {
      if (Array.isArray(ast)) {
        for (let i = 0; i < ast.length; i++) {
          this.astGeneric(ast[i], retArr);
        }
        return retArr;
      }

      switch (ast.type) {
        case 'FunctionDeclaration':
          return this.astFunctionDeclaration(ast, retArr);
        case 'FunctionExpression':
          return this.astFunctionExpression(ast, retArr);
        case 'ReturnStatement':
          return this.astReturnStatement(ast, retArr);
        case 'Literal':
          return this.astLiteral(ast, retArr);
        case 'BinaryExpression':
          return this.astBinaryExpression(ast, retArr);
        case 'Identifier':
          return this.astIdentifierExpression(ast, retArr);
        case 'AssignmentExpression':
          return this.astAssignmentExpression(ast, retArr);
        case 'ExpressionStatement':
          return this.astExpressionStatement(ast, retArr);
        case 'EmptyStatement':
          return this.astEmptyStatement(ast, retArr);
        case 'BlockStatement':
          return this.astBlockStatement(ast, retArr);
        case 'IfStatement':
          return this.astIfStatement(ast, retArr);
        case 'SwitchStatement':
          return this.astSwitchStatement(ast, retArr);
        case 'BreakStatement':
          return this.astBreakStatement(ast, retArr);
        case 'ContinueStatement':
          return this.astContinueStatement(ast, retArr);
        case 'ForStatement':
          return this.astForStatement(ast, retArr);
        case 'WhileStatement':
          return this.astWhileStatement(ast, retArr);
        case 'DoWhileStatement':
          return this.astDoWhileStatement(ast, retArr);
        case 'VariableDeclaration':
          return this.astVariableDeclaration(ast, retArr);
        case 'VariableDeclarator':
          return this.astVariableDeclarator(ast, retArr);
        case 'ThisExpression':
          return this.astThisExpression(ast, retArr);
        case 'SequenceExpression':
          return this.astSequenceExpression(ast, retArr);
        case 'UnaryExpression':
          return this.astUnaryExpression(ast, retArr);
        case 'UpdateExpression':
          return this.astUpdateExpression(ast, retArr);
        case 'LogicalExpression':
          return this.astLogicalExpression(ast, retArr);
        case 'MemberExpression':
          return this.astMemberExpression(ast, retArr);
        case 'CallExpression':
          return this.astCallExpression(ast, retArr);
        case 'ArrayExpression':
          return this.astArrayExpression(ast, retArr);
        case 'DebuggerStatement':
          return this.astDebuggerStatement(ast, retArr);
        case 'ConditionalExpression':
          return this.astConditionalExpression(ast, retArr);
      }

      throw this.astErrorOutput('Unknown ast type : ' + ast.type, ast);
    }
  }
  /**
   * @desc To throw the AST error, with its location.
   * @param {string} error - the error message output
   * @param {Object} ast - the AST object where the error is
   */
  astErrorOutput(error, ast) {
    if (typeof this.source !== 'string') {
      return new Error(error);
    }

    const debugString = utils.getAstString(this.source, ast);
    const leadingSource = this.source.substr(ast.start);
    const splitLines = leadingSource.split(/\n/);
    const lineBefore = splitLines.length > 0 ? splitLines[splitLines.length - 1] : 0;
    return new Error(`${error} on line ${ splitLines.length }, position ${ lineBefore.length }:\n ${ debugString }`);
  }

  astDebuggerStatement(arrNode, retArr) {
    return retArr;
  }

  astConditionalExpression(ast, retArr) {
    if (ast.type !== 'ConditionalExpression') {
      throw this.astErrorOutput('Not a conditional expression', ast);
    }
    retArr.push('(');
    this.astGeneric(ast.test, retArr);
    retArr.push('?');
    this.astGeneric(ast.consequent, retArr);
    retArr.push(':');
    this.astGeneric(ast.alternate, retArr);
    retArr.push(')');
    return retArr;
  }

  /**
   * @abstract
   * @param {Object} ast
   * @param {String[]} retArr
   * @returns {String[]}
   */
  astFunction(ast, retArr) {
    throw new Error(`"astFunction" not defined on ${ this.constructor.name }`);
  }

  /**
   * @desc Parses the abstract syntax tree for to its *named function declaration*
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astFunctionDeclaration(ast, retArr) {
    if (this.isChildFunction(ast)) {
      return retArr;
    }
    return this.astFunction(ast, retArr);
  }
  astFunctionExpression(ast, retArr) {
    if (this.isChildFunction(ast)) {
      return retArr;
    }
    return this.astFunction(ast, retArr);
  }
  isChildFunction(ast) {
    for (let i = 0; i < this.functions.length; i++) {
      if (this.functions[i] === ast) {
        return true;
      }
    }
    return false;
  }
  astReturnStatement(ast, retArr) {
    return retArr;
  }
  astLiteral(ast, retArr) {
    this.literalTypes[this.astKey(ast)] = 'Number';
    return retArr;
  }
  astBinaryExpression(ast, retArr) {
    return retArr;
  }
  astIdentifierExpression(ast, retArr) {
    return retArr;
  }
  astAssignmentExpression(ast, retArr) {
    return retArr;
  }
  /**
   * @desc Parses the abstract syntax tree for *generic expression* statement
   * @param {Object} esNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astExpressionStatement(esNode, retArr) {
    this.astGeneric(esNode.expression, retArr);
    retArr.push(';');
    return retArr;
  }
  /**
   * @desc Parses the abstract syntax tree for an *Empty* Statement
   * @param {Object} eNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astEmptyStatement(eNode, retArr) {
    return retArr;
  }
  astBlockStatement(ast, retArr) {
    return retArr;
  }
  astIfStatement(ast, retArr) {
    return retArr;
  }
  astSwitchStatement(ast, retArr) {
    return retArr;
  }
  /**
   * @desc Parses the abstract syntax tree for *Break* Statement
   * @param {Object} brNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astBreakStatement(brNode, retArr) {
    retArr.push('break;');
    return retArr;
  }
  /**
   * @desc Parses the abstract syntax tree for *Continue* Statement
   * @param {Object} crNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astContinueStatement(crNode, retArr) {
    retArr.push('continue;\n');
    return retArr;
  }
  astForStatement(ast, retArr) {
    return retArr;
  }
  astWhileStatement(ast, retArr) {
    return retArr;
  }
  astDoWhileStatement(ast, retArr) {
    return retArr;
  }
  /**
   * @desc Parses the abstract syntax tree for *Variable Declarator*
   * @param {Object} iVarDecNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astVariableDeclarator(iVarDecNode, retArr) {
    this.astGeneric(iVarDecNode.id, retArr);
    if (iVarDecNode.init !== null) {
      retArr.push('=');
      this.astGeneric(iVarDecNode.init, retArr);
    }
    return retArr;
  }
  astThisExpression(ast, retArr) {
    return retArr;
  }
  astSequenceExpression(sNode, retArr) {
    const { expressions } = sNode;
    const sequenceResult = [];
    for (let i = 0; i < expressions.length; i++) {
      const expression = expressions[i];
      const expressionResult = [];
      this.astGeneric(expression, expressionResult);
      sequenceResult.push(expressionResult.join(''));
    }
    if (sequenceResult.length > 1) {
      retArr.push('(', sequenceResult.join(','), ')');
    } else {
      retArr.push(sequenceResult[0]);
    }
    return retArr;
  }
  /**
   * @desc Parses the abstract syntax tree for *Unary* Expression
   * @param {Object} uNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astUnaryExpression(uNode, retArr) {
    const unaryResult = this.checkAndUpconvertBitwiseUnary(uNode, retArr);
    if (unaryResult) {
      return retArr;
    }

    if (uNode.prefix) {
      retArr.push(uNode.operator);
      this.astGeneric(uNode.argument, retArr);
    } else {
      this.astGeneric(uNode.argument, retArr);
      retArr.push(uNode.operator);
    }

    return retArr;
  }

  checkAndUpconvertBitwiseUnary(uNode, retArr) {}

  /**
   * @desc Parses the abstract syntax tree for *Update* Expression
   * @param {Object} uNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astUpdateExpression(uNode, retArr) {
    if (uNode.prefix) {
      retArr.push(uNode.operator);
      this.astGeneric(uNode.argument, retArr);
    } else {
      this.astGeneric(uNode.argument, retArr);
      retArr.push(uNode.operator);
    }

    return retArr;
  }
  /**
   * @desc Parses the abstract syntax tree for *Logical* Expression
   * @param {Object} logNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astLogicalExpression(logNode, retArr) {
    retArr.push('(');
    this.astGeneric(logNode.left, retArr);
    retArr.push(logNode.operator);
    this.astGeneric(logNode.right, retArr);
    retArr.push(')');
    return retArr;
  }
  astMemberExpression(ast, retArr) {
    return retArr;
  }
  astCallExpression(ast, retArr) {
    return retArr;
  }
  astArrayExpression(ast, retArr) {
    return retArr;
  }

  /**
   *
   * @param ast
   * @return {IFunctionNodeMemberExpressionDetails}
   */
  getMemberExpressionDetails(ast) {
    if (ast.type !== 'MemberExpression') {
      throw this.astErrorOutput(`Expression ${ ast.type } not a MemberExpression`, ast);
    }
    let name = null;
    let type = null;
    const variableSignature = this.getVariableSignature(ast);
    switch (variableSignature) {
      case 'value':
        return null;
      case 'value.thread.value':
      case 'this.thread.value':
      case 'this.output.value':
        return {
          signature: variableSignature,
            type: 'Integer',
            name: ast.property.name
        };
      case 'value[]':
        if (typeof ast.object.name !== 'string') {
          throw this.astErrorOutput('Unexpected expression', ast);
        }
        name = ast.object.name;
        return {
          name,
          origin: 'user',
            signature: variableSignature,
            type: this.getVariableType(ast.object),
            xProperty: ast.property
        };
      case 'value[][]':
        if (typeof ast.object.object.name !== 'string') {
          throw this.astErrorOutput('Unexpected expression', ast);
        }
        name = ast.object.object.name;
        return {
          name,
          origin: 'user',
            signature: variableSignature,
            type: this.getVariableType(ast.object.object),
            yProperty: ast.object.property,
            xProperty: ast.property,
        };
      case 'value[][][]':
        if (typeof ast.object.object.object.name !== 'string') {
          throw this.astErrorOutput('Unexpected expression', ast);
        }
        name = ast.object.object.object.name;
        return {
          name,
          origin: 'user',
            signature: variableSignature,
            type: this.getVariableType(ast.object.object.object),
            zProperty: ast.object.object.property,
            yProperty: ast.object.property,
            xProperty: ast.property,
        };
      case 'value[][][][]':
        if (typeof ast.object.object.object.object.name !== 'string') {
          throw this.astErrorOutput('Unexpected expression', ast);
        }
        name = ast.object.object.object.object.name;
        return {
          name,
          origin: 'user',
            signature: variableSignature,
            type: this.getVariableType(ast.object.object.object.object),
            zProperty: ast.object.object.property,
            yProperty: ast.object.property,
            xProperty: ast.property,
        };
      case 'value.value':
        if (typeof ast.property.name !== 'string') {
          throw this.astErrorOutput('Unexpected expression', ast);
        }
        if (this.isAstMathVariable(ast)) {
          name = ast.property.name;
          return {
            name,
            origin: 'Math',
            type: 'Number',
            signature: variableSignature,
          };
        }
        switch (ast.property.name) {
          case 'r':
          case 'g':
          case 'b':
          case 'a':
            name = ast.object.name;
            return {
              name,
              property: ast.property.name,
                origin: 'user',
                signature: variableSignature,
                type: 'Number'
            };
          default:
            throw this.astErrorOutput('Unexpected expression', ast);
        }
        case 'this.constants.value':
          if (typeof ast.property.name !== 'string') {
            throw this.astErrorOutput('Unexpected expression', ast);
          }
          name = ast.property.name;
          type = this.getConstantType(name);
          if (!type) {
            throw this.astErrorOutput('Constant has no type', ast);
          }
          return {
            name,
            type,
            origin: 'constants',
              signature: variableSignature,
          };
        case 'this.constants.value[]':
          if (typeof ast.object.property.name !== 'string') {
            throw this.astErrorOutput('Unexpected expression', ast);
          }
          name = ast.object.property.name;
          type = this.getConstantType(name);
          if (!type) {
            throw this.astErrorOutput('Constant has no type', ast);
          }
          return {
            name,
            type,
            origin: 'constants',
              signature: variableSignature,
              xProperty: ast.property,
          };
        case 'this.constants.value[][]': {
          if (typeof ast.object.object.property.name !== 'string') {
            throw this.astErrorOutput('Unexpected expression', ast);
          }
          name = ast.object.object.property.name;
          type = this.getConstantType(name);
          if (!type) {
            throw this.astErrorOutput('Constant has no type', ast);
          }
          return {
            name,
            type,
            origin: 'constants',
            signature: variableSignature,
            yProperty: ast.object.property,
            xProperty: ast.property,
          };
        }
        case 'this.constants.value[][][]': {
          if (typeof ast.object.object.object.property.name !== 'string') {
            throw this.astErrorOutput('Unexpected expression', ast);
          }
          name = ast.object.object.object.property.name;
          type = this.getConstantType(name);
          if (!type) {
            throw this.astErrorOutput('Constant has no type', ast);
          }
          return {
            name,
            type,
            origin: 'constants',
            signature: variableSignature,
            zProperty: ast.object.object.property,
            yProperty: ast.object.property,
            xProperty: ast.property,
          };
        }
        case 'fn()[]':
        case 'fn()[][]':
        case '[][]':
          return {
            signature: variableSignature,
              property: ast.property,
          };
        default:
          throw this.astErrorOutput('Unexpected expression', ast);
    }
  }

  findIdentifierOrigin(astToFind) {
    const stack = [this.ast];

    while (stack.length > 0) {
      const atNode = stack[0];
      if (atNode.type === 'VariableDeclarator' && atNode.id && atNode.id.name && atNode.id.name === astToFind.name) {
        return atNode;
      }
      stack.shift();
      if (atNode.argument) {
        stack.push(atNode.argument);
      } else if (atNode.body) {
        stack.push(atNode.body);
      } else if (atNode.declarations) {
        stack.push(atNode.declarations);
      } else if (Array.isArray(atNode)) {
        for (let i = 0; i < atNode.length; i++) {
          stack.push(atNode[i]);
        }
      }
    }
    return null;
  }

  findLastReturn(ast) {
    const stack = [ast || this.ast];

    while (stack.length > 0) {
      const atNode = stack.pop();
      if (atNode.type === 'ReturnStatement') {
        return atNode;
      }
      if (atNode.type === 'FunctionDeclaration') {
        continue;
      }
      if (atNode.argument) {
        stack.push(atNode.argument);
      } else if (atNode.body) {
        stack.push(atNode.body);
      } else if (atNode.declarations) {
        stack.push(atNode.declarations);
      } else if (Array.isArray(atNode)) {
        for (let i = 0; i < atNode.length; i++) {
          stack.push(atNode[i]);
        }
      } else if (atNode.consequent) {
        stack.push(atNode.consequent);
      } else if (atNode.cases) {
        stack.push(atNode.cases);
      }
    }
    return null;
  }

  getInternalVariableName(name) {
    if (!this._internalVariableNames.hasOwnProperty(name)) {
      this._internalVariableNames[name] = 0;
    }
    this._internalVariableNames[name]++;
    if (this._internalVariableNames[name] === 1) {
      return name;
    }
    return name + this._internalVariableNames[name];
  }

  astKey(ast, separator = ',') {
    if (!ast.start || !ast.end) throw new Error('AST start and end needed');
    return `${ast.start}${separator}${ast.end}`;
  }
}

const typeLookupMap = {
  'Number': 'Number',
  'Float': 'Float',
  'Integer': 'Integer',
  'Array': 'Number',
  'Array(2)': 'Number',
  'Array(3)': 'Number',
  'Array(4)': 'Number',
  'Matrix(2)': 'Number',
  'Matrix(3)': 'Number',
  'Matrix(4)': 'Number',
  'Array2D': 'Number',
  'Array3D': 'Number',
  'Input': 'Number',
  'HTMLCanvas': 'Array(4)',
  'OffscreenCanvas': 'Array(4)',
  'HTMLImage': 'Array(4)',
  'ImageBitmap': 'Array(4)',
  'ImageData': 'Array(4)',
  'HTMLVideo': 'Array(4)',
  'HTMLImageArray': 'Array(4)',
  'NumberTexture': 'Number',
  'MemoryOptimizedNumberTexture': 'Number',
  'Array1D(2)': 'Array(2)',
  'Array1D(3)': 'Array(3)',
  'Array1D(4)': 'Array(4)',
  'Array2D(2)': 'Array(2)',
  'Array2D(3)': 'Array(3)',
  'Array2D(4)': 'Array(4)',
  'Array3D(2)': 'Array(2)',
  'Array3D(3)': 'Array(3)',
  'Array3D(4)': 'Array(4)',
  'ArrayTexture(1)': 'Number',
  'ArrayTexture(2)': 'Array(2)',
  'ArrayTexture(3)': 'Array(3)',
  'ArrayTexture(4)': 'Array(4)',
};

module.exports = {
  FunctionNode
};

/***/ }),

/***/ "./src/backend/function-tracer.js":
/*!****************************************!*\
  !*** ./src/backend/function-tracer.js ***!
  \****************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../utils */ "./src/utils.js");

function last(array) {
  return array.length > 0 ? array[array.length - 1] : null;
}

const states = {
  trackIdentifiers: 'trackIdentifiers',
  memberExpression: 'memberExpression',
  inForLoopInit: 'inForLoopInit'
};

class FunctionTracer {
  constructor(ast) {
    this.runningContexts = [];
    this.functionContexts = [];
    this.contexts = [];
    this.functionCalls = [];
    /**
     *
     * @type {IDeclaration[]}
     */
    this.declarations = [];
    this.identifiers = [];
    this.functions = [];
    this.returnStatements = [];
    this.trackedIdentifiers = null;
    this.states = [];
    this.newFunctionContext();
    this.scan(ast);
  }

  isState(state) {
    return this.states[this.states.length - 1] === state;
  }

  hasState(state) {
    return this.states.indexOf(state) > -1;
  }

  pushState(state) {
    this.states.push(state);
  }

  popState(state) {
    if (this.isState(state)) {
      this.states.pop();
    } else {
      throw new Error(`Cannot pop the non-active state "${state}"`);
    }
  }

  get currentFunctionContext() {
    return last(this.functionContexts);
  }

  get currentContext() {
    return last(this.runningContexts);
  }

  newFunctionContext() {
    const newContext = { '@contextType': 'function' };
    this.contexts.push(newContext);
    this.functionContexts.push(newContext);
  }

  newContext(run) {
    const newContext = Object.assign({ '@contextType': 'const/let' }, this.currentContext);
    this.contexts.push(newContext);
    this.runningContexts.push(newContext);
    run();
    const { currentFunctionContext } = this;
    for (const p in currentFunctionContext) {
      if (!currentFunctionContext.hasOwnProperty(p) || newContext.hasOwnProperty(p)) continue;
      newContext[p] = currentFunctionContext[p];
    }
    this.runningContexts.pop();
    return newContext;
  }

  useFunctionContext(run) {
    const functionContext = last(this.functionContexts);
    this.runningContexts.push(functionContext);
    run();
    this.runningContexts.pop();
  }

  getIdentifiers(run) {
    const trackedIdentifiers = this.trackedIdentifiers = [];
    this.pushState(states.trackIdentifiers);
    run();
    this.trackedIdentifiers = null;
    this.popState(states.trackIdentifiers);
    return trackedIdentifiers;
  }

  /**
   * @param {string} name
   * @returns {IDeclaration}
   */
  getDeclaration(name) {
    const { currentContext, currentFunctionContext, runningContexts } = this;
    const declaration = currentContext[name] || currentFunctionContext[name] || null;

    if (
      !declaration &&
      currentContext === currentFunctionContext &&
      runningContexts.length > 0
    ) {
      const previousRunningContext = runningContexts[runningContexts.length - 2];
      if (previousRunningContext[name]) {
        return previousRunningContext[name];
      }
    }

    return declaration;
  }

  /**
   * Recursively scans AST for declarations and functions, and add them to their respective context
   * @param ast
   */
  scan(ast) {
    if (!ast) return;
    if (Array.isArray(ast)) {
      for (let i = 0; i < ast.length; i++) {
        this.scan(ast[i]);
      }
      return;
    }
    switch (ast.type) {
      case 'Program':
        this.useFunctionContext(() => {
          this.scan(ast.body);
        });
        break;
      case 'BlockStatement':
        this.newContext(() => {
          this.scan(ast.body);
        });
        break;
      case 'AssignmentExpression':
      case 'LogicalExpression':
        this.scan(ast.left);
        this.scan(ast.right);
        break;
      case 'BinaryExpression':
        this.scan(ast.left);
        this.scan(ast.right);
        break;
      case 'UpdateExpression':
        if (ast.operator === '++') {
          const declaration = this.getDeclaration(ast.argument.name);
          if (declaration) {
            declaration.suggestedType = 'Integer';
          }
        }
        this.scan(ast.argument);
        break;
      case 'UnaryExpression':
        this.scan(ast.argument);
        break;
      case 'VariableDeclaration':
        if (ast.kind === 'var') {
          this.useFunctionContext(() => {
            ast.declarations = utils.normalizeDeclarations(ast);
            this.scan(ast.declarations);
          });
        } else {
          ast.declarations = utils.normalizeDeclarations(ast);
          this.scan(ast.declarations);
        }
        break;
      case 'VariableDeclarator': {
        const { currentContext } = this;
        const inForLoopInit = this.hasState(states.inForLoopInit);
        const declaration = {
          ast: ast,
          context: currentContext,
          name: ast.id.name,
          origin: 'declaration',
          inForLoopInit,
          inForLoopTest: null,
          assignable: currentContext === this.currentFunctionContext || (!inForLoopInit && !currentContext.hasOwnProperty(ast.id.name)),
          suggestedType: null,
          valueType: null,
          dependencies: null,
          isSafe: null,
        };
        if (!currentContext[ast.id.name]) {
          currentContext[ast.id.name] = declaration;
        }
        this.declarations.push(declaration);
        this.scan(ast.id);
        this.scan(ast.init);
        break;
      }
      case 'FunctionExpression':
      case 'FunctionDeclaration':
        if (this.runningContexts.length === 0) {
          this.scan(ast.body);
        } else {
          this.functions.push(ast);
        }
        break;
      case 'IfStatement':
        this.scan(ast.test);
        this.scan(ast.consequent);
        if (ast.alternate) this.scan(ast.alternate);
        break;
      case 'ForStatement': {
        let testIdentifiers;
        const context = this.newContext(() => {
          this.pushState(states.inForLoopInit);
          this.scan(ast.init);
          this.popState(states.inForLoopInit);

          testIdentifiers = this.getIdentifiers(() => {
            this.scan(ast.test);
          });

          this.scan(ast.update);
          this.newContext(() => {
            this.scan(ast.body);
          });
        });

        if (testIdentifiers) {
          for (const p in context) {
            if (p === '@contextType') continue;
            if (testIdentifiers.indexOf(p) > -1) {
              context[p].inForLoopTest = true;
            }
          }
        }
        break;
      }
      case 'DoWhileStatement':
      case 'WhileStatement':
        this.newContext(() => {
          this.scan(ast.body);
          this.scan(ast.test);
        });
        break;
      case 'Identifier': {
        if (this.isState(states.trackIdentifiers)) {
          this.trackedIdentifiers.push(ast.name);
        }
        this.identifiers.push({
          context: this.currentContext,
          declaration: this.getDeclaration(ast.name),
          ast,
        });
        break;
      }
      case 'ReturnStatement':
        this.returnStatements.push(ast);
        this.scan(ast.argument);
        break;
      case 'MemberExpression':
        this.pushState(states.memberExpression);
        this.scan(ast.object);
        this.scan(ast.property);
        this.popState(states.memberExpression);
        break;
      case 'ExpressionStatement':
        this.scan(ast.expression);
        break;
      case 'SequenceExpression':
        this.scan(ast.expressions);
        break;
      case 'CallExpression':
        this.functionCalls.push({
          context: this.currentContext,
          ast,
        });
        this.scan(ast.arguments);
        break;
      case 'ArrayExpression':
        this.scan(ast.elements);
        break;
      case 'ConditionalExpression':
        this.scan(ast.test);
        this.scan(ast.alternate);
        this.scan(ast.consequent);
        break;
      case 'SwitchStatement':
        this.scan(ast.discriminant);
        this.scan(ast.cases);
        break;
      case 'SwitchCase':
        this.scan(ast.test);
        this.scan(ast.consequent);
        break;

      case 'ThisExpression':
      case 'Literal':
      case 'DebuggerStatement':
      case 'EmptyStatement':
      case 'BreakStatement':
      case 'ContinueStatement':
        break;
      default:
        throw new Error(`unhandled type "${ast.type}"`);
    }
  }
}

module.exports = {
  FunctionTracer,
};

/***/ }),

/***/ "./src/backend/gl/kernel-string.js":
/*!*****************************************!*\
  !*** ./src/backend/gl/kernel-string.js ***!
  \*****************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { glWiretap } = __webpack_require__(/*! gl-wiretap */ "./node_modules/gl-wiretap/index.js");
const { utils } = __webpack_require__(/*! ../../utils */ "./src/utils.js");

function toStringWithoutUtils(fn) {
  return fn.toString()
    .replace('=>', '')
    .replace(/^function /, '')
    .replace(/utils[.]/g, '/*utils.*/');
}

/**
 *
 * @param {GLKernel} Kernel
 * @param {KernelVariable[]} args
 * @param {Kernel} originKernel
 * @param {string} [setupContextString]
 * @param {string} [destroyContextString]
 * @returns {string}
 */
function glKernelString(Kernel, args, originKernel, setupContextString, destroyContextString) {
  if (!originKernel.built) {
    originKernel.build.apply(originKernel, args);
  }
  args = args ? Array.from(args).map(arg => {
    switch (typeof arg) {
      case 'boolean':
        return new Boolean(arg);
      case 'number':
        return new Number(arg);
      default:
        return arg;
    }
  }) : null;
  const uploadedValues = [];
  const postResult = [];
  const context = glWiretap(originKernel.context, {
    useTrackablePrimitives: true,
    onReadPixels: (targetName) => {
      if (kernel.subKernels) {
        if (!subKernelsResultVariableSetup) {
          postResult.push(`    const result = { result: ${getRenderString(targetName, kernel)} };`);
          subKernelsResultVariableSetup = true;
        } else {
          const property = kernel.subKernels[subKernelsResultIndex++].property;
          postResult.push(`    result${isNaN(property) ? '.' + property : `[${property}]`} = ${getRenderString(targetName, kernel)};`);
        }
        if (subKernelsResultIndex === kernel.subKernels.length) {
          postResult.push('    return result;');
        }
        return;
      }
      if (targetName) {
        postResult.push(`    return ${getRenderString(targetName, kernel)};`);
      } else {
        postResult.push(`    return null;`);
      }
    },
    onUnrecognizedArgumentLookup: (argument) => {
      const argumentName = findKernelValue(argument, kernel.kernelArguments, [], context, uploadedValues);
      if (argumentName) {
        return argumentName;
      }
      const constantName = findKernelValue(argument, kernel.kernelConstants, constants ? Object.keys(constants).map(key => constants[key]) : [], context, uploadedValues);
      if (constantName) {
        return constantName;
      }
      return null;
    }
  });
  let subKernelsResultVariableSetup = false;
  let subKernelsResultIndex = 0;
  const {
    source,
    canvas,
    output,
    pipeline,
    graphical,
    loopMaxIterations,
    constants,
    optimizeFloatMemory,
    precision,
    fixIntegerDivisionAccuracy,
    functions,
    nativeFunctions,
    subKernels,
    immutable,
    argumentTypes,
    constantTypes,
    kernelArguments,
    kernelConstants,
    tactic,
  } = originKernel;
  const kernel = new Kernel(source, {
    canvas,
    context,
    checkContext: false,
    output,
    pipeline,
    graphical,
    loopMaxIterations,
    constants,
    optimizeFloatMemory,
    precision,
    fixIntegerDivisionAccuracy,
    functions,
    nativeFunctions,
    subKernels,
    immutable,
    argumentTypes,
    constantTypes,
    tactic,
  });
  let result = [];
  context.setIndent(2);
  kernel.build.apply(kernel, args);
  result.push(context.toString());
  context.reset();

  kernel.kernelArguments.forEach((kernelArgument, i) => {
    switch (kernelArgument.type) {
      // primitives
      case 'Integer':
      case 'Boolean':
      case 'Number':
      case 'Float':
        // non-primitives
      case 'Array':
      case 'Array(2)':
      case 'Array(3)':
      case 'Array(4)':
      case 'HTMLCanvas':
      case 'HTMLImage':
      case 'HTMLVideo':
        context.insertVariable(`uploadValue_${kernelArgument.name}`, kernelArgument.uploadValue);
        break;
      case 'HTMLImageArray':
        for (let imageIndex = 0; imageIndex < args[i].length; imageIndex++) {
          const arg = args[i];
          context.insertVariable(`uploadValue_${kernelArgument.name}[${imageIndex}]`, arg[imageIndex]);
        }
        break;
      case 'Input':
        context.insertVariable(`uploadValue_${kernelArgument.name}`, kernelArgument.uploadValue);
        break;
      case 'MemoryOptimizedNumberTexture':
      case 'NumberTexture':
      case 'Array1D(2)':
      case 'Array1D(3)':
      case 'Array1D(4)':
      case 'Array2D(2)':
      case 'Array2D(3)':
      case 'Array2D(4)':
      case 'Array3D(2)':
      case 'Array3D(3)':
      case 'Array3D(4)':
      case 'ArrayTexture(1)':
      case 'ArrayTexture(2)':
      case 'ArrayTexture(3)':
      case 'ArrayTexture(4)':
        context.insertVariable(`uploadValue_${kernelArgument.name}`, args[i].texture);
        break;
      default:
        throw new Error(`unhandled kernelArgumentType insertion for glWiretap of type ${kernelArgument.type}`);
    }
  });
  result.push('/** start of injected functions **/');
  result.push(`function ${toStringWithoutUtils(utils.flattenTo)}`);
  result.push(`function ${toStringWithoutUtils(utils.flatten2dArrayTo)}`);
  result.push(`function ${toStringWithoutUtils(utils.flatten3dArrayTo)}`);
  result.push(`function ${toStringWithoutUtils(utils.flatten4dArrayTo)}`);
  result.push(`function ${toStringWithoutUtils(utils.isArray)}`);
  if (kernel.renderOutput !== kernel.renderTexture && kernel.formatValues) {
    result.push(
      `  const renderOutput = function ${toStringWithoutUtils(kernel.formatValues)};`
    );
  }
  result.push('/** end of injected functions **/');
  result.push(`  const innerKernel = function (${kernel.kernelArguments.map(kernelArgument => kernelArgument.varName).join(', ')}) {`);
  context.setIndent(4);
  kernel.run.apply(kernel, args);
  if (kernel.renderKernels) {
    kernel.renderKernels();
  } else if (kernel.renderOutput) {
    kernel.renderOutput();
  }
  result.push('    /** start setup uploads for kernel values **/');
  kernel.kernelArguments.forEach(kernelArgument => {
    result.push('    ' + kernelArgument.getStringValueHandler().split('\n').join('\n    '));
  });
  result.push('    /** end setup uploads for kernel values **/');
  result.push(context.toString());
  if (kernel.renderOutput === kernel.renderTexture) {
    context.reset();
    const framebufferName = context.getContextVariableName(kernel.framebuffer);
    if (kernel.renderKernels) {
      const results = kernel.renderKernels();
      const textureName = context.getContextVariableName(kernel.texture.texture);
      result.push(`    return {
      result: {
        texture: ${ textureName },
        type: '${ results.result.type }',
        toArray: ${ getToArrayString(results.result, textureName, framebufferName) }
      },`);
      const { subKernels, mappedTextures } = kernel;
      for (let i = 0; i < subKernels.length; i++) {
        const texture = mappedTextures[i];
        const subKernel = subKernels[i];
        const subKernelResult = results[subKernel.property];
        const subKernelTextureName = context.getContextVariableName(texture.texture);
        result.push(`
      ${subKernel.property}: {
        texture: ${ subKernelTextureName },
        type: '${ subKernelResult.type }',
        toArray: ${ getToArrayString(subKernelResult, subKernelTextureName, framebufferName) }
      },`);
      }
      result.push(`    };`);
    } else {
      const rendered = kernel.renderOutput();
      const textureName = context.getContextVariableName(kernel.texture.texture);
      result.push(`    return {
        texture: ${ textureName },
        type: '${ rendered.type }',
        toArray: ${ getToArrayString(rendered, textureName, framebufferName) }
      };`);
    }
  }
  result.push(`    ${destroyContextString ? '\n' + destroyContextString + '    ': ''}`);
  result.push(postResult.join('\n'));
  result.push('  };');
  if (kernel.graphical) {
    result.push(getGetPixelsString(kernel));
    result.push(`  innerKernel.getPixels = getPixels;`);
  }
  result.push('  return innerKernel;');

  let constantsUpload = [];
  kernelConstants.forEach((kernelConstant) => {
    constantsUpload.push(`${kernelConstant.getStringValueHandler()}`);
  });
  return `function kernel(settings) {
  const { context, constants } = settings;
  ${constantsUpload.join('')}
  ${setupContextString ? setupContextString : ''}
${result.join('\n')}
}`;
}

function getRenderString(targetName, kernel) {
  const readBackValue = kernel.precision === 'single' ? targetName : `new Float32Array(${targetName}.buffer)`;
  if (kernel.output[2]) {
    return `renderOutput(${readBackValue}, ${kernel.output[0]}, ${kernel.output[1]}, ${kernel.output[2]})`;
  }
  if (kernel.output[1]) {
    return `renderOutput(${readBackValue}, ${kernel.output[0]}, ${kernel.output[1]})`;
  }

  return `renderOutput(${readBackValue}, ${kernel.output[0]})`;
}

function getGetPixelsString(kernel) {
  const getPixels = kernel.getPixels.toString();
  const useFunctionKeyword = !/^function/.test(getPixels);
  return utils.flattenFunctionToString(`${useFunctionKeyword ? 'function ' : ''}${ getPixels }`, {
    findDependency: (object, name) => {
      if (object === 'utils') {
        return `const ${name} = ${utils[name].toString()};`;
      }
      return null;
    },
    thisLookup: (property) => {
      if (property === 'context') {
        return null;
      }
      if (kernel.hasOwnProperty(property)) {
        return JSON.stringify(kernel[property]);
      }
      throw new Error(`unhandled thisLookup ${ property }`);
    }
  });
}

function getToArrayString(kernelResult, textureName, framebufferName) {
  const toArray = kernelResult.toArray.toString();
  const useFunctionKeyword = !/^function/.test(toArray);
  const flattenedFunctions = utils.flattenFunctionToString(`${useFunctionKeyword ? 'function ' : ''}${ toArray }`, {
    findDependency: (object, name) => {
      if (object === 'utils') {
        return `const ${name} = ${utils[name].toString()};`;
      } else if (object === 'this') {
        if (name === 'framebuffer') {
          return '';
        }
        return `${useFunctionKeyword ? 'function ' : ''}${kernelResult[name].toString()}`;
      } else {
        throw new Error('unhandled fromObject');
      }
    },
    thisLookup: (property, isDeclaration) => {
      if (property === 'texture') {
        return textureName;
      }
      if (property === 'context') {
        if (isDeclaration) return null;
        return 'gl';
      }
      if (kernelResult.hasOwnProperty(property)) {
        return JSON.stringify(kernelResult[property]);
      }
      throw new Error(`unhandled thisLookup ${ property }`);
    }
  });
  return `() => {
  function framebuffer() { return ${framebufferName}; };
  ${flattenedFunctions}
  return toArray();
  }`;
}

/**
 *
 * @param {KernelVariable} argument
 * @param {KernelValue[]} kernelValues
 * @param {KernelVariable[]} values
 * @param context
 * @param {KernelVariable[]} uploadedValues
 * @return {string|null}
 */
function findKernelValue(argument, kernelValues, values, context, uploadedValues) {
  if (argument === null) return null;
  if (kernelValues === null) return null;
  switch (typeof argument) {
    case 'boolean':
    case 'number':
      return null;
  }
  if (
    typeof HTMLImageElement !== 'undefined' &&
    argument instanceof HTMLImageElement
  ) {
    for (let i = 0; i < kernelValues.length; i++) {
      const kernelValue = kernelValues[i];
      if (kernelValue.type !== 'HTMLImageArray' && kernelValue) continue;
      if (kernelValue.uploadValue !== argument) continue;
      // TODO: if we send two of the same image, the parser could get confused, and short circuit to the first, handle that here
      const variableIndex = values[i].indexOf(argument);
      if (variableIndex === -1) continue;
      const variableName = `uploadValue_${kernelValue.name}[${variableIndex}]`;
      context.insertVariable(variableName, argument);
      return variableName;
    }
  }

  for (let i = 0; i < kernelValues.length; i++) {
    const kernelValue = kernelValues[i];
    if (argument !== kernelValue.uploadValue) continue;
    const variable = `uploadValue_${kernelValue.name}`;
    context.insertVariable(variable, kernelValue);
    return variable;
  }
  return null;
}

module.exports = {
  glKernelString
};

/***/ }),

/***/ "./src/backend/gl/kernel.js":
/*!**********************************!*\
  !*** ./src/backend/gl/kernel.js ***!
  \**********************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { Kernel } = __webpack_require__(/*! ../kernel */ "./src/backend/kernel.js");
const { utils } = __webpack_require__(/*! ../../utils */ "./src/utils.js");
const { GLTextureArray2Float } = __webpack_require__(/*! ./texture/array-2-float */ "./src/backend/gl/texture/array-2-float.js");
const { GLTextureArray2Float2D } = __webpack_require__(/*! ./texture/array-2-float-2d */ "./src/backend/gl/texture/array-2-float-2d.js");
const { GLTextureArray2Float3D } = __webpack_require__(/*! ./texture/array-2-float-3d */ "./src/backend/gl/texture/array-2-float-3d.js");
const { GLTextureArray3Float } = __webpack_require__(/*! ./texture/array-3-float */ "./src/backend/gl/texture/array-3-float.js");
const { GLTextureArray3Float2D } = __webpack_require__(/*! ./texture/array-3-float-2d */ "./src/backend/gl/texture/array-3-float-2d.js");
const { GLTextureArray3Float3D } = __webpack_require__(/*! ./texture/array-3-float-3d */ "./src/backend/gl/texture/array-3-float-3d.js");
const { GLTextureArray4Float } = __webpack_require__(/*! ./texture/array-4-float */ "./src/backend/gl/texture/array-4-float.js");
const { GLTextureArray4Float2D } = __webpack_require__(/*! ./texture/array-4-float-2d */ "./src/backend/gl/texture/array-4-float-2d.js");
const { GLTextureArray4Float3D } = __webpack_require__(/*! ./texture/array-4-float-3d */ "./src/backend/gl/texture/array-4-float-3d.js");
const { GLTextureFloat } = __webpack_require__(/*! ./texture/float */ "./src/backend/gl/texture/float.js");
const { GLTextureFloat2D } = __webpack_require__(/*! ./texture/float-2d */ "./src/backend/gl/texture/float-2d.js");
const { GLTextureFloat3D } = __webpack_require__(/*! ./texture/float-3d */ "./src/backend/gl/texture/float-3d.js");
const { GLTextureMemoryOptimized } = __webpack_require__(/*! ./texture/memory-optimized */ "./src/backend/gl/texture/memory-optimized.js");
const { GLTextureMemoryOptimized2D } = __webpack_require__(/*! ./texture/memory-optimized-2d */ "./src/backend/gl/texture/memory-optimized-2d.js");
const { GLTextureMemoryOptimized3D } = __webpack_require__(/*! ./texture/memory-optimized-3d */ "./src/backend/gl/texture/memory-optimized-3d.js");
const { GLTextureUnsigned } = __webpack_require__(/*! ./texture/unsigned */ "./src/backend/gl/texture/unsigned.js");
const { GLTextureUnsigned2D } = __webpack_require__(/*! ./texture/unsigned-2d */ "./src/backend/gl/texture/unsigned-2d.js");
const { GLTextureUnsigned3D } = __webpack_require__(/*! ./texture/unsigned-3d */ "./src/backend/gl/texture/unsigned-3d.js");
const { GLTextureGraphical } = __webpack_require__(/*! ./texture/graphical */ "./src/backend/gl/texture/graphical.js");

/**
 * @abstract
 * @extends Kernel
 */
class GLKernel extends Kernel {
  static get mode() {
    return 'gpu';
  }

  static getIsFloatRead() {
    const kernelString = `function kernelFunction() {
      return 1;
    }`;
    const kernel = new this(kernelString, {
      context: this.testContext,
      canvas: this.testCanvas,
      validate: false,
      output: [1],
      precision: 'single',
      returnType: 'Number',
      tactic: 'speed',
    });
    kernel.build();
    kernel.run();
    const result = kernel.renderOutput();
    kernel.destroy(true);
    return result[0] === 1;
  }

  static getIsIntegerDivisionAccurate() {
    function kernelFunction(v1, v2) {
      return v1[this.thread.x] / v2[this.thread.x];
    }
    const kernel = new this(kernelFunction.toString(), {
      context: this.testContext,
      canvas: this.testCanvas,
      validate: false,
      output: [2],
      returnType: 'Number',
      precision: 'unsigned',
      tactic: 'speed',
    });
    const args = [
      [6, 6030401],
      [3, 3991]
    ];
    kernel.build.apply(kernel, args);
    kernel.run.apply(kernel, args);
    const result = kernel.renderOutput();
    kernel.destroy(true);
    // have we not got whole numbers for 6/3 or 6030401/3991
    // add more here if others see this problem
    return result[0] === 2 && result[1] === 1511;
  }

  static getIsSpeedTacticSupported() {
    function kernelFunction(value) {
      return value[this.thread.x];
    }
    const kernel = new this(kernelFunction.toString(), {
      context: this.testContext,
      canvas: this.testCanvas,
      validate: false,
      output: [4],
      returnType: 'Number',
      precision: 'unsigned',
      tactic: 'speed',
    });
    const args = [
      [0, 1, 2, 3]
    ];
    kernel.build.apply(kernel, args);
    kernel.run.apply(kernel, args);
    const result = kernel.renderOutput();
    kernel.destroy(true);
    return Math.round(result[0]) === 0 && Math.round(result[1]) === 1 && Math.round(result[2]) === 2 && Math.round(result[3]) === 3;
  }

  /**
   * @abstract
   */
  static get testCanvas() {
    throw new Error(`"testCanvas" not defined on ${ this.name }`);
  }

  /**
   * @abstract
   */
  static get testContext() {
    throw new Error(`"testContext" not defined on ${ this.name }`);
  }

  static getFeatures() {
    const gl = this.testContext;
    const isDrawBuffers = this.getIsDrawBuffers();
    return Object.freeze({
      isFloatRead: this.getIsFloatRead(),
      isIntegerDivisionAccurate: this.getIsIntegerDivisionAccurate(),
      isSpeedTacticSupported: this.getIsSpeedTacticSupported(),
      isTextureFloat: this.getIsTextureFloat(),
      isDrawBuffers,
      kernelMap: isDrawBuffers,
      channelCount: this.getChannelCount(),
      maxTextureSize: this.getMaxTextureSize(),
      lowIntPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.LOW_INT),
      lowFloatPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.LOW_FLOAT),
      mediumIntPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_INT),
      mediumFloatPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT),
      highIntPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_INT),
      highFloatPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT),
    });
  }

  /**
   * @abstract
   */
  static setupFeatureChecks() {
    throw new Error(`"setupFeatureChecks" not defined on ${ this.name }`);
  }

  static getSignature(kernel, argumentTypes) {
    return kernel.getVariablePrecisionString() + (argumentTypes.length > 0 ? ':' + argumentTypes.join(',') : '');
  }

  /**
   * @desc Fix division by factor of 3 FP accuracy bug
   * @param {Boolean} fix - should fix
   */
  setFixIntegerDivisionAccuracy(fix) {
    this.fixIntegerDivisionAccuracy = fix;
    return this;
  }

  /**
   * @desc Toggle output mode
   * @param {String} flag - 'single' or 'unsigned'
   */
  setPrecision(flag) {
    this.precision = flag;
    return this;
  }

  /**
   * @desc Toggle texture output mode
   * @param {Boolean} flag - true to enable floatTextures
   * @deprecated
   */
  setFloatTextures(flag) {
    utils.warnDeprecated('method', 'setFloatTextures', 'setOptimizeFloatMemory');
    this.floatTextures = flag;
    return this;
  }

  /**
   * A highly readable very forgiving micro-parser for a glsl function that gets argument types
   * @param {String} source
   * @returns {{argumentTypes: String[], argumentNames: String[]}}
   */
  static nativeFunctionArguments(source) {
    const argumentTypes = [];
    const argumentNames = [];
    const states = [];
    const isStartingVariableName = /^[a-zA-Z_]/;
    const isVariableChar = /[a-zA-Z_0-9]/;
    let i = 0;
    let argumentName = null;
    let argumentType = null;
    while (i < source.length) {
      const char = source[i];
      const nextChar = source[i + 1];
      const state = states.length > 0 ? states[states.length - 1] : null;

      // begin MULTI_LINE_COMMENT handling
      if (state === 'FUNCTION_ARGUMENTS' && char === '/' && nextChar === '*') {
        states.push('MULTI_LINE_COMMENT');
        i += 2;
        continue;
      } else if (state === 'MULTI_LINE_COMMENT' && char === '*' && nextChar === '/') {
        states.pop();
        i += 2;
        continue;
      }
      // end MULTI_LINE_COMMENT handling

      // begin COMMENT handling
      else if (state === 'FUNCTION_ARGUMENTS' && char === '/' && nextChar === '/') {
        states.push('COMMENT');
        i += 2;
        continue;
      } else if (state === 'COMMENT' && char === '\n') {
        states.pop();
        i++;
        continue;
      }
      // end COMMENT handling

      // being FUNCTION_ARGUMENTS handling
      else if (state === null && char === '(') {
        states.push('FUNCTION_ARGUMENTS');
        i++;
        continue;
      } else if (state === 'FUNCTION_ARGUMENTS') {
        if (char === ')') {
          states.pop();
          break;
        }
        if (char === 'f' && nextChar === 'l' && source[i + 2] === 'o' && source[i + 3] === 'a' && source[i + 4] === 't' && source[i + 5] === ' ') {
          states.push('DECLARE_VARIABLE');
          argumentType = 'float';
          argumentName = '';
          i += 6;
          continue;
        } else if (char === 'i' && nextChar === 'n' && source[i + 2] === 't' && source[i + 3] === ' ') {
          states.push('DECLARE_VARIABLE');
          argumentType = 'int';
          argumentName = '';
          i += 4;
          continue;
        } else if (char === 'v' && nextChar === 'e' && source[i + 2] === 'c' && source[i + 3] === '2' && source[i + 4] === ' ') {
          states.push('DECLARE_VARIABLE');
          argumentType = 'vec2';
          argumentName = '';
          i += 5;
          continue;
        } else if (char === 'v' && nextChar === 'e' && source[i + 2] === 'c' && source[i + 3] === '3' && source[i + 4] === ' ') {
          states.push('DECLARE_VARIABLE');
          argumentType = 'vec3';
          argumentName = '';
          i += 5;
          continue;
        } else if (char === 'v' && nextChar === 'e' && source[i + 2] === 'c' && source[i + 3] === '4' && source[i + 4] === ' ') {
          states.push('DECLARE_VARIABLE');
          argumentType = 'vec4';
          argumentName = '';
          i += 5;
          continue;
        }
      }
      // end FUNCTION_ARGUMENTS handling

      // begin DECLARE_VARIABLE handling
      else if (state === 'DECLARE_VARIABLE') {
        if (argumentName === '') {
          if (char === ' ') {
            i++;
            continue;
          }
          if (!isStartingVariableName.test(char)) {
            throw new Error('variable name is not expected string');
          }
        }
        argumentName += char;
        if (!isVariableChar.test(nextChar)) {
          states.pop();
          argumentNames.push(argumentName);
          argumentTypes.push(typeMap[argumentType]);
        }
      }
      // end DECLARE_VARIABLE handling

      // Progress to next character
      i++;
    }
    if (states.length > 0) {
      throw new Error('GLSL function was not parsable');
    }
    return {
      argumentNames,
      argumentTypes,
    };
  }

  static nativeFunctionReturnType(source) {
    return typeMap[source.match(/int|float|vec[2-4]/)[0]];
  }

  static combineKernels(combinedKernel, lastKernel) {
    combinedKernel.apply(null, arguments);
    const {
      texSize,
      context,
      threadDim
    } = lastKernel.texSize;
    let result;
    if (lastKernel.precision === 'single') {
      const w = texSize[0];
      const h = Math.ceil(texSize[1] / 4);
      result = new Float32Array(w * h * 4 * 4);
      context.readPixels(0, 0, w, h * 4, context.RGBA, context.FLOAT, result);
    } else {
      const bytes = new Uint8Array(texSize[0] * texSize[1] * 4);
      context.readPixels(0, 0, texSize[0], texSize[1], context.RGBA, context.UNSIGNED_BYTE, bytes);
      result = new Float32Array(bytes.buffer);
    }

    result = result.subarray(0, threadDim[0] * threadDim[1] * threadDim[2]);

    if (lastKernel.output.length === 1) {
      return result;
    } else if (lastKernel.output.length === 2) {
      return utils.splitArray(result, lastKernel.output[0]);
    } else if (lastKernel.output.length === 3) {
      const cube = utils.splitArray(result, lastKernel.output[0] * lastKernel.output[1]);
      return cube.map(function(x) {
        return utils.splitArray(x, lastKernel.output[0]);
      });
    }
  }

  constructor(source, settings) {
    super(source, settings);
    this.transferValues = null;
    this.formatValues = null;
    /**
     *
     * @type {Texture}
     */
    this.TextureConstructor = null;
    this.renderOutput = null;
    this.renderRawOutput = null;
    this.texSize = null;
    this.translatedSource = null;
    this.compiledFragmentShader = null;
    this.compiledVertexShader = null;
    this.switchingKernels = null;
    this._textureSwitched = null;
    this._mappedTextureSwitched = null;
  }

  checkTextureSize() {
    const { features } = this.constructor;
    if (this.texSize[0] > features.maxTextureSize || this.texSize[1] > features.maxTextureSize) {
      throw new Error(`Texture size [${this.texSize[0]},${this.texSize[1]}] generated by kernel is larger than supported size [${features.maxTextureSize},${features.maxTextureSize}]`);
    }
  }

  translateSource() {
    throw new Error(`"translateSource" not defined on ${this.constructor.name}`);
  }

  /**
   * Picks a render strategy for the now finally parsed kernel
   * @param args
   * @return {null|KernelOutput}
   */
  pickRenderStrategy(args) {
    if (this.graphical) {
      this.renderRawOutput = this.readPackedPixelsToUint8Array;
      this.transferValues = (pixels) => pixels;
      this.TextureConstructor = GLTextureGraphical;
      return null;
    }
    if (this.precision === 'unsigned') {
      this.renderRawOutput = this.readPackedPixelsToUint8Array;
      this.transferValues = this.readPackedPixelsToFloat32Array;
      if (this.pipeline) {
        this.renderOutput = this.renderTexture;
        if (this.subKernels !== null) {
          this.renderKernels = this.renderKernelsToTextures;
        }
        switch (this.returnType) {
          case 'LiteralInteger':
          case 'Float':
          case 'Number':
          case 'Integer':
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureUnsigned3D;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureUnsigned2D;
              return null;
            } else {
              this.TextureConstructor = GLTextureUnsigned;
              return null;
            }
            case 'Array(2)':
            case 'Array(3)':
            case 'Array(4)':
              return this.requestFallback(args);
        }
      } else {
        if (this.subKernels !== null) {
          this.renderKernels = this.renderKernelsToArrays;
        }
        switch (this.returnType) {
          case 'LiteralInteger':
          case 'Float':
          case 'Number':
          case 'Integer':
            this.renderOutput = this.renderValues;
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureUnsigned3D;
              this.formatValues = utils.erect3DPackedFloat;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureUnsigned2D;
              this.formatValues = utils.erect2DPackedFloat;
              return null;
            } else {
              this.TextureConstructor = GLTextureUnsigned;
              this.formatValues = utils.erectPackedFloat;
              return null;
            }
            case 'Array(2)':
            case 'Array(3)':
            case 'Array(4)':
              return this.requestFallback(args);
        }
      }
    } else if (this.precision === 'single') {
      this.renderRawOutput = this.readFloatPixelsToFloat32Array;
      this.transferValues = this.readFloatPixelsToFloat32Array;
      if (this.pipeline) {
        this.renderOutput = this.renderTexture;
        if (this.subKernels !== null) {
          this.renderKernels = this.renderKernelsToTextures;
        }
        switch (this.returnType) {
          case 'LiteralInteger':
          case 'Float':
          case 'Number':
          case 'Integer': {
            if (this.optimizeFloatMemory) {
              if (this.output[2] > 0) {
                this.TextureConstructor = GLTextureMemoryOptimized3D;
                return null;
              } else if (this.output[1] > 0) {
                this.TextureConstructor = GLTextureMemoryOptimized2D;
                return null;
              } else {
                this.TextureConstructor = GLTextureMemoryOptimized;
                return null;
              }
            } else {
              if (this.output[2] > 0) {
                this.TextureConstructor = GLTextureFloat3D;
                return null;
              } else if (this.output[1] > 0) {
                this.TextureConstructor = GLTextureFloat2D;
                return null;
              } else {
                this.TextureConstructor = GLTextureFloat;
                return null;
              }
            }
          }
          case 'Array(2)': {
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray2Float3D;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray2Float2D;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray2Float;
              return null;
            }
          }
          case 'Array(3)': {
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray3Float3D;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray3Float2D;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray3Float;
              return null;
            }
          }
          case 'Array(4)': {
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray4Float3D;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray4Float2D;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray4Float;
              return null;
            }
          }
        }
      }
      this.renderOutput = this.renderValues;
      if (this.subKernels !== null) {
        this.renderKernels = this.renderKernelsToArrays;
      }
      if (this.optimizeFloatMemory) {
        switch (this.returnType) {
          case 'LiteralInteger':
          case 'Float':
          case 'Number':
          case 'Integer': {
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureMemoryOptimized3D;
              this.formatValues = utils.erectMemoryOptimized3DFloat;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureMemoryOptimized2D;
              this.formatValues = utils.erectMemoryOptimized2DFloat;
              return null;
            } else {
              this.TextureConstructor = GLTextureMemoryOptimized;
              this.formatValues = utils.erectMemoryOptimizedFloat;
              return null;
            }
          }
          case 'Array(2)': {
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray2Float3D;
              this.formatValues = utils.erect3DArray2;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray2Float2D;
              this.formatValues = utils.erect2DArray2;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray2Float;
              this.formatValues = utils.erectArray2;
              return null;
            }
          }
          case 'Array(3)': {
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray3Float3D;
              this.formatValues = utils.erect3DArray3;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray3Float2D;
              this.formatValues = utils.erect2DArray3;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray3Float;
              this.formatValues = utils.erectArray3;
              return null;
            }
          }
          case 'Array(4)': {
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray4Float3D;
              this.formatValues = utils.erect3DArray4;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray4Float2D;
              this.formatValues = utils.erect2DArray4;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray4Float;
              this.formatValues = utils.erectArray4;
              return null;
            }
          }
        }
      } else {
        switch (this.returnType) {
          case 'LiteralInteger':
          case 'Float':
          case 'Number':
          case 'Integer': {
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureFloat3D;
              this.formatValues = utils.erect3DFloat;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureFloat2D;
              this.formatValues = utils.erect2DFloat;
              return null;
            } else {
              this.TextureConstructor = GLTextureFloat;
              this.formatValues = utils.erectFloat;
              return null;
            }
          }
          case 'Array(2)': {
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray2Float3D;
              this.formatValues = utils.erect3DArray2;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray2Float2D;
              this.formatValues = utils.erect2DArray2;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray2Float;
              this.formatValues = utils.erectArray2;
              return null;
            }
          }
          case 'Array(3)': {
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray3Float3D;
              this.formatValues = utils.erect3DArray3;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray3Float2D;
              this.formatValues = utils.erect2DArray3;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray3Float;
              this.formatValues = utils.erectArray3;
              return null;
            }
          }
          case 'Array(4)': {
            if (this.output[2] > 0) {
              this.TextureConstructor = GLTextureArray4Float3D;
              this.formatValues = utils.erect3DArray4;
              return null;
            } else if (this.output[1] > 0) {
              this.TextureConstructor = GLTextureArray4Float2D;
              this.formatValues = utils.erect2DArray4;
              return null;
            } else {
              this.TextureConstructor = GLTextureArray4Float;
              this.formatValues = utils.erectArray4;
              return null;
            }
          }
        }
      }
    } else {
      throw new Error(`unhandled precision of "${this.precision}"`);
    }

    throw new Error(`unhandled return type "${this.returnType}"`);
  }

  /**
   * @abstract
   * @returns String
   */
  getKernelString() {
    throw new Error(`abstract method call`);
  }

  getMainResultTexture() {
    switch (this.returnType) {
      case 'LiteralInteger':
      case 'Float':
      case 'Integer':
      case 'Number':
        return this.getMainResultNumberTexture();
      case 'Array(2)':
        return this.getMainResultArray2Texture();
      case 'Array(3)':
        return this.getMainResultArray3Texture();
      case 'Array(4)':
        return this.getMainResultArray4Texture();
      default:
        throw new Error(`unhandled returnType type ${ this.returnType }`);
    }
  }

  /**
   * @abstract
   * @returns String[]
   */
  getMainResultKernelNumberTexture() {
    throw new Error(`abstract method call`);
  }
  /**
   * @abstract
   * @returns String[]
   */
  getMainResultSubKernelNumberTexture() {
    throw new Error(`abstract method call`);
  }
  /**
   * @abstract
   * @returns String[]
   */
  getMainResultKernelArray2Texture() {
    throw new Error(`abstract method call`);
  }
  /**
   * @abstract
   * @returns String[]
   */
  getMainResultSubKernelArray2Texture() {
    throw new Error(`abstract method call`);
  }
  /**
   * @abstract
   * @returns String[]
   */
  getMainResultKernelArray3Texture() {
    throw new Error(`abstract method call`);
  }
  /**
   * @abstract
   * @returns String[]
   */
  getMainResultSubKernelArray3Texture() {
    throw new Error(`abstract method call`);
  }
  /**
   * @abstract
   * @returns String[]
   */
  getMainResultKernelArray4Texture() {
    throw new Error(`abstract method call`);
  }
  /**
   * @abstract
   * @returns String[]
   */
  getMainResultSubKernelArray4Texture() {
    throw new Error(`abstract method call`);
  }
  /**
   * @abstract
   * @returns String[]
   */
  getMainResultGraphical() {
    throw new Error(`abstract method call`);
  }
  /**
   * @abstract
   * @returns String[]
   */
  getMainResultMemoryOptimizedFloats() {
    throw new Error(`abstract method call`);
  }
  /**
   * @abstract
   * @returns String[]
   */
  getMainResultPackedPixels() {
    throw new Error(`abstract method call`);
  }

  getMainResultString() {
    if (this.graphical) {
      return this.getMainResultGraphical();
    } else if (this.precision === 'single') {
      if (this.optimizeFloatMemory) {
        return this.getMainResultMemoryOptimizedFloats();
      }
      return this.getMainResultTexture();
    } else {
      return this.getMainResultPackedPixels();
    }
  }

  getMainResultNumberTexture() {
    return utils.linesToString(this.getMainResultKernelNumberTexture()) +
      utils.linesToString(this.getMainResultSubKernelNumberTexture());
  }

  getMainResultArray2Texture() {
    return utils.linesToString(this.getMainResultKernelArray2Texture()) +
      utils.linesToString(this.getMainResultSubKernelArray2Texture());
  }

  getMainResultArray3Texture() {
    return utils.linesToString(this.getMainResultKernelArray3Texture()) +
      utils.linesToString(this.getMainResultSubKernelArray3Texture());
  }

  getMainResultArray4Texture() {
    return utils.linesToString(this.getMainResultKernelArray4Texture()) +
      utils.linesToString(this.getMainResultSubKernelArray4Texture());
  }

  /**
   *
   * @return {string}
   */
  getFloatTacticDeclaration() {
    const variablePrecision = this.getVariablePrecisionString(this.texSize, this.tactic);
    return `precision ${variablePrecision} float;\n`;
  }

  /**
   *
   * @return {string}
   */
  getIntTacticDeclaration() {
    return `precision ${this.getVariablePrecisionString(this.texSize, this.tactic, true)} int;\n`;
  }

  /**
   *
   * @return {string}
   */
  getSampler2DTacticDeclaration() {
    return `precision ${this.getVariablePrecisionString(this.texSize, this.tactic)} sampler2D;\n`;
  }

  getSampler2DArrayTacticDeclaration() {
    return `precision ${this.getVariablePrecisionString(this.texSize, this.tactic)} sampler2DArray;\n`;
  }

  renderTexture() {
    return this.immutable ? this.texture.clone() : this.texture;
  }
  readPackedPixelsToUint8Array() {
    if (this.precision !== 'unsigned') throw new Error('Requires this.precision to be "unsigned"');
    const {
      texSize,
      context: gl
    } = this;
    const result = new Uint8Array(texSize[0] * texSize[1] * 4);
    gl.readPixels(0, 0, texSize[0], texSize[1], gl.RGBA, gl.UNSIGNED_BYTE, result);
    return result;
  }

  readPackedPixelsToFloat32Array() {
    return new Float32Array(this.readPackedPixelsToUint8Array().buffer);
  }

  readFloatPixelsToFloat32Array() {
    if (this.precision !== 'single') throw new Error('Requires this.precision to be "single"');
    const {
      texSize,
      context: gl
    } = this;
    const w = texSize[0];
    const h = texSize[1];
    const result = new Float32Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, result);
    return result;
  }

  /**
   *
   * @param {Boolean} [flip]
   * @return {Uint8ClampedArray}
   */
  getPixels(flip) {
    const {
      context: gl,
      output
    } = this;
    const [width, height] = output;
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    // flipped by default, so invert
    return new Uint8ClampedArray((flip ? pixels : utils.flipPixels(pixels, width, height)).buffer);
  }

  renderKernelsToArrays() {
    const result = {
      result: this.renderOutput(),
    };
    for (let i = 0; i < this.subKernels.length; i++) {
      result[this.subKernels[i].property] = this.mappedTextures[i].toArray();
    }
    return result;
  }

  renderKernelsToTextures() {
    const result = {
      result: this.renderOutput(),
    };
    if (this.immutable) {
      for (let i = 0; i < this.subKernels.length; i++) {
        result[this.subKernels[i].property] = this.mappedTextures[i].clone();
      }
    } else {
      for (let i = 0; i < this.subKernels.length; i++) {
        result[this.subKernels[i].property] = this.mappedTextures[i];
      }
    }
    return result;
  }

  resetSwitchingKernels() {
    const existingValue = this.switchingKernels;
    this.switchingKernels = null;
    return existingValue;
  }

  setOutput(output) {
    const newOutput = this.toKernelOutput(output);
    if (this.program) {
      if (!this.dynamicOutput) {
        throw new Error('Resizing a kernel with dynamicOutput: false is not possible');
      }
      const newThreadDim = [newOutput[0], newOutput[1] || 1, newOutput[2] || 1];
      const newTexSize = utils.getKernelTextureSize({
        optimizeFloatMemory: this.optimizeFloatMemory,
        precision: this.precision,
      }, newThreadDim);
      const oldTexSize = this.texSize;
      if (oldTexSize) {
        const oldPrecision = this.getVariablePrecisionString(oldTexSize, this.tactic);
        const newPrecision = this.getVariablePrecisionString(newTexSize, this.tactic);
        if (oldPrecision !== newPrecision) {
          if (this.debug) {
            console.warn('Precision requirement changed, asking GPU instance to recompile');
          }
          this.switchKernels({
            type: 'outputPrecisionMismatch',
            precision: newPrecision,
            needed: output
          });
          return;
        }
      }
      this.output = newOutput;
      this.threadDim = newThreadDim;
      this.texSize = newTexSize;
      const { context: gl } = this;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      this.updateMaxTexSize();
      this.framebuffer.width = this.texSize[0];
      this.framebuffer.height = this.texSize[1];
      gl.viewport(0, 0, this.maxTexSize[0], this.maxTexSize[1]);
      this.canvas.width = this.maxTexSize[0];
      this.canvas.height = this.maxTexSize[1];
      if (this.texture) {
        this.texture.delete();
      }
      this.texture = null;
      this._setupOutputTexture();
      if (this.mappedTextures && this.mappedTextures.length > 0) {
        for (let i = 0; i < this.mappedTextures.length; i++) {
          this.mappedTextures[i].delete();
        }
        this.mappedTextures = null;
        this._setupSubOutputTextures();
      }
    } else {
      this.output = newOutput;
    }
    return this;
  }
  renderValues() {
    return this.formatValues(
      this.transferValues(),
      this.output[0],
      this.output[1],
      this.output[2]
    );
  }
  switchKernels(reason) {
    if (this.switchingKernels) {
      this.switchingKernels.push(reason);
    } else {
      this.switchingKernels = [reason];
    }
  }
  getVariablePrecisionString(textureSize = this.texSize, tactic = this.tactic, isInt = false) {
    if (!tactic) {
      if (!this.constructor.features.isSpeedTacticSupported) return 'highp';
      const low = this.constructor.features[isInt ? 'lowIntPrecision' : 'lowFloatPrecision'];
      const medium = this.constructor.features[isInt ? 'mediumIntPrecision' : 'mediumFloatPrecision'];
      const high = this.constructor.features[isInt ? 'highIntPrecision' : 'highFloatPrecision'];
      const requiredSize = Math.log2(textureSize[0] * textureSize[1]);
      if (requiredSize <= low.rangeMax) {
        return 'lowp';
      } else if (requiredSize <= medium.rangeMax) {
        return 'mediump';
      } else if (requiredSize <= high.rangeMax) {
        return 'highp';
      } else {
        throw new Error(`The required size exceeds that of the ability of your system`);
      }
    }
    switch (tactic) {
      case 'speed':
        return 'lowp';
      case 'balanced':
        return 'mediump';
      case 'precision':
        return 'highp';
      default:
        throw new Error(`Unknown tactic "${tactic}" use "speed", "balanced", "precision", or empty for auto`);
    }
  }

  /**
   *
   * @param {WebGLKernelValue} kernelValue
   * @param {GLTexture} arg
   */
  updateTextureArgumentRefs(kernelValue, arg) {
    if (!this.immutable) return;
    if (this.texture.texture === arg.texture) {
      const { prevArg } = kernelValue;
      if (prevArg) {
        if (prevArg.texture._refs === 1) {
          this.texture.delete();
          this.texture = prevArg.clone();
          this._textureSwitched = true;
        }
        prevArg.delete();
      }
      kernelValue.prevArg = arg.clone();
    } else if (this.mappedTextures && this.mappedTextures.length > 0) {
      const { mappedTextures } = this;
      for (let i = 0; i < mappedTextures.length; i++) {
        const mappedTexture = mappedTextures[i];
        if (mappedTexture.texture === arg.texture) {
          const { prevArg } = kernelValue;
          if (prevArg) {
            if (prevArg.texture._refs === 1) {
              mappedTexture.delete();
              mappedTextures[i] = prevArg.clone();
              this._mappedTextureSwitched[i] = true;
            }
            prevArg.delete();
          }
          kernelValue.prevArg = arg.clone();
          return;
        }
      }
    }
  }

  onActivate(previousKernel) {
    this._textureSwitched = true;
    this.texture = previousKernel.texture;
    if (this.mappedTextures) {
      for (let i = 0; i < this.mappedTextures.length; i++) {
        this._mappedTextureSwitched[i] = true;
      }
      this.mappedTextures = previousKernel.mappedTextures;
    }
  }

  initCanvas() {}
}

const typeMap = {
  int: 'Integer',
  float: 'Number',
  vec2: 'Array(2)',
  vec3: 'Array(3)',
  vec4: 'Array(4)',
};

module.exports = {
  GLKernel
};

/***/ }),

/***/ "./src/backend/gl/texture/array-2-float-2d.js":
/*!****************************************************!*\
  !*** ./src/backend/gl/texture/array-2-float-2d.js ***!
  \****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { GLTextureFloat } = __webpack_require__(/*! ./float */ "./src/backend/gl/texture/float.js");

class GLTextureArray2Float2D extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(2)';
  }
  toArray() {
    return utils.erect2DArray2(this.renderValues(), this.output[0], this.output[1]);
  }
}

module.exports = {
  GLTextureArray2Float2D
};

/***/ }),

/***/ "./src/backend/gl/texture/array-2-float-3d.js":
/*!****************************************************!*\
  !*** ./src/backend/gl/texture/array-2-float-3d.js ***!
  \****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { GLTextureFloat } = __webpack_require__(/*! ./float */ "./src/backend/gl/texture/float.js");

class GLTextureArray2Float3D extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(2)';
  }
  toArray() {
    return utils.erect3DArray2(this.renderValues(), this.output[0], this.output[1], this.output[2]);
  }
}

module.exports = {
  GLTextureArray2Float3D
};

/***/ }),

/***/ "./src/backend/gl/texture/array-2-float.js":
/*!*************************************************!*\
  !*** ./src/backend/gl/texture/array-2-float.js ***!
  \*************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { GLTextureFloat } = __webpack_require__(/*! ./float */ "./src/backend/gl/texture/float.js");

class GLTextureArray2Float extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(2)';
  }
  toArray() {
    return utils.erectArray2(this.renderValues(), this.output[0], this.output[1]);
  }
}

module.exports = {
  GLTextureArray2Float
};

/***/ }),

/***/ "./src/backend/gl/texture/array-3-float-2d.js":
/*!****************************************************!*\
  !*** ./src/backend/gl/texture/array-3-float-2d.js ***!
  \****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { GLTextureFloat } = __webpack_require__(/*! ./float */ "./src/backend/gl/texture/float.js");

class GLTextureArray3Float2D extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(3)';
  }
  toArray() {
    return utils.erect2DArray3(this.renderValues(), this.output[0], this.output[1]);
  }
}

module.exports = {
  GLTextureArray3Float2D
};

/***/ }),

/***/ "./src/backend/gl/texture/array-3-float-3d.js":
/*!****************************************************!*\
  !*** ./src/backend/gl/texture/array-3-float-3d.js ***!
  \****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { GLTextureFloat } = __webpack_require__(/*! ./float */ "./src/backend/gl/texture/float.js");

class GLTextureArray3Float3D extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(3)';
  }
  toArray() {
    return utils.erect3DArray3(this.renderValues(), this.output[0], this.output[1], this.output[2]);
  }
}

module.exports = {
  GLTextureArray3Float3D
};

/***/ }),

/***/ "./src/backend/gl/texture/array-3-float.js":
/*!*************************************************!*\
  !*** ./src/backend/gl/texture/array-3-float.js ***!
  \*************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { GLTextureFloat } = __webpack_require__(/*! ./float */ "./src/backend/gl/texture/float.js");

class GLTextureArray3Float extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(3)';
  }
  toArray() {
    return utils.erectArray3(this.renderValues(), this.output[0]);
  }
}

module.exports = {
  GLTextureArray3Float
};

/***/ }),

/***/ "./src/backend/gl/texture/array-4-float-2d.js":
/*!****************************************************!*\
  !*** ./src/backend/gl/texture/array-4-float-2d.js ***!
  \****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { GLTextureFloat } = __webpack_require__(/*! ./float */ "./src/backend/gl/texture/float.js");

class GLTextureArray4Float2D extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(4)';
  }
  toArray() {
    return utils.erect2DArray4(this.renderValues(), this.output[0], this.output[1]);
  }
}

module.exports = {
  GLTextureArray4Float2D
};

/***/ }),

/***/ "./src/backend/gl/texture/array-4-float-3d.js":
/*!****************************************************!*\
  !*** ./src/backend/gl/texture/array-4-float-3d.js ***!
  \****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { GLTextureFloat } = __webpack_require__(/*! ./float */ "./src/backend/gl/texture/float.js");

class GLTextureArray4Float3D extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(4)';
  }
  toArray() {
    return utils.erect3DArray4(this.renderValues(), this.output[0], this.output[1], this.output[2]);
  }
}

module.exports = {
  GLTextureArray4Float3D
};

/***/ }),

/***/ "./src/backend/gl/texture/array-4-float.js":
/*!*************************************************!*\
  !*** ./src/backend/gl/texture/array-4-float.js ***!
  \*************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { GLTextureFloat } = __webpack_require__(/*! ./float */ "./src/backend/gl/texture/float.js");

class GLTextureArray4Float extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(4)';
  }
  toArray() {
    return utils.erectArray4(this.renderValues(), this.output[0]);
  }
}

module.exports = {
  GLTextureArray4Float
};

/***/ }),

/***/ "./src/backend/gl/texture/float-2d.js":
/*!********************************************!*\
  !*** ./src/backend/gl/texture/float-2d.js ***!
  \********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { GLTextureFloat } = __webpack_require__(/*! ./float */ "./src/backend/gl/texture/float.js");

class GLTextureFloat2D extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(1)';
  }
  toArray() {
    return utils.erect2DFloat(this.renderValues(), this.output[0], this.output[1]);
  }
}

module.exports = {
  GLTextureFloat2D
};

/***/ }),

/***/ "./src/backend/gl/texture/float-3d.js":
/*!********************************************!*\
  !*** ./src/backend/gl/texture/float-3d.js ***!
  \********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { GLTextureFloat } = __webpack_require__(/*! ./float */ "./src/backend/gl/texture/float.js");

class GLTextureFloat3D extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(1)';
  }
  toArray() {
    return utils.erect3DFloat(this.renderValues(), this.output[0], this.output[1], this.output[2]);
  }
}

module.exports = {
  GLTextureFloat3D
};

/***/ }),

/***/ "./src/backend/gl/texture/float.js":
/*!*****************************************!*\
  !*** ./src/backend/gl/texture/float.js ***!
  \*****************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { GLTexture } = __webpack_require__(/*! ./index */ "./src/backend/gl/texture/index.js");

class GLTextureFloat extends GLTexture {
  get textureType() {
    return this.context.FLOAT;
  }
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(1)';
  }
  renderRawOutput() {
    const gl = this.context;
    const size = this.size;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer());
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.texture,
      0
    );
    const result = new Float32Array(size[0] * size[1] * 4);
    gl.readPixels(0, 0, size[0], size[1], gl.RGBA, gl.FLOAT, result);
    return result;
  }
  renderValues() {
    if (this._deleted) return null;
    return this.renderRawOutput();
  }
  toArray() {
    return utils.erectFloat(this.renderValues(), this.output[0]);
  }
}

module.exports = {
  GLTextureFloat
};

/***/ }),

/***/ "./src/backend/gl/texture/graphical.js":
/*!*********************************************!*\
  !*** ./src/backend/gl/texture/graphical.js ***!
  \*********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { GLTextureUnsigned } = __webpack_require__(/*! ./unsigned */ "./src/backend/gl/texture/unsigned.js");

class GLTextureGraphical extends GLTextureUnsigned {
  constructor(settings) {
    super(settings);
    this.type = 'ArrayTexture(4)';
  }
  toArray() {
    return this.renderValues();
  }
}

module.exports = {
  GLTextureGraphical
};

/***/ }),

/***/ "./src/backend/gl/texture/index.js":
/*!*****************************************!*\
  !*** ./src/backend/gl/texture/index.js ***!
  \*****************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { Texture } = __webpack_require__(/*! ../../../texture */ "./src/texture.js");

/**
 * @class
 * @property framebuffer
 * @extends Texture
 */
class GLTexture extends Texture {
  /**
   * @returns {Number}
   * @abstract
   */
  get textureType() {
    throw new Error(`"textureType" not implemented on ${ this.name }`);
  }

  clone() {
    return new this.constructor(this);
  }

  /**
   * @returns {Boolean}
   */
  beforeMutate() {
    if (this.texture._refs > 1) {
      this.newTexture();
      return true;
    }
    return false;
  }

  /**
   * @private
   */
  cloneTexture() {
    this.texture._refs--;
    const { context: gl, size, texture, kernel } = this;
    if (kernel.debug) {
      console.warn('cloning internal texture');
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer());
    selectTexture(gl, texture);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const target = gl.createTexture();
    selectTexture(gl, target);
    gl.texImage2D(gl.TEXTURE_2D, 0, this.internalFormat, size[0], size[1], 0, this.textureFormat, this.textureType, null);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, size[0], size[1]);
    target._refs = 1;
    this.texture = target;
  }

  /**
   * @private
   */
  newTexture() {
    this.texture._refs--;
    const gl = this.context;
    const size = this.size;
    const kernel = this.kernel;
    if (kernel.debug) {
      console.warn('new internal texture');
    }
    const target = gl.createTexture();
    selectTexture(gl, target);
    gl.texImage2D(gl.TEXTURE_2D, 0, this.internalFormat, size[0], size[1], 0, this.textureFormat, this.textureType, null);
    target._refs = 1;
    this.texture = target;
  }

  clear() {
    if (this.texture._refs) {
      this.texture._refs--;
      const gl = this.context;
      const target = this.texture = gl.createTexture();
      selectTexture(gl, target);
      const size = this.size;
      target._refs = 1;
      gl.texImage2D(gl.TEXTURE_2D, 0, this.internalFormat, size[0], size[1], 0, this.textureFormat, this.textureType, null);
    }
    const { context: gl, texture } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer());
    gl.bindTexture(gl.TEXTURE_2D, texture);
    selectTexture(gl, texture);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  delete() {
    if (this._deleted) return;
    this._deleted = true;
    if (this.texture._refs) {
      this.texture._refs--;
      if (this.texture._refs) return;
    }
    this.context.deleteTexture(this.texture);
    // TODO: Remove me
    // if (this.texture._refs === 0 && this._framebuffer) {
    //   this.context.deleteFramebuffer(this._framebuffer);
    //   this._framebuffer = null;
    // }
  }

  framebuffer() {
    if (!this._framebuffer) {
      this._framebuffer = this.kernel.getRawValueFramebuffer(this.size[0], this.size[1]);
    }
    return this._framebuffer;
  }
}

function selectTexture(gl, texture) {
  /* Maximum a texture can be, so that collision is highly unlikely
   * basically gl.TEXTURE15 + gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
   * Was gl.TEXTURE31, but safari didn't like it
   * */
  gl.activeTexture(gl.TEXTURE15);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

module.exports = { GLTexture };

/***/ }),

/***/ "./src/backend/gl/texture/memory-optimized-2d.js":
/*!*******************************************************!*\
  !*** ./src/backend/gl/texture/memory-optimized-2d.js ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { GLTextureFloat } = __webpack_require__(/*! ./float */ "./src/backend/gl/texture/float.js");

class GLTextureMemoryOptimized2D extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'MemoryOptimizedNumberTexture';
  }
  toArray() {
    return utils.erectMemoryOptimized2DFloat(this.renderValues(), this.output[0], this.output[1]);
  }
}

module.exports = {
  GLTextureMemoryOptimized2D
};

/***/ }),

/***/ "./src/backend/gl/texture/memory-optimized-3d.js":
/*!*******************************************************!*\
  !*** ./src/backend/gl/texture/memory-optimized-3d.js ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { GLTextureFloat } = __webpack_require__(/*! ./float */ "./src/backend/gl/texture/float.js");

class GLTextureMemoryOptimized3D extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'MemoryOptimizedNumberTexture';
  }
  toArray() {
    return utils.erectMemoryOptimized3DFloat(this.renderValues(), this.output[0], this.output[1], this.output[2]);
  }
}

module.exports = {
  GLTextureMemoryOptimized3D
};

/***/ }),

/***/ "./src/backend/gl/texture/memory-optimized.js":
/*!****************************************************!*\
  !*** ./src/backend/gl/texture/memory-optimized.js ***!
  \****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { GLTextureFloat } = __webpack_require__(/*! ./float */ "./src/backend/gl/texture/float.js");

class GLTextureMemoryOptimized extends GLTextureFloat {
  constructor(settings) {
    super(settings);
    this.type = 'MemoryOptimizedNumberTexture';
  }
  toArray() {
    return utils.erectMemoryOptimizedFloat(this.renderValues(), this.output[0]);
  }
}

module.exports = {
  GLTextureMemoryOptimized
};

/***/ }),

/***/ "./src/backend/gl/texture/unsigned-2d.js":
/*!***********************************************!*\
  !*** ./src/backend/gl/texture/unsigned-2d.js ***!
  \***********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { GLTextureUnsigned } = __webpack_require__(/*! ./unsigned */ "./src/backend/gl/texture/unsigned.js");

class GLTextureUnsigned2D extends GLTextureUnsigned {
  constructor(settings) {
    super(settings);
    this.type = 'NumberTexture';
  }
  toArray() {
    return utils.erect2DPackedFloat(this.renderValues(), this.output[0], this.output[1]);
  }
}

module.exports = {
  GLTextureUnsigned2D
};

/***/ }),

/***/ "./src/backend/gl/texture/unsigned-3d.js":
/*!***********************************************!*\
  !*** ./src/backend/gl/texture/unsigned-3d.js ***!
  \***********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { GLTextureUnsigned } = __webpack_require__(/*! ./unsigned */ "./src/backend/gl/texture/unsigned.js");

class GLTextureUnsigned3D extends GLTextureUnsigned {
  constructor(settings) {
    super(settings);
    this.type = 'NumberTexture';
  }
  toArray() {
    return utils.erect3DPackedFloat(this.renderValues(), this.output[0], this.output[1], this.output[2]);
  }
}

module.exports = {
  GLTextureUnsigned3D
};

/***/ }),

/***/ "./src/backend/gl/texture/unsigned.js":
/*!********************************************!*\
  !*** ./src/backend/gl/texture/unsigned.js ***!
  \********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { GLTexture } = __webpack_require__(/*! ./index */ "./src/backend/gl/texture/index.js");

class GLTextureUnsigned extends GLTexture {
  get textureType() {
    return this.context.UNSIGNED_BYTE;
  }
  constructor(settings) {
    super(settings);
    this.type = 'NumberTexture';
  }
  renderRawOutput() {
    const { context: gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer());
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.texture,
      0
    );
    const result = new Uint8Array(this.size[0] * this.size[1] * 4);
    gl.readPixels(0, 0, this.size[0], this.size[1], gl.RGBA, gl.UNSIGNED_BYTE, result);
    return result;
  }
  renderValues() {
    if (this._deleted) return null;
    return new Float32Array(this.renderRawOutput().buffer);
  }
  toArray() {
    return utils.erectPackedFloat(this.renderValues(), this.output[0]);
  }
}

module.exports = {
  GLTextureUnsigned
};

/***/ }),

/***/ "./src/backend/headless-gl/kernel.js":
/*!*******************************************!*\
  !*** ./src/backend/headless-gl/kernel.js ***!
  \*******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const getContext = __webpack_require__(/*! gl */ "./node_modules/gl/index.js");
const { WebGLKernel } = __webpack_require__(/*! ../web-gl/kernel */ "./src/backend/web-gl/kernel.js");
const { glKernelString } = __webpack_require__(/*! ../gl/kernel-string */ "./src/backend/gl/kernel-string.js");

let isSupported = null;
let testCanvas = null;
let testContext = null;
let testExtensions = null;
let features = null;

class HeadlessGLKernel extends WebGLKernel {
  static get isSupported() {
    if (isSupported !== null) return isSupported;
    this.setupFeatureChecks();
    isSupported = testContext !== null;
    return isSupported;
  }

  static setupFeatureChecks() {
    testCanvas = null;
    testExtensions = null;
    if (typeof getContext !== 'function') return;
    try { // just in case, edge cases
      testContext = getContext(2, 2, {
        preserveDrawingBuffer: true
      });
      if (!testContext || !testContext.getExtension) return;
      testExtensions = {
        STACKGL_resize_drawingbuffer: testContext.getExtension('STACKGL_resize_drawingbuffer'),
        STACKGL_destroy_context: testContext.getExtension('STACKGL_destroy_context'),
        OES_texture_float: testContext.getExtension('OES_texture_float'),
        OES_texture_float_linear: testContext.getExtension('OES_texture_float_linear'),
        OES_element_index_uint: testContext.getExtension('OES_element_index_uint'),
        WEBGL_draw_buffers: testContext.getExtension('WEBGL_draw_buffers'),
        WEBGL_color_buffer_float: testContext.getExtension('WEBGL_color_buffer_float'),
      };
      features = this.getFeatures();
    } catch (e) {
      console.warn(e);
    }
  }

  static isContextMatch(context) {
    try {
      return context.getParameter(context.RENDERER) === 'ANGLE';
    } catch (e) {
      return false;
    }
  }

  static getIsTextureFloat() {
    return Boolean(testExtensions.OES_texture_float);
  }

  static getIsDrawBuffers() {
    return Boolean(testExtensions.WEBGL_draw_buffers);
  }

  static getChannelCount() {
    return testExtensions.WEBGL_draw_buffers ?
      testContext.getParameter(testExtensions.WEBGL_draw_buffers.MAX_DRAW_BUFFERS_WEBGL) :
      1;
  }

  static getMaxTextureSize() {
    return testContext.getParameter(testContext.MAX_TEXTURE_SIZE);
  }

  static get testCanvas() {
    return testCanvas;
  }

  static get testContext() {
    return testContext;
  }

  static get features() {
    return features;
  }

  initCanvas() {
    return {};
  }

  initContext() {
    return getContext(2, 2, {
      preserveDrawingBuffer: true
    });
  }

  initExtensions() {
    this.extensions = {
      STACKGL_resize_drawingbuffer: this.context.getExtension('STACKGL_resize_drawingbuffer'),
      STACKGL_destroy_context: this.context.getExtension('STACKGL_destroy_context'),
      OES_texture_float: this.context.getExtension('OES_texture_float'),
      OES_texture_float_linear: this.context.getExtension('OES_texture_float_linear'),
      OES_element_index_uint: this.context.getExtension('OES_element_index_uint'),
      WEBGL_draw_buffers: this.context.getExtension('WEBGL_draw_buffers'),
    };
  }

  build() {
    super.build.apply(this, arguments);
    if (!this.fallbackRequested) {
      this.extensions.STACKGL_resize_drawingbuffer.resize(this.maxTexSize[0], this.maxTexSize[1]);
    }
  }

  destroyExtensions() {
    this.extensions.STACKGL_resize_drawingbuffer = null;
    this.extensions.STACKGL_destroy_context = null;
    this.extensions.OES_texture_float = null;
    this.extensions.OES_texture_float_linear = null;
    this.extensions.OES_element_index_uint = null;
    this.extensions.WEBGL_draw_buffers = null;
  }

  static destroyContext(context) {
    const extension = context.getExtension('STACKGL_destroy_context');
    if (extension && extension.destroy) {
      extension.destroy();
    }
  }

  /**
   * @desc Returns the *pre-compiled* Kernel as a JS Object String, that can be reused.
   */
  toString() {
    const setupContextString = `const gl = context || require('gl')(1, 1);\n`;
    const destroyContextString = `    if (!context) { gl.getExtension('STACKGL_destroy_context').destroy(); }\n`;
    return glKernelString(this.constructor, arguments, this, setupContextString, destroyContextString);
  }

  setOutput(output) {
    super.setOutput(output);
    if (this.graphical && this.extensions.STACKGL_resize_drawingbuffer) {
      this.extensions.STACKGL_resize_drawingbuffer.resize(this.maxTexSize[0], this.maxTexSize[1]);
    }
    return this;
  }
}

module.exports = {
  HeadlessGLKernel
};

/***/ }),

/***/ "./src/backend/kernel-value.js":
/*!*************************************!*\
  !*** ./src/backend/kernel-value.js ***!
  \*************************************/
/***/ ((module) => {

/**
 * @class KernelValue
 */
class KernelValue {
  /**
   * @param {KernelVariable} value
   * @param {IKernelValueSettings} settings
   */
  constructor(value, settings) {
    const {
      name,
      kernel,
      context,
      checkContext,
      onRequestContextHandle,
      onUpdateValueMismatch,
      origin,
      strictIntegers,
      type,
      tactic,
    } = settings;
    if (!name) {
      throw new Error('name not set');
    }
    if (!type) {
      throw new Error('type not set');
    }
    if (!origin) {
      throw new Error('origin not set');
    }
    if (origin !== 'user' && origin !== 'constants') {
      throw new Error(`origin must be "user" or "constants" value is "${ origin }"`);
    }
    if (!onRequestContextHandle) {
      throw new Error('onRequestContextHandle is not set');
    }
    this.name = name;
    this.origin = origin;
    this.tactic = tactic;
    this.varName = origin === 'constants' ? `constants.${name}` : name;
    this.kernel = kernel;
    this.strictIntegers = strictIntegers;
    // handle textures
    this.type = value.type || type;
    this.size = value.size || null;
    this.index = null;
    this.context = context;
    this.checkContext = checkContext !== null && checkContext !== undefined ? checkContext : true;
    this.contextHandle = null;
    this.onRequestContextHandle = onRequestContextHandle;
    this.onUpdateValueMismatch = onUpdateValueMismatch;
    this.forceUploadEachRun = null;
  }

  get id() {
    return `${this.origin}_${name}`;
  }

  getSource() {
    throw new Error(`"getSource" not defined on ${ this.constructor.name }`);
  }

  updateValue(value) {
    throw new Error(`"updateValue" not defined on ${ this.constructor.name }`);
  }
}

module.exports = {
  KernelValue
};

/***/ }),

/***/ "./src/backend/kernel.js":
/*!*******************************!*\
  !*** ./src/backend/kernel.js ***!
  \*******************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../utils */ "./src/utils.js");
const { Input } = __webpack_require__(/*! ../input */ "./src/input.js");

class Kernel {
  /**
   * @type {Boolean}
   */
  static get isSupported() {
    throw new Error(`"isSupported" not implemented on ${ this.name }`);
  }

  /**
   * @abstract
   * @returns {Boolean}
   */
  static isContextMatch(context) {
    throw new Error(`"isContextMatch" not implemented on ${ this.name }`);
  }

  /**
   * @type {IKernelFeatures}
   * Used internally to populate the kernel.feature, which is a getter for the output of this value
   */
  static getFeatures() {
    throw new Error(`"getFeatures" not implemented on ${ this.name }`);
  }

  static destroyContext(context) {
    throw new Error(`"destroyContext" called on ${ this.name }`);
  }

  static nativeFunctionArguments() {
    throw new Error(`"nativeFunctionArguments" called on ${ this.name }`);
  }

  static nativeFunctionReturnType() {
    throw new Error(`"nativeFunctionReturnType" called on ${ this.name }`);
  }

  static combineKernels() {
    throw new Error(`"combineKernels" called on ${ this.name }`);
  }

  /**
   *
   * @param {string|IKernelJSON} source
   * @param [settings]
   */
  constructor(source, settings) {
    if (typeof source !== 'object') {
      if (typeof source !== 'string') {
        throw new Error('source not a string');
      }
      if (!utils.isFunctionString(source)) {
        throw new Error('source not a function string');
      }
    }
    this.useLegacyEncoder = false;
    this.fallbackRequested = false;
    this.onRequestFallback = null;

    /**
     * Name of the arguments found from parsing source argument
     * @type {String[]}
     */
    this.argumentNames = typeof source === 'string' ? utils.getArgumentNamesFromString(source) : null;
    this.argumentTypes = null;
    this.argumentSizes = null;
    this.argumentBitRatios = null;
    this.kernelArguments = null;
    this.kernelConstants = null;
    this.forceUploadKernelConstants = null;


    /**
     * The function source
     * @type {String|IKernelJSON}
     */
    this.source = source;

    /**
     * The size of the kernel's output
     * @type {Number[]}
     */
    this.output = null;

    /**
     * Debug mode
     * @type {Boolean}
     */
    this.debug = false;

    /**
     * Graphical mode
     * @type {Boolean}
     */
    this.graphical = false;

    /**
     * Maximum loops when using argument values to prevent infinity
     * @type {Number}
     */
    this.loopMaxIterations = 0;

    /**
     * Constants used in kernel via `this.constants`
     * @type {Object}
     */
    this.constants = null;

    /**
     *
     * @type {Object.<string, string>}
     */
    this.constantTypes = null;

    /**
     *
     * @type {Object.<string, number>}
     */
    this.constantBitRatios = null;

    /**
     *
     * @type {boolean}
     */
    this.dynamicArguments = false;

    /**
     *
     * @type {boolean}
     */
    this.dynamicOutput = false;

    /**
     *
     * @type {Object}
     */
    this.canvas = null;

    /**
     *
     * @type {Object}
     */
    this.context = null;

    /**
     *
     * @type {Boolean}
     */
    this.checkContext = null;

    /**
     *
     * @type {GPU}
     */
    this.gpu = null;

    /**
     *
     * @type {IGPUFunction[]}
     */
    this.functions = null;

    /**
     *
     * @type {IGPUNativeFunction[]}
     */
    this.nativeFunctions = null;

    /**
     *
     * @type {String}
     */
    this.injectedNative = null;

    /**
     *
     * @type {ISubKernel[]}
     */
    this.subKernels = null;

    /**
     *
     * @type {Boolean}
     */
    this.validate = true;

    /**
     * Enforces kernel to write to a new array or texture on run
     * @type {Boolean}
     */
    this.immutable = false;

    /**
     * Enforces kernel to write to a texture on run
     * @type {Boolean}
     */
    this.pipeline = false;

    /**
     * Make GPU use single precision or unsigned.  Acceptable values: 'single' or 'unsigned'
     * @type {String|null}
     * @enum 'single' | 'unsigned'
     */
    this.precision = null;

    /**
     *
     * @type {String|null}
     * @enum 'speed' | 'balanced' | 'precision'
     */
    this.tactic = null;

    this.plugins = null;

    this.returnType = null;
    this.leadingReturnStatement = null;
    this.followingReturnStatement = null;
    this.optimizeFloatMemory = null;
    this.strictIntegers = false;
    this.fixIntegerDivisionAccuracy = null;
    this.built = false;
    this.signature = null;
  }

  /**
   *
   * @param {IDirectKernelSettings|IJSONSettings} settings
   */
  mergeSettings(settings) {
    for (let p in settings) {
      if (!settings.hasOwnProperty(p) || !this.hasOwnProperty(p)) continue;
      switch (p) {
        case 'output':
          if (!Array.isArray(settings.output)) {
            this.setOutput(settings.output); // Flatten output object
            continue;
          }
          break;
        case 'functions':
          this.functions = [];
          for (let i = 0; i < settings.functions.length; i++) {
            this.addFunction(settings.functions[i]);
          }
          continue;
        case 'graphical':
          if (settings[p] && !settings.hasOwnProperty('precision')) {
            this.precision = 'unsigned';
          }
          this[p] = settings[p];
          continue;
        case 'nativeFunctions':
          if (!settings.nativeFunctions) continue;
          this.nativeFunctions = [];
          for (let i = 0; i < settings.nativeFunctions.length; i++) {
            const s = settings.nativeFunctions[i];
            const { name, source } = s;
            this.addNativeFunction(name, source, s);
          }
          continue;
      }
      this[p] = settings[p];
    }

    if (!this.canvas) this.canvas = this.initCanvas();
    if (!this.context) this.context = this.initContext();
    if (!this.plugins) this.plugins = this.initPlugins(settings);
  }
  /**
   * @desc Builds the Kernel, by compiling Fragment and Vertical Shaders,
   * and instantiates the program.
   * @abstract
   */
  build() {
    throw new Error(`"build" not defined on ${ this.constructor.name }`);
  }

  /**
   * @desc Run the kernel program, and send the output to renderOutput
   * <p> This method calls a helper method *renderOutput* to return the result. </p>
   * @returns {Float32Array|Float32Array[]|Float32Array[][]|void} Result The final output of the program, as float, and as Textures for reuse.
   * @abstract
   */
  run() {
    throw new Error(`"run" not defined on ${ this.constructor.name }`)
  }

  /**
   * @abstract
   * @return {Object}
   */
  initCanvas() {
    throw new Error(`"initCanvas" not defined on ${ this.constructor.name }`);
  }

  /**
   * @abstract
   * @return {Object}
   */
  initContext() {
    throw new Error(`"initContext" not defined on ${ this.constructor.name }`);
  }

  /**
   * @param {IDirectKernelSettings} settings
   * @return {string[]};
   * @abstract
   */
  initPlugins(settings) {
    throw new Error(`"initPlugins" not defined on ${ this.constructor.name }`);
  }

  /**
   *
   * @param {KernelFunction|string|IGPUFunction} source
   * @param {IFunctionSettings} [settings]
   * @return {Kernel}
   */
  addFunction(source, settings = {}) {
    if (source.name && source.source && source.argumentTypes && 'returnType' in source) {
      this.functions.push(source);
    } else if ('settings' in source && 'source' in source) {
      this.functions.push(this.functionToIGPUFunction(source.source, source.settings));
    } else if (typeof source === 'string' || typeof source === 'function') {
      this.functions.push(this.functionToIGPUFunction(source, settings));
    } else {
      throw new Error(`function not properly defined`);
    }
    return this;
  }

  /**
   *
   * @param {string} name
   * @param {string} source
   * @param {IGPUFunctionSettings} [settings]
   */
  addNativeFunction(name, source, settings = {}) {
    const { argumentTypes, argumentNames } = settings.argumentTypes ?
      splitArgumentTypes(settings.argumentTypes) :
      this.constructor.nativeFunctionArguments(source) || {};
    this.nativeFunctions.push({
      name,
      source,
      settings,
      argumentTypes,
      argumentNames,
      returnType: settings.returnType || this.constructor.nativeFunctionReturnType(source)
    });
    return this;
  }

  /**
   * @desc Setup the parameter types for the parameters
   * supplied to the Kernel function
   *
   * @param {IArguments} args - The actual parameters sent to the Kernel
   */
  setupArguments(args) {
    this.kernelArguments = [];
    if (!this.argumentTypes) {
      if (!this.argumentTypes) {
        this.argumentTypes = [];
        for (let i = 0; i < args.length; i++) {
          const argType = utils.getVariableType(args[i], this.strictIntegers);
          const type = argType === 'Integer' ? 'Number' : argType;
          this.argumentTypes.push(type);
          this.kernelArguments.push({
            type
          });
        }
      }
    } else {
      for (let i = 0; i < this.argumentTypes.length; i++) {
        this.kernelArguments.push({
          type: this.argumentTypes[i]
        });
      }
    }

    // setup sizes
    this.argumentSizes = new Array(args.length);
    this.argumentBitRatios = new Int32Array(args.length);

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      this.argumentSizes[i] = arg.constructor === Input ? arg.size : null;
      this.argumentBitRatios[i] = this.getBitRatio(arg);
    }

    if (this.argumentNames.length !== args.length) {
      throw new Error(`arguments are miss-aligned`);
    }
  }

  /**
   * Setup constants
   */
  setupConstants() {
    this.kernelConstants = [];
    let needsConstantTypes = this.constantTypes === null;
    if (needsConstantTypes) {
      this.constantTypes = {};
    }
    this.constantBitRatios = {};
    if (this.constants) {
      for (let name in this.constants) {
        if (needsConstantTypes) {
          const type = utils.getVariableType(this.constants[name], this.strictIntegers);
          this.constantTypes[name] = type;
          this.kernelConstants.push({
            name,
            type
          });
        } else {
          this.kernelConstants.push({
            name,
            type: this.constantTypes[name]
          });
        }
        this.constantBitRatios[name] = this.getBitRatio(this.constants[name]);
      }
    }
  }

  /**
   *
   * @param flag
   * @return {this}
   */
  setOptimizeFloatMemory(flag) {
    this.optimizeFloatMemory = flag;
    return this;
  }

  /**
   *
   * @param {Array|Object} output
   * @return {number[]}
   */
  toKernelOutput(output) {
    if (output.hasOwnProperty('x')) {
      if (output.hasOwnProperty('y')) {
        if (output.hasOwnProperty('z')) {
          return [output.x, output.y, output.z];
        } else {
          return [output.x, output.y];
        }
      } else {
        return [output.x];
      }
    } else {
      return output;
    }
  }

  /**
   * @desc Set output dimensions of the kernel function
   * @param {Array|Object} output - The output array to set the kernel output size to
   * @return {this}
   */
  setOutput(output) {
    this.output = this.toKernelOutput(output);
    return this;
  }

  /**
   * @desc Toggle debug mode
   * @param {Boolean} flag - true to enable debug
   * @return {this}
   */
  setDebug(flag) {
    this.debug = flag;
    return this;
  }

  /**
   * @desc Toggle graphical output mode
   * @param {Boolean} flag - true to enable graphical output
   * @return {this}
   */
  setGraphical(flag) {
    this.graphical = flag;
    this.precision = 'unsigned';
    return this;
  }

  /**
   * @desc Set the maximum number of loop iterations
   * @param {number} max - iterations count
   * @return {this}
   */
  setLoopMaxIterations(max) {
    this.loopMaxIterations = max;
    return this;
  }

  /**
   * @desc Set Constants
   * @return {this}
   */
  setConstants(constants) {
    this.constants = constants;
    return this;
  }

  /**
   *
   * @param {IKernelValueTypes} constantTypes
   * @return {this}
   */
  setConstantTypes(constantTypes) {
    this.constantTypes = constantTypes;
    return this;
  }

  /**
   *
   * @param {IFunction[]|KernelFunction[]} functions
   * @return {this}
   */
  setFunctions(functions) {
    for (let i = 0; i < functions.length; i++) {
      this.addFunction(functions[i]);
    }
    return this;
  }

  /**
   *
   * @param {IGPUNativeFunction[]} nativeFunctions
   * @return {this}
   */
  setNativeFunctions(nativeFunctions) {
    for (let i = 0; i < nativeFunctions.length; i++) {
      const settings = nativeFunctions[i];
      const { name, source } = settings;
      this.addNativeFunction(name, source, settings);
    }
    return this;
  }

  /**
   *
   * @param {String} injectedNative
   * @return {this}
   */
  setInjectedNative(injectedNative) {
    this.injectedNative = injectedNative;
    return this;
  }

  /**
   * Set writing to texture on/off
   * @param flag
   * @return {this}
   */
  setPipeline(flag) {
    this.pipeline = flag;
    return this;
  }

  /**
   * Set precision to 'unsigned' or 'single'
   * @param {String} flag 'unsigned' or 'single'
   * @return {this}
   */
  setPrecision(flag) {
    this.precision = flag;
    return this;
  }

  /**
   * @param flag
   * @return {Kernel}
   * @deprecated
   */
  setDimensions(flag) {
    utils.warnDeprecated('method', 'setDimensions', 'setOutput');
    this.output = flag;
    return this;
  }

  /**
   * @param flag
   * @return {this}
   * @deprecated
   */
  setOutputToTexture(flag) {
    utils.warnDeprecated('method', 'setOutputToTexture', 'setPipeline');
    this.pipeline = flag;
    return this;
  }

  /**
   * Set to immutable
   * @param flag
   * @return {this}
   */
  setImmutable(flag) {
    this.immutable = flag;
    return this;
  }

  /**
   * @desc Bind the canvas to kernel
   * @param {Object} canvas
   * @return {this}
   */
  setCanvas(canvas) {
    this.canvas = canvas;
    return this;
  }

  /**
   * @param {Boolean} flag
   * @return {this}
   */
  setStrictIntegers(flag) {
    this.strictIntegers = flag;
    return this;
  }

  /**
   *
   * @param flag
   * @return {this}
   */
  setDynamicOutput(flag) {
    this.dynamicOutput = flag;
    return this;
  }

  /**
   * @deprecated
   * @param flag
   * @return {this}
   */
  setHardcodeConstants(flag) {
    utils.warnDeprecated('method', 'setHardcodeConstants');
    this.setDynamicOutput(flag);
    this.setDynamicArguments(flag);
    return this;
  }

  /**
   *
   * @param flag
   * @return {this}
   */
  setDynamicArguments(flag) {
    this.dynamicArguments = flag;
    return this;
  }

  /**
   * @param {Boolean} flag
   * @return {this}
   */
  setUseLegacyEncoder(flag) {
    this.useLegacyEncoder = flag;
    return this;
  }

  /**
   *
   * @param {Boolean} flag
   * @return {this}
   */
  setWarnVarUsage(flag) {
    utils.warnDeprecated('method', 'setWarnVarUsage');
    return this;
  }

  /**
   * @deprecated
   * @returns {Object}
   */
  getCanvas() {
    utils.warnDeprecated('method', 'getCanvas');
    return this.canvas;
  }

  /**
   * @deprecated
   * @returns {Object}
   */
  getWebGl() {
    utils.warnDeprecated('method', 'getWebGl');
    return this.context;
  }

  /**
   * @desc Bind the webGL instance to kernel
   * @param {WebGLRenderingContext} context - webGl instance to bind
   */
  setContext(context) {
    this.context = context;
    return this;
  }

  /**
   *
   * @param {IKernelValueTypes|GPUVariableType[]} argumentTypes
   * @return {this}
   */
  setArgumentTypes(argumentTypes) {
    if (Array.isArray(argumentTypes)) {
      this.argumentTypes = argumentTypes;
    } else {
      this.argumentTypes = [];
      for (const p in argumentTypes) {
        if (!argumentTypes.hasOwnProperty(p)) continue;
        const argumentIndex = this.argumentNames.indexOf(p);
        if (argumentIndex === -1) throw new Error(`unable to find argument ${ p }`);
        this.argumentTypes[argumentIndex] = argumentTypes[p];
      }
    }
    return this;
  }

  /**
   *
   * @param {Tactic} tactic
   * @return {this}
   */
  setTactic(tactic) {
    this.tactic = tactic;
    return this;
  }

  requestFallback(args) {
    if (!this.onRequestFallback) {
      throw new Error(`"onRequestFallback" not defined on ${ this.constructor.name }`);
    }
    this.fallbackRequested = true;
    return this.onRequestFallback(args);
  }

  /**
   * @desc Validate settings
   * @abstract
   */
  validateSettings() {
    throw new Error(`"validateSettings" not defined on ${ this.constructor.name }`);
  }

  /**
   * @desc Add a sub kernel to the root kernel instance.
   * This is what `createKernelMap` uses.
   *
   * @param {ISubKernel} subKernel - function (as a String) of the subKernel to add
   */
  addSubKernel(subKernel) {
    if (this.subKernels === null) {
      this.subKernels = [];
    }
    if (!subKernel.source) throw new Error('subKernel missing "source" property');
    if (!subKernel.property && isNaN(subKernel.property)) throw new Error('subKernel missing "property" property');
    if (!subKernel.name) throw new Error('subKernel missing "name" property');
    this.subKernels.push(subKernel);
    return this;
  }

  /**
   * @desc Destroys all memory associated with this kernel
   * @param {Boolean} [removeCanvasReferences] remove any associated canvas references
   */
  destroy(removeCanvasReferences) {
    throw new Error(`"destroy" called on ${ this.constructor.name }`);
  }

  /**
   * bit storage ratio of source to target 'buffer', i.e. if 8bit array -> 32bit tex = 4
   * @param value
   * @returns {number}
   */
  getBitRatio(value) {
    if (this.precision === 'single') {
      // 8 and 16 are up-converted to float32
      return 4;
    } else if (Array.isArray(value[0])) {
      return this.getBitRatio(value[0]);
    } else if (value.constructor === Input) {
      return this.getBitRatio(value.value);
    }
    switch (value.constructor) {
      case Uint8ClampedArray:
      case Uint8Array:
      case Int8Array:
        return 1;
      case Uint16Array:
      case Int16Array:
        return 2;
      case Float32Array:
      case Int32Array:
      default:
        return 4;
    }
  }

  /**
   * @param {Boolean} [flip]
   * @returns {Uint8ClampedArray}
   */
  getPixels(flip) {
    throw new Error(`"getPixels" called on ${ this.constructor.name }`);
  }

  checkOutput() {
    if (!this.output || !utils.isArray(this.output)) throw new Error('kernel.output not an array');
    if (this.output.length < 1) throw new Error('kernel.output is empty, needs at least 1 value');
    for (let i = 0; i < this.output.length; i++) {
      if (isNaN(this.output[i]) || this.output[i] < 1) {
        throw new Error(`${ this.constructor.name }.output[${ i }] incorrectly defined as \`${ this.output[i] }\`, needs to be numeric, and greater than 0`);
      }
    }
  }

  /**
   *
   * @param {String} value
   */
  prependString(value) {
    throw new Error(`"prependString" called on ${ this.constructor.name }`);
  }

  /**
   *
   * @param {String} value
   * @return Boolean
   */
  hasPrependString(value) {
    throw new Error(`"hasPrependString" called on ${ this.constructor.name }`);
  }

  /**
   * @return {IKernelJSON}
   */
  toJSON() {
    return {
      settings: {
        output: this.output,
        pipeline: this.pipeline,
        argumentNames: this.argumentNames,
        argumentsTypes: this.argumentTypes,
        constants: this.constants,
        pluginNames: this.plugins ? this.plugins.map(plugin => plugin.name) : null,
        returnType: this.returnType,
      }
    };
  }

  /**
   * @param {IArguments} args
   */
  buildSignature(args) {
    const Constructor = this.constructor;
    this.signature = Constructor.getSignature(this, Constructor.getArgumentTypes(this, args));
  }

  /**
   * @param {Kernel} kernel
   * @param {IArguments} args
   * @returns GPUVariableType[]
   */
  static getArgumentTypes(kernel, args) {
    const argumentTypes = new Array(args.length);
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const type = kernel.argumentTypes[i];
      if (arg.type) {
        argumentTypes[i] = arg.type;
      } else {
        switch (type) {
          case 'Number':
          case 'Integer':
          case 'Float':
          case 'ArrayTexture(1)':
            argumentTypes[i] = utils.getVariableType(arg);
            break;
          default:
            argumentTypes[i] = type;
        }
      }
    }
    return argumentTypes;
  }

  /**
   *
   * @param {Kernel} kernel
   * @param {GPUVariableType[]} argumentTypes
   * @abstract
   */
  static getSignature(kernel, argumentTypes) {
    throw new Error(`"getSignature" not implemented on ${ this.name }`);
  }

  /**
   *
   * @param {String|Function} source
   * @param {IFunctionSettings} [settings]
   * @returns {IGPUFunction}
   */
  functionToIGPUFunction(source, settings = {}) {
    if (typeof source !== 'string' && typeof source !== 'function') throw new Error('source not a string or function');
    const sourceString = typeof source === 'string' ? source : source.toString();
    let argumentTypes = [];

    if (Array.isArray(settings.argumentTypes)) {
      argumentTypes = settings.argumentTypes;
    } else if (typeof settings.argumentTypes === 'object') {
      argumentTypes = utils.getArgumentNamesFromString(sourceString)
        .map(name => settings.argumentTypes[name]) || [];
    } else {
      argumentTypes = settings.argumentTypes || [];
    }

    return {
      name: utils.getFunctionNameFromString(sourceString) || null,
      source: sourceString,
      argumentTypes,
      returnType: settings.returnType || null,
    };
  }

  /**
   *
   * @param {Kernel} previousKernel
   * @abstract
   */
  onActivate(previousKernel) {}
}

function splitArgumentTypes(argumentTypesObject) {
  const argumentNames = Object.keys(argumentTypesObject);
  const argumentTypes = [];
  for (let i = 0; i < argumentNames.length; i++) {
    const argumentName = argumentNames[i];
    argumentTypes.push(argumentTypesObject[argumentName]);
  }
  return { argumentTypes, argumentNames };
}

module.exports = {
  Kernel
};

/***/ }),

/***/ "./src/backend/web-gl/fragment-shader.js":
/*!***********************************************!*\
  !*** ./src/backend/web-gl/fragment-shader.js ***!
  \***********************************************/
/***/ ((module) => {

// language=GLSL
const fragmentShader = `__HEADER__;
__FLOAT_TACTIC_DECLARATION__;
__INT_TACTIC_DECLARATION__;
__SAMPLER_2D_TACTIC_DECLARATION__;

const int LOOP_MAX = __LOOP_MAX__;

__PLUGINS__;
__CONSTANTS__;

varying vec2 vTexCoord;

float acosh(float x) {
  return log(x + sqrt(x * x - 1.0));
}

float sinh(float x) {
  return (pow(${Math.E}, x) - pow(${Math.E}, -x)) / 2.0;
}

float asinh(float x) {
  return log(x + sqrt(x * x + 1.0));
}

float atan2(float v1, float v2) {
  if (v1 == 0.0 || v2 == 0.0) return 0.0;
  return atan(v1 / v2);
}

float atanh(float x) {
  x = (x + 1.0) / (x - 1.0);
  if (x < 0.0) {
    return 0.5 * log(-x);
  }
  return 0.5 * log(x);
}

float cbrt(float x) {
  if (x >= 0.0) {
    return pow(x, 1.0 / 3.0);
  } else {
    return -pow(x, 1.0 / 3.0);
  }
}

float cosh(float x) {
  return (pow(${Math.E}, x) + pow(${Math.E}, -x)) / 2.0; 
}

float expm1(float x) {
  return pow(${Math.E}, x) - 1.0; 
}

float fround(highp float x) {
  return x;
}

float imul(float v1, float v2) {
  return float(int(v1) * int(v2));
}

float log10(float x) {
  return log2(x) * (1.0 / log2(10.0));
}

float log1p(float x) {
  return log(1.0 + x);
}

float _pow(float v1, float v2) {
  if (v2 == 0.0) return 1.0;
  return pow(v1, v2);
}

float tanh(float x) {
  float e = exp(2.0 * x);
  return (e - 1.0) / (e + 1.0);
}

float trunc(float x) {
  if (x >= 0.0) {
    return floor(x); 
  } else {
    return ceil(x);
  }
}

vec4 _round(vec4 x) {
  return floor(x + 0.5);
}

float _round(float x) {
  return floor(x + 0.5);
}

const int BIT_COUNT = 32;
int modi(int x, int y) {
  return x - y * (x / y);
}

int bitwiseOr(int a, int b) {
  int result = 0;
  int n = 1;
  
  for (int i = 0; i < BIT_COUNT; i++) {
    if ((modi(a, 2) == 1) || (modi(b, 2) == 1)) {
      result += n;
    }
    a = a / 2;
    b = b / 2;
    n = n * 2;
    if(!(a > 0 || b > 0)) {
      break;
    }
  }
  return result;
}
int bitwiseXOR(int a, int b) {
  int result = 0;
  int n = 1;
  
  for (int i = 0; i < BIT_COUNT; i++) {
    if ((modi(a, 2) == 1) != (modi(b, 2) == 1)) {
      result += n;
    }
    a = a / 2;
    b = b / 2;
    n = n * 2;
    if(!(a > 0 || b > 0)) {
      break;
    }
  }
  return result;
}
int bitwiseAnd(int a, int b) {
  int result = 0;
  int n = 1;
  for (int i = 0; i < BIT_COUNT; i++) {
    if ((modi(a, 2) == 1) && (modi(b, 2) == 1)) {
      result += n;
    }
    a = a / 2;
    b = b / 2;
    n = n * 2;
    if(!(a > 0 && b > 0)) {
      break;
    }
  }
  return result;
}
int bitwiseNot(int a) {
  int result = 0;
  int n = 1;
  
  for (int i = 0; i < BIT_COUNT; i++) {
    if (modi(a, 2) == 0) {
      result += n;    
    }
    a = a / 2;
    n = n * 2;
  }
  return result;
}
int bitwiseZeroFillLeftShift(int n, int shift) {
  int maxBytes = BIT_COUNT;
  for (int i = 0; i < BIT_COUNT; i++) {
    if (maxBytes >= n) {
      break;
    }
    maxBytes *= 2;
  }
  for (int i = 0; i < BIT_COUNT; i++) {
    if (i >= shift) {
      break;
    }
    n *= 2;
  }

  int result = 0;
  int byteVal = 1;
  for (int i = 0; i < BIT_COUNT; i++) {
    if (i >= maxBytes) break;
    if (modi(n, 2) > 0) { result += byteVal; }
    n = int(n / 2);
    byteVal *= 2;
  }
  return result;
}

int bitwiseSignedRightShift(int num, int shifts) {
  return int(floor(float(num) / pow(2.0, float(shifts))));
}

int bitwiseZeroFillRightShift(int n, int shift) {
  int maxBytes = BIT_COUNT;
  for (int i = 0; i < BIT_COUNT; i++) {
    if (maxBytes >= n) {
      break;
    }
    maxBytes *= 2;
  }
  for (int i = 0; i < BIT_COUNT; i++) {
    if (i >= shift) {
      break;
    }
    n /= 2;
  }
  int result = 0;
  int byteVal = 1;
  for (int i = 0; i < BIT_COUNT; i++) {
    if (i >= maxBytes) break;
    if (modi(n, 2) > 0) { result += byteVal; }
    n = int(n / 2);
    byteVal *= 2;
  }
  return result;
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
float decode32(vec4 texel) {
  __DECODE32_ENDIANNESS__;
  texel *= 255.0;
  vec2 gte128;
  gte128.x = texel.b >= 128.0 ? 1.0 : 0.0;
  gte128.y = texel.a >= 128.0 ? 1.0 : 0.0;
  float exponent = 2.0 * texel.a - 127.0 + dot(gte128, MAGIC_VEC);
  float res = exp2(_round(exponent));
  texel.b = texel.b - 128.0 * gte128.x;
  res = dot(texel, SCALE_FACTOR) * exp2(_round(exponent-23.0)) + res;
  res *= gte128.y * -2.0 + 1.0;
  return res;
}

float decode16(vec4 texel, int index) {
  int channel = integerMod(index, 2);
  if (channel == 0) return texel.r * 255.0 + texel.g * 65280.0;
  if (channel == 1) return texel.b * 255.0 + texel.a * 65280.0;
  return 0.0;
}

float decode8(vec4 texel, int index) {
  int channel = integerMod(index, 4);
  if (channel == 0) return texel.r * 255.0;
  if (channel == 1) return texel.g * 255.0;
  if (channel == 2) return texel.b * 255.0;
  if (channel == 3) return texel.a * 255.0;
  return 0.0;
}

vec4 legacyEncode32(float f) {
  float F = abs(f);
  float sign = f < 0.0 ? 1.0 : 0.0;
  float exponent = floor(log2(F));
  float mantissa = (exp2(-exponent) * F);
  // exponent += floor(log2(mantissa));
  vec4 texel = vec4(F * exp2(23.0-exponent)) * SCALE_FACTOR_INV;
  texel.rg = integerMod(texel.rg, 256.0);
  texel.b = integerMod(texel.b, 128.0);
  texel.a = exponent*0.5 + 63.5;
  texel.ba += vec2(integerMod(exponent+127.0, 2.0), sign) * 128.0;
  texel = floor(texel);
  texel *= 0.003921569; // 1/255
  __ENCODE32_ENDIANNESS__;
  return texel;
}

// https://github.com/gpujs/gpu.js/wiki/Encoder-details
vec4 encode32(float value) {
  if (value == 0.0) return vec4(0, 0, 0, 0);

  float exponent;
  float mantissa;
  vec4  result;
  float sgn;

  sgn = step(0.0, -value);
  value = abs(value);

  exponent = floor(log2(value));

  mantissa = value*pow(2.0, -exponent)-1.0;
  exponent = exponent+127.0;
  result   = vec4(0,0,0,0);

  result.a = floor(exponent/2.0);
  exponent = exponent - result.a*2.0;
  result.a = result.a + 128.0*sgn;

  result.b = floor(mantissa * 128.0);
  mantissa = mantissa - result.b / 128.0;
  result.b = result.b + exponent*128.0;

  result.g = floor(mantissa*32768.0);
  mantissa = mantissa - result.g/32768.0;

  result.r = floor(mantissa*8388608.0);
  return result/255.0;
}
// Dragons end here

int index;
ivec3 threadId;

ivec3 indexTo3D(int idx, ivec3 texDim) {
  int z = int(idx / (texDim.x * texDim.y));
  idx -= z * int(texDim.x * texDim.y);
  int y = int(idx / texDim.x);
  int x = int(integerMod(idx, texDim.x));
  return ivec3(x, y, z);
}

float get32(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + texDim.x * (y + texDim.y * z);
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture2D(tex, st / vec2(texSize));
  return decode32(texel);
}

float get16(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + texDim.x * (y + texDim.y * z);
  int w = texSize.x * 2;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture2D(tex, st / vec2(texSize.x * 2, texSize.y));
  return decode16(texel, index);
}

float get8(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + texDim.x * (y + texDim.y * z);
  int w = texSize.x * 4;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture2D(tex, st / vec2(texSize.x * 4, texSize.y));
  return decode8(texel, index);
}

float getMemoryOptimized32(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + texDim.x * (y + texDim.y * z);
  int channel = integerMod(index, 4);
  index = index / 4;
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture2D(tex, st / vec2(texSize));
  if (channel == 0) return texel.r;
  if (channel == 1) return texel.g;
  if (channel == 2) return texel.b;
  if (channel == 3) return texel.a;
  return 0.0;
}

vec4 getImage2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + texDim.x * (y + texDim.y * z);
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  return texture2D(tex, st / vec2(texSize));
}

float getFloatFromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  vec4 result = getImage2D(tex, texSize, texDim, z, y, x);
  return result[0];
}

vec2 getVec2FromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  vec4 result = getImage2D(tex, texSize, texDim, z, y, x);
  return vec2(result[0], result[1]);
}

vec2 getMemoryOptimizedVec2(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + (texDim.x * (y + (texDim.y * z)));
  int channel = integerMod(index, 2);
  index = index / 2;
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture2D(tex, st / vec2(texSize));
  if (channel == 0) return vec2(texel.r, texel.g);
  if (channel == 1) return vec2(texel.b, texel.a);
  return vec2(0.0, 0.0);
}

vec3 getVec3FromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  vec4 result = getImage2D(tex, texSize, texDim, z, y, x);
  return vec3(result[0], result[1], result[2]);
}

vec3 getMemoryOptimizedVec3(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int fieldIndex = 3 * (x + texDim.x * (y + texDim.y * z));
  int vectorIndex = fieldIndex / 4;
  int vectorOffset = fieldIndex - vectorIndex * 4;
  int readY = vectorIndex / texSize.x;
  int readX = vectorIndex - readY * texSize.x;
  vec4 tex1 = texture2D(tex, (vec2(readX, readY) + 0.5) / vec2(texSize));
  
  if (vectorOffset == 0) {
    return tex1.xyz;
  } else if (vectorOffset == 1) {
    return tex1.yzw;
  } else {
    readX++;
    if (readX >= texSize.x) {
      readX = 0;
      readY++;
    }
    vec4 tex2 = texture2D(tex, vec2(readX, readY) / vec2(texSize));
    if (vectorOffset == 2) {
      return vec3(tex1.z, tex1.w, tex2.x);
    } else {
      return vec3(tex1.w, tex2.x, tex2.y);
    }
  }
}

vec4 getVec4FromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  return getImage2D(tex, texSize, texDim, z, y, x);
}

vec4 getMemoryOptimizedVec4(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + texDim.x * (y + texDim.y * z);
  int channel = integerMod(index, 2);
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture2D(tex, st / vec2(texSize));
  return vec4(texel.r, texel.g, texel.b, texel.a);
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

float modulo(float number, float divisor) {
  if (number < 0.0) {
    number = abs(number);
    if (divisor < 0.0) {
      divisor = abs(divisor);
    }
    return -mod(number, divisor);
  }
  if (divisor < 0.0) {
    divisor = abs(divisor);
  }
  return mod(number, divisor);
}

__INJECTED_NATIVE__;
__MAIN_CONSTANTS__;
__MAIN_ARGUMENTS__;
__KERNEL__;

void main(void) {
  index = int(vTexCoord.s * float(uTexSize.x)) + int(vTexCoord.t * float(uTexSize.y)) * uTexSize.x;
  __MAIN_RESULT__;
}`;

module.exports = {
  fragmentShader
};

/***/ }),

/***/ "./src/backend/web-gl/function-node.js":
/*!*********************************************!*\
  !*** ./src/backend/web-gl/function-node.js ***!
  \*********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../utils */ "./src/utils.js");
const { FunctionNode } = __webpack_require__(/*! ../function-node */ "./src/backend/function-node.js");

/**
 * @desc [INTERNAL] Takes in a function node, and does all the AST voodoo required to toString its respective WebGL code
 */
class WebGLFunctionNode extends FunctionNode {
  constructor(source, settings) {
    super(source, settings);
    if (settings && settings.hasOwnProperty('fixIntegerDivisionAccuracy')) {
      this.fixIntegerDivisionAccuracy = settings.fixIntegerDivisionAccuracy;
    }
  }

  astConditionalExpression(ast, retArr) {
    if (ast.type !== 'ConditionalExpression') {
      throw this.astErrorOutput('Not a conditional expression', ast);
    }
    const consequentType = this.getType(ast.consequent);
    const alternateType = this.getType(ast.alternate);
    // minification handling if void
    if (consequentType === null && alternateType === null) {
      retArr.push('if (');
      this.astGeneric(ast.test, retArr);
      retArr.push(') {');
      this.astGeneric(ast.consequent, retArr);
      retArr.push(';');
      retArr.push('} else {');
      this.astGeneric(ast.alternate, retArr);
      retArr.push(';');
      retArr.push('}');
      return retArr;
    }
    retArr.push('(');
    this.astGeneric(ast.test, retArr);
    retArr.push('?');
    this.astGeneric(ast.consequent, retArr);
    retArr.push(':');
    this.astGeneric(ast.alternate, retArr);
    retArr.push(')');
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for to its *named function*
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astFunction(ast, retArr) {
    // Setup function return type and name
    if (this.isRootKernel) {
      retArr.push('void');
    } else {
      // looking up return type, this is a little expensive, and can be avoided if returnType is set
      if (!this.returnType) {
        const lastReturn = this.findLastReturn();
        if (lastReturn) {
          this.returnType = this.getType(ast.body);
          if (this.returnType === 'LiteralInteger') {
            this.returnType = 'Number';
          }
        }
      }

      const { returnType } = this;
      if (!returnType) {
        retArr.push('void');
      } else {
        const type = typeMap[returnType];
        if (!type) {
          throw new Error(`unknown type ${returnType}`);
        }
        retArr.push(type);
      }
    }
    retArr.push(' ');
    retArr.push(this.name);
    retArr.push('(');

    if (!this.isRootKernel) {
      // Arguments handling
      for (let i = 0; i < this.argumentNames.length; ++i) {
        const argumentName = this.argumentNames[i];

        if (i > 0) {
          retArr.push(', ');
        }
        let argumentType = this.argumentTypes[this.argumentNames.indexOf(argumentName)];
        // The type is too loose ended, here we decide to solidify a type, lets go with float
        if (!argumentType) {
          throw this.astErrorOutput(`Unknown argument ${argumentName} type`, ast);
        }
        if (argumentType === 'LiteralInteger') {
          this.argumentTypes[i] = argumentType = 'Number';
        }
        const type = typeMap[argumentType];
        if (!type) {
          throw this.astErrorOutput('Unexpected expression', ast);
        }
        const name = utils.sanitizeName(argumentName);
        if (type === 'sampler2D' || type === 'sampler2DArray') {
          // mash needed arguments together, since now we have end to end inference
          retArr.push(`${type} user_${name},ivec2 user_${name}Size,ivec3 user_${name}Dim`);
        } else {
          retArr.push(`${type} user_${name}`);
        }
      }
    }

    // Function opening
    retArr.push(') {\n');

    // Body statement iteration
    for (let i = 0; i < ast.body.body.length; ++i) {
      this.astGeneric(ast.body.body[i], retArr);
      retArr.push('\n');
    }

    // Function closing
    retArr.push('}\n');
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for to *return* statement
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astReturnStatement(ast, retArr) {
    if (!ast.argument) throw this.astErrorOutput('Unexpected return statement', ast);
    this.pushState('skip-literal-correction');
    const type = this.getType(ast.argument);
    this.popState('skip-literal-correction');

    const result = [];

    if (!this.returnType) {
      if (type === 'LiteralInteger' || type === 'Integer') {
        this.returnType = 'Number';
      } else {
        this.returnType = type;
      }
    }

    switch (this.returnType) {
      case 'LiteralInteger':
      case 'Number':
      case 'Float':
        switch (type) {
          case 'Integer':
            result.push('float(');
            this.astGeneric(ast.argument, result);
            result.push(')');
            break;
          case 'LiteralInteger':
            this.castLiteralToFloat(ast.argument, result);

            // Running astGeneric forces the LiteralInteger to pick a type, and here, if we are returning a float, yet
            // the LiteralInteger has picked to be an integer because of constraints on it we cast it to float.
            if (this.getType(ast) === 'Integer') {
              result.unshift('float(');
              result.push(')');
            }
            break;
          default:
            this.astGeneric(ast.argument, result);
        }
        break;
      case 'Integer':
        switch (type) {
          case 'Float':
          case 'Number':
            this.castValueToInteger(ast.argument, result);
            break;
          case 'LiteralInteger':
            this.castLiteralToInteger(ast.argument, result);
            break;
          default:
            this.astGeneric(ast.argument, result);
        }
        break;
      case 'Array(4)':
      case 'Array(3)':
      case 'Array(2)':
      case 'Matrix(2)':
      case 'Matrix(3)':
      case 'Matrix(4)':
      case 'Input':
        this.astGeneric(ast.argument, result);
        break;
      default:
        throw this.astErrorOutput(`unhandled return type ${this.returnType}`, ast);
    }

    if (this.isRootKernel) {
      retArr.push(`kernelResult = ${ result.join('') };`);
      retArr.push('return;');
    } else if (this.isSubKernel) {
      retArr.push(`subKernelResult_${ this.name } = ${ result.join('') };`);
      retArr.push(`return subKernelResult_${ this.name };`);
    } else {
      retArr.push(`return ${ result.join('') };`);
    }
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *literal value*
   *
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   *
   * @returns {Array} the append retArr
   */
  astLiteral(ast, retArr) {
    // Reject non numeric literals
    if (isNaN(ast.value)) {
      throw this.astErrorOutput(
        'Non-numeric literal not supported : ' + ast.value,
        ast
      );
    }

    const key = this.astKey(ast);
    if (Number.isInteger(ast.value)) {
      if (this.isState('casting-to-integer') || this.isState('building-integer')) {
        this.literalTypes[key] = 'Integer';
        retArr.push(`${ast.value}`);
      } else if (this.isState('casting-to-float') || this.isState('building-float')) {
        this.literalTypes[key] = 'Number';
        retArr.push(`${ast.value}.0`);
      } else {
        this.literalTypes[key] = 'Number';
        retArr.push(`${ast.value}.0`);
      }
    } else if (this.isState('casting-to-integer') || this.isState('building-integer')) {
      this.literalTypes[key] = 'Integer';
      retArr.push(Math.round(ast.value));
    } else {
      this.literalTypes[key] = 'Number';
      retArr.push(`${ast.value}`);
    }
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *binary* expression
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astBinaryExpression(ast, retArr) {
    if (this.checkAndUpconvertOperator(ast, retArr)) {
      return retArr;
    }

    if (this.fixIntegerDivisionAccuracy && ast.operator === '/') {
      retArr.push('divWithIntCheck(');
      this.pushState('building-float');
      switch (this.getType(ast.left)) {
        case 'Integer':
          this.castValueToFloat(ast.left, retArr);
          break;
        case 'LiteralInteger':
          this.castLiteralToFloat(ast.left, retArr);
          break;
        default:
          this.astGeneric(ast.left, retArr);
      }
      retArr.push(', ');
      switch (this.getType(ast.right)) {
        case 'Integer':
          this.castValueToFloat(ast.right, retArr);
          break;
        case 'LiteralInteger':
          this.castLiteralToFloat(ast.right, retArr);
          break;
        default:
          this.astGeneric(ast.right, retArr);
      }
      this.popState('building-float');
      retArr.push(')');
      return retArr;
    }

    retArr.push('(');
    const leftType = this.getType(ast.left) || 'Number';
    const rightType = this.getType(ast.right) || 'Number';
    if (!leftType || !rightType) {
      throw this.astErrorOutput(`Unhandled binary expression`, ast);
    }
    const key = leftType + ' & ' + rightType;
    switch (key) {
      case 'Integer & Integer':
        this.pushState('building-integer');
        this.astGeneric(ast.left, retArr);
        retArr.push(operatorMap[ast.operator] || ast.operator);
        this.astGeneric(ast.right, retArr);
        this.popState('building-integer');
        break;
      case 'Number & Float':
      case 'Float & Number':
      case 'Float & Float':
      case 'Number & Number':
        this.pushState('building-float');
        this.astGeneric(ast.left, retArr);
        retArr.push(operatorMap[ast.operator] || ast.operator);
        this.astGeneric(ast.right, retArr);
        this.popState('building-float');
        break;
      case 'LiteralInteger & LiteralInteger':
        if (this.isState('casting-to-integer') || this.isState('building-integer')) {
          this.pushState('building-integer');
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.astGeneric(ast.right, retArr);
          this.popState('building-integer');
        } else {
          this.pushState('building-float');
          this.castLiteralToFloat(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.castLiteralToFloat(ast.right, retArr);
          this.popState('building-float');
        }
        break;

      case 'Integer & Float':
      case 'Integer & Number':
        if (ast.operator === '>' || ast.operator === '<' && ast.right.type === 'Literal') {
          // if right value is actually a float, don't loose that information, cast left to right rather than the usual right to left
          if (!Number.isInteger(ast.right.value)) {
            this.pushState('building-float');
            this.castValueToFloat(ast.left, retArr);
            retArr.push(operatorMap[ast.operator] || ast.operator);
            this.astGeneric(ast.right, retArr);
            this.popState('building-float');
            break;
          }
        }
        this.pushState('building-integer');
        this.astGeneric(ast.left, retArr);
        retArr.push(operatorMap[ast.operator] || ast.operator);
        this.pushState('casting-to-integer');
        if (ast.right.type === 'Literal') {
          const literalResult = [];
          this.astGeneric(ast.right, literalResult);
          const literalType = this.getType(ast.right);
          if (literalType === 'Integer') {
            retArr.push(literalResult.join(''));
          } else {
            throw this.astErrorOutput(`Unhandled binary expression with literal`, ast);
          }
        } else {
          retArr.push('int(');
          this.astGeneric(ast.right, retArr);
          retArr.push(')');
        }
        this.popState('casting-to-integer');
        this.popState('building-integer');
        break;
      case 'Integer & LiteralInteger':
        this.pushState('building-integer');
        this.astGeneric(ast.left, retArr);
        retArr.push(operatorMap[ast.operator] || ast.operator);
        this.castLiteralToInteger(ast.right, retArr);
        this.popState('building-integer');
        break;

      case 'Number & Integer':
        this.pushState('building-float');
        this.astGeneric(ast.left, retArr);
        retArr.push(operatorMap[ast.operator] || ast.operator);
        this.castValueToFloat(ast.right, retArr);
        this.popState('building-float');
        break;
      case 'Float & LiteralInteger':
      case 'Number & LiteralInteger':
        this.pushState('building-float');
        this.astGeneric(ast.left, retArr);
        retArr.push(operatorMap[ast.operator] || ast.operator);
        this.castLiteralToFloat(ast.right, retArr);
        this.popState('building-float');
        break;
      case 'LiteralInteger & Float':
      case 'LiteralInteger & Number':
        if (this.isState('casting-to-integer')) {
          this.pushState('building-integer');
          this.castLiteralToInteger(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.castValueToInteger(ast.right, retArr);
          this.popState('building-integer');
        } else {
          this.pushState('building-float');
          this.astGeneric(ast.left, retArr);
          retArr.push(operatorMap[ast.operator] || ast.operator);
          this.pushState('casting-to-float');
          this.astGeneric(ast.right, retArr);
          this.popState('casting-to-float');
          this.popState('building-float');
        }
        break;
      case 'LiteralInteger & Integer':
        this.pushState('building-integer');
        this.castLiteralToInteger(ast.left, retArr);
        retArr.push(operatorMap[ast.operator] || ast.operator);
        this.astGeneric(ast.right, retArr);
        this.popState('building-integer');
        break;

      case 'Boolean & Boolean':
        this.pushState('building-boolean');
        this.astGeneric(ast.left, retArr);
        retArr.push(operatorMap[ast.operator] || ast.operator);
        this.astGeneric(ast.right, retArr);
        this.popState('building-boolean');
        break;

      case 'Float & Integer':
        this.pushState('building-float');
        this.astGeneric(ast.left, retArr);
        retArr.push(operatorMap[ast.operator] || ast.operator);
        this.castValueToFloat(ast.right, retArr);
        this.popState('building-float');
        break;

      default:
        throw this.astErrorOutput(`Unhandled binary expression between ${key}`, ast);
    }
    retArr.push(')');

    return retArr;
  }

  checkAndUpconvertOperator(ast, retArr) {
    const bitwiseResult = this.checkAndUpconvertBitwiseOperators(ast, retArr);
    if (bitwiseResult) {
      return bitwiseResult;
    }
    const upconvertableOperators = {
      '%': this.fixIntegerDivisionAccuracy ? 'integerCorrectionModulo' : 'modulo',
      '**': 'pow',
    };
    const foundOperator = upconvertableOperators[ast.operator];
    if (!foundOperator) return null;
    retArr.push(foundOperator);
    retArr.push('(');
    switch (this.getType(ast.left)) {
      case 'Integer':
        this.castValueToFloat(ast.left, retArr);
        break;
      case 'LiteralInteger':
        this.castLiteralToFloat(ast.left, retArr);
        break;
      default:
        this.astGeneric(ast.left, retArr);
    }
    retArr.push(',');
    switch (this.getType(ast.right)) {
      case 'Integer':
        this.castValueToFloat(ast.right, retArr);
        break;
      case 'LiteralInteger':
        this.castLiteralToFloat(ast.right, retArr);
        break;
      default:
        this.astGeneric(ast.right, retArr);
    }
    retArr.push(')');
    return retArr;
  }

  checkAndUpconvertBitwiseOperators(ast, retArr) {
    const upconvertableOperators = {
      '&': 'bitwiseAnd',
      '|': 'bitwiseOr',
      '^': 'bitwiseXOR',
      '<<': 'bitwiseZeroFillLeftShift',
      '>>': 'bitwiseSignedRightShift',
      '>>>': 'bitwiseZeroFillRightShift',
    };
    const foundOperator = upconvertableOperators[ast.operator];
    if (!foundOperator) return null;
    retArr.push(foundOperator);
    retArr.push('(');
    const leftType = this.getType(ast.left);
    switch (leftType) {
      case 'Number':
      case 'Float':
        this.castValueToInteger(ast.left, retArr);
        break;
      case 'LiteralInteger':
        this.castLiteralToInteger(ast.left, retArr);
        break;
      default:
        this.astGeneric(ast.left, retArr);
    }
    retArr.push(',');
    const rightType = this.getType(ast.right);
    switch (rightType) {
      case 'Number':
      case 'Float':
        this.castValueToInteger(ast.right, retArr);
        break;
      case 'LiteralInteger':
        this.castLiteralToInteger(ast.right, retArr);
        break;
      default:
        this.astGeneric(ast.right, retArr);
    }
    retArr.push(')');
    return retArr;
  }

  checkAndUpconvertBitwiseUnary(ast, retArr) {
    const upconvertableOperators = {
      '~': 'bitwiseNot',
    };
    const foundOperator = upconvertableOperators[ast.operator];
    if (!foundOperator) return null;
    retArr.push(foundOperator);
    retArr.push('(');
    switch (this.getType(ast.argument)) {
      case 'Number':
      case 'Float':
        this.castValueToInteger(ast.argument, retArr);
        break;
      case 'LiteralInteger':
        this.castLiteralToInteger(ast.argument, retArr);
        break;
      default:
        this.astGeneric(ast.argument, retArr);
    }
    retArr.push(')');
    return retArr;
  }

  /**
   *
   * @param {Object} ast
   * @param {Array} retArr
   * @return {String[]}
   */
  castLiteralToInteger(ast, retArr) {
    this.pushState('casting-to-integer');
    this.astGeneric(ast, retArr);
    this.popState('casting-to-integer');
    return retArr;
  }

  /**
   *
   * @param {Object} ast
   * @param {Array} retArr
   * @return {String[]}
   */
  castLiteralToFloat(ast, retArr) {
    this.pushState('casting-to-float');
    this.astGeneric(ast, retArr);
    this.popState('casting-to-float');
    return retArr;
  }

  /**
   *
   * @param {Object} ast
   * @param {Array} retArr
   * @return {String[]}
   */
  castValueToInteger(ast, retArr) {
    this.pushState('casting-to-integer');
    retArr.push('int(');
    this.astGeneric(ast, retArr);
    retArr.push(')');
    this.popState('casting-to-integer');
    return retArr;
  }

  /**
   *
   * @param {Object} ast
   * @param {Array} retArr
   * @return {String[]}
   */
  castValueToFloat(ast, retArr) {
    this.pushState('casting-to-float');
    retArr.push('float(');
    this.astGeneric(ast, retArr);
    retArr.push(')');
    this.popState('casting-to-float');
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *identifier* expression
   * @param {Object} idtNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astIdentifierExpression(idtNode, retArr) {
    if (idtNode.type !== 'Identifier') {
      throw this.astErrorOutput('IdentifierExpression - not an Identifier', idtNode);
    }

    const type = this.getType(idtNode);

    const name = utils.sanitizeName(idtNode.name);
    if (idtNode.name === 'Infinity') {
      // https://stackoverflow.com/a/47543127/1324039
      retArr.push('3.402823466e+38');
    } else if (type === 'Boolean') {
      if (this.argumentNames.indexOf(name) > -1) {
        retArr.push(`bool(user_${name})`);
      } else {
        retArr.push(`user_${name}`);
      }
    } else {
      retArr.push(`user_${name}`);
    }

    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *for-loop* expression
   * @param {Object} forNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the parsed webgl string
   */
  astForStatement(forNode, retArr) {
    if (forNode.type !== 'ForStatement') {
      throw this.astErrorOutput('Invalid for statement', forNode);
    }

    const initArr = [];
    const testArr = [];
    const updateArr = [];
    const bodyArr = [];
    let isSafe = null;

    if (forNode.init) {
      const { declarations } = forNode.init;
      if (declarations.length > 1) {
        isSafe = false;
      }
      this.astGeneric(forNode.init, initArr);
      for (let i = 0; i < declarations.length; i++) {
        if (declarations[i].init && declarations[i].init.type !== 'Literal') {
          isSafe = false;
        }
      }
    } else {
      isSafe = false;
    }

    if (forNode.test) {
      this.astGeneric(forNode.test, testArr);
    } else {
      isSafe = false;
    }

    if (forNode.update) {
      this.astGeneric(forNode.update, updateArr);
    } else {
      isSafe = false;
    }

    if (forNode.body) {
      this.pushState('loop-body');
      this.astGeneric(forNode.body, bodyArr);
      this.popState('loop-body');
    }

    // have all parts, now make them safe
    if (isSafe === null) {
      isSafe = this.isSafe(forNode.init) && this.isSafe(forNode.test);
    }

    if (isSafe) {
      const initString = initArr.join('');
      const initNeedsSemiColon = initString[initString.length - 1] !== ';';
      retArr.push(`for (${initString}${initNeedsSemiColon ? ';' : ''}${testArr.join('')};${updateArr.join('')}){\n`);
      retArr.push(bodyArr.join(''));
      retArr.push('}\n');
    } else {
      const iVariableName = this.getInternalVariableName('safeI');
      if (initArr.length > 0) {
        retArr.push(initArr.join(''), '\n');
      }
      retArr.push(`for (int ${iVariableName}=0;${iVariableName}<LOOP_MAX;${iVariableName}++){\n`);
      if (testArr.length > 0) {
        retArr.push(`if (!${testArr.join('')}) break;\n`);
      }
      retArr.push(bodyArr.join(''));
      retArr.push(`\n${updateArr.join('')};`);
      retArr.push('}\n');
    }
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *while* loop
   * @param {Object} whileNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the parsed webgl string
   */
  astWhileStatement(whileNode, retArr) {
    if (whileNode.type !== 'WhileStatement') {
      throw this.astErrorOutput('Invalid while statement', whileNode);
    }

    const iVariableName = this.getInternalVariableName('safeI');
    retArr.push(`for (int ${iVariableName}=0;${iVariableName}<LOOP_MAX;${iVariableName}++){\n`);
    retArr.push('if (!');
    this.astGeneric(whileNode.test, retArr);
    retArr.push(') break;\n');
    this.astGeneric(whileNode.body, retArr);
    retArr.push('}\n');

    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *do while* loop
   * @param {Object} doWhileNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the parsed webgl string
   */
  astDoWhileStatement(doWhileNode, retArr) {
    if (doWhileNode.type !== 'DoWhileStatement') {
      throw this.astErrorOutput('Invalid while statement', doWhileNode);
    }

    const iVariableName = this.getInternalVariableName('safeI');
    retArr.push(`for (int ${iVariableName}=0;${iVariableName}<LOOP_MAX;${iVariableName}++){\n`);
    this.astGeneric(doWhileNode.body, retArr);
    retArr.push('if (!');
    this.astGeneric(doWhileNode.test, retArr);
    retArr.push(') break;\n');
    retArr.push('}\n');

    return retArr;
  }


  /**
   * @desc Parses the abstract syntax tree for *Assignment* Expression
   * @param {Object} assNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astAssignmentExpression(assNode, retArr) {
    // TODO: casting needs implemented here
    if (assNode.operator === '%=') {
      this.astGeneric(assNode.left, retArr);
      retArr.push('=');
      retArr.push('mod(');
      this.astGeneric(assNode.left, retArr);
      retArr.push(',');
      this.astGeneric(assNode.right, retArr);
      retArr.push(')');
    } else if (assNode.operator === '**=') {
      this.astGeneric(assNode.left, retArr);
      retArr.push('=');
      retArr.push('pow(');
      this.astGeneric(assNode.left, retArr);
      retArr.push(',');
      this.astGeneric(assNode.right, retArr);
      retArr.push(')');
    } else {
      const leftType = this.getType(assNode.left);
      const rightType = this.getType(assNode.right);
      this.astGeneric(assNode.left, retArr);
      retArr.push(assNode.operator);
      if (leftType !== 'Integer' && rightType === 'Integer') {
        retArr.push('float(');
        this.astGeneric(assNode.right, retArr);
        retArr.push(')');
      } else {
        this.astGeneric(assNode.right, retArr);
      }
      return retArr;
    }
  }

  /**
   * @desc Parses the abstract syntax tree for *Block* statement
   * @param {Object} bNode - the AST object to parse
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astBlockStatement(bNode, retArr) {
    if (this.isState('loop-body')) {
      this.pushState('block-body'); // this prevents recursive removal of braces
      for (let i = 0; i < bNode.body.length; i++) {
        this.astGeneric(bNode.body[i], retArr);
      }
      this.popState('block-body');
    } else {
      retArr.push('{\n');
      for (let i = 0; i < bNode.body.length; i++) {
        this.astGeneric(bNode.body[i], retArr);
      }
      retArr.push('}\n');
    }
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *Variable Declaration*
   * @param {Object} varDecNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astVariableDeclaration(varDecNode, retArr) {
    const declarations = varDecNode.declarations;
    if (!declarations || !declarations[0] || !declarations[0].init) {
      throw this.astErrorOutput('Unexpected expression', varDecNode);
    }
    const result = [];
    let lastType = null;
    const declarationSets = [];
    let declarationSet = [];
    for (let i = 0; i < declarations.length; i++) {
      const declaration = declarations[i];
      const init = declaration.init;
      const info = this.getDeclaration(declaration.id);
      const actualType = this.getType(declaration.init);
      let type = actualType;
      if (type === 'LiteralInteger') {
        if (info.suggestedType === 'Integer') {
          type = 'Integer';
        } else {
          // We had the choice to go either float or int, choosing float
          type = 'Number';
        }
      }
      const markupType = typeMap[type];
      if (!markupType) {
        throw this.astErrorOutput(`Markup type ${ type } not handled`, varDecNode);
      }
      const declarationResult = [];
      if (actualType === 'Integer' && type === 'Integer') {
        // Since we are assigning to a float, ensure valueType is reset to that
        info.valueType = 'Number';
        if (i === 0 || lastType === null) {
          declarationResult.push('float ');
        } else if (type !== lastType) {
          throw new Error('Unhandled declaration');
        }
        lastType = type;
        declarationResult.push(`user_${utils.sanitizeName(declaration.id.name)}=`);
        declarationResult.push('float(');
        this.astGeneric(init, declarationResult);
        declarationResult.push(')');
      } else {
        // Since we are assigning to a float, ensure valueType is reset to that
        info.valueType = type;
        if (i === 0 || lastType === null) {
          declarationResult.push(`${markupType} `);
        } else if (type !== lastType) {
          declarationSets.push(declarationSet.join(','));
          declarationSet = [];
          declarationResult.push(`${markupType} `);
        }
        lastType = type;
        declarationResult.push(`user_${utils.sanitizeName(declaration.id.name)}=`);
        if (actualType === 'Number' && type === 'Integer') {
          if (init.left && init.left.type === 'Literal') {
            this.astGeneric(init, declarationResult);
          } else {
            declarationResult.push('int(');
            this.astGeneric(init, declarationResult);
            declarationResult.push(')');
          }
        } else if (actualType === 'LiteralInteger' && type === 'Integer') {
          this.castLiteralToInteger(init, declarationResult);
        } else {
          this.astGeneric(init, declarationResult);
        }
      }
      declarationSet.push(declarationResult.join(''));
    }

    if (declarationSet.length > 0) {
      declarationSets.push(declarationSet.join(','));
    }

    result.push(declarationSets.join(';'));

    retArr.push(result.join(''));
    retArr.push(';');
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *If* Statement
   * @param {Object} ifNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astIfStatement(ifNode, retArr) {
    retArr.push('if (');
    this.astGeneric(ifNode.test, retArr);
    retArr.push(')');
    if (ifNode.consequent.type === 'BlockStatement') {
      this.astGeneric(ifNode.consequent, retArr);
    } else {
      retArr.push(' {\n');
      this.astGeneric(ifNode.consequent, retArr);
      retArr.push('\n}\n');
    }

    if (ifNode.alternate) {
      retArr.push('else ');
      if (ifNode.alternate.type === 'BlockStatement' || ifNode.alternate.type === 'IfStatement') {
        this.astGeneric(ifNode.alternate, retArr);
      } else {
        retArr.push(' {\n');
        this.astGeneric(ifNode.alternate, retArr);
        retArr.push('\n}\n');
      }
    }
    return retArr;
  }

  astSwitchStatement(ast, retArr) {
    if (ast.type !== 'SwitchStatement') {
      throw this.astErrorOutput('Invalid switch statement', ast);
    }
    const { discriminant, cases } = ast;
    const type = this.getType(discriminant);
    const varName = `switchDiscriminant${this.astKey(ast, '_')}`;
    switch (type) {
      case 'Float':
      case 'Number':
        retArr.push(`float ${varName} = `);
        this.astGeneric(discriminant, retArr);
        retArr.push(';\n');
        break;
      case 'Integer':
        retArr.push(`int ${varName} = `);
        this.astGeneric(discriminant, retArr);
        retArr.push(';\n');
        break;
    }
    // switch with just a default:
    if (cases.length === 1 && !cases[0].test) {
      this.astGeneric(cases[0].consequent, retArr);
      return retArr;
    }

    // regular switches:
    let fallingThrough = false;
    let defaultResult = [];
    let movingDefaultToEnd = false;
    let pastFirstIf = false;
    for (let i = 0; i < cases.length; i++) {
      // default
      if (!cases[i].test) {
        if (cases.length > i + 1) {
          movingDefaultToEnd = true;
          this.astGeneric(cases[i].consequent, defaultResult);
          continue;
        } else {
          retArr.push(' else {\n');
        }
      } else {
        // all others
        if (i === 0 || !pastFirstIf) {
          pastFirstIf = true;
          retArr.push(`if (${varName} == `);
        } else {
          if (fallingThrough) {
            retArr.push(`${varName} == `);
            fallingThrough = false;
          } else {
            retArr.push(` else if (${varName} == `);
          }
        }
        if (type === 'Integer') {
          const testType = this.getType(cases[i].test);
          switch (testType) {
            case 'Number':
            case 'Float':
              this.castValueToInteger(cases[i].test, retArr);
              break;
            case 'LiteralInteger':
              this.castLiteralToInteger(cases[i].test, retArr);
              break;
          }
        } else if (type === 'Float') {
          const testType = this.getType(cases[i].test);
          switch (testType) {
            case 'LiteralInteger':
              this.castLiteralToFloat(cases[i].test, retArr);
              break;
            case 'Integer':
              this.castValueToFloat(cases[i].test, retArr);
              break;
          }
        } else {
          throw new Error('unhanlded');
        }
        if (!cases[i].consequent || cases[i].consequent.length === 0) {
          fallingThrough = true;
          retArr.push(' || ');
          continue;
        }
        retArr.push(`) {\n`);
      }
      this.astGeneric(cases[i].consequent, retArr);
      retArr.push('\n}');
    }
    if (movingDefaultToEnd) {
      retArr.push(' else {');
      retArr.push(defaultResult.join(''));
      retArr.push('}');
    }
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *This* expression
   * @param {Object} tNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astThisExpression(tNode, retArr) {
    retArr.push('this');
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *Member* Expression
   * @param {Object} mNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astMemberExpression(mNode, retArr) {
    const {
      property,
      name,
      signature,
      origin,
      type,
      xProperty,
      yProperty,
      zProperty
    } = this.getMemberExpressionDetails(mNode);
    switch (signature) {
      case 'value.thread.value':
      case 'this.thread.value':
        if (name !== 'x' && name !== 'y' && name !== 'z') {
          throw this.astErrorOutput('Unexpected expression, expected `this.thread.x`, `this.thread.y`, or `this.thread.z`', mNode);
        }
        retArr.push(`threadId.${name}`);
        return retArr;
      case 'this.output.value':
        if (this.dynamicOutput) {
          switch (name) {
            case 'x':
              if (this.isState('casting-to-float')) {
                retArr.push('float(uOutputDim.x)');
              } else {
                retArr.push('uOutputDim.x');
              }
              break;
            case 'y':
              if (this.isState('casting-to-float')) {
                retArr.push('float(uOutputDim.y)');
              } else {
                retArr.push('uOutputDim.y');
              }
              break;
            case 'z':
              if (this.isState('casting-to-float')) {
                retArr.push('float(uOutputDim.z)');
              } else {
                retArr.push('uOutputDim.z');
              }
              break;
            default:
              throw this.astErrorOutput('Unexpected expression', mNode);
          }
        } else {
          switch (name) {
            case 'x':
              if (this.isState('casting-to-integer')) {
                retArr.push(this.output[0]);
              } else {
                retArr.push(this.output[0], '.0');
              }
              break;
            case 'y':
              if (this.isState('casting-to-integer')) {
                retArr.push(this.output[1]);
              } else {
                retArr.push(this.output[1], '.0');
              }
              break;
            case 'z':
              if (this.isState('casting-to-integer')) {
                retArr.push(this.output[2]);
              } else {
                retArr.push(this.output[2], '.0');
              }
              break;
            default:
              throw this.astErrorOutput('Unexpected expression', mNode);
          }
        }
        return retArr;
      case 'value':
        throw this.astErrorOutput('Unexpected expression', mNode);
      case 'value[]':
      case 'value[][]':
      case 'value[][][]':
      case 'value[][][][]':
      case 'value.value':
        if (origin === 'Math') {
          retArr.push(Math[name]);
          return retArr;
        }
        const cleanName = utils.sanitizeName(name);
        switch (property) {
          case 'r':
            retArr.push(`user_${ cleanName }.r`);
            return retArr;
          case 'g':
            retArr.push(`user_${ cleanName }.g`);
            return retArr;
          case 'b':
            retArr.push(`user_${ cleanName }.b`);
            return retArr;
          case 'a':
            retArr.push(`user_${ cleanName }.a`);
            return retArr;
        }
        break;
      case 'this.constants.value':
        if (typeof xProperty === 'undefined') {
          switch (type) {
            case 'Array(2)':
            case 'Array(3)':
            case 'Array(4)':
              retArr.push(`constants_${ utils.sanitizeName(name) }`);
              return retArr;
          }
        }
        case 'this.constants.value[]':
        case 'this.constants.value[][]':
        case 'this.constants.value[][][]':
        case 'this.constants.value[][][][]':
          break;
        case 'fn()[]':
          this.astCallExpression(mNode.object, retArr);
          retArr.push('[');
          retArr.push(this.memberExpressionPropertyMarkup(property));
          retArr.push(']');
          return retArr;
        case 'fn()[][]':
          this.astCallExpression(mNode.object.object, retArr);
          retArr.push('[');
          retArr.push(this.memberExpressionPropertyMarkup(mNode.object.property));
          retArr.push(']');
          retArr.push('[');
          retArr.push(this.memberExpressionPropertyMarkup(mNode.property));
          retArr.push(']');
          return retArr;
        case '[][]':
          this.astArrayExpression(mNode.object, retArr);
          retArr.push('[');
          retArr.push(this.memberExpressionPropertyMarkup(property));
          retArr.push(']');
          return retArr;
        default:
          throw this.astErrorOutput('Unexpected expression', mNode);
    }

    if (mNode.computed === false) {
      // handle simple types
      switch (type) {
        case 'Number':
        case 'Integer':
        case 'Float':
        case 'Boolean':
          retArr.push(`${origin}_${utils.sanitizeName(name)}`);
          return retArr;
      }
    }

    // handle more complex types
    // argument may have come from a parent
    const markupName = `${origin}_${utils.sanitizeName(name)}`;

    switch (type) {
      case 'Array(2)':
      case 'Array(3)':
      case 'Array(4)':
        // Get from local vec4
        this.astGeneric(mNode.object, retArr);
        retArr.push('[');
        retArr.push(this.memberExpressionPropertyMarkup(xProperty));
        retArr.push(']');
        break;
      case 'HTMLImageArray':
        retArr.push(`getImage3D(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
        this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
        retArr.push(')');
        break;
      case 'ArrayTexture(1)':
        retArr.push(`getFloatFromSampler2D(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
        this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
        retArr.push(')');
        break;
      case 'Array1D(2)':
      case 'Array2D(2)':
      case 'Array3D(2)':
        retArr.push(`getMemoryOptimizedVec2(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
        this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
        retArr.push(')');
        break;
      case 'ArrayTexture(2)':
        retArr.push(`getVec2FromSampler2D(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
        this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
        retArr.push(')');
        break;
      case 'Array1D(3)':
      case 'Array2D(3)':
      case 'Array3D(3)':
        retArr.push(`getMemoryOptimizedVec3(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
        this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
        retArr.push(')');
        break;
      case 'ArrayTexture(3)':
        retArr.push(`getVec3FromSampler2D(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
        this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
        retArr.push(')');
        break;
      case 'Array1D(4)':
      case 'Array2D(4)':
      case 'Array3D(4)':
        retArr.push(`getMemoryOptimizedVec4(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
        this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
        retArr.push(')');
        break;
      case 'ArrayTexture(4)':
      case 'HTMLCanvas':
      case 'OffscreenCanvas':
      case 'HTMLImage':
      case 'ImageBitmap':
      case 'ImageData':
      case 'HTMLVideo':
        retArr.push(`getVec4FromSampler2D(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
        this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
        retArr.push(')');
        break;
      case 'NumberTexture':
      case 'Array':
      case 'Array2D':
      case 'Array3D':
      case 'Array4D':
      case 'Input':
      case 'Number':
      case 'Float':
      case 'Integer':
        if (this.precision === 'single') {
          // bitRatio is always 4 here, javascript doesn't yet have 8 or 16 bit support
          // TODO: make 8 or 16 bit work anyway!
          retArr.push(`getMemoryOptimized32(${markupName}, ${markupName}Size, ${markupName}Dim, `);
          this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
          retArr.push(')');
        } else {
          const bitRatio = (origin === 'user' ?
            this.lookupFunctionArgumentBitRatio(this.name, name) :
            this.constantBitRatios[name]
          );
          switch (bitRatio) {
            case 1:
              retArr.push(`get8(${markupName}, ${markupName}Size, ${markupName}Dim, `);
              break;
            case 2:
              retArr.push(`get16(${markupName}, ${markupName}Size, ${markupName}Dim, `);
              break;
            case 4:
            case 0:
              retArr.push(`get32(${markupName}, ${markupName}Size, ${markupName}Dim, `);
              break;
            default:
              throw new Error(`unhandled bit ratio of ${bitRatio}`);
          }
          this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
          retArr.push(')');
        }
        break;
      case 'MemoryOptimizedNumberTexture':
        retArr.push(`getMemoryOptimized32(${ markupName }, ${ markupName }Size, ${ markupName }Dim, `);
        this.memberExpressionXYZ(xProperty, yProperty, zProperty, retArr);
        retArr.push(')');
        break;
      case 'Matrix(2)':
      case 'Matrix(3)':
      case 'Matrix(4)':
        retArr.push(`${markupName}[${this.memberExpressionPropertyMarkup(yProperty)}]`);
        if (yProperty) {
          retArr.push(`[${this.memberExpressionPropertyMarkup(xProperty)}]`);
        }
        break;
      default:
        throw new Error(`unhandled member expression "${ type }"`);
    }
    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *call* expression
   * @param {Object} ast - the AST object to parse
   * @param {Array} retArr - return array string
   * @returns  {Array} the append retArr
   */
  astCallExpression(ast, retArr) {
    if (!ast.callee) {
      throw this.astErrorOutput('Unknown CallExpression', ast);
    }

    let functionName = null;
    const isMathFunction = this.isAstMathFunction(ast);

    // Its a math operator or this.something(), remove the prefix
    if (isMathFunction || (ast.callee.object && ast.callee.object.type === 'ThisExpression')) {
      functionName = ast.callee.property.name;
    }
    // Issue #212, BABEL!
    else if (ast.callee.type === 'SequenceExpression' && ast.callee.expressions[0].type === 'Literal' && !isNaN(ast.callee.expressions[0].raw)) {
      functionName = ast.callee.expressions[1].property.name;
    } else {
      functionName = ast.callee.name;
    }

    if (!functionName) {
      throw this.astErrorOutput(`Unhandled function, couldn't find name`, ast);
    }

    // if this if grows to more than one, lets use a switch
    switch (functionName) {
      case 'pow':
        functionName = '_pow';
        break;
      case 'round':
        functionName = '_round';
        break;
    }

    // Register the function into the called registry
    if (this.calledFunctions.indexOf(functionName) < 0) {
      this.calledFunctions.push(functionName);
    }

    if (functionName === 'random' && this.plugins && this.plugins.length > 0) {
      for (let i = 0; i < this.plugins.length; i++) {
        const plugin = this.plugins[i];
        if (plugin.functionMatch === 'Math.random()' && plugin.functionReplace) {
          retArr.push(plugin.functionReplace);
          return retArr;
        }
      }
    }

    // track the function was called
    if (this.onFunctionCall) {
      this.onFunctionCall(this.name, functionName, ast.arguments);
    }

    // Call the function
    retArr.push(functionName);

    // Open arguments space
    retArr.push('(');

    // Add the arguments
    if (isMathFunction) {
      for (let i = 0; i < ast.arguments.length; ++i) {
        const argument = ast.arguments[i];
        const argumentType = this.getType(argument);
        if (i > 0) {
          retArr.push(', ');
        }

        switch (argumentType) {
          case 'Integer':
            this.castValueToFloat(argument, retArr);
            break;
          default:
            this.astGeneric(argument, retArr);
            break;
        }
      }
    } else {
      const targetTypes = this.lookupFunctionArgumentTypes(functionName) || [];
      for (let i = 0; i < ast.arguments.length; ++i) {
        const argument = ast.arguments[i];
        let targetType = targetTypes[i];
        if (i > 0) {
          retArr.push(', ');
        }
        const argumentType = this.getType(argument);
        if (!targetType) {
          this.triggerImplyArgumentType(functionName, i, argumentType, this);
          targetType = argumentType;
        }
        switch (argumentType) {
          case 'Boolean':
            this.astGeneric(argument, retArr);
            continue;
          case 'Number':
          case 'Float':
            if (targetType === 'Integer') {
              retArr.push('int(');
              this.astGeneric(argument, retArr);
              retArr.push(')');
              continue;
            } else if (targetType === 'Number' || targetType === 'Float') {
              this.astGeneric(argument, retArr);
              continue;
            } else if (targetType === 'LiteralInteger') {
              this.castLiteralToFloat(argument, retArr);
              continue;
            }
            break;
          case 'Integer':
            if (targetType === 'Number' || targetType === 'Float') {
              retArr.push('float(');
              this.astGeneric(argument, retArr);
              retArr.push(')');
              continue;
            } else if (targetType === 'Integer') {
              this.astGeneric(argument, retArr);
              continue;
            }
            break;
          case 'LiteralInteger':
            if (targetType === 'Integer') {
              this.castLiteralToInteger(argument, retArr);
              continue;
            } else if (targetType === 'Number' || targetType === 'Float') {
              this.castLiteralToFloat(argument, retArr);
              continue;
            } else if (targetType === 'LiteralInteger') {
              this.astGeneric(argument, retArr);
              continue;
            }
            break;
          case 'Array(2)':
          case 'Array(3)':
          case 'Array(4)':
            if (targetType === argumentType) {
              if (argument.type === 'Identifier') {
                retArr.push(`user_${utils.sanitizeName(argument.name)}`);
              } else if (argument.type === 'ArrayExpression' || argument.type === 'MemberExpression' || argument.type === 'CallExpression') {
                this.astGeneric(argument, retArr);
              } else {
                throw this.astErrorOutput(`Unhandled argument type ${ argument.type }`, ast);
              }
              continue;
            }
            break;
          case 'HTMLCanvas':
          case 'OffscreenCanvas':
          case 'HTMLImage':
          case 'ImageBitmap':
          case 'ImageData':
          case 'HTMLImageArray':
          case 'HTMLVideo':
          case 'ArrayTexture(1)':
          case 'ArrayTexture(2)':
          case 'ArrayTexture(3)':
          case 'ArrayTexture(4)':
          case 'Array':
          case 'Input':
            if (targetType === argumentType) {
              if (argument.type !== 'Identifier') throw this.astErrorOutput(`Unhandled argument type ${ argument.type }`, ast);
              this.triggerImplyArgumentBitRatio(this.name, argument.name, functionName, i);
              const name = utils.sanitizeName(argument.name);
              retArr.push(`user_${name},user_${name}Size,user_${name}Dim`);
              continue;
            }
            break;
        }
        throw this.astErrorOutput(`Unhandled argument combination of ${ argumentType } and ${ targetType } for argument named "${ argument.name }"`, ast);
      }
    }
    // Close arguments space
    retArr.push(')');

    return retArr;
  }

  /**
   * @desc Parses the abstract syntax tree for *Array* Expression
   * @param {Object} arrNode - the AST object to parse
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astArrayExpression(arrNode, retArr) {
    const returnType = this.getType(arrNode);

    const arrLen = arrNode.elements.length;

    switch (returnType) {
      case 'Matrix(2)':
      case 'Matrix(3)':
      case 'Matrix(4)':
        retArr.push(`mat${arrLen}(`);
        break;
      default:
        retArr.push(`vec${arrLen}(`);
    }
    for (let i = 0; i < arrLen; ++i) {
      if (i > 0) {
        retArr.push(', ');
      }
      const subNode = arrNode.elements[i];
      this.astGeneric(subNode, retArr)
    }
    retArr.push(')');

    return retArr;
  }

  memberExpressionXYZ(x, y, z, retArr) {
    if (z) {
      retArr.push(this.memberExpressionPropertyMarkup(z), ', ');
    } else {
      retArr.push('0, ');
    }
    if (y) {
      retArr.push(this.memberExpressionPropertyMarkup(y), ', ');
    } else {
      retArr.push('0, ');
    }
    retArr.push(this.memberExpressionPropertyMarkup(x));
    return retArr;
  }

  memberExpressionPropertyMarkup(property) {
    if (!property) {
      throw new Error('Property not set');
    }
    const type = this.getType(property);
    const result = [];
    switch (type) {
      case 'Number':
      case 'Float':
        this.castValueToInteger(property, result);
        break;
      case 'LiteralInteger':
        this.castLiteralToInteger(property, result);
        break;
      default:
        this.astGeneric(property, result);
    }
    return result.join('');
  }
}

const typeMap = {
  'Array': 'sampler2D',
  'Array(2)': 'vec2',
  'Array(3)': 'vec3',
  'Array(4)': 'vec4',
  'Matrix(2)': 'mat2',
  'Matrix(3)': 'mat3',
  'Matrix(4)': 'mat4',
  'Array2D': 'sampler2D',
  'Array3D': 'sampler2D',
  'Boolean': 'bool',
  'Float': 'float',
  'Input': 'sampler2D',
  'Integer': 'int',
  'Number': 'float',
  'LiteralInteger': 'float',
  'NumberTexture': 'sampler2D',
  'MemoryOptimizedNumberTexture': 'sampler2D',
  'ArrayTexture(1)': 'sampler2D',
  'ArrayTexture(2)': 'sampler2D',
  'ArrayTexture(3)': 'sampler2D',
  'ArrayTexture(4)': 'sampler2D',
  'HTMLVideo': 'sampler2D',
  'HTMLCanvas': 'sampler2D',
  'OffscreenCanvas': 'sampler2D',
  'HTMLImage': 'sampler2D',
  'ImageBitmap': 'sampler2D',
  'ImageData': 'sampler2D',
  'HTMLImageArray': 'sampler2DArray',
};

const operatorMap = {
  '===': '==',
  '!==': '!='
};

module.exports = {
  WebGLFunctionNode
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value-maps.js":
/*!*************************************************!*\
  !*** ./src/backend/web-gl/kernel-value-maps.js ***!
  \*************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { WebGLKernelValueBoolean } = __webpack_require__(/*! ./kernel-value/boolean */ "./src/backend/web-gl/kernel-value/boolean.js");
const { WebGLKernelValueFloat } = __webpack_require__(/*! ./kernel-value/float */ "./src/backend/web-gl/kernel-value/float.js");
const { WebGLKernelValueInteger } = __webpack_require__(/*! ./kernel-value/integer */ "./src/backend/web-gl/kernel-value/integer.js");

const { WebGLKernelValueHTMLImage } = __webpack_require__(/*! ./kernel-value/html-image */ "./src/backend/web-gl/kernel-value/html-image.js");
const { WebGLKernelValueDynamicHTMLImage } = __webpack_require__(/*! ./kernel-value/dynamic-html-image */ "./src/backend/web-gl/kernel-value/dynamic-html-image.js");

const { WebGLKernelValueHTMLVideo } = __webpack_require__(/*! ./kernel-value/html-video */ "./src/backend/web-gl/kernel-value/html-video.js");
const { WebGLKernelValueDynamicHTMLVideo } = __webpack_require__(/*! ./kernel-value/dynamic-html-video */ "./src/backend/web-gl/kernel-value/dynamic-html-video.js");

const { WebGLKernelValueSingleInput } = __webpack_require__(/*! ./kernel-value/single-input */ "./src/backend/web-gl/kernel-value/single-input.js");
const { WebGLKernelValueDynamicSingleInput } = __webpack_require__(/*! ./kernel-value/dynamic-single-input */ "./src/backend/web-gl/kernel-value/dynamic-single-input.js");

const { WebGLKernelValueUnsignedInput } = __webpack_require__(/*! ./kernel-value/unsigned-input */ "./src/backend/web-gl/kernel-value/unsigned-input.js");
const { WebGLKernelValueDynamicUnsignedInput } = __webpack_require__(/*! ./kernel-value/dynamic-unsigned-input */ "./src/backend/web-gl/kernel-value/dynamic-unsigned-input.js");

const { WebGLKernelValueMemoryOptimizedNumberTexture } = __webpack_require__(/*! ./kernel-value/memory-optimized-number-texture */ "./src/backend/web-gl/kernel-value/memory-optimized-number-texture.js");
const { WebGLKernelValueDynamicMemoryOptimizedNumberTexture } = __webpack_require__(/*! ./kernel-value/dynamic-memory-optimized-number-texture */ "./src/backend/web-gl/kernel-value/dynamic-memory-optimized-number-texture.js");

const { WebGLKernelValueNumberTexture } = __webpack_require__(/*! ./kernel-value/number-texture */ "./src/backend/web-gl/kernel-value/number-texture.js");
const { WebGLKernelValueDynamicNumberTexture } = __webpack_require__(/*! ./kernel-value/dynamic-number-texture */ "./src/backend/web-gl/kernel-value/dynamic-number-texture.js");

const { WebGLKernelValueSingleArray } = __webpack_require__(/*! ./kernel-value/single-array */ "./src/backend/web-gl/kernel-value/single-array.js");
const { WebGLKernelValueDynamicSingleArray } = __webpack_require__(/*! ./kernel-value/dynamic-single-array */ "./src/backend/web-gl/kernel-value/dynamic-single-array.js");

const { WebGLKernelValueSingleArray1DI } = __webpack_require__(/*! ./kernel-value/single-array1d-i */ "./src/backend/web-gl/kernel-value/single-array1d-i.js");
const { WebGLKernelValueDynamicSingleArray1DI } = __webpack_require__(/*! ./kernel-value/dynamic-single-array1d-i */ "./src/backend/web-gl/kernel-value/dynamic-single-array1d-i.js");

const { WebGLKernelValueSingleArray2DI } = __webpack_require__(/*! ./kernel-value/single-array2d-i */ "./src/backend/web-gl/kernel-value/single-array2d-i.js");
const { WebGLKernelValueDynamicSingleArray2DI } = __webpack_require__(/*! ./kernel-value/dynamic-single-array2d-i */ "./src/backend/web-gl/kernel-value/dynamic-single-array2d-i.js");

const { WebGLKernelValueSingleArray3DI } = __webpack_require__(/*! ./kernel-value/single-array3d-i */ "./src/backend/web-gl/kernel-value/single-array3d-i.js");
const { WebGLKernelValueDynamicSingleArray3DI } = __webpack_require__(/*! ./kernel-value/dynamic-single-array3d-i */ "./src/backend/web-gl/kernel-value/dynamic-single-array3d-i.js");

const { WebGLKernelValueArray2 } = __webpack_require__(/*! ./kernel-value/array2 */ "./src/backend/web-gl/kernel-value/array2.js");
const { WebGLKernelValueArray3 } = __webpack_require__(/*! ./kernel-value/array3 */ "./src/backend/web-gl/kernel-value/array3.js");
const { WebGLKernelValueArray4 } = __webpack_require__(/*! ./kernel-value/array4 */ "./src/backend/web-gl/kernel-value/array4.js");

const { WebGLKernelValueUnsignedArray } = __webpack_require__(/*! ./kernel-value/unsigned-array */ "./src/backend/web-gl/kernel-value/unsigned-array.js");
const { WebGLKernelValueDynamicUnsignedArray } = __webpack_require__(/*! ./kernel-value/dynamic-unsigned-array */ "./src/backend/web-gl/kernel-value/dynamic-unsigned-array.js");

const kernelValueMaps = {
  unsigned: {
    dynamic: {
      'Boolean': WebGLKernelValueBoolean,
      'Integer': WebGLKernelValueInteger,
      'Float': WebGLKernelValueFloat,
      'Array': WebGLKernelValueDynamicUnsignedArray,
      'Array(2)': WebGLKernelValueArray2,
      'Array(3)': WebGLKernelValueArray3,
      'Array(4)': WebGLKernelValueArray4,
      'Array1D(2)': false,
      'Array1D(3)': false,
      'Array1D(4)': false,
      'Array2D(2)': false,
      'Array2D(3)': false,
      'Array2D(4)': false,
      'Array3D(2)': false,
      'Array3D(3)': false,
      'Array3D(4)': false,
      'Input': WebGLKernelValueDynamicUnsignedInput,
      'NumberTexture': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(1)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(2)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(3)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(4)': WebGLKernelValueDynamicNumberTexture,
      'MemoryOptimizedNumberTexture': WebGLKernelValueDynamicMemoryOptimizedNumberTexture,
      'HTMLCanvas': WebGLKernelValueDynamicHTMLImage,
      'OffscreenCanvas': WebGLKernelValueDynamicHTMLImage,
      'HTMLImage': WebGLKernelValueDynamicHTMLImage,
      'ImageBitmap': WebGLKernelValueDynamicHTMLImage,
      'ImageData': WebGLKernelValueDynamicHTMLImage,
      'HTMLImageArray': false,
      'HTMLVideo': WebGLKernelValueDynamicHTMLVideo,
    },
    static: {
      'Boolean': WebGLKernelValueBoolean,
      'Float': WebGLKernelValueFloat,
      'Integer': WebGLKernelValueInteger,
      'Array': WebGLKernelValueUnsignedArray,
      'Array(2)': WebGLKernelValueArray2,
      'Array(3)': WebGLKernelValueArray3,
      'Array(4)': WebGLKernelValueArray4,
      'Array1D(2)': false,
      'Array1D(3)': false,
      'Array1D(4)': false,
      'Array2D(2)': false,
      'Array2D(3)': false,
      'Array2D(4)': false,
      'Array3D(2)': false,
      'Array3D(3)': false,
      'Array3D(4)': false,
      'Input': WebGLKernelValueUnsignedInput,
      'NumberTexture': WebGLKernelValueNumberTexture,
      'ArrayTexture(1)': WebGLKernelValueNumberTexture,
      'ArrayTexture(2)': WebGLKernelValueNumberTexture,
      'ArrayTexture(3)': WebGLKernelValueNumberTexture,
      'ArrayTexture(4)': WebGLKernelValueNumberTexture,
      'MemoryOptimizedNumberTexture': WebGLKernelValueMemoryOptimizedNumberTexture,
      'HTMLCanvas': WebGLKernelValueHTMLImage,
      'OffscreenCanvas': WebGLKernelValueHTMLImage,
      'HTMLImage': WebGLKernelValueHTMLImage,
      'ImageBitmap': WebGLKernelValueHTMLImage,
      'ImageData': WebGLKernelValueHTMLImage,
      'HTMLImageArray': false,
      'HTMLVideo': WebGLKernelValueHTMLVideo,
    }
  },
  single: {
    dynamic: {
      'Boolean': WebGLKernelValueBoolean,
      'Integer': WebGLKernelValueInteger,
      'Float': WebGLKernelValueFloat,
      'Array': WebGLKernelValueDynamicSingleArray,
      'Array(2)': WebGLKernelValueArray2,
      'Array(3)': WebGLKernelValueArray3,
      'Array(4)': WebGLKernelValueArray4,
      'Array1D(2)': WebGLKernelValueDynamicSingleArray1DI,
      'Array1D(3)': WebGLKernelValueDynamicSingleArray1DI,
      'Array1D(4)': WebGLKernelValueDynamicSingleArray1DI,
      'Array2D(2)': WebGLKernelValueDynamicSingleArray2DI,
      'Array2D(3)': WebGLKernelValueDynamicSingleArray2DI,
      'Array2D(4)': WebGLKernelValueDynamicSingleArray2DI,
      'Array3D(2)': WebGLKernelValueDynamicSingleArray3DI,
      'Array3D(3)': WebGLKernelValueDynamicSingleArray3DI,
      'Array3D(4)': WebGLKernelValueDynamicSingleArray3DI,
      'Input': WebGLKernelValueDynamicSingleInput,
      'NumberTexture': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(1)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(2)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(3)': WebGLKernelValueDynamicNumberTexture,
      'ArrayTexture(4)': WebGLKernelValueDynamicNumberTexture,
      'MemoryOptimizedNumberTexture': WebGLKernelValueDynamicMemoryOptimizedNumberTexture,
      'HTMLCanvas': WebGLKernelValueDynamicHTMLImage,
      'OffscreenCanvas': WebGLKernelValueDynamicHTMLImage,
      'HTMLImage': WebGLKernelValueDynamicHTMLImage,
      'ImageBitmap': WebGLKernelValueDynamicHTMLImage,
      'ImageData': WebGLKernelValueDynamicHTMLImage,
      'HTMLImageArray': false,
      'HTMLVideo': WebGLKernelValueDynamicHTMLVideo,
    },
    static: {
      'Boolean': WebGLKernelValueBoolean,
      'Float': WebGLKernelValueFloat,
      'Integer': WebGLKernelValueInteger,
      'Array': WebGLKernelValueSingleArray,
      'Array(2)': WebGLKernelValueArray2,
      'Array(3)': WebGLKernelValueArray3,
      'Array(4)': WebGLKernelValueArray4,
      'Array1D(2)': WebGLKernelValueSingleArray1DI,
      'Array1D(3)': WebGLKernelValueSingleArray1DI,
      'Array1D(4)': WebGLKernelValueSingleArray1DI,
      'Array2D(2)': WebGLKernelValueSingleArray2DI,
      'Array2D(3)': WebGLKernelValueSingleArray2DI,
      'Array2D(4)': WebGLKernelValueSingleArray2DI,
      'Array3D(2)': WebGLKernelValueSingleArray3DI,
      'Array3D(3)': WebGLKernelValueSingleArray3DI,
      'Array3D(4)': WebGLKernelValueSingleArray3DI,
      'Input': WebGLKernelValueSingleInput,
      'NumberTexture': WebGLKernelValueNumberTexture,
      'ArrayTexture(1)': WebGLKernelValueNumberTexture,
      'ArrayTexture(2)': WebGLKernelValueNumberTexture,
      'ArrayTexture(3)': WebGLKernelValueNumberTexture,
      'ArrayTexture(4)': WebGLKernelValueNumberTexture,
      'MemoryOptimizedNumberTexture': WebGLKernelValueMemoryOptimizedNumberTexture,
      'HTMLCanvas': WebGLKernelValueHTMLImage,
      'OffscreenCanvas': WebGLKernelValueHTMLImage,
      'HTMLImage': WebGLKernelValueHTMLImage,
      'ImageBitmap': WebGLKernelValueHTMLImage,
      'ImageData': WebGLKernelValueHTMLImage,
      'HTMLImageArray': false,
      'HTMLVideo': WebGLKernelValueHTMLVideo,
    }
  },
};

function lookupKernelValueType(type, dynamic, precision, value) {
  if (!type) {
    throw new Error('type missing');
  }
  if (!dynamic) {
    throw new Error('dynamic missing');
  }
  if (!precision) {
    throw new Error('precision missing');
  }
  if (value.type) {
    type = value.type;
  }
  const types = kernelValueMaps[precision][dynamic];
  if (types[type] === false) {
    return null;
  } else if (types[type] === undefined) {
    throw new Error(`Could not find a KernelValue for ${ type }`);
  }
  return types[type];
}

module.exports = {
  lookupKernelValueType,
  kernelValueMaps,
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/array.js":
/*!**************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/array.js ***!
  \**************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { WebGLKernelValue } = __webpack_require__(/*! ./index */ "./src/backend/web-gl/kernel-value/index.js");
const { Input } = __webpack_require__(/*! ../../../input */ "./src/input.js");

/**
 * @abstract
 */
class WebGLKernelArray extends WebGLKernelValue {
  /**
   *
   * @param {number} width
   * @param {number} height
   */
  checkSize(width, height) {
    if (!this.kernel.validate) return;
    const { maxTextureSize } = this.kernel.constructor.features;
    if (width > maxTextureSize || height > maxTextureSize) {
      if (width > height) {
        throw new Error(`Argument texture width of ${width} larger than maximum size of ${maxTextureSize} for your GPU`);
      } else if (width < height) {
        throw new Error(`Argument texture height of ${height} larger than maximum size of ${maxTextureSize} for your GPU`);
      } else {
        throw new Error(`Argument texture height and width of ${height} larger than maximum size of ${maxTextureSize} for your GPU`);
      }
    }
  }

  setup() {
    this.requestTexture();
    this.setupTexture();
    this.defineTexture();
  }

  requestTexture() {
    this.texture = this.onRequestTexture();
  }

  defineTexture() {
    const { context: gl } = this;
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }

  setupTexture() {
    this.contextHandle = this.onRequestContextHandle();
    this.index = this.onRequestIndex();
    this.dimensionsId = this.id + 'Dim';
    this.sizeId = this.id + 'Size';
  }

  /**
   * bit storage ratio of source to target 'buffer', i.e. if 8bit array -> 32bit tex = 4
   * @param value
   * @returns {number}
   */
  getBitRatio(value) {
    if (Array.isArray(value[0])) {
      return this.getBitRatio(value[0]);
    } else if (value.constructor === Input) {
      return this.getBitRatio(value.value);
    }
    switch (value.constructor) {
      case Uint8ClampedArray:
      case Uint8Array:
      case Int8Array:
        return 1;
      case Uint16Array:
      case Int16Array:
        return 2;
      case Float32Array:
      case Int32Array:
      default:
        return 4;
    }
  }

  destroy() {
    if (this.prevArg) {
      this.prevArg.delete();
    }
    this.context.deleteTexture(this.texture);
  }
}

module.exports = {
  WebGLKernelArray
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/array2.js":
/*!***************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/array2.js ***!
  \***************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { WebGLKernelValue } = __webpack_require__(/*! ./index */ "./src/backend/web-gl/kernel-value/index.js");

class WebGLKernelValueArray2 extends WebGLKernelValue {
  constructor(value, settings) {
    super(value, settings);
    this.uploadValue = value;
  }
  getSource(value) {
    if (this.origin === 'constants') {
      return `const vec2 ${this.id} = vec2(${value[0]},${value[1]});\n`;
    }
    return `uniform vec2 ${this.id};\n`;
  }

  getStringValueHandler() {
    // resetting isn't supported for Array(2)
    if (this.origin === 'constants') return '';
    return `const uploadValue_${this.name} = ${this.varName};\n`;
  }

  updateValue(value) {
    if (this.origin === 'constants') return;
    this.kernel.setUniform2fv(this.id, this.uploadValue = value);
  }
}

module.exports = {
  WebGLKernelValueArray2
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/array3.js":
/*!***************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/array3.js ***!
  \***************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { WebGLKernelValue } = __webpack_require__(/*! ./index */ "./src/backend/web-gl/kernel-value/index.js");

class WebGLKernelValueArray3 extends WebGLKernelValue {
  constructor(value, settings) {
    super(value, settings);
    this.uploadValue = value;
  }
  getSource(value) {
    if (this.origin === 'constants') {
      return `const vec3 ${this.id} = vec3(${value[0]},${value[1]},${value[2]});\n`;
    }
    return `uniform vec3 ${this.id};\n`;
  }

  getStringValueHandler() {
    // resetting isn't supported for Array(3)
    if (this.origin === 'constants') return '';
    return `const uploadValue_${this.name} = ${this.varName};\n`;
  }

  updateValue(value) {
    if (this.origin === 'constants') return;
    this.kernel.setUniform3fv(this.id, this.uploadValue = value);
  }
}

module.exports = {
  WebGLKernelValueArray3
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/array4.js":
/*!***************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/array4.js ***!
  \***************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { WebGLKernelValue } = __webpack_require__(/*! ./index */ "./src/backend/web-gl/kernel-value/index.js");

class WebGLKernelValueArray4 extends WebGLKernelValue {
  constructor(value, settings) {
    super(value, settings);
    this.uploadValue = value;
  }
  getSource(value) {
    if (this.origin === 'constants') {
      return `const vec4 ${this.id} = vec4(${value[0]},${value[1]},${value[2]},${value[3]});\n`;
    }
    return `uniform vec4 ${this.id};\n`;
  }

  getStringValueHandler() {
    // resetting isn't supported for Array(4)
    if (this.origin === 'constants') return '';
    return `const uploadValue_${this.name} = ${this.varName};\n`;
  }

  updateValue(value) {
    if (this.origin === 'constants') return;
    this.kernel.setUniform4fv(this.id, this.uploadValue = value);
  }
}

module.exports = {
  WebGLKernelValueArray4
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/boolean.js":
/*!****************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/boolean.js ***!
  \****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValue } = __webpack_require__(/*! ./index */ "./src/backend/web-gl/kernel-value/index.js");

class WebGLKernelValueBoolean extends WebGLKernelValue {
  constructor(value, settings) {
    super(value, settings);
    this.uploadValue = value;
  }
  getSource(value) {
    if (this.origin === 'constants') {
      return `const bool ${this.id} = ${value};\n`;
    }
    return `uniform bool ${this.id};\n`;
  }

  getStringValueHandler() {
    return `const uploadValue_${this.name} = ${this.varName};\n`;
  }

  updateValue(value) {
    if (this.origin === 'constants') return;
    this.kernel.setUniform1i(this.id, this.uploadValue = value);
  }
}

module.exports = {
  WebGLKernelValueBoolean
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/dynamic-html-image.js":
/*!***************************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/dynamic-html-image.js ***!
  \***************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueHTMLImage } = __webpack_require__(/*! ./html-image */ "./src/backend/web-gl/kernel-value/html-image.js");

class WebGLKernelValueDynamicHTMLImage extends WebGLKernelValueHTMLImage {
  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `uniform ivec2 ${this.sizeId}`,
      `uniform ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(value) {
    const { width, height } = value;
    this.checkSize(width, height);
    this.dimensions = [width, height, 1];
    this.textureSize = [width, height];
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(value);
  }
}

module.exports = {
  WebGLKernelValueDynamicHTMLImage
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/dynamic-html-video.js":
/*!***************************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/dynamic-html-video.js ***!
  \***************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { WebGLKernelValueDynamicHTMLImage } = __webpack_require__(/*! ./dynamic-html-image */ "./src/backend/web-gl/kernel-value/dynamic-html-image.js");

class WebGLKernelValueDynamicHTMLVideo extends WebGLKernelValueDynamicHTMLImage {}

module.exports = {
  WebGLKernelValueDynamicHTMLVideo
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/dynamic-memory-optimized-number-texture.js":
/*!************************************************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/dynamic-memory-optimized-number-texture.js ***!
  \************************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueMemoryOptimizedNumberTexture } = __webpack_require__(/*! ./memory-optimized-number-texture */ "./src/backend/web-gl/kernel-value/memory-optimized-number-texture.js");

class WebGLKernelValueDynamicMemoryOptimizedNumberTexture extends WebGLKernelValueMemoryOptimizedNumberTexture {
  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `uniform ivec2 ${this.sizeId}`,
      `uniform ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(inputTexture) {
    this.dimensions = inputTexture.dimensions;
    this.checkSize(inputTexture.size[0], inputTexture.size[1]);
    this.textureSize = inputTexture.size;
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(inputTexture);
  }
}

module.exports = {
  WebGLKernelValueDynamicMemoryOptimizedNumberTexture
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/dynamic-number-texture.js":
/*!*******************************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/dynamic-number-texture.js ***!
  \*******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueNumberTexture } = __webpack_require__(/*! ./number-texture */ "./src/backend/web-gl/kernel-value/number-texture.js");

class WebGLKernelValueDynamicNumberTexture extends WebGLKernelValueNumberTexture {
  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `uniform ivec2 ${this.sizeId}`,
      `uniform ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(value) {
    this.dimensions = value.dimensions;
    this.checkSize(value.size[0], value.size[1]);
    this.textureSize = value.size;
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(value);
  }
}

module.exports = {
  WebGLKernelValueDynamicNumberTexture
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/dynamic-single-array.js":
/*!*****************************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/dynamic-single-array.js ***!
  \*****************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueSingleArray } = __webpack_require__(/*! ./single-array */ "./src/backend/web-gl/kernel-value/single-array.js");

class WebGLKernelValueDynamicSingleArray extends WebGLKernelValueSingleArray {
  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `uniform ivec2 ${this.sizeId}`,
      `uniform ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(value) {
    this.dimensions = utils.getDimensions(value, true);
    this.textureSize = utils.getMemoryOptimizedFloatTextureSize(this.dimensions, this.bitRatio);
    this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
    this.checkSize(this.textureSize[0], this.textureSize[1]);
    this.uploadValue = new Float32Array(this.uploadArrayLength);
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(value);
  }
}

module.exports = {
  WebGLKernelValueDynamicSingleArray
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/dynamic-single-array1d-i.js":
/*!*********************************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/dynamic-single-array1d-i.js ***!
  \*********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueSingleArray1DI } = __webpack_require__(/*! ./single-array1d-i */ "./src/backend/web-gl/kernel-value/single-array1d-i.js");

class WebGLKernelValueDynamicSingleArray1DI extends WebGLKernelValueSingleArray1DI {
  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `uniform ivec2 ${this.sizeId}`,
      `uniform ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(value) {
    this.setShape(value);
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(value);
  }
}

module.exports = {
  WebGLKernelValueDynamicSingleArray1DI
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/dynamic-single-array2d-i.js":
/*!*********************************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/dynamic-single-array2d-i.js ***!
  \*********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueSingleArray2DI } = __webpack_require__(/*! ./single-array2d-i */ "./src/backend/web-gl/kernel-value/single-array2d-i.js");

class WebGLKernelValueDynamicSingleArray2DI extends WebGLKernelValueSingleArray2DI {
  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `uniform ivec2 ${this.sizeId}`,
      `uniform ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(value) {
    this.setShape(value);
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(value);
  }
}

module.exports = {
  WebGLKernelValueDynamicSingleArray2DI
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/dynamic-single-array3d-i.js":
/*!*********************************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/dynamic-single-array3d-i.js ***!
  \*********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueSingleArray3DI } = __webpack_require__(/*! ./single-array3d-i */ "./src/backend/web-gl/kernel-value/single-array3d-i.js");

class WebGLKernelValueDynamicSingleArray3DI extends WebGLKernelValueSingleArray3DI {
  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `uniform ivec2 ${this.sizeId}`,
      `uniform ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(value) {
    this.setShape(value);
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(value);
  }
}

module.exports = {
  WebGLKernelValueDynamicSingleArray3DI
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/dynamic-single-input.js":
/*!*****************************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/dynamic-single-input.js ***!
  \*****************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueSingleInput } = __webpack_require__(/*! ./single-input */ "./src/backend/web-gl/kernel-value/single-input.js");

class WebGLKernelValueDynamicSingleInput extends WebGLKernelValueSingleInput {
  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `uniform ivec2 ${this.sizeId}`,
      `uniform ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(value) {
    let [w, h, d] = value.size;
    this.dimensions = new Int32Array([w || 1, h || 1, d || 1]);
    this.textureSize = utils.getMemoryOptimizedFloatTextureSize(this.dimensions, this.bitRatio);
    this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
    this.checkSize(this.textureSize[0], this.textureSize[1]);
    this.uploadValue = new Float32Array(this.uploadArrayLength);
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(value);
  }
}

module.exports = {
  WebGLKernelValueDynamicSingleInput
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/dynamic-unsigned-array.js":
/*!*******************************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/dynamic-unsigned-array.js ***!
  \*******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueUnsignedArray } = __webpack_require__(/*! ./unsigned-array */ "./src/backend/web-gl/kernel-value/unsigned-array.js");

class WebGLKernelValueDynamicUnsignedArray extends WebGLKernelValueUnsignedArray {
  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `uniform ivec2 ${this.sizeId}`,
      `uniform ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(value) {
    this.dimensions = utils.getDimensions(value, true);
    this.textureSize = utils.getMemoryOptimizedPackedTextureSize(this.dimensions, this.bitRatio);
    this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * (4 / this.bitRatio);
    this.checkSize(this.textureSize[0], this.textureSize[1]);
    const Type = this.getTransferArrayType(value);
    this.preUploadValue = new Type(this.uploadArrayLength);
    this.uploadValue = new Uint8Array(this.preUploadValue.buffer);
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(value);
  }
}

module.exports = {
  WebGLKernelValueDynamicUnsignedArray
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/dynamic-unsigned-input.js":
/*!*******************************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/dynamic-unsigned-input.js ***!
  \*******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueUnsignedInput } = __webpack_require__(/*! ./unsigned-input */ "./src/backend/web-gl/kernel-value/unsigned-input.js");

class WebGLKernelValueDynamicUnsignedInput extends WebGLKernelValueUnsignedInput {
  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `uniform ivec2 ${this.sizeId}`,
      `uniform ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(value) {
    let [w, h, d] = value.size;
    this.dimensions = new Int32Array([w || 1, h || 1, d || 1]);
    this.textureSize = utils.getMemoryOptimizedPackedTextureSize(this.dimensions, this.bitRatio);
    this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * (4 / this.bitRatio);
    this.checkSize(this.textureSize[0], this.textureSize[1]);
    const Type = this.getTransferArrayType(value.value);
    this.preUploadValue = new Type(this.uploadArrayLength);
    this.uploadValue = new Uint8Array(this.preUploadValue.buffer);
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(value);
  }
}

module.exports = {
  WebGLKernelValueDynamicUnsignedInput
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/float.js":
/*!**************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/float.js ***!
  \**************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValue } = __webpack_require__(/*! ./index */ "./src/backend/web-gl/kernel-value/index.js");

class WebGLKernelValueFloat extends WebGLKernelValue {
  constructor(value, settings) {
    super(value, settings);
    this.uploadValue = value;
  }
  getStringValueHandler() {
    return `const uploadValue_${this.name} = ${this.varName};\n`;
  }
  getSource(value) {
    if (this.origin === 'constants') {
      if (Number.isInteger(value)) {
        return `const float ${this.id} = ${value}.0;\n`;
      }
      return `const float ${this.id} = ${value};\n`;
    }
    return `uniform float ${this.id};\n`;
  }

  updateValue(value) {
    if (this.origin === 'constants') return;
    this.kernel.setUniform1f(this.id, this.uploadValue = value);
  }
}

module.exports = {
  WebGLKernelValueFloat
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/html-image.js":
/*!*******************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/html-image.js ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelArray } = __webpack_require__(/*! ./array */ "./src/backend/web-gl/kernel-value/array.js");

class WebGLKernelValueHTMLImage extends WebGLKernelArray {
  constructor(value, settings) {
    super(value, settings);
    const { width, height } = value;
    this.checkSize(width, height);
    this.dimensions = [width, height, 1];
    this.textureSize = [width, height];
    this.uploadValue = value;
  }

  getStringValueHandler() {
    return `const uploadValue_${this.name} = ${this.varName};\n`;
  }

  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }

  updateValue(inputImage) {
    if (inputImage.constructor !== this.initialValueConstructor) {
      this.onUpdateValueMismatch(inputImage.constructor);
      return;
    }
    const { context: gl } = this;
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.uploadValue = inputImage);
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGLKernelValueHTMLImage
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/html-video.js":
/*!*******************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/html-video.js ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { WebGLKernelValueHTMLImage } = __webpack_require__(/*! ./html-image */ "./src/backend/web-gl/kernel-value/html-image.js");

class WebGLKernelValueHTMLVideo extends WebGLKernelValueHTMLImage {}

module.exports = {
  WebGLKernelValueHTMLVideo
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/index.js":
/*!**************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/index.js ***!
  \**************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { KernelValue } = __webpack_require__(/*! ../../kernel-value */ "./src/backend/kernel-value.js");

class WebGLKernelValue extends KernelValue {
  /**
   * @param {KernelVariable} value
   * @param {IWebGLKernelValueSettings} settings
   */
  constructor(value, settings) {
    super(value, settings);
    this.dimensionsId = null;
    this.sizeId = null;
    this.initialValueConstructor = value.constructor;
    this.onRequestTexture = settings.onRequestTexture;
    this.onRequestIndex = settings.onRequestIndex;
    this.uploadValue = null;
    this.textureSize = null;
    this.bitRatio = null;
    this.prevArg = null;
  }

  get id() {
    return `${this.origin}_${utils.sanitizeName(this.name)}`;
  }

  setup() {}

  getTransferArrayType(value) {
    if (Array.isArray(value[0])) {
      return this.getTransferArrayType(value[0]);
    }
    switch (value.constructor) {
      case Array:
      case Int32Array:
      case Int16Array:
      case Int8Array:
        return Float32Array;
      case Uint8ClampedArray:
      case Uint8Array:
      case Uint16Array:
      case Uint32Array:
      case Float32Array:
      case Float64Array:
        return value.constructor;
    }
    console.warn('Unfamiliar constructor type.  Will go ahead and use, but likley this may result in a transfer of zeros');
    return value.constructor;
  }

  /**
   * Used for when we want a string output of our kernel, so we can still input values to the kernel
   */
  getStringValueHandler() {
    throw new Error(`"getStringValueHandler" not implemented on ${this.constructor.name}`);
  }

  getVariablePrecisionString() {
    return this.kernel.getVariablePrecisionString(this.textureSize || undefined, this.tactic || undefined);
  }

  destroy() {}
}

module.exports = {
  WebGLKernelValue
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/integer.js":
/*!****************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/integer.js ***!
  \****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValue } = __webpack_require__(/*! ./index */ "./src/backend/web-gl/kernel-value/index.js");

class WebGLKernelValueInteger extends WebGLKernelValue {
  constructor(value, settings) {
    super(value, settings);
    this.uploadValue = value;
  }
  getStringValueHandler() {
    return `const uploadValue_${this.name} = ${this.varName};\n`;
  }
  getSource(value) {
    if (this.origin === 'constants') {
      return `const int ${this.id} = ${ parseInt(value) };\n`;
    }
    return `uniform int ${this.id};\n`;
  }

  updateValue(value) {
    if (this.origin === 'constants') return;
    this.kernel.setUniform1i(this.id, this.uploadValue = value);
  }
}

module.exports = {
  WebGLKernelValueInteger
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/memory-optimized-number-texture.js":
/*!****************************************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/memory-optimized-number-texture.js ***!
  \****************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelArray } = __webpack_require__(/*! ./array */ "./src/backend/web-gl/kernel-value/array.js");

const sameError = `Source and destination textures are the same.  Use immutable = true and manually cleanup kernel output texture memory with texture.delete()`;

class WebGLKernelValueMemoryOptimizedNumberTexture extends WebGLKernelArray {
  constructor(value, settings) {
    super(value, settings);
    const [width, height] = value.size;
    this.checkSize(width, height);
    this.dimensions = value.dimensions;
    this.textureSize = value.size;
    this.uploadValue = value.texture;
    this.forceUploadEachRun = true;
  }

  setup() {
    this.setupTexture();
  }

  getStringValueHandler() {
    return `const uploadValue_${this.name} = ${this.varName}.texture;\n`;
  }

  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }

  /**
   * @param {GLTextureMemoryOptimized} inputTexture
   */
  updateValue(inputTexture) {
    if (inputTexture.constructor !== this.initialValueConstructor) {
      this.onUpdateValueMismatch(inputTexture.constructor);
      return;
    }
    if (this.checkContext && inputTexture.context !== this.context) {
      throw new Error(`Value ${this.name} (${this.type}) must be from same context`);
    }

    const { kernel, context: gl } = this;
    if (kernel.pipeline) {
      if (kernel.immutable) {
        kernel.updateTextureArgumentRefs(this, inputTexture);
      } else {
        if (kernel.texture && kernel.texture.texture === inputTexture.texture) {
          throw new Error(sameError);
        } else if (kernel.mappedTextures) {
          const { mappedTextures } = kernel;
          for (let i = 0; i < mappedTextures.length; i++) {
            if (mappedTextures[i].texture === inputTexture.texture) {
              throw new Error(sameError);
            }
          }
        }
      }
    }

    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.uploadValue = inputTexture.texture);
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGLKernelValueMemoryOptimizedNumberTexture,
  sameError
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/number-texture.js":
/*!***********************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/number-texture.js ***!
  \***********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelArray } = __webpack_require__(/*! ./array */ "./src/backend/web-gl/kernel-value/array.js");
const { sameError } = __webpack_require__(/*! ./memory-optimized-number-texture */ "./src/backend/web-gl/kernel-value/memory-optimized-number-texture.js");

class WebGLKernelValueNumberTexture extends WebGLKernelArray {
  constructor(value, settings) {
    super(value, settings);
    const [width, height] = value.size;
    this.checkSize(width, height);
    const { size: textureSize, dimensions } = value;
    this.bitRatio = this.getBitRatio(value);
    this.dimensions = dimensions;
    this.textureSize = textureSize;
    this.uploadValue = value.texture;
    this.forceUploadEachRun = true;
  }

  setup() {
    this.setupTexture();
  }

  getStringValueHandler() {
    return `const uploadValue_${this.name} = ${this.varName}.texture;\n`;
  }

  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }

  /**
   *
   * @param {GLTexture} inputTexture
   */
  updateValue(inputTexture) {
    if (inputTexture.constructor !== this.initialValueConstructor) {
      this.onUpdateValueMismatch(inputTexture.constructor);
      return;
    }
    if (this.checkContext && inputTexture.context !== this.context) {
      throw new Error(`Value ${this.name} (${this.type}) must be from same context`);
    }

    const { kernel, context: gl } = this;
    if (kernel.pipeline) {
      if (kernel.immutable) {
        kernel.updateTextureArgumentRefs(this, inputTexture);
      } else {
        if (kernel.texture && kernel.texture.texture === inputTexture.texture) {
          throw new Error(sameError);
        } else if (kernel.mappedTextures) {
          const { mappedTextures } = kernel;
          for (let i = 0; i < mappedTextures.length; i++) {
            if (mappedTextures[i].texture === inputTexture.texture) {
              throw new Error(sameError);
            }
          }
        }
      }
    }

    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.uploadValue = inputTexture.texture);
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGLKernelValueNumberTexture
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/single-array.js":
/*!*********************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/single-array.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelArray } = __webpack_require__(/*! ./array */ "./src/backend/web-gl/kernel-value/array.js");

class WebGLKernelValueSingleArray extends WebGLKernelArray {
  constructor(value, settings) {
    super(value, settings);
    this.bitRatio = 4;
    this.dimensions = utils.getDimensions(value, true);
    this.textureSize = utils.getMemoryOptimizedFloatTextureSize(this.dimensions, this.bitRatio);
    this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
    this.checkSize(this.textureSize[0], this.textureSize[1]);
    this.uploadValue = new Float32Array(this.uploadArrayLength);
  }

  getStringValueHandler() {
    return utils.linesToString([
      `const uploadValue_${this.name} = new Float32Array(${this.uploadArrayLength})`,
      `flattenTo(${this.varName}, uploadValue_${this.name})`,
    ]);
  }

  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }

  updateValue(value) {
    if (value.constructor !== this.initialValueConstructor) {
      this.onUpdateValueMismatch(value.constructor);
      return;
    }
    const { context: gl } = this;
    utils.flattenTo(value, this.uploadValue);
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGLKernelValueSingleArray
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/single-array1d-i.js":
/*!*************************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/single-array1d-i.js ***!
  \*************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelArray } = __webpack_require__(/*! ./array */ "./src/backend/web-gl/kernel-value/array.js");

class WebGLKernelValueSingleArray1DI extends WebGLKernelArray {
  constructor(value, settings) {
    super(value, settings);
    this.bitRatio = 4;
    this.setShape(value);
  }

  setShape(value) {
    const valueDimensions = utils.getDimensions(value, true);
    this.textureSize = utils.getMemoryOptimizedFloatTextureSize(valueDimensions, this.bitRatio);
    this.dimensions = new Int32Array([valueDimensions[1], 1, 1]);
    this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
    this.checkSize(this.textureSize[0], this.textureSize[1]);
    this.uploadValue = new Float32Array(this.uploadArrayLength);
  }

  getStringValueHandler() {
    return utils.linesToString([
      `const uploadValue_${this.name} = new Float32Array(${this.uploadArrayLength})`,
      `flattenTo(${this.varName}, uploadValue_${this.name})`,
    ]);
  }

  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }

  updateValue(value) {
    if (value.constructor !== this.initialValueConstructor) {
      this.onUpdateValueMismatch(value.constructor);
      return;
    }
    const { context: gl } = this;
    utils.flatten2dArrayTo(value, this.uploadValue);
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGLKernelValueSingleArray1DI
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/single-array2d-i.js":
/*!*************************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/single-array2d-i.js ***!
  \*************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelArray } = __webpack_require__(/*! ./array */ "./src/backend/web-gl/kernel-value/array.js");

class WebGLKernelValueSingleArray2DI extends WebGLKernelArray {
  constructor(value, settings) {
    super(value, settings);
    this.bitRatio = 4;
    this.setShape(value);
  }

  setShape(value) {
    const valueDimensions = utils.getDimensions(value, true);
    this.textureSize = utils.getMemoryOptimizedFloatTextureSize(valueDimensions, this.bitRatio);
    this.dimensions = new Int32Array([valueDimensions[1], valueDimensions[2], 1]);
    this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
    this.checkSize(this.textureSize[0], this.textureSize[1]);
    this.uploadValue = new Float32Array(this.uploadArrayLength);
  }

  getStringValueHandler() {
    return utils.linesToString([
      `const uploadValue_${this.name} = new Float32Array(${this.uploadArrayLength})`,
      `flattenTo(${this.varName}, uploadValue_${this.name})`,
    ]);
  }

  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }

  updateValue(value) {
    if (value.constructor !== this.initialValueConstructor) {
      this.onUpdateValueMismatch(value.constructor);
      return;
    }
    const { context: gl } = this;
    utils.flatten3dArrayTo(value, this.uploadValue);
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGLKernelValueSingleArray2DI
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/single-array3d-i.js":
/*!*************************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/single-array3d-i.js ***!
  \*************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelArray } = __webpack_require__(/*! ./array */ "./src/backend/web-gl/kernel-value/array.js");

class WebGLKernelValueSingleArray3DI extends WebGLKernelArray {
  constructor(value, settings) {
    super(value, settings);
    this.bitRatio = 4;
    this.setShape(value);
  }

  setShape(value) {
    const valueDimensions = utils.getDimensions(value, true);
    this.textureSize = utils.getMemoryOptimizedFloatTextureSize(valueDimensions, this.bitRatio);
    this.dimensions = new Int32Array([valueDimensions[1], valueDimensions[2], valueDimensions[3]]);
    this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
    this.checkSize(this.textureSize[0], this.textureSize[1]);
    this.uploadValue = new Float32Array(this.uploadArrayLength);
  }

  getStringValueHandler() {
    return utils.linesToString([
      `const uploadValue_${this.name} = new Float32Array(${this.uploadArrayLength})`,
      `flattenTo(${this.varName}, uploadValue_${this.name})`,
    ]);
  }

  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }

  updateValue(value) {
    if (value.constructor !== this.initialValueConstructor) {
      this.onUpdateValueMismatch(value.constructor);
      return;
    }
    const { context: gl } = this;
    utils.flatten4dArrayTo(value, this.uploadValue);
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGLKernelValueSingleArray3DI
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/single-input.js":
/*!*********************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/single-input.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelArray } = __webpack_require__(/*! ./array */ "./src/backend/web-gl/kernel-value/array.js");

class WebGLKernelValueSingleInput extends WebGLKernelArray {
  constructor(value, settings) {
    super(value, settings);
    this.bitRatio = 4;
    let [w, h, d] = value.size;
    this.dimensions = new Int32Array([w || 1, h || 1, d || 1]);
    this.textureSize = utils.getMemoryOptimizedFloatTextureSize(this.dimensions, this.bitRatio);
    this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
    this.checkSize(this.textureSize[0], this.textureSize[1]);
    this.uploadValue = new Float32Array(this.uploadArrayLength);
  }

  getStringValueHandler() {
    return utils.linesToString([
      `const uploadValue_${this.name} = new Float32Array(${this.uploadArrayLength})`,
      `flattenTo(${this.varName}.value, uploadValue_${this.name})`,
    ]);
  }

  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }

  updateValue(input) {
    if (input.constructor !== this.initialValueConstructor) {
      this.onUpdateValueMismatch(input.constructor);
      return;
    }
    const { context: gl } = this;
    utils.flattenTo(input.value, this.uploadValue);
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGLKernelValueSingleInput
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/unsigned-array.js":
/*!***********************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/unsigned-array.js ***!
  \***********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelArray } = __webpack_require__(/*! ./array */ "./src/backend/web-gl/kernel-value/array.js");

class WebGLKernelValueUnsignedArray extends WebGLKernelArray {
  constructor(value, settings) {
    super(value, settings);
    this.bitRatio = this.getBitRatio(value);
    this.dimensions = utils.getDimensions(value, true);
    this.textureSize = utils.getMemoryOptimizedPackedTextureSize(this.dimensions, this.bitRatio);
    this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * (4 / this.bitRatio);
    this.checkSize(this.textureSize[0], this.textureSize[1]);
    this.TranserArrayType = this.getTransferArrayType(value);
    this.preUploadValue = new this.TranserArrayType(this.uploadArrayLength);
    this.uploadValue = new Uint8Array(this.preUploadValue.buffer);
  }

  getStringValueHandler() {
    return utils.linesToString([
      `const preUploadValue_${this.name} = new ${this.TranserArrayType.name}(${this.uploadArrayLength})`,
      `const uploadValue_${this.name} = new Uint8Array(preUploadValue_${this.name}.buffer)`,
      `flattenTo(${this.varName}, preUploadValue_${this.name})`,
    ]);
  }

  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }

  updateValue(value) {
    if (value.constructor !== this.initialValueConstructor) {
      this.onUpdateValueMismatch(value.constructor);
      return;
    }
    const { context: gl } = this;
    utils.flattenTo(value, this.preUploadValue);
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, this.uploadValue);
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGLKernelValueUnsignedArray
};

/***/ }),

/***/ "./src/backend/web-gl/kernel-value/unsigned-input.js":
/*!***********************************************************!*\
  !*** ./src/backend/web-gl/kernel-value/unsigned-input.js ***!
  \***********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelArray } = __webpack_require__(/*! ./array */ "./src/backend/web-gl/kernel-value/array.js");

class WebGLKernelValueUnsignedInput extends WebGLKernelArray {
  constructor(value, settings) {
    super(value, settings);
    this.bitRatio = this.getBitRatio(value);
    const [w, h, d] = value.size;
    this.dimensions = new Int32Array([w || 1, h || 1, d || 1]);
    this.textureSize = utils.getMemoryOptimizedPackedTextureSize(this.dimensions, this.bitRatio);
    this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * (4 / this.bitRatio);
    this.checkSize(this.textureSize[0], this.textureSize[1]);
    this.TranserArrayType = this.getTransferArrayType(value.value);
    this.preUploadValue = new this.TranserArrayType(this.uploadArrayLength);
    this.uploadValue = new Uint8Array(this.preUploadValue.buffer);
  }

  getStringValueHandler() {
    return utils.linesToString([
      `const preUploadValue_${this.name} = new ${this.TranserArrayType.name}(${this.uploadArrayLength})`,
      `const uploadValue_${this.name} = new Uint8Array(preUploadValue_${this.name}.buffer)`,
      `flattenTo(${this.varName}.value, preUploadValue_${this.name})`,
    ]);
  }

  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }

  updateValue(input) {
    if (input.constructor !== this.initialValueConstructor) {
      this.onUpdateValueMismatch(value.constructor);
      return;
    }
    const { context: gl } = this;
    utils.flattenTo(input.value, this.preUploadValue);
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, this.uploadValue);
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGLKernelValueUnsignedInput
};

/***/ }),

/***/ "./src/backend/web-gl/kernel.js":
/*!**************************************!*\
  !*** ./src/backend/web-gl/kernel.js ***!
  \**************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { GLKernel } = __webpack_require__(/*! ../gl/kernel */ "./src/backend/gl/kernel.js");
const { FunctionBuilder } = __webpack_require__(/*! ../function-builder */ "./src/backend/function-builder.js");
const { WebGLFunctionNode } = __webpack_require__(/*! ./function-node */ "./src/backend/web-gl/function-node.js");
const { utils } = __webpack_require__(/*! ../../utils */ "./src/utils.js");
const mrud = __webpack_require__(/*! ../../plugins/math-random-uniformly-distributed */ "./src/plugins/math-random-uniformly-distributed.js");
const { fragmentShader } = __webpack_require__(/*! ./fragment-shader */ "./src/backend/web-gl/fragment-shader.js");
const { vertexShader } = __webpack_require__(/*! ./vertex-shader */ "./src/backend/web-gl/vertex-shader.js");
const { glKernelString } = __webpack_require__(/*! ../gl/kernel-string */ "./src/backend/gl/kernel-string.js");
const { lookupKernelValueType } = __webpack_require__(/*! ./kernel-value-maps */ "./src/backend/web-gl/kernel-value-maps.js");

let isSupported = null;
/**
 *
 * @type {HTMLCanvasElement|OffscreenCanvas|null}
 */
let testCanvas = null;
/**
 *
 * @type {WebGLRenderingContext|null}
 */
let testContext = null;
let testExtensions = null;
let features = null;

const plugins = [mrud];
const canvases = [];
const maxTexSizes = {};


/**
 * @desc Kernel Implementation for WebGL.
 * <p>This builds the shaders and runs them on the GPU,
 * the outputs the result back as float(enabled by default) and Texture.</p>
 *
 * @property {WebGLTexture[]} textureCache - webGl Texture cache
 * @property {Object.<string, WebGLUniformLocation>} programUniformLocationCache - Location of program variables in memory
 * @property {WebGLFramebuffer} framebuffer - Webgl frameBuffer
 * @property {WebGLBuffer} buffer - WebGL buffer
 * @property {WebGLProgram} program - The webGl Program
 * @property {FunctionBuilder} functionBuilder - Function Builder instance bound to this Kernel
 * @property {Boolean} pipeline - Set output type to FAST mode (GPU to GPU via Textures), instead of float
 * @property {string} endianness - Endian information like Little-endian, Big-endian.
 * @property {string[]} argumentTypes - Types of parameters sent to the Kernel
 * @property {string|null} compiledFragmentShader - Compiled fragment shader string
 * @property {string|null} compiledVertexShader - Compiled Vertical shader string
 * @extends GLKernel
 */
class WebGLKernel extends GLKernel {
  static get isSupported() {
    if (isSupported !== null) {
      return isSupported;
    }
    this.setupFeatureChecks();
    isSupported = this.isContextMatch(testContext);
    return isSupported;
  }

  static setupFeatureChecks() {
    if (typeof document !== 'undefined') {
      testCanvas = document.createElement('canvas');
    } else if (typeof OffscreenCanvas !== 'undefined') {
      testCanvas = new OffscreenCanvas(0, 0);
    }
    if (!testCanvas) return;
    testContext = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    if (!testContext || !testContext.getExtension) return;
    testExtensions = {
      OES_texture_float: testContext.getExtension('OES_texture_float'),
      OES_texture_float_linear: testContext.getExtension('OES_texture_float_linear'),
      OES_element_index_uint: testContext.getExtension('OES_element_index_uint'),
      WEBGL_draw_buffers: testContext.getExtension('WEBGL_draw_buffers'),
    };
    features = this.getFeatures();
  }

  static isContextMatch(context) {
    if (typeof WebGLRenderingContext !== 'undefined') {
      return context instanceof WebGLRenderingContext;
    }
    return false;
  }

  static getIsTextureFloat() {
    return Boolean(testExtensions.OES_texture_float);
  }

  static getIsDrawBuffers() {
    return Boolean(testExtensions.WEBGL_draw_buffers);
  }

  static getChannelCount() {
    return testExtensions.WEBGL_draw_buffers ?
      testContext.getParameter(testExtensions.WEBGL_draw_buffers.MAX_DRAW_BUFFERS_WEBGL) :
      1;
  }

  static getMaxTextureSize() {
    return testContext.getParameter(testContext.MAX_TEXTURE_SIZE);
  }

  /**
   *
   * @param type
   * @param dynamic
   * @param precision
   * @param value
   * @returns {KernelValue}
   */
  static lookupKernelValueType(type, dynamic, precision, value) {
    return lookupKernelValueType(type, dynamic, precision, value);
  }

  static get testCanvas() {
    return testCanvas;
  }

  static get testContext() {
    return testContext;
  }

  static get features() {
    return features;
  }

  static get fragmentShader() {
    return fragmentShader;
  }

  static get vertexShader() {
    return vertexShader;
  }

  /**
   *
   * @param {String|IKernelJSON} source
   * @param {IDirectKernelSettings} settings
   */
  constructor(source, settings) {
    super(source, settings);
    this.program = null;
    this.pipeline = settings.pipeline;
    this.endianness = utils.systemEndianness();
    this.extensions = {};
    this.argumentTextureCount = 0;
    this.constantTextureCount = 0;
    this.fragShader = null;
    this.vertShader = null;
    this.drawBuffersMap = null;

    /**
     *
     * @type {Int32Array|null}
     */
    this.maxTexSize = null;
    this.onRequestSwitchKernel = null;

    this.texture = null;
    this.mappedTextures = null;
    this.mergeSettings(source.settings || settings);

    /**
     * The thread dimensions, x, y and z
     * @type {Array|null}
     */
    this.threadDim = null;
    this.framebuffer = null;
    this.buffer = null;

    this.textureCache = [];
    this.programUniformLocationCache = {};
    this.uniform1fCache = {};
    this.uniform1iCache = {};
    this.uniform2fCache = {};
    this.uniform2fvCache = {};
    this.uniform2ivCache = {};
    this.uniform3fvCache = {};
    this.uniform3ivCache = {};
    this.uniform4fvCache = {};
    this.uniform4ivCache = {};
  }

  initCanvas() {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      // Default width and height, to fix webgl issue in safari
      canvas.width = 2;
      canvas.height = 2;
      return canvas;
    } else if (typeof OffscreenCanvas !== 'undefined') {
      return new OffscreenCanvas(0, 0);
    }
  }

  /**
   *
   * @return {WebGLRenderingContext}
   */
  initContext() {
    const settings = {
      alpha: false,
      depth: false,
      antialias: false
    };
    return this.canvas.getContext('webgl', settings) || this.canvas.getContext('experimental-webgl', settings);
  }

  /**
   *
   * @param {IDirectKernelSettings} settings
   * @return {string[]}
   */
  initPlugins(settings) {
    // default plugins
    const pluginsToUse = [];
    const { source } = this;
    if (typeof source === 'string') {
      for (let i = 0; i < plugins.length; i++) {
        const plugin = plugins[i];
        if (source.match(plugin.functionMatch)) {
          pluginsToUse.push(plugin);
        }
      }
    } else if (typeof source === 'object') {
      // `source` is from object, json
      if (settings.pluginNames) { //TODO: in context of JSON support, pluginNames may not exist here
        for (let i = 0; i < plugins.length; i++) {
          const plugin = plugins[i];
          const usePlugin = settings.pluginNames.some(pluginName => pluginName === plugin.name);
          if (usePlugin) {
            pluginsToUse.push(plugin);
          }
        }
      }
    }
    return pluginsToUse;
  }

  initExtensions() {
    this.extensions = {
      OES_texture_float: this.context.getExtension('OES_texture_float'),
      OES_texture_float_linear: this.context.getExtension('OES_texture_float_linear'),
      OES_element_index_uint: this.context.getExtension('OES_element_index_uint'),
      WEBGL_draw_buffers: this.context.getExtension('WEBGL_draw_buffers'),
      WEBGL_color_buffer_float: this.context.getExtension('WEBGL_color_buffer_float'),
    };
  }

  /**
   * @desc Validate settings related to Kernel, such as dimensions size, and auto output support.
   * @param {IArguments} args
   */
  validateSettings(args) {
    if (!this.validate) {
      this.texSize = utils.getKernelTextureSize({
        optimizeFloatMemory: this.optimizeFloatMemory,
        precision: this.precision,
      }, this.output);
      return;
    }

    const { features } = this.constructor;

    if (this.optimizeFloatMemory === true && !features.isTextureFloat) {
      throw new Error('Float textures are not supported');
    } else if (this.precision === 'single' && !features.isFloatRead) {
      throw new Error('Single precision not supported');
    } else if (!this.graphical && this.precision === null && features.isTextureFloat) {
      this.precision = features.isFloatRead ? 'single' : 'unsigned';
    }

    if (this.subKernels && this.subKernels.length > 0 && !this.extensions.WEBGL_draw_buffers) {
      throw new Error('could not instantiate draw buffers extension');
    }

    if (this.fixIntegerDivisionAccuracy === null) {
      this.fixIntegerDivisionAccuracy = !features.isIntegerDivisionAccurate;
    } else if (this.fixIntegerDivisionAccuracy && features.isIntegerDivisionAccurate) {
      this.fixIntegerDivisionAccuracy = false;
    }

    this.checkOutput();

    if (!this.output || this.output.length === 0) {
      if (args.length !== 1) {
        throw new Error('Auto output only supported for kernels with only one input');
      }

      const argType = utils.getVariableType(args[0], this.strictIntegers);
      switch (argType) {
        case 'Array':
          this.output = utils.getDimensions(argType);
          break;
        case 'NumberTexture':
        case 'MemoryOptimizedNumberTexture':
        case 'ArrayTexture(1)':
        case 'ArrayTexture(2)':
        case 'ArrayTexture(3)':
        case 'ArrayTexture(4)':
          this.output = args[0].output;
          break;
        default:
          throw new Error('Auto output not supported for input type: ' + argType);
      }
    }

    if (this.graphical) {
      if (this.output.length !== 2) {
        throw new Error('Output must have 2 dimensions on graphical mode');
      }

      if (this.precision === 'precision') {
        this.precision = 'unsigned';
        console.warn('Cannot use graphical mode and single precision at the same time');
      }

      this.texSize = utils.clone(this.output);
      return;
    } else if (this.precision === null && features.isTextureFloat) {
      this.precision = 'single';
    }

    this.texSize = utils.getKernelTextureSize({
      optimizeFloatMemory: this.optimizeFloatMemory,
      precision: this.precision,
    }, this.output);

    this.checkTextureSize();
  }

  updateMaxTexSize() {
    const { texSize, canvas } = this;
    if (this.maxTexSize === null) {
      let canvasIndex = canvases.indexOf(canvas);
      if (canvasIndex === -1) {
        canvasIndex = canvases.length;
        canvases.push(canvas);
        maxTexSizes[canvasIndex] = [texSize[0], texSize[1]];
      }
      this.maxTexSize = maxTexSizes[canvasIndex];
    }
    if (this.maxTexSize[0] < texSize[0]) {
      this.maxTexSize[0] = texSize[0];
    }
    if (this.maxTexSize[1] < texSize[1]) {
      this.maxTexSize[1] = texSize[1];
    }
  }

  setupArguments(args) {
    this.kernelArguments = [];
    this.argumentTextureCount = 0;
    const needsArgumentTypes = this.argumentTypes === null;
    // TODO: remove
    if (needsArgumentTypes) {
      this.argumentTypes = [];
    }
    this.argumentSizes = [];
    this.argumentBitRatios = [];
    // TODO: end remove

    if (args.length < this.argumentNames.length) {
      throw new Error('not enough arguments for kernel');
    } else if (args.length > this.argumentNames.length) {
      throw new Error('too many arguments for kernel');
    }

    const { context: gl } = this;
    let textureIndexes = 0;

    const onRequestTexture = () => {
      return this.createTexture();
    };
    const onRequestIndex = () => {
      return this.constantTextureCount + textureIndexes++;
    };
    const onUpdateValueMismatch = (constructor) => {
      this.switchKernels({
        type: 'argumentMismatch',
        needed: constructor
      });
    };
    const onRequestContextHandle = () => {
      return gl.TEXTURE0 + this.constantTextureCount + this.argumentTextureCount++;
    };

    for (let index = 0; index < args.length; index++) {
      const value = args[index];
      const name = this.argumentNames[index];
      let type;
      if (needsArgumentTypes) {
        type = utils.getVariableType(value, this.strictIntegers);
        this.argumentTypes.push(type);
      } else {
        type = this.argumentTypes[index];
      }
      const KernelValue = this.constructor.lookupKernelValueType(type, this.dynamicArguments ? 'dynamic' : 'static', this.precision, args[index]);
      if (KernelValue === null) {
        return this.requestFallback(args);
      }
      const kernelArgument = new KernelValue(value, {
        name,
        type,
        tactic: this.tactic,
        origin: 'user',
        context: gl,
        checkContext: this.checkContext,
        kernel: this,
        strictIntegers: this.strictIntegers,
        onRequestTexture,
        onRequestIndex,
        onUpdateValueMismatch,
        onRequestContextHandle,
      });
      this.kernelArguments.push(kernelArgument);
      kernelArgument.setup();
      this.argumentSizes.push(kernelArgument.textureSize);
      this.argumentBitRatios[index] = kernelArgument.bitRatio;
    }
  }

  createTexture() {
    const texture = this.context.createTexture();
    this.textureCache.push(texture);
    return texture;
  }

  setupConstants(args) {
    const { context: gl } = this;
    this.kernelConstants = [];
    this.forceUploadKernelConstants = [];
    let needsConstantTypes = this.constantTypes === null;
    if (needsConstantTypes) {
      this.constantTypes = {};
    }
    this.constantBitRatios = {};
    let textureIndexes = 0;
    for (const name in this.constants) {
      const value = this.constants[name];
      let type;
      if (needsConstantTypes) {
        type = utils.getVariableType(value, this.strictIntegers);
        this.constantTypes[name] = type;
      } else {
        type = this.constantTypes[name];
      }
      const KernelValue = this.constructor.lookupKernelValueType(type, 'static', this.precision, value);
      if (KernelValue === null) {
        return this.requestFallback(args);
      }
      const kernelValue = new KernelValue(value, {
        name,
        type,
        tactic: this.tactic,
        origin: 'constants',
        context: this.context,
        checkContext: this.checkContext,
        kernel: this,
        strictIntegers: this.strictIntegers,
        onRequestTexture: () => {
          return this.createTexture();
        },
        onRequestIndex: () => {
          return textureIndexes++;
        },
        onRequestContextHandle: () => {
          return gl.TEXTURE0 + this.constantTextureCount++;
        }
      });
      this.constantBitRatios[name] = kernelValue.bitRatio;
      this.kernelConstants.push(kernelValue);
      kernelValue.setup();
      if (kernelValue.forceUploadEachRun) {
        this.forceUploadKernelConstants.push(kernelValue);
      }
    }
  }

  build() {
    if (this.built) return;
    this.initExtensions();
    this.validateSettings(arguments);
    this.setupConstants(arguments);
    if (this.fallbackRequested) return;
    this.setupArguments(arguments);
    if (this.fallbackRequested) return;
    this.updateMaxTexSize();
    this.translateSource();
    const failureResult = this.pickRenderStrategy(arguments);
    if (failureResult) {
      return failureResult;
    }
    const { texSize, context: gl, canvas } = this;
    gl.enable(gl.SCISSOR_TEST);
    if (this.pipeline && this.precision === 'single') {
      gl.viewport(0, 0, this.maxTexSize[0], this.maxTexSize[1]);
      canvas.width = this.maxTexSize[0];
      canvas.height = this.maxTexSize[1];
    } else {
      gl.viewport(0, 0, this.maxTexSize[0], this.maxTexSize[1]);
      canvas.width = this.maxTexSize[0];
      canvas.height = this.maxTexSize[1];
    }
    const threadDim = this.threadDim = Array.from(this.output);
    while (threadDim.length < 3) {
      threadDim.push(1);
    }

    const compiledVertexShader = this.getVertexShader(arguments);
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, compiledVertexShader);
    gl.compileShader(vertShader);
    this.vertShader = vertShader;

    const compiledFragmentShader = this.getFragmentShader(arguments);
    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, compiledFragmentShader);
    gl.compileShader(fragShader);
    this.fragShader = fragShader;

    if (this.debug) {
      console.log('GLSL Shader Output:');
      console.log(compiledFragmentShader);
    }

    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
      throw new Error('Error compiling vertex shader: ' + gl.getShaderInfoLog(vertShader));
    }
    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
      throw new Error('Error compiling fragment shader: ' + gl.getShaderInfoLog(fragShader));
    }

    const program = this.program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    this.framebuffer = gl.createFramebuffer();
    this.framebuffer.width = texSize[0];
    this.framebuffer.height = texSize[1];
    this.rawValueFramebuffers = {};

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

    let buffer = this.buffer;
    if (!buffer) {
      buffer = this.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices.byteLength + texCoords.byteLength, gl.STATIC_DRAW);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    }

    gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
    gl.bufferSubData(gl.ARRAY_BUFFER, texCoordOffset, texCoords);

    const aPosLoc = gl.getAttribLocation(this.program, 'aPos');
    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);
    const aTexCoordLoc = gl.getAttribLocation(this.program, 'aTexCoord');
    gl.enableVertexAttribArray(aTexCoordLoc);
    gl.vertexAttribPointer(aTexCoordLoc, 2, gl.FLOAT, false, 0, texCoordOffset);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);

    let i = 0;
    gl.useProgram(this.program);
    for (let p in this.constants) {
      this.kernelConstants[i++].updateValue(this.constants[p]);
    }

    this._setupOutputTexture();
    if (
      this.subKernels !== null &&
      this.subKernels.length > 0
    ) {
      this._mappedTextureSwitched = {};
      this._setupSubOutputTextures();
    }
    this.buildSignature(arguments);
    this.built = true;
  }

  translateSource() {
    const functionBuilder = FunctionBuilder.fromKernel(this, WebGLFunctionNode, {
      fixIntegerDivisionAccuracy: this.fixIntegerDivisionAccuracy
    });
    this.translatedSource = functionBuilder.getPrototypeString('kernel');
    this.setupReturnTypes(functionBuilder);
  }

  setupReturnTypes(functionBuilder) {
    if (!this.graphical && !this.returnType) {
      this.returnType = functionBuilder.getKernelResultType();
    }

    if (this.subKernels && this.subKernels.length > 0) {
      for (let i = 0; i < this.subKernels.length; i++) {
        const subKernel = this.subKernels[i];
        if (!subKernel.returnType) {
          subKernel.returnType = functionBuilder.getSubKernelResultType(i);
        }
      }
    }
  }

  run() {
    const { kernelArguments, texSize, forceUploadKernelConstants, context: gl } = this;

    gl.useProgram(this.program);
    gl.scissor(0, 0, texSize[0], texSize[1]);
    if (this.dynamicOutput) {
      this.setUniform3iv('uOutputDim', new Int32Array(this.threadDim));
      this.setUniform2iv('uTexSize', texSize);
    }

    this.setUniform2f('ratio', texSize[0] / this.maxTexSize[0], texSize[1] / this.maxTexSize[1]);

    for (let i = 0; i < forceUploadKernelConstants.length; i++) {
      const constant = forceUploadKernelConstants[i];
      constant.updateValue(this.constants[constant.name]);
      if (this.switchingKernels) return;
    }
    for (let i = 0; i < kernelArguments.length; i++) {
      kernelArguments[i].updateValue(arguments[i]);
      if (this.switchingKernels) return;
    }

    if (this.plugins) {
      for (let i = 0; i < this.plugins.length; i++) {
        const plugin = this.plugins[i];
        if (plugin.onBeforeRun) {
          plugin.onBeforeRun(this);
        }
      }
    }

    if (this.graphical) {
      if (this.pipeline) {
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        if (this.immutable) {
          this._replaceOutputTexture();
        }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        return this.immutable ? this.texture.clone() : this.texture;
      }
      gl.bindRenderbuffer(gl.RENDERBUFFER, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    if (this.immutable) {
      this._replaceOutputTexture();
    }

    if (this.subKernels !== null) {
      if (this.immutable) {
        this._replaceSubOutputTextures();
      }
      this.drawBuffers();
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  drawBuffers() {
    this.extensions.WEBGL_draw_buffers.drawBuffersWEBGL(this.drawBuffersMap);
  }

  getInternalFormat() {
    return this.context.RGBA;
  }
  getTextureFormat() {
    const { context: gl } = this;
    switch (this.getInternalFormat()) {
      case gl.RGBA:
        return gl.RGBA;
      default:
        throw new Error('Unknown internal format');
    }
  }

  /**
   *
   * @desc replace output textures where arguments my be the same values
   */
  _replaceOutputTexture() {
    if (this.texture.beforeMutate() || this._textureSwitched) {
      const gl = this.context;
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture.texture, 0);
      this._textureSwitched = false;
    }
  }

  /**
   * @desc Setup output texture
   */
  _setupOutputTexture() {
    const gl = this.context;
    const texSize = this.texSize;
    if (this.texture) {
      // here we inherit from an already existing kernel, so go ahead and just bind textures to the framebuffer
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture.texture, 0);
      return;
    }
    const texture = this.createTexture();
    gl.activeTexture(gl.TEXTURE0 + this.constantTextureCount + this.argumentTextureCount);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    const format = this.getInternalFormat();
    if (this.precision === 'single') {
      gl.texImage2D(gl.TEXTURE_2D, 0, format, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, format, texSize[0], texSize[1], 0, format, gl.UNSIGNED_BYTE, null);
    }
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    this.texture = new this.TextureConstructor({
      texture,
      size: texSize,
      dimensions: this.threadDim,
      output: this.output,
      context: this.context,
      internalFormat: this.getInternalFormat(),
      textureFormat: this.getTextureFormat(),
      kernel: this,
    });
  }

  /**
   *
   * @desc replace sub-output textures where arguments my be the same values
   */
  _replaceSubOutputTextures() {
    const gl = this.context;
    for (let i = 0; i < this.mappedTextures.length; i++) {
      const mappedTexture = this.mappedTextures[i];
      if (mappedTexture.beforeMutate() || this._mappedTextureSwitched[i]) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i + 1, gl.TEXTURE_2D, mappedTexture.texture, 0);
        this._mappedTextureSwitched[i] = false;
      }
    }
  }

  /**
   * @desc Setup on inherit sub-output textures
   */
  _setupSubOutputTextures() {
    const gl = this.context;
    if (this.mappedTextures) {
      // here we inherit from an already existing kernel, so go ahead and just bind textures to the framebuffer
      for (let i = 0; i < this.subKernels.length; i++) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i + 1, gl.TEXTURE_2D, this.mappedTextures[i].texture, 0);
      }
      return;
    }
    const texSize = this.texSize;
    this.drawBuffersMap = [gl.COLOR_ATTACHMENT0];
    this.mappedTextures = [];
    for (let i = 0; i < this.subKernels.length; i++) {
      const texture = this.createTexture();
      this.drawBuffersMap.push(gl.COLOR_ATTACHMENT0 + i + 1);
      gl.activeTexture(gl.TEXTURE0 + this.constantTextureCount + this.argumentTextureCount + i);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      if (this.precision === 'single') {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i + 1, gl.TEXTURE_2D, texture, 0);

      this.mappedTextures.push(new this.TextureConstructor({
        texture,
        size: texSize,
        dimensions: this.threadDim,
        output: this.output,
        context: this.context,
        internalFormat: this.getInternalFormat(),
        textureFormat: this.getTextureFormat(),
        kernel: this,
      }));
    }
  }

  setUniform1f(name, value) {
    if (this.uniform1fCache.hasOwnProperty(name)) {
      const cache = this.uniform1fCache[name];
      if (value === cache) {
        return;
      }
    }
    this.uniform1fCache[name] = value;
    const loc = this.getUniformLocation(name);
    this.context.uniform1f(loc, value);
  }

  setUniform1i(name, value) {
    if (this.uniform1iCache.hasOwnProperty(name)) {
      const cache = this.uniform1iCache[name];
      if (value === cache) {
        return;
      }
    }
    this.uniform1iCache[name] = value;
    const loc = this.getUniformLocation(name);
    this.context.uniform1i(loc, value);
  }

  setUniform2f(name, value1, value2) {
    if (this.uniform2fCache.hasOwnProperty(name)) {
      const cache = this.uniform2fCache[name];
      if (
        value1 === cache[0] &&
        value2 === cache[1]
      ) {
        return;
      }
    }
    this.uniform2fCache[name] = [value1, value2];
    const loc = this.getUniformLocation(name);
    this.context.uniform2f(loc, value1, value2);
  }

  setUniform2fv(name, value) {
    if (this.uniform2fvCache.hasOwnProperty(name)) {
      const cache = this.uniform2fvCache[name];
      if (
        value[0] === cache[0] &&
        value[1] === cache[1]
      ) {
        return;
      }
    }
    this.uniform2fvCache[name] = value;
    const loc = this.getUniformLocation(name);
    this.context.uniform2fv(loc, value);
  }

  setUniform2iv(name, value) {
    if (this.uniform2ivCache.hasOwnProperty(name)) {
      const cache = this.uniform2ivCache[name];
      if (
        value[0] === cache[0] &&
        value[1] === cache[1]
      ) {
        return;
      }
    }
    this.uniform2ivCache[name] = value;
    const loc = this.getUniformLocation(name);
    this.context.uniform2iv(loc, value);
  }

  setUniform3fv(name, value) {
    if (this.uniform3fvCache.hasOwnProperty(name)) {
      const cache = this.uniform3fvCache[name];
      if (
        value[0] === cache[0] &&
        value[1] === cache[1] &&
        value[2] === cache[2]
      ) {
        return;
      }
    }
    this.uniform3fvCache[name] = value;
    const loc = this.getUniformLocation(name);
    this.context.uniform3fv(loc, value);
  }

  setUniform3iv(name, value) {
    if (this.uniform3ivCache.hasOwnProperty(name)) {
      const cache = this.uniform3ivCache[name];
      if (
        value[0] === cache[0] &&
        value[1] === cache[1] &&
        value[2] === cache[2]
      ) {
        return;
      }
    }
    this.uniform3ivCache[name] = value;
    const loc = this.getUniformLocation(name);
    this.context.uniform3iv(loc, value);
  }

  setUniform4fv(name, value) {
    if (this.uniform4fvCache.hasOwnProperty(name)) {
      const cache = this.uniform4fvCache[name];
      if (
        value[0] === cache[0] &&
        value[1] === cache[1] &&
        value[2] === cache[2] &&
        value[3] === cache[3]
      ) {
        return;
      }
    }
    this.uniform4fvCache[name] = value;
    const loc = this.getUniformLocation(name);
    this.context.uniform4fv(loc, value);
  }

  setUniform4iv(name, value) {
    if (this.uniform4ivCache.hasOwnProperty(name)) {
      const cache = this.uniform4ivCache[name];
      if (
        value[0] === cache[0] &&
        value[1] === cache[1] &&
        value[2] === cache[2] &&
        value[3] === cache[3]
      ) {
        return;
      }
    }
    this.uniform4ivCache[name] = value;
    const loc = this.getUniformLocation(name);
    this.context.uniform4iv(loc, value);
  }

  /**
   * @desc Return WebGlUniformLocation for various variables
   * related to webGl program, such as user-defined variables,
   * as well as, dimension sizes, etc.
   */
  getUniformLocation(name) {
    if (this.programUniformLocationCache.hasOwnProperty(name)) {
      return this.programUniformLocationCache[name];
    }
    return this.programUniformLocationCache[name] = this.context.getUniformLocation(this.program, name);
  }

  /**
   * @desc Generate Shader artifacts for the kernel program.
   * The final object contains HEADER, KERNEL, MAIN_RESULT, and others.
   *
   * @param {Array} args - The actual parameters sent to the Kernel
   * @returns {Object} An object containing the Shader Artifacts(CONSTANTS, HEADER, KERNEL, etc.)
   */
  _getFragShaderArtifactMap(args) {
    return {
      HEADER: this._getHeaderString(),
      LOOP_MAX: this._getLoopMaxString(),
      PLUGINS: this._getPluginsString(),
      CONSTANTS: this._getConstantsString(),
      DECODE32_ENDIANNESS: this._getDecode32EndiannessString(),
      ENCODE32_ENDIANNESS: this._getEncode32EndiannessString(),
      DIVIDE_WITH_INTEGER_CHECK: this._getDivideWithIntegerCheckString(),
      INJECTED_NATIVE: this._getInjectedNative(),
      MAIN_CONSTANTS: this._getMainConstantsString(),
      MAIN_ARGUMENTS: this._getMainArgumentsString(args),
      KERNEL: this.getKernelString(),
      MAIN_RESULT: this.getMainResultString(),
      FLOAT_TACTIC_DECLARATION: this.getFloatTacticDeclaration(),
      INT_TACTIC_DECLARATION: this.getIntTacticDeclaration(),
      SAMPLER_2D_TACTIC_DECLARATION: this.getSampler2DTacticDeclaration(),
      SAMPLER_2D_ARRAY_TACTIC_DECLARATION: this.getSampler2DArrayTacticDeclaration(),
    };
  }

  /**
   * @desc Generate Shader artifacts for the kernel program.
   * The final object contains HEADER, KERNEL, MAIN_RESULT, and others.
   *
   * @param {Array} args - The actual parameters sent to the Kernel
   * @returns {Object} An object containing the Shader Artifacts(CONSTANTS, HEADER, KERNEL, etc.)
   */
  _getVertShaderArtifactMap(args) {
    return {
      FLOAT_TACTIC_DECLARATION: this.getFloatTacticDeclaration(),
      INT_TACTIC_DECLARATION: this.getIntTacticDeclaration(),
      SAMPLER_2D_TACTIC_DECLARATION: this.getSampler2DTacticDeclaration(),
      SAMPLER_2D_ARRAY_TACTIC_DECLARATION: this.getSampler2DArrayTacticDeclaration(),
    };
  }

  /**
   * @desc Get the header string for the program.
   * This returns an empty string if no sub-kernels are defined.
   *
   * @returns {String} result
   */
  _getHeaderString() {
    return (
      this.subKernels !== null ?
      '#extension GL_EXT_draw_buffers : require\n' :
      ''
    );
  }

  /**
   * @desc Get the maximum loop size String.
   * @returns {String} result
   */
  _getLoopMaxString() {
    return (
      this.loopMaxIterations ?
      ` ${parseInt(this.loopMaxIterations)};\n` :
      ' 1000;\n'
    );
  }

  _getPluginsString() {
    if (!this.plugins) return '\n';
    return this.plugins.map(plugin => plugin.source && this.source.match(plugin.functionMatch) ? plugin.source : '').join('\n');
  }

  /**
   * @desc Generate transpiled glsl Strings for constant parameters sent to a kernel
   * @returns {String} result
   */
  _getConstantsString() {
    const result = [];
    const { threadDim, texSize } = this;
    if (this.dynamicOutput) {
      result.push(
        'uniform ivec3 uOutputDim',
        'uniform ivec2 uTexSize'
      );
    } else {
      result.push(
        `ivec3 uOutputDim = ivec3(${threadDim[0]}, ${threadDim[1]}, ${threadDim[2]})`,
        `ivec2 uTexSize = ivec2(${texSize[0]}, ${texSize[1]})`
      );
    }
    return utils.linesToString(result);
  }

  /**
   * @desc Get texture coordinate string for the program
   * @returns {String} result
   */
  _getTextureCoordinate() {
    const subKernels = this.subKernels;
    if (subKernels === null || subKernels.length < 1) {
      return 'varying vec2 vTexCoord;\n';
    } else {
      return 'out vec2 vTexCoord;\n';
    }
  }

  /**
   * @desc Get Decode32 endianness string for little-endian and big-endian
   * @returns {String} result
   */
  _getDecode32EndiannessString() {
    return (
      this.endianness === 'LE' ?
      '' :
      '  texel.rgba = texel.abgr;\n'
    );
  }

  /**
   * @desc Get Encode32 endianness string for little-endian and big-endian
   * @returns {String} result
   */
  _getEncode32EndiannessString() {
    return (
      this.endianness === 'LE' ?
      '' :
      '  texel.rgba = texel.abgr;\n'
    );
  }

  /**
   * @desc if fixIntegerDivisionAccuracy provide method to replace /
   * @returns {String} result
   */
  _getDivideWithIntegerCheckString() {
    return this.fixIntegerDivisionAccuracy ?
      `float divWithIntCheck(float x, float y) {
  if (floor(x) == x && floor(y) == y && integerMod(x, y) == 0.0) {
    return float(int(x) / int(y));
  }
  return x / y;
}

float integerCorrectionModulo(float number, float divisor) {
  if (number < 0.0) {
    number = abs(number);
    if (divisor < 0.0) {
      divisor = abs(divisor);
    }
    return -(number - (divisor * floor(divWithIntCheck(number, divisor))));
  }
  if (divisor < 0.0) {
    divisor = abs(divisor);
  }
  return number - (divisor * floor(divWithIntCheck(number, divisor)));
}` :
      '';
  }

  /**
   * @desc Generate transpiled glsl Strings for user-defined parameters sent to a kernel
   * @param {Array} args - The actual parameters sent to the Kernel
   * @returns {String} result
   */
  _getMainArgumentsString(args) {
    const results = [];
    const { argumentNames } = this;
    for (let i = 0; i < argumentNames.length; i++) {
      results.push(this.kernelArguments[i].getSource(args[i]));
    }
    return results.join('');
  }

  _getInjectedNative() {
    return this.injectedNative || '';
  }

  _getMainConstantsString() {
    const result = [];
    const { constants } = this;
    if (constants) {
      let i = 0;
      for (const name in constants) {
        if (!this.constants.hasOwnProperty(name)) continue;
        result.push(this.kernelConstants[i++].getSource(this.constants[name]));
      }
    }
    return result.join('');
  }

  getRawValueFramebuffer(width, height) {
    if (!this.rawValueFramebuffers[width]) {
      this.rawValueFramebuffers[width] = {};
    }
    if (!this.rawValueFramebuffers[width][height]) {
      const framebuffer = this.context.createFramebuffer();
      framebuffer.width = width;
      framebuffer.height = height;
      this.rawValueFramebuffers[width][height] = framebuffer;
    }
    return this.rawValueFramebuffers[width][height];
  }

  getKernelResultDeclaration() {
    switch (this.returnType) {
      case 'Array(2)':
        return 'vec2 kernelResult';
      case 'Array(3)':
        return 'vec3 kernelResult';
      case 'Array(4)':
        return 'vec4 kernelResult';
      case 'LiteralInteger':
      case 'Float':
      case 'Number':
      case 'Integer':
        return 'float kernelResult';
      default:
        if (this.graphical) {
          return 'float kernelResult';
        } else {
          throw new Error(`unrecognized output type "${ this.returnType }"`);
        }
    }
  }
  /**
   * @desc Get Kernel program string (in *glsl*) for a kernel.
   * @returns {String} result
   */
  getKernelString() {
    const result = [this.getKernelResultDeclaration()];
    const { subKernels } = this;
    if (subKernels !== null) {
      switch (this.returnType) {
        case 'Number':
        case 'Float':
        case 'Integer':
          for (let i = 0; i < subKernels.length; i++) {
            const subKernel = subKernels[i];
            result.push(
              subKernel.returnType === 'Integer' ?
              `int subKernelResult_${ subKernel.name } = 0` :
              `float subKernelResult_${ subKernel.name } = 0.0`
            );
          }
          break;
        case 'Array(2)':
          for (let i = 0; i < subKernels.length; i++) {
            result.push(
              `vec2 subKernelResult_${ subKernels[i].name }`
            );
          }
          break;
        case 'Array(3)':
          for (let i = 0; i < subKernels.length; i++) {
            result.push(
              `vec3 subKernelResult_${ subKernels[i].name }`
            );
          }
          break;
        case 'Array(4)':
          for (let i = 0; i < subKernels.length; i++) {
            result.push(
              `vec4 subKernelResult_${ subKernels[i].name }`
            );
          }
          break;
      }
    }

    return utils.linesToString(result) + this.translatedSource;
  }

  getMainResultGraphical() {
    return utils.linesToString([
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      '  gl_FragColor = actualColor',
    ]);
  }

  getMainResultPackedPixels() {
    switch (this.returnType) {
      case 'LiteralInteger':
      case 'Number':
      case 'Integer':
      case 'Float':
        return this.getMainResultKernelPackedPixels() +
          this.getMainResultSubKernelPackedPixels();
      default:
        throw new Error(`packed output only usable with Numbers, "${this.returnType}" specified`);
    }
  }

  /**
   * @return {String}
   */
  getMainResultKernelPackedPixels() {
    return utils.linesToString([
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      `  gl_FragData[0] = ${this.useLegacyEncoder ? 'legacyEncode32' : 'encode32'}(kernelResult)`
    ]);
  }

  /**
   * @return {String}
   */
  getMainResultSubKernelPackedPixels() {
    const result = [];
    if (!this.subKernels) return '';
    for (let i = 0; i < this.subKernels.length; i++) {
      const subKernel = this.subKernels[i];
      if (subKernel.returnType === 'Integer') {
        result.push(
          `  gl_FragData[${i + 1}] = ${this.useLegacyEncoder ? 'legacyEncode32' : 'encode32'}(float(subKernelResult_${this.subKernels[i].name}))`
        );
      } else {
        result.push(
          `  gl_FragData[${i + 1}] = ${this.useLegacyEncoder ? 'legacyEncode32' : 'encode32'}(subKernelResult_${this.subKernels[i].name})`
        );
      }
    }
    return utils.linesToString(result);
  }

  getMainResultMemoryOptimizedFloats() {
    const result = [
      '  index *= 4',
    ];

    switch (this.returnType) {
      case 'Number':
      case 'Integer':
      case 'Float':
        const channels = ['r', 'g', 'b', 'a'];
        for (let i = 0; i < channels.length; i++) {
          const channel = channels[i];
          this.getMainResultKernelMemoryOptimizedFloats(result, channel);
          this.getMainResultSubKernelMemoryOptimizedFloats(result, channel);
          if (i + 1 < channels.length) {
            result.push('  index += 1');
          }
        }
        break;
      default:
        throw new Error(`optimized output only usable with Numbers, ${this.returnType} specified`);
    }

    return utils.linesToString(result);
  }

  getMainResultKernelMemoryOptimizedFloats(result, channel) {
    result.push(
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      `  gl_FragData[0].${channel} = kernelResult`
    );
  }

  getMainResultSubKernelMemoryOptimizedFloats(result, channel) {
    if (!this.subKernels) return result;
    for (let i = 0; i < this.subKernels.length; i++) {
      const subKernel = this.subKernels[i];
      if (subKernel.returnType === 'Integer') {
        result.push(
          `  gl_FragData[${i + 1}].${channel} = float(subKernelResult_${this.subKernels[i].name})`
        );
      } else {
        result.push(
          `  gl_FragData[${i + 1}].${channel} = subKernelResult_${this.subKernels[i].name}`
        );
      }
    }
  }

  getMainResultKernelNumberTexture() {
    return [
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      '  gl_FragData[0][0] = kernelResult',
    ];
  }

  getMainResultSubKernelNumberTexture() {
    const result = [];
    if (!this.subKernels) return result;
    for (let i = 0; i < this.subKernels.length; ++i) {
      const subKernel = this.subKernels[i];
      if (subKernel.returnType === 'Integer') {
        result.push(
          `  gl_FragData[${i + 1}][0] = float(subKernelResult_${subKernel.name})`
        );
      } else {
        result.push(
          `  gl_FragData[${i + 1}][0] = subKernelResult_${subKernel.name}`
        );
      }
    }
    return result;
  }

  getMainResultKernelArray2Texture() {
    return [
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      '  gl_FragData[0][0] = kernelResult[0]',
      '  gl_FragData[0][1] = kernelResult[1]',
    ];
  }

  getMainResultSubKernelArray2Texture() {
    const result = [];
    if (!this.subKernels) return result;
    for (let i = 0; i < this.subKernels.length; ++i) {
      result.push(
        `  gl_FragData[${i + 1}][0] = subKernelResult_${this.subKernels[i].name}[0]`,
        `  gl_FragData[${i + 1}][1] = subKernelResult_${this.subKernels[i].name}[1]`
      );
    }
    return result;
  }

  getMainResultKernelArray3Texture() {
    return [
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      '  gl_FragData[0][0] = kernelResult[0]',
      '  gl_FragData[0][1] = kernelResult[1]',
      '  gl_FragData[0][2] = kernelResult[2]',
    ];
  }

  getMainResultSubKernelArray3Texture() {
    const result = [];
    if (!this.subKernels) return result;
    for (let i = 0; i < this.subKernels.length; ++i) {
      result.push(
        `  gl_FragData[${i + 1}][0] = subKernelResult_${this.subKernels[i].name}[0]`,
        `  gl_FragData[${i + 1}][1] = subKernelResult_${this.subKernels[i].name}[1]`,
        `  gl_FragData[${i + 1}][2] = subKernelResult_${this.subKernels[i].name}[2]`
      );
    }
    return result;
  }

  getMainResultKernelArray4Texture() {
    return [
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      '  gl_FragData[0] = kernelResult',
    ];
  }

  getMainResultSubKernelArray4Texture() {
    const result = [];
    if (!this.subKernels) return result;
    switch (this.returnType) {
      case 'Number':
      case 'Float':
      case 'Integer':
        for (let i = 0; i < this.subKernels.length; ++i) {
          const subKernel = this.subKernels[i];
          if (subKernel.returnType === 'Integer') {
            result.push(
              `  gl_FragData[${i + 1}] = float(subKernelResult_${this.subKernels[i].name})`
            );
          } else {
            result.push(
              `  gl_FragData[${i + 1}] = subKernelResult_${this.subKernels[i].name}`
            );
          }
        }
        break;
      case 'Array(2)':
        for (let i = 0; i < this.subKernels.length; ++i) {
          result.push(
            `  gl_FragData[${i + 1}][0] = subKernelResult_${this.subKernels[i].name}[0]`,
            `  gl_FragData[${i + 1}][1] = subKernelResult_${this.subKernels[i].name}[1]`
          );
        }
        break;
      case 'Array(3)':
        for (let i = 0; i < this.subKernels.length; ++i) {
          result.push(
            `  gl_FragData[${i + 1}][0] = subKernelResult_${this.subKernels[i].name}[0]`,
            `  gl_FragData[${i + 1}][1] = subKernelResult_${this.subKernels[i].name}[1]`,
            `  gl_FragData[${i + 1}][2] = subKernelResult_${this.subKernels[i].name}[2]`
          );
        }
        break;
      case 'Array(4)':
        for (let i = 0; i < this.subKernels.length; ++i) {
          result.push(
            `  gl_FragData[${i + 1}][0] = subKernelResult_${this.subKernels[i].name}[0]`,
            `  gl_FragData[${i + 1}][1] = subKernelResult_${this.subKernels[i].name}[1]`,
            `  gl_FragData[${i + 1}][2] = subKernelResult_${this.subKernels[i].name}[2]`,
            `  gl_FragData[${i + 1}][3] = subKernelResult_${this.subKernels[i].name}[3]`
          );
        }
        break;
    }

    return result;
  }

  /**
   * @param {String} src - Shader string
   * @param {Object} map - Variables/Constants associated with shader
   */
  replaceArtifacts(src, map) {
    return src.replace(/[ ]*__([A-Z]+[0-9]*([_]?[A-Z]*[0-9]?)*)__;\n/g, (match, artifact) => {
      if (map.hasOwnProperty(artifact)) {
        return map[artifact];
      }
      throw `unhandled artifact ${artifact}`;
    });
  }

  /**
   * @desc Get the fragment shader String.
   * If the String hasn't been compiled yet,
   * then this method compiles it as well
   *
   * @param {Array} args - The actual parameters sent to the Kernel
   * @returns {string} Fragment Shader string
   */
  getFragmentShader(args) {
    if (this.compiledFragmentShader !== null) {
      return this.compiledFragmentShader;
    }
    return this.compiledFragmentShader = this.replaceArtifacts(this.constructor.fragmentShader, this._getFragShaderArtifactMap(args));
  }

  /**
   * @desc Get the vertical shader String
   * @param {Array|IArguments} args - The actual parameters sent to the Kernel
   * @returns {string} Vertical Shader string
   */
  getVertexShader(args) {
    if (this.compiledVertexShader !== null) {
      return this.compiledVertexShader;
    }
    return this.compiledVertexShader = this.replaceArtifacts(this.constructor.vertexShader, this._getVertShaderArtifactMap(args));
  }

  /**
   * @desc Returns the *pre-compiled* Kernel as a JS Object String, that can be reused.
   */
  toString() {
    const setupContextString = utils.linesToString([
      `const gl = context`,
    ]);
    return glKernelString(this.constructor, arguments, this, setupContextString);
  }

  destroy(removeCanvasReferences) {
    if (!this.context) return;
    if (this.buffer) {
      this.context.deleteBuffer(this.buffer);
    }
    if (this.framebuffer) {
      this.context.deleteFramebuffer(this.framebuffer);
    }
    for (const width in this.rawValueFramebuffers) {
      for (const height in this.rawValueFramebuffers[width]) {
        this.context.deleteFramebuffer(this.rawValueFramebuffers[width][height]);
        delete this.rawValueFramebuffers[width][height];
      }
      delete this.rawValueFramebuffers[width];
    }
    if (this.vertShader) {
      this.context.deleteShader(this.vertShader);
    }
    if (this.fragShader) {
      this.context.deleteShader(this.fragShader);
    }
    if (this.program) {
      this.context.deleteProgram(this.program);
    }
    if (this.texture) {
      this.texture.delete();
      const textureCacheIndex = this.textureCache.indexOf(this.texture.texture);
      if (textureCacheIndex > -1) {
        this.textureCache.splice(textureCacheIndex, 1);
      }
      this.texture = null;
    }
    if (this.mappedTextures && this.mappedTextures.length) {
      for (let i = 0; i < this.mappedTextures.length; i++) {
        const mappedTexture = this.mappedTextures[i];
        mappedTexture.delete();
        const textureCacheIndex = this.textureCache.indexOf(mappedTexture.texture);
        if (textureCacheIndex > -1) {
          this.textureCache.splice(textureCacheIndex, 1);
        }
      }
      this.mappedTextures = null;
    }
    if (this.kernelArguments) {
      for (let i = 0; i < this.kernelArguments.length; i++) {
        this.kernelArguments[i].destroy();
      }
    }
    if (this.kernelConstants) {
      for (let i = 0; i < this.kernelConstants.length; i++) {
        this.kernelConstants[i].destroy();
      }
    }
    while (this.textureCache.length > 0) {
      const texture = this.textureCache.pop();
      this.context.deleteTexture(texture);
    }
    if (removeCanvasReferences) {
      const idx = canvases.indexOf(this.canvas);
      if (idx >= 0) {
        canvases[idx] = null;
        maxTexSizes[idx] = null;
      }
    }
    this.destroyExtensions();
    delete this.context;
    delete this.canvas;
    if (!this.gpu) return;
    const i = this.gpu.kernels.indexOf(this);
    if (i === -1) return;
    this.gpu.kernels.splice(i, 1);
  }

  destroyExtensions() {
    this.extensions.OES_texture_float = null;
    this.extensions.OES_texture_float_linear = null;
    this.extensions.OES_element_index_uint = null;
    this.extensions.WEBGL_draw_buffers = null;
  }

  static destroyContext(context) {
    const extension = context.getExtension('WEBGL_lose_context');
    if (extension) {
      extension.loseContext();
    }
  }

  /**
   * @return {IKernelJSON}
   */
  toJSON() {
    const json = super.toJSON();
    json.functionNodes = FunctionBuilder.fromKernel(this, WebGLFunctionNode).toJSON();
    json.settings.threadDim = this.threadDim;
    return json;
  }
}

module.exports = {
  WebGLKernel
};

/***/ }),

/***/ "./src/backend/web-gl/vertex-shader.js":
/*!*********************************************!*\
  !*** ./src/backend/web-gl/vertex-shader.js ***!
  \*********************************************/
/***/ ((module) => {

// language=GLSL
const vertexShader = `__FLOAT_TACTIC_DECLARATION__;
__INT_TACTIC_DECLARATION__;
__SAMPLER_2D_TACTIC_DECLARATION__;

attribute vec2 aPos;
attribute vec2 aTexCoord;

varying vec2 vTexCoord;
uniform vec2 ratio;

void main(void) {
  gl_Position = vec4((aPos + vec2(1)) * ratio + vec2(-1), 0, 1);
  vTexCoord = aTexCoord;
}`;

module.exports = {
  vertexShader
};

/***/ }),

/***/ "./src/backend/web-gl2/fragment-shader.js":
/*!************************************************!*\
  !*** ./src/backend/web-gl2/fragment-shader.js ***!
  \************************************************/
/***/ ((module) => {

// language=GLSL
const fragmentShader = `#version 300 es
__HEADER__;
__FLOAT_TACTIC_DECLARATION__;
__INT_TACTIC_DECLARATION__;
__SAMPLER_2D_TACTIC_DECLARATION__;
__SAMPLER_2D_ARRAY_TACTIC_DECLARATION__;

const int LOOP_MAX = __LOOP_MAX__;

__PLUGINS__;
__CONSTANTS__;

in vec2 vTexCoord;

float atan2(float v1, float v2) {
  if (v1 == 0.0 || v2 == 0.0) return 0.0;
  return atan(v1 / v2);
}

float cbrt(float x) {
  if (x >= 0.0) {
    return pow(x, 1.0 / 3.0);
  } else {
    return -pow(x, 1.0 / 3.0);
  }
}

float expm1(float x) {
  return pow(${Math.E}, x) - 1.0; 
}

float fround(highp float x) {
  return x;
}

float imul(float v1, float v2) {
  return float(int(v1) * int(v2));
}

float log10(float x) {
  return log2(x) * (1.0 / log2(10.0));
}

float log1p(float x) {
  return log(1.0 + x);
}

float _pow(float v1, float v2) {
  if (v2 == 0.0) return 1.0;
  return pow(v1, v2);
}

float _round(float x) {
  return floor(x + 0.5);
}


const int BIT_COUNT = 32;
int modi(int x, int y) {
  return x - y * (x / y);
}

int bitwiseOr(int a, int b) {
  int result = 0;
  int n = 1;
  
  for (int i = 0; i < BIT_COUNT; i++) {
    if ((modi(a, 2) == 1) || (modi(b, 2) == 1)) {
      result += n;
    }
    a = a / 2;
    b = b / 2;
    n = n * 2;
    if(!(a > 0 || b > 0)) {
      break;
    }
  }
  return result;
}
int bitwiseXOR(int a, int b) {
  int result = 0;
  int n = 1;
  
  for (int i = 0; i < BIT_COUNT; i++) {
    if ((modi(a, 2) == 1) != (modi(b, 2) == 1)) {
      result += n;
    }
    a = a / 2;
    b = b / 2;
    n = n * 2;
    if(!(a > 0 || b > 0)) {
      break;
    }
  }
  return result;
}
int bitwiseAnd(int a, int b) {
  int result = 0;
  int n = 1;
  for (int i = 0; i < BIT_COUNT; i++) {
    if ((modi(a, 2) == 1) && (modi(b, 2) == 1)) {
      result += n;
    }
    a = a / 2;
    b = b / 2;
    n = n * 2;
    if(!(a > 0 && b > 0)) {
      break;
    }
  }
  return result;
}
int bitwiseNot(int a) {
  int result = 0;
  int n = 1;
  
  for (int i = 0; i < BIT_COUNT; i++) {
    if (modi(a, 2) == 0) {
      result += n;    
    }
    a = a / 2;
    n = n * 2;
  }
  return result;
}
int bitwiseZeroFillLeftShift(int n, int shift) {
  int maxBytes = BIT_COUNT;
  for (int i = 0; i < BIT_COUNT; i++) {
    if (maxBytes >= n) {
      break;
    }
    maxBytes *= 2;
  }
  for (int i = 0; i < BIT_COUNT; i++) {
    if (i >= shift) {
      break;
    }
    n *= 2;
  }

  int result = 0;
  int byteVal = 1;
  for (int i = 0; i < BIT_COUNT; i++) {
    if (i >= maxBytes) break;
    if (modi(n, 2) > 0) { result += byteVal; }
    n = int(n / 2);
    byteVal *= 2;
  }
  return result;
}

int bitwiseSignedRightShift(int num, int shifts) {
  return int(floor(float(num) / pow(2.0, float(shifts))));
}

int bitwiseZeroFillRightShift(int n, int shift) {
  int maxBytes = BIT_COUNT;
  for (int i = 0; i < BIT_COUNT; i++) {
    if (maxBytes >= n) {
      break;
    }
    maxBytes *= 2;
  }
  for (int i = 0; i < BIT_COUNT; i++) {
    if (i >= shift) {
      break;
    }
    n /= 2;
  }
  int result = 0;
  int byteVal = 1;
  for (int i = 0; i < BIT_COUNT; i++) {
    if (i >= maxBytes) break;
    if (modi(n, 2) > 0) { result += byteVal; }
    n = int(n / 2);
    byteVal *= 2;
  }
  return result;
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
  return x - (y * int(x/y));
}

__DIVIDE_WITH_INTEGER_CHECK__;

// Here be dragons!
// DO NOT OPTIMIZE THIS CODE
// YOU WILL BREAK SOMETHING ON SOMEBODY\'S MACHINE
// LEAVE IT AS IT IS, LEST YOU WASTE YOUR OWN TIME
const vec2 MAGIC_VEC = vec2(1.0, -256.0);
const vec4 SCALE_FACTOR = vec4(1.0, 256.0, 65536.0, 0.0);
const vec4 SCALE_FACTOR_INV = vec4(1.0, 0.00390625, 0.0000152587890625, 0.0); // 1, 1/256, 1/65536
float decode32(vec4 texel) {
  __DECODE32_ENDIANNESS__;
  texel *= 255.0;
  vec2 gte128;
  gte128.x = texel.b >= 128.0 ? 1.0 : 0.0;
  gte128.y = texel.a >= 128.0 ? 1.0 : 0.0;
  float exponent = 2.0 * texel.a - 127.0 + dot(gte128, MAGIC_VEC);
  float res = exp2(round(exponent));
  texel.b = texel.b - 128.0 * gte128.x;
  res = dot(texel, SCALE_FACTOR) * exp2(round(exponent-23.0)) + res;
  res *= gte128.y * -2.0 + 1.0;
  return res;
}

float decode16(vec4 texel, int index) {
  int channel = integerMod(index, 2);
  return texel[channel*2] * 255.0 + texel[channel*2 + 1] * 65280.0;
}

float decode8(vec4 texel, int index) {
  int channel = integerMod(index, 4);
  return texel[channel] * 255.0;
}

vec4 legacyEncode32(float f) {
  float F = abs(f);
  float sign = f < 0.0 ? 1.0 : 0.0;
  float exponent = floor(log2(F));
  float mantissa = (exp2(-exponent) * F);
  // exponent += floor(log2(mantissa));
  vec4 texel = vec4(F * exp2(23.0-exponent)) * SCALE_FACTOR_INV;
  texel.rg = integerMod(texel.rg, 256.0);
  texel.b = integerMod(texel.b, 128.0);
  texel.a = exponent*0.5 + 63.5;
  texel.ba += vec2(integerMod(exponent+127.0, 2.0), sign) * 128.0;
  texel = floor(texel);
  texel *= 0.003921569; // 1/255
  __ENCODE32_ENDIANNESS__;
  return texel;
}

// https://github.com/gpujs/gpu.js/wiki/Encoder-details
vec4 encode32(float value) {
  if (value == 0.0) return vec4(0, 0, 0, 0);

  float exponent;
  float mantissa;
  vec4  result;
  float sgn;

  sgn = step(0.0, -value);
  value = abs(value);

  exponent = floor(log2(value));

  mantissa = value*pow(2.0, -exponent)-1.0;
  exponent = exponent+127.0;
  result   = vec4(0,0,0,0);

  result.a = floor(exponent/2.0);
  exponent = exponent - result.a*2.0;
  result.a = result.a + 128.0*sgn;

  result.b = floor(mantissa * 128.0);
  mantissa = mantissa - result.b / 128.0;
  result.b = result.b + exponent*128.0;

  result.g = floor(mantissa*32768.0);
  mantissa = mantissa - result.g/32768.0;

  result.r = floor(mantissa*8388608.0);
  return result/255.0;
}
// Dragons end here

int index;
ivec3 threadId;

ivec3 indexTo3D(int idx, ivec3 texDim) {
  int z = int(idx / (texDim.x * texDim.y));
  idx -= z * int(texDim.x * texDim.y);
  int y = int(idx / texDim.x);
  int x = int(integerMod(idx, texDim.x));
  return ivec3(x, y, z);
}

float get32(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + texDim.x * (y + texDim.y * z);
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture(tex, st / vec2(texSize));
  return decode32(texel);
}

float get16(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + (texDim.x * (y + (texDim.y * z)));
  int w = texSize.x * 2;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture(tex, st / vec2(texSize.x * 2, texSize.y));
  return decode16(texel, index);
}

float get8(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + (texDim.x * (y + (texDim.y * z)));
  int w = texSize.x * 4;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture(tex, st / vec2(texSize.x * 4, texSize.y));
  return decode8(texel, index);
}

float getMemoryOptimized32(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + (texDim.x * (y + (texDim.y * z)));
  int channel = integerMod(index, 4);
  index = index / 4;
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  index = index / 4;
  vec4 texel = texture(tex, st / vec2(texSize));
  return texel[channel];
}

vec4 getImage2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + texDim.x * (y + texDim.y * z);
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  return texture(tex, st / vec2(texSize));
}

vec4 getImage3D(sampler2DArray tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + texDim.x * (y + texDim.y * z);
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  return texture(tex, vec3(st / vec2(texSize), z));
}

float getFloatFromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  vec4 result = getImage2D(tex, texSize, texDim, z, y, x);
  return result[0];
}

vec2 getVec2FromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  vec4 result = getImage2D(tex, texSize, texDim, z, y, x);
  return vec2(result[0], result[1]);
}

vec2 getMemoryOptimizedVec2(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + texDim.x * (y + texDim.y * z);
  int channel = integerMod(index, 2);
  index = index / 2;
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture(tex, st / vec2(texSize));
  if (channel == 0) return vec2(texel.r, texel.g);
  if (channel == 1) return vec2(texel.b, texel.a);
  return vec2(0.0, 0.0);
}

vec3 getVec3FromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  vec4 result = getImage2D(tex, texSize, texDim, z, y, x);
  return vec3(result[0], result[1], result[2]);
}

vec3 getMemoryOptimizedVec3(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int fieldIndex = 3 * (x + texDim.x * (y + texDim.y * z));
  int vectorIndex = fieldIndex / 4;
  int vectorOffset = fieldIndex - vectorIndex * 4;
  int readY = vectorIndex / texSize.x;
  int readX = vectorIndex - readY * texSize.x;
  vec4 tex1 = texture(tex, (vec2(readX, readY) + 0.5) / vec2(texSize));

  if (vectorOffset == 0) {
    return tex1.xyz;
  } else if (vectorOffset == 1) {
    return tex1.yzw;
  } else {
    readX++;
    if (readX >= texSize.x) {
      readX = 0;
      readY++;
    }
    vec4 tex2 = texture(tex, vec2(readX, readY) / vec2(texSize));
    if (vectorOffset == 2) {
      return vec3(tex1.z, tex1.w, tex2.x);
    } else {
      return vec3(tex1.w, tex2.x, tex2.y);
    }
  }
}

vec4 getVec4FromSampler2D(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  return getImage2D(tex, texSize, texDim, z, y, x);
}

vec4 getMemoryOptimizedVec4(sampler2D tex, ivec2 texSize, ivec3 texDim, int z, int y, int x) {
  int index = x + texDim.x * (y + texDim.y * z);
  int channel = integerMod(index, 2);
  int w = texSize.x;
  vec2 st = vec2(float(integerMod(index, w)), float(index / w)) + 0.5;
  vec4 texel = texture(tex, st / vec2(texSize));
  return vec4(texel.r, texel.g, texel.b, texel.a);
}

vec4 actualColor;
void color(float r, float g, float b, float a) {
  actualColor = vec4(r,g,b,a);
}

void color(float r, float g, float b) {
  color(r,g,b,1.0);
}

float modulo(float number, float divisor) {
  if (number < 0.0) {
    number = abs(number);
    if (divisor < 0.0) {
      divisor = abs(divisor);
    }
    return -mod(number, divisor);
  }
  if (divisor < 0.0) {
    divisor = abs(divisor);
  }
  return mod(number, divisor);
}

__INJECTED_NATIVE__;
__MAIN_CONSTANTS__;
__MAIN_ARGUMENTS__;
__KERNEL__;

void main(void) {
  index = int(vTexCoord.s * float(uTexSize.x)) + int(vTexCoord.t * float(uTexSize.y)) * uTexSize.x;
  __MAIN_RESULT__;
}`;

module.exports = {
  fragmentShader
};

/***/ }),

/***/ "./src/backend/web-gl2/function-node.js":
/*!**********************************************!*\
  !*** ./src/backend/web-gl2/function-node.js ***!
  \**********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../utils */ "./src/utils.js");
const { WebGLFunctionNode } = __webpack_require__(/*! ../web-gl/function-node */ "./src/backend/web-gl/function-node.js");

/**
 * @class WebGL2FunctionNode
 * @desc [INTERNAL] Takes in a function node, and does all the AST voodoo required to toString its respective webGL code.
 * @extends WebGLFunctionNode
 * @returns the converted webGL function string
 */
class WebGL2FunctionNode extends WebGLFunctionNode {

  /**
   * @desc Parses the abstract syntax tree for *identifier* expression
   * @param {Object} idtNode - An ast Node
   * @param {Array} retArr - return array string
   * @returns {Array} the append retArr
   */
  astIdentifierExpression(idtNode, retArr) {
    if (idtNode.type !== 'Identifier') {
      throw this.astErrorOutput(
        'IdentifierExpression - not an Identifier',
        idtNode
      );
    }

    const type = this.getType(idtNode);

    const name = utils.sanitizeName(idtNode.name);
    if (idtNode.name === 'Infinity') {
      retArr.push('intBitsToFloat(2139095039)');
    } else if (type === 'Boolean') {
      if (this.argumentNames.indexOf(name) > -1) {
        retArr.push(`bool(user_${name})`);
      } else {
        retArr.push(`user_${name}`);
      }
    } else {
      retArr.push(`user_${name}`);
    }

    return retArr;
  }
}

module.exports = {
  WebGL2FunctionNode
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value-maps.js":
/*!**************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value-maps.js ***!
  \**************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { WebGL2KernelValueBoolean } = __webpack_require__(/*! ./kernel-value/boolean */ "./src/backend/web-gl2/kernel-value/boolean.js");
const { WebGL2KernelValueFloat } = __webpack_require__(/*! ./kernel-value/float */ "./src/backend/web-gl2/kernel-value/float.js");
const { WebGL2KernelValueInteger } = __webpack_require__(/*! ./kernel-value/integer */ "./src/backend/web-gl2/kernel-value/integer.js");

const { WebGL2KernelValueHTMLImage } = __webpack_require__(/*! ./kernel-value/html-image */ "./src/backend/web-gl2/kernel-value/html-image.js");
const { WebGL2KernelValueDynamicHTMLImage } = __webpack_require__(/*! ./kernel-value/dynamic-html-image */ "./src/backend/web-gl2/kernel-value/dynamic-html-image.js");

const { WebGL2KernelValueHTMLImageArray } = __webpack_require__(/*! ./kernel-value/html-image-array */ "./src/backend/web-gl2/kernel-value/html-image-array.js");
const { WebGL2KernelValueDynamicHTMLImageArray } = __webpack_require__(/*! ./kernel-value/dynamic-html-image-array */ "./src/backend/web-gl2/kernel-value/dynamic-html-image-array.js");

const { WebGL2KernelValueHTMLVideo } = __webpack_require__(/*! ./kernel-value/html-video */ "./src/backend/web-gl2/kernel-value/html-video.js");
const { WebGL2KernelValueDynamicHTMLVideo } = __webpack_require__(/*! ./kernel-value/dynamic-html-video */ "./src/backend/web-gl2/kernel-value/dynamic-html-video.js");

const { WebGL2KernelValueSingleInput } = __webpack_require__(/*! ./kernel-value/single-input */ "./src/backend/web-gl2/kernel-value/single-input.js");
const { WebGL2KernelValueDynamicSingleInput } = __webpack_require__(/*! ./kernel-value/dynamic-single-input */ "./src/backend/web-gl2/kernel-value/dynamic-single-input.js");

const { WebGL2KernelValueUnsignedInput } = __webpack_require__(/*! ./kernel-value/unsigned-input */ "./src/backend/web-gl2/kernel-value/unsigned-input.js");
const { WebGL2KernelValueDynamicUnsignedInput } = __webpack_require__(/*! ./kernel-value/dynamic-unsigned-input */ "./src/backend/web-gl2/kernel-value/dynamic-unsigned-input.js");

const { WebGL2KernelValueMemoryOptimizedNumberTexture } = __webpack_require__(/*! ./kernel-value/memory-optimized-number-texture */ "./src/backend/web-gl2/kernel-value/memory-optimized-number-texture.js");
const { WebGL2KernelValueDynamicMemoryOptimizedNumberTexture } = __webpack_require__(/*! ./kernel-value/dynamic-memory-optimized-number-texture */ "./src/backend/web-gl2/kernel-value/dynamic-memory-optimized-number-texture.js");

const { WebGL2KernelValueNumberTexture } = __webpack_require__(/*! ./kernel-value/number-texture */ "./src/backend/web-gl2/kernel-value/number-texture.js");
const { WebGL2KernelValueDynamicNumberTexture } = __webpack_require__(/*! ./kernel-value/dynamic-number-texture */ "./src/backend/web-gl2/kernel-value/dynamic-number-texture.js");

const { WebGL2KernelValueSingleArray } = __webpack_require__(/*! ./kernel-value/single-array */ "./src/backend/web-gl2/kernel-value/single-array.js");
const { WebGL2KernelValueDynamicSingleArray } = __webpack_require__(/*! ./kernel-value/dynamic-single-array */ "./src/backend/web-gl2/kernel-value/dynamic-single-array.js");

const { WebGL2KernelValueSingleArray1DI } = __webpack_require__(/*! ./kernel-value/single-array1d-i */ "./src/backend/web-gl2/kernel-value/single-array1d-i.js");
const { WebGL2KernelValueDynamicSingleArray1DI } = __webpack_require__(/*! ./kernel-value/dynamic-single-array1d-i */ "./src/backend/web-gl2/kernel-value/dynamic-single-array1d-i.js");

const { WebGL2KernelValueSingleArray2DI } = __webpack_require__(/*! ./kernel-value/single-array2d-i */ "./src/backend/web-gl2/kernel-value/single-array2d-i.js");
const { WebGL2KernelValueDynamicSingleArray2DI } = __webpack_require__(/*! ./kernel-value/dynamic-single-array2d-i */ "./src/backend/web-gl2/kernel-value/dynamic-single-array2d-i.js");

const { WebGL2KernelValueSingleArray3DI } = __webpack_require__(/*! ./kernel-value/single-array3d-i */ "./src/backend/web-gl2/kernel-value/single-array3d-i.js");
const { WebGL2KernelValueDynamicSingleArray3DI } = __webpack_require__(/*! ./kernel-value/dynamic-single-array3d-i */ "./src/backend/web-gl2/kernel-value/dynamic-single-array3d-i.js");

const { WebGL2KernelValueArray2 } = __webpack_require__(/*! ./kernel-value/array2 */ "./src/backend/web-gl2/kernel-value/array2.js");
const { WebGL2KernelValueArray3 } = __webpack_require__(/*! ./kernel-value/array3 */ "./src/backend/web-gl2/kernel-value/array3.js");
const { WebGL2KernelValueArray4 } = __webpack_require__(/*! ./kernel-value/array4 */ "./src/backend/web-gl2/kernel-value/array4.js");

const { WebGL2KernelValueUnsignedArray } = __webpack_require__(/*! ./kernel-value/unsigned-array */ "./src/backend/web-gl2/kernel-value/unsigned-array.js");
const { WebGL2KernelValueDynamicUnsignedArray } = __webpack_require__(/*! ./kernel-value/dynamic-unsigned-array */ "./src/backend/web-gl2/kernel-value/dynamic-unsigned-array.js");

const kernelValueMaps = {
  unsigned: {
    dynamic: {
      'Boolean': WebGL2KernelValueBoolean,
      'Integer': WebGL2KernelValueInteger,
      'Float': WebGL2KernelValueFloat,
      'Array': WebGL2KernelValueDynamicUnsignedArray,
      'Array(2)': WebGL2KernelValueArray2,
      'Array(3)': WebGL2KernelValueArray3,
      'Array(4)': WebGL2KernelValueArray4,
      'Array1D(2)': false,
      'Array1D(3)': false,
      'Array1D(4)': false,
      'Array2D(2)': false,
      'Array2D(3)': false,
      'Array2D(4)': false,
      'Array3D(2)': false,
      'Array3D(3)': false,
      'Array3D(4)': false,
      'Input': WebGL2KernelValueDynamicUnsignedInput,
      'NumberTexture': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(1)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(2)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(3)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(4)': WebGL2KernelValueDynamicNumberTexture,
      'MemoryOptimizedNumberTexture': WebGL2KernelValueDynamicMemoryOptimizedNumberTexture,
      'HTMLCanvas': WebGL2KernelValueDynamicHTMLImage,
      'OffscreenCanvas': WebGL2KernelValueDynamicHTMLImage,
      'HTMLImage': WebGL2KernelValueDynamicHTMLImage,
      'ImageBitmap': WebGL2KernelValueDynamicHTMLImage,
      'ImageData': WebGL2KernelValueDynamicHTMLImage,
      'HTMLImageArray': WebGL2KernelValueDynamicHTMLImageArray,
      'HTMLVideo': WebGL2KernelValueDynamicHTMLVideo,
    },
    static: {
      'Boolean': WebGL2KernelValueBoolean,
      'Float': WebGL2KernelValueFloat,
      'Integer': WebGL2KernelValueInteger,
      'Array': WebGL2KernelValueUnsignedArray,
      'Array(2)': WebGL2KernelValueArray2,
      'Array(3)': WebGL2KernelValueArray3,
      'Array(4)': WebGL2KernelValueArray4,
      'Array1D(2)': false,
      'Array1D(3)': false,
      'Array1D(4)': false,
      'Array2D(2)': false,
      'Array2D(3)': false,
      'Array2D(4)': false,
      'Array3D(2)': false,
      'Array3D(3)': false,
      'Array3D(4)': false,
      'Input': WebGL2KernelValueUnsignedInput,
      'NumberTexture': WebGL2KernelValueNumberTexture,
      'ArrayTexture(1)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(2)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(3)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(4)': WebGL2KernelValueNumberTexture,
      'MemoryOptimizedNumberTexture': WebGL2KernelValueDynamicMemoryOptimizedNumberTexture,
      'HTMLCanvas': WebGL2KernelValueHTMLImage,
      'OffscreenCanvas': WebGL2KernelValueHTMLImage,
      'HTMLImage': WebGL2KernelValueHTMLImage,
      'ImageBitmap': WebGL2KernelValueHTMLImage,
      'ImageData': WebGL2KernelValueHTMLImage,
      'HTMLImageArray': WebGL2KernelValueHTMLImageArray,
      'HTMLVideo': WebGL2KernelValueHTMLVideo,
    }
  },
  single: {
    dynamic: {
      'Boolean': WebGL2KernelValueBoolean,
      'Integer': WebGL2KernelValueInteger,
      'Float': WebGL2KernelValueFloat,
      'Array': WebGL2KernelValueDynamicSingleArray,
      'Array(2)': WebGL2KernelValueArray2,
      'Array(3)': WebGL2KernelValueArray3,
      'Array(4)': WebGL2KernelValueArray4,
      'Array1D(2)': WebGL2KernelValueDynamicSingleArray1DI,
      'Array1D(3)': WebGL2KernelValueDynamicSingleArray1DI,
      'Array1D(4)': WebGL2KernelValueDynamicSingleArray1DI,
      'Array2D(2)': WebGL2KernelValueDynamicSingleArray2DI,
      'Array2D(3)': WebGL2KernelValueDynamicSingleArray2DI,
      'Array2D(4)': WebGL2KernelValueDynamicSingleArray2DI,
      'Array3D(2)': WebGL2KernelValueDynamicSingleArray3DI,
      'Array3D(3)': WebGL2KernelValueDynamicSingleArray3DI,
      'Array3D(4)': WebGL2KernelValueDynamicSingleArray3DI,
      'Input': WebGL2KernelValueDynamicSingleInput,
      'NumberTexture': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(1)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(2)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(3)': WebGL2KernelValueDynamicNumberTexture,
      'ArrayTexture(4)': WebGL2KernelValueDynamicNumberTexture,
      'MemoryOptimizedNumberTexture': WebGL2KernelValueDynamicMemoryOptimizedNumberTexture,
      'HTMLCanvas': WebGL2KernelValueDynamicHTMLImage,
      'OffscreenCanvas': WebGL2KernelValueDynamicHTMLImage,
      'HTMLImage': WebGL2KernelValueDynamicHTMLImage,
      'ImageBitmap': WebGL2KernelValueDynamicHTMLImage,
      'ImageData': WebGL2KernelValueDynamicHTMLImage,
      'HTMLImageArray': WebGL2KernelValueDynamicHTMLImageArray,
      'HTMLVideo': WebGL2KernelValueDynamicHTMLVideo,
    },
    static: {
      'Boolean': WebGL2KernelValueBoolean,
      'Float': WebGL2KernelValueFloat,
      'Integer': WebGL2KernelValueInteger,
      'Array': WebGL2KernelValueSingleArray,
      'Array(2)': WebGL2KernelValueArray2,
      'Array(3)': WebGL2KernelValueArray3,
      'Array(4)': WebGL2KernelValueArray4,
      'Array1D(2)': WebGL2KernelValueSingleArray1DI,
      'Array1D(3)': WebGL2KernelValueSingleArray1DI,
      'Array1D(4)': WebGL2KernelValueSingleArray1DI,
      'Array2D(2)': WebGL2KernelValueSingleArray2DI,
      'Array2D(3)': WebGL2KernelValueSingleArray2DI,
      'Array2D(4)': WebGL2KernelValueSingleArray2DI,
      'Array3D(2)': WebGL2KernelValueSingleArray3DI,
      'Array3D(3)': WebGL2KernelValueSingleArray3DI,
      'Array3D(4)': WebGL2KernelValueSingleArray3DI,
      'Input': WebGL2KernelValueSingleInput,
      'NumberTexture': WebGL2KernelValueNumberTexture,
      'ArrayTexture(1)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(2)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(3)': WebGL2KernelValueNumberTexture,
      'ArrayTexture(4)': WebGL2KernelValueNumberTexture,
      'MemoryOptimizedNumberTexture': WebGL2KernelValueMemoryOptimizedNumberTexture,
      'HTMLCanvas': WebGL2KernelValueHTMLImage,
      'OffscreenCanvas': WebGL2KernelValueHTMLImage,
      'HTMLImage': WebGL2KernelValueHTMLImage,
      'ImageBitmap': WebGL2KernelValueHTMLImage,
      'ImageData': WebGL2KernelValueHTMLImage,
      'HTMLImageArray': WebGL2KernelValueHTMLImageArray,
      'HTMLVideo': WebGL2KernelValueHTMLVideo,
    }
  },
};

function lookupKernelValueType(type, dynamic, precision, value) {
  if (!type) {
    throw new Error('type missing');
  }
  if (!dynamic) {
    throw new Error('dynamic missing');
  }
  if (!precision) {
    throw new Error('precision missing');
  }
  if (value.type) {
    type = value.type;
  }
  const types = kernelValueMaps[precision][dynamic];
  if (types[type] === false) {
    return null;
  } else if (types[type] === undefined) {
    throw new Error(`Could not find a KernelValue for ${ type }`);
  }
  return types[type];
}

module.exports = {
  kernelValueMaps,
  lookupKernelValueType
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/array2.js":
/*!****************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/array2.js ***!
  \****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { WebGLKernelValueArray2 } = __webpack_require__(/*! ../../web-gl/kernel-value/array2 */ "./src/backend/web-gl/kernel-value/array2.js");

class WebGL2KernelValueArray2 extends WebGLKernelValueArray2 {}

module.exports = {
  WebGL2KernelValueArray2
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/array3.js":
/*!****************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/array3.js ***!
  \****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { WebGLKernelValueArray3 } = __webpack_require__(/*! ../../web-gl/kernel-value/array3 */ "./src/backend/web-gl/kernel-value/array3.js");

class WebGL2KernelValueArray3 extends WebGLKernelValueArray3 {}

module.exports = {
  WebGL2KernelValueArray3
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/array4.js":
/*!****************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/array4.js ***!
  \****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { WebGLKernelValueArray4 } = __webpack_require__(/*! ../../web-gl/kernel-value/array4 */ "./src/backend/web-gl/kernel-value/array4.js");

class WebGL2KernelValueArray4 extends WebGLKernelValueArray4 {}

module.exports = {
  WebGL2KernelValueArray4
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/boolean.js":
/*!*****************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/boolean.js ***!
  \*****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { WebGLKernelValueBoolean } = __webpack_require__(/*! ../../web-gl/kernel-value/boolean */ "./src/backend/web-gl/kernel-value/boolean.js");

class WebGL2KernelValueBoolean extends WebGLKernelValueBoolean {}

module.exports = {
  WebGL2KernelValueBoolean
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/dynamic-html-image-array.js":
/*!**********************************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/dynamic-html-image-array.js ***!
  \**********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGL2KernelValueHTMLImageArray } = __webpack_require__(/*! ./html-image-array */ "./src/backend/web-gl2/kernel-value/html-image-array.js");

class WebGL2KernelValueDynamicHTMLImageArray extends WebGL2KernelValueHTMLImageArray {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2DArray ${this.id}`,
      `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
      `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(images) {
    const { width, height } = images[0];
    this.checkSize(width, height);
    this.dimensions = [width, height, images.length];
    this.textureSize = [width, height];
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(images);
  }
}

module.exports = {
  WebGL2KernelValueDynamicHTMLImageArray
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/dynamic-html-image.js":
/*!****************************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/dynamic-html-image.js ***!
  \****************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueDynamicHTMLImage } = __webpack_require__(/*! ../../web-gl/kernel-value/dynamic-html-image */ "./src/backend/web-gl/kernel-value/dynamic-html-image.js");

class WebGL2KernelValueDynamicHTMLImage extends WebGLKernelValueDynamicHTMLImage {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2D ${this.id}`,
      `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
      `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
    ]);
  }
}

module.exports = {
  WebGL2KernelValueDynamicHTMLImage
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/dynamic-html-video.js":
/*!****************************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/dynamic-html-video.js ***!
  \****************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGL2KernelValueDynamicHTMLImage } = __webpack_require__(/*! ./dynamic-html-image */ "./src/backend/web-gl2/kernel-value/dynamic-html-image.js");

class WebGL2KernelValueDynamicHTMLVideo extends WebGL2KernelValueDynamicHTMLImage {}

module.exports = {
  WebGL2KernelValueDynamicHTMLVideo
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/dynamic-memory-optimized-number-texture.js":
/*!*************************************************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/dynamic-memory-optimized-number-texture.js ***!
  \*************************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueDynamicMemoryOptimizedNumberTexture } = __webpack_require__(/*! ../../web-gl/kernel-value/dynamic-memory-optimized-number-texture */ "./src/backend/web-gl/kernel-value/dynamic-memory-optimized-number-texture.js");

class WebGL2KernelValueDynamicMemoryOptimizedNumberTexture extends WebGLKernelValueDynamicMemoryOptimizedNumberTexture {
  getSource() {
    return utils.linesToString([
      `uniform sampler2D ${this.id}`,
      `uniform ivec2 ${this.sizeId}`,
      `uniform ivec3 ${this.dimensionsId}`,
    ]);
  }
}

module.exports = {
  WebGL2KernelValueDynamicMemoryOptimizedNumberTexture
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/dynamic-number-texture.js":
/*!********************************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/dynamic-number-texture.js ***!
  \********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueDynamicNumberTexture } = __webpack_require__(/*! ../../web-gl/kernel-value/dynamic-number-texture */ "./src/backend/web-gl/kernel-value/dynamic-number-texture.js");

class WebGL2KernelValueDynamicNumberTexture extends WebGLKernelValueDynamicNumberTexture {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2D ${this.id}`,
      `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
      `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
    ]);
  }
}

module.exports = {
  WebGL2KernelValueDynamicNumberTexture
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/dynamic-single-array.js":
/*!******************************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/dynamic-single-array.js ***!
  \******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGL2KernelValueSingleArray } = __webpack_require__(/*! ../../web-gl2/kernel-value/single-array */ "./src/backend/web-gl2/kernel-value/single-array.js");

class WebGL2KernelValueDynamicSingleArray extends WebGL2KernelValueSingleArray {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2D ${this.id}`,
      `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
      `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(value) {
    this.dimensions = utils.getDimensions(value, true);
    this.textureSize = utils.getMemoryOptimizedFloatTextureSize(this.dimensions, this.bitRatio);
    this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
    this.checkSize(this.textureSize[0], this.textureSize[1]);
    this.uploadValue = new Float32Array(this.uploadArrayLength);
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(value);
  }
}

module.exports = {
  WebGL2KernelValueDynamicSingleArray
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/dynamic-single-array1d-i.js":
/*!**********************************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/dynamic-single-array1d-i.js ***!
  \**********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGL2KernelValueSingleArray1DI } = __webpack_require__(/*! ../../web-gl2/kernel-value/single-array1d-i */ "./src/backend/web-gl2/kernel-value/single-array1d-i.js");

class WebGL2KernelValueDynamicSingleArray1DI extends WebGL2KernelValueSingleArray1DI {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2D ${this.id}`,
      `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
      `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(value) {
    this.setShape(value);
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(value);
  }
}

module.exports = {
  WebGL2KernelValueDynamicSingleArray1DI
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/dynamic-single-array2d-i.js":
/*!**********************************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/dynamic-single-array2d-i.js ***!
  \**********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGL2KernelValueSingleArray2DI } = __webpack_require__(/*! ../../web-gl2/kernel-value/single-array2d-i */ "./src/backend/web-gl2/kernel-value/single-array2d-i.js");

class WebGL2KernelValueDynamicSingleArray2DI extends WebGL2KernelValueSingleArray2DI {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2D ${this.id}`,
      `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
      `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(value) {
    this.setShape(value);
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(value);
  }
}

module.exports = {
  WebGL2KernelValueDynamicSingleArray2DI
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/dynamic-single-array3d-i.js":
/*!**********************************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/dynamic-single-array3d-i.js ***!
  \**********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGL2KernelValueSingleArray3DI } = __webpack_require__(/*! ../../web-gl2/kernel-value/single-array3d-i */ "./src/backend/web-gl2/kernel-value/single-array3d-i.js");

class WebGL2KernelValueDynamicSingleArray3DI extends WebGL2KernelValueSingleArray3DI {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2D ${this.id}`,
      `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
      `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(value) {
    this.setShape(value);
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(value);
  }
}

module.exports = {
  WebGL2KernelValueDynamicSingleArray3DI
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/dynamic-single-input.js":
/*!******************************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/dynamic-single-input.js ***!
  \******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGL2KernelValueSingleInput } = __webpack_require__(/*! ../../web-gl2/kernel-value/single-input */ "./src/backend/web-gl2/kernel-value/single-input.js");

class WebGL2KernelValueDynamicSingleInput extends WebGL2KernelValueSingleInput {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2D ${this.id}`,
      `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
      `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
    ]);
  }

  updateValue(value) {
    let [w, h, d] = value.size;
    this.dimensions = new Int32Array([w || 1, h || 1, d || 1]);
    this.textureSize = utils.getMemoryOptimizedFloatTextureSize(this.dimensions, this.bitRatio);
    this.uploadArrayLength = this.textureSize[0] * this.textureSize[1] * this.bitRatio;
    this.checkSize(this.textureSize[0], this.textureSize[1]);
    this.uploadValue = new Float32Array(this.uploadArrayLength);
    this.kernel.setUniform3iv(this.dimensionsId, this.dimensions);
    this.kernel.setUniform2iv(this.sizeId, this.textureSize);
    super.updateValue(value);
  }
}

module.exports = {
  WebGL2KernelValueDynamicSingleInput
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/dynamic-unsigned-array.js":
/*!********************************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/dynamic-unsigned-array.js ***!
  \********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueDynamicUnsignedArray } = __webpack_require__(/*! ../../web-gl/kernel-value/dynamic-unsigned-array */ "./src/backend/web-gl/kernel-value/dynamic-unsigned-array.js");

class WebGL2KernelValueDynamicUnsignedArray extends WebGLKernelValueDynamicUnsignedArray {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2D ${this.id}`,
      `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
      `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
    ]);
  }
}

module.exports = {
  WebGL2KernelValueDynamicUnsignedArray
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/dynamic-unsigned-input.js":
/*!********************************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/dynamic-unsigned-input.js ***!
  \********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueDynamicUnsignedInput } = __webpack_require__(/*! ../../web-gl/kernel-value/dynamic-unsigned-input */ "./src/backend/web-gl/kernel-value/dynamic-unsigned-input.js");

class WebGL2KernelValueDynamicUnsignedInput extends WebGLKernelValueDynamicUnsignedInput {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2D ${this.id}`,
      `uniform ${ variablePrecision } ivec2 ${this.sizeId}`,
      `uniform ${ variablePrecision } ivec3 ${this.dimensionsId}`,
    ]);
  }
}

module.exports = {
  WebGL2KernelValueDynamicUnsignedInput
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/float.js":
/*!***************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/float.js ***!
  \***************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueFloat } = __webpack_require__(/*! ../../web-gl/kernel-value/float */ "./src/backend/web-gl/kernel-value/float.js");

class WebGL2KernelValueFloat extends WebGLKernelValueFloat {}

module.exports = {
  WebGL2KernelValueFloat
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/html-image-array.js":
/*!**************************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/html-image-array.js ***!
  \**************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelArray } = __webpack_require__(/*! ../../web-gl/kernel-value/array */ "./src/backend/web-gl/kernel-value/array.js");

class WebGL2KernelValueHTMLImageArray extends WebGLKernelArray {
  constructor(value, settings) {
    super(value, settings);
    this.checkSize(value[0].width, value[0].height);
    this.dimensions = [value[0].width, value[0].height, value.length];
    this.textureSize = [value[0].width, value[0].height];
  }
  defineTexture() {
    const { context: gl } = this;
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.texture);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  }

  getStringValueHandler() {
    return `const uploadValue_${this.name} = ${this.varName};\n`;
  }
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2DArray ${this.id}`,
      `${ variablePrecision } ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `${ variablePrecision } ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }

  updateValue(images) {
    const { context: gl } = this;
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    // Upload the images into the texture.
    gl.texImage3D(
      gl.TEXTURE_2D_ARRAY,
      0,
      gl.RGBA,
      images[0].width,
      images[0].height,
      images.length,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    for (let i = 0; i < images.length; i++) {
      const xOffset = 0;
      const yOffset = 0;
      const imageDepth = 1;
      gl.texSubImage3D(
        gl.TEXTURE_2D_ARRAY,
        0,
        xOffset,
        yOffset,
        i,
        images[i].width,
        images[i].height,
        imageDepth,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        this.uploadValue = images[i]
      );
    }
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGL2KernelValueHTMLImageArray
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/html-image.js":
/*!********************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/html-image.js ***!
  \********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueHTMLImage } = __webpack_require__(/*! ../../web-gl/kernel-value/html-image */ "./src/backend/web-gl/kernel-value/html-image.js");

class WebGL2KernelValueHTMLImage extends WebGLKernelValueHTMLImage {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2D ${this.id}`,
      `${ variablePrecision } ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `${ variablePrecision } ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }
}

module.exports = {
  WebGL2KernelValueHTMLImage
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/html-video.js":
/*!********************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/html-video.js ***!
  \********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGL2KernelValueHTMLImage } = __webpack_require__(/*! ./html-image */ "./src/backend/web-gl2/kernel-value/html-image.js");

class WebGL2KernelValueHTMLVideo extends WebGL2KernelValueHTMLImage {}

module.exports = {
  WebGL2KernelValueHTMLVideo
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/integer.js":
/*!*****************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/integer.js ***!
  \*****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { WebGLKernelValueInteger } = __webpack_require__(/*! ../../web-gl/kernel-value/integer */ "./src/backend/web-gl/kernel-value/integer.js");

class WebGL2KernelValueInteger extends WebGLKernelValueInteger {
  getSource(value) {
    const variablePrecision = this.getVariablePrecisionString();
    if (this.origin === 'constants') {
      return `const ${ variablePrecision } int ${this.id} = ${ parseInt(value) };\n`;
    }
    return `uniform ${ variablePrecision } int ${this.id};\n`;
  }

  updateValue(value) {
    if (this.origin === 'constants') return;
    this.kernel.setUniform1i(this.id, this.uploadValue = value);
  }
}

module.exports = {
  WebGL2KernelValueInteger
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/memory-optimized-number-texture.js":
/*!*****************************************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/memory-optimized-number-texture.js ***!
  \*****************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueMemoryOptimizedNumberTexture } = __webpack_require__(/*! ../../web-gl/kernel-value/memory-optimized-number-texture */ "./src/backend/web-gl/kernel-value/memory-optimized-number-texture.js");

class WebGL2KernelValueMemoryOptimizedNumberTexture extends WebGLKernelValueMemoryOptimizedNumberTexture {
  getSource() {
    const { id, sizeId, textureSize, dimensionsId, dimensions } = this;
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform sampler2D ${id}`,
      `${ variablePrecision } ivec2 ${sizeId} = ivec2(${textureSize[0]}, ${textureSize[1]})`,
      `${ variablePrecision } ivec3 ${dimensionsId} = ivec3(${dimensions[0]}, ${dimensions[1]}, ${dimensions[2]})`,
    ]);
  }
}

module.exports = {
  WebGL2KernelValueMemoryOptimizedNumberTexture
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/number-texture.js":
/*!************************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/number-texture.js ***!
  \************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueNumberTexture } = __webpack_require__(/*! ../../web-gl/kernel-value/number-texture */ "./src/backend/web-gl/kernel-value/number-texture.js");

class WebGL2KernelValueNumberTexture extends WebGLKernelValueNumberTexture {
  getSource() {
    const { id, sizeId, textureSize, dimensionsId, dimensions } = this;
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2D ${id}`,
      `${ variablePrecision } ivec2 ${sizeId} = ivec2(${textureSize[0]}, ${textureSize[1]})`,
      `${ variablePrecision } ivec3 ${dimensionsId} = ivec3(${dimensions[0]}, ${dimensions[1]}, ${dimensions[2]})`,
    ]);
  }
}

module.exports = {
  WebGL2KernelValueNumberTexture
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/single-array.js":
/*!**********************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/single-array.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueSingleArray } = __webpack_require__(/*! ../../web-gl/kernel-value/single-array */ "./src/backend/web-gl/kernel-value/single-array.js");

class WebGL2KernelValueSingleArray extends WebGLKernelValueSingleArray {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2D ${this.id}`,
      `${ variablePrecision } ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `${ variablePrecision } ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }

  updateValue(value) {
    if (value.constructor !== this.initialValueConstructor) {
      this.onUpdateValueMismatch(value.constructor);
      return;
    }
    const { context: gl } = this;
    utils.flattenTo(value, this.uploadValue);
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGL2KernelValueSingleArray
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/single-array1d-i.js":
/*!**************************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/single-array1d-i.js ***!
  \**************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueSingleArray1DI } = __webpack_require__(/*! ../../web-gl/kernel-value/single-array1d-i */ "./src/backend/web-gl/kernel-value/single-array1d-i.js");

class WebGL2KernelValueSingleArray1DI extends WebGLKernelValueSingleArray1DI {
  updateValue(value) {
    if (value.constructor !== this.initialValueConstructor) {
      this.onUpdateValueMismatch(value.constructor);
      return;
    }
    const { context: gl } = this;
    utils.flattenTo(value, this.uploadValue);
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGL2KernelValueSingleArray1DI
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/single-array2d-i.js":
/*!**************************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/single-array2d-i.js ***!
  \**************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueSingleArray2DI } = __webpack_require__(/*! ../../web-gl/kernel-value/single-array2d-i */ "./src/backend/web-gl/kernel-value/single-array2d-i.js");

class WebGL2KernelValueSingleArray2DI extends WebGLKernelValueSingleArray2DI {
  updateValue(value) {
    if (value.constructor !== this.initialValueConstructor) {
      this.onUpdateValueMismatch(value.constructor);
      return;
    }
    const { context: gl } = this;
    utils.flattenTo(value, this.uploadValue);
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGL2KernelValueSingleArray2DI
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/single-array3d-i.js":
/*!**************************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/single-array3d-i.js ***!
  \**************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueSingleArray3DI } = __webpack_require__(/*! ../../web-gl/kernel-value/single-array3d-i */ "./src/backend/web-gl/kernel-value/single-array3d-i.js");

class WebGL2KernelValueSingleArray3DI extends WebGLKernelValueSingleArray3DI {
  updateValue(value) {
    if (value.constructor !== this.initialValueConstructor) {
      this.onUpdateValueMismatch(value.constructor);
      return;
    }
    const { context: gl } = this;
    utils.flattenTo(value, this.uploadValue);
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGL2KernelValueSingleArray3DI
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/single-input.js":
/*!**********************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/single-input.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueSingleInput } = __webpack_require__(/*! ../../web-gl/kernel-value/single-input */ "./src/backend/web-gl/kernel-value/single-input.js");

class WebGL2KernelValueSingleInput extends WebGLKernelValueSingleInput {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2D ${this.id}`,
      `${ variablePrecision } ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `${ variablePrecision } ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }

  updateValue(input) {
    const { context: gl } = this;
    utils.flattenTo(input.value, this.uploadValue);
    gl.activeTexture(this.contextHandle);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.textureSize[0], this.textureSize[1], 0, gl.RGBA, gl.FLOAT, this.uploadValue);
    this.kernel.setUniform1i(this.id, this.index);
  }
}

module.exports = {
  WebGL2KernelValueSingleInput
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/unsigned-array.js":
/*!************************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/unsigned-array.js ***!
  \************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueUnsignedArray } = __webpack_require__(/*! ../../web-gl/kernel-value/unsigned-array */ "./src/backend/web-gl/kernel-value/unsigned-array.js");

class WebGL2KernelValueUnsignedArray extends WebGLKernelValueUnsignedArray {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2D ${this.id}`,
      `${ variablePrecision } ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `${ variablePrecision } ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }
}

module.exports = {
  WebGL2KernelValueUnsignedArray
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel-value/unsigned-input.js":
/*!************************************************************!*\
  !*** ./src/backend/web-gl2/kernel-value/unsigned-input.js ***!
  \************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ../../../utils */ "./src/utils.js");
const { WebGLKernelValueUnsignedInput } = __webpack_require__(/*! ../../web-gl/kernel-value/unsigned-input */ "./src/backend/web-gl/kernel-value/unsigned-input.js");

class WebGL2KernelValueUnsignedInput extends WebGLKernelValueUnsignedInput {
  getSource() {
    const variablePrecision = this.getVariablePrecisionString();
    return utils.linesToString([
      `uniform ${ variablePrecision } sampler2D ${this.id}`,
      `${ variablePrecision } ivec2 ${this.sizeId} = ivec2(${this.textureSize[0]}, ${this.textureSize[1]})`,
      `${ variablePrecision } ivec3 ${this.dimensionsId} = ivec3(${this.dimensions[0]}, ${this.dimensions[1]}, ${this.dimensions[2]})`,
    ]);
  }
}

module.exports = {
  WebGL2KernelValueUnsignedInput
};

/***/ }),

/***/ "./src/backend/web-gl2/kernel.js":
/*!***************************************!*\
  !*** ./src/backend/web-gl2/kernel.js ***!
  \***************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { WebGLKernel } = __webpack_require__(/*! ../web-gl/kernel */ "./src/backend/web-gl/kernel.js");
const { WebGL2FunctionNode } = __webpack_require__(/*! ./function-node */ "./src/backend/web-gl2/function-node.js");
const { FunctionBuilder } = __webpack_require__(/*! ../function-builder */ "./src/backend/function-builder.js");
const { utils } = __webpack_require__(/*! ../../utils */ "./src/utils.js");
const { fragmentShader } = __webpack_require__(/*! ./fragment-shader */ "./src/backend/web-gl2/fragment-shader.js");
const { vertexShader } = __webpack_require__(/*! ./vertex-shader */ "./src/backend/web-gl2/vertex-shader.js");
const { lookupKernelValueType } = __webpack_require__(/*! ./kernel-value-maps */ "./src/backend/web-gl2/kernel-value-maps.js");

let isSupported = null;
/**
 *
 * @type {HTMLCanvasElement|OffscreenCanvas}
 */
let testCanvas = null;
/**
 *
 * @type {WebGLRenderingContext}
 */
let testContext = null;
let testExtensions = null;

/**
 *
 * @type {IKernelFeatures}
 */
let features = null;

/**
 * @extends WebGLKernel
 */
class WebGL2Kernel extends WebGLKernel {
  static get isSupported() {
    if (isSupported !== null) {
      return isSupported;
    }
    this.setupFeatureChecks();
    isSupported = this.isContextMatch(testContext);
    return isSupported;
  }

  static setupFeatureChecks() {
    if (typeof document !== 'undefined') {
      testCanvas = document.createElement('canvas');
    } else if (typeof OffscreenCanvas !== 'undefined') {
      testCanvas = new OffscreenCanvas(0, 0);
    }
    if (!testCanvas) return;
    testContext = testCanvas.getContext('webgl2');
    if (!testContext || !testContext.getExtension) return;
    testExtensions = {
      EXT_color_buffer_float: testContext.getExtension('EXT_color_buffer_float'),
      OES_texture_float_linear: testContext.getExtension('OES_texture_float_linear'),
    };
    features = this.getFeatures();
  }

  static isContextMatch(context) {
    // from global
    if (typeof WebGL2RenderingContext !== 'undefined') {
      return context instanceof WebGL2RenderingContext;
    }
    return false;
  }

  /**
   *
   * @return {IKernelFeatures}
   */
  static getFeatures() {
    const gl = this.testContext;
    return Object.freeze({
      isFloatRead: this.getIsFloatRead(),
      isIntegerDivisionAccurate: this.getIsIntegerDivisionAccurate(),
      isSpeedTacticSupported: this.getIsSpeedTacticSupported(),
      kernelMap: true,
      isTextureFloat: true,
      isDrawBuffers: true,
      channelCount: this.getChannelCount(),
      maxTextureSize: this.getMaxTextureSize(),
      lowIntPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.LOW_INT),
      lowFloatPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.LOW_FLOAT),
      mediumIntPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_INT),
      mediumFloatPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT),
      highIntPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_INT),
      highFloatPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT),
    });
  }

  static getIsTextureFloat() {
    return true;
  }

  static getChannelCount() {
    return testContext.getParameter(testContext.MAX_DRAW_BUFFERS);
  }

  static getMaxTextureSize() {
    return testContext.getParameter(testContext.MAX_TEXTURE_SIZE);
  }

  static lookupKernelValueType(type, dynamic, precision, value) {
    return lookupKernelValueType(type, dynamic, precision, value);
  }

  static get testCanvas() {
    return testCanvas;
  }

  static get testContext() {
    return testContext;
  }

  /**
   *
   * @returns {{isFloatRead: Boolean, isIntegerDivisionAccurate: Boolean, kernelMap: Boolean, isTextureFloat: Boolean}}
   */
  static get features() {
    return features;
  }

  static get fragmentShader() {
    return fragmentShader;
  }
  static get vertexShader() {
    return vertexShader;
  }

  /**
   *
   * @return {WebGLRenderingContext|WebGL2RenderingContext}
   */
  initContext() {
    const settings = {
      alpha: false,
      depth: false,
      antialias: false
    };
    return this.canvas.getContext('webgl2', settings);
  }

  initExtensions() {
    this.extensions = {
      EXT_color_buffer_float: this.context.getExtension('EXT_color_buffer_float'),
      OES_texture_float_linear: this.context.getExtension('OES_texture_float_linear'),
    };
  }

  /**
   * @desc Validate settings related to Kernel, such as dimensions size, and auto output support.
   * @param {IArguments} args
   */
  validateSettings(args) {
    if (!this.validate) {
      this.texSize = utils.getKernelTextureSize({
        optimizeFloatMemory: this.optimizeFloatMemory,
        precision: this.precision,
      }, this.output);
      return;
    }

    const { features } = this.constructor;
    if (this.precision === 'single' && !features.isFloatRead) {
      throw new Error('Float texture outputs are not supported');
    } else if (!this.graphical && this.precision === null) {
      this.precision = features.isFloatRead ? 'single' : 'unsigned';
    }

    if (this.fixIntegerDivisionAccuracy === null) {
      this.fixIntegerDivisionAccuracy = !features.isIntegerDivisionAccurate;
    } else if (this.fixIntegerDivisionAccuracy && features.isIntegerDivisionAccurate) {
      this.fixIntegerDivisionAccuracy = false;
    }

    this.checkOutput();

    if (!this.output || this.output.length === 0) {
      if (args.length !== 1) {
        throw new Error('Auto output only supported for kernels with only one input');
      }

      const argType = utils.getVariableType(args[0], this.strictIntegers);
      switch (argType) {
        case 'Array':
          this.output = utils.getDimensions(argType);
          break;
        case 'NumberTexture':
        case 'MemoryOptimizedNumberTexture':
        case 'ArrayTexture(1)':
        case 'ArrayTexture(2)':
        case 'ArrayTexture(3)':
        case 'ArrayTexture(4)':
          this.output = args[0].output;
          break;
        default:
          throw new Error('Auto output not supported for input type: ' + argType);
      }
    }

    if (this.graphical) {
      if (this.output.length !== 2) {
        throw new Error('Output must have 2 dimensions on graphical mode');
      }

      if (this.precision === 'single') {
        console.warn('Cannot use graphical mode and single precision at the same time');
        this.precision = 'unsigned';
      }

      this.texSize = utils.clone(this.output);
      return;
    } else if (!this.graphical && this.precision === null && features.isTextureFloat) {
      this.precision = 'single';
    }

    this.texSize = utils.getKernelTextureSize({
      optimizeFloatMemory: this.optimizeFloatMemory,
      precision: this.precision,
    }, this.output);

    this.checkTextureSize();
  }

  translateSource() {
    const functionBuilder = FunctionBuilder.fromKernel(this, WebGL2FunctionNode, {
      fixIntegerDivisionAccuracy: this.fixIntegerDivisionAccuracy
    });
    this.translatedSource = functionBuilder.getPrototypeString('kernel');
    this.setupReturnTypes(functionBuilder);
  }

  drawBuffers() {
    this.context.drawBuffers(this.drawBuffersMap);
  }

  getTextureFormat() {
    const { context: gl } = this;
    switch (this.getInternalFormat()) {
      case gl.R32F:
        return gl.RED;
      case gl.RG32F:
        return gl.RG;
      case gl.RGBA32F:
        return gl.RGBA;
      case gl.RGBA:
        return gl.RGBA;
      default:
        throw new Error('Unknown internal format');
    }
  }
  getInternalFormat() {
    const { context: gl } = this;

    if (this.precision === 'single') {
      if (this.pipeline) {
        switch (this.returnType) {
          case 'Number':
          case 'Float':
          case 'Integer':
            if (this.optimizeFloatMemory) {
              return gl.RGBA32F;
            } else {
              return gl.R32F;
            }
            case 'Array(2)':
              return gl.RG32F;
            case 'Array(3)': // there is _no_ 3 channel format which is guaranteed to be color-renderable
            case 'Array(4)':
              return gl.RGBA32F;
            default:
              throw new Error('Unhandled return type');
        }
      }
      return gl.RGBA32F;
    }
    return gl.RGBA;
  }

  _setupOutputTexture() {
    const gl = this.context;
    if (this.texture) {
      // here we inherit from an already existing kernel, so go ahead and just bind textures to the framebuffer
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture.texture, 0);
      return;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    const texture = gl.createTexture();
    const texSize = this.texSize;
    gl.activeTexture(gl.TEXTURE0 + this.constantTextureCount + this.argumentTextureCount);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    const format = this.getInternalFormat();
    if (this.precision === 'single') {
      gl.texStorage2D(gl.TEXTURE_2D, 1, format, texSize[0], texSize[1]);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, format, texSize[0], texSize[1], 0, format, gl.UNSIGNED_BYTE, null);
    }
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    this.texture = new this.TextureConstructor({
      texture,
      size: texSize,
      dimensions: this.threadDim,
      output: this.output,
      context: this.context,
      internalFormat: this.getInternalFormat(),
      textureFormat: this.getTextureFormat(),
      kernel: this,
    });
  }

  _setupSubOutputTextures() {
    const gl = this.context;
    if (this.mappedTextures) {
      // here we inherit from an already existing kernel, so go ahead and just bind textures to the framebuffer
      for (let i = 0; i < this.subKernels.length; i++) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i + 1, gl.TEXTURE_2D, this.mappedTextures[i].texture, 0);
      }
      return;
    }
    const texSize = this.texSize;
    this.drawBuffersMap = [gl.COLOR_ATTACHMENT0];
    this.mappedTextures = [];
    for (let i = 0; i < this.subKernels.length; i++) {
      const texture = this.createTexture();
      this.drawBuffersMap.push(gl.COLOR_ATTACHMENT0 + i + 1);
      gl.activeTexture(gl.TEXTURE0 + this.constantTextureCount + this.argumentTextureCount + i);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      // TODO: upgrade this
      const format = this.getInternalFormat();
      if (this.precision === 'single') {
        gl.texStorage2D(gl.TEXTURE_2D, 1, format, texSize[0], texSize[1]);
        // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, texSize[0], texSize[1], 0, gl.RGBA, gl.FLOAT, null);
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize[0], texSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i + 1, gl.TEXTURE_2D, texture, 0);

      this.mappedTextures.push(new this.TextureConstructor({
        texture,
        size: texSize,
        dimensions: this.threadDim,
        output: this.output,
        context: this.context,
        internalFormat: this.getInternalFormat(),
        textureFormat: this.getTextureFormat(),
        kernel: this,
      }));
    }
  }

  /**
   *
   * @desc Get the header string for the program.
   * This returns an empty string if no sub-kernels are defined.
   *
   * @returns {String} result
   */
  _getHeaderString() {
    return '';
  }

  /**
   * @desc Get texture coordinate string for the program
   * @returns {String} result
   */
  _getTextureCoordinate() {
    const subKernels = this.subKernels;
    const variablePrecision = this.getVariablePrecisionString(this.texSize, this.tactic);
    if (subKernels === null || subKernels.length < 1) {
      return `in ${ variablePrecision } vec2 vTexCoord;\n`;
    } else {
      return `out ${ variablePrecision } vec2 vTexCoord;\n`;
    }
  }

  /**
   * @desc Generate transpiled glsl Strings for user-defined parameters sent to a kernel
   * @param {Array} args - The actual parameters sent to the Kernel
   * @returns {String} result
   */
  _getMainArgumentsString(args) {
    const result = [];
    const argumentNames = this.argumentNames;
    for (let i = 0; i < argumentNames.length; i++) {
      result.push(this.kernelArguments[i].getSource(args[i]));
    }
    return result.join('');
  }

  /**
   * @desc Get Kernel program string (in *glsl*) for a kernel.
   * @returns {String} result
   */
  getKernelString() {
    const result = [this.getKernelResultDeclaration()];
    const subKernels = this.subKernels;
    if (subKernels !== null) {
      result.push(
        'layout(location = 0) out vec4 data0'
      );
      switch (this.returnType) {
        case 'Number':
        case 'Float':
        case 'Integer':
          for (let i = 0; i < subKernels.length; i++) {
            const subKernel = subKernels[i];
            result.push(
              subKernel.returnType === 'Integer' ?
              `int subKernelResult_${ subKernel.name } = 0` :
              `float subKernelResult_${ subKernel.name } = 0.0`,
              `layout(location = ${ i + 1 }) out vec4 data${ i + 1 }`
            );
          }
          break;
        case 'Array(2)':
          for (let i = 0; i < subKernels.length; i++) {
            result.push(
              `vec2 subKernelResult_${ subKernels[i].name }`,
              `layout(location = ${ i + 1 }) out vec4 data${ i + 1 }`
            );
          }
          break;
        case 'Array(3)':
          for (let i = 0; i < subKernels.length; i++) {
            result.push(
              `vec3 subKernelResult_${ subKernels[i].name }`,
              `layout(location = ${ i + 1 }) out vec4 data${ i + 1 }`
            );
          }
          break;
        case 'Array(4)':
          for (let i = 0; i < subKernels.length; i++) {
            result.push(
              `vec4 subKernelResult_${ subKernels[i].name }`,
              `layout(location = ${ i + 1 }) out vec4 data${ i + 1 }`
            );
          }
          break;
      }
    } else {
      result.push(
        'out vec4 data0'
      );
    }

    return utils.linesToString(result) + this.translatedSource;
  }

  getMainResultGraphical() {
    return utils.linesToString([
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      '  data0 = actualColor',
    ]);
  }

  getMainResultPackedPixels() {
    switch (this.returnType) {
      case 'LiteralInteger':
      case 'Number':
      case 'Integer':
      case 'Float':
        return this.getMainResultKernelPackedPixels() +
          this.getMainResultSubKernelPackedPixels();
      default:
        throw new Error(`packed output only usable with Numbers, "${this.returnType}" specified`);
    }
  }

  /**
   * @return {String}
   */
  getMainResultKernelPackedPixels() {
    return utils.linesToString([
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      `  data0 = ${this.useLegacyEncoder ? 'legacyEncode32' : 'encode32'}(kernelResult)`
    ]);
  }

  /**
   * @return {String}
   */
  getMainResultSubKernelPackedPixels() {
    const result = [];
    if (!this.subKernels) return '';
    for (let i = 0; i < this.subKernels.length; i++) {
      const subKernel = this.subKernels[i];
      if (subKernel.returnType === 'Integer') {
        result.push(
          `  data${i + 1} = ${this.useLegacyEncoder ? 'legacyEncode32' : 'encode32'}(float(subKernelResult_${this.subKernels[i].name}))`
        );
      } else {
        result.push(
          `  data${i + 1} = ${this.useLegacyEncoder ? 'legacyEncode32' : 'encode32'}(subKernelResult_${this.subKernels[i].name})`
        );
      }
    }
    return utils.linesToString(result);
  }

  getMainResultKernelMemoryOptimizedFloats(result, channel) {
    result.push(
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      `  data0.${channel} = kernelResult`
    );
  }

  getMainResultSubKernelMemoryOptimizedFloats(result, channel) {
    if (!this.subKernels) return result;
    for (let i = 0; i < this.subKernels.length; i++) {
      const subKernel = this.subKernels[i];
      if (subKernel.returnType === 'Integer') {
        result.push(
          `  data${i + 1}.${channel} = float(subKernelResult_${subKernel.name})`
        );
      } else {
        result.push(
          `  data${i + 1}.${channel} = subKernelResult_${subKernel.name}`
        );
      }
    }
  }

  getMainResultKernelNumberTexture() {
    return [
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      '  data0[0] = kernelResult',
    ];
  }

  getMainResultSubKernelNumberTexture() {
    const result = [];
    if (!this.subKernels) return result;
    for (let i = 0; i < this.subKernels.length; ++i) {
      const subKernel = this.subKernels[i];
      if (subKernel.returnType === 'Integer') {
        result.push(
          `  data${i + 1}[0] = float(subKernelResult_${subKernel.name})`
        );
      } else {
        result.push(
          `  data${i + 1}[0] = subKernelResult_${subKernel.name}`
        );
      }
    }
    return result;
  }

  getMainResultKernelArray2Texture() {
    return [
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      '  data0[0] = kernelResult[0]',
      '  data0[1] = kernelResult[1]',
    ];
  }

  getMainResultSubKernelArray2Texture() {
    const result = [];
    if (!this.subKernels) return result;
    for (let i = 0; i < this.subKernels.length; ++i) {
      const subKernel = this.subKernels[i];
      result.push(
        `  data${i + 1}[0] = subKernelResult_${subKernel.name}[0]`,
        `  data${i + 1}[1] = subKernelResult_${subKernel.name}[1]`
      );
    }
    return result;
  }

  getMainResultKernelArray3Texture() {
    return [
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      '  data0[0] = kernelResult[0]',
      '  data0[1] = kernelResult[1]',
      '  data0[2] = kernelResult[2]',
    ];
  }

  getMainResultSubKernelArray3Texture() {
    const result = [];
    if (!this.subKernels) return result;
    for (let i = 0; i < this.subKernels.length; ++i) {
      const subKernel = this.subKernels[i];
      result.push(
        `  data${i + 1}[0] = subKernelResult_${subKernel.name}[0]`,
        `  data${i + 1}[1] = subKernelResult_${subKernel.name}[1]`,
        `  data${i + 1}[2] = subKernelResult_${subKernel.name}[2]`
      );
    }
    return result;
  }

  getMainResultKernelArray4Texture() {
    return [
      '  threadId = indexTo3D(index, uOutputDim)',
      '  kernel()',
      '  data0 = kernelResult',
    ];
  }

  getMainResultSubKernelArray4Texture() {
    const result = [];
    if (!this.subKernels) return result;
    for (let i = 0; i < this.subKernels.length; ++i) {
      result.push(
        `  data${i + 1} = subKernelResult_${this.subKernels[i].name}`
      );
    }
    return result;
  }

  destroyExtensions() {
    this.extensions.EXT_color_buffer_float = null;
    this.extensions.OES_texture_float_linear = null;
  }

  /**
   * @return {IKernelJSON}
   */
  toJSON() {
    const json = super.toJSON();
    json.functionNodes = FunctionBuilder.fromKernel(this, WebGL2FunctionNode).toJSON();
    json.settings.threadDim = this.threadDim;
    return json;
  }
}

module.exports = {
  WebGL2Kernel
};

/***/ }),

/***/ "./src/backend/web-gl2/vertex-shader.js":
/*!**********************************************!*\
  !*** ./src/backend/web-gl2/vertex-shader.js ***!
  \**********************************************/
/***/ ((module) => {

// language=GLSL
const vertexShader = `#version 300 es
__FLOAT_TACTIC_DECLARATION__;
__INT_TACTIC_DECLARATION__;
__SAMPLER_2D_TACTIC_DECLARATION__;

in vec2 aPos;
in vec2 aTexCoord;

out vec2 vTexCoord;
uniform vec2 ratio;

void main(void) {
  gl_Position = vec4((aPos + vec2(1)) * ratio + vec2(-1), 0, 1);
  vTexCoord = aTexCoord;
}`;

module.exports = {
  vertexShader
};

/***/ }),

/***/ "./src/gpu.js":
/*!********************!*\
  !*** ./src/gpu.js ***!
  \********************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { gpuMock } = __webpack_require__(/*! gpu-mock.js */ "./node_modules/gpu-mock.js/index.js");
const { utils } = __webpack_require__(/*! ./utils */ "./src/utils.js");
const { Kernel } = __webpack_require__(/*! ./backend/kernel */ "./src/backend/kernel.js");
const { CPUKernel } = __webpack_require__(/*! ./backend/cpu/kernel */ "./src/backend/cpu/kernel.js");
const { HeadlessGLKernel } = __webpack_require__(/*! ./backend/headless-gl/kernel */ "./src/backend/headless-gl/kernel.js");
const { WebGL2Kernel } = __webpack_require__(/*! ./backend/web-gl2/kernel */ "./src/backend/web-gl2/kernel.js");
const { WebGLKernel } = __webpack_require__(/*! ./backend/web-gl/kernel */ "./src/backend/web-gl/kernel.js");
const { kernelRunShortcut } = __webpack_require__(/*! ./kernel-run-shortcut */ "./src/kernel-run-shortcut.js");


/**
 *
 * @type {Array.<Kernel>}
 */
const kernelOrder = [HeadlessGLKernel, WebGL2Kernel, WebGLKernel];

/**
 *
 * @type {string[]}
 */
const kernelTypes = ['gpu', 'cpu'];

const internalKernels = {
  'headlessgl': HeadlessGLKernel,
  'webgl2': WebGL2Kernel,
  'webgl': WebGLKernel,
};

let validate = true;

/**
 * The GPU.js library class which manages the GPU context for the creating kernels
 * @class
 * @return {GPU}
 */
class GPU {
  static disableValidation() {
    validate = false;
  }

  static enableValidation() {
    validate = true;
  }

  static get isGPUSupported() {
    return kernelOrder.some(Kernel => Kernel.isSupported);
  }

  /**
   *
   * @returns {boolean}
   */
  static get isKernelMapSupported() {
    return kernelOrder.some(Kernel => Kernel.isSupported && Kernel.features.kernelMap);
  }

  /**
   * @desc TRUE is platform supports OffscreenCanvas
   */
  static get isOffscreenCanvasSupported() {
    return (typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined') || typeof importScripts !== 'undefined';
  }

  /**
   * @desc TRUE if platform supports WebGL
   */
  static get isWebGLSupported() {
    return WebGLKernel.isSupported;
  }

  /**
   * @desc TRUE if platform supports WebGL2
   */
  static get isWebGL2Supported() {
    return WebGL2Kernel.isSupported;
  }

  /**
   * @desc TRUE if platform supports HeadlessGL
   */
  static get isHeadlessGLSupported() {
    return HeadlessGLKernel.isSupported;
  }

  /**
   *
   * @desc TRUE if platform supports Canvas
   */
  static get isCanvasSupported() {
    return typeof HTMLCanvasElement !== 'undefined';
  }

  /**
   * @desc TRUE if platform supports HTMLImageArray}
   */
  static get isGPUHTMLImageArraySupported() {
    return WebGL2Kernel.isSupported;
  }

  /**
   * @desc TRUE if platform supports single precision}
   * @returns {boolean}
   */
  static get isSinglePrecisionSupported() {
    return kernelOrder.some(Kernel => Kernel.isSupported && Kernel.features.isFloatRead && Kernel.features.isTextureFloat);
  }

  /**
   * Creates an instance of GPU.
   * @param {IGPUSettings} [settings] - Settings to set mode, and other properties
   * @constructor
   */
  constructor(settings) {
    settings = settings || {};
    this.canvas = settings.canvas || null;
    this.context = settings.context || null;
    this.mode = settings.mode;
    this.Kernel = null;
    this.kernels = [];
    this.functions = [];
    this.nativeFunctions = [];
    this.injectedNative = null;
    if (this.mode === 'dev') return;
    this.chooseKernel();
    // add functions from settings
    if (settings.functions) {
      for (let i = 0; i < settings.functions.length; i++) {
        this.addFunction(settings.functions[i]);
      }
    }

    // add native functions from settings
    if (settings.nativeFunctions) {
      for (const p in settings.nativeFunctions) {
        if (!settings.nativeFunctions.hasOwnProperty(p)) continue;
        const s = settings.nativeFunctions[p];
        const { name, source } = s;
        this.addNativeFunction(name, source, s);
      }
    }
  }

  /**
   * Choose kernel type and save on .Kernel property of GPU
   */
  chooseKernel() {
    if (this.Kernel) return;

    /**
     *
     * @type {WebGLKernel|WebGL2Kernel|HeadlessGLKernel|CPUKernel}
     */
    let Kernel = null;

    if (this.context) {
      for (let i = 0; i < kernelOrder.length; i++) {
        const ExternalKernel = kernelOrder[i];
        if (ExternalKernel.isContextMatch(this.context)) {
          if (!ExternalKernel.isSupported) {
            throw new Error(`Kernel type ${ExternalKernel.name} not supported`);
          }
          Kernel = ExternalKernel;
          break;
        }
      }
      if (Kernel === null) {
        throw new Error('unknown Context');
      }
    } else if (this.mode) {
      if (this.mode in internalKernels) {
        if (!validate || internalKernels[this.mode].isSupported) {
          Kernel = internalKernels[this.mode];
        }
      } else if (this.mode === 'gpu') {
        for (let i = 0; i < kernelOrder.length; i++) {
          if (kernelOrder[i].isSupported) {
            Kernel = kernelOrder[i];
            break;
          }
        }
      } else if (this.mode === 'cpu') {
        Kernel = CPUKernel;
      }
      if (!Kernel) {
        throw new Error(`A requested mode of "${this.mode}" and is not supported`);
      }
    } else {
      for (let i = 0; i < kernelOrder.length; i++) {
        if (kernelOrder[i].isSupported) {
          Kernel = kernelOrder[i];
          break;
        }
      }
      if (!Kernel) {
        Kernel = CPUKernel;
      }
    }

    if (!this.mode) {
      this.mode = Kernel.mode;
    }
    this.Kernel = Kernel;
  }

  /**
   * @desc This creates a callable function object to call the kernel function with the argument parameter set
   * @param {Function|String|object} source - The calling to perform the conversion
   * @param {IGPUKernelSettings} [settings] - The parameter configuration object
   * @return {IKernelRunShortcut} callable function to run
   */
  createKernel(source, settings) {
    if (typeof source === 'undefined') {
      throw new Error('Missing source parameter');
    }
    if (typeof source !== 'object' && !utils.isFunction(source) && typeof source !== 'string') {
      throw new Error('source parameter not a function');
    }

    const kernels = this.kernels;
    if (this.mode === 'dev') {
      const devKernel = gpuMock(source, upgradeDeprecatedCreateKernelSettings(settings));
      kernels.push(devKernel);
      return devKernel;
    }

    source = typeof source === 'function' ? source.toString() : source;
    const switchableKernels = {};
    const settingsCopy = upgradeDeprecatedCreateKernelSettings(settings) || {};
    // handle conversion of argumentTypes
    if (settings && typeof settings.argumentTypes === 'object') {
      settingsCopy.argumentTypes = Object.keys(settings.argumentTypes).map(argumentName => settings.argumentTypes[argumentName]);
    }

    function onRequestFallback(args) {
      console.warn('Falling back to CPU');
      const fallbackKernel = new CPUKernel(source, {
        argumentTypes: kernelRun.argumentTypes,
        constantTypes: kernelRun.constantTypes,
        graphical: kernelRun.graphical,
        loopMaxIterations: kernelRun.loopMaxIterations,
        constants: kernelRun.constants,
        dynamicOutput: kernelRun.dynamicOutput,
        dynamicArgument: kernelRun.dynamicArguments,
        output: kernelRun.output,
        precision: kernelRun.precision,
        pipeline: kernelRun.pipeline,
        immutable: kernelRun.immutable,
        optimizeFloatMemory: kernelRun.optimizeFloatMemory,
        fixIntegerDivisionAccuracy: kernelRun.fixIntegerDivisionAccuracy,
        functions: kernelRun.functions,
        nativeFunctions: kernelRun.nativeFunctions,
        injectedNative: kernelRun.injectedNative,
        subKernels: kernelRun.subKernels,
        strictIntegers: kernelRun.strictIntegers,
        debug: kernelRun.debug,
      });
      fallbackKernel.build.apply(fallbackKernel, args);
      const result = fallbackKernel.run.apply(fallbackKernel, args);
      kernelRun.replaceKernel(fallbackKernel);
      return result;
    }

    /**
     *
     * @param {IReason[]} reasons
     * @param {IArguments} args
     * @param {Kernel} _kernel
     * @returns {*}
     */
    function onRequestSwitchKernel(reasons, args, _kernel) {
      if (_kernel.debug) {
        console.warn('Switching kernels');
      }
      let newOutput = null;
      if (_kernel.signature && !switchableKernels[_kernel.signature]) {
        switchableKernels[_kernel.signature] = _kernel;
      }
      if (_kernel.dynamicOutput) {
        for (let i = reasons.length - 1; i >= 0; i--) {
          const reason = reasons[i];
          if (reason.type === 'outputPrecisionMismatch') {
            newOutput = reason.needed;
          }
        }
      }

      const Constructor = _kernel.constructor;
      const argumentTypes = Constructor.getArgumentTypes(_kernel, args);
      const signature = Constructor.getSignature(_kernel, argumentTypes);
      const existingKernel = switchableKernels[signature];
      if (existingKernel) {
        existingKernel.onActivate(_kernel);
        return existingKernel;
      }

      const newKernel = switchableKernels[signature] = new Constructor(source, {
        argumentTypes,
        constantTypes: _kernel.constantTypes,
        graphical: _kernel.graphical,
        loopMaxIterations: _kernel.loopMaxIterations,
        constants: _kernel.constants,
        dynamicOutput: _kernel.dynamicOutput,
        dynamicArgument: _kernel.dynamicArguments,
        context: _kernel.context,
        canvas: _kernel.canvas,
        output: newOutput || _kernel.output,
        precision: _kernel.precision,
        pipeline: _kernel.pipeline,
        immutable: _kernel.immutable,
        optimizeFloatMemory: _kernel.optimizeFloatMemory,
        fixIntegerDivisionAccuracy: _kernel.fixIntegerDivisionAccuracy,
        functions: _kernel.functions,
        nativeFunctions: _kernel.nativeFunctions,
        injectedNative: _kernel.injectedNative,
        subKernels: _kernel.subKernels,
        strictIntegers: _kernel.strictIntegers,
        debug: _kernel.debug,
        gpu: _kernel.gpu,
        validate,
        returnType: _kernel.returnType,
        tactic: _kernel.tactic,
        onRequestFallback,
        onRequestSwitchKernel,
        texture: _kernel.texture,
        mappedTextures: _kernel.mappedTextures,
        drawBuffersMap: _kernel.drawBuffersMap,
      });
      newKernel.build.apply(newKernel, args);
      kernelRun.replaceKernel(newKernel);
      kernels.push(newKernel);
      return newKernel;
    }
    const mergedSettings = Object.assign({
      context: this.context,
      canvas: this.canvas,
      functions: this.functions,
      nativeFunctions: this.nativeFunctions,
      injectedNative: this.injectedNative,
      gpu: this,
      validate,
      onRequestFallback,
      onRequestSwitchKernel
    }, settingsCopy);

    const kernel = new this.Kernel(source, mergedSettings);
    const kernelRun = kernelRunShortcut(kernel);

    //if canvas didn't come from this, propagate from kernel
    if (!this.canvas) {
      this.canvas = kernel.canvas;
    }

    //if context didn't come from this, propagate from kernel
    if (!this.context) {
      this.context = kernel.context;
    }

    kernels.push(kernel);

    return kernelRun;
  }

  /**
   *
   * Create a super kernel which executes sub kernels
   * and saves their output to be used with the next sub kernel.
   * This can be useful if we want to save the output on one kernel,
   * and then use it as an input to another kernel. *Machine Learning*
   *
   * @param {Object|Array} subKernels - Sub kernels for this kernel
   * @param {Function} rootKernel - Root kernel
   *
   * @returns {Function} callable kernel function
   *
   * @example
   * const megaKernel = gpu.createKernelMap({
   *   addResult: function add(a, b) {
   *     return a[this.thread.x] + b[this.thread.x];
   *   },
   *   multiplyResult: function multiply(a, b) {
   *     return a[this.thread.x] * b[this.thread.x];
   *   },
   *  }, function(a, b, c) {
   *       return multiply(add(a, b), c);
   * });
   *
   * megaKernel(a, b, c);
   *
   * Note: You can also define subKernels as an array of functions.
   * > [add, multiply]
   *
   */
  createKernelMap() {
    let fn;
    let settings;
    const argument2Type = typeof arguments[arguments.length - 2];
    if (argument2Type === 'function' || argument2Type === 'string') {
      fn = arguments[arguments.length - 2];
      settings = arguments[arguments.length - 1];
    } else {
      fn = arguments[arguments.length - 1];
    }

    if (this.mode !== 'dev') {
      if (!this.Kernel.isSupported || !this.Kernel.features.kernelMap) {
        if (this.mode && kernelTypes.indexOf(this.mode) < 0) {
          throw new Error(`kernelMap not supported on ${this.Kernel.name}`);
        }
      }
    }

    const settingsCopy = upgradeDeprecatedCreateKernelSettings(settings);
    // handle conversion of argumentTypes
    if (settings && typeof settings.argumentTypes === 'object') {
      settingsCopy.argumentTypes = Object.keys(settings.argumentTypes).map(argumentName => settings.argumentTypes[argumentName]);
    }

    if (Array.isArray(arguments[0])) {
      settingsCopy.subKernels = [];
      const functions = arguments[0];
      for (let i = 0; i < functions.length; i++) {
        const source = functions[i].toString();
        const name = utils.getFunctionNameFromString(source);
        settingsCopy.subKernels.push({
          name,
          source,
          property: i,
        });
      }
    } else {
      settingsCopy.subKernels = [];
      const functions = arguments[0];
      for (let p in functions) {
        if (!functions.hasOwnProperty(p)) continue;
        const source = functions[p].toString();
        const name = utils.getFunctionNameFromString(source);
        settingsCopy.subKernels.push({
          name: name || p,
          source,
          property: p,
        });
      }
    }
    return this.createKernel(fn, settingsCopy);
  }

  /**
   *
   * Combine different kernels into one super Kernel,
   * useful to perform multiple operations inside one
   * kernel without the penalty of data transfer between
   * cpu and gpu.
   *
   * The number of kernel functions sent to this method can be variable.
   * You can send in one, two, etc.
   *
   * @param {Function} subKernels - Kernel function(s) to combine.
   * @param {Function} rootKernel - Root kernel to combine kernels into
   *
   * @example
   *   combineKernels(add, multiply, function(a,b,c){
   *     return add(multiply(a,b), c)
   *  })
   *
   * @returns {Function} Callable kernel function
   *
   */
  combineKernels() {
    const firstKernel = arguments[0];
    const combinedKernel = arguments[arguments.length - 1];
    if (firstKernel.kernel.constructor.mode === 'cpu') return combinedKernel;
    const canvas = arguments[0].canvas;
    const context = arguments[0].context;
    const max = arguments.length - 1;
    for (let i = 0; i < max; i++) {
      arguments[i]
        .setCanvas(canvas)
        .setContext(context)
        .setPipeline(true);
    }

    return function() {
      const texture = combinedKernel.apply(this, arguments);
      if (texture.toArray) {
        return texture.toArray();
      }
      return texture;
    };
  }

  setFunctions(functions) {
    this.functions = functions;
    return this;
  }

  setNativeFunctions(nativeFunctions) {
    this.nativeFunctions = nativeFunctions;
    return this;
  }

  /**
   * @desc Adds additional functions, that the kernel may call.
   * @param {Function|String} source - Javascript function to convert
   * @param {IFunctionSettings} [settings]
   * @returns {GPU} returns itself
   */
  addFunction(source, settings) {
    this.functions.push({ source, settings });
    return this;
  }

  /**
   * @desc Adds additional native functions, that the kernel may call.
   * @param {String} name - native function name, used for reverse lookup
   * @param {String} source - the native function implementation, as it would be defined in it's entirety
   * @param {object} [settings]
   * @returns {GPU} returns itself
   */
  addNativeFunction(name, source, settings) {
    if (this.kernels.length > 0) {
      throw new Error('Cannot call "addNativeFunction" after "createKernels" has been called.');
    }
    this.nativeFunctions.push(Object.assign({ name, source }, settings));
    return this;
  }

  /**
   * Inject a string just before translated kernel functions
   * @param {String} source
   * @return {GPU}
   */
  injectNative(source) {
    this.injectedNative = source;
    return this;
  }

  /**
   * @desc Destroys all memory associated with gpu.js & the webGl if we created it
   * @return {Promise}
   * @resolve {void}
   * @reject {Error}
   */
  destroy() {
    return new Promise((resolve, reject) => {
      if (!this.kernels) {
        resolve();
      }
      // perform on next run loop - for some reason we dont get lose context events
      // if webGl is created and destroyed in the same run loop.
      setTimeout(() => {
        try {
          for (let i = 0; i < this.kernels.length; i++) {
            this.kernels[i].destroy(true); // remove canvas if exists
          }
          // all kernels are associated with one context, go ahead and take care of it here
          let firstKernel = this.kernels[0];
          if (firstKernel) {
            // if it is shortcut
            if (firstKernel.kernel) {
              firstKernel = firstKernel.kernel;
            }
            if (firstKernel.constructor.destroyContext) {
              firstKernel.constructor.destroyContext(this.context);
            }
          }
        } catch (e) {
          reject(e);
        }
        resolve();
      }, 0);
    });
  }
}


function upgradeDeprecatedCreateKernelSettings(settings) {
  if (!settings) {
    return {};
  }
  const upgradedSettings = Object.assign({}, settings);

  if (settings.hasOwnProperty('floatOutput')) {
    utils.warnDeprecated('setting', 'floatOutput', 'precision');
    upgradedSettings.precision = settings.floatOutput ? 'single' : 'unsigned';
  }
  if (settings.hasOwnProperty('outputToTexture')) {
    utils.warnDeprecated('setting', 'outputToTexture', 'pipeline');
    upgradedSettings.pipeline = Boolean(settings.outputToTexture);
  }
  if (settings.hasOwnProperty('outputImmutable')) {
    utils.warnDeprecated('setting', 'outputImmutable', 'immutable');
    upgradedSettings.immutable = Boolean(settings.outputImmutable);
  }
  if (settings.hasOwnProperty('floatTextures')) {
    utils.warnDeprecated('setting', 'floatTextures', 'optimizeFloatMemory');
    upgradedSettings.optimizeFloatMemory = Boolean(settings.floatTextures);
  }
  return upgradedSettings;
}

module.exports = {
  GPU,
  kernelOrder,
  kernelTypes
};

/***/ }),

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { GPU } = __webpack_require__(/*! ./gpu */ "./src/gpu.js");
const { alias } = __webpack_require__(/*! ./alias */ "./src/alias.js");
const { utils } = __webpack_require__(/*! ./utils */ "./src/utils.js");
const { Input, input } = __webpack_require__(/*! ./input */ "./src/input.js");
const { Texture } = __webpack_require__(/*! ./texture */ "./src/texture.js");
const { FunctionBuilder } = __webpack_require__(/*! ./backend/function-builder */ "./src/backend/function-builder.js");
const { FunctionNode } = __webpack_require__(/*! ./backend/function-node */ "./src/backend/function-node.js");
const { CPUFunctionNode } = __webpack_require__(/*! ./backend/cpu/function-node */ "./src/backend/cpu/function-node.js");
const { CPUKernel } = __webpack_require__(/*! ./backend/cpu/kernel */ "./src/backend/cpu/kernel.js");

const { HeadlessGLKernel } = __webpack_require__(/*! ./backend/headless-gl/kernel */ "./src/backend/headless-gl/kernel.js");

const { WebGLFunctionNode } = __webpack_require__(/*! ./backend/web-gl/function-node */ "./src/backend/web-gl/function-node.js");
const { WebGLKernel } = __webpack_require__(/*! ./backend/web-gl/kernel */ "./src/backend/web-gl/kernel.js");
const { kernelValueMaps: webGLKernelValueMaps } = __webpack_require__(/*! ./backend/web-gl/kernel-value-maps */ "./src/backend/web-gl/kernel-value-maps.js");

const { WebGL2FunctionNode } = __webpack_require__(/*! ./backend/web-gl2/function-node */ "./src/backend/web-gl2/function-node.js");
const { WebGL2Kernel } = __webpack_require__(/*! ./backend/web-gl2/kernel */ "./src/backend/web-gl2/kernel.js");
const { kernelValueMaps: webGL2KernelValueMaps } = __webpack_require__(/*! ./backend/web-gl2/kernel-value-maps */ "./src/backend/web-gl2/kernel-value-maps.js");

const { GLKernel } = __webpack_require__(/*! ./backend/gl/kernel */ "./src/backend/gl/kernel.js");

const { Kernel } = __webpack_require__(/*! ./backend/kernel */ "./src/backend/kernel.js");

const { FunctionTracer } = __webpack_require__(/*! ./backend/function-tracer */ "./src/backend/function-tracer.js");

const mathRandom = __webpack_require__(/*! ./plugins/math-random-uniformly-distributed */ "./src/plugins/math-random-uniformly-distributed.js");

module.exports = {
  alias,
  CPUFunctionNode,
  CPUKernel,
  GPU,
  FunctionBuilder,
  FunctionNode,
  HeadlessGLKernel,
  Input,
  input,
  Texture,
  utils,

  WebGL2FunctionNode,
  WebGL2Kernel,
  webGL2KernelValueMaps,

  WebGLFunctionNode,
  WebGLKernel,
  webGLKernelValueMaps,

  GLKernel,
  Kernel,
  FunctionTracer,

  plugins: {
    mathRandom
  }
};

/***/ }),

/***/ "./src/input.js":
/*!**********************!*\
  !*** ./src/input.js ***!
  \**********************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

class Input {
  constructor(value, size) {
    this.value = value;
    if (Array.isArray(size)) {
      this.size = size;
    } else {
      this.size = new Int32Array(3);
      if (size.z) {
        this.size = new Int32Array([size.x, size.y, size.z]);
      } else if (size.y) {
        this.size = new Int32Array([size.x, size.y]);
      } else {
        this.size = new Int32Array([size.x]);
      }
    }

    const [w, h, d] = this.size;
    if (d) {
      if (this.value.length !== (w * h * d)) {
        throw new Error(`Input size ${this.value.length} does not match ${w} * ${h} * ${d} = ${(h * w * d)}`);
      }
    } else if (h) {
      if (this.value.length !== (w * h)) {
        throw new Error(`Input size ${this.value.length} does not match ${w} * ${h} = ${(h * w)}`);
      }
    } else {
      if (this.value.length !== w) {
        throw new Error(`Input size ${this.value.length} does not match ${w}`);
      }
    }

  }

  toArray() {
    const { utils } = __webpack_require__(/*! ./utils */ "./src/utils.js");
    const [w, h, d] = this.size;
    if (d) {
      return utils.erectMemoryOptimized3DFloat(this.value.subarray ? this.value : new Float32Array(this.value), w, h, d);
    } else if (h) {
      return utils.erectMemoryOptimized2DFloat(this.value.subarray ? this.value : new Float32Array(this.value), w, h);
    } else {
      return this.value;
    }
  }
}

function input(value, size) {
  return new Input(value, size);
}

module.exports = {
  Input,
  input
};

/***/ }),

/***/ "./src/kernel-run-shortcut.js":
/*!************************************!*\
  !*** ./src/kernel-run-shortcut.js ***!
  \************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { utils } = __webpack_require__(/*! ./utils */ "./src/utils.js");

/**
 * Makes kernels easier for mortals (including me)
 * @param kernel
 * @returns {function()}
 */
function kernelRunShortcut(kernel) {
  let run = function() {
    kernel.build.apply(kernel, arguments);
    run = function() {
      let result = kernel.run.apply(kernel, arguments);
      if (kernel.switchingKernels) {
        const reasons = kernel.resetSwitchingKernels();
        const newKernel = kernel.onRequestSwitchKernel(reasons, arguments, kernel);
        shortcut.kernel = kernel = newKernel;
        result = newKernel.run.apply(newKernel, arguments);
      }
      if (kernel.renderKernels) {
        return kernel.renderKernels();
      } else if (kernel.renderOutput) {
        return kernel.renderOutput();
      } else {
        return result;
      }
    };
    return run.apply(kernel, arguments);
  };
  const shortcut = function() {
    return run.apply(kernel, arguments);
  };
  /**
   * Run kernel in async mode
   * @returns {Promise<KernelOutput>}
   */
  shortcut.exec = function() {
    return new Promise((accept, reject) => {
      try {
        accept(run.apply(this, arguments));
      } catch (e) {
        reject(e);
      }
    });
  };
  shortcut.replaceKernel = function(replacementKernel) {
    kernel = replacementKernel;
    bindKernelToShortcut(kernel, shortcut);
  };

  bindKernelToShortcut(kernel, shortcut);
  return shortcut;
}

function bindKernelToShortcut(kernel, shortcut) {
  if (shortcut.kernel) {
    shortcut.kernel = kernel;
    return;
  }
  const properties = utils.allPropertiesOf(kernel);
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    if (property[0] === '_' && property[1] === '_') continue;
    if (typeof kernel[property] === 'function') {
      if (property.substring(0, 3) === 'add' || property.substring(0, 3) === 'set') {
        shortcut[property] = function() {
          shortcut.kernel[property].apply(shortcut.kernel, arguments);
          return shortcut;
        };
      } else {
        shortcut[property] = function() {
          return shortcut.kernel[property].apply(shortcut.kernel, arguments);
        };
      }
    } else {
      shortcut.__defineGetter__(property, () => shortcut.kernel[property]);
      shortcut.__defineSetter__(property, (value) => {
        shortcut.kernel[property] = value;
      });
    }
  }
  shortcut.kernel = kernel;
}
module.exports = {
  kernelRunShortcut
};

/***/ }),

/***/ "./src/plugins/math-random-uniformly-distributed.js":
/*!**********************************************************!*\
  !*** ./src/plugins/math-random-uniformly-distributed.js ***!
  \**********************************************************/
/***/ ((module) => {

// language=GLSL
const source = `// https://www.shadertoy.com/view/4t2SDh
//note: uniformly distributed, normalized rand, [0,1]
highp float randomSeedShift = 1.0;
highp float slide = 1.0;
uniform highp float randomSeed1;
uniform highp float randomSeed2;

highp float nrand(highp vec2 n) {
  highp float result = fract(sin(dot((n.xy + 1.0) * vec2(randomSeed1 * slide, randomSeed2 * randomSeedShift), vec2(12.9898, 78.233))) * 43758.5453);
  randomSeedShift = result;
  if (randomSeedShift > 0.5) {
    slide += 0.00009; 
  } else {
    slide += 0.0009;
  }
  return result;
}`;

const name = 'math-random-uniformly-distributed';

// language=JavaScript
const functionMatch = `Math.random()`;

const functionReplace = `nrand(vTexCoord)`;

const functionReturnType = 'Number';
/**
 *
 * @param {Kernel} kernel
 */
const onBeforeRun = (kernel) => {
  kernel.setUniform1f('randomSeed1', Math.random());
  kernel.setUniform1f('randomSeed2', Math.random());
};

/**
 *
 * @type IPlugin
 */
const plugin = {
  name,
  onBeforeRun,
  functionMatch,
  functionReplace,
  functionReturnType,
  source
};

module.exports = plugin;

/***/ }),

/***/ "./src/texture.js":
/*!************************!*\
  !*** ./src/texture.js ***!
  \************************/
/***/ ((module) => {

/**
 * @desc WebGl Texture implementation in JS
 * @param {IGPUTextureSettings} settings
 */
class Texture {
  constructor(settings) {
    const {
      texture,
      size,
      dimensions,
      output,
      context,
      type = 'NumberTexture',
      kernel,
      internalFormat,
      textureFormat
    } = settings;
    if (!output) throw new Error('settings property "output" required.');
    if (!context) throw new Error('settings property "context" required.');
    if (!texture) throw new Error('settings property "texture" required.');
    if (!kernel) throw new Error('settings property "kernel" required.');
    this.texture = texture;
    if (texture._refs) {
      texture._refs++;
    } else {
      texture._refs = 1;
    }
    this.size = size;
    this.dimensions = dimensions;
    this.output = output;
    this.context = context;
    /**
     * @type {Kernel}
     */
    this.kernel = kernel;
    this.type = type;
    this._deleted = false;
    this.internalFormat = internalFormat;
    this.textureFormat = textureFormat;
  }

  /**
   * @desc Converts the Texture into a JavaScript Array
   * @returns {TextureArrayOutput}
   */
  toArray() {
    throw new Error(`Not implemented on ${this.constructor.name}`);
  }

  /**
   * @desc Clones the Texture
   * @returns {Texture}
   */
  clone() {
    throw new Error(`Not implemented on ${this.constructor.name}`);
  }

  /**
   * @desc Deletes the Texture
   */
  delete() {
    throw new Error(`Not implemented on ${this.constructor.name}`);
  }

  clear() {
    throw new Error(`Not implemented on ${this.constructor.name}`);
  }
}

module.exports = {
  Texture
};

/***/ }),

/***/ "./src/utils.js":
/*!**********************!*\
  !*** ./src/utils.js ***!
  \**********************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const acorn = __webpack_require__(/*! acorn */ "./node_modules/acorn/dist/acorn.mjs");
const { Input } = __webpack_require__(/*! ./input */ "./src/input.js");
const { Texture } = __webpack_require__(/*! ./texture */ "./src/texture.js");

const FUNCTION_NAME = /function ([^(]*)/;
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;

/**
 *
 * @desc Various utility functions / snippets of code that GPU.JS uses internally.
 * @type {utils}
 * This covers various snippets of code that is not entirely gpu.js specific (ie. may find uses elsewhere)
 */
const utils = {
  /**
   *
   * @desc Gets the system endianness, and cache it
   * @returns {String} 'LE' or 'BE' depending on system architecture
   * Credit: https://gist.github.com/TooTallNate/4750953
   */
  systemEndianness() {
    return _systemEndianness;
  },
  getSystemEndianness() {
    const b = new ArrayBuffer(4);
    const a = new Uint32Array(b);
    const c = new Uint8Array(b);
    a[0] = 0xdeadbeef;
    if (c[0] === 0xef) return 'LE';
    if (c[0] === 0xde) return 'BE';
    throw new Error('unknown endianness');
  },

  /**
   * @descReturn TRUE, on a JS function
   * @param {Function} funcObj - Object to validate if its a function
   * @returns  {Boolean} TRUE if the object is a JS function
   */
  isFunction(funcObj) {
    return typeof(funcObj) === 'function';
  },

  /**
   * @desc Return TRUE, on a valid JS function string
   * Note: This does just a VERY simply sanity check. And may give false positives.
   *
   * @param {String} fn - String of JS function to validate
   * @returns {Boolean} TRUE if the string passes basic validation
   */
  isFunctionString(fn) {
    if (typeof fn === 'string') {
      return (fn
        .slice(0, 'function'.length)
        .toLowerCase() === 'function');
    }
    return false;
  },

  /**
   * @desc Return the function name from a JS function string
   * @param {String} funcStr - String of JS function to validate
   * @returns {String} Function name string (if found)
   */
  getFunctionNameFromString(funcStr) {
    const result = FUNCTION_NAME.exec(funcStr);
    if (!result || result.length === 0) return null;
    return result[1].trim();
  },

  getFunctionBodyFromString(funcStr) {
    return funcStr.substring(funcStr.indexOf('{') + 1, funcStr.lastIndexOf('}'));
  },

  /**
   * @desc Return list of argument names extracted from a javascript function
   * @param {String} fn - String of JS function to validate
   * @returns {String[]}  Array representing all the parameter names
   */
  getArgumentNamesFromString(fn) {
    const fnStr = fn.replace(STRIP_COMMENTS, '');
    let result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    if (result === null) {
      result = [];
    }
    return result;
  },

  /**
   * @desc Returns a clone
   * @param {Object} obj - Object to clone
   * @returns {Object|Array} Cloned object
   */
  clone(obj) {
    if (obj === null || typeof obj !== 'object' || obj.hasOwnProperty('isActiveClone')) return obj;

    const temp = obj.constructor(); // changed

    for (let key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        obj.isActiveClone = null;
        temp[key] = utils.clone(obj[key]);
        delete obj.isActiveClone;
      }
    }

    return temp;
  },

  /**
   * @desc Checks if is an array or Array-like object
   * @param {Object} array - The argument object to check if is array
   * @returns {Boolean}  true if is array or Array-like object
   */
  isArray(array) {
    return !isNaN(array.length);
  },

  /**
   * @desc Evaluate the argument type, to apply respective logic for it
   * @param {*} value - The argument object to evaluate type
   * @param {boolean} [strictIntegers]
   * @returns {String}  Argument type Array/Number/Float/Texture/Unknown
   */
  getVariableType(value, strictIntegers) {
    if (utils.isArray(value)) {
      if (value.length > 0 && value[0].nodeName === 'IMG') {
        return 'HTMLImageArray';
      }
      return 'Array';
    }

    switch (value.constructor) {
      case Boolean:
        return 'Boolean';
      case Number:
        if (strictIntegers && Number.isInteger(value)) {
          return 'Integer';
        }
        return 'Float';
      case Texture:
        return value.type;
      case Input:
        return 'Input';
    }
    if ('nodeName' in value) {
      switch (value.nodeName) {
        case 'IMG':
          return 'HTMLImage';
        case 'CANVAS':
          return 'HTMLImage';
        case 'VIDEO':
          return 'HTMLVideo';
      }
    } else if (value.hasOwnProperty('type')) {
      return value.type;
    } else if (typeof OffscreenCanvas !== 'undefined' && value instanceof OffscreenCanvas) {
      return 'OffscreenCanvas';
    } else if (typeof ImageBitmap !== 'undefined' && value instanceof ImageBitmap) {
      return 'ImageBitmap';
    } else if (typeof ImageData !== 'undefined' && value instanceof ImageData) {
      return 'ImageData';
    }
    return 'Unknown';
  },

  getKernelTextureSize(settings, dimensions) {
    let [w, h, d] = dimensions;
    let texelCount = (w || 1) * (h || 1) * (d || 1);

    if (settings.optimizeFloatMemory && settings.precision === 'single') {
      w = texelCount = Math.ceil(texelCount / 4);
    }
    // if given dimensions == a 2d image
    if (h > 1 && w * h === texelCount) {
      return new Int32Array([w, h]);
    }
    return utils.closestSquareDimensions(texelCount);
  },

  /**
   *
   * @param {Number} length
   * @returns {TextureDimensions}
   */
  closestSquareDimensions(length) {
    const sqrt = Math.sqrt(length);
    let high = Math.ceil(sqrt);
    let low = Math.floor(sqrt);
    while (high * low < length) {
      high--;
      low = Math.ceil(length / high);
    }
    return new Int32Array([low, Math.ceil(length / low)]);
  },

  /**
   * A texture takes up four
   * @param {OutputDimensions} dimensions
   * @param {Number} bitRatio
   * @returns {TextureDimensions}
   */
  getMemoryOptimizedFloatTextureSize(dimensions, bitRatio) {
    const totalArea = utils.roundTo((dimensions[0] || 1) * (dimensions[1] || 1) * (dimensions[2] || 1) * (dimensions[3] || 1), 4);
    const texelCount = totalArea / bitRatio;
    return utils.closestSquareDimensions(texelCount);
  },

  /**
   *
   * @param dimensions
   * @param bitRatio
   * @returns {*|TextureDimensions}
   */
  getMemoryOptimizedPackedTextureSize(dimensions, bitRatio) {
    const [w, h, d] = dimensions;
    const totalArea = utils.roundTo((w || 1) * (h || 1) * (d || 1), 4);
    const texelCount = totalArea / (4 / bitRatio);
    return utils.closestSquareDimensions(texelCount);
  },

  roundTo(n, d) {
    return Math.floor((n + d - 1) / d) * d;
  },
  /**
   * @desc Return the dimension of an array.
   * @param {Array|String|Texture|Input} x - The array
   * @param {Boolean} [pad] - To include padding in the dimension calculation
   * @returns {OutputDimensions}
   */
  getDimensions(x, pad) {
    let ret;
    if (utils.isArray(x)) {
      const dim = [];
      let temp = x;
      while (utils.isArray(temp)) {
        dim.push(temp.length);
        temp = temp[0];
      }
      ret = dim.reverse();
    } else if (x instanceof Texture) {
      ret = x.output;
    } else if (x instanceof Input) {
      ret = x.size;
    } else {
      throw new Error(`Unknown dimensions of ${x}`);
    }

    if (pad) {
      ret = Array.from(ret);
      while (ret.length < 3) {
        ret.push(1);
      }
    }

    return new Int32Array(ret);
  },

  /**
   * Puts a nested 2d array into a one-dimensional target array
   * @param {Array|*} array
   * @param {Float32Array|Float64Array} target
   */
  flatten2dArrayTo(array, target) {
    let offset = 0;
    for (let y = 0; y < array.length; y++) {
      target.set(array[y], offset);
      offset += array[y].length;
    }
  },

  /**
   * Puts a nested 3d array into a one-dimensional target array
   * @param {Array|*} array
   * @param {Float32Array|Float64Array} target
   */
  flatten3dArrayTo(array, target) {
    let offset = 0;
    for (let z = 0; z < array.length; z++) {
      for (let y = 0; y < array[z].length; y++) {
        target.set(array[z][y], offset);
        offset += array[z][y].length;
      }
    }
  },

  /**
   * Puts a nested 4d array into a one-dimensional target array
   * @param {Array|*} array
   * @param {Float32Array|Float64Array} target
   */
  flatten4dArrayTo(array, target) {
    let offset = 0;
    for (let l = 0; l < array.length; l++) {
      for (let z = 0; z < array[l].length; z++) {
        for (let y = 0; y < array[l][z].length; y++) {
          target.set(array[l][z][y], offset);
          offset += array[l][z][y].length;
        }
      }
    }
  },

  /**
   * Puts a nested 1d, 2d, or 3d array into a one-dimensional target array
   * @param {Float32Array|Uint16Array|Uint8Array} array
   * @param {Float32Array} target
   */
  flattenTo(array, target) {
    if (utils.isArray(array[0])) {
      if (utils.isArray(array[0][0])) {
        if (utils.isArray(array[0][0][0])) {
          utils.flatten4dArrayTo(array, target);
        } else {
          utils.flatten3dArrayTo(array, target);
        }
      } else {
        utils.flatten2dArrayTo(array, target);
      }
    } else {
      target.set(array);
    }
  },

  /**
   *
   * @desc Splits an array into smaller arrays.
   * Number of elements in one small chunk is given by `part`
   *
   * @param {Number[]} array - The array to split into chunks
   * @param {Number} part - elements in one chunk
   *
   * @returns {Number[]} An array of smaller chunks
   */
  splitArray(array, part) {
    const result = [];
    for (let i = 0; i < array.length; i += part) {
      result.push(new array.constructor(array.buffer, i * 4 + array.byteOffset, part));
    }
    return result;
  },

  getAstString(source, ast) {
    const lines = Array.isArray(source) ? source : source.split(/\r?\n/g);
    const start = ast.loc.start;
    const end = ast.loc.end;
    const result = [];
    if (start.line === end.line) {
      result.push(lines[start.line - 1].substring(start.column, end.column));
    } else {
      result.push(lines[start.line - 1].slice(start.column));
      for (let i = start.line; i < end.line; i++) {
        result.push(lines[i]);
      }
      result.push(lines[end.line - 1].slice(0, end.column));
    }
    return result.join('\n');
  },

  allPropertiesOf(obj) {
    const props = [];

    do {
      props.push.apply(props, Object.getOwnPropertyNames(obj));
    } while (obj = Object.getPrototypeOf(obj));

    return props;
  },

  /**
   * @param {Array} lines - An Array of strings
   * @returns {String} Single combined String, separated by *\n*
   */
  linesToString(lines) {
    if (lines.length > 0) {
      return lines.join(';\n') + ';\n';
    } else {
      return '\n';
    }
  },
  warnDeprecated(type, oldName, newName) {
    if (newName) {
      console.warn(`You are using a deprecated ${ type } "${ oldName }". It has been replaced with "${ newName }". Fixing, but please upgrade as it will soon be removed.`);
    } else {
      console.warn(`You are using a deprecated ${ type } "${ oldName }". It has been removed. Fixing, but please upgrade as it will soon be removed.`);
    }
  },
  flipPixels: (pixels, width, height) => {
    // https://stackoverflow.com/a/41973289/1324039
    const halfHeight = height / 2 | 0; // the | 0 keeps the result an int
    const bytesPerRow = width * 4;
    // make a temp buffer to hold one row
    const temp = new Uint8ClampedArray(width * 4);
    const result = pixels.slice(0);
    for (let y = 0; y < halfHeight; ++y) {
      const topOffset = y * bytesPerRow;
      const bottomOffset = (height - y - 1) * bytesPerRow;

      // make copy of a row on the top half
      temp.set(result.subarray(topOffset, topOffset + bytesPerRow));

      // copy a row from the bottom half to the top
      result.copyWithin(topOffset, bottomOffset, bottomOffset + bytesPerRow);

      // copy the copy of the top half row to the bottom half
      result.set(temp, bottomOffset);
    }
    return result;
  },
  erectPackedFloat: (array, width) => {
    return array.subarray(0, width);
  },
  erect2DPackedFloat: (array, width, height) => {
    const yResults = new Array(height);
    for (let y = 0; y < height; y++) {
      const xStart = y * width;
      const xEnd = xStart + width;
      yResults[y] = array.subarray(xStart, xEnd);
    }
    return yResults;
  },
  erect3DPackedFloat: (array, width, height, depth) => {
    const zResults = new Array(depth);
    for (let z = 0; z < depth; z++) {
      const yResults = new Array(height);
      for (let y = 0; y < height; y++) {
        const xStart = (z * height * width) + y * width;
        const xEnd = xStart + width;
        yResults[y] = array.subarray(xStart, xEnd);
      }
      zResults[z] = yResults;
    }
    return zResults;
  },
  erectMemoryOptimizedFloat: (array, width) => {
    return array.subarray(0, width);
  },
  erectMemoryOptimized2DFloat: (array, width, height) => {
    const yResults = new Array(height);
    for (let y = 0; y < height; y++) {
      const offset = y * width;
      yResults[y] = array.subarray(offset, offset + width);
    }
    return yResults;
  },
  erectMemoryOptimized3DFloat: (array, width, height, depth) => {
    const zResults = new Array(depth);
    for (let z = 0; z < depth; z++) {
      const yResults = new Array(height);
      for (let y = 0; y < height; y++) {
        const offset = (z * height * width) + (y * width);
        yResults[y] = array.subarray(offset, offset + width);
      }
      zResults[z] = yResults;
    }
    return zResults;
  },
  erectFloat: (array, width) => {
    const xResults = new Float32Array(width);
    let i = 0;
    for (let x = 0; x < width; x++) {
      xResults[x] = array[i];
      i += 4;
    }
    return xResults;
  },
  erect2DFloat: (array, width, height) => {
    const yResults = new Array(height);
    let i = 0;
    for (let y = 0; y < height; y++) {
      const xResults = new Float32Array(width);
      for (let x = 0; x < width; x++) {
        xResults[x] = array[i];
        i += 4;
      }
      yResults[y] = xResults;
    }
    return yResults;
  },
  erect3DFloat: (array, width, height, depth) => {
    const zResults = new Array(depth);
    let i = 0;
    for (let z = 0; z < depth; z++) {
      const yResults = new Array(height);
      for (let y = 0; y < height; y++) {
        const xResults = new Float32Array(width);
        for (let x = 0; x < width; x++) {
          xResults[x] = array[i];
          i += 4;
        }
        yResults[y] = xResults;
      }
      zResults[z] = yResults;
    }
    return zResults;
  },
  erectArray2: (array, width) => {
    const xResults = new Array(width);
    const xResultsMax = width * 4;
    let i = 0;
    for (let x = 0; x < xResultsMax; x += 4) {
      xResults[i++] = array.subarray(x, x + 2);
    }
    return xResults;
  },
  erect2DArray2: (array, width, height) => {
    const yResults = new Array(height);
    const XResultsMax = width * 4;
    for (let y = 0; y < height; y++) {
      const xResults = new Array(width);
      const offset = y * XResultsMax;
      let i = 0;
      for (let x = 0; x < XResultsMax; x += 4) {
        xResults[i++] = array.subarray(x + offset, x + offset + 2);
      }
      yResults[y] = xResults;
    }
    return yResults;
  },
  erect3DArray2: (array, width, height, depth) => {
    const xResultsMax = width * 4;
    const zResults = new Array(depth);
    for (let z = 0; z < depth; z++) {
      const yResults = new Array(height);
      for (let y = 0; y < height; y++) {
        const xResults = new Array(width);
        const offset = (z * xResultsMax * height) + (y * xResultsMax);
        let i = 0;
        for (let x = 0; x < xResultsMax; x += 4) {
          xResults[i++] = array.subarray(x + offset, x + offset + 2);
        }
        yResults[y] = xResults;
      }
      zResults[z] = yResults;
    }
    return zResults;
  },
  erectArray3: (array, width) => {
    const xResults = new Array(width);
    const xResultsMax = width * 4;
    let i = 0;
    for (let x = 0; x < xResultsMax; x += 4) {
      xResults[i++] = array.subarray(x, x + 3);
    }
    return xResults;
  },
  erect2DArray3: (array, width, height) => {
    const xResultsMax = width * 4;
    const yResults = new Array(height);
    for (let y = 0; y < height; y++) {
      const xResults = new Array(width);
      const offset = y * xResultsMax;
      let i = 0;
      for (let x = 0; x < xResultsMax; x += 4) {
        xResults[i++] = array.subarray(x + offset, x + offset + 3);
      }
      yResults[y] = xResults;
    }
    return yResults;
  },
  erect3DArray3: (array, width, height, depth) => {
    const xResultsMax = width * 4;
    const zResults = new Array(depth);
    for (let z = 0; z < depth; z++) {
      const yResults = new Array(height);
      for (let y = 0; y < height; y++) {
        const xResults = new Array(width);
        const offset = (z * xResultsMax * height) + (y * xResultsMax);
        let i = 0;
        for (let x = 0; x < xResultsMax; x += 4) {
          xResults[i++] = array.subarray(x + offset, x + offset + 3);
        }
        yResults[y] = xResults;
      }
      zResults[z] = yResults;
    }
    return zResults;
  },
  erectArray4: (array, width) => {
    const xResults = new Array(array);
    const xResultsMax = width * 4;
    let i = 0;
    for (let x = 0; x < xResultsMax; x += 4) {
      xResults[i++] = array.subarray(x, x + 4);
    }
    return xResults;
  },
  erect2DArray4: (array, width, height) => {
    const xResultsMax = width * 4;
    const yResults = new Array(height);
    for (let y = 0; y < height; y++) {
      const xResults = new Array(width);
      const offset = y * xResultsMax;
      let i = 0;
      for (let x = 0; x < xResultsMax; x += 4) {
        xResults[i++] = array.subarray(x + offset, x + offset + 4);
      }
      yResults[y] = xResults;
    }
    return yResults;
  },
  erect3DArray4: (array, width, height, depth) => {
    const xResultsMax = width * 4;
    const zResults = new Array(depth);
    for (let z = 0; z < depth; z++) {
      const yResults = new Array(height);
      for (let y = 0; y < height; y++) {
        const xResults = new Array(width);
        const offset = (z * xResultsMax * height) + (y * xResultsMax);
        let i = 0;
        for (let x = 0; x < xResultsMax; x += 4) {
          xResults[i++] = array.subarray(x + offset, x + offset + 4);
        }
        yResults[y] = xResults;
      }
      zResults[z] = yResults;
    }
    return zResults;
  },

  /**
   *
   * @param {String} source
   * @param {Object} settings
   * @return {String}
   */
  flattenFunctionToString: (source, settings) => {
    const { findDependency, thisLookup, doNotDefine } = settings;
    let flattened = settings.flattened;
    if (!flattened) {
      flattened = settings.flattened = {};
    }
    const ast = acorn.parse(source);
    const functionDependencies = [];
    let indent = 0;

    function flatten(ast) {
      if (Array.isArray(ast)) {
        const results = [];
        for (let i = 0; i < ast.length; i++) {
          results.push(flatten(ast[i]));
        }
        return results.join('');
      }
      switch (ast.type) {
        case 'Program':
          return flatten(ast.body) + (ast.body[0].type === 'VariableDeclaration' ? ';' : '');
        case 'FunctionDeclaration':
          return `function ${ast.id.name}(${ast.params.map(flatten).join(', ')}) ${ flatten(ast.body) }`;
        case 'BlockStatement': {
          const result = [];
          indent += 2;
          for (let i = 0; i < ast.body.length; i++) {
            const flat = flatten(ast.body[i]);
            if (flat) {
              result.push(' '.repeat(indent) + flat, ';\n');
            }
          }
          indent -= 2;
          return `{\n${result.join('')}}`;
        }
        case 'VariableDeclaration':
          const declarations = utils.normalizeDeclarations(ast)
            .map(flatten)
            .filter(r => r !== null);
          if (declarations.length < 1) {
            return '';
          } else {
            return `${ast.kind} ${declarations.join(',')}`;
          }
          case 'VariableDeclarator':
            if (ast.init.object && ast.init.object.type === 'ThisExpression') {
              const lookup = thisLookup(ast.init.property.name, true);
              if (lookup) {
                return `${ast.id.name} = ${flatten(ast.init)}`;
              } else {
                return null;
              }
            } else {
              return `${ast.id.name} = ${flatten(ast.init)}`;
            }
            case 'CallExpression': {
              if (ast.callee.property.name === 'subarray') {
                return `${flatten(ast.callee.object)}.${flatten(ast.callee.property)}(${ast.arguments.map(value => flatten(value)).join(', ')})`;
              }
              if (ast.callee.object.name === 'gl' || ast.callee.object.name === 'context') {
                return `${flatten(ast.callee.object)}.${flatten(ast.callee.property)}(${ast.arguments.map(value => flatten(value)).join(', ')})`;
              }
              if (ast.callee.object.type === 'ThisExpression') {
                functionDependencies.push(findDependency('this', ast.callee.property.name));
                return `${ast.callee.property.name}(${ast.arguments.map(value => flatten(value)).join(', ')})`;
              } else if (ast.callee.object.name) {
                const foundSource = findDependency(ast.callee.object.name, ast.callee.property.name);
                if (foundSource === null) {
                  // we're not flattening it
                  return `${ast.callee.object.name}.${ast.callee.property.name}(${ast.arguments.map(value => flatten(value)).join(', ')})`;
                } else {
                  functionDependencies.push(foundSource);
                  // we're flattening it
                  return `${ast.callee.property.name}(${ast.arguments.map(value => flatten(value)).join(', ')})`;
                }
              } else if (ast.callee.object.type === 'MemberExpression') {
                return `${flatten(ast.callee.object)}.${ast.callee.property.name}(${ast.arguments.map(value => flatten(value)).join(', ')})`;
              } else {
                throw new Error('unknown ast.callee');
              }
            }
            case 'ReturnStatement':
              return `return ${flatten(ast.argument)}`;
            case 'BinaryExpression':
              return `(${flatten(ast.left)}${ast.operator}${flatten(ast.right)})`;
            case 'UnaryExpression':
              if (ast.prefix) {
                return `${ast.operator} ${flatten(ast.argument)}`;
              } else {
                return `${flatten(ast.argument)} ${ast.operator}`;
              }
              case 'ExpressionStatement':
                return `${flatten(ast.expression)}`;
              case 'SequenceExpression':
                return `(${flatten(ast.expressions)})`;
              case 'ArrowFunctionExpression':
                return `(${ast.params.map(flatten).join(', ')}) => ${flatten(ast.body)}`;
              case 'Literal':
                return ast.raw;
              case 'Identifier':
                return ast.name;
              case 'MemberExpression':
                if (ast.object.type === 'ThisExpression') {
                  return thisLookup(ast.property.name);
                }
                if (ast.computed) {
                  return `${flatten(ast.object)}[${flatten(ast.property)}]`;
                }
                return flatten(ast.object) + '.' + flatten(ast.property);
              case 'ThisExpression':
                return 'this';
              case 'NewExpression':
                return `new ${flatten(ast.callee)}(${ast.arguments.map(value => flatten(value)).join(', ')})`;
              case 'ForStatement':
                return `for (${flatten(ast.init)};${flatten(ast.test)};${flatten(ast.update)}) ${flatten(ast.body)}`;
              case 'AssignmentExpression':
                return `${flatten(ast.left)}${ast.operator}${flatten(ast.right)}`;
              case 'UpdateExpression':
                return `${flatten(ast.argument)}${ast.operator}`;
              case 'IfStatement':
                return `if (${flatten(ast.test)}) ${flatten(ast.consequent)}`;
              case 'ThrowStatement':
                return `throw ${flatten(ast.argument)}`;
              case 'ObjectPattern':
                return ast.properties.map(flatten).join(', ');
              case 'ArrayPattern':
                return ast.elements.map(flatten).join(', ');
              case 'DebuggerStatement':
                return 'debugger;';
              case 'ConditionalExpression':
                return `${flatten(ast.test)}?${flatten(ast.consequent)}:${flatten(ast.alternate)}`;
              case 'Property':
                if (ast.kind === 'init') {
                  return flatten(ast.key);
                }
      }
      throw new Error(`unhandled ast.type of ${ ast.type }`);
    }
    const result = flatten(ast);
    if (functionDependencies.length > 0) {
      const flattenedFunctionDependencies = [];
      for (let i = 0; i < functionDependencies.length; i++) {
        const functionDependency = functionDependencies[i];
        if (!flattened[functionDependency]) {
          flattened[functionDependency] = true;
        }
        functionDependency ? flattenedFunctionDependencies.push(utils.flattenFunctionToString(functionDependency, settings) + '\n') : '';
      }
      return flattenedFunctionDependencies.join('') + result;
    }
    return result;
  },

  normalizeDeclarations: (ast) => {
    if (ast.type !== 'VariableDeclaration') throw new Error('Ast is not of type "VariableDeclaration"');
    const normalizedDeclarations = [];
    for (let declarationIndex = 0; declarationIndex < ast.declarations.length; declarationIndex++) {
      const declaration = ast.declarations[declarationIndex];
      if (declaration.id && declaration.id.type === 'ObjectPattern' && declaration.id.properties) {
        const { properties } = declaration.id;
        for (let propertyIndex = 0; propertyIndex < properties.length; propertyIndex++) {
          const property = properties[propertyIndex];
          if (property.value.type === 'ObjectPattern' && property.value.properties) {
            for (let subPropertyIndex = 0; subPropertyIndex < property.value.properties.length; subPropertyIndex++) {
              const subProperty = property.value.properties[subPropertyIndex];
              if (subProperty.type === 'Property') {
                normalizedDeclarations.push({
                  type: 'VariableDeclarator',
                  id: {
                    type: 'Identifier',
                    name: subProperty.key.name
                  },
                  init: {
                    type: 'MemberExpression',
                    object: {
                      type: 'MemberExpression',
                      object: declaration.init,
                      property: {
                        type: 'Identifier',
                        name: property.key.name
                      },
                      computed: false
                    },
                    property: {
                      type: 'Identifier',
                      name: subProperty.key.name
                    },
                    computed: false
                  }
                });
              } else {
                throw new Error('unexpected state');
              }
            }
          } else if (property.value.type === 'Identifier') {
            normalizedDeclarations.push({
              type: 'VariableDeclarator',
              id: {
                type: 'Identifier',
                name: property.value && property.value.name ? property.value.name : property.key.name
              },
              init: {
                type: 'MemberExpression',
                object: declaration.init,
                property: {
                  type: 'Identifier',
                  name: property.key.name
                },
                computed: false
              }
            });
          } else {
            throw new Error('unexpected state');
          }
        }
      } else if (declaration.id && declaration.id.type === 'ArrayPattern' && declaration.id.elements) {
        const { elements } = declaration.id;
        for (let elementIndex = 0; elementIndex < elements.length; elementIndex++) {
          const element = elements[elementIndex];
          if (element.type === 'Identifier') {
            normalizedDeclarations.push({
              type: 'VariableDeclarator',
              id: {
                type: 'Identifier',
                name: element.name
              },
              init: {
                type: 'MemberExpression',
                object: declaration.init,
                property: {
                  type: 'Literal',
                  value: elementIndex,
                  raw: elementIndex.toString(),
                  start: element.start,
                  end: element.end
                },
                computed: true
              }
            });
          } else {
            throw new Error('unexpected state');
          }
        }
      } else {
        normalizedDeclarations.push(declaration);
      }
    }
    return normalizedDeclarations;
  },

  /**
   *
   * @param {GPU} gpu
   * @param image
   * @return {Array}
   */
  splitHTMLImageToRGB: (gpu, image) => {
    const rKernel = gpu.createKernel(function(a) {
      const pixel = a[this.thread.y][this.thread.x];
      return pixel.r * 255;
    }, {
      output: [image.width, image.height],
      precision: 'unsigned',
      argumentTypes: { a: 'HTMLImage' },
    });
    const gKernel = gpu.createKernel(function(a) {
      const pixel = a[this.thread.y][this.thread.x];
      return pixel.g * 255;
    }, {
      output: [image.width, image.height],
      precision: 'unsigned',
      argumentTypes: { a: 'HTMLImage' },
    });
    const bKernel = gpu.createKernel(function(a) {
      const pixel = a[this.thread.y][this.thread.x];
      return pixel.b * 255;
    }, {
      output: [image.width, image.height],
      precision: 'unsigned',
      argumentTypes: { a: 'HTMLImage' },
    });
    const aKernel = gpu.createKernel(function(a) {
      const pixel = a[this.thread.y][this.thread.x];
      return pixel.a * 255;
    }, {
      output: [image.width, image.height],
      precision: 'unsigned',
      argumentTypes: { a: 'HTMLImage' },
    });
    const result = [
      rKernel(image),
      gKernel(image),
      bKernel(image),
      aKernel(image),
    ];
    result.rKernel = rKernel;
    result.gKernel = gKernel;
    result.bKernel = bKernel;
    result.aKernel = aKernel;
    result.gpu = gpu;
    return result;
  },

  /**
   * A visual debug utility
   * @param {GPU} gpu
   * @param rgba
   * @param width
   * @param height
   * @return {Object[]}
   */
  splitRGBAToCanvases: (gpu, rgba, width, height) => {
    const visualKernelR = gpu.createKernel(function(v) {
      const pixel = v[this.thread.y][this.thread.x];
      this.color(pixel.r / 255, 0, 0, 255);
    }, {
      output: [width, height],
      graphical: true,
      argumentTypes: { v: 'Array2D(4)' }
    });
    visualKernelR(rgba);

    const visualKernelG = gpu.createKernel(function(v) {
      const pixel = v[this.thread.y][this.thread.x];
      this.color(0, pixel.g / 255, 0, 255);
    }, {
      output: [width, height],
      graphical: true,
      argumentTypes: { v: 'Array2D(4)' }
    });
    visualKernelG(rgba);

    const visualKernelB = gpu.createKernel(function(v) {
      const pixel = v[this.thread.y][this.thread.x];
      this.color(0, 0, pixel.b / 255, 255);
    }, {
      output: [width, height],
      graphical: true,
      argumentTypes: { v: 'Array2D(4)' }
    });
    visualKernelB(rgba);

    const visualKernelA = gpu.createKernel(function(v) {
      const pixel = v[this.thread.y][this.thread.x];
      this.color(255, 255, 255, pixel.a / 255);
    }, {
      output: [width, height],
      graphical: true,
      argumentTypes: { v: 'Array2D(4)' }
    });
    visualKernelA(rgba);
    return [
      visualKernelR.canvas,
      visualKernelG.canvas,
      visualKernelB.canvas,
      visualKernelA.canvas,
    ];
  },

  getMinifySafeName: (fn) => {
    try {
      const ast = acorn.parse(`const value = ${fn.toString()}`);
      const { init } = ast.body[0].declarations[0];
      return init.body.name || init.body.body[0].argument.name;
    } catch (e) {
      throw new Error('Unrecognized function type.  Please use `() => yourFunctionVariableHere` or function() { return yourFunctionVariableHere; }');
    }
  },
  sanitizeName: function(name) {
    if (dollarSign.test(name)) {
      name = name.replace(dollarSign, 'S_S');
    }
    if (doubleUnderscore.test(name)) {
      name = name.replace(doubleUnderscore, 'U_U');
    } else if (singleUnderscore.test(name)) {
      name = name.replace(singleUnderscore, 'u_u');
    }
    return name;
  }
};

const dollarSign = /\$/;
const doubleUnderscore = /__/;
const singleUnderscore = /_/;

const _systemEndianness = utils.getSystemEndianness();

module.exports = {
  utils
};

/***/ }),

/***/ "?34f8":
/*!********************!*\
  !*** fs (ignored) ***!
  \********************/
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ "?fcd9":
/*!**********************!*\
  !*** path (ignored) ***!
  \**********************/
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ "?bc95":
/*!**********************!*\
  !*** path (ignored) ***!
  \**********************/
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ "./node_modules/acorn/dist/acorn.mjs":
/*!*******************************************!*\
  !*** ./node_modules/acorn/dist/acorn.mjs ***!
  \*******************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Node": () => (/* binding */ Node),
/* harmony export */   "Parser": () => (/* binding */ Parser),
/* harmony export */   "Position": () => (/* binding */ Position),
/* harmony export */   "SourceLocation": () => (/* binding */ SourceLocation),
/* harmony export */   "TokContext": () => (/* binding */ TokContext),
/* harmony export */   "Token": () => (/* binding */ Token),
/* harmony export */   "TokenType": () => (/* binding */ TokenType),
/* harmony export */   "defaultOptions": () => (/* binding */ defaultOptions),
/* harmony export */   "getLineInfo": () => (/* binding */ getLineInfo),
/* harmony export */   "isIdentifierChar": () => (/* binding */ isIdentifierChar),
/* harmony export */   "isIdentifierStart": () => (/* binding */ isIdentifierStart),
/* harmony export */   "isNewLine": () => (/* binding */ isNewLine),
/* harmony export */   "keywordTypes": () => (/* binding */ keywords$1),
/* harmony export */   "lineBreak": () => (/* binding */ lineBreak),
/* harmony export */   "lineBreakG": () => (/* binding */ lineBreakG),
/* harmony export */   "nonASCIIwhitespace": () => (/* binding */ nonASCIIwhitespace),
/* harmony export */   "parse": () => (/* binding */ parse),
/* harmony export */   "parseExpressionAt": () => (/* binding */ parseExpressionAt),
/* harmony export */   "tokContexts": () => (/* binding */ types$1),
/* harmony export */   "tokTypes": () => (/* binding */ types),
/* harmony export */   "tokenizer": () => (/* binding */ tokenizer),
/* harmony export */   "version": () => (/* binding */ version)
/* harmony export */ });
// Reserved word lists for various dialects of the language

var reservedWords = {
  3: "abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile",
  5: "class enum extends super const export import",
  6: "enum",
  strict: "implements interface let package private protected public static yield",
  strictBind: "eval arguments"
};

// And the keywords

var ecma5AndLessKeywords = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this";

var keywords = {
  5: ecma5AndLessKeywords,
  "5module": ecma5AndLessKeywords + " export import",
  6: ecma5AndLessKeywords + " const class extends export import super"
};

var keywordRelationalOperator = /^in(stanceof)?$/;

// ## Character categories

// Big ugly regular expressions that match characters in the
// whitespace, identifier, and identifier-start categories. These
// are only applied when a character is found to actually have a
// code point above 128.
// Generated by `bin/generate-identifier-regex.js`.
var nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u09fc\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e86-\u0e8a\u0e8c-\u0ea3\u0ea5\u0ea7-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf3\u1cf5\u1cf6\u1cfa\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fef\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7bf\ua7c2-\ua7c6\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab67\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
var nonASCIIidentifierChars = "\u200c\u200d\xb7\u0300-\u036f\u0387\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u07fd\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08d3-\u08e1\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u09fe\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0afa-\u0aff\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c00-\u0c04\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d00-\u0d03\u0d3b\u0d3c\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1369-\u1371\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19d0-\u19da\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1ab0-\u1abd\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf4\u1cf7-\u1cf9\u1dc0-\u1df9\u1dfb-\u1dff\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f1\ua8ff-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\ua9e5\ua9f0-\ua9f9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";

var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

nonASCIIidentifierStartChars = nonASCIIidentifierChars = null;

// These are a run-length and offset encoded representation of the
// >0xffff code points that are a valid part of identifiers. The
// offset starts at 0x10000, and each pair of numbers represents an
// offset to the next range, and then a size of the range. They were
// generated by bin/generate-identifier-regex.js

// eslint-disable-next-line comma-spacing
var astralIdentifierStartCodes = [0,11,2,25,2,18,2,1,2,14,3,13,35,122,70,52,268,28,4,48,48,31,14,29,6,37,11,29,3,35,5,7,2,4,43,157,19,35,5,35,5,39,9,51,157,310,10,21,11,7,153,5,3,0,2,43,2,1,4,0,3,22,11,22,10,30,66,18,2,1,11,21,11,25,71,55,7,1,65,0,16,3,2,2,2,28,43,28,4,28,36,7,2,27,28,53,11,21,11,18,14,17,111,72,56,50,14,50,14,35,477,28,11,0,9,21,155,22,13,52,76,44,33,24,27,35,30,0,12,34,4,0,13,47,15,3,22,0,2,0,36,17,2,24,85,6,2,0,2,3,2,14,2,9,8,46,39,7,3,1,3,21,2,6,2,1,2,4,4,0,19,0,13,4,159,52,19,3,21,0,33,47,21,1,2,0,185,46,42,3,37,47,21,0,60,42,14,0,72,26,230,43,117,63,32,0,161,7,3,38,17,0,2,0,29,0,11,39,8,0,22,0,12,45,20,0,35,56,264,8,2,36,18,0,50,29,113,6,2,1,2,37,22,0,26,5,2,1,2,31,15,0,328,18,270,921,103,110,18,195,2749,1070,4050,582,8634,568,8,30,114,29,19,47,17,3,32,20,6,18,689,63,129,74,6,0,67,12,65,1,2,0,29,6135,9,754,9486,286,50,2,18,3,9,395,2309,106,6,12,4,8,8,9,5991,84,2,70,2,1,3,0,3,1,3,3,2,11,2,0,2,6,2,64,2,3,3,7,2,6,2,27,2,3,2,4,2,0,4,6,2,339,3,24,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,7,2357,44,11,6,17,0,370,43,1301,196,60,67,8,0,1205,3,2,26,2,1,2,0,3,0,2,9,2,3,2,0,2,0,7,0,5,0,2,0,2,0,2,2,2,1,2,0,3,0,2,0,2,0,2,0,2,0,2,1,2,0,3,3,2,6,2,3,2,3,2,0,2,9,2,16,6,2,2,4,2,16,4421,42710,42,4148,12,221,3,5761,15,7472,3104,541];

// eslint-disable-next-line comma-spacing
var astralIdentifierCodes = [509,0,227,0,150,4,294,9,1368,2,2,1,6,3,41,2,5,0,166,1,574,3,9,9,525,10,176,2,54,14,32,9,16,3,46,10,54,9,7,2,37,13,2,9,6,1,45,0,13,2,49,13,9,3,4,9,83,11,7,0,161,11,6,9,7,3,56,1,2,6,3,1,3,2,10,0,11,1,3,6,4,4,193,17,10,9,5,0,82,19,13,9,214,6,3,8,28,1,83,16,16,9,82,12,9,9,84,14,5,9,243,14,166,9,232,6,3,6,4,0,29,9,41,6,2,3,9,0,10,10,47,15,406,7,2,7,17,9,57,21,2,13,123,5,4,0,2,1,2,6,2,0,9,9,49,4,2,1,2,4,9,9,330,3,19306,9,135,4,60,6,26,9,1014,0,2,54,8,3,19723,1,5319,4,4,5,9,7,3,6,31,3,149,2,1418,49,513,54,5,49,9,0,15,0,23,4,2,14,1361,6,2,16,3,6,2,1,2,4,262,6,10,9,419,13,1495,6,110,6,6,9,792487,239];

// This has a complexity linear to the value of the code. The
// assumption is that looking up astral identifier characters is
// rare.
function isInAstralSet(code, set) {
  var pos = 0x10000;
  for (var i = 0; i < set.length; i += 2) {
    pos += set[i];
    if (pos > code) { return false }
    pos += set[i + 1];
    if (pos >= code) { return true }
  }
}

// Test whether a given character code starts an identifier.

function isIdentifierStart(code, astral) {
  if (code < 65) { return code === 36 }
  if (code < 91) { return true }
  if (code < 97) { return code === 95 }
  if (code < 123) { return true }
  if (code <= 0xffff) { return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code)) }
  if (astral === false) { return false }
  return isInAstralSet(code, astralIdentifierStartCodes)
}

// Test whether a given character is part of an identifier.

function isIdentifierChar(code, astral) {
  if (code < 48) { return code === 36 }
  if (code < 58) { return true }
  if (code < 65) { return false }
  if (code < 91) { return true }
  if (code < 97) { return code === 95 }
  if (code < 123) { return true }
  if (code <= 0xffff) { return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code)) }
  if (astral === false) { return false }
  return isInAstralSet(code, astralIdentifierStartCodes) || isInAstralSet(code, astralIdentifierCodes)
}

// ## Token types

// The assignment of fine-grained, information-carrying type objects
// allows the tokenizer to store the information it has about a
// token in a way that is very cheap for the parser to look up.

// All token type variables start with an underscore, to make them
// easy to recognize.

// The `beforeExpr` property is used to disambiguate between regular
// expressions and divisions. It is set on all token types that can
// be followed by an expression (thus, a slash after them would be a
// regular expression).
//
// The `startsExpr` property is used to check if the token ends a
// `yield` expression. It is set on all token types that either can
// directly start an expression (like a quotation mark) or can
// continue an expression (like the body of a string).
//
// `isLoop` marks a keyword as starting a loop, which is important
// to know when parsing a label, in order to allow or disallow
// continue jumps to that label.

var TokenType = function TokenType(label, conf) {
  if ( conf === void 0 ) conf = {};

  this.label = label;
  this.keyword = conf.keyword;
  this.beforeExpr = !!conf.beforeExpr;
  this.startsExpr = !!conf.startsExpr;
  this.isLoop = !!conf.isLoop;
  this.isAssign = !!conf.isAssign;
  this.prefix = !!conf.prefix;
  this.postfix = !!conf.postfix;
  this.binop = conf.binop || null;
  this.updateContext = null;
};

function binop(name, prec) {
  return new TokenType(name, {beforeExpr: true, binop: prec})
}
var beforeExpr = {beforeExpr: true}, startsExpr = {startsExpr: true};

// Map keyword names to token types.

var keywords$1 = {};

// Succinct definitions of keyword token types
function kw(name, options) {
  if ( options === void 0 ) options = {};

  options.keyword = name;
  return keywords$1[name] = new TokenType(name, options)
}

var types = {
  num: new TokenType("num", startsExpr),
  regexp: new TokenType("regexp", startsExpr),
  string: new TokenType("string", startsExpr),
  name: new TokenType("name", startsExpr),
  eof: new TokenType("eof"),

  // Punctuation token types.
  bracketL: new TokenType("[", {beforeExpr: true, startsExpr: true}),
  bracketR: new TokenType("]"),
  braceL: new TokenType("{", {beforeExpr: true, startsExpr: true}),
  braceR: new TokenType("}"),
  parenL: new TokenType("(", {beforeExpr: true, startsExpr: true}),
  parenR: new TokenType(")"),
  comma: new TokenType(",", beforeExpr),
  semi: new TokenType(";", beforeExpr),
  colon: new TokenType(":", beforeExpr),
  dot: new TokenType("."),
  question: new TokenType("?", beforeExpr),
  arrow: new TokenType("=>", beforeExpr),
  template: new TokenType("template"),
  invalidTemplate: new TokenType("invalidTemplate"),
  ellipsis: new TokenType("...", beforeExpr),
  backQuote: new TokenType("`", startsExpr),
  dollarBraceL: new TokenType("${", {beforeExpr: true, startsExpr: true}),

  // Operators. These carry several kinds of properties to help the
  // parser use them properly (the presence of these properties is
  // what categorizes them as operators).
  //
  // `binop`, when present, specifies that this operator is a binary
  // operator, and will refer to its precedence.
  //
  // `prefix` and `postfix` mark the operator as a prefix or postfix
  // unary operator.
  //
  // `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
  // binary operators with a very low precedence, that should result
  // in AssignmentExpression nodes.

  eq: new TokenType("=", {beforeExpr: true, isAssign: true}),
  assign: new TokenType("_=", {beforeExpr: true, isAssign: true}),
  incDec: new TokenType("++/--", {prefix: true, postfix: true, startsExpr: true}),
  prefix: new TokenType("!/~", {beforeExpr: true, prefix: true, startsExpr: true}),
  logicalOR: binop("||", 1),
  logicalAND: binop("&&", 2),
  bitwiseOR: binop("|", 3),
  bitwiseXOR: binop("^", 4),
  bitwiseAND: binop("&", 5),
  equality: binop("==/!=/===/!==", 6),
  relational: binop("</>/<=/>=", 7),
  bitShift: binop("<</>>/>>>", 8),
  plusMin: new TokenType("+/-", {beforeExpr: true, binop: 9, prefix: true, startsExpr: true}),
  modulo: binop("%", 10),
  star: binop("*", 10),
  slash: binop("/", 10),
  starstar: new TokenType("**", {beforeExpr: true}),

  // Keyword token types.
  _break: kw("break"),
  _case: kw("case", beforeExpr),
  _catch: kw("catch"),
  _continue: kw("continue"),
  _debugger: kw("debugger"),
  _default: kw("default", beforeExpr),
  _do: kw("do", {isLoop: true, beforeExpr: true}),
  _else: kw("else", beforeExpr),
  _finally: kw("finally"),
  _for: kw("for", {isLoop: true}),
  _function: kw("function", startsExpr),
  _if: kw("if"),
  _return: kw("return", beforeExpr),
  _switch: kw("switch"),
  _throw: kw("throw", beforeExpr),
  _try: kw("try"),
  _var: kw("var"),
  _const: kw("const"),
  _while: kw("while", {isLoop: true}),
  _with: kw("with"),
  _new: kw("new", {beforeExpr: true, startsExpr: true}),
  _this: kw("this", startsExpr),
  _super: kw("super", startsExpr),
  _class: kw("class", startsExpr),
  _extends: kw("extends", beforeExpr),
  _export: kw("export"),
  _import: kw("import", startsExpr),
  _null: kw("null", startsExpr),
  _true: kw("true", startsExpr),
  _false: kw("false", startsExpr),
  _in: kw("in", {beforeExpr: true, binop: 7}),
  _instanceof: kw("instanceof", {beforeExpr: true, binop: 7}),
  _typeof: kw("typeof", {beforeExpr: true, prefix: true, startsExpr: true}),
  _void: kw("void", {beforeExpr: true, prefix: true, startsExpr: true}),
  _delete: kw("delete", {beforeExpr: true, prefix: true, startsExpr: true})
};

// Matches a whole line break (where CRLF is considered a single
// line break). Used to count lines.

var lineBreak = /\r\n?|\n|\u2028|\u2029/;
var lineBreakG = new RegExp(lineBreak.source, "g");

function isNewLine(code, ecma2019String) {
  return code === 10 || code === 13 || (!ecma2019String && (code === 0x2028 || code === 0x2029))
}

var nonASCIIwhitespace = /[\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff]/;

var skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;

var ref = Object.prototype;
var hasOwnProperty = ref.hasOwnProperty;
var toString = ref.toString;

// Checks if an object has a property.

function has(obj, propName) {
  return hasOwnProperty.call(obj, propName)
}

var isArray = Array.isArray || (function (obj) { return (
  toString.call(obj) === "[object Array]"
); });

function wordsRegexp(words) {
  return new RegExp("^(?:" + words.replace(/ /g, "|") + ")$")
}

// These are used when `options.locations` is on, for the
// `startLoc` and `endLoc` properties.

var Position = function Position(line, col) {
  this.line = line;
  this.column = col;
};

Position.prototype.offset = function offset (n) {
  return new Position(this.line, this.column + n)
};

var SourceLocation = function SourceLocation(p, start, end) {
  this.start = start;
  this.end = end;
  if (p.sourceFile !== null) { this.source = p.sourceFile; }
};

// The `getLineInfo` function is mostly useful when the
// `locations` option is off (for performance reasons) and you
// want to find the line/column position for a given character
// offset. `input` should be the code string that the offset refers
// into.

function getLineInfo(input, offset) {
  for (var line = 1, cur = 0;;) {
    lineBreakG.lastIndex = cur;
    var match = lineBreakG.exec(input);
    if (match && match.index < offset) {
      ++line;
      cur = match.index + match[0].length;
    } else {
      return new Position(line, offset - cur)
    }
  }
}

// A second optional argument can be given to further configure
// the parser process. These options are recognized:

var defaultOptions = {
  // `ecmaVersion` indicates the ECMAScript version to parse. Must be
  // either 3, 5, 6 (2015), 7 (2016), 8 (2017), 9 (2018), or 10
  // (2019). This influences support for strict mode, the set of
  // reserved words, and support for new syntax features. The default
  // is 10.
  ecmaVersion: 10,
  // `sourceType` indicates the mode the code should be parsed in.
  // Can be either `"script"` or `"module"`. This influences global
  // strict mode and parsing of `import` and `export` declarations.
  sourceType: "script",
  // `onInsertedSemicolon` can be a callback that will be called
  // when a semicolon is automatically inserted. It will be passed
  // the position of the comma as an offset, and if `locations` is
  // enabled, it is given the location as a `{line, column}` object
  // as second argument.
  onInsertedSemicolon: null,
  // `onTrailingComma` is similar to `onInsertedSemicolon`, but for
  // trailing commas.
  onTrailingComma: null,
  // By default, reserved words are only enforced if ecmaVersion >= 5.
  // Set `allowReserved` to a boolean value to explicitly turn this on
  // an off. When this option has the value "never", reserved words
  // and keywords can also not be used as property names.
  allowReserved: null,
  // When enabled, a return at the top level is not considered an
  // error.
  allowReturnOutsideFunction: false,
  // When enabled, import/export statements are not constrained to
  // appearing at the top of the program.
  allowImportExportEverywhere: false,
  // When enabled, await identifiers are allowed to appear at the top-level scope,
  // but they are still not allowed in non-async functions.
  allowAwaitOutsideFunction: false,
  // When enabled, hashbang directive in the beginning of file
  // is allowed and treated as a line comment.
  allowHashBang: false,
  // When `locations` is on, `loc` properties holding objects with
  // `start` and `end` properties in `{line, column}` form (with
  // line being 1-based and column 0-based) will be attached to the
  // nodes.
  locations: false,
  // A function can be passed as `onToken` option, which will
  // cause Acorn to call that function with object in the same
  // format as tokens returned from `tokenizer().getToken()`. Note
  // that you are not allowed to call the parser from the
  // callback—that will corrupt its internal state.
  onToken: null,
  // A function can be passed as `onComment` option, which will
  // cause Acorn to call that function with `(block, text, start,
  // end)` parameters whenever a comment is skipped. `block` is a
  // boolean indicating whether this is a block (`/* */`) comment,
  // `text` is the content of the comment, and `start` and `end` are
  // character offsets that denote the start and end of the comment.
  // When the `locations` option is on, two more parameters are
  // passed, the full `{line, column}` locations of the start and
  // end of the comments. Note that you are not allowed to call the
  // parser from the callback—that will corrupt its internal state.
  onComment: null,
  // Nodes have their start and end characters offsets recorded in
  // `start` and `end` properties (directly on the node, rather than
  // the `loc` object, which holds line/column data. To also add a
  // [semi-standardized][range] `range` property holding a `[start,
  // end]` array with the same numbers, set the `ranges` option to
  // `true`.
  //
  // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
  ranges: false,
  // It is possible to parse multiple files into a single AST by
  // passing the tree produced by parsing the first file as
  // `program` option in subsequent parses. This will add the
  // toplevel forms of the parsed file to the `Program` (top) node
  // of an existing parse tree.
  program: null,
  // When `locations` is on, you can pass this to record the source
  // file in every node's `loc` object.
  sourceFile: null,
  // This value, if given, is stored in every node, whether
  // `locations` is on or off.
  directSourceFile: null,
  // When enabled, parenthesized expressions are represented by
  // (non-standard) ParenthesizedExpression nodes
  preserveParens: false
};

// Interpret and default an options object

function getOptions(opts) {
  var options = {};

  for (var opt in defaultOptions)
    { options[opt] = opts && has(opts, opt) ? opts[opt] : defaultOptions[opt]; }

  if (options.ecmaVersion >= 2015)
    { options.ecmaVersion -= 2009; }

  if (options.allowReserved == null)
    { options.allowReserved = options.ecmaVersion < 5; }

  if (isArray(options.onToken)) {
    var tokens = options.onToken;
    options.onToken = function (token) { return tokens.push(token); };
  }
  if (isArray(options.onComment))
    { options.onComment = pushComment(options, options.onComment); }

  return options
}

function pushComment(options, array) {
  return function(block, text, start, end, startLoc, endLoc) {
    var comment = {
      type: block ? "Block" : "Line",
      value: text,
      start: start,
      end: end
    };
    if (options.locations)
      { comment.loc = new SourceLocation(this, startLoc, endLoc); }
    if (options.ranges)
      { comment.range = [start, end]; }
    array.push(comment);
  }
}

// Each scope gets a bitset that may contain these flags
var
    SCOPE_TOP = 1,
    SCOPE_FUNCTION = 2,
    SCOPE_VAR = SCOPE_TOP | SCOPE_FUNCTION,
    SCOPE_ASYNC = 4,
    SCOPE_GENERATOR = 8,
    SCOPE_ARROW = 16,
    SCOPE_SIMPLE_CATCH = 32,
    SCOPE_SUPER = 64,
    SCOPE_DIRECT_SUPER = 128;

function functionFlags(async, generator) {
  return SCOPE_FUNCTION | (async ? SCOPE_ASYNC : 0) | (generator ? SCOPE_GENERATOR : 0)
}

// Used in checkLVal and declareName to determine the type of a binding
var
    BIND_NONE = 0, // Not a binding
    BIND_VAR = 1, // Var-style binding
    BIND_LEXICAL = 2, // Let- or const-style binding
    BIND_FUNCTION = 3, // Function declaration
    BIND_SIMPLE_CATCH = 4, // Simple (identifier pattern) catch binding
    BIND_OUTSIDE = 5; // Special case for function names as bound inside the function

var Parser = function Parser(options, input, startPos) {
  this.options = options = getOptions(options);
  this.sourceFile = options.sourceFile;
  this.keywords = wordsRegexp(keywords[options.ecmaVersion >= 6 ? 6 : options.sourceType === "module" ? "5module" : 5]);
  var reserved = "";
  if (options.allowReserved !== true) {
    for (var v = options.ecmaVersion;; v--)
      { if (reserved = reservedWords[v]) { break } }
    if (options.sourceType === "module") { reserved += " await"; }
  }
  this.reservedWords = wordsRegexp(reserved);
  var reservedStrict = (reserved ? reserved + " " : "") + reservedWords.strict;
  this.reservedWordsStrict = wordsRegexp(reservedStrict);
  this.reservedWordsStrictBind = wordsRegexp(reservedStrict + " " + reservedWords.strictBind);
  this.input = String(input);

  // Used to signal to callers of `readWord1` whether the word
  // contained any escape sequences. This is needed because words with
  // escape sequences must not be interpreted as keywords.
  this.containsEsc = false;

  // Set up token state

  // The current position of the tokenizer in the input.
  if (startPos) {
    this.pos = startPos;
    this.lineStart = this.input.lastIndexOf("\n", startPos - 1) + 1;
    this.curLine = this.input.slice(0, this.lineStart).split(lineBreak).length;
  } else {
    this.pos = this.lineStart = 0;
    this.curLine = 1;
  }

  // Properties of the current token:
  // Its type
  this.type = types.eof;
  // For tokens that include more information than their type, the value
  this.value = null;
  // Its start and end offset
  this.start = this.end = this.pos;
  // And, if locations are used, the {line, column} object
  // corresponding to those offsets
  this.startLoc = this.endLoc = this.curPosition();

  // Position information for the previous token
  this.lastTokEndLoc = this.lastTokStartLoc = null;
  this.lastTokStart = this.lastTokEnd = this.pos;

  // The context stack is used to superficially track syntactic
  // context to predict whether a regular expression is allowed in a
  // given position.
  this.context = this.initialContext();
  this.exprAllowed = true;

  // Figure out if it's a module code.
  this.inModule = options.sourceType === "module";
  this.strict = this.inModule || this.strictDirective(this.pos);

  // Used to signify the start of a potential arrow function
  this.potentialArrowAt = -1;

  // Positions to delayed-check that yield/await does not exist in default parameters.
  this.yieldPos = this.awaitPos = this.awaitIdentPos = 0;
  // Labels in scope.
  this.labels = [];
  // Thus-far undefined exports.
  this.undefinedExports = {};

  // If enabled, skip leading hashbang line.
  if (this.pos === 0 && options.allowHashBang && this.input.slice(0, 2) === "#!")
    { this.skipLineComment(2); }

  // Scope tracking for duplicate variable names (see scope.js)
  this.scopeStack = [];
  this.enterScope(SCOPE_TOP);

  // For RegExp validation
  this.regexpState = null;
};

var prototypeAccessors = { inFunction: { configurable: true },inGenerator: { configurable: true },inAsync: { configurable: true },allowSuper: { configurable: true },allowDirectSuper: { configurable: true },treatFunctionsAsVar: { configurable: true } };

Parser.prototype.parse = function parse () {
  var node = this.options.program || this.startNode();
  this.nextToken();
  return this.parseTopLevel(node)
};

prototypeAccessors.inFunction.get = function () { return (this.currentVarScope().flags & SCOPE_FUNCTION) > 0 };
prototypeAccessors.inGenerator.get = function () { return (this.currentVarScope().flags & SCOPE_GENERATOR) > 0 };
prototypeAccessors.inAsync.get = function () { return (this.currentVarScope().flags & SCOPE_ASYNC) > 0 };
prototypeAccessors.allowSuper.get = function () { return (this.currentThisScope().flags & SCOPE_SUPER) > 0 };
prototypeAccessors.allowDirectSuper.get = function () { return (this.currentThisScope().flags & SCOPE_DIRECT_SUPER) > 0 };
prototypeAccessors.treatFunctionsAsVar.get = function () { return this.treatFunctionsAsVarInScope(this.currentScope()) };

// Switch to a getter for 7.0.0.
Parser.prototype.inNonArrowFunction = function inNonArrowFunction () { return (this.currentThisScope().flags & SCOPE_FUNCTION) > 0 };

Parser.extend = function extend () {
    var plugins = [], len = arguments.length;
    while ( len-- ) plugins[ len ] = arguments[ len ];

  var cls = this;
  for (var i = 0; i < plugins.length; i++) { cls = plugins[i](cls); }
  return cls
};

Parser.parse = function parse (input, options) {
  return new this(options, input).parse()
};

Parser.parseExpressionAt = function parseExpressionAt (input, pos, options) {
  var parser = new this(options, input, pos);
  parser.nextToken();
  return parser.parseExpression()
};

Parser.tokenizer = function tokenizer (input, options) {
  return new this(options, input)
};

Object.defineProperties( Parser.prototype, prototypeAccessors );

var pp = Parser.prototype;

// ## Parser utilities

var literal = /^(?:'((?:\\.|[^'])*?)'|"((?:\\.|[^"])*?)")/;
pp.strictDirective = function(start) {
  for (;;) {
    // Try to find string literal.
    skipWhiteSpace.lastIndex = start;
    start += skipWhiteSpace.exec(this.input)[0].length;
    var match = literal.exec(this.input.slice(start));
    if (!match) { return false }
    if ((match[1] || match[2]) === "use strict") { return true }
    start += match[0].length;

    // Skip semicolon, if any.
    skipWhiteSpace.lastIndex = start;
    start += skipWhiteSpace.exec(this.input)[0].length;
    if (this.input[start] === ";")
      { start++; }
  }
};

// Predicate that tests whether the next token is of the given
// type, and if yes, consumes it as a side effect.

pp.eat = function(type) {
  if (this.type === type) {
    this.next();
    return true
  } else {
    return false
  }
};

// Tests whether parsed token is a contextual keyword.

pp.isContextual = function(name) {
  return this.type === types.name && this.value === name && !this.containsEsc
};

// Consumes contextual keyword if possible.

pp.eatContextual = function(name) {
  if (!this.isContextual(name)) { return false }
  this.next();
  return true
};

// Asserts that following token is given contextual keyword.

pp.expectContextual = function(name) {
  if (!this.eatContextual(name)) { this.unexpected(); }
};

// Test whether a semicolon can be inserted at the current position.

pp.canInsertSemicolon = function() {
  return this.type === types.eof ||
    this.type === types.braceR ||
    lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
};

pp.insertSemicolon = function() {
  if (this.canInsertSemicolon()) {
    if (this.options.onInsertedSemicolon)
      { this.options.onInsertedSemicolon(this.lastTokEnd, this.lastTokEndLoc); }
    return true
  }
};

// Consume a semicolon, or, failing that, see if we are allowed to
// pretend that there is a semicolon at this position.

pp.semicolon = function() {
  if (!this.eat(types.semi) && !this.insertSemicolon()) { this.unexpected(); }
};

pp.afterTrailingComma = function(tokType, notNext) {
  if (this.type === tokType) {
    if (this.options.onTrailingComma)
      { this.options.onTrailingComma(this.lastTokStart, this.lastTokStartLoc); }
    if (!notNext)
      { this.next(); }
    return true
  }
};

// Expect a token of a given type. If found, consume it, otherwise,
// raise an unexpected token error.

pp.expect = function(type) {
  this.eat(type) || this.unexpected();
};

// Raise an unexpected token error.

pp.unexpected = function(pos) {
  this.raise(pos != null ? pos : this.start, "Unexpected token");
};

function DestructuringErrors() {
  this.shorthandAssign =
  this.trailingComma =
  this.parenthesizedAssign =
  this.parenthesizedBind =
  this.doubleProto =
    -1;
}

pp.checkPatternErrors = function(refDestructuringErrors, isAssign) {
  if (!refDestructuringErrors) { return }
  if (refDestructuringErrors.trailingComma > -1)
    { this.raiseRecoverable(refDestructuringErrors.trailingComma, "Comma is not permitted after the rest element"); }
  var parens = isAssign ? refDestructuringErrors.parenthesizedAssign : refDestructuringErrors.parenthesizedBind;
  if (parens > -1) { this.raiseRecoverable(parens, "Parenthesized pattern"); }
};

pp.checkExpressionErrors = function(refDestructuringErrors, andThrow) {
  if (!refDestructuringErrors) { return false }
  var shorthandAssign = refDestructuringErrors.shorthandAssign;
  var doubleProto = refDestructuringErrors.doubleProto;
  if (!andThrow) { return shorthandAssign >= 0 || doubleProto >= 0 }
  if (shorthandAssign >= 0)
    { this.raise(shorthandAssign, "Shorthand property assignments are valid only in destructuring patterns"); }
  if (doubleProto >= 0)
    { this.raiseRecoverable(doubleProto, "Redefinition of __proto__ property"); }
};

pp.checkYieldAwaitInDefaultParams = function() {
  if (this.yieldPos && (!this.awaitPos || this.yieldPos < this.awaitPos))
    { this.raise(this.yieldPos, "Yield expression cannot be a default value"); }
  if (this.awaitPos)
    { this.raise(this.awaitPos, "Await expression cannot be a default value"); }
};

pp.isSimpleAssignTarget = function(expr) {
  if (expr.type === "ParenthesizedExpression")
    { return this.isSimpleAssignTarget(expr.expression) }
  return expr.type === "Identifier" || expr.type === "MemberExpression"
};

var pp$1 = Parser.prototype;

// ### Statement parsing

// Parse a program. Initializes the parser, reads any number of
// statements, and wraps them in a Program node.  Optionally takes a
// `program` argument.  If present, the statements will be appended
// to its body instead of creating a new node.

pp$1.parseTopLevel = function(node) {
  var exports = {};
  if (!node.body) { node.body = []; }
  while (this.type !== types.eof) {
    var stmt = this.parseStatement(null, true, exports);
    node.body.push(stmt);
  }
  if (this.inModule)
    { for (var i = 0, list = Object.keys(this.undefinedExports); i < list.length; i += 1)
      {
        var name = list[i];

        this.raiseRecoverable(this.undefinedExports[name].start, ("Export '" + name + "' is not defined"));
      } }
  this.adaptDirectivePrologue(node.body);
  this.next();
  node.sourceType = this.options.sourceType;
  return this.finishNode(node, "Program")
};

var loopLabel = {kind: "loop"}, switchLabel = {kind: "switch"};

pp$1.isLet = function(context) {
  if (this.options.ecmaVersion < 6 || !this.isContextual("let")) { return false }
  skipWhiteSpace.lastIndex = this.pos;
  var skip = skipWhiteSpace.exec(this.input);
  var next = this.pos + skip[0].length, nextCh = this.input.charCodeAt(next);
  // For ambiguous cases, determine if a LexicalDeclaration (or only a
  // Statement) is allowed here. If context is not empty then only a Statement
  // is allowed. However, `let [` is an explicit negative lookahead for
  // ExpressionStatement, so special-case it first.
  if (nextCh === 91) { return true } // '['
  if (context) { return false }

  if (nextCh === 123) { return true } // '{'
  if (isIdentifierStart(nextCh, true)) {
    var pos = next + 1;
    while (isIdentifierChar(this.input.charCodeAt(pos), true)) { ++pos; }
    var ident = this.input.slice(next, pos);
    if (!keywordRelationalOperator.test(ident)) { return true }
  }
  return false
};

// check 'async [no LineTerminator here] function'
// - 'async /*foo*/ function' is OK.
// - 'async /*\n*/ function' is invalid.
pp$1.isAsyncFunction = function() {
  if (this.options.ecmaVersion < 8 || !this.isContextual("async"))
    { return false }

  skipWhiteSpace.lastIndex = this.pos;
  var skip = skipWhiteSpace.exec(this.input);
  var next = this.pos + skip[0].length;
  return !lineBreak.test(this.input.slice(this.pos, next)) &&
    this.input.slice(next, next + 8) === "function" &&
    (next + 8 === this.input.length || !isIdentifierChar(this.input.charAt(next + 8)))
};

// Parse a single statement.
//
// If expecting a statement and finding a slash operator, parse a
// regular expression literal. This is to handle cases like
// `if (foo) /blah/.exec(foo)`, where looking at the previous token
// does not help.

pp$1.parseStatement = function(context, topLevel, exports) {
  var starttype = this.type, node = this.startNode(), kind;

  if (this.isLet(context)) {
    starttype = types._var;
    kind = "let";
  }

  // Most types of statements are recognized by the keyword they
  // start with. Many are trivial to parse, some require a bit of
  // complexity.

  switch (starttype) {
  case types._break: case types._continue: return this.parseBreakContinueStatement(node, starttype.keyword)
  case types._debugger: return this.parseDebuggerStatement(node)
  case types._do: return this.parseDoStatement(node)
  case types._for: return this.parseForStatement(node)
  case types._function:
    // Function as sole body of either an if statement or a labeled statement
    // works, but not when it is part of a labeled statement that is the sole
    // body of an if statement.
    if ((context && (this.strict || context !== "if" && context !== "label")) && this.options.ecmaVersion >= 6) { this.unexpected(); }
    return this.parseFunctionStatement(node, false, !context)
  case types._class:
    if (context) { this.unexpected(); }
    return this.parseClass(node, true)
  case types._if: return this.parseIfStatement(node)
  case types._return: return this.parseReturnStatement(node)
  case types._switch: return this.parseSwitchStatement(node)
  case types._throw: return this.parseThrowStatement(node)
  case types._try: return this.parseTryStatement(node)
  case types._const: case types._var:
    kind = kind || this.value;
    if (context && kind !== "var") { this.unexpected(); }
    return this.parseVarStatement(node, kind)
  case types._while: return this.parseWhileStatement(node)
  case types._with: return this.parseWithStatement(node)
  case types.braceL: return this.parseBlock(true, node)
  case types.semi: return this.parseEmptyStatement(node)
  case types._export:
  case types._import:
    if (this.options.ecmaVersion > 10 && starttype === types._import) {
      skipWhiteSpace.lastIndex = this.pos;
      var skip = skipWhiteSpace.exec(this.input);
      var next = this.pos + skip[0].length, nextCh = this.input.charCodeAt(next);
      if (nextCh === 40) // '('
        { return this.parseExpressionStatement(node, this.parseExpression()) }
    }

    if (!this.options.allowImportExportEverywhere) {
      if (!topLevel)
        { this.raise(this.start, "'import' and 'export' may only appear at the top level"); }
      if (!this.inModule)
        { this.raise(this.start, "'import' and 'export' may appear only with 'sourceType: module'"); }
    }
    return starttype === types._import ? this.parseImport(node) : this.parseExport(node, exports)

    // If the statement does not start with a statement keyword or a
    // brace, it's an ExpressionStatement or LabeledStatement. We
    // simply start parsing an expression, and afterwards, if the
    // next token is a colon and the expression was a simple
    // Identifier node, we switch to interpreting it as a label.
  default:
    if (this.isAsyncFunction()) {
      if (context) { this.unexpected(); }
      this.next();
      return this.parseFunctionStatement(node, true, !context)
    }

    var maybeName = this.value, expr = this.parseExpression();
    if (starttype === types.name && expr.type === "Identifier" && this.eat(types.colon))
      { return this.parseLabeledStatement(node, maybeName, expr, context) }
    else { return this.parseExpressionStatement(node, expr) }
  }
};

pp$1.parseBreakContinueStatement = function(node, keyword) {
  var isBreak = keyword === "break";
  this.next();
  if (this.eat(types.semi) || this.insertSemicolon()) { node.label = null; }
  else if (this.type !== types.name) { this.unexpected(); }
  else {
    node.label = this.parseIdent();
    this.semicolon();
  }

  // Verify that there is an actual destination to break or
  // continue to.
  var i = 0;
  for (; i < this.labels.length; ++i) {
    var lab = this.labels[i];
    if (node.label == null || lab.name === node.label.name) {
      if (lab.kind != null && (isBreak || lab.kind === "loop")) { break }
      if (node.label && isBreak) { break }
    }
  }
  if (i === this.labels.length) { this.raise(node.start, "Unsyntactic " + keyword); }
  return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement")
};

pp$1.parseDebuggerStatement = function(node) {
  this.next();
  this.semicolon();
  return this.finishNode(node, "DebuggerStatement")
};

pp$1.parseDoStatement = function(node) {
  this.next();
  this.labels.push(loopLabel);
  node.body = this.parseStatement("do");
  this.labels.pop();
  this.expect(types._while);
  node.test = this.parseParenExpression();
  if (this.options.ecmaVersion >= 6)
    { this.eat(types.semi); }
  else
    { this.semicolon(); }
  return this.finishNode(node, "DoWhileStatement")
};

// Disambiguating between a `for` and a `for`/`in` or `for`/`of`
// loop is non-trivial. Basically, we have to parse the init `var`
// statement or expression, disallowing the `in` operator (see
// the second parameter to `parseExpression`), and then check
// whether the next token is `in` or `of`. When there is no init
// part (semicolon immediately after the opening parenthesis), it
// is a regular `for` loop.

pp$1.parseForStatement = function(node) {
  this.next();
  var awaitAt = (this.options.ecmaVersion >= 9 && (this.inAsync || (!this.inFunction && this.options.allowAwaitOutsideFunction)) && this.eatContextual("await")) ? this.lastTokStart : -1;
  this.labels.push(loopLabel);
  this.enterScope(0);
  this.expect(types.parenL);
  if (this.type === types.semi) {
    if (awaitAt > -1) { this.unexpected(awaitAt); }
    return this.parseFor(node, null)
  }
  var isLet = this.isLet();
  if (this.type === types._var || this.type === types._const || isLet) {
    var init$1 = this.startNode(), kind = isLet ? "let" : this.value;
    this.next();
    this.parseVar(init$1, true, kind);
    this.finishNode(init$1, "VariableDeclaration");
    if ((this.type === types._in || (this.options.ecmaVersion >= 6 && this.isContextual("of"))) && init$1.declarations.length === 1) {
      if (this.options.ecmaVersion >= 9) {
        if (this.type === types._in) {
          if (awaitAt > -1) { this.unexpected(awaitAt); }
        } else { node.await = awaitAt > -1; }
      }
      return this.parseForIn(node, init$1)
    }
    if (awaitAt > -1) { this.unexpected(awaitAt); }
    return this.parseFor(node, init$1)
  }
  var refDestructuringErrors = new DestructuringErrors;
  var init = this.parseExpression(true, refDestructuringErrors);
  if (this.type === types._in || (this.options.ecmaVersion >= 6 && this.isContextual("of"))) {
    if (this.options.ecmaVersion >= 9) {
      if (this.type === types._in) {
        if (awaitAt > -1) { this.unexpected(awaitAt); }
      } else { node.await = awaitAt > -1; }
    }
    this.toAssignable(init, false, refDestructuringErrors);
    this.checkLVal(init);
    return this.parseForIn(node, init)
  } else {
    this.checkExpressionErrors(refDestructuringErrors, true);
  }
  if (awaitAt > -1) { this.unexpected(awaitAt); }
  return this.parseFor(node, init)
};

pp$1.parseFunctionStatement = function(node, isAsync, declarationPosition) {
  this.next();
  return this.parseFunction(node, FUNC_STATEMENT | (declarationPosition ? 0 : FUNC_HANGING_STATEMENT), false, isAsync)
};

pp$1.parseIfStatement = function(node) {
  this.next();
  node.test = this.parseParenExpression();
  // allow function declarations in branches, but only in non-strict mode
  node.consequent = this.parseStatement("if");
  node.alternate = this.eat(types._else) ? this.parseStatement("if") : null;
  return this.finishNode(node, "IfStatement")
};

pp$1.parseReturnStatement = function(node) {
  if (!this.inFunction && !this.options.allowReturnOutsideFunction)
    { this.raise(this.start, "'return' outside of function"); }
  this.next();

  // In `return` (and `break`/`continue`), the keywords with
  // optional arguments, we eagerly look for a semicolon or the
  // possibility to insert one.

  if (this.eat(types.semi) || this.insertSemicolon()) { node.argument = null; }
  else { node.argument = this.parseExpression(); this.semicolon(); }
  return this.finishNode(node, "ReturnStatement")
};

pp$1.parseSwitchStatement = function(node) {
  this.next();
  node.discriminant = this.parseParenExpression();
  node.cases = [];
  this.expect(types.braceL);
  this.labels.push(switchLabel);
  this.enterScope(0);

  // Statements under must be grouped (by label) in SwitchCase
  // nodes. `cur` is used to keep the node that we are currently
  // adding statements to.

  var cur;
  for (var sawDefault = false; this.type !== types.braceR;) {
    if (this.type === types._case || this.type === types._default) {
      var isCase = this.type === types._case;
      if (cur) { this.finishNode(cur, "SwitchCase"); }
      node.cases.push(cur = this.startNode());
      cur.consequent = [];
      this.next();
      if (isCase) {
        cur.test = this.parseExpression();
      } else {
        if (sawDefault) { this.raiseRecoverable(this.lastTokStart, "Multiple default clauses"); }
        sawDefault = true;
        cur.test = null;
      }
      this.expect(types.colon);
    } else {
      if (!cur) { this.unexpected(); }
      cur.consequent.push(this.parseStatement(null));
    }
  }
  this.exitScope();
  if (cur) { this.finishNode(cur, "SwitchCase"); }
  this.next(); // Closing brace
  this.labels.pop();
  return this.finishNode(node, "SwitchStatement")
};

pp$1.parseThrowStatement = function(node) {
  this.next();
  if (lineBreak.test(this.input.slice(this.lastTokEnd, this.start)))
    { this.raise(this.lastTokEnd, "Illegal newline after throw"); }
  node.argument = this.parseExpression();
  this.semicolon();
  return this.finishNode(node, "ThrowStatement")
};

// Reused empty array added for node fields that are always empty.

var empty = [];

pp$1.parseTryStatement = function(node) {
  this.next();
  node.block = this.parseBlock();
  node.handler = null;
  if (this.type === types._catch) {
    var clause = this.startNode();
    this.next();
    if (this.eat(types.parenL)) {
      clause.param = this.parseBindingAtom();
      var simple = clause.param.type === "Identifier";
      this.enterScope(simple ? SCOPE_SIMPLE_CATCH : 0);
      this.checkLVal(clause.param, simple ? BIND_SIMPLE_CATCH : BIND_LEXICAL);
      this.expect(types.parenR);
    } else {
      if (this.options.ecmaVersion < 10) { this.unexpected(); }
      clause.param = null;
      this.enterScope(0);
    }
    clause.body = this.parseBlock(false);
    this.exitScope();
    node.handler = this.finishNode(clause, "CatchClause");
  }
  node.finalizer = this.eat(types._finally) ? this.parseBlock() : null;
  if (!node.handler && !node.finalizer)
    { this.raise(node.start, "Missing catch or finally clause"); }
  return this.finishNode(node, "TryStatement")
};

pp$1.parseVarStatement = function(node, kind) {
  this.next();
  this.parseVar(node, false, kind);
  this.semicolon();
  return this.finishNode(node, "VariableDeclaration")
};

pp$1.parseWhileStatement = function(node) {
  this.next();
  node.test = this.parseParenExpression();
  this.labels.push(loopLabel);
  node.body = this.parseStatement("while");
  this.labels.pop();
  return this.finishNode(node, "WhileStatement")
};

pp$1.parseWithStatement = function(node) {
  if (this.strict) { this.raise(this.start, "'with' in strict mode"); }
  this.next();
  node.object = this.parseParenExpression();
  node.body = this.parseStatement("with");
  return this.finishNode(node, "WithStatement")
};

pp$1.parseEmptyStatement = function(node) {
  this.next();
  return this.finishNode(node, "EmptyStatement")
};

pp$1.parseLabeledStatement = function(node, maybeName, expr, context) {
  for (var i$1 = 0, list = this.labels; i$1 < list.length; i$1 += 1)
    {
    var label = list[i$1];

    if (label.name === maybeName)
      { this.raise(expr.start, "Label '" + maybeName + "' is already declared");
  } }
  var kind = this.type.isLoop ? "loop" : this.type === types._switch ? "switch" : null;
  for (var i = this.labels.length - 1; i >= 0; i--) {
    var label$1 = this.labels[i];
    if (label$1.statementStart === node.start) {
      // Update information about previous labels on this node
      label$1.statementStart = this.start;
      label$1.kind = kind;
    } else { break }
  }
  this.labels.push({name: maybeName, kind: kind, statementStart: this.start});
  node.body = this.parseStatement(context ? context.indexOf("label") === -1 ? context + "label" : context : "label");
  this.labels.pop();
  node.label = expr;
  return this.finishNode(node, "LabeledStatement")
};

pp$1.parseExpressionStatement = function(node, expr) {
  node.expression = expr;
  this.semicolon();
  return this.finishNode(node, "ExpressionStatement")
};

// Parse a semicolon-enclosed block of statements, handling `"use
// strict"` declarations when `allowStrict` is true (used for
// function bodies).

pp$1.parseBlock = function(createNewLexicalScope, node) {
  if ( createNewLexicalScope === void 0 ) createNewLexicalScope = true;
  if ( node === void 0 ) node = this.startNode();

  node.body = [];
  this.expect(types.braceL);
  if (createNewLexicalScope) { this.enterScope(0); }
  while (!this.eat(types.braceR)) {
    var stmt = this.parseStatement(null);
    node.body.push(stmt);
  }
  if (createNewLexicalScope) { this.exitScope(); }
  return this.finishNode(node, "BlockStatement")
};

// Parse a regular `for` loop. The disambiguation code in
// `parseStatement` will already have parsed the init statement or
// expression.

pp$1.parseFor = function(node, init) {
  node.init = init;
  this.expect(types.semi);
  node.test = this.type === types.semi ? null : this.parseExpression();
  this.expect(types.semi);
  node.update = this.type === types.parenR ? null : this.parseExpression();
  this.expect(types.parenR);
  node.body = this.parseStatement("for");
  this.exitScope();
  this.labels.pop();
  return this.finishNode(node, "ForStatement")
};

// Parse a `for`/`in` and `for`/`of` loop, which are almost
// same from parser's perspective.

pp$1.parseForIn = function(node, init) {
  var isForIn = this.type === types._in;
  this.next();

  if (
    init.type === "VariableDeclaration" &&
    init.declarations[0].init != null &&
    (
      !isForIn ||
      this.options.ecmaVersion < 8 ||
      this.strict ||
      init.kind !== "var" ||
      init.declarations[0].id.type !== "Identifier"
    )
  ) {
    this.raise(
      init.start,
      ((isForIn ? "for-in" : "for-of") + " loop variable declaration may not have an initializer")
    );
  } else if (init.type === "AssignmentPattern") {
    this.raise(init.start, "Invalid left-hand side in for-loop");
  }
  node.left = init;
  node.right = isForIn ? this.parseExpression() : this.parseMaybeAssign();
  this.expect(types.parenR);
  node.body = this.parseStatement("for");
  this.exitScope();
  this.labels.pop();
  return this.finishNode(node, isForIn ? "ForInStatement" : "ForOfStatement")
};

// Parse a list of variable declarations.

pp$1.parseVar = function(node, isFor, kind) {
  node.declarations = [];
  node.kind = kind;
  for (;;) {
    var decl = this.startNode();
    this.parseVarId(decl, kind);
    if (this.eat(types.eq)) {
      decl.init = this.parseMaybeAssign(isFor);
    } else if (kind === "const" && !(this.type === types._in || (this.options.ecmaVersion >= 6 && this.isContextual("of")))) {
      this.unexpected();
    } else if (decl.id.type !== "Identifier" && !(isFor && (this.type === types._in || this.isContextual("of")))) {
      this.raise(this.lastTokEnd, "Complex binding patterns require an initialization value");
    } else {
      decl.init = null;
    }
    node.declarations.push(this.finishNode(decl, "VariableDeclarator"));
    if (!this.eat(types.comma)) { break }
  }
  return node
};

pp$1.parseVarId = function(decl, kind) {
  decl.id = this.parseBindingAtom();
  this.checkLVal(decl.id, kind === "var" ? BIND_VAR : BIND_LEXICAL, false);
};

var FUNC_STATEMENT = 1, FUNC_HANGING_STATEMENT = 2, FUNC_NULLABLE_ID = 4;

// Parse a function declaration or literal (depending on the
// `statement & FUNC_STATEMENT`).

// Remove `allowExpressionBody` for 7.0.0, as it is only called with false
pp$1.parseFunction = function(node, statement, allowExpressionBody, isAsync) {
  this.initFunction(node);
  if (this.options.ecmaVersion >= 9 || this.options.ecmaVersion >= 6 && !isAsync) {
    if (this.type === types.star && (statement & FUNC_HANGING_STATEMENT))
      { this.unexpected(); }
    node.generator = this.eat(types.star);
  }
  if (this.options.ecmaVersion >= 8)
    { node.async = !!isAsync; }

  if (statement & FUNC_STATEMENT) {
    node.id = (statement & FUNC_NULLABLE_ID) && this.type !== types.name ? null : this.parseIdent();
    if (node.id && !(statement & FUNC_HANGING_STATEMENT))
      // If it is a regular function declaration in sloppy mode, then it is
      // subject to Annex B semantics (BIND_FUNCTION). Otherwise, the binding
      // mode depends on properties of the current scope (see
      // treatFunctionsAsVar).
      { this.checkLVal(node.id, (this.strict || node.generator || node.async) ? this.treatFunctionsAsVar ? BIND_VAR : BIND_LEXICAL : BIND_FUNCTION); }
  }

  var oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
  this.yieldPos = 0;
  this.awaitPos = 0;
  this.awaitIdentPos = 0;
  this.enterScope(functionFlags(node.async, node.generator));

  if (!(statement & FUNC_STATEMENT))
    { node.id = this.type === types.name ? this.parseIdent() : null; }

  this.parseFunctionParams(node);
  this.parseFunctionBody(node, allowExpressionBody, false);

  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.awaitIdentPos = oldAwaitIdentPos;
  return this.finishNode(node, (statement & FUNC_STATEMENT) ? "FunctionDeclaration" : "FunctionExpression")
};

pp$1.parseFunctionParams = function(node) {
  this.expect(types.parenL);
  node.params = this.parseBindingList(types.parenR, false, this.options.ecmaVersion >= 8);
  this.checkYieldAwaitInDefaultParams();
};

// Parse a class declaration or literal (depending on the
// `isStatement` parameter).

pp$1.parseClass = function(node, isStatement) {
  this.next();

  // ecma-262 14.6 Class Definitions
  // A class definition is always strict mode code.
  var oldStrict = this.strict;
  this.strict = true;

  this.parseClassId(node, isStatement);
  this.parseClassSuper(node);
  var classBody = this.startNode();
  var hadConstructor = false;
  classBody.body = [];
  this.expect(types.braceL);
  while (!this.eat(types.braceR)) {
    var element = this.parseClassElement(node.superClass !== null);
    if (element) {
      classBody.body.push(element);
      if (element.type === "MethodDefinition" && element.kind === "constructor") {
        if (hadConstructor) { this.raise(element.start, "Duplicate constructor in the same class"); }
        hadConstructor = true;
      }
    }
  }
  node.body = this.finishNode(classBody, "ClassBody");
  this.strict = oldStrict;
  return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression")
};

pp$1.parseClassElement = function(constructorAllowsSuper) {
  var this$1 = this;

  if (this.eat(types.semi)) { return null }

  var method = this.startNode();
  var tryContextual = function (k, noLineBreak) {
    if ( noLineBreak === void 0 ) noLineBreak = false;

    var start = this$1.start, startLoc = this$1.startLoc;
    if (!this$1.eatContextual(k)) { return false }
    if (this$1.type !== types.parenL && (!noLineBreak || !this$1.canInsertSemicolon())) { return true }
    if (method.key) { this$1.unexpected(); }
    method.computed = false;
    method.key = this$1.startNodeAt(start, startLoc);
    method.key.name = k;
    this$1.finishNode(method.key, "Identifier");
    return false
  };

  method.kind = "method";
  method.static = tryContextual("static");
  var isGenerator = this.eat(types.star);
  var isAsync = false;
  if (!isGenerator) {
    if (this.options.ecmaVersion >= 8 && tryContextual("async", true)) {
      isAsync = true;
      isGenerator = this.options.ecmaVersion >= 9 && this.eat(types.star);
    } else if (tryContextual("get")) {
      method.kind = "get";
    } else if (tryContextual("set")) {
      method.kind = "set";
    }
  }
  if (!method.key) { this.parsePropertyName(method); }
  var key = method.key;
  var allowsDirectSuper = false;
  if (!method.computed && !method.static && (key.type === "Identifier" && key.name === "constructor" ||
      key.type === "Literal" && key.value === "constructor")) {
    if (method.kind !== "method") { this.raise(key.start, "Constructor can't have get/set modifier"); }
    if (isGenerator) { this.raise(key.start, "Constructor can't be a generator"); }
    if (isAsync) { this.raise(key.start, "Constructor can't be an async method"); }
    method.kind = "constructor";
    allowsDirectSuper = constructorAllowsSuper;
  } else if (method.static && key.type === "Identifier" && key.name === "prototype") {
    this.raise(key.start, "Classes may not have a static property named prototype");
  }
  this.parseClassMethod(method, isGenerator, isAsync, allowsDirectSuper);
  if (method.kind === "get" && method.value.params.length !== 0)
    { this.raiseRecoverable(method.value.start, "getter should have no params"); }
  if (method.kind === "set" && method.value.params.length !== 1)
    { this.raiseRecoverable(method.value.start, "setter should have exactly one param"); }
  if (method.kind === "set" && method.value.params[0].type === "RestElement")
    { this.raiseRecoverable(method.value.params[0].start, "Setter cannot use rest params"); }
  return method
};

pp$1.parseClassMethod = function(method, isGenerator, isAsync, allowsDirectSuper) {
  method.value = this.parseMethod(isGenerator, isAsync, allowsDirectSuper);
  return this.finishNode(method, "MethodDefinition")
};

pp$1.parseClassId = function(node, isStatement) {
  if (this.type === types.name) {
    node.id = this.parseIdent();
    if (isStatement)
      { this.checkLVal(node.id, BIND_LEXICAL, false); }
  } else {
    if (isStatement === true)
      { this.unexpected(); }
    node.id = null;
  }
};

pp$1.parseClassSuper = function(node) {
  node.superClass = this.eat(types._extends) ? this.parseExprSubscripts() : null;
};

// Parses module export declaration.

pp$1.parseExport = function(node, exports) {
  this.next();
  // export * from '...'
  if (this.eat(types.star)) {
    this.expectContextual("from");
    if (this.type !== types.string) { this.unexpected(); }
    node.source = this.parseExprAtom();
    this.semicolon();
    return this.finishNode(node, "ExportAllDeclaration")
  }
  if (this.eat(types._default)) { // export default ...
    this.checkExport(exports, "default", this.lastTokStart);
    var isAsync;
    if (this.type === types._function || (isAsync = this.isAsyncFunction())) {
      var fNode = this.startNode();
      this.next();
      if (isAsync) { this.next(); }
      node.declaration = this.parseFunction(fNode, FUNC_STATEMENT | FUNC_NULLABLE_ID, false, isAsync);
    } else if (this.type === types._class) {
      var cNode = this.startNode();
      node.declaration = this.parseClass(cNode, "nullableID");
    } else {
      node.declaration = this.parseMaybeAssign();
      this.semicolon();
    }
    return this.finishNode(node, "ExportDefaultDeclaration")
  }
  // export var|const|let|function|class ...
  if (this.shouldParseExportStatement()) {
    node.declaration = this.parseStatement(null);
    if (node.declaration.type === "VariableDeclaration")
      { this.checkVariableExport(exports, node.declaration.declarations); }
    else
      { this.checkExport(exports, node.declaration.id.name, node.declaration.id.start); }
    node.specifiers = [];
    node.source = null;
  } else { // export { x, y as z } [from '...']
    node.declaration = null;
    node.specifiers = this.parseExportSpecifiers(exports);
    if (this.eatContextual("from")) {
      if (this.type !== types.string) { this.unexpected(); }
      node.source = this.parseExprAtom();
    } else {
      for (var i = 0, list = node.specifiers; i < list.length; i += 1) {
        // check for keywords used as local names
        var spec = list[i];

        this.checkUnreserved(spec.local);
        // check if export is defined
        this.checkLocalExport(spec.local);
      }

      node.source = null;
    }
    this.semicolon();
  }
  return this.finishNode(node, "ExportNamedDeclaration")
};

pp$1.checkExport = function(exports, name, pos) {
  if (!exports) { return }
  if (has(exports, name))
    { this.raiseRecoverable(pos, "Duplicate export '" + name + "'"); }
  exports[name] = true;
};

pp$1.checkPatternExport = function(exports, pat) {
  var type = pat.type;
  if (type === "Identifier")
    { this.checkExport(exports, pat.name, pat.start); }
  else if (type === "ObjectPattern")
    { for (var i = 0, list = pat.properties; i < list.length; i += 1)
      {
        var prop = list[i];

        this.checkPatternExport(exports, prop);
      } }
  else if (type === "ArrayPattern")
    { for (var i$1 = 0, list$1 = pat.elements; i$1 < list$1.length; i$1 += 1) {
      var elt = list$1[i$1];

        if (elt) { this.checkPatternExport(exports, elt); }
    } }
  else if (type === "Property")
    { this.checkPatternExport(exports, pat.value); }
  else if (type === "AssignmentPattern")
    { this.checkPatternExport(exports, pat.left); }
  else if (type === "RestElement")
    { this.checkPatternExport(exports, pat.argument); }
  else if (type === "ParenthesizedExpression")
    { this.checkPatternExport(exports, pat.expression); }
};

pp$1.checkVariableExport = function(exports, decls) {
  if (!exports) { return }
  for (var i = 0, list = decls; i < list.length; i += 1)
    {
    var decl = list[i];

    this.checkPatternExport(exports, decl.id);
  }
};

pp$1.shouldParseExportStatement = function() {
  return this.type.keyword === "var" ||
    this.type.keyword === "const" ||
    this.type.keyword === "class" ||
    this.type.keyword === "function" ||
    this.isLet() ||
    this.isAsyncFunction()
};

// Parses a comma-separated list of module exports.

pp$1.parseExportSpecifiers = function(exports) {
  var nodes = [], first = true;
  // export { x, y as z } [from '...']
  this.expect(types.braceL);
  while (!this.eat(types.braceR)) {
    if (!first) {
      this.expect(types.comma);
      if (this.afterTrailingComma(types.braceR)) { break }
    } else { first = false; }

    var node = this.startNode();
    node.local = this.parseIdent(true);
    node.exported = this.eatContextual("as") ? this.parseIdent(true) : node.local;
    this.checkExport(exports, node.exported.name, node.exported.start);
    nodes.push(this.finishNode(node, "ExportSpecifier"));
  }
  return nodes
};

// Parses import declaration.

pp$1.parseImport = function(node) {
  this.next();
  // import '...'
  if (this.type === types.string) {
    node.specifiers = empty;
    node.source = this.parseExprAtom();
  } else {
    node.specifiers = this.parseImportSpecifiers();
    this.expectContextual("from");
    node.source = this.type === types.string ? this.parseExprAtom() : this.unexpected();
  }
  this.semicolon();
  return this.finishNode(node, "ImportDeclaration")
};

// Parses a comma-separated list of module imports.

pp$1.parseImportSpecifiers = function() {
  var nodes = [], first = true;
  if (this.type === types.name) {
    // import defaultObj, { x, y as z } from '...'
    var node = this.startNode();
    node.local = this.parseIdent();
    this.checkLVal(node.local, BIND_LEXICAL);
    nodes.push(this.finishNode(node, "ImportDefaultSpecifier"));
    if (!this.eat(types.comma)) { return nodes }
  }
  if (this.type === types.star) {
    var node$1 = this.startNode();
    this.next();
    this.expectContextual("as");
    node$1.local = this.parseIdent();
    this.checkLVal(node$1.local, BIND_LEXICAL);
    nodes.push(this.finishNode(node$1, "ImportNamespaceSpecifier"));
    return nodes
  }
  this.expect(types.braceL);
  while (!this.eat(types.braceR)) {
    if (!first) {
      this.expect(types.comma);
      if (this.afterTrailingComma(types.braceR)) { break }
    } else { first = false; }

    var node$2 = this.startNode();
    node$2.imported = this.parseIdent(true);
    if (this.eatContextual("as")) {
      node$2.local = this.parseIdent();
    } else {
      this.checkUnreserved(node$2.imported);
      node$2.local = node$2.imported;
    }
    this.checkLVal(node$2.local, BIND_LEXICAL);
    nodes.push(this.finishNode(node$2, "ImportSpecifier"));
  }
  return nodes
};

// Set `ExpressionStatement#directive` property for directive prologues.
pp$1.adaptDirectivePrologue = function(statements) {
  for (var i = 0; i < statements.length && this.isDirectiveCandidate(statements[i]); ++i) {
    statements[i].directive = statements[i].expression.raw.slice(1, -1);
  }
};
pp$1.isDirectiveCandidate = function(statement) {
  return (
    statement.type === "ExpressionStatement" &&
    statement.expression.type === "Literal" &&
    typeof statement.expression.value === "string" &&
    // Reject parenthesized strings.
    (this.input[statement.start] === "\"" || this.input[statement.start] === "'")
  )
};

var pp$2 = Parser.prototype;

// Convert existing expression atom to assignable pattern
// if possible.

pp$2.toAssignable = function(node, isBinding, refDestructuringErrors) {
  if (this.options.ecmaVersion >= 6 && node) {
    switch (node.type) {
    case "Identifier":
      if (this.inAsync && node.name === "await")
        { this.raise(node.start, "Cannot use 'await' as identifier inside an async function"); }
      break

    case "ObjectPattern":
    case "ArrayPattern":
    case "RestElement":
      break

    case "ObjectExpression":
      node.type = "ObjectPattern";
      if (refDestructuringErrors) { this.checkPatternErrors(refDestructuringErrors, true); }
      for (var i = 0, list = node.properties; i < list.length; i += 1) {
        var prop = list[i];

      this.toAssignable(prop, isBinding);
        // Early error:
        //   AssignmentRestProperty[Yield, Await] :
        //     `...` DestructuringAssignmentTarget[Yield, Await]
        //
        //   It is a Syntax Error if |DestructuringAssignmentTarget| is an |ArrayLiteral| or an |ObjectLiteral|.
        if (
          prop.type === "RestElement" &&
          (prop.argument.type === "ArrayPattern" || prop.argument.type === "ObjectPattern")
        ) {
          this.raise(prop.argument.start, "Unexpected token");
        }
      }
      break

    case "Property":
      // AssignmentProperty has type === "Property"
      if (node.kind !== "init") { this.raise(node.key.start, "Object pattern can't contain getter or setter"); }
      this.toAssignable(node.value, isBinding);
      break

    case "ArrayExpression":
      node.type = "ArrayPattern";
      if (refDestructuringErrors) { this.checkPatternErrors(refDestructuringErrors, true); }
      this.toAssignableList(node.elements, isBinding);
      break

    case "SpreadElement":
      node.type = "RestElement";
      this.toAssignable(node.argument, isBinding);
      if (node.argument.type === "AssignmentPattern")
        { this.raise(node.argument.start, "Rest elements cannot have a default value"); }
      break

    case "AssignmentExpression":
      if (node.operator !== "=") { this.raise(node.left.end, "Only '=' operator can be used for specifying default value."); }
      node.type = "AssignmentPattern";
      delete node.operator;
      this.toAssignable(node.left, isBinding);
      // falls through to AssignmentPattern

    case "AssignmentPattern":
      break

    case "ParenthesizedExpression":
      this.toAssignable(node.expression, isBinding, refDestructuringErrors);
      break

    case "MemberExpression":
      if (!isBinding) { break }

    default:
      this.raise(node.start, "Assigning to rvalue");
    }
  } else if (refDestructuringErrors) { this.checkPatternErrors(refDestructuringErrors, true); }
  return node
};

// Convert list of expression atoms to binding list.

pp$2.toAssignableList = function(exprList, isBinding) {
  var end = exprList.length;
  for (var i = 0; i < end; i++) {
    var elt = exprList[i];
    if (elt) { this.toAssignable(elt, isBinding); }
  }
  if (end) {
    var last = exprList[end - 1];
    if (this.options.ecmaVersion === 6 && isBinding && last && last.type === "RestElement" && last.argument.type !== "Identifier")
      { this.unexpected(last.argument.start); }
  }
  return exprList
};

// Parses spread element.

pp$2.parseSpread = function(refDestructuringErrors) {
  var node = this.startNode();
  this.next();
  node.argument = this.parseMaybeAssign(false, refDestructuringErrors);
  return this.finishNode(node, "SpreadElement")
};

pp$2.parseRestBinding = function() {
  var node = this.startNode();
  this.next();

  // RestElement inside of a function parameter must be an identifier
  if (this.options.ecmaVersion === 6 && this.type !== types.name)
    { this.unexpected(); }

  node.argument = this.parseBindingAtom();

  return this.finishNode(node, "RestElement")
};

// Parses lvalue (assignable) atom.

pp$2.parseBindingAtom = function() {
  if (this.options.ecmaVersion >= 6) {
    switch (this.type) {
    case types.bracketL:
      var node = this.startNode();
      this.next();
      node.elements = this.parseBindingList(types.bracketR, true, true);
      return this.finishNode(node, "ArrayPattern")

    case types.braceL:
      return this.parseObj(true)
    }
  }
  return this.parseIdent()
};

pp$2.parseBindingList = function(close, allowEmpty, allowTrailingComma) {
  var elts = [], first = true;
  while (!this.eat(close)) {
    if (first) { first = false; }
    else { this.expect(types.comma); }
    if (allowEmpty && this.type === types.comma) {
      elts.push(null);
    } else if (allowTrailingComma && this.afterTrailingComma(close)) {
      break
    } else if (this.type === types.ellipsis) {
      var rest = this.parseRestBinding();
      this.parseBindingListItem(rest);
      elts.push(rest);
      if (this.type === types.comma) { this.raise(this.start, "Comma is not permitted after the rest element"); }
      this.expect(close);
      break
    } else {
      var elem = this.parseMaybeDefault(this.start, this.startLoc);
      this.parseBindingListItem(elem);
      elts.push(elem);
    }
  }
  return elts
};

pp$2.parseBindingListItem = function(param) {
  return param
};

// Parses assignment pattern around given atom if possible.

pp$2.parseMaybeDefault = function(startPos, startLoc, left) {
  left = left || this.parseBindingAtom();
  if (this.options.ecmaVersion < 6 || !this.eat(types.eq)) { return left }
  var node = this.startNodeAt(startPos, startLoc);
  node.left = left;
  node.right = this.parseMaybeAssign();
  return this.finishNode(node, "AssignmentPattern")
};

// Verify that a node is an lval — something that can be assigned
// to.
// bindingType can be either:
// 'var' indicating that the lval creates a 'var' binding
// 'let' indicating that the lval creates a lexical ('let' or 'const') binding
// 'none' indicating that the binding should be checked for illegal identifiers, but not for duplicate references

pp$2.checkLVal = function(expr, bindingType, checkClashes) {
  if ( bindingType === void 0 ) bindingType = BIND_NONE;

  switch (expr.type) {
  case "Identifier":
    if (bindingType === BIND_LEXICAL && expr.name === "let")
      { this.raiseRecoverable(expr.start, "let is disallowed as a lexically bound name"); }
    if (this.strict && this.reservedWordsStrictBind.test(expr.name))
      { this.raiseRecoverable(expr.start, (bindingType ? "Binding " : "Assigning to ") + expr.name + " in strict mode"); }
    if (checkClashes) {
      if (has(checkClashes, expr.name))
        { this.raiseRecoverable(expr.start, "Argument name clash"); }
      checkClashes[expr.name] = true;
    }
    if (bindingType !== BIND_NONE && bindingType !== BIND_OUTSIDE) { this.declareName(expr.name, bindingType, expr.start); }
    break

  case "MemberExpression":
    if (bindingType) { this.raiseRecoverable(expr.start, "Binding member expression"); }
    break

  case "ObjectPattern":
    for (var i = 0, list = expr.properties; i < list.length; i += 1)
      {
    var prop = list[i];

    this.checkLVal(prop, bindingType, checkClashes);
  }
    break

  case "Property":
    // AssignmentProperty has type === "Property"
    this.checkLVal(expr.value, bindingType, checkClashes);
    break

  case "ArrayPattern":
    for (var i$1 = 0, list$1 = expr.elements; i$1 < list$1.length; i$1 += 1) {
      var elem = list$1[i$1];

    if (elem) { this.checkLVal(elem, bindingType, checkClashes); }
    }
    break

  case "AssignmentPattern":
    this.checkLVal(expr.left, bindingType, checkClashes);
    break

  case "RestElement":
    this.checkLVal(expr.argument, bindingType, checkClashes);
    break

  case "ParenthesizedExpression":
    this.checkLVal(expr.expression, bindingType, checkClashes);
    break

  default:
    this.raise(expr.start, (bindingType ? "Binding" : "Assigning to") + " rvalue");
  }
};

// A recursive descent parser operates by defining functions for all

var pp$3 = Parser.prototype;

// Check if property name clashes with already added.
// Object/class getters and setters are not allowed to clash —
// either with each other or with an init property — and in
// strict mode, init properties are also not allowed to be repeated.

pp$3.checkPropClash = function(prop, propHash, refDestructuringErrors) {
  if (this.options.ecmaVersion >= 9 && prop.type === "SpreadElement")
    { return }
  if (this.options.ecmaVersion >= 6 && (prop.computed || prop.method || prop.shorthand))
    { return }
  var key = prop.key;
  var name;
  switch (key.type) {
  case "Identifier": name = key.name; break
  case "Literal": name = String(key.value); break
  default: return
  }
  var kind = prop.kind;
  if (this.options.ecmaVersion >= 6) {
    if (name === "__proto__" && kind === "init") {
      if (propHash.proto) {
        if (refDestructuringErrors) {
          if (refDestructuringErrors.doubleProto < 0)
            { refDestructuringErrors.doubleProto = key.start; }
          // Backwards-compat kludge. Can be removed in version 6.0
        } else { this.raiseRecoverable(key.start, "Redefinition of __proto__ property"); }
      }
      propHash.proto = true;
    }
    return
  }
  name = "$" + name;
  var other = propHash[name];
  if (other) {
    var redefinition;
    if (kind === "init") {
      redefinition = this.strict && other.init || other.get || other.set;
    } else {
      redefinition = other.init || other[kind];
    }
    if (redefinition)
      { this.raiseRecoverable(key.start, "Redefinition of property"); }
  } else {
    other = propHash[name] = {
      init: false,
      get: false,
      set: false
    };
  }
  other[kind] = true;
};

// ### Expression parsing

// These nest, from the most general expression type at the top to
// 'atomic', nondivisible expression types at the bottom. Most of
// the functions will simply let the function(s) below them parse,
// and, *if* the syntactic construct they handle is present, wrap
// the AST node that the inner parser gave them in another node.

// Parse a full expression. The optional arguments are used to
// forbid the `in` operator (in for loops initalization expressions)
// and provide reference for storing '=' operator inside shorthand
// property assignment in contexts where both object expression
// and object pattern might appear (so it's possible to raise
// delayed syntax error at correct position).

pp$3.parseExpression = function(noIn, refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseMaybeAssign(noIn, refDestructuringErrors);
  if (this.type === types.comma) {
    var node = this.startNodeAt(startPos, startLoc);
    node.expressions = [expr];
    while (this.eat(types.comma)) { node.expressions.push(this.parseMaybeAssign(noIn, refDestructuringErrors)); }
    return this.finishNode(node, "SequenceExpression")
  }
  return expr
};

// Parse an assignment expression. This includes applications of
// operators like `+=`.

pp$3.parseMaybeAssign = function(noIn, refDestructuringErrors, afterLeftParse) {
  if (this.isContextual("yield")) {
    if (this.inGenerator) { return this.parseYield(noIn) }
    // The tokenizer will assume an expression is allowed after
    // `yield`, but this isn't that kind of yield
    else { this.exprAllowed = false; }
  }

  var ownDestructuringErrors = false, oldParenAssign = -1, oldTrailingComma = -1;
  if (refDestructuringErrors) {
    oldParenAssign = refDestructuringErrors.parenthesizedAssign;
    oldTrailingComma = refDestructuringErrors.trailingComma;
    refDestructuringErrors.parenthesizedAssign = refDestructuringErrors.trailingComma = -1;
  } else {
    refDestructuringErrors = new DestructuringErrors;
    ownDestructuringErrors = true;
  }

  var startPos = this.start, startLoc = this.startLoc;
  if (this.type === types.parenL || this.type === types.name)
    { this.potentialArrowAt = this.start; }
  var left = this.parseMaybeConditional(noIn, refDestructuringErrors);
  if (afterLeftParse) { left = afterLeftParse.call(this, left, startPos, startLoc); }
  if (this.type.isAssign) {
    var node = this.startNodeAt(startPos, startLoc);
    node.operator = this.value;
    node.left = this.type === types.eq ? this.toAssignable(left, false, refDestructuringErrors) : left;
    if (!ownDestructuringErrors) {
      refDestructuringErrors.parenthesizedAssign = refDestructuringErrors.trailingComma = refDestructuringErrors.doubleProto = -1;
    }
    if (refDestructuringErrors.shorthandAssign >= node.left.start)
      { refDestructuringErrors.shorthandAssign = -1; } // reset because shorthand default was used correctly
    this.checkLVal(left);
    this.next();
    node.right = this.parseMaybeAssign(noIn);
    return this.finishNode(node, "AssignmentExpression")
  } else {
    if (ownDestructuringErrors) { this.checkExpressionErrors(refDestructuringErrors, true); }
  }
  if (oldParenAssign > -1) { refDestructuringErrors.parenthesizedAssign = oldParenAssign; }
  if (oldTrailingComma > -1) { refDestructuringErrors.trailingComma = oldTrailingComma; }
  return left
};

// Parse a ternary conditional (`?:`) operator.

pp$3.parseMaybeConditional = function(noIn, refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseExprOps(noIn, refDestructuringErrors);
  if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
  if (this.eat(types.question)) {
    var node = this.startNodeAt(startPos, startLoc);
    node.test = expr;
    node.consequent = this.parseMaybeAssign();
    this.expect(types.colon);
    node.alternate = this.parseMaybeAssign(noIn);
    return this.finishNode(node, "ConditionalExpression")
  }
  return expr
};

// Start the precedence parser.

pp$3.parseExprOps = function(noIn, refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseMaybeUnary(refDestructuringErrors, false);
  if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
  return expr.start === startPos && expr.type === "ArrowFunctionExpression" ? expr : this.parseExprOp(expr, startPos, startLoc, -1, noIn)
};

// Parse binary operators with the operator precedence parsing
// algorithm. `left` is the left-hand side of the operator.
// `minPrec` provides context that allows the function to stop and
// defer further parser to one of its callers when it encounters an
// operator that has a lower precedence than the set it is parsing.

pp$3.parseExprOp = function(left, leftStartPos, leftStartLoc, minPrec, noIn) {
  var prec = this.type.binop;
  if (prec != null && (!noIn || this.type !== types._in)) {
    if (prec > minPrec) {
      var logical = this.type === types.logicalOR || this.type === types.logicalAND;
      var op = this.value;
      this.next();
      var startPos = this.start, startLoc = this.startLoc;
      var right = this.parseExprOp(this.parseMaybeUnary(null, false), startPos, startLoc, prec, noIn);
      var node = this.buildBinary(leftStartPos, leftStartLoc, left, right, op, logical);
      return this.parseExprOp(node, leftStartPos, leftStartLoc, minPrec, noIn)
    }
  }
  return left
};

pp$3.buildBinary = function(startPos, startLoc, left, right, op, logical) {
  var node = this.startNodeAt(startPos, startLoc);
  node.left = left;
  node.operator = op;
  node.right = right;
  return this.finishNode(node, logical ? "LogicalExpression" : "BinaryExpression")
};

// Parse unary operators, both prefix and postfix.

pp$3.parseMaybeUnary = function(refDestructuringErrors, sawUnary) {
  var startPos = this.start, startLoc = this.startLoc, expr;
  if (this.isContextual("await") && (this.inAsync || (!this.inFunction && this.options.allowAwaitOutsideFunction))) {
    expr = this.parseAwait();
    sawUnary = true;
  } else if (this.type.prefix) {
    var node = this.startNode(), update = this.type === types.incDec;
    node.operator = this.value;
    node.prefix = true;
    this.next();
    node.argument = this.parseMaybeUnary(null, true);
    this.checkExpressionErrors(refDestructuringErrors, true);
    if (update) { this.checkLVal(node.argument); }
    else if (this.strict && node.operator === "delete" &&
             node.argument.type === "Identifier")
      { this.raiseRecoverable(node.start, "Deleting local variable in strict mode"); }
    else { sawUnary = true; }
    expr = this.finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
  } else {
    expr = this.parseExprSubscripts(refDestructuringErrors);
    if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
    while (this.type.postfix && !this.canInsertSemicolon()) {
      var node$1 = this.startNodeAt(startPos, startLoc);
      node$1.operator = this.value;
      node$1.prefix = false;
      node$1.argument = expr;
      this.checkLVal(expr);
      this.next();
      expr = this.finishNode(node$1, "UpdateExpression");
    }
  }

  if (!sawUnary && this.eat(types.starstar))
    { return this.buildBinary(startPos, startLoc, expr, this.parseMaybeUnary(null, false), "**", false) }
  else
    { return expr }
};

// Parse call, dot, and `[]`-subscript expressions.

pp$3.parseExprSubscripts = function(refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseExprAtom(refDestructuringErrors);
  if (expr.type === "ArrowFunctionExpression" && this.input.slice(this.lastTokStart, this.lastTokEnd) !== ")")
    { return expr }
  var result = this.parseSubscripts(expr, startPos, startLoc);
  if (refDestructuringErrors && result.type === "MemberExpression") {
    if (refDestructuringErrors.parenthesizedAssign >= result.start) { refDestructuringErrors.parenthesizedAssign = -1; }
    if (refDestructuringErrors.parenthesizedBind >= result.start) { refDestructuringErrors.parenthesizedBind = -1; }
  }
  return result
};

pp$3.parseSubscripts = function(base, startPos, startLoc, noCalls) {
  var maybeAsyncArrow = this.options.ecmaVersion >= 8 && base.type === "Identifier" && base.name === "async" &&
      this.lastTokEnd === base.end && !this.canInsertSemicolon() && this.input.slice(base.start, base.end) === "async";
  while (true) {
    var element = this.parseSubscript(base, startPos, startLoc, noCalls, maybeAsyncArrow);
    if (element === base || element.type === "ArrowFunctionExpression") { return element }
    base = element;
  }
};

pp$3.parseSubscript = function(base, startPos, startLoc, noCalls, maybeAsyncArrow) {
  var computed = this.eat(types.bracketL);
  if (computed || this.eat(types.dot)) {
    var node = this.startNodeAt(startPos, startLoc);
    node.object = base;
    node.property = computed ? this.parseExpression() : this.parseIdent(this.options.allowReserved !== "never");
    node.computed = !!computed;
    if (computed) { this.expect(types.bracketR); }
    base = this.finishNode(node, "MemberExpression");
  } else if (!noCalls && this.eat(types.parenL)) {
    var refDestructuringErrors = new DestructuringErrors, oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
    this.yieldPos = 0;
    this.awaitPos = 0;
    this.awaitIdentPos = 0;
    var exprList = this.parseExprList(types.parenR, this.options.ecmaVersion >= 8, false, refDestructuringErrors);
    if (maybeAsyncArrow && !this.canInsertSemicolon() && this.eat(types.arrow)) {
      this.checkPatternErrors(refDestructuringErrors, false);
      this.checkYieldAwaitInDefaultParams();
      if (this.awaitIdentPos > 0)
        { this.raise(this.awaitIdentPos, "Cannot use 'await' as identifier inside an async function"); }
      this.yieldPos = oldYieldPos;
      this.awaitPos = oldAwaitPos;
      this.awaitIdentPos = oldAwaitIdentPos;
      return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList, true)
    }
    this.checkExpressionErrors(refDestructuringErrors, true);
    this.yieldPos = oldYieldPos || this.yieldPos;
    this.awaitPos = oldAwaitPos || this.awaitPos;
    this.awaitIdentPos = oldAwaitIdentPos || this.awaitIdentPos;
    var node$1 = this.startNodeAt(startPos, startLoc);
    node$1.callee = base;
    node$1.arguments = exprList;
    base = this.finishNode(node$1, "CallExpression");
  } else if (this.type === types.backQuote) {
    var node$2 = this.startNodeAt(startPos, startLoc);
    node$2.tag = base;
    node$2.quasi = this.parseTemplate({isTagged: true});
    base = this.finishNode(node$2, "TaggedTemplateExpression");
  }
  return base
};

// Parse an atomic expression — either a single token that is an
// expression, an expression started by a keyword like `function` or
// `new`, or an expression wrapped in punctuation like `()`, `[]`,
// or `{}`.

pp$3.parseExprAtom = function(refDestructuringErrors) {
  // If a division operator appears in an expression position, the
  // tokenizer got confused, and we force it to read a regexp instead.
  if (this.type === types.slash) { this.readRegexp(); }

  var node, canBeArrow = this.potentialArrowAt === this.start;
  switch (this.type) {
  case types._super:
    if (!this.allowSuper)
      { this.raise(this.start, "'super' keyword outside a method"); }
    node = this.startNode();
    this.next();
    if (this.type === types.parenL && !this.allowDirectSuper)
      { this.raise(node.start, "super() call outside constructor of a subclass"); }
    // The `super` keyword can appear at below:
    // SuperProperty:
    //     super [ Expression ]
    //     super . IdentifierName
    // SuperCall:
    //     super ( Arguments )
    if (this.type !== types.dot && this.type !== types.bracketL && this.type !== types.parenL)
      { this.unexpected(); }
    return this.finishNode(node, "Super")

  case types._this:
    node = this.startNode();
    this.next();
    return this.finishNode(node, "ThisExpression")

  case types.name:
    var startPos = this.start, startLoc = this.startLoc, containsEsc = this.containsEsc;
    var id = this.parseIdent(false);
    if (this.options.ecmaVersion >= 8 && !containsEsc && id.name === "async" && !this.canInsertSemicolon() && this.eat(types._function))
      { return this.parseFunction(this.startNodeAt(startPos, startLoc), 0, false, true) }
    if (canBeArrow && !this.canInsertSemicolon()) {
      if (this.eat(types.arrow))
        { return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], false) }
      if (this.options.ecmaVersion >= 8 && id.name === "async" && this.type === types.name && !containsEsc) {
        id = this.parseIdent(false);
        if (this.canInsertSemicolon() || !this.eat(types.arrow))
          { this.unexpected(); }
        return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], true)
      }
    }
    return id

  case types.regexp:
    var value = this.value;
    node = this.parseLiteral(value.value);
    node.regex = {pattern: value.pattern, flags: value.flags};
    return node

  case types.num: case types.string:
    return this.parseLiteral(this.value)

  case types._null: case types._true: case types._false:
    node = this.startNode();
    node.value = this.type === types._null ? null : this.type === types._true;
    node.raw = this.type.keyword;
    this.next();
    return this.finishNode(node, "Literal")

  case types.parenL:
    var start = this.start, expr = this.parseParenAndDistinguishExpression(canBeArrow);
    if (refDestructuringErrors) {
      if (refDestructuringErrors.parenthesizedAssign < 0 && !this.isSimpleAssignTarget(expr))
        { refDestructuringErrors.parenthesizedAssign = start; }
      if (refDestructuringErrors.parenthesizedBind < 0)
        { refDestructuringErrors.parenthesizedBind = start; }
    }
    return expr

  case types.bracketL:
    node = this.startNode();
    this.next();
    node.elements = this.parseExprList(types.bracketR, true, true, refDestructuringErrors);
    return this.finishNode(node, "ArrayExpression")

  case types.braceL:
    return this.parseObj(false, refDestructuringErrors)

  case types._function:
    node = this.startNode();
    this.next();
    return this.parseFunction(node, 0)

  case types._class:
    return this.parseClass(this.startNode(), false)

  case types._new:
    return this.parseNew()

  case types.backQuote:
    return this.parseTemplate()

  case types._import:
    if (this.options.ecmaVersion >= 11) {
      return this.parseExprImport()
    } else {
      return this.unexpected()
    }

  default:
    this.unexpected();
  }
};

pp$3.parseExprImport = function() {
  var node = this.startNode();
  this.next(); // skip `import`
  switch (this.type) {
  case types.parenL:
    return this.parseDynamicImport(node)
  default:
    this.unexpected();
  }
};

pp$3.parseDynamicImport = function(node) {
  this.next(); // skip `(`

  // Parse node.source.
  node.source = this.parseMaybeAssign();

  // Verify ending.
  if (!this.eat(types.parenR)) {
    var errorPos = this.start;
    if (this.eat(types.comma) && this.eat(types.parenR)) {
      this.raiseRecoverable(errorPos, "Trailing comma is not allowed in import()");
    } else {
      this.unexpected(errorPos);
    }
  }

  return this.finishNode(node, "ImportExpression")
};

pp$3.parseLiteral = function(value) {
  var node = this.startNode();
  node.value = value;
  node.raw = this.input.slice(this.start, this.end);
  if (node.raw.charCodeAt(node.raw.length - 1) === 110) { node.bigint = node.raw.slice(0, -1); }
  this.next();
  return this.finishNode(node, "Literal")
};

pp$3.parseParenExpression = function() {
  this.expect(types.parenL);
  var val = this.parseExpression();
  this.expect(types.parenR);
  return val
};

pp$3.parseParenAndDistinguishExpression = function(canBeArrow) {
  var startPos = this.start, startLoc = this.startLoc, val, allowTrailingComma = this.options.ecmaVersion >= 8;
  if (this.options.ecmaVersion >= 6) {
    this.next();

    var innerStartPos = this.start, innerStartLoc = this.startLoc;
    var exprList = [], first = true, lastIsComma = false;
    var refDestructuringErrors = new DestructuringErrors, oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, spreadStart;
    this.yieldPos = 0;
    this.awaitPos = 0;
    // Do not save awaitIdentPos to allow checking awaits nested in parameters
    while (this.type !== types.parenR) {
      first ? first = false : this.expect(types.comma);
      if (allowTrailingComma && this.afterTrailingComma(types.parenR, true)) {
        lastIsComma = true;
        break
      } else if (this.type === types.ellipsis) {
        spreadStart = this.start;
        exprList.push(this.parseParenItem(this.parseRestBinding()));
        if (this.type === types.comma) { this.raise(this.start, "Comma is not permitted after the rest element"); }
        break
      } else {
        exprList.push(this.parseMaybeAssign(false, refDestructuringErrors, this.parseParenItem));
      }
    }
    var innerEndPos = this.start, innerEndLoc = this.startLoc;
    this.expect(types.parenR);

    if (canBeArrow && !this.canInsertSemicolon() && this.eat(types.arrow)) {
      this.checkPatternErrors(refDestructuringErrors, false);
      this.checkYieldAwaitInDefaultParams();
      this.yieldPos = oldYieldPos;
      this.awaitPos = oldAwaitPos;
      return this.parseParenArrowList(startPos, startLoc, exprList)
    }

    if (!exprList.length || lastIsComma) { this.unexpected(this.lastTokStart); }
    if (spreadStart) { this.unexpected(spreadStart); }
    this.checkExpressionErrors(refDestructuringErrors, true);
    this.yieldPos = oldYieldPos || this.yieldPos;
    this.awaitPos = oldAwaitPos || this.awaitPos;

    if (exprList.length > 1) {
      val = this.startNodeAt(innerStartPos, innerStartLoc);
      val.expressions = exprList;
      this.finishNodeAt(val, "SequenceExpression", innerEndPos, innerEndLoc);
    } else {
      val = exprList[0];
    }
  } else {
    val = this.parseParenExpression();
  }

  if (this.options.preserveParens) {
    var par = this.startNodeAt(startPos, startLoc);
    par.expression = val;
    return this.finishNode(par, "ParenthesizedExpression")
  } else {
    return val
  }
};

pp$3.parseParenItem = function(item) {
  return item
};

pp$3.parseParenArrowList = function(startPos, startLoc, exprList) {
  return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList)
};

// New's precedence is slightly tricky. It must allow its argument to
// be a `[]` or dot subscript expression, but not a call — at least,
// not without wrapping it in parentheses. Thus, it uses the noCalls
// argument to parseSubscripts to prevent it from consuming the
// argument list.

var empty$1 = [];

pp$3.parseNew = function() {
  if (this.containsEsc) { this.raiseRecoverable(this.start, "Escape sequence in keyword new"); }
  var node = this.startNode();
  var meta = this.parseIdent(true);
  if (this.options.ecmaVersion >= 6 && this.eat(types.dot)) {
    node.meta = meta;
    var containsEsc = this.containsEsc;
    node.property = this.parseIdent(true);
    if (node.property.name !== "target" || containsEsc)
      { this.raiseRecoverable(node.property.start, "The only valid meta property for new is new.target"); }
    if (!this.inNonArrowFunction())
      { this.raiseRecoverable(node.start, "new.target can only be used in functions"); }
    return this.finishNode(node, "MetaProperty")
  }
  var startPos = this.start, startLoc = this.startLoc, isImport = this.type === types._import;
  node.callee = this.parseSubscripts(this.parseExprAtom(), startPos, startLoc, true);
  if (isImport && node.callee.type === "ImportExpression") {
    this.raise(startPos, "Cannot use new with import()");
  }
  if (this.eat(types.parenL)) { node.arguments = this.parseExprList(types.parenR, this.options.ecmaVersion >= 8, false); }
  else { node.arguments = empty$1; }
  return this.finishNode(node, "NewExpression")
};

// Parse template expression.

pp$3.parseTemplateElement = function(ref) {
  var isTagged = ref.isTagged;

  var elem = this.startNode();
  if (this.type === types.invalidTemplate) {
    if (!isTagged) {
      this.raiseRecoverable(this.start, "Bad escape sequence in untagged template literal");
    }
    elem.value = {
      raw: this.value,
      cooked: null
    };
  } else {
    elem.value = {
      raw: this.input.slice(this.start, this.end).replace(/\r\n?/g, "\n"),
      cooked: this.value
    };
  }
  this.next();
  elem.tail = this.type === types.backQuote;
  return this.finishNode(elem, "TemplateElement")
};

pp$3.parseTemplate = function(ref) {
  if ( ref === void 0 ) ref = {};
  var isTagged = ref.isTagged; if ( isTagged === void 0 ) isTagged = false;

  var node = this.startNode();
  this.next();
  node.expressions = [];
  var curElt = this.parseTemplateElement({isTagged: isTagged});
  node.quasis = [curElt];
  while (!curElt.tail) {
    if (this.type === types.eof) { this.raise(this.pos, "Unterminated template literal"); }
    this.expect(types.dollarBraceL);
    node.expressions.push(this.parseExpression());
    this.expect(types.braceR);
    node.quasis.push(curElt = this.parseTemplateElement({isTagged: isTagged}));
  }
  this.next();
  return this.finishNode(node, "TemplateLiteral")
};

pp$3.isAsyncProp = function(prop) {
  return !prop.computed && prop.key.type === "Identifier" && prop.key.name === "async" &&
    (this.type === types.name || this.type === types.num || this.type === types.string || this.type === types.bracketL || this.type.keyword || (this.options.ecmaVersion >= 9 && this.type === types.star)) &&
    !lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
};

// Parse an object literal or binding pattern.

pp$3.parseObj = function(isPattern, refDestructuringErrors) {
  var node = this.startNode(), first = true, propHash = {};
  node.properties = [];
  this.next();
  while (!this.eat(types.braceR)) {
    if (!first) {
      this.expect(types.comma);
      if (this.options.ecmaVersion >= 5 && this.afterTrailingComma(types.braceR)) { break }
    } else { first = false; }

    var prop = this.parseProperty(isPattern, refDestructuringErrors);
    if (!isPattern) { this.checkPropClash(prop, propHash, refDestructuringErrors); }
    node.properties.push(prop);
  }
  return this.finishNode(node, isPattern ? "ObjectPattern" : "ObjectExpression")
};

pp$3.parseProperty = function(isPattern, refDestructuringErrors) {
  var prop = this.startNode(), isGenerator, isAsync, startPos, startLoc;
  if (this.options.ecmaVersion >= 9 && this.eat(types.ellipsis)) {
    if (isPattern) {
      prop.argument = this.parseIdent(false);
      if (this.type === types.comma) {
        this.raise(this.start, "Comma is not permitted after the rest element");
      }
      return this.finishNode(prop, "RestElement")
    }
    // To disallow parenthesized identifier via `this.toAssignable()`.
    if (this.type === types.parenL && refDestructuringErrors) {
      if (refDestructuringErrors.parenthesizedAssign < 0) {
        refDestructuringErrors.parenthesizedAssign = this.start;
      }
      if (refDestructuringErrors.parenthesizedBind < 0) {
        refDestructuringErrors.parenthesizedBind = this.start;
      }
    }
    // Parse argument.
    prop.argument = this.parseMaybeAssign(false, refDestructuringErrors);
    // To disallow trailing comma via `this.toAssignable()`.
    if (this.type === types.comma && refDestructuringErrors && refDestructuringErrors.trailingComma < 0) {
      refDestructuringErrors.trailingComma = this.start;
    }
    // Finish
    return this.finishNode(prop, "SpreadElement")
  }
  if (this.options.ecmaVersion >= 6) {
    prop.method = false;
    prop.shorthand = false;
    if (isPattern || refDestructuringErrors) {
      startPos = this.start;
      startLoc = this.startLoc;
    }
    if (!isPattern)
      { isGenerator = this.eat(types.star); }
  }
  var containsEsc = this.containsEsc;
  this.parsePropertyName(prop);
  if (!isPattern && !containsEsc && this.options.ecmaVersion >= 8 && !isGenerator && this.isAsyncProp(prop)) {
    isAsync = true;
    isGenerator = this.options.ecmaVersion >= 9 && this.eat(types.star);
    this.parsePropertyName(prop, refDestructuringErrors);
  } else {
    isAsync = false;
  }
  this.parsePropertyValue(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors, containsEsc);
  return this.finishNode(prop, "Property")
};

pp$3.parsePropertyValue = function(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors, containsEsc) {
  if ((isGenerator || isAsync) && this.type === types.colon)
    { this.unexpected(); }

  if (this.eat(types.colon)) {
    prop.value = isPattern ? this.parseMaybeDefault(this.start, this.startLoc) : this.parseMaybeAssign(false, refDestructuringErrors);
    prop.kind = "init";
  } else if (this.options.ecmaVersion >= 6 && this.type === types.parenL) {
    if (isPattern) { this.unexpected(); }
    prop.kind = "init";
    prop.method = true;
    prop.value = this.parseMethod(isGenerator, isAsync);
  } else if (!isPattern && !containsEsc &&
             this.options.ecmaVersion >= 5 && !prop.computed && prop.key.type === "Identifier" &&
             (prop.key.name === "get" || prop.key.name === "set") &&
             (this.type !== types.comma && this.type !== types.braceR)) {
    if (isGenerator || isAsync) { this.unexpected(); }
    prop.kind = prop.key.name;
    this.parsePropertyName(prop);
    prop.value = this.parseMethod(false);
    var paramCount = prop.kind === "get" ? 0 : 1;
    if (prop.value.params.length !== paramCount) {
      var start = prop.value.start;
      if (prop.kind === "get")
        { this.raiseRecoverable(start, "getter should have no params"); }
      else
        { this.raiseRecoverable(start, "setter should have exactly one param"); }
    } else {
      if (prop.kind === "set" && prop.value.params[0].type === "RestElement")
        { this.raiseRecoverable(prop.value.params[0].start, "Setter cannot use rest params"); }
    }
  } else if (this.options.ecmaVersion >= 6 && !prop.computed && prop.key.type === "Identifier") {
    if (isGenerator || isAsync) { this.unexpected(); }
    this.checkUnreserved(prop.key);
    if (prop.key.name === "await" && !this.awaitIdentPos)
      { this.awaitIdentPos = startPos; }
    prop.kind = "init";
    if (isPattern) {
      prop.value = this.parseMaybeDefault(startPos, startLoc, prop.key);
    } else if (this.type === types.eq && refDestructuringErrors) {
      if (refDestructuringErrors.shorthandAssign < 0)
        { refDestructuringErrors.shorthandAssign = this.start; }
      prop.value = this.parseMaybeDefault(startPos, startLoc, prop.key);
    } else {
      prop.value = prop.key;
    }
    prop.shorthand = true;
  } else { this.unexpected(); }
};

pp$3.parsePropertyName = function(prop) {
  if (this.options.ecmaVersion >= 6) {
    if (this.eat(types.bracketL)) {
      prop.computed = true;
      prop.key = this.parseMaybeAssign();
      this.expect(types.bracketR);
      return prop.key
    } else {
      prop.computed = false;
    }
  }
  return prop.key = this.type === types.num || this.type === types.string ? this.parseExprAtom() : this.parseIdent(this.options.allowReserved !== "never")
};

// Initialize empty function node.

pp$3.initFunction = function(node) {
  node.id = null;
  if (this.options.ecmaVersion >= 6) { node.generator = node.expression = false; }
  if (this.options.ecmaVersion >= 8) { node.async = false; }
};

// Parse object or class method.

pp$3.parseMethod = function(isGenerator, isAsync, allowDirectSuper) {
  var node = this.startNode(), oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;

  this.initFunction(node);
  if (this.options.ecmaVersion >= 6)
    { node.generator = isGenerator; }
  if (this.options.ecmaVersion >= 8)
    { node.async = !!isAsync; }

  this.yieldPos = 0;
  this.awaitPos = 0;
  this.awaitIdentPos = 0;
  this.enterScope(functionFlags(isAsync, node.generator) | SCOPE_SUPER | (allowDirectSuper ? SCOPE_DIRECT_SUPER : 0));

  this.expect(types.parenL);
  node.params = this.parseBindingList(types.parenR, false, this.options.ecmaVersion >= 8);
  this.checkYieldAwaitInDefaultParams();
  this.parseFunctionBody(node, false, true);

  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.awaitIdentPos = oldAwaitIdentPos;
  return this.finishNode(node, "FunctionExpression")
};

// Parse arrow function expression with given parameters.

pp$3.parseArrowExpression = function(node, params, isAsync) {
  var oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;

  this.enterScope(functionFlags(isAsync, false) | SCOPE_ARROW);
  this.initFunction(node);
  if (this.options.ecmaVersion >= 8) { node.async = !!isAsync; }

  this.yieldPos = 0;
  this.awaitPos = 0;
  this.awaitIdentPos = 0;

  node.params = this.toAssignableList(params, true);
  this.parseFunctionBody(node, true, false);

  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.awaitIdentPos = oldAwaitIdentPos;
  return this.finishNode(node, "ArrowFunctionExpression")
};

// Parse function body and check parameters.

pp$3.parseFunctionBody = function(node, isArrowFunction, isMethod) {
  var isExpression = isArrowFunction && this.type !== types.braceL;
  var oldStrict = this.strict, useStrict = false;

  if (isExpression) {
    node.body = this.parseMaybeAssign();
    node.expression = true;
    this.checkParams(node, false);
  } else {
    var nonSimple = this.options.ecmaVersion >= 7 && !this.isSimpleParamList(node.params);
    if (!oldStrict || nonSimple) {
      useStrict = this.strictDirective(this.end);
      // If this is a strict mode function, verify that argument names
      // are not repeated, and it does not try to bind the words `eval`
      // or `arguments`.
      if (useStrict && nonSimple)
        { this.raiseRecoverable(node.start, "Illegal 'use strict' directive in function with non-simple parameter list"); }
    }
    // Start a new scope with regard to labels and the `inFunction`
    // flag (restore them to their old value afterwards).
    var oldLabels = this.labels;
    this.labels = [];
    if (useStrict) { this.strict = true; }

    // Add the params to varDeclaredNames to ensure that an error is thrown
    // if a let/const declaration in the function clashes with one of the params.
    this.checkParams(node, !oldStrict && !useStrict && !isArrowFunction && !isMethod && this.isSimpleParamList(node.params));
    node.body = this.parseBlock(false);
    node.expression = false;
    this.adaptDirectivePrologue(node.body.body);
    this.labels = oldLabels;
  }
  this.exitScope();

  // Ensure the function name isn't a forbidden identifier in strict mode, e.g. 'eval'
  if (this.strict && node.id) { this.checkLVal(node.id, BIND_OUTSIDE); }
  this.strict = oldStrict;
};

pp$3.isSimpleParamList = function(params) {
  for (var i = 0, list = params; i < list.length; i += 1)
    {
    var param = list[i];

    if (param.type !== "Identifier") { return false
  } }
  return true
};

// Checks function params for various disallowed patterns such as using "eval"
// or "arguments" and duplicate parameters.

pp$3.checkParams = function(node, allowDuplicates) {
  var nameHash = {};
  for (var i = 0, list = node.params; i < list.length; i += 1)
    {
    var param = list[i];

    this.checkLVal(param, BIND_VAR, allowDuplicates ? null : nameHash);
  }
};

// Parses a comma-separated list of expressions, and returns them as
// an array. `close` is the token type that ends the list, and
// `allowEmpty` can be turned on to allow subsequent commas with
// nothing in between them to be parsed as `null` (which is needed
// for array literals).

pp$3.parseExprList = function(close, allowTrailingComma, allowEmpty, refDestructuringErrors) {
  var elts = [], first = true;
  while (!this.eat(close)) {
    if (!first) {
      this.expect(types.comma);
      if (allowTrailingComma && this.afterTrailingComma(close)) { break }
    } else { first = false; }

    var elt = (void 0);
    if (allowEmpty && this.type === types.comma)
      { elt = null; }
    else if (this.type === types.ellipsis) {
      elt = this.parseSpread(refDestructuringErrors);
      if (refDestructuringErrors && this.type === types.comma && refDestructuringErrors.trailingComma < 0)
        { refDestructuringErrors.trailingComma = this.start; }
    } else {
      elt = this.parseMaybeAssign(false, refDestructuringErrors);
    }
    elts.push(elt);
  }
  return elts
};

pp$3.checkUnreserved = function(ref) {
  var start = ref.start;
  var end = ref.end;
  var name = ref.name;

  if (this.inGenerator && name === "yield")
    { this.raiseRecoverable(start, "Cannot use 'yield' as identifier inside a generator"); }
  if (this.inAsync && name === "await")
    { this.raiseRecoverable(start, "Cannot use 'await' as identifier inside an async function"); }
  if (this.keywords.test(name))
    { this.raise(start, ("Unexpected keyword '" + name + "'")); }
  if (this.options.ecmaVersion < 6 &&
    this.input.slice(start, end).indexOf("\\") !== -1) { return }
  var re = this.strict ? this.reservedWordsStrict : this.reservedWords;
  if (re.test(name)) {
    if (!this.inAsync && name === "await")
      { this.raiseRecoverable(start, "Cannot use keyword 'await' outside an async function"); }
    this.raiseRecoverable(start, ("The keyword '" + name + "' is reserved"));
  }
};

// Parse the next token as an identifier. If `liberal` is true (used
// when parsing properties), it will also convert keywords into
// identifiers.

pp$3.parseIdent = function(liberal, isBinding) {
  var node = this.startNode();
  if (this.type === types.name) {
    node.name = this.value;
  } else if (this.type.keyword) {
    node.name = this.type.keyword;

    // To fix https://github.com/acornjs/acorn/issues/575
    // `class` and `function` keywords push new context into this.context.
    // But there is no chance to pop the context if the keyword is consumed as an identifier such as a property name.
    // If the previous token is a dot, this does not apply because the context-managing code already ignored the keyword
    if ((node.name === "class" || node.name === "function") &&
        (this.lastTokEnd !== this.lastTokStart + 1 || this.input.charCodeAt(this.lastTokStart) !== 46)) {
      this.context.pop();
    }
  } else {
    this.unexpected();
  }
  this.next(!!liberal);
  this.finishNode(node, "Identifier");
  if (!liberal) {
    this.checkUnreserved(node);
    if (node.name === "await" && !this.awaitIdentPos)
      { this.awaitIdentPos = node.start; }
  }
  return node
};

// Parses yield expression inside generator.

pp$3.parseYield = function(noIn) {
  if (!this.yieldPos) { this.yieldPos = this.start; }

  var node = this.startNode();
  this.next();
  if (this.type === types.semi || this.canInsertSemicolon() || (this.type !== types.star && !this.type.startsExpr)) {
    node.delegate = false;
    node.argument = null;
  } else {
    node.delegate = this.eat(types.star);
    node.argument = this.parseMaybeAssign(noIn);
  }
  return this.finishNode(node, "YieldExpression")
};

pp$3.parseAwait = function() {
  if (!this.awaitPos) { this.awaitPos = this.start; }

  var node = this.startNode();
  this.next();
  node.argument = this.parseMaybeUnary(null, false);
  return this.finishNode(node, "AwaitExpression")
};

var pp$4 = Parser.prototype;

// This function is used to raise exceptions on parse errors. It
// takes an offset integer (into the current `input`) to indicate
// the location of the error, attaches the position to the end
// of the error message, and then raises a `SyntaxError` with that
// message.

pp$4.raise = function(pos, message) {
  var loc = getLineInfo(this.input, pos);
  message += " (" + loc.line + ":" + loc.column + ")";
  var err = new SyntaxError(message);
  err.pos = pos; err.loc = loc; err.raisedAt = this.pos;
  throw err
};

pp$4.raiseRecoverable = pp$4.raise;

pp$4.curPosition = function() {
  if (this.options.locations) {
    return new Position(this.curLine, this.pos - this.lineStart)
  }
};

var pp$5 = Parser.prototype;

var Scope = function Scope(flags) {
  this.flags = flags;
  // A list of var-declared names in the current lexical scope
  this.var = [];
  // A list of lexically-declared names in the current lexical scope
  this.lexical = [];
  // A list of lexically-declared FunctionDeclaration names in the current lexical scope
  this.functions = [];
};

// The functions in this module keep track of declared variables in the current scope in order to detect duplicate variable names.

pp$5.enterScope = function(flags) {
  this.scopeStack.push(new Scope(flags));
};

pp$5.exitScope = function() {
  this.scopeStack.pop();
};

// The spec says:
// > At the top level of a function, or script, function declarations are
// > treated like var declarations rather than like lexical declarations.
pp$5.treatFunctionsAsVarInScope = function(scope) {
  return (scope.flags & SCOPE_FUNCTION) || !this.inModule && (scope.flags & SCOPE_TOP)
};

pp$5.declareName = function(name, bindingType, pos) {
  var redeclared = false;
  if (bindingType === BIND_LEXICAL) {
    var scope = this.currentScope();
    redeclared = scope.lexical.indexOf(name) > -1 || scope.functions.indexOf(name) > -1 || scope.var.indexOf(name) > -1;
    scope.lexical.push(name);
    if (this.inModule && (scope.flags & SCOPE_TOP))
      { delete this.undefinedExports[name]; }
  } else if (bindingType === BIND_SIMPLE_CATCH) {
    var scope$1 = this.currentScope();
    scope$1.lexical.push(name);
  } else if (bindingType === BIND_FUNCTION) {
    var scope$2 = this.currentScope();
    if (this.treatFunctionsAsVar)
      { redeclared = scope$2.lexical.indexOf(name) > -1; }
    else
      { redeclared = scope$2.lexical.indexOf(name) > -1 || scope$2.var.indexOf(name) > -1; }
    scope$2.functions.push(name);
  } else {
    for (var i = this.scopeStack.length - 1; i >= 0; --i) {
      var scope$3 = this.scopeStack[i];
      if (scope$3.lexical.indexOf(name) > -1 && !((scope$3.flags & SCOPE_SIMPLE_CATCH) && scope$3.lexical[0] === name) ||
          !this.treatFunctionsAsVarInScope(scope$3) && scope$3.functions.indexOf(name) > -1) {
        redeclared = true;
        break
      }
      scope$3.var.push(name);
      if (this.inModule && (scope$3.flags & SCOPE_TOP))
        { delete this.undefinedExports[name]; }
      if (scope$3.flags & SCOPE_VAR) { break }
    }
  }
  if (redeclared) { this.raiseRecoverable(pos, ("Identifier '" + name + "' has already been declared")); }
};

pp$5.checkLocalExport = function(id) {
  // scope.functions must be empty as Module code is always strict.
  if (this.scopeStack[0].lexical.indexOf(id.name) === -1 &&
      this.scopeStack[0].var.indexOf(id.name) === -1) {
    this.undefinedExports[id.name] = id;
  }
};

pp$5.currentScope = function() {
  return this.scopeStack[this.scopeStack.length - 1]
};

pp$5.currentVarScope = function() {
  for (var i = this.scopeStack.length - 1;; i--) {
    var scope = this.scopeStack[i];
    if (scope.flags & SCOPE_VAR) { return scope }
  }
};

// Could be useful for `this`, `new.target`, `super()`, `super.property`, and `super[property]`.
pp$5.currentThisScope = function() {
  for (var i = this.scopeStack.length - 1;; i--) {
    var scope = this.scopeStack[i];
    if (scope.flags & SCOPE_VAR && !(scope.flags & SCOPE_ARROW)) { return scope }
  }
};

var Node = function Node(parser, pos, loc) {
  this.type = "";
  this.start = pos;
  this.end = 0;
  if (parser.options.locations)
    { this.loc = new SourceLocation(parser, loc); }
  if (parser.options.directSourceFile)
    { this.sourceFile = parser.options.directSourceFile; }
  if (parser.options.ranges)
    { this.range = [pos, 0]; }
};

// Start an AST node, attaching a start offset.

var pp$6 = Parser.prototype;

pp$6.startNode = function() {
  return new Node(this, this.start, this.startLoc)
};

pp$6.startNodeAt = function(pos, loc) {
  return new Node(this, pos, loc)
};

// Finish an AST node, adding `type` and `end` properties.

function finishNodeAt(node, type, pos, loc) {
  node.type = type;
  node.end = pos;
  if (this.options.locations)
    { node.loc.end = loc; }
  if (this.options.ranges)
    { node.range[1] = pos; }
  return node
}

pp$6.finishNode = function(node, type) {
  return finishNodeAt.call(this, node, type, this.lastTokEnd, this.lastTokEndLoc)
};

// Finish node at given position

pp$6.finishNodeAt = function(node, type, pos, loc) {
  return finishNodeAt.call(this, node, type, pos, loc)
};

// The algorithm used to determine whether a regexp can appear at a

var TokContext = function TokContext(token, isExpr, preserveSpace, override, generator) {
  this.token = token;
  this.isExpr = !!isExpr;
  this.preserveSpace = !!preserveSpace;
  this.override = override;
  this.generator = !!generator;
};

var types$1 = {
  b_stat: new TokContext("{", false),
  b_expr: new TokContext("{", true),
  b_tmpl: new TokContext("${", false),
  p_stat: new TokContext("(", false),
  p_expr: new TokContext("(", true),
  q_tmpl: new TokContext("`", true, true, function (p) { return p.tryReadTemplateToken(); }),
  f_stat: new TokContext("function", false),
  f_expr: new TokContext("function", true),
  f_expr_gen: new TokContext("function", true, false, null, true),
  f_gen: new TokContext("function", false, false, null, true)
};

var pp$7 = Parser.prototype;

pp$7.initialContext = function() {
  return [types$1.b_stat]
};

pp$7.braceIsBlock = function(prevType) {
  var parent = this.curContext();
  if (parent === types$1.f_expr || parent === types$1.f_stat)
    { return true }
  if (prevType === types.colon && (parent === types$1.b_stat || parent === types$1.b_expr))
    { return !parent.isExpr }

  // The check for `tt.name && exprAllowed` detects whether we are
  // after a `yield` or `of` construct. See the `updateContext` for
  // `tt.name`.
  if (prevType === types._return || prevType === types.name && this.exprAllowed)
    { return lineBreak.test(this.input.slice(this.lastTokEnd, this.start)) }
  if (prevType === types._else || prevType === types.semi || prevType === types.eof || prevType === types.parenR || prevType === types.arrow)
    { return true }
  if (prevType === types.braceL)
    { return parent === types$1.b_stat }
  if (prevType === types._var || prevType === types._const || prevType === types.name)
    { return false }
  return !this.exprAllowed
};

pp$7.inGeneratorContext = function() {
  for (var i = this.context.length - 1; i >= 1; i--) {
    var context = this.context[i];
    if (context.token === "function")
      { return context.generator }
  }
  return false
};

pp$7.updateContext = function(prevType) {
  var update, type = this.type;
  if (type.keyword && prevType === types.dot)
    { this.exprAllowed = false; }
  else if (update = type.updateContext)
    { update.call(this, prevType); }
  else
    { this.exprAllowed = type.beforeExpr; }
};

// Token-specific context update code

types.parenR.updateContext = types.braceR.updateContext = function() {
  if (this.context.length === 1) {
    this.exprAllowed = true;
    return
  }
  var out = this.context.pop();
  if (out === types$1.b_stat && this.curContext().token === "function") {
    out = this.context.pop();
  }
  this.exprAllowed = !out.isExpr;
};

types.braceL.updateContext = function(prevType) {
  this.context.push(this.braceIsBlock(prevType) ? types$1.b_stat : types$1.b_expr);
  this.exprAllowed = true;
};

types.dollarBraceL.updateContext = function() {
  this.context.push(types$1.b_tmpl);
  this.exprAllowed = true;
};

types.parenL.updateContext = function(prevType) {
  var statementParens = prevType === types._if || prevType === types._for || prevType === types._with || prevType === types._while;
  this.context.push(statementParens ? types$1.p_stat : types$1.p_expr);
  this.exprAllowed = true;
};

types.incDec.updateContext = function() {
  // tokExprAllowed stays unchanged
};

types._function.updateContext = types._class.updateContext = function(prevType) {
  if (prevType.beforeExpr && prevType !== types.semi && prevType !== types._else &&
      !(prevType === types._return && lineBreak.test(this.input.slice(this.lastTokEnd, this.start))) &&
      !((prevType === types.colon || prevType === types.braceL) && this.curContext() === types$1.b_stat))
    { this.context.push(types$1.f_expr); }
  else
    { this.context.push(types$1.f_stat); }
  this.exprAllowed = false;
};

types.backQuote.updateContext = function() {
  if (this.curContext() === types$1.q_tmpl)
    { this.context.pop(); }
  else
    { this.context.push(types$1.q_tmpl); }
  this.exprAllowed = false;
};

types.star.updateContext = function(prevType) {
  if (prevType === types._function) {
    var index = this.context.length - 1;
    if (this.context[index] === types$1.f_expr)
      { this.context[index] = types$1.f_expr_gen; }
    else
      { this.context[index] = types$1.f_gen; }
  }
  this.exprAllowed = true;
};

types.name.updateContext = function(prevType) {
  var allowed = false;
  if (this.options.ecmaVersion >= 6 && prevType !== types.dot) {
    if (this.value === "of" && !this.exprAllowed ||
        this.value === "yield" && this.inGeneratorContext())
      { allowed = true; }
  }
  this.exprAllowed = allowed;
};

// This file contains Unicode properties extracted from the ECMAScript
// specification. The lists are extracted like so:
// $$('#table-binary-unicode-properties > figure > table > tbody > tr > td:nth-child(1) code').map(el => el.innerText)

// #table-binary-unicode-properties
var ecma9BinaryProperties = "ASCII ASCII_Hex_Digit AHex Alphabetic Alpha Any Assigned Bidi_Control Bidi_C Bidi_Mirrored Bidi_M Case_Ignorable CI Cased Changes_When_Casefolded CWCF Changes_When_Casemapped CWCM Changes_When_Lowercased CWL Changes_When_NFKC_Casefolded CWKCF Changes_When_Titlecased CWT Changes_When_Uppercased CWU Dash Default_Ignorable_Code_Point DI Deprecated Dep Diacritic Dia Emoji Emoji_Component Emoji_Modifier Emoji_Modifier_Base Emoji_Presentation Extender Ext Grapheme_Base Gr_Base Grapheme_Extend Gr_Ext Hex_Digit Hex IDS_Binary_Operator IDSB IDS_Trinary_Operator IDST ID_Continue IDC ID_Start IDS Ideographic Ideo Join_Control Join_C Logical_Order_Exception LOE Lowercase Lower Math Noncharacter_Code_Point NChar Pattern_Syntax Pat_Syn Pattern_White_Space Pat_WS Quotation_Mark QMark Radical Regional_Indicator RI Sentence_Terminal STerm Soft_Dotted SD Terminal_Punctuation Term Unified_Ideograph UIdeo Uppercase Upper Variation_Selector VS White_Space space XID_Continue XIDC XID_Start XIDS";
var ecma10BinaryProperties = ecma9BinaryProperties + " Extended_Pictographic";
var ecma11BinaryProperties = ecma10BinaryProperties;
var unicodeBinaryProperties = {
  9: ecma9BinaryProperties,
  10: ecma10BinaryProperties,
  11: ecma11BinaryProperties
};

// #table-unicode-general-category-values
var unicodeGeneralCategoryValues = "Cased_Letter LC Close_Punctuation Pe Connector_Punctuation Pc Control Cc cntrl Currency_Symbol Sc Dash_Punctuation Pd Decimal_Number Nd digit Enclosing_Mark Me Final_Punctuation Pf Format Cf Initial_Punctuation Pi Letter L Letter_Number Nl Line_Separator Zl Lowercase_Letter Ll Mark M Combining_Mark Math_Symbol Sm Modifier_Letter Lm Modifier_Symbol Sk Nonspacing_Mark Mn Number N Open_Punctuation Ps Other C Other_Letter Lo Other_Number No Other_Punctuation Po Other_Symbol So Paragraph_Separator Zp Private_Use Co Punctuation P punct Separator Z Space_Separator Zs Spacing_Mark Mc Surrogate Cs Symbol S Titlecase_Letter Lt Unassigned Cn Uppercase_Letter Lu";

// #table-unicode-script-values
var ecma9ScriptValues = "Adlam Adlm Ahom Ahom Anatolian_Hieroglyphs Hluw Arabic Arab Armenian Armn Avestan Avst Balinese Bali Bamum Bamu Bassa_Vah Bass Batak Batk Bengali Beng Bhaiksuki Bhks Bopomofo Bopo Brahmi Brah Braille Brai Buginese Bugi Buhid Buhd Canadian_Aboriginal Cans Carian Cari Caucasian_Albanian Aghb Chakma Cakm Cham Cham Cherokee Cher Common Zyyy Coptic Copt Qaac Cuneiform Xsux Cypriot Cprt Cyrillic Cyrl Deseret Dsrt Devanagari Deva Duployan Dupl Egyptian_Hieroglyphs Egyp Elbasan Elba Ethiopic Ethi Georgian Geor Glagolitic Glag Gothic Goth Grantha Gran Greek Grek Gujarati Gujr Gurmukhi Guru Han Hani Hangul Hang Hanunoo Hano Hatran Hatr Hebrew Hebr Hiragana Hira Imperial_Aramaic Armi Inherited Zinh Qaai Inscriptional_Pahlavi Phli Inscriptional_Parthian Prti Javanese Java Kaithi Kthi Kannada Knda Katakana Kana Kayah_Li Kali Kharoshthi Khar Khmer Khmr Khojki Khoj Khudawadi Sind Lao Laoo Latin Latn Lepcha Lepc Limbu Limb Linear_A Lina Linear_B Linb Lisu Lisu Lycian Lyci Lydian Lydi Mahajani Mahj Malayalam Mlym Mandaic Mand Manichaean Mani Marchen Marc Masaram_Gondi Gonm Meetei_Mayek Mtei Mende_Kikakui Mend Meroitic_Cursive Merc Meroitic_Hieroglyphs Mero Miao Plrd Modi Modi Mongolian Mong Mro Mroo Multani Mult Myanmar Mymr Nabataean Nbat New_Tai_Lue Talu Newa Newa Nko Nkoo Nushu Nshu Ogham Ogam Ol_Chiki Olck Old_Hungarian Hung Old_Italic Ital Old_North_Arabian Narb Old_Permic Perm Old_Persian Xpeo Old_South_Arabian Sarb Old_Turkic Orkh Oriya Orya Osage Osge Osmanya Osma Pahawh_Hmong Hmng Palmyrene Palm Pau_Cin_Hau Pauc Phags_Pa Phag Phoenician Phnx Psalter_Pahlavi Phlp Rejang Rjng Runic Runr Samaritan Samr Saurashtra Saur Sharada Shrd Shavian Shaw Siddham Sidd SignWriting Sgnw Sinhala Sinh Sora_Sompeng Sora Soyombo Soyo Sundanese Sund Syloti_Nagri Sylo Syriac Syrc Tagalog Tglg Tagbanwa Tagb Tai_Le Tale Tai_Tham Lana Tai_Viet Tavt Takri Takr Tamil Taml Tangut Tang Telugu Telu Thaana Thaa Thai Thai Tibetan Tibt Tifinagh Tfng Tirhuta Tirh Ugaritic Ugar Vai Vaii Warang_Citi Wara Yi Yiii Zanabazar_Square Zanb";
var ecma10ScriptValues = ecma9ScriptValues + " Dogra Dogr Gunjala_Gondi Gong Hanifi_Rohingya Rohg Makasar Maka Medefaidrin Medf Old_Sogdian Sogo Sogdian Sogd";
var ecma11ScriptValues = ecma10ScriptValues + " Elymaic Elym Nandinagari Nand Nyiakeng_Puachue_Hmong Hmnp Wancho Wcho";
var unicodeScriptValues = {
  9: ecma9ScriptValues,
  10: ecma10ScriptValues,
  11: ecma11ScriptValues
};

var data = {};
function buildUnicodeData(ecmaVersion) {
  var d = data[ecmaVersion] = {
    binary: wordsRegexp(unicodeBinaryProperties[ecmaVersion] + " " + unicodeGeneralCategoryValues),
    nonBinary: {
      General_Category: wordsRegexp(unicodeGeneralCategoryValues),
      Script: wordsRegexp(unicodeScriptValues[ecmaVersion])
    }
  };
  d.nonBinary.Script_Extensions = d.nonBinary.Script;

  d.nonBinary.gc = d.nonBinary.General_Category;
  d.nonBinary.sc = d.nonBinary.Script;
  d.nonBinary.scx = d.nonBinary.Script_Extensions;
}
buildUnicodeData(9);
buildUnicodeData(10);
buildUnicodeData(11);

var pp$8 = Parser.prototype;

var RegExpValidationState = function RegExpValidationState(parser) {
  this.parser = parser;
  this.validFlags = "gim" + (parser.options.ecmaVersion >= 6 ? "uy" : "") + (parser.options.ecmaVersion >= 9 ? "s" : "");
  this.unicodeProperties = data[parser.options.ecmaVersion >= 11 ? 11 : parser.options.ecmaVersion];
  this.source = "";
  this.flags = "";
  this.start = 0;
  this.switchU = false;
  this.switchN = false;
  this.pos = 0;
  this.lastIntValue = 0;
  this.lastStringValue = "";
  this.lastAssertionIsQuantifiable = false;
  this.numCapturingParens = 0;
  this.maxBackReference = 0;
  this.groupNames = [];
  this.backReferenceNames = [];
};

RegExpValidationState.prototype.reset = function reset (start, pattern, flags) {
  var unicode = flags.indexOf("u") !== -1;
  this.start = start | 0;
  this.source = pattern + "";
  this.flags = flags;
  this.switchU = unicode && this.parser.options.ecmaVersion >= 6;
  this.switchN = unicode && this.parser.options.ecmaVersion >= 9;
};

RegExpValidationState.prototype.raise = function raise (message) {
  this.parser.raiseRecoverable(this.start, ("Invalid regular expression: /" + (this.source) + "/: " + message));
};

// If u flag is given, this returns the code point at the index (it combines a surrogate pair).
// Otherwise, this returns the code unit of the index (can be a part of a surrogate pair).
RegExpValidationState.prototype.at = function at (i) {
  var s = this.source;
  var l = s.length;
  if (i >= l) {
    return -1
  }
  var c = s.charCodeAt(i);
  if (!this.switchU || c <= 0xD7FF || c >= 0xE000 || i + 1 >= l) {
    return c
  }
  var next = s.charCodeAt(i + 1);
  return next >= 0xDC00 && next <= 0xDFFF ? (c << 10) + next - 0x35FDC00 : c
};

RegExpValidationState.prototype.nextIndex = function nextIndex (i) {
  var s = this.source;
  var l = s.length;
  if (i >= l) {
    return l
  }
  var c = s.charCodeAt(i), next;
  if (!this.switchU || c <= 0xD7FF || c >= 0xE000 || i + 1 >= l ||
      (next = s.charCodeAt(i + 1)) < 0xDC00 || next > 0xDFFF) {
    return i + 1
  }
  return i + 2
};

RegExpValidationState.prototype.current = function current () {
  return this.at(this.pos)
};

RegExpValidationState.prototype.lookahead = function lookahead () {
  return this.at(this.nextIndex(this.pos))
};

RegExpValidationState.prototype.advance = function advance () {
  this.pos = this.nextIndex(this.pos);
};

RegExpValidationState.prototype.eat = function eat (ch) {
  if (this.current() === ch) {
    this.advance();
    return true
  }
  return false
};

function codePointToString(ch) {
  if (ch <= 0xFFFF) { return String.fromCharCode(ch) }
  ch -= 0x10000;
  return String.fromCharCode((ch >> 10) + 0xD800, (ch & 0x03FF) + 0xDC00)
}

/**
 * Validate the flags part of a given RegExpLiteral.
 *
 * @param {RegExpValidationState} state The state to validate RegExp.
 * @returns {void}
 */
pp$8.validateRegExpFlags = function(state) {
  var validFlags = state.validFlags;
  var flags = state.flags;

  for (var i = 0; i < flags.length; i++) {
    var flag = flags.charAt(i);
    if (validFlags.indexOf(flag) === -1) {
      this.raise(state.start, "Invalid regular expression flag");
    }
    if (flags.indexOf(flag, i + 1) > -1) {
      this.raise(state.start, "Duplicate regular expression flag");
    }
  }
};

/**
 * Validate the pattern part of a given RegExpLiteral.
 *
 * @param {RegExpValidationState} state The state to validate RegExp.
 * @returns {void}
 */
pp$8.validateRegExpPattern = function(state) {
  this.regexp_pattern(state);

  // The goal symbol for the parse is |Pattern[~U, ~N]|. If the result of
  // parsing contains a |GroupName|, reparse with the goal symbol
  // |Pattern[~U, +N]| and use this result instead. Throw a *SyntaxError*
  // exception if _P_ did not conform to the grammar, if any elements of _P_
  // were not matched by the parse, or if any Early Error conditions exist.
  if (!state.switchN && this.options.ecmaVersion >= 9 && state.groupNames.length > 0) {
    state.switchN = true;
    this.regexp_pattern(state);
  }
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-Pattern
pp$8.regexp_pattern = function(state) {
  state.pos = 0;
  state.lastIntValue = 0;
  state.lastStringValue = "";
  state.lastAssertionIsQuantifiable = false;
  state.numCapturingParens = 0;
  state.maxBackReference = 0;
  state.groupNames.length = 0;
  state.backReferenceNames.length = 0;

  this.regexp_disjunction(state);

  if (state.pos !== state.source.length) {
    // Make the same messages as V8.
    if (state.eat(0x29 /* ) */)) {
      state.raise("Unmatched ')'");
    }
    if (state.eat(0x5D /* ] */) || state.eat(0x7D /* } */)) {
      state.raise("Lone quantifier brackets");
    }
  }
  if (state.maxBackReference > state.numCapturingParens) {
    state.raise("Invalid escape");
  }
  for (var i = 0, list = state.backReferenceNames; i < list.length; i += 1) {
    var name = list[i];

    if (state.groupNames.indexOf(name) === -1) {
      state.raise("Invalid named capture referenced");
    }
  }
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-Disjunction
pp$8.regexp_disjunction = function(state) {
  this.regexp_alternative(state);
  while (state.eat(0x7C /* | */)) {
    this.regexp_alternative(state);
  }

  // Make the same message as V8.
  if (this.regexp_eatQuantifier(state, true)) {
    state.raise("Nothing to repeat");
  }
  if (state.eat(0x7B /* { */)) {
    state.raise("Lone quantifier brackets");
  }
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-Alternative
pp$8.regexp_alternative = function(state) {
  while (state.pos < state.source.length && this.regexp_eatTerm(state))
    { }
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-Term
pp$8.regexp_eatTerm = function(state) {
  if (this.regexp_eatAssertion(state)) {
    // Handle `QuantifiableAssertion Quantifier` alternative.
    // `state.lastAssertionIsQuantifiable` is true if the last eaten Assertion
    // is a QuantifiableAssertion.
    if (state.lastAssertionIsQuantifiable && this.regexp_eatQuantifier(state)) {
      // Make the same message as V8.
      if (state.switchU) {
        state.raise("Invalid quantifier");
      }
    }
    return true
  }

  if (state.switchU ? this.regexp_eatAtom(state) : this.regexp_eatExtendedAtom(state)) {
    this.regexp_eatQuantifier(state);
    return true
  }

  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-Assertion
pp$8.regexp_eatAssertion = function(state) {
  var start = state.pos;
  state.lastAssertionIsQuantifiable = false;

  // ^, $
  if (state.eat(0x5E /* ^ */) || state.eat(0x24 /* $ */)) {
    return true
  }

  // \b \B
  if (state.eat(0x5C /* \ */)) {
    if (state.eat(0x42 /* B */) || state.eat(0x62 /* b */)) {
      return true
    }
    state.pos = start;
  }

  // Lookahead / Lookbehind
  if (state.eat(0x28 /* ( */) && state.eat(0x3F /* ? */)) {
    var lookbehind = false;
    if (this.options.ecmaVersion >= 9) {
      lookbehind = state.eat(0x3C /* < */);
    }
    if (state.eat(0x3D /* = */) || state.eat(0x21 /* ! */)) {
      this.regexp_disjunction(state);
      if (!state.eat(0x29 /* ) */)) {
        state.raise("Unterminated group");
      }
      state.lastAssertionIsQuantifiable = !lookbehind;
      return true
    }
  }

  state.pos = start;
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-Quantifier
pp$8.regexp_eatQuantifier = function(state, noError) {
  if ( noError === void 0 ) noError = false;

  if (this.regexp_eatQuantifierPrefix(state, noError)) {
    state.eat(0x3F /* ? */);
    return true
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-QuantifierPrefix
pp$8.regexp_eatQuantifierPrefix = function(state, noError) {
  return (
    state.eat(0x2A /* * */) ||
    state.eat(0x2B /* + */) ||
    state.eat(0x3F /* ? */) ||
    this.regexp_eatBracedQuantifier(state, noError)
  )
};
pp$8.regexp_eatBracedQuantifier = function(state, noError) {
  var start = state.pos;
  if (state.eat(0x7B /* { */)) {
    var min = 0, max = -1;
    if (this.regexp_eatDecimalDigits(state)) {
      min = state.lastIntValue;
      if (state.eat(0x2C /* , */) && this.regexp_eatDecimalDigits(state)) {
        max = state.lastIntValue;
      }
      if (state.eat(0x7D /* } */)) {
        // SyntaxError in https://www.ecma-international.org/ecma-262/8.0/#sec-term
        if (max !== -1 && max < min && !noError) {
          state.raise("numbers out of order in {} quantifier");
        }
        return true
      }
    }
    if (state.switchU && !noError) {
      state.raise("Incomplete quantifier");
    }
    state.pos = start;
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-Atom
pp$8.regexp_eatAtom = function(state) {
  return (
    this.regexp_eatPatternCharacters(state) ||
    state.eat(0x2E /* . */) ||
    this.regexp_eatReverseSolidusAtomEscape(state) ||
    this.regexp_eatCharacterClass(state) ||
    this.regexp_eatUncapturingGroup(state) ||
    this.regexp_eatCapturingGroup(state)
  )
};
pp$8.regexp_eatReverseSolidusAtomEscape = function(state) {
  var start = state.pos;
  if (state.eat(0x5C /* \ */)) {
    if (this.regexp_eatAtomEscape(state)) {
      return true
    }
    state.pos = start;
  }
  return false
};
pp$8.regexp_eatUncapturingGroup = function(state) {
  var start = state.pos;
  if (state.eat(0x28 /* ( */)) {
    if (state.eat(0x3F /* ? */) && state.eat(0x3A /* : */)) {
      this.regexp_disjunction(state);
      if (state.eat(0x29 /* ) */)) {
        return true
      }
      state.raise("Unterminated group");
    }
    state.pos = start;
  }
  return false
};
pp$8.regexp_eatCapturingGroup = function(state) {
  if (state.eat(0x28 /* ( */)) {
    if (this.options.ecmaVersion >= 9) {
      this.regexp_groupSpecifier(state);
    } else if (state.current() === 0x3F /* ? */) {
      state.raise("Invalid group");
    }
    this.regexp_disjunction(state);
    if (state.eat(0x29 /* ) */)) {
      state.numCapturingParens += 1;
      return true
    }
    state.raise("Unterminated group");
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ExtendedAtom
pp$8.regexp_eatExtendedAtom = function(state) {
  return (
    state.eat(0x2E /* . */) ||
    this.regexp_eatReverseSolidusAtomEscape(state) ||
    this.regexp_eatCharacterClass(state) ||
    this.regexp_eatUncapturingGroup(state) ||
    this.regexp_eatCapturingGroup(state) ||
    this.regexp_eatInvalidBracedQuantifier(state) ||
    this.regexp_eatExtendedPatternCharacter(state)
  )
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-InvalidBracedQuantifier
pp$8.regexp_eatInvalidBracedQuantifier = function(state) {
  if (this.regexp_eatBracedQuantifier(state, true)) {
    state.raise("Nothing to repeat");
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-SyntaxCharacter
pp$8.regexp_eatSyntaxCharacter = function(state) {
  var ch = state.current();
  if (isSyntaxCharacter(ch)) {
    state.lastIntValue = ch;
    state.advance();
    return true
  }
  return false
};
function isSyntaxCharacter(ch) {
  return (
    ch === 0x24 /* $ */ ||
    ch >= 0x28 /* ( */ && ch <= 0x2B /* + */ ||
    ch === 0x2E /* . */ ||
    ch === 0x3F /* ? */ ||
    ch >= 0x5B /* [ */ && ch <= 0x5E /* ^ */ ||
    ch >= 0x7B /* { */ && ch <= 0x7D /* } */
  )
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-PatternCharacter
// But eat eager.
pp$8.regexp_eatPatternCharacters = function(state) {
  var start = state.pos;
  var ch = 0;
  while ((ch = state.current()) !== -1 && !isSyntaxCharacter(ch)) {
    state.advance();
  }
  return state.pos !== start
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ExtendedPatternCharacter
pp$8.regexp_eatExtendedPatternCharacter = function(state) {
  var ch = state.current();
  if (
    ch !== -1 &&
    ch !== 0x24 /* $ */ &&
    !(ch >= 0x28 /* ( */ && ch <= 0x2B /* + */) &&
    ch !== 0x2E /* . */ &&
    ch !== 0x3F /* ? */ &&
    ch !== 0x5B /* [ */ &&
    ch !== 0x5E /* ^ */ &&
    ch !== 0x7C /* | */
  ) {
    state.advance();
    return true
  }
  return false
};

// GroupSpecifier[U] ::
//   [empty]
//   `?` GroupName[?U]
pp$8.regexp_groupSpecifier = function(state) {
  if (state.eat(0x3F /* ? */)) {
    if (this.regexp_eatGroupName(state)) {
      if (state.groupNames.indexOf(state.lastStringValue) !== -1) {
        state.raise("Duplicate capture group name");
      }
      state.groupNames.push(state.lastStringValue);
      return
    }
    state.raise("Invalid group");
  }
};

// GroupName[U] ::
//   `<` RegExpIdentifierName[?U] `>`
// Note: this updates `state.lastStringValue` property with the eaten name.
pp$8.regexp_eatGroupName = function(state) {
  state.lastStringValue = "";
  if (state.eat(0x3C /* < */)) {
    if (this.regexp_eatRegExpIdentifierName(state) && state.eat(0x3E /* > */)) {
      return true
    }
    state.raise("Invalid capture group name");
  }
  return false
};

// RegExpIdentifierName[U] ::
//   RegExpIdentifierStart[?U]
//   RegExpIdentifierName[?U] RegExpIdentifierPart[?U]
// Note: this updates `state.lastStringValue` property with the eaten name.
pp$8.regexp_eatRegExpIdentifierName = function(state) {
  state.lastStringValue = "";
  if (this.regexp_eatRegExpIdentifierStart(state)) {
    state.lastStringValue += codePointToString(state.lastIntValue);
    while (this.regexp_eatRegExpIdentifierPart(state)) {
      state.lastStringValue += codePointToString(state.lastIntValue);
    }
    return true
  }
  return false
};

// RegExpIdentifierStart[U] ::
//   UnicodeIDStart
//   `$`
//   `_`
//   `\` RegExpUnicodeEscapeSequence[?U]
pp$8.regexp_eatRegExpIdentifierStart = function(state) {
  var start = state.pos;
  var ch = state.current();
  state.advance();

  if (ch === 0x5C /* \ */ && this.regexp_eatRegExpUnicodeEscapeSequence(state)) {
    ch = state.lastIntValue;
  }
  if (isRegExpIdentifierStart(ch)) {
    state.lastIntValue = ch;
    return true
  }

  state.pos = start;
  return false
};
function isRegExpIdentifierStart(ch) {
  return isIdentifierStart(ch, true) || ch === 0x24 /* $ */ || ch === 0x5F /* _ */
}

// RegExpIdentifierPart[U] ::
//   UnicodeIDContinue
//   `$`
//   `_`
//   `\` RegExpUnicodeEscapeSequence[?U]
//   <ZWNJ>
//   <ZWJ>
pp$8.regexp_eatRegExpIdentifierPart = function(state) {
  var start = state.pos;
  var ch = state.current();
  state.advance();

  if (ch === 0x5C /* \ */ && this.regexp_eatRegExpUnicodeEscapeSequence(state)) {
    ch = state.lastIntValue;
  }
  if (isRegExpIdentifierPart(ch)) {
    state.lastIntValue = ch;
    return true
  }

  state.pos = start;
  return false
};
function isRegExpIdentifierPart(ch) {
  return isIdentifierChar(ch, true) || ch === 0x24 /* $ */ || ch === 0x5F /* _ */ || ch === 0x200C /* <ZWNJ> */ || ch === 0x200D /* <ZWJ> */
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-AtomEscape
pp$8.regexp_eatAtomEscape = function(state) {
  if (
    this.regexp_eatBackReference(state) ||
    this.regexp_eatCharacterClassEscape(state) ||
    this.regexp_eatCharacterEscape(state) ||
    (state.switchN && this.regexp_eatKGroupName(state))
  ) {
    return true
  }
  if (state.switchU) {
    // Make the same message as V8.
    if (state.current() === 0x63 /* c */) {
      state.raise("Invalid unicode escape");
    }
    state.raise("Invalid escape");
  }
  return false
};
pp$8.regexp_eatBackReference = function(state) {
  var start = state.pos;
  if (this.regexp_eatDecimalEscape(state)) {
    var n = state.lastIntValue;
    if (state.switchU) {
      // For SyntaxError in https://www.ecma-international.org/ecma-262/8.0/#sec-atomescape
      if (n > state.maxBackReference) {
        state.maxBackReference = n;
      }
      return true
    }
    if (n <= state.numCapturingParens) {
      return true
    }
    state.pos = start;
  }
  return false
};
pp$8.regexp_eatKGroupName = function(state) {
  if (state.eat(0x6B /* k */)) {
    if (this.regexp_eatGroupName(state)) {
      state.backReferenceNames.push(state.lastStringValue);
      return true
    }
    state.raise("Invalid named reference");
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-CharacterEscape
pp$8.regexp_eatCharacterEscape = function(state) {
  return (
    this.regexp_eatControlEscape(state) ||
    this.regexp_eatCControlLetter(state) ||
    this.regexp_eatZero(state) ||
    this.regexp_eatHexEscapeSequence(state) ||
    this.regexp_eatRegExpUnicodeEscapeSequence(state) ||
    (!state.switchU && this.regexp_eatLegacyOctalEscapeSequence(state)) ||
    this.regexp_eatIdentityEscape(state)
  )
};
pp$8.regexp_eatCControlLetter = function(state) {
  var start = state.pos;
  if (state.eat(0x63 /* c */)) {
    if (this.regexp_eatControlLetter(state)) {
      return true
    }
    state.pos = start;
  }
  return false
};
pp$8.regexp_eatZero = function(state) {
  if (state.current() === 0x30 /* 0 */ && !isDecimalDigit(state.lookahead())) {
    state.lastIntValue = 0;
    state.advance();
    return true
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-ControlEscape
pp$8.regexp_eatControlEscape = function(state) {
  var ch = state.current();
  if (ch === 0x74 /* t */) {
    state.lastIntValue = 0x09; /* \t */
    state.advance();
    return true
  }
  if (ch === 0x6E /* n */) {
    state.lastIntValue = 0x0A; /* \n */
    state.advance();
    return true
  }
  if (ch === 0x76 /* v */) {
    state.lastIntValue = 0x0B; /* \v */
    state.advance();
    return true
  }
  if (ch === 0x66 /* f */) {
    state.lastIntValue = 0x0C; /* \f */
    state.advance();
    return true
  }
  if (ch === 0x72 /* r */) {
    state.lastIntValue = 0x0D; /* \r */
    state.advance();
    return true
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-ControlLetter
pp$8.regexp_eatControlLetter = function(state) {
  var ch = state.current();
  if (isControlLetter(ch)) {
    state.lastIntValue = ch % 0x20;
    state.advance();
    return true
  }
  return false
};
function isControlLetter(ch) {
  return (
    (ch >= 0x41 /* A */ && ch <= 0x5A /* Z */) ||
    (ch >= 0x61 /* a */ && ch <= 0x7A /* z */)
  )
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-RegExpUnicodeEscapeSequence
pp$8.regexp_eatRegExpUnicodeEscapeSequence = function(state) {
  var start = state.pos;

  if (state.eat(0x75 /* u */)) {
    if (this.regexp_eatFixedHexDigits(state, 4)) {
      var lead = state.lastIntValue;
      if (state.switchU && lead >= 0xD800 && lead <= 0xDBFF) {
        var leadSurrogateEnd = state.pos;
        if (state.eat(0x5C /* \ */) && state.eat(0x75 /* u */) && this.regexp_eatFixedHexDigits(state, 4)) {
          var trail = state.lastIntValue;
          if (trail >= 0xDC00 && trail <= 0xDFFF) {
            state.lastIntValue = (lead - 0xD800) * 0x400 + (trail - 0xDC00) + 0x10000;
            return true
          }
        }
        state.pos = leadSurrogateEnd;
        state.lastIntValue = lead;
      }
      return true
    }
    if (
      state.switchU &&
      state.eat(0x7B /* { */) &&
      this.regexp_eatHexDigits(state) &&
      state.eat(0x7D /* } */) &&
      isValidUnicode(state.lastIntValue)
    ) {
      return true
    }
    if (state.switchU) {
      state.raise("Invalid unicode escape");
    }
    state.pos = start;
  }

  return false
};
function isValidUnicode(ch) {
  return ch >= 0 && ch <= 0x10FFFF
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-IdentityEscape
pp$8.regexp_eatIdentityEscape = function(state) {
  if (state.switchU) {
    if (this.regexp_eatSyntaxCharacter(state)) {
      return true
    }
    if (state.eat(0x2F /* / */)) {
      state.lastIntValue = 0x2F; /* / */
      return true
    }
    return false
  }

  var ch = state.current();
  if (ch !== 0x63 /* c */ && (!state.switchN || ch !== 0x6B /* k */)) {
    state.lastIntValue = ch;
    state.advance();
    return true
  }

  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-DecimalEscape
pp$8.regexp_eatDecimalEscape = function(state) {
  state.lastIntValue = 0;
  var ch = state.current();
  if (ch >= 0x31 /* 1 */ && ch <= 0x39 /* 9 */) {
    do {
      state.lastIntValue = 10 * state.lastIntValue + (ch - 0x30 /* 0 */);
      state.advance();
    } while ((ch = state.current()) >= 0x30 /* 0 */ && ch <= 0x39 /* 9 */)
    return true
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-CharacterClassEscape
pp$8.regexp_eatCharacterClassEscape = function(state) {
  var ch = state.current();

  if (isCharacterClassEscape(ch)) {
    state.lastIntValue = -1;
    state.advance();
    return true
  }

  if (
    state.switchU &&
    this.options.ecmaVersion >= 9 &&
    (ch === 0x50 /* P */ || ch === 0x70 /* p */)
  ) {
    state.lastIntValue = -1;
    state.advance();
    if (
      state.eat(0x7B /* { */) &&
      this.regexp_eatUnicodePropertyValueExpression(state) &&
      state.eat(0x7D /* } */)
    ) {
      return true
    }
    state.raise("Invalid property name");
  }

  return false
};
function isCharacterClassEscape(ch) {
  return (
    ch === 0x64 /* d */ ||
    ch === 0x44 /* D */ ||
    ch === 0x73 /* s */ ||
    ch === 0x53 /* S */ ||
    ch === 0x77 /* w */ ||
    ch === 0x57 /* W */
  )
}

// UnicodePropertyValueExpression ::
//   UnicodePropertyName `=` UnicodePropertyValue
//   LoneUnicodePropertyNameOrValue
pp$8.regexp_eatUnicodePropertyValueExpression = function(state) {
  var start = state.pos;

  // UnicodePropertyName `=` UnicodePropertyValue
  if (this.regexp_eatUnicodePropertyName(state) && state.eat(0x3D /* = */)) {
    var name = state.lastStringValue;
    if (this.regexp_eatUnicodePropertyValue(state)) {
      var value = state.lastStringValue;
      this.regexp_validateUnicodePropertyNameAndValue(state, name, value);
      return true
    }
  }
  state.pos = start;

  // LoneUnicodePropertyNameOrValue
  if (this.regexp_eatLoneUnicodePropertyNameOrValue(state)) {
    var nameOrValue = state.lastStringValue;
    this.regexp_validateUnicodePropertyNameOrValue(state, nameOrValue);
    return true
  }
  return false
};
pp$8.regexp_validateUnicodePropertyNameAndValue = function(state, name, value) {
  if (!has(state.unicodeProperties.nonBinary, name))
    { state.raise("Invalid property name"); }
  if (!state.unicodeProperties.nonBinary[name].test(value))
    { state.raise("Invalid property value"); }
};
pp$8.regexp_validateUnicodePropertyNameOrValue = function(state, nameOrValue) {
  if (!state.unicodeProperties.binary.test(nameOrValue))
    { state.raise("Invalid property name"); }
};

// UnicodePropertyName ::
//   UnicodePropertyNameCharacters
pp$8.regexp_eatUnicodePropertyName = function(state) {
  var ch = 0;
  state.lastStringValue = "";
  while (isUnicodePropertyNameCharacter(ch = state.current())) {
    state.lastStringValue += codePointToString(ch);
    state.advance();
  }
  return state.lastStringValue !== ""
};
function isUnicodePropertyNameCharacter(ch) {
  return isControlLetter(ch) || ch === 0x5F /* _ */
}

// UnicodePropertyValue ::
//   UnicodePropertyValueCharacters
pp$8.regexp_eatUnicodePropertyValue = function(state) {
  var ch = 0;
  state.lastStringValue = "";
  while (isUnicodePropertyValueCharacter(ch = state.current())) {
    state.lastStringValue += codePointToString(ch);
    state.advance();
  }
  return state.lastStringValue !== ""
};
function isUnicodePropertyValueCharacter(ch) {
  return isUnicodePropertyNameCharacter(ch) || isDecimalDigit(ch)
}

// LoneUnicodePropertyNameOrValue ::
//   UnicodePropertyValueCharacters
pp$8.regexp_eatLoneUnicodePropertyNameOrValue = function(state) {
  return this.regexp_eatUnicodePropertyValue(state)
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-CharacterClass
pp$8.regexp_eatCharacterClass = function(state) {
  if (state.eat(0x5B /* [ */)) {
    state.eat(0x5E /* ^ */);
    this.regexp_classRanges(state);
    if (state.eat(0x5D /* ] */)) {
      return true
    }
    // Unreachable since it threw "unterminated regular expression" error before.
    state.raise("Unterminated character class");
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-ClassRanges
// https://www.ecma-international.org/ecma-262/8.0/#prod-NonemptyClassRanges
// https://www.ecma-international.org/ecma-262/8.0/#prod-NonemptyClassRangesNoDash
pp$8.regexp_classRanges = function(state) {
  while (this.regexp_eatClassAtom(state)) {
    var left = state.lastIntValue;
    if (state.eat(0x2D /* - */) && this.regexp_eatClassAtom(state)) {
      var right = state.lastIntValue;
      if (state.switchU && (left === -1 || right === -1)) {
        state.raise("Invalid character class");
      }
      if (left !== -1 && right !== -1 && left > right) {
        state.raise("Range out of order in character class");
      }
    }
  }
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-ClassAtom
// https://www.ecma-international.org/ecma-262/8.0/#prod-ClassAtomNoDash
pp$8.regexp_eatClassAtom = function(state) {
  var start = state.pos;

  if (state.eat(0x5C /* \ */)) {
    if (this.regexp_eatClassEscape(state)) {
      return true
    }
    if (state.switchU) {
      // Make the same message as V8.
      var ch$1 = state.current();
      if (ch$1 === 0x63 /* c */ || isOctalDigit(ch$1)) {
        state.raise("Invalid class escape");
      }
      state.raise("Invalid escape");
    }
    state.pos = start;
  }

  var ch = state.current();
  if (ch !== 0x5D /* ] */) {
    state.lastIntValue = ch;
    state.advance();
    return true
  }

  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ClassEscape
pp$8.regexp_eatClassEscape = function(state) {
  var start = state.pos;

  if (state.eat(0x62 /* b */)) {
    state.lastIntValue = 0x08; /* <BS> */
    return true
  }

  if (state.switchU && state.eat(0x2D /* - */)) {
    state.lastIntValue = 0x2D; /* - */
    return true
  }

  if (!state.switchU && state.eat(0x63 /* c */)) {
    if (this.regexp_eatClassControlLetter(state)) {
      return true
    }
    state.pos = start;
  }

  return (
    this.regexp_eatCharacterClassEscape(state) ||
    this.regexp_eatCharacterEscape(state)
  )
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ClassControlLetter
pp$8.regexp_eatClassControlLetter = function(state) {
  var ch = state.current();
  if (isDecimalDigit(ch) || ch === 0x5F /* _ */) {
    state.lastIntValue = ch % 0x20;
    state.advance();
    return true
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-HexEscapeSequence
pp$8.regexp_eatHexEscapeSequence = function(state) {
  var start = state.pos;
  if (state.eat(0x78 /* x */)) {
    if (this.regexp_eatFixedHexDigits(state, 2)) {
      return true
    }
    if (state.switchU) {
      state.raise("Invalid escape");
    }
    state.pos = start;
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-DecimalDigits
pp$8.regexp_eatDecimalDigits = function(state) {
  var start = state.pos;
  var ch = 0;
  state.lastIntValue = 0;
  while (isDecimalDigit(ch = state.current())) {
    state.lastIntValue = 10 * state.lastIntValue + (ch - 0x30 /* 0 */);
    state.advance();
  }
  return state.pos !== start
};
function isDecimalDigit(ch) {
  return ch >= 0x30 /* 0 */ && ch <= 0x39 /* 9 */
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-HexDigits
pp$8.regexp_eatHexDigits = function(state) {
  var start = state.pos;
  var ch = 0;
  state.lastIntValue = 0;
  while (isHexDigit(ch = state.current())) {
    state.lastIntValue = 16 * state.lastIntValue + hexToInt(ch);
    state.advance();
  }
  return state.pos !== start
};
function isHexDigit(ch) {
  return (
    (ch >= 0x30 /* 0 */ && ch <= 0x39 /* 9 */) ||
    (ch >= 0x41 /* A */ && ch <= 0x46 /* F */) ||
    (ch >= 0x61 /* a */ && ch <= 0x66 /* f */)
  )
}
function hexToInt(ch) {
  if (ch >= 0x41 /* A */ && ch <= 0x46 /* F */) {
    return 10 + (ch - 0x41 /* A */)
  }
  if (ch >= 0x61 /* a */ && ch <= 0x66 /* f */) {
    return 10 + (ch - 0x61 /* a */)
  }
  return ch - 0x30 /* 0 */
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-LegacyOctalEscapeSequence
// Allows only 0-377(octal) i.e. 0-255(decimal).
pp$8.regexp_eatLegacyOctalEscapeSequence = function(state) {
  if (this.regexp_eatOctalDigit(state)) {
    var n1 = state.lastIntValue;
    if (this.regexp_eatOctalDigit(state)) {
      var n2 = state.lastIntValue;
      if (n1 <= 3 && this.regexp_eatOctalDigit(state)) {
        state.lastIntValue = n1 * 64 + n2 * 8 + state.lastIntValue;
      } else {
        state.lastIntValue = n1 * 8 + n2;
      }
    } else {
      state.lastIntValue = n1;
    }
    return true
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-OctalDigit
pp$8.regexp_eatOctalDigit = function(state) {
  var ch = state.current();
  if (isOctalDigit(ch)) {
    state.lastIntValue = ch - 0x30; /* 0 */
    state.advance();
    return true
  }
  state.lastIntValue = 0;
  return false
};
function isOctalDigit(ch) {
  return ch >= 0x30 /* 0 */ && ch <= 0x37 /* 7 */
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-Hex4Digits
// https://www.ecma-international.org/ecma-262/8.0/#prod-HexDigit
// And HexDigit HexDigit in https://www.ecma-international.org/ecma-262/8.0/#prod-HexEscapeSequence
pp$8.regexp_eatFixedHexDigits = function(state, length) {
  var start = state.pos;
  state.lastIntValue = 0;
  for (var i = 0; i < length; ++i) {
    var ch = state.current();
    if (!isHexDigit(ch)) {
      state.pos = start;
      return false
    }
    state.lastIntValue = 16 * state.lastIntValue + hexToInt(ch);
    state.advance();
  }
  return true
};

// Object type used to represent tokens. Note that normally, tokens
// simply exist as properties on the parser object. This is only
// used for the onToken callback and the external tokenizer.

var Token = function Token(p) {
  this.type = p.type;
  this.value = p.value;
  this.start = p.start;
  this.end = p.end;
  if (p.options.locations)
    { this.loc = new SourceLocation(p, p.startLoc, p.endLoc); }
  if (p.options.ranges)
    { this.range = [p.start, p.end]; }
};

// ## Tokenizer

var pp$9 = Parser.prototype;

// Move to the next token

pp$9.next = function(ignoreEscapeSequenceInKeyword) {
  if (!ignoreEscapeSequenceInKeyword && this.type.keyword && this.containsEsc)
    { this.raiseRecoverable(this.start, "Escape sequence in keyword " + this.type.keyword); }
  if (this.options.onToken)
    { this.options.onToken(new Token(this)); }

  this.lastTokEnd = this.end;
  this.lastTokStart = this.start;
  this.lastTokEndLoc = this.endLoc;
  this.lastTokStartLoc = this.startLoc;
  this.nextToken();
};

pp$9.getToken = function() {
  this.next();
  return new Token(this)
};

// If we're in an ES6 environment, make parsers iterable
if (typeof Symbol !== "undefined")
  { pp$9[Symbol.iterator] = function() {
    var this$1 = this;

    return {
      next: function () {
        var token = this$1.getToken();
        return {
          done: token.type === types.eof,
          value: token
        }
      }
    }
  }; }

// Toggle strict mode. Re-reads the next number or string to please
// pedantic tests (`"use strict"; 010;` should fail).

pp$9.curContext = function() {
  return this.context[this.context.length - 1]
};

// Read a single token, updating the parser object's token-related
// properties.

pp$9.nextToken = function() {
  var curContext = this.curContext();
  if (!curContext || !curContext.preserveSpace) { this.skipSpace(); }

  this.start = this.pos;
  if (this.options.locations) { this.startLoc = this.curPosition(); }
  if (this.pos >= this.input.length) { return this.finishToken(types.eof) }

  if (curContext.override) { return curContext.override(this) }
  else { this.readToken(this.fullCharCodeAtPos()); }
};

pp$9.readToken = function(code) {
  // Identifier or keyword. '\uXXXX' sequences are allowed in
  // identifiers, so '\' also dispatches to that.
  if (isIdentifierStart(code, this.options.ecmaVersion >= 6) || code === 92 /* '\' */)
    { return this.readWord() }

  return this.getTokenFromCode(code)
};

pp$9.fullCharCodeAtPos = function() {
  var code = this.input.charCodeAt(this.pos);
  if (code <= 0xd7ff || code >= 0xe000) { return code }
  var next = this.input.charCodeAt(this.pos + 1);
  return (code << 10) + next - 0x35fdc00
};

pp$9.skipBlockComment = function() {
  var startLoc = this.options.onComment && this.curPosition();
  var start = this.pos, end = this.input.indexOf("*/", this.pos += 2);
  if (end === -1) { this.raise(this.pos - 2, "Unterminated comment"); }
  this.pos = end + 2;
  if (this.options.locations) {
    lineBreakG.lastIndex = start;
    var match;
    while ((match = lineBreakG.exec(this.input)) && match.index < this.pos) {
      ++this.curLine;
      this.lineStart = match.index + match[0].length;
    }
  }
  if (this.options.onComment)
    { this.options.onComment(true, this.input.slice(start + 2, end), start, this.pos,
                           startLoc, this.curPosition()); }
};

pp$9.skipLineComment = function(startSkip) {
  var start = this.pos;
  var startLoc = this.options.onComment && this.curPosition();
  var ch = this.input.charCodeAt(this.pos += startSkip);
  while (this.pos < this.input.length && !isNewLine(ch)) {
    ch = this.input.charCodeAt(++this.pos);
  }
  if (this.options.onComment)
    { this.options.onComment(false, this.input.slice(start + startSkip, this.pos), start, this.pos,
                           startLoc, this.curPosition()); }
};

// Called at the start of the parse and after every token. Skips
// whitespace and comments, and.

pp$9.skipSpace = function() {
  loop: while (this.pos < this.input.length) {
    var ch = this.input.charCodeAt(this.pos);
    switch (ch) {
    case 32: case 160: // ' '
      ++this.pos;
      break
    case 13:
      if (this.input.charCodeAt(this.pos + 1) === 10) {
        ++this.pos;
      }
    case 10: case 8232: case 8233:
      ++this.pos;
      if (this.options.locations) {
        ++this.curLine;
        this.lineStart = this.pos;
      }
      break
    case 47: // '/'
      switch (this.input.charCodeAt(this.pos + 1)) {
      case 42: // '*'
        this.skipBlockComment();
        break
      case 47:
        this.skipLineComment(2);
        break
      default:
        break loop
      }
      break
    default:
      if (ch > 8 && ch < 14 || ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
        ++this.pos;
      } else {
        break loop
      }
    }
  }
};

// Called at the end of every token. Sets `end`, `val`, and
// maintains `context` and `exprAllowed`, and skips the space after
// the token, so that the next one's `start` will point at the
// right position.

pp$9.finishToken = function(type, val) {
  this.end = this.pos;
  if (this.options.locations) { this.endLoc = this.curPosition(); }
  var prevType = this.type;
  this.type = type;
  this.value = val;

  this.updateContext(prevType);
};

// ### Token reading

// This is the function that is called to fetch the next token. It
// is somewhat obscure, because it works in character codes rather
// than characters, and because operator parsing has been inlined
// into it.
//
// All in the name of speed.
//
pp$9.readToken_dot = function() {
  var next = this.input.charCodeAt(this.pos + 1);
  if (next >= 48 && next <= 57) { return this.readNumber(true) }
  var next2 = this.input.charCodeAt(this.pos + 2);
  if (this.options.ecmaVersion >= 6 && next === 46 && next2 === 46) { // 46 = dot '.'
    this.pos += 3;
    return this.finishToken(types.ellipsis)
  } else {
    ++this.pos;
    return this.finishToken(types.dot)
  }
};

pp$9.readToken_slash = function() { // '/'
  var next = this.input.charCodeAt(this.pos + 1);
  if (this.exprAllowed) { ++this.pos; return this.readRegexp() }
  if (next === 61) { return this.finishOp(types.assign, 2) }
  return this.finishOp(types.slash, 1)
};

pp$9.readToken_mult_modulo_exp = function(code) { // '%*'
  var next = this.input.charCodeAt(this.pos + 1);
  var size = 1;
  var tokentype = code === 42 ? types.star : types.modulo;

  // exponentiation operator ** and **=
  if (this.options.ecmaVersion >= 7 && code === 42 && next === 42) {
    ++size;
    tokentype = types.starstar;
    next = this.input.charCodeAt(this.pos + 2);
  }

  if (next === 61) { return this.finishOp(types.assign, size + 1) }
  return this.finishOp(tokentype, size)
};

pp$9.readToken_pipe_amp = function(code) { // '|&'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === code) { return this.finishOp(code === 124 ? types.logicalOR : types.logicalAND, 2) }
  if (next === 61) { return this.finishOp(types.assign, 2) }
  return this.finishOp(code === 124 ? types.bitwiseOR : types.bitwiseAND, 1)
};

pp$9.readToken_caret = function() { // '^'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === 61) { return this.finishOp(types.assign, 2) }
  return this.finishOp(types.bitwiseXOR, 1)
};

pp$9.readToken_plus_min = function(code) { // '+-'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === code) {
    if (next === 45 && !this.inModule && this.input.charCodeAt(this.pos + 2) === 62 &&
        (this.lastTokEnd === 0 || lineBreak.test(this.input.slice(this.lastTokEnd, this.pos)))) {
      // A `-->` line comment
      this.skipLineComment(3);
      this.skipSpace();
      return this.nextToken()
    }
    return this.finishOp(types.incDec, 2)
  }
  if (next === 61) { return this.finishOp(types.assign, 2) }
  return this.finishOp(types.plusMin, 1)
};

pp$9.readToken_lt_gt = function(code) { // '<>'
  var next = this.input.charCodeAt(this.pos + 1);
  var size = 1;
  if (next === code) {
    size = code === 62 && this.input.charCodeAt(this.pos + 2) === 62 ? 3 : 2;
    if (this.input.charCodeAt(this.pos + size) === 61) { return this.finishOp(types.assign, size + 1) }
    return this.finishOp(types.bitShift, size)
  }
  if (next === 33 && code === 60 && !this.inModule && this.input.charCodeAt(this.pos + 2) === 45 &&
      this.input.charCodeAt(this.pos + 3) === 45) {
    // `<!--`, an XML-style comment that should be interpreted as a line comment
    this.skipLineComment(4);
    this.skipSpace();
    return this.nextToken()
  }
  if (next === 61) { size = 2; }
  return this.finishOp(types.relational, size)
};

pp$9.readToken_eq_excl = function(code) { // '=!'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === 61) { return this.finishOp(types.equality, this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2) }
  if (code === 61 && next === 62 && this.options.ecmaVersion >= 6) { // '=>'
    this.pos += 2;
    return this.finishToken(types.arrow)
  }
  return this.finishOp(code === 61 ? types.eq : types.prefix, 1)
};

pp$9.getTokenFromCode = function(code) {
  switch (code) {
  // The interpretation of a dot depends on whether it is followed
  // by a digit or another two dots.
  case 46: // '.'
    return this.readToken_dot()

  // Punctuation tokens.
  case 40: ++this.pos; return this.finishToken(types.parenL)
  case 41: ++this.pos; return this.finishToken(types.parenR)
  case 59: ++this.pos; return this.finishToken(types.semi)
  case 44: ++this.pos; return this.finishToken(types.comma)
  case 91: ++this.pos; return this.finishToken(types.bracketL)
  case 93: ++this.pos; return this.finishToken(types.bracketR)
  case 123: ++this.pos; return this.finishToken(types.braceL)
  case 125: ++this.pos; return this.finishToken(types.braceR)
  case 58: ++this.pos; return this.finishToken(types.colon)
  case 63: ++this.pos; return this.finishToken(types.question)

  case 96: // '`'
    if (this.options.ecmaVersion < 6) { break }
    ++this.pos;
    return this.finishToken(types.backQuote)

  case 48: // '0'
    var next = this.input.charCodeAt(this.pos + 1);
    if (next === 120 || next === 88) { return this.readRadixNumber(16) } // '0x', '0X' - hex number
    if (this.options.ecmaVersion >= 6) {
      if (next === 111 || next === 79) { return this.readRadixNumber(8) } // '0o', '0O' - octal number
      if (next === 98 || next === 66) { return this.readRadixNumber(2) } // '0b', '0B' - binary number
    }

  // Anything else beginning with a digit is an integer, octal
  // number, or float.
  case 49: case 50: case 51: case 52: case 53: case 54: case 55: case 56: case 57: // 1-9
    return this.readNumber(false)

  // Quotes produce strings.
  case 34: case 39: // '"', "'"
    return this.readString(code)

  // Operators are parsed inline in tiny state machines. '=' (61) is
  // often referred to. `finishOp` simply skips the amount of
  // characters it is given as second argument, and returns a token
  // of the type given by its first argument.

  case 47: // '/'
    return this.readToken_slash()

  case 37: case 42: // '%*'
    return this.readToken_mult_modulo_exp(code)

  case 124: case 38: // '|&'
    return this.readToken_pipe_amp(code)

  case 94: // '^'
    return this.readToken_caret()

  case 43: case 45: // '+-'
    return this.readToken_plus_min(code)

  case 60: case 62: // '<>'
    return this.readToken_lt_gt(code)

  case 61: case 33: // '=!'
    return this.readToken_eq_excl(code)

  case 126: // '~'
    return this.finishOp(types.prefix, 1)
  }

  this.raise(this.pos, "Unexpected character '" + codePointToString$1(code) + "'");
};

pp$9.finishOp = function(type, size) {
  var str = this.input.slice(this.pos, this.pos + size);
  this.pos += size;
  return this.finishToken(type, str)
};

pp$9.readRegexp = function() {
  var escaped, inClass, start = this.pos;
  for (;;) {
    if (this.pos >= this.input.length) { this.raise(start, "Unterminated regular expression"); }
    var ch = this.input.charAt(this.pos);
    if (lineBreak.test(ch)) { this.raise(start, "Unterminated regular expression"); }
    if (!escaped) {
      if (ch === "[") { inClass = true; }
      else if (ch === "]" && inClass) { inClass = false; }
      else if (ch === "/" && !inClass) { break }
      escaped = ch === "\\";
    } else { escaped = false; }
    ++this.pos;
  }
  var pattern = this.input.slice(start, this.pos);
  ++this.pos;
  var flagsStart = this.pos;
  var flags = this.readWord1();
  if (this.containsEsc) { this.unexpected(flagsStart); }

  // Validate pattern
  var state = this.regexpState || (this.regexpState = new RegExpValidationState(this));
  state.reset(start, pattern, flags);
  this.validateRegExpFlags(state);
  this.validateRegExpPattern(state);

  // Create Literal#value property value.
  var value = null;
  try {
    value = new RegExp(pattern, flags);
  } catch (e) {
    // ESTree requires null if it failed to instantiate RegExp object.
    // https://github.com/estree/estree/blob/a27003adf4fd7bfad44de9cef372a2eacd527b1c/es5.md#regexpliteral
  }

  return this.finishToken(types.regexp, {pattern: pattern, flags: flags, value: value})
};

// Read an integer in the given radix. Return null if zero digits
// were read, the integer value otherwise. When `len` is given, this
// will return `null` unless the integer has exactly `len` digits.

pp$9.readInt = function(radix, len) {
  var start = this.pos, total = 0;
  for (var i = 0, e = len == null ? Infinity : len; i < e; ++i) {
    var code = this.input.charCodeAt(this.pos), val = (void 0);
    if (code >= 97) { val = code - 97 + 10; } // a
    else if (code >= 65) { val = code - 65 + 10; } // A
    else if (code >= 48 && code <= 57) { val = code - 48; } // 0-9
    else { val = Infinity; }
    if (val >= radix) { break }
    ++this.pos;
    total = total * radix + val;
  }
  if (this.pos === start || len != null && this.pos - start !== len) { return null }

  return total
};

pp$9.readRadixNumber = function(radix) {
  var start = this.pos;
  this.pos += 2; // 0x
  var val = this.readInt(radix);
  if (val == null) { this.raise(this.start + 2, "Expected number in radix " + radix); }
  if (this.options.ecmaVersion >= 11 && this.input.charCodeAt(this.pos) === 110) {
    val = typeof BigInt !== "undefined" ? BigInt(this.input.slice(start, this.pos)) : null;
    ++this.pos;
  } else if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }
  return this.finishToken(types.num, val)
};

// Read an integer, octal integer, or floating-point number.

pp$9.readNumber = function(startsWithDot) {
  var start = this.pos;
  if (!startsWithDot && this.readInt(10) === null) { this.raise(start, "Invalid number"); }
  var octal = this.pos - start >= 2 && this.input.charCodeAt(start) === 48;
  if (octal && this.strict) { this.raise(start, "Invalid number"); }
  var next = this.input.charCodeAt(this.pos);
  if (!octal && !startsWithDot && this.options.ecmaVersion >= 11 && next === 110) {
    var str$1 = this.input.slice(start, this.pos);
    var val$1 = typeof BigInt !== "undefined" ? BigInt(str$1) : null;
    ++this.pos;
    if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }
    return this.finishToken(types.num, val$1)
  }
  if (octal && /[89]/.test(this.input.slice(start, this.pos))) { octal = false; }
  if (next === 46 && !octal) { // '.'
    ++this.pos;
    this.readInt(10);
    next = this.input.charCodeAt(this.pos);
  }
  if ((next === 69 || next === 101) && !octal) { // 'eE'
    next = this.input.charCodeAt(++this.pos);
    if (next === 43 || next === 45) { ++this.pos; } // '+-'
    if (this.readInt(10) === null) { this.raise(start, "Invalid number"); }
  }
  if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }

  var str = this.input.slice(start, this.pos);
  var val = octal ? parseInt(str, 8) : parseFloat(str);
  return this.finishToken(types.num, val)
};

// Read a string value, interpreting backslash-escapes.

pp$9.readCodePoint = function() {
  var ch = this.input.charCodeAt(this.pos), code;

  if (ch === 123) { // '{'
    if (this.options.ecmaVersion < 6) { this.unexpected(); }
    var codePos = ++this.pos;
    code = this.readHexChar(this.input.indexOf("}", this.pos) - this.pos);
    ++this.pos;
    if (code > 0x10FFFF) { this.invalidStringToken(codePos, "Code point out of bounds"); }
  } else {
    code = this.readHexChar(4);
  }
  return code
};

function codePointToString$1(code) {
  // UTF-16 Decoding
  if (code <= 0xFFFF) { return String.fromCharCode(code) }
  code -= 0x10000;
  return String.fromCharCode((code >> 10) + 0xD800, (code & 1023) + 0xDC00)
}

pp$9.readString = function(quote) {
  var out = "", chunkStart = ++this.pos;
  for (;;) {
    if (this.pos >= this.input.length) { this.raise(this.start, "Unterminated string constant"); }
    var ch = this.input.charCodeAt(this.pos);
    if (ch === quote) { break }
    if (ch === 92) { // '\'
      out += this.input.slice(chunkStart, this.pos);
      out += this.readEscapedChar(false);
      chunkStart = this.pos;
    } else {
      if (isNewLine(ch, this.options.ecmaVersion >= 10)) { this.raise(this.start, "Unterminated string constant"); }
      ++this.pos;
    }
  }
  out += this.input.slice(chunkStart, this.pos++);
  return this.finishToken(types.string, out)
};

// Reads template string tokens.

var INVALID_TEMPLATE_ESCAPE_ERROR = {};

pp$9.tryReadTemplateToken = function() {
  this.inTemplateElement = true;
  try {
    this.readTmplToken();
  } catch (err) {
    if (err === INVALID_TEMPLATE_ESCAPE_ERROR) {
      this.readInvalidTemplateToken();
    } else {
      throw err
    }
  }

  this.inTemplateElement = false;
};

pp$9.invalidStringToken = function(position, message) {
  if (this.inTemplateElement && this.options.ecmaVersion >= 9) {
    throw INVALID_TEMPLATE_ESCAPE_ERROR
  } else {
    this.raise(position, message);
  }
};

pp$9.readTmplToken = function() {
  var out = "", chunkStart = this.pos;
  for (;;) {
    if (this.pos >= this.input.length) { this.raise(this.start, "Unterminated template"); }
    var ch = this.input.charCodeAt(this.pos);
    if (ch === 96 || ch === 36 && this.input.charCodeAt(this.pos + 1) === 123) { // '`', '${'
      if (this.pos === this.start && (this.type === types.template || this.type === types.invalidTemplate)) {
        if (ch === 36) {
          this.pos += 2;
          return this.finishToken(types.dollarBraceL)
        } else {
          ++this.pos;
          return this.finishToken(types.backQuote)
        }
      }
      out += this.input.slice(chunkStart, this.pos);
      return this.finishToken(types.template, out)
    }
    if (ch === 92) { // '\'
      out += this.input.slice(chunkStart, this.pos);
      out += this.readEscapedChar(true);
      chunkStart = this.pos;
    } else if (isNewLine(ch)) {
      out += this.input.slice(chunkStart, this.pos);
      ++this.pos;
      switch (ch) {
      case 13:
        if (this.input.charCodeAt(this.pos) === 10) { ++this.pos; }
      case 10:
        out += "\n";
        break
      default:
        out += String.fromCharCode(ch);
        break
      }
      if (this.options.locations) {
        ++this.curLine;
        this.lineStart = this.pos;
      }
      chunkStart = this.pos;
    } else {
      ++this.pos;
    }
  }
};

// Reads a template token to search for the end, without validating any escape sequences
pp$9.readInvalidTemplateToken = function() {
  for (; this.pos < this.input.length; this.pos++) {
    switch (this.input[this.pos]) {
    case "\\":
      ++this.pos;
      break

    case "$":
      if (this.input[this.pos + 1] !== "{") {
        break
      }
    // falls through

    case "`":
      return this.finishToken(types.invalidTemplate, this.input.slice(this.start, this.pos))

    // no default
    }
  }
  this.raise(this.start, "Unterminated template");
};

// Used to read escaped characters

pp$9.readEscapedChar = function(inTemplate) {
  var ch = this.input.charCodeAt(++this.pos);
  ++this.pos;
  switch (ch) {
  case 110: return "\n" // 'n' -> '\n'
  case 114: return "\r" // 'r' -> '\r'
  case 120: return String.fromCharCode(this.readHexChar(2)) // 'x'
  case 117: return codePointToString$1(this.readCodePoint()) // 'u'
  case 116: return "\t" // 't' -> '\t'
  case 98: return "\b" // 'b' -> '\b'
  case 118: return "\u000b" // 'v' -> '\u000b'
  case 102: return "\f" // 'f' -> '\f'
  case 13: if (this.input.charCodeAt(this.pos) === 10) { ++this.pos; } // '\r\n'
  case 10: // ' \n'
    if (this.options.locations) { this.lineStart = this.pos; ++this.curLine; }
    return ""
  case 56:
  case 57:
    if (inTemplate) {
      var codePos = this.pos - 1;

      this.invalidStringToken(
        codePos,
        "Invalid escape sequence in template string"
      );

      return null
    }
  default:
    if (ch >= 48 && ch <= 55) {
      var octalStr = this.input.substr(this.pos - 1, 3).match(/^[0-7]+/)[0];
      var octal = parseInt(octalStr, 8);
      if (octal > 255) {
        octalStr = octalStr.slice(0, -1);
        octal = parseInt(octalStr, 8);
      }
      this.pos += octalStr.length - 1;
      ch = this.input.charCodeAt(this.pos);
      if ((octalStr !== "0" || ch === 56 || ch === 57) && (this.strict || inTemplate)) {
        this.invalidStringToken(
          this.pos - 1 - octalStr.length,
          inTemplate
            ? "Octal literal in template string"
            : "Octal literal in strict mode"
        );
      }
      return String.fromCharCode(octal)
    }
    if (isNewLine(ch)) {
      // Unicode new line characters after \ get removed from output in both
      // template literals and strings
      return ""
    }
    return String.fromCharCode(ch)
  }
};

// Used to read character escape sequences ('\x', '\u', '\U').

pp$9.readHexChar = function(len) {
  var codePos = this.pos;
  var n = this.readInt(16, len);
  if (n === null) { this.invalidStringToken(codePos, "Bad character escape sequence"); }
  return n
};

// Read an identifier, and return it as a string. Sets `this.containsEsc`
// to whether the word contained a '\u' escape.
//
// Incrementally adds only escaped chars, adding other chunks as-is
// as a micro-optimization.

pp$9.readWord1 = function() {
  this.containsEsc = false;
  var word = "", first = true, chunkStart = this.pos;
  var astral = this.options.ecmaVersion >= 6;
  while (this.pos < this.input.length) {
    var ch = this.fullCharCodeAtPos();
    if (isIdentifierChar(ch, astral)) {
      this.pos += ch <= 0xffff ? 1 : 2;
    } else if (ch === 92) { // "\"
      this.containsEsc = true;
      word += this.input.slice(chunkStart, this.pos);
      var escStart = this.pos;
      if (this.input.charCodeAt(++this.pos) !== 117) // "u"
        { this.invalidStringToken(this.pos, "Expecting Unicode escape sequence \\uXXXX"); }
      ++this.pos;
      var esc = this.readCodePoint();
      if (!(first ? isIdentifierStart : isIdentifierChar)(esc, astral))
        { this.invalidStringToken(escStart, "Invalid Unicode escape"); }
      word += codePointToString$1(esc);
      chunkStart = this.pos;
    } else {
      break
    }
    first = false;
  }
  return word + this.input.slice(chunkStart, this.pos)
};

// Read an identifier or keyword token. Will check for reserved
// words when necessary.

pp$9.readWord = function() {
  var word = this.readWord1();
  var type = types.name;
  if (this.keywords.test(word)) {
    type = keywords$1[word];
  }
  return this.finishToken(type, word)
};

// Acorn is a tiny, fast JavaScript parser written in JavaScript.

var version = "7.1.0";

Parser.acorn = {
  Parser: Parser,
  version: version,
  defaultOptions: defaultOptions,
  Position: Position,
  SourceLocation: SourceLocation,
  getLineInfo: getLineInfo,
  Node: Node,
  TokenType: TokenType,
  tokTypes: types,
  keywordTypes: keywords$1,
  TokContext: TokContext,
  tokContexts: types$1,
  isIdentifierChar: isIdentifierChar,
  isIdentifierStart: isIdentifierStart,
  Token: Token,
  isNewLine: isNewLine,
  lineBreak: lineBreak,
  lineBreakG: lineBreakG,
  nonASCIIwhitespace: nonASCIIwhitespace
};

// The main exported interface (under `self.acorn` when in the
// browser) is a `parse` function that takes a code string and
// returns an abstract syntax tree as specified by [Mozilla parser
// API][api].
//
// [api]: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API

function parse(input, options) {
  return Parser.parse(input, options)
}

// This function tries to parse a single expression at a given
// offset in a string. Useful for parsing mixed-language formats
// that embed JavaScript expressions.

function parseExpressionAt(input, pos, options) {
  return Parser.parseExpressionAt(input, pos, options)
}

// Acorn is organized as a tokenizer and a recursive-descent parser.
// The `tokenizer` export provides an interface to the tokenizer.

function tokenizer(input, options) {
  return Parser.tokenizer(input, options)
}




/***/ }),

/***/ "./node_modules/gl/package.json":
/*!**************************************!*\
  !*** ./node_modules/gl/package.json ***!
  \**************************************/
/***/ ((module) => {

"use strict";
module.exports = JSON.parse('{"name":"gl","version":"6.0.1","description":"Creates a WebGL context without a window","main":"index.js","directories":{"test":"test"},"browser":"browser_index.js","engines":{"node":">=14.0.0"},"scripts":{"test":"standard | snazzy && tape test/*.js | faucet","rebuild":"node-gyp rebuild --verbose","prebuild":"prebuild --all --strip","install":"prebuild-install || node-gyp rebuild"},"dependencies":{"bindings":"^1.5.0","bit-twiddle":"^1.0.2","glsl-tokenizer":"^2.1.5","nan":"^2.16.0","node-abi":"^3.26.0","node-gyp":"^9.2.0","prebuild-install":"^7.1.1"},"devDependencies":{"angle-normals":"^1.0.0","bunny":"^1.0.1","faucet":"^0.0.3","gl-conformance":"^2.0.9","prebuild":"^11.0.4","snazzy":"^9.0.0","standard":"^17.0.0","tape":"^5.6.1"},"repository":{"type":"git","url":"git://github.com/stackgl/headless-gl.git"},"keywords":["webgl","opengl","gl","headless","server","gpgpu"],"author":"Mikola Lysenko","license":"BSD-2-Clause","gypfile":true}');

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/index.js");
/******/ 	var __webpack_export_target__ = window;
/******/ 	for(var i in __webpack_exports__) __webpack_export_target__[i] = __webpack_exports__[i];
/******/ 	if(__webpack_exports__.__esModule) Object.defineProperty(__webpack_export_target__, "__esModule", { value: true });
/******/ 	
/******/ })()
;
//# sourceMappingURL=gpu-browser.js.map