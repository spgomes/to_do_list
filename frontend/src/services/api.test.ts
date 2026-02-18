import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchTodos,
  fetchTodosByList,
  createTodo,
  updateTodo,
  updateTodoTitle,
  deleteTodo,
  fetchLists,
  createList,
  updateList,
  deleteList,
  addListToTodo,
  removeListFromTodo,
} from "./api";
import type { Todo } from "../types/todo";
import type { List } from "../types/list";

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

  it("returns todos with lists when API includes lists", async () => {
    const todos: Todo[] = [
      {
        id: 1,
        title: "Task 1",
        completed: false,
        created_at: "2025-01-01",
        lists: [{ id: 1, name: "Work", color: "#BBDEFB", created_at: "2025-01-01" }],
      },
    ];
    mockFetch.mockResolvedValueOnce(jsonResponse(todos));

    const result = await fetchTodos();

    expect(result).toEqual(todos);
    expect(result[0].lists).toHaveLength(1);
    expect(result[0].lists![0].name).toBe("Work");
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

// --- fetchTodosByList ---

describe("fetchTodosByList", () => {
  it("returns todos for the given list when API responds 200", async () => {
    const todos: Todo[] = [
      {
        id: 1,
        title: "Task in list",
        completed: false,
        created_at: "2025-01-01",
        lists: [{ id: 5, name: "work", color: "#BBDEFB", created_at: "2025-01-01" }],
      },
    ];
    mockFetch.mockResolvedValueOnce(jsonResponse(todos));

    const result = await fetchTodosByList(5);

    expect(result).toEqual(todos);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/todos?list_id=5",
      { headers: { "Content-Type": "application/json" } }
    );
  });

  it("sends Authorization header when token exists", async () => {
    localStorage.setItem("token", "my-jwt");
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    await fetchTodosByList(3);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/todos?list_id=3",
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer my-jwt",
        },
      }
    );
  });

  it("throws error when API responds 404", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: "list not found" }, 404)
    );

    await expect(fetchTodosByList(999)).rejects.toThrow("list not found");
  });
});

// --- fetchLists ---

describe("fetchLists", () => {
  it("returns array of lists when API responds 200", async () => {
    const lists: List[] = [
      { id: 1, name: "work", color: "#BBDEFB", created_at: "2025-01-01" },
      { id: 2, name: "home", color: "#B2DFDB", created_at: "2025-01-02" },
    ];
    mockFetch.mockResolvedValueOnce(jsonResponse(lists));

    const result = await fetchLists();

    expect(result).toEqual(lists);
    expect(mockFetch).toHaveBeenCalledWith("http://localhost:8080/api/lists", {
      headers: { "Content-Type": "application/json" },
    });
  });

  it("sends Authorization header when token exists", async () => {
    localStorage.setItem("token", "my-jwt");
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    await fetchLists();

    expect(mockFetch).toHaveBeenCalledWith("http://localhost:8080/api/lists", {
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

    await expect(fetchLists()).rejects.toThrow("internal server error");
  });
});

// --- createList ---

describe("createList", () => {
  it("sends POST with name and color and returns created list", async () => {
    localStorage.setItem("token", "my-token");
    const created: List = {
      id: 1,
      name: "work",
      color: "#BBDEFB",
      created_at: "2025-01-01",
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(created, 201));

    const result = await createList("work", "#BBDEFB");

    expect(result).toEqual(created);
    expect(mockFetch).toHaveBeenCalledWith("http://localhost:8080/api/lists", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer my-token",
      },
      body: JSON.stringify({ name: "work", color: "#BBDEFB" }),
    });
  });

  it("throws error when API responds 400", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: "list name cannot be empty" }, 400)
    );

    await expect(createList("", "#BBDEFB")).rejects.toThrow(
      "list name cannot be empty"
    );
  });

  it("throws error when API responds 409", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        { error: "list with this name already exists" },
        409
      )
    );

    await expect(createList("work", "#BBDEFB")).rejects.toThrow(
      "list with this name already exists"
    );
  });
});

// --- updateList ---

describe("updateList", () => {
  it("sends PATCH with auth header, name and color", async () => {
    localStorage.setItem("token", "my-token");
    mockFetch.mockResolvedValueOnce(jsonResponse(null, 204));

    await updateList(5, "newname", "#E1BEE7");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/lists/5",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer my-token",
        },
        body: JSON.stringify({ name: "newname", color: "#E1BEE7" }),
      }
    );
  });

  it("throws error when API responds 404", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: "list not found" }, 404)
    );

    await expect(updateList(999, "name", "#BBDEFB")).rejects.toThrow(
      "list not found"
    );
  });
});

// --- deleteList ---

describe("deleteList", () => {
  it("sends DELETE with auth header to correct ID", async () => {
    localStorage.setItem("token", "my-token");
    mockFetch.mockResolvedValueOnce(jsonResponse(null, 204));

    await deleteList(3);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/lists/3",
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
      jsonResponse({ error: "list not found" }, 404)
    );

    await expect(deleteList(999)).rejects.toThrow("list not found");
  });
});

// --- addListToTodo ---

describe("addListToTodo", () => {
  it("sends POST to correct todo and list IDs", async () => {
    localStorage.setItem("token", "my-token");
    mockFetch.mockResolvedValueOnce(jsonResponse(null, 204));

    await addListToTodo(10, 20);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/todos/10/lists/20",
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

    await expect(addListToTodo(999, 1)).rejects.toThrow("todo not found");
  });
});

// --- removeListFromTodo ---

describe("removeListFromTodo", () => {
  it("sends DELETE to correct todo and list IDs", async () => {
    localStorage.setItem("token", "my-token");
    mockFetch.mockResolvedValueOnce(jsonResponse(null, 204));

    await removeListFromTodo(10, 20);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/todos/10/lists/20",
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
      jsonResponse({ error: "todo or list association not found" }, 404)
    );

    await expect(removeListFromTodo(999, 1)).rejects.toThrow(
      "todo or list association not found"
    );
  });
});
