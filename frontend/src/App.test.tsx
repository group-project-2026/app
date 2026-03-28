import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders jasper image", () => {
    render(<App />);
    expect(
      screen.getByRole("img", { name: /dawid jasper/i })
    ).toBeInTheDocument();
  });
});
