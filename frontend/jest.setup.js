const React = require("react");

// Intercept React.createElement to replace react-three-fiber/three primitive
// elements (mesh, group, geometry, material, etc.) with harmless divs
// so they don't produce DOM warnings in jsdom during tests.
const originalCreateElement = React.createElement;
const R3F_PRIMITIVES = new Set([
  "mesh",
  "group",
  "instancedMesh",
  "points",
  "point",
  "line",
  "meshBasicMaterial",
  "meshStandardMaterial",
  "sphereGeometry",
  "boxGeometry",
  "bufferGeometry"
]);

React.createElement = function (type, props, ...children) {
  if (typeof type === "string" && R3F_PRIMITIVES.has(type)) {
    return originalCreateElement("div", props || {}, ...children);
  }
  return originalCreateElement(type, props, ...children);
};

// Provide a minimal mock for console.error to keep test output clean for
// known three.js/react-three warnings (optional).
const origConsoleError = console.error.bind(console);
console.error = (...args) => {
  const msg = args[0] || "";
  if (typeof msg === "string" && msg.includes("is using incorrect casing")) {
    return;
  }
  if (typeof msg === "string" && msg.includes("unrecognized in this browser")) {
    return;
  }
  if (
    typeof msg === "string" &&
    msg.includes("Received `true` for a non-boolean attribute")
  ) {
    return;
  }
  origConsoleError(...args);
};

// Ensure DOM prototype has r3f-like methods used in tests
/* global Element, Object */
if (typeof Element !== "undefined") {
  if (!Element.prototype.setMatrixAt) Element.prototype.setMatrixAt = () => {};
  if (!Element.prototype.setColorAt) Element.prototype.setColorAt = () => {};
  if (!Element.prototype.computeBoundingSphere)
    Element.prototype.computeBoundingSphere = () => {};
  if (!Element.prototype.instanceMatrix)
    Element.prototype.instanceMatrix = { needsUpdate: false };
  if (!Element.prototype.instanceColor)
    Element.prototype.instanceColor = { needsUpdate: false };
}
