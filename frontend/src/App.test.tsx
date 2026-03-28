import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders the main heading", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /get started/i })
    ).toBeInTheDocument();
  });

  it("renders counter button", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: /count is/i })
    ).toBeInTheDocument();
  });
});
