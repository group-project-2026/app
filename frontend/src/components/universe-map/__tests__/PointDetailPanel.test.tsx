import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PointDetailPanel } from "../PointDetailPanel";
import type { CosmicPoint } from "../types";

const MOCK_POINT: CosmicPoint = {
  id: "star-0",
  name: "Proxima Centauri",
  category: "star",
  ra: 217.44,
  dec: -62.68,
  magnitude: 4.2,
  description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  distance: "4.24 ly",
  discoveredBy: "Hubble Space Telescope",
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
    expect(screen.getByText("Proxima Centauri")).toBeInTheDocument();
  });

  it("should render the category badge", () => {
    render(<PointDetailPanel point={MOCK_POINT} onClose={jest.fn()} />);
    expect(screen.getByText("Star")).toBeInTheDocument();
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

  it("should render distance", () => {
    render(<PointDetailPanel point={MOCK_POINT} onClose={jest.fn()} />);
    expect(screen.getByText("4.24 ly")).toBeInTheDocument();
  });

  it("should render magnitude", () => {
    render(<PointDetailPanel point={MOCK_POINT} onClose={jest.fn()} />);
    expect(screen.getByText("4.2")).toBeInTheDocument();
  });

  it("should render discoveredBy", () => {
    render(<PointDetailPanel point={MOCK_POINT} onClose={jest.fn()} />);
    expect(screen.getByText("Hubble Space Telescope")).toBeInTheDocument();
  });

  it("should render description", () => {
    render(<PointDetailPanel point={MOCK_POINT} onClose={jest.fn()} />);
    expect(
      screen.getByText(/Lorem ipsum dolor sit amet/),
    ).toBeInTheDocument();
  });

  it("should render all section headings", () => {
    render(<PointDetailPanel point={MOCK_POINT} onClose={jest.fn()} />);

    const headings = [
      "Right Ascension",
      "Declination",
      "Distance",
      "Magnitude",
      "Discovered by",
      "Description",
      "Observation Notes",
      "Spectral Analysis",
      "Angular Position",
      "Flux & Energy",
    ];

    for (const heading of headings) {
      expect(screen.getByText(heading)).toBeInTheDocument();
    }
  });

  it("should render placeholder sections for future content", () => {
    render(<PointDetailPanel point={MOCK_POINT} onClose={jest.fn()} />);
    expect(
      screen.getByText(/spectral energy distribution/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/galactic coordinates/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/flux vs energy plot/i),
    ).toBeInTheDocument();
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
      id: "galaxy-0",
      name: "Andromeda",
      category: "galaxy",
      ra: 10.68,
      dec: 41.27,
      magnitude: 3.4,
      description: "Spiral galaxy in the Local Group.",
      distance: "2.5 Mly",
      discoveredBy: "Charles Messier",
    };

    render(<PointDetailPanel point={anotherPoint} onClose={jest.fn()} />);
    expect(screen.getByText("Andromeda")).toBeInTheDocument();
    expect(screen.getByText("Galaxy")).toBeInTheDocument();
    expect(screen.getByText("2.5 Mly")).toBeInTheDocument();
    expect(screen.getByText("Charles Messier")).toBeInTheDocument();
  });
});
