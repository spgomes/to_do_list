// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TagChip } from "../TagChip";
import type { Tag } from "../../types/tag";

const tag: Tag = { id: 1, name: "work", created_at: "2025-01-01" };

describe("TagChip", () => {
  it("renders tag name", () => {
    render(<TagChip tag={tag} />);
    expect(screen.getByText("work")).toBeDefined();
  });

  it("does not render remove button when onRemove is not provided", () => {
    render(<TagChip tag={tag} />);
    expect(screen.queryByRole("button", { name: /remover tag work/i })).toBeNull();
  });

  it("renders remove button when onRemove is provided", () => {
    render(<TagChip tag={tag} onRemove={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /remover tag work/i })
    ).toBeDefined();
  });

  it("calls onRemove with tag id when remove button is clicked", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<TagChip tag={tag} onRemove={onRemove} />);

    await user.click(
      screen.getByRole("button", { name: /remover tag work/i })
    );

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it("has accessible role and label", () => {
    render(<TagChip tag={tag} />);
    const chip = screen.getByRole("listitem", { name: /tag: work/i });
    expect(chip).toBeDefined();
  });
});
