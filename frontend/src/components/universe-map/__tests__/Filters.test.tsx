import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Filters } from "../Filters";
import { CATEGORY_META, ALL_CATEGORIES, type CosmicCategory } from "../types";

const ALL = new Set<CosmicCategory>(ALL_CATEGORIES);

describe("Filters", () => {
  it("should render the Filters heading", () => {
    render(<Filters activeCategories={ALL} onToggle={jest.fn()} />);
    expect(screen.getByText("Filters")).toBeInTheDocument();
  });

  it("should render all category labels", () => {
    render(<Filters activeCategories={ALL} onToggle={jest.fn()} />);
    const labels = Object.values(CATEGORY_META).map((m) => m.label);
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("should render checkboxes for each category", () => {
    render(<Filters activeCategories={ALL} onToggle={jest.fn()} />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(ALL_CATEGORIES.length);
  });

  it("should have all checkboxes checked when all categories are active", () => {
    render(<Filters activeCategories={ALL} onToggle={jest.fn()} />);
    const checkboxes = screen.getAllByRole("checkbox");
    for (const cb of checkboxes) {
      expect(cb).toBeChecked();
    }
  });

  it("should have unchecked state for inactive categories", () => {
    const partial = new Set<CosmicCategory>(["FERMI", "LHAASO"]);
    render(<Filters activeCategories={partial} onToggle={jest.fn()} />);
    const checkboxes = screen.getAllByRole("checkbox");
    const checked = checkboxes.filter(
      (cb) =>
        (cb as HTMLInputElement).checked ||
        cb.getAttribute("aria-checked") === "true",
    );
    expect(checked).toHaveLength(2);
  });

  it("should call onToggle with the correct category when clicked", async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    render(<Filters activeCategories={ALL} onToggle={onToggle} />);

    const fermiLabel = screen.getByText(CATEGORY_META.FERMI.label);
    await user.click(fermiLabel);
    expect(onToggle).toHaveBeenCalledWith("FERMI");
  });

  it("should call onToggle for each clicked category", async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    render(<Filters activeCategories={ALL} onToggle={onToggle} />);

    await user.click(screen.getByText(CATEGORY_META.LHAASO.label));
    await user.click(screen.getByText(CATEGORY_META.HAWC.label));
    expect(onToggle).toHaveBeenCalledTimes(2);
    expect(onToggle).toHaveBeenCalledWith("LHAASO");
    expect(onToggle).toHaveBeenCalledWith("HAWC");
  });

  it("should apply category color styling when checked", () => {
    const active = new Set<CosmicCategory>(["FERMI"]);
    render(<Filters activeCategories={active} onToggle={jest.fn()} />);

    const label = screen.getByText(CATEGORY_META.FERMI.label);
    expect(label.className).toContain("text-(--cat-color)");
  });

  it("should apply muted color styling when unchecked", () => {
    const active = new Set<CosmicCategory>();
    render(<Filters activeCategories={active} onToggle={jest.fn()} />);

    const label = screen.getByText(CATEGORY_META.FERMI.label);
    expect(label.className).toContain("text-white/45");
  });
});
