import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PointDetailPanel } from "../PointDetailPanel";
import type { CosmicPoint } from "../types";

const MOCK_POINT: CosmicPoint = {
  id: "src-1",
  name: "4FGL J0001.0+0000",
  category: "FERMI",
  ra: 217.44,
  dec: -62.68,
  magnitude: 4.2,
  primaryCatalog: "FERMI",
  sourceClass: "AGN",
  significance: 12.34,
  flux1000: 1.5e-9,
  spectralIndex: -2.1,
  associatedName: "PKS 0001-00",
  discoveryMethod: "gamma-ray",
  bestConfidence: 0.95,
  avgConfidence: 0.85,
  catalogCount: 3,
};

describe("PointDetailPanel", () => {
  it("should render nothing when point is null", () => {
    const { container } = render(
      <PointDetailPanel point={null} onClose={jest.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("should render the point name", () => {
    render(<PointDetailPanel point={MOCK_POINT} onClose={jest.fn()} />);
    expect(screen.getByText(MOCK_POINT.name)).toBeInTheDocument();
  });

  it("should render the category badge using catalog label", () => {
    render(<PointDetailPanel point={MOCK_POINT} onClose={jest.fn()} />);
    expect(screen.getByText("Fermi-LAT")).toBeInTheDocument();
  });

  it("should render RA value", () => {
    render(<PointDetailPanel point={MOCK_POINT} onClose={jest.fn()} />);
    expect(screen.getByText("217.44°")).toBeInTheDocument();
  });

  it("should render positive Dec with + prefix", () => {
    const positiveDecPoint = { ...MOCK_POINT, dec: 45.5 };
    render(<PointDetailPanel point={positiveDecPoint} onClose={jest.fn()} />);
    expect(screen.getByText("+45.50°")).toBeInTheDocument();
  });

  it("should render negative Dec without + prefix", () => {
    render(<PointDetailPanel point={MOCK_POINT} onClose={jest.fn()} />);
    expect(screen.getByText("-62.68°")).toBeInTheDocument();
  });

  it("should render source class", () => {
    render(<PointDetailPanel point={MOCK_POINT} onClose={jest.fn()} />);
    expect(screen.getByText("AGN")).toBeInTheDocument();
  });

  it("should render catalog count", () => {
    render(<PointDetailPanel point={MOCK_POINT} onClose={jest.fn()} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("should render associated name", () => {
    render(<PointDetailPanel point={MOCK_POINT} onClose={jest.fn()} />);
    expect(screen.getByText("PKS 0001-00")).toBeInTheDocument();
  });

  it("should render discovery method", () => {
    render(<PointDetailPanel point={MOCK_POINT} onClose={jest.fn()} />);
    expect(screen.getByText("gamma-ray")).toBeInTheDocument();
  });

  it("should render all section headings", () => {
    render(<PointDetailPanel point={MOCK_POINT} onClose={jest.fn()} />);

    const headings = [
      "Right Ascension",
      "Declination",
      "Source class",
      "Catalog count",
      "Identification",
      "Measurements",
      "Confidence",
    ];

    for (const heading of headings) {
      expect(screen.getByText(heading)).toBeInTheDocument();
    }
  });

  it("should render em dash for missing fields", () => {
    const sparsePoint: CosmicPoint = {
      ...MOCK_POINT,
      sourceClass: null,
      associatedName: null,
      discoveryMethod: null,
      significance: null,
      flux1000: null,
      spectralIndex: null,
      bestConfidence: null,
      avgConfidence: null,
    };
    render(<PointDetailPanel point={sparsePoint} onClose={jest.fn()} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });

  it("should call onClose when the X button is clicked", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<PointDetailPanel point={MOCK_POINT} onClose={onClose} />);

    const closeButton = screen.getByRole("button");
    await user.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should render different data for different points", () => {
    const anotherPoint: CosmicPoint = {
      ...MOCK_POINT,
      id: "src-2",
      name: "TXS 0506+056",
      category: "TEVCAT",
      primaryCatalog: "TEVCAT",
      ra: 10.68,
      dec: 41.27,
      sourceClass: "BLL",
      associatedName: "Andromeda",
    };

    render(<PointDetailPanel point={anotherPoint} onClose={jest.fn()} />);
    expect(screen.getByText("TXS 0506+056")).toBeInTheDocument();
    expect(screen.getByText("TeVCat")).toBeInTheDocument();
    expect(screen.getByText("BLL")).toBeInTheDocument();
    expect(screen.getByText("Andromeda")).toBeInTheDocument();
  });
});
