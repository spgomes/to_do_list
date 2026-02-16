// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TagSelector } from "../TagSelector";
import type { Tag } from "../../types/tag";

const tag1: Tag = { id: 1, name: "work", created_at: "2025-01-01" };
const tag2: Tag = { id: 2, name: "home", created_at: "2025-01-02" };

describe("TagSelector", () => {
  it("renders current tags as chips", () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const onRemove = vi.fn().mockResolvedValue(undefined);

    render(
      <TagSelector
        todoId={10}
        currentTags={[tag1]}
        allTags={[tag1, tag2]}
        onAdd={onAdd}
        onRemove={onRemove}
      />
    );

    expect(screen.getByText("work")).toBeDefined();
  });

  it("calls onRemove when chip remove is clicked", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn().mockResolvedValue(undefined);
    const onAdd = vi.fn().mockResolvedValue(undefined);

    render(
      <TagSelector
        todoId={10}
        currentTags={[tag1]}
        allTags={[tag1, tag2]}
        onAdd={onAdd}
        onRemove={onRemove}
      />
    );

    await user.click(
      screen.getByRole("button", { name: /remover tag work/i })
    );

    expect(onRemove).toHaveBeenCalledWith(10, 1);
  });

  it("shows add tag trigger and calls onAdd when option is clicked", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const onRemove = vi.fn().mockResolvedValue(undefined);

    render(
      <TagSelector
        todoId={10}
        currentTags={[]}
        allTags={[tag1, tag2]}
        onAdd={onAdd}
        onRemove={onRemove}
      />
    );

    await user.click(
      screen.getByRole("button", { name: /adicionar tag à tarefa/i })
    );

    const homeOption = screen.getByRole("button", {
      name: /adicionar tag home/i,
    });
    expect(homeOption).toBeDefined();
    await user.click(homeOption);

    expect(onAdd).toHaveBeenCalledWith(10, 2);
  });

  it("displays addTagError when provided", () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const onRemove = vi.fn().mockResolvedValue(undefined);

    render(
      <TagSelector
        todoId={10}
        currentTags={[]}
        allTags={[tag1]}
        onAdd={onAdd}
        onRemove={onRemove}
        addTagError="tag with this name already exists"
      />
    );

    const alert = screen.getByRole("alert");
    expect(alert).toBeDefined();
    expect(alert.textContent).toContain("tag with this name already exists");
  });
});
