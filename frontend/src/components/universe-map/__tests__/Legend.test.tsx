import { render, screen } from "@testing-library/react";
import { Legend } from "../Legend";
import { CATEGORY_META } from "../types";

describe("Legend", () => {
  it("should render the Legend heading", () => {
    render(<Legend />);
    expect(screen.getByText("Legend")).toBeInTheDocument();
  });

  it("should render all 8 category labels", () => {
    render(<Legend />);
    const labels = Object.values(CATEGORY_META).map((m) => m.label);
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("should render a colored dot for each category", () => {
    const { container } = render(<Legend />);
    const dots = container.querySelectorAll(".rounded-full");
    expect(dots.length).toBe(8);
  });

  it("should apply background color styling to each dot", () => {
    const { container } = render(<Legend />);
    const dots = container.querySelectorAll(".rounded-full");

    dots.forEach((dot) => {
      const style = (dot as HTMLElement).style;
      expect(style.getPropertyValue("--cat-color")).toBeTruthy();
    });
  });

  it("should render dots and labels in pairs", () => {
    const { container } = render(<Legend />);
    const items = container.querySelectorAll(".flex.items-center.gap-2\\.5");
    expect(items.length).toBe(8);
  });
});
