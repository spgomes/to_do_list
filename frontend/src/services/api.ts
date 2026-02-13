import type { Todo } from "../types/todo.ts";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(body.error || "Unknown error");
  }
  return response.json() as Promise<T>;
}

async function handleVoidResponse(response: Response): Promise<void> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(body.error || "Unknown error");
  }
}

export async function fetchTodos(): Promise<Todo[]> {
  const response = await fetch(`${API_BASE_URL}/todos`);
  return handleResponse<Todo[]>(response);
}

export async function createTodo(title: string): Promise<Todo> {
  const response = await fetch(`${API_BASE_URL}/todos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  return handleResponse<Todo>(response);
}

export async function updateTodo(id: number, completed: boolean): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed }),
  });
  return handleVoidResponse(response);
}

export async function deleteTodo(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
    method: "DELETE",
  });
  return handleVoidResponse(response);
}
