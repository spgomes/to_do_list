import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ColorPicker } from "../ColorPicker";
import { PASTEL_COLORS } from "../../types/list";

describe("ColorPicker", () => {
  it("renders all pastel colors", () => {
    render(
      <ColorPicker value={PASTEL_COLORS[0].hex} onChange={vi.fn()} />
    );
    PASTEL_COLORS.forEach((c) => {
      expect(
        screen.getByRole("button", { name: new RegExp(`cor ${c.name}`, "i") })
      ).toBeDefined();
    });
  });

  it("shows selected state for current value", () => {
    const selectedHex = PASTEL_COLORS[2].hex;
    render(<ColorPicker value={selectedHex} onChange={vi.fn()} />);
    const selectedBtn = screen.getByRole("button", {
      name: new RegExp(`cor ${PASTEL_COLORS[2].name}`, "i"),
    });
    expect(selectedBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("calls onChange when a color is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ColorPicker value={PASTEL_COLORS[0].hex} onChange={onChange} />
    );

    await user.click(
      screen.getByRole("button", {
        name: new RegExp(`cor ${PASTEL_COLORS[3].name}`, "i"),
      })
    );

    expect(onChange).toHaveBeenCalledWith(PASTEL_COLORS[3].hex);
  });

  it("does not call onChange when disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ColorPicker value={PASTEL_COLORS[0].hex} onChange={onChange} disabled />
    );

    const btn = screen.getByRole("button", {
      name: new RegExp(`cor ${PASTEL_COLORS[1].name}`, "i"),
    });
    await user.click(btn);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("has accessible group label", () => {
    render(
      <ColorPicker
        value={PASTEL_COLORS[0].hex}
        onChange={vi.fn()}
        aria-label="Escolher cor"
      />
    );
    const group = screen.getByRole("group", { name: /escolher cor/i });
    expect(group).toBeDefined();
  });
});
