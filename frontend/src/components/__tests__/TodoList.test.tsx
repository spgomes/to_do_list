// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TodoList } from "../TodoList.tsx";
import type { Todo } from "../../types/todo.ts";

const todos: Todo[] = [
  { id: 1, title: "Task one", completed: false, created_at: "2025-01-01" },
  { id: 2, title: "Task two", completed: true, created_at: "2025-01-02" },
];

describe("TodoList", () => {
  it("renders multiple TodoItems", () => {
    render(
      <TodoList
        todos={todos}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText("Task one")).toBeDefined();
    expect(screen.getByText("Task two")).toBeDefined();
  });

  it("shows empty message when list is empty", () => {
    render(
      <TodoList
        todos={[]}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText("Nenhuma tarefa cadastrada")).toBeDefined();
  });

  it("renders list with aria-label", () => {
    render(
      <TodoList
        todos={todos}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByRole("list", { name: "Lista de tarefas" })).toBeDefined();
  });

  it("renders list with todo-list class", () => {
    render(
      <TodoList
        todos={todos}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    const list = screen.getByRole("list");
    expect(list.classList.contains("todo-list")).toBe(true);
  });

  it("renders empty message with empty-message class", () => {
    render(
      <TodoList
        todos={[]}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    const msg = screen.getByText("Nenhuma tarefa cadastrada");
    expect(msg.classList.contains("empty-message")).toBe(true);
  });
});
