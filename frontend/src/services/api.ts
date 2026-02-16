import type { Todo } from "../types/todo.ts";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

function getToken(): string | null {
  return localStorage.getItem("token");
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(body.error || "Unknown error");
  }
  return response.json() as Promise<T>;
}

async function handleVoidResponse(response: Response): Promise<void> {
  if (response.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(body.error || "Unknown error");
  }
}

export async function fetchTodos(): Promise<Todo[]> {
  const response = await fetch(`${API_BASE_URL}/todos`, {
    headers: authHeaders(),
  });
  return handleResponse<Todo[]>(response);
}

export async function createTodo(title: string): Promise<Todo> {
  const response = await fetch(`${API_BASE_URL}/todos`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ title }),
  });
  return handleResponse<Todo>(response);
}

export async function updateTodo(id: number, completed: boolean): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ completed }),
  });
  return handleVoidResponse(response);
}

export async function updateTodoTitle(id: number, title: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/todos/${id}/title`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ title }),
  });
  return handleVoidResponse(response);
}

export async function deleteTodo(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleVoidResponse(response);
}
