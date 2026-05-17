const React = require("react");

module.exports = {
  useNavigate: () => jest.fn(),
  Link: (props) => React.createElement("a", props, props.children),
  NavLink: (props) => React.createElement("a", props, props.children),
  BrowserRouter: ({ children }) => React.createElement("div", {}, children),
  MemoryRouter: ({ children }) => React.createElement("div", {}, children)
};
