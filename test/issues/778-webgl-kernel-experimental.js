const { assert, test, module: describe } = require('qunit');
const { GPU } = require('../../src');

const old = {};
describe('issue #778 - WebGL kernel feature checks may throw an error', {
    before: () => {
        old.document = global.document;
        old.OffscreenCanvas = global.OffscreenCanvas;
        
        global.document = undefined;
        // Mocking OffscreenCanvas
        global.OffscreenCanvas = class OffscreenCanvas {
            constructor() {}
    
            getContext(context) {
                if (context === "webgl") return;
                if (context === 'experimental-webgl') throw new TypeError("Failed to execute 'getContext' on 'OffscreenCanvas': The provided value 'experimental-webgl' is not a valid enum value of type OffscreenRenderingContextType.")
            }
        }
    },
    after: () => {
        global.document = old.document;
        global.OffscreenCanvas = old.OffscreenCanvas;
    }
});

test('Check that WebGL is not supported', () => {
    assert.notOk(GPU.isWebGLSupported);
});
