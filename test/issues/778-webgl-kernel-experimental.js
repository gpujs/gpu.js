const { assert, test, skip, module: describe } = require('qunit');
const { GPU } = require('../../src');

// The scenario is an environment that has OffscreenCanvas but no document —
// a Worker. A browser page cannot have its document taken away, so this can
// only be staged in Node; `global` is also not defined in a browser, which is
// what used to break the whole module there.
const isNode = typeof window === 'undefined';

const old = {};
describe('issue #778 - WebGL kernel feature checks may throw an error', {
    before: () => {
        old.document = globalThis.document;
        old.OffscreenCanvas = globalThis.OffscreenCanvas;
        
        globalThis.document = undefined;
        // Mocking OffscreenCanvas
        globalThis.OffscreenCanvas = class OffscreenCanvas {
            constructor() {}
    
            getContext(context) {
                if (context === "webgl") return;
                if (context === 'experimental-webgl') throw new TypeError("Failed to execute 'getContext' on 'OffscreenCanvas': The provided value 'experimental-webgl' is not a valid enum value of type OffscreenRenderingContextType.")
            }
        }
    },
    after: () => {
        globalThis.document = old.document;
        globalThis.OffscreenCanvas = old.OffscreenCanvas;
    }
});

(isNode ? test : skip)('Check that WebGL is not supported', () => {
    assert.notOk(GPU.isWebGLSupported);
});
