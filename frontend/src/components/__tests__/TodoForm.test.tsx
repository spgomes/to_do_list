// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TodoForm } from "../TodoForm.tsx";

describe("TodoForm", () => {
  it("renders text input and submit button", () => {
    render(<TodoForm onAdd={vi.fn()} />);

    expect(screen.getByPlaceholderText("Nova tarefa...")).toBeDefined();
    expect(screen.getByRole("button", { name: "Adicionar" })).toBeDefined();
  });

  it("calls onAdd with title when submitted", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(undefined);

    render(<TodoForm onAdd={onAdd} />);

    const input = screen.getByPlaceholderText("Nova tarefa...");
    await user.type(input, "Buy groceries");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    expect(onAdd).toHaveBeenCalledWith("Buy groceries");
  });

  it("does not submit with empty title and shows error", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();

    render(<TodoForm onAdd={onAdd} />);

    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeDefined();
  });

  it("clears input after successful submission", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(undefined);

    render(<TodoForm onAdd={onAdd} />);

    const input = screen.getByPlaceholderText("Nova tarefa...") as HTMLInputElement;
    await user.type(input, "New task");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    expect(input.value).toBe("");
  });

  it("has aria-label on form element", () => {
    render(<TodoForm onAdd={vi.fn()} />);

    expect(screen.getByRole("form", { name: "Adicionar nova tarefa" })).toBeDefined();
  });

  it("has aria-label on input field", () => {
    render(<TodoForm onAdd={vi.fn()} />);

    expect(screen.getByLabelText("Título da tarefa")).toBeDefined();
  });

  it("renders input with todo-form-input class", () => {
    render(<TodoForm onAdd={vi.fn()} />);

    const input = screen.getByPlaceholderText("Nova tarefa...");
    expect(input.classList.contains("todo-form-input")).toBe(true);
  });

  it("renders button with todo-form-button class", () => {
    render(<TodoForm onAdd={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Adicionar" });
    expect(button.classList.contains("todo-form-button")).toBe(true);
  });

  it("renders error with form-error class", async () => {
    const user = userEvent.setup();
    render(<TodoForm onAdd={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    const errorEl = screen.getByRole("alert");
    expect(errorEl.classList.contains("form-error")).toBe(true);
  });

  it("clears input when Escape key is pressed", async () => {
    const user = userEvent.setup();
    render(<TodoForm onAdd={vi.fn()} />);

    const input = screen.getByPlaceholderText("Nova tarefa...") as HTMLInputElement;
    await user.type(input, "Some text");
    expect(input.value).toBe("Some text");

    await user.keyboard("{Escape}");
    expect(input.value).toBe("");
  });

  it("clears error message when Escape key is pressed", async () => {
    const user = userEvent.setup();
    render(<TodoForm onAdd={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(screen.getByRole("alert")).toBeDefined();

    const input = screen.getByPlaceholderText("Nova tarefa...");
    await user.click(input);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("alert")).toBeNull();
  });
});
