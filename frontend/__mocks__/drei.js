const React = require("react");

// Export common drei components used in the project as simple div wrappers.
const names = [
  "Line",
  "Points",
  "Point",
  "Html",
  "OrbitControls",
  "Sky",
  "Stars"
];

names.forEach((n) => {
  exports[n] = (props) =>
    React.createElement("div", props, props && props.children);
});

exports.useTexture = () => null;
