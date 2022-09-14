const { assert, skip, test, module: describe, only } = require('qunit');
const { GPU } = require('../../src');

describe('issue #778 - WebGL kernel feature checks may throw an error');

// Mocking OffscreenCanvas
global.document = undefined;
global.OffscreenCanvas = class OffscreenCanvas {
    constructor() {}

    getContext(context) {
        if (context === "webgl") return;
        if (context === 'experimental-webgl') throw new TypeError("Failed to execute 'getContext' on 'OffscreenCanvas': The provided value 'experimental-webgl' is not a valid enum value of type OffscreenRenderingContextType.")
    }
}


test('Check if WebGL is supported', () => {
    assert.notOk(GPU.isWebGLSupported);
});
