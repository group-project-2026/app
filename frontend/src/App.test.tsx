import { render, screen } from "@testing-library/react";
import App from "./App";

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

describe("App", () => {
  it("renders jasper image", () => {
    render(<App />);
    expect(
      screen.getByRole("img", { name: /dawid jasper/i })
    ).toBeInTheDocument();
  });
});
