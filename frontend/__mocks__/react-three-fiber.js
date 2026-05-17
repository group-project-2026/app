const React = require("react");

exports.Canvas = ({ children }) =>
  React.createElement("div", { "data-testid": "r3f-canvas" }, children);
exports.useFrame = () => {};
exports.useThree = () => ({ gl: {}, scene: {}, camera: {} });
exports.extend = () => {};
