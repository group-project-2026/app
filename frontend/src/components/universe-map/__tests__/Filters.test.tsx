import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Filters } from "../Filters";
import { CATEGORY_META, type CosmicCategory } from "../types";

const ALL_CATEGORIES = new Set(
  Object.keys(CATEGORY_META) as CosmicCategory[],
);

describe("Filters", () => {
  it("should render the Filters heading", () => {
    render(
      <Filters activeCategories={ALL_CATEGORIES} onToggle={jest.fn()} />,
    );
    expect(screen.getByText("Filters")).toBeInTheDocument();
  });

  it("should render all 8 category labels", () => {
    render(
      <Filters activeCategories={ALL_CATEGORIES} onToggle={jest.fn()} />,
    );
    const labels = Object.values(CATEGORY_META).map((m) => m.label);
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("should render checkboxes for each category", () => {
    render(
      <Filters activeCategories={ALL_CATEGORIES} onToggle={jest.fn()} />,
    );
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(8);
  });

  it("should have all checkboxes checked when all categories are active", () => {
    render(
      <Filters activeCategories={ALL_CATEGORIES} onToggle={jest.fn()} />,
    );
    const checkboxes = screen.getAllByRole("checkbox");
    for (const cb of checkboxes) {
      expect(cb).toBeChecked();
    }
  });

  it("should have unchecked state for inactive categories", () => {
    const partial = new Set<CosmicCategory>(["star", "galaxy"]);
    render(
      <Filters activeCategories={partial} onToggle={jest.fn()} />,
    );
    const checkboxes = screen.getAllByRole("checkbox");
    const checked = checkboxes.filter(
      (cb) => (cb as HTMLInputElement).checked || cb.getAttribute("aria-checked") === "true",
    );
    expect(checked).toHaveLength(2);
  });

  it("should call onToggle with the correct category when clicked", async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    render(
      <Filters activeCategories={ALL_CATEGORIES} onToggle={onToggle} />,
    );

    const starLabel = screen.getByText("Star");
    await user.click(starLabel);
    expect(onToggle).toHaveBeenCalledWith("star");
  });

  it("should call onToggle for each clicked category", async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    render(
      <Filters activeCategories={ALL_CATEGORIES} onToggle={onToggle} />,
    );

    await user.click(screen.getByText("Galaxy"));
    await user.click(screen.getByText("Nebula"));
    expect(onToggle).toHaveBeenCalledTimes(2);
    expect(onToggle).toHaveBeenCalledWith("galaxy");
    expect(onToggle).toHaveBeenCalledWith("nebula");
  });

  it("should apply category color styling when checked", () => {
    const active = new Set<CosmicCategory>(["star"]);
    render(<Filters activeCategories={active} onToggle={jest.fn()} />);

    const starLabel = screen.getByText("Star");
    expect(starLabel.className).toContain("text-(--cat-color)");
  });

  it("should apply muted color styling when unchecked", () => {
    const active = new Set<CosmicCategory>();
    render(<Filters activeCategories={active} onToggle={jest.fn()} />);

    const starLabel = screen.getByText("Star");
    expect(starLabel.className).toContain("text-white/45");
  });
});
