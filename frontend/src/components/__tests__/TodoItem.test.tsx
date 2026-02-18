// @vitest-environment jsdom
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TodoItem } from "../TodoItem.tsx";
import type { Todo } from "../../types/todo.ts";

const defaultOnEdit = vi.fn().mockResolvedValue(undefined);

const pendingTodo: Todo = {
  id: 1,
  title: "Buy milk",
  completed: false,
  created_at: "2025-01-01",
};

const completedTodo: Todo = {
  id: 2,
  title: "Walk the dog",
  completed: true,
  created_at: "2025-01-02",
};

describe("TodoItem", () => {
  it("renders title and status correctly", () => {
    render(
      <TodoItem
        todo={pendingTodo}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={defaultOnEdit}
      />
    );

    expect(screen.getByText("Buy milk")).toBeDefined();
    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it("applies completed class when todo is completed", () => {
    const { container } = render(
      <TodoItem
        todo={completedTodo}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={defaultOnEdit}
      />
    );

    const li = container.querySelector("li");
    expect(li?.classList.contains("completed")).toBe(true);
  });

  it("does not apply completed class when todo is pending", () => {
    const { container } = render(
      <TodoItem
        todo={pendingTodo}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={defaultOnEdit}
      />
    );

    const li = container.querySelector("li");
    expect(li?.classList.contains("completed")).toBe(false);
  });

  it("calls onToggle when checkbox is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn().mockResolvedValue(undefined);

    render(
      <TodoItem
        todo={pendingTodo}
        onToggle={onToggle}
        onDelete={vi.fn()}
        onEdit={defaultOnEdit}
      />
    );

    await user.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith(1, true);
  });

  it("calls onDelete when remove button is clicked and confirmed", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <TodoItem
        todo={pendingTodo}
        onToggle={vi.fn()}
        onDelete={onDelete}
        onEdit={defaultOnEdit}
      />
    );

    await user.click(screen.getByRole("button", { name: /remover/i }));
    await vi.waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith(1);
    }, { timeout: 500 });
  });

  it("has correct aria-label for pending todo checkbox", () => {
    render(
      <TodoItem
        todo={pendingTodo}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={defaultOnEdit}
      />
    );

    expect(
      screen.getByLabelText("Marcar como concluída: Buy milk")
    ).toBeDefined();
  });

  it("has correct aria-label for completed todo checkbox", () => {
    render(
      <TodoItem
        todo={completedTodo}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={defaultOnEdit}
      />
    );

    expect(
      screen.getByLabelText("Marcar como pendente: Walk the dog")
    ).toBeDefined();
  });

  it("has correct aria-label on delete button", () => {
    render(
      <TodoItem
        todo={pendingTodo}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={defaultOnEdit}
      />
    );

    expect(
      screen.getByLabelText("Remover tarefa: Buy milk")
    ).toBeDefined();
  });

  it("renders checkbox with todo-checkbox class", () => {
    render(
      <TodoItem
        todo={pendingTodo}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={defaultOnEdit}
      />
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.classList.contains("todo-checkbox")).toBe(true);
  });

  it("modo edição aparece ao clicar em Editar", async () => {
    const user = userEvent.setup();
    render(
      <TodoItem
        todo={pendingTodo}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={defaultOnEdit}
      />
    );

    await user.click(screen.getByRole("button", { name: /editar tarefa: buy milk/i }));
    expect(screen.getByLabelText("Editar título da tarefa")).toBeDefined();
    expect(screen.getByDisplayValue("Buy milk")).toBeDefined();
  });

  it("Enter confirma e chama onEdit com novo título", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(
      <TodoItem
        todo={pendingTodo}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
      />
    );

    await user.click(screen.getByRole("button", { name: /editar tarefa: buy milk/i }));
    const input = screen.getByLabelText("Editar título da tarefa");
    await user.clear(input);
    await user.type(input, "Buy bread");
    await user.keyboard("{Enter}");

    expect(onEdit).toHaveBeenCalledWith(1, "Buy bread");
  });

  it("Escape cancela sem chamar onEdit", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(
      <TodoItem
        todo={pendingTodo}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
      />
    );

    await user.click(screen.getByRole("button", { name: /editar tarefa: buy milk/i }));
    const input = screen.getByLabelText("Editar título da tarefa");
    await user.type(input, "Changed");
    await user.keyboard("{Escape}");

    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByText("Buy milk")).toBeDefined();
  });

  it("blur confirma e chama onEdit", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(
      <TodoItem
        todo={pendingTodo}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
      />
    );

    await user.click(screen.getByRole("button", { name: /editar tarefa: buy milk/i }));
    const input = screen.getByLabelText("Editar título da tarefa");
    await user.clear(input);
    await user.type(input, "New title");
    await user.tab();

    expect(onEdit).toHaveBeenCalledWith(1, "New title");
  });

  it("título vazio não chama onEdit", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(
      <TodoItem
        todo={pendingTodo}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
      />
    );

    await user.click(screen.getByRole("button", { name: /editar tarefa: buy milk/i }));
    const input = screen.getByLabelText("Editar título da tarefa");
    await user.clear(input);
    await user.keyboard("{Enter}");

    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByText("Buy milk")).toBeDefined();
  });

  it("título igual ao original não chama onEdit", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(
      <TodoItem
        todo={pendingTodo}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
      />
    );

    await user.click(screen.getByRole("button", { name: /editar tarefa: buy milk/i }));
    await user.keyboard("{Enter}");

    expect(onEdit).not.toHaveBeenCalled();
  });

  it("input fica disabled durante salvamento", async () => {
    const user = userEvent.setup();
    let resolveEdit: () => void;
    const onEdit = vi.fn().mockImplementation(
      () => new Promise<void>((r) => { resolveEdit = r; })
    );
    render(
      <TodoItem
        todo={pendingTodo}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
      />
    );

    await user.click(screen.getByRole("button", { name: /editar tarefa: buy milk/i }));
    const input = screen.getByLabelText("Editar título da tarefa");
    await user.clear(input);
    await user.type(input, "New");
    await user.keyboard("{Enter}");

    await vi.waitFor(() => {
      expect((input as HTMLInputElement).disabled).toBe(true);
    });
    await act(async () => {
      resolveEdit!();
    });
    await vi.waitFor(() => {
      expect(screen.queryByLabelText("Editar título da tarefa")).toBeNull();
    });
  });

  it("renders with draggable=true", () => {
    const { container } = render(
      <TodoItem
        todo={pendingTodo}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={defaultOnEdit}
      />
    );

    const li = container.querySelector("li.todo-item");
    expect(li).toBeDefined();
    expect((li as HTMLElement).draggable).toBe(true);
  });

  it("onDragStart sets todoId in dataTransfer", () => {
    const setData = vi.fn();
    const { container } = render(
      <TodoItem
        todo={pendingTodo}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={defaultOnEdit}
      />
    );

    const li = container.querySelector("li.todo-item") as HTMLElement;
    fireEvent.dragStart(li, {
      dataTransfer: { setData, effectAllowed: "move" },
    });

    expect(setData).toHaveBeenCalledWith("todoId", "1");
  });
});
