import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchTodos,
  createTodo,
  updateTodo,
  updateTodoTitle,
  deleteTodo,
  fetchTags,
  createTag,
  updateTag,
  deleteTag,
  addTagToTodo,
  removeTagFromTodo,
} from "./api";
import type { Todo } from "../types/todo";
import type { Tag } from "../types/tag";

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
  localStorage.clear();
  // Prevent actual navigation in tests
  delete (window as Record<string, unknown>).location;
  (window as Record<string, unknown>).location = { href: "" } as Location;
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
    expect(mockFetch).toHaveBeenCalledWith("http://localhost:8080/api/todos", {
      headers: { "Content-Type": "application/json" },
    });
  });

  it("sends Authorization header when token exists", async () => {
    localStorage.setItem("token", "my-jwt-token");
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    await fetchTodos();

    expect(mockFetch).toHaveBeenCalledWith("http://localhost:8080/api/todos", {
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer my-jwt-token",
      },
    });
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

  it("redirects to login and clears token on 401", async () => {
    localStorage.setItem("token", "expired-token");
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: "unauthorized" }, 401));

    await expect(fetchTodos()).rejects.toThrow("Session expired");
    expect(localStorage.getItem("token")).toBeNull();
    expect(window.location.href).toBe("/login");
  });
});

// --- createTodo ---

describe("createTodo", () => {
  it("sends POST with auth header and returns created todo", async () => {
    localStorage.setItem("token", "my-token");
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
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer my-token",
      },
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
  it("sends PATCH with auth header to correct ID", async () => {
    localStorage.setItem("token", "my-token");
    mockFetch.mockResolvedValueOnce(jsonResponse(null, 204));

    await updateTodo(5, true);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/todos/5",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer my-token",
        },
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

// --- updateTodoTitle ---

describe("updateTodoTitle", () => {
  it("faz PATCH /todos/{id}/title com body correto", async () => {
    localStorage.setItem("token", "my-token");
    mockFetch.mockResolvedValueOnce(jsonResponse(null, 204));

    await updateTodoTitle(5, "Novo título");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/todos/5/title",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer my-token",
        },
        body: JSON.stringify({ title: "Novo título" }),
      }
    );
  });

  it("throws error when API responds 400", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: "title cannot be empty" }, 400)
    );

    await expect(updateTodoTitle(1, "")).rejects.toThrow("title cannot be empty");
  });

  it("throws error when API responds 404", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: "todo not found" }, 404)
    );

    await expect(updateTodoTitle(999, "Title")).rejects.toThrow("todo not found");
  });
});

// --- deleteTodo ---

describe("deleteTodo", () => {
  it("sends DELETE with auth header to correct ID", async () => {
    localStorage.setItem("token", "my-token");
    mockFetch.mockResolvedValueOnce(jsonResponse(null, 204));

    await deleteTodo(3);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/todos/3",
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer my-token",
        },
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

// --- fetchTags ---

describe("fetchTags", () => {
  it("returns array of tags when API responds 200", async () => {
    const tags: Tag[] = [
      { id: 1, name: "work", created_at: "2025-01-01" },
      { id: 2, name: "home", created_at: "2025-01-02" },
    ];
    mockFetch.mockResolvedValueOnce(jsonResponse(tags));

    const result = await fetchTags();

    expect(result).toEqual(tags);
    expect(mockFetch).toHaveBeenCalledWith("http://localhost:8080/api/tags", {
      headers: { "Content-Type": "application/json" },
    });
  });

  it("sends Authorization header when token exists", async () => {
    localStorage.setItem("token", "my-jwt");
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    await fetchTags();

    expect(mockFetch).toHaveBeenCalledWith("http://localhost:8080/api/tags", {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer my-jwt",
      },
    });
  });

  it("throws error when API responds 500", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: "internal server error" }, 500)
    );

    await expect(fetchTags()).rejects.toThrow("internal server error");
  });
});

// --- createTag ---

describe("createTag", () => {
  it("sends POST with name and returns created tag", async () => {
    localStorage.setItem("token", "my-token");
    const created: Tag = {
      id: 1,
      name: "work",
      created_at: "2025-01-01",
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(created, 201));

    const result = await createTag("work");

    expect(result).toEqual(created);
    expect(mockFetch).toHaveBeenCalledWith("http://localhost:8080/api/tags", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer my-token",
      },
      body: JSON.stringify({ name: "work" }),
    });
  });

  it("throws error when API responds 400", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: "tag name cannot be empty" }, 400)
    );

    await expect(createTag("")).rejects.toThrow("tag name cannot be empty");
  });

  it("throws error when API responds 409", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        { error: "tag with this name already exists" },
        409
      )
    );

    await expect(createTag("work")).rejects.toThrow(
      "tag with this name already exists"
    );
  });
});

// --- updateTag ---

describe("updateTag", () => {
  it("sends PATCH with auth header and new name", async () => {
    localStorage.setItem("token", "my-token");
    mockFetch.mockResolvedValueOnce(jsonResponse(null, 204));

    await updateTag(5, "newname");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/tags/5",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer my-token",
        },
        body: JSON.stringify({ name: "newname" }),
      }
    );
  });

  it("throws error when API responds 404", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: "tag not found" }, 404)
    );

    await expect(updateTag(999, "name")).rejects.toThrow("tag not found");
  });
});

// --- deleteTag ---

describe("deleteTag", () => {
  it("sends DELETE with auth header to correct ID", async () => {
    localStorage.setItem("token", "my-token");
    mockFetch.mockResolvedValueOnce(jsonResponse(null, 204));

    await deleteTag(3);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/tags/3",
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer my-token",
        },
      }
    );
  });

  it("throws error when API responds 404", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: "tag not found" }, 404)
    );

    await expect(deleteTag(999)).rejects.toThrow("tag not found");
  });
});

// --- addTagToTodo ---

describe("addTagToTodo", () => {
  it("sends POST to correct todo and tag IDs", async () => {
    localStorage.setItem("token", "my-token");
    mockFetch.mockResolvedValueOnce(jsonResponse(null, 204));

    await addTagToTodo(10, 20);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/todos/10/tags/20",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer my-token",
        },
      }
    );
  });

  it("throws error when API responds 404", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: "todo not found" }, 404)
    );

    await expect(addTagToTodo(999, 1)).rejects.toThrow("todo not found");
  });
});

// --- removeTagFromTodo ---

describe("removeTagFromTodo", () => {
  it("sends DELETE to correct todo and tag IDs", async () => {
    localStorage.setItem("token", "my-token");
    mockFetch.mockResolvedValueOnce(jsonResponse(null, 204));

    await removeTagFromTodo(10, 20);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/todos/10/tags/20",
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer my-token",
        },
      }
    );
  });

  it("throws error when API responds 404", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: "todo or tag association not found" }, 404)
    );

    await expect(removeTagFromTodo(999, 1)).rejects.toThrow(
      "todo or tag association not found"
    );
  });
});
