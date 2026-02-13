// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TodoItem } from "../TodoItem.tsx";
import type { Todo } from "../../types/todo.ts";

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
      <TodoItem todo={pendingTodo} onToggle={vi.fn()} onDelete={vi.fn()} />
    );

    expect(screen.getByText("Buy milk")).toBeDefined();
    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it("applies completed class when todo is completed", () => {
    const { container } = render(
      <TodoItem todo={completedTodo} onToggle={vi.fn()} onDelete={vi.fn()} />
    );

    const li = container.querySelector("li");
    expect(li?.classList.contains("completed")).toBe(true);
  });

  it("does not apply completed class when todo is pending", () => {
    const { container } = render(
      <TodoItem todo={pendingTodo} onToggle={vi.fn()} onDelete={vi.fn()} />
    );

    const li = container.querySelector("li");
    expect(li?.classList.contains("completed")).toBe(false);
  });

  it("calls onToggle when checkbox is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn().mockResolvedValue(undefined);

    render(
      <TodoItem todo={pendingTodo} onToggle={onToggle} onDelete={vi.fn()} />
    );

    await user.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith(1, true);
  });

  it("calls onDelete when remove button is clicked and confirmed", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <TodoItem todo={pendingTodo} onToggle={vi.fn()} onDelete={onDelete} />
    );

    await user.click(screen.getByRole("button", { name: /remover/i }));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it("has correct aria-label for pending todo checkbox", () => {
    render(
      <TodoItem todo={pendingTodo} onToggle={vi.fn()} onDelete={vi.fn()} />
    );

    expect(
      screen.getByLabelText("Marcar como concluída: Buy milk")
    ).toBeDefined();
  });

  it("has correct aria-label for completed todo checkbox", () => {
    render(
      <TodoItem todo={completedTodo} onToggle={vi.fn()} onDelete={vi.fn()} />
    );

    expect(
      screen.getByLabelText("Marcar como pendente: Walk the dog")
    ).toBeDefined();
  });

  it("has correct aria-label on delete button", () => {
    render(
      <TodoItem todo={pendingTodo} onToggle={vi.fn()} onDelete={vi.fn()} />
    );

    expect(
      screen.getByLabelText("Remover tarefa: Buy milk")
    ).toBeDefined();
  });

  it("renders checkbox with todo-checkbox class", () => {
    render(
      <TodoItem todo={pendingTodo} onToggle={vi.fn()} onDelete={vi.fn()} />
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.classList.contains("todo-checkbox")).toBe(true);
  });
});
