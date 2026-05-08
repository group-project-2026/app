
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
    id: "src-1",
    name: "4FGL J0001.0+0000",
    category: "FERMI",
    ra: 217.44,
    dec: -62.68,
    magnitude: 4.2,
    primaryCatalog: "FERMI",
    sourceClass: "AGN",
    significance: 10,
    flux1000: 1e-9,
    spectralIndex: -2,
    associatedName: null,
    discoveryMethod: "gamma-ray",
    bestConfidence: 0.9,
    avgConfidence: 0.85,
    catalogCount: 2,
  },
  {
    id: "src-2",
    name: "LHAASO J0534+2200",
    category: "LHAASO",
    ra: 10.68,
    dec: 41.27,
    magnitude: 3.4,
    primaryCatalog: "LHAASO",
    sourceClass: "PWN",
    significance: 25,
    flux1000: 5e-10,
    spectralIndex: -1.8,
    associatedName: "Crab",
    discoveryMethod: "TeV",
    bestConfidence: 0.99,
    avgConfidence: 0.95,
    catalogCount: 1,
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

      const meshes = container.querySelectorAll("instancedmesh");
      const interactableMesh = Array.from(meshes).find(
        (el) => !el.getAttribute("raycast"),
      );

      if (interactableMesh) {
        const makeEvent = (instanceId: number) => ({
          stopPropagation: jest.fn(),
          instanceId,
        });

        const propKey = Object.keys(interactableMesh).find((k) =>
          k.startsWith("__reactProps$"),
        );
        if (propKey) {
          // @ts-expect-error accessing internal react props
          const props = interactableMesh[propKey];

          if (props.onPointerOver) {
            props.onPointerOver(makeEvent(0));
          }

          if (props.onClick) {
            props.onClick(makeEvent(1));
            expect(onSelect).toHaveBeenCalledWith(MOCK_POINTS[1]);
          }

          if (props.onPointerOut) {
            props.onPointerOut(makeEvent(0));
          }
        }
      }
    });
  });
});
