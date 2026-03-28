import React from "react";

jest.mock("@react-three/drei", () => ({
  Line: ({ points }: { points: unknown[] }) =>
    React.createElement("div", {
      "data-testid": "drei-line",
      "data-point-count": points.length,
    }),
}));

import { render, screen } from "@testing-library/react";
import { CelestialSphere, SPHERE_RADIUS } from "../CelestialSphere";

describe("CelestialSphere", () => {
  it("should export SPHERE_RADIUS as 5", () => {
    expect(SPHERE_RADIUS).toBe(5);
  });

  it("should render without crashing", () => {
    const { container } = render(<CelestialSphere />);
    expect(container).toBeTruthy();
  });

  it("should render meridian and parallel lines", () => {
    render(<CelestialSphere />);
    const lines = screen.getAllByTestId("drei-line");
    // 12 meridians + 7 parallels (6 regular + 1 equator) = 19
    expect(lines.length).toBe(19);
  });

  it("should generate correct number of points per line", () => {
    render(<CelestialSphere />);
    const lines = screen.getAllByTestId("drei-line");
    for (const line of lines) {
      expect(Number(line.getAttribute("data-point-count"))).toBe(129);
    }
  });
});
