import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ListsManager } from "../ListsManager";
import type { List } from "../../types/list";

const lists: List[] = [
  {
    id: 1,
    name: "work",
    color: "#BBDEFB",
    created_at: "2025-01-01",
  },
  {
    id: 2,
    name: "home",
    color: "#B2DFDB",
    created_at: "2025-01-02",
  },
];

describe("ListsManager", () => {
  beforeEach(() => {
    window.confirm = vi.fn(() => true);
  });

  it("renders form and list when provided", () => {
    render(
      <ListsManager
        lists={[]}
        onCreateList={vi.fn()}
        onUpdateList={vi.fn()}
        onDeleteList={vi.fn()}
        error={null}
        onClearError={vi.fn()}
      />
    );
    expect(
      screen.getByRole("heading", { name: /gerenciar listas/i })
    ).toBeDefined();
    expect(
      screen.getByRole("textbox", { name: /nome da nova lista/i })
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /criar lista/i })).toBeDefined();
  });

  it("renders list of lists with edit and remove buttons", () => {
    render(
      <ListsManager
        lists={lists}
        onCreateList={vi.fn()}
        onUpdateList={vi.fn()}
        onDeleteList={vi.fn()}
        error={null}
        onClearError={vi.fn()}
      />
    );
    expect(
      screen.getByRole("button", { name: /editar lista work/i })
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /remover lista work/i })
    ).toBeDefined();
  });

  it("calls onCreateList with trimmed name and color when form is submitted", async () => {
    const user = userEvent.setup();
    const onCreateList = vi.fn().mockResolvedValue(undefined);

    render(
      <ListsManager
        lists={[]}
        onCreateList={onCreateList}
        onUpdateList={vi.fn()}
        onDeleteList={vi.fn()}
        error={null}
        onClearError={vi.fn()}
      />
    );

    await user.type(
      screen.getByRole("textbox", { name: /nome da nova lista/i }),
      "  newlist  "
    );
    await user.click(screen.getByRole("button", { name: /criar lista/i }));

    expect(onCreateList).toHaveBeenCalledWith("newlist", expect.any(String));
  });

  it("shows error message when error prop is provided", () => {
    render(
      <ListsManager
        lists={[]}
        onCreateList={vi.fn()}
        onUpdateList={vi.fn()}
        onDeleteList={vi.fn()}
        error="list with this name already exists"
        onClearError={vi.fn()}
      />
    );
    expect(screen.getByText("list with this name already exists")).toBeDefined();
  });

  it("disables create button when name is empty", () => {
    render(
      <ListsManager
        lists={[]}
        onCreateList={vi.fn()}
        onUpdateList={vi.fn()}
        onDeleteList={vi.fn()}
        error={null}
        onClearError={vi.fn()}
      />
    );
    const createBtn = screen.getByRole("button", { name: /criar lista/i });
    expect((createBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("enables create button when name has content", async () => {
    const user = userEvent.setup();
    render(
      <ListsManager
        lists={[]}
        onCreateList={vi.fn()}
        onUpdateList={vi.fn()}
        onDeleteList={vi.fn()}
        error={null}
        onClearError={vi.fn()}
      />
    );
    await user.type(
      screen.getByRole("textbox", { name: /nome da nova lista/i }),
      "work"
    );
    const createBtn = screen.getByRole("button", { name: /criar lista/i });
    expect((createBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows empty message when no lists", () => {
    render(
      <ListsManager
        lists={[]}
        onCreateList={vi.fn()}
        onUpdateList={vi.fn()}
        onDeleteList={vi.fn()}
        error={null}
        onClearError={vi.fn()}
      />
    );
    expect(
      screen.getByText(/nenhuma lista cadastrada/i)
    ).toBeDefined();
  });
});
