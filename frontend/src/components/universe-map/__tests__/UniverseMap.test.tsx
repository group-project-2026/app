import React from "react";

const THREE_LIGHT_TAGS = new Set(["ambientLight", "pointLight"]);

function sanitizeCanvasChildren(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (!React.isValidElement<{ children?: React.ReactNode }>(child)) {
      return child;
    }

    if (typeof child.type === "string" && THREE_LIGHT_TAGS.has(child.type)) {
      return null;
    }

    if (child.props.children == null) {
      return child;
    }

    return React.cloneElement(child, {
      children: sanitizeCanvasChildren(child.props.children)
    });
  });
}

jest.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      "div",
      { "data-testid": "r3f-canvas" },
      sanitizeCanvasChildren(children)
    ),
  useThree: () => ({
    camera: { getWorldDirection: jest.fn() }
  }),
  useFrame: jest.fn()
}));

jest.mock("@react-three/drei", () => ({
  OrbitControls: () =>
    React.createElement("div", { "data-testid": "orbit-controls" }),
  Stars: () => React.createElement("div", { "data-testid": "stars" }),
  Line: () => null,
  Html: () => null
}));

jest.mock("../CelestialSphere", () => ({
  CelestialSphere: () =>
    React.createElement("div", { "data-testid": "celestial-sphere" }),
  SPHERE_RADIUS: 5
}));

jest.mock("../CosmicPoint", () => ({
  CosmicPoints: ({
    points,
    onSelect
  }: {
    points: { id: string; name: string }[];
    onSelect: (p: { id: string; name: string }) => void;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "cosmic-points", "data-count": points.length },
      points.slice(0, 3).map((p) =>
        React.createElement(
          "button",
          {
            key: p.id,
            "data-testid": `point-${p.id}`,
            onClick: () => onSelect(p)
          },
          p.name
        )
      )
    )
}));

jest.mock("../CoordinateOverlay", () => ({
  CoordinateOverlay: () =>
    React.createElement("div", { "data-testid": "coordinate-overlay" })
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UniverseMap } from "../UniverseMap";
import { CATEGORY_META } from "../types";

describe("UniverseMap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the main container", () => {
    render(<UniverseMap />);
    expect(screen.getByTestId("r3f-canvas")).toBeInTheDocument();
  });

  it("should render the Legend", () => {
    render(<UniverseMap />);
    expect(screen.getByText("Legend")).toBeInTheDocument();
  });

  it("should render the Filters", () => {
    render(<UniverseMap />);
    expect(screen.getByText("Filters")).toBeInTheDocument();
  });

  it("should render the help hint text", () => {
    render(<UniverseMap />);
    expect(screen.getByText(/Drag to orbit/)).toBeInTheDocument();
  });

  it("should render all category labels in both Legend and Filters", () => {
    render(<UniverseMap />);
    const labels = Object.values(CATEGORY_META).map((m) => m.label);
    for (const label of labels) {
      const elements = screen.getAllByText(label);
      expect(elements.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("should render 100 cosmic points initially", () => {
    render(<UniverseMap />);
    const pointsContainer = screen.getByTestId("cosmic-points");
    expect(Number(pointsContainer.getAttribute("data-count"))).toBe(100);
  });

  it("should not show detail panel initially", () => {
    render(<UniverseMap />);
    expect(screen.queryByText("Right Ascension")).not.toBeInTheDocument();
  });

  it("should show detail panel when a point is selected", async () => {
    const user = userEvent.setup();
    render(<UniverseMap />);

    const buttons = screen.getAllByTestId(/^point-/);
    await user.click(buttons[0]);

    expect(screen.getByText("Right Ascension")).toBeInTheDocument();
    expect(screen.getByText("Declination")).toBeInTheDocument();
  });

  it("should close detail panel when close button is clicked", async () => {
    const user = userEvent.setup();
    render(<UniverseMap />);

    const buttons = screen.getAllByTestId(/^point-/);
    await user.click(buttons[0]);
    expect(screen.getByText("Right Ascension")).toBeInTheDocument();

    // Find the close button (the one that is NOT a point button)
    const allButtons = screen.getAllByRole("button");
    const closeButton = allButtons.find(
      (btn) => !btn.getAttribute("data-testid")?.startsWith("point-")
    );
    expect(closeButton).toBeTruthy();
    await user.click(closeButton!);

    expect(screen.queryByText("Right Ascension")).not.toBeInTheDocument();
  });

  it("should filter points when a category is toggled", async () => {
    const user = userEvent.setup();
    render(<UniverseMap />);

    const initialCount = Number(
      screen.getByTestId("cosmic-points").getAttribute("data-count")
    );
    expect(initialCount).toBe(100);

    // Click "Star" in the Filters panel (2nd occurrence after Legend)
    const starElements = screen.getAllByText("Star");
    await user.click(starElements[1]);

    const newCount = Number(
      screen.getByTestId("cosmic-points").getAttribute("data-count")
    );
    expect(newCount).toBeLessThan(100);
  });

  it("should re-enable filtered points when toggled back", async () => {
    const user = userEvent.setup();
    render(<UniverseMap />);

    const starElements = screen.getAllByText("Star");
    await user.click(starElements[1]);
    const reduced = Number(
      screen.getByTestId("cosmic-points").getAttribute("data-count")
    );

    await user.click(starElements[1]);
    const restored = Number(
      screen.getByTestId("cosmic-points").getAttribute("data-count")
    );

    expect(restored).toBe(100);
    expect(restored).toBeGreaterThan(reduced);
  });
});
