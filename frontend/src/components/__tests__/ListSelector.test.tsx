import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ListSelector } from "../ListSelector";
import type { List } from "../../types/list";

const list1: List = {
  id: 1,
  name: "work",
  color: "#BBDEFB",
  created_at: "2025-01-01",
};
const list2: List = {
  id: 2,
  name: "home",
  color: "#B2DFDB",
  created_at: "2025-01-02",
};

describe("ListSelector", () => {
  it("renders current lists as chips", () => {
    render(
      <ListSelector
        todoId={1}
        currentLists={[list1]}
        allLists={[list1, list2]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByText("work")).toBeDefined();
  });

  it("shows remove button for current lists when onRemove provided", () => {
    render(
      <ListSelector
        todoId={1}
        currentLists={[list1]}
        allLists={[list1, list2]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(
      screen.getByRole("button", { name: /remover lista work/i })
    ).toBeDefined();
  });

  it("shows add list trigger and calls onAdd when option is clicked", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(
      <ListSelector
        todoId={1}
        currentLists={[]}
        allLists={[list1, list2]}
        onAdd={onAdd}
        onRemove={vi.fn()}
      />
    );

    await user.click(
      screen.getByRole("button", { name: /adicionar lista à tarefa/i })
    );
    await user.click(
      screen.getByRole("button", { name: /adicionar lista home/i })
    );

    expect(onAdd).toHaveBeenCalledWith(1, 2);
  });

  it("displays addListError when provided", () => {
    render(
      <ListSelector
        todoId={1}
        currentLists={[]}
        allLists={[list1]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        addListError="list with this name already exists"
      />
    );
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("list with this name already exists");
  });
});
