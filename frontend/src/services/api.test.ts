import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchTodos, createTodo, updateTodo, deleteTodo } from "./api.ts";
import type { Todo } from "../types/todo.ts";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

beforeEach(() => {
  mockFetch.mockReset();
});

// --- fetchTodos ---

describe("fetchTodos", () => {
  it("returns array of todos when API responds 200", async () => {
    const todos: Todo[] = [
      { id: 1, title: "Task 1", completed: false, created_at: "2025-01-01" },
      { id: 2, title: "Task 2", completed: true, created_at: "2025-01-02" },
    ];
    mockFetch.mockResolvedValueOnce(jsonResponse(todos));

    const result = await fetchTodos();

    expect(result).toEqual(todos);
    expect(mockFetch).toHaveBeenCalledWith("http://localhost:8080/api/todos");
  });

  it("returns empty array when API responds 200 with []", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    const result = await fetchTodos();

    expect(result).toEqual([]);
  });

  it("throws error when API responds with error", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: "internal server error" }, 500)
    );

    await expect(fetchTodos()).rejects.toThrow("internal server error");
  });
});

// --- createTodo ---

describe("createTodo", () => {
  it("sends POST and returns created todo", async () => {
    const created: Todo = {
      id: 1,
      title: "New task",
      completed: false,
      created_at: "2025-01-01",
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(created, 201));

    const result = await createTodo("New task");

    expect(result).toEqual(created);
    expect(mockFetch).toHaveBeenCalledWith("http://localhost:8080/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New task" }),
    });
  });

  it("throws error when API responds 400", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: "title cannot be empty" }, 400)
    );

    await expect(createTodo("")).rejects.toThrow("title cannot be empty");
  });
});

// --- updateTodo ---

describe("updateTodo", () => {
  it("sends PATCH to correct ID", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(null, 204));

    await updateTodo(5, true);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/todos/5",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      }
    );
  });

  it("throws error when API responds 404", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: "todo not found" }, 404)
    );

    await expect(updateTodo(999, true)).rejects.toThrow("todo not found");
  });
});

// --- deleteTodo ---

describe("deleteTodo", () => {
  it("sends DELETE to correct ID", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(null, 204));

    await deleteTodo(3);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/todos/3",
      {
        method: "DELETE",
      }
    );
  });

  it("throws error when API responds 404", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: "todo not found" }, 404)
    );

    await expect(deleteTodo(999)).rejects.toThrow("todo not found");
  });
});
