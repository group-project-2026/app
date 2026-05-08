import React from "react";
import type { CosmicPoint } from "../types";

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

jest.mock("../HierarchicalSky", () => ({
  HierarchicalSky: ({
    points,
    onSelectPoint
  }: {
    points: { id: string; name: string }[];
    onSelectPoint: (p: { id: string; name: string }) => void;
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
            onClick: () => onSelectPoint(p)
          },
          p.name
        )
      )
    )
}));

jest.mock("../cameraTween", () => ({
  CameraTweenDriver: () => null
}));

jest.mock("../CoordinateOverlay", () => ({
  CoordinateOverlay: () =>
    React.createElement("div", { "data-testid": "coordinate-overlay" })
}));

const FAKE_POINTS: CosmicPoint[] = [
  {
    id: "src-fermi-1",
    name: "Fermi A",
    category: "FERMI",
    ra: 10,
    dec: 10,
    magnitude: 5,
    primaryCatalog: "FERMI",
    sourceClass: "AGN",
    significance: 8,
    flux1000: 1e-9,
    spectralIndex: -2,
    associatedName: null,
    discoveryMethod: null,
    bestConfidence: 0.9,
    avgConfidence: 0.8,
    catalogCount: 1
  },
  {
    id: "src-fermi-2",
    name: "Fermi B",
    category: "FERMI",
    ra: 20,
    dec: 20,
    magnitude: 5,
    primaryCatalog: "FERMI",
    sourceClass: "PSR",
    significance: 10,
    flux1000: 2e-9,
    spectralIndex: -1.9,
    associatedName: null,
    discoveryMethod: null,
    bestConfidence: 0.95,
    avgConfidence: 0.9,
    catalogCount: 2
  },
  {
    id: "src-lhaaso-1",
    name: "LHAASO A",
    category: "LHAASO",
    ra: 30,
    dec: 30,
    magnitude: 5,
    primaryCatalog: "LHAASO",
    sourceClass: "PWN",
    significance: 30,
    flux1000: 5e-10,
    spectralIndex: -1.8,
    associatedName: "Crab",
    discoveryMethod: "TeV",
    bestConfidence: 0.99,
    avgConfidence: 0.95,
    catalogCount: 1
  }
];

jest.mock("../useUniverseMapPoints", () => ({
  useUniverseMapPoints: () => ({
    data: FAKE_POINTS,
    isLoading: false,
    isError: false,
    error: null
  })
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

  it("should render the points returned by the hook", () => {
    render(<UniverseMap />);
    const pointsContainer = screen.getByTestId("cosmic-points");
    expect(Number(pointsContainer.getAttribute("data-count"))).toBe(
      FAKE_POINTS.length
    );
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

    const allButtons = screen.getAllByRole("button");
    const closeButton = allButtons.find(
      (btn) => !btn.getAttribute("data-testid")?.startsWith("point-")
    );
    expect(closeButton).toBeTruthy();
    await user.click(closeButton!);

    expect(screen.queryByText("Right Ascension")).not.toBeInTheDocument();
  });

  it("should filter points when a category is toggled off on the frontend", async () => {
    const user = userEvent.setup();
    render(<UniverseMap />);

    const initialCount = Number(
      screen.getByTestId("cosmic-points").getAttribute("data-count")
    );
    expect(initialCount).toBe(FAKE_POINTS.length);

    // Toggle FERMI off (the FERMI label appears in both Legend and Filters; the second is the filter checkbox)
    const fermiElements = screen.getAllByText(CATEGORY_META.FERMI.label);
    await user.click(fermiElements[1]);

    const newCount = Number(
      screen.getByTestId("cosmic-points").getAttribute("data-count")
    );
    expect(newCount).toBe(
      FAKE_POINTS.filter((p) => p.category !== "FERMI").length
    );
  });

  it("should re-enable filtered points when toggled back", async () => {
    const user = userEvent.setup();
    render(<UniverseMap />);

    const fermiElements = screen.getAllByText(CATEGORY_META.FERMI.label);
    await user.click(fermiElements[1]);
    const reduced = Number(
      screen.getByTestId("cosmic-points").getAttribute("data-count")
    );

    await user.click(fermiElements[1]);
    const restored = Number(
      screen.getByTestId("cosmic-points").getAttribute("data-count")
    );

    expect(restored).toBe(FAKE_POINTS.length);
    expect(restored).toBeGreaterThan(reduced);
  });
});
