///
/// Class: functionBuilder
///
/// [INTERNAL] A collection of functionNodes.
///
/// This handles all the raw state, converted state, etc. Of a single function.
///
/// Properties:
/// 	nodeMap - {Object} Object map, where nodeMap[function] = functionNode;
///
function functionBuilder() {
	this.nodeMap = {};
}
