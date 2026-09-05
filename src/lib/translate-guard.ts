/**
 * Chrome's "Translate this page" rewrites text nodes in place (wrapping them in
 * <font> elements and moving them around). React still holds references to the
 * original nodes, so the next re-render that removes or inserts a sibling
 * throws "Failed to execute 'removeChild' / 'insertBefore' on 'Node'" and the
 * whole page falls into the error boundary. First seen on the login form: the
 * "Send code" button swaps its icon for a spinner, which crashed every
 * customer browsing with Tamil auto-translate on.
 *
 * This is the React team's recommended workaround (facebook/react#11538):
 * make those two DOM calls tolerant of a node that Translate has already
 * moved. Must run before hydration, so it is inlined into <head> by the root
 * layout rather than loaded as a module.
 */
export const TRANSLATE_GUARD_SCRIPT = `
(function () {
  if (typeof Node !== "function" || !Node.prototype) return;
  var removeChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) {
      if (typeof console !== "undefined") console.warn("[translate-guard] skipped removeChild of a node that was moved (page translation?)", child, this);
      return child;
    }
    return removeChild.apply(this, arguments);
  };
  var insertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (typeof console !== "undefined") console.warn("[translate-guard] skipped insertBefore on a reference node that was moved (page translation?)", referenceNode, this);
      return newNode;
    }
    return insertBefore.apply(this, arguments);
  };
})();
`.trim();
