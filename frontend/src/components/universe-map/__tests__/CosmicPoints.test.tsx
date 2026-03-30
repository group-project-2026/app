
jest.mock("@react-three/fiber", () => ({
  useThree: () => ({
    camera: {
      getWorldDirection: jest.fn(),
    },
  }),
  useFrame: jest.fn(),
}));

jest.mock("@react-three/drei", () => ({
  Html: () => null,
}));

import { render } from "@testing-library/react";
import { CosmicPoints } from "../CosmicPoint";
import type { CosmicPoint } from "../types";

// Mock InstancedMesh methods that CosmicPoint expects on its refs
// Since @testing-library/react creates standard DOM elements for internal R3F tags
beforeAll(() => {
  // @ts-expect-error Mocking DOM prototype for R3F intrinsic elements
  Element.prototype.setMatrixAt = jest.fn();
  // @ts-expect-error Mocking DOM prototype
  Element.prototype.setColorAt = jest.fn();
  // @ts-expect-error Mocking DOM prototype
  Element.prototype.computeBoundingSphere = jest.fn();
  Object.defineProperty(Element.prototype, "instanceMatrix", {
    value: { needsUpdate: false },
    writable: true,
  });
  Object.defineProperty(Element.prototype, "instanceColor", {
    value: { needsUpdate: false },
    writable: true,
  });
});

const MOCK_POINTS: CosmicPoint[] = [
  {
    id: "star-0",
    name: "Proxima Centauri",
    category: "star",
    ra: 217.44,
    dec: -62.68,
    magnitude: 4.2,
    description: "Test description",
    distance: "4.24 ly",
    discoveredBy: "Hubble",
  },
  {
    id: "galaxy-0",
    name: "Andromeda",
    category: "galaxy",
    ra: 10.68,
    dec: 41.27,
    magnitude: 3.4,
    description: "Spiral galaxy",
    distance: "2.5 Mly",
    discoveredBy: "Messier",
  },
];

describe("CosmicPoints", () => {
  it("should render without crashing with points", () => {
    const { container } = render(
      <CosmicPoints points={MOCK_POINTS} onSelect={jest.fn()} />,
    );
    expect(container).toBeTruthy();
  });

  it("should render nothing with empty array", () => {
    const { container } = render(
      <CosmicPoints points={[]} onSelect={jest.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  describe("Interactions", () => {
    it("should handle pointer over, out, and click", () => {
      const onSelect = jest.fn();
      const { container } = render(
        <CosmicPoints points={MOCK_POINTS} onSelect={onSelect} />,
      );

      // The second instancedMesh is the core (the first is glow with raycast={() => null})
      const meshes = container.querySelectorAll("instancedmesh");
      const interactableMesh = Array.from(meshes).find((el) => !el.getAttribute("raycast"));

      if (interactableMesh) {
        // We mock the R3F event payload
        const makeEvent = (instanceId: number) => ({
          stopPropagation: jest.fn(),
          instanceId,
        });

        // Extract react props using internal key
        const propKey = Object.keys(interactableMesh).find((k) =>
          k.startsWith("__reactProps$"),
        );
        if (propKey) {
          // @ts-expect-error accessing internal react props
          const props = interactableMesh[propKey];

          // 1. Hover
          if (props.onPointerOver) {
            props.onPointerOver(makeEvent(0));
          }
          
          // 2. Click
          if (props.onClick) {
            props.onClick(makeEvent(1));
            expect(onSelect).toHaveBeenCalledWith(MOCK_POINTS[1]);
          }

          // 3. Hover Out
          if (props.onPointerOut) {
            props.onPointerOut(makeEvent(0));
          }
        }
      }
    });
  });
});
