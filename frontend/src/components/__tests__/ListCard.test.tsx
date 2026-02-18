// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ListCard } from "../ListCard.tsx";
import type { Todo } from "../../types/todo.ts";
import type { List } from "../../types/list.ts";

const mockList: List = {
  id: 1,
  name: "Trabalho",
  color: "#BBDEFB",
  created_at: "2025-01-01",
};

const mockTodos: Todo[] = [
  {
    id: 1,
    title: "Task one",
    completed: false,
    created_at: "2025-01-01",
  },
];

const defaultHandlers = {
  onToggle: vi.fn().mockResolvedValue(undefined),
  onDelete: vi.fn().mockResolvedValue(undefined),
  onEdit: vi.fn().mockResolvedValue(undefined),
  onDropTodo: vi.fn().mockResolvedValue(undefined),
};

describe("ListCard", () => {
  it("renders inline form with input and Adicionar button", () => {
    render(
      <ListCard
        list={mockList}
        todos={mockTodos}
        {...defaultHandlers}
        onCreateTodo={vi.fn()}
      />
    );

    expect(screen.getByPlaceholderText("Nova tarefa...")).toBeDefined();
    expect(screen.getByRole("button", { name: "Adicionar" })).toBeDefined();
  });

  it("submit button is disabled when input is empty", () => {
    render(
      <ListCard
        list={mockList}
        todos={[]}
        {...defaultHandlers}
        onCreateTodo={vi.fn()}
      />
    );

    const button = screen.getByRole("button", { name: "Adicionar" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("submit button is disabled when input is only whitespace", async () => {
    const user = userEvent.setup();
    render(
      <ListCard
        list={mockList}
        todos={[]}
        {...defaultHandlers}
        onCreateTodo={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText("Nova tarefa...");
    await user.type(input, "   ");
    const button = screen.getByRole("button", { name: "Adicionar" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("calls onCreateTodo with trimmed title when form is submitted", async () => {
    const user = userEvent.setup();
    const onCreateTodo = vi.fn().mockResolvedValue(undefined);

    render(
      <ListCard
        list={mockList}
        todos={[]}
        {...defaultHandlers}
        onCreateTodo={onCreateTodo}
        onDropTodo={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText("Nova tarefa...");
    await user.type(input, "  New task  ");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    expect(onCreateTodo).toHaveBeenCalledWith("New task");
  });

  it("clears input after successful submission", async () => {
    const user = userEvent.setup();
    const onCreateTodo = vi.fn().mockResolvedValue(undefined);

    render(
      <ListCard
        list={mockList}
        todos={[]}
        {...defaultHandlers}
        onCreateTodo={onCreateTodo}
        onDropTodo={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText("Nova tarefa...") as HTMLInputElement;
    await user.type(input, "New task");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    expect(input.value).toBe("");
  });

  it("displays error when onCreateTodo rejects", async () => {
    const user = userEvent.setup();
    const onCreateTodo = vi.fn().mockRejectedValue(new Error("API error"));

    render(
      <ListCard
        list={mockList}
        todos={[]}
        {...defaultHandlers}
        onCreateTodo={onCreateTodo}
        onDropTodo={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText("Nova tarefa...");
    await user.type(input, "New task");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    const alert = screen.getByRole("alert");
    expect(alert).toBeDefined();
    expect(alert.textContent).toBe("API error");
    expect(alert.classList.contains("list-card-form-error")).toBe(true);
  });

  it("input has aria-label with list name for named list", () => {
    render(
      <ListCard
        list={mockList}
        todos={[]}
        {...defaultHandlers}
        onCreateTodo={vi.fn()}
      />
    );

    expect(
      screen.getByLabelText("Adicionar tarefa em Trabalho")
    ).toBeDefined();
  });

  it("input has aria-label with Sem lista when list is null", () => {
    render(
      <ListCard
        list={null}
        todos={[]}
        {...defaultHandlers}
        onCreateTodo={vi.fn()}
      />
    );

    expect(
      screen.getByLabelText("Adicionar tarefa em Sem lista")
    ).toBeDefined();
  });

  it("applies drag-over class when drag over", async () => {
    const { container } = render(
      <ListCard
        list={mockList}
        todos={[]}
        {...defaultHandlers}
        onCreateTodo={vi.fn()}
      />
    );

    const article = container.querySelector("article.list-card") as HTMLElement;
    expect(article).toBeDefined();
    expect(article.classList.contains("drag-over")).toBe(false);

    fireEvent.dragEnter(article);

    await vi.waitFor(() => {
      expect(article.classList.contains("drag-over")).toBe(true);
    });

    fireEvent.dragLeave(article, { relatedTarget: document.body });

    await vi.waitFor(() => {
      expect(article.classList.contains("drag-over")).toBe(false);
    });
  });

  it("calls onDropTodo with todoId and list on drop", async () => {
    const onDropTodo = vi.fn().mockResolvedValue(undefined);

    const { container } = render(
      <ListCard
        list={mockList}
        todos={[]}
        {...defaultHandlers}
        onCreateTodo={vi.fn()}
        onDropTodo={onDropTodo}
      />
    );

    const article = container.querySelector("article.list-card") as HTMLElement;
    expect(article).toBeDefined();

    fireEvent.drop(article, {
      dataTransfer: { getData: (key: string) => (key === "todoId" ? "42" : "") },
    });

    await vi.waitFor(() => {
      expect(onDropTodo).toHaveBeenCalledWith(42, mockList);
    });
  });

  it("calls onDropTodo with todoId and null when list is null", async () => {
    const onDropTodo = vi.fn().mockResolvedValue(undefined);

    const { container } = render(
      <ListCard
        list={null}
        todos={[]}
        {...defaultHandlers}
        onCreateTodo={vi.fn()}
        onDropTodo={onDropTodo}
      />
    );

    const article = container.querySelector("article.list-card") as HTMLElement;
    fireEvent.drop(article, {
      dataTransfer: { getData: (key: string) => (key === "todoId" ? "7" : "") },
    });

    await vi.waitFor(() => {
      expect(onDropTodo).toHaveBeenCalledWith(7, null);
    });
  });
});
