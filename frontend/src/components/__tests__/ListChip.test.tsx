import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ListChip } from "../ListChip";
import type { List } from "../../types/list";

const list: List = {
  id: 1,
  name: "work",
  color: "#BBDEFB",
  created_at: "2025-01-01",
};

describe("ListChip", () => {
  it("renders list name", () => {
    render(<ListChip list={list} />);
    expect(screen.getByText("work")).toBeDefined();
  });

  it("does not show remove button when onRemove is not provided", () => {
    render(<ListChip list={list} />);
    expect(screen.queryByRole("button", { name: /remover lista work/i })).toBeNull();
  });

  it("shows remove button when onRemove is provided", () => {
    render(<ListChip list={list} onRemove={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /remover lista work/i })
    ).toBeDefined();
  });

  it("calls onRemove with list id when remove button is clicked", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<ListChip list={list} onRemove={onRemove} />);

    await user.click(
      screen.getByRole("button", { name: /remover lista work/i })
    );

    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it("has listitem role with default aria-label", () => {
    render(<ListChip list={list} />);
    const chip = screen.getByRole("listitem", { name: /lista: work/i });
    expect(chip).toBeDefined();
  });
});
